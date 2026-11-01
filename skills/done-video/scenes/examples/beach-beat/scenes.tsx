import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ChannelMark, GuideSlot, Headline, WorldMap, at, type GuideMoment} from './lib';

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// The style board's 14-second beat, built from the library: "Pick a beach ... how far can you go before you hit land?".
// One scene, 4 lines. The same component renders in any theme (A, B, C, D) and in 16:9 or 9:16; nothing here names a theme.
//
//   line 1  "Pick a beach."                          the start pin drops, with its label
//   line 2  "Point your boat at the horizon."        the boat appears, the dotted aim line leaves the beach
//   line 3  "Now sail in a perfectly straight line." the great-circle route draws, the counter ticks
//   line 4  "How far can you go before you hit land?" the "?" lands and the question is on screen

const ROUTE = {from: [66.5664, 25.3811] as [number, number], bearing: 213, km: 14000};

export const Beat: React.FC<SceneProps> = ({cue, frames}) => {
  const c0 = at(cue, 0);
  const c1 = at(cue, 1);
  const c2 = at(cue, 2);
  const c3 = at(cue, 3);
  const t = {pin: c0 + 17, boat: c1 + 5, aim: c1 + 27, focus: c1, routeStart: c2 + 5, routeEnd: c3 + 12, question: c3 + 12, end: frames};

  // The guide acts one emotion per moment. Theme B keeps it on screen; theme C shows it at the 2 story turns; theme A has none.
  const moments: GuideMoment[] = [
    {at: 0, emotion: 'happy'},
    {at: c1, emotion: 'look'},
    {at: c2 - 4, emotion: 'determined'},
    {at: t.routeEnd - 4, emotion: 'wonder'},
  ];
  const turns: [number, number][] = [
    [c0 - 8, c1 + 20],
    [t.routeEnd - 12, frames],
  ];

  return (
    <AbsoluteFill>
      <WorldMap route={ROUTE} start={{name: 'Sonmiani Beach', sub: 'Pakistan'}} t={t} distanceLabel="Distance sailed" />
      <Headline text="How far can you go before you hit land?" at={c3 + 3} />
      <GuideSlot moments={moments} turns={turns} />
      <ChannelMark />
    </AbsoluteFill>
  );
};
