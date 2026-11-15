// A recreation of the TinaCMS editor sidebar, drawn after the real plates (admin-home, admin-add-block):
// top bar, breadcrumb, the Sections list with the add button, the footer with Reset and Save, and the
// visual "add block" picker (header "SECTIONS - ADD NEW", search, preview cards with a label and a plus).
// The picker structure follows tinacms/src/toolkit/fields/plugins/blocks-field-plugin/block-selector-big.tsx.
import { box, css, el } from '../../engine/dom';
import { clamp } from '../../engine/anim';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE } from '../../brand/tokens';
import { logo } from '../../brand/logo';
import type { Rect } from '../../ui/kit';
import { BLOCKS, CARD_W, buildBlock, type BlockId } from './fieldnote';

/** Templates in the picker, in the real order. */
export const PICKER_IDS: BlockId[] = ['hero', 'callout', 'features', 'stats', 'cta', 'content', 'testimonial', 'video'];
/** The rows of the Sections list, in page order (Video is the block the scene adds). */
export const ROW_IDS: BlockId[] = ['callout', 'hero', 'video', 'stats', 'features', 'testimonial', 'cta'];
const UI = FONT.ui;

export interface PanelGeom {
  x: number; y: number; w: number; h: number;
  /** Picker columns. */
  cols: number;
  /** Size multiplier for every metric (1 = the 1920 landscape sidebar, 440 wide). */
  u: number;
  /** Portrait sheet: a slim header instead of the top bar and breadcrumb. */
  compact?: boolean;
}

interface PickCard { id: BlockId; root: HTMLDivElement; preview: HTMLDivElement; label: HTMLDivElement; plus: HTMLElement; x: number; y: number; w: number; h: number }
interface Row { id: BlockId; root: HTMLDivElement }

export class TinaPanel {
  root: HTMLDivElement;
  readonly g: PanelGeom;
  private form: HTMLDivElement;
  private picker: HTMLDivElement;
  private list: HTMLDivElement;
  private cards: PickCard[] = [];
  private rows: Row[] = [];
  private saveBtn: HTMLDivElement;
  private listBox!: HTMLDivElement;
  private topBar!: HTMLDivElement;
  private crumbEl!: HTMLElement;
  private u: number;
  private readonly BODY_TOP: number;
  private readonly FOOT: number;
  private readonly ROW_H: number;
  private readonly PICK_HEAD: number;
  private readonly LIST_TOP: number;

  constructor(parent: HTMLElement, g: PanelGeom, llama: string) {
    this.g = g;
    const u = (this.u = g.u);
    const { w, h } = g;
    const pad = 24 * u;
    const compact = !!g.compact;
    this.BODY_TOP = (compact ? 66 : 118) * u;
    this.FOOT = 72 * u;
    this.ROW_H = 45 * u;
    this.PICK_HEAD = 36 * u;
    this.LIST_TOP = 103 * u;
    this.root = box({ left: g.x, top: g.y, width: w, height: h, overflow: 'hidden', background: '#FFFFFF', borderRight: '1px solid #E2E6EE', boxShadow: '0 0 60px -10px rgba(20,40,110,0.35)' });

    // Top bar: menu, llama, panel toggle; then the breadcrumb (the real "local mode" pill is left out on purpose).
    const top = box({ left: 0, top: 0, right: 0, height: (compact ? 66 : 77) * u, background: '#fff', zIndex: '6', borderBottom: compact ? '1px solid #E6EAF0' : 'none' });
    const ll = box({ left: (compact ? 24 : 63) * u, top: (compact ? 13 : 18) * u, width: 26 * u, height: 40 * u });
    ll.innerHTML = llama;
    const lsvg = ll.firstElementChild as SVGElement | null;
    if (lsvg) css(lsvg, { width: `${26 * u}px`, height: `${40 * u}px`, display: 'block' });
    top.append(ll);
    let crumb: HTMLElement;
    if (!compact) {
      top.append(...[0, 8.5, 17].map((y) => box({ left: 19 * u, top: 27 * u + y * u, width: 25 * u, height: 2.6 * u, borderRadius: '2px', background: '#4B5563' })));
      top.append(box({ left: 400 * u, top: 28 * u, width: 22 * u, height: 19 * u, borderRadius: `${4 * u}px`, border: `${2 * u}px solid #6B7280` }, box({ left: 6 * u, top: 0, width: 2 * u, height: 15 * u, background: '#6B7280' })));
      crumb = box({ left: 0, top: 77 * u, right: 0, height: 41 * u, borderBottom: '1px solid #E6EAF0', background: '#fff', zIndex: '6', display: 'flex', alignItems: 'center', padding: `0 ${pad}px 0 ${18 * u}px`, gap: `${9 * u}px`, font: `500 ${15 * u}px ${UI}`, color: '#6B7280' },
        el('span', { html: `<svg width="${17 * u}" height="${17 * u}" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`, style: { display: 'flex' } }),
        el('span', { text: 'Pages' }), el('span', { text: '/', style: { opacity: '0.5' } }), el('span', { text: 'home', style: { color: '#111827' } }),
        el('span', { style: { marginLeft: 'auto', width: `${10 * u}px`, height: `${10 * u}px`, borderRadius: '50%', background: '#22C55E', display: 'block' } }));
    } else {
      top.append(box({ left: 70 * u, top: 0, height: 66 * u, display: 'flex', alignItems: 'center', gap: `${10 * u}px`, font: `500 ${16 * u}px ${UI}`, color: '#6B7280' },
        el('span', { text: 'Pages' }), el('span', { text: '/', style: { opacity: '0.5' } }), el('span', { text: 'home', style: { color: '#111827' } })),
        box({ right: pad, top: 28 * u, width: 10 * u, height: 10 * u, borderRadius: '50%', background: '#22C55E' }));
      crumb = box({ display: 'none' });
    }

    // Form view: Sections list.
    const bodyH = h - this.BODY_TOP - this.FOOT;
    this.form = box({ left: 0, top: this.BODY_TOP, right: 0, height: bodyH, overflow: 'hidden' });
    this.form.append(
      el('div', { text: 'Sections', style: { position: 'absolute', left: `${pad}px`, top: `${27 * u}px`, font: `700 ${15.5 * u}px ${UI}`, color: '#374151' } }),
      box({ right: pad, top: 19 * u, width: 29 * u, height: 29 * u, borderRadius: '50%', background: '#D2410D', boxShadow: '0 3px 8px rgba(210,65,13,0.35)', display: 'grid', placeItems: 'center' },
        el('span', { html: `<svg width="${16 * u}" height="${16 * u}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`, style: { display: 'flex' } })),
    );
    const listBox = this.listBox = box({ left: pad, right: pad, top: 57 * u, height: ROW_IDS.length * this.ROW_H + 2, borderRadius: `${6 * u}px`, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(15,23,42,0.08)', overflow: 'hidden' });
    this.form.append(listBox);
    ROW_IDS.forEach((id) => {
      const d = BLOCKS[id];
      const r = box({ left: 0, right: 0, top: 0, height: this.ROW_H, background: '#fff', borderBottom: '1px solid #F0F2F6', display: 'flex', alignItems: 'center', padding: `0 ${14 * u}px 0 ${14 * u}px`, willChange: 'transform' },
        el('span', { html: `<svg width="${12 * u}" height="${20 * u}" viewBox="0 0 14 22" fill="#C2C9D4"><circle cx="4" cy="4" r="2"/><circle cx="10" cy="4" r="2"/><circle cx="4" cy="11" r="2"/><circle cx="10" cy="11" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="10" cy="18" r="2"/></svg>`, style: { display: 'flex', marginRight: `${24 * u}px` } }),
        el('span', { text: d.label, style: { font: `500 ${15.5 * u}px ${UI}`, color: '#1F2937' } }),
        el('span', { html: `<svg width="${20 * u}" height="${20 * u}" viewBox="0 0 24 24" fill="none" stroke="#C2C9D4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="margin-right:${20 * u}px"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg><svg width="${18 * u}" height="${18 * u}" viewBox="0 0 24 24" fill="none" stroke="#E7B4B4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>`, style: { display: 'flex', marginLeft: 'auto', alignItems: 'center' } }),
      );
      this.rows.push({ id, root: r });
      listBox.append(r);
    });

    // Footer: Reset + Save (the next scene starts with a press on Save).
    const foot = box({ left: 0, right: 0, bottom: 0, height: this.FOOT, background: '#fff', borderTop: '1px solid #E6EAF0', zIndex: '6' });
    const bh = 40 * u;
    this.saveBtn = box({ right: pad, top: (this.FOOT - bh) / 2, width: 96 * u, height: bh, borderRadius: `${7 * u}px`, background: GRAD_ORANGE, boxShadow: '0 8px 16px -8px rgba(236,72,21,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', font: `600 ${16 * u}px ${UI}` }, el('span', { text: 'Save' }));
    foot.append(
      box({ right: pad + 96 * u + 10 * u, top: (this.FOOT - bh) / 2, width: 101 * u, height: bh, borderRadius: `${7 * u}px`, border: '1px solid #D7DCE4', background: '#fff', color: '#4B5563', font: `500 ${16 * u}px ${UI}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }, el('span', { text: 'Reset' })),
      this.saveBtn,
    );

    // Picker overlay (covers the form body, like Tina's FormPortal panel).
    this.picker = box({ left: 0, top: this.BODY_TOP, right: 0, height: bodyH, background: '#F9FAFB', overflow: 'hidden', zIndex: '4' });
    const ph = box({ left: 0, top: 0, right: 0, height: this.PICK_HEAD, background: '#fff', borderTop: '1px solid #EEF1F6', borderBottom: '1px solid #EEF1F6', boxShadow: '0 1px 2px rgba(15,23,42,0.06)', zIndex: '3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${pad}px`, font: `500 ${13 * u}px ${UI}`, letterSpacing: '0.05em', color: '#374151', textTransform: 'uppercase' },
      el('span', { text: 'Sections – Add New' }),
      el('span', { html: `<svg width="${19 * u}" height="${19 * u}" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`, style: { display: 'flex', opacity: '0.8' } }));
    const search = box({ left: pad, right: pad, top: this.PICK_HEAD + 15 * u, height: 34 * u, background: '#fff', border: '1px solid #E5E7EB', borderRadius: `${6 * u}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${12 * u}px`, font: `400 ${15 * u}px ${UI}`, color: '#9CA3AF', zIndex: '3', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' },
      el('span', { text: 'Search' }),
      el('span', { html: `<svg width="${19 * u}" height="${19 * u}" viewBox="0 0 24 24" fill="none" stroke="${C.blue}" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>`, style: { display: 'flex', opacity: '0.8' } }));
    this.list = box({ left: pad, right: pad, top: this.LIST_TOP, bottom: 0 });
    const cover = box({ left: 0, top: 0, right: 0, height: this.LIST_TOP - 6 * u, background: '#F9FAFB', zIndex: '2' });
    this.picker.append(this.list, cover, ph, search);
    this.layoutCards();

    this.topBar = top;
    this.crumbEl = crumb;
    this.root.append(this.form, this.picker, top, crumb, foot);
    parent.append(this.root);
  }

  private layoutCards() {
    const { w, cols } = this.g;
    const u = this.u;
    const gap = 16 * u;
    const cw = (w - 48 * u - gap * (cols - 1)) / cols;
    const k = cw / CARD_W;
    const colY = new Array(cols).fill(0);
    for (const id of PICKER_IDS) {
      const d = BLOCKS[id];
      const ph = Math.max(30 * u, d.h * k);
      const lh = 39 * u;
      let c = 0;
      for (let i = 1; i < cols; i++) if (colY[i] < colY[c]) c = i;
      const x = c * (cw + gap), y = colY[c];
      const prev = box({ left: 0, top: 0, right: 0, height: ph, overflow: 'hidden' });
      const be = buildBlock(id);
      css(be, { transformOrigin: '0 0', transform: `scale(${k})` });
      prev.append(be);
      const label = el('div', { text: d.label, style: { font: `700 ${13.5 * u}px ${UI}`, color: '#111827' } });
      const plus = el('span', { html: `<svg width="${20 * u}" height="${20 * u}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`, style: { display: 'flex', color: '#9CA3AF', opacity: '0.7' } });
      const row = box({ left: 0, right: 0, top: ph, height: lh, borderTop: '1px solid #F1F3F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${16 * u}px` }, label, plus);
      const card = box({ left: x, top: y, width: cw, height: ph + lh, borderRadius: `${6 * u}px`, background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(15,23,42,0.10), 0 1px 2px rgba(15,23,42,0.06)', overflow: 'hidden', willChange: 'transform' }, prev, row);
      this.list.append(card);
      this.cards.push({ id, root: card, preview: prev, label, plus, x, y, w: cw, h: ph + lh });
      colY[c] += ph + lh + gap;
    }
  }

  /** Screen rect of the Save button. */
  saveRect(): Rect {
    const { x, y, w, h } = this.g;
    const u = this.u;
    const bh = 40 * u;
    return { x: x + w - 24 * u - 96 * u, y: y + h - this.FOOT + (this.FOOT - bh) / 2, w: 96 * u, h: bh };
  }

  /** Screen rect of a picker card for a given list scroll. */
  cardRect(id: BlockId, scroll: number): Rect {
    const c = this.cards.find((k) => k.id === id)!;
    return { x: this.g.x + 24 * this.u + c.x, y: this.g.y + this.BODY_TOP + this.LIST_TOP + c.y - scroll, w: c.w, h: c.h };
  }
  /** Scroll that puts a card in the middle of the visible list. */
  scrollFor(id: BlockId) {
    const c = this.cards.find((k) => k.id === id)!;
    const visible = this.g.h - this.BODY_TOP - this.FOOT - this.LIST_TOP;
    const max = Math.max(...this.cards.map((k) => k.y + k.h)) - visible + 16 * this.u;
    return clamp(c.y + c.h / 2 - visible / 2, 0, Math.max(0, max));
  }

  update(s: {
    /** 0 off-screen .. 1 resting. */
    slide: number;
    /** Offset in px when slide = 0. */
    from?: [number, number];
    /** 0 form only .. 1 picker fully shown. */
    picker: number;
    /** Per-card entrance 0..1 by picker index. */
    cardIn?: (i: number) => number;
    scroll?: number;
    hover?: BlockId | null;
    hoverP?: number;
    press?: number;
    /** Form rows in order with entrance progress. */
    rows: { id: BlockId; p: number; hi?: number }[];
    alpha?: number;
    /** Portrait sheet: 0 full sheet .. 1 a floating dock with just Reset and Save. */
    dock?: number;
  }) {
    const u = this.u;
    const dk = clamp(s.dock ?? 0);
    const dockH = this.FOOT;
    const dockW = 255 * u;
    const curH = this.g.h + (dockH - this.g.h) * dk;
    css(this.root, { left: this.g.x + (this.g.w - dockW) * dk, width: this.g.w + (dockW - this.g.w) * dk, top: this.g.y + this.g.h - curH, height: curH });
    css(this.root, { borderRadius: `${(20 * u * dk).toFixed(1)}px`, boxShadow: dk > 0 ? '0 30px 60px -20px rgba(20,40,110,0.45), 0 8px 20px -8px rgba(20,40,110,0.25)' : '0 0 60px -10px rgba(20,40,110,0.35)' });
    css(this.form, { opacity: 1 - dk });
    css(this.topBar, { opacity: 1 - dk });
    css(this.crumbEl, { opacity: 1 - dk });
    const from = s.from ?? [-(this.g.x + this.g.w + 120), 0];
    const k = 1 - s.slide;
    css(this.root, { transform: `translate3d(${(from[0] * k).toFixed(1)}px, ${(from[1] * k).toFixed(1)}px, 0)`, opacity: s.alpha ?? 1, visibility: s.slide > 0.002 ? 'visible' : 'hidden' });
    const pk = clamp(s.picker);
    css(this.picker, { opacity: pk, transform: `translateX(${((1 - pk) * -0.4 * this.g.w).toFixed(1)}px)`, visibility: pk > 0.002 ? 'visible' : 'hidden' });
    css(this.list, { transform: `translateY(${(-(s.scroll ?? 0)).toFixed(1)}px)` });
    this.cards.forEach((c, i) => {
      const inn = s.cardIn ? s.cardIn(i) : 1;
      const hv = c.id === s.hover ? clamp(s.hoverP ?? 0) : 0;
      const pr = c.id === s.hover ? (s.press ?? 0) : 0;
      css(c.root, { opacity: clamp(inn * 2), transform: `translateY(${((1 - inn) * 46 * u).toFixed(1)}px) scale(${(1 - pr * 0.022).toFixed(4)})`, background: hv > 0.5 ? '#F9FAFB' : '#fff', borderColor: hv > 0.5 ? '#BBD9FF' : '#E5E7EB' });
      css(c.preview, { opacity: 1 - hv * 0.5 });
      css(c.label, { color: hv > 0.5 ? '#3B82F6' : '#111827' });
      css(c.plus, { color: hv > 0.5 ? '#3B82F6' : '#9CA3AF', opacity: 0.7 + hv * 0.3 });
    });
    // Form rows stack in order; hidden rows leave no gap.
    const order = s.rows.map((r) => r.id);
    css(this.listBox, { height: order.length * this.ROW_H + 2 });
    this.rows.forEach((r) => {
      const idx = order.indexOf(r.id);
      if (idx < 0) { css(r.root, { visibility: 'hidden' }); return; }
      const q = s.rows[idx];
      css(r.root, {
        visibility: 'visible', top: idx * this.ROW_H, opacity: clamp(q.p * 3),
        transform: `translateX(${((1 - q.p) * -30).toFixed(1)}px)`,
        background: (q.hi ?? 0) > 0.01 ? `rgba(255,240,232,${(q.hi ?? 0).toFixed(3)})` : '#fff',
      });
    });
  }
}

export async function makePanel(parent: HTMLElement, g: PanelGeom) {
  return new TinaPanel(parent, g, await logo('llama'));
}
