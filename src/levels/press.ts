/**
 * THE PRESS (Test Room 16, 2026-11-20). More hazards: crushers (a moving platform's `crush` motion,
 * world/platforms.ts) and flame jets (world/hazards.ts `flamejet`), a bay each with a board over it:
 *   CRUSHERS      a corridor under three crushers, out of step: run between their slams.
 *   RIDE ONE      a crusher beside a high ledge: jump on it while it is down, ride it up, step off onto the ledge.
 *   WALL JETS     a corridor with flame jets in its walls, from each side in turn.
 *   FLOOR JETS    a corridor with flame jets in its floor, shooting up one after another.
 * A cheese crumb at the end of each. Ice, the other hazard asked for, was already a kit part: the editor's Ice floor.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor, MoverSpec } from '../world/layout';

const HX = 26;
const HZ = 15;
/** The bays, west to east: the middle of each (along x). */
export const PRESS = { crushers: -16, ride: -3, wallJets: 10, floorJets: 21 } as const;
/** The crushers: how thick, how far they drop, and their tops when up (so their undersides land on the floor). */
export const CRUSHER = { thick: 2, depth: 3, top: 5, at: [-2, -6, -10] } as const;
/** The ledge the ridden crusher takes him up to. */
export const RIDE_LEDGE = { top: 5, front: -10 } as const;
export const WALL_JETS = { at: [-2, -5, -8, -11], length: 3.8, period: 3, on: 1, y: 0.6 } as const;
export const FLOOR_JETS = { at: [-3, -6, -9], length: 4, period: 2.4, on: 0.9 } as const;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const crumb = (x: number, z: number, top = 0): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });
/** A corridor from the back wall out to z = 2, `half` wide each side of x inside. */
const corridor = (x: number, half: number, top: number): Piece[] => [
  box('wall', x - half - 0.5, -HZ, x - half, 2, top),
  box('wall', x + half, -HZ, x + half + 0.5, 2, top),
];

const room: CustomLevel = {
  name: 'The Press',
  blurb: 'More hazards: crushers that slam down (and can be ridden), flame jets in the walls and the floor.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 12,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    { t: 'spawn', x0: 0, z0: HZ - 3, x1: 0, z1: HZ - 3, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    ...corridor(PRESS.crushers, 2, 6),
    ...corridor(PRESS.wallJets, 2, 4),
    ...corridor(PRESS.floorJets, 1.5, 4),
    box('platform', PRESS.ride - 3, -HZ, PRESS.ride + 3, RIDE_LEDGE.front, RIDE_LEDGE.top, { bottom: 0 }),
    crumb(PRESS.crushers, -13.5), crumb(PRESS.ride, -13, RIDE_LEDGE.top), crumb(PRESS.wallJets, -13.5), crumb(PRESS.floorJets, -13),
  ],
};

export function press(): LevelDef {
  const def = compileCustom(room, 'press');
  const crusher = (x: number, z: number, w: number, d: number, phase: number): MoverSpec => ({
    x, z, y: CRUSHER.top, w, d, thick: CRUSHER.thick, to: [0, 0, 0], motion: 'crush', depth: CRUSHER.depth, phase,
  });
  const movers: MoverSpec[] = [
    ...CRUSHER.at.map((z, i) => crusher(PRESS.crushers, z, 3.8, 3, i / 3)),
    // The one to ride: it waits longer up, so he has time to step off onto the ledge.
    { ...crusher(PRESS.ride, RIDE_LEDGE.front + 1.6, 3, 3, 0), hold: 3 },
  ];
  const sign = (x: number, lines: string[]): Decor => ({ kind: 'sign', x, y: 8, z: -HZ + 0.06, yaw: 0, w: 7.5, h: 2.2, lines, post: 0 });
  const parts: Decor[] = [
    // Wall jets, from the west wall and the east in turn, a quarter beat apart.
    ...WALL_JETS.at.map((z, i): Decor => {
      const west = i % 2 === 0;
      return { kind: 'flamejet', x: PRESS.wallJets + (west ? -1.95 : 1.95), y: WALL_JETS.y, z, yaw: west ? Math.PI / 2 : -Math.PI / 2, length: WALL_JETS.length, period: WALL_JETS.period, on: WALL_JETS.on, phase: i * 0.25 };
    }),
    ...FLOOR_JETS.at.map((z, i): Decor => ({ kind: 'flamejet', x: PRESS.floorJets, y: 0, z, yaw: 0, up: true, length: FLOOR_JETS.length, period: FLOOR_JETS.period, on: FLOOR_JETS.on, phase: i / 3 })),
    sign(PRESS.crushers, ['CRUSHERS', 'they shake, then slam down:', 'run between them']),
    sign(PRESS.ride, ['RIDE ONE', 'jump on while it is down,', 'ride it up to the ledge']),
    sign(PRESS.wallJets, ['WALL JETS', 'a blue pilot flame,', 'then fire across']),
    sign(PRESS.floorJets, ['FLOOR JETS', 'up one after another:', 'the Ember Helm keeps it off']),
  ];
  return { ...def, goals: NO_GOALS, movers: [...(def.movers ?? []), ...movers], decor: [...def.decor, ...parts] };
}
