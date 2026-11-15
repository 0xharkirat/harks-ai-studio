// Topic ad: the Markdown pain (18 s). "Developers love Markdown." / "Content Editors? Not so much." / the llama's
// answer and the click, then the end card.
import problem from '../scenes/problem';
import { anthemProps, topicAd } from '../topics';

export default topicAd({
  id: 'topic-markdown',
  title: 'TinaCMS topic ad: the Markdown pain (18 s)',
  parts: [{ scene: problem, start: 0, end: 10, props: anthemProps('problem') }],
  dogTones: [[0, 'light']],
});
