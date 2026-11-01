import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import data from './short.json';

export const Root: React.FC = () => <Composition id="Short" component={Short} durationInFrames={data.totalFrames} fps={data.fps} width={1080} height={1920} />;
