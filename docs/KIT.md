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
| crush   | a CRUSHER: waits up (`hold`), shakes for the last half second, slams down `depth` (as a weight falls), sits (`pause`), winds back up at `speed`. Coming down on him: a heavy blow (2), and he is put out from under it at once the shortest way that is not into a wall. He can ride its top. | `hold` 1.6, `depth` 3, `pause` 0.8, rise 1.5, `thick` 2 | how far it drops |

A spring is striped (hazardTrim), a crumbling one is rubble, unless a `skin` is given. A spring sets his upward speed
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

### Flame jets (`flamejet` in hazards.ts; `tests/press.ts`; the Press, Test Room 16)

`{ kind: 'flamejet', x, y, z, yaw, up?, length, period, on, phase }`: a nozzle in a wall pointing along `yaw` (or in
the floor pointing up, `up`). It burns for `on` seconds of every `period`, after 0.6 s of a blue pilot flame; the
flame grows out and dies back in 0.15 s. It burns as fire does (`takeBurn`: no roll helps; the Ember Helm keeps it
off). Creatures in it are struck too, but not a firefly. A roar as it lights (`flameRoar`, unheard). In the editor:
Flame jet (on the floor it points up; turned, it is in a wall pointing out).

The Press also shows the crusher (above): a corridor under three crushers out of step, and one to ride up to a ledge.
ICE, asked for with these, was already a part: the editor's Ice floor (a slick floor, `slick: true`).

## Still to come (and where each will be shown)
Each new part gets a bay in the Workshop and a section here.
