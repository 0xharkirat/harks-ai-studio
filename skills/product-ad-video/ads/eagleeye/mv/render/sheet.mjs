// Contact sheet: node render/sheet.mjs --cut anthem --from 0 --to 8 --step 0.25 --cols 8 --cell 320 --out /tmp/sheet.jpg
import fs from 'node:fs';
import path from 'node:path';
import { devServer, launch, openPage, capture, parseArgs, fmtBar } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const cut = args.cut ?? 'anthem';
const from = Number(args.from ?? 0), to = Number(args.to ?? 8), step = Number(args.step ?? 0.5);
const cols = Number(args.cols ?? 8), cell = Number(args.cell ?? 320);
const out = path.resolve(args.out ?? `../out/sheet-${cut}.jpg`);
const server = await devServer();
const browser = await launch();
const p = await openPage(browser, server.url, { cut });
const scale = cell / p.W;
const times = [];
for (let t = from; t <= to + 1e-9; t += step) times.push(Math.round(t * 1000) / 1000);
const shots = [];
for (const t of times) shots.push({ t, b64: (await capture(p, Math.round(t * p.fps), { clipScale: scale })).toString('base64') });
const cellH = Math.round(cell * p.H / p.W);
const rows = Math.ceil(shots.length / cols);
const sheet = await browser.newPage({ viewport: { width: cols * cell, height: rows * (cellH + 20) } });
await sheet.setContent(`<body style="margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},${cell}px)">${shots
  .map((s) => `<div style="width:${cell}px;height:${cellH + 20}px;font:12px ui-monospace,monospace;color:#ddd;overflow:hidden"><div style="height:20px;line-height:20px;padding-left:4px">${s.t.toFixed(3)}s  bar ${fmtBar(s.t)}</div><img style="display:block;width:${cell}px;height:${cellH}px" src="data:image/png;base64,${s.b64}"></div>`)
  .join('')}</body>`);
await sheet.waitForLoadState('load');
fs.mkdirSync(path.dirname(out), { recursive: true });
await sheet.screenshot({ path: out, type: 'jpeg', quality: 88, fullPage: true });
console.log(out, `${shots.length} frames`);
await browser.close();
await server.close();
