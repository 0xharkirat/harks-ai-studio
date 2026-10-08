import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Checklist, CodeWalk, Diagram, DiagramEdge, DiagramNode, Heading, Title, within} from './explain';
import {at} from './ui';
import main from './hunks/main.json';
import local from './hunks/local.json';

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// Reference only: the scenes of a change video for commit ddb49c2 ("tts.provider switch, with macOS say as a
// free local voice"), made with explainer-video/CHANGE.md. It imports ./explain, ./ui and the hunks that
// scripts/hunk.dart wrote to src/hunks/, like a project does.

export const Intro: React.FC<SceneProps> = ({cue}) => (
  <Title at={at(cue, 0)} title="tts.provider" sub="Commit ddb49c2: a free local voice" subAt={at(cue, 1)} />
);

// Before and after: the ElevenLabs path stays, the config picks it, and macOS say joins as the second voice.
export const Change: React.FC<SceneProps> = ({cue, ends}) => {
  const w = (i: number, f: number) => within(cue, ends, i, f);
  const nodes: DiagramNode[] = [
    {id: 'tts', x: 820, y: 520, label: 'tts.dart', shape: 'box', at: w(0, 0.2)},
    {id: 'script', x: 330, y: 520, label: 'script.json', shape: 'box', at: w(0, 0.45)},
    {id: 'eleven', x: 1400, y: 360, label: 'ElevenLabs', shape: 'box', tone: 'amber', at: w(0, 0.8)},
    {id: 'key', x: 1290, y: 250, label: 'API key', shape: 'pill', tone: 'amber', at: w(1, 0.35)},
    {id: 'credits', x: 1500, y: 250, label: 'credits', shape: 'pill', tone: 'red', at: w(1, 0.9)},
    {id: 'config', x: 820, y: 250, label: 'config.json', shape: 'box', at: w(2, 0.55)},
    {id: 'say', x: 1400, y: 690, label: 'macOS say', shape: 'box', tone: 'green', at: w(3, 0.3), flash: w(3, 0.7)},
    {id: 'free', x: 1400, y: 800, label: 'free, offline', shape: 'pill', tone: 'green', at: w(3, 0.7)},
  ];
  const edges: DiagramEdge[] = [
    {from: 'script', to: 'tts', label: 'every line', at: w(0, 0.4)},
    {from: 'tts', to: 'eleven', at: w(0, 0.75)},
    {from: 'config', to: 'tts', label: 'tts.provider', tone: 'blue', at: w(2, 0.4)},
    // Drawn over the first arrow, so "default" lands on the words that name it.
    {from: 'tts', to: 'eleven', label: 'default', tone: 'amber', at: w(2, 0.85)},
    {from: 'tts', to: 'say', label: 'say', tone: 'green', at: w(3, 0.2)},
  ];
  return (
    <AbsoluteFill>
      <Heading>Before and after</Heading>
      <Diagram nodes={nodes} edges={edges} />
    </AbsoluteFill>
  );
};

// 1 real line from the rebase explainer, through the new path: the times are from its timings.raw.json.
export const Flow: React.FC<SceneProps> = ({cue, ends}) => {
  const w = (i: number, f: number) => within(cue, ends, i, f);
  const nodes: DiagramNode[] = [
    {id: 'line', x: 430, y: 260, label: 'Main has commits A and B.', shape: 'box', tone: 'text', at: w(0, 0.55)},
    {id: 'say', x: 1000, y: 260, label: 'say -v Aman', shape: 'box', tone: 'green', at: w(1, 0.15)},
    {id: 'wav', x: 1500, y: 260, label: 'line.wav', shape: 'box', tone: 'muted', at: w(1, 0.8)},
    {id: 'clip', x: 1500, y: 470, label: '1.39 s', shape: 'box', tone: 'yellow', at: w(2, 0.7)},
    {id: 'mp3', x: 1000, y: 470, label: 'setup.mp3', shape: 'box', at: w(3, 0.35), flash: w(4, 0.3)},
    {id: 'raw', x: 1000, y: 680, label: 'timings.raw.json', sub: 'start 0, end 1.39', shape: 'box', at: w(3, 0.75), flash: w(4, 0.3)},
    {id: 'tools', x: 400, y: 575, label: 'pad.dart, layout.dart', shape: 'box', tone: 'muted', at: w(4, 0.6)},
    {id: 'same', x: 400, y: 680, label: 'no change', shape: 'pill', tone: 'green', at: w(4, 0.9)},
  ];
  const edges: DiagramEdge[] = [
    {from: 'line', to: 'say', at: w(1, 0.3)},
    {from: 'say', to: 'wav', at: w(1, 0.75)},
    {from: 'wav', to: 'clip', label: 'ffmpeg trim', tone: 'yellow', at: w(2, 0.15)},
    {from: 'clip', to: 'mp3', label: 'join', at: w(3, 0.3)},
    {from: 'clip', to: 'raw', label: 'times', at: w(3, 0.7)},
    {from: 'mp3', to: 'tools', at: w(4, 0.65)},
    {from: 'raw', to: 'tools', at: w(4, 0.65)},
  ];
  return (
    <AbsoluteFill>
      <Heading>1 line, end to end</Heading>
      <Diagram nodes={nodes} edges={edges} />
    </AbsoluteFill>
  );
};

// The 2 windows of the tts.dart hunk that carry the change: the dispatch in main, and the provider switch.
export const Code: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Heading>In the code</Heading>
    <CodeWalk
      {...main}
      width={1720}
      fontSize={26}
      steps={[
        {at: at(cue, 0), lines: [66, 67, 68]},
        {at: at(cue, 1), lines: [69, 70, 71, 72]},
        {at: at(cue, 2), lines: []},
      ]}
      style={{position: 'absolute', left: 100, top: 150}}
    />
    <CodeWalk
      {...local}
      at={at(cue, 2)}
      width={1720}
      fontSize={26}
      steps={[
        {at: at(cue, 2), lines: [80, 81]},
        {at: at(cue, 3), lines: [81, 82]},
      ]}
      style={{position: 'absolute', left: 100, top: 580}}
    />
  </AbsoluteFill>
);

export const Checks: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Heading>What to check</Heading>
    <Checklist
      items={[
        {at: at(cue, 0), text: 'No `tts` block → still ElevenLabs'},
        {at: at(cue, 1), text: 'Wrong `tts.say.voice` → `tts.dart` stops, no silent fallback'},
        {at: at(cue, 2), text: '`check.dart` still gates a clone: accent and likeness'},
      ]}
    />
  </AbsoluteFill>
);
