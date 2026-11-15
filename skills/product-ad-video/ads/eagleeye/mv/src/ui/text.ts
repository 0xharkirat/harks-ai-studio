// Kinetic headlines: words rise out of a mask on a stagger, one *emphasised* word gets the orange gradient.
import { el, css, tf } from '../engine/dom';
import { clamp, ease } from '../engine/anim';
import { FONT } from '../brand/fonts';
import { C, GRAD_TITLE } from '../brand/tokens';

export interface HeadlineOpts {
  /** Text; wrap the emphasised word(s) in *asterisks*. Use \n for a line break. */
  text: string;
  size: number;
  color?: string;
  weight?: number;
  font?: string;
  tracking?: number;
  lineHeight?: number;
  align?: 'left' | 'center' | 'right';
  /** Gradient for *emphasis* (CSS background). */
  emph?: string;
  maxWidth?: number;
}

export interface HeadlineAnim {
  /** Entrance start time (local seconds). */
  in: number;
  /** Exit start time; omit for no exit. */
  out?: number;
  /** Seconds between words. */
  stagger?: number;
  /** Duration of one word's entrance. */
  dur?: number;
  /** 'rise' (masked slide up), 'pop' (scale + blur), 'type' (instant per word). */
  mode?: 'rise' | 'pop' | 'type';
  outDur?: number;
  /** Explicit per-word entrance times (overrides stagger), e.g. beat-locked. */
  times?: number[];
}

export class Headline {
  root: HTMLDivElement;
  words: { outer: HTMLSpanElement; inner: HTMLSpanElement }[] = [];

  constructor(parent: HTMLElement, public o: HeadlineOpts) {
    this.root = el('div', {
      style: {
        position: 'absolute',
        fontFamily: o.font ?? FONT.head,
        fontWeight: String(o.weight ?? 600),
        fontSize: `${o.size}px`,
        lineHeight: String(o.lineHeight ?? 1.02),
        letterSpacing: `${o.tracking ?? -0.025}em`, // tina.io headings: tracking-tight, -0.025em
        color: o.color ?? C.ink, // tina.io/design: every heading is ink (--text-strong)
        textAlign: o.align ?? 'left',
        whiteSpace: 'pre-wrap',
        maxWidth: o.maxWidth ? `${o.maxWidth}px` : '',
      },
    });
    const lines = o.text.split('\n');
    lines.forEach((line, li) => {
      const parts = line.split(/(\*[^*]+\*)/).filter(Boolean);
      for (const part of parts) {
        const emph = part.startsWith('*') && part.endsWith('*');
        const clean = emph ? part.slice(1, -1) : part;
        // Split into words but keep spaces attached so wrapping stays natural.
        for (const w of clean.split(/(?<=\s)/)) {
          if (!w) continue;
          const outer = el('span', { style: { display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '0.12em', marginBottom: '-0.12em', paddingRight: '0.04em', marginRight: '-0.04em' } });
          const inner = el('span', { text: w.replace(/ /g, ' '), style: { display: 'inline-block', willChange: 'transform' } });
          if (emph) {
            // The fill is clipped to the text but painted only inside the span's box: pad the box down (and take the
            // pad back with a negative margin, so the layout stays) or the descenders of g, p and y lose their tails.
            css(inner, { backgroundImage: o.emph ?? GRAD_TITLE, webkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', webkitTextFillColor: 'transparent', paddingBottom: '0.16em', marginBottom: '-0.16em' } as any);
          }
          outer.append(inner);
          this.root.append(outer);
          this.words.push({ outer, inner });
        }
      }
      if (li < lines.length - 1) this.root.append(el('br'));
    });
    parent.append(this.root);
  }

  place(s: Record<string, string | number>) {
    css(this.root, s);
    return this;
  }

  update(t: number, a: HeadlineAnim) {
    const stagger = a.stagger ?? 0.07;
    const dur = a.dur ?? 0.55;
    const mode = a.mode ?? 'rise';
    const outDur = a.outDur ?? 0.3;
    const n = this.words.length;
    let any = false;
    this.words.forEach((w, i) => {
      const t0 = a.times?.[Math.min(i, a.times.length - 1)] ?? a.in + i * stagger;
      let p = clamp((t - t0) / dur);
      if (mode === 'type') p = t >= t0 ? 1 : 0;
      let q = 0;
      if (a.out != null) q = clamp((t - (a.out + (n - 1 - i) * 0.02)) / outDur);
      const vis = p > 0 && q < 1;
      any ||= vis;
      if (!vis) {
        css(w.inner, { opacity: 0 });
        return;
      }
      const e = ease.snap(p);
      const eo = ease.inCubic(q);
      if (mode === 'pop') {
        css(w.inner, {
          opacity: Math.min(1, p * 3) * (1 - eo),
          transform: tf({ y: (1 - e) * 0.25 * this.o.size - eo * 0.3 * this.o.size, s: 0.85 + 0.15 * ease.outBack(p) }),
          filter: p < 1 ? `blur(${((1 - e) * 10).toFixed(2)}px)` : 'none',
        });
      } else {
        css(w.inner, {
          opacity: (mode === 'type' ? 1 : Math.min(1, p * 2.5)) * (1 - eo),
          transform: tf({ y: (1 - e) * 1.05 * this.o.size - eo * 0.9 * this.o.size }),
          filter: 'none',
        });
      }
    });
    css(this.root, { visibility: any ? 'visible' : 'hidden' });
  }
}

/** A small tracked label (eyebrow), e.g. "VISUAL EDITING". */
/** tina.io/design EYEBROW (SLUB): IBM Plex Sans Medium, 0.1em, uppercase, slate-500 (white at 75% on dark). */
export function eyebrow(parent: HTMLElement, text: string, color = C.text2, size = 18) {
  const e = el('div', {
    text,
    style: { position: 'absolute', fontFamily: FONT.head, fontWeight: '500', fontSize: `${size}px`, letterSpacing: '0.1em', textTransform: 'uppercase', color },
  });
  parent.append(e);
  return e;
}
