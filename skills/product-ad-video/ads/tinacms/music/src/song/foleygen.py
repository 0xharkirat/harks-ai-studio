"""Writes cues/<cue>.foley.json from the picture sync table in ../docs/foley-sync.md.

The files are meant to be edited by hand afterwards. Rendering only reads them.
Run:  uv run python src/song/foleygen.py --force      (overwrites the json files)

Rules used when turning the picture table into sound:
- "keys a-b" means one keystroke on every 16th from a to b, both ends included. A few of them are
  space-bar hits (word breaks) so it does not sound like a machine gun.
- Everything is quiet (vel 0.4 to 0.8). Keystrokes accent the beat a little.
- Events that would crowd a hit already in the music are dropped: a mouse click or keystroke on the
  first note of the sonic logo, the Save click on a cut accent in fifteen, the down-whoosh on the verse
  break swell (anthem 15.0), the whoosh on the C#6 of the logo in six (3.5), the key on the six impact
  (1.5) and the dev pop on the first bar-20 hit (38.0).
- The commit pings of the music spec (anthem bridge, thirty Git, dev Git) and the data blips of the
  anthem cold open stay, because the music spec asks for them.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent.parent
STEP = 0.125


def keys(a, b, seed, vel=0.62, drop=(), space_every=7):
    """Keystrokes on every 16th from a to b inclusive."""
    rng = np.random.default_rng(seed)
    n = int(round((b - a) / STEP)) + 1
    out = []
    for i in range(n):
        t = round(a + i * STEP, 4)
        if t in drop:
            continue
        v = vel * (1.0 if i % 4 == 0 else 0.62 + 0.28 * rng.random())
        typ = "space" if (i + 3) % space_every == 0 and i > 0 else "key"
        out.append(dict(t=t, type=typ, vel=round(float(min(v, 1.0)), 2)))
    return out


def one(t, typ, vel=None, **kw):
    default = dict(click=0.7, pop=0.6, blip=0.45, whoosh=0.5, thud=0.65, ping=0.8, key=0.8, enter=0.9,
                   happy=0.8, magic=0.8, bubble=0.8)
    e = dict(t=t, type=typ, vel=default[typ] if vel is None else vel)
    e.update(kw)
    return e


def many(times, typ, notes=None, vel=None, **kw):
    out = []
    for i, t in enumerate(times):
        extra = dict(kw)
        if notes:
            extra["note"] = notes[i % len(notes)]
        out.append(one(t, typ, vel, **extra))
    return out


LOUD = {  # sections where the music is dense: foley is lifted 35 % (vel) so the picture sync stays audible
    "anthem": [(16.0, 32.0), (48.0, 56.0)],
    "anthem2": [(18.0, 26.0), (38.0, 46.0)],
    "thirty": [(6.0, 20.0)],
    "fifteen": [(2.0, 10.0)],
    "six": [],
    "dev": [(20.0, 28.0)],
}


def lift(cue, events):
    for e in events:
        if any(a <= e["t"] < b for a, b in LOUD[cue]):
            e["vel"] = round(min(1.0, e["vel"] * 1.35), 2)
    return events


def write(cue, events, force):
    p = ROOT / "cues" / f"{cue}.foley.json"
    if p.exists() and not force:
        print(f"keep {p.name} (exists, use --force to overwrite)")
        return
    events = sorted(lift(cue, events), key=lambda e: (e["t"], e["type"]))
    p.parent.mkdir(exist_ok=True)
    p.write_text("[\n" + ",\n".join("  " + json.dumps(e) for e in events) + "\n]\n")
    print(f"wrote {p.name}: {len(events)} events")


A5, B5, C6, E6, F6, A6 = 81, 83, 85, 88, 90, 93
SCREAM = "scream-comical.wav"   # the content editor's "aah" in anthem2 (music/assets/sfx, CC0)
# SSW TV's house sounds (music/assets/sfx/sswtv), as the SSW rule "use audio cues to get audience attention" asks.
SSW_POP = "sswtv/pop.wav"         # something pops up on screen
SSW_CHAT = "sswtv/bubble.wav"     # a chat message arrives
SSW_CLICK = "sswtv/click.wav"     # a mouse click on screen
SSW_TYPING = "sswtv/typing.wav"   # 14 s of real typing; each run plays its own slice


# Level (dB) of each SSW sound against the score, measured in the 0.7-7 kHz band: a pop, a chat bubble and a click
# peak 5 to 9 dB over the music, so each one reads over the beat (the old synth clicks and keys sat under it).
SSW_GAIN = {SSW_POP: 6.5, SSW_CHAT: 4.5, SSW_CLICK: 8.5, SSW_TYPING: -0.5}


def ssw(t, file, vel, gain=0.0, **kw):
    """One SSW TV sound at design time t; `gain` (dB) adds to the sound's base level."""
    return one(t, "sample", vel, file=file, gain=SSW_GAIN[file] + gain, **kw)


def typing(a, b, offset, vel=0.75, duck=2.5, gain=0.0):
    """SSW typing while the picture types keys a-b (16ths, both ends included): a slice that starts on a keystroke."""
    return ssw(a, SSW_TYPING, vel, gain, offset=offset, span=round(b - a + STEP, 4), duck=duck)


def anthem():
    ev = [one(0.0, "click", 0.6)]
    ev += keys(0.0, 1.75, 11)
    ev.append(one(2.0, "whoosh", 0.45, dur=0.45, up=True))
    # data blips of the cold open (music spec), after the typing stops
    ev += many([2.375, 2.75, 3.125, 3.25], "blip", [C6, F6, A6, E6], 0.4)
    ev.append(one(4.85, "pop", 0.55, note=A5))                      # edit box snaps around the logo
    ev.append(one(7.5, "whoosh", 0.45, dur=0.4, up=True))
    ev.append(one(8.0, "whoosh", 0.5, dur=0.45, up=True))
    ev += keys(8.5, 9.375, 12)
    ev.append(one(9.5, "pop", 0.5, note=E6))                       # "Saved" tick
    ev.append(one(10.0, "whoosh", 0.5, dur=0.45, up=True))
    ev += many([11.0, 11.5, 12.0, 12.5], "blip", [E6, C6, F6, A6], 0.42)   # chat messages
    ev.append(one(11.0, "click", 0.6))
    ev.append(one(11.5, "thud", 0.6))
    ev.append(one(12.0, "pop", 0.5, note=A5))
    ev.append(one(14.0, "whoosh", 0.5, dur=0.45, up=True))
    ev.append(one(14.5, "pop", 0.5, note=C6))
    # 15.0 whoosh (down) dropped: it would crowd the reverse swell of the break
    ev.append(one(15.5, "click", 0.8))                              # the click on black (music spec)
    ev += many([16.5, 16.875, 17.25, 17.5], "blip", [E6, F6, A6, F6], 0.42)
    ev.append(one(17.75, "click", 0.6))
    ev += keys(18.125, 19.75, 13)
    ev += many([21.0, 21.5], "click", None, 0.6)
    ev.append(one(22.0, "blip", 0.42, note=A6))
    ev += many([22.25, 22.5], "click", None, 0.6)
    ev.append(one(22.5, "pop", 0.55, note=C6))
    ev += many([25.0, 26.0, 27.0], "pop", [A5, C6, E6], 0.6)
    ev.append(one(28.0, "whoosh", 0.5, dur=0.45, up=True))
    ev.append(one(29.0, "click", 0.6))
    ev.append(one(29.75, "pop", 0.55, note=E6))
    ev.append(one(30.0, "whoosh", 0.45, dur=0.45, up=False))
    ev.append(one(32.0, "click", 0.7))
    ev += keys(33.0, 33.5, 14)
    ev.append(one(36.375, "pop", 0.55, note=C6))
    ev.append(one(37.0, "blip", 0.45, note=A6))                     # "Checks passed"
    # commit pings of the bridge (music spec), rising A6 B6 C#7 E7
    ev += many([32.0, 34.0, 36.0, 38.0], "ping", [93, 95, 97, 100], 0.8)
    ev.append(one(40.0, "whoosh", 0.5, dur=0.45, up=True))
    ev += many([40.75, 41.0, 41.25, 41.5, 41.75, 42.0, 42.5], "pop", [A5, C6, E6, A6, E6, C6, A5], 0.5)
    ev.append(one(43.5, "whoosh", 0.5, dur=0.45, up=True))          # the GraphQL card
    ev += keys(43.75, 45.0, 15, 0.55)                               # the query types
    ev += many([45.5, 45.75, 46.0], "pop", [C6, E6, A6], 0.5)        # Next.js, Astro, Hugo land
    # proof
    ev.append(one(48.5, "pop", 0.55, note=A5))
    ev += many([49.0, 49.5, 50.0, 50.5], "pop", [C6, E6, A6, E6], 0.5)
    ev.append(one(51.0, "ping", 0.7, note=A6))
    ev += many([52.5, 53.0, 53.5, 54.0, 54.5], "blip", [E6, F6, A6, F6, E6], 0.42)
    ev.append(one(55.0, "whoosh", 0.45, dur=0.45, up=False))
    # outro: the command types under the final chord, the last key (58.0) and the copy click are dropped
    ev += keys(56.5, 57.875, 16, 0.5)
    ev.append(one(57.0, "pop", 0.4, note=A5))
    ev.append(one(59.0, "whoosh", 0.35, dur=0.4, up=True))
    return ev


def thirty():
    ev = keys(0.25, 1.5, 21)
    ev.append(one(2.85, "pop", 0.55, note=A5))
    ev.append(one(5.5, "whoosh", 0.45, dur=0.4, up=True))
    ev += many([6.5, 6.875, 7.25], "blip", [E6, F6, A6], 0.42)
    ev.append(one(7.75, "click", 0.6))
    ev += keys(8.125, 9.75, 22)
    ev += many([15.0, 16.0], "pop", [A5, C6], 0.6)
    ev.append(one(16.75, "whoosh", 0.5, dur=0.4, up=True))
    ev.append(one(17.5, "click", 0.6))
    ev.append(one(18.5, "pop", 0.55, note=E6))
    ev.append(one(19.5, "whoosh", 0.45, dur=0.4, up=False))
    ev.append(one(20.0, "click", 0.7))
    # commit pings of the Git breakdown (music spec)
    ev += many([20.0, 21.0, 22.0, 23.0], "ping", [93, 95, 97, 100], 0.8)
    ev += keys(24.5, 25.875, 23, 0.5)
    ev.append(one(25.0, "pop", 0.4, note=A5))
    ev.append(one(27.0, "whoosh", 0.35, dur=0.4, up=True))
    return ev


def fifteen():
    ev = keys(0.25, 1.5, 31)
    ev.append(one(2.85, "pop", 0.55, note=A5))
    ev.append(one(4.3125, "click", 0.6))                           # 32nd before the first tagline key
    ev += keys(4.375, 5.75, 32)
    ev += many([6.5, 7.0], "pop", [C6, E6], 0.6)
    # 8.0 Save click dropped: it sits on the cut accent (crash, small boom)
    ev += keys(10.25, 10.875, 33, 0.5)
    ev.append(one(12.0, "whoosh", 0.35, dur=0.4, up=True))
    return ev


def six():
    ev = keys(0.125, 1.0, 51)
    # command keys 1.5-1.875: the 1.5 key is dropped (impact + crash at 1.5)
    ev += keys(1.5, 1.875, 52, 0.45, drop=(1.5,))
    ev.append(one(2.0, "pop", 0.45, note=A5))                       # the edit box snaps around the pill (on a groove beat)
    # 3.0 click dropped (first note of the logo), 3.5 whoosh dropped (C#6 of the logo)
    return ev


def dev():
    ev = keys(0.375, 2.875, 41, 0.7)
    ev.append(one(3.0, "enter", 0.9))
    ev += many([3.0, 3.125, 3.25, 3.375], "blip", [A6, E6, F6, C6], 0.55)
    ev.append(one(4.85, "pop", 0.55, note=A5))
    ev += many([6.75, 7.25, 7.75, 8.25, 8.75, 9.25, 10.0], "pop", [A5, C6, E6, A6, E6, C6, A5], 0.5)
    ev += keys(12.25, 13.5, 42, 0.5)
    ev.append(one(16.0, "whoosh", 0.5, dur=0.45, up=True))
    ev.append(one(17.5, "blip", 0.45, note=A6))
    ev.append(one(19.0, "key", 0.9))
    ev += many([20.5, 20.875, 21.25, 21.5], "blip", [E6, F6, A6, F6], 0.42)
    ev.append(one(21.75, "click", 0.6))
    ev += keys(22.125, 23.75, 43, 0.55)
    ev += many([25.0, 25.5, 26.25, 26.5], "click", None, 0.6)
    ev.append(one(26.5, "pop", 0.55, note=C6))
    ev.append(one(28.0, "click", 0.7))
    # commit pings of the Git section (music spec), beat 1 of bars 15-18
    ev += many([28.0, 30.0, 32.0, 34.0], "ping", [93, 95, 97, 100], 0.8)
    ev += keys(29.0, 29.5, 44, 0.5)
    ev.append(one(32.375, "pop", 0.55, note=C6))
    ev += many([36.0, 36.5, 37.0], "pop", [A5, C6, E6], 0.55)         # Next.js, Astro, Hugo
    # 38.0 pop ("Open source. Apache 2.0.") dropped: it sits on the first bar-20 hit (tom, crash, kick)
    ev += keys(40.25, 40.875, 45, 0.5)                             # 41.0 key and click dropped (logo)
    ev.append(one(42.0, "whoosh", 0.35, dur=0.4, up=True))
    return ev


def anthem2():
    """Anthem v2 (design time; the cue plays it at 100 BPM).

    SSW TV's house sounds, as the SSW rule 'use audio cues to get audience attention' asks: the chat bubble on each
    chat message, the pop on everything else that pops up, a real mouse click on each click the picture shows, and
    real typing on each run of keys. The characters keep their game-style reaction sounds: 'happy' when one cheers,
    a recorded 'aah' when the editor screams, 'magic' when the llama comes to help.
    `duck` (dB) makes the music step back under a sound, so it reads over the score."""
    ev = [typing(0.5, 2.5, 0.02)]                                    # the typing after a still half-beat
    ev += many([2.875, 3.125, 3.375], "blip", [C6, F6, A6], 0.4)     # data blips of the cold open
    ev.append(one(7.5, "whoosh", 0.45, dur=0.4, up=True))            # the logo flies to the corner
    # problem (8-18)
    ev.append(one(8.0, "whoosh", 0.5, dur=0.45, up=True))
    ev.append(ssw(8.5, SSW_POP, 0.8, duck=3.0))                     # the developer pops in
    ev.append(typing(8.5, 9.375, 2.84, gain=-7.0))                             # his last line types
    ev.append(one(9.5, "happy", 0.8, duck=3.0))                     # "Saved": his thumbs-up
    ev.append(one(10.5, "whoosh", 0.5, dur=0.45, up=True))           # the raw window
    ev.append(ssw(11.0, SSW_POP, 0.75, duck=2.0))                   # the content editor pops in
    ev.append(ssw(11.55, SSW_CLICK, 0.85, duck=2.0, hold=0.12))     # she clicks the headline line
    ev.append(one(12.0, "thud", 0.4))                               # the YAML error
    ev.append(one(12.0, "sample", 0.9, file=SCREAM, duck=5.0, hold=0.75))   # her "aah" (a CC0 recording), alone
    # The chat requests, 1.5 beats apart. Her 2 small clicks under them (12.6, 14.15) stay silent, so each message is clear.
    ev += [ssw(t, SSW_CHAT, 0.95, duck=3.5, hold=0.2) for t in (12.75, 13.5, 14.25, 15.0)]
    ev.append(one(15.6, "magic", 0.85, duck=4.0))                   # the llama rises; the 'ding' lands on its answer
    ev.append(ssw(17.6, SSW_CLICK, 0.9, duck=2.5, hold=0.12))       # the click that opens the editor
    # edit (18-26)
    ev += many([18.5, 19.25, 19.5], "blip", [E6, A6, F6], 0.42)
    ev.append(ssw(19.0, SSW_POP, 0.8, duck=3.5))                    # the content editor, smiling
    ev.append(ssw(19.75, SSW_CLICK, 0.85, duck=2.5, hold=0.12))     # click the headline
    ev.append(typing(20.125, 21.75, 4.598, duck=4.0, gain=7.0))                         # the new headline types
    ev.append(one(22.0, "happy", 0.9, duck=5.0))                    # her fist pump on "See it live."
    ev += [ssw(t, SSW_CLICK, 0.8, duck=2.0, hold=0.12) for t in (23.0, 23.5, 24.25, 24.5)]   # the image swap
    ev.append(one(24.0, "blip", 0.42, note=A6))
    # git (26-34): the cursor glides in and clicks Save on 27.0, the commit lands at 27.3
    ev.append(ssw(27.0, SSW_CLICK, 0.95, duck=3.0, hold=0.12))      # Save
    ev.append(typing(27.75, 28.25, 8.096))                          # the diff line types
    ev += many([27.3, 28.0, 30.0, 32.0], "ping", [93, 95, 97, 100], 0.8)   # commit pings, rising
    ev.append(ssw(30.375, SSW_POP, 0.7, duck=2.0))                  # the pull request card
    ev.append(one(31.0, "blip", 0.45, note=A6))                     # "Checks passed"
    # "Works with Astro. Next.js. Or bring your own." (34-38)
    ev += [ssw(t, SSW_POP, 0.9, duck=3.0) for t in (34.5, 35.0, 35.5)]
    # proof (38-46)
    ev += [ssw(t, SSW_POP, 0.7) for t in (39.0, 39.5, 40.0, 40.5)]
    ev.append(one(41.0, "ping", 0.7, note=A6))
    ev.append(ssw(42.25, SSW_POP, 0.8, duck=4.0))                   # callback: the developer, thumbs up
    ev.append(one(43.0, "happy", 0.9, duck=6.0))                    # callback: the content editor, fist pump
    ev.append(one(45.0, "whoosh", 0.45, dur=0.45, up=False))
    # outro: the command types under the final chord, the cursor clicks Copy, the QR code pops in
    ev.append(typing(46.5, 47.875, 9.822, duck=4.0, gain=7.0))
    ev.append(ssw(48.0, SSW_CLICK, 0.85, duck=2.5, hold=0.12))      # Copy
    ev.append(ssw(48.5, SSW_POP, 0.9, duck=3.0))                    # the QR code
    ev.append(one(49.0, "whoosh", 0.35, dur=0.4, up=True))
    return ev


if __name__ == "__main__":
    force = "--force" in sys.argv
    for name, fn in [("anthem", anthem), ("anthem2", anthem2), ("thirty", thirty), ("fifteen", fifteen), ("six", six), ("dev", dev)]:
        write(name, fn(), force)
