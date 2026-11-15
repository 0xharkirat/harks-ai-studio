// Scene `blocks` (anthem 24-32 s): the page builder.
// The editor page explodes into solid block cards in a tilted 3D stack, the blocks reorder on beats, the
// Tina sidebar slides in with the "add block" picker, a new block drops in, and the stack collapses back into the page while the
// edit box lands on the Save button. Every time is a prop (local seconds); defaults are the anthem's.
import type { SceneDef } from '../../engine/stage';
import { box, css, el } from '../../engine/dom';
import { clamp, ease, lerp, noise1, seg, spring } from '../../engine/anim';
import { Headline } from '../../ui/text';
import { Cursor, EditBox, WashBg, type Rect } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C, SHADOW } from '../../brand/tokens';
import { img } from '../../engine/assets';
import { BLOCKS, CARD_W, PAGE_SRC, setMode, type BlockId } from './fieldnote';
import { RADIUS, SolidCard, TAB_H } from './slab';
import { makePanel, type PanelGeom } from './tinaPanel';

export interface BlocksProps {
  /** `full` (anthem 8 s, thirty 6 s) or `flash` (fifteen 2 s). Only sets defaults. */
  variant?: 'full' | 'flash';
  /** Headline, *emphasis* gets the orange gradient. */
  line?: string;
  /** Second line while the picker is open. `false` hides it. Default: on when the scene is 7 s or longer. */
  line2?: string | false;
  /** Entrance time of each headline word. */
  wordTimes?: number[];
  /** Times the reorders land (the pop). Count picks the choreography: 1, 2 or 3 moves. */
  reorders?: number[];
  /** Explicit block orders for the reorders (override the default choreography). */
  orders?: BlockId[][];
  /** The sidebar picker (anthem and thirty). `false` skips it (flash). */
  picker?: boolean;
  /** The sidebar slides in with the picker open. */
  pickerAt?: number;
  /** The cursor clicks the template (anthem 5.0). */
  clickAt?: number;
  /** The new block lands in the stack. */
  dropAt?: number;
  /** The stack starts to collapse into the page. */
  collapseAt?: number;
  collapseDur?: number;
  /** The edit box has landed on Save. */
  saveAt?: number;
}

/** Ready-made props: thirty 14-20 (6 s) and fifteen 6-8 (2 s). */
export const BLOCKS_THIRTY: BlocksProps = { reorders: [1.0, 2.0], pickerAt: 2.75, clickAt: 3.5, dropAt: 4.5, collapseAt: 5.5, collapseDur: 0.3, saveAt: 5.9, line2: false };
export const BLOCKS_FLASH: BlocksProps = { variant: 'flash', line: 'Build with\n*blocks.*', wordTimes: [0.05, 0.05, 0.14], reorders: [0.5], picker: false, clickAt: 0.6, dropAt: 1.0, collapseAt: 1.25, collapseDur: 0.4, saveAt: 1.72, line2: false };

// The next few values differ between landscape and portrait; `setup` sets them before anything is built.
/** The block the scene adds. It is a real template the page does not have yet (the page already has Stats). */
const NEW_ID: BlockId = 'video';
/** The page as it opens: the real Fieldnote block order (it is the page the edit scene ends on). */
let O0: BlockId[] = ['callout', 'hero', 'stats', 'features', 'testimonial', 'cta'];
let ID_ALL: BlockId[] = [...O0, NEW_ID];

// Stack feel.
let G = 60; // gap between exploded cards (plane px)
let ZS = -52; // depth per slot
let PERSP = 1900; // CSS perspective of the stack
let TABS = 1; // label tab scale
const FLOOR_Z = -150;
const LEAD = 0.12; // a spring starts this long before the beat, so its first contact lands on the beat
const LIFT = 210;
const XOFF = 90;
const DIP = 26;
const FALL = 0.38;
const FALL_Z = 850;
let CHROME = 46;
const FLAT_R = 16;

interface Cam { cx: number; cy: number; s: number; rx: number; rz: number }
const lerpCam = (a: Cam, b: Cam, p: number): Cam => ({ cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), s: lerp(a.s, b.s, p), rx: lerp(a.rx, b.rx, p), rz: lerp(a.rz, b.rz, p) });

interface Geo {
  panel: PanelGeom;
  /** Where the sidebar slides in from (px offset when hidden). */
  panelFrom: [number, number];
  /** Camera states: flat page at the start, stack, stack with the picker open, flat page at the end. */
  flatA: Cam; stack: Cam; stackB: Cam; flatB: Cam;
  h1: { x: number; y: number; size: number };
  h2: { x: number; y: number; size: number };
}

const sumH = (ids: BlockId[]) => ids.reduce((a, id) => a + BLOCKS[id].h, 0);
let FINAL_ORDER: BlockId[] = ['callout', 'hero', NEW_ID, 'stats', 'features', 'testimonial', 'cta'];

function geometry(W: number, H: number, portrait: boolean, flash = false): Geo {
  const T0 = sumH(O0), T1 = sumH(FINAL_ORDER);
  if (!portrait && flash) {
    // 2 s version: the sidebar stays, the headline sits in the middle column, the page lives on the right.
    const sA = Math.min(0.7, 930 / (T0 + CHROME)), sB = Math.min(0.6, 930 / (T1 + CHROME));
    return {
      panel: { x: 0, y: 0, w: 440, h: H, cols: 1, u: 1 },
      panelFrom: [-560, 0],
      flatA: { cx: 1400, cy: H / 2 + (CHROME / 2) * sA, s: sA, rx: 0, rz: 0 },
      stack: { cx: 1420, cy: 560, s: 0.5, rx: 47, rz: -19 },
      stackB: { cx: 1420, cy: 560, s: 0.5, rx: 47, rz: -19 },
      flatB: { cx: 1400, cy: H / 2 + (CHROME / 2) * sB, s: sB, rx: 0, rz: 0 },
      h1: { x: 500, y: 380, size: 112 },
      h2: { x: 500, y: 330, size: 62 },
    };
  }
  if (!portrait) {
    // The page has 6 blocks and gains a 7th, so the final flat page is taller than the frame: it scrolls off
    // under a soft fade (same device as portrait) and keeps a readable size.
    const sA = Math.min(0.72, 930 / (T0 + CHROME)), sB = 0.62;
    return {
      panel: { x: 0, y: 0, w: 440, h: H, cols: 1, u: 1 },
      panelFrom: [-560, 0],
      flatA: { cx: 1180, cy: H / 2 + (CHROME / 2) * sA, s: sA, rx: 0, rz: 0 },
      stack: { cx: 1300, cy: 520, s: 0.46, rx: 45, rz: -19 },
      stackB: { cx: 1390, cy: 535, s: 0.42, rx: 45, rz: -19 },
      flatB: { cx: 1180, cy: 76 + (T1 / 2 + CHROME) * sB, s: sB, rx: 0, rz: 0 },
      h1: { x: 115, y: 330, size: 136 },
      h2: { x: 490, y: 410, size: 74 },
    };
  }
  // Portrait: one column. The stack ends by y 1210 (63%, above the Reels bottom band), the Tina sheet only
  // opens for the picker, and the final page is big (it scrolls off under a fade) with a floating Save dock.
  const top = 372;
  const sA = Math.min(0.7, (1210 - top) / T0);
  const sB = 0.78;
  return {
    panel: { x: 65, y: 482, w: 950, h: 728, cols: 2, u: 1.7, compact: true },
    panelFrom: [0, 1500],
    flatA: { cx: W / 2, cy: top + (T0 / 2) * sA, s: sA, rx: 0, rz: 0 },
    stack: { cx: W / 2, cy: 866, s: 0.42, rx: 46, rz: -12 },
    stackB: { cx: W / 2, cy: 400, s: 0.3, rx: 46, rz: -12 },
    flatB: { cx: W / 2, cy: top + (T1 / 2) * sB, s: sB, rx: 0, rz: 0 },
    h1: { x: 0, y: 372, size: 104 },
    h2: { x: 0, y: 372, size: 96 },
  };
}

/** Rect of the Save button on the last frame of the scene (screen px). The `git` scene starts here. */
export function saveButtonRect(W: number, H: number, portrait: boolean): Rect {
  const g = geometry(W, H, portrait).panel;
  const u = g.u, foot = 72 * u, bh = 40 * u;
  return { x: g.x + g.w - 24 * u - 96 * u, y: g.y + g.h - foot + (foot - bh) / 2, w: 96 * u, h: bh };
}

interface Slot { x: number; y: number; z: number }
function exLayout(order: BlockId[]): Record<string, Slot> {
  const n = order.length;
  const total = sumH(order) + G * (n - 1);
  let y = -total / 2;
  const out: Record<string, Slot> = {};
  order.forEach((id, i) => {
    const h = BLOCKS[id].h;
    out[id] = { x: 0, y: y + h / 2, z: (i - (n - 1) / 2) * ZS };
    y += h + G;
  });
  return out;
}
function flatLayout(order: BlockId[]): Record<string, Slot> {
  let y = -sumH(order) / 2;
  const out: Record<string, Slot> = {};
  for (const id of order) {
    out[id] = { x: 0, y: y + BLOCKS[id].h / 2, z: 0 };
    y += BLOCKS[id].h;
  }
  return out;
}
/** The new block goes in right after Hero. */
const withNew = (o: BlockId[]) => { const i = o.indexOf('hero') + 1; return [...o.slice(0, i), NEW_ID, ...o.slice(i)]; };

function choreography(count: number): BlockId[][] {
  const keep = (o: BlockId[]) => (O0.includes('callout') ? o : o.filter((x) => x !== 'callout'));
  const O1: BlockId[] = ['callout', 'hero', 'stats', 'testimonial', 'features', 'cta'];
  const O2: BlockId[] = ['cta', 'callout', 'hero', 'stats', 'testimonial', 'features'];
  const Oa: BlockId[] = ['cta', 'callout', 'hero', 'stats', 'features', 'testimonial'];
  if (count <= 1) return [keep(O1)];
  if (count === 2) return [keep(Oa), O0];
  return [keep(O1), keep(O2), O0];
}

/** Which card is the dragged one for a step: the biggest move; on a tie the one that moves up. */
function moverOf(a: BlockId[], b: BlockId[]): BlockId {
  let best: BlockId = b[0], bm = -1, bd = 0;
  for (const id of b) {
    const d = b.indexOf(id) - a.indexOf(id);
    if (Math.abs(d) > bm || (Math.abs(d) === bm && d < bd)) { best = id; bm = Math.abs(d); bd = d; }
  }
  return best;
}

const blocks: SceneDef<BlocksProps> = {
  id: 'blocks',
  async setup({ root, W, H, portrait, entry }, props) {
    // Mode: block crops, stack feel and tab size.
    setMode(portrait);
    if (portrait) {
      O0 = ['hero', 'stats', 'features', 'testimonial', 'cta'];
      FINAL_ORDER = ['hero', NEW_ID, 'stats', 'features', 'testimonial', 'cta'];
      G = 130; ZS = -22; CHROME = 0; PERSP = 2600; TABS = 3.1;
    } else {
      O0 = ['callout', 'hero', 'stats', 'features', 'testimonial', 'cta'];
      FINAL_ORDER = ['callout', 'hero', NEW_ID, 'stats', 'features', 'testimonial', 'cta'];
      G = 46; ZS = -40; CHROME = 46; PERSP = 1900; TABS = 1;
    }
    ID_ALL = [...O0, NEW_ID];
    const dur = entry.end - entry.start;
    const flash = props.variant === 'flash';
    const geo = geometry(W, H, portrait, flash);
    await img(PAGE_SRC);
    const hasPicker = props.picker ?? !flash;
    const reorders = props.reorders ?? (flash ? [0.5] : [1, 2, 3]);
    const orders = props.orders ?? choreography(reorders.length);
    const pickerAt = props.pickerAt ?? 4.0;
    const clickAt = props.clickAt ?? (flash ? 0.6 : 5.0);
    const dropAt = props.dropAt ?? (flash ? 1.0 : 5.75);
    const collapseAt = props.collapseAt ?? (flash ? 1.25 : 6.0);
    const collapseDur = props.collapseDur ?? (flash ? 0.4 : 0.9);
    const saveAt = props.saveAt ?? collapseAt + collapseDur + 0.35;
    const handAt = collapseAt + collapseDur - 0.02; // 3D box hands over to the 2D box
    const showLine2 = props.line2 === false ? false : props.line2 ?? (dur >= 7 && hasPicker ? 'Devs define.\n*Teams compose.*' : false);
    const panelAt = hasPicker ? pickerAt : collapseAt - 0.35;

    const bg = new WashBg(root, W, H, { base: '#E6EFF9', strength: 1.15 });

    // 3D stage: perspective on the parent, the plane tilts, cards live in the plane.
    const stage3d = box({ inset: '0', perspective: `${PERSP}px` });
    const cam = box({ left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
    stage3d.append(cam);
    root.append(stage3d);

    const floor = box({ left: -1900, top: -1900, width: 3800, height: 3800, transform: `translateZ(${FLOOR_Z}px)`, opacity: '0',
      backgroundImage: 'linear-gradient(rgba(60,120,220,0.20) 2px, transparent 2px), linear-gradient(90deg, rgba(60,120,220,0.20) 2px, transparent 2px)',
      backgroundSize: '125px 125px', backgroundPosition: '-1px -1px',
      maskImage: 'radial-gradient(closest-side, #000 18%, transparent 100%)', webkitMaskImage: 'radial-gradient(closest-side, #000 18%, transparent 100%)' } as any);
    cam.append(floor);

    // The window frame around the flat page (start and end of the scene).
    const frame = box({ left: -CARD_W / 2, width: CARD_W, borderRadius: `${FLAT_R + 2}px`, background: '#fff', border: '1px solid rgba(15,23,42,0.12)', boxShadow: SHADOW.xl, transform: 'translateZ(-4px)' });
    const bar = box({ left: 0, top: 0, right: 0, height: CHROME, background: '#F1F5F9', borderBottom: '1px solid rgba(15,23,42,0.08)', borderRadius: `${FLAT_R + 2}px ${FLAT_R + 2}px 0 0` });
    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => bar.append(box({ left: 22 + i * 24, top: CHROME / 2 - 7, width: 14, height: 14, borderRadius: '50%', background: c })));
    bar.append(box({ left: '50%', top: CHROME / 2 - 15, width: 380, height: 30, marginLeft: '-190px', borderRadius: '8px', background: '#fff', border: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: `500 15px ${FONT.ui}`, color: C.text2 }, el('span', { text: 'fieldnote.app' })));
    if (CHROME > 0) frame.append(bar);
    cam.append(frame);

    const cards = new Map<BlockId, SolidCard>();
    for (const id of ID_ALL) cards.set(id, new SolidCard(cam, id, TABS));

    // Ghost slot for the new block.
    const ghost = box({ left: -CARD_W / 2, width: CARD_W, height: BLOCKS[NEW_ID].h, borderRadius: `${RADIUS}px`, border: `4px dashed ${C.orange}`, background: `${C.orange}10`, opacity: '0', display: 'grid', placeItems: 'center' },
      el('span', { text: `+ ${BLOCKS[NEW_ID].label}`, style: { font: `600 34px ${FONT.ui}`, color: C.orange } }));
    cam.append(ghost);
    const ring0 = box({ left: -800, top: -500, width: 1600, height: 1000, borderRadius: '50%', border: '12px solid rgba(255,255,255,0.95)', opacity: '0', transform: `translateZ(${FLOOR_Z + 20}px)` });
    cam.append(ring0);
    const ring = box({ left: -CARD_W / 2, width: CARD_W, height: BLOCKS[NEW_ID].h, borderRadius: `${RADIUS + 10}px`, border: `7px solid ${C.orange}`, opacity: '0' });
    cam.append(ring);

    // 3D edit box: lives in the plane, follows the selected card.
    const boxHolder = box({ left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
    const ebox3 = new EditBox(boxHolder, '', { width: portrait ? 7 : 4, radius: 18 });
    cam.append(boxHolder);

    // Sidebar (the Tina editor) + 2D overlay pieces.
    const panel = await makePanel(root, geo.panel);
    const h1 = new Headline(root, { text: props.line ?? 'Build pages\nwith *blocks.*', size: geo.h1.size, color: C.ink, lineHeight: 1.02, align: portrait ? 'center' : undefined });
    h1.place(portrait ? { left: '0px', top: `${geo.h1.y}px`, width: `${W}px` } : { left: `${geo.h1.x}px`, top: `${geo.h1.y}px` });
    const h2 = showLine2 ? new Headline(root, { text: showLine2, size: geo.h2.size, color: C.ink, lineHeight: 1.08 }) : null;
    h2?.place({ left: `${geo.h2.x}px`, top: `${geo.h2.y}px` });
    const cursor = new Cursor(root, portrait ? 1.7 : 1.05);
    const ebox2 = new EditBox(root, '', { width: portrait ? 5 : 3, radius: 10 });
    css(ebox2.root, { zIndex: '60' });

    // ── timeline derived from props ──
    const stages: BlockId[][] = [O0, ...orders];
    const lay = stages.map(exLayout);
    const finalOrder = withNew(stages[stages.length - 1]);
    const layIns = exLayout(finalOrder);
    const layFlat0 = flatLayout(O0);
    const layFlat1 = flatLayout(finalOrder);
    const moves = orders.map((o, k) => ({ k, T: reorders[Math.min(k, reorders.length - 1)], mover: moverOf(stages[k], o) }));
    const insStart = (hasPicker ? clickAt + 0.05 : dropAt - FALL - 0.25);
    const T0 = sumH(O0), T1 = sumH(finalOrder);

    // Selection events for the edit box.
    const sels: { t: number; id: BlockId }[] = [];
    if (!flash) sels.push({ t: 0.5, id: 'hero' });
    for (const m of moves) {
      const t = Math.max(m.T - 0.32, (sels[sels.length - 1]?.t ?? 0) + 0.2);
      if (!sels.length || sels[sels.length - 1].id !== m.mover) sels.push({ t, id: m.mover });
    }
    sels.push({ t: dropAt, id: NEW_ID });
    const hideFrom = hasPicker ? pickerAt - 0.2 : insStart - 0.1;

    // Words.
    const wordTimes = props.wordTimes ?? [0.5, 0.58, 1.0, 1.08];
    // The line holds until the picker arrives, or (no picker) until the last 0.2 s of the scene.
    const h1Out = hasPicker ? pickerAt - 0.12 : dur - (flash ? 0.17 : 0.2);
    const line2Times = [pickerAt + 0.1, pickerAt + 0.2, pickerAt + 0.4, pickerAt + 0.5];

    // Picker choreography.
    const pickId: BlockId = NEW_ID;
    const scrollTo = panel.scrollFor(pickId);
    const scrollAt = (t: number) => scrollTo * ease.inOutCubic(seg(t, pickerAt + 0.3, clickAt - 0.1));
    const cardCenter = (t: number): [number, number] => {
      const r = panel.cardRect(pickId, scrollAt(t));
      return [r.x + r.w * 0.55, r.y + r.h * 0.42];
    };

    // ── per-frame state of a card ──
    interface St { x: number; y: number; z: number; rz: number; s: number; open: number; sel: number; alpha: number; tabExt: number }
    const state = (id: BlockId, t: number): St => {
      const e = spring(t, 2.7, 0.5);
      const slot0 = Math.max(0, O0.indexOf(id));
      const ez = spring(t - 0.022 * slot0, 2.3, 0.4);
      const c = collapseDur > 0 ? seg(t, collapseAt, collapseAt + collapseDur, ease.inOutQuart) : 0;
      let ex = 0, ey = 0, exz = 0, rz = (slot0 % 2 ? 1 : -1) * (1.2 + 0.5 * slot0) * Math.exp(-t * 5.5) * Math.sin(t * 21), s = 1;
      if (id !== NEW_ID) {
        const b = lay[0][id];
        ex = b.x; ey = b.y; exz = b.z;
        stages.forEach((_, k) => {
          if (k === 0) return;
          const T = moves[k - 1].T;
          const P = spring(t - (T - LEAD), 3.4, 0.62);
          const a = lay[k - 1][id], b2 = lay[k][id];
          ex += (b2.x - a.x) * P; ey += (b2.y - a.y) * P; exz += (b2.z - a.z) * P;
          const flight = Math.sin(Math.PI * clamp(P));
          if (moves[k - 1].mover === id) {
            const side = Math.sign(b2.y - a.y) || 1;
            exz += LIFT * flight; ex += XOFF * flight; rz += -side * 3.2 * flight;
            if (t >= T) s += 0.028 * Math.exp(-(t - T) * 13);
          } else if (b2.y !== a.y) {
            exz -= DIP * flight;
          }
        });
        const Pi = spring(t - insStart, 3.0, 0.7);
        ey += (layIns[id].y - lay[lay.length - 1][id].y) * Pi;
        exz += (layIns[id].z - lay[lay.length - 1][id].z) * Pi;
        const dtI = t - dropAt;
        if (dtI > 0) exz += -16 * Math.exp(-dtI * 9) * Math.cos(dtI * 26);
      } else {
        ex = layIns[NEW_ID].x; ey = layIns[NEW_ID].y; exz = layIns[NEW_ID].z;
        const u = clamp((t - (dropAt - FALL)) / FALL);
        exz += (1 - ease.inQuad(u)) * FALL_Z;
        s = 1 + 0.35 * (1 - ease.inQuad(u));
        const dtI = t - dropAt;
        if (dtI > 0) { exz += 20 * Math.exp(-dtI * 8) * Math.sin(dtI * 28); s += 0.03 * Math.exp(-dtI * 12); }
      }
      const f0 = layFlat0[id] ?? layFlat1[id];
      const f1 = layFlat1[id];
      const y = lerp(lerp(f0.y, ey, e), f1.y, c);
      const x = lerp(0, ex, e) * (1 - c);
      const z = lerp(0, exz, ez) * (1 - c);
      const open = clamp(e) * (1 - c);
      const alpha = id === NEW_ID ? clamp((t - (dropAt - FALL)) * 14) : 1;
      return { x, y, z, rz: rz * (1 - c), s: lerp(1, s, 1 - c * 0.0), open, sel: 0, alpha, tabExt: TAB_H * TABS * clamp((open - 0.35) / 0.65) };
    };

    const flatTop = (id: BlockId, order: BlockId[]) => order[0] === id;
    const flatBot = (id: BlockId, order: BlockId[]) => order[order.length - 1] === id;

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = 0.1;
        f.post.grain = 0.05;
        f.post.flash = Math.max(0, 1 - t / 0.2) * 0.5 + Math.max(0, 1 - Math.abs(t - dropAt) / 0.1) * (t >= dropAt ? 0.28 : 0);
        bg.update(t + 24);

        // Camera.
        const e = spring(t - 0.035, 1.9, 0.62);
        const eg = spring(t, 2.7, 0.5);
        const c = collapseDur > 0 ? seg(t, collapseAt, collapseAt + collapseDur, ease.inOutQuart) : 0;
        const pk = hasPicker ? ease.inOutCubic(seg(t, pickerAt - 0.1, pickerAt + 0.5)) * (portrait ? 1 - ease.inOutCubic(seg(t, clickAt + 0.25, clickAt + 0.85)) : 1) : 0;
        const stackNow = lerpCam(geo.stack, geo.stackB, pk);
        const insP = spring(t - insStart, 3.0, 0.7);
        stackNow.cy -= (portrait ? 78 : 26) * insP;
        if (portrait) stackNow.s *= 1 - 0.09 * insP; // five cards: keep the stack above y 1210
        // Slow orbit and push; a beat nudge.
        const tt = Math.max(0, t);
        stackNow.rz += -1.2 * Math.sin(tt * 0.5) - 0.6 * tt * 0.1 + noise1(tt * 0.35, 4) * 0.6;
        stackNow.rx += Math.sin(tt * 0.4 + 1) * 0.8;
        stackNow.s *= 1 + 0.01 * tt * 0.2 + 0.0035 * f.audio.pulse('kick', f.t, 9);
        const shake = Math.exp(-t * 11) * Math.sin(t * 95);
        const cm = lerpCam(lerpCam(geo.flatA, stackNow, e), geo.flatB, c);
        const dropShake = t >= dropAt ? Math.exp(-(t - dropAt) * 12) * Math.sin((t - dropAt) * 70) : 0;
        css(stage3d, { perspectiveOrigin: `${cm.cx}px ${cm.cy}px` });
        {
          // The final page is taller than the frame: it scrolls off under a soft fade (above the Save dock in portrait).
          const m = ease.inOutCubic(seg(t, collapseAt + collapseDur * 0.55, collapseAt + collapseDur));
          const y0 = lerp(H + 400, portrait ? 960 : 900, m), y1 = lerp(H + 700, portrait ? 1075 : 1030, m);
          const mk = m > 0 ? `linear-gradient(180deg, #000 ${y0.toFixed(1)}px, transparent ${y1.toFixed(1)}px)` : 'none';
          css(stage3d, { maskImage: mk, webkitMaskImage: mk } as any);
        }
        css(cam, { transform: `translate3d(${(cm.cx + shake * 12 + dropShake * 4).toFixed(2)}px, ${(cm.cy + shake * 7 + dropShake * 6).toFixed(2)}px, 0) rotateX(${cm.rx.toFixed(3)}deg) rotateZ(${(cm.rz + shake * 0.5).toFixed(3)}deg) scale(${cm.s.toFixed(4)})` });

        // Floor and frame.
        const open = clamp(eg) * (1 - c);
        css(floor, { opacity: clamp(open * 1.1) * 0.95 });
        const T = lerp(T0, T1, c);
        const fa = Math.max(1 - clamp(eg * 5), clamp((c - 0.6) * 2.5));
        css(frame, { top: -T / 2 - CHROME, height: T + CHROME, opacity: fa, visibility: fa > 0.002 ? 'visible' : 'hidden' });

        // Cards.
        const sts = new Map<BlockId, St>();
        ID_ALL.forEach((id) => {
          const st = state(id, t);
          sts.set(id, st);
        });
        // Selection amounts.
        let curSel: { t: number; id: BlockId } | null = null, prevSel: { t: number; id: BlockId } | null = null;
        for (const sv of sels) if (sv.t <= t) { prevSel = curSel; curSel = sv; }
        const boxIn = sels.length ? clamp((t - sels[0].t) * 9) : 0;
        const hideAmt = t < hideFrom ? 0 : t < dropAt ? clamp((t - hideFrom) / 0.15) : 0;
        const baseA = boxIn * (1 - hideAmt) * (1 - clamp((t - handAt) / 0.05));
        ID_ALL.forEach((id) => {
          const st = sts.get(id)!;
          let sel = 0;
          if (curSel && curSel.id === id) sel = clamp((t - curSel.t) / 0.1);
          else if (prevSel && prevSel.id === id) sel = 1 - clamp((t - curSel!.t) / 0.1);
          const slot = withNew(stages[stages.length - 1]).indexOf(id);
          const card = cards.get(id)!;
          const rA = O0.includes(id) ? [flatTop(id, O0), flatTop(id, O0), flatBot(id, O0), flatBot(id, O0)] : [false, false, false, false];
          const rB = [flatTop(id, finalOrder), flatTop(id, finalOrder), flatBot(id, finalOrder), flatBot(id, finalOrder)];
          const oc = clamp(eg);
          const rad = rA.map((a, i) => lerp(lerp(a ? FLAT_R : 0, RADIUS, oc), rB[i] ? FLAT_R : 0, c)) as [number, number, number, number];
          const selV = sel * (curSel && curSel.id === id ? baseA : 1) * (st.open > 0.35 ? 1 : 0);
          if (portrait) st.s *= 1 + 0.12 * selV; // the focused card grows a little on a phone
          card.pose({ x: st.x, y: st.y, z: st.z, rz: st.rz, s: st.s, open: st.open, floor: st.z - FLOOR_Z, sel: selV, radius: rad, alpha: st.alpha });
          // Light sweep: on the explode, then on each landing.
          let sp = seg(t, 0.12 + 0.07 * Math.max(0, slot), 0.9 + 0.07 * Math.max(0, slot));
          moves.forEach((m) => { if (m.mover === id && t > m.T - 0.1 && t < m.T + 0.6) sp = seg(t, m.T - 0.1, m.T + 0.6); });
          if (id === NEW_ID && t > dropAt - 0.05) sp = seg(t, dropAt - 0.05, dropAt + 0.55);
          card.sweep(open > 0.5 ? sp : 0);
        });

        // Crash shockwave on the floor.
        const r0 = clamp(t / 0.55);
        css(ring0, { opacity: (1 - r0) * 0.8 * (t >= 0 ? 1 : 0), transform: `translateZ(${FLOOR_Z + 20}px) scale(${(0.25 + ease.outCubic(r0) * 1.5).toFixed(3)})`, borderWidth: `${(14 * (1 - r0) + 1).toFixed(1)}px` });
        // Ghost slot and shockwave.
        const gs = layIns[NEW_ID];
        const ga = hasPicker || insStart >= 0 ? clamp((t - (insStart + 0.1)) * 6) * (1 - clamp((t - (dropAt - 0.06)) * 18)) : 0;
        const gP = spring(t - insStart, 3.0, 0.7);
        css(ghost, { opacity: ga * (1 - c), top: gs.y - BLOCKS[NEW_ID].h / 2 + 0, transform: `translateZ(${gs.z.toFixed(1)}px) scale(${(0.96 + 0.04 * gP).toFixed(3)})` });
        const rp = clamp((t - dropAt) / 0.5);
        css(ring, { opacity: t >= dropAt ? (1 - rp) * 0.85 * (1 - c) : 0, top: gs.y - BLOCKS[NEW_ID].h / 2, transform: `translateZ(${(gs.z - 3).toFixed(1)}px) scale(${(1 + ease.outCubic(rp) * 0.28).toFixed(3)}, ${(1 + ease.outCubic(rp) * 0.9).toFixed(3)})`, borderWidth: `${(6 * (1 - rp) + 1).toFixed(1)}px` });

        // 3D edit box.
        if (curSel && baseA > 0.002) {
          const cur = sts.get(curSel.id)!;
          const prv = prevSel ? sts.get(prevSel.id)! : null;
          const hp = spring(t - curSel.t, 3.2, 0.62);
          const cw = CARD_W, chs = (id: BlockId, s: St) => BLOCKS[id].h + s.tabExt;
          const cx = (id: BlockId, s: St) => s.x, cy = (id: BlockId, s: St) => s.y - s.tabExt / 2;
          let bx = cx(curSel.id, cur), by = cy(curSel.id, cur), bz = cur.z, bw = cw, bh = chs(curSel.id, cur), brz = cur.rz, bs = cur.s;
          if (prv && prevSel) {
            bx = lerp(cx(prevSel.id, prv), bx, hp); by = lerp(cy(prevSel.id, prv), by, hp); bz = lerp(prv.z, bz, hp);
            bh = lerp(chs(prevSel.id, prv), bh, hp); brz = lerp(prv.rz, brz, hp); bs = lerp(prv.s, bs, hp);
          } else {
            bs *= lerp(0.8, 1, ease.outBack(clamp((t - curSel.t) * 5)));
          }
          const land = moves.reduce((a, m) => (t >= m.T ? Math.max(a, Math.exp(-(t - m.T) * 10)) : a), 0);
          const landStats = t >= dropAt ? Math.exp(-(t - dropAt) * 9) : 0;
          css(boxHolder, { transform: `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, ${(bz + 4).toFixed(2)}px) rotate(${brz.toFixed(3)}deg) scale(${bs.toFixed(4)})`, display: '' });
          const pulse = f.audio.pulse('kick', f.t, 9) * 0.3;
          ebox3.update({ x: -bw / 2, y: -bh / 2, w: bw, h: bh }, baseA, Math.max(pulse, land * 0.7, landStats), false);
        } else {
          css(boxHolder, { display: 'none' });
        }

        // Sidebar + picker.
        const slideIn = spring(t - panelAt, 2.5, 0.78);
        const slideOut = 1 - ease.inCubic(seg(t, 0.02, 0.32));
        let slide = flash ? 1 : t < panelAt ? Math.min(slideOut, 1) : clamp(slideIn) + 0.0;
        let dockAmt = 0;
        if (portrait) {
          // The sheet opens only for the picker, leaves, and returns as a floating Save dock after the collapse.
          const exitAt = clickAt + 0.45, dockAt = collapseAt + 0.1;
          if (t < 0.34) { slide = Math.min(slideOut, 1); dockAmt = 1; }
          else if (t < panelAt) { slide = 0; dockAmt = 1; }
          else if (t < exitAt) { slide = clamp(slideIn); }
          else if (t < dockAt) { slide = 1 - ease.inCubic(seg(t, exitAt, exitAt + 0.3)); }
          else { slide = clamp(spring(t - dockAt, 2.6, 0.8)); dockAmt = 1; }
        }
        const pickerOn = hasPicker ? (t < panelAt ? 0 : 1 - ease.inCubic(seg(t, clickAt + 0.12, clickAt + 0.34))) : 0;
        const insertRow = hasPicker ? t >= clickAt + 0.12 : t >= dropAt - 0.1;
        const rowOrder = insertRow ? finalOrder : (t < 0.35 ? O0 : stages[stages.length - 1]);
        const hoverP = ease.outCubic(seg(t, clickAt - 0.42, clickAt - 0.2));
        const press = t >= clickAt ? Math.sin(clamp((t - clickAt) / 0.16) * Math.PI) : 0;
        panel.update({
          slide: clamp(slide),
          picker: pickerOn,
          cardIn: (i) => ease.snap(seg(t, pickerAt + 0.1 + i * 0.055, pickerAt + 0.5 + i * 0.055)),
          scroll: scrollAt(t),
          hover: hoverP > 0 ? pickId : null,
          hoverP,
          press,
          from: geo.panelFrom,
          dock: dockAmt,
          rows: rowOrder.map((id) => ({ id, p: id === NEW_ID ? ease.snap(seg(t, clickAt + 0.14, clickAt + 0.5)) : 1, hi: id === NEW_ID ? Math.max(0, 1 - seg(t, clickAt + 0.3, clickAt + 1.3)) : 0 })),
        });

        // Words.
        h1.update(t, { in: 0.5, times: wordTimes, dur: flash ? 0.3 : 0.42, out: h1Out, outDur: flash ? 0.15 : 0.18, mode: 'rise' });
        h2?.update(t, { in: pickerAt, times: line2Times, dur: 0.42, out: collapseAt + 0.05, outDur: 0.2 });

        // Cursor: enters from the right, hovers the new template, clicks, leaves.
        if (hasPicker) {
          const [tx, ty] = cardCenter(t);
          const sx = W + 80, sy = H * 0.78;
          const ap = ease.inOutCubic(seg(t, clickAt - 0.95, clickAt - 0.28));
          const out = ease.inCubic(seg(t, clickAt + 0.3, clickAt + 0.8));
          const cx = lerp(sx, tx, ap) + out * 220, cy = lerp(sy, ty, ap) - Math.sin(ap * Math.PI) * 60 + out * 120;
          cursor.update(cx, cy, t, clickAt, clamp(ap * 4) * (1 - out));
        } else cursor.update(0, 0, t, undefined, 0);

        // 2D edit box: takes over from the 3D box and lands on Save.
        const sr = panel.saveRect();
        const hs = geo.flatB;
        const lastCard = sts.get(NEW_ID)!;
        const cardRect: Rect = { x: hs.cx + hs.s * (lastCard.x - CARD_W / 2), y: hs.cy + hs.s * (lastCard.y - BLOCKS[NEW_ID].h / 2), w: CARD_W * hs.s, h: BLOCKS[NEW_ID].h * hs.s };
        const padFix = 10 * (1 - hs.s);
        const from: Rect = { x: cardRect.x + padFix, y: cardRect.y + padFix, w: cardRect.w - padFix * 2, h: cardRect.h - padFix * 2 };
        const hopStart = Math.max(saveAt - 0.14, handAt - 0.02);
        const hop = spring(t - hopStart, 4.0, 0.8);
        const r2: Rect = { x: lerp(from.x, sr.x, hop), y: lerp(from.y, sr.y, hop), w: lerp(from.w, sr.w, hop), h: lerp(from.h, sr.h, hop) };
        const a2 = clamp((t - handAt) / 0.05);
        const pop2 = Math.max(f.audio.pulse('kick', f.t, 9) * 0.35, t >= saveAt ? Math.exp(-(t - saveAt) * 8) * 0.8 : 0);
        ebox2.update(r2, a2, pop2, false);
      },
    };
  },
};

export default blocks;
