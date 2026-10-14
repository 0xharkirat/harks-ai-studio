# Done-video research: wicksipedia, clarity, local Qwen3-TTS

Date: 2026-10-14.
Agents: 3 research and test agents on Opus 5.5 high. This file is the merged result.
Clones: `wicksipedia-done-video/` (dc5e635, MIT), `addyosmani-clarity/` (e27ceef, v0.2.1, MIT).
Voice samples: `~/Movies/harks-ai-studio/voice-tests/round7/` (run `listen.sh`).

## Verdicts

1. **Local voice (Qwen3-TTS):** the metrics say it is competitive with our ElevenLabs clone. Nobody has listened yet. Hark must listen before any decision.
2. **wicksipedia script wiring:** it has no research pass and no de-slop pass. Its narration is hand-written. Our step 1 (issue, diff, comments, commits, run the feature) is stronger.
3. **wicksipedia value:** the local voice path, 2 audio gates (cut-off ending, rising pitch), and 3 small structure rules.
4. **clarity:** copy 5 checks into step 3 of our skill. Do not install the skill. About 70% of it repeats `ai-tells`.

## 1. Local voice test (video 11, 6 lines, Apple M5 32 GB)

Model: `mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit` through `mlx-audio` 0.5.9. Zero-shot clone from an 11.3 s real clip plus its transcript.
No ElevenLabs API call was made. The ElevenLabs side is audio already on disk.
`*` = fails the README gate (match >= 0.65, US <= 0.20, WER < 0.20, tail <= -32 dB, rise <= +12 Hz).

| Line | Match EL / Qwen | WER EL / Qwen | Tail dB EL / Qwen |
|---|---|---|---|
| 01 intro "I'm Hark's AI" | 0.64* / 0.48* | .14 / .14 | -36.7 / -32.2 |
| 02 intro, long | 0.69 / 0.75 | 0 / 0 | -38.8 / -34.2 |
| 03 pain, numbers | 0.71 / 0.74 | .09 / .09 | -36.2 / -39.0 |
| 04 fix, numbers | 0.63* / 0.74 | 0 / 0 | -33.7 / -37.4 |
| 05 outro summary | 0.69 / 0.75 | 0 / .07 | -35.1 / -34.4 |
| 06 sign-off, short | 0.60* / 0.56* | .17 / 0 | -45.6 / -44.3 |
| intro scene (01+02) | 0.76 / 0.75 | | |
| outro scene (05+06) | 0.70 / 0.75 | | |

- Accent (US score) is 0 for both voices on every line.
- Qwen beats ElevenLabs on likeness on 4 of 6 lines and loses on 2 short lines. ElevenLabs fails 3 lines under the same per-line scoring. At scene level both voices pass.
- Median pitch: Qwen 159-179 Hz, ElevenLabs 193-205 Hz, real Hark 160-198 Hz.
- Speed: model load 2 s warm, real-time factor 0.76, 3.3 GB resident, runs on the GPU with no errors. The first run spent 9 minutes on the 3.1 GB download.
- Caveats:
  - The reference clip comes from the same video as one held-out file. This inflates the Qwen score. Against the independent clip only, Qwen scores 0.69-0.72 and ElevenLabs 0.54-0.64. Qwen still leads.
  - Run-to-run spread is about 0.1 on short lines.
  - Qwen dropped the word "a" on line 05.
  - The tools measure likeness, accent, and ending shape. They do not measure energy or prosody.

Credit math: about 800 characters per video, about 1 credit per character (not verified). Local drafts save only the extra passes (rewrites, rerolls), about 0-800 credits per video. Real savings need Qwen as the final voice.

## 2. wicksipedia vs ours

| Feature | wicksipedia | Ours | Verdict |
|---|---|---|---|
| Product | Records live before/after bug fixes with Playwright | Screenshots and Remotion scenes | Keep ours; defer live capture |
| Voice engine | Qwen3-TTS local | ElevenLabs clone | Adapt: add `qwen` as a provider |
| Voice reference | 10 s clip plus exact transcript | About 4 min of 2 videos | Keep ours |
| Voice gates | Tail dB, rising pitch, F0 near reference, 4 tries keep best | Whisper WER, accent, ECAPA likeness | Adopt tail and rise gates |
| Script prep | Hand-written beats | Reads issue, diff, comments, commits; runs the feature | Keep ours |
| De-slop | None. 11 small rules | `ai-tells`, voice profile | Adapt 3 rules (R1, R5, R7) |
| Verification | Whisper on the finished MP4 closing words | Whisper on scene audio | Adapt: add a finished-file pass |
| Subtitles | Overlay captions, off when narrated | Netflix/BBC rules | Keep ours |
| Sound effects | Synthesised stingers | Free YouTube sounds with licence log | Adapt (small win) |
| Delivery | Local MP4 | Versioning, YouTube pack | Keep ours |

The 3 rules to copy:
- R1: name what you do before you do it ("Click Explore the demo."), so the action confirms the words.
- R5: in the outro, name the thing, not the change. The viewer can then say what now exists.
- R7: one idea per spoken line. Split a long sentence; do not rely on spacing between lines.

## 3. clarity vs ours

Clarity has no timing or text-to-speech guidance. Only 5 of its checks add value for a spoken script:

1. Every number, name, and claim traces to step 1. Never invent one.
2. Replace a vague line with the thing the viewer sees.
3. Name who acts. Link ideas with "because", "so", or "if".
4. Cut lines that only announce or repeat. Keep one "let me show you" before the demo.
5. Say each line aloud once. Fix stumbles inside the same line, so cue numbers stay.

Order: `ai-tells` write, then one clarity pass, then `ste-check`, then `check.dart`.
On a clash: facts, then `~/VOICE.md`, then STE, then `ai-tells`, then clarity.

Proposed text for `SKILL.md` step 3 (not applied):

```diff
 - Write in the speaker's spoken voice ... (unchanged)
+- Then make one clarity pass, after `ai-tells` and before `ste-check`, and stop.
+  It adds only these 5 checks (after Addy Osmani's clarity):
+  1. Every number, name, and claim comes from step 1. Where the PBI lacks one, ask or cut; never invent it.
+  2. Replace a vague line with the thing the viewer sees: "work too" becomes a count, a name, or a state.
+  3. Name who acts, and link ideas with "because", "so", or "if".
+  4. Cut lines that only announce or repeat when a card or the next line says it. Keep one "let me show you" before the demo.
+  5. Say each line aloud once. Where you stumble, split or reword inside the same line, so cue numbers stay.
+- Start a demo line with the action ("Click Explore the demo."), end the outro on a noun the viewer can repeat, and keep one idea per line.
-Done when no `TODO` is left and the script reads aloud in under 5 minutes.
+Done when no `TODO` is left, every number and name traces to step 1, and the script reads aloud in under 5 minutes.
```

## 4. Before and after: video 16 script

Both agents worked this script by hand. Video 16 has 14 lines, 132 words.
Result: 6 lines change. Words 132 to about 140. Runtime at 145 wpm 54.6 s to about 58 s.
The real render is already 61.3 s, over the 60 s short limit. Both methods make the script clearer, not shorter.

| Line | Before | After | Source and rule |
|---|---|---|---|
| fix 3 | No database, and the browser loads nothing from outside. | No database, and the browser makes 0 outside requests. | clarity 2: the video's own chip says "0 outside requests" |
| demo 1 | Click Explore the demo, and the Issues report shows 6 Northwind repositories. | Click Explore the demo. The Issues report shows 6 Northwind repositories. | clarity 5 and wicksipedia R1, R7 |
| demo 2 | Create a tag, and it shows in the list. | Create a tag. It shows in the list. | wicksipedia R1, R7 |
| scan 1 | Start an Email scan, and watch it go from Started, to Scanning, to Succeeded. | Start an Email scan. It goes from Started, to Scanning, to Succeeded. | wicksipedia R1, R7 |
| scan 2 | Scheduled scans and Settings work too. | The Scheduled page lists 90 nights of scans, and Settings shows GitHub connected. | clarity 2. Needs a PBI check: "nights" comes from the video chip only |
| outro 1 | Summary, a safe demo to show any customer. | Now, EagleEye has a safe demo for any customer. | clarity 4 and 5 (drops "Summary,"). wicksipedia R5 prefers "...the EagleEye demo portal: a safe site to show any customer." |

The other 8 lines stay. Intro and sign-off are fixed lines.
Ask the author: "reset after 2 hours" does not say from when. Only the PBI can say.

## 5. Proposed code changes (not applied)

`scripts/check.dart:22-23`
- Bug: `clone = provider == 'elevenlabs'` turns off the accent and likeness gates for every local provider. Read `gate` from the config whenever it is set. Skip the gates only for `say`.
- Skip the match gate on any scene under 4 s of audio, or score the joined scene.

`scripts/tts.dart` (`localVoice`, lines 80-83)
- Add a `qwen` case.
- Start one long-lived Python helper on first use. It loads the model once (2 s), reads `{text, out}` lines, retries up to 4 times on the tail and rise gates, and writes the WAV. A new process per line would reload 3 GB each time.
- Config: `tts.qwen = {ref_audio, ref_text, python, attempts}`.
- Voice short lines (under 4 s) together as one scene and cut them after.

New gates: copy the tail-dB and rising-pitch checks (wicksipedia `pitch.py`, numpy only) into `check.dart`. They also help ElevenLabs output.

## 6. Next steps

1. Hark listens: `~/Movies/harks-ai-studio/voice-tests/round7/listen.sh` (EL first, then Qwen, per pair).
2. If Qwen passes by ear: build the `qwen` provider (section 5), then test on one full real video.
3. Apply the step 3 text (section 3), if wanted.
4. Delete `~/Movies/done-video-research/qwen-test/` (3.8 GB) when finished with the test.

## Not verified

- How either voice sounds.
- Whether the "90 nights" wording is true in the app.
- `npx skills add` behaviour for clarity.
- The ElevenLabs credit rate and Hark's plan quota.
- Qwen on a full-length (3-5 minute) video.
