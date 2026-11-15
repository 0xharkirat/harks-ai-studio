// A solid 3D card: a rounded face with a border, a stack of edge layers for thickness, a floor shadow and a
// light sweep. It lives inside a `preserve-3d` plane and is posed per frame with `pose()`.
import { box, css, el } from '../../engine/dom';
import { clamp } from '../../engine/anim';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE } from '../../brand/tokens';
import { BLOCKS, CARD_W, buildBlock, glyph, type BlockId } from './fieldnote';

export const TAB_H = 46;
export const RADIUS = 20;
export const THICK = 5; // edge layers
export const THICK_STEP = 3.2;

const EDGE: Record<BlockId, [string, string]> = {
  callout: ['#D9E0EE', '#97A8C8'],
  hero: ['#D3DBF0', '#8F9FCB'],
  stats: ['#D3DBEA', '#8DA0C4'],
  features: ['#D8DEE8', '#98A6C0'],
  testimonial: ['#D3DBEA', '#8DA0C4'],
  cta: ['#D3DBEA', '#8DA0C4'],
  content: ['#D3DBEA', '#8DA0C4'],
  video: ['#CFC8F0', '#8A7FCB'],
};

const mix = (a: number[], b: number[], p: number) => a.map((x, i) => Math.round(x + (b[i] - x) * p));

export interface CardPose {
  x: number; y: number; z: number;
  rz?: number; rx?: number; s?: number;
  /** 0..1: how "exploded" the card is (shadow, edges, border, tab). */
  open?: number;
  /** Distance to the floor plane for the shadow. */
  floor?: number;
  /** 0..1 selected (orange tab). */
  sel?: number;
  radius?: [number, number, number, number];
  alpha?: number;
}

export class SolidCard {
  root: HTMLDivElement;
  face: HTMLDivElement;
  sheen: HTMLDivElement;
  private slabs: HTMLDivElement[] = [];
  private shadow: HTMLDivElement;
  private shade: HTMLDivElement;
  private tab: HTMLDivElement;
  private tabAct: HTMLDivElement;
  private tabText: HTMLSpanElement;
  private tabTile: HTMLSpanElement;
  readonly w = CARD_W;
  readonly h: number;
  /** Height of the label tab (plane px). */
  readonly tabH: number;
  constructor(parent: HTMLElement, public id: BlockId, ts = 1) {
    const def = BLOCKS[id];
    this.tabH = TAB_H * ts;
    this.h = def.h;
    this.root = box({ left: -this.w / 2, top: -this.h / 2, width: this.w, height: this.h, transformStyle: 'preserve-3d' });
    this.shadow = box({ inset: '0', background: 'rgba(14,32,96,0.55)', borderRadius: `${RADIUS}px`, willChange: 'transform' });
    this.root.append(this.shadow);
    const [e0, e1] = EDGE[id];
    for (let i = THICK; i >= 1; i--) {
      const p = i / THICK;
      const s = box({ inset: '0', borderRadius: `${RADIUS}px`, background: `rgb(${mix(hex(e0), hex(e1), p).join(',')})`, transform: `translateZ(${-i * THICK_STEP}px)` });
      this.slabs.push(s);
      this.root.append(s);
    }
    this.face = box({ inset: '0', borderRadius: `${RADIUS}px`, overflow: 'hidden', background: '#fff', border: '1px solid rgba(15,23,42,0.10)' });
    this.face.append(buildBlock(id));
    this.shade = box({ inset: '0', pointerEvents: 'none', background: 'linear-gradient(115deg, rgba(255,255,255,0) 0%, rgba(30,60,140,0.05) 55%, rgba(30,60,140,0.13) 100%)', opacity: '0' });
    this.face.append(this.shade);
    this.sheen = box({ left: '-40%', top: '-30%', width: '34%', height: '160%', pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.96) 50%, rgba(255,255,255,0) 100%)', opacity: '0' });
    this.sheen.style.transform = 'skewX(-18deg)';
    this.face.append(this.sheen);
    this.root.append(this.face);

    // Label tab (folder tab above the card). `ts` scales it (portrait uses big tabs that read on a phone).
    const tabW = (70 + def.label.length * 13.2) * ts;
    const tr = `${13 * ts}px ${13 * ts}px 0 0`;
    this.tab = box({ left: 34 * ts, top: -TAB_H * ts, width: tabW, height: TAB_H * ts + 2, transformOrigin: '0 100%', transform: 'translateZ(0.5px)' });
    const tabBase = box({ inset: '0', background: '#fff', border: '1px solid rgba(15,23,42,0.10)', borderBottom: 'none', borderRadius: tr });
    this.tabAct = box({ inset: '0', background: GRAD_ORANGE, borderRadius: tr, opacity: '0' });
    this.tabTile = el('span', { html: glyph(id, '#fff', 18 * ts), style: { width: `${28 * ts}px`, height: `${28 * ts}px`, borderRadius: `${8 * ts}px`, background: def.color, display: 'grid', placeItems: 'center' } });
    this.tabText = el('span', { text: def.label, style: { font: `600 ${22 * ts}px ${FONT.ui}`, letterSpacing: '-0.005em', color: C.text, whiteSpace: 'nowrap' } });
    const row = box({ left: 0, right: 0, top: 0, height: TAB_H * ts, display: 'flex', alignItems: 'center', gap: `${11 * ts}px`, padding: `0 ${18 * ts}px 0 ${13 * ts}px` }, this.tabTile, this.tabText);
    this.tab.append(tabBase, this.tabAct, row);
    this.root.append(this.tab);
    parent.append(this.root);
  }

  pose(p: CardPose) {
    const open = p.open ?? 1;
    const a = p.alpha ?? 1;
    css(this.root, {
      transform: `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, ${p.z.toFixed(2)}px) rotateX(${(p.rx ?? 0).toFixed(3)}deg) rotate(${(p.rz ?? 0).toFixed(3)}deg) scale(${(p.s ?? 1).toFixed(4)})`,
      visibility: a > 0.002 ? 'visible' : 'hidden',
    });
    const r = p.radius ?? [RADIUS, RADIUS, RADIUS, RADIUS];
    const rs = `${r[0].toFixed(1)}px ${r[1].toFixed(1)}px ${r[2].toFixed(1)}px ${r[3].toFixed(1)}px`;
    css(this.shade, { opacity: open, borderRadius: rs });
    css(this.face, { borderRadius: rs, borderColor: `rgba(15,23,42,${(0.10 * open).toFixed(3)})`, opacity: a });
    for (const s of this.slabs) css(s, { borderRadius: rs, opacity: clamp(open * 2 - 0.4) * a });
    const dz = Math.max(0, p.floor ?? 0);
    const sh = clamp(open) * a;
    css(this.shadow, {
      borderRadius: rs,
      opacity: sh * clamp(0.9 - dz / 700, 0.25, 0.9),
      filter: `blur(${(10 + dz * 0.2).toFixed(1)}px)`,
      transform: `translate3d(${(dz * 0.12).toFixed(1)}px, ${(dz * 0.05).toFixed(1)}px, ${(-dz - THICK * THICK_STEP).toFixed(1)}px) scale(${(0.985 - dz * 0.0001).toFixed(4)})`,
    });
    // Tab.
    const sel = p.sel ?? 0;
    const tp = clamp((open - 0.35) / 0.65);
    css(this.tab, { opacity: tp * a, transform: `translateZ(0.5px) scale(${(0.7 + 0.3 * tp).toFixed(3)})` });
    css(this.tabAct, { opacity: sel });
    const c = mix([15, 23, 42], [255, 255, 255], sel);
    css(this.tabText, { color: `rgb(${c.join(',')})` });
    css(this.tabTile, { background: sel > 0.5 ? 'rgba(255,255,255,0.22)' : BLOCKS[this.id].color });
  }

  /** Sweep a band of light across the face, p in 0..1 (outside = hidden). */
  sweep(p: number) {
    const on = p > 0 && p < 1;
    css(this.sheen, { opacity: on ? 1 : 0, left: `${(-40 + p * 150).toFixed(1)}%` });
  }
}

function hex(s: string) {
  const n = parseInt(s.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
