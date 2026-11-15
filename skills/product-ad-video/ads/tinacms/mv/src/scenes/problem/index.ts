// Scene `problem` (anthem 8-18 s, 10 s): relatable pain, with humour and two animated characters.
// Developers love Markdown (the developer, proud). Content Editors? Not as much: a raw file, a YAML error and
// a stressed content editor, while requests pile up on the developer. Then Peek-Llama rises with the answer,
// and the cursor clicks its speech bubble: the next scene opens as an iris from that click.
import type { SceneDef } from '../../engine/stage';
import { box, css, setText, tf } from '../../engine/dom';
import { ease, lerp, noise1, pulseSince, seg, spring, typed } from '../../engine/anim';
import { img } from '../../engine/assets';
import { Code } from '../../ui/code';
import { Headline } from '../../ui/text';
import { Cursor, WashBg, Win, bubble, image, pathAt } from '../../ui/kit';
import { CharacterCard, loadSprite, poseAt } from '../../ui/character';
import { FONT } from '../../brand/fonts';
import { C, SHADOW, SYN } from '../../brand/tokens';
import { BAD, MD_LINES, RawWindow, SEL, clickRipple, ghostCard, indentOf, speechBubble } from './parts';

export interface ProblemProps {
  /** The headline swaps to "Content editors? Not so much." and the raw page slides in (default 2.5). */
  editorsAt?: number;
  /** First chat bubble (default 4.0). */
  bubblesAt?: number;
  /** Seconds between the chat bubbles (default 0.5, one per beat). */
  bubbleEvery?: number;
  /** Peek-Llama rises over the bottom edge (default 7.0). */
  llamaAt?: number;
  /** The cursor clicks the llama's speech bubble (default 9.3). */
  clickAt?: number;
  /** What the llama says; `*emphasis*` is orange, \n breaks the line. */
  llamaLine?: string;
  /** The open scene shrinks into the developer's window (anthem round 8, no title): the window is in place from the
   *  first frame, no faded page, the vignette eases from the open's, and the first headline waits for the shrink. */
  fromOpen?: boolean;
}

const BUBBLES = [
  { who: 'Marketing', text: 'can you change the homepage headline? \u{1F64F}', col: C.orange },
  { who: 'Content team', text: 'typo on the pricing page', col: C.blue },
  { who: 'Sales', text: 'new hero image?', col: C.navy2 },
  { who: 'Founder', text: 'is the blog post live yet?', col: C.blue600 },
];

const problem: SceneDef<ProblemProps> = {
  id: 'problem',
  async setup({ root, W, H, portrait }, props) {
    const fromOpen = props.fromOpen ?? false;
    const editorsAt = props.editorsAt ?? 2.5;
    const bubblesAt = props.bubblesAt ?? 4.0;
    const every = props.bubbleEvery ?? 0.5;
    const llamaAt = props.llamaAt ?? 7.0;
    const clickAt = props.clickAt ?? 9.3;
    const savedAt = 1.5;
    // The content editor's clicks in the raw file: she clicks the headline line, an extra space slips in, YAML breaks.
    const ed = { caret: editorsAt + 1.05, slip: editorsAt + 1.2, squig: editorsAt + 1.35, banner: editorsAt + 1.5, drag: editorsAt + 2.1, clear: editorsAt + 3.65 };
    // The characters act with the picture (strip indices: 0 typing, 1 reaction).
    // The developer types while his last line types, then gives a thumbs-up as "Saved" lands, and holds it.
    // The content editor types her change, then screams as the YAML error lands, and holds it.
    const devCardIn = 0.5, edCardIn = editorsAt + 0.5;
    const devKeys: [number, number][] = [[devCardIn, 0], [savedAt, 1]];
    const edKeys: [number, number][] = [[edCardIn, 0], [ed.banner, 1]];

    await img('/assets/llama/Peek-Llama.png');
    const [devSprite, stressedSprite] = await Promise.all([loadSprite('dev'), loadSprite('editor-stressed')]);

    // ── layout ──────────────────────────────────────────────────────────
    const L = portrait
      ? {
          head: { size: 100, top: 380, w: W },
          win: { w: 950, devH: 430, rawH: 440 },
          dev: { x: 65, y: 620 },
          raw: { x: 65, y: 810 },
          S: 26,
          bub: { size: 24, bottom: 1050, left: 65, right: W - 65, anchorRight: true, offs: [0, 36, 8, 44] },
          // Character cards: [cx, cy, size, rotation]. `devBig` beside the centred dev window, `dev` docked on its corner.
          // Portrait: the cards live in the band under the windows, clear of the chat bubbles, and fill it.
          cards: { devBig: [W / 2, 1330, 340, -4], dev: [260, 1420, 300, -5], stressed: [820, 1420, 300, 4] },
          llama: { s: 0.5, left: 60, wallY: 1500 },
          answer: 46,
          status: false,
        }
      : {
          // The headline sits a little lower than the title-safe line: the DOG holds the top-left corner.
          head: { size: 104, top: 116, w: W },
          win: { w: 850, devH: 480, rawH: 480 },
          dev: { x: 100, y: 360 },
          raw: { x: 970, y: 360 },
          S: 24,
          bub: { size: 25, bottom: 850, left: 128, right: 0, anchorRight: false, offs: [0, 70, 16, 88] },
          cards: { devBig: [270, 610, 330, -4], dev: [118, 342, 200, -5], stressed: [1782, 336, 250, 4] },
          // Round 8: the answer is twice the size (84 px, was 42; a reviewer: "this is important"), so the llama moves
          // left to make room for it on its right.
          llama: { s: 0.46, left: 240, wallY: H - 62 },
          answer: 84,
          status: true,
        };
    const lh = L.S * 1.6;

    root.style.background = '#000';
    const world = box({ inset: '0', transformOrigin: '50% 50%', overflow: 'hidden' });
    root.append(world);
    const bg = new WashBg(world, W, H, { base: '#fff', strength: 1.15 });
    const ghost = ghostCard(world, W, H, portrait);

    // ── the developer's window (dark, Markdown, happy) ──────────────────
    const devG = box({ left: '0', top: '0', width: `${L.win.w}px`, height: `${L.win.devH}px` });
    const devWin = new Win(devG, { w: L.win.w, h: L.win.devH, dark: true, title: 'content/pages/home.mdx' });
    const body = devWin.body;
    const gut = box({ left: '20px', top: '22px', width: `${L.S * 1.6}px`, font: `400 ${L.S}px/1.6 ${FONT.mono}`, color: SYN.gutter, textAlign: 'right', whiteSpace: 'pre' });
    gut.textContent = MD_LINES.map((_, i) => String(i + 1)).join('\n');
    const curLine = box({ left: '0', right: '0', top: `${22 + (MD_LINES.length - 2) * lh}px`, height: `${lh}px`, background: 'rgba(255,255,255,0.045)' });
    const MD = MD_LINES.join('\n');
    // The developer types the last two lines (the last value and the closing fence).
    const lastLine = MD_LINES.slice(-2).join('\n');
    const dcode = new Code(body, { code: MD, lang: 'md', size: L.S, lineHeight: 1.6 });
    css(dcode.pre, { left: `${L.S * 3.1}px`, top: '22px' });
    body.append(gut, curLine);
    body.insertBefore(curLine, dcode.pre);
    if (L.status) {
      const sb = box({ left: '0', right: '0', bottom: '0', height: '40px', background: SYN.panel, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px', font: `500 16px ${FONT.ui}`, color: SYN.dim });
      sb.innerHTML = '<span>main</span><span>Markdown</span>';
      body.append(sb);
    }
    const chip = box({
      right: '22px', top: '12px', height: '28px', padding: '0 13px', borderRadius: '14px', background: 'rgba(147,233,190,0.16)', border: '1px solid rgba(147,233,190,0.55)',
      color: C.seafoam, font: `600 15px ${FONT.ui}`, display: 'flex', alignItems: 'center', gap: '6px', transformOrigin: '100% 50%',
    });
    chip.innerHTML = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 4.5" stroke="#93E9BE" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Saved</span>';
    devWin.root.append(chip);
    // Big happy tick on the window corner (readable with the sound off).
    const tickD = portrait ? 76 : 84;
    const tick = box({ left: `${L.win.w - tickD * 0.62}px`, top: `${L.win.devH - tickD * 0.62}px`, width: `${tickD}px`, height: `${tickD}px`, borderRadius: '50%', background: C.seafoam, border: '5px solid #fff', boxShadow: SHADOW.md, display: 'grid', placeItems: 'center', zIndex: '3' });
    tick.innerHTML = `<svg width="${tickD * 0.5}" height="${tickD * 0.5}" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 4.5" stroke="${C.seafoam900}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    devG.append(tick);
    // The unread badge that counts the requests.
    const badgeD = portrait ? 56 : 64;
    const badge = box({ left: `${L.win.w - badgeD * 0.55}px`, top: `${-badgeD * 0.45}px`, width: `${badgeD}px`, height: `${badgeD}px`, borderRadius: '50%', background: '#EF4444', border: '5px solid #fff', boxShadow: SHADOW.md, color: '#fff', font: `700 ${badgeD * 0.46}px ${FONT.ui}`, display: 'grid', placeItems: 'center', zIndex: '4' });
    devG.append(badge);
    world.append(devG);

    // ── the editor's window (light, raw text, lost) ─────────────────────
    const rawG = new RawWindow(world, L.win.w, L.win.rawH, L.S);

    // ── chat bubbles (the requests) ─────────────────────────────────────
    const bubs = BUBBLES.map((b) => bubble(world, b.text, b.who, L.bub.size, b.col));
    bubs.forEach((b) => css(b, { zIndex: '8', visibility: 'hidden' }));
    const rots = [-1.4, 1.1, -0.9, 1.5];
    let bm: { w: number; h: number }[] | null = null;

    // ── the people: the developer (happy with Markdown), the content editor (stressed by it) ──
    const devCard = new CharacterCard(world, devSprite, L.cards.devBig[2]);
    const edCard = new CharacterCard(world, stressedSprite, L.cards.stressed[2]);
    css(devCard.root, { zIndex: '7' });
    css(edCard.root, { zIndex: '7' });

    // ── the veil, the headlines and Peek-Llama ──────────────────────────
    const veil = box({ inset: '0', background: 'rgba(238,244,252,0.62)', opacity: '0', zIndex: '10' });
    world.append(veil);
    const h1 = new Headline(world, { text: portrait ? 'Developers love\n*Markdown.*' : 'Developers love *Markdown.*', size: L.head.size, color: C.ink, align: 'center' });
    h1.place({ left: '0', width: `${W}px`, top: `${L.head.top}px`, zIndex: '12' });
    const h2 = new Headline(world, { text: portrait ? 'Content Editors?\n*Not as much.*' : 'Content Editors? *Not as much.*', size: L.head.size, color: C.ink, align: 'center' });
    h2.place({ left: '0', width: `${W}px`, top: `${L.head.top}px`, zIndex: '12' });

    const ls = L.llama.s;
    const lw = 1384 * ls, lhgt = 1394 * ls, cutY = 1285 * ls;
    const llTop = L.llama.wallY - cutY;
    const llamaG = box({ inset: '0', zIndex: '14' });
    const wall = box({ left: `${L.llama.left - 70}px`, top: `${L.llama.wallY - 3}px`, width: `${lw + 140}px`, height: `${H}px`, background: '#fff', borderRadius: '30px 30px 0 0', boxShadow: '0 -18px 50px -18px rgba(20,70,150,0.30)', border: '1px solid rgba(15,23,42,0.05)' });
    const llama = image(llamaG, '/assets/llama/Peek-Llama.png', { left: `${L.llama.left}px`, top: `${llTop}px`, width: `${lw}px`, height: `${lhgt}px` });
    llamaG.insertBefore(wall, llama);
    const sbSize = L.answer;
    const sb = speechBubble(llamaG, props.llamaLine ?? 'TinaCMS solves it with\nthe best *Markdown editor.*', sbSize);
    const sbX = L.llama.left + lw * 0.5 + 6;
    // The tail tip stays at the llama's mouth whatever the size: a 2-line body (1.18 line height, 0.42 em padding,
    // 6 px of border) and the tail (1 em) sit above it.
    // 16:9 keeps the tip where the 42 px bubble had it (127 px under the line at 0.4 of the llama); 9:16 is unchanged.
    const tipY = llTop + cutY * 0.4 + (portrait ? sbSize * 2.95 + 3 : 127);
    const sbY = tipY - sbSize * (2 * 1.18 + 2 * 0.42 + 1) - 3;
    world.append(llamaG);
    const riseDist = H - llTop + 40;

    // ── cursor and click ripple ─────────────────────────────────────────
    const ripple = clickRipple(root);
    const cursor = new Cursor(root, 1.6);

    // Cursor path, in stage coordinates.
    const rx = L.raw.x, ry = L.raw.y;
    const colX = (c: number) => rx + rawG.colX(c);
    const lineY = (i: number) => ry + rawG.lineY(i);
    // Where the cursor clicks the speech bubble: its lower-right edge, so the arrow never covers the words.
    // Measured on the first frame (layout needs the scene on screen).
    let sbClick: [number, number] = [sbX + sbSize * 7, sbY + sbSize * 1.6];
    const nLines = MD_LINES.length;
    const badCol = indentOf(MD_LINES[BAD]);
    const selCol = indentOf(MD_LINES[SEL]);
    const selEnd = selCol + MD_LINES[SEL].trim().length;
    const e0 = editorsAt;
    const path = (): [number, number, number][] => [
      [e0 + 0.15, W + 50, lineY(nLines - 1) + 100],
      [e0 + 0.95, colX(badCol) + 6, lineY(BAD) + 6],
      [e0 + 1.6, colX(badCol) + 6, lineY(BAD) + 6],
      [e0 + 2.05, colX(selCol), lineY(SEL)],
      [e0 + 2.1, colX(selCol), lineY(SEL)],
      [e0 + 2.6, colX(selEnd), lineY(SEL)],
      [e0 + 3.05, colX(selEnd) + 5, lineY(SEL) + 2],
      [e0 + 3.65, colX(portrait ? 20 : 30), lineY(nLines - 1)],
      [e0 + 4.2, colX(portrait ? 14 : 24), lineY(nLines) + 14],
      [llamaAt + 1.3, sbClick[0], sbClick[1]],
      [clickAt, sbClick[0], sbClick[1]],
    ];
    let pts = path();
    const clicks = [ed.caret, ed.drag, ed.clear, clickAt];

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = fromOpen ? lerp(0.45, 0.12, ease.inOutCubic(seg(t, 0, 0.5))) : 0.12;
        f.post.grain = 0.05;
        bg.update(f.t);

        // Measure the bubbles once, when the scene is first on screen.
        if (!bm) {
          bm = bubs.map((b) => ({ w: b.offsetWidth, h: b.offsetHeight }));
          sbClick = [sbX + sb.body.offsetWidth * 0.88, sbY + sb.body.offsetHeight - sbSize * 0.3];
          pts = path();
        }

        // The faded page from the title scene goes away under the first window.
        ghost.update(fromOpen ? 0 : 1 - ease.inOutCubic(seg(t, 0, 0.55)));

        // Developer window: flies in, then slides left to make room.
        const devIn = fromOpen ? 1 : ease.snap(seg(t, 0, 0.55));
        const slide = ease.inOutQuint(seg(t, editorsAt, editorsAt + 0.5));
        const introX = portrait ? L.dev.x : (W - L.win.w) / 2;
        const dx0 = lerp(portrait ? -W : -W * 0.55, introX, devIn);
        const dx = lerp(dx0, L.dev.x, slide);
        const ds = portrait ? 1 : lerp(1.18, 1, slide);
        const fl = noise1(t * 0.5, 2) * 3;
        css(devG, { transform: tf({ x: dx, y: L.dev.y + fl, persp: 2400, ry: (1 - devIn) * -22, s: ds }) });

        // Developer window content: types its last line, then the green tick.
        const n0 = MD.length - lastLine.length;
        const nTyped = typed(t, 0.5, 44, lastLine).length;
        dcode.update(n0 + nTyped, nTyped < lastLine.length || Math.floor(t * 4) % 2 === 0);
        const sp = spring(t - savedAt, 3.4, 0.5);
        css(chip, { opacity: t >= savedAt ? 1 : 0, transform: tf({ s: Math.max(0, sp) }) });
        css(tick, { opacity: t >= savedAt ? 1 : 0, transform: tf({ s: Math.max(0, sp) * (1 + 0.1 * pulseSince(t, savedAt + 0.2, 6)) }) });
        const landed = BUBBLES.filter((_, k) => t >= bubblesAt + k * every).length;
        const lastLand = bubblesAt + (landed - 1) * every;
        css(badge, { opacity: landed > 0 ? 1 : 0, transform: tf({ s: landed > 0 ? Math.max(0, spring(t - bubblesAt, 3.4, 0.5)) * (1 + 0.28 * pulseSince(t, lastLand, 9)) : 0 }) });
        setText(badge, String(landed));

        // Raw window slides in from the right.
        const rawIn = ease.snap(seg(t, editorsAt, editorsAt + 0.6));
        const cur = pathAt(t, pts);
        const rx0 = lerp(W + 60, rx, rawIn);
        css(rawG.root, { display: t >= editorsAt ? '' : 'none', transform: tf({ x: rx0, y: ry + noise1(t * 0.45, 7) * 3, persp: 2400, ry: (1 - rawIn) * 22 }) });
        rawG.update(t, { breakAt: ed.slip, squigAt: ed.squig, bannerAt: ed.banner, caretAt: ed.caret, dragFrom: ed.drag, clearAt: ed.clear, selW: cur[0] - colX(selCol) });

        // The developer pops in beside his window, then docks on its corner as the window slides left.
        // Pose times are design time; the bounce and the typing bob run in real time (design time / speed).
        const [bx, by, bsz, br] = L.cards.devBig, [kx, ky, ksz, kr] = L.cards.dev;
        const dp = poseAt(t, devKeys);
        devCard.place(lerp(bx, kx, slide), lerp(by, ky, slide), lerp(bsz, ksz, slide), lerp(br, kr, slide), CharacterCard.pop(t, devCardIn), dp.pose, dp.since / f.audio.speed, dp.changed, dp.pose === 0);
        // The content editor pops in on her window's corner while she makes her change.
        const [sx, sy, ssz, sr] = L.cards.stressed;
        const ep = poseAt(t, edKeys);
        edCard.place(sx, sy + noise1(t * 0.6, 4) * 3, ssz, sr, CharacterCard.pop(t, edCardIn), ep.pose, ep.since / f.audio.speed, ep.changed, ep.pose === 0);

        // Headlines.
        const h1In = fromOpen ? 0.4 : 0.1;
        h1.update(t, { in: h1In, times: [h1In, h1In + 0.1, h1In + 0.2], dur: 0.5, out: editorsAt - 0.15, outDur: 0.18 });
        h2.update(t, { in: editorsAt, times: [editorsAt, editorsAt + 0.12, editorsAt + 0.22, editorsAt + 0.3], dur: 0.5 });

        // The requests pile up on the developer, one every `every` seconds.
        const gap = portrait ? 12 : 18;
        bubs.forEach((b, k) => {
          const tk = bubblesAt + k * every;
          if (t < tk || !bm) { css(b, { visibility: 'hidden' }); return; }
          const p = spring(t - tk, 3.4, 0.55);
          let up = 0;
          for (let j = k + 1; j < bubs.length; j++) if (t >= bubblesAt + j * every) up += (bm[j].h + gap) * spring(t - (bubblesAt + j * every), 3.0, 0.75);
          const x = L.bub.anchorRight ? L.bub.right - bm[k].w - L.bub.offs[k] : L.bub.left + L.bub.offs[k];
          const y = L.bub.bottom - up - bm[k].h;
          css(b, { visibility: 'visible', opacity: Math.min(1, (t - tk) * 12), transform: `${tf({ x: x + (1 - p) * 260, y, s: 0.88 + 0.12 * p })} rotate(${rots[k] * Math.min(1, p)}deg)` });
        });


        // The veil dims the room, Peek-Llama rises, the speech bubble pops.
        css(veil, { opacity: ease.inOutCubic(seg(t, llamaAt - 0.2, llamaAt + 0.35)) });
        const up = Math.max(0, spring(t - llamaAt, 2.5, 0.6));
        css(llamaG, { display: t >= llamaAt ? '' : 'none', transform: tf({ y: (1 - up) * riseDist }) });
        const sbP = Math.max(0, spring(t - (llamaAt + 0.45), 3.4, 0.5));
        css(sb.root, { transform: tf({ x: sbX, y: sbY, s: sbP }), opacity: t >= llamaAt + 0.45 ? 1 : 0 });
        // The cursor finds the answer: the bubble lights up on hover and presses on the click.
        const hover = t >= llamaAt + 1.3;
        const press = 1 - 0.05 * pulseSince(t, clickAt, 10);
        css(sb.body, { borderColor: hover ? C.orange : '#fff', transform: tf({ s: press }) });
        sb.tailEdge.setAttribute('stroke', hover ? C.orange : '#fff');

        // The lost cursor becomes the click that opens the next scene (an iris from this point).
        cursor.update(cur[0], cur[1], t, clicks, t >= e0 + 0.15 ? 1 : 0);
        ripple.update(t, sbClick[0], sbClick[1], clickAt);
      },
    };
  },
};
export default problem;
