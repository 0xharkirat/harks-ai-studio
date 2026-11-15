// Portrait check for the `cta` end card (1080 x 1920, 6 s, as in the vertical cut).
import type { Cut } from '../engine/stage';
import cta from '../scenes/cta';

const cut: Cut = {
  id: 'wip-cta-portrait',
  title: 'wip: cta (portrait)',
  music: 'thirty',
  duration: 6,
  W: 1080,
  H: 1920,
  timeline: [{ scene: cta, start: 0, end: 6, props: { fadeOut: true } }],
};
export default cut;
