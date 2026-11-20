// Odds and ends about the levels (levels/oddments.ts, 2026-11-19): each where it was put, on the floor, inside nothing
// else, and out of everyone's way.
import './../src/core/colorSetup';
import { levelById } from '../src/levels/levels';
import { ODDMENTS, oddmentsIn } from '../src/levels/oddments';
import * as THREE from 'three';
import { buildChamber } from '../src/world/chamber';
import { groundUnder } from '../src/world/lifting';
import { JUNK, junkSolids } from '../src/world/layout';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

let count = 0;
for (const id of Object.keys(ODDMENTS)) {
  const def = levelById(id);
  if (!def) {
    check(`${id}: is a room`, false);
    continue;
  }
  const mine = oddmentsIn(def);
  count += mine.length;
  check(
    `${id}: its ${mine.length} odds and ends are in it once, drawn and solid`,
    mine.every(([what, x, y, z]) => def.decor.filter((d) => d.kind === 'junk' && d.what === what && d.x === x && d.y === y && d.z === z).length === 1)
      && mine.every(([what, x, y, z, yaw]) => def.solids.some((b) => b.hidden && Math.abs(b.x0 - junkSolids(what, x, y, z, yaw)[0].x0) < 1e-9 && Math.abs(b.z0 - junkSolids(what, x, y, z, yaw)[0].z0) < 1e-9))
  );
  // The room without them, to measure them against.
  const own = new Set(mine.map(([what, x, y, z, yaw]) => JSON.stringify(junkSolids(what, x, y, z, yaw)[0])));
  const solids = def.solids.filter((b) => !own.has(JSON.stringify(b)));
  const ch = buildChamber({ solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers ?? [] } as never);
  const bad: string[] = [];
  for (const [what, x, y, z] of mine) {
    const J = JUNK[what];
    const half = Math.max(J.w, J.d) / 2;
    // On the floor: flat under all of it, at the height given.
    for (const [dx, dz] of [[0, 0], [-half, -half], [half, -half], [-half, half], [half, half]]) {
      const g = groundUnder(ch.colliders, x + dx, z + dz, 0.05, y + 0.5);
      if (Math.abs(g - y) > 0.02) bad.push(`${what} at ${x},${z}: the floor under a corner is at ${g.toFixed(2)}, not ${y}`);
    }
    // Inside nothing.
    const hit = ch.colliders.find((b) => b.max.y > y + 0.02 && b.min.y < y + J.h && b.max.x > x - half && b.min.x < x + half && b.max.z > z - half && b.min.z < z + half);
    if (hit) bad.push(`${what} at ${x},${z} is inside something`);
    // Not in water, lava, fire or a pit.
    for (const w of [...(def.water ?? []), ...(def.lava ?? []), ...(def.fire ?? []), ...(def.pit ? [def.pit] : [])] as Array<{ x0: number; x1: number; z0: number; z1: number }>) {
      if (x > w.x0 - 1 && x < w.x1 + 1 && z > w.z0 - 1 && z < w.z1 + 1) bad.push(`${what} at ${x},${z} is in water, lava, fire or a pit`);
    }
  }
  check(`${id}: each lies flat on the floor, inside nothing, out of water, lava, fire and pits`, bad.length === 0, bad.join('; '));
  // Out of everyone's way.
  const things: Array<{ x: number; z: number }> = [...(def.npcs ?? []), ...def.collectibles, ...def.gear, ...(def.courseDoors ?? []).map((c) => c.door), ...def.enemies, ...(def.plates ?? []), def.exit, ...(def.wedges ?? [])].filter((q) => q && Number.isFinite((q as { x: number }).x)) as never;
  const near = mine.filter(([, x, , z]) => things.some((q) => Math.hypot(q.x - x, q.z - z) < 3.5));
  check(`${id}: none is on a character, a pickup, a door, a creature or a button`, near.length === 0, near.map(([w, x, , z]) => `${w} ${x},${z}`).join('; '));
  // Out of the fights: well away from where each creature starts (a fight moves about), and outside any space one
  // keeps to (a firefly's air, a ward). (The Keep's chess pawn first stood in the ward, and the ant pikemen's trap
  // and the firefly's bombs no longer worked there: tests/ant.ts, tests/firefly.ts.)
  const inFight = mine.filter(([, x, , z]) => def.enemies.some((e) => {
    const ar = (e as { arena?: { x0: number; x1: number; z0: number; z1: number } }).arena;
    return Math.hypot(e.x - x, e.z - z) < 8 || (!!ar && x > ar.x0 - 2 && x < ar.x1 + 2 && z > ar.z0 - 2 && z < ar.z1 + 2);
  }));
  check(`${id}: none is where a creature fights`, inFight.length === 0, inFight.map(([w, x, , z]) => `${w} ${x},${z}`).join('; '));
  const close = Math.min(...mine.map(([, x, , z]) => Math.hypot(x - def.spawn.x, z - def.spawn.z)));
  check(`${id}: he starts clear of them`, close > 4, `${close.toFixed(1)} m`);
}
check('in all, a few dozen about the levels', count >= 40, `${count}`);

// ---- What they do (2026-11-19) ----
{
  const ch = buildChamber({ solids: [], pit: null, water: [], movers: [], decor: [
    { kind: 'junk', what: 'matchbox', x: 0, y: 0, z: 0, yaw: 0 },
    { kind: 'junk', what: 'battery', x: 10, y: 0, z: 0, yaw: 0 },
  ] } as never);
  const moving: THREE.Object3D[] = [];
  ch.group.traverse((o) => { if (o.userData.moves) moving.push(o); });
  // (A match is a little group of two: its stick and its head. The battery's roll is a group too, of more.)
  const matches = moving.filter((o) => o.type === 'Group' && o.children.length === 2);
  // (Rounded to a ten-thousandth, and never a minus nought: a rattle that has died away leaves a millionth or less.)
  const r4 = (v: number): number => Math.round(v * 1e4) / 1e4 + 0;
  const where = (): string => matches.map((m) => `${r4(m.position.y)},${r4(m.rotation.y)}`).join(' ');
  ch.update(1);
  const still = where();
  check('a thump far off is not felt', ch.thump(8, 0, 8, 1).length === 0);
  check('...one beside a matchbox is, and says it was a matchbox (for its sound)', ch.thump(1, 0, 0.5, 1).join() === 'matchbox');
  ch.update(1.05);
  const shaken = where();
  ch.update(4);
  check('a matchbox\'s six matches rattle when he lands beside it, then settle as they were', matches.length === 6 && shaken !== still && where() === still, `${matches.length} matches`);
  const spark = moving.find((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.type === 'OctahedronGeometry');
  let shown = 0;
  for (let t = 0; t < 20; t += 0.02) {
    ch.update(t);
    if (spark?.visible) shown++;
  }
  check('a battery sparks now and then: seen, but not for long', !!spark && shown > 0 && shown < 100, `${shown} of 1000 moments`);
}
{
  // A die and a marble, each turned, and a landing to the west of each: both move away from him (east), and settle.
  const ch = buildChamber({ solids: [], pit: null, water: [], movers: [], decor: [
    { kind: 'junk', what: 'die', x: 0, y: 0, z: 0, yaw: 0.7 },
    { kind: 'junk', what: 'marble', x: 10, y: 0, z: 0, yaw: -1.2 },
  ] } as never);
  const joints: THREE.Object3D[] = [];
  ch.group.traverse((o) => { if (o.userData.moves && o.type === 'Group' && o.parent?.parent === ch.group) joints.push(o); });
  // (Each object's top, in the room: the die's top face, the marble's top.)
  const topOf = (j: THREE.Object3D): THREE.Vector3 => {
    j.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(j);
    return new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
  };
  ch.update(2);
  const before = joints.map(topOf);
  check('a die and a marble each answer a landing beside them', joints.length === 2 && ch.thump(-1.2, 0, 0, 1).join() === 'die' && ch.thump(8.8, 0, 0, 1).join() === 'marble', `${joints.length} moving joints`);
  const eastward = [0, 0];
  const westward = [0, 0];
  for (let t = 2; t < 2.6; t += 0.02) {
    ch.update(t);
    joints.forEach((j, i) => {
      eastward[i] = Math.max(eastward[i], topOf(j).x - before[i].x);
      westward[i] = Math.max(westward[i], before[i].x - topOf(j).x);
    });
  }
  check('...each moves AWAY from where he landed (the die tips, the marble rolls), however it is turned, and not toward him', eastward[0] > 0.02 && eastward[1] > 0.02 && westward[0] < eastward[0] / 4 && westward[1] < 0.01 + eastward[1], `away ${eastward.map((e) => e.toFixed(3)).join(', ')}; toward ${westward.map((e) => e.toFixed(3)).join(', ')}`);
  ch.update(6);
  const after = joints.map(topOf);
  check('...and settles back just as it was', after.every((p, i) => p.distanceTo(before[i]) < 1e-3), after.map((p, i) => p.distanceTo(before[i]).toFixed(4)).join(', '));
  // The hardest landing, right beside it: the marble's middle never goes more than a fifth of its width from its place.
  const ball = joints[1];
  ch.thump(9.9, 0, 0, 1);
  let far = 0;
  for (let t = 6; t < 9; t += 0.01) {
    ch.update(t);
    far = Math.max(far, Math.hypot(ball.position.x, ball.position.z));
  }
  check('...the marble never rolls further than a fifth of its width, even landed on hard right beside it (it stays inside its solid)', far > 0.05 && far <= JUNK.marble.w / 5 + 1e-9, `${far.toFixed(3)} of ${(JUNK.marble.w / 5).toFixed(3)}`);
}
{
  // A cotton reel rocks on its rim; a teacup's tea slops and the cup rattles. Both settle level again.
  const ch = buildChamber({ solids: [], pit: null, water: [], movers: [], decor: [
    { kind: 'junk', what: 'spool', x: 0, y: 0, z: 0, yaw: 0.3 },
    { kind: 'junk', what: 'teacup', x: 10, y: 0, z: 0, yaw: 2 },
  ] } as never);
  const reel = ch.group.children.find((o) => o.position.x === 0 && o.type === 'Group')!.children.find((o) => o.userData.moves)!;
  const cup = ch.group.children.find((o) => o.position.x === 10 && o.type === 'Group')!;
  let tea: THREE.Mesh | null = null;
  cup.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry.type === 'CircleGeometry' && o.userData.moves) tea = m; });
  const tilt = (o: THREE.Object3D): number => 2 * Math.acos(Math.min(1, Math.abs(o.quaternion.w)));
  ch.update(3);
  check('a cotton reel and a teacup each answer a landing beside them', !!reel && !!tea && ch.thump(-1.2, 0, 0, 1).join() === 'spool' && ch.thump(8.8, 0, 0, 1).join() === 'teacup');
  let reelMost = 0;
  let teaMost = 0;
  for (let t = 3; t < 3.8; t += 0.02) {
    ch.update(t);
    reelMost = Math.max(reelMost, tilt(reel));
    teaMost = Math.max(teaMost, tilt(tea!));
  }
  check('...the reel rocks on its rim (less than a die does), the tea slops', reelMost > 0.03 && reelMost < 0.3 && teaMost > 0.03, `reel ${reelMost.toFixed(3)}, tea ${teaMost.toFixed(3)} radians`);
  ch.update(8);
  check('...and both settle level again', tilt(reel) < 1e-6 && tilt(tea!) < 1e-6);
}
{
  // A spoon rocks on its bowl, its handle tapping; a sardine tin's curled lid wobbles on its key. Both settle.
  const ch = buildChamber({ solids: [], pit: null, water: [], movers: [], decor: [
    { kind: 'junk', what: 'spoon', x: 0, y: 0, z: 0, yaw: 0 },
    { kind: 'junk', what: 'sardines', x: 10, y: 0, z: 0, yaw: 1 },
  ] } as never);
  const movers: THREE.Object3D[] = [];
  ch.group.traverse((o) => { if (o.userData.moves && o.type === 'Group') movers.push(o); });
  ch.update(3);
  check('a spoon and a sardine tin each answer a landing beside them, and say which they are', movers.length === 2 && ch.thump(-1.5, 0, 0, 1).join() === 'spoon' && ch.thump(8.5, 0, 0, 1).join() === 'sardines', `${movers.length} moving parts`);
  const most = [0, 0];
  for (let t = 3; t < 3.8; t += 0.01) {
    ch.update(t);
    movers.forEach((m, i) => { most[i] = Math.max(most[i], Math.abs(m.rotation.z)); });
  }
  check('...the spoon\'s handle lifts and taps, the lid wobbles', most[0] > 0.02 && most[1] > 0.05, most.map((m) => m.toFixed(3)).join(', '));
  ch.update(8);
  check('...and both lie still again', movers.every((m) => m.rotation.z === 0));
}
{
  // A chess pawn rocks on its foot; a battery rolls a little across its length and back.
  const ch = buildChamber({ solids: [], pit: null, water: [], movers: [], decor: [
    { kind: 'junk', what: 'pawn', x: 0, y: 0, z: 0, yaw: 0 },
    { kind: 'junk', what: 'battery', x: 10, y: 0, z: 0, yaw: 0 },
  ] } as never);
  const joints: THREE.Object3D[] = [];
  ch.group.traverse((o) => { if (o.userData.moves && o.type === 'Group' && o.parent?.parent === ch.group) joints.push(o); });
  ch.update(3);
  check('a chess pawn and a battery each answer a landing beside them', joints.length === 2 && ch.thump(0, 0, -1.2, 1).join() === 'pawn' && ch.thump(10, 0, -1.2, 1).join() === 'battery', `${joints.length} moving joints`);
  let tip = 0;
  let roll = 0;
  for (let t = 3; t < 4; t += 0.01) {
    ch.update(t);
    tip = Math.max(tip, 2 * Math.acos(Math.min(1, Math.abs(joints[0].quaternion.w))));
    roll = Math.max(roll, joints[1].position.z);
  }
  check('...the pawn rocks (less than a die), the battery rolls away from him, no further than a sixth of its width', tip > 0.02 && tip < 0.5 && roll > 0.02 && roll <= JUNK.battery.d / 6 + 1e-9, `pawn ${tip.toFixed(3)} radians, battery ${roll.toFixed(3)} of ${(JUNK.battery.d / 6).toFixed(3)}`);
  ch.update(8);
  check('...and both lie as they were', joints[0].quaternion.w === 1 && joints[1].position.z === 0 && joints[1].rotation.x === 0);
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
