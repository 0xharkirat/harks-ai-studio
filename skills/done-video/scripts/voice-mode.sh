#!/bin/zsh
# Flip a video between DRAFT (the local voice, free), FINAL (the ElevenLabs clone, billed) and RECORDED (your own recordings).
# Usage, from the video's project folder:  zsh ../../../scripts/voice-mode.sh draft|final|recorded|status
#   draft   tts.provider = qwen (say when the local voice is not set up; never ElevenLabs)
#   final   tts.provider = elevenlabs, prints the credit estimate and "ElevenLabs is billed only from here on"
#   recorded  tts.provider = recorded: the narration is your own recordings (scripts/recorded.dart), nothing is voiced or billed
#   status  prints the active provider
# This only edits src/config.json. It never calls ElevenLabs: the next `dart tts.dart` does, in final mode.
# The recipe (voice_id, model_id, prefix, seed) is never touched, so final restores exactly what new-video.sh stored.
set -e
studio=${0:A:h:h}
mode=$1
[[ $mode == (draft|final|recorded|status) ]] || { echo "usage: voice-mode.sh draft|final|recorded|status (run from the video's project folder)"; exit 1; }
[[ -f src/config.json && -f script.json ]] || { echo "voice-mode: run this from the video's project folder (no src/config.json here)"; exit 1; }
why=''
if [[ $mode == draft ]]; then
  why=$(zsh $studio/scripts/setup-local-voice.sh --check) || true
fi
python3 - $mode "$why" <<'PY'
import json, sys
mode, why = sys.argv[1], sys.argv[2]
path = 'src/config.json'
config = json.load(open(path))
tts = config.setdefault('tts', {})
had = 'provider' in tts
now = tts.get('provider', 'elevenlabs')

def label(p):
    if p == 'recorded':
        return 'RECORDED (your own voice, from ' + tts.get('recorded', {}).get('dir', 'recordings') + '/)'
    return 'FINAL (elevenlabs)' if p == 'elevenlabs' else f"DRAFT ({p}{', attempts %s' % tts.get('qwen', {}).get('attempts', 'default') if p == 'qwen' else ''})"

def save():
    json.dump(config, open(path, 'w'), indent=2, ensure_ascii=False)

if mode == 'status':
    print(label(now) + ('' if had else ' - no tts.provider set, which means ElevenLabs'))
elif mode == 'draft':
    # Paths are relative to the studio. attempts 2 is the quick draft setting; local-voice/README.md has the full-quality one.
    tts['qwen'] = {'python': 'local-voice/.venv/bin/python', 'server': 'local-voice/qwen_server.py',
                   'config': 'local-voice/qwen.json', 'attempts': 2, **tts.get('qwen', {})}
    if why:
        tts['provider'] = 'say'
        print(f"local voice is not set up ({why}): this draft uses say; run scripts/setup-local-voice.sh, then voice-mode.sh draft")
    else:
        tts['provider'] = 'qwen'
    save()
    print('mode: ' + label(tts['provider']) + '. Voicing costs no ElevenLabs credits.')
elif mode == 'recorded':
    tts['recorded'] = {'dir': 'recordings', 'model': 'small.en', 'pad': 0.1, 'gap': 0.25, **tts.get('recorded', {})}
    tts['provider'] = 'recorded'
    save()
    print('mode: ' + label('recorded') + '. Nothing is voiced or billed.')
    print('Put the recordings in ' + tts['recorded']['dir'] + '/ (take.wav, <scene>.wav or <scene>_<n>.wav), then run `dart ../../../scripts/recorded.dart --dry-run`, then `dart ../../../scripts/recorded.dart`.')
else:
    if str(config.get('voice_id', '')).startswith('PASTE') or not config.get('voice_id'):
        sys.exit('voice-mode: voice_id in src/config.json is a placeholder, so there is no ElevenLabs clone to switch to (README "Make it yours")')
    chars = sum(len(l.get('tts') or l['say']) for s in json.load(open('script.json')) for l in s['lines'])
    tts['provider'] = 'elevenlabs'
    save()
    print('mode: FINAL (elevenlabs)')
    print(f"recipe: voice {config['voice_id'][:6]}..., model {config['model_id']}, seed {config['seed']}, prefix {config.get('prefix') or 'none'!r}")
    print(f"estimate: {chars} characters, about {chars} credits for one full voicing (about 1 per character; a re-roll or retake costs more)")
    print('ElevenLabs is billed only from here on: the next `dart ../../../scripts/tts.dart` calls it.')
    print("Preview first, free: `dart ../../../scripts/tts.dart --dry-run`")
PY
