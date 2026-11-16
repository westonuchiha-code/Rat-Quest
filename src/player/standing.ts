/**
 * Two small rules about where he stands, kept apart from the game's loop so that they can be tested.
 *
 * 1. WHERE HE IS DRAWN. The rules stand him on the highest thing any part of his round foot is over, so coming up to a
 *    step he is lifted onto it while his feet are still over the tread below. So he is DRAWN eased onto what is under
 *    his feet, and walks up stairs instead of hopping. That easing is for WALKING. In the air, or going down a slope on
 *    his shield or his hide, where he is is where he is drawn: eased there, he was drawn lagging behind a fast fall
 *    and then snapped down to it whenever the lag passed the limit, again and again. (The owner, 2026-11-16: "if it's
 *    a long fall it's a jittery ... towards the end of the Fall".)
 *
 * 2. WHERE HE IS PUT BACK. Fallen into the dark he is put back on the last ground he stood on. He counts as standing
 *    with his middle past an edge (his round foot still overlaps it): put back THERE, he was drawn standing on
 *    nothing beside the ledge. (The owner, the same day: "When coming back up from falling down you can sometimes be
 *    standing Off the ledge".) A place is only taken as safe when there is ground under his middle and a little way
 *    round it on every side.
 */
import { topAt, type Aabb } from '../world/collision';

/** How far from where he is the drawn height may ease before it simply goes there. */
export const DRAW_SNAP = 0.6;
/** How fast it eases, walking (per second). */
export const DRAW_EASE = 22;

/**
 * The height he is drawn at this frame. `want`: where he should be drawn (what is under his feet, or where the rules
 * have him). `loose`: he is in the air, riding or sliding: no easing.
 */
export function drawnHeight(was: number, want: number, loose: boolean, frameDt: number): number {
  if (loose || Math.abs(want - was) > DRAW_SNAP) return want;
  return frameDt > 0 ? was + (want - was) * Math.min(1, frameDt * DRAW_EASE) : was;
}

/** How far round his middle there must be ground for a place to be one he can be put back on. */
export const SAFE_MARGIN = 0.45;

/** Whether there is ground at his feet's height under a point (within a small step of it). */
function groundAt(colliders: readonly Aabb[], x: number, y: number, z: number): boolean {
  for (const b of colliders) {
    if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
    if (Math.abs(topAt(b, x, z) - y) <= 0.3) return true;
  }
  return false;
}

/** Whether a place he is standing is one to put him back on after a fall: ground under his middle and round it on every side. */
export function safeToReturnTo(colliders: readonly Aabb[], x: number, y: number, z: number, margin = SAFE_MARGIN): boolean {
  if (!groundAt(colliders, x, y, z)) return false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!groundAt(colliders, x + dx * margin, y, z + dz * margin)) return false;
  return true;
}
