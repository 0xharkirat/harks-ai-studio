// Cut `dev`: 45 s, 16:9, for developers. Script: docs/cuts/cutdowns.md
import type { Cut, Entry } from '../engine/stage';
import title from '../scenes/title';
import dog from '../scenes/dog';
import devs from '../scenes/devs';
import git from '../scenes/git';
import terminal from '../scenes/terminal';
import cta from '../scenes/cta';
import edit from '../scenes/edit';
import { punch } from '../engine/fx';
import stub from '../scenes/stub';

const S = (name: string, start: number, end: number, dark = false): Entry => ({ scene: stub, start, end, props: { name, dark } });

const cut: Cut = {
  id: 'dev',
  title: 'TinaCMS for developers (45 s)',
  music: 'dev',
  duration: 45,
  W: 1920,
  H: 1080,
  global: punch([[20, 36]]),
  timeline: [
    { scene: terminal, start: 0, end: 4 },
    { scene: title, start: 4, end: 6, props: { line: 'The *Git-powered* CMS.', lineTimes: [0.3, 0.42, 0.54] } },
    { scene: devs, start: 6, end: 12, props: { part: 'schema' } },
    { scene: devs, start: 12, end: 20, props: { part: 'graphql' } },
    { scene: edit, start: 20, end: 28, props: { variant: 'full', words: [['Your editors get *this.*', 0.1], ['Edit *it.*', 2.0], ['See it *live.*', 4.0], ['Swap an *image.*', 5.5]] } },
    { scene: git, start: 28, end: 36, props: { lines: [{ t: 0.55, text: 'Every edit is a *commit.*', out: 4.1 }, { t: 4.3, text: 'Reviewed like *code.*' }] } },
    { scene: devs, start: 36, end: 40, props: { part: 'stack' } },
    { scene: cta, start: 40, end: 45, props: { pillAt: 0.3, copiedAt: 1.0 } },
    { scene: dog, start: 6, end: 40, z: 500, props: { fadeIn: 0.3, tones: [[0, 'light'], [6, 'dark'], [14, 'light'], [28.05, 'dark']] } },
  ],
};
export default cut;
