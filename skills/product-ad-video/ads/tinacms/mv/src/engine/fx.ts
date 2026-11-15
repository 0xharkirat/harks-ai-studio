// Global camera feel shared by the cuts: a small punch on the kick inside drops, a shake on impacts.
import type { Cut } from './stage';
import { noise1 } from './anim';

type G = Parameters<NonNullable<Cut['global']>>[0];

export function punch(drops: [number, number][], amount = 0.006) {
  return (f: G) => {
    const inDrop = drops.some(([a, b]) => f.t >= a && f.t < b);
    if (inDrop) f.post.zoom *= 1 + amount * f.audio.pulse('kick', f.t, 14);
    const imp = f.audio.pulse('impact', f.t, 9);
    if (imp > 0.01) f.post.shake = [noise1(f.t * 40, 1) * 7 * imp, noise1(f.t * 40, 2) * 7 * imp];
  };
}
