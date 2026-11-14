#!/usr/bin/env bash
# Builds the model sheet and takes a picture of each page into <outdir> (default .sheet-shots). Needs Chrome.
# Usage: bash scripts/sheet-shots.sh [outdir] [spin] [only]     (only: a word the page names must contain, e.g. roach)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mkdir -p "${1:-.sheet-shots}" && cd "${1:-.sheet-shots}" && pwd)"
SPIN="${2:-0.6}"
npx vite build tools/modelsheet --outDir ../../.sheet --emptyOutDir --base ./ >/dev/null
node -e '
const fs = require("fs");
let html = fs.readFileSync(".sheet/index.html", "utf8");
for (const f of fs.readdirSync(".sheet/assets").filter((n) => n.endsWith(".js"))) {
  const js = fs.readFileSync(".sheet/assets/" + f, "utf8").replace(/<\/script/gi, "<\\/script");
  html = html.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/, () => "<script type=\"module\">\n" + js + "\n</script>");
}
fs.writeFileSync(".sheet/single.html", html);
'
ONLY="${3:-}"
shot() { # name hash
  case "$1" in *"$ONLY"*) ;; *) return 0 ;; esac
  google-chrome --headless=new --no-sandbox --use-gl=swiftshader --enable-unsafe-swiftshader --window-size=1400,620 \
    --virtual-time-budget=4000 --screenshot="$OUT/$1.png" "file://$PWD/.sheet/single.html#$2&spin=$SPIN" >/dev/null 2>&1
}
# Close looks: the left and the right half of each row.
shot roach-a "roach&cam=-3.8,1.6,6,-3.8,0.3,0"; shot roach-b "roach&cam=3.3,1.6,6.5,3.3,0.3,0"; shot roach-top "roach&cam=-4.5,3.2,2.5,-4.5,0.2,0"; shot roach-dead "roach&cam=5.7,1.4,4,5.7,0.3,0"
shot toad-a "toad&cam=-4,1.8,7,-4,0.4,0"; shot toad-b "toad&cam=3.8,2,7.5,3.8,0.6,0"; shot toad-face "toad&cam=-5.5,0.9,3.2,-6.3,0.45,0"; shot toad-dead "toad&cam=6.2,1.5,4.5,6.2,0.4,0"
shot ironback-a "ironback&cam=-4,2,7.5,-4,0.4,0"; shot ironback-b "ironback&cam=4,2,7.5,4,0.4,0"
shot bat-a "bat&cam=-4,2.6,8,-4,2.6,0"; shot bat-b "bat&cam=3.5,1.6,8.5,3.5,1.4,0"; shot bat-face "bat&cam=-1.0,2.5,2.6,-1.3,2.4,0"; shot bat-ground "bat&cam=2.6,1.6,3.5,2.6,0.1,0"; shot bat-roost "bat&cam=-5.6,3.0,3.2,-6.5,2.9,0"; shot ironback-face "ironback&cam=-5.2,1.0,4.2,-6.5,0.4,0"
shot npcs-a "npcs&cam=-4.6,1.3,7.5,-4.6,0.75,0"; shot npcs-pip "npcs&cam=-5.2,1.1,3.6,-5.8,0.7,0"; shot npcs-pipback "npcs&cam=-9.5,1.4,-2.5,-6.9,0.6,0"; shot npcs-finch "npcs&cam=-1,1.0,3.4,-1.1,0.6,0"; shot npcs-b "npcs&cam=4.4,2,9,4.4,1.5,0"; shot npcs-dave "npcs&cam=3.4,1.2,4,2.6,0.8,0"; shot npcs-grim "npcs&cam=7,2.3,3.4,5.6,2,0"
shot npcs2 "npcs2&cam=0,1.5,11,0,0.8,0"; shot npcs2-mort "npcs2&cam=-2.6,1.1,3.8,-2.3,0.7,0"; shot npcs2-wren "npcs2&cam=3.9,1.0,3.6,4.6,0.6,0"; shot npcs2-back "npcs2&cam=-1,1.6,-5,1,0.6,0"
shot hero "hero"; shot hero-a "hero&cam=-10,4,-4.5,-6,2.7,0.6"; shot hero-b "hero&cam=-5,4,-4.5,-1,2.9,0.6"; shot hero-c "hero&cam=1,4.2,-4.5,5,3.1,0.6"; for n in 0 1 2 3 4 5 6; do shot "hero-side$n" "hero&only=$n&cam=-5.5,2.9,0.3,0,2.6,0.5"; done
shot moves "moves"; for n in $(seq 0 24); do shot "move$n" "moves&only=$n&cam=4.6,1.9,1.6,0,0.85,0.2"; done
for n in 8 9; do shot "close$n" "moves&only=$n&cam=-3.2,1.5,-1.2,0,0.75,0.9"; done; for n in 10 11 12; do shot "close$n" "moves&only=$n&settle&cam=2.6,1.5,2.2,0,0.7,0"; shot "close1$n" "moves&only=$n&settle&cam=3.4,0.9,0.1,0,0.7,0.1"; done
shot grim "grim"; shot grim-a "grim&cam=-10.35,2.5,8.2,-10.35,1.95,0"; shot grim-b "grim&cam=-3.45,2.7,8.2,-3.45,2.15,0"; shot grim-c "grim&cam=3.45,2.6,8.2,3.45,2.0,0"; shot grim-d "grim&cam=10.35,2.4,8.2,10.35,1.75,0"; shot grim-face "grim&only=0&cam=1.1,2.75,2.1,0,2.5,0.2"; shot grim-side "grim&only=0&cam=5.5,2.0,0.3,0,1.9,0"; shot grim-back "grim&only=0&cam=-2.5,2.6,-4.6,0,1.8,0"; shot grim-front "grim&only=0&cam=0.6,2.0,5.2,0,1.85,0"
shot mantis "mantis"
# Each thing the mantis does, alone, from three sides (front, its right side, behind): look at every one of these.
for n in 0 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do shot "mantis$n-front" "mantis&only=$n&cam=1.7,1.4,4.2,0,0.85,0.2"; shot "mantis$n-side" "mantis&only=$n&cam=-4.6,1.2,0.5,0,0.85,0.3"; shot "mantis$n-back" "mantis&only=$n&cam=-2,1.8,-4,0,0.8,0.2"; done
shot stag "stag"
# Each thing the Stag Knight does, alone, from three sides: look at every one of these.
for n in 0 1 2 3 4 5 6 7 8 9 10 11; do shot "stag$n-front" "stag&only=$n&cam=2.4,1.7,5.4,0,1.0,0.4"; shot "stag$n-side" "stag&only=$n&cam=-6,1.5,0.6,0,1.0,0.5"; shot "stag$n-back" "stag&only=$n&cam=-2.6,2.2,-5.2,0,1.0,0.3"; done
shot faces "faces"
shot items "items"; shot items-a "items&cam=-3.4,3.6,5.5,-3.4,0.9,-2.6"; shot items-b "items&cam=-3.4,3.2,-0.2,-3.4,1.0,-8.4"; shot items-small "items&cam=5.6,1.3,5.2,5.6,0.55,1.2"
shot guard "guard"
# Each thing the guard does, alone, from three sides (front, his spear side, behind): look at every one of these.
for n in 0 1 2 3 4 5 6 7 8 9; do shot "guard$n-front" "guard&only=$n&cam=1.5,1.2,3.6,0,0.75,0.2"; shot "guard$n-side" "guard&only=$n&cam=-4,1.0,0.5,0,0.75,0.4"; shot "guard$n-back" "guard&only=$n&cam=-1.7,1.5,-3.4,0,0.75,0.2"; done
for p in roach toad ironback bat npcs; do shot "$p" "$p"; done
ls "$OUT"
