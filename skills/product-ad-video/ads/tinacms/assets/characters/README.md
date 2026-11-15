# Characters

The anthem's two people are 3D cartoon characters in the style of the TinaCMS llama.
They replace the v1 photos, which looked too AI-generated in review.

| loop | used in | poses |
|---|---|---|
| `dev` | `problem`: "Developers love Markdown." | typing, a smug look at the camera, a thumbs-up |
| `editor-stressed` | `problem`: "Content editors? Not so much." | a frown at the error, hands on her head, eyes shut in despair |
| `editor-happy` | `edit`: after the llama's answer | a wide smile, a fist pump, a happy laugh |

## How they are made

1. Codex image generation (`image_gen`) drew one base image per character from a text prompt, with the llama art as the style reference: `poses/dev-base.webp` and `poses/editor-base.webp`.
2. Each key pose is an edit of its base image, so the face, hair, clothes, framing and background stay the same: `poses/<prefix>-<n>.webp`.
3. `./build.sh` puts the poses of each loop side by side in one strip: `<loop>.webp`.
4. `<loop>.json` sets the loop: `frames` (poses in the strip), `frameMs` (real milliseconds per pose) and `order` (strip indices).

Codex can also return animated GIFs (`features.image_generation_animation`, Codex 0.168 and later).
On 2026-11-07 the server refused it for this account ("GIF output is not enabled for this request").
So the loops play key poses, one per beat (600 ms at 100 BPM), with a small bounce on each change (`mv/src/ui/character.ts`).

The characters are original art made for this ad and show no real person.
