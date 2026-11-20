# What Opus changed, 2026-11-17 to 11-20 (for Fable's review)

51 commits, every subject starting `[opus]`: `git log --grep='^\[opus\]'`. In `src/`: 43 files, about 2,110 lines in and
391 out. The suite went from 3,839 checks in 101 suites to 4,169 in 107, all passing, types clean.

**The four files where a small change breaks something far away.** `src/player/controller.ts`, `src/combat/combat.ts`
and `src/camera/followCamera.ts`: **not touched**. `src/main.ts`: touched by 13 commits, listed under the group each
belongs to below (marked *main.ts*); the last ones add a few lines by the landing sound: it calls `chamber.thump`, and
plays a quiet knock or tink for each kind of odd-and-end that answered. And a few more after his update: the Music Room's floor
keys and echo puzzle (`world/musicFloor.ts`). And the things to hit (`world/strikeables.ts`): a block after the
fight's crate events that strikes them and plays what happened, two more ways for `updateGates` to lift a gate
(`levers`, `echo`), and two more words that switch on the film drive. And the hazards (`world/hazards.ts`): a belt
and a fan act on him next to the gust, before his update; a blade and spikes hurt him next to the fire, after the
fight. Read those diffs line by line: `git log --grep='^\[opus\]' -p -- src/main.ts`.

## 1. Changes to how the game PLAYS (review these first)

- **Flanking** (`enemies/director.ts`, five foes): when he is locked on to one, the scuttler, scorpion, guard, mantis and
  ant go round to his sides. Tried on the roller and ironback and taken out (it made them easier: BACKLOG A9).
- **Lifting, finished** (`world/lifting.ts`, `world/chamber.ts` stepMovers): a carried creature on its back, six new
  sounds, a crate set down on a moving platform rides it. *main.ts*: a carried flier's turn is applied after its own
  model's tick (the hornet and firefly were drawn round his chest).
- **Things lying about are solid**: pots and rocks by every test room's way in (`levels/throwables.ts`), and household
  odds and ends in 17 rooms (`levels/oddments.ts`). Both are kept out of doors, pickups, characters and fights by
  `tests/throwables.ts` and `tests/oddments.ts`. The oddments rule once failed: the Keep's pawn stood in the ant
  pikemen's ward and broke their trap. The fight tests caught it. **Worth your eye: any of these in a place you use.**
- **The Hall**: banners, benches, a bar with a step behind it (Tawny keeps it, Slink sits there), two tables.
- **Tricks**: poses and sounds for the grab and the spin. *main.ts*: the trick names on screen, added, then taken off
  at the owner's word.
- **The Spark Beetle** (`enemies/sparkBeetle.ts`, a new enemy, in the Coil Room only): the roach's hunting, but
  proof against blades the half beat before each snare, a heavy burst all round it on the snare, soft between; 4 hp.
  *main.ts*: an `addEnemy` branch (it gets the room's clock) and its name in WALKERS. `tests/sparkbeetle.ts` fights it
  with the real rat and the real combat. Note: a shield raised on the very moment parries the burst (the controller's
  rule for every blow); a shield held up does not.
- **A stand-in** (`player/standIn.ts`, the Stand-in room, Test Room 19): Bramble the hedgehog drawn in the rat's place,
  posed from what the rat's model is told. Play is untouched. *main.ts*: the object passed to `rat.update` is now a
  named `ratAnim` (same contents), and after it a block draws the stand-in and hides the rat when the level says
  `playAs: 'hedgehog'` or the address has `as=hedgehog`; the sword trail reads the stand-in's needle then. Off, it does
  nothing (it is not even made). Then THE SWAP (the owner: "when you walk in you can talk to this other character and
  switch out"): `dialog.onFinish` (ui/dialog.ts: called when a talk is read to its end, not walked away from) sets
  `swappedAs` for a character with `swap`; the talk start speaks as THE KNIGHT when swapped; the knight's double
  (`knightDouble`, `dressDouble`) stands in the character's place; all cleared on loading a level.

## 2. Changes to how things are DRAWN, meant to look the same (proven by test)

Each has a test that builds it both ways and compares what is drawn, step by step, and each was shown to fail on a
deliberately broken version. The Hall: 2,020 draw calls at the start of the week, 1,199 now; the Club 754 to 529.

- A door's frame is one mesh once it is out (`world/doorway.ts`; `tests/rooms.ts`). Its ironwork is one mesh.
- Each Toy Box flower is one mesh, not four. A chain's links have three-sided bars (a quarter fewer triangles).
- **Characters' still parts joined** (`npc/stillParts.ts`, `Npc.settle`; *main.ts* calls it for room characters only;
  `&nojoin` to compare; `tests/stillparts.ts`). A twin of each is put through idling, talk and a scene's moves. Not the
  villain, not a cutscene's own cast. **Risk:** a move a scene asks for that the twin was not shown.
- **Room dressing gathered** (`world/chamber.ts` gatherStill, `chamber.gather()`; *main.ts* calls it AFTER layering;
  `&nogather` to compare; `tests/gather.ts`, and `tests/clipsweep.ts` now gathers too). Leaves out whatever a room
  clock moves (flames, cones, swayers), anything tagged in userData (layering's lifts, an object's own moving parts),
  see-through things, and the thimble rows on a bar (they flickered into the counter). **Risk:** something animated by
  a new list in chamber.ts that `gather` is not told about: add it to the `moving` set there.
- *main.ts*: `window.__cost()` reports draw calls, triangles and the heaviest groups (dev only).

## 3. New things to look at (no effect on play beyond being solid)

20 household objects (`world/junkModels.ts`, sizes and solids `JUNK` in `world/layout.ts`), all in the level editor.
A candle gives light and drips; a reel's thread sways; a teacup steams; a marble glints; a battery sparks. Landing beside
one (`chamber.thump`) makes a matchbox's matches rattle, a die tip, a marble roll, a reel rock, tea slop, a spoon tap, a
sardine lid wobble, a pawn rock, a battery roll: each moving part is tagged `userData.moves` so the gathering leaves it alone (tests/oddments.ts). Textures on the Club's
furniture, banners, torches, shelves, pipes, chains, lamps, gauges, roots, speaker, dartboard (seven new painted
textures in `render/textures.ts`). Title boards say the old name and TEST ROOM N. Drop-in fonts and voices
(`assets/fonts`, `assets/voices`). An icon for the page.

Things to hit (`world/strikeables.ts`, `strikeModels.ts`; the Yard, Test Room 14; `tests/strikeables.ts`): a lever
the sword flips (a gate can wait for levers), a cracked wall three blows bring down, a cracked floor only a plunge
breaks. In the editor. A gate in the Music Room that its echo puzzle lifts. Nothing in the existing levels uses
them. **Worth your eye:** combat.ts is untouched, so they use their own copy of the crate's swing test (arc and
reach): if the crate's changes, theirs will not follow.

Hazards and helpers (`world/hazards.ts`, `hazardModels.ts`; the Gauntlet, Test Room 15; `tests/hazards.ts`): a
conveyor belt, a pendulum blade, a spike floor, a floor fan. In the editor. Nothing in the existing levels uses them.
**Worth your eye:** a belt and a fan move him from outside the controller (as a moving platform and a spring do); a
blade is a heavy blow (`takeHit(..., true)`), spikes a burn (`takeBurn`, so no roll helps). They act on creatures
too (`HazardFoes`): a creature struck takes it as a thrown thing (`how` 'thrown'), so each kind answers as it does to
a throw. A fan blows a creature off rather than lifting it. Crushers and flame jets (the Press, Test Room 16): a crusher is a
moving platform's `crush` motion; `stepMovers` now returns true when one came down on him, and main.ts strikes him
after the fight is resolved. Bells: a struck bell is passed to the music floor (`musicFloor.strike`, in the strike block) and its note is played
with `bellNote` instead of the chip. (Found on the way, NOT fixed: `crushCheck` in main.ts sets `events.playerResult` before
`resolveCombat`, which clears it, so being pinned against a ceiling hurts him without the hurt being shown or heard.) The Gauntlet has roach buttons, so `tests/hall.ts`'s rule "buttons
only in the practice rooms" now names it as the one other room allowed them.

New characters (the Green Room, Test Room 17; `tests/newcomers.ts`): a mole (Digger, Dot) and a hedgehog (Bramble,
Thistle), as the Club's regulars are made (`npc/patrons.ts`), each with a voice, a portrait, a place in cutscenes.
Not placed anywhere else.

## 4. Tools, tests and notes (no effect on the game)

`npm run test:all`: the whole suite in one build, about 95 s; it type-checks the game and the tests first (new
`tests/tsconfig.json`) and says if a suite stopped part way. `tests/chaos.ts`: 40 s of random hands in each of 38
rooms. The browser chaos drive `&chaos=N` (*main.ts*, then moved to `dev/filmDrive.ts`). Dead code out (21 exports,
three unused textures). 1,364 long `check(...)` calls in the tests laid out one condition to a line
(`scripts/tidy-checks.mjs`; whitespace only, proven by building each file before and after). START-HERE.md rewritten;
the old log and roadmap in `docs/history/`; PLAYTEST.md for the owner. While the type-check went in, three tests were
found checking less than they said, and fixed (`falls.ts` sneak, `firefly.ts` health, extra arguments).

**The Coil Room** (Test Room 18; KIT.md): a Tesla coil plays a boom-bap beat and zaps metal plates on it; coil keys;
the Power plant tile set (four new pictures, a theme, a door look). *main.ts*: the coil's beat played as sounds beside
the other hazards' (`coilZap` at the bass note, `coilCrack`, `coilTick`), and a coil-voiced key plays `coilZap`.
Plates shock through the same `hurt` path as the spikes (a burn).

**More parts in rooms 12-18** (2026-11-20, later): swing, blink and path platforms (the Workshop); float zone, mud and
launcher (the Gauntlet). *main.ts*: `zones.step` beside the belt and fan; the stick scaled by the mud; jump counted as
held while flying from a launcher. A timed lever and a gate that shuts again (the Yard): *main.ts* ticks the levers in
the strike block and lets `updateGates` close a `shut` gate (`chamber.closeGate`).

**The fifth robot run** (2026-11-20, PLAYTEST.md): nothing broken. One thing for you: at the peak of a jump, feet
within a step (0.35) of a ledge's top, he is inside its edge for 3-4 frames before the controller lifts him onto it
(`tests/chaos.ts` now allows 8 frames in that band, 3 deeper in).

## How to check it quickly

1. `npm run test:all`: it must end `0 fail, types clean`.
2. Look at the Hall, the Club and the Keep with `&nojoin&nogather` and without: they should look the same.
3. Play a fight in the Keep's ward and the Hollows' gallery: nothing lying about should be in the way.
4. A cutscene in the Club (the characters there are joined).
