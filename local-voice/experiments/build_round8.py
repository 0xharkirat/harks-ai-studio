import sys, json, shutil, pathlib, numpy as np, soundfile as sf
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import gates
H = pathlib.Path(__file__).parent
R7 = pathlib.Path.home() / "Movies/harks-ai-studio/voice-tests/round7"
R8 = pathlib.Path.home() / "Movies/harks-ai-studio/voice-tests/round8"
R8.mkdir(parents=True, exist_ok=True)
SR = 24000
rd = lambda p: sf.read(p)[0].astype(np.float32)
wr = lambda p, x: sf.write(p, np.clip(x, -1, 1), SR, subtype="PCM_16")
sil = lambda ms: np.zeros(int(ms / 1000 * SR), np.float32)
def level(x, db=-19.0):
    s = x[np.abs(x) > 0.02 * np.abs(x).max()]
    g = 10 ** ((db - 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)) / 20)
    return x * min(g, 0.97 / np.abs(x).max())
v2src = {n: H / f"exp/e7_final/{n}_s1.wav" for n in ["02", "03", "04", "05", "06"]}
v2src["01"] = H / "exp/e7_final01b/01_s3.wav"
for n in ["01", "02", "03", "04", "05", "06", "intro", "outro"]:
    shutil.copy(R7 / f"{n}-elevenlabs.wav", R8 / f"{n}-elevenlabs.wav")
    shutil.copy(R7 / f"{n}-qwen.wav", R8 / f"{n}-qwen-v1.wav")
for n, p in v2src.items():
    shutil.copy(p, R8 / f"{n}-qwen-v2.wav")
GAP = 400
wr(R8 / "intro-qwen-v2.wav", np.concatenate([rd(R8 / "01-qwen-v2.wav"), sil(GAP), rd(R8 / "02-qwen-v2.wav")]))
wr(R8 / "outro-qwen-v2.wav", np.concatenate([rd(R8 / "05-qwen-v2.wav"), sil(GAP), rd(R8 / "06-qwen-v2.wav")]))
# long trio: EL = sentence 2 of line 03 (cut in the middle of the 3.10-3.54 s gap) + sentence of line 05, joined by 450 ms
el03 = rd(R7 / "03-elevenlabs.wav"); el05 = rd(R7 / "05-elevenlabs.wav")
s2 = gates.trim_end(el03[int(3.32 * SR):], SR); s5 = gates.trim_end(el05, SR)
wr(R8 / "long-elevenlabs.wav", np.concatenate([s2, sil(450), s5]))
shutil.copy(H / "exp/v1_long/long_s1.wav", R8 / "long-qwen-v1.wav")
shutil.copy(H / "exp/e7_long_one/long_s1.wav", R8 / "long-qwen-v2.wav")
shutil.copy(H / "exp/e7_long_split/long_s1.wav", R8 / "long-qwen-v2-split.wav")
# pause-length variants of line 03 (sentence takes from the same final run, only the gap differs)
p1 = rd(H / "exp/e7_final/parts/03_s1_p1.wav"); p2 = rd(H / "exp/e7_final/parts/03_s1_p2.wav")
for g in (250, 350, 450):
    wr(R8 / f"03-qwen-v2-gap{g}.wav", level(np.concatenate([p1, sil(g), p2])))
print(sorted(p.name for p in R8.glob("*.wav")))
