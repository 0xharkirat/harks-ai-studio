// Retime check for the `cta` end card: the 5 s fifteen / dev version (pill at 0.3, Copied at 1.0).
import type { Cut } from '../engine/stage';
import cta from '../scenes/cta';

const cut: Cut = {
  id: 'wip-cta-short',
  title: 'wip: cta (5 s)',
  music: 'fifteen',
  duration: 5,
  W: 1920,
  H: 1080,
  timeline: [{ scene: cta, start: 0, end: 5, props: { pillAt: 0.3, copiedAt: 1.0, fadeOut: true } }],
};
export default cut;
