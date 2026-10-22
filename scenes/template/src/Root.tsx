import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import layout from './layout.json';

// 2 compositions of the same video. Every scene lays out natively for its frame, so VideoTall is not a shrunk copy:
// scenes read the frame size and reflow (1920x1080 or 1080x1920).
// The theme is picked at render time: --props='{"theme":"B"}', or scripts/render.dart --theme B.
export const Root: React.FC = () => (
  <>
    <Composition id="Video" component={Video} durationInFrames={layout.totalFrames} fps={layout.fps} width={1920} height={1080} defaultProps={{}} />
    <Composition id="VideoTall" component={Video} durationInFrames={layout.totalFrames} fps={layout.fps} width={1080} height={1920} defaultProps={{}} />
  </>
);
