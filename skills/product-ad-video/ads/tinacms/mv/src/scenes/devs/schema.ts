// The schema section: `tina/config.ts` types, and each field line emits a TinaCMS sidebar field with a leader line.
import { box, css, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg } from '../../engine/anim';
import { C } from '../../brand/tokens';
import { CodePanel, type LineTime } from './panel';
import { Sidebar, type FieldKey } from './form';
import type { Rect } from '../../ui/kit';

export const CONFIG = `import { defineConfig } from 'tinacms'

const page = {
  name: 'page',
  label: 'Pages',
  path: 'content/pages',
  format: 'mdx',
  fields: [
    {
      type: 'object',
      name: 'blocks',
      list: true,
      templates: [
        {
          name: 'hero',
          fields: [
            { type: 'string', name: 'headline' },
            { type: 'string', name: 'tagline' },
            { type: 'image', name: 'image' },
            { type: 'object', name: 'actions', list: true },
          ],
        },
        callout, stats, features, testimonial, cta,
      ],
    },
  ],
}

export default defineConfig({
  schema: { collections: [page] },
})`;

/** Which code line emits which field. */
export const EMIT_LINES: Record<FieldKey, number> = {
  sections: 10, // name: 'blocks'
  hero: 14, // name: 'hero'
  headline: 16,
  tagline: 17,
  image: 18,
  actions: 19,
  rows: 22, // callout, stats, ...
};
const ORDER: FieldKey[] = ['sections', 'hero', 'headline', 'tagline', 'image', 'actions', 'rows'];

const STEP = 0.125;
const q = (x: number) => Math.ceil(x / STEP - 1e-6) * STEP;

export interface SchemaTimes {
  lines: LineTime[];
  /** Time each leader leaves its code line (the line is fully typed). */
  emit: Record<FieldKey, number>;
  /** Time each field pops in (after the leader lands). */
  pop: Record<FieldKey, number>;
  typedEnd: number;
}

/** Beat-locked schedule. `emitTimes` are the seven leader departures. */
export function schemaTimes(nLines: number, emitTimes: number[]): SchemaTimes {
  const end: number[] = new Array(nLines).fill(0);
  const dur: number[] = new Array(nLines).fill(STEP);
  const anchors = ORDER.map((k, i) => ({ line: EMIT_LINES[k], t: q(emitTimes[i]) }));
  anchors.forEach((a) => { end[a.line] = a.t; dur[a.line] = 2 * STEP; });
  // before the first anchor: spread from 0
  const spread = (from: number, to: number, tFrom: number, tTo: number) => {
    const n = to - from + 1;
    for (let i = 0; i < n; i++) end[from + i] = Math.max(STEP, q(lerp(tFrom, tTo, (i + 1) / n)));
  };
  spread(0, anchors[0].line - 1, 0, anchors[0].t - 2 * STEP);
  for (let a = 0; a < anchors.length - 1; a++) spread(anchors[a].line + 1, anchors[a + 1].line - 1, anchors[a].t, anchors[a + 1].t - 2 * STEP);
  const last = anchors[anchors.length - 1];
  const tail = nLines - 1 - last.line;
  spread(last.line + 1, nLines - 1, last.t, last.t + Math.max(0.25, tail * 0.0625));
  // enforce monotonic
  for (let i = 1; i < nLines; i++) end[i] = Math.max(end[i], end[i - 1]);
  const lines = end.map((e, i) => ({ end: e, dur: dur[i] }));
  const emit = {} as Record<FieldKey, number>;
  const pop = {} as Record<FieldKey, number>;
  ORDER.forEach((k, i) => { emit[k] = anchors[i].t; pop[k] = anchors[i].t + 0.2; });
  return { lines, emit, pop, typedEnd: end[nLines - 1] };
}

export interface SchemaSection {
  root: HTMLDivElement;
  /** ts = seconds into the section, L = its length. */
  update(ts: number, L: number): void;
}

export interface SchemaOpts {
  tour?: boolean;
  headline?: string;
  /** Open the panels from a horizontal line at scene y (the Git line of the previous scene). */
  unfold?: { y: number; t0: number };
}

export function buildSchema(parent: HTMLElement, W: number, H: number, rects: { code: Rect; form: Rect }, emitTimes: number[], opts: SchemaOpts = {}): SchemaSection {
  const root = box({ inset: '0' });
  parent.append(root);
  const stage = box({ left: '0', top: '0', width: `${W}px`, height: `${H}px`, transformOrigin: '50% 55%' });
  root.append(stage);

  const code = new CodePanel(stage, { rect: rects.code, title: 'tina/config.ts', lang: 'ts', code: CONFIG, size: 24 });
  const form = new Sidebar(stage, rects.form, opts.headline);
  const sched = schemaTimes(code.lines.length, emitTimes);
  // The sidebar never shows a blank white panel: its "Sections" header is there as the panel opens, and the leader
  // from `name: 'blocks'` lands on it later.
  sched.pop.sections = opts.unfold ? opts.unfold.t0 + 0.28 : 0.27;

  // leader lines
  const NS = 'http://www.w3.org/2000/svg';
  const svgEl = document.createElementNS(NS, 'svg');
  svgEl.setAttribute('width', String(W));
  svgEl.setAttribute('height', String(H));
  svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  css(svgEl as unknown as HTMLElement, { position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', filter: `drop-shadow(0 0 7px ${C.orange}AA)` });
  stage.append(svgEl as unknown as Node);
  const leaders = ORDER.map((k) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', C.orange400);
    path.setAttribute('stroke-width', '3.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('pathLength', '1');
    path.setAttribute('stroke-dasharray', '1 1');
    const head = document.createElementNS(NS, 'circle');
    head.setAttribute('r', '8');
    head.setAttribute('fill', '#fff');
    head.setAttribute('stroke', C.orange);
    head.setAttribute('stroke-width', '4');
    const tail = document.createElementNS(NS, 'circle');
    tail.setAttribute('r', '5');
    tail.setAttribute('fill', C.orange);
    svgEl.append(path, tail, head);
    return { key: k, path: path as SVGPathElement, head: head as SVGCircleElement, tail: tail as SVGCircleElement, d: '' };
  });

  const codeRight = rects.code.x + rects.code.w;
  const set = (e: Element, k: string, v: string | number) => { const s = String(v); if (e.getAttribute(k) !== s) e.setAttribute(k, s); };

  return {
    root,
    update(ts, L) {
      // entrance of the two panels
      if (opts.unfold) {
        // The Git line opens into the two panels: a clip that grows from the line's y.
        const u = opts.unfold;
        const open = (r: Rect, t0: number, dur: number) => {
          const p = ease.outQuart(seg(ts, u.t0 + t0, u.t0 + t0 + dur));
          const rel = clamp((u.y - r.y) / r.h);
          return { p, clip: `inset(${(rel * (1 - p) * 100).toFixed(2)}% 0 ${((1 - rel) * (1 - p) * 100).toFixed(2)}% 0 round 18px)`, on: ts >= u.t0 + t0 };
        };
        const a = open(rects.code, 0, 0.5);
        css(code.win.root, { opacity: a.on ? 1 : 0, clipPath: a.p >= 1 ? 'none' : a.clip, transform: 'none' });
        const b = open(rects.form, 0.12, 0.5);
        css(form.root, { opacity: b.on ? 1 : 0, clipPath: b.p >= 1 ? 'none' : b.clip, transform: 'none' });
        code.win.sheenAt(seg(ts, u.t0 + 0.2, u.t0 + 1.3));
      } else {
        const pc = ease.snap(seg(ts, 0.0, 0.5));
        css(code.win.root, { opacity: clamp(0.5 + ts * 10), transform: tf({ y: (1 - pc) * 40, s: 0.97 + 0.03 * pc }) });
        code.win.sheenAt(seg(ts, 0.1, 1.2));
        const pf = ease.snap(seg(ts, 0.25, 0.8));
        // (the sidebar's own items animate; the shell slides in)
        css(form.root, { opacity: ts >= 0.25 ? 1 : 0, transform: tf({ x: (1 - pf) * 80, s: 0.97 + 0.03 * pf }) });
      }

      // typing
      const n = code.charsAt(ts, sched.lines);
      const li = code.lineOf(n);
      const sc = code.scrollAt(ts, sched.lines);
      const typing = ts < sched.typedEnd + 0.1;
      const caretOn = typing || Math.floor(ts * 3) % 2 === 0;
      // highlight the field line while it is typed and for a moment after
      const hi: { line: number; a: number }[] = [];
      ORDER.forEach((k) => {
        const ln = EMIT_LINES[k];
        const a = seg(ts, sched.emit[k] - 0.25, sched.emit[k] - 0.15) * (1 - seg(ts, sched.emit[k] + 0.15, sched.emit[k] + 0.4));
        if (a > 0) hi.push({ line: ln, a });
      });
      void li;
      code.render(n, caretOn, hi, sc);

      // sidebar items
      form.update(ts, sched.pop);

      // leaders
      leaders.forEach((ld, i) => {
        const k = ld.key;
        const e = sched.emit[k];
        const p = ease.outCubic(seg(ts, e, e + 0.2));
        const [tx, ty] = form.anchor(k);
        const sy = code.lineY(EMIT_LINES[k], sc);
        const sx = code.lineEndX(EMIT_LINES[k]) + 16;
        const midX = Math.max(sx + 20, codeRight + 6);
        const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${midX.toFixed(1)} ${sy.toFixed(1)} C ${(midX + 60).toFixed(1)} ${sy.toFixed(1)} ${(tx - 60).toFixed(1)} ${ty.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
        if (ld.d !== d) { ld.path.setAttribute('d', d); ld.d = d; }
        const landed = ts >= e + 0.2;
        // The leader fades once its line has scrolled out of the window.
        const vis = clamp((sy - (rects.code.y + code.chrome)) / 50) * clamp((rects.code.y + rects.code.h - sy) / 50);
        const rest = (landed ? lerp(1, 0.32, ease.outCubic(seg(ts, e + 0.3, e + 0.9))) : 1) * vis;
        // optional tour: pulses run down the leaders again near the end
        let pulse = -1;
        if (opts.tour) {
          const tp = sched.typedEnd + 0.3 + i * 0.09;
          pulse = vis > 0.6 ? seg(ts, tp, tp + 0.3) : -1;
        }
        set(ld.path, 'stroke-dashoffset', 1 - p);
        css(ld.path as unknown as HTMLElement, { opacity: ts >= e ? rest : 0 });
        // the travelling head
        const len = ld.path.getTotalLength();
        let hp = -1;
        if (ts >= e && p < 1) hp = p;
        else if (pulse > 0 && pulse < 1) hp = ease.inOutCubic(pulse);
        if (hp >= 0 && len > 0) {
          const pt = ld.path.getPointAtLength(hp * len);
          set(ld.head, 'cx', pt.x.toFixed(1));
          set(ld.head, 'cy', pt.y.toFixed(1));
          set(ld.head, 'opacity', 1);
          set(ld.tail, 'cx', pt.x.toFixed(1));
          set(ld.tail, 'cy', pt.y.toFixed(1));
          set(ld.tail, 'opacity', 0);
        } else {
          set(ld.head, 'opacity', 0);
          set(ld.tail, 'opacity', 0);
        }
        if (pulse > 0 && pulse < 1) set(ld.path, 'stroke-opacity', 1);
        css(ld.path as unknown as HTMLElement, { opacity: pulse > 0 && pulse < 1 ? 1 : ts >= e ? rest : 0 });
      });

      // A slow push-in that never leaves the title-safe margins: it grows from 97.5 % to full size.
      const push = 0.975 + 0.025 * seg(ts, 0, L, ease.outCubic);
      css(stage, { transform: tf({ s: push }) });
    },
  };
}
