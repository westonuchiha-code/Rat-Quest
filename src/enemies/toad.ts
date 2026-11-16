/**
 * Gloop toad: a fat sewer toad that keeps its distance and spits globs of sludge. Logic only, so it runs in tests.
 *
 * It teaches a different rhythm from the roach:
 *   it watches you -> its throat swells and glows (the tell) -> it spits a glob that arcs to where you stand
 *   (dodge it, or block it with the shield) -> it sits gulping for a moment (the opening).
 * Get close and it hops away once; press it again and it turns on you: it flattens itself (the tell), then pounces,
 * belly first, onto where you stand (step out from under it, or take it on the shield) and lies winded where it lands.
 * So chasing a toad is never a long run round the room: the second time you close in, it comes to you.
 */
import { SENSES, keepOnFloor, type FloorUnder } from './foe';
import type { CanStand } from './foe';

export type ToadState = 'idle' | 'watch' | 'windup' | 'recover' | 'hop' | 'crouch' | 'pounce' | 'stagger' | 'dead' | 'return';

export const TOAD = {
  hp: 3,
  radius: 0.5,
  noticeRange: 13,
  spitRange: 10, // it spits from no further than this
  closeRange: 3, // nearer than this and it hops away
  watchTime: 0.9, // looks at you this long before it starts to spit
  windup: 0.8,
  recover: 1.2,
  stagger: 0.5,
  hopTime: 0.5,
  hopSpeed: 6,
  hopHeight: 1.0,
  turnRate: 6,
  knockback: 4,
  globSpeed: 7.5, // across the ground
  globGravity: 14,
  globDamage: 1,
  respawn: 6,
  // The pounce.
  pounceChance: 0.45, // how often it pounces the first time he comes close, instead of hopping away
  pounceCrouch: 0.5, // the tell
  pounceTime: 0.55, // in the air
  pounceHeight: 1.5,
  pounceRange: 5.5, // the furthest it can jump
  pounceReach: 0.55, // it hurts him if he is this close to where it lands (beyond its own body)
  pounceRecover: 1.3, // winded where it lands. This is the opening
  pounceParried: 2.1,
};

/** A glob it has just spat: where from, and its launch velocity. The game turns it into a flying glob. */
export interface Spit {
  /** What it is made of: sludge, or the cold light of the Engine. */
  kind?: 'energy';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

function turnToward(current: number, target: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

export class Toad {
  readonly kind = 'toad' as const;
  x: number;
  z: number;
  y: number;
  facing = 0;
  hp: number;
  state: ToadState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius: number;
  /** Height above its floor during a hop, for drawing. */
  hopY = 0;
  /** Set on the tick it spits; the game takes it and clears it. */
  spit: Spit | null = null;
  /** Random numbers, 0..1. Tests swap this for something fixed. */
  rng: () => number = Math.random;
  /** How its pounce hurts: all round it as it lands. */
  readonly bite = { reach: TOAD.pounceReach, arc: Math.PI, damage: 1 };
  private fled = false;
  private pounceSpent = false;
  pounceFrom = { x: 0, z: 0 };
  pounceTo = { x: 0, z: 0 };
  private recoverTime: number = TOAD.recover;

  /** True in the last part of a pounce, as it comes down. */
  get attackActive(): boolean {
    return this.state === 'pounce' && !this.pounceSpent && this.stateTime >= this.T.pounceTime * 0.8;
  }

  readonly home: { x: number; z: number };
  /** Always comes for the rat, wherever it is (wave enemies). */
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  private velX = 0;
  private velZ = 0;
  private hopDir = 0;
  private target = { x: 0, y: 0, z: 0 };
  /** How far above its feet a glob leaves it, and what the glob is made of. */
  protected spitFrom = 0.55;
  protected spitKind: 'energy' | undefined = undefined;

  /** Its numbers. A plain toad uses TOAD; the boss is the same creature with different ones. */
  protected readonly T: typeof TOAD;

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean }, tuning: typeof TOAD = TOAD) {
    this.T = tuning;
    this.hp = tuning.hp;
    this.radius = tuning.radius;
    this.home = { x: spec.x, z: spec.z };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 6, x1: spec.x + 6, z0: spec.z - 6, z1: spec.z + 6 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
    this.homeY = this.y;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  private enter(s: ToadState): void {
    this.state = s;
    this.stateTime = 0;
  }

  takeHit(damage: number, fromX: number, fromZ: number): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * this.T.knockback;
    this.velZ = (dz / len) * this.T.knockback;
    this.hopY = 0;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    this.enter('stagger');
    return false;
  }

  lungeLanded(blocked = false, parried = false): void {
    this.pounceSpent = true;
    if (parried) this.recoverTime = this.T.pounceParried;
    void blocked;
    // It has no bite.
  }

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

  /** Starts a hop: away from (px, pz) when `away`, otherwise toward it. */
  private hop(px: number, pz: number, away: boolean): void {
    const a = Math.atan2(px - this.x, pz - this.z);
    // Away, but slanted, so it does not back straight into a wall.
    const first = away ? a + Math.PI + (this.rng() - 0.5) * 1.6 : a;
    // It looks before it leaps: the landing spot and the middle of the jump must be open floor.
    // If the first way is no good it tries wider and wider to each side; with nowhere to go it stays and spits.
    const reach = this.T.hopSpeed * this.T.hopTime;
    const clear = (dir: number): boolean =>
      !this.canStand || [0.5, 1].every((k) => this.canStand!(this.x + Math.sin(dir) * reach * k, this.y, this.z + Math.cos(dir) * reach * k, this.radius));
    const side = this.rng() < 0.5 ? 1 : -1;
    const dir = [0, 0.7, -0.7, 1.4, -1.4, 2.1, -2.1].map((o) => first + o * side).find(clear);
    if (dir === undefined) {
      this.enter('windup');
      return;
    }
    this.hopDir = dir;
    this.enter('hop');
  }

  update(dt: number, px: number, py: number, pz: number, playerAlive: boolean): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    const dx = px - this.x;
    const dz = pz - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const A = this.arena;
    const m = 6; // it can spit over the edge of its patch
    const inReach = playerAlive && px > A.x0 - m && px < A.x1 + m && pz > A.z0 - m && pz < A.z1 + m && Math.abs(py - this.y) < 4;
    let speed = 0;

    switch (this.state) {
      case 'idle':
        if (inReach && (this.hunt || dist < this.T.noticeRange * SENSES.notice)) this.enter('watch');
        break;
      case 'watch':
        if (!inReach) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, this.T.turnRate * dt);
        if (dist < this.T.closeRange) {
          // He has come close. The first time it may hop away; pressed again, it turns and pounces.
          if (this.fled || this.rng() < this.T.pounceChance) {
            this.fled = false;
            this.enter('crouch');
          } else {
            this.fled = true;
            this.hop(px, pz, true);
          }
        } else if (this.stateTime > this.T.watchTime) {
          if (dist > this.T.spitRange) this.hop(px, pz, false);
          else this.enter('windup');
        }
        break;
      case 'windup':
        this.facing = turnToward(this.facing, toPlayer, this.T.turnRate * dt);
        // It aims where he stands near the end of the wind-up, so moving at the last moment dodges it.
        if (this.stateTime < this.T.windup * 0.75) this.target = { x: px, y: py, z: pz };
        if (this.stateTime >= this.T.windup) {
          this.spit = this.launch();
          this.recoverTime = this.T.recover;
          this.fled = false;
          this.enter('recover');
        }
        break;
      case 'crouch':
        this.facing = turnToward(this.facing, toPlayer, this.T.turnRate * dt);
        // It marks where he stands until late in the crouch, so a step at the last moment gets him out from under it.
        if (this.stateTime < this.T.pounceCrouch * 0.7) this.target = { x: px, y: py, z: pz };
        if (this.stateTime >= this.T.pounceCrouch) {
          this.pounceFrom = { x: this.x, z: this.z };
          let tx = this.target.x - this.x;
          let tz = this.target.z - this.z;
          const far = Math.hypot(tx, tz) || 1;
          const reach = Math.min(far, this.T.pounceRange);
          tx = (tx / far) * reach;
          tz = (tz / far) * reach;
          // It will not jump into a wall or off an edge: it shortens the jump until the landing is open floor.
          let k = 1;
          // The middle of the jump counts too: it does not sail through a wall or a block to land beyond it.
          const open = (f: number): boolean => {
            if (!this.canStand) return true;
            // Every quarter-step of the way (a little wider than its body in mid-air), and the two other corners of the little
            // box between each check and the last. The scenery is all boxes, so a straight line that clips a corner (of a
            // block, or of a hole in the floor) between two checks always puts one of those corners inside it.
            const steps = Math.max(2, Math.ceil((Math.hypot(tx, tz) * f) / 0.25));
            const ok = this.canStand;
            let ax = this.x;
            let az = this.z;
            for (let n = 1; n <= steps; n++) {
              const bx = this.x + (tx * f * n) / steps;
              const bz = this.z + (tz * f * n) / steps;
              if (!ok(bx, this.y, bz, this.radius + (n < steps ? 0.15 : 0)) || !ok(ax, this.y, bz, this.radius) || !ok(bx, this.y, az, this.radius)) return false;
              ax = bx;
              az = bz;
            }
            return true;
          };
          while (k > 0.2 && !open(k)) k -= 0.2;
          if (!open(k)) k = 0;
          this.pounceTo = { x: this.x + tx * k, z: this.z + tz * k };
          this.pounceSpent = false;
          this.recoverTime = this.T.pounceRecover;
          this.enter('pounce');
        }
        break;
      case 'pounce': {
        const t = Math.min(1, this.stateTime / this.T.pounceTime);
        this.hopY = Math.sin(t * Math.PI) * this.T.pounceHeight;
        this.x = this.pounceFrom.x + (this.pounceTo.x - this.pounceFrom.x) * t;
        this.z = this.pounceFrom.z + (this.pounceTo.z - this.pounceFrom.z) * t;
        // In the air it is over the scenery, not in it.
        this.fromX = this.x;
        this.fromZ = this.z;
        if (t >= 1) {
          this.hopY = 0;
          this.enter('recover');
        }
        break;
      }
      case 'recover':
        if (this.stateTime >= this.recoverTime) this.enter(inReach ? 'watch' : 'return');
        break;
      case 'hop': {
        const t = this.stateTime / this.T.hopTime;
        this.hopY = Math.sin(Math.min(1, t) * Math.PI) * this.T.hopHeight;
        this.facing = turnToward(this.facing, this.hopDir, this.T.turnRate * 2 * dt);
        this.x += Math.sin(this.hopDir) * this.T.hopSpeed * dt;
        this.z += Math.cos(this.hopDir) * this.T.hopSpeed * dt;
        if (t >= 1) {
          this.hopY = 0;
          this.enter(inReach ? 'watch' : 'return');
          this.stateTime = this.T.watchTime * 0.4; // it lands ready to act sooner
        }
        break;
      }
      case 'stagger':
        if (this.stateTime >= this.T.stagger) {
          if (inReach && dist < this.T.closeRange + 1) this.hop(px, pz, true);
          else this.enter(inReach ? 'watch' : 'return');
        }
        break;
      case 'return': {
        if (inReach && (this.hunt || dist < this.T.noticeRange * SENSES.notice)) {
          this.enter('watch');
          break;
        }
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.3) this.enter('idle');
        else {
          this.facing = turnToward(this.facing, Math.atan2(hx, hz), this.T.turnRate * dt);
          speed = 1.6;
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= this.T.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.hp = this.T.hp;
          this.age = 0;
          this.lastSwing = -1;
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
  }

  /** The launch that lands a glob on the aimed spot: fixed speed across the ground, and whatever upward speed that needs. */
  private launch(): Spit {
    const sx = this.x + Math.sin(this.facing) * 0.5;
    const sz = this.z + Math.cos(this.facing) * 0.5;
    const sy = this.y + this.spitFrom;
    const dx = this.target.x - sx;
    const dz = this.target.z - sz;
    const flat = Math.max(0.5, Math.hypot(dx, dz));
    const T = flat / this.T.globSpeed;
    const dy = this.target.y + 0.5 - sy;
    const vy = (dy + 0.5 * this.T.globGravity * T * T) / T;
    return { x: sx, y: sy, z: sz, vx: (dx / flat) * this.T.globSpeed, vy, vz: (dz / flat) * this.T.globSpeed, kind: this.spitKind };
  }
}

/** A glob of sludge in flight. */
export interface Glob {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  /** Where it ended: 'flying', it hit something ('splat'), or it hit him ('hit'). */
  done: boolean;
  /** One of Grimsqueak's bolts of light, not a toad's spit: it looks and sounds its own way. */
  kind?: 'energy';
}

/** Moves globs. A glob ends when it falls below the ground under it, or after a few seconds. */
export function stepGlobs(globs: Glob[], dt: number, groundAt: (x: number, y: number, z: number) => number | null): Glob[] {
  const ended: Glob[] = [];
  for (const g of globs) {
    if (g.done) continue;
    g.age += dt;
    g.vy -= TOAD.globGravity * dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.z += g.vz * dt;
    const ground = groundAt(g.x, g.y + 0.3, g.z);
    if ((ground !== null && g.y <= ground + 0.1) || g.y < -6 || g.age > 4) {
      g.done = true;
      ended.push(g);
    }
  }
  return ended;
}
