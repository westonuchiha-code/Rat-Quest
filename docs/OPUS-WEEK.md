# What Opus changed, 2026-11-17 to 11-19 (for Fable's review)

45 commits, every subject starting `[opus]`: `git log --grep='^\[opus\]'`. In `src/`: 43 files, about 1,950 lines in and
390 out. The suite went from 3,839 checks in 101 suites to 4,155 in 107, all passing, types clean.

**The four files where a small change breaks something far away.** `src/player/controller.ts`, `src/combat/combat.ts`
and `src/camera/followCamera.ts`: **not touched**. `src/main.ts`: touched by 12 commits, listed under the group each
belongs to below (marked *main.ts*), and a twelfth: on landing it calls `chamber.thump` (a matchbox's matches rattle). Read those diffs line by line: `git log --grep='^\[opus\]' -p -- src/main.ts`.

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
A candle gives light and drips; a reel's thread sways; a teacup steams; a marble glints. Textures on the Club's
furniture, banners, torches, shelves, pipes, chains, lamps, gauges, roots, speaker, dartboard (seven new painted
textures in `render/textures.ts`). Title boards say the old name and TEST ROOM N. Drop-in fonts and voices
(`assets/fonts`, `assets/voices`). An icon for the page.

## 4. Tools, tests and notes (no effect on the game)

`npm run test:all`: the whole suite in one build, about 95 s; it type-checks the game and the tests first (new
`tests/tsconfig.json`) and says if a suite stopped part way. `tests/chaos.ts`: 40 s of random hands in each of 38
rooms. The browser chaos drive `&chaos=N` (*main.ts*, then moved to `dev/filmDrive.ts`). Dead code out (21 exports,
three unused textures). 1,364 long `check(...)` calls in the tests laid out one condition to a line
(`scripts/tidy-checks.mjs`; whitespace only, proven by building each file before and after). START-HERE.md rewritten;
the old log and roadmap in `docs/history/`; PLAYTEST.md for the owner. While the type-check went in, three tests were
found checking less than they said, and fixed (`falls.ts` sneak, `firefly.ts` health, extra arguments).

## How to check it quickly

1. `npm run test:all`: it must end `0 fail, types clean`.
2. Look at the Hall, the Club and the Keep with `&nojoin&nogather` and without: they should look the same.
3. Play a fight in the Keep's ward and the Hollows' gallery: nothing lying about should be in the way.
4. A cutscene in the Club (the characters there are joined).
