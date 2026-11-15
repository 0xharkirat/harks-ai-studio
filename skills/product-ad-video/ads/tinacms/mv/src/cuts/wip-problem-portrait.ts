// Portrait check for the `problem` scene (1080 x 1920).
import type { Cut } from '../engine/stage';
import title from '../scenes/title';
import problem from '../scenes/problem';
import dog from '../scenes/dog';

const cut: Cut = {
  id: 'wip-problem-portrait',
  title: 'wip: problem (portrait)',
  music: 'thirty',
  duration: 16,
  W: 1080,
  H: 1920,
  timeline: [
    { scene: title, start: 4, end: 8, props: { toDog: 3.5 } },
    { scene: problem, start: 8, end: 16 },
    { scene: dog, start: 8, end: 16, z: 500, props: { tones: [[0, 'light']], hide: [[7.0, 8.0]] } },
  ],
};
export default cut;
