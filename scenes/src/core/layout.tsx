import React, {createContext, useContext} from 'react';
import {useLayoutBasics} from './layoutBasics';
import {makeType, type TypeScale} from './type';
import {useTheme} from './ThemeContext';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Bands a wrapper takes from the content area. scripts/short.dart reserves the hook line at the top and the
 * captions at the bottom of a 9:16 Short; scenes lay out inside what is left, so nothing sits under a caption.
 * A reserved top band carries the headline (the Short's hook), so the headline zone is empty then and Headline draws nothing.
 */
export interface Reserve {
  top: number;
  bottom: number;
}
const ReserveCtx = createContext<Reserve>({top: 0, bottom: 0});
export const FrameReserve: React.FC<{top?: number; bottom?: number; children: React.ReactNode}> = ({top = 0, bottom = 0, children}) => (
  <ReserveCtx.Provider value={{top, bottom}}>{children}</ReserveCtx.Provider>
);

export interface Layout {
  W: number;
  H: number;
  tall: boolean;
  /** 1 at 1080 px on the short side. Strokes, gaps and badges scale with it. */
  u: number;
  type: TypeScale;
  /** Inside the platform's own UI: 16:9 keeps 5 % clear; 9:16 keeps the top 150 px and bottom 380 px (Shorts title, buttons) clear. */
  safe: Rect;
  /** The safe area minus what a wrapper reserved. Scenes put their content in here. */
  content: Rect;
  /** Where the visual (map, globe, diagram) should fit, once the HUD has its place: 16:9 keeps the left 38 % for the stat and headline plates, 9:16 keeps a band above and one below. */
  main: Rect;
  zones: {
    /** top-left of the counter or stat plate */
    stat: Rect;
    /** the headline plate: 'top' (9:16, full width above the visual) or 'column' (16:9, in the left column under the stat plate) */
    headline: Rect & {at: 'top' | 'column'};
    /** the guide character */
    guide: Rect;
    /** the channel mark slot */
    mark: Rect;
  };
}

export const computeLayout = (W: number, H: number, type: TypeScale, reserve: Reserve): Layout => {
  const tall = H > W;
  const u = Math.min(W, H) / 1080;
  const safe: Rect = tall ? {x: 64 * u, y: 150 * u, w: W - 160 * u, h: H - 530 * u} : {x: 96 * u, y: 60 * u, w: W - 192 * u, h: H - 132 * u};
  const content: Rect = {x: safe.x, y: safe.y + reserve.top, w: safe.w, h: safe.h - reserve.top - reserve.bottom};
  const mark: Rect = tall ? {x: safe.x, y: safe.y - 96 * u, w: 80 * u, h: 80 * u} : {x: safe.x + safe.w - 120 * u, y: safe.y, w: 120 * u, h: 120 * u};
  if (tall) {
    const headH = reserve.top > 0 ? 0 : 400 * u;
    const statH = 290 * u;
    const gsz = 300 * u;
    const stat: Rect = {x: content.x, y: content.y + content.h - statH, w: content.w, h: statH};
    return {
      W, H, tall, u, type, safe, content,
      main: {x: content.x, y: content.y + headH, w: content.w, h: content.h - headH - statH},
      zones: {
        stat,
        headline: {x: content.x, y: content.y, w: content.w, h: headH, at: 'top'},
        guide: {x: content.x + content.w - gsz, y: stat.y - gsz - 10 * u, w: gsz, h: gsz},
        mark,
      },
    };
  }
  const colW = c0w(content.w);
  const statH = 290 * u;
  const gw = 300 * u;
  const gh = 300 * u;
  const main: Rect = {x: content.x + colW + 24 * u, y: content.y, w: content.w - colW - 24 * u, h: content.h};
  return {
    W, H, tall, u, type, safe, content, main,
    zones: {
      stat: {x: content.x, y: content.y, w: colW, h: statH},
      headline: {x: content.x, y: content.y + statH + 36 * u, w: colW, h: content.h - statH - 36 * u, at: 'column'},
      guide: {x: content.x + content.w - gw, y: content.y + content.h - gh, w: gw, h: gh},
      mark,
    },
  };
};

/** The width of the left HUD column in 16:9. */
const c0w = (contentW: number) => contentW * 0.38;

export const useLayout = (): Layout => {
  const {W, H, u, tall} = useLayoutBasics();
  const theme = useTheme();
  const reserve = useContext(ReserveCtx);
  return computeLayout(W, H, makeType(theme, tall, u), reserve);
};
