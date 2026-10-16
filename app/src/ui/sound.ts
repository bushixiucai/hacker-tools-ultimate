// G4 音效：全部由 WebAudio 本地合成（无音频文件、无网络）。
// PRD §6.2：默认开启、音量 40%；一键静音记入 localStorage；无用户手势不出声（首个手势后才创建 AudioContext）。
import type { Sfx } from '../effects';
const KEY = 'htb.muted', VOLUME = 0.4;
let ctx: AudioContext | null = null, master: GainNode | null = null, lastKey = 0, count = 0;
let muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();

const reflect = () => { document.body.dataset.sound = muted ? 'off' : 'on'; document.body.dataset.sfxCount = String(count); };
export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m; try { localStorage.setItem(KEY, m ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.value = m ? 0 : VOLUME; reflect();
  window.dispatchEvent(new CustomEvent('htb:sound', { detail: !m }));
}
function unlock() {
  if (ctx) { void ctx.resume(); return; }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : VOLUME; master.connect(ctx.destination);
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.3, at = 0, slideTo?: number) {
  const c = ctx!, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, gain = 0.3, at = 0) {
  const c = ctx!, buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(), g = c.createGain(); s.buffer = buf; g.gain.value = gain;
  s.connect(g).connect(master!); s.start(c.currentTime + at);
}
export function play(name: Sfx) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const now = performance.now();
  if (name === 'key') { if (now - lastKey < 45) return; lastKey = now; tone(1600 + Math.random() * 600, 0.015, 'square', 0.05); }
  else if (name === 'click') tone(900, 0.03, 'triangle', 0.15);
  else if (name === 'ding') { tone(1320, 0.35, 'sine', 0.25); tone(1980, 0.25, 'sine', 0.1, 0.02); }
  else if (name === 'alarm') { for (let i = 0; i < 3; i++) { tone(620, 0.14, 'sawtooth', 0.12, i * 0.3); tone(820, 0.14, 'sawtooth', 0.12, i * 0.3 + 0.15); } }
  else if (name === 'reveal') { noise(0.12, 0.35); tone(90, 0.3, 'sine', 0.5, 0, 45); noise(0.1, 0.3, 0.22); tone(90, 0.35, 'sine', 0.5, 0.22, 45); tone(660, 0.5, 'triangle', 0.2, 0.45, 990); }
  count++; reflect();
}
export function initSound() {
  reflect();
  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { capture: true });
  addEventListener('htb:sfx', (e) => play((e as CustomEvent<Sfx>).detail));
}
