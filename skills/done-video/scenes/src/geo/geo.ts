import {geoCentroid, geoDistance, geoGraticule10, geoInterpolate, geoNaturalEarth1, geoPath} from 'd3-geo';
import type {GeoPermissibleObjects} from 'd3-geo';
import {feature, mesh} from 'topojson-client';
import type {Topology, GeometryCollection} from 'topojson-specification';
import type {Feature, FeatureCollection, MultiLineString, MultiPolygon, Polygon} from 'geojson';
// Natural Earth (public domain) through the world-atlas package (ISC licence).
import landTopo from 'world-atlas/land-50m.json';
import countriesTopo from 'world-atlas/countries-50m.json';

export type LonLat = [number, number];

const landT = landTopo as unknown as Topology;
const countriesT = countriesTopo as unknown as Topology;

export const land = feature(landT, landT.objects.land as GeometryCollection) as unknown as Feature<MultiPolygon | Polygon> | FeatureCollection<MultiPolygon | Polygon>;

export const countries = feature(countriesT, countriesT.objects.countries as GeometryCollection<{name: string}>) as unknown as FeatureCollection<Polygon | MultiPolygon, {name: string}>;

/** interior borders only (no coastlines) */
export const borders = mesh(countriesT, countriesT.objects.countries as GeometryCollection, (a, b) => a !== b) as MultiLineString;

export const graticule = geoGraticule10();

// ---------- great circles ----------
export const R_EARTH = 6371.0088; // km, the mean radius
const rad = Math.PI / 180;
const deg = 180 / Math.PI;

/** Point `km` along the great circle from `from` at the initial bearing (degrees clockwise from north). */
export function destination(from: LonLat, bearingDeg: number, km: number): LonLat {
  const d = km / R_EARTH;
  const b = bearingDeg * rad;
  const l1 = from[1] * rad;
  const o1 = from[0] * rad;
  const l2 = Math.asin(Math.sin(l1) * Math.cos(d) + Math.cos(l1) * Math.sin(d) * Math.cos(b));
  const o2 = o1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(l1), Math.cos(d) - Math.sin(l1) * Math.sin(l2));
  return [((o2 * deg + 540) % 360) - 180, l2 * deg];
}

/** The great-circle distance between 2 points, in km. */
export const distanceKm = (a: LonLat, b: LonLat) => geoDistance(a, b) * R_EARTH;

/** A route is a great circle: from a point at a bearing for some km, or from a point to a point. */
export type RouteSpec = {from: LonLat; bearing: number; km: number} | {from: LonLat; to: LonLat; km?: number};

export interface Route {
  from: LonLat;
  km: number; // the length of the route
  at: (km: number) => LonLat; // the point `km` along the circle (past the end too)
  points: (km: number, stepKm?: number) => LonLat[]; // a dense line up to `km`
}

export const makeRoute = (spec: RouteSpec): Route => {
  if ('bearing' in spec) {
    const at = (km: number) => destination(spec.from, spec.bearing, km);
    return {from: spec.from, km: spec.km, at, points: (km, step = 40) => densify(at, km, step)};
  }
  const total = spec.km ?? distanceKm(spec.from, spec.to);
  const interp = geoInterpolate(spec.from, spec.to);
  const full = distanceKm(spec.from, spec.to);
  const at = (km: number) => interp(km / full) as LonLat;
  return {from: spec.from, km: total, at, points: (km, step = 40) => densify(at, km, step)};
};

const densify = (at: (km: number) => LonLat, km: number, step: number): LonLat[] => {
  const pts: LonLat[] = [];
  for (let d = 0; d < km; d += step) pts.push(at(d));
  pts.push(at(km));
  return pts;
};

// ---------- the flat map: Natural Earth projection ----------
// Base projection: scale 100, no translate. A "view" is [cx, cy, w] in these base units: the centre of the frame and
// the visible width. d3.interpolateZoom works on this triple.
export const BASE_SCALE = 100;
const base = geoNaturalEarth1().scale(BASE_SCALE).translate([0, 0]);
export const baseXY = (p: LonLat) => base(p) as [number, number];
export const WORLD_W = baseXY([180, 0])[0] - baseXY([-180, 0])[0];

export type View = [number, number, number];

export function makeProjection(view: View, W: number, H: number) {
  const z = W / view[2];
  const proj = geoNaturalEarth1()
    .scale(BASE_SCALE * z)
    .translate([W / 2 - view[0] * z, H / 2 - view[1] * z])
    .clipExtent([
      [-120, -120],
      [W + 120, H + 120],
    ])
    .precision(0.5);
  return {proj, z};
}

export const pathFor = (proj: ReturnType<typeof makeProjection>['proj']) => geoPath(proj);

// ---------- labels ----------
export interface CountryLabel {
  name: string;
  at: LonLat;
  area0: number; // area in base units^2
}
const basePath = geoPath(base);
export const countryLabels: CountryLabel[] = countries.features
  .map((f) => ({name: f.properties.name, at: geoCentroid(f as GeoPermissibleObjects) as LonLat, area0: basePath.area(f as GeoPermissibleObjects)}))
  .filter((c) => c.name && c.area0 > 0)
  .sort((a, b) => b.area0 - a.area0);

// A few manual anchors beat centroids for countries whose centroid sits in the sea or off-centre.
const nudge: Record<string, LonLat> = {
  Russia: [95, 62],
  Canada: [-100, 60],
  'United States of America': [-100, 40],
  Indonesia: [114, -1.2],
  Chile: [-71, -35],
  France: [2.4, 46.6],
  Norway: [9, 61.5],
  Japan: [138, 37],
  Philippines: [122, 12],
  India: [79, 22],
  China: [103, 35],
  Antarctica: [20, -80],
  Madagascar: [46.8, -19.5],
  Mozambique: [35.5, -17],
};
for (const c of countryLabels) if (nudge[c.name]) c.at = nudge[c.name];

export const continentLabels: {name: string; at: LonLat}[] = [
  {name: 'AFRICA', at: [18, 3]},
  {name: 'ASIA', at: [95, 48]},
  {name: 'NORTH AMERICA', at: [-102, 48]},
  {name: 'SOUTH AMERICA', at: [-59, -13]},
  {name: 'AUSTRALIA', at: [134, -25]},
  {name: 'ANTARCTICA', at: [10, -80]},
];

export const oceanLabels: {name: string; at: LonLat; zMin: number; zMax: number}[] = [
  {name: 'Pacific Ocean', at: [-148, 6], zMin: 0.8, zMax: 3.2},
  {name: 'Atlantic Ocean', at: [-34, 24], zMin: 0.8, zMax: 3.2},
  {name: 'Indian Ocean', at: [82, -22], zMin: 0.8, zMax: 5},
  {name: 'Southern Ocean', at: [20, -62], zMin: 0.8, zMax: 5},
  {name: 'Arabian Sea', at: [64, 15.5], zMin: 3.5, zMax: 22},
  {name: 'Mozambique Channel', at: [40.5, -17.2], zMin: 5, zMax: 30},
];

export const fmtKm = (km: number) => `${Math.round(km).toLocaleString('en-US')} km`;
export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
