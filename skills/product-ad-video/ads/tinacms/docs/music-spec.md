# Music spec: the TinaCMS ad soundtrack

Original instrumental music for a family of TinaCMS ads.
The picture is cut to this music bar by bar, so the tempo, the structure and the cue points below are hard requirements.
Everything else is creative freedom.

No vocals and no voice.
No samples from the internet and no AI music services.
Everything is synthesized from code, so TinaCMS owns the result outright and no Content ID claim can hit an ad.

## Mood

Bright, confident, optimistic, modern.
Melodic future house / electro-pop: the feel of a polished developer-tool launch film.
Punchy and clean, never cheesy, never "stock corporate ukulele".
The verses are cooler and more mechanical (keys, ticks, typing foley as percussion).
The choruses open into wide, warm, colourful supersaw chords with a catchy lead hook.

## Global

- Tempo **120 BPM exactly**, 4/4, straight. beat = 0.5 s, bar = 2.0 s, 16th = 0.125 s.
  The video is 60 fps, so a beat is exactly 30 frames. Keep every event on the 16th grid.
- Bar 1 beat 1 = t 0.000 s. No pre-roll.
- 48 kHz, 24-bit, stereo WAV.
- Master: about -14 LUFS integrated (the online ad target), true peak at or below -1.0 dBTP, no clipping, no DC, mono low end below about 120 Hz.
- Suggested key: A major, with the verses leaning on F#m colour. Change it if another key sounds better.

## The sonic logo (most important)

A short signature motif of 4 or 5 notes on a glassy bell layered with a bright pluck, about 1.5 s long, rising and resolving, memorable after one hearing.
It is TinaCMS' sound: every cue ends with it, under the logo and call to action.
It is also teased in each intro and may be quoted inside choruses.
Render it standalone too (`out/sonic-logo.wav`, with a natural tail).

## Cues

There are 4 cues.
`anthem` is the main song.
`thirty` and `fifteen` are edits of the same song (same key, same hook, same sounds) so the ads feel like one campaign.
`dev` is a variation for developers: same motif and key family, darker and more mechanical arrangement, a different groove.

Bars are 1-indexed.
`at(bar)` = (bar - 1) x 2.0 s.

### Cue `anthem`: 31 bars = 62.0 s, then a tail of at most 2.0 s (file at most 64.0 s)

| bars | time (s) | section | picture | music |
|---|---|---|---|---|
| 1-2 | 0-4 | cold open | raw Markdown typed on a dark screen, a blinking caret | quiet: typing foley on 16ths, soft filtered pad, data blips, sonic-logo teaser on a muted bell in bar 1; noise riser through bar 2; bar 2 beat 4 (3.5-4.0) full stop |
| 3-4 | 4-8 | title | **IMPACT at 4.0**: TinaCMS logo slams in, tagline | impact + crash at 4.0, sonic logo on the bell over a held chord, light groove enters at bar 4 |
| 5-8 | 8-16 | verse: the problem | developers ship Markdown, editors are lost | verse groove: kick, clap on 2 and 4, closed hats, muted plucky bass, cool chords; bar 8 beats 3-4 (15.0-16.0) break: drums out, one reverse swell, a single mouse **click at 15.5** |
| 9-16 | 16-32 | chorus 1: visual editing (9-12) then blocks (13-16) | click, edit, see it live; then the page builder | **DROP at 16.0**: crash + impact, four-on-the-floor, offbeat open hats, supersaw chords, lead hook; crash again at 24.0; short fill bar 16 beat 4 |
| 17-20 | 32-40 | bridge: Git | save, commit, branch, merge | half-time, filtered, mechanical: plucks, ticks, a bright "commit" ping on beat 1 of bars 17, 18, 19 and 20; build starts in bar 20 |
| 21-24 | 40-48 | build: developers | TypeScript schema, GraphQL, frameworks | rising pre-chorus, snare roll bars 23-24 (8ths, then 16ths), noise riser; **bar 24 beat 4 (47.5-48.0) full stop** |
| 25-28 | 48-56 | final chorus: proof | open source, showcase mosaic | **DROP 2 at 48.0**, the biggest energy (optionally +1 semitone); crash at 48.0 and 52.0 |
| 29-31 | 56-62 | outro: call to action | logo + `npx create-tina-app@latest` + tina.io | big sustained final chord at 56.0, groove thins out; **sonic logo at 58.0**; one soft end hit at 60.0; tail to silence |

### Cue `thirty`: 15 bars = 30.0 s exactly (fade the tail inside 30.0 s)

| bars | time (s) | section | music |
|---|---|---|---|
| 1 | 0-2 | hook (a live edit already happening on screen) | typing foley, filtered chorus chords, riser; sonic-logo teaser |
| 2-3 | 2-6 | **IMPACT at 2.0**: logo + tagline | impact + crash, sonic logo, groove enters |
| 4-7 | 6-14 | visual editing | chorus groove, lead hook |
| 8-10 | 14-20 | blocks | chorus continues, crash at 14.0, fill bar 10 beat 4 |
| 11-12 | 20-24 | Git | breakdown-lite: commit pings on 20.0, 21.0, 22.0, 23.0; riser |
| 13-15 | 24-30 | call to action | final chord at 24.0, **sonic logo at 26.0**, end hit at 28.0, silence by 30.0 |

### Cue `fifteen`: 15.0 s exactly

| time (s) | section | music |
|---|---|---|
| 0-2 | hook | typing foley, riser, filtered chords |
| **2.0** | impact: logo | impact + crash |
| 2-10 | 4 features, 2 s each (cuts at 4.0, 6.0, 8.0) | chorus groove with a clear accent on each cut |
| 10-15 | call to action | final chord at 10.0, **sonic logo at 11.0**, end hit at 13.0, silence by 15.0 |

### Cue `dev`: 22 bars = 44.0 s, then fade out by 45.0 s (file 45.0 s)

| bars | time (s) | section | picture | music |
|---|---|---|---|---|
| 1-2 | 0-4 | terminal | `npx create-tina-app@latest` typed, Enter | typing foley on 16ths, enter-key **clunk at 3.0**, fast data blips 3.0-3.5, stop at 3.5-4.0 |
| 3-6 | 4-12 | schema | logo at 4.0, then TypeScript schema turning into form fields | **impact at 4.0**, sonic logo; mechanical groove (ticks, side-stick, sub) |
| 7-10 | 12-20 | GraphQL | typed query, autocomplete, data | groove + arp, riser in bar 10 |
| 11-14 | 20-28 | visual editing for the team | the editor UI | **DROP at 20.0**, chorus hook (same hook as `anthem`) |
| 15-18 | 28-36 | Git | commits, pull request, merge | continues, commit pings on beat 1 of bars 15-18 |
| 19-20 | 36-40 | frameworks + open source | names of frameworks on beats | builds, a hit on every beat of bar 20 |
| 21-22 | 40-44 | call to action | logo + command | final chord at 40.0, **sonic logo at 41.0**, tail and fade to 45.0 |

## Foley (mechanical percussion and picture sync)

The picture uses UI sounds as rhythm: keyboard typing, mouse clicks, a soft "whoosh" when a panel slides, a "pop" when a block lands, a bright "ping" for a Git commit, an "enter" clunk.
Make these tasteful, quiet, and quantized to the 16th grid.
Keep the foley data-driven: each cue reads `music/cues/<cue>.foley.json` (`[{ "t": 15.5, "type": "click" }, ...]`), so the director can add or move picture-sync sounds later and re-render.
Write a first version of every foley file yourself from the tables above.

## Deliverables (all under `music/`)

- `src/...`: your own synth, sequencer, composition and mix engine, reproducible with one command, documented in `music/README.md`.
  Python with a uv venv in `music/.venv` is fine (numpy, scipy, soundfile, pyloudnorm, numba ...).
  You may read the `music` folder of a local clone of `fuma-nama/fumadocs-mv` to learn techniques, but write your own code: do not copy its files.
- `out/<cue>.wav` for `anthem`, `thirty`, `fifteen`, `dev`, and `out/sonic-logo.wav`.
- `out/<cue>.timing.json`: `{ bpm, beatsPerBar, sampleRate, duration, sections: [{ id, name, startBar, endBar, start, end }], events: { kick: [t], snare: [t], clap: [t], hatClosed: [t], hatOpen: [t], crash: [t], impact: [t], riser: [{ start, end }], stop: [{ start, end }], foley: [{ t, type }], chords: [{ t, dur, name }], lead: [{ t, dur, midi }], logo: [{ t, dur, midi }] } }`.
- `out/<cue>.envelopes.json`: per 60 fps frame (frame i = i / 60 s), normalized 0-1 RMS for master, kick, snare, hats, bass, chords, lead, fx, plus an onset curve.
- `out/<cue>.overview.png`: waveform + spectrogram + short-term loudness with section markers.

## Quality checks (you cannot listen, so verify by analysis)

Measure integrated loudness and true peak per cue; check the loudness per section follows the energy curve above; check every pitched note against the key; check onsets land on the grid; look at spectrograms of every section.
Avoid aliasing (PolyBLEP or oversampling), clicks (fade every note), mud (high-pass non-bass parts, sidechain to the kick), harshness (tame 2-5 kHz on the lead), stereo problems (mono bass), and dead silence where the table does not ask for it.
Make sure each cue ends cleanly at its stated length.
