// Shared helpers for the EagleEye plate capture scripts (Playwright + the portal demo build).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const OUT = path.join(ROOT, 'out');
export const BASE = process.env.PLATES_URL ?? 'http://localhost:3100';
export const W = 1600;
export const H = 1000;
export const DSF = Number(process.env.PLATES_DSF ?? 2);
/** 'chrome' = the real Chrome app, '' = the Chromium that Playwright pins. */
const CHANNEL = process.env.PLATES_CHANNEL ?? 'chrome';

export const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CSS injected into every page: hides the Next.js dev badge (dev server only) and the
// "Sample data from Northwind Traders" banner. The banner is a `role="note"` block that the demo
// layout renders above the page; hiding it moves the page up, which is what we want.
const HIDE_CSS = `
nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display: none !important; }
body:not([data-plates-keep-banner]) [role="note"][data-plates-banner] { display: none !important; }
`;

export async function launch() {
  const args = ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'];
  return chromium.launch(CHANNEL ? { channel: CHANNEL, args } : { args });
}

/**
 * A fresh browser context: 1600x1000, light theme. The portal remembers the theme in localStorage
 * (next-themes, key "theme"), so `theme` sets it before the first paint.
 */
export async function newContext(browser, { dsf = DSF, theme = 'light' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: dsf,
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'no-preference',
  });
  await ctx.addInitScript(
    ({ css, theme }) => {
      try {
        localStorage.setItem('theme', theme);
      } catch {}
      const add = () => {
        try {
          const root = document.head || document.documentElement;
          if (!root || document.getElementById('__plates_hide')) return;
          const s = document.createElement('style');
          s.id = '__plates_hide';
          s.textContent = css;
          root.appendChild(s);
        } catch {}
      };
      add();
      document.addEventListener('DOMContentLoaded', add);
      // Mark the demo banner so the CSS above can hide it. React may re-render it, so keep watching.
      const mark = () => {
        for (const n of document.querySelectorAll('[role="note"]')) {
          if (/sample data from/i.test(n.textContent || '')) n.setAttribute('data-plates-banner', '');
        }
      };
      new MutationObserver(() => {
        add();
        mark();
      }).observe(document, { childList: true, subtree: true });
    },
    { css: HIDE_CSS, theme },
  );
  return ctx;
}

/** Make sure the hide style is present (hydration can drop init-script styles). */
export async function hideDevUi(page) {
  await page
    .evaluate((css) => {
      if (!document.getElementById('__plates_hide2')) {
        const s = document.createElement('style');
        s.id = '__plates_hide2';
        s.textContent = css;
        document.documentElement.appendChild(s);
      }
      for (const n of document.querySelectorAll('[role="note"]')) {
        if (/sample data from/i.test(n.textContent || '')) n.setAttribute('data-plates-banner', '');
      }
    }, HIDE_CSS)
    .catch(() => {});
}

/** Wait until fonts, images and animations on the page have settled, and no spinner shows. */
export async function settle(page, extra = 0) {
  await page
    .evaluate(async () => {
      await document.fonts?.ready;
      const imgs = [...document.images];
      await Promise.all(
        imgs.map((i) =>
          i.complete
            ? 1
            : new Promise((r) => {
                i.addEventListener('load', r, { once: true });
                i.addEventListener('error', r, { once: true });
                setTimeout(r, 4000);
              }),
        ),
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })
    .catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.animate-spin, [role="progressbar"], [aria-busy="true"]'), null, { timeout: 20000 }).catch(() => {});
  if (extra) await sleep(extra);
}

/** Open a portal route and wait for the page to settle. */
export async function open(page, route, { ready, extra = 800 } = {}) {
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
  // The demo signs in by itself: /login opens the callback route once it has a session.
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {});
  if (ready) await ready(page);
  await hideDevUi(page);
  await settle(page, extra);
}

/** Park the mouse in empty space so no hover state shows. */
export async function parkMouse(page) {
  await page.mouse.move(W - 40, H - 40);
  await sleep(150);
}

// ---------------------------------------------------------------------------- boxes + shots

const manifest = [];
export const plates = manifest;

const round = (n) => Math.round(n * 10) / 10;

/**
 * Collect bounding boxes (CSS px, viewport space) for a map of name -> spec.
 * spec = { loc: (page) => Locator, all?: boolean }   find by role, accessible name or text
 *      | { sel, text?, all? }                        CSS selector, optionally filtered by text
 *      | { js, all? }                                source of a function that returns elements
 * With `all`, the value is an array of boxes; otherwise one box (the first visible match).
 * Hidden matches (zero size) are skipped. Never select by child index.
 */
export async function collectBoxes(page, spec = {}) {
  const boxes = {};
  for (const [name, s] of Object.entries(spec)) {
    let found = [];
    try {
      if (s.loc) {
        const loc = s.loc(page);
        const n = await loc.count();
        for (let i = 0; i < n; i++) {
          const el = loc.nth(i);
          if (!(await el.isVisible().catch(() => false))) continue;
          const b = await el.boundingBox();
          if (!b || b.width <= 0 || b.height <= 0) continue;
          const text = ((await el.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          found.push({ x: b.x, y: b.y, w: b.width, h: b.height, text });
          if (!s.all) break;
        }
      } else {
        found = await page.evaluate(
          ({ sel, js, all, text }) => {
            let els = js ? [...new Function(`return (${js})`)()()] : [...document.querySelectorAll(sel)];
            if (text) els = els.filter((e) => (e.textContent || '').trim().toLowerCase().includes(text.toLowerCase()));
            els = els.filter((e) => {
              const r = e.getBoundingClientRect();
              return r.width > 0 && r.height > 0;
            });
            if (!all) els = els.slice(0, 1);
            return els.map((e) => {
              const r = e.getBoundingClientRect();
              return { x: r.x, y: r.y, w: r.width, h: r.height, text: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) };
            });
          },
          { sel: s.sel, js: s.js, all: !!s.all, text: s.text },
        );
      }
    } catch (e) {
      log('WARN box', name, String(e.message).split('\n')[0]);
    }
    const mapped = found.map((b) => ({ x: round(b.x), y: round(b.y), w: round(b.w), h: round(b.h), text: b.text }));
    if (mapped.length) boxes[name] = s.all ? mapped : mapped[0];
    else log('WARN no box for', name);
  }
  return boxes;
}

/** Take the screenshot + boxes file and add the plate to the manifest. */
export async function shot(page, name, { boxes = {}, what = '', dir = '', full = false, dsf = DSF } = {}) {
  await hideDevUi(page);
  const outDir = path.join(OUT, dir);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: full, animations: 'allow', caret: 'hide' });
  const b = await collectBoxes(page, boxes);
  const boxesFile = path.join(outDir, `${name}.boxes.json`);
  const dims = readPngSize(file);
  fs.writeFileSync(boxesFile, JSON.stringify({ viewport: { w: W, h: H }, image: dims, scale: dsf, boxes: b }, null, 2));
  const rel = (f) => path.relative(OUT, f);
  manifest.push({ name: rel(file).replace(/\.png$/, ''), file: rel(file), size: dims, boxes: rel(boxesFile), what });
  log('plate', rel(file), `${dims.w}x${dims.h}`);
  return b;
}

export const sequences = [];

/** Write one sequence frame: <dir>/NNNN.png (2x master), <dir>-1x/NNNN.png (css-pixel copy) and NNNN.boxes.json. */
export async function frame(page, dir, idx, { boxes = {}, light = true } = {}) {
  await hideDevUi(page);
  const n = String(idx).padStart(4, '0');
  const d = path.join(OUT, dir);
  fs.mkdirSync(d, { recursive: true });
  const file = path.join(d, `${n}.png`);
  await page.screenshot({ path: file, caret: 'hide', animations: 'allow' });
  if (light) {
    const d1 = path.join(OUT, `${dir}-1x`);
    fs.mkdirSync(d1, { recursive: true });
    await page.screenshot({ path: path.join(d1, `${n}.png`), scale: 'css', caret: 'hide', animations: 'allow' });
  }
  const b = await collectBoxes(page, boxes);
  fs.writeFileSync(path.join(d, `${n}.boxes.json`), JSON.stringify({ viewport: { w: W, h: H }, image: readPngSize(file), scale: DSF, boxes: b }, null, 2));
  return n;
}

export function readPngSize(file) {
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const mergeByName = (a, b) => {
  const m = new Map(a.map((x) => [x.name, x]));
  for (const x of b) m.set(x.name, x);
  return [...m.values()].sort((p, q) => p.name.localeCompare(q.name));
};

export function writeManifest(extra = {}) {
  fs.mkdirSync(OUT, { recursive: true });
  const f = path.join(OUT, 'manifest.json');
  let prev = { plates: [], sequences: [], files: [] };
  try {
    prev = JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {}
  const byName = new Map(prev.plates.map((p) => [p.name, p]));
  for (const p of manifest) byName.set(p.name, p);
  const withWeb = (p) => {
    const web = p.file.replace(/\.png$/, '.webp');
    if (!fs.existsSync(path.join(OUT, web))) return p;
    const w = Math.min(2880, p.size.w);
    return { ...p, web, webSize: { w, h: Math.round((p.size.h * w) / p.size.w) } };
  };
  const out = {
    generated: new Date().toISOString(),
    viewport: { w: W, h: H },
    deviceScaleFactor: DSF,
    site: 'SSW EagleEye portal, demo build (EAGLEEYE_DEMO=1), fictional company Northwind Traders',
    plates: [...byName.values()].map(withWeb).sort((a, b) => a.name.localeCompare(b.name)),
    sequences: mergeByName(prev.sequences ?? [], sequences),
    files: extra.files ?? prev.files ?? [],
    notes: 'Each plate has <name>.png (master, 3200 px wide at deviceScaleFactor 2), <name>.webp (web copy, 2880 px wide, quality 92) and <name>.boxes.json (CSS-pixel boxes in the 1600x1000 viewport). Sequences: <dir>/NNNN.png + .webp + .boxes.json and <dir>-1x/NNNN.png (1600x1000 light copy).',
  };
  fs.writeFileSync(f, JSON.stringify(out, null, 2));
  return out;
}
