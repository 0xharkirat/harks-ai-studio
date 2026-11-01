import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Sk, Wash, useInkBoil, type Pt} from '../core/ink';
import {clamp01, easeInOut, win} from '../core/motion';
import {useTheme} from '../core/ThemeContext';
import {useLayout, type Rect} from '../core/layout';

/*
 * The guide: a stick-figure sailor who recurs in every video. One emotion per moment.
 * The rig (face, arm angles, emote marks, a squint before a change, a "take" after it) is adapted from
 * ClaudeAnimationBase (MIT, JohnHeibel) src/clawd.js, re-drawn here as a rough.js stick figure.
 */

export type Emotion = 'happy' | 'excited' | 'determined' | 'look' | 'wonder' | 'confused' | 'proud';
export const EMOTIONS: Emotion[] = ['happy', 'excited', 'determined', 'look', 'wonder', 'confused', 'proud'];

export type Face = {
  eye: 'dot' | 'wide' | 'closed' | 'glad';
  brow: number; // -1 down (angry) .. +1 raised
  browSkew: number; // one brow higher (confused)
  mouth: 'smile' | 'grin' | 'flat' | 'o' | 'wobble' | 'open';
  look: number; // -1 left .. +1 right
  blush: number;
  emote: 'none' | 'sweat' | 'spark' | 'bang' | 'q';
  armF: number; // front arm: shoulder angle in degrees (0 = right, -90 = up)
  armFB: number; // forearm angle
  armB: number; // back arm
  armBB: number;
  lean: number; // body lean, degrees
  tilt: number; // head tilt, degrees
  bounce: number; // vertical hop, px
  squash: number;
};

const BASE: Face = {eye: 'dot', brow: 0, browSkew: 0, mouth: 'smile', look: 0.4, blush: 0, emote: 'none', armF: 55, armFB: 80, armB: 110, armBB: 95, lean: 0, tilt: 0, bounce: 0, squash: 0};

const FACE: Record<Emotion, Partial<Face>> = {
  happy: {eye: 'dot', brow: 0.2, mouth: 'smile', blush: 0.5, armF: -50, armFB: -80},
  excited: {eye: 'wide', brow: 0.8, mouth: 'open', blush: 0.7, emote: 'spark', look: 0.5, armF: -70, armFB: -100, armB: -110, armBB: -80},
  determined: {eye: 'dot', brow: -0.7, mouth: 'grin', blush: 0.2, look: 1, armF: -22, armFB: -14},
  look: {eye: 'dot', brow: 0.5, mouth: 'flat', look: 1, armF: -30, armFB: -10},
  wonder: {eye: 'wide', brow: 1, browSkew: 0.5, mouth: 'o', emote: 'sweat', look: 1, armF: -20, armFB: -45, tilt: -7},
  confused: {eye: 'dot', brow: 0.6, browSkew: 1, mouth: 'wobble', emote: 'q', armF: -62, armFB: 150},
  proud: {eye: 'glad', brow: 0.4, mouth: 'smile', blush: 0.6, armF: 20, armFB: 120, armB: 160, armBB: 60, lean: -2},
};

/** One emotion from a frame on. `over` adjusts the face or the arms for this moment (for example `{armF: -30}` to point). */
export interface GuideMoment {
  at: number;
  emotion: Emotion;
  over?: Partial<Face>;
}

/** The acted face at a frame: the squint before a change, then a small "take" (a hop) after it. */
const emotionAt = (f: number, fps: number, moments: GuideMoment[]): Face & {squint: number; age: number} => {
  const ms = [...moments].sort((a, b) => a.at - b.at);
  let i = 0;
  while (i + 1 < ms.length && f >= ms[i + 1].at) i++;
  const m = ms[i] ?? {at: 0, emotion: 'happy' as Emotion};
  const cur: Face = {...BASE, ...FACE[m.emotion], ...m.over};
  const next = i + 1 < ms.length ? ms[i + 1].at : Infinity;
  const age = f - m.at;
  let squint = 0;
  if (next - f < 3) squint = Math.max(squint, 1 - (next - f) / 3);
  if (i > 0 && age < 4) squint = Math.max(squint, 1 - age / 4);
  if (i > 0) {
    cur.squash += Math.sin((Math.min(age, 14) / 14) * Math.PI) * -0.05;
    cur.bounce += -Math.sin((Math.min(age, 12) / 12) * Math.PI) * 10;
  }
  void fps;
  return Object.assign(cur, {squint, age});
};

const rad = (d: number) => (d * Math.PI) / 180;
const add = (p: Pt, ang: number, len: number): Pt => [p[0] + Math.cos(rad(ang)) * len, p[1] + Math.sin(rad(ang)) * len];

// The guide is always drawn in dark ink on light paper, whatever the theme, so it reads on a sticker or on paper.
const INK = '#242730';
const PAPER = '#fbf6e8';
const BLUE = '#2f6fd0';
const RED = '#e2453c';
const SKY = 'rgba(96,190,240,0.55)';

/** Height of the figure in its own units (hip at 0): head top to feet. */
export const GUIDE_H = 300;

const Figure: React.FC<{id: string; boil: number; f: number; face: Face & {squint: number}; draw?: number; blink?: number; roughness: number}> = ({id, boil, f, face, draw = 1, blink = 0, roughness}) => {
  const sw = 7.5;
  const k = roughness;
  const hip: Pt = [0, 0];
  const shoulder: Pt = [Math.sin(rad(face.lean)) * 66, -66 * Math.cos(rad(face.lean))];
  const headC: Pt = [shoulder[0] + Math.sin(rad(face.lean)) * 56 + 4, shoulder[1] - 52];
  const closed = Math.max(face.squint, blink);
  const fE = add(shoulder, face.armF, 50);
  const fH = add(fE, face.armFB, 46);
  const bE = add(shoulder, face.armB, 48);
  const bH = add(bE, face.armBB, 44);
  const lK: Pt = [-24 * 0.6, 52];
  const lF: Pt = [-24 - face.squash * 20, 104];
  const rK: Pt = [24 * 0.6, 52];
  const rF: Pt = [24 + 8, 104];

  const eyeY = headC[1] + 4;
  const ex1 = headC[0] + 8 + face.look * 5;
  const ex2 = headC[0] + 26 + face.look * 5;
  const browY = eyeY - 13 - face.brow * 5;
  const bAngle = (face.brow < 0 ? -face.brow : 0) * 7;
  const mx = headC[0] + 17 + face.look * 4;
  const my = headC[1] + 25;
  const eyeR = face.eye === 'wide' ? 6.2 : 4.6;

  const mouth = () => {
    switch (face.mouth) {
      case 'smile':
        return <Sk id={id + 'm'} boil={boil} stroke={INK} shape={{k: 'curve', pts: [[mx - 10, my - 2], [mx, my + 7], [mx + 10, my - 3]]}} sw={4.5} draw={draw} rg={0.5 * k} />;
      case 'grin':
        return <Sk id={id + 'm'} boil={boil} stroke={INK} shape={{k: 'path', d: `M ${mx - 11} ${my - 3} Q ${mx} ${my + 12} ${mx + 11} ${my - 3} Z`}} sw={4} fill={INK} fillStyle="solid" draw={draw} rg={0.4 * k} />;
      case 'o':
        return <Sk id={id + 'm'} boil={boil} stroke={INK} shape={{k: 'ellipse', c: [mx, my + 2], w: 11, h: 15}} sw={4.5} fill={INK} fillStyle="solid" draw={draw} rg={0.4 * k} />;
      case 'open':
        return <Sk id={id + 'm'} boil={boil} stroke={INK} shape={{k: 'path', d: `M ${mx - 11} ${my - 4} Q ${mx} ${my + 20} ${mx + 11} ${my - 4} Z`}} sw={4} fill={RED} fillStyle="solid" draw={draw} rg={0.4 * k} />;
      case 'wobble':
        return <Sk id={id + 'm'} boil={boil} stroke={INK} shape={{k: 'open', pts: [[mx - 11, my + 2], [mx - 5, my - 3], [mx + 1, my + 3], [mx + 7, my - 3], [mx + 12, my + 1]]}} sw={4.2} draw={draw} rg={0.4 * k} />;
      default:
        return <Sk id={id + 'm'} boil={boil} stroke={INK} shape={{k: 'line', a: [mx - 9, my], b: [mx + 9, my]}} sw={4.5} draw={draw} rg={0.4 * k} />;
    }
  };

  const eye = (cx: number, key: string) => {
    if (closed > 0.5 || face.eye === 'closed') return <Sk id={id + key} boil={boil} stroke={INK} shape={{k: 'line', a: [cx - 6, eyeY + 1], b: [cx + 6, eyeY + 1]}} sw={4.2} draw={draw} rg={0.4 * k} />;
    if (face.eye === 'glad') return <Sk id={id + key} boil={boil} stroke={INK} shape={{k: 'curve', pts: [[cx - 6, eyeY + 3], [cx, eyeY - 4], [cx + 6, eyeY + 3]]}} sw={4.2} draw={draw} rg={0.4 * k} />;
    return <Sk id={id + key} boil={boil} stroke={INK} shape={{k: 'ellipse', c: [cx, eyeY], w: eyeR * 2, h: eyeR * 2.2}} sw={2} fill={INK} fillStyle="solid" draw={draw} rg={0.3 * k} />;
  };

  return (
    <g>
      <Sk id={id + 'll'} boil={boil} stroke={INK} shape={{k: 'open', pts: [hip, lK, lF, [lF[0] + 18, lF[1]]]}} sw={sw} draw={draw} rg={1.1 * k} />
      <Sk id={id + 'rl'} boil={boil} stroke={INK} shape={{k: 'open', pts: [hip, rK, rF, [rF[0] + 18, rF[1]]]}} sw={sw} draw={draw} rg={1.1 * k} />
      <Sk id={id + 'ba'} boil={boil} stroke={INK} shape={{k: 'open', pts: [shoulder, bE, bH]}} sw={sw} draw={draw} rg={1.1 * k} />
      <Sk id={id + 'to'} boil={boil} stroke={INK} shape={{k: 'line', a: hip, b: [shoulder[0], shoulder[1] - 14]}} sw={sw} draw={draw} rg={1.1 * k} />
      <Sk id={id + 'sc'} boil={boil} stroke={RED} shape={{k: 'open', pts: [[shoulder[0] - 14, shoulder[1] - 10], [shoulder[0] + 2, shoulder[1] - 2], [shoulder[0] + 16, shoulder[1] - 12]]}} sw={7} draw={draw} rg={0.7 * k} />
      <Sk id={id + 'fa'} boil={boil} stroke={INK} shape={{k: 'open', pts: [shoulder, fE, fH]}} sw={sw} draw={draw} rg={1.1 * k} />
      <Sk id={id + 'fh'} boil={boil} stroke={INK} shape={{k: 'ellipse', c: fH, w: 11, h: 11}} sw={4} fill={PAPER} fillStyle="solid" draw={draw} rg={0.5 * k} />
      <g transform={`rotate(${face.tilt} ${headC[0]} ${headC[1] + 30})`}>
        <Wash id={id + 'hw'} shape={{k: 'ellipse', c: headC, w: 74, h: 74}} color="rgba(255,196,150,0.9)" off={[3, 3]} opacity={0.9} draw={draw} rg={0.8} />
        <Sk id={id + 'hd'} boil={boil} stroke={INK} shape={{k: 'ellipse', c: headC, w: 74, h: 76}} sw={sw} draw={draw} rg={1.1 * k} />
        <Sk id={id + 'cp'} boil={boil} stroke={INK} shape={{k: 'path', d: `M ${headC[0] - 38} ${headC[1] - 22} C ${headC[0] - 46} ${headC[1] - 82} ${headC[0] + 46} ${headC[1] - 82} ${headC[0] + 38} ${headC[1] - 22} Z`}} sw={6} fill={PAPER} fillStyle="solid" draw={draw} rg={0.9 * k} />
        <Sk id={id + 'cb'} boil={boil} stroke={BLUE} shape={{k: 'line', a: [headC[0] - 38, headC[1] - 23], b: [headC[0] + 38, headC[1] - 23]}} sw={8} draw={draw} rg={0.6 * k} />
        <Sk id={id + 'cpm'} boil={boil} stroke={RED} shape={{k: 'ellipse', c: [headC[0], headC[1] - 66], w: 14, h: 14}} sw={3} fill={RED} fillStyle="solid" draw={draw} rg={0.5 * k} />
        {eye(ex1, 'e1')}
        {eye(ex2, 'e2')}
        <Sk id={id + 'b1'} boil={boil} stroke={INK} shape={{k: 'line', a: [ex1 - 8, browY + 3 + bAngle], b: [ex1 + 8, browY - 1 - bAngle]}} sw={4.2} draw={draw} rg={0.4 * k} />
        <Sk id={id + 'b2'} boil={boil} stroke={INK} shape={{k: 'line', a: [ex2 - 8, browY - 1 - bAngle - face.browSkew * 9], b: [ex2 + 8, browY + 3 + bAngle - face.browSkew * 9]}} sw={4.2} draw={draw} rg={0.4 * k} />
        {mouth()}
        {face.blush > 0.01 && <Sk id={id + 'bl'} boil={0} still shape={{k: 'ellipse', c: [headC[0] + 2, headC[1] + 14], w: 13, h: 9}} stroke="none" sw={0} fill="rgba(240,100,100,0.55)" fillStyle="solid" opacity={face.blush} />}
      </g>
      {face.emote === 'sweat' && (
        <Sk id={id + 'sw'} boil={boil} stroke={BLUE} shape={{k: 'path', d: `M ${headC[0] + 46} ${headC[1] - 26 + ((f * 0.6) % 14)} q 9 13 0 17 q -9 -4 0 -17 z`}} sw={3.5} fill={SKY} fillStyle="solid" rg={0.5} />
      )}
      {face.emote === 'spark' &&
        [0, 1, 2].map((i) => {
          const a = -40 - i * 40;
          const p0 = add(headC, a, 66 + Math.sin(f * 0.4 + i) * 4);
          const p1 = add(headC, a, 88 + Math.sin(f * 0.4 + i) * 4);
          return <Sk key={i} id={id + 'sp' + i} boil={boil} stroke={RED} shape={{k: 'line', a: p0, b: p1}} sw={5} rg={0.6} />;
        })}
      {face.emote === 'q' && (
        <text x={headC[0] + 52} y={headC[1] - 40} fontFamily="Caveat Brush, cursive" fontSize={54 /* type-exempt: the ? glyph of an emote, not text */} fill={RED} transform={`rotate(12 ${headC[0] + 52} ${headC[1] - 40})`}>
          ?
        </text>
      )}
    </g>
  );
};

/**
 * The guide at a point. (x, y) is the hip, `size` the figure height in px. One emotion per moment (`moments`).
 * Draws its own SVG layer, so it can sit over any scene.
 */
export const Guide: React.FC<{moments: GuideMoment[]; x: number; y: number; size: number; draw?: number; pop?: number; flip?: boolean; id?: string}> = ({moments, x, y, size, draw = 1, pop = 1, flip = false, id = 'guide'}) => {
  const f = useCurrentFrame();
  const {fps, width: W, height: H} = useVideoConfig();
  const theme = useTheme();
  const b = useInkBoil(theme.guide.boil);
  const face = emotionAt(f, fps, moments);
  const blink = (f + 11) % 90 < 4 ? 1 : 0;
  const s = size / GUIDE_H;
  const k = Math.min(1.15, Math.max(0, pop));
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
      <g transform={`translate(${x} ${y + face.bounce * s}) scale(${flip ? -s * k : s * k} ${s * k})`} opacity={clamp01(pop * 2.2)}>
        <Figure id={id} boil={b} f={f} face={face} draw={draw} blink={blink} roughness={theme.guide.sticker ? 0.75 : 1} />
      </g>
    </svg>
  );
};

/**
 * Where the guide lives in a scene, by theme. Theme B: always on screen, on a ground line. Theme C: a sticker that pops in
 * at story turns (`turns`, as [from, to] frame pairs) and leaves again. Theme A and D: nothing.
 * The position is the layout's guide zone unless `zone` is given.
 */
export const GuideSlot: React.FC<{moments: GuideMoment[]; turns?: [number, number][]; zone?: Rect; flip?: boolean; enter?: number}> = ({moments, turns, zone, flip = false, enter = 6}) => {
  const f = useCurrentFrame();
  const theme = useTheme();
  const L = useLayout();
  if (!theme.guide.on) return null;
  const z = zone ?? L.zones.guide;
  let show = 1;
  if (theme.guide.mode === 'turns') {
    const wins = turns && turns.length ? turns : [[0, 1e9] as [number, number]];
    show = Math.max(...wins.map(([a, c]) => win(f, a, a + enter) * (1 - win(f, c - enter, c))));
  }
  if (show <= 0.001) return null;
  const sticker = theme.guide.sticker;
  const figH = Math.min(z.h * (sticker ? 0.78 : 0.95), (z.w / 190) * GUIDE_H * (sticker ? 0.9 : 1));
  const cx = z.x + z.w / 2;
  // the figure runs from -195 (cap) to +108 (feet) around the hip: put its middle in the middle of the zone
  const s = figH / GUIDE_H;
  const hipY = z.y + z.h / 2 + 43 * s;
  const p = theme.palette;
  const e = theme.ease.pop(show);
  return (
    <>
      {sticker && (
        <div
          style={{
            position: 'absolute',
            left: z.x + z.w / 2 - Math.min(z.w, z.h) * 0.46,
            top: z.y + z.h / 2 - Math.min(z.w, z.h) * 0.46,
            width: Math.min(z.w, z.h) * 0.92,
            height: Math.min(z.w, z.h) * 0.92,
            borderRadius: '50%',
            background: PAPER,
            border: `${8 * L.u}px solid #ffffff`,
            boxShadow: `0 ${14 * L.u}px ${40 * L.u}px rgba(0,0,0,0.45)`,
            transform: `scale(${Math.min(1.1, e)}) rotate(-4deg)`,
            opacity: clamp01(show * 2.2),
            boxSizing: 'border-box',
          }}
        />
      )}
      {!sticker && (
        <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
          <Sk id="ground" boil={0} still stroke={p.ink} shape={{k: 'curve', pts: [[cx - z.w * 0.45, hipY + 108 * s], [cx, hipY + 112 * s], [cx + z.w * 0.45, hipY + 107 * s]]}} sw={5 * L.u} rg={1.2} opacity={clamp01(show * 2)} />
        </svg>
      )}
      <Guide moments={moments} x={cx} y={hipY} size={figH} pop={e} flip={flip} />
    </>
  );
};

void easeInOut;
void spring;
