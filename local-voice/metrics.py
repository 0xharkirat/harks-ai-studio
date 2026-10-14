"""Energy / prosody metrics for the Hark voice tuning (round 8).

Run with the studio venv:  .venv/bin/python local-voice/metrics.py ...
Everything is computed at 16 kHz mono.  F0 comes from librosa pyin (90-400 Hz).

Per audio:
  f0_rng_st   p90 - p10 of F0 in semitones (voiced frames)
  f0_std_st   std of F0 in semitones
  rms_dyn_db  p95 - p10 of frame RMS (dB) over voiced frames
  wps         words per second of speech time (speech time = file minus silences >= 120 ms)
  pauses      count of silences >= 120 ms strictly inside the speech
  pause_med_ms median length of those pauses
  centroid_hz mean spectral centroid over speech frames
Silence = frame RMS (25 ms / 10 ms hop) more than 35 dB below the file's p95 frame level.
"""
import sys, json, warnings
import numpy as np, librosa
warnings.filterwarnings("ignore")
SR = 16000
HOP = 160           # 10 ms
FRAME = 400         # 25 ms
MIN_PAUSE = 0.120
SIL_BELOW_P95_DB = 35.0


def load(path, sr=SR):
    y, _ = librosa.load(str(path), sr=sr, mono=True)
    return y


def frame_db(y):
    r = librosa.feature.rms(y=y, frame_length=FRAME, hop_length=HOP, center=True)[0]
    return 20 * np.log10(r + 1e-9)


def runs(mask):
    """(start, end) index pairs of True runs."""
    out, s = [], None
    for i, v in enumerate(mask):
        if v and s is None:
            s = i
        if not v and s is not None:
            out.append((s, i)); s = None
    if s is not None:
        out.append((s, len(mask)))
    return out


def analyse(y, nwords=None, sr=SR):
    """Return the metric dict.  nwords = number of spoken words (None -> wps is NaN)."""
    y = np.asarray(y, dtype=np.float32)
    db = frame_db(y)
    thr = np.percentile(db, 95) - SIL_BELOW_P95_DB
    speech = db > thr
    idx = np.where(speech)[0]
    if len(idx) < 10:
        return {}
    a, b = idx[0], idx[-1] + 1
    inner = ~speech[a:b]
    pauses = [(s, e) for s, e in runs(inner) if (e - s) * HOP / sr >= MIN_PAUSE]
    pause_frames = sum(e - s for s, e in pauses)
    speech_time = ((b - a) - pause_frames) * HOP / sr
    f0, voiced, _ = librosa.pyin(y, fmin=90, fmax=400, sr=sr, frame_length=1024, hop_length=HOP)
    n = min(len(f0), len(db))
    f0, voiced, dbv = f0[:n], voiced[:n], db[:n]
    ok = voiced & ~np.isnan(f0) & speech[:n]
    st = 12 * np.log2(f0[ok] / np.median(f0[ok]))
    cen = librosa.feature.spectral_centroid(y=y, sr=sr, n_fft=512, hop_length=HOP)[0][:n]
    # liveliness: mean |delta F0| (semitones per second) across consecutive voiced frames
    v = voiced[:n] & ~np.isnan(f0)
    both = v[1:] & v[:-1]
    d = np.abs(12 * np.log2(f0[1:][both] / f0[:-1][both]))
    d = d[d < 3.0]                       # drop octave jumps
    f0_vel = float(np.mean(d) * 100) if len(d) else 0.0
    # trailing-off: level / pitch of the last quarter of the speech vs the rest
    k = int(0.75 * (b - a)) + a
    late = np.arange(n) >= k
    rms_end = float(np.mean(dbv[ok & late]) - np.mean(dbv[ok & ~late])) if (ok & late).any() else 0.0
    m = {
        "f0_vel_st_s": f0_vel,
        "rms_end_db": rms_end,
        "dur_s": len(y) / sr,
        "f0_med_hz": float(np.median(f0[ok])),
        "f0_rng_st": float(np.percentile(st, 90) - np.percentile(st, 10)),
        "f0_std_st": float(np.std(st)),
        "rms_dyn_db": float(np.percentile(dbv[ok], 95) - np.percentile(dbv[ok], 10)),
        "wps": (nwords / speech_time) if nwords else float("nan"),
        "pauses": len(pauses),
        "pause_max_ms": float(max([(e - s) * HOP / sr * 1000 for s, e in pauses], default=0.0)),
        "pause_med_ms": float(np.median([(e - s) * HOP / sr * 1000 for s, e in pauses])) if pauses else 0.0,
        "centroid_hz": float(np.mean(cen[speech[:n]])),
        "speech_s": speech_time,
    }
    return m


def words_in(wjson, t0, t1):
    n = 0
    for s in wjson["segments"]:
        for w in s.get("words", []):
            if w["start"] >= t0 - 0.02 and w["end"] <= t1 + 0.02:
                n += 1
    return n


def real_windows(wav, wjson, win=10.0, step=10.0):
    """Average metrics over non-overlapping ~10 s windows aligned to word gaps."""
    y = load(wav)
    dur = len(y) / SR
    out = []
    t = 0.0
    while t + 6.0 <= dur:
        t1 = min(t + win, dur)
        seg = y[int(t * SR):int(t1 * SR)]
        m = analyse(seg, words_in(wjson, t, t1))
        if m:
            m["win"] = (round(t, 1), round(t1, 1))
            out.append(m)
        t += step
    return out


KEYS = ["f0_med_hz", "f0_rng_st", "f0_std_st", "f0_vel_st_s", "rms_dyn_db", "rms_end_db", "wps", "pauses", "pause_med_ms", "pause_max_ms", "centroid_hz"]


def mean_of(rows):
    return {k: float(np.nanmean([r[k] for r in rows])) for k in KEYS}


STUDIO = __import__("pathlib").Path(__file__).resolve().parent.parent
REAL_CLIPS = ["hark_fumadocs_a", "hark_fumadocs_b", "hark_playwright_a", "hark_playwright_b"]


def real_rows():
    """Windows over Hark's real clips in assets/voice (word counts cached in baselines/real-words)."""
    rows = []
    for c in REAL_CLIPS:
        w = json.load(open(STUDIO / "local-voice/baselines/real-words" / f"{c}.json"))
        rows += real_windows(STUDIO / "assets/voice" / f"{c}.mp3", w)
    return rows


def video_rows(project):
    """One row per scene of a finished narration: public/audio/<scene>.mp3 against script.json."""
    import pathlib
    project = pathlib.Path(project)
    if (project / "project").is_dir():
        project = project / "project"
    rows = []
    if not (project / "script.json").exists():   # a folder from voice_lines.py: NN.wav against test-lines.json
        for l in json.load(open(STUDIO / "local-voice/test-lines.json")):
            m = analyse(load(project / f"{l['n']}.wav"), len(l["tts"].split()))
            if m:
                rows.append(m)
        return rows
    for s in json.load(open(project / "script.json")):
        f = project / "public/audio" / f"{s['id']}.mp3"
        if not f.exists():
            f = f.with_suffix(".wav")
        words = sum(len((l.get("tts") or l["say"]).split()) for l in s["lines"])
        m = analyse(load(f), words)
        if m:
            rows.append(m)
    return rows


def table(named):
    print(f"{'':22}" + " ".join(f"{k[:11]:>11}" for k in KEYS))
    for name, rows in named:
        m = mean_of(rows)
        print(f"{name[:22]:22}" + " ".join(f"{m[k]:11.2f}" for k in KEYS))


USAGE = """usage: metrics.py real                         Hark's real clips (assets/voice), the target
       metrics.py compare [real] [PROJECT ...]  one row each; PROJECT is a video folder (videos/NN-name)
                                                or a voice_lines.py folder (local-voice/out/TAG)
       metrics.py PATH ...                      one audio file, all numbers as JSON"""

if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(USAGE)
    if a[0] in ("real", "compare"):
        named = []
        for x in a[1:] if a[0] == "compare" else ["real"]:
            named.append(("real (Hark)", real_rows()) if x == "real" else (x.rstrip("/").split("/")[-1], video_rows(x)))
        table(named)
        print("\nF0 range and change rate are the energy numbers; closer to real is better. Round log: local-voice/README.md")
    else:
        for p in a:
            print(p, json.dumps(analyse(load(p)), indent=None, default=float))
