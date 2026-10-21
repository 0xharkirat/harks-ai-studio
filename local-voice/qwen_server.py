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
                                      the highest pitch-movement score; first_pass = stop at the first pass.
                                      best_energy runs Whisper lazily: takes that pass the tail and rise gates are
                                      heard in falling energy order until one passes WER, which is the same take
                                      a full check keeps; the others are heard only when no take passes
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
In "tries", a take that Whisper did not need to hear has "wer": null and "asr": false. Each take also reports
"gen_s" and "asr_s" (seconds) and MLX memory in MB: "active_mb", "peak_mb" (during that take) and "cache_mb".

Memory and lifetime: MLX keeps freed buffers in a cache for reuse; config "mlx_cache_mb" caps it (default 512).
Each sentence gets max_tokens = min(config max_tokens, "max_tokens_floor" + "max_tokens_per_word" x words), so a
runaway take stops early (the codec makes 12.5 tokens a second; normal speech needs about 5 tokens a word).
The helper exits by itself after "idle_exit_min" minutes with no request (default 10; 0 = never).

The only audio operations are: trim silence below -50 dB at both ends, join with silence gaps, and (if level_db
is given) a single gain. No pitch shift, stretch, EQ or compression.
"""
import os, sys, json, re, time, zlib, argparse, subprocess, pathlib, threading

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
MB = 2 ** 20
# Without a limit MLX keeps every freed buffer for reuse, and the helper grew to 15 GB on 6 lines.
mx.set_cache_limit(int(CFG.get("mlx_cache_mb", 512)) * MB)
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
    """openai-whisper on the CPU in fp32, as a separate long-lived worker.
    MLX Whisper (mlx-audio 0.5.9) was tried on 2026-10-21 and rejected: with medium.en it never stops at the end of
    the speech and invents text, so every take failed WER. See research/2026-10-21-mlx-whisper-medium-en.md."""

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


def token_cap(text, p):
    """max_tokens for one text: generous for normal speech (about 3x the slowest pace measured, plus a floor),
    tight enough that a take which babbles past the end stops early instead of running to 96 s."""
    words = len(text.split())
    cap = int(CFG.get("max_tokens_floor", 60)) + int(CFG.get("max_tokens_per_word", 15)) * words
    return min(int(p["max_tokens"]), cap)


def mem_mb():
    return {"active_mb": round(mx.get_active_memory() / MB), "peak_mb": round(mx.get_peak_memory() / MB),
            "cache_mb": round(mx.get_cache_memory() / MB)}


def generate(text, p, seed):
    """Returns (audio, stats): stats holds gen_s and the MLX memory of this take."""
    t0 = time.time()
    mx.reset_peak_memory()
    mx.random.seed(seed)
    ref = ref_array(p["ref_audio"])
    chunks = []
    for r in model.generate(text=text, ref_audio=ref, ref_text=p["ref_text"], lang_code=CFG.get("lang_code", "en"),
                            temperature=p["temperature"], top_k=int(p["top_k"]), top_p=p["top_p"],
                            repetition_penalty=p["repetition_penalty"], max_tokens=token_cap(text, p),
                            split_pattern=None, verbose=False):
        chunks.append(np.array(r.audio, dtype=np.float32))
    stats = {"gen_s": round(time.time() - t0, 2), **mem_mb()}
    mx.clear_cache()
    return (np.concatenate(chunks) if chunks else np.zeros(1, np.float32)), stats


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


def measure(x, check):
    """The gates that need no Whisper: trim, tail, rise and energy. WER is filled in by hear()."""
    xt = gates.trim_end(x, SR)
    tail = gates.tail_db(xt, SR); rise = gates.ending_rise(xt, SR)
    g = CFG["gates"]
    ok = {"tail": bool(tail <= g["tail_db_max"]) or "tail" not in check,   # gates not in `check` count as passed
          "rise": bool(rise <= g["rise_hz_max"]) or "rise" not in check, "wer": None}
    return xt, {"tail_db": float(tail), "rise_hz": float(rise), "wer": None, "heard": None, "asr": False,
                "energy": energy_score(xt), "pass": ok, "all_pass": False, "sec": len(xt) / SR}


def hear(xt, m, tmp, say, check):
    """Run Whisper on a measured take and complete its gates."""
    t0 = time.time()
    sf.write(tmp, xt, SR, subtype="PCM_16")
    m["heard"] = whisper.text(tmp); m["wer"] = float(wer(say, m["heard"]))
    m["pass"]["wer"] = bool(m["wer"] < CFG["gates"]["wer_max"]) or "wer" not in check
    m["all_pass"] = all(m["pass"].values()); m["asr"] = True; m["asr_s"] = round(time.time() - t0, 2)
    return m


def evaluate(x, tmp, say, check=("tail", "rise", "wer")):
    xt, m = measure(x, check)
    return xt, hear(xt, m, tmp, say, check)


def score_key(m):
    """The selection order of every take: all gates passed, then gates passed, then energy (or lowest WER)."""
    return (m["all_pass"], sum(m["pass"].values()), m["energy"] if m["all_pass"] else -m["wer"])


def take(text, say, p, seed0, attempts, select, tmp, check=("tail", "rise", "wer")):
    """Run attempts, return (audio, info, tries)."""
    takes = []   # (attempt, seed, trimmed audio, metrics)
    for k in range(1, attempts + 1):
        seed = seed0 + k
        x, stats = generate(text, p, seed)
        xt, m = measure(x, check)
        m.update(attempt=k, seed=seed, **stats)
        takes.append((k, seed, xt, m))
        if select == "first_pass":
            hear(xt, m, tmp, say, check)
            if m["all_pass"]:
                break
    if select != "first_pass" and CFG.get("lazy_asr", True):
        # The winner is the highest-energy take that passes every gate. Hear the takes that already pass tail and
        # rise in falling energy order; the first one that also passes WER is that winner.
        ready = sorted((t for t in takes if t[3]["pass"]["tail"] and t[3]["pass"]["rise"]),
                       key=lambda t: (-t[3]["energy"], t[0]))
        winner = None
        for t in ready:
            if hear(t[2], t[3], tmp, say, check)["all_pass"]:
                winner = t
                break
        if winner is None:   # no take passes: hear the rest and pick exactly as a full check does
            for t in takes:
                if not t[3]["asr"]:
                    hear(t[2], t[3], tmp, say, check)
    elif select != "first_pass":
        for t in takes:
            hear(t[2], t[3], tmp, say, check)
    best = None
    for k, seed, xt, m in takes:
        if not m["asr"]:
            continue   # not heard: it cannot beat the winner, which passed every gate
        if best is None or score_key(m) > score_key(best[1]):
            best = (xt, m)
    tries = [{kk: vv for kk, vv in t[3].items() if kk != "heard"} for t in takes]
    return best[0], best[1], tries


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


_last_activity = time.time()
_busy = threading.Event()


def exit_when_idle(minutes):
    """Free the model and Whisper when nobody sends work, for example after a caller died without quitting.
    The watchdog thread touches no MLX state; it only ends the process between requests."""
    while True:
        time.sleep(30)
        if not _busy.is_set() and time.time() - _last_activity > minutes * 60:
            print(f"qwen_server: no request for {minutes} min, exiting", file=sys.stderr, flush=True)
            os._exit(0)


def main():
    global _last_activity
    idle = float(CFG.get("idle_exit_min", 10))
    if idle > 0:
        threading.Thread(target=exit_when_idle, args=(idle,), daemon=True).start()
    emit({"event": "ready", "model": CFG["model"], "config": args.config, "sr": SR})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        _busy.set()
        req = {}
        try:
            req = json.loads(line)
            if req.get("cmd") == "quit":
                break
            res = handle(req)
        except Exception as e:  # keep the process alive
            res = {"id": req.get("id"), "ok": False, "error": f"{type(e).__name__}: {e}"}
        emit(res)
        _last_activity = time.time()
        _busy.clear()


if __name__ == "__main__":
    main()
