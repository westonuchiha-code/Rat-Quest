import { SENSES, keepOnFloor, type FloorUnder, sameGround } from './foe';
import type { CanStand, HitHow, WallAt } from './foe';

/**
 * Ironback: a big beetle in an iron shell, for the Foundry and the Keep. Logic only, so it runs in tests.
 *
 * It teaches the fight the roach and the toad never ask for: where you stand.
 *   Its shell turns the sword (a clank, and the rat's arm bounces back) from the front and the sides.
 *   Its tail end is soft, and it turns slowly: get round behind it. Two hits from behind and it bucks, kicking back.
 *   Its big attack is the ram: it scrapes and snorts (a long tell), then charges in a straight line.
 *   Sidestep it, and if it runs into a wall it bonks and flips over. A perfect guard flips it too, and so does a plunge
 *   onto its back. On its back it is soft all over, until it rights itself.
 *   Up close in front it tosses its horn: a short tell, a short reach.
 */
export type IronbackState =
  | 'idle' | 'chase' | 'windup' | 'ram' | 'tossWind' | 'toss' | 'buckWind' | 'buck'
  | 'recover' | 'stagger' | 'flipped' | 'rise' | 'dead' | 'return';

export const IRONBACK = {
  hp: 4,
  radius: 0.75,
  noticeRange: 10,
  speed: 2.0,
  turnRate: 1.5, // slow: the rat can get round it
  boostTurn: 2.6, // turning just after a hit from behind, or after getting up
  boostTime: 0.9,
  rearArc: 1.2, // hits from within this angle of straight behind it land; anything else glances off the shell
  // The ram.
  ramRange: [3, 9] as [number, number], // starts a ram from this far away
  ramAim: 0.3, // only when it is lined up this well
  windup: 0.95,
  track: 0.6, // part of the wind-up it keeps turning toward him; then it is committed
  ramSpeed: 9,
  ramTime: 1.25,
  ramDamage: 2,
  ramReach: 0.3,
  ramArc: 0.9,
  ramRecover: 0.9,
  blockedRecover: 1.1,
  // The horn toss, close in front.
  tossRange: 1.3, // beyond its body
  tossWind: 0.45,
  tossTime: 0.18,
  tossReach: 1.0,
  tossArc: 0.8,
  tossRecover: 0.7,
  // The buck, kicking backwards.
  buckAfter: 2, // hits from behind before it bucks
  buckLinger: 1.4, // seconds he may stand close behind it before it bucks anyway
  buckWind: 0.38,
  buckTime: 0.16,
  buckReach: 1.1,
  buckArc: 1.0,
  buckRecover: 0.6,
  // On its back.
  flipTime: 2.6,
  riseTime: 0.5,
  stagger: 0.35,
  attackGap: 1.2, // seconds between its attacks
  knockback: 2.5, // it is heavy: a hit hardly moves it
  respawn: 8,
};

function turnToward(current: number, target: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class Ironback {
  readonly kind = 'ironback' as const;
  x: number;
  z: number;
  y: number;
  facing = 0;
  hp: number = IRONBACK.hp;
  state: IronbackState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = IRONBACK.radius;
  /** Random numbers, 0..1. Tests swap this for something fixed. */
  rng: () => number = Math.random;
  /** What it did this tick, for sounds: 'snort', 'ram', 'clank', 'bonk', 'flip', 'toss', 'buck', 'rise'. The game empties it. */
  readonly events: string[] = [];
  /** Set by the director: whether it may start an attack now. */
  mayAttack = true;
  /** How it tells floor from wall, and whether a wall is in the way (to bonk into); the game sets these. */
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
  private homeY = 0;
  wallAt: WallAt | null = null;

  readonly home: { x: number; z: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  private velX = 0;
  private velZ = 0;
  private spent = false;
  private recoverTime = 0;
  private cool = 0;
  private boost = 0;
  private rearHits = 0;
  private behindFor = 0;
  private flipFor: number = IRONBACK.flipTime;
  private wants = false;
  private fromX = 0;
  private fromZ = 0;

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean }) {
    this.home = { x: spec.x, z: spec.z };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 7, x1: spec.x + 7, z0: spec.z - 7, z1: spec.z + 7 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
    this.homeY = this.y;
    this.fromX = this.x;
    this.fromZ = this.z;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** Lined up and wanting to attack (for the director). */
  get ready(): boolean {
    return this.state === 'chase' && this.wants;
  }
  get attacking(): boolean {
    return ['windup', 'ram', 'tossWind', 'toss', 'buckWind', 'buck'].includes(this.state);
  }
  /** Lying on its back: soft all over. */
  get flipped(): boolean {
    return this.state === 'flipped' || this.state === 'rise';
  }
  get attackActive(): boolean {
    return (this.state === 'ram' || this.state === 'toss' || this.state === 'buck') && !this.spent;
  }
  /** The shape of the attack it is making. */
  get bite(): { reach: number; arc: number; damage: number } {
    const I = IRONBACK;
    if (this.state === 'toss') return { reach: I.tossReach, arc: I.tossArc, damage: 1 };
    if (this.state === 'buck') return { reach: I.buckReach, arc: I.buckArc, damage: 1 };
    return { reach: I.ramReach, arc: I.ramArc, damage: I.ramDamage };
  }
  /** Which way the attack points: the buck kicks backwards. */
  get biteDir(): number {
    return this.state === 'buck' ? wrap(this.facing + Math.PI) : this.facing;
  }

  /** True if a sword from (fromX, fromZ) would only glance off the shell. On its back, nothing glances; from behind, nothing does. */
  deflects(fromX: number, fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.alive || this.flipped || how === 'plunge') return false;
    const toAttacker = Math.atan2(fromX - this.x, fromZ - this.z);
    const offBehind = Math.abs(wrap(toAttacker - (this.facing + Math.PI)));
    return offBehind > IRONBACK.rearArc;
  }

  private enter(s: IronbackState): void {
    this.state = s;
    this.stateTime = 0;
  }

  private flip(): void {
    this.flipFor = IRONBACK.flipTime;
    this.velX = 0;
    this.velZ = 0;
    this.events.push('flip');
    this.enter('flipped');
  }

  /** A hit that got through (the game asks deflects() first). A plunge onto its shell flips it over. */
  takeHit(damage: number, fromX: number, fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    if (this.deflects(fromX, fromZ, how)) {
      this.events.push('clank');
      return false;
    }
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    if (this.flipped) {
      // Kicking on its back: it stays down a moment longer, but not for ever.
      this.flipFor = Math.min(this.flipFor + 0.25, this.stateTime + 1.2);
      return false;
    }
    if (how === 'plunge') {
      this.flip();
      return false;
    }
    // From behind: it lurches forward a little and wants to turn.
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * IRONBACK.knockback;
    this.velZ = (dz / len) * IRONBACK.knockback;
    this.rearHits++;
    this.boost = IRONBACK.boostTime;
    this.enter('stagger');
    return false;
  }

  /** Its attack reached the rat: hit, blocked, or turned aside by a perfect guard (which flips it, if it was ramming). */
  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    const I = IRONBACK;
    if (this.state === 'ram') {
      if (parried) return this.flip();
      this.velX = -Math.sin(this.facing) * 3;
      this.velZ = -Math.cos(this.facing) * 3;
      this.recoverTime = blocked ? I.blockedRecover : I.ramRecover;
      this.enter('recover');
      return;
    }
    if (blocked || parried) {
      this.recoverTime = parried ? I.blockedRecover * 1.4 : I.blockedRecover;
      // (A toss or a buck turned by a perfect guard: it is left recovering for LONGER than one only blocked. It went
      // to `stagger`, a third of a second, and the longer time set above was never used. Audit, 2026-11-24.)
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
    const I = IRONBACK;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    this.cool = Math.max(0, this.cool - dt);
    this.boost = Math.max(0, this.boost - dt);
    this.wants = false;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const off = Math.abs(wrap(toPlayer - this.facing));
    const A = this.arena;
    const m = 1.5;
    const inArena = playerX > A.x0 - m && playerX < A.x1 + m && playerZ > A.z0 - m && playerZ < A.z1 + m;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);
    const turn = (this.boost > 0 ? I.boostTurn : I.turnRate) * dt;
    let speed = 0;

    switch (this.state) {
      case 'idle':
        if (reachable && (this.hunt || dist < I.noticeRange * SENSES.notice)) this.enter('chase');
        break;
      case 'chase': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, turn);
        // Close behind it for too long and it kicks anyway.
        const behind = off > Math.PI - I.rearArc && dist < this.radius + I.buckReach + 0.4;
        this.behindFor = behind ? this.behindFor + dt : 0;
        if (this.rearHits >= I.buckAfter || this.behindFor > I.buckLinger) {
          this.rearHits = 0;
          this.behindFor = 0;
          this.events.push('buck');
          this.enter('buckWind');
          break;
        }
        const close = dist < this.radius + I.tossRange;
        const tossNow = close && off < 0.5;
        const ramNow = !close && dist >= I.ramRange[0] && dist <= I.ramRange[1] && off < I.ramAim;
        this.wants = this.cool <= 0 && (tossNow || ramNow);
        if (this.wants && this.mayAttack) {
          this.cool = I.attackGap;
          if (tossNow) {
            this.events.push('toss');
            this.enter('tossWind');
          } else {
            this.events.push('snort');
            this.enter('windup');
          }
          break;
        }
        // It plods toward him, but only once it is facing him.
        if (!close && off < 0.7) speed = I.speed;
        break;
      }
      case 'windup':
        if (this.stateTime < I.windup * I.track) this.facing = turnToward(this.facing, toPlayer, turn * 1.2);
        if (this.stateTime >= I.windup) {
          this.spent = false;
          this.events.push('ram');
          this.enter('ram');
        }
        break;
      case 'ram': {
        speed = I.ramSpeed;
        // A wall right ahead: it bonks into it and goes over on its back.
        const ax = this.x + Math.sin(this.facing) * (this.radius + 0.25);
        const az = this.z + Math.cos(this.facing) * (this.radius + 0.25);
        if (this.wallAt?.(ax, this.y, az, 0.2)) {
          this.events.push('bonk');
          this.flip();
          speed = 0;
          break;
        }
        if (this.stateTime >= I.ramTime) {
          this.recoverTime = I.ramRecover;
          this.enter('recover');
        }
        break;
      }
      case 'tossWind':
        this.facing = turnToward(this.facing, toPlayer, turn);
        if (this.stateTime >= I.tossWind) {
          this.spent = false;
          this.enter('toss');
        }
        break;
      case 'toss':
        if (this.stateTime >= I.tossTime) {
          this.recoverTime = I.tossRecover;
          this.enter('recover');
        }
        break;
      case 'buckWind':
        if (this.stateTime >= I.buckWind) {
          this.spent = false;
          this.enter('buck');
        }
        break;
      case 'buck':
        if (this.stateTime >= I.buckTime) {
          this.recoverTime = I.buckRecover;
          this.boost = I.boostTime;
          this.enter('recover');
        }
        break;
      case 'recover':
        if (this.stateTime >= this.recoverTime) this.enter(reachable ? 'chase' : 'return');
        break;
      case 'stagger':
        if (this.stateTime >= I.stagger) this.enter(reachable ? 'chase' : 'return');
        break;
      case 'flipped':
        if (this.stateTime >= this.flipFor) {
          this.events.push('rise');
          this.enter('rise');
        }
        break;
      case 'rise':
        if (this.stateTime >= I.riseTime) {
          this.boost = I.boostTime;
          this.rearHits = 0;
          this.enter(reachable ? 'chase' : 'return');
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < I.noticeRange * SENSES.notice)) {
          this.enter('chase');
          break;
        }
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.3) this.enter('idle');
        else {
          this.facing = turnToward(this.facing, Math.atan2(hx, hz), turn);
          speed = I.speed * 0.8;
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= I.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.hp = I.hp;
          this.age = 0;
          this.lastSwing = -1;
          this.rearHits = 0;
          this.enter('idle');
        }
        break;
    }

    const drag = Math.exp(-8 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    this.x += (Math.sin(this.facing) * speed + this.velX) * dt;
    this.z += (Math.cos(this.facing) * speed + this.velZ) * dt;
    this.clamp();
    // A ram that is stopped (by the edge of its patch or a drop) ends there, without the bonk.
    if (this.state === 'ram' && speed > 0 && Math.hypot(this.x - this.fromX, this.z - this.fromZ) < speed * dt * 0.3) {
      this.recoverTime = I.ramRecover;
      this.enter('recover');
    }
  }
}
