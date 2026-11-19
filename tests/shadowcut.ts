// Every round shadow is cut where its ground ends: the knight's has been (tests/clubfixes.ts); these are the
// creatures', the talking characters' and a scene's cast's. What is drawn matches what is solid.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { makeAabb } from '../src/world/collision';
import { cutOutline, groundAt } from '../src/world/shadow';
import { ShadowCuts, isBlobShadow } from '../src/render/cutShadow';
import { ScuttlerModel } from '../src/enemies/scuttlerModel';
import { ToadModel } from '../src/enemies/toadModel';
import { IronbackModel } from '../src/enemies/ironbackModel';
import { GuardModel } from '../src/enemies/guardModel';
import { MantisModel } from '../src/enemies/mantisModel';
import { StagModel } from '../src/enemies/stagModel';
import { AntModel } from '../src/enemies/antModel';
import { ScorpionModel } from '../src/enemies/scorpionModel';
import { RollerModel } from '../src/enemies/rollerModel';
import { Npc, type NpcSpec } from '../src/npc/npc';
import { makePuppet } from '../src/cutscene/stage';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

// A floor at 0 out to x = 4, and beyond it a drop; and a post one unit square, its top at 2, off to one side.
const floor = makeAabb(-6, -0.5, 0, 20, 1, 20); // x from -16 to 4
const post = makeAabb(10, 1, 0, 1, 2, 1); // x 9.5..10.5, top at 2
const world = [floor, post];
const ring = (x: number, z: number, r: number, n = 12): number[] => Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, z + Math.sin((i / n) * Math.PI * 2) * r]).flat();

// ---- The measure itself ----
{
  const out: number[] = [];
  check('on open floor nothing is cut', cutOutline(world, 0, 0, 0, ring(0, 0, 0.8), out) && out.length === 12 && out.every((l) => l === 1));
  const at = 3.7;
  const rim = ring(at, 0, 0.8);
  check(
    'at a ledge the side over the drop is drawn in and the side on the floor is not',
    cutOutline(world, at, 0, 0, rim, out)
      && out[0] < 0.45
      && out[0] > 0.3
      && out[6] === 1,
    `toward the drop ${out[0].toFixed(2)} of its length, away from it ${out[6].toFixed(2)}`
  );
  const past = out.map((l, i) => at + (rim[i * 2] - at) * l).filter((x) => x > 4 + 1e-6);
  check('no point of it is left past the edge', past.length === 0);
  const onPost = ring(10, 0, 0.8);
  check(
    'on a post narrower than it, it is cut all round to the top of the post',
    cutOutline(world, 10, 2, 0, onPost, out)
      && out.every((l) => l < 0.9)
      && out.every((l, i) => groundAt(world, 10 + (onPost[i * 2] - 10) * l, 2, (onPost[i * 2 + 1]) * l)),
    `longest spoke ${Math.max(...out).toFixed(2)}`
  );
  const kept = [9, 9, 9];
  check(
    'with no ground under its middle (a creature in the air over a drop) it is left whole, as it was',
    !cutOutline(world, 6, 0, 0, ring(6, 0, 0.8), kept)
      && kept.join() === '9,9,9'
  );
  // An oval, turned: the long way along x.
  const oval = Array.from({ length: 12 }, (_, i) => [3.2 + Math.cos((i / 12) * Math.PI * 2) * 1.3, Math.sin((i / 12) * Math.PI * 2) * 0.5]).flat();
  check(
    'an oval is cut by where its own rim is: its long end over the drop, its sides not',
    cutOutline(world, 3.2, 0, 0, oval, out)
      && out[0] < 0.7
      && out[3] === 1
      && out[9] === 1,
    `${out[0].toFixed(2)}`
  );
}

// ---- Real models ----
type Model = { root: THREE.Object3D; setTransform(p: THREE.Vector3, facing: number): void };
const models: Array<[string, () => Model]> = [
  ['roach', () => new ScuttlerModel()], ['toad', () => new ToadModel()], ['ironback', () => new IronbackModel()], ['guard', () => new GuardModel()],
  ['mantis', () => new MantisModel()], ['stag', () => new StagModel()], ['ant', () => new AntModel()], ['scorpion', () => new ScorpionModel()], ['roller', () => new RollerModel()],
];
const v = new THREE.Vector3();
/** Every point of every round shadow under `root`, in the room. */
const points = (cuts: ShadowCuts, root: THREE.Object3D): THREE.Vector3[] => cuts.shadowsOf(root).flatMap((m) => {
  m.updateWorldMatrix(true, false);
  const p = m.geometry.attributes.position;
  return Array.from({ length: p.count }, (_, i) => v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld).clone());
});
{
  const none: string[] = [];
  const hung: string[] = [];
  const left: string[] = [];
  const notBack: string[] = [];
  let widest = 0;
  for (const [name, make] of models) {
    const cuts = new ShadowCuts();
    const m = make();
    if (cuts.shadowsOf(m.root).length < 1) none.push(name);
    // In the middle of the floor: whole.
    m.setTransform(new THREE.Vector3(-6, 0, 0), 0.7);
    cuts.cut(m.root, world);
    const whole = points(cuts, m.root);
    // At the ledge, turned a little: before the cut it hangs over the drop; after it, it does not.
    m.setTransform(new THREE.Vector3(3.8, 0, 0.3), 0.7);
    const before = points(cuts, m.root).filter((p) => p.x > 4.001).length;
    if (before === 0) hung.push(`${name} (did not reach the edge)`);
    cuts.cut(m.root, world);
    const after = points(cuts, m.root);
    widest = Math.max(widest, ...after.map((p) => p.x - 4));
    if (after.some((p) => p.x > 4.001)) left.push(name);
    // And back in the middle: whole again, point for point.
    m.setTransform(new THREE.Vector3(-6, 0, 0), 0.7);
    cuts.cut(m.root, world);
    const again = points(cuts, m.root);
    if (again.length !== whole.length || again.some((p, i) => p.distanceTo(whole[i]) > 1e-4)) notBack.push(name);
  }
  check(`each of ${models.length} creatures has a round shadow that is found without being told of`, none.length === 0, none.join(', '));
  check('standing at a ledge, each one\'s shadow hung over the drop before', hung.length === 0, hung.join(', '));
  check('and after the cut no point of any is past the edge', left.length === 0, `${left.join(', ')} furthest ${widest.toFixed(3)} past`);
  check('back on open floor each is whole again, point for point', notBack.length === 0, notBack.join(', '));
}
{
  // A talking character (the mouse has her own disc; a patron gets one from npc.ts), and a scene's puppet.
  const cuts = new ShadowCuts();
  const who: Array<[string, THREE.Object3D, (x: number) => void]> = [];
  for (const kind of ['mouse', 'turtle', 'fox', 'owl'] as const) {
    const n = new Npc({ name: kind === 'turtle' ? 'Pebble' : 'X', kind, x: 0, y: 0, z: 0, facing: 0, lines: ['.'] } as NpcSpec);
    who.push([kind, n.root, (x) => n.moveTo(x, 0, 0)]);
  }
  const puppet = makePuppet({ is: 'npc', kind: 'ferret', name: 'F' } as never);
  who.push(['a scene\'s ferret', puppet.root, (x) => puppet.root.position.set(x, 0, 0)]);
  const bad: string[] = [];
  const noShadow: string[] = [];
  for (const [name, root, put] of who) {
    if (cuts.shadowsOf(root).length === 0) {
      noShadow.push(name);
      continue;
    }
    put(3.8);
    const before = points(cuts, root).some((p) => p.x > 4.001);
    cuts.cut(root, world);
    if (!before || points(cuts, root).some((p) => p.x > 4.001)) bad.push(name);
  }
  check(
    'the talking characters and a scene\'s cast have round shadows too, and theirs are cut the same',
    bad.length === 0
      && noShadow.length <= 1,
    `cut: ${who.length - noShadow.length - bad.length} of ${who.length}${noShadow.length ? `; no disc of its own: ${noShadow.join(', ')}` : ''}${bad.length ? `; WRONG: ${bad.join(', ')}` : ''}`
  );
}
{
  // It is not worked out again while nothing has moved.
  const cuts = new ShadowCuts();
  const m = new ScuttlerModel();
  m.setTransform(new THREE.Vector3(3.8, 0, 0), 0);
  cuts.cut(m.root, world);
  const first = cuts.worked;
  for (let i = 0; i < 10; i++) cuts.cut(m.root, world);
  const still = cuts.worked - first;
  for (let i = 0; i < 30; i++) cuts.cut(m.root, world);
  const later = cuts.worked - first;
  m.setTransform(new THREE.Vector3(3.5, 0, 0), 0);
  cuts.cut(m.root, world);
  check(
    'a shadow that has not moved is not worked out again for a while; one that has, is at once',
    first === 1
      && still === 0
      && later >= 1
      && later <= 2
      && cuts.worked - first === later + 1,
    `first ${first}, ten frames on ${still}, forty on ${later}`
  );
  // Hidden: left alone.
  const hidden = new ShadowCuts();
  const g = new GuardModel();
  g.root.visible = false;
  g.setTransform(new THREE.Vector3(3.8, 0, 0), 0);
  hidden.cut(g.root, world);
  check('a creature that is not shown costs nothing', hidden.worked === 0);
  check(
    'a ring on the floor (the stag\'s blow, a lock-on mark) is not taken for a shadow',
    !isBlobShadow(new THREE.Mesh(new THREE.RingGeometry(0.5, 0.6, 12), new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, depthWrite: false })))
      && !isBlobShadow(new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, depthWrite: false })))
  );
}

console.log(failures === 0 ? '\nShadow cut checks passed.' : `\n${failures} shadow cut check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
