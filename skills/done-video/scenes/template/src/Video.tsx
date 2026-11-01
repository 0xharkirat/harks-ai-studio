import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import layoutJson from './layout.json';
import * as Scenes from './scenes';
import type {SceneProps} from './scenes';
import {FrameReserve, Grain, ThemeRoot, useTheme} from './lib';
import {Captions} from './ui';

// The faceless channel video: the scene library under a theme, Hark's narration, a quiet music bed, subtitles.
// layout.json is written by scripts/layout.dart; its `theme` comes from script.json.
type Layout = {
  fps: number;
  totalFrames: number;
  theme?: string;
  scenes: {id: string; from: number; frames: number; continues?: boolean; lines: {say: string; start: number; end: number}[]}[];
};
const layout = layoutJson as unknown as Layout;

// Scene id "intro" renders the component exported as Intro from scenes.tsx.
const sceneFor = (id: string): React.FC<SceneProps> => {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const Scene = (Scenes as Record<string, unknown>)[name];
  if (typeof Scene !== 'function') throw new Error(`scenes.tsx has no component "${name}" for scene id "${id}"`);
  return Scene as React.FC<SceneProps>;
};

// Very quiet bed: about 20 dB under the voice, fading in and out.
const MUSIC = 0.13;

// A scene fades in from the theme's background and dims a little as it ends; a "continues" scene carries on the one before.
const Fade: React.FC<{frames: number; fadeIn: boolean; fadeOut: boolean; children: React.ReactNode}> = ({frames, fadeIn, fadeOut, children}) => {
  const f = useCurrentFrame();
  const theme = useTheme();
  const o = interpolate(f, [0, 8, frames - 6, frames], [fadeIn ? 0 : 1, 1, 1, fadeOut ? 0.7 : 1], {extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{background: theme.palette.bg}}>
      <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// Subtitles keep the bottom of a 16:9 frame; the scenes lay out above them.
const SUBTITLE_BAND = 150;

const Inner: React.FC<{music: boolean; captions: boolean}> = ({music, captions}) => {
  const {height, width} = useVideoConfig();
  const tall = height > width;
  const total = layout.totalFrames;
  const u = Math.min(width, height) / 1080;
  return (
    <AbsoluteFill>
      <Audio src={staticFile('narration.wav')} />
      {music && (
        <Audio
          src={staticFile('music/minimal_lofi_bed_4min.mp3')}
          volume={(f) => MUSIC * interpolate(f, [0, 45, Math.max(46, total - 90), Math.max(47, total)], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
        />
      )}
      <FrameReserve bottom={captions && !tall ? SUBTITLE_BAND * u : 0}>
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
      </FrameReserve>
      <Grain />
      {captions && <Captions lines={layout.scenes.flatMap((s) => s.lines)} />}
    </AbsoluteFill>
  );
};

/** Props: `theme` ("A", "B", "C", "D", or a name such as "sketch"), `music` and `captions` (both on unless false). */
export const Video: React.FC<{theme?: string; music?: boolean; captions?: boolean}> = ({theme, music = true, captions = true}) => (
  <ThemeRoot theme={theme ?? layout.theme}>
    <Inner music={music} captions={captions} />
  </ThemeRoot>
);
