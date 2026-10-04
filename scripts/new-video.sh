#!/bin/zsh
# Start a new narrated video from the template.
# Usage: scripts/new-video.sh 03-short-name   (run from anywhere)
set -e
studio=${0:A:h:h}
dir=$studio/videos/$1/project
[[ -n $1 && ! -e $dir ]] || { echo "usage: $0 <NN-name> (folder must not exist; next NN: $(ls $studio/videos 2>/dev/null | grep -c '^[0-9]') + 1)"; exit 1; }
mkdir -p $dir/public/audio $dir/public/shots
cp -R $studio/template/. $dir/
cp -R $studio/assets/sfx $studio/assets/music $dir/public/
portrait=$(python3 -c "import json;print(json.load(open('$studio/voice.json'))['speaker']['portrait'])")
[[ -f $studio/$portrait ]] || { echo "Missing portrait $portrait (set speaker.portrait in voice.json; it is not in git)"; rm -rf $studio/videos/$1; exit 1; }
cp $studio/$portrait $dir/public/portrait.jpg
cp $studio/voice.json $dir/src/config.json   # the recipe this video was made with
cd $dir && dart $studio/scripts/fill.dart && npm install --silent
echo "Ready: $dir"
