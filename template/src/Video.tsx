import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import layoutJson from './layout.json';

// Written by scripts/layout.dart; the template ships an empty placeholder.
type Layout = {fps: number; totalFrames: number; scenes: {id: string; from: number; frames: number; lines: {say: string; start: number; end: number}[]}[]};
const layout = layoutJson as unknown as Layout;
import * as Scenes from './scenes';
import type {SceneProps} from './scenes';
import {c, Captions, PiP} from './ui';

// Scene id "intro" renders the component exported as Intro from scenes.tsx.
const sceneFor = (id: string): React.FC<SceneProps> => {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const Scene = (Scenes as Record<string, unknown>)[name];
  if (typeof Scene !== 'function') throw new Error(`scenes.tsx has no component "${name}" for scene id "${id}"`);
  return Scene as React.FC<SceneProps>;
};

// Very quiet bed: about 20 dB under the voice, fading in and out.
const MUSIC = 0.13;

const Fade: React.FC<{frames: number; children: React.ReactNode}> = ({frames, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, frames - 6, frames], [0, 1, 1, 0.6], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

// Lives outside the scene Sequences so the voice meter reads the global frame.
const CameraBox: React.FC = () => {
  const f = useCurrentFrame();
  const first = layout.scenes[0];
  const last = layout.scenes[layout.scenes.length - 1];
  const o = interpolate(f, [first.frames, first.frames + 10, last.from - 8, last.from], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o === 0) return null;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <PiP />
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
        volume={(f) => MUSIC * interpolate(f, [0, 45, total - 90, total], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      />
      {layout.scenes.map((s) => {
        const Scene = sceneFor(s.id);
        const cue = s.lines.map((l) => l.start - s.from);
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
            <Fade frames={s.frames}>
              <Scene cue={cue} frames={s.frames} />
            </Fade>
          </Sequence>
        );
      })}
      <CameraBox />
      <Captions lines={layout.scenes.flatMap((s) => s.lines)} />
    </AbsoluteFill>
  );
};
