import { el, sfx } from '../effects';

export interface RansomAlertOptions {
  onClose: () => void;
}

export class RansomAlert {
  private modal: HTMLDivElement;
  private timerId = 0;
  private secondsLeft = 180; // 3分钟倒计时
  private clockEl!: HTMLElement;
  private fileListEl!: HTMLElement;
  private closed = false;
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  constructor(private opts: RansomAlertOptions) {
    this.modal = el('div', 'ransom-modal');
    this.build();
  }

  private build() {
    const win = el('div', 'ransom-win');

    // 顶部标题栏
    const top = el('div', 'ransom-top');
    top.innerHTML = `<h3>⚠ CRITICAL SECURITY INCIDENT // SYSTEM COMPROMISED</h3>`;
    const escBtn = el('button', 'ransom-esc-btn', '✕ 立即解除整蛊 (Esc)');
    escBtn.type = 'button';
    escBtn.onclick = () => this.close();
    top.append(escBtn);

    // 主体双栏
    const body = el('div', 'ransom-body');

    // 左栏：倒计时 + 文件滚动
    const left = el('div', 'ransom-timer-box');
    const clockLabel = el('div', 'ransom-clock-label', 'DECRYPTION PRICE WILL DOUBLE IN:');
    const clock = el('div', 'ransom-clock', '02:59:59');
    this.clockEl = clock;

    const filesBox = el('div', 'ransom-files-box');
    const filesTitle = el('div', 'ransom-files-title', 'ENCRYPTED LOCAL ARTIFACTS:');
    const filesList = el('div', 'ransom-files-list');
    this.fileListEl = filesList;
    filesBox.append(filesTitle, filesList);

    left.append(clockLabel, clock, filesBox);

    // 右栏：说明文案
    const right = el('div', 'ransom-main-text');
    right.innerHTML = `
      <h4>发生了什么？</h4>
      <p>你的本地演示资产已被虚拟密钥全面锁定。所有文档、数据库与照片均已挂载 AES-256-CBC 算法（其实并没有）。</p>
      <h4>我该如何解密？</h4>
      <p>无需支付比特币，无需拨打热线！此程序为 100% 纯本地演出，绝无破坏性操作，未触碰你电脑上的任何真实文件。</p>
      <p style="color:#ffcc00">按下右上角红色按钮或键盘 [ESC]，即可随时解除警报并查看幕后反转真相！</p>
    `;

    body.append(left, right);

    // 底部栏
    const btm = el('div', 'ransom-bottom-bar');
    btm.innerHTML = `
      <span class="ransom-note">⚠ SIMULATED PRANK &bull; ZERO NETWORK PACKETS &bull; SAFE FOR HARDWARE</span>
    `;
    const btmBtn = el('button', 'ransom-esc-btn', '关掉整蛊，我知道是假的啦');
    btmBtn.type = 'button';
    btmBtn.onclick = () => this.close();
    btm.append(btmBtn);

    win.append(top, body, btm);
    this.modal.append(win);
  }

  mount() {
    document.body.append(this.modal);
    document.addEventListener('keydown', this.onKey);
    sfx('alarm');

    // 启动倒计时与文件列表滚动
    const fakeFiles = [
      'thesis_final_v2.docx.locked',
      'salary_budget_2026.xlsx.locked',
      'family_vacation_photos.zip.locked',
      'passwords_backup.kdbx.locked',
      'client_contracts_q3.pdf.locked',
      'cat_video_compilation.mp4.locked',
      'steam_saved_games.dat.locked',
      'database_dump_master.sql.locked'
    ];

    let idx = 0;
    this.timerId = window.setInterval(() => {
      this.secondsLeft--;
      if (this.secondsLeft <= 0) {
        this.close();
        return;
      }
      const m = String(Math.floor(this.secondsLeft / 60)).padStart(2, '0');
      const s = String(this.secondsLeft % 60).padStart(2, '0');
      const ms = String(Math.floor(Math.random() * 99)).padStart(2, '0');
      this.clockEl.textContent = `02:${m}:${s}.${ms}`;

      if (idx < fakeFiles.length) {
        const item = el('div', '', `[-] ${fakeFiles[idx++]}`);
        this.fileListEl.append(item);
        this.fileListEl.scrollTop = this.fileListEl.scrollHeight;
      }
    }, 400);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timerId);
    document.removeEventListener('keydown', this.onKey);
    this.modal.remove();
    this.opts.onClose();
  }
}
