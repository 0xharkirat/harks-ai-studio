// The DOG: a semi-transparent corner logo that holds the brand on screen between the title and the end card.
import type { SceneDef } from '../../engine/stage';
import { box, css } from '../../engine/dom';
import { clamp, invLerp } from '../../engine/anim';
import { logo, LOGO_ASPECT } from '../../brand/logo';

export type DogCorner = 'br' | 'tl';

/** Where the DOG sits (shared with the title scene's logo fly). `tl`: top left, where viewers look first (anthem v2). */
export function DOG(W: number, H: number, portrait: boolean, corner: DogCorner = 'br') {
  if (corner === 'tl' && !portrait) {
    const w = W * 0.095;
    return { x: W * 0.06, y: H * 0.055, w, h: w * LOGO_ASPECT };
  }
  const w = portrait ? W * 0.22 : W * 0.105;
  const h = w * LOGO_ASPECT;
  // Portrait keeps the bottom 35% clear (Meta safe zone), so the DOG goes top-right below the 14% band.
  const x = W - W * 0.06 - w;
  const y = portrait ? H * 0.145 : H - H * 0.06 - h;
  return { x, y, w, h };
}

export interface DogProps {
  corner?: DogCorner;
  /** Peak opacity (default 0.5, a classic semi-transparent DOG). */
  opacity?: number;
  /** Tone keys [localTime, 'light' | 'dark']: orange on light backgrounds, white on dark ones. */
  tones?: [number, 'light' | 'dark'][];
  /** Local times where the DOG hides (e.g. black stops): [from, to][]. */
  hide?: [number, number][];
  /** Fade-in seconds at the start (0 when the title's logo flies straight into the DOG). */
  fadeIn?: number;
  /** Size of the logo from its top-left corner (default 1; a thumbnail sets it larger). */
  scale?: number;
}

const dog: SceneDef<DogProps> = {
  id: 'dog',
  async setup({ root, W, H, portrait }, props) {
    const d0 = DOG(W, H, portrait, props.corner);
    const d = { ...d0, w: d0.w * (props.scale ?? 1), h: d0.h * (props.scale ?? 1) };
    const mk = async (color?: string) => {
      const e = box({ left: `${d.x}px`, top: `${d.y}px`, width: `${d.w}px`, height: `${d.h}px` });
      e.innerHTML = await logo('extended', color);
      css(e.firstElementChild as SVGElement, { width: '100%', height: '100%', display: 'block' });
      root.append(e);
      return e;
    };
    const orange = await mk();
    const white = await mk('#FFFFFF');
    const tones = props.tones ?? [[0, 'light']];
    return {
      update(f) {
        const t = f.lt;
        // Tone crossfade over 0.2 s around each key.
        let dark = tones[0][1] === 'dark' ? 1 : 0;
        for (let i = 1; i < tones.length; i++) {
          const [tk, tone] = tones[i];
          const target = tone === 'dark' ? 1 : 0;
          const p = clamp(invLerp(tk - 0.1, tk + 0.1, t));
          dark = dark + (target - dark) * p;
        }
        const fi = props.fadeIn ?? 0;
        let a = (props.opacity ?? 0.5) * (fi > 0 ? clamp(t / fi) : 1) * clamp((f.dur - t) * 6);
        for (const [a0, b0] of props.hide ?? []) if (t >= a0 - 0.05 && t < b0) a = 0;
        css(orange, { opacity: a * (1 - dark) });
        css(white, { opacity: a * dark });
      },
    };
  },
};
export default dog;
