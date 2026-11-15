// The GraphQL section: a query types, the typed JSON result fans out, and a TypeScript autocomplete popup shows the types.
import { box, css, el, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg, spring } from '../../engine/anim';
import { FONT } from '../../brand/fonts';
import { C, SYN } from '../../brand/tokens';
import { CodePanel, type LineTime } from './panel';
import type { Rect } from '../../ui/kit';
import { Headline } from '../../ui/text';

export const QUERY = `query {
  page(relativePath: "home.mdx") {
    blocks {
      __typename
      ... on PageBlocksHero {
        headline
        tagline
        image
      }
    }
  }
}`;

export const resultJson = (headline: string) => `{
  "__typename": "PageBlocksHero",
  "headline": "${headline}",
  "tagline": "Fieldnote turns scattered docs…",
  "image": "/uploads/fieldnote-workspace.png"
}`;

export const TS_CODE = `import client from '../tina/__generated__/client'

const { data } = await client.queries.page({
  relativePath: 'home.mdx',
})

for (const block of data.page.blocks) {
  if (block.__typename === 'PageBlocksHero') {
    block.`;

const STEP = 0.125;
const q = (x: number) => Math.ceil(x / STEP - 1e-6) * STEP;

/** A schedule that types `n` lines between t0 and t1, `per` lines per 16th at the most. */
function lineSchedule(n: number, t0: number, t1: number): LineTime[] {
  const out: LineTime[] = [];
  for (let i = 0; i < n; i++) out.push({ end: Math.max(STEP, q(lerp(t0, t1, (i + 1) / n))) + 0, dur: STEP });
  for (let i = 1; i < n; i++) out[i].end = Math.max(out[i].end, out[i - 1].end);
  return out;
}

export interface GqlTimes {
  headIn: number;
  /** Query types from..to; the run pulse leaves at `run`. */
  type0: number;
  type1: number;
  run: number;
  /** JSON lines reveal from..to, then the type chips fan out. */
  json0: number;
  json1: number;
  chips: number;
  /** Phase two (the typed popup); null when the section is too short. */
  typed: null | { swap: number; ts0: number; ts1: number; popup: number; seq: { t: number; row: number }[]; accept: number };
}

export function gqlTimes(L: number): GqlTimes {
  if (L <= 3) return { headIn: 0.0, type0: 0.0, type1: 0.9, run: 0.95, json0: 1.1, json1: 1.5, chips: 1.5, typed: null };
  return { headIn: 0.1, type0: 0.5, type1: 2.375, run: 2.5, json0: 2.75, json1: 3.5, chips: 3.625, typed: { swap: 4.0, ts0: 4.375, ts1: 5.25, popup: 5.5, seq: [{ t: 5.5, row: 0 }, { t: 6.0, row: 1 }, { t: 6.25, row: 2 }, { t: 6.5, row: 0 }], accept: 7.0 } };
}

export interface GqlSection {
  root: HTMLDivElement;
  update(ts: number, L: number): void;
}

const propIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" stroke="#B794F6" stroke-width="2" stroke-linejoin="round"/><path d="M12 11l8-4.5M12 11v9M12 11L4 6.5" stroke="#B794F6" stroke-width="2"/></svg>`;

export function buildGql(parent: HTMLElement, W: number, H: number, L: number, headlineValue: string, opts: { words?: { graphql?: string; typed?: string } } = {}): GqlSection {
  const T = gqlTimes(L);
  const root = box({ inset: '0' });
  parent.append(root);
  const stage = box({ left: '0', top: '0', width: `${W}px`, height: `${H}px`, transformOrigin: '50% 55%' });
  root.append(stage);

  const FSQ = 28;
  const FST = 21;
  const FS = 22;
  // Everything stays inside the title-safe margins (x 115 to 1805), also the type chips beside the JSON.
  const qRect: Rect = { x: 115, y: 265, w: 740, h: 640 };
  const rRect: Rect = { x: 865, y: 405, w: 940, h: 360 };
  const json = resultJson(headlineValue);

  // headlines
  const head1 = new Headline(root, { text: opts.words?.graphql ?? 'Queried with *GraphQL.*', size: 104, color: '#fff', lineHeight: 1.02 });
  head1.place({ left: `${W * 0.06}px`, top: '86px' });
  const head2 = T.typed ? new Headline(root, { text: opts.words?.typed ?? 'Fully *typed.*', size: 104, color: '#fff', lineHeight: 1.02 }) : null;
  head2?.place({ left: `${W * 0.06}px`, top: '86px' });

  // query card
  const query = new CodePanel(stage, { rect: qRect, title: 'tina/queries/page.gql', lang: 'graphql', code: QUERY, size: FSQ });
  const qTimes = lineSchedule(query.lines.length, T.type0, T.type1);

  // result card (+ two ghost cards: the deal)
  const ghosts = [0, 1].map(() => box({ left: `${rRect.x}px`, top: `${rRect.y}px`, width: `${rRect.w}px`, height: `${rRect.h}px`, borderRadius: '18px', background: '#1B1638', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px -24px rgba(0,0,0,0.6)', opacity: '0' }));
  stage.append(...ghosts);
  const result = new CodePanel(stage, { rect: rRect, title: 'data.page.blocks[0]', lang: 'json', code: json, size: FS, chrome: 52, gutter: false });
  const rTimes = lineSchedule(result.lines.length, T.json0, T.json1);
  // Before the query has run, the card is already there, waiting: grey bars with a shimmer.
  const skeleton = box({ left: '0', top: '0', right: '0', bottom: '0' });
  [0.36, 0.84, 0.7, 0.78, 0.5].forEach((w, i) => {
    skeleton.append(box({ left: '30px', top: `${result.padTop + (i + 0.5) * result.lhPx - 8 + (i > 0 ? 0 : 0)}px`, width: `${w * (rRect.w - 80)}px`, height: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.075)' }));
  });
  const shimmer = box({ left: '0', top: '0', width: '260px', bottom: '0', background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.10) 50%, transparent 100%)' });
  skeleton.append(shimmer);
  skeleton.style.overflow = 'hidden';
  result.win.body.append(skeleton);
  // A status footer appears with the data.
  const footer = box({ left: '0', right: '0', bottom: '0', height: '54px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 26px', gap: '10px', font: `500 ${FS - 3}px ${FONT.mono}`, color: SYN.dim, opacity: '0' });
  footer.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${C.seafoam};box-shadow:0 0 10px ${C.seafoam}"></span><span style="color:${C.seafoam}">200 OK</span><span style="margin-left:auto">41 ms</span>`;
  result.win.body.append(footer);
  const resultGlow = box({ left: '0', top: '0', right: '0', bottom: '0', borderRadius: '18px', boxShadow: `inset 0 0 0 2px ${C.orange}, 0 0 40px ${C.orange}66`, opacity: '0', pointerEvents: 'none' });
  result.win.root.append(resultGlow);

  // type chips beside the result values
  const chipSpec: { line: number; text: string; color: string }[] = [
    { line: 1, text: 'PageBlocksHero', color: '#C9A7FF' },
    { line: 2, text: 'string', color: '#85C5FE' },
    { line: 3, text: 'string', color: '#85C5FE' },
    { line: 4, text: 'string', color: '#85C5FE' },
  ];
  const chips = chipSpec.map((c) => {
    const d = box({ left: '0', top: '0', height: '28px', padding: '0 11px', borderRadius: '999px', background: 'rgba(133,197,254,0.14)', border: `1px solid ${c.color}66`, color: c.color, font: `500 ${FS - 6}px ${FONT.mono}`, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', opacity: '0' });
    d.textContent = c.text;
    stage.append(d);
    return d;
  });
  const pickBars = [0, 1, 2].map(() => box({ left: `${rRect.x + 8}px`, top: '0', width: `${rRect.w - 16}px`, height: `${result.lhPx}px`, background: 'rgba(236,72,21,0.2)', boxShadow: `inset 3px 0 0 ${C.orange}`, borderRadius: '6px', opacity: '0' }));
  stage.append(...pickBars);

  // the run pulse
  const pulse = box({ left: '-12px', top: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#fff', boxShadow: `0 0 0 5px ${C.orange}, 0 0 34px 10px ${C.orange}AA`, opacity: '0' });
  stage.append(pulse);

  // phase two: the TypeScript card and the popup
  let ts: CodePanel | null = null;
  let tsTimes: LineTime[] = [];
  let popup: HTMLDivElement | null = null;
  let popRows: HTMLDivElement[] = [];
  let popSel: HTMLDivElement | null = null;
  if (T.typed) {
    ts = new CodePanel(stage, { rect: qRect, title: 'app/page.tsx', lang: 'ts', code: TS_CODE, size: FST });
    tsTimes = lineSchedule(ts.lines.length, T.typed.ts0, T.typed.ts1);
    const items: { name: string; type: string }[] = [
      { name: 'headline', type: 'string' },
      { name: 'tagline', type: 'string' },
      { name: 'image', type: 'string' },
      { name: 'actions', type: '{ label?: string }[]' },
      { name: '__typename', type: '"PageBlocksHero"' },
    ];
    popup = box({ left: '0', top: '0', width: '520px', height: `${items.length * 42 + 14}px`, borderRadius: '10px', background: '#1F1B3D', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 30px 60px -10px rgba(0,0,0,0.7)', opacity: '0', overflow: 'hidden' });
    popSel = box({ left: '4px', right: '4px', top: '7px', height: '42px', borderRadius: '6px', background: 'rgba(236,72,21,0.28)' });
    popup.append(popSel);
    popRows = items.map((it, i) => {
      const r = box({ left: '0', right: '0', top: `${7 + i * 42}px`, height: '42px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', font: `500 ${FS - 2}px ${FONT.mono}`, color: '#E6E3F5', whiteSpace: 'nowrap' });
      r.innerHTML = `${propIcon}<span>${it.name}</span><span style="margin-left:auto;color:#85C5FE;font-size:${FS - 5}px">${it.type}</span>`;
      popup!.append(r);
      return r;
    });
    stage.append(popup);
  }
  const insert = box({ left: '0', top: '0', font: `400 ${FST}px/${FST * 1.56}px ${FONT.mono}`, color: SYN.key, whiteSpace: 'pre', opacity: '0', height: `${FST * 1.56}px` });
  insert.textContent = 'headline';
  const insertCaret = box({ left: '0', top: '0', width: `${FST * 0.6}px`, height: `${FST * 1.15}px`, background: C.orange, opacity: '0' });
  stage.append(insert, insertCaret);

  const set = (e: Element, k: string, v: string | number) => { const s = String(v); if (e.getAttribute(k) !== s) e.setAttribute(k, s); };
  void set;

  return {
    root,
    update(t, Lsec) {
      const sw = T.typed ? T.typed.swap : Infinity;
      // ── headlines ──
      head1.update(t, { in: T.headIn, out: T.typed ? sw - 0.1 : undefined, stagger: 0.07, dur: 0.6, outDur: 0.2 });
      head2?.update(t, { in: sw, stagger: 0.07, dur: 0.6 });

      // ── query card ──
      const qIn = ease.snap(seg(t, 0, 0.35));
      const qOut = T.typed ? ease.inCubic(seg(t, sw, sw + 0.22)) : 0;
      css(query.win.root, { display: t >= sw + 0.25 ? 'none' : '', opacity: clamp(0.5 + t * 14) * (1 - qOut), transform: tf({ x: -qOut * 90, y: (1 - qIn) * 40, s: (0.97 + 0.03 * qIn) * (1 - qOut * 0.04) }) });
      query.win.sheenAt(seg(t, 0.1, 1.1));
      const qn = query.charsAt(t, qTimes);
      query.render(qn, t < T.type1 + 0.4 || Math.floor(t * 3) % 2 === 0, [], 0);

      // ── the run pulse: query card -> result card ──
      const rp = seg(t, T.run, T.run + 0.28, ease.inOutCubic);
      const py = rRect.y + 70;
      css(pulse, { opacity: rp > 0 && rp < 1 ? 1 : 0, transform: tf({ x: lerp(qRect.x + qRect.w - 40, rRect.x + 60, rp), y: lerp(qRect.y + 200, py, rp) - Math.sin(rp * Math.PI) * 50 }) });

      // ── result card: there from the start (waiting), it receives the data at the run, with a small fan ──
      const rIn = spring(t - 0.12, 2.8, 0.7);
      css(result.win.root, { opacity: clamp(0.4 + t * 12), transform: tf({ x: (1 - clamp(rIn, 0, 1.2)) * 70, y: (1 - clamp(rIn, 0, 1)) * 24, s: 0.97 + 0.03 * clamp(rIn, 0, 1) }) });
      result.win.sheenAt(seg(t, 0.2, 1.3));
      css(shimmer, { transform: tf({ x: ((t * 0.55) % 1) * (rRect.w + 260) - 260 }) });
      css(skeleton, { opacity: 1 - ease.outCubic(seg(t, T.run + 0.1, T.run + 0.3)), display: t >= T.run + 0.32 ? 'none' : '' });
      css(footer, { opacity: ease.outCubic(seg(t, T.json1, T.json1 + 0.2)) });
      const rg = t >= T.run + 0.2 ? Math.exp(-(t - T.run - 0.2) * 5) : 0;
      css(resultGlow, { opacity: rg });
      ghosts.forEach((g, i) => {
        const a0 = T.run + 0.15;
        const spread = ease.outCubic(seg(t, a0, a0 + 0.14)) * (1 - ease.inOutCubic(seg(t, a0 + 0.14, a0 + 0.5)));
        css(g, { opacity: t >= a0 && t < a0 + 0.55 ? 0.65 * (1 - i * 0.3) : 0, transform: tf({ x: (i ? 22 : -22) * spread, y: (12 + 8 * i) * spread, r: (i ? 3.2 : -3.2) * spread }) });
      });
      const rn = result.charsAt(t, rTimes);
      result.render(rn, false, [], 0);

      // ── type chips fan out ──
      chipSpec.forEach((c, i) => {
        const t0 = T.chips + i * 0.0625;
        const on = t >= t0;
        const p = on ? spring(t - t0, 3.2, 0.55) : 0;
        const x = result.lineEndX(c.line) + 22 + rRect.x * 0 - 0;
        const y = result.lineY(c.line, 0) - 14;
        // chip x: after the text on that line; the result panel's own origin is rRect.x
        const maxLen = Math.max(...result.lines.map((l) => l.length));
        const cx = rRect.x + result.padLeft + maxLen * result.cw + 28;
        void x;
        css(chips[i], { opacity: on ? clamp((t - t0) * 12) : 0, transform: tf({ x: cx + (1 - clamp(p, 0, 1.2)) * -30, y, s: lerp(0.8, 1, clamp(p, 0, 1.15)) }) });
      });

      // ── phase two: TypeScript + autocomplete ──
      if (T.typed && ts && popup && popSel) {
        const tp = T.typed;
        const tIn = ease.snap(seg(t, sw + 0.1, sw + 0.5));
        css(ts.win.root, { display: t >= sw ? '' : 'none', opacity: t >= sw ? clamp((t - sw) * 8) : 0, transform: tf({ x: (1 - tIn) * -90, y: (1 - tIn) * 20, s: 0.97 + 0.03 * tIn }) });
        const n = ts.charsAt(t, tsTimes);
        const done = t >= tp.ts1;
        const accepted = t >= tp.accept;
        ts.render(n, !accepted && (t < tp.ts1 + 0.2 || Math.floor(t * 3) % 2 === 0), [], 0);
        // popup anchors at the caret (end of the last line)
        const lastLine = ts.lines.length - 1;
        const cx = qRect.x + ts.padLeft + ts.lines[lastLine].length * ts.cw;
        const cy = ts.lineY(lastLine, 0) + ts.lhPx / 2 + 6;
        const popOn = done && t >= tp.popup && t < tp.accept + 0.12;
        void popOn;
        const pp = spring(t - tp.popup, 3.4, 0.6);
        css(popup, { opacity: popOn ? clamp((t - tp.popup) * 10) * (t > tp.accept ? 1 - seg(t, tp.accept, tp.accept + 0.12) : 1) : 0, transform: tf({ x: cx, y: cy + (1 - clamp(pp, 0, 1.2)) * -12, s: lerp(0.94, 1, clamp(pp, 0, 1.1)) }) });
        popRows.forEach((r, i) => css(r, { opacity: clamp((t - tp.popup - i * 0.0625) * 12) }));
        // selection walks the list (headline, tagline, image, back to headline); each row lights its JSON line
        let row = 0;
        let rowT = tp.popup;
        for (const q2 of tp.seq) if (t >= q2.t) { row = q2.row; rowT = q2.t; }
        const prevRow = (() => { let pr = 0; for (const q2 of tp.seq) { if (q2.t < rowT) pr = q2.row; } return pr; })();
        const mp = ease.outCubic(seg(t, rowT, rowT + 0.1));
        css(popSel, { transform: tf({ y: lerp(prevRow, row, mp) * 42 }) });
        const jsonLines = [2, 3, 4];
        pickBars.forEach((b, i) => {
          const lit = t >= tp.popup && t < tp.accept + 1.2 && row === i && !(accepted && i !== 0);
          css(b, { opacity: lit ? 1 : 0, transform: tf({ y: result.lineY(jsonLines[i], 0) - result.lhPx / 2 }) });
        });
        // accepted: "headline" is inserted after `block.`, the caret moves on
        css(insert, { opacity: accepted ? 1 : 0, transform: tf({ x: cx, y: ts.lineY(lastLine, 0) - ts.lhPx / 2 }) });
        css(insertCaret, { opacity: accepted && Math.floor(t * 3) % 2 === 0 ? 1 : 0, transform: tf({ x: cx + 8 * ts.cw, y: ts.lineY(lastLine, 0) - ts.lhPx * 0.42 }) });
      }

      // gentle push-in
      css(stage, { transform: tf({ s: 0.98 + 0.02 * seg(t, 0, Lsec, ease.outCubic) }) });
    },
  };
}

export { el };
