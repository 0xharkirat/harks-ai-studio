import json, sys, pathlib, numpy as np
import metrics as M
from wer import wer
H = pathlib.Path(__file__).parent
R8 = pathlib.Path.home() / "Movies/harks-ai-studio/voice-tests/round8"
L = json.load(open(H / "lines.json")); fin = {r["n"]: r for r in json.load(open(H / "final.json"))}
keys = ["f0_rng_st", "f0_std_st", "f0_vel_st_s", "rms_dyn_db", "rms_end_db", "wps", "pauses", "pause_med_ms", "pause_max_ms", "centroid_hz", "f0_med_hz"]
out = {}
real = json.load(open(H / "diag/diag.json"))  # recompute real with the same code below
rows = []
for c in ["hark_fumadocs_a", "hark_fumadocs_b", "hark_playwright_a", "hark_playwright_b"]:
    w = json.load(open(H / f"work/wt/{c}.json")); rows += M.real_windows(H / f"work/{c}.wav", w)
out["real"] = {k: float(np.nanmean([r[k] for r in rows])) for k in keys}
per = {}
for tag, suf in [("EL", "elevenlabs"), ("v1", "qwen-v1"), ("v2", "qwen-v2")]:
    ms = []
    for l in L:
        m = M.analyse(M.load(R8 / f"{l['n']}-{suf}.wav"), len(l["tts"].split())); m["n"] = l["n"]; ms.append(m)
    per[tag] = ms
    out[tag] = {k: float(np.nanmean([m[k] for m in ms])) for k in keys}
# long trio
lw = len(json.load(open(H / "texts_long.json"))["long"]["tts"].split())
for tag, suf in [("EL", "elevenlabs"), ("v1", "qwen-v1"), ("v2", "qwen-v2"), ("v2split", "qwen-v2-split")]:
    out["long_" + tag] = M.analyse(M.load(R8 / f"long-{suf}.wav"), lw)
# pitch-movement wins vs v1 round7 by line
json.dump({"mean": out, "per_line": per}, open(H / "diag/final_metrics.json", "w"), indent=1, default=float)
hdr = ["f0_rng_st", "f0_std_st", "f0_vel_st_s", "rms_dyn_db", "rms_end_db", "wps", "pause_med_ms", "pause_max_ms", "centroid_hz", "f0_med_hz"]
print("flavour        " + " ".join(f"{h[:9]:>9}" for h in hdr))
for k in ["real", "EL", "v1", "v2", "long_EL", "long_v1", "long_v2", "long_v2split"]:
    print(f"{k:14} " + " ".join(f"{out[k][h]:9.2f}" for h in hdr))
print("per line v2:")
for m in per["v2"]: print(m["n"], " ".join(f"{m[h]:7.2f}" for h in hdr))
