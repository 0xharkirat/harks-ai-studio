import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CodeWalk, Diagram, Heading, Title} from './explain';
import {at} from './ui';

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// One component per scene id in script.json, named with a capital first letter (idea -> Idea), one idea per scene.
// cue[i] is the frame where line i starts; at(cue, i) is the safe version. Give each new part on screen the cue
// of the line that names it, so the picture builds as the narration speaks.
// A finished example: examples/03-git-rebase-explainer/scenes.tsx.

export const Intro: React.FC<SceneProps> = ({cue}) => <Title at={at(cue, 0)} title="TODO: title" sub="TODO: the promise" subAt={at(cue, 1)} />;

export const Idea: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Heading>TODO: the idea</Heading>
    <Diagram
      nodes={[
        {id: 'a', x: 660, y: 480, label: 'A', at: at(cue, 0)},
        {id: 'b', x: 1260, y: 480, label: 'B', tone: 'yellow', at: at(cue, 1)},
      ]}
      edges={[{from: 'a', to: 'b', label: 'TODO', at: at(cue, 1) + 10}]}
    />
  </AbsoluteFill>
);

export const Code: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Heading>TODO: the code</Heading>
    <CodeWalk
      title="TODO: file name"
      code={'TODO: line one\nTODO: line two'}
      steps={[
        {at: at(cue, 0), lines: [1]},
        {at: at(cue, 1), lines: [2]},
      ]}
      style={{position: 'absolute', left: 410, top: 260}}
    />
  </AbsoluteFill>
);

export const Recap: React.FC<SceneProps> = ({cue}) => <Title at={at(cue, 0)} title="TODO: the idea in a few words" />;
