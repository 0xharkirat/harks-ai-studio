import React from 'react';
import {AbsoluteFill, Composition, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  Boil, Chart, ChannelMark, FrameReserve, Grain, Guide, GuideSlot, Headline, LeaderLabel, NumberReveal, OrbitDiagram, Surface, ThemeRoot, TitleCard, WorldMap, GlobeRoute, Txt,
  useLayout, useTheme, EMOTIONS, type Emotion,
} from '../lib';

// The contact sheet: every scene of the library, 16:9 and 9:16, in any theme (--props='{"theme":"B"}').
// Sample data only. Nothing here is a claim for a video.

export const FPS = 30;
const SAMPLE = 'sample data for the design test';

const ROUTE = {from: [66.5664, 25.3811] as [number, number], bearing: 213, km: 14000};
const MAP_T = {pin: 20, aim: 70, boat: 50, routeStart: 110, routeEnd: 250, question: 252, end: 330, focus: 60};

const Title = () => <><TitleCard at={0} kicker="For Curious Beings" title="The Longest Straight Line You Can Sail Is 32,090 km" subtitle="We checked it." /><ChannelMark /></>;
const Number_ = () => <><NumberReveal at={0} value={32090} unit="km" label="The longest straight line a ship can sail without touching land" source={SAMPLE} /><ChannelMark /></>;
const MapScene = () => (
  <>
    <WorldMap route={ROUTE} start={{name: 'Sonmiani Beach', sub: 'Pakistan'}} t={MAP_T} distanceLabel="Distance sailed" />
    <Headline text="How far can you go before you hit land?" at={256} />
    <ChannelMark />
  </>
);
const MapClosest = () => (
  <>
    <WorldMap route={ROUTE} start={{name: 'Sonmiani Beach', sub: 'Pakistan'}} t={MAP_T} distanceLabel="Distance sailed" closest={{atKm: 12550, land: [-26.26, -58.49], name: 'South Sandwich Islands', at: 275}} />
    <ChannelMark />
  </>
);
const GlobeScene = () => (
  <>
    <GlobeRoute route={ROUTE} start={{name: 'Sonmiani Beach', sub: 'Pakistan'}} t={{...MAP_T, end: 330}} distanceLabel="Distance sailed" />
    <Headline text="How far can you go before you hit land?" at={256} />
    <ChannelMark />
  </>
);

const Target: React.FC = () => {
  const L = useLayout();
  const theme = useTheme();
  const f = useCurrentFrame();
  const x = L.content.x + L.content.w * (L.tall ? 0.42 : 0.4);
  const y = L.content.y + L.content.h * 0.55;
  const k = Math.min(1, f / 12);
  return (
    <AbsoluteFill>
      <Surface />
      <Boil>
        <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
          <circle cx={x} cy={y} r={150 * L.u} fill={theme.palette.accent2} opacity={0.25 * k} />
          <circle cx={x} cy={y} r={150 * L.u} fill="none" stroke={theme.palette.ink} strokeWidth={5 * L.u} opacity={0.6 * k} />
        </svg>
      </Boil>
      <LeaderLabel at={[x + 60 * L.u, y - 60 * L.u]} dir="ne" dist={150 * L.u} show={Math.min(1, Math.max(0, (f - 14) / 16))} lines={[{text: 'Closest to land', role: 'tag', color: theme.palette.panelMuted}, {text: 'Montagu Island', role: 'label', kind: 'display', color: theme.palette.panelText}, {text: 'South Sandwich Islands', role: 'tag', color: theme.palette.panelMuted, caps: false}]} />
    </AbsoluteFill>
  );
};

const Orbit = () => (
  <>
    <OrbitDiagram
      title="Where the satellites are, to scale"
      earthAt={0}
      hoursPerSecond={1}
      orbits={[
        {name: 'ISS', altitudeKm: 420, periodH: 1.53, count: 1, detail: '420 km', at: 14},
        {name: 'GPS', altitudeKm: 20200, periodH: 11.97, count: 6, detail: '20,200 km', at: 40},
        {name: 'Geostationary', altitudeKm: 35786, periodH: 23.93, count: 1, detail: '35,786 km', at: 66},
      ]}
      flyby={{name: 'Asteroid flyby', closestKm: 31600, vInfKmS: 5.8, at: 92, end: 200, gapLabel: '31,600 km', detail: 'closest: 31,600 km', angle: -32}}
    />
    <ChannelMark />
  </>
);

const BARS = [
  {label: 'Pacific Ocean', value: 165.25},
  {label: 'Atlantic Ocean', value: 106.46},
  {label: 'Indian Ocean', value: 70.56, highlight: true},
  {label: 'Southern Ocean', value: 21.96},
  {label: 'Arctic Ocean', value: 14.06},
];
const ChartBar = () => <><Chart kind="bar" at={0} title="How big is each ocean?" data={BARS} unit="M km²" decimals={1} source={SAMPLE} /><ChannelMark /></>;
const SCAT = [
  {x: 20, y: 8}, {x: 35, y: 21}, {x: 50, y: 17}, {x: 62, y: 33}, {x: 75, y: 29}, {x: 88, y: 46}, {x: 41, y: 12}, {x: 70, y: 40, highlight: true, label: 'Our sample'}, {x: 28, y: 19}, {x: 55, y: 26},
];
const ChartScatter = () => <><Chart kind="scatter" at={0} title="Distance against clearance" points={SCAT} xLabel="Distance sailed (km)" yLabel="Clearance (km)" xTicks={[0, 25, 50, 75, 100]} yTicks={[0, 20, 40, 60]} source={SAMPLE} /><ChannelMark /></>;

const MOMENTS: Record<Emotion, string> = {happy: 'happy', excited: 'excited', determined: 'determined', look: 'look', wonder: 'wonder', confused: 'confused', proud: 'proud'};
const Guides: React.FC = () => {
  const L = useLayout();
  const cols = L.tall ? 2 : 4;
  const rows = Math.ceil(EMOTIONS.length / cols);
  const cw = L.content.w / cols;
  const ch = L.content.h / rows;
  return (
    <AbsoluteFill style={{background: '#fbf6e8'}}>
      {EMOTIONS.map((e, i) => {
        const cx = L.content.x + cw * (i % cols) + cw / 2;
        const top = L.content.y + ch * Math.floor(i / cols);
        const size = Math.min(ch * 0.62, cw * 0.62);
        return (
          <React.Fragment key={e}>
            <Guide id={`g-${e}`} moments={[{at: 0, emotion: e}]} x={cx} y={top + ch * 0.34 + size * 0.4} size={size} />
            <div style={{position: 'absolute', left: cx - cw / 2, width: cw, top: top + ch * 0.8, textAlign: 'center'}}>
              <Txt role="label" kind="display" color="#242730" align="center">{MOMENTS[e]}</Txt>
            </div>
          </React.Fragment>
        );
      })}
      <ChannelMark />
    </AbsoluteFill>
  );
};

const GuideSlotScene: React.FC = () => (
  <>
    <WorldMap route={ROUTE} start={{name: 'Sonmiani Beach', sub: 'Pakistan'}} t={MAP_T} endMark={null} />
    <GuideSlot moments={[{at: 0, emotion: 'wonder'}]} />
    <ChannelMark />
  </>
);

type Item = {id: string; node: React.ComponentType; frame: number; frames: number};
export const ITEMS: Item[] = [
  {id: 'title', node: Title, frame: 70, frames: 120},
  {id: 'number', node: Number_, frame: 110, frames: 150},
  {id: 'map', node: MapScene, frame: 280, frames: 330},
  {id: 'map-closest', node: MapClosest, frame: 328, frames: 330},
  {id: 'map-early', node: MapScene, frame: 75, frames: 330},
  {id: 'map-mid', node: MapScene, frame: 185, frames: 330},
  {id: 'globe', node: GlobeScene, frame: 290, frames: 330},
  {id: 'label', node: Target, frame: 60, frames: 90},
  {id: 'orbit', node: Orbit, frame: 180, frames: 240},
  {id: 'chart-bar', node: ChartBar, frame: 100, frames: 120},
  {id: 'chart-scatter', node: ChartScatter, frame: 110, frames: 120},
  {id: 'guide', node: Guides, frame: 20, frames: 60},
  {id: 'guide-slot', node: GuideSlotScene, frame: 150, frames: 200},
];

// The theme is not a prop here: ThemeRoot reads the render flag (input prop "theme"), as in a real video.
const Wrap: React.FC<{Node: React.ComponentType}> = ({Node}) => (
  <ThemeRoot>
    <AbsoluteFill>
      <FrameReserve>
        <Node />
      </FrameReserve>
      <Grain />
    </AbsoluteFill>
  </ThemeRoot>
);

const COMPONENTS = new Map<string, React.FC>(ITEMS.map((it) => [it.id, () => <Wrap Node={it.node} />]));

export const GalleryCompositions: React.FC = () => (
  <>
    {ITEMS.flatMap((it) => [
      <Composition key={`${it.id}-wide`} id={`${it.id}-wide`} component={COMPONENTS.get(it.id)!} durationInFrames={it.frames} fps={FPS} width={1920} height={1080} />,
      <Composition key={`${it.id}-tall`} id={`${it.id}-tall`} component={COMPONENTS.get(it.id)!} durationInFrames={it.frames} fps={FPS} width={1080} height={1920} />,
    ])}
  </>
);

void useVideoConfig;
