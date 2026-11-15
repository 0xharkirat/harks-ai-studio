"""QC report for a rendered cue: uv run python src/qc.py anthem [--png DIR]"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from engine.dsp import SR
from engine.fx import true_peak
from song import analysis as A, cues


def spectrogram_png(x, path, t0=0.0, t1=None, title=""):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from scipy import signal
    m = x.mean(axis=1)
    a, b = int(t0 * SR), int((t1 or len(m) / SR) * SR)
    seg = m[a:b]
    f, t, Z = signal.stft(seg, SR, nperseg=4096, noverlap=3072)
    P = 20 * np.log10(np.abs(Z) + 1e-7)
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.pcolormesh(t + t0, f, P, vmin=-110, vmax=-30, shading="auto", cmap="magma")
    ax.set_yscale("symlog", linthresh=200)
    ax.set_ylim(30, 20000)
    ax.set_title(title)
    ax.set_xlabel("s")
    fig.tight_layout()
    fig.savefig(path, dpi=70)
    plt.close(fig)


def report(name, S=None, png=None, out=ROOT / "out"):
    x, sr = sf.read(out / f"{name}.wav")
    assert sr == SR
    S = S or getattr(cues, name)()
    print(f"== {name}: {x.shape[0] / SR:.3f} s, {x.shape[1]} ch")
    print(f"integrated LUFS {A.lufs_int(x):.2f}  true peak {20*np.log10(true_peak(x, 8)):.2f} dBTP  sample peak {20*np.log10(np.abs(x).max()):.2f}  DC {x.mean(axis=0)}")
    clip = int(np.sum(np.abs(x) >= 0.99999))
    print(f"clipped samples {clip}")
    ml = A.mono_low_end(x)
    print(f"low end <120 Hz: side/mid {ml['side_to_mid_db']:.1f} dB, L/R corr {ml['corr']:.4f}")
    sl = A.section_lufs(x, S.sections)
    for s in S.sections:
        v = sl[s["id"]]
        print(f"  {s['id']:10s} {s['start']:6.1f}-{s['end']:6.1f}  LUFS {v if v is None else round(v, 1)}")
    cl = A.clicks(x)
    print(f"click candidates: {len(cl)}", [(round(t, 3), round(r, 1)) for t, _, r in cl[:12]])
    print(f"energy on key pitch classes (mix): {A.chroma_in_key(x):.3f}")
    if png:
        Path(png).mkdir(parents=True, exist_ok=True)
        for s in S.sections:
            spectrogram_png(x, Path(png) / f"{name}_{s['id']}.png", s["start"], min(s["end"], x.shape[0] / SR), f"{name} {s['id']}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cue")
    ap.add_argument("--png", default=None)
    a = ap.parse_args()
    report(a.cue, png=a.png)
