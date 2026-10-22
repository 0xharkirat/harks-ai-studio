# Scene library

The For Curious Beings design system: 1 library of Remotion scenes, with a theme switch and native layouts for 16:9 (1920x1080) and 9:16 (1080x1920).
One script renders in any style with one flag, because a theme is a set of tokens and a scene only reads tokens (`channel/style_test.md` in the factory repo).

- [Start a video](#start-a-video)
- [Pick a theme](#pick-a-theme)
- [Render, 16:9 and 9:16](#render-169-and-916)
- [Themes and tokens](#themes-and-tokens)
- [Layout: reflow, not shrink](#layout-reflow-not-shrink)
- [Type scale](#type-scale)
- [Scenes](#scenes)
- [Channel mark](#channel-mark)
- [Gallery and checks](#gallery-and-checks)
- [Licences and packages](#licences-and-packages)
- [Known gaps](#known-gaps)

## Folder

| Path | What |
|---|---|
| `src/` | The library. `new-video.sh --channel` copies it to a video's `src/lib/` |
| `src/core/` | Tokens and mechanics: `theme.ts`, `type.ts`, `layout.tsx`, `paper.tsx` (surface, boil, grain), `ink.tsx` (rough.js), `ui.tsx` (text, plate, leader line), `marks.tsx`, `measure.ts`, `motion.ts`, `fonts.ts` |
| `src/scenes/` | The scenes and overlays (see [Scenes](#scenes)) |
| `src/geo/geo.ts` | Natural Earth land and borders, great circles, the flat projection |
| `template/` | Files laid over the done-video template by `new-video.sh --channel`: `package.json` and lock file, `Root.tsx`, `Video.tsx`, `scenes.tsx`, `script.json` |
| `examples/beach-beat/` | The 14-second demo beat as `script.json` and `scenes.tsx` |
| `gallery/` | A contact sheet of every scene in every theme, for checks |

## Start a video

```sh
scripts/new-video.sh --channel 12-sail-line     # from the studio folder
cd videos/12-sail-line/project
```

A channel video is faceless: the camera box is off.
The voice mode is the config's (draft, final, or recorded), as for any video.
The library is copied into `src/lib/`, so a video is a snapshot and a later change never alters an old render.
Take a newer library on purpose with `dart ../../../scripts/scenes.dart sync`.

Write `src/scenes.tsx`: 1 component per scene id in `script.json`, with a capital first letter (`intro` -> `Intro`), built from the library.
`examples/beach-beat/scenes.tsx` is a complete example.
The scene gets `cue` (the frame each line starts, from the voice timings), so the picture follows the narration.

## Pick a theme

The theme is named in `script.json`, on the first scene (`"theme": "B"`), and a render flag overrides it.

| Where | How | Wins |
|---|---|---|
| Render flag | `dart ../../../scripts/render.dart --theme B`, or Remotion's `--props='{"theme":"B"}'` | first |
| `script.json` | `"theme": "B"` on a scene; `layout.dart` copies it to `layout.json`. 1 theme per video: a different one on a later scene is ignored, with a warning | second |
| Default | A | last |

A name works as well as a letter: `A`/`clean`, `B`/`sketch`, `C`/`clean-guide`, `D`/`flat`.
Scenes never name a theme. Only `ThemeRoot` (in `Video.tsx`) reads the flag.

## Render, 16:9 and 9:16

```sh
dart ../../../scripts/render.dart --theme A             # out/video-A.mp4, 1920x1080
dart ../../../scripts/render.dart --theme B --tall      # out/video-B-tall.mp4, 1080x1920
dart ../../../scripts/render.dart --theme C --still 330 # one frame, for a check
```

Flags: `--out file`, `--no-music`, `--no-captions`, `--frames a-b`.
`--tall` renders the `VideoTall` composition: every scene reads the 1080x1920 frame and lays out for it. It is not the 16:9 picture scaled down.

A Short comes from `short.dart`, as for any video (`README.md`, Shorts).
For a channel video it now renders natively: the same scene components at 1080x1920, in their 9:16 layouts, with the hook line above and the captions below.

```sh
dart ../../../scripts/short.dart beat --theme B
```

The old path shrinks a 1920x1080 stage into the 9:16 frame, so the text is small on a phone. The native path keeps every label at the phone-readable size (the [type scale](#type-scale)).
The hook line and the captions look the same in every theme, because the style test changes only the visual treatment.
The Short reserves a top band for the hook and a bottom band for the captions through `FrameReserve`; a scene's `Headline` draws nothing then, because the hook is the headline.

## Themes and tokens

| Theme | Name | Lines | Paper | Guide | State |
|---|---|---|---|---|---|
| A | Clean data | clean | none, soft vignette | off | complete |
| B | Sketch + guide | hand-drawn, boiling at 12 fps | ruled paper, grain, fibres | always on | complete |
| C | Clean data + guide | clean | none, soft vignette | at story turns, as a sticker | complete |
| D | Flat | clean | none | off | stub: palette, font and plate only |

Tokens, in `src/core/theme.ts`:

| Token | Meaning |
|---|---|
| `palette` | Background, text, ink, accent, plate colours, map and globe colours, marker colours, chart colours, categorical series |
| `line` | `boil` (redraw 12 times a second), `roughness`, `weight`, `wobble` (px of displacement in the boil filter) |
| `paper` | `kind` (`none` or `ruled`), grain, fibres, vignette |
| `fonts` | Display, body, number, serif; `boost` (hand fonts are multiplied up, never down); `caps` for tags |
| `ease` | `enter`, `move`, `pop` (the sketch theme overshoots) |
| `guide` | `on`, `mode` (`always` or `turns`), `sticker`, `boil` |
| `fill` | `land`: `solid`, or `hatch` for a pencil hatch with an offset marker wash |
| `plate` | `card` (dark rounded card) or `marker` (yellow box with a hand-drawn outline) |

Boiling lines are 2 things: an SVG displacement filter over the ink layer of a scene (`Boil`, 4 seeds, 12 per second), and rough.js drawings (the guide, bars, plate outlines) that re-seed on the same beat.
A clean theme draws neither, so its lines never move.

## Layout: reflow, not shrink

Every scene reads the frame size through `useLayout()` and chooses a layout. The unit `u` is 1 at 1080 px on the short side, so strokes and gaps scale with the frame.

| | 16:9 | 9:16 |
|---|---|---|
| Safe area | 96 px sides, 60 px top, 72 px bottom | 64 px left, 96 px right, 150 px top, 380 px bottom (Shorts title and buttons) |
| `main` (where the map, globe, or diagram fits) | the right 62 % | the band between the headline and the stat plate |
| `stat` zone (counter plate) | top left | bottom left |
| `headline` zone | left column, under the stat plate | full width at the top, centred |
| `guide` zone | bottom right, 300 px | above the stat plate, right |
| `mark` slot | top right of the safe area | top left, above the content |

The map camera fits the route into `main`, so the HUD plates never cover it. Label placement (`placeLabel`) tries 6 directions at 3 distances, keeps labels inside the frame, and keeps them off the HUD plates, the guide, the mark, and the route; a tick label that has no free place is left out.

## Type scale

1 scale, in 1.25 steps, from a minimum that reads on a phone: 12 px at a frame width of 360 px.
No text in the library is set below it. Scenes ask for a role, never a number.

| Role | 16:9 | 9:16 | Use |
|---|---|---|---|
| `tag` | 64 | 40 | Source tags, tick labels, country names, legends. The minimum |
| `label` | 80 | 50 | Place names, kickers |
| `body` | 100 | 63 | Subtitles of a title, bar labels |
| `heading` | 125 | 78 | Chart titles, counters (16:9), headlines |
| `title` | 156 | 98 | Titles, headlines |
| `display` | 195 | 122 | Counters (9:16), title card |
| `hero` | 244 | 153 | The number reveal |

The sketch theme multiplies every size by 1.12 because hand fonts look small. `fit()` picks the largest role that wraps in a given number of lines.
`dart scripts/scenes.dart check` fails on a literal `fontSize` anywhere but `core/type.ts` (a glyph such as the "?" in a badge says `type-exempt`).

## Scenes

Overlays (`Headline`, `GuideSlot`, `ChannelMark`, `LeaderLabel`) go on top of a scene inside one `<AbsoluteFill>`. Times are scene-local frames.

| Scene | Props that matter | Notes |
|---|---|---|
| `TitleCard` | `title`, `kicker`, `subtitle`, `at` | 16:9 left-aligned, 9:16 centred. The title takes the largest role that fits 3 lines |
| `NumberReveal` | `value`, `unit`, `label`, `source` (required), `at`, `countFrames` | Channel rule 7: the first 10 seconds show 1 computed number with its source. The number counts up in fixed digit cells |
| `WorldMap` | `route` (from and bearing, or from and to), `start`, `t` (timeline), `ticks`, `closest`, `vehicle`, `endMark` | Great-circle route, distance counter, tick labels, closest-approach callout (the camera moves in on it) |
| `GlobeRoute` | as `WorldMap`, without `closest` | Orthographic globe, a true great circle clipped at the limb |
| `LeaderLabel` | `at`, `lines`, `dir`, `show` | A label with a leader line. `placeLabel()` gives the geometry for a scene that draws its own SVG |
| `OrbitDiagram` | `orbits` (`altitudeKm`, `periodH`, `count`), `flyby` (`closestKm`, `vInfKmS`), `title`, `hoursPerSecond` | To scale: Earth, rings at their real distance from the centre, satellites at their real relative speeds, a hyperbolic flyby path |
| `Chart` | `kind: 'bar'` with `data`; `kind: 'scatter'` with `points`, `xLabel`, `yLabel`; `title`, `source` | Horizontal bars keep every label at the minimum size or above; a long label moves above its bar in 9:16 |
| `Guide`, `GuideSlot` | `moments: [{at, emotion}]`, `turns` | 7 emotions: happy, excited, determined, look, wonder, confused, proud. 1 emotion per moment, with a squint before a change and a hop after |
| `ChannelMark` | `show` | See below |
| `Headline` | `text`, `at` | The line the narration asks or claims, in the layout's headline zone |

The map and globe timeline is `{pin, aim, boat, routeStart, routeEnd, question, focus, end}`; `examples/beach-beat/scenes.tsx` derives it from the line cues.

## Channel mark

`ChannelMark` sits in the safe area and is the same in every theme.
`scripts/scenes.dart brand` (run by `new-video.sh --channel` and by `sync`) looks in `~/youtube-factory/brand/export/` (or `FCB_BRAND_DIR`) for a file named like a `mark`, `logo`, `icon` or `brand` (svg, png, or webp), or else the only image there.
It copies the file to `public/brand/` and writes `src/lib/brand.json`.
With no file, the slot shows a placeholder: a ring with a 4-point star, no text. When the logo lands in `brand/export/`, run `brand` and the slot picks it up.

## Gallery and checks

`gallery/` renders every scene in every theme and both orientations. In a video project that has the library:

```sh
cp -R ../../../scenes/gallery src/gallery
pnpm add -D @remotion/bundler@<remotion version> @remotion/renderer@<remotion version>
node src/gallery/render-gallery.mjs out/gallery A,B,C        # stills of every scene
```

The gallery uses sample data and says so on screen. Nothing in it is a claim for a video.
`dart scripts/scenes.dart check` runs the type scale lint.
To check rule 11 of `.claude/skills/critic-review/rubric.md`, scale a still to 360 px wide and read every label.

## Licences and packages

| Item | Licence |
|---|---|
| Inter, Source Serif 4, Caveat Brush, Patrick Hand, Fredoka | SIL Open Font License 1.1, from the `@fontsource/*` packages (MIT wrappers) |
| `roughjs` (hand-drawn lines) | MIT |
| `d3-geo`, `d3-interpolate`, `topojson-client`, `world-atlas` | ISC |
| Natural Earth land and borders (inside `world-atlas`) | Public domain |
| React | MIT |
| Remotion | Remotion licence (the studio already uses it) |

New in this library, against the done-video template: `@fontsource/inter`, `@fontsource/source-serif-4`, `@fontsource/caveat-brush`, `@fontsource/patrick-hand`, `@fontsource/fredoka`, `roughjs`, `d3-geo`, `d3-interpolate`, `topojson-client`, `world-atlas`, and their `@types/*`.
Ideas from MIT projects are credited in the files that use them: lemo-opuscar (camera and labels), mg-styles-15 (lock brackets, cue sheet), ClaudeAnimationBase (boil, the guide's emotion rig).

## Known gaps

- Theme D is a stub: the palette, font and plate colour only. No flat drawings.
- The channel mark is a placeholder until the logo is in `brand/export/`.
- `WorldMap` and `GlobeRoute` draw a route that starts at a point; a map with several routes or a region fill is not built.
- The globe has no closest-approach callout. `OrbitDiagram` draws a hyperbola from perigee and approach speed, not a full n-body path.
- Country names on the map come from Natural Earth, in English only. Disputed borders show as Natural Earth draws them.
- In a native Short the hook line sits on the map with a heavy outline and no plate, so it can cross country names. The captions band below the visual is clear.
- The tick label of a route can sit under the vehicle badge for a moment while the boat passes it.
- The sketch theme renders in the same time as theme A (about 50 s for the 13.6 s demo), but its files are 4 to 5 times bigger: 40 MB against 8 MB at 16:9, because paper grain does not compress.
