// Music sync. Loads /music/<cue>.timing.json + envelopes.json; falls back to a plain 120 BPM grid
// until the soundtrack exists, so scenes always design to bars and beats, never to samples.
import { BEAT, FPS } from './time';

export interface Timing {
  bpm: number;
  duration: number;
  sections: { id: string; name: string; startBar: number; endBar: number; start: number; end: number }[];
  events: Record<string, any[]>;
}

export class Audio {
  timing: Timing | null = null;
  env: Record<string, number[]> | null = null;
  private cache = new Map<string, number[]>();
  /** `speed`: design seconds per real second (Cut.speed). Scenes ask in design time; the cue is in real time. */
  constructor(public cue: string, public duration: number, public speed = 1) {}

  async load() {
    try {
      const r = await fetch(`/music/${this.cue}.timing.json`);
      if (r.ok) this.timing = await r.json();
    } catch {}
    const ts = (this.timing as any)?.timeScale ?? 1;
    if (this.timing && Math.abs(ts * this.speed - 1) > 1e-6) console.error(`[audio] ${this.cue}: timeScale ${ts} does not match cut speed ${this.speed}`);
    try {
      const r = await fetch(`/music/${this.cue}.envelopes.json`);
      if (r.ok) {
        const j = await r.json();
        this.env = j.channels ?? j;
      }
    } catch {}
  }

  get url() {
    return `/music/${this.cue}.wav`;
  }

  /** Onset times of an event list (kick, snare, clap, hatClosed, hatOpen, crash, impact, foley:click ...). */
  hits(name: string): number[] {
    const hit = this.cache.get(name);
    if (hit) return hit;
    let out: number[] = [];
    const ev = this.timing?.events;
    if (ev) {
      if (name.startsWith('foley:')) {
        const type = name.slice(6);
        out = (ev.foley ?? []).filter((e: any) => e.type === type).map((e: any) => e.t);
      } else {
        out = (ev[name] ?? []).map((e: any) => (typeof e === 'number' ? e : e.t ?? e.start));
      }
    } else {
      // Grid fallback.
      const n = Math.ceil(this.duration / BEAT);
      for (let i = 0; i < n; i++) {
        const t = i * BEAT;
        if (name === 'kick') out.push(t);
        if ((name === 'snare' || name === 'clap') && i % 2 === 1) out.push(t);
        if (name === 'hatOpen') out.push(t + BEAT / 2);
        if (name === 'crash' && i % 16 === 0) out.push(t);
      }
    }
    if (this.speed !== 1 && ev) out = out.map((t) => t * this.speed);
    out.sort((a, b) => a - b);
    this.cache.set(name, out);
    return out;
  }

  /** Last onset of `name` at or before t (or -Infinity). */
  last(name: string, t: number) {
    const a = this.hits(name);
    let lo = 0, hi = a.length - 1, best = -Infinity;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (a[m] <= t + 1e-6) { best = a[m]; lo = m + 1; } else hi = m - 1;
    }
    return best;
  }

  /** Exponential decay since the last onset of `name`: 1 on the hit, falling with `decay` per second. */
  pulse(name: string, t: number, decay = 10) {
    const l = this.last(name, t);
    return l === -Infinity ? 0 : Math.exp(-(t - l) * decay);
  }

  /** Per-frame envelope value 0..1 (master, kick, snare, hats, bass, chords, lead, fx, onset). */
  level(name: string, t: number) {
    const a = this.env?.[name];
    if (!a) return name === 'master' ? 0.6 : 0;
    const i = Math.max(0, Math.min(a.length - 1, Math.round((t / this.speed) * FPS)));
    return a[i] ?? 0;
  }
}
