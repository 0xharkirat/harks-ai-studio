// Generated page cards for the wall: small browser windows showing invented sites (no real customers, no
// third-party logos). Each design is built once into a PW x PH element.
import { box, el } from '../../engine/dom';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE } from '../../brand/tokens';
import { image } from '../../ui/kit';

export const PW = 560;
export const PH = 372;
const BAR = 34;

interface Theme { a: string; a2: string; tint: string; dark: string }
const T: Record<string, Theme> = {
  orange: { a: C.orange, a2: C.orange400, tint: '#FFF1EA', dark: '#7A230B' },
  blue: { a: C.blue, a2: C.sky3, tint: '#E6F2FF', dark: '#1D2C6C' },
  mint: { a: '#1FA97A', a2: C.mint, tint: '#E5F8F0', dark: '#214C3D' },
  navy: { a: '#6B4DFF', a2: '#A28BFF', tint: '#EFEBFF', dark: C.navy },
  rose: { a: '#E8456B', a2: '#FF8FA8', tint: '#FFECF0', dark: '#6A1530' },
};

const H = FONT.head;
const U = FONT.ui;
const t = (text: string, x: number, y: number, size: number, o: { w?: number; c?: string; font?: string; weight?: number; lh?: number; w2?: number; ls?: number; align?: string } = {}) =>
  box({ left: x, top: y, font: `${o.weight ?? 600} ${size}px/${o.lh ?? 1.1} ${o.font ?? H}`, color: o.c ?? C.text, letterSpacing: `${o.ls ?? -0.03}em`, whiteSpace: 'pre', width: o.w2 ? `${o.w2}px` : '', textAlign: o.align ?? 'left' } as any, el('span', { text }));
const r = (x: number, y: number, w: number, h: number, bg: string, rad = 8, extra: Record<string, string | number> = {}) => box({ left: x, top: y, width: w, height: h, background: bg, borderRadius: `${rad}px`, ...extra });
const line = (x: number, y: number, w: number, c = '#E2E8F0') => r(x, y, w, 8, c, 4);
const pill = (x: number, y: number, w: number, h: number, text: string, bg: string, fg = '#fff', size = 15) =>
  box({ left: x, top: y, width: w, height: h, borderRadius: `${h / 2.6}px`, background: bg, color: fg, font: `600 ${size}px ${H}`, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.01em' }, el('span', { text }));
const nav = (name: string, th: Theme, dark = false) =>
  box({ left: 0, top: 0, width: PW, height: 54, display: 'flex', alignItems: 'center', padding: '0 26px', gap: '10px' },
    box({ position: 'relative', width: 22, height: 22, borderRadius: '7px', background: th.a }),
    el('span', { text: name, style: { font: `700 19px ${H}`, letterSpacing: '-0.02em', color: dark ? '#fff' : C.text } }),
    box({ position: 'relative', marginLeft: 'auto', display: 'flex', gap: '20px', font: `500 13px ${U}`, color: dark ? 'rgba(255,255,255,0.7)' : C.text2 }, el('span', { text: 'Product' }), el('span', { text: 'Pricing' }), el('span', { text: 'Journal' })));

type Build = (p: HTMLElement) => void;
export interface Design { url: string; name: string; build?: Build; /** A real plate (webp) shown instead of a generated page. */ plate?: string; /** Cover the editor's "local mode" pill on this plate. */ mask?: boolean }

const landing = (th: Theme, name: string, head: string, sub: string): Build => (p) => {
  p.style.background = `linear-gradient(120deg, #fff 50%, ${th.tint} 100%)`;
  p.append(nav(name, th),
    t(head, 28, 82, 42, { lh: 1.02 }),
    t(sub, 30, 190, 15, { weight: 400, font: U, c: C.text2, ls: 0, lh: 1.4 }),
    pill(28, 242, 120, 40, 'Start free', th.a, '#fff', 15),
    pill(160, 242, 110, 40, 'Learn more', '#fff', C.text, 15),
    r(330, 78, 206, 200, `linear-gradient(140deg, ${th.a2}, ${th.a})`, 18),
    r(350, 100, 130, 90, '#fff', 12, { boxShadow: '0 10px 24px -10px rgba(20,40,110,.4)' }),
    r(364, 114, 70, 8, '#E2E8F0', 4), r(364, 132, 98, 8, '#E2E8F0', 4), r(364, 160, 52, 14, th.a, 5),
    r(448, 176, 70, 70, 'rgba(255,255,255,0.28)', 35),
    r(28, 304, 120, 40, '#fff', 10, { border: `1px solid ${C.line}` }), r(40, 317, 70, 9, '#CBD5E1', 4), r(40, 331, 44, 7, '#E2E8F0', 4),
    r(160, 304, 120, 40, '#fff', 10, { border: `1px solid ${C.line}` }), r(172, 317, 62, 9, '#CBD5E1', 4), r(172, 331, 50, 7, '#E2E8F0', 4));
};

const blog = (th: Theme): Build => (p) => {
  p.style.background = '#FBFCFE';
  p.append(nav('Larkspur', th),
    t('The Larkspur Journal', 28, 70, 32),
    t('Notes on calm work.', 30, 112, 15, { weight: 400, font: U, c: C.text2, ls: 0 }));
  [0, 1, 2].forEach((i) => {
    const x = 28 + i * 172;
    p.append(r(x, 150, 160, 190, '#fff', 14, { border: '1px solid #E8EDF4' }),
      r(x + 10, 160, 140, 84, `linear-gradient(${120 + i * 40}deg, ${[th.a2, C.mint, C.sky3][i]}, ${[th.a, C.sky2, '#6B4DFF'][i]})`, 9),
      line(x + 12, 258, 118, '#CBD5E1'), line(x + 12, 276, 84), r(x + 12, 306, 52, 18, th.tint, 9),
      t(['Product', 'Team', 'Offline'][i], x + 20, 308, 11, { weight: 600, font: U, c: th.a, ls: 0 }));
  });
};

const overview = (th: Theme): Build => (p) => {
  p.style.background = `linear-gradient(180deg, ${th.tint} 0%, #fff 70%)`;
  p.append(nav('Fieldnote', th), t('Everything in one place', 100, 64, 30, { w2: 360, align: 'center' }));
  ['M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01', 'M4 4h16v12H8l-4 4V4z', 'M12 3v12M7 10l5 5 5-5M4 20h16'].forEach((g, i) => {
    const x = 28 + i * 176, hi = i === 1;
    p.append(r(x, hi ? 130 : 144, 164, hi ? 206 : 190, hi ? `linear-gradient(160deg, ${th.a2}, ${th.a})` : '#fff', 16, { border: hi ? 'none' : '1px solid #E5EAF2', boxShadow: hi ? '0 18px 34px -14px rgba(20,40,110,.5)' : 'none' }),
      r(x + 18, (hi ? 130 : 144) + 20, 46, 46, hi ? 'rgba(255,255,255,0.28)' : th.tint, 14),
      box({ left: x + 30, top: (hi ? 130 : 144) + 32 }, el('span', { html: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${hi ? '#fff' : th.a}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${g}"/></svg>`, style: { display: 'flex' } })),
      line(x + 18, (hi ? 130 : 144) + 88, 118, hi ? 'rgba(255,255,255,.75)' : '#CBD5E1'), line(x + 18, (hi ? 130 : 144) + 108, 96, hi ? 'rgba(255,255,255,.55)' : '#E2E8F0'), line(x + 18, (hi ? 130 : 144) + 126, 72, hi ? 'rgba(255,255,255,.55)' : '#E2E8F0'),
      r(x + 18, (hi ? 130 : 144) + (hi ? 156 : 142), 70, 12, hi ? '#fff' : th.a, 6));
  });
};

const docs = (th: Theme): Build => (p) => {
  p.style.background = '#fff';
  p.append(r(0, 0, 150, PH - BAR, '#F6F8FB', 0, { borderRight: '1px solid #E8EDF4' }),
    t('Docs', 20, 18, 18), ...['Getting started', 'Install', 'Blocks', 'Media', 'Deploy'].map((s, i) => t(s, 20, 62 + i * 34, 14, { weight: i === 0 ? 700 : 500, font: U, ls: 0, c: i === 0 ? th.a : C.text2 })),
    t('Getting started', 180, 24, 34), line(180, 76, 330), line(180, 96, 290),
    r(180, 130, 354, 150, C.ink, 12), ...[0, 1, 2, 3, 4].map((i) => r(198, 148 + i * 24, [180, 120, 220, 90, 150][i], 9, [th.a2, '#8C87B4', '#93E9BE', '#85C5FE', '#C9A7FF'][i], 4)),
    pill(180, 292, 110, 28, 'Copy', th.a, '#fff', 12));
};

const shop = (th: Theme): Build => (p) => {
  p.style.background = '#fff';
  p.append(nav('Harbor', th), t('New arrivals', 28, 66, 28));
  [0, 1, 2].forEach((i) => {
    const x = 28 + i * 172;
    p.append(r(x, 116, 160, 156, [th.tint, '#EAF4FF', '#E8F8F1'][i], 16),
      r(x + 38, 140, 84, 84, `linear-gradient(140deg, ${[th.a2, C.sky3, C.mint][i]}, ${[th.a, C.blue, '#1FA97A'][i]})`, i === 1 ? 42 : 18),
      t(['Dune lamp', 'Tide mug', 'Pine stool'][i], x + 4, 284, 15, { weight: 600, font: U, ls: 0 }), line(x + 4, 312, 44, '#CBD5E1'));
  });
};

const team = (th: Theme): Build => (p) => {
  p.style.background = `linear-gradient(160deg, #fff 40%, ${th.tint})`;
  p.append(nav('Larkspur', th), t('Small team.\nBig habits.', 28, 78, 46, { lh: 1.02 }));
  [0, 1, 2, 3].forEach((i) => {
    const x = 28 + i * 130;
    p.append(r(x, 232, 112, 112, '#fff', 18, { border: '1px solid #E8EDF4' }),
      r(x + 26, 244, 60, 60, `linear-gradient(140deg, ${[th.a2, C.sky3, C.mint, C.orange300][i]}, ${[th.a, C.blue, '#1FA97A', C.orange][i]})`, 30),
      line(x + 22, 318, 68, '#CBD5E1'));
  });
};

const dash = (th: Theme): Build => (p) => {
  p.style.background = '#F6F8FB';
  p.append(r(0, 0, 70, PH - BAR, C.navy, 0), r(20, 22, 30, 30, th.a, 9), ...[0, 1, 2, 3].map((i) => r(24, 84 + i * 38, 22, 22, 'rgba(255,255,255,.25)', 7)),
    t('Overview', 96, 22, 24),
    ...[0, 1, 2].map((i) => r(96 + i * 150, 70, 138, 70, '#fff', 12, { border: '1px solid #E8EDF4' })),
    ...[0, 1, 2].map((i) => r(108 + i * 150, 86, 62 + i * 10, 20, '#CBD5E1', 6)),
    ...[0, 1, 2].map((i) => line(108 + i * 150, 120, 60)),
    r(96, 156, 438, 168, '#fff', 12, { border: '1px solid #E8EDF4' }),
    ...[40, 70, 55, 96, 80, 124, 104, 140].map((h, i) => r(122 + i * 50, 304 - h, 28, h, i === 7 ? th.a : th.tint, 6)));
};

const gallery = (th: Theme): Build => (p) => {
  p.style.background = '#FBFAF7';
  p.append(nav('Dunes', th), t('Field notes', 28, 64, 28));
  const cols = [[th.a2, th.a], [C.sky3, C.blue], [C.mint, '#1FA97A'], ['#FFC9A8', C.orange], ['#C9B8FF', '#6B4DFF'], [C.sky1, C.sky3]];
  const boxes: [number, number, number, number][] = [[28, 108, 160, 130], [198, 108, 160, 76], [368, 108, 164, 130], [198, 194, 160, 144], [28, 248, 160, 90], [368, 248, 164, 90]];
  boxes.forEach(([x, y, w, h], i) => p.append(r(x, y, w, h, `linear-gradient(${130 + i * 25}deg, ${cols[i][0]}, ${cols[i][1]})`, 14)));
};

const launch = (th: Theme): Build => (p) => {
  p.style.background = `linear-gradient(140deg, ${th.dark} 0%, ${C.navy2} 100%)`;
  p.append(r(300, -80, 300, 300, `radial-gradient(circle, ${th.a} 0%, transparent 65%)`, 150, { opacity: '0.7' }), nav('Release', th, true),
    t('Fieldnote 3.0', 28, 92, 52, { c: '#fff' }), t('Shared spaces. Offline mode.', 30, 162, 17, { c: 'rgba(255,255,255,.75)', font: U, weight: 400, ls: 0 }),
    pill(28, 214, 150, 44, 'Read the notes', th.a, '#fff', 16),
    ...['Jun 12', 'Jun 19', 'Jun 26'].map((d, i) => r(28 + i * 170, 290, 158, 44, 'rgba(255,255,255,.08)', 12, { border: '1px solid rgba(255,255,255,.14)' })),
    ...['Jun 12', 'Jun 19', 'Jun 26'].map((d, i) => t(d, 44 + i * 170, 302, 15, { c: '#fff', font: U, weight: 600, ls: 0 })));
};

const changelog = (th: Theme): Build => (p) => {
  p.style.background = '#fff';
  p.append(nav('Fieldnote', th), t('What is new', 28, 66, 30), r(34, 120, 3, 210, '#E2E8F0', 2));
  [0, 1, 2].forEach((i) => p.append(r(26, 124 + i * 72, 18, 18, i === 0 ? th.a : '#fff', 9, { border: `3px solid ${th.a}` }),
    t(['3.0  Shared spaces', '2.9  Search that gets you', '2.8  Faster sync'][i], 64, 120 + i * 72, 18, { font: H }), line(64, 152 + i * 72, 300), line(64, 168 + i * 72, 220)));
};

export const DESIGNS: Design[] = [
  { name: 'Fieldnote', url: 'fieldnote.app', build: landing(T.orange, 'Fieldnote', 'Notes your team\nactually reads.', 'One calm, searchable home\nfor everything you know.') },
  { name: 'Journal', url: 'larkspur.studio/journal', build: blog(T.blue) },
  { name: 'Features', url: 'fieldnote.app/features', build: overview(T.orange) },
  { name: 'Docs', url: 'docs.fieldnote.app', build: docs(T.blue) },
  { name: 'Shop', url: 'harbor.example/shop', build: shop(T.mint) },
  { name: 'Landing', url: 'larkspur.studio', build: landing(T.navy, 'Larkspur', 'Design for\nslow weekends.', 'A small studio making calm things for busy people.') },
  { name: 'Team', url: 'larkspur.studio/about', build: team(T.rose) },
  { name: 'Dashboard', url: 'app.fieldnote.app', build: dash(T.orange) },
  { name: 'Gallery', url: 'dunes.example/notes', build: gallery(T.orange) },
  { name: 'Launch', url: 'fieldnote.app/3-0', build: launch(T.navy) },
  { name: 'Changelog', url: 'fieldnote.app/changelog', build: changelog(T.mint) },
  { name: 'Landing', url: 'harbor.example', build: landing(T.mint, 'Harbor', 'Furniture that\nlasts a lifetime.', 'Handmade pieces, shipped flat, built to keep.') },
];

/** Real captures of the Fieldnote demo site and the Tina editor (plates/out). */
export const PLATES: Design[] = [
  { name: 'Fieldnote', url: 'fieldnote.app', plate: '/plates/site-home.webp' },
  { name: 'Editor', url: 'fieldnote.app/admin', plate: '/plates/admin-home.webp', mask: true },
  { name: 'Hero', url: 'fieldnote.app/admin', plate: '/plates/admin-hero-form.webp', mask: true },
  { name: 'Media', url: 'fieldnote.app/admin', plate: '/plates/admin-media-manager.webp' },
  { name: 'Image', url: 'fieldnote.app/admin', plate: '/plates/admin-image-after.webp', mask: true },
  { name: 'Saved', url: 'fieldnote.app/admin', plate: '/plates/admin-saved.webp', mask: true },
];

/** One page card face (browser chrome + page), PW x PH. */
export function pageFace(d: Design) {
  const face = box({ left: 0, top: 0, width: PW, height: PH, overflow: 'hidden', borderRadius: '22px', background: '#fff', border: '1px solid rgba(15,23,42,0.12)' });
  const bar = box({ left: 0, top: 0, right: 0, height: BAR, background: '#F1F5F9', borderBottom: '1px solid rgba(15,23,42,0.08)' });
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => bar.append(box({ left: 16 + i * 17, top: BAR / 2 - 5, width: 10, height: 10, borderRadius: '50%', background: c })));
  bar.append(box({ left: '50%', top: 7, width: 250, height: 20, marginLeft: '-125px', borderRadius: '6px', background: '#fff', border: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 11.5px ${U}`, color: C.text2 }, el('span', { text: d.url })));
  const page = box({ left: 0, top: BAR, width: PW, height: PH - BAR, overflow: 'hidden' });
  if (d.plate) {
    // The plate is laid out as a 1920 x 1080 viewport and scaled to cover the card; masks use plate coordinates.
    const k = Math.max(PW / 1920, (PH - BAR) / 1080);
    const view = box({ left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${k})` });
    image(view, d.plate, { width: 1920, height: 1080 });
    // The editor's "You are in local mode" pill contradicts the commit story: cover it with the sidebar's own white.
    if (d.mask) view.append(box({ left: 94, top: 5, width: 202, height: 60, background: '#fff' }));
    page.append(view);
  } else d.build?.(page);
  face.append(bar, page);
  return face;
}

export { GRAD_ORANGE };
