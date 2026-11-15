// Cut `anthem` v2: about 65 s, 16:9. Script: docs/cuts/anthem.md
// Written on the 120 BPM design grid (54 s) and played at 100 BPM (speed 1 / 1.2), after the v1 review:
// slower, no black gaps, real faces, the logo top left, and the orange edit box only on the real editor.
// Round 3: game-style reaction sounds, a cursor clicks Save, no framework list, no licence name, tina.io fonts.
// Round 6: the chill cue at 80%, 2 beats out of the hold after "Or bring your own." (design 36-37), so every
// scene from the drop on starts 1 design second earlier; "Developers" and "Content Editors" capitalised.
// Round 8 ("slow everything down, I can't read much"): 90 BPM (speed 3/4, was 1/1.2); no title slide (the open
// shrinks into the developer's window); the chat bubbles 1.5 s apart (was 0.75) on 2 more verse bars; the commit
// timeline spread over 1 more bridge bar; the llama's answer twice the size; "Not as much."; the end card gets
// "or / Your favourite AI agent." Music `anthem3` (music/src/song/cues.py); 55 design s, 73 s.
// Round 8b (Hark): the title "Edit your site. Visually." comes back, after the llama's answer: the click on the
// answer opens it as an iris, then its logo flies into the corner and the edit scene opens from the centre.
// The end card is symmetrical.
// Round 8c (Hark): the title rides on the first 2 bars of chorus 1, so the music flows from the pre-chorus into the
// chorus (no title bars or sonic logo of its own); the chat bubbles take the cards' pop; the git scene is back to
// 8 s (the hold after the merge was empty). 57 design s, 76 s.
// Round 8d (Hark, after the round 8c pass): the title goes back to its round 7 place, after the open (4-8), with its
// own music bars; the click on the llama's answer opens the edit scene on the chorus 1 drop (22), as in round 8.
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
const CLICK: [number, number] = [1534, 684];
const DOG_OPACITY = 0.8;

const cut: Cut = {
  id: 'anthem',
  title: 'TinaCMS: Edit your site. Visually. (76 s)',
  // Round 6: Hark picked the chill cue (pads, a light beat, no drop hits or stops). Round 8: the same cue at 90 BPM.
  music: 'anthem3',
  duration: 57,
  speed: 3 / 4,
  W: 1920,
  H: 1080,
  global: punch([[22, 30], [41, 49]]),
  timeline: [
    // The open is the developer's view (dark); the title opens the light world (round 7).
    { scene: open, start: 0, end: 4, props: { fixed: true, typeStart: 0.5, typeEnd: 2.6, lineIn: 1.2, line: 'Your content\nshould be in *Markdown.*' } },
    // The title (round 7): the logo springs in on its sonic logo, the campaign line lands, the logo flies into the corner at 7.5.
    // Round 8e: no white flash, and the logo and the line come 0.55 and 0.5 s sooner, so the cut has no blank second.
    { scene: title, start: 4, end: 8, props: { toDog: 3.5, box: false, glyphs: false, dogCorner: 'tl', dogOpacity: DOG_OPACITY, flash: false, logoAt: 0.0, lineIn: 0.5, lineTimes: [0.5, 0.75, 1.0, 1.5] } },
    // Her "aah" on the error (12.25) plays alone; then the 4 requests arrive one by one, 3 beats apart (2 s), and the
    // llama rises 1.5 s after the last one (19.0), so its answer has about 3 s on screen before the click.
    { scene: problem, start: 8, end: 22, post: 0.5, props: { editorsAt: 2.75, bubblesAt: 5.0, bubbleEvery: 1.5, llamaAt: 11.0, clickAt: 13.6 } },
    {
      scene: edit, start: 22, end: 30,
      props: {
        // The click on the llama's answer opens the editor as an iris, on the chorus 1 drop.
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
      scene: git, start: 30, end: 38,
      props: {
        // A cursor glides in and clicks Save on beat 3 (27.0); only then the commit flies out.
        // Round 8: the commits land 1.5 s apart (were 0.7 to 2 s), the pull request merges at 6.0, the dark turn at 6.5.
        saveBox: false, headlineY: 132, pressAt: 1.0, cursor: true, dark: 6.5,
        commits: [{ t: 1.3, msg: 'Update hero headline' }, { t: 2.75, msg: 'Swap hero image' }, { t: 4.25, msg: 'Add stats block' }, { t: 6.0, msg: 'Publish: Fieldnote 3.0 launch post' }],
        lines: [
          { t: 1.35, text: 'Every edit is a *commit.*', ptext: 'Every edit\nis a *commit.*', out: 4.3 },
          { t: 4.5, text: 'Powered by *GitHub.*', ptext: 'Powered by\n*GitHub.*', sub: 'The best collaboration and version history.' },
        ],
      },
    },
    // What `create-tina-app` and `tinacms init` offer today: Astro (the default starter) and Next.js have visual editing,
    // and init takes any other site ("Other (SSG frameworks like gatsby, etc.)"). One line per beat; the foley bloops follow these times.
    { scene: devs, start: 38, end: 41, props: { part: 'stack', oss: false, label: 'WORKS WITH', lines: [{ text: 'Astro.', t: 0.5 }, { text: 'Next.js.', t: 1.0 }, { text: '*Or bring your own.*', t: 1.5 }] } },
    // "Free and open source." (no licence name: it is about to change) settles below the DOG; no edit box on the wall.
    // The two characters come back under "Built for Developers. And Content Editors.", both happy.
    {
      scene: proof, start: 41, end: 49,
      props: {
        openLine: 'Free and *open source.*', wallLine: 'Built for Developers.\n*And Content Editors.*', lockTop: 132, hops: [],
        wallWordTimes: [4.25, 4.33, 4.41, 5.0, 5.08, 5.16], cast: [4.25, 5.0],
      },
    },
    // The QR code opens tina.io with UTM tags, so tina.io's analytics count the scans.
    // Round 8: "Try TinaCMS today.", the npx command, "or", "With your favourite AI agent" and a robot (the tag line goes).
    // Round 8b (Hark): symmetrical: one centred stack with even gaps, the QR card and the llama mirrored around it.
    {
      scene: cta, start: 49, end: 57,
      props: { fadeOut: false, boxAt: 99, line: 'Try TinaCMS *today.*', agent: 'With your favourite *AI agent* \u{1F916}', agentAt: 2.6, urlAt: 3.3, qrAt: 3.6, llamaAt: 4.0, qr: '/assets/qr/tina-io-anthem.svg' },
    },
    // The DOG takes over from the title's logo when it lands (8.0, round 7). Dark with the git scene's dark turn (36.5),
    // light on the drop (41).
    { scene: dog, start: 8, end: 49, z: 500, props: { corner: 'tl', opacity: DOG_OPACITY, tones: [[0, 'light'], [28.55, 'dark'], [33, 'light']] } },
  ],
};
export default cut;
