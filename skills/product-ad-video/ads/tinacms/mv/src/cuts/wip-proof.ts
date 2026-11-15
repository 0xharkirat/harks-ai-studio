// Work in progress: the `proof` scene at its anthem position (48-56 s) so the music events line up.
// Render with --from 48 --to 56.
import type { Cut } from '../engine/stage';
import proof from '../scenes/proof';

const cut: Cut = {
  id: 'wip-proof',
  title: 'wip proof',
  music: 'anthem',
  duration: 56,
  W: 1920,
  H: 1080,
  timeline: [{ scene: proof, start: 48, end: 56 }],
};
export default cut;
