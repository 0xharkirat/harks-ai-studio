# Local voice

The local voice is a Qwen3-TTS clone of Hark's voice. It runs on the Mac with MLX.
It is the DRAFT voice: every rough edit of a video uses it, and it costs no ElevenLabs credits.
The ElevenLabs clone is the FINAL voice, used once after Hark says the draft is good (see the main README, "Draft and final").
The local voice is still weaker than ElevenLabs, so we keep improving it here.

## Set up

Run once. The script is safe to run again.

```sh
scripts/setup-local-voice.sh
```

It makes a venv with `uv`, installs the pinned `requirements.txt`, and cuts the reference clip to `assets/voice/ref_energetic.wav`.
It reuses a bf16 model already on the Mac (an instant APFS clone), or downloads it once (about 4.5 GB).
It ends with `Ready:` or fails with one line.
`scripts/setup-local-voice.sh --check` prints nothing when all is ready.

Needs: Apple Silicon, `uv`, `ffmpeg`, `openai-whisper` (main README, Install), and `assets/voice/hark_fumadocs_a.mp3` (`scripts/fetch-voice.sh`).
Disk: about 6 GB. The script warns under 15 GB free.

| Path | What | In git |
|---|---|---|
| `qwen.json` | The voice settings (model, reference clip and text, sampling, gates) | yes |
| `qwen_server.py` | The helper. `tts.dart` starts it once and sends it one JSON line per voice line. The docstring is the contract | yes |
| `speak.sh` | Voices one line from the shell or from any agent (see "Voice one line from any agent") | yes |
| `gates.py`, `wer.py`, `whisper_worker.py` | Checks the helper runs on each take | yes |
| `requirements.txt` | Pinned packages | yes |
| `.venv/`, `models/`, `hf/`, `out/`, `.whisper-python` | Rebuilt by setup | no |

Every path in `qwen.json` and in a video's `tts.qwen` is relative to the studio.

## Use it

A new video starts in DRAFT mode, so `dart ../../../scripts/tts.dart` uses this voice.
`tts.dart` keeps each voiced line in `.voice-cache/` next to `script.json`.
After a script edit, it voices only the lines that changed.

Quality setting: `tts.qwen.attempts` in the video's `src/config.json`.

| attempts | Use | Time on video 11's script (4 scenes, 590 characters, cold) |
|---|---|---|
| 1 | Fastest. Short lines often fail the ending gates and get retried | 3 min 11 s, 2 lines kept with a failed gate |
| 2 | The draft default | 4 min 15 s and 5 min 1 s in two runs, no failed line |
| 4 | Full quality. Keeps the take with the most pitch movement | 5 min 52 s, no failed line |

Set `attempts` to 4 when you compare the voice with ElevenLabs.
The times are one run each on an Apple M5, with the GPU free, and `check.dart` adds about 3 minutes (Whisper on the CPU).
A second run of the same script takes 2 s, because every line is cached. Editing 1 line takes about 2.5 min, most of it loading the model and Whisper.

## Memory and run time

Since 2026-10-21 the helper does 4 things to use less memory and time. None of them changes which take a sentence keeps:

- It caps MLX's cache of freed buffers at 512 MB (`mlx_cache_mb`). Without the cap the helper grew to 15 GB on the 6 test lines.
- With `best_energy`, Whisper hears the takes that pass the tail and rise gates in falling energy order, and stops at the first one that passes WER (`lazy_asr`). That take is the one a full check keeps.
- Each sentence gets `max_tokens` = 60 + 15 per word (`max_tokens_floor`, `max_tokens_per_word`), capped by `sampling.max_tokens`. Normal speech needs about 5 tokens a word, so only a take that runs on past its text stops early.
- It exits after 10 minutes without a request (`idle_exit_min`; 0 = never), in case a caller dies without stopping it.

The 6 test lines, 4 attempts, on an Apple M5:

| | Before | After |
|---|---|---|
| Time | 352 s | 166 s |
| Peak memory: helper / Whisper worker | 15.0 / 5.9 GB | 8.4 / 5.9 GB |
| Whisper checks | 38 | 15 |
| Kept takes and gate results | | identical, take by take |

The settings above are defaults in `qwen_server.py`. Put a key in `qwen.json` only to change it: every edit to `qwen.json` makes `tts.dart` voice all cached lines again.
Whisper on MLX was tested and rejected: with `medium.en` it did not stop at the end of the speech and made up text, so every take failed WER.

## Voice one line from any agent

Any agent or shell can use the local voice without a video project.

```sh
local-voice/speak.sh "Hark just built a demo portal for S S W Eagle Eye." out.wav
local-voice/speak.sh "A quick check." out.wav 1      # attempts: 1 is fastest, 4 is full quality
```

1. Set up once: `scripts/setup-local-voice.sh` (it ends with `Ready:`).
2. Run `speak.sh` from any folder. The path of `out.wav` can be relative.
3. Read the one line it prints: `ok <file> takes=N tail_db=… rise_hz=… wer=…`.

The exit code is 0 when the file is written, 1 when the input is bad or the voicing failed, and 2 when the local voice is not set up.
It loads the model on every call, so a short line takes about 20-60 s (17 s for one sentence at attempts 1 on an M5). To voice many lines, use `tts.dart` in a video project, which loads the model once.
The `wer` number compares what Whisper heard with the text you passed. Spelled-out letters ("S S W") raise it, so read it as a hint, not a verdict.
The call is free. It uses no network and never calls ElevenLabs.

Rules for the text:
- Spell out what the voice must say: "S S W", "A P I", numbers in words.
- The attempts setting defaults to the value in `qwen.json`. Pass `1` for a quick check only.
- A clip you publish in this voice must say it is Hark's AI ("I'm Hark's AI" up front).
- This is the DRAFT voice. Use the ElevenLabs final for a video that is delivered.

## Still weak

- Energy is below ElevenLabs: F0 range 6.47 against 8.79, and change rate 22.9 against 29.0. It is above real Hark on range, so the target is "between real and ElevenLabs".
- Phrase ends trail off: the last quarter of a line is 3.4 dB quieter than the rest (real Hark: 0.9 dB louder).
- Speech is about 7% slower than real Hark (2.99 against 3.26 words a second).
- Median pitch is 189 Hz against 173 Hz for real Hark.
- Short lines (under 5 words) fail the ending gates often and cost retries.

