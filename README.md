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

The defaults in `voice.json` are the author's.
Replace them once:

1. Edit `speaker` in `voice.json`: your AI's name, your name and title, the path to your portrait, your voice profile, and the accent tag in `prefix` (for example `[Indian English accent] `).
2. List 2-4 minutes of your own clean, solo, public videos in `assets/voice/sources.json`, then run `scripts/fetch-voice.sh`.
3. Run `scripts/clone-voice.sh`. It makes an Instant Voice Clone from those clips and writes the new `voice_id` into `voice.json`.

Only clone your own voice, or one you have permission to use.

## Usage

In any Claude Code session:

```text
make a done video for https://github.com/<owner>/<repo>/pull/123
```

The skill follows [`SKILL.md`](SKILL.md): preflight, gather the PBI, create the project, write the script, capture screenshots, voice and check the narration, build the scenes, render, deliver.
Every step lists its commands, so it also works by hand.

`examples/01-done-video/script.json` is a real done-video script.
`examples/02-voice-clone-tutorial/` shows every component in use.

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
| Voices | Write | Creating the clone, listing voices |
| Sound Effects | Access | Typing and click sounds |
| Music Generation | Access | Background music |
| User | Access | Reading the credit balance |

`scripts/permission-test.sh <clip.mp3>` proves it against a restricted key in `TEST_ELEVENLABS_KEY`.
It makes every call the pipeline makes, clones and deletes a 10 s test voice, and expects Models and History to be refused.

## Voice recipe

`voice.json` is the single source of the recipe.
Each new video copies it to `src/config.json`, so later changes never alter an old video.

- Model `eleven_v4`, stability 0.5, similarity 0.85.
  v4 ignores speed, style, and speaker boost, so pace comes from `scripts/pad.dart`.
- Every request starts with an accent audio tag (`prefix`).
  On the author's clone, 7 of 10 scenes drifted American without it, and 0 of 10 with it.
- Scenes are merged into chunks of up to 850 characters and stitched with `previous_request_ids`, so tone carries through a video.
- A fixed `seed` per chunk (in `src/seeds.json`) gives back the same take for the same text, about 99% identical.
- `scripts/check.dart` gates every scene on US-accent share, speaker likeness against `assets/voice/reference`, and words, and `tts.dart reroll` redoes only the chunks that fail.

Tried on the author's clone and dropped:

| Idea | Result |
|---|---|
| Stability 0.7 | The accent tag stopped working: 60-68% US |
| Turbo v2.5, v4 Turbo | Half price, but less like the speaker, or American |
| Clones from 2 minutes of one video | Less like the speaker than a 4 minute clone from 2 videos |
| Pitch post-processing (Praat, Rubber Band) | Matched the numbers but sounded rough and noisy |
| Chatterbox (local) | Higher pitch, weaker accent, less like the speaker |

## Subtitles

`template/src/captions.ts` follows the Netflix English timed text guide and the BBC subtitle guidelines:

- At most 2 lines of 42 characters, bottom-heavy, with no one- or two-word lines.
- Break after punctuation, then before a conjunction, then before a preposition.
- Never split an article from its noun, a name or title, a pronoun or auxiliary from its verb, or a number from what it counts.
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

## Assets

| Path | What |
|---|---|
| `assets/voice/sources.json` | Which public videos and seconds your voice clips come from; `fetch-voice.sh` rebuilds them |
| `assets/voice/*.mp3`, `assets/voice/reference/*.mp3` | Your training and held-out clips; never committed |
| `speaker.portrait` in `voice.json` | Your photo for intros, outros, and the camera box; never committed |
| `assets/sfx/` | Typewriter loop and mouse click, from ElevenLabs sound effects |
| `assets/music/minimal_lofi_bed_4min.mp3` | A 4 minute quiet bed from ElevenLabs music |

The sound effects and music sit near -20 LUFS, so the `volume` values in code stay meaningful.
For videos over 4 minutes, generate a longer bed rather than looping this one.

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
