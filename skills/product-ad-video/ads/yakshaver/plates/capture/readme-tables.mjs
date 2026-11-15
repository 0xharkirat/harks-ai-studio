// Rewrites the plate and sequence tables of plates/README.md from out/manifest.json.
//   node readme-tables.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const m = JSON.parse(fs.readFileSync(path.join(root, 'out/manifest.json'), 'utf8'));
const plates = m.plates.map((p) => `| \`${p.name}\` | ${p.size.w}x${p.size.h} | ${p.what} |`).join('\n');
const seqs = m.sequences.map((s) => `| \`${s.dir}\` | ${s.frames} | ${s.size.w}x${s.size.h} | ${s.what} |`).join('\n');
const block = `<!-- plates:start -->
## Plates

| plate | size | shows |
|---|---|---|
${plates}

## Sequences

| folder | frames | size | shows |
|---|---|---|---|
${seqs}
<!-- plates:end -->`;
const f = path.join(root, 'README.md');
const readme = fs.readFileSync(f, 'utf8');
const next = readme.includes('<!-- plates:start -->')
  ? readme.replace(/<!-- plates:start -->[\s\S]*<!-- plates:end -->/, block)
  : readme.replace(/## Plates\n[\s\S]*?(?=\n## Other files)/, block + '\n');
fs.writeFileSync(f, next);
console.log('README tables updated:', m.plates.length, 'plates,', m.sequences.length, 'sequences');
