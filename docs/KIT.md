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

## Still to come (and where each will be shown)
Each new part gets a bay in the Workshop and a section here.
