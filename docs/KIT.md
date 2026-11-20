# THE KIT: parts for building levels (for Fable)

The owner, 2026-11-20: "making objects, different types of moving platforms, different kinds of interactable things,
breakable objects ... anything you can put in the game for Fable to work with later will be helpful" and "we can keep
making rooms and keep adding on different stuff as long as we have ways to show it off and we keep notes of it to pass
on later". The levels will be laid out again, so nothing here is placed in them: each part is shown off in a room of
its own (the Workshop, Test Room 12, `#level=workshop`), and listed here: what it is, how to put one in, its numbers,
and the test that holds it.

## Moving platforms (`src/world/platforms.ts`; `tests/platforms.ts`)

A moving platform is a `MoverSpec` in a level's `movers` (src/world/layout.ts). Its `motion` says how it moves. In the
level editor: the "Moving platform" piece, its "Kind" setting; its "How far" means what the column below says.

| motion  | what it does | its numbers (defaults in `PLATFORM`) | editor "How far" |
|---------|--------------|--------------------------------------|------------------|
| glide   | to `to` and back, waiting at each end (every level's lifts) | `speed` 2, `pause` 1.5 | the distance |
| circle  | round and round a middle; `to` is from the middle to its start | `speed` (along its way) 2 | the radius |
| ride    | waits; goes to `to` while he stands on it, back after he steps off | `speed`, `pause` 1 (before going back) | the distance |
| sink    | sinks while he stands on it, rises again when he is off | `speed` 1.2, `depth` 2.5 | the depth |
| crumble | shakes when he lands, falls after `hold`, gone for `back`, then returns | `hold` 0.7, `back` 3 | (none) |
| spring  | squashes and throws him `launch` high (holding jump or not), ready again a moment later | `launch` 6 | the height |
| swing   | hung on two chains from a pivot (`to`: from the platform hanging still up to the pivot), swings `arc` rad each way along `along` (x or z), rising at the ends as a pendulum; carries him | `arc` 0.6, `period` 3.2 | how far above the pivot is |
| blink   | there for `hold` s, gone for `back` s, round and round (`phase` puts several out of step); flickers its last 0.6 s; gone, he drops through | `hold` 2, `back` 1.5 | (none) |
| path    | follows a closed loop of waypoints (`path`, each from its start) at `speed`, carrying him round, up and down too | `speed` 2 | the editor makes a loop: along, half up, back, down |
| crush   | a CRUSHER: waits up (`hold`), shakes for the last half second, slams down `depth` (as a weight falls), sits (`pause`), winds back up at `speed`. Coming down on him: a heavy blow (2), and he is put out from under it at once the shortest way that is not into a wall. He can ride its top. | `hold` 1.6, `depth` 3, `pause` 0.8, rise 1.5, `thick` 2 | how far it drops |

Shown in the Workshop's FRONT half (2026-11-20): a swing across a gap, four blinkers out of step across another, a
path carrying him up to a high ledge; a crumb at the far end of each. A spring is striped (hazardTrim), a crumbling one is rubble, unless a `skin` is given. A spring sets his upward speed
from the outside (as gusts push him sideways): the controller is not touched. Crates standing on any of them ride along
(as on a glide); a crumbled one is not there at all until it comes back.

## Household odds and ends (`src/world/junkModels.ts`; sizes and solids `JUNK` in layout.ts; `tests/oddments.ts`)

A decor `{ kind: 'junk', what, x, y, z, yaw }` and its solid `junkSolids(what, x, y, z, yaw)`; in the editor, each is a
piece of its own. Twenty: candle stub (gives light, drips), cotton reel (its thread sways), matchbox, wheel of cheese,
sardine tin, coat button, pencil stub, die, chess pawn, battery (sparks), teacup (steams), teaspoon, safety pin,
paperclip, crayon, marble (glints).
LANDING BESIDE ONE (`chamber.thump`, called by main.ts by the landing sound): matches rattle, a die tips, a marble rolls
and rocks back, a reel rocks, tea slops and the cup rattles, a spoon taps, a sardine lid wobbles, a pawn rocks, a battery
rolls. Each answers with a quiet knock (wood, bone, glass) or tink (tin, china). Whatever an object moves itself is tagged
`userData.moves`, so a room's gathering leaves it alone. Shown off: the tour film; placed today in 17 rooms
(`src/levels/oddments.ts`), which will go when the levels are laid out again.

## Music underfoot (`src/world/musicFloor.ts`; `tests/musicfloor.ts`; shown in the Music Room, Test Room 13)

- **floorkey** (decor `{ kind: 'floorkey', x, y, z, w, d, note, black? }`): a piano key on the floor. Landing on it plays
  its note, in semitones from middle C, on the chip (`chipNote` in audio/synth.ts, played at 2^(note/12) of its speed). A
  black key stands higher, and over a white one it is the black that sounds. `pianoKeys(y)` in levels/musicroom.ts lays a
  whole octave.
- **chime** (decor `{ kind: 'chime', x, y, z, r, note, color, puzzle, slot }`): a pad of an ECHO PUZZLE named by
  `puzzle`; `slot` -1 is its start pad. Standing on the start pad, the puzzle plays a tune on its pads (3 notes, lighting
  each), then listens; played back right, the next round is a note longer; three rounds and it is SOLVED (`MusicFloor.solved`,
  every pad flashes, the clear chime). Wrong: a buzz (`chipBuzz`), and it waits for the start pad again. `echoPads(id, y)`
  lays four (C, E, G, the C above) and a start pad. A level could hang a door or a reward on `solved`: nothing does yet.
- **bell** (decor `{ kind: 'bell', x, y, z, yaw, note, color, puzzle?, slot? }`, 2026-11-20): a bell hung low in a
  frame, STRUCK WITH THE SWORD (it is a thing to hit, world/strikeables.ts, and a music pad). Alone it sounds its note
  (`bellNote`, a bell's partials, unheard); with `puzzle` and `slot` it is a pad of an echo puzzle like a chime, one
  bell its start (slot -1). Standing under it does nothing. It swings when struck, and a halo round it lights as it
  sounds. `bells(id, y)` in levels/musicroom.ts lays four in D minor (D, F, A, D) and a white start bell: the Music
  Room's BELL ECHO, which opens a nook in its west wall.
- **In the level editor** (a group of its own, MUSIC): Piano key (drag it as long and wide as you like; sharps are
  black), Music pad, Bell. Each has a NOTE (C an octave below middle C to C two above). A pad or a bell has a PUZZLE
  (none: it just sounds; or A, B, C) and an ORDER in it (start, pad 1 ... pad 8). A gate can open when "an echo
  puzzle is solved" (which one). The editor warns of a puzzle with no start, or fewer than two pads. A pad's colour
  goes by its note round the octave; a bell goes bronze to silver, low to high; a start pad or bell is white.
- main.ts steps it after him (a few lines by his update) and the room shows what is lit and pressed (`Chamber.music`).
- **A gate the puzzle lifts**: a gate's `echo: '<puzzle>'` (GateSpec in layout.ts) lifts it once that puzzle is solved.
  The Music Room has one, in the east wall, with a cheese crumb behind it.

## Things to hit (`src/world/strikeables.ts`, looks in `strikeModels.ts`; `tests/strikeables.ts`; the Yard, Test Room 14)

Each is a decor; the room draws it and makes it solid (`Chamber.strike`), and main.ts strikes them after the fight
is resolved (`strikeThings(things, player)`), plays what it says and shows them. In the editor, under "Breakables and
machines": Lever, Cracked wall, Cracked floor.

| part | decor | what breaks or moves it | numbers (`STRIKE`) |
|------|-------|-------------------------|--------------------|
| lever | `{ kind: 'lever', x, y, z, yaw }` | a sword swing throws it over (ON); the next throws it back. Once a swing. A plunge does nothing. | its post `lever` 0.5 by 1.3 high; only its base is solid |
| cracked wall | `{ kind: 'crackwall', x, y, z, w, h, d, hits? }` | sword blows: it cracks at each, and falls at `hits` (default `wallHits` 3). A heavy blade (damage 2 or more) counts two. A plunge's blast does not touch it. | `wallHits` 3, `heavyBlade` 2, `heavyCounts` 2 |
| cracked floor | `{ kind: 'crackfloor', x, y, z, w, d }` (y is its top) | only a PLUNGE landing on its top. Walked on, dropped on, swung at, it holds. Broken, he goes through. | 0.4 thick |

- **A TIMED lever** (`timer: N` on a lever, 2026-11-20): it springs back by itself N seconds after it goes over
  (`tickLevers`), its lamp amber and blinking quicker as the time runs out, a tick each half second (each quarter in
  the last second and a half). A gate with `shut: true` drops again when its levers stop holding it (solid again once
  down). The Yard's RACE THE GATE: a pen with a crumb, its gate 10 paces from a 4-second lever; a step inside is the
  way out over the wall once the gate has dropped behind him (tests/strikeables.ts races it with the real rat: a
  straight run makes it, dawdling 3 seconds does not, and he can climb out).
- **A gate the levers lift**: a gate's `levers: [0, 1]` lifts it when those levers (counted among the room's levers
  only, first is 0) are all over at once. In the editor: a Gate's "Opens when", "every lever is over".
- Measured from the box's nearest side, so a wide wall is struck anywhere along it, as a crate is.
- Sounds: `leverThrow`, `stoneCrack`, `stoneFall` (audio/synth.ts; unheard). A wall or floor coming down throws the
  same shards a pot does (world/debris.ts).
- Shown in the Yard: one lever and its gate; two levers and a gate that waits for both; a cracked wall closing a nook;
  a stone stage with a cracked slab in its top over a cellar. A cheese crumb behind each. Film: `&autoswing=N` (a
  swing every N seconds) and `&autoplunge` (jump, jump, plunge), dev/filmDrive.ts.
- Not done: a breakable jar (the clay pot already is one: it breaks, and can hold a collectible).

## Hazards and helpers (`src/world/hazards.ts`, looks in `hazardModels.ts`; `tests/hazards.ts`; the Gauntlet, Test Room 15)

Each is a decor; the room draws it (`Chamber.hazards`), and main.ts has it act on him: a belt and a fan before his
update (where a gust pushes him), a blade and spikes after the fight (where fire burns him). All of them go by the
room's clock, so what is drawn and what hurts agree. In the editor, under "Breakables and machines": Conveyor belt,
Swinging blade, Spike floor, Floor fan (the belt and blade take a direction).

| part | decor | what it does | numbers (`HAZARD`, and the decor's own) |
|------|-------|--------------|------------------------------------------|
| belt | `{ kind: 'belt', x, y, z, w, d, yaw, speed }` (y its top) | carries whatever stands on it the way `yaw` points, right off its end. Solid, 0.35 high. | `speed` 3 in the Gauntlet; running against it, he gains 3 a second less |
| blade | `{ kind: 'blade', x, y, z, length, yaw, swing, period, phase }` (x, y, z its pivot) | swings side to side across `yaw` (the way past it). Its touch hurts; a shield does not stop it (a heavy blow); a roll goes through, as through any blow. | blade 0.6 each way, 0.35 round; `swing` 0.6 rad, `period` 2.4 s, length 4 |
| spikes | `{ kind: 'spikes', x, y, z, w, d, period, up, phase }` | up for `up` seconds of every `period`, after half a second of a warning poke; standing in them hurts, and a roll does not help. | `period` 3, `up` 1.2, warning 0.5, 0.55 high |
| fan | `{ kind: 'fan', x, y, z, r, height, on?, off?, phase? }` | in its column he is lifted, to hover about nine tenths of the way up. With `on` and `off`, it runs and stops, spinning up and down. | rise 5.5 a second, `height` 9 (the Gauntlet's ledge is 7) |

- Sounds: a blade swishes through the bottom of its swing (the whoosh, low), spikes `spikeUp` as they come up; heard
  within 12 (`HEARD`), fading. Unheard.
- Shown in the Gauntlet: two belts running opposite ways; a corridor of two blades a quarter of a swing apart (a
  straight run at the right moment gets through: the test finds 8 moments of 24); a corridor of four spike plates a
  quarter beat apart; a fan up to a high ledge, and one that runs and stops under a crumb hanging in the air.
- **On creatures** (`HazardFoes` in hazards.ts; main.ts calls it beside his own): a belt carries one that stands on
  it (by its own `nudge`, so it keeps out of walls); a blade or spikes strike one for 1 (`FOE_HAZARD`), at most once
  in 0.8 s, taken as a THROWN thing is (a curled roller spills; a shield or shell does not turn it, as his does not);
  a fan does not lift one (a creature has no fall of its own: it keeps to its floor) but blows one that walks onto it
  off again. A flier (bat, hornet, firefly) meets only the blades. Not one in his hands or thrown by him. A kill
  counts as any other. In the Gauntlet, a button in front of each bay puts a roach into it.

### Float zone, mud, launcher (2026-11-20; `Zones` in hazards.ts; the Gauntlet's front half; `tests/hazards.ts`)

Physics to play with, all acting on him before his update (main.ts, by the belt and fan):
- **floatzone** `{ kind: 'floatzone', x, y, z, w, h, d, gravity }`: in the box, gravity is `gravity` of itself (0.35:
  a jump 2.4 high outside goes 6.8 inside, and hangs). A faint violet column, motes drifting up.
- **mud** `{ kind: 'mud', x, y, z, w, d, slow }`: on it, his stride is `slow` of itself (0.4); main.ts scales the stick.
  A brown patch with bubbles.
- **launcher** `{ kind: 'launcher', x, y, z, r, yaw, speed, up }`: stepped onto (fresh), it fires him `up` upward and
  `speed` across toward `yaw`, and HOLDS that speed across until he lands; while flying it counts as holding jump
  (the short-hop rule would halve the throw: found by the test). A striped pad, a barrel tilted to its aim, a flash.
- Creatures are not floated, slowed or fired.

### Flame jets (`flamejet` in hazards.ts; `tests/press.ts`; the Press, Test Room 16)

`{ kind: 'flamejet', x, y, z, yaw, up?, length, period, on, phase }`: a nozzle in a wall pointing along `yaw` (or in
the floor pointing up, `up`). It burns for `on` seconds of every `period`, after 0.6 s of a blue pilot flame; the
flame grows out and dies back in 0.15 s. It burns as fire does (`takeBurn`: no roll helps; the Ember Helm keeps it
off). Creatures in it are struck too, but not a firefly. A roar as it lights (`flameRoar`, unheard). In the editor:
Flame jet (on the floor it points up; turned, it is in a wall pointing out).

The Press also shows the crusher (above): a corridor under three crushers out of step, and one to ride up to a ledge.
ICE, asked for with these, was already a part: the editor's Ice floor (a slick floor, `slick: true`).

## The Coil Room: a Tesla coil on a beat, zap plates, coil keys, the Power plant tile set (Test Room 18)

The owner's idea, 2026-11-20: a room with a big Tesla coil zapping the metal platforms you climb on, on "some sort of
hip hop beat ... so that you understand when the platforms will and won't be electrocuted", coils you can play "like
synthesizers", and an electrical tile set. `src/levels/coilroom.ts`; the beat `src/world/teslaCoil.ts`; the parts in
`world/hazards.ts` and `hazardModels.ts`; `tests/coilroom.ts`.

- **The beat** (`COIL` in teslaCoil.ts): a boom-bap bar, 16 steps at 90 a minute (2.67 s a bar). KICK on steps 1, 8,
  11, singing a bass line (a note each, four bars round); SNARE on 5 and 13; HAT on 3, 7, 10, 15 (harmless sparks).
  A plate is live 0.22 s after its lane's hit, and glows up through the 0.5 s before it. One clock: drawn, heard and
  felt agree.
- **teslacoil** (decor `{ kind: 'teslacoil', x, y, z, height, r, keys? }`): iron base, white insulator rings, a
  copper-wound column (`copperCoil`), a steel ring on top, a halo that swells on the hits. It throws a jagged bolt (two
  crossed ribbons, re-jagged many times a second) to every kick plate on the kick and every snare plate on the snare,
  and sparks off its ring on the hats. Solid. `keys: true`: a small one that plays no beat, only a bolt to whichever
  coil key is played.
- **zapplate** (decor `{ kind: 'zapplate', x, y, z, w, d, lane }`, lane `kick`, `snare` or `safe`): a solid slab of
  tread plate with glowing edge strips, BLUE for the kick, VIOLET for the snare, grey for safe; brighter through the
  warning, white with sparks while live. Live and stood on: a shock (a burn, 1; no roll or shield helps; a hop clears it).
  Creatures that walk are shocked too.
- **Coil keys**: any floor key with `voice: 'coil'` sings through the coil (`coilZap`, a harsh square buzz with arc
  crackle, pitched to the note) and the nearest keyboard coil throws a bolt to it.
- **Sounds** (unheard): `coilZap` (the kick and the keys), `coilCrack` (the snare), `coilTick` (the hat).
- **The POWER PLANT tile set** (levels/themes.ts `power`; four new pictures in render/textures.ts): `treadPlate`
  (steel tread plate, floors and platforms), `circuitPanel` (dark panels, copper traces, solder pads, a few lit LEDs:
  walls), `steelGirder` (pillars), `copperCoil` (the coil's winding). The room's own walls wear it; a door gets a
  girder frame. In the editor as a theme.
- **The room**: 18 plates spiral up round the coil, safe, kick, snare, over and over (a safe plate never more than two
  away), each a jump from the last (the test climbs it with the real rat, one jump each), to a balcony at 19.2 with a
  crumb; crumbs on two safe plates on the way; the coil keys and their coil by the way in.

## The Spark Beetle (`src/enemies/sparkBeetle.ts`, look in `sparkBeetleModel.ts`; `tests/sparkbeetle.ts`; the Coil Room, Test Room 18)

A new enemy (the owner: "come up with a few different enemy designs"; the rest are designs only, `docs/ENEMY-IDEAS.md`).
A beetle with a copper coil grown into its back. It HUNTS as the roach does (it wraps the roach's own code,
`world/scuttler.ts`: chasing, circling, lunging, biting), and it is CHARGED BY THE COIL'S SNARE (`world/teslaCoil.ts`):

| when | what it does | what he should do |
|------|--------------|-------------------|
| the half beat before each snare | glows up (antennae, coil, a halo); a sword or plunge GLANCES off it | back off |
| on the snare (0.22 s) | DISCHARGES all round it (reach 0.7 beyond its body): a heavy blow, a held shield does not turn it (a parry on the very moment does, as it does any blow) | be out of reach |
| the rest of the bar | SPENT: soft | hit it |

Its numbers: `SPARK` (proof: how charged before blades glance, 0.25; burst reach and damage; hp 4, a roach has fewer).
Its clock is the room's (`clock`, set by main.ts), so it charges on the beat the plates zap on. Placed: two on the
Coil Room's floor round the coil's foot, coming back when beaten, not among the room's goals. Put one anywhere as an
`EnemySpec` with `type: 'sparkbeetle'`; away from a coil it still keeps the same beat (90 bpm, snare on 2 and 4).
*main.ts*: one `addEnemy` branch, and its name in WALKERS (so it walks on ramps).

## A stand-in: another character on the rat's controls (`src/player/standIn.ts`; `tests/standin.ts`; the Stand-in, Test Room 19)

The owner (2026-11-20): "see how close you can get to having one of these other characters control like the main
character". Not a plan for the game: a try. BRAMBLE the hedgehog (npc/patrons.ts) is drawn in the rat's place and
posed from the very same things the rat's model is told each frame (`RatAnimInput`). The rat's controller, collision
and combat are untouched: he plays exactly as the rat does, only the drawing is different.

| the rat does | the hedgehog does |
|------|-----------|
| stands, walks, runs | stands; a quick patter of his short legs, arms swinging, leaning in as he speeds up |
| jumps, falls | arms out and up, a leg tucked; arms high and feet reaching coming down; a squash on landing |
| the 3-hit sword combo | a SEWING NEEDLE: a slash across, back again, an overhead chop; his round body turns with it (the sword trail follows the needle) |
| guards | crouched behind a BOTTLE CAP on his left arm (it always faces forward) |
| dodge roll, backflip, the air jump's flip, long jump, slide, plunge | CURLS INTO A BALL OF SPINES and rolls over (the ball sits higher on a slope so it does not sink into it) |
| rides his shield | rides a big bottle cap like a board; spins and kickflips turn it |
| swims | lies flat, his spiny back at the waterline, paddling |
| hangs, climbs | arms straight up, paws on the edge (he is short: he hangs low), then up and over |
| carries, throws | arms up over his head; a throw brings them down |
| hurt, dead | rocks back; lies on his back |

**How to see it:** the Stand-in room (Test Room 19: steps, a steep slope and a gentle one, a block to hang from, a
pool, two roaches, pots). He walks in as the knight; BRAMBLE waits by the way in. Talk to him to the end and they
SWAP: he is Bramble, and the knight stands where Bramble stood (his own model, in what he wears, turning to watch).
Talk to the knight (his own face in the talk box) to the end and they swap back. Leaving the room undoes it.
The swap is a field on any character (`NpcSpec.swap`: who he becomes, and what the knight says when spoken to), so
another level can have one too. Also: `#as=hedgehog` on any level's address, or `playAs: 'hedgehog'` on a `LevelDef`,
to be him from the start.
**What is not done:** his hit flash (he blinks, as the rat does, but does not glow red), the story gestures (sitting,
waving, pointing) and the wall kick's own pose. The camera is the rat's (he is a little shorter).
**To do another character the same way:** the hedgehog's bones are reached through `rig` on the small regulars
(`makeSmall` in patrons.ts: the moles are built the same way, so they should take the same poses, but for curling up. Not tried).
*main.ts*: what the rat's model is told is kept in `ratAnim` and given to the stand-in too; the stand-in is drawn and
the rat hidden when asked for; the sword trail reads the needle. The swap: `swappedAs`, set when a talk with a `swap`
character is read to its end (`dialog.onFinish`, new in ui/dialog.ts), cleared on loading a level; `knightDouble`.

## New characters (`src/npc/patrons.ts` `class Mole`, `class Hedgehog`; `tests/newcomers.ts`; the Green Room, Test Room 17)

Made as the Club's regulars are: a BUILD (the animal) and a LOOK (one of two of it, by name: colours and a thing or
two about the model). Each does what the regulars do (`doing`: stand, drink, chat, lean, cards, tend; `seated` on a
stool), has a voice (audio/speech.ts, a borrowed recording at its own pitch), a talk-box face (npc/portrait.ts),
and can be cast in a scene (cutscene/stage.ts). Put one in a level as any regular: an `NpcSpec` with its `kind`.

| kind | looks (by name) | what it is |
|------|-----------------|------------|
| `mole` | DIGGER (a miner: yellow helmet with a lit lamp, a tool belt), DOT (round spectacles, a knitted scarf) | short and round, velvet, big pink spade hands with pale claws, a long pink snout that sniffs about, eyes he can hardly open; voice: low and mumbled |
| `hedgehog` | BRAMBLE (brown spines, a green apron), THISTLE (pale spines, a thistle flower in them, rosy cheeks, a bow) | round, a coat of spines over back and head (one mesh), a pointed snout with a twitching nose; voice: quick and bright |

Both share a frame (`class Small`: short legs with round feet that hang off a stool's edge, arms, a mug and a hand of
cards); what differs is built by each. Placed in the Green Room only: Digger and Dot at cards, Bramble keeping a
counter (on a step: a hedgehog is shorter than a counter), Thistle on a stool with a drink. Polished once (2026-11-20,
the owner's word): the moles' spade paws and pointed claws, bigger eyes, whiskers; the hedgehogs' ears (pink inside)
and paws in colour (they were plain white balls). Then (the owner: the hedgehogs "look f****** crazy weird") their
loose cones were replaced by ONE COAT OF SPINES (`spineCoat` in patrons.ts): a mantle over back, sides and the top of
the head, cut into staggered rows of short four-sided points that lean back, each a dark shaft with a pale tip. Its
numbers: how many points round and down, how long, how far round it comes to the face (two numbers for the head:
narrow over the brow, so the spines come down to a point there, and wide by the eyes). Then the FACE (the owner: "their
face still look bad"): a round head with a pale mask, a short snout tipped up with a shiny black button nose, big dark
eyes with a glint (they were white slits sunk in the head), a small mouth that opens as they talk.

## Still to come (and where each will be shown)
Each new part gets a bay in the Workshop and a section here.
