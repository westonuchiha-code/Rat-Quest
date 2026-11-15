import { SENSES } from './foe';
import type { BodyPart, CanFly, CanStand, HitHow } from './foe';

/**
 * Hornet Lancer: a great hornet with a lance, for open places. Logic only, so it runs in tests.
 *
 * It hangs in the air out of the sword's reach, a little way off, going slowly round him, and it has two attacks:
 *   The dive. Its lance swings down to point at him and its wings whine (the tell); then it comes down the line of
 *   the lance onto where he stood. Step off the spot and the lance goes into the floor and STICKS: it hangs there on
 *   it, pulling, for a second and a half. That is when to hit it. A shield stops the point; a perfect guard knocks it
 *   out of the air.
 *   The joust. From further off it drops to chest height, levels its lance, and runs straight at him and on past.
 *   Step aside (and cut at it as it goes by), jump it, or stop it on the shield; a perfect guard knocks it down.
 * Struck in the air it falls and lies on the floor for a moment. Over a pit, it is gone.
 *
 * Its y is the bottom of its body, so the game's "on the same level" test (the sword, its lance) is true only when it
 * is low: at the end of a dive, in a joust, stuck, or on the floor. The blow of its lance comes from the lance's
 * POINT (`tip`), not from its body, and the model draws the point where these rules have it.
 */
export type HornetState = 'idle' | 'alert' | 'hover' | 'diveWind' | 'dive' | 'stuck' | 'free' | 'joustWind' | 'joust' | 'climb' | 'fall' | 'grounded' | 'rise' | 'dead' | 'return';

export const HORNET = {
  hp: 4,
  radius: 0.45,
  hover: 2.7, // the bottom of its body above the ground he stands on: over a sword's reach, inside a jump's
  noticeRange: 11,
  alert: 0.5,
  leash: 18,
  standOff: 6.2, // it hangs this far from him
  circleSpeed: 0.55, // radians a second round him
  flySpeed: 5.5,
  wait: [1.5, 2.6] as [number, number],
  diveWind: 0.8,
  diveTrack: 0.7, // it follows him for this much of the tell, then is set on that spot
  diveSpeed: 15,
  diveDamage: 1,
  stuck: 1.6, // its lance in the floor: the opening
  free: 0.45, // pulling it out
  joustFrom: 5, // it only runs at him from at least this far
  joustChance: 0.4,
  joustWind: 0.75,
  joustTrack: 0.75,
  joustHeight: 0.55, // the bottom of its body above the ground, in the run
  joustSpeed: 12.5,
  joustPast: 5, // it runs on this far past where he stood
  joustDamage: 1,
  climb: 0.8,
  lance: 1.3, // from where it holds the lance to its point
  tip: 0.28, // how wide the point's blow is
  fallTime: 0.4,
  grounded: 1.5,
  groundedParried: 2.6,
  rise: 0.6,
  respawn: 9,
};

/** Where it holds its lance, from the bottom of its body: this far up and this far forward. */
export const HORNET_HOLD = { up: 0.08, fwd: 0.2 };

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
type V3 = { x: number; y: number; z: number };

export class Hornet {
  readonly kind = 'hornet' as const;
  x: number;
  z: number;
  /** The bottom of its body. */
  y: number;
  facing = 0;
  hp: number = HORNET.hp;
  state: HornetState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = HORNET.radius;
  rng: () => number = Math.random;
  /** For sounds: 'alert', 'diveWind', 'dive', 'stick', 'free', 'joustWind', 'joust', 'thud', 'hurt', 'lost'. The game empties it. */
  readonly events: string[] = [];
  mayAttack = true;
  canStand: CanStand | null = null;
  /** Whether it can fly through a spot (no wall there); the game sets it. */
  canFly: CanFly | null = null;

  /** The floor it was put over, and where it keeps its post. */
  readonly floorY: number;
  readonly home: { x: number; z: number; facing: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  /** The point of its lance, and the way the lance points (a unit vector). The model draws it there. */
  readonly tip: V3 = { x: 0, y: 0, z: 0 };
  readonly aim: V3 = { x: 0, y: 0, z: 1 };
  /** How long the wind-up it is in lasts. */
  windTime: number = HORNET.diveWind;
  /** How fast it is going, over the floor. */
  moving = 0;
  private angle = 0;
  private circleDir = 1;
  private waitLeft = 0;
  private spent = false;
  private groundFor: number = HORNET.grounded;
  private fallFrom = 0;
  private landY = 0;
  /** Where its dive is aimed (the floor where he stood), and where the ground was that he last stood on. */
  private readonly target: V3 = { x: 0, y: 0, z: 0 };
  private readonly ground: V3 = { x: 0, y: 0, z: 0 };
  private left = 0;
  private readonly biteAt: BodyPart = { x: 0, z: 0, r: HORNET.tip };

  constructor(spec: { x: number; z: number; y?: number; facing?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean }) {
    this.floorY = spec.y ?? 0;
    this.home = { x: spec.x, z: spec.z, facing: spec.facing ?? 0 };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 11, x1: spec.x + 11, z0: spec.z - 11, z1: spec.z + 11 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = this.floorY + HORNET.hover;
    this.facing = this.home.facing;
    this.ground.x = spec.x;
    this.ground.y = this.floorY;
    this.ground.z = spec.z;
    this.landY = this.floorY;
    // A wave hornet arrives hunting.
    if (this.hunt) this.state = 'hover';
    this.point(0.35);
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  get awake(): boolean {
    return this.state !== 'idle';
  }
  get ready(): boolean {
    return this.state === 'hover' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'diveWind' || this.state === 'dive' || this.state === 'joustWind' || this.state === 'joust';
  }
  /** Down where the sword can reach it and it can do nothing: its lance stuck, or on the floor. */
  get downed(): boolean {
    return this.state === 'stuck' || this.state === 'free' || this.state === 'grounded' || this.state === 'fall';
  }
  get attackActive(): boolean {
    return (this.state === 'dive' || this.state === 'joust') && !this.spent;
  }
  /** Its blow comes from the point of its lance. */
  get bite(): { reach: number; arc: number; damage: number; at: BodyPart } {
    this.biteAt.x = this.tip.x;
    this.biteAt.z = this.tip.z;
    return { reach: 0.1, arc: Math.PI / 2, damage: this.state === 'joust' ? HORNET.joustDamage : HORNET.diveDamage, at: this.biteAt };
  }
  /** The floor it has to do with just now (a height): where it will land, where its lance is going, or what he stands on. */
  get floor(): number {
    if (this.state === 'fall' || this.state === 'grounded' || this.state === 'dead') return this.landY;
    if (this.state === 'dive' || this.state === 'stuck' || this.state === 'free' || this.state === 'joustWind' || this.state === 'joust') return this.target.y;
    return Math.min(this.ground.y, this.y - 0.5);
  }
  /** Where it holds its lance. */
  get hold(): V3 {
    return { x: this.x + Math.sin(this.facing) * HORNET_HOLD.fwd, y: this.y + HORNET_HOLD.up, z: this.z + Math.cos(this.facing) * HORNET_HOLD.fwd };
  }

  private enter(s: HornetState): void {
    this.state = s;
    this.stateTime = 0;
  }

  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }

  /** Points its lance the way it faces, tipped `down` radians below level (above, if less than 0). */
  private point(down: number): void {
    this.aimAlong(Math.sin(this.facing) * Math.cos(down), -Math.sin(down), Math.cos(this.facing) * Math.cos(down));
  }

  /** Points its lance along a direction, and puts the point that far out from where it is held. */
  private aimAlong(dx: number, dy: number, dz: number): void {
    const l = Math.hypot(dx, dy, dz) || 1;
    this.aim.x = dx / l;
    this.aim.y = dy / l;
    this.aim.z = dz / l;
    const h = this.hold;
    this.tip.x = h.x + this.aim.x * HORNET.lance;
    this.tip.y = h.y + this.aim.y * HORNET.lance;
    this.tip.z = h.z + this.aim.z * HORNET.lance;
  }

  private startHover(wait = 1): void {
    this.circleDir = this.rng() < 0.5 ? 1 : -1;
    this.waitLeft = this.between(HORNET.wait) * wait;
    this.enter('hover');
  }

  /** Knocked out of the air: down to the floor, or, over a pit, down into the dark. */
  private knockDown(parried: boolean): void {
    this.groundFor = parried ? HORNET.groundedParried : HORNET.grounded;
    this.fallFrom = this.y;
    this.landY = this.landingUnder();
    this.enter('fall');
  }

  /** The floor it would come down on: the ground he stands on if that reaches under it, its own floor if not. */
  private landingUnder(): number {
    if (this.state === 'stuck' || this.state === 'free') return this.target.y;
    return this.canStand && this.ground.y !== this.floorY && this.canStand(this.x, this.ground.y, this.z, 0.1) && this.ground.y <= this.y ? this.ground.y : this.floorY;
  }

  takeHit(damage: number, _fromX: number, _fromZ: number, _how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      // (Killed in the air, it comes down where it is.)
      this.fallFrom = this.y;
      this.landY = this.landingUnder();
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    if (!this.downed) this.knockDown(false);
    return false;
  }

  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    // A perfect guard knocks it out of the air. A shield only stops the point: a joust glances off and it pulls up;
    // a dive goes on into the floor beside him all the same.
    if (parried) this.knockDown(true);
    else if (blocked && this.state === 'joust') this.enter('climb');
  }

  nudge(dx: number, dz: number): void {
    // (Stuck by its lance, or lying on the floor, it can still be shouldered aside; flying, it is not his to push.)
    if (this.state === 'grounded') this.moveTo(this.x + dx, this.y, this.z + dz);
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
      const bx = this.x;
      const bz = this.z;
      this.moveTo(this.x + dx * k, this.y + dy * k, this.z + dz * k);
      this.moving = Math.hypot(this.x - bx, this.z - bz) / Math.max(1e-6, dt);
    }
    return Math.max(0, d - speed * dt);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const H = HORNET;
    this.stateTime += dt;
    this.age += dt;
    this.moving = 0;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const A = this.arena;
    const m = 2;
    const inArena = playerX > A.x0 - m && playerX < A.x1 + m && playerZ > A.z0 - m && playerZ < A.z1 + m;
    const reachable = playerAlive && inArena && playerY > this.floorY - 1.5 && playerY < this.floorY + 5 && dist < H.leash;
    // The ground he stands on (or last stood on, if he is in the air): what its attacks are aimed at.
    if (playerAlive && (!this.canStand || this.canStand(playerX, playerY, playerZ, 0.1))) {
      this.ground.x = playerX;
      this.ground.y = playerY;
      this.ground.z = playerZ;
    }
    const cruise = this.ground.y + H.hover;
    const face = (): void => {
      if (dist > 0.05) this.facing = Math.atan2(dx, dz);
    };

    switch (this.state) {
      case 'idle': {
        // At its post, hanging in the air.
        this.flyToward(this.home.x, this.floorY + H.hover + Math.sin(this.age * 1.7) * 0.12, this.home.z, 2, dt);
        this.facing = this.home.facing;
        this.point(0.35);
        if (reachable && (this.hunt || dist < H.noticeRange * SENSES.notice)) {
          this.events.push('alert');
          face();
          this.enter('alert');
        }
        break;
      }
      case 'alert':
        // It has seen him: up a little, lance raised.
        face();
        this.flyToward(this.x, cruise + 0.3, this.z, 2, dt);
        this.point(-0.1);
        if (this.stateTime >= H.alert) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.startHover(0.6);
        }
        break;
      case 'hover': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.waitLeft -= dt;
        face();
        this.point(0.35);
        if (this.waitLeft <= 0 && this.mayAttack) {
          // From far enough off, and with him about level with its floor, it may run at him instead of diving.
          const joust = dist >= H.joustFrom && this.rng() < H.joustChance;
          this.spent = false;
          if (joust) {
            this.windTime = H.joustWind;
            this.events.push('joustWind');
            this.enter('joustWind');
          } else {
            this.windTime = H.diveWind;
            this.target.x = this.ground.x;
            this.target.y = this.ground.y;
            this.target.z = this.ground.z;
            this.events.push('diveWind');
            this.enter('diveWind');
          }
          break;
        }
        // Slowly round him, a little way off, bobbing.
        this.angle += this.circleDir * H.circleSpeed * dt;
        const tx = playerX + Math.sin(this.angle) * H.standOff;
        const tz = playerZ + Math.cos(this.angle) * H.standOff;
        const left = this.flyToward(tx, cruise + Math.sin(this.age * 3.1) * 0.15, tz, H.flySpeed, dt);
        // Held off by a wall: go round the other way.
        if (left > 2.5 && this.stateTime > 0.6) {
          this.circleDir = -this.circleDir;
          this.stateTime = 0;
        }
        break;
      }
      case 'diveWind': {
        // The tell: it rises a little and its lance comes down to point at him; then it is set on the spot.
        face();
        this.flyToward(this.x, cruise + 0.35, this.z, 1.5, dt);
        if (this.stateTime < this.windTime * H.diveTrack) {
          this.target.x = this.ground.x;
          this.target.y = this.ground.y;
          this.target.z = this.ground.z;
        }
        const h = this.hold;
        this.aimAlong(this.target.x - h.x, this.target.y - h.y, this.target.z - h.z);
        if (this.stateTime >= this.windTime) {
          // Down the line of its lance until the point is on the spot.
          this.left = Math.max(0, Math.hypot(this.target.x - h.x, this.target.y - h.y, this.target.z - h.z) - H.lance);
          this.events.push('dive');
          this.enter('dive');
        }
        break;
      }
      case 'dive': {
        const step = Math.min(this.left, H.diveSpeed * dt);
        const ax = this.aim.x;
        const ay = this.aim.y;
        const az = this.aim.z;
        const clear = this.moveTo(this.x + ax * step, this.y + ay * step, this.z + az * step);
        this.moving = (Math.hypot(ax, az) * step) / Math.max(1e-6, dt);
        this.left -= step;
        this.aimAlong(ax, ay, az);
        if (!clear && this.left > 0.05) {
          // Something in its way: it breaks off.
          this.enter('climb');
          break;
        }
        if (this.left <= 1e-6) {
          // Its point is on the spot. Floor there: it goes in and sticks. No floor (he was over a drop): it pulls up.
          if (!this.canStand || this.canStand(this.target.x, this.target.y, this.target.z, 0.1)) {
            this.tip.x = this.target.x;
            this.tip.y = this.target.y;
            this.tip.z = this.target.z;
            this.events.push('stick');
            this.enter('stuck');
          } else this.enter('climb');
        }
        break;
      }
      case 'stuck':
        // Hanging on its lance, pulling.
        if (this.stateTime >= H.stuck) {
          this.events.push('free');
          this.enter('free');
        }
        break;
      case 'free': {
        // It comes out: the hornet backs up along its lance, and the point follows.
        const k = Math.min(1, this.stateTime / H.free);
        const back = 0.9 * dt / H.free;
        this.moveTo(this.x - this.aim.x * back, this.y - this.aim.y * back + (0.5 * dt) / H.free, this.z - this.aim.z * back);
        this.aimAlong(this.aim.x, this.aim.y, this.aim.z);
        if (k >= 1) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          if (reachable) this.startHover();
          else this.enter('return');
        }
        break;
      }
      case 'joustWind': {
        // The tell: down to chest height, lance levelled at him, drawing back a little.
        face();
        const back = this.stateTime < this.windTime * H.joustTrack ? 1.2 : 0;
        this.flyToward(this.x - Math.sin(this.facing) * back, this.ground.y + H.joustHeight, this.z - Math.cos(this.facing) * back, 4.5, dt);
        this.point(0);
        if (this.stateTime < this.windTime * H.joustTrack) {
          this.target.x = this.ground.x;
          this.target.y = this.ground.y;
          this.target.z = this.ground.z;
        }
        if (this.stateTime >= this.windTime) {
          // Set on where he stood: straight at it, and on past.
          const tx = this.target.x - this.x;
          const tz = this.target.z - this.z;
          if (Math.hypot(tx, tz) > 0.05) this.facing = Math.atan2(tx, tz);
          this.left = Math.hypot(tx, tz) + H.joustPast;
          this.y = this.target.y + H.joustHeight;
          this.events.push('joust');
          this.enter('joust');
        }
        break;
      }
      case 'joust': {
        const step = Math.min(this.left, H.joustSpeed * dt);
        const clear = this.moveTo(this.x + Math.sin(this.facing) * step, this.y, this.z + Math.cos(this.facing) * step);
        this.moving = step / Math.max(1e-6, dt);
        this.left -= step;
        this.point(0);
        // The run ends, or a wall ends it: either way it pulls up.
        if (!clear || this.left <= 1e-6) this.enter('climb');
        break;
      }
      case 'climb': {
        // Up and away, slowing, lance raised.
        const k = Math.min(1, this.stateTime / H.climb);
        this.flyToward(this.x + Math.sin(this.facing) * 3 * (1 - k), cruise, this.z + Math.cos(this.facing) * 3 * (1 - k), 6, dt);
        this.point(-0.15 * Math.sin(Math.PI * k));
        if (k >= 1) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          if (reachable) this.startHover();
          else this.enter('return');
        }
        break;
      }
      case 'fall': {
        const k = Math.min(1, this.stateTime / H.fallTime);
        this.y = this.fallFrom + (this.landY - this.fallFrom) * k * k;
        if (k >= 1) {
          // Over a pit there is no floor to land on.
          if (this.canStand && !this.canStand(this.x, this.landY, this.z, 0.1)) {
            this.events.push('lost');
            this.hp = 0;
            this.enter('dead');
          } else {
            this.y = this.landY;
            this.events.push('thud');
            this.enter('grounded');
          }
        }
        break;
      }
      case 'grounded':
        this.y = this.landY;
        if (this.stateTime >= this.groundFor) this.enter('rise');
        break;
      case 'rise':
        this.flyToward(this.x, reachable ? cruise : this.floorY + H.hover, this.z, 4.5, dt);
        this.point(0.35);
        if (this.stateTime >= H.rise) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          if (reachable) this.startHover();
          else this.enter('return');
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < H.noticeRange * SENSES.notice)) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.startHover(0.6);
          break;
        }
        // Back to its post.
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) > 0.3) this.facing = Math.atan2(hx, hz);
        const left = this.flyToward(this.home.x, this.floorY + H.hover, this.home.z, H.flySpeed * 0.7, dt);
        this.point(0.35);
        if (left < 0.1 || this.stateTime > 10) {
          this.waitLeft = 1;
          this.enter('idle');
        }
        break;
      }
      case 'dead': {
        const k = Math.min(1, this.stateTime / H.fallTime);
        this.y = Math.max(this.landY, this.fallFrom + (this.landY - this.fallFrom) * k * k);
        if (this.respawns && this.stateTime >= H.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.floorY + H.hover;
          this.facing = this.home.facing;
          this.hp = H.hp;
          this.age = 0;
          this.lastSwing = -1;
          this.waitLeft = 1;
          this.enter('idle');
        }
        break;
      }
    }
    this.facing = wrap(this.facing);
  }
}
