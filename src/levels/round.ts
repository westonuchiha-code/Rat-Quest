/**
 * THE ROUND (Test Room 21, 2026-11-25). NOT A LEVEL: a placeholder, the smallest room that is BUILT THE WAY THE WORLD
 * IS TO BE BUILT (the owner approved it that day; docs/RESEARCH-INSPIRATIONS.md; the rules are docs/KIT.md, "BUILDING
 * A ROOM"). One connected place that loops back to its own lantern:
 *
 *   SOUTH BANK   he comes in. A lantern. Across the chasm he can SEE the north bank: the bridge hung up on its
 *                chains, the catch that lets it down, and a bottle cap beside it. He cannot jump it (15 across).
 *   THE LONG WAY west along the bank, north up the west strip, east along the north bank:
 *     TEACH   the first roach, alone, out in the open of the south bank: room to back off and watch it. And in
 *             the south-west corner a nook shut by a CRACKED WALL, a crumb in it: his first, with nothing at him.
 *     TEST    a toad on a ledge over the west strip, and under it a CRACKED WALL across the way: three blows to
 *             bring down, stood where the toad can spit on him. (Without the wall he ran under it untouched: a
 *             toad spits where he was. Found by walking it, 2026-11-25.)
 *     a second lantern at the north-west corner, before the hard part.
 *     TWIST   an ant pikeman and a roach together by the catch: two kinds, a choice of which first.
 *   THE CATCH    struck, it lets the bridge down for good: the short way back to the first lantern.
 * It plays as THE SEWERS (data/feel.ts): the perfect guard and the riposte are its way of fighting.
 * A fall into the chasm costs a heart and puts him back (`fallBack`).
 * ITS GOAL, ON PURPOSE: none (it is a shape to look at, not a level to finish); the cap is what the far bank shows him.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor, MoverSpec } from '../world/layout';
import { DROP } from '../world/platforms';

const HX = 20;
const HZ = 18;
export const ROUND = {
  /** The chasm: between the banks, east of the west strip. */
  chasm: { x0: -12, x1: HX, z0: -7.5, z1: 7.5 },
  bridge: { x: 8, wide: 4, rise: 5 },
  catch: { x: 11.4, z: -9.2 },
  prize: { x: 4.5, z: -9.5 },
  lanterns: [{ x: 3, y: 0, z: 10.5 }, { x: -15.5, y: 0, z: -13.5 }],
  first: { x: -8, z: 13 },
  ledge: { x0: -HX, x1: -17.6, z0: -3, z1: 3, top: 2.6 },
  /** A nook in the south-west corner behind a cracked wall, a crumb in it: the FIRST cracked wall, with nothing spitting at him. */
  nook: { x0: -HX, x1: -17, z0: 15, z1: HZ, top: 5 },
  /** The cracked wall across the west strip, under the toad: three blows to bring down, stood where it can spit on him. */
  crack: { z: -5, x0: -17.5, x1: -14.5, top: 5 },
  pair: { ant: { x: 1.5, z: -13 }, roach: { x: 5.5, z: -14.5 } },
} as const;
const R = ROUND;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });

const room: CustomLevel = {
  name: 'The Round',
  blurb: 'One place that loops back on itself: the long way round, a bridge let down from the far side, and the short way back.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 12,
  pieces: [
    // The two banks and the west strip that joins them. The rest is the chasm.
    box('floor', -HX, R.chasm.z1, HX, HZ, 0),
    box('floor', -HX, -HZ, HX, R.chasm.z0, 0),
    box('floor', -HX, R.chasm.z0, R.chasm.x0, R.chasm.z1, 0),
    at('spawn', 0, HZ - 3, 0),
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    // TEACH: the first roach, alone, in the open.
    at('roach', R.first.x, R.first.z, 0),
    // TEACH (the cracked wall): a nook he passes on the way west, shut by one, a crumb showing through its cracks.
    // Nothing troubles him here. (The next one is under the toad.)
    box('wall', R.nook.x1, R.nook.z0 - 0.3, R.nook.x1 + 0.4, R.nook.z1, R.nook.top),
    at('crumb', (R.nook.x0 + R.nook.x1) / 2, (R.nook.z0 + R.nook.z1) / 2, 0),
    // TEST: the toad's ledge over the west strip.
    box('platform', R.ledge.x0, R.ledge.z0, R.ledge.x1, R.ledge.z1, R.ledge.top, { bottom: 0 }),
    at('toad', (R.ledge.x0 + R.ledge.x1) / 2, 0, R.ledge.top),
    // (And what keeps him under it: the strip is walled across but for a doorway, and the doorway is a CRACKED WALL.
    // Run under the toad and nothing happens: it spits where he WAS. He has to stand here and strike, and be spat on.)
    box('wall', -HX, R.crack.z - 0.3, R.crack.x0, R.crack.z + 0.3, R.crack.top),
    box('wall', R.crack.x1, R.crack.z - 0.3, R.chasm.x0, R.crack.z + 0.3, R.crack.top),
    // TWIST: two kinds together, by the catch.
    at('ant', R.pair.ant.x, R.pair.ant.z, 0, { dir: 'w' }),
    at('roach', R.pair.roach.x, R.pair.roach.z, 0),
    at('cap', R.prize.x, R.prize.z, 0),
  ],
};

export function round(): LevelDef {
  const def = compileCustom(room, 'round');
  const C = R.chasm;
  const bridge: MoverSpec = {
    x: R.bridge.x, z: (C.z0 + C.z1) / 2, y: 0, w: R.bridge.wide, d: C.z1 - C.z0, thick: 0.4,
    to: [0, R.bridge.rise + DROP.pivot, 0], motion: 'drop', levers: [0], along: 'z',
  };
  const parts: Decor[] = [
    { kind: 'lever', x: R.catch.x, y: 0, z: R.catch.z, yaw: Math.PI },
    { kind: 'crackwall', x: (R.nook.x0 + R.nook.x1) / 2, y: 0, z: R.nook.z0, w: R.nook.x1 - R.nook.x0, h: R.nook.top, d: 0.6 },
    { kind: 'crackwall', x: (R.crack.x0 + R.crack.x1) / 2, y: 0, z: R.crack.z, w: R.crack.x1 - R.crack.x0, h: R.crack.top, d: 0.6 },
    { kind: 'sign', x: R.bridge.x, y: 6.5, z: HZ - 0.06, yaw: Math.PI, w: 9, h: 2.2, lines: ['THE ROUND', 'the long way first:', 'then let the bridge down'], post: 0 },
  ];
  // (The toad keeps to its ledge, the pair to the north bank: each is where it is for a reason.)
  const enemies = def.enemies.map((e) => {
    if (e.type === 'toad') return { ...e, arena: { x0: R.ledge.x0 + 0.3, x1: R.ledge.x1 - 0.3, z0: R.ledge.z0 + 0.3, z1: R.ledge.z1 - 0.3 }, uncounted: true };
    if (e.z < C.z0) return { ...e, arena: { x0: -HX + 1, x1: HX - 1, z0: -HZ + 1, z1: C.z0 - 0.8 }, uncounted: true };
    return { ...e, arena: { x0: -HX + 1, x1: HX - 1, z0: C.z1 + 0.8, z1: HZ - 1 }, uncounted: true };
  });
  return {
    ...def,
    goals: NO_GOALS,
    feel: 'sewers',
    fallBack: true,
    enemies,
    movers: [...(def.movers ?? []), bridge],
    checkpoints: R.lanterns.map((c) => ({ ...c })),
    decor: [...def.decor, ...parts],
  };
}
