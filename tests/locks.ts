// PARTS FOR BUILDING LEVELS (world/locks.ts; the Lockworks, Test Room 20: levels/lockworks.ts, 2026-11-25): a weight
// plate that is down only while something is on it, a key that is carried and thrown and never breaks, a locked gate
// the key opens, and checkpoints.
import './../src/core/colorSetup';
import { CHECKPOINT, LOCK, ONE_WAY, WEIGHT, checkpointAt, keyAt, oneWay, weightOn } from '../src/world/locks';
import { levelById } from '../src/levels/levels';
import { ROOMS } from '../src/levels/testRooms';
import { buildChamber } from '../src/world/chamber';
import { LOCKWORKS as L } from '../src/levels/lockworks';
import { ROUND } from '../src/levels/round';
import { DROP } from '../src/world/platforms';
import { feelOf } from '../src/data/feel';
import { maxRunJumpDistance } from '../src/levels/jumpMath';
import { THROWN_AS } from '../src/world/lifting';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = levelById('lockworks')!;
const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: def.movers ?? [], gates: def.gates } as never);
const crate = ch.crates.find((c) => c.type === 'crate')!;
const key = ch.crates.find((c) => c.type === 'key')!;
const plate = def.plates!.find((p) => p.weight)!;

// ---- The room ----
check('the Lockworks is Test Room 20, with a door in the Hall, and asks nothing of him (a shelf of parts)', !!def && def.goals.length === 0 && ROOMS.some((r) => r.id === 'lockworks' && r.n === 20));
check('in it: a crate, a key, a weight plate, a gate the plate holds (and that shuts again), a locked gate, two lanterns',
  !!crate && !!key && !!plate
    && def.gates!.some((g) => g.shut && (g.plates ?? []).includes(def.plates!.indexOf(plate)))
    && def.gates!.some((g) => g.locked)
    && def.checkpoints!.length === 2);
check('the key is behind the weight gate, the prize behind the locked one, and the crate on the near side with the plate',
  key.z < L.wallZ && key.x < 0 && L.prize.z < L.wallZ && L.prize.x > 0 && crate.z > L.wallZ && plate.z > L.wallZ);

// ---- The weight plate ----
{
  const at = { x: plate.x, y: plate.y, z: plate.z };
  check('WEIGHT PLATE: with nothing on it, it is up', !weightOn(at, null, ch.crates));
  check('...he stands on it: down. He steps off: up. In the air over it: up', weightOn(at, { x: at.x + 0.3, y: 0, z: at.z }, ch.crates) && !weightOn(at, { x: at.x + WEIGHT.reach + 0.2, y: 0, z: at.z }, ch.crates) && !weightOn(at, null, ch.crates));
  ch.setCrate(crate, at.x, crate.y, at.z);
  check('...the crate set down on it holds it down with him gone', weightOn(at, null, ch.crates));
  crate.lifted = true;
  check('...and lifted off it again (in his hands), it comes up', !weightOn(at, null, ch.crates));
  crate.lifted = false;
  ch.setCrate(crate, L.crate.x, crate.y, L.crate.z);
  ch.setCrate(key, at.x, key.y, at.z);
  check('...a key set on it holds it too (anything he can carry does)', weightOn(at, null, ch.crates));
  ch.setCrate(key, L.key.x, key.y, L.key.z);
}

// ---- The key and the lock ----
{
  const gate = def.gates!.find((g) => g.locked)!;
  const at = { x: gate.x, y: gate.y ?? 0, z: gate.z };
  check('THE KEY is carried as a rock is: light, and it never breaks', THROWN_AS.key.light && !THROWN_AS.key.breaks && !!key.home);
  check('LOCKED GATE: with the key where it lies, it stays locked', keyAt(at, ch.crates) === null);
  ch.setCrate(key, at.x, key.y, at.z + LOCK.reach - 0.3);
  check('...the key brought to it (set down, carried or flying) opens it', keyAt(at, ch.crates) === key);
  key.lifted = true;
  check('...in his hands too', keyAt(at, ch.crates) === key);
  key.lifted = false;
  ch.setCrate(crate, at.x, crate.y, at.z + 0.5);
  ch.setCrate(key, L.key.x, key.y, L.key.z);
  check('...and a crate is no key', keyAt(at, ch.crates) === null);
  key.alive = false;
  ch.setCrate(key, at.x, key.y, at.z);
  check('...nor is a key that has been used', keyAt(at, ch.crates) === null);
  key.alive = true;
}

// ---- Checkpoints ----
{
  const pts = def.checkpoints!;
  check('CHECKPOINTS: standing at a lantern is touching it; a step away is not; nor is being a floor above it',
    checkpointAt(pts, { x: pts[0].x + 0.4, y: 0, z: pts[0].z }) === 0
      && checkpointAt(pts, { x: pts[1].x, y: 0.2, z: pts[1].z - 0.5 }) === 1
      && checkpointAt(pts, { x: pts[0].x + CHECKPOINT.reach + 0.3, y: 0, z: pts[0].z }) === -1
      && checkpointAt(pts, { x: pts[0].x, y: CHECKPOINT.rise + 1, z: pts[0].z }) === -1);
  check('one lantern is by the way in, the other behind the weight gate (past the first thing the room teaches)', pts[0].z > L.wallZ && pts[1].z < L.wallZ && pts[1].x < 0);
}

// ---- The shortcut: a gate that opens from one side only ----
{
  const g = def.gates!.find((q) => q.fromSide)!;
  check('THE SHORTCUT is a gate out of the key\'s room that opens from inside it (the north side), beside the first lantern', !!g && g.fromSide === 'n' && g.x === L.shortcut && Math.hypot(def.checkpoints![0].x - g.x, def.checkpoints![0].z - g.z) < 12);
  check('...come to from the front (the south), it is barred', oneWay(g, { x: g.x, y: 0, z: g.z + 0.9 }) === 'barred');
  check('...come to from inside (the north), it opens', oneWay(g, { x: g.x + 0.5, y: 0, z: g.z - 0.9 }) === 'open');
  check('...and he must be AT it: a step back, to one side of it, or a floor above, it is neither',
    oneWay(g, { x: g.x, y: 0, z: g.z - ONE_WAY.reach - 0.3 }) === null
      && oneWay(g, { x: g.x + g.width / 2 + 0.6, y: 0, z: g.z - 0.5 }) === null
      && oneWay(g, { x: g.x, y: 3, z: g.z - 0.5 }) === null);
  check('a gate whose width runs the other way has east and west for its sides', oneWay({ x: 0, z: 0, width: 3, alongZ: true, fromSide: 'e' }, { x: 0.8, y: 0, z: 0.4 }) === 'open' && oneWay({ x: 0, z: 0, width: 3, alongZ: true, fromSide: 'e' }, { x: -0.8, y: 0, z: 0 }) === 'barred');
  check('a plain gate is no shortcut', oneWay({ x: 0, z: 0, width: 3 }, { x: 0, y: 0, z: 0.5 }) === null);
}

// ---- THE ROUND (Test Room 21): one place that loops back to its own lantern; and the bridge let down ----
{
  const R = ROUND;
  const d = levelById('round')!;
  const C = R.chasm;
  check('the Round is Test Room 21, plays as the sewers, asks nothing of him, and a fall in it costs a heart and puts him back', !!d && ROOMS.some((r) => r.id === 'round' && r.n === 21) && feelOf(d).id === 'sewers' && d.goals.length === 0 && d.fallBack === true);
  check('its chasm is far wider than he can jump (more than twice a running jump): the long way round is the only way, till the bridge is down', C.z1 - C.z0 > maxRunJumpDistance() * 2, `${C.z1 - C.z0} across; a running jump is ${maxRunJumpDistance().toFixed(1)}`);
  const foes = d.enemies;
  const first = foes.find((e) => e.x === R.first.x && e.z === R.first.z)!;
  const toad = foes.find((e) => e.type === 'toad')!;
  const pair = foes.filter((e) => e.z < C.z0);
  check('TEACH: the first creature is one roach alone on the south bank, with room to back away (nothing else within twelve of it)', !!first && foes.filter((e) => e !== first && Math.hypot(e.x - first.x, e.z - first.z) < 12).length === 0 && first.z > C.z1);
  check('TEST: a toad on a ledge over the west strip, and kept to its ledge', !!toad && (toad.y ?? 0) > 2 && toad.x < C.x0 && !!toad.arena && toad.arena.x1 <= R.ledge.x1);
  const cracks = d.decor.filter((q) => q.kind === 'crackwall') as Array<{ x: number; z: number; w: number }>;
  const safe = cracks.find((q) => q.z > C.z1);
  check('TEACH (the cracked wall): the first he meets shuts a nook on the south bank, out of the toad\'s reach, with a crumb behind it', !!safe && Math.hypot(safe.x - toad.x, safe.z - toad.z) > 13 && d.collectibles.some((q) => q.kind === 'crumb' && q.z > safe.z && q.x < R.nook.x1));
  const crack = cracks.find((q) => q.z < 0);
  check('...and under it the strip is walled across but for a cracked wall he must stand and break, within the toad\'s spit', !!crack && Math.hypot(crack.x - toad.x, crack.z - toad.z) < 10 && crack.z < toad.z && d.solids.filter((b) => b.kind === 'wall' && Math.abs((b.z0 + b.z1) / 2 - R.crack.z) < 0.01).length === 2);
  check('TWIST: two creatures of different kinds together on the north bank, by the catch', pair.length === 2 && pair[0].type !== pair[1].type && Math.hypot(pair[0].x - pair[1].x, pair[0].z - pair[1].z) < 6 && pair.every((e) => Math.hypot(e.x - R.catch.x, e.z - R.catch.z) < 12));
  check('a lantern where he comes in, and one at the north-west corner before the pair', d.checkpoints!.length === 2 && d.checkpoints![0].z > C.z1 && d.checkpoints![1].z < C.z0 && d.checkpoints![1].x < pair[0].x - 8);
  // The bridge.
  const rc = buildChamber({ solids: d.solids, pit: d.pit, water: d.water, decor: d.decor, movers: d.movers ?? [], gates: d.gates } as never);
  const bridge = rc.movers.find((m) => m.spec.motion === 'drop')!;
  const lever = rc.strike!.things.find((t) => t.kind === 'lever')!;
  for (let k = 0; k < 60; k++) rc.stepMovers(1 / 60);
  const hungSolid = bridge.aabb.max.y > -100;
  check('THE BRIDGE hangs up over the chasm on its chains, and is nothing to stand on, till its catch is struck', !!bridge && !!lever && !hungSolid && Math.abs(lever.x - R.catch.x) < 0.01 && lever.z < C.z0);
  lever.on = true;
  for (let k = 0; k < Math.round((DROP.time + 0.2) * 60); k++) rc.stepMovers(1 / 60);
  check('...struck, it comes down and lies from bank to bank, its top level with them, for good', Math.abs(bridge.aabb.max.y) < 0.02 && bridge.aabb.min.z <= C.z0 + 0.01 && bridge.aabb.max.z >= C.z1 - 0.01, `top ${bridge.aabb.max.y.toFixed(2)}, z ${bridge.aabb.min.z} to ${bridge.aabb.max.z}`);
  lever.on = false;
  for (let k = 0; k < 120; k++) rc.stepMovers(1 / 60);
  check('...and stays down whatever becomes of the catch', Math.abs(bridge.aabb.max.y) < 0.02);
  check('it comes down beside the first lantern: the short way back', Math.hypot(R.bridge.x - d.checkpoints![0].x, C.z1 - d.checkpoints![0].z) < 8);
}

console.log(failures === 0 ? 'locks: all passed' : `locks: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
