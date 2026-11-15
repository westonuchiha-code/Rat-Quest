import type { BodyPart, CanStand, HitHow, WallAt } from './foe';

/**
 * The Sump Wyrm: the great centipede under the Cistern, and a boss. A head with a pair of hooked fangs, and a long
 * armoured body of segments behind it that goes exactly where the head went. All of it is solid (he cannot walk through
 * it, though he can jump it) and all of it can be hit; but its head, while it is helpless, is where it really hurts.
 *
 *   - It prowls round him in a ring, the body trailing after, and comes in when it means to do something.
 *   - The bite: up close its head rears, then snaps forward. One heart; a shield stops it; a perfect guard throws its
 *     head back, reeling and helpless.
 *   - The charge: from further off it rears and screams, then runs dead straight, fast. Two hearts, and a shield does
 *     not stop it: get out of its line. If it meets a wall it stuns itself, head on the floor: the big opening.
 *   - The lash: strike its tail, or hang about it while the thing is slow, and the two long spurs come up and whip
 *     round along the floor. Jump it. (Its tail going past him as it crawls is nothing to worry about.)
 *   - Below half its health it is angry: faster, two bites, and two charges running (the first wall only turns it:
 *     it is the second that stuns it), and the coil. It runs a ring round where
 *     he stands until its head meets its tail, rears over him, and tightens. Jump out over its body before it does; then
 *     it lies there wound up and spent.
 */
export type WyrmState =
  | 'idle' | 'roar' | 'prowl'
  | 'biteWind' | 'bite' | 'recover' | 'reel'
  | 'chargeWind' | 'charge' | 'stunned' | 'skid'
  | 'whipWind' | 'whip' | 'settle'
  | 'coil' | 'coilWind' | 'squeeze' | 'spent'
  | 'dead';

export const WYRM = {
  hp: 32,
  radius: 0.62, // its head
  segments: 13,
  segRadius: 0.5,
  spacing: 0.85,
  noticeRange: 14,
  roar: 1.4,
  speed: 4.6,
  turnRate: 2.4,
  orbit: 5.5, // it circles him about this far off
  wait: [0.9, 1.7] as [number, number],
  // The bite.
  biteRange: 3.0,
  biteAim: 0.5,
  biteWind: 0.55,
  biteTrack: 0.6,
  biteTime: 0.14,
  biteLunge: 9, // how fast its head goes forward in the snap
  biteReach: 1.1,
  biteArc: 0.6,
  biteDamage: 1,
  secondBite: 0.32, // angry: the wind-up of the second snap
  recover: 0.75,
  reel: 1.8,
  // The charge.
  chargeRange: [4.5, 30] as [number, number], // (from the ring it prowls in, it can)
  chargeAim: 0.35,
  chargeChance: 0.6, // far enough off, how often it charges rather than coming in to bite
  chargeWind: 0.85,
  chargeTrack: 0.65,
  chargeSpeed: 14,
  chargeMax: 44, // how far it runs if nothing stops it (in any room of a sensible size, a wall does)
  chargeReach: 0.7,
  chargeArc: 0.8,
  chargeDamage: 2,
  stunned: 2.6,
  skid: 0.9,
  secondCharge: 0.55, // angry: the wind-up of the second charge
  // The lash.
  tailParts: 4, // this many of its last segments are its tail
  tailRange: 2.3,
  tailTime: 0.7, // how long he may hang about there (while it is slow: crawling past him does not count)
  tailSlow: 2.5, // slower than this, it minds him at its tail
  whipWind: 0.5,
  whipTime: 0.24,
  whipReach: 2.4,
  whipDamage: 1,
  settle: 0.5,
  whipCooldown: 2.6,
  /** A blow on its head while it is helpless (stunned, reeling or spent) does this many times the harm. */
  soft: 2,
  // Angry.
  rageAt: 0.5,
  rageSpeed: 1.25,
  rageWait: 0.6,
  // The coil.
  coilEvery: [9, 13] as [number, number],
  coilFrom: 10, // he must be this near for it to start
  coilRadius: 1.85,
  coilSpeed: 9.5,
  coilTurn: 7, // how sharply it can turn while it winds
  coilTurns: 1.08, // how far round it goes: a little past a full ring
  coilGiveUp: 5,
  coilWind: 0.65,
  squeezeTime: 0.3,
  squeezeTo: 1.2,
  squeezeDamage: 2,
  spent: 2.3,
};

/** How thick segment `i` is, against the first: it tapers to its tail. (What is drawn and what is solid both use this.) */
export function wyrmTaper(i: number): number {
  const k = i / Math.max(1, WYRM.segments - 1);
  return 1 - 0.24 * k * k;
}

/** The tightest ring its head can crawl in: it turns by crawling, as a long thing must, so its body never curls onto itself. */
const MIN_TURN = 1.2;
/** Stopped, its head can swing where it is, but never further round than this from the way its neck lies. */
const NECK_SWING = 1.9;
/**
 * How far its head may turn against any part of its own body: three quarters of a ring, a hook it can still back its
 * head out of, and never a whole ring (the coil apart, which is the point of it).
 */
const WIND = 4.5;
/** With no way on it backs up along its own path: this far, this fast. (Its path is remembered that much past its tail, and more.) */
const BACK_FAR = 2.4;
const BACK_SPEED = 3.6;
const SPARE = 6.5;

/** How finely its path is remembered. */
const STEP = 0.05;

function wrap(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
function turnToward(from: number, to: number, max: number): number {
  const d = wrap(to - from);
  return Math.abs(d) <= max ? to : from + Math.sign(d) * max;
}

export class Wyrm {
  readonly kind = 'wyrm' as const;
  readonly immovable = true;
  /** A boss: the game shows its name and health while it fights. */
  readonly bossName = 'The Sump Wyrm';
  /** Its head. */
  x: number;
  z: number;
  y: number;
  readonly floorY: number;
  facing = 0;
  hp: number = WYRM.hp;
  readonly maxHp: number = WYRM.hp;
  state: WyrmState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = WYRM.radius;
  rng: () => number = Math.random;
  /** What it did this tick, for sounds: 'roar', 'biteWind', 'bite', 'chargeWind', 'charge', 'ram', 'whipWind', 'whip', 'coil', 'coilWind', 'squeeze', 'rage', 'reel', 'hurt', 'crit', 'step', 'bump'. */
  readonly events: string[] = [];
  mayAttack = true;
  canStand: CanStand | null = null;
  wallAt: WallAt | null = null;

  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns = false;
  /** Its segments, head end first: where each is, and which way it points (towards the one in front). */
  readonly body: Array<{ x: number; z: number; dir: number }> = [];
  /** How long the wind-up it is in lasts. */
  windTime: number = WYRM.biteWind;
  /** How far it has crawled in all (for its legs). */
  crawled = 0;
  /** Angry: below half its health. */
  raging = false;
  /** The middle of its coil, while it winds, tightens and lies spent. */
  coilAt = { x: 0, z: 0 };
  /** How far the coil has tightened: 1 its full ring .. squeezeTo / coilRadius. */
  coilTight = 1;
  private readonly trail: Array<{ x: number; z: number }> = [];
  private readonly partList: BodyPart[] = [];
  private spent = false;
  private waitLeft = 0;
  private intent: 'bite' | 'charge' | null = null;
  private intentFor = 0;
  private side: 1 | -1 = 1;
  private again = 0; // attacks still to come in a run of two
  /** How long it has been stopped with no way on. */
  private stuckFor = 0;
  private ran = 0;
  private tailFor = 0;
  private tailStruck = false;
  /** After a lash it goes on with what it meant to do. */
  private resume = false;
  private whipCool = 0;
  private coilIn = 0;
  private wound = 0;
  private lastAngle = 0;
  private stepIn = 0;

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; facing?: number }) {
    this.arena = spec.arena ?? { x0: spec.x - 18, x1: spec.x + 18, z0: spec.z - 18, z1: spec.z + 18 };
    this.x = spec.x;
    this.z = spec.z;
    this.floorY = spec.y ?? 0;
    this.y = this.floorY;
    this.facing = spec.facing ?? 0;
    // Asleep it lies curled: its body laid out behind its head round a lazy ring (kept inside its floor).
    const n = WYRM.segments * Math.round(WYRM.spacing / STEP) + 2 + Math.round(SPARE / STEP);
    const A = this.arena;
    let px = this.x;
    let pz = this.z;
    let dir = this.facing + Math.PI;
    for (let k = 0; k < n; k++) {
      this.trail.push({ x: px, z: pz });
      dir += STEP / 2.3;
      px = Math.max(A.x0 + WYRM.segRadius, Math.min(A.x1 - WYRM.segRadius, px + Math.sin(dir) * STEP));
      pz = Math.max(A.z0 + WYRM.segRadius, Math.min(A.z1 - WYRM.segRadius, pz + Math.cos(dir) * STEP));
    }
    for (let i = 0; i < WYRM.segments; i++) {
      this.body.push({ x: 0, z: 0, dir: 0 });
      this.partList.push({ x: 0, z: 0, r: WYRM.segRadius * wyrmTaper(i) });
    }
    this.layBody();
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  get awake(): boolean {
    return this.state !== 'idle';
  }
  get ready(): boolean {
    return this.state === 'prowl' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    const s = this.state;
    return s === 'biteWind' || s === 'bite' || s === 'chargeWind' || s === 'charge' || s === 'whipWind' || s === 'whip' || s === 'coil' || s === 'coilWind' || s === 'squeeze';
  }
  /** Helpless: its head is soft, and nothing is coming for a while. */
  get helpless(): boolean {
    return this.state === 'stunned' || this.state === 'reel' || this.state === 'spent';
  }
  get open(): boolean {
    return this.helpless || this.state === 'recover' || this.state === 'skid' || this.state === 'settle';
  }
  /** The rest of it: every segment is solid and can be hit. */
  get parts(): ReadonlyArray<BodyPart> {
    return this.partList;
  }
  /** The end of its tail. */
  get tail(): BodyPart {
    return this.partList[this.partList.length - 1];
  }
  get attackActive(): boolean {
    if (this.spent) return false;
    if (this.state === 'bite') return this.stateTime >= WYRM.biteTime - 0.08;
    if (this.state === 'charge') return true;
    if (this.state === 'whip') return this.stateTime >= 0.04;
    return this.state === 'squeeze' && this.stateTime >= WYRM.squeezeTime - 0.1;
  }
  get bite(): { reach: number; arc: number; damage: number; heavy?: boolean; ground?: boolean; at?: BodyPart } {
    const W = WYRM;
    const s = this.state;
    // (Each wind-up answers with the shape of the blow it leads to, so the test view can draw what is coming.)
    if (s === 'whip' || s === 'whipWind') return { reach: W.whipReach, arc: Math.PI, damage: W.whipDamage, ground: true, at: this.tail };
    // The coil catches whoever is still standing inside the ring.
    if (s === 'coil' || s === 'coilWind' || s === 'squeeze') return { reach: W.coilRadius - 0.3, arc: Math.PI, damage: W.squeezeDamage, heavy: true, ground: true, at: { x: this.coilAt.x, z: this.coilAt.z, r: 0 } };
    if (s === 'charge' || s === 'chargeWind') return { reach: W.chargeReach, arc: W.chargeArc, damage: W.chargeDamage, heavy: true };
    return { reach: W.biteReach, arc: W.biteArc, damage: W.biteDamage };
  }
  /** How fast it is going (for its legs). */
  get moving(): number {
    return this.speedNow;
  }
  private speedNow = 0;

  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  private enter(s: WyrmState): void {
    this.state = s;
    this.stateTime = 0;
  }
  private nextWait(): number {
    return this.between(WYRM.wait) * (this.raging ? WYRM.rageWait : 1);
  }

  /**
   * Every blow lands, wherever on it. On its head while it is helpless it counts double. `part`: which segment was
   * struck (-1 or nothing: its head).
   */
  takeHit(damage: number, _fromX: number, _fromZ: number, _how: HitHow = 'sword', part = -1): boolean {
    if (!this.alive) return false;
    const soft = part < 0 && this.helpless;
    this.hp -= damage * (soft ? WYRM.soft : 1);
    if (this.hp <= 0) {
      this.hp = 0;
      this.speedNow = 0;
      this.enter('dead');
      return true;
    }
    this.events.push(soft ? 'crit' : 'hurt');
    if (part >= this.partList.length - WYRM.tailParts) this.tailStruck = true;
    if (!this.raging && this.hp <= this.maxHp * WYRM.rageAt) {
      this.raging = true;
      this.events.push('rage');
      this.coilIn = 2.5; // the coil comes soon after
    }
    if (this.state === 'idle') this.wake();
    return false;
  }

  /** A blow reached the rat. A bite turned by a perfect guard throws its head back, reeling. */
  lungeLanded(_blocked: boolean, parried = false): void {
    this.spent = true;
    if (parried && this.state === 'bite') {
      this.again = 0;
      this.events.push('reel');
      this.enter('reel');
    }
  }

  nudge(_dx: number, _dz: number): void {}

  /** It has seen him: it rears and screams, then the fight is on. */
  wake(): void {
    if (this.state !== 'idle') return;
    this.events.push('roar');
    this.waitLeft = 0.6;
    this.coilIn = this.between(WYRM.coilEvery);
    this.enter('roar');
  }

  /** Whether its head can be at (x, z): on its floor, with no wall there. */
  private clear(x: number, z: number): boolean {
    const A = this.arena;
    const r = this.radius;
    if (x < A.x0 + r || x > A.x1 - r || z < A.z0 + r || z > A.z1 - r) return false;
    if (this.wallAt?.(x, this.floorY, z, r)) return false;
    return !this.canStand || this.canStand(x, this.floorY, z, r * 0.6);
  }

  /**
   * The segment of its own body that its head would run into at (x, z), or -1. Its head never crosses its own body
   * (so no part of it ever lies through another part): the first few segments, which are its neck, do not count.
   */
  private ownBody(x: number, z: number): number {
    const t = this.trail;
    const per = Math.round(WYRM.spacing / STEP);
    // (Its segments come on as its head does: it is where they will be that counts, or a head winding in on itself
    // gets nearer its own body with every step and is never once seen to move towards it.)
    const k = Math.floor(Math.hypot(x - t[0].x, z - t[0].z) / STEP);
    for (let i = 3; i < this.partList.length; i++) {
      const q = this.partList[i];
      const then = t[Math.max(0, (i + 1) * per - k)];
      const near = this.radius + q.r;
      const d = Math.hypot(x - then.x, z - then.z);
      // (Only if going there brings it nearer: a head already beside its body can always move away.)
      if (d < near && d < Math.hypot(this.x - q.x, this.z - q.z) - 1e-6) return i;
    }
    return -1;
  }
  /** Which segment of its own body stopped its head last (-1: none did). */
  private selfHit = -1;
  /** How fast it was going a moment ago: that is what lets it turn. */
  private lastSpeed = 0;
  /** How much its head may still swing where it is, in this wind-up. */
  private swivel = 0;
  private tick = 1 / 60;

  /**
   * Turns its head towards `to`, at up to `rate`: as far as its crawling lets it (a ring no tighter than MIN_TURN), and,
   * in a wind-up, a little more where it stands. `where`: a turn made standing still to get out of a corner.
   */
  private turn(to: number, rate: number, where = false, winding = false): void {
    const dt = this.tick;
    const byCrawl = (this.lastSpeed * dt) / MIN_TURN;
    const inPlace = where ? rate * dt : this.swivel;
    const before = this.facing;
    const most = Math.min(rate * dt, byCrawl + inPlace);
    let next = turnToward(this.facing, to, most);
    if (!winding) {
      // Just backed out of a dead end, it turns the other way to the one that took it in, whatever it is after.
      if (this.roundFor > 0 && !where) {
        this.roundFor -= dt;
        next = before + this.roundWay * most;
      }
      // It never curls right round onto itself (see WIND): at that it goes straight on until its tail has come round.
      const [lo, hi] = this.windRoom();
      const d = wrap(next - before);
      next = before + (d > hi ? hi : d < lo ? lo : d);
    }
    const used = Math.abs(wrap(next - before));
    if (used > byCrawl + 1e-9) {
      // Swinging where it is: not past what its neck allows.
      const neck = this.body[0].dir;
      const off = wrap(next - neck);
      if (Math.abs(off) > NECK_SWING && Math.abs(off) > Math.abs(wrap(before - neck))) next = Math.abs(wrap(before - neck)) > NECK_SWING ? before : neck + Math.sign(off) * NECK_SWING;
      if (!where) this.swivel = Math.max(0, this.swivel - Math.max(0, Math.abs(wrap(next - before)) - byCrawl));
    }
    this.facing = next;
  }
  /** Which way it turns after backing out of a dead end, and for how much longer. */
  private roundWay: 1 | -1 = 1;
  private roundFor = 0;
  /** How far it still has to back up. */
  private backing = 0;

  /** How its body is curled just behind its head: more than 0 to the left, less to the right. */
  private curl(): number {
    let acc = wrap(this.facing - this.body[0].dir);
    for (let i = 1; i <= 5; i++) acc += wrap(this.body[i - 1].dir - this.body[i].dir);
    return acc;
  }

  /** Moves its head back `d` along the path it came by, its body going back before it. */
  private retreat(d: number): void {
    const t = this.trail;
    const A = this.arena;
    const m = WYRM.segRadius;
    let left = d;
    while (left > 1e-9) {
      const to = t[0];
      const gap = Math.hypot(this.x - to.x, this.z - to.z);
      if (gap > left) {
        this.x += ((to.x - this.x) * left) / gap;
        this.z += ((to.z - this.z) * left) / gap;
        break;
      }
      this.x = to.x;
      this.z = to.z;
      left -= gap;
      t.shift();
      // (What lay past the end of what it remembers is made up: straight on, and inside its floor.)
      const a = t[t.length - 1];
      const b = t[t.length - 2];
      const len = Math.hypot(a.x - b.x, a.z - b.z) || 1;
      t.push({ x: Math.max(A.x0 + m, Math.min(A.x1 - m, a.x + ((a.x - b.x) / len) * STEP)), z: Math.max(A.z0 + m, Math.min(A.z1 - m, a.z + ((a.z - b.z) / len) * STEP)) });
    }
    this.crawled -= d;
    // Its head comes back into line with its neck as it goes.
    if (Math.hypot(t[0].x - t[2].x, t[0].z - t[2].z) > 1e-4) this.facing = turnToward(this.facing, Math.atan2(t[0].x - t[2].x, t[0].z - t[2].z), 5 * this.tick);
  }

  /**
   * How much further its head may turn each way, [right, left], before it is curled onto itself: its heading is never
   * more than WIND away from that of any segment behind it, counted along its body. (Curled right round, its head
   * would be shut inside a ring of itself, and there is no way out of that without going through its own body.)
   */
  private windRoom(): [number, number] {
    let acc = wrap(this.facing - this.body[0].dir);
    let most = Math.max(0, acc);
    let least = Math.min(0, acc);
    for (let i = 1; i < this.body.length; i++) {
      acc += wrap(this.body[i - 1].dir - this.body[i].dir);
      if (acc > most) most = acc;
      if (acc < least) least = acc;
    }
    return [Math.min(0, -WIND - least), Math.max(0, WIND - most)];
  }

  /** Moves its head `d` the way it faces (as far as it can go), laying its path down behind it. Returns false if it was stopped. */
  private advance(d: number): boolean {
    if (d <= 0) return true;
    const nx = this.x + Math.sin(this.facing) * d;
    const nz = this.z + Math.cos(this.facing) * d;
    this.selfHit = -1;
    if (!this.clear(nx, nz)) return false;
    this.selfHit = this.ownBody(nx, nz);
    if (this.selfHit >= 0) return false;
    this.x = nx;
    this.z = nz;
    this.crawled += d;
    const t = this.trail;
    let from = t[0];
    let gap = Math.hypot(this.x - from.x, this.z - from.z);
    while (gap >= STEP) {
      const k = STEP / gap;
      from = { x: from.x + (this.x - from.x) * k, z: from.z + (this.z - from.z) * k };
      t.unshift(from);
      t.pop();
      gap -= STEP;
    }
    return true;
  }

  /** Puts each segment on the path, the right distance behind the one in front. */
  private layBody(): void {
    const per = Math.round(WYRM.spacing / STEP);
    let px = this.x;
    let pz = this.z;
    for (let i = 0; i < this.body.length; i++) {
      const at = this.trail[Math.min(this.trail.length - 1, (i + 1) * per)];
      const b = this.body[i];
      b.x = at.x;
      b.z = at.z;
      if (Math.hypot(px - at.x, pz - at.z) > 1e-4) b.dir = Math.atan2(px - at.x, pz - at.z);
      this.partList[i].x = at.x;
      this.partList[i].z = at.z;
      px = at.x;
      pz = at.z;
    }
  }

  /** Steers its head so as to go round (cx, cz) at `ring` off, the way it is circling. Returns how far off the ring it is. */
  private circle(cx: number, cz: number, ring: number, rate: number, winding = false): number {
    const dx = cx - this.x;
    const dz = cz - this.z;
    const d = Math.hypot(dx, dz);
    const to = Math.atan2(dx, dz);
    // Outside the ring it spirals in, inside it spirals out, on it it goes round.
    const a = Math.PI / 2 - Math.max(-1, Math.min(1, (d - ring) / Math.max(1, ring * 0.5))) * 1.25;
    this.turn(to + this.side * a, rate, false, winding);
    return d - ring;
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const W = WYRM;
    this.tick = dt;
    this.lastSpeed = this.speedNow;
    this.stateTime += dt;
    this.age += dt;
    this.whipCool = Math.max(0, this.whipCool - dt);
    const A = this.arena;
    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const off = Math.abs(wrap(toPlayer - this.facing));
    const there = playerAlive && playerX > A.x0 - 1 && playerX < A.x1 + 1 && playerZ > A.z0 - 1 && playerZ < A.z1 + 1;
    const level = Math.abs(playerY - this.floorY) < 1.6;
    const fast = this.raging ? W.rageSpeed : 1;
    this.speedNow = 0;
    const go = (speed: number): boolean => {
      this.speedNow = speed;
      if (this.advance(speed * dt)) {
        if (speed > 0) this.stuckFor = 0;
        return true;
      }
      this.speedNow = 0;
      return false;
    };
    /**
     * Stopped, by a wall or by its own body: it swings its head to the nearest way that is open, as far as its neck
     * allows and never so as to curl further onto itself. From a wall it tries towards the middle of its floor first,
     * from its own body away from the segment in its way. (Simply turning the short way towards the middle is not
     * enough: run into a wall at a slant, that can end with its neck at full stretch and its head still on the wall.)
     */
    const wayOut = (): void => {
      const mid = Math.atan2((A.x0 + A.x1) / 2 - this.x, (A.z0 + A.z1) / 2 - this.z);
      let first: 1 | -1 = wrap(mid - this.facing) >= 0 ? 1 : -1;
      if (this.selfHit >= 0) {
        const q = this.partList[this.selfHit];
        first = Math.sin(Math.atan2(q.x - this.x, q.z - this.z) - this.facing) >= 0 ? -1 : 1;
      }
      const [lo, hi] = this.windRoom();
      const neck = this.body[0].dir;
      const ahead = this.radius * 0.6;
      this.stuckFor += dt;
      for (let a = 0.15; a <= Math.PI; a += 0.15) {
        for (const sd of [first, -first]) {
          const d = sd * a;
          if (d > hi + 1e-6 || d < lo - 1e-6) continue;
          const c = this.facing + d;
          if (Math.abs(wrap(c - neck)) > NECK_SWING) continue;
          const nx = this.x + Math.sin(c) * ahead;
          const nz = this.z + Math.cos(c) * ahead;
          if (!this.clear(nx, nz) || this.ownBody(nx, nz) >= 0) continue;
          // (A moment's swinging about is allowed it; longer than that and it is getting nowhere.)
          if (this.stuckFor < 0.5) {
            this.facing = turnToward(this.facing, c, W.turnRate * 2.5 * dt);
            return;
          }
        }
      }
      // No way on, between the wall and itself: it backs up the way it came, and then turns the other way.
      const curl = this.curl();
      this.roundWay = Math.abs(curl) > 0.25 ? (curl > 0 ? -1 : 1) : first;
      this.backing = BACK_FAR;
      this.stuckFor = 0;
    };
    const turnFromSelf = (): boolean => {
      if (this.selfHit < 0) return false;
      wayOut();
      return true;
    };
    const turnFromWall = wayOut;
    const after = (): void => {
      this.waitLeft = this.nextWait();
      this.intent = null;
      this.enter('prowl');
    };

    // He is at its tail: the lash, whatever else it had in mind (but not while it is busy or helpless). Struck there
    // it lashes at once; otherwise he has to hang about, and only while it is slow (its tail trailing past him as it
    // crawls is no reason).
    if ((this.state === 'prowl' || this.state === 'recover' || this.state === 'skid') && there && level) {
      let near = false;
      for (let i = this.partList.length - W.tailParts; i < this.partList.length; i++) {
        const q = this.partList[i];
        if (Math.hypot(playerX - q.x, playerZ - q.z) < W.tailRange) near = true;
      }
      this.tailFor = near && this.lastSpeed < W.tailSlow ? this.tailFor + dt : Math.max(0, this.tailFor - dt * 2);
      if ((this.tailFor >= W.tailTime || (this.tailStruck && near)) && this.whipCool <= 0) {
        this.tailFor = 0;
        this.resume = this.state === 'prowl';
        this.events.push('whipWind');
        this.enter('whipWind');
      }
    }
    this.tailStruck = false;

    if (this.backing > 0 && (this.state === 'prowl' || this.state === 'coil')) {
      const d = Math.min(this.backing, BACK_SPEED * dt);
      this.retreat(d);
      this.backing -= d;
      this.speedNow = BACK_SPEED;
      if (this.backing <= 0) this.roundFor = 0.8;
      if (this.state === 'coil' && this.stateTime >= W.coilGiveUp) after();
      this.layBody();
      this.y = this.floorY;
      return;
    }

    switch (this.state) {
      case 'idle':
        if (there && dist < W.noticeRange) this.wake();
        break;
      case 'roar':
        if (this.stateTime >= W.roar) this.enter('prowl');
        break;
      case 'prowl': {
        if (!there) break; // he is dead or gone: it lies where it is
        this.waitLeft -= dt;
        if (this.raging) this.coilIn -= dt;
        // What it means to do next, once it has waited.
        if (this.waitLeft <= 0 && this.mayAttack && !this.intent) {
          if (this.raging && this.coilIn <= 0 && dist <= W.coilFrom && level) {
            this.coilIn = this.between(W.coilEvery);
            const m = W.coilRadius + W.segRadius + 0.3;
            this.coilAt = { x: Math.max(A.x0 + m, Math.min(A.x1 - m, playerX)), z: Math.max(A.z0 + m, Math.min(A.z1 - m, playerZ)) };
            this.coilTight = 1;
            this.wound = 0;
            this.lastAngle = Math.atan2(this.x - this.coilAt.x, this.z - this.coilAt.z);
            // It winds the way that needs the least turning.
            this.side = wrap(Math.atan2(this.coilAt.x - this.x, this.coilAt.z - this.z) - this.facing) > 0 ? -1 : 1;
            this.events.push('coil');
            this.enter('coil');
            break;
          }
          this.intent = dist >= W.chargeRange[0] && this.rng() < W.chargeChance ? 'charge' : 'bite';
          this.intentFor = 0;
        }
        if (this.intent) {
          // It comes round to face him (crawling, in as tight a ring as it can), and does it when it can.
          // (Its patience runs out slowly while it is still crawling up to him for a bite: only beside him, and not
          // able to get its head round to him, does it soon think again.)
          this.intentFor += this.intent === 'bite' && dist > W.biteRange + 2.5 ? dt * 0.4 : dt;
          this.turn(toPlayer, W.turnRate * 1.6);
          if (this.intent === 'charge' && off <= W.chargeAim && dist >= W.chargeRange[0] * 0.7 && dist <= W.chargeRange[1]) {
            this.windTime = this.again > 0 ? W.secondCharge : W.chargeWind;
            if (this.again > 0) this.again--;
            else this.again = this.raging ? 1 : 0;
            this.swivel = 0.6;
            this.events.push('chargeWind');
            this.enter('chargeWind');
            break;
          }
          if (this.intent === 'bite' && level && off <= W.biteAim && dist <= W.biteRange) {
            this.again = this.raging ? 1 : 0;
            this.windTime = W.biteWind;
            this.swivel = 0.6;
            this.events.push('biteWind');
            this.enter('biteWind');
            break;
          }
          // He will not be caught up with, or he is in under its chin where it cannot turn to him: it thinks again
          // (off round its ring, or into a charge if he has got far enough away).
          if (this.intentFor > (this.intent === 'bite' ? 2.6 : 5)) {
            this.again = 0;
            this.intent = null;
            this.waitLeft = 0.5;
          } else if (this.intent === 'charge' && this.again === 0 && dist < W.chargeRange[0] * 0.7) this.intent = 'bite';
          if (!go(W.speed * fast * (this.intent === 'charge' ? 0.8 : 1)) && !turnFromSelf()) turnFromWall();
        } else {
          // Round him in a ring; near a wall it bears back towards the middle.
          const edge = 2.4;
          if (this.x < A.x0 + edge || this.x > A.x1 - edge || this.z < A.z0 + edge || this.z > A.z1 - edge) this.turn(Math.atan2((A.x0 + A.x1) / 2 - this.x, (A.z0 + A.z1) / 2 - this.z), W.turnRate * 1.6);
          else this.circle(playerX, playerZ, W.orbit, W.turnRate);
          if (!go(W.speed * fast) && !turnFromSelf()) {
            this.side = this.side === 1 ? -1 : 1;
            turnFromWall();
          }
        }
        this.stepIn -= dt;
        if (this.speedNow > 1 && this.stepIn <= 0) {
          this.stepIn = 0.11;
          this.events.push('step');
        }
        break;
      }
      case 'biteWind':
        if (this.stateTime < this.windTime * W.biteTrack) this.turn(toPlayer, W.turnRate * 1.6);
        if (this.stateTime >= this.windTime) {
          this.spent = false;
          this.events.push('bite');
          this.enter('bite');
        }
        break;
      case 'bite':
        go(W.biteLunge);
        if (this.stateTime >= W.biteTime) {
          if (this.again > 0) {
            this.again--;
            this.windTime = W.secondBite;
            this.swivel = 0.4;
            this.events.push('biteWind');
            this.enter('biteWind');
          } else this.enter('recover');
        }
        break;
      case 'recover':
        if (this.stateTime >= W.recover) after();
        break;
      case 'reel':
        if (this.stateTime >= W.reel) after();
        break;
      case 'chargeWind':
        if (this.stateTime < this.windTime * W.chargeTrack) this.turn(toPlayer, W.turnRate * 1.5);
        if (this.stateTime >= this.windTime) {
          this.spent = false;
          this.ran = 0;
          this.events.push('charge');
          this.enter('charge');
        }
        break;
      case 'charge': {
        const d = W.chargeSpeed * dt;
        if (!go(W.chargeSpeed)) {
          if (this.selfHit >= 0) {
            // Its own body is in the way: it pulls up short.
            this.again = 0;
            this.enter('skid');
            break;
          }
          // It has run its head into a wall. Angry, with a second charge still in it, that only turns it round.
          if (this.again > 0) {
            this.events.push('bump');
            this.enter('skid');
            break;
          }
          this.events.push('ram');
          this.enter('stunned');
          break;
        }
        this.ran += d;
        if (this.ran >= W.chargeMax) this.enter('skid');
        break;
      }
      case 'stunned':
        if (this.stateTime >= W.stunned) after();
        break;
      case 'skid': {
        // It slows to a stop. Angry, it then comes straight round for a second charge.
        const k = Math.max(0, 1 - this.stateTime / W.skid);
        go(W.chargeSpeed * 0.5 * k * k);
        if (this.stateTime >= W.skid) {
          if (this.again > 0 && there) {
            this.intent = 'charge';
            this.intentFor = 0;
            this.waitLeft = 0;
            this.enter('prowl');
          } else after();
        }
        break;
      }
      case 'whipWind':
        if (this.stateTime >= W.whipWind) {
          this.spent = false;
          this.events.push('whip');
          this.enter('whip');
        }
        break;
      case 'whip':
        if (this.stateTime >= W.whipTime) {
          this.whipCool = W.whipCooldown;
          this.enter('settle');
        }
        break;
      case 'settle':
        if (this.stateTime >= W.settle) {
          // It goes on with whatever it was about (a lash is no reason to forget a charge it meant to make).
          if (this.resume) this.enter('prowl');
          else after();
        }
        break;
      case 'coil': {
        // Round and round where he stood, until its head has gone a little more than once about.
        const out = this.circle(this.coilAt.x, this.coilAt.z, W.coilRadius, W.coilTurn, true);
        // (Its head comes round to its own tail and stops against it: that closes the ring.)
        const met = !go(W.coilSpeed) && this.selfHit >= 0 && this.wound > Math.PI * 1.6;
        if (!met && this.speedNow === 0 && !turnFromSelf()) turnFromWall();
        const ang = Math.atan2(this.x - this.coilAt.x, this.z - this.coilAt.z);
        if (Math.abs(out) < 0.7) this.wound += Math.abs(wrap(ang - this.lastAngle));
        this.lastAngle = ang;
        if (met || this.wound >= W.coilTurns * Math.PI * 2) {
          this.speedNow = 0;
          this.events.push('coilWind');
          this.enter('coilWind');
        } else if (this.stateTime >= W.coilGiveUp) after();
        break;
      }
      case 'coilWind':
        if (this.stateTime >= W.coilWind) {
          this.spent = false;
          this.events.push('squeeze');
          this.enter('squeeze');
        }
        break;
      case 'squeeze': {
        // The ring tightens: every piece of it is drawn in towards the middle.
        const to = W.squeezeTo / W.coilRadius;
        const want = 1 + (to - 1) * Math.min(1, this.stateTime / W.squeezeTime);
        const k = want / this.coilTight;
        this.coilTight = want;
        const pull = (p: { x: number; z: number }): void => {
          p.x = this.coilAt.x + (p.x - this.coilAt.x) * k;
          p.z = this.coilAt.z + (p.z - this.coilAt.z) * k;
        };
        for (const p of this.trail) pull(p);
        pull(this);
        if (this.stateTime >= W.squeezeTime) this.enter('spent');
        break;
      }
      case 'spent': {
        // Its grip goes slack: the ring eases back out to where it was wound (so it uncoils from a ring that is not
        // squeezed into itself), and then it lies there getting its breath.
        const u = Math.max(0, Math.min(1, (this.stateTime - 0.35) / 0.9));
        const to = W.squeezeTo / W.coilRadius;
        const want = to + (1 - to) * u * u * (3 - 2 * u);
        if (want !== this.coilTight) {
          const k = want / this.coilTight;
          this.coilTight = want;
          for (const p of this.trail) {
            p.x = this.coilAt.x + (p.x - this.coilAt.x) * k;
            p.z = this.coilAt.z + (p.z - this.coilAt.z) * k;
          }
          this.x = this.coilAt.x + (this.x - this.coilAt.x) * k;
          this.z = this.coilAt.z + (this.z - this.coilAt.z) * k;
        }
        if (this.stateTime >= W.spent) after();
        break;
      }
      case 'dead':
        break;
    }
    this.layBody();
    this.y = this.floorY;
  }
}
