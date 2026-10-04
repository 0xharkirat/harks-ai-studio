---
name: done-video
description: Make a narrated SSW-style done video, or a short tutorial, in the user's ElevenLabs voice clone, rendered with Remotion. Covers PBI to script, cloned narration gated for accent and likeness, real screenshots with cursor clicks, subtitles, and render. Use for "make a done video", "done video for this PBI", "narrate this in my voice", "Hark's AI video", or fixing an existing done video.
---

# Done video

The studio is this skill's folder (resolve the symlink: `STUDIO=$(cd "$(dirname "$(readlink -f ~/.claude/skills/done-video/SKILL.md)")" && pwd)`).
`voice.json` there is the locked recipe and the speaker's identity; never pass voice settings any other way.
`README.md` there is the reference: Voice, Subtitles, Components, Assets, and the "Tried and dropped" table.

## 0. Preflight

- `echo ${ELEVENLABS_API_KEY:+set}` prints `set`; if not, the key belongs in `~/.zshrc.local`, never in chat.
- `$STUDIO/.venv/bin/python -c "import speechbrain, librosa"` works; if not, run the venv line from README Install.
- `whisper --help` works.

Done when all three pass.

## 1. Gather the PBI

Read what was actually built: the issue (`gh issue view`), the PR (`gh pr view --comments`), and the commits (`git log --since=<start> --stat`) in the user's repo.
Ask the user only for what those do not say.

Done when you can state, one sentence each: the pain before, the change, and the demo flow a viewer will see.

## 2. Create the project

From `$STUDIO`: `scripts/new-video.sh NN-short-name`, where NN is the next number in `videos/`.
It copies the template, fills the speaker's name into `script.json`, and snapshots `voice.json` into `src/config.json`.
Run every later command from `videos/NN-short-name/project`.

## 3. Write the script

Replace every `TODO` in `script.json`; the voice tools refuse to spend credits while one remains.

- Follow the [SSW done video](https://www.ssw.com.au/rules/done-video) order: intro, overview, pain, demo (one or more scenes), outro, in 2-5 minutes (about 300-700 words).
- Write in the speaker's spoken voice from the "On video" section of `~/VOICE.md`.
  The AI narrates about the person in third person ("Hark gave Claude Code one prompt") and talks to the viewer as "you".
- Keep the intro line "I'm <ai_name>" and the sign-off "This was <ai_name>, signing off".
- `say` is the subtitle text; put spoken spellings in `tts` ("S S W", "P B I", "Y T D L P", money in words).
- One line per sentence or two; each scene starts a new visual.

Done when no `TODO` is left and the script reads aloud in under 5 minutes.

## 4. Capture screenshots

Use the Playwright MCP browser at 1600x900 (`browser_resize`), and let the user log in themselves.
Save to `public/shots/<name>.png`.
Read click targets from `browser_snapshot` with `boxes: true`: those x, y, width, height values are the `box` for `BrowserShot`.
Leave key-creation forms out, and list secrets (key hints, emails) in `blur`.

Done when every demo scene has the shots it needs.

## 5. Voice the narration

```sh
dart ../../../scripts/tts.dart          # stitched chunks, cut back into scenes
dart ../../../scripts/check.dart        # accent, likeness, words per scene
dart ../../../scripts/tts.dart reroll   # only chunks holding a failed scene, next seed
```

Repeat check and reroll until `check/bad.txt` is empty.
A ⚠ name flag ("Clod Code") is fine: subtitles show the script text, so never re-roll for it.
Then `dart ../../../scripts/pad.dart 0.6` and `dart ../../../scripts/layout.dart`.

Done when `check/bad.txt` is empty and `src/layout.json` exists.

## 6. Build the scenes

In `src/scenes.tsx`, export one component per scene id with a capital first letter (`demo` -> `Demo`).
Use `IntroCard` and `OutroCard` as they are; build demo scenes from `BrowserShot`, `Terminal`, `PermissionPicker`, `SswTag`, and `Chip` in `src/ui.tsx`.
`cue[i]` is the frame line `i` starts; use `at(cue, i)`.
`examples/02-voice-clone-tutorial/scenes.tsx` shows every component in use.
Check frames with `npx remotion still src/index.ts Video out/s.png --frame=<n>`.

Done when a still from every scene looks right and nothing overlaps the subtitles or the camera box.

## 7. Render and verify

```sh
npx remotion render src/index.ts Video out/video.mp4
ffmpeg -i out/video.mp4 -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness"
ffmpeg -i out/video.mp4 -vf "fps=1/7,scale=384:-1,tile=6x5" -frames:v 1 out/sheet.jpg
```

Done when loudness reads about -16 LUFS and the frame sheet shows every scene.

## 8. Deliver

Copy `out/video.mp4` to `videos/NN-short-name/<title>.mp4`, open it for the user, and give them the path.
On YouTube the user answers "altered or synthetic content" with Yes.
