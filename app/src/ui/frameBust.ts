// GitHub Pages 不支持 _headers（frame-ancestors / X-Frame-Options），用脚本兜底。
// 跨域 iframe 里无手势的 top.location 跳转常被浏览器静默拦截，所以无论是否跳出成功，都把页面换成固定提示。
export function frameBust(): boolean {
  if (window.self === window.top) return false;
  try { window.top!.location.replace(window.location.href); } catch { /* 跨域或沙箱：忽略 */ }
  const body = document.createElement('body');
  body.style.cssText = 'margin:0;padding:24px;background:#000;color:#0f0;font:14px/1.6 monospace';
  const p = document.createElement('p');
  p.append('本站不允许被嵌入。请直接访问 ');
  const a = document.createElement('a');
  a.href = window.location.href; a.target = '_top'; a.rel = 'noopener'; a.style.color = '#0f0';
  a.textContent = 'bushixiucai.github.io/hacker-tools-ultimate';
  p.append(a, '（纯属娱乐 · 本地模拟）');
  body.append(p);
  document.documentElement.replaceChildren(document.createElement('head'), body);
  return true;
}
