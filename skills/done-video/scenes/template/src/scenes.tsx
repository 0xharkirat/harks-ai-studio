import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ChannelMark, NumberReveal, TitleCard, at} from './lib';

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// One component per scene id in script.json, named with a capital first letter (intro -> Intro).
// cue[i] is the frame line i starts; at(cue, i) is the safe version. Build scenes from the library in src/lib:
//   TitleCard, NumberReveal, WorldMap, GlobeRoute, LeaderLabel, OrbitDiagram, Chart, Guide/GuideSlot, ChannelMark, Headline.
// The theme comes from script.json ("theme": "A" | "B" | "C" | "D"), or the --theme flag of scripts/render.dart.
// scenes/README.md in the studio lists every component and its props.

export const Intro: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <NumberReveal at={at(cue, 0)} value={0} unit="TODO" label="TODO: what the number measures" source="TODO: the source of the number" />
    <ChannelMark />
  </AbsoluteFill>
);

export const Outro: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <TitleCard at={at(cue, 0)} kicker="For Curious Beings" title="TODO: the one-line answer" />
    <ChannelMark />
  </AbsoluteFill>
);
