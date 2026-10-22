import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Plate, LeaderLine, plateSize, type PlateLine} from '../core/ui';
import {useLayout, type Layout, type Rect} from '../core/layout';
import {useTheme} from '../core/ThemeContext';
import type {Theme} from '../core/theme';
import type {Pt} from '../core/ink';

export type Dir = 'ne' | 'nw' | 'se' | 'sw' | 'n' | 's';

export interface Placed {
  /** where the plate sits and which corner of it is on that point */
  x: number;
  y: number;
  anchor: 'tl' | 'tr' | 'bl' | 'br';
  /** the leader line, from the thing to the plate corner */
  from: Pt;
  to: Pt;
  rect: Rect;
  dir: Dir;
  /** true when even the best place overlaps an avoid rect or leaves the bounds */
  hidden: boolean;
}

const overlapArea = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
const overflow = (r: Rect, bounds: Rect) => Math.max(0, bounds.x - r.x) + Math.max(0, r.x + r.w - (bounds.x + bounds.w)) + Math.max(0, bounds.y - r.y) + Math.max(0, r.y + r.h - (bounds.y + bounds.h));

/**
 * Choose where a label goes relative to the thing it names: a diagonal direction and a distance, kept inside `bounds`
 * and clear of the rects in `avoid`. It tries each direction at 3 distances and takes the best score: overflow beyond
 * the bounds counts most, then overlap with an avoid rect, then a longer leader line. `hidden` in the result is true
 * when even the best place still overlaps an avoid rect, so a caller can leave the label out.
 */
export const placeLabel = (
  L: Layout,
  theme: Theme,
  at: Pt,
  lines: PlateLine[],
  opts: {dir?: Dir; dist?: number; bounds?: Rect; avoid?: Rect[]; pad?: {x: number; y: number}} = {},
): Placed => {
  const pad = opts.pad ?? {x: 34 * L.u, y: 22 * L.u};
  const {w, h} = plateSize(L, theme, lines, pad);
  const base = opts.dist ?? 90 * L.u;
  const bounds = opts.bounds ?? {x: 24 * L.u, y: 24 * L.u, w: L.W - 48 * L.u, h: L.H - 48 * L.u};
  const order: Dir[] = [opts.dir ?? 'ne', 'ne', 'nw', 'n', 'se', 'sw', 's'].filter((d, i, a) => a.indexOf(d) === i) as Dir[];
  let best: Placed | null = null;
  let bestScore = Infinity;
  order.forEach((dir, oi) => {
    [1, 1.5, 2.1].forEach((k, ki) => {
      const dist = base * k;
      let to: Pt;
      let rect: Rect;
      let anchor: Placed['anchor'];
      let x: number;
      let y: number;
      if (dir === 'n' || dir === 's') {
        // straight above or below the thing; the plate slides sideways to stay inside the bounds, the leader keeps pointing at it
        const up = dir === 'n';
        const px = Math.min(Math.max(at[0] - w / 2, bounds.x), Math.max(bounds.x, bounds.x + bounds.w - w));
        const py = up ? at[1] - dist - h : at[1] + dist;
        rect = {x: px, y: py, w, h};
        to = [Math.min(Math.max(at[0], px + 24 * L.u), px + w - 24 * L.u), up ? py + h : py];
        anchor = up ? 'bl' : 'tl';
        x = px;
        y = up ? py + h : py;
      } else {
        const sx = dir.endsWith('e') ? 1 : -1;
        const sy = dir.startsWith('n') ? -1 : 1;
        to = [at[0] + sx * dist, at[1] + sy * dist * 0.7];
        anchor = ((sy < 0 ? 'b' : 't') + (sx > 0 ? 'l' : 'r')) as Placed['anchor'];
        rect = {x: sx > 0 ? to[0] : to[0] - w, y: sy < 0 ? to[1] - h : to[1], w, h};
        x = to[0];
        y = to[1];
      }
      const hit = (opts.avoid ?? []).reduce((n, a) => n + overlapArea(rect, a), 0);
      const score = overflow(rect, bounds) * 50 + hit * 0.02 + ki * 12 + oi * 6;
      if (score < bestScore) {
        bestScore = score;
        best = {x, y, anchor, from: at, to, rect, dir, hidden: hit > 0 || overflow(rect, bounds) > 0};
      }
    });
  });
  return best!;
};

/**
 * A label with a leader line to the thing it names. Draws its own SVG layer (the line) and the plate.
 * Inside a scene that already has an SVG layer, use placeLabel() and draw the pieces there.
 */
export const LeaderLabel: React.FC<{
  at: Pt;
  lines: PlateLine[];
  show: number;
  dir?: Dir;
  dist?: number;
  avoid?: Rect[];
  id?: string;
  dot?: boolean;
}> = ({at, lines, show, dir, dist, avoid, id = 'leader', dot = true}) => {
  const L = useLayout();
  const theme = useTheme();
  const p = placeLabel(L, theme, at, lines, {dir, dist, avoid, bounds: L.content});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
        <LeaderLine from={p.from} to={p.to} show={show} dot={dot} />
      </svg>
      <Plate x={p.x} y={p.y} anchor={p.anchor} lines={lines} show={show} id={id} slide={false} />
    </AbsoluteFill>
  );
};
