// Subtitle cues built to broadcast rules (Netflix English timed text guide, BBC subtitle guidelines):
// - at most 2 lines of 42 characters, bottom-heavy when split
// - break after punctuation, then before conjunctions, then before prepositions
// - never split an article from its noun, a name, a title like "Software Engineer", a pronoun or
//   auxiliary from its verb, or a number from what it counts; never end a line on "to", "the", "and"...
// - at least 0.8 s on screen, held 0.5 s after the speech ends when nothing follows

export type Line = {say: string; start: number; end: number};
export type Cue = {lines: string[]; start: number; end: number};

const LINE = 42;
const MAX_CUE = LINE * 2;

const ARTICLES = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'every', 'each', 'any', 'some', 'no']);
const PREPS = new Set(['to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'about', 'as', 'via', 'over', 'under', 'between', 'without']);
const CONJS = new Set(['and', 'but', 'or', 'so', 'because', 'if', 'when', 'while', 'than', 'which', 'who', 'where', 'then']);
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they']);
const AUX = new Set(['going', 'is', 'are', 'was', 'were', 'be', 'been', 'will', 'would', 'can', 'could', 'should', 'must', 'have', 'has', 'had', 'do', 'does', 'did', 'not', "don't", "can't", "won't", "isn't", 'never', "i'm", "it's", "you're", "we're", "that's", "here's", "let's", "i'll"]);

// Multi-word terms that read as one unit. Matched case-insensitively.
const TERMS = [
  'done video', 'done videos', 'api key', 'voice clone', 'voice library', 'least privileges', 'environment variable',
  'auto-disable if leaked', 'text to speech', 'sound effects', 'music generation', 'no access', 'write access',
  'ssw tv', 'one prompt', 'one api call', 'lower thirds', 'background music', 'free vibes', 'public github repo',
  'high priest of vibe coders', 'software engineer', 'claude code', 'instant voice cloning', 'hark singh', 'future hark',
];

const bare = (w: string) => w.toLowerCase().replace(/^[^a-z0-9$']+|[^a-z0-9$']+$/g, '');
const capital = (w: string) => /^[A-Z$0-9]/.test(w.replace(/^[^A-Za-z0-9$]+/, ''));

/** Cost of breaking after words[i]. Lower is better; 1000 means never. */
const gapCosts = (words: string[]): number[] => {
  const n = words.length;
  const glued = new Array(n).fill(false); // glued[i]: never break after word i
  const lower = words.map(bare);
  for (const term of TERMS) {
    const t = term.split(' ');
    for (let i = 0; i + t.length <= n; i++) {
      if (t.every((tw, k) => lower[i + k] === tw)) for (let k = 0; k < t.length - 1; k++) glued[i + k] = true;
    }
  }
  return words.map((w, i) => {
    if (i === n - 1) return 0;
    const lw = lower[i];
    const next = words[i + 1];
    const endsSentence = /[.!?]["')]*$/.test(w);
    if (endsSentence) return 0;
    if (glued[i]) return 1000;
    if (/[,;:]$/.test(w) || /[–-]$/.test(w)) return 2;
    if (ARTICLES.has(lw) || PREPS.has(lw) || CONJS.has(lw) || PRONOUNS.has(lw) || AUX.has(lw)) return 1000;
    if (/^[$0-9]/.test(w)) return 1000; // "$6 a month", "4 clips"
    if (capital(w) && capital(next) && i > 0) return 1000; // names and titles: "Hark Singh", "Software Engineer"
    if (CONJS.has(bare(next))) return 4;
    if (PREPS.has(bare(next))) return 5;
    return 8;
  });
};

const length = (words: string[], a: number, b: number) => words.slice(a, b).join(' ').length;

/** Best legal way to show words[a..b) in one or two lines, or null if none exists. */
const layoutLines = (words: string[], cost: number[], a: number, b: number, strict = true): {lines: string[]; cost: number} | null => {
  const whole = words.slice(a, b).join(' ');
  if (whole.length <= LINE) return {lines: [whole], cost: 0};
  let best: {lines: string[]; cost: number} | null = null;
  for (let k = a + 1; k < b; k++) {
    const top = length(words, a, k);
    const bottom = length(words, k, b);
    if (top > LINE || bottom > LINE || (strict && cost[k - 1] >= 1000)) continue;
    // Break quality first, then balance; prefer a bottom-heavy pyramid.
    const stub = Math.min(top, bottom) < 12 ? 40 : 0; // no one- or two-word lines
    const c = cost[k - 1] * 10 + Math.abs(top - bottom) + (top > bottom ? 6 : 0) + stub;
    if (!best || c < best.cost) best = {lines: [words.slice(a, k).join(' '), words.slice(k, b).join(' ')], cost: c};
  }
  return best;
};

/** Split a sentence-level line into cues: dynamic programming over break costs and line layout. */
// Strict first; if a line has no legal break at all (one long name, say), allow the least bad one rather than drop it.
const splitCues = (words: string[], cost: number[], strict = true): {span: [number, number]; lines: string[]}[] => {
  const n = words.length;
  const best = new Array(n + 1).fill(Infinity);
  const prev = new Array(n + 1).fill(-1);
  const shape: (string[] | null)[] = new Array(n + 1).fill(null);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      if (length(words, i, j) > MAX_CUE) break;
      const lay = layoutLines(words, cost, i, j, strict);
      if (!lay) continue;
      const len = length(words, i, j);
      const short = len < 18 && j < n ? (18 - len) * 3 : 0; // avoid flashes of 1-2 words
      const c = best[i] + cost[j - 1] * 10 + short + lay.cost * 0.75;
      if (c < best[j]) {
        best[j] = c;
        prev[j] = i;
        shape[j] = lay.lines;
      }
    }
  }
  if (best[n] === Infinity) return strict ? splitCues(words, cost, false) : [{span: [0, n], lines: [words.join(' ')]}];
  const out: {span: [number, number]; lines: string[]}[] = [];
  for (let j = n; j > 0; j = prev[j]) out.unshift({span: [prev[j], j], lines: shape[j]!});
  return out;
};

export const toCues = (lines: Line[], fps: number): Cue[] => {
  const cues: Cue[] = [];
  lines.forEach((line, li) => {
    const words = line.say.split(/\s+/).filter(Boolean);
    const cost = gapCosts(words);
    const total = words.join(' ').length;
    const span = line.end - line.start;
    const nextLineStart = li + 1 < lines.length ? lines[li + 1].start : Infinity;
    const spans = splitCues(words, cost);
    spans.forEach(({span: [a, b], lines: shown}, k) => {
      // Speech time is spread by characters, which tracks spoken length better than word count.
      const start = line.start + (span * length(words, 0, a)) / total + (a > 0 ? span / total : 0);
      const isLast = k === spans.length - 1;
      const speechEnd = isLast ? line.end : line.start + (span * length(words, 0, b)) / total;
      const end = isLast ? Math.min(speechEnd + Math.round(fps * 0.5), nextLineStart - 2) : speechEnd;
      cues.push({lines: shown, start: Math.round(start), end: Math.round(Math.max(end, start + fps * 0.8))});
    });
  });
  return cues;
};
