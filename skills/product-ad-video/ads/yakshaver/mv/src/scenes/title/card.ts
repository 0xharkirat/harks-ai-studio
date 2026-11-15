// The rendered page that the Markdown glyphs snap into (title scene) and that stays behind, faded, at the start of
// the problem scene. It is the made-up "Tidewell" travel site (the demo site where the bug lives): logo, Home / About / Blog, the
// "New: Tidewell" callout, a plain light headline, the tagline, "Book a trip" and "See all deals", and the
// product screenshot below. One builder, so the two scenes can never drift apart.
import { box, el } from '../../engine/dom';
import { FONT } from '../../brand/fonts';
import { SHADOW } from '../../brand/tokens';

export const PAGE_HEADLINE = 'Find your next coastal escape.';
const TAGLINE = 'Tidewell plans every stop, every stay and every ferry, so your trip just flows.';
const LAVENDER = '#EFF3FF';

export interface PageCard {
  root: HTMLDivElement;
  parts: { callout: HTMLElement; h1: HTMLElement; p: HTMLElement; btns: HTMLElement; panel: HTMLElement };
  cardW: number;
  cardH: number;
  cardTop: number;
  cardLeft: number;
  /** Where each glyph of `#`, `**`, `---`, `- `, `>`, `![]()`, `[]()`, `##`, `*` lands (card coordinates). */
  slots: [number, number][];
}

export function pageCard(parent: HTMLElement, W: number, H: number, portrait: boolean, headline = PAGE_HEADLINE): PageCard {
  const cardW = portrait ? W * 0.82 : 1180;
  const cardH = portrait ? H * 0.42 : 660;
  // Portrait: centre the card in the safe band (top 14% and bottom 35% stay clear).
  const cardTop = portrait ? (H * 0.14 + H * 0.65) / 2 - cardH / 2 : (H - cardH) / 2;
  const cardLeft = (W - cardW) / 2;
  const card = box({ left: `${cardLeft}px`, top: `${cardTop}px`, width: `${cardW}px`, height: `${cardH}px`, borderRadius: '22px', background: '#fff', boxShadow: SHADOW.xl, border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' });

  // Nav: the real page has a purple icon, "Tidewell" and Home / About / Blog.
  const nav = box({ left: '0', top: '0', right: '0', height: '64px', borderBottom: '1px solid #EEF2F6', display: 'flex', alignItems: 'center', padding: '0 40px', gap: '28px', font: `500 17px ${FONT.ui}`, color: '#6B7280' });
  nav.innerHTML = `<span style="display:flex;align-items:center;gap:10px;color:#0F172A;font:500 19px ${FONT.ui}"><span style="width:24px;height:24px;border-radius:6px;border:3px solid #C084FC;box-sizing:border-box;position:relative;display:inline-block"><span style="position:absolute;left:3px;right:3px;top:5px;height:3px;background:#C084FC;border-radius:2px"></span></span>Tidewell</span><span style="margin-left:auto">Home</span><span>About</span><span>Blog</span>`;

  // The lavender hero section below the callout strip.
  const heroTop = 136;
  const hero = box({ left: '0', top: `${heroTop}px`, right: '0', bottom: '0', background: LAVENDER });

  // Callout pill (white strip).
  const callout = el('div', {
    style: { display: 'flex', alignItems: 'center', gap: '12px', height: '36px', padding: '0 8px 0 18px', borderRadius: '18px', border: '1px solid #E2E8F0', background: '#fff', font: `500 ${portrait ? 13 : 14}px ${FONT.ui}`, color: '#0F172A', whiteSpace: 'nowrap' },
    html: `<span>New: Tidewell now books ferries and day trips</span><span style="width:26px;height:26px;border-radius:50%;background:#F3F4F6;display:grid;place-items:center;font-size:13px">→</span>`,
  });
  const calloutRow = box({ left: '0', top: '64px', width: `${cardW}px`, height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center' }, callout);

  // Headline, tagline and buttons flow in a centred column, so a one-line or a two-line headline both sit right.
  const col = box({ left: '0', top: `${heroTop + 22}px`, width: `${cardW}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: portrait ? '20px' : '18px', textAlign: 'center' });
  const h1 = el('div', { text: headline, style: { font: `400 ${portrait ? 50 : 60}px/1.1 ${FONT.ui}`, letterSpacing: '-0.02em', color: '#09090B', textWrap: 'balance', maxWidth: `${cardW * (portrait ? 0.84 : 0.8)}px` } });
  const p = el('div', { text: TAGLINE, style: { font: `400 ${portrait ? 20 : 22}px/1.45 ${FONT.ui}`, color: '#1F2937', textWrap: 'balance', maxWidth: `${portrait ? 560 : 640}px` } });
  const btns = el('div', { style: { display: 'flex', gap: '14px', marginTop: '6px' } });
  btns.append(
    el('div', { text: 'Book a trip', style: { height: '46px', padding: '0 30px', borderRadius: '13px', background: '#111113', color: '#fff', font: `600 ${portrait ? 16 : 17}px ${FONT.ui}`, display: 'flex', alignItems: 'center' } }),
    el('div', { text: 'See all deals', style: { height: '46px', padding: '0 28px', borderRadius: '13px', background: '#DDE1E8', color: '#0F172A', font: `500 ${portrait ? 16 : 17}px ${FONT.ui}`, display: 'flex', alignItems: 'center' } }),
  );
  col.append(h1, p, btns);

  // Product screenshot, cut off by the card's bottom edge.
  const panelH = portrait ? 330 : 190;
  const panelW = cardW * (portrait ? 0.9 : 0.82);
  const panel = box({ left: `${(cardW - panelW) / 2}px`, top: `${cardH - panelH}px`, width: `${panelW}px`, height: `${panelH}px`, borderRadius: '16px 16px 0 0', background: '#fff', border: '1px solid #E2E8F0', borderBottom: 'none', boxShadow: '0 -14px 40px -22px rgba(20,40,110,0.28)', overflow: 'hidden', display: 'flex', font: `400 13px ${FONT.ui}`, color: '#334155' });
  const sidebar = `<div style="width:${portrait ? 30 : 26}%;background:#F7F8FC;padding:18px 16px;box-sizing:border-box"><div style="display:flex;align-items:center;gap:8px;font-weight:600;color:#0F172A"><span style="width:22px;height:22px;border-radius:6px;background:#7C5CF0;color:#fff;display:grid;place-items:center;font-size:12px">T</span>Tidewell</div><div style="margin:14px 0 10px;height:30px;border-radius:8px;border:1px solid #E2E8F0;background:#fff;color:#94A3B8;display:flex;align-items:center;padding:0 10px">Search trips</div><div style="height:30px;border-radius:8px;background:#E7E9FB;color:#4338CA;font-weight:600;display:flex;align-items:center;padding:0 10px">Home</div><div style="height:30px;display:flex;align-items:center;padding:0 10px;color:#64748B">Inbox</div></div>`;
  const middle = portrait ? '' : `<div style="width:30%;border-right:1px solid #EEF2F6;padding:18px 18px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center;font-weight:700;color:#0F172A;font-size:16px">Trips<span style="font-size:11px;font-weight:600;color:#4F46E5;background:#EEF0FF;border-radius:6px;padding:3px 8px">+ New trip</span></div><div style="margin-top:14px;padding:10px 12px;border-left:3px solid #4F46E5;background:#F5F6FF;border-radius:4px"><div style="font-weight:600;color:#0F172A">Summer coast deals</div><div style="margin-top:6px;height:7px;width:90%;background:#E2E8F0;border-radius:4px"></div><div style="margin-top:6px;height:7px;width:62%;background:#E2E8F0;border-radius:4px"></div></div></div>`;
  const doc = `<div style="flex:1;padding:18px ${portrait ? 22 : 30}px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#94A3B8">Trips / Summer<span style="display:flex;gap:6px"><i style="width:14px;height:14px;border-radius:50%;background:#F472B6"></i><i style="width:14px;height:14px;border-radius:50%;background:#34D399"></i><i style="width:14px;height:14px;border-radius:50%;background:#FBBF24"></i></span></div><div style="margin-top:10px;font:700 ${portrait ? 30 : 32}px ${FONT.ui};letter-spacing:-0.02em;color:#0F172A">Summer coast deals</div><div style="margin-top:8px;font-size:12px;color:#94A3B8">Updated today · 12 trips</div><div style="margin-top:14px;height:8px;width:94%;background:#E2E8F0;border-radius:4px"></div><div style="margin-top:8px;height:8px;width:80%;background:#E2E8F0;border-radius:4px"></div><div style="margin-top:8px;height:8px;width:88%;background:#E2E8F0;border-radius:4px"></div></div>`;
  panel.innerHTML = sidebar + middle + doc;

  card.append(hero, nav, calloutRow, col, panel);
  parent.append(card);

  // Glyph landing slots: around the heading, the tagline, the buttons and the screenshot.
  const sx = (f: number) => cardW * f;
  const hy = portrait ? 230 : 210, ty = portrait ? 380 : 340, by = portrait ? 470 : 410, py = cardH - panelH * 0.55;
  const slots: [number, number][] = [[sx(0.22), hy], [sx(0.3), ty], [sx(0.5), py], [sx(0.26), py], [sx(0.4), ty], [sx(0.64), py], [sx(0.5), by], [sx(0.3), hy], [sx(0.55), ty]];

  return { root: card, parts: { callout, h1, p, btns, panel }, cardW, cardH, cardTop, cardLeft, slots };
}

