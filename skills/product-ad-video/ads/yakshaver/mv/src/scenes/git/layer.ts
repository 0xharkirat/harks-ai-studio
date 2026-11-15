// One themed copy of the git world: the rails, the commit nodes and their labels, the headline.
// The scene builds a light copy and a dark copy; the dark copy is revealed by an expanding circle.
import { box, css, el, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg, spring } from '../../engine/anim';
import { Headline } from '../../ui/text';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE, SYN } from '../../brand/tokens';
import type { Geo, Plan, Pt } from './plan';
import { DOG } from '../dog';

export interface Theme {
  dark: boolean;
  ink: string;
  muted: string;
  railOld: string;
  railLive: string;
  branch: string;
  ring: string;
  pillBg: string;
  pillBorder: string;
  pillShadow: string;
  pillText: string;
  hash: string;
  history: string;
}

export const LIGHT: Theme = {
  dark: false,
  ink: '#0F172A',
  muted: '#64748B',
  railOld: 'rgba(100,116,139,0.55)',
  railLive: '#0F172A',
  branch: C.orange,
  ring: '#FFFFFF',
  pillBg: '#FFFFFF',
  pillBorder: 'rgba(15,23,42,0.08)',
  pillShadow: '0 14px 34px -12px rgba(20,70,150,0.30), 0 3px 8px -3px rgba(20,70,150,0.12)',
  pillText: '#0F172A',
  hash: C.orange,
  history: 'rgba(100,116,139,0.5)',
};

export const DARK: Theme = {
  dark: true,
  ink: '#FFFFFF',
  muted: SYN.dim,
  railOld: 'rgba(169,164,204,0.38)',
  railLive: '#F4F1FF',
  branch: C.orange400,
  ring: C.ink2,
  pillBg: '#1B1638',
  pillBorder: 'rgba(255,255,255,0.12)',
  pillShadow: '0 16px 36px -12px rgba(0,0,0,0.6)',
  pillText: '#FFFFFF',
  hash: C.orange400,
  history: 'rgba(169,164,204,0.45)',
};

const NS = 'http://www.w3.org/2000/svg';
const sv = (tag: string, attrs: Record<string, string | number> = {}) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e as SVGElement;
};
const attr = (e: Element, k: string, v: string | number) => {
  const s = String(v);
  if (e.getAttribute(k) !== s) e.setAttribute(k, s);
};

/** Cubic Bezier point. */
export function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, s: number): Pt {
  const u = 1 - s;
  const a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, d = s * s * s;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}

/** Control points of the S-curve between two lane points, tangent to the rail direction. */
export function sCurve(a: Pt, b: Pt, dir: Pt): [Pt, Pt, Pt, Pt] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const k = len * 0.55;
  return [a, [a[0] + dir[0] * k, a[1] + dir[1] * k], [b[0] - dir[0] * k, b[1] - dir[1] * k], b];
}

export class Layer {
  root: HTMLDivElement;
  svgEl: SVGSVGElement;
  private mainOld: SVGLineElement;
  private fork: SVGPathElement;
  private branchLine: SVGLineElement;
  private pending: SVGLineElement;
  private merge: SVGPathElement;
  private mainNew: SVGLineElement;
  private headDot: HTMLDivElement;
  private history: HTMLDivElement[] = [];
  private nodes: { root: HTMLDivElement; ring1: HTMLDivElement; ring2: HTMLDivElement; flash: HTMLDivElement; core: HTMLDivElement }[] = [];
  private labels: HTMLDivElement[] = [];
  headlines: Headline[] = [];
  /** Sub-lines by headline index. */
  private subs = new Map<number, Headline>();
  private forkCtl: [Pt, Pt, Pt, Pt];
  private mergeCtl: [Pt, Pt, Pt, Pt];

  private k: number;
  /** `headParent`: where the headlines live (default: with the rails, inside the camera). The short variants keep them on screen, out of the camera. */
  constructor(parent: HTMLElement, public th: Theme, public plan: Plan, public geo: Geo, headParent?: HTMLElement) {
    const { W, H } = geo;
    this.k = plan.k * (geo.portrait && plan.branch ? 0.78 : 1);
    this.root = box({ inset: '0' });
    parent.append(this.root);

    // ── rails (SVG) ───────────────────────────────────────────────────────
    const s = document.createElementNS(NS, 'svg') as SVGSVGElement;
    s.setAttribute('width', String(W));
    s.setAttribute('height', String(H));
    s.setAttribute('viewBox', `0 0 ${W} ${H}`);
    css(s, { position: 'absolute', left: 0, top: 0, overflow: 'visible' });
    this.svgEl = s;
    const common = { fill: 'none', 'stroke-linecap': 'round', 'stroke-width': 5 };
    const startMain = geo.P('main', geo.uStart);
    this.mainOld = sv('line', { ...common, stroke: th.railOld, x1: startMain[0], y1: startMain[1], x2: startMain[0], y2: startMain[1] }) as SVGLineElement;
    const fa = geo.P('main', geo.forkA), fb = geo.P('branch', geo.forkB);
    this.forkCtl = sCurve(fa, fb, geo.dir);
    this.fork = sv('path', { ...common, stroke: th.branch, d: `M ${fa[0]} ${fa[1]} C ${this.forkCtl[1][0]} ${this.forkCtl[1][1]} ${this.forkCtl[2][0]} ${this.forkCtl[2][1]} ${fb[0]} ${fb[1]}`, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }) as SVGPathElement;
    this.branchLine = sv('line', { ...common, stroke: th.branch, x1: fb[0], y1: fb[1], x2: fb[0], y2: fb[1] }) as SVGLineElement;
    this.pending = sv('line', { ...common, stroke: th.branch, 'stroke-dasharray': '2 13', x1: fb[0], y1: fb[1], x2: fb[0], y2: fb[1], opacity: 0 }) as SVGLineElement;
    const ma = geo.P('branch', geo.mergeA), mb = geo.P('main', geo.mergeB);
    this.mergeCtl = sCurve(ma, mb, geo.dir);
    this.merge = sv('path', { ...common, stroke: th.branch, d: `M ${ma[0]} ${ma[1]} C ${this.mergeCtl[1][0]} ${this.mergeCtl[1][1]} ${this.mergeCtl[2][0]} ${this.mergeCtl[2][1]} ${mb[0]} ${mb[1]}`, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }) as SVGPathElement;
    this.mainNew = sv('line', { ...common, stroke: th.railLive, 'stroke-width': 5, x1: mb[0], y1: mb[1], x2: mb[0], y2: mb[1], opacity: 0 }) as SVGLineElement;
    s.append(this.mainOld, this.fork, this.branchLine, this.pending, this.merge, this.mainNew);
    this.root.append(s as unknown as Node);

    // history nodes on main
    for (const u of geo.history) {
      const [x, y] = geo.P('main', u);
      const d = box({ left: `${x - 9}px`, top: `${y - 9}px`, width: '18px', height: '18px', borderRadius: '50%', background: th.history, boxShadow: `0 0 0 4px ${th.ring}` });
      this.history.push(d);
      this.root.append(d);
    }

    // glowing head of the live line
    this.headDot = box({ left: '-14px', top: '-14px', width: '28px', height: '28px', borderRadius: '50%', background: th.dark ? '#fff' : C.orange, boxShadow: `0 0 28px 6px ${th.dark ? 'rgba(255,255,255,0.55)' : C.orange + '88'}`, opacity: '0' });
    this.root.append(this.headDot);

    // ── commit nodes and labels ──────────────────────────────────────────
    plan.commits.forEach((c, i) => {
      const [x, y] = geo.P(c.lane, c.u);
      const root = box({ left: `${x}px`, top: `${y}px`, width: '0', height: '0', transform: `scale(${this.k})` });
      const flash = box({ left: '-90px', top: '-90px', width: '180px', height: '180px', borderRadius: '50%', background: `radial-gradient(circle, ${C.orange}88 0%, ${C.orange}00 65%)`, opacity: '0' });
      const ring1 = box({ left: '-30px', top: '-30px', width: '60px', height: '60px', borderRadius: '50%', border: `3px solid ${C.orange}`, opacity: '0' });
      const ring2 = box({ left: '-30px', top: '-30px', width: '60px', height: '60px', borderRadius: '50%', border: `2px solid ${C.orange400}`, opacity: '0' });
      const core = box({ left: '-23px', top: '-23px', width: '46px', height: '46px', borderRadius: '50%', background: th.ring, boxShadow: th.dark ? '0 0 0 2px rgba(255,255,255,0.14), 0 8px 22px rgba(0,0,0,0.5)' : '0 6px 18px rgba(20,70,150,0.28), 0 0 0 1px rgba(15,23,42,0.06)' });
      core.append(box({ left: '8px', top: '8px', width: '30px', height: '30px', borderRadius: '50%', background: GRAD_ORANGE }));
      root.append(flash, ring1, ring2, core);
      this.root.append(root);
      this.nodes.push({ root, ring1, ring2, flash, core });

      const pill = box({
        left: '0', top: '0', display: 'flex', flexDirection: 'column', gap: '3px', padding: `${9 * this.k}px ${16 * this.k}px ${10 * this.k}px`, borderRadius: '12px',
        background: th.pillBg, border: `1px solid ${th.pillBorder}`, boxShadow: th.pillShadow, whiteSpace: 'nowrap',
      });
      pill.append(
        el('div', { text: c.hash, style: { font: `500 ${(geo.portrait ? 20 : 18) * this.k}px/1 ${FONT.mono}`, color: th.hash, letterSpacing: '0.02em' } }),
        el('div', { text: c.msg, style: { font: `600 ${(geo.portrait ? 32 : 27) * this.k}px/1.15 ${FONT.ui}`, color: th.pillText, letterSpacing: '-0.01em' } }),
      );
      this.root.append(pill);
      this.labels.push(pill);
    });

    // ── headlines ────────────────────────────────────────────────────────
    const h = geo.headline;
    for (const ln of plan.lines) {
      const text = geo.portrait && ln.ptext ? ln.ptext : ln.text;
      const hl = new Headline(headParent ?? this.root, { text, size: h.size, color: th.ink, lineHeight: 1.04, maxWidth: h.maxW, align: h.align });
      hl.place(h.w != null ? { left: `${h.x}px`, top: `${h.y}px`, width: `${h.w}px` } : { left: `${h.x}px`, top: `${h.y}px` });
      this.headlines.push(hl);
      // The smaller line under it, in the same column.
      if (ln.sub) {
        const ss = Math.round(h.size * 0.46);
        const sub = new Headline(headParent ?? this.root, { text: ln.sub, size: ss, color: th.ink, lineHeight: 1.2, maxWidth: h.maxW, align: h.align });
        const top = h.y + text.split('\n').length * h.size * 1.04 + ss * 0.55;
        sub.place(h.w != null ? { left: `${h.x}px`, top: `${top}px`, width: `${h.w}px` } : { left: `${h.x}px`, top: `${top}px` });
        this.subs.set(this.headlines.length - 1, sub);
      }
    }
  }

  /** Size of each label, measured once (they do not change). */
  private labelSize: { w: number; h: number }[] | null = null;
  private measure() {
    if (this.labelSize) return this.labelSize;
    this.labelSize = this.labels.map((l) => ({ w: l.offsetWidth, h: l.offsetHeight }));
    return this.labelSize;
  }

  /** Where the live line's head sits (rail coordinate) at time t. */
  headU(t: number) {
    const { plan, geo } = this;
    if (!plan.branch) {
      // Single lane: the line runs out to the right edge as soon as it is drawn; the live part follows the commits.
      let u = geo.uStart;
      for (const c of plan.commits) u = lerp(u, c.u, ease.outCubic(seg(t, c.t - 0.3, c.t)));
      return u;
    }
    return geo.mergeB;
  }

  update(t: number, opts: { dark?: boolean } = {}) {
    const { plan, geo, th } = this;
    const sizes = this.measure();
    const lineLen = geo.uEnd - geo.uStart;

    // The old main line draws in from the left.
    const drawIn = ease.outCubic(seg(t, plan.pressAt + 0.1, plan.pressAt + 0.7));
    const mainEnd = plan.branch ? geo.mergeB : geo.uEnd;
    const mEnd = geo.P('main', lerp(geo.uStart, mainEnd, drawIn));
    attr(this.mainOld, 'x2', mEnd[0]);
    attr(this.mainOld, 'y2', mEnd[1]);

    if (plan.branch) {
      // Fork curve, then the branch line extends toward each commit as its dot flies in.
      const fp = ease.outCubic(seg(t, plan.pressAt + 0.08, plan.pressAt + 0.34));
      attr(this.fork, 'stroke-dashoffset', 1 - fp);
      const branchCommits = plan.commits.filter((c) => c.lane === 'branch');
      let hu = geo.forkB;
      for (const c of branchCommits) hu = lerp(hu, c.u, ease.outCubic(seg(t, c.t - 0.3, c.t)));
      const last = branchCommits[branchCommits.length - 1];
      // After the checks pass the solid line runs on toward the merge.
      const toMerge = ease.outCubic(seg(t, plan.prChecks, plan.prChecks + 0.45));
      if (last) hu = lerp(hu, geo.mergeA, toMerge);
      const hp = geo.P('branch', hu);
      attr(this.branchLine, 'x2', hp[0]);
      attr(this.branchLine, 'y2', hp[1]);
      // Dashed "in review" segment from the last commit to the merge start.
      if (last) {
        const lp = geo.P('branch', last.u);
        const pend = ease.outCubic(seg(t, plan.prOpen - 0.05, plan.prOpen + 0.45));
        const pe = geo.P('branch', lerp(last.u, geo.mergeA, pend));
        attr(this.pending, 'x1', lp[0]);
        attr(this.pending, 'y1', lp[1]);
        attr(this.pending, 'x2', pe[0]);
        attr(this.pending, 'y2', pe[1]);
        attr(this.pending, 'stroke-dashoffset', -(t * 34).toFixed(1));
        attr(this.pending, 'opacity', pend > 0 && toMerge < 0.99 ? 1 : 0);
      }
      // Merge curve: a comet runs down it and lands on main at the merge ping.
      const mp = seg(t, plan.prMerge - 0.55, plan.prMerge, (p) => ease.inQuad(p) * 0.55 + p * 0.45);
      attr(this.merge, 'stroke-dashoffset', 1 - mp);
    } else {
      // Single lane: the live (orange) line grows with the commits.
      const hu = this.headU(t);
      const hp = geo.P('main', hu);
      const sp = geo.P('main', geo.uStart);
      attr(this.branchLine, 'x1', sp[0]);
      attr(this.branchLine, 'y1', sp[1]);
      attr(this.branchLine, 'x2', hp[0]);
      attr(this.branchLine, 'y2', hp[1]);
    }

    // After the merge, the live main line runs right, accelerating, out of frame.
    if (plan.branch) {
      const run = seg(t, plan.prMerge + 0.2, plan.dur - 0.02, (p) => p * p * 0.7 + p * 0.3);
      const endU = lerp(geo.mergeB, geo.uEnd + 120, run);
      const mb = geo.P('main', geo.mergeB);
      const me = geo.P('main', endU);
      attr(this.mainNew, 'x1', mb[0]);
      attr(this.mainNew, 'y1', mb[1]);
      attr(this.mainNew, 'x2', me[0]);
      attr(this.mainNew, 'y2', me[1]);
      attr(this.mainNew, 'opacity', run > 0 ? 1 : 0);
      css(this.headDot as HTMLElement, {
        opacity: run > 0 && run < 1 ? 1 : 0,
        transform: tf({ x: me[0], y: me[1] }),
      });
    }
    void lineLen;

    // History nodes pop in with the old line.
    this.history.forEach((d, i) => css(d, { opacity: clamp((drawIn - 0.1 - i * 0.1) * 6) }));

    // Nodes + labels.
    plan.commits.forEach((c, i) => {
      const n = this.nodes[i];
      const age = t - c.t;
      const landed = age >= 0;
      const pop = landed ? spring(age, 3.4, 0.46) : 0;
      css(n.core, { transform: tf({ s: Math.max(0, pop) }), opacity: landed ? 1 : 0 });
      const rp = clamp(age / 0.65);
      const rp2 = clamp((age - 0.09) / 0.65);
      css(n.ring1, { opacity: landed && rp < 1 ? (1 - rp) ** 1.4 : 0, transform: tf({ s: 0.5 + ease.outCubic(rp) * 2.6 }) });
      css(n.ring2, { opacity: landed && rp2 < 1 && age > 0.09 ? (1 - rp2) ** 1.4 * 0.7 : 0, transform: tf({ s: 0.5 + ease.outCubic(rp2) * 3.4 }) });
      css(n.flash, { opacity: landed ? Math.exp(-age * 9) : 0 });

      // Label: sits above (branch, single lane) or below (merge on main) the node in 16:9, right of it in 9:16.
      const [x, y] = geo.P(c.lane, c.u);
      const sz = sizes[i];
      const la = age - 0.07;
      const lp = ease.snap(clamp(la / 0.35));
      let lx: number, ly: number, slide: Pt;
      if (geo.portrait) {
        lx = x + 52 * this.k; ly = y - sz.h / 2; slide = [-18 * (1 - lp), 0];
      } else if (c.lane === 'main' && plan.branch) {
        // Below the merge node, kept clear of the DOG corner (bottom right).
        const dog = DOG(geo.W, geo.H, false);
        lx = Math.min(x - sz.w / 2, dog.x - 36 - sz.w); ly = y + 40 * this.k; slide = [0, -14 * (1 - lp)];
      } else {
        lx = x - sz.w / 2; ly = y - 40 * this.k - sz.h; slide = [0, 14 * (1 - lp)];
      }
      css(this.labels[i], { transform: tf({ x: lx + slide[0], y: ly + slide[1] }), opacity: la >= 0 ? lp : 0 });
    });

    // Headlines.
    plan.lines.forEach((ln, i) => {
      this.headlines[i].update(t, plan.variant === 'full' ? { in: ln.t, out: ln.out, stagger: 0.07, dur: 0.6, outDur: 0.22 } : { in: ln.t, out: ln.out, stagger: 0.04, dur: 0.32, outDur: 0.22 });
      this.subs.get(i)?.update(t, { in: ln.t + 0.45, out: ln.out, stagger: 0.035, dur: 0.5, outDur: 0.22 });
    });
    void opts;
  }

  /** World position of a commit node (for dots and the wipe). */
  nodePos(i: number): Pt {
    const c = this.plan.commits[i];
    return this.geo.P(c.lane, c.u);
  }
}
