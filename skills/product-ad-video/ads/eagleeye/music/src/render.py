"""Render the TinaCMS ad music (all cues + sonic logo).

    uv run python src/render.py                 # everything into out/
    uv run python src/render.py --cue dev       # one cue
    uv run python src/render.py --timing-only   # only timing.json (no audio)
    uv run python src/render.py --qc qc         # also write per-section spectrogram PNGs
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine.dsp import SR
from engine.fx import true_peak
from song import analysis as A
from song import cues, export, instruments, mix, qc_report
from song.score import Score
from song.theory import CHORDS, tb

CUES = ["eagleeye"]


def render_cue(S, out_dir: Path, root: Path = ROOT, verbose=True, target=-14.0, extras=True):
    t0 = time.time()
    N = int(round(S.file_dur * SR))
    stems = instruments.render_stems(S, N, root)
    t1 = time.time()
    post = mix.process_strips(S, stems)
    t2 = time.time()
    summed = sum(post.values())
    if S.energy:
        tg = mix.plan_targets(S)
        ref = int(np.argmax(tg))
        trims = mix.initial_trims(S, summed)
        for it in range(6):
            pre, grmax = mix.master_pre(mix.apply_trims(S, summed, trims), S.fade_out, getattr(S, "air_db", 3.0))
            meas = mix.measure_plan(S, pre)
            err = (tg - tg[ref]) - (meas - meas[ref])
            if np.max(np.abs(err)) < 0.3:
                break
            trims = trims + err
        audio, info = mix.master_final(pre, target, S.ceiling_db or mix.CEILING_DB)
        info["comp_gr_max"] = grmax
        meas = mix.measure_plan(S, audio)
        if verbose:
            for (a, b, t_), m_, tr in zip(S.energy, meas, trims):
                print(f"   plan {a:6.1f}-{b:6.1f} target {t_:+5.1f}  final LUFS {m_:6.1f}  (rel to ref {m_ - meas[ref]:+5.1f})  trim {tr:+5.1f}")
    else:
        audio, info = mix.master_chain(summed, target, S.ceiling_db or mix.CEILING_DB, fade=S.fade_out)
    t3 = time.time()
    out_dir.mkdir(parents=True, exist_ok=True)
    sf.write(out_dir / f"{S.name}.wav", audio.astype(np.float32), SR, subtype="PCM_24")
    export.write_timing(S, out_dir / f"{S.name}.timing.json")
    export.write_envelopes(S, post, audio, out_dir / f"{S.name}.envelopes.json")
    export.overview_png(S, audio, out_dir / f"{S.name}.overview.png", S.name)
    rep = qc_report.run(S, post, audio, verbose=verbose)
    rep["master"] = {k: round(float(v), 3) for k, v in info.items()}
    if verbose:
        print(f"   master: comp GR max {info['comp_gr_max']:.1f} dB, limiter GR max {info['lim_gr_max']:.1f} dB, >1 dB {info['lim_gr_gt1']*100:.1f}% of samples, >3 dB {info['lim_gr_gt3']*100:.2f}%")
    (out_dir / f"{S.name}.qc.json").write_text(json.dumps(rep, indent=1, default=float))
    t4 = time.time()
    tp = 20 * np.log10(true_peak(audio, 8))
    if verbose:
        print(f"[{S.name}] {S.file_dur:5.1f}s  LUFS {info['lufs']:6.2f}  TP {tp:5.2f} dBTP  "
              f"(stems {t1-t0:.1f}s strips {t2-t1:.1f}s master {t3-t2:.1f}s export {t4-t3:.1f}s)")
    return stems, post, audio, info


def sonic_logo() -> Score:
    S = Score("sonic-logo", 3, 5.0, "logo")
    S.logo(0.0)
    S.chord(0.9, 2.0, "Aadd9", "pad", vel=0.35, cutoff=2200.0, atk=0.35, rel=1.6)
    S.bass(1.0, 0.9, 33, "sub", vel=0.3)
    S.fade_out = (4.4, 5.0)
    S.section("logo", "Sonic logo", 1, 3)
    return S


def render_job(args):
    """Render one cue (runs in a worker process); returns its printed report."""
    import contextlib
    import io
    name, out, qc = args
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        S = sonic_logo() if name == "logo" else getattr(cues, name)()
        _, post, audio, info = render_cue(S, Path(out), target=S.target_lufs)
        if qc:
            from qc import spectrogram_png
            Path(qc).mkdir(parents=True, exist_ok=True)
            for s in S.sections:
                spectrogram_png(audio, Path(qc) / f"{S.name}_{s['id']}.png", s["start"], min(s["end"], audio.shape[0] / SR), f"{S.name} {s['id']}")
    return name, buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cue", action="append", help="render only these cues (anthem thirty fifteen six dev logo)")
    ap.add_argument("--out", default=str(ROOT / "out"))
    ap.add_argument("--qc", default=None, help="directory for per-section spectrogram PNGs")
    ap.add_argument("--timing-only", action="store_true")
    ap.add_argument("--jobs", type=int, default=0, help="parallel worker processes (default: one per cue, at most the CPU count)")
    ap.add_argument("-v", "--verbose", action="store_true", help="print the full per-cue QC report")
    a = ap.parse_args()
    names = a.cue or CUES + ["logo"]
    out = Path(a.out)
    t0 = time.time()
    if a.timing_only:
        out.mkdir(parents=True, exist_ok=True)
        for n in names:
            S = sonic_logo() if n == "logo" else getattr(cues, n)()
            S.foley = instruments.apply_cuts(instruments.load_foley(getattr(S, "foley_from", S.name), ROOT, S.time_scale), S.cuts)
            export.write_timing(S, out / f"{S.name}.timing.json")
        print(f"timing written in {time.time() - t0:.1f}s")
        return
    import os
    jobs = a.jobs or min(len(names), os.cpu_count() or 1)
    work = [(n, str(out), a.qc) for n in names]
    # the first cue compiles the numba kernels (cached on disk); the rest start from that cache
    done = {}
    if jobs > 1 and len(work) > 1:
        from concurrent.futures import ProcessPoolExecutor
        first = work[-1] if work[-1][0] == "logo" else work[0]
        n, txt = render_job(first)
        done[n] = txt
        rest = [w for w in work if w[0] != first[0]]
        with ProcessPoolExecutor(max_workers=jobs) as ex:
            for n, txt in ex.map(render_job, rest):
                done[n] = txt
    else:
        for w in work:
            n, txt = render_job(w)
            done[n] = txt
    for n in names:
        txt = done[n]
        if a.verbose:
            print(txt, end="")
        else:
            print("\n".join(l for l in txt.splitlines() if l.startswith("[") or "QC key" in l and "none" not in l))
    print(f"done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
