// Open courses: Golden Wedges appear when their task is done, any one opens the exit, and the climbs are jumpable.
import { GoalTracker } from '../src/levels/goals';
import { cistern, SPIRAL, CHIMNEY_FLOOR } from '../src/levels/cistern';
import { maxRunJumpDistance } from '../src/levels/jumpMath';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const def = cistern();
const counts = { crumb: { have: 0, total: def.collectibles.filter((c) => c.kind === 'crumb').length }, cap: { have: 0, total: def.collectibles.filter((c) => c.kind === 'cap').length }, relic: { have: 0, total: 0 } };
const g = new GoalTracker(def, (k) => counts[k]);
const idx = (id: string) => def.wedges!.findIndex((w) => w.id === id);

check("six wedges in the main hall (one a secret), each with its own name", def.wedges!.length === 6 && new Set(def.wedges!.map((w) => w.name)).size === 6);
check('five bottle caps in the course (there were eight: the owner asked for fewer, each one earned)', counts.cap.total === 5, `${counts.cap.total}`);
check('the tower, drain and undercroft wedges are out from the start', ['summit', 'drain', 'under'].every((id) => g.wedgeOut(idx(id))));
check('the bastion wedge waits for the beasts', !g.wedgeOut(idx('bastion'), def.enemies.length));
g.kills = def.enemies.length;
check('...and appears when they are all beaten', g.wedgeOut(idx('bastion'), 0));
check('the caps wedge shows how many caps so far', g.status()[idx('caps')].text === '0/5');
counts.cap.have = 5;
check('...and appears with the fifth cap', g.wedgeOut(idx('caps')));
check('no wedge yet: the door stays shut', !g.mainDone());
g.earned.add('summit');
check('one wedge opens the door', g.mainDone());
check('the counter reads 1/6', g.current()?.text === '1/6' && g.current()?.label === 'Golden Wedges');
check('a taken wedge reads "got"', g.status()[idx('summit')].text === 'got' && g.status()[idx('summit')].done);

// The spiral: every slab a small hop above the last, and close enough to reach.
let worst = 0;
let rise = 0;
for (let i = 1; i < SPIRAL.length; i++) {
  const a = SPIRAL[i - 1];
  const b = SPIRAL[i];
  const gap = Math.max(0, Math.abs(a.x - b.x) - 3.2) + Math.max(0, Math.abs(a.z - b.z) - 3.2);
  worst = Math.max(worst, gap);
  rise = Math.max(rise, b.top - a.top);
}
check('spiral slabs are a short hop apart', worst < 2.5 && worst < maxRunJumpDistance(), `widest gap ${worst.toFixed(2)}`);
check('spiral slabs rise by a single jump at most', rise <= 1.5, `rise ${rise}`);
check(
  'the last slab is a hop below the chimney floor',
  CHIMNEY_FLOOR - SPIRAL[SPIRAL.length - 1].top <= 1.5
    && CHIMNEY_FLOOR - SPIRAL[SPIRAL.length - 1].top > 0
);

// The hub.
const hub = LEVELS.find((l) => l.hub);
check('there is one hub', !!hub && LEVELS.filter((l) => l.hub).length === 1);
check('its first course door needs no wedges', HUB_DOORS.some((d) => d.need === 0 && d.to));
check(
  'every place with wedges has a way in: a door in the Club, or one in its world',
  LEVELS.filter((l) => l.wedges && !l.returnTo).every((l) => HUB_DOORS.some((d) => d.to === l.id) || LEVELS.some((p) => p.world === l.world && p.courseDoors?.some((d) => d.to === l.id)))
);
check('course doors lead to real courses', HUB_DOORS.every((d) => d.to === null || !!LEVELS.find((l) => l.id === d.to && l.wedges)));
check(
  'course doors sit on the walls, apart from each other and the way out',
  HUB_DOORS.every((d, i) => Math.max(Math.abs(d.door.x), Math.abs(d.door.z)) > 19.5 && HUB_DOORS.every((e, j) => i === j || Math.hypot(d.door.x - e.door.x, d.door.z - e.door.z) > 5) && Math.hypot(d.door.x - hub!.exit.x, d.door.z - hub!.exit.z) > 5)
);
check('more wedges open more doors', [...HUB_DOORS].sort((a, b) => a.need - b.need).every((d, i, a) => i === 0 || d.need > a[i - 1].need));

// The Club: Pip can be talked to across his counter, and the fire is out in the open to rest at.
{
  const pip = hub!.npcs?.find((n) => n.name.toUpperCase() === 'PIP');
  const counter = hub!.solids.find((b) => b.x0 === -17.5 && b.x1 === -16.5);
  check('Pip is in talking range from the front of his counter', !!pip && !!counter && Math.abs(pip.x - (counter.x1 + 0.3)) < 2.2);
  const f = hub!.restSpot;
  // The brazier itself is solid (small, right in the middle: its foot, and its bowl, which is a little wider); everything else stays back.
  check(
    'the brazier is solid but small, so he can rest right up against it',
    !!f
      && hub!.solids.some((b) => b.x1 - b.x0 < 1.3 && Math.hypot((b.x0 + b.x1) / 2 - f.x, (b.z0 + b.z1) / 2 - f.z) < 0.1)
  );
  check(
    'the Club has a fire to rest at, clear of the furniture',
    !!f
      && !hub!.solids.some((b) => !(b.x1 - b.x0 < 1.3 && Math.hypot((b.x0 + b.x1) / 2 - f.x, (b.z0 + b.z1) / 2 - f.z) < 0.1) && b.y1 > f.y + 0.3 && b.x0 < f.x + 2.5 && b.x1 > f.x - 2.5 && b.z0 < f.z + 2.5 && b.z1 > f.z - 2.5 && b.y0 < f.y + 1)
  );
}

// Side areas: the Pump Room belongs to the Cistern world, its door is in the pump house, and its way out leads back.
{
  const pump = LEVELS.find((l) => l.id === 'pumpworks')!;
  check(
    'the Pump Room is part of the Cistern world and leads back to it',
    pump.world === 'cistern'
      && pump.returnTo === 'cistern'
      && (pump.wedges?.length ?? 0) === 3
  );
  const cd = def.courseDoors?.find((d) => d.to === 'pumpworks');
  check('the door to it is inside the pump house, behind the plate gate', !!cd && cd.door.x > 40 && Math.abs(cd.door.z - 2) < 3);
  const gate = def.gates?.find((g) => (g.plates?.length ?? 0) === 2);
  // The house is shut on every side: walls north, south and west (with the gate in it), its roof, and the room wall east.
  const shut = (x: number, z: number, y: number): boolean => def.solids.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && y >= b.y0 && y <= b.y1);
  const sealed = [[28.5, -3, 1], [28.5, 8, 1], [38, -7.5, 1], [38, 11.5, 1], [38, 2, 8.4]].every(([x, z, y]) => shut(x, z, y));
  check('...behind a gate on both plates, in a house sealed all round', !!gate && sealed);
  check('the Pump Room way out is near where he comes in', Math.hypot(pump.exit.x - pump.spawn.x, pump.exit.z - pump.spawn.z) < 10);
}


// Furniture is solid: couches and speakers in the Club have colliders under them.
{
  const inside = (x: number, y: number, z: number): boolean => hub!.solids.some((b) => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && z > b.z0 && z < b.z1);
  check('the couches by the fire are solid', inside(-5, 0.4, 0) && inside(5, 0.4, 0) && inside(0, 0.4, -5));
  // The couch at (0, -5) faces south: its arms are at its east and west ends, its cushion on the seat. All solid, as
  // drawn. (They were not: standing on the seat he sank into the cushion, and he walked through the arms.)
  check(
    '...and so are a couch\'s arms (to their tops, above the seat) and the cushion on its seat',
    inside(-1.15, 0.9, -5)
      && inside(1.15, 0.9, -5)
      && !inside(0, 0.9, -4.8)
      && inside(0.5, 0.8, -4.9)
      && !inside(-0.5, 0.8, -4.9)
  );
  check('the speakers on the stage are solid', inside(-7, 2, -20) && inside(7, 2, -20));
}

console.log(failures === 0 ? 'wedges: all pass' : `wedges: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
