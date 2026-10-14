import warnings,sys,numpy as np,librosa,torch,glob,pathlib
warnings.filterwarnings('ignore')
from speechbrain.inference.speaker import EncoderClassifier as Speaker
S='/Users/hark/Movies/harks-ai-studio'
spk=Speaker.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb',savedir=S+'/.cache/speaker_model')
def emb(p):
    y=librosa.load(p,sr=16000,mono=True)[0]
    e=spk.encode_batch(torch.tensor(y).unsqueeze(0)).squeeze().numpy(); return e/np.linalg.norm(e)
refs={n:emb(f'{S}/assets/voice/reference/{n}.mp3') for n in ['real_vibe_140','real_playwright_300']}
R8=S+'/voice-tests/round8/'
for who in ['elevenlabs','qwen-v1','qwen-v2']:
    row=[]
    for n in ['02','03','04','05','intro','outro','long']:
        e=emb(f'{R8}{n}-{who}.wav'); row.append(np.mean([float(e@r) for r in refs.values()]))
    print(who,' '.join(f'{x:.2f}' for x in row),'mean',f'{np.mean(row):.2f}')
