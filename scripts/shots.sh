#!/bin/bash
# Renders pose-viewer screenshots one after another and tiles them into one sheet.
# usage: scripts/shots.sh out.png "hash1" "hash2" ...   (each hash is the part after #view&)
out="$1"; shift
dir=$(mktemp -d)
i=0
for h in "$@"; do
  i=$((i+1))
  n=$(printf "%02d" $i)
  timeout 40 google-chrome --headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader \
      --virtual-time-budget=1200 --window-size=640,480 --hide-scrollbars \
      --screenshot="$dir/s$n.png" "file:///home/claude/ratquest/dist-single/ratquest.html#view&$h" >/dev/null 2>&1
  convert "$dir/s$n.png" -gravity SouthWest -fill white -undercolor '#000a' -pointsize 15 -annotate +4+4 "$h" "$dir/s$n.png"
done
cols=${COLS:-3}
montage "$dir"/s*.png -tile ${cols}x -geometry 480x360+2+2 -background '#111' "$out"
rm -rf "$dir"
