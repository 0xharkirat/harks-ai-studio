"""Score narration against Hark's real voice: speaker match, accent, and pitch.

Usage: voicecheck.py <file> [<file> ...]
Needs the studio venv: speechbrain, librosa, torch, and setuptools<70 (see README Install).

Columns
  match   ECAPA speaker-verification cosine vs held-out real clips in assets/voice/reference
          (real Hark vs real Hark sits around the "real" rows; a different person is below 0.3)
  indian  share of 4 s windows the CommonAccent model hears as Indian English (us, aus likewise)
  pitch   median F0 in Hz; range is the interquartile spread, Hark's ups and downs
"""
import sys, warnings, numpy as np, librosa, torch
from pathlib import Path
warnings.filterwarnings('ignore')
from speechbrain.inference.classifiers import EncoderClassifier
from speechbrain.inference.speaker import EncoderClassifier as Speaker

STUDIO = Path(__file__).resolve().parent.parent
cache = STUDIO / '.cache'
acc = EncoderClassifier.from_hparams(source='Jzuluaga/accent-id-commonaccent_ecapa', savedir=str(cache / 'accent_model'))
spk = Speaker.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb', savedir=str(cache / 'speaker_model'))
labels = acc.hparams.label_encoder.ind2lab
idx = {v: k for k, v in labels.items()}

def load(path):
    return librosa.load(str(path), sr=16000, mono=True)[0]

def embed(y):
    e = spk.encode_batch(torch.tensor(y).unsqueeze(0)).squeeze().numpy()
    return e / np.linalg.norm(e)

refs = {p.name: embed(load(p)) for p in sorted((STUDIO / 'assets/voice/reference').glob('*.mp3'))}

def score(path):
    y = load(path)
    win = 4 * 16000
    chunks = [y[i:i + win] for i in range(0, len(y), win) if len(y[i:i + win]) > 2 * 16000]
    # The accent model scores by cosine; a softmax at scale 30 (its training margin) gives shares.
    scores = torch.stack([acc.classify_batch(torch.tensor(c).unsqueeze(0))[0].squeeze() for c in chunks])
    probs = torch.softmax(scores * 30, -1).mean(0).numpy()
    f0, voiced, _ = librosa.pyin(y, fmin=65, fmax=320, sr=16000, frame_length=1024)
    f0 = f0[voiced & ~np.isnan(f0)]
    e = embed(y)
    match = np.mean([float(e @ r) for name, r in refs.items() if name != Path(path).name])
    return match, probs[idx['indian']], probs[idx['us']], probs[idx['australia']], np.median(f0), np.subtract(*np.percentile(f0, [75, 25]))

print(f"{'file':44} {'match':>5} {'indian':>6} {'us':>5} {'aus':>5} {'pitch':>5} {'range':>5}")
for p in sys.argv[1:]:
    m, ind, us, aus, pitch, rng = score(p)
    print(f"{Path(p).name[:44]:44} {m:5.2f} {ind:6.2f} {us:5.2f} {aus:5.2f} {pitch:5.0f} {rng:5.0f}")
