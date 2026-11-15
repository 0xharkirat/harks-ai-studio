import { chromium } from 'playwright';
import { createServer, build, preview } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Reuse a running dev server (MV_URL or :5190) or start a private one. */
export async function devServer() {
  const url = process.env.MV_URL ?? 'http://localhost:5190';
  try {
    const r = await fetch(url + '/src/main.ts', { signal: AbortSignal.timeout(1500) });
    if (r.ok) return { url, close: async () => {} };
  } catch {}
  const server = await createServer({ root, configFile: path.join(root, 'vite.config.ts'), logLevel: 'error', server: { port: 0, strictPort: false } });
  await server.listen();
  const addr = server.httpServer.address();
  return { url: `http://localhost:${addr.port}`, close: () => server.close() };
}

/**
 * Freeze the current code into a static build and serve it, so every worker of a long render
 * runs the same version even while scene files keep changing.
 */
export async function snapshotServer(tag = 'render') {
  const outDir = path.join(root, '..', 'out', `build-${tag}-${process.pid}`);
  await build({ root, configFile: path.join(root, 'vite.config.ts'), logLevel: 'error', build: { outDir, emptyOutDir: true } });
  const server = await preview({ root, configFile: path.join(root, 'vite.config.ts'), logLevel: 'error', build: { outDir }, preview: { port: 0, strictPort: false } });
  const addr = server.httpServer.address();
  return {
    url: `http://localhost:${addr.port}`,
    close: async () => { await new Promise((r) => server.httpServer.close(r)); fs.rmSync(outDir, { recursive: true, force: true }); },
  };
}

export async function launch() {
  return chromium.launch({
    // The installed Google Chrome, not Playwright's bundled Chromium: the bundled build in 1.64.x has unfixed CVEs.
    channel: 'chrome',
    args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', '--run-all-compositor-stages-before-draw', '--disable-partial-raster', '--font-render-hinting=none', '--force-color-profile=srgb', '--js-flags=--max-old-space-size=8192'],
  });
}

/** Open a cut in render mode at its native size and wait until it is ready. */
export async function openPage(browser, url, { cut, scale = 1 } = {}) {
  const probe = await browser.newPage({ viewport: { width: 400, height: 300 } });
  // Find the cut's size first so the viewport matches it exactly.
  await probe.goto(`${url}/?mode=render&cut=${cut}`);
  await probe.waitForFunction(() => window.__mv);
  await probe.evaluate(() => window.__mv.ready);
  const { W, H } = await probe.evaluate(() => ({ W: window.__mv.W, H: window.__mv.H }));
  await probe.close();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`${url}/?mode=render&cut=${cut}`);
  await page.waitForFunction(() => window.__mv);
  await page.evaluate(() => window.__mv.ready);
  const cdp = await page.context().newCDPSession(page);
  const info = await page.evaluate(() => ({ W: window.__mv.W, H: window.__mv.H, total: window.__mv.totalFrames, fps: window.__mv.fps, music: window.__mv.music, duration: window.__mv.duration }));
  return { page, cdp, ...info };
}

/** Seek to a frame and capture it as a PNG buffer. */
export async function capture(p, frame, { clipScale } = {}) {
  await p.page.evaluate((f) => window.__mv.seek(f), frame);
  const opts = { format: 'png', optimizeForSpeed: true, captureBeyondViewport: false };
  if (clipScale) opts.clip = { x: 0, y: 0, width: p.W, height: p.H, scale: clipScale };
  const r = await p.cdp.send('Page.captureScreenshot', opts);
  return Buffer.from(r.data, 'base64');
}

export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[k] = v;
    } else out._.push(a);
  }
  return out;
}

export const fmtBar = (t) => {
  const b = t / 0.5;
  return `${Math.floor(b / 4) + 1}.${(Math.floor(b) % 4) + 1}`;
};
