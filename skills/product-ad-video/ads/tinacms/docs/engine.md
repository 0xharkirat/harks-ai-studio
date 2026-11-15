# Engine guide

`mv/` is a deterministic web app (Vite + TypeScript, plain DOM/CSS/SVG, three.js available).
Every frame is a pure function of time.
Playwright seeks the page to a frame, captures a lossless PNG, and ffmpeg encodes the frames.

## Hard rules

- A frame is a pure function of `t`. Never keep state between frames, never use `Date`, `Math.random`, CSS transitions, CSS animations or `requestAnimationFrame` timing. Use `hash`, `mulberry32`, `noise1` from `engine/anim.ts` for randomness.
- Build the DOM once in `setup()`. In `update()`, only change styles and text (`css()`, `setText()` from `engine/dom.ts`). Avoid layout thrash: animate `transform`, `opacity`, `filter`, `clip-path`.
- Load every image in `setup()` and `await` it (`img(url)` from `engine/assets.ts`), so nothing pops in half-decoded.
- Design units are the cut's size: 1920 x 1080 for 16:9, 1080 x 1920 for `vertical`. Read `W`, `H`, `portrait` from the setup context; never hard-code 1920 where the scene must also work in portrait.
- Portrait safe zone (Meta Reels): keep text and logos out of the top 14%, the bottom 35% and 6% on each side. Landscape: 6% title-safe margin.
- The music grid is 120 BPM: beat 0.5 s, bar 2.0 s (`engine/time.ts`: `at(bar, beat)`, `BEAT`, `BAR`). Cuts land on downbeats, accents on beats.

## Files

- `src/engine/stage.ts`: `SceneDef`, `SceneInst`, `Frame`, `Entry`, `Cut`. Read it first.
- `src/engine/anim.ts`: `seg`, `win`, `track`, `spring`, `ease.*` (`snap` is the house entrance ease), `lerp`, `clamp`, `hold`, `hash`, `noise1`, `drift`.
- `src/engine/dom.ts`: `el`, `box`, `svg`, `css`, `tf` (transform builder, degrees), `setText`, `setHTML`.
- `src/engine/audio.ts`: `f.audio.pulse('kick', f.t, decay)`, `f.audio.last(name, t)`, `f.audio.hits(name)`, `f.audio.level('master', t)`. Until the music lands it falls back to a plain grid.
- `src/brand/tokens.ts`: colours `C`, gradients `GRAD_ORANGE`, `GRAD_WASH`, shadows `SHADOW`, code colours `SYN`.
- `src/brand/fonts.ts`: `FONT.head` (IBM Plex Sans, headings, weight 600), `FONT.ui` (Inter), `FONT.mono` (IBM Plex Mono, as on tina.io).
- `src/brand/logo.ts`: `await logo('extended' | 'llama' | 'llama-white' | 'icon', color?)` returns the official SVG markup. Never redraw the logo or the llama.
- `src/ui/text.ts`: `Headline` (kinetic words, `*emphasis*` gets the orange gradient), `eyebrow`.
- `src/ui/code.ts`: `Code` (syntax-highlighted code with a typing reveal: `update(chars, caret, highlightLines)`), languages md, ts, graphql, json, diff, sh.
- `src/ui/kit.ts`: `WashBg` (light world), `NavyBg` (dark world), `Win` (app/browser window with sheen), `Cursor` + `pathAt`, `EditBox` + `rectAt` (the guide motif), `Pill` (the `npx create-tina-app@latest` command), `image`, `sticker` (llama reaction heads), `bubble` (chat message), `popIn`.
- `src/scenes/open`, `src/scenes/title`: reference scenes. Copy their structure.
- `src/scenes/dog`: the corner logo (DOG). `DOG(W, H, portrait)` gives its rect.
- `src/cuts/*.ts`: every file here is a cut (`?cut=<file name>`). `anthem.ts` is the main one.

## Assets (served by the dev server)

- `/assets/brand/*.svg|png`: logos, the tina.io media-kit backgrounds, flat illustrations (`creator.svg`, `developer.svg`, `visual-editor.svg`, `npx-command.svg`).
- `/assets/llama/*.png`: official llama art: `Peek-Llama.png` (peeking over an edge; the white strip at the bottom must hide behind a panel or the frame edge), `Relax-Llama.png` (rocking chair), `head-{happy,thinking,unimpressed,surprised}.png` (reaction heads), `tina-llama-working-laptop-table.png`, `flyingTina.png`, `tina-llama-superhero.webp`.
- `/assets/fonts/*`. The TinaCMS 3D llama models and the customer site screenshots stayed out of the public studio.
- `/plates/*`: real TinaCMS UI captures with `<name>.boxes.json` and `manifest.json` (in production; check `plates/README.md`).
- `/music/<cue>.wav`, `/music/<cue>.timing.json`: the soundtrack (in production).

## Check your work

The dev server runs on `http://localhost:5190` (the scripts start a private one if it is down).
Preview in a browser: `http://localhost:5190/?cut=anthem&t=16` (space plays, arrows step beats).

```bash
cd mv
npx tsc --noEmit
node render/still.mjs --cut anthem --t 16.0,17.5 --out <scratch dir>
node render/sheet.mjs --cut anthem --from 16 --to 24 --step 0.25 --cols 6 --cell 400 --out <scratch dir>/sheet.jpg
node render/sheet.mjs --cut anthem --from 23.6 --to 24.4 --step 0.0167 --cols 10 --cell 240 --out <scratch dir>/cut.jpg
```

Look at every image you render (Read tool). Check fast moves frame by frame. Check the handoff into the next scene.

The browser preview draws each frame as fast as it can, so heavy scenes skip frames there.
Do not review glitches in it, and do not send it to a reviewer.
For a review copy, render a draft of the exact output.
The draft has every 2nd frame (30 fps) at 1080p, with the cut's music.
It takes about 5 minutes for the 65 s anthem, against about 30 for the full render and the master.

```bash
node render/render.mjs --cut anthem --draft          # ../out/anthem-draft.mp4
```

After the review passes, render only the changed time ranges (`--from`, `--to`) at full quality.
Splice them into the last full render with the ffmpeg concat demuxer (`inpoint`/`outpoint`, `-c copy`), then run `render/master.mjs`.
ProRes frames are all key frames, so the splice is frame-exact.
To test a scene alone, add a cut file `src/cuts/wip-<scene>.ts` with just your scene (and its neighbours).
