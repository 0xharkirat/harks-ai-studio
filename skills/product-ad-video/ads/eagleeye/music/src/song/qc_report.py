"""Per-cue QC that runs during render and is stored as out/<cue>.qc.json."""
from __future__ import annotations

import numpy as np
from scipy import signal

from engine.dsp import SR
from engine.fx import true_peak
from . import analysis as A
from .instruments import PENTA
from .theory import CHORDS, KEY_PCS, LOGO_BLOOM, LOGO_NOTES


def check_key(S):
    """Every pitched note the score can produce must be in the key. Returns (n_checked, list of offenders)."""
    bad, n = [], 0

    def chk(kind, t, m):
        nonlocal n
        n += 1
        if int(m) % 12 not in KEY_PCS:
            bad.append((kind, round(float(t), 3), int(m)))

    for e in S.ev["chord"]:
        voicing = CHORDS[e["name"]]["sw" if e["style"] == "saw" else (e.get("voicing", "pad") if e["style"] == "pad" else "ep")]
        for m in voicing:
            chk("chord:" + e["name"], e["t"], m + e.get("transpose", 0))
    for k in ("bass", "lead", "arp", "bell"):
        for e in S.ev[k]:
            chk(k, e["t"], e["midi"])
    for e in S.ev["logo"]:
        for off, m in LOGO_NOTES:
            chk("logo", e["t"] + off, m)
        for m in LOGO_BLOOM + [100]:
            chk("logo", e["t"], m)
    for i, e in enumerate(getattr(S, "foley", [])):
        if e["type"] in ("pop", "ping", "blip"):
            m = e.get("note", PENTA[(i * 7 + 3) % len(PENTA)] if e["type"] == "blip" else (81 if e["type"] == "pop" else 93))
            chk("foley:" + e["type"], e["t"], m)
    return n, bad


def onset_latency(stem, times, win=(-0.008, 0.03)):
    """Latency (ms) between each scheduled time and the audio onset (largest rise of the 1 ms RMS)."""
    m = stem.mean(axis=1)
    out = []
    hop = 48
    for t in times:
        a = int((t + win[0]) * SR)
        b = int((t + win[1]) * SR)
        if a < 0 or b > len(m):
            continue
        seg = m[a:b]
        k = len(seg) // hop
        if k < 4:
            continue
        env = np.sqrt((seg[: k * hop].reshape(k, hop) ** 2).mean(axis=1))
        if env.max() < 1e-5:
            continue
        pk = env.max()
        idx = [j for j in range(1, len(env)) if env[j] > 1.6 * env[j - 1] and env[j] > 0.12 * pk]
        i = idx[0] if idx else int(np.argmax(env))
        out.append(((a + i * hop) / SR - t) * 1000.0)
    return np.array(out)


def silence_gaps(x, stops, thresh_db=-60.0, min_len=0.12):
    """Windows of near-silence (>= min_len) outside the declared stops and the final tail."""
    m = x.mean(axis=1)
    hop = int(0.02 * SR)
    n = len(m) // hop
    env = np.sqrt((m[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    db_ = 20 * np.log10(env + 1e-12)
    quiet = db_ < thresh_db
    gaps = []
    i = 0
    while i < n:
        if quiet[i]:
            j = i
            while j < n and quiet[j]:
                j += 1
            a, b = i * hop / SR, j * hop / SR
            if b - a >= min_len and not any(a >= s - 0.05 and b <= e + 0.05 for s, e in stops) and j < n - 1:
                gaps.append((round(a, 2), round(b, 2)))
            i = j
        else:
            i += 1
    return gaps


def run(S, post, audio, verbose=True):
    rep = {}
    n, bad = check_key(S)
    rep["key"] = dict(notes_checked=n, out_of_key=bad)
    tp = 20 * np.log10(true_peak(audio, 8))
    rep["lufs"] = round(float(A.lufs_int(audio)), 2)
    rep["true_peak_dbtp"] = round(float(tp), 2)
    rep["sample_peak_db"] = round(float(20 * np.log10(np.abs(audio).max())), 2)
    rep["dc"] = [float(v) for v in audio.mean(axis=0)]
    rep["clipped"] = int(np.sum(np.abs(audio) >= 0.99999))
    rep["mono_low"] = A.mono_low_end(audio)
    sl = A.section_lufs(audio, S.sections)
    rep["section_lufs"] = {k: (None if v is None else round(v, 1)) for k, v in sl.items()}
    cl = A.clicks(audio)
    rep["clicks"] = [(round(float(t), 3), round(float(r), 1)) for t, _, r in cl]
    # stops must be silent
    stop_rms = []
    for a, b in S.stops:
        seg = audio[int((a + 0.004) * SR):int((b - 0.001) * SR)]
        stop_rms.append(round(float(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)), 1))
    rep["stop_rms_db"] = stop_rms
    # onsets on grid: audio onset latency of scheduled hits
    lat = {}
    for name, stem, times in (("fx(crash/impact)", post["fx"], [e["t"] for e in S.ev["crash"]] + [e["t"] for e in S.ev["impact"]] + [e["t"] for e in S.ev["finalChord"]] + [e["t"] for e in S.ev["endHit"]]),
                              ("logo", post["logo"], [e["t"] for e in S.ev["logo"] if not e.get("teaser")]),
                              ("kick", post["kick"], [e["t"] for e in S.ev["kick"]]),
                              ("snare", post["snare"], [e["t"] for e in S.ev["snare"]] + [e["t"] for e in S.ev["clap"]]),
                              ("hatClosed", post["hats"], [e["t"] for e in S.ev["hatClosed"]])):
        times = [t for t in times if not S.in_stop(t)]
        if not times:
            continue
        v = onset_latency(stem, times)
        if len(v):
            lat[name] = dict(n=int(len(v)), median_ms=round(float(np.median(v)), 2), p95_abs_ms=round(float(np.percentile(np.abs(v), 95)), 2), max_abs_ms=round(float(np.abs(v).max()), 2))
    rep["onset_latency_ms"] = lat
    # grid: scheduled event times
    off = []
    for k in ("kick", "snare", "clap", "hatClosed", "hatOpen", "crash", "impact", "endHit", "finalChord", "accent", "hit", "tick", "rim", "tom", "shaker"):
        for e in S.ev[k]:
            r = e["t"] / 0.125
            off.append(abs(r - round(r)) * 0.125 * 1000)
    rep["scheduled_grid_error_ms_max"] = round(float(max(off)) if off else 0.0, 4)
    rep["gaps"] = silence_gaps(audio, S.stops)
    rep["first_sample_abs"] = float(np.abs(audio[0]).max())
    rep["last_sample_abs"] = float(np.abs(audio[-1]).max())
    rep["tail_rms_last100ms_db"] = round(float(20 * np.log10(np.sqrt(np.mean(audio[-int(0.1 * SR):] ** 2)) + 1e-12)), 1)
    rep["chroma_in_key"] = round(A.chroma_in_key(audio), 3)
    if verbose:
        print(f"   QC key: {n} notes checked, out of key: {bad if bad else 'none'}")
        print(f"   QC sections LUFS {rep['section_lufs']}")
        print(f"   QC stops rms {stop_rms} dB, clicks {len(rep['clicks'])} {rep['clicks'][:6]}, gaps {rep['gaps']}, clipped {rep['clipped']}")
        print(f"   QC onset latency {lat}")
        print(f"   QC mono low-end side/mid {rep['mono_low']['side_to_mid_db']:.1f} dB, DC {rep['dc']}, tail {rep['tail_rms_last100ms_db']} dB")
    return rep
