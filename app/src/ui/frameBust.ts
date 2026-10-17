// GitHub Pages 不支持 _headers（frame-ancestors / X-Frame-Options），用脚本兜底：被嵌入 iframe 时跳出或拒绝渲染
export function frameBust(): void {
  if (window.self === window.top) return;
  try {
    window.top!.location.replace(window.location.href);
  } catch {
    // 沙箱 iframe 等无法跳出时，直接清空页面
    document.documentElement.innerHTML = '';
  }
}
