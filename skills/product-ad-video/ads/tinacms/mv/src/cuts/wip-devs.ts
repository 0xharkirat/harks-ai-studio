// Work-in-progress cut for the `devs` scene: the anthem version (8 s, all parts).
import type { Cut } from '../engine/stage';
import devs from '../scenes/devs';

const cut: Cut = {
  id: 'wip-devs',
  title: 'wip: devs',
  music: 'anthem',
  duration: 8,
  W: 1920,
  H: 1080,
  timeline: [{ scene: devs, start: 0, end: 8 }],
};
export default cut;
