// Scene `edit`: the core feature with the REAL TinaCMS visual editor (plates). Click anything, edit it, see it live.
// Variants: `full` (anthem 16-24, thirty 6-14, dev 20-28), `hook` (2 s cold open of thirty/fifteen), `flash` (2 s).
import type { SceneDef } from '../../engine/stage';
import { box, css, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg, spring, track, noise1 } from '../../engine/anim';
import { Headline } from '../../ui/text';
import { Cursor, EditBox, WashBg, Win, pathAt, rectAt, type Rect } from '../../ui/kit';
import { PlateStack } from '../../ui/plate';
import { C, SHADOW } from '../../brand/tokens';
import { json } from '../../engine/assets';
import { CharacterCard, loadSprite, poseAt } from '../../ui/character';

export interface EditProps {
  variant?: 'full' | 'hook' | 'flash';
  /** Headline cards: [text, inTime][] (local seconds). */
  words?: [string, number][];
  /** When the drop lands (local); the window crashes in. */
  dropAt?: number;
  /** Open as a circle from the frame centre (matches the click ripple at the end of `problem`). */
  iris?: boolean;
  /** Where the iris opens, in stage pixels (default the frame centre): the click point in `problem`. */
  irisAt?: [number, number];
  /** An animated character that pops in over the editor (anthem v2: the content editor, now happy). Local seconds, stage pixels. */
  character?: {
    name: string; at: number; out: number; cx: number; cy: number; size: number; rot?: number;
    /** [local time, strip index][]: the pose follows the story (default: pose 0 throughout). */
    keys?: [number, number][];
  };
  /** Show the zoomed copy of the Headline field while it types (default true). */
  loupe?: boolean;
  /** `full` with media: keep the edit box on the image swap (default true). false: the box leaves after the live
   *  headline, and the cursor alone carries the swap (the media plates reflow, so a box from the first plate drifts). */
  mediaBox?: boolean;
  /** `full` after a `hook` already typed the headline: hop the post-edit page, then type the tagline. */
  after?: boolean;
  /** Hook: when typing starts and how long it takes (the old headline shows before it). */
  typeStart?: number;
  typeDur?: number;
}

const SEQ = 'seq-type-headline';

/**
 * Portrait loupe: a stack of small canvases, each cropped from the 3840 px PNG master of a plate, so the typed
 * text stays sharp at a 2.2x zoom (the 2880 px webp would be upsampled). The big image is dropped after the crop.
 */
class CropStack {
  root: HTMLDivElement;
  imgs = new Map<string, HTMLCanvasElement>();
  constructor(parent: HTMLElement, private crop: Rect) {
    this.root = box({ left: '0', top: '0', width: '100%', height: '100%' });
    parent.append(this.root);
  }
  async add(name: string) {
    if (this.imgs.has(name)) return;
    let im: HTMLImageElement | null = null;
    for (const ext of ['png', 'webp']) {
      const i = new Image();
      i.src = `/plates/${name}.${ext}`;
      try { await i.decode(); im = i; break; } catch { /* try the next format */ }
    }
    if (!im) throw new Error(`plate missing: ${name}`);
    const k = im.naturalWidth / 1920;
    const c = document.createElement('canvas');
    c.width = Math.round(this.crop.w * k);
    c.height = Math.round(this.crop.h * k);
    c.getContext('2d')!.drawImage(im, this.crop.x * k, this.crop.y * k, this.crop.w * k, this.crop.h * k, 0, 0, c.width, c.height);
    css(c, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', display: 'block', opacity: '0' });
    this.root.append(c);
    this.imgs.set(name, c);
  }
  async addSeq(dir: string, n: number) {
    const names = Array.from({ length: n }, (_, k) => `${dir}/${String(k).padStart(4, '0')}`);
    for (let k = 0; k < names.length; k += 6) await Promise.all(names.slice(k, k + 6).map((nm) => this.add(nm).catch(() => {})));
  }
  show(a: string, _b?: string, _p = 0) {
    for (const [k, c] of this.imgs) css(c, { opacity: k === a ? 1 : 0 });
  }
}

const edit: SceneDef<EditProps> = {
  id: 'edit',
  async setup({ root, W, H, portrait }, props) {
    const variant = props.variant ?? 'full';
    const bg = new WashBg(root, W, H, { base: '#F8FAFC', strength: 0.9 });

    // Screen: the clean viewport the UI lives in (so the headline zone always stays clear).
    // Portrait: a clipped, rounded phone card between the headline and the loupe, all inside the Reels safe band.
    const scr = portrait
      ? (variant === 'hook' ? { x: 40, y: 330, w: W - 80, h: 695 } : { x: 40, y: 515, w: W - 80, h: 510 })
      : variant === 'hook'
        ? { x: 0, y: 0, w: W, h: H }
        : { x: 110, y: 226, w: W - 220, h: H - 226 - 36 };
    const screen = box({ left: `${scr.x}px`, top: `${scr.y}px`, width: `${scr.w}px`, height: `${scr.h}px`, overflow: portrait ? 'hidden' : 'visible', ...(portrait ? { borderRadius: '30px', boxShadow: SHADOW.lg, border: '1px solid rgba(15,23,42,0.08)', zIndex: '5' } : {}) });
    root.append(screen);
    const cam = box({ left: '0', top: '0', width: `${scr.w}px`, height: `${scr.h}px`, transformOrigin: '0 0' });
    if (!portrait && variant !== 'hook') {
      // Landscape push-ins must never run into the headline zone: clip the top edge only (soft),
      // and leave the sides and bottom open so the window's shadow is not cut.
      const OV = 420;
      const clipper = box({ left: `${-OV}px`, top: '0', width: `${scr.w + OV * 2}px`, height: `${scr.h + OV}px`, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, transparent 0px, #000 46px)', webkitMaskImage: 'linear-gradient(to bottom, transparent 0px, #000 46px)' } as any);
      const inner = box({ left: `${OV}px`, top: '0', width: `${scr.w}px`, height: `${scr.h}px` });
      clipper.append(inner);
      inner.append(cam);
      screen.append(clipper);
    } else screen.append(cam);

    // The app window holding the plates. Plate space is 1920x1080 CSS px.
    const winW = 1600;
    const ps = winW / 1920;
    const win = new Win(cam, { w: winW, h: 1080 * ps + 52, url: 'fieldnote.app/admin', radius: 16 });
    const plates = new PlateStack(win.body, ps);
    // Tina's local-dev pill ("You are in local mode") is not part of the product in production: paint it out.
    const devPill = box({ left: `${103 * ps}px`, top: `${10 * ps}px`, width: `${210 * ps}px`, height: `${54 * ps}px`, background: '#F6F6F9', zIndex: '3' });
    plates.root.append(devPill);
    const names = ['admin-home', 'admin-hover-callout', 'admin-hover-hero-image', 'admin-hover-tagline', 'admin-hover-cta-buttons', 'admin-hover-hero', 'admin-hero-form', 'admin-hero-typed', 'admin-image-before', 'admin-image-after',
      'seq-media/0000', 'seq-media/0001', 'seq-media/0002', 'seq-media/0003'];
    if (props.after || variant === 'flash') names.push('admin-home-after', 'admin-hover-callout-after', 'admin-hover-hero-image-after', 'admin-hover-tagline-after', 'admin-hero-form-after');
    const have: Record<string, boolean> = {};
    for (const n of names) {
      try { await plates.add(n); have[n] = true; } catch { have[n] = false; }
    }
    const manifest = await json<any>(`/plates/${SEQ}/frames.json`);
    let seqN = manifest?.frames?.length ?? manifest?.count ?? 0;
    if (!seqN) {
      // Probe frame count.
      for (let k = 0; k < 80; k++) {
        try { await plates.add(`${SEQ}/${String(k).padStart(4, '0')}`); seqN = k + 1; } catch { break; }
      }
    } else await plates.addSeq(SEQ, seqN);
    const media = have['seq-media/0000'] && have['admin-image-before'] && have['admin-image-after'];
    const seqName = (k: number) => `${SEQ}/${String(Math.max(0, Math.min(seqN - 1, k))).padStart(4, '0')}`;
    const TSEQ = 'seq-type-tagline';
    const tman = variant === 'flash' || props.after ? await json<any>(`/plates/${TSEQ}/frames.json`) : null;
    const tseqN = tman?.frames?.length ?? 0;
    if (tseqN) await plates.addSeq(TSEQ, tseqN);
    const tseqName = (k: number) => `${TSEQ}/${String(Math.max(0, Math.min(tseqN - 1, k))).padStart(4, '0')}`;

    // Overlays in window-body space (move with the camera).
    const over = box({ left: '0', top: '52px', width: `${winW}px`, height: `${1080 * ps}px`, pointerEvents: 'none' });
    win.root.append(over);
    const ebox = new EditBox(over, 'Hero · Heading', { tagSize: 22, width: 3.5 });
    const cursor = new Cursor(over, 1.35);

    // Loupe: the real sidebar field, magnified, so the typing reads on a phone.
    const lz = portrait ? 2.0 : 1.75;
    // Plate CSS px around the field label + input: Headline for full/hook, Tagline for flash.
    const tagLoupe = variant === 'flash' || !!props.after;
    const lr = tagLoupe ? { x: 12, y: 300, w: 416, h: 92 } : { x: 12, y: 214, w: 416, h: 92 };
    const loupe = box({ left: '0', top: '0', width: `${lr.w * lz}px`, height: `${lr.h * lz}px`, borderRadius: '18px', overflow: 'hidden', background: '#fff', border: '3px solid #fff', boxShadow: '0 30px 70px -20px rgba(20,40,110,0.45), 0 0 0 1px rgba(15,23,42,0.08)', zIndex: '60', transformOrigin: '0% 100%' });
    const loupeStack: PlateStack | CropStack = portrait ? new CropStack(loupe, lr) : new PlateStack(loupe, lz);
    root.append(loupe);
    if (!portrait) css(loupeStack.root, { transform: `translate(${-lr.x * lz}px, ${-lr.y * lz}px)` });
    for (const n of ['admin-hero-form', 'admin-hero-typed', 'admin-hero-form-after']) if (have[n]) await loupeStack.add(n);
    if (seqN && !tagLoupe) await loupeStack.addSeq(SEQ, seqN);
    if (tagLoupe) {
      const tm = await json<any>('/plates/seq-type-tagline/frames.json');
      if (tm?.frames?.length) await loupeStack.addSeq('seq-type-tagline', tm.frames.length);
    }

    // Headline cards (fixed on screen, not in the camera).
    const defaults: Record<string, [string, number][]> = {
      full: props.after
        ? [['Click *anything.*', 0.15], ['Edit *it.*', 2.0], ['See it *live.*', 4.0], ['No code. *No tickets.*', 5.6]]
        : media
        ? [['Click *anything.*', 0.15], ['Edit *it.*', 2.0], ['See it *live.*', 4.0], ['Swap an *image.*', 5.5]]
        : [['Click *anything.*', 0.15], ['Edit *it.*', 2.0], ['See it *live.*', 4.0], ['No code. *No tickets.*', 6.0]],
      hook: [],
      flash: [['Click to *edit.*', 0.1]],
    };
    const cards = (props.words ?? defaults[variant]).map(([text, at], i, arr) => {
      // Portrait: big type on one line, inside the safe band (short lines 112 px, long ones 84 px), below the corner logo.
      const size = portrait ? (text.replace(/\*/g, '').length > 15 ? 84 : 112) : 92;
      const h = new Headline(root, { text, size, color: C.ink, align: 'center', lineHeight: 1.05 });
      h.place({ left: '0', width: `${W}px`, top: `${portrait ? 372 + (112 - size) * 0.3 : 70}px` });
      return { h, at, until: arr[i + 1]?.[1] };
    });

    // Optional animated character over the editor, above the loupe.
    const ch = props.character;
    const charCard = ch ? new CharacterCard(root, await loadSprite(ch.name), ch.size) : null;
    if (charCard) css(charCard.root, { zIndex: '70' });

    // Box lookups (fall back to sensible guesses until the boxes exist).
    const B = (plate: string, ...keys: string[]): Rect | null => {
      for (const k of keys) { const r = plates.rect(plate, k); if (r) return r; }
      return null;
    };
    const heroHeading = B('admin-hover-hero', 'hoveredElement', 'previewHeadline') ?? { x: 900 * ps, y: 330 * ps, w: 700 * ps, h: 120 * ps };
    const field = B('admin-hero-form', 'headlineField') ?? { x: 30 * ps, y: 300 * ps, w: 380 * ps, h: 60 * ps };
    const previewHeading = B('admin-hero-typed', 'previewHeadline') ?? heroHeading;
    const imageField = B('admin-image-before', 'imageField', 'heroImageField') ?? { x: 30 * ps, y: 520 * ps, w: 380 * ps, h: 200 * ps };
    const heroImage = { ...(B('admin-image-after', 'previewHeroImage', 'heroImage') ?? { x: 1100 * ps, y: 400 * ps, w: 600 * ps, h: 400 * ps }) };
    heroImage.h = Math.min(heroImage.h, 1060 * ps - heroImage.y);
    const clipV = (r: Rect): Rect => ({ ...r, h: Math.min(r.h, 1060 * ps - r.y) });
    const hov = {
      callout: B('admin-hover-callout', 'hoveredElement') ?? heroHeading,
      image: clipV(B('admin-hover-hero-image', 'hoveredElement') ?? heroImage),
      tagline: B('admin-hover-tagline', 'hoveredElement') ?? heroHeading,
    };
    const taglineField = B('admin-hero-typed', 'taglineField') ?? field;
    const imageRow = B('admin-hero-typed', 'imageRow') ?? { x: 24 * ps, y: 548 * ps, w: 391 * ps, h: 50 * ps };
    const orchid = B('seq-media/0000', 'hoveredTile') ?? { x: 16 * ps, y: 623 * ps, w: 169 * ps, h: 205 * ps };
    const insertBtn = B('seq-media/0002', 'insertButton') ?? { x: 992 * ps, y: 1024 * ps, w: 128 * ps, h: 40 * ps };
    const save = B('admin-hero-typed', 'saveButton') ?? { x: 319 * ps, y: 1028 * ps, w: 96 * ps, h: 40 * ps };
    const sidebar = B('admin-home', 'sidebar') ?? { x: 0, y: 0, w: 440 * ps, h: 1080 * ps };
    const center = (r: Rect) => [r.x + r.w / 2, r.y + r.h / 2] as const;

    // Camera: show window rect `r` (body coords) filling the screen at most `maxS`.
    const fullS = Math.min(scr.w / winW, scr.h / (1080 * ps + 52));
    const camFor = (r: Rect, pad = 1.15, maxS = 2.2) => {
      const s = Math.min(maxS, scr.w / (r.w * pad), scr.h / (r.h * pad));
      const [cx, cy] = center(r);
      return { s, x: scr.w / 2 - cx * s, y: scr.h / 2 - (cy + 52) * s };
    };
    // Portrait: one tall hero crop, no sidebar (the loupe carries the field). `focus` shows `wPlate` plate px across the
    // card, centred on plate point (cx, cy); a plate px is then k = scr.w / wPlate display px.
    const focus = (cx: number, cy: number, wPlate: number) => {
      const sc = scr.w / wPlate / ps;
      return { s: sc, x: scr.w / 2 - cx * ps * sc, y: scr.h / 2 - (cy * ps + 52) * sc };
    };
    const HX = 1180; // the hero's centre line in the preview
    const full = portrait ? focus(HX, 300, 1060) : { s: fullS, x: (scr.w - winW * fullS) / 2, y: (scr.h - (1080 * ps + 52) * fullS) / 2 };
    const union = (a: Rect, b: Rect): Rect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.max(a.x + a.w, b.x + b.w) - Math.min(a.x, b.x), h: Math.max(a.y + a.h, b.y + b.h) - Math.min(a.y, b.y) });
    const shotEdit = portrait ? focus(HX, 300, 1060) : camFor(union(field, previewHeading), 1.12);
    const shotLive = portrait ? focus(HX, 285, 1080) : camFor(previewHeading, 1.5, 2.4);
    const shotImg = portrait ? focus(HX, 700, 1060) : camFor(union(imageField, heroImage), 1.1);
    // A push-in of factor f. Portrait zooms about the card centre (so the framing stays on the text);
    // landscape keeps its original behaviour, which scales about the origin.
    const zoomC = (shot: { s: number; x: number; y: number }, f: number) => {
      if (!portrait) return { ...shot, s: shot.s * f };
      const cx = (scr.w / 2 - shot.x) / shot.s, cy = (scr.h / 2 - shot.y) / shot.s, sc = shot.s * f;
      return { s: sc, x: scr.w / 2 - cx * sc, y: scr.h / 2 - cy * sc };
    };
    // In portrait the edit box hugs the text instead of the full-width preview box.
    const hug = (r: Rect): Rect => (portrait && r.w > 990 * ps ? { ...r, x: r.x + (r.w - 990 * ps) / 2, w: 990 * ps } : r);

    return {
      update(f) {
        const t = f.lt;
        bg.update(f.t);
        f.post.vignette = 0.1;
        const dropAt = props.dropAt ?? 0;

        // Timeline per variant.
        let plateA = 'admin-home', plateB: string | undefined, mix = 0;
        let camKeys: [number, { s: number; x: number; y: number }][] = [[0, full]];
        let cursorPts: [number, number, number][] = [];
        let clicks: number[] = [];
        let ebRect: Rect | null = null, ebAlpha = 0, ebLabel = 'Hero · Heading';
        let typeT0 = 2.0, typeDur = 1.7;

        let liveKey = 'previewHeadline';
        const pick = (sched: [number, string][]) => { let n = sched[0][1]; for (const [ts, nm] of sched) if (t >= ts) n = nm; return n; };
        const afterOk = props.after && have['admin-home-after'] && have['admin-hover-tagline-after'] && tseqN > 0;
        if (variant === 'full' && afterOk) {
          typeT0 = 2.05; typeDur = 1.7;
          liveKey = 'previewTagline';
          const hovA = {
            callout: B('admin-hover-callout-after', 'hoveredElement') ?? hov.callout,
            image: clipV(B('admin-hover-hero-image-after', 'hoveredElement') ?? hov.image),
            tagline: B('admin-hover-tagline-after', 'hoveredElement') ?? hov.tagline,
          };
          const shotTag = portrait ? focus(HX, 400, 1060) : camFor(union(taglineField, hovA.tagline), 1.1);
          const shotTagLive = portrait ? focus(HX, 390, 1080) : camFor(hovA.tagline, 1.25, 2.4);
          // Portrait: the camera tilts down to the hero image on its hover beat and back up to the tagline.
          camKeys = portrait
            ? [[0, full], [0.5, full], [0.85, focus(HX, 560, 1060)], [1.25, shotTag], [2.05, shotTag], [3.9, shotTag], [4.2, shotTagLive], [5.4, zoomC(shotTagLive, 1.05)], [5.9, full], [8, zoomC(full, 1.03)]]
            : [[0, full], [1.6, full], [2.05, shotTag], [3.9, shotTag], [4.2, shotTagLive], [5.4, zoomC(shotTagLive, 1.05)], [5.9, full], [8, zoomC(full, 1.03)]];
          const C0 = center(hovA.callout), C1 = center(hovA.image), C2 = center(hovA.tagline);
          cursorPts = [[0, C0[0] + 300, C0[1] + 380], [0.45, C0[0], C0[1]], [0.82, C1[0], C1[1] - 120], [1.45, C2[0], C2[1]], [4.6, C2[0] + 80, C2[1] + 90], [7.8, C2[0] + 200, C2[1] + 260]];
          clicks = [1.75];
          if (t >= typeT0 && t < typeT0 + typeDur) plateA = tseqName(Math.floor(((t - typeT0) / typeDur) * tseqN));
          else if (t >= typeT0 + typeDur) plateA = tseqName(tseqN - 1);
          else plateA = pick([[0, 'admin-home-after'], [0.5, 'admin-hover-callout-after'], [0.875, 'admin-hover-hero-image-after'], [1.25, 'admin-hover-tagline-after'], [1.8, have['admin-hero-form-after'] ? 'admin-hero-form-after' : tseqName(0)]]);
          const keys: [number, Rect][] = [[0.5, hovA.callout], [0.875, hovA.image], [1.25, hovA.tagline], [2.0, hovA.tagline]];
          if (t >= 0.5 && t < 5.5) {
            ebRect = rectAt(t, [[0, hovA.callout], ...keys], 3.4, 0.62);
            ebAlpha = clamp((t - 0.5) * 8) * (1 - seg(t, 5.3, 5.5));
            ebLabel = pick([[0.5, 'Callout'], [0.875, 'Hero · Image'], [1.25, 'Tagline'], [2.0, 'Live']]);
          }
        } else if (variant === 'full' && media) {
          typeT0 = 2.05; typeDur = 1.7;
          camKeys = [[0, full], [1.6, full], [2.05, shotEdit], [3.9, shotEdit], [4.2, shotLive], [4.85, shotLive], [5.15, full], [6.45, full], [6.75, shotImg], [7.35, shotImg], [7.75, full]];
          const C0 = center(hov.callout), C1 = center(hov.image), C2 = center(hov.tagline), C3 = center(heroHeading);
          const R = center(imageRow), F = center(imageField), O = center(orchid), I = center(insertBtn);
          cursorPts = [[0, C0[0] + 300, C0[1] + 380], [0.45, C0[0], C0[1]], [0.82, C1[0], C1[1] - 120], [1.2, C2[0] + 120, C2[1]], [1.45, C3[0], C3[1]],
            [4.6, C3[0] + 60, C3[1] + 80], [4.95, R[0], R[1]], [5.4, F[0], F[1]], [5.95, O[0], O[1]], [6.4, I[0], I[1]], [7.4, I[0] - 300, I[1] - 260]];
          clicks = [1.75, 5.0, 5.5, 6.25, 6.5];
          if (t >= typeT0 && t < typeT0 + typeDur) plateA = seqN ? seqName(Math.floor(((t - typeT0) / typeDur) * seqN)) : 'admin-hero-form';
          else plateA = pick([[0, 'admin-home'], [0.5, 'admin-hover-callout'], [0.875, 'admin-hover-hero-image'], [1.25, 'admin-hover-tagline'], [1.5, 'admin-hover-hero'], [1.8, 'admin-hero-form'],
            [3.75, 'admin-hero-typed'], [5.05, 'admin-image-before'], [5.55, 'seq-media/0000'], [6.0, 'seq-media/0001'], [6.28, 'seq-media/0002'], [6.55, 'admin-image-after']]);
          // The edit box hops on beats, then follows the live text, then the image.
          const keys: [number, Rect][] = [[0.5, hov.callout], [0.875, hov.image], [1.25, hov.tagline], [1.5, heroHeading], [2.0, previewHeading], [5.05, imageField], [6.0, orchid], [6.55, heroImage]];
          const labels: [number, string][] = [[0.5, 'Callout'], [0.875, 'Hero · Image'], [1.25, 'Tagline'], [1.5, 'Headline'], [2.0, 'Live'], [5.05, 'Image'], [6.0, 'orchid.jpg'], [6.55, 'Hero · Image']];
          const mediaBox = props.mediaBox !== false, ebEnd = mediaBox ? 7.5 : 5.05;
          if (t >= 0.5 && t < ebEnd && !(mediaBox && t >= 5.5 && t < 6.0)) {
            ebRect = rectAt(t, [[0, hov.callout], ...keys], 3.4, 0.62);
            ebAlpha = clamp((t - 0.5) * 8) * (1 - seg(t, ebEnd - 0.2, ebEnd));
            ebLabel = pick(labels.map(([a, b]) => [a, b]));
          }
        } else if (variant === 'full') {
          typeT0 = 2.05; typeDur = 1.7;
          camKeys = [[0, full], [1.75, full], [2.05, shotEdit], [3.9, shotEdit], [4.2, shotLive], [5.6, zoomC(shotLive, 1.06)], [6.2, full], [8, zoomC(full, 1.03)]];
          const [hx, hy] = center(heroHeading);
          cursorPts = [[0.2, hx + 260, hy + 360], [0.9, hx, hy], [1.6, hx + 10, hy + 6], [4.6, hx + 40, hy + 60], [7.8, hx + 120, hy + 200]];
          clicks = [1.0];
          if (t >= typeT0 && t < typeT0 + typeDur) plateA = seqN ? seqName(Math.floor(((t - typeT0) / typeDur) * seqN)) : 'admin-hero-form';
          else plateA = pick([[0, 'admin-home'], [0.6, 'admin-hover-hero'], [1.0, 'admin-hero-form'], [3.75, 'admin-hero-typed']]);
          if (t >= 0.6 && t < 2.0) { ebRect = heroHeading; ebAlpha = 1; ebLabel = 'Headline'; }
          else if (t >= 2.0 && t < 5.1) { ebRect = previewHeading; ebAlpha = 1; ebLabel = 'Live'; }
        } else if (variant === 'hook') {
          typeT0 = props.typeStart ?? 0.25; typeDur = props.typeDur ?? 1.35;
          const s1 = portrait ? focus(HX, 300, 1060) : camFor(union(field, previewHeading), 1.08, 2.0);
          const s2 = portrait ? focus(HX, 300, 1080) : camFor(previewHeading, 1.35, 2.6);
          camKeys = [[0, zoomC(s1, 0.96)], [0.98, s1], [1.0, s2], [2.0, zoomC(s2, 1.04)]];
          plateA = seqN ? seqName(Math.floor(((t - typeT0) / typeDur) * seqN)) : 'admin-hero-form';
          ebRect = previewHeading; ebAlpha = 1; ebLabel = 'Live';
        } else {
          // flash: hover the tagline, click at 0.3, the tagline types 0.4-1.75 (the headline was edited in the hook).
          typeT0 = 0.4; typeDur = 1.35;
          liveKey = 'previewTagline';
          const tagA = B('admin-hover-tagline-after', 'hoveredElement') ?? (tseqN ? plates.rect(tseqName(0), 'previewTagline') : null) ?? hov.tagline;
          const [tx, ty] = center(tagA);
          cursorPts = [[0, tx + 240, ty + 260], [0.26, tx, ty]];
          clicks = [0.3];
          const shotTag = portrait ? focus(HX, 400, 1060) : camFor(union(taglineField, tagA), 1.08);
          camKeys = [[0, full], [0.32, full], [0.62, shotTag], [2, zoomC(shotTag, 1.03)]];
          if (t >= typeT0 && tseqN) plateA = tseqName(Math.floor(((t - typeT0) / typeDur) * tseqN));
          // The hook already changed the headline, so only post-edit plates may appear here.
          else plateA = t < 0.3 && have['admin-hover-tagline-after'] ? 'admin-hover-tagline-after' : tseqN ? tseqName(0) : 'admin-hero-typed';
          ebRect = tagA; ebAlpha = clamp(t * 8); ebLabel = t < 0.3 ? 'Tagline' : 'Live';
        }
        if (!plates.imgs.has(plateA)) plateA = have['admin-home'] ? 'admin-home' : plateA;
        if (plateB && !have[plateB]) plateB = undefined;
        plates.show(plateA, plateB, mix);
        css(devPill, { display: plateA.startsWith('seq-media') ? 'none' : '' });

        // Loupe while typing (full: 2.0-4.0, hook: whole scene, flash: 0.45-1.9).
        const [la, lb] = variant === 'full' ? [1.95, 4.05] : variant === 'hook' ? [-1, 9] : [0.32, 1.95];
        const lOn = props.loupe !== false && t >= la && t < lb && loupeStack.imgs.has(plateA);
        if (lOn) loupeStack.show(plateA);
        const lp = variant === 'hook' ? 1 : spring(t - la, 3, 0.62) * (1 - ease.inCubic(seg(t, lb - 0.15, lb)));
        const lw = lr.w * lz, lh = lr.h * lz;
        const lx = portrait ? (W - lw) / 2 : variant === 'hook' ? 90 : 150;
        const ly = portrait ? scr.y + scr.h + 16 : variant === 'hook' ? H - lh - 110 : H - lh - 90;
        css(loupe, { display: lOn ? '' : 'none', transform: tf({ x: lx, y: ly + (1 - lp) * 60, s: 0.85 + 0.15 * lp, r: (1 - lp) * -3 }), opacity: clamp(lp * 1.5) });

        // Camera with eased moves between keys + breathing drift.
        const cv = camAt(t, camKeys, scr.w, scr.h);
        const d = [noise1(f.t * 0.3, 11) * 4, noise1(f.t * 0.3, 12) * 4];
        css(cam, { transform: `translate(${(cv.x + d[0]).toFixed(2)}px, ${(cv.y + d[1]).toFixed(2)}px) scale(${cv.s.toFixed(4)})` });

        // Window entrance: crash in from depth on the drop.
        if (variant === 'full') {
          const p = spring(t - dropAt, 2.2, 0.62);
          // The `after` pass ends on a held editor: give it a slow 3D drift so the hold breathes.
          const drift = props.after ? ease.inOutCubic(seg(t, 5.8, 8.0)) : 0;
          css(win.root, { transform: tf({ persp: 2400, y: (1 - p) * 420, rx: (1 - p) * 34 + drift * 5, ry: drift * -7, s: 0.78 + 0.22 * p }), opacity: clamp((t - dropAt + 0.05) * 12) });
          if (!props.iris) f.post.flash = Math.max(0, 0.6 - (t - dropAt) * 3);
          win.sheenAt(seg(t, 7.3, 8.0));
          if (props.iris) {
            const ip = ease.outCubic(seg(t, dropAt, dropAt + 0.42));
            if (props.irisAt) {
              // From the click point: the radius grows to the farthest corner.
              const [ix, iy] = props.irisAt;
              const R = Math.hypot(Math.max(ix, W - ix), Math.max(iy, H - iy)) * 1.02;
              css(root, { clipPath: ip < 1 ? `circle(${((0.03 + ip * 0.97) * R).toFixed(1)}px at ${ix}px ${iy}px)` : 'none' });
            } else css(root, { clipPath: ip < 1 ? `circle(${(3 + ip * 97) * 1.2}% at 50% 50%)` : 'none' });
          }
        } else {
          css(win.root, { transform: 'none', opacity: 1 });
          if (variant === 'flash') f.post.flash = Math.max(0, 0.35 - t * 3);
        }

        // While typing, the box follows the live headline as it reflows (per-frame boxes from the capture).
        if (plateA.startsWith('seq-type') && ebLabel === 'Live') ebRect = plates.rect(plateA, liveKey) ?? ebRect;
        // Edit box.
        ebox.setLabel(ebLabel);
        if (ebRect) ebox.update(hug(ebRect), ebAlpha, f.audio.pulse('kick', f.t, 10) * 0.6, !portrait);
        else ebox.update({ x: 0, y: 0, w: 1, h: 1 }, 0);

        // Cursor.
        if (cursorPts.length) {
          const [x, y] = pathAt(t, cursorPts);
          const typing = t >= typeT0 && t < typeT0 + typeDur;
          cursor.update(x, y, t, clicks, typing ? 0 : 1);
        } else cursor.update(0, 0, t, undefined, 0);

        if (charCard && ch) {
          // She types while the headline types (pose 0 with a keyboard bob), then reacts on her key.
          const cp = poseAt(t, ch.keys ?? [[ch.at, 0]]);
          const typingNow = cp.pose === 0 && t >= typeT0 && t < typeT0 + typeDur;
          charCard.place(ch.cx, ch.cy + noise1(t * 0.6, 21) * 3, ch.size, ch.rot ?? 0, CharacterCard.pop(t, ch.at, ch.out), cp.pose, cp.since / f.audio.speed, cp.changed, typingNow);
        }

        // Headline cards: each holds until the next one.
        for (const c of cards) c.h.update(t, { in: c.at, out: c.until != null ? c.until - 0.16 : undefined, outDur: 0.14, stagger: 0.07 });
      },
    };
  },
};

/** Camera keys with ease between consecutive keys (holds when equal). */
function camAt(t: number, keys: [number, { s: number; x: number; y: number }][], vw: number, vh: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      const p = ease.inOutQuart(clamp((t - t0) / (t1 - t0)));
      // Zoom in log scale and move the focus point (what sits at the screen centre) in a straight line.
      const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), p));
      const ca = [(vw / 2 - a.x) / a.s, (vh / 2 - a.y) / a.s];
      const cb = [(vw / 2 - b.x) / b.s, (vh / 2 - b.y) / b.s];
      const cx = lerp(ca[0], cb[0], p), cy = lerp(ca[1], cb[1], p);
      return { s, x: vw / 2 - cx * s, y: vh / 2 - cy * s };
    }
  }
  return keys[keys.length - 1][1];
}

export default edit;
