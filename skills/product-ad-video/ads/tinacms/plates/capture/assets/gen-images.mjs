// Generates every image of the demo site (a fictional product called Fieldnote).
// All images are drawn from scratch with HTML/SVG, so they are free to use.
// Run: node assets/gen-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const UPLOADS = path.resolve(import.meta.dirname, '../../site/public/uploads');

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Helvetica Neue', Arial, sans-serif`;

// ---------------------------------------------------------------- hero mock
const heroHtml = () => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1500px;height:800px;font-family:${FONT};color:#1f2430;background:#fff;overflow:hidden;-webkit-font-smoothing:antialiased}
.app{display:grid;grid-template-columns:248px 330px 1fr;height:800px}
.side{background:#f6f5fb;border-right:1px solid #e8e6f3;padding:22px 16px;display:flex;flex-direction:column;gap:6px}
.ws{display:flex;align-items:center;gap:10px;font-weight:650;font-size:15px;margin-bottom:14px}
.ws i{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#a855f7);display:grid;place-items:center;color:#fff;font-style:normal;font-size:15px;font-weight:700}
.search{height:36px;border-radius:10px;background:#fff;border:1px solid #e4e2f1;display:flex;align-items:center;padding:0 12px;color:#8a88a3;font-size:13.5px;gap:8px;margin-bottom:10px}
.search b{margin-left:auto;font-weight:500;font-size:11.5px;border:1px solid #e4e2f1;border-radius:5px;padding:1px 6px;color:#9a98b3}
.nav{display:flex;align-items:center;gap:10px;height:34px;padding:0 10px;border-radius:9px;font-size:14px;color:#4a4863}
.nav.on{background:#e9e7fb;color:#3730a3;font-weight:600}
.nav .ic{width:16px;height:16px;border-radius:5px;background:#c9c6ea}
.nav.on .ic{background:#6366f1}
.sec{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#9a98b3;font-weight:650;margin:18px 10px 6px}
.dot{width:10px;height:10px;border-radius:50%}
.mid{border-right:1px solid #eeedf6;padding:22px 0;background:#fff}
.mid h4{font-size:19px;font-weight:700;padding:0 22px 14px;letter-spacing:-.01em;display:flex;justify-content:space-between;align-items:center}
.mid h4 span{font-size:12.5px;font-weight:600;color:#6366f1;background:#eef0ff;border-radius:7px;padding:4px 9px}
.card{padding:14px 22px;border-top:1px solid #f1f0f8}
.card.on{background:#f4f3ff;border-left:3px solid #6366f1;padding-left:19px}
.card .t{font-weight:650;font-size:14.5px;margin-bottom:5px}
.card .s{font-size:13px;color:#6b6a84;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card .m{margin-top:8px;font-size:11.5px;color:#9a98b3;display:flex;gap:8px;align-items:center}
.tag{background:#f0eefb;color:#5b57c9;border-radius:6px;padding:2px 7px;font-weight:600;font-size:11px}
.doc{padding:34px 64px;position:relative;background:#fff}
.crumbs{font-size:13px;color:#8a88a3;margin-bottom:18px;display:flex;gap:8px;align-items:center}
.doc h1{font-size:38px;letter-spacing:-.025em;font-weight:760;margin-bottom:14px;line-height:1.1}
.by{display:flex;align-items:center;gap:10px;font-size:13px;color:#6b6a84;margin-bottom:26px}
.av{width:26px;height:26px;border-radius:50%;border:2px solid #fff;margin-right:-10px;display:inline-block}
.doc p{font-size:16px;line-height:1.65;color:#363a4d;margin-bottom:14px;max-width:640px}
.doc h2{font-size:21px;font-weight:700;margin:24px 0 10px;letter-spacing:-.01em}
.callout{background:#fff7e6;border:1px solid #fde3a7;border-radius:12px;padding:14px 16px;font-size:14.5px;color:#7a4b00;max-width:640px;display:flex;gap:12px;margin:10px 0 16px;line-height:1.5}
.task{display:flex;align-items:center;gap:12px;font-size:15.5px;margin-bottom:10px;color:#363a4d}
.cb{width:19px;height:19px;border-radius:6px;border:2px solid #c9c6ea}
.cb.x{background:#6366f1;border-color:#6366f1;position:relative}
.cb.x:after{content:"";position:absolute;left:5px;top:1px;width:5px;height:10px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.task.done span{text-decoration:line-through;color:#9a98b3}
.cur{position:absolute;display:flex;flex-direction:column;align-items:flex-start;gap:0}
.cur:before{content:"";width:2px;height:22px;background:var(--c)}
.cur b{background:var(--c);color:#fff;font-size:11.5px;font-weight:650;padding:2px 8px;border-radius:0 7px 7px 7px;margin-top:-1px}
mark{background:#e0e7ff;border-radius:4px;padding:0 2px}
.share{position:absolute;right:40px;top:30px;display:flex;gap:10px;align-items:center}
.btn{height:34px;padding:0 15px;border-radius:9px;font-size:13.5px;font-weight:650;display:flex;align-items:center}
.btn.p{background:#4f46e5;color:#fff}.btn.g{border:1px solid #e4e2f1;color:#4a4863;background:#fff}
</style></head><body><div class="app">
<div class="side">
 <div class="ws"><i>F</i>Larkspur Studio</div>
 <div class="search">Search notes <b>⌘K</b></div>
 <div class="nav on"><span class="ic"></span>Home</div>
 <div class="nav"><span class="ic"></span>Inbox</div>
 <div class="nav"><span class="ic"></span>Recent</div>
 <div class="sec">Spaces</div>
 <div class="nav"><span class="dot" style="background:#6366f1"></span>Product</div>
 <div class="nav"><span class="dot" style="background:#ec4899"></span>Design</div>
 <div class="nav"><span class="dot" style="background:#10b981"></span>Engineering</div>
 <div class="nav"><span class="dot" style="background:#f59e0b"></span>Customers</div>
 <div class="nav"><span class="dot" style="background:#06b6d4"></span>People</div>
 <div class="sec">Pinned</div>
 <div class="nav"><span class="ic"></span>Team handbook</div>
 <div class="nav"><span class="ic"></span>Launch checklist</div>
</div>
<div class="mid">
 <h4>Product <span>+ New note</span></h4>
 <div class="card on"><div class="t">Q4 roadmap review</div><div class="s">Three bets for the quarter: shared spaces, offline mode and faster search across every workspace.</div><div class="m"><span class="tag">Roadmap</span>Edited 2m ago</div></div>
 <div class="card"><div class="t">Customer interview notes: Ines</div><div class="s">Wants one place for meeting notes. Currently pastes links into three different tools every week.</div><div class="m"><span class="tag">Research</span>Yesterday</div></div>
 <div class="card"><div class="t">Onboarding checklist</div><div class="s">A new teammate should write their first note in under five minutes. Here is the path we want.</div><div class="m"><span class="tag">Process</span>Mon</div></div>
 <div class="card"><div class="t">Release notes 3.0 draft</div><div class="s">Shared spaces, offline mode, a calmer sidebar and a search that finally finds the thing you meant.</div><div class="m"><span class="tag">Launch</span>Mon</div></div>
 <div class="card"><div class="t">Weekly sync, 14 Oct</div><div class="s">Decisions: ship offline mode to everyone next sprint. Open question: pricing for large teams.</div><div class="m"><span class="tag">Meetings</span>Fri</div></div>
 <div class="card"><div class="t">Writing style guide</div><div class="s">Short sentences. Plain words. Say what the note is for in the first line.</div><div class="m"><span class="tag">Handbook</span>Oct 9</div></div>
</div>
<div class="doc">
 <div class="share"><span class="av" style="background:#f472b6"></span><span class="av" style="background:#34d399"></span><span class="av" style="background:#fbbf24;margin-right:4px"></span><div class="btn g">Share</div><div class="btn p">Publish</div></div>
 <div class="crumbs">Product <span>/</span> Roadmap</div>
 <h1>Q4 roadmap review</h1>
 <div class="by"><span>Maya Okafor</span><span>·</span><span>Edited 2 minutes ago</span><span>·</span><span>6 min read</span></div>
 <p>Last quarter we made notes faster to write. This quarter we make them easier to <mark>find, share and trust</mark>. Three bets, in order of confidence.</p>
 <h2>What we are shipping</h2>
 <div class="callout"><span>💡</span><span>Rule of thumb: if a decision lives only in a chat thread, it does not exist. Write it down in a space.</span></div>
 <div class="task done"><div class="cb x"></div><span>Shared spaces for every team</span></div>
 <div class="task done"><div class="cb x"></div><span>Offline mode on desktop and mobile</span></div>
 <div class="task"><div class="cb"></div><span>Search that understands the question, not just the keywords</span></div>
 <div class="task"><div class="cb"></div><span>Calmer sidebar with pinned notes</span></div>
 <p style="margin-top:18px">We review progress every Friday and move anything that slipped into next sprint without drama.</p>
 <div class="cur" style="--c:#ec4899;left:519px;top:424px"><b>Jonas</b></div>
 <div class="cur" style="--c:#10b981;left:116px;top:518px"><b>Priya</b></div>
</div>
</div></body></html>`;

// ---------------------------------------------------------------- gradient art
const grain = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="position:absolute;inset:0;mix-blend-mode:soft-light;opacity:.55"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;

const art = (w, h, bg, blobs, extra = '') => `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0}body{width:${w}px;height:${h}px;overflow:hidden;position:relative;background:${bg}}
.b{position:absolute;border-radius:50%;filter:blur(150px)}
</style></head><body>
${blobs.map(([x, y, s, c, o = 1]) => `<div class="b" style="left:${x}%;top:${y}%;width:${s}%;height:${s * (w / h)}%;background:${c};opacity:${o};transform:translate(-50%,-50%)"></div>`).join('')}
${extra}${grain}</body></html>`;

const arts = {
  aurora: ['#0f172a', [[20, 80, 60, '#22d3ee'], [70, 70, 55, '#6366f1'], [50, 20, 50, '#a855f7'], [90, 15, 30, '#34d399', .8]]],
  dunes: ['#fde7c7', [[15, 30, 55, '#fb923c'], [80, 40, 60, '#f43f5e', .8], [45, 95, 70, '#fbbf24'], [95, 95, 40, '#7c2d12', .5]]],
  lagoon: ['#ecfeff', [[25, 25, 55, '#2dd4bf'], [80, 30, 50, '#38bdf8'], [55, 90, 60, '#0ea5e9'], [10, 90, 40, '#a7f3d0']]],
  ember: ['#1c1917', [[25, 85, 60, '#ef4444'], [75, 80, 50, '#f97316'], [55, 20, 40, '#fbbf24', .9], [95, 20, 35, '#7f1d1d']]],
  orchid: ['#fdf4ff', [[20, 25, 55, '#e879f9'], [85, 35, 50, '#818cf8'], [45, 95, 60, '#f472b6'], [95, 95, 40, '#c4b5fd']]],
  pine: ['#052e16', [[20, 25, 55, '#166534'], [80, 30, 55, '#0d9488'], [50, 100, 60, '#84cc16', .7], [95, 90, 35, '#14532d']]],
  dusk: ['#1e1b4b', [[18, 80, 55, '#f472b6'], [80, 25, 55, '#4f46e5'], [50, 50, 40, '#7c3aed'], [90, 90, 40, '#fb923c', .8]]],
  paper: ['#faf7f2', [[25, 30, 50, '#fde68a'], [80, 25, 45, '#fecdd3'], [50, 95, 60, '#e7e5e4'], [95, 85, 35, '#bae6fd']]],
  citrus: ['#fefce8', [[20, 30, 55, '#facc15'], [85, 40, 50, '#a3e635'], [45, 95, 60, '#fb923c'], [8, 95, 40, '#fef08a']]],
  harbor: ['#0c4a6e', [[20, 30, 55, '#0ea5e9'], [80, 25, 50, '#1d4ed8'], [50, 95, 60, '#67e8f9', .8], [95, 90, 35, '#f0f9ff', .5]]],
};

// ---------------------------------------------------------------- avatars
const hairStyles = {
  short: (c) => `<path d="M150 150c0-52 36-78 78-78s78 26 78 78c-14-26-42-38-78-38s-64 12-78 38z" fill="${c}"/>`,
  long: (c) => `<path d="M140 190c-6-70 30-122 88-122s94 52 88 122c0 40 6 70 14 96-20 6-38 4-48-10l-10-70-44-26-44 26-10 70c-10 14-28 16-48 10 8-26 14-56 14-96z" fill="${c}"/>`,
  bun: (c) => `<circle cx="228" cy="62" r="34" fill="${c}"/><path d="M148 160c0-50 34-76 80-76s80 26 80 76c-18-24-46-32-80-32s-62 8-80 32z" fill="${c}"/>`,
  curly: (c) => `<g fill="${c}"><circle cx="164" cy="128" r="36"/><circle cx="204" cy="100" r="38"/><circle cx="252" cy="100" r="38"/><circle cx="292" cy="128" r="36"/><circle cx="148" cy="170" r="26"/><circle cx="308" cy="170" r="26"/></g>`,
  none: () => '',
};
const avatarSvg = ({ bg, skin, hair, hairStyle, shirt, glasses, beard }) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 456 456">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>
<rect width="456" height="456" fill="url(#g)"/>
<path d="M70 456c0-90 70-132 158-132s158 42 158 132z" fill="${shirt}"/>
<rect x="198" y="270" width="60" height="70" rx="28" fill="${skin}"/>
${hairStyle === 'long' ? hairStyles.long(hair) : ''}
${hairStyle === 'bun' || hairStyle === 'curly' ? hairStyles[hairStyle](hair) : ''}
<ellipse cx="228" cy="196" rx="76" ry="88" fill="${skin}"/>
${hairStyle === 'short' ? hairStyles.short(hair) : ''}
${beard ? `<path d="M154 214c8 62 38 80 74 80s66-18 74-80c-18 22-42 30-74 30s-56-8-74-30z" fill="${hair}"/>` : ''}
<circle cx="198" cy="200" r="7" fill="#2b2118"/><circle cx="258" cy="200" r="7" fill="#2b2118"/>
<path d="M206 242c14 12 30 12 44 0" stroke="#7a3b2e" stroke-width="6" fill="none" stroke-linecap="round"/>
${glasses ? `<g fill="none" stroke="#1f2430" stroke-width="5"><circle cx="198" cy="200" r="24"/><circle cx="258" cy="200" r="24"/><path d="M222 200h12"/></g>` : ''}
</svg>`;

const people = {
  'maya-okafor': { bg: ['#fde68a', '#fb923c'], skin: '#8d5a3b', hair: '#1f1612', hairStyle: 'curly', shirt: '#4f46e5' },
  'jonas-lindqvist': { bg: ['#bae6fd', '#6366f1'], skin: '#f1c9a5', hair: '#8a5a2b', hairStyle: 'short', shirt: '#0f766e', beard: true },
  'priya-raman': { bg: ['#fbcfe8', '#c084fc'], skin: '#b9794f', hair: '#14100e', hairStyle: 'long', shirt: '#be185d' },
  'tomas-reyes': { bg: ['#bbf7d0', '#14b8a6'], skin: '#d9a47a', hair: '#2a1b12', hairStyle: 'short', shirt: '#1d4ed8', glasses: true },
  'hannah-weiss': { bg: ['#fef3c7', '#f472b6'], skin: '#f6d3b8', hair: '#c9822b', hairStyle: 'bun', shirt: '#0ea5e9' },
  'dev-patel': { bg: ['#ddd6fe', '#38bdf8'], skin: '#a8683f', hair: '#120d0a', hairStyle: 'none', shirt: '#f59e0b', beard: true, glasses: true },
  'ines-duarte': { bg: ['#fecdd3', '#fb923c'], skin: '#e9b995', hair: '#5a2d1b', hairStyle: 'long', shirt: '#047857' },
  'sam-whitaker': { bg: ['#e0e7ff', '#a78bfa'], skin: '#f2cfae', hair: '#3a2a1c', hairStyle: 'short', shirt: '#7c3aed', glasses: true },
};

// ---------------------------------------------------------------- run
const out = (...p) => {
  const f = path.join(UPLOADS, ...p);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  return f;
};

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });

async function shoot(html, w, h, file, { dsf = 1, type = 'png', quality = 90 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  await page.screenshot({ path: file, type, ...(type === 'jpeg' ? { quality } : {}) });
  await ctx.close();
  console.log('wrote', path.relative(UPLOADS, file));
}

// hero mock (3000x1600)
await shoot(heroHtml(), 1500, 800, out('fieldnote-workspace.png'), { dsf: 2 });

// gradient art for the media library (root of uploads)
for (const [name, [bg, blobs]] of Object.entries(arts)) {
  await shoot(art(1600, 1000, bg, blobs), 1600, 1000, out(`${name}.jpg`), { type: 'jpeg', quality: 88 });
}

// post heroes (16:9)
const postHeroes = {
  'introducing-fieldnote-3': 'dusk',
  'notes-that-survive-handoffs': 'lagoon',
  'search-that-reads-your-mind': 'orchid',
  'our-release-notes-playbook': 'dunes',
  'a-calm-week-at-larkspur': 'pine',
};
for (const [slug, a] of Object.entries(postHeroes)) {
  const [bg, blobs] = arts[a];
  await shoot(art(1600, 900, bg, blobs), 1600, 900, out('posts', `${slug}.jpg`), { type: 'jpeg', quality: 88 });
}

// avatars (testimonials and authors)
for (const [slug, p] of Object.entries(people)) {
  const svg = avatarSvg(p);
  const html = `<body style="margin:0">${svg}</body>`;
  const dir = ['maya-okafor', 'jonas-lindqvist', 'priya-raman'].includes(slug) ? 'authors' : 'testimonials';
  await shoot(html, 512, 512, out(dir, `${slug}.png`));
}

await browser.close();
