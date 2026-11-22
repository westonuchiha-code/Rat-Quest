/**
 * THE GAUNTLET (Test Room 15, 2026-11-20). Hazards and helpers (world/hazards.ts), each doing what it is for, a bay
 * each with a board over it on the back wall:
 *   BELTS        two conveyor belts side by side, running opposite ways: ride one, run against the other.
 *   BLADES       a corridor with two pendulum blades swinging across it, a quarter of a swing apart: time the run.
 *   SPIKES       a corridor of four spike plates, each coming up a quarter of a beat after the one before.
 *   FANS         a fan in the floor that lifts him up onto a high ledge; and one that runs and stops, under a crumb
 *                hanging in the air.
 * In the FRONT half (2026-11-20): FLOAT (a column of low gravity: a jump there reaches a ledge 7 high), MUD (a patch
 * that slows his stride) and a LAUNCHER (a cannon pad that fires him across onto a ledge).
 * A cheese crumb at the end of each, for something to reach. A button in front of each bay puts a roach into it, to see
 * the hazard act on a creature: carried, struck, blown off the fan. Kit parts (docs/KIT.md): `belt`, `blade`, `spikes`, `fan`.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor } from '../world/layout';

const HX = 30;
const HZ = 16;
/** The bays, west to east: the middle of each (along x). */
export const GAUNTLET = { belts: -22, blades: -8, spikes: 6, fans: 21 } as const;
/** The corridors: their walls' top, half their width inside, where they start (z) and end (the back wall). */
export const CORRIDOR = { top: 4, half: 2.5, start: 2 } as const;
/** The fans' ledge: its top, and how far out from the back wall. */
export const LEDGE = { top: 7, front: -11 } as const;
export const FANS = { lift: { x: GAUNTLET.fans, z: -8, r: 1.5, height: 9 }, pulse: { x: 28, z: -2, r: 1.3, height: 8, on: 3, off: 3 } } as const;
export const BLADES = { length: 4, pivot: 5, swing: 0.6, period: 2.4, at: [-2, -8] } as const;
export const SPIKE_ROW = { period: 3, up: 1.2, at: [-2, -5, -8, -11], d: 2 } as const;

/** The roach buttons: where each stands (its roach comes in 6 north of it). */
export const ROACH_BUTTONS: Array<[number, number]> = [[GAUNTLET.belts, 5], [GAUNTLET.blades, 4], [GAUNTLET.spikes, 4], [GAUNTLET.fans, -2]];

/** The front bays (2026-11-20), across the front half: a FLOAT zone up to a high ledge, a MUD patch, a LAUNCHER onto a ledge. */
export const PHYS = {
  z: 10.5,
  float: { x: -22.5, w: 8, d: 5, h: 12, gravity: 0.35, ledge: { x0: -30, x1: -26.5, top: 7 } },
  mud: { x: -10, w: 8, d: 5, slow: 0.4 },
  launcher: { x: 7, r: 1, speed: 10, up: 13, ledge: { x0: 13.5, x1: 21, top: 4 } },
} as const;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const crumb = (x: number, z: number, top = 0): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });
/** A corridor from the back wall out to CORRIDOR.start, 5 wide inside, centred on x. */
const corridor = (x: number): Piece[] => [
  box('wall', x - CORRIDOR.half - 0.5, -HZ, x - CORRIDOR.half, CORRIDOR.start, CORRIDOR.top),
  box('wall', x + CORRIDOR.half, -HZ, x + CORRIDOR.half + 0.5, CORRIDOR.start, CORRIDOR.top),
];

const room: CustomLevel = {
  name: 'The Gauntlet',
  blurb: 'Hazards and helpers: conveyor belts, swinging blades, spikes that come and go, fans that lift him.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 14,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    { t: 'spawn', x0: 0, z0: HZ - 3, x1: 0, z1: HZ - 3, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    ...corridor(GAUNTLET.blades),
    ...corridor(GAUNTLET.spikes),
    crumb(GAUNTLET.blades, -14), crumb(GAUNTLET.spikes, -14),
    // The belts' crumbs: one at the far end of each.
    crumb(GAUNTLET.belts + 7.5, -5), crumb(GAUNTLET.belts - 7.5, -1),
    // The ledge the fan lifts him onto, and a crumb on it; and a crumb hanging over the fan that runs and stops.
    box('platform', GAUNTLET.fans - 6, -HZ, GAUNTLET.fans + 6, LEDGE.front, LEDGE.top, { bottom: 0 }),
    crumb(GAUNTLET.fans, -14, LEDGE.top),
    crumb(FANS.pulse.x, FANS.pulse.z, 6),
    // A button in front of each bay that puts a roach into it (6 north of the button): onto the far belt, under the
    // first blade, onto the first spike plate, onto the fan. The hazards act on creatures too.
    // The front bays: the float zone's high ledge against the west wall, the launcher's ledge; a crumb at each, and one in the mud.
    box('platform', PHYS.float.ledge.x0, PHYS.z - 2.5, PHYS.float.ledge.x1, PHYS.z + 2.5, PHYS.float.ledge.top, { bottom: 0 }),
    crumb(PHYS.float.ledge.x0 + 1.5, PHYS.z, PHYS.float.ledge.top),
    box('platform', PHYS.launcher.ledge.x0, PHYS.z - 2.5, PHYS.launcher.ledge.x1, PHYS.z + 2.5, PHYS.launcher.ledge.top, { bottom: 0 }),
    crumb(PHYS.launcher.ledge.x1 - 2, PHYS.z, PHYS.launcher.ledge.top),
    crumb(PHYS.mud.x, PHYS.z),
    ...ROACH_BUTTONS.map(([x, z]): Piece => ({ t: 'plate', x0: x, z0: z, x1: x, z1: z, top: 0, dir: 'n', props: { spawns: 'roach' } })),
  ],
};

export function gauntlet(): LevelDef {
  const def = compileCustom(room, 'gauntlet');
  const sign = (x: number, lines: string[]): Decor => ({ kind: 'sign', x, y: LEDGE.top + 2.4, z: -HZ + 0.06, yaw: 0, w: 7.5, h: 2.2, lines, post: 0 });
  const parts: Decor[] = [
    // Belts: the near one carries him east, the far one west.
    { kind: 'belt', x: GAUNTLET.belts, y: 0.35, z: -5, w: 12, d: 2, yaw: Math.PI / 2, speed: 3 },
    { kind: 'belt', x: GAUNTLET.belts, y: 0.35, z: -1, w: 12, d: 2, yaw: -Math.PI / 2, speed: 3 },
    ...BLADES.at.map((z, i): Decor => ({ kind: 'blade', x: GAUNTLET.blades, y: BLADES.pivot, z, length: BLADES.length, yaw: 0, swing: BLADES.swing, period: BLADES.period, phase: i * 0.25 })),
    ...SPIKE_ROW.at.map((z, i): Decor => ({ kind: 'spikes', x: GAUNTLET.spikes, y: 0, z, w: CORRIDOR.half * 2, d: SPIKE_ROW.d, period: SPIKE_ROW.period, up: SPIKE_ROW.up, phase: i * 0.25 })),
    { kind: 'fan', x: FANS.lift.x, y: 0, z: FANS.lift.z, r: FANS.lift.r, height: FANS.lift.height },
    { kind: 'fan', x: FANS.pulse.x, y: 0, z: FANS.pulse.z, r: FANS.pulse.r, height: FANS.pulse.height, on: FANS.pulse.on, off: FANS.pulse.off },
    { kind: 'floatzone', x: PHYS.float.x, y: 0, z: PHYS.z, w: PHYS.float.w, h: PHYS.float.h, d: PHYS.float.d, gravity: PHYS.float.gravity },
    { kind: 'mud', x: PHYS.mud.x, y: 0, z: PHYS.z, w: PHYS.mud.w, d: PHYS.mud.d, slow: PHYS.mud.slow },
    { kind: 'launcher', x: PHYS.launcher.x, y: 0, z: PHYS.z, r: PHYS.launcher.r, yaw: Math.PI / 2, speed: PHYS.launcher.speed, up: PHYS.launcher.up },
    { kind: 'sign', x: PHYS.float.x, y: 5.5, z: HZ - 0.06, yaw: Math.PI, w: 7, h: 2, lines: ['FLOAT', 'a third of the pull: jump high'], post: 0 },
    { kind: 'sign', x: PHYS.mud.x, y: 5.5, z: HZ - 0.06, yaw: Math.PI, w: 7, h: 2, lines: ['MUD', 'slows his stride'], post: 0 },
    { kind: 'sign', x: PHYS.launcher.x + 6, y: 5.5, z: HZ - 0.06, yaw: Math.PI, w: 7, h: 2, lines: ['LAUNCHER', 'step on: it fires him across'], post: 0 },
    sign(GAUNTLET.belts, ['BELTS', 'the near one carries him east,', 'the far one west']),
    sign(GAUNTLET.blades, ['BLADES', 'swinging out of step:', 'a shield will not stop them']),
    sign(GAUNTLET.spikes, ['SPIKES', 'up for a moment in every three,', 'a warning poke first']),
    sign(GAUNTLET.fans, ['FANS', 'stand in the air and it lifts', 'him: one runs, one stops']),
  ];
  return { ...def, goals: NO_GOALS, decor: [...def.decor, ...parts] };
}
