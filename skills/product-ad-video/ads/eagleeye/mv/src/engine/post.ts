// Global finishing pass over the whole frame: film grain, vignette, flash. Time-pure.
import { box, css } from './dom';
import { hash } from './anim';

export interface PostState {
  grain: number; // 0..1 opacity of the grain layer
  vignette: number; // 0..1
  flash: number; // 0..1 white (or flashColor) flash
  flashColor: string;
  fade: number; // 0..1 fade to black
  zoom: number; // camera punch on the whole picture (1 = none)
  shake: [number, number]; // px offset of the whole picture
}
export const defaultPost = (): PostState => ({ grain: 0.07, vignette: 0.25, flash: 0, flashColor: '#ffffff', fade: 0, zoom: 1, shake: [0, 0] });

export class Post {
  private grainEl: HTMLDivElement;
  private vigEl: HTMLDivElement;
  private flashEl: HTMLDivElement;
  private fadeEl: HTMLDivElement;
  private tiles: string[] = [];
  state = defaultPost();

  constructor(root: HTMLElement, W: number, H: number) {
    for (let k = 0; k < 8; k++) this.tiles.push(noiseTile(256, k));
    this.vigEl = box({ inset: '0', pointerEvents: 'none', zIndex: '9000' });
    this.grainEl = box({ inset: '0', pointerEvents: 'none', zIndex: '9001', mixBlendMode: 'overlay', backgroundSize: '256px 256px' });
    this.flashEl = box({ inset: '0', pointerEvents: 'none', zIndex: '9002', opacity: '0' });
    this.fadeEl = box({ inset: '0', pointerEvents: 'none', zIndex: '9003', background: '#000', opacity: '0' });
    root.append(this.vigEl, this.grainEl, this.flashEl, this.fadeEl);
    css(this.vigEl, { background: `radial-gradient(ellipse ${W * 0.75}px ${H * 0.75}px at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,1) 140%)` });
  }

  reset() {
    this.state = defaultPost();
  }

  apply(frame: number) {
    const s = this.state;
    const k = Math.floor(hash(frame, 7) * this.tiles.length);
    css(this.grainEl, {
      opacity: s.grain,
      backgroundImage: `url(${this.tiles[k]})`,
      backgroundPosition: `${Math.floor(hash(frame, 3) * 256)}px ${Math.floor(hash(frame, 5) * 256)}px`,
    });
    css(this.vigEl, { opacity: s.vignette });
    css(this.flashEl, { opacity: s.flash, background: s.flashColor });
    css(this.fadeEl, { opacity: s.fade });
  }
}

function noiseTile(n: number, seed: number) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!;
  const d = g.createImageData(n, n);
  let a = (seed + 1) * 2654435761;
  for (let i = 0; i < n * n; i++) {
    a ^= a << 13; a ^= a >>> 17; a ^= a << 5;
    const v = 128 + (((a >>> 0) % 256) - 128) * 0.9;
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v;
    d.data[i * 4 + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
