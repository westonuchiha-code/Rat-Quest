/**
 * THE FROST ROLLER: a great pill bug of the cold places. (The owner's list, 2026-11-16: "a cold creature for the
 * Cold Main". He has not seen it: its look and its fight are Claude's, and his to accept, change or throw out.)
 *
 * THE IDEA, IN ONE LINE: IT IS A BALL ON THE ICE, AND IT CANNOT STOP EITHER.
 * The Cold Main's floor keeps what moves on it moving. This is the creature of that floor.
 *   - It walks, slowly, toward him. Then it TUCKS: rocks back and rolls itself up, plate over plate (the tell).
 *   - It BOWLS at where he was when it finished tucking, in a straight line, fast. Curled, its shell turns the sword
 *     (a clank, and his arm thrown back). It runs along the floor: jumped, it passes under him.
 *   - It cannot steer and cannot stop. It rebounds off whatever it meets, twice; the third thing it meets spills it
 *     open. So does his shield (and a perfect guard throws it further and leaves it longer).
 *   - Spilled, it lies on its back with its legs going: OPEN. That is when to hit it. Then it rights itself.
 *   - Off the ice it does not roll far: a stone floor drags it to a stop and it spills where it stops.
 * A dive onto it from above cracks it open whatever it is doing.
 *
 * Plain rules, no drawing: enemies/rollerModel.ts draws it, tests/roller.ts plays it.
 */
import { SENSES, keepOnFloor, sameGround, type CanStand, type FloorUnder, type HitHow } from './foe';

export const ROLLER = {
  hp: 3,
  radius: 0.55,
  walk: 1.2, // how fast it walks
  turn: 3.2, // how fast it turns, walking (radians a second)
  noticeRange: 10,
  standOff: 4.2, // it walks no nearer than this before it tucks
  wait: [1.1, 2.0], // seconds of walking between one bowl and the next
  tuck: 0.6, // THE TELL: this long rolling itself up...
  aimUntil: 0.7, // ...turning to him for this share of it; after that its line is set
  speed: 9.5, // how fast it bowls
  rollTime: 3.6, // it bowls no longer than this
  rebounds: 2, // it comes off this many things; the next spills it
  keep: 0.82, // how much of its speed a rebound leaves it
  drag: 5.5, // what a floor that is NOT ice takes off its speed (a second)
  spillSpeed: 2.2, // slower than this it cannot hold its curl
  spilled: 2.0, // how long it lies open
  spilledOnShield: 2.5, // ...when it ran onto his shield
  spilledParried: 3.2, // ...when he turned it with a perfect guard
  right: 0.4, // righting itself
  stagger: 0.28,
  damage: 1,
  knockback: 3.5,
  respawn: 7,
} as const;

export type RollerState = 'idle' | 'walk' | 'tuck' | 'roll' | 'spilled' | 'right' | 'stagger' | 'dead' | 'return';
export type RollerEvent = 'alert' | 'tuck' | 'roll' | 'bounce' | 'spill' | 'right' | 'hurt' | 'die';

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
const toward = (from: number, to: number, most: number): number => from + Math.max(-most, Math.min(most, wrap(to - from)));

export class Roller {
  readonly kind = 'roller' as const;
  x: number;
  y: number;
  z: number;
  facing = 0;
  hp: number = ROLLER.hp;
  state: RollerState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  readonly radius: number = ROLLER.radius;
  /** How far it is rolled up: 0 walking, 1 a ball. (For how it is drawn, and for whether its shell turns a blade.) */
  curl = 0;
  /** How far it has rolled, in turns of the ball (for how it is drawn). */
  spin = 0;
  /** How fast it is going along the floor. */
  moving = 0;
  /** The way it is bowling, and how fast. */
  private dirX = 0;
  private dirZ = 1;
  private speed = 0;
  private reboundsLeft = 0;
  private spent = false;
  private spillFor: number = ROLLER.spilled;
  private waitLeft = 0;
  private velX = 0;
  private velZ = 0;
  mayAttack = true;
  rng: () => number = Math.random;
  readonly events: RollerEvent[] = [];
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** Whether the floor under a place is ice. The game sets this; without it, every floor is taken for ice. */
  onIce: ((x: number, y: number, z: number) => boolean) | null = null;
  /**
   * THIN ICE under a place gives way under it as it BOWLS (the game sets this; it breaks the pane and says so). It
   * goes through and is gone: the thing to lure it over. (Walking, on all its legs, the ice bears it.)
   */
  breakThin: ((x: number, z: number) => boolean) | null = null;
  /** It went through thin ice (for how it is drawn and heard). */
  sunk = false;
  private homeY = 0;
  private fromX = 0;
  private fromZ = 0;
  readonly home: { x: number; z: number };
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;

  constructor(spec: { x: number; z: number; y?: number; facing?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean }) {
    this.home = { x: spec.x, z: spec.z };
    this.arena = spec.arena ?? { x0: spec.x - 8, x1: spec.x + 8, z0: spec.z - 8, z1: spec.z + 8 };
    this.respawns = spec.respawn ?? true;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
    this.homeY = this.y;
    this.facing = spec.facing ?? 0;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** It hurts what it runs into, once a bowl. */
  get attackActive(): boolean {
    return this.state === 'roll' && !this.spent;
  }
  /** The blow is the ball itself, the way it is going: it runs along the floor, and a shield stops it. */
  get bite(): { reach: number; arc: number; damage: number; ground: boolean } {
    return { reach: 0.12, arc: 1.25, damage: ROLLER.damage, ground: true };
  }
  get biteDir(): number {
    return Math.atan2(this.dirX, this.dirZ);
  }
  /** For taking turns (director.ts). */
  get ready(): boolean {
    return this.state === 'walk' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'tuck' || this.state === 'roll';
  }
  /** Curled, its shell turns a blade. (Not a dive from above, nor the shock of one.) */
  deflects(_fromX: number, _fromZ: number, how: HitHow = 'sword'): boolean {
    return how === 'sword' && (this.state === 'roll' || (this.state === 'tuck' && this.curl > 0.6));
  }

  private enter(state: RollerState): void {
    this.state = state;
    this.stateTime = 0;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  private spill(how: number): void {
    this.spillFor = how;
    this.speed = 0;
    this.events.push('spill');
    this.enter('spilled');
  }

  takeHit(damage: number, fromX: number, fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * ROLLER.knockback;
    this.velZ = (dz / len) * ROLLER.knockback;
    if (this.hp <= 0) {
      this.hp = 0;
      this.events.push('die');
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    // (A dive onto it while it is curled cracks it open. Struck while it lies open, it stays open for what is left.)
    if (this.state === 'spilled') return false;
    if (how !== 'sword' && (this.state === 'roll' || this.state === 'tuck')) {
      this.spill(ROLLER.spilled);
      return false;
    }
    this.waitLeft = 0.4;
    this.enter('stagger');
    return false;
  }

  /** It ran into him: its blow is spent. On his shield it stops dead and spills; turned by a perfect guard, it is thrown back and lies longer. */
  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    if (!blocked && !parried) return;
    const k = parried ? 1.6 : 0.8;
    this.velX = -this.dirX * ROLLER.knockback * k;
    this.velZ = -this.dirZ * ROLLER.knockback * k;
    this.spill(parried ? ROLLER.spilledParried : ROLLER.spilledOnShield);
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
  /** Whether it could be at a place: inside its patch, on floor, clear of walls. */
  private free(x: number, z: number): boolean {
    const A = this.arena;
    if (x < A.x0 + this.radius || x > A.x1 - this.radius || z < A.z0 + this.radius || z > A.z1 - this.radius) return false;
    return !this.canStand || this.canStand(x, this.y, z, this.radius);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const R = ROLLER;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const A = this.arena;
    const inArena = playerX > A.x0 - 1.5 && playerX < A.x1 + 1.5 && playerZ > A.z0 - 1.5 && playerZ < A.z1 + 1.5;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);
    let walk = 0;
    let curlTo = 0;

    switch (this.state) {
      case 'idle':
        if (reachable && dist < R.noticeRange * SENSES.notice) {
          this.events.push('alert');
          this.waitLeft = this.between(R.wait) * 0.5;
          this.enter('walk');
        }
        break;
      case 'walk':
        if (!reachable) {
          if (this.stateTime > 2.5) this.enter('return');
          break;
        }
        this.facing = toward(this.facing, toPlayer, R.turn * dt);
        if (dist > R.standOff) walk = R.walk;
        this.waitLeft -= dt;
        if (this.waitLeft <= 0 && this.mayAttack && Math.abs(wrap(toPlayer - this.facing)) < 0.5) {
          this.events.push('tuck');
          this.enter('tuck');
        }
        break;
      case 'tuck':
        curlTo = 1;
        if (this.stateTime < R.tuck * R.aimUntil && reachable) this.facing = toward(this.facing, toPlayer, R.turn * 1.6 * dt);
        if (this.stateTime >= R.tuck) {
          this.dirX = Math.sin(this.facing);
          this.dirZ = Math.cos(this.facing);
          this.speed = R.speed;
          this.reboundsLeft = R.rebounds;
          this.spent = false;
          this.events.push('roll');
          this.enter('roll');
        }
        break;
      case 'roll': {
        curlTo = 1;
        // A floor that is not ice drags it.
        if (this.onIce && !this.onIce(this.x, this.y, this.z)) this.speed = Math.max(0, this.speed - R.drag * dt);
        const stepX = this.dirX * this.speed * dt;
        const stepZ = this.dirZ * this.speed * dt;
        if (this.free(this.x + stepX, this.z + stepZ)) {
          this.x += stepX;
          this.z += stepZ;
        } else {
          // It has met something. Which way it comes off: whichever of its two ways is shut is turned about.
          const shutX = !this.free(this.x + stepX, this.z);
          const shutZ = !this.free(this.x, this.z + stepZ);
          if (shutX || !shutZ) this.dirX = -this.dirX;
          if (shutZ || !shutX) this.dirZ = -this.dirZ;
          this.speed *= R.keep;
          this.spent = false;
          if (this.reboundsLeft-- <= 0) {
            this.spill(R.spilled);
            break;
          }
          this.events.push('bounce');
        }
        if (this.breakThin?.(this.x, this.z)) {
          this.sunk = true;
          this.hp = 0;
          this.events.push('die');
          this.enter('dead');
          break;
        }
        this.facing = Math.atan2(this.dirX, this.dirZ);
        this.spin += (this.speed * dt) / (Math.PI * 2 * 0.42);
        if (this.stateTime >= R.rollTime || this.speed < R.spillSpeed) this.spill(R.spilled);
        break;
      }
      case 'spilled':
        if (this.stateTime >= this.spillFor) {
          this.events.push('right');
          this.enter('right');
        }
        break;
      case 'right':
        if (this.stateTime >= R.right) {
          this.waitLeft = this.between(R.wait);
          this.enter('walk');
        }
        break;
      case 'stagger':
        if (this.stateTime >= R.stagger) this.enter('walk');
        break;
      case 'return': {
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (reachable && dist < R.noticeRange * SENSES.notice) {
          this.enter('walk');
          break;
        }
        if (Math.hypot(hx, hz) < 0.3) {
          this.enter('idle');
          break;
        }
        this.facing = toward(this.facing, Math.atan2(hx, hz), R.turn * dt);
        walk = R.walk;
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= R.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.hp = R.hp;
          this.sunk = false;
          this.curl = 0;
          this.velX = 0;
          this.velZ = 0;
          this.enter('idle');
        }
        break;
    }

    // How far rolled up it is drawn: it tucks over the tell, and comes open as it spills.
    const rate = this.state === 'tuck' ? 1 / (R.tuck * 0.8) : 6;
    this.curl += Math.max(-rate * dt, Math.min(rate * dt, curlTo - this.curl));

    // Knocked back, it slides to a stop.
    const drag = Math.exp(-7 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    if (this.state !== 'roll') {
      this.x += (Math.sin(this.facing) * walk + this.velX) * dt;
      this.z += (Math.cos(this.facing) * walk + this.velZ) * dt;
    }
    this.clamp();
    this.moving = dt > 0 ? Math.hypot(this.x - this.fromX, this.z - this.fromZ) / dt : 0;
  }
}
