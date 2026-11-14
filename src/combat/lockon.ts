/**
 * Enemy lock-on, in the style of Zelda 64: press the lock button to fix on the nearest foe in front of the camera; the camera
 * swings round to keep him in view, the rat faces him while he circles, and sword swings aim at him. Flick the right stick to
 * switch to the next foe; press again (or run far away, or kill him) to let go. All the choosing is here as plain functions.
 */
import type { Foe } from '../enemies/foe';

export const LOCK_RANGE = 14;
export const LOCK_DROP = 20;

interface Spot {
  x: number;
  y: number;
  z: number;
}

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** The yaw the camera must have to sit behind the rat, looking at the foe (the camera sits at rat + (sin yaw, cos yaw)). */
export const cameraYawToward = (rat: Spot, foe: Spot): number => Math.atan2(rat.x - foe.x, rat.z - foe.z);

/** The yaw the rat must face to look at the foe. */
export const facingToward = (rat: Spot, foe: Spot): number => Math.atan2(foe.x - rat.x, foe.z - rat.z);

/** Foes that can be locked on to: alive, near enough, and not on a very different level. */
function candidates(rat: Spot, foes: Foe[], range: number): Foe[] {
  return foes.filter((e) => e.alive && Math.hypot(e.x - rat.x, e.z - rat.z) <= range && Math.abs(e.y - rat.y) < 3.5);
}

/** The best foe to lock on to: near, and close to the middle of the screen. Null if there are none. */
export function pickTarget(rat: Spot, camYaw: number, foes: Foe[], range = LOCK_RANGE): Foe | null {
  const forward = camYaw + Math.PI; // the way the camera looks
  let best: Foe | null = null;
  let bestScore = Infinity;
  for (const e of candidates(rat, foes, range)) {
    const dist = Math.hypot(e.x - rat.x, e.z - rat.z);
    const off = Math.abs(wrap(Math.atan2(e.x - rat.x, e.z - rat.z) - forward));
    const score = dist + off * 4;
    if (score < bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

/** Where a foe is across the screen, negative left and positive right (from the camera's point of view). */
export function screenSide(rat: Spot, camYaw: number, foe: Spot): number {
  const f = camYaw + Math.PI;
  // The camera's right-hand direction is (-cos f, sin f) in (x, z).
  return (foe.x - rat.x) * -Math.cos(f) + (foe.z - rat.z) * Math.sin(f);
}

/** The next foe to the right (dir 1) or left (dir -1) of the current one, or the current one if there is none. */
export function switchTarget(rat: Spot, camYaw: number, current: Foe, foes: Foe[], dir: 1 | -1): Foe {
  const here = screenSide(rat, camYaw, current);
  let best: Foe = current;
  let bestGap = Infinity;
  for (const e of candidates(rat, foes, LOCK_RANGE)) {
    if (e === current) continue;
    const gap = (screenSide(rat, camYaw, e) - here) * dir;
    if (gap > 0.05 && gap < bestGap) {
      best = e;
      bestGap = gap;
    }
  }
  return best;
}

/** Keeps the lock while the foe is alive and within reach. If he dies, moves on to another nearby foe, or lets go (null). */
export function keepTarget(rat: Spot, camYaw: number, current: Foe, foes: Foe[]): Foe | null {
  if (current.alive && Math.hypot(current.x - rat.x, current.z - rat.z) <= LOCK_DROP) return current;
  return pickTarget(rat, camYaw, foes.filter((e) => e !== current), 9);
}
