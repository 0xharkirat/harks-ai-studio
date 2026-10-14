# What ElevenLabs uses for Hark's voice, and what it means for the local voice

Date: 2026-10-14. Web pages retrieved 2026-10-14. Account facts come from read-only GET calls. No credits were spent.
Labels: CONFIRMED (API response or official doc), REPORTED (secondhand), INFERRED (our reasoning), not published.
Account-specific numbers (voice id, plan usage) are left out on purpose, because this repo may become public.

## 1. His voice on ElevenLabs (CONFIRMED, from the account API)

| Field | Value | Source |
|---|---|---|
| Voice type | Instant Voice Clone (`category: cloned`), 4 samples | GET /v1/voices/{id} |
| Fine-tuned model | None (`is_allowed_to_fine_tune: false`, `high_quality_base_model_ids: []`) | same |
| Labels | narration, en, male, accent indian | same |
| Stored defaults | stability 0.5, similarity 0.75, style 0, speed 1.0, speaker boost on | same |
| Model in use | `eleven_v4` | studio config |
| Per-request settings | stability 0.5, similarity 0.85, prefix `[Indian English accent] `, fixed seed, 850-character chunks stitched with `previous_request_ids` | studio config, README Voice |
| Plan | Starter; Professional Voice Cloning not available | GET /v1/user/subscription |
| Model list | Not readable: the key lacks `models_read` | 403 on GET /v1/models |

The README says v4 ignores speed, style and speaker boost. ElevenLabs docs do not confirm this (not published).

## 2. What ElevenLabs publishes

| Claim | Label | Source |
|---|---|---|
| Lineup: `eleven_v4` (90+ languages, 10k characters), `eleven_v4_turbo` (about 100 ms), `eleven_v3` (70+, 5k), `eleven_multilingual_v2` (29, long form), `eleven_flash_v2_5` (about 75 ms), `eleven_multilingual_sts_v2` (speech to speech). Turbo v2.5 is deprecated | CONFIRMED | elevenlabs.io/docs/overview/models |
| v4 is "built on an entirely new architecture". Data, size, codec and paper: not published | CONFIRMED that nothing more is published | elevenlabs.io/blog/eleven-v4, elevenlabs.io/v4 |
| v4 launched 2026-09-28 with audio tags, natural-language direction, IPA pronunciation, stitching across long scripts | CONFIRMED | same; the-decoder.com (2026-09-29) |
| An instant clone "does not train or create a custom AI model"; it takes 1-2 minutes and "makes an educated guess". A professional clone trains a dedicated model on 30-180 minutes | CONFIRMED | elevenlabs.io/docs/creative-platform/voices/voice-cloning |
| On v4 an instant clone needs about 10 s, and "outperforms the Professional Voice Clones of Multilingual v2". Older clones need retraining for v4 | CONFIRMED (vendor claim) | elevenlabs.io/v4 |
| Stability sets "randomness between each generation": lower gives wider emotional range, higher gives a flatter voice. Similarity is adherence to the original voice | CONFIRMED | API reference, text-to-speech convert |
| v3 has Creative, Natural and Robust stability modes. Creative reacts most to audio tags | CONFIRMED for v3, not for v4 | v3 prompting docs |
| v4 and v3 have no SSML breaks | CONFIRMED | docs, best practices |
| Delivery already in the training data is easier to reproduce | REPORTED (search summary) | docs, best practices |
| Pronunciation benchmark 85.6% to 91.7%; first on Artificial Analysis; about 75% blind preference | REPORTED (vendor figures) | the-decoder.com |
| Codec, speech-LLM design, training data | not published; no ElevenLabs paper found | |

INFERRED: the clone is more energetic than the real speaker (29 st/s against 19.8) because the model adds text-driven delivery on top of the voice. This rests on our own metrics, not on any published design.

## 3. Gap analysis (INFERRED unless marked)

- ElevenLabs applies a text-driven prosody prior. Qwen3-TTS Base does not. Test e3 in round 8 gave identical audio with and without `instruct` (measured).
- ElevenLabs carries pacing across chunks with `previous_request_ids` (CONFIRMED). Our local takes are independent, one per sentence.
- Style instructions exist only on other Qwen checkpoints: CustomVoice (1.7B and 0.6B) and VoiceDesign (1.7B). Neither clones an arbitrary voice. No documented way to combine them with a clone was found. A community thread says emotion on a clone needs fine-tuning of the Base model.
- Qwen3-TTS (arXiv 2601.15621, Apache-2.0): the reference teaches pitch range and rhythm as well as timbre; the best reference length is 10-15 s (secondary source).
- Closable locally: reference energy, sampling, instruct-capable models. Hard to close: full text-aware prosody.

## 4. Ranked levers for the local voice

1. **Energetic reference from more data.** Cost: hours, free. Published videos give far more speech to choose a reference from than the 4.2 minutes of clean audio we have. The reference clip was the strongest lever in round 8 (F0 range 4.8 to 6.0 st). Stop when F0 range is 7.5 st or more with likeness at 0.65 or more, or two runs gain under 0.3 st.
2. **ElevenLabs clip as the reference.** Cost: 1 hour, free (audio already on disk). Risk: likeness drops. Check the ElevenLabs terms before any training on its output.
3. **VoxCPM2** (openbmb, Apache-2.0, 2B). Its model card documents cloning with a style instruction such as "(slightly faster, cheerful tone)". A 4-bit MLX build exists. Unknown: whether mlx-audio exposes the instruction, and whether the Indian accent holds. Stop when F0 range stays under 6.5 st or the "indian" accent share falls under 0.5 after 2 prompts.
4. **IndexTTS2** (arXiv 2506.21619). Separates speaker from emotion, so a Hark reference plus an energetic emotion clip is possible. Runs through mlx-indextts, slower than real time (reported 1.9 real-time factor on an M5 Max), English and Chinese only, non-commercial weights.
5. **Fine-tune Qwen3-TTS.** The official SFT is CUDA-oriented; MLX LoRA tools are early. 4.2 minutes of clean audio is thin, and tuning on ElevenLabs output pulls the voice toward ElevenLabs. It is the only route to instruct plus clone.

Dropped: Chatterbox (tried in earlier rounds; higher pitch, weaker accent), Fish Audio S2 Pro (non-commercial weights), Higgs Audio v3 (research licence, about 5B). Not checked: Orpheus, F5-TTS, CosyVoice, Zonos.

## 5. Open questions

- Which v4 settings ElevenLabs honours: not published.
- Whether the ElevenLabs terms allow training on its output: the Prohibited Use Policy page was not readable. Check it first.
- Non-commercial weights (IndexTTS2, Fish) may matter if the channel is monetised.
- Whether any LoRA keeps `instruct` working on Qwen3-TTS.
- Nothing here was tested locally except what the round 7 and 8 notes record.

## 6. Dataset build (stopped, not finished)

Hark asked to build a clean dataset of his voice from his published SSW TV and TinaCMS videos. The run started on 2026-10-14 and was stopped by Hark before it finished. No dataset exists yet. The partial downloads are in `~/Movies/done-video-research/voice-data/` and are not part of this repo.
