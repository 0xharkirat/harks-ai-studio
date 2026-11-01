import React from 'react';
import rough from 'roughjs';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp01} from './motion';
import {useTheme} from './ThemeContext';

// Hand-drawn primitives on rough.js (MIT, https://roughjs.com).
// "Boil" (the linework is redrawn about 12 times a second while fills stay put) follows the idea in
// ClaudeAnimationBase (MIT, JohnHeibel), src/core.js. The code is written fresh for SVG.

const gen = rough.generator();

export type Pt = [number, number];

/** A stable seed from a string id. */
export const hstr = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 90000) + 1;
};

/**
 * The boil index (0..3) for hand-drawn parts. `force` boils even in a clean theme: the guide always boils.
 * Without `force`, a clean theme returns 0, so its lines never move.
 */
export const useInkBoil = (force = false) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  if (!force && !theme.line.boil) return 0;
  return Math.floor((f / fps) * theme.line.boilFps) % 4;
};

export type Shape =
  | {k: 'line'; a: Pt; b: Pt}
  | {k: 'poly'; pts: Pt[]}
  | {k: 'open'; pts: Pt[]}
  | {k: 'curve'; pts: Pt[]}
  | {k: 'path'; d: string}
  | {k: 'ellipse'; c: Pt; w: number; h: number}
  | {k: 'rect'; x: number; y: number; w: number; h: number};

export type SkProps = {
  id: string;
  boil: number;
  shape: Shape;
  stroke: string;
  sw?: number;
  fill?: string;
  fillStyle?: 'solid' | 'hachure' | 'cross-hatch' | 'zigzag';
  hg?: number; // hachure gap
  fw?: number; // fill weight
  rg?: number; // roughness
  bow?: number;
  still?: boolean; // do not boil
  draw?: number; // 0..1 draw-on progress
  opacity?: number;
  dx?: number;
  dy?: number;
  seedAdd?: number;
};

/** One hand-drawn shape: an outline, with an optional fill. `draw` runs the stroke on from 0 to 1. */
export const Sk: React.FC<SkProps> = ({id, boil, shape, stroke, sw = 5, fill, fillStyle = 'solid', hg = 12, fw = 3, rg = 1.1, bow = 1, still, draw = 1, opacity = 1, dx = 0, dy = 0, seedAdd = 0}) => {
  if (draw <= 0.001) return null;
  const seed = hstr(id) + seedAdd + (still ? 0 : boil * 7919);
  const o: Record<string, unknown> = {
    seed,
    roughness: rg,
    bowing: bow,
    stroke: stroke === 'none' ? 'transparent' : stroke,
    strokeWidth: sw,
    fillStyle,
    hachureGap: hg,
    fillWeight: fw,
    disableMultiStroke: false,
  };
  if (fill) o.fill = fill;
  let d: ReturnType<typeof gen.line>;
  const s = shape;
  switch (s.k) {
    case 'line':
      d = gen.line(s.a[0], s.a[1], s.b[0], s.b[1], o);
      break;
    case 'poly':
      d = gen.polygon(s.pts, o);
      break;
    case 'open':
      d = gen.linearPath(s.pts, o);
      break;
    case 'curve':
      d = gen.curve(s.pts, o);
      break;
    case 'path':
      d = gen.path(s.d, o);
      break;
    case 'ellipse':
      d = gen.ellipse(s.c[0], s.c[1], s.w, s.h, o);
      break;
    case 'rect':
      d = gen.rectangle(s.x, s.y, s.w, s.h, o);
      break;
  }
  const paths = gen.toPaths(d);
  const dash = draw < 0.999;
  return (
    <g transform={dx || dy ? `translate(${dx} ${dy})` : undefined} opacity={opacity}>
      {paths.map((p, i) => {
        const solid = p.fill && p.fill !== 'none';
        return (
          <path
            key={i}
            d={p.d}
            stroke={solid ? 'none' : p.stroke}
            strokeWidth={p.strokeWidth}
            fill={solid ? p.fill : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={dash && !solid ? 1 : undefined}
            strokeDasharray={dash && !solid ? '1 1' : undefined}
            strokeDashoffset={dash && !solid ? 1 - clamp01(draw) : undefined}
            opacity={solid && dash ? clamp01(draw * 1.5) : undefined}
          />
        );
      })}
    </g>
  );
};

/** A coloured marker wash that sits a little off the outline, like hand colouring. */
export const Wash: React.FC<{id: string; shape: Shape; color: string; off?: Pt; opacity?: number; draw?: number; rg?: number}> = ({id, shape, color, off = [7, 6], opacity = 0.6, draw = 1, rg = 1.6}) => (
  <Sk id={id + '-w'} boil={0} still shape={shape} stroke="none" sw={0} fill={color} fillStyle="solid" rg={rg} dx={off[0]} dy={off[1]} opacity={opacity * clamp01(draw * 1.4)} />
);

/** Pencil hatch. Still (does not boil), so it reads as shading and not as noise. */
export const Hatch: React.FC<{id: string; shape: Shape; color: string; gap?: number; w?: number; draw?: number; opacity?: number; style?: 'hachure' | 'cross-hatch' | 'zigzag'}> = ({id, shape, color, gap = 14, w = 2.6, draw = 1, opacity = 0.8, style = 'hachure'}) => (
  <Sk id={id + '-h'} boil={0} still shape={shape} stroke="none" sw={0} fill={color} fillStyle={style} hg={gap} fw={w} rg={1.4} draw={draw} opacity={opacity} />
);

/** A curved arrow with a hand-drawn head. */
export const Arrow: React.FC<{id: string; boil: number; from: Pt; to: Pt; bend?: number; color: string; sw?: number; draw: number; head?: number}> = ({id, boil, from, to, bend = 40, color, sw = 6, draw, head = 26}) => {
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const dxv = to[0] - from[0];
  const dyv = to[1] - from[1];
  const len = Math.hypot(dxv, dyv) || 1;
  const nx = -dyv / len;
  const ny = dxv / len;
  const c: Pt = [mx + nx * bend, my + ny * bend];
  const q1: Pt = [from[0] + (c[0] - from[0]) * 0.55 + (to[0] - from[0]) * 0.05, from[1] + (c[1] - from[1]) * 0.55 + (to[1] - from[1]) * 0.05];
  const tx = to[0] - c[0];
  const ty = to[1] - c[1];
  const tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl;
  const uy = ty / tl;
  const a1: Pt = [to[0] - ux * head - uy * head * 0.55, to[1] - uy * head + ux * head * 0.55];
  const a2: Pt = [to[0] - ux * head + uy * head * 0.55, to[1] - uy * head - ux * head * 0.55];
  const shaft = clamp01(draw / 0.75);
  const hd = clamp01((draw - 0.7) / 0.3);
  return (
    <g>
      <Sk id={id} boil={boil} shape={{k: 'curve', pts: [from, q1, c, to]}} stroke={color} sw={sw} draw={shaft} rg={0.9} />
      <Sk id={id + 'a'} boil={boil} shape={{k: 'open', pts: [a1, to, a2]}} stroke={color} sw={sw} draw={hd} rg={0.7} />
    </g>
  );
};
