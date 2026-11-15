// Light-world props of the git scene: the Save button, the flying dots, the diff card and the pull request card.
import { box, css, el, setText, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg, spring } from '../../engine/anim';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE, SHADOW } from '../../brand/tokens';
import type { Pt, Rect } from './plan';

// ── Save button ──────────────────────────────────────────────────────────

export const SAVE_W = 300;
export const SAVE_H = 96;

export class SaveButton {
  root: HTMLDivElement;
  private press: HTMLDivElement;
  private done: HTMLDivElement;
  private glow: HTMLDivElement;
  private ripple: HTMLDivElement;
  private ripple2: HTMLDivElement;
  /** `calm`: the button stays orange when it saves (only the label changes) and draws no press rings.
   *  Default: it turns seafoam ("Saved") with 2 orange press rings. */
  constructor(parent: HTMLElement, public c: Pt, private calm = false) {
    this.root = box({ left: `${c[0] - SAVE_W / 2}px`, top: `${c[1] - SAVE_H / 2}px`, width: `${SAVE_W}px`, height: `${SAVE_H}px` });
    this.glow = box({ left: '-120px', top: '-120px', right: '-120px', bottom: '-120px', borderRadius: '60px', background: `radial-gradient(ellipse, ${C.orange}77 0%, ${C.orange}00 65%)`, opacity: '0' });
    this.ripple = box({ inset: '0', borderRadius: '16px', border: `4px solid ${C.orange}`, opacity: '0' });
    this.ripple2 = box({ inset: '0', borderRadius: '16px', border: `3px solid ${C.orange400}`, opacity: '0' });
    this.press = box({
      inset: '0', borderRadius: '16px', background: GRAD_ORANGE, boxShadow: '0 22px 44px -16px rgba(236,72,21,0.55), 0 4px 0 0 #B8350C', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
      font: `600 38px ${FONT.ui}`, color: '#fff', letterSpacing: '-0.01em',
    });
    this.press.innerHTML = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><path d="M7 3v5h8V3M7 21v-7h10v7" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg><span>Save</span>`;
    const ink = calm ? '#fff' : C.seafoam900;
    this.done = box({
      inset: '0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px',
      font: `600 38px ${FONT.ui}`, color: ink, letterSpacing: '-0.01em', opacity: '0',
      ...(calm
        ? { background: GRAD_ORANGE, boxShadow: '0 22px 44px -16px rgba(236,72,21,0.55), 0 4px 0 0 #B8350C' }
        : { background: `linear-gradient(135deg, ${C.seafoam} 0%, ${C.mint} 100%)`, boxShadow: '0 22px 44px -16px rgba(40,160,120,0.5), 0 4px 0 0 #5BC79C' }),
    });
    this.done.innerHTML = `<svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Saved</span>`;
    this.root.append(this.glow, this.press, this.done, this.ripple, this.ripple2);
    parent.append(this.root);
  }
  /** t = time; at = press time. exit = 0..1 for the leave. */
  update(t: number, at: number, exit: number) {
    const dt = t - at;
    // Press: down in 3 frames, spring back.
    const down = dt >= 0 ? Math.min(1, dt / 0.05) : 0;
    const back = dt > 0.05 ? spring(dt - 0.05, 3.6, 0.5) : 0;
    const sc = 1 - 0.07 * down * (1 - back) + 0.02 * back * (1 - ease.outCubic(clamp((dt - 0.3) / 0.5)));
    const sink = down * (1 - back) * 5;
    // Orange -> seafoam is a wipe, not a cross-fade (a cross-fade of the two turns muddy brown).
    const swap = ease.outCubic(seg(dt, 0.1, 0.22));
    css(this.press, { opacity: 1 });
    css(this.done, { opacity: swap > 0 ? 1 : 0, clipPath: swap >= 1 ? 'none' : `inset(0 ${((1 - swap) * 100).toFixed(2)}% 0 0 round 16px)` });
    css(this.glow, { opacity: dt >= 0 ? Math.exp(-dt * 6) : 0 });
    const r1 = clamp(dt / 0.55), r2 = clamp((dt - 0.1) / 0.55);
    const rings = this.calm ? 0 : 1;
    css(this.ripple, { opacity: rings * (dt >= 0 && r1 < 1 ? (1 - r1) ** 1.3 : 0), transform: tf({ s: 1 + ease.outCubic(r1) * 0.55 }) });
    css(this.ripple2, { opacity: rings * (dt >= 0.1 && r2 < 1 ? (1 - r2) ** 1.3 * 0.6 : 0), transform: tf({ s: 1 + ease.outCubic(r2) * 0.95 }) });
    css(this.root, {
      opacity: 1 - ease.inCubic(exit),
      transform: tf({ y: sink - exit * 40, s: sc * (1 - exit * 0.12) }),
    });
  }
}

// ── the comet ────────────────────────────────────────────────────────────

const TRAIL = 12;

export interface DotOpts {
  from: Pt;
  to: Pt;
  t0: number;
  t1: number;
  arc?: number;
  /** Replace the straight-ish flight by any path of progress 0..1. */
  path?: (p: number) => Pt;
  ease?: (p: number) => number;
}

export class Dot {
  root: HTMLDivElement;
  private ghosts: HTMLDivElement[] = [];
  from: Pt; to: Pt; t0: number; t1: number; arc: number;
  private fn?: (p: number) => Pt;
  private ease: (p: number) => number;
  constructor(parent: HTMLElement, o: DotOpts, big = 1) {
    this.from = o.from; this.to = o.to; this.t0 = o.t0; this.t1 = o.t1; this.arc = o.arc ?? 0.25; this.fn = o.path;
    this.ease = o.ease ?? ((p) => ease.inQuad(p) * 0.55 + ease.inOutQuad(p) * 0.45);
    this.root = box({ inset: '0', pointerEvents: 'none' });
    for (let i = TRAIL; i >= 0; i--) {
      const r = (i === 0 ? 15 : 14 * (1 - i / (TRAIL + 2))) * big;
      const g = box({
        left: `${-r}px`, top: `${-r}px`, width: `${r * 2}px`, height: `${r * 2}px`, borderRadius: '50%',
        background: i === 0 ? '#fff' : C.orange400,
        boxShadow: i === 0 ? `0 0 0 5px ${C.orange}, 0 0 34px 10px ${C.orange}AA` : `0 0 18px ${C.orange}66`,
        opacity: '0',
      });
      this.ghosts[i] = g;
      this.root.append(g);
    }
    parent.append(this.root);
  }
  /** Position at flight progress p (0..1): a quad Bezier bent upward, perpendicular to the chord. */
  pos(p: number): Pt {
    if (this.fn) return this.fn(p);
    const [x0, y0] = this.from, [x1, y1] = this.to;
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    let px = -dy / len, py = dx / len;
    if (py > 0) { px = -px; py = -py; }
    const k = len * this.arc;
    const qx = (x0 + x1) / 2 + px * k, qy = (y0 + y1) / 2 + py * k;
    const u = 1 - p;
    return [u * u * x0 + 2 * u * p * qx + p * p * x1, u * u * y0 + 2 * u * p * qy + p * p * y1];
  }
  update(t: number) {
    const live = t >= this.t0 && t < this.t1;
    for (let i = 0; i <= TRAIL; i++) {
      const g = this.ghosts[i];
      if (!live) { css(g, { opacity: 0 }); continue; }
      const p = clamp((t - this.t0) / (this.t1 - this.t0));
      const pp = clamp(p - i * 0.032);
      const [x, y] = this.pos(this.ease(pp));
      const fadeIn = clamp((t - this.t0) / 0.04);
      css(g, { opacity: (i === 0 ? 1 : (1 - i / (TRAIL + 1)) * 0.75) * fadeIn, transform: tf({ x, y }) });
    }
  }
}

// ── cards ────────────────────────────────────────────────────────────────

function cardShell(r: Rect) {
  return box({
    left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: '20px', background: '#fff',
    border: '1px solid rgba(15,23,42,0.07)', boxShadow: SHADOW.lg, overflow: 'hidden',
  });
}

export class DiffCard {
  root: HTMLDivElement;
  private plus: HTMLSpanElement;
  private caret: HTMLSpanElement;
  private plusText: string;
  constructor(parent: HTMLElement, public r: Rect, file: string, lines: { del: string; add: string }, size = 30) {
    this.plusText = lines.add;
    this.root = cardShell(r);
    const head = box({ left: '0', top: '0', right: '0', height: '60px', borderBottom: '1px solid #EEF2F6', background: '#F8FAFC', display: 'flex', alignItems: 'center', padding: '0 26px', gap: '12px', font: `500 19px ${FONT.mono}`, color: C.text2 });
    head.innerHTML = `<svg width="20" height="22" viewBox="0 0 20 22" fill="none"><path d="M3 1h9l5 5v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="#94A3B8" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 1v5h5" stroke="#94A3B8" stroke-width="1.8" stroke-linejoin="round"/></svg><span>${file}</span><span style="margin-left:auto;font:600 15px ${FONT.ui};color:${C.orange600};background:${C.orange100};padding:5px 12px;border-radius:999px;letter-spacing:0.02em">Modified</span>`;
    const rowStyle = (bg: string, col: string) => ({
      position: 'absolute', left: '0', right: '0', height: `${size * 2.05}px`, background: bg, color: col, display: 'flex', alignItems: 'center', padding: '0 26px', font: `500 ${size}px ${FONT.mono}`, whiteSpace: 'pre', fontVariantLigatures: 'none',
    });
    const top = 60 + (r.h - 60 - size * 4.1) / 2;
    const minus = el('div', { style: { ...rowStyle('#FFEFEE', '#B42318'), top: `${top}px` } as any });
    minus.innerHTML = `<span style="width:${size * 1.2}px;opacity:0.7">-</span><span>${lines.del}</span>`;
    const plus = el('div', { style: { ...rowStyle('#E6F8EE', '#067647'), top: `${top + size * 2.05}px` } as any });
    this.plus = el('span', { text: '' });
    this.caret = el('span', { style: { display: 'inline-block', width: `${size * 0.6}px`, height: `${size * 1.15}px`, background: C.orange, marginLeft: '2px' } });
    plus.append(el('span', { text: '+', style: { width: `${size * 1.2}px`, opacity: '0.7', display: 'inline-block' } }), this.plus, this.caret);
    this.root.append(head, minus, plus);
    parent.append(this.root);
  }
  /** `typeAt`: when the + line starts to type (16ths). */
  update(t: number, inAt: number, outAt: number, typeAt: number) {
    const pin = spring(t - inAt, 2.8, 0.7);
    const pout = ease.inCubic(seg(t, outAt, outAt + 0.28));
    const vis = t >= inAt && t < outAt + 0.3;
    css(this.root, {
      display: vis ? '' : 'none',
      opacity: clamp((t - inAt) * 8) * (1 - pout),
      transform: tf({ x: (1 - pin) * 90 + pout * 40, y: pout * 30, s: lerp(0.96, 1, clamp(pin)) * (1 - pout * 0.06) }),
    });
    // Typed on 16ths, 4 characters a step.
    const n = t < typeAt ? 0 : Math.min(this.plusText.length, (Math.floor((t - typeAt) / 0.125) + 1) * 4);
    setText(this.plus, this.plusText.slice(0, n));
    css(this.caret, { opacity: n >= this.plusText.length ? (Math.floor(t * 3) % 2 === 0 ? 1 : 0) : 1 });
  }
}

const prIcon = (c: string) => `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.4"/><circle cx="6" cy="18.5" r="2.4"/><circle cx="18" cy="18.5" r="2.4"/><path d="M6 8v8M18 16V9.5A3.5 3.5 0 0 0 14.5 6H11m0 0 2.4-2.4M11 6l2.4 2.4"/></svg>`;
const mergeIcon = (c: string) => `<svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="5.5" r="2.4"/><circle cx="6" cy="18.5" r="2.4"/><circle cx="18" cy="12" r="2.4"/><path d="M6 8v8M6 8c0 4 4 4 9.6 4"/></svg>`;

export class PRCard {
  root: HTMLDivElement;
  private icon: HTMLDivElement;
  private pillOpen: HTMLDivElement;
  private pillMerged: HTMLDivElement;
  private check: HTMLDivElement;
  private checkRing: HTMLDivElement;
  private running: HTMLDivElement;
  private spin: HTMLDivElement;
  constructor(parent: HTMLElement, public r: Rect, title: string, scale = 1) {
    this.root = cardShell(r);
    const pad = 30;
    this.icon = box({ left: `${pad}px`, top: '30px', width: '38px', height: '38px' });
    this.icon.innerHTML = prIcon('#1A7F37');
    const ttl = box({ left: `${pad + 58}px`, top: '27px', right: `${pad + 90}px`, font: `600 ${34 * scale}px/1.2 ${FONT.ui}`, color: C.text, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, el('span', { text: title }));
    const num = box({ right: `${pad}px`, top: '30px', font: `500 30px ${FONT.ui}`, color: '#94A3B8' }, el('span', { text: '#128' }));
    const pillCss = (bg: string, col: string) => ({ position: 'absolute', left: `${pad}px`, top: '100px', height: '42px', padding: '0 18px', borderRadius: '999px', background: bg, color: col, font: `600 21px ${FONT.ui}`, display: 'flex', alignItems: 'center', gap: '8px' });
    this.pillOpen = el('div', { style: pillCss('#DAFBE1', '#1A7F37') as any, html: `<span style="width:9px;height:9px;border-radius:50%;background:#1A7F37"></span>Open` });
    this.pillMerged = el('div', { style: { ...pillCss('#F3EBFF', '#6639BA'), opacity: '0' } as any, html: `<span style="width:9px;height:9px;border-radius:50%;background:#8250DF"></span>Merged` });
    const meta = box({ left: `${pad + 132}px`, top: '100px', height: '42px', display: 'flex', alignItems: 'center', font: `500 23px ${FONT.mono}`, color: C.text2, whiteSpace: 'nowrap' });
    meta.innerHTML = `<span style="color:#0969DA">content/homepage</span><span style="margin:0 10px">→</span><span style="color:#0969DA">main</span>`;
    const rule = box({ left: `${pad}px`, right: `${pad}px`, top: '166px', height: '1px', background: '#EEF2F6' });
    this.check = box({ left: `${pad}px`, top: '190px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px', font: `600 31px ${FONT.ui}`, color: '#067647', letterSpacing: '-0.01em' });
    this.running = box({ left: `${pad}px`, top: '190px', height: '56px', display: 'flex', alignItems: 'center', gap: '16px', font: `600 31px ${FONT.ui}`, color: C.text2, letterSpacing: '-0.01em' });
    this.spin = el('div', { style: { width: '44px', height: '44px', borderRadius: '50%', border: '5px solid #E2E8F0', borderTopColor: C.orange, flex: '0 0 auto' } });
    this.running.append(this.spin, el('span', { text: 'Checks running' }));
    this.checkRing = box({ left: '-6px', top: '-6px', width: '68px', height: '68px', borderRadius: '50%', border: `3px solid ${C.seafoam}`, opacity: '0' });
    const tick = el('div', { style: { width: '44px', height: '44px', borderRadius: '50%', background: `linear-gradient(135deg, ${C.seafoam}, ${C.mint})`, display: 'grid', placeItems: 'center', flex: '0 0 auto' }, html: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="${C.seafoam900}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>` });
    this.check.append(tick, el('span', { text: 'Checks passed' }));
    this.check.append(this.checkRing);
    css(this.checkRing, { left: '-8px', top: '-6px' });
    this.root.append(this.icon, ttl, num, this.pillOpen, this.pillMerged, meta, rule, this.running, this.check);
    parent.append(this.root);
  }
  update(t: number, inAt: number, checksAt: number, mergeAt: number, outAt: number) {
    const pin = spring(t - inAt, 2.6, 0.62);
    const pout = ease.inCubic(seg(t, outAt, outAt + 0.3));
    const vis = t >= inAt && t < outAt + 0.32;
    css(this.root, {
      display: vis ? '' : 'none',
      opacity: clamp((t - inAt) * 8) * (1 - pout),
      transform: tf({ x: (1 - pin) * 70, y: pout * -26, s: lerp(0.95, 1, clamp(pin)) * (1 - pout * 0.05) }),
    });
    // checks row: running, then passed
    const runOn = t >= inAt + 0.12 && t < checksAt;
    css(this.running, { opacity: runOn ? clamp((t - inAt - 0.12) * 6) : 0 });
    css(this.spin, { transform: tf({ r: t * 540 }) });
    const cp = spring(t - checksAt, 3.4, 0.5);
    css(this.check, { opacity: t >= checksAt ? 1 : 0, transform: tf({ x: (1 - clamp(cp)) * -24, s: 1 }) });
    const rp = clamp((t - checksAt) / 0.6);
    css(this.checkRing, { opacity: t >= checksAt && rp < 1 ? (1 - rp) ** 1.3 : 0, transform: tf({ s: 0.8 + ease.outCubic(rp) * 0.7 }) });
    // open -> merged
    const m = t >= mergeAt ? 1 : 0;
    const mp = spring(t - mergeAt, 3.4, 0.5);
    css(this.pillOpen, { opacity: 1 - m });
    css(this.pillMerged, { opacity: m, transform: tf({ s: m ? lerp(0.85, 1, clamp(mp)) : 1 }) });
    const wasMerged = this.icon.dataset.m === '1';
    if (wasMerged !== !!m) {
      this.icon.innerHTML = m ? mergeIcon('#8250DF') : prIcon('#1A7F37');
      this.icon.dataset.m = m ? '1' : '0';
    }
  }
}

// ── the repo card (dark world): "your content stays in your repo" ────────

const folderIcon = (c: string) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 0 1 2-2h4l2 2.2h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" fill="${c}" opacity="0.9"/></svg>`;
const fileIcon = (c: string) => `<svg width="22" height="26" viewBox="0 0 20 24" fill="none"><path d="M3 1h9l5 5v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 1v5h5" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

export class RepoCard {
  root: HTMLDivElement;
  private rows: HTMLDivElement[] = [];
  private hi: HTMLDivElement;
  constructor(parent: HTMLElement, public r: Rect) {
    this.root = box({
      left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: '20px', background: '#1B1638', border: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 40px 80px -24px rgba(0,0,0,0.6)', overflow: 'hidden',
    });
    const head = box({ left: '0', top: '0', right: '0', height: '66px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 26px', gap: '14px', font: `600 25px ${FONT.ui}`, color: '#fff' });
    head.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A9A4CC" stroke-width="1.9" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19v1a1 1 0 0 0 1 1h14"/></svg><span>fieldnote/website</span><span style="margin-left:auto;font:500 19px ${FONT.mono};color:#A9A4CC;border:1px solid rgba(255,255,255,0.16);padding:5px 12px;border-radius:999px">main</span>`;
    this.root.append(head);
    // tree rows
    const rows: { indent: number; icon: string; name: string; dim?: boolean; mod?: boolean; key?: boolean }[] = [
      { indent: 0, icon: folderIcon('#85C5FE'), name: 'content' },
      { indent: 1, icon: folderIcon('#85C5FE'), name: 'pages' },
      { indent: 2, icon: fileIcon('#FF724B'), name: 'home.mdx', mod: true },
      { indent: 2, icon: fileIcon('#8C87B4'), name: 'pricing.mdx', dim: true },
      { indent: 0, icon: folderIcon('#C9A7FF'), name: 'tina' },
      { indent: 1, icon: fileIcon('#7CC7FF'), name: 'config.ts', key: true },
    ];
    this.hi = box({ left: '10px', right: '10px', height: '46px', borderRadius: '10px', background: 'rgba(236,72,21,0.2)', boxShadow: `inset 3px 0 0 ${C.orange}`, opacity: '0' });
    const rowH = 46;
    const top0 = 80;
    this.root.append(this.hi);
    rows.forEach((row, i) => {
      const d = box({
        left: `${26 + row.indent * 30}px`, right: '26px', top: `${top0 + i * rowH}px`, height: `${rowH}px`, display: 'flex', alignItems: 'center', gap: '14px',
        font: `500 23px ${FONT.mono}`, color: row.dim ? '#8C87B4' : '#E6E3F5', whiteSpace: 'nowrap',
      });
      d.innerHTML = `${row.icon}<span>${row.name}</span>${row.mod ? `<span style="margin-left:auto;font:600 17px ${FONT.ui};color:${C.orange400};background:rgba(236,72,21,0.16);padding:4px 11px;border-radius:999px">Modified</span>` : ''}`;
      this.rows.push(d);
      this.root.append(d);
    });
    this.keyTop = top0 + 5 * rowH;
    parent.append(this.root);
  }
  private keyTop: number;
  /** `keyAt`: when the tina/config.ts row lights up (the next scene's code). */
  update(t: number, inAt: number, keyAt: number, outAt: number) {
    const pin = spring(t - inAt, 2.6, 0.7);
    const pout = ease.inCubic(seg(t, outAt, outAt + 0.3));
    css(this.root, {
      display: t >= inAt && pout < 1 ? '' : 'none',
      opacity: clamp((t - inAt) * 8) * (1 - pout),
      transform: tf({ x: (1 - pin) * 70 + pout * 40, s: lerp(0.95, 1, clamp(pin)) }),
    });
    this.rows.forEach((r, i) => css(r, { opacity: clamp((t - inAt - 0.12 - i * 0.06) * 8) }));
    const k = ease.outCubic(seg(t, keyAt, keyAt + 0.25));
    css(this.hi, { opacity: k, transform: tf({ y: this.keyTop }) });
  }
}
