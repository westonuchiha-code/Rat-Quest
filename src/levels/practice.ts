/**
 * ROOMS OFF THE HALL FOR WORKING ON ONE FIGHT: a practice room for each kind of enemy, and the Widow's pit.
 *
 * The owner, 2026-11-17: "I would also like doors to specific boss fights we might want to work out so like the spider
 * boss fight should have a room that we can use to test it out ... I also want each different enemy type to have a
 * room where it spawns that enemy one at a time so you can practice fighting them, maybe those rooms can even have
 * buttons on the floor that spawn the enemy so you can spawn a few of them at a time by jumping on the button."
 *
 * A PRACTICE ROOM: a plain square room. One of the creature stands in the middle of the far half, and comes back a few
 * seconds after it is beaten ("one at a time"). Two buttons on the floor near where he comes in: each time one is
 * stepped on, another of the creature is put in the far half (to `MOST` alive at once). The buttons come back up when
 * he steps off, to be pressed again (a level's other floor plates stay down for good).
 */
import { compileCustom, type CustomLevel, type Piece } from './custom';
import { extent } from '../world/layout';
import { ARENA, WIDOW_OUT } from './longdrop';
import type { PracticeEntry } from './testRooms';
import type { EnemySpec, LevelDef } from './types';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });

/** The practice room: its half width, where its creature stands, where the buttons are and where each puts its creature. */
export const PRACTICE = {
  half: 15,
  foe: { x: 0, z: -6 },
  buttons: [{ x: -4, z: 9, to: { x: -7, z: -8 } }, { x: 4, z: 9, to: { x: 7, z: -8 } }],
  /** The most of them alive at once: a button pressed past that does nothing. */
  most: 6,
} as const;

export function practiceRoom(e: PracticeEntry): LevelDef {
  const H = PRACTICE.half;
  const room: CustomLevel = {
    name: `Practice: ${e.name}`,
    blurb: `One ${e.name} at a time. Step on a floor button for another.`,
    theme: 'dungeon',
    music: 'drift',
    width: H * 2, depth: H * 2, wallHeight: 10,
    pieces: [
      { t: 'floor', x0: -H, z0: -H, x1: H, z1: H, top: 0 },
      at('spawn', 0, 12),
      at('exit', 0, H),
      at(e.piece, PRACTICE.foe.x, PRACTICE.foe.z, 0, { dir: 's', props: { respawn: true } }),
      at('lamp', -8, -8, 7), at('lamp', 8, -8, 7), at('lamp', -8, 8, 7), at('lamp', 8, 8, 7),
      at('torch', -H + 0.3, 0, 3.2, { dir: 'w' }), at('torch', H - 0.3, 0, 3.2, { dir: 'e' }),
    ],
  };
  const def = compileCustom(room, e.id);
  // The one who is there from the start: it comes back when beaten, and it is not a thing the room asks him to do.
  // (It has the run of the whole room: there is nothing else in it.)
  const whole = { x0: -H + 1, x1: H - 1, z0: -H + 1, z1: H - 1 };
  const first: EnemySpec = { ...def.enemies[0], respawn: true, uncounted: true, arena: whole };
  return {
    ...def,
    enemies: [first],
    goals: [],
    // Each button puts in another like the first, at its own spot, which does NOT come back: he asked for it once.
    plates: PRACTICE.buttons.map((b) => ({ x: b.x, z: b.z, y: 0, most: PRACTICE.most, spawn: { ...first, x: b.to.x, z: b.to.z, respawn: false } })),
    decor: [
      ...def.decor,
      { kind: 'sign', x: 0, y: 2.2, z: H - 0.05, yaw: Math.PI, w: 3.4, h: 1.5, lines: [e.door, 'FLOOR BUTTON:', 'ONE MORE'], post: 0 },
    ],
    // Its door is open from the start and leads back to the Hall.
    returnTo: 'hall',
  };
}

/**
 * THE WIDOW'S PIT: the spider fight by itself, in the round of light it is fought in at the foot of the Long Drop
 * (levels/longdrop.ts), without the minute and a half of riding to get to it.
 */
/** `far`, `high`: how far off its walls are in the dark, and how high (past where anything can be seen). */
export const WIDOW_PIT = { r: ARENA.r, far: ARENA.r + 40, high: 45 } as const;
export function widowPit(): LevelDef {
  const r = WIDOW_PIT.r;
  return {
    id: 'widowpit',
    name: 'Boss Room: The Widows',
    blurb: 'The two great spiders at the edge of the light, by themselves: for working on the fight.',
    theme: 'sewer',
    music: 'pump',
    // (The dark is total well inside its walls: they, and the roof they carry, are never seen. They are there so that
    // the place is a room like any other: every level under a roof has walls and a ceiling.)
    fogRange: [26, 37],
    solids: [
      ...([[-1, 0], [1, 0], [0, -1], [0, 1]] as const).map(([sx, sz]) => (sx !== 0
        ? extent('wall', sx * WIDOW_PIT.far - (sx < 0 ? 1 : 0), sx * WIDOW_PIT.far + (sx > 0 ? 1 : 0), 0, WIDOW_PIT.high, -WIDOW_PIT.far - 1, WIDOW_PIT.far + 1)
        : extent('wall', -WIDOW_PIT.far, WIDOW_PIT.far, 0, WIDOW_PIT.high, sz * WIDOW_PIT.far - (sz < 0 ? 1 : 0), sz * WIDOW_PIT.far + (sz > 0 ? 1 : 0)))),
      // (Its floor is solid well past its edge, but he cannot go there; and the stone of the way out, so that the view does not go into it.)
      { ...extent('floor', -r - 4, r + 4, -1, 0, -r - 4, r + 4), hidden: true },
      { ...extent('wall', -2.2, 2.2, 0, 4.6, r + 0.15, r + 0.85), hidden: true },
    ],
    pit: null,
    water: [],
    decor: [
      { kind: 'arena', x: 0, y: 0, z: 0, r },
      { kind: 'eyes', x: 0, y: 0, z: 0, r0: r + 4, r1: r + 17, high: 8, count: 52 },
    ],
    spawn: { x: 0, y: 0, z: 6, facing: Math.PI },
    collectibles: [],
    crateContents: [],
    waves: [],
    gear: [],
    enemies: [1, -1].map((side) => ({ type: 'widow' as const, x: side * (r + WIDOW_OUT), y: 0, z: 0, respawn: false, arena: { x0: -r, x1: r, z0: -r, z1: r } })),
    goals: [{ type: 'defeat', label: 'Beat the Widows' }],
    well: { x: 0, z: 0, y: 0, r, clear: ARENA.clear, top: 30, flare: 0 },
    exit: { x: 0, z: r - 0.35, yaw: Math.PI, width: 2.6, height: 3.8, y: 0 },
    returnTo: 'hall',
  };
}
