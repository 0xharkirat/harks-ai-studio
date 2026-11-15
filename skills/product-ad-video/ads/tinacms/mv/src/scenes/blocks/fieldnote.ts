// The demo site "Fieldnote" as blocks, cut from the real page plate (plates/out/site-home-full.webp).
// Each block is a CARD_W wide element made of crops of that plate. The plate's named testimonials, metrics and
// prices are NOT shown: those parts are neutral placeholder bars, so no card reads as a claim or a quote. The same builders feed the 3D cards,
// the picker previews and the flat page. The hero headline is re-set to the campaign line, because the plate
// was captured before the edit scene types it.
import { box, el } from '../../engine/dom';
import { image } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C } from '../../brand/tokens';

export const CARD_W = 1000;
/** The real page plate: 1920 wide page at 1.5x. */
export const PAGE_SRC = '/plates/site-home-full.webp';
const PAGE_W = 1920;
const PAGE_H = 5391 / 1.5;

export type BlockId = 'callout' | 'hero' | 'stats' | 'features' | 'testimonial' | 'cta' | 'content' | 'video';

export interface BlockDef {
  id: BlockId;
  /** Label on the card tab and in the sidebar (the real Tina block names). */
  label: string;
  h: number;
  /** Tab icon colour. */
  color: string;
  build(parent: HTMLElement): void;
}

const icon = (path: string, color: string, s = 20) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

/** Small glyphs for tabs and sidebar rows (generic UI icons). */
export const GLYPH: Record<BlockId, string> = {
  callout: '<path d="M4 6h16v9H9l-5 4V6z"/>',
  hero: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 10h6M7 14h4"/>',
  stats: '<path d="M5 20V11M12 20V4M19 20v-7"/>',
  features: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  testimonial: '<path d="M7 8c-2 1-3 3-3 6h4v-4H5.5M17 8c-2 1-3 3-3 6h4v-4h-2.5"/>',
  cta: '<rect x="3" y="7" width="18" height="10" rx="5"/><path d="M9 12h6M13 9.5 15.5 12 13 14.5"/>',
  content: '<path d="M5 6h14M5 11h14M5 16h9"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10.5 9.2v5.6l4.6-2.8z"/>',
};
export const glyph = (id: BlockId, color = '#fff', s = 20) => icon(GLYPH[id], color, s);

/** A crop of the page plate, placed at `top` in a card. Source rect (page px) is scaled by k. */
function piece(parent: HTMLElement, sx: number, sy: number, sw: number, sh: number, k: number, top = 0) {
  const w = box({ left: 0, top, width: sw * k, height: sh * k, overflow: 'hidden' });
  image(w, PAGE_SRC, { width: PAGE_W * k, height: PAGE_H * k, left: -sx * k, top: -sy * k });
  parent.append(w);
  return sh * k;
}

const HERO_BG = '#F1F4FF';

function callout(p: HTMLElement) {
  p.style.background = '#fff';
  piece(p, 560, 80, 800, 82, CARD_W / 800);
}

function hero(p: HTMLElement) {
  p.style.background = HERO_BG;
  const k = CARD_W / 1232;
  const padTop = 30;
  const headH = 76;
  // The campaign line, set like the site's headline (Inter, regular, tight).
  p.append(box({ left: 0, top: padTop, width: CARD_W, height: headH, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 63px/1 ${FONT.ui}`, letterSpacing: '-0.028em', color: '#0A0A0F', whiteSpace: 'nowrap' }, el('span', { text: 'Edit your site. Visually.' })));
  // Tagline, buttons and the top of the product screenshot.
  piece(p, 344, 428, 1232, 262, k, padTop + headH + 4);
}

function features(p: HTMLElement) {
  p.style.background = '#FAFAFA';
  piece(p, 380, 1822, 1160, 414, CARD_W / 1160);
}

function cta(p: HTMLElement) {
  p.style.background = '#fff';
  piece(p, 480, 3112, 960, 214, CARD_W / 960);
}

// ── neutral placeholder parts ────────────────────────────────────────────
const bar = (x: number, y: number, w: number, h: number, bg = '#E3E8F0', r = h / 2) => box({ left: x, top: y, width: w, height: h, borderRadius: `${r}px`, background: bg });

/** Stats: the real title and description crop, then three tiles whose numbers and labels are grey bars. */
function statsBlock(p: HTMLElement, sx: number, sy: number, sw: number, sh: number, tilesH = 126) {
  p.style.background = '#fff';
  const k = CARD_W / sw;
  const top = piece(p, sx, sy, sw, sh, k);
  for (let i = 0; i < 3; i++) {
    const x = 70 + i * 300;
    p.append(bar(x + 60, top + 14, 120, 40, '#D9E0EC', 12), bar(x + 40, top + 72, 160, 12, '#E8ECF3'));
    if (i) p.append(box({ left: x - 30, top: top + 10, width: 1, height: tilesH - 40, background: '#E8ECF3' }));
  }
  return top + tilesH;
}

/** Testimonial: the real title crop, then three quote cards drawn as placeholder bars (no names, no companies). */
function testimonialBlock(p: HTMLElement, sx: number, sy: number, sw: number, sh: number, cardH = 132) {
  p.style.background = '#fff';
  const k = CARD_W / sw;
  const top = piece(p, sx, sy, sw, sh, k);
  const cw = 296, gap = 24, x0 = (CARD_W - (cw * 3 + gap * 2)) / 2;
  for (let i = 0; i < 3; i++) {
    const x = x0 + i * (cw + gap);
    p.append(
      box({ left: x, top: top + 6, width: cw, height: cardH, borderRadius: '14px', background: '#fff', border: '1px solid #E6EBF3', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }),
      bar(x + 20, top + 28, 230, 11, '#DDE3EE'), bar(x + 20, top + 50, 196, 11, '#E8ECF3'), bar(x + 20, top + 72, 150, 11, '#E8ECF3'),
      box({ left: x + 20, top: top + 94, width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(140deg, ${['#FFAB8B', '#85C5FE', '#93E9BE'][i]}, ${['#EC4815', '#0084FF', '#1FA97A'][i]})` }),
      bar(x + 62, top + 100, 84, 10, '#D4DBE8'),
    );
  }
  return top + cardH + 18;
}

/** Video: white card holding a gradient player with a play button (after the real "Video" template preview). */
function videoBlock(p: HTMLElement, h: number) {
  p.style.background = '#fff';
  const pad = 22;
  const player = box({ left: 130, top: pad, width: CARD_W - 260, height: h - pad * 2, borderRadius: '22px', overflow: 'hidden', background: 'linear-gradient(135deg, #7C66D9 0%, #5B6BC9 45%, #2F78C4 100%)', boxShadow: '0 18px 40px -18px rgba(40,50,140,0.55)' });
  player.append(
    box({ left: -60, top: -80, width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(190,170,255,0.9) 0%, rgba(190,170,255,0) 65%)' }),
    box({ right: -40, bottom: -90, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(60,200,255,0.85) 0%, rgba(60,200,255,0) 65%)' }),
    box({ left: '50%', top: '50%', width: 104, height: 104, marginLeft: '-52px', marginTop: '-52px', borderRadius: '50%', background: 'rgba(240,242,255,0.96)', boxShadow: '0 10px 30px rgba(20,20,90,0.35)', display: 'grid', placeItems: 'center' },
      el('span', { html: '<svg width="40" height="42" viewBox="0 0 40 42" fill="#5B45E6"><path d="M8 4v34l30-17z"/></svg>', style: { display: 'flex', marginLeft: '6px' } })),
  );
  p.append(player);
}

/** Content: a text block (picker preview only; the page does not use it). */
function contentBlock(p: HTMLElement) {
  p.style.background = '#fff';
  p.append(
    box({ left: 50, top: 34, font: `800 52px/1 ${FONT.ui}`, letterSpacing: '-0.03em', color: '#111827', whiteSpace: 'nowrap' }, el('span', { text: 'About Fieldnote' })),
    box({ left: 50, top: 118, width: 900, font: `400 23px/1.5 ${FONT.ui}`, color: '#374151' }, el('span', { html: 'Fieldnote is a small team on a simple mission: <b style="color:#111827">make it easy to write things down and find them again.</b>' })),
    box({ left: 50, top: 214, font: `700 31px/1 ${FONT.ui}`, color: '#111827' }, el('span', { text: 'What we believe' })),
    bar(50, 270, 640, 13, '#E3E8F0'), bar(50, 300, 520, 13, '#E8ECF3'),
  );
}

// Landscape block set (taller crops, full detail).
const hLand = { hero: 30 + 76 + 4 + Math.round(262 * (CARD_W / 1232)), callout: Math.round(82 * (CARD_W / 800)), features: Math.round(414 * (CARD_W / 1160)), cta: Math.round(214 * (CARD_W / 960)) };
const LAND: Record<BlockId, BlockDef> = {
  callout: { id: 'callout', label: 'Callout', h: hLand.callout, color: '#F08A24', build: callout },
  hero: { id: 'hero', label: 'Hero', h: hLand.hero, color: C.orange, build: hero },
  stats: { id: 'stats', label: 'Stats', h: 258, color: '#6B4DFF', build: (p) => { statsBlock(p, 440, 1392, 1040, 128, 112); } },
  features: { id: 'features', label: 'Features', h: hLand.features, color: C.blue, build: features },
  testimonial: { id: 'testimonial', label: 'Testimonial', h: 262, color: '#1FA97A', build: (p) => { testimonialBlock(p, 342, 2434, 1236, 112, 132); } },
  cta: { id: 'cta', label: 'CTA', h: hLand.cta, color: C.navy2, build: cta },
  content: { id: 'content', label: 'Content', h: 336, color: '#64748B', build: contentBlock },
  video: { id: 'video', label: 'Video', h: 300, color: '#7C3AED', build: (p) => videoBlock(p, 300) },
};

// ── portrait: tighter, bigger crops (headline-level content) so the stack reads on a phone ──
const P_HERO = { pad: 26, head: 84, gap: 4, srcH: 172 };
const pCallout = (p: HTMLElement) => { p.style.background = '#fff'; piece(p, 610, 80, 700, 82, CARD_W / 700); };
function pHero(p: HTMLElement) {
  p.style.background = HERO_BG;
  const k = CARD_W / 960;
  p.append(box({ left: 0, top: P_HERO.pad, width: CARD_W, height: P_HERO.head, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `400 68px/1 ${FONT.ui}`, letterSpacing: '-0.028em', color: '#0A0A0F', whiteSpace: 'nowrap' }, el('span', { text: 'Edit your site. Visually.' })));
  piece(p, 480, 428, 960, P_HERO.srcH, k, P_HERO.pad + P_HERO.head + P_HERO.gap);
}
const pFeatures = (p: HTMLElement) => { p.style.background = '#FAFAFA'; piece(p, 470, 1832, 980, 300, CARD_W / 980); };
const pCta = (p: HTMLElement) => { p.style.background = '#fff'; piece(p, 560, 3112, 800, 214, CARD_W / 800); };
const PORT: Record<BlockId, BlockDef> = {
  callout: { id: 'callout', label: 'Callout', h: Math.round(82 * (CARD_W / 700)), color: '#F08A24', build: pCallout },
  hero: { id: 'hero', label: 'Hero', h: P_HERO.pad + P_HERO.head + P_HERO.gap + Math.round(P_HERO.srcH * (CARD_W / 960)), color: C.orange, build: pHero },
  stats: { id: 'stats', label: 'Stats', h: 240, color: '#6B4DFF', build: (p) => { statsBlock(p, 520, 1400, 880, 112, 100); } },
  features: { id: 'features', label: 'Features', h: Math.round(300 * (CARD_W / 980)), color: C.blue, build: pFeatures },
  testimonial: { id: 'testimonial', label: 'Testimonial', h: 244, color: '#1FA97A', build: (p) => { testimonialBlock(p, 500, 2434, 920, 110, 120); } },
  cta: { id: 'cta', label: 'CTA', h: Math.round(214 * (CARD_W / 800)), color: C.navy2, build: pCta },
  content: LAND.content,
  video: { id: 'video', label: 'Video', h: 320, color: '#7C3AED', build: (p) => videoBlock(p, 320) },
};

/** The block definitions in use. `setMode` swaps them in place, so every module sees the active set. */
export const BLOCKS: Record<BlockId, BlockDef> = { ...LAND };
export function setMode(portrait: boolean) {
  Object.assign(BLOCKS, portrait ? PORT : LAND);
}

/** Build a block into its own CARD_W x h element (the card interior). */
export function buildBlock(id: BlockId, parent?: HTMLElement) {
  const d = BLOCKS[id];
  const e = box({ left: 0, top: 0, width: CARD_W, height: d.h, overflow: 'hidden' });
  d.build(e);
  parent?.append(e);
  return e;
}
