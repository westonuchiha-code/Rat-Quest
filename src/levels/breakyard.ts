/**
 * THE YARD (Test Room 14, 2026-11-20). Things to hit (world/strikeables.ts), each doing what it is for, a bay each
 * along the back wall with a board over it:
 *   ONE LEVER     a lever beside a gated nook: strike it over and the gate lifts.
 *   TWO LEVERS    a gate that waits for both: one either side, too far apart for one swing.
 *   CRACKED WALL  a nook walled up with a cracked slab: three blows (a heavy blade, two) and it is down.
 *   CRACKED FLOOR a stone stage with a cracked slab in its top: plunge onto it and he goes through, into the cellar.
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
  ];
  return { ...def, decor: [...def.decor, ...parts], gates: [...(def.gates ?? []), ...gates] };
}
