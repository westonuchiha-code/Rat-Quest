# BACKLOG: what is left, hardest first (written 2026-11-17)

**Why this file:** the owner is nearly out of Fable for the week and will switch to Opus 5.5. His words: "organize all
the things we still have to do and the things we need to fix and the things we need to check on in order from hardest
to least hardest so that you can get most of the hardest stuff out of the way with fable ... everything else will be
handled by Opus and Fable can look over all of Opus's changes next week."

**How to use it.** Work from the top. Part A is for Fable while there is any left. Part B is for Opus. Part C is what
only the owner, or a hand on the controls, can settle. Part D is what Fable looks over next week. When an item is
done, move it to "Done" at the bottom with the commit; do not delete it. Read START-HERE.md first, always
("THE VISION CHANGED" is the part that governs all of this).

**What makes a thing HARD here:** it needs a design decision nobody has made; or it touches how he moves or fights
(the controller, combat, the camera), where a small change breaks something far away; or it must be measured at 60,
30 and 20 frames a second; or it is new geometry that the ride, the camera and the collision must all agree on.
**What makes a thing easy:** the pattern exists already and a test will say when it is right.

---

## PART A. FOR FABLE FIRST (hardest at the top)

**A1. Each waking biome its own feel, starting with the Sewers (Dark Souls).**
His words: "you're blocking, you're parrying, you're having more difficult fights, you're moving slower through the
level". The table exists (`src/data/feel.ts`) and holds only the dream's differences. What is wanted is a `sewers`
feel: slower, heavier movement; fights that punish; guard and parry mattering more. HARD because it is a design of
combat feel with no numbers given, it must not make the game easier, and every creature's test assumes today's
numbers. Do it as multipliers in the table (run, recover times, his damage, creatures' damage and health), set on the
Sewers (Test Room 3 and 3B to 3E), nothing global. Then the Mario room (Test Room 8) and the Sonic room (Test Room 5)
the same way. Show him one room, in a film, before doing the rest.

**A2. More to ride in the dream: a bowl, a spine, banked turns, launchers, loops of light rail.**
He asked for a playground. Each is new geometry the ride, the lip launch (`Box.vert`), the camera and the solids must
agree on. HARD: the half pipe alone took a day of fixes (walls taken as walls, a frame-rate bug, the camera). Rules
learned: build solids through `buildChamber` in tests; test at 60, 30, 24 and 20 fps; film it with the real follow
camera; a new mark on a box must be copied in `chamber.ts`.

**A3. The camera's known weak places.**
(a) With the view on the wall's side at the top of a pipe wall, it looks down over the deck's edge and the deck
fills the bottom third. (b) Knocked back against a wall (seen in the throne room in the first seconds), it goes
overhead and shows only floor. (c) "The camera still loses him down the chute" (the Long Drop's fall). (d) The
shield-follow slider (`camera.rideFollowRate`, 0) wants his verdict, and if he likes it, tuning. HARD: every camera
change has moved something else; `tests/camera.ts` (42) must stay green.

**A4. A stun long enough to grab the roach and the toad.**
They cannot be picked up: their flinch is a third of a second. A real stun (a plunge landing near them? a perfect
guard?) is a new state in two creatures' minds and changes how they fight. HARD because of "don't make the game
easier": the stun must be earned. Then add them to `DOWN_STATES` (`src/world/lifting.ts`).

**A5. The Sonic room: the Long Drop as a railway with bats to hit while grinding.**
His words: "you're grinding down the railway on your shield and you're smacking bats out of the air with your sword
while you're grinding down the rail". The sword already swings on the shield. Wanted: bats placed along the rails at
sword height, timed to the ride; the hit not stopping him. HARD: placing against a measured ride, and creatures that
must be where a moving rider is.

**A6. Model files as creatures and props (drop-in).**
`assets/` takes pictures, sounds and songs. A model is code. To take a file means a loader (glTF) inside a one-file
game, a way to give it the PS1 material, and a mapping from the game's poses to the file's. HARD and large; do not
start it unless he asks for it by name.

**A7. The glitch: the dream going wrong.**
Recorded early and never built: rogue robot voices, modem noise, "Does Not Compute". Mostly design. The tunes
`glitch` and `rogue` exist, not in the game.

**A8. An editor for cutscenes inside the game.**
The cutscene system is data (`src/cutscene/scenes.ts`); there is no way to make one without writing code. Large.

**A9. The others flank when he is locked on to one.**
Noted NOT DONE when lock-on was built: creatures he is not locked on to should move to his sides; the locked one
should use its bigger moves. Touches the director (`src/enemies/director.ts`) and every mind.

**A10. Stronger in the dream.**
His words: "you're kind of way floatier and stronger in this world so you almost feel like a superhero". A damage
multiplier in the dream's line of the table, applied where his sword's damage is worked out
(`src/combat/combat.ts`, `player.gear.damage`), and to a thrown thing. Small, but it is balance: Fable sets the
number and films a fight; after that it is a slider.

---

## PART B. FOR OPUS (well marked out; hardest at the top)

**B1. Things to throw in the other rooms.** Pots, rocks and crates only stand in the practice rooms. Put a few in
each test room where there is floor for them (`potBox`, `rockBox` in `src/world/layout.ts`; append a `null` to
`crateContents` for each). The room's own tests and `tests/clipsweep.ts` say when one is in the way.

**B2. The level editor does not know the new things.** Pots and rocks; the spawn button (`plates[].spawn`); the
Club's tables and bar (noted long ago). Add them to the kit (`src/levels/custom.ts`) and the palette
(`src/ui/builder.ts`), following `crate` and `plate`.

**B3. Lifting: finish.** (a) A pose for a creature being carried (it stands upright on air). (b) Sounds of its own
(it borrows a plank, a whoosh, a landing, pebbles). (c) Films, for the record, of: a rock thrown and thrown again;
each of the other five creatures picked up (only the bat was seen); an iron-bound crate. (d) Check by test: lifting
a crate that stands on a moving platform; carrying something through a door; a thrown crate meeting a character.

**B4. Tricks polish.** Proper poses for the spin and the grab, a sound for each, the trick's name shown as he lands.

**B5. Drop-in for voices and font files.** Voices: a folder per character kind, cut into syllables as
`scripts/make-recorded.py` does. Fonts: a `.woff2` in `assets/fonts/` becomes an `@font-face` in `FONT_FACES`
(`src/ui/fonts.ts`), packed as base64.

**B6. Old names still on boards.** Sign boards inside rooms still say "THE LONG DROP", "THE MILKY WAY", "THE PIPE";
wedge hints and characters' lines name the Club and the worlds. Decide with him whether boards say "TEST ROOM 5".

**B7. The Hall and the practice rooms are plainly dressed.** Banners, benches, something at the east end beside
Dave. The south wall's east end has no doors: room for more. The Club's own doors still ask for Golden Wedges.

**B8. The Foundry in the Forge's look.** Waiting on his yes to the Forge (Test Room 7). Then: the furnace's fire and
its pour should burn him (noted NOT DONE), and the Forge wants sounds.

**B9. Music.** Fifteen tunes are written and not in the game (ASSETS.md, part 8). Put one in only after he has
heard it and said yes. `assets/music/<room id>.mp3` is the quick way to try one in a room.

**B11. Custom difficulty by sliders (his note of 2026-11-17: NOT yet asked for; do not start it unasked).** No difficulty
settings, ever. Players get the sliders instead. When he asks: a player's version of the Tweaks panel, a way back to
"as designed", a mark on a save whose numbers were changed. His words are in START-HERE.md.

**B10. Small known things.** A 404 for the page's icon in the browser's log (no `favicon`). The Hall's HUD has no
count of anything. The Toy Box's wall can be cleared by a double jump from a deck (harmless: a fall costs nothing).
`ASSETS.md` must be rewritten (`npm run assets`) whenever anything is added: the test will say so.

---

## PART C. ONLY HE, OR A HAND ON THE CONTROLS, CAN SETTLE

Nobody has played any of this week's work by hand. Each of these is a question for him, in the order it matters:
1. The dream on foot: are run x1.25, jump x1.1, gravity x0.75 right? (Tweaks, "The dream".)
2. Lifting: is STOW (triangle) the right button? Is a crate too big over his head? Is 2 the right harm? (Tweaks, "Lifting".)
3. The half-pipe camera; and whether he wants the view to follow behind him on the shield (Tweaks, "Camera").
4. The Hall: the door names past the first four are Claude's placeholders.
5. Sound, all of it: Claude cannot hear. The shield's scrape, the music's level, every effect made this week.
6. The tuck's strength, the launch height off a pipe's lip, the buttons for tricks.
7. A long song dropped into `assets/music`: does the game still load quickly on his phone?
8. Thirty frames a second on his phone: the riding was tested at 30, 24 and 20, but not on the phone itself.

---

## PART D. FOR FABLE TO LOOK OVER NEXT WEEK

Every commit made by Opus: `git log --author` will not tell them apart, so **Opus: start each commit's subject with
`[opus]`**. Fable then reads `git log --grep='^\[opus\]'` and, for each: runs the full suite; reads the diff of
`src/player/controller.ts`, `src/combat/combat.ts`, `src/camera/followCamera.ts` and `src/main.ts` line by line (the
four files where a small change breaks something far away); films anything that moves; checks that no test was
weakened, skipped or deleted to get to green; checks `ASSETS.md` and the notes were kept.

---

## THE BUG SWEEP OF 2026-11-17 (what was looked at, and what it found)

- **Every level opened in the built game** (51: the Hall, 25 numbered rooms, 4 boss rooms, 11 practice rooms, 13 old
  levels), a picture of each looked at: no errors, none broken.
- **Every door in the Hall walked through** (26): each leads to the room its sign names.
  **FOUND AND FIXED:** in a room that asks nothing of him (every practice room), the line in the corner still said
  "The Hall". It says the room's own name now.
- **All eight cutscenes** opened part-way through: all play, nobody missing.
- **The level editor's tour** (open a sample, select, measure, place, undo, redo, paste, the menus, the problems
  list): no errors. It does not know pots, rocks or spawn buttons (B2).
- **The full test suite:** 3,839 pass, 0 fail, 101 suites.
- Not swept: anything that needs a hand on the controls (Part C); sound.

---

## Done
(Move items here, with the commit.)
- **A1 (first part): the Sewers' feel.** Run 0.88, his blows 0.67, a blow on him costs double. `TUNING.sewers`. STILL OPEN under A1: the Mario room (Test Room 8) and the Sonic room (Test Room 5); and his verdict on the numbers.
- **A10: stronger in the dream.** His blows do 1.5 there (`TUNING.dream.dealt`). His verdict wanted.
- **A2 (first part): a bowl and a spine in the Toy Box.** STILL OPEN under A2: banked turns (need a new kind of solid: ramps lie along x or z only), a launcher, loops of light rail, round corners for the bowl.
