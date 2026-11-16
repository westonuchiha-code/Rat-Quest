import * as THREE from 'three';

/** Axis-aligned box used for all solid collision in the greybox. */
export interface Aabb {
  min: THREE.Vector3;
  max: THREE.Vector3;
  /**
   * How far something drawn on its top edge sticks out past it all round (a pillar's capital). The box itself is the
   * shaft; a rat hanging from the top hangs from the capital's edge, this far out, not inside it.
   */
  lip?: number;
  /**
   * A ramp: the box's top is not flat but runs up from `low` at one end to the box's own top at the other. What is
   * solid is the wedge under that slope; the air over the low end, inside the box, is air.
   */
  ramp?: Ramp;
}

/**
 * How a ramp's top runs: along x or z, climbing toward the + end of that axis (`up` 1) or the - end (-1), from `low`.
 *
 * `cross`: it is tilted the OTHER way as well, rising by that much across its other axis, toward that axis's + side
 * (or, negative, toward its - side). It is still one flat plane, tipped two ways: the floor of a pipe that runs
 * downhill is ramps like this side by side. The box's own top is then the top of its highest CORNER; its first slope
 * takes what is left, from `low` up to the box's top less the cross rise. (Without `cross` nothing is different.)
 */
export interface Ramp {
  axis: 'x' | 'z';
  up: 1 | -1;
  low: number;
  cross?: number;
}

/** How far along a ramp a point is, from its low end (0) to its high end (1); points beyond either end count as that end. */
function along(b: Aabb, r: Ramp, x: number, z: number): number {
  const lo = r.axis === 'x' ? b.min.x : b.min.z;
  const hi = r.axis === 'x' ? b.max.x : b.max.z;
  const t = Math.min(1, Math.max(0, ((r.axis === 'x' ? x : z) - lo) / (hi - lo)));
  return r.up > 0 ? t : 1 - t;
}
/** ...and how far ACROSS it, from its low side (0) to its high side (1), for one that is tilted across too. */
function across(b: Aabb, r: Ramp, x: number, z: number): number {
  const lo = r.axis === 'x' ? b.min.z : b.min.x;
  const hi = r.axis === 'x' ? b.max.z : b.max.x;
  const t = Math.min(1, Math.max(0, ((r.axis === 'x' ? z : x) - lo) / (hi - lo)));
  return (r.cross ?? 0) > 0 ? t : 1 - t;
}

/**
 * The height of a solid's top at a place: a box's top is the same everywhere; a ramp's is its slope there. A place
 * beside the solid (not over it) is given the height of its nearest edge.
 */
export function topAt(b: Aabb, x: number, z: number): number {
  const r = b.ramp;
  if (!r) return b.max.y;
  const c = Math.abs(r.cross ?? 0);
  return r.low + (b.max.y - c - r.low) * along(b, r, x, z) + (c > 0 ? c * across(b, r, x, z) : 0);
}

/** How a ramp's top climbs: its rise for one unit toward +x, and for one unit toward +z. (A box: nothing.) */
export function slopeXZ(b: Aabb): [number, number] {
  const r = b.ramp;
  if (!r) return [0, 0];
  const c = r.cross ?? 0;
  const lenX = b.max.x - b.min.x;
  const lenZ = b.max.z - b.min.z;
  const main = ((b.max.y - Math.abs(c) - r.low) / (r.axis === 'x' ? lenX : lenZ)) * r.up;
  const tilt = c / (r.axis === 'x' ? lenZ : lenX);
  return r.axis === 'x' ? [main, tilt] : [tilt, main];
}

/** The highest its top gets anywhere under a square footprint `half` wide round a place: what he would have to step up onto. */
export function topUnder(b: Aabb, x: number, z: number, half: number): number {
  if (!b.ramp) return b.max.y;
  // (Its top is one plane, so its highest point under the footprint is at the footprint's uphill corner.)
  const [sx, sz] = slopeXZ(b);
  return topAt(b, x + half * Math.sign(sx), z + half * Math.sign(sz));
}

/** A ramp's steepness: how much it rises for each unit straight up it, whichever way that is (0 for a box). */
export function slopeOf(b: Aabb): number {
  const [sx, sz] = slopeXZ(b);
  return Math.hypot(sx, sz);
}

/** The collider for a level's box (a ramp's slope goes with it). */
export function aabbOf(b: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; ramp?: Ramp }): Aabb {
  const a = makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0);
  if (b.ramp) a.ramp = b.ramp;
  return a;
}

/** Builds an AABB from a center point and full size. */
export function makeAabb(cx: number, cy: number, cz: number, w: number, h: number, d: number): Aabb {
  return {
    min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
    max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
  };
}

/**
 * Slab test: returns the entry parameter t in [0, 1] where segment p0->p1 first touches the box,
 * or null if it never does.
 */
export function segmentAabbT(p0: THREE.Vector3, p1: THREE.Vector3, b: Aabb): number | null {
  let tmin = 0;
  let tmax = 1;
  const comps = [
    [p0.x, p1.x - p0.x, b.min.x, b.max.x],
    [p0.y, p1.y - p0.y, b.min.y, b.max.y],
    [p0.z, p1.z - p0.z, b.min.z, b.max.z],
  ] as const;
  for (const [o, dd, lo, hi] of comps) {
    if (Math.abs(dd) < 1e-9) {
      if (o < lo || o > hi) return null;
      continue;
    }
    let t1 = (lo - o) / dd;
    let t2 = (hi - o) / dd;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}
