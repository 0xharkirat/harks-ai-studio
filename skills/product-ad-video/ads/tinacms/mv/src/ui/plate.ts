// Real TinaCMS UI plates (captured by plates/capture): stacked images with crossfades, plus their element boxes.
// Plates are captured at 1920x1080 CSS px (2x pixels). Box coordinates are CSS px in that space.
import { box, css } from '../engine/dom';
import { img, json } from '../engine/assets';
import type { Rect } from './kit';

export type Boxes = Record<string, Rect>;

/** Normalise a boxes.json (object map or array of {name,x,y,w,h} / {name, box}) into a map. */
function normBoxes(j: any): Boxes {
  const out: Boxes = {};
  if (!j) return out;
  const put = (name: string, b: any) => {
    if (!b) return;
    const r = b.box ?? b.rect ?? b;
    const x = r.x ?? r.left, y = r.y ?? r.top, w = r.w ?? r.width, h = r.h ?? r.height;
    if ([x, y, w, h].every((v) => typeof v === 'number')) out[name] = { x, y, w, h };
  };
  if (Array.isArray(j)) for (const e of j) put(e.name ?? e.id ?? e.key, e);
  else if (j.boxes) return normBoxes(j.boxes);
  else for (const [k, v] of Object.entries(j)) put(k, v);
  return out;
}

export async function plateBoxes(name: string): Promise<Boxes> {
  return normBoxes(await json(`/plates/${name}.boxes.json`));
}

/** Prefer the web copy (.webp) when it exists. */
export async function plateUrl(name: string) {
  for (const ext of ['webp', 'png']) {
    try {
      const r = await fetch(`/plates/${name}.${ext}`, { method: 'HEAD' });
      if (r.ok) return `/plates/${name}.${ext}`;
    } catch {}
  }
  throw new Error(`plate missing: ${name}`);
}

/**
 * A stack of plates of the same size, shown one at a time (or crossfaded).
 * `scale` maps plate CSS px to display px (display width = 1920 * scale).
 */
export class PlateStack {
  root: HTMLDivElement;
  imgs = new Map<string, HTMLImageElement>();
  boxes = new Map<string, Boxes>();
  constructor(parent: HTMLElement, public scale: number) {
    this.root = box({ left: '0', top: '0', width: `${1920 * scale}px`, height: `${1080 * scale}px`, overflow: 'hidden' });
    parent.append(this.root);
  }
  async add(name: string) {
    if (this.imgs.has(name)) return;
    const i = await img(await plateUrl(name));
    const el = i.cloneNode() as HTMLImageElement;
    Object.assign(el.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', opacity: '0', display: 'block' });
    this.root.append(el);
    this.imgs.set(name, el);
    this.boxes.set(name, await plateBoxes(name));
  }
  async addSeq(dir: string, n: number) {
    for (let k = 0; k < n; k++) await this.add(`${dir}/${String(k).padStart(4, '0')}`);
  }
  /** Show `a` fully, or crossfade a -> b by p. */
  show(a: string, b?: string, p = 0) {
    for (const [k, el] of this.imgs) {
      const o = k === a ? (b ? 1 : 1) : k === b ? p : 0;
      css(el, { opacity: o, zIndex: k === b ? 2 : k === a ? 1 : 0 });
    }
  }
  /** A box of plate `name` in display px (relative to the stack root). */
  rect(name: string, key: string): Rect | null {
    const r = this.boxes.get(name)?.[key];
    if (!r) return null;
    const s = this.scale;
    return { x: r.x * s, y: r.y * s, w: r.w * s, h: r.h * s };
  }
}
