import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp01, easeInOut, easeOut, win} from '../core/motion';
import {Boil, Surface} from '../core/paper';
import {Sk, Wash, useInkBoil} from '../core/ink';
import {useTheme} from '../core/ThemeContext';
import {useLayout} from '../core/layout';
import {Txt} from '../core/ui';
import {balanceText, measureNumber} from '../core/measure';

/**
 * The number reveal. Channel rule 7: the first 10 seconds show 1 computed number with its source.
 * `source` is required, so a number cannot go on screen without one. The number counts up from `from` to `value`
 * in fixed digit cells (it never jitters), locks with a small pop, and the source tag lands under it.
 * 16:9 and 9:16 both centre the stack; the number takes the largest size of the scale that fits the width.
 */
export const NumberReveal: React.FC<{
  value: number;
  unit?: string;
  /** what the number measures, above it */
  label: string;
  /** where it comes from, below it: required */
  source: string;
  at?: number;
  countFrames?: number;
  from?: number;
  decimals?: number;
}> = ({value, unit, label, source, at = 0, countFrames = 54, from = 0, decimals = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const b = useInkBoil();
  const P = theme.palette;
  const hand = theme.line.boil;
  const u = L.u;
  const c = L.content;
  const fmt = (n: number) => n.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  const final = fmt(value);

  // the number: the largest role that fits the width together with its unit
  const gapU = 26 * u;
  let role: 'hero' | 'display' | 'title' = 'hero';
  let numW = 0;
  let unitW = 0;
  for (const r of ['hero', 'display', 'title'] as const) {
    role = r;
    numW = measureNumber(final, L.type.spec(r, 'number', {tracking: -0.025 * L.type.size(r)}));
    unitW = unit ? L.type.width(unit, 'heading', 'display') + gapU : 0;
    if (numW + unitW <= c.w * (hand ? 0.84 : 0.96)) break;
  }
  const numSize = L.type.size(role);
  const tagSize = L.type.size('tag');
  // The source wraps inside the content width (a long source line used to run off the frame). Its label leads the first line.
  const srcLabel = hand ? 'source:' : 'Source:';
  const srcLines = balanceText(`${srcLabel} ${source}`, L.type.spec('tag', 'body'), c.w * 0.96);
  const srcLineH = tagSize * 1.25;
  const srcH = srcLines.length * srcLineH;
  const srcGap = 56 * u;
  const labelGap = (hand ? 64 : 28) * u; // the sketch theme circles the number, and the ring needs room above it
  // the label above the number takes the largest size that leaves room for the whole stack
  const numH = numSize * 1.04;
  let labelFit = L.type.fit(label, [L.tall ? 'body' : 'heading', 'label'], c.w, 2, 'display');
  const stackFor = (lf: typeof labelFit) => lf.lines.length * lf.size * 1.12 + labelGap + numH + srcGap + srcH;
  if (stackFor(labelFit) > c.h) labelFit = L.type.fit(label, ['label'], c.w, 3, 'display');

  const t0 = at + 6;
  const progress = easeOut(win(f, t0, t0 + countFrames));
  const shown = from + (value - from) * progress;
  const lockAt = t0 + countFrames;
  const pop = 1 + 0.06 * Math.sin(clamp01((f - lockAt) / (0.45 * fps)) * Math.PI);
  const labelIn = theme.ease.enter(win(f, at, at + 0.5 * fps));
  const srcIn = theme.ease.enter(win(f, lockAt - 0.3 * fps, lockAt + 0.4 * fps));
  const rule = easeInOut(win(f, lockAt, lockAt + 0.5 * fps));

  const labelH = labelFit.lines.length * labelFit.size * 1.12;
  const stackH = stackFor(labelFit);
  const top = c.y + Math.max(0, (c.h - stackH) / 2);
  const numTop = top + labelH + labelGap;
  const rowW = numW + unitW;
  const rowX = c.x + (c.w - rowW) / 2;
  const srcY = numTop + numH + srcGap;

  return (
    <AbsoluteFill>
      <Surface />
      <Boil>
        <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
          {hand ? (
            <>
              <Wash id="nr-box" shape={{k: 'rect', x: rowX - 50 * u, y: numTop - 6 * u, w: rowW + 100 * u, h: numH + 24 * u}} color={P.accentSoft} off={[9 * u, 9 * u]} opacity={0.9} draw={labelIn} rg={1.2} />
              <Sk id="nr-box" boil={b} stroke={P.ink} shape={{k: 'rect', x: rowX - 50 * u, y: numTop - 6 * u, w: rowW + 100 * u, h: numH + 24 * u}} sw={8 * u} draw={labelIn} rg={1.3} />
              <Sk id="nr-ring" boil={b} stroke={P.accent} shape={{k: 'ellipse', c: [c.x + c.w / 2, numTop + numH / 2 + 6 * u], w: rowW + 220 * u, h: numH + 110 * u}} sw={9 * u} draw={win(f, lockAt, lockAt + 0.5 * fps)} rg={1.6} />
            </>
          ) : (
            <rect x={rowX} y={numTop + numH + 30 * u} width={rowW * rule} height={8 * u} rx={4 * u} fill={P.accent} />
          )}
        </svg>
        <div style={{position: 'absolute', left: c.x, width: c.w, top, opacity: clamp01(labelIn * 1.5), transform: `translateY(${(1 - labelIn) * 20 * u}px)`}}>
          {labelFit.lines.map((ln, i) => (
            <Txt key={i} role={labelFit.role} kind="display" color={hand ? P.text : P.textMuted} align="center" halo={hand} style={{lineHeight: 1.12}}>
              {ln}
            </Txt>
          ))}
        </div>
        <div style={{position: 'absolute', left: rowX, top: numTop, display: 'flex', alignItems: 'baseline', transform: `scale(${pop})`, transformOrigin: 'center'}}>
          <Txt role={role} kind="number" color={P.text} halo={hand}>
            {fmt(shown)}
          </Txt>
          {unit && (
            <div style={{marginLeft: gapU}}>
              <Txt role="heading" kind="display" color={P.accent} tracking={0} halo={hand}>
                {unit}
              </Txt>
            </div>
          )}
        </div>
        <div style={{position: 'absolute', left: c.x, width: c.w, top: srcY, opacity: clamp01(srcIn * 1.4), transform: `translateY(${(1 - srcIn) * 16 * u}px)`}}>
          {srcLines.map((ln, i) => (
            <div key={i} style={{display: 'flex', justifyContent: 'center', gap: 0.3 * tagSize}}>
              {i === 0 && (
                <Txt role="tag" color={P.accent} caps={false} halo={hand}>
                  {srcLabel}
                </Txt>
              )}
              <Txt role="tag" color={P.textMuted} caps={false} halo={hand}>
                {i === 0 ? ln.slice(srcLabel.length + 1) : ln}
              </Txt>
            </div>
          ))}
        </div>
      </Boil>
    </AbsoluteFill>
  );
};

