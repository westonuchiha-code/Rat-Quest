/**
 * The Great Cistern: the first proper open course. One big flooded hall with five landmarks, each seen from the start,
 * each its own little challenge, and linked to each other. Six Golden Wedges, taken in any order; the first opens the door.
 *
 *   SOUTH  The entrance balcony. He starts high up, looking out over the whole cistern; grand stairs lead down.
 *          Underneath it, in its shade, is the Undercroft (a secret wedge right under his feet).
 *   MIDDLE The Tower on its moated island. A spiral of slabs climbs to a chimney behind the tower; wall-kick up it
 *          to a perch, then onto the top. A light burns up there.
 *   WEST   The Bastion: a walled fort full of beasts. In through the gate, or grab the wall top and drop in.
 *          Beat them all and a wedge appears.
 *   NORTH  The Drain Cliffs: three tiers up the north wall (jumps and grabs), then a jump-and-grab up to the High Drain.
 *   EAST   The Pump House, shut. Its gate opens when both floor plates are pressed: one on its roof (ride the lift),
 *          one up on the cliffs.
 *   Bottle caps are on every landmark, in the crate yard, on the Teeth (pillars to hop) and in the moat.
 *
 * Room: x -48..48, z -48..48; north is -z. One jump climbs about 2.5, the double jump about 4.75, and a ledge grab adds
 * about 1 more. A wall kick climbs between two walls close together.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import type { GoalDef, LevelDef, WedgeDef } from './types';
import { doorOn } from '../world/rooms';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

// ---- The old drain (a secret; see the pieces) ----
export const DRAIN_X0 = -48;
export const DRAIN_X1 = -43;
/** The sealed room's south wall; the covered run goes from here to DRAIN_LID_Z1, then the open end to 44. */
export const DRAIN_ROOM_Z1 = 24;
export const DRAIN_LID_Z1 = 38;
/** Faster than he swims (3), slower than the Sludge Scarf (4.5). */
export const DRAIN_CURRENT = 3.2;

// ---- Heights ----
export const SUMMIT = 22;
const BALCONY = 8;
export const CHIMNEY_FLOOR = 12;
export const PERCH = 20;
const TIER1 = 3.2;
const TIER2 = 7;
const TIER3 = 11.5;
const DRAIN = 17;
const FORT = 3;
const FORT_WALL = 6.5;
const PUMP_ROOF = 8.5;

/**
 * The spiral round the tower: floating slabs, each a little higher, winding round so the last one sits just west of the
 * chimney on the north side.
 */
export const SPIRAL = (() => {
  const out: Array<{ x: number; z: number; top: number }> = [];
  const n = 11;
  const step = 0.62;
  const end = (3 * Math.PI) / 2 - 0.62;
  const r = 6.6;
  for (let i = 0; i < n; i++) {
    const a = end - (n - 1 - i) * step;
    out.push({ x: +(r * Math.cos(a)).toFixed(2), z: +(r * Math.sin(a)).toFixed(2), top: +(1 + i * 1.0).toFixed(2) });
  }
  return out;
})();

/** The chimney behind the tower: the tower's north face (z = -3) and a free-standing wall 2.2 north of it. */
const CHIMNEY = { x0: -2.5, x1: 2.5, wallZ0: -7.2, wallZ1: -5.2 };

const course: CustomLevel = {
  name: 'The Great Cistern',
  blurb: 'An open course: a tower, a fort, cliffs and a locked pump house. Six Golden Wedges here (one a secret), more in its three side halls.',
  width: 96, depth: 96, wallHeight: 34,
  music: 'drift',
  pieces: [
    // ---- Ground: four banks round the moat, the island in the middle ----
    box('floor', -42.5, 18, 48, 48, 0),
    box('floor', -48, -48, 48, -18, 0),
    box('floor', -42.5, -18, -18, 18, 0),
    box('floor', -48, -18, -42.5, 15, 0),

    // ---- South-west: the old drain, a secret. Drop in at the open end; the current runs hard back towards it. Under a low
    // stone lid (no room to jump) it runs on to a sealed little room. Only a swimmer faster than the water gets there. ----
    box('river', DRAIN_X0, DRAIN_ROOM_Z1 - 5, DRAIN_X1, 44, -0.85, { dir: 's', props: { speed: DRAIN_CURRENT } }),
    box('floor', -48, 44, -42.5, 48, 0),
    box('floor', DRAIN_X0, DRAIN_ROOM_Z1, DRAIN_X1, DRAIN_LID_Z1, 0, { bottom: -0.1 }),
    box('wall', DRAIN_X1, 15, -42.5, 44, 0, { bottom: -3.5 }),
    box('floor', DRAIN_X0, 15, DRAIN_X1, DRAIN_ROOM_Z1 - 5, 0),
    box('wall', -48, 14.5, -42.5, 15, 6),
    box('wall', -48, DRAIN_ROOM_Z1, -42.5, DRAIN_ROOM_Z1 + 0.5, 6),
    box('wall', DRAIN_X1, 15, -42.5, DRAIN_ROOM_Z1, 6),
    box('platform', -48, 14.5, -42.5, DRAIN_ROOM_Z1 + 0.5, 6.5, { bottom: 6 }),
    at('lamp', -45.5, 18, 5), at('crumb', -45.5, 16.5),
    box('floor', 18, -18, 48, 18, 0),
    box('tile', -10, -10, 10, 10, 0),
    box('water', -18, 10, 18, 18, -0.85),
    box('water', -18, -18, 18, -10, -0.85),
    box('water', -18, -10, -10, 10, -0.85),
    box('water', 10, -10, 18, 10, -0.85),
    box('bridge', -1.5, 10, 1.5, 18, 0),
    box('stone', 13, -1, 15, 1, 0.3),

    // ---- South: the entrance balcony on four pillars, the grand stairs, and the Undercroft beneath ----
    box('platform', -14, 36, 14, 48, BALCONY, { bottom: BALCONY - 1 }),
    box('pillar', -14, 36, -12, 38, BALCONY - 1), box('pillar', 12, 36, 14, 38, BALCONY - 1),
    box('pillar', -14, 46, -12, 48, BALCONY - 1), box('pillar', 12, 46, 14, 48, BALCONY - 1),
    box('stairs', -3, 26, 3, 36, BALCONY, { dir: 's', bottom: 0 }),
    at('spawn', 0, 39, BALCONY),
    at('exit', 0, 48, BALCONY),

    // ---- The Tower: the pillar, the spiral, the chimney and its perch ----
    box('pillar', -3, -3, 3, 3, SUMMIT),
    ...SPIRAL.map((s) => box('platform', s.x - 1.6, s.z - 1.6, s.x + 1.6, s.z + 1.6, s.top, { bottom: s.top - 0.5 })),
    box('platform', CHIMNEY.x0, CHIMNEY.wallZ1, CHIMNEY.x1, -3, CHIMNEY_FLOOR, { bottom: CHIMNEY_FLOOR - 0.5 }),
    box('pillar', CHIMNEY.x0, CHIMNEY.wallZ0, CHIMNEY.x1, CHIMNEY.wallZ1, PERCH, { bottom: CHIMNEY_FLOOR }),

    // ---- West: the Bastion ----
    box('platform', -48, -12, -26, 12, FORT, { bottom: 0 }),
    box('wall', -48, -12, -26, -11, FORT_WALL, { bottom: FORT }),
    box('wall', -48, 11, -26, 12, FORT_WALL, { bottom: FORT }),
    box('wall', -27, -11, -26, -2, FORT_WALL, { bottom: FORT }),
    box('wall', -27, 2, -26, 11, FORT_WALL, { bottom: FORT }),
    box('stairs', -26, -2, -22, 2, FORT, { dir: 'w', bottom: 0 }),
    // The keep inside, with steps up.
    box('platform', -46, -4, -40, 4, FORT + 3, { bottom: FORT }),
    box('stairs', -40, -1, -37, 1, FORT + 3, { dir: 'w', bottom: FORT }),
    at('roach', -32, -7, FORT), at('roach', -32, 7, FORT), at('roach', -36, -5, FORT), at('roach', -36, 6, FORT),
    at('toad', -43, 0, FORT + 3), at('toad', -30, 0, FORT),

    // ---- North: the Drain Cliffs and the High Drain ----
    box('platform', -24, -48, 24, -38, TIER1, { bottom: 0 }),
    box('stairs', 24, -46, 30, -40, TIER1, { dir: 'w', bottom: 0 }),
    box('platform', -24, -48, 24, -43, TIER2, { bottom: TIER1 }),
    box('platform', -8, -48, 24, -45.5, TIER3, { bottom: TIER2 }),
    box('platform', -21, -48, -14, -45, DRAIN, { bottom: DRAIN - 1 }),

    // ---- East: the Pump House (walls, roof, a gate on the plates) and its lift ----
    box('wall', 28, -8, 48, -7, PUMP_ROOF - 0.5),
    box('wall', 28, 11, 48, 12, PUMP_ROOF - 0.5),
    box('wall', 28, -7, 29, 0, PUMP_ROOF - 0.5),
    box('wall', 28, 4, 29, 11, PUMP_ROOF - 0.5),
    box('platform', 28, 0, 29, 4, PUMP_ROOF - 0.5, { bottom: 3.5 }),
    box('platform', 28, -8, 48, 12, PUMP_ROOF, { bottom: PUMP_ROOF - 0.5 }),
    box('gate', 28, 0, 29, 4, 0, { props: { opens: 'plates' } }),
    at('pipe', 47.5, 6, 0, { dir: 'w' }), at('pipe', 47.5, -3, 0, { dir: 'w' }),
    box('lift', 31, -12, 34, -9, 0, { props: { move: 'up', travel: PUMP_ROOF, speed: 2, pause: 2 } }),
    at('plate', 40, 8, PUMP_ROOF),
    at('plate', 18, -45, TIER2),

    // ---- South-west: the Teeth (pillars to hop, a cap on the tallest) ----
    box('pillar', -40, 34, -38, 36, 2), box('pillar', -36, 30, -34, 32, 3.5), box('pillar', -31, 33, -29, 35, 5),
    box('pillar', -27, 28, -25, 30, 6.5), box('pillar', -22, 32, -20, 34, 8), box('pillar', -26, 23, -24, 25, 9.5),

    // ---- South-east: the crate yard ----
    at('crate', 26, 26), at('crate', 27, 26), at('crate', 26, 26, 1), at('crate', 30, 30, 0, { props: { item: 'cap' } }),
    at('crate', 31, 30), at('crate', 34, 25), at('crate', 34, 25, 1), at('crate', 34, 25, 2),
    at('barrel', 38, 33), at('barrel', 39, 33), at('barrel', 38, 34),

    // ---- Bottle caps ----
    at('cap', -25, 24, 9.5),
    at('cap', -43, 2, FORT + 3),
    at('cap', 22, -46.5, TIER3),
    at('cap', 0, -6.2, PERCH),
    at('cap', 14, 0, 0.3),
    at('cap', -9, 45, 0),
    at('cap', 44, 10, PUMP_ROOF),

    // ---- Cheese: trails along each route ----
    at('crumb', 0, 29.5, 3.2), at('crumb', 0, 33.5, 6.4), at('crumb', 0, 22), at('crumb', 0, 14),
    ...[1, 3, 5, 7, 9].map((i) => at('crumb', SPIRAL[i].x, SPIRAL[i].z, SPIRAL[i].top)),
    at('crumb', -20, 0), at('crumb', -23.5, 0, 1.5), at('crumb', -34, 0, FORT),
    at('crumb', 0, -36), at('crumb', -10, -40, TIER1), at('crumb', 10, -44, TIER2), at('crumb', 0, -46.5, TIER3),
    at('crumb', 24, 0), at('crumb', 32.5, -13), at('crumb', 34, 4, PUMP_ROOF),
    at('crumb', -38, 35, 2), at('crumb', -30, 40), at('crumb', 34, 40), at('crumb', 22, 20),

    // ---- Torches either side of the way out, gauges on the pump house ----
    at('torch', -3.5, 47.7, BALCONY + 2.5, { dir: 's' }), at('torch', 3.5, 47.7, BALCONY + 2.5, { dir: 's' }),
    at('gauge', 27.7, -4, 4, { dir: 'e' }), at('gauge', 27.7, 8, 4, { dir: 'e' }),

    // ---- People ----
    at('npc', -5, 39.5, BALCONY, { props: { name: 'Pip', kind: 'mouse', lines: [
      'Squeak! The Great Cistern! See it all from up here? Golden Wedges are hidden all over down there.',
      'One on top of the tower, one in the fort, one up the north cliffs, and more behind the locked pump house...',
      'And some are closer than you think. Three more doors lead off the Cistern, too: the Pump Room, the Waterworks and the Sludge Pit.',
      'Take any wedge and the door behind me opens.',
      'Oh, and the old drain past the Teeth? The water runs too hard for me. Somebody slicker might make it.',
    ] } }),
    at('npc', -2, -36, 0, { props: { name: 'Finch', kind: 'bird', lines: [
      'Chirp! These cliffs go all the way up to the old drain.',
      'Too high to jump onto? Jump anyway, and as you fall past the edge, grab it!',
      'The plate up on the second ledge works something in the pump house, I think.',
    ] } }),

    // ---- Lights and dressing: each landmark has its own colour ----
    at('light', 0, 0, SUMMIT + 2.5, { props: { color: 'yellow' } }),
    at('light', -36, 0, FORT + 5, { props: { color: 'red' } }),
    at('light', -17, -46, DRAIN + 2.5, { props: { color: 'blue' } }),
    at('light', 38, 2, 4, { props: { color: 'green' } }),
    at('lamp', -9, 40, BALCONY + 2.5), at('lamp', 9, 40, BALCONY + 2.5),
    at('lamp', -6, 44, 3), at('lamp', 6, 44, 3),
    at('lamp', -9, 9, 2.5), at('lamp', 9, 9, 2.5), at('lamp', -9, -9, 2.5), at('lamp', 9, -9, 2.5),
    at('lamp', -27, -12, FORT_WALL + 1), at('lamp', -27, 12, FORT_WALL + 1),
    at('lamp', -20, -38, TIER1 + 2.5), at('lamp', 20, -38, TIER1 + 2.5),
    at('lamp', 29, 3.5, 5), at('lamp', 29, -0.5, 5),
    at('chain', -14, -14, 8), at('chain', 14, -14, 8), at('chain', -14, 14, 8), at('chain', 14, 14, 8),
    at('fall', -17.5, -48, DRAIN, { dir: 's' }),
    at('slime', 0, -47.5, 14, { dir: 's' }),
    at('window', -47.5, 30, 10, { dir: 'e' }), at('window', 47.5, 30, 10, { dir: 'w' }),
    at('web', -47.5, -11, FORT + 2, { dir: 'e' }),
  ],
};

const collect = (kind: 'crumb' | 'cap', label: string): GoalDef => ({ type: 'collect', kind, count: 'all', label });

export const CISTERN_WEDGES: WedgeDef[] = [
  { id: 'summit', name: 'Top of the Tower', hint: 'Climb the spiral, then wall-kick up the chimney behind the tower.', x: 0, y: SUMMIT, z: 0, appears: null },
  { id: 'bastion', name: 'Beasts of the Bastion', hint: 'Beat every beast in the west fort.', x: -34, y: FORT, z: 0, appears: { type: 'defeat', label: 'Beat the beasts' } },
  { id: 'drain', name: 'The High Drain', hint: 'Climb the north cliffs. The last one is a jump and a grab.', x: -17.5, y: DRAIN, z: -46.5, appears: null },
  { id: 'caps', name: 'Eight Bottle Caps', hint: 'One on every landmark, one in a crate, one in the moat, one on the Teeth.', x: 6, y: BALCONY, z: 40, appears: collect('cap', 'Find all eight caps') },
  { id: 'under', name: 'The Undercroft', hint: 'Sometimes the best view hides what is underneath you.', x: 0, y: 0, z: 44, appears: null },
  { id: 'current', name: 'Against the Current', hint: 'The old drain past the Teeth runs too hard to swim. Something slick round your neck might help.', x: -45.5, y: 0, z: 18, appears: null },
];

export function cistern(): LevelDef {
  const def = compileCustom(course, 'cistern');
  return {
    ...def,
    theme: 'sewer',
    world: 'cistern',
    // Inside the pump house (behind the gate on the plates), a door into the Pump Room.
    courseDoors: [
      { to: 'pumpworks', name: 'The Pump Room', need: 0, door: doorOn('east', 48, 2, 48, 0) },
      // Past the cliffs, in the north-west corner.
      { to: 'works', name: 'The Waterworks', need: 0, door: doorOn('north', 48, -36, 48, 0) },
      // By the crate yard.
      { to: 'sludgepit', name: 'The Sludge Pit', need: 0, door: doorOn('east', 48, 40, 48, 0) },
      // In the north-east corner, past the cliffs: the way down to where it all drains.
      { to: 'sump', name: 'The Sump', need: 0, door: doorOn('east', 48, -32, 48, 0) },
    ],
    // A big hall: the fog sits further back, so the landmarks can be seen from the balcony.
    fogRange: [40, 150],
    wedges: CISTERN_WEDGES,
    // The goals list is what each wedge asks, so the level checks can see that every one can be met.
    goals: CISTERN_WEDGES.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name }),
  };
}
