/**
 * The shape of the round shadow under him: a disc, CUT where the ground it lies on ends. Logic only.
 * (The owner, 2026-11-16: "shadow of player is sometimes larger than floor but still stays all on the same level as
 * if there was floor". Standing on a post narrower than his shadow, the shadow stood out past it in the air.)
 * Round the disc, spoke by spoke: where there is ground at the shadow's own height under the end of a spoke it runs
 * its full length; where there is none it is drawn in until there is.
 */
import { topAt, type Aabb } from './collision';

/** Whether there is ground at about height `y` under (x, z): the top of something solid, there. */
export function groundAt(colliders: readonly Aabb[], x: number, y: number, z: number): boolean {
  for (const b of colliders) {
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
    // (A slope's top is not level: within what it rises across a shadow, it is the same ground.)
    if (Math.abs(topAt(b, x, z) - y) <= (b.ramp ? 0.45 : 0.08)) return true;
  }
  return false;
}

/**
 * How long each of `spokes` spokes of a shadow of radius `r` is, as a share of `r` (0 to 1): the shadow's middle at
 * (x, z) on ground at height `y`. Written into `out` (which is returned).
 */
export function shadowSpokes(colliders: readonly Aabb[], x: number, y: number, z: number, r: number, spokes: number, out: number[] = []): number[] {
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const cx = Math.cos(a) * r;
    const cz = Math.sin(a) * r;
    if (groundAt(colliders, x + cx, y, z + cz)) {
      out[i] = 1;
      continue;
    }
    // (Drawn in to where the ground ends: found by halving.)
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 6; k++) {
      const mid = (lo + hi) / 2;
      if (groundAt(colliders, x + cx * mid, y, z + cz * mid)) lo = mid;
      else hi = mid;
    }
    out[i] = lo;
  }
  out.length = spokes;
  return out;
}

/**
 * The same, for a shadow of ANY outline (a creature's is an oval, turned as it is turned): `rim` holds the outline's
 * points as [x, z] pairs in the room, round the middle (x, z) on ground at height `y`. How far out each point may
 * stay, as a share of its own distance (0 to 1), is written into `out`.
 * Returns false, and leaves `out` alone, when the MIDDLE has no ground under it at that height: a creature in the
 * air over a drop keeps the whole of its shadow, as before, and is not cut to nothing.
 * (The owner's fault was of the knight's shadow; every creature and every one of the Club's regulars had the same.)
 */
export function cutOutline(colliders: readonly Aabb[], x: number, y: number, z: number, rim: ArrayLike<number>, out: number[]): boolean {
  if (!groundAt(colliders, x, y, z)) return false;
  const n = rim.length >> 1;
  for (let i = 0; i < n; i++) {
    const dx = rim[i * 2] - x;
    const dz = rim[i * 2 + 1] - z;
    if (groundAt(colliders, x + dx, y, z + dz)) {
      out[i] = 1;
      continue;
    }
    let lo = 0;
    let hi = 1;
    for (let k = 0; k < 6; k++) {
      const mid = (lo + hi) / 2;
      if (groundAt(colliders, x + dx * mid, y, z + dz * mid)) lo = mid;
      else hi = mid;
    }
    out[i] = lo;
  }
  out.length = n;
  return true;
}
