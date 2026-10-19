---
name: done-video
description: Make a narrated SSW done video, or a short tutorial, in the user's own voice clone (a free local draft, then ElevenLabs for the final), rendered with Remotion. Covers PBI to script, cloned narration gated for accent and likeness, real screenshots with cursor clicks, subtitles, and render. Use for "make a done video", "done video for this PBI", "narrate this in my voice", "a video in my AI voice", fixing an existing done video, or "test pass" on a PBI that has one (YouTube upload pack). An explainer on a general topic, with no PBI and no cloned voice, belongs to explainer-video.
---

# Done video

The studio is this skill's base directory, which Claude Code shows when the skill loads; from a shell, `STUDIO=$(cd -P ~/.claude/skills/done-video && pwd)`.
The recipe and the speaker's identity come from one config file (`scripts/config-path.sh` prints which); never pass voice settings any other way.
The puppet, accent tag, voice profile, and accent and likeness gates are all optional in that config.
`README.md` there is the reference: Voice, Draft and final, Subtitles, Components, Assets, and the "Tried and dropped" table.
A video has two voice modes.
DRAFT is the local Qwen3-TTS clone of the speaker: free, and the voice for every rough edit.
FINAL is the ElevenLabs clone: billed, and used once, after the user says the draft is good.
To voice one line outside a video in the free local voice, run `local-voice/speak.sh "text" out.wav` (`local-voice/README.md`, "Voice one line from any agent").
On "test pass" for a PBI whose video is already rendered, follow [`UPLOAD.md`](UPLOAD.md) in place of the steps below.

## 0. Preflight

- `scripts/setup-local-voice.sh --check` prints nothing; if not, run `scripts/setup-local-voice.sh` once (it ends with `Ready:`).
  Without the local voice, a draft falls back to `say`, never to ElevenLabs.
- For the final only: `echo ${ELEVENLABS_API_KEY:+set}` prints `set`; if not, the key belongs in `~/.zshrc.local`, never in chat.
- For the final only: `voice_id` in the config is a real clone, not the placeholder; if not, see README "Make it yours".
- If the config sets `gate`, `$STUDIO/.venv/bin/python -c "import speechbrain, librosa"` works; if not, run the venv line from README Install.
- `whisper --help` works.
- `pnpm --version` works; if not, `brew install pnpm`.
- If the config sets `speaker.puppet` on Apple Silicon, `arch -x86_64 /usr/bin/true` works (Rosetta 2, for Rhubarb Lip Sync); if not, `softwareupdate --install-rosetta --agree-to-license`.

Done when every check passes.

## 1. Gather the PBI

Read what was actually built: the issue (`gh issue view <n>`), the PR body and diff (`gh pr view <n>`, `gh pr diff <n>`) and its comments (`gh pr view <n> --comments`), and the commits (`git log --since=<start> --stat`).
Work shipped as a direct commit has no PR; the commit and its diff are then the source.
Where the feature can run without side effects, run it once for real numbers to quote.
Ask the user only for what those do not say.

Done when you can state, one sentence each: the pain before, the change, and the demo flow a viewer will see.

## 2. Create the project

From `$STUDIO`: `scripts/new-video.sh NN-short-name`, where NN is the next number in `videos/`.
It copies the template, snapshots the config into `src/config.json` (the voice tools then use that, so a later recipe change never alters this video), builds the camera-box puppet from `speaker.puppet`, and fills the speaker's name into `script.json`.
The video starts in DRAFT: `tts.provider` is `qwen`.
If the local voice is not set up, it says so in one line and uses `say`.
It installs the packages with pnpm (`scripts/install-deps.sh`): files come from one store, and every video shares one Chrome for Remotion in `.cache/remotion-browser`.
It ends by printing `Ready:`; without that line it failed, and it removes the half-built folder itself.
Run every later command from `videos/NN-short-name/project`.

Done when `Ready:` prints and `zsh ../../../scripts/voice-mode.sh status` says `DRAFT`.

## 3. Write the script

Replace every `TODO` in `script.json`; the voice tools refuse to spend credits while one remains.

- Follow the [SSW done video](https://www.ssw.com.au/rules/done-video) order: intro, overview, pain, demo (one or more scenes), outro, in 2-5 minutes (about 300-700 words).
- Write in the speaker's spoken voice from `speaker.voice_profile` in the config when it is set, drafting with the `ai-tells` skill when it is installed.
  The `examples/` scripts show structure only; where they differ from the voice profile, the profile wins.
  The AI narrates about the person in third person ("<name> gave Claude Code one prompt") and talks to the viewer as "you".
- Keep the intro line "I'm <ai_name>" and the sign-off "This was <ai_name>, signing off".
  The draft voice is a clone of the speaker too, so the draft says them as well.
- `say` is the subtitle text; put spoken spellings in `tts`: acronyms ("S S W", "P B I", "Y T D L P"), money, percentages, times and years in words, and command names as they are said ("claude budget").
- One line per sentence or two; each scene starts a new visual.
- Scene ids are one lowercase word, because each becomes a component name (`demo` -> `Demo`).
- The narration runs about 145 words a minute, so 300-650 words is 2-4.5 minutes; the music bed is 4 minutes.
- Add multi-word product names to `TERMS` in `src/captions.ts`, so subtitles never split them.

Done when no `TODO` is left and the script reads aloud in under 5 minutes.

## 4. Capture screenshots

Use the Playwright MCP browser at 1600x900 (`browser_resize`), and let the user log in themselves.
Save to `public/shots/<name>.png`.
Read click targets from `browser_snapshot` with `boxes: true`: those x, y, width, height values are the `box` for `BrowserShot`.
Leave key-creation forms out, and list secrets (key hints, emails) in `blur`.
Where a line quotes a value (a time, a count, a price), set the page to show exactly that value before the shot, for example by pausing and seeking a player.
Where the demo is something playing (a video, an animation), record it instead: a CDP `Page.startScreencast` of the same 1600x900 view from the click onward, built into a 30 fps `public/clips/<name>.mp4`, with its first frame saved as the shot.

Done when every demo scene has the shots it needs and each quoted value matches its shot.

## 5. Voice the narration

Voice in DRAFT first, from the project folder.
The draft costs no ElevenLabs credits, so iterate the script, the visuals, and the timing as often as you like.

```sh
dart ../../../scripts/tts.dart          # the local voice, line by line
dart ../../../scripts/check.dart        # accent, likeness, words per scene
dart ../../../scripts/pad.dart 0.6
dart ../../../scripts/layout.dart
```

`tts.dart` keeps each voiced line, so after a script edit it voices only the lines that changed.
`check.dart` runs the same gates on the draft.
A local voice gives the same take for the same text, so fix a failed scene by respelling its line in `tts` and running `tts.dart` again.
A ⚠ name flag ("Clod Code") is fine: subtitles show the script text.
With a puppet, `layout.dart` also times its mouth from the narration alone (README Puppet), so a clip of someone else talking never moves it.

Done when `check/bad.txt` is empty and `src/layout.json` exists.

Then ask the user to listen to a draft render.
Switch to FINAL only after they say the draft is good:

```sh
zsh ../../../scripts/voice-mode.sh final            # prints the credit estimate; calls nothing
dart ../../../scripts/tts.dart --dry-run            # optional: each request it would send; calls nothing
dart ../../../scripts/tts.dart                      # ElevenLabs is billed from here on
dart ../../../scripts/check.dart
dart ../../../scripts/tts.dart reroll               # only chunks holding a failed scene, next seed
```

Repeat check and reroll until `check/bad.txt` is empty.
Then run `pad.dart 0.6` and `layout.dart` again, and render once.
`voice-mode.sh draft` goes back to the free voice; `voice-mode.sh status` shows which one is active.

Done when `voice-mode.sh status` says `FINAL`, `check/bad.txt` is empty, and `src/layout.json` exists.

## 6. Build the scenes

In `src/scenes.tsx`, export one component per scene id with a capital first letter (`demo` -> `Demo`).
Use `IntroCard` (its `headline` is the tag and title on the opening card) and `OutroCard` as they are; build demo scenes from `BrowserShot`, `Terminal`, `PermissionPicker`, `SswTag`, and `Chip` in `src/ui.tsx`.
`IntroCard`'s `project` names the product the video is about (such as SSW Rules); its lower third shows it above the promise.
`cue[i]` is the frame line `i` starts and `ends[i]` the frame it stops; use `at(cue, i)`.
A recorded clip goes in `BrowserShot`'s `clip`, starting on the click frame; give that scene `"hold": <seconds>` in `script.json` and rerun `layout.dart`, so it plays with the narration silent.
Open the bad example and the fix each with a black title card: `"black": 1.2, "card": "Before"` on the pain scene and `"black": 1.2, "card": "After", "reveal": "reveal"` on the fix scene in `script.json`; the fix lands with a positive sound.
Mark good and bad examples with the one `SswTag` lower third: `✅ Good example` or `❌ Bad example` in `lead`, and `sound="good"` or `sound="bad"`.
For a sound effect `assets/sfx/` lacks, find a free one on YouTube first (`yt-dlp --flat-playlist "ytsearch10:<effect> sound effect no copyright"`), pick one whose title or description allows free use, download the audio only (`yt-dlp -f bestaudio -x --audio-format wav <url>`), trim it to the hit at -20 LUFS, and add its URL and licence line to `assets/sfx/sources.json`; ElevenLabs sound effects are the fallback when nothing fits.
`examples/02-voice-clone-tutorial/scenes.tsx` shows every component in use.
Check frames with `pnpm exec remotion still src/index.ts Video out/s.png --frame=<n>`.

Done when a still from every scene looks right and nothing overlaps the subtitles or the camera box.

## 7. Render and verify

```sh
pnpm exec remotion render src/index.ts Video out/video.mp4
ffmpeg -i out/video.mp4 -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness"
ffmpeg -i out/video.mp4 -vf "fps=1/7,scale=384:-1,tile=6x5" -frames:v 1 out/sheet.jpg
```

Done when loudness reads about -16 LUFS and the frame sheet shows every scene; every re-render repeats this check.
Render drafts the same way: they cost no credits.

## 8. Deliver

Every render is a new version.

- A draft render (voice mode DRAFT) is named `<title> draft vN.mp4`. It is for the user to review: never upload it.
- The final render (voice mode FINAL) is named `<title> vN.mp4`.
- Move `out/video.mp4` to `videos/NN-short-name/` with that name (`mv`), so the render does not exist twice. N is 1 above the highest version of that kind in the folder (`v1` for the first).
- After a final lands, rename each older final to start with `zz ` (`zz <title> v1.mp4`), so the newest sorts first. Give the drafts a `zz ` too.
- Delivered files are permanent: a delivered `.mp4` is never overwritten, and only the user deletes the `zz` ones, when they ask.

Open the new version for the user and give them its path.
The YouTube upload waits for "test pass" and uses the final only; [`UPLOAD.md`](UPLOAD.md) builds its title, description, and settings.
