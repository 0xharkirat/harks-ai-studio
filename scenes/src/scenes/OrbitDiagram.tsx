import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {geoGraticule, geoOrthographic, geoPath} from 'd3-geo';
import {land} from '../geo/geo';
import {clamp01, easeInOutSine, easeOut, win} from '../core/motion';
import {Boil, Surface} from '../core/paper';
import {useTheme} from '../core/ThemeContext';
import {useLayout, type Rect} from '../core/layout';
import {Plate, LeaderLine, Txt, type PlateLine} from '../core/ui';
import {measureText, wrapText} from '../core/measure';
import {placeLabel} from './LeaderLabel';

/*
 * Orbit diagram, to scale: Earth, orbit rings at their real distance from its centre, satellites that move at their real
 * relative speeds, and a flyby path computed as a hyperbola (perigee and approach speed). Nothing here is drawn by eye:
 * a ring at 20,200 km altitude sits 26,571 km from the centre, on the same scale as the 6,371 km Earth.
 * Earth turns once per 24 h of diagram time, seen from above the north pole.
 */

export const R_EARTH_KM = 6371;
const MU = 398600.4418; // km^3/s^2, Earth's gravitational parameter

export interface OrbitSpec {
  name: string;
  /** altitude above the surface, km */
  altitudeKm: number;
  /** orbital period in hours (a real one: 1.5 for the ISS, 11.97 for GPS, 23.93 for geostationary) */
  periodH: number;
  /** how many satellites to draw on the ring */
  count?: number;
  /** the legend text after the name, such as "20,200 km" */
  detail?: string;
  /** index into the palette's series colours */
  color?: number;
  /** frame the ring draws on */
  at: number;
}

export interface FlybySpec {
  name: string;
  /** closest distance above the surface, km */
  closestKm: number;
  /** speed at a great distance, km/s; sets how much the path bends (Apophis: about 5.8) */
  vInfKmS?: number;
  /** the frames it flies in */
  at: number;
  end: number;
  /** the short tag on the closest-approach gap, such as "31,600 km" */
  gapLabel?: string;
  /** the legend text after the name, such as "closest: 31,600 km above the surface" */
  detail?: string;
  /** direction of the path in the diagram, degrees */
  angle?: number;
}

/** An arc of a circle from the top, clockwise, covering the fraction `t` of the full turn. */
const arcPath = (cx: number, cy: number, r: number, t: number) => {
  const a = Math.min(Math.max(t, 0.0001), 0.9999) * 2 * Math.PI;
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  if (t >= 0.9999) return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}`;
};

const hyperbola = (rp: number, vInf: number, maxR: number): [number, number][] => {
  const e = 1 + (rp * vInf * vInf) / MU;
  const a = rp / (e - 1);
  const p = a * (e * e - 1);
  const nuMax = Math.acos(-1 / e) - 0.001;
  const pts: [number, number][] = [];
  for (let i = -240; i <= 240; i++) {
    const nu = (i / 240) * nuMax;
    const r = p / (1 + e * Math.cos(nu));
    if (r > maxR) continue;
    pts.push([r * Math.cos(nu), r * Math.sin(nu)]);
  }
  return pts;
};

export const OrbitDiagram: React.FC<{
  orbits: OrbitSpec[];
  flyby?: FlybySpec;
  title?: string;
  note?: string;
  /** diagram hours per second of video (default 1) */
  hoursPerSecond?: number;
  earthAt?: number;
}> = ({orbits, flyby, title, note, hoursPerSecond = 1, earthAt = 0}) => {
  const f = useCurrentFrame();
  const {width: W, height: H, fps} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const P = theme.palette;
  const hand = theme.line.boil;
  const u = L.u;
  const c = L.content;
  const sec = f / fps;
  const hours = sec * hoursPerSecond;
  const tag = L.type.size('tag');
  const rowH = tag * 1.28;

  // text column: 16:9 left (title, legend, note); 9:16 title on top, legend and note below the diagram
  const colW = L.tall ? c.w : c.w * 0.4;
  const titleFit = title ? L.type.fit(title, L.tall ? ['heading', 'body'] : ['label', 'tag'], colW, L.tall ? 2 : 3, 'display') : null;
  const titleH = titleFit ? titleFit.lines.length * titleFit.size * 1.1 : 0;

  // the legend: one row per ring and for the flyby, wrapping the detail onto its own line when it does not fit
  type Row = {name: string; detail?: string; color: string; kind: 'ring' | 'dot'; at: number};
  const sorted = [...orbits].sort((a, b) => a.altitudeKm - b.altitudeKm);
  const rows: Row[] = [
    ...sorted.map((o, i) => ({name: o.name, detail: o.detail, color: P.series[((o.color ?? i) + 1) % P.series.length], kind: 'ring' as const, at: o.at})),
    ...(flyby ? [{name: flyby.name, detail: flyby.detail, color: P.accent, kind: 'dot' as const, at: flyby.at}] : []),
  ];
  const swatch = tag * 0.9;
  const gapX = 16 * u;
  const tspec = L.type.spec('tag', 'display');
  const dspec = L.type.spec('tag', 'body');
  const rowInfo = rows.map((r) => {
    const full = measureText(r.name, tspec) + (r.detail ? gapX + measureText(r.detail, dspec) : 0);
    const wrap = full > colW - swatch - gapX;
    return {wrap, h: rowH * (wrap && r.detail ? 2 : 1) + 8 * u};
  });
  const legendH = rowInfo.reduce((a, r) => a + r.h, 0);
  const noteLines = note ? wrapText(note, L.type.spec('tag', 'body'), colW) : [];
  const noteH = noteLines.length * tag * 1.25;

  const area: Rect = L.tall
    ? {x: c.x, y: c.y + titleH + 24 * u, w: c.w, h: c.h - titleH - 24 * u - legendH - noteH - 30 * u}
    : {x: c.x + colW + 36 * u, y: c.y, w: c.w - colW - 36 * u, h: c.h};
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const radii = [...orbits.map((o) => R_EARTH_KM + o.altitudeKm), flyby ? R_EARTH_KM + flyby.closestKm : 0];
  const maxKm = Math.max(...radii) * 1.16;
  const Rpx = (Math.min(area.w, area.h) / 2) * 0.97;
  const pxPerKm = Rpx / maxKm;
  const earthPx = R_EARTH_KM * pxPerKm;
  const earthIn = theme.ease.enter(win(f, earthAt, earthAt + 24));

  // Earth from above the north pole
  const EARTH_SIGN = 1;
  const proj = geoOrthographic().translate([cx, cy]).scale(earthPx).rotate([EARTH_SIGN * (hours / 24) * 360, -90, 0]).clipAngle(90).precision(0.5);
  const landD = geoPath(proj)(land as never) ?? '';
  const gratD = geoPath(proj)(geoGraticule().step([30, 30])() as never) ?? '';

  const items: React.ReactNode[] = [];
  sorted.forEach((o, i) => {
    const rpx = (R_EARTH_KM + o.altitudeKm) * pxPerKm;
    const col = P.series[((o.color ?? i) + 1) % P.series.length];
    const draw = easeOut(win(f, o.at, o.at + 36));
    items.push(<path key={`r${i}`} d={arcPath(cx, cy, rpx, draw)} fill="none" stroke={col} strokeWidth={(hand ? 5 : 3.5) * u} strokeDasharray={`${14 * u} ${12 * u}`} strokeLinecap="round" opacity={0.9} />);
    // satellites: real relative speeds, counter-clockwise seen from the north pole
    const n = o.count ?? 1;
    const sat = clamp01((f - o.at - 20) / 14);
    for (let k = 0; k < n; k++) {
      const th = -(Math.PI / 2) - (2 * Math.PI * (hours / o.periodH)) + (k * 2 * Math.PI) / n + i * 0.9;
      const sx = cx + rpx * Math.cos(th);
      const sy = cy + rpx * Math.sin(th);
      const r = (hand ? 13 : 11) * u * (0.4 + 0.6 * easeOut(sat));
      items.push(
        <g key={`s${i}-${k}`} opacity={sat}>
          <circle cx={sx} cy={sy} r={r + 5 * u} fill={hand ? P.bg : '#04101a'} opacity={0.85} />
          <circle cx={sx} cy={sy} r={r} fill={col} stroke={hand ? P.ink : '#fff'} strokeWidth={(hand ? 3.5 : 2.5) * u} />
        </g>,
      );
    }
  });

  // the flyby, clipped to the diagram area
  let flyEls: React.ReactNode = null;
  let gapPlate: React.ReactNode = null;
  if (flyby) {
    const rp = R_EARTH_KM + flyby.closestKm;
    const pts = hyperbola(rp, flyby.vInfKmS ?? 5.8, maxKm * 0.99);
    const rot = ((flyby.angle ?? -35) * Math.PI) / 180;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const scr = pts.map(([x, y]) => [cx + (x * cr - y * sr) * pxPerKm, cy + (x * sr + y * cr) * pxPerKm] as [number, number]);
    const prog = easeInOutSine(win(f, flyby.at, flyby.end));
    const idx = Math.max(1, Math.round(prog * (scr.length - 1)));
    const trail = scr.slice(0, idx + 1);
    const head = scr[idx];
    const periIdx = pts.reduce((best, p, i) => (Math.hypot(p[0], p[1]) < Math.hypot(pts[best][0], pts[best][1]) ? i : best), 0);
    const peri = scr[periIdx];
    const gapAt = flyby.at + (flyby.end - flyby.at) * 0.5;
    const gapShow = easeOut(win(f, gapAt, gapAt + 24)) * (idx >= periIdx ? 1 : 0);
    const col = P.accent;
    // the gap is measured from the surface, so the dashed line starts on the Earth's edge
    const dx = peri[0] - cx;
    const dy = peri[1] - cy;
    const dl = Math.hypot(dx, dy) || 1;
    const surf: [number, number] = [cx + (dx / dl) * earthPx, cy + (dy / dl) * earthPx];
    flyEls = (
      <g clipPath="url(#fcb-orbit-clip)">
        <polyline points={scr.map((p) => p.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={3 * u} strokeDasharray={`${6 * u} ${12 * u}`} opacity={0.35} />
        <polyline points={trail.map((p) => p.join(',')).join(' ')} fill="none" stroke={col} strokeWidth={(hand ? 9 : 7) * u} strokeLinecap="round" strokeLinejoin="round" />
        {gapShow > 0 && (
          <g opacity={gapShow}>
            <line x1={surf[0]} y1={surf[1]} x2={peri[0]} y2={peri[1]} stroke={hand ? P.ink : '#fff'} strokeWidth={4 * u} strokeDasharray={`${10 * u} ${10 * u}`} />
            <circle cx={peri[0]} cy={peri[1]} r={9 * u} fill="none" stroke={hand ? P.ink : '#fff'} strokeWidth={4 * u} />
          </g>
        )}
        <circle cx={head[0]} cy={head[1]} r={(hand ? 17 : 15) * u} fill={col} stroke={hand ? P.ink : '#fff'} strokeWidth={4 * u} />
      </g>
    );
    if (flyby.gapLabel && gapShow > 0) {
      const lines: PlateLine[] = [{text: flyby.gapLabel, role: 'tag', kind: 'display', color: P.panelText}];
      const mid: [number, number] = [(surf[0] + peri[0]) / 2, (surf[1] + peri[1]) / 2];
      const gp = placeLabel(L, theme, mid, lines, {dir: 'ne', dist: 40 * u, bounds: area, avoid: [{x: cx - earthPx, y: cy - earthPx, w: earthPx * 2, h: earthPx * 2}]});
      gapPlate = <Plate x={gp.x} y={gp.y} anchor={gp.anchor} lines={lines} show={gapShow} slide={false} bar={false} id="flygap" pad={{x: 20 * u, y: 8 * u}} />;
      flyEls = (
        <>
          {flyEls}
          <LeaderLine from={gp.from} to={gp.to} show={gapShow} />
        </>
      );
    }
  }

  const titleIn = theme.ease.enter(win(f, 0, 20));
  const g = P.globe;
  const legendTop = L.tall ? area.y + area.h + 16 * u : c.y + titleH + 36 * u;
  let ly = legendTop;
  const noteTop = legendTop + legendH + 12 * u;
  if (!L.tall && noteTop + noteH > c.y + c.h + 1) console.warn(`OrbitDiagram: the title, legend and note need ${Math.round(noteTop + noteH - c.y)} px in 16:9, and there are ${Math.round(c.h)}. Shorten them.`);
  return (
    <AbsoluteFill>
      <Surface />
      <Boil>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <clipPath id="fcb-orbit-clip">
              <rect x={area.x} y={area.y} width={area.w} height={area.h} />
            </clipPath>
            <radialGradient id="fcb-eseas" cx="40%" cy="38%" r="75%">
              <stop offset="0" stopColor={g.sea0} />
              <stop offset="0.6" stopColor={g.sea1} />
              <stop offset="1" stopColor={g.sea2} />
            </radialGradient>
            <radialGradient id="fcb-landfill-orbit" cx="40%" cy="38%" r="80%">
              <stop offset="0" stopColor={g.land0} />
              <stop offset="0.6" stopColor={g.land1} />
              <stop offset="1" stopColor={g.land2} />
            </radialGradient>
            <pattern id="fcb-ehatch" width={9 * u} height={9 * u} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={9 * u} stroke={P.map.landHatch} strokeWidth={2 * u} />
            </pattern>
            <path id="fcb-eland" d={landD} />
          </defs>
          <g opacity={earthIn}>
            <circle cx={cx} cy={cy} r={earthPx} fill={hand ? g.sea0 : 'url(#fcb-eseas)'} stroke={hand ? P.ink : 'none'} strokeWidth={5 * u} />
            {hand ? (
              <>
                <use href="#fcb-eland" fill={P.bg} />
                <use href="#fcb-eland" fill={g.land0} transform={`translate(${3 * u} ${3 * u})`} />
                <use href="#fcb-eland" fill="url(#fcb-ehatch)" />
                <use href="#fcb-eland" fill="none" stroke={g.coast} strokeWidth={2.4 * u} />
              </>
            ) : (
              <use href="#fcb-eland" fill="url(#fcb-landfill-orbit)" stroke="none" />
            )}
            {!hand && <circle cx={cx} cy={cy} r={earthPx} fill="none" stroke={g.rim} strokeWidth={3 * u} opacity={0.7} />}
            <path d={gratD} fill="none" stroke={g.grid} strokeWidth={1.2 * u} />
          </g>
          {items}
          {flyEls}
        </svg>
        {gapPlate}
        {titleFit && (
          <div style={{position: 'absolute', left: c.x, top: c.y, width: colW, opacity: clamp01(titleIn * 1.5), transform: `translateY(${(1 - titleIn) * 18 * u}px)`}}>
            {titleFit.lines.map((ln, i) => (
              <Txt key={i} role={titleFit.role} kind="display" color={P.text} align={L.tall ? 'center' : 'left'} halo={hand} style={{lineHeight: 1.1}}>
                {ln}
              </Txt>
            ))}
          </div>
        )}
        {rows.map((r, i) => {
          const top = ly;
          ly += rowInfo[i].h;
          const show = theme.ease.enter(win(f, r.at, r.at + 20));
          return (
            <div key={i} style={{position: 'absolute', left: c.x, width: colW, top, opacity: clamp01(show * 1.6), display: 'flex', justifyContent: L.tall ? 'center' : 'flex-start'}}>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: gapX}}>
                <svg width={swatch} height={rowH} style={{flex: 'none'}}>
                  {r.kind === 'ring' ? <circle cx={swatch / 2} cy={rowH / 2} r={swatch * 0.36} fill="none" stroke={r.color} strokeWidth={5 * u} strokeDasharray={`${9 * u} ${7 * u}`} /> : <circle cx={swatch / 2} cy={rowH / 2} r={swatch * 0.3} fill={r.color} stroke={hand ? P.ink : '#fff'} strokeWidth={3 * u} />}
                </svg>
                <div style={{display: 'flex', flexWrap: 'wrap', columnGap: gapX, alignItems: 'baseline'}}>
                  <Txt role="tag" kind="display" color={P.text} tracking={0} halo={hand}>{r.name}</Txt>
                  {r.detail && <Txt role="tag" color={P.textMuted} caps={false} halo={hand}>{r.detail}</Txt>}
                </div>
              </div>
            </div>
          );
        })}
        {note && (
          <div style={{position: 'absolute', left: c.x, width: colW, top: noteTop, opacity: clamp01(earthIn)}}>
            {noteLines.map((ln, i) => (
              <Txt key={i} role="tag" color={P.textMuted} caps={false} halo={hand} align={L.tall ? 'center' : 'left'} style={{lineHeight: 1.25}}>
                {ln}
              </Txt>
            ))}
          </div>
        )}
      </Boil>
    </AbsoluteFill>
  );
};
