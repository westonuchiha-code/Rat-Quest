// Headless checks for the collectible tracker and the chamber placements.
import { CollectibleTracker, StorageLike, LevelDef, STORAGE_KEY, browserStorage } from '../src/world/collectibles';
import { chamberCollectibles } from '../src/world/collectibleLayout';
import { buildLayout, PIT_HALF, ROOM_HALF } from '../src/world/layout';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failed++;
}

function memory(initial?: string): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(STORAGE_KEY, initial);
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

const levels = (): LevelDef[] => [
  {
    id: 'a',
    name: 'A',
    items: [
      { id: 'a:crumb:1', kind: 'crumb', x: 0, y: 0.5, z: 0 },
      { id: 'a:crumb:2', kind: 'crumb', x: 5, y: 0.5, z: 0 },
      { id: 'a:cap:1', kind: 'cap', x: 0, y: 3, z: 5 },
    ],
  },
  { id: 'b', name: 'B', items: [{ id: 'b:relic:1', kind: 'relic', x: 1, y: 1, z: 1 }] },
];

// Duplicate ids
{
  const dup = levels();
  dup[1].items[0].id = 'a:crumb:1';
  let threw = false;
  try {
    new CollectibleTracker(dup);
  } catch {
    threw = true;
  }
  check('duplicate ids throw', threw);
}

// collect
{
  const t = new CollectibleTracker(levels());
  check('collect returns true the first time', t.collect('a:crumb:1') === true);
  check('collect returns false the second time', t.collect('a:crumb:1') === false);
  check('collect returns false for unknown id', t.collect('nope') === false);
  check('isCollected reflects state', t.isCollected('a:crumb:1') && !t.isCollected('a:crumb:2'));
  const c = t.count('a', 'crumb');
  check('count per kind', c.have === 1 && c.total === 2, JSON.stringify(c));
  const all = t.count('a');
  check('count for whole level', all.have === 1 && all.total === 3);
  const tot = t.totals();
  check('totals across levels', tot.have === 1 && tot.total === 4);
  const rel = t.totals('relic');
  check('totals per kind', rel.have === 0 && rel.total === 1);
  check('count of unknown level is zero', t.count('zzz').total === 0);
}

// tryCollect
{
  const t = new CollectibleTracker(levels());
  const r = 0.3;
  const h = 1.1;
  check('tryCollect picks up a touching item', t.tryCollect('a', { x: 0.2, y: 0, z: 0 }, r, h).length === 1);
  check('tryCollect does not collect twice', t.tryCollect('a', { x: 0.2, y: 0, z: 0 }, r, h).length === 0);
  // crumb 2 at x=5: reach 0.45 + radius 0.3 = 0.75 horizontally
  check('horizontal miss', t.tryCollect('a', { x: 4.1, y: 0, z: 0 }, r, h).length === 0);
  check('horizontal hit just inside', t.tryCollect('a', { x: 4.3, y: 0, z: 0 }, r, h).length === 1);
  // cap at y=3: capsule top is feet+1.1, so feet at 1.0 gives top 2.1 -> 0.9 below, miss
  check('vertical miss (item above)', t.tryCollect('a', { x: 0, y: 1.0, z: 5 }, r, h).length === 0);
  check('vertical miss (item below feet)', t.tryCollect('a', { x: 0, y: 3.6, z: 5 }, r, h).length === 0);
  check('vertical hit at the head', t.tryCollect('a', { x: 0, y: 2.0, z: 5 }, r, h).length === 1);
  check('unknown level returns nothing', t.tryCollect('zzz', { x: 0, y: 0, z: 0 }, r, h).length === 0);
  const other = new CollectibleTracker(levels());
  check('items of other levels are ignored', other.tryCollect('a', { x: 1, y: 0.5, z: 1 }, r, h).every((d) => d.id.startsWith('a:')));
}

// persistence
{
  const store = memory();
  const t = new CollectibleTracker(levels(), store);
  t.collect('a:crumb:2');
  t.collect('b:relic:1');
  const saved = JSON.parse(store.data.get(STORAGE_KEY) ?? '{}') as { v?: number; collected?: string[] };
  check('save shape is {v:1, collected}', saved.v === 1 && Array.isArray(saved.collected) && saved.collected.length === 2);
  const t2 = new CollectibleTracker(levels(), store);
  check('round trip restores state', t2.isCollected('a:crumb:2') && t2.isCollected('b:relic:1') && !t2.isCollected('a:crumb:1'));

  const corrupt = new CollectibleTracker(levels(), memory('{not json'));
  check('corrupt save is ignored', corrupt.totals().have === 0);
  const wrong = new CollectibleTracker(levels(), memory('{"v":1,"collected":"x"}'));
  check('wrong-shaped save is ignored', wrong.totals().have === 0);
  const unknown = new CollectibleTracker(levels(), memory(JSON.stringify({ v: 1, collected: ['a:crumb:1', 'gone:id', 5] })));
  check('unknown ids in a save are ignored', unknown.totals().have === 1 && unknown.isCollected('a:crumb:1'));

  const throwing: StorageLike = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  let ok = true;
  try {
    const t3 = new CollectibleTracker(levels(), throwing);
    ok = t3.collect('a:crumb:1');
  } catch {
    ok = false;
  }
  check('throwing storage does not break the tracker', ok);
  check('browserStorage is null under node', browserStorage() === null);
}

// reset and onChange
{
  const store = memory();
  const t = new CollectibleTracker(levels(), store);
  let calls = 0;
  t.onChange(() => calls++);
  t.collect('a:crumb:1');
  t.collect('a:crumb:1'); // no change
  t.tryCollect('b', { x: 1, y: 1, z: 1 }, 0.3, 1.1);
  check('onChange fires once per real change', calls === 2, `calls=${calls}`);
  t.reset('a');
  check('reset(level) clears only that level', !t.isCollected('a:crumb:1') && t.isCollected('b:relic:1'));
  t.reset();
  check('reset() clears everything', t.totals().have === 0);
  check('reset fires onChange and saves', calls === 4 && (JSON.parse(store.data.get(STORAGE_KEY) ?? '{}') as { collected: string[] }).collected.length === 0);
}

// chamber layout
{
  const level = chamberCollectibles();
  const layout = buildLayout();
  const ids = new Set(level.items.map((i) => i.id));
  check('chamber level id and name', level.id === 'chamber' && level.name === 'Test Chamber');
  check('chamber ids are unique', ids.size === level.items.length);
  check('chamber ids look like chamber:kind:NN', level.items.every((i) => new RegExp(`^chamber:${i.kind}:\\d\\d$`).test(i.id)));
  const m = 0.25;
  const inside = level.items.filter((it) =>
    layout.solids.some(
      (b) =>
        it.x > b.x0 - m && it.x < b.x1 + m && it.y > b.y0 - m && it.y < b.y1 + m && it.z > b.z0 - m && it.z < b.z1 + m,
    ),
  );
  check('no item inside a solid (0.25 margin)', inside.length === 0, inside.map((i) => i.id).join(', '));
  const overPit = level.items.filter((it) => Math.abs(it.x) < PIT_HALF + m && Math.abs(it.z) < PIT_HALF + m);
  check('no item over the pit', overPit.length === 0, overPit.map((i) => i.id).join(', '));
  const outside = level.items.filter((it) => Math.abs(it.x) > ROOM_HALF - m || Math.abs(it.z) > ROOM_HALF - m || it.y < 0 || it.y > 12);
  check('no item outside the room', outside.length === 0, outside.map((i) => i.id).join(', '));
  const arena = level.items.filter((it) => it.x >= -14 && it.x <= -3 && it.z >= 14 && it.z <= 19);
  check('at most one item in the enemy arena', arena.length <= 1, `${arena.length}`);
  // Height above the highest surface directly below (solid tops under the item's footprint).
  const tooHigh = level.items.filter((it) => {
    if (it.kind === 'relic') return false;
    let surface = 0;
    for (const b of layout.solids) {
      if (it.x >= b.x0 - 0.3 && it.x <= b.x1 + 0.3 && it.z >= b.z0 - 0.3 && it.z <= b.z1 + 0.3 && b.y1 <= it.y) surface = Math.max(surface, b.y1);
    }
    return it.y - surface > 2.2;
  });
  check('non-relic items are within single-jump height of a surface', tooHigh.length === 0, tooHigh.map((i) => i.id).join(', '));
  const count = (k: string): number => level.items.filter((i) => i.kind === k).length;
  check(
    'totals per kind: 20 crumbs, 6 caps, 3 relics',
    count('crumb') === 20
      && count('cap') === 6
      && count('relic') === 3,
    `${count('crumb')}/${count('cap')}/${count('relic')}`
  );
}

if (failed) {
  console.log(`\n${failed} collectible check(s) failed.`);
  process.exit(1);
}
console.log('\nCollectible checks passed.');
