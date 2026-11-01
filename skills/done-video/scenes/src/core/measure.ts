// Text measuring with a canvas, so plates and wrapped titles are sized from the real font.
// Fonts must be loaded first: ThemeRoot holds back its children until they are.

let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export interface FontSpec {
  family: string;
  weight: number;
  size: number;
  italic?: boolean;
  /** letter spacing in px */
  tracking?: number;
}

export const fontCss = (f: FontSpec) => `${f.italic ? 'italic ' : ''}${f.weight} ${f.size}px ${f.family}`;

export const measureText = (text: string, f: FontSpec): number => {
  const key = `${fontCss(f)}|${f.tracking ?? 0}|${text}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * f.size * 0.58;
  ctx.font = fontCss(f);
  (ctx as unknown as {letterSpacing: string}).letterSpacing = `${f.tracking ?? 0}px`;
  const w = ctx.measureText(text).width;
  cache.set(key, w);
  return w;
};

/** Greedy word wrap to a width. A single word wider than the width stays whole. */
export const wrapText = (text: string, f: FontSpec, maxW: number): string[] => {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && measureText(next, f) > maxW) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
};

/** Balance the lines of a wrapped text: the same line count, with the lines nearer in length. */
export const balanceText = (text: string, f: FontSpec, maxW: number): string[] => {
  const first = wrapText(text, f, maxW);
  if (first.length < 2) return first;
  let lo = 0;
  let hi = maxW;
  let best = first;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const lines = wrapText(text, f, mid);
    if (lines.length > first.length) lo = mid;
    else {
      best = lines;
      hi = mid;
    }
  }
  return best;
};

/** The widest digit of a font, so a ticking number sits in fixed cells and never jitters. */
export const digitCell = (f: FontSpec): number => Math.max(...'0123456789'.split('').map((d) => measureText(d, f)));

/** The width of a number shown in fixed digit cells (see Txt with kind "number"). */
export const measureNumber = (text: string, f: FontSpec): number => {
  const cell = digitCell(f);
  return text.split('').reduce((w, ch) => w + (/\d/.test(ch) ? cell : measureText(ch, f)), 0);
};
