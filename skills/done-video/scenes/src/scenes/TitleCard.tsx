import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp01, win} from '../core/motion';
import {Boil, Surface} from '../core/paper';
import {Sk, Wash, useInkBoil} from '../core/ink';
import {useTheme} from '../core/ThemeContext';
import {useLayout} from '../core/layout';
import {Txt} from '../core/ui';
import {measureText} from '../core/measure';

/**
 * A title card: a small kicker, the title, an optional subtitle.
 * 16:9: left-aligned, vertically centred. 9:16: centred in the content area. The title wraps and balances its lines,
 * and takes the largest size of the type scale that fits in 3 lines.
 * Clean themes: an accent rule, soft rings. Sketch theme: a marker-highlighted kicker and a hand-drawn underline.
 */
export const TitleCard: React.FC<{title: string; kicker?: string; subtitle?: string; at?: number}> = ({title, kicker, subtitle, at = 0}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const b = useInkBoil();
  const P = theme.palette;
  const hand = theme.line.boil;
  const c = L.content;
  const u = L.u;
  const maxW = L.tall ? c.w : c.w * 0.82;
  const fit = L.type.fit(title, L.tall ? ['display', 'title', 'heading'] : ['display', 'title', 'heading'], maxW, 3, 'display');
  const lh = fit.size * (hand ? 1.08 : 1.06);
  const kickSize = L.type.size('label');
  const subSize = L.type.size('body');
  const gap = 36 * u;
  const kickH = kicker ? kickSize * 1.25 + gap : 0;
  const titleH = fit.lines.length * lh;
  const subH = subtitle ? gap + subSize * 1.3 : 0;
  const total = kickH + titleH + subH;
  const top = c.y + (c.h - total) / 2;
  const align = L.tall ? 'center' : 'left';
  const e = (a: number, d = 0.6) => theme.ease.enter(win(f, at + a, at + a + d * fps));
  const ek = e(0);
  const lineAt = (i: number) => win(f, at + 8 + i * 6, at + 8 + i * 6 + 0.7 * fps);
  const underline = win(f, at + 8 + fit.lines.length * 6 + 6, at + 8 + fit.lines.length * 6 + 24);
  const lastW = L.type.width(fit.lines[fit.lines.length - 1], fit.role as never, 'display');
  const lx = align === 'left' ? c.x : c.x + (c.w - lastW) / 2;
  const kickW = kicker ? measureText(kicker.toUpperCase(), L.type.spec('label', 'body', {tracking: 0.14 * kickSize})) : 0;
  return (
    <AbsoluteFill>
      <Surface />
      <Boil>
        {!hand && (
          <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
            {[0.5, 0.78, 1.06].map((k, i) => (
              <circle key={i} cx={L.tall ? L.W / 2 : L.W * 0.86} cy={L.tall ? L.H * 0.5 : L.H * 0.54} r={Math.min(L.W, L.H) * k * 0.62} fill="none" stroke={P.textMuted} strokeWidth={2 * u} opacity={0.14 - i * 0.03} />
            ))}
          </svg>
        )}
        {hand && (
          <svg width={L.W} height={L.H} style={{position: 'absolute', left: 0, top: 0}}>
            <Sk id="ttl-underline" boil={b} stroke={P.accent} shape={{k: 'curve', pts: [[lx, top + kickH + titleH + 8 * u], [lx + lastW * 0.35, top + kickH + titleH + 2 * u], [lx + lastW * 0.7, top + kickH + titleH + 12 * u], [lx + lastW, top + kickH + titleH + 4 * u]]}} sw={9 * u} draw={underline} rg={1.2} />
            {kicker && <Wash id="ttl-kick" shape={{k: 'rect', x: (align === 'left' ? c.x : c.x + (c.w - kickW) / 2) - 18 * u, y: top - 2 * u, w: kickW + 36 * u, h: kickSize * 1.25 + 8 * u}} color={P.accentSoft} off={[5 * u, 5 * u]} opacity={0.95} draw={ek} />}
          </svg>
        )}
        {kicker && (
          <div style={{position: 'absolute', left: c.x, width: c.w, top, textAlign: align, opacity: clamp01(ek * 1.5), transform: `translateY(${(1 - ek) * 18 * u}px)`}}>
            <Txt role="label" color={hand ? P.ink : P.accent} caps tracking={0.14} align={align}>
              {kicker}
            </Txt>
          </div>
        )}
        <div style={{position: 'absolute', left: c.x, width: c.w, top: top + kickH}}>
          {fit.lines.map((ln, i) => {
            const k = lineAt(i);
            const kk = theme.ease.enter(k);
            return (
              <div key={i} style={{height: lh, opacity: clamp01(kk * 1.4), transform: `translateY(${(1 - kk) * 40 * u}px)`}}>
                <Txt role={fit.role} kind="display" color={P.text} align={align} halo={hand} reveal={hand ? k : 1}>
                  {ln}
                </Txt>
              </div>
            );
          })}
        </div>
        {!hand && (
          <div style={{position: 'absolute', left: align === 'left' ? c.x : c.x + c.w / 2 - 60 * u, top: top + kickH - 20 * u, width: 120 * u * underline, height: 10 * u, borderRadius: 5 * u, background: P.accent}} />
        )}
        {subtitle && (
          <div style={{position: 'absolute', left: c.x, width: c.w, top: top + kickH + titleH + gap, textAlign: align, opacity: clamp01(e(0.5) * 1.5)}}>
            <Txt role="body" color={P.textMuted} align={align} halo={hand}>
              {subtitle}
            </Txt>
          </div>
        )}
      </Boil>
    </AbsoluteFill>
  );
};
