// Build out/deliver/index.html: every finished version with its player, poster, files and facts.
// node render/report.mjs   then serve out/deliver on localhost (a file:// page cannot play range requests well).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from './lib.mjs';

const dir = path.resolve(root, '../out/deliver');
const versions = [
  { name: 'TinaCMS-Anthem-v2-76s-16x9', title: 'Anthem v2', len: '76 s', ratio: '16:9', music: 'anthem3', use: 'All socials, YouTube, tina.io hero', story: 'After 8 review rounds: 90 BPM so every line is easy to read, calm chill music under the SSW TV pop, chat, click and typing sounds, 3D characters that act with the story, a cursor that clicks Save, the tina.io/design style, 30 fps. "Your content should be in Markdown.", "Edit your site. Visually.", "Content Editors? Not as much.", the llama’s answer at twice the size, a click into visual editing on the chorus drop, GitHub, "Works with Astro. Next.js. Or bring your own.", free and open source, "Built for Developers. And Content Editors.", then a symmetrical end card: "Try TinaCMS today.", the npx command, or "With your favourite AI agent", tina.io and a QR code to tina.io.' },
  { name: 'TinaCMS-30s-16x9', title: '30 seconds', len: '30 s', ratio: '16:9', music: 'thirty', use: 'YouTube, LinkedIn feed', story: 'A live edit hook, logo, visual editing, blocks, Git, call to action.' },
  { name: 'TinaCMS-15s-16x9', title: '15 seconds', len: '15 s', ratio: '16:9', music: 'fifteen', use: 'Pre-roll, LinkedIn', story: 'A live edit hook, logo, three features, call to action.' },
  { name: 'TinaCMS-30s-9x16', title: 'Vertical 30 seconds', len: '30 s', ratio: '9:16', music: 'thirty', use: 'Shorts, Reels, LinkedIn mobile', story: 'The 30 s story framed for a phone, inside the Reels safe zone.' },
  { name: 'TinaCMS-Developers-45s-16x9', title: 'For developers', len: '45 s', ratio: '16:9', music: 'dev', use: 'Developer channels, YouTube', story: 'CLI, TypeScript schema, GraphQL, then "your editors get this", Git, call to action.' },
  { name: 'TinaCMS-Bumper-6s-16x9', title: 'Bumper', len: '6 s', ratio: '16:9', music: 'six', use: 'YouTube bumper', story: 'A live edit, then the end card.' },
];

const probe = (f) => {
  try {
    return JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=width,height,r_frame_rate', '-of', 'json', f]).toString());
  } catch { return null; }
};

const cards = versions
  .filter((v) => fs.existsSync(path.join(dir, v.name + '.mp4')))
  .map((v) => {
    const p = probe(path.join(dir, v.name + '.mp4'));
    const dur = p ? Number(p.format.duration).toFixed(2) : '?';
    const mb = p ? (Number(p.format.size) / 1e6).toFixed(1) : '?';
    const vs = p?.streams?.find((s) => s.width);
    const poster = fs.existsSync(path.join(dir, v.name + '-poster.jpg')) ? `${v.name}-poster.jpg` : '';
    const files = [`${v.name}.mp4`, `${v.name}-30fps.mp4`, `${v.name}-preview.mp4`, `${v.name}.srt`, poster, `${v.name}-thumbnail.jpg`].filter((f) => f && fs.existsSync(path.join(dir, f)));
    return `<article class="card ${v.ratio === '9:16' ? 'tall' : ''}">
  <video controls preload="metadata" ${poster ? `poster="${poster}"` : ''} src="${v.name}.mp4"></video>
  <div class="meta">
    <h2>${v.title} <span>${v.len} · ${v.ratio}</span></h2>
    <p>${v.story}</p>
    <dl><dt>Use</dt><dd>${v.use}</dd><dt>File</dt><dd>${vs ? `${vs.width}x${vs.height}, ${Math.round(vs.r_frame_rate.split("/").reduce((n, d) => n / d))} fps, ${dur} s, ${mb} MB` : ''}</dd><dt>Music</dt><dd>original cue <code>${v.music}</code>, synthesized from code, owned outright</dd></dl>
    <p class="files">${files.map((f) => `<a href="${f}" download>${f}</a>`).join(' ')}</p>
  </div>
</article>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TinaCMS Ads</title>
<style>
:root { --bg: #F8FAFC; --ink: #0F172A; --muted: #64748B; --line: #E2E8F0; --orange: #EC4815; --card: #fff; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg: #14132A; --ink: #F1F5F9; --muted: #A9A4CC; --line: #2C2752; --card: #1B1638; } }
:root[data-theme="dark"] { --bg: #14132A; --ink: #F1F5F9; --muted: #A9A4CC; --line: #2C2752; --card: #1B1638; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 Inter, system-ui, sans-serif; }
header { padding: 40px 16px 8px; max-width: 1200px; margin: 0 auto; }
h1 { font: 600 40px/1.1 'IBM Plex Sans', system-ui, sans-serif; letter-spacing: -0.03em; margin: 0 0 8px; }
h1 b { color: var(--orange); }
header p { color: var(--muted); margin: 0; max-width: 70ch; }
.intro { max-width: 1200px; margin: 0 auto; padding: 8px 16px 0; color: var(--ink); }
.flow svg { width: 100%; height: auto; }
.flow .n rect { fill: var(--card); stroke: var(--line); stroke-width: 1.5; }
.flow .n.o rect { stroke: var(--orange); stroke-width: 2; }
.flow .s { fill: var(--muted); font-size: 12px; }
main { max-width: 1200px; margin: 0 auto; padding: 24px 16px 64px; display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.card video { display: block; width: 100%; aspect-ratio: 16 / 9; background: #000; }
.card.tall video { aspect-ratio: 9 / 16; max-height: 640px; }
.meta { padding: 16px 18px 18px; }
h2 { margin: 0 0 6px; font: 600 22px 'IBM Plex Sans', system-ui, sans-serif; }
h2 span { color: var(--muted); font-weight: 500; font-size: 15px; margin-left: 6px; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 10px 0; font-size: 14px; }
dt { color: var(--muted); } dd { margin: 0; }
.files { font-size: 13px; display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 8px 0 0; }
a { color: var(--orange); }
code { font-size: 13px; }
</style></head><body>
<header><h1>TinaCMS ads. <b>Edit your site. Visually.</b></h1>
<p>Music-driven motion graphics built in code, frame by frame, with the real TinaCMS UI. Original music synthesized from code, so no Content ID claims. Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')}.</p></header>
<section class="intro"><figure class="flow" aria-label="How the ads are made">
<svg viewBox="0 0 1100 150" role="img"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="currentColor"/></marker></defs>
<g font-family="Inter, system-ui" font-size="14" fill="currentColor">
<g class="n"><rect x="0" y="20" width="150" height="56" rx="10"/><text x="75" y="44" text-anchor="middle" font-weight="600">Brief + treatment</text><text x="75" y="63" text-anchor="middle" class="s">brand, ad rules</text></g>
<g class="n"><rect x="190" y="20" width="150" height="56" rx="10"/><text x="265" y="44" text-anchor="middle" font-weight="600">Scene scripts</text><text x="265" y="63" text-anchor="middle" class="s">per cut, per beat</text></g>
<g class="n"><rect x="380" y="0" width="150" height="46" rx="10"/><text x="455" y="28" text-anchor="middle" font-weight="600">Real Tina UI</text></g>
<g class="n"><rect x="380" y="56" width="150" height="46" rx="10"/><text x="455" y="84" text-anchor="middle" font-weight="600">Music from code</text></g>
<g class="n o"><rect x="570" y="20" width="160" height="56" rx="10"/><text x="650" y="44" text-anchor="middle" font-weight="600">Scenes (DOM, t)</text><text x="650" y="63" text-anchor="middle" class="s">pure function of time</text></g>
<g class="n"><rect x="770" y="20" width="150" height="56" rx="10"/><text x="845" y="44" text-anchor="middle" font-weight="600">Frame capture</text><text x="845" y="63" text-anchor="middle" class="s">30 fps, lossless</text></g>
<g class="n"><rect x="960" y="20" width="140" height="56" rx="10"/><text x="1030" y="44" text-anchor="middle" font-weight="600">QA + masters</text><text x="1030" y="63" text-anchor="middle" class="s">6 versions</text></g>
<path d="M150 48H186M340 40L376 26M340 56L376 78M530 23L566 42M530 79L566 56M730 48H766M920 48H956" stroke="currentColor" stroke-width="2" fill="none" marker-end="url(#ar)"/>
<path d="M1030 76V120H650V80" stroke="#EC4815" stroke-width="2" fill="none" stroke-dasharray="5 4" marker-end="url(#ar)"/><text x="840" y="138" text-anchor="middle" class="s">fix and re-render</text>
</g></svg></figure></section>
<main>
${cards}
</main></body></html>`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(path.join(dir, 'index.html'));
