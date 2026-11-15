// Builds plates/out/contact.jpg: a contact sheet of every plate and the first, middle and last frame of every sequence.
//   node contact.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = path.resolve(import.meta.dirname, '../out');
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));

const pick = (file) => {
  const webp = file.replace(/\.png$/, '.webp');
  return fs.existsSync(path.join(OUT, webp)) ? webp : file;
};
const items = manifest.plates.map((p) => ({ label: `${p.name}  ${p.size.w}x${p.size.h}`, src: pick(p.file), tall: p.size.h > p.size.w }));
for (const s of manifest.sequences) {
  const dir = s.dir.replace(/\/$/, '');
  const names = fs.readdirSync(path.join(OUT, dir)).filter((f) => f.endsWith('.png')).sort();
  const idx = [...new Set([0, Math.floor(names.length / 2), names.length - 1])];
  for (const i of idx) items.push({ label: `${dir}/${names[i]}  (${i + 1} of ${names.length})`, src: pick(`${dir}/${names[i]}`) });
}

const cell = 640;
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#16181d;font:13px -apple-system,Inter,sans-serif;color:#e8e8ee">
<div style="display:grid;grid-template-columns:repeat(4,${cell}px);gap:14px;padding:14px;width:${cell * 4 + 14 * 5}px;box-sizing:border-box">
${items
  .map(
    (i) => `<div><div style="width:${cell}px;height:${Math.round((cell * 9) / 16)}px;background:#2a2d35;border-radius:6px;overflow:hidden"><img src="file://${path.join(OUT, i.src)}" style="width:100%;height:100%;object-fit:${i.tall ? 'cover' : 'contain'};object-position:top"></div><div style="padding:5px 2px 0">${i.label}</div></div>`,
  )
  .join('')}
</div></body>`;
const tmp = path.join(OUT, '.contact.html');
fs.writeFileSync(tmp, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: cell * 4 + 14 * 5, height: 900 } });
await page.goto('file://' + tmp);
await page.waitForFunction(() => [...document.images].every((i) => i.complete));
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'contact.jpg'), type: 'jpeg', quality: 86, fullPage: true });
await browser.close();
fs.unlinkSync(tmp);
console.log('wrote contact.jpg with', items.length, 'tiles');
