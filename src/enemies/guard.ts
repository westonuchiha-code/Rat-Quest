import { SENSES, keepOnFloor, type FloorUnder, sameGround, Poise } from './foe';
import { flankWay } from './director';
import type { CanStand, HitHow } from './foe';

/**
 * Keep Guard: one of the king's rats, his own size, behind a tall shield with a spear. Logic only, so it runs in tests.
 *
 * Where the ironback asks where you stand, the guard asks when you strike. He is a duellist:
 *   He keeps his shield on the rat (he turns too fast to run round), comes up to spear's length and stops there.
 *   A sword on his shield clanks off, and the rat's arm bounces back. Hammer on it and he strikes back at once.
 *   His attack is the thrust: he draws the spear back (the tip glints; that is the tell), then lunges, long and
 *   straight and narrow. Step aside and he is left stretched out with his shield down: that is the opening.
 *   Catch it on the shield and he is open a little longer. Turn it with a perfect guard and his shield is knocked
 *   wide: he is open a long time.
 *   A plunge comes down over his shield: it does not wound him, but it smashes his guard open too.
 *   Come on him unawares (from behind, or quiet as moss) and he has no guard up at all.
 */
export type GuardState = 'idle' | 'chase' | 'hold' | 'windup' | 'thrust' | 'recover' | 'broken' | 'stagger' | 'dead' | 'return';

export const GUARD = {
  hp: 4,
  radius: 0.4,
  noticeRange: 9,
  speed: 2.2, // coming on behind his shield
  backSpeed: 1.3, // giving ground when the rat crowds him
  turnRate: 5.5, // quick: his shield stays on the rat
  blockArc: 1.2, // how far each side of where he faces his shield covers
  holdRange: 2.5, // where he stops and waits, centre to centre: inside his spear's reach, outside the sword's
  crowdRange: 1.5, // nearer than this he steps back
  wait: [0.9, 1.8] as [number, number], // holding, before he thrusts
  retaliate: [0.3, 0.6] as [number, number], // after he has been hurt
  // The thrust.
  windup: 0.6,
  track: 0.55, // part of the wind-up he keeps turning with the rat; then he is committed
  thrustSpeed: 7.5,
  thrustTime: 0.2,
  reach: 1.2, // beyond his body
  arc: 0.38, // narrow: a step to the side is enough
  damage: 1,
  recover: 1.05, // stretched out with his shield down after a thrust that met nothing
  blockedRecover: 1.5, // longer if it met a shield
  // Striking back.
  counterAfter: 2, // sword blows on his shield, close together, before he answers at once
  counterForget: 2.2, // seconds after which he has forgotten them
  counterWindup: 0.45,
  // His guard knocked open.
  brokenParry: 2.6,
  brokenPlunge: 2.0,
  stagger: 0.4,
  knockback: 4.5,
  respawn: 8,
};

function turnToward(current: number, target: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class Guard {
  readonly kind = 'guard' as const;
  x: number;
  z: number;
  y: number;
  facing = 0;
  hp: number = GUARD.hp;
  state: GuardState = 'idle';
  stateTime = 0;
  /** Braced after a stagger: blows hurt it but do not stop it (foe.ts `Poise`). */
  readonly poise = new Poise(1.3);
  lastSwing = -1;
  age = 0;
  readonly radius = GUARD.radius;
  /** Random numbers, 0..1. Tests swap this for something fixed. */
  rng: () => number = Math.random;
  /** What he did this tick, for sounds: 'alert', 'block', 'windup', 'thrust', 'broken', 'hurt'. The game empties it. */
  readonly events: string[] = [];
  /** Set by the director: whether he may start an attack now. */
  mayAttack = true;
  /** Where round him to wait while he is locked on to another (director.ts); null for wherever it likes. */
  flank: number | null = null;
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
  private homeY = 0;

  readonly home: { x: number; z: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  /** This wind-up is him striking back (a shorter tell). */
  counter = false;
  private velX = 0;
  private velZ = 0;
  private spent = false;
  private recoverTime = 0;
  private brokenFor = 0;
  private waitLeft = 0;
  private blocked = 0;
  private sinceBlock = 99;
  private homeFacing: number;
  private fromX = 0;
  private fromZ = 0;

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean; facing?: number }) {
    this.home = { x: spec.x, z: spec.z };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 7, x1: spec.x + 7, z0: spec.z - 7, z1: spec.z + 7 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
    this.homeY = this.y;
    this.homeFacing = spec.facing ?? 0;
    this.facing = this.homeFacing;
    this.fromX = this.x;
    this.fromZ = this.z;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** He has waited long enough and wants to thrust (for the director). */
  get ready(): boolean {
    return this.state === 'hold' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'windup' || this.state === 'thrust';
  }
  /** His shield is up: he knows the rat is there, and he is not stretched out, reeling or knocked open. */
  get guarding(): boolean {
    return this.state === 'chase' || this.state === 'hold' || this.state === 'windup';
  }
  /** Open: a sword lands on him from any side. */
  get open(): boolean {
    return this.alive && !this.guarding;
  }
  get attackActive(): boolean {
    return this.state === 'thrust' && !this.spent;
  }
  get bite(): { reach: number; arc: number; damage: number } {
    return { reach: GUARD.reach, arc: GUARD.arc, damage: GUARD.damage };
  }
  /** How long the wind-up he is in lasts. */
  get windupTime(): number {
    return this.counter ? GUARD.counterWindup : GUARD.windup;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }

  /**
   * True if a blow from (fromX, fromZ) meets his shield. A sword that does is remembered: two close together and he
   * strikes back. A plunge comes down over the shield, so it is never turned (see takeHit for what it does instead).
   */
  deflects(fromX: number, fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.guarding || how === 'plunge') return false;
    const toAttacker = Math.atan2(fromX - this.x, fromZ - this.z);
    if (Math.abs(wrap(toAttacker - this.facing)) > GUARD.blockArc) return false;
    this.events.push('block');
    if (how === 'sword') {
      this.blocked = this.sinceBlock > GUARD.counterForget ? 1 : this.blocked + 1;
      this.sinceBlock = 0;
    }
    return true;
  }

  private enter(s: GuardState): void {
    this.state = s;
    this.stateTime = 0;
  }

  private breakGuard(seconds: number, fromX: number, fromZ: number): void {
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * GUARD.knockback * 0.7;
    this.velZ = (dz / len) * GUARD.knockback * 0.7;
    this.brokenFor = seconds;
    this.blocked = 0;
    this.counter = false;
    this.events.push('broken');
    this.enter('broken');
  }

  /** A blow that got past his shield (the game asks deflects() first). A plunge on a raised shield knocks it open and does no more. */
  takeHit(damage: number, fromX: number, fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    if (how === 'plunge' && this.guarding) {
      this.breakGuard(GUARD.brokenPlunge, fromX, fromZ);
      return false;
    }
    this.hp -= damage;
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * GUARD.knockback;
    this.velZ = (dz / len) * GUARD.knockback;
    this.blocked = 0;
    this.counter = false;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    // Hurt while his guard was knocked open, he stays open for what is left of it; otherwise he reels a moment.
    if (this.state === 'broken') return false;
    // He turns on whoever struck him, and will not wait long before he answers.
    this.waitLeft = this.between(GUARD.retaliate);
    // (Braced: the blow hurts him and does not stop him. foe.ts `Poise`.)
    if (!this.poise.take(GUARD.stagger)) return false;
    this.enter('stagger');
    return false;
  }

  /** His thrust reached the rat: hit, blocked, or turned aside by a perfect guard (which knocks his shield wide). */
  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    if (parried) {
      this.breakGuard(GUARD.brokenParry, this.x + Math.sin(this.facing), this.z + Math.cos(this.facing));
      return;
    }
    if (blocked) {
      this.velX = -Math.sin(this.facing) * 3;
      this.velZ = -Math.cos(this.facing) * 3;
      this.recoverTime = GUARD.blockedRecover;
      this.enter('recover');
    }
  }

  nudge(dx: number, dz: number): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.x += dx;
    this.z += dz;
    this.clamp();
  }

  private clamp(): void {
    const A = this.arena;
    this.x = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, this.x));
    this.z = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, this.z));
    keepOnFloor(this, this.fromX, this.fromZ);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const G = GUARD;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.poise.tick(dt);
    this.age += dt;
    this.sinceBlock += dt;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const A = this.arena;
    const margin = 1.5;
    const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);

    let speed = 0;
    let moveX = 0;
    let moveZ = 0;
    const engage = (): void => {
      if (this.state === 'idle' || this.state === 'return') this.events.push('alert');
      this.enter(dist > G.holdRange + 0.3 ? 'chase' : 'hold');
      if (this.waitLeft <= 0) this.waitLeft = this.between(G.wait);
    };
    /** Draws his spear back. */
    const strike = (counter: boolean): void => {
      this.counter = counter;
      this.blocked = 0;
      this.events.push('windup');
      this.enter('windup');
    };

    switch (this.state) {
      case 'idle':
        if (reachable && (this.hunt || dist < G.noticeRange * SENSES.notice)) engage();
        break;
      case 'chase':
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, G.turnRate * dt);
        if (this.blocked >= G.counterAfter) strike(true);
        else if (dist <= G.holdRange) this.enter('hold');
        else speed = G.speed;
        break;
      case 'hold':
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, G.turnRate * dt);
        this.waitLeft -= dt;
        // His shield hammered on: he strikes back at once, whoever's turn it is.
        if (this.blocked >= G.counterAfter) {
          strike(true);
          break;
        }
        if (dist > G.holdRange + 0.6) {
          this.enter('chase');
          break;
        }
        if (this.waitLeft <= 0 && this.mayAttack) {
          strike(false);
          break;
        }
        // Crowded, he gives ground, still facing.
        if (dist < G.crowdRange) {
          moveX = -Math.sin(toPlayer) * G.backSpeed;
          moveZ = -Math.cos(toPlayer) * G.backSpeed;
        } else if (this.flank !== null) {
          // Sent to his side (he is locked on to another): he steps round, shield still on him.
          const way = flankWay(this.flank, toPlayer);
          moveX = Math.cos(toPlayer) * G.speed * way;
          moveZ = -Math.sin(toPlayer) * G.speed * way;
        }
        break;
      case 'windup':
        if (this.stateTime < this.windupTime * G.track) this.facing = turnToward(this.facing, toPlayer, G.turnRate * dt);
        if (this.stateTime >= this.windupTime) {
          this.spent = false;
          this.events.push('thrust');
          this.enter('thrust');
        }
        break;
      case 'thrust':
        speed = G.thrustSpeed;
        if (this.stateTime >= G.thrustTime) {
          this.recoverTime = G.recover;
          this.enter('recover');
        }
        break;
      case 'recover':
        if (this.stateTime >= this.recoverTime) {
          this.counter = false;
          this.waitLeft = this.between(G.wait);
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'broken':
        if (this.stateTime >= this.brokenFor) {
          this.waitLeft = this.between(G.wait);
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'stagger':
        if (this.stateTime >= G.stagger) {
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < G.noticeRange * SENSES.notice)) {
          engage();
          break;
        }
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.2) {
          // Back at his post, he turns to face the way he was set.
          this.facing = turnToward(this.facing, this.homeFacing, G.turnRate * dt);
          if (Math.abs(wrap(this.facing - this.homeFacing)) < 0.05) this.enter('idle');
        } else {
          this.facing = turnToward(this.facing, Math.atan2(hx, hz), G.turnRate * dt);
          speed = G.speed * 0.8;
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= G.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.facing = this.homeFacing;
          this.hp = G.hp;
          this.velX = 0;
          this.velZ = 0;
          this.age = 0;
          this.lastSwing = -1;
          this.blocked = 0;
          this.waitLeft = 0;
          this.enter('idle');
        }
        break;
    }

    const drag = Math.exp(-9 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    this.x += (Math.sin(this.facing) * speed + moveX + this.velX) * dt;
    this.z += (Math.cos(this.facing) * speed + moveZ + this.velZ) * dt;
    this.clamp();
  }

  /** How fast he is walking (for his legs). */
  get walking(): number {
    if (this.state === 'chase') return GUARD.speed;
    if (this.state === 'return') return GUARD.speed * 0.8;
    return 0;
  }
}
