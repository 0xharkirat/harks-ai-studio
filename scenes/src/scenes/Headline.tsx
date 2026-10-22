import React from 'react';
import {win} from '../core/motion';
import {useLayout} from '../core/layout';
import {useTheme} from '../core/ThemeContext';
import {Plate, type PlateLine} from '../core/ui';
import {useVideoConfig} from 'remotion';
import {useCurrentFrame} from 'remotion';
import type {Role} from '../core/type';

/**
 * The line the narration is asking or claiming: a big plate in the layout's headline zone.
 * 16:9: the left column under the stat plate, left-aligned. 9:16: full width at the top, centred. The text wraps to fit and balances its lines.
 * The last line takes the accent colour (or `accentFrom` and every line after it).
 */
export const Headline: React.FC<{text: string; at: number; roles?: Role[]; maxLines?: number; accentFrom?: number; id?: string}> = ({text, at, roles, maxLines = 4, accentFrom, id = 'headline'}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const L = useLayout();
  const theme = useTheme();
  const z = L.zones.headline;
  // a wrapper that reserved the top band (a Short's hook line) already carries the headline
  if (z.h <= 0) return null;
  const padX = 40 * L.u;
  const list = roles ?? (z.at === 'top' ? ['title', 'heading', 'body'] : ['heading', 'body']);
  const fit = L.type.fit(text, list, z.w - padX * 2, z.at === 'top' ? Math.min(maxLines, 3) : maxLines, 'display');
  const from = accentFrom ?? (fit.lines.length > 1 ? fit.lines.length - 1 : fit.lines.length);
  const lines: PlateLine[] = fit.lines.map((t, i) => ({text: t, role: fit.role, kind: 'display', color: i >= from ? theme.palette.accent : theme.palette.panelText}));
  const show = win(f, at, at + 0.6 * fps);
  const column = z.at === 'column';
  return (
    <Plate
      x={column ? z.x : z.x + z.w / 2}
      y={z.y}
      anchor={column ? 'tl' : 'tc'}
      lines={lines}
      show={show}
      bar={false}
      id={id}
      pad={{x: padX, y: 26 * L.u}}
      align={column ? 'left' : 'center'}
    />
  );
};
