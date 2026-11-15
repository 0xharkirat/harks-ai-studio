// Cut `six`: 6 s, 16:9, the YouTube bumper. 0-1.5 live edit hook, then the end card with the campaign line.
// Music cue `six`: typing + riser 0-1.5, impact 1.5, final chord 2.5, sonic logo 3.0, end hit 5.0.
import type { Cut } from '../engine/stage';
import cta from '../scenes/cta';
import edit from '../scenes/edit';
import { punch } from '../engine/fx';

const cut: Cut = {
  id: 'six',
  title: 'TinaCMS: Edit your site. Visually. (6 s bumper)',
  music: 'six',
  duration: 6,
  W: 1920,
  H: 1080,
  global: punch([]),
  timeline: [
    // The hook types "Edit your site. Visually." by 1.05 and holds it to the cut.
    { scene: edit, start: 0, end: 1.5, props: { variant: 'hook', typeStart: 0.1, typeDur: 0.95 } },
    // Impact on the first frame (1.5). The command types in 0.35 s and tina.io lands by about 1.95, so the full
    // call to action holds 4 s. The edit box snaps on the snare (2.0), "Copied" lands on the sonic logo (3.0),
    // the llama rocks in on the kick and clap (3.5).
    { scene: cta, start: 1.5, end: 6, props: { line: 'Edit your site. *Visually.*', lineAt: 0.05, pillAt: 0, typeAt: 0.02, cps: 70, boxAt: 0.5, copiedAt: 1.5, urlAt: 0.18, llamaAt: 2.0, tagAt: 2.3 } },
  ],
};
export default cut;
