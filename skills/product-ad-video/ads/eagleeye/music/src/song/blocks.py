"""Reusable arrangement blocks. Every block takes absolute bar numbers of the cue being built,
so the same material builds anthem, thirty, fifteen and dev."""
from __future__ import annotations

import numpy as np

from .theory import (ARP_POOL, BAR, CHORDS, HOOK_TAG, STEP, hook_bar, tb)


def entry_at(entry, step):
    """Chord name at a given step of a bar for a progression entry (str or 2-tuple)."""
    if isinstance(entry, tuple):
        return entry[0] if step < 8 else entry[1]
    return entry


def halves(entry):
    return entry if isinstance(entry, tuple) else None


# --------------------------------------------------------------------------- chords


def chords_saw(S, bar, prog, cutoff=7000.0, vel=1.0, snap=0.5, atk=0.012, rel=0.3, spread=1.0, hp=130.0, voices=7):
    """One supersaw chord per bar (or per half bar), full length."""
    for i, entry in enumerate(prog):
        b = bar + i
        h = halves(entry)
        if h:
            for j, nm in enumerate(h):
                S.chord(tb(b, 8 * j), 1.0 - 0.02, nm, "saw", vel=vel, cutoff=cutoff, snap=snap, atk=atk, rel=rel * 0.8, spread=spread, hp=hp, voices=voices)
        else:
            S.chord(tb(b), BAR - 0.02, entry, "saw", vel=vel, cutoff=cutoff, snap=snap, atk=atk, rel=rel, spread=spread, hp=hp, voices=voices)


def chords_pad(S, bar, prog, cutoff=1600.0, vel=1.0, atk=0.7, rel=1.1, octave_down=False):
    for i, entry in enumerate(prog):
        b = bar + i
        h = halves(entry)
        if h:
            for j, nm in enumerate(h):
                S.chord(tb(b, 8 * j), 1.0, nm, "pad", vel=vel, cutoff=cutoff, atk=min(atk, 0.5), rel=rel)
        else:
            S.chord(tb(b), BAR, entry, "pad", vel=vel, cutoff=cutoff, atk=atk, rel=rel)


def keys_stabs(S, bar, prog, pattern, vel=0.8, bright=1.0, dur_steps=2):
    """Cool electric-piano stabs. pattern: list of (step, vel_mult)."""
    for i, entry in enumerate(prog):
        b = bar + i
        for step, vm in pattern:
            nm = entry_at(entry, step)
            S.chord(tb(b, step), dur_steps * STEP, nm, "ep", vel=vel * vm, bright=bright)


# --------------------------------------------------------------------------- bass


def bass_pattern(S, bar, prog, pattern, style="sub", vel=1.0):
    """pattern: list of (step, semitone offset from root, length in steps, vel mult)."""
    for i, entry in enumerate(prog):
        b = bar + i
        for step, off, ln, vm in pattern:
            nm = entry_at(entry, step)
            root = CHORDS[nm]["bass"]
            S.bass(tb(b, step), ln * STEP * 0.96, root + off, style, vel=vel * vm)


BASS_OFFBEAT = [(2, 0, 3, 1.0), (6, 0, 3, 0.95), (10, 0, 3, 1.0), (14, 12, 2, 0.85)]
BASS_OFFBEAT_B = [(2, 0, 3, 1.0), (6, 0, 3, 0.95), (10, 0, 2, 1.0), (13, 12, 1, 0.8), (14, 0, 2, 0.95)]
BASS_VERSE = [(0, 0, 2, 1.0), (3, 0, 1, 0.8), (6, 12, 1, 0.75), (8, 0, 2, 0.95), (11, 0, 1, 0.8), (14, 7, 1, 0.7)]
BASS_HALF = [(0, 0, 6, 1.0), (10, 0, 4, 0.9)]
BASS_WHOLE = [(0, 0, 15, 1.0)]
BASS_DEV = [(0, 0, 2, 1.0), (3, 12, 1, 0.75), (4, 0, 2, 0.9), (7, 0, 1, 0.7), (8, 0, 2, 1.0), (11, 12, 1, 0.75), (12, 0, 2, 0.9), (14, 7, 1, 0.7)]


# --------------------------------------------------------------------------- drums


def kick_pat(S, bar, steps, vel=1.0, v="main"):
    for s in steps:
        S.kick(tb(bar, s), vel, v)


def d_chorus(S, bar, n=1, e=1.0, fill_last=False, kv="main", open_hats=True, shaker=True):
    for k in range(n):
        b = bar + k
        fill = fill_last and k == n - 1
        for s in (0, 4, 8) + (() if fill else (12,)):
            S.kick(tb(b, s), 1.0, kv)
        for s in (4, 12):
            if s == 12 and fill:
                continue
            S.clap(tb(b, s), 0.9 * e)
            S.snare(tb(b, s), 0.55 * e)
        if open_hats:
            for s in (2, 6, 10, 14):
                if fill and s == 14:
                    continue
                S.hatO(tb(b, s), 0.62 * e + 0.12)
        for s in range(16):
            if fill and s >= 12:
                continue
            if s % 4 == 0:
                S.hatC(tb(b, s), 0.42)
            elif s % 2 == 1:
                S.hatC(tb(b, s), 0.26 + 0.05 * ((s * 7) % 3))
        if shaker:
            for s in range(16):
                if s % 2 == 1:
                    S.shaker(tb(b, s), 0.22 + 0.1 * (s % 4 == 3))
        if fill:
            for j, s in enumerate((12, 13, 14, 15)):
                S.snare(tb(b, s), 0.45 + 0.17 * j)
            S.clap(tb(b, 15), 0.5)


def d_verse(S, bar, n=1, e=1.0):
    for k in range(n):
        b = bar + k
        for s in (0, 6, 10):
            S.kick(tb(b, s), 0.9 * e, "soft")
        for s in (4, 12):
            S.clap(tb(b, s), 0.62 * e)
        for s in range(0, 16, 2):
            S.hatC(tb(b, s), (0.46 if s % 4 == 0 else 0.34) * e)
        S.hatC(tb(b, 15), 0.2 * e)
        for s in (1, 3, 7, 9, 11, 15):
            S.tick(tb(b, s), 0.3 * e)


def d_light(S, bar, n=1, e=1.0):
    for k in range(n):
        b = bar + k
        for s in (0, 8):
            S.kick(tb(b, s), 0.7 * e, "soft")
        for s in range(2, 16, 4):
            S.hatC(tb(b, s), 0.4 * e)
        S.rim(tb(b, 12), 0.35 * e)
        for s in (3, 7, 11, 15):
            S.tick(tb(b, s), 0.22 * e)


def d_half(S, bar, n=1, e=1.0):
    """Half-time, mechanical: kick 1 and 3&, snare on 3, ticks on every 16th."""
    for k in range(n):
        b = bar + k
        for s in (0, 10):
            S.kick(tb(b, s), 0.95 * e, "half")
        S.snare(tb(b, 8), 0.8 * e)
        S.clap(tb(b, 8), 0.55 * e)
        for s in range(16):
            S.tick(tb(b, s), (0.34 if s % 4 == 0 else 0.2) * e)
        for s in (2, 6, 10, 14):
            S.hatC(tb(b, s), 0.32 * e)
        S.hatO(tb(b, 14), 0.4 * e)


def snare_roll(S, t0, t1, step=0.25, v0=0.3, v1=1.0, v="main"):
    """Snare roll from t0 up to (excluding) t1 with a velocity ramp."""
    ts = np.arange(t0, t1 - 1e-9, step)
    for i, t in enumerate(ts):
        u = i / max(len(ts) - 1, 1)
        S.snare(float(t), v0 + (v1 - v0) * u ** 1.3, v)


def d_build(S, bar, n_bars, e=1.0):
    """Pre-chorus: four-on-the-floor with rising hats, clap on 2/4."""
    for k in range(n_bars):
        b = bar + k
        u = k / max(n_bars - 1, 1)
        for s in (0, 4, 8, 12):
            S.kick(tb(b, s), (0.75 + 0.2 * u) * e, "main")
        for s in (4, 12):
            S.clap(tb(b, s), (0.55 + 0.25 * u) * e)
        step_hat = 2 if k < n_bars // 2 else 1
        for s in range(0, 16, step_hat):
            S.hatC(tb(b, s), (0.3 + 0.35 * u + (0.1 if s % 4 == 0 else 0)) * e)
        for s in (2, 6, 10, 14):
            if k >= 1:
                S.hatO(tb(b, s), 0.45 * e)


# --------------------------------------------------------------------------- lead / arps


def lead_hook(S, bar, ending="open", transpose=0, vel=1.0, layer="main", n_bars=4, skip_last=False):
    for i in range(n_bars):
        for step, m, ln in hook_bar(i, ending):
            accent = 1.0 if step in (0, 8) else (0.93 if ln >= 3 else 0.88)
            S.lead(tb(bar + i, step), ln * STEP * 0.98, m + transpose, vel=vel * accent, layer=layer)


def arp_pluck(S, bar, prog, pattern, vel=0.6, octave=0, dur_steps=1.0, pool_offset=0):
    """16th-note pluck arp. pattern: 16 entries of pool index or None (len 16)."""
    for i, entry in enumerate(prog):
        b = bar + i
        for step in range(16):
            idx = pattern[step]
            if idx is None:
                continue
            nm = entry_at(entry, step)
            pool = ARP_POOL[nm]
            m = pool[(idx + pool_offset) % len(pool)] + octave
            S.arp(tb(b, step), dur_steps * STEP, m, vel=vel * (1.0 if step % 4 == 0 else 0.82))


ARP_UP = [0, 2, 3, 2, 1, 3, 4, 3, 0, 2, 3, 4, 3, 2, 1, 2]
ARP_16 = [0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1]
ARP_SPARSE = [0, None, 2, None, 3, None, 2, None, 1, None, 3, None, 4, None, 3, 2]
ARP_MECH = [0, None, 1, 2, None, 3, None, 2, 0, None, 1, 2, None, 4, 3, None]
