#!/usr/bin/env python
"""Long-lived Qwen3-TTS voice-clone generator for Hark's AI (the local draft voice, round 8 "v2").

Run with the local-voice venv (scripts/setup-local-voice.sh makes it); tts.dart starts it for you:
    local-voice/.venv/bin/python local-voice/qwen_server.py [--config local-voice/qwen.json] [--model PATH_OR_REPO]
Every relative path in the config is relative to the studio (the folder above local-voice/).

STDIN/STDOUT CONTRACT (stable; one JSON object per line, UTF-8)
---------------------------------------------------------------
Startup: the process loads the model and the Whisper worker once, then prints
    {"event":"ready","model":...,"config":<path>,"sr":24000}
and waits. Everything else on stderr is log noise; stdout carries JSON lines only.

Request (stdin), one line each, handled in order:
    {"id":"03",                       optional, echoed back
     "text":"When GitHub fails, ...", required: the tts text, words unchanged
     "out":"/abs/path/03.wav",        required: 24 kHz mono 16-bit WAV is written here
     "mode":"single"|"sentences",     optional, default from config. "sentences" voices each sentence as its
                                      own take and joins them with "gap_ms" of exact silence
     "gap_ms":350,                    optional, silence between sentences
     "attempts":4,                    optional, takes per request (per sentence in "sentences" mode)
                                      (config "min_sentence_words": sentences shorter than this merge into a neighbour)
     "select":"best_energy"|"first_pass", optional. best_energy = run all attempts, keep the passing take with
                                      the highest pitch-movement score; first_pass = stop at the first pass
     "seed":1234,                     optional base seed; take k uses seed+k
     "params":{"temperature":..,"top_k":..,"top_p":..,"repetition_penalty":..,"max_tokens":..,
               "ref_audio":"/abs.wav","ref_text":"..."},   optional per-request overrides
     "parts_dir":"/abs/dir",          optional ("sentences" mode): also save each trimmed sentence take there
     "say":"text for the WER check", optional, default = text
     "level_db":-19.0}                optional speech-RMS target; a plain gain, no other processing
Quit with {"cmd":"quit"} or EOF.

Response (stdout), exactly one line per request:
    {"id":..,"ok":true,"out":..,"attempt":2,"attempts_run":4,"seed":..,"sec":6.1,"mode":..,
     "tail_db":-35.2,"rise_hz":-12.0,"wer":0.0,"heard":"...","energy":3.1,
     "pass":{"tail":true,"rise":true,"wer":true},"all_pass":true,
     "tries":[{"attempt":1,"seed":..,"tail_db":..,"rise_hz":..,"wer":..,"energy":..,"pass":..,"sec":..}, ...],
     "gen_s":31.2}
    on failure: {"id":..,"ok":false,"error":"..."}
"attempt" is the chosen take (1-based; null in "sentences" mode, where "tries" lists per-sentence takes and only the
last sentence is held to the tail and rise gates, the earlier ones to WER only). If no take passes all gates the best-scoring take is still written and
"all_pass" is false. tail/rise follow the round-7 definitions (gates.py): measured after trimming silence below
-50 dB re peak; tail = RMS of the last 60 ms in dB re peak (<= -32); rise = ending F0 slope in Hz over 450 ms
(<= +12); WER = Whisper medium.en vs "say" (< 0.20). Accent (US <= 0.20) and likeness (match >= 0.65) are
scene-level checks done by the studio's voicecheck.py, not here.

The only audio operations are: trim silence below -50 dB at both ends, join with silence gaps, and (if level_db
is given) a single gain. No pitch shift, stretch, EQ or compression.
"""
import os, sys, json, re, time, zlib, argparse, subprocess, pathlib

HERE = pathlib.Path(__file__).resolve().parent
STUDIO = HERE.parent


def studio_path(p):
    """A config path: ~ expands, a relative path is relative to the studio."""
    q = pathlib.Path(os.path.expanduser(str(p)))
    return str(q if q.is_absolute() else STUDIO / q)


ap = argparse.ArgumentParser()
ap.add_argument("--config", default=str(HERE / "qwen.json"))
ap.add_argument("--model", default=None)
args = ap.parse_args()
CFG = json.load(open(args.config))
if args.model:
    CFG["model"] = args.model
CFG["ref_audio"] = studio_path(CFG["ref_audio"])
if pathlib.Path(studio_path(CFG["model"])).exists():
    CFG["model"] = studio_path(CFG["model"])      # a model folder inside the studio; a repo id stays as it is
    os.environ.setdefault("HF_HUB_OFFLINE", "1")  # a draft never touches the network
os.environ.setdefault("HF_HOME", studio_path(CFG.get("hf_home", "local-voice/hf")))
sys.path.insert(0, str(HERE))

OUT = sys.stdout          # JSON lines only go here; library prints are sent to stderr
sys.stdout = sys.stderr
import numpy as np
import soundfile as sf
import mlx.core as mx
from mlx_audio.tts.utils import load_model
from mlx_audio.utils import load_audio
import gates

SR = 24000
model = load_model(CFG["model"])
mx.eval(model.parameters())
_ref_cache = {}


def ref_array(path):
    if path not in _ref_cache:
        _ref_cache[path] = load_audio(path, sample_rate=SR)
    return _ref_cache[path]


def whisper_python():
    """The python that has openai-whisper (the studio README installs it with pipx): config, then the path
    setup-local-voice.sh found, then whatever `whisper` on PATH runs under."""
    if CFG.get("whisper_python"):
        return studio_path(CFG["whisper_python"])
    found = HERE / ".whisper-python"
    if found.exists():
        return found.read_text().strip()
    raise SystemExit("no python with openai-whisper found: run scripts/setup-local-voice.sh")


class Whisper:
    def __init__(self):
        self.p = subprocess.Popen([whisper_python(), str(HERE / "whisper_worker.py"), CFG.get("whisper_model", "medium.en")],
                                  stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
        json.loads(self.p.stdout.readline())

    def text(self, path):
        self.p.stdin.write(json.dumps({"path": str(path)}) + "\n"); self.p.stdin.flush()
        return json.loads(self.p.stdout.readline())["text"]


whisper = Whisper()


from wer import wer


def energy_score(x):
    """Pitch-movement score: std of F0 in semitones (autocorrelation tracker from gates.py), outliers clipped."""
    _, p = gates.f0_track(x, SR)
    if len(p) < 10:
        return 0.0
    st = 12 * np.log2(p / np.median(p))
    return float(np.std(np.clip(st, -12, 12)))


def generate(text, p, seed):
    mx.random.seed(seed)
    ref = ref_array(p["ref_audio"])
    chunks = []
    for r in model.generate(text=text, ref_audio=ref, ref_text=p["ref_text"], lang_code=CFG.get("lang_code", "en"),
                            temperature=p["temperature"], top_k=int(p["top_k"]), top_p=p["top_p"],
                            repetition_penalty=p["repetition_penalty"], max_tokens=int(p["max_tokens"]),
                            split_pattern=None, verbose=False):
        chunks.append(np.array(r.audio, dtype=np.float32))
    mx.clear_cache()
    return np.concatenate(chunks) if chunks else np.zeros(1, np.float32)


def split_sentences(text, min_words=0):
    """Split at . ! ? ; a sentence shorter than min_words is merged into its neighbour (very short isolated
    takes fail the tail and WER gates far more often)."""
    out = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
    i = 0
    while len(out) > 1 and i < len(out):
        if len(out[i].split()) < min_words:
            j = i + 1 if i + 1 < len(out) else i - 1
            a, b = sorted((i, j))
            out[a:b + 1] = [out[a] + " " + out[b]]
            i = 0
        else:
            i += 1
    return out


def apply_level(x, level_db):
    db = 20 * np.log10(np.sqrt(np.mean(x[np.abs(x) > 0.02 * np.abs(x).max()] ** 2)) + 1e-9)
    g = 10 ** ((level_db - db) / 20)
    return np.clip(x * min(g, 0.97 / max(1e-9, np.abs(x).max())), -1, 1)


def evaluate(x, tmp, say, check=("tail", "rise", "wer")):
    xt = gates.trim_end(x, SR)
    tail = gates.tail_db(xt, SR); rise = gates.ending_rise(xt, SR)
    sf.write(tmp, xt, SR, subtype="PCM_16")
    heard = whisper.text(tmp); w = wer(say, heard)
    g = CFG["gates"]
    ok = {"tail": bool(tail <= g["tail_db_max"]), "rise": bool(rise <= g["rise_hz_max"]), "wer": bool(w < g["wer_max"])}
    ok = {k: (v or k not in check) for k, v in ok.items()}   # gates not in `check` count as passed
    return xt, {"tail_db": float(tail), "rise_hz": float(rise), "wer": float(w), "heard": heard,
                "energy": energy_score(xt), "pass": ok, "all_pass": all(ok.values()), "sec": len(xt) / SR}


def take(text, say, p, seed0, attempts, select, tmp, check=("tail", "rise", "wer")):
    """Run attempts, return (audio, info, tries)."""
    tries, best = [], None
    for k in range(1, attempts + 1):
        seed = seed0 + k
        x = generate(text, p, seed)
        xt, m = evaluate(x, tmp, say, check)
        m.update(attempt=k, seed=seed)
        tries.append({kk: vv for kk, vv in m.items() if kk != "heard"})
        key = (m["all_pass"], sum(m["pass"].values()), m["energy"] if m["all_pass"] else -m["wer"])
        if best is None or key > best[0]:
            best = (key, xt, m)
        if select == "first_pass" and m["all_pass"]:
            break
    return best[1], best[2], tries


def handle(req):
    t0 = time.time()
    text = req["text"]; say = req.get("say", text)
    p = {**CFG["sampling"], "ref_audio": CFG["ref_audio"], "ref_text": CFG["ref_text"], **req.get("params", {})}
    p["ref_audio"] = studio_path(p["ref_audio"])
    mode = req.get("mode", CFG.get("mode", "single"))
    attempts = int(req.get("attempts", CFG.get("attempts", 4)))
    select = req.get("select", CFG.get("select", "best_energy"))
    seed0 = int(req.get("seed", CFG.get("seed_base", 1000) + zlib.crc32(text.encode()) % 100000 * 10))
    out = pathlib.Path(req["out"]); out.parent.mkdir(parents=True, exist_ok=True)
    tmp = str(out.with_suffix(".tmp.wav"))
    if mode == "sentences":
        gap = np.zeros(int(req.get("gap_ms", CFG.get("gap_ms", 350)) / 1000 * SR), np.float32)
        parts, tries = [], []
        mw = int(CFG.get("min_sentence_words", 5))
        sents = split_sentences(text, mw)
        says = split_sentences(say, mw)
        if len(says) != len(sents):
            says = sents
        for i, s in enumerate(sents):
            last = i == len(sents) - 1
            xs, m, tr = take(s, says[i], p, seed0 + 100 * i, attempts, select, tmp, ("tail", "rise", "wer") if last else ("wer",))
            if req.get("parts_dir"):
                pathlib.Path(req["parts_dir"]).mkdir(parents=True, exist_ok=True)
                sf.write(pathlib.Path(req["parts_dir"]) / f"{out.stem}_p{i + 1}.wav", xs, SR, subtype="PCM_16")
            parts += [xs, gap]; tries.append({"sentence": i + 1, "chosen": m["attempt"], "tries": tr})
        x = np.concatenate(parts[:-1])
        tries_out = tries
    else:
        x, chosen, tr = take(text, say, p, seed0, attempts, select, tmp)
        tries_out = tr
    if req.get("level_db", CFG.get("level_db")) is not None:
        x = apply_level(x, req.get("level_db", CFG.get("level_db")))
    xt, m = evaluate(x, tmp, say)   # final gates on exactly what is written
    sf.write(out, xt, SR, subtype="PCM_16")
    os.remove(tmp)
    m["attempt"] = chosen["attempt"] if mode == "single" else None
    return {"id": req.get("id"), "ok": True, "out": str(out), "mode": mode, "seed": seed0, "attempts_run": len(tries_out),
            **{k: m[k] for k in ["tail_db", "rise_hz", "wer", "heard", "energy", "pass", "all_pass", "sec"]},
            "attempt": m.get("attempt"), "tries": tries_out, "gen_s": time.time() - t0}


def emit(obj):
    OUT.write(json.dumps(obj, default=float) + "\n"); OUT.flush()


def main():
    emit({"event": "ready", "model": CFG["model"], "config": args.config, "sr": SR})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        req = {}
        try:
            req = json.loads(line)
            if req.get("cmd") == "quit":
                break
            res = handle(req)
        except Exception as e:  # keep the process alive
            res = {"id": req.get("id"), "ok": False, "error": f"{type(e).__name__}: {e}"}
        emit(res)


if __name__ == "__main__":
    main()
