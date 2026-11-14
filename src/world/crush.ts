import * as THREE from 'three';
import type { Aabb } from './collision';
import { TUNING } from '../data/tuning';

/**
 * Whether a moving platform has carried the rat into something solid over his head: his body is inside the underside
 * of a block that does not move, AND a platform that is moving is carrying him (`carry` is how fast: zero when he is
 * not riding one). Only a platform can do that to him. (This used to ask only whether his body was inside a block, in
 * any level that had a platform somewhere; so a pull-up onto a ledge with too little headroom, far from any platform,
 * counted as being crushed and hurt him. He no longer catches such a ledge either: see the controller.)
 */
export function pinnedUnder(p: THREE.Vector3, colliders: Aabb[], movers: Aabb[], carry: THREE.Vector3): boolean {
  if (!movers.length || carry.lengthSq() < 1e-6) return false;
  const r = TUNING.rat.radius;
  const head = p.y + TUNING.rat.height;
  for (const b of colliders) {
    if (movers.includes(b)) continue;
    if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
    if (b.min.y < head - 0.05 && b.max.y > p.y + TUNING.physics.stepHeight + 0.05 && b.min.y > p.y) return true;
  }
  return false;
}
