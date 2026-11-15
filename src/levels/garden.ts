/**
 * The Move Garden: a test room for feeling the jump numbers, not part of the game.
 *
 * Mario 64's makers got the hero's movement right in a bare room of blocks before they built a course
 * (reports/Super Mario 64 design research.md). This is that room for the knight: ledges at the heights that matter,
 * chimneys of four widths, a pole and a strip to measure against, and a board on everything saying what it is (two
 * lines at most, in big letters: the game is drawn coarsely, and small writing cannot be read from where he stands). The
 * numbers on the boards are the heights and widths of the things themselves (tests/garden.ts holds them to that);
 * what he can DO with them depends on the jump numbers, which are on the Tweaks sliders, with a few sets to try at
 * the top of "Jumping".
 *
 * Nothing here can be climbed by a wall kick that is not meant to be: whatever he could kick between is either
 * joined on (no gap) or nine or more apart (a kick carries him a little over eight across before he is back down
 * to where he kicked from).
 */
import { extent, type Box, type Decor } from '../world/layout';
import { doorOn } from '../world/rooms';
import { room } from './builders';
import type { LevelDef } from './types';

/** Half the room, east to west and north to south; and how high its walls are. North is -z. */
export const GARDEN = { halfX: 36, halfZ: 24, wall: 16 } as const;

/** A ledge on the west wall: how high, where along the wall (its middle), and what its board says gets him onto it (from the floor, as the game is). */
export interface Step { top: number; z: number; move: string }
/** Each is 2.6 square and joined to the wall; five clear between one and the next. */
export const STEP_SIZE = 2.6;
export const STEPS: readonly Step[] = [
  { top: 2.3, z: 12, move: 'ONE JUMP' },
  { top: 3.4, z: 4.4, move: 'JUMP, GRAB' },
  { top: 4.5, z: -3.2, move: 'DOUBLE JUMP' },
  { top: 5.6, z: -10.8, move: 'DOUBLE, GRAB' },
];

/**
 * A chimney on the north wall: two walls standing out from it, `gap` apart, with the room's own wall behind (a ruler
 * on it) and the open end to the south. `x` is the west face of its west wall. `westTop` and `eastTop` are how high
 * each wall stands: where they differ, the lower is the one to land on.
 */
export interface Chimney { id: string; x: number; gap: number; westTop: number; eastTop: number; lines: string[] }
/** How thick a chimney's walls are (the least he can land on from a kick), and how far they stand out from the wall. */
export const CHIMNEY_WALL = 2.4;
export const CHIMNEY_DEPTH = 5;
/** Clear floor between one chimney and the next, and between the last and the room's east wall: too far to kick across. */
export const CHIMNEY_CLEAR = 9;
export const CHIMNEYS: readonly Chimney[] = (() => {
  const list: Array<Omit<Chimney, 'x'>> = [
    { id: 'narrow', gap: 2.2, westTop: 10, eastTop: 10, lines: ['2.2 WIDE', '10 UP'] },
    { id: 'wide', gap: 4, westTop: 10, eastTop: 10, lines: ['4 WIDE', '10 UP'] },
    { id: 'widest', gap: 6, westTop: 8, eastTop: 8, lines: ['6 WIDE', '8 UP'] },
    { id: 'one', gap: 3.5, westTop: 12, eastTop: 6, lines: ['6 UP', 'ONE KICK'] },
  ];
  // West to east from the corner (the first is joined to the west wall), each the clear distance past the last.
  let x: number = -GARDEN.halfX;
  return list.map((c) => {
    const at = x;
    x += CHIMNEY_WALL * 2 + c.gap + CHIMNEY_CLEAR;
    return { ...c, x: at };
  });
})();
/** The inner faces of a chimney, west and east, and the middle of its mouth. */
export function chimneyFaces(c: Chimney): { west: number; east: number; mid: number; z0: number; z1: number } {
  const west = c.x + CHIMNEY_WALL;
  return { west, east: west + c.gap, mid: west + c.gap / 2, z0: -GARDEN.halfZ, z1: -GARDEN.halfZ + CHIMNEY_DEPTH };
}

/** The pole to jump beside (only drawn: he passes through it), and the strip on the floor to jump along. */
export const POLE = { x: -12, z: 8, height: 9 } as const;
/** The strip runs north from its line; he runs up from the south and jumps at the line. */
export const STRIP = { x: 10, z: 12, length: 16, width: 1.6 } as const;

export function garden(): LevelDef {
  const W = -GARDEN.halfX;
  const N = -GARDEN.halfZ;
  const solids: Box[] = [...room(GARDEN.halfX, true, GARDEN.halfZ, GARDEN.wall)];
  const decor: Decor[] = [];
  const east = Math.PI / 2; // a board on a face that looks east
  const south = 0; // ...and one that looks south (doors and boards face along +z at yaw 0)

  // ---- The Steps, on the west wall ----
  for (const s of STEPS) {
    solids.push(extent('stone', W, W + STEP_SIZE, 0, s.top, s.z - STEP_SIZE / 2, s.z + STEP_SIZE / 2));
    // Its board is on its front, as high as will fit under its top edge.
    const h = Math.min(1.5, s.top - 0.5);
    decor.push({ kind: 'sign', x: W + STEP_SIZE, y: s.top - 0.2 - h / 2, z: s.z, yaw: east, w: 2.5, h, lines: [`${s.top} UP`, s.move] });
  }
  // A ruler up the wall between each two, to see how high a jump gets beside them.
  for (let i = 0; i + 1 < STEPS.length; i++) decor.push({ kind: 'ruler', x: W, y: 0, z: (STEPS[i].z + STEPS[i + 1].z) / 2, yaw: east, length: 8, width: 1 });

  // ---- The chimneys, on the north wall ----
  for (const c of CHIMNEYS) {
    const f = chimneyFaces(c);
    // (Grey stone, like the steps: what is the garden's is grey, what is the room's is brick.)
    solids.push(extent('stone', c.x, f.west, 0, c.westTop, f.z0, f.z1));
    solids.push(extent('stone', f.east, f.east + CHIMNEY_WALL, 0, c.eastTop, f.z0, f.z1));
    // The ruler is on the room's wall at the back of it, as wide as the chimney will take.
    decor.push({ kind: 'ruler', x: f.mid, y: 0, z: N, yaw: south, length: Math.max(c.westTop, c.eastTop) + 1, width: Math.min(1.6, c.gap - 0.4) });
    // The board is on the end of the wall he lands on (the lower one), facing the room.
    const onEast = c.eastTop <= c.westTop;
    decor.push({ kind: 'sign', x: onEast ? f.east + CHIMNEY_WALL / 2 : c.x + CHIMNEY_WALL / 2, y: 1.9, z: f.z1, yaw: south, w: 2.3, h: 1.6, lines: c.lines });
  }

  // ---- The pole and the strip ----
  decor.push({ kind: 'ruler', x: POLE.x, y: 0, z: POLE.z, yaw: south, length: POLE.height, width: 1, pole: true });
  decor.push({ kind: 'sign', x: POLE.x + 2.2, y: 1.6, z: POLE.z, yaw: south, w: 2.8, h: 1.4, lines: ['HOW HIGH', 'JUMP BESIDE IT'], post: 0 });
  decor.push({ kind: 'ruler', x: STRIP.x, y: 0, z: STRIP.z, yaw: Math.PI, length: STRIP.length, width: STRIP.width, flat: true });
  decor.push({ kind: 'sign', x: STRIP.x - 3.4, y: 1.6, z: STRIP.z + 1, yaw: south, w: 2.8, h: 1.4, lines: ['HOW FAR', 'JUMP AT THE LINE'], post: 0 });

  // Lying flat, the strip's numbers are hard to read from where he stands: a little board stands beside it every two,
  // on one side and then the other, each a little further out than the last so that none hides the next.
  for (let u = 2; u <= STRIP.length; u += 2) {
    const side = (u / 2) % 2 === 1 ? 1 : -1;
    decor.push({ kind: 'sign', x: STRIP.x + side * (STRIP.width / 2 + 0.6 + u * 0.06), y: 0.8, z: STRIP.z - u, yaw: south, w: 1, h: 0.8, lines: [String(u)], post: 0 });
  }

  // Lamps down the middle and in the corners, so every board can be read.
  for (const [x, z] of [[-24, 14], [-24, -6], [0, -10], [0, 10], [24, -10], [24, 10], [-10, -16], [12, -16]]) decor.push({ kind: 'lamp', x, y: 9, z });

  return {
    id: 'garden',
    name: 'The Move Garden',
    blurb: 'A test room: ledges, chimneys and rulers for feeling the jump numbers.',
    theme: 'dungeon',
    fogRange: [40, 150],
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: 0, z: 16, facing: Math.PI },
    collectibles: [],
    crateContents: [],
    enemies: [],
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('south', GARDEN.halfX, 0, GARDEN.halfZ),
    // Its door is open from the start and leads back to the Club.
    returnTo: 'hub',
  };
}
