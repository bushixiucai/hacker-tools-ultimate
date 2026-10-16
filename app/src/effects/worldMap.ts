import { cssVar, el, rnd, sleep } from './util';
export interface City { name: string; x: number; y: number } // 归一化坐标 0..1
// 粗略手绘大陆轮廓，本地绘制，无地图瓦片（PRD R2）
const LANDS: [number, number][][] = [
  [[.05,.18],[.2,.1],[.32,.14],[.3,.3],[.24,.42],[.2,.5],[.15,.4],[.08,.32]],
  [[.22,.52],[.3,.55],[.33,.68],[.28,.9],[.24,.85],[.22,.65]],
  [[.44,.14],[.55,.12],[.56,.28],[.47,.32],[.43,.25]],
  [[.44,.36],[.56,.34],[.6,.5],[.55,.78],[.5,.8],[.45,.55]],
  [[.56,.1],[.85,.1],[.93,.25],[.85,.42],[.76,.5],[.68,.45],[.6,.38],[.56,.28]],
  [[.8,.65],[.9,.63],[.93,.75],[.85,.8],[.79,.74]],
];
export const CITIES: City[] = [
  ['纽约',.27,.3],['旧金山',.1,.33],['圣保罗',.3,.72],['伦敦',.47,.2],['莫斯科',.6,.18],['开罗',.54,.38],['开普敦',.52,.76],
  ['迪拜',.62,.42],['孟买',.68,.46],['北京',.8,.28],['东京',.9,.3],['新加坡',.77,.55],['悉尼',.9,.76],['南极企鹅站',.5,.97],
].map(([name, x, y]) => ({ name: name as string, x: x as number, y: y as number }));

export class WorldMap {
  private ctx: CanvasRenderingContext2D; private base: HTMLCanvasElement; private route: City[] = []; private prog = 0; private running = false;
  constructor(private canvas: HTMLCanvasElement, private hopsEl?: HTMLElement) {
    this.ctx = canvas.getContext('2d')!; this.base = this.renderBase(); this.loop();
    addEventListener('htb:theme', () => { this.base = this.renderBase(); });
  }
  private renderBase() {
    const { width: W, height: H } = this.canvas, c = document.createElement('canvas'); c.width = W; c.height = H;
    const fgRgb = cssVar('--fg-rgb', '51,255,102'), dim = cssVar('--fg-dim', '#1a8033'), bg2 = cssVar('--bg2', '#000a00');
    const g = c.getContext('2d')!, m = document.createElement('canvas'); m.width = W; m.height = H; const mk = m.getContext('2d')!;
    mk.fillStyle = '#fff';
    for (const l of LANDS) { mk.beginPath(); l.forEach(([x, y], i) => (i ? mk.lineTo(x * W, y * H) : mk.moveTo(x * W, y * H))); mk.closePath(); mk.fill(); }
    const d = mk.getImageData(0, 0, W, H).data;
    g.fillStyle = bg2; g.fillRect(0, 0, W, H); g.strokeStyle = `rgba(${fgRgb},.08)`;
    for (let x = 0; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 0; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.fillStyle = dim;
    for (let y = 2; y < H; y += 6) for (let x = 2; x < W; x += 6) if (d[(y * W + x) * 4]) g.fillRect(x, y, 3, 3);
    return c;
  }
  private loop = () => {
    const g = this.ctx, { width: W, height: H } = this.canvas, t = performance.now() / 300;
    const fg = cssVar('--fg', '#33ff66'), fgRgb = cssVar('--fg-rgb', '51,255,102'), hi = cssVar('--fg-hi', '#aaffcc'), acc = cssVar('--accent', '#ff4466');
    g.drawImage(this.base, 0, 0);
    this.route.forEach((c, i) => {
      const x = c.x * W, y = c.y * H; g.fillStyle = fg; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill();
      if (i <= this.prog) { g.strokeStyle = `rgba(${fgRgb},${0.4 + 0.3 * Math.sin(t + i)})`; g.beginPath(); g.arc(x, y, 6 + 4 * Math.sin(t + i), 0, 7); g.stroke();
        g.fillStyle = hi; g.font = '11px monospace'; g.fillText(c.name, x + 6, y - 6); }
    });
    for (let i = 0; i < this.route.length - 1; i++) {
      const seg = Math.min(1, Math.max(0, this.prog - i)); if (seg <= 0) break;
      const a = this.route[i], b = this.route[i + 1], ax = a.x * W, ay = a.y * H, bx = b.x * W, by = b.y * H, cx = (ax + bx) / 2, cy = Math.min(ay, by) - 50;
      g.strokeStyle = acc; g.lineWidth = 2; g.setLineDash([6, 4]); g.lineDashOffset = -t * 4; g.beginPath(); g.moveTo(ax, ay);
      for (let s = 0; s <= seg; s += 0.02) { const u = 1 - s; g.lineTo(u * u * ax + 2 * u * s * cx + s * s * bx, u * u * ay + 2 * u * s * cy + s * s * by); }
      g.stroke(); g.setLineDash([]); g.lineWidth = 1;
    }
    requestAnimationFrame(this.loop);
  };
  /** 随机路线追踪；onHop 每跳回调（用于终端输出），返回终点城市 */
  async trace(hops: number, fakeIp: () => string, onHop?: (i: number, ip: string, c: City, ms: number) => void): Promise<City> {
    while (this.running) await sleep(100);
    this.running = true; const pool = [...CITIES]; this.route = [];
    for (let i = 0; i < Math.min(hops, pool.length); i++) this.route.push(pool.splice(rnd(0, pool.length - 1), 1)[0]);
    this.prog = 0; this.hopsEl?.replaceChildren();
    for (let i = 0; i < this.route.length; i++) {
      const ip = fakeIp(), ms = rnd(12, 480), c = this.route[i];
      this.hopsEl?.append(el('div', '', `HOP ${String(i + 1).padStart(2, '0')}  ${ip.padEnd(16)} ${c.name}  ${ms}ms`));
      onHop?.(i, ip, c, ms);
      if (i < this.route.length - 1) { const st = this.prog; for (let k = 1; k <= 20; k++) { this.prog = st + k / 20; await sleep(35); } }
    }
    this.running = false; return this.route[this.route.length - 1];
  }
}
