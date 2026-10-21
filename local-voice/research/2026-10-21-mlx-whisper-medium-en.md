# MLX Whisper for the WER gate: rejected for now (2026-10-21)

The helper runs openai-whisper medium.en on the CPU in a second process (about 4-6 GB, about half a core while it works).
The plan was to run the same model on MLX inside the helper, to save memory and CPU with no change to the gate.

## What was tried

- `mlx-community/whisper-medium.en-asr-fp16` (Hugging Face format) with mlx-audio 0.5.9, the version the venv pins.
- `mlx-community/whisper-medium.en-mlx` (OpenAI format). mlx-audio 0.5.9 refuses it: it needs Hugging Face tokenizer files.
- The test: the 6 lines of `test-lines.json`, every take heard, compared take by take with openai-whisper on identical audio.

## Result

- The audio of all 32 takes was identical (generation is deterministic), so only the transcriber differed.
- MLX Whisper heard the words, then kept writing after the speech ended: "Hart just fixed the Eagle Eye nightly scan so a retry only reruns what failed. So, this is the first part of the video. Now, we are going to see...".
- WER went from 0.00-0.17 to 1.5-17 on every take, so every line failed the gate. The run took 932 s against 352 s, because the decoder ran on to its limit.
- Without `language="en"` the output was worse.

The English-only models use special-token ids one lower than the multilingual ones. The decoder never sees the end-of-text token, which points at the token handling for `.en` models in mlx-audio's Hugging Face path.
This cause is an inference from the symptom; the library code was not traced to the line.

## Decision

Keep openai-whisper medium.en for the gate. A different model could work on MLX, but it would change gate decisions, so it needs its own take-by-take comparison and Hark's approval:

- a multilingual MLX Whisper, for example `mlx-community/whisper-large-v3-turbo-asr-fp16`;
- whisper.cpp with a Core ML encoder;
- Apple's on-device SpeechAnalyzer (macOS 26), for example through the `yap` CLI.

Try mlx-audio again after an upgrade only with the same take-by-take comparison (`voice_bench.py`-style: same seeds, every take heard, gate pass/fail compared).
