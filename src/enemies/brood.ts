import { keepOnFloor, type CanStand, type HitHow } from './foe';

/**
 * The Broodmother: the great spider of the Hollows, and a boss. She is big, quick on her feet and does not flinch, and
 * every one of her attacks says what it is before it comes:
 *
 *   - The stabs: one foreleg goes up high, then comes down on where he stands; then the other. One heart each, a shield
 *     stops them, and a narrow thing to step out from under. After the last one both legs are in the floor: an opening.
 *   - The scissor: both forelegs go out wide and low, then shut across her whole front along the floor. Jump it.
 *   - The pounce: from far off she sinks down, then springs onto where he is. Two hearts all round where she lands, and
 *     a shield does not stop it: be somewhere else. She lands in a heap, open for a good while.
 *   - The whirl: stay behind her and she spins, legs out, low, all round. Jump it.
 *   - Below half her health she is angry: a third stab, less waiting, and the thread. She goes up to the roof on it,
 *     hangs over him (her shadow follows him on the floor), and drops. Get out from under the shadow when the thread
 *     twangs, and she lands harder and lies there longer than after a pounce.
 *
 * She has poise like the Stag Knight: enough blows close together (a plunge counts for three, a perfect guard for all of
 * it) and her legs go from under her.
 */
export type BroodState =
  | 'idle' | 'roar' | 'chase'
  | 'stabWind' | 'stab' | 'stabStuck'
  | 'sweepWind' | 'sweep' | 'recover'
  | 'crouch' | 'leap' | 'slam' | 'stuck'
  | 'whirlWind' | 'whirl' | 'settle'
  | 'climb' | 'hang' | 'dropTell' | 'drop'
  | 'kneel' | 'dead';

export const BROOD = {
  hp: 38, // (26 till the fight review of 2026-11-25: she was dead in twelve seconds, to skill and to plain swinging alike.)
  radius: 1.05,
  noticeRange: 13,
  roar: 1.3,
  speed: 2.7,
  turnRate: 2.5,
  standRange: 2.9, // she walks in to here (from her middle to him)
  wait: [0.55, 1.1] as [number, number],
  // The stabs.
  stabRange: 3.9,
  stabAim: 0.5,
  stabWind: 0.62,
  pressWind: 0.42, // the wind-up of the one stab that follows a scissor his shield stopped (his guard is broken)
  stabGap: 0.44, // the wind-up of each stab after the first
  stabTrack: 0.6, // she turns with him for this much of a wind-up, then commits
  stabTime: 0.14,
  stabReach: 2.7,
  stabArc: 0.3,
  stabDamage: 1,
  stabs: 2,
  stabsRage: 3,
  stabStuck: 0.95,
  // The scissor.
  sweepRange: 3.3,
  sweepArc: 1.45,
  sweepChance: 0.4,
  sweepWind: 0.78,
  sweepTime: 0.2,
  sweepReach: 2.5,
  sweepDamage: 1,
  recover: 0.85,
  // The pounce.
  leapRange: [5.5, 12] as [number, number],
  leapChance: 0.6, // when he is that far off and it is her turn
  leapWind: 0.9,
  leapTime: 0.62,
  leapHeight: 3.2,
  slamTime: 0.12,
  slamReach: 1.5,
  slamDamage: 2,
  stuck: 1.7,
  // The whirl.
  behindArc: 2.0,
  behindRange: 3.4,
  behindTime: 0.75,
  whirlWind: 0.5,
  whirlTime: 0.3,
  whirlReach: 2.3,
  whirlDamage: 1,
  settle: 0.7,
  whirlCooldown: 3,
  // Angry: below this much of her health.
  rageAt: 0.5,
  rageWait: 0.6, // her waits are this much as long
  // The thread.
  threadEvery: [9, 13] as [number, number],
  climbTime: 1.0,
  hangHeight: 9,
  hangTime: [1.7, 2.5] as [number, number],
  hangSpeed: 5.4, // how fast she follows him across the roof (he can outrun it)
  dropTell: 0.5, // she stops over him and the thread twangs
  dropTime: 0.3,
  dropStuck: 2.3,
  // Poise.
  poise: 7,
  poiseBack: 4,
  plungePoise: 3,
  kneel: 2.6,
  // Up off her knees she is BRACED for this long: blows land but take no poise. (A knight who only swung kept her
  // kneeling a third of the fight and had her dead in twelve seconds. Fight review, 2026-11-25.)
  braced: 5,
};

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function turnToward(from: number, to: number, max: number): number {
  const d = wrap(to - from);
  return Math.abs(d) <= max ? to : from + Math.sign(d) * max;
}

export class Brood {
  readonly kind = 'brood' as const;
  readonly immovable = true;
  /** A boss: the game shows her name and health while she fights. */
  readonly bossName = 'The Broodmother';
  x: number;
  z: number;
  /** Where the sword and the rat's body meet her: the floor she stands on, or far above it while she is in the air. */
  y: number;
  readonly floorY: number;
  facing = 0;
  hp: number = BROOD.hp;
  readonly maxHp: number = BROOD.hp;
  poise: number = BROOD.poise;
  state: BroodState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = BROOD.radius;
  rng: () => number = Math.random;
  /** What she did this tick, for sounds: 'roar', 'stabWind', 'stab', 'sweepWind', 'sweep', 'crouch', 'leap', 'slam', 'whirlWind', 'whirl', 'climb', 'twang', 'drop', 'rage', 'kneel', 'rise', 'hurt', 'step'. */
  readonly events: string[] = [];
  mayAttack = true;
  canStand: CanStand | null = null;

  readonly home: { x: number; z: number };
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns = false;
  /** Which foreleg is stabbing (or about to): 0 her right, 1 her left. */
  arm: 0 | 1 = 0;
  /** How long the wind-up she is in lasts (the first stab's is longer than the ones after). */
  windTime: number = BROOD.stabWind;
  /** How far from her middle the stab comes down: where he stood when she committed to it. */
  stabAt = 3;
  /** How far off the floor she is: the pounce's arc, and the thread. */
  air = 0;
  /** Angry: below half her health. */
  raging = false;
  private stabsLeft = 0;
  private spent = false;
  private waitLeft = 0;
  private behindFor = 0;
  private whirlCool = 0;
  private threadIn = 0;
  private hangLeft = 0;
  private sincePoise = 99;
  private bracedFor = 0;
  private press = false;
  private stepIn = 0;
  private moving = false;
  private fromX = 0;
  private fromZ = 0;
  private leapFrom = { x: 0, z: 0 };
  private leapTo = { x: 0, z: 0 };
  private spin = 0;

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; facing?: number }) {
    this.home = { x: spec.x, z: spec.z };
    this.arena = spec.arena ?? { x0: spec.x - 14, x1: spec.x + 14, z0: spec.z - 14, z1: spec.z + 14 };
    this.x = spec.x;
    this.z = spec.z;
    this.floorY = spec.y ?? 0;
    this.y = this.floorY;
    this.facing = spec.facing ?? 0;
    this.fromX = this.x;
    this.fromZ = this.z;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** She has seen him: the fight is on (the game shows her health from here). */
  get awake(): boolean {
    return this.state !== 'idle';
  }
  get ready(): boolean {
    return this.state === 'chase' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    const s = this.state;
    return s === 'stabWind' || s === 'stab' || s === 'sweepWind' || s === 'sweep' || s === 'crouch' || s === 'leap' || s === 'slam' || s === 'whirlWind' || s === 'whirl' || s === 'climb' || s === 'hang' || s === 'dropTell' || s === 'drop';
  }
  /** Open: nothing is coming for a while. */
  get open(): boolean {
    return this.state === 'stabStuck' || this.state === 'stuck' || this.state === 'kneel' || this.state === 'recover' || this.state === 'settle';
  }
  /** On the thread, out of the sword's reach. */
  get aloft(): boolean {
    return this.state === 'climb' || this.state === 'hang' || this.state === 'dropTell' || this.state === 'drop';
  }
  get attackActive(): boolean {
    if (this.spent) return false;
    if (this.state === 'stab') return this.stateTime >= BROOD.stabTime - 0.08;
    if (this.state === 'sweep') return this.stateTime >= 0.04 && this.stateTime <= BROOD.sweepTime - 0.02;
    if (this.state === 'whirl') return this.stateTime >= 0.04;
    return this.state === 'slam';
  }
  get bite(): { reach: number; arc: number; damage: number; heavy?: boolean; ground?: boolean; breaks?: boolean } {
    const B = BROOD;
    const s = this.state;
    // (Each wind-up answers with the shape of the blow it leads to, so the test view can draw what is coming.)
    if (s === 'sweep' || s === 'sweepWind') return { reach: B.sweepReach, arc: B.sweepArc, damage: B.sweepDamage, ground: true, breaks: true };
    if (s === 'whirl' || s === 'whirlWind') return { reach: B.whirlReach, arc: Math.PI, damage: B.whirlDamage, ground: true };
    if (s === 'slam' || s === 'crouch' || s === 'leap' || s === 'climb' || s === 'hang' || s === 'dropTell' || s === 'drop') return { reach: B.slamReach, arc: Math.PI, damage: B.slamDamage, heavy: true };
    return { reach: B.stabReach, arc: B.stabArc, damage: B.stabDamage };
  }
  /** How fast she is walking (for her legs). */
  get walking(): number {
    return this.moving ? BROOD.speed : 0;
  }
  /** How far round her whirl has turned her, on top of her facing. */
  get whirled(): number {
    return this.spin;
  }
  /** Where her shadow lies while she is on the thread: straight below her. */
  get shadow(): { x: number; z: number; on: boolean; ready: boolean } {
    return { x: this.x, z: this.z, on: this.state === 'hang' || this.state === 'dropTell' || this.state === 'drop', ready: this.state === 'dropTell' || this.state === 'drop' };
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  private enter(s: BroodState): void {
    this.state = s;
    this.stateTime = 0;
  }
  private nextWait(): number {
    return this.between(BROOD.wait) * (this.raging ? BROOD.rageWait : 1);
  }
  private fall(): void {
    this.poise = 0;
    this.spent = true;
    this.events.push('kneel');
    this.enter('kneel');
  }

  /** Every blow lands and none stops her; but each takes some poise, and with none left her legs go from under her. */
  takeHit(damage: number, _fromX: number, _fromZ: number, how: HitHow = 'sword'): boolean {
    if (!this.alive || this.aloft || this.air > 0.9) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.air = 0;
      this.y = this.floorY;
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    if (!this.raging && this.hp <= this.maxHp * BROOD.rageAt) {
      this.raging = true;
      this.events.push('rage');
      this.threadIn = 1.5; // the thread comes soon after
    }
    if (this.state === 'kneel') return false;
    if (this.state === 'idle') this.wake();
    // (In the air of a pounce she cannot be tipped over.)
    if (this.state === 'leap') return false;
    if (this.bracedFor > 0) return false;
    this.poise -= how === 'plunge' ? BROOD.plungePoise : damage;
    this.sincePoise = 0;
    if (this.poise <= 0) this.fall();
    return false;
  }

  /** A blow reached the rat. Blocked, it makes no difference to her; a stab turned by a perfect guard throws her down. */
  lungeLanded(_blocked: boolean, parried = false): void {
    this.spent = true;
    // (Her scissor on his shield has BROKEN HIS GUARD: she stabs at once, while it is down. TUNING.guard.)
    if (_blocked && !parried && this.state === 'sweep') this.press = true;
    if (parried && this.state === 'stab') this.fall();
  }

  nudge(_dx: number, _dz: number): void {}

  /** She has seen him: she rears and screams, then the fight is on. */
  wake(): void {
    if (this.state !== 'idle') return;
    this.events.push('roar');
    this.waitLeft = 0.4;
    this.threadIn = this.between(BROOD.threadEvery);
    this.enter('roar');
  }

  private clamp(): void {
    const A = this.arena;
    this.x = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, this.x));
    this.z = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, this.z));
    if (this.air <= 0) keepOnFloor(this, this.fromX, this.fromZ);
  }
  /** The nearest place to (x, z) she can stand: where it is, or back along the way from where she is. */
  private landing(x: number, z: number): { x: number; z: number } {
    const A = this.arena;
    const r = this.radius + 0.1;
    const tx = Math.max(A.x0 + r, Math.min(A.x1 - r, x));
    const tz = Math.max(A.z0 + r, Math.min(A.z1 - r, z));
    const ok = this.canStand;
    if (!ok) return { x: tx, z: tz };
    for (let k = 0; k <= 10; k++) {
      const u = 1 - k / 10;
      const px = this.x + (tx - this.x) * u;
      const pz = this.z + (tz - this.z) * u;
      if (ok(px, this.floorY, pz, this.radius)) return { x: px, z: pz };
    }
    return { x: this.x, z: this.z };
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const B = BROOD;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    this.sincePoise += dt;
    this.bracedFor = Math.max(0, this.bracedFor - dt);
    this.whirlCool = Math.max(0, this.whirlCool - dt);
    if (this.sincePoise > B.poiseBack && this.state !== 'kneel') this.poise = B.poise;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const off = Math.abs(wrap(toPlayer - this.facing));
    const A = this.arena;
    const inArena = playerX > A.x0 - 1 && playerX < A.x1 + 1 && playerZ > A.z0 - 1 && playerZ < A.z1 + 1;
    const there = playerAlive && inArena;
    // On her own floor (not up on something): what her legs can reach.
    const level = Math.abs(playerY - this.floorY) < 1.6;

    let speed = 0;
    this.moving = false;
    this.spin = 0;
    const after = (): void => {
      this.waitLeft = this.nextWait();
      this.enter('chase');
    };

    switch (this.state) {
      case 'idle':
        if (there && dist < B.noticeRange) this.wake();
        break;
      case 'roar':
        this.facing = turnToward(this.facing, toPlayer, B.turnRate * dt);
        if (this.stateTime >= B.roar) this.enter('chase');
        break;
      case 'chase': {
        if (!there) break; // he is dead or gone: she waits where she is
        this.facing = turnToward(this.facing, toPlayer, B.turnRate * dt);
        this.waitLeft -= dt;
        if (this.raging) this.threadIn -= dt;
        // He is behind her and staying there: the whirl, whoever's turn it is.
        if (off > B.behindArc && dist < B.behindRange && level) this.behindFor += dt;
        else this.behindFor = Math.max(0, this.behindFor - dt * 2);
        if (this.behindFor >= B.behindTime && this.whirlCool <= 0) {
          this.behindFor = 0;
          this.events.push('whirlWind');
          this.enter('whirlWind');
          break;
        }
        if (this.waitLeft <= 0 && this.mayAttack) {
          // Angry, and it is time: up the thread.
          if (this.raging && this.threadIn <= 0) {
            this.threadIn = this.between(B.threadEvery);
            this.hangLeft = this.between(B.hangTime);
            this.events.push('climb');
            this.enter('climb');
            break;
          }
          const square = off <= B.stabAim;
          // Far off (or up where her legs cannot reach): the pounce.
          if ((dist >= B.leapRange[0] && dist <= B.leapRange[1] && square && this.rng() < B.leapChance) || (!level && dist <= B.leapRange[1] && square)) {
            this.events.push('crouch');
            this.enter('crouch');
            break;
          }
          if (level && dist <= B.sweepRange && off <= B.sweepArc * 0.8 && this.rng() < B.sweepChance) {
            this.events.push('sweepWind');
            this.enter('sweepWind');
            break;
          }
          if (level && dist <= B.stabRange && square) {
            this.stabsLeft = this.raging ? B.stabsRage : B.stabs;
            this.arm = this.rng() < 0.5 ? 0 : 1;
            this.windTime = B.stabWind;
            this.events.push('stabWind');
            this.enter('stabWind');
            break;
          }
        }
        if (dist > B.standRange && off < 1.1) {
          this.moving = true;
          speed = B.speed;
          this.stepIn -= dt;
          if (this.stepIn <= 0) {
            this.stepIn = 0.2;
            this.events.push('step');
          }
        }
        break;
      }
      case 'stabWind':
        if (this.stateTime < this.windTime * B.stabTrack) {
          this.facing = turnToward(this.facing, toPlayer, B.turnRate * 1.4 * dt);
          this.stabAt = Math.max(1.9, Math.min(B.radius + B.stabReach, dist));
        }
        if (this.stateTime >= this.windTime) {
          this.spent = false;
          this.events.push('stab');
          this.enter('stab');
        }
        break;
      case 'stab':
        if (this.stateTime >= B.stabTime) {
          this.stabsLeft--;
          if (this.stabsLeft > 0) {
            this.arm = this.arm === 0 ? 1 : 0;
            this.windTime = B.stabGap;
            this.events.push('stabWind');
            this.enter('stabWind');
          } else this.enter('stabStuck');
        }
        break;
      case 'stabStuck':
        if (this.stateTime >= B.stabStuck) after();
        break;
      case 'sweepWind':
        if (this.stateTime < B.sweepWind * 0.5) this.facing = turnToward(this.facing, toPlayer, B.turnRate * dt);
        if (this.stateTime >= B.sweepWind) {
          this.spent = false;
          this.events.push('sweep');
          this.enter('sweep');
        }
        break;
      case 'sweep':
        if (this.stateTime >= B.sweepTime) {
          if (this.press) {
            this.press = false;
            this.stabsLeft = 1;
            this.arm = this.rng() < 0.5 ? 0 : 1;
            this.windTime = B.pressWind;
            this.events.push('stabWind');
            this.enter('stabWind');
          } else this.enter('recover');
        }
        break;
      case 'recover':
        if (this.stateTime >= B.recover) after();
        break;
      case 'crouch':
        if (this.stateTime < B.leapWind * 0.75) this.facing = turnToward(this.facing, toPlayer, B.turnRate * 1.4 * dt);
        if (this.stateTime >= B.leapWind) {
          // She springs at where he is now.
          this.leapFrom = { x: this.x, z: this.z };
          const reach = Math.min(dist, B.leapRange[1]);
          this.leapTo = this.landing(this.x + (dx / (dist || 1)) * reach, this.z + (dz / (dist || 1)) * reach);
          this.events.push('leap');
          this.enter('leap');
        }
        break;
      case 'leap': {
        const u = Math.min(1, this.stateTime / B.leapTime);
        this.x = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * u;
        this.z = this.leapFrom.z + (this.leapTo.z - this.leapFrom.z) * u;
        this.air = 4 * B.leapHeight * u * (1 - u);
        if (u >= 1) {
          this.air = 0;
          this.spent = false;
          this.events.push('slam');
          this.enter('slam');
        }
        break;
      }
      case 'slam':
        if (this.stateTime >= B.slamTime) this.enter('stuck');
        break;
      case 'stuck':
        if (this.stateTime >= (this.hangLeft < 0 ? B.dropStuck : B.stuck)) {
          this.hangLeft = 0;
          after();
        }
        break;
      case 'whirlWind':
        if (this.stateTime >= B.whirlWind) {
          this.spent = false;
          this.events.push('whirl');
          this.enter('whirl');
        }
        break;
      case 'whirl':
        // She goes right round once, and ends up facing him.
        this.spin = Math.min(1, this.stateTime / B.whirlTime) * Math.PI * 2;
        if (this.stateTime >= B.whirlTime) {
          this.spin = 0;
          this.facing = toPlayer;
          this.whirlCool = B.whirlCooldown;
          this.enter('settle');
        }
        break;
      case 'settle':
        if (this.stateTime >= B.settle) after();
        break;
      case 'climb': {
        const u = Math.min(1, this.stateTime / B.climbTime);
        this.air = B.hangHeight * u * u * (3 - 2 * u);
        if (u >= 1) this.enter('hang');
        break;
      }
      case 'hang': {
        this.air = B.hangHeight;
        // Across the roof after him, a little slower than he can run.
        if (there && dist > 0.15) {
          const go = Math.min(dist, B.hangSpeed * dt);
          this.x += (dx / dist) * go;
          this.z += (dz / dist) * go;
          this.facing = turnToward(this.facing, toPlayer, B.turnRate * dt);
        }
        this.hangLeft -= dt;
        if (this.hangLeft <= 0) {
          const spot = this.landing(this.x, this.z);
          this.x = spot.x;
          this.z = spot.z;
          this.events.push('twang');
          this.enter('dropTell');
        }
        break;
      }
      case 'dropTell':
        this.air = B.hangHeight;
        if (this.stateTime >= B.dropTell) {
          this.events.push('drop');
          this.enter('drop');
        }
        break;
      case 'drop': {
        const u = Math.min(1, this.stateTime / B.dropTime);
        this.air = B.hangHeight * (1 - u * u);
        if (u >= 1) {
          this.air = 0;
          this.spent = false;
          this.hangLeft = -1; // (marks the long lie after a drop)
          this.events.push('slam');
          this.enter('slam');
        }
        break;
      }
      case 'kneel':
        if (this.stateTime >= B.kneel) {
          this.poise = B.poise;
          this.bracedFor = B.braced;
          this.events.push('rise');
          after();
        }
        break;
      case 'dead':
        break;
    }

    this.x += Math.sin(this.facing) * speed * dt;
    this.z += Math.cos(this.facing) * speed * dt;
    this.clamp();
    this.y = this.floorY + (this.air > 0.9 ? this.air : 0);
  }
}
