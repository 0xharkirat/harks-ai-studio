// Work-in-progress cut for the `git` scene: the anthem version (8 s) at 32-40 with neighbours, shifted to start at 0.
import type { Cut } from '../engine/stage';
import git from '../scenes/git';

const cut: Cut = {
  id: 'wip-git',
  title: 'wip: git',
  music: 'anthem',
  duration: 8,
  W: 1920,
  H: 1080,
  timeline: [{ scene: git, start: 0, end: 8 }],
};
export default cut;
