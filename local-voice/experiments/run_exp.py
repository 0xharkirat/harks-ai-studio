"""Drive qwen_server.py for one experiment. Usage:
 run_exp.py NAME [--params JSON] [--model REPO] [--mode single|sentences] [--gap MS] [--seeds 1,2] [--lines 01,02] [--texts FILE.json] [--level DB] [--config F]
Writes exp/NAME/<n>_s<seed>.wav and exp/NAME/results.jsonl."""
import sys, json, subprocess, pathlib, argparse, os, time
H = pathlib.Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument("name"); ap.add_argument("--params", default="{}"); ap.add_argument("--model")
ap.add_argument("--mode", default="single"); ap.add_argument("--gap", type=int, default=350)
ap.add_argument("--seeds", default="1,2"); ap.add_argument("--lines", default="")
ap.add_argument("--attempts", type=int, default=1); ap.add_argument("--select"); ap.add_argument("--texts"); ap.add_argument("--level", type=float); ap.add_argument("--config", default=str(H / "qwen-v2.json"))
a = ap.parse_args()
lines = json.load(open(H / "lines.json"))
texts = {l["n"]: l["tts"] for l in lines}
says = {l["n"]: l["say"] for l in lines}
if a.texts:
    raw = json.load(open(a.texts))
    texts = {k: (v["tts"] if isinstance(v, dict) else v) for k, v in raw.items()}
    for k, v in raw.items():
        if isinstance(v, dict): says[k] = v["say"]
sel = a.lines.split(",") if a.lines else list(texts)
out = H / "exp" / a.name; out.mkdir(parents=True, exist_ok=True)
cmd = [str(H / ".venv/bin/python"), str(H / "qwen_server.py"), "--config", a.config] + (["--model", a.model] if a.model else [])
env = {**os.environ, "HF_HOME": str(H / "hf")}
p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=open(out / "server.err", "w"), text=True, bufsize=1, env=env, cwd=H)
print(p.stdout.readline().strip()[:150], flush=True)
res = open(out / "results.jsonl", "w")
for n in sel:
    for s in [int(x) for x in a.seeds.split(",")]:
        req = {"id": f"{n}_s{s}", "text": texts[n], "say": says.get(n, texts[n]), "out": str(out / f"{n}_s{s}.wav"), "attempts": a.attempts, "seed": 1000 * int(n.replace("long", "7")) + 10 * s if n[0].isdigit() or n == "long" else 7000 + 10 * s,
               "mode": a.mode, "gap_ms": a.gap, "params": json.loads(a.params)}
        if a.mode == "sentences": req["parts_dir"] = str(out / "parts")
        if a.select: req["select"] = a.select
        if a.level is not None: req["level_db"] = a.level
        p.stdin.write(json.dumps(req) + "\n"); p.stdin.flush()
        r = json.loads(p.stdout.readline()); res.write(json.dumps(r) + "\n"); res.flush()
        if r.get("ok"):
            print(f"{r['id']:8} {r['sec']:5.1f}s tail {r['tail_db']:6.1f} rise {r['rise_hz']:+5.0f} wer {r['wer']:.2f} en {r['energy']:.2f} {'OK' if r['all_pass'] else 'FAIL'} gen {r['gen_s']:.0f}s | {r['heard'][:70]}", flush=True)
        else: print(r, flush=True)
p.stdin.write('{"cmd":"quit"}\n'); p.stdin.flush(); p.wait(timeout=60)
