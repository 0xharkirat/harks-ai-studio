// Cut `fifteen`: 15 s, 16:9. Script: docs/cuts/cutdowns.md
import type { Cut, Entry } from '../engine/stage';
import title from '../scenes/title';
import dog from '../scenes/dog';
import blocks, { BLOCKS_FLASH } from '../scenes/blocks';
import git from '../scenes/git';
import cta from '../scenes/cta';
import edit from '../scenes/edit';
import { punch } from '../engine/fx';
import stub from '../scenes/stub';

const S = (name: string, start: number, end: number, dark = false): Entry => ({ scene: stub, start, end, props: { name, dark } });

const cut: Cut = {
  id: 'fifteen',
  title: 'TinaCMS: Edit your site. Visually. (15 s)',
  music: 'fifteen',
  duration: 15,
  W: 1920,
  H: 1080,
  global: punch([[4, 10]]),
  timeline: [
    { scene: edit, start: 0, end: 2, props: { variant: 'hook' } },
    { scene: title, start: 2, end: 4, props: { lineTimes: [0.3, 0.38, 0.46, 0.6], pageHeadline: 'Edit your site. Visually.' } },
    { scene: edit, start: 4, end: 6, props: { variant: 'flash' } },
    { scene: blocks, start: 6, end: 8, props: BLOCKS_FLASH },
    { scene: git, start: 8, end: 10 },
    { scene: cta, start: 10, end: 15, props: { pillAt: 0.3, copiedAt: 1.0 } },
    { scene: dog, start: 4, end: 10, z: 500, props: { tones: [[0, 'light']], fadeIn: 0.3 } },
  ],
};
export default cut;
