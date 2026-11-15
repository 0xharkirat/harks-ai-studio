// Work in progress: the `blocks` scene alone (anthem 24-32 s), render with --from 24 --to 32 so the music events line up.
import type { Cut } from '../engine/stage';
import blocks from '../scenes/blocks';

const cut: Cut = {
  id: 'wip-blocks',
  title: 'wip blocks',
  music: 'anthem',
  duration: 32,
  W: 1920,
  H: 1080,
  timeline: [{ scene: blocks, start: 24, end: 32 }],
};
export default cut;
