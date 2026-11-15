// Shared building blocks: backgrounds, windows, the cursor, the edit box, the command pill, stickers.
import { el, box, css, tf, svg } from '../engine/dom';
import { clamp, ease, spring, lerp, noise1 } from '../engine/anim';
import { FONT } from '../brand/fonts';
import { C, GRAD_ORANGE, SHADOW, SYN } from '../brand/tokens';

// ── backgrounds ──────────────────────────────────────────────────────────

/** Light editor-world background: off-white with the tina.io mint-to-sky wash as soft drifting blobs. */
export class WashBg {
  root: HTMLDivElement;
  private blobs: HTMLDivElement[];
  constructor(parent: HTMLElement, W: number, H: number, opts: { base?: string; strength?: number } = {}) {
    this.root = box({ inset: '0', background: opts.base ?? C.bg, overflow: 'hidden' });
    const cols = [C.mint, C.sky2, C.sky3, C.seafoam, C.orange300];
    this.blobs = cols.map((c, i) =>
      box({ width: `${Math.max(W, H) * 0.7}px`, height: `${Math.max(W, H) * 0.7}px`, left: '0', top: '0', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, ${c} 0%, ${c}00 62%)`, opacity: String(i === 4 ? 0.35 : 0.55), willChange: 'transform' }),
    );
    this.root.append(...this.blobs);
    parent.append(this.root);
    this.W = W; this.H = H;
    this.strength = opts.strength ?? 1;
  }
  W: number; H: number; strength: number;
  update(t: number, strength = this.strength) {
    const { W, H } = this;
    const anchors = [[-0.15, -0.35], [0.55, -0.4], [0.75, 0.25], [-0.2, 0.35], [0.35, 0.55]];
    this.blobs.forEach((b, i) => {
      const [ax, ay] = anchors[i];
      const x = ax * W + noise1(t * 0.12, i * 3) * W * 0.08;
      const y = ay * H + noise1(t * 0.1, i * 3 + 1) * H * 0.1;
      css(b, { transform: tf({ x, y, s: 1 + 0.08 * noise1(t * 0.2, i + 9) }), opacity: (i === 4 ? 0.3 : 0.55) * strength });
    });
  }
}

/** Dark developer-world background: navy with a faint grid and a slow glow. */
export class NavyBg {
  root: HTMLDivElement;
  private glow: HTMLDivElement;
  private grid: HTMLDivElement;
  constructor(parent: HTMLElement, public W: number, public H: number) {
    this.root = box({ inset: '0', background: `radial-gradient(ellipse at 50% 120%, ${C.navy2} 0%, ${C.ink2} 70%)`, overflow: 'hidden' });
    this.grid = box({
      inset: '-80px',
      backgroundImage: `linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)`,
      backgroundSize: '80px 80px',
      maskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
      webkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 20%, transparent 75%)',
    } as any);
    this.glow = box({ width: `${W}px`, height: `${W}px`, left: `${-W * 0.1}px`, top: `${-W * 0.6}px`, borderRadius: '50%', background: `radial-gradient(circle, ${C.orange}33 0%, transparent 60%)` });
    this.root.append(this.grid, this.glow);
    parent.append(this.root);
  }
  update(t: number) {
    css(this.grid, { transform: tf({ x: (t * 12) % 80, y: (t * 6) % 80 }) });
    css(this.glow, { transform: tf({ x: noise1(t * 0.15, 4) * 200, y: noise1(t * 0.12, 5) * 120 }) });
  }
}

// ── windows ──────────────────────────────────────────────────────────────

export interface WinOpts {
  w: number;
  h: number;
  dark?: boolean;
  url?: string;
  title?: string;
  radius?: number;
  chrome?: number;
}

/** A solid app/browser window: rounded, bordered, blue-tinted shadow, traffic lights, optional URL bar. */
export class Win {
  root: HTMLDivElement;
  body: HTMLDivElement;
  sheen: HTMLDivElement;
  constructor(parent: HTMLElement, public o: WinOpts) {
    const r = o.radius ?? 18;
    const ch = o.chrome ?? 52;
    const dark = !!o.dark;
    this.root = box({
      width: `${o.w}px`, height: `${o.h}px`, left: '0', top: '0', borderRadius: `${r}px`, overflow: 'hidden',
      background: dark ? SYN.bg : '#fff',
      border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)'}`,
      boxShadow: SHADOW.xl,
      transformOrigin: '50% 50%',
    });
    const bar = box({ left: '0', top: '0', right: '0', height: `${ch}px`, background: dark ? SYN.panel : '#F1F5F9', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}` });
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => bar.append(box({ left: `${20 + i * 22}px`, top: `${ch / 2 - 7}px`, width: '14px', height: '14px', borderRadius: '50%', background: c })));
    if (o.url) {
      bar.append(box({
        left: '50%', top: `${ch / 2 - 16}px`, height: '32px', width: `${Math.min(620, o.w * 0.45)}px`, transform: 'translateX(-50%)', borderRadius: '8px',
        background: dark ? 'rgba(255,255,255,0.06)' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}`,
        font: `500 15px ${FONT.ui}`, color: dark ? SYN.dim : C.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
      }, el('span', { html: lockSvg(dark ? SYN.dim : '#94A3B8') }), el('span', { text: o.url })));
    }
    if (o.title) bar.append(box({ left: '120px', top: '0', height: `${ch}px`, display: 'flex', alignItems: 'center', font: `500 16px ${FONT.ui}`, color: dark ? SYN.dim : C.text2 }, el('span', { text: o.title })));
    this.body = box({ left: '0', top: `${ch}px`, right: '0', bottom: '0', overflow: 'hidden' });
    this.sheen = box({ inset: '0', pointerEvents: 'none', background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)', opacity: '0', mixBlendMode: 'overlay' });
    this.root.append(bar, this.body, this.sheen);
    parent.append(this.root);
  }
  /** Sweep a light band across the glass, p 0..1. */
  sheenAt(p: number) {
    const on = p > 0 && p < 1;
    css(this.sheen, { opacity: on ? 1 : 0, transform: tf({ x: lerp(-this.o.w, this.o.w, ease.inOutCubic(clamp(p))) }) });
  }
}

const lockSvg = (c: string) => `<svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="6" width="10" height="7.5" rx="1.6" fill="${c}"/><path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" stroke="${c}" stroke-width="1.6"/></svg>`;

// ── cursor ───────────────────────────────────────────────────────────────

export class Cursor {
  root: HTMLDivElement;
  private ring: HTMLDivElement;
  private arrow: SVGSVGElement;
  constructor(parent: HTMLElement, scale = 1.6) {
    this.root = box({ left: '0', top: '0', width: '0', height: '0', zIndex: '50', pointerEvents: 'none' });
    this.ring = box({ left: '-30px', top: '-30px', width: '60px', height: '60px', borderRadius: '50%', border: `3px solid ${C.orange}`, opacity: '0' });
    this.arrow = svg(
      `<svg width="${28 * scale}" height="${34 * scale}" viewBox="0 0 28 34" fill="none"><path d="M3 2.5v24.6c0 .9 1.1 1.3 1.7.7l5.9-6.2 4.1 9.2c.3.6 1 .9 1.6.6l3.4-1.5c.6-.3.9-1 .6-1.6l-4.1-9.1h8.5c.9 0 1.3-1.1.7-1.7L4.7 1.8C4.1 1.2 3 1.6 3 2.5z" fill="#0F172A" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
      { position: 'absolute', left: '-4px', top: '-3px', filter: 'drop-shadow(0 6px 10px rgba(15,23,42,0.35))' },
    );
    this.root.append(this.ring, this.arrow);
    parent.append(this.root);
  }
  /** Position + optional click time (ripple and press). */
  update(x: number, y: number, t: number, clickAt?: number | number[], alpha = 1) {
    const clicks = clickAt == null ? [] : Array.isArray(clickAt) ? clickAt : [clickAt];
    let last = -Infinity;
    for (const c of clicks) if (c <= t) last = Math.max(last, c);
    const dt = t - last;
    const press = dt >= 0 && dt < 0.18 ? Math.sin((dt / 0.18) * Math.PI) : 0;
    css(this.root, { transform: tf({ x, y }), opacity: alpha, display: alpha > 0 ? '' : 'none' });
    css(this.arrow, { transform: tf({ s: 1 - press * 0.14 }) });
    const rp = clamp(dt / 0.55);
    css(this.ring, { opacity: dt >= 0 && dt < 0.55 ? (1 - rp) * 0.9 : 0, transform: tf({ s: 0.3 + ease.outCubic(rp) * 1.4 }) });
  }
}

/** Cursor path: piecewise eased moves between waypoints [t, x, y]. */
export function pathAt(t: number, pts: [number, number, number][], e = ease.inOutCubic): [number, number] {
  if (t <= pts[0][0]) return [pts[0][1], pts[0][2]];
  for (let i = 1; i < pts.length; i++) {
    if (t <= pts[i][0]) {
      const [t0, x0, y0] = pts[i - 1];
      const [t1, x1, y1] = pts[i];
      const p = e(clamp((t - t0) / (t1 - t0)));
      // A slight arc reads as a human hand.
      const arc = Math.sin(p * Math.PI) * Math.min(60, Math.hypot(x1 - x0, y1 - y0) * 0.12);
      return [lerp(x0, x1, p), lerp(y0, y1, p) - arc];
    }
  }
  const l = pts[pts.length - 1];
  return [l[1], l[2]];
}

// ── the edit box (the film's guide) ──────────────────────────────────────

export interface Rect { x: number; y: number; w: number; h: number }

export class EditBox {
  root: HTMLDivElement;
  private frame: HTMLDivElement;
  private handles: HTMLDivElement[] = [];
  private tag: HTMLDivElement;
  constructor(parent: HTMLElement, public label = '', opts: { color?: string; width?: number; radius?: number; tagSize?: number } = {}) {
    const col = opts.color ?? C.orange;
    const bw = opts.width ?? 3;
    this.root = box({ left: '0', top: '0', width: '100px', height: '100px', pointerEvents: 'none', zIndex: '40' });
    this.frame = box({ inset: '0', border: `${bw}px solid ${col}`, borderRadius: `${opts.radius ?? 10}px`, background: `${col}12`, boxShadow: `0 0 0 6px ${col}1A, 0 12px 40px -10px ${col}66` });
    this.root.append(this.frame);
    for (let i = 0; i < 4; i++) {
      const h = box({ width: '14px', height: '14px', borderRadius: '4px', background: '#fff', border: `${bw}px solid ${col}` });
      this.handles.push(h);
      this.root.append(h);
    }
    const ts = opts.tagSize ?? 17;
    this.tag = box({
      left: '-2px', top: `${-ts * 2.1}px`, height: `${ts * 1.75}px`, padding: `0 ${ts * 0.65}px`, borderRadius: '7px 7px 7px 2px', background: col, color: '#fff',
      font: `600 ${ts}px ${FONT.ui}`, display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap',
    }, el('span', { html: penSvg(ts) }), el('span', { text: label }));
    this.root.append(this.tag);
    parent.append(this.root);
  }
  setLabel(s: string) {
    const sp = this.tag.lastElementChild as HTMLSpanElement;
    if (sp.textContent !== s) sp.textContent = s;
  }
  /** Draw at rect r with alpha a; `pop` 0..1 adds a breathing scale on beats; showTag toggles the label. */
  update(r: Rect, a = 1, pop = 0, showTag = true) {
    const pad = 10 + pop * 6;
    const x = r.x - pad, y = r.y - pad, w = r.w + pad * 2, h = r.h + pad * 2;
    css(this.root, { transform: tf({ x, y }), width: w, height: h, opacity: a, display: a > 0.001 ? '' : 'none' });
    const pos = [[-7, -7], [w - 7, -7], [-7, h - 7], [w - 7, h - 7]];
    this.handles.forEach((hd, i) => css(hd, { left: pos[i][0], top: pos[i][1] }));
    css(this.tag, { opacity: showTag ? 1 : 0 });
  }
}

const penSvg = (s: number) => `<svg width="${s * 0.85}" height="${s * 0.85}" viewBox="0 0 16 16" fill="none"><path d="M11.2 1.8a1.9 1.9 0 0 1 2.7 2.7L5.4 13l-3.6.9.9-3.6 8.5-8.5z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

/** Spring-animated rect between keyframes: [[t, rect], ...]; jumps use a spring of `freq`. */
export function rectAt(t: number, keys: [number, Rect][], freq = 2.6, damp = 0.62): Rect {
  if (t <= keys[0][0]) return keys[0][1];
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1][0] <= t) i++;
  if (i === 0 && t < keys[0][0]) return keys[0][1];
  const [ti, ri] = keys[i];
  if (i === 0) return ri;
  const prev = keys[i - 1][1];
  const p = spring(t - ti, freq, damp);
  return { x: lerp(prev.x, ri.x, p), y: lerp(prev.y, ri.y, p), w: lerp(prev.w, ri.w, p), h: lerp(prev.h, ri.h, p) };
}

// ── the command pill (tina.io CodeButton) ────────────────────────────────

/**
 * The npx command field, as tina.io's CodeButton (tina.io/design, "Command field"): white with a 1 px slate-200 border
 * and 8 px corners, an ink chevron, the command in IBM Plex Mono 400 ink, and a flat orange-600 copy block whose copy
 * icon turns into a check after the click. The film keeps its own height and text size (the site's field is 46 px for
 * 14 px text); the site's spacing scales with the text, the block and its icon with the height. The orange caret is
 * the film's typing motif.
 */
export class Pill {
  root: HTMLDivElement;
  /** The chevron and the command, and the copy block. Callers that add layers to `root` use these, not child indices. */
  left: HTMLDivElement;
  tab: HTMLDivElement;
  private txt: HTMLSpanElement;
  private caret: HTMLSpanElement;
  private icon: HTMLSpanElement;
  private copied = false;
  constructor(parent: HTMLElement, public cmd = 'npx create-tina-app@latest', size = 40) {
    const h = size * 2.1;
    const u = size / 14; // one tina.io px at the film's text size
    this.root = box({
      left: '0', top: '0', height: `${h}px`, display: 'flex', alignItems: 'stretch', borderRadius: `${(h * 8) / 46}px`, overflow: 'hidden',
      background: '#fff', border: `${Math.max(2, h / 46).toFixed(1)}px solid ${C.line}`, boxShadow: SHADOW.md, whiteSpace: 'nowrap',
    });
    const left = this.left = el('div', { style: { display: 'flex', alignItems: 'center', gap: `${8 * u}px`, padding: `0 ${8 * u}px 0 ${16 * u}px`, font: `400 ${size}px ${FONT.mono}`, color: C.ink } });
    left.append(el('span', { html: chevronSvg(16 * u), style: { display: 'flex', color: C.ink } }));
    const cmdWrap = el('span', { style: { display: 'flex', alignItems: 'center' } });
    this.txt = el('span', { text: '' });
    this.caret = el('span', { style: { display: 'inline-block', width: `${size * 0.55}px`, height: `${size * 1.1}px`, background: C.orange, marginLeft: `${size * 0.04}px` } });
    cmdWrap.append(this.txt, this.caret);
    left.append(cmdWrap);
    const tab = this.tab = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: `${(h * 52) / 44}px`, flex: 'none', background: C.orange600, color: '#fff' } });
    this.icon = el('span', { html: copySvg((h * 20) / 44), style: { display: 'flex' } });
    tab.append(this.icon);
    this.root.append(left, tab);
    parent.append(this.root);
  }
  update(t: number, typeStart: number, cps = 26, copiedAt = Infinity) {
    const n = Math.max(0, Math.min(this.cmd.length, Math.floor((t - typeStart) * cps)));
    const s = this.cmd.slice(0, n);
    if (this.txt.textContent !== s) this.txt.textContent = s;
    const typing = n < this.cmd.length;
    const blink = typing || Math.floor((t - typeStart) * 2) % 2 === 0;
    css(this.caret, { opacity: blink ? 1 : 0 });
    const copied = t >= copiedAt && t < copiedAt + 1.6;
    if (copied !== this.copied) {
      this.copied = copied;
      const px = this.icon.firstElementChild?.getAttribute('width') ?? '24';
      this.icon.innerHTML = copied ? checkSvg(Number(px)) : copySvg(Number(px));
    }
  }
}
// The site's icons (Boxicons, as tina.io renders them): chevron-right, copy, check.
const chevronSvg = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor"><path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z"/></svg>`;
const copySvg = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="#fff"><path d="M20 2H10c-1.103 0-2 .897-2 2v4H4c-1.103 0-2 .897-2 2v10c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-4h4c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2zM4 20V10h10l.002 10H4zm16-6h-4v-4c0-1.103-.897-2-2-2h-4V4h10v10z"/></svg>`;
const checkSvg = (s: number) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="#fff"><path d="m10 15.586-3.293-3.293-1.414 1.414L10 18.414l9.707-9.707-1.414-1.414z"/></svg>`;

// ── images and stickers ──────────────────────────────────────────────────

export function image(parent: HTMLElement, src: string, style: Record<string, string | number> = {}) {
  const i = el('img', { attrs: { src, draggable: 'false' }, style: { position: 'absolute', left: '0', top: '0', display: 'block', userSelect: 'none', ...style } as any });
  parent.append(i);
  return i;
}

/** A round llama reaction sticker (cropped from the official character sheet, unaltered). */
export function sticker(parent: HTMLElement, mood: 'happy' | 'thinking' | 'unimpressed' | 'surprised', size = 220) {
  const s = box({ left: '0', top: '0', width: `${size}px`, height: `${size}px`, borderRadius: '50%', overflow: 'hidden', background: '#fff', border: '6px solid #fff', boxShadow: SHADOW.lg });
  image(s, `/assets/llama/head-${mood}.png`, { width: '100%', height: '100%', objectFit: 'cover' });
  parent.append(s);
  return s;
}

/** Chat/notification bubble (problem scene). */
export function bubble(parent: HTMLElement, text: string, who = 'Content team', size = 24, avatar = C.blue) {
  const b = box({
    left: '0', top: '0', display: 'flex', gap: `${size * 0.6}px`, alignItems: 'flex-start', padding: `${size * 0.7}px ${size * 0.9}px`, borderRadius: `${size * 0.7}px`,
    background: '#fff', boxShadow: SHADOW.md, border: '1px solid rgba(15,23,42,0.06)', maxWidth: `${size * 22}px`,
  });
  const av = el('div', { style: { flex: '0 0 auto', width: `${size * 1.8}px`, height: `${size * 1.8}px`, borderRadius: '50%', background: avatar, color: '#fff', display: 'grid', placeItems: 'center', font: `600 ${size * 0.8}px ${FONT.ui}` }, text: who[0] });
  const col = el('div', {});
  col.append(
    el('div', { text: who, style: { font: `600 ${size * 0.72}px ${FONT.ui}`, color: C.text2, marginBottom: `${size * 0.2}px` } }),
    el('div', { text, style: { font: `500 ${size}px/1.3 ${FONT.ui}`, color: C.text } }),
  );
  b.append(av, col);
  parent.append(b);
  return b;
}

/** Pop-in transform for an element appearing at time t0 (spring scale from 0). */
export function popIn(e: HTMLElement, t: number, t0: number, x = 0, y = 0, extra = '', freq = 3.2, damp = 0.5) {
  const p = spring(t - t0, freq, damp);
  css(e, { transform: `${tf({ x, y, s: Math.max(0, p) })} ${extra}`, opacity: t >= t0 ? Math.min(1, (t - t0) * 8) : 0 });
}

export { GRAD_ORANGE };
