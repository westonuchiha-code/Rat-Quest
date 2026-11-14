// Breakable crates: a sword swing or a plunge breaks them, the collider goes, and the pieces settle then vanish.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { Debris } from '../src/world/debris';
import { buildChamber } from '../src/world/chamber';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}
const newEvents = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });

const chamber = buildChamber();
check('the room has crates', chamber.crates.length >= 3, `n=${chamber.crates.length}`);
const crate = chamber.crates[0];
const other = chamber.crates[chamber.crates.length - 1];

// A sword swing at a crate right in front of him.
const p = new PlayerController(new THREE.Vector3(crate.x, 0, crate.z - 1.3));
p.water = chamber.water;
for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
p.facing = 0;
const before = chamber.colliders.length;
const ev = newEvents();
let broke = false;
p.update(DT, input({ attackPressed: true }), chamber.colliders);
for (let i = 0; i < 40 && !broke; i++) {
  p.update(DT, input(), chamber.colliders);
  resolveCombat(p, [], ev, chamber.crates);
  if (ev.cratesBroken.length) {
    broke = true;
    chamber.breakCrate(ev.cratesBroken[0]);
  }
}
check('a sword swing breaks the crate in front', broke && !crate.alive);
check('its collider is gone', chamber.colliders.length === before - 1);
check('a crate far away is untouched', other.alive || other === crate);
check('a crate cannot be broken twice', (() => {
  const e2 = newEvents();
  resolveCombat(p, [], e2, chamber.crates);
  return !e2.cratesBroken.includes(crate);
})());

// Debris: flies, lands above the floor, then vanishes.
const scene = new THREE.Group();
const debris = new Debris(scene, () => 0);
debris.burst(crate.x, crate.y, crate.z, crate.half, p.position.x, p.position.z);
check('breaking throws out pieces', debris.count >= 8 && scene.children.length === debris.count, `n=${debris.count}`);
let t = 0;
let lowest = Infinity;
for (; t < 2.5; t += DT) {
  debris.update(DT);
  for (const c of scene.children) lowest = Math.min(lowest, c.position.y);
}
check('pieces never sink into the floor', lowest >= 0.01, `lowest=${lowest.toFixed(3)}`);
const rested = scene.children.every((c) => Math.abs(c.position.y - 0.04) < 0.1);
check('pieces lie flat on the floor', rested);
check('they are still there after 2.5 s', debris.count > 0);
for (; t < 5.4; t += DT) debris.update(DT);
check('and are all gone after 5 s', debris.count === 0 && scene.children.length === 0, `left=${debris.count}`);

// A plunge landing next to a crate breaks it.
const c2 = chamber.crates.find((c) => c.alive && c !== crate);
if (c2) {
  const q = new PlayerController(new THREE.Vector3(c2.x + 1.4, 3, c2.z));
  q.water = chamber.water;
  const e3 = newEvents();
  q.update(DT, input(), chamber.colliders);
  q.update(DT, input({ attackPressed: true }), chamber.colliders);
  let hit = false;
  for (let i = 0; i < 120 && !hit; i++) {
    q.update(DT, input(), chamber.colliders);
    resolveCombat(q, [], e3, chamber.crates);
    if (e3.cratesBroken.includes(c2)) hit = true;
  }
  check('a plunge landing breaks a crate beside it', hit);
}

// Standing on a crate and swinging must not break the crate underneath him.
{
  const room = buildChamber({
    solids: [{ kind: 'floor', x0: -10, x1: 10, y0: -1, y1: 0, z0: -10, z1: 10 }, { kind: 'rubble', x0: -0.5, x1: 0.5, y0: 0, y1: 1, z0: -0.5, z1: 0.5 }],
    pit: null,
    water: [],
  });
  const under = room.crates[0];
  const q = new PlayerController(new THREE.Vector3(0, 1, 0));
  for (let i = 0; i < 20; i++) q.update(DT, input(), room.colliders);
  let hit = false;
  q.update(DT, input({ attackPressed: true }), room.colliders);
  for (let i = 0; i < 40; i++) {
    q.update(DT, input(), room.colliders);
    const e4 = newEvents();
    resolveCombat(q, [], e4, room.crates);
    if (e4.cratesBroken.length) hit = true;
  }
  check('he is standing on the crate', q.grounded && Math.abs(q.position.y - 1) < 0.05);
  check('swinging does not break the crate under him', !hit && under.alive);
}

console.log(failures === 0 ? '\nCrate checks passed.' : `\n${failures} crate check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
