import { TUNING } from '../data/tuning';
import type { HitResult, PlayerController } from '../player/controller';
import type { Foe } from '../enemies/foe';
import type { Glob } from '../enemies/toad';
import { TOAD } from '../enemies/toad';
import type { Crate } from '../world/crates';

/** What happened this tick, for effects: hit-stop, flashes, camera shake. */
export interface CombatEvents {
  enemyHit: Foe | null;
  enemyKilled: boolean;
  playerResult: HitResult | null;
  /** True on the tick a plunge lands: the blast all round. */
  shockwave: boolean;
  /** Crates broken this tick. */
  cratesBroken: Crate[];
  /** A sword that glanced off armour this tick (the ironback's shell): a clank and sparks, no harm. */
  glanced?: Foe | null;
}

function angleBetween(a: number, b: number): number {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

/**
 * Settles all hits for one simulation tick.
 *  - An air attack hits what it dives onto, and its landing hits everything around the rat.
 *  - The rat's sword hits each enemy inside the swing's reach and arc, once per swing.
 *  - An enemy's bite hits the rat if he is in front of it and in reach. A dodge avoids it; a guard facing it blocks it.
 *  - Bodies are kept from overlapping.
 */
export function resolveCombat(player: PlayerController, enemies: Foe[], events: CombatEvents, crates: Crate[] = []): void {
  events.cratesBroken.length = 0;
  events.enemyHit = null;
  events.enemyKilled = false;
  events.playerResult = null;
  events.shockwave = false;
  events.glanced = null;
  const p = player.position;

  events.shockwave = player.plungeImpact;
  resolveCrates(player, crates, events);
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - p.x;
    const dz = e.z - p.z;
    const dist = Math.hypot(dx, dz);
    const sameLevel = Math.abs(p.y - e.y) < 0.9;

    // Sword against enemy.
    if (player.attackActive && e.lastSwing !== player.swingId && sameLevel) {
      const clip = player.attackClip;
      const inArc = dist < e.radius + 0.25 || angleBetween(Math.atan2(dx, dz), player.facing) <= clip.arc;
      if (inArc && dist - e.radius <= clip.reach) {
        e.lastSwing = player.swingId;
        if (e.deflects?.(p.x, p.z, 'sword')) {
          // Off the shell: no harm, and his arm bounces back.
          events.glanced = e;
          player.recoil(e.x, e.z);
        } else {
          events.enemyHit = e;
          if (e.takeHit(clip.damage * player.gear.damage, p.x, p.z, 'sword')) events.enemyKilled = true;
        }
      }
    }

    // Air attack: the dive strikes whatever is right below, and the landing blasts everything near, all the way round.
    if (e.alive && e.lastSwing !== player.swingId) {
      const P = TUNING.plunge;
      let damage = 0;
      let how: 'plunge' | 'shock' = 'plunge';
      if (player.plungeStage === 2 && dist <= e.radius + P.diveRadius && e.y <= p.y + 0.3) damage = P.diveDamage;
      else if (player.plungeImpact && sameLevel && dist - e.radius <= P.shockRadius) {
        damage = P.shockDamage;
        how = 'shock';
      }
      if (damage > 0) {
        e.lastSwing = player.swingId;
        if (e.deflects?.(p.x, p.z, how)) events.glanced = e;
        else {
          events.enemyHit = e;
          if (e.takeHit(damage, p.x, p.z, how)) events.enemyKilled = true;
        }
      }
    }

    // Bite against the rat.
    if (e.attackActive && sameLevel && !player.dead) {
      const S = TUNING.scuttler;
      const B = e.bite ?? { reach: S.biteReach, arc: S.biteArc, damage: S.damage };
      const inFront = angleBetween(Math.atan2(-dx, -dz), e.biteDir ?? e.facing) <= B.arc;
      if (inFront && dist <= e.radius + B.reach + TUNING.rat.radius) {
        const result = player.takeHit(e.x, e.z, B.damage);
        events.playerResult = result;
        if (result !== 'dodged') e.lungeLanded(result === 'blocked', result === 'parried');
      }
    }

    // Keep the two bodies apart. The roach gives way, except in the middle of its lunge.
    const minDist = e.radius + TUNING.rat.radius;
    if (e.alive && e.state !== 'lunge' && e.state !== 'hop' && e.state !== 'pounce' && e.state !== 'swoop' && e.state !== 'ram' && sameLevel && dist < minDist && dist > 1e-4) {
      const push = minDist - dist;
      e.nudge((dx / dist) * push, (dz / dist) * push);
    }
  }
}

/** Crates break from a sword swing, a plunge dive, or a plunge landing near them. */
function resolveCrates(player: PlayerController, crates: Crate[], events: CombatEvents): void {
  const p = player.position;
  const P = TUNING.plunge;
  for (const c of crates) {
    if (!c.alive) continue;
    const dx = c.x - p.x;
    const dz = c.z - p.z;
    const dist = Math.hypot(dx, dz);
    const sameLevel = Math.abs(p.y - c.y) < 1.0;
    let broken = false;
    // A sword swing never breaks the crate he is standing on: its top must be above his feet.
    const standingOn = c.y + c.half <= p.y + 0.15;
    if (player.attackActive && c.lastSwing !== player.swingId && sameLevel && !standingOn) {
      const clip = player.attackClip;
      const inArc = dist < c.half + 0.25 || angleBetween(Math.atan2(dx, dz), player.facing) <= clip.arc;
      if (inArc && dist - c.half * 1.2 <= clip.reach) broken = true;
    }
    if (player.plungeStage === 2 && dist <= c.half + P.diveRadius && c.y + c.half <= p.y + 0.3) broken = true;
    if (player.plungeImpact && sameLevel && dist - c.half <= P.shockRadius) broken = true;
    if (broken) {
      c.alive = false;
      c.lastSwing = player.swingId;
      events.cratesBroken.push(c);
    }
  }
}

/**
 * Soft aim for a new swing: the nearest living enemy that is close and roughly where the player is pointing
 * (the stick direction if it is held, otherwise the rat's facing). Returns the yaw to face it, or null.
 */
export function pickAim(player: PlayerController, enemies: Foe[], stickX: number, stickZ: number): number | null {
  const want = stickX * stickX + stickZ * stickZ > 0.01 ? Math.atan2(stickX, stickZ) : player.facing;
  let best: number | null = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    if (!e.alive || Math.abs(player.position.y - e.y) >= 0.9) continue;
    const dx = e.x - player.position.x;
    const dz = e.z - player.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > TUNING.attack.aimRange + e.radius || dist >= bestDist) continue;
    const yaw = Math.atan2(dx, dz);
    if (angleBetween(yaw, want) > TUNING.attack.aimCone / 2 && dist > 1.0) continue;
    best = yaw;
    bestDist = dist;
  }
  return best;
}

/**
 * Globs of sludge against the rat. A glob that reaches him hurts him, unless he dodges through it or blocks it with a
 * raised shield facing it. A blocked or landed glob is used up; a dodged one flies on. Returns the globs that burst on him.
 */
export function resolveGlobs(player: PlayerController, globs: Glob[], events: CombatEvents): Glob[] {
  const burst: Glob[] = [];
  if (player.dead) return burst;
  const p = player.position;
  for (const g of globs) {
    if (g.done) continue;
    const dy = g.y - (p.y + TUNING.rat.height * 0.5);
    if (Math.hypot(g.x - p.x, g.z - p.z) > TUNING.rat.radius + 0.3 || Math.abs(dy) > TUNING.rat.height * 0.6) continue;
    const from = { x: g.x - g.vx, z: g.z - g.vz }; // it hits from the way it came
    const result = player.takeHit(from.x, from.z, TOAD.globDamage);
    if (result === 'dodged') continue;
    events.playerResult = result;
    g.done = true;
    burst.push(g);
  }
  return burst;
}
