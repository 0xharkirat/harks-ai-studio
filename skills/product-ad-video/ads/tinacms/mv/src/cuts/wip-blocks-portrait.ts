// Work in progress: the `blocks` scene alone at 1080 x 1920 (the 6 s `thirty` version, portrait).
import type { Cut } from '../engine/stage';
import blocks, { BLOCKS_THIRTY } from '../scenes/blocks';

const cut: Cut = {
  id: 'wip-blocks-portrait',
  title: 'wip blocks portrait',
  music: 'thirty',
  duration: 6,
  W: 1080,
  H: 1920,
  timeline: [{ scene: blocks, start: 0, end: 6, props: BLOCKS_THIRTY }],
};
export default cut;
