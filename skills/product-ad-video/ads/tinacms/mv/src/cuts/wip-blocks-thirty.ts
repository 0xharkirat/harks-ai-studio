// Work in progress: the `blocks` scene as the 6 s `thirty` version (14-20 s), landscape.
import type { Cut } from '../engine/stage';
import blocks, { BLOCKS_THIRTY } from '../scenes/blocks';

const cut: Cut = {
  id: 'wip-blocks-thirty',
  title: 'wip blocks thirty',
  music: 'thirty',
  duration: 20,
  W: 1920,
  H: 1080,
  timeline: [{ scene: blocks, start: 14, end: 20, props: BLOCKS_THIRTY }],
};
export default cut;
