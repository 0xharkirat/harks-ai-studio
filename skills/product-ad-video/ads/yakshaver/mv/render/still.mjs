// node render/still.mjs --cut anthem --t 4.0,5.5 --out /tmp/dir [--scale 0.5]
import fs from 'node:fs';
import path from 'node:path';
import { devServer, launch, openPage, capture, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const cut = args.cut ?? 'anthem';
const out = path.resolve(args.out ?? '../out/stills');
fs.mkdirSync(out, { recursive: true });
const times = String(args.t ?? '0').split(',').map(Number);
const server = await devServer();
const browser = await launch();
const p = await openPage(browser, server.url, { cut });
for (const t of times) {
  const buf = await capture(p, Math.round(t * p.fps), { clipScale: args.scale ? Number(args.scale) : undefined });
  const file = path.join(out, `${cut}-${t.toFixed(3)}.png`);
  fs.writeFileSync(file, buf);
  console.log(file);
}
await browser.close();
await server.close();
