import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {useBoilIndex, useTheme} from './ThemeContext';
import {useLayoutBasics} from './layoutBasics';

/** Boil: redraws the lines of everything inside about 12 times a second (an SVG displacement filter). A clean theme passes children through. */
export const Boil: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
  const theme = useTheme();
  const i = useBoilIndex();
  if (!theme.line.boil) return <>{children}</>;
  return <div style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, filter: `url(#fcb-boil-${i})`, ...style}}>{children}</div>;
};

const noiseCache = new Map<string, string>();
/** A noise texture made in code, once per page. A PNG data URL. */
const makeNoise = (w: number, h: number, seed: number, opts: {mid: number; amp: number; fibers: boolean}) => {
  const key = `${w}x${h}:${seed}:${opts.mid}:${opts.amp}:${opts.fibers}`;
  const hit = noiseCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const img = g.createImageData(w, h);
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = opts.mid + (rnd() - 0.5) * opts.amp * 2;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (opts.fibers) {
    g.lineWidth = 1;
    for (let i = 0; i < Math.floor((w * h) / 2600); i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const l = 6 + rnd() * 26;
      const a = rnd() * Math.PI * 2;
      const shade = rnd() < 0.5 ? 255 : 90;
      g.strokeStyle = `rgba(${shade},${shade},${shade},${0.05 + rnd() * 0.08})`;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }
  const url = c.toDataURL('image/png');
  noiseCache.set(key, url);
  return url;
};

/** The paper texture and the vignette: the top layer of a composition. Nothing for a theme with no paper and no vignette. */
export const Grain: React.FC = () => {
  const theme = useTheme();
  const {W, H} = useLayoutBasics();
  const {paper} = theme;
  const url = useMemo(() => (paper.grain > 0 ? makeNoise(W, H, 31, {mid: 238, amp: paper.grain, fibers: paper.fibers}) : null), [W, H, paper.grain, paper.fibers]);
  const tint = paper.kind === 'ruled' ? '120,95,60' : '0,0,0';
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {url && <img src={url} width={W} height={H} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply'}} />}
      {paper.vignette > 0 && <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, rgba(${tint},0) 58%, rgba(${tint},${paper.vignette}) 100%)`}} />}
    </AbsoluteFill>
  );
};

/**
 * The background of a scene. Clean themes: a soft gradient. Sketch theme: ruled paper with a margin line and punch holes.
 * `ruled` can force plain paper off for a scene that draws its own ground.
 */
export const Surface: React.FC<{ruled?: boolean}> = ({ruled = true}) => {
  const theme = useTheme();
  const {W, H, tall, u} = useLayoutBasics();
  const p = theme.palette;
  if (theme.paper.kind !== 'ruled' || !ruled) {
    return <AbsoluteFill style={{background: `radial-gradient(ellipse at 30% 20%, ${p.bg} 0%, ${p.bgDeep} 100%)`}} />;
  }
  const step = (tall ? 64 : 58) * u;
  const lines: number[] = [];
  for (let y = (tall ? 150 : 140) * u; y < H; y += step) lines.push(y);
  const margin = (tall ? 54 : 82) * u;
  const holes = tall ? [250, 960, 1670] : [220, 540, 860];
  const hx = (tall ? 26 : 40) * u;
  return (
    <AbsoluteFill style={{backgroundColor: p.bg}}>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <radialGradient id="fcb-hole" cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#b9ae95" />
            <stop offset="1" stopColor="#8d8369" />
          </radialGradient>
        </defs>
        {lines.map((y) => (
          <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="#9ec5e8" strokeWidth={2.4 * u} opacity={0.8} />
        ))}
        <line x1={margin} y1={0} x2={margin} y2={H} stroke="#ee8f8a" strokeWidth={3 * u} opacity={0.9} />
        <line x1={margin + 8 * u} y1={0} x2={margin + 8 * u} y2={H} stroke="#ee8f8a" strokeWidth={1.5 * u} opacity={0.6} />
        {holes.map((y) => (
          <g key={y}>
            <circle cx={hx} cy={y * u} r={24 * u} fill="url(#fcb-hole)" />
            <circle cx={hx + 2 * u} cy={y * u + 3 * u} r={19 * u} fill="#6d6450" opacity={0.5} />
            <circle cx={hx} cy={y * u} r={22 * u} fill="none" stroke="#a89d83" strokeWidth={2 * u} />
          </g>
        ))}
      </svg>
    </AbsoluteFill>
  );
};
