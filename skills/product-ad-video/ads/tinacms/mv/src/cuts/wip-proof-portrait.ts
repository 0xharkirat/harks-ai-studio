// Work in progress: the `proof` scene at 1080 x 1920 (it must not break in portrait).
import type { Cut } from '../engine/stage';
import proof from '../scenes/proof';

const cut: Cut = {
  id: 'wip-proof-portrait',
  title: 'wip proof portrait',
  music: 'anthem',
  duration: 56,
  W: 1080,
  H: 1920,
  timeline: [{ scene: proof, start: 48, end: 56 }],
};
export default cut;
