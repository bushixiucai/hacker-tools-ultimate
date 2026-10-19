import type { ModuleDefinition, Target, Task } from '../core/types';

export interface Report { version: 1; moduleId: string; title: string; kind: 'flow' | 'snapshot'; target: Target; task: Task; createdAt: number }
function portable(value: unknown, depth = 0): unknown {
  if (depth > 9) return null;
  if (typeof value === 'string') return value.startsWith('data:image/') || /^https?:/i.test(value) && value.length > 500 ? '' : value.slice(0, 2400);
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(-100).map(item => portable(item, depth + 1));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !['__proto__', 'constructor', 'prototype', 'image', 'icon'].includes(key)).slice(0, 100).map(([key, item]) => [key, portable(item, depth + 1)]));
  return null;
}
export function createReport(module: ModuleDefinition, target: Target, task: Task): Report {
  const snapshot = portable(target) as Target;
  snapshot.data.stop = true; snapshot.data.paused = true;
  return { version: 1, moduleId: module.id, title: module.name, kind: module.continuous ? 'snapshot' : 'flow', target: snapshot, task: portable({ ...task, logs: task.logs.slice(-80), choice: undefined }) as Task, createdAt: Date.now() };
}
/** Human-readable snapshot facts, without exposing internal state keys. */
export function snapshotSummary(report: Report): string[] {
  const data = report.target.data;
  const facts: string[] = [];
  const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('zh-CN') : '—';
  if (data.phone && typeof data.phone === 'object') {
    const phone = data.phone as Record<string, unknown>;
    facts.push(`设备：${String(phone.model ?? '设备')} · ${String(phone.system ?? '')}`, `连接：${phone.connected ? '已建立' : '未连接'}`, `亮度 ${number(phone.brightness)}% · 音量 ${number(phone.volume)}%`);
    if (phone.note) facts.push(`备忘录：${String(phone.note).slice(0, 300)}`);
  }
  if (data.typer && typeof data.typer === 'object') {
    const typer = data.typer as Record<string, unknown>;
    facts.push(`输出 ${number(typer.processed)} 行 · 已完成 ${number(Math.floor(Number(typer.processed ?? 0) / 7))} 个检查单元`);
  }
  if (data.board && typeof data.board === 'object') {
    const board = data.board as Record<string, unknown>;
    facts.push(`场景：${board.scenario === 'defense' ? '防御态势' : '攻击态势'} · 采样 ${number(board.tick)} 轮`, `节点 ${Array.isArray(board.nodes) ? board.nodes.length : 0} 个 · 当前事件 ${Array.isArray(board.events) ? board.events.length : 0} 条`);
  }
  if (data.trafficState && typeof data.trafficState === 'object') {
    const traffic = data.trafficState as Record<string, unknown>;
    facts.push(`节点 ${number(traffic.nodes)} · 每节点速率 ${number(traffic.rate)}/s`, `累计请求 ${number(traffic.requests)} · 峰值延迟 ${number(traffic.peak)} ms`, `当前延迟 ${number(report.target.latency)} ms · 错误率 ${number(traffic.errors)}%`);
  }
  if (report.target.cameraConnected) facts.push('视频会话：4 路通道已建立');
  return facts;
}
function toBase64(bytes: Uint8Array): string { let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte)); return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function fromBase64(value: string): Uint8Array { const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(binary, char => char.charCodeAt(0)); }
export async function reportLink(report: Report): Promise<string> {
  let bytes = new TextEncoder().encode(JSON.stringify(report)); let prefix = 'j';
  if (typeof CompressionStream !== 'undefined') { bytes = new Uint8Array(await new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()); prefix = 'z'; }
  const payload = prefix + toBase64(bytes);
  if (payload.length > 16000) throw new Error('报告内容较多，请先导出图片，或精简内容后重新生成链接。');
  const url = new URL(location.href); url.hash = '/replay/' + payload; return url.href;
}
export async function readReport(payload: string): Promise<Report> {
  if (!payload || payload.length > 16000 || !/^[jz][a-z\d_-]+$/i.test(payload)) throw new Error('回放链接格式不正确');
  let bytes = fromBase64(payload.slice(1));
  if (payload[0] === 'z') {
    if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持此回放，请使用新版浏览器打开。');
    const reader = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 150000) { await reader.cancel(); throw new Error('回放内容超出限制'); } chunks.push(part.value); }
    bytes = new Uint8Array(size); let offset = 0; chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.length; });
  }
  if (bytes.byteLength > 150000) throw new Error('回放内容超出限制');
  const report = portable(JSON.parse(new TextDecoder().decode(bytes))) as Report;
  if (report.version !== 1 || !/^[a-z][a-z-]{1,45}$/.test(report.moduleId) || !['flow', 'snapshot'].includes(report.kind) || !report.target || typeof report.target.domain !== 'string' || !report.target.data || !report.task || !Array.isArray(report.task.logs) || !Array.isArray(report.target.records)) throw new Error('回放版本或内容不受支持');
  return report;
}
function lines(context: CanvasRenderingContext2D, value: string, width: number): string[] {
  const result: string[] = []; let line = '';
  for (const char of value) { if (char === '\n' || context.measureText(line + char).width > width) { result.push(line); line = char === '\n' ? '' : char; } else line += char; } if (line) result.push(line); return result;
}
export async function exportReportImage(report: Report): Promise<void> {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1440;
  const g = canvas.getContext('2d')!; g.fillStyle = '#050d08'; g.fillRect(0, 0, 1080, 1440);
  g.strokeStyle = '#00ff66'; g.lineWidth = 3; g.strokeRect(44, 44, 992, 1352);
  g.fillStyle = '#00ff66'; g.font = 'bold 46px monospace'; g.fillText('黑客工具箱', 82, 124);
  g.font = '24px monospace'; g.fillStyle = '#8bddaa'; g.fillText(new Date(report.createdAt).toLocaleString('zh-CN'), 82, 174);
  g.font = 'bold 38px monospace'; g.fillStyle = '#aaffcc'; g.fillText(report.title, 82, 264);
  g.font = '28px monospace'; let y = 322;
  for (const text of lines(g, `目标：${report.target.domain}\n状态：${report.task.phase}\n${report.task.result ?? report.task.error ?? '当前状态快照'}`, 900).slice(0, 9)) { g.fillText(text, 82, y); y += 43; }
  y += 30; g.font = '20px monospace'; g.fillStyle = '#66bb88';
  for (const text of lines(g, report.task.logs.slice(-12).join('\n'), 900).slice(-15)) { g.fillText(text, 82, y); y += 31; }
  g.fillStyle = '#001a0b'; g.fillRect(64, 1274, 952, 98); g.fillStyle = '#b8ffce'; g.font = 'bold 30px monospace'; g.fillText('纯属娱乐，所有内容均为模拟', 87, 1317); g.font = '20px monospace'; g.fillText('未执行真实入侵、设备操作或资金交易', 87, 1352);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('图片导出失败，请重试')), 'image/png'));
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${report.moduleId}-report.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
