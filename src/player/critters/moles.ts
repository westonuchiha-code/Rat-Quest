/**
 * THE MOLES, PLAYED (2026-11-20).
 *
 * DIGGER (the miner, a lamp on his helmet): he DIGS. ROLL takes him down under the floor, and up again. Under it he
 * goes fast, nothing can touch him, and only a mound of earth moving over him shows where he is; he goes UNDER walls,
 * gates and all, where the floor goes on beneath them (not over a pit, not where there is no floor). He comes up only
 * where there is room to stand. ATTACK underground: he BURSTS UP, throwing what is over him into the air. On top: a
 * swipe of his big spade paws. A small hop: he is no jumper.
 *
 * DOT (spectacles, a knitted scarf): she throws her YARN. ATTACK casts a line of wool ahead and up; if it catches a
 * ledge or the top of something, she is reeled up onto it. If it catches a creature, she reels IT in (and it is
 * stung). A small hop too. ROLL: a quick tumble aside.
 */
import * as THREE from 'three';
import { segmentAabbT, topAt } from '../../world/collision';
import { Critter, type CritterEvents, type CritterInput, type CritterWorld } from './base';

export const DIGGER = { radius: 0.3, height: 0.95, walk: 2.4, run: 3.6, jump: 6.4, under: 5.2, burst: { reach: 1.4, damage: 2, up: 8 }, swipe: { reach: 0.6, damage: 1, every: 0.4 } } as const;

export class DiggerCritter extends Critter {
  readonly radius = DIGGER.radius;
  /** Under the floor, and at what height the floor's top is there. */
  dug = false;
  private digY = 0;
  private wait = 0;
  get height(): number {
    return this.dug ? 0.2 : DIGGER.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    this.wait = Math.max(0, this.wait - dt);
    const p = this.position;
    const v = this.velocity;
    if (this.dug) {
      // Under the floor: on the level of the floor's top, wherever the floor goes on (walls and all over him).
      const { dir, push } = this.stick(input);
      const tx = p.x + dir.x * DIGGER.under * push * dt;
      const tz = p.z + dir.z * DIGGER.under * push * dt;
      const floorAt = (x: number, z: number): boolean => w.colliders.some((b) => x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && Math.abs(topAt(b, x, z) - this.digY) < 0.06 && !b.ramp);
      if (floorAt(tx, p.z)) p.x = tx;
      if (floorAt(p.x, tz)) p.z = tz;
      v.set(dir.x * DIGGER.under * push, 0, dir.z * DIGGER.under * push);
      p.y = this.digY;
      this.turnTo(dt, input, 10);
      this.untouchable = true;
      const room = this.roomFor(DIGGER.height, w.colliders);
      if ((input.rollPressed || input.attackPressed) && room) {
        this.dug = false;
        this.untouchable = false;
        ev.sfx.push(['pebbles', 0.8, 1.1]);
        if (input.attackPressed) {
          // Bursting up: what is over him is thrown up and stung.
          v.y = DIGGER.burst.up;
          this.grounded = false;
          this.stingAround(p.x, p.y, p.z, DIGGER.burst.reach, DIGGER.burst.damage, w, ev, 1.2);
          this.fx.rings.push({ x: p.x, y: p.y + 0.05, z: p.z, r: DIGGER.burst.reach, alpha: 0.8, color: 0x8a6a44 });
          ev.sfx.push(['crate', 0.8, 0.8]);
        }
      } else if ((input.rollPressed || input.attackPressed) && !room) ev.sfx.push(['chipBuzz', 0.3, 0.6]);
      // A trail of earth heaved up over him (while he is still under).
      if (this.dug) this.fx.props.push({ kind: 'mound', x: p.x, y: p.y, z: p.z, turn: this.facing });
      this.look.hidden = this.dug;
      this.state = this.dug ? 'dug' : 'idle';
      return;
    }
    this.look.hidden = false;
    this.untouchable = false;
    if (this.pool) this.swim(dt, input, 2.0, ev);
    else {
      this.steer(dt, input, input.run ? DIGGER.run : DIGGER.walk, 18, 20);
      if (input.jumpPressed && this.grounded) {
        v.y = DIGGER.jump;
        this.grounded = false;
        ev.jumped = true;
      }
      if (input.rollPressed && this.grounded) {
        // Down he goes (on any floor flat enough to dig).
        this.dug = true;
        this.untouchable = true;
        this.digY = p.y;
        v.set(0, 0, 0);
        ev.sfx.push(['pebbles', 0.8, 0.9]);
        this.fx.rings.push({ x: p.x, y: p.y + 0.05, z: p.z, r: 0.6, alpha: 0.8, color: 0x8a6a44 });
        this.state = 'dug';
        return;
      }
      if (input.attackPressed && this.wait <= 0) {
        this.wait = DIGGER.swipe.every;
        this.stingAhead(DIGGER.swipe.reach, 1.2, DIGGER.swipe.damage, w, ev);
        ev.sfx.push(['swing', 0.5, 1.4]);
        this.look.spin = 0.6;
      }
    }
    this.turnTo(dt, input);
    this.fall(dt);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.22);
    this.look.lean = 0.25 * Math.min(1, this.speed / DIGGER.run);
    this.look.spin *= 0.85;
    this.state = this.plainState(DIGGER.walk);
  }
}

export const DOT = { radius: 0.3, height: 0.95, walk: 2.6, run: 3.8, jump: 6.6, yarn: { reach: 9, rise: 0.75, reel: 11, damage: 1, pull: 3, every: 0.6 } } as const;

export class DotCritter extends Critter {
  readonly radius = DOT.radius;
  /** Being reeled up to where the yarn caught, or null. */
  private reel: THREE.Vector3 | null = null;
  /** The yarn's line, for the drawing (from her to where it caught, or out to its end and falling short). */
  private line: { to: THREE.Vector3; t: number } | null = null;
  private wait = 0;
  get height(): number {
    return DOT.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    this.wait = Math.max(0, this.wait - dt);
    const p = this.position;
    const v = this.velocity;
    if (this.line) {
      this.line.t -= dt;
      this.fx.lines.push({ a: p.clone().setY(p.y + 0.6), b: this.reel ?? this.line.to, color: 0x3a8a6a });
      if (this.line.t <= 0 && !this.reel) this.line = null;
    }
    if (this.reel) {
      // Reeled in: straight to where it caught, then onto it.
      const to = this.reel;
      const d = to.clone().sub(p);
      const len = d.length();
      if (len < 0.3 || input.rollPressed) {
        p.copy(to);
        v.set(0, 0, 0);
        this.reel = null;
        this.line = null;
        this.grounded = false;
        ev.sfx.push(['land', 0.5, 1.3]);
      } else {
        // (Straight there, up and over its edge: the wool takes her past it.)
        v.copy(d.multiplyScalar(DOT.yarn.reel / len));
        p.addScaledVector(v, Math.min(dt, len / DOT.yarn.reel));
      }
      this.state = 'reel';
      this.look.lean = 0.6;
      return;
    }
    if (this.pool) this.swim(dt, input, 2.0, ev);
    else {
      this.steer(dt, input, input.run ? DOT.run : DOT.walk, 18, 20);
      if (input.jumpPressed && this.grounded) {
        v.y = DOT.jump;
        this.grounded = false;
        ev.jumped = true;
      }
      if (input.rollPressed && this.grounded) {
        const f = this.forward();
        v.x += f.z * 4;
        v.z -= f.x * 4;
        v.y = 3;
        this.grounded = false;
        this.look.tumble = 0.01;
        ev.sfx.push(['dodge', 0.5, 1.2]);
      }
      // (From the ground only: cast again and again in the air, she went up any wall, and over the room's.)
      if (input.attackPressed && this.wait <= 0 && this.grounded) this.cast(w, ev);
    }
    if (this.look.tumble !== 0) this.look.tumble = this.grounded ? 0 : this.look.tumble + dt * 12;
    this.turnTo(dt, input);
    this.fall(dt);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.22);
    this.look.lean = 0.25 * Math.min(1, this.speed / DOT.run);
    this.state = this.plainState(DOT.walk);
  }
  /** Casts the yarn: ahead and up; it catches the first thing it meets. */
  private cast(w: CritterWorld, ev: CritterEvents): void {
    this.wait = DOT.yarn.every;
    const p = this.position;
    const f = this.forward();
    const from = new THREE.Vector3(p.x, p.y + 0.6, p.z);
    const dir = new THREE.Vector3(f.x * Math.cos(DOT.yarn.rise), Math.sin(DOT.yarn.rise), f.z * Math.cos(DOT.yarn.rise));
    const end = from.clone().addScaledVector(dir, DOT.yarn.reach);
    ev.sfx.push(['whoosh', 0.6, 1.5]);
    // A creature in the way: it is caught, stung, and pulled to her.
    for (const foe of w.foes) {
      if (!foe.alive) continue;
      const c = new THREE.Vector3(foe.x, foe.y + 0.4, foe.z);
      const t = c.clone().sub(from).dot(dir);
      if (t < 0 || t > DOT.yarn.reach) continue;
      if (from.clone().addScaledVector(dir, t).distanceTo(c) > foe.radius + 0.5) continue;
      foe.takeHit(DOT.yarn.damage, p.x, p.z, 'thrown');
      foe.nudge?.(-f.x * DOT.yarn.pull, -f.z * DOT.yarn.pull);
      ev.hits.push({ foe, killed: !foe.alive });
      this.line = { to: c, t: 0.25 };
      return;
    }
    // The first solid it meets.
    let best = 1;
    let hit: (typeof w.colliders)[number] | null = null;
    for (const b of w.colliders) {
      const t = segmentAabbT(from, end, b);
      if (t !== null && t > 0.02 && t < best) {
        best = t;
        hit = b;
      }
    }
    if (!hit) {
      this.line = { to: end, t: 0.25 };
      return;
    }
    const at = from.clone().lerp(end, best);
    // On its side near enough its top, she is pulled up and over onto it; else, to where it caught.
    const top = topAt(hit, Math.max(hit.min.x, Math.min(hit.max.x, at.x)), Math.max(hit.min.z, Math.min(hit.max.z, at.z)));
    const onto = new THREE.Vector3(Math.max(hit.min.x + 0.35, Math.min(hit.max.x - 0.35, at.x + f.x * 0.45)), top, Math.max(hit.min.z + 0.35, Math.min(hit.max.z - 0.35, at.z + f.z * 0.45)));
    // (Onto its top only if that is wide enough to stand on: not a thin wall's, nor the room's own.)
    this.reel = top - at.y < 3 && hit.max.x - hit.min.x >= 1.5 && hit.max.z - hit.min.z >= 1.5 ? onto : at.clone().addScaledVector(dir, -0.4);
    this.line = { to: at, t: 9 };
    ev.sfx.push(['threadTwang', 0.7, 1.4]);
  }
}
