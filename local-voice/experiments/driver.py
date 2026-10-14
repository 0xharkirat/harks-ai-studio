import json, subprocess, sys, re, pathlib, os
import gates
HERE = pathlib.Path(__file__).parent
tag = sys.argv[1] if len(sys.argv) > 1 else "base"      # base | xvec ...
extra = sys.argv[2:]                                      # passed to gen.py
adir = HERE / ("attempts" if tag == "base" else f"attempts_{tag}")
adir.mkdir(exist_ok=True)
lines = json.load(open(HERE / "lines.json"))
state = {l["n"]: {"tries": []} for l in lines}

def norm(s):
    s = s.lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9' ]", " ", s)
    return re.sub(r"\s+", " ", s).strip().split()
def dist(a, b):
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1): d[i][0] = i
    for j in range(len(b) + 1): d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[-1][-1]
def wer(say, heard):
    # "AI" spoken as letters may be heard "A I" or "AI": compare with spaces removed inside single letters
    fix = lambda w: re.sub(r"\ba i\b", "ai", " ".join(w))
    a, b = fix(norm(say)).split(), fix(norm(heard)).split()
    return dist(a, b) / len(a)

runs = []
for k in range(1, 5):
    todo = [l for l in lines if not state[l["n"]].get("done")]
    if not todo: break
    jobs = [{"n": l["n"], "attempt": k, "text": l["tts"]} for l in todo]
    json.dump(jobs, open(HERE / "work/jobs.json", "w"))
    r = subprocess.run(["/usr/bin/time", "-l", str(HERE / ".venv/bin/python"), "gen.py", "work/jobs.json", str(adir), f"work/log_{tag}_{k}.json", *extra],
                       cwd=HERE, capture_output=True, text=True, env={**os.environ, "HF_HOME": str(HERE / "hf")})
    mem = re.search(r"(\d+)\s+maximum resident", r.stderr); foot = re.search(r"(\d+)\s+peak memory footprint", r.stderr)
    runs.append({"round": k, "rc": r.returncode, "rss": int(mem[1]) if mem else None, "footprint": int(foot[1]) if foot else None,
                 "err_lines": [x for x in r.stderr.splitlines() if re.search(r"error|Traceback|fail", x, re.I)][:5]})
    if r.returncode: print(r.stderr[-2000:]); break
    files = [str(adir / f"{l['n']}_a{k}.wav") for l in todo]
    wd = HERE / f"work/wh_{tag}_{k}"
    subprocess.run(["whisper", *files, "--model", "medium.en", "--language", "en", "--output_format", "txt", "--output_dir", str(wd), "--fp16", "False"], capture_output=True)
    for l in todo:
        n = l["n"]; f = adir / f"{n}_a{k}.wav"
        m = gates.measure(f); heard = (wd / f"{n}_a{k}.txt").read_text().strip()
        m["wer"] = wer(l["say"], heard); m["heard"] = heard; m["attempt"] = k
        m["ok_tail"] = m["tail"] <= -32; m["ok_rise"] = m["rise"] <= 12; m["ok_wer"] = m["wer"] < 0.2
        m["ok"] = m["ok_tail"] and m["ok_rise"] and m["ok_wer"]
        state[n]["tries"].append(m)
        if m["ok"]: state[n]["done"] = True
        print(n, f"a{k}", f"tail {m['tail']:.1f} (raw {m['tail_raw']:.1f}) rise {m['rise']:+.0f} (raw {m['rise_raw']:+.0f}) wer {m['wer']:.2f} f0 {m['f0']:.0f}", "OK" if m["ok"] else "retry", flush=True)
for n, s in state.items():
    t = s["tries"]
    s["best"] = min(t, key=lambda m: (not m["ok_tail"]) + (not m["ok_rise"]) + (not m["ok_wer"]) + 0.001 * m["wer"] + 0.0001 * max(0, m["rise"]))["attempt"]
json.dump({"state": state, "runs": runs}, open(HERE / f"result_{tag}.json", "w"), indent=1, default=float)
