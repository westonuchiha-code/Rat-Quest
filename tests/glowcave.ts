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
import { ceilingOf, CEILING_CLEAR, MUSHROOM, mushroomCap, mushroomSolids, type Box } from '../src/world/layout';
import { glowCave, GLOWCAVE } from '../src/levels/glowcave';
import { garden, GARDEN } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { getTexturePixels } from '../src/render/textures';

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
  check('the cave is a test room: found by its name, and in none of the game\'s lists', levelById('glowcave')?.id === 'glowcave' && TEST_ROOMS.some((l) => l.id === 'glowcave') && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'glowcave'));
  check('there is nothing in it to pick up, fight or win, and its door leads back to the Move Garden', def.collectibles.length === 0 && def.enemies.length === 0 && def.goals.length === 0 && def.returnTo === 'garden');
  const g = garden();
  const door = g.courseDoors?.find((d) => d.to === 'glowcave');
  const others = [g.exit, ...(g.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  check('a door in the Move Garden leads to it: open from the start, in the south wall, clear of the other doors and of everything standing there', !!door && door.need === 0 && Math.abs(door.door.z - (GARDEN.halfZ - 0.08)) < 1e-6 && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 4) && !g.solids.some((b) => b.kind !== 'wall' && b.kind !== 'floor' && b.x1 > door.door.x - 2 && b.x0 < door.door.x + 2 && b.z1 > GARDEN.halfZ - 3));
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds (its moss, mushrooms and stalactites too)', built);
  check('it is a dark place, and the only one: no other level turns the plain light down', (def.ambient ?? 1) < 0.6 && [...LEVELS, ...ARCHIVE, ...TEST_ROOMS].every((l) => l.id === 'glowcave' || l.ambient === undefined));
  check('it has no lamps: nothing lights it but what grows there', !def.decor.some((d) => d.kind === 'lamp' || d.kind === 'torch' || d.kind === 'brazier' || d.kind === 'light'));
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
    check(`${name}: grey-blue rock, nothing in it vivid or bright (so no glow comes round with the tile)`, vivid === 0 && bright === 0, `${vivid} vivid, ${bright} bright`);
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
  check('every lichen lies on the floor or on a ledge', lying.length >= 8 && lying.every((d) => def.solids.some((b) => b.y1 === d.y && d.x > b.x0 && d.x < b.x1 && d.z > b.z0 && d.z < b.z1 && !b.hidden)));
  const onFace = hung.every((d) => {
    const nx = Math.sin(d.yaw);
    const nz = Math.cos(d.yaw);
    return solidAt(d.x - nx * 0.05, d.y, d.z - nz * 0.05) && !solidAt(d.x + nx * 0.05, d.y, d.z + nz * 0.05);
  });
  check('every clump of moss is on the face of a wall or of a ledge, facing out of it', hung.length >= 12 && onFace);
  check('only some of what glows lights the place (only the nearest few lights are drawn)', moss.filter((d) => d.light).length <= 5 && mushrooms.filter((m) => m.size >= 1.5).length <= 9);
}

// ---- A mushroom as tall as he is, is solid ----
{
  const tall = mushrooms.filter((m) => m.size >= MUSHROOM.solid);
  const small = mushrooms.filter((m) => m.size < MUSHROOM.solid);
  const has = (m: (typeof mushrooms)[number]): boolean => mushroomSolids(m.x, m.y, m.z, m.size).every((s) => def.solids.some((b) => b.hidden && b.x0 === s.x0 && b.x1 === s.x1 && b.y0 === s.y0 && b.y1 === s.y1 && b.z0 === s.z0 && b.z1 === s.z1));
  check('each tall one has its stem and its cap among the solids (unseen: the mushroom is what is drawn)', tall.length >= 10 && tall.every((m) => mushroomSolids(m.x, m.y, m.z, m.size).length === 2 && has(m)), `${tall.length} tall`);
  check('each small one has none: he brushes through it', small.length >= 5 && small.every((m) => mushroomSolids(m.x, m.y, m.z, m.size).length === 0 && !solidAt(m.x, m.y + m.size * 0.5, m.z)), `${small.length} small`);
  check('the solid cap is inside the drawn one (a square in its round), and the solid stem is no wider than he is', tall.every((m) => mushroomCap(m.x, m.z, m.size) * MUSHROOM.capSolid * Math.SQRT2 <= mushroomCap(m.x, m.z, m.size) + 1e-9 && m.size * MUSHROOM.stem <= 0.35));
  // He lands on each cap.
  let landed = 0;
  for (const m of tall) {
    const top = m.y + m.size * MUSHROOM.top;
    const p = new PlayerController(new THREE.Vector3(m.x, top + 1.5, m.z));
    for (let i = 0; i < 120; i++) p.update(DT, inp({}), cs);
    if (p.grounded && Math.abs(p.position.y - top) < 1e-3) landed++;
  }
  check('dropped on any tall one\'s cap, he lands and stands on it', landed === tall.length, `${landed} of ${tall.length}`);
  // He cannot walk through a stem.
  // (One that stands in the open floor, with a clear run at it.)
  const m = tall.find((t) => t.y === 0 && t.size >= 2.3)!;
  const p = new PlayerController(new THREE.Vector3(m.x - 2.5, 0, m.z));
  for (let i = 0; i < 150; i++) p.update(DT, inp({ move: new THREE.Vector3(1, 0, 0) }), cs);
  check('walking at a tall one\'s stem, he is stopped by it', p.position.x < m.x - m.size * MUSHROOM.stem + 1e-6 && p.position.x > m.x - 1, `x ${p.position.x.toFixed(2)}, the stem at ${m.x}`);
  // And walks under its cap: it is over his head.
  check('its cap is over his head: he walks under it', m.size * MUSHROOM.under > 1.1 + 0.3);
}

// ---- No stalactite's point is where he can get to ----
{
  const c = ceilingOf(def.solids)!;
  const outer = def.solids.filter((b) => b.kind === 'wall');
  const near = (b: Box, x: number, z: number): number => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.z0 - z, 0, z - b.z1));
  let worst = Infinity;
  for (const s of spikes) {
    const tip = c.y - s.length;
    // (The highest thing within a long jump of it that he can stand on.)
    const stand = Math.max(0, ...def.solids.filter((b) => !outer.includes(b) && near(b, s.x, s.z) < 6).map((b) => b.y1));
    worst = Math.min(worst, tip - (stand + CEILING_CLEAR));
  }
  check('each stalactite\'s point is above a double jump from the highest thing within six of it', spikes.length >= 12 && worst >= 0, `the nearest: ${worst.toFixed(2)} clear`);
  check('each hangs from the roof inside the room, and is a spike (longer than it is thick)', spikes.every((s) => Math.abs(s.x) < GLOWCAVE.halfX - s.r && Math.abs(s.z) < GLOWCAVE.halfZ - s.r && s.length > s.r * 2));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
