// Official Tina logo files from tina.io/public (never redrawn): llama + "tinacms" wordmark, llama silhouette.
let cache: Record<string, string> = {};

export async function logoSvg(name: 'extended' | 'llama' | 'llama-white' | 'icon' | 'tinaio'): Promise<string> {
  const file = { extended: 'tina-extended-logo.svg', llama: 'llama.svg', 'llama-white': 'llama-white.svg', icon: 'tina-icon.svg', tinaio: 'tinaio-logo.svg' }[name];
  if (!cache[file]) cache[file] = await (await fetch(`/assets/brand/${file}`)).text();
  return cache[file];
}

/** The logo SVG markup recoloured (the official files are single-colour #EC4815). */
export async function logo(name: Parameters<typeof logoSvg>[0], color?: string) {
  let s = await logoSvg(name);
  if (color) s = s.replace(/fill="#(EC4815|ec4815|EB4A24|EB4924|fff|FFF|ffffff|FFFFFF|white)"/g, `fill="${color}"`).replace(/fill="inherit"/g, `fill="${color}"`);
  return s;
}
