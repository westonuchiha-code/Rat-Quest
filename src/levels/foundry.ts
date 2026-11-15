/**
 * World Two: the Foundry. Where the cheese is melted down and fed to the machines. Iron, soot and a lake of lava.
 * The old Furnace is folded into the main hall (lava, braziers, a machine); the old Lift Shaft and Cellars are side areas.
 *
 *   SOUTH  The Gantry. He comes in high on an iron walkway over the dock and sees the whole hall. A cage lift and a stair
 *          go down. Under the gantry, in the dark, a bottle cap. Over the west end of the dock, a hornet lancer.
 *   MIDDLE The Crucible: a great iron pot on an island in the lava. Its rim is crawling with beasts (beat them all for a
 *          wedge). Pistons pump up and down its sides; ride them shelf to shelf to the top.
 *          A sliding cart runs from the dock to the island; stepping stones cross from the west bank.
 *   NORTH  The Slag Run: iron beams hung over the lava, a full double jump apart, from the Hopper (a tower on the west bank)
 *          to the Ladle (a block on the east side). Fall and the lava throws you back. Under it, over the north
 *          floor, a firefly bomber.
 *   EAST   The Storehouse, shut. Burst the three steam pipes on the walls and its gate lifts. Inside: the door to the Coal
 *          Cellars. The Slag Heaps (piles to hop) stand in the north-east corner.
 *   WEST   The door to the Lift Shaft.
 *
 * Room: x -48..48, z -48..48; north is -z. A flat double jump carries about 10; a jump, double jump and grab climbs about 5.8.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import type { GoalDef, LevelDef, WedgeDef } from './types';
import { doorOn } from '../world/rooms';
import { extent, type Box, type Decor } from '../world/layout';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const collect = (kind: 'crumb' | 'cap', label: string): GoalDef => ({ type: 'collect', kind, count: 'all', label });

// ---- Heights ----
const GANTRY = 10;
export const CRUCIBLE = 20;
const SHELF1 = 7;
const SHELF2 = 14;
export const RUN = 8;
const STORE_ROOF = 7;

/** The crucible: an iron block on the island. Its faces: west x -5, east x 5, north z -11, south z -1. */
const POT = { x0: -5, x1: 5, z0: -11, z1: -1 };

/** The Slag Run's beams, west to east. Each gap is a little wider than the last (8, 8.5, 9, 9). */
export const BEAMS = [
  { x0: -25, x1: -22 },
  { x0: -13.5, x1: -10.5 },
  { x0: -1.5, x1: 1.5 },
  { x0: 10.5, x1: 13.5 },
];
const BEAM_Z = { z0: -30, z1: -25 };
/** The Furnace Mouth: 21 out from the Crucible's east face and 13.5 below its top (only a royal long jump makes it). */
export const MOUTH = { x0: 26, x1: 30, z0: -8, z1: -4, top: 6.5 };
/** The Hopper (start of the run) and the Ladle (the end). */
const HOPPER = { x0: -42, x1: -33, z0: -32, z1: -25 };
const LADLE = { x0: 22, x1: 30, z0: -31, z1: -24 };

/** The island the Crucible stands on: the Slag Crew are the beasts on it. */
export const ISLAND = { x0: -12, x1: 12, z0: -17, z1: 5 };
/** Where the hornet hangs, over the west end of the dock. */
export const DOCK_HORNET = { x: -36, z: 37 };
/**
 * The north floor's firefly, and its air: the north floor and out over the lava beside it, under the Slag Run (it
 * flies lower than the beams, and round the Hopper and the Ladle, which stand in it).
 */
export const NORTH_FIREFLY = { x: -10, z: -41 };
export const NORTH_AIR = { x0: -46, x1: 31, z0: -47, z1: -26 };

const hall: CustomLevel = {
  name: 'The Foundry',
  blurb: 'A hall of iron round a lake of lava, with the great Crucible in the middle. Six Golden Wedges here (one a secret), more in the Lift Shaft and the Coal Cellars.',
  theme: 'foundry',
  music: 'pump',
  width: 96, depth: 96, wallHeight: 36,
  pieces: [
    // ---- Ground: the dock (south), the banks, the island; lava between ----
    box('floor', -48, 24, 48, 48, 0),
    box('floor', -48, -48, 48, -34, 0),
    box('floor', -48, -34, -30, 24, 0),
    box('floor', 30, -34, 48, 24, 0),
    box('tile', -12, -17, 12, 5, 0),
    box('lava', -30, 5, 30, 24, -0.6),
    box('lava', -30, -34, 30, -17, -0.6),
    box('lava', -30, -17, -12, 5, -0.6),
    box('lava', 12, -17, 30, 5, -0.6),

    // ---- South: the Gantry, its cage lift and stair ----
    box('platform', -16, 40, 16, 48, GANTRY, { bottom: GANTRY - 1 }),
    box('pillar', -16, 40, -14, 42, GANTRY - 1), box('pillar', 14, 40, 16, 42, GANTRY - 1),
    box('pillar', -16, 46, -14, 48, GANTRY - 1), box('pillar', 14, 46, 16, 48, GANTRY - 1),
    box('lift', -1.5, 37, 1.5, 40, 0, { props: { move: 'up', travel: GANTRY, speed: 2.5, pause: 2 } }),
    box('stairs', 16, 41, 28, 47, GANTRY, { dir: 'w', bottom: 0 }),
    at('spawn', 0, 44, GANTRY),
    at('exit', 0, 48, GANTRY),

    // ---- Across the lava: the cart from the dock, and stones from the west bank ----
    box('lift', -1.5, 21, 1.5, 24, 0, { props: { move: 'n', travel: 16, speed: 2.2, pause: 2 } }),
    box('stone', -26, -7, -24, -5, 0.3), box('stone', -18, -7, -16, -5, 0.3),

    // ---- The Crucible, its shelves and pistons ----
    box('pillar', POT.x0, POT.z0, POT.x1, POT.z1, CRUCIBLE),
    box('lift', -4, -0.9, -1, 2.1, 0, { props: { move: 'up', travel: SHELF1 - 1, speed: 1.6, pause: 1.5 } }),
    box('platform', -8, -6, POT.x0, 0, SHELF1, { bottom: SHELF1 - 0.5 }),
    box('lift', -8, -10, POT.x0, -7, SHELF1, { props: { move: 'up', travel: SHELF2 - 1 - SHELF1, speed: 1.6, pause: 1.5 } }),
    box('platform', -8, -14, 0, POT.z0, SHELF2, { bottom: SHELF2 - 0.5 }),
    box('lift', 1, -14, 4, POT.z0 - 0.1, SHELF2, { props: { move: 'up', travel: CRUCIBLE - 1 - SHELF2, speed: 1.6, pause: 1.5 } }),
    // The Slag Crew, all over the rim. An ironback holds the back of the island, behind the Crucible (ram it into the pot).
    // And a Stag Knight on the east rim, facing in across the island: the Crucible's smith, hammer and all.
    at('roach', -9, 3), at('stag', 9, 3, 0, { dir: 'w' }), at('beetle', 2, -14), at('roach', -10, -15),
    at('toad', 9, -6), at('toad', -9, -9),

    // ---- North: the Hopper, the Slag Run, the Ladle ----
    box('platform', HOPPER.x0, HOPPER.z0, HOPPER.x1, HOPPER.z1, RUN, { bottom: 0 }),
    box('stairs', -40, -25, -34, -15, RUN, { dir: 'n', bottom: 0 }),
    ...BEAMS.map((b) => box('platform', b.x0, BEAM_Z.z0, b.x1, BEAM_Z.z1, RUN, { bottom: RUN - 0.5 })),
    box('platform', LADLE.x0, LADLE.z0, LADLE.x1, LADLE.z1, RUN, { bottom: 0 }),
    // Over the north floor, under the run, a firefly bomber: the floor is a strip with the lava along it, and one of
    // the three steam pipes is on its wall. (It does not trouble a rat up on the beams: he is over its head.)
    at('firefly', NORTH_FIREFLY.x, NORTH_FIREFLY.z, 0, { dir: 's' }),

    // ---- East: the Storehouse (shut until the pipes burst), and the Slag Heaps ----
    box('wall', 38, 4, 48, 5, STORE_ROOF - 0.5),
    box('wall', 38, 15, 48, 16, STORE_ROOF - 0.5),
    box('wall', 38, 5, 39, 8, STORE_ROOF - 0.5),
    box('wall', 38, 12, 39, 15, STORE_ROOF - 0.5),
    box('platform', 38, 8, 39, 12, STORE_ROOF - 0.5, { bottom: 3.5 }),
    box('platform', 38, 4, 48, 16, STORE_ROOF, { bottom: STORE_ROOF - 0.5 }),
    box('gate', 38, 8, 39, 12, 0, { props: { opens: 'pipes' } }),
    at('pipe', -20, 47.5, 0, { dir: 'n' }), at('pipe', 10, -47.5, 0, { dir: 's' }), at('pipe', -47.5, -10, 0, { dir: 'e' }),
    box('pillar', 33, -43, 35, -41, 2), box('pillar', 37, -46, 39, -44, 3.5), box('pillar', 41, -42, 43, -40, 5), box('pillar', 44, -46, 46, -44, 6.5),

    // ---- The dock yard: crates and barrels ----
    // A hornet lancer hangs over the west yard's crates (one has a bottle cap in it): the first he meets, on open
    // floor. It is no part of the Slag Crew.
    at('hornet', DOCK_HORNET.x, DOCK_HORNET.z, 0, { dir: 'e' }),
    at('crate', -30, 34), at('crate', -29, 34), at('crate', -30, 34, 1), at('crate', -26, 38, 0, { props: { item: 'cap' } }),
    at('crate', -25, 38), at('barrel', -36, 30), at('barrel', -37, 30), at('barrel', -36, 31, 0, { props: { item: 'crumb' } }),
    at('crate', 34, 30), at('crate', 34, 30, 1), at('barrel', 38, 34),

    // ---- The Furnace Mouth: a secret ledge over the lava by the east bank, far below and out from the Crucible's top. Only a
    // long jump with the Royal Scarf carries that far. ----
    box('pillar', MOUTH.x0, MOUTH.z0, MOUTH.x1, MOUTH.z1, MOUTH.top, { bottom: -1.9, skin: 'magmaRock' }),
    at('brazier', MOUTH.x0 + 0.8, MOUTH.z0 + 0.8, MOUTH.top), at('light', MOUTH.x1 - 0.6, MOUTH.z1 - 0.6, MOUTH.top, { props: { color: 'red', flash: 0.5 } }),

    // ---- Bottle caps: eight ----
    at('cap', -12, 46, 0),
    at('cap', -7, -4, SHELF1),
    at('cap', -40, -30, RUN),
    at('cap', -12, -27.5, RUN),
    at('cap', -17, -6, 0.3),
    at('cap', 45, -45, 6.5),
    at('cap', 44, 7, 0),

    // ---- Cheese: trails along each route ----
    at('crumb', 0, 30), at('crumb', 22, 36), at('crumb', 0, 3), at('crumb', 6, -15), at('crumb', -6.5, -12.5, SHELF2),
    at('crumb', -38, 0), at('crumb', -25, -6, 0.3), at('crumb', -37, -20.5, 4.8), at('crumb', -23.5, -27.5, RUN), at('crumb', 0, -27.5, RUN), at('crumb', 12, -27.5, RUN),
    at('crumb', -10, -40), at('crumb', 20, -40), at('crumb', 34, -42, 2), at('crumb', 36, -10), at('crumb', 36, 20), at('crumb', -40, 40), at('crumb', 40, 40),

    // ---- People ----
    at('npc', -5, 43, GANTRY, { props: { name: 'Finch', kind: 'bird', lines: [
      'Chirp! The Foundry! Smell that? Burnt cheese. They melt it down here for the machines.',
      'The big pot in the middle is the Crucible. Those pistons on its sides go up and down, up and down. Ride them.',
      'And the lava, well. Do not touch the lava. It will not kill you, but it will make you wish it had.',
      'See the little ledge out by the east bank, past the Crucible? Nobody has ever jumped that far. Nobody in a plain scarf, anyway.',
    ] } }),
    at('npc', 34, 10, 0, { props: { name: 'Wren', kind: 'bird', lines: [
      'Chirp! The storehouse is shut tight. There is a door to the coal cellars in there.',
      'Hear that hissing? Three steam pipes on the walls. Burst them all and the pressure lifts the gate. I think.',
    ] } }),

    // ---- Lights and dressing ----
    at('light', -4, -10, CRUCIBLE, { props: { color: 'yellow' } }),
    at('light', 29, -30, RUN, { props: { color: 'blue' } }),
    at('light', -41, -31, RUN, { props: { color: 'purple' } }),
    at('light', 43, 10, STORE_ROOF, { props: { color: 'green' } }),
    at('light', -11, -16, 0, { props: { color: 'red', flash: 1 } }), at('light', 11, -16, 0, { props: { color: 'red', flash: 1 } }),
    at('brazier', -20, 27), at('brazier', 20, 27), at('brazier', -11, 4), at('brazier', 11, 4),
    at('brazier', -33, 22), at('brazier', 33, -32),
    at('lamp', -9, 42, GANTRY + 2.5), at('lamp', 9, 42, GANTRY + 2.5), at('lamp', -6, 44, 3), at('lamp', 6, 44, 3),
    at('lamp', 39, 6, 4), at('lamp', 39, 14, 4),
    at('chain', -20, -10, 12), at('chain', 20, -10, 12), at('chain', -20, 14, 12), at('chain', 20, 14, 12), at('chain', 0, -6, CRUCIBLE + 4),
    at('window', -47.5, 30, 12, { dir: 'e' }), at('window', 47.5, -20, 12, { dir: 'w' }),
    // Gauges: by the machines, the steam pipes and the storehouse.
    at('gauge', -16.5, -47.7, 4.2, { dir: 'n' }), at('gauge', 1.5, -47.7, 4.2, { dir: 'n' }), at('gauge', -6, -47.7, 3.2, { dir: 'n' }),
    at('gauge', -17, 47.7, 3.4, { dir: 's' }), at('gauge', -47.7, -7, 3.4, { dir: 'w' }), at('gauge', 13, -47.7, 3.4, { dir: 'n' }),
    at('gauge', 37.7, 6, 4.4, { dir: 'e' }), at('gauge', 37.7, 14, 4.4, { dir: 'e' }),
  ],
};

export const FOUNDRY_WEDGES: WedgeDef[] = [
  { id: 'crucible', name: 'Top of the Crucible', hint: 'Ride the pistons up the sides of the great pot, shelf to shelf.', x: 0, y: CRUCIBLE, z: -6, appears: null },
  { id: 'crew', name: 'The Slag Crew', hint: 'Beat every beast on the Crucible\'s island.', x: 6, y: 0, z: 2, appears: { type: 'defeat', label: 'Beat the Slag Crew' } },
  { id: 'run', name: 'The Slag Run', hint: 'From the Hopper, double-jump beam to beam over the lava to the Ladle.', x: 26, y: RUN, z: -27.5, appears: null },
  { id: 'steam', name: 'Let Off Steam', hint: 'Burst the three steam pipes on the walls, then look in the storehouse.', x: 43, y: 0, z: 12, appears: { type: 'burst', count: 'all', label: 'Burst the steam pipes' } },
  { id: 'mouth', name: 'The Furnace Mouth', hint: 'A ledge by the east bank, far out and far below the top of the Crucible. A plain long jump falls short. A royal one might not.', x: 28, y: MOUTH.top, z: -6, appears: null, gear: 'royalScarf' },
  { id: 'caps', name: 'Eight Bottle Caps', hint: 'Under the gantry, in a crate, on the pot, on the Hopper, on a beam, on a stone, on the heaps, in the store.', x: 6, y: GANTRY, z: 44, appears: collect('cap', 'Find all the caps') },
];

/**
 * A boiler machine against a wall, facing `yaw` (0 = facing south, +z; only quarter turns). The decor, and boxes that
 * match its shape so he bumps into it (the body, the hopper on its front, the boiler on top).
 */
function machine(x: number, z: number, yaw: number): { decor: Decor; solids: Box[] } {
  const cs = Math.round(Math.cos(yaw));
  const sn = Math.round(Math.sin(yaw));
  const part = (lx0: number, lx1: number, y0: number, y1: number, lz0: number, lz1: number): Box => {
    const xs = [x + lx0 * cs + lz0 * sn, x + lx1 * cs + lz1 * sn];
    const zs = [z - lx0 * sn + lz0 * cs, z - lx1 * sn + lz1 * cs];
    return { ...extent('stone', Math.min(...xs), Math.max(...xs), y0, y1, Math.min(...zs), Math.max(...zs)), hidden: true };
  };
  return {
    decor: { kind: 'machine', x, y: 0, z, yaw },
    solids: [part(-1.9, 1.9, 0, 3.4, 0, 1.6), part(0.65, 1.45, 1.6, 2.4, 1.6, 2.4), part(-1.2, 0.4, 3.4, 5.5, 0, 1.6)],
  };
}

export function foundry(): LevelDef {
  const def = compileCustom(hall, 'foundry');
  // Two of the machines the cheese is fed to, against the north wall.
  const machines = [machine(-20, -47.95, 0), machine(-2, -47.95, 0)];
  return {
    ...def,
    world: 'foundry',
    // (The Slag Crew's wedge asks for the beasts on the island, as it says: nothing off it counts towards it.)
    enemies: def.enemies.map((e) => (e.x > ISLAND.x0 && e.x < ISLAND.x1 && e.z > ISLAND.z0 && e.z < ISLAND.z1 ? e : e.type === 'firefly' ? { ...e, uncounted: true, arena: NORTH_AIR } : { ...e, uncounted: true })),
    solids: [...def.solids, ...machines.flatMap((m) => m.solids)],
    decor: [
      ...def.decor,
      ...machines.map((m) => m.decor),
      { kind: 'mark', glyph: 'crown', x: -11, y: 6, z: -47.97, yaw: 0, size: 0.8, color: 0x7d6a92 },
      // Pipe runs: along the north wall feeding the two machines, and along the south wall under the gantry.
      { kind: 'pipe', a: [-44, 7.5, -47.5], b: [44, 7.5, -47.5], r: 0.4, color: 0x6a5a4a },
      { kind: 'pipe', a: [-20.4, 7.5, -47.5], b: [-20.4, 5.4, -47.5], r: 0.3, color: 0x6a5a4a },
      { kind: 'pipe', a: [-2.4, 7.5, -47.5], b: [-2.4, 5.4, -47.5], r: 0.3, color: 0x6a5a4a },
      { kind: 'pipe', a: [-44, 9, -47.5], b: [44, 9, -47.5], r: 0.25, color: 0x5a5a62 },
      { kind: 'pipe', a: [-44, 6, 47.5], b: [-17, 6, 47.5], r: 0.35, color: 0x6a5a4a },
      { kind: 'pipe', a: [17, 6, 47.5], b: [44, 6, 47.5], r: 0.35, color: 0x6a5a4a },
      { kind: 'pipe', a: [47.5, 7, -30], b: [47.5, 7, 30], r: 0.35, color: 0x6a5a4a },
    ],
    courseDoors: [
      { to: 'shaft', name: 'The Lift Shaft', need: 0, door: doorOn('west', 48, 14, 48, 0) },
      // Inside the storehouse, behind the gate on the pipes.
      { to: 'coalcellars', name: 'The Coal Cellars', need: 0, door: doorOn('east', 48, 10, 48, 0) },
    ],
    fogRange: [40, 150],
    wedges: FOUNDRY_WEDGES,
    goals: FOUNDRY_WEDGES.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name }),
  };
}

// ======================================================================================================================
// Side area: the Lift Shaft (the old Lift Shaft, now off the Foundry's west bank). In by the bottom; the prize is at the top.

const shaftArea: CustomLevel = {
  name: 'The Lift Shaft',
  blurb: 'An old shaft off the Foundry. Ride the lifts, hop the pillars and cross the planks at the top. There is nothing under you.',
  theme: 'foundry',
  width: 44, depth: 44, wallHeight: 26,
  pieces: [
    box('floor', -8, 10, 8, 22, 0),
    at('spawn', 0, 18),
    at('exit', 0, 22),
    box('lift', -1.5, 7, 1.5, 10, 0, { props: { move: 'up', travel: 5, speed: 2, pause: 2 } }),
    box('platform', -5, 1, 5, 7, 5),
    box('lift', 5, 2, 8, 5, 5, { props: { move: 'e', travel: 9, speed: 2.5, pause: 2 } }),
    box('platform', 17, -1, 22, 6, 5),
    box('pillar', 19, -5, 21, -3, 6.5), box('pillar', 19, -9, 21, -7, 8), box('pillar', 19, -13, 21, -11, 9.5),
    box('platform', 16, -22, 22, -15, 9.5),
    box('lift', 13, -22, 16, -19, 9.5, { props: { move: 'up', travel: 6, speed: 2, pause: 2 } }),
    box('platform', 4, -22, 13, -19, 15.5),
    box('plank', -20, -22, 4, -19, 15.5),
    box('platform', -22, -22, -20, -14, 15.5),
    at('crumb', 0, 4, 5), at('crumb', 20, 3, 5), at('crumb', 20, -4, 6.5), at('crumb', 20, -12, 9.5), at('crumb', 20, -18, 9.5), at('crumb', 8, -20.5, 15.5), at('crumb', -8, -20.5, 15.5), at('crumb', -21, -16, 15.5),
    at('roach', 0, 4, 5), at('toad', 8, -20.5, 15.5),
    at('lamp', -6, 18, 3), at('lamp', 6, 18, 3), at('lamp', 0, 2, 8), at('lamp', 20, 4, 8), at('lamp', 8, -21, 18),
    at('chain', -3, 3, 9), at('chain', 12, -4, 14),
    at('light', -21, -21, 15.5, { props: { color: 'yellow' } }),
    at('npc', 4, 16, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! This shaft is old. The lifts still work, mostly.', 'Step on, ride up, and step off when it stops. Do not fall!', 'Something shiny is up at the very top, past the planks.'] } }),
  ],
};

export const SHAFT_WEDGES: WedgeDef[] = [
  { id: 'top', name: 'Top of the Shaft', hint: 'Lifts, pillars, another lift, then all the way along the planks.', x: -21, y: 15.5, z: -18, appears: null },
  { id: 'crumbs', name: 'Every Crumb in the Shaft', hint: 'Cheese on every landing, all the way up.', x: -4, y: 0, z: 14, appears: collect('crumb', 'Find every crumb') },
];

export function foundryShaft(): LevelDef {
  const def = compileCustom(shaftArea, 'shaft');
  return { ...def, world: 'foundry', returnTo: 'foundry', wedges: SHAFT_WEDGES, goals: SHAFT_WEDGES.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name }) };
}

// ======================================================================================================================
// Side area: the Coal Cellars (the old Cellars, now under the Foundry's storehouse). Two plates open the gate.

/**
 * The Coal Bin (a gear secret: the Cleaver). The north-west corner behind the gate is walled off to the roof; the only
 * way in is a doorway filled by one crate twice the usual size, bound in iron. A plain sword, a plunge and its blast
 * all ring off it; only a blade that hits twice as hard breaks it.
 */
export const BIN = { x0: -22, x1: -19, z0: -22, wallZ: -19.5, doorX0: -21, crate: 2 };
export const BIN_CRATE: Box = { ...extent('rubble', BIN.doorX0, BIN.x1, 0, BIN.crate, BIN.wallZ - 0.5, BIN.wallZ + 1.5), tough: true };

const cellarArea: CustomLevel = {
  name: 'The Coal Cellars',
  blurb: 'Under the storehouse. Two plates open the gate. Beasts, coal barrels and a high ledge.',
  theme: 'foundry',
  width: 44, depth: 44, wallHeight: 12,
  pieces: [
    box('floor', -22, -22, 22, 22, 0),
    at('spawn', 0, 18),
    at('exit', 0, 22),
    box('wall', -9, 4, -8, 22, 6), box('wall', 8, 4, 9, 22, 6),
    at('plate', -15, 16), at('plate', 15, 16),
    at('stag', -15, 10, 0, { dir: 's' }), at('roach', 15, 10), at('toad', 0, 8),
    box('wall', -22, -5, -4, -4, 6), box('wall', 4, -5, 22, -4, 6),
    box('gate', -4, -5, 4, -4, 0, { props: { opens: 'plates' } }),
    box('pillar', -12, -12, -10, -10, 5), box('pillar', 10, -12, 12, -10, 5), box('pillar', -2, -15, 0, -13, 5),
    at('toad', -15, -17), at('toad', 15, -17), at('beetle', 0, -9),
    at('barrel', -18, -8, 0, { props: { item: 'cap' } }), at('barrel', -18, -10), at('crate', 18, -8, 0, { props: { item: 'crumb' } }), at('crate', 18, -10),
    box('stairs', 16, -18, 19, -12, 3, { dir: 'n', bottom: 0 }),
    box('platform', 14, -22, 22, -18, 3),
    at('cap', -20, 20), at('cap', 20, 20), at('cap', -6, -20),
    at('crumb', 0, 14), at('crumb', -15, 6), at('crumb', 15, 6), at('crumb', -10, -18), at('crumb', 10, -18),
    at('lamp', -6, 20, 3), at('lamp', 6, 20, 3), at('chain', -3, 10, 7), at('chain', 3, 10, 7),
    // The Coal Bin: a walled corner behind the gate, shut by one huge iron-bound crate (see BIN).
    box('wall', BIN.x1, BIN.z0, BIN.x1 + 1, BIN.wallZ + 1, 12), box('wall', BIN.x0, BIN.wallZ, BIN.doorX0, BIN.wallZ + 1, 12),
    box('wall', BIN.doorX0, BIN.wallZ, BIN.x1, BIN.wallZ + 1, 12, { bottom: BIN.crate }),
    at('brazier', -13, -21), at('light', 20, -21, 3, { props: { color: 'yellow' } }),
    at('window', -21.5, 0, 5, { dir: 'e' }), at('window', 21.5, 0, 5, { dir: 'w' }),
    at('npc', 5, 19, 0, { props: { name: 'Wren', kind: 'bird', lines: ['Chirp! It is dark down here. Stand on both plates and the gate lifts.', 'The roaches guard the side bays. The toad in the middle spits, so mind it. Behind the gate there is an ironback: its shell turns a sword, so go round behind it, or let it run into a wall.', 'Caps in the corners, and something up on the ledge in the far corner.'] } }),
  ],
};

export const CELLAR_WEDGES: WedgeDef[] = [
  { id: 'crew', name: 'Clear the Cellars', hint: 'Beat every beast, in the bays and behind the gate.', x: 0, y: 0, z: -18, appears: { type: 'defeat', label: 'Beat every beast' } },
  { id: 'ledge', name: 'The Coal Ledge', hint: 'Up the stair in the far corner, behind the gate.', x: 19, y: 3, z: -20, appears: null },
  { id: 'caps', name: 'Four Caps in the Coal', hint: 'One in each bay\'s corner, one in a barrel, one by the back wall.', x: -4, y: 0, z: 14, appears: collect('cap', 'Find every cap') },
  { id: 'bin', name: 'The Coal Bin', hint: 'Behind the gate, a walled corner shut with a crate bound in iron. A rat sword rings off it. Something that hits twice as hard would not.', x: -20.5, y: 0, z: -21.2, appears: null, gear: 'cleaver' },
];

export function foundryCellars(): LevelDef {
  const def = compileCustom(cellarArea, 'coalcellars');
  // Bare shelves along the back wall of the middle bay.
  const shelves: Box[] = [-4.4, 4.4].map((x) => ({ ...extent('plank', x - 1.75, x + 1.75, 0, 2.5, -22, -21.5), hidden: true }));
  return {
    ...def,
    world: 'foundry',
    returnTo: 'foundry',
    solids: [...def.solids, ...shelves, BIN_CRATE],
    crateContents: [...def.crateContents, null],
    decor: [...def.decor, { kind: 'shelf', x: 4.4, y: 0, z: -21.97, yaw: 0, width: 3.4, height: 2.5 }, { kind: 'shelf', x: -4.4, y: 0, z: -21.97, yaw: 0, width: 3.4, height: 2.5 }],
    wedges: CELLAR_WEDGES,
    goals: CELLAR_WEDGES.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name }),
  };
}
