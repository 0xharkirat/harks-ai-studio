// The page with the bug: a real capture of northwind365.com (SSW's public demo site), taken on 2026-11-15 at
// 1180 x 660 (`assets/demo/northwind365-hero.png`). The title scene shows it faded behind the logo, and the problem
// scene starts on the same card (ghostCard), so the cut shows no pop. One builder, so the two scenes never drift apart.
// The capture is 1 image, so the `parts` are empty boxes: the calm reveal fades the whole card, and the glyph reveal
// (not used by this film) still finds the keys it animates.
import { box, el } from '../../engine/dom';
import { SHADOW } from '../../brand/tokens';
import { img } from '../../engine/assets';

/** The page's own headline, kept for the `pageHeadline` prop. The capture already shows it. */
export const PAGE_HEADLINE = 'Northwind Traders is a sample application built using .NET 9, ASP.NET Core and Entity Framework Core.';
const CAPTURE = '/assets/demo/northwind365-hero.png';
/** Await this in a scene's setup() before it builds the card, so the capture is decoded before the first frame. */
export const loadPageCard = () => img(CAPTURE);

export interface PageCard {
  root: HTMLDivElement;
  parts: { callout: HTMLElement; h1: HTMLElement; p: HTMLElement; btns: HTMLElement; panel: HTMLElement };
  cardW: number;
  cardH: number;
  cardTop: number;
  cardLeft: number;
  /** Glyph landing slots (card coordinates). */
  slots: [number, number][];
}

export function pageCard(parent: HTMLElement, W: number, H: number, portrait: boolean, _headline = PAGE_HEADLINE): PageCard {
  const cardW = portrait ? W * 0.82 : 1180;
  const cardH = portrait ? (cardW * 660) / 1180 : 660;
  // Portrait: centre the card in the safe band (top 14% and bottom 35% stay clear).
  const cardTop = portrait ? (H * 0.14 + H * 0.65) / 2 - cardH / 2 : (H - cardH) / 2;
  const cardLeft = (W - cardW) / 2;
  const card = box({ left: `${cardLeft}px`, top: `${cardTop}px`, width: `${cardW}px`, height: `${cardH}px`, borderRadius: '22px', background: '#fff', boxShadow: SHADOW.xl, border: '1px solid rgba(15,23,42,0.06)', overflow: 'hidden' });
  const shot = el('img', { attrs: { src: CAPTURE, draggable: 'false' }, style: { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', objectFit: 'cover', display: 'block' } as any });
  const empty = () => box({ left: '0', top: '0', width: '0', height: '0' });
  const parts = { callout: empty(), h1: empty(), p: empty(), btns: empty(), panel: empty() };
  card.append(shot, parts.callout, parts.h1, parts.p, parts.btns, parts.panel);
  parent.append(card);

  const sx = (f: number) => cardW * f, sy = (f: number) => cardH * f;
  const slots: [number, number][] = [[sx(0.22), sy(0.4)], [sx(0.3), sy(0.6)], [sx(0.5), sy(0.85)], [sx(0.26), sy(0.85)], [sx(0.4), sy(0.6)], [sx(0.64), sy(0.85)], [sx(0.5), sy(0.72)], [sx(0.3), sy(0.4)], [sx(0.55), sy(0.6)]];
  return { root: card, parts, cardW, cardH, cardTop, cardLeft, slots };
}
