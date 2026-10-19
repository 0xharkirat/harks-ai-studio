#!/bin/zsh
# Install a video's node dependencies with pnpm, and share one Chrome between all videos.
# Usage, from the video's project folder:  zsh ../../../scripts/install-deps.sh   (safe to run again)
#   - an old video with only package-lock.json is converted first (pnpm import keeps the resolved versions)
#   - pnpm clones every file from one store, so the 2nd video and later cost about 10 MB of real disk
#   - Remotion downloads Chrome Headless Shell into node_modules/.remotion; that folder links to $studio/.cache/remotion-browser
set -e
studio=${0:A:h:h}
shared=$studio/.cache/remotion-browser
fail() { echo "install-deps failed: $1" >&2; exit 1; }
[[ -f package.json ]] || fail "run this from the video's project folder (no package.json here)"
command -v pnpm >/dev/null || fail "pnpm is missing (brew install pnpm)"
if [[ ! -f pnpm-lock.yaml && -f package-lock.json ]]; then
  pnpm import >/dev/null 2>&1 || fail "pnpm import could not read package-lock.json"
fi
# Old videos have no pnpm-workspace.yaml (or pnpm left its placeholder): esbuild's build script is not needed, so say false.
if [[ ! -f pnpm-workspace.yaml ]] || grep -q "set this to true or false" pnpm-workspace.yaml; then
  printf 'allowBuilds:\n  esbuild: false\n' >pnpm-workspace.yaml
fi
# After an import the new lock file is the truth, so it is frozen too.
log=$(mktemp)
pnpm install --frozen-lockfile --prefer-offline >$log 2>&1 || { tail -5 $log >&2; rm -f $log; fail "pnpm install (output above)"; }
rm -f $log
# Link last: pnpm may remove entries it does not know. Re-link on every run.
mkdir -p $shared node_modules
rm -rf node_modules/.remotion
ln -s $shared node_modules/.remotion
echo "Installed: $PWD (pnpm, Chrome shared in ${shared:t})"
