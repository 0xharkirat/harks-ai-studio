import React from 'react';
import {Composition} from 'remotion';
import {NativeShort} from './NativeShort';
import data from './short.json';

// The native 9:16 Short of a channel video (scripts/short.dart copies this folder over short-video/vertical when the video has the scene library).
export const Root: React.FC = () => <Composition id="Short" component={NativeShort} durationInFrames={data.totalFrames} fps={data.fps} width={1080} height={1920} defaultProps={{}} />;
