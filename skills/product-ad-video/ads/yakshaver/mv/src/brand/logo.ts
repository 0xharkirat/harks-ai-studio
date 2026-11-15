// Official YakShaver logo files (yakshaver.ai/media V2 kit, no < > brackets; never redrawn, never recoloured).
// The names are the engine's. Each name has a light-background file and a dark-background file.
// `logo(name, color)` picks the dark-background file when `color` is white; any other colour is ignored,
// because the brand guide forbids recolouring the logo.
let cache: Record<string, string> = {};

type Name = 'extended' | 'llama' | 'llama-white' | 'icon' | 'tinaio';

const FILES: Record<Name, { light: string; dark: string }> = {
  extended: { light: 'horizontal-light.svg', dark: 'horizontal-dark.svg' }, // icon + "YakShaver" wordmark
  llama: { light: 'icon-red.svg', dark: 'icon-red.svg' }, // the bull icon
  'llama-white': { light: 'icon-white.svg', dark: 'icon-white.svg' },
  icon: { light: 'icon-red.svg', dark: 'icon-red.svg' },
  tinaio: { light: 'vertical-light.svg', dark: 'vertical-dark.svg' }, // stacked lockup
};

export async function logoSvg(name: Name, dark = false): Promise<string> {
  const file = FILES[name][dark ? 'dark' : 'light'];
  if (!cache[file]) cache[file] = await (await fetch(`/assets/brand/${file}`)).text();
  return cache[file];
}

const isWhite = (c?: string) => !!c && /^(#fff(fff)?|white)$/i.test(c.trim());

/** The official logo SVG for a light background, or for a dark one when `color` is white. */
export async function logo(name: Name, color?: string) {
  return logoSvg(name, isWhite(color));
}

/** Height / width of the `extended` lockup (horizontal V2 file: viewBox 215 x 41). */
export const LOGO_ASPECT = 41 / 215;
