"""Drum kit, cymbals, impacts, risers and UI foley. All one-shots return float64 arrays at 48 kHz."""
from __future__ import annotations

import numpy as np
from scipy import signal

from .dsp import (SR, bandpass, butter_hp, butter_lp, db, eq, exp_env, fade_edges, highpass,
                  lowpass, midi_hz, peak_norm, pulse_osc, sat)


def _t(n, sr=SR):
    return np.arange(n) / sr


def _noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


# --------------------------------------------------------------------------- kick


KICKS = {
    # f_start, f_end, pitch tau, amp tau, length, click, drive, lp
    "main": dict(f0=185, f1=48.5, tp=0.030, ta=0.095, n=0.50, click=0.32, drive=2.3, lp=9000),
    "soft": dict(f0=150, f1=50.0, tp=0.028, ta=0.075, n=0.34, click=0.18, drive=1.6, lp=5200),
    "hard": dict(f0=250, f1=47.0, tp=0.020, ta=0.085, n=0.42, click=0.55, drive=3.2, lp=12000),
    "half": dict(f0=170, f1=46.0, tp=0.034, ta=0.15, n=0.65, click=0.25, drive=2.0, lp=7000),
}


def kick(variant="main", sr=SR):
    """Sine kick with a fast pitch drop. Saturation only bites the loud head; the tail stays linear
    and decays to about -45 dB by the end so the bass can speak between beats."""
    p = KICKS[variant]
    n = int(p["n"] * sr)
    t = _t(n, sr)
    f = p["f1"] + (p["f0"] - p["f1"]) * np.exp(-t / p["tp"])
    ph = 2 * np.pi * np.cumsum(f) / sr + 0.9
    env = np.exp(-t / p["ta"]) * np.minimum(1.0, t / 0.0004)
    d = p["drive"]
    body = np.tanh(d * np.sin(ph) * env) / np.tanh(d)
    lin = env
    sat_gain = np.maximum(np.tanh(d * env) / np.tanh(d), 1e-9)
    body = body * np.minimum(lin / sat_gain, 1.0)
    nz = highpass(_noise(n, 11), 1800.0) * np.exp(-t / 0.0025)
    tone = np.sin(2 * np.pi * 1900 * t) * np.exp(-t / 0.0018)
    x = body + p["click"] * (0.6 * nz + 0.5 * tone)
    x = butter_lp(x, p["lp"], 2)
    x = butter_hp(x, 24.0, 2)
    fade_edges(x, 0, int(0.06 * sr))
    return peak_norm(x, 0.95)


# --------------------------------------------------------------------------- snare / clap / perc


def snare(variant="main", sr=SR):
    n = int(0.45 * sr)
    t = _t(n, sr)
    f = 182.0 * (1.0 + 0.35 * np.exp(-t / 0.012))
    ph = 2 * np.pi * np.cumsum(f) / sr
    tone = np.sin(ph) * np.exp(-t / 0.055) * 0.8 + np.sin(ph * 1.78) * np.exp(-t / 0.035) * 0.3
    nz = _noise(n, 21 if variant == "main" else 22)
    nz = highpass(nz, 1100.0)
    nz = lowpass(nz, 11000.0)
    nz = bandpass(nz, 4500.0, 0.55) * 1.6 + nz * 0.5
    nenv = np.exp(-t / 0.08) * 0.78 + np.exp(-t / 0.15) * 0.22
    snap = highpass(_noise(n, 23), 3000.0) * np.exp(-t / 0.0025)
    x = tone + nz * nenv * 0.9 + snap * 0.7
    x = np.tanh(x * 1.6) / np.tanh(1.6)
    fade_edges(x, 0, int(0.03 * sr))
    return peak_norm(x, 0.9)


def clap(variant=0, sr=SR):
    n = int(0.5 * sr)
    t = _t(n, sr)
    base = _noise(n, 31 + variant)
    base = bandpass(highpass(base, 600.0), 1450.0, 1.0) * 2.0 + highpass(base, 2500.0) * 0.35
    env = np.zeros(n)
    offs = [0.0, 0.0105, 0.0215, 0.031]
    for k, o in enumerate(offs):
        i = int(o * sr)
        tt = np.arange(n - i) / sr
        tau = 0.0055 if k < 3 else 0.11
        env[i:] += np.exp(-tt / tau) * (0.85 if k < 3 else 0.7)
    x = base * env
    x = np.tanh(x * 1.3)
    fade_edges(x, 0, int(0.04 * sr))
    return peak_norm(x, 0.9)


def rim(sr=SR):
    """Side-stick / rim click: pitched wood-ish tick."""
    n = int(0.12 * sr)
    t = _t(n, sr)
    x = np.sin(2 * np.pi * 1750 * t) * np.exp(-t / 0.006) * 0.8 + np.sin(2 * np.pi * 480 * t) * np.exp(-t / 0.012) * 0.5
    x += highpass(_noise(n, 41), 2500.0) * np.exp(-t / 0.003) * 0.5
    x = np.tanh(x * 1.3)
    fade_edges(x, 0, int(0.02 * sr))
    return peak_norm(x, 0.85)


def tom(freq=110.0, sr=SR):
    n = int(0.5 * sr)
    t = _t(n, sr)
    f = freq * (1 + 0.8 * np.exp(-t / 0.03))
    x = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.18)
    x += highpass(_noise(n, 51), 1500.0) * np.exp(-t / 0.004) * 0.15
    fade_edges(x, 0, int(0.03 * sr))
    return peak_norm(x, 0.85)


# --------------------------------------------------------------------------- hats / shaker / cymbals

_METAL = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0])


def _metal(n, seed, sr=SR):
    rng = np.random.default_rng(seed)
    acc = np.zeros(n)
    for fr in _METAL * (1.0 + rng.uniform(-0.01, 0.01, 6)):
        f = np.full(n, fr * 1.6)
        acc += pulse_osc(f, np.full(n, 0.5), rng.uniform(), float(sr))
    return acc / 6.0


def hat_closed(variant=0, vel=0.7, sr=SR):
    n = int(0.12 * sr)
    t = _t(n, sr)
    nz = _noise(n, 61 + variant)
    x = 0.55 * nz + 0.9 * _metal(n, 62 + variant)
    x = butter_hp(x, 6200.0 + 1200.0 * vel, 4)
    x = butter_lp(x, 15500.0, 2)
    x = x * (np.exp(-t / (0.014 + 0.012 * vel)) * 0.9 + np.exp(-t / 0.04) * 0.1)
    x *= np.minimum(1.0, t / 0.0006)
    fade_edges(x, 0, int(0.015 * sr))
    return peak_norm(x, 0.8)


def hat_open(variant=0, sr=SR):
    n = int(0.6 * sr)
    t = _t(n, sr)
    nz = _noise(n, 71 + variant)
    x = 0.6 * nz + 0.9 * _metal(n, 72 + variant)
    x = butter_hp(x, 5600.0, 4)
    x = butter_lp(x, 15000.0, 2)
    x = x * (np.exp(-t / 0.06) * 0.55 + np.exp(-t / 0.16) * 0.45)
    x *= np.minimum(1.0, t / 0.0008)
    fade_edges(x, 0, int(0.12 * sr))
    return peak_norm(x, 0.8)


def shaker(variant=0, sr=SR):
    n = int(0.1 * sr)
    t = _t(n, sr)
    x = bandpass(_noise(n, 81 + variant), 6500.0, 0.9)
    env = (t / 0.012) * np.exp(1 - t / 0.012)
    x = x * env
    fade_edges(x, 0, int(0.02 * sr))
    return peak_norm(x, 0.7)


def crash(length=3.6, seed=91, sr=SR):
    """Band-split noise cymbal: highs decay first, body lasts; plus inharmonic shimmer. Stereo (n,2)."""
    n = int(length * sr)
    t = _t(n, sr)
    out = np.zeros((n, 2))
    bands = [(900, 3000, 1.35, 0.6), (3000, 7000, 0.95, 1.0), (7000, 12000, 0.55, 0.9), (12000, 17000, 0.32, 0.5)]
    for ch in range(2):
        acc = np.zeros(n)
        for k, (lo, hi, tau, w) in enumerate(bands):
            nz = _noise(n, seed + ch * 17 + k)
            nz = butter_hp(butter_lp(nz, hi, 2), lo, 2)
            acc += nz * np.exp(-t / tau) * w
        out[:, ch] = acc
    # metallic shimmer: sines at inharmonic ratios
    rng = np.random.default_rng(seed)
    sh = np.zeros(n)
    for fr in rng.uniform(3100, 9500, 14):
        sh += np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.28)) * np.exp(-t / rng.uniform(0.5, 1.4)) * 0.035
    out += sh[:, None]
    # strike transient
    tr = highpass(_noise(n, seed + 99), 2000.0) * np.exp(-t / 0.012) * 1.2
    out += tr[:, None]
    out *= np.minimum(1.0, t / 0.0012)[:, None]
    fade_edges(out, 0, int(0.5 * sr))
    return peak_norm(out, 0.8)


def reverse_swell(length=1.0, seed=92, sr=SR):
    """Reversed crash build that arrives exactly at its end. Stereo."""
    c = crash(length + 1.5, seed, sr)
    seg = c[: int(length * sr)][::-1].copy()
    n = seg.shape[0]
    seg *= (np.arange(n) / n)[:, None] ** 0.35
    fade_edges(seg, int(0.01 * sr), int(0.0015 * sr))
    return peak_norm(seg, 0.8)


# --------------------------------------------------------------------------- impact / riser / whoosh


def impact(size="big", f_end=55.0, sr=SR):
    """Cinematic hit: pitched sub boom, noise thump, bright strike. Stereo (n,2)."""
    length = {"big": 3.2, "med": 2.2, "small": 1.6}[size]
    n = int(length * sr)
    t = _t(n, sr)
    f = f_end + (f_end * 2.2) * np.exp(-t / 0.16)
    ph = 2 * np.pi * np.cumsum(f) / sr
    boom = np.sin(ph) * np.exp(-t / {"big": 0.75, "med": 0.5, "small": 0.3}[size])
    boom += 0.35 * np.sin(2 * ph + 0.4) * np.exp(-t / 0.18)
    boom = np.tanh(boom * 1.6)
    boom *= np.minimum(1.0, t / 0.002)
    out = np.zeros((n, 2))
    out += boom[:, None] * 0.9
    for ch in range(2):
        nz = _noise(n, 101 + ch)
        sweep = 9000.0 * np.exp(-t / 0.35) + 160.0
        nz = lowpass(nz, sweep, 0.9)
        out[:, ch] += nz * np.exp(-t / {"big": 0.55, "med": 0.4, "small": 0.25}[size]) * 0.55
        hi = highpass(_noise(n, 111 + ch), 3500.0) * np.exp(-t / 0.05)
        out[:, ch] += hi * 0.22
    out = butter_hp(out, 26.0, 2)
    fade_edges(out, 0, int(0.5 * sr))
    return peak_norm(out, 0.9)


def riser(dur, kind="noise", f_lo=250.0, f_hi=11000.0, sr=SR, seed=121, pitch=None):
    """Noise riser: band-pass sweep with a quadratic swell; ends at full level at dur. Stereo."""
    n = int(round(dur * sr))
    t = np.arange(n) / sr
    u = np.linspace(0.0, 1.0, n)
    sweep = f_lo * (f_hi / f_lo) ** (u ** 1.35)
    out = np.zeros((n, 2))
    for ch in range(2):
        nz = _noise(n, seed + ch)
        y = bandpass(nz, sweep, 2.2 if kind == "noise" else 3.0) * 2.4 + highpass(nz, sweep * 0.8) * 0.5
        out[:, ch] = y
    amp = (u ** 2.0) * 0.92 + 0.08 * u
    out *= amp[:, None]
    if pitch is not None:
        # tonal tension: sine glide from midi pitch[0] to pitch[1]
        f = midi_hz(pitch[0]) * (midi_hz(pitch[1]) / midi_hz(pitch[0])) ** (u ** 1.5)
        tone = np.sin(2 * np.pi * np.cumsum(f) / sr) * (u ** 2.5) * 0.35
        tone += np.sin(2 * np.pi * np.cumsum(f * 2.0) / sr) * (u ** 3.0) * 0.12
        out += tone[:, None]
    fade_edges(out, int(0.02 * sr), int(0.002 * sr))
    return peak_norm(out, 0.8)


def downlifter(dur=1.2, sr=SR, seed=131):
    n = int(dur * sr)
    u = np.linspace(0, 1, n)
    out = np.zeros((n, 2))
    for ch in range(2):
        nz = _noise(n, seed + ch)
        out[:, ch] = lowpass(nz, 9000.0 * (1 - u) ** 1.5 + 200.0, 1.0) * (1 - u) ** 1.5
    fade_edges(out, int(0.003 * sr), int(0.01 * sr))
    return peak_norm(out, 0.7)


def whoosh(dur=0.4, sr=SR, seed=141, up=True):
    n = int(dur * sr)
    u = np.linspace(0, 1, n)
    env = np.sin(np.pi * u) ** 1.7
    sweep = 500.0 * (6.0 ** (u if up else 1 - u)) * 1.0
    out = np.zeros((n, 2))
    for ch in range(2):
        nz = _noise(n, seed + ch)
        out[:, ch] = bandpass(nz, sweep, 1.1) * env
    pan = (u * 2 - 1) * (0.5 if up else -0.5)
    out[:, 0] *= 1 - 0.5 * (pan > 0) * pan
    out[:, 1] *= 1 + 0.5 * (pan < 0) * pan
    fade_edges(out, int(0.004 * sr), int(0.02 * sr))
    return peak_norm(out, 0.6)


# --------------------------------------------------------------------------- foley


def key_tick(variant=0, vel=1.0, sr=SR):
    """One keyboard key-down: a dry plastic tick over a short thock."""
    rng = np.random.default_rng(300 + variant)
    n = int(0.06 * sr)
    t = _t(n, sr)
    fc = rng.uniform(2600, 4200)
    nz = bandpass(_noise(n, 310 + variant), fc, 1.3) * np.exp(-t / 0.0035) * 1.4
    thock = np.sin(2 * np.pi * rng.uniform(150, 260) * t) * np.exp(-t / 0.007) * 0.8
    top = highpass(_noise(n, 320 + variant), 6000.0) * np.exp(-t / 0.0012) * 0.4
    x = nz + thock + top
    x *= np.minimum(1.0, t / 0.0004)
    fade_edges(x, 0, int(0.01 * sr))
    return peak_norm(x, 0.6) * (0.6 + 0.4 * vel)


def space_key(sr=SR):
    n = int(0.09 * sr)
    t = _t(n, sr)
    x = bandpass(_noise(n, 330), 1800.0, 1.0) * np.exp(-t / 0.006) * 1.1 + np.sin(2 * np.pi * 120 * t) * np.exp(-t / 0.014) * 0.9
    x += highpass(_noise(n, 331), 5000.0) * np.exp(-t / 0.0015) * 0.3
    fade_edges(x, 0, int(0.015 * sr))
    return peak_norm(x, 0.65)


def mouse_click(sr=SR):
    n = int(0.16 * sr)
    t = _t(n, sr)
    x = np.zeros(n)

    def tick(off, amp, f):
        i = int(off * sr)
        tt = t[: n - i]
        s = bandpass(_noise(n - i, 340 + int(off * 1000)), f, 1.6) * np.exp(-tt / 0.0012) * 1.5
        s += np.sin(2 * np.pi * (f * 0.42) * tt) * np.exp(-tt / 0.0025)
        s += highpass(_noise(n - i, 341 + int(off * 1000)), 6500.0) * np.exp(-tt / 0.0008) * 0.4
        x[i:] += s * amp

    tick(0.0, 1.0, 2700.0)
    tick(0.058, 0.45, 2300.0)
    fade_edges(x, 0, int(0.03 * sr))
    return peak_norm(x, 0.75)


def enter_clunk(sr=SR):
    n = int(0.3 * sr)
    t = _t(n, sr)
    thunk = np.sin(2 * np.pi * (92.5 + 40 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.05) * 1.2
    body = bandpass(_noise(n, 350), 700.0, 1.1) * np.exp(-t / 0.014) * 1.0
    click = highpass(_noise(n, 351), 3000.0) * np.exp(-t / 0.0025) * 0.7
    # mechanical return: second small bounce
    i2 = int(0.045 * sr)
    b2 = np.zeros(n)
    b2[i2:] = bandpass(_noise(n - i2, 352), 1500.0, 1.2) * np.exp(-t[: n - i2] / 0.006) * 0.45
    x = thunk + body + click + b2
    x = np.tanh(x * 1.3)
    fade_edges(x, 0, int(0.05 * sr))
    return peak_norm(x, 0.85)


def thud(sr=SR):
    """Dull error thump with a small bounce (a banner that shakes). Mono."""
    n = int(0.3 * sr)
    t = _t(n, sr)
    f = 80.0 * (1.0 + 0.6 * np.exp(-t / 0.02))
    x = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.055)
    i2 = int(0.07 * sr)
    b2 = np.zeros(n)
    b2[i2:] = np.sin(2 * np.pi * 70.0 * t[: n - i2]) * np.exp(-t[: n - i2] / 0.04) * 0.5
    nz = lowpass(_noise(n, 365), 500.0) * np.exp(-t / 0.012) * 0.5
    x = np.tanh((x + b2 + nz) * 1.4)
    fade_edges(x, int(0.0008 * sr), int(0.06 * sr))
    return peak_norm(x, 0.8)


def pop(note=81, sr=SR):
    n = int(0.16 * sr)
    t = _t(n, sr)
    f0 = float(midi_hz(note))
    f = f0 * (0.55 + 0.9 * np.exp(-t / 0.018))
    x = np.sin(2 * np.pi * np.cumsum(f) / sr) * np.exp(-t / 0.035)
    x += np.sin(2 * np.pi * np.cumsum(f * 2.0) / sr) * np.exp(-t / 0.02) * 0.2
    x += highpass(_noise(n, 360), 4500.0) * np.exp(-t / 0.002) * 0.35
    x *= np.minimum(1.0, t / 0.0005)
    fade_edges(x, 0, int(0.04 * sr))
    return peak_norm(x, 0.75)


def data_blip(note=88, sr=SR):
    n = int(0.09 * sr)
    t = _t(n, sr)
    f = float(midi_hz(note))
    x = np.sin(2 * np.pi * f * t) * 0.8 + pulse_osc(np.full(n, f), np.full(n, 0.5), 0.0, float(sr)) * 0.18
    x = lowpass(x, 7000.0, 0.8)
    x *= np.exp(-t / 0.022) * np.minimum(1.0, t / 0.0008)
    fade_edges(x, 0, int(0.02 * sr))
    return peak_norm(x, 0.55)


def tick_perc(variant=0, sr=SR):
    n = int(0.03 * sr)
    t = _t(n, sr)
    x = highpass(_noise(n, 370 + variant), 4500.0) * np.exp(-t / 0.0016) + np.sin(2 * np.pi * 3100 * t) * np.exp(-t / 0.0015) * 0.5
    fade_edges(x, 0, int(0.005 * sr))
    return peak_norm(x, 0.55)
