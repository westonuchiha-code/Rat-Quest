// Things to throw in every test room (BACKLOG B1, 2026-11-17): the heaps of pots and rocks by each room's way in.
import './../src/core/colorSetup';
import { levelById, LEVELS, TEST_ROOMS, ARCHIVE } from '../src/levels/levels';
import { ROOMS, BOSS_ROOMS } from '../src/levels/testRooms';
import { LYING, lyingIn } from '../src/levels/throwables';
import { buildChamber } from '../src/world/chamber';
import { groundUnder } from '../src/world/lifting';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

check('every numbered test room has its two heaps', ROOMS.every((r) => LYING[r.id]), ROOMS.filter((r) => !LYING[r.id]).map((r) => r.id).join(', '));
check(
  '...and every side area of a numbered room (but the Leap of Faith, which starts on a narrow ledge), and every boss room (but the Sump Wyrm room, whose floor is kept clear for its charges), has them too',
  [...TEST_ROOMS, ...LEVELS, ...ARCHIVE].filter((l) => /^Test Room \d+[A-Z]$/.test(l.name)).every((l) => LYING[l.id] || l.id === 'faith' || l.id === 'sump')
    && BOSS_ROOMS.every((b) => LYING[b.id] || b.id === 'sump')
);
for (const r of Object.keys(LYING).map((id) => ({ id }))) {
  const def = levelById(r.id)!;
  const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water ?? [], decor: [], movers: def.movers });
  const mine = ch.crates.filter((c) => (c.type === 'pot' || c.type === 'rock') && lyingIn(def).some(([, x, z]) => Math.abs(c.x - x) < 0.01 && Math.abs(c.z - z) < 0.01));
  check(`${r.id}: three pots and two rocks, put in once`, mine.length === 5 && mine.filter((c) => c.type === 'pot').length === 3, `${mine.length}`);
  check(`${r.id}: nothing is hidden in them that the room meant for something else`, mine.every((c) => !def.crateContents[c.index]));
  const bad: string[] = [];
  for (const c of mine) {
    // On the floor: the ground under it (not counting itself) is where it stands.
    const g = groundUnder(ch.colliders, c.x, c.z, c.half * 0.9, c.aabb.min.y + 0.05, c.aabb);
    if (Math.abs(g - c.aabb.min.y) > 0.02) bad.push(`${c.type} at ${c.x.toFixed(1)},${c.z.toFixed(1)} floats ${(c.aabb.min.y - g).toFixed(2)}`);
    // Inside nothing else: no other solid shares its space.
    const hit = ch.colliders.find((b) => b !== c.aabb && b.max.y > c.aabb.min.y + 0.02 && b.min.y < c.aabb.max.y - 0.02 && b.max.x > c.aabb.min.x + 0.02 && b.min.x < c.aabb.max.x - 0.02 && b.max.z > c.aabb.min.z + 0.02 && b.min.z < c.aabb.max.z - 0.02);
    if (hit) bad.push(`${c.type} at ${c.x.toFixed(1)},${c.z.toFixed(1)} is inside something`);
  }
  check(`${r.id}: each stands on the floor and inside nothing`, bad.length === 0, bad.join('; '));
  // Out of everyone's way: not on a character, a door, a pickup or a creature.
  const things: { x: number; z: number }[] = [...(def.npcs ?? []), ...def.collectibles, ...def.gear, ...(def.courseDoors ?? []), ...def.enemies] as never;
  const near = mine.filter((c) => things.some((q) => Number.isFinite(q.x) && Math.hypot(q.x - c.x, q.z - c.z) < 1.5));
  check(
    `${r.id}: none stands on a character, a door, a pickup or a creature`,
    near.length === 0,
    near.map((c) => `${c.type} ${c.x.toFixed(1)},${c.z.toFixed(1)}`).join('; ')
  );
  // Not on his way in: he starts clear of them all.
  const close = Math.min(...mine.map((c) => Math.hypot(c.x - def.spawn.x, c.z - def.spawn.z)));
  check(`${r.id}: he starts clear of them`, close > 1.8, `${close.toFixed(1)} m`);
}

console.log(failures ? `throwables: ${failures} FAIL` : 'throwables: all pass');
if (failures) process.exitCode = 1;
