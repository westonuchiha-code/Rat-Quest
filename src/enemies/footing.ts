/**
 * WHERE A CREATURE CAN PUT ITS FEET: floors, walls, and slopes.
 *
 * A creature that walks has a height of its own (`y`) and asks, of each place it would step to, "can I stand there?"
 * Until 2026-11-16 a ramp was its whole box to every creature: a block in the way. (The owner's list: "enemies
 * walking on ramps".) Now a slope the knight can walk is ground to them too: solid only UNDER its surface, floor ON
 * it. And since a creature on a slope is no longer at the height it was made at, it is told the height of the floor
 * under it after every step (`floorUnder`, used by `keepOnFloor` in foe.ts).
 *
 * What they still do not do: fall. A creature never steps off an edge higher than a step; it stops there, as it
 * always has. Nor does it walk a slope too steep for the knight (over `MAX_WALK_SLOPE`): that is still a wall.
 */
import { slopeOf, slopeXZ, topAt, type Aabb } from '../world/collision';
import { MAX_WALK_SLOPE } from '../world/layout';

/** How high a step a creature takes without noticing: up onto a kerb, down off one. */
export const FOOT_STEP = 0.25;
/** How much of its body must be clear above its feet: anything solid between a step up and this is a wall. */
const BODY = 0.7;

/** A slope a creature can walk on. */
const walkable = (b: Aabb): boolean => !!b.ramp && slopeOf(b) <= MAX_WALK_SLOPE + 1e-6;
/** The top of a solid where a creature would be: a walkable slope's surface there (beside it: at its nearest edge); a box's top. */
const topFor = (b: Aabb, x: number, z: number): number => (walkable(b) ? topAt(b, x, z) : b.max.y);

/**
 * How steep the ground is under a place, for a creature whose feet are at `y`: the rise for one unit toward +x and
 * for one unit toward +z. Level ground: [0, 0].
 */
export function slopeUnder(colliders: readonly Aabb[], x: number, y: number, z: number): [number, number] {
  for (const b of colliders) {
    if (!walkable(b) || x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
    if (Math.abs(topAt(b, x, z) - y) <= FOOT_STEP + 0.1) return slopeXZ(b);
  }
  return [0, 0];
}

/**
 * Whether a creature of radius `r` can stand at (x, z) with its feet at `y`: there is floor under its middle within
 * a step of its feet, and nothing solid at body height anywhere under it.
 */
export function standsOn(colliders: readonly Aabb[], x: number, y: number, z: number, r: number): boolean {
  // (On a slope its uphill edge is over higher ground than its middle: that much more is a step to it, or it could
  // never walk off the top of a steep one onto the landing.)
  const [sx, sz] = slopeUnder(colliders, x, y, z);
  const step = FOOT_STEP + Math.hypot(sx, sz) * r;
  let floor = false;
  for (const b of colliders) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    const top = topFor(b, x, z);
    if (top > y + step && b.min.y < y + BODY) return false;
    if (Math.abs(top - y) <= step && x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z) floor = true;
  }
  return floor;
}

/** Whether something solid stands at body height over a place, for a creature whose feet are at `y`: a wall, a pillar, the side of a slope. (The ironback's ram bonks into it; the mantis will not leap through it.) */
export function wallOver(colliders: readonly Aabb[], x: number, y: number, z: number, r: number): boolean {
  for (const b of colliders) {
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) continue;
    if (topFor(b, x, z) > y + FOOT_STEP && b.min.y < y + BODY) return true;
  }
  return false;
}

/**
 * The height of the floor under a place, for a creature whose feet are at about `y`: the highest top within a step
 * of them (the same step `standsOn` allows a creature of radius `r` there: more on a slope). Null if there is none:
 * it is over a drop, or in a wall.
 */
export function floorUnder(colliders: readonly Aabb[], x: number, y: number, z: number, r = 0): number | null {
  const [sx, sz] = r > 0 ? slopeUnder(colliders, x, y, z) : [0, 0];
  const step = Math.max(FOOT_STEP + 0.25, FOOT_STEP + Math.hypot(sx, sz) * r + 0.02);
  let best: number | null = null;
  for (const b of colliders) {
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
    const top = topFor(b, x, z);
    if (Math.abs(top - y) > step) continue;
    if (best === null || top > best) best = top;
  }
  return best;
}
