import { SENSES, keepOnFloor, type CanStand, type HitHow, type WallAt } from './foe';

/**
 * The Orchid Mantis: a duellist. Tall, pale, two scythes for arms, and no armour at all: what keeps it alive is that
 * it will not stand there and be hit.
 *
 *   It sways at arm's length, and a sword swung at it there meets air: it hops back out of reach (and then, more often
 *   than not, comes straight back in with a leap). It cannot do that twice in a row, nor while it is busy.
 *
 *   Its attacks:
 *   - The cuts: one scythe goes up (it glints; that is the tell) and comes down, and usually the other follows. The
 *     second cut comes either at once or after a held beat, so rolling on the rhythm of the first gets you cut.
 *     Step out of both, block them, or turn one with a perfect guard.
 *   - The leap: from further off it crouches, flares its wings (the tell) and jumps to where the rat stood, both
 *     scythes coming down. It hits hard; but miss, and the scythes are stuck in the floor.
 *
 *   It is open after its cuts, longer with its scythes stuck in the floor after a leap, longest when a perfect guard
 *   has thrown its arms wide. It is open, too, before it has seen the rat, and to a plunge. Hit twice, it springs away.
 *
 * Where the Keep Guard asks "when do I swing?", the mantis asks "can I make it miss?".
 */
export type MantisState = 'idle' | 'stalk' | 'sway' | 'windup' | 'slash' | 'crouch' | 'leap' | 'stuck' | 'recover' | 'hop' | 'stagger' | 'reel' | 'dead' | 'return';

export const MANTIS = {
  hp: 6,
  radius: 0.42,
  noticeRange: 10,
  speed: 2.9, // stalking in
  strafe: 1.5, // swaying round him
  turnRate: 5,
  swayRange: 2.5, // where it sways, sizing him up
  wait: [0.8, 1.6] as [number, number], // swaying, before it attacks
  retaliate: [0.25, 0.5] as [number, number], // after being hit, or after a hop
  // The cuts.
  windup: 0.5, // the first scythe goes up
  quick: 0.26, // the second, at once
  delayed: 0.64, // or held
  delayChance: 0.5,
  comboChance: 0.75, // how often a second cut follows
  track: 0.6, // it turns with him for this much of a wind-up, then commits
  slashTime: 0.16,
  slashStep: 5.5, // it steps in with each cut
  reach: 1.3,
  arc: 0.8,
  damage: 1,
  recover: 0.95, // arms down after its cuts: open
  // The leap.
  leapRange: [3.4, 6.5] as [number, number],
  leapWindup: 0.6,
  leapTime: 0.42,
  leapShort: 0.8, // it comes down this far short of where he stood, scythes first
  leapHeight: 1.15,
  leapReach: 1.0,
  leapArc: 1.3,
  leapDamage: 2,
  leapCooldown: 3.5,
  stuck: 1.3, // scythes in the floor after a leap that met nothing (or a shield): open
  stuckHit: 0.7, // after one that landed
  // Not being there.
  evadeRange: 2.8,
  evadeArc: 1.3, // it must see the swing coming: each side of its front
  hopTime: 0.24,
  hopSpeed: 8.5,
  evadeCooldown: 3.2,
  escapeAfter: 2, // hits in a row before it springs away, cooldown or no
  // Being hit.
  reel: 2.4, // a cut turned by a perfect guard: arms thrown wide
  stagger: 0.34,
  knockback: 4,
  respawn: 8,
};

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function turnToward(from: number, to: number, max: number): number {
  const d = wrap(to - from);
  return Math.abs(d) <= max ? to : from + Math.sign(d) * max;
}

export class Mantis {
  readonly kind = 'mantis' as const;
  x: number;
  z: number;
  y: number;
  facing = 0;
  hp: number = MANTIS.hp;
  state: MantisState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = MANTIS.radius;
  /** Random numbers, 0..1. Tests swap this for something fixed. */
  rng: () => number = Math.random;
  /** What it did this tick, for sounds: 'alert', 'windup', 'slash', 'crouch', 'leap', 'land', 'hop', 'reel', 'hurt'. The game empties it. */
  readonly events: string[] = [];
  /** Set by the director: whether it may start an attack now. */
  mayAttack = true;
  canStand: CanStand | null = null;
  /** Set by the game: what is solid, so it does not leap through a wall. */
  wallAt: WallAt | null = null;

  readonly home: { x: number; z: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  /** Which cut of its combo this is (0 the first, 1 the second), and which scythe makes it (-1 its right, 1 its left). */
  cut = 0;
  arm: -1 | 1 = -1;
  /** This wind-up is the held one. */
  held = false;
  /** How long the wind-up it is in lasts. */
  windupTime: number = MANTIS.windup;
  /** How far through its leap or hop it is, 0..1 (0 on the ground). */
  air = 0;
  /** Whether its last leap came down on the rat (so it is not stuck for long). */
  private leapHit = false;
  private willCombo = false;
  private velX = 0;
  private velZ = 0;
  private spent = false;
  private waitLeft = 0;
  private side = 1;
  private sideLeft = 0;
  private leapCool = 0;
  private evadeCool = 0;
  private stuckFor = 0;
  private hitsInARow = 0;
  private sinceHit = 99;
  private sawThreat = false;
  private homeFacing: number;
  private fromX = 0;
  private fromZ = 0;
  private leapFrom = { x: 0, z: 0 };
  private leapTo = { x: 0, z: 0 };
  private hopDir = 0;

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean; facing?: number }) {
    this.home = { x: spec.x, z: spec.z };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 7, x1: spec.x + 7, z0: spec.z - 7, z1: spec.z + 7 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
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
    return (this.state === 'sway' || this.state === 'stalk') && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'windup' || this.state === 'slash' || this.state === 'crouch' || this.state === 'leap';
  }
  /** Swaying or stalking with nothing else on: it can get out of the way of a sword it sees coming. */
  get poised(): boolean {
    return (this.state === 'sway' || this.state === 'stalk') && this.evadeCool <= 0;
  }
  /** Open: it will stand there and be hit. */
  get open(): boolean {
    return this.state === 'recover' || this.state === 'stuck' || this.state === 'reel' || this.state === 'stagger' || this.state === 'idle' || this.state === 'return';
  }
  get attackActive(): boolean {
    if (this.spent) return false;
    if (this.state === 'slash') return true;
    // The leap cuts as it comes down, not on the way over.
    return this.state === 'leap' && this.stateTime >= MANTIS.leapTime - 0.09;
  }
  get bite(): { reach: number; arc: number; damage: number } {
    return this.state === 'leap' ? { reach: MANTIS.leapReach, arc: MANTIS.leapArc, damage: MANTIS.leapDamage } : { reach: MANTIS.reach, arc: MANTIS.arc, damage: MANTIS.damage };
  }
  /** How fast it is walking (for its legs). */
  get walking(): number {
    if (this.state === 'stalk') return MANTIS.speed;
    if (this.state === 'return') return MANTIS.speed * 0.7;
    if (this.state === 'sway') return MANTIS.strafe;
    return 0;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  private enter(s: MantisState): void {
    this.state = s;
    this.stateTime = 0;
    if (s !== 'leap' && s !== 'hop') this.air = 0;
  }

  private knock(fromX: number, fromZ: number, k: number): void {
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * k;
    this.velZ = (dz / len) * k;
  }

  /** It has no armour: a blow that reaches it lands. (Its answer to a sword is not to be there: see update.) */
  takeHit(damage: number, fromX: number, fromZ: number, _how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    this.knock(fromX, fromZ, MANTIS.knockback);
    this.hitsInARow = this.sinceHit > 1.2 ? 1 : this.hitsInARow + 1;
    this.sinceHit = 0;
    if (this.hp <= 0) {
      this.hp = 0;
      this.air = 0;
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    // Hit while it is stuck, reeling or spent, it stays so for what is left of it. Otherwise the blow stops whatever it was at.
    if (this.state === 'stuck' || this.state === 'reel' || this.state === 'recover') return false;
    this.waitLeft = this.between(MANTIS.retaliate);
    this.enter('stagger');
    return false;
  }

  /** A cut or the leap reached the rat: hit, blocked, or turned aside by a perfect guard (which throws its arms wide). */
  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    if (parried) {
      this.knock(this.x + Math.sin(this.facing), this.z + Math.cos(this.facing), MANTIS.knockback * 0.7);
      this.willCombo = false;
      this.air = 0;
      this.events.push('reel');
      this.enter('reel');
      return;
    }
    if (this.state === 'leap') this.leapHit = !blocked;
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

  /** Whether it could stand at (x, z). */
  private floorAt(x: number, z: number): boolean {
    const A = this.arena;
    if (x < A.x0 + this.radius || x > A.x1 - this.radius || z < A.z0 + this.radius || z > A.z1 - this.radius) return false;
    return !this.canStand || this.canStand(x, this.y, z, this.radius);
  }

  /** `threat`: the rat is swinging his sword this tick. */
  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean, threat = false): void {
    const M = MANTIS;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    this.sinceHit += dt;
    this.leapCool = Math.max(0, this.leapCool - dt);
    this.evadeCool = Math.max(0, this.evadeCool - dt);
    const newThreat = threat && !this.sawThreat;
    this.sawThreat = threat;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const A = this.arena;
    const margin = 1.5;
    const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
    const reachable = playerAlive && inArena && Math.abs(playerY - this.y) < 0.9;

    let speed = 0;
    let moveX = 0;
    let moveZ = 0;
    const engage = (): void => {
      if (this.state === 'idle' || this.state === 'return') this.events.push('alert');
      this.enter(dist > M.swayRange + 0.4 ? 'stalk' : 'sway');
      if (this.waitLeft <= 0) this.waitLeft = this.between(M.wait);
    };
    const after = (): void => {
      if (reachable) engage();
      else this.enter('return');
    };
    /** Springs back out of reach, the way it was not facing. */
    const hop = (): void => {
      // Straight back if there is floor there; else to whichever side has some.
      const back = this.facing + Math.PI;
      const far = M.hopSpeed * M.hopTime;
      this.hopDir = back;
      for (const a of [0, 0.7, -0.7, 1.3, -1.3]) {
        if (this.floorAt(this.x + Math.sin(back + a) * far, this.z + Math.cos(back + a) * far)) {
          this.hopDir = back + a;
          break;
        }
      }
      this.evadeCool = M.evadeCooldown;
      this.hitsInARow = 0;
      this.waitLeft = this.between(M.retaliate);
      this.events.push('hop');
      this.enter('hop');
    };
    /** Raises a scythe. */
    const cutWith = (n: number): void => {
      this.cut = n;
      if (n === 0) {
        this.arm = this.rng() < 0.5 ? -1 : 1;
        this.willCombo = this.rng() < M.comboChance;
        this.held = false;
        this.windupTime = M.windup;
      } else {
        this.arm = this.arm === 1 ? -1 : 1;
        this.held = this.rng() < M.delayChance;
        this.windupTime = this.held ? M.delayed : M.quick;
      }
      this.events.push('windup');
      this.enter('windup');
    };
    /** Crouches to leap, if there is somewhere to come down. */
    const tryLeap = (): boolean => {
      if (this.leapCool > 0 || dist < M.leapRange[0] || dist > M.leapRange[1]) return false;
      this.events.push('crouch');
      this.enter('crouch');
      return true;
    };

    // A sword it sees coming, while it has nothing else on: it is not there when the blade arrives.
    if (newThreat && reachable && this.poised && dist < M.evadeRange && Math.abs(wrap(toPlayer - this.facing)) < M.evadeArc) hop();

    switch (this.state) {
      case 'idle':
        if (reachable && (this.hunt || dist < M.noticeRange * SENSES.notice)) engage();
        break;
      case 'stalk':
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, M.turnRate * dt);
        this.waitLeft -= dt;
        if (dist <= M.swayRange) this.enter('sway');
        else if (this.waitLeft <= 0 && this.mayAttack && tryLeap()) break;
        else speed = M.speed;
        break;
      case 'sway': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, M.turnRate * dt);
        this.waitLeft -= dt;
        if (this.waitLeft <= 0 && this.mayAttack) {
          // From where it stands: the cuts if he is close, the leap if he has backed off.
          if (dist <= M.swayRange + 0.7) {
            cutWith(0);
            break;
          }
          if (tryLeap()) break;
        }
        if (dist > M.swayRange + 1.1) {
          this.enter('stalk');
          break;
        }
        // It rocks round him, a step one way and then the other, keeping its distance.
        this.sideLeft -= dt;
        if (this.sideLeft <= 0) {
          this.side = this.rng() < 0.5 ? -1 : 1;
          this.sideLeft = 1.1 + this.rng() * 1.3;
        }
        let tx = Math.cos(toPlayer) * this.side;
        let tz = -Math.sin(toPlayer) * this.side;
        if (!this.floorAt(this.x + tx * 0.6, this.z + tz * 0.6)) {
          // No floor that way: it turns back.
          this.side = -this.side;
          tx = -tx;
          tz = -tz;
        }
        const inOut = Math.max(-1, Math.min(1, (dist - M.swayRange) * 2));
        moveX = tx * M.strafe + Math.sin(toPlayer) * inOut * M.strafe;
        moveZ = tz * M.strafe + Math.cos(toPlayer) * inOut * M.strafe;
        break;
      }
      case 'windup':
        if (this.stateTime < this.windupTime * M.track) this.facing = turnToward(this.facing, toPlayer, M.turnRate * dt);
        if (this.stateTime >= this.windupTime) {
          this.spent = false;
          this.events.push('slash');
          this.enter('slash');
        }
        break;
      case 'slash':
        speed = M.slashStep;
        if (this.stateTime >= M.slashTime) {
          if (this.cut === 0 && this.willCombo && reachable) cutWith(1);
          else this.enter('recover');
        }
        break;
      case 'recover':
        if (this.stateTime >= M.recover) {
          this.waitLeft = this.between(M.wait);
          if (this.hitsInARow >= M.escapeAfter && reachable) hop();
          else after();
        }
        break;
      case 'crouch':
        if (this.stateTime < M.leapWindup * M.track) this.facing = turnToward(this.facing, toPlayer, M.turnRate * dt);
        if (this.stateTime >= M.leapWindup) {
          // It jumps at where he is now, and comes down a little short of it, scythes first. Not past the edge of the floor.
          const go = Math.min(M.leapRange[1], Math.max(0.6, dist - M.leapShort));
          const sx = Math.sin(this.facing);
          const sz = Math.cos(this.facing);
          // As far as it can go that way with nothing solid in the air between, and floor to come down on.
          let clear = go;
          if (this.wallAt) for (let d = 0.4; d <= go; d += 0.4) {
            if (this.wallAt(this.x + sx * d, this.y, this.z + sz * d, this.radius)) {
              clear = Math.max(0, d - 0.5);
              break;
            }
          }
          let far = clear;
          while (far > 0.3 && !this.floorAt(this.x + sx * far, this.z + sz * far)) far -= 0.25;
          if (far <= 0.3) far = 0;
          this.leapFrom = { x: this.x, z: this.z };
          this.leapTo = { x: this.x + sx * far, z: this.z + sz * far };
          this.spent = false;
          this.leapHit = false;
          this.leapCool = M.leapCooldown;
          this.events.push('leap');
          this.enter('leap');
        }
        break;
      case 'leap': {
        const u = Math.min(1, this.stateTime / M.leapTime);
        this.air = u;
        this.x = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * u;
        this.z = this.leapFrom.z + (this.leapTo.z - this.leapFrom.z) * u;
        if (u >= 1) {
          this.air = 0;
          this.stuckFor = this.leapHit ? M.stuckHit : M.stuck;
          this.events.push('land');
          this.enter('stuck');
        }
        break;
      }
      case 'stuck':
        if (this.stateTime >= this.stuckFor) {
          this.waitLeft = this.between(M.wait);
          if (this.hitsInARow >= M.escapeAfter && reachable) hop();
          else after();
        }
        break;
      case 'hop': {
        const u = Math.min(1, this.stateTime / M.hopTime);
        this.air = u;
        this.facing = turnToward(this.facing, toPlayer, M.turnRate * dt);
        moveX = Math.sin(this.hopDir) * M.hopSpeed;
        moveZ = Math.cos(this.hopDir) * M.hopSpeed;
        if (u >= 1) {
          this.air = 0;
          after();
        }
        break;
      }
      case 'reel':
        if (this.stateTime >= M.reel) {
          this.waitLeft = this.between(M.wait);
          if (this.hitsInARow >= M.escapeAfter && reachable) hop();
          else after();
        }
        break;
      case 'stagger':
        if (this.stateTime >= M.stagger) {
          // Hit twice running, it will not wait for a third.
          if (this.hitsInARow >= M.escapeAfter && reachable) hop();
          else after();
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < M.noticeRange * SENSES.notice)) {
          engage();
          break;
        }
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.2) {
          this.facing = turnToward(this.facing, this.homeFacing, M.turnRate * dt);
          if (Math.abs(wrap(this.facing - this.homeFacing)) < 0.05) this.enter('idle');
        } else {
          this.facing = turnToward(this.facing, Math.atan2(hx, hz), M.turnRate * dt);
          speed = M.speed * 0.7;
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= M.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.facing = this.homeFacing;
          this.hp = M.hp;
          this.velX = 0;
          this.velZ = 0;
          this.age = 0;
          this.lastSwing = -1;
          this.waitLeft = 0;
          this.leapCool = 0;
          this.evadeCool = 0;
          this.hitsInARow = 0;
          this.enter('idle');
        }
        break;
    }

    const drag = Math.exp(-9 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    // In the air over its leap it goes where it jumped to (somewhere it can stand: see the crouch); else it walks, and the floor holds it.
    if (this.state !== 'leap') {
      this.x += (Math.sin(this.facing) * speed + moveX + this.velX) * dt;
      this.z += (Math.cos(this.facing) * speed + moveZ + this.velZ) * dt;
      this.clamp();
    }
  }
}
