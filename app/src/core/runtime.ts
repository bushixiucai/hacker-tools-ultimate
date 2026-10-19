import { createTarget } from './profile';
import { MODULES } from './registry';
import type { Choice, ModuleContext, ModuleDefinition, Params, SessionState, SiteKind, Target, Task } from './types';

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>) { super(Object.values(errors).join('；')); this.name = 'ValidationError'; }
}

/** One isolated tool session. Other tools own different Runtime instances. */
export class Runtime {
  state: SessionState = { targets: [], tasks: [], ended: false };
  modules: ModuleDefinition[];
  private listeners = new Set<() => void>();
  private controllers = new Map<string, AbortController>();
  private choices = new Map<string, (value: string) => void>();
  private sequence = 0;
  constructor(modules: ModuleDefinition[] = MODULES) { this.modules = modules; }
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  notify(): void { this.listeners.forEach(fn => fn()); }
  get activeTarget(): Target | undefined { return this.state.targets.find(target => target.id === this.state.activeTargetId); }
  private parseTarget(input: string, kind?: SiteKind): Target {
    try { return createTarget(input, kind); }
    catch (error) { throw new ValidationError({ target: error instanceof Error ? error.message : '目标无效' }); }
  }
  /** Compatibility helper for inspecting a profile; new runs must use startRun. */
  target(input: string, kind?: SiteKind): Target {
    const created = this.parseTarget(input, kind);
    const found = this.state.targets.find(target => target.domain === created.domain && (!kind || target.kind === kind));
    if (!found) this.state.targets.push(created);
    this.state.activeTargetId = (found ?? created).id;
    this.state.ended = false; this.notify(); return found ?? created;
  }
  freshTarget(input: string, kind?: SiteKind): Target {
    const target = this.parseTarget(input, kind);
    target.id = `${target.id}-run-${++this.sequence}`;
    this.state.targets.push(target); this.state.activeTargetId = target.id; this.state.ended = false;
    this.notify(); return target;
  }
  selectTarget(id: string): void {
    if (!this.state.targets.some(target => target.id === id)) throw new ValidationError({ target: '目标不存在' });
    this.state.activeTargetId = id; this.notify();
  }
  updateTarget(id: string, mutator: (target: Target) => void): void {
    const target = this.state.targets.find(item => item.id === id);
    if (!target) throw new ValidationError({ target: '目标不存在' });
    mutator(target); target.revision++; this.notify();
  }
  private definition(id: string): ModuleDefinition {
    const definition = this.modules.find(module => module.id === id);
    if (!definition) throw new ValidationError({ module: '工具不存在' });
    return definition;
  }
  private assertAvailable(): void {
    if (this.controllers.size || this.state.tasks.some(task => task.status === 'running')) throw new ValidationError({ task: '当前工具已有运行中的任务，请先停止或结束' });
  }
  private parameters(definition: ModuleDefinition, params: Params, target: Target): Params {
    const merged: Params = Object.fromEntries(definition.fields.filter(field => field.default !== undefined).map(field => [field.key, field.default!]));
    Object.assign(merged, params);
    const errors: Record<string, string> = {};
    for (const field of definition.fields) {
      const value = merged[field.key];
      if (field.required && !value?.trim()) errors[field.key] = `请填写${field.label}`;
      if (value && field.type === 'select' && field.options && !field.options.some(option => option.value === value)) errors[field.key] = `${field.label}选项无效`;
    }
    for (const [key, error] of Object.entries(definition.validate(merged, target))) if (error) errors[key] = error;
    if (Object.keys(errors).length) throw new ValidationError(errors);
    return merged;
  }
  /** Validate everything before changing active target, history or session state. */
  startRun(moduleId: string, input: string, params: Params = {}): Task {
    const definition = this.definition(moduleId); this.assertAvailable();
    if (definition.targetRequired !== false && !input.trim()) throw new ValidationError({ target: '请填写目标' });
    const target = this.parseTarget(input.trim() || definition.name);
    const checked = this.parameters(definition, params, target);
    target.id = `${target.id}-run-${++this.sequence}`;
    this.state.targets.push(target); this.state.activeTargetId = target.id; this.state.ended = false;
    return this.launch(definition, target, checked, input);
  }
  start(moduleId: string, targetId: string, params: Params): Task {
    const definition = this.definition(moduleId); this.assertAvailable();
    const target = this.state.targets.find(item => item.id === targetId);
    if (!target) throw new ValidationError({ target: '目标不存在' });
    if (this.state.ended) throw new ValidationError({ session: '本次演示已结束，请重新输入目标开始' });
    return this.launch(definition, target, this.parameters(definition, params, target), target.domain);
  }
  private retainHistory(nextTargetId: string): void {
    const completed = this.state.tasks.filter(task => task.status !== 'running').slice(-4);
    const active = this.state.tasks.filter(task => task.status === 'running');
    const keep = new Set([...completed, ...active]);
    this.state.tasks = this.state.tasks.filter(task => keep.has(task));
    const targetIds = new Set([nextTargetId, ...this.state.tasks.map(task => task.targetId)]);
    this.state.targets = this.state.targets.filter(target => targetIds.has(target.id));
  }
  private launch(definition: ModuleDefinition, target: Target, params: Params, input: string): Task {
    this.retainHistory(target.id);
    const task: Task = { id: `task-${Date.now().toString(36)}-${++this.sequence}`, moduleId: definition.id, targetId: target.id, title: definition.name, status: 'running', progress: 0, phase: '链路点火', logs: [], logOffset: 0, startedAt: Date.now(), params: { ...params }, targetInput: input, events: [] };
    const controller = new AbortController(); this.controllers.set(task.id, controller); this.state.tasks.push(task); this.notify();
    const aborted = () => new DOMException('Task cancelled', 'AbortError');
    const alive = () => { if (controller.signal.aborted) throw aborted(); };
    const event = (kind: string, value: string) => {
      task.events!.push({ kind, value, at: Date.now() - task.startedAt });
      if (task.events!.length > 500) task.events!.splice(0, task.events!.length - 500);
    };
    const appendLog = (line: string) => {
      task.logs.push(line);
      if (task.logs.length > 1000) { const removed = task.logs.length - 1000; task.logs.splice(0, removed); task.logOffset = (task.logOffset ?? 0) + removed; }
    };
    const context: ModuleContext = {
      target, task, signal: controller.signal,
      log: line => { alive(); appendLog(`[${new Date().toLocaleTimeString('en-GB')}] ${line}`); event('log', line); this.notify(); },
      phase: (phase, progress) => { alive(); task.phase = phase; task.progress = Math.min(100, Math.max(0, progress)); event('phase', phase); this.notify(); },
      changed: () => { alive(); this.notify(); },
      wait: ms => new Promise<void>((resolve, reject) => {
        alive();
        const onAbort = () => { clearTimeout(timer); reject(aborted()); };
        const timer = setTimeout(() => { controller.signal.removeEventListener('abort', onAbort); resolve(); }, Math.max(0, ms));
        controller.signal.addEventListener('abort', onAbort, { once: true });
      }),
      choose: (prompt: string, options: Choice['options']) => new Promise<string>((resolve, reject) => {
        alive();
        if (!options.length || new Set(options.map(option => option.value)).size !== options.length) { reject(new Error('Choice options must be nonempty and unique')); return; }
        const onAbort = () => { this.choices.delete(task.id); delete task.choice; reject(aborted()); };
        this.choices.set(task.id, value => {
          controller.signal.removeEventListener('abort', onAbort); this.choices.delete(task.id); delete task.choice;
          event('choice', value); this.notify(); resolve(value);
        });
        controller.signal.addEventListener('abort', onAbort, { once: true });
        task.choice = { prompt, options: options.map(option => ({ ...option })) }; this.notify();
      }),
    };
    void Promise.resolve().then(() => { alive(); return definition.execute(context, task.params); }).then(result => {
      alive(); task.result = result; task.status = 'succeeded'; task.progress = 100; task.phase = '收工，结果在手'; event('result', result);
    }).catch(error => {
      if (controller.signal.aborted) { task.status = 'cancelled'; task.phase = '已中断'; }
      else { task.status = 'failed'; task.phase = '执行失败'; task.error = error instanceof Error ? error.message : String(error); appendLog(`ERROR ${task.error}`); event('error', task.error); }
    }).finally(() => {
      task.endedAt = Date.now(); delete task.choice; this.choices.delete(task.id); this.controllers.delete(task.id); this.notify();
    });
    return task;
  }
  choose(id: string, value: string): void {
    const task = this.state.tasks.find(item => item.id === id);
    if (!task || task.status !== 'running' || !task.choice || !task.choice.options.some(option => option.value === value) || !this.choices.has(id)) throw new ValidationError({ choice: '请选择当前可用选项' });
    this.choices.get(id)!(value);
  }
  /** Graceful completion is implemented by the continuous tool's own executor. */
  stop(id: string): void {
    const task = this.state.tasks.find(item => item.id === id && item.status === 'running');
    if (!task) return;
    if (!this.definition(task.moduleId).continuous || task.choice) { this.cancel(id); return; }
    const target = this.state.targets.find(item => item.id === task.targetId);
    if (target) { target.data.stop = true; this.notify(); }
  }
  cancel(id: string): void {
    const task = this.state.tasks.find(item => item.id === id);
    if (!task || task.status !== 'running') return;
    this.controllers.get(id)?.abort(); task.status = 'cancelled'; task.phase = '已中断'; task.endedAt = Date.now(); this.notify();
  }
  end(): void { for (const task of this.state.tasks) if (task.status === 'running') this.cancel(task.id); this.state.ended = true; this.notify(); }
}
