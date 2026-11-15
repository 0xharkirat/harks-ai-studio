// Topic ads (round 8): one part of the anthem and the first 5 s of its end card, 16:9, 14-18 s each.
// The music is cut from the anthem's chill cue at the same places (music/src/song/cues.py, TOPICS), so the scenes
// keep their anthem props and design times, and every sound effect still lands on its picture.
import type { Cut, Entry } from '../engine/stage';
import anthem from './anthem-r7';
import cta from '../scenes/cta';
import dog from '../scenes/dog';
import { punch } from '../engine/fx';

/** A copy of the anthem's props for one scene id. */
export const anthemProps = (id: string) => ({ ...(anthem.timeline.find((e) => e.scene.id === id)!.props as object) });

export interface TopicAd {
  id: string;
  title: string;
  /** The topic's scenes, from 0, in design seconds. */
  parts: Entry[];
  /** The corner logo: from when (default 0) and its tone keys, local to that start. */
  dogFrom?: number;
  dogTones: [number, 'light' | 'dark'][];
  /** Drop windows for the camera punch on the kick (the anthem's choruses). */
  drops?: [number, number][];
}

export function topicAd(o: TopicAd): Cut {
  const len = Math.max(...o.parts.map((e) => e.end));
  const dogFrom = o.dogFrom ?? 0;
  // No QR code: these run on Instagram, watched on the phone that would scan it. tina.io stays on the card.
  // No white flash on the first frame: in the anthem a white bloom hides it, but here the card follows a hard cut.
  const endCard: Entry = { scene: cta, start: len, end: len + 5, props: { ...anthemProps('cta'), qr: undefined, flash: 0 } };
  return {
    id: o.id,
    title: o.title,
    music: o.id.replace('-', '_'),
    duration: len + 5,
    speed: anthem.speed,
    W: 1920,
    H: 1080,
    global: o.drops ? punch(o.drops) : undefined,
    timeline: [...o.parts, endCard, { scene: dog, start: dogFrom, end: len, z: 500, props: { corner: 'tl', opacity: 0.8, tones: o.dogTones } }],
  };
}
