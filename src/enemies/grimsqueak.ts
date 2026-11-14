/**
 * Lord Grimsqueak as a fight. Logic only, so it runs in tests.
 *
 * The shape of it is an old one: he stays out of reach, shows you an attack, and each attack has its own answer
 * and ends with him brought low for a moment. That moment is when the sword reaches him.
 *
 *   The volley   He gathers the Engine's light and throws bolts one after another. Keep moving, roll, or raise the shield.
 *                Then he sinks, spent.
 *   The swoop    He rears back and dives straight through where the rat stands. Step aside and he ploughs on and stops,
 *                low, with his back turned. Catch it on the shield and he is left open longer; catch it just as the shield
 *                comes up and he is knocked silly.
 *   The slam     He rises and drops. A ring of light runs out along the floor from where he lands: jump it or roll
 *                through it. He is on the ground where he fell.
 *   The orb      One slow ball of light. Strike it with the sword and it goes back to him. He bats it back, faster;
 *                strike it again. When he misses it, it hurts him and he hangs stunned for a long time.
 *
 * Three hits in one opening and he bursts away with a pulse that shoves the rat back, so he cannot be pinned.
 * At half health he rages: after that everything is quicker, the volley is five bolts, the slam comes down on top of
 * the rat instead of where he was floating, a missed swoop can turn straight into a slam, and the orb must be
 * returned twice.
 */
import { keepOnFloor } from './foe';
import type { CanStand } from './foe';
import { TOAD } from './toad';
import type { Spit } from './toad';

export type GrimState = 'idle' | 'float' | 'volley' | 'swoopWind' | 'swoop' | 'slamWind' | 'slamFall' | 'orbWind' | 'orbWait' | 'bat' | 'spent' | 'stunned' | 'repel' | 'rage' | 'dead';
export type GrimEvent = 'bolt' | 'swoop' | 'slam' | 'orbThrow' | 'orbBack' | 'orbBat' | 'orbHit' | 'orbGone' | 'repel' | 'rage' | 'tell';
type Attack = 'volley' | 'swoop' | 'slam' | 'orb';

export const GRIM = {
  hp: 16,
  radius: 0.8,
  /** How high he floats when he is up. The sword reaches about 0.9. */
  floatHeight: 1.7,
  /** How fast he rises and sinks, as a share of the whole height per second. */
  floatRate: 3,
  turnRate: 6,
  orbitRadius: 7,
  orbitSpeed: 3.2,
  think: [0.9, 1.5], // floating and circling between attacks
  volley: { windup: 0.7, count: 3, rageCount: 5, gap: 0.24, spent: 1.9, boltSpeed: 9.5 },
  swoop: { windup: 0.9, track: 0.75, speed: 15, time: 0.62, spent: 1.6, blocked: 2.4, parried: 3.2, reach: 0.7, arc: 1.0, damage: 1, chain: 0.4 },
  slam: { windup: 0.85, fall: 0.25, ringSpeed: 9, ringMax: 10.5, ringWidth: 0.45, ringHeight: 0.45, spent: 2.0, damage: 1 },
  orb: { windup: 1.0, speed: 6.5, faster: 1.25, turn: 1.3, life: 7, returns: 1, rageReturns: 2, damage: 1, hurts: 2, stun: 3.2, batTime: 0.35, catchRadius: 0.75, swingBonus: 0.7 },
  /** Hits he will take in one opening before he bursts away (two more while stunned). */
  poise: 3,
  repel: { time: 0.5, radius: 3.4, push: 9 },
  rage: { at: 0.5, time: 1.4, haste: 0.8 },
};

/** A ring of light running out along the floor from where he slammed down. */
export interface Ring {
  x: number;
  z: number;
  r: number;
  /** It has reached the rat (hit, blocked or rolled through): it cannot hurt him again. */
  spent: boolean;
}

/** The orb he trades with the rat. */
export interface Orb {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  speed: number;
  /** Struck back and on its way to him. */
  toBoss: boolean;
  /** How many times he has batted it back. */
  bats: number;
  age: number;
}

function turnToward(current: number, target: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

export class Grimsqueak {
  readonly kind = 'boss' as const;
  x: number;
  z: number;
  y: number;
  facing = Math.PI;
  hp: number = GRIM.hp;
  state: GrimState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  readonly radius = GRIM.radius;
  readonly respawns = false;
  readonly bite = { reach: GRIM.swoop.reach, arc: GRIM.swoop.arc, damage: GRIM.swoop.damage };
  /** Until the talking is over he is not in the fight: he does nothing and nothing can touch him. */
  asleep = true;
  /** 1 floating up out of reach, 0 down where he can be hit. */
  lift = 1;
  /** 1, or 2 once he has raged. */
  phase: 1 | 2 = 1;
  /** The floor he fights over. */
  readonly floorY: number;
  canStand: CanStand | null = null;
  rng: () => number = Math.random;

  /** Bolts thrown this tick; the game takes them and empties the list. */
  spits: Spit[] = [];
  rings: Ring[] = [];
  orb: Orb | null = null;
  /** Things that just happened, for sound and shake; the game takes them and empties the list. */
  events: GrimEvent[] = [];
  /** Set on the tick he bursts away; the game shoves the rat and clears it. */
  repelPulse = false;

  private thinkLeft = 1.2;
  private circleDir = 1;
  private done: Attack[] = [];
  private fired = 0;
  private swoopDir = 0;
  private swoopSpent = false;
  private spentFor = 0;
  private hitsTaken = 0;
  private wantRage = false;
  private fromX = 0;
  private fromZ = 0;

  constructor(spec: { x: number; z: number; y?: number }) {
    this.x = spec.x;
    this.z = spec.z;
    this.floorY = spec.y ?? 0;
    this.y = this.floorY + 50;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** True while the swoop can hurt. */
  get attackActive(): boolean {
    return this.state === 'swoop' && !this.swoopSpent;
  }
  /** Down within the sword's reach. */
  get open(): boolean {
    return this.state === 'spent' || this.state === 'stunned';
  }
  private get haste(): number {
    return this.phase === 2 ? GRIM.rage.haste : 1;
  }

  wake(): void {
    if (!this.asleep) return;
    this.asleep = false;
    this.lift = 1;
    this.y = this.floorY + GRIM.floatHeight;
    this.enter('float');
    this.thinkLeft = 1.2;
  }

  private enter(s: GrimState): void {
    this.state = s;
    this.stateTime = 0;
  }

  private rest(seconds: number, stunned = false): void {
    this.spentFor = seconds;
    this.hitsTaken = 0;
    this.enter(stunned ? 'stunned' : 'spent');
  }

  /** Back up into the air after an opening; or, the first time his health is half gone, into his rage. */
  private rise(): void {
    if (this.wantRage && this.phase === 1) {
      this.wantRage = false;
      this.events.push('rage');
      this.enter('rage');
      return;
    }
    this.enter('float');
    this.thinkLeft = (GRIM.think[0] + (GRIM.think[1] - GRIM.think[0]) * this.rng()) * this.haste;
    this.circleDir = this.rng() < 0.5 ? 1 : -1;
  }

  takeHit(damage: number, _fromX: number, _fromZ: number): boolean {
    if (!this.alive || this.asleep || this.state === 'rage') return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.orb = null;
      this.rings = [];
      this.enter('dead');
      return true;
    }
    if (this.hp <= GRIM.hp * GRIM.rage.at && this.phase === 1) this.wantRage = true;
    if (this.open) {
      this.hitsTaken++;
      if (this.hitsTaken >= GRIM.poise + (this.state === 'stunned' ? 2 : 0)) {
        // Enough. He bursts away, and the rat is shoved back by it.
        this.repelPulse = true;
        this.events.push('repel');
        this.enter('repel');
      }
    }
    return false;
  }

  /** The swoop reached the rat. */
  lungeLanded(blocked: boolean, parried = false): void {
    this.swoopSpent = true;
    if (parried) this.rest(GRIM.swoop.parried, true);
    else if (blocked) this.rest(GRIM.swoop.blocked);
  }

  nudge(dx: number, dz: number): void {
    if (this.asleep || !this.open) return;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.x += dx;
    this.z += dz;
    this.settle();
  }

  private settle(): void {
    const y = this.y;
    this.y = this.floorY;
    keepOnFloor(this, this.fromX, this.fromZ);
    this.y = y;
  }

  /**
   * The rat's sword is out: if the orb is in front of him and in reach, it goes back where it came from.
   * `reach` and `arc` are the swing's own. Returns true if he struck it.
   */
  swingAt(px: number, pz: number, facing: number, reach: number, arc: number): boolean {
    const o = this.orb;
    if (!o || o.toBoss) return false;
    const dx = o.x - px;
    const dz = o.z - pz;
    const dist = Math.hypot(dx, dz);
    const off = Math.abs(Math.atan2(Math.sin(Math.atan2(dx, dz) - facing), Math.cos(Math.atan2(dx, dz) - facing)));
    if (dist > reach + GRIM.orb.swingBonus || (off > arc && dist > 0.9)) return false;
    o.toBoss = true;
    o.speed *= GRIM.orb.faster;
    this.aimOrb(this.x, this.z);
    this.events.push('orbBack');
    return true;
  }

  private aimOrb(tx: number, tz: number): void {
    const o = this.orb!;
    const d = Math.hypot(tx - o.x, tz - o.z) || 1;
    o.vx = ((tx - o.x) / d) * o.speed;
    o.vz = ((tz - o.z) / d) * o.speed;
  }

  /** True when the orb has reached the rat. The game then asks him how he took it and calls orbTaken. */
  orbAtRat(px: number, py: number, pz: number): boolean {
    const o = this.orb;
    return !!o && !o.toBoss && Math.hypot(o.x - px, o.z - pz) < GRIM.orb.catchRadius && Math.abs(o.y - (py + 0.5)) < 1;
  }

  /** The orb hit the rat or his shield (not rolled through): it is gone. */
  orbTaken(): void {
    this.orb = null;
    this.events.push('orbGone');
    if (this.state === 'orbWait' || this.state === 'bat') this.rise();
  }

  /** A ring that has just reached the rat while he is on the ground, or null. The game then hurts him (or not, if he rolls or blocks). */
  ringAtRat(px: number, py: number, pz: number): Ring | null {
    if (py - this.floorY > GRIM.slam.ringHeight) return null;
    for (const r of this.rings) {
      if (r.spent || Math.abs(Math.hypot(px - r.x, pz - r.z) - r.r) > GRIM.slam.ringWidth) continue;
      r.spent = true;
      return r;
    }
    return null;
  }

  private choose(): Attack {
    // The first time round he shows each attack once, in order of difficulty. After that: anything but the last one,
    // and the orb no more than one time in three.
    const order: Attack[] = ['volley', 'swoop', 'slam', 'orb'];
    if (this.done.length < order.length) return order[this.done.length];
    const last = this.done[this.done.length - 1];
    const recentOrb = this.done.slice(-2).includes('orb');
    const pool = order.filter((a) => a !== last && !(a === 'orb' && recentOrb));
    return pool[Math.floor(this.rng() * pool.length) % pool.length];
  }

  private begin(a: Attack): void {
    this.done.push(a);
    this.events.push('tell');
    this.fired = 0;
    this.enter(a === 'volley' ? 'volley' : a === 'swoop' ? 'swoopWind' : a === 'slam' ? 'slamWind' : 'orbWind');
  }

  private bolt(px: number, py: number, pz: number): void {
    const V = GRIM.volley;
    const sx = this.x + Math.sin(this.facing) * 0.6;
    const sz = this.z + Math.cos(this.facing) * 0.6;
    const sy = this.floorY + this.lift * GRIM.floatHeight + 0.6;
    const dx = px - sx;
    const dz = pz - sz;
    const flat = Math.max(0.5, Math.hypot(dx, dz));
    const T = flat / V.boltSpeed;
    const vy = (py + 0.5 - sy + 0.5 * TOAD.globGravity * T * T) / T;
    this.spits.push({ x: sx, y: sy, z: sz, vx: (dx / flat) * V.boltSpeed, vy, vz: (dz / flat) * V.boltSpeed, kind: 'energy' });
    this.events.push('bolt');
  }

  update(dt: number, px: number, py: number, pz: number, playerAlive: boolean): void {
    if (this.asleep || this.state === 'dead') return;
    this.stateTime += dt;
    this.fromX = this.x;
    this.fromZ = this.z;
    const dx = px - this.x;
    const dz = pz - this.z;
    const dist = Math.hypot(dx, dz);
    const toRat = Math.atan2(dx, dz);
    const h = this.haste;
    let liftTo = 1;
    let liftRate = GRIM.floatRate;

    switch (this.state) {
      case 'float': {
        this.facing = turnToward(this.facing, toRat, GRIM.turnRate * dt);
        // Round him at a distance, drifting in or out to keep it.
        const drift = Math.max(-1, Math.min(1, (dist - GRIM.orbitRadius) * 0.8));
        this.x += (Math.cos(toRat) * this.circleDir + Math.sin(toRat) * drift) * GRIM.orbitSpeed * dt;
        this.z += (-Math.sin(toRat) * this.circleDir + Math.cos(toRat) * drift) * GRIM.orbitSpeed * dt;
        if (playerAlive) this.thinkLeft -= dt;
        if (this.thinkLeft <= 0) this.begin(this.choose());
        break;
      }
      case 'volley': {
        const V = GRIM.volley;
        this.facing = turnToward(this.facing, toRat, GRIM.turnRate * dt);
        const count = this.phase === 2 ? V.rageCount : V.count;
        while (this.fired < count && this.stateTime >= V.windup * h + this.fired * V.gap * h) {
          this.bolt(px, py, pz);
          this.fired++;
        }
        if (this.fired >= count && this.stateTime >= V.windup * h + count * V.gap * h + 0.15) this.rest(V.spent);
        break;
      }
      case 'swoopWind': {
        const W = GRIM.swoop;
        if (this.stateTime < W.windup * h * W.track) this.facing = turnToward(this.facing, toRat, GRIM.turnRate * dt);
        if (this.stateTime >= W.windup * h) {
          this.swoopDir = this.facing;
          this.swoopSpent = false;
          this.events.push('swoop');
          this.enter('swoop');
        }
        break;
      }
      case 'swoop': {
        const W = GRIM.swoop;
        liftTo = 0.08;
        liftRate = 9;
        this.x += Math.sin(this.swoopDir) * W.speed * dt;
        this.z += Math.cos(this.swoopDir) * W.speed * dt;
        if (this.stateTime >= W.time) {
          // Missed. In his rage he may turn it straight into a slam; otherwise he is left low, facing the wrong way.
          if (this.phase === 2 && !this.swoopSpent && this.rng() < W.chain) this.begin('slam');
          else this.rest(W.spent);
        }
        break;
      }
      case 'slamWind': {
        const S = GRIM.slam;
        // In his rage he comes over to hang above the rat; before that he drops where he floats.
        if (this.phase === 2 && this.stateTime < S.windup * h * 0.6) {
          this.x += (px - this.x) * Math.min(1, dt * 5);
          this.z += (pz - this.z) * Math.min(1, dt * 5);
        }
        this.facing = turnToward(this.facing, toRat, GRIM.turnRate * dt);
        if (this.stateTime >= S.windup * h) this.enter('slamFall');
        break;
      }
      case 'slamFall': {
        const S = GRIM.slam;
        liftTo = 0;
        liftRate = 1 / S.fall;
        if (this.stateTime >= S.fall) {
          this.lift = 0;
          this.rings.push({ x: this.x, z: this.z, r: this.radius, spent: false });
          this.events.push('slam');
          this.rest(S.spent);
        }
        break;
      }
      case 'orbWind': {
        const O = GRIM.orb;
        this.facing = turnToward(this.facing, toRat, GRIM.turnRate * dt);
        if (this.stateTime >= O.windup * h) {
          this.orb = { x: this.x + Math.sin(this.facing), y: this.floorY + 0.9, z: this.z + Math.cos(this.facing), vx: 0, vz: 0, speed: O.speed / h, toBoss: false, bats: 0, age: 0 };
          this.aimOrb(px, pz);
          this.events.push('orbThrow');
          this.enter('orbWait');
        }
        break;
      }
      case 'orbWait':
      case 'bat':
        this.facing = turnToward(this.facing, toRat, GRIM.turnRate * dt);
        // He comes down to the orb's height to play: this is a duel, not a bombardment.
        liftTo = 0.45;
        if (this.state === 'bat' && this.stateTime >= GRIM.orb.batTime) this.enter('orbWait');
        if (!this.orb && this.state === 'orbWait') this.rise();
        break;
      case 'spent':
      case 'stunned':
        liftTo = 0;
        liftRate = 5;
        if (this.stateTime >= this.spentFor) this.rise();
        break;
      case 'repel':
        if (this.stateTime >= GRIM.repel.time) this.rise();
        break;
      case 'rage':
        if (this.stateTime >= GRIM.rage.time) {
          this.phase = 2;
          this.rise();
        }
        break;
    }

    this.settle();
    // Floating round a pillar or into a wall, he goes round the other way; a swoop into a wall ends there.
    if (this.state === 'float' && Math.hypot(this.x - this.fromX, this.z - this.fromZ) < GRIM.orbitSpeed * dt * 0.4) this.circleDir = -this.circleDir;
    if (this.state === 'swoop' && Math.hypot(this.x - this.fromX, this.z - this.fromZ) < GRIM.swoop.speed * dt * 0.4) this.rest(GRIM.swoop.spent);

    this.lift += Math.max(-liftRate * dt, Math.min(liftRate * dt, liftTo - this.lift));
    this.y = this.floorY + this.lift * GRIM.floatHeight;

    // The rings run out along the floor.
    for (const r of this.rings) r.r += GRIM.slam.ringSpeed * dt;
    this.rings = this.rings.filter((r) => r.r < GRIM.slam.ringMax);

    // The orb.
    const o = this.orb;
    if (o) {
      const O = GRIM.orb;
      o.age += dt;
      // It bends a little towards whoever it is meant for, so it cannot simply be walked away from.
      const tx = o.toBoss ? this.x : px;
      const tz = o.toBoss ? this.z : pz;
      const heading = turnToward(Math.atan2(o.vx, o.vz), Math.atan2(tx - o.x, tz - o.z), (o.toBoss ? 6 : O.turn) * dt);
      o.vx = Math.sin(heading) * o.speed;
      o.vz = Math.cos(heading) * o.speed;
      o.x += o.vx * dt;
      o.z += o.vz * dt;
      if (o.toBoss && Math.hypot(o.x - this.x, o.z - this.z) < this.radius + 0.35) {
        const needed = this.phase === 2 ? O.rageReturns : O.returns;
        if (o.bats < needed) {
          // He bats it back, faster.
          o.bats++;
          o.toBoss = false;
          o.speed *= O.faster;
          this.aimOrb(px, pz);
          this.events.push('orbBat');
          this.enter('bat');
        } else {
          // He misses it.
          this.orb = null;
          this.events.push('orbHit');
          this.hp -= O.hurts;
          if (this.hp <= 0) {
            this.hp = 0;
            this.rings = [];
            this.enter('dead');
          } else {
            if (this.hp <= GRIM.hp * GRIM.rage.at && this.phase === 1) this.wantRage = true;
            this.rest(O.stun, true);
          }
        }
      } else if (o.age > O.life) {
        this.orb = null;
        this.events.push('orbGone');
        if (this.state === 'orbWait' || this.state === 'bat') this.rise();
      }
    }
  }
}
