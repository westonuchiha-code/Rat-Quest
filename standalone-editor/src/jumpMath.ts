/**
 * Jump arithmetic: how high, how far, how tall a ledge, how wide a chimney, worked out from a game's own jump numbers.
 * It is the arithmetic Rat Quest's jump checker uses, with the numbers passed in rather than read from its tables.
 *
 * Every answer is a little short of the perfect best, so "can be reached" means a fair jump a player can make, not one
 * frame-perfect press.
 */

export interface JumpParams {
  /** Pull while rising (units per second squared). */
  gravity: number;
  /** Extra pull while falling (1: none). */
  fallGravityMultiplier: number;
  /** Speed straight up at the jump. */
  jumpVelocity: number;
  /** Speed straight up at each jump in the air. */
  doubleJumpVelocity?: number;
  /** Jumps in the air (0: none). */
  airJumps?: number;
  /** Top running speed along the ground. */
  runSpeed: number;
  /** Grace after walking off a ledge in which a jump still counts (seconds). */
  coyoteTime?: number;
  /** A long jump: speed up, and speed along. Leave out if there is none. */
  longJumpUp?: number;
  longJumpSpeed?: number;
  /** A wall kick: speed up, and push away from the wall. Leave out if there is none. */
  wallKickUp?: number;
  wallKickPush?: number;
  /** How far above the top of his jump he can still catch a ledge and climb it (0: no ledge grab). */
  ledgeGrab?: number;
  /** His radius (for chimneys: the gap is wall to wall). */
  radius?: number;
}

/** How fair a jump must be: the share of the best possible reach that counts. */
export const FAIR = 0.92;

/** The height of his first jump (no air jumps). */
export function jumpHeight(p: JumpParams): number {
  return (p.jumpVelocity * p.jumpVelocity) / (2 * p.gravity);
}

/** The height with every air jump used. */
export function fullHeight(p: JumpParams): number {
  const h1 = jumpHeight(p);
  const v2 = p.doubleJumpVelocity ?? p.jumpVelocity;
  return h1 + (p.airJumps ?? 0) * ((v2 * v2) / (2 * p.gravity));
}

/** Horizontal reach of a running jump that lands `dh` higher (negative: lower). 0 when it cannot be reached. */
export function jumpReach(p: JumpParams, dh: number, useLongJump = true): number {
  const g = p.gravity;
  const gf = g * p.fallGravityMultiplier;
  const v = p.jumpVelocity;
  const v2 = p.doubleJumpVelocity ?? v;
  const n = p.airJumps ?? 0;
  const h1 = (v * v) / (2 * g);
  let t = -1;
  if (dh <= h1) t = v / g + Math.sqrt((2 * (h1 - dh)) / gf);
  // With each jump in the air taken at the top of the last.
  let h = h1;
  let up = v / g;
  for (let k = 0; k < n; k++) {
    h += (v2 * v2) / (2 * g);
    up += v2 / g;
    if (dh <= h) t = Math.max(t, up + Math.sqrt((2 * (h - dh)) / gf));
  }
  let longReach = 0;
  if (useLongJump && p.longJumpUp && p.longJumpSpeed) {
    const lh = (p.longJumpUp * p.longJumpUp) / (2 * g);
    if (dh <= lh) longReach = p.longJumpSpeed * (p.longJumpUp / g + Math.sqrt((2 * (lh - dh)) / gf));
  }
  if (t < 0 && longReach <= 0) return 0;
  const best = Math.max(t < 0 ? 0 : p.runSpeed * (t + (p.coyoteTime ?? 0)), longReach);
  return best * FAIR;
}

/** The highest ledge he can get onto from flat ground: the top of his jump, plus the ledge grab. */
export function maxClimb(p: JumpParams, grab = true): number {
  return fullHeight(p) + (grab ? (p.ledgeGrab ?? 0) : -0.15);
}

/**
 * How far apart two facing walls can be and still be kicked up between: he gains height on every kick for as long as
 * he reaches the far wall higher than he left the near one. `gain` is how much each kick must gain (half a unit: any
 * way up a determined player could take; more: a way an ordinary player takes). 0 when there is no wall kick.
 */
export function maxChimney(p: JumpParams, gain = 0.5): number {
  if (!p.wallKickUp || !p.wallKickPush) return 0;
  const g = p.gravity;
  const peak = (p.wallKickUp * p.wallKickUp) / (2 * g);
  const spare = Math.max(0, peak - gain);
  const time = p.wallKickUp / g + Math.sqrt((2 * spare) / (g * p.fallGravityMultiplier));
  return p.wallKickPush * time + (p.radius ?? 0) * 2;
}

/**
 * The path of a running jump, for drawing: points [along, up] every `dt` seconds until he is `floor` below where he
 * jumped. Air jumps are taken at the top of each rise.
 */
export function jumpArc(p: JumpParams, opts: { floor?: number; dt?: number; airJumps?: number } = {}): Array<[number, number]> {
  const floor = opts.floor ?? 0;
  const dt = opts.dt ?? 1 / 30;
  let left = Math.min(opts.airJumps ?? p.airJumps ?? 0, p.airJumps ?? 0);
  let x = 0;
  let y = 0;
  let vy = p.jumpVelocity;
  const out: Array<[number, number]> = [[0, 0]];
  for (let i = 0; i < 4000; i++) {
    if (vy <= 0 && left > 0) {
      vy = p.doubleJumpVelocity ?? p.jumpVelocity;
      left--;
    }
    vy -= (vy > 0 ? p.gravity : p.gravity * p.fallGravityMultiplier) * dt;
    x += p.runSpeed * dt;
    y += vy * dt;
    out.push([x, y]);
    if (vy < 0 && y <= floor) break;
  }
  return out;
}
