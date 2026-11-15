// Tina brand colours, from tina.io/app/global.css and tailwind.config.js.
export const C = {
  orange: '#EC4815',
  orangeHover: '#D13F13',
  orangeLight: '#FFD3C1',
  orange50: '#FFF8F3',
  orange100: '#FFEDE4',
  orange300: '#FFAB8B',
  orange400: '#FF724B',
  orange600: '#D13F13',
  orange800: '#7A230B',
  blue: '#0084FF',
  blue600: '#0574E4',
  blue50: '#DCEEFF',
  blue200: '#85C5FE',
  blue300: '#4EABFE',
  blue900: '#1D2C6C',
  seafoam: '#93E9BE',
  seafoam50: '#EEFDF9',
  seafoam200: '#C1F5EB',
  seafoam900: '#214C3D',
  navy: '#241748',
  navy2: '#31215E',
  ink: '#1C1B2E',
  ink2: '#14132A',
  text: '#0F172A',
  text2: '#64748B',
  line: '#E2E8F0',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  mint: '#53E9DD',
  sky1: '#68D7E4',
  sky2: '#59BFF2',
  sky3: '#4BA8FF',
};

/** Orange gradient used for the emphasised hero keyword and the primary button. */
/** tina.io's page title fill (.role-page-title): orange-400 at the top, orange-500 at 45 %, orange-700 at the bottom. */
export const GRAD_TITLE = 'linear-gradient(180deg, #FF724B 0%, #EC4815 45%, #A5310F 100%)';
export const GRAD_ORANGE = `linear-gradient(135deg, ${C.orange400} 0%, ${C.orange} 50%, ${C.orange600} 100%)`;
/** The tina.io page wash: mint to sky. */
export const GRAD_WASH = `linear-gradient(90deg, ${C.mint} 0%, ${C.sky1} 34%, ${C.sky2} 59%, ${C.sky3} 100%)`;
export const GRAD_BLUE = `linear-gradient(135deg, ${C.blue600} 0%, #144696 60%, #0D5DBD 100%)`;

/** Blue-tinted soft shadows (tina.io). */
export const SHADOW = {
  sm: '0 1px 3px rgba(20,70,150,0.08), 0 1px 2px rgba(20,70,150,0.06)',
  md: '0 12px 32px -8px rgba(20,70,150,0.18), 0 4px 10px -4px rgba(20,70,150,0.10)',
  lg: '0 40px 80px -24px rgba(20,40,110,0.35), 0 16px 32px -16px rgba(20,40,110,0.25)',
  xl: '0 70px 140px -40px rgba(10,20,70,0.55), 0 30px 60px -30px rgba(10,20,70,0.35)',
};

/** Syntax colours for code panels on the dark navy editor. */
export const SYN = {
  bg: '#14112B',
  panel: '#1B1638',
  gutter: '#5B5687',
  text: '#E6E3F5',
  dim: '#8C87B4',
  key: '#FF8F6B',
  str: '#93E9BE',
  num: '#85C5FE',
  fn: '#7CC7FF',
  kw: '#C9A7FF',
  punct: '#A9A4CC',
  comment: '#6E6996',
  md: '#FF724B',
};
