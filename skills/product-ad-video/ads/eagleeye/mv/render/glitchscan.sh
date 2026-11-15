#!/bin/zsh
# Find capture glitches: a big jump (scene score > HI) followed within 3 frames by another jump (> LO).
# A real cut jumps once and then settles. glitchscan.sh video.mp4 [HI] [LO]
f=$1; hi=${2:-0.15}; lo=${3:-0.06}
ffmpeg -loglevel error -i $f -vf "scale=480:-1,select='gte(scene,0)',metadata=print:file=-" -an -f null - 2>/dev/null \
 | awk -v hi=$hi -v lo=$lo '/pts_time/ {split($0,a,"pts_time:"); t=a[2]} /scene_score/ {split($0,b,"="); s[++n]=b[2]; T[n]=t}
   END {for (i=1;i<=n;i++) if (s[i]>hi) { m=0; for (j=i+1;j<=i+3&&j<=n;j++) if (s[j]>m) m=s[j]; if (m>lo) printf "%.3f(%.2f>%.2f) ", T[i], s[i], m }; print ""}'
