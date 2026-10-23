import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig} from 'remotion';
import {interpolateZoom} from 'd3-interpolate';
import {geoIdentity, geoPath, geoProjection} from 'd3-geo';
import type {GeoPermissibleObjects} from 'd3-geo';
import {borders, countryLabels as baseLabels, countries, land, type LonLat} from '../geo/geo';
import {clamp01, easeInOut, easeInOutSine, win} from '../core/motion';
import {Boil} from '../core/paper';
import {useTheme} from '../core/ThemeContext';
import {useLayout, type Rect} from '../core/layout';
import {Txt} from '../core/ui';
import {measureText} from '../core/measure';

/*
 * Night map: the NASA night raster on a flat map, with a camera that moves between regions (lon/lat boxes).
 *
 * The raster is equirectangular, so the map is too: a pixel of the raster has a fixed place in lon and lat, the lights
 * are a plain crop-and-scale of the image, and the vector layers (coast, borders) use the same linear mapping, so the
 * 2 cannot drift apart. The horizontal scale is `rho` times the vertical one. `rho` is 1 for a world view and cos(lat)
 * for a close view, so a region at 38 N is not stretched sideways (a local standard parallel). The raster is stretched
 * the same way, because drawImage scales x and y on their own.
 *
 * The lights are drawn on a canvas, per frame: the visible part of the raster is scaled to the frame with the
 * browser's smooth filter, and then each value goes through a colour table made from the theme's `night.ramp`.
 * The table is made after the scaling, so the colours never blend (a blend of 2 colours is not a value in between).
 *
 *   value v (8 bit)  = 255 * log10(1 + r) / log10(1 + cap)           r in nW/(cm2 sr), cap 38.2
 *   below `floor`    : not drawn. The colour at the floor is the dimmest ramp colour with 0 opacity, then it rises
 *                      over a short step, so there is no visible edge and nothing below the floor ever shows.
 *   above `floor`    : t = log-position between floor and cap (0..1); colour = ramp(t); monotonic in t.
 *
 * The factory raster has a faint plateau (0.3 to 1.0) with straight tile edges over deserts, India and the Arctic,
 * and square holes near 75 to 80 N. All of it lies below 1.0, so the default floor of 1.0 hides all of it.
 * `levels` are 1 to 3 copies of the raster, finest first, each half the size of the one before, made by
 * scenes/tools/night-levels.py (a coarser level is the maximum of each block, so small lit places survive a world view).
 */

export type NightBox = [lonW: number, latS: number, lonE: number, latN: number];

export interface NightKey {
  /** the frame the camera has arrived at `box` (the first key is where the scene starts, so its `at` is ignored) */
  at: number;
  box: NightBox;
  /** frames the move takes, ending at `at` (default 2.2 s) */
  move?: number;
  /** fit the box into the layout's `main` area (default; the HUD plates keep clear of it) or the whole `content` area */
  fit?: 'main' | 'content';
}

export interface NightMapProps {
  /** URLs of the raster levels, finest first: [night-L0.png, night-L1.png, night-L2.png] */
  levels: string[];
  camera: NightKey[];
  /** nW/(cm2 sr). Values below it are not drawn (default 1.0, the "lit" cut of the research) */
  floor?: number;
  /** the top of the raster's scale, which its values are capped at (default 38.2) */
  cap?: number;
  /** country names, when the camera is close enough for them to read (default true) */
  names?: boolean;
  /** country names to leave out (a label of your own already names it) */
  hideNames?: string[];
  /** the latitudes the map draws between: [south, north] (default [-60, 84]). The raster has no Antarctica, so the south stops at 60 S */
  latRange?: [number, number];
  /** frames the lights take to switch on at the start (default 24; 0 shows them from the first frame) */
  lightsIn?: number;
  /** last frame of the scene, for the slow push-in on the last hold (default the last key + 3 s) */
  end?: number;
}

// ---------- colour ramp ----------
type RGB = [number, number, number];
const hex = (c: string): RGB => {
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim());
  if (!m) throw new Error(`night.ramp stop "${c}" must be a 6-digit hex colour`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * The colour table: 256 entries, one per raster value, packed as little-endian RGBA. Entry v is transparent below
 * the floor. Above it, colour and opacity follow t, the position of the value on the log scale from the floor to the cap.
 */
export const makeNightTable = (ramp: string[], floor: number, cap: number): Uint32Array => {
  const stops = ramp.map(hex);
  if (stops.length < 3) throw new Error('night.ramp needs at least 3 stops');
  for (let i = 1; i < stops.length; i++) if (luma(stops[i]) <= luma(stops[i - 1])) console.warn(`night.ramp stop ${i} is not lighter than stop ${i - 1}: the colours must get lighter as the light gets brighter`);
  const top = Math.log10(1 + cap);
  const vFloor = (255 * Math.log10(1 + floor)) / top;
  const out = new Uint32Array(256);
  for (let v = 0; v < 256; v++) {
    const t = clamp01((v - vFloor) / (255 - vFloor));
    if (v < vFloor || t <= 0) {
      out[v] = 0;
      continue;
    }
    const tt = Math.pow(t, 0.8);
    const x = tt * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    const c = stops[i].map((a, k) => Math.round(a + (stops[i + 1][k] - a) * f));
    const a = Math.round(255 * smooth(0, 0.06, t));
    out[v] = ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  }
  return out;
};

// ---------- camera ----------
interface CamView {
  /** the centre of the frame: lon, lat */
  cx: number;
  cy: number;
  /** the visible span of the frame width, in degrees of lon */
  w: number;
  /** horizontal scale over vertical scale */
  rho: number;
}

const rhoOf = (box: NightBox) => {
  const span = box[3] - box[1];
  const latC = (box[1] + box[3]) / 2;
  const near = 1 - smooth(25, 60, span); // a world view is plain equirectangular, a close view uses its own parallel
  return Math.max(0.5, Math.cos((latC * near * Math.PI) / 180));
};

const viewFor = (box: NightBox, rect: Rect, W: number, H: number): CamView => {
  const rho = rhoOf(box);
  const dLon = box[2] - box[0];
  const dLat = box[3] - box[1];
  const ky = Math.min(rect.w / (dLon * rho), rect.h / dLat);
  const kx = ky * rho;
  const lonC = (box[0] + box[2]) / 2;
  const latC = (box[1] + box[3]) / 2;
  return {cx: lonC - (rect.x + rect.w / 2 - W / 2) / kx, cy: latC + (rect.y + rect.h / 2 - H / 2) / ky, w: W / kx, rho};
};

export interface NightCamera {
  view: (frame: number) => CamView;
  /** the pixel of a lon/lat at a frame */
  project: (p: LonLat, frame: number) => [number, number];
}

const buildCamera = (keys: NightKey[], rects: {main: Rect; content: Rect}, W: number, H: number, fps: number, end: number): NightCamera => {
  const ks = [...keys].sort((a, b) => a.at - b.at);
  const views = ks.map((k) => viewFor(k.box, k.fit === 'content' ? rects.content : rects.main, W, H));
  const moveOf = (i: number) => ks[i].move ?? Math.round(2.2 * fps);
  const creep = 0.045;
  /** the key's view, pushed in a little while it holds, until the next move starts or the scene ends */
  const held = (i: number, f: number): CamView => {
    const from = i === 0 ? 0 : ks[i].at;
    const to = i + 1 < ks.length ? ks[i + 1].at - moveOf(i + 1) : end;
    const k = easeInOutSine(win(f, from, Math.max(from + 1, to)));
    const v = views[i];
    return {...v, w: v.w * (1 - creep * k)};
  };
  const view = (f: number): CamView => {
    let i = 0;
    while (i + 1 < ks.length && f >= ks[i + 1].at) i++; // the last key the camera has arrived at
    if (i + 1 >= ks.length) return held(i, f);
    const start = ks[i + 1].at - moveOf(i + 1);
    if (f <= start) return held(i, f);
    const a = held(i, Infinity);
    const b = views[i + 1];
    const p = easeInOut(win(f, start, ks[i + 1].at));
    // the zoom follows the van Wijk smooth path, so a long move zooms out and in again instead of racing over the map
    const z = interpolateZoom([a.cx, a.cy, a.w], [b.cx, b.cy, b.w])(p);
    return {cx: z[0], cy: z[1], w: z[2], rho: a.rho + (b.rho - a.rho) * p};
  };
  const project = (p: LonLat, f: number): [number, number] => {
    const v = view(f);
    const kx = W / v.w;
    const ky = kx / v.rho;
    return [W / 2 + (p[0] - v.cx) * kx, H / 2 - (p[1] - v.cy) * ky];
  };
  return {view, project};
};

/**
 * The camera of a night map as a hook, so a scene can place a LeaderLabel on a lon/lat while the camera moves:
 *   const cam = useNightCamera(KEYS); <LeaderLabel at={cam.project([127, 38], frame)} ... />
 * Pass the same keys (and `end`) as the NightMap.
 */
export const useNightCamera = (keys: NightKey[], end?: number): NightCamera => {
  const {width: W, height: H, fps} = useVideoConfig();
  const L = useLayout();
  const last = Math.max(...keys.map((k) => k.at));
  const e = end ?? last + 3 * fps;
  return useMemo(
    () => buildCamera(keys, {main: L.main, content: L.content}, W, H, fps, e),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(keys), L.main.x, L.main.y, L.main.w, L.main.h, L.content.x, L.content.y, L.content.w, L.content.h, W, H, fps, e],
  );
};

// ---------- the raster ----------
const imageCache = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();
const loadImage = (url: string): Promise<HTMLImageElement> => {
  const hit = pending.get(url);
  if (hit) return hit;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`NightMap: cannot load ${url}`));
    img.src = url;
  });
  pending.set(url, p);
  return p;
};

/** The raster levels, loaded. The render waits for them (delayRender), so a frame is never drawn without lights. */
const useLevels = (urls: string[]): HTMLImageElement[] | null => {
  const key = urls.join('|');
  const [imgs, setImgs] = useState<HTMLImageElement[] | null>(() => (urls.every((u) => imageCache.has(u)) ? urls.map((u) => imageCache.get(u)!) : null));
  const [handle] = useState(() => (urls.every((u) => imageCache.has(u)) ? null : delayRender('night raster')));
  useLayoutEffect(() => {
    let live = true;
    Promise.all(urls.map(loadImage)).then((list) => {
      if (live) setImgs(list);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // release the render only after React has committed the frame that holds the lights
  useEffect(() => {
    if (imgs && handle !== null) continueRender(handle);
  }, [imgs, handle]);
  return imgs;
};

/** Draw the lights for a view: crop and scale the raster, then colour every value through the table. */
const drawLights = (cv: HTMLCanvasElement, scratch: HTMLCanvasElement, imgs: HTMLImageElement[], v: CamView, table: Uint32Array) => {
  const W = cv.width;
  const H = cv.height;
  const s = scratch.getContext('2d', {willReadFrequently: true})!;
  s.globalCompositeOperation = 'source-over';
  s.globalAlpha = 1;
  s.fillStyle = '#000';
  s.fillRect(0, 0, W, H);
  s.imageSmoothingEnabled = true;
  s.imageSmoothingQuality = 'high';
  const kx = W / v.w; // screen px per degree of lon
  const ky = kx / v.rho;
  const lonL = v.cx - v.w / 2;
  const latT = v.cy + H / 2 / ky;
  const spanLat = H / ky;
  // the level: the finest one that is not shrunk by more than about 1.3 times; between 2 levels, a blend of both
  const ppp = (kx * 360) / imgs[0].naturalWidth;
  const real = Math.min(imgs.length - 1, Math.max(0, -0.4 - Math.log2(ppp)));
  const i = Math.min(imgs.length - 1, Math.floor(real));
  const blend = i + 1 < imgs.length ? smooth(0, 1, real - i) : 0;
  const put = (img: HTMLImageElement, alpha: number) => {
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    s.globalAlpha = alpha;
    s.drawImage(img, ((lonL + 180) / 360) * iw, ((90 - latT) / 180) * ih, (v.w / 360) * iw, (spanLat / 180) * ih, 0, 0, W, H);
  };
  put(imgs[i], 1);
  if (blend > 0.001) put(imgs[i + 1], blend);
  const src = new Uint32Array(s.getImageData(0, 0, W, H).data.buffer);
  const out = new ImageData(W, H);
  const dst = new Uint32Array(out.data.buffer);
  for (let p = 0; p < src.length; p++) dst[p] = table[src[p] & 255];
  cv.getContext('2d')!.putImageData(out, 0, 0);
};

// ---------- country names ----------
const unit = geoPath(geoIdentity());
const nameAreas = new Map<string, number>();
for (const f of countries.features) nameAreas.set(f.properties.name, Math.abs(unit.area(f as GeoPermissibleObjects)));
const countryNames = baseLabels.map((c) => ({name: c.name, at: c.at, deg2: nameAreas.get(c.name) ?? 0})).filter((c) => c.deg2 > 0).sort((a, b) => b.deg2 - a.deg2);

export const NightMap: React.FC<NightMapProps> = ({levels, camera, floor = 1.0, cap = 38.2, names = true, hideNames = [], latRange = [-60, 84], lightsIn = 24, end}) => {
  const frame = useCurrentFrame();
  const {width: W, height: H} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const P = theme.palette.night;
  const hand = theme.line.boil;
  const u = L.u;
  const cam = useNightCamera(camera, end);
  const v = cam.view(frame);
  const kx = W / v.w;
  const ky = kx / v.rho;

  const imgs = useLevels(levels);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scratch = useMemo(() => document.createElement('canvas'), []);
  const table = useMemo(() => makeNightTable(P.ramp, floor, cap), [P.ramp.join(','), floor, cap]);
  useLayoutEffect(() => {
    if (!imgs || !canvas.current) return;
    if (scratch.width !== W || scratch.height !== H) {
      scratch.width = W;
      scratch.height = H;
    }
    drawLights(canvas.current, scratch, imgs, v, table);
  });

  // the vector layers: the same linear mapping as the raster, so the coast sits on the lights
  const proj = geoProjection((lam, phi) => [lam * v.rho, phi])
    .scale((ky * 180) / Math.PI)
    .translate([W / 2 - v.cx * kx, H / 2 + v.cy * ky])
    .clipExtent([[-160, -160], [W + 160, H + 160]])
    .precision(0);
  const path = geoPath(proj);
  const landD = path(land as never) ?? '';
  const bordersD = path(borders as never) ?? '';
  const lightsA = lightsIn <= 0 ? 1 : clamp01(frame / lightsIn);

  // names: a country shows its name when it is big enough on screen for the name to fit
  const nameEls: React.ReactNode[] = [];
  const nameA = clamp01((ky / u - 14) / 14);
  if (names && nameA > 0.02) {
    const taken: Rect[] = [];
    const s = L.type.spec('tag', 'body', {tracking: 0.12 * L.type.size('tag')});
    let n = 0;
    for (const c of countryNames) {
      if (n >= 10) break;
      if (hideNames.includes(c.name)) continue;
      const sizePx = Math.sqrt(c.deg2) * Math.sqrt(kx * ky);
      const label = c.name.toUpperCase();
      const w = measureText(label, s);
      const a = clamp01((sizePx * 1.15 - w) / (w * 0.35)) * nameA;
      if (a <= 0.02) continue;
      const x = W / 2 + (c.at[0] - v.cx) * kx;
      const y = H / 2 - (c.at[1] - v.cy) * ky;
      const box: Rect = {x: x - w / 2 - 12 * u, y: y - L.type.size('tag') * 0.6, w: w + 24 * u, h: L.type.size('tag') * 1.2};
      if (box.x < 0 || box.x + box.w > W || box.y < 0 || box.y + box.h > H) continue;
      if (taken.some((r) => box.x < r.x + r.w && box.x + box.w > r.x && box.y < r.y + r.h && box.y + box.h > r.y)) continue;
      taken.push(box);
      n++;
      nameEls.push(
        <div key={c.name} style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%,-50%)', opacity: a * 0.8}}>
          <Txt role="tag" color={P.label} caps tracking={0.12}>
            {c.name}
          </Txt>
        </div>,
      );
    }
  }

  // the vector layers stop at the latitude range, so the dark land of Antarctica does not fill the bottom of a world view
  const yTop = H / 2 - (latRange[1] - v.cy) * ky;
  const yBottom = H / 2 - (latRange[0] - v.cy) * ky;
  const bw = (ky / u > 40 ? 2.6 : 1.8) * u * theme.line.weight;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: P.sea}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <clipPath id="nm-lat">
            <rect x={0} y={yTop} width={W} height={Math.max(0, yBottom - yTop)} />
          </clipPath>
        </defs>
        <g clipPath="url(#nm-lat)">
          <path d={landD} fill={P.land} />
        </g>
      </svg>
      <canvas ref={canvas} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: lightsA}} />
      <Boil>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <g clipPath="url(#nm-lat)">
            <path d={landD} fill="none" stroke={P.coast} strokeWidth={1.8 * u * theme.line.weight} strokeLinejoin="round" />
            <path d={bordersD} fill="none" stroke={P.border} strokeWidth={bw} strokeLinejoin="round" strokeDasharray={hand ? `${12 * u} ${8 * u}` : undefined} />
          </g>
        </svg>
      </Boil>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H}}>{nameEls}</div>
    </AbsoluteFill>
  );
};
