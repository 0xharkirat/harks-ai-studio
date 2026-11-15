// Captures every plate of the TinaCMS motion-graphics video from the real Tina visual editor.
//
//   node capture.mjs                 all groups
//   node capture.mjs public hero     only these groups
//
// Groups: public, hero, hovers, after, blocks, media, rich, lists, files, normalize
// Needs the demo site on PLATES_URL (default http://localhost:3000), started with `pnpm dev` in ../site.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as L from './lib.mjs';
import { convertAll } from './webp.mjs';

const { OUT, SITE, BASE, sleep, log } = L;

// ------------------------------------------------------------------ content snapshot
const CONTENT = path.join(SITE, 'content');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const snapshot = new Map(walk(CONTENT).map((f) => [f, fs.readFileSync(f)]));
function restoreContent() {
  let n = 0;
  for (const [f, buf] of snapshot) if (!fs.readFileSync(f).equals(buf)) (fs.writeFileSync(f, buf), n++);
  return n;
}

/** After restoring files, wait until Tina's content API serves the original home headline again. */
async function waitIndexed(expected) {
  const want = expected ?? /headline: (.*)\n/.exec(snapshot.get(path.join(CONTENT, 'pages/home.mdx')).toString())?.[1]?.trim();
  const q = '{ page(relativePath: "home.mdx") { blocks { __typename ... on PageBlocksHero { headline } } } }';
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://localhost:4001/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: q }) });
      const j = await r.json();
      const got = j.data?.page?.blocks?.find((b) => b.__typename === 'PageBlocksHero')?.headline;
      if (got === want) return log('content indexed, headline =', JSON.stringify(got));
    } catch {}
    await sleep(500);
  }
  log('WARN restored content not indexed after 20s');
}

/** Put the "after" headline in home.mdx (as if it was typed and saved) and wait until Tina serves it. */
async function applyNewHeadline() {
  const f = path.join(CONTENT, 'pages/home.mdx');
  const txt = fs.readFileSync(f, 'utf8').replace(/^(\s+headline: ).*$/m, `$1${TARGET}`);
  fs.writeFileSync(f, txt);
  await waitIndexed(TARGET);
}

// ------------------------------------------------------------------ shared box specs
const SIDEBAR = 'div.fixed.top-0.left-0';
const BASE_BOXES = {
  sidebar: { sel: SIDEBAR },
  preview: { sel: '#tina-iframe' },
  menuButton: { sel: 'button[aria-label="Open navigation menu"]' },
  localModeBadge: { sel: 'a', text: 'You are in local mode' },
  breadcrumb: { sel: 'nav[aria-label=breadcrumb]' },
  saveButton: { sel: 'button', text: 'Save' },
  resetButton: { sel: 'button', text: 'Reset' },
};
const ROW_JS = `() => [...document.querySelectorAll('${SIDEBAR} button[type=button]')]
  .filter((b) => b.getBoundingClientRect().x > 370 && b.getBoundingClientRect().height > 40)
  .map((b) => { let e = b; while (e.parentElement && e.getBoundingClientRect().width < 350) e = e.parentElement; return e; })`;
const BLOCK_ROWS = { blockItems: { js: ROW_JS, all: true }, addBlockButton: { js: `() => [...document.querySelectorAll('${SIDEBAR} button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width >= 26 && r.width <= 30 && r.x > 370 && r.y > 100 && r.y < 260; })` } };
const IMAGE_ROW = { js: `() => [...document.querySelectorAll('${SIDEBAR} *')].filter((e) => e.children.length === 0 && e.textContent.trim() === 'Image').map((e) => { let r = e; while (r.parentElement && r.getBoundingClientRect().width < 350) r = r.parentElement; return r; })` };
const TOAST = { js: `() => { const t = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /Document saved/.test(e.textContent)); let e = t; while (e && e.getBoundingClientRect().width < 200) e = e.parentElement; return e ? [e] : []; }` };
const FORM_FIELDS = {
  formLabels: { sel: `${SIDEBAR} label`, all: true },
  formInputs: { sel: `${SIDEBAR} input, ${SIDEBAR} textarea, ${SIDEBAR} select`, all: true },
};
const HERO_PREVIEW = {
  previewHeadline: { frame: 'preview', sel: '[data-tina-field$="blocks.1.headline"]' },
  previewTagline: { frame: 'preview', sel: '[data-tina-field$="blocks.1.tagline"]' },
  previewActions: { frame: 'preview', sel: '[data-tina-field*="blocks.1.actions."]', all: true },
  previewHeroImage: { frame: 'preview', sel: '[data-tina-field$="blocks.1.image"]' },
  previewHeroBlock: { frame: 'preview', sel: '[data-tina-field$="blocks.1"]' },
  previewCallout: { frame: 'preview', sel: '[data-tina-field$="blocks.0"]' },
};

const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
async function boxOf(page, name, spec) {
  const b = await L.collectBoxes(page, { [name]: spec });
  if (!b[name]) throw new Error(`no box for ${name}`);
  return b[name];
}

/** Add or remove a <style> in the preview iframe. */
async function previewCss(page, id, css) {
  const fr = L.previewFrame(page);
  await fr.evaluate(
    ([id, css]) => {
      document.getElementById(id)?.remove();
      if (css) {
        const s = document.createElement('style');
        s.id = id;
        s.textContent = css;
        document.documentElement.appendChild(s);
      }
    },
    [id, css],
  );
}

async function waitPreviewHeadline(page, text) {
  const fr = L.previewFrame(page);
  await fr
    .waitForFunction((t) => document.querySelector('[data-tina-field$="blocks.1.headline"] .sr-only')?.textContent === t, text, { timeout: 5000 })
    .catch(() => log('WARN preview headline did not reach', JSON.stringify(text)));
  await fr.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/** Wait until the word-by-word text fade-in in the preview has finished (after a reload or re-render). */
async function waitTextSettled(page, ms = 6000) {
  const fr = L.previewFrame(page);
  await fr
    .waitForFunction(
      () => {
        const spans = [...document.querySelectorAll('h1 span[aria-hidden], p span[aria-hidden]')];
        return spans.length > 0 && spans.every((s) => parseFloat(getComputedStyle(s).opacity) > 0.99 && !/blur\((?!0px)/.test(getComputedStyle(s).filter));
      },
      null,
      { timeout: ms },
    )
    .catch(() => log('WARN text fade did not settle'));
  await sleep(150);
}

/** visibility:hidden on the largest element (under maxH px tall) whose text matches `re`. */
async function hideByText(page, re, maxH) {
  const hidden = await page.evaluate(
    ([src, maxH]) => {
      const re = new RegExp(src);
      const cands = [...document.querySelectorAll('body *')].filter((e) => re.test(e.textContent.trim()) && e.getBoundingClientRect().height > 8 && e.getBoundingClientRect().height < maxH);
      cands.sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height);
      if (!cands.length) return false;
      cands[0].style.visibility = 'hidden';
      return true;
    },
    [re.source, maxH],
  );
  if (!hidden) log('WARN nothing to hide for', String(re));
}

async function openHome(browser) {
  const ctx = await L.newContext(browser);
  const page = await ctx.newPage();
  await L.openEditor(page, '/');
  await L.parkMouse(page);
  return { ctx, page };
}

// ------------------------------------------------------------------ groups
const TARGET = 'Edit your site. Visually.';
const NO_FADE = '[data-tina-field$=".headline"] span, [data-tina-field$=".tagline"] span { opacity: 1 !important; filter: none !important; transform: none !important; transition: none !important; }';

const groups = {
  async public(browser) {
    const ctx = await L.newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await L.settleFrame(page.mainFrame(), 3200);
    const boxes = {
      header: { sel: 'header nav' },
      callout: { sel: '[data-tina-field$="blocks.0"]' },
      heroHeadline: { sel: '[data-tina-field$="blocks.1.headline"]' },
      heroTagline: { sel: '[data-tina-field$="blocks.1.tagline"]' },
      heroButtons: { sel: '[data-tina-field*="blocks.1.actions."]', all: true },
      heroImage: { sel: '[data-tina-field$="blocks.1.image"]' },
      blocks: { sel: '[data-tina-field$="blocks.0"], [data-tina-field$="blocks.1"], [data-tina-field$="blocks.2"], [data-tina-field$="blocks.3"], [data-tina-field$="blocks.4"], [data-tina-field$="blocks.5"]', all: true },
    };
    await L.shot(page, 'site-home', { boxes, what: 'Public Fieldnote homepage, top of page (viewport).' });
    await L.shot(page, 'site-home-full', { boxes, full: true, what: 'Public Fieldnote homepage, full page (boxes are in page coordinates).' });
    await ctx.close();
  },

  async hero(browser) {
    const { ctx, page: p } = await openHome(browser);
    const homeFile = path.join(CONTENT, 'pages/home.mdx');

    await L.shot(p, 'admin-home', {
      what: 'Visual editor on the homepage. Sidebar at top level, list of blocks visible. Tina dashed outlines show on editable fields.',
      boxes: { ...BASE_BOXES, ...BLOCK_ROWS, ...HERO_PREVIEW },
    });

    await previewCss(p, '__plates_clean', '[data-tina-field] { outline: none !important; }');
    await L.shot(p, 'admin-home-clean', {
      what: 'Same view as admin-home with Tina outlines in the preview removed (clean backdrop).',
      boxes: { ...BASE_BOXES, ...BLOCK_ROWS, ...HERO_PREVIEW },
    });
    await previewCss(p, '__plates_clean', null);

    // hover the hero headline: Tina draws its click-to-edit outline
    const head = await boxOf(p, 'h', HERO_PREVIEW.previewHeadline);
    const c = center(head);
    await p.mouse.move(c.x, c.y + 380, { steps: 4 });
    await p.mouse.move(c.x, c.y, { steps: 12 });
    await sleep(700);
    await L.shot(p, 'admin-hover-hero', {
      what: 'Mouse hovering the hero headline in the preview: Tina click-to-edit outline and highlight on the headline.',
      boxes: { ...BASE_BOXES, ...BLOCK_ROWS, ...HERO_PREVIEW, hoveredElement: HERO_PREVIEW.previewHeadline },
    });

    // click it: the sidebar opens the hero form with the headline field focused
    await p.mouse.click(c.x, c.y);
    await p.waitForSelector('input[name="blocks.1.headline"]', { timeout: 10000 });
    await p.locator('input[name="blocks.1.headline"]').focus();
    await sleep(900);
    const formBoxes = {
      ...BASE_BOXES,
      ...FORM_FIELDS,
      ...HERO_PREVIEW,
      headlineField: { sel: 'input[name="blocks.1.headline"]' },
      taglineField: { sel: 'input[name="blocks.1.tagline"]' },
      backgroundField: { sel: 'select[name="blocks.1.background"]' },
      imageRow: IMAGE_ROW,
      hoveredElement: HERO_PREVIEW.previewHeadline,
    };
    await L.shot(p, 'admin-hero-form', {
      what: 'After clicking the hero headline: sidebar shows the Hero block form with the Headline field focused. Mouse still over the headline.',
      boxes: formBoxes,
    });
    fs.mkdirSync(OUT, { recursive: true });
    fs.copyFileSync(homeFile, path.join(OUT, 'code-file-before.md'));

    // typing sequence
    await previewCss(p, '__plates_nofade', NO_FADE);
    await p.mouse.move(220, 960);
    await p.locator('input[name="blocks.1.headline"]').focus();
    await p.keyboard.press('ControlOrMeta+A');
    await sleep(300);
    const seqBoxes = { ...formBoxes, hoveredElement: undefined };
    delete seqBoxes.hoveredElement;
    const frames = [];
    const readState = async () => ({
      inputValue: await p.locator('input[name="blocks.1.headline"]').inputValue(),
      previewText: await L.previewFrame(p).evaluate(() => document.querySelector('[data-tina-field$="blocks.1.headline"] .sr-only')?.textContent ?? ''),
    });
    let n = await L.frame(p, 'seq-type-headline', 0, { boxes: seqBoxes });
    frames.push({ frame: 0, file: `${n}.png`, typed: '', note: 'original headline selected, nothing typed yet', ...(await readState()) });
    for (let i = 0; i < TARGET.length; i++) {
      await p.keyboard.type(TARGET[i]);
      await waitPreviewHeadline(p, TARGET.slice(0, i + 1));
      n = await L.frame(p, 'seq-type-headline', i + 1, { boxes: seqBoxes });
      frames.push({ frame: i + 1, file: `${n}.png`, typed: TARGET.slice(0, i + 1), ...(await readState()) });
    }
    fs.writeFileSync(path.join(OUT, 'seq-type-headline/frames.json'), JSON.stringify({ target: TARGET, light: '../seq-type-headline-1x/', frames }, null, 2));
    L.sequences.push({ name: 'seq-type-headline', dir: 'seq-type-headline/', light: 'seq-type-headline-1x/', frames: frames.length, size: L.readPngSize(path.join(OUT, 'seq-type-headline/0000.png')), json: 'seq-type-headline/frames.json', what: `Typing "${TARGET}" into the hero Headline field. Frame 0 = old headline selected, frame N = N characters typed. The preview updates live (word fade-in disabled so frames are crisp).` });

    await L.shot(p, 'admin-hero-typed', {
      what: 'Same view as the typing sequence after the last character: sidebar field and preview both show the new headline.',
      boxes: seqBoxes,
    });
    // (the word fade-in override stays on: the starter's TextEffect leaves a re-typed word invisible)

    // save
    const saveBtn = p.getByRole('button', { name: 'Save', exact: true });
    await saveBtn.click();
    await p.getByText('Document saved', { exact: false }).first().waitFor({ timeout: 10000 }).catch(() => log('WARN no toast'));
    await waitTextSettled(p);
    await L.shot(p, 'admin-saved', {
      what: 'State right after Save: Tina saved the document to the local file (toast / saved state).',
      boxes: { ...seqBoxes, toast: TOAST },
    });
    await p.waitForFunction(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save')?.disabled, null, { timeout: 15000 }).catch(() => {});
    await sleep(1200);
    fs.copyFileSync(homeFile, path.join(OUT, 'code-file-after.md'));
    try {
      execFileSync('diff', ['-u', path.join(OUT, 'code-file-before.md'), path.join(OUT, 'code-file-after.md')], { stdio: 'pipe' });
    } catch (e) {
      fs.writeFileSync(path.join(OUT, 'code-file.diff'), String(e.stdout));
    }

    // ---- second typing sequence, chained: the headline already reads the new text (saved above)
    const tagBox = await boxOf(p, 't', HERO_PREVIEW.previewTagline);
    const tc = center(tagBox);
    await p.mouse.move(tc.x, tc.y + 200, { steps: 3 });
    await p.mouse.move(tc.x, tc.y, { steps: 10 });
    await sleep(500);
    await p.mouse.click(tc.x, tc.y);
    await p.locator('input[name="blocks.1.tagline"]').waitFor({ timeout: 10000 });
    await p.locator('input[name="blocks.1.tagline"]').focus();
    await sleep(600);
    await p.mouse.move(220, 960);
    await p.keyboard.press('ControlOrMeta+A');
    await sleep(300);
    const TAGLINE = 'Your content stays in Git. Your team edits it live.';
    const tagSel = '[data-tina-field$="blocks.1.tagline"]';
    const readTag = async () => ({
      inputValue: await p.locator('input[name="blocks.1.tagline"]').inputValue(),
      previewText: await L.previewFrame(p).evaluate((sel) => document.querySelector(sel)?.textContent ?? '', tagSel),
      previewHeadline: await L.previewFrame(p).evaluate(() => document.querySelector('[data-tina-field$="blocks.1.headline"] .sr-only')?.textContent ?? ''),
    });
    const tagFrames = [];
    n = await L.frame(p, 'seq-type-tagline', 0, { boxes: seqBoxes });
    tagFrames.push({ frame: 0, file: `${n}.png`, typed: '', note: 'old tagline selected, nothing typed yet', ...(await readTag()) });
    let fi = 1;
    for (let i = 0; i < TAGLINE.length; i += 2) {
      const typedNow = TAGLINE.slice(0, i + 2);
      await p.keyboard.type(TAGLINE.slice(i, i + 2));
      await L.previewFrame(p).waitForFunction(([sel, t]) => document.querySelector(sel)?.textContent === t, [tagSel, typedNow], { timeout: 5000 }).catch(() => log('WARN preview tagline did not reach', JSON.stringify(typedNow)));
      await L.previewFrame(p).evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      n = await L.frame(p, 'seq-type-tagline', fi, { boxes: seqBoxes });
      tagFrames.push({ frame: fi, file: `${n}.png`, typed: typedNow, ...(await readTag()) });
      fi++;
    }
    fs.writeFileSync(path.join(OUT, 'seq-type-tagline/frames.json'), JSON.stringify({ target: TAGLINE, charsPerFrame: 2, startsFrom: `headline already reads "${TARGET}" (chained after seq-type-headline)`, light: '../seq-type-tagline-1x/', frames: tagFrames }, null, 2));
    L.sequences.push({ name: 'seq-type-tagline', dir: 'seq-type-tagline/', light: 'seq-type-tagline-1x/', frames: tagFrames.length, size: L.readPngSize(path.join(OUT, 'seq-type-tagline/0000.png')), json: 'seq-type-tagline/frames.json', what: `Typing "${TAGLINE}" into the hero Tagline field, 2 characters per frame. Frame 0 = old tagline selected. The headline already reads "${TARGET}" so this chains after seq-type-headline.` });
    await L.shot(p, 'admin-tagline-typed', { what: 'Same view as the tagline sequence after the last frame: headline and tagline both show the new text.', boxes: seqBoxes });
    await previewCss(p, '__plates_nofade', null);
    await ctx.close();
  },

  // ---------------------------------------------------------------- hover plates (top-level block list, mouse over one element)
  async hovers(browser) {
    const { ctx, page: p } = await openHome(browser);
    const HOVERED = {
      hoveredElement: { frame: 'preview', js: `() => [...document.querySelectorAll('[data-tina-field]')].filter((e) => getComputedStyle(e).outlineStyle === 'solid').slice(-1)` },
      hoveredElements: { frame: 'preview', js: `() => [...document.querySelectorAll('[data-tina-field]')].filter((e) => getComputedStyle(e).outlineStyle === 'solid')`, all: true },
    };
    const targets = [
      ['admin-hover-callout', '[data-tina-field$="blocks.0.text"]', 'Mouse over the callout pill in the preview: Tina highlight on the callout text.'],
      ['admin-hover-tagline', '[data-tina-field$="blocks.1.tagline"]', 'Mouse over the hero tagline: Tina highlight on the tagline.'],
      ['admin-hover-cta-buttons', '[data-tina-field$="blocks.1.actions.0"]', 'Mouse over the "Start free" hero button: Tina highlight on the button.'],
      ['admin-hover-hero-image', '[data-tina-field$="blocks.1.image"]', 'Mouse over the hero image (the product screenshot): Tina highlight on the image block.'],
    ];
    for (const [name, sel, what] of targets) {
      await p.mouse.move(220, 960, { steps: 8 });
      await sleep(400);
      const b = await boxOf(p, 'x', { frame: 'preview', sel });
      const c = center(b);
      const y = Math.min(c.y, 940);
      await p.mouse.move(c.x, y, { steps: 14 });
      await sleep(800);
      await L.shot(p, name, { what, boxes: { ...BASE_BOXES, ...BLOCK_ROWS, ...HERO_PREVIEW, ...HOVERED } });
    }
    await ctx.close();
  },

  // One-off: let Tina re-serialize home.mdx so later before/after diffs show only the headline edit.
  async normalize(browser) {
    const { ctx, page: p } = await openHome(browser);
    const head = await boxOf(p, 'h', HERO_PREVIEW.previewHeadline);
    const c = center(head);
    await p.mouse.click(c.x, c.y);
    const input = p.locator('input[name="blocks.1.headline"]');
    await input.waitFor({ timeout: 10000 });
    const save = async () => {
      await p.getByRole('button', { name: 'Save', exact: true }).click();
      await p.waitForFunction(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Save')?.disabled, null, { timeout: 15000 });
      await sleep(1500);
    };
    await input.focus();
    await p.keyboard.press('End');
    await p.keyboard.type('x');
    await save();
    await input.focus();
    await p.keyboard.press('End');
    await p.keyboard.press('Backspace');
    await save();
    await ctx.close();
    log('normalized home.mdx');
  },

  // ---------------------------------------------------------------- the same views once the headline has been edited
  async after(browser) {
    await applyNewHeadline();
    const { ctx, page: p } = await openHome(browser);
    const HOVERED = {
      hoveredElement: { frame: 'preview', js: `() => [...document.querySelectorAll('[data-tina-field]')].filter((e) => getComputedStyle(e).outlineStyle === 'solid').slice(-1)` },
      hoveredElements: { frame: 'preview', js: `() => [...document.querySelectorAll('[data-tina-field]')].filter((e) => getComputedStyle(e).outlineStyle === 'solid')`, all: true },
    };
    const common = { ...BASE_BOXES, ...BLOCK_ROWS, ...HERO_PREVIEW };
    await L.shot(p, 'admin-home-after', { what: `Same as admin-home, but the hero headline already reads "${TARGET}" (saved). Top-level block list, no hover.`, boxes: common });

    const hoverTargets = [
      ['admin-hover-callout-after', '[data-tina-field$="blocks.0.text"]', 'Mouse over the callout pill, headline already edited.'],
      ['admin-hover-hero-image-after', '[data-tina-field$="blocks.1.image"]', 'Mouse over the hero image, headline already edited.'],
      ['admin-hover-tagline-after', '[data-tina-field$="blocks.1.tagline"]', 'Mouse over the hero tagline, headline already edited.'],
      ['admin-hover-hero-after', '[data-tina-field$="blocks.1.headline"]', `Mouse over the hero headline, which already reads "${TARGET}".`],
    ];
    for (const [name, sel, what] of hoverTargets) {
      await p.mouse.move(220, 960, { steps: 8 });
      await sleep(400);
      const b = await boxOf(p, 'x', { frame: 'preview', sel });
      const c = center(b);
      await p.mouse.move(c.x, Math.min(c.y, 940), { steps: 14 });
      await sleep(800);
      await L.shot(p, name, { what, boxes: { ...common, ...HOVERED } });
    }

    // click the TAGLINE: the Hero form opens with the tagline field focused
    const t = await boxOf(p, 't', HERO_PREVIEW.previewTagline);
    const tc = center(t);
    await p.mouse.move(tc.x, tc.y, { steps: 10 });
    await sleep(400);
    await p.mouse.click(tc.x, tc.y);
    await p.waitForSelector('input[name="blocks.1.tagline"]', { timeout: 10000 });
    await p.locator('input[name="blocks.1.tagline"]').focus();
    await p.keyboard.press('Home'); // show the start of the long tagline, not its end
    await sleep(900);
    await L.shot(p, 'admin-hero-form-after', {
      what: `Hero form open after clicking the TAGLINE in the preview, tagline field focused. The headline already reads "${TARGET}". Mouse still over the tagline.`,
      boxes: { ...BASE_BOXES, ...FORM_FIELDS, ...HERO_PREVIEW, headlineField: { sel: 'input[name="blocks.1.headline"]' }, taglineField: { sel: 'input[name="blocks.1.tagline"]' }, backgroundField: { sel: 'select[name="blocks.1.background"]' }, imageRow: IMAGE_ROW, hoveredElement: HERO_PREVIEW.previewTagline },
    });
    await ctx.close();
  },

  // ---------------------------------------------------------------- blocks: list, add-block picker, reorder
  async blocks(browser) {
    let { ctx, page: p } = await openHome(browser);
    const rowBoxes = async () => (await L.collectBoxes(p, { r: BLOCK_ROWS.blockItems })).r;

    // block list with one row hovered (edit and delete icons light up)
    let rows = await rowBoxes();
    await p.mouse.move(220, rows[2].y + rows[2].h / 2, { steps: 6 });
    await sleep(500);
    await L.shot(p, 'admin-blocks-list', {
      what: 'Sidebar block list (Sections) with the Stats row hovered: drag handle, edit and delete icons.',
      boxes: { ...BASE_BOXES, ...BLOCK_ROWS, hoveredRow: { js: `() => [...document.querySelectorAll('${SIDEBAR} button[type=button]')].filter((b) => b.getBoundingClientRect().x > 370 && /Stats/.test(b.parentElement.parentElement.textContent)).map((b) => b.parentElement.parentElement)` }, ...HERO_PREVIEW },
    });

    // add block template picker
    const add = await boxOf(p, 'add', BLOCK_ROWS.addBlockButton);
    await p.mouse.click(add.x + add.w / 2, add.y + add.h / 2);
    await p.getByText('Sections – Add New', { exact: false }).first().waitFor({ timeout: 10000 }).catch(() => {});
    await sleep(600);
    await L.settleFrame(p.mainFrame(), 800);
    await p.mouse.move(220, 700);
    await sleep(300);
    await L.shot(p, 'admin-add-block', {
      what: 'The Add block picker open in the sidebar: search field and template cards with preview images (Hero, Callout, Features, ...).',
      boxes: {
        ...BASE_BOXES,
        pickerTitle: { js: `() => [...document.querySelectorAll('${SIDEBAR} *')].filter((e) => e.children.length === 0 && /Add New/i.test(e.textContent))` },
        pickerSearch: { sel: `${SIDEBAR} input` },
        templateCards: { js: `() => [...document.querySelectorAll('${SIDEBAR} img')].map((i) => { let e = i; while (e.parentElement && !(e.textContent.trim().length > 0 && e.getBoundingClientRect().width > 350)) e = e.parentElement; return e; })`, all: true },
        templateImages: { sel: `${SIDEBAR} img`, all: true },
        ...HERO_PREVIEW,
      },
    });
    await ctx.close();

    // reorder: drag Stats above Callout
    ({ ctx, page: p } = await openHome(browser));
    rows = await rowBoxes();
    const x = 41;
    const y0 = rows[2].y + rows[2].h / 2;
    const target = rows[0].y + 8;
    const reorderBoxes = { ...BASE_BOXES, ...BLOCK_ROWS, ...HERO_PREVIEW, previewStats: { frame: 'preview', sel: '[data-tina-field$="blocks.2"]' } };
    await p.mouse.move(x, y0, { steps: 6 });
    await sleep(400);
    await L.shot(p, 'admin-reorder-0', { what: 'Reorder, step 1 of 4: pointer on the Stats row drag handle, order unchanged.', boxes: reorderBoxes });
    await p.mouse.down();
    await sleep(300);
    await p.mouse.move(x, y0 - 18, { steps: 5 });
    await sleep(350);
    await L.shot(p, 'admin-reorder-1', { what: 'Reorder, step 2 of 4: the Stats row is lifted and following the pointer.', boxes: reorderBoxes });
    const N = 12;
    const start = y0 - 18;
    let f = 0;
    const seqFrames = [];
    const snap = async (label) => {
      const n = await L.frame(p, 'seq-reorder', f, { boxes: reorderBoxes });
      seqFrames.push({ frame: f, file: `${n}.png`, note: label });
      f++;
    };
    await snap('lifted');
    for (let k = 1; k <= N; k++) {
      await p.mouse.move(x, start + ((target - start) * k) / N, { steps: 3 });
      await sleep(180);
      await snap(`drag ${k}/${N}`);
      if (k === Math.round(N / 2)) await L.shot(p, 'admin-reorder-2', { what: 'Reorder, step 3 of 4: Stats row halfway up, other rows slide down to make room.', boxes: reorderBoxes });
    }
    await p.mouse.up();
    await sleep(2200);
    await p.mouse.move(220, 800, { steps: 4 });
    await sleep(500);
    await snap('dropped');
    await L.shot(p, 'admin-reorder-3', { what: 'Reorder, step 4 of 4: dropped. Stats is now first in the list and the preview shows it at the top of the page. Save is enabled (unsaved change).', boxes: reorderBoxes });
    fs.writeFileSync(path.join(OUT, 'seq-reorder/frames.json'), JSON.stringify({ light: '../seq-reorder-1x/', frames: seqFrames }, null, 2));
    L.sequences.push({ name: 'seq-reorder', dir: 'seq-reorder/', light: 'seq-reorder-1x/', frames: seqFrames.length, size: L.readPngSize(path.join(OUT, 'seq-reorder/0000.png')), json: 'seq-reorder/frames.json', what: 'Dragging the Stats block row from third to first place in the sidebar block list. Frame 0 = lifted, last frame = dropped with the preview updated.' });
    await ctx.close();
  },

  // ---------------------------------------------------------------- media manager and image picking
  async media(browser) {
    const TILE_JS = (name) => `() => [...document.querySelectorAll('li')].filter((e) => ${name ? `e.textContent.includes('${name}')` : '/\\.(jpg|png|webp)/i.test(e.textContent)'} && e.getBoundingClientRect().width > 0)`;
    const MODAL = { js: `() => { const t = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Media Manager$/.test(e.textContent.trim())); let e = t; while (e && e.getBoundingClientRect().width < 1300) e = e.parentElement; return e ? [e] : []; }` };
    const mediaBoxes = (extra = {}) => ({
      sidebar: BASE_BOXES.sidebar,
      preview: BASE_BOXES.preview,
      modal: MODAL,
      fileTiles: { js: TILE_JS(), all: true },
      folderTiles: { js: `() => [...document.querySelectorAll('button')].filter((b) => /^\\/[a-z]/.test(b.textContent.trim()) && b.getBoundingClientRect().width > 0)`, all: true },
      uploadButton: { sel: 'button', text: 'Upload' },
      newFolderButton: { sel: 'button', text: 'New Folder' },
      refreshButton: { sel: 'button', text: 'Refresh' },
      searchInput: { sel: 'input[placeholder^="Search"]' },
      ...extra,
    });
    const waitTiles = async (p) => {
      await p.waitForFunction(() => document.querySelectorAll('li').length >= 8, null, { timeout: 15000 });
      await L.settleFrame(p.mainFrame(), 700);
    };

    // 1. media manager opened from the main menu
    let ctx = await L.newContext(browser);
    let p = await ctx.newPage();
    await L.openEditor(p, '/');
    await p.mouse.click(32, 37);
    await sleep(600);
    await p.getByText('Media Manager').first().click();
    await waitTiles(p);
    await p.mouse.move(1700, 700);
    await sleep(400);
    await L.shot(p, 'admin-media-manager', {
      what: 'Media manager open: three folders and 11 images in a grid, with Refresh, New Folder and Upload buttons and a search field.',
      boxes: mediaBoxes(),
    });
    await ctx.close();

    // 2. pick a different hero image, from the state where the headline already reads the new text
    await applyNewHeadline();
    ctx = await L.newContext(browser);
    p = await ctx.newPage();
    await L.openEditor(p, '/');
    const img = await boxOf(p, 'img', HERO_PREVIEW.previewHeroImage);
    await p.mouse.click(img.x + img.w / 2, Math.min(img.y + img.h / 2, 900));
    await p.getByText('Image Source', { exact: true }).waitFor({ timeout: 10000 });
    await L.settleFrame(p.mainFrame(), 400);
    await p.mouse.move(220, 900);
    await sleep(500);
    const imgForm = {
      ...BASE_BOXES,
      ...HERO_PREVIEW,
      imageField: { js: `() => [...document.querySelectorAll('${SIDEBAR} button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 300 && r.height > 120; })` },
      imageRemoveButton: { js: `() => [...document.querySelectorAll('${SIDEBAR} button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 30 && r.width < 40 && r.x > 360 && r.y > 120 && r.y < 260; })` },
      altTextField: { sel: 'input[name="blocks.1.image.alt"]' },
      videoUrlField: { sel: 'input[name="blocks.1.image.videoUrl"]' },
      formLabels: FORM_FIELDS.formLabels,
    };
    await L.shot(p, 'admin-image-before', { what: 'Hero block, Image group open: Image Source field shows the current hero image (workspace screenshot). The preview shows the same image.', boxes: imgForm });

    const mediaFrames = [];
    const mframe = async (i, note) => {
      const n = await L.frame(p, 'seq-media', i, { boxes: mediaBoxes({ hoveredTile: { js: TILE_JS('orchid.jpg') }, insertButton: { sel: 'button', text: 'Insert' }, detailsPanel: { js: `() => [...document.querySelectorAll('button')].filter((b) => /Insert/.test(b.textContent)).map((b) => { let e = b; while (e.parentElement && e.getBoundingClientRect().height < 600) e = e.parentElement; return e; })` } }) });
      mediaFrames.push({ frame: i, file: `${n}.png`, note });
    };
    const field = await boxOf(p, 'f', imgForm.imageField);
    await p.mouse.click(field.x + field.w / 2, field.y + field.h / 2);
    await waitTiles(p);
    await p.mouse.move(1700, 700);
    await sleep(500);
    await mframe(0, 'media manager opened from the Image Source field');
    const tile = p.locator('li', { hasText: 'orchid.jpg' }).first();
    const tb = await tile.boundingBox();
    await p.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 12 });
    await sleep(500);
    await mframe(1, 'pointer hovering orchid.jpg');
    await p.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2);
    await p.getByRole('button', { name: 'Insert' }).waitFor({ timeout: 8000 });
    await sleep(900);
    await mframe(2, 'orchid.jpg selected, details panel and Insert button visible');
    await L.shot(p, 'admin-media-select', { what: 'Media picker with orchid.jpg selected: details panel with URL and the Insert, Rename and Delete buttons.', boxes: mediaBoxes({ hoveredTile: { js: TILE_JS('orchid.jpg') }, insertButton: { sel: 'button', text: 'Insert' } }) });
    await p.getByRole('button', { name: 'Insert' }).click();
    await p.waitForFunction(() => !document.querySelector('li') || ![...document.querySelectorAll('button')].some((b) => /^Insert$/.test(b.textContent.trim())), null, { timeout: 10000 }).catch(() => {});
    await L.previewFrame(p).waitForFunction(() => { const i = document.querySelector('[data-tina-field$="blocks.1.image"] img'); return i && i.complete && /orchid/.test(decodeURIComponent(i.currentSrc || i.src)); }, null, { timeout: 15000 }).catch(() => log('WARN preview image did not switch'));
    await p.mouse.move(220, 900);
    await L.settleFrame(L.previewFrame(p), 1200);
    await mframe(3, 'after Insert: modal closed, field and preview show the new image');
    await L.shot(p, 'admin-image-after', { what: 'After picking orchid.jpg from the media manager: the Image Source field and the preview both show the new hero image.', boxes: imgForm });
    fs.writeFileSync(path.join(OUT, 'seq-media/frames.json'), JSON.stringify({ light: '../seq-media-1x/', frames: mediaFrames }, null, 2));
    L.sequences.push({ name: 'seq-media', dir: 'seq-media/', light: 'seq-media-1x/', frames: mediaFrames.length, size: L.readPngSize(path.join(OUT, 'seq-media/0000.png')), json: 'seq-media/frames.json', what: 'Picking a different hero image: media manager open, hover, selected, inserted (4 frames).' });
    await ctx.close();
  },

  // ---------------------------------------------------------------- rich text
  async rich(browser) {
    const ctx = await L.newContext(browser);
    const p = await ctx.newPage();
    await L.openEditor(p, '/posts/introducing-fieldnote-3');
    await L.parkMouse(p);
    // click the second paragraph in the preview: the sidebar scrolls to the Body field and focuses its editor
    await p.mouse.click(900, 690);
    await p.waitForFunction(() => [...document.querySelectorAll('[data-slate-editor]')].some((e) => e.contains(document.activeElement)), null, { timeout: 10000 }).catch(() => log('WARN body editor not focused'));
    await sleep(1200);
    await p.mouse.move(330, 760);
    await sleep(400);
    const richBoxes = {
      ...BASE_BOXES,
      bodyEditor: { js: `() => [...document.querySelectorAll('${SIDEBAR} [data-slate-editor]')].slice(-1)` },
      toolbar: { js: `() => [...document.querySelectorAll('${SIDEBAR} [data-slate-editor]')].slice(-1).map((e) => { let t = e.parentElement; while (t && !t.querySelector('button')) t = t.parentElement; const bar = [...t.querySelectorAll('div')].find((d) => d.querySelector('button') && d.getBoundingClientRect().height < 60 && d.getBoundingClientRect().width > 300); return bar; }).filter(Boolean)` },
      toolbarButtons: { js: `() => { const ed = [...document.querySelectorAll('${SIDEBAR} [data-slate-editor]')].slice(-1)[0]; const top = ed.getBoundingClientRect().top; return [...document.querySelectorAll('${SIDEBAR} button')].filter((b) => { const r = b.getBoundingClientRect(); return r.bottom < top + 4 && r.top > top - 70 && r.width > 0; }); }`, all: true },
      previewBody: { frame: 'preview', sel: '[data-tina-field$="_body"]' },
      previewTitle: { frame: 'preview', sel: '[data-tina-field$=".title"]' },
      previewHeroImage: { frame: 'preview', sel: '[data-tina-field$=".heroImg"]' },
    };
    await L.shot(p, 'admin-rich-text', { what: 'Blog post open in the visual editor. The Body rich-text editor in the sidebar has focus, with its toolbar (paragraph style, link, image, strikethrough, quote, lists, bold, more).', boxes: richBoxes });

    // typing sequence at the end of the first paragraph
    const editor = p.locator(`${SIDEBAR} [data-slate-editor]`).last();
    const eb = await editor.boundingBox();
    const first = await editor.locator('[data-slate-node="element"]').first().boundingBox();
    await p.mouse.click(first.x + first.width - 6, first.y + first.height - 12); // caret at the end of the paragraph (the End key would scroll the sidebar away)
    await sleep(300);
    const typed = ' Every edit shows up instantly.';
    const bodyP = '[data-tina-field$="_body"] p';
    const waitBody = async (t) =>
      L.previewFrame(p).waitForFunction(([sel, t]) => (document.querySelector(sel)?.textContent ?? '').endsWith(t), [bodyP, t], { timeout: 5000 }).catch(() => log('WARN preview body did not show', JSON.stringify(t)));
    const frames = [];
    const readP = async () => (await L.previewFrame(p).evaluate((sel) => document.querySelector(sel)?.textContent ?? '', bodyP));
    let n = await L.frame(p, 'seq-type-body', 0, { boxes: richBoxes });
    frames.push({ frame: 0, file: `${n}.png`, typed: '', previewParagraph: await readP() });
    for (let i = 0; i < typed.length; i++) {
      await p.keyboard.type(typed[i]);
      await waitBody(typed.slice(0, i + 1));
      n = await L.frame(p, 'seq-type-body', i + 1, { boxes: richBoxes });
      frames.push({ frame: i + 1, file: `${n}.png`, typed: typed.slice(0, i + 1), previewParagraph: await readP() });
    }
    fs.writeFileSync(path.join(OUT, 'seq-type-body/frames.json'), JSON.stringify({ target: typed, light: '../seq-type-body-1x/', frames }, null, 2));
    L.sequences.push({ name: 'seq-type-body', dir: 'seq-type-body/', light: 'seq-type-body-1x/', frames: frames.length, size: L.readPngSize(path.join(OUT, 'seq-type-body/0000.png')), json: 'seq-type-body/frames.json', what: `Typing "${typed.trim()}" at the end of the first paragraph in the rich-text Body editor. The preview paragraph updates live.` });
    await L.shot(p, 'admin-rich-text-typed', { what: 'Rich-text editor after typing the sentence: sidebar editor and preview paragraph both show it.', boxes: richBoxes });
    await ctx.close();
  },

  // ---------------------------------------------------------------- collections menu and document lists
  async lists(browser) {
    let ctx = await L.newContext(browser);
    let p = await ctx.newPage();
    await L.openEditor(p, '/');
    await L.parkMouse(p);
    await p.mouse.click(32, 37);
    await sleep(900);
    // hide the version / "new release" line: it depends on the day the plates are captured
    await hideByText(p, /^TinaCMS v\d/, 80);
    await p.mouse.move(700, 600);
    await sleep(300);
    const MENU = { js: `() => { const t = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^COLLECTIONS/i.test(e.textContent.trim())); let e = t; while (e && e.getBoundingClientRect().width < 350) e = e.parentElement; return e ? [e] : []; }` };
    await L.shot(p, 'admin-collections', {
      what: 'Main menu open: the list of CMS collections (Pages, Blog Posts, Authors, Tags), Site (Global, Media Manager) and Dashboard entries.',
      boxes: {
        menuPanel: MENU,
        collectionLinks: { js: `() => [...document.querySelectorAll('a')].filter((a) => /collections\\//.test(a.getAttribute('href') || '') && a.getBoundingClientRect().width > 0)`, all: true },
        mediaManagerItem: { sel: 'button', text: 'Media Manager' },
        logoutItem: { sel: 'button, a', text: 'Log Out' },
        closeButton: { js: `() => [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.x > 300 && r.x < 380 && r.y < 70 && r.width > 0; })` },
      },
    });
    await ctx.close();

    const listBoxes = {
      table: { sel: 'table' },
      tableHead: { sel: 'thead' },
      rows: { sel: 'tbody tr', all: true },
      titleLinks: { sel: 'tbody tr a', all: true },
      addFileButton: { sel: 'button', text: 'Add File' },
      addFolderButton: { sel: 'button', text: 'Add Folder' },
      sortSelect: { sel: 'select' },
      menuButton: { sel: 'button[aria-label="Open navigation menu"]' },
      heading: { js: `() => [...document.querySelectorAll('h2, h3, h1')].filter((e) => e.getBoundingClientRect().width > 0).slice(0, 1)` },
    };
    for (const [name, route, what] of [
      ['admin-documents', '/admin/index.html#/collections/post/~', 'Document list of the Blog Posts collection: title, file path, filename, extension and template per document.'],
      ['admin-documents-pages', '/admin/index.html#/collections/page/~', 'Document list of the Pages collection (home and about).'],
    ]) {
      ctx = await L.newContext(browser);
      p = await ctx.newPage();
      await p.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await p.waitForSelector('tbody tr', { timeout: 30000 });
      await L.settleFrame(p.mainFrame(), 800);
      // hide the "search is not configured" notice (only shown because TinaCloud search is off locally)
      await hideByText(p, /^You have not configured search/, 80);
      await p.mouse.move(1500, 900);
      await sleep(300);
      await L.shot(p, name, { what, boxes: listBoxes });
      await ctx.close();
    }
  },

  async files() {
    fs.copyFileSync(path.join(SITE, 'tina/config.tsx'), path.join(OUT, 'tina-config.ts'));
    fs.copyFileSync(path.join(SITE, 'tina/collection/page.ts'), path.join(OUT, 'tina-collection-page.ts'));
    fs.copyFileSync(path.join(SITE, 'components/blocks/hero.tsx'), path.join(OUT, 'tina-hero-block.tsx'));
    log('copied tina config files');
  },
};

// ------------------------------------------------------------------ main
const requested = process.argv.slice(2);
const order = ['public', 'hero', 'hovers', 'after', 'blocks', 'media', 'rich', 'lists', 'files'];
const run = (requested.length ? requested : order).filter((g) => groups[g]);

const browser = await L.launch();
const t0 = Date.now();
try {
  for (const g of run) {
    const t = Date.now();
    log('group', g);
    await groups[g](browser);
    if (g !== 'normalize' && restoreContent()) await waitIndexed(); // a group may save the document: start the next one from the original content
    log('group', g, 'done', `${Math.round((Date.now() - t) / 1000)}s`);
    L.writeManifest();
  }
} finally {
  await browser.close();
  if (!run.includes('normalize')) restoreContent();
}
log('converting web copies');
await convertAll(OUT);
const extraFiles = ['code-file-before.md', 'code-file-after.md', 'code-file.diff', 'tina-config.ts', 'tina-collection-page.ts', 'tina-hero-block.tsx', 'contact.jpg'].filter((f) => fs.existsSync(path.join(OUT, f)));
L.writeManifest({ files: extraFiles });
log('all done in', `${Math.round((Date.now() - t0) / 1000)}s`);
