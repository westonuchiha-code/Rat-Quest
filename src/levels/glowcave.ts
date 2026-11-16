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
 * rock so dark that no light showed on it. No glow bugs in it yet.)
 * A test room: `#level=glowcave&nostory`. Its door leads back to the Move Garden.
 */
import type { LevelDef } from './types';
import { extent, mushroomSolids, type Box, type Decor } from '../world/layout';
import { doorOn } from '../world/rooms';

export const GLOWCAVE = { halfX: 14, halfZ: 11, wall: 9 } as const;
const PINK = 0xff4aa8;
const ORANGE = 0xff8a2a;
const BLUE = 0x4ad8ff;
const MOSS = 0x18b4f0;
const LICHEN = 0x14a078;

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
  const ledges: Array<[number, number, number, number, number]> = [
    [-G.halfX, -9.5, -G.halfZ, 2, 1.1],
    [-9.5, -6.5, -G.halfZ, -7.5, 1.1],
    [5, 8.5, -G.halfZ, -7, 1.2],
    [8.5, G.halfX, -G.halfZ, -5, 2.4],
    [10.5, G.halfX, -5, -1, 1.2],
  ];
  for (const [x0, x1, z0, z1, top] of ledges) solids.push(skinned(extent('stone', x0, x1, 0, top, z0, z1), 'caveRock'));

  // Mushrooms, in stands: a tall one or two with small ones gathered round. [x, z, floor, height, colour]
  const stands: Array<[number, number, number, number, number]> = [
    [-11.6, -7.6, 1.1, 2.6, PINK], [-12.4, -5.9, 1.1, 1.3, PINK], [-10.6, -6.4, 1.1, 0.8, ORANGE], [-12.2, -2.2, 1.1, 1.7, BLUE], [-11.2, 0.4, 1.1, 0.9, PINK],
    [-4.2, -9.4, 0, 2.2, ORANGE], [-2.9, -8.8, 0, 1.2, ORANGE], [-5.3, -8.3, 0, 0.7, PINK], [-3.4, -7.3, 0, 0.6, BLUE],
    [2.2, -2.2, 0, 1.6, BLUE], [3.3, -1.3, 0, 0.9, BLUE], [1.4, -0.9, 0, 0.6, PINK],
    [11.8, -8.4, 2.4, 2.2, PINK], [10.2, -9.6, 2.4, 1.5, ORANGE], [12.8, -6.3, 2.4, 1.1, BLUE],
    [12.4, -2.8, 1.2, 1.6, ORANGE], [11.5, -1.6, 1.2, 0.8, PINK],
    [-8.4, 7.6, 0, 1.9, PINK], [-9.6, 8.6, 0, 1.0, BLUE], [-7.3, 8.9, 0, 0.7, ORANGE],
    [8.8, 6.4, 0, 2.4, BLUE], [10, 7.6, 0, 1.2, PINK], [7.6, 7.9, 0, 0.8, ORANGE], [9.6, 4.9, 0, 0.6, BLUE],
    [-1.2, 5.2, 0, 0.9, ORANGE], [6.6, -8.2, 1.2, 1.2, BLUE],
  ];
  for (const [x, z, y, size, color] of stands) {
    decor.push({ kind: 'mushroom', x, y, z, size, color });
    // (One as tall as he is, or taller, is solid: its stem stops him and its cap is a thing to stand on.)
    solids.push(...mushroomSolids(x, y, z, size));
  }
  // Moss, in clumps on the walls and on the faces of the ledges. [x, y, z, the way it faces, size, threads, lights the place]
  const N = 0;
  const S = Math.PI;
  const E = Math.PI / 2;
  const W = -Math.PI / 2;
  const clumps: Array<[number, number, number, number, number, number, boolean]> = [
    [-1.5, 3.3, -G.halfZ, N, 1.7, 7, true], [-7.8, 2.7, -G.halfZ, N, 1.0, 4, false], [3.4, 5.2, -G.halfZ, N, 1.2, 5, false], [7, 3.6, -G.halfZ, N, 0.8, 3, false],
    [-G.halfX, 3.9, -4.5, E, 1.5, 6, true], [-G.halfX, 2.5, 5.6, E, 1.1, 4, false], [-G.halfX, 5.6, 0.6, E, 0.9, 3, false],
    [G.halfX, 5.4, -3.2, W, 1.3, 5, false], [G.halfX, 2.7, 4.6, W, 1.6, 6, true], [G.halfX, 4.6, 8.2, W, 0.9, 3, false],
    [-7, 3.1, G.halfZ, S, 1.4, 5, true], [6.6, 3.8, G.halfZ, S, 1.1, 4, false],
    [-9.5, 0.55, -3, E, 0.5, 0, false], [8.5, 1.8, -8.6, W, 0.5, 2, false], [12.3, 0.6, -1, N, 0.55, 0, false], [-8, 0.55, -7.5, N, 0.5, 0, false],
  ];
  for (const [x, y, z, yaw, size, threads, light] of clumps) decor.push({ kind: 'moss', x, y, z, yaw, size, color: MOSS, threads, light });
  // Lichen lying on the ground, at the feet of the mushrooms and here and there between. [x, floor, z, turn, size]
  const lichens: Array<[number, number, number, number, number]> = [
    [-3.9, 0, -8.3, 0.4, 1.4], [2.4, 0, -1.6, 1.9, 1.2], [-8.5, 0, 8.1, 2.6, 1.2], [9, 0, 6.6, 0.9, 1.4], [-11.8, 1.1, -6.6, 1.2, 1.0], [11.6, 2.4, -8, 2.2, 1.0],
    [5.2, 0, 2.6, 0.2, 0.8], [-5.2, 0, 1.4, 1.5, 0.9], [-1, 0, 5.4, 2.9, 0.7], [12.2, 1.2, -2.4, 0.7, 0.8], [-12, 1.1, -1, 2.0, 0.9],
  ];
  for (const [x, y, z, yaw, size] of lichens) decor.push({ kind: 'moss', x, y, z, yaw, size, color: LICHEN, flat: true });
  // Stalactites. Each with its point above where he can jump to from the tallest thing near it (a cap is a thing to
  // jump from), so shorter the nearer the tall mushrooms, and none by the tallest. [x, z, length, thickness]
  const spikes: Array<[number, number, number, number]> = [
    [-2, 3.6, 2.1, 0.42], [-1.2, 4.5, 1.2, 0.26], [2.6, 6.2, 2.0, 0.4], [3.5, 5.4, 1.0, 0.24], [0.8, 1.6, 1.8, 0.36],
    [-7, 5, 1.8, 0.4], [-6.2, 5.9, 0.9, 0.22], [-6.5, -2, 1.5, 0.34], [-11, 6.5, 1.4, 0.32], [7.5, 6, 1.9, 0.4], [8.3, 5.2, 1.0, 0.24], [10, 9, 1.3, 0.3],
    [-3, -5, 1.5, 0.34], [-12, -8, 0.8, 0.3], [4, -4, 0.7, 0.28],
  ];
  for (const [x, z, length, r] of spikes) decor.push({ kind: 'stalactite', x, z, length, r });
  decor.push({ kind: 'crystal', x: -13.2, y: 0, z: 9.4, size: 1.6, color: 0x6ad8ff }, { kind: 'crystal', x: 13, y: 0, z: 9.6, size: 1.2, color: 0xb07aff }, { kind: 'crystal', x: 0.6, y: 0, z: -10.2, size: 1.9, color: 0x5fd0c0 });

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
    collectibles: [],
    crateContents: [],
    // (No glow bugs yet: the Firefly Bomber as it is sets the floor alight, which drowns the room. In colours, and
    // gentler, they are the next thing to try here.)
    enemies: [],
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('south', G.halfX, 4, G.halfZ, 0),
    returnTo: 'garden',
  };
}
