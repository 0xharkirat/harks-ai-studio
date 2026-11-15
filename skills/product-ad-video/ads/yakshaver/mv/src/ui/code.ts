// Code panels with a tiny syntax highlighter and a time-driven typing reveal.
import { el, css, esc } from '../engine/dom';
import { FONT } from '../brand/fonts';
import { SYN } from '../brand/tokens';

export type Lang = 'md' | 'ts' | 'graphql' | 'json' | 'diff' | 'sh' | 'plain';
interface Tok { s: string; c: string; b?: boolean }

const RULES: Record<Lang, [RegExp, string, boolean?][]> = {
  md: [
    [/^---$/m, SYN.punct],
    [/^#{1,6} .*$/m, SYN.md, true],
    [/\*\*[^*]+\*\*/, SYN.md, true],
    [/^\s*- /m, SYN.md],
    [/^\s*> /m, SYN.md],
    [/!?\[[^\]]*\]\([^)]*\)/, SYN.fn],
    [/^\s*[\w-]+(?=:)/m, SYN.key],
    [/(?<=: ).+$/m, SYN.str],
    [/:/, SYN.punct],
  ],
  ts: [
    [/\/\/.*$/m, SYN.comment],
    [/'[^']*'|"[^"]*"|`[^`]*`/, SYN.str],
    [/\b(export|default|import|from|const|let|return|type|async|await|function|new)\b/, SYN.kw],
    [/\b(true|false|null|undefined)\b/, SYN.num],
    [/\b\d+(\.\d+)?\b/, SYN.num],
    [/\b[A-Za-z_]\w*(?=\()/, SYN.fn],
    [/\b[A-Za-z_]\w*(?=\s*:)/, SYN.key],
    [/[{}()[\],.;:]/, SYN.punct],
  ],
  graphql: [
    [/#.*$/m, SYN.comment],
    [/\b(query|mutation|fragment|on)\b/, SYN.kw],
    [/"[^"]*"/, SYN.str],
    [/\$\w+/, SYN.num],
    [/\b[A-Za-z_]\w*(?=\s*[({])/, SYN.fn],
    [/\b[A-Za-z_]\w*(?=\s*:)/, SYN.key],
    [/[{}()[\]:!,]/, SYN.punct],
  ],
  json: [
    [/"[^"]*"(?=\s*:)/, SYN.key],
    [/"[^"]*"/, SYN.str],
    [/\b(true|false|null)\b/, SYN.num],
    [/-?\b\d+(\.\d+)?\b/, SYN.num],
    [/[{}[\]:,]/, SYN.punct],
  ],
  diff: [],
  sh: [
    [/^\$|^>/m, SYN.md],
    [/\b(npx|pnpm|npm|git)\b/, SYN.fn],
    [/--?[\w-]+/, SYN.num],
    [/@[\w.-]+/, SYN.str],
  ],
  plain: [],
};

export function tokenize(code: string, lang: Lang): Tok[] {
  if (lang === 'diff') {
    return code.split(/(?<=\n)/).flatMap((line) => {
      const body = line.replace(/\n$/, '');
      const c = body.startsWith('+') ? '#93E9BE' : body.startsWith('-') ? '#FF8F8F' : SYN.dim;
      return line.endsWith('\n') ? [{ s: body, c }, { s: '\n', c }] : [{ s: body, c }];
    });
  }
  const rules = RULES[lang];
  const out: Tok[] = [];
  // Line by line so ^ and $ anchors work per line.
  for (const line of code.split(/(?<=\n)/)) {
    let rest = line.replace(/\n$/, '');
    let lineStart = true;
    while (rest.length) {
      let best: { i: number; len: number; c: string; b?: boolean } | null = null;
      for (const [re, c, b] of rules) {
        const flags = re.flags.includes('m') ? re.flags : re.flags + 'm';
        const r = new RegExp(re.source, flags);
        const m = r.exec(rest);
        if (!m || m[0].length === 0) continue;
        // ^-anchored rules only match at the true line start.
        if (re.source.startsWith('^') && !lineStart) continue;
        if (!best || m.index < best.i) best = { i: m.index, len: m[0].length, c, b };
      }
      if (!best) { out.push({ s: rest, c: SYN.text }); break; }
      if (best.i > 0) out.push({ s: rest.slice(0, best.i), c: SYN.text });
      out.push({ s: rest.slice(best.i, best.i + best.len), c: best.c, b: best.b });
      rest = rest.slice(best.i + best.len);
      lineStart = false;
    }
    if (line.endsWith('\n')) out.push({ s: '\n', c: SYN.text });
  }
  return out;
}

export interface CodeOpts {
  code: string;
  lang: Lang;
  size?: number;
  lineHeight?: number;
  gutter?: boolean;
  /** Text colour overrides for light panels. */
  light?: boolean;
  padding?: number;
}

/** Renders highlighted code into a <pre>; update(n) reveals the first n characters with a caret. */
export class Code {
  pre: HTMLPreElement;
  toks: Tok[];
  total: number;
  lines: number;
  private last = -2;
  private lastCaret = false;
  private lastHi = '';

  constructor(parent: HTMLElement, public o: CodeOpts) {
    const size = o.size ?? 28;
    this.pre = el('pre', {
      style: {
        position: 'absolute', margin: '0', fontFamily: FONT.mono, fontSize: `${size}px`, lineHeight: String(o.lineHeight ?? 1.55),
        color: o.light ? '#334155' : SYN.text, whiteSpace: 'pre', padding: `${o.padding ?? 0}px`, tabSize: '2', fontVariantLigatures: 'none',
      },
    });
    parent.append(this.pre);
    this.toks = tokenize(o.code, o.lang);
    if (o.light) this.toks = this.toks.map((t) => ({ ...t, c: lightMap[t.c] ?? t.c }));
    this.total = o.code.length;
    this.lines = o.code.split('\n').length;
  }

  /** Reveal n chars; caret blinking state; optional highlighted line numbers (0-based). */
  update(n: number, caret = false, hi: number[] = []) {
    n = Math.max(0, Math.min(this.total, Math.floor(n)));
    const hiKey = hi.join(',');
    if (n === this.last && caret === this.lastCaret && hiKey === this.lastHi) return;
    this.last = n; this.lastCaret = caret; this.lastHi = hiKey;
    // Build per-line HTML so highlighted lines can be wrapped whole.
    const lines: string[] = [''];
    let left = n;
    for (const t of this.toks) {
      if (left <= 0) break;
      const sl = t.s.slice(0, left);
      left -= sl.length;
      if (sl === '\n') { lines.push(''); continue; }
      lines[lines.length - 1] += `<span style="color:${t.c}${t.b ? ';font-weight:600' : ''}">${esc(sl)}</span>`;
    }
    if (caret) lines[lines.length - 1] += `<span style="display:inline-block;width:0.6em;height:1.15em;vertical-align:-0.2em;background:#EC4815;margin-left:1px"></span>`;
    const html = lines
      .map((l, i) => (hi.includes(i) ? `<span style="display:inline-block;min-width:100%;background:rgba(236,72,21,0.16);box-shadow:inset 3px 0 0 #EC4815;margin:0 -12px;padding:0 12px">${l || ' '}</span>` : l))
      .join('\n');
    this.pre.innerHTML = html;
  }

  /** Character index where line `i` (0-based) starts. */
  lineStart(i: number) {
    const ls = this.o.code.split('\n');
    let k = 0;
    for (let j = 0; j < i && j < ls.length; j++) k += ls[j].length + 1;
    return k;
  }
}

const lightMap: Record<string, string> = {
  [SYN.text]: '#334155',
  [SYN.punct]: '#94A3B8',
  [SYN.key]: '#C2410C',
  [SYN.str]: '#047857',
  [SYN.md]: '#EC4815',
  [SYN.fn]: '#0574E4',
  [SYN.kw]: '#7C3AED',
  [SYN.num]: '#0574E4',
  [SYN.comment]: '#94A3B8',
  [SYN.dim]: '#94A3B8',
};

/** Typing schedule: chars typed by time t, at `cps` chars/s from t0, with optional pauses at newlines. */
export function typedCount(t: number, t0: number, cps: number, total: number) {
  if (t <= t0) return 0;
  return Math.min(total, Math.floor((t - t0) * cps));
}
