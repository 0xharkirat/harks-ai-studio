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
| `gates.py`, `wer.py`, `whisper_worker.py` | Checks the helper runs on each take | yes |
| `metrics.py`, `voice_lines.py`, `test-lines.json`, `baselines/` | Energy diagnosis (below) | yes |
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

## Measure the energy

The weak point is energy: the local voice moves its pitch less than ElevenLabs.
Run from the studio folder:

```sh
.venv/bin/python local-voice/metrics.py compare real videos/11-eagleeye-retry-skip videos/17-eagleeye-retry-skip-qwen
```

`real` is Hark's own clips in `assets/voice`. A video folder is scored on its `public/audio/<scene>.mp3`.
`f0_rng_st` (pitch range in semitones) and `f0_vel_st_s` (pitch change rate) are the energy numbers. Closer to `real` is better.

To try a lever, edit `qwen.json` (or copy it) and voice the 6 fixed test lines:

```sh
local-voice/.venv/bin/python local-voice/voice_lines.py try1 --attempts 4 --config local-voice/qwen.json
.venv/bin/python local-voice/metrics.py compare real local-voice/out/try1 videos/11-eagleeye-retry-skip
```

`baselines/round8-metrics.json` holds the round 8 numbers for the 6 lines.
`baselines/round8-levers.json` holds the step-by-step numbers below.

## Round log

Test set: 6 lines of video 11, voiced by ElevenLabs, by v1, and by v2. Real means 4 clips of Hark (about 4 min).

| | F0 range (st) | Change rate (st/s) | Median F0 (Hz) | Pace (words/s) |
|---|---|---|---|---|
| Real Hark | 5.98 | 19.8 | 173 | 3.26 |
| ElevenLabs | 8.79 | 29.0 | 192 | 3.19 |
| v1 (round 7) | 6.24 | 17.5 | 169 | 2.95 |
| v2 (round 8) | 6.47 | 22.9 | 189 | 2.99 |

Round 7 (v1): 8-bit model, 11.3 s reference clip from a VS Code video, one take per line, temperature 0.7, top-k 50, first take that passes.
Round 8 (v2): bf16 model, a more energetic 11.7 s reference clip (`hark_fumadocs_a` 37.31-49.04 s), temperature 0.95, top-k 100, top-p 0.95, each sentence voiced as its own take and joined with 450 ms gaps, 4 attempts keeping the passing take with the most pitch movement, one gain to -19 dBFS (the level of ElevenLabs lines).
Videos 17 and later use v2. The gates are tail at or below -32 dB, ending rise at or below +12 Hz, Whisper WER under 0.20, then accent (US at most 0.20) and likeness (at least 0.65) on each scene in `check.dart`.

Levers tried in round 8, averaged over 12 takes each, in the order tried (from the experiment logs; treat the cumulative order as likely, not proven):

| Lever | F0 range | Change rate | Verdict |
|---|---|---|---|
| Base (v1 settings) | 4.85 | 16.7 | |
| Energetic reference clip | 6.01 | 21.2 | Worked. The biggest single gain |
| Hotter sampling (0.95 / 100 / 0.95) | 6.24 | 21.4 | Small gain. Raised the gate pass rate from 0.50 to 0.67 |
| bf16 model in place of 8-bit | 6.44 | 22.5 | Small gain |
| Each sentence as its own take | 6.70 | 23.1 | Worked a little, and pauses are exact. Paces 3% slower |
| Punctuation edits in the text | 6.47 | 21.7 | Did nothing. Not kept |

## Still weak

- Energy is below ElevenLabs: F0 range 6.47 against 8.79, and change rate 22.9 against 29.0. It is above real Hark on range, so the target is "between real and ElevenLabs".
- Phrase ends trail off: the last quarter of a line is 3.4 dB quieter than the rest (real Hark: 0.9 dB louder).
- Speech is about 7% slower than real Hark (2.99 against 3.26 words a second).
- Median pitch is 189 Hz against 173 Hz for real Hark.
- Short lines (under 5 words) fail the ending gates often and cost retries.

## Ideas not yet tried

- A second or third reference clip, picked for energy.
- A small post-gain on the last 300 ms to stop the trail-off. It must be a plain gain, with no pitch or stretch (round 7 dropped Praat and Rubber Band as rough).
- A slightly shorter gap between sentences, or a faster reference clip, to close the 7% slowness.
