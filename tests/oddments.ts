// Odds and ends about the levels (levels/oddments.ts, 2026-11-19): each where it was put, on the floor, inside nothing
// else, and out of everyone's way.
import './../src/core/colorSetup';
import { levelById } from '../src/levels/levels';
import { ODDMENTS, oddmentsIn } from '../src/levels/oddments';
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

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
