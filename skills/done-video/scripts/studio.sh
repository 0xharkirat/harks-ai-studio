#!/bin/zsh
# Print the studio: the folder where videos, voices, and caches live. Every later command runs from it.
# Usage: STUDIO=$(zsh <skill folder>/scripts/studio.sh)
#   - A git clone of the repo is its own studio, so nothing moves.
#   - A plugin install lives in a cache folder that each plugin update replaces, so it copies its files to a lasting
#     studio first ($DONE_VIDEO_STUDIO, default ~/done-video-studio) and prints that. The copy runs on every call, so a
#     plugin update reaches the studio, and videos, venvs, models, and caches there are never touched.
set -e
here=${0:A:h:h}
top=$(git -C $here rev-parse --show-toplevel 2>/dev/null || true)
if [[ $here != */plugins/cache/* && -n $top ]] && grep -qs '"harks-ai-studio"' $top/.claude-plugin/plugin.json; then
  print -r -- $here
  exit
fi
studio=${DONE_VIDEO_STUDIO:-$HOME/done-video-studio}
studio=${studio:a}
mkdir -p $studio
# No --delete: everything a run makes (videos, venvs, models, caches) is not in the plugin, and must stay.
rsync -a \
  --exclude '/videos/' --exclude '/.venv/' --exclude '/.cache/' --exclude 'node_modules/' \
  --exclude '/local-voice/.venv/' --exclude '/local-voice/models/' --exclude '/local-voice/hf/' --exclude '/local-voice/out/' \
  $here/ $studio/ || { print -u2 "studio.sh: could not copy the skill to $studio"; exit 1; }
print -r -- $studio
