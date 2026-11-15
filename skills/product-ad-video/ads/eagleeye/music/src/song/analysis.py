"""Measurements used for QC (loudness, true peak, grid, key, clicks, spectrograms)."""
from __future__ import annotations

import numpy as np
import pyloudnorm as pyln
from scipy import signal

from engine.dsp import SR
from engine.fx import true_peak
from .theory import KEY_PCS, STEP


def lufs_int(x):
    return pyln.Meter(SR).integrated_loudness(x)


_K1 = (np.array([1.53512485958697, -2.69169618940638, 1.19839281085285]), np.array([1.0, -1.69065929318241, 0.73248077421585]))
_K2 = (np.array([1.0, -2.0, 1.0]), np.array([1.0, -1.99004745483398, 0.99007225036621]))


def kweight_ms(x):
    """K-weighted per-sample power, channel-summed (BS.1770, 48 kHz)."""
    y = signal.lfilter(*_K1, x, axis=0)
    y = signal.lfilter(*_K2, y, axis=0)
    return (y ** 2).sum(axis=1)


def short_term(x, win=3.0, hop=0.5):
    """Short-term loudness (3 s window, ungated) track: (times, LUFS)."""
    p = kweight_ms(x)
    c = np.concatenate([[0.0], np.cumsum(p)])
    w, h = int(win * SR), int(hop * SR)
    idx = np.arange(0, len(p) - w + 1, h)
    ms = (c[idx + w] - c[idx]) / w
    return (idx + w / 2) / SR, -0.691 + 10 * np.log10(ms + 1e-12)


def momentary_curve(x, win=0.4, hop=0.1):
    meter = pyln.Meter(SR, block_size=win)
    ts, ls = [], []
    w = int(win * SR)
    h = int(hop * SR)
    for i in range(0, x.shape[0] - w, h):
        seg = x[i:i + w]
        e = np.mean(seg ** 2)
        ts.append((i + w / 2) / SR)
        ls.append(10 * np.log10(e + 1e-12))
    return np.array(ts), np.array(ls)


def section_lufs(x, sections, lo_pad=0.0):
    out = {}
    meter = pyln.Meter(SR)
    for s in sections:
        a, b = int(s["start"] * SR), int(min(s["end"], x.shape[0] / SR) * SR)
        seg = x[a:b]
        if seg.shape[0] < int(0.5 * SR):
            out[s["id"]] = None
            continue
        try:
            out[s["id"]] = float(meter.integrated_loudness(seg))
        except Exception:
            out[s["id"]] = None
    return out


def mono_low_end(x, fc=120.0):
    sos = signal.butter(4, fc, "lowpass", fs=SR, output="sos")
    l = signal.sosfilt(sos, x[:, 0])
    r = signal.sosfilt(sos, x[:, 1])
    m, s = 0.5 * (l + r), 0.5 * (l - r)
    em, es = np.mean(m ** 2), np.mean(s ** 2)
    corr = float(np.corrcoef(l, r)[0, 1]) if np.std(l) > 0 and np.std(r) > 0 else 1.0
    return dict(side_to_mid_db=float(10 * np.log10((es + 1e-20) / (em + 1e-20))), corr=corr)


def clicks(x, thresh_db=-28.0, hop=1):
    """Discontinuity scan: sample-to-sample jumps in the 2nd difference that stick out from local level."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    d2 = np.abs(np.diff(m, 2))
    # local level: RMS of 2nd difference over +-5 ms
    w = int(0.01 * SR)
    loc = np.sqrt(np.convolve(d2 ** 2, np.ones(w) / w, mode="same")) + 1e-6
    ratio = d2 / loc
    idx = np.where((ratio > 14.0) & (d2 > 10 ** (thresh_db / 20)))[0]
    # merge close indices
    groups = []
    for i in idx:
        if not groups or i - groups[-1][-1] > 48:
            groups.append([i])
        else:
            groups[-1].append(i)
    return [(g[0] / SR, float(d2[g].max()), float(ratio[g].max())) for g in groups]


def chroma_in_key(x, fmin=80.0, fmax=3000.0, nfft=16384):
    """Fraction of (mid-band) spectral energy that lies on pitch classes of the key (+- 35 cents)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    f, t, Z = signal.stft(m, SR, nperseg=nfft, noverlap=nfft // 2)
    P = np.mean(np.abs(Z) ** 2, axis=1)
    sel = (f >= fmin) & (f <= fmax)
    midi = 69 + 12 * np.log2(np.maximum(f[sel], 1e-3) / 440.0)
    pc = np.round(midi).astype(int) % 12
    cents = (midi - np.round(midi)) * 100
    ok = np.array([p in KEY_PCS for p in pc]) & (np.abs(cents) < 35)
    near = np.abs(cents) < 35
    tot = P[sel][near].sum()
    return float(P[sel][ok].sum() / (tot + 1e-20))


def detect_onsets(x, t_min=0.0, hp=60.0, lp=None, thr=3.0, min_gap=0.06):
    """Simple energy-flux onset picker on a stem. Returns times (s)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    sos = signal.butter(2, hp, "highpass", fs=SR, output="sos")
    m = signal.sosfilt(sos, m)
    if lp:
        sos = signal.butter(2, lp, "lowpass", fs=SR, output="sos")
        m = signal.sosfilt(sos, m)
    hopn = 48
    frames = m[: len(m) // hopn * hopn].reshape(-1, hopn)
    env = np.sqrt((frames ** 2).mean(axis=1)) + 1e-9
    le = np.log(env)
    flux = np.maximum(0, np.diff(le, prepend=le[0]))
    # peak-pick
    med = np.median(flux[flux > 0]) if np.any(flux > 0) else 0
    th = max(thr * med, 0.35)
    picks = []
    for i in range(1, len(flux) - 1):
        if flux[i] >= th and flux[i] >= flux[i - 1] and flux[i] > flux[i + 1]:
            t = i * hopn / SR
            if not picks or t - picks[-1] > min_gap:
                picks.append(t)
    return np.array(picks)


def grid_error_ms(times, step=STEP):
    if len(times) == 0:
        return np.array([])
    r = (times / step) - np.round(times / step)
    return r * step * 1000.0
