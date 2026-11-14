/**
 * Asks the level whether a creature of radius `r` can stand at (x, z) with its feet at height y:
 * there is floor under it, and no wall, pillar, crate or step in the way. The game supplies it; without one, anywhere will do.
 */
export type CanStand = (x: number, y: number, z: number, r: number) => boolean;
/** Whether a wall (anything solid at body height) is at (x, z) for a creature standing at y: the ironback bonks into one. */
export type WallAt = (x: number, y: number, z: number, r: number) => boolean;
/** Whether a flier of radius r can be at (x, y, z), its body from y up: nothing solid there. */
export type CanFly = (x: number, y: number, z: number, r: number) => boolean;
/** How a hit arrives: the sword, a plunge diving onto it, or the blast of a plunge landing near it. */
export type HitHow = 'sword' | 'plunge' | 'shock';

/**
 * Keeps a creature out of the scenery. It has just moved from (fromX, fromZ); if where it is now is no good,
 * it slides along whichever way is still free, or stays where it was. (If it was somehow already stuck, it is left
 * alone so it can walk out.) Enemies used to be held only by the rectangle of their patch, so they could hop or be
 * knocked into a wall or a raised block, where they could still spit at the rat but could not be hit.
 */
export function keepOnFloor(e: { x: number; y: number; z: number; radius: number; canStand?: CanStand | null }, fromX: number, fromZ: number): void {
  const ok = e.canStand;
  if (!ok || Math.hypot(e.x - fromX, e.z - fromZ) > 2) return; // nothing to ask, or it was put somewhere new (a respawn)
  if (ok(e.x, e.y, e.z, e.radius) || !ok(fromX, e.y, fromZ, e.radius)) return;
  if (ok(e.x, e.y, fromZ, e.radius)) e.z = fromZ;
  else if (ok(fromX, e.y, e.z, e.radius)) e.x = fromX;
  else {
    e.x = fromX;
    e.z = fromZ;
  }
}

/** What the combat code needs from any enemy, whatever kind it is. */
export interface Foe {
  readonly kind: 'scuttler' | 'toad' | 'boss' | 'ironback' | 'bat';
  x: number;
  y: number;
  z: number;
  facing: number;
  readonly radius: number;
  readonly alive: boolean;
  /** How it tells floor from wall. Set by the game when it is put in a level. */
  canStand?: CanStand | null;
  state: string;
  stateTime: number;
  lastSwing: number;
  readonly respawns: boolean;
  /** True while a melee attack can hurt (the roach's lunge, the toad's landing, the boss's swoop). */
  readonly attackActive: boolean;
  /** The shape of that attack, if it is not the roach's bite: how far beyond its body, how wide (radians each side of its facing), how hard. */
  readonly bite?: { reach: number; arc: number; damage: number };
  /** Which way that attack points, if not where it faces (the ironback's buck kicks backwards). */
  readonly biteDir?: number;
  /** True if a hit from there would glance off its armour (the ironback's shell): no harm, and the sword bounces back. */
  deflects?(fromX: number, fromZ: number, how?: HitHow): boolean;
  /** Set by the game for the creatures that need them. */
  wallAt?: WallAt | null;
  canFly?: CanFly | null;
  /** For enemies that take turns (director.ts): it wants to attack, it is attacking, it is allowed to start. */
  readonly ready?: boolean;
  readonly attacking?: boolean;
  mayAttack?: boolean;
  takeHit(damage: number, fromX: number, fromZ: number, how?: HitHow): boolean;
  /** Its attack reached the rat: he was hit, or he blocked it, or he turned it aside with a perfectly timed shield. */
  lungeLanded(blocked: boolean, parried?: boolean): void;
  nudge(dx: number, dz: number): void;
  /** `threat`: the rat is swinging his sword this tick. */
  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean, threat?: boolean): void;
}

/** What the beasts can sense, changed by what he wears (a quiet scarf, a lamp on his helmet). */
/** `quiet`: he is sneaking (the game sets it each tick); a roosting bat only hears him from close by. */
export const SENSES = { notice: 1, quiet: false };
