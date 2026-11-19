/**
 * The level kit: ready-made pieces for building levels fast. Every function returns plain data (boxes, decor, specs)
 * that a level can spread into its lists, so a level reads like a plan:
 *
 *   solids.push(...kit.hall(0, 0, 40, 60));
 *   solids.push(...kit.bridge(-5, 0, 5, 0, 2));
 *   decor.push(...kit.outflow(-20, 6, 0, ...));
 *
 * Surfaces ("styles") pick a family of pictures, so one word re-dresses a whole area.
 */
import { Box, Decor, GateSpec, Kind, PipeSpec, Skin, extent } from '../world/layout';
import { block, room, slab, stairs } from './builders';

/** A look for floors and walls. */
export type Style = 'sewer' | 'tile' | 'mine' | 'cave' | 'rust';

const FLOOR_SKIN: Record<Style, Skin> = { sewer: 'wetCobbles', tile: 'ceramicTiles', mine: 'dirt', cave: 'mudFloor', rust: 'rustPlate' };
const WALL_SKIN: Record<Style, Skin> = { sewer: 'sewerBrick', tile: 'ceramicTiles', mine: 'mineBrick', cave: 'roughRock', rust: 'rustPlate' };

const skinned = (b: Box, skin: Skin): Box => ({ ...b, skin });

// ---- Floors ----

/** A floor slab. `style: 'sewer'` is the default look (no skin); others dress it differently. */
export function floor(x0: number, x1: number, z0: number, z1: number, top = 0, style: Style = 'sewer', depth = 1): Box {
  const b = extent('floor', x0, x1, top - depth, top, z0, z1);
  return style === 'sewer' ? b : skinned(b, FLOOR_SKIN[style]);
}

/** A metal grating floor, for walkways over water. */
export function grating(x0: number, x1: number, z0: number, z1: number, top: number, thick = 0.3): Box {
  return skinned(extent('stone', x0, x1, top - thick, top, z0, z1), 'drainGrate');
}

// ---- Walls ----

/** A wall along z at x (thickness t). */
export function wallZ(z0: number, z1: number, x: number, top: number, style: Style = 'sewer', t = 1, bottom = 0): Box {
  const b = extent('wall', x, x + t, bottom, top, z0, z1);
  return style === 'sewer' ? b : skinned(b, WALL_SKIN[style]);
}

/** A big walled hall centred on (cx, cz): floor, four walls. Hall sizes are inner width (x) and length (z). */
export function hall(cx: number, cz: number, width: number, length: number, wallHeight = 14, style: Style = 'sewer'): Box[] {
  const parts = room(width / 2, true, length / 2, wallHeight).map((b) => ({ ...b, x0: b.x0 + cx, x1: b.x1 + cx, z0: b.z0 + cz, z1: b.z1 + cz }));
  return style === 'sewer' ? parts : parts.map((b) => skinned(b, b.kind === 'floor' ? FLOOR_SKIN[style] : WALL_SKIN[style]));
}

// ---- Platforms and walkways ----

/** A mossy stepping slab. */
export function stepSlab(x: number, z: number, size: number, top: number, bottom = -4): Box {
  return block('platform', x, z, size, size, top, bottom);
}

/** A row of stepping slabs from (x0, z0) to (x1, z1), `count` of them, each `size` wide, at height `top`. */
export function steppingStones(x0: number, z0: number, x1: number, z1: number, count: number, size: number, top: number, bottom = -4): Box[] {
  const out: Box[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    out.push(stepSlab(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, size, top, bottom));
  }
  return out;
}

/** A wooden plank bridge from (x0, z0) to (x1, z1) at height `top`, `width` wide. Runs along x or z, whichever is longer. */
export function bridge(x0: number, z0: number, x1: number, z1: number, width: number, top = 0, thick = 0.3): Box {
  const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0);
  const b = alongX
    ? extent('plank', Math.min(x0, x1), Math.max(x0, x1), top - thick, top, z0 - width / 2, z0 + width / 2)
    : extent('plank', x0 - width / 2, x0 + width / 2, top - thick, top, Math.min(z0, z1), Math.max(z0, z1));
  return b;
}

/** A raised stone walkway ("catwalk") with a low kerb, standing on legs. */
export function catwalk(x0: number, x1: number, z0: number, z1: number, top: number, thick = 0.5): Box {
  return extent('stone', x0, x1, top - thick, top, z0, z1);
}

/** A solid stone block from the ground up (a plinth, a stage, a ledge). */
export function plinth(x0: number, x1: number, z0: number, z1: number, top: number, bottom = 0, skin: Skin = 'concreteSlab'): Box {
  return skinned(extent('stone', x0, x1, bottom, top, z0, z1), skin);
}

/** A broad staircase, as `stairs`, but its width is given as a centre line: x centre, width, starting z, direction. */
export function staircase(cx: number, width: number, zStart: number, dir: 1 | -1, steps: number, rise = 0.3, tread = 1, base = 0, bottom = base): Box[] {
  return stairs(cx - width / 2, cx + width / 2, zStart, dir, steps, rise, tread, base, bottom);
}

/** A round-ish pillar (square column) of `size`, standing from `bottom` to `top`. */
export function column(x: number, z: number, size: number, top: number, bottom = 0): Box {
  return block('pillar', x, z, size, size, top, bottom);
}

/**
 * A walkway with a high bank on each side: a trench `width` wide whose bottom is at `bottom`, between walls at `top`.
 * (Good for tunnels with a river.) The trench runs along z from z0 to z1.
 */
export function trench(cx: number, width: number, z0: number, z1: number, top: number, bottom: number, wall = 6, style: Style = 'sewer'): Box[] {
  const banks = [
    extent('wall', cx - width / 2 - wall, cx - width / 2, bottom - 1, top, z0, z1),
    extent('wall', cx + width / 2, cx + width / 2 + wall, bottom - 1, top, z0, z1),
  ];
  return style === 'sewer' ? banks : banks.map((b) => skinned(b, WALL_SKIN[style]));
}

// ---- Breakables ----

/** A wooden barrel standing on a floor at height `y`. */
export function barrel(x: number, z: number, y = 0): Box {
  return extent('barrel', x - 0.5, x + 0.5, y, y + 1.1, z - 0.5, z + 0.5);
}
/** A stack of crates (width x high), or barrels. */
export function crateStack(x: number, z: number, y = 0, high = 2): Box[] {
  const out: Box[] = [];
  for (let i = 0; i < high; i++) out.push(extent('rubble', x - 0.5, x + 0.5, y + i, y + i + 1, z - 0.5, z + 0.5));
  return out;
}
/** A cluster of barrels (3 in a triangle). */
export function barrelCluster(x: number, z: number, y = 0): Box[] {
  return [barrel(x - 0.55, z, y), barrel(x + 0.55, z, y), barrel(x, z + 1.05, y)];
}

// ---- Doors and gates ----

/** A portcullis across a gap in a wall that runs along x, opened by bursting the pipes listed (indexes into the level's pipes). */
export function portcullis(x: number, z: number, width: number, height: number, opts: { y?: number; alongZ?: boolean; pipes?: number[]; onGoals?: boolean } = {}): GateSpec {
  return { x, z, y: opts.y, width, height, alongZ: opts.alongZ, pipes: opts.pipes, onGoals: opts.onGoals };
}

/** An archway: two jambs and a curved head, over a wall gap. `z` is the wall's centre. The caller leaves the gap in the wall. */
export function archway(x: number, z: number, width: number, y = 0, springHeight = 3.2, skin: Skin = 'sewerBrick'): Decor {
  return { kind: 'arch', x0: x - width / 2, x1: x + width / 2, z, y: y + springHeight, thick: 1.2, skin };
}

// ---- Water features ----

/** A wall grate pouring sludge. `yaw`: the way it faces (0 = toward +z). Falls to `bottom`. */
export function outflow(x: number, y: number, z: number, yaw: number, width = 2.4, bottom = -0.85): Decor {
  return { kind: 'fall', x, y, z, yaw, width, bottom };
}

/** A wall pipe that can be smashed, standing at (x, z) in front of a wall that is behind it (opposite `yaw`). */
export function wallPipe(x: number, z: number, top: number, yaw: number, y = 0): PipeSpec {
  return { x, z, y, top, yaw };
}

/** Pipes along a wall for looks: two runs, joined by down-pipes every `gap`. `alongX` for a wall along x. */
export function pipeRun(from: [number, number, number], to: [number, number, number], r = 0.45, color?: number): Decor {
  return { kind: 'pipe', a: from, b: to, r, color };
}

/** A string of lamps along a wall. */
export function lamps(x0: number, z0: number, x1: number, z1: number, y: number, count: number): Decor[] {
  const out: Decor[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    out.push({ kind: 'lamp', x: x0 + (x1 - x0) * t, y, z: z0 + (z1 - z0) * t });
  }
  return out;
}

/** Hanging chains at the given points. */
export function chains(points: Array<[number, number]>, top: number, bottom: number): Decor[] {
  return points.map(([x, z]) => ({ kind: 'chain' as const, x, z, top, bottom }));
}

/** A kind check for builders that want the generic box helpers. */
export type { Kind };
export { block, room, slab, stairs };
