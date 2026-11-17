# Drop-in files

Put a file in one of these folders, run `npm run assets`, and the game uses it instead of what it made itself.
Take the file out and run it again, and the game goes back to its own. No code is changed either way.
(`bash scripts/deliver.sh` runs it for you before it builds.)

The game is one .html file, so a dropped file is packed INSIDE the game (`src/assets/dropped.ts`, written by the
script: do not edit it). Big files make a big game: a three minute song adds about two megabytes.

## textures/   a picture for a surface

Name the file after the texture it replaces: `brick.png`, `wetCobbles.png`, `royalCarpet.jpg`.
The 101 names are listed in ASSETS.md, part 7 (and which look uses which).
- Any picture type ffmpeg reads (png, jpg, webp, gif, bmp).
- It should be SQUARE and it tiles: its right edge meets its left, its top meets its bottom.
- Square and no bigger than 256 a side: used as it is, dot for dot. Anything else is squeezed to 128 square.
- The game's own textures are 16 to 64 dots a side. A small picture keeps the chunky look.

## sounds/   a recording for a sound effect

Name the file after the effect it replaces: `jump.wav`, `hit.mp3`, `doorOpen.m4a`.
The 165 names are listed in ASSETS.md, part 8.
- Any sound type ffmpeg reads. It is made mono, 22 kHz, 8 bit (the game's own grain).
- The whole file is used: trim it first. Keep effects short (under two seconds).

## music/   a song

Name the file after WHERE it plays:
- a room's id, for that room only: `cistern.mp3` (Test Room 3), `toybox.mp3` (Test Room 1), `hall.mp3` (the Hall).
  Room ids are in ASSETS.md, part 1.
- a kind of music, for every room that asks for that kind: `drift`, `pump`, `groove`, `echo`, `march`, `dream`.
- a jingle: `wedge` (a Golden Wedge), `defeat` (he is beaten).
A room's own file wins over its kind's.
- Any sound type ffmpeg reads. It is played round and round: a song made to loop will loop without a seam.
