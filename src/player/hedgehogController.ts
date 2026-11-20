/**
 * BRAMBLE, PLAYED (2026-11-20). The owner: "he's not a knight, he's a hedgehog so you got to give him other stuff to do
 * ... make him roll around like a hedgehog ... like a Metroid kind of thing ... maybe he can spit something like a
 * little ranged attack ... get all the other characters to move around like the main character, not give all the
 * other characters the movement of the main character."
 *
 * So the hedgehog has his OWN controls and his own moves (the knight's controller, player/controller.ts, is not used
 * for any of this and is not touched). On the same buttons:
 *   MOVE      he walks (a waddle) and, held to run, scurries. Slower than the knight: short legs.
 *   JUMP      a little hop (short legs). No second jump; no ledge grabs: he is no climber.
 *   ROLL      (the dodge button) he CURLS INTO A BALL, and stays one until it is pressed again. A ball ROLLS: it builds
 *             speed and keeps it, runs away downhill, BOUNCES off walls and off the ground when it lands hard, goes
 *             through gaps too low to walk through, and RAMS what it rolls into (spines first). It jumps too.
 *             (He cannot uncurl under a roof too low to stand.)
 *   ATTACK    on his feet: he SPITS a glob, a short arc ahead of him, that stings what it hits. Curled: a SPINE BURST,
 *             all round him, close.
 * In water he paddles, his back at the waterline. His health, being hit and being beaten are still the game's own
 * (main.ts runs the knight's controller under him only for that: where he is is always the hedgehog's own).
 * All its numbers are in HOG.
 */
import * as THREE from 'three';
import { topAt, slopeXZ, type Aabb } from '../world/collision';
import type { WaterVolume } from '../world/layout';

export const HOG = {
  /** On his feet: his size, his walk and his scurry, how quick to get going and to stop, his hop. */
  radius: 0.28,
  height: 0.85,
  walk: 2.6,
  run: 4.6,
  accel: 22,
  decel: 20,
  turn: 14,
  jump: 7.2,
  gravity: 18,
  step: 0.32,
  /** Curled: his size; how hard he can push the ball along, how fast at most by his own pushing, how little it slows. */
  ball: { height: 0.58, push: 13, top: 8.5, roll: 0.6, jump: 6.2, hill: 0.9, wallBounce: 0.6, floorBounce: 0.45, bounceFrom: 6 },
  /** Ramming: as fast as this, rolling into a creature hurts it (once in this long), and he rebounds. */
  ram: { speed: 4.5, damage: 1, every: 0.5, rebound: 0.55 },
  /** The spit: how fast, how high it is thrown, how it falls, how long it lasts, its sting, how often. */
  spit: { speed: 11, up: 1.6, gravity: 7, life: 1.2, damage: 1, every: 0.42, radius: 0.12 },
  /** The spine burst: how far, its sting, how often. */
  burst: { reach: 1.35, damage: 1, every: 1.0 },
  /** Swimming: how low he floats (his back at the waterline), how fast he paddles. */
  swim: { sink: 0.36, speed: 2.4 },
} as const;

/** Thistle's quills (three, flat and fast) and her pogo (the first bounce, how much higher each, the most). */
export const QUILLS = { spread: 0.25, speed: 15, up: 0.6, life: 0.7 } as const;
export const POGO = { first: 7.5, more: 1.15, most: 13 } as const;

/** What he wants, from the pad: the same buttons as the knight's. */
export interface HogInput {
  move: THREE.Vector3;
  run: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  /** The roll button (the knight's dodge). */
  rollPressed: boolean;
}

/** A creature he can hurt (any of the game's foes will do). */
export interface HogTarget {
  x: number;
  y: number;
  z: number;
  radius: number;
  readonly alive: boolean;
  takeHit(damage: number, fromX: number, fromZ: number, how?: 'thrown'): boolean;
}

export type HogState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'ball' | 'swim' | 'hurt' | 'dead';

/** A glob of spit in flight. */
export interface Glob {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  /** Where it ended (on a wall, the floor or a creature), for a splat, else null. */
  splat: THREE.Vector3 | null;
}

/** What happened this step, for the game to show and sound. */
export interface HogEvents {
  hits: Array<{ foe: HogTarget; killed: boolean; how: 'spit' | 'ram' | 'burst' }>;
  jumped: boolean;
  landed: number;
  curled: boolean;
  uncurled: boolean;
  spat: boolean;
  burst: boolean;
  bounced: number;
  splats: THREE.Vector3[];
}

export class HedgehogController {
  readonly position: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  facing = 0;
  grounded = false;
  curled = false;
  state: HogState = 'idle';
  /** How far the ball has turned over (radians), for the drawing. */
  rollAngle = 0;
  /** Seconds since he last spat (for the drawing: his cheeks, his head thrown forward), and since the spine burst. */
  spitT = 9;
  burstT = 9;
  readonly globs: Glob[] = [];
  private spitWait = 0;
  private burstWait = 0;
  private readonly rammed = new Map<HogTarget, number>();
  private time = 0;

  /**
   * Which of the two: BRAMBLE spits and rolls (above). THISTLE (2026-11-20, the second hedgehog's own way): her ball
   * is a POGO, every landing with JUMP held bounces her higher than the last (up to a point), and on her feet ATTACK
   * flings a FAN OF THREE QUILLS, flat and fast, in place of the spit.
   */
  constructor(at: THREE.Vector3, readonly look: 'bramble' | 'thistle' = 'bramble') {
    this.position = at.clone();
  }
  /** Thistle's pogo: how high the last bounce went (it builds). */
  private pogo = 0;

  get height(): number {
    return this.curled ? HOG.ball.height : HOG.height;
  }
  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /**
   * One step. `pinned`: the game has him (hurt, knocked back, or beaten): he goes where it puts him and does nothing.
   */
  update(dt: number, input: HogInput, colliders: Aabb[], water: WaterVolume[], foes: HogTarget[], pinned: 'hurt' | 'dead' | null): HogEvents {
    const ev: HogEvents = { hits: [], jumped: false, landed: 0, curled: false, uncurled: false, spat: false, burst: false, bounced: 0, splats: [] };
    this.time += dt;
    this.spitT += dt;
    this.burstT += dt;
    this.spitWait = Math.max(0, this.spitWait - dt);
    this.burstWait = Math.max(0, this.burstWait - dt);
    for (const [f, t] of this.rammed) if (t <= this.time) this.rammed.delete(f);
    this.stepGlobs(dt, colliders, foes, ev);
    if (pinned) {
      this.state = pinned;
      return ev;
    }
    const p = this.position;
    const v = this.velocity;
    const pool = water.find((w) => p.x > w.x0 && p.x < w.x1 && p.z > w.z0 && p.z < w.z1 && p.y < w.y - HOG.swim.sink + 0.05);
    const want = new THREE.Vector3(input.move.x, 0, input.move.z);
    const push = Math.min(1, want.length());
    if (push > 0.01) want.normalize();

    // ---- Curling up and uncurling (not under a roof too low to stand in) ----
    if (input.rollPressed && !pool) {
      if (!this.curled) {
        this.curled = true;
        ev.curled = true;
      } else if (this.roomToStand(colliders)) {
        this.curled = false;
        ev.uncurled = true;
      }
    }

    // ---- Moving ----
    if (pool) {
      // Paddling: slow, steady; his back at the waterline, a hop out at the edge.
      this.curled = false;
      const target = want.clone().multiplyScalar(HOG.swim.speed * push);
      v.x += (target.x - v.x) * Math.min(1, dt * 6);
      v.z += (target.z - v.z) * Math.min(1, dt * 6);
      const float = pool.y - HOG.swim.sink;
      v.y += ((float - p.y) * 40 - v.y * 8) * dt;
      if (input.jumpPressed) {
        v.y = HOG.jump;
        ev.jumped = true;
      }
    } else if (this.curled) {
      // A ball: pushed along, it builds speed and keeps it; it rolls away downhill.
      if (push > 0.01 && this.speed < HOG.ball.top) {
        v.x += want.x * HOG.ball.push * push * dt;
        v.z += want.z * HOG.ball.push * push * dt;
      }
      const k = Math.max(0, 1 - HOG.ball.roll * dt * (this.grounded ? 1 : 0.2));
      v.x *= k;
      v.z *= k;
      const hill = this.grounded ? this.groundSlope(colliders) : null;
      if (hill) {
        v.x -= hill[0] * HOG.gravity * HOG.ball.hill * dt;
        v.z -= hill[1] * HOG.gravity * HOG.ball.hill * dt;
      }
      if (input.jumpPressed && this.grounded) {
        v.y = HOG.ball.jump;
        this.grounded = false;
        ev.jumped = true;
      }
    } else {
      // On his feet: quick to get going and to stop (he is small), a walk or a scurry.
      const top = (input.run ? HOG.run : HOG.walk) * push;
      const target = want.clone().multiplyScalar(top);
      const rate = (push > 0.01 ? HOG.accel : HOG.decel) * (this.grounded ? 1 : 0.35);
      const dx = target.x - v.x;
      const dz = target.z - v.z;
      const d = Math.hypot(dx, dz);
      const s = Math.min(d, rate * dt);
      if (d > 1e-6) {
        v.x += (dx / d) * s;
        v.z += (dz / d) * s;
      }
      if (input.jumpPressed && this.grounded) {
        v.y = HOG.jump;
        this.grounded = false;
        ev.jumped = true;
      }
      // (Let go early, a shorter hop.)
      if (!input.jumpHeld && v.y > 0 && !this.grounded) v.y -= HOG.gravity * dt;
    }
    // He faces the way he is going (on his feet, the way he is pushed).
    const face = this.curled ? (this.speed > 0.5 ? Math.atan2(v.x, v.z) : this.facing) : push > 0.01 ? Math.atan2(want.x, want.z) : this.facing;
    const df = Math.atan2(Math.sin(face - this.facing), Math.cos(face - this.facing));
    this.facing += df * Math.min(1, dt * HOG.turn);

    // ---- Spit and burst ----
    if (input.attackPressed) {
      if (!this.curled && this.spitWait <= 0) {
        this.spitWait = HOG.spit.every;
        this.spitT = 0;
        for (const turn of this.look === 'thistle' ? [-QUILLS.spread, 0, QUILLS.spread] : [0]) {
          const fx = Math.sin(this.facing + turn);
          const fz = Math.cos(this.facing + turn);
          const quill = this.look === 'thistle';
          this.globs.push({
            pos: new THREE.Vector3(p.x + fx * 0.35, p.y + 0.55, p.z + fz * 0.35),
            vel: new THREE.Vector3(fx * (quill ? QUILLS.speed : HOG.spit.speed) + v.x * 0.5, quill ? QUILLS.up : HOG.spit.up, fz * (quill ? QUILLS.speed : HOG.spit.speed) + v.z * 0.5),
            life: quill ? QUILLS.life : HOG.spit.life,
            splat: null,
          });
        }
        ev.spat = true;
      } else if (this.curled && this.burstWait <= 0) {
        this.burstWait = HOG.burst.every;
        this.burstT = 0;
        ev.burst = true;
        for (const f of foes) {
          if (!f.alive || Math.abs(f.y - p.y) > 1) continue;
          if (Math.hypot(f.x - p.x, f.z - p.z) <= HOG.burst.reach + f.radius) {
            f.takeHit(HOG.burst.damage, p.x, p.z, 'thrown');
            ev.hits.push({ foe: f, killed: !f.alive, how: 'burst' });
          }
        }
      }
    }

    // ---- Falling, moving, hitting things ----
    if (!pool) v.y -= HOG.gravity * dt;
    const wasGrounded = this.grounded;
    const fallSpeed = -v.y;
    this.moveAxis('x', v.x * dt, colliders, ev);
    this.moveAxis('z', v.z * dt, colliders, ev);
    this.moveY(v.y * dt, colliders);
    if (this.grounded && !wasGrounded) {
      ev.landed = fallSpeed;
      // A ball that comes down hard bounces.
      if (this.curled && this.look === 'thistle' && input.jumpHeld && fallSpeed > 2) {
        // Thistle's pogo: held, every landing bounces higher than the last.
        this.pogo = Math.min(POGO.most, Math.max(POGO.first, this.pogo * POGO.more));
        v.y = this.pogo;
        this.grounded = false;
        ev.bounced = fallSpeed;
      } else if (this.curled && fallSpeed > HOG.ball.bounceFrom) {
        v.y = fallSpeed * HOG.ball.floorBounce;
        this.grounded = false;
        ev.bounced = fallSpeed;
      } else this.pogo = 0;
    }
    if (pool) this.grounded = false;
    // Ramming: rolling fast into a creature, spines first.
    if (this.curled && this.speed >= HOG.ram.speed) {
      for (const f of foes) {
        if (!f.alive || this.rammed.has(f) || Math.abs(f.y - p.y) > 0.8) continue;
        const dx = f.x - p.x;
        const dz = f.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d > f.radius + HOG.radius + 0.1) continue;
        f.takeHit(HOG.ram.damage, p.x, p.z, 'thrown');
        this.rammed.set(f, this.time + HOG.ram.every);
        ev.hits.push({ foe: f, killed: !f.alive, how: 'ram' });
        // He rebounds off it.
        const nx = dx / (d || 1);
        const nz = dz / (d || 1);
        const into = v.x * nx + v.z * nz;
        if (into > 0) {
          v.x -= (1 + HOG.ram.rebound) * into * nx;
          v.z -= (1 + HOG.ram.rebound) * into * nz;
        }
        v.y = Math.max(v.y, 2.5);
      }
    }
    if (this.curled) this.rollAngle += (this.speed / (HOG.ball.height / 2)) * dt;

    this.state = pool ? 'swim' : this.curled ? 'ball' : !this.grounded ? (v.y > 0 ? 'jump' : 'fall') : this.speed > HOG.walk + 0.3 ? 'run' : this.speed > 0.3 ? 'walk' : 'idle';
    return ev;
  }

  // ---- His own collision: a short upright box round him, against the level's boxes and ramps ----

  /** The solids that stand in his way at his height (not ones he could step up onto, nor ones under or over him). */
  private blocks(b: Aabb, x: number, z: number, r: number): boolean {
    const p = this.position;
    if (x + r <= b.min.x || x - r >= b.max.x || z + r <= b.min.z || z - r >= b.max.z) return false;
    const top = topAt(b, x, z);
    if (top <= p.y + (this.grounded ? HOG.step : 0.05)) return false;
    if (b.min.y >= p.y + this.height) return false;
    return true;
  }
  private moveAxis(axis: 'x' | 'z', d: number, colliders: Aabb[], ev: HogEvents): void {
    if (d === 0) return;
    const p = this.position;
    const r = HOG.radius;
    p[axis] += d;
    for (const b of colliders) {
      if (!this.blocks(b, p.x, p.z, r)) continue;
      // Back out to its face.
      p[axis] = d > 0 ? b.min[axis] - r - 1e-4 : b.max[axis] + r + 1e-4;
      const hit = Math.abs(this.velocity[axis]);
      // A ball rolling fast BOUNCES off a wall; on his feet, he stops.
      if (this.curled && hit > 2.5) {
        this.velocity[axis] = -this.velocity[axis] * HOG.ball.wallBounce;
        ev.bounced = Math.max(ev.bounced, hit);
      } else this.velocity[axis] = 0;
    }
  }
  private moveY(d: number, colliders: Aabb[]): void {
    const p = this.position;
    const r = HOG.radius * 0.7;
    // The ground: the highest top under his feet, no higher than a step above them.
    let ground = -Infinity;
    for (const b of colliders) {
      if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
      const top = topAt(b, Math.max(b.min.x, Math.min(b.max.x, p.x)), Math.max(b.min.z, Math.min(b.max.z, p.z)));
      if (top <= p.y + HOG.step + 1e-3 && top > ground) ground = top;
    }
    const ny = p.y + d;
    // (Going down a slope he keeps to it, not hopping off its surface step by step: by as much more as he is going
    // fast, or a steep slope drops away under him faster than a step and he flies off its top.)
    const snap = this.grounded && d <= 0 && ground > -Infinity && p.y - ground < HOG.step + this.speed * (1 / 30);
    if (ny <= ground || snap) {
      p.y = ground;
      if (this.velocity.y < 0) this.velocity.y = 0;
      this.grounded = true;
    } else {
      // A roof: he bumps his head on it.
      for (const b of colliders) {
        if (p.x + r <= b.min.x || p.x - r >= b.max.x || p.z + r <= b.min.z || p.z - r >= b.max.z) continue;
        if (b.min.y >= p.y + this.height - 1e-3 && ny + this.height > b.min.y && d > 0) {
          p.y = b.min.y - this.height;
          this.velocity.y = 0;
          this.grounded = false;
          return;
        }
      }
      p.y = ny;
      this.grounded = false;
    }
  }
  /** The slope under him (its rise for one unit of x and of z), if he is on a ramp. */
  private groundSlope(colliders: Aabb[]): [number, number] | null {
    const p = this.position;
    for (const b of colliders) {
      if (!b.ramp || p.x < b.min.x || p.x > b.max.x || p.z < b.min.z || p.z > b.max.z) continue;
      if (Math.abs(topAt(b, p.x, p.z) - p.y) < 0.1) return slopeXZ(b);
    }
    return null;
  }
  /** Room over him to stand up in. */
  roomToStand(colliders: Aabb[]): boolean {
    const p = this.position;
    const r = HOG.radius;
    return !colliders.some((b) => p.x + r > b.min.x && p.x - r < b.max.x && p.z + r > b.min.z && p.z - r < b.max.z && b.min.y >= p.y + 0.05 && b.min.y < p.y + HOG.height);
  }

  private stepGlobs(dt: number, colliders: Aabb[], foes: HogTarget[], ev: HogEvents): void {
    for (const g of this.globs) {
      if (g.splat) continue;
      g.life -= dt;
      g.vel.y -= HOG.spit.gravity * dt;
      g.pos.addScaledVector(g.vel, dt);
      const q = g.pos;
      const hitFoe = foes.find((f) => f.alive && Math.hypot(f.x - q.x, f.z - q.z) < f.radius + HOG.spit.radius && q.y > f.y - 0.1 && q.y < f.y + 1.1);
      if (hitFoe) {
        hitFoe.takeHit(HOG.spit.damage, q.x - g.vel.x, q.z - g.vel.z, 'thrown');
        ev.hits.push({ foe: hitFoe, killed: !hitFoe.alive, how: 'spit' });
        g.splat = q.clone();
        g.life = 0;
      } else if (colliders.some((b) => q.x > b.min.x && q.x < b.max.x && q.z > b.min.z && q.z < b.max.z && q.y < topAt(b, q.x, q.z) && q.y > b.min.y) || g.life <= 0) {
        g.splat = q.clone();
        g.life = 0;
      }
      if (g.splat) ev.splats.push(g.splat);
    }
    // (A splat is shown a moment by the drawing, then the glob is gone.)
    for (let i = this.globs.length - 1; i >= 0; i--) if (this.globs[i].splat && this.globs[i].life < -0.4) this.globs.splice(i, 1);
    for (const g of this.globs) if (g.splat) g.life -= dt;
  }
}
