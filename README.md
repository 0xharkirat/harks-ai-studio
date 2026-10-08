# harks-ai-studio

A Claude Code skill that makes SSW-style done videos, narrated in your own ElevenLabs voice clone and rendered with Remotion.

Watch one: [Done Videos with ElevenLabs & Claude Code](https://youtu.be/H5bpsZGg4Co) (3:24), made entirely by this skill.
The write-up with copy-paste prompts: [harksingh.com/posts/harks-ai-voice-clone](https://harksingh.com/posts/harks-ai-voice-clone).

- [What it does](#what-it-does)
- [Requirements](#requirements)
- [Install](#install)
- [Make it yours](#make-it-yours)
- [Usage](#usage)
- [Edit a finished video](#edit-a-finished-video)
- [API key permissions](#api-key-permissions)
- [Voice recipe](#voice-recipe)
- [Local voice](#local-voice)
- [Subtitles](#subtitles)
- [Components](#components)
- [Assets](#assets)
- [Pronunciation](#pronunciation)
- [Gotchas](#gotchas)
- [License](#license)

## What it does

You say "make a done video for <PBI link>".
The skill reads the PR, issue, and commits, writes a script in the [SSW done video](https://www.ssw.com.au/rules/done-video) order (intro, overview, pain, demo, outro), and voices it with your clone.
It checks every scene for accent drift and likeness, then renders a 1080p video with real screenshots, cursor clicks, SSW TV lower thirds, rule-based subtitles, typing and click sounds, and a quiet music bed.
The narrator always introduces itself as your AI, so nobody mistakes the clone for you.

## Requirements

- macOS or Linux with [Claude Code](https://claude.com/claude-code)
- An [ElevenLabs](https://elevenlabs.io) plan with Instant Voice Cloning (Starter or above)
- Node 22, Dart 3, ffmpeg, Python 3.11 via `uv`, Whisper, and `yt-dlp`
- A few minutes of public video of you talking alone, with no music

## Install

```sh
git clone https://github.com/0xharkirat/harks-ai-studio ~/done-video-studio
ln -s ~/done-video-studio ~/.claude/skills/done-video
ln -s ~/done-video-studio/explainer-video ~/.claude/skills/explainer-video

brew install ffmpeg node dart uv pipx yt-dlp && pipx install openai-whisper
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

## Make it yours

Everything personal lives in one file outside the repo:

```sh
mkdir -p ~/.config/done-video && cp config.example.json ~/.config/done-video/config.json
```

The only required change is `voice_id`: copy it from your clone in the ElevenLabs web app.
The rest is optional, and every field is explained in `_notes` inside the file:

- `speaker.ai_name`, `person`, `title`: what the narrator calls itself, and an optional name bar.
- `speaker.portrait`: a photo for the intro and a camera box; leave it `null` for a clean title card.
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
Run these from the video's `project` folder:

```sh
dart ../../../scripts/retake.dart split   # once, before you touch script.json
# edit, add, or delete lines in script.json
dart ../../../scripts/retake.dart build   # voices only new or changed lines, then rebuilds every scene
dart ../../../scripts/layout.dart
```

`build` reuses every line whose text is unchanged, so a one-line fix costs about 100 credits.
It plays each new line back through Whisper and prints what it heard next to the script.

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

## Local voice

Set `tts.provider` to `say` in the config to narrate with macOS `say` in place of ElevenLabs.
It is free, works offline, and needs no API key.
`tts.say.voice` names a voice from `say -v '?'`, and `tts.say.rate` sets words a minute.
The default is `Aman`, a neural Indian English voice; System Settings > Accessibility > Spoken Content adds more.

`tts.dart` voices each line on its own, so line times are exact.
It writes the same files as the ElevenLabs path, so `pad.dart` and `layout.dart` run unchanged.
`check.dart` skips the accent and likeness gates for a local voice.
`retake.dart` refuses a local voice, because a full re-voice is free.
Another local model, such as Kokoro, is one more case in `localVoice` in `scripts/tts.dart`.

## Subtitles

`template/src/captions.ts` follows the Netflix English timed text guide and the BBC subtitle guidelines:

- At most 2 lines of 42 characters, bottom-heavy, with no one- or two-word lines.
- Break after punctuation, then before a conjunction, then before a preposition.
- Never split an article from its noun, a name or title, a pronoun or auxiliary from its verb, or a number from what it counts.
- No cue of 1 or 2 words, unless it is the whole line: a short tail joins the cue before it.
- At least 0.8 s on screen, held 0.5 s after the speech ends.

Add multi-word product names to `TERMS` in `captions.ts` so they stay on one line.

## Components

All in `template/src/ui.tsx`:

| Component | Use |
|---|---|
| `IntroCard`, `OutroCard` | Portrait, AI disclosure badge, name lower third, recap |
| `LowerThird`, `SswTag` | SSW TV name bar; "✅ Good example", "❌ Bad example" and "LEARN MORE" bars |
| `BrowserShot` | Real screenshot with a gliding cursor, click sound, red highlight, zoom, and blur boxes |
| `Terminal` | Commands and prompts type out with the typewriter sound |
| `PermissionPicker` | Endpoint list where the cursor clicks each access level |
| `PiP` | Bottom-right camera box with the "AI VOICE" label and a voice meter |
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
| `speaker.portrait` in your config | Optional photo for intros, outros, and the camera box; never committed |
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
