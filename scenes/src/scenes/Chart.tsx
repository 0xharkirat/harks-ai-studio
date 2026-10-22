import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {clamp01, easeOut, win} from '../core/motion';
import {Boil, Surface} from '../core/paper';
import {Sk, Wash, useInkBoil} from '../core/ink';
import {useTheme} from '../core/ThemeContext';
import {useLayout, type Rect} from '../core/layout';
import {Plate, LeaderLine, Txt, type PlateLine} from '../core/ui';
import {measureText} from '../core/measure';
import {placeLabel} from './LeaderLabel';

/*
 * Simple charts: horizontal bars and a scatter. Horizontal bars keep every label at the minimum size or above, in
 * both orientations; when the longest label is too wide for a row, the label moves above its bar (9:16 reflow).
 */

export interface BarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}
export interface ScatterPoint {
  x: number;
  y: number;
  label?: string;
  highlight?: boolean;
}

type Base = {title?: string; source?: string; at?: number};
export type ChartProps =
  | (Base & {kind: 'bar'; data: BarDatum[]; unit?: string; decimals?: number})
  | (Base & {kind: 'scatter'; points: ScatterPoint[]; xLabel: string; yLabel: string; xTicks?: number[]; yTicks?: number[]; xDomain?: [number, number]; yDomain?: [number, number]});

const niceTicks = (max: number, n = 4): number[] => {
  const raw = max / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.01; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
};
const fmtNum = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});

export const Chart: React.FC<ChartProps> = (props) => {
  const f = useCurrentFrame();
  const L = useLayout();
  const theme = useTheme();
  const b = useInkBoil();
  const P = theme.palette;
  const hand = theme.line.boil;
  const u = L.u;
  const c = L.content;
  const at = props.at ?? 0;
  const tagSize = L.type.size('tag');

  // title on top, source at the bottom, the chart between
  const titleFit = props.title ? L.type.fit(props.title, L.tall ? ['heading', 'body', 'label'] : ['heading', 'body'], c.w, 2, 'display') : null;
  const titleH = titleFit ? titleFit.lines.length * titleFit.size * 1.1 + 28 * u : 0;
  const srcH = props.source ? tagSize * 1.5 + 12 * u : 0;
  const area: Rect = {x: c.x, y: c.y + titleH, w: c.w, h: c.h - titleH - srcH};
  const titleIn = theme.ease.enter(win(f, at, at + 18));
  const srcIn = theme.ease.enter(win(f, at + 30, at + 50));

  let body: React.ReactNode = null;
  let plates: React.ReactNode = null;

  if (props.kind === 'bar') {
    const {data, unit, decimals = 0} = props;
    const maxRows = Math.floor(area.h / (tagSize * (L.tall ? 1.9 : 1.6)));
    const rows = data.length > maxRows ? data.slice(0, maxRows) : data;
    if (data.length > maxRows) console.warn(`Chart: ${data.length} bars do not fit in ${L.tall ? '9:16' : '16:9'} at the minimum text size; showing the first ${maxRows}.`);
    const spec = L.type.spec('tag', 'body');
    const labelW = Math.max(...rows.map((r) => measureText(r.label, spec)));
    const stacked = labelW > area.w * 0.4;
    const valSpec = L.type.spec('tag', 'display');
    const valW = Math.max(...rows.map((r) => measureText(`${fmtNum(r.value, decimals)}${unit ? ' ' + unit : ''}`, valSpec))) + 16 * u;
    const gutter = stacked ? 0 : labelW + 24 * u;
    const barX = area.x + gutter + 8 * u;
    const barMax = area.w - gutter - valW - 8 * u;
    const rowH = area.h / rows.length;
    const barH = Math.min(rowH * (stacked ? 0.4 : 0.58), 90 * u);
    const vmax = Math.max(...rows.map((r) => r.value));
    body = (
      <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
        <Sk id="axis" boil={b} stroke={P.chart.axis} shape={{k: 'line', a: [barX, area.y], b: [barX, area.y + area.h]}} sw={4 * u} draw={win(f, at, at + 14)} rg={hand ? 1.2 : 0.2} />
        {rows.map((r, i) => {
          const a0 = at + 10 + i * 7;
          const k = easeOut(win(f, a0, a0 + 24));
          const cy = area.y + rowH * i + rowH / 2;
          const top = stacked ? cy + tagSize * 0.35 - barH / 2 : cy - barH / 2;
          const w = Math.max(2, (r.value / vmax) * barMax * k);
          const col = r.highlight ? P.chart.bar : P.chart.barDim;
          return hand ? (
            <g key={i}>
              <Wash id={`bar${i}`} shape={{k: 'rect', x: barX, y: top, w, h: barH}} color={col} off={[5 * u, 5 * u]} opacity={0.55} draw={k} />
              <Sk id={`bar${i}`} boil={b} stroke={P.ink} shape={{k: 'rect', x: barX, y: top, w, h: barH}} sw={5 * u} fill={col} fillStyle="hachure" hg={11 * u} fw={3 * u} draw={k} rg={1.2} />
            </g>
          ) : (
            <rect key={i} x={barX} y={top} width={w} height={barH} rx={8 * u} fill={col} />
          );
        })}
      </svg>
    );
    plates = rows.map((r, i) => {
      const a0 = at + 10 + i * 7;
      const k = easeOut(win(f, a0, a0 + 24));
      const cy = area.y + rowH * i + rowH / 2;
      const w = Math.max(2, (r.value / vmax) * barMax * k);
      const valueText = `${fmtNum(r.value * k, decimals)}${unit ? ' ' + unit : ''}`;
      return (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: area.x, top: stacked ? cy - barH / 2 - tagSize * 1.1 : cy - tagSize * 0.6, opacity: clamp01(k * 3), width: stacked ? area.w : labelW + 16 * u}}>
            <Txt role="tag" color={r.highlight ? P.text : P.textMuted} caps={false} halo={hand} align={stacked ? 'left' : 'right'} style={{fontWeight: r.highlight ? theme.fonts.bodyWeight : undefined}}>
              {r.label}
            </Txt>
          </div>
          <div style={{position: 'absolute', left: barX + w + 14 * u, top: stacked ? cy + tagSize * 0.35 - tagSize * 0.6 : cy - tagSize * 0.6, opacity: clamp01(k * 3)}}>
            <Txt role="tag" kind="display" color={r.highlight ? P.accent : P.text} halo={hand}>
              {valueText}
            </Txt>
          </div>
        </React.Fragment>
      );
    });
  } else {
    const {points, xLabel, yLabel} = props;
    const xMax = props.xDomain?.[1] ?? Math.max(...props.xTicks ?? [0], ...points.map((p) => p.x));
    const yMax = props.yDomain?.[1] ?? Math.max(...props.yTicks ?? [0], ...points.map((p) => p.y));
    const xTicks = props.xTicks ?? niceTicks(xMax);
    const yTicks = props.yTicks ?? niceTicks(yMax);
    const xDom: [number, number] = props.xDomain ?? [0, xTicks[xTicks.length - 1]];
    const yDom: [number, number] = props.yDomain ?? [0, yTicks[yTicks.length - 1]];
    const tspec = L.type.spec('tag', 'body');
    const yTickW = Math.max(...yTicks.map((v) => measureText(fmtNum(v), tspec)));
    const left = tagSize * 1.5 + yTickW + 22 * u; // the rotated y title, then the tick labels
    const bottom = tagSize * 1.25 + tagSize * 1.45 + 14 * u;
    const plot: Rect = {x: area.x + left, y: area.y + 12 * u, w: area.w - left - 20 * u, h: area.h - bottom - 12 * u};
    const sx = (v: number) => plot.x + ((v - xDom[0]) / (xDom[1] - xDom[0])) * plot.w;
    const sy = (v: number) => plot.y + plot.h - ((v - yDom[0]) / (yDom[1] - yDom[0])) * plot.h;
    const axisIn = win(f, at, at + 16);
    const hl = points.find((p) => p.highlight);
    body = (
      <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
        {yTicks.map((v) => (
          <line key={`gy${v}`} x1={plot.x} y1={sy(v)} x2={plot.x + plot.w * axisIn} y2={sy(v)} stroke={P.chart.grid} strokeWidth={2 * u} />
        ))}
        {xTicks.map((v) => (
          <line key={`gx${v}`} x1={sx(v)} y1={plot.y} x2={sx(v)} y2={plot.y + plot.h * axisIn} stroke={P.chart.grid} strokeWidth={2 * u} />
        ))}
        <Sk id="ax-x" boil={b} stroke={P.chart.axis} shape={{k: 'line', a: [plot.x, plot.y + plot.h], b: [plot.x + plot.w, plot.y + plot.h]}} sw={4 * u} draw={axisIn} rg={hand ? 1.2 : 0.2} />
        <Sk id="ax-y" boil={b} stroke={P.chart.axis} shape={{k: 'line', a: [plot.x, plot.y], b: [plot.x, plot.y + plot.h]}} sw={4 * u} draw={axisIn} rg={hand ? 1.2 : 0.2} />
        {points.map((p, i) => {
          const a0 = at + 14 + i * 4;
          const k = theme.ease.pop(win(f, a0, a0 + 16));
          if (k <= 0) return null;
          const r = (p.highlight ? 21 : 14) * u * Math.min(1.15, k);
          const col = p.highlight ? P.chart.bar : P.chart.barDim;
          return (
            <g key={i} opacity={clamp01(k * 2)}>
              {p.highlight && <circle cx={sx(p.x)} cy={sy(p.y)} r={r + 14 * u} fill="none" stroke={P.chart.bar} strokeWidth={4 * u} opacity={0.6} />}
              <circle cx={sx(p.x)} cy={sy(p.y)} r={r} fill={col} stroke={hand ? P.ink : 'rgba(255,255,255,0.85)'} strokeWidth={(hand ? 4 : 2.5) * u} />
            </g>
          );
        })}
        {hl?.label && (() => {
          const lines: PlateLine[] = [{text: hl.label, role: 'tag', kind: 'display', color: P.panelText}];
          const show = easeOut(win(f, at + 14 + points.indexOf(hl) * 4 + 12, at + 14 + points.indexOf(hl) * 4 + 30));
          const pl = placeLabel(L, theme, [sx(hl.x), sy(hl.y)], lines, {dir: 'nw', dist: 70 * u, bounds: plot});
          return <LeaderLine from={pl.from} to={pl.to} show={show} dot />;
        })()}
      </svg>
    );
    plates = (
      <>
        {yTicks.map((v) => (
          <div key={`ty${v}`} style={{position: 'absolute', left: area.x + tagSize * 1.5, width: yTickW + 10 * u, top: sy(v) - tagSize * 0.62, opacity: axisIn}}>
            <Txt role="tag" color={P.textMuted} caps={false} align="right" halo={hand}>{fmtNum(v)}</Txt>
          </div>
        ))}
        {xTicks.map((v) => (
          <div key={`tx${v}`} style={{position: 'absolute', left: sx(v) - 150 * u, width: 300 * u, top: plot.y + plot.h + 10 * u, opacity: axisIn}}>
            <Txt role="tag" color={P.textMuted} caps={false} align="center" halo={hand}>{fmtNum(v)}</Txt>
          </div>
        ))}
        <div style={{position: 'absolute', left: plot.x, width: plot.w, top: plot.y + plot.h + tagSize * 1.3 + 12 * u, opacity: axisIn}}>
          <Txt role="tag" color={P.text} caps={false} align="center" halo={hand} style={{fontWeight: theme.fonts.bodyWeight}}>{xLabel}</Txt>
        </div>
        <div style={{position: 'absolute', left: area.x + tagSize * 0.65, top: plot.y + plot.h / 2, transform: 'translate(-50%, -50%) rotate(-90deg)', opacity: axisIn}}>
          <Txt role="tag" color={P.text} caps={false} halo={hand} style={{fontWeight: theme.fonts.bodyWeight}}>{yLabel}</Txt>
        </div>
        {(() => {
          const hlp = points.find((p) => p.highlight);
          if (!hlp?.label) return null;
          const lines: PlateLine[] = [{text: hlp.label, role: 'tag', kind: 'display', color: P.panelText}];
          const show = easeOut(win(f, at + 14 + points.indexOf(hlp) * 4 + 12, at + 14 + points.indexOf(hlp) * 4 + 30));
          const pl = placeLabel(L, theme, [sx(hlp.x), sy(hlp.y)], lines, {dir: 'nw', dist: 70 * u, bounds: plot});
          return <Plate x={pl.x} y={pl.y} anchor={pl.anchor} lines={lines} show={show} slide={false} bar={false} id="scatter-hl" pad={{x: 22 * u, y: 10 * u}} />;
        })()}
      </>
    );
  }

  return (
    <AbsoluteFill>
      <Surface />
      <Boil>
        {titleFit && (
          <div style={{position: 'absolute', left: c.x, top: c.y, width: c.w, opacity: clamp01(titleIn * 1.5), transform: `translateY(${(1 - titleIn) * 18 * u}px)`}}>
            {titleFit.lines.map((ln, i) => (
              <Txt key={i} role={titleFit.role} kind="display" color={P.text} align={L.tall ? 'center' : 'left'} halo={hand} style={{lineHeight: 1.1}}>
                {ln}
              </Txt>
            ))}
          </div>
        )}
        {body}
        {plates}
        {props.source && (
          <div style={{position: 'absolute', left: c.x, width: c.w, top: c.y + c.h - tagSize * 1.5, opacity: clamp01(srcIn * 1.4), textAlign: L.tall ? 'center' : 'left'}}>
            <Txt role="tag" color={P.textMuted} caps={false} halo={hand} align={L.tall ? 'center' : 'left'}>
              {(hand ? 'source: ' : 'Source: ') + props.source}
            </Txt>
          </div>
        )}
      </Boil>
    </AbsoluteFill>
  );
};
