// EagleEye brand colours. Sources (checked 2026-11-15):
// - ssweagleeye.com CSS (_next/static/css/802e537ca03e355a.css): --color-ssw-red #cc4141, body #222222, panels #1f1f1f / #141414,
//   charcoal #333, --gradient-pink (#cc4141, #d699fb, #ff778e).
// - The portal (SSW.EagleEye.Portal/tailwind.config.ts): brand.primary #CC4141, brand.outlook #0078D4, brand.green #008000;
//   chart tokens red #cd4242 / #e66767, blue #2a78d6 / #3987e5; neutrals are shadcn zinc.
// The key names are the engine's (C.orange is the accent). Keep every key; change only the values.
export const C = {
  orange: '#CC4141', // SSW red, the accent
  orangeHover: '#B33636',
  orangeLight: '#F5CACA',
  orange50: '#FDF5F5',
  orange100: '#FBE8E8',
  orange300: '#EBA0A0',
  orange400: '#E66767', // portal chart red (dark)
  orange600: '#B33636',
  orange800: '#6B1F1F',
  blue: '#0078D4', // portal brand.outlook
  blue600: '#2A78D6', // portal chart blue
  blue50: '#E6F1FB',
  blue200: '#A9CDF2',
  blue300: '#3987E5',
  blue900: '#0F2F57',
  seafoam: '#8FD9A8', // the "saved" state; a soft take on brand.green
  seafoam50: '#F0FAF3',
  seafoam200: '#C8EED5',
  seafoam900: '#1E4D2E',
  navy: '#1F1F1F', // the dark world: the site's panels
  navy2: '#2A2A2A',
  ink: '#222222', // the site's body colour
  ink2: '#141414',
  text: '#18181B', // zinc-900
  text2: '#71717A', // zinc-500
  line: '#E4E4E7', // zinc-200
  bg: '#FAFAFA', // zinc-50
  white: '#FFFFFF',
  // The wash at the drops: the site's --gradient-pink, softened.
  mint: '#FFB3BF',
  sky1: '#FF9AAA',
  sky2: '#E9A9F5',
  sky3: '#D699FB',
};

/** The gradient word in a headline: SSW red, lighter at the top. */
export const GRAD_TITLE = 'linear-gradient(180deg, #E66767 0%, #CC4141 50%, #9E2F2F 100%)';
export const GRAD_ORANGE = `linear-gradient(135deg, ${C.orange400} 0%, ${C.orange} 50%, ${C.orange600} 100%)`;
/** The site's --gradient-pink, as a soft wash. */
export const GRAD_WASH = `linear-gradient(90deg, ${C.mint} 0%, ${C.sky1} 34%, ${C.sky2} 66%, ${C.sky3} 100%)`;
export const GRAD_BLUE = `linear-gradient(135deg, ${C.blue600} 0%, #0F4F96 60%, ${C.blue} 100%)`;

/** Neutral soft shadows. */
export const SHADOW = {
  sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  md: '0 12px 32px -8px rgba(0,0,0,0.18), 0 4px 10px -4px rgba(0,0,0,0.10)',
  lg: '0 40px 80px -24px rgba(0,0,0,0.35), 0 16px 32px -16px rgba(0,0,0,0.25)',
  xl: '0 70px 140px -40px rgba(0,0,0,0.55), 0 30px 60px -30px rgba(0,0,0,0.35)',
};

/** Syntax colours for code panels on the dark editor (engine colours, no brand source needed). */
export const SYN = {
  bg: '#141414',
  panel: '#1F1F1F',
  gutter: '#5C5C5C',
  text: '#ECECEC',
  dim: '#9A9A9A',
  key: '#FF8A9A',
  str: '#9FE0B5',
  num: '#8CC4FF',
  fn: '#7CC7FF',
  kw: '#D699FB',
  punct: '#B0B0B0',
  comment: '#6E6E6E',
  md: '#E66767',
};
