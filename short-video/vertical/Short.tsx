import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import * as Scenes from '../scenes';
import type {SceneProps} from '../scenes';
import {c, sans, sfx} from '../ui';
import data from './short.json';

// A vertical Short (1080x1920) of a few scenes of a long video. scripts/short.dart copies this folder to
// src/short/ and writes short.json beside it; nothing here is edited by hand.
// Top to bottom: the hook line (on screen from frame 0), a label, the long video's own scene components drawn
// live on a 1920x1080 stage that is scaled to the width of the frame (so no scene is cropped), and big captions
// that light each word as it is spoken. The camera box and the long video's subtitles are left out.

type Word = {w: string; start: number; end: number};
type SceneData = {id: string; from: number; frames: number; skip: number; continues?: boolean; cue: number[]; ends: number[]};
type ShortData = {fps: number; totalFrames: number; hook: string; label: string; audio: string; scenes: SceneData[]; words: Word[]};
const short = data as unknown as ShortData;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const yellow = (c as Record<string, string>).yellow ?? '#F4D345';

// Layout in frame pixels. The bottom 350 px stay clear of the player's title and buttons.
const WIDTH = 1080;
const STAGE = {w: 1920, h: 1080};
const MARGIN = 20;
const SCALE = (WIDTH - 2 * MARGIN) / STAGE.w;
const HOOK = {top: 110, height: 430};
const STAGE_TOP = 600;
const CAPTIONS = {top: STAGE_TOP + Math.round(STAGE.h * SCALE) + 50, height: 330};

// Very quiet bed, as in the long video.
const MUSIC = 0.13;

// Scene id "intro" renders the component exported as Intro from scenes.tsx.
const sceneFor = (id: string): React.FC<SceneProps> => {
  const name = id.charAt(0).toUpperCase() + id.slice(1);
  const Scene = (Scenes as Record<string, unknown>)[name];
  if (typeof Scene !== 'function') throw new Error(`scenes.tsx has no component "${name}" for scene id "${id}"`);
  return Scene as React.FC<SceneProps>;
};

// A scene fades in from black and dims as it ends, like the long video; the first scene is already there at frame 0.
const Fade: React.FC<{frames: number; fadeIn: boolean; fadeOut: boolean; children: React.ReactNode}> = ({frames, fadeIn, fadeOut, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, frames - 6, frames], [fadeIn ? 0 : 1, 1, 1, fadeOut ? 0.6 : 1], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Full size at frame 0 and for 3 s, then it settles a little smaller and stays.
  const settle = interpolate(f, [fps * 3, fps * 3.6], [0, 1], clamp);
  const len = short.hook.length;
  const size = len <= 32 ? 112 : len <= 60 ? 94 : 78;
  return (
    <div
      style={{
        position: 'absolute', left: 64, right: 64, top: HOOK.top, height: HOOK.height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', transform: `scale(${1 - 0.14 * settle})`, opacity: 1 - 0.1 * settle,
      }}
    >
      <div style={{width: 120, height: 10, borderRadius: 5, background: c.red, marginBottom: 36}} />
      <div style={{fontFamily: sans, fontWeight: 800, fontSize: size, lineHeight: 1.08, letterSpacing: -2, color: 'white'}}>{short.hook}</div>
    </div>
  );
};

const Stage: React.FC = () => (
  <>
    <div style={{position: 'absolute', left: MARGIN, top: STAGE_TOP - 56, fontFamily: sans, fontWeight: 700, fontSize: 28, letterSpacing: 4, color: c.muted, textTransform: 'uppercase'}}>{short.label}</div>
    <div
      style={{
        position: 'absolute', left: MARGIN, top: STAGE_TOP, width: STAGE.w * SCALE, height: STAGE.h * SCALE, borderRadius: 28, overflow: 'hidden',
        boxShadow: `0 0 0 2px ${c.line}, 0 30px 80px rgba(0,0,0,0.5)`,
      }}
    >
      <div style={{position: 'absolute', left: 0, top: 0, width: STAGE.w, height: STAGE.h, background: c.bg, transform: `scale(${SCALE})`, transformOrigin: '0 0'}}>
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
      </div>
    </div>
  </>
);

// ---- Captions: 1-4 words at a time, in big type, the spoken word lit ----

const WEAK = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'about', 'as', 'and', 'but', 'or', 'so', 'because', 'if', 'when', 'than', 'is', 'are', 'was', 'were', 'be', 'will', 'can']);
const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const chars = (ws: Word[]) => ws.map((w) => w.w).join(' ').length;
const ends = (w: Word) => /[.!?]["')]*$/.test(w.w);

type Page = {words: Word[]; start: number; end: number};

/** Cut the words into pages: at a sentence end, at a pause, after a comma once there are a few words, or when the page is full. */
export const buildPages = (words: Word[], fps: number): Page[] => {
  const groups: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    cur.push(w);
    const next = words[i + 1];
    const full = cur.length >= 4 || chars(cur) >= 26;
    const comma = /[,;:]$/.test(w.w) && chars(cur) >= 14;
    const pause = next ? next.start - w.end > fps * 0.6 : true;
    if (!(ends(w) || full || comma || pause)) return;
    if (!ends(w) && next && cur.length >= 2 && WEAK.has(bare(w.w))) {
      // Do not end a page on "the" or "and": it starts the next page.
      const carry = cur.pop()!;
      groups.push(cur);
      cur = [carry];
    } else {
      groups.push(cur);
      cur = [];
    }
  });
  if (cur.length) groups.push(cur);
  // A page of 1 word joins the page before it, unless that page closed a sentence or would get too long.
  const merged: Word[][] = [];
  for (const g of groups) {
    const last = merged[merged.length - 1];
    if (g.length === 1 && last && !ends(last[last.length - 1]) && last.length < 4 && chars([...last, ...g]) <= 30) last.push(...g);
    else merged.push(g);
  }
  return merged.map((ws, i) => ({
    words: ws,
    start: ws[0].start,
    // Held 0.4 s after the last word, or until the next page starts.
    end: Math.min(i + 1 < merged.length ? merged[i + 1][0].start : Infinity, ws[ws.length - 1].end + Math.round(fps * 0.4)),
  }));
};

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pages = React.useMemo(() => buildPages(short.words, fps), [fps]);
  const page = pages.find((p) => frame >= p.start - 2 && frame < p.end);
  if (!page) return null;
  // The lit word is the last one that has started, so a short or oddly timed word never flickers.
  const lit = page.words.reduce((a, w, j) => (frame >= w.start ? j : a), -1);
  return (
    <div style={{position: 'absolute', left: 50, right: 50, top: CAPTIONS.top, height: CAPTIONS.height, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: 24, rowGap: 4, fontFamily: sans, fontWeight: 800, fontSize: 96, lineHeight: 1.1, textAlign: 'center'}}>
        {page.words.map((w, j) => (
          <span
            key={`${w.start}-${j}`}
            style={{
              color: j === lit ? yellow : 'white', transform: j === lit ? 'scale(1.06)' : undefined,
              WebkitTextStroke: '12px black', paintOrder: 'stroke fill', textShadow: '0 6px 0 rgba(0,0,0,0.55)',
            }}
          >
            {w.w}
          </span>
        ))}
      </div>
    </div>
  );
};

export const Short: React.FC = () => {
  const total = short.totalFrames;
  const whoosh = (sfx as Record<string, {src: string; volume: number}>).whoosh;
  return (
    <AbsoluteFill style={{background: c.bg}}>
      <Audio src={staticFile(short.audio)} />
      <Audio
        src={staticFile('music/minimal_lofi_bed_4min.mp3')}
        volume={(f) => MUSIC * interpolate(f, [0, 30, Math.max(31, total - 45), Math.max(32, total)], [0, 1, 1, 0], clamp)}
      />
      {whoosh &&
        short.scenes.slice(1).filter((s) => !s.continues).map((s) => (
          <Sequence key={`whoosh-${s.id}`} from={Math.max(0, s.from - 6)} durationInFrames={30} layout="none">
            <Audio src={staticFile(whoosh.src)} volume={whoosh.volume} />
          </Sequence>
        ))}
      <Hook />
      <Stage />
      <Captions />
    </AbsoluteFill>
  );
};
