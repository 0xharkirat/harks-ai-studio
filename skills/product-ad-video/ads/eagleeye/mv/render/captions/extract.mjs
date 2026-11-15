// Sample a cut and report every on-screen line (Headline words, the typed command, the llama's speech) with its time span.
// node extract.mjs <cut> [stepFrames=3] > out.json
import { devServer, launch, openPage, parseArgs } from '../lib.mjs';
const args = parseArgs(process.argv.slice(2));
const cut = args._[0];
const stepF = Number(args.step ?? 3);
const server = await devServer();
const browser = await launch();
const p = await openPage(browser, server.url, { cut });
const found = new Map(); // id -> { scene, text, kind, times: [] , rect }
const CMD = 'npx create-tina-app@latest';
for (let f = 0; f < p.total; f += stepF) {
  await p.page.evaluate((fr) => window.__mv.seek(fr), f);
  const t = f / p.fps;
  const items = await p.page.evaluate((CMD) => {
    const W = window.__mv.W, H = window.__mv.H;
    const eff = (el) => { let o = 1; for (let e = el; e && e.id !== 'stage'; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= parseFloat(cs.opacity); } return o; };
    const out = [];
    let n = 0;
    const seen = new Set();
    document.querySelectorAll('#stage span').forEach((inner) => {
      if (inner.style.willChange !== 'transform') return;
      const outer = inner.parentElement; const root = outer?.parentElement;
      if (!root || outer.style.overflow !== 'hidden') return;
      if (seen.has(root)) return;
      seen.add(root);
      if (!root.dataset.hid) root.dataset.hid = 'h' + (window.__hid = (window.__hid ?? 0) + 1);
      const words = [...root.querySelectorAll(':scope > span')];
      let text = '';
      let shown = 0;
      for (const node of root.childNodes) {
        if (node.nodeName === 'BR') { text += '\n'; continue; }
        const w = node.firstElementChild;
        if (!w) continue;
        text += w.textContent;
        const e = eff(w);
        if (e >= 0.25) shown++;
      }
      const r = root.getBoundingClientRect();
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      const scene = root.closest('[data-scene]')?.dataset.scene ?? '?';
      if (shown > 0 && cx > -50 && cx < W + 50 && cy > -50 && cy < H + 50) out.push({ id: root.dataset.hid, kind: 'head', scene, text: text.replace(/ /g, ' ').replace(/[ \t]+\n/g, '\n').trim(), shown, total: words.length, y: Math.round(cy) });
    });
    // the typed command
    document.querySelectorAll('#stage span').forEach((s) => {
      if (s.children.length) return;
      const tx = s.textContent;
      if (tx && tx.length > 0 && CMD.startsWith(tx) && tx.length >= 3 && s.parentElement?.style.fontFamily?.includes?.('RMono') !== undefined) {
        if (eff(s) < 0.5) return;
        if (!s.dataset.hid) s.dataset.hid = 'c' + (window.__hid = (window.__hid ?? 0) + 1);
        out.push({ id: s.dataset.hid, kind: 'cmd', scene: s.closest('[data-scene]')?.dataset.scene ?? '?', text: tx, full: tx === CMD });
      }
    });
    // the llama's speech bubble (marked data-say by the problem scene)
    document.querySelectorAll('#stage [data-say]').forEach((d) => {
      if (eff(d) < 0.5) return;
      if (!d.dataset.hid) d.dataset.hid = 's' + (window.__hid = (window.__hid ?? 0) + 1);
      out.push({ id: d.dataset.hid, kind: 'say', scene: d.closest('[data-scene]')?.dataset.scene ?? '?', text: d.textContent.replace(/\s+/g, ' ').trim() });
    });
    // plain-span lines: the stack words, the Apache pill and the star counter
    const leafs = [...document.querySelectorAll('#stage span')].filter((s) => !s.children.length);
    for (const s of leafs) {
      const tx = s.textContent.trim();
      const scene = s.closest('[data-scene]')?.dataset.scene ?? '?';
      if (['Next.js', 'Astro', 'Hugo'].includes(tx)) { if (eff(s) >= 0.25) out.push({ id: 'stack:' + tx, kind: 'stack', scene, text: tx }); }
      else if (tx === 'Apache 2.0') { if (eff(s) >= 0.25) out.push({ id: 'pill', kind: 'pill', scene, text: tx }); }
      else if (scene === 'proof' && /^\d+(\.\d)?k?$/.test(tx)) { if (eff(s) >= 0.25) out.push({ id: 'count', kind: 'count', scene, text: tx }); }
    }
    return out;
  }, CMD);
  for (const it of items) {
    let e = found.get(it.id);
    if (!e) { e = { id: it.id, kind: it.kind, scene: it.scene, text: it.text, first: t, last: t, fullAt: null, n: 0 }; found.set(it.id, e); }
    e.last = t; e.n++;
    if (it.kind === 'cmd') { e.text = 'npx create-tina-app@latest'; if (it.full && e.fullAt == null) e.fullAt = t; } else if (it.text.length > e.text.length) e.text = it.text;
  }
}
await browser.close();
await server.close();
const res = [...found.values()].sort((a, b) => a.first - b.first);
console.log(JSON.stringify({ cut, step: stepF / p.fps, duration: p.duration, items: res }, null, 1));
