// Check of the title card with a one-line page headline (as in thirty, fifteen and vertical).
import type { Cut } from '../engine/stage';
import title from '../scenes/title';

const cut: Cut = {
  id: 'wip-title-page',
  title: 'wip: title page card',
  music: 'thirty',
  duration: 4,
  W: 1920,
  H: 1080,
  timeline: [{ scene: title, start: 0, end: 4, props: { toDog: 3.5, pageHeadline: 'Edit your site. Visually.' } }],
};
export default cut;
