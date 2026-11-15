"""Low-level DSP kernels: band-limited oscillators, filters, envelopes, shapers.

Everything here is deterministic and sample-free. Heavy loops are numba-compiled.
"""
from __future__ import annotations

import numpy as np
from numba import njit
from scipy import signal

SR = 48000


def db(x):
    return 10.0 ** (np.asarray(x, dtype=np.float64) / 20.0)


def to_db(x):
    return 20.0 * np.log10(np.maximum(np.asarray(x, dtype=np.float64), 1e-12))


def midi_hz(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


# --------------------------------------------------------------------------- oscillators


@njit(cache=True, fastmath=True)
def _blep(t, dt):
    if t < dt:
        x = t / dt
        return x + x - x * x - 1.0
    elif t > 1.0 - dt:
        x = (t - 1.0) / dt
        return x * x + x + x + 1.0
    return 0.0


@njit(cache=True, fastmath=True)
def saw_osc(freq, phase0, sr):
    """PolyBLEP saw. freq: per-sample Hz array."""
    n = freq.shape[0]
    out = np.empty(n)
    ph = phase0
    for i in range(n):
        dt = freq[i] / sr
        out[i] = 2.0 * ph - 1.0 - _blep(ph, dt)
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=True, fastmath=True)
def pulse_osc(freq, pw, phase0, sr):
    """PolyBLEP pulse with per-sample width."""
    n = freq.shape[0]
    out = np.empty(n)
    ph = phase0
    for i in range(n):
        dt = freq[i] / sr
        w = pw[i]
        v = 1.0 if ph < w else -1.0
        v += _blep(ph, dt)
        t2 = ph - w
        if t2 < 0.0:
            t2 += 1.0
        v -= _blep(t2, dt)
        out[i] = v
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
    return out


@njit(cache=True, fastmath=True)
def supersaw(freq, detune_cents, phases, pans, sr):
    """Stereo bank of detuned PolyBLEP saws. freq: per-sample base Hz."""
    n = freq.shape[0]
    v = detune_cents.shape[0]
    out = np.zeros((n, 2))
    ph = phases.copy()
    ratio = np.empty(v)
    gl = np.empty(v)
    gr = np.empty(v)
    for k in range(v):
        ratio[k] = 2.0 ** (detune_cents[k] / 1200.0)
        a = (pans[k] + 1.0) * np.pi / 4.0
        gl[k] = np.cos(a)
        gr[k] = np.sin(a)
    for i in range(n):
        l = 0.0
        r = 0.0
        for k in range(v):
            dt = freq[i] * ratio[k] / sr
            s = 2.0 * ph[k] - 1.0 - _blep(ph[k], dt)
            ph[k] += dt
            if ph[k] >= 1.0:
                ph[k] -= 1.0
            l += s * gl[k]
            r += s * gr[k]
        out[i, 0] = l
        out[i, 1] = r
    return out / np.sqrt(v)


# --------------------------------------------------------------------------- filters


@njit(cache=True, fastmath=True)
def svf(x, cutoff, q, mode, sr):
    """Cytomic/Zavalishin TPT state-variable filter, per-sample cutoff.

    mode 0 low-pass, 1 band-pass (constant skirt), 2 high-pass, 3 notch.
    """
    n = x.shape[0]
    y = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    lim = 0.45 * sr
    for i in range(n):
        fc = cutoff[i]
        if fc > lim:
            fc = lim
        if fc < 10.0:
            fc = 10.0
        g = np.tan(np.pi * fc / sr)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v0 = x[i]
        v3 = v0 - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[i] = v2
        elif mode == 1:
            y[i] = v1
        elif mode == 2:
            y[i] = v0 - k * v1 - v2
        else:
            y[i] = v0 - k * v1
    return y


def lowpass(x, cutoff, q=0.707, sr=SR):
    return _apply_svf(x, cutoff, q, 0, sr)


def highpass(x, cutoff, q=0.707, sr=SR):
    return _apply_svf(x, cutoff, q, 2, sr)


def bandpass(x, cutoff, q=1.0, sr=SR):
    return _apply_svf(x, cutoff, q, 1, sr)


def _apply_svf(x, cutoff, q, mode, sr):
    x = np.ascontiguousarray(x, dtype=np.float64)
    if x.ndim == 2:
        return np.stack([_apply_svf(x[:, c], cutoff, q, mode, sr) for c in range(x.shape[1])], axis=1)
    c = np.broadcast_to(np.asarray(cutoff, dtype=np.float64), x.shape).copy() if np.ndim(cutoff) == 0 else np.ascontiguousarray(cutoff, dtype=np.float64)
    return svf(x, c, float(q), mode, float(sr))


def biquad_sos(kind, f0, q=0.707, gain_db=0.0, sr=SR):
    """RBJ cookbook biquad as a 1x6 sos row."""
    a_lin = 10.0 ** (gain_db / 40.0)
    w0 = 2 * np.pi * f0 / sr
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2 * q)
    if kind == "lp":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "hp":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * a_lin, -2 * cw, 1 - alpha * a_lin]
        a = [1 + alpha / a_lin, -2 * cw, 1 - alpha / a_lin]
    elif kind == "lshelf":
        s = 2 * np.sqrt(a_lin) * alpha
        b = [a_lin * ((a_lin + 1) - (a_lin - 1) * cw + s), 2 * a_lin * ((a_lin - 1) - (a_lin + 1) * cw), a_lin * ((a_lin + 1) - (a_lin - 1) * cw - s)]
        a = [(a_lin + 1) + (a_lin - 1) * cw + s, -2 * ((a_lin - 1) + (a_lin + 1) * cw), (a_lin + 1) + (a_lin - 1) * cw - s]
    elif kind == "hshelf":
        s = 2 * np.sqrt(a_lin) * alpha
        b = [a_lin * ((a_lin + 1) + (a_lin - 1) * cw + s), -2 * a_lin * ((a_lin - 1) + (a_lin + 1) * cw), a_lin * ((a_lin + 1) + (a_lin - 1) * cw - s)]
        a = [(a_lin + 1) - (a_lin - 1) * cw + s, 2 * ((a_lin - 1) - (a_lin + 1) * cw), (a_lin + 1) - (a_lin - 1) * cw - s]
    elif kind == "notch":
        b = [1, -2 * cw, 1]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return np.concatenate([b, a])[None, :]


def eq(x, bands, sr=SR):
    """bands: list of (kind, f0, q, gain_db). Works on (n,) or (n,2)."""
    if not bands:
        return x
    sos = np.concatenate([biquad_sos(k, f, q, g, sr) for (k, f, q, g) in bands], axis=0)
    return signal.sosfilt(sos, x, axis=0)


def butter_hp(x, fc, order=2, sr=SR):
    sos = signal.butter(order, fc, "highpass", fs=sr, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def butter_lp(x, fc, order=2, sr=SR):
    sos = signal.butter(order, fc, "lowpass", fs=sr, output="sos")
    return signal.sosfilt(sos, x, axis=0)


# --------------------------------------------------------------------------- envelopes / shaping


@njit(cache=True, fastmath=True)
def adsr(n, gate_n, a_n, d_n, sustain, r_n):
    """Exponential-ish ADSR. Times in samples. Returns length n."""
    out = np.zeros(n)
    level = 0.0
    a_inc = 1.0 / max(a_n, 1)
    d_coef = np.exp(-1.0 / max(d_n, 1.0)) if d_n > 0 else 0.0
    r_coef = np.exp(-1.0 / max(r_n, 1.0)) if r_n > 0 else 0.0
    stage = 0
    for i in range(n):
        if i >= gate_n and stage < 3:
            stage = 3
        if stage == 0:
            level += a_inc
            if level >= 1.0:
                level = 1.0
                stage = 1
        elif stage == 1:
            level = sustain + (level - sustain) * d_coef
        elif stage == 3:
            level = level * r_coef
        out[i] = level
    return out


def exp_env(n, tau_s, sr=SR):
    return np.exp(-np.arange(n) / (tau_s * sr))


def fade_edges(x, fade_in=0, fade_out=0):
    """In-place linear (raised-cosine) edge fades in samples. Works on (n,) or (n,2)."""
    n = x.shape[0]
    fade_in = min(fade_in, n // 2)
    fade_out = min(fade_out, n // 2)
    if fade_in > 0:
        w = 0.5 - 0.5 * np.cos(np.pi * np.arange(fade_in) / fade_in)
        x[:fade_in] *= w[:, None] if x.ndim == 2 else w
    if fade_out > 0:
        w = 0.5 + 0.5 * np.cos(np.pi * np.arange(fade_out) / fade_out)
        x[n - fade_out:] *= w[:, None] if x.ndim == 2 else w
    return x


def softclip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive) if drive > 0 else x


def sat(x, drive=2.0, os=2, mix=1.0):
    """Oversampled tanh saturation, level-compensated."""
    if os > 1:
        up = signal.resample_poly(x, os, 1, axis=0)
        y = np.tanh(up * drive) / np.tanh(drive)
        y = signal.resample_poly(y, 1, os, axis=0)[: x.shape[0]]
    else:
        y = np.tanh(x * drive) / np.tanh(drive)
    return x * (1 - mix) + y * mix


def downsample(x, os):
    if os == 1:
        return x
    return signal.resample_poly(x, 1, os, axis=0)


def peak_norm(x, peak=0.9):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def rms(x):
    return float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0


def pan_stereo(x, pan):
    """Constant-power pan of a mono signal; pan in -1..1."""
    a = (pan + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)
