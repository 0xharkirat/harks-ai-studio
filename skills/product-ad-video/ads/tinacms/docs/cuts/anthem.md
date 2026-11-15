# Cut `anthem`: v2, 64.8 s, 16:9, music cue `anthem2`

The full story, for every social platform.
v2 (2026-10-26) answers the review of v1 by 4 SSW reviewers.

## v2

The timeline uses the 120 BPM design grid (54 s) and plays at 100 BPM (`speed: 1 / 1.2`).
Every real time is the design time x 1.2.
The music cue `anthem2` uses the same scale (`Score.retime(1.2)`), so picture and music stay on the beat.

| # | scene id | design time | real time | on-screen words | handoff out |
|---|---|---|---|---|---|
| 1 | `open` | 0-4 | 0-4.8 | "Your content should be in Markdown." | hard cut on the downbeat (no black) |
| 2 | `title` | 4-8 | 4.8-9.6 | logo, "Edit your site. Visually." | the logo flies to the top-left corner |
| 3 | `problem` | 8-18 | 9.6-21.6 | "Developers love Markdown." / "Content editors? Not so much." / llama: "TinaCMS solves it with the best Markdown editor." | the cursor clicks the llama's bubble |
| 4 | `edit` | 18-26 | 21.6-31.2 | "Click anything." / "Edit it." / "See it live." / "Swap an image." | iris from the click; the Save button |
| 5 | `git` | 26-34 | 31.2-40.8 | a cursor clicks Save (27.0), then "Every edit is a commit." / "Powered by GitHub. The best collaboration and version history." | the dark world |
| 6 | `devs` (stack) | 34-38 | 40.8-45.6 | "WORKS WITH" / "Astro." / "Next.js." / "Or bring your own." | the drop |
| 7 | `proof` | 38-46 | 45.6-55.2 | "Free and open source." / "Built for developers. And content editors." with both characters, happy | the logo |
| 8 | `cta` | 46-54 | 55.2-64.8 | logo, "Try TinaCMS today.", `npx create-tina-app@latest`, tina.io, "Sites, Docs and Llamas. No Dramas." | end |

What changed from v1, by review note:

| note | change |
|---|---|
| 1. Too fast (watched at 0.75x and 0.9x) | the whole film and its music play at 100 BPM instead of 120 (0.83x) |
| 2. 0:00 needs 0.5 s of breathing room | 0.6 s of still editor and blinking caret before the first keystroke |
| 3. 0:03 blank gap felt like a bug | no black stop: the line cuts straight to the logo |
| 4. "Editors" to "Content editors" | in `problem` and `proof` |
| 5. A developer and a stressed content editor | 2 animated 3D characters in the llama's style (`assets/characters/`), 3 key poses per loop, one per beat; the photos of the first v2 render looked too AI-generated |
| 6. Pop sound for each pop-up (SSW rule "use audio cues") | soft pops on the characters, chat requests, question marks, the llama's line and the framework names |
| 7. Llama: "TinaCMS solves it with the best Markdown editor" | the speech bubble, 2 lines |
| 8. The content editor happy and smiling | her happy loop (smile, fist pump, laugh) pops in under the edited headline |
| 9. Logo missing at 0:17, wanted top left | the DOG sits top left at 80% opacity, from the title to the proof |
| 10, 11. 0:29 blocks too complicated; a GitHub slide instead | `blocks` is gone; `git` ends on "Powered by GitHub." |
| 12. 0:41 TypeScript too complicated | the schema and GraphQL screens are gone; only the framework line stays |
| 13. 0:48 pause | no black stop before `proof` |
| 14. "Try TinaCMS today" (QR code later) | the line above the command on the end card |
| 15. 0-2 s camera move | one locked-off shot |
| 16. Orange edit box overused | removed from the logo, the Save button and the end card; it stays on the real visual editor |
| Music too loud | mastered at -16 LUFS (v1: -14) |

Round 3 (2026-11-07), by review note:

| note | change |
|---|---|
| Game-style sounds when a character is happy or sad, or the llama helps | synthesized in `music/src/engine/gamesfx.py`: a "level up" on the thumbs-up, the fist pump and the callback, and a magic harp-and-bell sweep when the llama rises. The scream is a CC0 recording ("Comical Scream (Woman)", Freesound), picked from 4 after 2 rounds of synthesized screams were rejected |
| Chat messages too fast; the "aah" must be clear | the "aah" plays alone on the error; the 4 requests arrive 0.9 s apart (were 0.6 s); the llama rises 0.6 s later, on the pre-chorus, and its answer still has 2 s before the click |
| 0:15 request pops must be heard over the music | a rounder chat "bloop", and the music steps back 3.5 dB under each one (`duck` on the foley event); measured 3 to 9 dB over the music in the 0.7-7 kHz band (v1: 3.5 to 9.6 dB under it) |
| 0:20 llama: a sound | the magic sweep; its "ding" lands on the speech bubble |
| No click on the Save button | a cursor glides in and clicks Save on beat 3 (27.0); the commit flies out after the click |
| "Next.js, Astro and Hugo" limits and dates | "WORKS WITH Astro. Next.js. Or bring your own." What the CLI offers today: `create-tina-app` starters for Astro (the default) and Next.js have visual editing; `tinacms init` takes Astro, Next.js, Hugo, Jekyll or "Other" (any SSG) |
| Orange words lost their descenders (the tails of g, p, y in "open source.", "today.") | the gradient box of an emphasised word now reaches below the baseline (v1 had the same cut) |
| No Apache licence (it is about to change) | "Free and open source." in `proof`; no licence pill anywhere |
| Callback to the characters on "Built for developers. And content editors." | the developer (thumbs up) and the content editor (fist pump) pop in under the words |
| A stray tiny frame at 0:55 | the card wall fades out before the white wipe covers it, and the 3D layers drop only frames later |
| tina.io fonts | IBM Plex Sans SemiBold at -0.025em for headings, Inter for UI, IBM Plex Mono for code (the files tina.io serves); the end card tag in the tina.io title orange |

Round 4 (2026-11-10), by review note:

| note | change |
|---|---|
| 0:00-0:04: remove the blur | the opening file is sharp end to end: no depth-of-field band |
| 0:17: the message pop-up sounds are wrong (SSW rule "use audio cues to get audience attention") | SSW TV's chat bubble sound on each of the 4 messages |
| 0:42: the same pop-up sound as the rule | SSW TV's pop on "Astro.", "Next.js." and "Or bring your own.", and on each other pop-up: the characters, the pull request card, the wall words, the callback |
| 0:10, 0:24, 0:32, 0:56: typing | SSW TV's typing on each run of keys, also on the opening: a slice of the 14 s recording that starts on a keystroke |
| 0:13, 0:21, 0:24, 0:28, 0:32, 0:58: mouse clicks | SSW TV's mouse click on each click the picture shows, and a new Copy click at 0:58. Her 2 small clicks under the chat messages (0:15, 0:17) stay silent, so each message is clear |
| The music is too loud for the effects | the music bed sits 3 dB lower (`music_trim`); each SSW sound peaks 5 to 15 dB over the music in the 0.7-7 kHz band; the master stays -16 LUFS |
| The QR code (round 2: "later") | a QR card opposite the llama from 0:58, "Scan to try": tina.io with UTM tags (`utm_source=video`, `utm_medium=qr`, `utm_campaign=anthem`). It decodes from a 720p frame |
| 0:45: a white flash for a moment | the cut into "Free and open source." is a clean circle wipe; the full white flash on the drop and the 80% flash on the card wall (0:50.4) are gone. The count and its caption now clear before the wall lands, so the wall never shows through them |
| 0:41-0:43: the background glitches behind "Works with" | each line pop flashed the whole frame 5% white and zoomed it 2% (3 flickers); now only the line pops. The names row of the Developers cut had the same flash |

Round 5 (2026-11-11), by review note:

| note | change |
|---|---|
| The product owner: the music is a bit intense | 2 calm versions of the cue, `anthem2_soft` and `anthem2_chill` (`music/src/song/cues.py`, `_calm`). Both keep the song, the beat grid, the sonic logo and the sound effects. The loudness range drops from 8.3 LU to 4.7-4.9 LU, and no section changes level by more than 2.5 dB |
| A reviewer: the bumps at 0:04, 0:22 and 0:46 are too intense | these are the 3 drops. Each one had a stop, a riser, a big impact and a crash, and the bar before it lost its drums, its bass or its chord filter. The calm versions remove all of that, so the hit over the bar before falls from +7 to +10 dB to +2 to +5 dB |
| Hark: use the tina.io/design style guide | headings in ink-900 (#1C1B2E), the orange words in the page-title gradient, the eyebrow as SLUB (IBM Plex Sans Medium, 0.1em), and the npx field as the site's CodeButton (slate-200 border, ink chevron, Plex Mono 400 ink, a flat orange-600 copy block, a check after the click). The mock Save button keeps its orange: the guide exempts TinaCMS admin UI |
| (found in review) the 0:58 cursor clicked the middle of the command | the end card read the pill's parts by child index, but the sweep layer sits first; it now reads them by name |

Round 6 (2026-11-11), by review note:

| note | change |
|---|---|
| Hark: pick B | the cut plays `anthem2_chill` |
| the music is still loud: lower it to 80% | the music bed plays at 80% (`music_trim` -4.9 dB) and the master is -18 LUFS, so the sound effects keep their level and only the music drops |
| a slight bump at 0:06-0:08 | bar 4 brought in the drums and bass 0.6 s before the chords came back from under the sonic logo (+4 dB in 1 s). The chords now come back over 1.5 s, and bar 4 has its own level plan segment |
| 0:42-0:45: an unnecessary 3 s pause | `Score.cut_span` takes 2 beats out of the build (design 36-37) in the music, the sound effects and the timing; every scene from the drop on starts 1 design second earlier. The film is 63.6 s |
| 0:20: the orange border does not cover the whole bubble | the tail's 2 outer edges carry the same 3 px hover border |
| "Developers" and "Content Editors": one casing | both always take capitals on screen |
| a vertical version for Instagram and Shorts | the cut `anthem-vertical` (9:16, 63.6 s): the anthem timeline with portrait props per scene, inside Meta's Reels safe zone, the 2 characters on the wall frame, and no QR code |


Round 7 (2026-11-11): the 16:9 passed and shipped as `TinaCMS-Anthem-v2-64s-16x9` (30 fps). The vertical, by review note:

| note | change |
|---|---|
| lots of empty space above and below | text stays in the safe band (14%-65%); pictures fill the bands: the opening file at 44 px (a 9:16 copy with a folded headline), the title pair lower, the character cards under the windows, the content editor at 380 px under the page, the "Works with" lines fitted to the width on the portrait stage, the end card llama big and centred |
| the chat bubbles cover the content editor's card | both cards sit under the windows |
| the GitHub line gets covered | the card sits under the 2-line headline and its sub line (y 650, the rail from 1010) |
| (found in the scan) a white frame at 0:53.3 | in portrait the wall fades card by card: opacity on the 3D container flattened the whole tilted wall, and a capture caught it half drawn. The light sweep plane is also cut to the wall's size in portrait |

Round 8 (2026-11-12), team review of the 64 s cut, by review note.
The film is now 73.3 s (55 design s at 90 BPM).
The topic ads stay on a frozen copy of the round 7 anthem (`mv/src/topics/anthem-r7.ts`) until they are re-cut from this one.

| note | change |
|---|---|
| slow everything down, I can't read much | the whole film plays at 90 BPM (speed 3/4, was 1/1.2): every move, typing run and hold is 11% slower. The music is the same chill cue at the new tempo (`anthem3`, `Score.retime(4/3)`) |
| 0:13: the chat bubbles go too fast; 0:13-0:32 is stressful | the 4 requests arrive 1.5 design s apart (2 s, was 0.9 s). `Score.repeat_span` plays verse bars 7-8 twice, so the problem scene has 2 more bars (14 design s). The llama answers 1.5 s after the last request and holds about 3 s before the click |
| 0:33: the commit timeline goes too fast | the commits land at 1.3, 2.75, 4.25 and 6.0 (were 1.3, 2.0, 4.0, 6.0) on 1 more bridge bar (the bridge plays its first bar twice); "Every edit is a commit." holds 3 s longer |
| 0:07: another title slide? | the title is gone, with its 2 bars of music. The opening line ("Your content should be in Markdown.") now leads straight into "Developers love Markdown.": the dark frame shrinks into the developer's window in the light world, and the corner logo fades in |
| 0:03: the opening is dark and the rest is light; it switches again at 0:39 | kept. Dark is the developer's world (his code, Git, the frameworks) and light is the content editor's world. The open is the developer's opinion, so it is dark; the shrink into his window now shows that link |
| 0:20: the llama's answer is important: double the size | the answer is 84 px (was 42). The llama moves left (x 240) to make room, the tail still points at its mouth, and the edit scene's iris opens from the new click point (1534, 684) |
| change "so" to "as": less confronting | "Content Editors? Not as much." |
| the end card should say: Try TinaCMS today / NPX / Or / Your favourite AI agent | "Try TinaCMS today.", the npx command, an "or" divider, "Your favourite AI agent.", then tina.io. The small line "Sites, Docs and Llamas. No Dramas." goes, so the card has one stack of text. The QR card and the llama stay |

Round 8b (2026-11-12), Hark on the round 8 draft.
Round 8c changed the title's music, the sounds and the git length again (the table after this one).

| note | change |
|---|---|
| keep the "Edit your site. Visually." title, after the llama's answer | the title is back at 18-22, after the problem scene. The click on the llama's answer opens it as an iris (no white bloom or flash), its logo flies into the corner at 21.5, and the edit scene opens as an iris from the centre. The corner logo hides while the title's logo is on screen. In the music, `Score.insert_copy` moves the title's 2 bars (with the sonic logo and its duck) after the pre-chorus: E resolves to the title's A, and its E/G# leads into chorus 1. The title's last bar rises to -3.25 so chorus 1 enters +2.4 dB over 2 s |
| the end card: "with" your favourite AI agent and a robot emoji | "or", then "With your favourite AI agent" and a robot emoji |
| make the last slide super symmetrical, with padding among the texts | one centred stack (logo, line, command, "or", agent line, tina.io) with 50 px between the inked shapes (per-gap optical corrections, measured on a frame) and equal top and bottom margins (177 px). The QR card and the llama are mirrored side columns, 300 px wide, 110 px from the edges, about 70 px from the command, both centred on the frame |
| the same message sound when the Developer and Content Editor cards appear | every character card appears with SSW TV's chat bubble sound, as the requests do: the developer and the content editor in the problem scene, the happy content editor in the edit scene, and both cards under "Built for Developers. And Content Editors." (this one replaces the "happy" chime) |

Round 8c (2026-11-12), Hark on the round 8b draft.
The film is now 76 s (57 design s).

| note | change |
|---|---|
| 0:24: the title must not break the music; keep the flow | the title has no music of its own any more. It opens on the drop of chorus 1 (18.0), so the pre-chorus flows straight into the chorus, as in round 8. Chorus 1 plays its first 2 bars twice (`repeat_span`), so the edit scene still has 8 s from 22. `Score.insert_copy` is gone |
| the pop sounds are the wrong way round: the chat bubbles take the cards' pop | the 4 requests use SSW TV's pop (`pop.wav`, the developer card's level); every card keeps its round 7 sound (the pop, and the "happy" chime under "And Content Editors.") |
| random pops at the GitHub star count, not synced as before | the 4 pops and the ping are on the star bursts (each within 10 ms, measured on the audio, as in round 7). The sounds after the count were the 2 card sounds from round 8b; they are back to round 7's |
| 0:49-0:52: a long gap with nothing in it | the git scene is back to 8 s (the bridge plays 4 bars): the commits still land 1.5 s apart, and the dark hold after the merge is 1.5 design s (was 3.5) |

Round 8c passed (2026-11-12) and shipped as `TinaCMS-Anthem-v2-76s-16x9` (30 fps, music `anthem3`).

Round 8d (2026-11-12), Hark after the pass: the only change is the title's place.
The film stays 76 s (57 design s).

| note | change |
|---|---|
| put the "Edit your site. Visually." title back where it was before | the title is back at 4-8, after the open, as in round 7: its own 2 bars of music and the sonic logo hit (0:05), the logo flies into the corner at 7.5, and the corner logo takes over at 8.0. The open no longer shrinks into the developer's window, and the problem scene enters as in round 7 (8-22). The click on the llama's answer opens the edit scene as an iris from the click, on the chorus 1 drop (22), as in round 8. In the music, `anthem3` keeps the title bars and drops the chorus 1 repeat; the foley moves with the picture |

Round 8e (2026-11-12), Hark on the round 8d draft: 2 small glitches.

| note | change |
|---|---|
| an unnecessary 1 s empty screen at the cut into "Edit your site. Visually." | the title opened with a white flash and a bloom, then about 0.8 s of empty wash before the logo. The title now cuts in with no flash (`flash: false`); the logo springs in on the cut, on the first note of the sonic logo (`logoAt: 0`), and the line starts 0.5 s sooner (`lineIn: 0.5`), so "Visually." holds 0.5 design s longer |
| the "or" line at the end is a bit glitchy | the "or" row had no layer of its own, so the end card's slow push-in snapped its letters and lines by whole pixels (measured: 3 jumps, at 1:10.8, 1:12.9 and 1:15.1). It now has `will-change: transform`, like the headlines, and moves smoothly |

Round 8e passed (2026-11-12) and shipped as `TinaCMS-Anthem-v2-76s-16x9` (30 fps, music `anthem3`, poster 27.8 s). The round 8c master is in `out/deliver/archive/round8c/`.


### Thumbnail

`TinaCMS-Anthem-v2-76s-16x9-thumbnail.jpg` (1280 x 720) is the "Built for developers. And content editors." frame (1:01), set for a small screen.
The cut `thumb-anthem` holds that frame with bigger words, bigger character cards, a 1.4x logo and a wider white veil.
The words and both faces stay readable at 168 px wide, the smallest YouTube thumbnail.
The bottom-right corner shows only the card wall, because YouTube puts the duration there.

```bash
cd mv
node render/still.mjs --cut thumb-anthem --t 6.6 --out <scratch dir>
ffmpeg -i <scratch dir>/thumb-anthem-6.600.png -vf scale=1280:720:flags=lanczos -q:v 2 ../out/deliver/TinaCMS-Anthem-v2-76s-16x9-thumbnail.jpg
```

## v1 script (superseded)

The full story.
Times are seconds; `bar.beat` is the music grid (bar = 2 s, beat = 0.5 s).
Each scene owns its own entrance; the handoff column says what carries the eye across the cut.

| # | scene id | time | bars | on-screen words | handoff out |
|---|---|---|---|---|---|
| 1 | `open` | 0-4 | 1-2 | "Your content lives in Markdown." | the caret, alone on black |
| 2 | `title` | 4-8 | 3-4 | logo, "Edit your site. Visually." | the rendered page slides down to become the problem page |
| 3 | `problem` | 8-16 | 5-8 | "Developers love Markdown." / "Editors? Not so much." | a single click at 15.5 on black |
| 4 | `edit` | 16-24 | 9-12 | "Click anything." / "Edit it." / "See it live." | the page lifts into blocks |
| 5 | `blocks` | 24-32 | 13-16 | "Build pages with blocks." | the Save button |
| 6 | `git` | 32-40 | 17-20 | "Every edit is a commit." / "Your content stays in your repo." | the commit line runs into the code |
| 7 | `devs` | 40-48 | 21-24 | "Defined in TypeScript." / "Queried with GraphQL." / "Next.js. Astro. Your stack." | stop at 47.5: black |
| 8 | `proof` | 48-56 | 25-28 | "Open source." / "13.8k stars on GitHub." | the stars collapse into the logo |
| 9 | `cta` | 56-62 | 29-31 | logo, `npx create-tina-app@latest`, tina.io, "Sites, Docs and Llamas. No Dramas." | end |

## 1. `open` (0-4 s)

Purpose: the hook. Attract, and set the developer world.
- 0.0: black. An orange block caret blinks once (power-on click in the music).
- 0.0-2.0, shot A (macro): very close on a dark navy code editor. Raw Markdown types fast on 16ths, big (about 64 px mono), with a shallow depth of field (lines above and below are blurred): `---` / `title: Home` / `hero:` / `  heading: Build faster` / `---` / `# Welcome`. Syntax colours from `SYN`.
- 2.0, shot B (cut on the downbeat): pull back. The same file sits in an editor window, a file tree on the left with many `.md` / `.mdx` / `.json` files. Words land centre-left, big: "Your content lives in **Markdown**." (Markdown in the orange gradient).
- 3.5-4.0: the stop. Everything cuts to black except the caret. The caret is where the next scene starts.

## 2. `title` (4-8 s)

Purpose: brand in the first 5 s, and the product's magic (the render).
- 4.0 IMPACT: the caret bursts. The Markdown glyphs from shot A fly in from the edges (`#`, `**`, `---`, `-`, `>`, `![]()`) and snap, on the hit, into a rendered web page: a big heading, a paragraph, a button, an image. Background: white with the tina.io wash (mint to sky) blooming from the centre.
- 4.0-5.0: the Tina logo (official SVG: llama + "tinacms") scales in on top, centred, with a soft spring. The edit box snaps around the logo on 4.5.
- 5.0-7.5: under the logo, the line "Edit your site. **Visually.**" types word by word on beats (5.0, 5.5, 6.0).
- 7.5-8.0: the logo shrinks into the bottom-right corner and becomes the DOG watermark (it stays until the end card). The page settles as the backdrop for the problem scene.

## 3. `problem` (8-16 s)

Purpose: connect. Relatable pain, with humour.
- 8.0-10.0: split screen. Left: the developer's editor (dark), Markdown with frontmatter, happy green "saved" tick. Words: "Developers love **Markdown**."
- 10.0-14.0: the right side slides over: the editor's view of the same file as a raw text page (light). A cursor wanders, lost; a YAML indentation error appears with a red squiggle. Chat messages pile up on the developer's side, one per beat from 11.0: "can you change the homepage headline? 🙏", "typo on the pricing page", "new hero image?", "is the blog post live yet?". Words: "Editors? **Not so much.**"
- 12.0: the unimpressed llama head (a round sticker) pops in at a corner, spring scale.
- 14.0-15.0: Peek-Llama rises over the bottom edge of the frame ("Need a hand?" in a small speech bubble).
- 15.0-16.0: the break. Everything clears to black. At 15.5 a cursor clicks in the middle of the frame: a click ripple. That click "opens" the next scene.

## 4. `edit` (16-24 s)

Purpose: the core feature, with the real UI. The drop.
- 16.0 DROP: the real TinaCMS visual editor (plate `admin-hero-form` / `admin-home`) crashes in from depth, tilted, and settles flat on a soft wash background. Flash of white on the hit.
- 16.0-18.0: the edit box snaps onto the hero headline on the page (from the plate's boxes). Big word on the left or top: "**Click** anything."
- 18.0-20.0: camera pushes in on the sidebar field and the page together. The typing sequence plays (one plate per character): the field and the page headline change together, live. Word: "**Edit** it."
- 20.0-22.0: second gesture: the media manager opens (plate `admin-media-manager`), an image is picked, the hero image swaps with a wipe. Word: "See it **live**."
- 22.0-24.0: pull back to the whole editor. The seafoam "saved" state. Light sweeps across the glass.

## 5. `blocks` (24-32 s)

Purpose: the page builder.
- 24.0 (crash): the page explodes into its blocks: Hero, Features, Testimonial, Call to action. Each block is a solid card (border, shadow, a label tab with its block name) in an isometric stack.
- 24.0-28.0: the blocks reorder on beats (snap moves with springs): Features swaps above Testimonial, Call to action slides to the top, then back. Word: "Build pages with **blocks**."
- 28.0-30.0: the real "add block" picker (plate `admin-add-block`) pops; a new block drops into the stack with a pop sound.
- 30.0-32.0: the stack collapses back into the page; the edit box lands on the Save button.

## 6. `git` (32-40 s)

Purpose: Git-backed content. The developer trust point.
- 32.0: the Save button is pressed (click). The change flies out of the page as a glowing dot and lands on a horizontal Git line: commit 1 with a ping. Commit message: `Update homepage hero`.
- 34.0, 36.0, 38.0: more commits drop on the beat-1 pings (`Swap hero image`, `Add pricing block`, `Publish: launch post`). A branch splits and merges back (a pull request).
- 33.0-37.0: a diff card shows the Markdown change: `- heading: Build faster` / `+ heading: Edit your site. Visually.` Word: "Every edit is a **commit**."
- 37.0-40.0: word: "Your content stays in **your repo**." The Git line runs right, into the code of the next scene.

## 7. `devs` (40-48 s)

Purpose: developers. Code becomes UI.
- 40.0: dark navy world. A code panel types `tina/config.ts`: `defineConfig({ schema: { collections: [ { name: 'page', fields: [ ... ] } ] } })`.
- 40.0-44.0: each field line (`string heading`, `image hero`, `rich-text body`, `object[] blocks`) emits a real form field to the right (an input, an image picker, a rich-text box, a block list) with a leader line from code to field. Word: "Defined in **TypeScript**."
- 44.0-46.0: a GraphQL query card types, and a typed JSON result fans out. Word: "Queried with **GraphQL**."
- 46.0-47.5: framework names snap in on beats over the snare roll: "Next.js", "Astro", "React", "your stack" (type only, no logos).
- 47.5-48.0: stop: black.

## 8. `proof` (48-56 s)

Purpose: trust, at peak energy. The final drop.
- 48.0 DROP 2: the wash floods the frame in full colour. A giant "Open source." with "Apache 2.0" under it.
- 49.0-52.0: a GitHub-style star counter climbs from 0 to 13.8k, star particles burst on beats. Word: "**13.8k** stars on GitHub."
- 52.0 (crash): a wall of real Tina-built pages (the demo site pages and tina.io itself, plates) scrolls diagonally in 3D, the edit box hopping between them on beats. Word: "Loved by developers. **And editors.**"
- 55.0-56.0: everything collapses toward the centre into the logo.

## 9. `cta` (56-62 s)

Purpose: direct. One call to action, on screen 6 s.
- 56.0 (final chord): the Tina logo, large, centred on a white-to-wash background. The DOG watermark fades out.
- 56.5: the command pill (tina.io CodeButton style: white, orange border, `>` glyph, orange copy tab) types `npx create-tina-app@latest`. The edit box snaps around it on 57.0.
- 58.0 (sonic logo): "tina.io" under the pill. The copy tab flashes "Copied".
- 59.0-62.0: the Relax-Llama rocks in from the right side, leaning back. Small line: "Sites, Docs and Llamas. **No Dramas.**" Hold to the end; slow push-in; fade to white at 61.8.
