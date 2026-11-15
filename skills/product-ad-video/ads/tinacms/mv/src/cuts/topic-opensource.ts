// Topic ad: open source (15.6 s). "Free and open source.", the stars, the wall of sites and "Built for Developers.
// And Content Editors." with both characters, then the end card.
import proof from '../scenes/proof';
import { anthemProps, topicAd } from '../topics';

export default topicAd({
  id: 'topic-opensource',
  title: 'TinaCMS topic ad: free and open source (16 s)',
  parts: [{ scene: proof, start: 0, end: 8, props: anthemProps('proof') }],
  dogTones: [[0, 'light']],
  drops: [[0, 8]],
});
