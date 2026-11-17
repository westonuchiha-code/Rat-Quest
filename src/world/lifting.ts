/**
 * PICKING THINGS UP AND THROWING THEM.
 *
 * The owner, 2026-11-17 (of what the levels still lack to be fun to move about in): "we still need him to be able to
 * pick up and throw things for example"; and, asked what next, he chose it.
 *
 * WHAT CAN BE LIFTED: a crate or a barrel (the things that break). He stands by one, facing it, and presses STOW
 * (triangle; with nothing to lift it puts his sword away, as it did). It goes up over his head. Carrying it he walks
 * slower and jumps lower, and cannot fight, guard, roll or ride: his hands are full.
 *   ATTACK throws it: AT the creature in front of him (or the one he is locked on to), if there is one in range;
 *   else the way he faces, in a low arc. It breaks on what it meets: a wall, the floor, a creature. A creature it meets is
 *   hurt (`TUNING.lift.damage`: as much as the last blow of his three), unless its armour turns it. What was in the
 *   crate is left where it broke.
 *   STOW again sets it down in front of him, whole, if there is room.
 *   Hurt, or in water, he lets go: it falls where he is and breaks.
 * An IRON-BOUND crate does not break: thrown, it lands whole and can be thrown again.
 * ALSO: a clay POT (light: it flies further and hurts less) and a ROCK (it never breaks: thrown again and again); see
 * `THROWN_AS`. And a CREATURE THAT IS DOWN (`DOWN_STATES`): picked up the same way, thrown the same way.
 *
 * Plain logic (no drawing, no sound): the game moves the crate's picture and its solid box (chamber.ts) as this says.
 */
import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { topAt, type Aabb } from './collision';
import type { Crate } from './crates';

/** The nearest crate or barrel he could lift from where he stands: beside him, in front of him, standing on his own floor. */
export function liftTarget(crates: readonly Crate[], pos: { x: number; y: number; z: number }, facing: number): Crate | null {
  const L = TUNING.lift;
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  let best: Crate | null = null;
  let bestD = Infinity;
  for (const c of crates) {
    if (!c.alive || c.lifted || c.type === 'pipe') continue;
    // (On his floor: its foot no higher than a step above his feet, and not below them by more than that.)
    if (Math.abs(c.aabb.min.y - pos.y) > 0.4) continue;
    const dx = c.x - pos.x;
    const dz = c.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d > c.half + TUNING.rat.radius + L.reach) continue;
    // (In front of him: within a third of a turn of where he faces. Right against it, any way he faces.)
    if (d > 1e-6 && (dx * fx + dz * fz) / d < 0.5) continue;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Where the middle of a thing of this half-height is while he carries it: over his head. */
export function carryPlace(pos: { x: number; y: number; z: number }, halfHigh: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(pos.x, pos.y + TUNING.rat.height + TUNING.lift.hold + halfHigh, pos.z);
}

/**
 * HOW EACH KIND OF THING IS THROWN. `speed`: of `TUNING.lift.throwSpeed` (a light thing goes faster and so further).
 * `damage`: to a creature it hits. `breaks`: it breaks on what it meets (else it lands whole, to be thrown again).
 * `light`: carrying it hardly slows him.
 */
export const THROWN_AS: Record<'crate' | 'barrel' | 'pot' | 'rock', { speed: number; damage: number; breaks: boolean; light: boolean }> = {
  crate: { speed: 1, damage: 2, breaks: true, light: false },
  barrel: { speed: 1, damage: 2, breaks: true, light: false },
  // A pot is light: thrown half as far again, it hurts half as much. A sword breaks it too.
  pot: { speed: 1.35, damage: 1, breaks: true, light: true },
  // A rock does not break: it hurts as a crate does, every time it is thrown.
  rock: { speed: 1.2, damage: 2, breaks: false, light: true },
};
/** How this one is thrown (an iron-bound crate does not break either). */
export function thrownAs(c: Crate): { speed: number; damage: number; breaks: boolean; light: boolean } {
  const as = THROWN_AS[c.type === 'pipe' ? 'crate' : c.type];
  return c.tough ? { ...as, breaks: false } : as;
}

/**
 * A CREATURE THAT IS DOWN CAN BE PICKED UP AND THROWN: one knocked out of the air and lying on the floor, one lying
 * open on its back, one sprawled, one with its blades stuck in the ground. (Small ones only: not a boss, not a knight
 * in armour. And not one that is merely flinching from a blow: that is over in a third of a second.)
 * By kind: the states in which it can be taken up. Carried, it does nothing (its own clock is stopped); after
 * `TUNING.lift.foeHold` seconds it wriggles free. Thrown, it is hurt where it lands, and hurts what it lands on.
 */
export const DOWN_STATES: Readonly<Record<string, readonly string[]>> = {
  bat: ['grounded'],
  firefly: ['grounded'],
  hornet: ['grounded'],
  roller: ['spilled'],
  scorpion: ['sprawl'],
  mantis: ['stuck'],
};
/**
 * Whether a creature is down: in one of its kind's down states, or it says so itself (`down`: a ROACH flipped on its
 * back, a TOAD winded, by a PERFECT GUARD on its attack. That is two seconds, and it is earned: nothing about how
 * they fight was changed to make it so).
 */
export function isDown(e: { kind: string; state: string; down?: boolean }): boolean {
  return !!e.down || !!DOWN_STATES[e.kind]?.includes(e.state);
}
/** The nearest creature he could pick up from where he stands (its place in the list), or -1. */
export function liftFoe(foes: ReadonlyArray<{ kind: string; state: string; alive: boolean; x: number; y: number; z: number; radius: number; down?: boolean }>, pos: { x: number; y: number; z: number }, facing: number): number {
  const L = TUNING.lift;
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  let best = -1;
  let bestD = Infinity;
  foes.forEach((e, i) => {
    if (!e.alive || !isDown(e) || Math.abs(e.y - pos.y) > 0.6) return;
    const dx = e.x - pos.x;
    const dz = e.z - pos.z;
    const d = Math.hypot(dx, dz);
    if (d > e.radius + TUNING.rat.radius + L.reach || (d > 1e-6 && (dx * fx + dz * fz) / d < 0.5) || d >= bestD) return;
    bestD = d;
    best = i;
  });
  return best;
}

/** Something in the air: thrown, or let go of. `what`: the thing (a crate, or a creature). */
export interface Thrown<T = Crate> {
  what: T;
  /** Half its size, and its own solid box, if it has one (which it does not meet). */
  half: number;
  skip: Aabb | null;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Where it was thrown from (which way a blow from it comes). */
  from: { x: number; z: number };
  /** It has hit something and only falls now (a thing that does not break), or was only let go of. */
  spent: boolean;
  age: number;
}

/**
 * A thing leaving his hands.
 * THROWN (`hard` 1): the way he faces, in a low arc; he adds a share of his own speed. With `aim` (a creature in front
 * of him: see `throwAim`), AT it: he has no way to tilt a throw up or down, so one thrown at something goes to it,
 * near or far, on the ground or in the air. `speed`: of the usual (a light thing goes faster).
 * LET GO OF (`hard` 0): it only falls.
 */
export function startThrow<T>(what: T, half: number, skip: Aabb | null, hands: THREE.Vector3, facing: number, his: { x: number; z: number }, hard = 1, aim: { x: number; y: number; z: number } | null = null, speed = 1): Thrown<T> {
  const L = TUNING.lift;
  const along = L.throwSpeed * speed;
  const vel = new THREE.Vector3(Math.sin(facing) * along * hard + his.x * 0.5 * hard, L.throwUp * hard, Math.cos(facing) * along * hard + his.z * 0.5 * hard);
  if (aim && hard > 0) {
    const dx = aim.x - hands.x;
    const dz = aim.z - hands.z;
    // (As long in the air as its speed along takes to get there; never so short that it is a blur.)
    const time = Math.max(0.22, Math.hypot(dx, dz) / along);
    vel.set(dx / time, (aim.y - hands.y + 0.5 * L.gravity * time * time) / time, dz / time);
  }
  return { what, half, skip, pos: hands.clone(), vel, from: { x: hands.x, z: hands.z }, spent: hard <= 0, age: 0 };
}

/**
 * WHAT A THROW IS AIMED AT: the creature he has locked on to, if it is in range; else the nearest living one in front
 * of him (within `aimArc` of the way he faces, and `aimRange`). The middle of its body. Null: nothing, and the throw
 * goes the way he faces.
 */
export function throwAim(targets: readonly Target[], pos: { x: number; y: number; z: number }, facing: number, locked: number | null = null): { x: number; y: number; z: number } | null {
  const L = TUNING.lift;
  const middle = (e: Target): { x: number; y: number; z: number } => ({ x: e.x, y: e.y + Math.min(e.high, 1.2) * 0.5, z: e.z });
  const lock = locked !== null ? targets[locked] : undefined;
  if (lock?.alive && Math.hypot(lock.x - pos.x, lock.z - pos.z) <= L.aimRange * 1.3) return middle(lock);
  let best: Target | null = null;
  let bestD: number = L.aimRange;
  for (const e of targets) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - pos.x, e.z - pos.z);
    if (d >= bestD || d < 1e-6) continue;
    const off = Math.atan2(e.x - pos.x, e.z - pos.z) - facing;
    if (Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) > L.aimArc) continue;
    bestD = d;
    best = e;
  }
  return best ? middle(best) : null;
}

/** A creature a thrown thing can hit: a round body standing at (x, y, z), `high` tall. */
export interface Target { x: number; y: number; z: number; r: number; high: number; alive: boolean; parts?: ReadonlyArray<{ x: number; z: number; r: number }> }

export type ThrowHit = { what: 'none' } | { what: 'solid'; box: Aabb } | { what: 'foe'; index: number; part: number } | { what: 'lost' };

/** True if a ball of radius r at p is in this box (under its slope, if it is a ramp). */
function inBox(b: Aabb, p: THREE.Vector3, r: number): boolean {
  if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z || p.y + r <= b.min.y) return false;
  const top = b.ramp ? topAt(b, Math.max(b.min.x, Math.min(b.max.x, p.x)), Math.max(b.min.z, Math.min(b.max.z, p.z))) : b.max.y;
  return p.y - r < top;
}

/**
 * Moves a thrown thing on by `dt` and says what it met: nothing; something solid (`box`); a creature (which one, and
 * which part of a long body, -1 its own); or `lost` (it fell out of the world). It stops where it met it.
 * (It moves in steps no longer than a third of its own size, so it cannot pass through a thin wall or a small beast.)
 */
export function stepThrown(t: Thrown<unknown>, dt: number, colliders: readonly Aabb[], targets: readonly Target[]): ThrowHit {
  const L = TUNING.lift;
  const r = t.half * 0.85;
  const far = Math.hypot(t.vel.x, t.vel.y, t.vel.z) * dt;
  const steps = Math.max(1, Math.ceil(far / (t.half * 0.33)));
  const h = dt / steps;
  for (let s = 0; s < steps; s++) {
    t.vel.y -= L.gravity * h;
    t.pos.x += t.vel.x * h;
    t.pos.y += t.vel.y * h;
    t.pos.z += t.vel.z * h;
    t.age += h;
    if (t.pos.y < -60) return { what: 'lost' };
    if (!t.spent) {
      for (let i = 0; i < targets.length; i++) {
        const e = targets[i];
        if (!e.alive || t.pos.y + r < e.y || t.pos.y - r > e.y + e.high) continue;
        if (Math.hypot(e.x - t.pos.x, e.z - t.pos.z) < e.r + r) return { what: 'foe', index: i, part: -1 };
        const parts = e.parts ?? [];
        for (let k = 0; k < parts.length; k++) if (Math.hypot(parts[k].x - t.pos.x, parts[k].z - t.pos.z) < parts[k].r + r) return { what: 'foe', index: i, part: k };
      }
    }
    for (const b of colliders) if (b !== t.skip && inBox(b, t.pos, r)) return { what: 'solid', box: b };
  }
  return { what: 'none' };
}

/** The highest ground under a spot (a box of half-width `half`), at or below `from`: where a thing set down there would stand. */
export function groundUnder(colliders: readonly Aabb[], x: number, z: number, half: number, from: number, skip?: Aabb): number {
  let best = -Infinity;
  for (const b of colliders) {
    if (b === skip || x + half <= b.min.x || x - half >= b.max.x || z + half <= b.min.z || z - half >= b.max.z) continue;
    const top = b.ramp ? topAt(b, Math.max(b.min.x, Math.min(b.max.x, x)), Math.max(b.min.z, Math.min(b.max.z, z))) : b.max.y;
    if (top <= from + 0.05 && top > best) best = top;
  }
  return best;
}

/**
 * Where a carried thing can be SET DOWN: on the floor in front of him, clear of him, if nothing is in that space and
 * the floor there is about level with his own (not off a ledge, not up a step). Its middle; or null: no room.
 */
export function putDownSpot(colliders: readonly Aabb[], pos: { x: number; y: number; z: number }, facing: number, crate: Crate): THREE.Vector3 | null {
  const L = TUNING.lift;
  const hx = (crate.aabb.max.x - crate.aabb.min.x) / 2;
  const hy = (crate.aabb.max.y - crate.aabb.min.y) / 2;
  const hz = (crate.aabb.max.z - crate.aabb.min.z) / 2;
  const half = Math.max(hx, hz);
  const out = TUNING.rat.radius + half + L.down;
  const x = pos.x + Math.sin(facing) * out;
  const z = pos.z + Math.cos(facing) * out;
  const floor = groundUnder(colliders, x, z, half * 0.9, pos.y + 0.4, crate.aabb);
  if (!Number.isFinite(floor) || Math.abs(floor - pos.y) > 0.4) return null;
  // Nothing in the space it would fill.
  for (const b of colliders) {
    if (b === crate.aabb || x + hx <= b.min.x + 0.02 || x - hx >= b.max.x - 0.02 || z + hz <= b.min.z + 0.02 || z - hz >= b.max.z - 0.02) continue;
    const top = b.ramp ? topAt(b, x, z) : b.max.y;
    if (top > floor + 0.05 && b.min.y < floor + hy * 2 - 0.05) return null;
  }
  return new THREE.Vector3(x, floor + hy, z);
}
