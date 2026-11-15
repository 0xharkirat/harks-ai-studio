// Shared helpers for the plate capture scripts (Playwright + Tina admin).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const OUT = path.join(ROOT, 'out');
export const SITE = path.join(ROOT, 'site');
export const BASE = process.env.PLATES_URL ?? 'http://localhost:3000';
export const W = 1920;
export const H = 1080;
export const DSF = Number(process.env.PLATES_DSF ?? 2);

export const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// CSS injected into every frame: hides the Next.js dev badge and the site's breakpoint badge.
const HIDE_CSS = `
nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button] { display: none !important; }
.fixed.bottom-1.left-1.font-mono { display: none !important; }
`;

export async function launch() {
  return chromium.launch({
    args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'],
  });
}

/** A fresh browser context: 1920x1080, light theme, Tina already "logged in" for local mode. */
export async function newContext(browser, { dsf = DSF, colorScheme = 'light' } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: dsf,
    colorScheme,
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'no-preference',
  });
  await ctx.addInitScript((css) => {
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
    // Next.js re-creates its dev badge, so keep the style in place.
    new MutationObserver(add).observe(document, { childList: true, subtree: true });
    try {
      localStorage.setItem('tina.local.isLogedIn', 'true');
      localStorage.setItem('tina.sidebarState', '"open"');
    } catch {}
  }, HIDE_CSS);
  return ctx;
}

/** Make sure the dev-badge style is present in every frame (hydration can drop init-script styles). */
export async function hideDevUi(page) {
  for (const fr of page.frames()) {
    await fr
      .evaluate((css) => {
        if (document.getElementById('__plates_hide2')) return;
        const s = document.createElement('style');
        s.id = '__plates_hide2';
        s.textContent = css;
        document.documentElement.appendChild(s);
      }, HIDE_CSS)
      .catch(() => {});
  }
}

/** Wait until fonts, images and animations in a frame have settled. */
export async function settleFrame(frame, extra = 0) {
  await frame
    .evaluate(async () => {
      await document.fonts?.ready;
      const imgs = [...document.images];
      await Promise.all(
        imgs.map((i) =>
          i.complete && i.naturalWidth > 0
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
  if (extra) await sleep(extra);
}

export function previewFrame(page) {
  return page.frames().find((f) => f !== page.mainFrame() && f.url().startsWith(BASE));
}

/** Open the visual editor at `route` (a site route such as "/" or "/posts/x") in edit mode. */
export async function openEditor(page, route = '/') {
  await page.goto(`${BASE}/admin/index.html#/~${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#tina-iframe', { timeout: 60000 }).catch(() => {});
  const enter = page.getByRole('button', { name: 'Enter Edit Mode' });
  if (await enter.isVisible().catch(() => false)) await enter.click();
  await page.waitForSelector('#tina-iframe', { timeout: 60000 });
  await waitForPreview(page);
}

/** Wait for the preview iframe to render real content and for Tina to attach its overlays. */
export async function waitForPreview(page, { animMs = 2600 } = {}) {
  await page.waitForFunction(
    () => {
      const f = document.querySelector('#tina-iframe');
      const d = f?.contentDocument;
      return !!d && d.readyState === 'complete' && d.querySelectorAll('[data-tina-field]').length > 0;
    },
    null,
    { timeout: 90000 },
  );
  await hideDevUi(page);
  const fr = previewFrame(page);
  if (fr) await settleFrame(fr);
  await sleep(animMs); // the starter fades text in word by word
  await page.waitForFunction(() => !document.querySelector('.animate-spin, [role="progressbar"]'), null, { timeout: 20000 }).catch(() => {});
}

/** Park the mouse somewhere neutral (empty sidebar space) so no hover state shows. */
export async function parkMouse(page) {
  await page.mouse.move(220, 960);
  await sleep(120);
}

// ---------------------------------------------------------------------------- boxes + shots

const manifest = [];
export const plates = manifest;

/**
 * Collect bounding boxes (CSS px, viewport space) for a map of name -> spec.
 * spec = { sel | js, frame?: 'top'|'preview', all?: boolean, text?: string }
 * `js` is the source of a function that returns an array of elements (used when a selector is not enough).
 */
export async function collectBoxes(page, spec = {}) {
  const prev = previewFrame(page);
  const iframeRect = await page.evaluate(() => {
    const r = document.querySelector('#tina-iframe')?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  });
  const boxes = {};
  for (const [name, s] of Object.entries(spec)) {
    const fr = s.frame === 'preview' ? prev : page.mainFrame();
    if (!fr) continue;
    const off = s.frame === 'preview' && iframeRect ? { x: iframeRect.x, y: iframeRect.y } : { x: 0, y: 0 };
    const found = await fr
      .evaluate(
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
            return { x: r.x, y: r.y, w: r.width, h: r.height, text: (e.textContent || '').trim().slice(0, 80) };
          });
        },
        { sel: s.sel, js: s.js, all: !!s.all, text: s.text },
      )
      .catch(() => []);
    const round = (n) => Math.round(n * 10) / 10;
    const mapped = found.map((b) => ({ x: round(b.x + off.x), y: round(b.y + off.y), w: round(b.w), h: round(b.h), text: b.text }));
    if (mapped.length) boxes[name] = s.all ? mapped : mapped[0];
  }
  return boxes;
}

export const COMMON_BOXES = {
  sidebar: { sel: 'div.fixed.top-0.left-0' },
  preview: { sel: '#tina-iframe' },
  saveButton: { sel: 'button', text: 'Save' },
  resetButton: { sel: 'button', text: 'Reset' },
};

/** Take the screenshot + boxes file and add the plate to the manifest. */
export async function shot(page, name, { boxes = {}, what = '', dir = '', full = false, target = page, dsf = DSF } = {}) {
  await hideDevUi(page);
  const outDir = path.join(OUT, dir);
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${name}.png`);
  await target.screenshot({ path: file, fullPage: full, animations: 'allow', caret: 'hide' });
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
    site: 'plates/site (Next.js tina-nextjs-starter, fictional product "Fieldnote")',
    plates: [...byName.values()].map(withWeb).sort((a, b) => a.name.localeCompare(b.name)),
    sequences: mergeByName(prev.sequences ?? [], sequences),
    files: extra.files ?? prev.files ?? [],
    notes: 'Each plate has <name>.png (master, 3840 px wide at deviceScaleFactor 2), <name>.webp (web copy, 2880 px wide, quality 92) and <name>.boxes.json (CSS-pixel boxes in the 1920x1080 viewport). Sequences: <dir>/NNNN.png + .webp + .boxes.json and <dir>-1x/NNNN.png (1920x1080 light copy).',
  };
  fs.writeFileSync(f, JSON.stringify(out, null, 2));
  return out;
}
