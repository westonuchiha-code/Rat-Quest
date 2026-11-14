import { TUNING } from '../data/tuning';

/**
 * How far one running jump carries him over level ground (edge to where his centre lands), from the physics numbers.
 * Checked against the real controller in tests/leap.ts: the measured limit is about 6.9.
 * Parkour levels use this to space platforms close to the limit.
 */
export function maxRunJumpDistance(): number {
  const g = TUNING.physics.gravity;
  const v = TUNING.jump.velocity;
  const rise = v / g;
  const peak = (v * v) / (2 * g);
  const fall = Math.sqrt((2 * peak) / (g * TUNING.physics.fallGravityMultiplier));
  // The coyote window lets him jump a moment after leaving the edge, which adds to the reach.
  return TUNING.move.run * (rise + fall + TUNING.jump.coyoteTime);
}
