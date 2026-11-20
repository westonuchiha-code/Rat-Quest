// HAZARDS AND HELPERS (world/hazards.ts; the Gauntlet, Test Room 15: levels/gauntlet.ts, 2026-11-20): a conveyor
// belt that carries him, a pendulum blade and spikes that hurt him, a fan that lifts him; each in the room, with the
// real rat stepped the way main.ts steps him; and the same parts as level-editor pieces.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Scuttler } from '../src/enemies/scuttler';
import { Bat } from '../src/enemies/bat';
import { HAZARD, FOE_HAZARD, HazardFoes, bladeAngle, bladeAt, carry, fanPower, hurt, lift, sounds, spikesUp, type BladeSpec, type FanSpec, type HazardSpec, type SpikeSpec } from '../src/world/hazards';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { compileCustom } from '../src/levels/custom';
import { FANS, GAUNTLET, LEDGE, PHYS, SPIKE_ROW } from '../src/levels/gauntlet';
import { Zones } from '../src/world/hazards';
import { TUNING } from '../src/data/tuning';
import { SFX_NAMES, sfx } from '../src/audio/synth';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const R = TUNING.rat.radius;
const HT = TUNING.rat.height;
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}

// ---- The rules ----
{
  const b: BladeSpec = { kind: 'blade', x: 0, y: 5, z: 0, length: 4, yaw: 0, swing: 0.5, period: 2, phase: 0 };
  const low = bladeAt(b, 0);
  check('a blade at the bottom of its swing hangs straight under its pivot, an arm\'s length down', Math.abs(low.x) < 1e-9 && Math.abs(low.y - 1) < 1e-9 && Math.abs(low.z) < 1e-9);
  const side = bladeAt(b, 0.5);
  check('...a quarter of a swing later it is out to the side, ACROSS the way past it (yaw 0: the way past is along z, so it swings along x)', Math.abs(side.x - 4 * Math.sin(0.5)) < 1e-9 && Math.abs(side.z) < 1e-9);
  const stand = (x: number, z: number): { position: { x: number; y: number; z: number }; prevPosition: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number }; grounded: boolean; dead: boolean } =>
    ({ position: { x, y: 0, z }, prevPosition: { x, y: 0, z }, velocity: { x: 0, y: 0, z: 0 }, grounded: true, dead: false });
  check('standing under it as it comes through: hurt', hurt([b], stand(0, 0), 0, R, HT)?.kind === 'blade');
  check('...standing at one side while it is out at the other: not', hurt([b], stand(-1.8, 0), 0.5, R, HT) === null);
  check('...standing a step along the way past it (out of its plane): not', hurt([b], stand(0, 1.3), 0, R, HT) === null);
  check('...jumping high over it: not', hurt([b], { ...stand(0, 0), position: { x: 0, y: 2.2, z: 0 } }, 0, R, HT) === null);
  const heard = (at: { x: number; z: number }, kind: string, h: HazardSpec, seconds: number): number => {
    let n = 0;
    for (let t = 0.01; t < seconds + 0.01; t += DT) n += sounds([h], t, t + DT, at).filter((s) => s.kind === kind).length;
    return n;
  };
  const swishes = heard({ x: 0, z: 0 }, 'swish', b, 2);
  check('it swishes twice a swing (once through the bottom each way), heard near it, not from far off', swishes === 2 && heard({ x: 30, z: 0 }, 'swish', b, 2) === 0, `${swishes}`);
  (globalThis as { heardOf?: typeof heard }).heardOf = heard;
}
{
  const s: SpikeSpec = { kind: 'spikes', x: 0, y: 0, z: 0, w: 2, d: 2, period: 3, up: 1.2, phase: 0 };
  let up = 0;
  let warn = 0;
  for (let t = 0; t < 3; t += 0.001) {
    const v = spikesUp(s, t);
    if (v === 1) up += 0.001;
    else if (v > 0) warn += 0.001;
  }
  check('spikes are up 1.2 seconds in every 3, after half a second of warning', Math.abs(up - 1.2) < 0.01 && Math.abs(warn - HAZARD.spikes.warn) < 0.01, `up ${up.toFixed(2)} warn ${warn.toFixed(2)}`);
  const on = { position: { x: 0.5, y: 0, z: -0.5 }, prevPosition: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, grounded: true, dead: false };
  check('standing on them while they are up: hurt; while they are down or warning: not', hurt([s], on, 2.5, R, HT)?.kind === 'spikes' && hurt([s], on, 0.5, R, HT) === null && hurt([s], on, 1.6, R, HT) === null);
  check('...in the air over them, above their points: not', hurt([s], { ...on, position: { x: 0.5, y: 0.8, z: -0.5 } }, 2.5, R, HT) === null);
  check('...beside the plate: not', hurt([s], { ...on, position: { x: 1.3, y: 0, z: 0 } }, 2.5, R, HT) === null);
  const heard = (globalThis as { heardOf?: (at: { x: number; z: number }, kind: string, h: HazardSpec, seconds: number) => number }).heardOf!;
  check('they are heard once a beat as they come up', heard({ x: 0, z: 0 }, 'spikes', s, 3) === 1);
}
{
  const f: FanSpec = { kind: 'fan', x: 0, y: 0, z: 0, r: 1, height: 8, on: 3, off: 3 };
  check('a fan that runs and stops: full while on, spinning down and nothing while off, spinning up again', fanPower(f, 1.5) === 1 && fanPower(f, 3.3) > 0 && fanPower(f, 3.3) < 1 && fanPower(f, 4.5) === 0 && fanPower(f, 6.3) > 0 && fanPower(f, 6.3) < 1);
  check('...one without on and off runs all the time', fanPower({ ...f, on: undefined, off: undefined }, 4.5) === 1);
}

// ---- The Gauntlet, with the real rat ----
const def = levelById('gauntlet')!;
check('the Gauntlet is a level', !!def);
const room = buildChamber(def as never);
const hz: HazardSpec[] = room.hazards?.specs ?? [];
check('it has two belts, two blades, four spike plates and two fans', ['belt', 'blade', 'spikes', 'fan'].map((k) => hz.filter((h) => h.kind === k).length).join() === '2,2,4,2');
const noBelts = buildChamber({ ...def, decor: def.decor.filter((d) => d.kind !== 'belt') } as never);
check('only the belts are solid (blades, spikes and fans add nothing to stand on)', room.colliders.length - noBelts.colliders.length === 2);

/** Steps him as main.ts does: the belt and the fan, his update, then what hurts him. How many times he was hurt. */
function run(p: PlayerController, seconds: number, t0: number, pad: (t: number) => Partial<PlayerInput> = () => ({})): { hurts: number; t: number } {
  let hurts = 0;
  let t = t0;
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    t += DT;
    carry(hz, p, DT);
    lift(hz, p, DT, t);
    p.update(DT, input(pad(t)), room.colliders);
    const touch = hurt(hz, p, t, R, HT);
    if (touch) {
      const r = touch.kind === 'blade' ? p.takeHit(touch.x, touch.z, HAZARD.blade.damage, true) : p.takeBurn(touch.x, touch.z, HAZARD.spikes.damage);
      if (r === 'hit' || r === 'killed') hurts++;
    }
  }
  return { hurts, t };
}
const settle = (p: PlayerController): void => {
  for (let i = 0; i < 30; i++) p.update(DT, input(), room.colliders);
};

// Belts.
{
  const east = hz.find((h) => h.kind === 'belt' && Math.sin(h.yaw) > 0.5)!;
  const p = new PlayerController(new THREE.Vector3(east.x - 5, east.y, east.z));
  settle(p);
  const x0 = p.position.x;
  run(p, 2, 0);
  const moved = p.position.x - x0;
  check('standing still on the near belt, it carries him east, 3 a second', Math.abs(moved - 6) < 0.3 && Math.abs(p.position.z - east.z) < 0.05, `moved ${moved.toFixed(2)} in 2 s`);
  run(p, 3, 2);
  check('...and off its end, onto the floor, where it carries him no further', p.position.x > east.x + 6 && p.position.x < east.x + 7.5 && p.grounded && Math.abs(p.position.y) < 0.05, `x ${(p.position.x - east.x).toFixed(2)} from its middle`);
  const west = hz.find((h) => h.kind === 'belt' && Math.sin(h.yaw) < -0.5)!;
  const q = new PlayerController(new THREE.Vector3(west.x - 5, west.y, west.z));
  settle(q);
  const qx = q.position.x;
  run(q, 1, 0, () => ({ move: new THREE.Vector3(1, 0, 0) }));
  const floor = new PlayerController(new THREE.Vector3(0, 0, 8));
  settle(floor);
  const fx = floor.position.x;
  run(floor, 1, 0, () => ({ move: new THREE.Vector3(1, 0, 0) }));
  const against = q.position.x - qx;
  const free = floor.position.x - fx;
  check('...running east against the far belt (which carries west), he gains 3 a second less than on the floor', against > 0 && Math.abs(free - against - 3) < 0.3, `against ${against.toFixed(2)}, on the floor ${free.toFixed(2)}`);
}
// Blades.
{
  const blade = hz.find((h): h is BladeSpec => h.kind === 'blade')!;
  const p = new PlayerController(new THREE.Vector3(blade.x, 0, blade.z));
  settle(p);
  const hp = p.hp;
  const { hurts } = run(p, blade.period * 2, 0);
  check('standing in a blade\'s path, it hurts him', hurts >= 1 && p.hp < hp, `hurt ${hurts} times in two swings`);
  const q = new PlayerController(new THREE.Vector3(blade.x, 0, blade.z));
  settle(q);
  const { hurts: shielded } = run(q, blade.period, 0, () => ({ guardHeld: true }));
  check('...holding the shield up does not stop it (it is too big a blow)', shielded >= 1);
  // Through the corridor, timed: from the mouth, a straight run at some moment of the swing gets through untouched
  // (and at some other moment it does not: it is a hazard).
  let through = 0;
  let caught = 0;
  for (let k = 0; k < 24; k++) {
    const r2 = new PlayerController(new THREE.Vector3(blade.x, 0, 1.5));
    settle(r2);
    const { hurts: h2 } = run(r2, 2, (k / 24) * blade.period, () => ({ move: new THREE.Vector3(0, 0, -1), run: true }));
    if (h2 === 0 && r2.position.z < -10) through++;
    if (h2 > 0) caught++;
  }
  check('...but there is a way through: a straight run, started at the right moment, is not touched (and at the wrong one, is)', through > 0 && caught > 0, `of 24 starting moments: ${through} through clean, ${caught} hurt`);
  check('the two blades are a quarter of a swing apart (never both at the bottom at once)', Math.abs(bladeAngle(blade, 0) - bladeAngle(hz.filter((h): h is BladeSpec => h.kind === 'blade')[1], blade.period / 4)) < 1e-9);
}
// Spikes.
{
  const s = hz.find((h): h is SpikeSpec => h.kind === 'spikes')!;
  const p = new PlayerController(new THREE.Vector3(s.x, 0, s.z));
  settle(p);
  const hp = p.hp;
  const { hurts } = run(p, s.period, 0);
  check('standing on a spike plate for a beat: hurt', hurts >= 1 && p.hp < hp);
  const q = new PlayerController(new THREE.Vector3(s.x, 0, s.z));
  settle(q);
  const { hurts: rolled } = run(q, s.period, 0, (t) => ({ dodgePressed: Math.abs(spikesUp(s, t + 0.05) - 1) < 1e-9 && spikesUp(s, t) < 1 }));
  check('...rolling as they come up does not help', rolled >= 1);
  const lit = SPIKE_ROW.at.length;
  check(`the corridor has ${lit} plates a quarter beat apart, so one is always up`, Array.from({ length: 30 }, (_, k) => (k / 30) * SPIKE_ROW.period).every((t) => hz.some((h) => h.kind === 'spikes' && spikesUp(h, t) === 1)));
}
// Fans.
{
  const p = new PlayerController(new THREE.Vector3(FANS.lift.x, 0, FANS.lift.z));
  settle(p);
  let top = 0;
  const { t } = run(p, 4, 0);
  const hover: number[] = [];
  run(p, 2, t);
  for (let i = 0; i < 60; i++) {
    run(p, DT, t + 2 + i * DT);
    hover.push(p.position.y);
    top = Math.max(top, p.position.y);
  }
  const lowH = Math.min(...hover);
  check('standing on the fan, it lifts him and he hovers near the top of its column', lowH > FANS.lift.height * 0.8 && top < FANS.lift.height + 0.2, `between ${lowH.toFixed(2)} and ${top.toFixed(2)} of ${FANS.lift.height}`);
  check('...high enough to reach the ledge', lowH > LEDGE.top + 0.5);
  run(p, 2, t + 4, () => ({ move: new THREE.Vector3(0, 0, -1) }));
  run(p, 2, t + 6);
  check('...and steering off it toward the back wall, he lands on the ledge', p.grounded && Math.abs(p.position.y - LEDGE.top) < 0.05 && p.position.z < LEDGE.front, `y ${p.position.y.toFixed(2)} z ${p.position.z.toFixed(2)}`);
  // The fan that runs and stops: up while on, down to the floor while off.
  const pulse = hz.find((h): h is FanSpec => h.kind === 'fan' && !!h.on)!;
  const q = new PlayerController(new THREE.Vector3(pulse.x, 0, pulse.z));
  settle(q);
  let hi = 0;
  for (let i = 0; i < Math.round(3 / DT); i++) {
    run(q, DT, i * DT);
    hi = Math.max(hi, q.position.y);
  }
  run(q, 3, 3);
  check('the fan that runs and stops lifts him while it runs, and lets him down when it stops', hi > 4 && q.grounded && q.position.y < 0.05, `highest ${hi.toFixed(2)}, then ${q.position.y.toFixed(2)}`);
}
check('the bays are where their boards say: belts, blades, spikes, fans, west to east', GAUNTLET.belts < GAUNTLET.blades && GAUNTLET.blades < GAUNTLET.spikes && GAUNTLET.spikes < GAUNTLET.fans);

// ---- On creatures (a roach, a bat), stepped as main.ts steps them ----
{
  const step = (hf: HazardFoes, foes: Array<Scuttler | Bat>, seconds: number, t0 = 0): Array<{ kind: string; killed: boolean }> => {
    const out: Array<{ kind: string; killed: boolean }> = [];
    for (let t = t0; t < t0 + seconds - 1e-9; t += DT) out.push(...hf.act(hz, foes, DT, t));
    return out;
  };
  const east = hz.find((h) => h.kind === 'belt' && Math.sin(h.yaw) > 0.5)!;
  const roach = new Scuttler({ x: east.x - 4, z: east.z, y: east.y, arena: { x0: -30, x1: 30, z0: -16, z1: 16 } });
  const x0 = roach.x;
  step(new HazardFoes(), [roach], 1);
  check('a roach standing on the near belt is carried east with it, 3 a second', Math.abs(roach.x - x0 - 3) < 0.05 && Math.abs(roach.z - east.z) < 1e-6, `moved ${(roach.x - x0).toFixed(2)}`);
  const blade = hz.find((h): h is BladeSpec => h.kind === 'blade')!;
  const r2 = new Scuttler({ x: blade.x, z: blade.z, arena: { x0: -30, x1: 30, z0: -16, z1: 16 } });
  // (One pass: it touches the roach for about half a second each time through; the next pass begins 0.94 s on.)
  const hits = step(new HazardFoes(), [r2], 0.9);
  check('a roach in a blade\'s path is struck as it comes through, once (not every frame it touches)', hits.filter((h) => h.kind === 'blade').length === 1, `${hits.length} blows`);
  const tough = new Scuttler({ x: blade.x, z: blade.z, arena: { x0: -30, x1: 30, z0: -16, z1: 16 } });
  let dead = false;
  for (let k = 0; k < 20 && !dead; k++) dead = step(new HazardFoes(), [tough], blade.period, k * blade.period).some((h) => h.killed) || !tough.alive;
  check('...and left there, the blade kills it in the end', !tough.alive);
  const sp = hz.find((h): h is SpikeSpec => h.kind === 'spikes')!;
  const r3 = new Scuttler({ x: sp.x, z: sp.z, arena: { x0: -30, x1: 30, z0: -16, z1: 16 } });
  const sh = step(new HazardFoes(), [r3], sp.period);
  check(`a roach on spikes is struck while they are up, at most once in ${FOE_HAZARD.cooldown} s`, sh.length >= 1 && sh.length <= Math.ceil(sp.up / FOE_HAZARD.cooldown) && sh.every((h) => h.kind === 'spikes'), `${sh.length} in a beat`);
  const fan = hz.find((h): h is FanSpec => h.kind === 'fan' && !h.on)!;
  const r4 = new Scuttler({ x: fan.x + 0.2, z: fan.z, arena: { x0: -30, x1: 30, z0: -16, z1: 16 } });
  step(new HazardFoes(), [r4], 1.5);
  check('a roach that walks onto a fan is blown off it (a creature keeps to its floor: it is not lifted)', Math.hypot(r4.x - fan.x, r4.z - fan.z) > fan.r + r4.radius - 0.01 && r4.y === 0, `${Math.hypot(r4.x - fan.x, r4.z - fan.z).toFixed(2)} from its middle`);
  // A bat (a flier): the belt, the spikes and the fan leave it alone; a blade does not.
  const bats = [
    new Bat({ x: east.x, z: east.z, y: east.y }), new Bat({ x: sp.x, z: sp.z, y: 0 }), new Bat({ x: fan.x + 0.2, z: fan.z, y: 0 }), new Bat({ x: blade.x, z: blade.z, y: 0.6 }),
  ];
  // (A bat roosts high; these are flying low, at a rat's head height.)
  for (const b of bats) b.y = (b === bats[0] ? east.y : 0) + 0.6;
  const at = bats.map((b) => [b.x, b.z]);
  const bh = step(new HazardFoes(), bats, sp.period);
  check('a bat over a belt, spikes or a fan is left alone by them', bats.slice(0, 3).every((b, i) => b.x === at[i][0] && b.z === at[i][1]) && !bh.some((h) => h.kind === 'spikes'));
  check('...but a blade strikes a bat in its path', bh.some((h) => h.kind === 'blade'));
}

// ---- Float zone, mud, launcher (2026-11-20), with the real rat, as main.ts steps them ----
{
  const g = (p: PlayerController): number => TUNING.physics.gravity * (p.velocity.y < 0 ? TUNING.physics.fallGravityMultiplier : 1) * p.feel.foot.gravity;
  /** Steps him with the zones (and the stick scaled by the mud, as main.ts does): how far he went across, his peak. */
  const go = (p: PlayerController, z: Zones, seconds: number, pad: (k: number) => Partial<PlayerInput>): { peak: number; launched: number } => {
    let peak = p.position.y;
    let launched = 0;
    for (let k = 0; k < Math.round(seconds / DT); k++) {
      const r = z.step(hz, p, DT, g(p), k * DT);
      if (r.launched) launched++;
      const i = input(pad(k));
      if (r.stride < 1) i.move.multiplyScalar(r.stride);
      // (As main.ts: flying from a launcher counts as holding jump.)
      if (z.flying) i.jumpHeld = true;
      p.update(DT, i, room.colliders);
      peak = Math.max(peak, p.position.y);
    }
    return { peak, launched };
  };
  const jumpPeak = (x: number): number => {
    const p = new PlayerController(new THREE.Vector3(x, 0, PHYS.z));
    settle(p);
    return go(p, new Zones(), 3, (k) => ({ jumpPressed: k === 2, jumpHeld: true })).peak;
  };
  const outside = jumpPeak(PHYS.float.x + 12);
  const inside = jumpPeak(PHYS.float.x);
  check('FLOAT: in the float zone a jump goes about three times as high as outside it (a third of the pull)', inside > outside * 2.4 && inside < outside * 3.6, `${outside.toFixed(2)} outside, ${inside.toFixed(2)} inside`);
  const f = new PlayerController(new THREE.Vector3(PHYS.float.x - 2.5, 0, PHYS.z));
  settle(f);
  go(f, new Zones(), 5, (k) => ({ jumpPressed: k === 2, jumpHeld: true, move: k > 30 ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3() }));
  check('...and from its floor he floats up and onto the high ledge beside it', f.grounded && Math.abs(f.position.y - PHYS.float.ledge.top) < 0.05, `y ${f.position.y.toFixed(2)}`);
  const walk = (x: number): number => {
    const p = new PlayerController(new THREE.Vector3(x, 0, PHYS.z - 1.5));
    settle(p);
    const x0 = p.position.x;
    go(p, new Zones(), 1, () => ({ move: new THREE.Vector3(1, 0, 0) }));
    return p.position.x - x0;
  };
  const dry = walk(PHYS.mud.x + 14);
  const wet = walk(PHYS.mud.x - 3);
  check(`MUD: walking through it he goes ${PHYS.mud.slow} as far as on dry floor`, Math.abs(wet / dry - PHYS.mud.slow) < 0.08, `${wet.toFixed(2)} in the mud, ${dry.toFixed(2)} dry, in a second`);
  const l = new PlayerController(new THREE.Vector3(PHYS.launcher.x - 3, 0, PHYS.z));
  settle(l);
  const shot = go(l, new Zones(), 4, (k) => ({ move: k < 55 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3() }));
  check('LAUNCHER: he walks onto it and it fires him, once', shot.launched === 1);
  check('...across onto the ledge beyond (it holds his speed across till he lands)', l.grounded && Math.abs(l.position.y - PHYS.launcher.ledge.top) < 0.05 && l.position.x > PHYS.launcher.ledge.x0 && l.position.x < PHYS.launcher.ledge.x1, `at ${l.position.x.toFixed(2)}, ${l.position.y.toFixed(2)}`);
}

// ---- In the level editor ----
{
  const lvl = compileCustom({
    name: 'Kit', blurb: '', theme: 'dungeon', width: 20, depth: 20, wallHeight: 10,
    pieces: [
      { t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 },
      { t: 'spawn', x0: 0, z0: 6, x1: 0, z1: 6, top: 0 },
      { t: 'belt', x0: -6, z0: -2, x1: 0, z1: 0, top: 0, dir: 'e' },
      { t: 'blade', x0: 3, z0: 0, x1: 3, z1: 0, top: 0 },
      { t: 'spikes', x0: -2, z0: 3, x1: 0, z1: 5, top: 0 },
      { t: 'fan', x0: 5, z0: 5, x1: 5, z1: 5, top: 0 },
    ],
  }, 'kit');
  const ds = lvl.decor;
  const belt = ds.find((d) => d.kind === 'belt');
  check('the editor\'s Conveyor belt, Swinging blade, Spike floor and Floor fan become the parts', !!belt && ds.some((d) => d.kind === 'blade') && ds.some((d) => d.kind === 'spikes') && ds.some((d) => d.kind === 'fan'));
  check('...a belt turned east carries east, its top a low step up', !!belt && belt.kind === 'belt' && Math.abs(Math.sin(belt.yaw) - 1) < 1e-9 && Math.abs(belt.y - 0.35) < 1e-9 && belt.w === 6);
}

check('the spikes\' sound is one the game has, and makes a sound', SFX_NAMES.includes('spikeUp') && sfx('spikeUp').data.some((v) => Math.abs(v) > 0.2));

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
