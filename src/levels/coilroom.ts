/**
 * THE COIL ROOM (Test Room 18, 2026-11-20). The owner, the same day: "a room with a big Tesla coil in it ... you can
 * use those like synthesizers to make crazy Tesla coil sounds and you have to platform your way up through this room on
 * metal platforms but the Tesla coils are zapping everywhere and they will zap the platforms and if you're on the
 * platform it electrocutes you ... a new tile set like an electrical themed tile set ... The Tesla coil should have a
 * predictable rhythm to it ... some sort of hip hop beat with the Tesla coil so that you understand when the platforms
 * will and won't be electrocuted."
 *
 * A tall shaft in the POWER PLANT tile set (levels/themes.ts `power`: tread plate, circuit panels, girders). In its
 * middle a great Tesla coil plays a boom-bap beat (world/teslaCoil.ts): at each kick a bolt to every BLUE plate, at
 * each snare to every VIOLET one; the grey plates are never hit. The plates spiral up round the coil, safe, kick,
 * snare, again and again, to a balcony at the top with a crumb on it. Each plate glows brighter through the beat
 * before its hit: climb to the beat.
 * By the way in, the COIL KEYS: an octave of keys on the floor and a small coil of their own that sings each one.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor } from '../world/layout';
import type { Lane } from '../world/teslaCoil';

const HX = 11;
const HZ = 11;
/** The coil: in the middle, how tall (to its ring), how thick. */
export const BIG_COIL = { x: 0, z: 0, height: 16, r: 0.9 } as const;
/** Where the Spark Beetles start, on the floor round the coil. */
export const BEETLES: Array<[number, number]> = [[-5, -4], [4, -6]];
/** The spiral of plates: how far out, how many, the turn and the rise from one to the next, the first one's height, their size. */
export const SPIRAL = { radius: 6.2, count: 18, turn: 0.56, rise: 1.0, first: 1.0, size: 2.2 } as const;
/** The balcony at the top (against the north wall), its top. */
export const BALCONY = { top: 19.2, front: -7.4 } as const;
/** The coil keys: where the first white key's west edge is, along z; their size; the small coil. */
export const COIL_KEYS = { x0: 3.2, z: 8.6, w: 0.9, d: 2.6, coil: { x: 8.6, z: 4.6, height: 3.2, r: 0.32 } } as const;

/** The plates, bottom to top: where each is, and its lane (every third safe). */
export function spiralPlates(): Array<{ x: number; y: number; z: number; lane: Lane }> {
  const lanes: Lane[] = ['safe', 'kick', 'snare'];
  return Array.from({ length: SPIRAL.count }, (_, i) => {
    const a = i * SPIRAL.turn;
    return { x: BIG_COIL.x + Math.sin(a) * SPIRAL.radius, y: SPIRAL.first + i * SPIRAL.rise, z: BIG_COIL.z + Math.cos(a) * SPIRAL.radius, lane: lanes[i % 3] };
  });
}

const crumb = (x: number, z: number, top: number): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });

const room: CustomLevel = {
  name: 'The Coil Room',
  blurb: 'A great Tesla coil plays a beat and zaps the plates on it: climb to the top in time. And a keyboard to play the coil.',
  theme: 'power',
  width: HX * 2, depth: HZ * 2, wallHeight: 24,
  pieces: [
    { t: 'floor', x0: -HX, z0: -HZ, x1: HX, z1: HZ, top: 0 },
    { t: 'spawn', x0: -6, z0: HZ - 2.5, x1: -6, z1: HZ - 2.5, top: 0 },
    { t: 'exit', x0: -6, z0: HZ, x1: -6, z1: HZ, top: 0, dir: 'n' },
    // The balcony at the top, and girders holding it up at its corners.
    { t: 'platform', x0: -HX, z0: -HZ, x1: HX, z1: BALCONY.front, top: BALCONY.top, bottom: BALCONY.top - 0.6 },
    { t: 'pillar', x0: -HX, z0: BALCONY.front - 0.6, x1: -HX + 0.6, z1: BALCONY.front, top: BALCONY.top - 0.6 },
    { t: 'pillar', x0: HX - 0.6, z0: BALCONY.front - 0.6, x1: HX, z1: BALCONY.front, top: BALCONY.top - 0.6 },
    crumb(0, -9.5, BALCONY.top),
    // Crumbs on two of the safe plates on the way up (rests on the climb).
    ...spiralPlates().filter((q, i) => q.lane === 'safe' && i % 6 === 3).map((q) => crumb(q.x, q.z, q.y)),
  ],
};

export function coilRoom(): LevelDef {
  const def = compileCustom(room, 'coilroom');
  const plates = spiralPlates();
  const parts: Decor[] = [
    { kind: 'teslacoil', x: BIG_COIL.x, y: 0, z: BIG_COIL.z, height: BIG_COIL.height, r: BIG_COIL.r },
    ...plates.map((p): Decor => ({ kind: 'zapplate', x: p.x, y: p.y, z: p.z, w: SPIRAL.size, d: SPIRAL.size, lane: p.lane })),
    // The coil keys: an octave, white keys and black, each singing through the small coil.
    ...[0, 2, 4, 5, 7, 9, 11, 12].map((note, i): Decor => ({ kind: 'floorkey', x: COIL_KEYS.x0 + COIL_KEYS.w * (i + 0.5), y: 0, z: COIL_KEYS.z, w: COIL_KEYS.w, d: COIL_KEYS.d, note, voice: 'coil' })),
    ...([[0, 1], [1, 3], [3, 6], [4, 8], [5, 10]] as const).map(([after, note]): Decor => ({ kind: 'floorkey', x: COIL_KEYS.x0 + COIL_KEYS.w * (after + 1), y: 0, z: COIL_KEYS.z - COIL_KEYS.d / 2 + 0.75, w: 0.55, d: 1.5, note, black: true, voice: 'coil' })),
    { kind: 'teslacoil', x: COIL_KEYS.coil.x, y: 0, z: COIL_KEYS.coil.z, height: COIL_KEYS.coil.height, r: COIL_KEYS.coil.r, keys: true },
    { kind: 'sign', x: -6, y: 4.2, z: HZ - 0.06, yaw: Math.PI, w: 8, h: 2.4, lines: ['THE COIL ROOM', 'BLUE plates zap on the kick,', 'VIOLET on the snare. GREY are safe'], post: 0 },
    { kind: 'sign', x: HX - 0.06, y: 3.6, z: 7.5, yaw: -Math.PI / 2, w: 6, h: 1.8, lines: ['COIL KEYS', 'step on them: the coil sings'], post: 0 },
  ];
  // Two Spark Beetles on the floor round the coil's foot (enemies/sparkBeetle.ts): charged on the snare, soft between.
  const beetles = BEETLES.map(([x, z]) => ({ type: 'sparkbeetle' as const, x, y: 0, z, arena: { x0: -HX + 1, x1: HX - 1, z0: -HZ + 1, z1: 5 }, respawn: true, uncounted: true }));
  return { ...def, goals: NO_GOALS, decor: [...def.decor, ...parts], enemies: [...def.enemies, ...beetles] };
}
