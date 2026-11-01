import React from 'react';
import {Img, staticFile} from 'remotion';
import {useLayout} from '../core/layout';
import brand from '../brand.json';

/**
 * The channel mark slot, in the safe area: 16:9 top right, 9:16 top left (the top right is the platform's own buttons).
 * It shows the logo when `scripts/scenes.dart brand` found one in the brand export folder and copied it into
 * public/brand/ (it writes src/lib/brand.json). Until then, a plain placeholder: a ring with a 4-point star (no text).
 * The mark does not change with the theme (channel/style_test.md: the channel mark stays the same in every arm).
 */
export const ChannelMark: React.FC<{show?: number}> = ({show = 1}) => {
  const L = useLayout();
  const z = L.zones.mark;
  const file = (brand as {file: string | null}).file;
  if (show <= 0) return null;
  return (
    <div style={{position: 'absolute', left: z.x, top: z.y, width: z.w, height: z.h, opacity: show, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {file ? (
        <Img src={staticFile(file)} style={{width: '100%', height: '100%', objectFit: 'contain'}} />
      ) : (
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label="channel mark placeholder">
          <circle cx="50" cy="50" r="44" fill="#0a1e2b" stroke="#ff7a21" strokeWidth="6" />
          <path d="M50 22 L57 43 L78 50 L57 57 L50 78 L43 57 L22 50 L43 43 Z" fill="#ffffff" />
        </svg>
      )}
    </div>
  );
};
