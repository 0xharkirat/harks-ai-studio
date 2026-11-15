// The stack section: ONE line that builds on the beats, "Works with" small above and then
// "Next.js · Astro · Hugo" landing word by word (type only, no logos), then held; optionally
// "Free and open source." after it. With `lines`, short centred lines land one per beat instead, under
// the label when one is given (the anthem: "WORKS WITH" / "Astro." / "Next.js." / "Or bring your own.").
import { box, css, el, tf } from '../../engine/dom';
import { clamp, spring } from '../../engine/anim';
import { Headline } from '../../ui/text';
import { FONT } from '../../brand/fonts';
import { C } from '../../brand/tokens';
import type { Frame } from '../../engine/stage';

/** One word of the line and the local time it lands. */
export interface StackName { text: string; t: number }

export interface StackSection {
  root: HTMLDivElement;
  update(ts: number, f: Frame): void;
}

/** Width of `text` in the heading font at `size` px (the heading tracking is -0.04em). */
function measure(text: string, size: number) {
  const c = document.createElement('canvas').getContext('2d')!;
  c.font = `600 ${size}px ${FONT.head}`;
  (c as any).letterSpacing = `${-0.04 * size}px`;
  return c.measureText(text).width;
}

export function buildStack(parent: HTMLElement, W: number, H: number, names: StackName[], oss: number | false, ossWords: string, label = 'WORKS WITH', lines?: StackName[]): StackSection {
  const root = box({ inset: '0' });
  parent.append(root);

  if (lines?.length) {
    // One short line per beat, stacked and centred; each lands hard with a small pop, then holds.
    // 9:16: fit the widest line to 88% of the width, centred in the safe band (14%-65%).
    const tall = H > W;
    const LS = tall ? Math.min(150, Math.floor(((W * 0.88) / Math.max(...lines.map((l) => measure(l.text.replace(/\*/g, ''), 100)))) * 100)) : 150, LH = LS * 1.08;
    const top = (tall ? H * 0.42 : H / 2) - (lines.length * LH) / 2;
    const eyebrowL = label
      ? el('div', { text: label, style: { position: 'absolute', left: '0', width: `${W}px`, top: `${top - 82}px`, textAlign: 'center', font: `500 ${tall ? 40 : 32}px ${FONT.head}`, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.75)', opacity: '0' } })
      : null;
    if (eyebrowL) root.append(eyebrowL);
    const heads = lines.map((ln, i) => {
      const h = new Headline(root, { text: ln.text, size: LS, color: '#fff', lineHeight: 1.0, align: 'center' });
      h.place({ left: '0', width: `${W}px`, top: `${top + i * LH}px` });
      return h;
    });
    return {
      root,
      update(ts) {
        // Each line pops on its own. No white flash or zoom kick on the whole frame: it read as a glitch.
        if (eyebrowL) css(eyebrowL, { opacity: clamp((ts - (lines[0].t - 0.3)) / 0.25) });
        lines.forEach((ln, i) => heads[i].update(ts, { in: ln.t, mode: 'pop', stagger: 0.06, dur: 0.38 }));
      },
    };
  }

  // The line, sized so that it fills about 80 % of the width at most (always inside the 115 px margins).
  const joined = names.map((n) => n.text).join(' · ');
  const probe = 100;
  const SIZE = Math.min(170, Math.floor((1500 / measure(joined, probe)) * probe));
  const cy = 520;
  const row = el('div', {
    style: {
      position: 'absolute', left: '0', width: `${W}px`, top: `${cy - SIZE * 0.6}px`, textAlign: 'center', whiteSpace: 'nowrap',
      font: `600 ${SIZE}px/1.1 ${FONT.head}`, letterSpacing: '-0.04em', color: '#fff',
    },
  });
  const spans = names.map((n, i) => {
    const sep = el('span', { text: ' · ', style: { display: 'inline-block', color: C.orange, opacity: '0', whiteSpace: 'pre' } });
    const word = el('span', { text: n.text, style: { display: 'inline-block', opacity: '0', transformOrigin: '50% 60%' } });
    if (i > 0) row.append(sep);
    row.append(word);
    return { sep: i > 0 ? sep : null, word };
  });
  root.append(row);

  const eyebrow = el('div', {
    text: label,
    style: { position: 'absolute', left: '0', width: `${W}px`, top: `${cy - SIZE * 0.6 - 78}px`, textAlign: 'center', font: `500 32px ${FONT.head}`, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.75)', opacity: '0' },
  });
  root.append(eyebrow);

  // The open source line (two headlines).
  const ossSize = 210;
  const [o1, o2] = ossWords.split('\n');
  const ossA = new Headline(root, { text: o1 ?? 'Free and', size: ossSize, color: '#fff', lineHeight: 1.0, align: 'center', tracking: -0.04 });
  ossA.place({ left: '0', width: `${W}px`, top: `${cy - ossSize * 1.05}px` });
  const ossB = new Headline(root, { text: o2 ?? '*open source.*', size: ossSize, color: '#fff', lineHeight: 1.0, align: 'center', tracking: -0.04 });
  ossB.place({ left: '0', width: `${W}px`, top: `${cy - ossSize * 1.05 + ossSize * 1.02}px` });

  return {
    root,
    update(ts, f) {
      const tOss = oss === false ? Infinity : oss;
      const showLine = ts < tOss - 0.003;
      css(row, { display: showLine ? '' : 'none' });
      css(eyebrow, { opacity: showLine && ts >= 0 ? 1 : 0 });
      // Each word lands on its beat: hard in, a small pop, the separator before it lands with it.
      // No white flash or zoom kick on the whole frame: it read as a glitch.
      spans.forEach((sp, i) => {
        const t0 = names[i].t;
        const on = ts >= t0;
        const age = ts - t0;
        const p = on ? spring(age, 4.2, 0.55) : 0;
        css(sp.word, { opacity: on ? 1 : 0, transform: tf({ s: on ? 1.12 - 0.12 * clamp(p, 0, 1.15) : 1, y: on ? (1 - clamp(p, 0, 1)) * 12 : 0 }) });
        if (sp.sep) css(sp.sep, { opacity: on ? 1 : 0 });
      });
      ossA.update(ts, { in: tOss, mode: 'type', stagger: 0.0 });
      ossB.update(ts, { in: tOss + 0.5, mode: 'type', stagger: 0.0 });
    },
  };
}
