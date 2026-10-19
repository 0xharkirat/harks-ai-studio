# harks-ai-studio

A Claude Code skill that makes SSW-style done videos, narrated in your own voice clone (a free local draft, then ElevenLabs for the final) and rendered with Remotion.

Watch one: [Done Videos with ElevenLabs & Claude Code](https://youtu.be/H5bpsZGg4Co) (3:24), made entirely by this skill.
The write-up with copy-paste prompts: [harksingh.com/posts/harks-ai-voice-clone](https://harksingh.com/posts/harks-ai-voice-clone).

- [What it does](#what-it-does)
- [Requirements](#requirements)
- [Install](#install)
- [Make it yours](#make-it-yours)
- [Usage](#usage)
- [Edit a finished video](#edit-a-finished-video)
- [Reinstall an old video](#reinstall-an-old-video)
- [API key permissions](#api-key-permissions)
- [Voice recipe](#voice-recipe)
- [Draft and final](#draft-and-final)
- [Local voice](#local-voice)
- [Subtitles](#subtitles)
- [Puppet](#puppet)
- [Components](#components)
- [Assets](#assets)
- [Pronunciation](#pronunciation)
- [Gotchas](#gotchas)
- [License](#license)

## What it does

You say "make a done video for <PBI link>".
The skill reads the PR, issue, and commits, writes a script in the [SSW done video](https://www.ssw.com.au/rules/done-video) order (intro, overview, pain, demo, outro), and voices it with your clone: first a free local draft for the rough edits, then the ElevenLabs clone once the draft is right.
It checks every scene for accent drift and likeness, then renders a 1080p video with real screenshots, cursor clicks, SSW TV lower thirds, rule-based subtitles, typing and click sounds, and a quiet music bed.
The narrator always introduces itself as your AI, so nobody mistakes the clone for you.

## Requirements

- macOS or Linux with [Claude Code](https://claude.com/claude-code)
- An [ElevenLabs](https://elevenlabs.io) plan with Instant Voice Cloning (Starter or above), needed only for the final voice
- For the free local draft voice: an Apple Silicon Mac with about 6 GB of disk
- Node 22, pnpm, Dart 3, ffmpeg, Python 3.11 via `uv`, Whisper, and `yt-dlp`
- For the talking camera box on Apple Silicon: Rosetta 2, which runs Rhubarb Lip Sync
- A few minutes of public video of you talking alone, with no music

## Install

```sh
git clone https://github.com/0xharkirat/harks-ai-studio ~/done-video-studio
ln -s ~/done-video-studio ~/.claude/skills/done-video
ln -s ~/done-video-studio/explainer-video ~/.claude/skills/explainer-video

brew install ffmpeg node pnpm dart uv pipx yt-dlp && pipx install openai-whisper
cd ~/done-video-studio
uv venv -p 3.11 .venv && VIRTUAL_ENV=.venv uv pip install speechbrain librosa "setuptools<70" "huggingface_hub<0.26"
```

Clone the repo anywhere you can write to: your videos are created inside it, in `videos/`.
Then put your key in a file that never reaches git or shell history:

```sh
open -e ~/.zshrc.local     # add: export ELEVENLABS_API_KEY="..."
echo '[ -f ~/.zshrc.local ] && source ~/.zshrc.local' >> ~/.zshrc
```

The voice-check models (SpeechBrain, about 100 MB) and Whisper download on first use.

Set up the local draft voice once (about 4.5 GB model, reused from the Mac when it is already there):

```sh
scripts/setup-local-voice.sh     # ends with "Ready:"
```

## Make it yours

Everything personal lives in one file outside the repo:

```sh
mkdir -p ~/.config/done-video && cp config.example.json ~/.config/done-video/config.json
```

The only required change is `voice_id`: copy it from your clone in the ElevenLabs web app.
The rest is optional, and every field is explained in `_notes` inside the file:

- `speaker.ai_name`, `person`, `title`: what the narrator calls itself, and an optional name bar.
- `speaker.puppet`: a cartoon of you as a Character Animator style PSD, which talks in the camera box (see [Puppet](#puppet)); leave it `null` for no camera box.
- `prefix`: an accent tag such as `[Indian English accent] `, if your clone drifts toward another accent.
- `gate`: per-scene checks for accent drift and likeness, off by default.

No clone yet? List a few minutes of your own clean, solo, public videos in a copy of `assets/voice/sources.example.json`, point `voice_sources` at it, then run `scripts/fetch-voice.sh` and `scripts/clone-voice.sh`.
Only clone your own voice, or one you have permission to use.

## Usage

In any Claude Code session:

```text
make a done video for https://github.com/<owner>/<repo>/pull/123
```

The skill follows [`SKILL.md`](SKILL.md): preflight, gather the PBI, create the project, write the script, capture screenshots, voice and check the narration, build the scenes, render, deliver.
Every step lists its commands, so it also works by hand.

Once the PBI is tested, say `test pass`.
[`UPLOAD.md`](UPLOAD.md) writes `youtube.txt` next to the video: title, description, chapters timed from the scenes, version line, and upload settings.
You upload it yourself, send back the link, and the skill posts the Done on the issue.

The skill voices the video as a free DRAFT first and switches to the ElevenLabs clone only after you say the draft is good (see [Draft and final](#draft-and-final)).

For a short done video (30-60 s, 4 scenes), start the project with `scripts/new-video.sh --short NN-name`.
Its camera box is the puppet in a red border with a faint voice glow, and it plays a whoosh on each cut.

`examples/01-done-video/script.json` is a real done-video script.
`examples/02-voice-clone-tutorial/` shows every component in use.

For a 3Blue1Brown-style explainer on any topic, voiced locally with no API key:

```text
make an explainer video on how git rebase replays commits
```

The `explainer-video` skill follows [`explainer-video/SKILL.md`](explainer-video/SKILL.md), and `examples/03-git-rebase-explainer/` is the result.

The same skill makes a change video: a 60-90 s walk-through of 1 code change, for a reviewer.

```text
make a change video for commit ddb49c2
```

It adds [`explainer-video/CHANGE.md`](explainer-video/CHANGE.md): a before/after diagram, 1 example end to end, the hunks that matter, and what to check.
`scripts/hunk.dart` turns a hunk from `git diff` or `gh pr diff` into `CodeWalk` data.
`examples/04-tts-provider-change/` is the result.

## Edit a finished video

Change only the lines that need it, without re-voicing the rest.
In DRAFT mode, edit `script.json` and run `tts.dart` again: it re-voices only the lines that changed.
The commands below are for a FINAL video voiced by ElevenLabs (`retake.dart` refuses a local voice).
Run these from the video's `project` folder:

```sh
dart ../../../scripts/retake.dart split   # once, before you touch script.json
# edit, add, or delete lines in script.json
dart ../../../scripts/retake.dart build   # voices only new or changed lines, then rebuilds every scene
dart ../../../scripts/layout.dart
```

`build` reuses every line whose text is unchanged, so a one-line fix costs about 100 credits.
It plays each new line back through Whisper and prints what it heard next to the script.

## Reinstall an old video

A video without `node_modules` (for example after you freed disk space) needs its packages again.
Run this from the video's `project` folder:

```sh
cd videos/NN-name/project && zsh ../../../scripts/install-deps.sh
```

It converts an old `package-lock.json` to `pnpm-lock.yaml` and keeps the same versions.
It also links `node_modules/.remotion` to `.cache/remotion-browser`, so every video shares one Chrome Headless Shell.
Remotion downloads that browser (about 100 MB) once, on the first render of any video.
Run the script again at any time: it is safe to repeat.

## API key permissions

Give the key only these endpoints; everything else stays on **No Access**:

| Endpoint | Access | Used for |
|---|---|---|
| Text to Speech | Access | Narration |
| Voices | Write | Creating the clone, listing voices (Read is enough once the clone exists) |
| User | Access | Reading the credit balance |
| Sound Effects | Access | Only if you generate your own sounds |
| Music Generation | Access | Only if you generate your own music |

`scripts/permission-test.sh <clip.mp3>` proves it against a restricted key in `TEST_ELEVENLABS_KEY`.
It makes every call the pipeline makes, clones and deletes a 10 s test voice, and expects Models and History to be refused.

## Voice recipe

Your config (see [Make it yours](#make-it-yours)) is the single source of the recipe; `scripts/config-path.sh` shows which file is in use.
Each new video copies it to `src/config.json`, so later changes never alter an old video.
The defaults below are what kept the author's clone consistent; the accent tag and the gate are opt-in.

- Model `eleven_v4`, stability 0.5, similarity 0.85.
  v4 ignores speed, style, and speaker boost, so pace comes from `scripts/pad.dart`.
- Requests can start with an accent audio tag (`prefix`).
  On the author's clone, 7 of 10 scenes drifted American without it, and 0 of 10 with it.
- Scenes are merged into chunks of up to 850 characters and stitched with `previous_request_ids`, so tone carries through a video.
- A fixed `seed` per chunk (in `src/seeds.json`) gives back the same take for the same text, about 99% identical.
- `scripts/check.dart` checks every scene's words, and, when `gate` is set, its accent and likeness against `assets/voice/reference`; `tts.dart reroll` redoes only the chunks that fail.

Tried on the author's clone and dropped:

| Idea | Result |
|---|---|
| Stability 0.7 | The accent tag stopped working: 60-68% US |
| Turbo v2.5, v4 Turbo | Half price, but less like the speaker, or American |
| Clones from 2 minutes of one video | Less like the speaker than a 4 minute clone from 2 videos |
| Pitch post-processing (Praat, Rubber Band) | Matched the numbers but sounded rough and noisy |
| Chatterbox (local) | Higher pitch, weaker accent, less like the speaker |
| macOS `say` (Aman) for drafts | A stock voice, not a clone: the accent and likeness gates cannot run, and the pace and tone differ from the final. Qwen3-TTS replaced it for drafts. `say` stays as the fallback when the local voice is not set up |

## Draft and final

A video is in one of two voice modes. The mode is `tts.provider` in the video's own `src/config.json`.

| | DRAFT | FINAL |
|---|---|---|
| Voice | Local Qwen3-TTS clone (`qwen`) | Your ElevenLabs clone |
| Cost | No credits | About 1 credit per character |
| Use | Every rough edit: script, visuals, timing | One pass, after you say the draft is good |
| Render name | `<title> draft vN.mp4`, never uploaded | `<title> vN.mp4` |

A new video starts in DRAFT. If the local voice is not set up, `new-video.sh` says so in one line and uses `say`, never ElevenLabs.
Run these from the video's `project` folder:

```sh
zsh ../../../scripts/voice-mode.sh status   # DRAFT (qwen, attempts 2) or FINAL (elevenlabs)
zsh ../../../scripts/voice-mode.sh final    # prints the credit estimate; calls nothing
dart ../../../scripts/tts.dart --dry-run    # lists each ElevenLabs request it would send; calls nothing
dart ../../../scripts/tts.dart              # now ElevenLabs is billed
zsh ../../../scripts/voice-mode.sh draft    # back to the free voice
```

`voice-mode.sh` only edits `src/config.json`. It never calls ElevenLabs: the next `tts.dart` run does, in FINAL mode.
It does not touch the recipe (`voice_id`, `model_id`, `prefix`, `seed`), so FINAL uses what `new-video.sh` stored.
A video whose config has no `tts` block is FINAL, which keeps the older videos working.
After the switch, run `tts.dart`, `check.dart`, `pad.dart`, `layout.dart`, and render once.

## Local voice

`tts.provider` picks the narrator. Set it per video with `voice-mode.sh`, or in the config for new videos.

| Provider | What | Gates in `check.dart` |
|---|---|---|
| `qwen` | Qwen3-TTS clone of your voice, on the Mac (MLX). The draft voice. See [`local-voice/README.md`](local-voice/README.md) | Words, accent, and likeness all run |
| `say` | macOS `say`: free, offline, a stock voice. The fallback when `qwen` is not set up, and the voice of `--explainer` videos | Words only: a stock voice is not a clone |
| `elevenlabs` | Your ElevenLabs clone. The final voice | Words, accent, and likeness |

`tts.dart` voices each line on its own, so line times are exact, and keeps each voiced line in `.voice-cache/`, so a script edit re-voices only the lines that changed.
It writes the same files as the ElevenLabs path, so `pad.dart` and `layout.dart` run unchanged.
`tts.qwen.python`, `server`, and `config` are paths relative to the studio and default to `local-voice/`; `tts.qwen.attempts` is takes per sentence (2 is the draft default, 4 is full quality).
`tts.say.voice` names a voice from `say -v '?'`, and `tts.say.rate` sets words a minute.
`retake.dart` refuses a local voice, because `tts.dart` already re-voices only changed lines.
Another local model, such as Kokoro, is one more case in `localVoice` in `scripts/tts.dart`.

The local voice is not as lively as ElevenLabs yet. `local-voice/README.md` holds the energy numbers and the round log.

## Subtitles

`template/src/captions.ts` follows the Netflix English timed text guide and the BBC subtitle guidelines:

- At most 2 lines of 42 characters, bottom-heavy, with no one- or two-word lines.
- Break after punctuation, then before a conjunction, then before a preposition.
- Never split an article from its noun, a name or title, a pronoun or auxiliary from its verb, or a number from what it counts.
- No cue of 1 or 2 words, unless it is the whole line: a short tail joins the cue before it.
- At least 0.8 s on screen, held 0.5 s after the speech ends.

Add multi-word product names to `TERMS` in `captions.ts` so they stay on one line.

## Puppet

`speaker.puppet` points at a cartoon of you as a Photoshop file, laid out the way Adobe Character Animator expects.
The camera box shows it for the whole video, intro and outro included, and its mouth moves with the narration.

- A `Head` group holds the head art and a `Mouth` group with 1 layer per mouth shape.
  Use the Character Animator names; the builder needs `Neutral`, `M`, `S`, `D`, `Ah`, `Oh`, `W-Oo`, `F`, and `L`.
- A `Body` group is optional; the box shows the top of it.
- The eyes stay in the head art: `scripts/puppet.py` finds the eye whites and draws 3 lid stages for the blinks.

`new-video.sh` runs `scripts/puppet.py` to cut the layers into `public/puppet/`.
`layout.dart` runs [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) on each scene's narration, with the scene's script as the dialog, and writes `src/mouth.json`.
The first run downloads Rhubarb 1.14.0 into `.cache/` and checks it against the release checksum.
The macOS build is Intel only, so Apple Silicon runs it through Rosetta 2 (`softwareupdate --install-rosetta --agree-to-license`).
Scenes run in parallel, about 15 s for a 45 s video, and `check/mouth/` caches each one, so a re-layout costs nothing.

The mouth follows the narration track alone, and only inside the narration lines.
A clip of someone else talking, the music, and the sound effects never move it.
The puppet blinks every 2.3-6 s from a fixed seed, and its head sways and lifts a little while the narrator talks.
2 renders give the same frames.

Tried and dropped:

| Idea | Result |
|---|---|
| Neural talking heads (LivePortrait, MuseTalk, LatentSync, Wan S2V) | CUDA only or very slow on a Mac, untested on a bearded cartoon, and several licences bar commercial use |
| Mouth timing from the final mix | The mouth moved on 412 of 614 frames where someone else talked in a clip |
| Cutting the brows out of flat head art | Left smudges; brows that move need their own layers in the PSD |

## Components

All in `template/src/ui.tsx`:

| Component | Use |
|---|---|
| `IntroCard`, `OutroCard` | Title card, AI disclosure badge, name lower third, recap |
| `LowerThird`, `SswTag` | SSW TV name bar; "✅ Good example", "❌ Bad example" and "LEARN MORE" bars |
| `BrowserShot` | Real screenshot with a gliding cursor, click sound, red highlight, zoom, and blur boxes |
| `Terminal` | Commands and prompts type out with the typewriter sound |
| `PermissionPicker` | Endpoint list where the cursor clicks each access level |
| `PiP` | Bottom-right camera box: the talking puppet (`puppet.tsx`), the "AI VOICE" label, and a voice meter |
| `Captions` | Burned-in subtitles |
| `Header`, `Chip`, `Appear`, `Between`, `Backdrop` | Titles, chips, and timed reveals |

Explainer pieces, with no SSW branding, are in `template/src/explain.tsx`:

| Component | Use |
|---|---|
| `Diagram` | SVG nodes and labelled arrows that draw on at their cues; nodes can fade to a ghost, glide, or flash |
| `CodeWalk` | A code block that lights the lines each cue names and dims the rest; `start` and `added` show a diff hunk's own line numbers and its new lines |
| `Checklist` | The "what to check" list that closes a change video, 1 item per cue |
| `Title`, `Heading` | A centred title card, and a corner label for the scene's one idea |
| `within(cue, ends, i, f)` | The frame part way through a line, for a part the narration names mid-sentence |

## Assets

| Path | What |
|---|---|
| `assets/voice/sources.json` | Which public videos and seconds your voice clips come from; `fetch-voice.sh` rebuilds them |
| `assets/voice/*.mp3`, `assets/voice/reference/*.mp3` | Your training and held-out clips; never committed |
| `speaker.puppet` in your config | Optional Character Animator style PSD of you for the camera box; never committed |
| `assets/sfx/` | Typewriter loop and mouse click from ElevenLabs sound effects; good-example ding and bad-example buzzer from free YouTube uploads. `sources.json` lists where each came from |
| `assets/music/minimal_lofi_bed_4min.mp3` | A 4 minute quiet bed from ElevenLabs music |

They ship with the repo, so nothing has to be generated.
To use your own, drop any royalty-free files (for example from the YouTube Audio Library) into `assets/sfx` and `assets/music` with the same names.
The shipped files sit near -20 LUFS, so match that or adjust the `volume` values in `ui.tsx` and `Video.tsx`.

## Pronunciation

Put spoken spellings in a line's `tts` field; `say` stays the subtitle text.

- Spell acronyms out: "S S W", "P B I", "Y T D L P".
- Write money, percentages, times, and years in words.
- A product name the accent bends ("Claude" heard as "Clod") is only flagged, never re-rolled: subtitles show the right word.

## Gotchas

- The `character-cost` response header is the true price of a call; `tts.dart` prints the total.
- Starter caps output at `mp3_44100_128`, and unused credits roll over for up to 2 months.
- Capture screenshots with the Playwright MCP browser, log in yourself, and blur key hints.
- On YouTube, answer "altered or synthetic content" with Yes.

## License

Code: [MIT](LICENSE), Harkirat Singh.
The music and sound effects in `assets/` were generated with ElevenLabs on a paid plan; check the ElevenLabs terms before reusing them elsewhere.
No voice clips are included.
