"""Stem-vs-stem band balance in the chorus. uv run python src/diag2.py anthem 16 24"""
import sys
from pathlib import Path
import numpy as np
from scipy import signal
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine.dsp import SR
from song import cues, instruments, mix
BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
name, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
S = getattr(cues, name)()
N = int(S.file_dur * SR)
post = mix.process_strips(S, instruments.render_stems(S, N, ROOT))
print(f"{'':7s}" + "".join(f"{lo:>6d}-{hi // 1000 if hi >= 1000 else hi}{'k' if hi >= 1000 else ''}" for lo, hi in BANDS))
tot = None
for k, v in post.items():
    seg = v[int(t0 * SR):int(t1 * SR)].mean(axis=1)
    f, P = signal.welch(seg, SR, nperseg=8192)
    row = []
    for lo, hi in BANDS:
        sel = (f >= lo) & (f < hi)
        row.append(10 * np.log10(P[sel].sum() * (f[1] - f[0]) + 1e-20))
    print(f"{k:7s}" + "".join(f"{r:11.1f}" for r in row))
