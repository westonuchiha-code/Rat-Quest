#!/usr/bin/env bash
# Builds everything the owner tests with, into one folder (default: ../deliver, next to the project):
#   ratquest.html              the game, with the on-screen test pad (the owner tests on a phone)
#   ratquest-<place>.html      the same, opening on one place: hub, cistern, foundry, hollows, keep
#   ratquest-testroom.html     the Club with every door open (level=hub&unlockall)
#   ratquest-nopad.html        no test pad (keyboard / controller; what the Steam build is)
#   ratquest-editor.html       the level builder
#   ratquest-source.zip        the project, without node_modules and build output
# Usage: bash scripts/deliver.sh [outdir]      (then send all ten files)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mkdir -p "${1:-../deliver}" && cd "${1:-../deliver}" && pwd)"
HERE="$(pwd)"
NAME="$(basename "$HERE")"

npm run build:test >/dev/null
npm run build:editor >/dev/null
npx vite build --outDir dist-plain >/dev/null
DIST=dist-plain node scripts/make-single.mjs ratquest-nopad.html >/dev/null
rm -rf dist-plain
cp dist-single/ratquest.html dist-single/ratquest-editor.html dist-single/ratquest-nopad.html "$OUT"/

# The variants: a small script right after <head> sets the start (only if no #hash was given, except the test room).
node -e '
const fs = require("fs");
const out = process.argv[1];
const src = fs.readFileSync(out + "/ratquest.html", "utf8");
const make = (name, js) => fs.writeFileSync(out + "/" + name, src.replace("<head>", "<head><script>" + js + "</script>"));
make("ratquest-testroom.html", "location.hash=\"level=hub&unlockall\"");
for (const l of ["hub", "cistern", "foundry", "hollows", "keep"]) make("ratquest-" + l + ".html", "if(!location.hash)location.hash=\"level=" + l + "\"");
' "$OUT"

rm -f "$OUT/ratquest-source.zip"
(cd .. && zip -qr "$OUT/ratquest-source.zip" "$NAME" -x "$NAME/.git/*" "$NAME/deliver/*" "$NAME/node_modules/*" "$NAME/.testdist/*" "$NAME/.flaky/*" "$NAME/.sheet/*" "$NAME/dist/*" "$NAME/dist-editor/*" "$NAME/dist-plain/*")
ls -la "$OUT" | awk 'NR > 1 { print $5, $9 }'
