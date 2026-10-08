---
name: explainer-video
description: Make a 3Blue1Brown-style explainer video on any topic, with diagrams and code that build up in sync with a local text-to-speech narration, rendered with Remotion. Use for "explainer video on X", "explain X in a video", or a 3b1b-style animation of how something works.
---

# Explainer video

The studio is the parent of this skill's base directory; from a shell, `STUDIO=$(cd -P ~/.claude/skills/explainer-video/.. && pwd)`.
It is the done-video studio: `$STUDIO/README.md` is the reference for Local voice, Subtitles, and Components.
The narration is free and offline: macOS `say`, with the voice in `tts.say` of the project's `src/config.json`.

## 1. Plan the idea

Find the 1 question the video answers and the picture that answers it.
Check each claim against the official docs, or run it once in a scratch directory.
Split the answer into scenes with 1 idea each: a title, 2-4 idea scenes, and code only when the topic is code.

Done when you can state, 1 sentence each: the question, the answer, and the picture each scene shows.

## 2. Create the project

From `$STUDIO`: `scripts/new-video.sh --explainer NN-short-name`, where NN is the next number in `videos/`.
It starts from the explainer scenes, sets `tts.provider` to `say`, and removes the portrait in the project's config.
Run every later command from `videos/NN-short-name/project`.

Done when it prints `Ready:`.

## 3. Write the script

Replace every `TODO` in `script.json`.

- Write the narration in ASD-STE100 Simplified Technical English: 20 words or fewer per sentence, 1 idea each, active voice, present tense, plain words.
  The topic's own terms are the 20% that stay as they are.
- Aim for 60-120 s, about 160-320 words, unless the user asks for another length.
- Put 1 sentence per line; each line adds 1 part to the picture, and a scene has 2-5 lines.
- Scene ids are 1 lowercase word that becomes the component name (`replay` -> `Replay`); `title`, `heading`, and `diagram` clash with the imports.
- `say` is the subtitle text; put spoken spellings in `tts`, such as "D prime" for "D′" or "dash dash continue" for "--continue".
- Give a scene `"hold": <seconds>` when its last part lands after its last line.

Done when no `TODO` is left, no sentence has more than 20 words, and the word count fits the length.

## 4. Voice the narration

```sh
dart ../../../scripts/tts.dart        # each line voiced with macOS say
dart ../../../scripts/check.dart      # Whisper hears every scene back
dart ../../../scripts/pad.dart 0.35   # about 0.6 s between sentences
dart ../../../scripts/layout.dart
```

When `check.dart` flags a scene, respell the misread word in its line's `tts` and voice again.

Done when `check.dart` prints `All scenes pass.` and `src/layout.json` exists.

## 5. Build the scenes

In `src/scenes.tsx`, export 1 component per scene id.
Build them from `Title`, `Heading`, `Diagram`, and `CodeWalk` in `src/explain.tsx`, and `Terminal` in `src/ui.tsx`.

- Keep the 3Blue1Brown feel: a plain dark background, and a picture that starts near empty and gains 1 part per line.
- Give each part the cue of the words that name it: `at(cue, i)` for a line, `within(cue, ends, i, f)` for a word at fraction `f` of line `i`.
- To carry a diagram into the next scene, repeat its nodes there without `at`.
- Use `out` to ghost a part the narration replaces, `move` to glide a label, and `flash` to point at a node.
- Keep every part above y 880, so the subtitles stay clear.
- `$STUDIO/examples/03-git-rebase-explainer/` is a finished explainer.

Check a still at the end of each scene: `npx remotion still src/index.ts Video out/s.png --frame=<n>`.

Done when the still at the end of every scene shows each part its lines name, and nothing overlaps the subtitles.

## 6. Render and deliver

Render and check as in step 7 of `$STUDIO/SKILL.md`, then deliver as in its step 8.

Done when loudness reads about -16 LUFS, the frame sheet shows every diagram complete by the end of its scene, and the user has the path of the new version.
