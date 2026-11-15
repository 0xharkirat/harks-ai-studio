// Re-draws the block preview thumbnails shown in Tina's "add block" picker
// (site/public/blocks/*.png) from the Fieldnote demo site itself, so the picker
// shows the demo content instead of the starter's own screenshots.
// Needs the dev server on PLATES_URL. Run: node assets/gen-block-previews.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.PLATES_URL ?? 'http://localhost:3000';
const OUTDIR = path.resolve(import.meta.dirname, '../../site/public/blocks');

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, colorScheme: 'light' });
const page = await ctx.newPage();
await page.addStyleTag({ content: '' }).catch(() => {});

async function grab(url, selector, file, maxH = 760) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: `nextjs-portal,[data-nextjs-toast]{display:none!important}.fixed.bottom-1.left-1.font-mono{display:none!important}header nav{position:absolute!important}`,
  });
  await page.waitForTimeout(3200);
  const box = await page.evaluate((sel) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return { y: r.top + window.scrollY, height: r.height };
  }, selector);
  await page.screenshot({
    path: path.join(OUTDIR, file),
    fullPage: true,
    clip: { x: 0, y: box.y, width: 1280, height: Math.min(box.height, maxH) },
  });
  console.log('wrote', file, Math.round(box.height));
}

const block = (n) => `[data-tina-field$="blocks.${n}"]`;
await grab('/', block(0), 'callout.png', 160);
await grab('/', block(1), 'hero.png', 700);
await grab('/', block(2), 'stats.png');
await grab('/', block(3), 'features.png');
await grab('/', block(4), 'testimonial.png');
await grab('/', block(5), 'cta.png');
await grab('/about', block(0), 'content.png', 520);

// Video block: no demo page uses it, so draw a neutral thumbnail.
const vctx = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
const v = await vctx.newPage();
await v.setContent(`<body style="margin:0;background:#fff;display:grid;place-items:center;height:640px;font-family:-apple-system,Inter,sans-serif">
<div style="width:900px;height:506px;border-radius:24px;border:1px solid #e5e5e5;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,.12);box-sizing:content-box">
<div style="width:100%;height:100%;border-radius:14px;background:radial-gradient(60% 80% at 20% 20%,#a78bfa,transparent),radial-gradient(60% 80% at 80% 70%,#38bdf8,transparent),#312e81;display:grid;place-items:center">
<div style="width:96px;height:96px;border-radius:50%;background:rgba(255,255,255,.9);display:grid;place-items:center"><div style="margin-left:8px;border-left:30px solid #4f46e5;border-top:19px solid transparent;border-bottom:19px solid transparent"></div></div></div></div></body>`);
await v.screenshot({ path: path.join(OUTDIR, 'video.png') });
console.log('wrote video.png');

await browser.close();
