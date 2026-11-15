// The anthem's YouTube thumbnail: the "Built for developers. And content editors." frame (anthem 0:52), set for a
// small screen: bigger words, bigger character cards, a bigger logo, and a wider white veil behind the words.
// Render a still: node render/still.mjs --cut thumb-anthem --t 6.6 --out <dir>, then scale it to 1280 x 720.
import type { Cut } from '../engine/stage';
import proof from '../scenes/proof';
import dog from '../scenes/dog';

const cut: Cut = {
  id: 'thumb-anthem',
  title: 'TinaCMS anthem thumbnail',
  music: 'anthem', // the 120 BPM cue: this cut runs on design time (speed 1)
  duration: 8,
  W: 1920,
  H: 1080,
  timeline: [
    {
      scene: proof, start: 0, end: 8,
      props: {
        openLine: 'Free and *open source.*', wallLine: 'Built for Developers.\n*And Content Editors.*', lockTop: 132, hops: [],
        wallWordTimes: [4.25, 4.33, 4.41, 5.0, 5.08, 5.16], cast: [4.25, 5.0],
        wallSize: 136, wallTop: 165, castSize: 470, veilW: 0.9,
      },
    },
    { scene: dog, start: 0, end: 8, z: 500, props: { corner: 'tl', opacity: 1, scale: 1.4 } },
  ],
};
export default cut;
