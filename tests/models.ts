// The creature models (roach, toad, ironback, bat, the Keep Guard, the Orchid Mantis, the Club's folk and Grimsqueak): each one builds, plays every one of
// its poses without a part flying off or going missing, keeps its feet on the floor, and dies on top of the floor (the
// toad used to roll over under it and vanish).
import './../src/core/colorSetup';
import * as THREE from 'three';
import { ScuttlerModel } from '../src/enemies/scuttlerModel';
import type { ScuttlerState } from '../src/enemies/scuttler';
import { ToadModel } from '../src/enemies/toadModel';
import type { ToadState } from '../src/enemies/toad';
import { IronbackModel } from '../src/enemies/ironbackModel';
import type { IronbackState } from '../src/enemies/ironback';
import { BatModel } from '../src/enemies/batModel';
import type { BatState } from '../src/enemies/bat';
import { Npc, lookOf } from '../src/npc/npc';
import { GRIM_FIGHT_FLOAT, GRIM_HEIGHT, GrimsqueakModel, type GrimGesture } from '../src/npc/grimsqueakModel';
import { RatModel } from '../src/player/ratModel';
import { GuardModel } from '../src/enemies/guardModel';
import { GUARD, type GuardState } from '../src/enemies/guard';
import { MantisModel, type MantisAnimInput } from '../src/enemies/mantisModel';
import { MANTIS, type MantisState } from '../src/enemies/mantis';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import type { NpcKind } from '../src/npc/npc';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

/** The box round everything that is drawn lit (the body: not the flat shadow, glows or sparks), and whether any number in it has gone bad. */
function measure(root: THREE.Object3D, skip: THREE.Object3D[] = []): { box: THREE.Box3; finite: boolean; meshes: number } {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let finite = true;
  let meshes = 0;
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m.material instanceof THREE.ShaderMaterial)) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible || skip.includes(p)) return;
    meshes++;
    const pos = m.geometry.attributes.position;
    const col = m.geometry.attributes.color;
    if (!col || col.count !== pos.count) finite = false; // every lit part must be painted
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      if (!Number.isFinite(v.x + v.y + v.z)) finite = false;
      box.expandByPoint(v);
    }
  });
  return { box, finite, meshes };
}
const size = (b: THREE.Box3): string => `${(b.max.x - b.min.x).toFixed(2)} x ${(b.max.y - b.min.y).toFixed(2)} x ${(b.max.z - b.min.z).toFixed(2)}, floor ${b.min.y.toFixed(2)}`;
const at = new THREE.Vector3(0, 0, 0);

// ---- The roach ----
{
  const states: ScuttlerState[] = ['idle', 'chase', 'windup', 'lunge', 'recover', 'stagger', 'return', 'dead'];
  let ok = true;
  let low = 0;
  let wide = 0;
  for (const st of states) {
    const m = new ScuttlerModel();
    m.setTransform(at, 0);
    for (let i = 0; i < 60; i++) {
      m.update(DT, { state: st, stateTime: Math.min(i * DT, 0.9), moving: st === 'chase' || st === 'return' });
      if (i % 6) continue;
      const r = measure(m.root);
      ok &&= r.finite && r.meshes > 30;
      low = Math.min(low, r.box.min.y);
      wide = Math.max(wide, r.box.max.x - r.box.min.x, r.box.max.z - r.box.min.z);
    }
  }
  check('roach: every pose holds together', ok);
  check('roach: only its feelers and feet ever dip under the floor, and no further than they did', low > -0.3, `lowest ${low.toFixed(2)}`);
  check('roach: it stays roach-sized in every pose', wide < 2.6, `widest ${wide.toFixed(2)}`);
  const m = new ScuttlerModel();
  m.setTransform(at, 0);
  for (let i = 0; i < 40; i++) m.update(DT, { state: 'idle', stateTime: i * DT, moving: false });
  const rest = measure(m.root).box;
  check('roach: at rest it stands on the floor, about as big as before', rest.min.y > -0.06 && rest.min.y < 0.08 && rest.max.y > 0.45 && rest.max.y < 0.85, size(rest));
  for (let i = 0; i < 150; i++) m.update(DT, { state: 'dead', stateTime: i * DT, moving: false });
  check('roach: dead, it shrivels away to nothing', m.root.scale.x < 0.01);
}

// ---- The toad ----
{
  const states: ToadState[] = ['idle', 'watch', 'windup', 'recover', 'hop', 'crouch', 'pounce', 'stagger', 'return', 'dead'];
  let ok = true;
  let low = 0;
  for (const st of states) {
    const m = new ToadModel();
    m.setTransform(at, 0);
    for (let i = 0; i < 60; i++) {
      m.update(DT, { state: st, stateTime: Math.min(i * DT, 0.9), moving: false, hopY: st === 'hop' || st === 'pounce' ? 0.6 : 0 });
      if (i % 6) continue;
      const r = measure(m.root);
      ok &&= r.finite && r.meshes > 30;
      low = Math.min(low, r.box.min.y);
    }
  }
  check('toad: every pose holds together', ok);
  check('toad: it never sinks far into the floor', low > -0.15, `lowest ${low.toFixed(2)}`);
  const m = new ToadModel();
  m.setTransform(at, 0);
  for (let i = 0; i < 40; i++) m.update(DT, { state: 'idle', stateTime: i * DT, moving: false, hopY: 0 });
  const rest = measure(m.root).box;
  check('toad: at rest it sits on the floor, about as big as before', rest.min.y > -0.08 && rest.max.y > 0.7 && rest.max.y < 1.05 && rest.max.x - rest.min.x < 1.5, size(rest));
  for (let i = 0; i < 48; i++) m.update(DT, { state: 'dead', stateTime: i * DT, moving: false, hopY: 0 });
  const dead = measure(m.root).box;
  check('toad: dead, it lies belly-up ON the floor (it used to roll under it)', dead.min.y > -0.15 && dead.max.y > 0.5, size(dead));
  // The tell: the sac swells before a spit.
  const sacOf = (mm: ToadModel): number => ((mm as unknown as { sac: THREE.Mesh }).sac.scale.x);
  const t = new ToadModel();
  for (let i = 0; i < 30; i++) t.update(DT, { state: 'idle', stateTime: i * DT, moving: false, hopY: 0 });
  const calm = sacOf(t);
  for (let i = 0; i < 48; i++) t.update(DT, { state: 'windup', stateTime: i * DT, moving: false, hopY: 0 });
  check('toad: its throat still swells to three times the size before it spits', sacOf(t) > calm * 3, `${calm.toFixed(2)} -> ${sacOf(t).toFixed(2)}`);
}

// ---- The ironback ----
{
  const states: IronbackState[] = ['idle', 'chase', 'windup', 'ram', 'tossWind', 'toss', 'buckWind', 'buck', 'recover', 'stagger', 'flipped', 'rise', 'dead', 'return'];
  let ok = true;
  let low = 0;
  for (const st of states) {
    const m = new IronbackModel();
    m.setTransform(at, 0);
    for (let i = 0; i < 50; i++) {
      m.update(DT, { state: st, stateTime: Math.min(i * DT, 0.8), moving: st === 'chase' || st === 'return' });
      if (i % 5) continue;
      const r = measure(m.root);
      ok &&= r.finite && r.meshes > 60;
      low = Math.min(low, r.box.min.y);
    }
  }
  check('ironback: every pose holds together', ok);
  check('ironback: it never sinks far into the floor', low > -0.35, `lowest ${low.toFixed(2)}`);
}

// ---- The bat ----
{
  const states: Array<[BatState, number]> = [['roost', 3.4], ['wake', 3], ['hover', 2.2], ['swoopWind', 2.6], ['swoop', 1.2], ['grounded', 0]];
  let ok = true;
  let low = 0;
  for (const [st, y] of states) {
    for (const perch of ['rock', 'chain'] as const) {
      const m = new BatModel({ x: 0, y: 3.4, z: 0 }, perch);
      m.setTransform(new THREE.Vector3(0, y, 0), 0);
      for (let i = 0; i < 40; i++) {
        m.update(DT, { state: st, stateTime: Math.min(i * DT, 0.5), swoopU: st === 'swoop' ? 0.4 : 0, floorY: 0, y });
        if (i % 5) continue;
        const r = measure(m.root);
        ok &&= r.finite && r.meshes > 30;
        low = Math.min(low, r.box.min.y);
      }
    }
  }
  check('bat: every pose holds together, on a rock and on a chain', ok);
  check('bat: struck down, its body lies on the floor (the far edge of a wing may dip under, as it did)', low > -0.5, `lowest ${low.toFixed(2)}`);
}

// ---- The Keep Guard: he is the knight's body with a long spear, so where the spear goes has to be checked ----
// (The first one stood at his post with the spear up through his own head, and nothing here looked.)
{
  type Rig = Record<string, THREE.Object3D> & { root: THREE.Object3D; tailSegments: THREE.Object3D[] };
  const rigOf = (m: GuardModel): Rig => (m as unknown as { rat: Rig }).rat;
  const spearOf = (m: GuardModel): THREE.Object3D => (m as unknown as { spear: THREE.Object3D }).spear;
  /** The two ends of his spear, in the world. */
  const ends = (m: GuardModel): { butt: THREE.Vector3; tip: THREE.Vector3; dir: THREE.Vector3 } => {
    m.root.updateMatrixWorld(true);
    const butt = spearOf(m).localToWorld(new THREE.Vector3(0, 0, -0.51));
    const tip = spearOf(m).localToWorld(new THREE.Vector3(0, 0, 0.92));
    return { butt, tip, dir: tip.clone().sub(butt).normalize() };
  };
  /**
   * The parts of his own body the spear passes through (none is right): lines down the middle of the shaft and just
   * outside it, tried against every piece of him but the forearm and hand that hold it.
   */
  const through = (m: GuardModel): string[] => {
    const rat = rigOf(m);
    const { butt, tip, dir } = ends(m);
    const named: Array<[string, THREE.Object3D]> = ['head', 'earS', 'earH', 'chest', 'pelvis', 'armS', 'armH', 'shieldPivot', 'legS', 'legH'].map((k) => [k, rat[k]]);
    named.push(['tail', rat.tailSegments[0]]);
    const meshes: THREE.Mesh[] = [];
    rat.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible || p === rat.elbowS) return;
      meshes.push(mesh);
    });
    const side = new THREE.Vector3(0, 1, 0).cross(dir);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    const up = dir.clone().cross(side).normalize();
    const R = 0.035;
    const hits = new Set<string>();
    const ray = new THREE.Raycaster();
    for (const [a, b] of [[0, 0], [R, 0], [-R, 0], [0, R], [0, -R]]) {
      ray.set(butt.clone().addScaledVector(side, a).addScaledVector(up, b), dir);
      ray.far = butt.distanceTo(tip);
      for (const mesh of meshes) {
        const mat = mesh.material as THREE.Material;
        const was = mat.side;
        mat.side = THREE.DoubleSide;
        if (ray.intersectObject(mesh, false).length) {
          let name = '?';
          for (let p: THREE.Object3D | null = mesh; p && name === '?'; p = p.parent) name = named.find(([, g]) => g === p)?.[0] ?? '?';
          hits.add(name);
        }
        mat.side = was;
      }
    }
    return [...hits].sort();
  };
  const run = (m: GuardModel, state: GuardState, secs: number, each?: () => void): void => {
    for (let t = 0; t < secs; t += DT) {
      m.update(DT, { state, stateTime: t, walking: state === 'chase' || state === 'return' ? GUARD.speed : 0, counter: false });
      each?.();
    }
  };
  const fresh = (): GuardModel => {
    const m = new GuardModel();
    m.setTransform(at, 0);
    return m;
  };
  // Each thing he does, how long it lasts, and what he was doing before it (every pose is come into as in a fight,
  // and every frame of the way there is looked at, not only where it ends).
  const LASTS: Array<[GuardState, number, GuardState[]]> = [
    ['idle', 2.5, ['hold', 'return']], ['chase', 1.5, ['idle']], ['hold', 1.5, ['idle', 'chase']], ['windup', GUARD.windup, ['chase', 'hold']],
    ['thrust', GUARD.thrustTime, ['hold', 'windup']], ['recover', GUARD.recover, ['hold', 'windup', 'thrust']], ['hold', 1, ['windup', 'thrust', 'recover']],
    ['broken', GUARD.brokenParry, ['hold', 'windup', 'thrust']], ['hold', 1, ['thrust', 'broken']], ['stagger', GUARD.stagger, ['chase', 'hold']],
    ['windup', GUARD.counterWindup, ['hold', 'stagger']], ['return', 1.5, ['chase', 'hold']], ['chase', 1, ['hold', 'return']],
  ];
  const time: Partial<Record<GuardState, number>> = { idle: 1, chase: 0.8, hold: 0.8, windup: GUARD.windup, thrust: GUARD.thrustTime, recover: GUARD.recover, broken: 1, stagger: GUARD.stagger, return: 0.8 };
  const bad: string[] = [];
  let low = 9;
  let sound = true;
  let tall = 0;
  let floor = 9;
  for (const [state, secs, lead] of LASTS) {
    const m = fresh();
    for (const s of lead) run(m, s, time[s] ?? 1);
    const seen = new Map<string, number>();
    run(m, state, secs, () => {
      for (const h of through(m)) seen.set(h, (seen.get(h) ?? 0) + 1);
      const e = ends(m);
      low = Math.min(low, e.butt.y, e.tip.y);
    });
    if (seen.size) bad.push(`${lead[lead.length - 1]} > ${state}: ${[...seen].map(([k, n]) => `${k} for ${n} frames`).join(', ')}`);
    const r = measure(rigOf(m).root);
    if (!r.finite || r.meshes < 30) sound = false;
    tall = Math.max(tall, r.box.max.y - r.box.min.y);
    floor = Math.min(floor, r.box.min.y);
  }
  check('guard: he builds, and every pose is whole (no part missing, unpainted or gone bad)', sound && tall > 1.2 && tall < 2.2, `tallest ${tall.toFixed(2)} with his spear`);
  check('guard: in everything he does, and on the way into it, his spear passes clear of his own head, ears, body, shield, legs and tail', bad.length === 0, bad.join(' | ') || `${LASTS.length} moves, every frame`);
  check('guard: neither end of his spear ever goes under the floor, and nor does he', low > -0.02 && floor > -0.06, `spear lowest ${low.toFixed(2)}, body lowest ${floor.toFixed(2)}`);

  {
    const m = fresh();
    run(m, 'idle', 2);
    const e = ends(m);
    const head = rigOf(m).head.getWorldPosition(new THREE.Vector3());
    const off = Math.hypot(e.tip.x - head.x, e.tip.z - head.z);
    check('guard: at his post the spear stands upright beside him, its butt on the ground and its point well out from his head', e.dir.y > 0.99 && e.butt.y > -0.01 && e.butt.y < 0.06 && off > 0.34 && e.tip.y > head.y + 0.3, `tilt ${(Math.acos(e.dir.y) * 57.3).toFixed(0)} degrees, butt ${e.butt.y.toFixed(2)} up, point ${off.toFixed(2)} out from his head`);
  }
  {
    const m = fresh();
    run(m, 'idle', 0.6);
    run(m, 'hold', 1.2);
    const level = ends(m);
    check('guard: coming on, the spear is levelled at hip height and points at whoever he faces', level.dir.z > 0.97 && Math.abs(level.dir.y) < 0.12 && level.tip.z > 1 && level.tip.y > 0.3 && level.tip.y < 0.7, `points ${level.dir.x.toFixed(2)}, ${level.dir.y.toFixed(2)}, ${level.dir.z.toFixed(2)}; point ${level.tip.z.toFixed(2)} ahead`);
    run(m, 'windup', GUARD.windup);
    const drawn = ends(m);
    check('guard: winding up, the spear is drawn back and still points at its mark', drawn.dir.z > 0.97 && drawn.tip.z < level.tip.z - 0.25, `point ${drawn.tip.z.toFixed(2)} ahead (levelled, ${level.tip.z.toFixed(2)})`);
    run(m, 'thrust', GUARD.thrustTime);
    const out = ends(m);
    // The blow lands on a rat whose near side is this far off at most: the point should get about there, and not past the far side of him.
    const far = GUARD.radius + GUARD.reach;
    check('guard: his thrust goes straight ahead, level, and the point reaches about as far as the blow does', out.dir.z > 0.96 && Math.abs(out.dir.y) < 0.1 && Math.abs(out.tip.x) < 0.2 && out.tip.z > far - 0.15 && out.tip.z < far + 0.35, `points ${out.dir.x.toFixed(2)}, ${out.dir.y.toFixed(2)}, ${out.dir.z.toFixed(2)}; point ${out.tip.z.toFixed(2)} ahead, the blow reaches ${far.toFixed(2)} to ${(far + 0.6).toFixed(2)}`);
    run(m, 'recover', GUARD.recover);
    run(m, 'hold', 1.2);
    const again = ends(m);
    check('guard: back in his guard after a thrust, he stands exactly as he did before it (nothing of the lunge is left in him)', again.tip.distanceTo(level.tip) < 0.03 && again.butt.distanceTo(level.butt) < 0.03, `point ${again.tip.distanceTo(level.tip).toFixed(3)} out`);
    // And his feet step again when he walks, just as a guard's who has never lunged do (they used to stay planted
    // where the lunge had put them).
    const stride = (g: GuardModel): { lift: number; reach: number } => {
      const rat = rigOf(g);
      const lo = new THREE.Vector3(9, 9, 9);
      const hi = new THREE.Vector3(-9, -9, -9);
      run(g, 'chase', 1.2, () => {
        rat.root.updateMatrixWorld(true);
        const foot = rat.footS.getWorldPosition(new THREE.Vector3());
        lo.min(foot);
        hi.max(foot);
      });
      return { lift: hi.y - lo.y, reach: hi.z - lo.z };
    };
    const never = fresh();
    run(never, 'idle', 0.6);
    run(never, 'hold', 1.2);
    const plain = stride(never);
    const after = stride(m);
    check('guard: walking after a thrust, his feet step as they did before it', after.reach > 0.1 && after.lift > 0.02 && Math.abs(after.reach - plain.reach) < 0.01 && Math.abs(after.lift - plain.lift) < 0.005, `stride ${after.reach.toFixed(2)}, lift ${after.lift.toFixed(3)} (before: ${plain.reach.toFixed(2)}, ${plain.lift.toFixed(3)})`);
  }
  {
    const m = fresh();
    run(m, 'hold', 0.8);
    run(m, 'dead', 1.2);
    const e = ends(m);
    const box = measure(rigOf(m).root).box;
    rigOf(m).root.updateMatrixWorld(true);
    const tailLow = Math.min(...rigOf(m).tailSegments.map((seg) => seg.getWorldPosition(new THREE.Vector3()).y));
    check('guard: dead, he lies on the floor with his tail along it, and his spear lies flat beside him (held, it stood up out of him with its butt under the ground)', e.butt.y > 0 && e.butt.y < 0.1 && e.tip.y > 0 && e.tip.y < 0.1 && box.max.y < 0.75 && tailLow > -0.03, `spear ends ${e.butt.y.toFixed(2)} and ${e.tip.y.toFixed(2)} up; he is ${box.max.y.toFixed(2)} high; tail lowest ${tailLow.toFixed(2)}`);
    run(m, 'idle', 1.5);
    const up = ends(m);
    check('guard: alive again, the spear is back in his hand, upright', spearOf(m).parent === rigOf(m).sword && up.dir.y > 0.99 && through(m).length === 0);
  }
}

// ---- The Orchid Mantis: a body of its own (nothing of the knight's), so everything about it is checked ----
{
  type Inside = {
    rig: THREE.Object3D; head: THREE.Object3D; neckPivot: THREE.Object3D; abdomenPivot: THREE.Object3D; arms: THREE.Object3D[][];
    legs: Array<{ thigh: THREE.Object3D; shin: THREE.Object3D }>; fans: THREE.Object3D[]; glints: THREE.Object3D[][];
  };
  const inside = (m: MantisModel): Inside => m as unknown as Inside;
  const SHIN_LENGTH = 0.72;
  const feet = (m: MantisModel): THREE.Vector3[] => {
    m.root.updateMatrixWorld(true);
    return inside(m).legs.map((leg) => leg.shin.localToWorld(new THREE.Vector3(SHIN_LENGTH, 0, 0)));
  };
  /** The parts of its own body a scythe arm passes through (none is right): the thigh and the blade of each, tried against everything but its arms. */
  const through = (m: MantisModel): string[] => {
    const I = inside(m);
    const named: Array<[string, THREE.Object3D]> = [['head', I.head], ['neck', I.neckPivot], ['abdomen or wings', I.abdomenPivot]];
    for (const leg of I.legs) named.push(['a leg', leg.thigh], ['a leg', leg.shin]);
    const arms = I.arms.flat();
    const meshes: THREE.Mesh[] = [];
    I.rig.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible || arms.includes(p)) return;
      meshes.push(mesh);
    });
    const hits = new Set<string>();
    const ray = new THREE.Raycaster();
    for (const b of m.blades()) {
      for (const [from, to] of [[b.elbow, b.wrist], [b.wrist, b.tip]]) {
        const dir = to.clone().sub(from);
        ray.far = dir.length();
        ray.set(from, dir.normalize());
        for (const mesh of meshes) {
          const mat = mesh.material as THREE.Material;
          const was = mat.side;
          mat.side = THREE.DoubleSide;
          if (ray.intersectObject(mesh, false).length) {
            let name = 'body';
            for (let p: THREE.Object3D | null = mesh; p && name === 'body'; p = p.parent) name = named.find(([, g]) => g === p)?.[0] ?? 'body';
            hits.add(name);
          }
          mat.side = was;
        }
      }
    }
    return [...hits].sort();
  };
  const ctx = (state: MantisState, stateTime: number, o: Partial<MantisAnimInput> = {}): MantisAnimInput => ({ state, stateTime, walking: 0, arm: -1, held: false, windupTime: MANTIS.windup, air: 0, ...o });
  const run = (m: MantisModel, state: MantisState, secs: number, o: Partial<MantisAnimInput> = {}, each?: (t: number) => void): void => {
    for (let t = 0; t < secs; t += DT) {
      const air = state === 'leap' ? Math.min(1, t / MANTIS.leapTime) : state === 'hop' ? Math.min(1, t / MANTIS.hopTime) : 0;
      m.update(DT, ctx(state, t, { air, ...o }));
      each?.(t);
    }
  };
  const fresh = (): MantisModel => {
    const m = new MantisModel();
    m.setTransform(at, 0);
    return m;
  };
  type Move = [MantisState, number, Partial<MantisAnimInput>];
  const W = MANTIS.windup;
  // Each thing it does, as it comes about in a fight: what leads into it, then the thing itself.
  const MOVES: Array<{ name: string; lead: Move[]; move: Move }> = [
    { name: 'rest', lead: [], move: ['idle', 2, {}] },
    { name: 'stalk', lead: [['idle', 0.5, {}]], move: ['stalk', 1, {}] },
    { name: 'sway', lead: [['stalk', 0.5, {}]], move: ['sway', 2, {}] },
    { name: 'wind-up (right)', lead: [['sway', 0.6, {}]], move: ['windup', W, { arm: -1 }] },
    { name: 'cut (right)', lead: [['sway', 0.6, {}], ['windup', W, { arm: -1 }]], move: ['slash', MANTIS.slashTime, { arm: -1 }] },
    { name: 'second wind-up (left, held)', lead: [['sway', 0.6, {}], ['windup', W, { arm: -1 }], ['slash', MANTIS.slashTime, { arm: -1 }]], move: ['windup', MANTIS.delayed, { arm: 1, held: true, windupTime: MANTIS.delayed }] },
    { name: 'second cut (left)', lead: [['sway', 0.6, {}], ['windup', W, { arm: -1 }], ['slash', MANTIS.slashTime, { arm: -1 }], ['windup', MANTIS.quick, { arm: 1, windupTime: MANTIS.quick }]], move: ['slash', MANTIS.slashTime, { arm: 1 }] },
    { name: 'spent', lead: [['sway', 0.6, {}], ['windup', W, { arm: 1 }], ['slash', MANTIS.slashTime, { arm: 1 }]], move: ['recover', MANTIS.recover, {}] },
    { name: 'back to swaying', lead: [['windup', W, {}], ['slash', MANTIS.slashTime, {}], ['recover', MANTIS.recover, {}]], move: ['sway', 1, {}] },
    { name: 'crouch', lead: [['stalk', 0.6, {}]], move: ['crouch', MANTIS.leapWindup, {}] },
    { name: 'leap', lead: [['stalk', 0.6, {}], ['crouch', MANTIS.leapWindup, {}]], move: ['leap', MANTIS.leapTime, {}] },
    { name: 'stuck', lead: [['stalk', 0.6, {}], ['crouch', MANTIS.leapWindup, {}], ['leap', MANTIS.leapTime, {}]], move: ['stuck', MANTIS.stuck, {}] },
    { name: 'pulling free', lead: [['crouch', MANTIS.leapWindup, {}], ['leap', MANTIS.leapTime, {}], ['stuck', MANTIS.stuck, {}]], move: ['sway', 1, {}] },
    { name: 'hop', lead: [['sway', 0.6, {}]], move: ['hop', MANTIS.hopTime, {}] },
    { name: 'landing from a hop', lead: [['sway', 0.6, {}], ['hop', MANTIS.hopTime, {}]], move: ['stalk', 0.8, {}] },
    { name: 'flinch', lead: [['sway', 0.6, {}]], move: ['stagger', MANTIS.stagger, {}] },
    { name: 'flinch out of a wind-up', lead: [['sway', 0.6, {}], ['windup', W * 0.8, { arm: 1 }]], move: ['stagger', MANTIS.stagger, {}] },
    { name: 'reel', lead: [['sway', 0.6, {}], ['windup', W, {}], ['slash', 0.08, {}]], move: ['reel', MANTIS.reel, {}] },
    { name: 'steadying', lead: [['windup', W, {}], ['slash', 0.08, {}], ['reel', MANTIS.reel, {}]], move: ['sway', 1, {}] },
    { name: 'going home', lead: [['sway', 0.6, {}]], move: ['return', 1, {}] },
  ];
  const bad: string[] = [];
  const sunk: string[] = [];
  const afloat: string[] = [];
  let sound = true;
  let tall = 0;
  for (const { name, lead, move } of MOVES) {
    const m = fresh();
    for (const [s, secs, o] of lead) run(m, s, secs, o);
    const seen = new Map<string, number>();
    let lowTip = 9;
    let lowFoot = 9;
    let highFoot = -9;
    run(m, move[0], move[1], move[2], () => {
      for (const h of through(m)) seen.set(h, (seen.get(h) ?? 0) + 1);
      for (const b of m.blades()) lowTip = Math.min(lowTip, b.tip.y, b.wrist.y);
      for (const f of feet(m)) {
        lowFoot = Math.min(lowFoot, f.y);
        highFoot = Math.max(highFoot, f.y);
      }
    });
    if (seen.size) bad.push(`${name}: ${[...seen].map(([k, n]) => `${k} for ${n} frames`).join(', ')}`);
    // Its scythes go into the floor only when they are meant to (driven in after a leap, and while it pulls them out).
    const planted = move[0] === 'stuck' || move[0] === 'leap' || name === 'pulling free';
    if (lowTip < (planted ? -0.16 : -0.02)) sunk.push(`${name}: a scythe ${lowTip.toFixed(2)}`);
    if (lowFoot < -0.03) sunk.push(`${name}: a foot ${lowFoot.toFixed(2)}`);
    // On the ground its feet are on the ground (a stepping foot lifts a little).
    const air = move[0] === 'leap' || move[0] === 'hop' || name === 'landing from a hop' || name === 'stuck';
    if (!air && highFoot > 0.17) afloat.push(`${name}: a foot ${highFoot.toFixed(2)} up`);
    const r = measure(inside(m).rig);
    if (!r.finite || r.meshes < 40) sound = false;
    tall = Math.max(tall, r.box.max.y - r.box.min.y);
  }
  check('mantis: it builds, and every pose is whole (no part missing, unpainted or gone bad)', sound && tall > 1.2 && tall < 2.6, `tallest ${tall.toFixed(2)}`);
  check('mantis: in everything it does, and on the way into it, its scythes pass clear of its own head, neck, body, wings and legs', bad.length === 0, bad.join(' | ') || `${MOVES.length} moves, every frame`);
  check('mantis: its scythes and feet never go under the floor (the scythes are driven a little way in after a leap, and only then)', sunk.length === 0, sunk.join(' | '));
  check('mantis: on the ground, its feet are on the ground', afloat.length === 0, afloat.join(' | '));

  {
    const m = fresh();
    run(m, 'idle', 1.5);
    const head = inside(m).head.getWorldPosition(new THREE.Vector3());
    const b = m.blades();
    check('mantis: at rest it stands taller than the knight, its scythes folded up before its face', head.y > 1.15 && b.every((x) => x.wrist.z > head.z + 0.1 && x.wrist.y > head.y - 0.35 && x.tip.y < x.wrist.y), `head ${head.y.toFixed(2)} up; wrists ${b.map((x) => x.wrist.y.toFixed(2)).join(', ')} up`);
    // Standing still (and swaying), its feet do not slide.
    run(m, 'sway', 0.6);
    const a0 = feet(m);
    let moved = 0;
    let rocked = 0;
    const x0 = inside(m).head.getWorldPosition(new THREE.Vector3()).x;
    run(m, 'sway', 2, {}, () => {
      feet(m).forEach((f, i) => (moved = Math.max(moved, f.distanceTo(a0[i]))));
      rocked = Math.max(rocked, Math.abs(inside(m).head.getWorldPosition(new THREE.Vector3()).x - x0));
    });
    check('mantis: swaying, its body rocks from side to side over feet that stay planted', moved < 0.01 && rocked > 0.08, `feet moved ${moved.toFixed(3)}, head rocked ${rocked.toFixed(2)}`);
    // Walking, they step: each foot stays put on the floor between steps and is lifted over.
    const pos = new THREE.Vector3();
    let lifted = 0;
    let slid = 0;
    let last = feet(m);
    for (let t = 0; t < 2; t += DT) {
      pos.z += MANTIS.speed * DT;
      m.setTransform(pos, 0);
      m.update(DT, ctx('stalk', t, { walking: MANTIS.speed }));
      const now = feet(m);
      now.forEach((f, i) => {
        lifted = Math.max(lifted, f.y);
        // A foot that is down is not moving.
        if (f.y < 0.004 && last[i].y < 0.004) slid = Math.max(slid, Math.hypot(f.x - last[i].x, f.z - last[i].z));
      });
      last = now;
    }
    const kept = feet(m).every((f) => Math.abs(f.z - pos.z) < 1.2);
    check('mantis: walking, its feet step (down they stay where they are put; up they are carried over) and keep up with it', lifted > 0.08 && slid < 0.01 && kept, `lifts ${lifted.toFixed(2)}, a planted foot slides ${slid.toFixed(3)}`);
  }
  {
    const m = fresh();
    run(m, 'sway', 0.6);
    run(m, 'windup', W, { arm: -1 });
    const head = inside(m).head.getWorldPosition(new THREE.Vector3());
    const [right, left] = m.blades();
    const glint = inside(m).glints.map((g) => g.some((x) => x.visible));
    check('mantis: winding up, that scythe is raised high over its head and glints; the other stays down before its face', right.tip.y > head.y + 0.35 && left.tip.y < head.y + 0.1 && glint[0] && !glint[1], `raised point ${(right.tip.y - head.y).toFixed(2)} over its head`);
    run(m, 'slash', MANTIS.slashTime, { arm: -1 });
    const cut = m.blades()[0];
    // The blow lands on a rat whose near side is this far off at most (it has stepped in by then).
    const far = MANTIS.radius + MANTIS.reach;
    check('mantis: the cut comes down across its front at the height of the knight, and its point gets about as far as the blow does', cut.tip.z > far - 0.55 && cut.tip.z < far + 0.25 && cut.tip.y > 0.25 && cut.tip.y < 0.95 && Math.abs(cut.tip.x) < 0.45, `point ${cut.tip.z.toFixed(2)} ahead, ${cut.tip.y.toFixed(2)} up, ${cut.tip.x.toFixed(2)} across; the blow reaches ${far.toFixed(2)}`);
    run(m, 'windup', MANTIS.delayed, { arm: 1, held: true, windupTime: MANTIS.delayed });
    const second = m.blades();
    const glint2 = inside(m).glints.map((g) => g.some((x) => x.visible));
    check('mantis: the second cut is the other scythe going up, and it is the one that glints', second[1].tip.y > inside(m).head.getWorldPosition(new THREE.Vector3()).y + 0.35 && glint2[1] && !glint2[0]);
  }
  {
    const m = fresh();
    run(m, 'stalk', 0.6);
    run(m, 'crouch', MANTIS.leapWindup);
    const I = inside(m);
    const head = I.head.getWorldPosition(new THREE.Vector3());
    const standing = (() => { const s = fresh(); run(s, 'stalk', 0.8); return inside(s).head.getWorldPosition(new THREE.Vector3()).y; })();
    const flared = I.fans.every((f) => f.visible && Math.abs(f.scale.x) > 0.8);
    const b = m.blades();
    check('mantis: before a leap it crouches, flares its bright wings and lifts both scythes, both glinting', head.y < standing - 0.15 && flared && b.every((x) => x.tip.y > head.y + 0.3) && I.glints.every((g) => g.some((x) => x.visible)), `head ${(standing - head.y).toFixed(2)} lower; points ${b.map((x) => (x.tip.y - head.y).toFixed(2)).join(', ')} over it`);
    const calm = fresh();
    run(calm, 'sway', 1);
    check('mantis: (its wings are folded away the rest of the time)', inside(calm).fans.every((f) => !f.visible));
    let top = 0;
    let feetUp = 0;
    run(m, 'leap', MANTIS.leapTime, {}, (t) => {
      top = Math.max(top, I.rig.position.y);
      if (Math.abs(t - MANTIS.leapTime / 2) < DT) feetUp = Math.min(...feet(m).map((f) => f.y));
    });
    check('mantis: it leaps well clear of the floor, legs and all', top > MANTIS.leapHeight * 0.9 && feetUp > 0.4, `${top.toFixed(2)} up, lowest foot ${feetUp.toFixed(2)}`);
    run(m, 'stuck', 0.5);
    const stuck = m.blades();
    check('mantis: it comes down with both scythes driven into the floor in front of it', stuck.every((x) => x.tip.y < 0.05 && x.tip.y > -0.16 && x.tip.z > 0.6) && I.rig.position.y < 0.02 && feet(m).every((f) => f.y < 0.02), `points ${stuck.map((x) => x.tip.y.toFixed(2)).join(', ')} up, ${stuck.map((x) => x.tip.z.toFixed(2)).join(', ')} ahead`);
  }
  {
    const m = fresh();
    run(m, 'sway', 0.6);
    run(m, 'windup', W);
    run(m, 'slash', 0.08);
    run(m, 'reel', 1);
    const [r, l] = m.blades();
    check('mantis: its cut turned, its arms are thrown wide open', l.wrist.x - r.wrist.x > 1.0 && l.tip.x - r.tip.x > 1.0, `wrists ${(l.wrist.x - r.wrist.x).toFixed(2)} apart`);
    run(m, 'dead', 1.1);
    const box = measure(inside(m).rig).box;
    check('mantis: dead, it lies on the floor, nothing of it under it', box.max.y < 0.85 && box.min.y > -0.04, size(box));
    run(m, 'dead', 2.2);
    m.root.updateMatrixWorld(true);
    check('mantis: and then shrivels away to nothing', m.root.scale.x < 0.01);
    run(m, 'idle', 1);
    check('mantis: (and is whole again if the level brings it back)', m.root.scale.x > 0.98 && measure(inside(m).rig).finite);
  }
}

// ---- The Club's folk and the king ----
{
  const tall: Record<NpcKind, [number, number]> = { mouse: [1.2, 1.7], bird: [1.2, 1.6], pigeon: [1.5, 2.1], villain: [2.75, 3.35] };
  for (const kind of ['mouse', 'bird', 'pigeon', 'villain'] as NpcKind[]) {
    const n = new Npc({ name: kind, kind, x: 0, z: 0, facing: 0, lines: ['Hello.'] });
    let ok = true;
    let low = 0;
    let top = 0;
    for (let i = 0; i < 400; i++) {
      const talking = i > 200;
      if (talking && i % 9 === 0) n.pulse();
      if (i === 300) n.act = { lookAt: null, shrug: 1 };
      n.update(DT, 1, 0, 1.5, talking);
      if (i % 10) continue;
      const r = measure(n.root);
      ok &&= r.finite && r.meshes > 20;
      low = Math.min(low, r.box.min.y);
      top = Math.max(top, r.box.max.y);
    }
    check(`${kind}: idling, talking and shrugging, he holds together`, ok);
    check(`${kind}: he stands on the floor and is the height he was`, low > -0.08 && top > tall[kind][0] && top < tall[kind][1], `floor ${low.toFixed(2)}, top ${top.toFixed(2)}`);
    check(`${kind}: the rat can still talk to him from the same distance`, n.inRange(1, 0, 1.5) && !n.inRange(3, 0, 0));
  }
  // Pip keeps hold of his lantern pole, and his free paw moves when he talks.
  const pip = new Npc({ name: 'Pip', kind: 'mouse', x: 0, z: 0, facing: 0, lines: ['Hello.'] });
  const arms = (pip as unknown as { arms: THREE.Object3D[] }).arms;
  for (let i = 0; i < 60; i++) pip.update(DT, 0, 0, 2, false);
  const hold = arms.find((a) => (a.userData.side as number) > 0)!;
  const free = arms.find((a) => (a.userData.side as number) < 0)!;
  pip.root.updateMatrixWorld(true);
  const paw = hold.localToWorld(new THREE.Vector3(0, -0.26, 0.01));
  const local = pip.root.worldToLocal(paw.clone());
  check('Pip: his right paw is on the lantern pole', Math.hypot(local.x - 0.38, local.z - 0.2) < 0.09, `${local.x.toFixed(2)}, ${local.z.toFixed(2)} (pole at 0.38, 0.20)`);
  const before = free.rotation.x;
  let moved = 0;
  for (let i = 0; i < 90; i++) {
    pip.update(DT, 0, 0, 2, true);
    moved = Math.max(moved, Math.abs(free.rotation.x - before));
  }
  check('Pip: his left paw waves about when he talks', moved > 0.3, moved.toFixed(2));
  // Wren and Mort have looks of their own, picked by name (levels write it in any case).
  check('looks go by name: Wren is not Finch, Mort is not Pip', lookOf('bird', 'WREN') === 'wren' && lookOf('bird', 'Finch') === 'finch' && lookOf('mouse', 'MELLOW MORT') === 'mort' && lookOf('mouse', 'Pip') === 'pip' && lookOf(undefined, 'Somebody') === 'pip' && lookOf('villain', 'Mort') === 'grimsqueak');
  const colours = (n: Npc): Set<number> => {
    const set = new Set<number>();
    n.root.traverse((o) => {
      const m = o as THREE.Mesh;
      const col = m.isMesh && m.material instanceof THREE.ShaderMaterial ? m.geometry.attributes.color : null;
      if (col) for (let i = 0; i < col.count; i += 3) set.add(Math.round(col.getX(i) * 31) * 1024 + Math.round(col.getY(i) * 31) * 32 + Math.round(col.getZ(i) * 31));
    });
    return set;
  };
  const shared = (a: Set<number>, b: Set<number>): number => [...a].filter((c) => b.has(c)).length / Math.min(a.size, b.size);
  for (const [kind, name, other, lo, hi] of [['mouse', 'MELLOW MORT', 'PIP', 1.15, 1.6], ['bird', 'WREN', 'FINCH', 1.05, 1.5]] as Array<[NpcKind, string, string, number, number]>) {
    const n = new Npc({ name, kind, x: 0, z: 0, facing: 0, lines: ['Hello.'] });
    const o = new Npc({ name: other, kind, x: 0, z: 0, facing: 0, lines: ['Hello.'] });
    let ok = true;
    let low = 0;
    let top = 0;
    for (let i = 0; i < 400; i++) {
      if (i > 200 && i % 9 === 0) n.pulse();
      if (i === 300) n.act = { lookAt: null, shrug: 1 };
      n.update(DT, 1, 0, 1.5, i > 200);
      if (i % 10) continue;
      const r = measure(n.root);
      ok &&= r.finite && r.meshes > 20;
      low = Math.min(low, r.box.min.y);
      top = Math.max(top, r.box.max.y);
    }
    check(`${name}: idling, talking and shrugging, he holds together and stands on the floor`, ok && low > -0.08 && top > lo && top < hi, `floor ${low.toFixed(2)}, top ${top.toFixed(2)}`);
    const mix = shared(colours(n), colours(o));
    check(`${name}: he does not wear ${other}'s colours`, mix < 0.35, `${Math.round(mix * 100)}% shared`);
    check(`${name}: the rat can still talk to him from the same distance`, n.inRange(1, 0, 1.5) && !n.inRange(3, 0, 0));
  }
  {
    // Mort carries a mug and no lantern; both paws are on the mug.
    const mort = new Npc({ name: 'MELLOW MORT', kind: 'mouse', x: 0, z: 0, facing: 0, lines: ['Hey.'] });
    for (let i = 0; i < 60; i++) mort.update(DT, 0, 0, 2, false);
    mort.root.updateMatrixWorld(true);
    const parts = mort as unknown as { arms: THREE.Object3D[]; mug: THREE.Object3D; lanternGlow: unknown; eyes: THREE.Object3D[] };
    const mug = parts.mug.getWorldPosition(new THREE.Vector3());
    const reach = parts.arms.map((a) => a.localToWorld(new THREE.Vector3(0, -0.26, 0.01)).distanceTo(mug));
    check('Mort: no lantern, and both paws are on his mug', parts.lanternGlow === null && Math.max(...reach) < 0.17, reach.map((d) => d.toFixed(2)).join(', '));
    check('Mort: his eyes are never more than half open', parts.eyes.every((e) => e.scale.y <= 0.5));
  }
  // Finch's beak opens on a syllable and shuts again.
  const finch = new Npc({ name: 'Finch', kind: 'bird', x: 0, z: 0, facing: 0, lines: ['Chirp.'] });
  const jaw = (finch as unknown as { jaw: THREE.Object3D }).jaw;
  finch.update(DT, 0, 0, 2, true);
  finch.pulse();
  finch.update(DT, 0, 0, 2, true);
  const open = jaw.rotation.x;
  for (let i = 0; i < 30; i++) finch.update(DT, 0, 0, 2, true);
  check('Finch: his beak opens on a syllable and shuts again', open > 0.35 && jaw.rotation.x < 0.05, `${open.toFixed(2)} -> ${jaw.rotation.x.toFixed(2)}`);
}

// ---- Lord Grimsqueak, the gaunt king: every gesture of the fight and the story ----
{
  const gestures: GrimGesture[] = ['rest', 'cast', 'conjure', 'point', 'rear', 'sweep', 'raise', 'smash', 'slump', 'rage', 'offer'];
  const base = { low: 0, float: GRIM_FIGHT_FLOAT, bow: 0, still: false, talking: false, mouth: 0, reach: 0 };
  const parts = (m: GrimsqueakModel) => m as unknown as {
    arms: Array<{ side: number; hand: THREE.Object3D; shoulder: THREE.Object3D }>; shard: THREE.Object3D; orb: THREE.Mesh; whiskers: Array<{ pivot: THREE.Object3D; row: number }>;
    head: THREE.Object3D; crown: THREE.Object3D; body: THREE.Object3D;
  };
  const world = (o: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Vector3 => o.localToWorld(new THREE.Vector3(x, y, z));
  const settle = (m: GrimsqueakModel, inp: Partial<typeof base> & { gesture: GrimGesture }, frames = 120): void => {
    for (let i = 0; i < frames; i++) m.update(DT, { ...base, ...inp });
    m.root.updateMatrixWorld(true);
  };
  let ok = true;
  let lowUp = 9;
  let lowDown = 9;
  const hands: Record<string, THREE.Vector3[]> = {};
  for (const g of gestures) {
    const m = new GrimsqueakModel();
    settle(m, { gesture: g });
    const up = measure(m.root);
    ok &&= up.finite && up.meshes > 60;
    // (Over three seconds, so the bottom of his bobbing is in it.)
    for (let i = 0; i < 180; i++) {
      m.update(DT, { ...base, gesture: g });
      if (i % 6 === 0) lowUp = Math.min(lowUp, measure(m.root).box.min.y);
    }
    hands[g] = parts(m).arms.map((a) => m.root.worldToLocal(world(a.hand, 0, -0.08, 0)));
    settle(m, { gesture: g, low: 1 });
    const down = measure(m.root);
    ok &&= down.finite;
    lowDown = Math.min(lowDown, down.box.min.y);
  }
  check('Grimsqueak: every gesture holds together, floating and on the ground', ok);
  check('Grimsqueak: floating in the fight, all of him (rags and tail too) hangs above the sword\'s reach', lowUp > 0.9, `lowest ${lowUp.toFixed(2)}`);
  check('Grimsqueak: brought low, his rags are on the ground and nothing is under it', lowDown > -0.06 && lowDown < 0.08, `lowest ${lowDown.toFixed(2)}`);
  {
    const m = new GrimsqueakModel();
    settle(m, { gesture: 'rest', low: 1 });
    const p = parts(m);
    const top = measure(m.root).box.max.y;
    check('Grimsqueak: standing, he is more than twice the knight\'s height, and thin', Math.abs(top - GRIM_HEIGHT) < 0.15 && top > 2 * 1.1, `${top.toFixed(2)} tall`);
    const left = p.arms.find((a) => a.side < 0)!;
    const gap = world(left.hand, 0, -0.08, 0).distanceTo(p.shard.getWorldPosition(new THREE.Vector3()));
    check('Grimsqueak: at rest, one paw is curled over the shard in his chest', gap < 0.24, `${gap.toFixed(2)} from it`);
    // Whiskers: two a side, sweeping out from the snout and hanging well down, but not to his waist.
    const tips = p.whiskers.map((w) => {
      const tube = w.pivot.children[0] as THREE.Mesh;
      const pos = tube.geometry.attributes.position;
      const root = world(w.pivot);
      const tip = tube.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, pos.count - 1));
      return { row: w.row, out: Math.abs(tip.x - root.x), drop: root.y - tip.y };
    });
    const long = tips.filter((w) => w.row === 0);
    check('Grimsqueak: four whiskers; the long pair sweeps out and hangs past his chin, like a moustache', tips.length === 4 && long.every((w) => w.out > 0.15 && w.drop > 0.35 && w.drop < 0.65) && tips.filter((w) => w.row === 1).every((w) => w.drop > 0.08 && w.drop < long[0].drop), tips.map((w) => `out ${w.out.toFixed(2)} down ${w.drop.toFixed(2)}`).join('; '));
    check('Grimsqueak: no ball of light in his claw when he is at rest', !p.orb.visible);
    settle(m, { gesture: 'conjure' }, 90);
    const orb = p.orb.getWorldPosition(new THREE.Vector3());
    check('Grimsqueak: making the orb, a ball of light grows in the claw he holds up over his head', p.orb.visible && p.orb.scale.x > 0.7 && orb.y > world(p.head).y + 0.3, `orb at ${orb.y.toFixed(2)}, head at ${world(p.head).y.toFixed(2)}`);
  }
  // Each tell of the fight has its own shape: where his claws are tells the attacks apart.
  const R = (g: string): THREE.Vector3 => hands[g][1];
  const L = (g: string): THREE.Vector3 => hands[g][0];
  const shoulderY = GRIM_FIGHT_FLOAT + (0.82 + 0.6) * 0.94; // how high he floats, then his waist, then his shoulder
  check('Grimsqueak: the volley has both claws out in front of him', R('cast').z > 0.4 && L('cast').z > 0.4);
  check('Grimsqueak: the orb has one claw high over his head and the other on his chest', R('conjure').y > shoulderY + 0.4 && L('conjure').y < shoulderY);
  check('Grimsqueak: rearing for the swoop, his arms are spread wide like wings', R('rear').x > 0.75 && L('rear').x < -0.75);
  check('Grimsqueak: diving, they are flung back behind him', R('sweep').z < -0.3 && L('sweep').z < -0.3);
  check('Grimsqueak: rising for the slam, both claws are over his head', R('raise').y > shoulderY + 0.4 && L('raise').y > shoulderY + 0.4);
  check('Grimsqueak: spent, they hang at his sides', R('slump').y < shoulderY - 0.5 && L('slump').y < shoulderY - 0.5);
  check('Grimsqueak: the paw he holds out at the end is out in front, below his shoulder', R('offer').z > 0.4 && R('offer').y < shoulderY);
  const shapes = ['cast', 'conjure', 'rear', 'sweep', 'raise'];
  let apart = 9;
  for (let i = 0; i < shapes.length; i++) for (let j = i + 1; j < shapes.length; j++) apart = Math.min(apart, R(shapes[i]).distanceTo(R(shapes[j])) + L(shapes[i]).distanceTo(L(shapes[j])));
  check('Grimsqueak: no two tells put his claws in nearly the same place', apart > 0.5, `closest pair differ by ${apart.toFixed(2)}`);
  // As a character in a level: a scene's directions still work.
  const n = new Npc({ name: 'Lord Grimsqueak', kind: 'villain', x: 0, z: 0, facing: 0, lines: [] });
  for (let i = 0; i < 60; i++) n.update(DT, 0, 0, 3, false);
  const floating = measure(n.root).box;
  n.rest();
  for (let i = 0; i < 120; i++) n.update(DT, 0, 0, 3, false);
  const resting = measure(n.root).box;
  check('Grimsqueak: in a level he floats; left at rest by the ending he stands on the ground', floating.min.y > 0.4 && resting.min.y > -0.06 && resting.min.y < 0.1 && resting.max.y < floating.max.y - 0.4, `${floating.min.y.toFixed(2)} -> ${resting.min.y.toFixed(2)}`);
}

// ---- The hero on a ledge: played by the real controller, his paws are on the edge the whole time he hangs and hauls ----
{
  const colliders = [makeAabb(0, -0.5, 0, 40, 1, 40), makeAabb(0, 1.5, 1.5, 2, 3, 1.6)];
  const p = new PlayerController(new THREE.Vector3(0, 0, -0.6));
  const rat = new RatModel();
  const parts = rat as unknown as { elbowS: THREE.Object3D; elbowH: THREE.Object3D; sword: THREE.Object3D; backSword: THREE.Object3D; shieldPivot: THREE.Object3D };
  const input = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
  const fwd = new THREE.Vector3(0, 0, 1);
  const edge = new THREE.Vector3(0, 3, 0.7); // the top front edge of the block
  /** How far the further paw is from its place on the edge (sideways along the edge does not count). */
  const pawGap = (): number => {
    rat.root.updateMatrixWorld(true);
    return Math.max(...[parts.elbowS, parts.elbowH].map((e) => {
      const w = e.localToWorld(new THREE.Vector3(0, -0.15, 0));
      const at = p.ledge ?? { y: 0, z: 0 };
      return Math.hypot(w.y - (p.position.y + at.y) + 0.02, w.z - (p.position.z + at.z));
    }));
  };
  const tick = (inp: PlayerInput): void => {
    p.update(DT, inp, colliders);
    rat.setTransform(p.position, p.facing);
    rat.update(DT, {
      state: p.state, planarSpeed: Math.hypot(p.velocity.x, p.velocity.z), comboStep: p.comboStep, attackTime: p.attackTime, dodgeKind: p.currentDodgeKind, dodgeProgress: p.dodgeProgress,
      verticalSpeed: p.velocity.y, flipProgress: p.flipProgress, armed: p.armed, stowProgress: p.stowProgress, plungeStage: p.plungeStage, ledge: p.ledge, hangTime: p.hangTime, climbProgress: p.climbProgress,
    });
  };
  for (let i = 0; i < 5; i++) tick(input({}));
  tick(input({ move: fwd, jumpPressed: true, jumpHeld: true }));
  for (let i = 0; i < 200 && p.state !== 'hang'; i++) tick(input({ move: fwd.clone().multiplyScalar(0.5), jumpHeld: true }));
  check('hero: he catches the edge of a block, and the game says where it is (on the lip, just past the face)', p.state === 'hang' && !!p.ledge && Math.abs(p.ledge.y - 1.05) < 0.01 && Math.abs(p.position.y + p.ledge.y - edge.y) < 0.01 && Math.abs(p.position.z + p.ledge.z - edge.z - 0.04) < 0.03, JSON.stringify(p.ledge));
  let worstHang = 0;
  for (let i = 0; i < 90; i++) {
    tick(input({}));
    if (i > 8) worstHang = Math.max(worstHang, pawGap());
  }
  check('hero: hanging, both paws are on the edge (not waving behind his head)', worstHang < 0.07, `furthest ${worstHang.toFixed(3)}`);
  check('hero: hanging, his sword and shield are on his back', !parts.sword.visible && !parts.shieldPivot.visible && parts.backSword.visible);
  tick(input({ jumpPressed: true }));
  let worstClimb = 0;
  let frames = 0;
  let sawLow = false;
  while (p.climbProgress >= 0 && frames++ < 200) {
    tick(input({}));
    if (p.climbProgress >= 0 && p.climbProgress < 0.46) worstClimb = Math.max(worstClimb, pawGap());
    // Early in the pull his chest is still below the edge: he is hauling himself up, not standing in the air.
    if (p.climbProgress > 0.1 && p.climbProgress < 0.3) {
      const chest = (rat as unknown as { chest: THREE.Object3D }).chest.getWorldPosition(new THREE.Vector3());
      if (chest.y < edge.y - 0.1) sawLow = true;
    }
  }
  check('hero: his paws stay on the edge for the first half of the pull-up, while he hauls his chest over it', worstClimb < 0.08, `furthest ${worstClimb.toFixed(3)}`);
  check('hero: the pull-up takes long enough to see (about half a second), and starts from below the edge', frames * DT > 0.4 && frames * DT < 0.7 && sawLow, `${(frames * DT).toFixed(2)} s`);
  for (let i = 0; i < 40; i++) tick(input({}));
  check('hero: on top, he stands on the block with his sword and shield in his paws again', p.grounded && Math.abs(p.position.y - 3) < 0.01 && p.ledge === null && parts.sword.visible && !parts.backSword.visible);
}

// ---- The hero, fallen: his tail lies on the floor (it used to hang down through it and be gone) ----
{
  const rat = new RatModel();
  rat.setTransform(at, 0);
  for (let i = 0; i < 150; i++) rat.update(DT, { state: 'dead', planarSpeed: 0, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0, verticalSpeed: 0, flipProgress: 0, armed: true, stowProgress: -1, plungeStage: 0 });
  rat.root.updateMatrixWorld(true);
  const tail = (rat as unknown as { tailSegments: THREE.Object3D[] }).tailSegments.map((seg) => seg.getWorldPosition(new THREE.Vector3()));
  const end = tail[tail.length - 1];
  const low = Math.min(...tail.map((p) => p.y));
  check('hero: fallen, his tail is laid out along the floor towards his feet', low > -0.03 && Math.max(...tail.map((p) => p.y)) < 0.12 && end.z > 0.3, `lowest ${low.toFixed(2)}; its end ${end.y.toFixed(2)} up, ${end.z.toFixed(2)} towards his feet`);
}

// ---- The hero's plunge and wall moves: what is drawn matches what he is doing ----
{
  const input = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
  const fwd = new THREE.Vector3(0, 0, 1);
  const make = (wall: boolean) => {
    const colliders = [makeAabb(0, -0.5, 0, 400, 1, 400)];
    if (wall) colliders.push(makeAabb(0, 4, 2.6, 6, 8, 1));
    const p = new PlayerController(new THREE.Vector3(0, 0, 0));
    const rat = new RatModel();
    const tick = (o: Partial<PlayerInput>, frozen = false): void => {
      if (!frozen) p.update(DT, input(o), colliders);
      rat.setTransform(p.position, p.facing);
      rat.update(DT, {
        state: p.state, planarSpeed: Math.hypot(p.velocity.x, p.velocity.z), comboStep: p.comboStep, attackTime: p.attackTime, dodgeKind: p.currentDodgeKind, dodgeProgress: p.dodgeProgress,
        verticalSpeed: p.velocity.y, flipProgress: p.flipProgress, armed: p.armed, stowProgress: p.stowProgress, plungeStage: p.plungeStage, ledge: p.ledge, hangTime: p.hangTime, climbProgress: p.climbProgress, kickProgress: p.kickProgress, onWall: p.onWall,
      });
    };
    for (let i = 0; i < 20; i++) tick({});
    return { p, rat, tick };
  };
  /** Which way the blade points (world), once the pose has settled. */
  const blade = (rat: RatModel, settle: () => void): THREE.Vector3 => {
    for (let i = 0; i < 40; i++) settle();
    rat.root.updateMatrixWorld(true);
    const sword = (rat as unknown as { sword: THREE.Object3D }).sword;
    return sword.localToWorld(new THREE.Vector3(0, 0, 1)).sub(sword.localToWorld(new THREE.Vector3(0, 0, 0))).normalize();
  };
  const feet = (rat: RatModel): THREE.Vector3[] => {
    rat.root.updateMatrixWorld(true);
    const parts = rat as unknown as { footS: THREE.Object3D; footH: THREE.Object3D };
    return [parts.footS, parts.footH].map((f) => f.getWorldPosition(new THREE.Vector3()));
  };
  {
    const { p, rat, tick } = make(false);
    tick({ jumpPressed: true, jumpHeld: true });
    for (let i = 0; i < 20; i++) tick({ jumpHeld: true });
    tick({ attackPressed: true });
    {
      // The beat he hangs in the air: the sword is up over his head (its tip well clear of his ears), not in front of his face.
      const up = blade(rat, () => tick({}, true));
      const sword = (rat as unknown as { sword: THREE.Object3D }).sword;
      const tip = sword.localToWorld(new THREE.Vector3(0, 0, 0.4)).y - p.position.y;
      check('hero: winding up a plunge, the sword is raised over his head, blade up', p.plungeStage === 1 && up.y > 0.6 && tip > 1.25, `blade ${up.y.toFixed(2)} up, tip ${tip.toFixed(2)} above his feet`);
    }
    for (let i = 0; i < 200 && p.plungeStage !== 2; i++) tick({});
    const dive = blade(rat, () => tick({}, true));
    check('hero: diving in a plunge, the sword points straight down under him', p.plungeStage === 2 && dive.y < -0.9, `blade ${dive.x.toFixed(2)}, ${dive.y.toFixed(2)}, ${dive.z.toFixed(2)}`);
    for (let i = 0; i < 200 && p.plungeStage !== 3; i++) tick({});
    const land = blade(rat, () => tick({}, true));
    check('hero: landed, the sword stands point-down on the ground in front of him (it used to lie along the floor)', p.plungeStage === 3 && land.y < -0.85, `blade ${land.x.toFixed(2)}, ${land.y.toFixed(2)}, ${land.z.toFixed(2)}`);
  }
  {
    const { p, rat, tick } = make(true);
    tick({ move: fwd, jumpPressed: true, jumpHeld: true });
    let braced = false;
    let i = 0;
    for (; i < 120 && !braced; i++) {
      tick({ move: fwd, jumpHeld: true });
      braced = p.onWall;
    }
    for (let k = 0; k < 4; k++) tick({ move: fwd, jumpHeld: true });
    const onWall = feet(rat);
    check('hero: in the air against a wall he faces, the game says so and his feet come up onto it', braced && p.onWall && onWall.every((f) => f.z > p.position.z + 0.12 && f.y > p.position.y + 0.12), onWall.map((f) => `${(f.z - p.position.z).toFixed(2)} ahead, ${(f.y - p.position.y).toFixed(2)} up`).join('; '));
    tick({ move: fwd, jumpPressed: true, jumpHeld: true });
    const kicked = p.kickProgress >= 0;
    for (let k = 0; k < 4; k++) tick({ jumpHeld: true });
    const pushing = feet(rat);
    // He has turned to face away from the wall: his legs are driven out behind him, towards it.
    const behind = pushing.every((f) => (f.z - p.position.z) * Math.cos(p.facing) + (f.x - p.position.x) * Math.sin(p.facing) < -0.08);
    check('hero: kicking off it, he turns away and his legs drive out behind him towards the wall', kicked && !p.onWall && Math.cos(p.facing) < -0.9 && behind, pushing.map((f) => (f.z - p.position.z).toFixed(2)).join(', '));
    for (let k = 0; k < 30; k++) tick({ jumpHeld: true });
    check('hero: the push is over in a quarter of a second', p.kickProgress === -1);
  }
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
