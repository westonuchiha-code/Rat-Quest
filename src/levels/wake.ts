/**
 * THE GAME'S FIRST ROOM (2026-11-27): where he wakes up. WORK IN PROGRESS: empty, on purpose.
 *
 * The owner: "where he wakes up right now is just going to be an empty room we're just going to make a big empty room
 * using the sewer textures ... that room will eventually be the whole first level but right now it's just a room he
 * wakes up in so we can stay focused and then we're going to build the game slowly out one level at a time ... I want
 * to describe exactly how I want the level and you can help me put it that way or I will build the level myself in the
 * level editor and you are just going to have to create the rooms."
 *
 * So: NOTHING is put in here but the floor, the walls and enough light to see by, until he says what goes in it.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';

const HX = 24;
const HZ = 24;
export const WAKE_ID = 'wake';
/** Where he lies when he comes to (the middle of the room), and which way he faces as he gets up. */
export const WAKE = { at: { x: 0, z: 6 }, facing: Math.PI } as const;

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });

const room: CustomLevel = {
  name: 'The Deep Drain',
  blurb: 'Where he wakes up. Empty, for now.',
  theme: 'sewer',
  music: 'drift',
  width: HX * 2, depth: HZ * 2, wallHeight: 12,
  pieces: [
    { t: 'floor', x0: -HX, z0: -HZ, x1: HX, z1: HZ, top: 0 },
    at('spawn', WAKE.at.x, WAKE.at.z, 0),
    // (Only light to see by: four lamps high up. No exit yet: there is nowhere to go.)
    at('lamp', -10, -10, 9), at('lamp', 10, -10, 9), at('lamp', -10, 10, 9), at('lamp', 10, 10, 9),
  ],
};

export function wake(): LevelDef {
  const def = compileCustom(room, WAKE_ID);
  return { ...def, goals: NO_GOALS, feel: 'sewers', sound: 'sluice', noExit: true };
}
