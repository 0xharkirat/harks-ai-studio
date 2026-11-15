// Pure animation helpers. Every value is a function of time: never keep state between frames.

export const clamp = (x: number, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const invLerp = (a: number, b: number, x: number) => (b === a ? 0 : (x - a) / (b - a));
export const remap = (x: number, a: number, b: number, c: number, d: number) => lerp(c, d, clamp(invLerp(a, b, x)));

/** Progress 0..1 of t through [a, b], optionally eased. */
export const seg = (t: number, a: number, b: number, e: (p: number) => number = (p) => p) => e(clamp(invLerp(a, b, t)));

/** 1 inside [a, b] with eased ramps of `inDur` / `outDur` at both ends. */
export function win(t: number, a: number, b: number, inDur = 0.25, outDur = inDur, e: (p: number) => number = ease.inOutCubic) {
  if (t < a || t > b) return 0;
  const i = inDur > 0 ? e(clamp((t - a) / inDur)) : 1;
  const o = outDur > 0 ? e(clamp((b - t) / outDur)) : 1;
  return Math.min(i, o);
}

export const ease = {
  linear: (p: number) => p,
  inQuad: (p: number) => p * p,
  outQuad: (p: number) => 1 - (1 - p) * (1 - p),
  inOutQuad: (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2),
  inCubic: (p: number) => p * p * p,
  outCubic: (p: number) => 1 - (1 - p) ** 3,
  inOutCubic: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  inQuart: (p: number) => p ** 4,
  outQuart: (p: number) => 1 - (1 - p) ** 4,
  inOutQuart: (p: number) => (p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2),
  outQuint: (p: number) => 1 - (1 - p) ** 5,
  inOutQuint: (p: number) => (p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2),
  inExpo: (p: number) => (p <= 0 ? 0 : 2 ** (10 * p - 10)),
  outExpo: (p: number) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p)),
  inOutExpo: (p: number) =>
    p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2,
  outBack: (p: number, s = 1.70158) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  inBack: (p: number, s = 1.70158) => (s + 1) * p ** 3 - s * p * p,
  outCirc: (p: number) => Math.sqrt(1 - (p - 1) ** 2),
  /** Fast snap with a soft landing: the house entrance ease. */
  snap: (p: number) => 1 - (1 - p) ** 6,
  /** Slow start, violent middle, soft end: whip pans. */
  whip: (p: number) => (p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2),
};

/**
 * Damped spring step response at time t (seconds since release), from 0 to 1.
 * `freq` in Hz, `damp` 0..1 (1 = critically damped). Closed form, so it is time-pure.
 */
export function spring(t: number, freq = 3, damp = 0.55) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * freq;
  if (damp >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - damp * damp);
  return 1 - Math.exp(-damp * w * t) * (Math.cos(wd * t) + ((damp * w) / wd) * Math.sin(wd * t));
}

/** Keyframe track: [[t, value], ...] with per-key easing into that key. */
export function track(t: number, keys: [number, number, ((p: number) => number)?][]) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return lerp(v0, v1, (e ?? ease.inOutCubic)(invLerp(t0, t1, t)));
    }
  }
  return keys[keys.length - 1][1];
}

/** Limited animation: quantize time to `fps` steps (anime-style held frames). */
export const hold = (t: number, fps = 12) => Math.floor(t * fps) / fps;

/** Exponential decay pulse since `t0`. */
export const pulseSince = (t: number, t0: number, decay = 8) => (t < t0 ? 0 : Math.exp(-(t - t0) * decay));

/** Deterministic hash of numbers to 0..1. */
export function hash(...n: number[]) {
  let h = 2166136261;
  for (const x of n) {
    h ^= Math.floor(x * 1000003) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return ((h >>> 0) % 1000000) / 1000000;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 1D value noise in -1..1. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  const a = hash(i, seed) * 2 - 1;
  const b = hash(i + 1, seed) * 2 - 1;
  return lerp(a, b, u);
}

/** Handheld-style drift: [x, y] in px. */
export const drift = (t: number, amp = 6, speed = 0.35, seed = 1): [number, number] => [
  noise1(t * speed, seed) * amp,
  noise1(t * speed, seed + 17) * amp,
];

/** Number of characters of `text` revealed by typing at `cps` chars/s starting at t0. */
export const typed = (t: number, t0: number, cps: number, text: string) =>
  text.slice(0, Math.max(0, Math.min(text.length, Math.floor((t - t0) * cps))));
