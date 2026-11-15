// Work-in-progress cut for the `cta` end card: the anthem's 6 s version, with the fade to white on.
import type { Cut } from '../engine/stage';
import cta from '../scenes/cta';

const cut: Cut = {
  id: 'wip-cta',
  title: 'wip: cta',
  music: 'anthem',
  duration: 6,
  W: 1920,
  H: 1080,
  timeline: [{ scene: cta, start: 0, end: 6, props: { fadeOut: true } }],
};
export default cut;
