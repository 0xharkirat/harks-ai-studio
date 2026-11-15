// Pieces of the `problem` scene that are not shared kit: the faded page from the title scene, the
// raw-text window (the editor's view of the file), the speech bubble and the click ripple.
import { box, css, el, svg, tf } from '../../engine/dom';
import { clamp, ease } from '../../engine/anim';
import { Win } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE, SHADOW, SYN } from '../../brand/tokens';
import { MD } from '../open';
import { pageCard } from '../title/card';

/** The Markdown file both windows show: the same file as the `open` scene, so the film keeps one source of truth. */
export const MD_LINES = MD.split('\n');
/** The line the editor breaks: the headline (what marketing asked the developer to change). */
export const BAD = Math.max(0, MD_LINES.findIndex((l) => /headline:/.test(l)));
/** The line the lost editor drags a selection over: the one after the headline (or before, if it is last). */
export const SEL = BAD + 1 < MD_LINES.length - 1 ? BAD + 1 : Math.max(0, BAD - 1);
export const indentOf = (l: string) => l.length - l.trimStart().length;

/**
 * The rendered page that the title scene leaves behind (faint, blurred, centred). It is built by the same code as
 * the title scene's card, so the cut into this scene shows no pop; the caller fades it out.
 */
export function ghostCard(parent: HTMLElement, W: number, H: number, portrait: boolean) {
  const { root: card } = pageCard(parent, W, H, portrait);
  return {
    root: card,
    /** a = 1 is the title scene's last frame; the caller scales opacity. */
    update(a: number) {
      css(card, { opacity: 0.28 * a, transform: tf({ y: portrait ? -60 : 40, s: 0.86 }), filter: 'blur(5px)', display: a > 0.001 ? '' : 'none' });
    },
  };
}

/** The editor's view of the file: plain text on a light window, no structure, no help. */
export class RawWindow {
  root: HTMLDivElement;
  win: Win;
  private indent!: HTMLSpanElement;
  private bad!: HTMLSpanElement;
  private caret: HTMLDivElement;
  private sel: HTMLDivElement;
  private banner: HTMLDivElement;
  /** Geometry used by the scene to aim the cursor. */
  readonly pad = 36;
  readonly top = 22;
  readonly chrome = 52;
  constructor(parent: HTMLElement, public w: number, public h: number, public size: number) {
    this.root = box({ left: '0', top: '0', width: `${w}px`, height: `${h}px` });
    this.win = new Win(this.root, { w, h, title: 'home.mdx (raw)' });
    const body = this.win.body;
    const lh = size * 1.6;
    this.sel = box({ left: '0', top: '0', height: `${lh}px`, width: '0px', background: 'rgba(0,132,255,0.24)', borderRadius: '3px' });
    body.append(this.sel);
    MD_LINES.forEach((ln, i) => {
      const row = box({ left: `${this.pad}px`, top: `${this.top + i * lh}px`, font: `400 ${size}px/${lh}px ${FONT.mono}`, color: '#1E293B', whiteSpace: 'pre' });
      if (i === BAD) {
        // The indent is its own span so one extra space can slip in; the rest carries the squiggle.
        this.indent = el('span', { text: ' '.repeat(indentOf(ln)) });
        this.bad = el('span', { text: ln.trimStart(), style: { textDecorationThickness: '2.5px', textUnderlineOffset: '6px', textDecorationSkipInk: 'none' } });
        row.append(this.indent, this.bad);
      } else row.textContent = ln;
      body.append(row);
    });
    this.caret = box({ left: '0', top: '0', width: '3px', height: `${size * 1.25}px`, background: '#0F172A', borderRadius: '1px', opacity: '0' });
    body.append(this.caret);
    this.banner = box({
      left: '0', right: '0', bottom: '0', height: `${Math.round(size * 2.5)}px`, background: '#FEF2F2', borderTop: '2px solid #FCA5A5', display: 'flex', alignItems: 'center', gap: '14px', padding: `0 ${this.pad}px`,
      font: `600 ${Math.round(size * 0.9)}px ${FONT.ui}`, color: '#B91C1C', whiteSpace: 'nowrap',
    });
    this.banner.innerHTML = `<svg width="${size * 1.0}" height="${size * 1.0}" viewBox="0 0 24 24" fill="none"><path d="M12 3 2.5 20h19L12 3z" fill="#EF4444"/><path d="M12 9.5v5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.4" fill="#fff"/></svg><span>YAML error: bad indentation of a mapping entry (line ${BAD + 1})</span>`;
    body.append(this.banner);
    parent.append(this.root);
  }
  /** x of character column c, y of the middle of text line i, in the window's own coordinates. */
  colX(c: number) { return this.pad + c * this.size * 0.6; }
  lineY(i: number) { return this.chrome + this.top + (i + 0.5) * this.size * 1.6; }
  update(t: number, o: { breakAt: number; squigAt: number; bannerAt: number; caretAt: number; dragFrom: number; clearAt: number; selW: number }) {
    const lh = this.size * 1.6;
    const cw = this.size * 0.6;
    // The slip: one extra space in the indent of the headline line at `breakAt`.
    const ind = indentOf(MD_LINES[BAD]) + (t >= o.breakAt ? 1 : 0);
    const s = ' '.repeat(ind);
    if (this.indent.textContent !== s) this.indent.textContent = s;
    css(this.bad, { textDecoration: t >= o.squigAt ? 'underline wavy #E11D48' : 'none' });
    // The text caret blinks where the editor clicked.
    const on = t >= o.caretAt && t < o.dragFrom;
    const blink = t < o.breakAt + 0.1 || Math.floor((t - o.breakAt) * 2.4) % 2 === 0;
    css(this.caret, { opacity: on && blink ? 1 : 0, transform: tf({ x: this.pad + ind * cw - 1, y: this.top + BAD * lh + lh * 0.1 }) });
    // Drag selection over the line after the headline.
    const selChars = MD_LINES[SEL].trim().length;
    const x0 = this.pad + indentOf(MD_LINES[SEL]) * cw;
    const wSel = t >= o.dragFrom && t < o.clearAt ? Math.max(0, Math.min(selChars * cw, o.selW)) : 0;
    css(this.sel, { transform: tf({ x: x0, y: this.top + SEL * lh }), width: wSel });
    // The error banner pops up with a small shake.
    const p = clamp((t - o.bannerAt) / 0.35);
    const shake = t >= o.bannerAt && t < o.bannerAt + 0.4 ? Math.sin((t - o.bannerAt) * 70) * 5 * (1 - (t - o.bannerAt) / 0.4) : 0;
    css(this.banner, { transform: tf({ y: (1 - ease.snap(p)) * 120, x: shake }) });
  }
}

/** The llama's speech bubble: one silhouette (bubble + tail), one soft shadow. `*emphasis*` is orange; \n breaks the line. */
let tailIds = 0;
export function speechBubble(parent: HTMLElement, text: string, fontSize: number) {
  const g = box({ left: '0', top: '0', transformOrigin: '0% 100%', filter: 'drop-shadow(0 14px 20px rgba(20,70,150,0.22))' });
  const padX = fontSize * 0.72, padY = fontSize * 0.42;
  const b = el('div', {
    html: text.replace(/\*([^*]+)\*/g, `<span style="color:${C.orange}">$1</span>`),
    style: { position: 'relative', padding: `${padY}px ${padX}px`, borderRadius: `${fontSize * 0.7}px`, background: '#fff', font: `600 ${fontSize}px/1.18 ${FONT.head}`, letterSpacing: '-0.02em', color: C.ink, whiteSpace: 'pre', border: '3px solid #fff', boxShadow: '0 0 0 0 transparent', transformOrigin: '0% 100%' },
  });
  // The tail's 2 outer edges carry the same 3 px border as the box (a 6 px stroke clipped to the tail keeps the inner
  // 3 px), so the hover outline runs round the whole silhouette. The open path leaves the joint with the box clear.
  const sw = (6 / (fontSize * 0.025)).toFixed(2);
  const cid = `tail${++tailIds}`;
  const tail = svg(`<svg width="${fontSize * 1.1}" height="${fontSize * 1.0}" viewBox="0 0 44 40"><defs><clipPath id="${cid}"><path d="M2 0H40L0 40Z"/></clipPath></defs><path d="M2 0H40L0 40Z" fill="#fff"/><path d="M40 0L0 40L2 0" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linejoin="round" clip-path="url(#${cid})"/></svg>`, { position: 'absolute', left: `${fontSize * 0.5}px`, top: '100%', marginTop: '-3px' });
  const tailEdge = tail.querySelectorAll('path')[2] as SVGPathElement;
  b.dataset.say = '1'; // the caption extractor reads speech bubbles by this mark
  b.append(tail);
  g.append(b);
  parent.append(g);
  return { root: g, body: b, tailEdge, tailW: fontSize * 1.1, tailH: fontSize * 1.0 };
}

/** Click ripple for the black break: a press flash, two rings and a soft glow, driven by time since the click. */
export function clickRipple(parent: HTMLElement) {
  const root = box({ left: '0', top: '0', width: '0', height: '0', zIndex: '45', pointerEvents: 'none' });
  const glow = box({ left: '-340px', top: '-340px', width: '680px', height: '680px', borderRadius: '50%', background: `radial-gradient(circle, ${C.orange400}88 0%, ${C.orange}33 35%, ${C.orange}00 68%)`, opacity: '0' });
  const dot = box({ left: '-14px', top: '-14px', width: '28px', height: '28px', borderRadius: '50%', background: '#fff', opacity: '0', boxShadow: `0 0 30px 8px ${C.orange400}` });
  const rings = [0, 0.1].map(() => box({ left: '-110px', top: '-110px', width: '220px', height: '220px', borderRadius: '50%', border: `5px solid ${C.orange400}`, opacity: '0' }));
  root.append(glow, ...rings, dot);
  parent.append(root);
  return {
    root,
    update(t: number, x: number, y: number, clickAt: number) {
      const dt = t - clickAt;
      css(root, { transform: tf({ x, y }), display: dt >= 0 ? '' : 'none' });
      const g = clamp(dt / 0.8);
      css(glow, { opacity: dt >= 0 ? (1 - ease.outCubic(g)) : 0, transform: tf({ s: 0.35 + ease.outCubic(g) * 1.0 }) });
      css(dot, { opacity: dt >= 0 ? 1 - clamp(dt / 0.16) : 0, transform: tf({ s: 1 + ease.outQuad(clamp(dt / 0.16)) * 1.6 }) });
      rings.forEach((r, i) => {
        const d = dt - i * 0.1;
        const p = clamp(d / 0.9);
        css(r, { opacity: d >= 0 ? (1 - ease.inQuad(p)) : 0, transform: tf({ s: 0.14 + ease.outExpo(p) * (i ? 1.9 : 1.5) }), borderWidth: `${(5 - p * 3).toFixed(2)}px` });
      });
    },
  };
}

export { SYN };
