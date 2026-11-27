# ASSETS: everything in the game that can be replaced, and where it is

**This file is written by a script. Do not edit it by hand: run `npm run assets` and it is written again from the
game's own lists.** A test (`tests/assets.ts`) fails when it is out of date, so it cannot fall behind the game.

The owner, 2026-11-17: "all of the assets, little cut scenes and videos that we have, all of that kind of stuff, even
things like fonts may change in the future so they all need to be well organized, kept track of and easily
replaceable."

**Nothing here is final.** Every model, picture, sound, tune, scene, name and number is a placeholder that can be
swapped. Each part below says WHERE the thing lives and HOW to replace it.

**How this game holds its assets:** almost nothing is a file that is loaded. Models are built in code from simple
shapes; textures are painted in code, dot by dot; most sounds are made in code or squashed from a short recording
and stored as text inside the game. That is why the whole game is one .html file. So "replace an asset" usually
means "change the code that makes it", in the file named for it.

## 0. The quick way: drop a file in

**A picture, a sound or a song can replace the game's own WITHOUT editing code.** Put the file in a folder under
`assets/`, named for what it replaces, and run `npm run assets` (the delivery script does it by itself). Take the file
out and run it again to go back. The rules are in `assets/README.md`.

| To replace | Put a file in | Named for | Example |
| --- | --- | --- | --- |
| a surface's texture | `assets/textures/` | the texture (part 7) | `wetCobbles.png` |
| a sound effect | `assets/sounds/` | the effect (part 8) | `jump.wav` |
| a room's music | `assets/music/` | the room's id (part 1) | `cistern.mp3` |
| a kind of music, everywhere it plays | `assets/music/` | drift, pump, groove, echo, march, dream | `groove.mp3` |
| a jingle | `assets/music/` | wedge, defeat | `wedge.mp3` |

**Nothing is dropped in now: everything is the game's own.**

NOT YET possible this way: a model (a creature, a character, a prop), a voice, a font file, a cutscene. Those are
still changed in code, in the files the parts below name.

## 1. Test rooms (levels)

The list of rooms and what their doors say: `src/levels/testRooms.ts`. A room is opened by `#level=<id>`.
To rename a biome, change `door` there. To add a room: build it, add it to `src/levels/levels.ts`, add a line to the list.

| Room | id | Door says | Was called | Plays as | Look | Music | Made in |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Test Room 1 | `toybox` | WACKY POMO DREAM | The Toy Box | dream | cave | dream | `src/levels/toybox.ts` |
| Test Room 1B | `milkyway` |  | The Milky Way | dream | cave | dream | `src/levels/milkyway.ts` |
| Test Room 1C | `bigdipper` |  | The Big Dipper | dream | cave | dream | `src/levels/bigdipper.ts` |
| Test Room 2 | `glowcave` | MUSHROOM CAVE | The Glow Cave | waking | cave | echo | `src/levels/glowcave.ts` |
| Test Room 3 | `cistern` | THE SEWERS | The Great Cistern | sewers | sewer | drift | `src/levels/cistern.ts` |
| Test Room 3B | `pumpworks` |  | The Pump Room | sewers | sewer | pump | `src/levels/pumpworks.ts` |
| Test Room 3C | `works` |  | The Waterworks | sewers | sewer | drift | `src/levels/cisternHalls.ts` |
| Test Room 3D | `sludgepit` |  | The Sludge Pit | sewers | sewer | drift | `src/levels/cisternHalls.ts` |
| Test Room 3E | `sump` |  | The Sump | sewers | sewer | march | `src/levels/cisternHalls.ts` |
| Test Room 4 | `coldmain` | ICE WORLD | The Cold Main | frost | sewer | echo | `src/levels/coldmain.ts` |
| Test Room 5 | `longdrop` | DOWNHILL PIPES | The Long Drop | speed | sewer | pump | `src/levels/longdrop.ts` |
| Test Room 6 | `foundry` | FOUNDRY | The Foundry | waking | foundry | pump | `src/levels/foundry.ts` |
| Test Room 6B | `shaft` |  | The Lift Shaft | waking | foundry | drift | `src/levels/foundry.ts` |
| Test Room 6C | `coalcellars` |  | The Coal Cellars | waking | foundry | drift | `src/levels/foundry.ts` |
| Test Room 7 | `forge` | FORGE | The Forge | waking | foundry | pump | `src/levels/forge.ts` |
| Test Room 8 | `hollows` | DEEP CAVES | The Hollows | platform | cave | echo | `src/levels/hollows.ts` |
| Test Room 8B | `webs` |  | Web Hollow | platform | cave | echo | `src/levels/hollows.ts` |
| Test Room 8C | `brood` |  | The Brood Pit | platform | cave | march | `src/levels/hollows.ts` |
| Test Room 8D | `faith` |  | Leap of Faith | platform | cave | echo | `src/levels/hollows.ts` |
| Test Room 8E | `dark` |  | The Lightless Way | platform | cave | echo | `src/levels/hollows.ts` |
| Test Room 8F | `glimmer` |  | The Glimmer Deep | platform | cave | echo | `src/levels/glimmer.ts` |
| Test Room 9 | `keep` | CASTLE | Grimsqueak's Keep | waking | keep | march | `src/levels/keep.ts` |
| Test Room 9B | `lair` |  | Grimsqueak's Throne | waking | keep | march | `src/levels/keep.ts` |
| Test Room 10 | `garden` | MOVE GYM | The Move Garden | waking | dungeon | drift | `src/levels/garden.ts` |
| Test Room 11 | `hub` | THE CLUB | The Club | waking | dungeon | groove | `src/levels/junction.ts` |
| Test Room 12 | `workshop` | WORKSHOP | The Workshop | waking | dungeon | drift | `src/levels/workshop.ts` |
| Test Room 13 | `musicroom` | MUSIC ROOM | The Music Room | waking | dungeon | drift | `src/levels/musicroom.ts` |
| Test Room 14 | `breakyard` | THE YARD | The Yard | waking | dungeon | drift | `src/levels/breakyard.ts` |
| Test Room 15 | `gauntlet` | GAUNTLET | The Gauntlet | waking | dungeon | drift | `src/levels/gauntlet.ts` |
| Test Room 16 | `press` | THE PRESS | The Press | waking | dungeon | drift | `src/levels/press.ts` |
| Test Room 17 | `greenroom` | GREEN ROOM | The Green Room | waking | dungeon | drift | `src/levels/greenroom.ts` |
| Test Room 18 | `coilroom` | COIL ROOM | The Coil Room | waking | power | drift | `src/levels/coilroom.ts` |
| Test Room 19 | `standin` | STAND-IN | The Stand-in | waking | dungeon | drift | `src/levels/standinroom.ts` |
| Test Room 20 | `lockworks` | LOCKWORKS | The Lockworks | waking | dungeon | drift | `src/levels/lockworks.ts` |
| Test Room 21 | `round` | THE ROUND | The Round | sewers | dungeon | drift | `src/levels/round.ts` |
| Test Room 22 | `flotsam` | FLOTSAM | Flotsam | waking | sewer | drift | `src/levels/testRooms.ts` |
| Test Room 23 | `sluice` | THE SLUICE | The Sluice | sewers | sewer | echo | `src/levels/testRooms.ts` |

**The Hall** (`hall`, the hub): `src/levels/hall.ts`. **Boss rooms:** SPIDER BOSS (`widowpit`, `src/levels/practice.ts`); GRIMSQUEAK (`lair`, `src/levels/keep.ts`); SUMP WYRM (`sump`, `src/levels/cisternHalls.ts`); BROOD MOTHER (`brood`, `src/levels/hollows.ts`).

**Practice rooms** (all made by `src/levels/practice.ts`): COCKROACH (`practice_roach`), TOAD (`practice_toad`), BAT (`practice_bat`), MANTIS (`practice_mantis`), ANT PIKEMAN (`practice_ant`), KEEP GUARD (`practice_guard`), HORNET (`practice_hornet`), FIREFLY (`practice_firefly`), SCORPION (`practice_scorpion`), IRONBACK (`practice_beetle`), STAG KNIGHT (`practice_stag`).

**Old levels, kept but not behind any door** (13; open one with `#level=<id>`): Sewer Chamber (`sewer`), Cap Collector (`caps`), Roach Hunt (`hunt`), Endurance (`waves`), Leap of Faith (`leap`), Crate Search (`crates`), Waterworks (`waterworks`), Plank Pit (`plankpit`), Cellars (`cellars`), Lift Shaft (`liftshaft`), Furnace (`furnace`), Web Hollow (`webhollow`), Dizzy Dave's Spot (`davespot`).

## 2. How each biome plays (physics)

One table: `src/data/feel.ts`. The numbers every place shares: `src/data/tuning.ts` (and prices and door costs in
`src/data/balance.ts`). 301 of those numbers have a slider in the Tweaks panel (`src/core/tweaks.ts`).

| Biome feel | Meant to be like | Run | Jump | Gravity | His blows | His ground pound | A blow costs him | Tuck | Speed from tricks | Spin and grab |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| The waking world | Heavier and more dangerous: blocking, parrying, harder fights. He can ride his shield down a slope and grind a rail, and kickflip; no more than that. | x1 | x1 | x1 | x1 | x1 | x1 | no | no | no |
| The wacky Pomo dream | Fantastical, floatier, faster, hyperactive: a skate park. He runs faster, jumps higher and falls slower; lean forward for speed, tricks pay speed, spins and grabs in the air. | x1.25 | x1.1 | x0.75 | x1.5 | x1 | x1 | yes | yes | yes |
| The sewers | Dark Souls: blocking, parrying, harder fights, moving slower through the level. He runs slower, his blows do less, and what hits him costs double; but a perfect guard opens the creature to a riposte, one blow worth four. | x0.88 | x1 | x1 | x0.67 | x1 | x2 | no | no | no |
| The platform room | A 3D Mario: wall jumps and double jumps, and weaker enemies he can ground pound his way out of. His blows do a third more, his ground pound double, and a pound landed on a creature bounces him back up: they are stepping stones. | x1 | x1 | x1 | x1.34 | x2 | x1 | no | no | no |
| The frost | Slipping and sliding: nothing has much grip, and on the ice itself he scrabbles to get going, skids wide, slides on his belly to travel and digs his shield in to stop. | x1 | x1 | x1 | x1 | x1 | x1 | no | no | no |
| The speed room | Sonic Adventure: grinding down a railway on his shield, smacking bats out of the air. Every creature struck down from the shield is a burst of speed, so a run of them is faster and faster. | x1 | x1 | x1 | x1 | x1 | x1 | no | no | no |

## 3. The hero

| What | Where |
| --- | --- |
| His body, built from shapes; his scarf, helmet, sword and shield | `src/player/ratModel.ts` |
| His poses and sword swings | `src/player/animations.ts` |
| How he moves (running, jumping, riding) | `src/player/controller.ts` |
| His look in the dream (loud colours, long scarf) | `look: 'dream'` on a level; drawn in `src/player/ratModel.ts` |
| His gear, by name and colour | `src/data/equipment.ts` |

To replace his model: change `RatModel` in `ratModel.ts` (the game asks it only for a pose each frame).

## 4. Creatures (enemies and bosses)

Each has a MIND (how it fights) and a BODY (how it is drawn) in separate files, so either can be replaced alone.
Which body goes with which mind is in `addEnemy` in `src/main.ts`. In the dream the same creatures wear loud colours
(`dreamify`, `src/world/dozers.ts`).

| Creature | Called in a level | Its mind | Its body | Practice room |
| --- | --- | --- | --- | --- |
| Giant Cockroach | `scuttler` | `src/enemies/scuttler.ts` | `src/enemies/scuttlerModel.ts` | `practice_roach` |
| Toad | `toad` | `src/enemies/toad.ts` | `src/enemies/toadModel.ts` | `practice_toad` |
| Flitter | `bat` | `src/enemies/bat.ts` | `src/enemies/batModel.ts` | `practice_bat` |
| Orchid Mantis | `mantis` | `src/enemies/mantis.ts` | `src/enemies/mantisModel.ts` | `practice_mantis` |
| Ant Pikeman | `ant` | `src/enemies/ant.ts` | `src/enemies/antModel.ts` | `practice_ant` |
| Keep Guard | `guard` | `src/enemies/guard.ts` | `src/enemies/guardModel.ts` | `practice_guard` |
| Hornet Lancer | `hornet` | `src/enemies/hornet.ts` | `src/enemies/hornetModel.ts` | `practice_hornet` |
| Firefly Bomber | `firefly` | `src/enemies/firefly.ts` | `src/enemies/fireflyModel.ts` | `practice_firefly` |
| Lamp Scorpion | `scorpion` | `src/enemies/scorpion.ts` | `src/enemies/scorpionModel.ts` | `practice_scorpion` |
| Frost Roller | `roller` | `src/enemies/roller.ts` | `src/enemies/rollerModel.ts` |  |
| Spark Beetle | `sparkbeetle` | `src/enemies/sparkBeetle.ts` | `src/enemies/sparkBeetleModel.ts` |  |
| Ironback | `ironback` | `src/enemies/ironback.ts` | `src/enemies/ironbackModel.ts` | `practice_beetle` |
| Stag Knight | `stag` | `src/enemies/stag.ts` | `src/enemies/stagModel.ts` | `practice_stag` |
| The Sump Wyrm | `wyrm` | `src/enemies/wyrm.ts` | `src/enemies/wyrmModel.ts` | `sump` |
| The Broodmother | `brood` | `src/enemies/brood.ts` | `src/enemies/broodModel.ts` | `brood` |
| The Widow | `widow` | `src/enemies/widow.ts` | `src/enemies/widowModel.ts` | `widowpit` |
| Lord Grimsqueak | `grimsqueak` | `src/enemies/grimsqueak.ts` | `src/npc/grimsqueakModel.ts` | `lair` |

## 5. Characters (friendly)

Who is where and what they say is written in the level that holds them (the Club's cast: `src/levels/junction.ts`;
the Hall takes that cast whole and stands them about: `src/levels/hall.ts`). Their bodies are built by kind.
Their talk-box faces: `src/npc/portrait.ts` (kept blocky on purpose). Their voices: part 8.

| Character | Kind | Body built in | Voice | Appears in |
| --- | --- | --- | --- | --- |
| ASH | fox | `src/npc/patrons.ts` | wren at 0.92 | Test Room 11, Test Room 19, The Hall |
| BISCUIT | ferret | `src/npc/patrons.ts` | mort at 1.65 | Test Room 11, Test Room 19, The Hall |
| BRAMBLE | hedgehog | `src/npc/patrons.ts` | wren at 1.25 | Test Room 17, Test Room 19 |
| CORPORAL NIB | ant | `src/enemies/antModel.ts` | villain at 1.3 | Test Room 11, The Hall |
| DIGGER | mole | `src/npc/patrons.ts` | mort at 0.78 | Test Room 17, Test Room 19 |
| DIZZY DAVE | pigeon | `src/npc/npc.ts` | pigeon at 1 | Dizzy Dave's Spot, Test Room 11, The Hall |
| DOT | mole | `src/npc/patrons.ts` | mort at 0.78 | Test Room 17, Test Room 19 |
| FINCH | bird | `src/npc/npc.ts` | wren at 1.4 | Waterworks, Plank Pit, Lift Shaft, Web Hollow and 12 more |
| JINX | rat | `src/npc/patrons.ts` | wren at 1.08 | Test Room 11, Test Room 19, The Hall |
| LORD GRIMSQUEAK | villain | `src/npc/grimsqueakModel.ts` | villain at 0.8 | Test Room 9B, Dizzy Dave's Spot, Test Room 11, The Hall |
| MADAM TAWNY | owl | `src/npc/patrons.ts` | pigeon at 0.86 | Test Room 11, The Hall |
| MELLOW MORT | mouse | `src/npc/npc.ts` | mort at 1.3 | Dizzy Dave's Spot, Test Room 11, The Hall |
| MO | turtle | `src/npc/patrons.ts` | pigeon at 0.72 | Test Room 19 |
| MORT | mouse | `src/npc/npc.ts` | mort at 1.3 | Test Room 22 |
| MOSSBACK MO | turtle | `src/npc/patrons.ts` | pigeon at 0.72 | Test Room 11, The Hall |
| PEBBLE | turtle | `src/npc/patrons.ts` | pigeon at 0.72 | Test Room 11, Test Room 19, The Hall |
| PIP | mouse | `src/npc/npc.ts` | mort at 1.3 | Cellars, Furnace, Dizzy Dave's Spot, Test Room 3B and 4 more |
| PROFESSOR SNOW | owl | `src/npc/patrons.ts` | pigeon at 0.86 | Test Room 11, The Hall |
| SIR HOBNAIL | stag | `src/enemies/stagModel.ts` | villain at 0.62 | Test Room 11, The Hall |
| SLINK | ferret | `src/npc/patrons.ts` | mort at 1.65 | Test Room 11, Test Room 19, The Hall |
| SNOW | owl | `src/npc/patrons.ts` | pigeon at 0.86 | Test Room 19 |
| TAWNY | owl | `src/npc/patrons.ts` | pigeon at 0.86 | Test Room 19 |
| THISTLE | hedgehog | `src/npc/patrons.ts` | wren at 1.25 | Test Room 17, Test Room 19 |
| VIX | fox | `src/npc/patrons.ts` | wren at 0.92 | Test Room 11, Test Room 19, The Hall |
| WREN | bird | `src/npc/npc.ts` | wren at 1.4 | Dizzy Dave's Spot, Test Room 11, Test Room 6, Test Room 6C and 4 more |

## 6. Scenery and props

A level asks for a prop by its kind (`decor`, in `src/world/layout.ts`); `src/world/chamber.ts` draws it. There are 62 kinds:
`arch`, `arena`, `banner`, `bell`, `bottles`, `bracket`, `brazier`, `bulbs`, `butterflies`, `chain`, `chime`, `couch`, `crackfloor`, `crackwall`, `crystal`, `dancefloor`, `dartboard`, `engine`, `eyes`, `fall`, `floorkey`, `flowers`, `forge`, `gauge`, `grate`, `hole`, `iceSpike`, `icicle`, `jet`, `junk`, `keg`, `lamp`, `lever`, `light`, `lightrail`, `machine`, `mark`, `moss`, `mugs`, `mushroom`, `pipe`, `planet`, `portrait`, `post`, `roots`, `rubble`, `rug`, `ruler`, `runnel`, `shelf`, `sign`, `sleepers`, `slime`, `speaker`, `stalactite`, `stool`, `table`, `torch`, `vent`, `web`, `weed`, `window`.

Props with a model file of their own: `src/world/brazierModel.ts`, `src/world/couchModel.ts`, `src/world/forgeModels.ts`, `src/world/hazardModels.ts`, `src/world/itemModels.ts`, `src/world/junkModels.ts`, `src/world/strikeModels.ts`, `src/world/tavernModels.ts`. Doors: `src/world/doorway.ts`; their signs:
`src/world/courseDoors.ts`. The sky and its planets: `src/world/sky.ts`. Things to pick up: `src/world/collectibleMeshes.ts`,
`src/world/itemModels.ts`, `src/world/wedges.ts`. The dream's sleeping creatures: `src/world/dozers.ts`.

To replace a prop: change the code under its kind in `chamber.ts` (or its model file). What is drawn must stay the
size of what is solid: the solid boxes are given by the level, not by the model.

## 7. Textures and looks

All 109 textures are painted in code, dot by dot: `src/render/textures.ts` (one entry each, by name). To replace
one: drop a picture of that name into `assets/textures/` (part 0), or repaint its entry in code. The names:
`stone`, `floor`, `brick`, `water`, `sewerBrick`, `concreteSlab`, `rustPlate`, `drainGrate`, `pipeBands`, `mossStone`, `wetCobbles`, `sludge`, `sewerWater`, `ceramicTiles`, `archTrim`, `dirt`, `dirtRoots`, `planks`, `beamEnd`, `beamSide`, `rubbleWall`, `gravelRail`, `mineBrick`, `clay`, `roughRock`, `wetRock`, `sandstone`, `crystalRock`, `mudFloor`, `mossRock`, `mushroomPatch`, `stalagmite`, `poolWater`, `magmaRock`, `crate`, `ironDoor`, `ironBars`, `hazardTrim`, `scorpShell`, `scorpTail`, `scorpClaw`, `scorpLamp`, `mushroomCap`, `mushroomStem`, `iceBrick`, `frostCobbles`, `iceSheet`, `iceBlock`, `iceClear`, `caveRock`, `caveFloor`, `glowMoss`, `rollerShell`, `rollerUnder`, `stagShell`, `stagBelly`, `stagHorn`, `stagIron`, `ashWood`, `turtleScute`, `turtleScuteMossy`, `turtleSkin`, `turtleBelly`, `shortFur`, `hairStrands`, `knit`, `ratTail`, `tartan`, `stripeSock`, `chitin`, `wartSkin`, `leafChitin`, `membrane`, `owlFeathers`, `owlWing`, `softPaint`, `dreamStatic`, `rainbowRoad`, `pomoTiles`, `steamVent`, `widowChitin`, `widowHorn`, `widowBack`, `fireBrick`, `deckPlate`, `castIron`, `girder`, `castingSand`, `coalLumps`, `wroughtIron`, `cutStone`, `charred`, `coals`, `cork`, `tin`, `weave`, `cheese`, `card`, `wax`, `thread`, `couchFabric`, `couchPatch`, `knitBlanket`, `keepStone`, `royalCarpet`, `treadPlate`, `circuitPanel`, `copperCoil`, `steelGirder`.

A level's LOOK is a theme: which texture each kind of surface wears (`src/levels/themes.ts`).

| Theme | What it is | Floor | Wall | Platform | Stone |
| --- | --- | --- | --- | --- | --- |
| `sewer` | Sewer (green, wet brick) | wetCobbles | sewerBrick | mossStone | concreteSlab |
| `mine` | Mine (earth and timber) | dirt | mineBrick | dirtRoots | rubbleWall |
| `cave` | Cave (rock and moss) | mudFloor | roughRock | mossRock | wetRock |
| `dungeon` | Dungeon (grey stone) | floor | brick | stone | stone |
| `foundry` | Foundry (iron, soot and magma) | rustPlate | mineBrick | rustPlate | magmaRock |
| `keep` | Keep (castle stone and royal carpet) | stone | keepStone | keepStone | keepStone |
| `power` | Power plant (steel, copper and circuits) | treadPlate | circuitPanel | treadPlate | circuitPanel |

How everything is shaded (the PS1 look: wobble, banding, fog): `src/render/ps1Material.ts`. How sharp the picture
is: `src/render/picture.ts`.

## 8. Sound

**Claude cannot hear.** Sounds are made and checked by measurement (how loud, how long, how bright); only the owner's
ears can say whether one is right.

### Sound effects

185 effects, each known by a name (`SFX_NAMES` in `src/audio/synth.ts`). 33 are RECORDED (a short piece of a
recording, squashed, stored in `src/audio/recorded.ts`); the other 152 are MADE IN CODE (a recipe in `synth.ts`).

**To replace an effect, the quick way:** drop a recording of that name into `assets/sounds/` (part 0). It is used whole,
as it is.

**To replace one with a piece of a longer recording, squashed to the game's grain:** put the sound file in `recordings/`, add or change its entry in
`recordings/map.json` (which file, from when to when, pitch), run `python3 scripts/make-recorded.py`. To go back to
the made-up sound, delete the entry and run it again. To change a made-up sound, change its recipe in `synth.ts`.

| Effect | Comes from |
| --- | --- |
| `land` | recorded: `recordings/chip/land.wav` |
| `step` | recorded: `recordings/voice001.m4a` |
| `swing` | recorded: `recordings/chip/swing.wav` |
| `dodge` | recorded: `recordings/chip/dodge.wav` |
| `block` | recorded: `recordings/chip/block.wav` |
| `crate` | recorded: `recordings/chip/crate.wav` |
| `crumb` | recorded: `recordings/chip/crumb.wav` |
| `cap` | recorded: `recordings/chip/cap.wav` |
| `relic` | recorded: `recordings/chip/relic.wav` |
| `item` | recorded: `recordings/react8.m4a` |
| `heal` | recorded: `recordings/chip/heal.wav` |
| `splash` | recorded: `recordings/chip/splash.wav` |
| `toadWind` | recorded: `recordings/react8.m4a` |
| `menuMove` | recorded: `recordings/voice001.m4a` |
| `menuOk` | recorded: `recordings/chip/menuOk.wav` |
| `menuBack` | recorded: `recordings/chip/menuBack.wav` |
| `talk` | recorded: `recordings/voice001.m4a` |
| `sparkle` | recorded: `recordings/chip/sparkle.wav` |
| `doorOpen` | recorded: `recordings/chip/doorOpen.wav` |
| `clear` | recorded: `recordings/chip/clear.wav` |
| `gate` | recorded: `recordings/chip/gate.wav` |
| `drip` | recorded: `recordings/voice001.m4a` |
| `ratJump` | recorded: `recordings/react8.m4a` |
| `ratJump2` | recorded: `recordings/react8.m4a` |
| `ratDouble` | recorded: `recordings/react8.m4a` |
| `ratAttack` | recorded: `recordings/react8.m4a` |
| `ratHurt` | recorded: `recordings/react8.m4a` |
| `ratDie` | recorded: `recordings/react8.m4a` |
| `roachDie` | recorded: `recordings/react8.m4a` |
| `boot` | recorded: `recordings/chip/boot.wav` |
| `villainLaugh` | recorded: `recordings/react8.m4a` |
| `rewind` | recorded: `recordings/chip/rewind.wav` |
| `whoosh` | recorded: `recordings/chip/whoosh.wav` |

Made in code: `jump`, `doubleJump`, `hit`, `kill`, `hurt`, `barrel`, `plank`, `pipe`, `plunge`, `shock`, `spit`, `splat`, `croak`, `roachWind`, `lunge`, `rumble`, `water`, `gush`, `drain`, `machine`, `wind`, `hall`, `lavaBubble`, `fire`, `clank`, `hiss`, `pebbles`, `chainClink`, `toll`, `roachScreech`, `snort`, `flipClang`, `batSqueak`, `flap`, `chipNote`, `chipBuzz`, `memoryIn`, `memoryOut`, `cloth`, `keepsake`, `recall`, `softStep`, `chitinTap`, `broodScream`, `broodHiss`, `broodRattle`, `spikeHit`, `threadTwang`, `broodHurt`, `broodDie`, `wyrmRoar`, `wyrmHiss`, `wyrmSnap`, `wyrmRattle`, `wyrmRam`, `wyrmLash`, `wyrmCreak`, `wyrmCrunch`, `plateKnock`, `wyrmCry`, `wyrmDie`, `hornetBuzz`, `hornetWhine`, `hornetHurt`, `hornetDie`, `stagBellow`, `stagStep`, `hammerHum`, `hammerSlam`, `stagRattle`, `stagDie`, `mantisHiss`, `scytheRing`, `scytheCut`, `mantisWings`, `mantisCry`, `mantisDie`, `guardBark`, `spearReady`, `guardYelp`, `guardDie`, `antClick`, `pikeReady`, `antSnap`, `antHurt`, `antDie`, `ironScrape`, `ironCharge`, `ironBonk`, `ironToss`, `ironRise`, `ironDie`, `batDie`, `broodDrop`, `grimGather`, `grimBolt`, `boltBurst`, `grimSwoop`, `grimSlam`, `orbHum`, `orbStrike`, `grimCry`, `grimRepel`, `grimSag`, `grimDie`, `fireflyHum`, `fireflyBlink`, `emberDrop`, `emberBurst`, `fireflyFade`, `fireflyHurt`, `fireflyDie`, `rideScrape`, `ridePop`, `rideClatter`, `grindRing`, `widowScream`, `widowRear`, `widowBite`, `widowHurt`, `widowDie`, `poisonSlash`, `poisonWave`, `poisonSpit`, `poisonSplash`, `scorpRasp`, `scorpCharge`, `scorpSting`, `scorpSnap`, `scorpHurt`, `scorpDouse`, `scorpDie`, `gasBurst`, `gasHiss`, `heave`, `hurl`, `setDown`, `potSmash`, `rockKnock`, `squirm`, `spinWhirl`, `grabSlap`, `trickStab`, `leverThrow`, `stoneCrack`, `stoneFall`, `spikeUp`, `flameRoar`, `bellNote`, `coilZap`, `coilCrack`, `coilTick`.

The owner's three sound tools (kept whole in the project): `recordings/tools/chip-drum-pad.html`, `recordings/tools/chiptune-pad-studio.html`, `recordings/tools/robot-voice-box.html`. They are driven by
the scripts in `scripts/chip/` (`sfx.mjs` for effects, `voices.mjs` and `robot.mjs` for voices, `songs.mjs` and `make.mjs` for music).

### Voices

Characters "speak" in syllables cut from one recording each (`recordings/voices.json`, built by
`scripts/make-recorded.py`); which recording and at what pitch each KIND of character uses: `VOICES` in
`src/audio/speech.ts`. To give a character a voice of his own, record him, add a bank, point his kind at it.

| Kind of character | Recording used | Pitch |
| --- | --- | --- |
| mouse | mort | 1.3 |
| bird | wren | 1.4 |
| pigeon | pigeon | 1 |
| villain | villain | 0.8 |
| turtle | pigeon | 0.72 |
| fox | wren | 0.92 |
| ant | villain | 1.3 |
| stag | villain | 0.62 |
| ferret | mort | 1.65 |
| owl | pigeon | 0.86 |
| rat | wren | 1.08 |
| mole | mort | 0.78 |
| hedgehog | wren | 1.25 |

**Robot voices** (the Robot Voice Box). They SPEAK only in the dream. 4 voices (small, thin, big, plain), each with cries for
attack, hurt and die: `src/audio/robotVoices.ts`, made by `node scripts/chip/robot.mjs`. Which creature has which
voice: `src/audio/dreamVoices.ts`.

### Music

**The sound of this game is hip-hop: boom bap, gritty, scratches.** Songs are WRITTEN as notes in
`scripts/chip/songs.mjs`, RENDERED through the owner's tools by `node scripts/chip/make.mjs <folder>`, and PUT IN THE
GAME by `node scripts/chip/embed.mjs <folder> <ids...>`, which writes `src/audio/tunes.ts`. Which tune plays where:
`PLAYLISTS` in `src/audio/music.ts`; a level asks for a kind of music by name (`music:` on the level).

**To put a finished song in, the quick way:** drop it into `assets/music/` named for the room or the kind of music (part 0).

| In the game | Name | Tempo | One round |
| --- | --- | --- | --- |
| `bap2` | Feathers and Dust | 92 bpm | 20.9 s |
| `bap1` | Pigeon Bap | 86 bpm | 22.3 s |
| `cistern` | Still Water | 76 bpm | 25.3 s |
| `foundry` | Hammer and Bellows | 132 bpm | 14.5 s |
| `hollows` | No Bottom | 68 bpm | 28.2 s |
| `keep` | The Long Stair | 96 bpm | 20.0 s |
| `dream` | Star Slide | 140 bpm | 13.7 s |
| `wedge` (jingle) | A Golden Wedge | 100 bpm | 3.1 s |
| `defeat` (jingle) | Down He Goes | 66 bpm | 13.4 s |

| A level asks for | It gets | Levels that ask for it |
| --- | --- | --- |
| `drift` | `cistern` | 40 |
| `pump` | `foundry` | 5 |
| `groove` | `bap2` then `bap1` | 3 |
| `echo` | `hollows` | 8 |
| `march` | `keep` | 4 |
| `dream` | `dream` | 3 |

**Written but NOT in the game** (17): Dave's Groove (`club`), Teeth (`boss`), The Kingdom Below (`title`), Jinx Cuts In (`bap3`), Drip Tape (`sewer`), Clank (`forge`), Spore Breath (`cave`), Cold Stone (`stone`), Big Teeth (`teeth`), Saturday Morning (`cartoon`), Counting Sheep (`sheep`), After Hours (`late`), Washed Up (`wash`), Long Way Round (`sluice`), The Kingdom Below (`kingdom`), Star Slide (Broken) (`glitch`), Does Not Compute (`rogue`).

## 9. Cutscenes

Each is a list of who stands where, what they do and where the camera is, second by second: `src/cutscene/scenes.ts`
(played by `src/cutscene/cutscene.ts`). To see one: pause, SCENES; or `#level=hub&scene=<id>`. To replace one, rewrite
its entry; to add one, add an entry.

| Scene | id | Set in | Length |
| --- | --- | --- | --- |
| TWO AT A TABLE | `table-talk` | `hub` | 15.0 s |
| A DRINK FOR A FRIEND | `a-drink-for-a-friend` | `hub` | 17.0 s |
| A GLASS DOWN THE BAR | `down-the-bar` | `hub` | 11.0 s |
| THE SOLDIER, ALONE | `the-soldier-alone` | `hub` | 18.0 s |
| DIZZY DAVE, LIVE | `dizzy-dave-live` | `hub` | 11.2 s |
| A HAND OF CARDS | `a-hand-of-cards` | `hub` | 13.0 s |
| TWO AT THE BAR | `two-at-the-bar` | `hub` | 13.0 s |
| THE OLD STAG | `the-old-stag` | `hub` | 14.0 s |

**The old story** (parked: do not un-park it): 14 levels' scenes in `src/story/scenes.ts`, played by `src/story/scene.ts`.

## 10. Fonts

Every typeface is named in ONE file: `src/ui/fonts.ts`. Change a line there and everything that uses it changes.
A test fails if a font is named anywhere else.

| Font | Used for | Now |
| --- | --- | --- |
| game | the HUD, menus, talk box, shop, photo mode | ui-monospace, Menlo, Consolas, monospace |
| title | the title screen and the save-file screen | Impact, 'Arial Black', 'Trebuchet MS', sans-serif |
| label | small print on the title and save-file screens; the letters on button pictures | 'Trebuchet MS', Arial, sans-serif |
| logo | the name under the studio mark | Georgia, 'Times New Roman', serif |
| tools | the level builder and Tweaks | system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif |

The block letters on door signs and boards in the world are not a font: they are drawn from the game's own letter
shapes, `src/render/pixelFont.ts`.

## 11. Pictures in the menus

| What | Where |
| --- | --- |
| Little pictures (gear, hearts, tabs, stickers) | `src/ui/icons.ts` (drawn in code) |
| Button pictures (Xbox, PlayStation, Switch, Steam Deck, keys) | `src/ui/glyphs.ts` |
| Faces in the talk box | `src/npc/portrait.ts` |
| The sticker book: 23 stickers (7 Characters, 13 Beasts, 3 Finds) | `src/data/stickers.ts` |
| The title screen and the studio mark | `src/ui/boot.ts` |
| The painting on the wall | `src/world/portraitTexture.ts` |

## 12. Words and names

| What | Where |
| --- | --- |
| Room numbers and what the doors say | `src/levels/testRooms.ts` |
| What characters say | in each level's file, on the character (`lines`) |
| Sign boards in a level | in each level's file (`kind: 'sign'`) |
| Gear (13) and food (1): names and descriptions | `src/data/equipment.ts`, `src/data/consumables.ts` |
| Sticker names and blurbs | `src/data/stickers.ts` |
| Menu words | `src/ui/menu.ts`, `src/ui/boot.ts` |

## 13. Films and pictures of the game

**The films and pictures sent to the owner are NOT kept in the project** (they are large, and are made again from
the game). What IS kept is how to make them:

| Script | What it does |
| --- | --- |
| `scripts/film/cut.sh` | Joins a film's pictures (film.mjs) into an .mp4 at 15 a second, over a tune. |
| `scripts/film/film.mjs` | A FILM of the running game, as numbered pictures (join them with cut.sh). |
| `scripts/film/stills.mjs` | Still pictures of the running game, one for each address given. |

Anything that moves is shown as a film, not as stills. A film gets a tune of its own, rendered with
`scripts/chip/make.mjs`.

## 14. Keeping this list true

- `npm run assets` writes this file again. `tests/assets.ts` fails if it is stale, if a creature or prop file named
  here is missing, or if a font is named outside `src/ui/fonts.ts`.
- A new creature goes in `CREATURES` in `scripts/assets/inventory.ts`; everything else is picked up by itself.
