import { SENSES, keepOnFloor, type FloorUnder, sameGround } from './foe';
import { flankWay } from './director';
import type { BodyPart, CanStand } from './foe';

/**
 * The Lamp Scorpion: a cave scorpion whose sting is its lamp. Logic only, so it runs in tests.
 * (The owner, 2026-11-16, for a dark cave lit by what lives in it: "other insects or arachnids ... creepy crawlies
 * that glow".) Its body is dark; what he sees of it in the dark is the light at the end of its tail, and THE LIGHT
 * IS THE TELL: it strikes only with its lamp lit, and the lamp says what is coming.
 *
 *   - It stalks him, sidling round at a little more than a sword's length, claws up, its lamp glowing low.
 *   - The sting: its tail rears high over its back and the lamp flares, and a ring on the floor in front of it shows
 *     where the barb will come down: on where he stands, for the first part of the tell, and then it is set. The tail
 *     whips over and the barb goes into the floor there. One heart; a shield stops it. Then the barb is STUCK in the
 *     floor, the tail stretched out along the ground: that is the opening.
 *   - The claws: stand close in front of it and its claws open wide (the tell, a short one) and snap shut. One heart;
 *     a shield stops it. So the place to be is beside it, or behind.
 *   - It does not stand to be cut down. At the second blow close together its lamp goes OUT and it darts away into
 *     the dark, quick and low; it comes round him unlit (and does nothing while it is: it has no sting without its
 *     lamp), and then the lamp lights again somewhere else and it comes back in.
 *   - A perfect guard on its sting or its claws throws it down sprawled: belly on the floor, claws wide, its tail
 *     flopped out in front of it, helpless, and it does not run from that.
 *
 * Where things are, for the game and the model. Its tail is measured in its own frame: `tail.ahead` is how far in
 * front of its middle the barb is and `tail.up` how high. The ring on the floor is `aimDist` in front of its middle,
 * `stingR` round, and the blow lands exactly there (`aim`): if it is shoved, the ring and the blow go with it.
 */
export type ScorpionState = 'idle' | 'stalk' | 'stingWind' | 'sting' | 'stuck' | 'snapWind' | 'snap' | 'recover' | 'stagger' | 'douse' | 'dark' | 'sprawl' | 'dead' | 'return';

export const SCORPION = {
  hp: 5,
  radius: 0.55,
  noticeRange: 11,
  speed: 3.2,
  turnRate: 5,
  standOff: 2.5, // it sidles round him this far off
  circleSpeed: 1.6,
  /** Sent to wait at his side (he is locked on to another), it sidles round this many times faster. */
  flankHurry: 1.8,
  wait: [0.7, 1.5] as [number, number],
  // The sting.
  stingMin: 1.3, // the nearest in front of its middle the barb comes down
  stingReach: 2.3, // ...and the furthest
  stingR: 0.7, // how wide the blow is (and the ring that marks it)
  stingWind: 0.7, // the tell: tail reared, lamp flaring
  stingTrack: 0.45, // the ring follows him for this much of the tell, then it is set
  stingTime: 0.12, // the tail coming over
  stingStuck: 0.95, // the opening: its barb in the floor
  stingBlocked: 1.3, // ...longer if it struck his shield
  stingDamage: 1,
  // The claws.
  snapRange: 1.45, // he is this near its middle...
  snapFront: 1.05, // ...and within this of straight ahead (radians)
  snapWind: 0.32,
  snapTime: 0.12,
  snapReach: 0.8, // beyond its body
  snapArc: 0.95,
  snapDamage: 1,
  snapRecover: 0.5,
  snapBlocked: 0.9,
  snapCooldown: 1.6,
  // Hurt.
  stagger: 0.3,
  knockback: 4,
  douseAfter: 2, // blows close together before its lamp goes out and it runs
  hitsForget: 1.6, // "close together": within this of the one before
  douseTime: 0.45, // the dart away
  douseSpeed: 9,
  dark: 1.3, // unlit, coming round him
  darkSpeed: 4.2,
  darkRing: 4.2,
  relightWait: [0.25, 0.5] as [number, number],
  sprawl: 1.7,
  recover: 0.3,
  respawn: 8,
  // Its tail (in its own frame: ahead of its middle, above its feet). The tail is `tailLength` long from its root.
  tailRoot: { ahead: -0.65, up: 0.42 },
  tailLength: 3.0,
  rest: { ahead: 0.45, up: 1.5 }, // held over its back
  rear: { ahead: -0.15, up: 2.05 }, // reared for the sting
  tucked: { ahead: 0.25, up: 0.95 }, // curled tight and low, as it runs unlit
  limp: { ahead: 2.2, up: 0.08 }, // flopped out in front of it, sprawled or dead
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
function turnToward(current: number, target: number, maxStep: number): number {
  const d = wrap(target - current);
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}

export class Scorpion {
  readonly kind = 'scorpion' as const;
  x: number;
  z: number;
  y = 0;
  facing = 0;
  hp: number = SCORPION.hp;
  state: ScorpionState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius: number = SCORPION.radius;
  rng: () => number = Math.random;
  mayAttack = true;
  /** Where round him to wait while he is locked on to another (director.ts); null for wherever it likes. */
  flank: number | null = null;
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
  private homeY = 0;
  /** For sounds: 'alert', 'stingWind', 'sting', 'stuck', 'snapWind', 'snap', 'hurt', 'douse', 'relight', 'flip'. The game empties it. */
  readonly events: string[] = [];

  readonly home: { x: number; z: number; facing: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  /** The colour of its lamp, if it has one of its own (only looks). */
  readonly color: number | undefined;

  /** How bright its lamp is: 0 out, about 0.6 as it stalks, up to 1.6 flaring before the sting. */
  light = 0.35;
  /** Where its barb is, in its own frame (see the top of the file). */
  readonly tail = { ahead: SCORPION.rest.ahead, up: SCORPION.rest.up };
  /** How far in front of its middle the sting is aimed. */
  aimDist: number = SCORPION.stingReach;
  /** How wide its claws are open: 0 held ready, 1 wide (the snap's tell), -1 shut. */
  claw = 0;
  /** How fast it is going over the floor. */
  moving = 0;

  private velX = 0;
  private velZ = 0;
  private spent = false;
  private stuckTime: number = SCORPION.stingStuck;
  private recoverTime: number = SCORPION.recover;
  private waitLeft = 0;
  private circleDir = 1;
  private snapWait = 0;
  private hitsRun = 0;
  private sinceHit = 99;
  private dashX = 0;
  private dashZ = 0;
  private readonly tailFrom = { ahead: 0, up: 0 };
  private fromX = 0;
  private fromZ = 0;

  constructor(spec: { x: number; z: number; y?: number; facing?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean; color?: number }) {
    this.home = { x: spec.x, z: spec.z, facing: spec.facing ?? 0 };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 8, x1: spec.x + 8, z0: spec.z - 8, z1: spec.z + 8 };
    this.respawns = spec.respawn ?? false;
    this.color = spec.color;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
    this.homeY = this.y;
    this.facing = this.home.facing;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** It has waited long enough and wants to sting. */
  get ready(): boolean {
    return this.state === 'stalk' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    return this.state === 'stingWind' || this.state === 'sting' || this.state === 'snapWind' || this.state === 'snap';
  }
  /** Its lamp is lit: it can strike. (Unlit, it has no sting.) */
  get lit(): boolean {
    return this.state !== 'douse' && this.state !== 'dark' && this.state !== 'dead';
  }
  /** How long the tell it is in lasts. */
  get windTime(): number {
    return this.state === 'snapWind' ? SCORPION.snapWind : SCORPION.stingWind;
  }
  /** Where the sting is aimed: the middle of the ring on the floor. */
  get aim(): { x: number; z: number } {
    return { x: this.x + Math.sin(this.facing) * this.aimDist, z: this.z + Math.cos(this.facing) * this.aimDist };
  }
  /** The ring on the floor: shown while the sting is coming, and how full it is (it fills as the tell runs out). */
  get mark(): { x: number; z: number; r: number; fill: number } | null {
    if (this.state !== 'stingWind' && this.state !== 'sting') return null;
    const a = this.aim;
    return { x: a.x, z: a.z, r: SCORPION.stingR, fill: this.state === 'sting' ? 1 : Math.min(1, this.stateTime / SCORPION.stingWind) };
  }
  /** Where its barb is in the room. */
  get tip(): { x: number; y: number; z: number } {
    return { x: this.x + Math.sin(this.facing) * this.tail.ahead, y: this.y + this.tail.up, z: this.z + Math.cos(this.facing) * this.tail.ahead };
  }

  get attackActive(): boolean {
    if (this.spent) return false;
    // (THE STING HURTS WHEN THE BARB LANDS, as it is drawn: the last instants of its fall and the instant after it
    // strikes the floor. It was live from 0.4 of the way down, four or five frames before the barb was seen to land,
    // and over by the time it did: a guard timed to what he SAW was late. Audit, 2026-11-24.)
    if (this.state === 'sting') return this.stateTime >= SCORPION.stingTime * 0.8;
    if (this.state === 'stuck') return this.stateTime < 0.05;
    return this.state === 'snap';
  }
  /** The sting comes down on its ring; the claws shut in front of it. */
  get bite(): { reach: number; arc: number; damage: number; at?: BodyPart; from?: { x: number; z: number } } {
    const S = SCORPION;
    if (this.state === 'sting' || this.state === 'stingWind' || this.state === 'stuck') {
      const a = this.aim;
      return { reach: 0, arc: Math.PI, damage: S.stingDamage, at: { x: a.x, z: a.z, r: S.stingR }, from: { x: this.x, z: this.z } };
    }
    return { reach: S.snapReach, arc: S.snapArc, damage: S.snapDamage };
  }

  private enter(state: ScorpionState): void {
    this.state = state;
    this.stateTime = 0;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }

  takeHit(damage: number, fromX: number, fromZ: number): boolean {
    if (!this.alive) return false;
    const S = SCORPION;
    this.hp -= damage;
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.velX = (dx / len) * S.knockback;
      this.velZ = (dz / len) * S.knockback;
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    // (Sprawled, it can only lie there and take it.)
    if (this.state === 'sprawl') return false;
    this.velX = (dx / len) * S.knockback;
    this.velZ = (dz / len) * S.knockback;
    this.hitsRun = this.sinceHit <= S.hitsForget ? this.hitsRun + 1 : 1;
    this.sinceHit = 0;
    if (this.hitsRun >= S.douseAfter) {
      // Its lamp goes out and it darts away from him, off to one side.
      this.hitsRun = 0;
      const away = Math.atan2(dx, dz) + (this.rng() < 0.5 ? 0.9 : -0.9);
      this.dashX = Math.sin(away);
      this.dashZ = Math.cos(away);
      this.velX = 0;
      this.velZ = 0;
      this.circleDir = this.rng() < 0.5 ? 1 : -1;
      this.events.push('douse');
      this.enter('douse');
      return false;
    }
    this.enter('stagger');
    return false;
  }

  lungeLanded(blocked: boolean, parried = false): void {
    const S = SCORPION;
    this.spent = true;
    if (parried) {
      this.velX = -Math.sin(this.facing) * S.knockback;
      this.velZ = -Math.cos(this.facing) * S.knockback;
      this.events.push('flip');
      this.enter('sprawl');
      return;
    }
    if (!blocked) return;
    if (this.state === 'sting') this.stuckTime = S.stingBlocked;
    else {
      this.recoverTime = S.snapBlocked;
      this.enter('recover');
    }
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

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const S = SCORPION;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;
    this.sinceHit += dt;
    this.snapWait = Math.max(0, this.snapWait - dt);

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const A = this.arena;
    const margin = 1.5;
    const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);

    let speed = 0;
    let moveX = 0;
    let moveZ = 0;
    // What its tail, its lamp and its claws are going to, and how quickly.
    let tailTo: { ahead: number; up: number } = S.rest;
    let tailRate = 9;
    let lightTo = 0.6;
    let lightRate = 6;
    let clawTo = 0;
    const stalk = (wait: number): void => {
      this.enter('stalk');
      this.waitLeft = wait;
      this.circleDir = this.rng() < 0.5 ? 1 : -1;
    };

    switch (this.state) {
      case 'idle':
        lightTo = 0.35;
        if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) {
          this.events.push('alert');
          stalk(this.between(S.wait));
        }
        break;
      case 'stalk': {
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, S.turnRate * dt);
        const ahead = Math.abs(wrap(toPlayer - this.facing));
        // He is in its face: the claws.
        if (dist <= S.snapRange && ahead < S.snapFront && this.snapWait <= 0) {
          this.events.push('snapWind');
          this.enter('snapWind');
          break;
        }
        this.waitLeft -= dt;
        if (this.waitLeft <= 0 && this.mayAttack && dist <= S.stingReach && ahead < 0.15) {
          this.aimDist = Math.max(S.stingMin, Math.min(S.stingReach, dist));
          this.events.push('stingWind');
          this.enter('stingWind');
          break;
        }
        if (dist > S.standOff + 0.4 || (this.waitLeft <= 0 && dist > S.stingReach)) speed = S.speed;
        else {
          // Sidling round him, drifting in or out to keep its distance.
          const drift = Math.max(-1, Math.min(1, (dist - S.standOff) * 1.6));
          // Sent to his side (he is locked on to another): round to it by the short way, and hold there.
          const side = this.flank !== null ? flankWay(this.flank, toPlayer, S.flankHurry) : this.circleDir;
          moveX = Math.cos(toPlayer) * S.circleSpeed * side + Math.sin(toPlayer) * S.circleSpeed * drift;
          moveZ = -Math.sin(toPlayer) * S.circleSpeed * side + Math.cos(toPlayer) * S.circleSpeed * drift;
        }
        break;
      }
      case 'stingWind': {
        tailTo = S.rear;
        tailRate = 12;
        lightTo = 0.6 + Math.min(1, this.stateTime / S.stingWind);
        lightRate = 30;
        // The ring follows him for the first part of the tell; then it is set.
        if (this.stateTime < S.stingTrack && playerAlive) {
          this.facing = turnToward(this.facing, toPlayer, S.turnRate * 2 * dt);
          this.aimDist = Math.max(S.stingMin, Math.min(S.stingReach, dist));
        }
        if (this.stateTime >= S.stingWind) {
          this.spent = false;
          this.stuckTime = S.stingStuck;
          this.tailFrom.ahead = this.tail.ahead;
          this.tailFrom.up = this.tail.up;
          this.events.push('sting');
          this.enter('sting');
        }
        break;
      }
      case 'sting': {
        // The tail comes over: from where it was reared to the middle of the ring, on the floor.
        const k = Math.min(1, this.stateTime / S.stingTime);
        this.tail.ahead = this.tailFrom.ahead + (this.aimDist - this.tailFrom.ahead) * k;
        this.tail.up = this.tailFrom.up + (0.06 - this.tailFrom.up) * k * k;
        tailRate = 0;
        lightTo = 1.6;
        lightRate = 30;
        if (this.stateTime >= S.stingTime) {
          this.events.push('stuck');
          this.enter('stuck');
        }
        break;
      }
      case 'stuck':
        tailTo = { ahead: this.aimDist, up: 0.06 };
        tailRate = 40;
        lightTo = 0.45;
        lightRate = 4;
        if (this.stateTime >= this.stuckTime) {
          this.recoverTime = S.recover;
          this.enter('recover');
        }
        break;
      case 'snapWind':
        // (It does not turn as its claws open: they shut on where its front was when it began.)
        clawTo = 1;
        if (this.stateTime >= S.snapWind) {
          this.spent = false;
          this.snapWait = S.snapCooldown;
          this.events.push('snap');
          this.enter('snap');
        }
        break;
      case 'snap':
        clawTo = -1;
        if (this.stateTime >= S.snapTime) {
          this.recoverTime = S.snapRecover;
          this.enter('recover');
        }
        break;
      case 'recover':
        if (this.stateTime >= this.recoverTime) {
          if (reachable) stalk(this.between(S.wait));
          else this.enter('return');
        }
        break;
      case 'stagger':
        lightTo = 0.4;
        tailRate = 14;
        if (this.stateTime >= S.stagger) {
          if (reachable) stalk(this.between(S.wait) * 0.5);
          else this.enter('return');
        }
        break;
      case 'douse':
        // Lamp out; away, quick, its tail tucked.
        lightTo = 0;
        lightRate = 40;
        tailTo = S.tucked;
        tailRate = 16;
        moveX = this.dashX * S.douseSpeed;
        moveZ = this.dashZ * S.douseSpeed;
        this.facing = turnToward(this.facing, Math.atan2(this.dashX, this.dashZ), S.turnRate * 3 * dt);
        if (this.stateTime >= S.douseTime) this.enter('dark');
        break;
      case 'dark': {
        // Unlit, it comes round him; it does nothing else until its lamp is lit again.
        lightTo = 0;
        lightRate = 40;
        tailTo = S.tucked;
        this.facing = turnToward(this.facing, toPlayer + this.circleDir * 1.2, S.turnRate * 2 * dt);
        if (reachable) {
          const drift = Math.max(-1, Math.min(1, (dist - S.darkRing) * 1.2));
          moveX = Math.cos(toPlayer) * S.darkSpeed * this.circleDir + Math.sin(toPlayer) * S.darkSpeed * drift;
          moveZ = -Math.sin(toPlayer) * S.darkSpeed * this.circleDir + Math.cos(toPlayer) * S.darkSpeed * drift;
        }
        if (this.stateTime >= S.dark) {
          this.events.push('relight');
          if (reachable) stalk(this.between(S.relightWait));
          else this.enter('return');
        }
        break;
      }
      case 'sprawl':
        lightTo = 0.25;
        tailTo = S.limp;
        tailRate = 10;
        clawTo = 1;
        if (this.stateTime >= S.sprawl) {
          this.hitsRun = 0;
          this.recoverTime = S.recover;
          this.enter('recover');
        }
        break;
      case 'return': {
        if (reachable && (this.hunt || dist < S.noticeRange * SENSES.notice)) {
          stalk(this.between(S.wait));
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
        lightTo = 0;
        lightRate = 3;
        tailTo = S.limp;
        tailRate = 6;
        clawTo = 1;
        if (this.respawns && this.stateTime >= S.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.facing = this.home.facing;
          this.hp = S.hp;
          this.velX = 0;
          this.velZ = 0;
          this.age = 0;
          this.lastSwing = -1;
          this.hitsRun = 0;
          this.enter('idle');
        }
        break;
    }

    // Its tail, lamp and claws go to where the state wants them.
    if (tailRate > 0) {
      const k = 1 - Math.exp(-tailRate * dt);
      this.tail.ahead += (tailTo.ahead - this.tail.ahead) * k;
      this.tail.up += (tailTo.up - this.tail.up) * k;
    }
    this.light += (lightTo - this.light) * (1 - Math.exp(-lightRate * dt));
    this.claw += (clawTo - this.claw) * (1 - Math.exp(-(clawTo < 0 ? 60 : 14) * dt));

    // Knockback slides to a stop.
    const drag = Math.exp(-9 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    const wantX = (Math.sin(this.facing) * speed + moveX + this.velX) * dt;
    const wantZ = (Math.cos(this.facing) * speed + moveZ + this.velZ) * dt;
    this.x += wantX;
    this.z += wantZ;
    this.clamp();
    const went = Math.hypot(this.x - this.fromX, this.z - this.fromZ);
    this.moving = dt > 0 ? went / dt : 0;
    // Sidling into a wall or the edge of its patch, it turns and goes round the other way.
    if ((this.state === 'stalk' || this.state === 'dark') && went < Math.hypot(wantX, wantZ) * 0.4) this.circleDir = -this.circleDir;
  }
}
