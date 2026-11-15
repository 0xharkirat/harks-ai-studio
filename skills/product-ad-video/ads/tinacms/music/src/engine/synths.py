"""Pitched instruments: glass bell, pluck, sub/pluck bass, supersaw, pad, FM keys, lead."""
from __future__ import annotations

import numpy as np

from .dsp import (SR, adsr, butter_hp, butter_lp, downsample, eq, exp_env, fade_edges, highpass,
                  lowpass, midi_hz, pulse_osc, saw_osc, supersaw, svf)


def _t(n, sr=SR):
    return np.arange(n) / sr


def cos_gate(t, dur, rel):
    """1 until dur, then a raised-cosine release of length rel (smooth in value and slope)."""
    u = np.clip((t - dur) / rel, 0.0, 1.0)
    return 0.5 + 0.5 * np.cos(np.pi * u)


# --------------------------------------------------------------------------- bell


_BELL_PARTIALS = [
    # ratio, amp, decay tau (s) at 880 Hz reference
    (1.0, 1.00, 1.50),
    (2.0, 0.42, 1.10),
    (3.0, 0.20, 0.75),
    (4.17, 0.20, 0.55),
    (5.43, 0.12, 0.38),
    (6.79, 0.07, 0.26),
    (8.93, 0.04, 0.18),
]


def bell(midi, dur=1.6, vel=1.0, muted=False, sr=SR, seed=0, decay=1.0):
    """Glassy bell: slightly inharmonic additive partials, stereo beating, bright strike. (n,2)."""
    f0 = float(midi_hz(midi))
    n = int((dur + (0.35 if muted else 1.0)) * sr)
    t = _t(n, sr)
    rng = np.random.default_rng(1000 + int(midi) * 7 + seed)
    out = np.zeros((n, 2))
    tilt = (f0 / 880.0) ** -0.25  # lower notes ring longer
    for k, (ratio, amp, tau) in enumerate(_BELL_PARTIALS):
        fr = f0 * ratio
        if fr > 17500:
            continue
        tau_k = tau * tilt * decay * (0.45 if muted else 1.0) * (0.7 + 0.5 * vel)
        env = np.exp(-t / tau_k)
        for ch, det in enumerate((-1.0, 1.0)):
            beat = 1.0 + det * (0.0006 + 0.0004 * k) * (1 if ch == 0 else 1)
            ph0 = rng.uniform(0, 6.28)
            out[:, ch] += np.sin(2 * np.pi * fr * beat * t + ph0) * env * amp * (0.5 + 0.5 * vel if k else 1.0)
    # FM shimmer on the upper partial for glass
    mod = np.sin(2 * np.pi * f0 * 3.51 * t) * 1.8 * np.exp(-t / 0.05) * vel
    shim = np.sin(2 * np.pi * f0 * 2.0 * t + mod) * np.exp(-t / (0.5 * tilt * decay)) * 0.16
    out += shim[:, None]
    # strike: tiny bright noise tick
    if not muted:
        rng2 = np.random.default_rng(2000 + int(midi))
        tick = highpass(rng2.standard_normal(n), 5000.0) * np.exp(-t / 0.004) * 0.22 * vel
        out += tick[:, None]
    if muted:
        out = np.stack([lowpass(out[:, 0], 2600.0), lowpass(out[:, 1], 2600.0)], axis=1)
    out *= np.minimum(1.0, t / 0.0008)[:, None]
    fade_edges(out, 0, int(0.15 * sr))
    return out * (0.55 * vel)


def ping(midi, vel=1.0, sr=SR):
    """Short, bright commit ping. (n,2)."""
    f0 = float(midi_hz(midi))
    n = int(1.2 * sr)
    t = _t(n, sr)
    mod = np.sin(2 * np.pi * f0 * 2.0 * t) * 1.2 * np.exp(-t / 0.04)
    x = np.sin(2 * np.pi * f0 * t + mod) * np.exp(-t / 0.28)
    x += 0.35 * np.sin(2 * np.pi * f0 * 3.0 * t) * np.exp(-t / 0.12)
    x += 0.22 * np.sin(2 * np.pi * f0 * 4.17 * t) * np.exp(-t / 0.06)
    x += 0.15 * np.sin(2 * np.pi * f0 * 0.5 * t) * np.exp(-t / 0.35)
    x *= np.minimum(1.0, t / 0.0006)
    fade_edges(x, 0, int(0.3 * sr))
    out = np.stack([x, np.roll(x, 7) * 0.96], axis=1)
    return out * 0.5 * vel


# --------------------------------------------------------------------------- plucks


def pluck(midi, dur=0.25, vel=1.0, bright=1.0, os=4, decay=0.22, sr=SR, seed=0):
    """Bright pluck: detuned saw + pulse through a snapping low-pass. Stereo (n,2)."""
    f0 = float(midi_hz(midi))
    rel = 0.08
    nt = int((dur + max(decay * 3.0, 0.4) + rel) * sr)
    nt = max(nt, int(0.3 * sr))
    n = nt * os
    sr2 = sr * os
    t = np.arange(n) / sr2
    rng = np.random.default_rng(3000 + int(midi) + seed)
    out = np.zeros((n, 2))
    for k, (det, pan) in enumerate(((-5.0, -0.5), (5.0, 0.5))):
        fr = np.full(n, f0 * 2 ** (det / 1200))
        s = saw_osc(fr, rng.uniform(), float(sr2)) * 0.8
        s += pulse_osc(fr * 0.5, np.full(n, 0.35), rng.uniform(), float(sr2)) * 0.45
        cut = (900.0 + (4800.0 * bright * (0.4 + 0.6 * vel)) * np.exp(-t / 0.055)) * (1.0 + 0.0 * t)
        s = svf(s, cut, 1.3, 0, float(sr2))
        a = (pan + 1.0) * np.pi / 4.0
        out[:, 0] += s * np.cos(a)
        out[:, 1] += s * np.sin(a)
    env = np.exp(-t / decay)
    gate = np.where(t < dur, 1.0, np.exp(-(t - dur) / (rel / 2.5)))
    out *= (env * gate)[:, None]
    out = downsample(out, os)
    out *= np.minimum(1.0, _t(out.shape[0], sr) / 0.0005)[:, None]
    fade_edges(out, 0, int(0.02 * sr))
    out = butter_hp(out, 140.0, 2)
    return out * (0.55 * vel)


def bass_pluck(midi, dur=0.2, vel=1.0, drive=2.0, bright=1.0, sr=SR):
    """Muted, plucky mono bass: saw+square sub through a falling low-pass. Mono (n,)."""
    f0 = float(midi_hz(midi))
    rel = 0.05
    n = int((dur + 0.25 + rel) * sr)
    t = _t(n, sr)
    fr = np.full(n, f0)
    s = saw_osc(fr, 0.0, float(sr)) * 0.7 + pulse_osc(fr, np.full(n, 0.5), 0.0, float(sr)) * 0.3
    cut = 260.0 + 2400.0 * bright * vel * np.exp(-t / 0.05)
    s = svf(s, cut, 1.4, 0, float(sr))
    s += 0.9 * np.sin(2 * np.pi * np.cumsum(fr) / sr)
    env = np.exp(-t / (0.09 + dur * 0.45))
    gate = cos_gate(t, dur, 0.04)
    s = np.tanh(s * env * gate * drive) / np.tanh(drive)
    fade_edges(s, int(0.004 * sr), int(0.01 * sr))
    return s * 0.8 * vel


def sub_bass(midi, dur=0.4, vel=1.0, glide_from=None, harm=0.22, sr=SR):
    """Sine sub with a touch of 2nd/3rd harmonic for small-speaker translation. Mono (n,)."""
    f0 = float(midi_hz(midi))
    rel = 0.05
    n = int((dur + rel + 0.05) * sr)
    t = _t(n, sr)
    f = np.full(n, f0)
    if glide_from is not None:
        g = float(midi_hz(glide_from))
        f = f0 + (g - f0) * np.exp(-t / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / sr
    x = np.sin(ph) + harm * np.sin(2 * ph + 0.3) + harm * 0.35 * np.sin(3 * ph)
    x = np.tanh(x * 1.2) / 0.83
    env = np.where(t < dur, 0.9 + 0.1 * np.exp(-t / 0.1), 0.0) + 0.0
    env = (0.9 + 0.1 * np.exp(-t / 0.1)) * cos_gate(t, dur, 0.03)
    y = x * env * vel
    fade_edges(y, int(0.005 * sr), 0)
    return y


def dark_bass(midi, dur=0.2, vel=1.0, sr=SR):
    """Mechanical mono saw/square bass with a short filter snap (dev cue). Mono (n,)."""
    f0 = float(midi_hz(midi))
    rel = 0.03
    n = int((dur + 0.15 + rel) * sr)
    t = _t(n, sr)
    fr = np.full(n, f0)
    s = saw_osc(fr, 0.0, float(sr)) * 0.65 + pulse_osc(fr * 0.5, np.full(n, 0.5), 0.0, float(sr)) * 0.5
    cut = 180.0 + 1700.0 * vel * np.exp(-t / 0.07)
    s = svf(s, cut, 2.2, 0, float(sr))
    s += 0.8 * np.sin(2 * np.pi * np.cumsum(fr * 0.5) / sr)
    env = adsr(n, int(dur * sr), int(0.002 * sr), int(0.2 * sr), 0.8, int(rel * 0.5 * sr))
    s = np.tanh(s * env * 2.4) / np.tanh(2.4)
    fade_edges(s, int(0.004 * sr), int(0.004 * sr))
    return s * 0.75 * vel


# --------------------------------------------------------------------------- chords


def _detunes(spread):
    return np.array([-21.0, -13.0, -6.0, 0.0, 6.0, 13.0, 21.0]) * spread


def supersaw_chord(midis, dur, cutoff=7000.0, atk=0.012, rel=0.28, spread=1.0, vel=1.0, snap=0.0,
                   hp=130.0, os=4, sr=SR, seed=0, voices=7):
    """Wide supersaw chord. snap: extra initial cutoff opening (x) decaying over 0.25 s. Stereo (n,2)."""
    rel_n = rel
    nt = int((dur + rel_n * 3.0) * sr)
    n = nt * os
    sr2 = float(sr * os)
    t = np.arange(n) / sr2
    rng = np.random.default_rng(5000 + seed + len(midis))
    mix = np.zeros((n, 2))
    det = _detunes(spread)[(7 - voices) // 2:(7 - voices) // 2 + voices] if voices < 7 else _detunes(spread)
    for m in midis:
        ph = rng.uniform(0, 1, len(det))
        pans = rng.permutation(np.linspace(-0.85, 0.85, len(det)))
        fr = np.full(n, float(midi_hz(m)))
        mix += supersaw(fr, det, ph, pans, sr2)
    cut = cutoff * (1.0 + snap * np.exp(-t / 0.22))
    mix = np.stack([svf(mix[:, 0], cut, 0.75, 0, sr2), svf(mix[:, 1], cut, 0.75, 0, sr2)], axis=1)
    env = adsr(n, int(dur * sr2), int(atk * sr2), 1, 1.0, int(rel * sr2 * 0.45))
    mix *= env[:, None]
    out = downsample(mix, os)
    out = butter_hp(out, hp, 2)
    fade_edges(out, int(0.004 * sr), int(0.01 * sr))
    return out * (0.26 * vel / np.sqrt(max(len(midis), 1)) * 1.4)


def pad_chord(midis, dur, cutoff=1500.0, atk=0.8, rel=1.2, vel=1.0, sr=SR, seed=0, os=1):
    """Soft pad: 3 detuned saws per note + triangle-ish sine layer, slow envelope. Stereo (n,2)."""
    nt = int((dur + rel * 2.5) * sr)
    n = nt
    t = _t(n, sr)
    rng = np.random.default_rng(6000 + seed)
    mix = np.zeros((n, 2))
    det = np.array([-9.0, 0.0, 9.0])
    for m in midis:
        ph = rng.uniform(0, 1, 3)
        pans = rng.permutation(np.array([-0.7, 0.0, 0.7]))
        fr = np.full(n, float(midi_hz(m)))
        mix += supersaw(fr, det, ph, pans, float(sr))
        mix += 0.6 * np.sin(2 * np.pi * float(midi_hz(m)) * t + rng.uniform(0, 6))[:, None]
    mix = np.stack([svf(mix[:, 0], np.full(n, cutoff), 0.7, 0, float(sr)), svf(mix[:, 1], np.full(n, cutoff), 0.7, 0, float(sr))], axis=1)
    env = adsr(n, int(dur * sr), int(atk * sr), 1, 1.0, int(rel * sr * 0.4))
    mix *= env[:, None]
    mix = butter_hp(mix, 110.0, 2)
    fade_edges(mix, 0, int(0.05 * sr))
    return mix * (0.2 * vel / np.sqrt(max(len(midis), 1)) * 1.5)


def ep_note(midi, dur, vel=0.8, bright=1.0, sr=SR):
    """FM electric-piano (tine + bell sparkle), cool and glassy. Stereo (n,2)."""
    f0 = float(midi_hz(midi))
    rel = 0.12
    n = int((dur + rel + 0.9) * sr)
    t = _t(n, sr)
    i1 = (0.9 + 2.2 * vel * bright) * np.exp(-t / 0.28)
    i2 = 0.5 * vel * np.exp(-t / 0.025)
    m1 = np.sin(2 * np.pi * f0 * t)
    m2 = np.sin(2 * np.pi * f0 * 14.0 * t)
    x = np.sin(2 * np.pi * f0 * t + i1 * m1 + i2 * m2)
    x2 = np.sin(2 * np.pi * f0 * 2.0 * t + 0.4 * i1 * m1) * 0.12
    env = np.exp(-t / (0.9 + 0.2 * vel)) * np.where(t < dur, 1.0, np.exp(-(t - dur) / (rel * 0.5)))
    x = (x + x2) * env
    x *= np.minimum(1.0, t / 0.0012)
    out = np.stack([x, np.roll(x, 5)], axis=1)
    out = butter_hp(out, 160.0, 2)
    fade_edges(out, 0, int(0.02 * sr))
    return out * 0.5 * vel


# --------------------------------------------------------------------------- lead


def lead_note(midi, dur, vel=1.0, bright=1.0, vib=1.0, scoop=True, os=4, sr=SR, seed=0):
    """Singable saw+pulse lead with delayed vibrato and a tiny pitch scoop. Stereo (n,2)."""
    f0 = float(midi_hz(midi))
    rel = 0.09
    nt = int((dur + rel * 2.5) * sr)
    n = nt * os
    sr2 = float(sr * os)
    t = np.arange(n) / sr2
    vib_amt = np.clip((t - 0.14) / 0.22, 0.0, 1.0) * 13.0 * vib  # cents
    cents = vib_amt * np.sin(2 * np.pi * 5.3 * t)
    if scoop:
        cents += -38.0 * np.exp(-t / 0.018)
    fbase = f0 * 2.0 ** (cents / 1200.0)
    rng = np.random.default_rng(7000 + int(midi) + seed)
    out = np.zeros((n, 2))
    voices = ((-7.5, -0.38, "saw", 0.55), (7.5, 0.38, "saw", 0.55), (0.0, 0.0, "pulse", 0.42))
    for det, pan, kind, amp in voices:
        fr = fbase * 2 ** (det / 1200)
        if kind == "saw":
            s = saw_osc(fr, rng.uniform(), sr2)
        else:
            s = pulse_osc(fr, np.full(n, 0.38) + 0.06 * np.sin(2 * np.pi * 0.7 * t), rng.uniform(), sr2)
        a = (pan + 1.0) * np.pi / 4.0
        out[:, 0] += s * amp * np.cos(a) * 1.414
        out[:, 1] += s * amp * np.sin(a) * 1.414
    cut = (3300.0 + 3600.0 * bright * vel * np.exp(-t / 0.16))
    out = np.stack([svf(out[:, 0], cut, 0.85, 0, sr2), svf(out[:, 1], cut, 0.85, 0, sr2)], axis=1)
    env = adsr(n, int(dur * sr2), int(0.006 * sr2), int(0.5 * sr2), 0.85, int(rel * sr2 * 0.45))
    out *= env[:, None]
    out = downsample(out, os)
    out = butter_hp(out, 220.0, 2)
    fade_edges(out, int(0.002 * sr), int(0.008 * sr))
    return out * (0.34 * vel)
