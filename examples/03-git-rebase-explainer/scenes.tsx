import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CodeWalk, Diagram, DiagramEdge, DiagramNode, Heading, Title, within} from './explain';
import {at, Terminal} from './ui';

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// Reference only: the scenes of the git rebase explainer, made with scripts/new-video.sh --explainer.
// It imports ./explain and ./ui like a project does. One idea per scene, and every part of the picture
// lands on the words that name it.

// One commit graph for both diagram scenes: main runs along the top row, the feature branch along the bottom.
const MAIN = 450;
const FEATURE = 690;
const X = {a: 440, b: 700, c: 960, d2: 1220, e2: 1480, d: 960, e: 1220};
const ABOVE = MAIN - 115;
const BELOW = FEATURE + 115;

export const Intro: React.FC<SceneProps> = ({cue}) => <Title at={at(cue, 0)} title="git rebase" sub="How it replays your commits" subAt={at(cue, 1)} />;

export const Setup: React.FC<SceneProps> = ({cue, ends}) => {
  const nodes: DiagramNode[] = [
    {id: 'a', x: X.a, y: MAIN, label: 'A', at: within(cue, ends, 0, 0.6)},
    {id: 'b', x: X.b, y: MAIN, label: 'B', at: within(cue, ends, 0, 0.85)},
    {id: 'main', x: X.b, y: ABOVE, label: 'main', shape: 'pill', at: at(cue, 0), move: {at: within(cue, ends, 2, 0.8), x: X.c, y: ABOVE}},
    {id: 'd', x: X.d, y: FEATURE, label: 'D', tone: 'yellow', at: within(cue, ends, 1, 0.75)},
    {id: 'e', x: X.e, y: FEATURE, label: 'E', tone: 'yellow', at: within(cue, ends, 1, 0.9)},
    {id: 'feature', x: X.e, y: BELOW, label: 'feature', shape: 'pill', tone: 'yellow', at: within(cue, ends, 1, 0.9)},
    {id: 'c', x: X.c, y: MAIN, label: 'C', at: within(cue, ends, 2, 0.6)},
  ];
  const edges: DiagramEdge[] = [
    {from: 'a', to: 'b', at: within(cue, ends, 0, 0.85)},
    {from: 'b', to: 'd', at: within(cue, ends, 1, 0.7)},
    {from: 'd', to: 'e', at: within(cue, ends, 1, 0.88)},
    {from: 'b', to: 'c', at: within(cue, ends, 2, 0.55)},
  ];
  return (
    <AbsoluteFill>
      <Heading>Two branches</Heading>
      <Diagram nodes={nodes} edges={edges} />
    </AbsoluteFill>
  );
};

export const Replay: React.FC<SceneProps> = ({cue, ends}) => {
  const aside = within(cue, ends, 0, 0.65); // "...sets D and E aside"
  const nodes: DiagramNode[] = [
    {id: 'a', x: X.a, y: MAIN, label: 'A'},
    {id: 'b', x: X.b, y: MAIN, label: 'B'},
    {id: 'c', x: X.c, y: MAIN, label: 'C'},
    {id: 'main', x: X.c, y: ABOVE, label: 'main', shape: 'pill'},
    {id: 'd', x: X.d, y: FEATURE, label: 'D', tone: 'yellow', out: aside},
    {id: 'e', x: X.e, y: FEATURE, label: 'E', tone: 'yellow', out: aside},
    {id: 'feature', x: X.e, y: BELOW, label: 'feature', shape: 'pill', tone: 'yellow', move: {at: within(cue, ends, 3, 0.2), x: X.e2, y: ABOVE}},
    {id: 'd2', x: X.d2, y: MAIN, label: 'D′', tone: 'yellow', at: within(cue, ends, 1, 0.3)},
    {id: 'e2', x: X.e2, y: MAIN, label: 'E′', tone: 'yellow', at: within(cue, ends, 2, 0.3), flash: within(cue, ends, 3, 0.8)},
  ];
  const edges: DiagramEdge[] = [
    {from: 'a', to: 'b'},
    {from: 'b', to: 'c'},
    {from: 'b', to: 'd', out: aside},
    {from: 'd', to: 'e', out: aside},
    {from: 'd', to: 'd2', label: 'replay', tone: 'muted', dashed: true, at: at(cue, 1)},
    {from: 'c', to: 'd2', at: within(cue, ends, 1, 0.5)},
    {from: 'e', to: 'e2', label: 'replay', tone: 'muted', dashed: true, at: at(cue, 2)},
    {from: 'd2', to: 'e2', at: within(cue, ends, 2, 0.5)},
  ];
  return (
    <AbsoluteFill>
      <Heading>The replay</Heading>
      <Terminal title="zsh" width={560} at={at(cue, 0)} lines={[{at: at(cue, 0) + 6, kind: 'cmd', text: 'git rebase main'}]} style={{position: 'absolute', right: 96, top: 56}} />
      <Diagram nodes={nodes} edges={edges} />
    </AbsoluteFill>
  );
};

export const Code: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Heading>On the command line</Heading>
    <CodeWalk
      title="zsh"
      fontSize={36}
      code={`
git switch feature
git rebase main
# on a conflict: fix the files, then
git add <fixed files>
git rebase --continue
`}
      steps={[
        {at: at(cue, 0), lines: [1, 2]},
        {at: at(cue, 1), lines: [3, 4, 5]},
      ]}
      style={{position: 'absolute', left: 410, top: 230}}
    />
  </AbsoluteFill>
);
