// Topic ad: frameworks (14.4 s). The logo and "Edit your site. Visually.", then "Works with Astro. Next.js. Or bring
// your own.", then the end card.
import title from '../scenes/title';
import devs from '../scenes/devs';
import { anthemProps, topicAd } from '../topics';

export default topicAd({
  id: 'topic-frameworks',
  title: 'TinaCMS topic ad: works with your framework (14 s)',
  parts: [
    // The title starts 0.5 s in: its first half second is an empty white bloom, and an ad needs the logo up front.
    // The logo now lands about 0.2 s in, on the sonic logo; the music is unchanged.
    { scene: title, start: -0.5, end: 4, props: anthemProps('title') },
    { scene: devs, start: 4, end: 7, props: anthemProps('devs') },
  ],
  // The title's logo flies into the corner at 3.0-3.5; the corner logo takes over, white on the dark world from 4.
  dogFrom: 3.5,
  dogTones: [[0, 'light'], [0.5, 'dark']],
});
