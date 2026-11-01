import React from 'react';
import {Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import layoutJson from './layout.json';
import mouthJson from './mouth.json';
import rigJson from './puppet.json';
import {Cue, mouthTrack, Span, speakingAt} from './mouth';

// The speaker as a talking cartoon in the camera box. scripts/puppet.py builds the layers from the
// speaker.puppet PSD at project creation, and scripts/layout.dart times the mouth with Rhubarb.
// The mouth and the head bob follow narration.wav alone, never the final mix, which also holds clip audio.
// Everything is a pure function of the frame, so two renders give the same pixels.

type Box = {x: number; y: number; w: number; h: number};
type Rig = {
  canvas: {w: number; h: number};
  body?: Box;
  head: Box;
  frame: {x: number; y: number; size: number};
  pivot: {x: number; y: number};
  eyes: (Box & {k: number; src: string})[];
  mouth: Box & {shapes: string[]};
};

// puppet.json is a `{}` placeholder until new-video.sh builds a puppet, and stays one without speaker.puppet.
const rig = rigJson as unknown as Partial<Rig>;
export const hasPuppet = rig.canvas !== undefined;

const cues = (mouthJson as {cues: Cue[]}).cues;
const lines: Span[] = (layoutJson as {scenes: {lines: Span[]}[]}).scenes.flatMap((s) => s.lines.map((l) => ({start: l.start, end: l.end})));

/** Voice loudness, 0 to 1, read from the narration at the current frame and averaged over `frames`. */
export const useVoiceLevel = (frames = 1) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const audio = useAudioData(staticFile('narration.wav'));
  if (!audio) return 0;
  let sum = 0;
  for (let i = 0; i < frames; i++) {
    const v = visualizeAudio({fps, frame: Math.max(0, frame - i), audioData: audio, numberOfSamples: 32});
    sum += Math.min(1, (v.slice(0, 12).reduce((a, b) => a + b, 0) / 12) * 6);
  }
  return sum / frames;
};

// Seeded random numbers (mulberry32), so blinks land on the same frames every render.
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// The lid overlay for each frame of a blink: 0 open, then rig.eyes[n - 1] (35%, 70%, closed).
const BLINK = [1, 3, 3, 2, 1];

/** Blink start frames: one every 2.3 to 6 s, and sometimes a double blink. */
const blinkStarts = (frames: number, fps: number, seed = 7): number[] => {
  const r = rng(seed);
  const starts: number[] = [];
  let f = Math.round(fps * (0.6 + r() * 1.5));
  while (f < frames) {
    starts.push(f);
    if (r() < 0.2) starts.push(f + BLINK.length + 3);
    f += Math.round(fps * (2.3 + r() * 3.7));
  }
  return starts;
};

const lidAt = (frame: number, starts: number[]) => {
  for (const s of starts) if (frame >= s && frame < s + BLINK.length) return BLINK[frame - s];
  return 0;
};

const place = (b: Box): React.CSSProperties => ({position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h});

/** The puppet framed on its head, filling a `size` square. */
export const Puppet: React.FC<{size: number}> = ({size}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const track = React.useMemo(() => mouthTrack(cues, fps, lines), [fps]);
  const blinks = React.useMemo(() => blinkStarts(durationInFrames, fps), [durationInFrames, fps]);
  const voice = useVoiceLevel(6);
  if (!hasPuppet) return null;
  const {canvas, body, head, frame: crop, pivot, eyes, mouth} = rig as Rig;

  const level = speakingAt(frame, lines) ? voice : 0;
  const mouthNow = track[Math.min(frame, track.length - 1)] ?? 'Neutral';
  const lid = lidAt(frame, blinks);
  // Idle sway on two slow sines, plus a small lift and tilt while talking.
  const t = frame / fps;
  const tilt = 1.3 * Math.sin((2 * Math.PI * t) / 5.3) + 0.5 * Math.sin((2 * Math.PI * t) / 2.7 + 1.3) + 1.2 * level;
  const lift = 1.5 * Math.sin((2 * Math.PI * t) / 3.9) - 5 * level;

  return (
    <div style={{position: 'absolute', width: size, height: size, overflow: 'hidden', background: 'radial-gradient(circle at 50% 30%, #5a1414 0%, #26090b 45%, #0d0d10 100%)'}}>
      <div style={{position: 'absolute', width: canvas.w, height: canvas.h, transformOrigin: '0 0', transform: `scale(${size / crop.size}) translate(${-crop.x}px, ${-crop.y}px)`}}>
        {body && <Img src={staticFile('puppet/body.png')} style={{...place(body), transform: `translateY(${lift * 0.3}px)`}} />}
        <div style={{position: 'absolute', inset: 0, transformOrigin: `${pivot.x}px ${pivot.y}px`, transform: `translateY(${lift}px) rotate(${tilt}deg)`}}>
          <Img src={staticFile('puppet/head.png')} style={place(head)} />
          {eyes.map((e, i) => (
            <Img key={e.src} src={staticFile(`puppet/${e.src}`)} style={{...place(e), opacity: lid === i + 1 ? 1 : 0}} />
          ))}
          {/* Every mouth stays mounted and only one shows, so no frame waits on an image load. */}
          {mouth.shapes.map((m) => (
            <Img key={m} src={staticFile(`puppet/mouths/${m}.png`)} style={{...place(mouth), opacity: m === mouthNow ? 1 : 0}} />
          ))}
        </div>
      </div>
    </div>
  );
};
