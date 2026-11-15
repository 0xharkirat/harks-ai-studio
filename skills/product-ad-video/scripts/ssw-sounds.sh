#!/bin/zsh
# Cut the 4 SSW TV sounds that the ad films use from the SSW TV originals, into the user's sound folder.
# The originals are SSW internal assets (SSW TV SharePoint: General / 06-sswtv-assets / SSWTV-SFX-assets),
# so they never go into git. Without them, the engine plays synthesized stand-ins and prints a warning.
#
#   scripts/ssw-sounds.sh <folder with the SSW TV originals>
#
# Writes $AD_VIDEO_SFX_DIR/sswtv/*.wav, or ~/.config/product-ad-video/sfx/sswtv/*.wav. Needs ffmpeg.
# The edits are the ones in ads/tinacms/music/assets/sfx/README.md.
set -e
src=${1:?usage: ssw-sounds.sh <folder with the SSW TV originals>}
out=${AD_VIDEO_SFX_DIR:-$HOME/.config/product-ad-video/sfx}/sswtv
mkdir -p "$out"

# name | original file | start (s) | length (s) | fade-out (s)
cut() {
  local name=$1 file=$2 start=$3 len=$4 fade=$5
  if [[ ! -f "$src/$file" ]]; then
    echo "missing: $src/$file" >&2
    return 1
  fi
  local af="aresample=48000"
  [[ $fade != 0 ]] && af="$af,afade=t=out:st=$(( len - fade )):d=$fade"
  ffmpeg -v error -y -ss $start -t $len -i "$src/$file" -ac 1 -af "$af" -c:a pcm_s16le "$out/$name.wav"
  echo "$out/$name.wav"
}

cut pop    "Bo - for something pop up on screen.mp3" 0.044 0.36 0.06
cut bubble "Message bubble of whatsapp.mp3"          0.488 0.55 0.1
cut click  "Mouse Click.mp3"                         1.024 0.36 0.08
cut typing "Typing sound.wav"                        0.1   14   0
