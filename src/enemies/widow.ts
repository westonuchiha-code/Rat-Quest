import type { BodyPart, CanStand, HitHow } from './foe';

/**
 * The Widow: the boss in the dark at the bottom of the Long Drop. She is far too big for the room. She sits beyond the
 * edge of the light and never comes into it: only her head, her jaws and her four front legs do.
 *
 * The owner, 2026-11-16: "it's actually so big that he doesn't even really fit in the arena it's just like a giant
 * spider's head connected to a body that goes into the darkness and then you have to deal with like his front four
 * legs and ... he has mandibles and his front four legs and he'll like slam down one side of the field and sweep
 * across and then slam down the other side of the field and sweep across or he'll like bite down on certain parts of
 * the field and you have to like Dodge all his attacks."
 *
 * Everything she does says what it is before it comes, and each blow leaves a piece of her in the light to be hit:
 * Her legs are a spider's legs, not long enough to cross the room: what crosses it is the POISON they fling. (The
 * owner, the same day, of the first version, whose legs reached right across the floor: "it's like a big pillar ...
 * it doesn't really look like one of the legs ... make it have like a poison on it or something and then have that
 * fling out so you can cover the whole area with like a slash of poison ... you don't have to like make the spiders
 * leg gigantic".)
 *   - The SLAM and the SWEEP: an outer leg goes up high on one side and comes down on the floor in front of her, and a
 *     SLASH OF POISON runs from it right across the room along the line he stood on (two hearts, no shield stops it:
 *     step off the line). Its foot is stuck in the floor a moment (hit it). Then it draws back and SWIPES across her
 *     front, flinging a crescent WAVE of poison that runs out over the whole floor (jump it). Then the other leg,
 *     from the other side. Angry, each leg swipes twice.
 *   - The BITE: her head rears, a ring on the floor marks the place, and she comes out of the dark and bites down on
 *     it (two hearts, no shield). Her head lies in the light for a while after: the great opening, and it takes
 *     double there. Further off than her head can come, she SPITS on the place instead: the same harm, and no
 *     opening. Angry: three, one after another.
 *   - The STAB: an inner leg spikes down on where he stands (one heart; a shield stops it), and its foot is stuck in
 *     the floor a moment. Further off than the leg can reach, it FLICKS a gob of poison onto the place instead. Two
 *     of them, one from each side; angry, four.
 *   - A perfect guard against any of it throws her down: her head falls into the light and lies there.
 * A blow on a leg counts half and one on her head double: the legs wear her down, her head is where she is beaten.
 * She does not move from her place, so everything is measured from it: `px, pz` is the edge of the light in front of
 * her, each leg turns about its own hip beside that, and angles are counted from the way she faces (+ to her left).
 */
export type WidowState =
  | 'lurk' | 'rise' | 'idle'
  | 'slamWind' | 'slam' | 'slamStuck' | 'sweepWind' | 'sweep' | 'sweepEnd'
  | 'biteWind' | 'bite' | 'biteStuck' | 'withdraw'
  | 'stabWind' | 'stab' | 'stabStuck'
  | 'reel' | 'dead';

export const WIDOW = {
  hp: 30,
  radius: 2.4, // her head
  rageAt: 0.5,
  rise: 1.9, // she wakes: this long before the first blow can start
  wait: [0.9, 1.5] as [number, number],
  waitRage: [0.45, 0.8] as [number, number],
  hurry: 0.8, // angry, a leg's wind-up is this much of its length (her bites and the stabs after the first are not hurried: there are more of them)
  back: 5.5, // how far behind the edge of the light her head waits
  hip: 3.0, // how far to each side of her middle an outer leg's hip is; an inner leg's is half that
  // The slam and the sweep.
  legLen: 27.5, // how far from a hip its slash of poison runs along the floor: right across the room
  legHalf: 0.75, // half the width of that slash
  legReach: 10.5, // how far from its hip a leg itself can reach
  slamAt: 7, // how far out along the line the leg's foot comes down, and sticks
  slamWind: 0.95,
  slamTrack: 0.6, // she follows him for this much of a wind-up, then commits
  slamAim: [-0.6, 1.25] as [number, number], // the angles a slam can come down at, counted out to its own side: it reaches well across the middle (or the lane straight in front of her would be safe from both legs)
  slamTime: 0.14,
  slamDamage: 2,
  slamStuck: 0.8,
  sweepWind: 0.4,
  waveFrom: 1.5, // the wave of poison a swipe flings starts this close to her (one standing by her has the swipe itself to jump)...
  waveSpeed: 15, // ...and runs out over the floor this fast
  waveSpeedRage: 18,
  waveBand: 0.55, // half its thickness
  sweepDamage: 1,
  sweepEnd: 0.55,
  // The bite.
  biteReach: 11, // how far from her place her head can come: beyond that, she spits
  biteR: 2.4, // (as wide as her head)
  biteWind: 1.0,
  biteTrack: 0.42, // (it stops following him sooner than a leg does: there is more of it to get out from under)
  biteTime: 0.14,
  biteDamage: 2,
  biteStuck: 1.6,
  withdraw: 0.6,
  bitesRage: 3,
  // The stab.
  stabR: 0.9,
  stabWind: 0.62,
  stabGap: 0.5, // the wind-up of each stab after the first
  stabTrack: 0.5,
  stabTime: 0.12,
  stabDamage: 1,
  stabStuck: 0.9,
  stabReach: 9.5, // how far from its hip an inner leg can stab: beyond that, it flicks poison
  spitEnd: 0.45, // after poison flung from afar, this long before the next thing
  stabs: 2,
  stabsRage: 4,
  // Thrown down by a perfect guard.
  reel: 2.4,
  reelReach: 11, // her head falls toward him, as far into the light as this...
  reelShort: 3.6, // ...and this far short of him
  headDouble: 2, // her head takes this many times a blow's harm...
  legPart: 0.5, // ...and a leg this much of it: they are armoured, and there is a lot of her
};

export class Widow {
  readonly kind = 'widow' as const;
  readonly immovable = true;
  /** A boss: the game shows her name and health while she fights. */
  readonly bossName = 'The Widow';
  /** Her head: what the sword meets when it is in the light, and where the game takes her to be. */
  x: number;
  z: number;
  /** Her floor; raised to his height while a blow from above is coming down, so that a jump is no way out of it. */
  y: number;
  readonly floorY: number;
  readonly facing: number;
  hp: number = WIDOW.hp;
  readonly maxHp: number = WIDOW.hp;
  state: WidowState = 'lurk';
  stateTime = 0;
  lastSwing = -1;
  readonly radius = WIDOW.radius;
  readonly respawns = false;
  rng: () => number = Math.random;
  canStand: CanStand | null = null;
  mayAttack = true;
  /** What she has done since the game last took them (it empties this), for sounds: 'wake', 'slamWind', 'slam', 'sweepWind', 'sweep', 'biteWind', 'bite', 'stabWind', 'stab', 'reel', 'rage', 'hurt', 'crit'. */
  readonly events: string[] = [];

  /** The edge of the light in front of her, and the middle and radius of the lit floor. */
  readonly px: number;
  readonly pz: number;
  readonly field: { x: number; z: number; r: number };
  /** Which side the slamming (or stabbing) leg is on: +1 her left, -1 her right. */
  side: 1 | -1 = 1;
  /** The angle of the line a slam's poison runs along. */
  angle = 0;
  /** How far out from her the wave of poison has run. */
  wave = 0;
  /** The stab, or the bite, is at a place too far for her leg, or her head: it is poison flung there. */
  far = false;
  /** How long the wind-up she is in lasts. */
  windTime: number = WIDOW.slamWind;
  /** Where the bite, or the stab, comes down. */
  readonly spot = { x: 0, z: 0 };
  /** Angry: below half her health. */
  raging = false;
  private spent = false;
  private waitLeft = 0;
  private turn = 0;
  private left = 0; // blows left in this run of them
  private second = false; // the second slam of a pair
  private returning = false; // a sweep coming back
  private headFrom = { x: 0, z: 0 };
  private playerD = 5;
  private playerP = 5;
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;

  /** `x, z`: the edge of the light in front of her. `facing`: the way she looks, into the room. `arena`: the square round the lit floor. */
  constructor(spec: { x: number; z: number; y?: number; facing?: number; arena?: { x0: number; x1: number; z0: number; z1: number } }) {
    this.px = spec.x;
    this.pz = spec.z;
    this.facing = spec.facing ?? 0;
    this.floorY = spec.y ?? 0;
    this.y = this.floorY;
    const a = spec.arena ?? { x0: spec.x - 13, x1: spec.x + 13, z0: spec.z - 26, z1: spec.z };
    this.field = { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2, r: (a.x1 - a.x0) / 2 };
    const home = this.home;
    this.x = home.x;
    this.z = home.z;
  }

  /** The way she faces, and her left. */
  private get fwd(): [number, number] {
    return [Math.sin(this.facing), Math.cos(this.facing)];
  }
  /** Where her head waits, back in the dark. */
  get home(): { x: number; z: number } {
    const [fx, fz] = this.fwd;
    return { x: this.px - fx * WIDOW.back, z: this.pz - fz * WIDOW.back };
  }
  /** Where a leg's hip is: `side` +1 left, -1 right; `inner` for the stabbing pair. */
  hip(side: 1 | -1, inner = false): { x: number; z: number } {
    const [fx, fz] = this.fwd;
    const off = side * WIDOW.hip * (inner ? 0.5 : 1);
    // (Her left, facing (fx, fz), is (fz, -fx).)
    return { x: this.px + fz * off, z: this.pz - fx * off };
  }
  /** The way a leg at `angle` points along the floor. */
  dirOf(angle: number): [number, number] {
    return [Math.sin(this.facing + angle), Math.cos(this.facing + angle)];
  }
  /** The angle from a hip to a place. */
  private angleTo(side: 1 | -1, x: number, z: number): number {
    const h = this.hip(side);
    const a = Math.atan2(x - h.x, z - h.z) - this.facing;
    return Math.atan2(Math.sin(a), Math.cos(a));
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** She has woken: the fight is on. */
  get awake(): boolean {
    return this.state !== 'lurk';
  }
  /** She has waited, and means to strike (the game's turn-taking asks: see director.ts). */
  get ready(): boolean {
    return this.state === 'idle' && this.waitLeft <= 0;
  }
  get attacking(): boolean {
    const s = this.state;
    return s === 'slamWind' || s === 'slam' || s === 'sweepWind' || s === 'sweep' || s === 'biteWind' || s === 'bite' || s === 'stabWind' || s === 'stab';
  }
  /** Open: a piece of her lies in the light and nothing is coming. */
  get open(): boolean {
    const s = this.state;
    return s === 'slamStuck' || ((s === 'biteStuck' || s === 'stabStuck') && !this.far) || s === 'reel';
  }
  /** Another stab, or another bite, follows this one. */
  get more(): boolean {
    return this.left > 0 && (this.state === 'stabWind' || this.state === 'stab' || this.state === 'stabStuck' || this.state === 'biteWind' || this.state === 'bite' || this.state === 'biteStuck');
  }
  /** Her head is down in the light, where the sword can get at it. */
  get headDown(): boolean {
    return (this.state === 'biteStuck' && !this.far) || this.state === 'reel';
  }
  /** A blow that comes down from above: a jump does not get him out of it. */
  private get fromAbove(): boolean {
    return this.state === 'slam' || this.state === 'bite' || this.state === 'stab';
  }
  get attackActive(): boolean {
    if (this.spent) return false;
    if (this.state === 'slam') return this.stateTime >= 0.04;
    if (this.state === 'bite') return this.stateTime >= 0.05;
    if (this.state === 'stab') return this.stateTime >= 0.04;
    // (The wave strikes only where it is: he must be in it, and on the ground.)
    return this.state === 'sweep' && Math.abs(this.playerP - this.wave) <= WIDOW.waveBand;
  }
  /** The shape of the blow she is giving, or winding up to (so a test view can draw what is coming). */
  get bite(): { reach: number; arc: number; damage: number; heavy?: boolean; ground?: boolean; at: BodyPart; from?: { x: number; z: number } } {
    const W = WIDOW;
    const s = this.state;
    // (What comes down on a place comes from her: his shield must face her, not the floor under him.)
    const from = { x: this.px, z: this.pz };
    if (s === 'biteWind' || s === 'bite' || s === 'biteStuck') return { reach: 0, arc: Math.PI, damage: W.biteDamage, heavy: true, at: { x: this.spot.x, z: this.spot.z, r: W.biteR }, from };
    if (s === 'stabWind' || s === 'stab' || s === 'stabStuck') return { reach: 0, arc: Math.PI, damage: W.stabDamage, at: { x: this.spot.x, z: this.spot.z, r: W.stabR }, from };
    // The wave: all of the floor within its outer edge (and she only lets it strike where its edge is).
    if (s === 'sweep' || s === 'sweepWind' || s === 'sweepEnd') return { reach: 0, arc: Math.PI, damage: W.sweepDamage, heavy: true, ground: true, at: { x: this.px, z: this.pz, r: this.wave + W.waveBand } };
    // The slash of poison: a strip from the leg's hip, as wide wherever he stands along it.
    const h = this.hip(this.side);
    const strip = { reach: W.legLen, arc: Math.atan2(W.legHalf, Math.max(0.8, this.playerD)), at: { x: h.x, z: h.z, r: 0 } };
    return { ...strip, damage: W.slamDamage, heavy: true };
  }
  get biteDir(): number {
    return this.facing + this.angle;
  }
  /** Where the slamming leg's foot comes down, and sticks. */
  get foot(): { x: number; z: number } {
    const h = this.hip(this.side);
    const [dx, dz] = this.dirOf(this.angle);
    return { x: h.x + dx * WIDOW.slamAt, z: h.z + dz * WIDOW.slamAt };
  }
  /** The pieces of her lying in the light besides her head: a leg along the floor, or a foot stuck in it. */
  get parts(): BodyPart[] {
    const W = WIDOW;
    const s = this.state;
    if (s === 'stabStuck') return this.far ? [] : [{ x: this.spot.x, z: this.spot.z, r: 0.8 }];
    if (s !== 'slamStuck') return [];
    const f = this.foot;
    return Math.hypot(f.x - this.field.x, f.z - this.field.z) <= this.field.r + W.legHalf ? [{ x: f.x, z: f.z, r: 0.8 }] : [];
  }

  private enter(state: WidowState): void {
    this.state = state;
    this.stateTime = 0;
    this.spent = false;
  }
  private wind(t: number): number {
    return this.raging ? t * WIDOW.hurry : t;
  }
  private rest(): void {
    const [a, b] = this.raging ? WIDOW.waitRage : WIDOW.wait;
    this.waitLeft = a + (b - a) * this.rng();
    this.enter('idle');
  }

  takeHit(damage: number, _fromX: number, _fromZ: number, _how: HitHow = 'sword', part = -1): boolean {
    if (!this.alive) return false;
    if (this.state === 'lurk') this.wake();
    // (Her head is only ever in reach when it is down; a blow that finds it there bites deep.)
    const head = part < 0;
    this.hp -= damage * (head ? WIDOW.headDouble : WIDOW.legPart);
    if (this.hp <= 0) {
      this.hp = 0;
      this.y = this.floorY;
      // (She dies with her head in the light, wherever it was.)
      if (!this.headDown) {
        const [fx, fz] = this.fwd;
        this.x = this.px + fx * 1.5;
        this.z = this.pz + fz * 1.5;
      }
      this.enter('dead');
      return true;
    }
    this.events.push(head ? 'crit' : 'hurt');
    if (!this.raging && this.hp <= this.maxHp * WIDOW.rageAt) {
      this.raging = true;
      this.events.push('rage');
    }
    return false;
  }

  /** A blow reached the rat. A perfect guard against any of them throws her down, her head in the light. */
  lungeLanded(_blocked: boolean, parried = false): void {
    this.spent = true;
    if (parried && this.alive) {
      // Her head comes down toward him, a little short of where he stands: there for the taking.
      this.headFrom = { x: this.x, z: this.z };
      const d = Math.hypot(this.playerX - this.px, this.playerZ - this.pz);
      const reach = Math.max(2.5, Math.min(WIDOW.reelReach, d - WIDOW.reelShort));
      this.aimSpot(this.playerX, this.playerZ, reach);
      this.y = this.floorY;
      this.events.push('reel');
      this.enter('reel');
    }
  }
  /** She does not move. */
  nudge(): void {}

  private wake(): void {
    this.events.push('wake');
    this.enter('rise');
  }

  /** Takes the next blow in her round: slams, stabs, a bite, and round again. */
  private choose(px: number, pz: number): void {
    const W = WIDOW;
    const kinds = ['slam', 'stab', 'bite', 'slam', 'bite', 'stab'] as const;
    const kind = kinds[this.turn++ % kinds.length];
    // (Whichever side of her he is on is the side that goes first.)
    const [fx, fz] = this.fwd;
    const leftOf = (px - this.px) * fz - (pz - this.pz) * fx;
    this.side = leftOf >= 0 ? 1 : -1;
    if (kind === 'slam') {
      this.second = false;
      this.beginSlam();
    } else if (kind === 'stab') {
      this.left = this.raging ? W.stabsRage : W.stabs;
      this.beginStab(true);
    } else {
      this.left = this.raging ? W.bitesRage : 1;
      this.beginBite();
    }
  }
  private beginSlam(): void {
    this.windTime = this.wind(WIDOW.slamWind);
    this.returning = false;
    this.events.push('slamWind');
    this.enter('slamWind');
  }
  private beginStab(first: boolean): void {
    this.windTime = first ? this.wind(WIDOW.stabWind) : WIDOW.stabGap;
    this.left--;
    this.events.push('stabWind');
    this.enter('stabWind');
  }
  private beginBite(): void {
    this.windTime = WIDOW.biteWind;
    this.left--;
    this.headFrom = { x: this.x, z: this.z };
    this.events.push('biteWind');
    this.enter('biteWind');
  }
  /** Sets `spot` to where he is, kept on the lit floor (and, for a bite, within her head's reach). */
  private aimSpot(px: number, pz: number, reach: number): void {
    let x = px;
    let z = pz;
    const fromMid = Math.hypot(x - this.field.x, z - this.field.z);
    const most = this.field.r - 0.6;
    if (fromMid > most) {
      x = this.field.x + ((x - this.field.x) / fromMid) * most;
      z = this.field.z + ((z - this.field.z) / fromMid) * most;
    }
    const d = Math.hypot(x - this.px, z - this.pz);
    if (d > reach) {
      x = this.px + ((x - this.px) / d) * reach;
      z = this.pz + ((z - this.pz) / d) * reach;
    }
    this.spot.x = x;
    this.spot.z = z;
  }

  update(dt: number, px: number, py: number, pz: number, playerAlive: boolean): void {
    const W = WIDOW;
    this.stateTime += dt;
    this.playerX = px;
    this.playerY = py;
    this.playerZ = pz;
    const h = this.hip(this.side);
    this.playerD = Math.hypot(px - h.x, pz - h.z);
    this.playerP = Math.hypot(px - this.px, pz - this.pz);
    const t = this.stateTime;
    const home = this.home;
    const onFloor = Math.hypot(px - this.field.x, pz - this.field.z) < this.field.r && py < this.floorY + 3;

    switch (this.state) {
      case 'dead':
        break;
      case 'lurk':
        if (playerAlive && onFloor) this.wake();
        break;
      case 'rise':
        if (t >= W.rise) this.rest();
        break;
      case 'idle':
        // (Her head goes back to its place in the dark.)
        this.x += (home.x - this.x) * Math.min(1, dt * 6);
        this.z += (home.z - this.z) * Math.min(1, dt * 6);
        if (!playerAlive || !onFloor) break;
        this.waitLeft -= dt;
        if (this.waitLeft <= 0 && this.mayAttack) this.choose(px, pz);
        break;

      case 'slamWind': {
        // The leg is up; it follows him across its own side, then commits to a line.
        if (t <= this.windTime * W.slamTrack) {
          const a = this.angleTo(this.side, px, pz) * this.side;
          this.angle = this.side * Math.max(W.slamAim[0], Math.min(W.slamAim[1], a));
        }
        if (t >= this.windTime) {
          this.events.push('slam');
          this.enter('slam');
        }
        break;
      }
      case 'slam':
        if (t >= W.slamTime) this.enter('slamStuck');
        break;
      case 'slamStuck':
        if (t >= W.slamStuck) {
          this.windTime = this.wind(W.sweepWind);
          this.events.push('sweepWind');
          this.enter('sweepWind');
        }
        break;
      case 'sweepWind':
        if (t >= this.windTime) {
          this.wave = W.waveFrom;
          this.events.push('sweep');
          this.enter('sweep');
        }
        break;
      case 'sweep':
        // The wave runs out from her over the whole floor.
        this.wave += (this.raging ? W.waveSpeedRage : W.waveSpeed) * dt;
        if (this.wave >= W.legLen + 1) this.enter('sweepEnd');
        break;
      case 'sweepEnd':
        if (t >= W.sweepEnd) {
          if (this.raging && !this.returning) {
            // Angry: the leg swipes a second time.
            this.returning = true;
            this.windTime = this.wind(W.sweepWind);
            this.events.push('sweepWind');
            this.enter('sweepWind');
          } else if (!this.second) {
            // ...and then the other leg, from the other side.
            this.second = true;
            this.side = -this.side as 1 | -1;
            this.beginSlam();
          } else this.rest();
        }
        break;

      case 'biteWind': {
        // Her head comes up to the edge of the light; the place is marked, and follows him at first.
        if (t <= this.windTime * W.biteTrack) {
          this.aimSpot(px, pz, W.legLen);
          this.far = Math.hypot(this.spot.x - this.px, this.spot.z - this.pz) > W.biteReach;
        }
        const k = Math.min(1, t / this.windTime);
        this.x = this.headFrom.x + (this.px - this.headFrom.x) * k;
        this.z = this.headFrom.z + (this.pz - this.headFrom.z) * k;
        if (t >= this.windTime) {
          this.headFrom = { x: this.x, z: this.z };
          this.events.push('bite');
          this.enter('bite');
        }
        break;
      }
      case 'bite': {
        // (Spat from afar, her head stays where it is.)
        const k = this.far ? 0 : Math.min(1, t / (W.biteTime * 0.6));
        this.x = this.headFrom.x + (this.spot.x - this.headFrom.x) * k;
        this.z = this.headFrom.z + (this.spot.z - this.headFrom.z) * k;
        if (t >= W.biteTime) {
          if (!this.far) {
            this.x = this.spot.x;
            this.z = this.spot.z;
          }
          this.enter('biteStuck');
        }
        break;
      }
      case 'biteStuck':
        if (t >= (this.far ? W.spitEnd : W.biteStuck)) {
          this.headFrom = { x: this.x, z: this.z };
          this.enter('withdraw');
        }
        break;
      case 'withdraw': {
        const k = Math.min(1, t / W.withdraw);
        this.x = this.headFrom.x + (home.x - this.headFrom.x) * k;
        this.z = this.headFrom.z + (home.z - this.headFrom.z) * k;
        if (t >= W.withdraw) {
          if (this.left > 0 && playerAlive && onFloor) this.beginBite();
          else this.rest();
        }
        break;
      }

      case 'stabWind':
        if (t <= this.windTime * W.stabTrack) {
          this.aimSpot(px, pz, W.legLen);
          const hi = this.hip(this.side, true);
          this.far = Math.hypot(this.spot.x - hi.x, this.spot.z - hi.z) > W.stabReach;
        }
        if (t >= this.windTime) {
          this.events.push('stab');
          this.enter('stab');
        }
        break;
      case 'stab':
        if (t >= W.stabTime) this.enter('stabStuck');
        break;
      case 'stabStuck':
        if (t >= (this.far ? W.spitEnd : W.stabStuck)) {
          if (this.left > 0 && playerAlive && onFloor) {
            this.side = -this.side as 1 | -1;
            this.beginStab(false);
          } else this.rest();
        }
        break;

      case 'reel': {
        // Thrown down: her head falls into the light and lies there.
        const k = Math.min(1, t / 0.25);
        this.x = this.headFrom.x + (this.spot.x - this.headFrom.x) * k;
        this.z = this.headFrom.z + (this.spot.z - this.headFrom.z) * k;
        if (t >= W.reel) {
          this.headFrom = { x: this.x, z: this.z };
          this.left = 0;
          this.enter('withdraw');
        }
        break;
      }
    }
    // A blow from above finds him at whatever height he is: jumping is the answer to the sweep, not to these.
    this.y = this.fromAbove && this.alive ? Math.max(this.floorY, Math.min(this.playerY, this.floorY + 6)) : this.floorY;
  }
}
