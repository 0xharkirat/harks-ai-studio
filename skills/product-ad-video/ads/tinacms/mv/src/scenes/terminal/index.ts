// Scene `terminal` (dev cut 0-4 s): the developer hook. A macro shot of a terminal that types the one
// command on 16ths, Enter at 3.0, create-tina-app output flooding past while the camera pulls back,
// then the stop: black, only the orange caret, exactly where the `title` impact starts.
import type { SceneDef } from '../../engine/stage';
import { box, css, el, tf } from '../../engine/dom';
import { clamp, ease, lerp, noise1, seg, track } from '../../engine/anim';
import { SIXTEENTH } from '../../engine/time';
import { NavyBg } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C, SYN } from '../../brand/tokens';

export interface TerminalProps {
  /** The command that is typed (default `npx create-tina-app@latest`). */
  cmd?: string;
  /** Local time of the first typed character (default 0.375, the third 16th). */
  typeStart?: number;
  /** Local time of the Enter key (default 3.0). */
  enter?: number;
  /** Local time of the stop: black with only the caret (default 3.5). */
  stop?: number;
}

// The grid of the terminal in design px: one cell is 28 px wide, which is exactly the width of the caret
// in the `open` scene, so the final caret matches the stop frame to the pixel.
const CW = 28;
const FS = CW / 0.6001; // Roboto Mono advance is 0.6001 em
const LH = 70;
const CARET_H = 64;
const MUTED = '#6E6996';
// The final pull-back frames the finished output as one centred block, the prompt low in the frame.
// The widest line is 60 characters (60 x 28 px at scale 1), which is why the end scale is exactly 1: the block
// spans x 120 to 1800, inside the 6 % title-safe margins (115 to 1805).
const S_END = 1.0;
const BLOCK_MID = 30 * CW;
const Y_LOW = 420;
// Macro scale while typing: the whole command line (812 px with the caret) must stay inside the margins,
// also with the perspective tilt of the first shot.
const S_MACRO0 = 1.8;
const S_MACRO1 = 1.95;
const LINE_MID = 406;

type Run = { s: string; c?: string; b?: boolean; bg?: string };
/** One terminal row. A row can change what it shows (a spinner turning into a tick). */
interface Row { variants: { t: number; runs: Run[] }[]; dim?: boolean }

const check = (c = C.seafoam) =>
  `<span style="display:inline-block;width:${CW}px;height:1em;vertical-align:-0.1em;position:relative"><svg width="${CW}" height="${FS}" viewBox="0 0 28 47" style="position:absolute;left:0;top:0"><path d="M5 25 L12 33 L24 14" fill="none" stroke="${c}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
const chevron = (c = C.orange) =>
  `<span style="display:inline-block;width:${CW}px;height:1em;vertical-align:-0.1em;position:relative"><svg width="${CW}" height="${FS}" viewBox="0 0 28 47" style="position:absolute;left:0;top:0"><path d="M7 12 L20 25 L7 38" fill="none" stroke="${c}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;

/** The ora spinner, drawn (the braille frames are not in Roboto Mono). */
const spinner = (deg: number) =>
  `<span style="display:inline-block;width:${CW}px;height:1em;vertical-align:-0.1em;position:relative"><svg width="${CW}" height="${FS}" viewBox="0 0 28 47" style="position:absolute;left:0;top:0;transform:rotate(${deg}deg)"><circle cx="14" cy="24" r="8" fill="none" stroke="#6FD3E8" stroke-width="4" stroke-linecap="round" stroke-dasharray="32 20"/></svg></span>`;
/** The ora info symbol. */
const info = () =>
  `<span style="display:inline-block;width:${CW}px;height:1em;vertical-align:-0.1em;position:relative"><svg width="${CW}" height="${FS}" viewBox="0 0 28 47" style="position:absolute;left:0;top:0"><circle cx="14" cy="24" r="9" fill="none" stroke="#6FA8FF" stroke-width="3.2"/><path d="M14 20.5v8" stroke="#6FA8FF" stroke-width="3.6" stroke-linecap="round"/><circle cx="14" cy="17" r="2" fill="#6FA8FF"/></svg></span>`;

const runsHtml = (runs: Run[]) =>
  runs
    .map((r) => (r.s.startsWith('<') ? r.s : `<span style="color:${r.c ?? SYN.text}${r.b ? ';font-weight:600' : ''}${r.bg ? `;background:${r.bg}` : ''}">${r.s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`))
    .join('');

/** Typed command with the `sh` colours: npx in blue, @latest in green. */
function cmdRuns(text: string): Run[] {
  const out: Run[] = [];
  const m = /^(npx)( create-tina-app)(@latest)?/.exec(text);
  if (!m) return [{ s: text }];
  const full = text;
  let rest = full;
  const push = (s: string, c: string) => {
    const piece = rest.slice(0, s.length);
    if (piece) out.push({ s: piece, c });
    rest = rest.slice(piece.length);
  };
  push('npx', SYN.fn);
  push(' create-tina-app', SYN.text);
  push('@latest', SYN.str);
  if (rest) out.push({ s: rest, c: SYN.text });
  return out;
}

// What create-tina-app prints, in order, with the real strings from the published package (v2.2.3, src/index.ts):
// "Which package manager would you like to use?", "What is your project named?", "What starter code would you like
// to use?" (prompts shows an answered question as `✔ <bold question> … <answer>`), then the ora spinner lines
// "Downloading template...", "Installing packages.", "Initializing git repository.", "Created <name>" and
// "To get started:" with the `cd <name>` and `<pm> run dev` commands. `fr` is a 0..1 fraction of the Enter-to-stop window.
const TICK = '#8BE0B0';
const prompt = (q: string, answer: string): Run[] => [{ s: check(TICK) }, { s: ' ' }, { s: q, c: '#FFFFFF', b: true }, { s: ' … ', c: MUTED }, { s: answer, c: SYN.text }];
const OUT: { dim?: boolean; variants: { fr: number; runs: Run[] }[] }[] = [
  { variants: [{ fr: 0.1, runs: [{ s: check(TICK) }, { s: ' Node v22.11.0 is supported.', c: SYN.text }] }] },
  { variants: [{ fr: 0.2, runs: prompt('Which package manager would you like to use?', 'npm') }] },
  { variants: [{ fr: 0.26, runs: prompt('What is your project named?', 'my-site') }] },
  { variants: [{ fr: 0.36, runs: prompt('What starter code would you like to use?', 'Next.js Starter') }] },
  { variants: [{ fr: 0.44, runs: [{ s: check(TICK) }, { s: ' Downloading template...', c: SYN.text }] }] },
  {
    variants: [
      { fr: 0.5, runs: [{ s: spinner(0) }, { s: ' Installing packages.', c: SYN.text }] },
      { fr: 0.545, runs: [{ s: spinner(110) }, { s: ' Installing packages.', c: SYN.text }] },
      { fr: 0.59, runs: [{ s: spinner(220) }, { s: ' Installing packages.', c: SYN.text }] },
      { fr: 0.63, runs: [{ s: check(TICK) }, { s: ' Installing packages.', c: SYN.text }] },
    ],
  },
  { variants: [{ fr: 0.69, runs: [{ s: check(TICK) }, { s: ' Initializing git repository.', c: SYN.text }] }] },
  { variants: [{ fr: 0.74, runs: [{ s: check(TICK) }, { s: ' Created ', c: SYN.text }, { s: 'my-site', c: C.orange400 }] }] },
  { variants: [{ fr: 0.79, runs: [{ s: info() }, { s: ' To get started:', c: '#FFFFFF', b: true }] }] },
  { variants: [{ fr: 0.83, runs: [{ s: '  ' }, { s: 'cd my-site', c: '#FFFFFF', b: true, bg: 'rgba(255,255,255,0.16)' }] }] },
  { variants: [{ fr: 0.87, runs: [{ s: '  ' }, { s: 'npm run dev', c: '#FFFFFF', b: true, bg: 'rgba(255,255,255,0.16)' }] }] },
];

const terminal: SceneDef<TerminalProps> = {
  id: 'terminal',
  setup({ root, W, H }, props) {
    const cmd = props.cmd ?? 'npx create-tina-app@latest';
    const typeStart = props.typeStart ?? 0.375;
    const enter = props.enter ?? 3.0;
    const stop = props.stop ?? 3.5;
    const span = stop - enter;

    const bg = new NavyBg(root, W, H);

    // ── the scrollback, as data ────────────────────────────────────────────
    const staticRow = (runs: Run[]): Row => ({ variants: [{ t: -1, runs }], dim: true });
    const history: Row[] = [
      staticRow([{ s: chevron(C.seafoam) }, { s: ' cd ~/sites', c: SYN.dim }]),
      staticRow([{ s: chevron(C.seafoam) }, { s: ' node -v', c: SYN.dim }]),
      staticRow([{ s: 'v22.11.0', c: MUTED }]),
    ];
    const rows: Row[] = [...history, { variants: [{ t: -1, runs: [] }] }]; // the command row is index history.length
    const cmdIdx = history.length;
    for (const o of OUT) rows.push({ dim: o.dim, variants: o.variants.map((v) => ({ t: enter + v.fr * span, runs: v.runs })) });
    const promptIdx = rows.length;
    rows.push({ variants: [{ t: enter + 0.93 * span, runs: [{ s: chevron(C.seafoam) }, { s: ' ' }] }] });
    const lineT = rows.map((r) => r.variants[0].t);

    // Chunked typing on 16ths: 21 steps, 26 characters.
    const chunks = ['n', 'p', 'x', ' ', 'cr', 'ea', 't', 'e', '-', 't', 'i', 'n', 'a', '-', 'ap', 'p', '@', 'la', 't', 'e', 'st'];
    const counts: number[] = [];
    {
      let n = 0;
      for (const c of chunks) { n += c.length; counts.push(Math.min(n, cmd.length)); }
      counts[counts.length - 1] = cmd.length;
    }

    // ── layers: a sharp copy and a blurred copy (depth of field), same content ──
    const mkLayer = (withCaret: boolean) => {
      const wrap = box({ inset: '0' });
      const persp = box({ inset: '0', transformOrigin: '50% 50%' });
      const plane = box({ left: '0', top: '0', width: '1px', height: '1px', transformOrigin: '0 0' });
      persp.append(plane);
      wrap.append(persp);
      const els = rows.map((ln, i) => {
        const d = box({
          left: '0', top: `${(i - cmdIdx) * LH}px`, height: `${LH}px`, lineHeight: `${LH}px`, whiteSpace: 'pre',
          font: `500 ${FS}px/${LH}px ${FONT.mono}`, color: SYN.text, fontVariantLigatures: 'none',
        });
        d.innerHTML = runsHtml(ln.variants[0].runs);
        plane.append(d);
        return d;
      });
      let caret: HTMLDivElement | null = null;
      if (withCaret) {
        caret = box({ left: '0', top: '0', width: `${CW}px`, height: `${CARET_H}px`, background: C.orange, boxShadow: `0 0 30px ${C.orange}AA, 0 0 90px ${C.orange}55` });
        plane.append(caret);
      }
      root.append(wrap);
      return { wrap, persp, plane, els, caret, cmdHtml: '', shown: rows.map(() => 0) };
    };
    const blurL = mkLayer(false);
    const sharpL = mkLayer(true);
    // Rows that scroll off the top fade out instead of being cut at the frame edge.
    const topFade = box({ inset: '0', maskImage: 'linear-gradient(180deg, transparent 30px, black 150px)', webkitMaskImage: 'linear-gradient(180deg, transparent 30px, black 150px)' } as any);
    topFade.append(blurL.wrap, sharpL.wrap);
    root.append(topFade);
    css(blurL.wrap, { opacity: 0.55, filter: 'blur(7px)' });

    // The final caret, in screen space, identical to the one in the `open` scene.
    const caretEnd = box({ left: `${W / 2 - CW / 2}px`, top: `${H / 2 - CARET_H / 2}px`, width: `${CW}px`, height: `${CARET_H}px`, background: C.orange, boxShadow: `0 0 30px ${C.orange}AA` });
    root.append(caretEnd);
    const enterGlow = box({ inset: '0', background: `radial-gradient(ellipse 70% 40% at 50% 50%, ${C.orange}33 0%, transparent 70%)`, opacity: '0' });
    root.insertBefore(enterGlow, topFade);

    /** How many rows below the command row exist (smoothed): the scroll of the camera. */
    const scrollLines = (t: number) => {
      let s = 0;
      for (let i = cmdIdx + 1; i < rows.length; i++) s += ease.outCubic(seg(t, lineT[i] - 0.02, lineT[i] + 0.05));
      return s;
    };

    const lineWorldX = (n: number) => 2 * CW + n * CW; // chevron + space, then the command

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = 0.45;
        const inStop = t >= stop;

        css(bg.root, { display: inStop ? 'none' : '' });
        root.style.background = inStop ? '#000' : '';
        css(blurL.wrap, { display: inStop ? 'none' : '' });
        css(sharpL.wrap, { display: inStop ? 'none' : '' });
        // The stop: black, the caret alone. It blinks once, then is lit for the impact.
        const blink = t < stop + 0.25 ? 1 : t < stop + 0.375 ? 0.15 : 1;
        css(caretEnd, { display: inStop ? '' : 'none', opacity: blink });
        if (inStop) { f.post.vignette = 0; return; }
        bg.update(t);
        // The room is lit from the first frame (that frame can be the thumbnail); only the caret blinks.
        const lit = 1;

        // ── typing state ────────────────────────────────────────────────────
        const step = Math.floor((t - typeStart) / SIXTEENTH + 1e-6);
        const k = t < typeStart ? 0 : Math.min(chunks.length, step + 1);
        const nChars = k === 0 ? 0 : counts[k - 1];
        const typedNow = t >= enter ? cmd.length : nChars;
        const typedText = cmd.slice(0, typedNow);

        // ── camera ──────────────────────────────────────────────────────────
        // The pull-back is a whip: scale and position move together on one expo curve, and the horizontal
        // move lags the zoom so the left end of the text never leaves the left margin on the way.
        const pull = ease.outExpo(seg(t, enter + 0.01, enter + 0.23));
        const pullX = pull ** 2.5;
        const pullSnap = pull;
        // Macro push-in while typing, a small punch on Enter, then the pull-back to scale 1.
        const S0 = lerp(S_MACRO0, S_MACRO1, seg(t, 0, enter));
        const punch = t >= enter ? Math.exp(-(t - enter) * 16) * 0.04 : 0;
        // Every key nudges the camera a hair (the foley lands on the same 16ths).
        const lastKey = t < typeStart || t >= enter ? -1 : typeStart + Math.floor((t - typeStart) / SIXTEENTH + 1e-6) * SIXTEENTH;
        const key = lastKey < 0 ? 0 : Math.exp(-(t - lastKey) * 26);
        const S = lerp(S0 + punch + key * 0.012, S_END, pull);
        // Horizontal: the typed line is centred (it fits at macro scale), then the caret goes to the centre.
        const camX = lerp(LINE_MID, BLOCK_MID, pullX);
        const sl = scrollLines(t);
        const camY = (sl + 0.5) * LH + (t >= enter ? Math.exp(-(t - enter) * 14) * 5 : 0) - (Y_LOW * pullSnap) / S;
        const dx = noise1(t * 0.8, 3) * 4 * (1 - pull), dy = noise1(t * 0.7, 9) * 5 * (1 - pull);
        const tilt = 1 - pull;
        const rx = (12 - t * 1.4) * tilt, ry = -6 * tilt, rz = -1.5 * tilt;
        for (const L of [blurL, sharpL]) {
          const tilted = tf({ rx, ry, r: rz });
          css(L.persp, { transform: tilted === 'none' ? 'perspective(1500px)' : `perspective(1500px) ${tilted}` });
          css(L.plane, { transform: tf({ x: W / 2 - S * camX + dx, y: H / 2 - S * camY + dy, s: S }) });
        }

        // ── content ────────────────────────────────────────────────────────
        const caretOn = t < 0.125 ? true : t < 0.25 ? false : t < enter ? true : t >= lineT[promptIdx] ? true : false;
        const html = runsHtml([{ s: chevron(C.seafoam) }, { s: ' ' }, ...cmdRuns(typedText)]);
        for (const L of [blurL, sharpL]) {
          if (L.cmdHtml !== html) { L.els[cmdIdx].innerHTML = html; L.cmdHtml = html; }
          rows.forEach((row, i) => {
            if (i <= cmdIdx) { css(L.els[i], { opacity: (row.dim ? 0.5 : 1) * lit }); return; }
            // which variant of the row is on (a spinner turns into a tick)
            let v = -1;
            row.variants.forEach((vr, j) => { if (t >= vr.t) v = j; });
            if (v >= 0 && L.shown[i] !== v + 1) { L.els[i].innerHTML = runsHtml(row.variants[v].runs); L.shown[i] = v + 1; }
            const on = v >= 0;
            const age = on ? t - row.variants[v].t : 0;
            const first = on ? t - row.variants[0].t : 0;
            const flash = on ? Math.exp(-age * 18) : 0;
            css(L.els[i], {
              opacity: on ? (row.dim ? 0.7 : 1) : 0,
              transform: tf({ y: on ? (1 - ease.outCubic(clamp(first / 0.06))) * 16 : 0 }),
              filter: flash > 0.02 ? `brightness(${(1 + flash * 1.6).toFixed(2)})` : 'none',
            });
          });
        }
        // The caret sits at the end of the typed text, then at the final prompt.
        const onPrompt = t >= lineT[promptIdx];
        const cx = onPrompt ? 2 * CW : lineWorldX(typedNow);
        const cyLine = onPrompt ? promptIdx - cmdIdx : 0;
        if (sharpL.caret) {
          css(sharpL.caret, {
            transform: tf({ x: cx, y: cyLine * LH + (LH - CARET_H) / 2 }),
            opacity: caretOn ? 1 : 0,
          });
        }
        // Enter: a warm pulse behind the text.
        css(enterGlow, { opacity: t >= enter ? Math.exp(-(t - enter) * 9) : 0 });

        // ── depth of field: only the caret line is sharp while the camera is close ──
        const k2 = clamp((S - 1.0) / 0.9);
        const half = lerp(4000, LH * S * 0.62, k2);
        const fade = lerp(4000, LH * S * 1.35, k2);
        const band = `linear-gradient(180deg, transparent calc(50% - ${fade}px), black calc(50% - ${half}px), black calc(50% + ${half}px), transparent calc(50% + ${fade}px))`;
        css(sharpL.wrap, { maskImage: band, webkitMaskImage: band } as any);
        css(blurL.wrap, { opacity: 0.55 * k2, filter: `blur(${(7 * k2).toFixed(2)}px)` });
      },
    };
  },
};
export default terminal;
