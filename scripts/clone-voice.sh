#!/bin/zsh
# Make an Instant Voice Clone from the training clips in assets/voice/*.mp3 and save its id in voice.json.
# Usage: scripts/clone-voice.sh   (needs ELEVENLABS_API_KEY with Voices: Write; clone only your own voice)
set -e
studio=${0:A:h:h}
name=$(python3 -c "import json;print(json.load(open('$studio/voice.json'))['speaker']['ai_name'])")
files=($studio/assets/voice/*.mp3)
(( ${#files} )) || { echo "No clips in assets/voice. Run scripts/fetch-voice.sh first."; exit 1; }
args=(); for f in $files; do args+=(-F "files=@$f"); done
id=$(curl -s -X POST https://api.elevenlabs.io/v1/voices/add -H "xi-api-key: $ELEVENLABS_API_KEY" -F "name=$name" "${args[@]}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('voice_id') or sys.exit('clone failed: '+json.dumps(d)))")
python3 - "$studio/voice.json" "$id" <<'PY'
import json, sys
p, vid = sys.argv[1], sys.argv[2]
v = json.load(open(p)); v['voice_id'] = vid
json.dump(v, open(p, 'w'), indent=2, ensure_ascii=False)
PY
echo "Cloned \"$name\" as $id and saved it to voice.json"
