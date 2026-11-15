// YakShaver brand colours. Sources (checked 2026-11-15), also in docs/marketing-brief.md:
// - Brand Guide V6 (yakshaver.ai/YakShaver/YakShaver-Brand-Guide-V6.pdf): Brand Red #CC4141, Charcoal #333333,
//   Stone #797979, Ash #AAAAAA, and the gradient #F6983D > #CC4141 > #AF33E4 > #4648FF (max 1/3 of the screen).
// - yakshaver.ai CSS (_next/static/css/802e537ca03e355a.css): --color-ssw-red #cc4141, --color-gray-light #222,
//   cards #131313, greys #1f1f1f #141414 #363636, hero word gradient #e34f4f 30% > #D699FB 80% > #FF778E.
// - Desktop app (SSW.YakShaver.Desktop src/ui): "Processing complete" in Tailwind green-300/400.
// The key names are the engine's (TinaCMS) names. `orange` holds the accent, which is YakShaver red.
export const C = {
  orange: '#CC4141', // Brand Red
  orangeHover: '#B53838', // Brand Red, 10% darker (hover/pressed)
  orangeLight: '#F2C6C6', // Brand Red at 30% on white
  orange50: '#FCF3F3',
  orange100: '#F8E3E3',
  orange300: '#E88A8A',
  orange400: '#E34F4F', // first stop of the site's hero word gradient
  orange600: '#B53838',
  orange800: '#6E1F1F',
  blue: '#4648FF', // gradient end stop (Brand Guide)
  blue600: '#3537D9',
  blue50: '#ECECFF',
  blue200: '#B4B5FF',
  blue300: '#8586FF',
  blue900: '#1A1B66',
  seafoam: '#4ADE80', // Tailwind green-400: the desktop app's "Processing complete"
  seafoam50: '#F0FDF4',
  seafoam200: '#BBF7D0',
  seafoam900: '#14532D',
  navy: '#222222', // site page background (--color-gray-light)
  navy2: '#1F1F1F', // site grey panel
  ink: '#131313', // site card background
  ink2: '#0E0E0E', // site darkest grey
  text: '#222222',
  text2: '#797979', // Stone
  line: '#E5E5E5',
  bg: '#FAFAFA',
  white: '#FFFFFF',
  // The wash blobs of the light world: the Brand Guide gradient stops, used soft (the guide's 1/3 rule).
  mint: '#F6983D', // gradient start (orange)
  sky1: '#E06A4F', // between the orange and red stops
  sky2: '#AF33E4', // gradient purple
  sky3: '#4648FF', // gradient end (blue)
};

/** The gradient word: the yakshaver.ai hero word fill (red > lilac > pink). */
export const GRAD_TITLE = 'linear-gradient(90deg, #E34F4F 30%, #D699FB 80%, #FF778E 100%)';
/** Red accent fill for buttons and the emphasised word on dark. */
export const GRAD_ORANGE = `linear-gradient(135deg, ${C.orange400} 0%, ${C.orange} 50%, ${C.orange600} 100%)`;
/** The YakShaver gradient (Brand Guide V6). Keep it to 1/3 of the screen or less. */
export const GRAD_WASH = `linear-gradient(90deg, ${C.mint} 0%, ${C.orange} 34%, ${C.sky2} 67%, ${C.sky3} 100%)`;
export const GRAD_BLUE = `linear-gradient(135deg, ${C.sky2} 0%, ${C.blue600} 60%, ${C.blue} 100%)`;

/** Neutral soft shadows (the site uses plain black shadows on dark greys). */
export const SHADOW = {
  sm: '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.08)',
  md: '0 12px 32px -8px rgba(0,0,0,0.22), 0 4px 10px -4px rgba(0,0,0,0.12)',
  lg: '0 40px 80px -24px rgba(0,0,0,0.40), 0 16px 32px -16px rgba(0,0,0,0.28)',
  xl: '0 70px 140px -40px rgba(0,0,0,0.60), 0 30px 60px -30px rgba(0,0,0,0.40)',
};

/** Syntax colours for code panels on the dark editor (engine colours, tuned to the site's greys). */
export const SYN = {
  bg: '#131313',
  panel: '#1A1A1A',
  gutter: '#5A5A5A',
  text: '#ECECEC',
  dim: '#9A9A9A',
  key: '#FF8A7A',
  str: '#86EFAC',
  num: '#B4B5FF',
  fn: '#8AB4FF',
  kw: '#D699FB',
  punct: '#AAAAAA',
  comment: '#6E6E6E',
  md: '#E34F4F',
};
