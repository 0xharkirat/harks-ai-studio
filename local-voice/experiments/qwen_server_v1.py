"""Stand-in Qwen3-TTS helper for the studio's `qwen` provider (v1 settings).

Contract (stdin/stdout JSON lines, one reply per request, in order):
  start-up  -> {"event": "ready", "model": ...} once the model is loaded
  request   <- {"text": "...", "out": "/path/line.wav", "attempts": 4 (optional)}
  reply     -> {"ok": true, "out": ..., "attempt": 2, "all_pass": true, "tail_db": -34.1, "rise_hz": -12.0,
                "sec": 4.2, "gen_s": 5.3, "tried": [{"attempt": 1, "tail": ..., "rise": ..., "ok": false}, ...]}
              {"ok": false, "error": "..."} on a failure
Closing stdin ends the process. Library noise goes to stderr, never stdout.

Usage: qwen_server_v1.py [--config qwen.json] [--attempts N]
Config keys (all optional, v1 defaults): model, ref_audio, ref_text, attempts, tail_db (-32), rise_hz (12).
Gates are the tail-cut and rising-pitch checks from gates.py; the words gate stays in check.dart (Whisper).
Up to `attempts` takes per line, seeded from the text and the attempt number; the best take is kept.
"""
import json, os, pathlib, shutil, sys, tempfile, time, zlib

HERE = pathlib.Path(__file__).resolve().parent
os.environ.setdefault("HF_HOME", str(HERE / "hf"))
sys.path.insert(0, str(HERE))

# Keep the real stdout for replies; anything a library prints goes to stderr.
REPLY = os.fdopen(os.dup(1), "w", buffering=1)
sys.stdout = sys.stderr

import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model
import gates


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


cfg = {}
if arg("--config"):
    cfg = json.load(open(arg("--config")))
MODEL = cfg.get("model", "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit")
REF = cfg.get("ref_audio", str(HERE / "voice/ref.wav"))
REF_TEXT = cfg.get("ref_text", str(HERE / "voice/ref.txt"))
if os.path.exists(REF_TEXT):
    REF_TEXT = pathlib.Path(REF_TEXT).read_text().strip()
ATTEMPTS = int(arg("--attempts", cfg.get("attempts", 4)))
TAIL_MAX = float(cfg.get("tail_db", -32))
RISE_MAX = float(cfg.get("rise_hz", 12))


def reply(obj):
    REPLY.write(json.dumps(obj, default=float) + "\n")
    REPLY.flush()


def take(text, attempt, dst):
    mx.random.seed(zlib.crc32(text.encode()) % 100000 * 10 + attempt)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix="qwen"))
    try:
        generate_audio(text=text, model=model, ref_audio=REF, ref_text=REF_TEXT, output_path=str(tmp),
                       file_prefix="o", audio_format="wav", verbose=False)
        files = sorted(tmp.glob("o_*.wav"))
        if not files:
            raise RuntimeError("the model wrote no audio")
        if len(files) == 1:
            shutil.move(files[0], dst)
        else:  # the model split a long text into several files
            parts = [sf.read(p)[0] for p in files]
            sf.write(dst, np.concatenate(parts), sf.read(files[0])[1])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


t0 = time.time()
model = load_model(MODEL)
mx.eval(model.parameters())
reply({"event": "ready", "model": MODEL, "load_s": time.time() - t0, "attempts": ATTEMPTS})

for raw in sys.stdin:
    raw = raw.strip()
    if not raw:
        continue
    try:
        req = json.loads(raw)
        text, out = req["text"], req["out"]
        best, tried = None, []
        for k in range(1, int(req.get("attempts", ATTEMPTS)) + 1):
            cand = f"{out}.a{k}.wav"
            t1 = time.time()
            take(text, k, cand)
            m = gates.measure(cand)
            ok_tail, ok_rise = m["tail"] <= TAIL_MAX, m["rise"] <= RISE_MAX
            rec = {"attempt": k, "tail": m["tail"], "rise": m["rise"], "sec": m["sec"], "gen_s": time.time() - t1,
                   "ok": bool(ok_tail and ok_rise)}
            tried.append(rec)
            score = (not ok_tail) + (not ok_rise) + 0.0001 * max(0, m["rise"])
            if best is None or score < best[0]:
                best = (score, k, cand, rec)
            if rec["ok"]:
                break
        _, k, cand, rec = best
        shutil.copyfile(cand, out)
        for t in tried:
            pathlib.Path(f"{out}.a{t['attempt']}.wav").unlink(missing_ok=True)
        reply({"ok": True, "out": out, "attempt": k, "all_pass": rec["ok"], "tail_db": rec["tail"], "rise_hz": rec["rise"],
               "sec": rec["sec"], "gen_s": sum(t["gen_s"] for t in tried), "tried": tried})
    except Exception as e:  # keep serving: one bad line must not kill the helper
        reply({"ok": False, "error": f"{type(e).__name__}: {e}"})
