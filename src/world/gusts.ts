/**
 * Gusts: jets of gas that PUSH. Logic only, so it runs in tests.
 *
 * A `jet` decor is puffs of gas running out along a line (chamber.ts draws them). One with `push` set is a gust: where
 * its gas is, whoever is in it is carried along with it, up to the speed `push`. What is drawn is what pushes: the gas
 * is at a place along the jet exactly when a puff is drawn there (both go by `gasAt`, on the same clock), and the
 * gust is as wide there as the puffs are.
 * On ground he can grip, he stands against it (his own stopping is stronger than its push). On ice, where he keeps his
 * momentum, it takes him.
 */
import type { Decor } from './layout';

/** How fast a jet's gas runs out along it. */
export const JET_SPEED = 3.4;
/** How hard a gust pushes: speed gained a second, until he is going as fast as it blows. */
export const GUST_ACCEL = 12;

export interface Gust {
  x: number;
  y: number;
  z: number;
  /** Which way it blows: a unit vector. */
  dx: number;
  dy: number;
  dz: number;
  length: number;
  /** How wide its gas is where it ends. */
  width: number;
  /** The speed it carries him to. */
  push: number;
  every: number;
  on: number;
  delay: number;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** A level's gusts: its jets that push. */
export function gustsOf(decor: readonly Decor[]): Gust[] {
  return jetsOf(decor).filter((j) => j.push > 0);
}
/** Every jet of a level, pushing or not (those that do not have `push` 0): for what is heard of them. */
export function jetsOf(decor: readonly Decor[]): Gust[] {
  const out: Gust[] = [];
  for (const d of decor) {
    if (d.kind !== 'jet') continue;
    const len = Math.hypot(...d.dir) || 1;
    out.push({ x: d.x, y: d.y, z: d.z, dx: d.dir[0] / len, dy: d.dir[1] / len, dz: d.dir[2] / len, length: d.length, width: d.width ?? d.length * 0.55, push: d.push ?? 0, every: d.every ?? 0, on: d.on ?? 0, delay: d.delay ?? 0 });
  }
  return out;
}

/**
 * Whether a jet's gas is `along` it (a distance from its mouth) at `time`: the gas there left the mouth `along /
 * JET_SPEED` ago, and a jet that comes in gusts lets gas go only for the first `on` seconds of every `every`
 * (counted from `delay`).
 */
export function gasAt(j: { every: number; on: number; delay: number }, time: number, along: number): boolean {
  if (j.every <= 0) return true;
  return mod(time - along / JET_SPEED - j.delay, j.every) < j.on;
}
/** How wide a jet's gas is `along` it: narrow at the mouth, `width` at its end. */
export function gasWidth(j: { width: number; length: number }, along: number): number {
  return j.width * (0.14 + 0.86 * Math.max(0, Math.min(1, along / j.length)));
}

/**
 * How far a place is from the nearest of a jet's gas, as it is now: from the line of the jet, wherever along it there
 * is gas. Infinity if it has none out at the moment.
 */
export function gasNear(j: Gust, time: number, x: number, y: number, z: number): number {
  let best = Infinity;
  for (let along = 0; along <= j.length + 1e-9; along += 0.5) {
    if (!gasAt(j, time, along)) continue;
    best = Math.min(best, Math.hypot(x - (j.x + j.dx * along), y - (j.y + j.dy * along), z - (j.z + j.dz * along)));
  }
  return best;
}

/** The gust that has a body in it now (its middle at x, y, z; `r` round), if any. */
export function gustOn(gusts: readonly Gust[], time: number, x: number, y: number, z: number, r: number): Gust | null {
  for (const g of gusts) {
    const px = x - g.x;
    const py = y - g.y;
    const pz = z - g.z;
    const along = px * g.dx + py * g.dy + pz * g.dz;
    if (along < 0 || along > g.length) continue;
    const off = Math.hypot(px - g.dx * along, py - g.dy * along, pz - g.dz * along);
    if (off > gasWidth(g, along) * 0.5 + r) continue;
    if (gasAt(g, time, along)) return g;
  }
  return null;
}

/**
 * Blows on him for one step: if he is in a gust, his speed across the floor is pushed toward the gust's, the way it
 * blows. `feet` and `velocity` are his; the velocity is changed. Returns the gust, if one had him.
 */
export function blow(gusts: readonly Gust[], time: number, feet: { x: number; y: number; z: number }, velocity: { x: number; z: number }, dt: number, radius: number, height: number): Gust | null {
  const g = gustOn(gusts, time, feet.x, feet.y + height / 2, feet.z, radius);
  if (!g) return null;
  const flat = Math.hypot(g.dx, g.dz);
  if (flat < 1e-6) return g;
  const ux = g.dx / flat;
  const uz = g.dz / flat;
  const with_ = velocity.x * ux + velocity.z * uz;
  if (with_ >= g.push) return g;
  const add = Math.min(g.push - with_, GUST_ACCEL * dt);
  velocity.x += ux * add;
  velocity.z += uz * add;
  return g;
}
