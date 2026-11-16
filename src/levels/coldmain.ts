/**
 * The Cold Main: a TRY-OUT ROOM for the ice theme, done the Glow Cave's way: in the game, not on a sheet.
 *
 * The owner, 2026-11-16: "an ice like a frozen over area maybe it's got like some bursted CO2 pipes on the walls and
 * there's [icicles] coming off the ceiling and coming out of the ground".
 *
 * A length of the sewer, frozen. Its walls are the sewer's own brick under frost (`iceBrick`); its banks the sewer's
 * cobbles, rimed (`frostCobbles`: he can stand on them); and down its middle, where the water was, a sheet of ICE
 * (`iceSheet`, `slick`): on it he keeps his momentum, gliding on for a couple of seconds with the stick let go, and
 * turning wide (TUNING.ice).
 * Nothing that should be in one place only is painted into a tile. Put ON them, each in its own place: steel pipes
 * along the walls (`pipe` decor), BURST in places, each burst a jet of gas coming in gusts (decor `jet`); icicles under the pipes and from the roof (decor `icicle`); spikes of ice standing up from the floor
 * (decor `iceSpike`: solid); lamps, cold; and fine snow sifting down (`motes: 'ice'`).
 * To do in it: two bottle caps out on the ice, each in a pocket of spikes he must slide into and stop in; and a
 * relic on the last of four blocks of ice standing in the channel, each higher than the one before, their tops ice
 * too: land on one with any speed and he slides off it.
 * A test room: `#level=coldmain&nostory`. Its door leads back to the Move Garden.
 */
import type { LevelDef } from './types';
import { extent, iceSpikeSolids, type Box, type Decor } from '../world/layout';
import type { CollectibleDef } from '../world/collectibles';
import { doorOn } from '../world/rooms';

export const COLDMAIN = { halfX: 15, halfZ: 11, wall: 8, channel: 4 } as const;
/**
 * The blocks of ice in the channel: [x, z, the height of its top]. Each is `ICE_BLOCK` square. The first is a jump up
 * from the bank; the last is higher than he can get from the floor by any jump.
 */
export const ICE_BLOCKS: ReadonlyArray<readonly [number, number, number]> = [
  [-9, 0.4, 1.6],
  [-3.4, -0.8, 3.2],
  [2.4, 0.9, 4.8],
  [9.4, -0.2, 6.4],
];
export const ICE_BLOCK = 2.6;
/** Where the spikes of ice stand: [x, z, how tall]. Those in the channel are what the bottle caps hide among. */
export const ICE_SPIKES: ReadonlyArray<readonly [number, number, number]> = [
  // A pocket on the south side of the channel, open to the north: the first cap is in it.
  [-6.6, 3.1, 1.7], [-5.3, 3.4, 2.2], [-4.0, 3.1, 1.6], [-6.9, 1.8, 1.3], [-3.7, 1.8, 1.4],
  // A pocket on the north side, open to the west: the second cap is in it.
  [5.2, -3.3, 1.5], [6.5, -3.5, 2.1], [7.8, -3.2, 1.7], [8.1, -1.9, 1.4], [5.4, -0.9, 1.2], [6.8, -0.7, 1.5],
  // Along the banks.
  [-12.6, -8.6, 2.6], [-11.2, -9.6, 1.5], [12.4, 8.8, 2.4], [11, 9.7, 1.4], [-13, 6.2, 1.8], [13.2, -6.6, 2.0], [0.8, -9.8, 1.6], [-2.2, 9.6, 1.3],
];
export const ICE_PRIZES = { south: 'cold-cap-south', north: 'cold-cap-north', top: 'cold-relic-top' } as const;
const COLD = 0xcfe8ff;

export function coldMain(): LevelDef {
  const G = COLDMAIN;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const skinned = (b: Box, skin: Box['skin']): Box => ({ ...b, skin });
  // The banks, and the ice between them: level with them (the water froze where it stood).
  solids.push(skinned(extent('floor', -G.halfX - 1, G.halfX + 1, -1, 0, -G.halfZ - 1, -G.channel), 'frostCobbles'));
  solids.push(skinned(extent('floor', -G.halfX - 1, G.halfX + 1, -1, 0, G.channel, G.halfZ + 1), 'frostCobbles'));
  solids.push({ ...skinned(extent('floor', -G.halfX - 1, G.halfX + 1, -1, 0, -G.channel, G.channel), 'iceSheet'), slick: true });
  for (const [x0, x1, z0, z1] of [[-G.halfX - 1, -G.halfX, -G.halfZ - 1, G.halfZ + 1], [G.halfX, G.halfX + 1, -G.halfZ - 1, G.halfZ + 1], [-G.halfX, G.halfX, -G.halfZ - 1, -G.halfZ], [-G.halfX, G.halfX, G.halfZ, G.halfZ + 1]]) {
    solids.push(skinned(extent('wall', x0, x1, 0, G.wall, z0, z1), 'iceBrick'));
  }
  // The blocks of ice: ice all through, their tops as slick as the sheet.
  const h = ICE_BLOCK / 2;
  // (They wear a picture of their own, pale and milky: a block in the sheet's dark picture looked like a lump of the floor.)
  for (const [x, z, top] of ICE_BLOCKS) solids.push({ ...skinned(extent('stone', x - h, x + h, 0, top, z - h, z + h), 'iceBlock'), slick: true });
  // The spikes.
  for (const [x, z, size] of ICE_SPIKES) {
    decor.push({ kind: 'iceSpike', x, y: 0, z, size });
    solids.push(...iceSpikeSolids(x, 0, z, size));
  }

  // The pipes: one along each long wall, well up it; and where each has burst, a jet of gas in gusts, blowing down
  // and out across the bank.
  const PIPE_Y = 5.2;
  const PIPE_R = 0.34;
  for (const side of [-1, 1]) {
    const z = side * (G.halfZ - 0.45);
    decor.push({ kind: 'pipe', a: [-G.halfX, PIPE_Y, z], b: [G.halfX, PIPE_Y, z], r: PIPE_R, color: 0x7e8c96 });
    for (const [x, every, on] of side < 0 ? [[-7.5, 3.4, 1.8], [6.5, 4.6, 2.2]] : [[-10, 4.1, 2], [3.5, 3.1, 1.5]]) {
      decor.push({ kind: 'jet', x, y: PIPE_Y - 0.2, z: z - side * 0.3, dir: [0, -0.85, -side], length: 7.4, width: 3.6, color: COLD, every, on });
    }
    // Icicles under the pipe, in runs, long and short.
    for (let x = -G.halfX + 1; x < G.halfX - 0.5; x += 0.62) {
      const k = Math.sin(x * 2.3 + side) * Math.sin(x * 0.71 - side * 2);
      if (k < 0.05) continue;
      decor.push({ kind: 'icicle', x, z, length: 0.3 + k * 0.85, r: 0.06 + k * 0.07, top: PIPE_Y - PIPE_R * 0.9 });
    }
  }
  // Icicles from the roof, over the banks (not over the blocks: from the highest of them he could reach a low one).
  for (const [x, z, length] of [[-12, 7, 2.6], [-11.2, 7.9, 1.4], [-13.2, -6.5, 2.2], [-12.4, -7.6, 1.2], [13, 7.4, 2.4], [12.2, 8.6, 1.3], [-1, 8.6, 1.9], [-0.2, 9.4, 1.0], [0.6, -8.8, 2.0], [13.2, -8.4, 1.6]] as Array<[number, number, number]>) {
    decor.push({ kind: 'icicle', x, z, length, r: 0.12 + length * 0.07 });
  }
  // Lamps, cold.
  // (Little posts, standing on the banks at the channel's edge and by the walls.)
  for (const [x, z] of [[-11, -G.channel - 0.5], [0, -G.channel - 0.5], [11, -G.channel - 0.5], [-11, G.channel + 0.5], [11, G.channel + 0.5], [-5, G.halfZ - 0.6], [5, -G.halfZ + 0.6]]) decor.push({ kind: 'light', x, y: 0, z, color: COLD, flash: 0 });

  // The two caps in their pockets of spikes, and the relic on the last block.
  const collectibles: CollectibleDef[] = [
    { id: ICE_PRIZES.south, kind: 'cap', x: -5.3, y: 0.6, z: 2.1 },
    { id: ICE_PRIZES.north, kind: 'cap', x: 6.6, y: 0.6, z: -2.1 },
    { id: ICE_PRIZES.top, kind: 'relic', x: ICE_BLOCKS[3][0], y: ICE_BLOCKS[3][2] + 0.8, z: ICE_BLOCKS[3][1] },
  ];

  return {
    id: 'coldmain',
    name: 'The Cold Main',
    blurb: 'A try-out of a theme: a length of the sewer, frozen.',
    theme: 'sewer',
    motes: 'ice',
    music: 'echo',
    fog: 0x121c28,
    fogRange: [18, 62],
    ambient: 0.62,
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: 0, z: 8.4, facing: Math.PI },
    collectibles,
    crateContents: [],
    enemies: [],
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('south', G.halfX, 3, G.halfZ, 0),
    returnTo: 'garden',
  };
}
