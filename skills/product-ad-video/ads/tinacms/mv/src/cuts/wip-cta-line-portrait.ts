// Portrait check for the `cta` end card with the optional headline line.
import type { Cut } from '../engine/stage';
import cta from '../scenes/cta';

const cut: Cut = {
  id: 'wip-cta-line-portrait',
  title: 'wip: cta + line (portrait)',
  music: 'thirty',
  duration: 6,
  W: 1080,
  H: 1920,
  timeline: [{ scene: cta, start: 0, end: 6, props: { line: 'Edit your site. *Visually.*' } }],
};
export default cut;
