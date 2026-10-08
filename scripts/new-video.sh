#!/bin/zsh
# Start a new narrated video from the template.
# Usage: scripts/new-video.sh 03-short-name   (run from anywhere)
set -e
studio=${0:A:h:h}
name=$1
# The name becomes a folder under videos/, so only allow NN-kebab-case: no "..", no slashes.
[[ $name =~ '^[0-9]{2}-[a-z0-9]+(-[a-z0-9]+)*$' ]] || { echo "usage: $0 NN-short-name (like 03-login-fix)"; exit 1; }
dir=$studio/videos/$name/project
[[ ! -e $dir ]] || { echo "$dir already exists"; exit 1; }
config=$(zsh $studio/scripts/config-path.sh)
portrait=$(python3 -c "import json,os;p=json.load(open('$config'))['speaker'].get('portrait');print(os.path.expanduser(p) if p else '')")
[[ -z $portrait || -f $portrait ]] || { echo "speaker.portrait in $config points at a missing file: $portrait"; exit 1; }
trap 'rm -rf $studio/videos/$name; echo "new-video failed; removed the half-built $name"' ERR
mkdir -p $dir/public/audio $dir/public/shots
cp -R $studio/template/. $dir/
cp -R $studio/assets/sfx $studio/assets/music $dir/public/
[[ -n $portrait ]] && cp $portrait $dir/public/portrait.jpg
cp $config $dir/src/config.json   # the recipe this video was made with; the voice tools read it
cd $dir
dart $studio/scripts/fill.dart
# An earlier video with the same lock file lends its node_modules: a copy-on-write clone is instant and offline.
donor=''
for p in $studio/videos/*/project(N/); do
  [[ -d $p/node_modules ]] && cmp -s $p/package-lock.json package-lock.json && { donor=$p; break; }
done
if [[ -n $donor ]]; then
  cp -cR $donor/node_modules . 2>/dev/null || cp -R $donor/node_modules .
  rm -rf node_modules/.cache   # the donor's bundler cache; this video builds its own
else
  npm ci --no-audit --no-fund
fi
trap - ERR
echo "Ready: $dir"
