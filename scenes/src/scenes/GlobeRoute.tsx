import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {geoDistance, geoGraticule, geoInterpolate, geoOrthographic, geoPath} from 'd3-geo';
import {fmtKm, land, makeRoute, type LonLat, type Route, type RouteSpec} from '../geo/geo';
import {clamp01, easeInOut, easeInOutSine, easeOut, lerp, win} from '../core/motion';
import {Boil, Surface} from '../core/paper';
import {useTheme} from '../core/ThemeContext';
import {useLayout} from '../core/layout';
import {Plate, LeaderLine, plateSize, type PlateLine} from '../core/ui';
import {BoatBadge, LockBrackets, PinDot, QuestionBadge} from '../core/marks';
import {placeLabel} from './LeaderLabel';
import type {MapTimeline} from './WorldMap';

/*
 * Globe with a route: an orthographic d3-geo globe, redrawn every frame as SVG. Natural Earth 50 m land (public domain)
 * through world-atlas (ISC). The route is a true great circle: d3 draws the arcs and clips them at the limb.
 * Camera ideas: lemo-opuscar (MIT) satellite-briefing "thin atmosphere rim, limb shading, the camera never stops".
 */

const rad = Math.PI / 180;
const deg = 180 / Math.PI;
const toVec = ([lon, lat]: LonLat): [number, number, number] => {
  const l = lon * rad;
  const f = lat * rad;
  return [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
};
const fromVec = (v: [number, number, number]): LonLat => {
  const n = Math.hypot(...v) || 1;
  return [Math.atan2(v[1], v[0]) * deg, Math.asin(v[2] / n) * deg];
};
const cross = (a: number[], b: number[]): [number, number, number] => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const routeProgress = (f: number, t: MapTimeline) => {
  const x = win(f, t.routeStart, t.routeEnd);
  return 0.55 * x + 0.45 * easeInOutSine(x);
};

const gratGlobe = geoGraticule().step([15, 15])();

// deterministic stars
const STARS = (() => {
  let s = 1234567;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  return Array.from({length: 190}, () => ({x: rnd(), y: rnd(), r: 0.8 + rnd() * 2.1, a: 0.25 + rnd() * 0.65, f: 0.5 + rnd() * 1.8, ph: rnd() * 6.28}));
})();

function makeCamera(route: Route, t: MapTimeline, fps: number, tall: boolean, end: number) {
  const sec = (fr: number) => fr / fps;
  const startC: LonLat = [route.from[0] - 4, route.from[1] + 3];
  const C0: LonLat = [route.from[0] - 114, 14];
  const pole = (() => {
    const s = toVec(route.from);
    const e = toVec(route.at(Math.min(3000, route.km * 0.2)));
    const c = cross(s, e);
    const n = Math.hypot(...c);
    const pl = c.map((x) => x / n) as [number, number, number];
    return fromVec(pl)[1] >= 0 ? pl : (pl.map((x) => -x) as [number, number, number]);
  })();
  const tiltToward = (c: LonLat, amount: number): LonLat => {
    const v = toVec(c);
    const a = amount * rad;
    return fromVec([v[0] * Math.cos(a) + pole[0] * Math.sin(a), v[1] * Math.cos(a) + pole[1] * Math.sin(a), v[2] * Math.cos(a) + pole[2] * Math.sin(a)]);
  };
  const pin = sec(t.pin);
  const rs = sec(t.routeStart);
  const re = sec(t.routeEnd);
  const dur = sec(end);
  return (f: number) => {
    const tt = Math.min(Math.max(sec(f), 0), dur);
    const spinEnd = Math.max(1.5, pin + 1.0);
    const u1 = 1 - Math.pow(1 - win(tt, 0, spinEnd), 3);
    let c = geoInterpolate(C0, startC)(u1) as LonLat;
    const p = routeProgress(f, t);
    const km = p * route.km;
    const tip = route.at(km);
    const mid = geoInterpolate(route.from, tip)(0.5) as LonLat;
    const tilt = 22 * easeInOutSine(p);
    const target = tilt > 0.01 ? tiltToward(mid, tilt) : mid;
    const blend = easeInOut(win(tt, rs - 0.4, re + 0.4));
    if (tt > spinEnd) c = geoInterpolate(startC, target)(blend) as LonLat;
    const zIn = easeInOut(win(tt, spinEnd - 0.1, spinEnd + 2.7));
    const zOut = easeInOut(win(tt, rs - 0.2, re + 0.2));
    const intro = 0.84 + 0.16 * (1 - Math.pow(1 - win(tt, 0, 1.8), 3));
    const closeUp = tall ? 1.4 : 1.55;
    let k = intro * (1 + (closeUp - 1) * zIn * (1 - zOut));
    k *= 1 + 0.03 * easeInOutSine(win(tt, re, dur));
    const lon = c[0] - 2.2 * Math.max(0, tt - re) + 1.6 * win(tt, spinEnd, rs) * (1 - blend);
    return {lon, lat: c[1], k};
  };
}

export const GlobeRoute: React.FC<{
  route: RouteSpec;
  start: {name: string; sub?: string};
  t: MapTimeline;
  vehicle?: boolean;
  endMark?: '?' | null;
  ticks?: number[];
  distanceLabel?: string;
  counter?: boolean;
}> = ({route: routeSpec, start, t, vehicle = true, endMark = '?', ticks, distanceLabel = 'Distance', counter = true}) => {
  const frame = useCurrentFrame();
  const {width: W, height: H, fps} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const P = theme.palette;
  const G = P.globe;
  const hand = theme.line.boil;
  const u = L.u;
  const route = useMemo(() => makeRoute(routeSpec), [JSON.stringify(routeSpec)]);
  const end = t.end ?? t.routeEnd + 3 * fps;
  const camera = useMemo(() => makeCamera(route, t, fps, L.tall, end), [route, JSON.stringify(t), fps, L.tall, end]);
  const {lon, lat, k} = camera(frame);
  const sec = frame / fps;

  // the globe sits in the main area: right of the plate column in 16:9, the band between the plates in 9:16
  const cx = L.main.x + L.main.w / 2;
  const cy = L.main.y + L.main.h / 2;
  const R0 = L.tall ? L.content.w * 0.5 : Math.min(L.main.w * 0.5, L.content.h * 0.49);
  const r = R0 * k;
  const proj = geoOrthographic().translate([cx, cy]).scale(r).rotate([-lon, -lat, 0]).clipAngle(90).precision(0.35);
  const path = geoPath(proj);
  const center: LonLat = [lon, lat];
  const landD = path(land as never) ?? '';
  const gratD = path(gratGlobe as never) ?? '';

  const p = routeProgress(frame, t);
  const km = p * route.km;
  const tipLL = route.at(km);
  const routeD = km > 1 ? path({type: 'LineString', coordinates: route.points(km, 60)} as never) ?? '' : '';
  const vis = (ll: LonLat) => Math.cos(geoDistance(ll, center));
  const px = (ll: LonLat) => proj(ll) as [number, number];
  const startPx = px(route.from);
  const tipPx = px(tipLL);
  const startVis = clamp01((vis(route.from) - 0.12) / 0.2);
  const tipVis = clamp01((vis(tipLL) - 0.1) / 0.2);

  const aimAt = t.aim ?? t.pin + Math.round(2.1 * fps);
  const aimIn = easeOut(win(frame, aimAt, aimAt + 0.9 * fps));
  const aimOut = 1 - easeOut(win(frame, t.routeStart - 0.1 * fps, t.routeStart + 0.5 * fps));
  const aimD = aimIn > 0 && aimOut > 0 ? path({type: 'LineString', coordinates: route.points(2200 * aimIn, 60)} as never) ?? '' : '';

  const badge = (L.tall ? 120 : 104) * u;
  const qSize = 140 * u;
  const ahead = px(route.at(km + 400));
  const hx = ahead[0] - tipPx[0];
  const hy = ahead[1] - tipPx[1];
  const hl = Math.hypot(hx, hy) || 1;
  const qx = tipPx[0] + (hx / hl) * qSize * 1.1;
  const qy = tipPx[1] + (hy / hl) * qSize * 1.1;
  const qAt = t.question ?? t.routeEnd;
  const qPop = endMark ? win(frame, qAt, qAt + 0.55 * fps) : 0;
  const qPulse = frame - qAt > 0.6 * fps ? (((frame - qAt) / fps) % 1.6) / 1.6 : 0;
  const qVis = clamp01((vis(route.at(km + 1700)) - 0.05) / 0.2);

  const shownKm = Math.round(km / 10) * 10;
  const widest = Math.round(route.km / 10) * 10;
  const z0 = L.zones.stat;
  const counterLines: PlateLine[] = [
    {text: distanceLabel, role: 'tag', color: P.panelMuted},
    {text: shownKm.toLocaleString('en-US'), sizeText: widest.toLocaleString('en-US'), role: L.tall ? 'display' : 'heading', kind: 'number', color: P.panelText, suffix: {text: 'km', role: L.tall ? 'body' : 'label'}},
  ];

  const counterBox = plateSize(L, theme, counterLines, {x: 34 * u, y: 22 * u});
  const counterRect = {x: z0.x - 10 * u, y: (L.tall ? z0.y + z0.h - counterBox.h : z0.y) - 10 * u, w: counterBox.w + 20 * u, h: counterBox.h + 20 * u};
  const zs = L.zones;
  const hud = [
    counterRect,
    {x: zs.headline.x - 10, y: zs.headline.y - 10, w: zs.headline.w + 20, h: zs.headline.h + 20},
    {x: zs.mark.x - 12, y: zs.mark.y - 12, w: zs.mark.w + 24, h: zs.mark.h + 24},
  ];
  const bounds = {x: 24 * u, y: 24 * u, w: W - 48 * u, h: H - 48 * u};

  // ticks
  const tickKm = ticks ?? Array.from({length: Math.floor(route.km / 2500)}, (_, i) => (i + 1) * 2500);
  const tickEls: React.ReactNode[] = [];
  const tickPlates: React.ReactNode[] = [];
  tickKm.forEach((d, i) => {
    if (km < d) return;
    const ll = route.at(d);
    const v = clamp01((vis(ll) - 0.1) / 0.2);
    if (v <= 0) return;
    const q = px(ll);
    const labelled = i % 2 === 1 || tickKm.length < 3;
    const a = easeOut(clamp01((km - d) / 250)) * v;
    tickEls.push(<circle key={d} cx={q[0]} cy={q[1]} r={(labelled ? 11 : 8) * u} fill={hand ? P.bg : '#fff'} stroke={P.accent} strokeWidth={4 * u} opacity={a} />);
    if (labelled) {
      const lines: PlateLine[] = [{text: fmtKm(d), role: 'tag', kind: 'display', color: P.panelText}];
      const pl = placeLabel(L, theme, q, lines, {dir: 'ne', dist: 30 * u, bounds, avoid: hud, pad: {x: 18 * u, y: 6 * u}});
      if (!pl.hidden) tickPlates.push(<Plate key={`t${d}`} x={pl.x} y={pl.y} anchor={pl.anchor} lines={lines} show={a} slide={false} bar={false} pad={{x: 18 * u, y: 6 * u}} id={`gtick${d}`} />);
    }
  });

  // the start label
  const tagIn = easeOut(win(frame, t.pin + 0.35 * fps, t.pin + 0.9 * fps)) * startVis;
  const cmp = easeInOutSine(win(frame, t.routeStart - 0.35 * fps, t.routeStart + 0.5 * fps));
  const nameRole = L.tall ? 'body' : 'label';
  const bigLines: PlateLine[] = [{text: start.name, role: nameRole, kind: 'display', color: P.panelText}, ...(start.sub ? [{text: start.sub, role: 'tag' as const, color: P.panelMuted, caps: false}] : [])];
  const smallLines: PlateLine[] = [{text: start.name, role: 'tag', kind: 'display', color: P.panelText}];
  const bigPlace = placeLabel(L, theme, startPx, bigLines, {dir: 'nw', dist: 96 * u, bounds, avoid: hud});
  const smallPlace = placeLabel(L, theme, startPx, smallLines, {dir: 'nw', dist: 70 * u, bounds, avoid: hud});

  const boatAt = t.boat ?? t.pin + Math.round(2.2 * fps);
  const boatPop = vehicle ? win(frame, boatAt, boatAt + 0.45 * fps) * tipVis : 0;
  const lock = win(frame, t.pin, t.pin + 0.55 * fps) * startVis;
  const bob = Math.sin(sec * 3.1) * 3 * u;
  const counterShow = win(frame, boatAt, boatAt + 0.5 * fps);
  const landed = win(frame, t.routeEnd, t.routeEnd + 0.5 * fps);
  const sx = -lon * 2.2;
  const fadeIn = clamp01(sec / 0.6);
  const lx = cx - r * 0.38;
  const ly = cy - r * 0.42;
  void lerp;

  return (
    <AbsoluteFill style={{background: G.space2, overflow: 'hidden'}}>
      <Surface />
      <Boil>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <radialGradient id="fcb-space" cx={cx / W} cy={cy / H} r="0.85">
              <stop offset="0" stopColor={G.space0} />
              <stop offset="0.55" stopColor={G.space1} />
              <stop offset="1" stopColor={G.space2} />
            </radialGradient>
            <radialGradient id="fcb-halo" cx={cx} cy={cy} r={r * 1.32} gradientUnits="userSpaceOnUse">
              <stop offset={1 / 1.32 - 0.01} stopColor={G.halo} stopOpacity="0.7" />
              <stop offset={1 / 1.32 + 0.06} stopColor="#3b8fe6" stopOpacity="0.32" />
              <stop offset="1" stopColor="#1d5fc0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="fcb-sea" cx={lx} cy={ly} r={r * 1.5} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={G.sea0} />
              <stop offset="0.45" stopColor={G.sea1} />
              <stop offset="1" stopColor={G.sea2} />
            </radialGradient>
            <radialGradient id="fcb-shade" cx={lx} cy={ly} r={r * 1.55} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.62" stopColor="#00081a" stopOpacity="0.26" />
              <stop offset="1" stopColor="#00081a" stopOpacity="0.8" />
            </radialGradient>
            <radialGradient id="fcb-rim" cx={cx} cy={cy} r={r} gradientUnits="userSpaceOnUse">
              <stop offset="0.8" stopColor={G.rim} stopOpacity="0" />
              <stop offset="0.96" stopColor={G.rim} stopOpacity="0.28" />
              <stop offset="1" stopColor="#b8e6ff" stopOpacity="0.7" />
            </radialGradient>
            <radialGradient id="fcb-landfill" cx={lx} cy={ly} r={r * 1.6} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={G.land0} />
              <stop offset="0.5" stopColor={G.land1} />
              <stop offset="1" stopColor={G.land2} />
            </radialGradient>
            <pattern id="fcb-ghatch" width={15 * u} height={15 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={15 * u} stroke={P.map.landHatch} strokeWidth={2.6 * u} />
            </pattern>
            <filter id="fcb-glow" x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <path id="fcb-gland" d={landD} />
          </defs>
          {!hand && <rect width={W} height={H} fill="url(#fcb-space)" />}
          {!hand &&
            STARS.map((s, i) => {
              const x = (((s.x * W + sx * (0.4 + s.r * 0.2)) % W) + W) % W;
              const a = s.a * (0.7 + 0.3 * Math.sin(sec * s.f + s.ph)) * fadeIn;
              return <circle key={i} cx={x} cy={s.y * H} r={s.r * u} fill="#cfe4ff" opacity={a} />;
            })}
          {!hand && <circle cx={cx} cy={cy} r={r * 1.32} fill="url(#fcb-halo)" />}
          <circle cx={cx} cy={cy} r={r} fill={hand ? G.sea0 : 'url(#fcb-sea)'} stroke={hand ? P.ink : 'none'} strokeWidth={6 * u} />
          <path d={gratD} fill="none" stroke={G.grid} strokeWidth={(hand ? 2.4 : 1.6) * u} />
          {hand ? (
            <>
              <use href="#fcb-gland" fill={P.bg} />
              <use href="#fcb-gland" fill={G.land0} transform={`translate(${6 * u} ${5 * u})`} />
              <use href="#fcb-gland" fill="url(#fcb-ghatch)" />
              <use href="#fcb-gland" fill="none" stroke={G.coast} strokeWidth={4 * u} strokeLinejoin="round" />
            </>
          ) : (
            <>
              <use href="#fcb-gland" fill="url(#fcb-landfill)" stroke={G.coast} strokeWidth={1.3 * u} strokeLinejoin="round" />
              <circle cx={cx} cy={cy} r={r} fill="url(#fcb-shade)" />
              <circle cx={cx} cy={cy} r={r} fill="url(#fcb-rim)" />
            </>
          )}
          {aimD && <path d={aimD} fill="none" stroke={hand ? P.ink : '#fff'} strokeWidth={8 * u} strokeLinecap="round" strokeDasharray={`0.1 ${24 * u}`} strokeDashoffset={-sec * 34 * u} opacity={aimOut} />}
          {routeD &&
            (hand ? (
              <path d={routeD} fill="none" stroke={P.accent} strokeWidth={13 * u} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${30 * u} ${20 * u}`} />
            ) : (
              <>
                <path d={routeD} fill="none" stroke={P.accent} strokeWidth={20 * u} strokeLinecap="round" strokeLinejoin="round" filter="url(#fcb-glow)" opacity={0.95} />
                <path d={routeD} fill="none" stroke={P.accent} strokeWidth={9 * u} strokeLinecap="round" strokeLinejoin="round" />
                <path d={routeD} fill="none" stroke={P.accentSoft} strokeWidth={2.8 * u} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ))}
          {tickEls}
          {tagIn > 0 && (
            <>
              <g opacity={1 - cmp}><LeaderLine from={bigPlace.from} to={bigPlace.to} show={tagIn} /></g>
              <g opacity={cmp}><LeaderLine from={smallPlace.from} to={smallPlace.to} show={tagIn} /></g>
            </>
          )}
        </svg>
        {tickPlates}
        {tagIn > 0 && <Plate x={bigPlace.x} y={bigPlace.y} anchor={bigPlace.anchor} lines={bigLines} show={tagIn * (1 - cmp)} slide={false} id="gtagbig" />}
        {tagIn > 0 && cmp > 0 && <Plate x={smallPlace.x} y={smallPlace.y} anchor={smallPlace.anchor} lines={smallLines} show={cmp * tagIn} slide={false} id="gtagsmall" bar={false} pad={{x: 22 * u, y: 8 * u}} />}
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <PinDot x={startPx[0]} y={startPx[1]} r={11 * u} show={lock} />
          <LockBrackets x={startPx[0]} y={startPx[1]} s={badge * 1.35} t={lock * (1 - win(frame, t.routeStart + 0.4 * fps, t.routeStart + fps))} />
          {qPop > 0 && qVis > 0 && tipVis > 0 && <path d={`M ${tipPx[0]} ${tipPx[1]} L ${qx} ${qy}`} stroke={hand ? P.ink : '#fff'} strokeWidth={8 * u} strokeLinecap="round" strokeDasharray={`0.1 ${22 * u}`} strokeDashoffset={-sec * 30 * u} opacity={clamp01(qPop * 2) * qVis} />}
          {vehicle && <BoatBadge x={tipPx[0]} y={tipPx[1] + bob} s={badge} pop={boatPop} ripple={sec > boatAt / fps + 0.3 && frame < t.routeStart + 0.2 * fps ? (frame - boatAt) / fps : -1} />}
          {endMark && (
            <g opacity={qVis}>
              <QuestionBadge x={qx} y={qy} s={qSize} pop={qPop} pulse={qPulse} />
            </g>
          )}
        </svg>
        {counter && (
          <div style={{position: 'absolute', left: 0, top: 0, transform: `scale(${1 + 0.07 * Math.sin(landed * Math.PI)})`, transformOrigin: `${z0.x}px ${z0.y + z0.h / 2}px`}}>
            <Plate x={z0.x} y={L.tall ? z0.y + z0.h : z0.y} anchor={L.tall ? 'bl' : 'tl'} lines={counterLines} show={counterShow} id="gcounter" />
          </div>
        )}
      </Boil>
    </AbsoluteFill>
  );
};
