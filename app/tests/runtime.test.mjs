import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const result = await build({
  stdin: { contents: `export { Runtime, ValidationError } from './src/core/runtime'; export { createTarget } from './src/core/profile'; export { MODULES } from './src/core/registry';`, resolveDir: resolve(import.meta.dirname, '..'), loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'module-registry', setup(builder) {
    builder.onLoad({ filter: /core\/registry\.ts$/ }, args => {
      const files = readdirSync(resolve(import.meta.dirname, '../src/features/definitions')).filter(name => name.endsWith('.ts'));
      const imports = files.map((name, i) => `import module${i} from '../features/definitions/${name}';`).join('\n');
      const replacement = `{${files.map((name, i) => `${JSON.stringify(name)}: {default: module${i}}`).join(',')}}`;
      return { contents: imports + '\n' + readFileSync(args.path, 'utf8').replace(/import\.meta\.glob<[^>]+>\([^;]+\)/, replacement), loader: 'ts' };
    });
  } }],
});
const { Runtime, ValidationError, createTarget, MODULES } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const settled = async task => { while (task.status === 'running') await sleep(10); return task; };

const definition = overrides => ({ id: 'test', name: 'Test', code: 'test', description: 'Test extension', category: 'Testing', fields: [], validate: () => ({}), execute: async () => 'done', ...overrides });

test('profiles normalize URLs and support independent tool input formats', () => {
  assert.deepEqual(createTarget('HTTPS://EXAMPLE.TEST/path?q=1'), createTarget('example.test'));
  assert.notDeepEqual(createTarget('example.test', 'commerce').records, createTarget('example.test', 'publishing').records);
  for (const input of ['上海 西区', '+86 13800138000', '192.0.2.0/24', 'CAM-01']) assert.ok(createTarget(input).seed >= 0);
  for (const input of ['', '<img>', 'bad..name', '256.3.4.5', '192.0.2.0/33', 'file:///tmp/a', 'javascript:alert(1)', 'a\u0000b']) assert.throws(() => createTarget(input));
  const target = createTarget('store.test'); assert.equal(target.site.source, 'generated');
  assert.doesNotMatch(target.site.title + target.site.description, /虚构|模拟/);
});

test('registry discovers twelve valid definitions', () => {
  assert.equal(MODULES.length, 12);
  assert.equal(new Set(MODULES.map(module => module.id)).size, 12);
  assert.equal(new Set(MODULES.map(module => module.code)).size, 12);
});

test('failed starts are atomic and defaults use the same validation path', async () => {
  const runtime = new Runtime([definition({ fields: [{ key: 'account', label: '账号', required: true }, { key: 'preset', label: 'Preset', type: 'select', default: 'small', options: [{ value: 'small', label: 'Small' }] }], validate: params => params.account === 'rejected' ? { account: '账号不可用' } : {} })]);
  const before = JSON.stringify(runtime.state);
  assert.throws(() => runtime.startRun('test', '', {}), ValidationError);
  assert.throws(() => runtime.startRun('test', 'example.test', {}), ValidationError);
  assert.throws(() => runtime.startRun('test', 'example.test', { account: 'rejected' }), ValidationError);
  assert.throws(() => runtime.startRun('test', 'example.test', { account: 'admin', preset: 'unknown' }), ValidationError);
  assert.equal(JSON.stringify(runtime.state), before);
  const task = runtime.startRun('test', 'example.test', { account: 'admin' });
  await settled(task); assert.equal(task.params.preset, 'small'); assert.equal(task.status, 'succeeded');
});

test('same input gets stable base data but isolated run mutations', async () => {
  const runtime = new Runtime([definition()]); await settled(runtime.startRun('test', 'example.test'));
  const first = runtime.activeTarget; first.records[0].title = 'Changed'; first.data.custom = true;
  await settled(runtime.startRun('test', 'EXAMPLE.TEST')); const second = runtime.activeTarget;
  assert.notEqual(first.id, second.id); assert.equal(first.seed, second.seed);
  assert.notEqual(second.records[0].title, 'Changed'); assert.deepEqual(second.data, {});
});

test('runtime instances are independent and one session blocks overlapping runs', async () => {
  const slow = definition({ execute: async ctx => { await ctx.wait(60); ctx.target.scanned = true; return 'done'; } });
  const one = new Runtime([slow]); const two = new Runtime([slow]);
  const first = one.startRun('test', 'same.test'); const second = two.startRun('test', 'same.test');
  assert.throws(() => one.startRun('test', 'other.test'), ValidationError); assert.equal(one.state.targets.length, 1);
  one.cancel(first.id); await Promise.all([settled(first), settled(second)]); await sleep(70);
  assert.equal(one.activeTarget.scanned, false); assert.equal(two.activeTarget.scanned, true);
});

test('choices wait, reject stale input and capture selected events', async () => {
  const runtime = new Runtime([definition({ execute: async ctx => {
    const value = await ctx.choose('入口', [{ value: 'portal', label: 'Portal' }, { value: 'api', label: 'API' }]);
    ctx.target.data.entry = value; ctx.changed(); return value;
  } })]);
  const task = runtime.startRun('test', 'example.test'); await sleep(0);
  assert.equal(task.status, 'running'); assert.equal(task.choice.prompt, '入口');
  assert.throws(() => runtime.choose(task.id, 'unknown'), ValidationError);
  runtime.choose(task.id, 'portal'); await settled(task);
  assert.equal(task.result, 'portal'); assert.equal(runtime.activeTarget.data.entry, 'portal');
  assert.ok(task.events.some(event => event.kind === 'choice' && event.value === 'portal'));
  assert.throws(() => runtime.choose(task.id, 'api'), ValidationError);
});

test('abort releases pending choices and prevents subsequent mutations', async () => {
  const runtime = new Runtime([definition({ execute: async ctx => {
    await ctx.choose('Continue', [{ value: 'yes', label: 'Yes' }]); ctx.target.unlocked = true; return 'done';
  } })]);
  const task = runtime.startRun('test', 'example.test'); await sleep(0); runtime.end(); await sleep(0);
  assert.equal(task.status, 'cancelled'); assert.equal(task.choice, undefined); assert.equal(runtime.activeTarget.unlocked, false);
  const next = runtime.startRun('test', 'example.test'); await sleep(0); runtime.cancel(next.id); await sleep(0);
  assert.equal(runtime.state.ended, false);
});

test('injected continuous extension gracefully stops and owns cleanup', async () => {
  const runtime = new Runtime([definition({ continuous: true, targetRequired: false, execute: async ctx => {
    ctx.target.locked = true;
    try { while (!ctx.target.data.stop) await ctx.wait(5); return 'Stopped'; }
    finally { ctx.target.locked = false; }
  } })]);
  const task = runtime.startRun('test', ''); await sleep(10); assert.equal(runtime.activeTarget.locked, true);
  runtime.stop(task.id); await settled(task); assert.equal(task.status, 'succeeded'); assert.equal(runtime.activeTarget.locked, false);
  runtime.cancel(task.id); runtime.end(); assert.equal(task.status, 'succeeded');
});

test('session retains only the latest five runs and their matching targets', async () => {
  const runtime = new Runtime([definition()]);
  for (let i = 0; i < 9; i++) await settled(runtime.startRun('test', `target-${i}.test`));
  assert.equal(runtime.state.tasks.length, 5); assert.equal(runtime.state.targets.length, 5);
  assert.deepEqual(runtime.state.tasks.map(task => task.targetInput), ['target-4.test','target-5.test','target-6.test','target-7.test','target-8.test']);
  assert.ok(runtime.state.tasks.every(task => runtime.state.targets.some(target => target.id === task.targetId)));
  assert.equal(runtime.activeTarget.domain, 'target-8.test');
  const before = JSON.stringify(runtime.state);
  assert.throws(() => runtime.startRun('test', ''), ValidationError);
  assert.equal(JSON.stringify(runtime.state), before);
});

test('long sessions retain bounded chronological logs and replay events with an absolute offset', async () => {
  const runtime = new Runtime([definition({ execute: async ctx => {
    for (let i = 0; i < 1300; i++) ctx.log(`record-${i}`);
    return 'complete';
  } })]);
  const task = runtime.startRun('test', 'bounded.test'); await settled(task);
  assert.equal(task.logs.length, 1000); assert.equal(task.logOffset, 300);
  assert.match(task.logs[0], /record-300$/); assert.match(task.logs.at(-1), /record-1299$/);
  assert.equal(task.events.length, 500); assert.equal(task.events.at(-1).kind, 'result');
  assert.equal(task.events[0].value, 'record-801');
});


test('stop cancels a pending choice instead of leaving the session blocked', async () => {
  for (const continuous of [false, true]) {
    const runtime = new Runtime([definition({continuous, execute:async ctx => { await ctx.choose('Wait',[{value:'yes',label:'Yes'}]); return 'done'; }})]);
    const task=runtime.startRun('test','stop.test');await sleep(0);runtime.stop(task.id);await settled(task);assert.equal(task.status,'cancelled');assert.equal(task.choice,undefined);
  }
});
