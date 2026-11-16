import { SENSES } from './foe';
import type { CanFly, CanStand, HitHow } from './foe';

/**
 * Firefly Bomber: a great firefly whose lantern drips fire, for open places. Logic only, so it runs in tests.
 *
 * It never comes at him. It flies round him high up, out of the sword's reach, and makes bombing RUNS:
 *   The tell: it turns to line up on him and its lantern flares bright.
 *   The run: it flies straight over, and lets three drops of fire fall in a row along its line, aimed not at where he
 *   stands but at where he is GOING (it leads him). Each drop drifts down for about a second (the game marks where
 *   it will land) and leaves a patch of flame that burns for a few seconds. Keep running straight and the middle one
 *   lands on him: turn off the line. The flames are the danger, not the drops; a jump clears them, the Ember Helm
 *   walks through them, and no shield helps.
 * After two runs its light is SPENT. It sinks, dark, to hang low over the floor while its lantern fills again: that is
 * the opening. A cut knocks it to the floor for a moment. When it has its light back it goes up and starts again.
 * It can also be cut out of the air by a rat who jumps high enough (a double jump reaches it): it falls, and lies on
 * the floor. Over a pit, it is gone.
 *
 * Its y is the bottom of its body, as the hornet's is, so the game's "on the same level" test is true only when it is
 * low or he has jumped up to it. A drop leaves it from its `vent` (the tip of its lantern); the model draws the tip
 * there, so a drop appears where the lantern is.
 */
export type FireflyState = 'idle' | 'alert' | 'circle' | 'runWind' | 'run' | 'sink' | 'spent' | 'rise' | 'fall' | 'grounded' | 'dead' | 'return';

export const FIREFLY = {
  hp: 7,
  radius: 0.42,
  height: 4, // the bottom of its body above the ground he stands on: over a jump, inside a double jump
  noticeRange: 12,
  alert: 0.5,
  leash: 20,
  standOff: 7, // it flies round him this far off
  circleSpeed: 0.6, // radians a second round him
  flySpeed: 5,
  turnRate: 5,
  wait: [1.2, 2] as [number, number],
  // The bombing run.
  runWind: 0.7, // the tell: it lines up and its lantern flares
  runTrack: 0.85, // it goes on aiming for this much of the tell, then the line is set
  lead: 1, // how far ahead of him it aims: 0 where he stands, 1 where he will be when the middle drop lands
  leadMax: 13,
  runSpeed: 11, // (well over his running speed, or it could never get ahead of him)
  runPast: 6, // it flies on this far past its mark
  bombs: 3,
  bombGap: 2.4, // they land this far apart along its line: before its mark, on it, past it
  bombFall: 8, // how hard a drop falls (it drifts: less than a thrown thing)
  bombDrift: 0.2, // how much of the firefly's own speed a drop keeps
  flameRadius: 0.95,
  flameTime: 2.8,
  burn: 1,
  runs: 2, // runs before its light is spent
  // Spent: low, dark, filling again.
  sinkSpeed: 4.5,
  low: 0.7, // the bottom of its body above the floor, spent
  rest: 3.4, // the opening
  riseSpeed: 4.5,
  // Knocked down.
  fallTime: 0.45,
  pitFall: 14,
  pitFallTime: 1.25,
  grounded: 1.3,
  respawn: 9,
  // Where a drop leaves it: the tip of its lantern, this far behind its middle and this far above the bottom of its body.
  ventBack: 0.8,
  ventUp: 0.02,
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
function turnToward(current: number, target: number, maxStep: number): number {
  const d = wrap(target - current);
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}
type V3 = { x: number; y: number; z: number };
/** A drop of fire let go: where, and how fast it is going. */
export interface Drop extends V3 {
  vx: number;
  vy: number;
  vz: number;
  /** The colour of its fire, if its firefly has a colour of its own. */
  color?: number;
}

export class Firefly {
  readonly kind = 'firefly' as const;
  x: number;
  z: number;
  /** The bottom of its body. */
  y: number;
  facing = 0;
  hp: number = FIREFLY.hp;
  state: FireflyState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = FIREFLY.radius;
  rng: () => number = Math.random;
  /** For sounds: 'alert', 'runWind', 'run', 'drop', 'spent', 'rise', 'hurt', 'thud', 'lost'. The game empties it. */
  readonly events: string[] = [];
  canStand: CanStand | null = null;
  canFly: CanFly | null = null;

  /** The colour of its light and of its fire, if it has one of its own (only looks: see EnemySpec.color). */
  readonly color: number | undefined;
  readonly floorY: number;
  readonly home: { x: number; z: number; facing: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  /** Where a drop of fire leaves it: the tip of its lantern. */
  readonly vent: V3 = { x: 0, y: 0, z: 0 };
  /** How full of light its lantern is: 0 spent .. 1 full; more than 1 while it flares before a run. */
  light = 1;
  /** Drops let go this tick. The game takes them (and makes the falling fire). */
  readonly drops: Drop[] = [];
  /** How long the tell it is in lasts. */
  windTime: number = FIREFLY.runWind;
  /** How fast it is going over the floor. */
  moving = 0;
  /** Where its run is aimed (the floor where it means its middle drop to land). */
  readonly mark: V3 = { x: 0, y: 0, z: 0 };
  private angle = 0;
  private circleDir = 1;
  private waitLeft = 0;
  private runsDone = 0;
  /** The run: which way it goes, how far along it is, how far it will go, and where along it each drop is let go. */
  private heading = 0;
  private along = 0;
  private runLength = 0;
  private release: number[] = [];
  private blocked = 0;
  /** It has been knocked to the floor since it last flew: it is not knocked down twice in one opening. */
  private knocked = false;
  /** The ground he last stood on, and how fast he is going over it. */
  private readonly ground: V3 = { x: 0, y: 0, z: 0 };
  private readonly pace = { x: 0, z: 0 };
  private lastX = NaN;
  private lastZ = NaN;
  /** The floor it sinks to hang over, spent. */
  private readonly rest: V3 = { x: 0, y: 0, z: 0 };
  private fallFrom = 0;
  private landY = 0;
  private fallX = 0;
  private fallZ = 0;
  private landX = 0;
  private landZ = 0;
  private fallFor: number = FIREFLY.fallTime;

  constructor(spec: { x: number; z: number; y?: number; facing?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean; color?: number }) {
    this.color = spec.color;
    this.floorY = spec.y ?? 0;
    this.home = { x: spec.x, z: spec.z, facing: spec.facing ?? 0 };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 12, x1: spec.x + 12, z0: spec.z - 12, z1: spec.z + 12 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = this.floorY + FIREFLY.height;
    this.facing = this.home.facing;
    this.ground.x = spec.x;
    this.ground.y = this.floorY;
    this.ground.z = spec.z;
    this.rest.y = this.floorY;
    this.landY = this.floorY;
    if (this.hunt) this.state = 'circle';
    this.placeVent();
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  get awake(): boolean {
    return this.state !== 'idle';
  }
  /** In the middle of a run, or lining up for one. */
  get attacking(): boolean {
    return this.state === 'runWind' || this.state === 'run';
  }
  /** Down where the sword can reach it. */
  get downed(): boolean {
    return this.state === 'fall' || this.state === 'grounded';
  }
  /** Its light spent, hanging low (or on its way down or back up): the opening. */
  get low(): boolean {
    return this.state === 'sink' || this.state === 'spent' || this.state === 'rise';
  }
  /** It has no blow of its own: its fire does the harm. */
  get attackActive(): boolean {
    return false;
  }
  /** The floor it has to do with just now (a height): where it will land, what it hangs over, or what he stands on. */
  get floor(): number {
    if (this.state === 'fall' || this.state === 'grounded' || this.state === 'dead') return this.landY;
    if (this.low) return this.rest.y;
    return Math.min(this.ground.y, this.y - 0.5);
  }

  private enter(s: FireflyState): void {
    this.state = s;
    this.stateTime = 0;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  private placeVent(): void {
    this.vent.x = this.x - Math.sin(this.facing) * FIREFLY.ventBack;
    this.vent.y = this.y + FIREFLY.ventUp;
    this.vent.z = this.z - Math.cos(this.facing) * FIREFLY.ventBack;
  }

  private startCircle(wait = 1): void {
    this.knocked = false;
    this.circleDir = this.rng() < 0.5 ? 1 : -1;
    this.waitLeft = this.between(FIREFLY.wait) * wait;
    this.enter('circle');
  }

  /** How long a drop let go from its vent takes to reach the ground he stands on. */
  private fallSeconds(): number {
    return Math.sqrt((2 * Math.max(0.2, this.vent.y - this.ground.y)) / FIREFLY.bombFall);
  }

  /** Sets its mark: ahead of him by as far as he will have gone when its middle drop lands (but on floor, if it can tell). */
  private aimRun(): void {
    const F = FIREFLY;
    const T = this.fallSeconds();
    const drift = F.runSpeed * F.bombDrift * T;
    const wait = Math.max(0, this.windTime - this.stateTime);
    // How long until its middle drop lands depends on how far off its mark is, which depends on how long: a few
    // rounds of that settle it.
    let lx = 0;
    let lz = 0;
    for (let i = 0; i < 4; i++) {
      const toMark = Math.hypot(this.ground.x + lx - this.x, this.ground.z + lz - this.z);
      const lead = (wait + Math.max(0, toMark - drift + F.ventBack) / F.runSpeed + T) * F.lead;
      lx = this.pace.x * lead;
      lz = this.pace.z * lead;
      const far = Math.hypot(lx, lz);
      if (far > F.leadMax) {
        lx *= F.leadMax / far;
        lz *= F.leadMax / far;
      }
    }
    // (Not out over a pit or into a wall: it comes back towards him until it is over floor he could stand on.)
    for (let i = 0; i < 6 && this.canStand && !this.canStand(this.ground.x + lx, this.ground.y, this.ground.z + lz, 0.3); i++) {
      lx *= i === 5 ? 0 : 0.7;
      lz *= i === 5 ? 0 : 0.7;
    }
    this.mark.x = this.ground.x + lx;
    this.mark.y = this.ground.y;
    this.mark.z = this.ground.z + lz;
  }

  /** Works out the run from where it is to (and past) its mark, and where along it each drop is let go. */
  private planRun(): void {
    const F = FIREFLY;
    const dx = this.mark.x - this.x;
    const dz = this.mark.z - this.z;
    const d0 = Math.hypot(dx, dz);
    this.heading = d0 > 0.05 ? Math.atan2(dx, dz) : this.facing;
    this.along = 0;
    this.runLength = d0 + F.runPast;
    const drift = F.runSpeed * F.bombDrift * this.fallSeconds();
    this.release = [];
    // (A drop leaves the tip of its lantern, which is behind its middle: its middle is that far further on when it lets go.)
    for (let i = 0; i < F.bombs; i++) this.release.push(d0 + (i - (F.bombs - 1) / 2) * F.bombGap - drift + F.ventBack);
    // (Too near its mark to lay the row out in front of it: the row starts where it is, and runs on as far.)
    const short = Math.max(0, -this.release[0]);
    this.release = this.release.map((r) => r + short);
    this.runLength = Math.max(this.runLength, this.release[this.release.length - 1] + 1);
    this.blocked = 0;
  }

  /**
   * Where it will hang, spent: over floor he can get to, inside its own air. Under where it is, if that is floor; else
   * the nearest such place on the way to him; else beside him; else under its post.
   */
  private pickRest(): void {
    const ok = this.canStand;
    this.rest.x = this.x;
    this.rest.z = this.z;
    this.rest.y = this.ground.y;
    if (!ok) return;
    const A = this.arena;
    const tryAt = (x: number, z: number): boolean => {
      if (x < A.x0 + this.radius || x > A.x1 - this.radius || z < A.z0 + this.radius || z > A.z1 - this.radius) return false;
      for (const y of [this.ground.y, this.floorY]) {
        if (!ok(x, y, z, this.radius)) continue;
        this.rest.x = x;
        this.rest.y = y;
        this.rest.z = z;
        return true;
      }
      return false;
    };
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      if (tryAt(this.x + (this.ground.x - this.x) * t, this.z + (this.ground.z - this.z) * t)) return;
    }
    for (const r of [0.8, 1.5, 2.5, 3.5, 5]) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        if (tryAt(this.ground.x + Math.sin(a) * r, this.ground.z + Math.cos(a) * r)) return;
      }
    }
    this.rest.x = this.home.x;
    this.rest.y = this.floorY;
    this.rest.z = this.home.z;
  }

  /** Where it is coming down from, and to (as the hornet: beside anything that stands under it; into a pit, if that is what is there). */
  private startFall(): void {
    const F = FIREFLY;
    this.fallFrom = this.y;
    this.landY = this.low && this.canStand?.(this.x, this.rest.y, this.z, 0.1) ? this.rest.y : this.canStand && this.ground.y !== this.floorY && this.canStand(this.x, this.ground.y, this.z, 0.1) && this.ground.y <= this.y ? this.ground.y : this.floorY;
    // (From low down it is on the floor almost at once.)
    this.fallFor = Math.max(0.15, F.fallTime * Math.sqrt(Math.max(0.05, this.y - this.landY) / F.height));
    this.fallX = this.x;
    this.fallZ = this.z;
    this.landX = this.x;
    this.landZ = this.z;
    const stand = this.canStand;
    if (!stand || !this.canFly || stand(this.x, this.landY, this.z, 0.1) || this.canFly(this.x, this.landY, this.z, 0.1)) return;
    for (const r of [0.6, 1, 1.4, 1.9, 2.5]) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const x = this.x + Math.sin(a) * r;
        const z = this.z + Math.cos(a) * r;
        if (!stand(x, this.landY, z, this.radius)) continue;
        this.landX = x;
        this.landZ = z;
        return;
      }
    }
  }

  takeHit(damage: number, _fromX: number, _fromZ: number, _how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.light = 0;
      if (!this.downed) {
        this.startFall();
        if (this.canStand && !this.canStand(this.landX, this.landY, this.landZ, 0.1)) {
          this.landY -= FIREFLY.pitFall;
          this.fallFor = FIREFLY.pitFallTime;
        }
      } else {
        // (Already on the floor, or nearly: it stays where it is.)
        this.fallFrom = this.y;
        this.fallX = this.landX = this.x;
        this.fallZ = this.landZ = this.z;
        this.fallFor = 0.1;
      }
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    // (Once it has been knocked down and is getting up, another cut hurts it but does not put it down again.)
    if (!this.downed && !this.knocked) {
      this.knocked = true;
      this.startFall();
      this.enter('fall');
    }
    return false;
  }

  lungeLanded(): void {
    // (It strikes no blows.)
  }

  nudge(dx: number, dz: number): void {
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
      return Math.abs(cx - x) < 1e-6 && Math.abs(cz - z) < 1e-6;
    }
    // (Stopped by something: it slides along it, each way it still can. So it comes down off a ledge it is over
    // by going sideways first, and does not stick on a corner.)
    if (ok(this.x, y, this.z, this.radius)) this.y = y;
    if (ok(cx, this.y, this.z, this.radius)) this.x = cx;
    if (ok(this.x, this.y, cz, this.radius)) this.z = cz;
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
    const F = FIREFLY;
    this.stateTime += dt;
    this.age += dt;
    this.moving = 0;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const A = this.arena;
    const m = 2;
    const inArena = playerX > A.x0 - m && playerX < A.x1 + m && playerZ > A.z0 - m && playerZ < A.z1 + m;
    const reachable = playerAlive && inArena && playerY > this.floorY - 1.5 && playerY < this.floorY + 6 && dist < F.leash;
    // How fast he is going over the floor (smoothed over a quarter of a second or so): what it leads him by.
    if (dt > 0 && Number.isFinite(this.lastX)) {
      const k = 1 - Math.exp(-dt * 8);
      const vx = (playerX - this.lastX) / dt;
      const vz = (playerZ - this.lastZ) / dt;
      // (Put somewhere else all at once, he has not run there.)
      if (Math.hypot(vx, vz) < 30) {
        this.pace.x += (vx - this.pace.x) * k;
        this.pace.z += (vz - this.pace.z) * k;
      }
    }
    this.lastX = playerX;
    this.lastZ = playerZ;
    // The ground he stands on (or last stood on, if he is in the air): what its fire is aimed at.
    if (playerAlive && (!this.canStand || this.canStand(playerX, playerY, playerZ, 0.1))) {
      this.ground.x = playerX;
      this.ground.y = playerY;
      this.ground.z = playerZ;
    }
    const cruise = this.ground.y + F.height;

    switch (this.state) {
      case 'idle':
        // At its post, hanging in the air, its lantern going slowly bright and dim.
        this.flyToward(this.home.x, this.floorY + F.height + Math.sin(this.age * 1.5) * 0.12, this.home.z, 2, dt);
        this.facing = turnToward(this.facing, this.home.facing, F.turnRate * dt);
        this.light = 1;
        if (reachable && (this.hunt || dist < F.noticeRange * SENSES.notice)) {
          this.events.push('alert');
          this.enter('alert');
        }
        break;
      case 'alert':
        // It has seen him: it turns to him, and its lantern flashes.
        if (dist > 0.05) this.facing = turnToward(this.facing, Math.atan2(dx, dz), F.turnRate * 1.6 * dt);
        this.flyToward(this.x, cruise + 0.25, this.z, 2, dt);
        this.light = 1 + 0.5 * Math.sin(Math.min(1, this.stateTime / F.alert) * Math.PI);
        if (this.stateTime >= F.alert) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.runsDone = 0;
          this.light = 1;
          this.startCircle(0.6);
        }
        break;
      case 'circle': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.waitLeft -= dt;
        this.light = 1;
        if (this.waitLeft <= 0) {
          this.windTime = F.runWind;
          this.events.push('runWind');
          this.enter('runWind');
          this.aimRun();
          break;
        }
        // Round him, a good way off, facing the way it flies.
        this.angle += this.circleDir * F.circleSpeed * dt;
        const tx = playerX + Math.sin(this.angle) * F.standOff;
        const tz = playerZ + Math.cos(this.angle) * F.standOff;
        const bx = this.x;
        const bz = this.z;
        const left = this.flyToward(tx, cruise + Math.sin(this.age * 2.7) * 0.15, tz, F.flySpeed, dt);
        if (Math.hypot(this.x - bx, this.z - bz) > 1e-4) this.facing = turnToward(this.facing, Math.atan2(this.x - bx, this.z - bz), F.turnRate * dt);
        // Held off by a wall: go round the other way.
        if (left > 2.5 && this.stateTime > 0.6) {
          this.circleDir = -this.circleDir;
          this.stateTime = 0;
        }
        break;
      }
      case 'runWind': {
        // The tell: it hangs, turns to line up on its mark, and its lantern flares. The mark follows where he is
        // going for most of the tell; then the line is set.
        if (this.stateTime < this.windTime * F.runTrack) this.aimRun();
        const mx = this.mark.x - this.x;
        const mz = this.mark.z - this.z;
        if (Math.hypot(mx, mz) > 0.05) this.facing = turnToward(this.facing, Math.atan2(mx, mz), F.turnRate * 2 * dt);
        this.flyToward(this.x, cruise, this.z, 1.5, dt);
        this.light = 1 + 0.8 * Math.min(1, this.stateTime / this.windTime);
        if (this.stateTime >= this.windTime) {
          this.planRun();
          this.facing = this.heading;
          this.events.push('run');
          this.enter('run');
        }
        break;
      }
      case 'run': {
        // Straight along its line, level, letting each drop go as it comes to its place.
        const step = Math.min(this.runLength - this.along, F.runSpeed * dt);
        const free = this.moveTo(this.x + Math.sin(this.heading) * step, cruise, this.z + Math.cos(this.heading) * step);
        this.moving = F.runSpeed;
        this.facing = this.heading;
        this.placeVent();
        const before = this.along;
        this.along += step;
        this.blocked = free ? 0 : this.blocked + dt;
        const total = this.release.length;
        for (let i = 0; i < total; i++) {
          if (!(before <= this.release[i] && this.along > this.release[i])) continue;
          this.drops.push({ x: this.vent.x, y: this.vent.y, z: this.vent.z, vx: Math.sin(this.heading) * F.runSpeed * F.bombDrift, vy: 0, vz: Math.cos(this.heading) * F.runSpeed * F.bombDrift, color: this.color });
          this.events.push('drop');
        }
        // (Its light goes down with each drop: after its last run it is all but out.)
        const dropped = this.release.filter((r) => this.along > r).length;
        this.light = Math.max(0.12, 1.8 - (this.runsDone * total + dropped) * (1.68 / (F.runs * total)));
        if (this.along >= this.runLength - 1e-6 || this.blocked > 0.25) {
          this.runsDone++;
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          if (this.runsDone >= F.runs) {
            this.pickRest();
            this.events.push('spent');
            this.enter('sink');
          } else this.startCircle();
        }
        break;
      }
      case 'sink': {
        // Its light spent: down to hang low over the floor.
        this.light = Math.max(0, this.light - dt * 0.6);
        if (dist > 0.05) this.facing = turnToward(this.facing, Math.atan2(dx, dz), F.turnRate * 0.5 * dt);
        const left = this.flyToward(this.rest.x, this.rest.y + F.low, this.rest.z, F.sinkSpeed, dt);
        if (left < 0.05 || this.stateTime > 5) this.enter('spent');
        break;
      }
      case 'spent': {
        // Hanging low, dark, its lantern filling again. The opening.
        if (dist > 0.05) this.facing = turnToward(this.facing, Math.atan2(dx, dz), F.turnRate * 0.4 * dt);
        // (If something kept it from getting down in time, it goes on down as fast as it was.)
        this.flyToward(this.rest.x, this.rest.y + F.low + Math.sin(this.age * 4.1) * 0.06, this.rest.z, Math.hypot(this.rest.x - this.x, this.rest.y + F.low - this.y, this.rest.z - this.z) > 0.4 ? F.sinkSpeed : 1.2, dt);
        this.light = Math.min(1, this.stateTime / F.rest);
        if (this.stateTime >= F.rest) {
          this.events.push('rise');
          this.enter('rise');
        }
        break;
      }
      case 'rise': {
        this.light = Math.min(1, this.light + dt * 1.5);
        const left = this.flyToward(this.x, cruise, this.z, F.riseSpeed, dt);
        if (left < 0.05 || this.stateTime > 3) {
          this.runsDone = 0;
          this.light = 1;
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.knocked = false;
          if (reachable) this.startCircle(0.7);
          else this.enter('return');
        }
        break;
      }
      case 'fall': {
        const k = Math.min(1, this.stateTime / this.fallFor);
        this.y = this.fallFrom + (this.landY - this.fallFrom) * k * k;
        this.x = this.fallX + (this.landX - this.fallX) * k;
        this.z = this.fallZ + (this.landZ - this.fallZ) * k;
        this.light = Math.max(0.15, this.light - dt * 2);
        if (k >= 1) {
          // Over a pit there is no floor to land on.
          if (this.canStand && !this.canStand(this.x, this.landY, this.z, 0.1)) {
            this.events.push('lost');
            this.hp = 0;
            this.light = 0;
            this.fallFrom = this.y;
            this.fallX = this.landX = this.x;
            this.fallZ = this.landZ = this.z;
            this.landY = this.y - F.pitFall;
            this.fallFor = F.pitFallTime;
            this.enter('dead');
          } else {
            this.y = this.landY;
            this.rest.x = this.x;
            this.rest.y = this.landY;
            this.rest.z = this.z;
            this.events.push('thud');
            this.enter('grounded');
          }
        }
        break;
      }
      case 'grounded':
        this.y = this.landY;
        this.light = 0.15 + 0.1 * Math.sin(this.age * 9);
        if (this.stateTime >= F.grounded) {
          this.events.push('rise');
          this.enter('rise');
        }
        break;
      case 'return': {
        if (reachable && dist < F.noticeRange * SENSES.notice) {
          this.angle = Math.atan2(this.x - playerX, this.z - playerZ);
          this.startCircle(0.6);
          break;
        }
        this.light = 1;
        const bx = this.x;
        const bz = this.z;
        const left = this.flyToward(this.home.x, this.floorY + F.height, this.home.z, F.flySpeed, dt);
        if (Math.hypot(this.x - bx, this.z - bz) > 1e-4) this.facing = turnToward(this.facing, Math.atan2(this.x - bx, this.z - bz), F.turnRate * dt);
        if (left < 0.1 || this.stateTime > 12) {
          this.runsDone = 0;
          this.enter('idle');
        }
        break;
      }
      case 'dead': {
        const k = Math.min(1, this.stateTime / this.fallFor);
        this.y = Math.max(this.landY, this.fallFrom + (this.landY - this.fallFrom) * k * k);
        this.x = this.fallX + (this.landX - this.fallX) * k;
        this.z = this.fallZ + (this.landZ - this.fallZ) * k;
        this.light = 0;
        if (this.respawns && this.stateTime >= F.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.floorY + F.height;
          this.facing = this.home.facing;
          this.hp = F.hp;
          this.age = 0;
          this.lastSwing = -1;
          this.runsDone = 0;
          this.light = 1;
          this.knocked = false;
          this.enter('idle');
        }
        break;
      }
    }
    this.facing = wrap(this.facing);
    this.placeVent();
  }
}
