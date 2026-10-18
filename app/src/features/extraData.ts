import type { Target } from '../core/types';
export interface AccessPoint { id: string; name: string; channel: number; signal: number; security: string; dictionary: string }
export function accessPoints(t: Target): AccessPoint[] { return [0, 1, 2, 3].map((n) => ({ id: `ap-${n}`, name: `${t.domain.replace(/\W+/g, '-').slice(0, 22)}${['', '-Guest', '-Office', '-5G'][n]}`, channel: [1, 6, 11, 36][(t.seed + n) % 4], signal: -35 - ((t.seed + n * 17) % 46), security: n === 1 ? 'WPA2-PSK' : 'WPA2/WPA3', dictionary: n === 1 ? 'common' : 'extended' })); }
export interface BoardNode { id: string; name: string; region: string; x: number; y: number; latency: number }
export function boardNodes(t: Target): BoardNode[] { return ['西欧', '东亚', '北美', '南美', '大洋洲', '南亚'].map((region, i) => ({ id: `N${i + 1}`, name: `${t.domain.slice(0, 14)} / ${String(i + 1).padStart(2, '0')}`, region, x: [49, 81, 22, 33, 87, 70][i], y: [28, 38, 30, 70, 78, 52][i], latency: 18 + (t.seed + i * 31) % 180 })); }
export const sceneLines: Record<string, string[]> = {
 diagnostic: ['const snapshot = await scheduler.inspect();', 'for (const process of snapshot.processes) {', '  const sample = await metrics.read(process.pid);', '  scheduler.checkBudget(process, sample);', '  report.append({ pid: process.pid, ...sample });', '}', 'await report.flush({ format: "json" });'],
 analysis: ['const source = await workspace.open(entry);', 'const graph = parser.buildGraph(source);', 'for (const symbol of graph.symbols) {', '  const refs = resolver.references(symbol);', '  diagnostics.checkLifetime(symbol, refs);', '}', 'await index.commit(graph);'],
 network: ['const stream = collector.subscribe("edge");', 'for await (const sample of stream) {', '  const route = topology.resolve(sample.node);', '  counters.update(route, sample.bytes);', '  latency.observe(sample.rtt);', '  await writer.append(sample);', '}'],
};
