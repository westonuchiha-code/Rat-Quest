import { SENSES, keepOnFloor, type FloorUnder, sameGround } from './foe';
import type { BodyPart, CanStand, HitHow } from './foe';

/**
 * Ant Pikeman: a soldier ant with a pike half as long again as it is tall. Logic only, so it runs in tests.
 *
 * One alone is a fence: it keeps its point between itself and the rat, further off than his sword reaches, and
 * thrusts. TWO ARE A TRAP. They fight as a pair (`pairAnts`, called once a tick with all of them):
 *   The one nearer him is the FRONT: it stands off at pike's length with its point on him.
 *   The other is the FLANK: it goes round him, quickly, to the far side, so that he is between two points, and
 *   stands off there. Turn on it and walk at it, and it becomes the front and the other goes round.
 *   They take turns to thrust (the game's director sees to that), so one is always coming from behind him.
 * The way out is to break the pair: an ant is not hard to kill once he is past its point.
 *   The thrust: it draws its pike back (the tell), then lunges, long, straight and narrow. Step aside and it is
 *   stretched out for most of a second; a shield stops the point; a perfect guard knocks the pike wide (a long
 *   opening). The blow is the pike's POINT (`tip`), not its body, and the model draws the point where these rules
 *   have it.
 *   Inside its point it cannot thrust: it tips its pike up out of the way and gives ground, and if he stays in
 *   front of it close up it BITES: its head goes back with its jaws wide (the tell), then snaps forward. Its flanks
 *   and back are open, and every blow staggers it; but it does not stand to be cut down: as soon as it has its
 *   feet again it SPRINGS BACK out of his reach, to get its point between them once more. So getting in is worth two
 *   cuts, not a kill, and he has to get past the point again. (Not when its pike has been beaten down by a perfect
 *   guard: then it reels where it is until it has it back.) And its mate does not wait: the moment he is inside one's
 *   point, the other makes ready to thrust at his back.
 */
export type AntState = 'idle' | 'march' | 'hold' | 'windup' | 'thrust' | 'recover' | 'biteWind' | 'bite' | 'biteRest' | 'reel' | 'stagger' | 'spring' | 'dead' | 'return';

export const ANT = {
  hp: 4,
  radius: 0.42,
  noticeRange: 10,
  pairRange: 12, // two this near each other fight as a pair
  speed: 2.8, // coming up to its place
  flankSpeed: 3.8, // going round him
  backSpeed: 1.7, // giving ground when he crowds it
  turnRate: 4.5,
  holdRange: 3.0, // where it stands off, centre to centre: inside its pike's reach, outside the sword's
  crowdRange: 2.1, // nearer than this he is inside its point: it cannot thrust, it tips its pike up and steps back
  wait: [1.0, 1.8] as [number, number],
  // The thrust.
  windup: 0.55,
  track: 0.5, // part of the wind-up it keeps turning with him; then it is committed
  thrustTime: 0.16,
  thrustSpeed: 4, // its body going forward behind the pike
  pikeHeld: 2.2, // how far its point is from its middle: levelled...
  pikeBack: 1.65, // ...drawn back...
  pikeOut: 2.8, // ...and at the full stretch of a thrust
  pikeHeight: 0.76,
  tip: 0.22, // how wide the point's blow is
  gasterBack: 0.6, // its abdomen: how far behind its middle, and how big round
  gaster: 0.26,
  damage: 1,
  recover: 0.8, // stretched out after a thrust that met nothing
  blockedRecover: 1.1,
  // Its jaws, for a rat who has got inside the point and stands in front of it.
  biteRange: 1.55, // (his sword reaches a little less far than this)
  biteArc: 1.0,
  biteWind: 0.38,
  biteTime: 0.14,
  biteSpeed: 3, // its body going forward behind its head
  biteReach: 0.5,
  biteDamage: 1,
  biteRest: 0.45,
  // Its pike knocked wide by a perfect guard; and struck.
  reel: 1.9,
  stagger: 0.38,
  knockback: 4,
  // Springing back out of his reach, once it has its feet after a blow.
  spring: 0.3,
  springSpeed: 8,
  springFrom: 3.4, // only if he is nearer than this
  hurry: 0.3, // its mate's wait is cut to this when he gets inside its point
  respawn: 8,
};

function turnToward(current: number, target: number, maxStep: number): number {
  const d = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + Math.max(-maxStep, Math.min(maxStep, d));
}
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

export class Ant {
  readonly kind = 'ant' as const;
  x: number;
  z: number;
  y: number;
  facing = 0;
  hp: number = ANT.hp;
  state: AntState = 'idle';
  stateTime = 0;
  lastSwing = -1;
  age = 0;
  readonly radius = ANT.radius;
  rng: () => number = Math.random;
  /** For sounds: 'alert', 'windup', 'thrust', 'biteWind', 'bite', 'reel', 'hurt', 'spring'. The game empties it. */
  readonly events: string[] = [];
  mayAttack = true;
  /** Where round him to wait while he is locked on to another (director.ts); null for wherever it likes. */
  flank: number | null = null;
  canStand: CanStand | null = null;
  floorUnder: FloorUnder | null = null;
  /** The height it was made at: it goes back to it when it comes back. (Its `y` follows the floor now.) */
  private homeY = 0;

  readonly home: { x: number; z: number };
  readonly hunt: boolean;
  readonly arena: { x0: number; x1: number; z0: number; z1: number };
  readonly respawns: boolean;
  /** The other of its pair, and which of the two it is just now. Set by `pairAnts`. */
  mate: Ant | null = null;
  role: 'front' | 'flank' = 'front';
  /** The point of its pike (the model draws it there), and how far that is out from its middle. */
  readonly tip = { x: 0, y: 0, z: 0 };
  pike: number = ANT.pikeHeld;
  /** How fast it is walking (for its legs). */
  walking = 0;
  /** He is inside its point: its pike is tipped up out of the way, and it cannot thrust. */
  close = false;
  private velX = 0;
  private velZ = 0;
  private spent = false;
  private recoverTime: number = ANT.recover;
  private waitLeft = 0;
  private roused = false;
  private readonly homeFacing: number;
  private fromX = 0;
  private fromZ = 0;
  /** Which way round him it is going (1 or -1), and how long it has been getting nowhere. */
  private round: 1 | -1 = 1;
  private stuck = 0;
  /** Which way it is springing back. */
  private springDir = 0;
  private readonly biteAt: BodyPart = { x: 0, z: 0, r: ANT.tip };
  /** The rest of it that a sword can find: its abdomen, behind it. */
  readonly parts: BodyPart[] = [{ x: 0, z: 0, r: ANT.gaster }];

  constructor(spec: { x: number; z: number; y?: number; arena?: { x0: number; x1: number; z0: number; z1: number }; respawn?: boolean; hunt?: boolean; facing?: number }) {
    this.home = { x: spec.x, z: spec.z };
    this.hunt = !!spec.hunt;
    this.arena = spec.hunt ? { x0: -500, x1: 500, z0: -500, z1: 500 } : spec.arena ?? { x0: spec.x - 9, x1: spec.x + 9, z0: spec.z - 9, z1: spec.z + 9 };
    this.respawns = spec.respawn ?? false;
    this.x = spec.x;
    this.z = spec.z;
    this.y = spec.y ?? 0;
    this.homeY = this.y;
    this.homeFacing = spec.facing ?? 0;
    this.facing = this.homeFacing;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.point();
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }
  /** It knows he is there. */
  get awake(): boolean {
    return this.state !== 'idle' && this.state !== 'return' && this.state !== 'dead';
  }
  get ready(): boolean {
    return this.state === 'hold' && this.waitLeft <= 0 && !this.close;
  }
  get attacking(): boolean {
    return this.state === 'windup' || this.state === 'thrust' || this.state === 'biteWind' || this.state === 'bite';
  }
  /**
   * Its pike is levelled at him (so its point is where `tip` says). At its post it is held upright; with him inside
   * its point it is tipped up; struck, it is wherever the blow leaves it.
   */
  get level(): boolean {
    return ((this.state === 'march' || this.state === 'hold') && !this.close) || this.state === 'windup' || this.state === 'thrust' || this.state === 'recover';
  }
  get attackActive(): boolean {
    return (this.state === 'thrust' || this.state === 'bite') && !this.spent;
  }
  /** The thrust comes from the point of its pike; the bite from its body, wide and short. */
  get bite(): { reach: number; arc: number; damage: number; at?: BodyPart } {
    if (this.state === 'bite' || this.state === 'biteWind') return { reach: ANT.biteReach, arc: ANT.biteArc, damage: ANT.biteDamage };
    this.biteAt.x = this.tip.x;
    this.biteAt.z = this.tip.z;
    return { reach: 0.08, arc: Math.PI / 2, damage: ANT.damage, at: this.biteAt };
  }
  get windupTime(): number {
    return this.state === 'biteWind' ? ANT.biteWind : ANT.windup;
  }

  /** Woken by its mate: it has not seen him itself, but it comes. */
  rouse(): void {
    if (this.state === 'idle' || this.state === 'return') this.roused = true;
  }
  /** Its mate has him inside its point, or is being cut: it makes ready to thrust now, not when it would have. */
  hurry(): void {
    this.waitLeft = Math.min(this.waitLeft, ANT.hurry);
  }

  private enter(s: AntState): void {
    this.state = s;
    this.stateTime = 0;
  }
  private between([lo, hi]: readonly number[]): number {
    return lo + (hi - lo) * this.rng();
  }
  /** Puts its point where its pike has it. */
  private point(): void {
    this.tip.x = this.x + Math.sin(this.facing) * this.pike;
    this.tip.y = this.y + ANT.pikeHeight;
    this.tip.z = this.z + Math.cos(this.facing) * this.pike;
    this.parts[0].x = this.x - Math.sin(this.facing) * ANT.gasterBack;
    this.parts[0].z = this.z - Math.cos(this.facing) * ANT.gasterBack;
  }

  takeHit(damage: number, fromX: number, fromZ: number, _how: HitHow = 'sword'): boolean {
    if (!this.alive) return false;
    this.hp -= damage;
    const dx = this.x - fromX;
    const dz = this.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.velX = (dx / len) * ANT.knockback;
    this.velZ = (dz / len) * ANT.knockback;
    this.roused = true;
    if (this.hp <= 0) {
      this.hp = 0;
      this.enter('dead');
      return true;
    }
    this.events.push('hurt');
    // Struck while its pike was knocked wide, it stays that way for what is left of it; otherwise it staggers
    // (and a second blow while it staggers does not hold it there any longer: it will spring back when it would have).
    if (this.state !== 'reel' && this.state !== 'stagger') this.enter('stagger');
    return false;
  }

  lungeLanded(blocked: boolean, parried = false): void {
    this.spent = true;
    if (parried) {
      this.events.push('reel');
      this.velX = -Math.sin(this.facing) * 2.5;
      this.velZ = -Math.cos(this.facing) * 2.5;
      this.enter('reel');
    } else if (blocked && this.state === 'thrust') this.recoverTime = ANT.blockedRecover;
  }

  nudge(dx: number, dz: number): void {
    this.fromX = this.x;
    this.fromZ = this.z;
    this.x += dx;
    this.z += dz;
    this.clamp();
    this.point();
  }

  private clamp(): void {
    const A = this.arena;
    this.x = Math.max(A.x0 + this.radius, Math.min(A.x1 - this.radius, this.x));
    this.z = Math.max(A.z0 + this.radius, Math.min(A.z1 - this.radius, this.z));
    keepOnFloor(this, this.fromX, this.fromZ);
  }

  update(dt: number, playerX: number, playerY: number, playerZ: number, playerAlive: boolean): void {
    const N = ANT;
    this.fromX = this.x;
    this.fromZ = this.z;
    this.stateTime += dt;
    this.age += dt;

    const dx = playerX - this.x;
    const dz = playerZ - this.z;
    const dist = Math.hypot(dx, dz);
    const toPlayer = Math.atan2(dx, dz);
    const off = Math.abs(wrap(toPlayer - this.facing));
    const A = this.arena;
    const margin = 1.5;
    const inArena = playerX > A.x0 - margin && playerX < A.x1 + margin && playerZ > A.z0 - margin && playerZ < A.z1 + margin;
    const reachable = playerAlive && inArena && sameGround(this, playerX, playerY, playerZ);
    const mate = this.mate && this.mate.alive && this.mate.awake ? this.mate : null;
    // (Inside its point: a little further out before it counts him outside again, so it does not dither.)
    this.close = this.awake && reachable && dist < N.crowdRange + (this.close ? 0.3 : 0);
    /** He is in front of it, in reach of its jaws: it bites. */
    const snap = (): boolean => {
      if (dist >= N.biteRange || off >= N.biteArc) return false;
      this.spent = false;
      this.events.push('biteWind');
      this.enter('biteWind');
      return true;
    };

    let moveX = 0;
    let moveZ = 0;
    let forward = 0;
    /**
     * Where it stands off: at pike's length from him, on its own side of him if it is the front (or alone), on the
     * far side of him from its mate if it is the flank. `turnOff`: how far round him that is from where it is.
     */
    const here = Math.atan2(this.x - playerX, this.z - playerZ);
    // (Sent to a place round him by the director, because he is locked on to another: that place, over its mate's.)
    const want = this.flank !== null ? this.flank : mate && this.role === 'flank' ? Math.atan2(playerX - mate.x, playerZ - mate.z) : here;
    const turnOff = wrap(want - here);
    const placed = Math.abs(turnOff) < 0.3 && Math.abs(dist - N.holdRange) < 0.5;
    /** Goes to its place: round him at pike's length, never through him. */
    const toPlace = (): void => {
      // Round: along the ring it is on, the shorter way (or the other way, if a wall has stopped it).
      if (Math.abs(turnOff) > 0.12) {
        const way = this.stuck > 0.8 ? this.round : turnOff > 0 ? 1 : -1;
        this.round = way;
        const along = here + (way * Math.PI) / 2;
        const k = Math.min(1, Math.abs(turnOff) / 0.5);
        moveX += Math.sin(along) * N.flankSpeed * k;
        moveZ += Math.cos(along) * N.flankSpeed * k;
      }
      // In or out to pike's length.
      const gap = dist - N.holdRange;
      if (Math.abs(gap) > 0.15) {
        const v = Math.max(-N.backSpeed, Math.min(N.speed, gap * 3));
        moveX += Math.sin(toPlayer) * v;
        moveZ += Math.cos(toPlayer) * v;
      }
    };
    const engage = (): void => {
      if (this.state === 'idle' || this.state === 'return') this.events.push('alert');
      this.roused = false;
      this.stuck = 0;
      this.enter(placed ? 'hold' : 'march');
      if (this.waitLeft <= 0) this.waitLeft = this.between(N.wait);
    };

    switch (this.state) {
      case 'idle':
        this.pike = N.pikeHeld;
        if (reachable && (this.hunt || this.roused || dist < N.noticeRange * SENSES.notice)) engage();
        break;
      case 'march':
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, N.turnRate * dt);
        this.pike = N.pikeHeld;
        if (snap()) break;
        if (placed) {
          this.enter('hold');
          break;
        }
        toPlace();
        break;
      case 'hold':
        if (!reachable) {
          this.enter('return');
          break;
        }
        this.facing = turnToward(this.facing, toPlayer, N.turnRate * dt);
        this.pike = N.pikeHeld;
        this.waitLeft -= dt;
        if (snap()) break;
        if (Math.abs(turnOff) > 0.6 || dist > N.holdRange + 0.9) {
          this.stuck = 0;
          this.enter('march');
          break;
        }
        if (this.waitLeft <= 0 && this.mayAttack && off < 0.35 && !this.close) {
          this.spent = false;
          this.events.push('windup');
          this.enter('windup');
          break;
        }
        // Crowded, it gives ground, its point still on him; drifted, it comes back to its place.
        if (dist < N.crowdRange) {
          moveX = -Math.sin(toPlayer) * N.backSpeed;
          moveZ = -Math.cos(toPlayer) * N.backSpeed;
        } else toPlace();
        break;
      case 'windup': {
        if (this.stateTime < N.windup * N.track) this.facing = turnToward(this.facing, toPlayer, N.turnRate * dt);
        const k = Math.min(1, this.stateTime / (N.windup * 0.6));
        this.pike = N.pikeHeld + (N.pikeBack - N.pikeHeld) * k * k * (3 - 2 * k);
        if (this.stateTime >= N.windup) {
          this.recoverTime = N.recover;
          this.events.push('thrust');
          this.enter('thrust');
        }
        break;
      }
      case 'thrust': {
        forward = N.thrustSpeed;
        const k = Math.min(1, this.stateTime / N.thrustTime);
        this.pike = N.pikeBack + (N.pikeOut - N.pikeBack) * k;
        if (this.stateTime >= N.thrustTime) this.enter('recover');
        break;
      }
      case 'recover': {
        // Stretched out, its point slowly coming back.
        const k = Math.min(1, this.stateTime / this.recoverTime);
        this.pike = N.pikeOut + (N.pikeHeld - N.pikeOut) * k * k;
        if (this.stateTime >= this.recoverTime) {
          this.waitLeft = this.between(N.wait);
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      }
      case 'biteWind':
        this.facing = turnToward(this.facing, toPlayer, N.turnRate * 0.5 * dt);
        if (this.stateTime >= N.biteWind) {
          this.events.push('bite');
          this.enter('bite');
        }
        break;
      case 'bite':
        forward = N.biteSpeed;
        if (this.stateTime >= N.biteTime) this.enter('biteRest');
        break;
      case 'biteRest':
        if (this.stateTime >= N.biteRest) {
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'reel':
        if (this.stateTime >= N.reel) {
          this.waitLeft = this.between(N.wait);
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'stagger':
        if (this.stateTime >= N.stagger) {
          this.waitLeft = Math.min(this.waitLeft, 0.6);
          if (reachable && dist < N.springFrom) {
            // Straight back from him if there is floor that way; if not (a wall, the edge of a ledge), slantwise
            // to whichever side has room.
            const awayFrom = toPlayer + Math.PI;
            this.springDir = awayFrom;
            for (const turn of [0, 0.8, -0.8, 1.4, -1.4]) {
              const tx = this.x + Math.sin(awayFrom + turn) * 2;
              const tz = this.z + Math.cos(awayFrom + turn) * 2;
              if (tx < A.x0 + this.radius || tx > A.x1 - this.radius || tz < A.z0 + this.radius || tz > A.z1 - this.radius) continue;
              if (this.canStand && !this.canStand(tx, this.y, tz, this.radius)) continue;
              this.springDir = awayFrom + turn;
              break;
            }
            this.events.push('spring');
            this.enter('spring');
          } else if (reachable) engage();
          else this.enter('return');
        }
        break;
      case 'spring': {
        // Back out of his reach, quick at first, its face to him.
        this.facing = turnToward(this.facing, toPlayer, N.turnRate * dt);
        const k = Math.max(0, 1 - this.stateTime / N.spring);
        moveX = Math.sin(this.springDir) * N.springSpeed * 2 * k;
        moveZ = Math.cos(this.springDir) * N.springSpeed * 2 * k;
        if (this.stateTime >= N.spring) {
          if (reachable) engage();
          else this.enter('return');
        }
        break;
      }
      case 'return': {
        if (reachable && (this.hunt || this.roused || dist < N.noticeRange * SENSES.notice)) {
          engage();
          break;
        }
        this.roused = false;
        const hx = this.home.x - this.x;
        const hz = this.home.z - this.z;
        if (Math.hypot(hx, hz) < 0.2) {
          this.facing = turnToward(this.facing, this.homeFacing, N.turnRate * dt);
          if (Math.abs(wrap(this.facing - this.homeFacing)) < 0.05) this.enter('idle');
        } else {
          this.facing = turnToward(this.facing, Math.atan2(hx, hz), N.turnRate * dt);
          forward = N.speed * 0.8;
        }
        break;
      }
      case 'dead':
        if (this.respawns && this.stateTime >= N.respawn) {
          this.x = this.home.x;
          this.z = this.home.z;
          this.y = this.homeY;
          this.facing = this.homeFacing;
          this.hp = N.hp;
          this.velX = 0;
          this.velZ = 0;
          this.age = 0;
          this.lastSwing = -1;
          this.waitLeft = 0;
          this.roused = false;
          this.enter('idle');
        }
        break;
    }

    const drag = Math.exp(-9 * dt);
    this.velX *= drag;
    this.velZ *= drag;
    const bx = this.x;
    const bz = this.z;
    this.x += (Math.sin(this.facing) * forward + moveX + this.velX) * dt;
    this.z += (Math.cos(this.facing) * forward + moveZ + this.velZ) * dt;
    this.clamp();
    const went = Math.hypot(this.x - bx, this.z - bz) / Math.max(1e-6, dt);
    this.walking = this.state === 'march' || this.state === 'hold' || this.state === 'return' || this.state === 'spring' ? went : 0;
    // Going round him and getting nowhere (a wall): after a moment it tries the other way round.
    if (this.state === 'march' && Math.hypot(moveX, moveZ) > 1 && went < 0.5) {
      this.stuck += dt;
      if (this.stuck > 0.8 && this.stuck - dt <= 0.8) this.round = this.round === 1 ? -1 : 1;
      if (this.stuck > 2.4) this.stuck = 0;
    } else if (this.state !== 'march') this.stuck = 0;
    this.facing = wrap(this.facing);
    this.point();
  }
}

/**
 * Makes pairs of the ants (call once a tick with all of them, before they move). Two that are near each other are
 * mates until one is dead or they are parted. The nearer of a pair to the rat is its front and the other its flank;
 * they change over only when the other has come clearly nearer, so they do not dither. One of a pair that has seen
 * him wakes the other.
 */
export function pairAnts(ants: Ant[], playerX: number, playerZ: number): void {
  const live = ants.filter((a) => a.alive);
  // Pairs that still hold.
  for (const a of ants) {
    const m = a.mate;
    if (m && (!a.alive || !m.alive || m.mate !== a || Math.hypot(a.x - m.x, a.z - m.z) > ANT.pairRange * 1.5)) {
      a.mate = null;
      if (m.mate === a) m.mate = null;
    }
  }
  // The rest find the nearest of the rest.
  const free = live.filter((a) => !a.mate);
  const pairs: Array<[number, Ant, Ant]> = [];
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
    const d = Math.hypot(free[i].x - free[j].x, free[i].z - free[j].z);
    if (d <= ANT.pairRange && Math.abs(free[i].y - free[j].y) < 0.9) pairs.push([d, free[i], free[j]]);
  }
  pairs.sort((p, q) => p[0] - q[0]);
  for (const [, a, b] of pairs) {
    if (a.mate || b.mate) continue;
    a.mate = b;
    b.mate = a;
  }
  for (const a of live) {
    const m = a.mate;
    if (!m) {
      a.role = 'front';
      continue;
    }
    // (Each pair is seen twice; it is settled the first time.)
    if (live.indexOf(a) > live.indexOf(m)) continue;
    const da = Math.hypot(a.x - playerX, a.z - playerZ);
    const dm = Math.hypot(m.x - playerX, m.z - playerZ);
    const front = a.role === 'front' && m.role === 'flank' ? (dm < da - 0.6 ? m : a) : m.role === 'front' && a.role === 'flank' ? (da < dm - 0.6 ? a : m) : da <= dm ? a : m;
    a.role = front === a ? 'front' : 'flank';
    m.role = front === m ? 'front' : 'flank';
    if (a.awake && !m.awake) m.rouse();
    if (m.awake && !a.awake) a.rouse();
    // He is inside one's point (or cutting at it): the other does not wait its turn out.
    if (a.close || a.state === 'stagger') m.hurry();
    if (m.close || m.state === 'stagger') a.hurry();
  }
}
