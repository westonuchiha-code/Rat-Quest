#!/bin/bash
# Joins a film's pictures (film.mjs) into an .mp4 at 15 a second, over a tune.
#   bash scripts/film/cut.sh <out.mp4> <tune.wav> <dir:from:to> [<dir:from:to> ...]
# Each <dir:from:to> is a run of pictures from one film; several are joined end to end.
# The tune is one round of a song (render one with `node scripts/chip/make.mjs`): it goes round as often as the film
# needs and fades at the end. CROP=1 takes off the top strip (the "TEST no damage" label that &god shows).
# Needs ffmpeg.
set -e
out=$1; tune=$2; shift 2
tmp=$(mktemp -d); n=0
for seg in "$@"; do
  IFS=: read dir from to <<< "$seg"
  for ((i=from; i<to; i++)); do f=$(printf "%s/f-%04d.png" "$dir" "$i"); [ -f "$f" ] && { ln -s "$(realpath "$f")" "$tmp/$(printf f-%05d.png $n)"; n=$((n+1)); }; done
done
secs=$(python3 -c "print(round($n/15,3))"); fade=$(python3 -c "print(round($n/15-1.2,3))")
vf="null"; [ -n "$CROP" ] && vf="crop=960:516:0:24"
ffmpeg -y -loglevel error -framerate 15 -i $tmp/f-%05d.png -stream_loop -1 -i "$tune" -t $secs -vf "$vf" -af "afade=t=out:st=$fade:d=1.2" -c:v libx264 -pix_fmt yuv420p -crf 23 -preset slow -c:a aac -b:a 160k -movflags +faststart "$out"
echo "$(basename $out): $n pictures, ${secs}s, $(du -k "$out" | cut -f1) KB"
rm -rf $tmp
