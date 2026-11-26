/**
 * THE GAME'S ROBOT PLAYER (2026-11-26): `&autoplay` on the address. It plays the game's first two areas by itself, with
 * the pad and nothing else: out of the pool, the crumbs, the climb to the sword, the shield from Pip, the ant, the
 * Warden, through the Old Gate, and round the Sluice's loop (the cracked wall, the pair, the catch, the bridge, the key,
 * the vault). The owner asked for "one continuous scripted playthrough". It is a development aid: nobody's game has
 * it, and it changes no rule. It says what it is doing on the console ("BOT ..."), for the script that watches it.
 *
 * It plays like a careful player, not a perfect one: it rolls aside when a blow is coming and strikes in between; it
 * falls off the climb sometimes and goes round again; it can die, and carries on from the lantern.
 */
import type * as THREE from 'three';
import type { Pad } from './filmDrive';
import { FLOTSAM as F, FLOTSAM_ID } from '../levels/flotsam';
import { SLUICE as S, SLUICE_ID } from '../levels/sluice';

export interface BotSees {
  room: string;
  player: { position: THREE.Vector3; grounded: boolean; dead: boolean; state: string; hp: number; facing: number };
  foes: ReadonlyArray<{ alive: boolean; kind: string; x: number; y: number; z: number; attackActive?: boolean }>;
  /** Moving platforms, where they are now. */
  movers: ReadonlyArray<{ x0: number; x1: number; z0: number; z1: number; top: number }>;
  crumbs: number;
  sword: string;
  shield: string;
  carrying: boolean;
  shopOpen: boolean;
  buy(): void;
  closeShop(): void;
}

type Step = { name: string; room: string; run: (w: BotSees, pad: Pad, dt: number) => boolean; fights?: boolean };
type P3 = [number, number, number];

export class GameBot {
  private i = 0;
  private t = 0;
  private stepT = 0;
  private swing = 0;
  private roll = 0;
  private side = 1;
  private deaths = 0;
  private wasDead = false;
  private said = '';
  private hopState: { phase: number; from: THREE.Vector3 | null; t: number } = { phase: 0, from: null, t: 0 };
  private tap = 0;
  private dbg = 0;
  private stuckT = 0;
  private stuckAt = { x: 0, z: 0 };
  private roundFor = 0;
  private roundSide = 1;
  private readonly steps: Step[];
  done = false;

  /** `from`: the name of a step to begin at (`&botfrom=...`, for trying one part without the ones before it). */
  constructor(from = '') {
    const c = (q: readonly number[]): P3 => [(q[0] + q[2]) / 2, q[4], (q[1] + q[3]) / 2];
    const st = F.steps;
    const plankRest: P3 = [(F.plank.x0 + F.plank.x1) / 2, F.plank.top, (F.plank.z0 + F.plank.z1) / 2];
    const go = (name: string, room: string, x: number, z: number, fights = true, near = 0.5): Step => ({ name, room, fights, run: (w, pad) => this.goto(w, pad, x, z, near) < near });
    const hop = (name: string, from: P3, to: P3, lead: number): Step => ({ name, room: FLOTSAM_ID, fights: false, run: (w, pad, dt) => this.hop(w, pad, dt, from, to, lead) });
    const plank = (w: BotSees) => w.movers.find((m) => Math.abs(m.top - F.plank.top) < 0.3 && m.x1 - m.x0 < 4);
    this.steps = [
      // ---- FLOTSAM
      { name: 'out of the pool', room: FLOTSAM_ID, fights: false, run: (w, pad, dt) => {
        const p = w.player;
        if (p.grounded && p.position.z < F.pool.z - 0.3 && p.position.y > -0.1) return true;
        pad.move.set(0, 0, -1);
        this.tap -= dt;
        if (p.state === 'swim' && p.position.z < F.pool.z + 1.2 && this.tap <= 0) {
          pad.jumpPressed = pad.jumpHeld = true;
          this.tap = 0.5;
        }
        return false;
      } },
      go('the first crumb', FLOTSAM_ID, 0.3, 17.5, true, 0.2), go('the second', FLOTSAM_ID, 0.8, 15, true, 0.2), go('the third', FLOTSAM_ID, 1.3, 12.5, true, 0.2),
      go('to the foot of the wreck', FLOTSAM_ID, -6, 12.5, true, 0.3),
      hop('the climb: onto step 1', [-6, 0, 12.5], c(st[0]), 0),
      hop('the climb: step 2', c(st[0]), c(st[1]), 0.8),
      { name: 'the climb: wait for the plank', room: FLOTSAM_ID, fights: false, run: (w, pad) => {
        if (this.fell(w, st[1][4])) return this.back('the climb: onto step 1');
        const m = plank(w);
        this.goto(w, pad, c(st[1])[0], c(st[1])[2], 0.15);
        // (At rest against this step, and only just come to rest: so there is time to get on before it leaves.)
        return !!m && Math.abs((m.x0 + m.x1) / 2 - plankRest[0]) < 0.08 && this.stepT > 0.6;
      } },
      hop('the climb: onto the plank', c(st[1]), plankRest, 0.8),
      { name: 'the climb: ride the plank', room: FLOTSAM_ID, fights: false, run: (w, pad) => {
        if (this.fell(w, F.plank.top)) return this.back('the climb: onto step 1');
        const m = plank(w);
        if (!m) return false;
        this.goto(w, pad, (m.x0 + m.x1) / 2, (m.z0 + m.z1) / 2, 0.2);
        return m.x0 <= F.plank.x0 - F.plank.travel + 0.12;
      } },
      hop('the climb: step 3', [plankRest[0] - F.plank.travel, F.plank.top, plankRest[2]], c(st[2]), 0),
      hop('the climb: step 4', c(st[2]), c(st[3]), 1),
      hop('the climb: step 5', c(st[3]), c(st[4]), 1),
      hop('the climb: the deck', c(st[4]), [F.deck.x0 + 1.5, F.deck.top, -3.5], 1),
      { name: 'the sword', room: FLOTSAM_ID, fights: false, run: (w, pad) => {
        if (this.fell(w, F.deck.top)) return this.back('the climb: onto step 1');
        this.goto(w, pad, F.sword.x, F.sword.z, 0.2);
        return w.sword === 'ratSword';
      } },
      go('down off the wreck', FLOTSAM_ID, -8, 5, true, 1.2),
      go('across the yard', FLOTSAM_ID, 10, 5, true, 1),
      { name: 'more crumbs, if he is short', room: FLOTSAM_ID, run: (w, pad) => {
        if (w.crumbs >= F.crumbsNeeded) return true;
        const spare: Array<[number, number]> = [[14.8, 12.2], [20.4, 7]];
        const at = spare[Math.min(spare.length - 1, Math.floor(this.stepT / 9))];
        this.goto(w, pad, at[0], at[1], 0.3);
        return this.stepT > 20;
      } },
      go('to Pip', FLOTSAM_ID, F.shop.x - 0.4, F.shop.z + 1.7, true, 0.4),
      { name: 'buy the shield', room: FLOTSAM_ID, fights: false, run: (w, pad, dt) => {
        if (w.shield === 'ratShield') {
          if (w.shopOpen) w.closeShop();
          return !w.shopOpen;
        }
        if (w.crumbs < F.crumbsNeeded) return this.stepT > 3;
        this.tap -= dt;
        if (w.shopOpen) {
          if (this.tap <= 0) {
            w.buy();
            this.tap = 0.6;
          }
        } else if (this.tap <= 0) {
          pad.jumpPressed = true;
          this.tap = 0.8;
        }
        return false;
      } },
      go('toward the gate', FLOTSAM_ID, 5, -2),
      go('the lantern by the gate', FLOTSAM_ID, F.lanterns[1].x - 0.6, F.lanterns[1].z + 0.8, true, 0.5),
      { name: 'the ant before the gate', room: FLOTSAM_ID, run: (w, pad) => {
        const ant = w.foes.find((e) => e.alive && e.kind === 'ant');
        if (!ant) return true;
        this.goto(w, pad, ant.x, ant.z + 2.5, 2);
        return false;
      } },
      go('to the gap in the wall', FLOTSAM_ID, 0, F.wall.z + 3), go('into the court', FLOTSAM_ID, 0, F.wall.z - 3),
      { name: 'THE WARDEN', room: FLOTSAM_ID, run: (w, pad) => {
        const boss = w.foes.find((e) => e.kind === 'stag');
        if (!boss || !boss.alive) return true;
        if (w.player.position.z > F.wall.z) this.goto(w, pad, 0, F.wall.z - 3, 1);
        else this.goto(w, pad, boss.x, boss.z, 3);
        return false;
      } },
      go('through the Old Gate', FLOTSAM_ID, 0, F.gate.z - 1.2, false, 0.6),
      { name: 'the door on', room: FLOTSAM_ID, fights: false, run: (w, pad) => {
        pad.move.set(0, 0, -1);
        return w.room === SLUICE_ID;
      } },
      // ---- THE SLUICE
      go('the near bank', SLUICE_ID, -8, 17),
      go('to the long way', SLUICE_ID, -17.5, 9),
      go('up to the cracked wall', SLUICE_ID, -17.5, S.crack.z + 1.5, false, 0.3),
      { name: 'break the cracked wall', room: SLUICE_ID, fights: false, run: (w, pad, dt) => {
        pad.move.set(0, 0, -0.3);
        this.swing -= dt;
        if (this.swing <= 0) {
          pad.attackPressed = true;
          this.swing = 0.5;
        }
        return w.player.position.z < S.crack.z - 1;
      } },
      go('onto the far bank', SLUICE_ID, -17.5, -10), go('toward the pair', SLUICE_ID, -6, -12),
      { name: 'the ant and the roach', room: SLUICE_ID, run: (w, pad) => {
        const left = w.foes.filter((e) => e.alive && (e.kind === 'ant' || e.kind === 'scuttler') && e.z < S.chasm.z0);
        if (!left.length) return true;
        this.goto(w, pad, left[0].x, left[0].z, 2.5);
        return false;
      } },
      go('to the catch', SLUICE_ID, S.catch.x, S.catch.z - 1.5, true, 0.3),
      { name: 'strike the catch', room: SLUICE_ID, fights: false, run: (w, pad, dt) => {
        pad.move.set(0, 0, 0.3);
        this.swing -= dt;
        if (this.swing <= 0 && this.stepT > 0.4) {
          pad.attackPressed = true;
          this.swing = 0.6;
        }
        // (The bridge: the wide thing that moves, lying flat at the banks' height.)
        return w.movers.some((m) => m.z1 - m.z0 > 8 && Math.abs(m.top) < 0.25) && this.stepT > 1.5;
      } },
      go('to the key\'s corner', SLUICE_ID, S.key.x, S.key.z + 3.4),
      { name: 'the bats', room: SLUICE_ID, run: (w, pad) => {
        const bats = w.foes.filter((e) => e.alive && e.kind === 'bat');
        this.goto(w, pad, S.key.x - 1.5, S.key.z + 3.5, 1);
        return !bats.length || this.stepT > 25;
      } },
      go('up to the key', SLUICE_ID, S.key.x, S.key.z + 1.5, false, 0.25),
      { name: 'lift the key', room: SLUICE_ID, fights: false, run: (w, pad, dt) => {
        if (w.carrying) return true;
        pad.move.set(0, 0, -0.2);
        this.tap -= dt;
        if (this.tap <= 0 && this.stepT > 0.4) {
          pad.stowPressed = true;
          this.tap = 0.9;
        }
        return false;
      } },
      go('with the key: to the bridge', SLUICE_ID, S.bridge.x, S.chasm.z0 - 1.5, false),
      go('with the key: over the bridge', SLUICE_ID, S.bridge.x, S.chasm.z1 + 1.5, false),
      go('with the key: to the vault', SLUICE_ID, S.vault.gateX, S.vault.z0 - 2.5, false),
      go('with the key: into the vault', SLUICE_ID, S.vault.gateX, S.vault.z0 + 2, false, 0.6),
      go('the prize', SLUICE_ID, S.vault.prize.x, S.vault.prize.z, false, 0.4),
    ];
    if (from) this.i = Math.max(0, this.steps.findIndex((x) => x.name === from));
  }

  /** Runs toward a place; returns how far off it is. */
  private goto(w: BotSees, pad: Pad, x: number, z: number, near: number): number {
    const p = w.player.position;
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > near) {
      const k = d > 1.2 ? 1 : 0.45;
      let mx = (x - p.x) / d;
      let mz = (z - p.z) / d;
      // ROUND THINGS: if he has been pushing and getting nowhere, he steps out to one side for a moment (and hops),
      // as anyone would round a spool; the other side next time.
      this.stuckT += 1 / 60;
      if (this.stuckT > 0.5) {
        if (Math.hypot(p.x - this.stuckAt.x, p.z - this.stuckAt.z) < 0.12 && this.roundFor <= 0) {
          this.roundFor = 0.75;
          this.roundSide = -this.roundSide;
          pad.jumpPressed = pad.jumpHeld = w.player.grounded;
        }
        this.stuckAt = { x: p.x, z: p.z };
        this.stuckT = 0;
      }
      if (this.roundFor > 0) {
        this.roundFor -= 1 / 60;
        [mx, mz] = [mz * this.roundSide * 0.9 + mx * 0.3, -mx * this.roundSide * 0.9 + mz * 0.3];
      }
      pad.move.set(mx * k, 0, mz * k);
      pad.run = d > 3;
    } else pad.move.set(0, 0, 0);
    return d;
  }
  /** He has come off the climb (he is on the floor, well under where he should be). */
  private fell(w: BotSees, shouldBe: number): boolean {
    return w.player.grounded && w.player.position.y < shouldBe - 0.6;
  }
  /** Back to an earlier step, by name. */
  private back(name: string): boolean {
    this.i = this.steps.findIndex((s) => s.name === name) - 1;
    this.hopState = { phase: 0, from: null, t: 0 };
    console.log(`BOT ${this.t.toFixed(1)}s  fell: back to "${name}"`);
    return true;
  }
  /** One jump of the climb: to a run-up point, then at the next place with a jump. Falls: the climb again. */
  private hop(w: BotSees, pad: Pad, dt: number, from: P3, to: P3, lead: number): boolean {
    const p = w.player;
    const h = this.hopState;
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const len = Math.hypot(dx, dz) || 1;
    const sx = from[0] - (dx / len) * lead;
    const sz = from[2] - (dz / len) * lead;
    if (from[1] > 0.5 && this.fell(w, from[1])) return this.back('the climb: onto step 1');
    if (h.phase === 0) {
      // To the run-up point, and stood still on it.
      if (this.goto(w, pad, sx, sz, 0.12) < 0.12 && p.grounded) {
        h.t += dt;
        if (h.t > 0.25) {
          h.phase = 1;
          h.from = p.position.clone();
          h.t = 0;
        }
      } else h.t = 0;
      return false;
    }
    if (h.phase === 1) {
      pad.move.set(dx / len, 0, dz / len);
      pad.run = true;
      const gone = Math.hypot(p.position.x - h.from!.x, p.position.z - h.from!.z);
      if (gone >= 0.2 && p.grounded) {
        pad.jumpPressed = true;
        pad.jumpHeld = true;
        h.phase = 2;
        h.t = 0;
      }
      return false;
    }
    // In the air: held toward the place, the jump held; then down.
    h.t += dt;
    const d = Math.hypot(to[0] - p.position.x, to[2] - p.position.z);
    if (d > 0.25) pad.move.set((to[0] - p.position.x) / d, 0, (to[2] - p.position.z) / d);
    pad.run = true;
    pad.jumpHeld = h.t < 0.35;
    if (p.grounded && h.t > 0.2) {
      const ok = Math.abs(p.position.y - to[1]) < 0.2;
      this.hopState = { phase: 0, from: null, t: 0 };
      if (ok) return true;
      if (to[1] > 1.5) return this.back('the climb: onto step 1');
    }
    return false;
  }
  /** The fight, laid over whatever he is doing: a creature near him is dealt with first. Returns true if it has the pad. */
  private fight(w: BotSees, pad: Pad, dt: number): boolean {
    const p = w.player.position;
    let near: BotSees['foes'][number] | null = null;
    let nd = 9;
    for (const e of w.foes) {
      if (!e.alive || e.kind === 'toad') continue;
      const d = Math.hypot(e.x - p.x, e.z - p.z);
      if (d < nd && Math.abs(e.y - p.y) < 5) {
        nd = d;
        near = e;
      }
    }
    this.swing -= dt;
    this.roll -= dt;
    if (!near) return false;
    this.dbg -= dt;
    if (this.dbg <= 0) {
      this.dbg = 6;
      console.log(`BOT   (fighting a ${near.kind} at ${near.x.toFixed(1)}, ${near.y.toFixed(1)}, ${near.z.toFixed(1)}; he is at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}, ${nd.toFixed(1)} off)`);
    }
    const dx = (near.x - p.x) / (nd || 1);
    const dz = (near.z - p.z) / (nd || 1);
    const big = near.kind === 'stag';
    // (How near he must be to strike: the creature's own size, and his sword's length. Half a sword is half a reach.)
    const reach = (big ? 1.2 : 0.5) + (w.sword === 'brokenSword' ? 0.7 : 1.15);
    if (near.attackActive && nd < reach + 2.6 && this.roll <= 0) {
      // A blow coming: roll out to one side of it.
      this.side = -this.side;
      pad.move.set(dz * this.side, 0, -dx * this.side);
      pad.dodgePressed = true;
      this.roll = 0.7;
      return true;
    }
    if (this.roll > 0.35) {
      pad.move.set(dz * this.side, 0, -dx * this.side);
      return true;
    }
    if (nd > reach) {
      pad.move.set(dx, 0, dz);
      pad.run = nd > 4;
    } else {
      pad.move.set(dx * 0.05, 0, dz * 0.05);
      if (this.swing <= 0 && !near.attackActive) {
        pad.attackPressed = true;
        this.swing = 0.42;
      }
    }
    return true;
  }

  drive(dt: number, pad: Pad, w: BotSees): void {
    this.t += dt;
    if (this.done) return;
    if (w.player.dead) {
      if (!this.wasDead) {
        this.deaths++;
        console.log(`BOT ${this.t.toFixed(1)}s  DIED in "${this.steps[this.i]?.name}" (deaths so far: ${this.deaths})`);
        if (this.deaths >= 10) {
          console.log(`BOT ${this.t.toFixed(1)}s  STUCK: ten deaths. It cannot get past "${this.steps[this.i]?.name}".`);
          this.done = true;
        }
      }
      this.wasDead = true;
      return;
    }
    if (this.wasDead) {
      // Up again at a lantern: the climb, if he was on it, is begun again; a walk is simply walked again.
      this.wasDead = false;
      this.hopState = { phase: 0, from: null, t: 0 };
      const s = this.steps[this.i];
      if (s?.name.startsWith('the climb')) this.i = this.steps.findIndex((x) => x.name === 'to the foot of the wreck');
      if (s?.name === 'THE WARDEN' || s?.name === 'into the court') this.i = this.steps.findIndex((x) => x.name === 'toward the gate');
      if (s?.name.startsWith('with the key') || s?.name === 'the prize') this.i = this.steps.findIndex((x) => x.name === 'up to the key');
      this.stepT = 0;
    }
    const s = this.steps[this.i];
    if (!s) {
      this.done = true;
      console.log(`BOT ${this.t.toFixed(1)}s  DONE: both areas played through. Deaths: ${this.deaths}. Hearts left: ${w.player.hp}. Crumbs in his purse: ${w.crumbs}.`);
      return;
    }
    if (s.name !== this.said) {
      this.said = s.name;
      console.log(`BOT ${this.t.toFixed(1)}s  ${w.room}: ${s.name}  (hearts ${w.player.hp}, crumbs ${w.crumbs}, ${w.sword}, ${w.shield})`);
    }
    if (s.room !== w.room) {
      // (Through a door into the next area: the steps of the one he has left are over.)
      const next = this.steps.findIndex((x, k) => k > this.i && x.room === w.room);
      if (next > this.i) {
        this.i = next;
        this.stepT = 0;
      }
      return;
    }
    pad.move.set(0, 0, 0);
    pad.run = false;
    pad.jumpPressed = pad.jumpHeld = pad.attackPressed = pad.dodgePressed = pad.guardHeld = pad.stowPressed = false;
    this.stepT += dt;
    if (s.fights !== false && !w.carrying && this.fight(w, pad, dt)) {
      // (He still watches whether the step is done: the Warden's step ends when the Warden does.)
      const keep = { x: pad.move.x, z: pad.move.z, run: pad.run, a: pad.attackPressed, d: pad.dodgePressed };
      const done = s.run(w, pad, 0);
      pad.move.set(keep.x, 0, keep.z);
      pad.run = keep.run;
      pad.attackPressed = keep.a;
      pad.dodgePressed = keep.d;
      pad.jumpPressed = pad.jumpHeld = pad.stowPressed = false;
      if (!done) return;
    } else if (!s.run(w, pad, dt)) {
      if (this.stepT > 150) {
        console.log(`BOT ${this.t.toFixed(1)}s  STUCK in "${s.name}" at ${w.player.position.x.toFixed(1)}, ${w.player.position.y.toFixed(1)}, ${w.player.position.z.toFixed(1)}`);
        this.done = true;
      }
      return;
    }
    this.i++;
    this.stepT = 0;
    this.tap = 0;
    this.swing = 0;
  }
}
