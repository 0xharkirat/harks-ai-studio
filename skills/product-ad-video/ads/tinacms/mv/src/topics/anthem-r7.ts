// Frozen copy of cut `anthem` as of round 7 (100 BPM, with the title), for the topic ads: their music is cut from
// anthem2_chill at these design times. Re-cut the topic ads from the round 8 anthem once it passes, then delete this file.
// Original header: Cut `anthem` v2: about 65 s, 16:9. Script: docs/cuts/anthem.md
// Written on the 120 BPM design grid (54 s) and played at 100 BPM (speed 1 / 1.2), after the v1 review:
// slower, no black gaps, real faces, the logo top left, and the orange edit box only on the real editor.
// Round 3: game-style reaction sounds, a cursor clicks Save, no framework list, no licence name, tina.io fonts.
// Round 6: the chill cue at 80%, 2 beats out of the hold after "Or bring your own." (design 36-37), so every
// scene from the drop on starts 1 design second earlier; "Developers" and "Content Editors" capitalised.
import type { Cut } from '../engine/stage';
import open from '../scenes/open';
import title from '../scenes/title';
import dog from '../scenes/dog';
import proof from '../scenes/proof';
import devs from '../scenes/devs';
import git from '../scenes/git';
import problem from '../scenes/problem';
import cta from '../scenes/cta';
import edit from '../scenes/edit';
import { punch } from '../engine/fx';

/** Where the cursor clicks the llama's speech bubble, its lower-right edge (stage px): the edit scene's iris opens from here. */
const CLICK: [number, number] = [1672, 739];
const DOG_OPACITY = 0.8;

const cut: Cut = {
  id: 'anthem-r7',
  title: 'TinaCMS: Edit your site. Visually. (64 s)',
  // Round 6: Hark picked the chill cue (pads, a light beat, no drop hits or stops).
  music: 'anthem2_chill',
  duration: 53,
  speed: 1 / 1.2,
  W: 1920,
  H: 1080,
  global: punch([[18, 26], [37, 45]]),
  timeline: [
    { scene: open, start: 0, end: 4, props: { fixed: true, typeStart: 0.5, typeEnd: 2.6, lineIn: 1.2, line: 'Your content\nshould be in *Markdown.*' } },
    { scene: title, start: 4, end: 8, props: { toDog: 3.5, box: false, glyphs: false, dogCorner: 'tl', dogOpacity: DOG_OPACITY } },
    // Her "aah" on the error (12.0) plays alone; then the 4 requests arrive one by one, 1.5 beats apart (0.9 s), and
    // the llama rises on the pre-chorus half-bar (15.5), so its answer still has 2 s on screen before the click.
    { scene: problem, start: 8, end: 18, post: 0.5, props: { bubblesAt: 4.75, bubbleEvery: 0.75, llamaAt: 7.5, clickAt: 9.6 } },
    {
      scene: edit, start: 18, end: 26,
      props: {
        variant: 'full', iris: true, irisAt: CLICK,
        // The content editor, happy: she types with the headline, then a fist pump on "See it live." (4.0).
        character: { name: 'editor-happy', at: 1.0, out: 4.85, cx: 1690, cy: 868, size: 290, rot: 4, keys: [[1.0, 0], [4.0, 1]] },
        // No zoomed field: the page, the sidebar field and the character already move at once.
        loupe: false,
        // The box stays on the headline edit; the image swap reads from the cursor alone.
        mediaBox: false,
      },
    },
    {
      scene: git, start: 26, end: 34,
      props: {
        // A cursor glides in and clicks Save on beat 3 (27.0); only then the commit flies out.
        saveBox: false, headlineY: 132, pressAt: 1.0, cursor: true,
        lines: [
          { t: 1.35, text: 'Every edit is a *commit.*', ptext: 'Every edit\nis a *commit.*', out: 3.8 },
          { t: 4.0, text: 'Powered by *GitHub.*', ptext: 'Powered by\n*GitHub.*', sub: 'The best collaboration and version history.' },
        ],
      },
    },
    // What `create-tina-app` and `tinacms init` offer today: Astro (the default starter) and Next.js have visual editing,
    // and init takes any other site ("Other (SSG frameworks like gatsby, etc.)"). One line per beat; the foley bloops follow these times.
    { scene: devs, start: 34, end: 37, props: { part: 'stack', oss: false, label: 'WORKS WITH', lines: [{ text: 'Astro.', t: 0.5 }, { text: 'Next.js.', t: 1.0 }, { text: '*Or bring your own.*', t: 1.5 }] } },
    // "Free and open source." (no licence name: it is about to change) settles below the DOG; no edit box on the wall.
    // The two characters come back under "Built for Developers. And Content Editors.", both happy.
    {
      scene: proof, start: 37, end: 45,
      props: {
        openLine: 'Free and *open source.*', wallLine: 'Built for Developers.\n*And Content Editors.*', lockTop: 132, hops: [],
        wallWordTimes: [4.25, 4.33, 4.41, 5.0, 5.08, 5.16], cast: [4.25, 5.0],
      },
    },
    // The QR code opens tina.io with UTM tags, so tina.io's analytics count the scans.
    { scene: cta, start: 45, end: 53, props: { fadeOut: false, boxAt: 99, line: 'Try TinaCMS *today.*', qr: '/assets/qr/tina-io-anthem.svg' } },
    { scene: dog, start: 8, end: 45, z: 500, props: { corner: 'tl', opacity: DOG_OPACITY, tones: [[0, 'light'], [24.05, 'dark'], [29, 'light']] } }, // light again on the drop (37)
  ],
};
export default cut;
