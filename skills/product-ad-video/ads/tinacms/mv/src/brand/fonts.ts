// Tina brand fonts, the same files tina.io serves: IBM Plex Sans SemiBold for headings, Inter for body/UI,
// IBM Plex Mono for code (tina.io/fonts, OFL 1.1).
import { fonts } from '../engine/assets';

const faces = `
@font-face { font-family: 'Plex'; src: url('/assets/fonts/IBMPlexSans-VF.ttf') format('truetype'); font-weight: 100 700; font-stretch: 85% 100%; font-display: block; }
@font-face { font-family: 'Inter'; src: url('/assets/fonts/InterVariable.woff2') format('woff2'); font-weight: 100 900; font-display: block; }
@font-face { font-family: 'PlexMono'; src: url('/assets/fonts/IBMPlexMono-Regular.woff2') format('woff2'); font-weight: 400; font-display: block; }
@font-face { font-family: 'PlexMono'; src: url('/assets/fonts/IBMPlexMono-Medium.woff2') format('woff2'); font-weight: 500; font-display: block; }
@font-face { font-family: 'PlexMono'; src: url('/assets/fonts/IBMPlexMono-SemiBold.woff2') format('woff2'); font-weight: 600 700; font-display: block; }
`;

export const FONT = {
  head: "'Plex', 'IBM Plex Sans', system-ui, sans-serif",
  ui: "'Inter', system-ui, sans-serif",
  mono: "'PlexMono', 'IBM Plex Mono', ui-monospace, monospace",
};

export async function loadBrandFonts() {
  const st = document.createElement('style');
  st.textContent = faces + `
    #stage, #stage * { box-sizing: border-box; }
    #stage { font-family: ${FONT.ui}; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; font-kerning: normal; }
  `;
  document.head.append(st);
  await fonts(['600 40px Plex', '400 40px Plex', '700 40px Plex', '400 20px Inter', '600 20px Inter', '400 20px PlexMono', '500 20px PlexMono', '600 20px PlexMono']);
}
