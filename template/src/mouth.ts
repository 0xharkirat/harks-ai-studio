// Mouth timing for the camera-box puppet: Rhubarb cues in, one mouth layer name per frame out.
// Pure functions with no imports, so a plain Node check can run them too.

export type Cue = {start: number; end: number; value: string};
/** A narration line in frames, as layout.json stores it: [start, end). */
export type Span = {start: number; end: number};

// Rhubarb's mouth shapes (A-H, X) to Character Animator mouth layer names; scripts/puppet.py requires each of these.
const SHAPE: Record<string, string> = {X: 'Neutral', A: 'M', B: 'S', C: 'D', D: 'Ah', E: 'Oh', F: 'W-Oo', G: 'F', H: 'L'};

/** True while the narrator is talking, `pad` frames either side of each line. */
export const speakingAt = (frame: number, speaking: Span[], pad = 2) => speaking.some((s) => frame >= s.start - pad && frame < s.end + pad);

/**
 * One mouth layer name per frame: snapped to frames, led by `lead` frames, 1-frame flickers merged away.
 * The mouth stays closed outside the `speaking` lines, so another voice in the video (a clip of someone
 * talking, music, a sound effect) can never move it.
 */
export const mouthTrack = (cues: Cue[], fps: number, speaking: Span[], lead = 1): string[] => {
  const total = Math.ceil((cues.at(-1)?.end ?? 0) * fps) + 1;
  const track: string[] = new Array(total).fill('Neutral');
  for (const c of cues) {
    const from = Math.max(0, Math.round(c.start * fps) - lead);
    const to = Math.max(0, Math.round(c.end * fps) - lead);
    for (let f = from; f < to; f++) track[f] = speakingAt(f, speaking) ? SHAPE[c.value] ?? 'Neutral' : 'Neutral';
  }
  // A 1-frame shape reads as flicker, except a lip closure (M), which sells the B, M and P sounds.
  for (let f = 1; f < total - 1; f++) {
    if (track[f] !== track[f - 1] && track[f] !== track[f + 1] && track[f] !== 'M') track[f] = track[f + 1];
  }
  return track;
};
