import {Easing, interpolate} from 'remotion';

// Small motion helpers. Every time in the library is a scene-local frame at the composition fps.

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progress of the window [a, b] at frame f, clamped to 0..1. */
export const win = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));

export const easeInOut = Easing.inOut(Easing.cubic);
export const easeOut = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);
export const easeInOutSine = Easing.inOut(Easing.sin);
/** A little overshoot, for things that pop in. */
export const easeOutBack = Easing.bezier(0.34, 1.56, 0.64, 1);

export type EaseFn = (t: number) => number;

export const map = (f: number, input: number[], output: number[], easing?: EaseFn) =>
  interpolate(f, input, output, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

/** 0 -> 1 -> 0 pulse with the given period (frames), for living motion on holds. */
export const wave = (f: number, period: number) => 0.5 - 0.5 * Math.cos((f / period) * Math.PI * 2);

/** Deterministic hash in 0..1, so 2 renders give the same frames. */
export const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Cue helper: the frame line `i` starts, or `fallback` when the script has fewer lines. */
export const at = (cue: number[] | undefined, i: number, fallback = 0) => (cue && cue[i] != null ? cue[i] : cue && cue.length ? cue[cue.length - 1] : fallback);
