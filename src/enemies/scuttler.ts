import { SENSES, keepOnFloor, type FloorUnder, sameGround } from './foe';
import type { CanStand } from './foe';
import { TUNING } from '../data/tuning';
import { flankWay } from './director';

/**
 * Scuttler: a big sewer roach. Logic only, no graphics, so it runs in tests.
 *
 * It fights the way a sword-and-shield game wants its foot soldiers to fight:
 *   it runs in, then circles at arm's length, facing him;
 *   when it sees a swing coming it may hop back out of reach;
 *   when its moment comes it either snaps a quick bite (short tell, short opening)
 *   or rears up and charges (long tell, a long straight rush; sidestep and it skids past with its back to him).
 * A hit staggers it and breaks a wind-up, and it comes back at him quickly. A blocked attack leaves it open for longer,
 * and one turned aside by a perfectly timed shield flips it over. In a group only one or two attack at a time (director.ts);
 * the others keep circling. It respawns a few seconds after dying.
 */
export type ScuttlerState = 'idle' | 'chase' | 'windup' | 'lunge' | 'recover' | 'stagger' | 'dead' | 'return';

function turnToward(current: number, target: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

export class Scuttler {
  readonly kind = 'scuttler' as const;
  x: number;
  z: number;
  y = 0;
  facing = 0;
  hp: number = TUNING.scuttler.hp;
  state: ScuttlerState = 'idle';
  stateTime = 0;
  /** The last player swing that hit it, so one swing cannot hit twice. */
  lastSwing = -1;
  /** Counts up from 0 after each spawn, for the pop-in. */
  age = 0;
  readonly radius: number = TUNING.scuttler.radius;

  private velX = 0;
  private velZ = 0;
  private lungeSpent = false;
  private recoverTime: number = TUNING.scuttler.recover;

  /** What it is doing while it is in the 'chase' state: running in, circling, or hopping back. */
  mode: 'approach' | 'circle' | 'hop' = 'approach';
  /** Which attack the current wind-up and lunge belong to. */
  attack: 'bite' | 'charge' = 'bite';
  /** Set by the director: whether it may start an attack now. Alone, it always may. */
  mayAttack = true;
  flank: number | null = null;
  /** Random numbers, 0..1. Tests swap this for something fixed. */
  rng: () => number = Math.random;
  private circleDir = 1;
  private circleLeft = 0;
  private hopLeft = 0;
  private hopCooldown = 0;
  private sawThreat = false;

  /** It has circled long enough and wants to attack. */
  get ready(): boolean {
    return this.state === 'chase' && this.mode === 'circle' && this.circleLeft <= 0;
  }
  /** It is in the middle of an attack. */
  get attacking(): boolean {
    return this.state === 'windup' || this.state === 'lunge';
  }
  /** How long the wind-up it is in lasts. */
  get windupTime(): number {
    return TUNING.scuttler[this.attack].windup;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }

  /** Where it stands guard, the patch of floor it never leaves, and whether it comes back after dying. */
  readonly home: { x: number; z: number };
  /** Always comes for the rat, wherever it is (wave enemies). */
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;

  constructor(spec?: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean }) {
    this.home = spec ? { x: spec.x, z: spec.z } : { ...TUNING.scuttler.home };
    this.hunt = !!spec?.hunt;
    this.arena = spec?.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec?.arena ?? { ...TUNING.scuttler.arena };
    this.respawns = spec?.respawn ?? true;
    this.x = this.home.x;
    this.z = this.home.z;
    this.y = this.homeY;
    this.y = spec?.y ?? 0;
    this.homeY = this.y;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  /** True while its bite can hurt. */
  get attackActive(): boolean {
    return this.state === 'lunge' && !this.lungeSpent;
  }

  private enter(state: ScuttlerState): void {
    this.state = state;
    this.stateTime = 0;
  }

  /** The player's sword connects. Returns true if this kills it. */
  takeHit(damage: number, fromX: number, fromZ: number): boolean {
    if (!this.alive) return false;
    const S = TUNING.scuttler;
    this.onBack = false;
    this.hp -= damage;
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * S.knockback;
    this.velZ = (dz / len) * S.knockback;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    this.enter('stagger');
    // It will not circle for long after that: it wants its own back.
    this.mode = 'circle';
    this.circleLeft = this.between(S.retaliate);
    return false;
  }

  /** Its lunge landed (on the rat or on his shield), so the bite is used up. A block leaves it open for longer. */
  /** Flipped on its back by a perfect guard, for as long as that lasts: it can be picked up (world/lifting.ts). */
  private onBack = false;
  get down(): boolean {
    return this.alive && this.onBack && this.state === 'recover';
  }
  lungeLanded(blocked: boolean, parried = false): void {
    this.lungeSpent = true;
    if (blocked || parried) {
      const S = TUNING.scuttler;
      const k = parried ? 1.3 : 0.7;
      this.velX = -Math.sin(this.facing) * S.knockback * k;
      this.velZ = -Math.cos(this.facing) * S.knockback * k;
      this.recoverTime = parried ? S.parriedRecover : S.blockedRecover;
      this.enter('recover');
      this.onBack = parried;
    }
  }

  /** Pushes it out of the way without hurting it, so it and the rat never stand inside each other. */
  nudge(dx: number, dz: number): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.x += dx;
    this.z += dz;
    this.clamp();
  }

  /** How it tells floor from wall; the game sets this. */
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
  private homeY = 0;
  /** Where it stood before this move, to go back to if the move ends inside something. */
  private fromX = 0;
  private fromZ = 0;

  private clamp(): void {
    const A = this.arena;
    this.x = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, this.x));
    this.z = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, this.z));
    keepOnFloor(this, this.fromX, this.fromZ);
  }

  /** `threat`: the rat is swinging his sword right now. */
  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean, threat = false): void {
    const S = TUNING.scuttler;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    this.hopCooldown = Math.max(0, this.hopCooldown - dt);

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const A = this.arena;
    const margin = 1.5;
    const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);
    const newThreat = threat && !this.sawThreat;
    this.sawThreat = threat;

    // Its own movement this tick: along its facing at `speed`, plus any sideways or backward step (moveX, moveZ).
    let speed = 0;
    let moveX = 0;
    let moveZ = 0;
    const engage = (): void => {
      this.enter('chase');
      this.mode = dist < S.engageRange ? 'circle' : 'approach';
      if (this.mode === 'circle') this.startCircle();
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
        if (this.mode === 'hop') {
          // A quick spring straight back, still watching him.
          this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
          moveX = -Math.sin(toPlayer) * S.hopBack.speed;
          moveZ = -Math.cos(toPlayer) * S.hopBack.speed;
          this.hopLeft -= dt;
          if (this.hopLeft <= 0) this.startCircle();
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
        if (this.mode === 'approach') {
          if (dist < S.engageRange) this.startCircle();
          else speed = S.speed;
          break;
        }
        // Circling. A swing coming at it from close by: sometimes it springs back out of reach.
        if (newThreat && dist < S.hopBack.range && this.hopCooldown <= 0 && this.rng() < S.hopBack.chance) {
          this.mode = 'hop';
          this.hopLeft = S.hopBack.time;
          this.hopCooldown = S.hopBack.cooldown;
          break;
        }
        if (dist > S.engageRange * 1.5) {
          this.mode = 'approach';
          break;
        }
        this.circleLeft -= dt;
        if (this.circleLeft <= 0 && this.mayAttack) {
          // Its moment. Close in: the quick bite. Further out: the charge.
          this.attack = dist <= S.bite.range ? 'bite' : 'charge';
          this.enter('windup');
          break;
        }
        // Sideways round him, drifting in or out to keep its distance.
        const drift = Math.max(-1, Math.min(1, (dist - S.circleRadius) * 1.6));
        // Told where to wait (he is locked on to another): round to that side by the short way, and hold there.
        let side = this.circleDir;
        // It hurries: the one he is fighting is circling too, and a place that moves away as fast as it is chased is never reached.
        if (this.flank !== null) side = flankWay(this.flank, toPlayer, S.flankHurry);
        moveX = Math.cos(toPlayer) * S.circleSpeed * side + Math.sin(toPlayer) * S.circleSpeed * drift;
        moveZ = -Math.sin(toPlayer) * S.circleSpeed * side + Math.cos(toPlayer) * S.circleSpeed * drift;
        break;
      }
      case 'windup': {
        const W = S[this.attack];
        // Tracks the rat for most of the wind-up, then commits to a direction.
        if (this.stateTime < W.windup * W.track) this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
        if (this.stateTime >= W.windup) {
          this.lungeSpent = false;
          this.enter('lunge');
        }
        break;
      }
      case 'lunge': {
        const W = S[this.attack];
        speed = W.lungeSpeed;
        if (this.stateTime >= W.lungeTime) {
          this.recoverTime = W.recover;
          this.enter('recover');
        }
        break;
      }
      case 'recover':
        if (this.stateTime >= this.recoverTime) {
          this.onBack = false;
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'stagger':
        if (this.stateTime >= S.stagger) {
          if (!reachable) this.enter('return');
          else {
            // Back into the fight, circling, with the short fuse set when it was hit.
            const fuse = this.circleLeft;
            this.enter('chase');
            this.mode = 'circle';
            this.circleDir = this.rng() < 0.5 ? 1 : -1;
            this.circleLeft = fuse;
          }
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) {
          engage();
          break;
        }
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.2) this.enter('idle');
        else {
          this.facing = turnToward(this.facing, Math.atan2(hx, hz), S.turnRate * dt);
          speed = S.speed * 0.7;
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= S.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.hp = S.hp;
          this.velX = 0;
          this.velZ = 0;
          this.age = 0;
          this.lastSwing = -1;
          this.mode = 'approach';
          this.enter('idle');
        }
        break;
    }

    // Knockback slides to a stop.
    const drag = Math.exp(-9 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    const wantX = (Math.sin(this.facing) * speed + moveX + this.velX) * dt;
    const wantZ = (Math.cos(this.facing) * speed + moveZ + this.velZ) * dt;
    this.x += wantX;
    this.z += wantZ;
    this.clamp();
    // Circling into a wall or the edge of its patch, it turns and goes round the other way.
    if (this.state === 'chase' && this.mode === 'circle' && Math.hypot(this.x - this.fromX, this.z - this.fromZ) < Math.hypot(wantX, wantZ) * 0.4) this.circleDir = -this.circleDir;
  }

  private startCircle(): void {
    this.mode = 'circle';
    this.circleDir = this.rng() < 0.5 ? 1 : -1;
    this.circleLeft = this.between(TUNING.scuttler.circleTime);
  }
}
