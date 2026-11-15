// A code window with a gutter, a scrolling body and a typed reveal driven by a per-line schedule.
import { box, css, tf } from '../../engine/dom';
import { clamp, ease, seg } from '../../engine/anim';
import { Code, type Lang } from '../../ui/code';
import { Win, type Rect } from '../../ui/kit';
import { FONT } from '../../brand/fonts';
import { C, SYN } from '../../brand/tokens';

export interface LineTime {
  /** When the line's last character lands. */
  end: number;
  /** How long it takes to type (a multiple of a 16th). */
  dur: number;
}

export interface CodePanelOpts {
  rect: Rect;
  title: string;
  lang: Lang;
  code: string;
  size: number;
  lh?: number;
  chrome?: number;
  /** Line numbers (default true). */
  gutter?: boolean;
}

const STEP = 0.125;

export class CodePanel {
  win: Win;
  code: Code;
  lines: string[];
  cw: number;
  lhPx: number;
  chrome: number;
  padTop = 20;
  padLeft: number;
  gutterW: number;
  bodyH: number;
  private gutter: HTMLDivElement;
  private starts: number[] = [];
  private bars: HTMLDivElement[] = [];

  constructor(parent: HTMLElement, public o: CodePanelOpts) {
    this.chrome = o.chrome ?? 52;
    this.win = new Win(parent, { w: o.rect.w, h: o.rect.h, dark: true, title: o.title, chrome: this.chrome });
    css(this.win.root, { left: o.rect.x, top: o.rect.y });
    this.lhPx = o.size * (o.lh ?? 1.56);
    this.cw = o.size * 0.6001;
    const g = o.gutter !== false;
    this.gutterW = g ? Math.round(this.cw * 3 + 26) : 0;
    this.padLeft = g ? this.gutterW + 14 : 30;
    this.bodyH = o.rect.h - this.chrome;
    this.lines = o.code.split('\n');
    let k = 0;
    for (const l of this.lines) { this.starts.push(k); k += l.length + 1; }
    this.gutter = box({
      left: '0', top: `${this.padTop}px`, width: `${this.gutterW}px`, font: `400 ${o.size * 0.82}px/${this.lhPx}px ${FONT.mono}`, color: SYN.gutter, textAlign: 'right', whiteSpace: 'pre', paddingRight: '14px',
    });
    this.gutter.textContent = this.lines.map((_, i) => String(i + 1)).join('\n');
    // Match the gutter's line height to the code: its font is smaller, so use explicit line boxes.
    css(this.gutter, { lineHeight: `${this.lhPx}px` });
    // Highlight bars live behind the text (the kit's own `hi` option splits spans at newlines, so it is not used).
    for (let i = 0; i < 3; i++) {
      const b = box({ left: '0', top: '0', right: '0', height: `${this.lhPx}px`, background: 'rgba(236,72,21,0.16)', boxShadow: `inset 3px 0 0 ${C.orange}`, opacity: '0' });
      this.bars.push(b);
      this.win.body.append(b);
    }
    if (g) this.win.body.append(this.gutter);
    this.code = new Code(this.win.body, { code: o.code, lang: o.lang, size: o.size, lineHeight: o.lh ?? 1.56 });
    css(this.code.pre, { left: this.padLeft, top: this.padTop, minWidth: o.rect.w - this.padLeft - 6 });
  }

  /** Characters revealed at time t given the per-line schedule (typed on 16ths). */
  charsAt(t: number, times: LineTime[]) {
    let n = 0;
    for (let i = 0; i < this.lines.length; i++) {
      const lt = times[i];
      const len = this.lines[i].length;
      const t0 = lt.end - lt.dur;
      if (t < t0 - 1e-6) break;
      const steps = Math.max(1, Math.round(lt.dur / STEP));
      const k = Math.floor((t - t0) / STEP + 1e-6) + 1;
      const frac = Math.min(1, k / steps);
      // The caret rests at the end of a finished line until the next one starts to type.
      n = this.starts[i] + Math.ceil(len * frac);
      if (frac < 1) break;
    }
    return Math.min(this.o.code.length, n);
  }

  /** The line a given character index sits on. */
  lineOf(n: number) {
    let li = 0;
    for (let i = 0; i < this.starts.length; i++) if (this.starts[i] <= n) li = i;
    return li;
  }

  /** Smooth auto-scroll so the typing line sits near `at` of the body height. */
  scrollAt(t: number, times: LineTime[], at = 0.64) {
    const maxScroll = Math.max(0, this.padTop * 2 + this.lines.length * this.lhPx - this.bodyH);
    let s = 0;
    let prev = 0;
    for (let i = 0; i < this.lines.length; i++) {
      const lt = times[i];
      const tStart = lt.end - lt.dur;
      const target = clamp((i + 1) * this.lhPx + this.padTop - at * this.bodyH, 0, maxScroll);
      if (i === 0) { s = target; prev = target; continue; }
      s += (target - prev) * ease.outCubic(seg(t, tStart, tStart + 0.2));
      prev = target;
    }
    return s;
  }

  /** Absolute y of the centre of line i in the scene, for scroll `sc`. */
  lineY(i: number, sc: number) {
    return this.o.rect.y + this.chrome + this.padTop + (i + 0.5) * this.lhPx - sc;
  }

  /** Absolute x of the end of line i's text (for a typed line of its full length). */
  lineEndX(i: number) {
    return this.o.rect.x + this.padLeft + this.lines[i].length * this.cw;
  }

  /** Apply the reveal and scroll. */
  render(n: number, caret: boolean, hi: { line: number; a: number }[], sc: number) {
    this.code.update(n, caret);
    this.bars.forEach((b, i) => {
      const h = hi[i];
      if (!h) { css(b, { opacity: 0 }); return; }
      css(b, { opacity: h.a, transform: tf({ y: this.padTop + h.line * this.lhPx - sc }) });
    });
    css(this.code.pre, { transform: tf({ y: -sc }) });
    css(this.gutter, { transform: tf({ y: -sc }) });
  }
}

export { type Rect };
