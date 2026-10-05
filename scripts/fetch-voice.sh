#!/bin/zsh
# Rebuild assets/voice/*.mp3 from the public videos in your sources file (config voice_sources).
# Usage: scripts/fetch-voice.sh   (needs yt-dlp, ffmpeg, python3)
set -e
studio=${0:A:h:h}
sources=$(python3 -c "import json,os;p=json.load(open('$(zsh $studio/scripts/config-path.sh)')).get('voice_sources');print(os.path.expanduser(p) if p else '')")
sources=${sources:-$studio/assets/voice/sources.json}
[[ -f $sources ]] || { echo "No sources file. Copy assets/voice/sources.example.json, list your own videos, and set voice_sources in your config."; exit 1; }
cd $studio/assets/voice
mkdir -p reference .download
python3 - $sources <<'PY' | while IFS=$'\t' read -r file video start end filter; do
import json
import sys
d = json.load(open(sys.argv[1]))
for group in ('train', 'reference'):
    for c in d[group]['clips']:
        print('\t'.join([c['file'], c['video'], str(c['start']), str(c['end']), d[group]['filter']]))
PY
  src=.download/$video.wav
  [[ -f $src ]] || yt-dlp -q --no-warnings -f bestaudio -x --audio-format wav -o ".download/%(id)s.%(ext)s" -- "$video"
  ffmpeg -v error -y -ss $start -to $end -i $src -ac 1 -ar 44100 -af "$filter" -b:a 192k $file
  echo "✓ $file"
done
