#!/bin/zsh
# Set up the local draft voice (Qwen3-TTS clone of Hark, on Apple Silicon). Safe to run again.
# Usage: scripts/setup-local-voice.sh           set up, then print "Ready:" or one line saying what failed
#        scripts/setup-local-voice.sh --check   print nothing and exit 0 when it is ready, else one line and exit 1
# Needs: Apple Silicon, uv, ffmpeg, python3, openai-whisper (README Install), assets/voice/hark_fumadocs_a.mp3.
set -e
studio=${0:A:h:h}
lv=$studio/local-voice
py=$lv/.venv/bin/python
model_name=Qwen3-TTS-12Hz-1.7B-Base-bf16
repo=mlx-community/$model_name
model=$lv/models/$model_name
ref=$studio/assets/voice/ref_energetic.wav
die() { print -u2 -- "setup-local-voice: $1"; exit 1; }

# The first missing piece, as one line. Empty when everything is in place.
missing() {
  [[ -x $py ]] || { print "no venv at local-voice/.venv"; return }
  $py -c 'import mlx_audio, soundfile, scipy' 2>/dev/null || { print "the venv lacks mlx-audio"; return }
  [[ -f $model/model.safetensors && -f $model/speech_tokenizer/model.safetensors ]] || { print "no model in local-voice/models"; return }
  [[ -f $ref ]] || { print "no reference clip assets/voice/ref_energetic.wav"; return }
  [[ -s $lv/.whisper-python ]] || { print "no python with openai-whisper found"; return }
}

if [[ $1 == --check ]]; then
  why=$(missing)
  [[ -z $why ]] || { print -- "$why"; exit 1; }
  exit 0
fi

[[ $(uname -m) == arm64 ]] || die "the local voice needs an Apple Silicon Mac (MLX); use tts.provider say instead"
for tool in uv ffmpeg python3; do command -v $tool >/dev/null || die "$tool is not installed (README Install)"; done
free_gb=$(( $(df -k $studio | awk 'NR==2 {print $4}') / 1024 / 1024 ))
(( free_gb >= 15 )) || print -u2 "warning: only $free_gb GB free; the venv and model need about 6 GB, and a first download needs more"

# 1. The venv, from the pinned list
[[ -x $py ]] || uv venv -q -p 3.12 $lv/.venv || die "uv could not make a Python 3.12 venv"
uv pip install -q --python $py -r $lv/requirements.txt || die "could not install local-voice/requirements.txt"

# 2. A python that has openai-whisper (the helper checks each sentence with it)
if ! [[ -s $lv/.whisper-python ]] || ! $(<$lv/.whisper-python) -c 'import whisper' 2>/dev/null; then
  found=''
  cands=(~/.local/pipx/venvs/openai-whisper/bin/python ~/.pyenv/versions/*/bin/python(N) $(command -v python3))
  for c in $cands; do
    [[ -x $c ]] && $c -c 'import whisper' 2>/dev/null && { found=$c; break; }
  done
  [[ -n $found ]] || die "no python has openai-whisper: run pipx install openai-whisper"
  print -r -- $found > $lv/.whisper-python
fi

# 3. The reference clip: 11.7 s of Hark, cut from his real recording, mono 24 kHz, no processing
if [[ ! -f $ref ]]; then
  src=$studio/assets/voice/hark_fumadocs_a.mp3
  [[ -f $src ]] || die "assets/voice/hark_fumadocs_a.mp3 is missing: run scripts/fetch-voice.sh"
  ffmpeg -v error -y -ss 37.31 -to 49.04 -i $src -ac 1 -ar 24000 $ref
fi

# 4. The bf16 model: reuse a copy already on this Mac (an instant APFS clone), else download it once
if [[ ! -f $model/model.safetensors || ! -f $model/speech_tokenizer/model.safetensors ]]; then
  rm -rf $model; mkdir -p $lv/models
  have=''
  for hub in $lv/hf/hub ~/Movies/done-video-research/qwen-test/hf/hub ~/.cache/huggingface/hub; do
    snap=(${hub}/models--mlx-community--${model_name}/snapshots/*(N))
    [[ -n $snap[1] && -e $snap[1]/model.safetensors ]] && { have=$snap[1]; break; }
  done
  if [[ -n $have ]]; then
    print "Reusing the model already downloaded at $have"
    cp -cRL $have $model || die "could not copy the model from $have"
  else
    print "Downloading $repo (about 4.5 GB, once)"
    HF_HOME=$lv/hf $lv/.venv/bin/hf download $repo --local-dir $model >/dev/null || die "model download failed: check the network and run again"
  fi
fi

# 5. Prove it loads, offline
HF_HUB_OFFLINE=1 $py -c "from mlx_audio.tts.utils import load_model; load_model('$model')" >/dev/null 2>&1 || die "the model does not load: delete local-voice/models and run again"

echo "Ready: local voice ($(du -sh $model | awk '{print $1}') model, whisper at $(<$lv/.whisper-python))"
