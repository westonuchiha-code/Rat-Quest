/**
 * THE GAME, AREA TWO: THE SLUICE (2026-11-25). WORK IN PROGRESS: a first draft, built without the owner's word on
 * what lies beyond the Old Gate (he was asked twice and said "Continue"). It follows the plan he DID approve
 * (START-HERE.md, "HOW THE WORLD IS PUT TOGETHER"): a place built the Dark Souls way, that loops back on itself.
 *
 * Flotsam was a yard to run about in. This is the first PATH: one way round, and a shortcut earned at the far end of it.
 *
 *   THE NEAR BANK (south)  where he comes in. A lantern. One roach. A VAULT in the corner behind a LOCKED gate, its
 *                          prize showing through the bars: he cannot have it yet.                 [a promise]
 *   THE LONG WAY (west)    the only way over the chasm at first. A cracked wall across it, under a toad's ledge: he
 *                          has to stand and strike while it spits.                                 [TEST]
 *   THE FAR BANK (north)   an ant pikeman and a roach together by the bridge's catch.              [TWIST]
 *                          Strike the catch: THE BRIDGE COMES DOWN, back to the lantern.           [the shortcut]
 *                          In the far corner, under two bats: THE KEY. It is carried, both paws: back over the
 *                          bridge with it to the vault.                                            [the loop closes]
 *   THE WAY ON             a door in the north wall. (Nothing is behind it yet.)
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import { keyBox, type Decor, type GateSpec, type MoverSpec } from '../world/layout';
import { DROP } from '../world/platforms';
import { doorOn } from '../world/rooms';
import { FLOTSAM_ID } from './flotsam';

const HX = 22;
const HZ = 26;
export const SLUICE_ID = 'sluice';
export const SLUICE = {
  spawn: { x: 0, z: 23 },
  chasm: { x0: -13, x1: HX, z0: -6, z1: 8 },
  bridge: { x: 8, wide: 4, rise: 5 },
  catch: { x: 11.4, z: -7.8 },
  lanterns: [{ x: 3.5, y: 0, z: 20.5 }, { x: 4, y: 0, z: -9.5 }],
  fire: { x: 6.5, z: 22.5 },
  first: { x: -7, z: 15 },
  /** The toad's ledge over the west strip, and the cracked wall across the strip under it. */
  ledge: { x0: -HX, x1: -19.6, z0: -2.5, z1: 3.5, top: 2.2 },
  crack: { z: -3.5, x0: -19, x1: -16, top: 5 },
  /** A nook behind the first cracked wall, on the near bank: nothing troubles him at this one. */
  nook: { x0: -HX, x1: -19, z0: 22.5, z1: HZ, top: 5 },
  pair: { ant: { x: 0, z: -13 }, roach: { x: 5.5, z: -15 } },
  /** The vault in the near bank's east corner: its walls, its locked gate (in the wall that faces north), its prize. */
  vault: { x0: 14, z0: 18, gateX: 18, gateWide: 3, gateHigh: 3.5, wallTop: 6, prize: { x: 18, z: 23 } },
  key: { x: 18.5, z: -22 },
  bats: [{ x: 15.5, z: -19.5 }, { x: 19.5, z: -17.5 }],
} as const;
const S = SLUICE;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });

const V = S.vault;
const room: CustomLevel = {
  name: 'The Sluice',
  blurb: 'Past the Old Gate. The long way round, a bridge let down from the far side, and a key for the vault by the door.',
  theme: 'sewer',
  music: 'echo',
  width: HX * 2, depth: HZ * 2, wallHeight: 14,
  pieces: [
    // The two banks and the west strip that joins them. The rest is the chasm.
    box('floor', -HX, S.chasm.z1, HX, HZ, 0),
    box('floor', -HX, -HZ, HX, S.chasm.z0, 0),
    box('floor', -HX, S.chasm.z0, S.chasm.x0, S.chasm.z1, 0),
    at('spawn', S.spawn.x, S.spawn.z, 0),
    { t: 'exit', x0: 0, z0: -HZ, x1: 0, z1: -HZ, top: 0, dir: 's' },

    // ---- THE NEAR BANK. One roach; the first cracked wall, with a crumb behind it; the vault.
    at('roach', S.first.x, S.first.z, 0),
    at('brazier', S.fire.x, S.fire.z, 0), at('spool', S.fire.x + 1.7, S.fire.z + 0.6, 0),
    box('wall', S.nook.x1, S.nook.z0 - 0.3, S.nook.x1 + 0.4, S.nook.z1, S.nook.top),
    at('crumb', (S.nook.x0 + S.nook.x1) / 2, (S.nook.z0 + S.nook.z1) / 2 + 0.4, 0),
    box('wall', V.x0 - 0.25, V.z0, V.x0 + 0.25, HZ, V.wallTop),
    box('wall', V.x0, V.z0 - 0.25, V.gateX - V.gateWide / 2, V.z0 + 0.25, V.wallTop),
    box('wall', V.gateX + V.gateWide / 2, V.z0 - 0.25, HX, V.z0 + 0.25, V.wallTop),
    box('wall', V.gateX - V.gateWide / 2, V.z0 - 0.25, V.gateX + V.gateWide / 2, V.z0 + 0.25, V.wallTop, { bottom: V.gateHigh }),
    at('relic', V.prize.x, V.prize.z, 0), at('cap', V.prize.x - 2, V.prize.z + 0.8, 0), at('cap', V.prize.x + 2, V.prize.z + 0.8, 0),
    at('lamp', V.prize.x, V.prize.z - 1, 5),
    at('crate', 10.5, 19.5, 0), at('barrel', 11.9, 20.2, 0), at('rock', -12, 12, 0), at('rock', -11, 13, 0),
    at('crumb', -10, 17, 0), at('crumb', -14, 14, 0), at('crumb', -17, 10.5, 0),

    // ---- THE LONG WAY: the toad's ledge, and the cracked wall across the strip under it.
    box('platform', S.ledge.x0, S.ledge.z0, S.ledge.x1, S.ledge.z1, S.ledge.top, { bottom: 0 }),
    at('toad', (S.ledge.x0 + S.ledge.x1) / 2, (S.ledge.z0 + S.ledge.z1) / 2, S.ledge.top),
    box('wall', -HX, S.crack.z - 0.3, S.crack.x0, S.crack.z + 0.3, S.crack.top),
    box('wall', S.crack.x1, S.crack.z - 0.3, S.chasm.x0, S.crack.z + 0.3, S.crack.top),
    at('crumb', -17.5, 5, 0), at('crumb', -17.5, -8, 0),

    // ---- THE FAR BANK: the pair by the catch; the key in the corner, under two bats.
    at('ant', S.pair.ant.x, S.pair.ant.z, 0, { dir: 'w' }),
    at('roach', S.pair.roach.x, S.pair.roach.z, 0),
    ...S.bats.map((b) => at('bat', b.x, b.z, 6, { props: { perch: 'rock' as const } })),
    at('crumb', 12, -19, 0), at('crumb', -12, -18, 0),
    at('lamp', -10, 16, 7), at('lamp', 6, 14, 7), at('lamp', -17.5, 0, 7), at('lamp', -4, -14, 7), at('lamp', 14, -18, 7),
    // (Dressed, 2026-11-26: THE SLUICE is water let down into the dark: grates in the chasm's east wall pouring into it;
    // chains hanging over it; torches at each end of the bridge and by the way on; junk the water left on both banks.)
    at('fall', HX - 0.4, 0, -1.2, { dir: 'e' }), at('fall', HX - 0.4, 4.5, -1.2, { dir: 'e' }), at('fall', HX - 0.4, -3.5, -1.2, { dir: 'e' }),
    at('chain', 0, 1, 2.5), at('chain', -6, 3.5, 4), at('chain', 15, -1.5, 3), at('chain', -9.5, -2.5, 5),
    at('brazier', S.bridge.x - 3.2, S.chasm.z1 + 1.2, 0), at('brazier', S.bridge.x + 3.2, S.chasm.z1 + 1.2, 0),
    at('brazier', S.bridge.x - 3.2, S.chasm.z0 - 1.2, 0),
    at('brazier', -3.4, -HZ + 1.4, 0), at('brazier', 3.4, -HZ + 1.4, 0),
    at('banner', -6.2, -HZ + 0.1, 7, { dir: 'n', props: { color: 'gold' } }), at('banner', 6.2, -HZ + 0.1, 7, { dir: 'n', props: { color: 'gold' } }),
    at('battery', -5, 21.5, 0, { dir: 'e' }), at('sardines', 11, 12.5, 0), at('spool', -14.5, 20, 0), at('pencil', -8, -21, 0, { dir: 'e' }), at('die', 12.5, -11.5, 0), at('teacup', -16, -16, 0),
    at('web', HX - 0.1, -23, 6, { dir: 'w' }), at('web', 19, -HZ + 0.1, 7, { dir: 'n' }),
    at('roots', -20, 14, 8), at('roots', 20, -10, 8), at('slime', -HX + 0.1, -14, 5, { dir: 'e' }), at('slime', HX - 0.1, 14, 5, { dir: 'w' }),
  ],
};

export function sluice(): LevelDef {
  const def = compileCustom(room, SLUICE_ID);
  const C = S.chasm;
  const bridge: MoverSpec = {
    x: S.bridge.x, z: (C.z0 + C.z1) / 2, y: 0, w: S.bridge.wide, d: C.z1 - C.z0, thick: 0.4,
    to: [0, S.bridge.rise + DROP.pivot, 0], motion: 'drop', levers: [0], along: 'z',
  };
  const gates: GateSpec[] = [{ x: V.gateX, z: V.z0, y: 0, width: V.gateWide, height: V.gateHigh, locked: true }];
  const parts: Decor[] = [
    { kind: 'lever', x: S.catch.x, y: 0, z: S.catch.z, yaw: Math.PI },
    { kind: 'crackwall', x: (S.nook.x0 + S.nook.x1) / 2, y: 0, z: S.nook.z0, w: S.nook.x1 - S.nook.x0, h: S.nook.top, d: 0.6 },
    { kind: 'crackwall', x: (S.crack.x0 + S.crack.x1) / 2, y: 0, z: S.crack.z, w: S.crack.x1 - S.crack.x0, h: S.crack.top, d: 0.6 },
    { kind: 'sign', x: V.gateX, y: V.wallTop + 1.2, z: V.z0 - 0.32, yaw: Math.PI, w: 5, h: 1.6, lines: ['LOCKED', 'a key, somewhere past the water'], post: 0 },
    { kind: 'sign', x: 0, y: 5.6, z: -HZ + 0.06, yaw: 0, w: 7, h: 1.8, lines: ['THE KINGDOM BELOW', 'the way on is not built yet'], post: 0 },
  ];
  // Each keeps to its own ground.
  const enemies = def.enemies.map((e) => {
    if (e.type === 'toad') return { ...e, arena: { x0: S.ledge.x0 + 0.3, x1: S.ledge.x1 - 0.3, z0: S.ledge.z0 + 0.3, z1: S.ledge.z1 - 0.3 }, uncounted: true };
    if (e.z < C.z0) return { ...e, arena: { x0: -HX + 1, x1: HX - 1, z0: -HZ + 1, z1: C.z0 - 0.8 }, uncounted: true };
    return { ...e, arena: { x0: -HX + 1, x1: V.x0 - 1, z0: C.z1 + 0.8, z1: HZ - 1 }, uncounted: true };
  });
  return {
    ...def,
    goals: NO_GOALS,
    sound: 'sluice',
    // A fire to rest at by the first lantern (he comes in from the Warden with what hearts he has left).
    restSpot: { x: S.fire.x, y: 0, z: S.fire.z },
    feel: 'sewers',
    fallBack: true,
    enemies,
    solids: [...def.solids, keyBox(S.key.x, S.key.z)],
    movers: [...(def.movers ?? []), bridge],
    gates: [...(def.gates ?? []), ...gates],
    // THE WAY BACK: a door in the south wall, behind where he comes in, to Flotsam (he arrives there inside the Old Gate).
    courseDoors: [{ to: FLOTSAM_ID, name: 'FLOTSAM', under: 'THE WAY BACK', need: 0, door: doorOn('south', HX, 0, HZ, 0) }],
    checkpoints: S.lanterns.map((c) => ({ ...c })),
    decor: [...def.decor, ...parts],
  };
}
