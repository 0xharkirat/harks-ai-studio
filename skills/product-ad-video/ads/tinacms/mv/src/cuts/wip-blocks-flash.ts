// Work in progress: the `blocks` flash variant (fifteen 6-8 s).
import type { Cut } from '../engine/stage';
import blocks, { BLOCKS_FLASH } from '../scenes/blocks';

const cut: Cut = {
  id: 'wip-blocks-flash',
  title: 'wip blocks flash',
  music: 'fifteen',
  duration: 2,
  W: 1920,
  H: 1080,
  timeline: [{ scene: blocks, start: 0, end: 2, props: BLOCKS_FLASH }],
};
export default cut;
