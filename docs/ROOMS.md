# Test Rooms 12-19: a guide (2026-11-20)

For Fable. These seven rooms were built while you were away. **None of them is a level.** Each is a shelf of parts,
shown doing what it is for, so you can see a part work before you put it in a real level. Nothing here has been
placed in the real levels (the owner's word: that is your job).

How to reach them:
- **In the game:** the Hall, one door each (`src/levels/testRooms.ts`).
- **Straight in:** add `#level=<id>` to the address. For example, `#level=coilroom`.

Each part has a section in `docs/KIT.md`: what it is, its numbers, and its editor name. `docs/OPUS-WEEK.md` lists every
change to how the game plays, for review.

Each room's file starts with a comment saying what is where. Every number that places or tunes a part is an
`export const` at the top of the room's file. The tests read the same numbers, so if you move a part, its test follows
it.

## The rooms at a glance

| # | id | file | what it shows | its tests |
|---|----|------|---------------|-----------|
| 12 | `workshop` | `levels/workshop.ts` | moving platforms, all ten motions | `platforms` |
| 13 | `musicroom` | `levels/musicroom.ts` | floor piano, echo puzzle, bells | `musicfloor` |
| 14 | `breakyard` | `levels/breakyard.ts` | levers, a timed lever, cracked wall and floor | `strikeables` |
| 15 | `gauntlet` | `levels/gauntlet.ts` | belts, blades, spikes, fans, float, mud, launcher | `hazards` |
| 16 | `press` | `levels/press.ts` | crushers, flame jets | `press` |
| 17 | `greenroom` | `levels/greenroom.ts` | two new characters, the mole and the hedgehog | `newcomers` |
| 18 | `coilroom` | `levels/coilroom.ts` | the Tesla coil on a beat, zap plates, coil keys, the Spark Beetle | `coilroom`, `sparkbeetle` |
| 19 | `standin` | `levels/standinroom.ts` | talk to Bramble the hedgehog and swap: be him on the rat's controls, on a course | `standin` |

To run one room's tests: `node scripts/test-all.mjs platforms`. Every suite: `npm run test:all`.

---

## 12. The Workshop: moving platforms

**What's in it.**
- Along the back wall, a walkway (`WALK`). Six bays get him up to it: glide, ride, circle, sink, crumble and spring.
- In the front half (`FRONT`), three more, each between ledges with a crumb on the far one:
  - **swing:** hung on chains.
  - **blink:** four platforms that come and go out of step.
  - **path:** a loop of waypoints.
- Crush is shown in the Press (room 16).

**The code.**
- `world/platforms.ts`: one function per motion (`swingAt`, `blinkAt`, `pathAt`, `crushAt`), and `PLATFORM` for the
  numbers they share.
- `world/chamber.ts` `stepMovers`: moves the platforms and him with them.

**In the editor.** A lift piece, with a motion picked from its list.

**To add a bay.** Push one `{ x, lines, pieces }` onto `BAYS`.

## 13. The Music Room: notes underfoot

**What's in it.**
- **Floor piano** (`PIANO`): an octave from middle C, on the sound chip.
- **Echo puzzle** (`ECHO_AT`): four pads and a start pad. It plays a tune, he plays it back. There are three rounds,
  and solving it opens the east nook (`PRIZE`).
- **Bell echo** (`BELLS`): the same puzzle, but on bells struck with the sword. It opens the west nook (`BELL_PRIZE`).

**The code.** `world/musicFloor.ts`:
- `padUnder`: which pad he is standing on.
- `strike(pad)`: a bell rung.
- A pad or bell in no puzzle only sounds.

**In the editor.** The Music group: Floor key, Chime and Bell, with selects for NOTES, PUZZLES and ORDERS. A gate's
`opens: 'echo'` waits for a puzzle.

**Sound.** I can't hear, so every sound here is unheard by me. The tests check which notes play and when, not how
they sound.

## 14. The Yard: things to hit

**What's in it.**
- One lever.
- Two levers that must both be thrown.
- A cracked wall: three blows, or two with a heavy blade.
- A cracked floor: plunge through it into the cellar.
- **RACE** (`RACE`): a timed lever holds a gate up for 4 seconds, and he has to get through before it drops.

**The code.**
- `world/strikeables.ts`: `strikeThings`, `leversOn`, and `tickLevers` for the timer.
- `world/strikeModels.ts`: how each one looks. A timed lever's lamp blinks amber while it runs.
- `main.ts`: the strike block, and `updateGates`.

**In the editor.** Lever (with its `timer`), Crack wall, Crack floor. A gate's `opens: 'levers'` waits for them.

## 15. The Gauntlet: hazards and helpers

**What's in it.**
- Along the back wall (`GAUNTLET`):
  - belts
  - two pendulum blades (`BLADES`)
  - spikes in a rising row (`SPIKE_ROW`)
  - fans (`FANS`): one lifts, one pulses
- In the front half (`PHYS`):
  - **float:** a column where gravity is low.
  - **mud:** slows his stride.
  - **launcher:** a cannon pad.
- A button in front of each back bay drops a roach in (`ROACH_BUTTONS`), so you can watch the hazard act on a
  creature.

**The code.**
- `world/hazards.ts`:
  - the specs
  - `hurt`: what touching one does to him
  - `HazardFoes`: what it does to creatures
  - `sounds`
  - `class Zones` for float, mud and the launcher; `step` returns `{ stride, floating, launched }`
- `world/hazardModels.ts`: how each one looks.

**Note.** While he flies off a launcher, the jump counts as held (`zones.flying`). Without that, the controller's
short-hop rule halved his rise.

## 16. The Press: crushers and flame jets

**What's in it.**
- A corridor under three crushers, out of step (`CRUSHER`).
- A crusher to ride up to a ledge (`RIDE_LEDGE`).
- Flame jets in the walls (`WALL_JETS`) and in the floor (`FLOOR_JETS`).

**The code.**
- A crusher is a platform with the `crush` motion. `stepMovers` reports a crush, and a crushed rat is put out at once
  along the free side.
- A flame jet is the `flamejet` hazard. Fireproof gear skips its burn.

**Known.** `crushCheck` in `main.ts` sets the player's result before `resolveCombat` clears it. This is in
OPUS-WEEK and not fixed.

## 17. The Green Room: new characters

**What's in it.**
- Digger and Dot (moles), at cards (`GREEN.cards`).
- Bramble (hedgehog), behind a counter, standing on a `STEP`.
- Thistle (hedgehog), on a stool.

**The code.**
- `npc/patrons.ts`: `class Mole` and `class Hedgehog`, sharing `class Small`. The hedgehog's coat is one mesh, built by
  `spineCoat`.
- Each also has a voice (`audio/speech.ts`), a portrait (`npc/portrait.ts`) and a cutscene puppet (`cutscene/stage.ts`).

**To use one.** Any level's `NpcSpec`, with `kind: 'mole'` or `kind: 'hedgehog'`.

## 18. The Coil Room: a Tesla coil on a beat

**What's in it.**
- A tall shaft in the new POWER PLANT tile set (theme `power`).
- A great coil (`BIG_COIL`) plays a boom-bap beat at 90 bpm (`COIL` in `world/teslaCoil.ts`):
  - On every kick it zaps the BLUE plates.
  - On every snare it zaps the VIOLET ones.
  - GREY plates are safe.
- Eighteen plates spiral up (`SPIRAL`, `spiralPlates()`) to a balcony (`BALCONY`).
- By the way in, the coil keys (`COIL_KEYS`): an octave that sings through a small coil.
- Two **Spark Beetles** on the floor (`BEETLES`).

**The code.**
- `world/teslaCoil.ts`:
  - `laneState(lane, t)`: is a lane `warn` (0..1, the glow before a hit) or `live`?
  - `hitsBetween`: the hits that fell inside a stretch of time.
- Change the beat in `COIL`. Every plate, the beetles and the sounds follow it.

**The Spark Beetle** (`enemies/sparkBeetle.ts`):
- It hunts with the roach's code.
- Blades glance off it in the half beat before each snare.
- On the snare it bursts all round it: a heavy blow, which a held shield does not stop.
- It is soft the rest of the bar, and has 4 hp. Its numbers are in `SPARK`.
- Seven more enemy designs, each built round one of these rooms' parts, are in `docs/ENEMY-IDEAS.md`.

## 19. The Stand-in: another character on the rat's controls

**What's in it.** You walk in as the knight. Bramble the hedgehog waits by the way in (`BRAMBLE`): talk to him to the
end and you swap, you are him and the knight stands in his place; talk to the knight to swap back. And a course with
one of each move:
- steps up to a shelf (`STEPS`), and two slopes off it (`SLOPES`): a steep one he slides down and a gentle one to ride;
- a block too high to jump onto, to hang from (`HANG`);
- a pool (`POOL`), two roaches that come back, and pots.

**The code.** `player/standIn.ts` turns each thing the rat's model is told into a hedgehog pose: a needle for a
sword, a bottle cap for a shield and a board, and a ball of spines for every roll, flip and slide. See KIT.md for the
table of moves. Not a plan for the game (the owner's word): a try at how close another body gets.

---

## What I would look at first
1. **The Coil Room climb.** It is the room most like a level. Does the beat read, from the glow alone, before you have
   heard it a few times?
2. **The Press crushers.** Pushing him out of a crush is the biggest change to how he moves.
3. **The launcher's "jump held while flying"** in `main.ts`. It works, but it is a rule another part might trip on.
4. **`docs/ENEMY-IDEAS.md`.** My pick to build next is the Bellringer: the Music Room's bells as a fight.
