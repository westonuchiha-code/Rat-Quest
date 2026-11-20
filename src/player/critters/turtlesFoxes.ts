/**
 * THE TURTLES AND THE FOXES, PLAYED (2026-11-20).
 *
 * PEBBLE (the young turtle): slow on her feet, a little hop. ROLL pulls her into her SHELL: going, the shell SLIDES
 * like a puck, hardly slowing, ricocheting off walls, knocking creatures flying (and nothing can touch her in it);
 * standing, she just shuts herself in. ROLL again: out. In water she is quick, and ROLL there DIVES: she swims under,
 * down to the bottom (JUMP held to come up), the only one of them who can.
 *
 * MO (the old turtle): slow, heavy, and IMMOVABLE: a blow does not knock him back. ATTACK: a STOMP, a shockwave all
 * round. GUARD held: shut in his shell where he stands, nothing gets at him. In water he does not float: he SINKS,
 * and walks along the bottom.
 *
 * VIX (the red fox): the fastest of them on the ground. Hold JUMP and she CROUCHES, winding up; let go and she
 * POUNCES, a long high arc as far as she was wound up, and where she lands, she lands ON something (it is stung).
 * Tapped, JUMP is an ordinary jump. ATTACK: a snap of the jaws.
 *
 * ASH (the grey fox): ROLL is a SHADOW DASH: a burst of speed the way she faces (or is pushed), through creatures
 * (each stung as she passes), untouchable while it lasts, and twice in the air before she lands: across gaps. ATTACK:
 * a snap.
 */
import * as THREE from 'three';
import { Critter, type CritterEvents, type CritterInput, type CritterTarget, type CritterWorld } from './base';

export const PEBBLE = { radius: 0.34, height: 0.8, shell: 0.5, walk: 2.0, run: 2.8, jump: 5.4, slide: { kick: 9, friction: 0.25, steer: 2.2, damage: 2, every: 0.5, bounce: 0.9 }, swim: 4.6, dive: { down: 1.8, up: 3.5 } } as const;

export class PebbleCritter extends Critter {
  readonly radius = PEBBLE.radius;
  shelled = false;
  diving = false;
  private readonly struck = new Map<CritterTarget, number>();
  get height(): number {
    return this.shelled ? PEBBLE.shell : PEBBLE.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const p = this.position;
    const v = this.velocity;
    for (const [f, t] of this.struck) if (t <= this.time) this.struck.delete(f);
    if (this.pool) {
      this.shelled = false;
      if (input.rollPressed) {
        this.diving = !this.diving;
        ev.sfx.push(['splash', 0.6, 1.3]);
      }
      if (this.diving) {
        // Under: she swims about down there; JUMP held brings her up, else she goes down to the bottom.
        const { dir, push } = this.stick(input);
        v.x += (dir.x * PEBBLE.swim * push - v.x) * Math.min(1, dt * 5);
        v.z += (dir.z * PEBBLE.swim * push - v.z) * Math.min(1, dt * 5);
        v.y += ((input.jumpHeld ? PEBBLE.dive.up : -PEBBLE.dive.down) - v.y) * Math.min(1, dt * 4);
        const surface = this.pool.y - this.sink;
        if (p.y > surface && v.y > 0) {
          this.diving = false;
          v.y = 0;
        }
      } else this.swim(dt, input, PEBBLE.swim, ev);
      this.turnTo(dt, input);
      this.moveSwim(dt, w, ev);
      this.state = this.diving ? 'dive' : 'swim';
      this.look.lean = this.diving ? 1.3 : 1.1;
      return;
    }
    this.diving = false;
    if (input.rollPressed) {
      if (!this.shelled) {
        this.shelled = true;
        // Going, or pushed: she is kicked off along the floor.
        const { dir, push } = this.stick(input);
        const way = push > 0.1 ? dir : this.speed > 0.5 ? v.clone().setY(0).normalize() : null;
        if (way) {
          v.x = way.x * PEBBLE.slide.kick;
          v.z = way.z * PEBBLE.slide.kick;
        }
        ev.sfx.push(['flipClang', 0.5, 1.4]);
      } else if (this.roomFor(PEBBLE.height, w.colliders)) {
        this.shelled = false;
        ev.sfx.push(['flipClang', 0.4, 1.7]);
      }
    }
    if (this.shelled) {
      // A puck: it hardly slows; she can lean it a little to steer.
      this.untouchable = true;
      const k = Math.max(0, 1 - PEBBLE.slide.friction * dt);
      v.x *= k;
      v.z *= k;
      const { dir, push } = this.stick(input);
      if (push > 0.1 && this.speed > 1) {
        const a = Math.atan2(v.x, v.z);
        const want = Math.atan2(dir.x, dir.z);
        const turn = Math.max(-1, Math.min(1, Math.atan2(Math.sin(want - a), Math.cos(want - a)))) * PEBBLE.slide.steer * dt;
        const s = this.speed;
        v.x = Math.sin(a + turn) * s;
        v.z = Math.cos(a + turn) * s;
      }
      this.fall(dt);
      const before = this.speed;
      this.move(dt, w, ev, PEBBLE.slide.bounce);
      if (this.wall && before > 2) ev.sfx.push(['flipClang', Math.min(0.8, before / 10), 1.1]);
      if (this.speed > 2.5) {
        for (const f of w.foes) {
          if (!f.alive || this.struck.has(f) || Math.abs(f.y - p.y) > 0.8 || Math.hypot(f.x - p.x, f.z - p.z) > f.radius + this.radius + 0.1) continue;
          f.takeHit(PEBBLE.slide.damage, p.x, p.z, 'thrown');
          f.nudge?.(v.x * 0.25, v.z * 0.25);
          this.struck.set(f, this.time + PEBBLE.slide.every);
          ev.hits.push({ foe: f, killed: !f.alive });
        }
      }
      this.turnTo(dt, input, 6, true);
      this.look.spin += this.speed * dt * 2;
      this.look.squash = -0.25;
      this.state = 'shell';
      return;
    }
    this.untouchable = false;
    this.look.squash = 0;
    this.steer(dt, input, input.run ? PEBBLE.run : PEBBLE.walk, 10, 14);
    if (input.jumpPressed && this.grounded) {
      v.y = PEBBLE.jump;
      this.grounded = false;
      ev.jumped = true;
    }
    this.turnTo(dt, input, 8);
    this.fall(dt);
    this.move(dt, w, ev);
    this.strideOn(dt, 0.18);
    this.look.spin *= 0.9;
    this.look.lean = 0.1;
    this.state = this.plainState(PEBBLE.walk);
  }
  /** In water: moved without a floor to stand on (the bottom stops her). */
  private moveSwim(dt: number, w: CritterWorld, ev: CritterEvents): void {
    this.move(dt, w, ev);
  }
}

export const MO = { radius: 0.38, height: 0.95, walk: 1.6, run: 2.2, jump: 4.2, stomp: { reach: 2.6, damage: 1, every: 1.1, wind: 0.25, knock: 2 } } as const;

export class MoCritter extends Critter {
  readonly radius = MO.radius;
  private stompT = -1;
  private wait = 0;
  shut = false;
  constructor(at: THREE.Vector3) {
    super(at);
    this.steadfast = true;
    // (He does not float: he sinks, and walks the bottom.)
    this.sink = 99;
  }
  get height(): number {
    return this.shut ? 0.6 : MO.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const p = this.position;
    const v = this.velocity;
    this.wait = Math.max(0, this.wait - dt);
    this.shut = input.guardHeld && this.grounded;
    this.untouchable = this.shut;
    if (this.stompT >= 0) {
      this.stompT += dt;
      v.x *= 0.8;
      v.z *= 0.8;
      // Up on his toes, then down: the ground shakes.
      this.look.lift = this.stompT < MO.stomp.wind ? 0.12 * (this.stompT / MO.stomp.wind) : 0;
      if (this.stompT >= MO.stomp.wind) {
        this.stompT = -1;
        this.look.squash = -0.3;
        this.stingAround(p.x, p.y, p.z, MO.stomp.reach, MO.stomp.damage, w, ev, MO.stomp.knock);
        this.fx.rings.push({ x: p.x, y: p.y + 0.05, z: p.z, r: MO.stomp.reach, alpha: 0.9, color: 0xe8d8a0 });
        ev.sfx.push(['shock', 0.8, 0.8]);
      }
    } else if (this.shut) {
      v.x *= 0.7;
      v.z *= 0.7;
      this.look.squash = -0.3;
    } else {
      // In water too he just walks (slower): on the bottom.
      this.steer(dt, input, (input.run ? MO.run : MO.walk) * (this.underwater(w) ? 0.7 : 1), 8, 12);
      if (input.jumpPressed && this.grounded) {
        v.y = MO.jump;
        this.grounded = false;
        ev.jumped = true;
      }
      if (input.attackPressed && this.grounded && this.wait <= 0) {
        this.wait = MO.stomp.every;
        this.stompT = 0;
      }
      this.look.squash *= 0.9;
    }
    this.turnTo(dt, input, 6);
    // (Under water he still falls, and stands on the bottom: he is too heavy to float.)
    this.velocity.y -= 18 * dt * (this.underwater(w) ? 0.4 : 1);
    this.pool = null;
    this.move(dt, w, ev);
    this.strideOn(dt, 0.2);
    this.look.lean = 0.05;
    this.state = this.shut ? 'shell' : this.underwater(w) && this.grounded ? 'wade' : this.plainState(MO.walk);
  }
  private underwater(w: CritterWorld): boolean {
    const p = this.position;
    return w.water.some((q) => p.x > q.x0 && p.x < q.x1 && p.z > q.z0 && p.z < q.z1 && p.y < q.y);
  }
}

export const VIX = { radius: 0.3, height: 1.0, walk: 3.4, run: 7.2, jump: 8.0, pounce: { wind: 0.7, up: [5, 9.5], ahead: [5, 12], reach: 1.1, damage: 2, after: 0.15 }, bite: { reach: 0.6, damage: 1, every: 0.35 } } as const;

export class VixCritter extends Critter {
  readonly radius = VIX.radius;
  /** Crouched, winding up (seconds), or -1. */
  crouch = -1;
  private pouncing = false;
  private wait = 0;
  get height(): number {
    return this.crouch >= 0 ? 0.7 : VIX.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    const p = this.position;
    this.wait = Math.max(0, this.wait - dt);
    if (this.pool) {
      this.crouch = -1;
      this.swim(dt, input, 2.6, ev);
      this.turnTo(dt, input);
      this.move(dt, w, ev);
      this.state = 'swim';
      this.look.lean = 1;
      return;
    }
    if (this.grounded && input.jumpPressed) this.crouch = 0;
    if (this.crouch >= 0) {
      if (input.jumpHeld && this.grounded) {
        this.crouch += dt;
        v.x *= 0.8;
        v.z *= 0.8;
        this.look.squash = -0.35 * Math.min(1, this.crouch / VIX.pounce.wind);
        this.look.lean = 0.35;
        this.turnTo(dt, input, 10);
      } else {
        // Let go: a tap is a jump; a wind-up is a POUNCE.
        const k = Math.min(1, this.crouch / VIX.pounce.wind);
        const f = this.forward();
        if (this.crouch < VIX.pounce.after) v.y = VIX.jump;
        else {
          v.y = VIX.pounce.up[0] + (VIX.pounce.up[1] - VIX.pounce.up[0]) * k;
          const ahead = VIX.pounce.ahead[0] + (VIX.pounce.ahead[1] - VIX.pounce.ahead[0]) * k;
          v.x = f.x * ahead;
          v.z = f.z * ahead;
          this.pouncing = true;
          ev.sfx.push(['whoosh', 0.7, 1.2]);
        }
        this.grounded = false;
        this.crouch = -1;
        ev.jumped = true;
        this.look.squash = 0.3;
      }
    } else {
      if (!this.pouncing) this.steer(dt, input, input.run ? VIX.run : VIX.walk, 30, 26, 0.5);
      if (input.attackPressed && this.wait <= 0) {
        this.wait = VIX.bite.every;
        this.stingAhead(VIX.bite.reach, 0.9, VIX.bite.damage, w, ev);
        ev.sfx.push(['lunge', 0.5, 1.5]);
      }
      this.turnTo(dt, input, this.pouncing ? 2 : 16);
    }
    this.fall(dt, 20);
    const ev0 = ev.landed;
    this.move(dt, w, ev);
    if (this.pouncing && (ev.landed > ev0 || this.grounded)) {
      // Down ON something.
      this.pouncing = false;
      this.stingAround(p.x, p.y, p.z, VIX.pounce.reach, VIX.pounce.damage, w, ev);
      this.fx.rings.push({ x: p.x, y: p.y + 0.05, z: p.z, r: VIX.pounce.reach, alpha: 0.7, color: 0xf0a060 });
      ev.sfx.push(['land', 0.8, 0.9]);
    }
    this.strideOn(dt, 0.45);
    this.look.squash *= 0.88;
    this.look.lean = this.pouncing ? -Math.atan2(v.y, Math.max(1, this.speed)) : 0.4 * Math.min(1, this.speed / VIX.run);
    this.state = this.crouch >= 0 ? 'crouch' : this.pouncing ? 'pounce' : this.plainState(VIX.walk);
  }
}

export const ASH = { radius: 0.3, height: 1.0, walk: 3.2, run: 6.4, jump: 8.4, dash: { speed: 16, time: 0.22, air: 2, damage: 1, every: 0.3 }, bite: { reach: 0.6, damage: 1, every: 0.35 } } as const;

export class AshCritter extends Critter {
  readonly radius = ASH.radius;
  private dashT = -1;
  private dashes: number = ASH.dash.air;
  private wait = 0;
  private dashWait = 0;
  private readonly passed = new Set<CritterTarget>();
  private readonly trail: THREE.Vector3[] = [];
  get height(): number {
    return ASH.height;
  }
  protected step(dt: number, input: CritterInput, w: CritterWorld, ev: CritterEvents): void {
    const v = this.velocity;
    const p = this.position;
    this.wait = Math.max(0, this.wait - dt);
    this.dashWait = Math.max(0, this.dashWait - dt);
    if (this.grounded) this.dashes = ASH.dash.air;
    if (input.rollPressed && this.dashT < 0 && this.dashWait <= 0 && (this.grounded || this.dashes > 0)) {
      const { dir, push } = this.stick(input);
      const way = push > 0.1 ? dir : this.forward();
      this.facing = Math.atan2(way.x, way.z);
      v.set(way.x * ASH.dash.speed, 0, way.z * ASH.dash.speed);
      this.dashT = 0;
      if (!this.grounded) this.dashes--;
      this.passed.clear();
      ev.sfx.push(['whoosh', 0.8, 1.6]);
    }
    if (this.dashT >= 0) {
      // A shadow: nothing touches her, and she goes through what is in her way, stinging it.
      this.dashT += dt;
      this.untouchable = true;
      v.y = 0;
      this.move(dt, w, ev);
      for (const f of w.foes) {
        if (!f.alive || this.passed.has(f) || Math.abs(f.y - p.y) > 1 || Math.hypot(f.x - p.x, f.z - p.z) > f.radius + this.radius + 0.3) continue;
        this.passed.add(f);
        f.takeHit(ASH.dash.damage, p.x, p.z, 'thrown');
        ev.hits.push({ foe: f, killed: !f.alive });
      }
      this.trail.push(p.clone());
      if (this.dashT >= ASH.dash.time) {
        this.dashT = -1;
        this.dashWait = ASH.dash.every;
        v.x *= 0.35;
        v.z *= 0.35;
      }
      this.look.lean = 0.7;
      this.state = 'dash';
    } else {
      this.untouchable = false;
      if (this.pool) this.swim(dt, input, 2.6, ev);
      else {
        this.steer(dt, input, input.run ? ASH.run : ASH.walk, 28, 26, 0.5);
        if (input.jumpPressed && this.grounded) {
          v.y = ASH.jump;
          this.grounded = false;
          ev.jumped = true;
        }
        if (input.attackPressed && this.wait <= 0) {
          this.wait = ASH.bite.every;
          this.stingAhead(ASH.bite.reach, 0.9, ASH.bite.damage, w, ev);
          ev.sfx.push(['lunge', 0.5, 1.6]);
        }
      }
      this.turnTo(dt, input, 16);
      this.fall(dt, 20);
      this.move(dt, w, ev);
      this.look.lean = 0.4 * Math.min(1, this.speed / ASH.run);
      this.state = this.plainState(ASH.walk);
    }
    // The shadow she leaves behind her, fading.
    while (this.trail.length > 6) this.trail.shift();
    if (this.dashT < 0 && this.trail.length) this.trail.shift();
    this.trail.forEach((q, i) => this.fx.props.push({ kind: 'ghost', x: q.x, y: q.y, z: q.z, turn: this.facing, alpha: (i + 1) / (this.trail.length + 1) * 0.5 }));
    this.strideOn(dt, 0.42);
  }
}
