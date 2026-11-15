// Scene `proof` (anthem 48-56 s): DROP 2. A hard cut from black into the full-colour tina.io wash,
// "Open source." (no licence name: it is about to change), a GitHub-style star counter climbing to 13.8k with star bursts on the
// beats, then at 52.0 a wall of pages scrolling diagonally in 3D with the edit box hopping between them,
// and from 55.0 everything collapses toward the centre where the cta scene's logo appears at 56.0.
import type { SceneDef } from '../../engine/stage';
import { box, css, el } from '../../engine/dom';
import { clamp, ease, hash, lerp, noise1, seg, spring } from '../../engine/anim';
import { img } from '../../engine/assets';
import { Headline } from '../../ui/text';
import { EditBox } from '../../ui/kit';
import { CharacterCard, loadSprite } from '../../ui/character';
import { FONT } from '../../brand/fonts';
import { C, SHADOW } from '../../brand/tokens';
import { DESIGNS, PH, PLATES, PW, pageFace, type Design } from './pages';

export interface ProofProps {
  /** "Open source." shrinks to the top and the counter starts (default 1.0). */
  counterAt?: number;
  /** The counter reaches its target (default 3.0). */
  countDone?: number;
  /** The wall crashes in (default 4.0). */
  wallAt?: number;
  /** Everything starts to collapse toward the centre (default 7.0). */
  collapseAt?: number;
  /** Star target (default 13800). */
  stars?: number;
  /** Words over the wall. */
  wallLine?: string;
  /** Times of the wall words (local). */
  wallWordTimes?: number[];
  /** Times the edit box hops to a new page ([] for no edit box). */
  hops?: number[];
  /** 16:9: top of "Open source." after it shrinks (default 72; lower it when the DOG sits top left). */
  lockTop?: number;
  /** The giant line of the drop, *asterisks* mark the emphasis (default "Open *source.*"). 16:9 fits it to the width. */
  openLine?: string;
  /** A licence pill beside the line, e.g. "MIT" (default none: the licence is about to change). */
  licence?: string | false;
  /** 16:9: a callback to the two characters under the wall words, the developer (thumbs up) and the content
   *  editor (fist pump) popping in at these local times. */
  cast?: [number, number];
  /** 16:9 layout of the wall words and the cast, for a thumbnail: the words' size and top (defaults 108, H * 0.34),
   *  the character card size (default 250) and the white veil's width as a fraction of W (default 0.7). */
  wallSize?: number;
  wallTop?: number;
  castSize?: number;
  veilW?: number;
}

/** Width of `text` in the heading font (600, tracking -0.025em) at `size` px. */
function measureHead(text: string, size: number) {
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `600 ${size}px ${FONT.head}`;
  (c as any).letterSpacing = `${-0.025 * size}px`;
  return c.measureText(text.replace(/\*/g, '')).width;
}

const STAR = 'M12 2.4l2.95 6.55 7.15.7-5.4 4.75 1.6 7-6.3-3.8-6.3 3.8 1.6-7-5.4-4.75 7.15-.7z';
const starSvg = (fill: string, s: number, stroke = 'none', sw = 0) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"><path d="${STAR}"/></svg>`;

const fmt = (n: number) => (n < 1000 ? String(Math.round(n)) : `${(n / 1000).toFixed(1)}k`);

interface Burst { t: number; n: number; speed: number; from: 'icon' | 'center' }

const proof: SceneDef<ProofProps> = {
  id: 'proof',
  async setup({ root, W, H, portrait, entry }, props) {
    const dur = entry.end - entry.start;
    const counterAt = props.counterAt ?? 1.0;
    const countDone = props.countDone ?? 3.0;
    const wallAt = props.wallAt ?? 4.0;
    const collapseAt = props.collapseAt ?? 7.0;
    const target = props.stars ?? 13800;
    const hops = props.hops ?? [wallAt + 0.5, wallAt + 1.0, wallAt + 1.5, wallAt + 2.0, wallAt + 2.5];
    const wallWords = props.wallWordTimes ?? [wallAt + 0.25, wallAt + 0.33, wallAt + 0.41, wallAt + 1.0, wallAt + 1.08];

    // Real captures for the wall, and the two characters for the callback.
    await Promise.all(PLATES.map((d) => img(d.plate!)));
    const cast = props.cast ?? null;
    const [devSprite, edSprite] = cast ? await Promise.all([loadSprite('dev'), loadSprite('editor-happy')]) : [null, null];

    root.style.background = '#000'; // black only for the first frames of the drop; update() makes it white
    // ── background: full-colour wash with drifting highlights and beat rings ──
    const bgWrap = box({ inset: '0', overflow: 'hidden', willChange: 'clip-path' });
    const bg = box({ inset: '0', background: `linear-gradient(120deg, ${C.mint} 0%, ${C.sky1} 34%, ${C.sky2} 62%, ${C.sky3} 100%)` });
    const glowA = box({ left: -W * 0.2, top: -H * 0.4, width: W * 0.9, height: W * 0.9, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 62%)' });
    const glowB = box({ left: W * 0.5, top: H * 0.3, width: W * 0.9, height: W * 0.9, borderRadius: '50%', background: 'radial-gradient(circle, rgba(36,23,72,0.28) 0%, rgba(36,23,72,0) 62%)' });
    bgWrap.append(bg, glowA, glowB);
    root.append(bgWrap);
    const rings = [0, 1, 2].map(() => box({ left: W / 2, top: H / 2, width: 0, height: 0, borderRadius: '50%', border: '3px solid #fff', opacity: '0' }));
    rings.forEach((r) => bgWrap.append(r));

    // ── the wall of pages (3D) ──
    const stage3d = box({ inset: '0', perspective: '1700px' });
    const wall = box({ left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
    stage3d.append(wall);
    root.append(stage3d);
    const COLS = 8, ROWS = 6;
    const PX = PW + 96, PY = PH + 84;
    const all: Design[] = [];
    // Real plates first so they are spread through the hash.
    for (let i = 0; i < DESIGNS.length; i++) all.push(DESIGNS[i]);
    for (const p of PLATES) all.push(p);
    const cardsData: { ix: number; iy: number; d: Design; root: HTMLDivElement }[] = [];
    for (let iy = 0; iy < ROWS; iy++) {
      for (let ix = 0; ix < COLS; ix++) {
        const h = hash(ix, iy, 3);
        // About 40% real captures.
        const d = h < 0.4 ? PLATES[Math.floor(hash(ix, iy, 9) * PLATES.length)] : DESIGNS[Math.floor(hash(ix, iy, 5) * DESIGNS.length)];
        const c = box({ left: -PW / 2, top: -PH / 2, width: PW, height: PH, transformStyle: 'preserve-3d' });
        for (let k = 2; k >= 1; k--) c.append(box({ inset: '0', borderRadius: '22px', background: k === 2 ? '#8DA0C4' : '#C2CDE2', transform: `translateZ(${-k * 4.5}px)` }));
        const shade = box({ left: -60, top: -50, width: PW + 120, height: PH + 120, background: 'radial-gradient(closest-side, rgba(14,32,96,0.42) 0%, rgba(14,32,96,0.22) 55%, rgba(14,32,96,0) 100%)', transform: 'translateZ(-70px)' });
        c.prepend(shade);
        const face = pageFace(d);
        css(face, { boxShadow: 'none' });
        c.append(face);
        wall.append(c);
        cardsData.push({ ix, iy, d, root: c });
      }
    }
    const WW = COLS * PX, WH = ROWS * PY;
    // Portrait: the 8000 px sweep plane, tilted under the portrait camera, projected so large that Chrome left the frame
    // half drawn (a white top at 0:53.3, blank cards in another render). There it only covers the wall, with the
    // band the same 960 px wide.
    const SWP = portrait ? Math.max(WW, WH) + 1600 : 8000;
    const sweep = box({ left: -SWP / 2, top: -SWP / 2, width: SWP, height: SWP, transform: 'translateZ(6px)', pointerEvents: 'none', opacity: '0' });
    sweep.style.background = portrait
      ? 'linear-gradient(112deg, rgba(255,255,255,0) calc(50% - 480px), rgba(255,255,255,0.38) 50%, rgba(255,255,255,0) calc(50% + 480px))'
      : 'linear-gradient(112deg, rgba(255,255,255,0) 44%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0) 56%)';
    wall.append(sweep);
    const holder = box({ left: 0, top: 0, width: 0, height: 0, transformStyle: 'preserve-3d' });
    const ebox = new EditBox(holder, '', { width: 6, radius: 26, tagSize: 34 });
    wall.append(holder);
    // Fog: the far end of the wall melts into the wash.
    const fog = box({ left: 0, top: 0, right: 0, height: `${H * 0.34}px`, background: `linear-gradient(180deg, ${C.mint} 0%, ${C.mint}CC 35%, ${C.mint}00 100%)`, pointerEvents: 'none' });
    root.append(fog);
    const veil = box(portrait
      ? { left: 0, top: 0, right: 0, height: `${H * 0.3}px`, background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.6) 70%, rgba(255,255,255,0) 100%)' }
      : { left: 0, top: 0, bottom: 0, width: `${W * (props.veilW ?? 0.7)}px`, background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.45) 76%, rgba(255,255,255,0) 100%)' });
    root.append(veil);

    // ── words and counter ──
    const openText = props.openLine ?? (portrait ? 'Open\n*source.*' : 'Open *source.*');
    // 16:9: the giant line is as big as 288 px allows inside the 115 px margins.
    // Portrait: as big as 244 px allows for the widest line inside 950 px.
    const widest = (size: number) => Math.max(...openText.split('\n').map((l) => measureHead(l, size)));
    const L = portrait ? Math.min(244, Math.floor((950 / widest(100)) * 100)) : Math.min(288, Math.floor((1690 / measureHead(openText, 100)) * 100));
    const TEXTW = portrait ? Math.ceil(widest(L)) : Math.ceil(measureHead(openText, L)); // width of the giant line
    const LOCK_W = Math.round(TEXTW * 1.08);
    const lock = box({ left: 0, top: 0, width: LOCK_W, height: portrait ? 560 : 300, transformOrigin: '0 0' });
    const openH = new Headline(lock, { text: openText, size: L, color: C.ink, lineHeight: 0.98, align: portrait ? 'left' : 'center', maxWidth: LOCK_W });
    openH.place({ left: '0px', top: '0px', width: `${LOCK_W}px` });
    root.append(lock);
    const licence = props.licence ?? false;
    const pill = !licence ? null : box({ left: 0, top: 0, height: 96, padding: '0 40px 0 32px', borderRadius: '48px', background: '#fff', boxShadow: SHADOW.lg, display: 'flex', alignItems: 'center', gap: '16px', font: `600 46px ${FONT.ui}`, color: C.navy, whiteSpace: 'nowrap', transformOrigin: '0 0' },
      el('span', { html: `<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="${C.orange}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 8h14M5 8l-2 6a3 3 0 0 0 4 0L5 8zM19 8l-2 6a3 3 0 0 0 4 0l-2-6z"/></svg>`, style: { display: 'flex' } }),
      el('span', { text: licence }));
    if (pill) root.append(pill);

    // Star button (GitHub-style, no logo).
    const BW = portrait ? 930 : 1240, BH = portrait ? 210 : 262;
    const btn = box({ left: 0, top: 0, width: BW, height: BH, borderRadius: `${BH * 0.2}px`, background: '#fff', boxShadow: SHADOW.xl, border: '5px solid rgba(255,255,255,0.9)', overflow: 'hidden', display: 'flex', transformOrigin: '50% 50%' });
    const segL = box({ left: 0, top: 0, width: BW * (portrait ? 0.42 : 0.4), height: BH, background: '#F3F5F8', borderRight: '5px solid #D8DEE6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${BH * 0.1}px` });
    const starIcon = el('span', { style: { display: 'flex', width: `${BH * 0.44}px`, height: `${BH * 0.44}px`, transformOrigin: '50% 50%' } });
    starIcon.innerHTML = starSvg('none', BH * 0.44, '#57606A', 1.7);
    const starFill = el('span', { style: { position: 'absolute', left: '0', top: '0', display: 'flex', opacity: '0', transformOrigin: '50% 50%' } });
    starFill.innerHTML = starSvg('url(#sg)', BH * 0.44);
    const starWrap = box({ position: 'relative', width: BH * 0.44, height: BH * 0.44, left: 'auto', top: 'auto' } as any, starIcon, starFill);
    css(starWrap, { position: 'relative' });
    const starLabel = el('span', { text: 'Star', style: { font: `600 ${BH * 0.3}px ${FONT.ui}`, color: '#24292F' } });
    segL.append(starWrap, starLabel);
    const segR = box({ left: BW * (portrait ? 0.42 : 0.4), top: 0, right: 0, height: BH, display: 'flex', alignItems: 'center', justifyContent: 'center' });
    const count = el('span', { text: '0', style: { font: `600 ${BH * 0.62}px ${FONT.head}`, letterSpacing: '-0.035em', color: C.ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } });
    segR.append(count);
    btn.append(segL, segR);
    root.append(btn);
    // Gradient def for the filled star.
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
    defs.innerHTML = `<defs><linearGradient id="sg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC53D"/><stop offset="1" stop-color="${C.orange}"/></linearGradient></defs>`;
    css(defs as any, { position: 'absolute' });
    root.append(defs);

    // The number lives once, in the star button. The caption finishes the sentence under it; "GitHub." gets an
    // orange underline in ink, so the emphasis stays readable on the aqua wash (orange text is about 2.5:1 there).
    const cap = new Headline(root, { text: portrait ? 'stars on\n*GitHub.*' : 'stars on *GitHub.*', size: portrait ? 124 : 128, color: C.ink, lineHeight: 1.0, align: 'center' });
    for (const w of cap.words) {
      if (w.inner.style.backgroundImage) {
        css(w.inner, { backgroundImage: 'none', webkitBackgroundClip: 'border-box', backgroundClip: 'border-box', color: C.navy, webkitTextFillColor: C.navy, textDecorationLine: 'underline', textDecorationColor: C.orange, textDecorationThickness: '0.075em', textUnderlineOffset: '0.12em', textDecorationSkipInk: 'none' } as any);
      }
    }
    // Wall words.
    const WS = props.wallSize ?? 108;
    const WT = props.wallTop ?? H * 0.34;
    const wl = new Headline(root, { text: props.wallLine ?? 'Built for Developers.\n*And Content Editors.*', size: portrait ? props.wallSize ?? 100 : WS, color: C.ink, lineHeight: 1.02, align: 'left' });
    // The callback: the same two characters from the story, now both happy, under the wall words.
    const CARD = props.castSize ?? 250;
    const devCard = devSprite ? new CharacterCard(root, devSprite, CARD) : null;
    const edCard = edSprite ? new CharacterCard(root, edSprite, CARD) : null;

    // ── particles ──
    const bursts: Burst[] = [
      { t: counterAt, n: 12, speed: 800, from: 'icon' }, { t: counterAt + 0.5, n: 14, speed: 880, from: 'icon' },
      { t: counterAt + 1.0, n: 18, speed: 960, from: 'icon' }, { t: counterAt + 1.5, n: 22, speed: 1040, from: 'icon' },
      { t: countDone, n: 70, speed: 1500, from: 'center' },
    ];
    const pal = ['#ffffff', '#ffffff', C.orange, C.orange400, '#FFC53D', '#FFE08A'];
    const parts: { b: number; k: number; el: HTMLElement; size: number }[] = [];
    const partLayer = box({ inset: '0', pointerEvents: 'none' });
    const sparkLayer = box({ inset: '0', pointerEvents: 'none' });
    bursts.forEach((b, bi) => {
      for (let k = 0; k < b.n; k++) {
        const size = lerp(34, 96, hash(bi, k, 4));
        const e = el('span', { html: starSvg(pal[Math.floor(hash(bi, k, 6) * pal.length)], size), style: { position: 'absolute', left: '0', top: '0', display: 'flex', opacity: '0', willChange: 'transform' } });
        partLayer.append(e);
        parts.push({ b: bi, k, el: e, size });
      }
    });
    // Sparkles that float over the wall, and fly into the centre at the end.
    const NS = 22;
    const sparks: { el: HTMLElement; x: number; y: number; s: number; col: string }[] = [];
    for (let i = 0; i < NS; i++) {
      const s = lerp(22, 60, hash(i, 2));
      const col = pal[Math.floor(hash(i, 8) * pal.length)];
      const e = el('span', { html: starSvg(col, s), style: { position: 'absolute', left: '0', top: '0', display: 'flex', opacity: '0', willChange: 'transform' } });
      sparkLayer.append(e);
      sparks.push({ el: e, x: lerp(0.04, 0.96, hash(i, 1)) * W, y: lerp(0.08, 0.92, hash(i, 3)) * H, s, col });
    }
    root.insertBefore(sparkLayer, lock);
    root.insertBefore(partLayer, lock); // the bursts sit behind every word and the button

// The closing wipe is a full-frame white layer revealed by a clip-path circle. (A 10 px circle scaled up 600x made
    // huge raster tiles, and some of them came back black in the frozen-build capture path.)
    const bloom = box({ inset: '0', background: '#fff', pointerEvents: 'none', opacity: '0' });
    root.append(bloom);

    // ── layout ──
    // The header keeps the cap height of the 288 px line at 0.4 and is never wider than 900 px.
    const lockFinal = portrait ? { x: 65, y: 292, s: (0.46 * 244) / L } : { x: 115, y: props.lockTop ?? 72, s: Math.min((0.4 * 288) / L, 900 / TEXTW) };
    const lockY0 = portrait ? 330 : 501 - L * 0.49; // the giant line's top, centred where the 288 px line sat
    const lockStart = portrait ? { x: (W - TEXTW) / 2, y: 560, s: 1 } : { x: 0, y: 0, s: 1 };
    const centerY = portrait ? 800 : 535;

    // Wall camera.
    const camWall = portrait ? { cx: W / 2, cy: 1120, s: 0.78, rx: 56, rz: -30 } : { cx: W * 0.6, cy: 640, s: 0.84, rx: 56, rz: -31 };
    const V: [number, number] = [-250, 150]; // plane px per second

    const posOf = (ix: number, iy: number, t: number): [number, number] => {
      const sx = V[0] * Math.max(0, t - wallAt + 0.4), sy = V[1] * Math.max(0, t - wallAt + 0.4);
      const wx = ((((ix * PX - sx + WW / 2) % WW) + WW) % WW) - WW / 2;
      const wy = ((((iy * PY - sy + WH / 2) % WH) + WH) % WH) - WH / 2;
      return [wx, wy];
    };
    // Hop targets (plane px, relative to the camera centre) and the card each hop picks.
    // Picked from screen points (right of the text column) mapped back onto the tilted plane.
    const planeAt = (sx: number, sy: number): [number, number] => {
      const k = camWall.s * Math.cos((camWall.rx * Math.PI) / 180);
      const xp = (sx - camWall.cx) / camWall.s, yp = (sy - camWall.cy) / k;
      const th = (camWall.rz * Math.PI) / 180;
      return [xp * Math.cos(th) + yp * Math.sin(th), -xp * Math.sin(th) + yp * Math.cos(th)];
    };
    const hopPts: [number, number][] = portrait
      ? [[560, 1020], [720, 1180], [400, 920], [650, 840], [520, 1120]]
      : [[1500, 560], [1250, 780], [1660, 840], [1360, 450], [1520, 700]];
    const targets: [number, number][] = hopPts.map(([x, y]) => planeAt(x, y));
    const hopCards = hops.map((T, k) => {
      const [tx, ty] = targets[k % targets.length];
      let best = 0, bd = Infinity;
      cardsData.forEach((c, i) => {
        const [x, y] = posOf(c.ix, c.iy, T);
        const d = Math.hypot(x - tx, y - ty);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    });

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = 0.08;
        f.post.grain = 0.06;
        // The drop: the wash expands out of black. No white flash on the drop or on the wall: it read as a bug.
        // The circle starts a little open, so the cut from the dark scene never shows a black frame.
        const flood = ease.outExpo(seg(t, -0.03, 0.42));
        css(bgWrap, { clipPath: `circle(${(flood * 150).toFixed(2)}% at 50% 50%)` });
        css(glowA, { transform: `translate(${(noise1(t * 0.25, 2) * 120).toFixed(1)}px, ${(noise1(t * 0.2, 3) * 80).toFixed(1)}px)` });
        css(glowB, { transform: `translate(${(noise1(t * 0.22, 5) * 140).toFixed(1)}px, ${(noise1(t * 0.18, 6) * 90).toFixed(1)}px)` });
        // Beat rings from the last three kicks.
        const hitsK = f.audio.hits('kick');
        let li = hitsK.length - 1;
        while (li >= 0 && hitsK[li] > f.t) li--;
        rings.forEach((r, i) => {
          const th = hitsK[li - i];
          const age = th == null ? 9 : f.t - th;
          const a = age >= 0 && age < 1.0 && t > 0.1 ? 1 - age : 0;
          const R = 200 + ease.outCubic(clamp(age / 1.0)) * W * 0.9;
          css(r, { opacity: a * 0.22, width: R, height: R, left: W / 2 - R / 2, top: centerY - R / 2 });
        });

        const cl = seg(t, collapseAt, dur - 0.05);
        const c = cl; // linear 0..1 for fades
        const ce = ease.inOutCubic(cl);

        // ── Phase 1: "Open source." giant, then it moves up ──
        const shrink = spring(t - counterAt, 2.4, 0.78);
        const ls = lerp(lockStart.s, lockFinal.s, clamp(shrink));
        const textInset = portrait ? 0 : ((LOCK_W - TEXTW) / 2) * lockFinal.s;
        const lockX = lerp(W / 2, lockFinal.x - textInset, clamp(shrink));
        const lockY = lerp(lockY0, lockFinal.y, clamp(shrink));
        // The lock box has origin top-left; centre it while giant by offsetting half its width.
        const lockW = LOCK_W;
        const cxOff = lerp(-lockW / 2, 0, clamp(shrink));
        // The count, its button and its caption are gone before the wall lands, so the wall never shows through them.
        const exitOpen = ease.inCubic(seg(t, wallAt - 0.3, wallAt - 0.06));
        css(lock, { transform: `translate(${(lockX + cxOff * ls).toFixed(1)}px, ${lockY.toFixed(1)}px) scale(${ls.toFixed(4)})`, opacity: (1 - exitOpen) * (1 - clamp(c * 4)) });
        openH.update(t, { in: 0.0, times: portrait ? [0.0, 0.2] : [0.0, 0.2], dur: 0.45, mode: 'rise' });
        // The licence pill (only when one is named) pops at 0.5 under the giant line, then sits beside the small lockup.
        const pillIn = spring(t - 0.5, 3.2, 0.5);
        const shrinkP = clamp(spring(t - counterAt - 0.07, 2.4, 0.78));
        const pillX = lerp(portrait ? W / 2 - 190 : W / 2 - 215, portrait ? 65 : lockFinal.x + TEXTW * lockFinal.s + 40, shrinkP);
        const pillY = lerp(portrait ? 330 + 2 * L * 0.98 + 24 : lockY0 + L * 0.98 + 40, portrait ? lockFinal.y + 2 * L * 0.98 * lockFinal.s + 24 : lockFinal.y + 14, shrinkP);
        if (pill) css(pill, { transform: `translate(${pillX.toFixed(1)}px, ${pillY.toFixed(1)}px) scale(${(Math.max(0, pillIn) * lerp(1.15, 0.92, shrinkP)).toFixed(4)})`, opacity: t >= 0.5 ? (1 - exitOpen) * (1 - clamp(c * 4)) : 0 });

        // ── Phase 2: the star counter ──
        const bIn = spring(t - counterAt, 2.6, 0.62);
        const cp = seg(t, counterAt, countDone, ease.outCubic);
        const n = Math.round((target * cp) / 100) * 100;
        const landed = t >= countDone;
        const exitBtn = ease.inCubic(seg(t, wallAt - 0.3, wallAt - 0.06));
        const kick = f.audio.pulse('kick', f.t, 11);
        const landPulse = landed ? Math.exp(-(t - countDone) * 9) : 0;
        const by = lerp(H + BH, centerY - BH * 0.1, clamp(bIn)) + exitBtn * -40;
        const bs = (1 + 0.02 * kick + 0.07 * landPulse) * lerp(1, 1.25, exitBtn) * (1 - clamp(c * 3));
        css(btn, { transform: `translate(${(W / 2 - BW / 2).toFixed(1)}px, ${(by - BH / 2).toFixed(1)}px) scale(${bs.toFixed(4)})`, opacity: (t >= counterAt - 0.02 ? 1 : 0) * (1 - exitBtn), filter: exitBtn > 0 ? `blur(${(exitBtn * 12).toFixed(1)}px)` : 'none' });
        const txt = landed ? fmt(target) : fmt(n);
        if (count.textContent !== txt) count.textContent = txt;
        const sw = Math.max(0, spring(t - countDone, 3.2, 0.4));
        css(starFill, { opacity: landed ? 1 : 0, transform: `scale(${(landed ? sw * 1.0 : 0).toFixed(3)}) rotate(${landed ? ((1 - Math.min(1, sw)) * -40).toFixed(1) : 0}deg)` });
        css(starIcon, { opacity: landed ? 0 : 1 });
        const lab = landed ? 'Starred' : 'Star';
        if (starLabel.textContent !== lab) starLabel.textContent = lab;

        // Caption.
        cap.place({ left: `${portrait ? 65 : 0}px`, top: `${portrait ? centerY + BH * 0.5 + 60 : centerY + BH * 0.5 + 64}px`, width: `${portrait ? W - 130 : W}px` });
        cap.update(t, { in: countDone, times: portrait ? [countDone, countDone + 0.1, countDone + 0.2, countDone + 0.3] : [countDone, countDone + 0.1, countDone + 0.2, countDone + 0.3], dur: 0.4, out: wallAt - 0.3, outDur: 0.2 });

        // Star bursts.
        for (const p of parts) {
          const b = bursts[p.b];
          const age = t - b.t;
          const life = p.b === bursts.length - 1 ? 1.5 : 1.0;
          if (age < 0 || age > life) { css(p.el, { opacity: 0 }); continue; }
          const ang = hash(p.b, p.k, 1) * Math.PI * 2;
          const sp = b.speed * lerp(0.35, 1, hash(p.b, p.k, 2));
          const drag = 3.0;
          const dd = (1 - Math.exp(-age * drag)) / drag;
          const ox = b.from === 'icon' ? W / 2 - BW / 2 + BW * 0.2 : W / 2;
          const oy = b.from === 'icon' ? centerY : centerY;
          const x = ox + Math.cos(ang) * sp * dd;
          const y = oy + Math.sin(ang) * sp * dd + 380 * age * age * (b.from === 'center' ? 0.9 : 0.5);
          const k2 = Math.pow(clamp(1 - age / life), 0.55);
          const sc = k2 * lerp(0.7, 1.15, hash(p.b, p.k, 3));
          css(p.el, { opacity: clamp((life - age) * 5) * (1 - exitBtn * 0.5), transform: `translate(${(x - p.size / 2).toFixed(1)}px, ${(y - p.size / 2).toFixed(1)}px) rotate(${(hash(p.b, p.k, 7) * 360 + age * (hash(p.b, p.k, 9) - 0.5) * 700).toFixed(1)}deg) scale(${sc.toFixed(3)})` });
        }

        // ── Phase 3: the wall ──
        const wIn = clamp((t - wallAt + 0.02) / 0.5);
        const wE = ease.outExpo(clamp((t - wallAt) / 0.9));
        const col = lerp(2.6, 1, wE);
        const cs = camWall.s * col * (1 - 0.97 * ease.inCubic(clamp(cl * 1.02)));
        const rzw = camWall.rz + (1 - wE) * 26 + ce * 70 + noise1(t * 0.3, 7) * 1.2;
        const rxw = camWall.rx - (1 - wE) * 18;
        // The wall fades while it shrinks, so it is gone before the white bloom covers the centre.
        const wallFade = 1 - ease.inQuad(seg(t, collapseAt + 0.3, collapseAt + 0.7));
        // Portrait fades each card, not the 3D container: opacity on the container flattens the whole tilted wall into
        // one surface, too large under the portrait camera, and a capture caught it half drawn (white at 0:53.3).
        const groupFade = portrait ? 1 : wallFade, cardFade = portrait ? wallFade : 1;
        css(stage3d, { perspectiveOrigin: `${camWall.cx}px ${camWall.cy}px`, opacity: wIn > 0 ? groupFade : 0 });
        css(wall, { transform: `translate3d(${camWall.cx}px, ${camWall.cy}px, 0) rotateX(${rxw.toFixed(3)}deg) rotateZ(${rzw.toFixed(3)}deg) scale(${cs.toFixed(4)})` });
        cardsData.forEach((cd) => {
          const [x, y] = posOf(cd.ix, cd.iy, t);
          const dist = Math.hypot(x, y);
          // Cards far from the camera centre dissolve with the fog.
          const seam = clamp((WH / 2 - Math.abs(y)) / 260) * clamp((WW / 2 - Math.abs(x)) / 260);
          const a = clamp(1.9 - dist / 2500) * seam * (wIn > 0 ? 1 : 0) * cardFade;
          const lift = 18 * Math.sin((cd.ix * 0.9 + cd.iy * 1.3) + t * 1.4);
          css(cd.root, { transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${lift.toFixed(1)}px)`, opacity: a, visibility: a > 0.01 ? 'visible' : 'hidden' });
        });
        // Light sweep across the wall, once per bar.
        const sp2 = ((t - wallAt) / 1.0) % 1;
        css(sweep, { opacity: (t > wallAt ? 1 : 0) * cardFade, transform: `translateZ(6px) translateX(${(lerp(-2600, 2600, sp2)).toFixed(1)}px)` });

        // The edit box hops between pages on beats.
        let cur = -1, prev = -1, hopT = 0;
        hops.forEach((T, k) => { if (t >= T) { prev = cur; cur = hopCards[k]; hopT = T; } });
        if (cur >= 0) {
          const [x1, y1] = posOf(cardsData[cur].ix, cardsData[cur].iy, t);
          let bx = x1, by2 = y1, bw = PW, bh = PH;
          const hp = spring(t - hopT, 3.4, 0.6);
          if (prev >= 0) {
            const [x0, y0] = posOf(cardsData[prev].ix, cardsData[prev].iy, t);
            bx = lerp(x0, x1, hp); by2 = lerp(y0, y1, hp);
          } else { bw *= lerp(1.6, 1, clamp(hp)); bh *= lerp(1.6, 1, clamp(hp)); }
          ebox.setLabel(cardsData[hp > 0.45 || prev < 0 ? cur : prev].d.name);
          css(holder, { transform: `translate3d(${bx.toFixed(1)}px, ${by2.toFixed(1)}px, 14px)`, display: '' });
          ebox.update({ x: -bw / 2, y: -bh / 2, w: bw, h: bh }, clamp((t - hops[0]) * 8) * (1 - clamp(c * 3)), Math.max(f.audio.pulse('kick', f.t, 9) * 0.35, Math.exp(-(t - hopT) * 10) * 0.9), true);
        } else css(holder, { display: 'none' });

        // Words over the wall: veil, then the lines.
        const veilA = ease.outCubic(seg(t, wallAt + 0.1, wallAt + 0.6)) * (1 - clamp(c * 3));
        css(veil, { opacity: veilA });
        css(fog, { opacity: wIn * (1 - clamp(c * 3)) });
        wl.place(portrait ? { left: '65px', top: `${props.wallTop ?? 292}px` } : { left: `${115}px`, top: `${WT}px` });
        wl.update(t, { in: wallAt, times: wallWords, dur: 0.42, out: collapseAt - 0.1, outDur: 0.2 });
        if (cast && devCard && edCard) {
          // Under the words, on the white veil: they pop in on their beats and leave with the words.
          const y0 = WT + 2 * WS * 1.02 + 70 + CARD / 2;
          const x0 = portrait ? (W - (2 * CARD + 56)) / 2 + CARD / 2 : 115 + CARD / 2;
          devCard.place(x0, y0 + noise1(t * 0.6, 21) * 3, CARD, -4, CharacterCard.pop(t, cast[0], collapseAt - 0.1), 1, 9, false);
          edCard.place(x0 + CARD + 56, y0 + noise1(t * 0.6, 22) * 3, CARD, 4, CharacterCard.pop(t, cast[1], collapseAt - 0.1), 1, 9, false);
        }

        // Sparkles over the wall; they fly into the centre with the collapse.
        sparks.forEach((s, i) => {
          const on = clamp((t - (wallAt + 0.1 + hash(i, 4) * 0.5)) * 4);
          const fx = s.x + noise1(t * 0.5 + i, i) * 40;
          const fy = s.y + noise1(t * 0.45 + i * 3, i + 9) * 40 - (t - wallAt) * 20;
          const cc = ease.inCubic(clamp((cl - hash(i, 5) * 0.3) / 0.7));
          const x = lerp(fx, W / 2, cc), y = lerp(fy, centerY, cc);
          const tw = 0.7 + 0.3 * Math.sin(t * 6 + i * 2);
          css(s.el, { opacity: on * tw * (1 - ease.inQuad(clamp((cc - 0.85) / 0.15))) * (t > wallAt ? 1 : 0), transform: `translate(${(x - s.s / 2).toFixed(1)}px, ${(y - s.s / 2).toFixed(1)}px) rotate(${(t * 40 * (hash(i, 6) - 0.5) + i * 20).toFixed(1)}deg) scale(${lerp(1, 0.2, cc).toFixed(3)})` });
        });

        // The collapse ends in a bloom of white at the centre.
        const bl = ease.inQuad(seg(t, collapseAt + 0.45, dur - 0.1));
        const far = Math.hypot(Math.max(W / 2, W / 2), Math.max(centerY, H - centerY)) + 8; // farthest corner from the circle centre
        const R = bl * far * 1.25;
        const covered = R >= far;
        if (covered) css(bloom, { opacity: 1, clipPath: 'none' });
        else css(bloom, { opacity: bl > 0 ? 1 : 0, clipPath: `circle(${R.toFixed(1)}px at ${W / 2}px ${centerY}px)` });
        // A few frames after the white covers everything, drop the heavy 3D layers. Never in the same frame as the
        // bloom change: a capture once caught that frame half-composited (a tiny wall on white at 0:55).
        const gone = bl >= 1;
        css(stage3d, { display: gone ? 'none' : '' });
        css(bgWrap, { display: gone ? 'none' : '' });
        css(root, { background: t < 0.45 ? '#000' : '#fff' });
      },
    };
  },
};

export default proof;
