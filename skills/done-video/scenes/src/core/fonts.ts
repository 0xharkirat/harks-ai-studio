// Fonts, all under the SIL Open Font License 1.1 and served from npm packages (no network at render time).
//   Inter            - clean themes (A, C): labels, numbers, titles
//   Source Serif 4   - clean themes: ocean and sea names on maps (italic)
//   Caveat Brush     - sketch theme (B): display lettering and numbers
//   Patrick Hand     - sketch theme (B): small labels
//   Fredoka          - flat theme (D)
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import '@fontsource/source-serif-4/latin-400-italic.css';
import '@fontsource/source-serif-4/latin-600-italic.css';
import '@fontsource/caveat-brush/latin-400.css';
import '@fontsource/patrick-hand/latin-400.css';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';

export const FONT = {
  inter: '"Inter", "Helvetica Neue", Arial, sans-serif',
  serif: '"Source Serif 4", Georgia, serif',
  caveat: '"Caveat Brush", "Comic Sans MS", cursive',
  patrick: '"Patrick Hand", "Comic Sans MS", cursive',
  fredoka: '"Fredoka", "Helvetica Neue", Arial, sans-serif',
} as const;

/** The font files a theme needs, as CSS font shorthands, so a render waits for them. */
export const FONT_LOADS = [
  '500 64px "Inter"',
  '600 64px "Inter"',
  '700 64px "Inter"',
  '800 64px "Inter"',
  'italic 400 64px "Source Serif 4"',
  'italic 600 64px "Source Serif 4"',
  '400 64px "Caveat Brush"',
  '400 64px "Patrick Hand"',
  '500 64px "Fredoka"',
  '600 64px "Fredoka"',
  '700 64px "Fredoka"',
];
