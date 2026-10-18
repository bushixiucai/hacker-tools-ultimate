// M4 摄像头接管（P0 · 整蛊类）。红线：绝不调用真实摄像头、绝不请求任何权限 ——
// 画面全部由 Canvas 程序生成（高科技 CCTV HUD + 运动目标追踪 + 热成像/夜视滤镜 + 橘猫）。一键关闭：「✕ 关闭整蛊」/ Esc / 双击画面。
import { el, sfx } from '../effects';

const CAMS = ['CAM-01 走廊机房', 'CAM-02 财务金库', 'CAM-03 数据中心', 'CAM-04 运维前台'];
type CamFilter = 'normal' | 'nv' | 'thermal';

export class CameraModule {
  readonly root: HTMLDivElement;
  private canvases: HTMLCanvasElement[] = [];
  private raf = 0;
  private pan = 0;
  private tilt = 0;
  private filter: CamFilter = 'normal';
  private nvClicks = 0;
  private ptzStatusEl: HTMLSpanElement;
  private subtitle: HTMLDivElement;
  private onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('.popup')) this.onClose(); };

  constructor(private onClose: () => void) {
    this.root = el('div', 'cam');
    const close = el('button', 'cam-close', '✕ 关闭整蛊 (Esc)');
    close.type = 'button'; close.dataset.egg = 'close-prank';
    close.onclick = (e) => { e.stopPropagation(); this.onClose(); };

    const grid = el('div', 'cam-grid');
    CAMS.forEach((name, i) => {
      const cell = el('div', 'cam-cell');
      const c = document.createElement('canvas');
      c.width = 300; c.height = 180;
      c.dataset.cam = name; c.dataset.i = String(i);
      cell.append(c); grid.append(cell);
      this.canvases.push(c);
    });
    grid.addEventListener('dblclick', () => this.onClose());

    this.subtitle = el('div', 'cam-sub');
    const bar = el('div', 'cam-bar');
    const mk = (label: string, fn: () => void, egg?: string, cls = '') => {
      const b = el('button', cls, label); b.type = 'button'; if (egg) b.dataset.egg = egg;
      b.onclick = (e) => { e.stopPropagation(); fn(); }; bar.append(b); return b;
    };

    mk('◀ 云台左移', () => { this.pan = Math.max(-50, this.pan - 15); this.updatePtz(); }, undefined, 'cam-left');
    mk('云台右移 ▶', () => { this.pan = Math.min(50, this.pan + 15); this.updatePtz(); }, undefined, 'cam-right');
    mk('🌙 微光夜视', () => this.toggleNv(), 'night-vision', 'cam-nv');
    mk('🔥 热成像 FLIR', () => this.toggleThermal(), undefined, 'cam-thermal');

    this.ptzStatusEl = el('span', 'cam-ptz-status');
    this.ptzStatusEl.style.cssText = 'font-size:11px;color:#aaa;margin-left:auto;font-family:monospace;align-self:center';
    this.updatePtz();
    bar.append(this.ptzStatusEl);

    this.root.append(close, grid, bar, this.subtitle);
  }

  private updatePtz() {
    if (this.ptzStatusEl) {
      const p = this.pan >= 0 ? `+${this.pan}` : `${this.pan}`;
      this.ptzStatusEl.textContent = `PTZ: PAN ${p}° | TILT ${this.tilt}° | ZOOM 2.0X`;
    }
  }

  private toggleNv() {
    sfx('key');
    this.nvClicks++;
    this.filter = this.filter === 'nv' ? 'normal' : 'nv';
    this.root.classList.toggle('nv', this.filter === 'nv');
    this.root.dataset.nvClicks = String(this.nvClicks);
  }

  private toggleThermal() {
    sfx('key');
    this.filter = this.filter === 'thermal' ? 'normal' : 'thermal';
    this.root.classList.toggle('nv', false);
  }

  mount(slot: HTMLElement) {
    slot.replaceChildren(this.root);
    document.addEventListener('keydown', this.onKey);
    const t0 = performance.now();
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      this.canvases.forEach((c, i) => this.drawCam(c, i, t));
      this.raf = requestAnimationFrame(draw);
    };
    draw();
  }

  unmount() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }

  private drawCam(c: HTMLCanvasElement, i: number, t: number) {
    const g = c.getContext('2d')!, W = c.width, H = c.height;

    // 1. 背景底色
    if (this.filter === 'nv') {
      g.fillStyle = '#021e06';
    } else if (this.filter === 'thermal') {
      g.fillStyle = '#100028';
    } else {
      g.fillStyle = ['#1a1d24', '#1f221e', '#1c1c22', '#221e20'][i];
    }
    g.fillRect(0, 0, W, H);

    // 2. 室内模拟场景（机柜与桌面）
    if (this.filter === 'nv') g.fillStyle = '#0a3d16';
    else if (this.filter === 'thermal') g.fillStyle = '#3a0055';
    else g.fillStyle = '#2d333b';
    g.fillRect(15, H - 45, W - 30, 35);

    // 3. 动态高危目标：橘猫（所有摄像头全在拍同一只猫）
    const cx = W / 2 + this.pan + Math.sin(t * 0.7 + i) * 20, cy = H - 56;

    if (this.filter === 'nv') g.fillStyle = '#6dff8f';
    else if (this.filter === 'thermal') g.fillStyle = '#ff3300';
    else g.fillStyle = '#f39c32';

    // 身体
    g.beginPath(); g.ellipse(cx, cy + 12, 36, 22, 0, 0, 7); g.fill();
    // 头部
    g.beginPath(); g.arc(cx + 28, cy - 8, 17, 0, 7); g.fill();
    // 双耳
    g.beginPath(); g.moveTo(cx + 16, cy - 18); g.lineTo(cx + 20, cy - 34); g.lineTo(cx + 26, cy - 22); g.fill();
    g.beginPath(); g.moveTo(cx + 30, cy - 23); g.lineTo(cx + 38, cy - 35); g.lineTo(cx + 41, cy - 19); g.fill();

    // 眼睛眨动
    const blink = Math.sin(t * 2.5 + i * 2) > 0.94;
    g.fillStyle = this.filter === 'thermal' ? '#ffff00' : '#111';
    if (!blink) {
      g.fillRect(cx + 22, cy - 10, 3, 5);
      g.fillRect(cx + 32, cy - 10, 3, 5);
    }

    // 4. CCTV HUD: 目标追踪方框 (AI Object Tracking Box)
    const boxX = cx - 20, boxY = cy - 38, boxW = 75, boxH = 65;
    g.strokeStyle = this.filter === 'thermal' ? '#ffff00' : '#00ff66';
    g.lineWidth = 1;
    g.setLineDash([4, 4]);
    g.strokeRect(boxX, boxY, boxW, boxH);
    g.setLineDash([]);

    // 追踪框角标与标签
    g.fillStyle = this.filter === 'thermal' ? '#ffff00' : '#00ff66';
    g.font = '9px monospace';
    g.fillText('TARGET LOCK: [CAT_ALPHA_9527]', boxX, boxY - 4);

    // 5. 动态随机噪点
    const n = 280;
    g.fillStyle = this.filter === 'nv' ? 'rgba(160,255,170,.22)' : this.filter === 'thermal' ? 'rgba(255,100,255,.2)' : 'rgba(255,255,255,.14)';
    for (let k = 0; k < n; k++) g.fillRect(Math.random() * W, Math.random() * H, 1, 1);

    // 6. 扫描线效果
    g.fillStyle = 'rgba(0,0,0,.2)';
    for (let y = (t * 40) % 4; y < H; y += 4) g.fillRect(0, y, W, 1);

    // 7. CCTV OSD 仪表信息
    g.font = '11px monospace';
    // 左上角：通道信息
    g.fillStyle = this.filter === 'nv' ? '#aaffbb' : this.filter === 'thermal' ? '#ff99ff' : '#00e5ff';
    g.fillText(c.dataset.cam!, 8, 16);

    // 右上角：闪烁的红色 REC 点与毫秒时间戳
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
    g.fillStyle = '#fff';
    g.fillText(timeStr, W - 82, 16);

    if (Math.floor(t * 2) % 2 === 0) {
      g.fillStyle = '#ff2222';
      g.beginPath(); g.arc(W - 90, 12, 4, 0, 7); g.fill();
      g.font = '9px monospace';
      g.fillText('REC', W - 114, 15);
    }

    // 底部标识
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.font = '10px monospace';
    g.fillText('LOCAL SIMULATION // RTSP CH-0' + (i + 1), 8, H - 8);
  }
}
