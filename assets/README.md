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

## fonts/   a typeface

Name the file after the LINE of lettering it replaces (src/ui/fonts.ts, and ASSETS.md part 6):
- `game`  the HUD, the menus, the talk box, the shop, the photo mode;
- `title` the big headings: the title screen, the save-file screen;
- `label` small print on those screens, and the letters on the button pictures;
- `logo`  the name under the studio's mark as the game starts;
- `tools` the level builder and the Tweaks panel.
- A .woff2 (best: smallest), .woff, .ttf or .otf. It is packed into the game whole: a font of 50 KB adds 70 KB.
- It goes FIRST in its line; the line's own fonts stay after it, for any letter the file does not have.
- NOT the block letters on door signs and boards in the world: those are drawn dot by dot (render/pixelFont.ts).

## voices/   a kind of character's voice

Characters talk in made-up syllables, one or more a word (src/audio/speech.ts). Each KIND of character has a voice:
mouse, bird, pigeon, villain, turtle, fox, ant, stag, ferret, owl, rat. Most borrow one of four recordings, pitched
up or down. To give a kind its own, either:
- a FOLDER named for the kind, `voices/turtle/`, with a file for each syllable: `ah.wav`, `eh.wav`, `ee.wav`,
  `oh.wav`, `oo.wav`, `ba.wav`, `ka.wav`, `da.wav`, `fa.wav`, `ga.wav`, `ha.wav`, `ja.wav`, `la.wav`, `ma.wav`,
  `na.wav`, `pa.wav`, `ra.wav`, `sa.wav`, `sha.wav`, `cha.wav`, `ta.wav`, `wa.wav`, `ya.wav`, `za.wav`, `eek.wav`,
  `hup.wav`, `heh.wav` (any of them; one that is missing is the old voice's stand-in); or
- ONE recording named for the kind, `voices/turtle.wav`, saying those 27 in that order with a short breath between
  each. It is cut where it falls quiet. Fewer sounds than 27 and they go round again.
- Any sound type ffmpeg reads; made mono, 22 kHz, 8 bit. It plays at its own pitch: record it as that kind should sound.
