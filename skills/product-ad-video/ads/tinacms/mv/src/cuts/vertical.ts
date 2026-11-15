// Cut `vertical`: 30 s, 9:16 for Shorts, Reels and LinkedIn mobile. Same story as `thirty`.
import type { Cut } from '../engine/stage';
import { thirtyTimeline } from './thirty';
import { punch } from '../engine/fx';

const cut: Cut = { id: 'vertical', title: 'TinaCMS: Edit your site. Visually. (30 s, 9:16)', music: 'thirty', duration: 30, W: 1080, H: 1920, global: punch([[6, 20]]), timeline: thirtyTimeline() };
export default cut;
