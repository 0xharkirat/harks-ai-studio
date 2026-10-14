import os; os.environ["HF_HOME"]="/Users/hark/Movies/done-video-research/qwen-test/hf"
import numpy as np, mlx.core as mx
from mlx_audio.tts.utils import load_model
from mlx_audio.utils import load_audio
m=load_model("mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit")
ref=load_audio("ref2/ref_energetic.wav",sample_rate=24000); rt=open("ref2/ref_energetic.txt").read().strip()
t="Hark just fixed the EagleEye nightly scan, so a retry only reruns what failed."
def g(instruct):
    mx.random.seed(42)
    return np.concatenate([np.array(r.audio) for r in m.generate(text=t,ref_audio=ref,ref_text=rt,lang_code="en",temperature=0.7,instruct=instruct,split_pattern=None)])
a=g(None); b=g("Speak in an energetic, upbeat presenter voice, with lots of pitch variation and enthusiasm.")
print(len(a),len(b), "identical" if len(a)==len(b) and np.allclose(a,b) else "DIFFERENT", float(np.abs(a[:min(len(a),len(b))]-b[:min(len(a),len(b))]).max()))
