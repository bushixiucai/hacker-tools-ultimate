import { el, sfx } from '../effects';

export interface VirtualBrowserOptions {
  target: string;
  onFinish: () => void;
}

const SKULL_ART = `
       .---.
      /     \\
     | () () |
      \\  ^  /
       |||||
`;

export class VirtualBrowser {
  private modal: HTMLDivElement;
  private defacedEl: HTMLDivElement | null = null;
  private cleanEl: HTMLDivElement | null = null;
  private isDefaced = false;
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close();
  };

  constructor(private opts: VirtualBrowserOptions) {
    this.modal = el('div', 'vb-modal');
    this.build();
  }

  private build() {
    const win = el('div', 'vb-window');

    // 1. 窗口标题栏
    const header = el('div', 'vb-header');
    const dots = el('div', 'vb-dots');
    const dotRed = el('div', 'vb-dot red');
    const dotYellow = el('div', 'vb-dot yellow');
    const dotGreen = el('div', 'vb-dot green');
    dotRed.onclick = () => this.close();
    dots.append(dotRed, dotYellow, dotGreen);

    const tabs = el('div', 'vb-tabs');
    const tab = el('div', 'vb-tab');
    tab.innerHTML = `<span style="color:#00e5ff">🌐</span> <span>${this.escape(this.opts.target)} - Official Portal</span>`;
    tabs.append(tab);
    header.append(dots, tabs);

    // 2. 浏览器地址栏工具区
    const navBar = el('div', 'vb-actions-bar');
    const backBtn = el('button', 'vb-nav-btn', '◀');
    const fwdBtn = el('button', 'vb-nav-btn', '▶');
    const reloadBtn = el('button', 'vb-nav-btn', '⟳');
    backBtn.type = 'button'; fwdBtn.type = 'button'; reloadBtn.type = 'button';

    const urlBar = el('div', 'vb-url-bar');
    urlBar.innerHTML = `<span class="vb-lock">🔒 HTTPS</span> <span class="vb-url-text">https://${this.escape(this.opts.target)}/</span>`;

    const tools = el('div', 'vb-tools');
    const toggleBtn = el('button', 'vb-tool-btn', '切换篡改/原貌');
    toggleBtn.type = 'button';
    toggleBtn.onclick = () => this.toggleView();
    tools.append(toggleBtn);

    navBar.append(backBtn, fwdBtn, reloadBtn, urlBar, tools);

    // 3. 页面内容展示区
    const content = el('div', 'vb-content');

    // 3.1 正常企业官网视图
    const clean = el('div', 'vb-page-clean');
    clean.innerHTML = `
      <div class="vb-corp-nav">
        <div class="vb-corp-logo">${this.escape(this.opts.target).toUpperCase()} // ENTERPRISE</div>
        <div class="vb-corp-links">
          <span>Products</span>
          <span>Security Portal</span>
          <span>Careers</span>
          <span>Contact</span>
        </div>
      </div>
      <div class="vb-corp-hero">
        <div class="vb-corp-title">Secure Intelligent Operations Center</div>
        <div class="vb-corp-desc">Delivering high-availability cloud architecture and zero-trust infrastructure to millions worldwide.</div>
        <button type="button" style="background:#238636;color:#fff;border:0;padding:8px 20px;border-radius:6px;cursor:pointer">Explore Solutions</button>
      </div>
      <div class="vb-corp-grid">
        <div class="vb-corp-card">
          <h4>Cloud Cluster</h4>
          <p>99.999% uptime SLA monitored 24/7 across global availability zones.</p>
        </div>
        <div class="vb-corp-card">
          <h4>Edge Firewall</h4>
          <p>AI-driven WAF blocking 10M+ automated threats daily.</p>
        </div>
        <div class="vb-corp-card">
          <h4>Data Fabric</h4>
          <p>Encrypted multi-region relational storage with zero-latency replication.</p>
        </div>
      </div>
    `;
    this.cleanEl = clean;

    // 3.2 黑客涂鸦篡改层 (Defaced View)
    const defaced = el('div', 'vb-page-defaced hidden');
    defaced.innerHTML = `
      <div class="vb-stamp">DEFACED</div>
      <pre class="vb-skull">${SKULL_ART}</pre>
      <div class="vb-defaced-badge">SECURITY BREACH // SYSTEM TAKEOVER</div>
      <div class="vb-defaced-title" contenteditable="true" title="点击可直接编辑修改文字">
        站长由于周五下午摸鱼，网站已被全盘接管！
      </div>
      <div class="vb-defaced-sub" contenteditable="true" title="点击可直接编辑修改文字">
        “我们突破了所有防御，并在主页留下了这行字。全员今日提前下班，本条通知已写入区块链（不是）。”
      </div>
      <div class="vb-defaced-sign">
        [+] HACKED BY CYBER-PHANTOM &bull; TIME: ${new Date().toLocaleTimeString()} &bull; ACCESS: ROOT
      </div>
      <div class="vb-restore-bar">
        <span style="font-size:11px;color:#aaa">提示：可直接点击上方红字修改涂鸦</span>
        <button type="button" class="vb-toggle-mode" style="background:#333;color:#00ff66;border:1px solid #00ff66">查看篡改前</button>
        <button type="button" class="vb-finish-btn" style="background:#ff2222;color:#fff;border:0;font-weight:bold">恢复网站 (完成演示)</button>
      </div>
    `;
    this.defacedEl = defaced;

    content.append(clean, defaced);
    win.append(header, navBar, content);
    this.modal.append(win);

    // 绑定内部按钮
    defaced.querySelector('.vb-toggle-mode')?.addEventListener('click', () => this.toggleView());
    defaced.querySelector('.vb-finish-btn')?.addEventListener('click', () => this.close());
  }

  mount() {
    document.body.append(this.modal);
    document.addEventListener('keydown', this.onKey);

    // 1.5 秒后自动上演故障并切换到篡改状态
    setTimeout(() => {
      this.triggerDefacement();
    }, 1200);
  }

  private triggerDefacement() {
    if (this.isDefaced) return;
    sfx('alarm');
    this.isDefaced = true;
    this.cleanEl?.classList.add('hidden');
    this.defacedEl?.classList.remove('hidden');
  }

  private toggleView() {
    this.isDefaced = !this.isDefaced;
    if (this.isDefaced) {
      this.cleanEl?.classList.add('hidden');
      this.defacedEl?.classList.remove('hidden');
      const btn = this.defacedEl?.querySelector('.vb-toggle-mode');
      if (btn) btn.textContent = '查看篡改前';
    } else {
      this.defacedEl?.classList.add('hidden');
      this.cleanEl?.classList.remove('hidden');
    }
  }

  close() {
    document.removeEventListener('keydown', this.onKey);
    this.modal.remove();
    this.opts.onFinish();
  }

  private escape(str: string): string {
    return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
  }
}
