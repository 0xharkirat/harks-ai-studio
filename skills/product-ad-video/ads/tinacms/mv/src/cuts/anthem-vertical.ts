// Cut `anthem-vertical`: the anthem (round 6) in 9:16 for YouTube Shorts and Instagram Reels, 64 s.
// The same timeline, music and sound as `anthem`; each scene lays itself out for portrait (`portrait` in setup).
// Meta's Reels safe zone: no text or logo in the top 14%, the bottom 35% or 6% at each side (docs/engine.md).
import type { Cut } from '../engine/stage';
import anthem from './anthem';

/** Portrait props per scene id, on top of the anthem's. */
const PORTRAIT: Record<string, Record<string, unknown>> = {
  open: { line: 'Your content\nshould be in\n*Markdown.*' },
  // The iris opens from the portrait click on the llama's bubble. The content editor sits big under the page.
  edit: { irisAt: [950, 1210], character: { name: 'editor-happy', at: 1.0, out: 4.85, cx: 540, cy: 1310, size: 380, rot: -3, keys: [[1.0, 0], [4.0, 1]] } },
  proof: { openLine: 'Free and\n*open source.*', wallSize: 76, wallTop: 380, castSize: 330 },
  // No QR code: a viewer cannot scan a code on the phone they watch it on. tina.io stays on the card.
  cta: { qr: undefined },
};

const cut: Cut = {
  ...anthem,
  id: 'anthem-vertical',
  title: 'TinaCMS: Edit your site. Visually. (64 s, 9:16)',
  W: 1080,
  H: 1920,
  timeline: anthem.timeline.map((e) => ({ ...e, props: { ...(e.props as object), ...(PORTRAIT[e.scene.id] ?? {}) } })),
};
export default cut;
