import React from 'react';
import {AbsoluteFill} from 'remotion';
import config from './config.json';
import {at, Backdrop, BrowserShot, Header, IntroCard, OutroCard, SswTag} from './ui';

const who = config.speaker;
const nameBar = who.person ? `AI voice of ${who.person}${who.title ? ` · ${who.title}` : ''}` : 'AI voice';

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// The short done video (30-60 s): the glow camera box, a whoosh on each cut.
export const look = {short: true};

const PBI = {
  product: 'TODO: product · PBI #NNNN',
  title: 'TODO: what changed, in 6 words or fewer',
  today: 'TODO: short promise of the video',
  summary: ['TODO: what changed', 'TODO: why it matters'],
};

const url = 'TODO: the page URL';
// A screenshot of 1600x900 at the default width; pass `shot` and `width` for another size.
// Keep the shot clear of the camera box (bottom right, 300x300 with 56 px margins) and the subtitles.
const shotStyle: React.CSSProperties = {position: 'absolute', left: 96, top: 150};

export const Intro: React.FC<SceneProps> = ({cue}) => (
  <IntroCard cue={cue} name={who.ai_name} title={nameBar} project={PBI.product} today={PBI.today} headline={{tag: PBI.product, title: PBI.title}} />
);

export const Pain: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="The pain" title="TODO: what hurt before" />
    <BrowserShot at={at(cue, 0)} src="shots/before.png" url={url} style={shotStyle} steps={[]} />
    <SswTag at={at(cue, 1)} lead="❌ Bad example" text="- TODO: the old behaviour" sound="bad" style={{top: 820}} />
  </AbsoluteFill>
);

export const Fix: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="The fix" title="TODO: what you see now" />
    <BrowserShot at={0} src="shots/after.png" url={url} style={shotStyle} steps={[]} />
    <SswTag at={at(cue, 1)} lead="✅ Good example" text="- TODO: the new behaviour" sound="good" style={{top: 820}} />
  </AbsoluteFill>
);

export const Outro: React.FC<SceneProps> = ({cue}) => (
  <OutroCard cue={cue} name={who.ai_name} recap={PBI.summary} />
);
