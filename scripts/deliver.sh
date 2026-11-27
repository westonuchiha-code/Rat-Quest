#!/usr/bin/env bash
# Builds everything the owner tests with, into one folder (default: ../deliver, next to the project):
#   ratquest.html          THE GAME, with the on-screen test pad (the owner tests on a phone). Opens on the title.
#   ratquest-nopad.html    THE GAME, no test pad: for testing with a controller on the TV (the owner's PC launcher
#                          opens dist-single/ratquest-nopad.html: keep the name). TEST HALL and the tools on its title.
#   ratquest-final.html    THE FINAL BUILD, to ship: the game only, no test area, no tools. Made every time; sent
#                          only when asked for.
#   ratquest-<id>.html     only when asked for: one place by itself (level ids after the folder)
#   ALL=1 also keeps ratquest-editor.html and writes ratquest-source.zip
# Usage: bash scripts/deliver.sh [outdir] [level id ...]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(mkdir -p "${1:-../deliver}" && cd "${1:-../deliver}" && pwd)"
HERE="$(pwd)"
NAME="$(basename "$HERE")"

# Whatever has been dropped into assets/ is packed into the game first (assets/README.md).
node scripts/assets/pack.mjs >/dev/null
npm run build:test >/dev/null
npm run build:editor >/dev/null
npx vite build --outDir dist-plain >/dev/null
DIST=dist-plain node scripts/make-single.mjs ratquest-nopad.html >/dev/null
rm -rf dist-plain
# THE FINAL BUILD (the owner, 2026-11-27): the game to ship, with no test area and no tools. Made every time and
# kept beside the others; not sent unless he asks for it.
npx vite build --mode final --outDir dist-final >/dev/null
DIST=dist-final node scripts/make-single.mjs ratquest-final.html >/dev/null
rm -rf dist-final
cp dist-single/ratquest.html dist-single/ratquest-editor.html dist-single/ratquest-nopad.html dist-single/ratquest-final.html "$OUT"/

# THE SMOKE CHECK (scripts/smoke.mjs): the file just built is opened in a headless browser and played a little: the
# knight must walk, jump and swing, a played character must move, no page may throw. A build that fails is not sent.
# (2026-11-20 to 22, every build sent had a knight who could not move, and nothing said so.)
if ! node scripts/smoke.mjs "$OUT/ratquest.html"; then
  echo "deliver: THE SMOKE CHECK FAILED. Do not send these files." >&2
  exit 1
fi

# What is sent every time (the owner, 2026-11-25): the game with the pad and the game without. Nothing else.
# Any further arguments are level ids: each gets a file that opens there (bash scripts/deliver.sh deliver keep garden).
shift || true
node -e '
const fs = require("fs");
const [out, ...ids] = process.argv.slice(1);
const src = fs.readFileSync(out + "/ratquest.html", "utf8");
const make = (name, js) => fs.writeFileSync(out + "/" + name, src.replace("<head>", "<head><script>" + js + "</script>"));
for (const l of ids) make("ratquest-" + l + ".html", "location.hash=\"level=" + l + "\"");
' "$OUT" "$@"

# The level builder and the project itself: only when asked for (ALL=1).
if [ "${ALL:-}" = "1" ]; then
  rm -f "$OUT/ratquest-source.zip"
  (cd .. && zip -qr "$OUT/ratquest-source.zip" "$NAME" -x "$NAME/.git/*" "$NAME/deliver/*" "$NAME/node_modules/*" "$NAME/.testdist/*" "$NAME/.flaky/*" "$NAME/.sheet/*" "$NAME/.sheet-shots/*" "$NAME/dist*/*" "$NAME/.tmpw/*" "$NAME/tests/.tmp/*")
else
  rm -f "$OUT/ratquest-editor.html"
fi
ls -la "$OUT" | awk 'NR > 1 { print $5, $9 }'
