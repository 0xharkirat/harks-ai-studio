// Topic ad: visual editing (15.6 s). "Click anything. Edit it. See it live. Swap an image." then the end card.
import edit from '../scenes/edit';
import { anthemProps, topicAd } from '../topics';

export default topicAd({
  id: 'topic-visual',
  title: 'TinaCMS topic ad: visual editing (16 s)',
  // No iris: the ad opens on the editor, not on the llama's click.
  parts: [{ scene: edit, start: 0, end: 8, props: { ...anthemProps('edit'), iris: false } }],
  dogTones: [[0, 'light']],
  drops: [[0, 8]],
});
