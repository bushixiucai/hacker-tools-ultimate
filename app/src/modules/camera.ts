// M4 摄像头接管（P0 · 整蛊类）。红线：绝不调用真实摄像头、绝不请求任何权限 ——
// 画面全部由 Canvas 程序生成（噪声 + 橘猫 + 时间戳 OSD）。一键关闭：「✕ 关闭整蛊」/ Esc / 双击画面。
import { el } from '../effects';

const CAMS = ['CAM-办公室鱼缸', 'CAM-楼道灭火器', 'CAM-机房走廊', 'CAM-茶水间'];

export class CameraModule {
  readonly root: HTMLDivElement;
  private canvases: HTMLCanvasElement[] = [];
  private raf = 0; private pan = 0; private nv = false; private nvClicks = 0;
  private subtitle: HTMLDivElement;
  private onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.popup')) this.onClose(); };

  constructor(private onClose: () => void) {
    this.root = el('div', 'cam');
    const close = el('button', 'cam-close', '✕ 关闭整蛊'); close.type = 'button'; close.dataset.egg = 'close-prank';
    close.onclick = (e) => { e.stopPropagation(); this.onClose(); };
    const grid = el('div', 'cam-grid');
    CAMS.forEach((name, i) => {
      const cell = el('div', 'cam-cell'), c = document.createElement('canvas'); c.width = 240; c.height = 150;
      c.dataset.cam = name; c.dataset.i = String(i); cell.append(c); grid.append(cell); this.canvases.push(c);
    });
    grid.addEventListener('dblclick', () => this.onClose());
    this.subtitle = el('div', 'cam-sub');
    const bar = el('div', 'cam-bar');
    const mk = (label: string, fn: () => void, egg?: string, cls = '') => {
      const b = el('button', cls, label); b.type = 'button'; if (egg) b.dataset.egg = egg;
      b.onclick = (e) => { e.stopPropagation(); fn(); }; bar.append(b); return b;
    };
    mk('◀ 云台', () => (this.pan = Math.max(-40, this.pan - 15)), undefined, 'cam-left');
    mk('云台 ▶', () => (this.pan = Math.min(40, this.pan + 15)), undefined, 'cam-right');
    mk('🌙 夜视 3x', () => this.toggleNv(), 'night-vision', 'cam-nv');
    this.root.append(close, grid, bar, this.subtitle);
  }
  private toggleNv() { this.nv = !this.nv; this.nvClicks++; this.root.classList.toggle('nv', this.nv); this.root.dataset.nvClicks = String(this.nvClicks); }

  mount(slot: HTMLElement) {
    slot.replaceChildren(this.root); document.addEventListener('keydown', this.onKey);
    const t0 = performance.now();
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      this.canvases.forEach((c, i) => this.drawCam(c, i, t));
      this.raf = requestAnimationFrame(draw);
    };
    draw();
  }
  unmount() { cancelAnimationFrame(this.raf); document.removeEventListener('keydown', this.onKey); this.root.remove(); }

  private drawCam(c: HTMLCanvasElement, i: number, t: number) {
    const g = c.getContext('2d')!, W = c.width, H = c.height;
    g.fillStyle = this.nv ? '#021a06' : ['#2a2f36', '#30302a', '#26302c', '#2e2a30'][i]; g.fillRect(0, 0, W, H);
    // 背景家具（简单几何）
    g.fillStyle = this.nv ? '#0b4d1c' : '#4a4f57'; g.fillRect(10, H - 40, W - 20, 30);
    // 橘猫：所有摄像头拍的都是同一只猫
    const cx = W / 2 + this.pan + Math.sin(t * 0.6 + i) * 18, cy = H - 52;
    g.fillStyle = this.nv ? '#6dff8f' : '#f39c32';
    g.beginPath(); g.ellipse(cx, cy + 10, 34, 20, 0, 0, 7); g.fill();             // 身体
    g.beginPath(); g.arc(cx + 26, cy - 8, 16, 0, 7); g.fill();                     // 头
    g.beginPath(); g.moveTo(cx + 14, cy - 18); g.lineTo(cx + 18, cy - 32); g.lineTo(cx + 24, cy - 21); g.fill(); // 耳
    g.beginPath(); g.moveTo(cx + 28, cy - 22); g.lineTo(cx + 36, cy - 33); g.lineTo(cx + 39, cy - 18); g.fill();
    const blink = Math.sin(t * 2 + i * 3) > 0.95;
    g.fillStyle = '#111'; if (!blink) { g.fillRect(cx + 20, cy - 10, 3, 4); g.fillRect(cx + 30, cy - 10, 3, 4); }
    // 噪声
    const n = 260; g.fillStyle = this.nv ? 'rgba(160,255,170,.25)' : 'rgba(255,255,255,.18)';
    for (let k = 0; k < n; k++) g.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    // 扫描线
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let y = (t * 40) % 4; y < H; y += 4) g.fillRect(0, y, W, 1);
    // OSD
    g.fillStyle = this.nv ? '#aaffbb' : '#fff'; g.font = '11px monospace';
    g.fillText(c.dataset.cam!, 6, 14);
    const d = new Date(); g.fillText(d.toLocaleTimeString('zh-CN', { hour12: false }), W - 62, 14);
    if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = '#ff3333'; g.beginPath(); g.arc(W - 70, 10, 4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('FAKE · 本地生成画面', 6, H - 6);
  }
}
