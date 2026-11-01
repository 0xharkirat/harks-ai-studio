import React from 'react';
import {clamp01, easeOutBack} from './motion';
import {Sk, Wash, useInkBoil} from './ink';
import {useTheme} from './ThemeContext';

// Small map marks. Each has a clean version (themes A, C, D) and a hand-drawn version (theme B).
// All are centre-anchored SVG groups, so they sit inside a scene's SVG layer.

/** A sailboat badge for the tip of a route. `s` is the diameter in px. */
export const BoatBadge: React.FC<{x: number; y: number; s: number; pop?: number; ripple?: number}> = ({x, y, s, pop = 1, ripple = -1}) => {
  const theme = useTheme();
  const b = useInkBoil();
  const p = theme.palette;
  if (pop <= 0) return null;
  const k = theme.ease.pop(clamp01(pop));
  if (theme.line.boil) {
    const hull = 'M -34 8 L 34 0 C 30 24 14 34 0 34 L -20 34 C -30 28 -34 18 -34 8 Z';
    const sail = 'M 2 -58 C 22 -34 34 -14 40 -2 L 2 -2 Z';
    return (
      <g transform={`translate(${x},${y}) scale(${(s / 100) * k * 1.25})`} opacity={clamp01(pop * 3)}>
        <circle r={50} fill={p.bg} opacity={0.9} />
        <Wash id="bb-sail" shape={{k: 'path', d: sail}} color={p.mark.yellow} off={[4, 3]} opacity={0.9} />
        <Wash id="bb-hull" shape={{k: 'path', d: hull}} color={p.mark.orange} off={[4, 4]} opacity={0.85} />
        <Sk id="bb-mast" boil={b} shape={{k: 'line', a: [0, -62], b: [0, 10]}} stroke={p.ink} sw={5} rg={0.6} />
        <Sk id="bb-sail" boil={b} shape={{k: 'path', d: sail}} stroke={p.ink} sw={4.5} rg={0.8} />
        <Sk id="bb-hull" boil={b} shape={{k: 'path', d: hull}} stroke={p.ink} sw={5} rg={0.8} />
        <Sk id="bb-flag" boil={b} shape={{k: 'poly', pts: [[0, -62], [0, -46], [20, -54]]}} stroke={p.ink} sw={3} fill={p.accent} fillStyle="solid" rg={0.4} />
        {ripple >= 0 &&
          [0, 0.5].map((o) => {
            const ph = (ripple / 1.8 + o) % 1;
            return <circle key={o} r={52 + ph * 70} fill="none" stroke={p.accent2} strokeWidth={5 * (1 - ph) + 1} opacity={0.65 * (1 - ph)} />;
          })}
      </g>
    );
  }
  return (
    <g transform={`translate(${x},${y}) scale(${(s / 100) * k})`} opacity={clamp01(pop * 3)}>
      {ripple >= 0 &&
        [0, 0.5].map((o) => {
          const ph = (ripple / 1.8 + o) % 1;
          return <circle key={o} r={52 + ph * 70} fill="none" stroke="#fff" strokeWidth={5 * (1 - ph) + 1} opacity={0.65 * (1 - ph)} />;
        })}
      <circle r={52} fill="rgba(0,0,0,0.28)" cx={0} cy={5} />
      <circle r={50} fill="#fff" stroke={p.accent} strokeWidth={8} />
      <path d="M-2 -34 L-2 14" stroke="#1b2a35" strokeWidth={4} strokeLinecap="round" />
      <path d="M2 -34 L28 8 L2 8 Z" fill={p.accent} />
      <path d="M-6 -26 L-27 8 L-6 8 Z" fill="#1b2a35" />
      <path d="M-32 14 L32 14 L23 29 L-23 29 Z" fill="#1b2a35" />
    </g>
  );
};

/** The "?" at the end of a route. Clean: an accent disc. Sketch: a hand-drawn red question mark on a yellow wash. */
export const QuestionBadge: React.FC<{x: number; y: number; s: number; pop: number; pulse?: number}> = ({x, y, s, pop, pulse = 0}) => {
  const theme = useTheme();
  const b = useInkBoil();
  const p = theme.palette;
  if (pop <= 0) return null;
  const k = theme.ease.pop(clamp01(pop));
  if (theme.line.boil) {
    const hook = 'M -62 -80 C -66 -168 72 -172 70 -92 C 68 -32 4 -40 2 26';
    return (
      <g transform={`translate(${x},${y}) scale(${(s / 150) * k * 0.9}) translate(0 -30)`} opacity={clamp01(pop * 3)}>
        <Sk id="qb-glow" boil={0} still shape={{k: 'path', d: hook}} stroke="rgba(255,217,61,0.7)" sw={60} rg={0.8} dx={8} dy={8} />
        <Sk id="qb-hook" boil={b} shape={{k: 'path', d: hook}} stroke={p.accent} sw={26} rg={0.9} />
        <Sk id="qb-dot" boil={b} shape={{k: 'ellipse', c: [2, 88], w: 36, h: 36}} stroke={p.accent} sw={8} fill={p.accent} fillStyle="solid" rg={0.5} />
      </g>
    );
  }
  return (
    <g transform={`translate(${x},${y}) scale(${(s / 100) * k})`} opacity={clamp01(pop * 3)}>
      <circle r={50 + pulse * 26} fill="none" stroke={p.accent} strokeWidth={5} opacity={(1 - pulse) * 0.7} />
      <circle r={52} fill="rgba(0,0,0,0.3)" cx={0} cy={5} />
      <circle r={50} fill={p.accent} stroke="#fff" strokeWidth={6} />
      <text x={0} y={2} textAnchor="middle" dominantBaseline="central" fontFamily={theme.fonts.display} fontWeight={800} fontSize={74 /* type-exempt: the ? glyph of a badge, not text */} fill="#fff">
        ?
      </text>
    </g>
  );
};

/** Lock-on mark around a point. Clean: 4 white corner brackets that close in. Sketch: a hand-drawn red ring. */
export const LockBrackets: React.FC<{x: number; y: number; s: number; t: number}> = ({x, y, s, t}) => {
  const theme = useTheme();
  const b = useInkBoil();
  if (t <= 0) return null;
  if (theme.line.boil) {
    return (
      <g transform={`translate(${x},${y})`}>
        <Sk id="lock" boil={b} shape={{k: 'ellipse', c: [0, 0], w: s * 0.9, h: s * 0.8}} stroke={theme.palette.accent} sw={7} draw={clamp01(t * 1.2)} rg={1.4} />
      </g>
    );
  }
  const k = 1 + 0.9 * (1 - easeOutBack(clamp01(t)));
  const h = (s / 2) * k;
  const l = s * 0.22;
  const sw = Math.max(4, s * 0.06);
  const corner = (sx: number, sy: number) => (
    <path key={`${sx}${sy}`} d={`M ${sx * h} ${sy * (h - l)} L ${sx * h} ${sy * h} L ${sx * (h - l)} ${sy * h}`} fill="none" stroke="#fff" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
  );
  return (
    <g transform={`translate(${x},${y})`} opacity={clamp01(t * 4)}>
      {corner(-1, -1)}
      {corner(1, -1)}
      {corner(1, 1)}
      {corner(-1, 1)}
    </g>
  );
};

/** A point on the map: a white dot with an accent ring (the sketch theme draws it as a red-ringed dot). */
export const PinDot: React.FC<{x: number; y: number; r: number; show: number}> = ({x, y, r, show}) => {
  const theme = useTheme();
  if (show <= 0) return null;
  return <circle cx={x} cy={y} r={r} fill={theme.line.boil ? theme.palette.accent : '#fff'} stroke={theme.line.boil ? theme.palette.ink : theme.palette.accent} strokeWidth={r * 0.45} opacity={clamp01(show * 3)} />;
};
