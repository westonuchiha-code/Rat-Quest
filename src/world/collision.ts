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
