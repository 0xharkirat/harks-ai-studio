import json, sys, numpy as np, pathlib
import metrics as M
H = pathlib.Path(__file__).parent
R7 = pathlib.Path.home() / "Movies/harks-ai-studio/voice-tests/round7"
lines = json.load(open(H / "lines.json"))
res = {}
rows = []
for c in ["hark_fumadocs_a", "hark_fumadocs_b", "hark_playwright_a", "hark_playwright_b"]:
    w = json.load(open(H / f"work/wt/{c}.json"))
    ws = M.real_windows(H / f"work/{c}.wav", w)
    rows += ws
    res[c] = ws
res["REAL"] = M.mean_of(rows)
res["REAL"]["n_windows"] = len(rows)
for who in ["elevenlabs", "qwen"]:
    rs = []
    for L in lines:
        m = M.analyse(M.load(R7 / f"{L['n']}-{who}.wav"), len(L["tts"].split()))
        m["n"] = L["n"]; rs.append(m)
    res[who] = {"lines": rs, "mean": M.mean_of(rs)}
json.dump(res, open(H / "diag/diag.json", "w"), indent=1, default=float)
for k in ["REAL"]:
    print(k, {a: round(b, 2) for a, b in res[k].items()})
for who in ["elevenlabs", "qwen"]:
    print(who, {a: round(b, 2) for a, b in res[who]["mean"].items()})
    for r in res[who]["lines"]:
        print("  ", r["n"], {a: round(b, 2) for a, b in r.items() if a in M.KEYS})
