/**
 * PLAYABLE CRITTERS: what every one of them shares (2026-11-20). The owner: "do that with the rest of the characters
 * try to make each one of them have its own sort of unique little play style ... they all should have their own
 * unique way of getting around the levels ... just prototypes ... we have like basically two versions of every
 * character anyways."
 *
 * Each character (critters/*.ts) is a controller of its OWN on the knight's buttons (move, run, jump, attack, roll =
 * the knight's dodge, guard): none of them uses the knight's controller (player/controller.ts, not touched) for how it
 * moves. What they share is here: an upright box for a body against the level's boxes and ramps (steps up, keeps to
 * a slope going down it), gravity, water, the wall he last ran into, things thrown that fly and sting, a sting all
 * round, and what the drawing reads to pose the body (`look`) and what it draws in the world (`fx`).
 */
import * as THREE from 'three';
import { topAt, type Aabb } from '../../world/collision';
import type { WaterVolume } from '../../world/layout';

/** What he wants, from the pad: the knight's buttons. */
export interface CritterInput {
  move: THREE.Vector3;
  run: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  /** The knight's dodge. */
  rollPressed: boolean;
  /** The knight's guard (held). */
  guardHeld: boolean;
}

/** A creature he can hurt (any of the game's foes will do). */
export interface CritterTarget {
  x: number;
  y: number;
  z: number;
  radius: number;
  readonly alive: boolean;
  takeHit(damage: number, fromX: number, fromZ: number, how?: 'thrown'): boolean;
  nudge?(dx: number, dz: number): void;
}

export interface CritterWorld {
  colliders: Aabb[];
  water: WaterVolume[];
  foes: CritterTarget[];
}

/** What happened this step: hits (for the game's flash, sound and count), and sounds by name. */
export interface CritterEvents {
  hits: Array<{ foe: CritterTarget; killed: boolean }>;
  sfx: Array<[name: string, vol: number, rate: number]>;
  jumped: boolean;
  landed: number;
}

/** A thing thrown (spit, a dart, a hex): it flies, falls by `gravity`, and stings the first creature it meets. */
export interface Shot {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  gravity: number;
  life: number;
  radius: number;
  color: number;
  damage: number;
  /** Where it ended, and on what (a creature, or the top or side of a solid), or null in flight. */
  end: null | { at: THREE.Vector3; foe: CritterTarget | null; top: boolean; age: number };
  /** Its own thing to do when it lands (the hex marks the ground, dooms a creature); else it stings. */
  kind?: string;
}

/** What the drawing does with the body: each a target its springs pull toward. */
export interface CritterLook {
  /** Forward lean, sideways roll, a turn on the spot (radians); how squashed (- low and wide, + tall); a lift. */
  lean: number;
  roll: number;
  spin: number;
  squash: number;
  lift: number;
  /** Turned over and over (a tumble, a dive): radians, set straight (no spring). */
  tumble: number;
  /** Not drawn at all (under the ground). */
  hidden: boolean;
  /** How the legs go: a step's phase (radians) and how much (0..1). */
  stride: number;
  step: number;
}

/** Things drawn in the world this frame: rings, lines, marks and props (a mound, a falling spool). */
export interface CritterFx {
  rings: Array<{ x: number; y: number; z: number; r: number; alpha: number; color: number }>;
  lines: Array<{ a: THREE.Vector3; b: THREE.Vector3; color: number }>;
  props: Array<{ kind: 'mound' | 'spool' | 'teacup' | 'die' | 'button' | 'ghost'; x: number; y: number; z: number; turn: number; alpha?: number }>;
}

export abstract class Critter {
  readonly position: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  facing = 0;
  grounded = false;
  state = 'idle';
  /** Nothing bites him (dug in, shut in a shell, dancing, a shadow). */
  untouchable = false;
  /** Not knocked back when hit (he stands his ground). */
  steadfast = false;
  readonly shots: Shot[] = [];
  readonly look: CritterLook = { lean: 0, roll: 0, spin: 0, squash: 0, lift: 0, tumble: 0, hidden: false, stride: 0, step: 0 };
  readonly fx: CritterFx = { rings: [], lines: [], props: [] };
  /** The wall he last ran into this step (its outward way, along x or z), or null. */
  wall: { x: number; z: number } | null = null;
  protected time = 0;
  /** In water (and where its surface is), as of this step. */
  protected pool: WaterVolume | null = null;
  abstract readonly radius: number;
  /** His height now (it may change: curled, flat, in his shell). */
  abstract get height(): number;
  /** Where he floats in water: how far under the surface his feet hang. */
  protected sink = 0.55;

  constructor(at: THREE.Vector3) {
    this.position = at.clone();
  }
  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** One step. `pinned`: the game has him (hurt and knocked back, or beaten): he is where it puts him, and does nothing. */
  update(dt: number, input: CritterInput, w: CritterWorld, pinned: 'hurt' | 'dead' | null): CritterEvents {
    const ev: CritterEvents = { hits: [], sfx: [], jumped: false, landed: 0 };
    this.time += dt;
    this.fx.rings.length = 0;
    this.fx.lines.length = 0;
    this.fx.props.length = 0;
    this.stepShots(dt, w, ev);
    const p = this.position;
    this.pool = w.water.find((q) => p.x > q.x0 && p.x < q.x1 && p.z > q.z0 && p.z < q.z1 && p.y < q.y - this.sink + 0.05) ?? null;
    if (pinned) {
      this.state = pinned;
      this.untouchable = false;
      this.pinnedStep(dt);
      return ev;
    }
    this.step(dt, input, w, ev);
    return ev;
  }
  /** His own moves, for one step. */
  protected abstract step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void;
  /** While the game has him (hurt or beaten). */
  protected pinnedStep(_dt: number): void {
    this.look.lean = this.state === 'dead' ? -1.4 : -0.3;
  }

  // ---- Shared moves ----

  /** The stick, as a direction (unit) and how far it is pushed (0..1). */
  protected stick(input: CritterInput): { dir: THREE.Vector3; push: number } {
    const dir = new THREE.Vector3(input.move.x, 0, input.move.z);
    const push = Math.min(1, dir.length());
    if (push > 0.01) dir.normalize();
    return { dir, push };
  }
  /** Walking: toward the speed the stick asks for, so quickly (less so in the air). */
  protected steer(dt: number, input: CritterInput, top: number, accel: number, decel: number, air = 0.35): void {
    const { dir, push } = this.stick(input);
    const v = this.velocity;
    const tx = dir.x * top * push;
    const tz = dir.z * top * push;
    const rate = (push > 0.01 ? accel : decel) * (this.grounded ? 1 : air);
    const dx = tx - v.x;
    const dz = tz - v.z;
    const d = Math.hypot(dx, dz);
    const s = Math.min(d, rate * dt);
    if (d > 1e-6) {
      v.x += (dx / d) * s;
      v.z += (dz / d) * s;
    }
  }
  /** He turns to face the way he is pushed (or, `byVelocity`, the way he is going). */
  protected turnTo(dt: number, input: CritterInput, rate = 14, byVelocity = false): void {
    const { dir, push } = this.stick(input);
    const want = byVelocity ? (this.speed > 0.5 ? Math.atan2(this.velocity.x, this.velocity.z) : this.facing) : push > 0.01 ? Math.atan2(dir.x, dir.z) : this.facing;
    const d = Math.atan2(Math.sin(want - this.facing), Math.cos(want - this.facing));
    this.facing += d * Math.min(1, dt * rate);
  }
  protected forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
  }
  /** Floating in water: his feet `sink` under the surface; a stroke the way the stick says. */
  protected swim(dt: number, input: CritterInput, speed: number, ev: CritterEvents, jump = 6.5): void {
    const pool = this.pool;
    if (!pool) return;
    const { dir, push } = this.stick(input);
    const v = this.velocity;
    v.x += (dir.x * speed * push - v.x) * Math.min(1, dt * 6);
    v.z += (dir.z * speed * push - v.z) * Math.min(1, dt * 6);
    v.y += ((pool.y - this.sink - this.position.y) * 40 - v.y * 8) * dt;
    if (input.jumpPressed) {
      v.y = jump;
      ev.jumped = true;
    }
  }
  /** Moves him by his velocity through the level (and lands him, bumps his head, stops him at walls). */
  protected move(dt: number, w: CritterWorld, ev: CritterEvents, bounce = 0): void {
    const v = this.velocity;
    const was = this.grounded;
    const fall = -v.y;
    this.wall = null;
    this.moveAxis('x', v.x * dt, w.colliders, bounce);
    this.moveAxis('z', v.z * dt, w.colliders, bounce);
    this.unstick(w.colliders);
    this.moveY(v.y * dt, w.colliders);
    if (this.pool) this.grounded = false;
    if (this.grounded && !was) ev.landed = Math.max(ev.landed, fall);
  }
  /** Gravity. */
  protected fall(dt: number, g = 18): void {
    if (!this.pool) this.velocity.y -= g * dt;
  }
  /** Stings every creature within `reach` of a place (at about his height), once. Returns what it stung. */
  protected stingAround(x: number, y: number, z: number, reach: number, damage: number, w: CritterWorld, ev: CritterEvents, knock = 0): CritterTarget[] {
    const hit: CritterTarget[] = [];
    for (const f of w.foes) {
      if (!f.alive || Math.abs(f.y - y) > 1.2) continue;
      const dx = f.x - x;
      const dz = f.z - z;
      const d = Math.hypot(dx, dz);
      if (d > reach + f.radius) continue;
      f.takeHit(damage, x, z, 'thrown');
      if (knock && f.nudge && d > 1e-3) f.nudge((dx / d) * knock, (dz / d) * knock);
      ev.hits.push({ foe: f, killed: !f.alive });
      hit.push(f);
    }
    return hit;
  }
  /** Stings what is in front of him (a bite, a peck, a swipe). */
  protected stingAhead(reach: number, arc: number, damage: number, w: CritterWorld, ev: CritterEvents): number {
    const p = this.position;
    let n = 0;
    for (const f of w.foes) {
      if (!f.alive || Math.abs(f.y - p.y) > 1.2) continue;
      const dx = f.x - p.x;
      const dz = f.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > reach + f.radius + this.radius) continue;
      const off = Math.atan2(Math.sin(Math.atan2(dx, dz) - this.facing), Math.cos(Math.atan2(dx, dz) - this.facing));
      if (Math.abs(off) > arc) continue;
      f.takeHit(damage, p.x, p.z, 'thrown');
      ev.hits.push({ foe: f, killed: !f.alive });
      n++;
    }
    return n;
  }
  /** Throws something from about his chest, the way he faces (turned by `turn`), at this speed and rise. */
  protected throwShot(speed: number, up: number, gravity: number, o: Partial<Shot> & { turn?: number; at?: number } = {}): Shot {
    const a = this.facing + (o.turn ?? 0);
    const p = this.position;
    const s: Shot = {
      pos: new THREE.Vector3(p.x + Math.sin(a) * (this.radius + 0.1), p.y + (o.at ?? this.height * 0.6), p.z + Math.cos(a) * (this.radius + 0.1)),
      vel: new THREE.Vector3(Math.sin(a) * speed, up, Math.cos(a) * speed),
      gravity,
      life: o.life ?? 1.5,
      radius: o.radius ?? 0.1,
      color: o.color ?? 0xffffff,
      damage: o.damage ?? 1,
      end: null,
      kind: o.kind,
    };
    this.shots.push(s);
    return s;
  }
  /** What a shot does when it ends (the base: it has already stung a creature; nothing else). */
  protected shotEnded(_s: Shot, _w: CritterWorld, _ev: CritterEvents): void {}

  private stepShots(dt: number, w: CritterWorld, ev: CritterEvents): void {
    for (const s of this.shots) {
      if (s.end) {
        s.end.age += dt;
        continue;
      }
      s.life -= dt;
      s.vel.y -= s.gravity * dt;
      const from = s.pos.clone();
      s.pos.addScaledVector(s.vel, dt);
      const q = s.pos;
      const foe = w.foes.find((f) => f.alive && Math.hypot(f.x - q.x, f.z - q.z) < f.radius + s.radius && q.y > f.y - 0.1 && q.y < f.y + 1.1);
      if (foe) {
        if (!s.kind) {
          foe.takeHit(s.damage, from.x, from.z, 'thrown');
          ev.hits.push({ foe, killed: !foe.alive });
        }
        s.end = { at: q.clone(), foe, top: false, age: 0 };
      } else {
        const box = w.colliders.find((b) => q.x > b.min.x && q.x < b.max.x && q.z > b.min.z && q.z < b.max.z && q.y < topAt(b, q.x, q.z) && q.y > b.min.y);
        if (box) {
          // (Came down onto its top, or went into its side.)
          const top = from.y >= topAt(box, from.x, from.z) - 0.02 && Critter.standable(box);
          const at = q.clone();
          if (top) at.y = topAt(box, q.x, q.z);
          s.end = { at, foe: null, top, age: 0 };
        } else if (s.life <= 0) s.end = { at: q.clone(), foe: null, top: false, age: 0 };
      }
      if (s.end) this.shotEnded(s, w, ev);
    }
    for (let i = this.shots.length - 1; i >= 0; i--) if (this.shots[i].end && this.shots[i].end!.age > 0.4) this.shots.splice(i, 1);
  }

  // ---- His body against the level ----

  protected blocks(b: Aabb, x: number, z: number, r: number, step = 0.32): boolean {
    const p = this.position;
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) return false;
    if (topAt(b, x, z) <= p.y + (this.grounded ? step : 0.05)) return false;
    if (b.min.y >= p.y + this.height) return false;
    return true;
  }
  protected moveAxis(axis: 'x' | 'z', d: number, colliders: Aabb[], bounce = 0): void {
    if (d === 0) return;
    const p = this.position;
    const r = this.radius;
    const old = p[axis];
    p[axis] += d;
    for (const b of colliders) {
      if (!this.blocks(b, p.x, p.z, r)) continue;
      // (Only a solid this move ran him INTO stops it. One he was already within along this way, however he came to
      // be, is not backed out of along it: that put him out through its far side, and out of the room. See `unstick`.)
      if (old + r > b.min[axis] + 1e-3 && old - r < b.max[axis] - 1e-3) continue;
      p[axis] = d > 0 ? b.min[axis] - r - 1e-4 : b.max[axis] + r + 1e-4;
      this.wall = axis === 'x' ? { x: d > 0 ? -1 : 1, z: 0 } : { x: 0, z: d > 0 ? -1 : 1 };
      this.velocity[axis] = bounce > 0 && Math.abs(this.velocity[axis]) > 2 ? -this.velocity[axis] * bounce : 0;
    }
  }
  /** Found within a solid (he stood up into it, landed half on it, was put there): out by its NEAREST side. */
  protected unstick(colliders: Aabb[]): void {
    const p = this.position;
    const r = this.radius;
    for (const b of colliders) {
      if (!this.blocks(b, p.x, p.z, r)) continue;
      // (Within a slope: up onto its surface, not out of its end.)
      if (b.ramp) {
        if (p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z) p.y = Math.max(p.y, topAt(b, p.x, p.z));
        continue;
      }
      const out = [p.x + r - b.min.x, b.max.x - (p.x - r), p.z + r - b.min.z, b.max.z - (p.z - r)];
      const least = Math.min(...out);
      if (least === out[0]) p.x = b.min.x - r - 1e-4;
      else if (least === out[1]) p.x = b.max.x + r + 1e-4;
      else if (least === out[2]) p.z = b.min.z - r - 1e-4;
      else p.z = b.max.z + r + 1e-4;
    }
  }
  /** A top wide enough to stand on (not the top of a thin wall: the room's own walls among them). */
  protected static standable(b: Aabb): boolean {
    return b.max.x - b.min.x >= 1.5 && b.max.z - b.min.z >= 1.5;
  }
  /** The ground under him (the highest top no more than a step above his feet), or -Infinity. */
  protected groundUnder(colliders: Aabb[], step = 0.32): number {
    const p = this.position;
    const r = this.radius * 0.7;
    let ground = -Infinity;
    for (const b of colliders) {
      if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
      const top = topAt(b, Math.max(b.min.x, Math.min(b.max.x, p.x)), Math.max(b.min.z, Math.min(b.max.z, p.z)));
      if (top <= p.y + step + 1e-3 && top > ground) ground = top;
    }
    return ground;
  }
  protected moveY(d: number, colliders: Aabb[]): void {
    const p = this.position;
    const r = this.radius * 0.7;
    const ground = this.groundUnder(colliders);
    const ny = p.y + d;
    const snap = this.grounded && d <= 0 && ground > -Infinity && p.y - ground < 0.32 + this.speed / 30;
    if (ny <= ground || snap) {
      p.y = ground;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.grounded = true;
      return;
    }
    if (d > 0) {
      for (const b of colliders) {
        if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
        if (b.min.y >= p.y + this.height - 1e-3 && ny + this.height > b.min.y) {
          p.y = b.min.y - this.height;
          this.velocity.y = 0;
          this.grounded = false;
          return;
        }
      }
    }
    p.y = ny;
    this.grounded = false;
  }
  /** Room over him to be this tall. */
  roomFor(height: number, colliders: Aabb[]): boolean {
    const p = this.position;
    const r = this.radius;
    // (Anything solid between his feet and that height: a roof over him, or a wall he is standing in.)
    return !colliders.some((b) => p.x + r > b.min.x && p.x - r < b.max.x && p.z + r > b.min.z && p.z - r < b.max.z && topAt(b, p.x, p.z) > p.y + 0.05 && b.min.y < p.y + height);
  }
  /** The ordinary states, from how he is moving. */
  protected plainState(walk: number): string {
    if (this.pool) return 'swim';
    if (!this.grounded) return this.velocity.y > 0 ? 'jump' : 'fall';
    return this.speed > walk + 0.3 ? 'run' : this.speed > 0.3 ? 'walk' : 'idle';
  }
  /** The legs: a step phase from how far he has gone. */
  protected strideOn(dt: number, stepLength: number): void {
    const moving = this.grounded && this.speed > 0.25;
    if (moving) this.look.stride += dt * Math.min(7, this.speed / (2 * stepLength)) * Math.PI * 2;
    this.look.step = moving ? Math.min(1, this.speed / 2) : 0;
  }
}
