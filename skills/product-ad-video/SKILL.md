---
name: product-ad-video
description: Make a music-driven motion-graphics ad film for any product, the way the TinaCMS anthem v2 was made and passed. Code renders every frame in Chrome, and code makes the music, so the product owns all of it. Covers the brand brief, the treatment, the scene-by-scene script, real UI captures, cartoon characters, music and sound effects, review drafts, numbered review rounds until Hark says "test pass", then the master, thumbnail, captions and YouTube copy. Use for "make an ad / promo / launch video / anthem / music video for <product>", "do what fumadocs-mv did for <product>", "a video like the TinaCMS anthem", topic ads or other cuts of a passed ad, and each review round or "test pass" on such an ad. Not for narrated done videos (done-video) or narrated explainers (explainer-video).
---

# Product ad video

The film is a 60 to 80 s ad with no voice.
It has kinetic words, the real product UI, 2 cartoon characters, a mascot, music made in code, and SSW TV sound effects.
The reference is the TinaCMS anthem v2 (`TinaCMS-Anthem-v2-76s-16x9`).
It passed on 2026-11-12 after 8 review rounds.

The engine and the reference film are in `REF=/Users/hark/ssw/tinacms.workspace/tinacms-mv`, a local git repo with no remote.
Read these files before you start:

- [`references/review-lessons.md`](references/review-lessons.md): what each review round taught. Apply it to the first draft, so that no reviewer must say it again.
- [`references/engine-notes.md`](references/engine-notes.md): the copy list, the brand files, the music recipe, the foley format, and the QR commands.
- `$REF/docs/engine.md`: the engine's hard rules and its check commands.
- `$REF/docs/workflow.md`: the steps in the engine's own words. Where its values differ from this skill, use this skill. The table "Which values win" in the engine notes lists the differences.

For TinaCMS itself, also read `$REF/docs/cuts/anthem.md`: the passed script with every review note.

## Ground rules

- "test pass" from Hark means "approved". It does not mean "run the tests".
- Use no ElevenLabs credits, no AI music and no stock music. The music is code. A recorded sound effect is CC0 or an SSW TV asset.
- Use the official logo and mascot files. Never redraw or recolour them.
- When the film claims a feature, show the real product UI, captured from a running copy.
- Start each render with `taskpolicy -b` and 4 workers or fewer. Ask Hark before a render that runs over 10 min or repeats more than 2 times. Check a job for a stall at 10 min.
- Times for a 76 s film on Hark's MacBook: the music about 1 min, a review draft about 7 min, the master about 15 min.
- Never send the live browser preview for review. It drops frames in heavy scenes, and Hark reads that as glitches.
- Commit each round locally. Push only when Hark says so, as `~/AGENTS.md` sets.

## 1. Research the brief

1. Read the brand from the product's own sources:
   - the hex values from the website's CSS source (for Tina: `app/global.css` in the tina.io repo);
   - the rules from its style guide page (for Tina: `tina.io/design`);
   - the logos and mascot from its media kit (for Tina: `tina.io/media`);
   - the font files that the website serves (look at its `@font-face` rules).
2. Run the product's install or init command once, and write down what it offers. If the permission check blocks it, read the CLI's source with `gh api`. The check can block `--help` too, because it also runs `npx`.
3. Get the GitHub stars of the product's main repo on the day (for Tina: `tinacms/tinacms`): `gh api repos/<org>/<repo> --jq .stargazers_count`.
4. Collect the ad rules:
   - Google ABCD (`support.google.com/google-ads/answer/14783551`);
   - the Meta Reels safe zone (top 14%, bottom 35%, sides 6%; only third-party guides give these values);
   - the LinkedIn video specs;
   - the SSW rule "Audio - Do you use sound effects to capture your audience's attention?" (`ssw.com.au/rules/use-audio-cues-to-get-audience-attention`).
5. Write `docs/marketing-brief.md`: exact hex values, font files, logo rules, exact message strings, and proof points with their dates.

A research agent can do sub-steps 1 and 4. Give it the product URL and the list of facts to return.
When the product has a parent company, name it only in the YouTube description.

Google ABCD asks for the brand and the call to action in the audio. The film has no voice, so the sonic logo is the audio brand, and the on-screen words carry the call to action.
The film is 1 16:9 master for YouTube, LinkedIn and Meta. Short 16:9 topic ads come after it passes (step 11).

Done when each colour, font, string and number has a source.

## 2. Make the project

1. Make a new folder beside `$REF`: `<product>-mv`. Start a git repo in it.
2. Copy the paths in "The copy list" of the engine notes. The rest of the 364 MB repo is TinaCMS content.
3. Change the brand files as "The brand files" in the engine notes says. Keep every export name and every key of `C`.
4. Put the product's official logos, mascot art and font files in `assets/`.
5. Find the demo text in the scenes, as "Demo text in the scenes" in the engine notes says. Replace it in `title/card.ts` now, because the work cut shows that page. Plan the rest for step 8.
6. Run `pnpm install` in `mv/` and `uv sync` in `music/`.
7. Write a work cut with the `title` scene, as "A work cut" in the engine notes shows.

Done when `npx tsc --noEmit` passes in `mv/`, and a still of the work cut shows the product's logo and no text of another brand.
Commit at the end of each step.

## 3. Write the treatment and the script

1. Write `docs/treatment.md`: the idea in 1 sentence, the campaign line, the call to action, the style bible, and the cuts. The call to action is the install command and the URL.
2. Write `docs/cuts/<cut>.md` with 1 table row per scene. Give the scene id, the design and real times, the on-screen words, and the handoff. Add a short beat list per scene.
3. Show Hark the scene table in chat. Build only after he agrees.

Real time is design time x 4/3 at 90 BPM.
This story shape passed. Change the words for the product, and keep the jobs and the time budget:

| # | scene | design s (real s) | job | anthem v2 example |
|---|---|---|---|---|
| 1 | `open` | 0-4 (0:00-0:05) | the hook: a developer's opinion, typed on a dark editor | "Your content should be in Markdown." |
| 2 | `title` | 4-8 (0:05-0:11) | the logo springs in on the cut, on the first note of the sonic logo, with the campaign line | "Edit your site. Visually." |
| 3 | `problem` | 8-22 (0:11-0:29) | the pain: the developer is happy, the user is stressed, 4 requests arrive 1 at a time, the mascot answers | "Developers love Markdown." / "Content Editors? Not as much." / "TinaCMS solves it with the best Markdown editor." |
| 4 | `edit` | 22-30 (0:29-0:40) | the main feature in the real UI, opened from the click on the mascot's answer, on the first chorus drop | "Click anything." / "Edit it." / "See it live." |
| 5 | `git` | 30-38 (0:40-0:51) | how it works, for developers: a visible Save click, then the commits | "Every edit is a commit." / "Powered by GitHub." |
| 6 | `devs` | 38-41 (0:51-0:55) | where it works, set in type with no logos | "Works with Astro. Next.js. Or bring your own." |
| 7 | `proof` | 41-49 (0:55-1:05) | free and open source, the stars, a callback to both characters | "Free and open source." / "Built for Developers. And Content Editors." |
| 8 | `cta` | 49-57 (1:05-1:16) | 1 call to action on a symmetrical end card | "Try TinaCMS today." / the command / "or" / "With your favourite AI agent 🤖" / tina.io |

For TinaCMS, the example words passed review, so reuse them.
For another product, fill these patterns of the passed words. `<format>` is what developers keep (for Tina: Markdown), and `<feature>` is the product's main feature.

| scene | pattern |
|---|---|
| `open` | "Your content should be in `<format>`." |
| `title` | "`<Verb>` your `<thing>`. `<Benefit in 1 word>`." |
| `problem` | "Developers love `<format>`." / "`<Users>`? Not as much." / "`<Product>` solves it with the best `<format>` editor." |
| `edit` | 3 lines of 2 or 3 words, 1 per action of the feature: "Click anything." / "Edit it." / "See it live." |
| `git` | "Every edit is a commit." / "Powered by `<platform>`." |
| `devs` | "Works with `<A>`. `<B>`. Or bring your own." |
| `proof` | "Free and open source." / "Built for Developers. And `<Users>`." |

- The 4 chat requests are short questions that a user sends the developer, 3 to 5 words each: "Can you fix a typo?".
- When the product keeps no content format, use what the developers keep: code, config, or data.
- Show the mascot's answer at twice the body size.
- Name a platform in type, and show no third-party logo.
- A line has 2 to 5 words. A card can hold 2 short lines.
- The `devs` scene is 4 s real, so it holds 1 label and up to 3 short names.

The end card stack, from the top: the logo, "Try <product> today.", the command in the website's own command button style, "or", "With your favourite AI agent 🤖", and the URL.
A cursor clicks Copy on the command.
The QR card ("Scan to try") sits in the left column, and the mascot in a relaxed pose sits in the right column.
The corner logo hides when the end card starts.

## 4. Capture the plates

1. Run the product on this machine with demo content for a made-up brand. The TinaCMS run used "Fieldnote" on the official Next.js starter.
2. Capture each UI state with Playwright: a PNG, a `<name>.boxes.json` with the rects of the key elements, and a `manifest.json`. Use the file names that the scenes load, as "Plates" in the engine notes lists.
3. Make a contact sheet of all plates and look at it.

An agent can do this alone. In the TinaCMS run it took 80 min.

## 5. Make the characters

The film needs 2 people: the developer and the user of the product.
Make them 3D cartoon characters in the mascot's style. Hark picked that style for TinaCMS, and he rejected photos as "so AI generated".

1. Ask Hark for the style with the question dialog. Put the 3D cartoon first, as the recommended option.
2. Draw 1 base image per character with Codex image generation, with the mascot art as the style reference:
   `/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex exec --skip-git-repo-check -s workspace-write -C <out dir> -i <mascot.png> -- "<prompt>"`
3. Make each pose as an edit of the base image, so the face, clothes and framing stay the same.
4. Make 3 strips with 2 poses each. The scenes change the pose on story moments.
   - The developer: typing, then a thumbs-up.
   - The stressed user: a frown, then hands on the head.
   - The happy user: a smile, then a fist pump.
5. Build the strips with `assets/characters/build.sh`, as "Characters" in the engine notes says.
6. Write `assets/characters/README.md`: the art is original and shows no real person.
7. Show Hark the poses. The preview with music comes in step 8, when the music and the `problem` scene exist.

## 6. Make the music

Write the cue as "A music cue" in the engine notes says, and make it calm from the start with "The calm recipe".

1. Write the cue on the 120 BPM design grid. Play it at 90 BPM with `speed: 3/4` in the cut and `Score.retime(4/3)` in the cue.
2. Match the sections to the scenes:
   - an intro under the open, and the sonic logo under the title;
   - the verse under the problem, and the first chorus drop on the edit scene;
   - the bridge under git, and a build under devs;
   - the second chorus on proof, and the outro under the end card.
3. Play the sonic logo teaser at design 0.5 s, the sonic logo on the title cut, and the sonic logo again under the end card.
4. When a scene needs more time, repeat whole bars with `Score.repeat_span`. Take time out with `Score.cut_span`. Never stop the music for a title.
5. Render 1 cue: `cd music && taskpolicy -b uv run python src/render.py --cue <cue> --jobs 1`.

Make 1 calm version for the first draft.
If a reviewer says that the music is too intense, render 2 calmer versions and let Hark pick.

## 7. Add the sound effects

Write the sounds in `music/cues/<cue>.foley.json`, in the format of "The foley file" in the engine notes.

1. Put a pop on each pop-up and typing on each typing run. Put a click on each click that the cursor makes on screen. In the passed film, these are the mascot's answer, the fields in the editor, Save, and Copy. They are the milestone clicks of the SSW rule. A plain cursor move gets no sound.
2. For SSW work, use the SSW TV sounds in `music/assets/sfx/sswtv/`: `pop.wav`, `click.wav` and `typing.wav`. They come from the SSW TV SharePoint site, General / 06-sswtv-assets / SSWTV-SFX-assets. The passed film does not use `bubble.wav`.
3. Give the chat requests the same pop as the character cards. Start each typing slice on a keystroke.
4. Use the game-style sounds in code. Play `happy` (a "level up") for a happy character, and `magic` (a sweep) when the mascot helps.
5. For a voice sound, such as a scream, render 3 or 4 CC0 options. Recommend 1, and let Hark pick.
6. Duck the music about 3.5 dB under each pop with the `duck` field. Each effect peaks 5 to 15 dB over the music in the 0.7 to 7 kHz band.
7. Check the sync on the rendered audio, as "The sync check" in the engine notes says.

## 8. Build the scenes and the cut

1. Start from the 9 scenes and the timeline that you copied in step 2. Change their text and assets for the product, and change their code only where the product needs it. "The scene props that passed" in the engine notes lists what each scene can do.
2. Follow the hard rules in `$REF/docs/engine.md`. A frame is a pure function of time.
3. Make 1 work cut per scene in `mv/src/cuts/wip-<id>.ts`.
4. Render contact sheets with `render/sheet.mjs`, at 0.25 s steps and at 1-frame steps over each fast move. Read every image.
5. Do 3 polish passes per scene.
6. Make the QR code for the end card now, as "The QR code" in the engine notes says. Point it at the URL with `utm_source=video&utm_medium=qr&utm_campaign=<cut>`.
7. Render a 15 s draft of the `problem` scene with the music and the sounds. Show it to Hark with the character poses, and get his OK before the full draft.
8. Put the scenes on a timeline in `mv/src/cuts/<cut>.ts`.
9. Check the picture against the glitch list in [`references/review-lessons.md`](references/review-lessons.md).

To build faster, give 2 or 3 scenes to each build agent. Give each agent the treatment, the engine guide, and its scene rows.

## 9. Run the review rounds

Do this loop until Hark says "test pass":

1. Read the notes. If a note is a scrawl capture, open its `contact-sheet.png` and `frames/` first.
2. Number each note. Write the planned change for each note in chat, then make the changes.
3. When a note can mean 2 things, ask Hark with the question dialog. Give the options.
4. Change the code. Measure each fix: stills at the note's time, frame differences, and audio levels.
5. Render the draft: `cd mv && taskpolicy -b node render/render.mjs --cut <cut> --draft --workers 4`. It writes `out/<cut>-draft.mp4`: every 2nd frame at 1080p, with the music.
6. Run `render/glitchscan.sh` on the draft, and look at each time that it flags.
7. Copy the draft to `out/deliver/r<N>/<cut>-r<N><letter>-draft.mp4`.
8. Update the review page `out/deliver/r<N>/index.html`: 1 table per round (Your note, Change, Where now), and a "Please check" list.
9. Serve `out/deliver` in the background (`npx http-server out/deliver -p 8091 -c-1`) and open the page.
10. Add the round's table to `docs/cuts/<cut>.md`. Commit: "<Cut> round <N>: <the changes>".

Other reviewers (the product owner, the team) give input. Hark decides which notes to do.
When Hark changes a passed film, move the passed master to `out/deliver/archive/round<N>/` first.

## 10. Master and deliver

After "test pass":

1. Render the lossless film: `taskpolicy -b node render/render.mjs --cut <cut> --workers 4 --fps 30`. It writes `out/<cut>.mov`.
2. Master it: `taskpolicy -b node render/master.mjs --cut <cut> --music <cue> --name <Product>-<Cut>-v<N>-<len>s-16x9 --poster <s>`. It writes the `.mp4` (H.264, CRF 12, AAC 320k), `-preview.mp4` and `-poster.jpg` to `out/deliver/`.
3. Make the thumbnail from a still cut of the callback frame: both characters and the callback line, with bigger words. Run `render/still.mjs`, then scale it to 1280 x 720 with ffmpeg. The words and faces must read at 168 px wide. Keep the bottom-right corner clear, because YouTube shows the length there.
4. Make the captions with `render/captions/extract.mjs` and `render/captions/srt.dart`. Add the file's name and length to the list in `srt.dart`.
5. Write `docs/ad-copy.md`:
   - the YouTube title: "<Product>: <campaign line>";
   - the description, with the command, the URL and the proof points;
   - chapters: the first at 0:00, each 10 s or longer, on the scene starts (merge a short scene into the next one);
   - hashtags, and the claims that the copy may and may not make.
6. Decode the QR code from a 720p frame of the master, as "The QR code" in the engine notes says.
7. Check the master:
   - PSNR against the passed draft: `ffmpeg -i <master> -i <draft> -lavfi "[0][1]psnr" -f null -`. The minimum is over 40 dB.
   - `render/glitchscan.sh <master>`: only the planned cuts show.
   - Loudness: `ffmpeg -i <master> -af ebur128=peak=true -f null -`. About -18 LUFS, true peak at -2 dBTP or lower.
8. Run `node render/report.mjs` to rebuild the delivery page, and mark the review page as passed.
9. Commit: "<Cut> master: round <N> passed".
10. Report the 3 upload files (the `.mp4`, the thumbnail, the `.srt`), the checks, and the YouTube copy. Open the folder. Stop the server when Hark says.

LinkedIn's help page asks for under 30 fps. Check its current spec before a LinkedIn upload.

## 11. Make the other cuts

After the main film passes, make short 16:9 topic ads from it: 1 feature per ad.
Hark rejected a 9:16 re-frame of the full film, because it cut too much.
