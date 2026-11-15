# Cuts `thirty`, `fifteen`, `vertical`, `dev`

These cuts reuse the anthem's scenes with different lengths and props.
A scene that appears here must take its key times from props (with the anthem values as defaults) and must lay out correctly at 1080 x 1920 when `portrait` is true.
Times are cut seconds; the scene's local time starts at 0 at its start.

## `thirty`: 30 s, 16:9, music `thirty`

| time | scene | props / notes |
|---|---|---|
| 0-2 | `edit` (variant `hook`) | the real editor with the headline already changing live as the field types; the edit box on the headline; no words. Shot change at 1.0 (push in). |
| 2-6 | `title` | logo impact at 2.0; line "Edit your site. *Visually.*"; logo flies to the DOG at local 3.5 |
| 6-14 | `edit` (variant `full`, `after`) | the hook already typed the headline, so this pass hops Tina's real hover states, then types the TAGLINE: "Click anything." / "Edit it." / "See it live." / "No code. No tickets." |
| 14-20 | `blocks` | 6 s version: explode, 2 reorders, add a block, collapse on 19.5 |
| 20-24 | `git` | 4 s version: commit pings at 20, 21, 22, 23; "Every edit is a *commit.*" |
| 24-30 | `cta` | 6 s: logo, pill types at 24.5, "Copied" at 26.0 (sonic logo), tina.io, the llama, hold |

## `fifteen`: 15 s, 16:9, music `fifteen`

| time | scene | props / notes |
|---|---|---|
| 0-2 | `edit` (variant `hook`) | as in `thirty` |
| 2-4 | `title` | logo impact at 2.0; line "Edit your site. *Visually.*" at local 0.5 and 0.8; logo flies to the DOG at local 1.6 |
| 4-6 | `edit` (variant `flash`) | one gesture on the tagline (the hook did the headline): hover, click, the field types, the page changes; word "Click to *edit.*" |
| 6-8 | `blocks` (variant `flash`) | one reorder + one new block; word "Build with *blocks.*" |
| 8-10 | `git` (variant `flash`) | save, one commit ping at 8.0 and one at 9.0; word "Every edit is a *commit.*" |
| 10-15 | `cta` | 5 s: logo at 10.0, pill types at 10.3, "Copied" at 11.0 (sonic logo), tina.io, hold |

## `vertical`: 30 s, 9:16 (1080 x 1920), music `thirty`

Same timeline as `thirty`.
Every scene uses its portrait layout: one column, the UI cropped tighter and zoomed in, headlines larger relative to width (about 110 to 130 px), stacked lines.
Keep text and logos out of the top 14% (0-269 px), the bottom 35% (1248-1920 px) and 6% on each side (65 px).
The DOG sits top-right just below the 14% band.

## `dev`: 45 s, 16:9, music `dev`

| time | scene | props / notes |
|---|---|---|
| 0-4 | `terminal` | a terminal types `npx create-tina-app@latest` on 16ths; Enter at 3.0; the real create-tina-app prompts and output scroll fast 3.0-3.5; stop 3.5-4.0 (black, caret only) |
| 4-6 | `title` | logo impact at 4.0; line "The *Git-powered* CMS."; logo flies to the DOG at local 1.6 |
| 6-12 | `devs` (part `schema`) | "Defined in *TypeScript.*": `tina/config.ts` types; each field line emits a real form field |
| 12-20 | `devs` (part `graphql`) | "Queried with *GraphQL.*" / "Fully *typed.*": a query types, the typed result fans out; a TypeScript autocomplete popup |
| 20-28 | `edit` (variant `full`) | DROP at 20.0: "Your editors get *this.*" first, then "Click anything." / "Edit it." / "See it live." |
| 28-36 | `git` | 8 s, as in the anthem, commit pings at 28, 30, 32, 34: "Every edit is a *commit.*" / "Reviewed like *code.*" (a pull request card) |
| 36-40 | `devs` (part `stack`) | framework names on beats: "Next.js", "Astro", "React", then "Open source. *Apache 2.0.*" |
| 40-45 | `cta` | 5 s: logo at 40.0, pill types at 40.3, "Copied" at 41.0 (sonic logo), tina.io, hold |

## `six`: 6 s bumper, 16:9, music `six`

| time | scene | props / notes |
|---|---|---|
| 0-1.5 | `edit` (variant `hook`) | the headline types live in the real editor |
| 1.5-6 | `cta` with `line` | impact at 1.5; "Edit your site. *Visually.*" between the logo and the pill; "Copied" on the sonic logo at 3.0; the call to action holds 4 s |
