// PARTS FOR BUILDING LEVELS (world/locks.ts; the Lockworks, Test Room 20: levels/lockworks.ts, 2026-11-25): a weight
// plate that is down only while something is on it, a key that is carried and thrown and never breaks, a locked gate
// the key opens, and checkpoints.
import './../src/core/colorSetup';
import { CHECKPOINT, LOCK, ONE_WAY, WEIGHT, checkpointAt, keyAt, oneWay, weightOn } from '../src/world/locks';
import { levelById } from '../src/levels/levels';
import { ROOMS } from '../src/levels/testRooms';
import { buildChamber } from '../src/world/chamber';
import { LOCKWORKS as L } from '../src/levels/lockworks';
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

console.log(failures === 0 ? 'locks: all passed' : `locks: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
