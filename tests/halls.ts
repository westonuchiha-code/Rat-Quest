// The Cistern's side halls: three doors off the Cistern, each hall leads back, its door is beside where he comes in, its
// wedges can be reached; and across the whole game no two places share a pickup.
import { computeReach } from '../src/levels/reach';
import { LEVELS } from '../src/levels/levels';
import { cistern } from '../src/levels/cistern';
import { cisternWorks, sludgePit } from '../src/levels/cisternHalls';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const c = cistern();
const halls = [cisternWorks(), sludgePit()];
const doors = c.courseDoors ?? [];
check('three side doors lead off the Cistern', doors.length === 3 && ['pumpworks', 'works', 'sludgepit'].every((id) => doors.some((d) => d.to === id)));
check('each hall is in the Cistern\'s world and leads back to it', halls.every((h) => h.world === 'cistern' && h.returnTo === 'cistern'));
check('each hall\'s door back is beside where he comes in', halls.every((h) => Math.hypot(h.exit.x - h.spawn.x, h.exit.z - h.spawn.z) < 8), halls.map((h) => Math.hypot(h.exit.x - h.spawn.x, h.exit.z - h.spawn.z).toFixed(1)).join(', '));
// Each Cistern door stands on ground he can reach.
const cm = computeReach(c);
check('each of the Cistern\'s doors can be walked up to', doors.every((d) => cm.near(d.door.x + Math.sin(d.door.yaw) * 2, (d.door.y ?? 0) + 0.5, d.door.z + Math.cos(d.door.yaw) * 2, 1.2, 1, 1)));
for (const h of halls) {
  const m = computeReach(h);
  const out = (h.wedges ?? []).filter((w) => !m.near(w.x, w.y + 0.5, w.z, 0.9, 1, 1));
  check(`${h.name}: every wedge spot can be reached`, out.length === 0, out.map((w) => w.id).join(', '));
}
check('the Waterworks has its own pickups, not the old hall\'s', cisternWorks().collectibles.every((x) => x.id.startsWith('cworks:')));
check('the tower top holds the wedge now, not a relic', !cisternWorks().collectibles.some((x) => x.kind === 'relic' && Math.abs(x.x) < 0.5 && Math.abs(x.z) < 0.5));
const seen = new Map<string, string>();
const clash: string[] = [];
for (const l of LEVELS) for (const x of l.collectibles) {
  const was = seen.get(x.id);
  if (was && was !== l.id) clash.push(`${x.id} in ${was} and ${l.id}`);
  seen.set(x.id, l.id);
}
check('no two places in the game share a pickup', clash.length === 0, clash.slice(0, 3).join('; '));
const wedgeTotal = LEVELS.reduce((n, l) => n + (l.wedges?.length ?? 0), 0);
check('the game now has 46 Golden Wedges (seven of them gear secrets, one the Broodmother\'s)', wedgeTotal === 46, `${wedgeTotal}`);

console.log(failures === 0 ? 'halls: all pass' : `halls: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
