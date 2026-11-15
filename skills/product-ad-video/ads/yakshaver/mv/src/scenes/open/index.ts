// Scene `open` (anthem 0-4 s): the hook. Raw Markdown typed on 16ths in a macro shot, then the file in
// its editor with the first line of copy, then a stop where only the caret survives.
import type { SceneDef } from '../../engine/stage';
import { box, css, el, tf } from '../../engine/dom';
import { clamp, ease, lerp, noise1, seg } from '../../engine/anim';
import { SIXTEENTH } from '../../engine/time';
import { Code } from '../../ui/code';
import { Headline } from '../../ui/text';
import { NavyBg, Win } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C, SYN } from '../../brand/tokens';

export interface OpenProps {
  /** Local time of the cut to the window shot (default 2.0). */
  cutB?: number;
  /** Local time of the stop (default 3.5). */
  stop?: number;
  line?: string;
  /** When the first line rises (local seconds). */
  lineIn?: number;
  /** One locked-off shot for the whole scene: the file fits the frame, no camera move, no window shot, no stop (anthem v2). */
  fixed?: boolean;
  /** `fixed`: the still beat before the first keystroke, and when the last one lands (local seconds). */
  typeStart?: number;
  typeEnd?: number;
  /** After the scene's end, the whole frame shrinks into this stage rect over `dur` s (default 0.5) and fades in its
   *  last part, onto the next scene's window (anthem round 8: the developer's window). Give the entry that much `post`
   *  and a z above the next scene. */
  shrink?: { x: number; y: number; w: number; h: number; dur?: number };
}

export const MD = `---
title: Fieldnote
blocks:
  - _template: hero
    headline: Notes your whole team actually reads.
    image: /uploads/fieldnote-workspace.png
---`;

/** The same file for 9:16, with lines short enough to set it large: the headline folds onto a second line (still valid
 *  YAML) and the image path is shorter. */
export const MD_PORTRAIT = `---
title: Fieldnote
blocks:
  - _template: hero
    headline: Notes your whole
      team actually reads.
    image: /uploads/fieldnote.png
---`;

const FILES = ['content/', '  pages/', '    home.mdx', '    about.mdx', '    pricing.mdx', '  posts/', '    fieldnote-3.mdx', '    offline-mode.mdx', '    roadmap.mdx', '  authors/', '    maya.json', 'tina/', '  config.ts'];

const open: SceneDef<OpenProps> = {
  id: 'open',
  setup({ root, W, H, portrait }, props) {
    const fixed = props.fixed ?? false;
    const cutB = fixed ? Infinity : props.cutB ?? 2.0;
    const stop = fixed ? Infinity : props.stop ?? 3.5;
    const typeStart = fixed ? props.typeStart ?? 0.5 : 0;
    const typeEnd = fixed ? props.typeEnd ?? 2.6 : (props.cutB ?? 2.0) - 2 * SIXTEENTH;
    const bg = new NavyBg(root, W, H);

    // Shot A: macro, with a depth-of-field band around the caret line (not in the fixed shot).
    const macro = box({ inset: '0', perspective: '1400px' });
    const plane = box({ left: `${W * (fixed ? 0.1 : 0.16)}px`, top: '0', width: `${W * 1.1}px`, height: `${H}px`, transformStyle: 'preserve-3d' });
    const blurWrap = box({ inset: '0', filter: 'blur(7px)', opacity: '0.55' });
    const sharpWrap = box({ inset: '0' });
    plane.append(blurWrap, sharpWrap);
    macro.append(plane);
    root.append(macro);
    // The fixed shot sets the whole file (longest line about 50 characters) inside the frame.
    // Portrait: the short-line file at 44 px fills the width inside the 6% side margins.
    const md = fixed && portrait ? MD_PORTRAIT : MD;
    const size = fixed ? (portrait ? 44 : 50) : 88;
    const blurCode = new Code(blurWrap, { code: md, lang: 'md', size, lineHeight: 1.5 });
    const sharpCode = new Code(sharpWrap, { code: md, lang: 'md', size, lineHeight: 1.5 });
    const gutter = box({ left: portrait ? '-84px' : '-120px', top: '0', font: `400 ${size}px/1.5 ${FONT.mono}`, color: SYN.gutter, textAlign: 'right', width: portrait ? '60px' : '80px', whiteSpace: 'pre' });
    gutter.textContent = md.split('\n').map((_, i) => String(i + 1)).join('\n');
    // The fixed shot is sharp end to end: no depth-of-field band, so the whole file reads from the first frame.
    if (fixed) css(blurWrap, { display: 'none' });
    (fixed ? sharpWrap : blurWrap).append(gutter);

    // Shot B: the file in its editor window with a file tree; the first line of copy.
    const shotB = box({ inset: '0' });
    root.append(shotB);
    const win = new Win(shotB, { w: 1060, h: 700, dark: true, title: 'content/pages/home.mdx' });
    const tree = box({ left: '0', top: '0', bottom: '0', width: '250px', background: SYN.panel, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '18px 0 0 18px', font: `400 17px/1.95 ${FONT.mono}`, color: SYN.dim, whiteSpace: 'pre' });
    tree.innerHTML = FILES.map((f) => (f.trim() === 'home.mdx' ? `<span style="color:${C.orange}">${f}</span>` : f)).join('\n');
    win.body.append(tree);
    const codeB = new Code(win.body, { code: MD, lang: 'md', size: 25, lineHeight: 1.6 });
    css(codeB.pre, { left: '290px', top: '28px' });
    // A soft scrim keeps the line readable over the macro code in shot A.
    const scrim = box({ left: '0', top: '0', width: `${W}px`, height: `${H}px`, background: `linear-gradient(0deg, ${C.ink2}F2 0%, ${C.ink2}D0 34%, ${C.ink2}00 62%)` });
    root.append(scrim);
    const line = new Headline(root, { text: props.line ?? 'Your content\nlives in *Markdown.*', size: 112, color: '#fff', lineHeight: 1.04 });
    line.place({ left: `${W * 0.065}px`, top: `${H * 0.33}px` });

    // The caret that survives the stop.
    const caret = box({ left: `${W / 2 - 14}px`, top: `${H / 2 - 32}px`, width: '28px', height: '64px', background: C.orange, boxShadow: `0 0 30px ${C.orange}AA` });
    root.append(caret);

    const lines = md.split('\n');
    const total = md.length;
    // Typing locked to 16ths, in chunks, from typeStart to typeEnd.
    const typedAt = (t: number) => Math.min(total, Math.round((Math.floor(Math.max(0, t - typeStart) / SIXTEENTH) / ((typeEnd - typeStart) / SIXTEENTH)) * total));
    const rawFollow = (t: number) => {
      const n = typedAt(t);
      let k = 0, li = 0;
      for (; li < lines.length; li++) { k += lines[li].length + 1; if (k > n) break; }
      li = Math.min(li, lines.length - 1);
      const col = Math.max(0, n - (k - lines[li].length - 1));
      return Math.max(0, W * 0.16 + col * size * 0.6 - W * 0.6);
    };

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = 0.45;
        const inA = t < cutB;
        const inB = t >= cutB && t < stop;
        css(bg.root, { opacity: t < stop ? 1 : 0 });
        bg.update(t);

        const n = typedAt(t);

        css(macro, { display: inA ? '' : 'none' });
        if (inA) {
          blurCode.update(n);
          sharpCode.update(n, Math.floor(t * 4) % 2 === 0 || (n > 0 && n < total));
          // Which line is the caret on?
          let k = 0, li = 0;
          for (; li < lines.length; li++) { k += lines[li].length + 1; if (k > n) break; }
          li = Math.min(li, lines.length - 1);
          const lh = size * 1.5;
          const camY = H * 0.5 - (li + 0.5) * lh;
          const band = `linear-gradient(180deg, transparent ${((li + 0.5) * lh - lh * 1.2 + 0).toFixed(0)}px, black ${((li + 0.5) * lh - lh * 0.55).toFixed(0)}px, black ${((li + 0.5) * lh + lh * 0.55).toFixed(0)}px, transparent ${((li + 0.5) * lh + lh * 1.2).toFixed(0)}px)`;
          if (!fixed) css(sharpWrap, { maskImage: band, webkitMaskImage: band } as any);
          if (fixed) {
            // Locked off: the same slight 3D tilt, no move. The file sits in the top half, the line under it.
            css(plane, { transform: tf({ x: 0, y: H * (portrait ? 0.16 : 0.13), rx: 10, ry: -8, r: -1.5, s: 1 }) });
          } else {
            // Camera: glide to the caret line, slight 3D tilt, slow push.
            const smoothY = camY + noise1(t * 0.8, 3) * 6;
            // Keep the caret inside the frame on long lines: follow its column past 60% of the width,
            // low-passed over the last 0.4 s so the camera glides instead of stepping with each 16th.
            let follow = 0;
            for (let j = 0; j < 12; j++) follow += rawFollow(t - j * 0.035) / 12;
            css(plane, { transform: tf({ x: -t * 30 - follow, y: smoothY, rx: 14 - t * 2, ry: -10, r: -2, s: 1.0 + t * 0.03 }) });
          }
        }

        css(shotB, { display: inB ? '' : 'none' });
        if (inB) {
          const lb = t - cutB;
          codeB.update(total, Math.floor(lb * 4) % 2 === 0);
          const e = ease.snap(seg(lb, 0, 0.6));
          css(win.root, { transform: tf({ x: lerp(W * 0.8, W * 0.565, e) + lb * -14, y: H * 0.18, persp: 2200, ry: lerp(-30, -15, e), rx: 4, s: 0.93 + lb * 0.02 }) });
          win.sheenAt(seg(lb, 0.2, 1.3));
        }

        // The line lands early (sound-off viewers get the point in shot A) and carries across the cut.
        const lineIn = props.lineIn ?? 0.6;
        line.update(t, { in: lineIn, stagger: 0.08, out: fixed ? (props.shrink ? f.dur - 0.05 : undefined) : stop - 0.12, outDur: props.shrink ? 0.2 : 0.12 });
        css(scrim, { opacity: inA ? clamp((t - lineIn + 0.2) * 3) : 0 });
        // Shot A: the line sits low, under the caret band; at the cut it glides up to its shot-B place.
        const up = fixed ? 0 : ease.snap(seg(t, cutB, cutB + 0.4));
        line.place({ top: `${lerp(H * (fixed && portrait ? 0.48 : 0.64), H * 0.33, up).toFixed(1)}px` });

        // The stop: black, the caret alone, blinking on 8ths.
        const inStop = t >= stop;
        const blinkOn = Math.floor((t - stop) / 0.25) % 2 === 0;
        css(caret, { display: inStop ? '' : 'none', opacity: blinkOn ? 1 : 0.15 });
        if (inStop) f.post.vignette = 0;
        root.style.background = inStop ? '#000' : '';

        // The shrink into the next scene's window: one uniform scale (the window is close to 16:9), rounded corners,
        // and a fade over its last 45%, so the open's file hands over to the window's own copy of it.
        if (props.shrink) {
          const r = props.shrink;
          const p = ease.inOutCubic(seg(t, f.dur, f.dur + (r.dur ?? 0.5)));
          const s = lerp(1, r.w / W, p);
          const x = lerp(W / 2, r.x + r.w / 2, p) - W / 2, y = lerp(H / 2, r.y + r.h / 2, p) - H / 2;
          css(root, p > 0
            ? { transform: tf({ x, y, s }), borderRadius: `${(lerp(0, 14, p) / s).toFixed(1)}px`, opacity: 1 - ease.inQuad(seg(p, 0.55, 1)) }
            : { transform: 'none', borderRadius: '0', opacity: 1 });
        }
      },
    };
  },
};
export default open;
