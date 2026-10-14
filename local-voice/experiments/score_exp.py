"""Studio-venv scorer: score_exp.py NAME [NAME...] -> one table row per experiment (mean over takes)."""
import sys, json, pathlib, numpy as np
import metrics as M
from wer import wer
SAYS = {l["n"]: l["say"] for l in json.load(open(pathlib.Path(__file__).parent / "lines.json"))}
H = pathlib.Path(__file__).parent
texts = {l["n"]: l["tts"] for l in json.load(open(H / "lines.json"))}
extra = H / "texts_extra.json"
if extra.exists(): texts.update(json.load(open(extra)))
cols = ["f0_rng_st", "f0_std_st", "f0_vel_st_s", "rms_dyn_db", "rms_end_db", "wps", "pauses", "pause_med_ms", "centroid_hz", "f0_med_hz"]
def row(name):
    rs = [json.loads(l) for l in open(H / "exp" / name / "results.jsonl")]
    ms = []
    import os
    only = os.environ.get("ONLY", "").split(",") if os.environ.get("ONLY") else None
    for r in rs:
        if not r.get("ok"): continue
        if only and r["id"].split("_")[0] not in only: continue
        n = r["id"].split("_")[0]
        m = M.analyse(M.load(r["out"]), len(texts[n].split()))
        m["id"] = r["id"]; m["wer"] = wer(SAYS.get(n, texts[n]), r["heard"]); m["pass"] = (r["pass"]["tail"] and r["pass"]["rise"] and m["wer"] < 0.2); m["tail"] = r["tail_db"]; m["rise"] = r["rise_hz"]; m["sec"] = r["sec"]
        ms.append(m)
    avg = {k: float(np.nanmean([m[k] for m in ms])) for k in cols}
    avg.update(wer=float(np.mean([m["wer"] for m in ms])), passrate=float(np.mean([m["pass"] for m in ms])), n=len(ms), sec=float(np.sum([m["sec"] for m in ms])))
    json.dump({"avg": avg, "takes": ms}, open(H / "exp" / name / "metrics.json", "w"), indent=1, default=float)
    return avg
print(f"{'exp':14}{'n':>3}{'f0rng':>6}{'f0std':>6}{'f0vel':>6}{'rmsdyn':>7}{'rmsend':>7}{'wps':>5}{'pau':>5}{'paums':>6}{'cent':>6}{'f0med':>6}{'wer':>5}{'pass':>5}")
for name in sys.argv[1:]:
    a = row(name)
    print(f"{name:14}{a['n']:3d}{a['f0_rng_st']:6.1f}{a['f0_std_st']:6.2f}{a['f0_vel_st_s']:6.1f}{a['rms_dyn_db']:7.1f}{a['rms_end_db']:7.1f}{a['wps']:5.2f}{a['pauses']:5.1f}{a['pause_med_ms']:6.0f}{a['centroid_hz']:6.0f}{a['f0_med_hz']:6.0f}{a['wer']:5.2f}{a['passrate']:5.2f}")
