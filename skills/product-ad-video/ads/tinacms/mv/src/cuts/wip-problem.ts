// Work-in-progress cut for the `problem` scene (anthem 8-16 s), with the title scene before it and a stub after it.
import type { Cut } from '../engine/stage';
import title from '../scenes/title';
import problem from '../scenes/problem';
import dog from '../scenes/dog';
import stub from '../scenes/stub';

const cut: Cut = {
  id: 'wip-problem',
  title: 'wip: problem',
  music: 'anthem',
  duration: 18,
  W: 1920,
  H: 1080,
  timeline: [
    { scene: title, start: 4, end: 8, props: { toDog: 3.5 } },
    { scene: problem, start: 8, end: 16 },
    { scene: stub, start: 16, end: 18, props: { name: 'edit' } },
    { scene: dog, start: 8, end: 16, z: 500, props: { tones: [[0, 'light']], hide: [[7.0, 8.0]] } },
  ],
};
export default cut;
