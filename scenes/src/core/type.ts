import {useTheme} from './ThemeContext';
import {useLayoutBasics} from './layoutBasics';
import {balanceText, measureText, wrapText, type FontSpec} from './measure';
import type {Theme} from './theme';

/**
 * The one type scale. Sizes are frame pixels, in 1.25 steps from a minimum that reads on a phone:
 * 12 px at 360 px frame width (wide 1920 -> 64 px, tall 1080 -> 40 px). No text in the library is set below the minimum.
 * Scenes ask for a role, never a number, so a size change happens here once.
 */

export type Role = 'tag' | 'label' | 'body' | 'heading' | 'title' | 'display' | 'hero';
export const ROLES: Role[] = ['tag', 'label', 'body', 'heading', 'title', 'display', 'hero'];

const RATIO = 1.25;
export const MIN_WIDE = 64;
export const MIN_TALL = 40;

export const roleSizes = (tall: boolean, u = 1): Record<Role, number> => {
  const min = (tall ? MIN_TALL : MIN_WIDE) * u;
  const out = {} as Record<Role, number>;
  ROLES.forEach((r, i) => {
    out[r] = Math.round(min * Math.pow(RATIO, i));
  });
  return out;
};

export type FontKind = 'display' | 'body' | 'number' | 'serif';

export interface TypeScale {
  min: number;
  roles: Record<Role, number>;
  /** The pixel size of a role in the current theme (hand fonts are boosted). */
  size: (role: Role) => number;
  /** A font spec for measuring, for a role and font kind. */
  spec: (role: Role | number, kind?: FontKind, opts?: {italic?: boolean; tracking?: number}) => FontSpec;
  /** The largest role from `roles` (listed large to small) whose text wraps in `maxLines` lines in `maxW`. */
  fit: (text: string, roles: Role[], maxW: number, maxLines: number, kind?: FontKind) => {role: Role; size: number; lines: string[]};
  /** Width of one line of text in a role. */
  width: (text: string, role: Role, kind?: FontKind) => number;
}

const fontFor = (theme: Theme, kind: FontKind) =>
  kind === 'display'
    ? {family: theme.fonts.display, weight: theme.fonts.displayWeight}
    : kind === 'number'
      ? {family: theme.fonts.number, weight: theme.fonts.numberWeight}
      : kind === 'serif'
        ? {family: theme.fonts.serif, weight: 400}
        : {family: theme.fonts.body, weight: theme.fonts.bodyWeight};

export const makeType = (theme: Theme, tall: boolean, u: number): TypeScale => {
  const roles = roleSizes(tall, u);
  const size = (role: Role) => Math.round(roles[role] * theme.fonts.boost);
  const spec: TypeScale['spec'] = (role, kind = 'body', opts = {}) => {
    const f = fontFor(theme, kind);
    return {family: f.family, weight: f.weight, size: typeof role === 'number' ? role : size(role), italic: opts.italic ?? (kind === 'serif' && theme.id !== 'B'), tracking: opts.tracking};
  };
  return {
    min: (tall ? MIN_TALL : MIN_WIDE) * u,
    roles,
    size,
    spec,
    width: (text, role, kind = 'body') => measureText(text, spec(role, kind)),
    fit: (text, list, maxW, maxLines, kind = 'display') => {
      let last: {role: Role; size: number; lines: string[]} | null = null;
      for (const role of list) {
        const s = spec(role, kind);
        const lines = wrapText(text, s, maxW);
        last = {role, size: s.size, lines};
        if (lines.length <= maxLines) return {role, size: s.size, lines: balanceText(text, s, maxW)};
      }
      return last!;
    },
  };
};

export const useType = (): TypeScale => {
  const theme = useTheme();
  const {tall, u} = useLayoutBasics();
  return makeType(theme, tall, u);
};
