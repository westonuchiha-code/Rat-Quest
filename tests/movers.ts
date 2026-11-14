// Moving platforms: the motion is smooth and bounded, and the rat is carried along without sliding off or sinking in.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { buildChamber } from '../src/world/chamber';
import { extent, moverOffset, MoverSpec } from '../src/world/layout';
import { compileCustom, emptyCustom } from '../src/levels/custom';
import { SAMPLES } from '../src/levels/samples';
import { ALL_LEVELS as LEVELS } from '../src/levels/levels';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });

// The path: waits, glides, waits, comes back, and never leaves its range.
const lift: MoverSpec = { x: 0, z: 0, y: 1, w: 3, d: 3, to: [0, 6, 0], speed: 3, pause: 1 };
check('it waits at the start', moverOffset(lift, 0.5)[1] === 0);
check('it is at the far end after the glide', Math.abs(moverOffset(lift, 1 + 2)[1] - 6) < 1e-6 && Math.abs(moverOffset(lift, 3.5)[1] - 6) < 1e-6);
check('it comes back', Math.abs(moverOffset(lift, 1 + 2 + 1 + 2)[1]) < 1e-6);
let maxStep = 0;
let prev = 0;
let inRange = true;
for (let t = 0; t < 20; t += DT) {
  const y = moverOffset(lift, t)[1];
  maxStep = Math.max(maxStep, Math.abs(y - prev));
  prev = y;
  if (y < -1e-6 || y > 6 + 1e-6) inRange = false;
}
check('it stays between its two ends', inRange);
check('it never jumps (eased, speed under 1.6x the set speed)', maxStep < 3 * 1.6 * DT, `max step ${maxStep.toFixed(4)}`);

// Riding a lift.
const room = buildChamber({
  solids: [extent('floor', -10, 10, -1, 0, -10, 10)],
  pit: null,
  water: [],
  movers: [{ x: 0, z: 0, y: 0.4, w: 3, d: 3, to: [0, 5, 0], speed: 2, pause: 0.5 }],
});
const p = new PlayerController(new THREE.Vector3(0, 0.4, 0));
p.update(DT, input(), room.colliders);
check('he starts standing on the lift', p.grounded && Math.abs(p.position.y - 0.4) < 0.01);
let grounded = true;
let top = 0;
for (let i = 0; i < 60 * 6; i++) {
  room.stepMovers(DT, p);
  p.update(DT, input(), room.colliders);
  if (!p.grounded) grounded = false;
  top = Math.max(top, p.position.y);
}
check('he stays grounded all the way up', grounded);
check('he is carried to the top', top > 5.2, `top ${top.toFixed(2)}`);
check('his feet are on the platform surface', Math.abs(p.position.y - room.movers[0].aabb.max.y) < 0.02);

// Riding one that slides sideways: he is carried and does not slide off.
const slider = buildChamber({
  solids: [extent('floor', -20, 20, -1, 0, -20, 20)],
  pit: null,
  water: [],
  movers: [{ x: 0, z: 0, y: 0.4, w: 3, d: 3, to: [8, 0, 0], speed: 2, pause: 0.5 }],
});
const q = new PlayerController(new THREE.Vector3(0, 0.4, 0));
q.update(DT, input(), slider.colliders);
for (let i = 0; i < 60 * 3; i++) {
  slider.stepMovers(DT, q);
  q.update(DT, input(), slider.colliders);
}
check('the chamber reports the platform speed he is riding', (() => { slider.stepMovers(DT, q); return slider.carry.length() >= 0; })());
check('he is carried sideways', q.position.x > 3, `x ${q.position.x.toFixed(2)}`);
check('and is still on it', q.grounded && Math.abs(q.position.y - 0.4) < 0.02 && Math.abs(q.position.x - (slider.movers[0].aabb.min.x + slider.movers[0].aabb.max.x) / 2) < 1.5);

// Standing beside it he is not carried, and a platform that rises into him lifts him up.
const side = buildChamber({
  solids: [extent('floor', -10, 10, -1, 0, -10, 10)],
  pit: null,
  water: [],
  movers: [{ x: 0, z: 0, y: 0.0, w: 3, d: 3, to: [0, 3, 0], speed: 2, pause: 0 }],
});
const s = new PlayerController(new THREE.Vector3(6, 0, 0));
for (let i = 0; i < 120; i++) {
  side.stepMovers(DT, s);
  s.update(DT, input(), side.colliders);
}
check('standing beside it he stays put', Math.abs(s.position.x - 6) < 0.001);

// Built from the builder: a custom level gets its moving platform.
const c = emptyCustom();
c.pieces.push({ t: 'lift', x0: -3, z0: -3, x1: 0, z1: 0, top: 1, props: { move: 'e', travel: 6, speed: 1.5 } });
const def = compileCustom(c);
check('a lift piece becomes a moving platform', def.movers?.length === 1 && def.movers[0].to[0] === 6 && def.movers[0].speed === 1.5);

// The sample level can be finished: ride the slider across, walk to the lift, ride it up and step onto the ledge.
{
  const sm = SAMPLES.find((x) => x.id === 'lifts');
  const d = compileCustom(sm!.level);
  const ch = buildChamber({ solids: d.solids, pit: d.pit, water: d.water, movers: d.movers });
  const r = new PlayerController(new THREE.Vector3(0, 0, 4.5));
  const step = (o: Partial<PlayerInput> = {}): void => {
    ch.stepMovers(DT, r);
    r.update(DT, input(o), ch.colliders);
  };
  step();
  let t = 0;
  while (r.position.z > -4.4 && t < 30) {
    step();
    t += DT;
  }
  check('the slider carries him over the gap', r.position.z <= -4.4 && r.grounded, `z ${r.position.z.toFixed(2)} after ${t.toFixed(1)}s`);
  for (let i = 0; i < 90; i++) step({ move: new THREE.Vector3(0, 0, -1) });
  check('he steps onto the far island', r.position.z < -7 && r.grounded);
  // Walk to the lift's start and wait for it to come down.
  while (Math.abs(r.position.z + 9.5) > 0.3 || ch.movers[1].aabb.max.y > 0.05) {
    step({ move: new THREE.Vector3(0, 0, r.position.z > -9.5 ? -1 : 1) });
    t += DT;
    if (t > 90) break;
  }
  for (let i = 0; i < 400 && r.position.y < 5.9; i++) step();
  check('the lift takes him up to the ledge height', r.position.y > 5.9 && r.grounded, `y ${r.position.y.toFixed(2)}`);
  for (let i = 0; i < 80; i++) step({ move: new THREE.Vector3(0, 0, -1) });
  check('and he can step off onto the ledge', r.position.z < -11.5 && Math.abs(r.position.y - 6) < 0.05 && r.grounded, `z ${r.position.z.toFixed(2)} y ${r.position.y.toFixed(2)}`);
}

// New pieces: lava, rope bridge, cobweb, brazier.
{
  const c2 = emptyCustom();
  c2.pieces.push(
    { t: 'lava', x0: 2, z0: 2, x1: 6, z1: 6, top: -0.6 },
    { t: 'bridge', x0: -8, z0: 0, x1: 0, z1: 3, top: 0 },
    { t: 'web', x0: 5, z0: 5, x1: 5, z1: 5, top: 3, dir: 'e' },
    { t: 'brazier', x0: -3, z0: 5, x1: -3, z1: 5, top: 0 },
  );
  const d2 = compileCustom(c2);
  check('lava becomes a lava pool with a bed under it', d2.lava?.length === 1 && d2.lava[0].y === -0.6 && d2.solids.some((b) => b.y1 < -1 && b.x0 === 2));
  check('a rope bridge is planks with ropes and posts', d2.solids.some((b) => b.kind === 'plank' && b.x0 === -8) && d2.decor.some((x) => x.kind === 'pipe') && d2.decor.some((x) => x.kind === 'post'));
  check('webs and braziers become decor', d2.decor.some((x) => x.kind === 'web') && d2.decor.some((x) => x.kind === 'brazier'));
  const ch2 = buildChamber({ solids: d2.solids, pit: d2.pit, water: d2.water, decor: d2.decor, lava: d2.lava });
  check('the chamber builds with lava, webs and braziers', ch2.lava.length === 1 && ch2.group.children.length > 5);
}

// The real levels: a conservative walk-through on paper. From the start, using only jumps well inside his reach (3.5 across,
// 2.2 up), every surface that holds a collectible, an enemy or the door must be reachable. Moving platforms count at both ends.
{
  type Surf = { x0: number; x1: number; z0: number; z1: number; y: number };
  for (const L of LEVELS.filter((l) => ['plankpit', 'cellars', 'furnace', 'webhollow', 'liftshaft'].includes(l.id))) {
    const surfs: Surf[] = L.solids.filter((b) => b.kind !== 'wall' && !b.hidden && b.kind !== 'rubble' && b.kind !== 'barrel').map((b) => ({ x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, y: b.y1 }));
    const ride = new Map<number, number>(); // the two ends of one moving platform are the same ride
    for (const m of L.movers ?? []) {
      ride.set(surfs.length, surfs.length + 1);
      ride.set(surfs.length + 1, surfs.length);
      for (const f of [0, 1]) {
        surfs.push({ x0: m.x + m.to[0] * f - m.w / 2, x1: m.x + m.to[0] * f + m.w / 2, z0: m.z + m.to[2] * f - m.d / 2, z1: m.z + m.to[2] * f + m.d / 2, y: m.y + m.to[1] * f });
      }
    }
    const gap = (a: Surf, b: Surf): number => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.z0 - b.z1, b.z0 - a.z1));
    const under = (px: number, pz: number, py: number): number => surfs.findIndex((s) => px >= s.x0 - 0.01 && px <= s.x1 + 0.01 && pz >= s.z0 - 0.01 && pz <= s.z1 + 0.01 && Math.abs(s.y - py) < 0.3);
    const start = under(L.spawn.x, L.spawn.z, L.spawn.y);
    const seen = new Set<number>([start]);
    const queue = [start];
    while (queue.length) {
      const ai = queue.pop()!;
      const a = surfs[ai];
      const mate = ride.get(ai);
      if (mate !== undefined && !seen.has(mate)) {
        seen.add(mate);
        queue.push(mate);
      }
      surfs.forEach((b, i) => {
        if (seen.has(i)) return;
        if (gap(a, b) <= 3.5 && b.y - a.y <= 2.2 && a.y - b.y <= 30) {
          seen.add(i);
          queue.push(i);
        }
      });
    }
    const reach = (x: number, z: number, y: number): boolean => {
      const i = under(x, z, y);
      return i >= 0 && seen.has(i);
    };
    const door = reach(L.exit.x + Math.sin(L.exit.yaw) * 1.5, L.exit.z + Math.cos(L.exit.yaw) * 1.5, L.exit.y ?? 0);
    check(`${L.id}: the door can be reached from the start`, door);
    const lost = [...L.collectibles.filter((c) => c.crate === undefined).map((c) => ({ x: c.x, z: c.z, y: c.y - 0.5, n: c.id })), ...L.enemies.map((e) => ({ x: e.x, z: e.z, y: e.y ?? 0, n: 'enemy' }))].filter((q) => !reach(q.x, q.z, q.y));
    check(`${L.id}: every collectible and enemy stands somewhere he can reach`, lost.length === 0, lost.slice(0, 3).map((q) => `${q.n}@${q.x},${q.z}`).join(' '));
  }
}

if (failures) {
  console.log(`\n${failures} FAILED`);
  process.exit(1);
}
console.log('\nAll moving platform checks passed.');
