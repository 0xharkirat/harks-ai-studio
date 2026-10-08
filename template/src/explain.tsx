import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {at, c, mono, sans, useIn} from './ui';

// Explainer pieces, free of the SSW intro, outro and lower thirds: a title card, a corner heading,
// a diagram that builds up on narration cues, and code walked through line by line.
// Every `at` is a scene-local frame, usually at(cue, i). Leave `at` out to show a part already drawn,
// for example to carry a diagram over from the scene before.

/** Frame at fraction `f` (0 to 1) through line i, for a part the narration names mid-sentence. */
export const within = (cue: number[], ends: number[], i: number, f: number) => Math.round(at(cue, i) + f * (at(ends, i) - at(cue, i)));

export type Tone = 'text' | 'muted' | 'blue' | 'yellow' | 'teal' | 'green' | 'red' | 'amber';
const ink = (tone?: Tone) => (tone ? c[tone] : 'currentColor');

const DRAW = 20; // frames an outline or an arrow takes to draw
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = Easing.inOut(Easing.cubic);

/** 0 to 1 over `len` frames from `at`; 1 when `at` is left out. */
const drawn = (frame: number, from: number | undefined, len = DRAW) =>
  from === undefined ? 1 : interpolate(frame, [from, from + len], [0, 1], {...clamp, easing: smooth});

/** 1, then a fade to a ghost from `out`, for a part the narration replaces. */
const ghost = (frame: number, out: number | undefined) => (out === undefined ? 1 : interpolate(frame, [out, out + 12], [1, 0.22], clamp));

/** Centred title card: the title writes on from the left, an accent line draws under it, then the subtitle fades in. */
export const Title: React.FC<{title: string; sub?: string; at?: number; subAt?: number}> = ({title, sub, at = 0, subAt}) => {
  const frame = useCurrentFrame();
  const write = drawn(frame, at, 24);
  const line = drawn(frame, at + 12, 24);
  const s = useIn(subAt ?? at + 30);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 120}}>
      <div style={{fontFamily: sans, fontWeight: 800, fontSize: 96, color: c.text, letterSpacing: -2, clipPath: `inset(0 ${(1 - write) * 100}% 0 0)`}}>{title}</div>
      <div style={{height: 6, width: 220, borderRadius: 3, background: c.blue, marginTop: 28, transform: `scaleX(${line})`}} />
      {sub && (
        <div style={{fontFamily: sans, fontWeight: 500, fontSize: 44, color: c.muted, marginTop: 32, opacity: s, transform: `translateY(${(1 - s) * 16}px)`}}>{sub}</div>
      )}
    </AbsoluteFill>
  );
};

/** Top-left label that names the scene's one idea. */
export const Heading: React.FC<{children: React.ReactNode; at?: number; tone?: Tone}> = ({children, at = 0, tone = 'blue'}) => {
  const p = useIn(at);
  return (
    <div style={{position: 'absolute', left: 96, top: 72, display: 'flex', alignItems: 'center', gap: 18, opacity: p, transform: `translateX(${(1 - p) * -24}px)`}}>
      <div style={{width: 6, height: 40, borderRadius: 3, background: c[tone]}} />
      <div style={{fontFamily: sans, fontWeight: 600, fontSize: 40, color: c.text}}>{children}</div>
    </div>
  );
};

export type DiagramNode = {
  id: string;
  /** Centre, in diagram units: the frame's pixels unless the Diagram sets width and height. */
  x: number;
  y: number;
  label?: string;
  /** Small mono text under the node, such as a commit hash. */
  sub?: string;
  /** circle (default), box, or pill: a filled tag, such as a branch name. */
  shape?: 'circle' | 'box' | 'pill';
  r?: number;
  w?: number;
  h?: number;
  tone?: Tone;
  at?: number;
  /** Frame it fades to a ghost, when the narration replaces it. */
  out?: number;
  /** Frame a ring pulses out from it, to point at it. */
  flash?: number;
  /** Glide to a new centre from frame `at`; its arrows follow. */
  move?: {at: number; x: number; y: number};
};

export type DiagramEdge = {
  from: string;
  to: string;
  label?: string;
  tone?: Tone;
  dashed?: boolean;
  /** Bow, in diagram units off the straight line; a negative bend bows to the other side. */
  bend?: number;
  /** Arrowhead at `to`; true unless set to false. */
  head?: boolean;
  at?: number;
  out?: number;
};

type Pt = [number, number];
const round = (n: DiagramNode) => !n.shape || n.shape === 'circle';

/** The node with its centre where it stands at this frame. */
const placed = (n: DiagramNode, frame: number): DiagramNode => {
  if (!n.move) return n;
  const m = drawn(frame, n.move.at, 24);
  return {...n, x: n.x + (n.move.x - n.x) * m, y: n.y + (n.move.y - n.y) * m};
};

/** Half width and half height of a node's outline. */
const half = (n: DiagramNode): Pt => {
  if (round(n)) return [n.r ?? 46, n.r ?? 46];
  const font = n.shape === 'pill' ? 26 : 30;
  return [(n.w ?? (n.label ?? '').length * font * 0.62 + 48) / 2, (n.h ?? (n.shape === 'pill' ? 52 : 72)) / 2];
};

/** Where the ray from a node's centre toward `p` leaves its outline, plus a small gap. */
const rim = (n: DiagramNode, p: Pt, gap = 8): Pt => {
  const dx = p[0] - n.x;
  const dy = p[1] - n.y;
  const [hw, hh] = half(n);
  if (round(n)) {
    const len = Math.hypot(dx, dy) || 1;
    return [n.x + (dx / len) * (hw + gap), n.y + (dy / len) * (hw + gap)];
  }
  const k = 1 / (Math.max(Math.abs(dx) / (hw + gap), Math.abs(dy) / (hh + gap)) || 1);
  return [n.x + dx * k, n.y + dy * k];
};

/** A straight or bowed path between two nodes, trimmed to their outlines, with its arrow tip and label spot. */
const route = (a: DiagramNode, b: DiagramNode, bend: number, head: boolean) => {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const normal: Pt = [-(b.y - a.y) / len, (b.x - a.x) / len];
  const q: Pt = [(a.x + b.x) / 2 + normal[0] * bend, (a.y + b.y) / 2 + normal[1] * bend];
  const p0 = rim(a, q);
  const tip = rim(b, q);
  const angle = Math.atan2(tip[1] - q[1], tip[0] - q[0]);
  // The line stops short of the tip, so it ends inside the arrowhead.
  const p2: Pt = head ? [tip[0] - Math.cos(angle) * 12, tip[1] - Math.sin(angle) * 12] : tip;
  const mid: Pt = [(p0[0] + 2 * q[0] + p2[0]) / 4, (p0[1] + 2 * q[1] + p2[1]) / 4];
  // Labels sit on the outside of a bow; a straight edge keeps its label on the upper side.
  const side = bend !== 0 ? Math.sign(bend) : normal[1] > 0 ? -1 : 1;
  const off: Pt = [normal[0] * side, normal[1] * side];
  // On a slanted or upright edge the label grows away from the line, never across it.
  const anchor: 'start' | 'middle' | 'end' = off[0] > 0.35 ? 'start' : off[0] < -0.35 ? 'end' : 'middle';
  return {d: `M ${p0[0]} ${p0[1]} Q ${q[0]} ${q[1]} ${p2[0]} ${p2[1]}`, tip, angle, label: [mid[0] + off[0] * 34, mid[1] + off[1] * 34] as Pt, anchor};
};

const Edge: React.FC<{e: DiagramEdge; a: DiagramNode; b: DiagramNode; frame: number; mask: string; size: Pt}> = ({e, a, b, frame, mask, size}) => {
  const p = drawn(frame, e.at);
  if (p <= 0) return null;
  const head = e.head !== false;
  const r = route(a, b, e.bend ?? 0, head);
  const color = ink(e.tone);
  const show = interpolate(p, [0.7, 1], [0, 1], clamp);
  const draw = {pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p};
  return (
    <g opacity={ghost(frame, e.out)}>
      {e.dashed ? (
        <>
          {/* A dashed line cannot also draw on with its own dash array, so a solid mask draws on over it. */}
          <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={size[0]} height={size[1]}>
            <path d={r.d} fill="none" stroke="white" strokeWidth={12} {...draw} />
          </mask>
          <path d={r.d} fill="none" stroke={color} strokeWidth={4} strokeDasharray="14 12" mask={`url(#${mask})`} />
        </>
      ) : (
        <path d={r.d} fill="none" stroke={color} strokeWidth={4} {...draw} />
      )}
      {head && (
        <polygon
          points="0,0 -22,-11 -22,11"
          fill={color}
          opacity={show}
          transform={`translate(${r.tip[0]} ${r.tip[1]}) rotate(${(r.angle * 180) / Math.PI})`}
        />
      )}
      {e.label && (
        <text x={r.label[0]} y={r.label[1]} textAnchor={r.anchor} dominantBaseline="central" fontFamily={sans} fontWeight={500} fontSize={26} fill={e.tone ? color : c.muted} opacity={show}>
          {e.label}
        </text>
      )}
    </g>
  );
};

const Node: React.FC<{n: DiagramNode; frame: number}> = ({n: start, frame}) => {
  if (start.at !== undefined && frame < start.at) return null;
  const n = placed(start, frame);
  const p = drawn(frame, n.at);
  const fill = n.at === undefined ? 1 : interpolate(frame, [n.at + 8, n.at + DRAW + 4], [0, 1], clamp);
  const color = ink(n.tone ?? 'blue');
  const [hw, hh] = half(n);
  const pill = n.shape === 'pill';
  const outline = {stroke: color, strokeWidth: 4, pathLength: 1, strokeDasharray: '1 1', strokeDashoffset: 1 - p};
  const pulse = n.flash === undefined ? -1 : (frame - n.flash) / 30;
  return (
    <g opacity={ghost(frame, n.out)}>
      {round(n) ? (
        // Rotated so the outline starts drawing at the top, like a pen stroke.
        <circle cx={n.x} cy={n.y} r={hw} fill={color} fillOpacity={0.16 * fill} transform={`rotate(-90 ${n.x} ${n.y})`} {...outline} />
      ) : (
        <rect x={n.x - hw} y={n.y - hh} width={hw * 2} height={hh * 2} rx={pill ? hh : 14} fill={color} fillOpacity={(pill ? 1 : 0.16) * fill} {...outline} />
      )}
      {pulse >= 0 && pulse < 1 && <circle cx={n.x} cy={n.y} r={Math.max(hw, hh) + 10 + 40 * pulse} fill="none" stroke={color} strokeWidth={4 * (1 - pulse)} opacity={1 - pulse} />}
      {n.label && (
        <text
          x={n.x}
          y={n.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={sans}
          fontWeight={700}
          fontSize={pill ? 26 : round(n) ? 34 : 30}
          fill={pill ? c.bg : c.text}
          opacity={fill}
        >
          {n.label}
        </text>
      )}
      {n.sub && (
        <text x={n.x} y={n.y + hh + 32} textAnchor="middle" dominantBaseline="central" fontFamily={mono} fontSize={22} fill={c.muted} opacity={fill}>
          {n.sub}
        </text>
      )}
    </g>
  );
};

/**
 * SVG nodes and labelled arrows that draw on at their own frames: outlines trace, fills and labels fade in,
 * arrows draw from tail to head. Coordinates are the frame's pixels unless width and height say otherwise.
 * Keep nodes above y 880, so the subtitles stay clear.
 */
export const Diagram: React.FC<{nodes: DiagramNode[]; edges?: DiagramEdge[]; width?: number; height?: number; style?: React.CSSProperties}> = ({
  nodes,
  edges = [],
  width = 1920,
  height = 1080,
  style,
}) => {
  const frame = useCurrentFrame();
  const uid = React.useId().replace(/[^\w-]/g, '');
  const byId = new Map(nodes.map((n) => [n.id, placed(n, frame)]));
  const node = (id: string) => {
    const n = byId.get(id);
    if (!n) throw new Error(`Diagram edge names a missing node "${id}"`);
    return n;
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{position: 'absolute', left: 0, top: 0, width, height, color: c.text, overflow: 'visible', ...style}}>
      {edges.map((e, i) => (
        <Edge key={i} e={e} a={node(e.from)} b={node(e.to)} frame={frame} mask={`${uid}-m${i}`} size={[width, height]} />
      ))}
      {nodes.map((n) => (
        <Node key={n.id} n={n} frame={frame} />
      ))}
    </svg>
  );
};

/** Lines to light up from frame `at`; line numbers start at 1. */
export type CodeStep = {at: number; lines: number[]};

/** A code block that lights the lines each step names and dims the rest; `#` and `//` comments show muted. */
export const CodeWalk: React.FC<{code: string; steps: CodeStep[]; title?: string; at?: number; width?: number; fontSize?: number; tone?: Tone; style?: React.CSSProperties}> = ({
  code,
  steps,
  title,
  at = 0,
  width = 1100,
  fontSize = 32,
  tone = 'yellow',
  style,
}) => {
  const frame = useCurrentFrame();
  const p = useIn(at);
  const rows = code.replace(/^\n+|\s+$/g, '').split('\n');
  let k = -1;
  steps.forEach((s, i) => {
    if (frame >= s.at) k = i;
  });
  const t = k >= 0 ? interpolate(frame, [steps[k].at, steps[k].at + 10], [0, 1], clamp) : 1;
  // Before the first step every line reads normally; from then on the step's lines light up and the rest dim.
  const look = (i: number, step: number) => (step < 0 ? {lit: 0, o: 1} : steps[step].lines.includes(i + 1) ? {lit: 1, o: 1} : {lit: 0, o: 0.35});
  const color = c[tone];
  return (
    <div
      style={{
        width,
        background: c.panel,
        border: `1px solid ${c.line}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
        ...style,
      }}
    >
      {title && <div style={{padding: '14px 28px', borderBottom: `1px solid ${c.line}`, fontFamily: mono, fontSize: 22, color: c.muted}}>{title}</div>}
      <div style={{padding: '20px 0'}}>
        {rows.map((row, i) => {
          const from = look(i, k - 1);
          const to = look(i, k);
          const lit = from.lit + (to.lit - from.lit) * t;
          const cut = row.search(/(^|\s)(#|\/\/)/);
          return (
            <div key={i} style={{position: 'relative', display: 'flex', fontFamily: mono, fontSize, lineHeight: 1.6, whiteSpace: 'pre', opacity: from.o + (to.o - from.o) * t}}>
              <div style={{position: 'absolute', inset: 0, background: color, opacity: 0.13 * lit}} />
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: color, opacity: lit}} />
              <div style={{position: 'relative', flexShrink: 0, width: 84, paddingRight: 28, textAlign: 'right', color: c.muted}}>{i + 1}</div>
              <div style={{position: 'relative', color: c.text}}>
                {cut < 0 ? row : row.slice(0, cut)}
                {cut >= 0 && <span style={{color: c.muted, fontStyle: 'italic'}}>{row.slice(cut)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
