"""Rank 8-12 s windows of Hark's training clips (assets/voice/hark_*) by energy metrics."""
import json, numpy as np, pathlib, soundfile as sf
import metrics as M
H = pathlib.Path(__file__).parent
cands = []
for c in ["hark_fumadocs_a", "hark_fumadocs_b", "hark_playwright_a", "hark_playwright_b"]:
    wj = json.load(open(H / f"work/wt/{c}.json"))
    words = [w for s in wj["segments"] for w in s["words"]]
    y = M.load(H / f"work/{c}.wav")
    # window starts: first word of file or a word after a gap >= 0.12 s
    starts = [i for i, w in enumerate(words) if i == 0 or w["start"] - words[i-1]["end"] >= 0.12]
    ends = [i for i, w in enumerate(words) if i == len(words)-1 or words[i+1]["start"] - w["end"] >= 0.12]
    for si in starts:
        for ei in ends:
            t0, t1 = words[si]["start"], words[ei]["end"]
            d = t1 - t0
            if d < 8.0 or d > 12.0 or ei <= si: continue
            seg = y[int(t0*M.SR):int(t1*M.SR)]
            nw = ei - si + 1
            m = M.analyse(seg, nw)
            if not m: continue
            lvl = float(np.mean(M.frame_db(seg)[M.frame_db(seg) > np.percentile(M.frame_db(seg), 95) - 20]))
            m.update(clip=c, t0=round(t0, 2), t1=round(t1, 2), nw=nw, level_db=lvl,
                     text="".join(w["word"] for w in words[si:ei+1]).strip())
            cands.append(m)
print(len(cands), "candidates")
keys = ["f0_std_st", "f0_rng_st", "f0_vel_st_s", "centroid_hz", "wps", "rms_end_db", "level_db"]
Z = {k: (np.array([c[k] for c in cands]) - np.mean([c[k] for c in cands])) / (np.std([c[k] for c in cands]) + 1e-9) for k in keys}
for i, c in enumerate(cands):
    c["score"] = float(sum(Z[k][i] for k in keys) - 0.5 * max(0, c["pauses"] - 4))
cands.sort(key=lambda c: -c["score"])
json.dump(cands, open(H / "diag/refcands.json", "w"), indent=1, default=float)
for c in cands[:8]:
    print(f"{c['score']:.2f} {c['clip']} {c['t0']}-{c['t1']} std {c['f0_std_st']:.2f} rng {c['f0_rng_st']:.1f} vel {c['f0_vel_st_s']:.0f} cen {c['centroid_hz']:.0f} wps {c['wps']:.2f} lvl {c['level_db']:.1f} end {c['rms_end_db']:.1f} paus {c['pauses']}\n    {c['text']}")
v1 = [c for c in cands if c["clip"] == "hark_fumadocs_a" and abs(c["t0"] - 25.0) < 0.6]
print("v1-like window(s):", [(c['t0'], c['t1'], round(c['score'], 2)) for c in v1])
