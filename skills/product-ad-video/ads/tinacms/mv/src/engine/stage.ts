// The stage: a W x H DOM root that renders a cut (a timeline of scenes) as a pure function of time.
import { Audio } from './audio';
import { box, css } from './dom';
import { FPS } from './time';
import { Post, type PostState } from './post';

export interface Frame {
  /** Global time in seconds. */
  t: number;
  frame: number;
  /** Seconds since this entry's start (negative during `pre`, > dur during `post`). */
  lt: number;
  /** Entry length in seconds (end - start). */
  dur: number;
  /** lt / dur, unclamped. */
  p: number;
  W: number;
  H: number;
  portrait: boolean;
  audio: Audio;
  /** Global finishing state for this frame, mutable by scenes (reset every frame). */
  post: PostState;
  entry: Entry;
}

export interface SceneInst {
  update(f: Frame): void | Promise<void>;
}

export interface SetupCtx {
  root: HTMLElement;
  W: number;
  H: number;
  portrait: boolean;
  audio: Audio;
  cut: Cut;
  entry: Entry;
}

export interface SceneDef<P = any> {
  id: string;
  setup(ctx: SetupCtx, props: P): SceneInst | Promise<SceneInst>;
}

export interface Entry<P = any> {
  scene: SceneDef<P>;
  start: number;
  end: number;
  props?: P;
  /** Seconds rendered before start (entrance pre-roll / overlap with the previous scene). */
  pre?: number;
  /** Seconds rendered after end (exit tail under the next scene). */
  post?: number;
  /** Stacking order; later entries stack above earlier ones by default. */
  z?: number;
}

export interface Cut {
  id: string;
  title: string;
  /** Music cue id: /music/<music>.wav + timing. */
  music: string;
  /** Length in design seconds (the 120 BPM grid that scenes and timelines are written in). */
  duration: number;
  /** Design seconds per real second. 1 plays as written; 1 / 1.2 plays the 120 BPM design at 100 BPM.
   *  The music cue must be rendered with the matching time scale (music/src/song/score.py retime). */
  speed?: number;
  W: number;
  H: number;
  bg?: string;
  timeline: Entry[];
  /** Per-frame global hook (post defaults, global motifs). */
  global?: (f: Omit<Frame, 'lt' | 'dur' | 'p' | 'entry'>) => void;
}

interface Live {
  entry: Entry;
  root: HTMLDivElement;
  inst: SceneInst | null;
  error?: string;
}

export class Stage {
  root: HTMLDivElement;
  /** Holds every scene; the post pass punches/shakes it as one picture. */
  world: HTMLDivElement;
  audio: Audio;
  post: Post;
  live: Live[] = [];
  totalFrames: number;
  portrait: boolean;
  speed: number;

  constructor(public el: HTMLElement, public cut: Cut) {
    this.root = el as HTMLDivElement;
    css(this.root, { width: cut.W, height: cut.H, background: cut.bg ?? '#000' });
    this.portrait = cut.H > cut.W;
    this.speed = cut.speed ?? 1;
    this.audio = new Audio(cut.music, cut.duration, this.speed);
    this.world = box({ left: '0', top: '0', width: `${cut.W}px`, height: `${cut.H}px`, overflow: 'hidden', transformOrigin: '50% 50%' });
    this.root.append(this.world);
    this.post = new Post(this.root, cut.W, cut.H);
    this.totalFrames = Math.round((cut.duration / this.speed) * FPS);
  }

  async setup() {
    await this.audio.load();
    const { W, H } = this.cut;
    this.live = this.cut.timeline.map((entry, i) => {
      const root = box({ left: '0', top: '0', width: `${W}px`, height: `${H}px`, overflow: 'hidden', display: 'none', zIndex: String(entry.z ?? 10 + i) });
      root.dataset.scene = entry.scene.id;
      this.world.append(root);
      return { entry, root, inst: null };
    });
    for (const l of this.live) {
      try {
        l.inst = await l.entry.scene.setup(
          { root: l.root, W, H, portrait: this.portrait, audio: this.audio, cut: this.cut, entry: l.entry },
          l.entry.props ?? {},
        );
      } catch (err: any) {
        l.error = String(err?.stack ?? err);
        console.error(`[scene ${l.entry.scene.id}] setup failed`, err);
      }
    }
  }

  /** Render one output frame. Scenes see design time: t = real time x speed. */
  async seek(frame: number) {
    const t = (frame / FPS) * this.speed;
    const { W, H } = this.cut;
    this.post.reset();
    const base = { t, frame, W, H, portrait: this.portrait, audio: this.audio, post: this.post.state };
    this.cut.global?.(base);
    for (const l of this.live) {
      const e = l.entry;
      const on = t >= e.start - (e.pre ?? 0) && t < e.end + (e.post ?? 0);
      css(l.root, { display: on ? '' : 'none' });
      if (!on) continue;
      if (l.error || !l.inst) {
        l.root.innerHTML = `<pre style="color:#f55;background:#200;font:16px monospace;padding:24px;white-space:pre-wrap;height:100%;margin:0">${l.entry.scene.id}: ${l.error ?? 'no instance'}</pre>`;
        continue;
      }
      const dur = e.end - e.start;
      const lt = t - e.start;
      try {
        await l.inst.update({ ...base, lt, dur, p: lt / dur, entry: e });
      } catch (err: any) {
        l.error = String(err?.stack ?? err);
        console.error(`[scene ${e.scene.id}] update failed at t=${t}`, err);
      }
    }
    this.post.apply(frame);
    const ps = this.post.state;
    // Overscan while shaking, so the stage's own background never shows at the frame edges.
    const [sx, sy] = ps.shake;
    const cover = 1 + (2 * Math.max(Math.abs(sx) / W, Math.abs(sy) / H)) + (sx || sy ? 0.004 : 0);
    const z = Math.max(ps.zoom, 1) * cover;
    css(this.world, { transform: z !== 1 || sx || sy ? `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) scale(${z.toFixed(4)})` : 'none' });
  }
}
