/**
 * THE GLIMMER DEEP: the glowing cave as a REAL level. A side area of the Hollows (a door in the Hollows' east wall).
 *
 * The owner's list, 2026-11-16: "a real level for the glowing cave (it is only a try-out room)". The try-out
 * (glowcave.ts) settled how the theme is made: a dark place (`ambient`), bare rock, and everything that glows PUT ON
 * the rock in its own place. This is a place to play in, made of the same things.
 *
 * ITS SHAPE: he comes in on the Landing, in the south. Before him the cave is split from wall to wall by the RIFT, ten
 * across and seven deep (its floor is the level's zero; the Landing is seven up). Beyond it is the Far Bank, a little higher than the Landing; and all down the east side
 * stands the High Shelf, too high to climb to from anywhere.
 *   - Out of the Rift grow four great yellow mushrooms, the CAPS, each a running jump from the last and higher: the
 *     way up to the High Shelf, and the only one. (A wedge: The High Shelf.)
 *   - Down in the Rift, where the Caps have their feet, live two Lamp Scorpions. (A wedge: Lamps Out.) He can drop in
 *     from either bank; shelf mushrooms growing out of its walls at its west end are the way out (`SHELVES_HOME`,
 *     `SHELVES_BANK`): they glow, so the way out is the plainest thing down there.
 *   - Over the Far Bank fly three glow bugs, each its own colour. They are there to be fought and count toward nothing.
 * Three things to find, each got by moving well: a bottle cap in the air between the third Cap and the fourth; a
 * bottle cap at the bottom of the Rift, in the pocket behind the last Cap's foot; a relic on the tall pink mushroom
 * of the Far Bank, a climb of five and a half.
 */
import type { LevelDef, WedgeDef, GoalDef } from './types';
import { bracketSolids, ceilingOf, extent, mushroomSolids, mushroomTop, type Box, type Decor } from '../world/layout';
import type { CollectibleDef } from '../world/collectibles';
import { doorOn } from '../world/rooms';

export const GLIMMER = { halfX: 24, halfZ: 20, wall: 24 } as const;
/**
 * How high the Landing is. (The Rift's floor is the level's zero and everything else is up from it: he is sent back
 * to where he started from six below zero, so nothing he is meant to walk on may be down there.)
 */
export const LANDING = 7;
/** The Rift: from wall to wall, between these z, this deep. */
export const RIFT = { z0: 2, z1: 12, floor: 0 } as const;
/** How high the Far Bank is, and the High Shelf, and where the Shelf's west edge is. */
export const FAR_BANK = LANDING + 2.5;
export const HIGH_SHELF = { y: LANDING + 9.5, x0: 15.5 } as const;
/**
 * The Caps: [x, z, the height of its top]. From the Landing's edge by the west end of the Rift, east along it: each
 * about six and a half from the last and nearly two higher (he lands a running jump eight off at two up), the last a
 * jump from the High Shelf's edge.
 */
export const CAPS: ReadonlyArray<readonly [number, number, number]> = [
  [-9, 8.6, LANDING + 1.9],
  [-3, 6.4, LANDING + 3.8],
  [3.4, 8.2, LANDING + 5.7],
  [9.6, 5.8, LANDING + 7.6],
];
export const CAP_WIDE = 1.5;
export const CAP_STEM = 0.4;
/**
 * THE WAY OUT OF THE RIFT: shelf mushrooms growing out of its walls at its west end, each a jump above the last.
 * (The owner, 2026-11-16. Of three steps of rock in the wall's own picture: "I genuinely couldn't see these stairs".
 * Of the same in pale cut stone: "now they feel out of place in the environment ... those steps could also just be
 * like mushrooms growing out of the wall that you jump up to get up top, Which would also really fit the aesthetic".)
 * They GLOW, so they are the plainest thing down there. Two ladders: amber up the Landing's face, to the door he came
 * in by; pink up the Far Bank's face and round onto the west wall, to the Far Bank. [x, z, the way it grows out, top]
 */
export const SHELF = { wide: 1.5, deep: 2 } as const;
export type Shelf = readonly [x: number, z: number, yaw: number, top: number];
export const SHELVES_HOME: readonly Shelf[] = [
  [-14, RIFT.z1, Math.PI, 1.75],
  [-17.2, RIFT.z1, Math.PI, 3.5],
  [-20.4, RIFT.z1, Math.PI, 5.25],
];
export const SHELVES_BANK: readonly Shelf[] = [
  [-14, RIFT.z0, 0, 1.9],
  [-17.2, RIFT.z0, 0, 3.8],
  [-20.4, RIFT.z0, 0, 5.7],
  [-GLIMMER.halfX, RIFT.z0 + SHELF.wide, Math.PI / 2, 7.6],
];
/** The tall pink mushroom of the Far Bank: where it stands and how tall it is. */
export const SPIRE = { x: -17, z: -11, tall: 5.5 } as const;
export const GLIMMER_PRIZES = { air: 'glimmer-cap-air', deep: 'glimmer-cap-deep', spire: 'glimmer-relic-spire' } as const;

const PINK = 0xff4aa8;
const ORANGE = 0xff8a2a;
const BLUE = 0x4ad8ff;
const MOSS = 0x18b4f0;
const LICHEN = 0x14a078;
const GREEN = 0x6aff6a;
const YELLOW = 0xffe04a;
const AMBER = 0xffb03a;

export const GLIMMER_WEDGES: WedgeDef[] = [
  { id: 'shelf', name: 'The High Shelf', hint: 'Four great caps grow up out of the Rift. Each is a running jump from the last, and the last is a jump from the shelf.', x: 20, y: HIGH_SHELF.y, z: -8, appears: null },
  { id: 'lamps', name: 'Lamps Out', hint: 'Two Lamp Scorpions keep the bottom of the Rift. Put out both. The glowing shelves at its west end are the way back up: amber to the door, pink to the far bank.', x: 2, y: RIFT.floor, z: 9.6, appears: { type: 'defeat', label: 'Put out both lamps' } },
];
const goalsOf = (ws: WedgeDef[]): GoalDef[] => ws.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name });

export function glimmerDeep(): LevelDef {
  const G = GLIMMER;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const rock = (b: Box): Box => ({ ...b, skin: 'caveRock' });
  const ground = (b: Box): Box => ({ ...b, skin: 'caveFloor' });
  const BELOW = RIFT.floor - 1;
  // The ground, south to north: the Landing, the Rift's floor, the Far Bank. And the High Shelf down the east side.
  // (Each keeps inside the walls and clear of the others: nothing here lies inside anything else.)
  solids.push(ground(extent('floor', -G.halfX, G.halfX, BELOW, LANDING, RIFT.z1, G.halfZ)));
  solids.push(ground(extent('floor', -G.halfX, HIGH_SHELF.x0, BELOW, RIFT.floor, RIFT.z0, RIFT.z1)));
  solids.push(ground(extent('floor', -G.halfX, HIGH_SHELF.x0, BELOW, FAR_BANK, -G.halfZ, RIFT.z0)));
  solids.push(rock(extent('stone', HIGH_SHELF.x0, G.halfX, BELOW, HIGH_SHELF.y, -G.halfZ, RIFT.z1)));
  for (const [x0, x1, z0, z1] of [[-G.halfX - 1, -G.halfX, -G.halfZ - 1, G.halfZ + 1], [G.halfX, G.halfX + 1, -G.halfZ - 1, G.halfZ + 1], [-G.halfX, G.halfX, -G.halfZ - 1, -G.halfZ], [-G.halfX, G.halfX, G.halfZ, G.halfZ + 1]]) {
    solids.push(rock(extent('wall', x0, x1, BELOW, G.wall, z0, z1)));
  }
  // The way out of the Rift: the shelf mushrooms, each solid as it is drawn.
  for (const [list, color] of [[SHELVES_HOME, AMBER], [SHELVES_BANK, PINK]] as const) {
    for (const [x, z, yaw, top] of list) {
      decor.push({ kind: 'bracket', x, y: top, z, yaw, wide: SHELF.wide, deep: SHELF.deep, color });
      solids.push(...bracketSolids(x, top, z, yaw, SHELF.wide, SHELF.deep));
    }
  }
  // A low shelf of rock on the Landing and two on the Far Bank, to break the floors up. (None near the High Shelf,
  // and no mushroom tall enough to stand on near it either: the first lay-out had a ledge five and a half from its
  // edge, and from that ledge he could get up onto the Shelf without the Caps. A test tries every such place.)
  const ledges: Array<[number, number, number, number, number, number]> = [
    [10, 15.5, 14.5, G.halfZ, LANDING, 1.2],
    [-G.halfX, -19, -G.halfZ, -15, FAR_BANK, 1.1],
    [0, 6, -G.halfZ, -17, FAR_BANK, 1.3],
  ];
  for (const [x0, x1, z0, z1, floor, rise] of ledges) solids.push(rock(extent('stone', x0, x1, floor, floor + rise, z0, z1)));

  // The Caps: each stands on the Rift's floor and is as tall as its top is above it.
  for (const [x, z, top] of CAPS) {
    const size = top - RIFT.floor + CAP_WIDE * 0.032;
    decor.push({ kind: 'mushroom', x, y: RIFT.floor, z, size, color: YELLOW, cap: CAP_WIDE, stem: CAP_STEM });
    solids.push(...mushroomSolids(x, RIFT.floor, z, size, CAP_WIDE, CAP_STEM));
  }
  // The Spire, on the Far Bank.
  decor.push({ kind: 'mushroom', x: SPIRE.x, y: FAR_BANK, z: SPIRE.z, size: SPIRE.tall, color: PINK, cap: 1.3, stem: 0.3 });
  solids.push(...mushroomSolids(SPIRE.x, FAR_BANK, SPIRE.z, SPIRE.tall, 1.3, 0.3));

  // Mushrooms in stands. [x, z, floor, height, colour]
  const L = LANDING;
  const F = FAR_BANK;
  const R = RIFT.floor;
  const S = HIGH_SHELF.y;
  const stands: Array<[number, number, number, number, number]> = [
    // The Landing: by the door, and along the Rift's lip.
    [-6.5, 17.4, L, 1.4, BLUE], [-7.6, 18.4, L, 0.7, PINK], [-5.4, 18.6, L, 0.6, BLUE],
    [7.4, 17.8, L, 1.1, ORANGE], [8.5, 18.8, L, 0.6, PINK],
    [-20.5, 15.2, L, 2.3, PINK], [-21.6, 16.8, L, 1.2, PINK], [-19.4, 17, L, 0.7, ORANGE],
    [12.6, 17.2, L + 1.2, 1.5, ORANGE], [14, 18.6, L + 1.2, 0.8, BLUE],
    // The Rift's floor: blue, down in the dark.
    [-16, 7.2, R, 2.4, BLUE], [-14.6, 8.2, R, 1.1, BLUE], [-17.4, 6.2, R, 0.7, GREEN],
    [-0.8, 10.4, R, 1.3, BLUE], [0.6, 11, R, 0.7, BLUE],
    [6.6, 3.4, R, 1.8, GREEN], [7.8, 4.2, R, 0.8, BLUE],
    [13.6, 10.6, R, 1.2, BLUE],
    // The Far Bank: the thickest of it, pink and orange.
    [-12.6, -6.2, F, 2.1, ORANGE], [-11.2, -4.8, F, 1.0, PINK], [-13.8, -4.4, F, 0.7, ORANGE],
    [-3.6, -15.4, F, 2.6, PINK], [-2.2, -16.6, F, 1.3, PINK], [-4.9, -16.8, F, 0.8, ORANGE], [-5.2, -14.2, F, 0.6, BLUE],
    [2.4, -5.2, F, 1.6, BLUE], [3.6, -4, F, 0.8, PINK],
    [11.6, -11.4, F, 0.9, ORANGE], [12.8, -9.8, F, 0.7, ORANGE], [10.4, -10, F, 0.6, PINK],
    [-21.4, -17.4, F + 1.1, 1.4, BLUE], [2.4, -18.6, F + 1.3, 1.7, PINK], [4.4, -19, F + 1.3, 0.8, ORANGE],
    [-8.4, -1, F, 0.9, PINK], [8.6, -0.6, F, 0.8, BLUE],
    // The High Shelf: a few, and a tall one that lights the wedge's place.
    [21.6, -11.4, S, 2.0, PINK], [22.4, -9.2, S, 0.9, ORANGE], [18.2, 2.6, S, 1.2, BLUE], [21.8, 8.4, S, 1.5, ORANGE], [19.2, -17.2, S, 1.1, BLUE],
  ];
  for (const [x, z, y, size, color] of stands) {
    decor.push({ kind: 'mushroom', x, y, z, size, color });
    solids.push(...mushroomSolids(x, y, z, size));
  }

  // Moss on the walls and the rock faces. [x, how high above the Landing, z, the way it faces, size, threads, lights the place]
  const N = 0;
  const So = Math.PI;
  const E = Math.PI / 2;
  const W = -Math.PI / 2;
  const clumps: Array<[number, number, number, number, number, number, boolean]> = [
    // The south wall, by the door, and the Landing's side walls.
    [-10.5, 4.2, G.halfZ, So, 1.5, 6, true], [9.5, 5.6, G.halfZ, So, 1.2, 5, false], [-G.halfX, 4.4, 16, E, 1.3, 5, false],
    // The Rift's own walls: the Landing's face (it looks north), the Far Bank's (south), and both ends.
    [-12, -3.2, RIFT.z1, N, 1.4, 5, true], [4, -2.6, RIFT.z1, N, 1.1, 4, false], [11.5, -4.4, RIFT.z1, N, 0.9, 3, false],
    [-6.5, -2.2, RIFT.z0, So, 1.3, 6, false], [7.5, -1.4, RIFT.z0, So, 1.5, 6, true], [-9.5, -3.6, RIFT.z0, So, 0.9, 3, false],
    [HIGH_SHELF.x0, -2.6, 7, W, 1.6, 7, true], [HIGH_SHELF.x0, 3.8, 4.4, W, 1.1, 4, false],
    // The Far Bank's walls.
    [-G.halfX, 6.2, -6, E, 1.6, 6, true], [-G.halfX, 8.6, -13.5, E, 1.0, 4, false], [-9, 6.4, -G.halfZ, N, 1.7, 7, true], [1.5, 8.8, -G.halfZ, N, 1.1, 4, false], [12.5, 5.4, -G.halfZ, N, 1.2, 5, false],
    // The High Shelf's face over the Far Bank, and its own walls.
    [HIGH_SHELF.x0, 6.4, -9, W, 1.5, 6, false], [HIGH_SHELF.x0, 5.2, -16.5, W, 1.0, 4, false],
    [G.halfX, 12.6, -4, W, 1.4, 5, true], [G.halfX, 13.4, 6.6, W, 1.0, 4, false], [19.5, 12.8, -G.halfZ, N, 1.2, 5, false],
  ];
  for (const [x, y, z, yaw, size, threads, light] of clumps) decor.push({ kind: 'moss', x, y: y + LANDING, z, yaw, size, color: MOSS, threads, light });
  // Lichen on the ground. [x, floor, z, turn, size]
  const lichens: Array<[number, number, number, number, number]> = [
    [-6.4, L, 17.6, 0.5, 1.3], [7.6, L, 18, 2.0, 1.1], [-20.4, L, 16, 1.2, 1.4], [0.5, L, 14, 2.7, 0.9], [-13, L, 13.4, 0.9, 0.8],
    [-14.6, R, 4.8, 1.6, 1.5], [-0.4, R, 10.2, 0.3, 1.2], [6.8, R, 3.8, 2.4, 1.3], [12.6, R, 9.4, 1.1, 1.1], [-7, R, 4.2, 2.0, 0.9], [3, R, 5.6, 0.7, 0.8],
    [-12.2, F, -5.4, 2.2, 1.5], [-3.8, F, -15.6, 0.6, 1.6], [2.6, F, -4.8, 1.4, 1.2], [11.4, F, -10.8, 2.8, 1.5], [-17, F, -11, 0.2, 1.4], [-8, F, -11.5, 1.9, 0.9], [6, F, -9, 0.9, 0.8], [-1, F, 0.6, 2.5, 0.8],
    [21.4, S, -10.6, 1.3, 1.3], [20, S, -8, 0.4, 1.0], [21.4, S, 8, 2.2, 1.0],
  ];
  for (const [x, y, z, yaw, size] of lichens) decor.push({ kind: 'moss', x, y, z, yaw, size, color: LICHEN, flat: true });
  // Stalactites: over the Far Bank and the Landing, their points (given above the Landing) well above any jump from
  // what is under them.
  const roof = ceilingOf(solids)!.y;
  const spikes: Array<[number, number, number, number]> = [
    [-9, -9, 12.4, 0.8], [-7.8, -10.2, 14.2, 0.5], [4, -12, 12.8, 0.8], [5.2, -13, 14.4, 0.5], [-16, 16.5, 10.6, 0.8], [-14.8, 17.6, 12.4, 0.5], [3, 16, 11.2, 0.7], [-20, -2, 13.4, 0.6],
  ];
  for (const [x, z, tip, r] of spikes) decor.push({ kind: 'stalactite', x, z, length: roof - (tip + LANDING), r });
  decor.push(
    { kind: 'crystal', x: -22.6, y: L, z: 18.8, size: 1.5, color: 0x6ad8ff }, { kind: 'crystal', x: 14.2, y: R, z: 3.2, size: 1.7, color: 0x5fd0c0 },
    { kind: 'crystal', x: -22.4, y: F, z: -1.2, size: 1.3, color: 0xb07aff }, { kind: 'crystal', x: 13.8, y: F, z: -18.4, size: 1.8, color: 0x6ad8ff }, { kind: 'crystal', x: 22.8, y: S, z: -18.6, size: 1.6, color: 0xb07aff },
  );

  // What is to be found.
  const [x3, z3, top3] = CAPS[2];
  const [x4, z4, top4] = CAPS[3];
  const collectibles: CollectibleDef[] = [
    // In the air between the third Cap and the fourth, at the top of the jump.
    { id: GLIMMER_PRIZES.air, kind: 'cap', x: (x3 + x4) / 2, y: Math.max(top3, top4) + 1.5, z: (z3 + z4) / 2 },
    // At the bottom of the Rift, in the pocket between the last Cap's foot and the Shelf's wall.
    { id: GLIMMER_PRIZES.deep, kind: 'cap', x: 13.4, y: RIFT.floor + 0.6, z: 6.4 },
    // On the Spire.
    { id: GLIMMER_PRIZES.spire, kind: 'relic', x: SPIRE.x, y: mushroomTop(SPIRE.x, FAR_BANK, SPIRE.z, SPIRE.tall, 1.3) + 0.8, z: SPIRE.z },
  ];

  /** The Rift's floor, for the scorpions: in from its walls, and short of the corner where the shelf mushrooms are. */
  const den = { x0: -G.halfX + 11.8, x1: HIGH_SHELF.x0 - 0.6, z0: RIFT.z0 + 0.6, z1: RIFT.z1 - 0.6 };
  /** The air over the Far Bank, for the glow bugs: in from its walls, short of the Shelf and of the Rift. */
  const air = { x0: -G.halfX + 2.5, x1: HIGH_SHELF.x0 - 3, z0: -G.halfZ + 2.5, z1: RIFT.z0 - 2 };

  return {
    id: 'glimmer',
    name: 'The Glimmer Deep',
    blurb: 'A cave lit only by what grows in it, split by a rift. Great caps grow up out of the dark, and something down there carries a lamp.',
    world: 'hollows',
    returnTo: 'hollows',
    theme: 'cave',
    music: 'echo',
    fog: 0x03050a,
    fogRange: [16, 60],
    ambient: 0.4,
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: LANDING, z: 17.5, facing: Math.PI },
    collectibles,
    crateContents: [],
    enemies: [
      // The two that keep the Rift: one a scorpion's own blue-green, one amber.
      { type: 'scorpion', x: -6, y: RIFT.floor, z: 9.6, arena: den, respawn: false },
      { type: 'scorpion', x: 9.4, y: RIFT.floor, z: 9.2, arena: den, color: AMBER, respawn: false },
      // Glow bugs over the Far Bank, each its own colour. They count toward nothing.
      { type: 'firefly', x: -10, y: FAR_BANK, z: -12, arena: air, color: PINK, uncounted: true },
      { type: 'firefly', x: 0, y: FAR_BANK, z: -8, arena: air, color: BLUE, uncounted: true },
      { type: 'firefly', x: 6, y: FAR_BANK, z: -14, arena: air, color: GREEN, uncounted: true },
    ],
    waves: [],
    gear: [],
    wedges: GLIMMER_WEDGES,
    goals: goalsOf(GLIMMER_WEDGES),
    exit: doorOn('south', G.halfX, 0, G.halfZ, LANDING),
  };
}
