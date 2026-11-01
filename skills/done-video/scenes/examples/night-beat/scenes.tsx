import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame} from 'remotion';
import {ChannelMark, Chart, GuideSlot, Headline, LeaderLabel, NightMap, NumberReveal, at, useLayout, useNightCamera, useTheme, win, type NightBox, type NightKey} from './lib';
import data from './night-data.json'; // made by make-night-data.py from the research files

export type SceneProps = {cue: number[]; ends: number[]; frames: number};

// Video 1, "Where on Earth Is the Night Brightest?": the first test beat. PLACEHOLDER narration (script.json says so).
// Internal test of the scene library with the new NightMap scene. Never published.
//
//   intro    NumberReveal: Singapore, at least 56 times the land average
//   night    NightMap: the world, then Singapore, then the Korean peninsula with a label on each side of the border
//   ranking  Chart: the top 10 countries by brightness per km2

const SOURCE = 'NASA Black Marble VNP46A2, 9 nights Jan to Sep 2025, our computation';
const LEVELS = ['night/night-L0.png', 'night/night-L1.png', 'night/night-L2.png'].map((f) => staticFile(f));

// "At least": 64 percent of Singapore's pixels sit at the top of the scale (38.2), so 56 is a floor (facts.md, section 2).
export const Intro: React.FC<SceneProps> = ({cue, frames}) => {
  const L = useLayout();
  // 16:9: the guide stands right of the number, between the label above it and the source below. 9:16: below the source. It covers no text.
  const zone = L.tall ? {...L.zones.guide, y: L.zones.stat.y - 20 * L.u} : {x: L.content.x + L.content.w - 300 * L.u, y: L.content.y + 290 * L.u, w: 300 * L.u, h: 270 * L.u};
  return (
    <AbsoluteFill>
      <NumberReveal at={at(cue, 0)} value={56} unit="x" label="At least: Singapore at night, against the average land on Earth" source={SOURCE} />
      <GuideSlot zone={zone} moments={[{at: 0, emotion: 'look'}, {at: at(cue, 0) + 62, emotion: 'wonder'}]} turns={[[at(cue, 0) + 40, frames]]} />
      <ChannelMark />
    </AbsoluteFill>
  );
};

const WORLD: NightBox = [-180, -58, 180, 84];
const SINGAPORE: NightBox = [102.6, 0.3, 105.0, 2.7];
// The box sits west of the peninsula's centre so the peninsula lands on the right of `main` and the 2 labels fit on its left.
const KOREA: NightBox = [121.0, 33, 129.2, 43];
const fix2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

export const Night: React.FC<SceneProps> = ({cue, frames}) => {
  const f = useCurrentFrame();
  const theme = useTheme();
  const L = useLayout();
  const P = theme.palette;
  const c1 = at(cue, 1);
  const c2 = at(cue, 2);
  const moveSg = 52;
  const moveKr = 52;
  const keys: NightKey[] = [
    {at: 0, box: WORLD, fit: 'content'},
    {at: c1 + 22, box: SINGAPORE, move: moveSg},
    {at: c2 + 30, box: KOREA, move: moveKr},
  ];
  const cam = useNightCamera(keys, frames);
  const krStart = c2 + 30 - moveKr;
  const sgShow = win(f, c1 + 30, c1 + 46) * (1 - win(f, krStart - 14, krStart));
  const krShow = (k: number) => win(f, c2 + 36 + k, c2 + 52 + k);
  // The guide stands in the sea east of Korea (16:9) or south of it (9:16), so it never covers the lights of the story.
  const guideZone = L.tall ? {...L.zones.guide, y: L.zones.stat.y - 20 * L.u} : {x: L.content.x + L.content.w - 230 * L.u, y: L.content.y + 200 * L.u, w: 230 * L.u, h: 230 * L.u};
  const num = (name: string, v: number): React.ComponentProps<typeof LeaderLabel>['lines'] => [
    {text: name, role: 'label', kind: 'display', color: P.panelText},
    {text: fix2(v), role: 'heading', kind: 'number', color: P.accent},
  ];
  return (
    <AbsoluteFill>
      <NightMap levels={LEVELS} camera={keys} end={frames} hideNames={['South Korea', 'North Korea']} />
      <LeaderLabel
        id="sg"
        at={cam.project([103.82, 1.35], f)}
        show={sgShow}
        dir="ne"
        lines={[
          {text: 'Singapore', role: 'label', kind: 'display', color: P.panelText},
          {text: '1st of 190', role: 'tag', color: P.panelMuted, caps: false},
        ]}
      />
      <LeaderLabel id="kr-north" at={cam.project([127.2, 38.55], f)} show={krShow(18)} dir="nw" lines={num('North Korea', data.korea.north)} />
      <LeaderLabel id="kr-south" at={cam.project([127.2, 37.55], f)} show={krShow(0)} dir="sw" lines={num('South Korea', data.korea.south)} />
      <Headline text="Brightness per km², whole country" at={c2 + 36} roles={L.tall ? undefined : ['label']} />
      <GuideSlot
        zone={guideZone}
        moments={[{at: 0, emotion: 'look'}, {at: c1 + 22, emotion: 'excited'}, {at: c2 + 30, emotion: 'confused'}]}
        turns={[[c1 + 10, c1 + 118], [c2 + 30, frames]]}
      />
      <ChannelMark />
    </AbsoluteFill>
  );
};

// 16:9 has no room for a title above 10 bars at the minimum text size (5 stacked rows per column fill the frame), so the
// narration names the measure there ("per square kilometre"). 9:16 has room and keeps the title.
export const Ranking: React.FC<SceneProps> = ({cue, frames}) => {
  const L = useLayout();
  return (
  <AbsoluteFill>
    <Chart
      kind="bar"
      at={at(cue, 0)}
      title={L.tall ? 'Brightness per km², top 10 of 190 countries' : undefined}
      data={data.top10.map((d) => ({label: `${d.rank}. ${d.name}`, value: d.value, highlight: d.rank === 1}))}
      decimals={1}
      source={SOURCE}
    />
    <GuideSlot moments={[{at: 0, emotion: 'proud'}]} turns={[[at(cue, 0) + 20, frames]]} />
    <ChannelMark />
  </AbsoluteFill>
  );
};
