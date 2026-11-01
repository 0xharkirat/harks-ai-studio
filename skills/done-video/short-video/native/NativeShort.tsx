import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as Scenes from '../scenes';
import type {SceneProps} from '../scenes';
import {FONT, FrameReserve, Grain, ThemeRoot, useTheme} from '../lib';
import {buildPages} from './Short';
import data from './short.json';

// A native 9:16 Short of a channel video (1080x1920). scripts/short.dart copies this folder over src/short/ and writes
// short.json beside it; nothing here is edited by hand.
// The scenes are the library's own components laid out for 9:16 (they read the frame size and reflow): they are NOT the 16:9
// scene scaled down, so every label keeps its phone-readable size. Top to bottom:
//   the hook line (frame 0 on), the scene area, big word-by-word captions, and the platform's own UI below (380 px, left clear).
// The hook line and the captions are the same in every theme (channel/style_test.md: only the visual treatment changes),
// so they use one style that reads on dark and on paper: white with a heavy black outline.

type Word = {w: string; start: number; end: number};
type SceneData = {id: string; from: number; frames: number; skip: number; continues?: boolean; cue: number[]; ends: number[]};
type ShortData = {fps: number; totalFrames: number; hook: string; label: string; audio: string; theme?: string; scenes: SceneData[]; words: Word[]};
const short = data as unknown as ShortData;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const YELLOW = '#F4D345';

// Frame pixels. The library keeps the top 150 px and the bottom 380 px clear (Shorts title and buttons).
const SAFE_TOP = 150;
const SAFE_BOTTOM_Y = 1920 - 380;
const HOOK = {top: SAFE_TOP, height: 260};
const CAPTION = {height: 230, top: SAFE_BOTTOM_Y - 230};
const RESERVE_TOP = HOOK.height + 20;
const RESERVE_BOTTOM = CAPTION.height;

const MUSIC = 0.13;

const sceneFor = (id: string): React.FC<SceneProps> => {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const Scene = (Scenes as Record<string, unknown>)[name];
  if (typeof Scene !== 'function') throw new Error(`scenes.tsx has no component "${name}" for scene id "${id}"`);
  return Scene as React.FC<SceneProps>;
};

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

const stroke = {WebkitTextStroke: '12px black', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,0.55)'} as const;

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const settle = interpolate(f, [fps * 3, fps * 3.6], [0, 1], clamp);
  const len = short.hook.length;
  const size = len <= 28 ? 104 : len <= 48 ? 90 : 76;
  return (
    <div style={{position: 'absolute', left: 64, width: 920, top: HOOK.top, height: HOOK.height, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', transform: `scale(${1 - 0.1 * settle})`, transformOrigin: '50% 0'}}>
      <div style={{fontFamily: FONT.inter, fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: -2, color: 'white', ...stroke}}>{short.hook}</div>
    </div>
  );
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pages = React.useMemo(() => buildPages(short.words, fps), [fps]);
  const page = pages.find((p) => frame >= p.start - 2 && frame < p.end);
  if (!page) return null;
  const lit = page.words.reduce((a, w, j) => (frame >= w.start ? j : a), -1);
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: CAPTION.top, height: CAPTION.height, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 24, rowGap: 4, fontFamily: FONT.inter, fontWeight: 800, fontSize: 96, lineHeight: 1.1, textAlign: 'center'}}>
        {page.words.map((w, j) => (
          <span key={`${w.start}-${j}`} style={{color: j === lit ? YELLOW : 'white', transform: j === lit ? 'scale(1.06)' : undefined, ...stroke}}>
            {w.w}
          </span>
        ))}
      </div>
    </div>
  );
};

const Inner: React.FC = () => {
  const total = short.totalFrames;
  return (
    <AbsoluteFill>
      <Audio src={staticFile(short.audio)} />
      <Audio src={staticFile('music/minimal_lofi_bed_4min.mp3')} volume={(f) => MUSIC * interpolate(f, [0, 30, Math.max(31, total - 45), Math.max(32, total)], [0, 1, 1, 0], clamp)} />
      {short.scenes.slice(1).filter((s) => !s.continues).map((s) => (
        <Sequence key={`whoosh-${s.id}`} from={Math.max(0, s.from - 6)} durationInFrames={30} layout="none">
          <Audio src={staticFile('sfx/whoosh.wav')} volume={0.35} />
        </Sequence>
      ))}
      <FrameReserve top={RESERVE_TOP} bottom={RESERVE_BOTTOM}>
        {short.scenes.map((s, i) => {
          const Scene = sceneFor(s.id);
          const scene = <Scene cue={s.cue} ends={s.ends} frames={s.frames + s.skip} />;
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.frames} name={s.id}>
              <Fade frames={s.frames} fadeIn={i > 0 && !s.continues} fadeOut={!short.scenes[i + 1]?.continues}>
                {/* A scene that starts part way in (its black card cut) is shifted back so its cues still line up. */}
                {s.skip > 0 ? <Sequence from={-s.skip} layout="none">{scene}</Sequence> : scene}
              </Fade>
            </Sequence>
          );
        })}
      </FrameReserve>
      <Grain />
      <Hook />
      <Captions />
    </AbsoluteFill>
  );
};

export const NativeShort: React.FC<{theme?: string}> = ({theme}) => (
  <ThemeRoot theme={theme ?? short.theme}>
    <Inner />
  </ThemeRoot>
);
