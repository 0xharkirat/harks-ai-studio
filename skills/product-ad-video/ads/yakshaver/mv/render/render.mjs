// Full render of a cut: node render/render.mjs --cut anthem [--from 0 --to 10] [--workers 4] [--out ../out/anthem.mov]
// Frames are captured as lossless PNG in parallel workers, each encoding one ProRes segment, then concatenated.
// --draft: a fast review copy of the exact output: every 2nd frame (30 fps) at full size, H.264 with the cut's music,
// to ../out/<cut>-draft.mp4. Review it before the full render and the master.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { devServer, snapshotServer, launch, openPage, capture, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const cut = args.cut ?? 'anthem';
const workers = Number(args.workers ?? 4);
const draft = !!args.draft;
// --fps 30: the lossless render at 30 fps (every 2nd frame), the delivery rate since round 6: Reels and LinkedIn
// ads play 30 fps, and it halves the render.
const step = draft || Number(args.fps) === 30 ? 2 : 1;
const out = path.resolve(args.out ?? `../out/${cut}${draft ? '-draft.mp4' : '.mov'}`);
const segDir = out + '.segments';
fs.rmSync(segDir, { recursive: true, force: true });
fs.mkdirSync(segDir, { recursive: true });

const server = args.live ? await devServer() : await snapshotServer(cut);
const browser = await launch();
const probe = await openPage(browser, server.url, { cut });
const { total, fps, W, H } = probe;
const music = await probe.page.evaluate(() => window.__mv.music);
await probe.page.close();
const from = Math.round(Number(args.from ?? 0) * fps / step) * step;
const to = Math.min(total, Math.round(Number(args.to ?? total / fps) * fps));
const n = to - from;
console.log(`${cut}: ${W}x${H} frames ${from}..${to} (${n}) with ${workers} workers`);

const chunk = Math.ceil(n / workers / step) * step;
const segs = [];
let done = 0;
const t0 = Date.now();
const jobs = [];
for (let k = 0; k < workers; k++) {
  const a = from + k * chunk, b = Math.min(to, a + chunk);
  if (a >= b) break;
  const seg = path.join(segDir, `seg_${String(k).padStart(2, '0')}.${draft ? 'mp4' : 'mov'}`);
  segs.push(seg);
  jobs.push((async () => {
    const p = await openPage(browser, server.url, { cut });
    const enc = draft
      ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-threads', '2']
      : ['-c:v', 'prores_ks', '-profile:v', '3', '-pix_fmt', 'yuv422p10le', '-vendor', 'apl0'];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps / step), '-c:v', 'png', '-i', '-',
      ...enc, '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f += step) {
      // The draft captures full size like the master: a scaled screenshot can show a 3D layer one frame late.
      const buf = await capture(p, f);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      done += step;
      if (done % 120 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${n} frames  ${(done / el).toFixed(1)} fps  eta ${((n - done) / (done / el)).toFixed(0)} s`);
      }
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    await p.page.close();
  })());
}
await Promise.all(jobs);
await browser.close();
await server.close();
const list = path.join(segDir, 'list.txt');
fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
// The draft carries the cut's music from the same start time, so the review copy plays like the master.
const audio = path.resolve(`../music/out/${music}.wav`);
const withAudio = draft && fs.existsSync(audio)
  ? ['-ss', String(from / fps), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart']
  : ['-c', 'copy'];
await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, ...withAudio, out], { stdio: 'inherit' }).on('close', (c) => (c ? rej(new Error('concat failed')) : res())));
fs.rmSync(segDir, { recursive: true, force: true });
console.log(`wrote ${out} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
