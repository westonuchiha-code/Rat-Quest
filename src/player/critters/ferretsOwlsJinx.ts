/**
 * THE FERRETS, THE OWLS AND JINX, PLAYED (2026-11-20).
 *
 * SLINK (the dark ferret): she CLIMBS. Run at a wall and JUMP against it, and she is up it, as long as the stick
 * holds her to it and her grip lasts; over the top she goes. ROLL: she SLINKS, flat and long and quick, under what is
 * too low for anyone else on foot (ROLL again, or JUMP, to stand). ATTACK: a nip.
 *
 * BISCUIT (the pale ferret): the WAR DANCE. ATTACK and she bounces about in a wild hopping dance, this way and that,
 * nothing can touch her, and she knocks over everything she bounces into. Light and springy: a second jump in the
 * air. ROLL: a quick backward hop.
 *
 * TAWNY (the brown owl): he FLIES. JUMP in the air: a FLAP (four before he must land); JUMP held, falling: he GLIDES,
 * a long slow way down; ATTACK in the air: a TALON DIVE, steep and fast, onto whatever is under it. On the ground he
 * hops and walks, badly. ATTACK on the ground: a peck.
 *
 * SNOW (the white owl): she HOVERS. JUMP held in the air and she hangs there beating her wings, moving slowly, as
 * long as her breath lasts (it comes back on the ground); two flaps. ATTACK: a fan of three FEATHER DARTS.
 *
 * JINX (the punk rat): the one who does MAGIC, and hers is her own: she JINXES. ATTACK throws a HEX, a spark of bad
 * luck in an arc. On a creature: it is jinxed, and a moment later something from the house above falls out of
 * nowhere onto it (a cotton reel, a teacup, a die, a button): bad luck. ROLL throws her MARK, a high lob that comes
 * down on what is ahead (on top of it); ROLL again and she BLINKS to it, wherever it is (one at a time; it fades).
 * GUARD: she changes places with a creature she has jinxed. JUMP held in the air: she hangs on a little hex sign.
 */
import * as THREE from 'three';
import { Critter, type CritterEvents, type CritterInput, type CritterTarget, type CritterWorld, type Shot } from './base';

export const SLINK = { radius: 0.26, height: 0.9, flat: 0.42, walk: 3.0, run: 5.6, slink: 6.4, jump: 7.0, climb: { speed: 3.2, grip: 2.4, over: 3.5 }, nip: { reach: 0.55, damage: 1, every: 0.3 } } as const;

export class SlinkCritter extends Critter {
  readonly radius = SLINK.radius;
  flat = false;
  /** Climbing: the wall's outward way, and how much grip is left. */
  private climb: { x: number; z: number } | null = null;
  private grip: number = SLINK.climb.grip;
  private wait = 0;
  get height(): number {
    return this.flat ? SLINK.flat : SLINK.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    this.wait = Math.max(0, this.wait - dt);
    if (this.grounded) this.grip = SLINK.climb.grip;
    const { dir, push } = this.stick(input);
    if (this.climb) {
      // Up the wall, as long as she is held to it and her grip lasts.
      const into = -(dir.x * this.climb.x + dir.z * this.climb.z) * push;
      this.grip -= dt;
      if (into < 0.3 || this.grip <= 0) {
        this.climb = null;
        v.x = this.climbOut(0.8).x;
        v.z = this.climbOut(0.8).z;
      } else {
        v.set(-this.climb.x * 0.5, SLINK.climb.speed, -this.climb.z * 0.5);
        this.move(dt, w, ev);
        if (!this.wall) {
          // Over the top.
          this.climb = null;
          v.y = SLINK.climb.over;
          v.x = -this.facingOut().x * 2;
          v.z = -this.facingOut().z * 2;
          ev.sfx.push(['softStep', 0.6, 1.4]);
        }
        this.state = 'climb';
        this.look.lean = -1.2;
        this.look.stride += dt * 14;
        this.look.step = 1;
        return;
      }
    }
    if (input.rollPressed) {
      if (!this.flat) this.flat = true;
      else if (this.roomFor(SLINK.height, w.colliders)) this.flat = false;
      ev.sfx.push(['softStep', 0.5, 1.2]);
    }
    if (this.flat && input.jumpPressed && this.roomFor(SLINK.height, w.colliders)) this.flat = false;
    if (this.pool) {
      this.flat = false;
      this.swim(dt, input, 3, ev);
    } else {
      this.steer(dt, input, this.flat ? SLINK.slink : input.run ? SLINK.run : SLINK.walk, 26, 24, 0.45);
      if (input.jumpPressed && !this.flat) {
        if (this.grounded) {
          v.y = SLINK.jump;
          this.grounded = false;
          ev.jumped = true;
        }
      }
      if (input.attackPressed && this.wait <= 0) {
        this.wait = SLINK.nip.every;
        this.stingAhead(SLINK.nip.reach, 0.9, SLINK.nip.damage, w, ev);
        ev.sfx.push(['lunge', 0.4, 1.8]);
      }
    }
    this.turnTo(dt, input, 16);
    this.fall(dt);
    this.move(dt, w, ev);
    // Jumping against a wall she is pushed into: on to it.
    if (this.wall && input.jumpHeld && !this.flat && !this.pool && this.grip > 0) {
      const into = -(dir.x * this.wall.x + dir.z * this.wall.z) * push;
      if (into > 0.5) {
        this.climb = { ...this.wall };
        this.facing = Math.atan2(-this.wall.x, -this.wall.z);
        ev.sfx.push(['softStep', 0.6, 1.6]);
      }
    }
    this.strideOn(dt, this.flat ? 0.3 : 0.32);
    this.look.squash = this.flat ? -0.45 : 0;
    this.look.lean = this.flat ? 0 : 0.3 * Math.min(1, this.speed / SLINK.run);
    this.state = this.flat ? 'slink' : this.plainState(SLINK.walk);
  }
  private facingOut(): { x: number; z: number } {
    return this.climb ?? this.wall ?? { x: -Math.sin(this.facing), z: -Math.cos(this.facing) };
  }
  private climbOut(k: number): { x: number; z: number } {
    const o = this.facingOut();
    return { x: o.x * k, z: o.z * k };
  }
}

export const BISCUIT = { radius: 0.26, height: 0.9, walk: 3.0, run: 5.8, jump: 7.0, again: 6.4, dance: { time: 1.2, hop: 4.5, side: 4, every: 0.22, reach: 0.9, damage: 1, knock: 2.5, rest: 0.6 } } as const;

export class BiscuitCritter extends Critter {
  readonly radius = BISCUIT.radius;
  private danceT = -1;
  private danceHop = 0;
  private danceSide = 1;
  private rest = 0;
  private again = true;
  get height(): number {
    return BISCUIT.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    const p = this.position;
    this.rest = Math.max(0, this.rest - dt);
    if (this.grounded) this.again = true;
    if (input.attackPressed && this.danceT < 0 && this.rest <= 0 && !this.pool) {
      this.danceT = 0;
      this.danceHop = 0;
      ev.sfx.push(['squirm', 0.7, 1.3]);
    }
    if (this.danceT >= 0) {
      // THE WAR DANCE: hop, this way, that way, back, spinning; nothing touches her; she knocks over what she meets.
      this.danceT += dt;
      this.danceHop -= dt;
      this.untouchable = true;
      if (this.grounded && this.danceHop <= 0) {
        this.danceHop = BISCUIT.dance.every;
        this.danceSide = -this.danceSide;
        const f = this.forward();
        const { dir, push } = this.stick(input);
        v.set(f.z * BISCUIT.dance.side * this.danceSide + dir.x * 2 * push, BISCUIT.dance.hop, -f.x * BISCUIT.dance.side * this.danceSide + dir.z * 2 * push);
        this.grounded = false;
        this.stingAround(p.x, p.y, p.z, BISCUIT.dance.reach, BISCUIT.dance.damage, w, ev, BISCUIT.dance.knock);
        ev.sfx.push(['chitinTap', 0.4, 1.8]);
      }
      this.look.spin += dt * 14;
      this.look.lean = 0.2 * Math.sin(this.danceT * 30);
      if (this.danceT > BISCUIT.dance.time) {
        this.danceT = -1;
        this.rest = BISCUIT.dance.rest;
      }
      this.fall(dt, 22);
      this.move(dt, w, ev);
      this.state = 'dance';
      return;
    }
    this.untouchable = false;
    this.look.spin *= 0.8;
    if (this.pool) this.swim(dt, input, 3, ev);
    else {
      this.steer(dt, input, input.run ? BISCUIT.run : BISCUIT.walk, 26, 24, 0.5);
      if (input.jumpPressed) {
        if (this.grounded) {
          v.y = BISCUIT.jump;
          this.grounded = false;
          ev.jumped = true;
        } else if (this.again) {
          // Springy: once more in the air.
          this.again = false;
          v.y = BISCUIT.again;
          this.look.tumble = 0.01;
          ev.jumped = true;
        }
      }
      if (input.rollPressed && this.grounded) {
        const f = this.forward();
        v.set(-f.x * 5, 4, -f.z * 5);
        this.grounded = false;
        ev.sfx.push(['dodge', 0.5, 1.3]);
      }
    }
    if (this.look.tumble !== 0) this.look.tumble = this.grounded ? 0 : Math.min(Math.PI * 2, this.look.tumble + dt * 14);
    this.turnTo(dt, input, 16);
    this.fall(dt);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.32);
    this.look.lean = 0.3 * Math.min(1, this.speed / BISCUIT.run);
    this.state = this.plainState(BISCUIT.walk);
  }
}

export const TAWNY = { radius: 0.3, height: 0.95, walk: 1.8, run: 2.6, jump: 6.0, flap: { up: 5.6, count: 4, ahead: 1.5 }, glide: { fall: 1.1, speed: 6.0 }, dive: { speed: 10, down: 9, reach: 0.9, damage: 2, sight: 8 }, peck: { reach: 0.5, damage: 1, every: 0.35 } } as const;

export class TawnyCritter extends Critter {
  readonly radius = TAWNY.radius;
  private flaps: number = TAWNY.flap.count;
  private diving = false;
  /** Where the dive is going: at a creature he saw below and ahead, or straight on. */
  private diveAt: THREE.Vector3 | null = null;
  private wait = 0;
  private flapT = 9;
  get height(): number {
    return TAWNY.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    const p = this.position;
    this.wait = Math.max(0, this.wait - dt);
    this.flapT += dt;
    if (this.grounded) {
      this.flaps = TAWNY.flap.count;
      if (this.diving) {
        this.diving = false;
        this.stingAround(p.x, p.y, p.z, TAWNY.dive.reach, TAWNY.dive.damage, w, ev);
        this.fx.rings.push({ x: p.x, y: p.y + 0.05, z: p.z, r: TAWNY.dive.reach, alpha: 0.7, color: 0xd9c49a });
      }
    }
    if (this.pool) {
      this.diving = false;
      this.swim(dt, input, 1.6, ev, 7);
    } else if (this.diving) {
      // The dive: steep and fast, talons first, at what he saw below him; what it meets on the way is struck.
      const f = this.forward();
      if (this.diveAt) {
        const d = this.diveAt.clone().sub(p);
        const len = Math.max(0.1, d.length());
        const s = Math.hypot(TAWNY.dive.speed, TAWNY.dive.down);
        v.copy(d.multiplyScalar(s / len));
      } else v.set(f.x * TAWNY.dive.speed, -TAWNY.dive.down, f.z * TAWNY.dive.speed);
      if (this.stingAround(p.x, p.y, p.z, TAWNY.dive.reach * 0.7, TAWNY.dive.damage, w, ev).length) {
        this.diving = false;
        v.set(-f.x * 2, 5, -f.z * 2);
      }
    } else if (this.grounded) {
      this.steer(dt, input, input.run ? TAWNY.run : TAWNY.walk, 14, 18);
      if (input.jumpPressed) {
        v.y = TAWNY.jump;
        this.grounded = false;
        ev.jumped = true;
        this.flapT = 0;
      }
      if (input.attackPressed && this.wait <= 0) {
        this.wait = TAWNY.peck.every;
        this.stingAhead(TAWNY.peck.reach, 0.8, TAWNY.peck.damage, w, ev);
        ev.sfx.push(['chitinTap', 0.5, 1.5]);
      }
    } else {
      // In the air: flaps, a glide, a dive.
      const gliding = input.jumpHeld && v.y < 0;
      this.steer(dt, input, gliding ? TAWNY.glide.speed : 3.5, 6, 2, 1);
      if (input.jumpPressed && this.flaps > 0) {
        this.flaps--;
        v.y = TAWNY.flap.up;
        const f = this.forward();
        v.x += f.x * TAWNY.flap.ahead;
        v.z += f.z * TAWNY.flap.ahead;
        this.flapT = 0;
        ev.sfx.push(['flap', 0.7, 0.8]);
      }
      if (gliding) {
        if (v.y < -TAWNY.glide.fall) v.y = -TAWNY.glide.fall;
        const f = this.forward();
        v.x += (f.x * TAWNY.glide.speed - v.x) * Math.min(1, dt * 1.5);
        v.z += (f.z * TAWNY.glide.speed - v.z) * Math.min(1, dt * 1.5);
      }
      if (input.attackPressed) {
        this.diving = true;
        // (An owl dives at prey: the nearest creature below and ahead of him, near enough.)
        const prey = w.foes
          .filter((q) => q.alive && q.y < p.y - 0.3)
          .map((q) => ({ q, d: Math.hypot(q.x - p.x, q.z - p.z), off: Math.abs(Math.atan2(Math.sin(Math.atan2(q.x - p.x, q.z - p.z) - this.facing), Math.cos(Math.atan2(q.x - p.x, q.z - p.z) - this.facing))) }))
          .filter((o) => o.d < TAWNY.dive.sight && o.off < 1.1)
          .sort((a, b) => a.d - b.d)[0];
        this.diveAt = prey ? new THREE.Vector3(prey.q.x, prey.q.y + 0.3, prey.q.z) : null;
        if (prey) this.facing = Math.atan2(prey.q.x - p.x, prey.q.z - p.z);
        ev.sfx.push(['whoosh', 0.8, 0.9]);
      }
    }
    this.turnTo(dt, input, this.grounded ? 12 : 4);
    if (!this.diving) this.fall(dt, 16);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.2);
    // (His wings: the drawing beats them on a flap, holds them out in a glide.)
    this.look.lift = this.flapT < 0.25 ? Math.sin((this.flapT / 0.25) * Math.PI) * 0.06 : 0;
    this.look.lean = this.diving ? 0.9 : !this.grounded && input.jumpHeld && v.y < 0 ? 0.35 : 0.1;
    this.look.roll = !this.grounded ? 0.15 * Math.sin(this.time * 3) : 0;
    this.state = this.diving ? 'dive' : !this.grounded && input.jumpHeld && v.y < 0 ? 'glide' : this.plainState(TAWNY.walk);
  }
}

export const SNOW = { radius: 0.3, height: 0.95, walk: 1.8, run: 2.6, jump: 6.0, flap: { up: 5.2, count: 2 }, hover: { breath: 2.6, speed: 2.4 }, darts: { speed: 16, spread: 0.22, damage: 1, every: 0.5 }, peck: { reach: 0.5, damage: 1 } } as const;

export class SnowCritter extends Critter {
  readonly radius = SNOW.radius;
  private flaps: number = SNOW.flap.count;
  private breath: number = SNOW.hover.breath;
  private wait = 0;
  get height(): number {
    return SNOW.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    this.wait = Math.max(0, this.wait - dt);
    if (this.grounded) {
      this.flaps = SNOW.flap.count;
      this.breath = SNOW.hover.breath;
    }
    let hovering = false;
    if (this.pool) this.swim(dt, input, 1.6, ev, 7);
    else if (this.grounded) {
      this.steer(dt, input, input.run ? SNOW.run : SNOW.walk, 14, 18);
      if (input.jumpPressed) {
        v.y = SNOW.jump;
        this.grounded = false;
        ev.jumped = true;
      }
    } else {
      if (input.jumpPressed && this.flaps > 0) {
        this.flaps--;
        v.y = SNOW.flap.up;
        ev.sfx.push(['flap', 0.7, 0.9]);
      }
      // Held, falling: she HOVERS, beating her wings, as long as her breath lasts.
      hovering = input.jumpHeld && v.y <= 0.5 && this.breath > 0;
      if (hovering) {
        this.breath -= dt;
        v.y += (0 - v.y) * Math.min(1, dt * 10);
        this.steer(dt, input, SNOW.hover.speed, 8, 8, 1);
        if (Math.floor(this.time * 6) !== Math.floor((this.time - dt) * 6)) ev.sfx.push(['flap', 0.35, 1.1]);
      } else this.steer(dt, input, 3.5, 6, 2, 1);
    }
    if (input.attackPressed && this.wait <= 0) {
      // A fan of three feather darts.
      this.wait = SNOW.darts.every;
      for (const turn of [-SNOW.darts.spread, 0, SNOW.darts.spread]) this.throwShot(SNOW.darts.speed, 0, 0, { turn, life: 0.6, color: 0xf7f9fb, damage: SNOW.darts.damage, radius: 0.08 });
      ev.sfx.push(['whoosh', 0.6, 1.9]);
    }
    this.turnTo(dt, input, this.grounded ? 12 : 6);
    if (!hovering) this.fall(dt, 16);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.2);
    this.look.lift = hovering ? 0.04 * Math.sin(this.time * 30) : 0;
    this.look.lean = hovering ? 0.05 : 0.1;
    this.state = hovering ? 'hover' : this.plainState(SNOW.walk);
  }
}

export const JINX = { radius: 0.28, height: 1.15, walk: 3.2, run: 6.0, jump: 8.6, hex: { speed: 12, up: 0.6, gravity: 2, life: 1.0, every: 0.45, doom: 1.0, damage: 2 }, mark: { speed: 4, up: 12, gravity: 14, life: 8 }, float: { fall: 0.9, time: 1.2 }, swap: { reach: 14 } } as const;

/** What falls on a jinxed creature: something from the house above. */
const BAD_LUCK = ['spool', 'teacup', 'die', 'button'] as const;

export class JinxCritter extends Critter {
  readonly radius = JINX.radius;
  /** Her mark, where she can blink to, and how long it has left. */
  mark: { at: THREE.Vector3; life: number } | null = null;
  /** The jinxed: what is coming to each of them, and when. */
  readonly doomed: Array<{ foe: CritterTarget; t: number; what: (typeof BAD_LUCK)[number] }> = [];
  private wait = 0;
  private floatT = 0;
  private luck = 0;
  private guarding = false;
  get height(): number {
    return JINX.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    const p = this.position;
    this.wait = Math.max(0, this.wait - dt);
    if (this.grounded) this.floatT = JINX.float.time;
    // Bad luck coming down on the jinxed.
    for (let i = this.doomed.length - 1; i >= 0; i--) {
      const d = this.doomed[i];
      d.t -= dt;
      const f = d.foe;
      if (!f.alive) {
        this.doomed.splice(i, 1);
        continue;
      }
      const fallFrom = 4.5;
      const drop = Math.max(0, d.t / JINX.hex.doom);
      this.fx.props.push({ kind: d.what, x: f.x, y: f.y + 0.6 + fallFrom * drop * drop, z: f.z, turn: d.t * 6 });
      if (d.t <= 0) {
        f.takeHit(JINX.hex.damage, f.x, f.z + 0.01, 'thrown');
        ev.hits.push({ foe: f, killed: !f.alive });
        ev.sfx.push([d.what === 'teacup' ? 'barrel' : 'crate', 0.8, 1.3]);
        this.doomed.splice(i, 1);
      }
    }
    if (this.mark) {
      this.mark.life -= dt;
      if (this.mark.life <= 0) this.mark = null;
      else this.fx.rings.push({ x: this.mark.at.x, y: this.mark.at.y + 0.04, z: this.mark.at.z, r: 0.45 + 0.05 * Math.sin(this.time * 6), alpha: Math.min(1, this.mark.life), color: 0xb04cff });
    }
    if (input.rollPressed) {
      // To her mark if she has one; if not, she throws one: a high lob that comes down on what is ahead (up on top).
      if (this.mark) this.blink(ev);
      else if (!this.shots.some((q) => q.kind === 'mark' && !q.end)) {
        this.throwShot(JINX.mark.speed, JINX.mark.up, JINX.mark.gravity, { kind: 'mark', color: 0xe080ff, life: 3, radius: 0.15 });
        ev.sfx.push(['sparkle', 0.6, 0.8]);
      }
    }
    // GUARD: she changes places with a creature she has jinxed.
    if (input.guardHeld && !this.guarding) this.swap(ev);
    this.guarding = input.guardHeld;
    if (this.pool) this.swim(dt, input, 2.6, ev, 7);
    else {
      this.steer(dt, input, input.run ? JINX.run : JINX.walk, 26, 24, 0.45);
      if (input.jumpPressed && this.grounded) {
        v.y = JINX.jump;
        this.grounded = false;
        ev.jumped = true;
      }
    }
    if (input.attackPressed && this.wait <= 0) {
      this.wait = JINX.hex.every;
      this.throwShot(JINX.hex.speed, JINX.hex.up, JINX.hex.gravity, { kind: 'hex', color: 0xb04cff, life: JINX.hex.life, radius: 0.13 });
      ev.sfx.push(['sparkle', 0.7, 1.4]);
    }
    // Held in the air: a little hex sign under her feet, falling slowly while it lasts.
    const floating = !this.grounded && !this.pool && input.jumpHeld && v.y < 0 && this.floatT > 0;
    if (floating) {
      this.floatT -= dt;
      if (v.y < -JINX.float.fall) v.y = -JINX.float.fall;
      this.fx.rings.push({ x: p.x, y: p.y - 0.05, z: p.z, r: 0.5, alpha: 0.8, color: 0xb04cff });
    }
    this.turnTo(dt, input, 16);
    this.fall(dt, floating ? 6 : 18);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.4);
    this.look.lean = 0.3 * Math.min(1, this.speed / JINX.run);
    this.state = floating ? 'float' : this.plainState(JINX.walk);
  }
  protected shotEnded(s: Shot, _w: CritterWorld, ev: CritterEvents): void {
    if (!s.kind || !s.end) return;
    if (s.end.foe) {
      // Jinxed: something is going to fall on it.
      if (!this.doomed.some((d) => d.foe === s.end!.foe)) this.doomed.push({ foe: s.end.foe, t: JINX.hex.doom, what: BAD_LUCK[this.luck++ % BAD_LUCK.length] });
      ev.sfx.push(['villainLaugh', 0.25, 2.2]);
    } else if (s.kind === 'mark' && s.end.top) {
      this.mark = { at: s.end.at.clone(), life: JINX.mark.life };
      ev.sfx.push(['sparkle', 0.5, 0.9]);
    }
  }
  /** To her mark. */
  private blink(ev: CritterEvents): void {
    const p = this.position;
    if (!this.mark) return;
    this.fx.rings.push({ x: p.x, y: p.y + 0.05, z: p.z, r: 0.8, alpha: 1, color: 0xb04cff });
    p.copy(this.mark.at);
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.mark = null;
    ev.sfx.push(['rewind', 0.6, 1.6]);
  }
  /** Changing places with a jinxed creature (the nearest). */
  private swap(ev: CritterEvents): void {
    const p = this.position;
    const d = this.doomed.find((q) => q.foe.alive && Math.hypot(q.foe.x - p.x, q.foe.z - p.z) < JINX.swap.reach);
    if (d) {
      const f = d.foe;
      const [x, y, z] = [p.x, p.y, p.z];
      p.set(f.x, f.y, f.z);
      f.x = x;
      f.y = y;
      f.z = z;
      this.velocity.set(0, 0, 0);
      ev.sfx.push(['rewind', 0.6, 1.9]);
    } else ev.sfx.push(['chipBuzz', 0.3, 0.8]);
  }
}
