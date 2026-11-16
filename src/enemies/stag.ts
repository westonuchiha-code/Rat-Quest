import { SENSES, keepOnFloor, type CanStand, type HitHow, type FloorUnder, sameGround } from './foe';

/**
 * The Stag Knight: a great beetle on its hind legs with a forge hammer. Slow, and it does not care that it is being
 * hit: a sword does not stop what it is doing. So the fight is about where the rat stands and how greedy he is.
 *
 *   - The slam: the hammer goes up over its head, glowing (the tell, a long one), and comes down in front of it.
 *     Two hearts, and a shield does not stop it: only being somewhere else does (or a perfect guard). Then the hammer
 *     is in the floor and it is open for a good while.
 *   - The sweep: drawn back to one side, then swung flat across its whole front. One heart; a shield stops it. It is
 *     what happens to a rat who stands close in front of it.
 *   - The stomp: it turns slowly, so he can get behind it; stay there and its wing cases lift and it stamps, a ring
 *     along the floor all round. Jump it, or be out of reach.
 *
 * It does not flinch, but it has only so much poise: five blows in quick succession (a plunge counts for three, a
 * perfect guard for all of it) and it goes down on one knee, open, until it has gathered itself.
 */
export type StagState = 'idle' | 'chase' | 'windup' | 'slam' | 'stuck' | 'sweepWind' | 'sweep' | 'recover' | 'stompWind' | 'stomp' | 'settle' | 'kneel' | 'dead' | 'return';

export const STAG = {
  hp: 10,
  radius: 0.6,
  noticeRange: 9,
  speed: 1.7,
  turnRate: 1.9, // slow: he can get round it
  standRange: 1.7, // it walks in to here
  wait: [0.7, 1.4] as [number, number],
  // The slam.
  slamRange: 2.6,
  slamAim: 0.5, // it must be facing him this nearly to start one
  windup: 0.9,
  track: 0.55, // it turns with him for this much of the wind-up, then commits
  slamTime: 0.18,
  slamStep: 3, // it steps in with it
  slamReach: 1.3,
  slamArc: 0.42, // a narrow strip in front: step aside
  slamDamage: 2,
  stuck: 1.4, // hammer in the floor: open
  // The sweep.
  sweepRange: 2.0,
  sweepArc: 1.9, // its whole front and both sides
  sweepChance: 0.55, // close in front of it, how often it sweeps rather than slams
  sweepWindup: 0.65,
  sweepTime: 0.22,
  sweepReach: 1.25,
  sweepDamage: 1,
  recover: 0.8,
  // The stomp.
  behindArc: 1.9, // further round than this from its front is behind it
  behindRange: 2.3,
  behindTime: 0.9, // how long he may stand there
  stompWindup: 0.55,
  stompTime: 0.14,
  stompReach: 1.9,
  stompDamage: 1,
  settle: 0.6,
  stompCooldown: 2.5,
  // Poise.
  poise: 5,
  poiseBack: 3.5, // seconds without a blow before it has it all back
  plungePoise: 3,
  kneel: 2.2,
  respawn: 10,
};

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function turnToward(from: number, to: number, max: number): number {
  const d = wrap(to - from);
  return Math.abs(d) <= max ? to : from + Math.sign(d) * max;
}

export class Stag {
  readonly kind = 'stag' as const;
  readonly immovable = true;
  x: number;
  z: number;
  y: number;
  facing = 0;
  hp: number = STAG.hp;
  poise: number = STAG.poise;
  state: StagState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = STAG.radius;
  /** Random numbers, 0..1. Tests swap this for something fixed. */
  rng: () => number = Math.random;
  /** What it did this tick, for sounds: 'alert', 'windup', 'slam', 'sweepWind', 'sweep', 'stompWind', 'stomp', 'kneel', 'rise', 'hurt', 'step'. The game empties it. */
  readonly events: string[] = [];
  /** Set by the director: whether it may start an attack now. */
  mayAttack = true;
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
  private homeY = 0;

  readonly home: { x: number; z: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  private spent = false;
  private waitLeft = 0;
  private behindFor = 0;
  private stompCool = 0;
  private sincePoise = 99;
  private stepIn = 0;
  private moving = false;
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
  /** It has waited long enough and wants to attack (for the director). */
  get ready(): boolean {
    return this.state === 'chase' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'windup' || this.state === 'slam' || this.state === 'sweepWind' || this.state === 'sweep' || this.state === 'stompWind' || this.state === 'stomp';
  }
  /** Open: nothing is coming for a while. */
  get open(): boolean {
    return this.state === 'stuck' || this.state === 'kneel' || this.state === 'recover' || this.state === 'settle';
  }
  get attackActive(): boolean {
    if (this.spent) return false;
    if (this.state === 'slam') return this.stateTime >= STAG.slamTime - 0.08;
    if (this.state === 'sweep') return this.stateTime >= 0.05 && this.stateTime <= STAG.sweepTime - 0.02;
    return this.state === 'stomp';
  }
  get bite(): { reach: number; arc: number; damage: number; heavy?: boolean; ground?: boolean } {
    // (Each wind-up answers with the shape of the blow it leads to, so the test view can draw what is coming.)
    if (this.state === 'sweep' || this.state === 'sweepWind') return { reach: STAG.sweepReach, arc: STAG.sweepArc, damage: STAG.sweepDamage };
    if (this.state === 'stomp' || this.state === 'stompWind') return { reach: STAG.stompReach, arc: Math.PI, damage: STAG.stompDamage, ground: true };
    return { reach: STAG.slamReach, arc: STAG.slamArc, damage: STAG.slamDamage, heavy: true };
  }
  /** How fast it is walking (for its legs). */
  get walking(): number {
    return this.moving ? (this.state === 'return' ? STAG.speed * 0.8 : STAG.speed) : 0;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  private enter(s: StagState): void {
    this.state = s;
    this.stateTime = 0;
  }
  private drop(): void {
    this.poise = 0;
    this.spent = true;
    this.events.push('kneel');
    this.enter('kneel');
  }

  /** Every blow lands, and none of them stops it; but each takes some of its poise, and with none left it goes down on one knee. */
  takeHit(damage: number, _fromX: number, _fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    if (this.state === 'kneel') return false;
    this.poise -= how === 'plunge' ? STAG.plungePoise : damage;
    this.sincePoise = 0;
    if (this.poise <= 0) this.drop();
    else if (this.state === 'idle' || this.state === 'return') {
      // Struck unawares, it knows he is there now.
      this.events.push('alert');
      this.waitLeft = this.between(STAG.wait);
      this.enter('chase');
    }
    return false;
  }

  /** A blow reached the rat. Blocked, it makes no difference to it; turned by a perfect guard, it is thrown down on one knee. */
  lungeLanded(_blocked: boolean, parried = false): void {
    this.spent = true;
    if (parried) this.drop();
  }

  /** It is not shouldered aside (the rat gives way: see combat). */
  nudge(_dx: number, _dz: number): void {}

  private clamp(): void {
    const A = this.arena;
    this.x = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, this.x));
    this.z = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, this.z));
    keepOnFloor(this, this.fromX, this.fromZ);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const S = STAG;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    this.sincePoise += dt;
    this.stompCool = Math.max(0, this.stompCool - dt);
    if (this.sincePoise > S.poiseBack && this.state !== 'kneel') this.poise = S.poise;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const off = Math.abs(wrap(toPlayer - this.facing));
    const A = this.arena;
    const margin = 1.5;
    const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);

    let speed = 0;
    this.moving = false;
    const engage = (): void => {
      if (this.state === 'idle' || this.state === 'return') this.events.push('alert');
      this.enter('chase');
      if (this.waitLeft <= 0) this.waitLeft = this.between(S.wait);
    };
    const after = (): void => {
      this.waitLeft = this.between(S.wait);
      if (reachable) this.enter('chase');
      else this.enter('return');
    };
    const walk = (rate: number): void => {
      this.moving = true;
      speed = rate;
      // Each heavy footfall.
      this.stepIn -= dt;
      if (this.stepIn <= 0) {
        this.stepIn = 0.36;
        this.events.push('step');
      }
    };

    switch (this.state) {
      case 'idle':
        if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) engage();
        break;
      case 'chase': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
        this.waitLeft -= dt;
        // He is behind it and staying there: the stomp, whoever's turn it is.
        if (off > S.behindArc && dist < S.behindRange) this.behindFor += dt;
        else this.behindFor = Math.max(0, this.behindFor - dt * 2);
        if (this.behindFor >= S.behindTime && this.stompCool <= 0) {
          this.behindFor = 0;
          this.events.push('stompWind');
          this.enter('stompWind');
          break;
        }
        if (this.waitLeft <= 0 && this.mayAttack) {
          // Close and anywhere in front of it: the sweep, or sometimes the slam if he is square on. Further off and square on: the slam.
          const square = off <= S.slamAim;
          if (dist <= S.sweepRange && off <= S.sweepArc * 0.85 && (!square || this.rng() < S.sweepChance)) {
            this.events.push('sweepWind');
            this.enter('sweepWind');
            break;
          }
          if (dist <= S.slamRange && square) {
            this.events.push('windup');
            this.enter('windup');
            break;
          }
        }
        // It walks at him when it is more or less facing him; otherwise it turns on the spot.
        if (dist > S.standRange && off < 1.0) walk(S.speed);
        break;
      }
      case 'windup':
        if (this.stateTime < S.windup * S.track) this.facing = turnToward(this.facing, toPlayer, S.turnRate * 1.3 * dt);
        if (this.stateTime >= S.windup) {
          this.spent = false;
          this.enter('slam');
        }
        break;
      case 'slam':
        speed = S.slamStep;
        if (this.stateTime >= S.slamTime) {
          this.events.push('slam');
          this.enter('stuck');
        }
        break;
      case 'stuck':
        if (this.stateTime >= S.stuck) after();
        break;
      case 'sweepWind':
        if (this.stateTime < S.sweepWindup * 0.5) this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
        if (this.stateTime >= S.sweepWindup) {
          this.spent = false;
          this.events.push('sweep');
          this.enter('sweep');
        }
        break;
      case 'sweep':
        if (this.stateTime >= S.sweepTime) this.enter('recover');
        break;
      case 'recover':
        if (this.stateTime >= S.recover) after();
        break;
      case 'stompWind':
        if (this.stateTime >= S.stompWindup) {
          this.spent = false;
          this.events.push('stomp');
          this.enter('stomp');
        }
        break;
      case 'stomp':
        if (this.stateTime >= S.stompTime) {
          this.stompCool = S.stompCooldown;
          this.enter('settle');
        }
        break;
      case 'settle':
        if (this.stateTime >= S.settle) after();
        break;
      case 'kneel':
        if (this.stateTime >= S.kneel) {
          this.poise = S.poise;
          this.events.push('rise');
          after();
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) {
          engage();
          break;
        }
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.2) {
          this.facing = turnToward(this.facing, this.homeFacing, S.turnRate * dt);
          if (Math.abs(wrap(this.facing - this.homeFacing)) < 0.05) this.enter('idle');
        } else {
          const way = Math.atan2(hx, hz);
          this.facing = turnToward(this.facing, way, S.turnRate * dt);
          if (Math.abs(wrap(way - this.facing)) < 1.0) walk(S.speed * 0.8);
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= S.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.facing = this.homeFacing;
          this.hp = S.hp;
          this.poise = S.poise;
          this.age = 0;
          this.lastSwing = -1;
          this.waitLeft = 0;
          this.behindFor = 0;
          this.stompCool = 0;
          this.enter('idle');
        }
        break;
    }

    this.x += Math.sin(this.facing) * speed * dt;
    this.z += Math.cos(this.facing) * speed * dt;
    this.clamp();
  }
}
