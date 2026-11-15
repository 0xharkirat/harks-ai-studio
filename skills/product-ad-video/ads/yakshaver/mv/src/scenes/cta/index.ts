// Scene `cta` (the end card of every cut): the logo, the command pill that types itself, the edit box
// snapping around it, "Copied" on the sonic logo, tina.io, then the Relax-Llama rocks in. One ask only.
// Every key time is a prop in local seconds; the defaults are the anthem's (56-62 s, 6 s long).
import type { SceneDef } from '../../engine/stage';
import { box, css, tf } from '../../engine/dom';
import { clamp, ease, lerp, pulseSince, seg, spring } from '../../engine/anim';
import { img } from '../../engine/assets';
import { Headline } from '../../ui/text';
import { Cursor, EditBox, Pill, WashBg, image, pathAt, rectAt } from '../../ui/kit';
import { C, GRAD_TITLE } from '../../brand/tokens';
import { logo, LOGO_ASPECT } from '../../brand/logo';
import { FONT } from '../../brand/fonts';

export interface CtaProps {
  /** The pill appears and starts to type (default 0.5). */
  pillAt?: number;
  /** The edit box snaps around the pill (default pillAt + 0.5). */
  boxAt?: number;
  /** "Copied" on the copy tab, the cursor click, the logo glint: the sonic logo (default 2.0). */
  copiedAt?: number;
  /** "tina.io" rises under the pill (default copiedAt - 0.35, so the pill and the URL are both complete about 4 s before the end of a 5 to 6 s card). */
  urlAt?: number;
  /** The first character of the command types (default pillAt + 0.12). */
  typeAt?: number;
  /** The Relax-Llama rocks in from the right (default copiedAt + 1.0). */
  llamaAt?: number;
  /** The small line "Sites, Docs and Llamas. No Dramas." (default llamaAt + 0.3). */
  tagAt?: number;
  /** Local time the fade to white starts (default: scene length - 0.2). Only used when fadeOut is true. */
  endFade?: number;
  /** Fade to white in the last 0.2 s (default false). */
  fadeOut?: boolean;
  /** Typing speed in characters per second (default: fit the typing between pillAt and copiedAt). */
  cps?: number;
  /** A cursor glides in and clicks the copy tab at copiedAt (default true). */
  cursor?: boolean;
  /** Strength of the white flash on the final chord, 0 to 1 (default 0.5). */
  flash?: number;
  /** Seconds per rocking cycle of the chair (default 2.0, one bar). */
  rockPeriod?: number;
  /** The command that types (default npx create-tina-app@latest). */
  command?: string;
  /** The small line (default "Sites, Docs and Llamas. No Dramas.", all in the tina.io title orange); *asterisks* keep the rest dark. */
  tag?: string;
  /** Optional headline between the logo and the pill, *asterisks* mark the emphasis (bumper: "Edit your site. *Visually.*"). */
  line?: string;
  /** When the headline's first word rises (default 0.1); the words follow every 0.1 s unless lineTimes is set. */
  lineAt?: number;
  /** Explicit word times for the headline (local seconds). */
  lineTimes?: number[];
  /** A QR code (an asset path, an SVG) on a white card, opposite the llama (default none). */
  qr?: string;
  /** When the QR card pops in (default copiedAt + 0.5). */
  qrAt?: number;
  /** The line under the QR code (default "Scan to try"). */
  qrLabel?: string;
  /** A second way to start, under the pill: a small "or" divider, then this line (anthem round 8:
   *  "Your favourite *AI agent.*"). tina.io moves down under it, and the small tag line goes unless `tag` is set. */
  agent?: string;
  /** When "or" and the agent line rise (default copiedAt + 0.6). With `agent`, urlAt defaults to agentAt + 0.7. */
  agentAt?: number;
}

// The Relax-Llama PNG is 580 x 776; the chair's rockers touch the floor near (250, 745).
const LLAMA_W = 580, LLAMA_H = 776, PIVOT_X = 0.43, PIVOT_Y = 0.955;

const cta: SceneDef<CtaProps> = {
  id: 'cta',
  async setup({ root, W, H, portrait }, props) {
    const command = props.command ?? 'npx create-tina-app@latest';
    const pillAt = props.pillAt ?? 0.5;
    const copiedAt = props.copiedAt ?? 2.0;
    const boxAt = props.boxAt ?? pillAt + 0.5;
    const agentAt = props.agentAt ?? copiedAt + 0.6;
    const urlAt = props.urlAt ?? (props.agent ? agentAt + 0.7 : copiedAt - 0.35);
    const llamaAt = props.llamaAt ?? copiedAt + 1.0;
    const tagAt = props.tagAt ?? llamaAt + 0.3;
    const showCursor = props.cursor ?? true;
    const typeStart = props.typeAt ?? pillAt + 0.12;
    const cps = props.cps ?? clamp(command.length / Math.max(0.3, copiedAt - typeStart - 0.25), 22, 70);
    const rockPeriod = props.rockPeriod ?? 2.0;

    await img('/assets/llama/Relax-Llama.png');

    // ── layout ──────────────────────────────────────────────────────────
    // With a headline line the stack is taller, so the logo is a little smaller and everything moves.
    const hasLine = !!props.line;
    const L = portrait
      ? hasLine
        ? { logoW: 800, logoY: 296, lineSize: 82, lineY: 548, pillSize: 38, pillY: 730, urlSize: 58, urlY: 880, tagSize: 44, tagY: 1000, tagMW: 900, llama: { h: 540, right: 40, top: 1090 }, tagAlign: 'center' as const }
        : { logoW: 820, logoY: 330, lineSize: 0, lineY: 0, pillSize: 38, pillY: 640, urlSize: 58, urlY: 790, tagSize: 44, tagY: 905, tagMW: 900, llama: { h: 560, right: 40, top: 1075 }, tagAlign: 'center' as const }
      : hasLine
        ? { logoW: 760, logoY: 150, lineSize: 64, lineY: 372, pillSize: 48, pillY: 528, urlSize: 62, urlY: 694, tagSize: 46, tagY: 822, tagMW: 1200, llama: { h: 540, right: 130, top: 1080 - 50 - 540 }, tagAlign: 'center' as const }
        : { logoW: 840, logoY: 236, lineSize: 0, lineY: 0, pillSize: 50, pillY: 520, urlSize: 62, urlY: 688, tagSize: 46, tagY: 802, tagMW: 1200, llama: { h: 540, right: 130, top: 1080 - 50 - 540 }, tagAlign: 'center' as const };
    // Round 8b (Hark: "super symmetrical, with padding among the texts"). 16:9 with a headline and an agent line:
    // one stack (logo, line, pill, "or", agent line, tina.io) with the same gap between items, centred in the frame;
    // the QR card and the llama are mirrored side columns: the same width and edge margin, both centred on the frame.
    // Item heights are their boxes: Plex lines at their line height, the pill about 2.05 em, tina.io down to its bar.
    // `optical` corrects each box gap so the gaps between the inked shapes come out even (about 50 px), as measured on
    // a frame: the logo file has room under its baseline, and "Try TinaCMS today." has a descender.
    // The side columns sit about 70 px clear of the command field, the widest item.
    const sym = !portrait && !!props.agent && hasLine;
    const SYM = { gap: 46, optical: [-5, 5.5, 0, -1, 0], logoW: 660, lineSize: 62, pillSize: 42, orSize: 24, agentSize: 56, urlSize: 60, side: 300, margin: 110, labelSize: 30 };
    const symY = { or: 0, agent: 0 };
    if (sym) {
      const hs = [SYM.logoW * LOGO_ASPECT, SYM.lineSize * 1.04, SYM.pillSize * 2.05, SYM.orSize, SYM.agentSize * 1.04, SYM.urlSize * 1.2 + Math.max(4, SYM.urlSize * 0.07)];
      const gaps = SYM.optical.map((o) => SYM.gap + o);
      const ys: number[] = [];
      let y = (H - hs.reduce((a, b) => a + b, 0) - gaps.reduce((a, b) => a + b, 0)) / 2;
      hs.forEach((h, i) => { ys.push(y); y += h + (gaps[i] ?? 0); });
      Object.assign(L, { logoW: SYM.logoW, logoY: ys[0], lineSize: SYM.lineSize, lineY: ys[1], pillSize: SYM.pillSize, pillY: ys[2], urlSize: SYM.urlSize, urlY: ys[5] });
      symY.or = ys[3];
      symY.agent = ys[4];
    }
    const logoH = L.logoW * LOGO_ASPECT;
    const logoX = (W - L.logoW) / 2;

    // ── background: white and the wash, with a white glow behind the logo ─
    const bg = new WashBg(root, W, H, { base: '#fff', strength: 1.0 });
    const glow = box({ left: `${W / 2 - L.logoW * 0.9}px`, top: `${L.logoY + logoH / 2 - L.logoW * 0.5}px`, width: `${L.logoW * 1.8}px`, height: `${L.logoW}px`, borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0) 72%)' });
    root.append(glow);

    // ── the group that gets the slow push-in ────────────────────────────
    const grp = box({ inset: '0', transformOrigin: `${W / 2}px ${H * (sym ? 0.5 : 0.46)}px` });
    root.append(grp);

    // Logo (official file) with a white copy on top that carries the glint.
    const mkLogo = async (color?: string) => {
      const e = box({ left: '0', top: '0', width: `${L.logoW}px`, height: `${logoH}px` });
      e.innerHTML = await logo('extended', color);
      css(e.firstElementChild as SVGElement, { width: '100%', height: '100%', display: 'block' });
      return e;
    };
    const logoG = box({ left: '0', top: '0', width: `${L.logoW}px`, height: `${logoH}px` });
    const logoMain = await mkLogo();
    const logoWhite = await mkLogo('#FFFFFF');
    const gm = 'linear-gradient(105deg, transparent 43%, #000 50%, transparent 57%)';
    css(logoWhite, { maskImage: gm, webkitMaskImage: gm, maskSize: '320% 100%', webkitMaskSize: '320% 100%', maskRepeat: 'no-repeat', webkitMaskRepeat: 'no-repeat', opacity: '0' } as any);
    logoG.append(logoMain, logoWhite);
    grp.append(logoG);

    // The command pill, the edit box around it, the copy click.
    const pill = new Pill(grp, command, L.pillSize);
    // A soft peach band that sweeps across the pill on the sonic logo (the pill clips it to its rounded shape).
    const sweep = box({ left: '0', top: '0', bottom: '0', width: '30%', pointerEvents: 'none', opacity: '0', background: 'linear-gradient(100deg, rgba(255,214,190,0) 0%, rgba(255,196,165,0.7) 50%, rgba(255,214,190,0) 100%)' });
    css(pill.root, { isolation: 'isolate' });
    css(sweep, { zIndex: '-1' });
    pill.root.prepend(sweep); // behind the text, so the command never fades
    const ebox = new EditBox(grp, 'Get started', { tagSize: portrait ? 17 : 20 });
    const ping = box({ left: '0', top: '0', width: '120px', height: '120px', marginLeft: '-60px', marginTop: '-60px', borderRadius: '50%', border: `4px solid ${C.seafoam}`, opacity: '0', zIndex: '30' });
    grp.append(ping);

    // The optional headline between the logo and the pill.
    const lineMW = portrait ? W - 130 : 1400;
    const lineH = hasLine ? new Headline(grp, { text: props.line!, size: L.lineSize, color: C.ink, align: 'center', maxWidth: lineMW, lineHeight: 1.04 }) : null;
    lineH?.place({ left: `${(W - lineMW) / 2}px`, width: `${lineMW}px`, top: `${L.lineY}px` });
    const lineAt = props.lineAt ?? 0.1;

    // "or" and the agent line under the pill (the pill is about 2.05 em of its text tall); tina.io moves under them.
    let orRow: HTMLElement | null = null;
    let agentH: Headline | null = null;
    let urlY = L.urlY;
    if (props.agent) {
      const orSize = sym ? SYM.orSize : Math.round(L.pillSize * 0.54), agentSize = sym ? SYM.agentSize : Math.round(L.lineSize ? L.lineSize * 0.875 : L.pillSize * 1.15);
      const orY = sym ? symY.or : L.pillY + L.pillSize * 2.05 + orSize * 0.9;
      const agentY = sym ? symY.agent : orY + orSize * 1.7;
      if (!sym) urlY = agentY + agentSize * 1.25 + L.urlSize * 0.75;
      // Its own layer (will-change), like the Headlines: without it the slow push-in snapped "or" and its lines by
      // whole pixels every 2 s (anthem round 8e: "the or line is a bit glitchy").
      orRow = box({ left: '0', width: `${W}px`, top: `${orY}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${Math.round(orSize * 0.8)}px`, font: `500 ${orSize}px/1 ${FONT.head}`, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.text2, willChange: 'transform' });
      const hair = `<span style="display:block;width:${orSize * 4}px;height:2px;border-radius:1px;background:#CBD5E1"></span>`;
      orRow.innerHTML = `${hair}<span>or</span>${hair}`;
      grp.append(orRow);
      agentH = new Headline(grp, { text: props.agent, size: agentSize, color: C.ink, align: 'center', maxWidth: lineMW, lineHeight: 1.04 });
      agentH.place({ left: `${(W - lineMW) / 2}px`, width: `${lineMW}px`, top: `${agentY}px` });
    }

    // tina.io and the small line.
    const url = new Headline(grp, { text: 'tina.io', size: L.urlSize, color: C.ink, align: 'center' });
    url.place({ left: '0', width: `${W}px`, top: `${urlY}px` });
    const bar = box({ left: `${W / 2 - L.urlSize * 1.55}px`, top: `${urlY + L.urlSize * 1.2}px`, width: `${L.urlSize * 3.1}px`, height: `${Math.max(4, L.urlSize * 0.07)}px`, borderRadius: '4px', background: 'linear-gradient(90deg, #FF724B, #EC4815 50%, #D13F13)', transformOrigin: '50% 50%' });
    grp.append(bar);
    // The small line wears the tina.io hero style: IBM Plex Sans SemiBold with the orange title fill on every word.
    const tagText = props.tag ?? 'Sites, Docs and Llamas. No Dramas.';
    const tag = !props.agent || props.tag != null ? new Headline(grp, { text: tagText.includes('*') ? tagText : `*${tagText}*`, size: L.tagSize, color: '#475569', align: L.tagAlign, emph: GRAD_TITLE, maxWidth: L.tagMW }) : null;
    tag?.place({ left: `${(W - L.tagMW) / 2}px`, width: `${L.tagMW}px`, top: `${L.tagY}px` });

    // Relax-Llama on its own layer (a touch more parallax than the group).
    // 9:16 without the QR card: the llama sits big and centred in the bottom band.
    if (portrait && !props.qr) L.llama = { h: 700, right: (W - (700 * LLAMA_W) / LLAMA_H) / 2, top: 1100 };
    if (sym) {
      const h = (SYM.side * LLAMA_H) / LLAMA_W;
      L.llama = { h, right: SYM.margin, top: (H - h) / 2 };
    }
    const lh = L.llama.h, lw = (lh * LLAMA_W) / LLAMA_H;
    const llamaX = W - L.llama.right - lw;
    const shadow = box({ left: `${llamaX + lw * 0.02}px`, top: `${L.llama.top + lh * 0.935}px`, width: `${lw * 0.92}px`, height: `${lh * 0.075}px`, borderRadius: '50%', background: 'rgba(20,40,110,0.22)', filter: 'blur(14px)' });
    const llamaG = box({ left: `${llamaX}px`, top: `${L.llama.top}px`, width: `${lw}px`, height: `${lh}px`, transformOrigin: `${PIVOT_X * 100}% ${PIVOT_Y * 100}%` });
    image(llamaG, '/assets/llama/Relax-Llama.png', { left: '0', top: '0', width: `${lw}px`, height: `${lh}px` });
    root.append(shadow, llamaG);

    // The QR card, opposite the llama with the same side margin. It sits on the root, so the push-in never moves it.
    const qrAt = props.qrAt ?? copiedAt + 0.5;
    let qrCard: HTMLElement | null = null;
    if (props.qr) {
      await img(props.qr);
      const cs = sym ? SYM.side : Math.round(Math.min(300, lw * 0.75)), pad = Math.round(cs * 0.075);
      const labelSize = sym ? SYM.labelSize : Math.round(cs * 0.12);
      // Symmetrical: the card and its label centred on the frame, at the llama's edge margin.
      const qrTop = sym ? (H - (cs * 1.06 + labelSize * 1.2)) / 2 : L.llama.top + lh * 0.33;
      qrCard = box({ left: `${sym ? SYM.margin : L.llama.right + 20}px`, top: `${qrTop}px`, width: `${cs}px`, height: `${cs}px`, background: '#fff', borderRadius: `${Math.round(cs * 0.08)}px`, boxShadow: '0 18px 50px rgba(20,40,110,0.18), 0 0 0 1px rgba(15,23,42,0.06)', transformOrigin: '50% 60%' });
      image(qrCard, props.qr, { left: `${pad}px`, top: `${pad}px`, width: `${cs - 2 * pad}px`, height: `${cs - 2 * pad}px` });
      const label = box({ left: '0', top: `${Math.round(cs * 1.06)}px`, width: `${cs}px`, textAlign: 'center', font: `600 ${labelSize}px/1.2 ${FONT.head}`, letterSpacing: '-0.025em', color: C.ink });
      label.textContent = props.qrLabel ?? 'Scan to try';
      qrCard.append(label);
      root.append(qrCard);
    }

    // Cursor that clicks the copy tab.
    const cursor = new Cursor(grp, portrait ? 1.3 : 1.6);

    // End fade to white.
    const veil = box({ inset: '0', background: '#fff', opacity: '0', zIndex: '60' });
    root.append(veil);

    // Measured once, when the scene first shows (the stage builds scenes hidden).
    let m: { pw: number; ph: number; tabW: number; tabH: number } | null = null;
    const measure = () => {
      pill.update(0, -100, 1000, 0); // full command, "Copied" label: the widest state
      // By name: the sweep layer sits first in pill.root, so child indices pointed at the wrong parts (the cursor
      // clicked the middle of the command, and the copy tab was stretched with a white strip beside it).
      const { left, tab } = pill;
      const pw = pill.root.offsetWidth, ph = pill.root.offsetHeight, tabW = tab.offsetWidth;
      css(pill.root, { width: pw });
      css(left, { flex: '1 1 auto' });
      css(tab, { width: tabW, flex: '0 0 auto', minWidth: '0' });
      pill.update(0, 0, 26, Infinity);
      return { pw, ph, tabW, tabH: ph };
    };

    return {
      update(f) {
        const t = f.lt;
        if (!m) m = measure();
        const { pw, ph, tabW } = m;
        const pillX = (W - pw) / 2, pillY = L.pillY;
        f.post.vignette = 0.06;
        f.post.grain = 0.05;
        // The final chord: a white flash that falls away and a wash that settles.
        f.post.flash = (props.flash ?? 0.5) * Math.exp(-t * 11) * (t < 0.6 ? 1 : 0);
        bg.update(f.t, 1.0 + 0.7 * Math.exp(-t * 2.2));
        css(glow, { opacity: 0.85 + 0.15 * Math.sin(t * 1.6) });

        // Slow push-in over the whole scene.
        const push = 1 + 0.04 * (t / f.dur);
        css(grp, { transform: tf({ s: push, y: sym ? 0 : -6 * (t / f.dur) }) });

        // Logo: kicked on the chord, a glint on the sonic logo.
        const kick = 1 + 0.1 * (1 - spring(t, 2.8, 0.5));
        css(logoG, { opacity: 1, transform: tf({ x: logoX, y: L.logoY, s: kick }) });
        const gp = seg(t, copiedAt, copiedAt + 0.85, ease.inOutCubic);
        const gpos = lerp(100, 4, gp);
        css(logoWhite, { opacity: gp > 0 && gp < 1 ? 0.22 : 0, maskPosition: `${gpos}% 0`, webkitMaskPosition: `${gpos}% 0` } as any);

        // Pill: appears, types, snaps into the box, copies.
        const pin = ease.snap(seg(t, pillAt - 0.05, pillAt + 0.3));
        css(pill.root, { opacity: pin, transform: tf({ x: pillX, y: pillY + (1 - pin) * 18, s: 0.95 + 0.05 * pin }) });
        pill.update(t, typeStart, cps, copiedAt);
        const sp = seg(t, copiedAt - 0.05, copiedAt + 0.7, ease.inOutCubic);
        css(sweep, { width: pw * 0.3, opacity: sp > 0 && sp < 1 ? 1 : 0, transform: tf({ x: lerp(-pw * 0.35, pw * 1.05, sp), skx: -14 }) });
        const big = { x: pillX - 90, y: pillY - 50, w: pw + 180, h: ph + 100 };
        const r = rectAt(t, [[0, big], [boxAt, { x: pillX, y: pillY, w: pw, h: ph }]], 2.8, 0.6);
        ebox.update(r, clamp((t - boxAt) * 10), pulseSince(t, copiedAt, 7) * 0.8 + pulseSince(t, boxAt, 8) * 0.5);

        // The click on the copy tab, and the seafoam ping.
        const tabCx = pillX + pw - tabW / 2, tabCy = pillY + ph / 2;
        if (showCursor) {
          const c0 = Math.max(0.05, copiedAt - 0.8);
          const [cx, cy] = pathAt(t, [
            [c0, tabCx + (portrait ? 150 : 330), tabCy + (portrait ? 200 : 270)],
            [copiedAt - 0.08, tabCx + 8, tabCy + 6],
            [copiedAt + 0.1, tabCx + 8, tabCy + 6],
            [copiedAt + 1.4, tabCx + (portrait ? 60 : 160), tabCy + (portrait ? 150 : 210)],
          ]);
          const a = t < c0 ? 0 : Math.min(1, (t - c0) * 6) * (1 - seg(t, copiedAt + 0.9, copiedAt + 1.3));
          cursor.update(cx, cy, t, copiedAt, a);
        } else css(cursor.root, { display: 'none' });
        const pp = clamp((t - copiedAt) / 0.7);
        css(ping, { opacity: t >= copiedAt ? (1 - ease.outCubic(pp)) * 0.9 : 0, transform: tf({ x: tabCx, y: tabCy, s: 0.4 + ease.outExpo(pp) * 1.9 }) });

        lineH?.update(t, { in: lineAt, times: props.lineTimes, stagger: 0.1, dur: 0.45 });

        // tina.io: rises under the pill, with a bar that draws out from the centre.
        url.update(t, { in: urlAt, dur: 0.55 });
        css(bar, { opacity: t >= urlAt + 0.12 ? 1 : 0, transform: tf({ sx: ease.outExpo(seg(t, urlAt + 0.12, urlAt + 0.7)), sy: 1 }) });

        // "or" and the agent line.
        if (orRow) {
          const o = ease.outCubic(seg(t, agentAt, agentAt + 0.4));
          css(orRow, { opacity: o, transform: tf({ y: (1 - o) * 14 }) });
        }
        agentH?.update(t, { in: agentAt + 0.12, stagger: 0.1, dur: 0.5 });

        // The small line.
        tag?.update(t, { in: tagAt, stagger: 0.07, dur: 0.55 });

        // The Relax-Llama rocks in from the right, leaning back, and settles into a gentle rock.
        const lt = t - llamaAt;
        const slideIn = 1 - ease.outCubic(seg(t, llamaAt, llamaAt + 1.0));
        const amp = 2.2 * (1 + 3 * Math.exp(-Math.max(0, lt) * 1.3));
        const ang = amp * Math.cos((Math.max(0, lt) / rockPeriod) * Math.PI * 2);
        const roll = (ang * Math.PI) / 180 * lh * 0.28; // the rocker rolls along the floor
        const lx = slideIn * (lw + L.llama.right + 80) + roll;
        const on = t >= llamaAt;
        css(llamaG, { display: on ? '' : 'none', transform: `translate3d(${lx.toFixed(2)}px, 0, 0) rotate(${ang.toFixed(3)}deg)` });
        css(shadow, { display: on ? '' : 'none', opacity: ease.inOutQuad(seg(t, llamaAt + 0.3, llamaAt + 1.0)), transform: `translate3d(${(slideIn * (lw + L.llama.right + 80) + roll * 0.6).toFixed(2)}px, 0, 0)` });

        // The QR card pops in with a small spring.
        if (qrCard) {
          const q = t - qrAt;
          css(qrCard, { display: q >= 0 ? '' : 'none', opacity: clamp(q * 6), transform: tf({ s: lerp(0.6, 1, spring(Math.max(0, q), 3.2, 0.5)) }) });
        }

        // Fade to white in the last 0.2 s, only when asked.
        const ef = props.endFade ?? f.dur - 0.2;
        css(veil, { opacity: props.fadeOut ? ease.inOutQuad(seg(t, ef, ef + 0.2)) : 0 });
      },
    };
  },
};
export default cta;
