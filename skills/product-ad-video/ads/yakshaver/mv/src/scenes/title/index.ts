// Scene `title` (anthem 4-8 s): IMPACT. Markdown glyphs fly in and snap into a rendered page (the render),
// the Tina logo springs in, the edit box frames it, the campaign line lands, the logo flies to the DOG corner.
import type { SceneDef } from '../../engine/stage';
import { box, css, el, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg, spring, hash } from '../../engine/anim';
import { Headline } from '../../ui/text';
import { EditBox, WashBg, rectAt } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C } from '../../brand/tokens';
import { logo, LOGO_ASPECT } from '../../brand/logo';
import { DOG, type DogCorner } from '../dog';
import { pageCard } from './card';

export interface TitleProps {
  line?: string;
  /** Word times for the line (local seconds). */
  lineTimes?: number[];
  /** When the logo flies to the DOG corner (local). Omit to keep it. */
  toDog?: number;
  /** The headline on the page card (default "Notes your whole team actually reads."). Set it to "Edit your site. Visually." when an earlier shot already typed that. */
  pageHeadline?: string;
  /** Frame the logo with the orange edit box (default true). */
  box?: boolean;
  /** Where the DOG sits, so the logo flies to it (default bottom right). */
  dogCorner?: DogCorner;
  /** The DOG's opacity, which the flying logo fades to (default 0.5). */
  dogOpacity?: number;
  /** The Markdown glyph burst that snaps into the page card (default true). false: a calm reveal, where the
   *  page fades in softly behind and only the logo and the line move. */
  glyphs?: boolean;
  /** Open as an iris from this stage point (a click in the scene before) instead of the white bloom and flash
   *  (anthem round 8: the click on the llama's answer). Give the scene before enough `post`. */
  irisAt?: [number, number];
  /** No white bloom or flash at the cut (default true: bloom and flash). Anthem round 8e: the white frame and the
   *  empty wash before the logo read as a 1 s blank screen. */
  flash?: boolean;
  /** When the logo springs in (local, default 0.55). */
  logoAt?: number;
  /** When the line starts (local, default 1.0). Move `lineTimes` with it. */
  lineIn?: number;
}

const GLYPHS = ['#', '**', '---', '- ', '>', '![ ]( )', '[ ]( )', '##', '*'];

const title: SceneDef<TitleProps> = {
  id: 'title',
  async setup({ root, W, H, portrait }, props) {
    const bg = new WashBg(root, W, H, { base: '#fff', strength: 1.15 });
    const bloom = box({ inset: '0', background: '#fff' });
    root.append(bloom);

    // The rendered page card that the glyphs snap into (a copy of the real Fieldnote page).
    const pc = pageCard(root, W, H, portrait, props.pageHeadline);
    const { cardW, cardH, cardTop, root: card, parts } = pc;

    const calm = props.glyphs === false;
    // Markdown glyphs flying in (none in the calm reveal).
    const glyphs = (calm ? [] : GLYPHS).map((g, i) => {
      const e = box({ left: '0', top: '0', font: `700 ${96 + (i % 3) * 30}px ${FONT.mono}`, color: C.orange, whiteSpace: 'nowrap', textShadow: '0 10px 30px rgba(236,72,21,0.35)', transformOrigin: '50% 50%', marginLeft: '-0.5em', marginTop: '-0.6em' }, el('span', { text: g }));
      root.append(e);
      return e;
    });

    // Logo.
    const logoW = portrait ? W * 0.72 : 880;
    const logoH = logoW * LOGO_ASPECT;
    const logoEl = box({ left: '0', top: '0', width: `${logoW}px`, height: `${logoH}px`, transformOrigin: '0 0' });
    logoEl.innerHTML = await logo('extended');
    const svgEl = logoEl.firstElementChild as SVGSVGElement;
    css(svgEl, { width: '100%', height: '100%', display: 'block' });
    root.append(logoEl);
    // Portrait: the logo and line sit lower, so the pair centres in the safe band (14%-65%).
    const logoX = (W - logoW) / 2, logoY = portrait ? H * 0.3 : H * 0.3;
    const ebox = new EditBox(root, 'tinacms', { tagSize: portrait ? 30 : 18 });

    const line = new Headline(root, { text: props.line ?? (portrait ? 'Edit your site.\n*Visually.*' : 'Edit your site. *Visually.*'), size: portrait ? 124 : 104, color: C.ink, align: 'center', lineHeight: 1.08 });
    line.place({ left: '0', width: `${W}px`, top: `${logoY + logoH + (portrait ? 110 : 80)}px` });

    // Glyph start points around the edges, and their landing slots on the card.
    const cx = (W - cardW) / 2, cy = cardTop;
    const slots = pc.slots;
    const starts = GLYPHS.map((_, i) => {
      const a = (i / GLYPHS.length) * Math.PI * 2 + 0.4;
      return [W / 2 + Math.cos(a) * W * 0.62, H / 2 + Math.sin(a) * H * 0.75];
    });

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = 0.12;
        f.post.grain = 0.05;
        if (props.irisAt) {
          // An iris from the click point: the radius grows to the farthest corner. No white bloom, no flash.
          const [ix, iy] = props.irisAt;
          const R = Math.hypot(Math.max(ix, W - ix), Math.max(iy, H - iy)) * 1.02;
          const ip = ease.outCubic(seg(t, 0, 0.42));
          css(root, { clipPath: ip < 1 ? `circle(${((0.03 + ip * 0.97) * R).toFixed(1)}px at ${ix}px ${iy}px)` : 'none' });
          css(bloom, { display: 'none' });
        } else if (props.flash === false) {
          css(bloom, { display: 'none' });
        } else {
          // Impact flash on the hit.
          f.post.flash = Math.max(0, 1 - t / 0.22) * 0.9;

          // Wash blooms out of the centre.
          const bloomP = ease.snap(seg(t, 0, 0.55));
          css(bloom, { clipPath: `circle(${(1 - bloomP) * 100}% at 50% ${portrait ? 39.5 : 50}%)`, opacity: 1 });
          css(bloom, { opacity: 1 - bloomP });
        }
        bg.update(t + 4);

        // Calm reveal: no glyphs; the page fades in softly in its background state (blurred, faint) behind the logo.
        if (calm) {
          css(card, { opacity: 0.2 * clamp((t - 0.1) / 0.6), transform: tf({ y: portrait ? -60 : 40, s: 0.86 }), filter: 'blur(5px)' });
        }

        // Glyphs: burst out of the caret on the hit (0-0.2), then get pulled into their slots (0.2-0.5).
        if (!calm) glyphs.forEach((g, i) => {
          const a = (i / GLYPHS.length) * Math.PI * 2 + 0.35;
          const R = (portrait ? W * 0.42 : H * 0.42) * (0.75 + hash(i, 2) * 0.5);
          const b = ease.outExpo(seg(t, 0, 0.2));
          const bx = W / 2 + Math.cos(a) * R * b * (portrait ? 1 : 1.5);
          const by = (portrait ? cardTop + cardH / 2 : H / 2) + Math.sin(a) * R * b;
          const [tx, ty] = slots[i];
          const p = ease.inOutCubic(seg(t, 0.2, 0.46 + i * 0.012));
          const x = lerp(bx, cx + tx, p), y = lerp(by, cy + ty, p);
          const fade = 1 - seg(t, 0.44, 0.58);
          const spin = (hash(i, 5) - 0.5) * 140 * (1 - p);
          css(g, { transform: tf({ x, y, r: spin, s: (0.6 + 0.9 * b) * (1 - p * 0.55) }), opacity: fade, filter: p > 0 && p < 1 ? `blur(${(Math.sin(p * Math.PI) * 3).toFixed(1)}px)` : 'none' });
        });

        // Card: parts pop as the glyphs land.
        if (!calm) {
          const cardIn = spring(t - 0.22, 2.2, 0.7);
          const toBack = ease.inOutCubic(seg(t, 0.48, 1.0));
          css(card, {
            opacity: clamp((t - 0.2) * 6) * lerp(1, 0.2, toBack),
            transform: tf({ y: lerp(30, 0, cardIn) + toBack * (portrait ? -60 : 40), s: lerp(0.92, 1, cardIn) * lerp(1, 0.86, toBack) }),
            filter: toBack > 0 ? `blur(${(toBack * 5).toFixed(2)}px)` : 'none',
          });
          const order: (keyof typeof parts)[] = ['h1', 'panel', 'p', 'btns', 'callout'];
          order.forEach((k, i) => {
            const tp = 0.36 + i * 0.04;
            const p = spring(t - tp, 3, 0.55);
            css(parts[k], { opacity: t >= tp ? 1 : 0, transform: tf({ y: (1 - p) * 26, s: 0.96 + 0.04 * p }) });
          });
        }

        // Logo spring-in at logoAt (0.55), flies to the DOG corner at toDog.
        const la = props.logoAt ?? 0.55;
        const lp = spring(t - la, 2.4, 0.6);
        const fly = props.toDog != null ? ease.inOutQuint(seg(t, props.toDog, props.toDog + 0.5)) : 0;
        const dog = DOG(W, H, portrait, props.dogCorner);
        const s0 = 0.72 + 0.28 * lp;
        const s = lerp(s0, dog.w / logoW, fly);
        const x = lerp(logoX + (logoW * (1 - s0)) / 2, dog.x, fly);
        const y = lerp(logoY + (logoH * (1 - s0)) / 2, dog.y, fly);
        // Once it lands, the DOG scene shows the corner logo, so this copy goes (no double logo during a `post`).
        const landed = props.toDog != null && t >= props.toDog + 0.5;
        css(logoEl, { opacity: landed ? 0 : clamp((t - la) * 5) * lerp(1, props.dogOpacity ?? 0.5, fly), transform: tf({ x, y, s }), filter: t < la + 0.25 ? `blur(${((1 - clamp((t - la) * 4)) * 10).toFixed(1)}px)` : 'none' });

        // Edit box: snaps around the logo on 4.5 (local 0.5 + a beat), leaves before the fly.
        const eb = rectAt(t, [[0, { x: W / 2 - 40, y: logoY + logoH / 2 - 40, w: 80, h: 80 }], [0.85, { x: logoX, y: logoY, w: logoW, h: logoH }]], 2.8, 0.6);
        const ea = (props.box === false ? 0 : 1) * clamp((t - 0.85) * 6) * (props.toDog != null ? 1 - seg(t, props.toDog - 0.35, props.toDog - 0.1) : 1);
        ebox.update(eb, ea, Math.exp(-((t - 0.85) % 0.5) * 8) * 0.4 * (t > 0.85 ? 1 : 0));

        line.update(t, { in: props.lineIn ?? 1.0, times: props.lineTimes ?? [1.0, 1.25, 1.5, 2.0], dur: 0.5, out: props.toDog != null ? props.toDog - 0.2 : undefined, outDur: 0.18 });
      },
    };
  },
};
export default title;
