import React from 'react';
import {registerRoot} from 'remotion';
import {GalleryCompositions} from './Gallery';

const Root: React.FC = () => React.createElement(GalleryCompositions);
registerRoot(Root);
