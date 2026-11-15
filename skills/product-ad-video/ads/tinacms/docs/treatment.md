# TinaCMS ads: director's treatment

A family of music-driven motion-graphics ads for TinaCMS, built in code and rendered frame by frame.
The idea comes from Fuma Nama's Fumadocs music video (`fumadocs-mv`), but the job here is different: these are ads.
Every frame must sell one idea in a few seconds, with the sound on or off.

This document is the creative contract.
The music contract is `docs/music-spec.md`.
The per-cut scene scripts are in `docs/cuts/`.
The marketing research behind the rules is `docs/marketing-brief.md`.

## 1. The one idea

**TinaCMS puts a visual editor on top of the Markdown in your Git repo.**
Developers keep Markdown, Git and code.
Editors click the page and change it, live.
Every edit is a commit.

Campaign line: **"Edit your site. Visually."**
Brand line (tina.io): **"The Git-powered CMS for modern teams."**
End tag (tina.io homepage, the brand's humour): **"Sites, Docs and Llamas. No Dramas."**
One call to action, always the same: the command pill **`npx create-tina-app@latest`** and **tina.io**.

## 2. Ad rules (from the marketing brief, non-negotiable)

1. Hook in the first 2 seconds with product value, not with a logo sting. At least 2 shots in the first 5 seconds.
2. The brand appears in the first 5 seconds (logo hit), then a semi-transparent corner logo (DOG) stays until the end card.
3. Design for sound off first. The story reads from pictures and short on-screen lines alone. The music makes it better, it never carries meaning.
4. Short lines: 2 to 5 words per card, big and high-contrast, on screen at least 1.5 s. The call to action stays at least 4 s.
5. One call to action. No second ask.
6. Show the real TinaCMS UI (plates captured from a real Tina site) wherever we claim a feature. Stylise around it, never fake it.
7. Keep text inside the title-safe area: 6% margin on 16:9; on 9:16 keep the top 14%, bottom 35% and sides 6% free of text and logos.
8. Humour comes from the llama (official art only, never redrawn or recoloured) and from relatable developer pain.
9. Claims must be true: 13.8k GitHub stars (2026-10-18), Apache 2.0, Markdown/MDX/JSON, Git-backed, GraphQL API, TypeScript schema, works with Next.js and Astro.
10. No third-party logos or customer quotes. Framework names are set in type, not logos.

## 3. Style bible

### Palette (tina.io tokens, `mv/src/brand/tokens.ts`)

| token | hex | use |
|---|---|---|
| orange | `#EC4815` | THE accent: the edit box, the cursor, active states, the keyword |
| orange gradient | `#FF724B` to `#D13F13` | the one emphasised word per headline, the CTA |
| blue | `#0084FF` | links, selection, secondary accent |
| seafoam | `#93E9BE` | success, strings in code, the "saved" state |
| navy | `#241748` | the developer world (dark scenes) |
| ink | `#1C1B2E` | the darkest plane, code editor |
| bg | `#F8FAFC` | the editor world (light scenes) |
| wash | `#53E9DD` to `#4BA8FF` | the tina.io page wash: bursts at the drops |

Two worlds alternate: the **developer world** is dark navy with code; the **editor world** is light, airy and colourful.
The film's turn is the moment the two worlds meet: code on one side, the live page on the other, in sync.

### Type

- Headlines: IBM Plex Sans SemiBold (600), tight tracking (-0.035em), sentence case, a full stop at the end ("Edit your site. Visually.").
- One keyword per headline gets the orange gradient (the tina.io `{curly}` rule).
- UI and labels: Inter. Code: IBM Plex Mono (what tina.io serves).
- Never more than 2 type sizes on screen at once, plus small labels.

### Motifs (they make every cut feel like one campaign)

1. **The edit box.** Tina's click-to-edit outline: an orange 2 px rounded rectangle with 4 corner handles and a small tag. It is the film's guide: it snaps onto the thing that matters, on the beat, with a spring. It frames the headline, then the image, then a block, and at the end it frames the command pill. *Follow the box.*
2. **The render.** Raw Markdown glyphs (`#`, `**`, `-`, `>`, `![]()`, `---`) snap into their rendered form. This is the product's magic and the title transition.
3. **The commit line.** A thin Git line with dots. Each save drops a dot with a bright ping.
4. **Tina the llama.** Official art only: peeking over a panel edge, reaction heads (happy, thinking, unimpressed, surprised), relaxing in the rocking chair at the end ("No Dramas").
5. **The wash.** The mint-to-sky gradient floods the frame at each drop.

### Motion

- Everything lands on the grid (120 BPM: beat 0.5 s, bar 2 s). Cuts on downbeats, accents on beats, micro-motion on 8ths.
- Entrances are fast with a soft landing (`snap`, `outExpo`, springs with a small overshoot). Exits are faster than entrances.
- Holds are never dead: slow push-ins, parallax, a breathing edit box, drifting light.
- UI panels may tilt in 3D only as solid objects: border, soft blue shadow, a moving sheen. Otherwise keep things flat and move them in the plane.
- Smoothness is non-negotiable: no pops, no 1-frame jumps (unless a deliberate flash cut), no shimmering thin lines.

### Craft checklist (ask for every shot)

What is the one thing the viewer must notice? Is it readable with the sound off, on a phone? Which Tina feature does it prove, with real UI? What moves on the downbeat, on each beat? What carries the eye into the next shot? Would it look good as a still in the ad's thumbnail?

## 4. The cuts

| cut | length | ratio | music | audience | idea |
|---|---|---|---|---|---|
| `anthem` | 76 s | 16:9 | `anthem3` | everyone (YouTube, site hero, events) | the full story: Markdown pain, visual editing, blocks, Git, developers, proof, CTA |
| `thirty` | 30 s | 16:9 | `thirty` | YouTube / LinkedIn | hook, visual editing, blocks, Git, CTA |
| `fifteen` | 15 s | 16:9 | `fifteen` | pre-roll, LinkedIn | live edit, logo, 4 features, CTA |
| `vertical` | 30 s | 9:16 | `thirty` | Shorts, Reels, LinkedIn mobile | the 30 s story re-framed for a phone |
| `dev` | 45 s | 16:9 | `dev` | developers | code first: CLI, schema, GraphQL, then "your editors get this", Git, CTA |

Scene-by-scene scripts: `docs/cuts/<cut>.md`.
