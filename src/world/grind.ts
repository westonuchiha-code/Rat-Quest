/**
 * Grinding: what a rider on his shield can slide along. (The owner, 2026-11-15: "if you're board sliding down you can
 * actually go to the edge and ... he'll grind alongside that edge"; and, for later, "grind along the railroad tracks".)
 *
 * Nothing is marked as a rail. A grind line is found in the solids that are there:
 * - a LEDGE: the top edge of any solid with a drop beside it;
 * - a RAIL: a solid thin enough to be one (under half a unit across), along its length, down its middle.
 * Lines run along x or along z, like everything else here. On a ramp they slope with it (the edge of a ramp that
 * runs with its slope, or a thin ramp, is a rail going downhill). One solid's line carries on along the next solid's
 * if that continues it at the same height, so a ledge built of several boxes is one ledge.
 */
import { topAt, type Aabb } from './collision';
import type { RailCurve } from './rails';

export interface GrindLine {
  /** The way it runs. */
  axis: 'x' | 'z';
  /** Where it is on the other axis. */
  c: number;
  /** Which side of it the drop is on, along the other axis (+1 or -1); 0 for a rail, which has one on both. */
  side: -1 | 0 | 1;
  /** A LIGHT RAIL (world/rails.ts): a line through the air that curves. Then `axis` and `c` mean nothing, and `s` is how far along it. */
  curve?: RailCurve;
}

/** A solid under this wide is a rail: its line is down its middle. */
export const RAIL_WIDTH = 0.5;
/** ...and it is one to grind if it stands this far above the ground either side of it (a ledge needs TUNING.grind.drop). */
export const RAIL_DROP = 0.2;
const INSIDE = 0.05; // an edge's height is read this far in from it
const OUTSIDE = 0.45; // ...and its drop this far out
const EPS = 1e-6;

const contains = (b: Aabb, x: number, z: number): boolean => x >= b.min.x - EPS && x <= b.max.x + EPS && z >= b.min.z - EPS && z <= b.max.z + EPS;

/** The point of a line `s` along it, pushed `across` to one side. */
function at(line: GrindLine, s: number, across: number): [number, number] {
  return line.axis === 'x' ? [s, line.c + across] : [line.c + across, s];
}

/**
 * The line's height `s` along it, for one who was at height `was` a distance `moved` back: 'end' where the line has
 * stopped (the solid ended, or what was a ledge has ground beside it now), 'wall' where something stands across it.
 * `drop`: how far down the ground beside it must be for it to be a ledge at all.
 */
export function grindHeight(line: GrindLine, s: number, was: number, moved: number, colliders: Aabb[], drop: number): number | 'end' | 'wall' {
  // (As steep as a rail may be, it rises or falls no more than this in the distance he has come.)
  const give = 0.12 + Math.abs(moved) * 2.4;
  const [ix, iz] = at(line, s, -line.side * INSIDE);
  let h = -Infinity;
  for (const b of colliders) {
    if (!contains(b, ix, iz)) continue;
    const top = topAt(b, ix, iz);
    // Something across the line, higher than he could ride over and not clear above his head: a wall.
    if (top > was + give + 0.2 && b.min.y < was + 1) return 'wall';
    if (top <= was + give && top > h) h = top;
  }
  if (h < was - give) return 'end';
  // Still a ledge: the ground beside it is well below it (on both sides, for a rail). A RAIL need not stand as
  // high as a ledge must: a track's rails are low enough to ride over, and are rails all the same.
  if (line.side === 0) drop = Math.min(drop, RAIL_DROP);
  for (const side of line.side === 0 ? [-1, 1] : [line.side]) {
    const [ox, oz] = at(line, s, side * OUTSIDE);
    for (const b of colliders) {
      if (!contains(b, ox, oz) || b.min.y >= h + 1) continue;
      if (topAt(b, ox, oz) > h - drop) return 'end';
    }
  }
  return h;
}

export interface GrindStart {
  line: GrindLine;
  s: number;
  h: number;
  /** His speed along it, signed: + is toward the + end of its axis. */
  v: number;
}

export interface GrindReach {
  /** How far to the side of him a line may be. */
  reach: number;
  /** How far above his feet it may be (he hops up onto it)... */
  up: number;
  /** ...and how far below them (he comes down onto it). */
  down: number;
  /** He must be going at least this fast along it... */
  minSpeed: number;
  /** ...and the ground beside it must be at least this far down. */
  drop: number;
}

/**
 * The grind line nearest a rider at (x, y, z) going (vx, vz), if one is in reach and he is going along it: not across
 * it (most of his speed must be along it) and not too slowly.
 */
export function findGrind(x: number, y: number, z: number, vx: number, vz: number, colliders: Aabb[], G: GrindReach): GrindStart | null {
  const speed = Math.hypot(vx, vz);
  let best: GrindStart | null = null;
  let bestD = Infinity;
  for (const b of colliders) {
    if (b.max.y < y - G.down - EPS || b.min.y > y + G.up) continue;
    const wx = b.max.x - b.min.x;
    const wz = b.max.z - b.min.z;
    const lines: GrindLine[] = [];
    if (wx < RAIL_WIDTH && wz < RAIL_WIDTH) continue; // (a post)
    if (wx < RAIL_WIDTH) lines.push({ axis: 'z', c: (b.min.x + b.max.x) / 2, side: 0 });
    else if (wz < RAIL_WIDTH) lines.push({ axis: 'x', c: (b.min.z + b.max.z) / 2, side: 0 });
    else lines.push({ axis: 'x', c: b.min.z, side: -1 }, { axis: 'x', c: b.max.z, side: 1 }, { axis: 'z', c: b.min.x, side: -1 }, { axis: 'z', c: b.max.x, side: 1 });
    for (const line of lines) {
      const along = line.axis === 'x' ? x : z;
      const across = line.axis === 'x' ? z : x;
      const v = line.axis === 'x' ? vx : vz;
      const lo = line.axis === 'x' ? b.min.x : b.min.z;
      const hi = line.axis === 'x' ? b.max.x : b.max.z;
      if (Math.abs(v) < G.minSpeed || Math.abs(v) < speed * 0.5) continue;
      if (along < lo - 0.3 || along > hi + 0.3) continue;
      const d = Math.abs(across - line.c);
      if (d > G.reach || d >= bestD) continue;
      const s = Math.min(hi - 0.02, Math.max(lo + 0.02, along));
      const [ix, iz] = at(line, s, -line.side * INSIDE);
      const top = topAt(b, ix, iz);
      if (top < y - G.down || top > y + G.up) continue;
      // It must be the top of what is there (nothing standing on it), and a ledge, at that very place.
      if (grindHeight(line, s, top, 0, colliders, G.drop) !== top) continue;
      best = { line, s, h: top, v };
      bestD = d;
    }
  }
  return best;
}
