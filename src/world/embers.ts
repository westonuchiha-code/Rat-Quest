/**
 * Drops of fire, and the flames they leave. Logic only, so it runs in tests.
 *
 * A firefly lets a drop of its light fall. It drifts down (slower than a thrown thing), and where it meets the floor
 * a patch of flame burns for a few seconds. The flames are the danger, not the drop: whoever stands in them is
 * burned (no shield or roll helps; the Ember Helm does), and a jump clears them. Where a drop WILL land is known the
 * moment it is let go (`emberLanding` runs the same fall), so the game can mark the spot on the floor: what is drawn
 * there is where the flames will be.
 */
import { topAt, type Aabb } from './collision';
export interface Ember {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** How hard it falls. */
  gravity: number;
  age: number;
  done: boolean;
  /** Time it has not yet fallen through (it falls in whole small steps). */
  owed: number;
  /** Where it will land, worked out when it was let go: null if there is no floor under its fall (a pit, lava). */
  land: { x: number; y: number; z: number; t: number } | null;
  /** How big the flames it leaves are, and how long they burn. */
  radius: number;
  burnFor: number;
  /** The colour of its fire, if not a fire's own (only looks). */
  color?: number;
}

/** The floor under a point: the game's `groundBelow`. Null where there is none. */
export type GroundAt = (x: number, y: number, z: number) => number | null;

/**
 * The floor under a point, from a level's solid boxes: the highest top at or below it. `skip` are boxes that do not
 * count: the game leaves out everything that moves (a lift, a cart), so that a drop never marks, or catches on, a
 * floor that will not be there when it lands.
 */
export function groundFrom(colliders: ReadonlyArray<Aabb>, skip?: { has(b: object): boolean }): GroundAt {
  return (x, y, z) => {
    let best: number | null = null;
    for (const b of colliders) {
      if (x < b.min.x || x > b.max.x || z < b.min.z || z > b.max.z) continue;
      if (skip?.has(b)) continue;
      // (On a ramp, the height of its slope there.)
      const top = topAt(b, x, z);
      if (top <= y + 0.05 && (best === null || top > best)) best = top;
    }
    return best;
  };
}

const STEP = 1 / 60;
/** How far above the floor a drop is when it counts as landed. */
const TOUCH = 0.08;
const LIFE = 6;

/** One step of a drop's fall. True when it has met the floor (it is put on it), or fallen out of the world. */
function fall(e: { x: number; y: number; z: number; vx: number; vy: number; vz: number; gravity: number }, dt: number, groundAt: GroundAt): 'flying' | 'landed' | 'lost' {
  e.vy -= e.gravity * dt;
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  e.z += e.vz * dt;
  const ground = groundAt(e.x, e.y + 0.3, e.z);
  if (ground !== null && e.y <= ground + TOUCH) {
    e.y = ground;
    return 'landed';
  }
  return e.y < -8 ? 'lost' : 'flying';
}

/** Where and when a drop let go like this will land: the same fall, run ahead. Null if it meets no floor. */
export function emberLanding(from: { x: number; y: number; z: number; vx: number; vy: number; vz: number; gravity: number }, groundAt: GroundAt): { x: number; y: number; z: number; t: number } | null {
  const e = { ...from };
  for (let t = STEP; t < LIFE; t += STEP) {
    const r = fall(e, STEP, groundAt);
    if (r === 'landed') return { x: e.x, y: e.y, z: e.z, t };
    if (r === 'lost') return null;
  }
  return null;
}

/** A drop let go at a place with a speed. Its landing is worked out now. */
export function makeEmber(at: { x: number; y: number; z: number; vx: number; vy: number; vz: number; color?: number }, opts: { gravity: number; radius: number; burnFor: number }, groundAt: GroundAt): Ember {
  const e: Ember = { x: at.x, y: at.y, z: at.z, vx: at.vx, vy: at.vy, vz: at.vz, gravity: opts.gravity, age: 0, done: false, owed: 0, land: null, radius: opts.radius, burnFor: opts.burnFor, color: at.color };
  e.land = emberLanding(e, groundAt);
  return e;
}

/**
 * Moves the drops. Returns those that met the floor this step (each is on it now). They fall in fixed small steps,
 * the same steps `emberLanding` took, so they land where it said they would whatever the frame rate.
 */
export function stepEmbers(embers: Ember[], dt: number, groundAt: GroundAt): Ember[] {
  const landed: Ember[] = [];
  for (const e of embers) {
    if (e.done) continue;
    e.age += dt;
    e.owed += dt;
    while (e.owed >= STEP - 1e-9 && !e.done) {
      e.owed -= STEP;
      const r = fall(e, STEP, groundAt);
      if (r === 'landed') {
        e.done = true;
        landed.push(e);
      } else if (r === 'lost' || e.age > LIFE) e.done = true;
    }
  }
  return landed;
}

export interface Flame {
  x: number;
  y: number;
  z: number;
  r: number;
  age: number;
  life: number;
  /** Its colour, if not a fire's own (only looks). */
  color?: number;
}

/** How long flames take to catch, and to die down at the end. */
const CATCH = 0.12;
const DIE = 0.5;

/** How high a flame is burning, 0..1: it catches in a moment, burns, and dies down over its last half second. */
export function flameHeat(f: Flame): number {
  return Math.max(0, Math.min(1, f.age / CATCH, (f.life - f.age) / DIE));
}

/** The patches of flame burning on the floor. */
export class Flames {
  readonly list: Flame[] = [];

  add(x: number, y: number, z: number, r: number, life: number, color?: number): Flame {
    const f: Flame = { x, y, z, r, age: 0, life, color };
    this.list.push(f);
    return f;
  }

  step(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      this.list[i].age += dt;
      if (this.list[i].age >= this.list[i].life) this.list.splice(i, 1);
    }
  }

  clear(): void {
    this.list.length = 0;
  }

  /**
   * The patch that burns someone whose feet are at (x, y, z) and who is `radius` round, if any: he is in it (half
   * his width inside its edge), near its height (a jump clears it), and it is burning well (not just catching, nor
   * nearly out).
   */
  burning(x: number, y: number, z: number, radius: number): Flame | null {
    for (const f of this.list) {
      if (flameHeat(f) < 0.6) continue;
      if (y < f.y - 0.6 || y > f.y + 0.7) continue;
      if (Math.hypot(x - f.x, z - f.z) < f.r + radius * 0.5) return f;
    }
    return null;
  }
}
