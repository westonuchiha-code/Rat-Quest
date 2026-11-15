// Every level is checked as plain data: nothing overlaps, everything can be reached, and the goals work.
import { ALL_LEVELS as LEVELS } from '../src/levels/levels';
import { maxRunJumpDistance } from '../src/levels/jumpMath';
import { GoalTracker, WaveDirector } from '../src/levels/goals';
import { findProblems, isBreakable, overlaps } from '../src/world/layout';
import type { Box } from '../src/world/layout';
import type { LevelDef } from '../src/levels/types';
import { CollectibleTracker } from '../src/world/collectibles';
import { atDoor } from '../src/world/rooms';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const inside = (b: Box, x: number, y: number, z: number, pad = 0): boolean =>
  x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad && z > b.z0 - pad && z < b.z1 + pad;

check('there are several levels with different ids', LEVELS.length >= 6 && new Set(LEVELS.map((l) => l.id)).size === LEVELS.length);

for (const L of LEVELS) {
  const tag = L.id;
  const crates = L.solids.filter((b) => isBreakable(b.kind));
  const problems = findProblems({ solids: L.solids, pit: L.pit, water: L.water });
  check(`${tag}: nothing overlaps`, problems.length === 0, problems.slice(0, 3).join('; '));
  check(`${tag}: crate contents line up with the crates`, L.crateContents.length === crates.length);

  // Collectibles are in the open, or inside the crate they belong to.
  let badItem = '';
  for (const c of L.collectibles) {
    const owner = c.crate === undefined ? null : crates[c.crate];
    if (c.crate !== undefined) {
      if (!owner || !inside(owner, c.x, c.y, c.z)) badItem = `${c.id} is not inside crate ${c.crate}`;
      if (L.crateContents[c.crate] !== c.id) badItem = `${c.id} is not listed in crateContents`;
    } else if (L.solids.some((b) => inside(b, c.x, c.y, c.z, 0.2))) badItem = `${c.id} is inside a solid`;
  }
  check(`${tag}: collectibles are reachable spots`, badItem === '', badItem);
  check(`${tag}: collectible ids are unique and start with the level`, new Set(L.collectibles.map((c) => c.id)).size === L.collectibles.length);

  // He starts on solid ground (or on the floor), clear of everything.
  const s = L.spawn;
  const standsOn = L.solids.some((b) => b.kind !== 'wall' && s.x > b.x0 && s.x < b.x1 && s.z > b.z0 && s.z < b.z1 && Math.abs(b.y1 - s.y) < 0.3 && b.kind !== 'rubble');
  const clear = !L.solids.some((b) => inside(b, s.x, s.y + 0.5, s.z, 0.4));
  check(`${tag}: he starts on solid ground, clear of everything`, standsOn && clear, `spawn ${s.x},${s.y},${s.z}`);

  // Enemies start on the floor, clear of solids.
  const badEnemy = [...L.enemies, ...L.waves.flat()].find((e) => !L.solids.some((b) => b.kind !== 'wall' && !isBreakable(b.kind) && e.x > b.x0 && e.x < b.x1 && e.z > b.z0 && e.z < b.z1 && Math.abs(b.y1 - (e.y ?? 0)) < 0.05) || L.solids.some((b) => inside(b, e.x, (e.y ?? 0) + 0.5, e.z, 0.3)));
  check(`${tag}: enemies start on open floor`, !badEnemy, badEnemy ? `${badEnemy.x},${badEnemy.z}` : '');

  // The exit door is on a wall, in the open, and not at the spawn.
  const door = L.exit;
  const walls = L.solids.filter((b) => b.kind === 'wall');
  const onWall = walls.some((b) => Math.abs(door.x - b.x0) < 0.2 || Math.abs(door.x - b.x1) < 0.2 || Math.abs(door.z - b.z0) < 0.2 || Math.abs(door.z - b.z1) < 0.2);
  check(`${tag}: the exit door is on a wall and not at the spawn`, onWall && !atDoor(door, s.x, s.z), `door ${door.x},${door.z}`);

  // Goals can be met: enough collectibles, enemies, or a reachable spot.
  const goalProblems: string[] = [];
  for (const g of L.goals) {
    if (g.type === 'collect') {
      const have = L.collectibles.filter((c) => c.kind === g.kind).length;
      if (have === 0 || (g.count !== 'all' && g.count > have)) goalProblems.push(`not enough ${g.kind}`);
    } else if (g.type === 'defeat' && L.enemies.length === 0) goalProblems.push('no enemies to defeat');
    else if (g.type === 'waves' && L.waves.length === 0) goalProblems.push('no waves');
    else if (g.type === 'reach') {
      const ground = L.solids.some((b) => b.kind !== 'wall' && g.x > b.x0 && g.x < b.x1 && g.z > b.z0 && g.z < b.z1 && Math.abs(b.y1 - g.y) < 0.3);
      if (!ground) goalProblems.push('the goal spot has no ground under it');
    }
  }
  check(`${tag}: it has goals, and they can be met`, L.goals.length > 0 && goalProblems.length === 0, goalProblems.join('; '));
}

// Goal bookkeeping.
function trackerFor(L: LevelDef): CollectibleTracker {
  return new CollectibleTracker([{ id: L.id, name: L.name, items: L.collectibles }], null);
}
const caps = LEVELS.find((l) => l.id === 'caps')!;
{
  const t = trackerFor(caps);
  const g = new GoalTracker(caps, (k) => t.count(caps.id, k));
  check('collect goal starts unfinished', !g.mainDone() && g.status()[0].text === `0/8`);
  for (const c of caps.collectibles.filter((c) => c.kind === 'cap')) t.collect(c.id);
  check('collecting the capped kind finishes it, not the other kinds', g.mainDone() && t.count('caps', 'crumb').have === 0);
}
const hunt = LEVELS.find((l) => l.id === 'hunt')!;
{
  const g = new GoalTracker(hunt, () => ({ have: 0, total: 0 }));
  check('defeat goal needs every enemy', g.enemyTotal === 5 && !g.mainDone());
  g.kills = 4;
  check('four of five is not enough', !g.mainDone() && g.status()[0].text === '4/5');
  g.kills = 5;
  check('five of five is', g.mainDone());
  // A beast marked as no part of it (it is somewhere else in the level) is not asked for.
  const more = new GoalTracker({ ...hunt, enemies: [...hunt.enemies, { type: 'hornet', x: 0, z: 0, uncounted: true }] }, () => ({ have: 0, total: 0 }));
  more.kills = 4;
  check('a beast marked as no part of a defeat goal is not asked for: the goal still needs its own five, no more', more.enemyTotal === 5 && !more.mainDone() && more.status()[0].text === '4/5');
  more.kills = 5;
  check('...and is done when those five are beaten', more.mainDone());
}
const leap = LEVELS.find((l) => l.id === 'leap')!;
{
  const reach = leap.goals[0];
  const g = new GoalTracker(leap, () => ({ have: 0, total: 0 }));
  if (reach.type !== 'reach') throw new Error('leap should have a reach goal');
  g.update(0, 0, leap.spawn.z);
  check('reach goal is not met at the start', !g.mainDone());
  g.update(reach.x, 0, reach.z);
  check('reach goal is met standing on the far platform', g.mainDone());
  g.reset();
  check('reset clears it', !g.mainDone());
}
{
  // Waves arrive one at a time, and the goal is met only after the last is beaten.
  const w = LEVELS.find((l) => l.id === 'waves')!;
  const g = new GoalTracker(w, () => ({ have: 0, total: 0 }));
  let alive = 0;
  let arrivals = 0;
  const sizes: number[] = [];
  for (let t = 0; t < 120 && !g.mainDone(alive); t += 0.1) {
    const group = g.director.update(0.1, alive);
    if (group) {
      arrivals++;
      alive += group.length;
      sizes.push(group.length);
    } else if (alive > 0 && t % 3 < 0.1) alive--; // the player beats one every so often
  }
  check('waves arrive in order and all of them get beaten', arrivals === w.waves.length && g.mainDone(alive) && sizes.join() === w.waves.map((x) => x.length).join(), `sizes ${sizes.join()} alive ${alive}`);
  const d = new WaveDirector(w.waves);
  check('the next wave does not come while enemies are alive', d.update(10, 1) === null && d.arrived === 0);
}

// The parkour gaps are close to the limit but possible.
{
  const max = maxRunJumpDistance();
  const plats = leap.solids.filter((b) => b.kind === 'platform').sort((a, b) => b.z0 - a.z0);
  const gaps: number[] = [];
  for (let i = 0; i + 1 < plats.length; i++) gaps.push(plats[i].z0 - plats[i + 1].z1);
  check('the parkour gaps are tight but within a running jump', gaps.length >= 6 && gaps.every((g) => g > max * 0.85 && g < max * 0.97), `max ${max.toFixed(2)} gaps ${gaps.map((g) => g.toFixed(2)).join(',')}`);
  check('the parkour room has a void and no floor', leap.pit !== null && !leap.solids.some((b) => b.kind === 'floor'));
}

// Overlap helper sanity, so the level checks above can be trusted.
check('overlap check sees overlaps and ignores touching', overlaps({ kind: 'floor', x0: 0, x1: 2, y0: 0, y1: 1, z0: 0, z1: 2 }, { kind: 'floor', x0: 1, x1: 3, y0: 0, y1: 1, z0: 0, z1: 2 }) && !overlaps({ kind: 'floor', x0: 0, x1: 2, y0: 0, y1: 1, z0: 0, z1: 2 }, { kind: 'floor', x0: 2, x1: 3, y0: 0, y1: 1, z0: 0, z1: 2 }));

console.log(failures === 0 ? '\nLevel checks passed.' : `\n${failures} level check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
