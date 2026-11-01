import {useVideoConfig} from 'remotion';

/** The frame, as every scene reads it: size, orientation, and the unit u (1 at 1080 px on the short side). */
export const useLayoutBasics = () => {
  const {width: W, height: H} = useVideoConfig();
  return {W, H, tall: H > W, u: Math.min(W, H) / 1080};
};
