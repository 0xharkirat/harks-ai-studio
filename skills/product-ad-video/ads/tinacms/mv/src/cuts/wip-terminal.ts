// Work-in-progress cut for the `terminal` scene (dev cut 0-4 s), followed by `title` for the handoff check.
import type { Cut } from '../engine/stage';
import terminal from '../scenes/terminal';
import title from '../scenes/title';

const cut: Cut = {
  id: 'wip-terminal',
  title: 'wip: terminal',
  music: 'dev',
  duration: 6,
  W: 1920,
  H: 1080,
  timeline: [
    { scene: terminal, start: 0, end: 4 },
    { scene: title, start: 4, end: 6, props: { line: 'The *Git-powered* CMS.', lineTimes: [0.5, 0.75, 1.0], toDog: 1.6 } },
  ],
};
export default cut;
