import {Easing} from 'remotion';
import {FONT} from './fonts';
import {easeInOut, easeInOutSine, easeOut, easeOutBack, type EaseFn} from './motion';

/**
 * A theme is a set of tokens. Scenes read tokens and never name a theme, so one script renders in any style
 * with one flag (channel/style_test.md). Tokens: palette, line treatment, paper texture, fonts, easing, guide.
 *
 *   A  clean data              clean lines, flat colour, editorial labels
 *   B  sketch + guide          boiling hand-drawn lines, paper grain, the stick-figure guide always on
 *   C  clean data + guide      theme A, with the guide at story turns
 *   D  flat                    stub: the palette and font only, structure as theme A
 */

export type ThemeId = 'A' | 'B' | 'C' | 'D';

export interface Palette {
  bg: string; // frame background
  bgDeep: string; // the darker end of the background gradient
  text: string; // text on the background
  textMuted: string;
  ink: string; // diagram lines and strokes on the background
  accent: string;
  accentSoft: string;
  accent2: string;
  good: string;
  bad: string;
  panel: string; // plate fill
  panelText: string;
  panelMuted: string;
  panelEdge: string;
  halo: string; // outline behind text that sits on a map, so it reads over land and sea
  series: string[]; // categorical colours for orbits and charts
  map: {ocean0: string; ocean1: string; land: string; landWash: string; landHatch: string; coast: string; border: string; grid: string; label: string; oceanLabel: string};
  globe: {space0: string; space1: string; space2: string; sea0: string; sea1: string; sea2: string; land0: string; land1: string; land2: string; coast: string; grid: string; rim: string; halo: string};
  mark: {yellow: string; red: string; blue: string; green: string; orange: string; skin: string};
  chart: {bar: string; barDim: string; axis: string; grid: string};
  /**
   * The night map (NightMap). `ramp` runs from the dimmest light that shows to the brightest, at least 3 stops of
   * 6-digit hex, and its luminance must rise along it, so a brighter place is never a darker colour.
   */
  night: {sea: string; land: string; coast: string; border: string; label: string; ramp: string[]};
}

export interface Theme {
  id: ThemeId;
  name: string;
  summary: string;
  stub?: boolean;
  palette: Palette;
  line: {
    boil: boolean; // lines are redrawn about 12 times a second
    roughness: number; // rough.js roughness for hand-drawn parts
    weight: number; // stroke weight multiplier
    boilFps: number;
    wobble: number; // px of displacement in the boil filter
  };
  paper: {kind: 'none' | 'ruled'; grain: number; fibers: boolean; vignette: number};
  fonts: {
    display: string;
    displayWeight: number;
    body: string;
    bodyWeight: number;
    number: string;
    numberWeight: number;
    serif: string;
    boost: number; // hand fonts are small for their size: every size is multiplied by this (never lowered)
    caps: boolean; // tags and kickers in capitals with wide tracking
  };
  ease: {enter: EaseFn; move: EaseFn; pop: EaseFn};
  guide: {on: boolean; mode: 'always' | 'turns'; sticker: boolean; boil: boolean};
  fill: {land: 'solid' | 'hatch'};
  plate: 'card' | 'marker';
}

const A: Palette = {
  bg: '#0a1e2b',
  bgDeep: '#06121b',
  text: '#ffffff',
  textMuted: '#9cc7de',
  ink: '#e8f1f6',
  accent: '#ff7a21',
  accentSoft: '#ffd2ab',
  accent2: '#58c4dd',
  good: '#4cc36b',
  bad: '#ff5a4f',
  panel: 'rgba(8,24,34,0.9)',
  panelText: '#ffffff',
  panelMuted: '#9cc7de',
  panelEdge: 'rgba(255,255,255,0.14)',
  halo: '#ece4cf',
  series: ['#ff7a21', '#58c4dd', '#8ddc8c', '#f4d345', '#c58cff'],
  map: {ocean0: '#17475f', ocean1: '#0a2230', land: '#ece4cf', landWash: '#ece4cf', landHatch: 'transparent', coast: '#a89f86', border: '#c3b9a0', grid: 'rgba(255,255,255,0.065)', label: '#4a4435', oceanLabel: '#86b5cf'},
  globe: {space0: '#0d1f3d', space1: '#060f22', space2: '#02050e', sea0: '#3a93cf', sea1: '#1c5f99', sea2: '#081f3d', land0: '#e0e9b0', land1: '#b3c685', land2: '#6f8860', coast: '#7c9163', grid: 'rgba(190,225,255,0.14)', rim: '#8fd3ff', halo: '#6cc0ff'},
  mark: {yellow: '#f4d345', red: '#ff5a4f', blue: '#58c4dd', green: '#4cc36b', orange: '#ff7a21', skin: '#f2c9a3'},
  chart: {bar: '#ff7a21', barDim: '#3c6a85', axis: '#9cc7de', grid: 'rgba(156,199,222,0.18)'},
  night: {sea: '#04101a', land: '#0d1f2d', coast: 'rgba(120,170,200,0.55)', border: 'rgba(156,199,222,0.42)', label: '#8fb2c6', ramp: ['#7a2e06', '#e0650f', '#ffa63d', '#ffe0a0', '#ffffff']},
};

const B: Palette = {
  bg: '#fbf6e8',
  bgDeep: '#efe6cc',
  text: '#242730',
  textMuted: '#5b5f6b',
  ink: '#242730',
  accent: '#e2453c',
  accentSoft: '#ffd93d',
  accent2: '#2f6fd0',
  good: '#3ea26a',
  bad: '#e2453c',
  panel: 'rgba(255,217,61,0.78)',
  panelText: '#242730',
  panelMuted: '#6a5a2a',
  panelEdge: '#242730',
  halo: '#fbf6e8',
  series: ['#e2453c', '#2f6fd0', '#3ea26a', '#f08a24', '#8a5cc7'],
  map: {ocean0: 'rgba(96,190,240,0.5)', ocean1: 'rgba(96,190,240,0.5)', land: '#fbf6e8', landWash: 'rgba(255,206,92,0.7)', landHatch: 'rgba(240,138,36,0.7)', coast: '#242730', border: 'rgba(36,39,48,0.32)', grid: 'rgba(47,111,208,0.28)', label: '#242730', oceanLabel: '#2f6fd0'},
  globe: {space0: '#fbf6e8', space1: '#fbf6e8', space2: '#efe6cc', sea0: 'rgba(96,190,240,0.55)', sea1: 'rgba(96,190,240,0.55)', sea2: 'rgba(96,190,240,0.55)', land0: 'rgba(255,206,92,0.7)', land1: 'rgba(255,206,92,0.7)', land2: 'rgba(255,206,92,0.7)', coast: '#242730', grid: 'rgba(47,111,208,0.3)', rim: '#242730', halo: 'transparent'},
  mark: {yellow: '#ffd93d', red: '#e2453c', blue: '#2f6fd0', green: '#3ea26a', orange: '#f08a24', skin: '#f6c9a0'},
  chart: {bar: '#e2453c', barDim: '#2f6fd0', axis: '#242730', grid: 'rgba(47,111,208,0.25)'},
  night: {sea: '#171f3d', land: '#232d57', coast: 'rgba(251,246,232,0.8)', border: 'rgba(251,246,232,0.5)', label: '#e9e2cc', ramp: ['#a2341f', '#e2453c', '#f08a24', '#ffd93d', '#fff6d6']},
};

// Theme D (flat) is a stub: bold flat colours and one rounded font. Scenes use the clean structure with these tokens.
const D: Palette = {
  ...A,
  bg: '#fff1d6',
  bgDeep: '#ffe2ad',
  text: '#1d1d3a',
  textMuted: '#5a5a80',
  ink: '#1d1d3a',
  accent: '#ff5d5d',
  accentSoft: '#ffd0d0',
  accent2: '#2bb3a3',
  good: '#2bb3a3',
  bad: '#ff5d5d',
  panel: '#ffffff',
  panelText: '#1d1d3a',
  panelMuted: '#5a5a80',
  panelEdge: '#1d1d3a',
  halo: '#fff1d6',
  series: ['#ff5d5d', '#2bb3a3', '#ffc83d', '#4a7cff', '#9b5cff'],
  map: {ocean0: '#4a7cff', ocean1: '#4a7cff', land: '#ffc83d', landWash: '#ffc83d', landHatch: 'transparent', coast: '#1d1d3a', border: 'rgba(29,29,58,0.35)', grid: 'rgba(255,255,255,0.18)', label: '#1d1d3a', oceanLabel: '#d8e3ff'},
  mark: {yellow: '#ffc83d', red: '#ff5d5d', blue: '#4a7cff', green: '#2bb3a3', orange: '#ff9a3d', skin: '#f6c9a0'},
  chart: {bar: '#ff5d5d', barDim: '#4a7cff', axis: '#1d1d3a', grid: 'rgba(29,29,58,0.15)'},
};

const cleanLine = {boil: false, roughness: 0.6, weight: 1, boilFps: 12, wobble: 0} as const;
const cleanFonts = {
  display: FONT.inter,
  displayWeight: 800,
  body: FONT.inter,
  bodyWeight: 700,
  number: FONT.inter,
  numberWeight: 800,
  serif: FONT.serif,
  boost: 1,
  caps: true,
} as const;
const cleanEase = {enter: easeOut, move: easeInOutSine, pop: easeOutBack};

const THEME_A: Theme = {
  id: 'A',
  name: 'Clean data',
  summary: 'Clean lines, flat colour, editorial labels. No guide.',
  palette: A,
  line: {...cleanLine},
  paper: {kind: 'none', grain: 0, fibers: false, vignette: 0.38},
  fonts: {...cleanFonts},
  ease: cleanEase,
  guide: {on: false, mode: 'turns', sticker: true, boil: true},
  fill: {land: 'solid'},
  plate: 'card',
};

const THEME_B: Theme = {
  id: 'B',
  name: 'Sketch + guide',
  summary: 'Boiling hand-drawn lines, paper grain, the stick-figure guide on screen.',
  palette: B,
  line: {boil: true, roughness: 1.1, weight: 1.15, boilFps: 12, wobble: 7},
  paper: {kind: 'ruled', grain: 14, fibers: true, vignette: 0.22},
  fonts: {display: FONT.caveat, displayWeight: 400, body: FONT.patrick, bodyWeight: 400, number: FONT.caveat, numberWeight: 400, serif: FONT.patrick, boost: 1.12, caps: false},
  ease: {enter: Easing.bezier(0.34, 1.56, 0.64, 1), move: easeInOut, pop: Easing.bezier(0.34, 1.7, 0.64, 1)},
  guide: {on: true, mode: 'always', sticker: false, boil: true},
  fill: {land: 'hatch'},
  plate: 'marker',
};

const THEME_C: Theme = {
  ...THEME_A,
  id: 'C',
  name: 'Clean data + guide',
  summary: 'Theme A, with the guide at story turns.',
  guide: {on: true, mode: 'turns', sticker: true, boil: true},
};

const THEME_D: Theme = {
  ...THEME_A,
  id: 'D',
  name: 'Flat (stub)',
  summary: 'Stub: the flat palette and one rounded font. Structure as theme A. Not complete.',
  stub: true,
  palette: D,
  fonts: {...cleanFonts, display: FONT.fredoka, displayWeight: 700, body: FONT.fredoka, bodyWeight: 600, number: FONT.fredoka, numberWeight: 700},
  paper: {kind: 'none', grain: 0, fibers: false, vignette: 0},
  ease: {enter: easeOut, move: easeInOut, pop: Easing.bezier(0.34, 1.8, 0.64, 1)},
  plate: 'card',
};

export const THEMES: Record<ThemeId, Theme> = {A: THEME_A, B: THEME_B, C: THEME_C, D: THEME_D};

const ALIASES: Record<string, ThemeId> = {
  a: 'A', clean: 'A', data: 'A',
  b: 'B', sketch: 'B', hand: 'B',
  c: 'C', guided: 'C', 'clean-guide': 'C', 'clean+guide': 'C',
  d: 'D', flat: 'D',
};

/** Resolve a theme name from a flag or script.json: "A", "sketch", "clean-guide", "d"... Throws on an unknown name. */
export const resolveThemeId = (name: string | undefined | null): ThemeId => {
  if (name == null || name === '') return 'A';
  const id = ALIASES[String(name).trim().toLowerCase()];
  if (!id) throw new Error(`unknown theme "${name}": use A (clean), B (sketch), C (clean + guide) or D (flat)`);
  return id;
};

export const getTheme = (name?: string | null): Theme => THEMES[resolveThemeId(name)];
