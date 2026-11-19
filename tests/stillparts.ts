// THE CHARACTERS' STILL PARTS, JOINED (npc/stillParts.ts, Npc.settle): fewer meshes, and EXACTLY the same picture.
// Each character of the Hall and the Club is built twice from one seed, one joined and one not, and both are put
// through the same moves (idle, talked to, a story scene's look and shrug, its strings). At every step what each
// draws is compared: per material, how many corners, and the box round all of them in the room.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { Npc } from '../src/npc/npc';
import { hall } from '../src/levels/hall';
import { LEVELS } from '../src/levels/levels';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const realRandom = Math.random;
const seeded = (seed: number): (() => number) => {
  let a = seed;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
};

/** What is drawn, per material: corners, and the box round them in the room (rounded, to compare). */
function drawn(root: THREE.Object3D): Map<string, string> {
  root.updateMatrixWorld(true);
  const per = new Map<string, { n: number; box: THREE.Box3 }>();
  const v = new THREE.Vector3();
  root.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const key = (m.material as THREE.Material).uuid;
    const e = per.get(key) ?? { n: 0, box: new THREE.Box3() };
    const pos = m.geometry.attributes.position;
    const count = m.geometry.index ? m.geometry.index.count : pos.count;
    for (let i = 0; i < count; i++) {
      const k = m.geometry.index ? m.geometry.index.getX(i) : i;
      e.box.expandByPoint(v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld));
    }
    e.n += count;
    per.set(key, e);
  });
  const out = new Map<string, string>();
  for (const [k, e] of per) out.set(k, `${e.n} ${[e.box.min.x, e.box.min.y, e.box.min.z, e.box.max.x, e.box.max.y, e.box.max.z].map((q) => q.toFixed(4)).join(',')}`);
  return out;
}

/** The moves, as Npc.settle's twin is put through them (and a few more), with what is drawn after each. */
function play(n: Npc, x: number, y: number, z: number): string[] {
  const seen: string[] = [];
  const DT = 1 / 30;
  const run = (frames: number, away: number, talking: boolean): void => {
    for (let i = 0; i < frames; i++) {
      if (talking && i % 5 === 0) n.pulse();
      n.update(DT, x + away, y, z - away * 0.4, talking);
      if (i % 7 === 0) seen.push([...drawn(n.root).values()].sort().join(' | '));
    }
  };
  run(300, 18, false);
  run(150, 1.4, true);
  n.act = { lookAt: [x - 3, z + 4], shrug: 1 };
  run(45, 1.4, true);
  n.act = null;
  n.puppet = { facing: -0.8, headYaw: -0.5, nod: 0.3, talking: true };
  run(45, 1.4, true);
  n.puppet = null;
  run(90, 18, false);
  return seen;
}

const hub = LEVELS.find((l) => l.hub)!;
const cast = [...(hall().npcs ?? []), ...(hub.npcs ?? [])];
let before = 0;
let after = 0;
const differ: string[] = [];
for (const spec of cast) {
  if (spec.kind === 'villain') continue;
  Math.random = seeded(7);
  const plain = new Npc({ ...spec, hidden: false });
  Math.random = seeded(7);
  const joined = new Npc({ ...spec, hidden: false });
  Math.random = realRandom;
  const r = joined.settle();
  before += r.before;
  after += r.after;
  // (Materials are shared, so the two are compared by what each material draws.)
  Math.random = seeded(11);
  const a = play(plain, spec.x, spec.y ?? 0, spec.z);
  Math.random = seeded(11);
  const b = play(joined, spec.x, spec.y ?? 0, spec.z);
  Math.random = realRandom;
  const bad = a.findIndex((s, i) => s !== b[i]);
  if (bad >= 0) differ.push(`${spec.name} at step ${bad}`);
}
check(
  `every character of the Hall and the Club (${cast.length - cast.filter((c) => c.kind === 'villain').length}, not the villain) draws EXACTLY what it drew before its still parts were joined, at every step of idling, being talked to, a scene's look and shrug and its strings`,
  differ.length === 0,
  differ.join('; ')
);
check('...and is made of fewer meshes: at least a fifth fewer, over them all', after < before * 0.8 && after > 0, `${before} meshes to ${after}`);

// The villain is not joined, nor is a cutscene's own cast (Npc.settle is called only for those standing in a room).
const grim = cast.find((c) => c.kind === 'villain');
if (grim) {
  const g = new Npc({ ...grim, hidden: false });
  const r = g.settle();
  check('the villain is left as he is (his spells and gestures are many)', r.before === 0 && r.after === 0);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
