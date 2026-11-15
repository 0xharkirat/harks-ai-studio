// Cut `thirty`: 30 s, 16:9. Script: docs/cuts/cutdowns.md
import type { Cut, Entry } from '../engine/stage';
import title from '../scenes/title';
import dog from '../scenes/dog';
import blocks, { BLOCKS_THIRTY } from '../scenes/blocks';
import git from '../scenes/git';
import cta from '../scenes/cta';
import edit from '../scenes/edit';
import { punch } from '../engine/fx';
import stub from '../scenes/stub';

const S = (name: string, start: number, end: number, dark = false): Entry => ({ scene: stub, start, end, props: { name, dark } });

export function thirtyTimeline(): Entry[] {
  return [
    { scene: edit, start: 0, end: 2, props: { variant: 'hook' } },
    { scene: title, start: 2, end: 6, props: { toDog: 3.5, pageHeadline: 'Edit your site. Visually.' } },
    { scene: edit, start: 6, end: 14, props: { variant: 'full', after: true } },
    { scene: blocks, start: 14, end: 20, props: BLOCKS_THIRTY },
    { scene: git, start: 20, end: 24 },
    { scene: cta, start: 24, end: 30 },
    { scene: dog, start: 6, end: 24, z: 500, props: { tones: [[0, 'light']] } },
  ];
}

const cut: Cut = { id: 'thirty', title: 'TinaCMS: Edit your site. Visually. (30 s)', music: 'thirty', duration: 30, W: 1920, H: 1080, global: punch([[6, 20]]), timeline: thirtyTimeline() };
export default cut;
