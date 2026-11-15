"""Effects: FDN reverb, ping-pong delay, chorus, compressor, sidechain, limiter, stereo tools."""
from __future__ import annotations

import numpy as np
from numba import njit
from scipy import ndimage, signal

from .dsp import SR, db, eq

# --------------------------------------------------------------------------- reverb


@njit(cache=True, fastmath=True)
def _fdn(inl, inr, delays, fb_gain, damp, mod_depth, mod_rate, sr):
    n = inl.shape[0]
    nl = delays.shape[0]  # 8
    maxd = 0
    for k in range(nl):
        if delays[k] > maxd:
            maxd = delays[k]
    size = maxd + 64
    buf = np.zeros((nl, size))
    wp = 0
    lp = np.zeros(nl)
    outl = np.zeros(n)
    outr = np.zeros(n)
    tap = np.zeros(nl)
    # input diffusion allpasses (4 in series, per channel)
    ap_d = np.array([142, 107, 379, 277])
    ap_buf = np.zeros((4, 400))
    ap_w = np.zeros(4, dtype=np.int64)
    ap_g = 0.62
    for i in range(n):
        xin = 0.5 * (inl[i] + inr[i])
        # diffusion
        for a in range(4):
            d = ap_d[a]
            rp = ap_w[a] - d
            if rp < 0:
                rp += 400
            bd = ap_buf[a, rp]
            v = xin - ap_g * bd
            ap_buf[a, ap_w[a]] = v
            xin = bd + ap_g * v
            ap_w[a] += 1
            if ap_w[a] >= 400:
                ap_w[a] = 0
        # read taps with modulation
        for k in range(nl):
            m = mod_depth * np.sin(2.0 * np.pi * mod_rate * (0.37 + 0.11 * k) * i / sr + k)
            d = delays[k] + m
            rp = wp - d
            while rp < 0:
                rp += size
            i0 = int(rp)
            fr = rp - i0
            i1 = i0 + 1
            if i1 >= size:
                i1 -= size
            tap[k] = buf[k, i0] * (1.0 - fr) + buf[k, i1] * fr
            lp[k] = (1.0 - damp) * tap[k] + damp * lp[k]
            tap[k] = lp[k] * fb_gain[k]
        # hadamard 8
        t0 = tap[0] + tap[1]
        t1 = tap[0] - tap[1]
        t2 = tap[2] + tap[3]
        t3 = tap[2] - tap[3]
        t4 = tap[4] + tap[5]
        t5 = tap[4] - tap[5]
        t6 = tap[6] + tap[7]
        t7 = tap[6] - tap[7]
        u0 = t0 + t2
        u1 = t1 + t3
        u2 = t0 - t2
        u3 = t1 - t3
        u4 = t4 + t6
        u5 = t5 + t7
        u6 = t4 - t6
        u7 = t5 - t7
        s = 0.35355339059327373
        h0 = (u0 + u4) * s
        h1 = (u1 + u5) * s
        h2 = (u2 + u6) * s
        h3 = (u3 + u7) * s
        h4 = (u0 - u4) * s
        h5 = (u1 - u5) * s
        h6 = (u2 - u6) * s
        h7 = (u3 - u7) * s
        buf[0, wp] = h0 + xin * (inl[i] * 0.0 + 1.0)
        buf[1, wp] = h1 + xin
        buf[2, wp] = h2 + xin
        buf[3, wp] = h3 + xin
        buf[4, wp] = h4 - xin
        buf[5, wp] = h5 + xin
        buf[6, wp] = h6 - xin
        buf[7, wp] = h7 - xin
        outl[i] = tap[0] + tap[2] - tap[4] + tap[6] - tap[1] * 0.5 + tap[3] * 0.5
        outr[i] = tap[1] + tap[3] - tap[5] + tap[7] - tap[0] * 0.5 + tap[2] * 0.5
        wp += 1
        if wp >= size:
            wp = 0
    return outl, outr


_REVERB_PRESETS = {
    # base delays (samples @48k), rt60 s, damping (0..1 higher=darker), predelay ms
    "plate": dict(base=[743, 877, 1009, 1153, 1303, 1423, 1571, 1699], rt60=1.5, damp=0.22, pre=8, hp=220, lp=9500),
    "hall": dict(base=[1259, 1447, 1637, 1823, 2039, 2251, 2467, 2689], rt60=2.8, damp=0.34, pre=22, hp=200, lp=7500),
    "room": dict(base=[431, 509, 587, 673, 761, 839, 929, 1013], rt60=0.55, damp=0.3, pre=2, hp=200, lp=9000),
    "big": dict(base=[1583, 1721, 1867, 2003, 2203, 2399, 2593, 2801], rt60=4.2, damp=0.4, pre=35, hp=240, lp=6500),
}


def reverb(x, preset="plate", rt60=None, damp=None, pre_ms=None, sr=SR):
    """Wet-only stereo reverb of a stereo (n,2) or mono (n,) input. Output is stereo, peak-ish level ~ input."""
    p = _REVERB_PRESETS[preset]
    rt = rt60 if rt60 is not None else p["rt60"]
    dp = damp if damp is not None else p["damp"]
    pre = pre_ms if pre_ms is not None else p["pre"]
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    pre_n = int(sr * pre / 1000)
    xi = np.concatenate([np.zeros((pre_n, 2)), x], axis=0)[: x.shape[0]]
    xi = eq(xi, [("hp", p["hp"], 0.707, 0.0), ("lp", p["lp"], 0.707, 0.0)])
    delays = np.array(p["base"], dtype=np.int64)
    gains = 10.0 ** (-3.0 * delays / (rt * sr))
    # compensate damping loop loss lightly
    ol, orr = _fdn(
        np.ascontiguousarray(xi[:, 0]), np.ascontiguousarray(xi[:, 1]),
        delays, gains.astype(np.float64), float(dp), 6.0, 0.35, float(sr),
    )
    out = np.stack([ol, orr], axis=1) * 0.35
    return out


# --------------------------------------------------------------------------- delay


@njit(cache=True, fastmath=True)
def _pingpong(inl, inr, dl, dr, fb, cross, lpc, hpc):
    n = inl.shape[0]
    size = max(dl, dr) + 4
    bl = np.zeros(size)
    br = np.zeros(size)
    wp = 0
    outl = np.zeros(n)
    outr = np.zeros(n)
    lp_l = 0.0
    lp_r = 0.0
    hp_l = 0.0
    hp_r = 0.0
    for i in range(n):
        rl = wp - dl
        if rl < 0:
            rl += size
        rr = wp - dr
        if rr < 0:
            rr += size
        tl = bl[rl]
        tr = br[rr]
        outl[i] = tl
        outr[i] = tr
        # feedback path: lowpass then highpass
        lp_l = lp_l + lpc * (tl - lp_l)
        lp_r = lp_r + lpc * (tr - lp_r)
        hp_l = hp_l + hpc * (lp_l - hp_l)
        hp_r = hp_r + hpc * (lp_r - hp_r)
        fl = lp_l - hp_l
        fr_ = lp_r - hp_r
        # ping-pong: left input feeds left line, which crosses to right line
        bl[wp] = inl[i] + fb * (fr_ * cross + fl * (1.0 - cross))
        br[wp] = inr[i] + fb * (fl * cross + fr_ * (1.0 - cross))
        wp += 1
        if wp >= size:
            wp = 0
    return outl, outr


def pingpong(x, time_s=0.375, fb=0.38, cross=1.0, lp_hz=4500.0, hp_hz=250.0, sr=SR):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    d = int(round(time_s * sr))
    lpc = 1.0 - np.exp(-2 * np.pi * lp_hz / sr)
    hpc = 1.0 - np.exp(-2 * np.pi * hp_hz / sr)
    # feed mono sum into the left line only, so echoes alternate L, R, L, R
    mono = 0.5 * (x[:, 0] + x[:, 1])
    z = np.zeros_like(mono)
    ol, orr = _pingpong(np.ascontiguousarray(mono), z, d, d, fb, cross, lpc, hpc)
    return np.stack([ol, orr], axis=1)


# --------------------------------------------------------------------------- chorus / width


@njit(cache=True, fastmath=True)
def _chorus(x, depth_s, rate_hz, base_s, phase, sr):
    n = x.shape[0]
    size = int(sr * (base_s + depth_s) * 2) + 8
    buf = np.zeros(size)
    out = np.empty(n)
    wp = 0
    for i in range(n):
        buf[wp] = x[i]
        d = (base_s + depth_s * np.sin(2.0 * np.pi * rate_hz * i / sr + phase)) * sr
        rp = wp - d
        while rp < 0:
            rp += size
        i0 = int(rp)
        fr = rp - i0
        i1 = i0 + 1
        if i1 >= size:
            i1 -= size
        out[i] = buf[i0] * (1.0 - fr) + buf[i1] * fr
        wp += 1
        if wp >= size:
            wp = 0
    return out


def stereo_chorus(x, mix=0.5, depth_ms=2.6, rate=0.45, base_ms=14.0, sr=SR):
    """Dual-LFO chorus that widens a stereo (or mono) signal; wet L/R are 90 degrees apart."""
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    wl = _chorus(np.ascontiguousarray(x[:, 0]), depth_ms / 1000, rate, base_ms / 1000, 0.0, float(sr))
    wr = _chorus(np.ascontiguousarray(x[:, 1]), depth_ms / 1000, rate * 1.07, (base_ms + 2.5) / 1000, 1.9, float(sr))
    w = np.stack([wl, wr], axis=1)
    return x * (1 - mix * 0.5) + w * mix


def widen(x, amount=1.2):
    """Mid/side width. amount 1 = unchanged."""
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = 0.5 * (x[:, 0] - x[:, 1]) * amount
    return np.stack([m + s, m - s], axis=1)


def mono_below(x, fc=120.0, sr=SR):
    """Collapse the side signal below fc so low end is mono."""
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = 0.5 * (x[:, 0] - x[:, 1])
    sos = signal.butter(4, fc, "highpass", fs=sr, output="sos")
    s = signal.sosfilt(sos, s)
    return np.stack([m + s, m - s], axis=1)


def balance(x, pan):
    a = (pan + 1.0) * np.pi / 4.0
    return x * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2.0)


# --------------------------------------------------------------------------- dynamics


@njit(cache=True, fastmath=True)
def _comp(key, thr_db, ratio, knee_db, atk, rel):
    n = key.shape[0]
    gr = np.zeros(n)
    g_prev = 0.0
    lev = 0.0
    for i in range(n):
        a = abs(key[i])
        # fast peak detector (instant attack, 5 ms release) feeding the gain computer
        if a > lev:
            lev = a
        else:
            lev = a + (lev - a) * 0.9985
        l_db = 20.0 * np.log10(lev + 1e-9)
        over = l_db - thr_db
        if 2.0 * over < -knee_db:
            red = 0.0
        elif 2.0 * abs(over) <= knee_db:
            red = (1.0 / ratio - 1.0) * (over + knee_db / 2.0) ** 2 / (2.0 * knee_db)
        else:
            red = (1.0 / ratio - 1.0) * over
        # smooth in the dB domain (attack when reduction deepens)
        if red < g_prev:
            g_prev = atk * g_prev + (1.0 - atk) * red
        else:
            g_prev = rel * g_prev + (1.0 - rel) * red
        gr[i] = g_prev
    return gr


def compress(x, thr_db=-18.0, ratio=2.0, atk_ms=20.0, rel_ms=150.0, knee_db=6.0, makeup_db=0.0, key=None, sr=SR, return_gr=False):
    x = np.asarray(x, dtype=np.float64)
    k = x if key is None else key
    kd = np.max(np.abs(k), axis=1) if k.ndim == 2 else np.abs(k)
    atk = np.exp(-1.0 / (sr * atk_ms / 1000.0))
    rel = np.exp(-1.0 / (sr * rel_ms / 1000.0))
    gr = _comp(np.ascontiguousarray(kd), thr_db, ratio, knee_db, atk, rel)
    g = 10.0 ** ((gr + makeup_db) / 20.0)
    y = x * (g[:, None] if x.ndim == 2 else g)
    return (y, gr) if return_gr else y


def duck_curve(n, hit_times, depth=0.7, tau=0.11, atk_s=0.003, sr=SR, hold_s=0.0):
    """Gain curve (1 = no ducking) that dips at each hit and recovers exponentially. depth 0..1."""
    g = np.ones(n)
    seg_len = int(sr * max(tau * 7.0, 0.3)) + int(sr * hold_s)
    ta = int(sr * atk_s)
    shape = np.empty(seg_len)
    for j in range(seg_len):
        if j < ta:
            shape[j] = depth * (j / max(ta, 1))
        else:
            tt = (j - ta - hold_s * sr) / sr
            shape[j] = depth if tt <= 0 else depth * np.exp(-tt / tau)
    for t in hit_times:
        i0 = int(round(t * sr))
        if i0 >= n:
            continue
        i1 = min(n, i0 + seg_len)
        g[i0:i1] *= 1.0 - shape[: i1 - i0]
    return g


# --------------------------------------------------------------------------- limiter


@njit(cache=True, fastmath=True)
def _release_stage(g, rel):
    n = g.shape[0]
    out = np.empty(n)
    prev = 1.0
    for i in range(n):
        up = prev + (1.0 - prev) * rel
        v = g[i] if g[i] < up else up
        out[i] = v
        prev = v
    return out


def true_peak(x, os=8):
    up = signal.resample_poly(x, os, 1, axis=0)
    return float(np.max(np.abs(up)))


def limiter(x, ceiling_db=-1.2, look_ms=1.5, rel_ms=90.0, sr=SR, return_gr=False):
    """Look-ahead limiter that detects on a 4x oversampled signal (true-peak safe)."""
    x = np.asarray(x, dtype=np.float64)
    n = x.shape[0]
    ceil = 10.0 ** (ceiling_db / 20.0)
    L = max(2, int(sr * look_ms / 1000))
    up = signal.resample_poly(x, 4, 1, axis=0)
    p = np.max(np.abs(up), axis=1)[: n * 4].reshape(n, 4).max(axis=1)
    p = np.maximum(p, np.max(np.abs(x), axis=1))
    r = np.minimum(1.0, ceil / np.maximum(p, 1e-9))
    # look-ahead running minimum over [j, j+L-1]
    rp = np.concatenate([r, np.ones(L)])
    m = ndimage.minimum_filter1d(rp, size=L, origin=-(L // 2) if L % 2 == 0 else -((L - 1) // 2), mode="nearest")[:n]
    # make sure window really is [j, j+L-1]
    cs = np.concatenate([np.ones(L), m]).cumsum()
    g = (cs[L:] - cs[:-L]) / L  # mean of m[n-L+1..n]
    rel = 1.0 - np.exp(-1.0 / (sr * rel_ms / 1000.0))
    g = _release_stage(np.ascontiguousarray(g), rel)
    y = x * g[:, None]
    # safety: second pass if any true-peak overshoot remains
    tp = true_peak(y, 8)
    it = 0
    while tp > ceil * 1.0005 and it < 6:
        y = y * (ceil / tp) * 0.9995
        tp = true_peak(y, 8)
        it += 1
    return (y, g) if return_gr else y
