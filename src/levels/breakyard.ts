/**
 * THE YARD (Test Room 14, 2026-11-20). Things to hit (world/strikeables.ts), each doing what it is for, a bay each
 * along the back wall with a board over it:
 *   ONE LEVER     a lever beside a gated nook: strike it over and the gate lifts.
 *   TWO LEVERS    a gate that waits for both: one either side, too far apart for one swing.
 *   CRACKED WALL  a nook walled up with a cracked slab: three blows (a heavy blade, two) and it is down.
 *   CRACKED FLOOR a stone stage with a cracked slab in its top: plunge onto it and he goes through, into the cellar.
 * RACE THE GATE (2026-11-20): a pen with a gate a TIMED lever holds up for 4 seconds, then the gate drops again.
 * In each nook, a cheese crumb, for something to find. Kit parts (docs/KIT.md): `lever`, `crackwall`, `crackfloor`
 * decor, and a gate's `levers`.
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor, GateSpec } from '../world/layout';

const HX = 24;
const HZ = 14;
/** The nooks: their walls' top, the gates' height, how far out from the back wall each comes. */
export const NOOK = { top: 6, gate: 3.5, front: -9 } as const;
/** The bays, west to east: the middle of each (along x). */
export const YARD = { oneLever: -18, twoLevers: -6, wall: 6, floor: 18 } as const;
/** The cracked floor's stage: its top, and the hole in it that the slab covers (its middle and half-width). */
export const STAGE = { top: 2, hole: { x: YARD.floor, z: -10, half: 1.5 } } as const;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

/** A nook against the back wall, 5 wide inside, its mouth at z = NOOK.front: two side walls, and over the mouth a lintel above the gate. */
function nook(x: number, lintel: boolean): Piece[] {
  const out = [
    box('wall', x - 3, -HZ, x - 2.5, NOOK.front, NOOK.top),
    box('wall', x + 2.5, -HZ, x + 3, NOOK.front, NOOK.top),
  ];
  if (lintel) out.push(box('wall', x - 2.5, NOOK.front - 0.25, x + 2.5, NOOK.front + 0.25, NOOK.top, { bottom: NOOK.gate }));
  return out;
}

const crumb = (x: number, z: number, top = 0): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });

/** RACE THE GATE (2026-11-20): a pen against the west wall, its gate in its east wall; a TIMED lever out in the room
 * that holds the gate up for `timer` seconds, then springs back, and the gate drops. */
export const RACE = { pen: { x0: -HX, x1: -16, z0: 4, z1: 12 }, gate: { z: 8, half: 1.5 }, lever: { x: -6, z: 8 }, timer: 4, step: 2.5 } as const;
const H = STAGE.hole;
const room: CustomLevel = {
  name: 'The Yard',
  blurb: 'Things to hit: levers that open gates, a cracked wall to knock down, a cracked floor to plunge through.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 12,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    { t: 'spawn', x0: 0, z0: HZ - 3, x1: 0, z1: HZ - 3, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    ...nook(YARD.oneLever, true),
    ...nook(YARD.twoLevers, true),
    ...nook(YARD.wall, false),
    crumb(YARD.oneLever, -12), crumb(YARD.twoLevers, -12), crumb(YARD.wall, -12),
    // The stage: four blocks round the hole, a step up in front; the cellar under the slab is the room's own floor.
    box('stone', YARD.floor - 4, -HZ, YARD.floor + 4, H.z - H.half, STAGE.top, { bottom: 0 }),
    box('stone', YARD.floor - 4, H.z + H.half, YARD.floor + 4, -6, STAGE.top, { bottom: 0 }),
    box('stone', YARD.floor - 4, H.z - H.half, H.x - H.half, H.z + H.half, STAGE.top, { bottom: 0 }),
    box('stone', H.x + H.half, H.z - H.half, YARD.floor + 4, H.z + H.half, STAGE.top, { bottom: 0 }),
    box('stone', YARD.floor - 2, -6, YARD.floor + 2, -4.5, 1, { bottom: 0 }),
    crumb(H.x, H.z),
    // The race pen: its north and south walls, and its east wall either side of the gate, a lintel over the gate.
    box('wall', RACE.pen.x0, RACE.pen.z0 - 0.5, RACE.pen.x1 + 0.5, RACE.pen.z0, NOOK.top),
    box('wall', RACE.pen.x0, RACE.pen.z1, RACE.pen.x1 + 0.5, RACE.pen.z1 + 0.5, NOOK.top),
    box('wall', RACE.pen.x1, RACE.pen.z0, RACE.pen.x1 + 0.5, RACE.gate.z - RACE.gate.half, NOOK.top),
    box('wall', RACE.pen.x1, RACE.gate.z + RACE.gate.half, RACE.pen.x1 + 0.5, RACE.pen.z1, NOOK.top),
    box('wall', RACE.pen.x1, RACE.gate.z - RACE.gate.half, RACE.pen.x1 + 0.5, RACE.gate.z + RACE.gate.half, NOOK.top, { bottom: NOOK.gate }),
    crumb(RACE.pen.x0 + 3, RACE.gate.z),
    // A step inside against the north wall: the way OUT once the gate has dropped behind him (a jump and a second
    // from it clear the wall; from outside there is nothing to climb, so it is no way in).
    box('stone', RACE.pen.x0, RACE.pen.z0, RACE.pen.x0 + 3, RACE.pen.z0 + 2, RACE.step, { bottom: 0 }),
  ],
};

export function breakYard(): LevelDef {
  const def = compileCustom(room, 'breakyard');
  const sign = (x: number, lines: string[]): Decor => ({ kind: 'sign', x, y: NOOK.top + 2.2, z: -HZ + 0.06, yaw: 0, w: 7.5, h: 2.2, lines, post: 0 });
  const parts: Decor[] = [
    // Levers, in order: 0 by the first nook; 1 and 2 either side of the second.
    { kind: 'lever', x: YARD.oneLever + 4.2, y: 0, z: NOOK.front + 1.2, yaw: 0 },
    { kind: 'lever', x: YARD.twoLevers - 4.2, y: 0, z: NOOK.front + 1.2, yaw: 0 },
    { kind: 'lever', x: YARD.twoLevers + 4.2, y: 0, z: NOOK.front + 1.2, yaw: 0 },
    // Lever 3: the timed one, out in the room, facing the pen.
    { kind: 'lever', x: RACE.lever.x, y: 0, z: RACE.lever.z, yaw: -Math.PI / 2, timer: RACE.timer },
    { kind: 'sign', x: RACE.pen.x1 + 0.56, y: NOOK.top - 1.4, z: RACE.pen.z1 - 1.6, yaw: Math.PI / 2, w: 4.6, h: 1.6, lines: ['RACE THE GATE', 'the lever holds it up for 4'], post: 0 },
    { kind: 'crackwall', x: YARD.wall, y: 0, z: NOOK.front, w: 5, h: NOOK.top, d: 0.6 },
    { kind: 'crackfloor', x: H.x, y: STAGE.top, z: H.z, w: H.half * 2, d: H.half * 2 },
    sign(YARD.oneLever, ['ONE LEVER', 'strike it over and the gate', 'lifts. editor: Lever'] ),
    sign(YARD.twoLevers, ['TWO LEVERS', 'the gate waits for both', 'to be over at once'] ),
    sign(YARD.wall, ['CRACKED WALL', 'three blows bring it down,', 'a heavy blade two'] ),
    sign(YARD.floor, ['CRACKED FLOOR', 'it holds him, but a plunge', 'breaks it: into the cellar'] ),
  ];
  const gates: GateSpec[] = [
    { x: YARD.oneLever, z: NOOK.front, width: 5, height: NOOK.gate, levers: [0] },
    { x: YARD.twoLevers, z: NOOK.front, width: 5, height: NOOK.gate, levers: [1, 2] },
    { x: RACE.pen.x1 + 0.25, z: RACE.gate.z, width: RACE.gate.half * 2, height: NOOK.gate, alongZ: true, levers: [3], shut: true },
  ];
  return { ...def, decor: [...def.decor, ...parts], gates: [...(def.gates ?? []), ...gates] };
}
