// The Glow Cave: a try-out room for a theme (src/levels/glowcave.ts).
//
// A dark cave lit by what grows in it. What is checked here: that it is a test room and no part of the game; that the
// rock's pictures hold no glow of their own (the glow is PUT ON the rock, each clump in its own place); that everything
// that grows there grows ON something; that a mushroom as tall as he is, is solid (its stem stops him, its cap is a
// thing to stand on) and a smaller one is not; and that no stalactite's point is where he can jump to.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { ceilingOf, CEILING_CLEAR, MUSHROOM, mushroomCap, mushroomSolids, mushroomStem, mushroomTop, type Box } from '../src/world/layout';
import { CollectibleTracker } from '../src/world/collectibles';
import { TUNING } from '../src/data/tuning';
import { glowCave, GLOWCAVE, CAP_WALK, WALK_CAP, WALK_STEM, WALK_PRIZES } from '../src/levels/glowcave';
import { garden, GARDEN } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { getTexture, getTexturePixels } from '../src/render/textures';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = glowCave();
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const inside = (b: Box, x: number, y: number, z: number): boolean => x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1 && z > b.z0 && z < b.z1;
const solidAt = (x: number, y: number, z: number): boolean => def.solids.some((b) => inside(b, x, y, z));
const mushrooms = def.decor.filter((d) => d.kind === 'mushroom');
const moss = def.decor.filter((d) => d.kind === 'moss');
const spikes = def.decor.filter((d) => d.kind === 'stalactite');

// ---- It is a test room, and no part of the game ----
{
  check(
    'the cave is a test room: found by its name, and in none of the game\'s lists',
    levelById('glowcave')?.id === 'glowcave'
      && TEST_ROOMS.some((l) => l.id === 'glowcave')
      && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'glowcave')
  );
  check('there is nothing in it to win, and its door leads back to the Move Garden', def.goals.length === 0 && def.returnTo === 'garden');
  // Its glow bugs: the Firefly Bomber, each in a colour of its own, keeping to the air of the room.
  const bugs = def.enemies.filter((e) => e.type === 'firefly');
  check(
    'nothing in the cave has seen him as he comes in at the door: every creature starts further from it than it notices him from',
    def.enemies.every((e) => Math.hypot(e.x - def.spawn.x, e.z - def.spawn.z) > (e.type === 'firefly' ? 12 : 11))
  );
  const colours = bugs.map((b) => b.color);
  check(
    'three glow bugs live in it, all fireflies, each a different colour, none the plain one',
    bugs.length === 3
      && bugs.every((b) => b.type === 'firefly' && b.color !== undefined)
      && new Set(colours).size === 3,
    colours.map((c) => c?.toString(16)).join()
  );
  check(
    '...each keeps to the air inside the room, clear of its walls, and starts over open floor (not inside a ledge or a mushroom)',
    bugs.every((b) => !!b.arena && b.arena.x0 > -GLOWCAVE.halfX && b.arena.x1 < GLOWCAVE.halfX && b.arena.z0 > -GLOWCAVE.halfZ && b.arena.z1 < GLOWCAVE.halfZ && b.x > b.arena.x0 && b.x < b.arena.x1 && b.z > b.arena.z0 && b.z < b.arena.z1 && !def.solids.some((s) => s.kind !== 'floor' && b.x > s.x0 - 0.6 && b.x < s.x1 + 0.6 && b.z > s.z0 - 0.6 && b.z < s.z1 + 0.6 && s.y1 > 0.2))
  );
  check(
    '...they are there to be fought, not a goal: beating them opens nothing, and they do not come back',
    def.goals.length === 0
      && bugs.every((b) => !b.respawn)
  );
  const g = garden();
  const door = g.courseDoors?.find((d) => d.to === 'glowcave');
  const others = [g.exit, ...(g.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  check(
    'a door in the Move Garden leads to it: open from the start, in the south wall, clear of the other doors and of everything standing there',
    !!door
      && door.need === 0
      && Math.abs(door.door.z - (GARDEN.halfZ - 0.08)) < 1e-6
      && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 4)
      && !g.solids.some((b) => b.kind !== 'wall' && b.kind !== 'floor' && b.x1 > door.door.x - 2 && b.x0 < door.door.x + 2 && b.z1 > GARDEN.halfZ - 3)
  );
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds (its moss, mushrooms and stalactites too)', built);
  check(
    'it is a dark place, and the darkest: no level of the game turns the plain light down but the Glimmer Deep (this cave made a real level, as dark and no darker), and no other try-out room as far',
    (def.ambient ?? 1) < 0.6
      && [...LEVELS, ...ARCHIVE].every((l) => l.ambient === undefined || (l.id === 'glimmer' && l.ambient === def.ambient))
      && TEST_ROOMS.every((l) => l.id === 'glowcave' || (l.ambient ?? 1) > (def.ambient ?? 1))
  );
  check(
    'it has no lamps: nothing lights it but what grows there',
    !def.decor.some((d) => d.kind === 'lamp' || d.kind === 'torch' || d.kind === 'brazier' || d.kind === 'light')
  );
}

// ---- The rock holds no glow of its own ----
{
  for (const name of ['caveRock', 'caveFloor'] as const) {
    const { size, data } = getTexturePixels(name);
    let vivid = 0;
    let bright = 0;
    for (let i = 0; i < size * size; i++) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      if (Math.max(r, g, b) - Math.min(r, g, b) > 64) vivid++;
      if (Math.max(r, g, b) > 0xd0) bright++;
    }
    check(
      `${name}: grey-blue rock, nothing in it vivid or bright (so no glow comes round with the tile)`,
      vivid === 0
        && bright === 0,
      `${vivid} vivid, ${bright} bright`
    );
  }
  const { size, data } = getTexturePixels('glowMoss');
  let grey = true;
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < size * size; i++) {
    if (data[i * 4] !== data[i * 4 + 1] || data[i * 4] !== data[i * 4 + 2]) grey = false;
    lo = Math.min(lo, data[i * 4]);
    hi = Math.max(hi, data[i * 4]);
  }
  check('glowMoss: in greys and white from dark to full (the clump gives it its colour)', grey && lo < 0x40 && hi === 0xff, `${lo}..${hi}`);
}

// ---- What grows there grows ON something ----
{
  const onGround = mushrooms.every((m) => def.solids.some((b) => b.y1 === m.y && m.x > b.x0 && m.x < b.x1 && m.z > b.z0 && m.z < b.z1 && !b.hidden));
  check('every mushroom stands on the floor or on a ledge', onGround && mushrooms.length >= 20, `${mushrooms.length}`);
  const lying = moss.filter((d) => d.flat);
  const hung = moss.filter((d) => !d.flat);
  check(
    'every lichen lies on the floor or on a ledge',
    lying.length >= 8
      && lying.every((d) => def.solids.some((b) => b.y1 === d.y && d.x > b.x0 && d.x < b.x1 && d.z > b.z0 && d.z < b.z1 && !b.hidden))
  );
  const onFace = hung.every((d) => {
    const nx = Math.sin(d.yaw);
    const nz = Math.cos(d.yaw);
    return solidAt(d.x - nx * 0.05, d.y, d.z - nz * 0.05) && !solidAt(d.x + nx * 0.05, d.y, d.z + nz * 0.05);
  });
  check('every clump of moss is on the face of a wall or of a ledge, facing out of it', hung.length >= 12 && onFace);
  check(
    'only some of what glows lights the place (only the nearest few lights are drawn)',
    moss.filter((d) => d.light).length <= 5
      && mushrooms.filter((m) => m.size >= 1.5).length <= 14
  );
}

// ---- A mushroom as tall as he is, is solid ----
{
  const tall = mushrooms.filter((m) => m.size >= MUSHROOM.solid);
  const small = mushrooms.filter((m) => m.size < MUSHROOM.solid);
  const has = (m: (typeof mushrooms)[number]): boolean => mushroomSolids(m.x, m.y, m.z, m.size, m.cap, m.stem).every((s) => def.solids.some((b) => b.hidden && b.x0 === s.x0 && b.x1 === s.x1 && b.y0 === s.y0 && b.y1 === s.y1 && b.z0 === s.z0 && b.z1 === s.z1));
  check(
    'each tall one has its stem and its cap among the solids (unseen: the mushroom is what is drawn)',
    tall.length >= 10
      && tall.every((m) => mushroomSolids(m.x, m.y, m.z, m.size, m.cap, m.stem).length === 2 && has(m)),
    `${tall.length} tall`
  );
  check(
    'each small one has none: he brushes through it',
    small.length >= 5
      && small.every((m) => mushroomSolids(m.x, m.y, m.z, m.size, m.cap, m.stem).length === 0 && !solidAt(m.x, m.y + m.size * 0.5, m.z)),
    `${small.length} small`
  );
  check(
    'the solid cap is inside the drawn one (a square in its round), and the solid stem is no wider than he is',
    tall.every((m) => mushroomCap(m.x, m.z, m.size, m.cap) * MUSHROOM.capSolid * Math.SQRT2 <= mushroomCap(m.x, m.z, m.size, m.cap) + 1e-9 && mushroomStem(m.size, m.stem) * MUSHROOM.stemSolid <= 0.35)
  );
  // He lands on each cap.
  let landed = 0;
  for (const m of tall) {
    const top = mushroomTop(m.x, m.y, m.z, m.size, m.cap);
    const p = new PlayerController(new THREE.Vector3(m.x, top + 1.5, m.z));
    for (let i = 0; i < 120; i++) p.update(DT, inp({}), cs);
    if (p.grounded && Math.abs(p.position.y - top) < 1e-3) landed++;
  }
  check('dropped on any tall one\'s cap, he lands and stands on it', landed === tall.length, `${landed} of ${tall.length}`);
  // He cannot walk through a stem.
  // (One that stands in the open floor, with a clear run at it.)
  const m = tall.find((t) => t.y === 0 && t.size >= 2 && t.cap === undefined)!;
  const p = new PlayerController(new THREE.Vector3(m.x, 0, m.z + 2.5));
  for (let i = 0; i < 150; i++) p.update(DT, inp({ move: new THREE.Vector3(0, 0, -1) }), cs);
  check(
    'walking at a tall one\'s stem, he is stopped by it',
    p.position.z > m.z + mushroomStem(m.size) * MUSHROOM.stemSolid - 1e-6
      && p.position.z < m.z + 1,
    `z ${p.position.z.toFixed(2)}, the stem at ${m.z}`
  );
  // And walks under its cap: it is over his head.
  check('its cap is over his head: he walks under it', m.size - mushroomCap(m.x, m.z, m.size) * MUSHROOM.deep > 1.1 + 0.3);
}

// ---- The Cap Walk: five tall mushrooms, each a jump from the last, and what is on them is earned ----
{
  const walk = CAP_WALK.map(([x, z, top]) => ({ x, z, top }));
  const drawn = walk.map((w) => mushrooms.find((m) => m.x === w.x && m.z === w.z));
  check(
    'each of the walk\'s five is a mushroom of one colour, standing on the floor, its top where the walk says, its cap wide enough to land on and its stem slender',
    drawn.every((m, i) => !!m && m.y === 0 && m.cap === WALK_CAP && m.stem === WALK_STEM && m.color === drawn[0]!.color && Math.abs(mushroomTop(m.x, 0, m.z, m.size, m.cap) - walk[i].top) < 1e-9)
      && !mushrooms.some((m) => !drawn.includes(m) && m.color === drawn[0]!.color)
      && WALK_CAP * MUSHROOM.capSolid >= 1
  );
  check(
    'each is higher than the last, and they wind through the room: no two caps over one another',
    walk.every((w, i) => i === 0 || w.top > walk[i - 1].top)
      && walk.every((w, i) => walk.every((v, j) => i === j || Math.hypot(w.x - v.x, w.z - v.z) > WALK_CAP * 2 + 1))
  );
  const bugAir = def.enemies[0].arena!;
  check('no cap is at the height the glow bugs fly at where they fly (they pass over a low one and under a high one)', walk.every((w) => {
    const inAir = w.x + WALK_CAP > bugAir.x0 && w.x - WALK_CAP < bugAir.x1 && w.z + WALK_CAP > bugAir.z0 && w.z - WALK_CAP < bugAir.z1;
    return !inAir || w.top < 4 || w.top - WALK_CAP * MUSHROOM.deep > 4.6;
  }));

  /**
   * From the middle of one stop, a step back for a run, he runs at the next and jumps `d` frames on; the second jump
   * `e` frames after the first (none if negative). Whether he ends standing on the next, and where he went.
   */
  type Stop = { x: number; z: number; top: number };
  const hop = (from: Stop, to: Stop, d: number, e: number, grab = true): { ok: boolean; path: Array<{ x: number; y: number; z: number }> } => {
    const far = Math.hypot(to.x - from.x, to.z - from.z);
    const p = new PlayerController(new THREE.Vector3(from.x - ((to.x - from.x) / far) * 0.6, from.top + 0.01, from.z - ((to.z - from.z) / far) * 0.6));
    p.allowGrab = grab;
    for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
    const path: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < 280; i++) {
      const dx = to.x - p.position.x;
      const dz = to.z - p.position.z;
      const dist = Math.hypot(dx, dz);
      const move = dist > 0.25 ? new THREE.Vector3(dx / dist, 0, dz / dist) : new THREE.Vector3();
      p.update(DT, inp({ move, jumpPressed: i === d || (e >= 0 && i === d + e), jumpHeld: i >= d }), cs);
      path.push({ x: p.position.x, y: p.position.y, z: p.position.z });
      if (i > d + 5 && p.grounded) return { ok: Math.abs(p.position.y - to.top) < 0.02 && Math.hypot(p.position.x - to.x, p.position.z - to.z) < WALK_CAP, path };
    }
    return { ok: false, path };
  };
  // The low step by the east wall, where the walk begins.
  const stepBox = def.solids.find((b) => !b.hidden && b.kind === 'stone' && b.x1 === GLOWCAVE.halfX && b.z1 === -1)!;
  const stops: Stop[] = [{ x: 12, z: stepBox.z1 - 1.2, top: stepBox.y1 }, ...walk];
  const ONE: number[] = [];
  const TWO: number[] = [];
  for (let k = 0; k + 1 < stops.length; k++) {
    let one = 0;
    let two = 0;
    for (let d = 0; d <= 24; d++) {
      if (hop(stops[k], stops[k + 1], d, -1).ok) one++;
      for (let e = 10; e <= 58; e += 6) if (hop(stops[k], stops[k + 1], d, e).ok) two++;
    }
    ONE.push(one);
    TWO.push(two);
  }
  check(
    'the first four are each a running jump from the one before: one jump does it, but not a jump from a standstill at the first of them',
    ONE.slice(0, 4).every((n) => n >= 8)
      && !hop(stops[0], stops[1], 0, -1).ok,
    `timings that land, of 25: ${ONE.slice(0, 4).join()}`
  );
  check('the last is across a gap that one jump does not cross, with the edge to catch or without: the second jump does', ONE[4] === 0 && TWO[4] >= 40 && (() => {
    for (let d = 0; d <= 24; d++) if (hop(stops[4], stops[5], d, -1, false).ok) return false;
    return true;
  })(), `one jump lands ${ONE[4]} times, two jumps ${TWO[4]}`);

  // What the walk gives.
  const prize = (id: string) => def.collectibles.find((c) => c.id === id)!;
  const fourth = prize(WALK_PRIZES.fourth);
  const gap = prize(WALK_PRIZES.gap);
  const last = prize(WALK_PRIZES.last);
  check(
    'three things to find, and no more: a bottle cap over the fourth cap, one in the air over the long gap, a relic over the last',
    def.collectibles.length === 3
      && fourth.kind === 'cap'
      && gap.kind === 'cap'
      && last.kind === 'relic'
      && fourth.x === walk[3].x
      && fourth.z === walk[3].z
      && fourth.y > walk[3].top
      && fourth.y < walk[3].top + 1.1
      && last.x === walk[4].x
      && last.z === walk[4].z
      && last.y > walk[4].top
      && last.y < walk[4].top + 1.1
  );
  const R = TUNING.rat;
  const takes = (path: Array<{ x: number; y: number; z: number }>, id: string): boolean => {
    const t = new CollectibleTracker([{ id: 'glowcave', name: 'c', items: def.collectibles }], { load: () => null, save: () => undefined } as never);
    return path.some((q) => t.tryCollect('glowcave', q, R.radius, R.height).some((c) => c.id === id));
  };
  let crossed = 0;
  let took = 0;
  for (let d = 0; d <= 24; d++) {
    for (let e = 10; e <= 58; e += 6) {
      const r = hop(stops[4], stops[5], d, e);
      if (!r.ok) continue;
      crossed++;
      if (takes(r.path, WALK_PRIZES.gap)) took++;
    }
  }
  check(
    'the one over the gap hangs where the second jump carries him: a good share of the crossings that land take it, and not all of them',
    took >= crossed * 0.25
      && took < crossed,
    `${took} of ${crossed} crossings`
  );
  // None of the three from the floor, by any jump: run at it from each side, jump, jump again, hold on.
  const reached = (target: { x: number; y: number; z: number }, top: number | null): boolean => {
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      for (const back of [3, 5, 7, 9]) {
        for (let e = 14; e <= 40; e += 2) {
          const p = new PlayerController(new THREE.Vector3(target.x + sx * back, 0, target.z + sz * back));
          if (cs.some((b) => p.position.x > b.min.x - 0.3 && p.position.x < b.max.x + 0.3 && p.position.z > b.min.z - 0.3 && p.position.z < b.max.z + 0.3 && b.max.y > 0.05 && b.min.y < 1.1)) continue;
          for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
          const t = new CollectibleTracker([{ id: 'glowcave', name: 'c', items: def.collectibles }], { load: () => null, save: () => undefined } as never);
          for (let i = 0; i < 200; i++) {
            const dx = target.x - p.position.x;
            const dz = target.z - p.position.z;
            const dist = Math.hypot(dx, dz);
            const first = Math.max(0, Math.round((back - 3) / 0.1));
            p.update(DT, inp({ move: dist > 0.2 ? new THREE.Vector3(dx / dist, 0, dz / dist) : new THREE.Vector3(), jumpPressed: i === first || i === first + e, jumpHeld: i >= first }), cs);
            if (t.tryCollect('glowcave', p.position, R.radius, R.height).length) return true;
            if (top !== null && p.grounded && p.position.y > top - 0.05) return true;
          }
        }
      }
    }
    return false;
  };
  check(
    'none of the three is to be had from the floor by any jump: the third cap and up are higher than a double jump and a caught edge get him',
    !reached(fourth, walk[3].top)
      && !reached(gap, null)
      && !reached(last, walk[4].top)
      && !reached({ x: walk[2].x, y: walk[2].top, z: walk[2].z }, walk[2].top)
  );
  // Nor is the last to be had from anything else that stands in the cave: it is higher than a double jump and a caught edge from the tallest of them.
  const others = def.solids.filter((b) => b.y1 > 0.5 && b.kind !== 'wall' && !walk.some((w) => Math.abs((b.x0 + b.x1) / 2 - w.x) < 1e-6 && Math.abs((b.z0 + b.z1) / 2 - w.z) < 1e-6));
  // (Whatever is within the furthest a double jump carries him: fifteen.)
  const tallest = Math.max(...others.filter((b) => Math.hypot(Math.max(b.x0 - walk[4].x, 0, walk[4].x - b.x1), Math.max(b.z0 - walk[4].z, 0, walk[4].z - b.z1)) < 15).map((b) => b.y1));
  check(
    'the last cap is higher than he can get from anything else within a double jump of it: over a double jump and a caught edge from the tallest such thing',
    walk[4].top > tallest + (CEILING_CLEAR - R.height) + 1.25 + 0.05,
    `the tallest other thing ${tallest.toFixed(2)}, the last cap ${walk[4].top}`
  );
}

// ---- The mushrooms' pictures ----
{
  const cap = getTexturePixels('mushroomCap');
  let grey = true;
  for (let i = 0; i < cap.size * cap.size; i++) if (cap.data[i * 4] !== cap.data[i * 4 + 1] || cap.data[i * 4] !== cap.data[i * 4 + 2]) grey = false;
  // (Down the picture: its top to three fifths, then its gills. The gills are blades: light and dark side by side.)
  const row = (y: number): number[] => Array.from({ length: cap.size }, (_, x) => cap.data[(y * cap.size + x) * 4]);
  const swing = (r: number[]): number => r.reduce((a, v, i) => a + (i ? Math.abs(v - r[i - 1]) : 0), 0) / r.length;
  const mean = (r: number[]): number => r.reduce((a, v) => a + v, 0) / r.length;
  check(
    'a cap\'s picture is in greys (the mushroom gives it its colour): pale on top, paler at the crown than by the rim, and gilled underneath',
    grey
      && mean(row(4)) > mean(row(Math.floor(cap.size * 0.55)))
      && mean(row(4)) > 150
      && swing(row(Math.floor(cap.size * 0.8))) > swing(row(8)) * 2,
    `crown ${mean(row(4)).toFixed(0)}, rim ${mean(row(Math.floor(cap.size * 0.55))).toFixed(0)}`
  );
  const stem = getTexturePixels('mushroomStem');
  const srow = (y: number): number => Array.from({ length: stem.size }, (_, x) => stem.data[(y * stem.size + x) * 4]).reduce((a, v) => a + v, 0) / stem.size;
  check(
    'a stem\'s picture is pale, with its skirt near the top and earth-dark at its foot',
    srow(5) > srow(16)
      && srow(stem.size - 1) < srow(16) * 0.75,
    `skirt ${srow(5).toFixed(0)}, middle ${srow(16).toFixed(0)}, foot ${srow(stem.size - 1).toFixed(0)}`
  );
  // As built: caps and stems wear them.
  const ch = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  let caps = 0;
  let stems = 0;
  ch.group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshBasicMaterial & { uniforms?: { tex?: { value: THREE.Texture } } };
    if (mat.map === getTexture('mushroomCap')) caps++;
    if (mat.uniforms?.tex?.value === getTexture('mushroomStem')) stems++;
  });
  check(
    'every mushroom in the cave wears them: a cap and a stem each',
    caps === mushrooms.length
      && stems === mushrooms.length,
    `${caps} caps, ${stems} stems, ${mushrooms.length} mushrooms`
  );
}

// ---- No stalactite's point is where he can get to ----
{
  const c = ceilingOf(def.solids)!;
  const outer = def.solids.filter((b) => b.kind === 'wall');
  const near = (b: Box, x: number, z: number): number => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  let worst = Infinity;
  const low: string[] = [];
  for (const s of spikes) {
    const tip = c.y - s.length;
    // (The highest thing within a long jump of it that he can stand on.)
    const stand = Math.max(0, ...def.solids.filter((b) => !outer.includes(b) && near(b, s.x, s.z) < 6).map((b) => b.y1));
    worst = Math.min(worst, tip - (stand + CEILING_CLEAR));
    if (tip < stand + CEILING_CLEAR) low.push(`${s.x},${s.z}`);
  }
  check(
    'each stalactite\'s point is above a double jump from the highest thing within six of it',
    spikes.length >= 6
      && worst >= 0,
    `the nearest: ${worst.toFixed(2)} clear${low.length ? `; too low: ${low.join(' ')}` : ''}`
  );
  check(
    'each hangs from the roof inside the room, and is a spike (longer than it is thick)',
    spikes.every((s) => Math.abs(s.x) < GLOWCAVE.halfX - s.r && Math.abs(s.z) < GLOWCAVE.halfZ - s.r && s.length > s.r * 2)
  );
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
