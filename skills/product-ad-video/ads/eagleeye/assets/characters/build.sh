#!/bin/zsh
# Build each character's pose strip: <name>.webp, its key poses side by side, 600 x 600 px each.
# Strip index 0 is the typing pose and 1 the reaction; the scenes pick the pose from story moments.
#   ./build.sh        (needs ffmpeg, cwebp and dwebp)
set -e
cd "${0:A:h}"
tmp=$(mktemp -d)
build() {
  local name=$1 ins=() scale='' stack='' n=0
  shift
  for p in "$@"; do
    dwebp -quiet poses/$p.webp -o $tmp/$n.png
    ins+=(-i $tmp/$n.png); scale+="[$n]scale=600:600:flags=lanczos[s$n];"; stack+="[s$n]"; n=$((n + 1))
  done
  ffmpeg -v error -y "${ins[@]}" -filter_complex "${scale}${stack}hstack=$n" $tmp/strip.png
  cwebp -quiet -q 92 $tmp/strip.png -o $name.webp
  printf '{ "frames": %d }\n' $n > $name.json
  echo "$name.webp: $*"
}
build dev dev-1 dev-3
build editor-stressed editor-base stressed-2
build editor-happy happy-1 happy-2
rm -rf $tmp
