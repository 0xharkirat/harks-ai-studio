// YakShaver fonts. Brand Guide V6 and yakshaver.ai/media: "The official font used in YakShaver is Inter".
// The site serves Inter (next/font/google) at 400, 600 and 700; the file is the Inter 4.001 variable TTF (OFL 1.1).
// The site serves no monospace font. Code panels use IBM Plex Mono (OFL 1.1), the engine's code font.
// `FONT.head` keeps its name for the scenes; it is Inter here (H1 700, H2 600 in the guide).
import { fonts } from '../engine/assets';

const faces = `
@font-face { font-family: 'YakInter'; src: url('/assets/fonts/InterVariable.ttf') format('truetype'); font-weight: 100 900; font-display: block; }
@font-face { font-family: 'PlexMono'; src: url('/assets/fonts/IBMPlexMono-Regular.woff2') format('woff2'); font-weight: 400; font-display: block; }
@font-face { font-family: 'PlexMono'; src: url('/assets/fonts/IBMPlexMono-Medium.woff2') format('woff2'); font-weight: 500; font-display: block; }
@font-face { font-family: 'PlexMono'; src: url('/assets/fonts/IBMPlexMono-SemiBold.woff2') format('woff2'); font-weight: 600 700; font-display: block; }
`;

export const FONT = {
  head: "'YakInter', 'Inter', system-ui, sans-serif",
  ui: "'YakInter', 'Inter', system-ui, sans-serif",
  mono: "'PlexMono', 'IBM Plex Mono', ui-monospace, monospace",
};

export async function loadBrandFonts() {
  const st = document.createElement('style');
  st.textContent = faces + `
    #stage, #stage * { box-sizing: border-box; }
    #stage { font-family: ${FONT.ui}; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; font-kerning: normal; }
  `;
  document.head.append(st);
  await fonts(['400 40px YakInter', '600 40px YakInter', '700 40px YakInter', '400 20px PlexMono', '500 20px PlexMono', '600 20px PlexMono']);
}
