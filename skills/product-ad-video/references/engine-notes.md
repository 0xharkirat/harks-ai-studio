# Engine notes

These are facts about the engine in `REF` (the skill's `ads/tinacms` folder) that the skill's steps need.
I checked each one against the code on 2026-11-15.

## Contents

- [Which values win](#which-values-win)
- [The copy list](#the-copy-list)
- [The brand files](#the-brand-files)
- [Demo text in the scenes](#demo-text-in-the-scenes)
- [A work cut](#a-work-cut)
- [The scene props that passed](#the-scene-props-that-passed)
- [Characters](#characters)
- [Plates](#plates)
- [A music cue](#a-music-cue)
- [The calm recipe](#the-calm-recipe)
- [The foley file](#the-foley-file)
- [The sync check](#the-sync-check)
- [The QR code](#the-qr-code)

## Which values win

`docs/workflow.md` and `docs/engine.md` are older than the passed film.
Where they give other values, use the values of the passed film:

| item | workflow.md or engine.md | the passed film |
|---|---|---|
| tempo | 120 BPM | the 120 BPM design grid, played at 90 BPM (`speed: 3/4`) |
| the lossless render | ProRes at 60 fps | lossless at 30 fps (`--fps 30`) |
| the master | -14 LUFS, -1 dBTP | -18 LUFS, -2.4 dBTP |
| a review draft | about 5 min | about 7 min for 76 s |
| the master | about 30 min | about 15 min for 76 s |
| the music spec and cut-down docs | asked for | not needed |

## The copy list

Copy these paths from `$REF` into the new project:

- `mv/`: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/engine/`, `src/ui/`, `src/brand/`, `src/cuts/index.ts`, `render/`.
- `mv/src/scenes/`: `open`, `title`, `problem`, `edit`, `git`, `devs`, `proof`, `cta` and `dog`. These 9 scenes made the passed film, and they hold its glitch fixes.
- `mv/src/cuts/anthem.ts`: the passed timeline. Copy it as `mv/src/cuts/<cut>.ts`, and change each text prop and the `music` cue name.
- For TinaCMS only: `assets/brand/`, `assets/fonts/` and `assets/llama/`. They hold every file that the brand code expects, the white llama and the 4 reaction heads too.
- `music/`: `pyproject.toml`, `uv.lock`, `.python-version`, `.gitignore`, `src/render.py`, `src/engine/`, `src/song/`.
- `music/cues/anthem3.foley.json`: the passed film's sound list, as an example of the format.
- `music/assets/sfx/README.md` and `scream-comical.wav` (CC0). The SSW TV sounds are not in `$REF`: they live in the user's sound folder (see "The foley file").
- `plates/capture/` and `plates/README.md`: an example of UI capture.
- `assets/characters/build.sh`.
- `.gitignore`.

Then change the name in `mv/package.json` and the title in `mv/index.html`.

## The brand files

- `mv/src/brand/tokens.ts` exports `C`, `GRAD_TITLE`, `GRAD_ORANGE`, `GRAD_WASH`, `GRAD_BLUE`, `SHADOW` and `SYN`.
- `mv/src/brand/fonts.ts` exports `FONT` and `loadBrandFonts`.
- `mv/src/brand/logo.ts` exports `logo` and `logoSvg`.

Keep every export name and every key of `C`, and change only the values.
`src/ui/` and the scenes read keys such as `C.orange`, `C.navy`, `C.mint` and `C.sky1` by name.
So `C.orange` holds the product's accent colour, even when that colour is not orange.

| keys of `C` | job in the film |
|---|---|
| `orange` and its shades | the accent: the edit box, the cursor, the 1 gradient word |
| `navy`, `navy2` | the dark world (the developer's code and Git) |
| `ink`, `ink2`, `text`, `text2` | headings and body text |
| `bg`, `white`, `line` | the light world, panels and borders |
| `mint`, `sky1`, `sky2`, `sky3` | the wash gradient at the drops |
| `blue`, `seafoam` and their shades | links, selection, and the "saved" state |

`SYN` holds the code colours of the editor. It belongs to the engine, so it needs no brand source.

- `logoSvg(name)` maps 5 names to files in `assets/brand/`: `extended`, `llama`, `llama-white`, `icon` and `tinaio`. Point each name at a product file.
- `sticker()` in `src/ui/kit.ts` loads `assets/llama/head-<mood>.png`. Give a file for each mood that the film uses, or do not call `sticker()`.
- `fonts.ts` loads `IBMPlexSans-VF.ttf` and `InterVariable.woff2`. Put the font files that the product's website serves in `assets/fonts/`, and change the `@font-face` lines to match. When a scene asks for a weight that the site does not serve, map it to the nearest served weight.
- When the media kit downloads fail (the tina.io kit returns 403 to `curl`), take the files from the website's own repo: its `public/` folder.
- The render scripts drive Google Chrome (`channel: 'chrome'` in `render/lib.mjs`), so Chrome must be installed.

## Demo text in the scenes

The scenes hold text of the passed film's demo brand, "Fieldnote" by "Larkspur Studio", as constants in the code.
Only some of it is a prop. Find it all with:

```bash
grep -rnE "Fieldnote|Larkspur|Q4 roadmap|PAGE_HEADLINE|Notes your whole team" mv/src/scenes
```

The faded page behind the title is `pageCard` in `title/card.ts`. Its headline is the `pageHeadline` prop of `title` (default `PAGE_HEADLINE`), and the rest of the page is constants in that file.

On 2026-11-15, these files held demo strings: `title/card.ts` (9), `proof/pages.ts` (11), `open/index.ts` (2, plus the front matter `MD` and the file tree `FILES`), `git/plan.ts` (2), `title/index.ts`, `devs/form.ts` and `devs/gql.ts` (1 each).
The `open` and `title` defaults also hold the TinaCMS example lines. Pass `line` in every entry, so no default ships.
Pick a demo brand name that is not in this list.

## A work cut

A cut file in `mv/src/cuts/` is a timeline of scenes. The dev server finds it by its file name.

```ts
import type { Cut } from '../engine/stage';
import title from '../scenes/title';

const cut: Cut = {
  id: 'wip-title',
  title: 'Work cut: title',
  music: '<cue>',      // with no cue yet, the engine plays a plain 120 BPM grid
  duration: 4,         // design seconds
  speed: 3 / 4,        // design seconds per real second: 90 BPM
  W: 1920,
  H: 1080,
  timeline: [{
    scene: title, start: 0, end: 4,
    props: { line: '<campaign line, 1 *gradient* word>', pageHeadline: '<demo page headline>',
             flash: false, logoAt: 0, lineIn: 0.5, lineTimes: [0.5, 0.75, 1.0, 1.5],
             box: false, glyphs: false, toDog: 3.5, dogCorner: 'tl', dogOpacity: 0.8 },
  }],
};
export default cut;
```

The `title` defaults break the review lessons: a white flash, a Markdown glyph burst, the logo at 0.55 s, and a corner logo at bottom right and 50%.
The props above are the passed ones.

Check it with `npx tsc --noEmit`, then `node render/still.mjs --cut wip-title --t 2.6 --out <scratch dir>`.
Look at the image: the product's logo shows, and no text of another brand shows, the faded page behind it too.

- `still.mjs --t` takes real seconds.
- The render scripts reuse a dev server at `MV_URL`, or at `http://localhost:5190`, before they start their own. A server of another project on 5190 renders that project. Stop it, or set `MV_URL` to this project's server.

## The scene props that passed

These are the passed props, in design seconds from the scene start, with the words left out.
They show what each scene can do. The full file is `$REF/mv/src/cuts/anthem.ts`.

| scene | design s | props |
|---|---|---|
| `open` | 0-4 | `fixed: true`, `typeStart: 0.5`, `typeEnd: 2.6`, `lineIn: 1.2`, `line` (2 lines) |
| `title` | 4-8 | as in the work cut above |
| `problem` | 8-22 | `editorsAt: 2.75`, `bubblesAt: 5.0`, `bubbleEvery: 1.5`, `llamaAt: 11.0`, `clickAt: 13.6`; the entry has `post: 0.5` |
| `edit` | 22-30 | `variant: 'full'`, `iris: true`, `irisAt` (the click point on the mascot's answer, stage px), `character: { name: 'editor-happy', at: 1.0, out: 4.85, keys: [[1.0, 0], [4.0, 1]] }`, `loupe: false`, `mediaBox: false` |
| `git` | 30-38 | `saveBox: false`, `pressAt: 1.0`, `cursor: true`, `dark: 6.5`, `commits` at 1.3, 2.75, 4.25 and 6.0, `lines` at 1.35 (out 4.3) and 4.5 (with a `sub` line) |
| `devs` | 38-41 | `part: 'stack'`, `oss: false`, `label`, `lines` at 0.5, 1.0 and 1.5 |
| `proof` | 41-49 | `openLine`, `wallLine` (2 lines), `lockTop: 132`, `hops: []`, `wallWordTimes`, `cast: [4.25, 5.0]` (the 2 character cards) |
| `cta` | 49-57 | `fadeOut: false`, `boxAt: 99` (no edit box), `line`, `agent`, `agentAt: 2.6`, `urlAt: 3.3`, `qrAt: 3.6`, `llamaAt: 4.0`, `qr` (the SVG path) |
| `dog` | 8-49 | `corner: 'tl'`, `opacity: 0.8`, `tones` (light, dark from 28.55, light from 33) |

The cut also has `global: punch([[22, 30], [41, 49]])`: a 0.6% zoom pulse on each kick in the 2 choruses.

## Characters

- `assets/characters/build.sh` puts the poses of 1 strip side by side, 600 x 600 px each, from `poses/<pose>.webp`. It needs `ffmpeg`, `cwebp` and `dwebp`.
- Each strip has 2 poses: index 0 is the typing or base pose, and index 1 is the reaction. The scenes pick a pose on story moments, not on every beat.
- The passed strips: `dev` (typing, then a thumbs-up), `editor-stressed` (a frown at the error, then hands on the head), `editor-happy` (a wide smile, then a fist pump).
- `<strip>.json` holds `{ "frames": 2 }`.
- `build.sh` names the pose files at its end: `dev-1`, `dev-3`, `editor-base`, `stressed-2`, `happy-1` and `happy-2`. Save the poses under these names, or change those 3 `build` lines.

## Plates

The scenes load these plate files by name: `plates/admin-home.webp`, `admin-hero-form.webp`, `admin-media-manager.webp`, `admin-image-after.webp`, `admin-saved.webp`, `site-home.webp`, and the typing sequence `seq-type-tagline/frames.json`.
Capture the new product's UI under the same names, or change the names in the scenes.

## A music cue

- A cue is a function in `music/src/song/cues.py` that returns a `Score`: `Score(name, nbars, file_dur)`. `file_dur` is in design seconds, and `retime` scales it. Leave `kind` at its default.
- `render.py --cue <name>` calls the function by name. Without `--cue`, it renders each name in `CUES`. So add the new name to `CUES`, or always pass `--cue`.
- The copied `cues.py` holds the TinaCMS cues. Read them as examples of chords, patterns and the hook. Remove them from `CUES` when the new cue works.
- Write the score on the 120 BPM design grid. Call `S.retime(4/3)` last. `repeat_span` and `cut_span` come after `retime`, in real seconds (design seconds x `S.time_scale`).
- The `devs` scene is 3 design s (1.5 bars), so the `proof` scene starts on beat 3 of a bar. The passed music writes a 2-bar build, then takes its last 2 beats out with `cut_span`, so the second chorus lands on the `proof` cut.
- The key is A major (`KEY_PCS` in `theory.py`), and `engine/gamesfx.py` writes its notes in that key. Keep A major, or change both files together.
- The sonic logo is `LOGO_NOTES` (offset in seconds, MIDI note) and `LOGO_BLOOM` in `theory.py`. `S.logo(t)` plays it. `S.logo(t, vel=0.8, teaser=True)` plays the teaser. For TinaCMS, keep it. For another product, write new notes, so each brand has its own sound.
- The passed film plays the teaser at design 0.5 s, the logo on the title cut, and the logo again under the end card.
- The render writes `music/out/<cue>.wav`, `<cue>.timing.json` and `<cue>.envelopes.json`.

## The calm recipe

The passed music is calm because `_calm(S, name, chill=True)` in `$REF/music/src/song/cues.py` changed a finished score.
`_calm` edits a TinaCMS score at fixed times, so do not call it on a new cue.
Write a new cue with the same choices from the start:

- No `impact`, `riser`, `stop` or `tom` events.
- No snare roll, fill or clap in the last 2 beats before a drop.
- Crashes at 30% velocity, and sidechain ducks at 30% depth.
- Pads in place of supersaws (cutoff 2200 Hz or lower), a sub bass, and the lead at 70% velocity.
- From the first chorus: the kick on beats 1 and 3, a rim on beat 4, and closed hats only.
- The chords stay open into each drop: no filter sweep and no drum cut in the bar before it.
- After a quiet part, bring the chords and the bass back over about 1.5 s, before the drums.
- A level plan in `S.energy`: a list of (start, end, dB against the loudest section), in real seconds. Keep each step up at 2.5 dB or less, and the whole range at about 6 dB.
- `S.air_db = 1.0`, `S.music_trim = -3.0 + 20 * math.log10(0.8)` (-4.94 dB, the music bed at 80%), `S.target_lufs = -18.0` and `S.ceiling_db = -2.4`.

## The foley file

`music/cues/<cue>.foley.json` is a JSON list of events, in design seconds:

```json
[
  {"t": 0.5, "type": "sample", "vel": 0.75, "file": "sswtv/typing.wav", "gain": -0.5, "offset": 0.02, "span": 2.125, "duck": 2.5},
  {"t": 2.875, "type": "blip", "vel": 0.4, "note": 85},
  {"t": 7.5, "type": "whoosh", "vel": 0.45, "dur": 0.4, "up": true}
]
```

- Each event has `t`, `type` and `vel`. It can also have `pan` (-1 to 1), `duck` (the dB that the music steps back under it) and `hold`.
- The types are `key`, `space`, `click`, `enter`, `thud`, `pop`, `ping`, `blip`, `tick`, `whoosh`, `sample`, `happy`, `magic` and `bubble`.
- The aliases are `error` (thud), `typing` and `keystroke` (key), `mouse` (click), `commit` (ping), `return` and `clunk` (enter), `swoosh` and `slide` (whoosh).
- A `sample` plays a recording, with `offset` (seconds into the file), `span` (design seconds) and `gain` (dB). The engine looks for the file in this order:
  1. the project's `music/assets/sfx/<file>` (the CC0 files);
  2. `$AD_VIDEO_SFX_DIR/<file>`, or `~/.config/product-ad-video/sfx/<file>` when that variable is not set (the SSW TV files, from `scripts/ssw-sounds.sh`).
- When the file is missing, the engine prints 1 warning per file and plays a synthesized stand-in, chosen by a word in the file name:
  - "pop", "click" or "bubble": the synthesized sound of that name;
  - "typing": synthesized keystrokes over the span;
  - any other name: no sound.
- The loader multiplies each time by `S.time_scale`.
- After a `cut_span`, the loader also moves each later event earlier by the cut (`apply_cuts` with `S.cuts`). The passed cue writes its foley in the final picture time and sets `S.cuts = []` after its cuts, so nothing moves twice. Do the same: write each time as the picture shows it, and clear `S.cuts`.

The passed film has these sounds:

- 18 SSW TV pops, 9 SSW TV clicks and 5 typing slices.
- 1 CC0 scream, 3 `happy`, 1 `magic` and 1 thud.
- 5 pings, 8 blips and 5 whooshes.

It does not use `bubble.wav`.
The 9 clicks are each click that the cursor makes on screen: the mascot's answer, the fields in the editor, Save and Copy.
The only CC0 scream in the repo is a woman's voice ("Comical Scream (Woman)"), so the stressed user is a woman, or you find another CC0 voice.

## The sync check

- Pops, clicks, pings and star bursts: each sound starts within 10 ms of the first frame that shows its event. Find the onsets in the rendered WAV with a short script. `numpy` and `soundfile` are in `music/.venv`.
- Typing: start each slice on a keystroke of `typing.wav`. The engine types at a constant rate, so single keys drift by up to about 50 ms. That passed review.

## The QR code

Make it as an SVG:

```bash
uvx --quiet segno --error m --scale 1 --border 0 --dark "#0F172A" --light transparent --output assets/qr/<name>.svg "<url>"
```

Then add `viewBox="0 0 N N"` and `shape-rendering="crispEdges"` to the `<svg>` tag, where N is its width. The scene scales it.

Check that it decodes from a 720p frame of the render:

```bash
ffmpeg -v error -y -ss <t> -i <video> -frames:v 1 -vf scale=1280:720 qr-720.png
uv run --no-project --with opencv-python-headless python -c "import cv2,sys; im=cv2.imread(sys.argv[1]); print(cv2.QRCodeDetector().detectAndDecode(im)[0] or 'NOT DECODED')" qr-720.png
```
