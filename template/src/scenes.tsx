import React from 'react';
import {AbsoluteFill} from 'remotion';
import config from './config.json';
import {Appear, at, Backdrop, c, Chip, Header, IntroCard, OutroCard, sans, SswTag, Terminal} from './ui';

const who = config.speaker;

export type SceneProps = {cue: number[]; frames: number};

// One component per scene id in script.json, named with a capital first letter (intro -> Intro).
// cue[i] is the frame where line i starts; at(cue, i) is the safe version.
// Richer scenes (real screenshots with clicks, permission pickers): see examples/02-voice-clone-tutorial/scenes.tsx.

const PBI = {
  title: 'TODO: PBI title',
  today: 'TODO: short promise of the video',
  recap: ['TODO: what changed', 'TODO: how to use it'],
};

export const Intro: React.FC<SceneProps> = ({cue, frames}) => (
  <IntroCard cue={cue} frames={frames} name={who.ai_name} title={`AI voice clone of ${who.person} · ${who.short_title}`} today={PBI.today} />
);

export const Overview: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="The PBI" title={PBI.title} />
    <Appear at={at(cue, 0) + 6} style={{position: 'absolute', left: 96, top: 200, width: 1300}}>
      <div style={{fontFamily: sans, fontSize: 40, color: c.text, lineHeight: 1.35}}>TODO: the goal in one sentence.</div>
    </Appear>
    <Chip at={at(cue, 1)} style={{position: 'absolute', left: 96, top: 340}}>
      TODO: acceptance criterion
    </Chip>
  </AbsoluteFill>
);

export const Pain: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="The pain" title="TODO: what hurt before" />
    <SswTag at={at(cue, 1)} lead="❌ Bad example" text="- TODO: the old behaviour" style={{top: 400}} />
  </AbsoluteFill>
);

export const Demo: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Demo" title="TODO: what you are about to see" />
    <div style={{position: 'absolute', left: 96, top: 170}}>
      {/* Swap for <BrowserShot src="shots/<name>.png" .../> once screenshots are in public/shots. */}
      <Terminal at={at(cue, 0)} lines={[{at: at(cue, 1), kind: 'cmd', text: 'TODO: the command or action'}, {at: at(cue, 1) + 40, kind: 'ok', text: '✓ TODO: the result'}]} />
    </div>
    <SswTag at={at(cue, 2)} lead="✅ Good example" text="- TODO: the new behaviour" style={{top: 800}} />
  </AbsoluteFill>
);

export const Outro: React.FC<SceneProps> = ({cue, frames}) => <OutroCard cue={cue} frames={frames} name={who.ai_name} recap={PBI.recap} />;
