import { SENSES } from './foe';
import type { CanFly, CanStand, HitHow } from './foe';

/**
 * Flitter: a cave bat, for the Hollows and the Keep. Logic only, so it runs in tests.
 *
 * It lives above the sword, which changes the fight:
 *   It roosts upside down, out of reach. Footsteps wake it; sneaking does not (so the sneak button matters), and one
 *   bat waking wakes the roost.
 *   Awake, it flits round him above his head, where the sword cannot reach.
 *   When its turn comes it rises and screeches (the tell), then swoops: down through where he stood and up again on the
 *   far side. Only at the bottom of the swoop is it low enough to hit, or to hit him.
 *   Struck, or blocked, it drops to the floor and flaps there for a moment: the time to finish it. Over a pit, it is gone.
 *
 * Its y is the bottom of its body, so the game's "on the same level" test (the sword, its bite) is true only at the
 * bottom of a swoop or on the floor.
 */
export type BatState = 'roost' | 'wake' | 'hover' | 'swoopWind' | 'swoop' | 'fall' | 'grounded' | 'rise' | 'dead' | 'return' | 'flutter';

export const BAT = {
  hp: 2,
  radius: 0.4,
  roostHeight: 3.0, // above its floor (low enough to be seen as he comes; still far above the sword)
  hear: 7, // footsteps wake it from this far
  hearQuiet: 2, // sneaking, only this close
  rouseRange: 7, // a waking bat wakes the others roosting this near
  rouseDelay: [0.25, 0.8] as [number, number],
  wakeTime: 0.55,
  cruise: 1.9, // flies this far above his feet: out of the sword's reach, but in the camera's view
  circleRadius: 3.6,
  circleSpeed: 1.2, // radians a second round him
  flySpeed: 5,
  circleTime: [1.4, 2.6] as [number, number],
  swoopWind: 0.7,
  track: 0.75,
  swoopRise: 0.5, // it rises this much during the tell
  swoopTime: 1.0,
  swoopEase: 0.6, // it slows at the bottom of the swoop: the moment to hit it, as it comes down
  swoopGrab: [0.42, 0.58] as [number, number], // the part of the swoop (by distance) where it can hurt him: the very bottom
  swoopLow: 0.25, // the bottom of the swoop, above his feet
  swoopReach: 0.25,
  swoopDamage: 1,
  fallTime: 0.35,
  grounded: 1.6,
  groundedParried: 2.4,
  riseTime: 0.5,
  leash: 16,
  respawn: 8,
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class Bat {
  readonly kind = 'bat' as const;
  x: number;
  z: number;
  /** The bottom of its body. */
  y: number;
  facing = 0;
  hp: number = BAT.hp;
  state: BatState = 'roost';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = BAT.radius;
  rng: () => number = Math.random;
  /** For sounds: 'wake', 'screech', 'swoop', 'thud', 'lost'. The game empties it. */
  readonly events: string[] = [];
  mayAttack = true;
  canStand: CanStand | null = null;
  /** Whether it can fly through a spot (no wall there); the game sets it. */
  canFly: CanFly | null = null;
  readonly bite = { reach: BAT.swoopReach, arc: Math.PI, damage: BAT.swoopDamage };

  /** The floor it lives over, and where it roosts. */
  readonly floorY: number;
  readonly home: { x: number; z: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  private angle = 0;
  private circleDir = 1;
  private circleLeft = 0;
  private spent = false;
  private groundFor: number = BAT.grounded;
  private wakeIn = -1;
  private from = { x: 0, y: 0, z: 0 };
  private to = { x: 0, y: 0, z: 0 };
  private low = { x: 0, y: 0, z: 0 };
  private fallFrom = 0;

  /**
   * A FLUTTERER: it hangs in the air in one place, at the height it is given, and does nothing else: something to hit
   * from a rail as he goes by. One blow ends it. It does not swoop, does not hurt, and is not woken or moved.
   * (The owner, 2026-11-17, of a railway level: "you're grinding down the railway on your shield and you're smacking
   * bats out of the air with your sword while you're grinding down the rail and it's going to feel like you're playing
   * a Sonic Adventure game".)
   */
  readonly flutter: boolean;
  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean; flutter?: boolean }) {
    this.flutter = !!spec.flutter;
    this.floorY = spec.y ?? 0;
    this.home = { x: spec.x, z: spec.z };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 8, x1: spec.x + 8, z0: spec.z - 8, z1: spec.z + 8 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = this.floorY + BAT.roostHeight;
    // A wave bat arrives awake.
    if (this.hunt) this.state = 'hover';
    if (this.flutter) {
      this.y = this.floorY;
      this.hp = 1;
      this.state = 'flutter';
    }
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  get asleep(): boolean {
    return this.state === 'roost';
  }
  get ready(): boolean {
    return this.state === 'hover' && this.circleLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'swoopWind' || this.state === 'swoop';
  }
  /** Down where the sword can reach it: on the floor, or falling to it. */
  get downed(): boolean {
    return this.state === 'grounded' || this.state === 'fall';
  }
  /** At the very bottom of the swoop. */
  get attackActive(): boolean {
    if (this.state !== 'swoop' || this.spent) return false;
    const u = this.swoopU;
    return u > BAT.swoopGrab[0] && u < BAT.swoopGrab[1];
  }
  /** How far through the swoop in time (0..1). */
  get swoopT(): number {
    return this.state === 'swoop' ? Math.min(1, this.stateTime / BAT.swoopTime) : 0;
  }
  /** How far along its path (0..1): it slows at the bottom, so this lags the time there. */
  get swoopU(): number {
    const t = this.swoopT;
    return t + (BAT.swoopEase / (2 * Math.PI)) * Math.sin(2 * Math.PI * t);
  }

  /** Woken by another bat: it stirs after `delay` seconds. */
  rouse(delay: number): void {
    if (this.state === 'roost' && (this.wakeIn < 0 || delay < this.wakeIn)) this.wakeIn = delay;
  }

  private enter(s: BatState): void {
    this.state = s;
    this.stateTime = 0;
  }

  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }

  private startCircle(): void {
    this.circleDir = this.rng() < 0.5 ? 1 : -1;
    this.circleLeft = this.between(BAT.circleTime);
    this.enter('hover');
  }

  /** Knocked out of the air: down to its floor, or, over a pit, down into the dark. */
  private knockDown(parried: boolean): void {
    this.groundFor = parried ? BAT.groundedParried : BAT.grounded;
    this.fallFrom = this.y;
    this.enter('fall');
  }

  takeHit(damage: number, _fromX: number, _fromZ: number, _how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    this.rouse(0);
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    if (this.flutter) return false;
    if (!this.downed) this.knockDown(false);
    return false;
  }

  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    // Hitting the shield, it is knocked out of the air. Hitting the rat, it flies on.
    if (blocked || parried) this.knockDown(parried);
  }

  nudge(dx: number, dz: number): void {
    if (this.flutter) return;
    this.moveTo(this.x + dx, this.y, this.z + dz);
  }

  /** Moves toward a spot, but not into a wall or out of its patch. Returns false if something stopped it. */
  private moveTo(x: number, y: number, z: number): boolean {
    const A = this.arena;
    const cx = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, x));
    const cz = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, z));
    const ok = this.canFly;
    if (!ok || ok(cx, y, cz, this.radius)) {
      this.x = cx;
      this.y = y;
      this.z = cz;
      return cx === x && cz === z;
    }
    // Slide along whichever way is free; height first.
    if (ok(this.x, y, this.z, this.radius)) this.y = y;
    if (ok(cx, this.y, this.z, this.radius)) this.x = cx;
    else if (ok(this.x, this.y, cz, this.radius)) this.z = cz;
    return false;
  }

  /** Flies toward a spot at up to `speed`; returns how far is left. */
  private flyToward(tx: number, ty: number, tz: number, speed: number, dt: number): number {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > 1e-4) {
      const k = Math.min(1, (speed * dt) / d);
      this.moveTo(this.x + dx * k, this.y + dy * k, this.z + dz * k);
      if (Math.hypot(dx, dz) > 0.05) this.facing = Math.atan2(dx, dz);
    }
    return Math.max(0, d - speed * dt);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const B = BAT;
    this.stateTime += dt;
    this.age += dt;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const A = this.arena;
    const m = 2;
    const inArena = playerX > A.x0 - m && playerX < A.x1 + m && playerZ > A.z0 - m && playerZ < A.z1 + m;
    const reachable = playerAlive && inArena && playerY > this.floorY - 1.5 && playerY < this.floorY + 4 && dist < B.leash;
    const cruiseY = playerY + B.cruise;

    switch (this.state) {
      case 'flutter':
        // (It bobs where it hangs, and turns to watch him come.)
        this.y = this.floorY + Math.sin(this.age * 5 + this.home.z) * 0.06;
        if (dist > 0.5) this.facing = Math.atan2(playerX - this.x, playerZ - this.z);
        break;
      case 'roost': {
        this.y = this.floorY + B.roostHeight;
        const hear = (SENSES.quiet ? B.hearQuiet : B.hear) * SENSES.notice;
        if (reachable && (this.hunt || Math.hypot(dx, dz, (playerY - this.floorY) * 0.5) < hear)) this.rouse(0);
        if (this.wakeIn >= 0) {
          this.wakeIn -= dt;
          if (this.wakeIn <= 0) {
            this.wakeIn = -1;
            this.events.push('wake');
            this.facing = Math.atan2(dx, dz);
            this.enter('wake');
          }
        }
        break;
      }
      case 'wake':
        // Drops from the roof and opens its wings.
        this.flyToward(this.x, reachable ? cruiseY : this.y - 0.5, this.z, 3, dt);
        if (this.stateTime >= B.wakeTime) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          if (reachable) this.startCircle();
          else this.enter('return');
        }
        break;
      case 'hover': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.circleLeft -= dt;
        if (this.circleLeft <= 0 && this.mayAttack) {
          this.events.push('screech');
          this.enter('swoopWind');
          break;
        }
        // Round and round him, high up, with a flutter in it.
        this.angle += this.circleDir * B.circleSpeed * dt;
        const r = B.circleRadius + Math.sin(this.age * 2.3) * 0.5;
        const tx = playerX + Math.sin(this.angle) * r;
        const tz = playerZ + Math.cos(this.angle) * r;
        const left = this.flyToward(tx, cruiseY + Math.sin(this.age * 5.1) * 0.25, tz, B.flySpeed, dt);
        // Blocked by a wall: go round the other way.
        if (left > 2.5 && this.stateTime > 0.5) {
          this.circleDir = -this.circleDir;
          this.stateTime = 0;
        }
        this.facing = Math.atan2(dx, dz);
        break;
      }
      case 'swoopWind': {
        // The tell: it rises and hangs there screeching, watching him, then commits to where he stood.
        this.flyToward(this.x, cruiseY + B.swoopRise, this.z, 2, dt);
        this.facing = Math.atan2(dx, dz);
        if (this.stateTime < B.swoopWind * B.track) this.low = { x: playerX, y: playerY + B.swoopLow, z: playerZ };
        if (this.stateTime >= B.swoopWind) {
          this.from = { x: this.x, y: this.y, z: this.z };
          // Out the far side as far again, back up at its height.
          this.to = { x: this.low.x * 2 - this.x, y: this.y, z: this.low.z * 2 - this.z };
          this.spent = false;
          this.events.push('swoop');
          this.enter('swoop');
        }
        break;
      }
      case 'swoop': {
        const t = this.swoopT;
        const u = this.swoopU;
        // A dip: straight across, and down to the low point half way, slowing at the bottom.
        const nx = this.from.x + (this.to.x - this.from.x) * u;
        const nz = this.from.z + (this.to.z - this.from.z) * u;
        const line = this.from.y + (this.to.y - this.from.y) * u;
        const ny = line - (line - this.low.y) * Math.sin(Math.PI * u);
        if (!this.moveTo(nx, ny, nz) && t < 0.95) {
          // It flew into something: it breaks off.
          this.startCircle();
          break;
        }
        this.facing = Math.atan2(this.to.x - this.from.x, this.to.z - this.from.z);
        if (t >= 1) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.startCircle();
        }
        break;
      }
      case 'fall': {
        const k = Math.min(1, this.stateTime / B.fallTime);
        this.y = this.fallFrom + (this.floorY - this.fallFrom) * k * k;
        if (k >= 1) {
          // Over a pit there is no floor to land on.
          if (this.canStand && !this.canStand(this.x, this.floorY, this.z, 0.1)) {
            this.events.push('lost');
            this.hp = 0;
            this.enter('dead');
          } else {
            this.y = this.floorY;
            this.events.push('thud');
            this.enter('grounded');
          }
        }
        break;
      }
      case 'grounded':
        this.y = this.floorY;
        if (this.stateTime >= this.groundFor) this.enter('rise');
        break;
      case 'rise':
        this.flyToward(this.x, reachable ? cruiseY : this.floorY + B.roostHeight, this.z, 4, dt);
        if (this.stateTime >= B.riseTime) {
          if (reachable) {
            this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
            this.startCircle();
          } else this.enter('return');
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < B.hear * SENSES.notice)) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.startCircle();
          break;
        }
        // Home to its roost, and back to sleep.
        const left = this.flyToward(this.home.x, this.floorY + B.roostHeight, this.home.z, B.flySpeed * 0.7, dt);
        if (left < 0.1 || this.stateTime > 8) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.floorY + B.roostHeight;
          this.enter('roost');
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= B.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.floorY + (this.flutter ? 0 : B.roostHeight);
          this.hp = this.flutter ? 1 : B.hp;
          this.age = 0;
          this.lastSwing = -1;
          this.enter(this.flutter ? 'flutter' : 'roost');
        }
        break;
    }
    this.facing = wrap(this.facing);
  }
}

/** One bat waking wakes the others roosting near it (call once a tick with all the bats). */
export function rouseRoost(bats: Bat[]): void {
  for (const b of bats) {
    if (!b.events.includes('wake')) continue;
    for (const o of bats) {
      if (o === b || !o.asleep || Math.hypot(o.x - b.x, o.z - b.z) > BAT.rouseRange) continue;
      o.rouse(BAT.rouseDelay[0] + (BAT.rouseDelay[1] - BAT.rouseDelay[0]) * o.rng());
    }
  }
}
