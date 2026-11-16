/**
 * Lengths of pipe to ride down: a narrow flat floor, and either side of it a wall that curves up, cut into facets
 * (ramps side by side, each steeper than the last). A length that FALLS is planes tipped two ways (collision.ts,
 * `Ramp.cross`): down the pipe, and up across it. Lengths run along z, high at their north end.
 *
 * (The Move Garden's two pipes were built by hand to try the idea; the downhill level is built from this.)
 */
import { extent, rampBox, type Box, type Kind } from '../world/layout';

export interface PipeShape {
  /** Half the width of its flat floor. */
  flat: number;
  /** The radius its walls curve at, how many facets a wall is cut into, and how much of a turn each takes (degrees). */
  radius: number;
  facets: number;
  turn: number;
}
/** An old sewer main, wide enough to carve in: about six across, its rim nearly two above its floor. */
export const SEWER_PIPE: PipeShape = { flat: 0.6, radius: 2.5, facets: 4, turn: 18.75 };

/** One wall's facets, from the floor outward: how far out each starts and ends, and how high above the floor. */
export function facetsOf(s: PipeShape): Array<{ d0: number; d1: number; h0: number; h1: number }> {
  const at = (i: number): [number, number] => {
    const a = (i * s.turn * Math.PI) / 180;
    return [s.radius * Math.sin(a), s.radius * (1 - Math.cos(a))];
  };
  return Array.from({ length: s.facets }, (_, i) => {
    const [d0, h0] = at(i);
    const [d1, h1] = at(i + 1);
    return { d0, d1, h0, h1 };
  });
}
/** How far out from its middle line a pipe's walls end, and how high its rim is above its floor. */
export const pipeHalf = (s: PipeShape): number => s.flat + facetsOf(s)[s.facets - 1].d1;
export const pipeRim = (s: PipeShape): number => facetsOf(s)[s.facets - 1].h1;

/**
 * A length of pipe down the line x = `x`, from z0 (north) to z1: its floor is `top` up at z0 and `bottom` at z1 (the
 * same, for a level length). Everything is solid down to `base` (the ground, y = 0, unless given). `shoulder`: either side, level with the
 * rim, a shelf out to that far from the middle line, falling as the pipe does: somewhere to land for one who comes
 * out of the trough.
 */
export function pipeRun(kind: Kind, s: PipeShape, x: number, z0: number, z1: number, top: number, bottom: number, shoulder = 0, base = 0): Box[] {
  const out: Box[] = [];
  const fall = top - bottom;
  const level = Math.abs(fall) < 1e-9;
  out.push(level ? extent(kind, x - s.flat, x + s.flat, base, top, z0, z1) : rampBox(kind, x - s.flat, x + s.flat, z0, z1, bottom, top, 'n', base));
  for (const side of [-1, 1] as const) {
    for (const f of facetsOf(s)) {
      const a = x + side * (s.flat + f.d0);
      const b = x + side * (s.flat + f.d1);
      const x0 = Math.min(a, b);
      const x1 = Math.max(a, b);
      // (Level: a plain ramp climbing away from the middle. Falling: the same, tipped down the pipe as well.)
      out.push(level ? rampBox(kind, x0, x1, z0, z1, top + f.h0, top + f.h1, side > 0 ? 'e' : 'w', base) : rampBox(kind, x0, x1, z0, z1, bottom + f.h0, top + f.h0, 'n', base, side * (f.h1 - f.h0)));
    }
    if (shoulder > pipeHalf(s)) {
      const a = x + side * pipeHalf(s);
      const b = x + side * shoulder;
      const rim = pipeRim(s);
      out.push(level ? extent(kind, Math.min(a, b), Math.max(a, b), base, top + rim, z0, z1) : rampBox(kind, Math.min(a, b), Math.max(a, b), z0, z1, bottom + rim, top + rim, 'n', base));
    }
  }
  return out;
}

/** How high a pipe's floor is at z, on a length from (z0, top) to (z1, bottom). */
export const floorAlong = (z: number, z0: number, z1: number, top: number, bottom: number): number => top + ((bottom - top) * (z - z0)) / (z1 - z0);

/** How high a pipe's wall stands over its floor, that far out from its middle line (its rim's height, beyond its walls). */
export function wallAt(s: PipeShape, out: number): number {
  const d = Math.abs(out) - s.flat;
  if (d <= 0) return 0;
  for (const f of facetsOf(s)) if (d <= f.d1) return f.h0 + ((f.h1 - f.h0) * (d - f.d0)) / (f.d1 - f.d0);
  return pipeRim(s);
}
