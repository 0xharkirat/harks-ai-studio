# Captions

The ads have no voice, so the captions carry the on-screen lines, timed to when each line is visible.
`extract.mjs` samples a cut in the browser (30 samples per second) and records when each headline, the typed command, the stack line, the Apache pill and the star counter are on screen.
`srt.dart` turns the samples into plain-text SRT files.

```bash
cd mv
for c in anthem thirty fifteen vertical dev six; do node render/captions/extract.mjs $c --step 2 > /tmp/cap/$c.json; done
dart render/captions/srt.dart /tmp/cap ../out/deliver
```

To build only some cuts, add their ids: `dart render/captions/srt.dart /tmp/cap ../out/deliver anthem`.
A line longer than 32 characters breaks at the space nearest its middle.
