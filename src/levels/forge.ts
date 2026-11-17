/**
 * The Forge: a TRY-OUT ROOM for the furnace's look, to see it in the game and not on a sheet of swatches.
 *
 * The owner, 2026-11-15, of the furnace: "a little texture [pass] over there and maybe create some new objects and
 * environmental scenery ... animations of like steam coming up out of the ground or something we can use in different
 * places". (He threw out the first tile "refreshes" as low effort, shown as swatches; and the Foundry itself is not
 * touched until he has walked about in this and said yes.)
 *
 * WHAT IS TRIED HERE
 *   Every part of the place its own picture (the Foundry wears one rusty plate on its floor, its blocks and its
 *   columns alike): tread plate underfoot (`deckPlate`), firebrick walls (`fireBrick`), cast-iron blocks and
 *   stagings to stand on (`castIron`), riveted girders holding them up (`girder`), black sand in the moulding bay
 *   (`castingSand`). Nothing in any of them glows.
 *   And things: the furnace with its fire, the bellows working beside it, a ladle that pours into a mould, a stack of
 *   ingots with the top two still hot, cogs turning on the wall, a coal bunker, an anvil (world/forge.ts), with the
 *   steam vents the Foundry has already.
 *   The hall is dim (`ambient`), so that it is lit by its fires.
 *
 * Nothing to fight and nothing to find. A test room: `#level=forge&nostory`. Its door leads back to the Move Garden.
 */
import type { LevelDef } from './types';
import { extent, type Box, type Decor } from '../world/layout';
import { FORGE as F, forgeSolids, type ForgeSpec } from '../world/forge';
import { doorOn } from '../world/rooms';

export const FORGE_ROOM = { halfX: 16, halfZ: 12, wall: 11 } as const;
/** The moulding bay: a floor of sand, east of the middle. */
export const BAY = { x0: 4, x1: 12, z0: -4, z1: 4 } as const;
/** The staging against the west wall: a cast-iron deck on four girders, and the block that is the step up to it. */
export const STAGING = { x0: -16, x1: -11.5, z0: -5, z1: 1.5, top: 3, thick: 0.5, post: 1 } as const;
export const STEP = { x0: -11.5, x1: -9.5, z0: -1, z1: 1.5, top: 1.5 } as const;
/** How high the ladle hangs (its trunnions), and the cogs' big wheel (its middle): both above anything he can reach. */
export const LADLE_HANG = 7.8;
export const COGS_AT = 8;

/** The furnace's things, where each stands. (The mould is under where the ladle's lip comes to when it is tipped.) */
export function forgeThings(): ForgeSpec[] {
  const R = FORGE_ROOM;
  const furnace = { x: -3, z: -R.halfZ + F.furnace.foot.d / 2 };
  const ladle = { x: 7, z: 0 };
  const lipAt = F.ladle.lip * Math.cos(F.ladle.tip) + 0.4 * Math.sin(F.ladle.tip);
  return [
    { what: 'furnace', x: furnace.x, y: 0, z: furnace.z, top: R.wall },
    // The bellows, west of it: their nozzle goes into its side.
    { what: 'bellows', x: furnace.x - F.furnace.w / 2 - F.bellows.nozzle + 0.05, y: 0, z: furnace.z + 0.1 },
    { what: 'ladle', x: ladle.x, y: 0, z: ladle.z, top: LADLE_HANG, drop: LADLE_HANG - F.mould.h },
    { what: 'mould', x: ladle.x + lipAt, y: 0, z: ladle.z },
    { what: 'ingots', x: 10.2, y: 0, z: -2.6 },
    // (Hung on the east wall, facing into the room; the small wheel is up and along the wall from the big one.)
    { what: 'cogs', x: R.halfX, y: COGS_AT, z: 5.5, yaw: -Math.PI / 2 },
    // (Long side to the west wall, south of the staging: it is the low step up to it.)
    { what: 'bunker', x: -R.halfX + F.bunker.d / 2, y: 0, z: 3.2, yaw: Math.PI / 2 },
    { what: 'anvil', x: -4.5, y: 0, z: 2.5, yaw: 0.0 },
  ];
}

export function forge(): LevelDef {
  const R = FORGE_ROOM;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const skinned = (b: Box, skin: Box['skin']): Box => ({ ...b, skin });
  // ---- The floor: tread plate, and the sand of the moulding bay let into it ----
  for (const [x0, x1, z0, z1] of [[-R.halfX - 1, R.halfX + 1, -R.halfZ - 1, BAY.z0], [-R.halfX - 1, R.halfX + 1, BAY.z1, R.halfZ + 1], [-R.halfX - 1, BAY.x0, BAY.z0, BAY.z1], [BAY.x1, R.halfX + 1, BAY.z0, BAY.z1]]) {
    solids.push(skinned(extent('floor', x0, x1, -1, 0, z0, z1), 'deckPlate'));
  }
  solids.push(skinned(extent('floor', BAY.x0, BAY.x1, -1, 0, BAY.z0, BAY.z1), 'castingSand'));
  // ---- The walls: firebrick ----
  for (const [x0, x1, z0, z1] of [[-R.halfX - 1, -R.halfX, -R.halfZ - 1, R.halfZ + 1], [R.halfX, R.halfX + 1, -R.halfZ - 1, R.halfZ + 1], [-R.halfX, R.halfX, -R.halfZ - 1, -R.halfZ], [-R.halfX, R.halfX, R.halfZ, R.halfZ + 1]]) {
    solids.push(skinned(extent('wall', x0, x1, 0, R.wall, z0, z1), 'fireBrick'));
  }
  // ---- The staging: a cast-iron deck on four girders, with a block for a step ----
  const S = STAGING;
  solids.push(skinned(extent('platform', S.x0, S.x1, S.top - S.thick, S.top, S.z0, S.z1), 'castIron'));
  for (const px of [S.x0, S.x1 - S.post]) for (const pz of [S.z0, S.z1 - S.post]) solids.push(skinned(extent('pillar', px, px + S.post, 0, S.top - S.thick, pz, pz + S.post), 'girder'));
  solids.push(skinned(extent('stone', STEP.x0, STEP.x1, 0, STEP.top, STEP.z0, STEP.z1), 'castIron'));
  // ---- A girder column either side of the door, floor to roof (what holds the roof up is not what the wall is made of) ----
  for (const x of [-4.5, 3.5]) solids.push(skinned(extent('pillar', x, x + 1, 0, R.wall, R.halfZ - 1, R.halfZ), 'girder'));

  // ---- The furnace's things ----
  for (const t of forgeThings()) {
    decor.push({ kind: 'forge', ...t });
    solids.push(...forgeSolids(t));
  }

  // ---- Steam: three vents in the deck, breathing in turn; pipes along the north wall with a gauge and a leak ----
  decor.push(
    { kind: 'vent', x: -8.5, y: 0, z: -4.5, every: 5.5, on: 2.2, delay: 0 },
    { kind: 'vent', x: 1.5, y: 0, z: 6.5, every: 5.5, on: 2.2, delay: 1.9 },
    { kind: 'vent', x: 13.5, y: 0, z: -8.5, every: 5.5, on: 2.2, delay: 3.7 },
    { kind: 'pipe', a: [1.5, 6.2, -R.halfZ + 0.45], b: [R.halfX - 0.4, 6.2, -R.halfZ + 0.45], r: 0.3 },
    { kind: 'pipe', a: [R.halfX - 0.45, 6.2, -R.halfZ + 0.4], b: [R.halfX - 0.45, 6.2, 1], r: 0.3 },
    { kind: 'gauge', x: 6, y: 5.2, z: -R.halfZ + 0.06, yaw: 0, r: 0.5 },
    { kind: 'jet', x: 11, y: 5.9, z: -R.halfZ + 0.5, dir: [0.15, -1, 0.5], length: 2.6, color: 0xf2ece4, every: 4.2, on: 1.4, delay: 0.8 },
  );

  return {
    id: 'forge',
    name: 'The Forge',
    blurb: 'A try-out of the furnace\'s look: its own tiles, and things that work.',
    theme: 'foundry',
    music: 'pump',
    fog: 0x150a06,
    fogRange: [18, 60],
    ambient: 0.62,
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: 0, z: 8.5, facing: Math.PI },
    collectibles: [],
    crateContents: [],
    enemies: [],
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('south', R.halfX, 0, R.halfZ, 0),
    returnTo: 'garden',
  };
}
