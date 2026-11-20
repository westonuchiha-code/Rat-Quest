/**
 * THE MUSIC ROOM (Test Room 13, 2026-11-20). The owner, the same day: "a room ... has those buttons ... but each one of
 * those buttons represents a different sound, we could use it to do like tonal music puzzles ... it'll play some
 * certain sounds and then you have to hit the buttons in the order" and "a keyboard on the floor in each key will be
 * represented like a real key so that you could play the piano but we'll make it run through one of those sound chips".
 *
 * On the left, a FLOOR PIANO: one octave from middle C, eight white keys and five black, each its own note on the chip
 * (audio/synth.ts chipNote). On the right, an ECHO PUZZLE: four coloured pads (C, E, G and the C above) and a white
 * start pad; step on the start pad, listen, and play the tune back; three rounds, each a note longer, and it is solved.
 * How both play: world/musicFloor.ts. Both are kit parts (docs/KIT.md): `floorkey` and `chime` decor.
 */
import { compileCustom, type CustomLevel } from './custom';
import type { LevelDef } from './types';
import type { Decor, GateSpec } from '../world/layout';

const HX = 26;
const HZ = 15;

/** The piano: where its first white key's west edge is, along x; the keys' width and length; the notes. */
export const PIANO = { x0: -23, z: -5, white: { w: 1.8, d: 6 }, black: { w: 1.1, d: 3.4 } } as const;
const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11, 12];
/** A black key sits over the join after these white keys (C#, D#, F#, G#, A#). */
const BLACK_AFTER: Array<[number, number]> = [[0, 1], [1, 3], [3, 6], [4, 8], [5, 10]];

/** The echo puzzle: its middle, how far out the pads are, their notes and colours (red C, yellow E, green G, blue C). */
export const ECHO_AT = { x: 13, z: -5, out: 2.9, r: 1.3 } as const;
const PADS: Array<[number, number, number, number]> = [
  [0, -1, 0, 0xd84a4a], // north: C, red
  [1, 0, 4, 0xe8c040], // east: E, yellow
  [0, 1, 7, 0x4ac060], // south: G, green
  [-1, 0, 12, 0x4a80e0], // west: the C above, blue
];

export function pianoKeys(y = 0): Decor[] {
  const out: Decor[] = WHITE_NOTES.map((note, i) => ({
    kind: 'floorkey', x: PIANO.x0 + PIANO.white.w * (i + 0.5), y, z: PIANO.z, w: PIANO.white.w, d: PIANO.white.d, note,
  }));
  for (const [after, note] of BLACK_AFTER) {
    out.push({
      kind: 'floorkey', x: PIANO.x0 + PIANO.white.w * (after + 1), y, z: PIANO.z - PIANO.white.d / 2 + PIANO.black.d / 2,
      w: PIANO.black.w, d: PIANO.black.d, note, black: true,
    });
  }
  return out;
}

export function echoPads(puzzle = 'echo', y = 0): Decor[] {
  const out: Decor[] = PADS.map(([dx, dz, note, color], slot) => ({ kind: 'chime', x: ECHO_AT.x + dx * ECHO_AT.out, y, z: ECHO_AT.z + dz * ECHO_AT.out, r: ECHO_AT.r, note, color, puzzle, slot }));
  // The start pad, in front, white, a low G.
  out.push({ kind: 'chime', x: ECHO_AT.x, y, z: ECHO_AT.z + ECHO_AT.out * 2.4, r: 1, note: -5, color: 0xe8e4dc, puzzle, slot: -1 });
  return out;
}

/** A nook in the east wall that the echo puzzle opens (a gate's `echo`): its walls, mouth and gate. */
export const PRIZE = { x0: HX - 5, mouth: HX - 5, z: 5, half: 2.75, top: 6, gate: 3.5 } as const;

const room: CustomLevel = {
  name: 'The Music Room',
  blurb: 'A piano on the floor to walk on, and an echo puzzle: listen to the tune, then play it back.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 12,
  pieces: [
    { t: 'floor', x0: -HX, z0: -HZ, x1: HX, z1: HZ, top: 0 },
    { t: 'spawn', x0: 0, z0: HZ - 3, x1: 0, z1: HZ - 3, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    // The prize nook: two walls out from the east wall, a lintel over its gate, and a cheese crumb inside.
    { t: 'wall', x0: PRIZE.x0, z0: PRIZE.z - PRIZE.half - 0.5, x1: HX, z1: PRIZE.z - PRIZE.half, top: PRIZE.top },
    { t: 'wall', x0: PRIZE.x0, z0: PRIZE.z + PRIZE.half, x1: HX, z1: PRIZE.z + PRIZE.half + 0.5, top: PRIZE.top },
    { t: 'wall', x0: PRIZE.mouth - 0.25, z0: PRIZE.z - PRIZE.half, x1: PRIZE.mouth + 0.25, z1: PRIZE.z + PRIZE.half, top: PRIZE.top, bottom: PRIZE.gate },
    { t: 'crumb', x0: HX - 2.5, z0: PRIZE.z, x1: HX - 2.5, z1: PRIZE.z, top: 0 },
  ],
};

export function musicRoom(): LevelDef {
  const def = compileCustom(room, 'musicroom');
  const boards: Decor[] = [
    { kind: 'sign', x: PIANO.x0 + PIANO.white.w * 4, y: 4.5, z: -HZ + 0.06, yaw: 0, w: 9, h: 2.2, lines: ['FLOOR PIANO', 'step on a key to play it,', 'the black ones too'], post: 0 },
    { kind: 'sign', x: ECHO_AT.x, y: 4.5, z: -HZ + 0.06, yaw: 0, w: 9, h: 2.2, lines: ['ECHO', 'stand on the white pad, listen,', 'then play the tune back'], post: 0 },
  ];
  // The gate the echo puzzle lifts (main.ts updateGates: a gate's `echo`).
  const gates: GateSpec[] = [{ x: PRIZE.mouth, z: PRIZE.z, width: PRIZE.half * 2, height: PRIZE.gate, alongZ: true, echo: 'echo' }];
  return { ...def, decor: [...def.decor, ...pianoKeys(), ...echoPads(), ...boards], gates: [...(def.gates ?? []), ...gates] };
}
