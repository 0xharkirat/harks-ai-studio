import React from 'react';
import {clamp01} from './motion';
import {digitCell, measureNumber, measureText} from './measure';
import {Sk, Wash, type Pt} from './ink';
import {useTheme} from './ThemeContext';
import {useLayout} from './layout';
import type {FontKind, Role} from './type';

/** Text in a role of the type scale, in the theme's font. The only way text is sized in the library. */
export const Txt: React.FC<{
  children: React.ReactNode;
  role: Role;
  kind?: FontKind;
  color?: string;
  /** capitals with wide tracking, for tags; follows the theme (off in the sketch theme) unless set */
  caps?: boolean;
  /** letter spacing in em */
  tracking?: number;
  align?: 'left' | 'center' | 'right';
  /** outline in the paper colour, so text reads over ruled lines and map lines */
  halo?: boolean | string;
  /** left-to-right write-on, 0..1 */
  reveal?: number;
  style?: React.CSSProperties;
}> = ({children, role, kind = 'body', color, caps, tracking, align, halo, reveal = 1, style}) => {
  const theme = useTheme();
  const L = useLayout();
  const size = L.type.size(role);
  const f = kind === 'display' ? [theme.fonts.display, theme.fonts.displayWeight] : kind === 'number' ? [theme.fonts.number, theme.fonts.numberWeight] : kind === 'serif' ? [theme.fonts.serif, 400] : [theme.fonts.body, theme.fonts.bodyWeight];
  const useCaps = caps ?? (kind === 'body' && role === 'tag' && theme.fonts.caps);
  const track = tracking ?? (useCaps ? 0.14 : kind === 'display' || kind === 'number' ? (theme.id === 'B' ? 0.01 : -0.025) : 0);
  const haloColor = halo === true ? theme.palette.halo : halo || undefined;
  if (reveal <= 0.001) return null;
  let body: React.ReactNode = children;
  if (kind === 'number' && typeof children === 'string') {
    const spec = L.type.spec(role, 'number', {tracking: track * size});
    const cell = digitCell(spec);
    body = children.split('').map((ch, i) => (
      <span key={i} style={{display: 'inline-block', width: /\d/.test(ch) ? cell : undefined, textAlign: 'center'}}>
        {ch}
      </span>
    ));
  }
  return (
    <div
      style={{
        fontFamily: f[0] as string,
        fontWeight: f[1] as number,
        fontSize: size,
        lineHeight: kind === 'display' || kind === 'number' ? 1.06 : 1.2,
        letterSpacing: `${track}em`,
        color: color ?? theme.palette.text,
        textTransform: useCaps ? 'uppercase' : undefined,
        textAlign: align,
        whiteSpace: 'pre',
        fontStyle: kind === 'serif' && theme.id !== 'B' ? 'italic' : undefined,
        fontVariantNumeric: kind === 'number' ? 'tabular-nums' : undefined,
        ...(haloColor ? {WebkitTextStroke: `${size * 0.16}px ${haloColor}`, paintOrder: 'stroke fill'} : {}),
        ...(reveal < 0.999 ? {clipPath: `inset(-20% ${(1 - clamp01(reveal)) * 100}% -20% -20%)`} : {}),
        ...style,
      }}
    >
      {body}
    </div>
  );
};

export interface PlateLine {
  text: string;
  role: Role;
  kind?: FontKind;
  color?: string;
  caps?: boolean;
  /** measure with this text instead (the widest value of a ticking counter), so the plate never resizes */
  sizeText?: string;
  suffix?: {text: string; role: Role; color?: string; gap?: number};
  /** extra space above the line, in u */
  gapAbove?: number;
}

type Anchor = 'tl' | 'tr' | 'bl' | 'br' | 'tc' | 'bc' | 'cc';

/** The size a plate needs for its lines. */
export const plateSize = (L: ReturnType<typeof useLayout>, theme: ReturnType<typeof useTheme>, lines: PlateLine[], pad: {x: number; y: number}) => {
  let w = 0;
  let h = pad.y * 2;
  const rows = lines.map((ln, i) => {
    const kind = ln.kind ?? 'body';
    const useCaps = ln.caps ?? (kind === 'body' && ln.role === 'tag' && theme.fonts.caps);
    const size = L.type.size(ln.role);
    const tracking = useCaps ? 0.14 : kind === 'display' || kind === 'number' ? (theme.id === 'B' ? 0.01 : -0.025) : 0;
    const spec = L.type.spec(ln.role, kind, {tracking: tracking * size});
    const txt = ln.sizeText ?? ln.text;
    let lw = kind === 'number' ? measureNumber(txt, spec) : measureText(useCaps ? txt.toUpperCase() : txt, spec);
    if (ln.suffix) lw += measureText(ln.suffix.text, L.type.spec(ln.suffix.role, 'body')) + (ln.suffix.gap ?? 0.28 * size);
    w = Math.max(w, lw);
    const lh = size * (kind === 'display' || kind === 'number' ? 1.04 : 1.2);
    const gap = i > 0 ? (ln.gapAbove ?? 0) * L.u : 0;
    const row = {top: h - pad.y + gap, lh, size, lw};
    h += lh + gap;
    return row;
  });
  return {w: w + pad.x * 2, h, rows};
};

/**
 * A text plate. Theme A, C, D: a rounded dark card with a thin edge and an accent bar.
 * Theme B: a yellow marker box with a hand-drawn outline. The size comes from the text, so nothing overflows.
 * (x, y) is the point the `anchor` corner sits on. `show` runs the entry from 0 to 1.
 */
export const Plate: React.FC<{
  x: number;
  y: number;
  anchor?: Anchor;
  lines: PlateLine[];
  show?: number;
  bar?: boolean;
  id?: string;
  pad?: {x: number; y: number};
  /** the shadow and slide of the entry; false for a plate that must not move */
  slide?: boolean;
  tone?: 'normal' | 'accent';
  boil?: number;
  /** how the lines sit in the plate */
  align?: 'left' | 'center' | 'right';
}> = ({x, y, anchor = 'tl', lines, show = 1, bar = true, id = 'plate', pad, slide = true, tone = 'normal', boil = 0, align = 'left'}) => {
  const theme = useTheme();
  const L = useLayout();
  const p = theme.palette;
  const padding = pad ?? {x: 34 * L.u, y: 22 * L.u};
  const {w, h, rows} = plateSize(L, theme, lines, padding);
  if (show <= 0.001) return null;
  const e = theme.ease.enter(clamp01(show));
  const ox = anchor.endsWith('r') ? -w : anchor.endsWith('c') ? -w / 2 : 0;
  const oy = anchor.startsWith('b') ? -h : anchor === 'cc' ? -h / 2 : 0;
  const marker = theme.plate === 'marker';
  const sw = 6 * L.u * theme.line.weight;
  return (
    <div
      style={{
        position: 'absolute',
        left: x + ox,
        top: y + oy,
        width: w,
        height: h,
        opacity: clamp01(e * 1.6),
        transform: slide ? `translateY(${(1 - e) * -24 * L.u}px)` : undefined,
        ...(marker
          ? {}
          : {
              background: tone === 'accent' ? p.accent : p.panel,
              border: `${2 * L.u}px solid ${p.panelEdge}`,
              borderRadius: 26 * L.u,
              borderLeft: bar ? `${9 * L.u}px solid ${p.accent}` : undefined,
              boxShadow: `0 ${18 * L.u}px ${50 * L.u}px rgba(0,0,0,0.35)`,
              boxSizing: 'border-box',
            }),
      }}
    >
      {marker && (
        <svg width={w + 20 * L.u} height={h + 20 * L.u} style={{position: 'absolute', left: -6 * L.u, top: -6 * L.u, overflow: 'visible'}}>
          <g transform={`translate(${6 * L.u} ${6 * L.u})`}>
            <Sk id={id + 'bg'} boil={0} still shape={{k: 'rect', x: 0, y: 0, w, h}} stroke="none" sw={0} fill={theme.palette.bg} fillStyle="solid" rg={1.2} />
            <Wash id={id} shape={{k: 'rect', x: 0, y: 0, w, h}} color={tone === 'accent' ? theme.palette.accent : theme.palette.panel} off={[7 * L.u, 7 * L.u]} opacity={1} rg={1.2} />
            <Sk id={id} boil={boil} shape={{k: 'rect', x: 0, y: 0, w, h}} stroke={theme.palette.ink} sw={sw} rg={1.3} />
          </g>
        </svg>
      )}
      {lines.map((ln, i) => {
        const r = rows[i];
        const kind = ln.kind ?? 'body';
        return (
          <div key={i} style={{position: 'absolute', left: padding.x + (w - padding.x * 2 - r.lw) * (align === 'center' ? 0.5 : align === 'right' ? 1 : 0), top: r.top + padding.y, display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
            <Txt role={ln.role} kind={kind} color={ln.color ?? (tone === 'accent' ? '#fff' : p.panelText)} caps={ln.caps}>
              {ln.text}
            </Txt>
            {ln.suffix && (
              <span style={{marginLeft: ln.suffix.gap ?? 0.28 * r.size}}>
                <Txt role={ln.suffix.role} kind="display" color={ln.suffix.color ?? p.accent} tracking={0}>
                  {ln.suffix.text}
                </Txt>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** A leader line from `from` to `to`, drawn on by `show`. Clean: a straight white line. Sketch: wobbles with the boil filter. */
export const LeaderLine: React.FC<{from: Pt; to: Pt; show: number; color?: string; width?: number; dot?: boolean}> = ({from, to, show, color, width, dot = false}) => {
  const theme = useTheme();
  const L = useLayout();
  const w = (width ?? 4) * L.u * theme.line.weight;
  const c = color ?? (theme.id === 'B' ? theme.palette.ink : '#ffffff');
  if (show <= 0.001) return null;
  const s = clamp01(show);
  const end: Pt = [from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s];
  return (
    <g opacity={0.96}>
      <line x1={from[0]} y1={from[1]} x2={end[0]} y2={end[1]} stroke={c} strokeWidth={w} strokeLinecap="round" />
      {dot && <circle cx={from[0]} cy={from[1]} r={w * 1.6} fill={c} />}
    </g>
  );
};
