/**
 * THE FILM AND TEST DRIVES: aids on the page's address that drive the rat by themselves, for the films that are sent
 * and for finding bugs. Moved here out of main.ts (2026-11-18) so the game's own loop reads as the game. Each reads
 * the address once; `drive()` then sets, each frame, what the pad would have said. None of them is in a player's game
 * (nobody types these into the address), and none changes a rule.
 *
 *   &autoride            the Milky Way, the Big Dipper or the Toy Box ridden by itself (=pipe, =bowl, =spine: the
 *                        Toy Box's other lines; &tuck: the Big Dipper tucked)
 *   &autorail            on his shield, onto the rail on his left, swinging at each bat beside it
 *   &chaos=N             runs about at random from seed N (into walls, jumping, swinging, rolling); what looks wrong
 *                        is written to the console as "CHAOS ..." (see `watch`)
 *   &autowalk=x,z        runs steadily that way
 *   &autogo=x,z,x,z...   runs to each place in turn and hops there (&gostow=2,5: presses STOW at those stops)
 *   &autojump            jumps every two seconds, and again at the top
 *   &autoswing=N         swings his sword every N seconds (1.2 if no N), standing where he is
 *   &autoplunge          jumps every three seconds, again at the top, and plunges as he falls
 * (Kept in main.ts, because they move what is in his hands or choose whom to fight: &autofight, &autolift, &carryfoe.)
 */
import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { makeAutoRide } from '../levels/milkyway';
import { makeDipRide } from '../levels/bigdipper';
import { makeToyRide, makePipeRide, makeBowlRide, makeSpineRide } from '../levels/toybox';
import type { Aabb } from '../world/collision';

/** What the pad says this frame: the drive overwrites what it drives. */
/** The stick, for `&autopad`: east, west, north (-z), south, let go. */
const STICK: Record<string, [number, number]> = { E: [1, 0], W: [-1, 0], N: [0, -1], S: [0, 1], '0': [0, 0] };

export interface Pad {
  move: THREE.Vector3;
  run: boolean;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  dodgePressed: boolean;
  guardHeld: boolean;
  stowPressed: boolean;
}
/** What a drive may look at. */
export interface Seen {
  room: string;
  player: {
    position: THREE.Vector3; velocity: THREE.Vector3; grounded: boolean; riding: boolean; grinding: boolean;
    attackTime: number; dead: boolean; state: string;
  };
  enemies: ReadonlyArray<{ alive: boolean; kind: string; x: number; z: number }>;
  /** `&autofight` is on: on the Big Dipper's pads the fight has the pad. */
  fighting: boolean;
}

const nums = (hash: string, name: string): number[] | null => ((w) => (w ? w[1].split(',').map(Number) : null))(new RegExp(`[#&]${name}=([-\\d.,]+)`).exec(hash));

export class FilmDrive {
  readonly ride: boolean;
  private readonly hash: string;
  private rider: ReturnType<typeof makeAutoRide> | null = null;
  private dipRider: ReturnType<typeof makeDipRide> | null = null;
  private toyRider: ReturnType<typeof makeToyRide> | null = null;
  private readonly rail: boolean;
  private railTick = 0;
  private readonly walk: number[] | null;
  private readonly go: number[] | null;
  private readonly goStow: number[];
  private goStop = 0;
  private readonly jump: boolean;
  private readonly swing: number;
  private swingAt = 0;
  private readonly plunge: boolean;
  private plungeAt = 2;
  private plungeStep = 0;
  private jumpAt = 1;
  /**
   * `&autopad=T:K,T:K,...`: a little script of the pad, for filming a character's own move: at T seconds, K: `J` jump
   * pressed, `A` attack, `R` roll (dodge), `H+`/`H-` jump held/let go, `G+`/`G-` guard held/let go, `U+`/`U-` run,
   * `E` `W` `N` `S` the stick that way (`0` let go).
   */
  private readonly script: Array<{ t: number; k: string }> | null;
  private scriptT = 0;
  private scriptNext = 0;
  private readonly held = { jump: false, guard: false, run: false, x: 0, z: 0 };
  /** `&autoball`: ROLL pressed once, a second in (the hedgehog curls up), for the other drives to push the ball. */
  private readonly ball: boolean;
  private ballAt = 1;
  private jumpTwice = false;
  readonly chaos: { seed: number; t: number; next: number; dir: [number, number]; last: { x: number; z: number; t: number }; said: Map<string, number>; lowest?: number; room: string } | null;

  constructor(hash: string) {
    this.hash = hash;
    this.ride = /[#&]autoride\b/.test(hash);
    this.rail = /[#&]autorail\b/.test(hash);
    this.walk = nums(hash, 'autowalk');
    this.go = nums(hash, 'autogo');
    this.goStow = nums(hash, 'gostow') ?? [];
    this.jump = /[#&]autojump\b/.test(hash);
    const sw = /[#&]autoswing(?:=([\d.]+))?\b/.exec(hash);
    this.swing = sw ? Number(sw[1] ?? 1.2) || 1.2 : 0;
    this.plunge = /[#&]autoplunge\b/.test(hash);
    this.ball = /[#&]autoball\b/.test(hash);
    const sc = /[#&]autopad=([^&]+)/.exec(hash)?.[1];
    this.script = sc ? sc.split(',').map((e) => ({ t: Number(e.split(':')[0]), k: e.split(':')[1] ?? '' })) : null;
    const c = /[#&]chaos=(\d+)/.exec(hash);
    this.chaos = c ? { seed: Math.max(1, Number(c[1]) || 1), t: 0, next: 0, dir: [0, 1], last: { x: 0, z: 0, t: 0 }, said: new Map(), room: '' } : null;
  }

  /** Sets what the pad says this frame, for whichever drives are on. */
  drive(dt: number, pad: Pad, w: Seen): void {
    const p = w.player;
    if (p.dead) return;
    if (this.ride && w.room === 'milkyway') {
      const a = (this.rider ??= makeAutoRide())(p);
      pad.move.set(a.x, 0, a.z);
      pad.run = a.run;
      pad.jumpPressed = a.jumpPressed;
      pad.jumpHeld = a.jumpHeld;
      pad.attackPressed = a.attackPressed;
    }
    if (this.rail) {
      this.railTick++;
      if (!p.riding) {
        // (Onto his shield: a jump, and the air attack over the slope.)
        pad.move.set(0, 0, 1);
        pad.jumpPressed = p.grounded && this.railTick % 20 === 0;
        pad.attackPressed = !p.grounded;
      } else if (!p.grinding) {
        // (Over to the rail on his left, and onto it.)
        const railX = -1.4;
        pad.move.set(Math.max(-1, Math.min(1, (railX - p.position.x) * 2)), 0, 1).normalize();
        pad.stowPressed = p.grounded && Math.abs(p.position.x - railX) < 0.6 && this.railTick % 6 === 0;
      } else pad.attackPressed = p.attackTime <= 0 && w.enemies.some((e) => e.alive && e.kind === 'bat' && e.z > p.position.z - 0.5 && e.z - p.position.z < 3 && Math.abs(e.x - p.position.x) < 1.5);
    }
    if (this.ride && w.room === 'bigdipper') {
      // (Rides, jumps, takes the rails, and stops at each pad. With `&autofight` he then fights.)
      const a = (this.dipRider ??= makeDipRide(/[#&]tuck\b/.test(this.hash)))(p);
      const onPad = !p.riding && w.enemies.some((e) => e.alive && Math.hypot(e.x - p.position.x, e.z - p.position.z) < 30);
      if (!(w.fighting && onPad)) {
        pad.move.set(a.x, 0, a.z);
        pad.jumpPressed = a.jumpPressed;
        pad.jumpHeld = a.jumpHeld;
        pad.attackPressed = a.attackPressed;
        pad.stowPressed = a.stowPressed;
        pad.dodgePressed = a.dodgePressed;
      }
    }
    if (this.ride && w.room === 'toybox') {
      // (Off the big ramp with a spin, a grab and a kickflip; or the half pipe's, the bowl's, the spine's line.)
      const h = this.hash;
      const a = (this.toyRider ??= /[#&]autoride=pipe\b/.test(h) ? makePipeRide() : /[#&]autoride=bowl\b/.test(h) ? makeBowlRide() : /[#&]autoride=spine\b/.test(h) ? makeSpineRide() : makeToyRide())(p);
      pad.move.set(a.x, 0, a.z);
      pad.jumpPressed = a.jumpPressed;
      pad.jumpHeld = a.jumpHeld;
      pad.attackPressed = a.attackPressed;
      pad.guardHeld = a.guardHeld;
      pad.dodgePressed = a.dodgePressed;
    }
    if (this.script) {
      this.scriptT += dt;
      const h = this.held;
      while (this.scriptNext < this.script.length && this.script[this.scriptNext].t <= this.scriptT) {
        const k = this.script[this.scriptNext++].k;
        if (k === 'J') pad.jumpPressed = true;
        else if (k === 'A') pad.attackPressed = true;
        else if (k === 'R') pad.dodgePressed = true;
        else if (k === 'H+' || k === 'H-') h.jump = k === 'H+';
        else if (k === 'G+' || k === 'G-') h.guard = k === 'G+';
        else if (k === 'U+' || k === 'U-') h.run = k === 'U+';
        else if (k in STICK) [h.x, h.z] = STICK[k];
      }
      pad.jumpHeld = h.jump || pad.jumpPressed;
      pad.guardHeld = h.guard;
      pad.run = h.run;
      pad.move.set(h.x, 0, h.z);
    }
    if (this.ball && this.ballAt > 0) {
      this.ballAt -= dt;
      if (this.ballAt <= 0) pad.dodgePressed = true;
    }
    const c = this.chaos;
    if (c) {
      c.t += dt;
      const r = (): number => ((c.seed = (c.seed * 16807) % 2147483647) / 2147483647);
      if (c.t > c.next) {
        c.next = c.t + 0.5 + r() * 1.2;
        const a = r() * Math.PI * 2;
        c.dir = [Math.sin(a), Math.cos(a)];
      }
      pad.move.set(c.dir[0], 0, c.dir[1]);
      pad.run = true;
      const k = r();
      pad.jumpPressed = k < 0.035 || (!p.grounded && k < 0.05);
      pad.jumpHeld = pad.jumpPressed || r() < 0.7;
      pad.attackPressed = r() < 0.03;
      pad.dodgePressed = r() < 0.012;
    }
    if (this.walk) {
      pad.move.set(this.walk[0], 0, this.walk[1]);
      pad.run = true;
    }
    if (this.go && this.go.length >= 2) {
      const gx = this.go[0] - p.position.x;
      const gz = this.go[1] - p.position.z;
      if (Math.hypot(gx, gz) < 0.4) {
        this.go.splice(0, 2);
        this.goStop++;
        if (this.goStow.includes(this.goStop)) pad.stowPressed = true;
        else pad.jumpPressed = p.grounded;
      } else pad.move.set(gx, 0, gz).normalize();
    }
    if (this.jump) {
      this.jumpAt += dt;
      if (this.jumpAt > 2 && p.grounded) {
        this.jumpAt = 0;
        pad.jumpPressed = true;
        this.jumpTwice = true;
      } else if (this.jumpTwice && !p.grounded && p.velocity.y <= 0) {
        this.jumpTwice = false;
        pad.jumpPressed = true;
      }
      pad.jumpHeld = pad.jumpHeld || !p.grounded || pad.jumpPressed;
    }
    if (this.swing > 0) {
      this.swingAt += dt;
      if (this.swingAt > this.swing && p.grounded) {
        this.swingAt = 0;
        pad.attackPressed = true;
      }
    }
    if (this.plunge) {
      // Up, up again at the top, and down sword first.
      this.plungeAt += dt;
      if (this.plungeStep === 0 && this.plungeAt > 3 && p.grounded) {
        this.plungeAt = 0;
        this.plungeStep = 1;
        pad.jumpPressed = true;
      } else if (this.plungeStep === 1 && !p.grounded && p.velocity.y <= 0) {
        this.plungeStep = 2;
        pad.jumpPressed = true;
      } else if (this.plungeStep === 2 && !p.grounded && p.velocity.y <= 0 && this.plungeAt > 0.9) {
        this.plungeStep = 0;
        pad.attackPressed = true;
      }
      pad.jumpHeld = pad.jumpHeld || (!p.grounded && this.plungeStep > 0) || pad.jumpPressed;
    }
  }

  /** The chaos drive's watch (after he has moved): what looks wrong, written once a second at most for each kind. */
  watch(w: Seen, colliders: readonly Aabb[], talking: boolean): void {
    const c = this.chaos;
    if (!c) return;
    const p = w.player.position;
    const v = w.player.velocity;
    const say = (what: string, detail: string): void => {
      if (c.t - (c.said.get(what) ?? -9) < 1) return;
      c.said.set(what, c.t);
      console.warn(`CHAOS ${what} ${w.room} t=${c.t.toFixed(1)} at ${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)} state=${w.player.state} ${detail}`);
    };
    if (![p.x, p.y, p.z, v.x, v.y, v.z].every(Number.isFinite)) say('NAN', '');
    const r = TUNING.rat.radius * 0.8;
    const h = TUNING.rat.height;
    for (const b of colliders) {
      if (b.ramp || !(p.x + r > b.min.x + 0.05 && p.x - r < b.max.x - 0.05 && p.z + r > b.min.z + 0.05 && p.z - r < b.max.z - 0.05 && p.y + h * 0.8 > b.min.y + 0.05 && p.y + 0.15 < b.max.y - 0.05)) continue;
      say('INSIDE', `box ${b.min.x.toFixed(1)},${b.min.y.toFixed(1)},${b.min.z.toFixed(1)}..${b.max.x.toFixed(1)},${b.max.y.toFixed(1)},${b.max.z.toFixed(1)}`);
      break;
    }
    // (Measured again in each room he comes to: he can walk out of one into another.)
    if (c.lowest === undefined || c.room !== w.room) {
      c.lowest = Math.min(...colliders.map((b) => b.min.y));
      c.room = w.room;
    }
    if (p.y < c.lowest - 15) say('FELL-OUT', `below everything (${c.lowest.toFixed(1)})`);
    if (Math.hypot(p.x - c.last.x, p.z - c.last.z) > 0.6) c.last = { x: p.x, z: p.z, t: c.t };
    else if (c.t - c.last.t > 6 && !w.player.dead && !talking) say('STUCK', `for ${(c.t - c.last.t).toFixed(1)} s`);
  }
}
