# STATUS: what is a placeholder, what is being worked on, what is settled (2026-11-22)

Read this before choosing what to do. **Do not polish a PLACEHOLDER.** Nothing in the game is a finished level.
The owner's direction, 2026-11-22: every room is a TEST ROOM, a playground for getting the FEEL of a kind of area right,
so real levels can be built later. Most rooms will be changed or deleted. The order of what matters: (1) how each kind
of area FEELS, (2) enemies and hazards, (3) the knight's movement and animation. The plan is in BACKLOG.md, "WHERE THE
TIME GOES".

Tags: **PLACEHOLDER** (an idea, expect it to change or go), **WORK IN PROGRESS** (real, being shaped), **SETTLED**
(the owner has said yes). Nothing is SETTLED yet except what PLAYTEST.md records as agreed.

## Area feels (`src/data/feel.ts`)

| Area | Where | Tag | State |
|------|-------|-----|-------|
| Sewers | `sewers` feel | WORK IN PROGRESS | Has its own feel. Awaiting the owner's verdict. |
| Deep caves / platforming | `platform` feel | WORK IN PROGRESS | Awaiting the owner's verdict. |
| Wacky Pomo dream | `dream` feel | WORK IN PROGRESS | Skate park is missing banked turns and rail loops. |
| Snow and ice | none | NOT STARTED | Ice is only a slippery floor tile today. Next up. |
| Speed room (the Long Drop) | none | NOT STARTED | |
| Foundry / fire | none | NOT STARTED | |
| Castle | none | NOT STARTED | |

## Rooms (`src/levels/testRooms.ts`)

**EVERY room is a test room and a PLACEHOLDER as a level.** Do not make them completable or polished. The door name
is the kind of area it is for.

| No. | Door | For |
|-----|------|-----|
| 1 | WACKY POMO DREAM | skate park in the dream; floaty, fast, hyperactive |
| 2 | MUSHROOM CAVE | a dark cave lit by what glows in it |
| 3 | THE SEWERS | Dark Souls feel: blocking, parrying, harder fights, slower |
| 4 | ICE WORLD | ice underfoot: sliding, things that roll |
| 5 | DOWNHILL PIPES | grinding down a railway on his shield, bats |
| 6 | FOUNDRY | fire and iron: heat to cross, heavy beasts |
| 7 | FORGE | the Foundry's new look, tried out |
| 8 | DEEP CAVES | 3D Mario feel: wall jumps and double jumps, weaker beasts |
| 9 | CASTLE | a keep with guards behind shields |
| 10 | MOVE GYM | rulers, ledges and chimneys for feeling the jump numbers |
| 11 | THE CLUB | the first hub, as it was |
| 12 | WORKSHOP | parts for building levels: moving platforms |
| 13 | MUSIC ROOM | floor piano, echo puzzle |
| 14 | THE YARD | levers, cracked wall, cracked floor |
| 15 | GAUNTLET | belts, blades, spikes, fans |
| 16 | THE PRESS | crushers, flame jets |
| 17 | GREEN ROOM | new characters: two moles, two hedgehogs |
| 18 | COIL ROOM | Tesla coil on a beat, a keyboard to play it |
| 19 | STAND-IN | every character played, a course with a place for each |

Also in that file: four boss areas (Spider Boss, Grimsqueak, Sump Wyrm, Brood Mother) and eleven practice rooms, one per
enemy (cockroach, toad, bat, mantis, ant pikeman, keep guard, hornet, firefly, scorpion, ironback, stag knight). Same
rule: test rooms.

Room goals: whoever builds a room decides its goal on purpose and writes it in the room file's header comment (see
docs/KIT.md, "BUILDING A ROOM"). Rooms 12-19 have `goals: NO_GOALS`; that is deliberately left for now.

## The knight

WORK IN PROGRESS, and the real thing: `src/player/controller.ts`, `src/combat/combat.ts`,
`src/camera/followCamera.ts`. No area-specific movement yet (for example, skidding on ice). That comes with the feels.

## Other playable characters

All thirteen are **PLACEHOLDERS**: ideas the owner thought might be fun. Their movement is not correct and must be
different for each. Bramble, Thistle (hedgehogs), Digger, Dot (moles), Pebble, Mo (turtles), Vix, Ash (foxes), Slink,
Biscuit (ferrets), Tawny, Snow (owls), Jinx (rat). Only the two hedgehogs have limbs posed. Table: docs/KIT.md, "Every
character, played". LOW priority: the owner has no time to playtest each one.

## Enemies (`src/enemies/`)

WORK IN PROGRESS, none tuned per area. Kinds: scuttler (cockroach), toad, bat, mantis, ant pikeman, guard, hornet,
firefly, scorpion, ironback, stag knight, spark beetle, and the bosses (widow, Grimsqueak, wyrm, brood mother). Seven
more are designs only: docs/ENEMY-IDEAS.md.

## Hazards and parts (the kit)

WORK IN PROGRESS. Moving platforms, hazards, things to hit, the music floor, the coil. Shown only in Test Rooms 12-18;
none placed in a real area. See docs/KIT.md.

## Art, sound, music, cutscenes, fonts

Everything replaceable and unsettled. List: ASSETS.md. All sound is unheard by Claude; only the owner's ears can judge it.
