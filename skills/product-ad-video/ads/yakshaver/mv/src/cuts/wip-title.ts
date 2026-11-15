import type { Cut } from '../engine/stage';
import title from '../scenes/title';

const cut: Cut = {
  id: 'wip-title',
  title: 'Work cut: title',
  music: 'yak',
  duration: 4,
  speed: 3 / 4,
  W: 1920,
  H: 1080,
  timeline: [{
    scene: title, start: 0, end: 4,
    props: { line: 'The perfect *PBI*. In seconds.', pageHeadline: 'Find your next coastal escape.',
             flash: false, logoAt: 0, lineIn: 0.5, lineTimes: [0.5, 0.75, 1.0, 1.5],
             box: false, glyphs: false, toDog: 3.5, dogCorner: 'tl', dogOpacity: 0.8 },
  }],
};
export default cut;
