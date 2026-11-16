/**
 * The Glow Cave: a TRY-OUT ROOM, to see a theme in the game and not on a sheet of swatches.
 *
 * The owner, 2026-11-16: "a glowing moss in a cave texture and use like blue glowing Moss or you know pink or orange
 * glowing mushrooms ... a cave area with glowing moss and glowing mushrooms and then you have to fight a bunch of
 * glow bugs". (He found the first sheet of mock-up tiles "a little low effort compared to your other work": this is
 * the theme done properly instead, in one small room.)
 *
 * A dark cave with no lamps in it (`ambient` 0.4): all its light is from what grows there. Walls and ledges of bare
 * bedded rock (`caveRock`), a floor of fitted stones (`caveFloor`), and ON them, each in its own place: clumps of blue
 * moss with threads hanging from them and lichen lying on the floor (decor `moss`), mushrooms that glow pink, orange
 * and blue in stands (decor `mushroom`: the tall one of a stand lights the rock round it), a few crystals, and
 * stalactites (decor `stalactite`: their points kept above where he can jump to). A mushroom as tall as he is, or
 * taller, is solid: its cap is a thing to stand on (`mushroomSolids`).
 * (The first try had the moss painted into the wall's tile: it came round every few steps, like wallpaper. And it had
 * rock so dark that no light showed on it.)
 * Round it, the Cap Walk (CAP_WALK): five tall yellow mushrooms to climb, with two bottle caps and a relic.
 * In it, three glow bugs, each its own colour (the Firefly Bomber with `color`), and on the floor two Lamp Scorpions
 * (enemies/scorpion.ts): there to be fought, not a goal.
 * A test room: `#level=glowcave&nostory`. Its door leads back to the Move Garden.
 */
import type { LevelDef } from './types';
import { ceilingOf, extent, mushroomSolids, mushroomTop, type Box, type Decor } from '../world/layout';
import type { CollectibleDef } from '../world/collectibles';
import { doorOn } from '../world/rooms';

export const GLOWCAVE = { halfX: 14, halfZ: 11, wall: 9 } as const;
const PINK = 0xff4aa8;
const ORANGE = 0xff8a2a;
const BLUE = 0x4ad8ff;
const MOSS = 0x18b4f0;
const LICHEN = 0x14a078;
const GREEN = 0x6aff6a;
const YELLOW = 0xffe04a;
const AMBER = 0xffb03a;

/**
 * The Cap Walk: five tall yellow mushrooms, each cap a jump from the one before and higher: from the low step by
 * the east wall, round the south of the cave, to the tallest in the north-west. [x, z, the height of its top]
 * He jumps a long way (a running jump lands eight off and two up; the second jump, fourteen), so they stand well
 * apart: the first four are each a good running jump from the last, and the fifth is across a gap that only the
 * second jump crosses. From the third on they are higher than he can get from the floor by any jump, and the last is
 * higher than he can get from anything else in the cave: what is on them is earned by the walk.
 * (Their caps are clear of the height the glow bugs fly at, where the bugs fly.)
 */
export const CAP_WALK: ReadonlyArray<readonly [number, number, number]> = [
  [11.5, 4, 3.0],
  [7, 8.2, 4.9],
  [1.6, 5.6, 6.8],
  [-4.4, 3.4, 8.7],
  [-8, -6.6, 10.1],
];
/** Where the bottle cap over the long gap hangs: this share of the way across, this far above the fourth cap. */
export const GAP_PRIZE = { along: 0.5, up: 3.7 } as const;
/** A walk mushroom's cap and stem: wide enough to land on and take a step, slender for its height. */
export const WALK_CAP = 1.5;
export const WALK_STEM = 0.34;
/** What the walk gives: a bottle cap on the fourth mushroom, one in the air over the long gap, a relic on the last. */
export const WALK_PRIZES = { fourth: 'cave-cap-fourth', gap: 'cave-cap-gap', last: 'cave-relic-last' } as const;

export function glowCave(): LevelDef {
  const G = GLOWCAVE;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const skinned = (b: Box, skin: Box['skin']): Box => ({ ...b, skin });
  solids.push(skinned(extent('floor', -G.halfX - 1, G.halfX + 1, -1, 0, -G.halfZ - 1, G.halfZ + 1), 'caveFloor'));
  for (const [x0, x1, z0, z1] of [[-G.halfX - 1, -G.halfX, -G.halfZ - 1, G.halfZ + 1], [G.halfX, G.halfX + 1, -G.halfZ - 1, G.halfZ + 1], [-G.halfX, G.halfX, -G.halfZ - 1, -G.halfZ], [-G.halfX, G.halfX, G.halfZ, G.halfZ + 1]]) {
    solids.push(skinned(extent('wall', x0, x1, 0, G.wall, z0, z1), 'caveRock'));
  }
  // Ledges of rock: a low shelf along the west wall, and steps up to a high one in the north-east corner.
  // (None higher than 2.4: the stalactites are hung by how high he can get from each.)
  // (The two STEPS wear the floor's rock, not the wall's, and glowing lichen lies on the corners of their tops to
  // show their shape in the dark. The owner, 2026-11-16, of steps in the wall's rock: "I genuinely couldn't see these
  // stairs"; and of pale cut stone tried next: "now they feel out of place in the environment. Why don't you just use
  // the floor texture ... put some glowing Moss or something on parts of it to sort of highlight the corners".)
  const ledges: Array<[number, number, number, number, number, boolean?]> = [
    [-G.halfX, -9.5, -G.halfZ, 2, 1.1],
    [-9.5, -6.5, -G.halfZ, -7.5, 1.1],
    [5, 8.5, -G.halfZ, -7, 1.2, true],
    [8.5, G.halfX, -G.halfZ, -5, 2.4],
    [10.5, G.halfX, -5, -1, 1.2, true],
  ];
  for (const [x0, x1, z0, z1, top, step] of ledges) {
    solids.push(skinned(extent('stone', x0, x1, 0, top, z0, z1), step ? 'caveFloor' : 'caveRock'));
    if (!step) continue;
    // (Its corners that stand out into the room: those not against a wall or a higher ledge.)
    for (const cx of [x0, x1]) for (const cz of [z0, z1]) {
      if (Math.abs(cx) >= G.halfX - 0.01 || Math.abs(cz) >= G.halfZ - 0.01) continue;
      if (ledges.some(([a0, a1, b0, b1, t]) => t > top && cx >= a0 - 0.01 && cx <= a1 + 0.01 && cz >= b0 - 0.01 && cz <= b1 + 0.01)) continue;
      decor.push({ kind: 'moss', x: cx + (cx === x0 ? 0.45 : -0.45), y: top, z: cz + (cz === z0 ? 0.45 : -0.45), yaw: cx * 1.7 + cz, size: 0.62, color: MOSS, flat: true });
    }
  }

  // Mushrooms, in stands: a tall one or two with small ones gathered round. [x, z, floor, height, colour]
  const stands: Array<[number, number, number, number, number]> = [
    [-11.6, -7.6, 1.1, 2.6, PINK], [-12.4, -5.9, 1.1, 1.3, PINK], [-10.6, -6.4, 1.1, 0.8, ORANGE], [-12.2, -2.2, 1.1, 1.7, BLUE], [-11.2, 0.4, 1.1, 0.9, PINK],
    [-4.2, -9.4, 0, 2.2, ORANGE], [-2.9, -8.8, 0, 1.2, ORANGE], [-5.3, -8.3, 0, 0.7, PINK], [-3.4, -7.3, 0, 0.6, BLUE],
    [2.2, -2.2, 0, 1.6, BLUE], [3.3, -1.3, 0, 0.9, BLUE], [1.4, -0.9, 0, 0.6, PINK],
    [11.8, -8.4, 2.4, 2.2, PINK], [10.2, -9.6, 2.4, 1.5, ORANGE], [12.8, -6.3, 2.4, 1.1, BLUE],
    [12.4, -2.8, 1.2, 1.6, ORANGE], [11.5, -1.6, 1.2, 0.8, PINK],
    [-8.4, 7.6, 0, 1.9, PINK], [-9.6, 8.6, 0, 1.0, BLUE], [-7.3, 8.9, 0, 0.7, ORANGE],
    [8.2, 3.6, 0, 0.9, BLUE], [13.2, 8.6, 0, 0.8, PINK], [7.2, 10, 0, 0.7, ORANGE],
    [-1.2, 5.2, 0, 0.9, ORANGE], [6.6, -8.2, 1.2, 1.2, BLUE],
  ];
  for (const [x, z, y, size, color] of stands) {
    decor.push({ kind: 'mushroom', x, y, z, size, color });
    // (One as tall as he is, or taller, is solid: its stem stops him and its cap is a thing to stand on.)
    solids.push(...mushroomSolids(x, y, z, size));
  }
  // The Cap Walk (see CAP_WALK): each stands on the floor and is as tall as its top is high.
  const collectibles: CollectibleDef[] = [];
  for (const [x, z, top] of CAP_WALK) {
    const size = top + WALK_CAP * 0.032;
    decor.push({ kind: 'mushroom', x, y: 0, z, size, color: YELLOW, cap: WALK_CAP, stem: WALK_STEM });
    solids.push(...mushroomSolids(x, 0, z, size, WALK_CAP, WALK_STEM));
  }
  {
    const [x4, z4] = CAP_WALK[3];
    const [x5, z5] = CAP_WALK[4];
    const top4 = mushroomTop(x4, 0, z4, CAP_WALK[3][2] + WALK_CAP * 0.032, WALK_CAP);
    const top5 = mushroomTop(x5, 0, z5, CAP_WALK[4][2] + WALK_CAP * 0.032, WALK_CAP);
    collectibles.push({ id: WALK_PRIZES.fourth, kind: 'cap', x: x4, y: top4 + 0.7, z: z4 });
    // (In the air over the long gap, where the second jump carries him: see the tests for how it was placed.)
    collectibles.push({ id: WALK_PRIZES.gap, kind: 'cap', x: x4 + (x5 - x4) * GAP_PRIZE.along, y: top4 + GAP_PRIZE.up, z: z4 + (z5 - z4) * GAP_PRIZE.along });
    collectibles.push({ id: WALK_PRIZES.last, kind: 'relic', x: x5, y: top5 + 0.8, z: z5 });
  }
  // Moss, in clumps on the walls and on the faces of the ledges. [x, y, z, the way it faces, size, threads, lights the place]
  const N = 0;
  const S = Math.PI;
  const E = Math.PI / 2;
  const W = -Math.PI / 2;
  const clumps: Array<[number, number, number, number, number, number, boolean]> = [
    [-1.5, 3.3, -G.halfZ, N, 1.7, 7, true], [-7.8, 2.7, -G.halfZ, N, 1.0, 4, false], [3.4, 5.2, -G.halfZ, N, 1.2, 5, false], [7, 3.6, -G.halfZ, N, 0.8, 3, false],
    [-G.halfX, 3.9, -4.5, E, 1.5, 6, true], [-G.halfX, 2.5, 5.6, E, 1.1, 4, false], [-G.halfX, 5.6, 0.6, E, 0.9, 3, false],
    [G.halfX, 5.4, -3.2, W, 1.3, 5, false], [G.halfX, 2.7, 4.6, W, 1.6, 6, true], [G.halfX, 6.4, 8.2, W, 1.1, 4, false], [G.halfX, 7.6, 1.2, W, 1.2, 5, false],
    [-7, 3.1, G.halfZ, S, 1.4, 5, true], [6.6, 3.8, G.halfZ, S, 1.1, 4, false],
    [-9.5, 0.55, -3, E, 0.5, 0, false], [8.5, 1.8, -8.6, W, 0.5, 2, false], [12.3, 0.6, -1, N, 0.55, 0, false], [-8, 0.55, -7.5, N, 0.5, 0, false],
  ];
  for (const [x, y, z, yaw, size, threads, light] of clumps) decor.push({ kind: 'moss', x, y, z, yaw, size, color: MOSS, threads, light });
  // Lichen lying on the ground, at the feet of the mushrooms and here and there between. [x, floor, z, turn, size]
  const lichens: Array<[number, number, number, number, number]> = [
    [-3.9, 0, -8.3, 0.4, 1.4], [2.4, 0, -1.6, 1.9, 1.2], [-8.5, 0, 8.1, 2.6, 1.2], [11.3, 0, 4.3, 0.9, 1.1], [6.8, 0, 8.4, 2.1, 1.0], [-7.8, 0, -6.2, 0.4, 0.9], [-11.8, 1.1, -6.6, 1.2, 1.0], [11.6, 2.4, -8, 2.2, 1.0],
    [5.2, 0, 2.6, 0.2, 0.8], [-5.2, 0, 1.4, 1.5, 0.9], [-1, 0, 5.4, 2.9, 0.7], [12.2, 1.2, -2.4, 0.7, 0.8], [-12, 1.1, -1, 2.0, 0.9],
  ];
  for (const [x, y, z, yaw, size] of lichens) decor.push({ kind: 'moss', x, y, z, yaw, size, color: LICHEN, flat: true });
  // Stalactites, each by where its point is (the roof is as high as the tallest mushroom asks, so they are long).
  // Each point is above where he can jump to from the tallest thing within six of it (a cap is a thing to jump
  // from): so there are none near the Cap Walk's high caps. [x, z, the height of its point, thickness]
  const roof = ceilingOf(solids)!.y;
  const spikes: Array<[number, number, number, number]> = [
    [-12.2, 7.6, 9.1, 0.8], [-12.8, 9.4, 10.6, 0.5], [7.4, -2.6, 9.2, 0.8], [6.6, -3.8, 10.8, 0.5], [12.5, 9.5, 11.2, 0.6], [3.5, -9.5, 9.0, 0.75], [2.6, -8.7, 10.6, 0.5],
  ];
  for (const [x, z, tip, r] of spikes) decor.push({ kind: 'stalactite', x, z, length: roof - tip, r });
  decor.push({ kind: 'crystal', x: -13.2, y: 0, z: 9.4, size: 1.6, color: 0x6ad8ff }, { kind: 'crystal', x: 13, y: 0, z: 9.6, size: 1.2, color: 0xb07aff }, { kind: 'crystal', x: 0.6, y: 0, z: -10.2, size: 1.9, color: 0x5fd0c0 });

  /** The air the glow bugs keep to: the west and the middle of the room, in from its walls (the Cap Walk's first two caps, which are at their height, are east of it). */
  const air = { x0: -G.halfX + 2, x1: 2.5, z0: -G.halfZ + 2, z1: G.halfZ - 2 };

  /** The floor the scorpions keep to: the room. (Ledges, stems and walls stop them of themselves.) */
  const ground = { x0: -G.halfX + 0.5, x1: G.halfX - 0.5, z0: -G.halfZ + 0.5, z1: G.halfZ - 0.5 };

  return {
    id: 'glowcave',
    name: 'The Glow Cave',
    blurb: 'A try-out of a theme: a cave lit only by what grows in it.',
    theme: 'cave',
    music: 'echo',
    fog: 0x03050a,
    fogRange: [14, 52],
    ambient: 0.4,
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: 0, z: 8, facing: Math.PI },
    collectibles,
    crateContents: [],
    // Glow bugs, each its own colour: the Firefly Bomber as it is everywhere (it flies, bombs and burns the same),
    // but its lantern, its drops and the fire they leave are its colour.
    enemies: [
      // (All of them start further from the door than they notice him from: he comes in to a quiet cave.)
      { type: 'firefly', x: -6, z: -3.6, arena: air, color: PINK },
      { type: 'firefly', x: 1.5, z: -4.2, arena: air, color: BLUE },
      { type: 'firefly', x: 0, z: -8, arena: air, color: GREEN },
      // Lamp Scorpions, on the floor: one a scorpion's own blue-green, one amber. (Up on a ledge or a cap he is out
      // of their reach, though not of the bugs'.)
      { type: 'scorpion', x: -7.5, z: -1.5, arena: ground },
      { type: 'scorpion', x: 4.6, z: -5.4, arena: ground, color: AMBER },
    ],
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('south', G.halfX, 4, G.halfZ, 0),
    returnTo: 'garden',
  };
}
