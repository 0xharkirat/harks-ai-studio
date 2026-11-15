"""Diagnostics: per-stem loudness per section and band balance. uv run python src/diag.py anthem"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine.dsp import SR
from song import cues, instruments, mix

BANDS = [(20, 40), (40, 80), (80, 160), (160, 315), (315, 630), (630, 1250), (1250, 2500), (2500, 5000), (5000, 10000), (10000, 20000)]


def band_levels(x):
    m = x.mean(axis=1)
    f, P = signal.welch(m, SR, nperseg=8192)
    out = []
    for lo, hi in BANDS:
        sel = (f >= lo) & (f < hi)
        out.append(10 * np.log10(P[sel].sum() * (f[1] - f[0]) + 1e-20))
    return out


def main(name):
    S = getattr(cues, name)()
    N = int(round(S.file_dur * SR))
    stems = instruments.render_stems(S, N, ROOT)
    post = mix.process_strips(S, stems)
    meter = pyln.Meter(SR)
    secs = S.sections
    print("per-stem short-integrated loudness (LUFS of the stem alone) per section")
    print(f"{'':8s}" + "".join(f"{s['id'][:9]:>10s}" for s in secs))
    for k, v in post.items():
        row = []
        for s in secs:
            a, b = int(s["start"] * SR), int(min(s["end"], N / SR) * SR)
            seg = v[a:b]
            try:
                row.append(meter.integrated_loudness(seg) if np.abs(seg).max() > 1e-6 else -99.0)
            except Exception:
                row.append(-99.0)
        print(f"{k:8s}" + "".join(f"{r:10.1f}" for r in row))
    tot = sum(post.values())
    row = []
    for s in secs:
        a, b = int(s["start"] * SR), int(min(s["end"], N / SR) * SR)
        row.append(meter.integrated_loudness(tot[a:b]))
    print(f"{'SUM':8s}" + "".join(f"{r:10.1f}" for r in row))
    print("\nband levels of SUM (dB re 1, power sum) per section; bands:", BANDS)
    for s in secs:
        a, b = int(s["start"] * SR), int(min(s["end"], N / SR) * SR)
        bl = band_levels(tot[a:b])
        ref = bl[5]
        print(f"{s['id'][:9]:10s}" + "".join(f"{v - ref:7.1f}" for v in bl))
    print("target(rel 630-1250): 20-40:+1  40-80:+7  80-160:+5  160-315:+2.5  315-630:+1  630-1250:0  1.25-2.5k:-1.5  2.5-5k:-3  5-10k:-4.5  10-20k:-6.5")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "anthem")
