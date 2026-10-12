import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import layoutJson from './layout.json';

// Written by scripts/layout.dart; the template ships an empty placeholder.
type Layout = {
  fps: number;
  totalFrames: number;
  scenes: {id: string; from: number; frames: number; continues?: boolean; black?: number; card?: string; reveal?: keyof typeof sfx; lines: {say: string; start: number; end: number}[]}[];
};
const layout = layoutJson as unknown as Layout;
import * as Scenes from './scenes';
import type {SceneProps} from './scenes';
import {c, Captions, PiP, sfx, ssw} from './ui';

// scenes.tsx may export `look = {short: true}`: the camera box is the simple glow one, and a whoosh plays
// on each cut. Without it, the long done-video look: the named camera box with a voice meter.
const short = Boolean((Scenes as {look?: {short?: boolean}}).look?.short);

// Scene id "intro" renders the component exported as Intro from scenes.tsx.
const sceneFor = (id: string): React.FC<SceneProps> => {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const Scene = (Scenes as Record<string, unknown>)[name];
  if (typeof Scene !== 'function') throw new Error(`scenes.tsx has no component "${name}" for scene id "${id}"`);
  return Scene as React.FC<SceneProps>;
};

// Very quiet bed: about 20 dB under the voice, fading in and out.
const MUSIC = 0.13;

// A scene fades in from black and dims as it ends. A scene with "continues" in script.json carries on the
// picture before it, so that cut has neither: a diagram that runs on into the next scene stays steady.
const Fade: React.FC<{frames: number; fadeIn: boolean; fadeOut: boolean; children: React.ReactNode}> = ({frames, fadeIn, fadeOut, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, frames - 6, frames], [fadeIn ? 0 : 1, 1, 1, fadeOut ? 0.6 : 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// A scene's "black" pause: the whole frame black, with an optional card word ("Before", "After"), opening onto the scene over its last 8 frames.
const BlackPause: React.FC<{frames: number; card?: string}> = ({frames, card}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [frames - 8, frames], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t = interpolate(f, [2, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: 'black', opacity: o, alignItems: 'center', justifyContent: 'center'}}>
      {card && (
        <div style={{opacity: t, transform: `translateY(${(1 - t) * 16}px)`, textAlign: 'center'}}>
          <div style={{fontFamily: ssw, fontWeight: 800, fontSize: 110, color: 'white', letterSpacing: 8, textTransform: 'uppercase'}}>{card}</div>
          <div style={{height: 10, width: 160, background: c.red, margin: '18px auto 0'}} />
        </div>
      )}
    </AbsoluteFill>
  );
};

// Lives outside the scene Sequences so the voice meter and the puppet read the global frame.
// The speaker is on screen the whole video, intro and outro included.
const CameraBox: React.FC = () => {
  const f = useCurrentFrame();
  if (layout.scenes.length === 0) return null;
  const o = interpolate(f, [0, 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o === 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <PiP simple={short} />
    </AbsoluteFill>
  );
};

export const Video: React.FC<{voice?: boolean}> = ({voice = true}) => {
  const total = layout.totalFrames;
  return (
    <AbsoluteFill style={{background: c.bg}}>
      {voice && <Audio src={staticFile('narration.wav')} />}
      <Audio
        src={staticFile('music/minimal_lofi_bed_4min.mp3')}
        // Clamped so a fresh project's 30-frame placeholder layout still previews.
        volume={(f) => MUSIC * interpolate(f, [0, 45, Math.max(46, total - 90), Math.max(47, total)], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      />
      {layout.scenes.map((s, i) => {
        const Scene = sceneFor(s.id);
        const cue = s.lines.map((l) => l.start - s.from);
        const ends = s.lines.map((l) => l.end - s.from);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Fade frames={s.frames} fadeIn={!s.continues} fadeOut={!layout.scenes[i + 1]?.continues}>
              <Scene cue={cue} ends={ends} frames={s.frames} />
            </Fade>
          </Sequence>
        );
      })}
      {short &&
        layout.scenes.slice(1).filter((s) => !s.continues).map((s) => (
          <Sequence key={`whoosh-${s.id}`} from={Math.max(0, s.from - 6)} durationInFrames={30} layout="none">
            <Audio src={staticFile(sfx.whoosh.src)} volume={sfx.whoosh.volume} />
          </Sequence>
        ))}
      <CameraBox />
      {layout.scenes.filter((s) => s.black).map((s) => (
        <Sequence key={`black-${s.id}`} from={s.from} durationInFrames={s.black} layout="none">
          <BlackPause frames={s.black!} card={s.card} />
        </Sequence>
      ))}
      {layout.scenes.filter((s) => s.reveal).map((s) => (
        <Sequence key={`reveal-${s.id}`} from={s.from + (s.black ?? 0) - 2} durationInFrames={45} layout="none">
          <Audio src={staticFile(sfx[s.reveal!].src)} volume={sfx[s.reveal!].volume} />
        </Sequence>
      ))}
      <Captions lines={layout.scenes.flatMap((s) => s.lines)} />
    </AbsoluteFill>
  );
};
