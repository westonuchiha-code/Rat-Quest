// The creature models (roach, toad, ironback, bat, the Club's folk and Grimsqueak): each one builds, plays every one of
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
import { RatModel } from '../src/player/ratModel';
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

// ---- The Club's folk and the king ----
{
  const tall: Record<NpcKind, [number, number]> = { mouse: [1.2, 1.7], bird: [1.2, 1.6], pigeon: [1.5, 2.1], villain: [2.3, 3.2] };
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

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
