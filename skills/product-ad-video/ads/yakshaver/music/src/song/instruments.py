"""Turns score events into dry stem audio (with caches for repeated notes)."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import numpy as np

from engine import drums, gamesfx, synths
from engine.dsp import SR, butter_hp, butter_lp, fade_edges
from .theory import CHORDS, STEP, logo_motif

_CACHE: dict = {}


def _h(s):
    return sum((i + 1) * ord(c) for i, c in enumerate(s))


def cached(key, fn):
    if key not in _CACHE:
        _CACHE[key] = fn()
    return _CACHE[key]


def place(buf, sig, t, gain=1.0, pan=0.0, tail_fade=0.01):
    """Add sig (mono or stereo) into buf (N,2) at time t seconds."""
    i0 = int(round(t * SR))
    if i0 >= buf.shape[0] or gain == 0.0:
        return
    n = sig.shape[0]
    if i0 < 0:
        sig = sig[-i0:]
        n = sig.shape[0]
        i0 = 0
    i1 = min(buf.shape[0], i0 + n)
    seg = sig[: i1 - i0]
    if seg.ndim == 1:
        a = (pan + 1.0) * np.pi / 4.0
        buf[i0:i1, 0] += seg * gain * np.cos(a) * 1.4142
        buf[i0:i1, 1] += seg * gain * np.sin(a) * 1.4142
    else:
        buf[i0:i1] += seg * gain
    # if clipped by the end of the buffer, fade the last few ms to avoid a click
    if i0 + n > buf.shape[0]:
        k = min(int(tail_fade * SR), i1 - i0)
        w = np.linspace(1.0, 0.0, k)
        buf[i1 - k:i1] *= w[:, None]


def _q(vel, steps=3):
    return round(vel * steps) / steps


# --------------------------------------------------------------------------- foley


FOLEY_ALIASES = {"error": "thud", "type": "key", "typing": "key", "keystroke": "key", "mouse": "click", "commit": "ping", "return": "enter", "clunk": "enter", "swoosh": "whoosh", "slide": "whoosh"}


def apply_cuts(events, cuts):
    """Follow Score.cut_span: drop foley inside each cut span and pull later foley earlier."""
    for t0, t1 in cuts:
        d = t1 - t0
        events = [dict(e, t=e["t"] - d if e["t"] >= t1 else e["t"]) for e in events if not (t0 <= e["t"] < t1)]
    return events


def load_foley(cue: str, root: Path, time_scale: float = 1.0):
    """Foley files are in design time (the picture's 120 BPM grid); time_scale maps them to the cue's real time."""
    p = root / "cues" / f"{cue}.foley.json"
    if not p.exists():
        return []
    data = json.loads(p.read_text())
    out = []
    for e in data:
        e = dict(e)
        e["type"] = FOLEY_ALIASES.get(e["type"], e["type"])
        e["t"] *= time_scale
        if "span" in e:
            # A slice of a recording (a run of typing) lasts as long as its picture; the music steps back for all of it.
            e["span"] *= time_scale
            e.setdefault("hold", e["span"])
        out.append(e)
    return sorted(out, key=lambda e: e["t"])


PENTA = [81, 83, 85, 88, 90, 93]   # A5 B5 C#6 E6 F#6 A6
SFX_DIR = Path(__file__).resolve().parent.parent.parent / "assets" / "sfx"
# SSW TV sounds are SSW internal assets, so they live outside git: in $AD_VIDEO_SFX_DIR, else in ~/.config/product-ad-video/sfx.
USER_SFX_DIR = Path(os.environ.get("AD_VIDEO_SFX_DIR") or Path.home() / ".config" / "product-ad-video" / "sfx")
# The synthesized sound that stands in for a missing recording, by a word in the file name.
SFX_FALLBACK = (("typing", "key"), ("click", "click"), ("bubble", "bubble"), ("pop", "pop"))
TYPING_STEP = 0.12   # seconds between the synthesized keys of a typing run (the recording has about 8 keys a second)
_WARNED: set = set()


def sfx_path(name: str) -> Path | None:
    """Where a recording is: an absolute path, music/assets/sfx/<name>, or the user's sound folder. None if missing."""
    p = Path(name)
    if p.is_absolute():
        return p if p.exists() else None
    for d in (SFX_DIR, USER_SFX_DIR):
        if (d / name).exists():
            return d / name
    return None


def _sample(p: Path):
    """A recorded one-shot as mono float64 at SR, peak 0.8."""
    import soundfile as sf
    from scipy.signal import resample_poly
    x, sr = sf.read(str(p), always_2d=True)
    x = x.mean(axis=1).astype(np.float64)
    if sr != SR:
        x = resample_poly(x, SR, sr)
    fade_edges(x, int(0.002 * SR), int(0.03 * SR))
    return x * (0.8 / max(1e-9, float(np.max(np.abs(x)))))


def render_foley(buf, e, idx):
    t = float(e["t"])
    typ = e["type"]
    vel = float(e.get("vel", 1.0))
    pan = float(e.get("pan", 0.0))
    if typ == "key":
        v = (idx * 5 + int(t * 8)) % 6
        place(buf, cached(("key", v), lambda: drums.key_tick(v)), t, vel, pan + ((v - 2.5) * 0.06))
    elif typ == "space":
        place(buf, cached(("space",), drums.space_key), t, vel, pan)
    elif typ == "click":
        place(buf, cached(("click",), drums.mouse_click), t, vel, pan)
    elif typ == "enter":
        place(buf, cached(("enter",), drums.enter_clunk), t, vel, pan)
    elif typ == "thud":
        place(buf, cached(("thud",), drums.thud), t, vel, pan)
    elif typ == "pop":
        m = int(e.get("note", 81))
        place(buf, cached(("pop", m), lambda: drums.pop(m)), t, vel, pan)
    elif typ == "ping":
        m = int(e.get("note", 93))
        place(buf, cached(("ping", m), lambda: synths.ping(m)), t, vel, pan)
    elif typ == "blip":
        m = int(e.get("note", PENTA[(idx * 7 + 3) % len(PENTA)]))
        place(buf, cached(("blip", m), lambda: drums.data_blip(m)), t, vel, pan)
    elif typ == "tick":
        place(buf, cached(("tickf", idx % 3), lambda: drums.tick_perc(idx % 3)), t, vel, pan)
    elif typ == "whoosh":
        d = float(e.get("dur", 0.4))
        up = bool(e.get("up", True))
        place(buf, cached(("whoosh", d, up), lambda: drums.whoosh(d, up=up)), t, vel, pan)
    elif typ == "sample":
        # A recorded one-shot: CC0 files in music/assets/sfx (see the README there), SSW TV files in the user's sound folder.
        f = str(e["file"])
        p = sfx_path(f)
        if p is None:
            _stand_in(buf, e, idx, f)
            return
        x = cached(("sample", f), lambda: _sample(p))
        if "span" in e:
            # A slice from `offset` (seconds into the file) for `span` (real seconds), with a short fade at each end.
            a = int(float(e.get("offset", 0.0)) * SR)
            x = x[a : a + int(float(e["span"]) * SR)].copy()
            fade_edges(x, int(0.005 * SR), int(0.06 * SR))
        # `gain` (dB) levels a recording against the others: a short pop or a spiky run of typing needs more than a scream.
        place(buf, x, t, vel * 10 ** (float(e.get("gain", 0.0)) / 20), pan)
    elif typ in ("happy", "magic", "bubble"):
        # Game-style reaction sounds; `note` moves the root (happy, magic) or the pitch (bubble).
        fn = getattr(gamesfx, typ)
        m = e.get("note")
        place(buf, cached((typ, m), lambda: fn() if m is None else fn(int(m))), t, vel, pan)
    else:
        raise ValueError(f"unknown foley type {typ!r}")


def _stand_in(buf, e, idx, name):
    """A missing recording (an SSW TV sound outside SSW): play the synthesized sound of the same kind, or nothing."""
    kind = next((k for word, k in SFX_FALLBACK if word in Path(name).stem.lower()), None)
    if name not in _WARNED:
        _WARNED.add(name)
        what = f"the synthesized {kind!r} plays instead" if kind else "it is left out"
        print(f"  sfx: {name} is not in {SFX_DIR} or {USER_SFX_DIR}; {what}", file=sys.stderr)
    if kind is None:
        return
    vel = float(e.get("vel", 1.0))
    pan = float(e.get("pan", 0.0))
    if kind != "key":
        render_foley(buf, {"t": e["t"], "type": kind, "vel": vel, "pan": pan}, idx)
        return
    # A typing run: synthesized keystrokes over the slice's span.
    for i in range(max(1, int(float(e.get("span", 1.0)) / TYPING_STEP))):
        render_foley(buf, {"t": float(e["t"]) + i * TYPING_STEP, "type": "key", "vel": vel * 0.8, "pan": pan}, idx + i)


# --------------------------------------------------------------------------- logo


def render_logo(buf_logo, ev):
    t0 = ev["t"]
    v = ev.get("vel", 1.0)
    notes, bloom = logo_motif(ev)
    if ev.get("teaser"):
        # muted bell, every note but the last: the line hangs unresolved
        for off, m in notes[:-1]:
            place(buf_logo, cached(("tbell", m), lambda m=m: synths.bell(m, 0.5, 0.8, muted=True)), t0 + off, 0.55 * v)
        return
    for k, (off, m) in enumerate(notes):
        last = k == len(notes) - 1
        dur = 2.6 if last else 0.9
        dec = 1.0 if last else 0.34
        place(buf_logo, cached(("lbell", m, last), lambda m=m, dur=dur, dec=dec: synths.bell(m, dur, 1.0, decay=dec)), t0 + off, (0.95 if not last else 1.0) * v)
        place(buf_logo, cached(("lpl", m), lambda m=m: synths.pluck(m, 0.12, 1.0, bright=1.3, decay=0.14)), t0 + off, 0.55 * v)
    off = notes[-1][0]
    for m in bloom:
        place(buf_logo, cached(("lbloom", m), lambda m=m: synths.bell(m, 2.0, 0.8)), t0 + off, 0.55 * v)
    place(buf_logo, cached(("lbloom", 100), lambda: synths.bell(100, 1.4, 0.6)), t0 + off, 0.22 * v)   # E7 air


# --------------------------------------------------------------------------- main renderer


def render_stems(S, N, root: Path):
    """Return dict of dry stems (N,2) float32 from the score events."""
    z = lambda: np.zeros((N, 2), dtype=np.float32)
    st = {k: z() for k in ("kick", "snare", "hats", "perc", "bass", "chords", "keys", "arp", "lead", "fx", "foley", "logo")}
    ev = S.ev
    n_hat = 0
    for e in ev["kick"]:
        place(st["kick"], cached(("kick", e["v"]), lambda v=e["v"]: drums.kick(v)), e["t"], e["vel"])
    for e in ev["snare"]:
        place(st["snare"], cached(("snare", e["v"]), lambda v=e["v"]: drums.snare(v)), e["t"], e["vel"] ** 1.2, 0.0)
    for i, e in enumerate(ev["clap"]):
        place(st["snare"], cached(("clap", i % 3), lambda i=i: drums.clap(i % 3)), e["t"], e["vel"] ** 1.2)
    for i, e in enumerate(ev["hatClosed"]):
        vq = _q(e["vel"], 4)
        place(st["hats"], cached(("hc", i % 5, vq), lambda i=i, vq=vq: drums.hat_closed(i % 5, vq)), e["t"], e["vel"], pan=0.12 * (((i % 5) - 2) / 2.0))
    for i, e in enumerate(ev["hatOpen"]):
        place(st["hats"], cached(("ho", i % 3), lambda i=i: drums.hat_open(i % 3)), e["t"], e["vel"], pan=0.18 if i % 2 else -0.18)
    for i, e in enumerate(ev["shaker"]):
        place(st["hats"], cached(("sh", i % 4), lambda i=i: drums.shaker(i % 4)), e["t"], e["vel"], pan=-0.3 if i % 2 else 0.3)
    for i, e in enumerate(ev["tick"]):
        place(st["perc"], cached(("tick", i % 4), lambda i=i: drums.tick_perc(i % 4)), e["t"], e["vel"], pan=-0.4 if i % 3 == 0 else (0.4 if i % 3 == 1 else 0.0))
    for e in ev["rim"]:
        place(st["perc"], cached(("rim",), drums.rim), e["t"], e["vel"])
    for e in ev["tom"]:
        f = e["f"]
        place(st["perc"], cached(("tom", f), lambda f=f: drums.tom(f)), e["t"], e["vel"])

    # fx
    for e in ev["crash"]:
        length = 2.0 if e.get("short") else 3.6
        place(st["fx"], cached(("crash", length), lambda l=length: drums.crash(l)), e["t"], 0.9 * e["vel"])
    for e in ev["impact"]:
        place(st["fx"], cached(("impact", e["size"]), lambda s=e["size"]: drums.impact(s)), e["t"], e["vel"])
    for e in ev["finalChord"]:
        place(st["fx"], cached(("impact", e["size"]), lambda s=e["size"]: drums.impact(s)), e["t"], 0.8 * e["vel"])
        place(st["fx"], cached(("crash", 3.6), lambda: drums.crash(3.6)), e["t"], 0.9 * e["vel"])
    for e in ev["accent"]:
        place(st["fx"], cached(("impact", "small"), lambda: drums.impact("small")), e["t"], 0.55 * e["vel"])
        place(st["fx"], cached(("crash", 2.0), lambda: drums.crash(2.0)), e["t"], 0.8 * e["vel"])
    for e in ev["hit"]:
        f = e["f"]
        place(st["perc"], cached(("tom", f), lambda f=f: drums.tom(f)), e["t"], e["vel"])
        place(st["fx"], cached(("crash", 2.0), lambda: drums.crash(2.0)), e["t"], 0.5 * e["vel"])
    for e in ev["endHit"]:
        place(st["fx"], cached(("impact", "small"), lambda: drums.impact("small")), e["t"], 0.8 * e["vel"])
        place(st["fx"], cached(("crash", 2.0), lambda: drums.crash(2.0)), e["t"], 0.35 * e["vel"])
    for e in ev["riser"]:
        d = round(e["end"] - e["start"], 4)
        pitch = tuple(e["pitch"]) if e.get("pitch") else None
        place(st["fx"], cached(("riser", d, e["kind"], pitch), lambda d=d, e=e, pitch=pitch: drums.riser(d, e["kind"], pitch=pitch)), e["start"], e["vel"])
    for e in ev["swell"]:
        d = round(e["end"] - e["start"], 4)
        place(st["fx"], cached(("swell", d), lambda d=d: drums.reverse_swell(d)), e["start"], 0.8 * e["vel"])
    for e in ev["whoosh"]:
        place(st["fx"], cached(("whoosh", e["dur"], e["up"]), lambda e=e: drums.whoosh(e["dur"], up=e["up"])), e["t"], e["vel"])
    for e in ev["down"]:
        place(st["fx"], cached(("down", e["dur"]), lambda e=e: drums.downlifter(e["dur"])), e["t"], e["vel"])

    # bass
    for e in ev["bass"]:
        m, d, s = int(e["midi"]), round(e["dur"], 3), e["style"]
        v = e["vel"]
        if s == "sub":
            sig = cached(("sub", m, d, e["glide"]), lambda: synths.sub_bass(m, d, 1.0, e["glide"]))
        elif s == "subsaw":
            sig = cached(("subsaw", m, d), lambda: _subsaw(m, d))
        elif s == "pluck":
            sig = cached(("bpl", m, d), lambda: synths.bass_pluck(m, d, 1.0))
        elif s == "dark":
            sig = cached(("bdk", m, d), lambda: synths.dark_bass(m, d, 1.0))
        else:
            raise ValueError(s)
        place(st["bass"], sig, e["t"], v)

    # chords / pads / keys
    for i, e in enumerate(ev["chord"]):
        nm, d, style = e["name"], round(e["dur"], 3), e["style"]
        tr = e.get("transpose", 0)
        v = e["vel"]
        if style == "saw":
            key = ("saw", nm, d, tr, e.get("cutoff", 7000.0), e.get("snap", 0.5), e.get("atk", 0.012), e.get("rel", 0.3), e.get("spread", 1.0), e.get("hp", 130.0), e.get("voices", 7))
            sig = cached(key, lambda: synths.supersaw_chord([x + tr for x in CHORDS[nm]["sw"]], d, cutoff=e.get("cutoff", 7000.0), atk=e.get("atk", 0.012),
                                                             rel=e.get("rel", 0.3), spread=e.get("spread", 1.0), snap=e.get("snap", 0.5), hp=e.get("hp", 130.0),
                                                             seed=_h(nm) % 97, voices=e.get("voices", 7)))
            place(st["chords"], sig, e["t"], v)
        elif style == "pad":
            vc = e.get("voicing", "pad")
            key = ("pad", nm, d, tr, e.get("cutoff", 1600.0), e.get("atk", 0.7), e.get("rel", 1.1), vc)
            sig = cached(key, lambda: synths.pad_chord([x + tr for x in CHORDS[nm][vc]], d, cutoff=e.get("cutoff", 1600.0), atk=e.get("atk", 0.7),
                                                        rel=e.get("rel", 1.1), seed=_h(nm) % 89))
            place(st["chords"], sig, e["t"], v)
        elif style == "ep":
            for k, m in enumerate(CHORDS[nm]["ep"]):
                key = ("ep", m + tr, d, round(e.get("bright", 1.0), 2), round(v, 2))
                sig = cached(key, lambda m=m: synths.ep_note(m + tr, d, min(v, 1.0), e.get("bright", 1.0)))
                place(st["keys"], sig, e["t"] + 0.004 * k, 1.0, pan=-0.2 + 0.13 * k)
        else:
            raise ValueError(style)

    for e in ev["arp"]:
        m, d = int(e["midi"]), round(e["dur"], 3)
        sig = cached(("arp", m, d, round(e["vel"], 2)), lambda: synths.pluck(m, d, e["vel"], bright=0.8, decay=0.14))
        place(st["arp"], sig, e["t"], 1.0, pan=0.0)

    for e in ev["lead"]:
        m, d = int(e["midi"]), round(e["dur"], 3)
        sig = cached(("lead", m, d, round(e["vel"], 2), e.get("bright", 1.0), e.get("vib", 1.0), e["layer"]),
                     lambda: synths.lead_note(m, d, min(e["vel"], 1.0), e.get("bright", 1.0), e.get("vib", 1.0)))
        place(st["lead"], sig, e["t"], max(e["vel"], 0.0) if e["vel"] > 1.0 else 1.0)

    for e in ev["bell"]:
        m, d = int(e["midi"]), round(e["dur"], 3)
        sig = cached(("bell", m, d, e["muted"]), lambda: synths.bell(m, d, 1.0, muted=e["muted"]))
        place(st["logo"], sig, e["t"], e["vel"])
    for e in ev["logo"]:
        render_logo(st["logo"], e)

    # foley (data-driven)
    foley = apply_cuts(load_foley(getattr(S, "foley_from", S.name), root, S.time_scale), getattr(S, "cuts", []))
    S.foley = foley
    for i, e in enumerate(foley):
        if e["t"] < S.file_dur:
            render_foley(st["foley"], e, i)
    return st


def _subsaw(m, d):
    sub = synths.sub_bass(m, d, 1.0)
    top = synths.bass_pluck(m + 12 if m < 36 else m, d, 1.0, drive=1.6)
    top = butter_hp(top, 90.0, 2)
    n = max(len(sub), len(top))
    out = np.zeros(n)
    out[: len(sub)] += sub
    out[: len(top)] += 0.28 * top
    return out
