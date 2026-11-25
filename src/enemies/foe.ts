/**
 * Asks the level whether a creature of radius `r` can stand at (x, z) with its feet at height y:
 * there is floor under it, and no wall, pillar, crate or step in the way. The game supplies it; without one, anywhere will do.
 */
export type CanStand = (x: number, y: number, z: number, r: number) => boolean;
/** The height of the floor under (x, z) for a creature whose feet are at about y: null over a drop or in a wall. The game supplies it. */
export type FloorUnder = (x: number, y: number, z: number, r?: number) => number | null;
/** Whether a wall (anything solid at body height) is at (x, z) for a creature standing at y: the ironback bonks into one. */
export type WallAt = (x: number, y: number, z: number, r: number) => boolean;
/** Whether a flier of radius r can be at (x, y, z), its body from y up: nothing solid there. */
export type CanFly = (x: number, y: number, z: number, r: number) => boolean;
/** How a hit arrives: the sword, a plunge diving onto it, the blast of a plunge landing near it, or a crate THROWN at it (world/lifting.ts: it is taken as a blast is, by whatever is not told otherwise). */
export type HitHow = 'sword' | 'plunge' | 'shock' | 'thrown';

/**
 * POISE (2026-11-25). A blow that staggers a creature stops what it was at. Until now EVERY blow did, so a sword
 * swung again and again held a creature where it stood till it died (measured, a knight who did nothing but swing:
 * the mantis spent a third of its fight staggered and never touched him). With poise: once it has been staggered, it
 * is BRACED for `armour` seconds after the stagger ends. Blows still hurt it then, but they do not stop it: it gets
 * its own blow out, and the one who only swings is struck. Each creature says how long (0: none, it is fodder).
 */
export class Poise {
  private left = 0;
  constructor(readonly armour: number) {}
  tick(dt: number): void {
    this.left = Math.max(0, this.left - dt);
  }
  /** Braced now: a blow will not stop it. */
  get braced(): boolean {
    return this.left > 0;
  }
  /** A blow has landed that would stagger it for `staggerFor` seconds. True: it does (and it is braced after). False: it is braced, and goes on. */
  take(staggerFor: number): boolean {
    if (this.left > 0) return false;
    this.left = staggerFor + this.armour;
    return true;
  }
  /** Braced from now for this long, whatever it was (a creature that has broken away and is coming back in). */
  brace(secs: number): void {
    this.left = Math.max(this.left, secs);
  }
  reset(): void {
    this.left = 0;
  }
}

/**
 * Keeps a creature out of the scenery. It has just moved from (fromX, fromZ); if where it is now is no good,
 * it slides along whichever way is still free, or stays where it was. (If it was somehow already stuck, it is left
 * alone so it can walk out.) Enemies used to be held only by the rectangle of their patch, so they could hop or be
 * knocked into a wall or a raised block, where they could still spit at the rat but could not be hit.
 */
export function keepOnFloor(e: { x: number; y: number; z: number; radius: number; canStand?: CanStand | null; floorUnder?: FloorUnder | null }, fromX: number, fromZ: number): void {
  const ok = e.canStand;
  if (!ok || Math.hypot(e.x - fromX, e.z - fromZ) > 2) return; // nothing to ask, or it was put somewhere new (a respawn)
  if (!ok(e.x, e.y, e.z, e.radius) && ok(fromX, e.y, fromZ, e.radius)) {
    if (ok(e.x, e.y, fromZ, e.radius)) e.z = fromZ;
    else if (ok(fromX, e.y, e.z, e.radius)) e.x = fromX;
    else {
      e.x = fromX;
      e.z = fromZ;
    }
  }
  // (Its feet go with the floor: up a slope, down one, onto a kerb. Until 2026-11-16 a creature kept the height it
  // was made at for good, and a ramp was a block in its way. See footing.ts.)
  const floor = e.floorUnder?.(e.x, e.y, e.z, e.radius);
  if (floor !== null && floor !== undefined) e.y = floor;
}

/**
 * Whether the rat is on ground a creature can WALK to in a straight line: at about its own height, or up or down a
 * slope from it. (Until creatures could walk slopes it was only "within 0.9 of my height": on a slope that lost him
 * as soon as he was two steps further up it.) It walks the line a pace at a time, its feet following the floor; a
 * drop, a wall or a ledge on the way and he is not reachable that way.
 */
export function sameGround(e: { x: number; y: number; z: number; floorUnder?: FloorUnder | null }, px: number, py: number, pz: number): boolean {
  if (Math.abs(py - e.y) < 0.9) return true;
  const floor = e.floorUnder;
  if (!floor || Math.abs(py - e.y) > 8) return false;
  const dx = px - e.x;
  const dz = pz - e.z;
  const steps = Math.ceil(Math.hypot(dx, dz) / 0.4);
  if (steps > 80) return false;
  let y = e.y;
  for (let i = 1; i <= steps; i++) {
    const g = floor(e.x + (dx * i) / steps, y, e.z + (dz * i) / steps);
    if (g === null) return false;
    y = g;
  }
  return Math.abs(py - y) < 0.9;
}

/** One round piece of a body, on the floor. */
export interface BodyPart {
  x: number;
  z: number;
  r: number;
}

/** What the combat code needs from any enemy, whatever kind it is. */
export interface Foe {
  readonly kind: 'scuttler' | 'toad' | 'boss' | 'ironback' | 'bat' | 'guard' | 'mantis' | 'stag' | 'brood' | 'wyrm' | 'hornet' | 'ant' | 'firefly' | 'widow' | 'scorpion' | 'roller' | 'sparkbeetle';
  x: number;
  y: number;
  z: number;
  facing: number;
  readonly radius: number;
  readonly alive: boolean;
  /** How it tells floor from wall. Set by the game when it is put in a level. */
  canStand?: CanStand | null;
  /** How its feet follow the floor up and down a slope. Set by the game with `canStand`. */
  floorUnder?: FloorUnder | null;
  state: string;
  stateTime: number;
  lastSwing: number;
  readonly respawns: boolean;
  /** True while a melee attack can hurt (the roach's lunge, the toad's landing, the boss's swoop). */
  readonly attackActive: boolean;
  /** The shape of that attack, if it is not the roach's bite: how far beyond its body, how wide (radians each side of its facing), how hard. */
  /** `heavy`: a shield does not stop it (only a perfect guard does). `ground`: it runs along the floor, and misses a rat in the air. */
  /** `at`: the blow comes from there (a place on its body, with that part's radius), not from its middle: a tail's lash. */
  /** `from`: where it is taken to come from, for his shield and for which way it throws him, if that is not `at` (a spike that comes down on where he stands comes from the beast it belongs to). */
  /** (`breaks`: a LARGE creature's blow: his shield stops it, and his guard is broken by it. `venom`: it poisons him even off his shield. TUNING.guard.) */
  readonly bite?: { reach: number; arc: number; damage: number; heavy?: boolean; breaks?: boolean; venom?: boolean; ground?: boolean; at?: BodyPart; from?: { x: number; z: number } };
  /**
   * The rest of a long body: more circles, besides its own (x, z, radius), that the sword can hit and the rat cannot walk
   * through. A blow that lands on one is passed to takeHit with that part's place in this list (its own circle is -1).
   */
  readonly parts?: ReadonlyArray<BodyPart>;
  /** Too heavy to be shouldered aside: where the two bodies meet, it is the rat who gives way. */
  readonly immovable?: boolean;
  /** Which way that attack points, if not where it faces (the ironback's buck kicks backwards). */
  readonly biteDir?: number;
  /** True if a hit from there would glance off its armour (the ironback's shell): no harm, and the sword bounces back. */
  deflects?(fromX: number, fromZ: number, how?: HitHow, part?: number): boolean;
  /** Set by the game for the creatures that need them. */
  wallAt?: WallAt | null;
  canFly?: CanFly | null;
  /** For enemies that take turns (director.ts): it wants to attack, it is attacking, it is allowed to start. */
  readonly ready?: boolean;
  readonly attacking?: boolean;
  mayAttack?: boolean;
  /**
   * Where round the rat it should WAIT, as a bearing from him (atan2(x, z)); null for wherever it likes. The director
   * sets it while he is locked on to another: the ones waiting go to his sides, where the lock does not look.
   */
  flank?: number | null;
  /** It is DOWN for a moment in a way that is not one of its states by name (a roach on its back, a toad winded, after a perfect guard): it can be picked up. */
  readonly down?: boolean;
  takeHit(damage: number, fromX: number, fromZ: number, how?: HitHow, part?: number): boolean;
  /** Its attack reached the rat: he was hit, or he blocked it, or he turned it aside with a perfectly timed shield. */
  lungeLanded(blocked: boolean, parried?: boolean): void;
  nudge(dx: number, dz: number): void;
  /** `threat`: the rat is swinging his sword this tick. */
  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean, threat?: boolean): void;
}

/** What the beasts can sense, changed by what he wears (a quiet scarf, a lamp on his helmet). */
/** `quiet`: he is sneaking (the game sets it each tick); a roosting bat only hears him from close by. */
export const SENSES = { notice: 1, quiet: false };
