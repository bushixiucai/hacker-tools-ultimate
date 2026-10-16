import { cssVar, pick, rnd, reducedMotion } from './util';
export interface CodeRainOptions { chars?: string; fontSize?: number; color?: string; highlight?: string; interval?: number }
/** 全屏 Matrix 代码雨；返回 stop() */
export function startCodeRain(canvas: HTMLCanvasElement, o: CodeRainOptions = {}) {
  const chars = [...(o.chars ?? 'アイウエオカキクケコサシスセソ01黑客工具箱搞怪版ABCDEF<>/{}$#')];
  const fs = o.fontSize ?? 16, ctx = canvas.getContext('2d')!;
  let cols: number[] = [];
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; cols = Array.from({ length: Math.ceil(canvas.width / fs) }, () => rnd(-50, 0)); };
  resize(); addEventListener('resize', resize);
  let fg = cssVar('--fg', '#1fd655'), hi = cssVar('--fg-hi', '#ccffdd');
  addEventListener('htb:theme', () => { fg = cssVar('--fg', '#1fd655'); hi = cssVar('--fg-hi', '#ccffdd'); });
  const tick = () => {
    ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.font = `${fs}px monospace`;
    cols.forEach((y, i) => {
      ctx.fillStyle = Math.random() < 0.05 ? (o.highlight ?? hi) : (o.color ?? fg);
      ctx.fillText(pick(chars), i * fs, y * fs);
      cols[i] = y * fs > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
    });
  };
  const id = setInterval(tick, reducedMotion() ? 200 : (o.interval ?? 50));
  return () => { clearInterval(id); removeEventListener('resize', resize); };
}
