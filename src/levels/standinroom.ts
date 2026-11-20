/**
 * THE STAND-IN (Test Room 19, 2026-11-20). The owner: "pick one of the other characters that's a little different from
 * the main character and try to get it to move as if you were able to use it as a second player ... this isn't a plan
 * for the actual game I just want to see how close you can get." Here he is BRAMBLE, the hedgehog (player/standIn.ts):
 * the same controls, the same moves, a hedgehog's body. Not a level: a course with one of everything to try him on:
 *   STEPS up to a high shelf (jump, double jump: he curls and flips), and off the shelf
 *   a STEEP SLOPE (too steep to stand: he slides, curled) and a GENTLE ONE (sneak running down it: he rides his cap);
 *   a HIGH BLOCK to hang from and pull up onto; a POOL to swim in; two ROACHES to fight; pots to carry and throw.
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor } from '../world/layout';

const HX = 14;
const HZ = 12;
/** The steps (west), each a block from the wall out, and the shelf they reach. */
export const STEPS = { x0: -HX, x1: -10, tops: [1, 2, 3], shelf: 4 } as const;
/** The two slopes down off the shelf, east: steep (slides), gentle (rides). */
export const SLOPES = { steep: { z0: -HZ, z1: -8, x1: -7.5 }, gentle: { z0: -6, z1: -2, x1: 0 } } as const;
/** The block to hang from (too high to jump onto). */
export const HANG = { x0: 3, x1: 7, z0: -HZ, z1: -8, top: 3.4 } as const;
/** The pool: its walls' top and the water's. */
export const POOL = { x0: 8, x1: HX, z0: -4, z1: 4, wall: 2, water: 1.9 } as const;

const crumb = (x: number, z: number, top: number): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });

const room: CustomLevel = {
  name: 'The Stand-in',
  blurb: 'Bramble the hedgehog in the rat\'s place, on his controls: a course with one of every move to try him on.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 9,
  pieces: [
    { t: 'floor', x0: -HX, z0: -HZ, x1: HX, z1: HZ, top: 0 },
    { t: 'spawn', x0: 0, z0: HZ - 2.5, x1: 0, z1: HZ - 2.5, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    // The steps, and the shelf.
    { t: 'platform', x0: STEPS.x0, z0: 4, x1: STEPS.x1, z1: 7, top: STEPS.tops[0], bottom: 0 },
    { t: 'platform', x0: STEPS.x0, z0: 1, x1: STEPS.x1, z1: 4, top: STEPS.tops[1], bottom: 0 },
    { t: 'platform', x0: STEPS.x0, z0: -2, x1: STEPS.x1, z1: 1, top: STEPS.tops[2], bottom: 0 },
    { t: 'platform', x0: STEPS.x0, z0: -HZ, x1: STEPS.x1, z1: -2, top: STEPS.shelf, bottom: 0 },
    // Down off the shelf: the steep slope and the gentle one (each climbing west, to the shelf).
    { t: 'ramp', x0: STEPS.x1, z0: SLOPES.steep.z0, x1: SLOPES.steep.x1, z1: SLOPES.steep.z1, top: STEPS.shelf, dir: 'w' },
    { t: 'ramp', x0: STEPS.x1, z0: SLOPES.gentle.z0, x1: SLOPES.gentle.x1, z1: SLOPES.gentle.z1, top: STEPS.shelf, dir: 'w' },
    // The block to hang from, a crumb on it.
    { t: 'platform', x0: HANG.x0, z0: HANG.z0, x1: HANG.x1, z1: HANG.z1, top: HANG.top, bottom: 0 },
    crumb((HANG.x0 + HANG.x1) / 2, (HANG.z0 + HANG.z1) / 2, HANG.top),
    // The pool: four walls round it, water in it.
    { t: 'wall', x0: POOL.x0, z0: POOL.z0, x1: POOL.x0 + 0.5, z1: POOL.z1, top: POOL.wall },
    { t: 'wall', x0: POOL.x0, z0: POOL.z0, x1: POOL.x1, z1: POOL.z0 + 0.5, top: POOL.wall },
    { t: 'wall', x0: POOL.x0, z0: POOL.z1 - 0.5, x1: POOL.x1, z1: POOL.z1, top: POOL.wall },
    { t: 'water', x0: POOL.x0 + 0.5, z0: POOL.z0 + 0.5, x1: POOL.x1, z1: POOL.z1 - 0.5, top: POOL.water },
    crumb(11.5, 0, 0.3),
    // A crumb on the shelf, and two roaches that come back.
    crumb(-12, -10, STEPS.shelf),
    { t: 'roach', x0: 2, z0: 3, x1: 2, z1: 3, top: 0, props: { respawn: true } },
    { t: 'roach', x0: -3, z0: 1, x1: -3, z1: 1, top: 0, props: { respawn: true } },
  ],
};

export function standInRoom(): LevelDef {
  const def = compileCustom(room, 'standin');
  const signs: Decor[] = [
    { kind: 'sign', x: 0, y: 4, z: HZ - 0.06, yaw: Math.PI, w: 8, h: 2.4, lines: ['THE STAND-IN', 'Bramble the hedgehog', 'on the rat\'s controls'], post: 0 },
  ];
  return { ...def, decor: [...def.decor, ...signs], playAs: 'hedgehog' };
}
