# Characters

The ad's 2 people are 3D cartoon characters in the style of Jack the Yak, the YakShaver mascot.
Hark picked this style on 2026-11-15.

| strip | used in | poses (index 0, index 1) |
|---|---|---|
| `dev` | `problem`: "Developers love a perfect PBI." | typing, a thumbs-up |
| `editor-stressed` | `problem`: "Writing one? Not as much." | a frown at the questions, hands on her head |
| `editor-happy` | `edit`: after the shave | a wide smile, a fist pump |

The developer is a man in a charcoal beanie and hoodie, on pale lilac.
The reporter ("everyone else") is a woman with an auburn bob and a mustard cardigan, on pale peach.

## How they are made

1. Codex image generation drew 1 base image per person, with Jack's character sheet (`../jack/character-sheet.png`) as the style reference only: `poses/dev-base.webp`, `poses/editor-base.webp`.
2. Each pose is an edit of its base image, so the face, clothes, framing and background stay the same: `poses/dev-3.webp`, `editor-frown.webp`, `stressed-2.webp`, `happy-1.webp`, `happy-2.webp`. `dev-1.webp` is a copy of the base (typing).
3. `./build.sh` puts the 2 poses of each strip side by side, 600 x 600 px each: `<strip>.webp` and `<strip>.json`.

## Jack the Yak

`../jack/jack-peek.png` (peeking up, hoof raised) and `../jack/jack-relax.png` (in an armchair) are new images of Jack.
Codex made them from the official character sheet with the brand guide's own prompt: "Use the provided character sheet as the exact character reference. Do not change colors, facial features, proportions, or style."
The Brand Guide V6 (page 16) and yakshaver.ai/media allow new images of Jack made this way.

The 2 people are original art made for this ad and show no real person.
