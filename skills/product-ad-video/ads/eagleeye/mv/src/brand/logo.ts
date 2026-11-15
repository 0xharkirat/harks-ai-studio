// Official EagleEye logo files (assets/brand/README.md), never redrawn.
// The engine's names are kept: 'extended' is the full logo, 'llama' is the eye mark (the film's mascot role).
let cache: Record<string, string> = {};

type Name = 'extended' | 'extended-dark' | 'llama' | 'llama-white' | 'icon' | 'tinaio' | 'mark' | 'mark-dark';

export async function logoSvg(name: Name): Promise<string> {
  const file = {
    extended: 'logo.svg', // red eye, #333 brackets and wordmark: for light backgrounds
    'extended-dark': 'logo-dark.svg', // red eye, white: for dark backgrounds
    llama: 'eye-light.svg',
    'llama-white': 'eye-dark.svg',
    icon: 'mark-light.svg',
    tinaio: 'logo.svg',
    mark: 'mark-light.svg',
    'mark-dark': 'mark-dark.svg',
  }[name];
  if (!cache[file]) cache[file] = await (await fetch(`/assets/brand/${file}`)).text();
  return cache[file];
}

/** The logo SVG markup. `color` recolours only the neutral parts (#333 / white), so the red eye always stays SSW red. */
export async function logo(name: Name, color?: string) {
  let s = await logoSvg(name);
  if (color) s = s.replace(/fill="#(333333|FFF|fff|FFFFFF|ffffff)"/g, `fill="${color}"`);
  return s;
}
