import type { BodyPart, CanStand, HitHow } from './foe';

/**
 * The Widow: the boss in the dark at the bottom of the Long Drop. She is far too big for the room: she stays out past
 * the edge of the light, and only her head, her jaws and her four front legs come into it.
 *
 * The owner, 2026-11-16: "it's just like a giant spider's head connected to a body that goes into the darkness and
 * then you have to deal with like his front four legs and ... mandibles ... he'll like slam down one side of the
 * field and sweep across and then slam down the other side of the field and sweep across or he'll like bite down on
 * certain parts of the field and you have to like Dodge all his attacks."
 *
 * EVERYTHING SHE DOES IS DONE WITH A LEG OR HER HEAD, AND IS SEEN TO BE. Two earlier versions were wrong, and he said
 * why. First her legs reached right across the room ("it's like a big pillar ... it doesn't really look like one of
 * the legs ... you kind of have to see the leg move ... you don't have to like make the spiders leg gigantic"). Then
 * her legs were short and flung poison across the room, and he said: "shooting rays of light no ... that's ugly ... I
 * was asking you to make animations with the legs like just pull the leg forward and slam it down on the ground like
 * you're going to have to move it around a little bit ... it's a stationary boss but you can still slam its legs down
 * and move it around ... you can't just like sit in the back and have the main character jump over a [ray] of light
 * that's not fun at all." So: no rays, no poison. Her legs are a spider's legs, and SHE MOVES: she crawls round the
 * edge of the light to whichever side he is on, and leans in, so that there is no back of the room to sit in.
 *
 *   - (Version three had her crawl round the rim and lay a leg flat to sweep it. He threw that out too: "the legs that
 *     are standing right there in front are the legs that should be attacking ... Don't invent imaginary limbs"; and,
 *     asked about a smaller room: "you can make the spider bigger it never had to be that size". So she is VERY big,
 *     she stays where she is with her face and her legs' roots in the light, and it is the four legs she stands on
 *     that strike, from where they stand, still arched and joined to her. They reach to about the middle of the room.)
 *   - The SLAM and the SWEEP: an outer leg is pulled up and forward and comes down on where he stands (a ring marks
 *     it; two hearts, no shield stops it: get out of the ring). The foot is stuck a moment (hit it). Then that foot
 *     RAKES the floor round across her front, the leg still arched over it (one heart, no shield: jump the foot, or
 *     be out of its way). Then the other leg, from the other side. Angry, each sweep comes back as well.
 *   - The STAB: an inner leg spikes down on where he stands (one heart; a shield stops it). The foot is stuck a
 *     moment. Two of them, one from each side; angry, four.
 *   - The BITE, when he is near her: her head rears, a ring marks the place, and she comes out of the dark and bites
 *     down on it (two hearts, no shield). Her head lies in the light a while after: the great opening.
 *   - A perfect guard against any of it throws her down: her head falls into the light and lies there.
 * A blow on a leg counts half and one on her head double.
 *
 * Her place is a bearing round the lit floor (`theta`); `px, pz` is the edge of the light there (less how far she is
 * leaning in), she faces the middle of the floor, each leg turns about its own hip beside that, and a leg's angle is
 * counted from the way she faces (+ to her left).
 */
export type WidowState =
  | 'lurk' | 'rise' | 'idle'
  | 'slamWind' | 'slam' | 'slamStuck' | 'sweepWind' | 'sweep' | 'sweepEnd'
  | 'biteWind' | 'bite' | 'biteStuck' | 'withdraw'
  | 'stabWind' | 'stab' | 'stabStuck'
  | 'reel' | 'dead';

export const WIDOW = {
  hp: 32,
  radius: 3.2, // her head
  rageAt: 0.5,
  rise: 1.9, // she wakes: this long before the first blow can start
  wait: [0.7, 1.2] as [number, number],
  waitRage: [0.35, 0.6] as [number, number],
  hurry: 0.8, // angry, a leg's wind-up is this much of its length (her bites and the stabs after the first are not hurried: there are more of them)
  out: 0.8, // how far past the edge of the light her place is
  back: 1.6, // how far behind that the middle of her head is: her face is in the light, where it is seen
  hipHigh: 4.5, // how high over the floor her hips are
  hip: 4.0, // how far to each side of her middle an outer leg's hip is; an inner leg's is half that
  // Getting to him.
  crawl: 0, // how fast she goes round the rim (radians a second): she does NOT (the owner: do not invent; she stays, and is big enough)
  crawlRage: 0,
  near: 4, // within this of his bearing she strikes: anywhere
  patience: 5, // ...and after this long (he will not stand still) she strikes from where she is
  legReach: 15, // how far from its hip a leg reaches: they are the legs she stands on (at 21 she was too big to be seen whole: "Shadow of the Colossus kind of big"; there are two of her instead)
  lean: 0, // how far in over the edge she can lean to reach him: she does not
  // The slam.
  slamR: 1.4,
  slamWind: 1.05,
  slamTrack: 0.5, // the ring follows him for this much of a wind-up, then holds
  slamTime: 0.14,
  slamDamage: 2,
  slamStuck: 0.8,
  // The sweep.
  rakeR: 1.3, // the foot that rakes the floor: this far round it strikes
  sweepWind: 0.45,
  sweepRate: 1.4, // radians a second
  sweepRateRage: 1.8,
  sweepTo: 1.05, // it sweeps to this angle on the far side (and lies there, still on the lit floor)
  sweepDamage: 1,
  sweepEnd: 0.5,
  // The bite.
  biteReach: 8.5, // how far from her place her head can come: further off, it is her legs
  biteR: 2.8, // (nearly as wide as her head)
  biteWind: 1.1,
  biteTrack: 0.4,
  biteTime: 0.14,
  biteDamage: 2,
  biteStuck: 1.6,
  withdraw: 0.6,
  bitesRage: 3,
  // The stab.
  stabR: 1.0,
  stabWind: 0.62,
  stabGap: 0.6, // the wind-up of each stab after the first
  stabTrack: 0.4,
  stabTime: 0.12,
  stabDamage: 1,
  stabStuck: 0.9,
  stabs: 2,
  stabsRage: 4,
  // Thrown down by a perfect guard.
  reel: 2.4,
  reelReach: 9, // her head falls toward him, as far into the light as this...
  reelShort: 4.4, // ...and this far short of him
  headDouble: 2, // her head takes this many times a blow's harm...
  legPart: 0.5, // ...and a leg this much of it: they are armoured, and there is a lot of her
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));
/**
 * Every Widow there is. Two share a room (one each side of it), and they take turns: one does not start a blow while
 * the other is in the middle of one. (A new one made in the same place takes the old one's place here.)
 */
const PACK: Widow[] = [];
/** Counts every Widow's every tick: one that has not ticked lately is no longer in the game (an old room's), and is not waited for. */
let CLOCK = 0;

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
  /** What she has done since the game last took them (it empties this), for sounds: 'wake', 'slamWind', 'slam', 'sweepWind', 'sweep', 'biteWind', 'bite', 'stabWind', 'stab', 'step', 'reel', 'rage', 'hurt', 'crit'. */
  readonly events: string[] = [];

  /** The middle and radius of the lit floor. */
  readonly field: { x: number; z: number; r: number };
  /** Where she is round it: the bearing of her place from its middle. */
  theta: number;
  /** How far in over the edge she is leaning. */
  lean = 0;
  /** Which side the leg that is striking is on: +1 her left, -1 her right. */
  side: 1 | -1 = 1;
  /** The angle (from the way she faces) and the distance from its hip of the striking leg's FOOT, while it rakes the floor. */
  angle = 0;
  rho = 8;
  /** How long the wind-up she is in lasts. */
  windTime: number = WIDOW.slamWind;
  /** Where the slam, the stab or the bite comes down. */
  readonly spot = { x: 0, z: 0 };
  /** Angry: below half her health. */
  raging = false;
  /** She is going round the rim (for her legs): -1, 0 or 1. */
  crawling = 0;
  private spent = false;
  private waitLeft = 0;
  private waited = 0;
  private turn = 0;
  private left = 0; // blows left in this run of them
  private second = false; // the second slam of a pair
  private returning = false; // a sweep coming back
  private sweepGoal = 0;
  private leanGoal = 0;
  private stepIn = 0;
  private beat = 0;
  private headFrom = { x: 0, z: 0 };
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;

  /** `x, z`: where she starts, out past the edge of the light. `arena`: the square round the lit floor. (She faces its middle.) */
  constructor(spec: { x: number; z: number; y?: number; facing?: number; arena?: { x0: number; x1: number; z0: number; z1: number } }) {
    this.floorY = spec.y ?? 0;
    this.y = this.floorY;
    const a = spec.arena ?? { x0: spec.x - 13, x1: spec.x + 13, z0: spec.z - 26.8, z1: spec.z - 0.8 };
    this.field = { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2, r: (a.x1 - a.x0) / 2 };
    this.theta = Math.atan2(spec.x - this.field.x, spec.z - this.field.z);
    const home = this.home;
    this.x = home.x;
    this.z = home.z;
    for (let i = PACK.length - 1; i >= 0; i--) if (!this.shares(PACK[i]) || Math.abs(wrap(PACK[i].theta - this.theta)) < 0.01) PACK.splice(i, 1);
    PACK.push(this);
  }
  private shares(o: Widow): boolean {
    return o.field.x === this.field.x && o.field.z === this.field.z && o.field.r === this.field.r;
  }
  /** Another of her, in this room, is in the middle of a blow. */
  private get sisterStriking(): boolean {
    // (In the middle of one: from its wind-up till she is back at rest, the moments a piece of her is stuck included.)
    return PACK.some((o) => o !== this && o.alive && this.shares(o) && o.state !== 'idle' && o.state !== 'lurk' && o.state !== 'rise' && CLOCK - o.beat <= PACK.length + 1);
  }
  /** How far out from her place, straight ahead, a leg can come down. */
  get reach(): number {
    const most = Math.sqrt((WIDOW.legReach * 0.98) ** 2 - WIDOW.hipHigh ** 2);
    return Math.sqrt(most * most - WIDOW.hip * WIDOW.hip);
  }

  /** The edge of the light in front of her (less her lean), and the way she faces: at the middle of the floor. */
  get px(): number {
    return this.field.x + Math.sin(this.theta) * (this.field.r + WIDOW.out - this.lean);
  }
  get pz(): number {
    return this.field.z + Math.cos(this.theta) * (this.field.r + WIDOW.out - this.lean);
  }
  get facing(): number {
    return wrap(this.theta + Math.PI);
  }
  private get fwd(): [number, number] {
    return [-Math.sin(this.theta), -Math.cos(this.theta)];
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
  /** Where the foot that rakes the floor is. */
  get tip(): { x: number; z: number } {
    const h = this.hip(this.side);
    const [dx, dz] = this.dirOf(this.angle);
    return { x: h.x + dx * this.rho, z: h.z + dz * this.rho };
  }
  /** Her face is armoured: while her head is up, a sword only glances off it. It is when it lies on the floor that it can be hurt. */
  deflects(_fromX: number, _fromZ: number, _how?: HitHow, part = -1): boolean {
    return part < 0 && !this.headDown && this.alive;
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
    return this.state === 'idle' && this.waitLeft <= 0 && !this.sisterStriking;
  }
  get attacking(): boolean {
    const s = this.state;
    return s === 'slamWind' || s === 'slam' || s === 'sweepWind' || s === 'sweep' || s === 'biteWind' || s === 'bite' || s === 'stabWind' || s === 'stab';
  }
  /** Open: a piece of her lies in the light and nothing is coming. */
  get open(): boolean {
    const s = this.state;
    return s === 'slamStuck' || s === 'sweepEnd' || s === 'biteStuck' || s === 'stabStuck' || s === 'reel';
  }
  /** Another stab, or another bite, follows this one. */
  get more(): boolean {
    return this.left > 0 && (this.state === 'stabWind' || this.state === 'stab' || this.state === 'stabStuck' || this.state === 'biteWind' || this.state === 'bite' || this.state === 'biteStuck');
  }
  /** Her head is down in the light, where the sword can get at it. */
  get headDown(): boolean {
    return this.state === 'biteStuck' || this.state === 'reel';
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
    // (The rake strikes once the foot is moving: not in the instant it starts, on one standing right by it.)
    return this.state === 'sweep' && this.stateTime >= 0.12;
  }
  /** The shape of the blow she is giving, or winding up to (so a test view can draw what is coming). */
  get bite(): { reach: number; arc: number; damage: number; heavy?: boolean; ground?: boolean; at: BodyPart; from?: { x: number; z: number } } {
    const W = WIDOW;
    const s = this.state;
    // (What comes down on a place comes from her: his shield must face her, not the floor under him.)
    const from = { x: this.px, z: this.pz };
    const on = (r: number): BodyPart => ({ x: this.spot.x, z: this.spot.z, r });
    if (s === 'biteWind' || s === 'bite' || s === 'biteStuck') return { reach: 0, arc: Math.PI, damage: W.biteDamage, heavy: true, at: on(W.biteR), from };
    if (s === 'stabWind' || s === 'stab' || s === 'stabStuck') return { reach: 0, arc: Math.PI, damage: W.stabDamage, at: on(W.stabR), from };
    if (s === 'slamWind' || s === 'slam' || s === 'slamStuck') return { reach: 0, arc: Math.PI, damage: W.slamDamage, heavy: true, at: on(W.slamR), from };
    // The raking foot: round where it is on the floor, and nowhere else (the leg over it is arched, off the floor).
    const f = this.tip;
    return { reach: 0, arc: Math.PI, damage: W.sweepDamage, heavy: true, ground: true, at: { x: f.x, z: f.z, r: W.rakeR }, from };
  }
  get biteDir(): number {
    return this.facing + this.angle;
  }
  /** The pieces of her on the floor besides her head: a foot stuck in it, or resting on it where it stopped. */
  get parts(): BodyPart[] {
    const s = this.state;
    if (s === 'slamStuck' || s === 'sweepWind') return [{ x: this.spot.x, z: this.spot.z, r: 1.2 }];
    if (s === 'stabStuck') return [{ x: this.spot.x, z: this.spot.z, r: 1 }];
    if (s === 'sweepEnd') return [{ x: this.tip.x, z: this.tip.z, r: 1.2 }];
    return [];
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
    this.waited = 0;
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
      this.aimSpot(this.playerX, this.playerZ, Math.max(2.5, Math.min(WIDOW.reelReach, d - WIDOW.reelShort)), this.px, this.pz);
      this.y = this.floorY;
      this.events.push('reel');
      this.enter('reel');
    }
  }
  /** She is not to be shoved. */
  nudge(): void {}

  private wake(): void {
    this.events.push('wake');
    this.enter('rise');
  }

  /** Takes the next blow in her round: slams, stabs, a bite, and round again. */
  private choose(px: number, pz: number): void {
    const W = WIDOW;
    const kinds = ['slam', 'stab', 'bite', 'slam', 'bite', 'stab'] as const;
    let kind: 'slam' | 'stab' | 'bite' = kinds[this.turn++ % kinds.length];
    // (Her head only comes so far: further off than that, it is a leg.)
    if (kind === 'bite' && Math.hypot(px - this.px, pz - this.pz) > W.biteReach) kind = 'slam';
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
  /** Sets `spot` to where he is, kept on the lit floor and within `reach` of (fromX, fromZ). */
  private aimSpot(px: number, pz: number, reach: number, fromX: number, fromZ: number): void {
    let x = px;
    let z = pz;
    const fromMid = Math.hypot(x - this.field.x, z - this.field.z);
    const most = this.field.r - 0.6;
    if (fromMid > most) {
      x = this.field.x + ((x - this.field.x) / fromMid) * most;
      z = this.field.z + ((z - this.field.z) / fromMid) * most;
    }
    const d = Math.hypot(x - fromX, z - fromZ);
    if (d > reach) {
      x = fromX + ((x - fromX) / d) * reach;
      z = fromZ + ((z - fromZ) / d) * reach;
    }
    this.spot.x = x;
    this.spot.z = z;
  }
  /**
   * A leg's aim: `spot` on him, as far as the leg can reach with her leaning in as far as she can; and how far she
   * must lean for it. (Measured from her place with no lean, so that her leaning does not move the mark.)
   */
  private aimLeg(px: number, pz: number, inner: boolean): void {
    const W = WIDOW;
    const [fx, fz] = this.fwd;
    const rimX = this.px - fx * this.lean;
    const rimZ = this.pz - fz * this.lean;
    const hipOff = this.side * W.hip * (inner ? 0.5 : 1);
    // (Along the floor, a leg reaches as far as its length allows from a hip that high over it.)
    const most = Math.sqrt((W.legReach * 0.98) ** 2 - W.hipHigh ** 2);
    // (Straight out from her, a leg reaches as far as its length allows from a hip set to one side, and her lean on top.)
    const ahead = Math.sqrt(most * most - hipOff * hipOff);
    this.aimSpot(px, pz, W.lean + ahead, rimX, rimZ);
    const d = Math.hypot(this.spot.x - rimX, this.spot.z - rimZ);
    this.leanGoal = Math.max(0, Math.min(W.lean, d - ahead + 0.6));
    // ...and never further than the leg, from where its hip will be when she has leaned.
    const hx = rimX + fx * this.leanGoal + fz * hipOff;
    const hz = rimZ + fz * this.leanGoal - fx * hipOff;
    const far = Math.hypot(this.spot.x - hx, this.spot.z - hz);
    if (far > most) {
      this.spot.x = hx + ((this.spot.x - hx) / far) * most;
      this.spot.z = hz + ((this.spot.z - hz) / far) * most;
    }
  }

  update(dt: number, px: number, py: number, pz: number, playerAlive: boolean): void {
    const W = WIDOW;
    this.beat = ++CLOCK;
    this.stateTime += dt;
    this.playerX = px;
    this.playerY = py;
    this.playerZ = pz;
    const t = this.stateTime;
    const onFloor = Math.hypot(px - this.field.x, pz - this.field.z) < this.field.r && py < this.floorY + 3;
    this.crawling = 0;
    // She leans in for a leg's blow, and draws back when she rests.
    const leaning = this.state === 'slamWind' || this.state === 'stabWind';
    const still = this.state === 'idle' || this.state === 'rise' || this.state === 'lurk' || this.state === 'biteWind' || this.state === 'withdraw';
    if (leaning) this.lean += (this.leanGoal - this.lean) * Math.min(1, dt * 7);
    else if (still) this.lean += (0 - this.lean) * Math.min(1, dt * 3);
    const home = this.home;

    switch (this.state) {
      case 'dead':
        break;
      case 'lurk':
        if (playerAlive && onFloor) this.wake();
        break;
      case 'rise':
        if (t >= W.rise) this.rest();
        break;
      case 'idle': {
        // Her head goes back to its place in the dark, and she crawls round the rim to whichever side he is on.
        this.x += (home.x - this.x) * Math.min(1, dt * 6);
        this.z += (home.z - this.z) * Math.min(1, dt * 6);
        if (!playerAlive || !onFloor) break;
        const fromMid = Math.hypot(px - this.field.x, pz - this.field.z);
        const off = fromMid > 1 ? wrap(Math.atan2(px - this.field.x, pz - this.field.z) - this.theta) : 0;
        const step = (this.raging ? W.crawlRage : W.crawl) * dt;
        if (Math.abs(off) > 0.02) {
          this.theta = wrap(this.theta + Math.max(-step, Math.min(step, off)));
          this.crawling = Math.sign(off);
          if ((this.stepIn -= dt) <= 0) {
            this.stepIn = 0.22;
            this.events.push('step');
          }
        }
        this.waitLeft -= dt;
        this.waited += dt;
        // (She strikes at what she can reach, and waits her turn if her sister is striking.)
        const inReach = Math.hypot(px - this.px, pz - this.pz) <= this.reach + W.slamR + 0.5;
        if (this.waitLeft <= 0 && this.mayAttack && inReach && !this.sisterStriking && (Math.abs(off) <= W.near || this.waited >= W.patience)) this.choose(px, pz);
        break;
      }

      case 'slamWind':
        // The leg is pulled up and forward; the ring follows him, then holds.
        if (t <= this.windTime * W.slamTrack) this.aimLeg(px, pz, false);
        if (t >= this.windTime) {
          this.lean = this.leanGoal; // (she is as far in as the blow needs, exactly, when it falls)
          this.events.push('slam');
          this.enter('slam');
        }
        break;
      case 'slam':
        if (t >= W.slamTime) this.enter('slamStuck');
        break;
      case 'slamStuck':
        if (t >= W.slamStuck) {
          // Its foot will rake the floor from where it stuck, round its hip, across her front.
          const h = this.hip(this.side);
          this.angle = wrap(Math.atan2(this.spot.x - h.x, this.spot.z - h.z) - this.facing);
          this.rho = Math.hypot(this.spot.x - h.x, this.spot.z - h.z);
          // (Across to the far side; or, if it came down across there already, back to its own side, less far: it
          // must end lying on the lit floor.)
          this.sweepGoal = this.angle * this.side > -0.2 ? -this.side * W.sweepTo : this.side * W.sweepTo * 0.5;
          this.windTime = this.wind(W.sweepWind);
          this.events.push('sweepWind');
          this.enter('sweepWind');
        }
        break;
      case 'sweepWind':
        if (t >= this.windTime) {
          this.events.push('sweep');
          this.enter('sweep');
        }
        break;
      case 'sweep': {
        const step = (this.raging ? W.sweepRateRage : W.sweepRate) * dt;
        const togo = this.sweepGoal - this.angle;
        if (Math.abs(togo) <= step) {
          this.angle = this.sweepGoal;
          this.enter('sweepEnd');
        } else this.angle += Math.sign(togo) * step;
        break;
      }
      case 'sweepEnd':
        if (t >= W.sweepEnd) {
          if (this.raging && !this.returning) {
            // Angry: it comes back the way it went.
            this.returning = true;
            this.sweepGoal = -this.sweepGoal;
            this.windTime = this.wind(W.sweepWind);
            this.events.push('sweepWind');
            this.enter('sweepWind');
          } else if (!this.second && playerAlive && onFloor) {
            // ...and then the other leg, from the other side.
            this.second = true;
            this.side = -this.side as 1 | -1;
            this.beginSlam();
          } else this.rest();
        }
        break;

      case 'biteWind': {
        // Her head comes up to the edge of the light; the place is marked, and follows him at first.
        if (t <= this.windTime * W.biteTrack) this.aimSpot(px, pz, W.biteReach, this.px, this.pz);
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
        const k = Math.min(1, t / (W.biteTime * 0.6));
        this.x = this.headFrom.x + (this.spot.x - this.headFrom.x) * k;
        this.z = this.headFrom.z + (this.spot.z - this.headFrom.z) * k;
        if (t >= W.biteTime) {
          this.x = this.spot.x;
          this.z = this.spot.z;
          this.enter('biteStuck');
        }
        break;
      }
      case 'biteStuck':
        if (t >= W.biteStuck) {
          this.headFrom = { x: this.x, z: this.z };
          this.enter('withdraw');
        }
        break;
      case 'withdraw': {
        const k = Math.min(1, t / W.withdraw);
        this.x = this.headFrom.x + (home.x - this.headFrom.x) * k;
        this.z = this.headFrom.z + (home.z - this.headFrom.z) * k;
        if (t >= W.withdraw) {
          if (this.left > 0 && playerAlive && onFloor && Math.hypot(px - this.px, pz - this.pz) <= W.biteReach + 2) this.beginBite();
          else this.rest();
        }
        break;
      }

      case 'stabWind':
        if (t <= this.windTime * W.stabTrack) this.aimLeg(px, pz, true);
        if (t >= this.windTime) {
          this.lean = this.leanGoal;
          this.events.push('stab');
          this.enter('stab');
        }
        break;
      case 'stab':
        if (t >= W.stabTime) this.enter('stabStuck');
        break;
      case 'stabStuck':
        if (t >= W.stabStuck) {
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
