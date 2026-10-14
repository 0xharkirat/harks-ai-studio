#!/usr/bin/env python
"""Voice the 6 fixed test lines (test-lines.json) with the current qwen.json, to try a lever.

    local-voice/.venv/bin/python local-voice/voice_lines.py TAG [--attempts N] [--config PATH]

Writes local-voice/out/TAG/NN.wav. Then compare against real and a video:
    .venv/bin/python local-voice/metrics.py compare real local-voice/out/TAG videos/11-eagleeye-retry-skip
No ElevenLabs call: the helper is the local model only.
"""
import argparse, json, pathlib, subprocess, sys, time

HERE = pathlib.Path(__file__).resolve().parent
ap = argparse.ArgumentParser()
ap.add_argument("tag")
ap.add_argument("--attempts", type=int, default=None)
ap.add_argument("--config", default=str(HERE / "qwen.json"))
a = ap.parse_args()
out = HERE / "out" / a.tag
out.mkdir(parents=True, exist_ok=True)
proc = subprocess.Popen([sys.executable, str(HERE / "qwen_server.py"), "--config", a.config],
                        stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, bufsize=1)
json.loads(proc.stdout.readline())   # the ready line
t0 = time.time()
for l in json.load(open(HERE / "test-lines.json")):
    req = {"id": l["n"], "text": l["tts"], "say": l["say"], "out": str(out / f"{l['n']}.wav")}
    if a.attempts:
        req["attempts"] = a.attempts
    proc.stdin.write(json.dumps(req) + "\n"); proc.stdin.flush()
    r = json.loads(proc.stdout.readline())
    print(l["n"], "ok" if r.get("ok") and r.get("all_pass") else f"CHECK {r.get('error', '')}", f"{r.get('gen_s', 0):.1f}s")
proc.stdin.write('{"cmd":"quit"}\n'); proc.stdin.flush()
proc.wait(timeout=30)
print(f"done in {time.time() - t0:.0f}s -> {out}")
