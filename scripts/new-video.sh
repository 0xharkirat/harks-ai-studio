#!/bin/zsh
# Start a new narrated video from the template.
# Usage: scripts/new-video.sh [--explainer | --short | --channel] 03-short-name   (run from anywhere)
#   --explainer  start from the explainer-video scenes, voiced locally with macOS say, with no camera box
#   --short      start from the short done-video scenes (30-60 s): glow camera box, a whoosh on each cut
#   --channel    start a For Curious Beings video from the scene library (scenes/): themes A-D, native 16:9 and 9:16, no camera box
# A new done video starts in DRAFT mode (the local qwen voice, no ElevenLabs credits). scripts/voice-mode.sh flips it to final.
set -e
studio=${0:A:h:h}
explainer=0
short=0
channel=0
[[ $1 == --explainer ]] && { explainer=1; shift; }
[[ $1 == --short ]] && { short=1; shift; }
[[ $1 == --channel ]] && { channel=1; shift; }
name=$1
# The name becomes a folder under videos/, so only allow NN-kebab-case: no "..", no slashes.
[[ $name =~ '^[0-9]{2}-[a-z0-9]+(-[a-z0-9]+)*$' ]] || { echo "usage: $0 [--explainer | --short | --channel] NN-short-name (like 03-login-fix)"; exit 1; }
dir=$studio/videos/$name/project
[[ ! -e $dir ]] || { echo "$dir already exists"; exit 1; }
config=$(zsh $studio/scripts/config-path.sh)
puppet=''
(( explainer || channel )) || puppet=$(python3 -c "import json,os;p=json.load(open('$config'))['speaker'].get('puppet');print(os.path.expanduser(p) if p else '')")
[[ -z $puppet || -f $puppet ]] || { echo "speaker.puppet in $config points at a missing file: $puppet"; exit 1; }
python3 -c "import json,sys;sys.exit(0 if json.load(open('$config'))['speaker'].get('portrait') else 1)" &&
  echo "note: speaker.portrait is no longer used; the camera box shows the speaker.puppet cartoon"
trap 'rm -rf $studio/videos/$name; echo "new-video failed; removed the half-built $name"' ERR
mkdir -p $dir/public/audio $dir/public/shots
cp -R $studio/template/. $dir/
(( explainer )) && cp -R $studio/explainer-video/template/. $dir/
(( short )) && cp -R $studio/short-video/template/. $dir/
# The channel look: the scene library is copied into src/lib (a snapshot, like config.json), over the template's own files.
if (( channel )); then
  cp -R $studio/scenes/template/. $dir/
  mkdir -p $dir/src/lib
  cp -R $studio/scenes/src/. $dir/src/lib/
fi
cp -R $studio/assets/sfx $studio/assets/music $dir/public/
# The talking cartoon in the camera box: layers cut from the Character Animator PSD (see README Puppet).
[[ -n $puppet ]] && uv run --quiet $studio/scripts/puppet.py $puppet $dir/public/puppet $dir/src/puppet.json
cp $config $dir/src/config.json   # the recipe this video was made with; the voice tools read it
# A channel video is faceless: no camera box. The voice stays the config's (draft, final, or recorded).
(( channel )) && python3 - $dir/src/config.json <<'EOF2'
import json, sys
path = sys.argv[1]
config = json.load(open(path))
config['speaker']['puppet'] = None
json.dump(config, open(path, 'w'), indent=2)
EOF2
# An explainer is not narrated as the speaker: a local voice reads it, and no camera box shows.
(( explainer )) && python3 - $dir/src/config.json <<'EOF'
import json, sys
path = sys.argv[1]
config = json.load(open(path))
config.setdefault('tts', {})['provider'] = 'say'
config['speaker']['puppet'] = None
json.dump(config, open(path, 'w'), indent=2)
EOF
cd $dir
# A new done video starts as a DRAFT: the local voice, so rough edits cost no ElevenLabs credits.
# voice-mode.sh falls back to say, never to ElevenLabs, when the local voice is not set up; `voice-mode.sh final` flips it.
(( explainer )) || zsh $studio/scripts/voice-mode.sh draft
# The channel mark: copy the logo from the brand export folder when it is there (scenes/README.md, "Channel mark").
(( channel )) && dart $studio/scripts/scenes.dart brand
dart $studio/scripts/fill.dart
# pnpm clones every file from one store, and Chrome is shared by every video: see scripts/install-deps.sh.
zsh $studio/scripts/install-deps.sh
trap - ERR
echo "Ready: $dir"
