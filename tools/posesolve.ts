// Works out the Keep Guard's spear-arm angles for each of his poses, instead of guessing them.
// For each pose it puts his hand at a chosen point and the shaft along a chosen line (both in the world, with him at
// the origin facing +Z, his spear hand on -X), by searching the seven angles of his arm on the real model; then it
// says which parts of his own body the shaft touches (it should say "nothing"). Paste the numbers it prints into
// src/enemies/guardModel.ts. Run it again whenever a pose's chest, hips or hipPos change, since the arm hangs off them:
//   npx vite build --ssr tools/posesolve.ts --outDir .testdist --emptyOutDir && node .testdist/posesolve.js
import './../src/core/colorSetup';
import * as THREE from 'three';
import { GuardModel } from '../src/enemies/guardModel';
import type { GuardState } from '../src/enemies/guard';

type G = THREE.Object3D;
const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
interface Target {
  name: string;
  /** The state whose pose this is (his body is settled in it first). */
  state: GuardState;
  /** Where his spear hand should be, and which way the shaft should point. */
  hand: THREE.Vector3;
  dir: THREE.Vector3;
  /** Angles to start from and stay near: [armS x, y, z, elbowS, wrist x, y, z]. */
  ref: number[];
  /** How nearly the shaft may lie along his forearm (0..1; lower keeps it more across his fist). */
  along?: number;
}

function rig(model: GuardModel): { root: G; armS: G; elbowS: G; sword: G; all: Record<string, unknown> } {
  const rat = (model as unknown as { rat: Record<string, unknown> }).rat;
  return { root: rat.root as G, armS: rat.armS as G, elbowS: rat.elbowS as G, sword: rat.sword as G, all: rat };
}

/** The parts of him the shaft passes through. tests/models.ts makes the same test on every frame of every move. */
function through(model: GuardModel): string[] {
  const r = rig(model);
  r.root.updateMatrixWorld(true);
  const named: Array<[string, G]> = ['head', 'earS', 'earH', 'chest', 'pelvis', 'armS', 'armH', 'shieldPivot', 'legS', 'legH'].map((k) => [k, r.all[k] as G]);
  named.push(['tail', (r.all.tailSegments as G[])[0]]);
  const meshes: THREE.Mesh[] = [];
  r.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (let p: G | null = o; p; p = p.parent) if (!p.visible || p === r.elbowS) return;
    meshes.push(m);
  });
  const butt = r.sword.localToWorld(V(0, 0, -0.51));
  const tip = r.sword.localToWorld(V(0, 0, 0.92));
  const dir = tip.clone().sub(butt).normalize();
  const side = V(0, 1, 0).cross(dir);
  if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
  side.normalize();
  const up = dir.clone().cross(side).normalize();
  const hits = new Set<string>();
  const ray = new THREE.Raycaster();
  for (const [a, b] of [[0, 0], [0.035, 0], [-0.035, 0], [0, 0.035], [0, -0.035]]) {
    ray.set(butt.clone().addScaledVector(side, a).addScaledVector(up, b), dir);
    ray.far = butt.distanceTo(tip);
    for (const m of meshes) {
      const mat = m.material as THREE.Material;
      const was = mat.side;
      mat.side = THREE.DoubleSide;
      if (ray.intersectObject(m, false).length) {
        let name = '?';
        for (let p: G | null = m; p && name === '?'; p = p.parent) name = named.find(([, g]) => g === p)?.[0] ?? '?';
        hits.add(name);
      }
      mat.side = was;
    }
  }
  return [...hits].sort();
}

function solve(t: Target): number[] {
  const model = new GuardModel();
  model.setTransform(V(0, 0, 0), 0);
  for (let i = 0; i < 40; i++) model.update(1 / 60, { state: 'hold', stateTime: i / 60, walking: 0, counter: false });
  for (let i = 0; i < 150; i++) model.update(1 / 60, { state: t.state, stateTime: i / 60, walking: 0, counter: false });
  const r = rig(model);
  const D = t.dir.clone().normalize();
  const put = (x: number[]): void => {
    r.armS.rotation.set(x[0], x[1], x[2]);
    r.elbowS.rotation.x = x[3];
    r.sword.rotation.set(x[4], x[5], x[6]);
    r.root.updateMatrixWorld(true);
  };
  const hand = V(0, 0, 0);
  const elbow = V(0, 0, 0);
  const cost = (x: number[]): number => {
    put(x);
    r.sword.getWorldPosition(hand);
    r.elbowS.getWorldPosition(elbow);
    const dir = r.sword.localToWorld(V(0, 0, 1)).sub(hand).normalize();
    const fore = hand.clone().sub(elbow).normalize();
    let c = 60 * hand.distanceToSquared(t.hand) + 5 * dir.distanceToSquared(D);
    c += 4 * Math.max(0, Math.abs(fore.dot(dir)) - (t.along ?? 0.72)) ** 2; // the shaft should not lie along his forearm
    c += 10 * Math.max(0, x[3]) ** 2 + 10 * Math.max(0, -2.3 - x[3]) ** 2; // the elbow only bends one way
    c += 0.004 * (x[5] ** 2 + x[6] ** 2 + x[1] ** 2); // plain angles where they will do
    for (let i = 0; i < 7; i++) c += 0.006 * (x[i] - t.ref[i]) ** 2; // and near the pose he comes from
    return c;
  };
  let best = t.ref.slice();
  let bestCost = cost(best);
  let seed = 12345;
  const rnd = (): number => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  for (let start = 0; start < 8; start++) {
    let x = start === 0 ? t.ref.slice() : t.ref.map((v) => v + rnd() * 1.2);
    let c = cost(x);
    for (let i = 0; i < 5000; i++) {
      const step = 0.5 * Math.exp(-i / 900) + 0.004;
      const y = x.slice();
      if (i % 3 === 0) for (let k = 0; k < 7; k++) y[k] += rnd() * step * 0.5;
      else y[Math.floor((rnd() * 0.5 + 0.5) * 7) % 7] += rnd() * step;
      const cy = cost(y);
      if (cy < c) {
        x = y;
        c = cy;
      }
    }
    if (c < bestCost) {
      best = x;
      bestCost = c;
    }
  }
  put(best);
  r.sword.getWorldPosition(hand);
  const f = (v: THREE.Vector3): string => `${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)}`;
  const n = best.map((v) => Number(v.toFixed(2)));
  console.log(`${t.name.padEnd(7)} armS: [${n[0]}, ${n[1]}, ${n[2]}], elbowS: ${n[3]}, wrist: [${n[4]}, ${n[5]}, ${n[6]}]`);
  console.log(`        hand ${f(hand)} (wanted ${f(t.hand)}); butt ${f(r.sword.localToWorld(V(0, 0, -0.51)))}; point ${f(r.sword.localToWorld(V(0, 0, 0.92)))}; passes through: ${through(model).join(', ') || 'nothing'}`);
  return n;
}

// Where each pose wants the spear. His shoulder is about 0.7 up, his arm 0.33 long, the spear 0.56 behind his grip and 1.01 ahead.
const level = solve({ name: 'LEVEL', state: 'hold', hand: V(-0.33, 0.5, 0.12), dir: V(0.1, -0.04, 1), ref: [0.25, 0, -0.35, -1.45, 1.2, 0, 0] });
solve({ name: 'POST', state: 'idle', hand: V(-0.42, 0.57, 0.05), dir: V(-0.03, 1, 0), ref: level });
solve({ name: 'MARCH', state: 'return', hand: V(-0.41, 0.72, 0.07), dir: V(-0.04, 1, -0.07), ref: [-0.48, -1.14, -0.2, -0.91, -0.14, -0.18, 0] });
const draw = solve({ name: 'DRAW', state: 'windup', hand: V(-0.36, 0.56, -0.22), dir: V(0.12, -0.02, 1), ref: level });
const thrust = solve({ name: 'THRUST', state: 'thrust', hand: V(-0.28, 0.5, 0.64), dir: V(0.2, 0.02, 1), ref: draw, along: 0.9 });
solve({ name: 'SPENT', state: 'recover', hand: V(-0.28, 0.45, 0.58), dir: V(0.2, -0.2, 1), ref: thrust, along: 0.9 });
solve({ name: 'BROKEN', state: 'broken', hand: V(-0.5, 0.72, -0.08), dir: V(-0.45, 0.85, 0.2), ref: level });
