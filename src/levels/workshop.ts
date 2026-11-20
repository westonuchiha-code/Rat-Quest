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
 * New parts are added here as they are made, a bay each. In the FRONT half (2026-11-20), three more, each between
 * ledges with a crumb on the far one: SWING (hung on chains, it swings him across a gap), BLINK (four that come and
 * go out of step, a crossing that opens and closes) and PATH (a loop of waypoints: along, up, back, down, carrying him
 * up to a high ledge).
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor, MoverSpec } from '../world/layout';

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

/** The front bays (2026-11-20): where each is, the ledges' tops. */
export const FRONT = { swing: -24, blink: 0, path: 22, z: 4, ledge: 2.5, high: 5.4 } as const;
const F = FRONT;

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
    // SWING: a ledge each side of an 8-wide gap; the crumb on the far one.
    box('stone', F.swing - 8, F.z - 2, F.swing - 4.2, F.z + 2, F.ledge, { bottom: 0 }),
    box('stone', F.swing + 4.2, F.z - 2, F.swing + 8, F.z + 2, F.ledge, { bottom: 0 }),
    { t: 'crumb', x0: F.swing + 6.5, z0: F.z, x1: F.swing + 6.5, z1: F.z, top: F.ledge },
    // BLINK: a ledge each side of a 12-wide gap the four blinkers cross.
    box('stone', F.blink - 9.5, F.z - 2, F.blink - 6, F.z + 2, F.ledge, { bottom: 0 }),
    box('stone', F.blink + 6, F.z - 2, F.blink + 9.5, F.z + 2, F.ledge, { bottom: 0 }),
    { t: 'crumb', x0: F.blink + 8, z0: F.z, x1: F.blink + 8, z1: F.z, top: F.ledge },
    // PATH: a step up to where the loop starts, and the high ledge it carries him to.
    box('stone', F.path - 6, F.z - 2, F.path - 3, F.z + 2, 1.2, { bottom: 0 }),
    box('stone', F.path + 7, F.z - 2, F.path + 12, F.z + 2, F.high, { bottom: 0 }),
    { t: 'crumb', x0: F.path + 10, z0: F.z, x1: F.path + 10, z1: F.z, top: F.high },
  ],
};

export function workshop(): LevelDef {
  const def = compileCustom(room, 'workshop');
  // A board over each bay, on the back wall above the walkway.
  const boards: Decor[] = BAYS.map((b) => ({ kind: 'sign', x: b.x, y: WALK.top + 3.2, z: -HZ + 0.06, yaw: 0, w: 7.5, h: 2.2, lines: b.lines, post: 0 }));
  const front: MoverSpec[] = [
    // Hangs still in the middle of the gap, 6 under its pivot; swings 0.6 rad each way: its ends reach both ledges.
    { x: F.swing, z: F.z, y: F.ledge - 0.2, w: 2.2, d: 2.2, to: [0, 6, 0], motion: 'swing', arc: 0.6, along: 'x', period: 3.6 },
    // Four out of step: there 2 s, gone 1.5 s, a quarter of their round apart.
    ...[0, 1, 2, 3].map((k): MoverSpec => ({ x: F.blink - 4.5 + k * 3, z: F.z, y: F.ledge, w: 2.2, d: 2.2, to: [0, 0, 0], motion: 'blink', hold: 2, back: 1.5, phase: k * 0.25 })),
    // From beside the step: 8 along, 4 up, 8 back, 4 down; the high ledge is beside its top end.
    { x: F.path - 1.6, z: F.z, y: 1.2, w: 2.2, d: 2.2, to: [0, 0, 0], motion: 'path', path: [[7.5, 0, 0], [7.5, 4.2, 0], [0, 4.2, 0]], speed: 2 },
  ];
  const fronts: Decor[] = [
    { kind: 'sign', x: F.swing, y: 5, z: HZ - 0.06, yaw: Math.PI, w: 7, h: 2, lines: ['SWING', 'hung on chains: ride it across'], post: 0 },
    { kind: 'sign', x: F.blink + 6, y: 5, z: HZ - 0.06, yaw: Math.PI, w: 7, h: 2, lines: ['BLINK', 'there, gone, there: flickers first'], post: 0 },
    { kind: 'sign', x: F.path, y: 5, z: HZ - 0.06, yaw: Math.PI, w: 7, h: 2, lines: ['PATH', 'a loop of waypoints, any shape'], post: 0 },
  ];
  return { ...def, decor: [...def.decor, ...boards, ...fronts], movers: [...(def.movers ?? []), ...front] };
}
