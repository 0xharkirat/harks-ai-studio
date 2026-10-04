#!/bin/zsh
# Rebuild assets/voice/*.mp3 from the public videos listed in assets/voice/sources.json.
# Usage: scripts/fetch-voice.sh   (needs yt-dlp, ffmpeg, python3)
set -e
studio=${0:A:h:h}
cd $studio/assets/voice
mkdir -p reference .download
python3 - <<'PY' | while IFS=$'\t' read -r file video start end filter; do
import json
d = json.load(open('sources.json'))
for group in ('train', 'reference'):
    for c in d[group]['clips']:
        print('\t'.join([c['file'], c['video'], str(c['start']), str(c['end']), d[group]['filter']]))
PY
  src=.download/$video.wav
  [[ -f $src ]] || yt-dlp -q --no-warnings -f bestaudio -x --audio-format wav -o ".download/%(id)s.%(ext)s" -- "$video"
  ffmpeg -v error -y -ss $start -to $end -i $src -ac 1 -ar 44100 -af "$filter" -b:a 192k $file
  echo "✓ $file"
done
