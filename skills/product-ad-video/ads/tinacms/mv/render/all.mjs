// Render every cut and master it with its music: node render/all.mjs [--cuts anthem,thirty] [--workers 4]
import { spawnSync } from 'node:child_process';
import { parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const plan = [
  { cut: 'anthem', music: 'anthem3', name: 'TinaCMS-Anthem-v2-76s-16x9', poster: 27.8 },
  { cut: 'thirty', music: 'thirty', name: 'TinaCMS-30s-16x9', poster: 9.2 },
  { cut: 'fifteen', music: 'fifteen', name: 'TinaCMS-15s-16x9', poster: 1.4 },
  { cut: 'vertical', music: 'thirty', name: 'TinaCMS-30s-9x16', poster: 9.2 },
  { cut: 'dev', music: 'dev', name: 'TinaCMS-Developers-45s-16x9', poster: 23.2 },
  { cut: 'six', music: 'six', name: 'TinaCMS-Bumper-6s-16x9', poster: 3.6 },
];
const only = args.cuts ? String(args.cuts).split(',') : null;
for (const p of plan) {
  if (only && !only.includes(p.cut)) continue;
  const run = (script, extra) => {
    const r = spawnSync('node', [script, ...extra], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`${script} failed for ${p.cut}`);
  };
  run('render/render.mjs', ['--cut', p.cut, '--workers', String(args.workers ?? 4), '--fps', String(args.fps ?? 30)]);
  run('render/master.mjs', ['--cut', p.cut, '--music', p.music, '--name', p.name, ...(p.poster != null ? ['--poster', String(p.poster)] : [])]);
}
