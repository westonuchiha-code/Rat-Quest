# What Opus did, 2026-11-17 to 11-20: THE HANDOFF TO FABLE

Fable: this is the page to start from. Opus had the project from 2026-11-17 to the evening of 11-20 while your week's
budget was spent. **82 commits, every subject starting `[opus]`**: `git log --grep='^\[opus\]'`. In `src/`: 75 files,
about 8,900 lines in and 440 out (30 files new). In `tests/`: the suite went from 3,839 checks in 101 suites to
**4,502 checks in 117 suites, all passing, types clean** (`npm run test:all`, about 110 s).

**The four files where a small change breaks something far away.** `src/player/controller.ts`, `src/combat/combat.ts`
and `src/camera/followCamera.ts`: **NOT TOUCHED, not once** (the owner's rule; every new character has its own
controller instead). `src/main.ts`: touched by 29 commits, each listed below where it belongs (marked *main.ts*).
Read those diffs line by line: `git log --grep='^\[opus\]' -p -- src/main.ts`.

## Read in this order
1. **This page**, top to bottom: what changed, by risk (sections 1 to 4), then everything not fixed or worth your eye
   in ONE list (section 5), then what waits on the owner (section 6), then his standing rules (section 7).
2. **`docs/ROOMS.md`**: the eight test rooms Opus built (12 to 19): what is in each, its file, its numbers, its tests.
3. **`docs/KIT.md`**: every new part (platforms, hazards, things to hit, music floor, the coil, the Spark Beetle, the
   new characters, and the table of the thirteen PLAYABLE CHARACTERS): what it is, its numbers, its editor name.
4. **`docs/ENEMY-IDEAS.md`**: seven enemy designs, not built (the Spark Beetle, the eighth, is).
5. **`BACKLOG.md`** (Part B and Done) and **`PLAYTEST.md`** (what only the owner's hands and ears can settle).

## The week in one screen (by day)
- **11-17/18: the list you left (BACKLOG Part B).** Flanking for five foes; lifting finished; pots and rocks in every
  room; the editor knows them; tricks' poses; drop-in fonts and voices; title boards; the Hall dressed; the test
  runner (`npm run test:all`, 12 minutes to under 2); START-HERE rewritten short; the film drives out of main.ts.
- **11-18/19: cost and polish.** Textures on the Club's props; a draw-call readout (`window.__cost()`); door frames,
  characters' still parts and room dressing JOINED into fewer meshes (the Hall 2,020 draw calls to 1,199; proven the
  same picture by tests); tests type-checked; dead code out; a robot run (`tests/chaos.ts`) in every test run.
- **11-19/20: twenty household odds and ends** (candle, cotton reel, matchbox, die, marble, teacup ...) at a rat's
  size, in the editor and in 17 rooms, each reacting when he lands beside it.
- **11-20: the KIT and Test Rooms 12-18** (the owner: make parts for Fable to build levels with; do not put them in
  the real levels): the Workshop (ten kinds of moving platform), the Music Room (floor piano, echo puzzles, bells), the
  Yard (levers, timed lever, cracked wall and floor), the Gauntlet (belts, blades, spikes, fans, float zone, mud,
  launcher), the Press (crushers, flame jets), the Green Room (a mole and a hedgehog, two of each), the Coil Room (a
  Tesla coil on a hip-hop beat, the Power plant tile set, the SPARK BEETLE enemy).
- **11-20, last: EVERY CHARACTER PLAYABLE** (Test Room 19, the Stand-in). The owner: give each character "its own
  unique little play style ... their own unique way of getting around ... just prototypes", and one who casts magic
  that is "unique ... to do with this world or with the character". Thirteen controllers, one per look (KIT.md has
  the table): Bramble rolls and spits, Thistle pogos, Digger digs under walls, Dot reels up on yarn, Pebble's shell
  slides and dives, Mo is immovable and walks the bottom, Vix pounces, Ash shadow-dashes, Slink climbs walls, Biscuit
  war-dances, Tawny glides and dives, Snow hovers, and JINX's magic is BAD LUCK: her hex makes a household thing fall
  on what it hits, and she blinks to her mark. **How this went** (so you know what the owner meant): first Opus put the
  hedgehog on the knight's moves (wrong: "he's not a knight, he's a hedgehog"), then copied the knight's motion onto
  him (wrong again: "they're totally different character body types ... they wouldn't move the same"). What the owner wants
  is each character MOVING and PLAYING its own way, as fully as the knight does his.

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
  Then the hedgehog's movement was made his own (the owner: different bodies move differently): standIn.ts only, no
  knight's code read into it. `rig.spines` added to the small regulars (npc/patrons.ts) so his spines can bristle.
  Then (the owner: "he's not a knight, he's a hedgehog ... make him roll around ... maybe he can spit") HIS OWN
  CONTROLLER, `player/hedgehogController.ts`: walk, hop, ROLL into a ball (momentum, downhill, bounces, low gaps,
  rams), SPIT, a spine burst. *main.ts*: when he is played, `hog.update` moves him; `player.update` is stepped with
  nothing pressed (health, hits, death) and put where he is; his hits are fed to `events` after `resolveCombat`; the
  lift is off for him; the stand-in is drawn from `hog`. `dev/filmDrive.ts`: `&autoball`.
  Then EVERY CHARACTER (`player/critters/`): thirteen controllers of their own. *main.ts*: the hedgehog code became
  general (`critter`, `playLook()`: by the swap, by the level, or `#as=<name>`); a character who is `untouchable` just
  now is left out of `resolveCombat`'s enemies; one who is `steadfast` is not moved by being hit; the swap goes from
  one character straight to another. `NpcSpec.swap.as` is any look. `dev/filmDrive.ts`: `&autopad`.

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

## 5. EVERYTHING NOT FIXED, OR WORTH YOUR EYE (in one place)

**FABLE'S REVIEW, 2026-11-22 (first pass).** The suite re-run: 4,502 pass. The three knight's files: no change in the
whole range. No test deleted; no existing test left with fewer checks. Read: main.ts's changes. Found and FIXED: (1) a
played character undid whatever else moved the knight (he is copied over the knight each step): a belt, a circling
platform, a fan, a launcher, the put-back after a fall, coming back from being beaten: the join now passes on what was
done to the knight's place and speed since the last step (`critterAt`, `critterVel`); (2) the `crushCheck` hurt that
was never shown (kept in `pinnedHit` till after `resolveCombat`). JUDGED AND LEFT: the parry of the Spark Beetle's
burst (the game's rule everywhere, and hard to do), and the 3-4 frames inside a ledge's edge at the top of a jump (the
controller's ledge forgiveness, as designed).
**Second pass, the same day: the played characters under random hands** (`tests/critterchaos.ts`, now in the suite: two
minutes of random buttons, three times, for each of the thirteen, in their room). It found four of them getting OUT OF
THE ROOM, all fixed: (3) the shared wall rule (critters/base.ts and hedgehogController.ts `moveAxis`) backed a body
out of ANY solid it overlapped along the way it was moving, so one already within a wall along that way came out of
its far side: now only a solid the move ran him into stops it, and one he is found within puts him out by its nearest
side (`unstick`; a slope lifts him onto its surface instead); (4) Dot cast her yarn again in the air and went up the
room's wall: from the ground only now; (5) Jinx's mark and Dot's yarn took the top of a thin wall (the room's own) for
a place to stand: a top must be 1.5 wide both ways (`Critter.standable`). NOT YET READ line by line: the rooms' and
parts' own files (hazards, platforms, things to hit).

**Bugs found and left (yours to judge):**
- (FIXED by Fable, 11-22) `crushCheck` in main.ts set `events.playerResult` before `resolveCombat` cleared it: pinned
  against a ceiling, he was hurt without the hurt being shown or heard.
- At the top of a jump, feet just under a ledge's top, he passes into its edge for 3 or 4 frames before the controller
  lifts him onto it (its leniency for a ledge just made). `tests/chaos.ts` allows 8 frames in that band.
- A shield raised on the very moment PARRIES the Spark Beetle's burst (the controller's rule for every blow; a shield
  held up does not).

**Built around the four files, so they will not follow a change in them:**
- Things to hit (`world/strikeables.ts`) use their own copy of the crate's swing test (arc and reach).
- Belts, fans, the float zone, mud and the launcher move him from outside the controller (as a moving platform does);
  jump is counted as held while a launcher throws him (the controller's short-hop rule halved the rise).
- THE PLAYED CHARACTERS (main.ts): while one is played, the knight's controller is still stepped every frame with
  nothing pressed, only for his health, being hit (knock-back) and being beaten, and is then put where the character
  is. So the knight's own collision box (1.1 tall) still runs under every character and is overwritten each frame;
  enemies aim at the same place; a character who is `untouchable` (dug in, in a shell, dashing, dancing) is simply
  left out of `resolveCombat`'s enemies that frame. It works for a test room; a real second player would want this
  done properly (a controller interface the fight and the camera both take).

**Prototypes, by the owner's word, and what they lack:**
- The played characters: but for the two hedgehogs (posed limb by limb, `player/standIn.ts`), they are their Club
  model moved as a whole (lean, rock, squash, spin, tumble): legs and arms are not posed. No sounds of their own (they
  borrow the game's), no hit flash, none in a real level. Their numbers are tables at the top of each file.
- The knight left standing when you swap (`knightDouble`) is not solid.
- The Spark Beetle is in the Coil Room only. Seven other enemy designs are only designs (ENEMY-IDEAS.md).

**Unheard (Claude cannot hear):** every sound made or used this week: the odds and ends' knocks and tinks, the lever,
stone, spikes, flame roar, bells, the coil's zap, crack and tick, the characters' borrowed sounds.

## 6. WAITING ON THE OWNER
- The owner's hands on everything in Test Rooms 12-19 (PLAYTEST.md says where a number may want moving).
- Which of the thirteen characters' ways are worth building on, and which to drop. The owner's last words on them: "a good
  start, definitely needs a lot of work, but it's a good prototype".
- The Forge (Test Room 7): a yes means the Foundry is re-dressed to match. Fifteen tunes wait to be heard.

## 7. THE OWNER'S STANDING RULES (as given this week)
- **No difficulty settings, ever; do not make the game easier.** No pop-ups.
- **Do not touch** `controller.ts`, `combat.ts`, `followCamera.ts` (the knight's code); keep main.ts changes small and
  listed here.
- **Do not place new parts in the real levels**: build kit parts and show them in rooms of their own (that is Fable's
  job when it returns), with notes in KIT.md.
- Each turn: deliver the twelve files (`bash scripts/deliver.sh deliver`), with films or pictures; replies in plain
  language: what changed, what was tested, what was not, then a numbered "what's next". Say so whenever sound is
  involved (Claude cannot hear).
- Commits on `claude/new-session-0uiaps`, subject starting `[opus]` (yours: no prefix).

## How to check it quickly

1. `npm run test:all`: it must end `0 fail, types clean`.
2. Look at the Hall, the Club and the Keep with `&nojoin&nogather` and without: they should look the same.
3. Play a fight in the Keep's ward and the Hollows' gallery: nothing lying about should be in the way.
4. A cutscene in the Club (the characters there are joined).
5. Test Rooms 12-19 from the Hall; in the Stand-in (19), talk to anyone in the line-up and play them. `#as=jinx` (any
   character's name) plays one anywhere. To film one's move: `&autopad=` (dev/filmDrive.ts).
