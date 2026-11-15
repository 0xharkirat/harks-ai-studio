FIRST RENDER READY (polish pass 1 done, see "Polish pass" below)

# TinaCMS ad music

Original instrumental soundtrack for the TinaCMS ad family.
The music and almost every sound effect are synthesized from code in this folder.
The exceptions are recorded sound effects in `anthem2`: the content editor's scream (CC0) and SSW TV's pop, chat bubble, mouse click and typing. See `assets/sfx/README.md`.
No music samples, no AI music, no AI voice.
TinaCMS owns the result outright.
The contract is `../docs/music-spec.md`.

## Render

    cd music
    uv sync                                      # Python 3.12 venv in .venv
    uv run python src/render.py                  # all 5 cues + sonic logo into out/ (30-100 s, 6 parallel workers)
    uv run python src/render.py --cue dev        # one cue: anthem thirty fifteen six dev logo
    uv run python src/render.py --timing-only    # only the timing.json files (no audio, 1 s)
    uv run python src/render.py --qc qc          # also per-section spectrogram PNGs in qc/
    uv run python src/render.py -v               # print the full QC report of every cue

The render is deterministic.
Two runs, and a run from a clean venv, give byte-identical WAV files.
A clean checkout renders everything in about 70 s (including `uv sync` and the numba compile).

## Outputs (`out/`, all committed)

| file | content |
|---|---|
| `<cue>.wav` | master, 48 kHz, 24-bit, stereo. Cues: `anthem` 64.0 s, `thirty` 30.0 s, `fifteen` 15.0 s, `six` 6.0 s, `dev` 45.0 s |
| `sonic-logo.wav` | the sonic logo alone with its natural tail, 5.0 s |
| `<cue>.timing.json` | sections and every event in seconds (format below) |
| `<cue>.envelopes.json` | 60 fps, frame *i* = *i*/60 s. Normalized 0-1 RMS per stem plus an `onset` curve |
| `<cue>.overview.png` | waveform, spectrogram, short-term loudness, section markers, stops in orange |
| `<cue>.qc.json` | the measured QC numbers of that render |

The foley input lives in `cues/<cue>.foley.json` (see "Foley").

### timing.json

`{ bpm, beatsPerBar, sampleRate, duration, musicDuration, sections[], events{} }`.
Every drum, fx and foley time is on the 16th grid (0.125 s), so it is a whole 60 fps frame at the 4th decimal.
`sections` are `{ id, name, startBar, endBar, start, end }` (bars 1-indexed, `endBar` inclusive).

`events` holds the spec keys and a few extras:

- spec keys: `kick snare clap hatClosed hatOpen crash impact` (times), `riser stop` (`{start,end}`), `foley` (`{t,type,...}`), `chords` (`{t,dur,name}`), `lead` (`{t,dur,midi}`), `logo` (`{t,dur,midi}`).
- `impact` lists the big picture-sync hits only (anthem 4.0, 16.0, 48.0; thirty 2.0; fifteen 2.0; six 1.5; dev 4.0, 20.0).
- `finalChord`: the big sustained final chord (a sub boom plus crash). It is also in `crash`, but not in `impact`.
- `endHit`: the soft end hit after the logo.
- `accent`: small hit on a picture cut (fifteen: 4.0, 6.0, 8.0). Also in `crash`.
- `hit`: a tom plus short crash (dev: every beat of bar 20). Also in `crash`.
- `logoStart`: start time of each full sonic logo. `logo` lists each note; the teaser notes have `teaser: true`; the bloom chord has `bloom: true`.
- `swell`: reverse cymbal swells. `keys`: piano stabs (rhythm, not harmony changes). `bass arp leadLayers shaker rim tick tom`: the rest of the score.
- `chords` lists harmony changes only (sustained supersaw and pad). Durations of chords, lead, bass and arp are rounded to the 16th grid.
- Kick, snare, hats, crash and impact times are the scheduled times. Measured audio onset latency is 0 to 1 ms (`qc.json`).

### envelopes.json

`{ fps, frames, duration, master, kick, snare, hats, bass, chords, arp, lead, fx, foley, logo, onset }`.
`hats` includes ticks and rim.
`chords` includes the keys.
Each curve is normalized to its own maximum.
An RMS peak can trail its hit by 1 frame because the window is centred on the frame.
The `onset` curve peaks on the hit frame.

## The song

Key A major, 120 BPM, 4/4.
The verses lean on F#m.
Every pitched note is in the key (886 notes checked in `anthem`, none out).

**Chorus progression** (one chord per bar, two phrases of four bars):
`A | E/G# | F#m7 | Dadd9` (I, V6, vi7, IVadd9; bass line A G# F# D).
The second phrase ends `Dadd9 | E` for a turnaround.
Voicings move by 0 to 2 semitones between chords.

**Lead hook** (saw plus pulse, delayed vibrato, ping-pong delay).
Bar 1 over A: E5 A5 B5 . A5 E5 C#5 in a 3-3-2 / 3-3-2 rhythm.
Bar 2 over E/G#: B4 E5 G#5 . F#5 E5 B4.
Bar 3 over F#m7: C#5 E5 F#5 A5 (long) F#5 E5.
Bar 4 over Dadd9: F#5 E5 D5 E5 (long, the 9th, it ties into the repeat).
The hook starts with E A B, the first three notes of the sonic logo.
No lead note sits a half step from a chord tone.

**Sonic logo** (the main idea, ends every cue).
Five notes: E5 A5 B5 on three quick 16ths (0, 0.125, 0.25 s), then C#6 at 0.5 s and E6 at 0.75 s, with the last note blooming into an A major bell chord (A5 C#6 E6, a soft E7 above). The rhythm is x x x . x . x on the 16th grid.
It is a glass bell (inharmonic partials, stereo beating, FM shimmer) layered with a bright pluck.
It is rising, and the last note lands on the tonic triad.
The run notes ring about 0.4 s so the line stays clear; the last chord rings 2.6 s. The main body is about 1.5 s long, the tail is natural.
It sits over the final chord (Aadd9), and every note fits Aadd9, F#m11, Dmaj13 and E sus.
Teaser: a muted bell plays the first four notes (E5 A5 B5 C#6) in the intro and stops before E6, so the line hangs until the real logo resolves it.

### What each cue sounds like

**anthem** (62 s of music, file 64.0 s)

| time | section | sound |
|---|---|---|
| 0-4 | cold open | F#m9 pad (low-pass sweeps 500 to 3200 Hz), sub drone, typed keys on 16ths, data blips, muted-bell teaser, noise riser 2.0-3.5, full stop 3.5-4.0 |
| 4-8 | title | big impact (55 Hz boom, noise thump) and crash at 4.0, sonic logo over held Aadd9 (supersaw plus pad), light groove from 6.0 |
| 8-16 | verse | F#m7 Dmaj7 A/C# E: kick on 1, 2&, 3&, claps 2 and 4, 8th hats, ticks, muted pluck bass, FM electric piano stabs, soft pad. Break 15.0-16.0: drums out, reverse swell, mouse click at 15.5 |
| 16-32 | chorus 1 | drop at 16.0 (crash, impact). Four on the floor, claps layered with snare, offbeat open hats, 16th hats and shaker, offbeat sub-saw bass, 7-voice supersaw chords pumped by the kick (62 % duck), lead hook. Bars 13-16 add a 16th pluck arp and a quiet third-below harmony; crash at 24.0; snare fill at bar 16 beat 4 |
| 32-40 | bridge: Git | half-time (kick 1 and 3&, snare on 3), filtered chords (650 to 3000 Hz), 16th plucks, ticks, commit pings on beat 1 of bars 17-20 (they rise A6 B6 C#7 E7) |
| 40-48 | build | four on the floor, rising hats, high-pass sweep on the chords, snare roll (8ths in bar 23, 16ths in bar 24), pluck pedal, noise riser from 38.0, full stop 47.5-48.0 |
| 48-56 | final chorus | drop 2 at 48.0 (biggest hit), same hook with an octave layer and a third harmony, extra octave-up supersaw, louder arp, crash at 52.0 |
| 56-64 | outro | big Aadd9 chord at 56.0 (crash, boom, lead tag on A5), groove thins to two kicks, reverse swell, sonic logo at 58.0 (chord ducked 4 dB under it), soft end hit at 60.0, tail to silence |

**thirty** (30.0 s): filtered chorus chords, riser and teaser (0-1.875), 1/16 dropout, impact + logo at 2.0, chorus groove with the hook 6-14, blocks 14-20 (crash 14.0, fill bar 10 beat 4), Git breakdown with pings 20-24, final chord 24.0, logo 26.0, end hit 28.0, silence by 29.9.

**fifteen** (15.0 s): same hook intro, impact at 2.0, the 4-bar hook over 2-10 with a reverse swell, crash and small boom on each cut (4.0, 6.0, 8.0), final chord 10.0, logo 11.0, end hit 13.0, silence by 14.9.

**six** (6.0 s bumper, added on request): typing, filtered chords and a short riser 0-1.5, impact + crash at 1.5, one second of groove with the first hook notes (E5 A5 B5 resolving to A5), final chord 2.5, logo 3.0, end hit 5.0, silence by 5.9.

**dev** (44.0 s of music, file 45.0 s): the same key family, darker and more mechanical.
Sections run in F#m (F#m7 Dmaj7 A/C# E) with a different groove: sparse kick on 1, 2& and 3&, side-stick on 2 and 4, 16th hats, ticks, a rolling dark saw/square bass with a filter snap, pluck arps, toms.
Terminal: typed command, enter clunk 3.0, blips 3.0-3.5, stop 3.5-4.0.
Impact + logo at 4.0.
Riser in bar 10, 1/16 dropout, then the drop at 20.0 plays the anthem chorus hook (same notes, same lead) over a harder kick.
Git 28-36 with pings, build 36-40 with a hit on every beat of bar 20 (tom plus crash plus kick), final chord 40.0, logo 41.0, end hit 43.0, fade 44.0-44.95.

## Foley

`cues/<cue>.foley.json` is a list of `{ "t": 15.5, "type": "click" }`.
The render reads it, so the director can add or move picture-sync sounds and re-render (`uv run python src/render.py --cue anthem`, about 20 s).
Keep `t` on the 16th grid (multiples of 0.125 s) so it stays in sync with the groove.

| `type` | sound | optional fields |
|---|---|---|
| `key` | one keyboard key-down (6 variants, rotated) | `vel` |
| `space` | space bar | `vel` |
| `click` | mouse click (down and up) | `vel` |
| `enter` | return-key clunk | `vel` |
| `pop` | a block lands | `note` (MIDI, keep it in A major), `vel` |
| `ping` | bright commit ping | `note` (default 93, A6) |
| `blip` | short data blip | `note` (default: a pentatonic note picked by event index) |
| `tick` | tiny click | `vel` |
| `whoosh` | panel slide | `dur` (s), `up` (true/false), `vel` |
| `thud` | dull error thump with a small bounce | `vel` |

Aliases: `error` = `thud`, `type`/`typing` = `key`, `mouse` = `click`, `commit` = `ping`, `return`/`clunk` = `enter`, `slide`/`swoosh` = `whoosh`.
All fields: `vel` 0-1 (default 1), `pan` -1..1.
An unknown type stops the render with an error that names the type.
Events inside a declared stop are muted.
`uv run python src/song/foleygen.py --force` rebuilds the files from the picture table `../docs/foley-sync.md` (it overwrites your edits). The generator documents its choices in its header.

Foley pass for the final picture (all five cues): every event of `docs/foley-sync.md` is in the json, quiet (vel 0.4 to 0.8, lifted 35 % inside the dense choruses so they stay audible), with these exceptions that would crowd a musical hit:

- dropped: the copy click and the last keystroke on the first note of the sonic logo (anthem 58.0, thirty 26.0, fifteen 11.0, dev 41.0, six 3.0).
- dropped: six 1.5 key (impact + crash), six 3.5 whoosh (C#6 of the logo), fifteen 8.0 Save click (cut accent), anthem 15.0 down-whoosh (reverse swell of the break), dev 38.0 pop (first bar-20 hit).
- kept for the music spec: the commit pings (anthem 32/34/36/38, thirty 20-23, dev 28/30/32/34, rising A6 B6 C#7 E7) and the four cold-open data blips of anthem.
- anthem 57.0 pop stays at low level (vel 0.4) on the kick of the final-chord groove. Whooshes after the logo (anthem 59.0, thirty 27.0, fifteen 12.0, dev 42.0) are at vel 0.35.
- `4.3` (32nd) in fifteen is rendered at 4.3125.

## Engine (`src/`)

- `engine/dsp.py`: PolyBLEP saw and pulse oscillators, a supersaw bank, TPT state-variable filter with per-sample cutoff, RBJ EQ, ADSR, oversampled tanh shaper. Pitched voices run at 4x oversampling.
- `engine/fx.py`: 8-line FDN reverb (plate, hall, room, big), ping-pong delay, chorus, M/S width, mono-below-120 Hz, compressor, sidechain duck curve, look-ahead true-peak limiter (detects on a 4x oversampled signal).
- `engine/synths.py`: glass bell, bright pluck, supersaw chord, pad, FM electric piano, lead, sub bass, pluck bass, dark bass.
- `engine/drums.py`: kick, snare, clap, rim, tom, hats, shaker, crash (band-split noise, highs decay first), reverse swell, impact, riser, downlifter, whoosh, and the UI foley (key, space, click, enter, pop, blip, tick).
- `song/theory.py`: key, chords and voicings, the hook, the sonic logo.
- `song/blocks.py`: reusable arrangement blocks (drum grooves, bass patterns, chords, arps, hook).
- `song/cues.py`: the five arrangements. They share the blocks, the hook, the sounds and the logo.
- `song/score.py`: the event container. It is the render input and the source of `timing.json`.
- `song/instruments.py`: score events to dry stems (cached notes).
- `song/mix.py`: channel strips, sends, sidechain, stops, energy plan, master.
- `song/export.py`, `song/analysis.py`, `song/qc_report.py`: exports and QC. `src/qc.py`, `src/diag.py`, `src/diag2.py` are command-line checks.

Signal flow: events, dry stems (kick, snare, hats, perc, bass, chords, keys, arp, lead, fx, foley, logo), strips (EQ, saturation, own reverb and delay sends, kick sidechain, stem gain automation, stop gate), sum, energy plan ride, master (glue compressor, tone, mono low end, fade, soft clip, limiter), loudness trim to -14 LUFS.

**Energy plan.**
Each cue declares the loudness it wants per section in `S.plan(...)` (dB relative to the loudest segment).
The render measures each segment and rides the section gain, six passes at most, until every segment is within 0.3 dB of the plan.
A gain step ramps in over the 150 ms before the segment starts, so the new level is full on the downbeat.
To change the energy curve, edit the plan of that cue in `song/cues.py`.
To change the balance inside a section, use `S.stem_gain(stem, t0, t1, dB)` or the strip gains in `song/mix.py`.

## QC (measured on the final files by `src/qc.py` and `song/qc_report.py`)

| cue | length | LUFS int. | true peak | sample peak | low end <120 Hz side/mid | limiter GR max | AAC 320k peak | clicks | out-of-key notes |
|---|---|---|---|---|---|---|---|---|---|
| anthem | 64.0 s | -14.0 | -1.50 dBTP | -1.6 dBFS | -33 dB | 2.1 dB | -1.3 dBFS | 0 | 0 of 886 |
| thirty | 30.0 s | -14.0 | -1.50 dBTP | -1.5 dBFS | -33 dB | 1.1 dB | -1.3 dBFS | 0 | 0 of 337 |
| fifteen | 15.0 s | -14.0 | -1.50 dBTP | -1.8 dBFS | -33 dB | 1.4 dB | -1.6 dBFS | 0 | 0 of 150 |
| six | 6.0 s | -14.0 | -1.50 dBTP | -1.5 dBFS | -31 dB | 2.2 dB | -1.5 dBFS | 0 | 0 of 60 |
| dev | 45.0 s | -14.0 | -2.00 dBTP | -2.1 dBFS | -32 dB | 2.2 dB | -1.4 dBFS | 0 | 0 of 595 |
| sonic-logo | 5.0 s | -14.0 | -3.3 dBTP | -3.3 dBFS | -26 dB | 0 dB | -3.3 dBFS | 0 | 0 of 15 |

The master ceiling is -1.5 dBTP (`CEILING_DB` in `song/mix.py`), so AAC 320k files stay under -1.0 dBTP after encoding.
`dev` has its own ceiling of -2.0 dBTP (`S.ceiling_db` in `song/cues.py`): at -1.5 the AAC file overshot to -0.9 dBFS.
The AAC column was measured with `ffmpeg -c:a aac -b:a 320k` and `ebur128=peak=true`.

True peak is measured on an 8x oversampled signal of the 24-bit file.
No clipped samples, DC below 1e-4, L/R level difference 0.05 dB.

**Loudness per section** (integrated LUFS of the final file; the plan targets are in `cues.py`):

| cue | sections |
|---|---|
| anthem | open -22.7, title -16.6, verse -18.8, chorus 1a -12.2, chorus 1b -12.0, bridge -18.2, build -15.1, final chorus -11.0, outro -14.7 |
| thirty | hook -21.3, title -17.1, edit -12.4, blocks -12.3, git -18.3, cta -15.1 |
| fifteen | hook -21.7, features -12.7, cta -16.2 |
| six | hook -19.6, impact -10.6, cta -14.6 |
| dev | terminal -23.0, schema -15.6, graphql -14.9, edit -11.0, git -15.9, frameworks -12.8, cta -14.2 |

Other checks, all in `out/<cue>.qc.json`:

- **Grid:** every scheduled drum, fx and foley time is a multiple of 0.125 s (error 0). Measured audio onset latency: kick, snare, crash, impact and logo 0 to 1 ms (the rare 15-20 ms values are inaudible hats under a noise floor).
- **Stops:** 3.5-4.0 and 47.5-48.0 in anthem are digital silence. The 1/16 s dropouts before an impact fall below -60 dB in 20 ms.
- **Tails:** every file ends in digital silence in its last 100 ms (fade ends 0.05 to 0.1 s before the end). The anthem tail fades from 62.6 s and is silent by 63.9 s, so it is fully faded at 64.0 s.
- **Dead air:** no stretch of 120 ms below -60 dBFS outside the declared stops.
- **Cue points:** impact, drop, crash, riser end, stop, logo and end hit times match the spec tables (see `timing.json`).
- **Spectral balance:** 2-5 kHz sits 7 to 8 dB under 0.5-2 kHz in the choruses (no harshness), 5-10 kHz 6.5 to 7 dB, 10-20 kHz 8 to 9 dB. The 40-80 Hz band is 3.5 to 4.5 dB over 630-1250 Hz.
- **Click scan:** a second-difference scan of every dry stem and every post-strip stem (threshold -50 dBFS, ratio over 14) finds nothing in anthem. Dev flags saw edges of the distorted dark bass, which are not clicks.
- **Spectrograms:** every section of anthem and dev (`--qc qc`), the one-shots, and the logo were inspected.

## Polish pass 1: measured defect list

Ranked by audibility. "Before" is the first render (git `3d700c3`), "after" is now.

1. **Flat energy curve: fixed.**
   The final chorus was as loud as chorus 1, and the build and bridge were as loud as the choruses. Section LUFS in anthem: before open -18.1, title -15.1, verse -15.7, chorus 1 -13.1 / -13.2, bridge -14.3, build -13.1, final -13.0, outro -15.5 (spread 5.1 dB). After: -22.7, -16.6, -18.8, -12.2 / -12.0, -18.2, -15.1, -11.0, -14.7 (spread 11.7 dB, final chorus 1.3 dB over chorus 1, every segment within 0.3 dB of its plan).
2. **Kick tail was a continuous hum: fixed.**
   Saturation lifted the decaying tail, so the kick still stood at -9.3 dB 0.4 s after the hit and covered the offbeat bass. After: -37.5 dB at 0.4 s (-9.7 dB at 0.1 s, -24 dB at 0.25 s).
3. **No impact: fixed.**
   The 4.0 impact had the same level as the bed after it (RMS 0-150 ms -18.4 dBFS, then -18.5, peak -5.6 dBFS) and the final chord hit (-19.8 dBFS) was 8 dB below the final chorus (-11.9 dBFS). After: the energy plan has short hit segments. Impact 0-150 ms -15.2 dBFS, then -21.5 dBFS from 0.5 s on, peak -2.5 dBFS. Final chord hit -14.6 dBFS, peak -1.3 dBFS. The drops sit at -12.9 and -12.3 dBFS.
4. **Stem balance: fixed.**
   Pre-master, solo LUFS in chorus 1 were kick -7.1, snare -11.5, bass -10.6, chords -24.8, lead -19.2, hats -31.1, so the chords sat 17.7 dB under the kick. After: kick -15.2, snare -15.8, bass -14.1, chords -13.1, lead -13.3, hats -20.6.
5. **Low end too heavy and cold open too bassy: fixed.**
   The 40-80 Hz band stood 18.1 dB over 630-1250 Hz in chorus 1 (open 15.2, bridge 15.9). After: 4.4 (open 9.6, bridge 10.4; the sparse sections stay low-weighted on purpose).
6. **Click at a filter step: fixed.**
   The chord low-pass jumped from 20 kHz to 3.2 kHz at 15.0 (the start of the verse break). That made a click (second-difference ratio 15.7 in the first render). After: every sweep has a 50 ms entry ramp and a 15 ms exit ramp. No click candidates in any file.
7. **Aliasing in supersaw, lead and pluck: fixed.**
   Residual versus an 8x reference: before (2x oversampling) supersaw -43.6 dB, lead -48.3 dB, pluck -49.9 dB. After (4x): -57.2, -61.9, -63.6 dB.
8. **Corners in the sub bass envelope: fixed.**
   Each sub note had a slope kink 4 ms after the start (second-difference ratio 21, 78 flagged spots in anthem at the -50 dB scan) and one at its release. After: raised-cosine attack and release, 0 flagged spots in anthem.
9. **Master compressor worked as a fixed gain cut: fixed.**
   Threshold at -16 dBFS on a mix that peaked at +4.9 dBFS meant a mean gain reduction of 6.1 dB in the choruses and 3.0 dB in the verse, so it flattened the sections. After: threshold 7 dB under the mix peaks. Maximum gain reduction 8.0 dB to 4.4 dB, and the quiet sections are untouched.
10. **Logo did not read over the chord: fixed.**
    Under the logo the sustained chord was as loud as the bells (title: chords -10.9 LUFS, logo -10.8; outro: chords -8.6, logo -10.6). After: the chord ducks 4 dB and the bass 1.5 dB under the logo, and the logo stem gets +1.5 dB (title: chords -13.9, logo -9.5; outro: chords -11.5, logo -9.1, so the logo is 2.4 to 4.4 dB above the chord). The run notes also ring shorter (about 0.4 s instead of 1.5 s) so the five notes stay separate.
11. **Typed foley nearly inaudible: fixed.**
    In the cold open the keys peaked at -17.7 dBFS against a pad peak of -6.9 dBFS. After: foley strip +4 dB.
12. **Timing data errors: fixed.**
    Dev had two stacked kicks at the same time in the Git section, kick events with velocity 0 in `timing.json`, and its groove started at 6.0 instead of 4.0. After: all events are audible and the section bars match the spec.
13. **Tails did not reach silence: fixed.**
    RMS of the last 100 ms was -57.5 dBFS in six, -66.5 in fifteen, -73.3 in thirty. After: digital silence in the last 100 ms.
14. **Dark top end: improved.**
    5-10 kHz was 10.2 dB under 0.5-2 kHz in chorus 1 and 10-20 kHz 12.2 dB. After a +3 dB high shelf at 5.5 kHz, a +2 dB hat trim and a +2 dB low-mid lift at 230 Hz: 6.6 and 7.8 dB. The 2-5 kHz band was left alone on purpose.

Checked, no change needed: mono low end (side/mid at least 26 dB below mid under 120 Hz, L/R correlation above 0.997), L/R level balance (0.05 dB), clipped samples (0), DC offset, mono fold-down loss (0.3 to 0.8 dB per section), onset latency, key membership, harmonic clashes of the hook against the chords (none), determinism, render time.

## Known limits

- Nothing was auditioned by ear. All checks are numeric or visual (spectrograms), as the brief required.
- The sounds are synthetic. Taste decisions that remain: lead timbre and brightness, how wide the supersaw sounds, hat brightness, impact weight, reverb amount. They are one-line changes in `engine/synths.py` or the strip table in `song/mix.py`.
- The tonal reference curve is a rule of thumb for modern electronic masters, not a measurement of a specific song.
- The 1/16 s dropout before an impact (thirty, fifteen, six, dev bar 10) is an addition to the spec. It is listed in `stop` in `timing.json`. Delete the `pre_impact_stop` line in `song/cues.py` to remove it.
