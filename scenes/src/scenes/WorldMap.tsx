import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {interpolateZoom} from 'd3-interpolate';
import {geoGraticule, geoPath} from 'd3-geo';
import {
  WORLD_W, baseXY, borders, continentLabels, countryLabels, distanceKm, fmtKm, land, makeProjection, makeRoute, oceanLabels,
  type LonLat, type Route, type RouteSpec, type View,
} from '../geo/geo';
import {clamp01, easeInOut, easeInOutSine, easeOut, win} from '../core/motion';
import {Boil, Surface} from '../core/paper';
import {useTheme} from '../core/ThemeContext';
import {useLayout, type Layout, type Rect} from '../core/layout';
import {Plate, Txt, LeaderLine, plateSize, type PlateLine} from '../core/ui';
import {BoatBadge, LockBrackets, PinDot, QuestionBadge} from '../core/marks';
import {placeLabel} from './LeaderLabel';
import {measureText} from '../core/measure';

/*
 * World map: a flat Natural Earth map, re-projected every frame so lines and type stay crisp at any zoom.
 * Land and borders are Natural Earth 50 m (public domain) through world-atlas (ISC).
 * The route is a great circle. A distance counter, a closest-approach callout, and tick labels hang on it.
 * Camera ideas: lemo-opuscar (MIT) satellite-briefing "distance interpolates in log space, holds keep a 2-5 % creep";
 * labels attach to the ground with a leader line.
 */

export interface MapTimeline {
  /** the start pin drops and its label appears */
  pin: number;
  /** the dotted aim line leaves the start */
  aim?: number;
  /** the vehicle and the counter appear */
  boat?: number;
  routeStart: number;
  routeEnd: number;
  /** the "?" past the tip */
  question?: number;
  /** the camera has settled on the start (default pin + 1.25 s) */
  focus?: number;
  /** last frame of the scene, for the closing creep (default routeEnd + 3 s) */
  end?: number;
}

export interface ClosestApproach {
  /** how far along the route the point is, in km */
  atKm: number;
  /** the nearest land to that point */
  land: LonLat;
  /** a name for the land, for the label */
  name: string;
  /** frame the callout appears; the camera moves in on it */
  at: number;
}

export interface WorldMapProps {
  route: RouteSpec;
  start: {name: string; sub?: string};
  t: MapTimeline;
  /** a vehicle badge rides the tip of the route (default true) */
  vehicle?: boolean;
  /** what sits past the tip: a "?" (default) or nothing */
  endMark?: '?' | null;
  /** km marks along the route; every second one is labelled */
  ticks?: number[];
  distanceLabel?: string;
  /** the distance counter (default true) */
  counter?: boolean;
  closest?: ClosestApproach;
  /** place names on the map: continents, countries, oceans (default true) */
  names?: boolean;
}

const routeProgress = (f: number, t: MapTimeline) => {
  const x = win(f, t.routeStart, t.routeEnd);
  return 0.55 * x + 0.45 * easeInOutSine(x);
};

interface Camera {
  view: (f: number) => View;
  wCoast: number;
}

function buildCamera(W: number, H: number, main: Rect, route: Route, t: MapTimeline, fps: number, tall: boolean, closest?: ClosestApproach): Camera {
  const startB = baseXY(route.from);
  const wCoast = (WORLD_W * (tall ? 5.1 : 16)) / 360;
  const anchor: [number, number] = [main.x + main.w * 0.58, main.y + main.h * 0.46];
  const coastView = (w: number): View => {
    const upp = w / W;
    return [startB[0] - (anchor[0] - W / 2) * upp, startB[1] - (anchor[1] - H / 2) * upp, w];
  };
  const worldV: View = [0, 0, WORLD_W * 1.04];
  const zoom = interpolateZoom(worldV, coastView(wCoast));
  const end = t.end ?? t.routeEnd + 3 * fps;
  const focus = t.focus ?? t.pin + Math.round(1.25 * fps);
  const zs = Math.round(0.15 * fps);
  const samples: {km: number; xy: [number, number]}[] = [];
  for (let km = 0; km <= route.km; km += 250) samples.push({km, xy: baseXY(route.at(km))});
  samples.push({km: route.km, xy: baseXY(route.at(route.km))});
  const look = 0.16 * route.km;

  /** The view that frames the route so far (and a little ahead) inside the main rect. */
  const fit = (km: number, p: number): View => {
    const use = samples.filter((s) => s.km <= km);
    const tip = baseXY(route.at(km));
    const ahead = baseXY(route.at(km + look * easeInOutSine(p)));
    const pts = [...use.map((u) => u.xy), tip, ahead];
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const s of pts) {
      x0 = Math.min(x0, s[0]); x1 = Math.max(x1, s[0]);
      y0 = Math.min(y0, s[1]); y1 = Math.max(y1, s[1]);
    }
    const m = 0.14 * Math.max(x1 - x0, ((y1 - y0) * main.w) / main.h);
    x0 -= m; x1 += m; y0 -= m; y1 += m;
    const upp = Math.max((x1 - x0) / main.w, (y1 - y0) / main.h, wCoast / W);
    const cx = (x0 + x1) / 2 - (main.x + main.w / 2 - W / 2) * upp;
    const cy = (y0 + y1) / 2 - (main.y + main.h / 2 - H / 2) * upp;
    return [cx, cy, upp * W];
  };

  // van Wijk smooth zoom and pan: a move between 2 views never crosses empty ocean at the wrong zoom
  const blend = (a: View, b: View, k: number): View => (k <= 0 ? a : k >= 1 ? b : (interpolateZoom(a, b)(k) as View));

  // the closest-approach view: the gap between the route point and the land spans about half the main rect
  let near: View | null = null;
  if (closest) {
    const a = baseXY(route.at(closest.atKm));
    const b = baseXY(closest.land);
    const gap = Math.max(Math.hypot(a[0] - b[0], a[1] - b[1]), WORLD_W * 0.002);
    const upp = gap / (0.5 * Math.min(main.w, main.h));
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    near = [mx - (main.x + main.w / 2 - W / 2) * upp, my - (main.y + main.h / 2 - H / 2) * upp, upp * W];
  }

  const ideal = (f0: number): View => {
    const f = Math.min(Math.max(f0, 0), end);
    if (f < focus) return zoom(easeInOut(win(f, zs, focus))) as View;
    const push = 1 - 0.12 * easeInOutSine(win(f, focus, t.routeStart));
    if (f <= t.routeStart) return coastView(wCoast * push);
    const p = routeProgress(f, t);
    const km = p * route.km;
    const routeV = fit(km, p);
    // from the coast shot to the fit as the route grows, so the camera never jumps at the start
    let v = blend(coastView(wCoast * 0.88), routeV, easeInOutSine(clamp01(p / 0.18)));
    const creep = 1 - 0.05 * easeInOutSine(win(f, t.routeEnd, end));
    v = [v[0], v[1], v[2] * creep];
    if (near && closest) v = blend(v, near, easeInOut(win(f, closest.at, closest.at + Math.round(1.6 * fps))));
    return v;
  };

  // a small gaussian smoothing in time (stateless, so every frame renders on its own)
  const offs = [-9, -6, -3, 0, 3, 6, 9];
  const wts = [1, 3, 6, 8, 6, 3, 1];
  const wsum = wts.reduce((a, b) => a + b, 0);
  const view = (f: number): View => {
    let cx = 0, cy = 0, lw = 0;
    offs.forEach((o, i) => {
      const v = ideal(f + o);
      cx += v[0] * wts[i]; cy += v[1] * wts[i]; lw += Math.log(v[2]) * wts[i];
    });
    return [cx / wsum, cy / wsum, Math.exp(lw / wsum)];
  };
  return {view, wCoast};
}

const grat = geoGraticule().step([15, 15])();

/** Rects the labels of the map keep clear: the HUD plates and the guide. */
const hudRects = (L: Layout, guideOn: boolean, counter?: Rect): Rect[] => {
  const z = L.zones;
  const r: Rect[] = [
    counter ?? {x: z.stat.x - 10, y: z.stat.y - 10, w: z.stat.w + 20, h: z.stat.h + 20},
    {x: z.headline.x - 10, y: z.headline.y - 10, w: z.headline.w + 20, h: z.headline.h + 20},
    {x: z.mark.x - 12, y: z.mark.y - 12, w: z.mark.w + 24, h: z.mark.h + 24},
  ];
  if (guideOn) r.push(z.guide);
  return r;
};

export const WorldMap: React.FC<WorldMapProps> = ({route: routeSpec, start, t, vehicle = true, endMark = '?', ticks, distanceLabel = 'Distance', counter = true, closest, names = true}) => {
  const frame = useCurrentFrame();
  const {width: W, height: H, fps} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const P = theme.palette;
  const hand = theme.line.boil;
  const u = L.u;

  const route = useMemo(() => makeRoute(routeSpec), [JSON.stringify(routeSpec)]);
  const cam = useMemo(
    () => buildCamera(W, H, L.main, route, t, fps, L.tall, closest),
    [W, H, L.main.x, L.main.y, L.main.w, L.main.h, route, JSON.stringify(t), fps, L.tall, closest && closest.at + closest.atKm],
  );
  const tickKm = ticks ?? Array.from({length: Math.floor(route.km / 2500)}, (_, i) => (i + 1) * 2500);

  const v = cam.view(frame);
  const {proj, z} = makeProjection(v, W, H);
  const path = geoPath(proj);
  const landD = path(land as never) ?? '';
  const bordersD = path(borders as never) ?? '';
  const gratD = path(grat as never) ?? '';

  const p = routeProgress(frame, t);
  const km = p * route.km;
  const startPx = proj(route.from) as [number, number];
  const tipPx = proj(route.at(km)) as [number, number];
  const routeD = km > 1 ? path({type: 'LineString', coordinates: route.points(km, 40)} as never) ?? '' : '';
  const sec = frame / fps;

  // sizes that follow the type scale and the unit
  const ty = L.type;
  const badge = (L.tall ? 128 : 112) * u;
  const qSize = 150 * u;

  const shownKm = Math.round(km / 10) * 10;
  const z0 = L.zones.stat;
  const widest = Math.round(route.km / 10) * 10;
  const counterLines: PlateLine[] = [
    {text: distanceLabel, role: 'tag', color: P.panelMuted},
    {text: shownKm.toLocaleString('en-US'), sizeText: widest.toLocaleString('en-US'), role: L.tall ? 'display' : 'heading', kind: 'number', color: P.panelText, suffix: {text: 'km', role: L.tall ? 'body' : 'label'}},
  ];
  const counterBox = plateSize(L, theme, counterLines, {x: 34 * u, y: 22 * u});
  const counterRect: Rect = {x: z0.x - 10 * u, y: (L.tall ? z0.y + z0.h - counterBox.h : z0.y) - 10 * u, w: counterBox.w + 20 * u, h: counterBox.h + 20 * u};

  // dotted aim line out of the start, "point your boat at the horizon"
  const aimAt = t.aim ?? t.pin + Math.round(2.1 * fps);
  const aimIn = easeOut(win(frame, aimAt, aimAt + 0.9 * fps));
  const aimOut = 1 - easeOut(win(frame, t.routeStart - 0.1 * fps, t.routeStart + 0.5 * fps));
  const aimEnd = proj(route.at(Math.max(700 * aimIn, 1))) as [number, number];

  // the "?" sits a badge-length beyond the tip, along the route's heading on screen
  const ahead = proj(route.at(Math.min(km + 150, route.km + 150))) as [number, number];
  const hx = ahead[0] - tipPx[0];
  const hy = ahead[1] - tipPx[1];
  const hl = Math.hypot(hx, hy) || 1;
  const qDist = qSize * 1.1;
  const qx = tipPx[0] + (hx / hl) * qDist;
  const qy = tipPx[1] + (hy / hl) * qDist;
  const qAt = t.question ?? t.routeEnd;
  const qPop = endMark ? win(frame, qAt, qAt + 0.55 * fps) : 0;
  const qPulse = frame - qAt > 0.6 * fps ? (((frame - qAt) / fps) % 1.6) / 1.6 : 0;

  // ---------- labels ----------
  const avoid = hudRects(L, theme.guide.on, counterRect);
  const taken: Rect[] = [...avoid];
  const bounds: Rect = {x: 24 * u, y: 24 * u, w: W - 48 * u, h: H - 48 * u};
  const free = (x: number, y: number, w: number, h: number) => {
    const b: Rect = {x: x - w / 2 - 12 * u, y: y - h / 2 - 6 * u, w: w + 24 * u, h: h + 12 * u};
    if (b.x < bounds.x || b.x + b.w > bounds.x + bounds.w || b.y < bounds.y || b.y + b.h > bounds.y + bounds.h) return false;
    if (taken.some((r) => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y)) return false;
    taken.push(b);
    return true;
  };

  // the start label: a big tag up and beside the start, then a compact one once the camera pulls back
  const tagIn = easeOut(win(frame, t.pin + 0.35 * fps, t.pin + 0.9 * fps));
  const cmp = easeInOutSine(win(frame, t.routeStart - 0.35 * fps, t.routeStart + 0.5 * fps));
  const nameRole = L.tall ? 'body' : 'label';
  const bigLines: PlateLine[] = [{text: start.name, role: nameRole, kind: 'display', color: P.panelText}, ...(start.sub ? [{text: start.sub, role: 'tag' as const, color: P.panelMuted, caps: false}] : [])];
  const smallLines: PlateLine[] = [{text: start.name, role: 'tag', kind: 'display', color: P.panelText}];
  const bigPlace = placeLabel(L, theme, startPx, bigLines, {dir: 'ne', dist: 96 * u, bounds, avoid});
  const smallPlace = placeLabel(L, theme, startPx, smallLines, {dir: 'nw', dist: 70 * u, bounds, avoid});
  // the plates take their slots in the taken list so map names stay off them
  if (tagIn > 0) {
    taken.push({x: bigPlace.rect.x - 10 * u, y: bigPlace.rect.y - 10 * u, w: bigPlace.rect.w + 20 * u, h: bigPlace.rect.h + 20 * u});
    taken.push({x: smallPlace.rect.x - 10 * u, y: smallPlace.rect.y - 10 * u, w: smallPlace.rect.w + 20 * u, h: smallPlace.rect.h + 20 * u});
  }

  // keep the map names off the route that is drawn so far
  const routeBox = 90 * u;
  for (let d = 0; d <= km; d += route.km / 28) {
    const q = proj(route.at(d)) as [number, number];
    taken.push({x: q[0] - routeBox / 2, y: q[1] - routeBox / 2, w: routeBox, h: routeBox});
  }
  const names2: React.ReactNode[] = [];
  const halo = hand ? P.halo : P.map.land;
  const mapText = (key: string, x: number, y: number, node: React.ReactNode, o: number) => (
    <div key={key} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: o}}>
      {node}
    </div>
  );
  if (names) {
    // continents fade out as the camera zooms in
    const contA = 1 - clamp01((z - 1.7) / 0.6);
    if (contA > 0.02) {
      for (const c of continentLabels) {
        const q = proj(c.at) as [number, number];
        const lines = c.name.split(' ');
        const s = ty.spec('label', 'body', {tracking: 0.16 * ty.size('label')});
        const w = Math.max(...lines.map((l) => measureText(l, s)));
        if (!free(q[0], q[1], w, ty.size('label') * lines.length * 1.1)) continue;
        names2.push(mapText(`c${c.name}`, q[0], q[1], <Txt role="label" color={P.map.label} caps tracking={0.16} align="center" style={{opacity: 0.5}}>{lines.join('\n')}</Txt>, contA));
      }
    }
    // countries appear when they are big enough on screen
    const cFade = clamp01((z - 1.6) / 1.2);
    if (cFade > 0.02) {
      let n = 0;
      for (const c of countryLabels) {
        if (n > 12) break;
        const sizePx = Math.sqrt(c.area0) * z;
        const s = ty.spec('tag', 'body', {tracking: 0.12 * ty.size('tag')});
        const wTxt = measureText(c.name.toUpperCase(), s);
        const a = clamp01((sizePx * 1.15 - wTxt) / (wTxt * 0.35)) * cFade;
        if (a <= 0.02) continue;
        const q = proj(c.at) as [number, number];
        if (!free(q[0], q[1], wTxt, ty.size('tag'))) continue;
        n++;
        names2.push(mapText(`k${c.name}`, q[0], q[1], <Txt role="tag" color={P.map.label} caps tracking={0.12} halo={halo} style={{opacity: 0.85}}>{c.name}</Txt>, a));
      }
    }
    // oceans
    for (const o of oceanLabels) {
      const a = clamp01((z - o.zMin) / 0.4) * (1 - clamp01((z - o.zMax) / (o.zMax * 0.3)));
      if (a <= 0.02) continue;
      const q = proj(o.at) as [number, number];
      const oLines = o.name.split(' ');
      const s = ty.spec('label', 'serif');
      const w = Math.max(...oLines.map((l) => measureText(l, s)));
      if (!free(q[0], q[1], w, ty.size('label') * oLines.length * 1.05)) continue;
      names2.push(mapText(`o${o.name}`, q[0], q[1], <Txt role="label" kind="serif" color={P.map.oceanLabel} align="center" style={{lineHeight: 1.05}}>{oLines.join('\n')}</Txt>, a * 0.9));
    }
  }

  // distance ticks along the route
  const tickEls: React.ReactNode[] = [];
  const tickPlates: React.ReactNode[] = [];
  tickKm.forEach((d, i) => {
    if (km < d) return;
    const q = proj(route.at(d)) as [number, number];
    const labelled = i % 2 === 1 || tickKm.length < 3;
    const a = easeOut(clamp01((km - d) / 250));
    const r = (labelled ? 11 : 8) * u;
    tickEls.push(<circle key={`c${d}`} cx={q[0]} cy={q[1]} r={r} fill={hand ? P.bg : '#fff'} stroke={P.accent} strokeWidth={4 * u} opacity={a} />);
    if (labelled) {
      const lines: PlateLine[] = [{text: fmtKm(d), role: 'tag', kind: 'display', color: P.panelText}];
      const pl = placeLabel(L, theme, q, lines, {dir: 'ne', dist: 30 * u, bounds, avoid, pad: {x: 18 * u, y: 6 * u}});
      if (!pl.hidden) tickPlates.push(<Plate key={`t${d}`} x={pl.x} y={pl.y} anchor={pl.anchor} lines={lines} show={a} slide={false} bar={false} pad={{x: 18 * u, y: 6 * u}} id={`tick${d}`} />);
    }
  });

  // ---------- the closest-approach callout ----------
  let closestEl: React.ReactNode = null;
  let closestHtml: React.ReactNode = null;
  if (closest) {
    const show = easeOut(win(frame, closest.at, closest.at + 0.7 * fps));
    if (show > 0) {
      const a = proj(route.at(closest.atKm)) as [number, number];
      const b = proj(closest.land) as [number, number];
      const gap = distanceKm(route.at(closest.atKm), closest.land);
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const gapPx = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const lines: PlateLine[] = [
        {text: 'Closest to land', role: 'tag', color: P.panelMuted, caps: !hand},
        {text: Math.round(gap).toLocaleString('en-US'), role: L.tall ? 'display' : 'title', kind: 'number', color: P.panelText, suffix: {text: 'km', role: 'body'}},
        {text: closest.name, role: 'tag', color: P.panelMuted, caps: false},
      ];
      const pl = placeLabel(L, theme, mid, lines, {dir: 'ne', dist: Math.max(70 * u, gapPx * 0.2), bounds: {x: L.content.x, y: L.content.y, w: L.content.w, h: L.content.h}, avoid: hudRects(L, theme.guide.on, counterRect).slice(0, 1)});
      closestEl = (
        <g opacity={show}>
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={hand ? P.accent2 : '#fff'} strokeWidth={6 * u} strokeDasharray={`${14 * u} ${14 * u}`} strokeLinecap="round" />
          <circle cx={b[0]} cy={b[1]} r={9 * u} fill={P.map.coast} stroke="#fff" strokeWidth={3 * u} />
          <circle cx={a[0]} cy={a[1]} r={(16 + 6 * Math.sin(sec * 4)) * u} fill="none" stroke={P.accent} strokeWidth={5 * u} />
          <LeaderLine from={mid} to={[pl.x, pl.y]} show={show} dot />
        </g>
      );
      closestHtml = <Plate x={pl.x} y={pl.y} anchor={pl.anchor} lines={lines} show={show} slide={false} id="closest" />;
    }
  }

  // ---------- HUD: the distance counter ----------
  const counterShow = win(frame, t.boat ?? t.pin + Math.round(2.2 * fps), (t.boat ?? t.pin + Math.round(2.2 * fps)) + 0.5 * fps) * (closest ? 1 - win(frame, closest.at - 0.3 * fps, closest.at + 0.2 * fps) : 1);
  const landed = win(frame, t.routeEnd, t.routeEnd + 0.5 * fps);
  const boatAt = t.boat ?? t.pin + Math.round(2.2 * fps);
  const boatPop = vehicle ? win(frame, boatAt, boatAt + 0.45 * fps) : 0;
  const bob = Math.sin(sec * 3.1) * 3 * u;
  const lock = win(frame, t.pin, t.pin + 0.55 * fps);
  const lockFade = 1 - win(frame, t.routeStart + 0.4 * fps, t.routeStart + 1.0 * fps);
  const rip = 0.35 + 0.65 * clamp01((z - 1) / 2.5);
  const popScale = 1 + 0.07 * Math.sin(landed * Math.PI);

  return (
    <AbsoluteFill style={{overflow: 'hidden', background: P.map.ocean1}}>
      <Surface />
      <Boil>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <radialGradient id="fcb-ocean" cx="50%" cy="48%" r="75%">
              <stop offset="0" stopColor={P.map.ocean0} />
              <stop offset="1" stopColor={P.map.ocean1} />
            </radialGradient>
            <pattern id="fcb-hatch" width={15 * u} height={15 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={15 * u} stroke={P.map.landHatch} strokeWidth={2.6 * u} />
            </pattern>
            <path id="fcb-land" d={landD} />
          </defs>
          {hand ? <rect width={W} height={H} fill={P.map.ocean0} /> : <rect width={W} height={H} fill="url(#fcb-ocean)" />}
          <path d={gratD} fill="none" stroke={P.map.grid} strokeWidth={(hand ? 2.4 : 2) * u} />
          {!hand && (
            <>
              <use href="#fcb-land" fill="none" stroke="rgba(130,190,225,0.06)" strokeWidth={34 * rip * u} strokeLinejoin="round" />
              <use href="#fcb-land" fill="none" stroke="rgba(130,190,225,0.10)" strokeWidth={15 * rip * u} strokeLinejoin="round" />
            </>
          )}
          {hand ? (
            <>
              <use href="#fcb-land" fill={P.map.land} />
              <use href="#fcb-land" fill={P.map.landWash} transform={`translate(${7 * u} ${6 * u})`} />
              <use href="#fcb-land" fill="url(#fcb-hatch)" />
              <use href="#fcb-land" fill="none" stroke={P.map.coast} strokeWidth={4.5 * u} strokeLinejoin="round" />
            </>
          ) : (
            <use href="#fcb-land" fill={P.map.land} stroke={P.map.coast} strokeWidth={2.2 * u} strokeLinejoin="round" />
          )}
          <path d={bordersD} fill="none" stroke={P.map.border} strokeWidth={(z > 6 ? 2.6 : 1.8) * u} strokeLinejoin="round" strokeDasharray={hand ? `${12 * u} ${8 * u}` : undefined} />

          {aimIn > 0 && aimOut > 0 && <path d={`M ${startPx[0]} ${startPx[1]} L ${aimEnd[0]} ${aimEnd[1]}`} stroke={hand ? P.ink : '#fff'} strokeWidth={9 * u} strokeLinecap="round" strokeDasharray={`0.1 ${26 * u}`} strokeDashoffset={-sec * 34 * u} opacity={aimOut} />}
          {tagIn > 0 && (
            <>
              <g opacity={1 - cmp}><LeaderLine from={bigPlace.from} to={bigPlace.to} show={tagIn} /></g>
              <g opacity={cmp}><LeaderLine from={smallPlace.from} to={smallPlace.to} show={tagIn} /></g>
            </>
          )}

          {routeD && (
            hand ? (
              <>
                <path d={routeD} fill="none" stroke={P.accent} strokeWidth={13 * u} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${30 * u} ${20 * u}`} />
              </>
            ) : (
              <>
                <path d={routeD} fill="none" stroke={P.accent} strokeOpacity={0.28} strokeWidth={26 * u} strokeLinecap="round" strokeLinejoin="round" />
                <path d={routeD} fill="none" stroke={P.accent} strokeWidth={11 * u} strokeLinecap="round" strokeLinejoin="round" />
                <path d={routeD} fill="none" stroke={P.accentSoft} strokeWidth={3.2 * u} strokeLinecap="round" strokeLinejoin="round" />
              </>
            )
          )}
          {tickEls}
          {closestEl}
        </svg>
        <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>{names2}</div>
        {tickPlates}
        {tagIn > 0 && <Plate x={bigPlace.x} y={bigPlace.y} anchor={bigPlace.anchor} lines={bigLines} show={tagIn * (1 - cmp)} slide={false} id="tagbig" />}
        {tagIn > 0 && cmp > 0 && <Plate x={smallPlace.x} y={smallPlace.y} anchor={smallPlace.anchor} lines={smallLines} show={cmp} slide={false} id="tagsmall" pad={{x: 22 * u, y: 8 * u}} bar={false} />}
        {closestHtml}
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <PinDot x={startPx[0]} y={startPx[1]} r={11 * u} show={lock} />
          <g opacity={lockFade}><LockBrackets x={startPx[0]} y={startPx[1]} s={badge * 1.35} t={lock} /></g>
          {qPop > 0 && <path d={`M ${tipPx[0]} ${tipPx[1]} L ${qx} ${qy}`} stroke={hand ? P.ink : '#fff'} strokeWidth={8 * u} strokeLinecap="round" strokeDasharray={`0.1 ${22 * u}`} strokeDashoffset={-sec * 30 * u} opacity={clamp01(qPop * 2)} />}
          {vehicle && <BoatBadge x={tipPx[0]} y={tipPx[1] + bob} s={badge} pop={boatPop} ripple={sec > boatAt / fps + 0.3 && frame < t.routeStart + 0.2 * fps ? (frame - boatAt) / fps : -1} />}
          {endMark && <QuestionBadge x={qx} y={qy} s={qSize} pop={qPop} pulse={qPulse} />}
        </svg>
        {counter && (
          <div style={{position: 'absolute', left: 0, top: 0, transform: `scale(${popScale})`, transformOrigin: `${z0.x}px ${z0.y + z0.h / 2}px`}}>
            <Plate x={z0.x} y={L.tall ? z0.y + z0.h : z0.y} anchor={L.tall ? 'bl' : 'tl'} lines={counterLines} show={counterShow} id="counter" />
          </div>
        )}
      </Boil>
    </AbsoluteFill>
  );
};

