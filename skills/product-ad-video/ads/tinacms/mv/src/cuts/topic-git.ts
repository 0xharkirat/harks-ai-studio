// Topic ad: Git (15.6 s). A cursor clicks Save, "Every edit is a commit.", "Powered by GitHub.", then the end card.
import git from '../scenes/git';
import { anthemProps, topicAd } from '../topics';

export default topicAd({
  id: 'topic-git',
  title: 'TinaCMS topic ad: every edit is a commit (16 s)',
  parts: [{ scene: git, start: 0, end: 8, props: anthemProps('git') }],
  // The anthem's logo turns white for the dark world at git 6.05.
  dogTones: [[0, 'light'], [6.05, 'dark']],
});
