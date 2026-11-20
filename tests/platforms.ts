// KINDS OF MOVING PLATFORM (world/platforms.ts, 2026-11-20), each driven with the real controller standing on it, in a
// room with nothing else: circle, ride, sink, crumble, spring. (The glide every level already uses is tests/movers.ts.)
import './../src/core/colorSetup';
import * as THREE from 'three';
import { buildChamber } from '../src/world/chamber';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { PLATFORM, blinkAt, pathAt, swingAt } from '../src/world/platforms';
import { levelById } from '../src/levels/levels';
import { FRONT } from '../src/levels/workshop';
import { compileCustom } from '../src/levels/custom';
import type { MoverSpec } from '../src/world/layout';
import { TUNING } from '../src/data/tuning';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const DT = 1 / 60;
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, ...o });
/** A room: a floor at 0 (lower, and the game puts him back at the start, as from a fall), and one platform, its top at
 * y 4, 3 by 3, around (0, 0). */
function room(spec: Partial<MoverSpec>): { ch: ReturnType<typeof buildChamber>; p: PlayerController; top: () => number } {
  const ch = buildChamber({ solids: [{ kind: 'floor', x0: -30, x1: 30, y0: -1, y1: 0, z0: -30, z1: 30 }], pit: null, water: [], decor: [], movers: [{ x: 0, z: 0, y: 4, w: 3, d: 3, to: [0, 0, 0], ...spec }] } as never);
  const p = new PlayerController(new THREE.Vector3(0, 4.05, 0));
  return { ch, p, top: () => ch.movers[0].aabb.max.y };
}
/** Runs the game's order for `seconds`: platforms first (carrying him), then him. */
function run(r: ReturnType<typeof room>, seconds: number, inp: (t: number) => Partial<PlayerInput> = () => ({}), each?: (t: number) => void): void {
  for (let t = 0; t < seconds; t += DT) {
    r.ch.stepMovers(DT, r.p);
    r.p.update(DT, input(inp(t)), r.ch.colliders);
    each?.(t);
  }
}
const mid = (r: ReturnType<typeof room>): THREE.Vector3 => {
  const a = r.ch.movers[0].aabb;
  return new THREE.Vector3((a.min.x + a.max.x) / 2, a.max.y, (a.min.z + a.max.z) / 2);
};

// ---- circle ----
{
  const r = room({ motion: 'circle', to: [3, 0, 0], speed: 2 });
  let far = 0;
  let onIt = true;
  run(r, (2 * Math.PI * 3) / 2 / 2, () => ({}), () => {
    const m = mid(r);
    far = Math.max(far, Math.hypot(m.x, m.z));
    if (Math.hypot(r.p.position.x - m.x, r.p.position.z - m.z) > 1.2 || Math.abs(r.p.position.y - m.y) > 0.1) onIt = false;
  });
  check('CIRCLE: it goes round a middle (3 from it at the start), and carries him round with it, standing', Math.abs(far - 6) < 0.05 && onIt, `${far.toFixed(2)} from the middle at most`);
  run(r, (2 * Math.PI * 3) / 2 / 2);
  check('...and a whole turn brings it back to where it started', mid(r).distanceTo(new THREE.Vector3(0, 4, 0)) < 0.05, mid(r).toArray().map((v) => v.toFixed(2)).join(', '));
}

// ---- ride ----
{
  const r = room({ motion: 'ride', to: [0, 4, 0], speed: 2 });
  // (Him somewhere else first: it waits.)
  r.p.position.set(20, 0, 0);
  r.p.prevPosition.copy(r.p.position);
  run(r, 2);
  check('RIDE: with nobody on it, it waits where it is', Math.abs(r.top() - 4) < 1e-6);
  r.p.position.set(0, 4.05, 0);
  r.p.prevPosition.copy(r.p.position);
  run(r, 3);
  check('...he steps on: it takes him all the way up, and him on it', Math.abs(r.top() - 8) < 0.02 && Math.abs(r.p.position.y - 8) < 0.1, `top ${r.top().toFixed(2)}, him ${r.p.position.y.toFixed(2)}`);
  r.p.position.set(20, 0, 0);
  r.p.prevPosition.copy(r.p.position);
  run(r, PLATFORM.ride.pause * 0.8);
  check('...he gets off: it waits a moment for him', Math.abs(r.top() - 8) < 0.02);
  run(r, 4);
  check('...then goes back down for the next time', Math.abs(r.top() - 4) < 0.02, `top ${r.top().toFixed(2)}`);
}

// ---- sink ----
{
  const r = room({ motion: 'sink' });
  run(r, 1);
  const after1 = r.top();
  run(r, 4);
  check('SINK: stood on, it sinks under him, at its pace, and no deeper than its depth', Math.abs(after1 - (4 - PLATFORM.sink.speed)) < 0.05 && Math.abs(r.top() - (4 - PLATFORM.sink.depth)) < 0.02 && Math.abs(r.p.position.y - r.top()) < 0.1, `after 1 s ${after1.toFixed(2)}, then ${r.top().toFixed(2)}`);
  r.p.position.set(20, 0, 0);
  r.p.prevPosition.copy(r.p.position);
  run(r, 6);
  check('...off it, it rises back to where it was', Math.abs(r.top() - 4) < 1e-6);
}

// ---- crumble ----
{
  const r = room({ motion: 'crumble' });
  let stoodTill = -1;
  run(r, PLATFORM.crumble.hold * 0.9, () => ({}), (t) => { if (Math.abs(r.p.position.y - 4) < 0.1) stoodTill = t; });
  check('CRUMBLE: he lands on it and it holds him, shaking, for a moment', stoodTill > PLATFORM.crumble.hold * 0.8 && r.ch.movers[0].state.stage === 'shaking');
  let fellTo = 99;
  run(r, 2, () => ({}), () => { fellTo = Math.min(fellTo, r.p.position.y); });
  check('...then it goes, and he falls (to the floor below)', fellTo < 0.05 && r.ch.movers[0].state.stage !== 'still', `he got down to ${fellTo.toFixed(1)}`);
  run(r, PLATFORM.crumble.back + 1);
  check('...and a while later it is back where it was, to be stood on again', r.ch.movers[0].state.stage === 'still' && Math.abs(r.top() - 4) < 1e-6);
}

// ---- spring ----
{
  const height = (hold: boolean): number => {
    const r = room({ motion: 'spring' });
    let top = 0;
    run(r, 2.5, () => ({ jumpHeld: hold }), () => { top = Math.max(top, r.p.position.y - 4); });
    return top;
  };
  const held = height(true);
  const let_go = height(false);
  check(`SPRING: stood on, it throws him up about ${PLATFORM.spring.launch}, far higher than a jump of his own`, Math.abs(held - PLATFORM.spring.launch) < 0.6 && held > 2 * (TUNING.jump.velocity * TUNING.jump.velocity) / (2 * TUNING.physics.gravity), `${held.toFixed(2)} up`);
  check('...the same whether he holds jump or not (the short-hop rule is for his own jumps)', Math.abs(let_go - held) < 0.3, `${let_go.toFixed(2)} letting go`);
}

// ---- swing, blink, path (2026-11-20) ----
{
  // SWING: hangs still 6 under its pivot; swings 0.6 rad each way along x, rising at the ends; carries him.
  const spec = { motion: 'swing', to: [0, 6, 0], arc: 0.6, along: 'x', period: 4 } as Partial<MoverSpec>;
  const at = swingAt(spec as MoverSpec, 1);
  check('SWING: a quarter of the way through a swing it is out at its full reach, risen as a pendulum does', Math.abs(at[0] - 6 * Math.sin(0.6)) < 1e-9 && Math.abs(at[1] - 6 * (1 - Math.cos(0.6))) < 1e-9 && at[2] === 0);
  const r = room(spec);
  let far = 0;
  let onIt = true;
  run(r, 4, () => ({}), () => {
    const m = mid(r);
    far = Math.max(far, Math.abs(m.x));
    if (Math.hypot(r.p.position.x - m.x, r.p.position.z - m.z) > 1.2 || Math.abs(r.p.position.y - m.y) > 0.12) onIt = false;
  });
  check('...and he rides it, standing, all the way out and back', onIt && Math.abs(far - 6 * Math.sin(0.6)) < 0.05, `${far.toFixed(2)} out at most`);
  const chains: THREE.Object3D[] = [];
  r.ch.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (m.geometry as THREE.CylinderGeometry).parameters?.radiusTop === 0.04) chains.push(m);
  });
  check('...hung on two chains, stretched up to its pivot', chains.length === 2 && chains.every((c) => Math.abs(c.scale.y - 6.4) < 0.6), chains.map((c) => c.scale.y.toFixed(2)).join(', '));
}
{
  // BLINK: there 2 s, gone 1.5 s; flickers the last 0.6 s; while gone, not solid: he drops through.
  const spec = { motion: 'blink', hold: 2, back: 1.5 } as Partial<MoverSpec>;
  check('BLINK: there for its hold, flickering at the end of it, then gone for its back', blinkAt(spec as MoverSpec, 0.5).there && !blinkAt(spec as MoverSpec, 0.5).flicker && blinkAt(spec as MoverSpec, 1.8).flicker && !blinkAt(spec as MoverSpec, 2.5).there && blinkAt(spec as MoverSpec, 3.6).there);
  const r = room(spec);
  run(r, 1);
  const stood = r.p.grounded && Math.abs(r.p.position.y - 4) < 0.05;
  run(r, 1.6);
  check('...he stands on it while it is there, and drops through when it goes', stood && r.p.position.y < 3.5, `y ${r.p.position.y.toFixed(2)}`);
}
{
  // PATH: round a loop of waypoints at its speed, carrying him; back where it began after one round.
  const spec = { motion: 'path', path: [[6, 0, 0], [6, 3, 0], [0, 3, 0]], speed: 2 } as Partial<MoverSpec>;
  const p0 = pathAt(spec as MoverSpec, 0);
  const p1 = pathAt(spec as MoverSpec, 3);
  const p2 = pathAt(spec as MoverSpec, 4.5);
  const round = pathAt(spec as MoverSpec, 9);
  check('PATH: it follows its waypoints at its speed (6 along in 3 s, then 3 up), and is back at the start after a round', p0.join() === '0,0,0' && Math.abs(p1[0] - 6) < 1e-9 && Math.abs(p2[1] - 3) < 1e-9 && round.every((v) => Math.abs(v) < 1e-9));
  const r = room(spec);
  let onIt = true;
  let hi = 0;
  run(r, 9, () => ({}), () => {
    const m = mid(r);
    hi = Math.max(hi, m.y);
    if (Math.hypot(r.p.position.x - m.x, r.p.position.z - m.z) > 1.2 || Math.abs(r.p.position.y - m.y) > 0.12) onIt = false;
  });
  check('...and carries him round the whole loop, up and down too', onIt && Math.abs(hi - 7) < 0.05);
}
// The Workshop shows the three in its front half, each between ledges with a crumb on the far one.
{
  const w = levelById('workshop')!;
  const kinds = (w.movers ?? []).map((m) => m.motion ?? 'glide');
  check('the Workshop has a swing, four blinkers and a path in its front half', kinds.filter((k) => k === 'swing').length === 1 && kinds.filter((k) => k === 'blink').length === 4 && kinds.filter((k) => k === 'path').length === 1 && (w.movers ?? []).filter((m) => m.motion === 'swing' || m.motion === 'blink' || m.motion === 'path').every((m) => m.z === FRONT.z));
}

{
  const lvl = compileCustom({
    name: 'Kit', blurb: '', theme: 'dungeon', width: 20, depth: 20, wallHeight: 10,
    pieces: [
      { t: 'floor', x0: -10, z0: -10, x1: 10, z1: 10, top: 0 },
      { t: 'spawn', x0: 0, z0: 6, x1: 0, z1: 6, top: 0 },
      { t: 'lift', x0: -1, z0: -1, x1: 1, z1: 1, top: 2, props: { motion: 'swing', move: 'n', travel: 5 } },
      { t: 'lift', x0: 4, z0: -1, x1: 6, z1: 1, top: 2, props: { motion: 'blink' } },
      { t: 'lift', x0: -6, z0: -1, x1: -4, z1: 1, top: 2, props: { motion: 'path', move: 'e', travel: 4 } },
    ],
  }, 'kit');
  const [sw, bl, pa] = lvl.movers ?? [];
  check('in the editor: a swing hangs "how far" under its pivot, swinging the way it is set (north: along z); a blink stays put; a path makes a loop', sw?.motion === 'swing' && sw.to.join() === '0,5,0' && sw.along === 'z' && bl?.motion === 'blink' && bl.to.join() === '0,0,0' && pa?.motion === 'path' && JSON.stringify(pa.path) === JSON.stringify([[4, 0, 0], [4, 2, 0], [0, 2, 0]]), JSON.stringify(pa?.path));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
