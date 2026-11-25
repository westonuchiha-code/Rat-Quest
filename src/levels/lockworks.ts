/**
 * THE LOCKWORKS (Test Room 20, 2026-11-25). NOT A LEVEL: a placeholder room that shows three parts for building
 * levels (world/locks.ts), in the order a level would chain them:
 *   WEIGHT PLATE   a plate that is down only while something is on it, and a gate it holds up. Stand on it and the
 *                  gate lifts; step off and it drops. Carry the crate onto it and the gate stays up.
 *   KEY            behind that gate. Carried over his head (hands full: no sword, no shield) and thrown as a rock is.
 *   LOCKED GATE    bring the key to it. Behind it, a bottle cap.
 *   CHECKPOINTS    two lanterns: one by the way in, one behind the weight gate. The one last touched is where he
 *                  comes back to if he is beaten here.
 * ITS GOAL, ON PURPOSE: none. It is a shelf of parts (as rooms 12 to 19 are); the cap is something to see the locked
 * gate open for, not a thing the room asks of him.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import { keyBox, type Decor, type GateSpec } from '../world/layout';

const HX = 16;
const HZ = 12;
/** The wall across the room, the two gates in it, and what stands where. */
export const LOCKWORKS = {
  wallZ: -2, wallTop: 6, gateHigh: 3.5, gateWide: 3,
  weightGate: -8.5, lockedGate: 8.5,
  plate: { x: -8.5, z: 2.2 }, crate: { x: -12.5, z: 6 },
  key: { x: -8.5, z: -8 }, prize: { x: 8.5, z: -8 },
  lanterns: [{ x: 3, y: 0, z: 8 }, { x: -3.5, y: 0, z: -9 }],
} as const;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const L = LOCKWORKS;
/** The cross wall, with a gap for each gate and a lintel over it. */
const crossWall = (): Piece[] => {
  const gaps = [L.weightGate, L.lockedGate].map((x) => [x - L.gateWide / 2, x + L.gateWide / 2]);
  const z0 = L.wallZ - 0.25;
  const z1 = L.wallZ + 0.25;
  return [
    box('wall', -HX, z0, gaps[0][0], z1, L.wallTop),
    box('wall', gaps[0][1], z0, gaps[1][0], z1, L.wallTop),
    box('wall', gaps[1][1], z0, HX, z1, L.wallTop),
    ...gaps.map(([a, b]) => box('wall', a, z0, b, z1, L.wallTop, { bottom: L.gateHigh })),
    // The back half is two rooms: the key's, and the prize's.
    box('wall', -0.25, -HZ, 0.25, z0, L.wallTop),
  ];
};

const room: CustomLevel = {
  name: 'The Lockworks',
  blurb: 'Parts for building levels: a weight plate and the gate it holds, a key to carry, a locked gate, checkpoints.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 10,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    { t: 'spawn', x0: 0, z0: HZ - 3, x1: 0, z1: HZ - 3, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    ...crossWall(),
    { t: 'crate', x0: L.crate.x, z0: L.crate.z, x1: L.crate.x, z1: L.crate.z, top: 0 },
    // (A barrel too: it holds the plate as well as the crate does.)
    { t: 'barrel', x0: L.crate.x, z0: L.crate.z + 3, x1: L.crate.x, z1: L.crate.z + 3, top: 0 },
    { t: 'cap', x0: L.prize.x, z0: L.prize.z, x1: L.prize.x, z1: L.prize.z, top: 0 },
  ],
};

export function lockworks(): LevelDef {
  const def = compileCustom(room, 'lockworks');
  const plateAt = (def.plates ?? []).length;
  const gates: GateSpec[] = [
    { x: L.weightGate, z: L.wallZ, y: 0, width: L.gateWide, height: L.gateHigh, plates: [plateAt], shut: true },
    { x: L.lockedGate, z: L.wallZ, y: 0, width: L.gateWide, height: L.gateHigh, locked: true },
  ];
  const sign = (x: number, lines: string[]): Decor => ({ kind: 'sign', x, y: 7.6, z: L.wallZ + 0.32, yaw: 0, w: 7.5, h: 2.2, lines, post: 0 });
  return {
    ...def,
    goals: NO_GOALS,
    solids: [...def.solids, keyBox(L.key.x, L.key.z)],
    plates: [...(def.plates ?? []), { x: L.plate.x, y: 0, z: L.plate.z, weight: true }],
    gates: [...(def.gates ?? []), ...gates],
    checkpoints: L.lanterns.map((c) => ({ ...c })),
    decor: [
      ...def.decor,
      sign(L.weightGate, ['WEIGHT PLATE', 'down only while something is on it:', 'carry the crate to it']),
      sign(L.lockedGate, ['LOCKED', 'bring the key: it is carried,', 'and thrown, as a rock is']),
    ],
  };
}
