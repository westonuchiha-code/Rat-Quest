/**
 * THE WORKSHOP (Test Room 12, 2026-11-20). Not a level: a shelf of parts for Fable to build levels with, each in a bay
 * of its own with a board over it that says what it is and what the level editor calls it. The owner, the same day:
 * "making objects, different types of moving platforms, different kinds of interactable things, breakable objects ...
 * anything you can put in the game for Fable to work with later will be helpful. ... Decorating is mostly useless
 * other than to show off the purpose of the objects."
 *
 * So each part is shown doing what it is FOR. Along the back wall, a walkway six up; the parts get him onto it, or
 * across, or show what they do under his feet:
 *   glide (the lift every level has), ride (goes when stood on), circle (carries him round), sink (sinks under him),
 *   crumble (a bridge that does not wait), spring (throws him up onto the walkway).
 * New parts are added here as they are made, a bay each.
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor } from '../world/layout';

const HX = 35;
const HZ = 15;
/** The walkway along the back wall: its top, and how far it comes out. */
export const WALK = { top: 6, out: 4 } as const;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const lift = (x0: number, z0: number, x1: number, z1: number, top: number, props: NonNullable<Piece['props']>): Piece => box('lift', x0, z0, x1, z1, top, { props });

/** The bays, west to east: where each part's board hangs (its middle, along x), and the part's own pieces. */
export const BAYS: Array<{ x: number; lines: string[]; pieces: Piece[] }> = [
  { x: -28, lines: ['GLIDE', 'there and back, waits at each end', 'editor: Moving platform, glides'],
    pieces: [lift(-30, -HZ + WALK.out, -26, -HZ + WALK.out + 4, 0.4, { move: 'up', travel: WALK.top - 0.4, speed: 2, pause: 1.5 })] },
  { x: -17, lines: ['RIDE', 'waits, and goes while he stands', 'on it: back when he steps off'],
    pieces: [lift(-19, -HZ + WALK.out, -15, -HZ + WALK.out + 4, 0.4, { motion: 'ride', move: 'up', travel: WALK.top - 0.4, speed: 2.5, pause: 1 })] },
  { x: -6, lines: ['CIRCLE', 'goes round and round,', 'carrying him with it'],
    pieces: [lift(-5, -7, -3, -5, 1.5, { motion: 'circle', move: 'e', travel: 3, speed: 2 })] },
  { x: 5, lines: ['SINK', 'sinks while he stands on it,', 'rises when he is off'],
    pieces: [box('platform', 1, -6, 3, -4, 1.2), lift(3.5, -8, 6.5, -5, 2.6, { motion: 'sink', travel: 2, speed: 1 })] },
  { x: 17, lines: ['CRUMBLE', 'shakes when he lands, then falls,', 'and is back a while later'],
    pieces: [
      box('platform', 11, -8, 13, -5, 2),
      lift(13.5, -8, 15.5, -5, 2, { motion: 'crumble' }), lift(16, -8, 18, -5, 2, { motion: 'crumble' }), lift(18.5, -8, 20.5, -5, 2, { motion: 'crumble' }),
      box('platform', 21, -8, 23, -5, 2),
    ] },
  { x: 28, lines: ['SPRING', 'throws him up: here, 7 high,', 'onto the walkway'],
    pieces: [lift(26.5, -HZ + WALK.out + 0.5, 29.5, -HZ + WALK.out + 3.5, 0.3, { motion: 'spring', travel: 7 })] },
];

const room: CustomLevel = {
  name: 'The Workshop',
  blurb: 'A part for building levels in each bay, doing what it is for. The boards say what each is called in the level editor.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 14,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    // The walkway along the back wall, all the way across.
    box('platform', -HX, -HZ, HX, -HZ + WALK.out, WALK.top),
    { t: 'spawn', x0: 0, z0: HZ - 4, x1: 0, z1: HZ - 4, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    ...BAYS.flatMap((b) => b.pieces),
  ],
};

export function workshop(): LevelDef {
  const def = compileCustom(room, 'workshop');
  // A board over each bay, on the back wall above the walkway.
  const boards: Decor[] = BAYS.map((b) => ({ kind: 'sign', x: b.x, y: WALK.top + 3.2, z: -HZ + 0.06, yaw: 0, w: 7.5, h: 2.2, lines: b.lines, post: 0 }));
  return { ...def, decor: [...def.decor, ...boards] };
}
