import json, pathlib, gates
from wer import wer
H = pathlib.Path(__file__).parent
R8 = pathlib.Path.home() / "Movies/harks-ai-studio/voice-tests/round8"
L = json.load(open(H / "lines.json")); fin = {r["n"]: r for r in json.load(open(H / "final.json"))}
vc = {}
for l in open(H / "work/vc_r8.txt").read().splitlines()[1:]:
    p = l.split(); vc[p[0]] = (float(p[1]), float(p[3]))
res = {}
for l in open(H / "exp/e7_final/results.jsonl"): r = json.loads(l); res[r["id"][:2]] = r
for l in open(H / "exp/e7_final01b/results.jsonl"): r = json.loads(l); res["01"] = r
rows = []
for l in L:
    n = l["n"]; row = {"n": n}
    for tag, suf in [("EL", "elevenlabs"), ("v1", "qwen-v1"), ("v2", "qwen-v2")]:
        m = gates.measure(R8 / f"{n}-{suf}.wav")
        heard = fin[n]["elevenlabs"]["heard"] if tag == "EL" else fin[n]["qwen"]["heard"] if tag == "v1" else res[n]["heard"]
        w = wer(l["say"], heard)
        row[tag] = dict(tail=m["tail"], rise=m["rise"], wer=w, match=vc[f"{n}-{suf}.wav"][0], us=vc[f"{n}-{suf}.wav"][1])
        row[tag]["ok"] = dict(tail=m["tail"] <= -32, rise=m["rise"] <= 12, wer=w < 0.2, us=row[tag]["us"] <= 0.2)
    rows.append(row)
json.dump(rows, open(H / "diag/gate_table.json", "w"), indent=1, default=float)
f = lambda d, k, fmt: fmt.format(d[k]) + ("" if d["ok"].get(k, True) else "*")
print("| line | tail dB EL / v1 / v2 | rise Hz EL / v1 / v2 | WER EL / v1 / v2 | US EL / v1 / v2 | match EL / v1 / v2 |")
for r in rows:
    print(f"| {r['n']} | " + " | ".join(" / ".join(f(r[t], k, fm) for t in ["EL", "v1", "v2"]) for k, fm in [("tail", "{:.1f}"), ("rise", "{:+.0f}"), ("wer", "{:.2f}"), ("us", "{:.2f}")]) + " | " + " / ".join(f"{r[t]['match']:.2f}" for t in ["EL", "v1", "v2"]) + " |")
