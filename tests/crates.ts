// Breakable crates: a sword swing or a plunge breaks them, the collider goes, and the pieces settle then vanish.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { Debris } from '../src/world/debris';
import { sfx } from '../src/audio/synth';
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

// Debris: the crate comes apart into its own boards, which fly, knock on the floor, lie flat, then vanish.
const scene = new THREE.Group();
const debris = new Debris(scene, () => 0);
debris.burst(crate.x, crate.y, crate.z, crate.half, p.position.x, p.position.z);
check('breaking throws out pieces', debris.count >= 8 && scene.children.length === debris.count, `n=${debris.count}`);
{
  // Where each piece starts: on the crate it came from, not scattered about.
  const far = scene.children.map((c) => Math.max(Math.abs(c.position.x - crate.x), Math.abs(c.position.y - crate.y), Math.abs(c.position.z - crate.z)));
  check('every piece starts on the crate it came from', Math.max(...far) <= crate.half * 1.02, `furthest ${Math.max(...far).toFixed(2)} of ${crate.half}`);
  // What each board shows: one strip of the crate's picture (a frame board or a plank), never a tiny whole crate.
  const boards = (scene.children as THREE.Mesh[]).filter((m) => m.geometry.attributes.uv && (m.material as THREE.ShaderMaterial).uniforms.tex.value.image.width === 64);
  let widest = 0;
  for (const m of boards) {
    const uv = m.geometry.attributes.uv;
    let v0 = 1; let v1 = 0;
    const nrm = m.geometry.attributes.normal;
    // (Its broad faces; the snapped ends show bare wood from elsewhere in the picture.)
    for (let i = 0; i < uv.count; i++) if (Math.abs(nrm.getY(i)) > 0.7) { v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i)); }
    widest = Math.max(widest, v1 - v0);
  }
  check('each board shows one strip of the crate, not a little whole crate', boards.length >= 12 && widest <= 0.3, `${boards.length} boards, tallest strip ${widest.toFixed(2)} of the picture`);
  const lens = boards.map((m) => { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox!; return b.max.x - b.min.x; });
  check('the boards are of several lengths, long frame boards among them', Math.max(...lens) > 0.85 && Math.min(...lens) < 0.45, `${Math.min(...lens).toFixed(2)}..${Math.max(...lens).toFixed(2)}`);
}
let t = 0;
let lowest = Infinity;
let dipped = Infinity;
let knocks = 0;
const box = new THREE.Box3();
for (; t < 2.5; t += DT) {
  debris.update(DT);
  knocks += debris.takeKnocks();
  scene.updateMatrixWorld(true);
  for (const c of scene.children) {
    lowest = Math.min(lowest, c.position.y);
    dipped = Math.min(dipped, box.setFromObject(c, true).min.y);
  }
}
check('pieces never sink into the floor', lowest >= 0.01, `lowest=${lowest.toFixed(3)}`);
check('...and no end of a tumbling board dips under it either', dipped >= -0.02, `lowest corner ${dipped.toFixed(3)}`);
const rested = scene.children.every((c) => Math.abs(c.position.y - 0.04) < 0.1);
check('pieces lie flat on the floor', rested);
check('each board knocks once as it lands', knocks >= 12 && knocks <= scene.children.length, `${knocks} knocks from ${scene.children.length} boards`);
check('they are still there after 2.5 s', debris.count > 0);
check('the splinters are gone by then, the boards are not', debris.count < 20);
for (; t < 5.4; t += DT) debris.update(DT);
check('and are all gone after 5 s', debris.count === 0 && scene.children.length === 0, `left=${debris.count}`);
{
  // A barrel comes apart into staves, hoops and the two halves of its lid.
  debris.burst(0, 0.6, 0, 0.5, 2, 0, 'barrel');
  const n = debris.count;
  let low = Infinity;
  for (let k = 0; k < 150; k++) {
    debris.update(DT);
    scene.updateMatrixWorld(true);
    for (const c of scene.children) low = Math.min(low, box.setFromObject(c, true).min.y);
  }
  check('a barrel bursts into staves, hoops and lid, and they stay above the floor too', n >= 14 && low >= -0.02, `${n} pieces, lowest corner ${low.toFixed(3)}`);
  debris.clear();
}
{
  // The sound: a crate smash used to be the quietest sound in the game, lost under the sword's own hit.
  const rms = (name: Parameters<typeof sfx>[0]): number => { const d = sfx(name).data; let q = 0; for (const v of d) q += v * v; return Math.sqrt(q / d.length); };
  check('a crate breaking is louder than the blow that broke it', rms('crate') > rms('hit') * 1.3 && rms('barrel') > rms('hit') * 1.3, `crate ${rms('crate').toFixed(2)}, barrel ${rms('barrel').toFixed(2)}, hit ${rms('hit').toFixed(2)}`);
  check('...without being flattened into a buzz', rms('crate') < 0.32 && rms('barrel') < 0.34);
  check('a landing board has its own short knock', sfx('plank').data.length / sfx('plank').rate < 0.2);
}

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
