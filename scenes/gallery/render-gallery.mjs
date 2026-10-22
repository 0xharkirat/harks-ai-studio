// Render stills of every library scene, in every theme and both orientations, into a folder.
// Run from a video project that has the library in src/lib and this folder in src/gallery, with
// @remotion/bundler and @remotion/renderer installed (a dev dependency, pinned to the remotion version):
//   node src/gallery/render-gallery.mjs <outDir> [themes=A,B,C,D] [ids=all]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir = 'out/gallery', themesArg = 'A,B,C,D', idsArg = 'all'] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/gallery/index.ts'), enableCaching: true});
// The frame to capture for each composition id is exported by the gallery itself.
const ids = JSON.parse(fs.readFileSync('src/gallery/frames.json', 'utf8'));
for (const theme of themesArg.split(',')) {
  for (const [id, frame] of Object.entries(ids)) {
    if (idsArg !== 'all' && !idsArg.split(',').some((p) => id.startsWith(p))) continue;
    for (const o of ['wide', 'tall']) {
      const compId = `${id}-${o}`;
      const inputProps = {theme};
      const comp = await selectComposition({serveUrl, id: compId, inputProps});
      const output = path.join(outDir, `${id}-${theme}-${o}.png`);
      await renderStill({composition: comp, serveUrl, frame, output, inputProps});
      console.log('wrote', output);
    }
  }
}
