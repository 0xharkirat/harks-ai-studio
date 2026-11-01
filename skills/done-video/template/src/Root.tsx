import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import layout from './layout.json';

export const Root: React.FC = () => (
  <Composition id="Video" component={Video} durationInFrames={layout.totalFrames} fps={layout.fps} width={1920} height={1080} />
);
