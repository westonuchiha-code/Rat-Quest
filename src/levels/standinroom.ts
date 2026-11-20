/**
 * THE STAND-IN (Test Room 19, 2026-11-20). The owner: "pick one of the other characters that's a little different from
 * the main character and try to get it to move as if you were able to use it as a second player ... this isn't a plan
 * for the actual game I just want to see how close you can get." Here he is BRAMBLE, the hedgehog (player/standIn.ts):
 * the same controls, the same moves, a hedgehog's body. You walk in as the knight; BRAMBLE waits by the way in: talk
 * to him to the end and you SWAP (npc.ts `swap`): you are him, and the knight stands where he stood; talk to the knight
 * to swap back. Not a level: a course with one of everything to try him on:
 *   STEPS up to a high shelf (jump, double jump: he curls and flips), and off the shelf
 *   a STEEP SLOPE (too steep to stand: he slides, curled) and a GENTLE ONE (sneak running down it: he rides his cap);
 *   a BURROW whose way in is too low to walk through (roll in); a POOL to swim in; two ROACHES; pots.
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor } from '../world/layout';
import type { NpcSpec } from '../npc/npc';

const HX = 14;
const HZ = 12;
/** The steps (west), each a block from the wall out, and the shelf they reach. */
export const STEPS = { x0: -HX, x1: -10, tops: [1, 2, 3], shelf: 4 } as const;
/** The two slopes down off the shelf, east: steep (slides), gentle (rides). */
export const SLOPES = { steep: { z0: -HZ, z1: -8, x1: -7.5 }, gentle: { z0: -6, z1: -2, x1: 0 } } as const;
/** The block to hang from (too high to jump onto). */
/**
 * The BURROW: a walled nook against the back wall, its only way in a gap this low and this wide in its front wall:
 * too low for the knight, too low for the hedgehog on his feet: only the ball rolls through. A crumb inside.
 */
export const BURROW = { x0: 3, x1: 7, z0: -HZ, front: -8.5, thick: 0.6, gap: { w: 0.9, h: 0.7 }, top: 2.5 } as const;
/** Where Bramble waits, by the way in: talk to him to swap. */
export const BRAMBLE = { x: 2.5, z: 5.5 } as const;
/** The pool: its walls' top and the water's. */
export const POOL = { x0: 8, x1: HX, z0: -4, z1: 4, wall: 2, water: 1.9 } as const;

const crumb = (x: number, z: number, top: number): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });

const room: CustomLevel = {
  name: 'The Stand-in',
  blurb: 'Talk to Bramble the hedgehog and swap: be him, on the rat\'s controls, on a course with one of every move.',
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
    // The burrow: its two side walls, its front wall either side of the gap, and the lintel over the gap.
    ...((): Piece[] => {
      const B = BURROW;
      const mx = (B.x0 + B.x1) / 2;
      const fz = B.front - B.thick;
      return [
        { t: 'wall', x0: B.x0, z0: B.z0, x1: B.x0 + 0.5, z1: B.front, top: B.top },
        { t: 'wall', x0: B.x1 - 0.5, z0: B.z0, x1: B.x1, z1: B.front, top: B.top },
        { t: 'wall', x0: B.x0 + 0.5, z0: fz, x1: mx - B.gap.w / 2, z1: B.front, top: B.top },
        { t: 'wall', x0: mx + B.gap.w / 2, z0: fz, x1: B.x1 - 0.5, z1: B.front, top: B.top },
        { t: 'platform', x0: mx - B.gap.w / 2, z0: fz, x1: mx + B.gap.w / 2, z1: B.front, top: B.top, bottom: B.gap.h },
        crumb(mx, (B.z0 + fz) / 2, 0),
      ];
    })(),
    // The pool: four walls round it, water in it.
    { t: 'wall', x0: POOL.x0, z0: POOL.z0, x1: POOL.x0 + 0.5, z1: POOL.z1, top: POOL.wall },
    { t: 'wall', x0: POOL.x0, z0: POOL.z0, x1: POOL.x1, z1: POOL.z0 + 0.5, top: POOL.wall },
    { t: 'wall', x0: POOL.x0, z0: POOL.z1 - 0.5, x1: POOL.x1, z1: POOL.z1, top: POOL.wall },
    { t: 'water', x0: POOL.x0 + 0.5, z0: POOL.z0 + 0.5, x1: POOL.x1, z1: POOL.z1 - 0.5, top: POOL.water },
    crumb(11.5, 0, 0.3),
    // A crumb on the shelf, and two roaches that come back.
    crumb(-12, -10, STEPS.shelf),
    { t: 'roach', x0: 1, z0: -3, x1: 1, z1: -3, top: 0, props: { respawn: true } },
    { t: 'roach', x0: -4, z0: -4, x1: -4, z1: -4, top: 0, props: { respawn: true } },
  ],
};

export function standInRoom(): LevelDef {
  const def = compileCustom(room, 'standin');
  const signs: Decor[] = [
    { kind: 'sign', x: 0, y: 4, z: HZ - 0.06, yaw: Math.PI, w: 8, h: 2.4, lines: ['THE STAND-IN', 'talk to Bramble: be him', 'ROLL curls up. ATTACK spits'], post: 0 },
  ];
  // Bramble, by the way in: read his talk to the end and you are him; the knight waits in his place to swap back.
  const npcs: NpcSpec[] = [
    { name: 'Bramble', kind: 'hedgehog', x: BRAMBLE.x, z: BRAMBLE.z, y: 0, facing: Math.atan2(-BRAMBLE.x, HZ - 2.5 - BRAMBLE.z), doing: 'stand', lines: [
      'Oh, hello. You are the one with the sword. Swords are all very well. I have SPINES.',
      'Want to see what a hedgehog can do? Let us swap. You be me for a bit, and I will stand here and be you.',
      'Press ROLL and I curl up into a ball. Roll fast and I bounce off walls, and anything I bump into is sorry.',
      'ATTACK and I spit. Do not make that face, it works. Curled up, ATTACK and my spines go out all round.',
      'And see that burrow at the back? Too low to walk in. Not too low to roll in. Off you go!',
    ], swap: { as: 'hedgehog', back: [
      'So. This is what it is like to be the hero. Mostly it is standing about in a helmet.',
      'Had enough? Right, give me back my spines. Here we go.',
    ] } },
  ];
  return { ...def, decor: [...def.decor, ...signs], npcs: [...(def.npcs ?? []), ...npcs] };
}
