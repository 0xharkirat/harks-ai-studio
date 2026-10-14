"""Render Qwen3-TTS clones. Usage: gen.py jobs.json out_dir log.json [--xvec] [--model REPO]
jobs.json: [{"n":"01","attempt":1,"text":"..."}]"""
import sys, json, time, pathlib, shutil, tempfile
import mlx.core as mx
from mlx_audio.tts.generate import generate_audio
from mlx_audio.tts.utils import load_model

jobs = json.load(open(sys.argv[1])); out = pathlib.Path(sys.argv[2]); out.mkdir(exist_ok=True)
logp = sys.argv[3]
model_id = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit"
if "--model" in sys.argv: model_id = sys.argv[sys.argv.index("--model") + 1]
extra = {}
if "--xvec" in sys.argv: extra["x_vector_only_mode"] = True
here = pathlib.Path(__file__).parent
ref = str(here / "voice/ref.wav"); ref_text = (here / "voice/ref.txt").read_text().strip()

log = {"device": str(mx.default_device()), "metal": mx.metal.is_available(), "model": model_id, "extra": extra, "jobs": []}
t0 = time.time(); model = load_model(model_id); mx.eval(model.parameters()); log["load_s"] = time.time() - t0
import soundfile as sf
for j in jobs:
    mx.random.seed(1000 * int(j["n"]) + j["attempt"])
    tmp = pathlib.Path(tempfile.mkdtemp(dir=here / "work"))
    t0 = time.time()
    generate_audio(text=j["text"], model=model, ref_audio=ref, ref_text=ref_text, output_path=str(tmp),
                   file_prefix="o", audio_format="wav", verbose=False, **extra)
    dt = time.time() - t0
    f = sorted(tmp.glob("o_*.wav"))
    dst = out / f"{j['n']}_a{j['attempt']}.wav"
    # join if the model split the text into several files
    if len(f) == 1: shutil.move(f[0], dst)
    else:
        import numpy as np
        xs = [sf.read(p)[0] for p in f]; sr = sf.read(f[0])[1]
        sf.write(dst, np.concatenate(xs), sr)
    shutil.rmtree(tmp)
    info = sf.info(dst)
    log["jobs"].append({"n": j["n"], "attempt": j["attempt"], "gen_s": dt, "audio_s": info.duration, "files": len(f)})
    print(j["n"], j["attempt"], f"gen {dt:.1f}s audio {info.duration:.1f}s", flush=True)
json.dump(log, open(logp, "w"), indent=1)
