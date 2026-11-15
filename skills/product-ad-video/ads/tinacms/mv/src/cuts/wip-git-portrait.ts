// Work-in-progress cut for the `git` scene in 9:16: the 4 s `short` version (vertical cut, local 20-24).
import type { Cut } from '../engine/stage';
import git from '../scenes/git';

const cut: Cut = {
  id: 'wip-git-portrait',
  title: 'wip: git portrait',
  music: 'thirty',
  duration: 4,
  W: 1080,
  H: 1920,
  timeline: [{ scene: git, start: 0, end: 4 }],
};
export default cut;
