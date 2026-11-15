# Recorded sound effects

The anthem's happy and magic sounds are synthesized in `src/engine/gamesfx.py`.
The scream here is CC0. The SSW TV house sounds are SSW internal assets, so they are not in git: `scripts/ssw-sounds.sh` (in the skill folder) cuts them from the SSW TV originals into `~/.config/product-ad-video/sfx/sswtv/`, with the edits in this table. The engine finds them there, and plays synthesized stand-ins when they are missing.

| File | Source | Licence | Edit |
|---|---|---|---|
| `scream-comical.wav` | "Comical Scream (Woman)" by Boxwell, https://freesound.org/people/Boxwell/sounds/577972/ | CC0 1.0 (public domain) | trimmed to 0.95 s with a 0.2 s fade-out, levelled to -16 LUFS, 48 kHz mono |
| `sswtv/pop.wav` | SSW TV SFX assets: "Bo - for something pop up on screen.mp3" | SSW internal asset | from 0.044 s for 0.36 s, 0.06 s fade-out, 48 kHz mono |
| `sswtv/bubble.wav` | SSW TV SFX assets: "Message bubble of whatsapp.mp3" | SSW internal asset | from 0.488 s for 0.55 s, 0.1 s fade-out, 48 kHz mono |
| `sswtv/click.wav` | SSW TV SFX assets: "Mouse Click.mp3" | SSW internal asset | from 1.024 s for 0.36 s, 0.08 s fade-out, 48 kHz mono |
| `sswtv/typing.wav` | SSW TV SFX assets: "Typing sound.wav" | SSW internal asset | the first 14 s from 0.1 s, 48 kHz mono |

The SSW TV SFX assets live on the SSW TV SharePoint site, under General / 06-sswtv-assets / SSWTV-SFX-assets.
The SSW rule "Audio - Do you use sound effects to capture your audience's attention?" says when to use them.
CC0 allows commercial use with no credit.

A foley event plays a file here with `{"type": "sample", "file": "<name>.wav"}`.
Add `offset` (seconds into the file) and `span` (design seconds) to play a slice, such as a run of typing.
