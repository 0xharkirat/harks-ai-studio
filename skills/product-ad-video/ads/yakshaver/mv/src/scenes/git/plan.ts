// The `git` scene's script and geometry: which commits land when, where everything sits, in 16:9 and 9:16.

export type Variant = 'full' | 'short' | 'flash';

export interface CommitSpec {
  /** Local time of the ping (the commit node lands). */
  t: number;
  msg: string;
  hash?: string;
}

export interface LineSpec {
  /** Local time the words start to rise. */
  t: number;
  /** Text with *emphasis*; \n breaks a line. */
  text: string;
  /** Text for 9:16 (explicit line breaks). Falls back to `text`. */
  ptext?: string;
  /** Local time the words leave. */
  out?: number;
  /** A smaller line under the headline (16:9 full variant), e.g. "The best collaboration and version history." */
  sub?: string;
}

export interface GitProps {
  /** `full` = 8 s (anthem, dev), `short` = 4 s (thirty, vertical), `flash` = 2 s (fifteen). Default: from the entry length. */
  variant?: Variant;
  /** Commit pings. Defaults follow the variant (full: 0.3, 2, 4, 6). */
  commits?: CommitSpec[];
  /** The words. Defaults follow the variant. */
  lines?: LineSpec[];
  /** Draw the branch + pull request card (default: full only). */
  pr?: boolean;
  /** Draw the Markdown diff card (default: full only). */
  diff?: boolean;
  /** Local time the dark developer world arrives (default: full only, 6.0; false for none). */
  dark?: number | false;
  /** Local time of the Save click (default 0). */
  pressAt?: number;
  /** A cursor glides in and clicks Save at pressAt (default false). Give pressAt about 1 s for the glide. */
  cursor?: boolean;
  /** Frame the Save button with the orange edit box (default true). false also keeps the button orange when it saves, with no press rings. */
  saveBox?: boolean;
  /** Top of the 16:9 full headline (default 86; lower it when the DOG sits top left). */
  headlineY?: number;
  /** Pull request title (default "Content update: homepage hero"). */
  prTitle?: string;
  /** File shown in the diff card (default content/pages/home.mdx). */
  file?: string;
  /** The two diff lines (default: the Fieldnote hero headline from the real content file). */
  diffLines?: { del: string; add: string };
}

const HASHES = ['a3f9c21', '7be04d8', 'c18a9f3', '5d62e07', '9f10b4a'];

/** The rail of the full variant: shared with the `devs` scene, which starts on the same line. */
export const FULL_RAIL = { y: 890, mergeX: 1480, mergeMsg: 'Publish: Fieldnote 3.0 launch post', mergeHash: '5d62e07' };

export interface PlanCommit {
  t: number;
  msg: string;
  hash: string;
  lane: 'main' | 'branch';
  u: number;
}

export interface Plan {
  variant: Variant;
  dur: number;
  commits: PlanCommit[];
  lines: LineSpec[];
  pr: boolean;
  diff: boolean;
  branch: boolean;
  darkAt: number | null;
  pressAt: number;
  /** Camera is settled from here on (the pull-back from the Save button is over). */
  camEnd: number;
  prTitle: string;
  /** Pull request beats (local seconds). */
  prOpen: number;
  prChecks: number;
  prMerge: number;
  /** The Save button leaves between these local times. */
  btnExit: [number, number];
  /** UI scale of the rail group (nodes, labels): bigger in the short variants. */
  k: number;
  file: string;
  saveBox: boolean;
  headlineY: number;
  diffLines: { del: string; add: string };
}

export function makePlan(dur: number, props: GitProps): Plan {
  const variant: Variant = props.variant ?? (dur >= 6 ? 'full' : dur >= 3 ? 'short' : 'flash');
  const full = variant === 'full';
  const pressAt = props.pressAt ?? 0;
  const defaultTimes = full ? [pressAt + 0.3, 2, 4, 6] : variant === 'short' ? [pressAt + 0.3, 1, 2, 3] : [pressAt + 0.3, 1];
  const defaultMsgs = ['Update hero headline', 'Swap hero image', 'Add stats block', FULL_RAIL.mergeMsg];
  const specs: CommitSpec[] = props.commits ?? defaultTimes.map((t, i) => ({ t, msg: defaultMsgs[i] }));
  const pr = props.pr ?? full;
  const branch = pr && specs.length >= 2;
  const commits: PlanCommit[] = specs.map((c, i) => ({
    t: c.t,
    msg: c.msg,
    hash: c.hash ?? HASHES[i % HASHES.length],
    // With a pull request, the last commit is the merge on main; the others sit on the branch.
    lane: branch && i === specs.length - 1 ? 'main' : branch ? 'branch' : 'main',
    u: 0,
  }));
  const lines: LineSpec[] =
    props.lines ??
    (full
      ? [
          { t: 0.55, text: 'Every edit is a *commit.*', ptext: 'Every edit\nis a *commit.*', out: 4.8 },
          { t: 5.0, text: 'Your content\nstays in *your repo.*', ptext: 'Your content\nstays in *your repo.*' },
        ]
      : [{ t: variant === 'short' ? 0.35 : 0.25, text: 'Every edit\nis a *commit.*' }]);
  const darkAt = props.dark === false ? null : props.dark ?? (full ? 6.0 : null);
  const last = commits[commits.length - 1]?.t ?? 0;
  const beforeLast = commits.length >= 3 ? commits[commits.length - 2].t : 4;
  return {
    variant,
    dur,
    commits,
    lines,
    pr,
    diff: props.diff ?? full,
    branch,
    darkAt,
    pressAt,
    camEnd: pressAt + (full ? 0.9 : 0.5),
    btnExit: full ? [pressAt + 0.32, pressAt + 0.56] : variant === 'short' ? [pressAt + 0.2, pressAt + 0.36] : [pressAt + 0.2, pressAt + 0.34],
    k: full ? 1 : 1.12,
    file: props.file ?? 'content/pages/home.mdx',
    saveBox: props.saveBox ?? true,
    headlineY: props.headlineY ?? 86,
    diffLines: props.diffLines ?? { del: 'headline: Notes your whole team actually reads.', add: 'headline: Edit your site. Visually.' },
    prTitle: props.prTitle ?? 'Content update: homepage hero',
    prOpen: beforeLast + 0.3,
    prChecks: beforeLast + 1.0,
    prMerge: last,
  };
}

export type Pt = [number, number];
export interface Rect { x: number; y: number; w: number; h: number }

export interface Geo {
  portrait: boolean;
  W: number;
  H: number;
  /** Point on a lane at rail coordinate u (u runs along the rail: x in 16:9, y in 9:16). */
  P(lane: 'main' | 'branch', u: number): Pt;
  /** Unit vector along the rail. */
  dir: Pt;
  /** Rail coordinate where the rails enter and leave the frame. */
  uStart: number;
  uEnd: number;
  /** Fork of the branch off main (rail coordinates) and where the merge curve starts / ends. */
  forkA: number;
  forkB: number;
  mergeA: number;
  mergeB: number;
  buttonC: Pt;
  headline: { x: number; y: number; size: number; maxW: number; /** 9:16 non-branch layouts centre it (box = x .. x + w). */ align?: 'left' | 'center'; w?: number };
  card: Rect;
  /** Camera: where it starts (on the Save button) and the scale it starts at. */
  camStart: { c: Pt; s: number };
  /** History nodes on main (rail coordinates), dim. */
  history: number[];
}

/** Width of a commit label (px) at UI scale k, measured with the real font. */
export function labelWidth(msg: string, k: number, font: string, portrait: boolean) {
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `600 ${(portrait ? 32 : 27) * k}px ${font}`;
  return Math.ceil(c.measureText(msg).width + 32 * k + 4);
}

export function makeGeo(W: number, H: number, portrait: boolean, plan: Plan, widths: number[] = []): Geo {
  const n = plan.commits.length;
  const full = plan.variant === 'full';
  if (!portrait) {
    const Ym = full ? FULL_RAIL.y : 800;
    const Yb = Ym - 145;
    const lane = (l: 'main' | 'branch') => (l === 'branch' ? Yb : Ym);
    plan.commits.forEach((c, i) => {
      if (plan.branch) c.u = c.lane === 'main' ? FULL_RAIL.mergeX : 400 + i * 340;
      else if (n > 2 && widths.length === n) {
        // Labels sit side by side with an even gap, centred on the stage.
        const gap = 52;
        const total = widths.reduce((a, b) => a + b, 0) + gap * (n - 1);
        let x = Math.max(150, (W - total) / 2 + 40);
        widths.forEach((w, j) => { plan.commits[j].u = x + w / 2; x += w + gap; });
      } else if (n > 2) c.u = 400 + (i * 1100) / (n - 1);
      else c.u = 620 + i * 560;
    });
    return {
      portrait, W, H,
      P: (l, u) => [u, lane(l)],
      dir: [1, 0],
      uStart: -60, uEnd: W + 60,
      forkA: 170, forkB: 320, mergeA: 1240, mergeB: FULL_RAIL.mergeX,
      buttonC: full ? [620, 400] : [W / 2, 430],
      headline: full ? { x: W * 0.06, y: plan.headlineY, size: 104, maxW: W * 0.88 } : { x: W * 0.06, y: 250, size: 150, maxW: W * 0.88 },
      card: { x: 805, y: 345, w: 1000, h: 265 },
      camStart: { c: full ? [620, 400] : [W / 2, 430], s: 2.1 },
      history: [40, 105],
    };
  }
  // 9:16 without a branch (short and flash): one rail and its labels, centred, headline centred above.
  // Keep text out of the top 14 % (269 px), the bottom 35 % (1248 px) and 6 % of each side (65 px);
  // the DOG sits top right (x 777-1015, y 278-338), so the headline starts below it, and the last
  // label ends above y 1190 (the 63 % line is y 1210).
  if (!plan.branch) {
    const k = plan.k;
    const labelW = Math.max(0, ...widths);
    const half = 23 * k; // node radius
    const compW = half + 52 * k + labelW;
    const Xs = Math.round((W - compW) / 2 + half);
    const hSize = 120;
    const hy = 368;
    const hBottom = hy + hSize * 1.04 * 2;
    const lh = 78.8 * k; // height of a one-line label
    const y1 = n > 2 ? Math.round(hBottom + 34 + lh / 2) : 790;
    const yLast = 1190 - lh / 2;
    const step = n > 2 ? Math.min(180, (yLast - y1) / (n - 1)) : 210;
    plan.commits.forEach((c, i) => { c.u = Math.round(y1 + i * step); });
    return {
      portrait, W, H,
      P: (_l, u) => [Xs, u],
      dir: [0, 1],
      uStart: y1 - 96, uEnd: H + 60,
      forkA: y1 - 70, forkB: y1 - 10, mergeA: y1 + 3 * step, mergeB: y1 + 4 * step,
      buttonC: [W / 2, 640],
      headline: { x: 65, y: hy, size: hSize, maxW: W - 130, align: 'center', w: W - 130 },
      card: { x: 65, y: 505, w: 950, h: 270 },
      camStart: { c: [W / 2, 640], s: 1.8 },
      history: [y1 - 64],
    };
  }
  // 9:16 with a branch (the 8 s variant; not used by a cut): rails run down the left side, labels to their right.
  const Xm = 125;
  const Xb = 240;
  const lane = (l: 'main' | 'branch') => (l === 'branch' ? Xb : Xm);
  // Full: the card sits under the 2-line headline and its 2-line sub (it covered the sub at 505), the rail under the card.
  const top = full ? 1010 : 760;
  const step = full ? 100 : n > 2 ? 140 : 190;
  plan.commits.forEach((c, i) => {
    c.u = plan.branch ? (c.lane === 'main' ? top + 4 * step - 20 : top + i * step) : top + i * step;
  });
  return {
    portrait, W, H,
    P: (l, u) => [lane(l), u],
    dir: [0, 1],
    uStart: top - 120, uEnd: H + 60,
    forkA: top - 70, forkB: top - 10, mergeA: top + 3 * step - 20, mergeB: top + 4 * step - 20,
    buttonC: [W / 2, 640],
    headline: full ? { x: W * 0.06, y: 272, size: 96, maxW: W * 0.9 } : { x: W * 0.06, y: 300, size: 128, maxW: W * 0.88 },
    card: { x: 65, y: full ? 650 : 505, w: 950, h: 270 },
    camStart: { c: [W / 2, 640], s: 1.8 },
    history: full ? [top - 100] : [top - 130, top - 70],
  };
}
