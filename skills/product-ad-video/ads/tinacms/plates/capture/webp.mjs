// Makes a web copy of every PNG master under plates/out: <name>.webp, 2880 px wide, quality 92.
// The 1x folders (*-1x) are already light, so they get no web copy.
//   node webp.mjs            convert everything that is new or older than its PNG
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const WEB_WIDTH = 2880;
export const WEB_QUALITY = 92;

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) return e.name.endsWith('-1x') ? [] : walk(p);
    return p.endsWith('.png') ? [p] : [];
  });

export async function convertAll(outDir, { force = false } = {}) {
  let n = 0;
  for (const png of walk(outDir)) {
    const webp = png.replace(/\.png$/, '.webp');
    if (!force && fs.existsSync(webp) && fs.statSync(webp).mtimeMs >= fs.statSync(png).mtimeMs) continue;
    const meta = await sharp(png).metadata();
    const width = Math.min(WEB_WIDTH, meta.width);
    await sharp(png).resize({ width, kernel: 'lanczos3' }).webp({ quality: WEB_QUALITY, effort: 4 }).toFile(webp);
    n++;
  }
  console.log(`webp: wrote ${n} files`);
  return n;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve(import.meta.dirname, '../out');
  await convertAll(out, { force: process.argv.includes('--force') });
}
