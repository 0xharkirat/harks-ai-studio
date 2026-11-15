"""Game-style reaction sounds in the cartoon mobile-game manner: a happy "level up", a magic helper sweep and a
chat "bloop". (The content editor's "aah" is a CC0 recording instead: music/assets/sfx.) All synthesized here (no samples). Mono float64 at 48 kHz.

The notes sit in the music's key (A major pentatonic), so a sound on top of the score never clashes.
"""
from __future__ import annotations

import numpy as np

from .dsp import SR, bandpass, fade_edges, highpass, lowpass, midi_hz, peak_norm


def _t(n, sr=SR):
    return np.arange(n) / sr


def _noise(n, seed):
    return np.random.default_rng(seed).standard_normal(n)


def _mallet(f, dur, sr=SR, bright=1.0):
    """Wooden mallet bar (marimba / xylophone): the fundamental plus the bar's 4th and 10th partials."""
    n = int(dur * sr)
    t = _t(n, sr)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.17)
    x += 0.38 * bright * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.035)
    x += 0.12 * bright * np.sin(2 * np.pi * f * 9.24 * t) * np.exp(-t / 0.011)
    return x * np.minimum(1.0, t / 0.0012)


def _bell(f, dur, sr=SR, decay=0.5):
    """Small glass bell for the sparkle: inharmonic partials with a slow shimmer."""
    n = int(dur * sr)
    t = _t(n, sr)
    x = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 1.0), (2.76, 0.45, 0.5), (5.40, 0.22, 0.25), (8.93, 0.10, 0.12)):
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / (decay * d))
    x *= 1.0 + 0.12 * np.sin(2 * np.pi * 7.0 * t)
    return x * np.minimum(1.0, t / 0.0008)


def _add(buf, sig, t0, gain=1.0, sr=SR):
    i = int(round(t0 * sr))
    j = min(buf.shape[0], i + sig.shape[0])
    buf[i:j] += sig[: j - i] * gain


def happy(root=81, sr=SR):
    """'Level up': a fast rising major arpeggio on the mallet, then two sparkle bells. About 0.8 s."""
    x = np.zeros(int(0.85 * sr))
    notes = [root, root + 4, root + 7, root + 12]
    for i, m in enumerate(notes):
        last = i == len(notes) - 1
        _add(x, _mallet(float(midi_hz(m)), 0.5 if last else 0.25, sr), i * 0.055, 1.0 if last else 0.8)
    _add(x, _bell(float(midi_hz(root + 24)), 0.6, sr, 0.35), 0.21, 0.32)
    _add(x, _bell(float(midi_hz(root + 28)), 0.55, sr, 0.3), 0.27, 0.24)
    fade_edges(x, 0, int(0.08 * sr))
    return peak_norm(x, 0.8)






def magic(root=81, sr=SR):
    """The helper arrives: a harp-like bell glissando up the pentatonic over an airy swoosh, then a 'ding'. About 1.3 s."""
    x = np.zeros(int(1.3 * sr))
    penta = [0, 2, 4, 7, 9]
    notes = [root + 12 * (i // 5) + penta[i % 5] for i in range(11)]
    for i, m in enumerate(notes):
        _add(x, _bell(float(midi_hz(m)), 0.45, sr, 0.22), i * 0.034, 0.55)
    _add(x, _bell(float(midi_hz(root + 12)), 0.85, sr, 0.55), 0.42, 0.9)
    _add(x, _bell(float(midi_hz(root + 19)), 0.8, sr, 0.5), 0.42, 0.6)
    # Airy swoosh that rises with the glissando.
    n = int(0.5 * sr)
    tt = _t(n, sr)
    sw = bandpass(_noise(n, 77), 900.0 * (9.0 ** (tt / 0.5)), 1.4) * np.sin(np.pi * tt / 0.5) ** 2
    _add(x, sw, 0.0, 0.35)
    fade_edges(x, 0, int(0.2 * sr))
    return peak_norm(x, 0.8)


def bubble(note=88, sr=SR):
    """Chat 'bloop': a round tone that bends up into its pitch, with a small click on top. About 0.2 s."""
    n = int(0.2 * sr)
    t = _t(n, sr)
    f0 = float(midi_hz(note))
    f = f0 * (1.08 - 0.36 * np.exp(-t / 0.014))
    ph = 2 * np.pi * np.cumsum(f) / sr
    x = np.sin(ph) * np.exp(-t / 0.075)
    x += 0.3 * np.sin(2 * ph) * np.exp(-t / 0.03)
    x += highpass(_noise(n, 361), 3500.0) * np.exp(-t / 0.0025) * 0.3
    x *= np.minimum(1.0, t / 0.0008)
    fade_edges(x, 0, int(0.05 * sr))
    return peak_norm(x, 0.85)


# How long each sound needs the music to step back (seconds): the score dips under it.
HOLD = {"happy": 0.55, "magic": 0.9, "bubble": 0.12}
