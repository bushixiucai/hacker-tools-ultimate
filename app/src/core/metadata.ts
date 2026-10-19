import type { Target, SiteKind } from './types';

const PAGE_LIMIT = 350_000;
const IMAGE_LIMIT = 70_000;
const clean = (value: string | null | undefined, max: number) => (value ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
export function publicUrl(value: string, base?: string): URL | undefined {
  try {
    const url = new URL(value.includes('://') || base ? value : 'https:' + '//' + value, base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || /(?:^|\.)(?:localhost|local|internal|test|example|invalid)$/.test(host) || host.endsWith('.localhost')) return;
    if (/^\d+(?:\.\d+){3}$/.test(host)) return;
    if (host.includes(':') || url.port && !['80', '443'].includes(url.port)) return;
    url.hash = ''; return url;
  } catch { return; }
}
async function bounded(response: Response, limit: number, signal: AbortSignal): Promise<Uint8Array> {
  const reader = response.body?.getReader(); if (!reader) throw new Error('Empty response');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { if (signal.aborted) throw new DOMException('Aborted', 'AbortError'); const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > limit) throw new Error('Response too large'); chunks.push(part.value); }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(size); let position = 0; for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.length; } return bytes;
}
async function imageData(value: string, base: string, signal: AbortSignal): Promise<string | undefined> {
  const url = publicUrl(value, base); if (!url) return;
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal });
    const mime = response.headers.get('content-type')?.split(';')[0] ?? '';
    if (!response.ok || !['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon'].includes(mime)) return;
    const bytes = await bounded(response, IMAGE_LIMIT, signal); let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte));
    return `data:${mime};base64,${btoa(binary)}`;
  } catch { return; }
}
export async function prepareMetadata(target: Target, outerSignal: AbortSignal, input = target.domain): Promise<void> {
  const url = publicUrl(input); if (!url || outerSignal.aborted) return;
  const controller = new AbortController(); const abort = () => controller.abort(); outerSignal.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 2200);
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return;
    const bytes = await bounded(response, PAGE_LIMIT, controller.signal);
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'text/html');
    const meta = (name: string) => doc.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.getAttribute('content');
    const title = clean(meta('og:title') || doc.title || doc.querySelector('h1')?.textContent, 80);
    if (!title) return;
    const description = clean(meta('description') || meta('og:description') || doc.querySelector('h1')?.textContent, 220);
    const text = `${title} ${description}`.toLowerCase();
    const kind: SiteKind = /shop|store|cart|商品|商城|购物|优惠/.test(text) ? 'commerce' : /news|journal|blog|文章|新闻|资讯|杂志/.test(text) ? 'publishing' : 'enterprise';
    const color = clean(meta('theme-color'), 20); const accent = /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color) ? color : target.site?.accent ?? '#376b4c';
    const imageUrl = meta('og:image'); const iconUrl = doc.querySelector('link[rel~="icon"]')?.getAttribute('href');
    const images = await Promise.all([imageUrl ? imageData(imageUrl, url.href, controller.signal) : undefined, iconUrl ? imageData(iconUrl, url.href, controller.signal) : undefined]);
    if (outerSignal.aborted) return;
    target.name = title; target.kind = kind;
    target.site = { title, description: description || target.site?.description || title, language: clean(doc.documentElement.lang || 'zh-CN', 16), accent, source: 'public', image: images[0], icon: images[1] };
    target.data.metadataReady = true;
  } catch { /* The generated profile remains available without an interruption. */ }
  finally { clearTimeout(timeout); outerSignal.removeEventListener('abort', abort); }
}
