#!/bin/zsh
# Print the config file every tool reads, first match wins:
#   $DONE_VIDEO_CONFIG, ~/.config/done-video/config.json, config.json in the studio, config.example.json.
# Personal settings (your voice ID, portrait, accent) live outside the repo; the example is the neutral default.
studio=${0:A:h:h}
for f in "$DONE_VIDEO_CONFIG" ~/.config/done-video/config.json $studio/config.json $studio/config.example.json; do
  [[ -n $f && -f $f ]] && { print -r -- ${f:A}; exit 0; }
done
echo "no config found" >&2; exit 1
