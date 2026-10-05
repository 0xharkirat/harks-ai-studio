# harks-ai-studio

Make SSW-style narrated videos in Hark's cloned voice (Hark's AI) with Claude Code, ElevenLabs, and Remotion.

- [Install](#install)
- [Usage](#usage)
- [Edit a finished video](#edit-a-finished-video)
- [Check key permissions](#check-key-permissions)
- [Style that works](#style-that-works)
- [Components](#components)
- [Assets](#assets)
- [Voice](#voice)
- [Subtitles](#subtitles)
- [Pronunciation](#pronunciation)
- [Gotchas](#gotchas)
- [License](#license)

## Install

On a new Mac (Hark's paths; anyone else can clone anywhere and link it):

```sh
git clone <this repo> ~/Movies/harks-ai-studio
ln -s ~/Movies/harks-ai-studio ~/.claude/skills/done-video      # dotfiles does this via home/.claude/skills/done-video
brew install ffmpeg node dart uv pipx yt-dlp && pipx install openai-whisper
cd ~/Movies/harks-ai-studio && uv venv -p 3.11 .venv && VIRTUAL_ENV=.venv uv pip install speechbrain librosa "setuptools<70" "huggingface_hub<0.26"
open -e ~/.zshrc.local   # paste: export ELEVENLABS_API_KEY="..."  (an editor keeps the key out of shell history; ~/.zshrc sources this file)
scripts/fetch-voice.sh                                          # rebuilds assets/voice from assets/voice/sources.json
```

The voice-check models (SpeechBrain, about 100 MB) and Whisper models download on first use.
To make it yours:

1. Edit `speaker` in `voice.json`: name, title, portrait, voice profile, and the accent tag in `prefix`.
2. List 2-4 minutes of your own clean, solo, public videos in `assets/voice/sources.json`, then run `scripts/fetch-voice.sh`.
3. Run `scripts/clone-voice.sh`; it clones your voice and writes the new `voice_id` into `voice.json`.
   Only clone your own voice, or one you have permission for.

## Usage

Ask Claude Code: "make a done video for <PBI link>".
The `done-video` skill runs [`SKILL.md`](SKILL.md): gather the PBI, create the project, write the script, capture screenshots, voice and check the narration, build the scenes, render, deliver.

Every step in `SKILL.md` lists its commands, so it also works by hand.
`examples/01-done-video/script.json` is a real done-video script, and `examples/02-voice-clone-tutorial/` shows every component in use.
`videos/01-done-video-voice-clone` predates this pipeline; read its script, not its code.

## Edit a finished video

Change only the lines that need it, without re-voicing the rest:

```sh
dart ../../../scripts/retake.dart split   # once, before you touch script.json
# edit, add, or delete lines in script.json
dart ../../../scripts/retake.dart build   # voices only new or changed lines (with context), rebuilds every scene
dart ../../../scripts/layout.dart
```

`split` saves every spoken line as a clip in `public/audio/lines/` and indexes it in `src/lines.json` by its spoken text.
`build` reuses any clip whose text is unchanged, so a 1-line fix costs about 100 credits instead of a full re-voice.
`build` plays every new clip back through Whisper and prints what it heard next to the script.
If a line was misheard, delete its entry from `src/lines.json` and run `build` again.
Then update the scene's `cue[i]` indexes if you added or removed a line.

## Check key permissions

A done-video key needs only these endpoints (verified 2026-10-04, 9 of 9 checks passed; Voice Generation is not needed):

| Endpoint | Access | Used for |
|---|---|---|
| Text to Speech | Access | Narration |
| Voices | Write | Creating the clone, listing voices |
| Sound Effects | Access | Typing and click sounds |
| Music Generation | Access | Background music |
| User | Access | Reading the credit balance |

To prove it against a restricted key, put `export TEST_ELEVENLABS_KEY="..."` in `~/.zshrc.local` (not on the command line, which lands in shell history), then run `scripts/permission-test.sh assets/voice/hark_playwright_a.mp3`.
It makes every pipeline call, clones and deletes a 10 s test voice, and expects Models and History to be refused.

## Style that works

- Real screenshots in `BrowserShot`: the cursor glides, clicks with sound, the target gets a red box, and the view zooms in.
- One light joke per scene, like the sysadmin line in the permissions tip.
- SSW tags for every do and don't: "✅ Good example" and "❌ Bad example".

## Components

All in `template/src/ui.tsx`:

| Component | Use |
|---|---|
| `LowerThird` | SSW TV name bar: white box, red strip, red slanted edge |
| `SswTag` | "✅ Good example", "❌ Bad example", "LEARN MORE" bars |
| `Terminal` | `cmd` and `prompt` lines type out with the typewriter sound |
| `BrowserShot` | Real screenshot with a gliding cursor, click sound, red highlight, zoom, and `blur` boxes |
| `PermissionPicker` | ElevenLabs-style endpoint list; the cursor clicks each chosen access level |
| `PiP` | Bottom-right camera box with the "AI VOICE" label and a voice meter |
| `Captions` | Burned-in subtitles, cut by the rules in `captions.ts` (see [Subtitles](#subtitles)) |
| `Header`, `Chip`, `Appear`, `Between`, `Backdrop` | Titles, chips, and timed reveals |

Sound levels live in `sfx` in `ui.tsx` and `MUSIC` in `Video.tsx`.

## Assets

| Path | What | How it was made |
|---|---|---|
| `assets/voice/*.mp3` | 4:12 of clean solo Hark used to train the clone | Cut from the Playwright agents and Fumadocs SSW TV videos |
| `assets/voice/reference/*.mp3` | Held-out real clips that `voicecheck.py` scores likeness against | Other parts of Hark's SSW TV videos |
| `assets/brand/hark.jpg` | Portrait for intros, outros, and the camera box | Frame from an SSW TV video |
| `assets/sfx/typewriter_loop.wav` | 6 s loop | ElevenLabs sound effects, `loop: true`: "Soft vintage typewriter typing, quick steady keystrokes, close mic, dry, no bell" |
| `assets/sfx/mouse_click.wav` | One click | ElevenLabs sound effects: "Single crisp computer mouse click, close mic, dry", trimmed to 0.12 s |
| `assets/music/minimal_lofi_bed_4min.mp3` | 4 min quiet bed, fades out on its own | ElevenLabs music `music_v1`, instrumental: "Very minimal, subtle background music for a calm tech tutorial... 85 BPM" |

The sound effects and music sit near -20 LUFS, so the `volume` values in code stay meaningful.
For a video longer than 4 min, generate a longer bed (about 900 credits per minute) rather than looping this one.

## Voice

`voice.json` is the single source of the recipe; every script reads it.

- ElevenLabs Instant Voice Clone "Hark's AI", voice ID `EtyQYZi13hBpNi6qJGxp`, trained on `assets/voice/*.mp3`.
- Model `eleven_v4`, stability 0.5, similarity 0.85.
  v4 ignores speed, style, and speaker boost, so pace comes from `pad.dart`.
- Every request starts with the audio tag `[Indian English accent]`.
  Without it the clone drifts American (7 of 10 tutorial scenes did); with it, 0 of 10.
- Scenes are merged into chunks of up to 850 characters and stitched with `previous_request_ids`, so tone carries through a video.
  `previous_text` and `next_text` are free; request IDs expire after 2 hours.
- A fixed `seed` per chunk (stored in `src/seeds.json`) gives back the same take for the same text, about 99% identical.
- `scripts/voicecheck.py` scores any file: speaker match vs `assets/voice/reference` (real Hark scores 0.76-0.78), accent shares, pitch, and pitch range.

Tried and dropped on 2026-10-04, so nobody repeats them:

| Idea | Result |
|---|---|
| Stability 0.7 | The accent tag stopped working: 60-68% US |
| Turbo v2.5, v4 Turbo | Half price, but less like Hark (0.51-0.67) or American |
| New clones from 2 min of one video (`v2`, `v3`) | Less like Hark than the original 4 min clone |
| Pitch post-processing (Praat, Rubber Band) | Matched the numbers but sounded rough and noisy |
| Chatterbox (local, free) | Higher pitch, weaker accent, less like Hark |

## Subtitles

`template/src/captions.ts` cuts subtitles by the Netflix English timed text guide and the BBC subtitle guidelines:

- At most 2 lines of 42 characters, bottom-heavy when split, with no 1-2 word lines.
- Break after punctuation first, then before a conjunction, then before a preposition.
- Never split an article from its noun, a name or title ("Software Engineer", "Claude Code"), a pronoun or auxiliary from its verb, or a number from what it counts.
- At least 0.8 s on screen, starting with the speech and held 0.5 s after it ends.

Add multi-word product names and phrases to `TERMS` in `captions.ts` so they always stay on one line.

## Pronunciation

Use the `tts` field for these:

- Acronyms are spelled out: "S S W", "P B I", "Y T D L P", and "Hark's A I".
- "Fumadocs" becomes "Fuma docs" and "elevenlabs.io" becomes "elevenlabs dot io".
- Money is written as words ("six dollars").
- With the Indian accent tag, "Claude" often comes out as "Clod".
  Leave it: captions show "Claude", and re-rolls for names waste credits.

## Gotchas

- `pad.dart` sets the pace; v4 ignores the `speed` setting.
- ElevenLabs character end times run into the pauses, so `pad.dart` cuts at silences that `silencedetect` finds.
- Starter caps output at `mp3_44100_128`.
- The `character-cost` response header is the true price of a call; `tts.dart` prints the total.
  v4 cost about 0.11 credits per character during its launch sale (to about 2026-10-12), then 1.
- Unused Starter credits roll over for up to 2 months.
- Screenshots come from the Playwright MCP browser after Hark logs in himself.
  Blur key hints, and leave key-creation forms out of the screenshots.
- On YouTube, answer "altered or synthetic content" with Yes.

## License

Code: [MIT](LICENSE), Harkirat Singh.
The music and sound effects in `assets/` were generated with ElevenLabs on a paid plan; check the ElevenLabs terms before reusing them elsewhere.
Voice clips are not included: clone only your own voice, or one you have permission to use.
