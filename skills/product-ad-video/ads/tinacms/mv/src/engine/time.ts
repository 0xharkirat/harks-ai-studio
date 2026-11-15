// The musical grid. All cues are 120 BPM, 4/4: a beat is 0.5 s (30 frames at 60 fps), a bar 2.0 s.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const SIXTEENTH = BEAT / 4;

/** Seconds at a 1-indexed bar and (fractional) beat: at(3) = 4.0, at(3, 3) = 5.0. */
export const at = (bar: number, beat = 1) => (bar - 1) * BAR + (beat - 1) * BEAT;

export function gridPos(t: number) {
  const b = t / BEAT;
  return { bar: Math.floor(b / 4) + 1, beat: (Math.floor(b) % 4) + 1, frac: b - Math.floor(b) };
}

/** Progress through the current beat, 0..1. */
export const beatPhase = (t: number) => (t / BEAT) % 1;
