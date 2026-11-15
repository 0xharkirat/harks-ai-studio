// A character card: an animated 3D character in a white rounded frame with a soft shadow, like a sticker.
// The art is a few key poses made with Codex image generation (each an edit of one base character), packed into
// a horizontal strip of square frames (assets/characters/<name>.webp + <name>.json, see assets/characters/README.md).
// The scene picks the pose from story moments (typing while the text types, the reaction when the result lands),
// so each character acts with the picture instead of looping.
import { box, css, tf } from '../engine/dom';
import { ease, seg, spring } from '../engine/anim';
import { img, json } from '../engine/assets';
import { SHADOW } from '../brand/tokens';

export interface Sprite {
  /** The frame strip: `frames` square poses side by side. */
  src: string;
  frames: number;
}

/** Load a character's strip: /assets/characters/<name>.webp and .json. */
export async function loadSprite(name: string): Promise<Sprite> {
  const meta = await json<{ frames: number }>(`/assets/characters/${name}.json`);
  if (!meta) throw new Error(`character missing: ${name}`);
  const src = `/assets/characters/${name}.webp`;
  await img(src);
  return { src, frames: meta.frames };
}

/** The pose on screen at t from keys [time, strip index][] (sorted), and the seconds since it started. */
export function poseAt(t: number, keys: [number, number][]) {
  let k = 0;
  for (let i = 1; i < keys.length; i++) if (t >= keys[i][0]) k = i;
  return { pose: keys[k][1], since: t - keys[k][0], changed: k > 0 };
}

export class CharacterCard {
  root: HTMLDivElement;
  private art: HTMLDivElement;
  private shown = -1;
  constructor(parent: HTMLElement, public sprite: Sprite, public size: number) {
    const pad = Math.round(size * 0.035);
    this.root = box({
      left: '0', top: '0', width: `${size}px`, height: `${size}px`, padding: `${pad}px`, boxSizing: 'border-box', background: '#fff',
      borderRadius: `${Math.round(size * 0.07)}px`, boxShadow: SHADOW.lg, transformOrigin: '50% 50%', display: 'none',
    });
    this.art = box({
      position: 'relative', width: '100%', height: '100%', borderRadius: `${Math.round(size * 0.05)}px`, overflow: 'hidden',
      backgroundImage: `url(${sprite.src})`, backgroundSize: `${sprite.frames * 100}% 100%`, backgroundRepeat: 'no-repeat',
    });
    this.root.append(this.art);
    parent.append(this.root);
  }

  /** Scale of a card that pops in on a spring at `inAt` and pops out (back ease) over 0.22 s from `outAt`. */
  static pop(t: number, inAt: number, outAt = Infinity) {
    const p = Math.max(0, spring(t - inAt, 3.0, 0.55));
    return p * (1 - ease.inBack(seg(t, outAt, outAt + 0.22)));
  }

  /**
   * Centre (cx, cy), size in px (the card scales from its built size), rotation in degrees, pop scale `s`.
   * `pose`: the strip index. `sinceReal`: real seconds since that pose started; a changed pose lands with a small
   * squash-and-settle bounce. `typing`: a quick keyboard bob while the character types.
   */
  place(cx: number, cy: number, size: number, rot: number, s: number, pose: number, sinceReal: number, changed: boolean, typing = false) {
    const bounce = changed ? 1 + 0.035 * Math.exp(-sinceReal * 14) * Math.cos(sinceReal * 30) : 1;
    const bob = typing ? Math.abs(Math.sin(sinceReal * Math.PI * 7)) * -2.5 : 0;
    const k = (size / this.size) * s * bounce;
    css(this.root, {
      display: s > 0.001 ? '' : 'none',
      transform: `${tf({ x: cx - this.size / 2, y: cy - this.size / 2 + bob, s: k })} rotate(${rot.toFixed(2)}deg)`,
    });
    const n = this.sprite.frames;
    const i = Math.max(0, Math.min(n - 1, pose));
    if (i !== this.shown) {
      this.shown = i;
      css(this.art, { backgroundPosition: `${n > 1 ? (i / (n - 1)) * 100 : 0}% 0%` });
    }
  }
}
