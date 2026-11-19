// The Forge: a try-out room for the furnace's look (src/levels/forge.ts; world/forge.ts and forgeModels.ts).
//
// What is checked: that it is a test room and no part of the game; that every part of the place wears a picture of
// its own and none of those pictures glows; that what is drawn of each new thing is what is solid of it; that the two
// things with nothing solid (the ladle, the cogs) are out of his reach; and that their moving parts keep time.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { TUNING } from '../src/data/tuning';
import type { Box } from '../src/world/layout';
import { forge, forgeThings, FORGE_ROOM, BAY, STAGING, STEP, LADLE_HANG, COGS_AT } from '../src/levels/forge';
import { FORGE, forgeSolids, ladleAt, bellowsAt, cogsAt, type ForgeSpec } from '../src/world/forge';
import { buildForge, heatColor, type ForgeMats } from '../src/world/forgeModels';
import { garden, GARDEN } from '../src/levels/garden';
import { foundry } from '../src/levels/foundry';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { computeReach, unreachable } from '../src/levels/reach';
import { getTexturePixels, type TextureName } from '../src/render/textures';
import { createPs1Material } from '../src/render/ps1Material';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = forge();
const R = FORGE_ROOM;
const things = forgeThings();
const thing = (what: ForgeSpec['what']): ForgeSpec => things.find((t) => t.what === what)!;
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);

// ---- A test room, and no part of the game ----
{
  check(
    'the Forge is a test room: found by its name, among the test rooms, and in none of the game\'s lists',
    levelById('forge')?.id === 'forge'
      && TEST_ROOMS.some((l) => l.id === 'forge')
      && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'forge')
  );
  check(
    'nothing in it to fight, to find or to win, and its door leads back to the Move Garden',
    def.goals.length === 0
      && def.enemies.length === 0
      && def.collectibles.length === 0
      && def.returnTo === 'garden'
  );
  const g = garden();
  const door = g.courseDoors?.find((d) => d.to === 'forge');
  const others = [g.exit, ...(g.courseDoors ?? []).filter((d) => d !== door).map((d) => d.door)];
  const clear = (x: number, z: number): boolean => !g.solids.some((b) => b.y1 > 0.05 && b.y0 < 3.8 && x + 1.2 > b.x0 && x - 1.2 < b.x1 && z + 1.2 > b.z0 && z - 1.2 < b.z1 && Math.abs(b.z0) < GARDEN.halfZ && Math.abs(b.z1) <= GARDEN.halfZ);
  check(
    'a door in the Move Garden\'s north wall leads to it: open from the start, clear floor before it, well clear of the garden\'s other doors',
    !!door
      && door.need === 0
      && Math.abs(door.door.z + (GARDEN.halfZ - 0.08)) < 0.01
      && [1.6, 3, 4.5].every((d) => clear(door.door.x, door.door.z + d))
      && computeReach(g).near(door.door.x, 0.1, door.door.z + 1.4, 1.2, 0.6, 0.6)
      && others.every((o) => Math.hypot(o.x - door.door.x, o.z - door.door.z) > 10)
  );
  check(
    'the Foundry itself is not touched: none of the new pictures and none of the new things is in it yet',
    !foundry().solids.some((b) => ['fireBrick', 'deckPlate', 'castIron', 'girder', 'castingSand'].includes(b.skin ?? ''))
      && !foundry().decor.some((d) => d.kind === 'forge')
  );
  let built = true;
  try {
    const room = buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
    for (const t of [0, 0.5, 3.7, 4.4, 6.5, 9.1]) room.update(t);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds, and its things move without falling over (the room drawn at six moments of the ladle\'s round)', built);
  check('the hall is dim, to be lit by its fires, and not as dark as the cave', (def.ambient ?? 1) >= 0.5 && (def.ambient ?? 1) <= 0.8);
  check(
    'he can get to every part of it he is meant to: the staging\'s top, the door out',
    computeReach(def).near((STAGING.x0 + STAGING.x1) / 2, STAGING.top + 0.5, (STAGING.z0 + STAGING.z1) / 2, 0.9, 1, 1)
      && unreachable(def).length === 0,
    unreachable(def).map((u) => u.what).join(', ')
  );
}

// ---- Every part of the place its own picture, and nothing glowing painted into any of them ----
{
  const shown = def.solids.filter((b) => !b.hidden);
  const skins = (kind: Box['kind']): string[] => [...new Set(shown.filter((b) => b.kind === kind).map((b) => b.skin ?? '?'))];
  check(
    'the floor is tread plate, with sand in the moulding bay; the walls firebrick; what he stands on and climbs, cast iron; what holds it up, girders',
    skins('floor').sort().join() === 'castingSand,deckPlate'
      && skins('wall').join() === 'fireBrick'
      && skins('platform').join() === 'castIron'
      && skins('stone').join() === 'castIron'
      && skins('pillar').join() === 'girder',
    `${skins('floor')} / ${skins('wall')} / ${skins('platform')} / ${skins('stone')} / ${skins('pillar')}`
  );
  const floors = new Set(skins('floor'));
  const walls = new Set(skins('wall'));
  check(
    'nothing that stands on the floor wears the floor\'s picture, and nothing he climbs wears the wall\'s',
    shown.filter((b) => b.kind !== 'floor').every((b) => !floors.has(b.skin ?? ''))
      && shown.filter((b) => b.kind !== 'wall').every((b) => !walls.has(b.skin ?? ''))
  );
  const sand = shown.find((b) => b.skin === 'castingSand')!;
  check(
    'the sand is let into the floor, level with it (no lip to trip on), and the plate is cut away under it',
    sand.y1 === 0
      && sand.x0 === BAY.x0
      && sand.z1 === BAY.z1
      && !shown.some((b) => b !== sand && b.kind === 'floor' && b.x0 < sand.x1 && b.x1 > sand.x0 && b.z0 < sand.z1 && b.z1 > sand.z0)
  );
  const tiles: TextureName[] = ['fireBrick', 'deckPlate', 'castIron', 'girder', 'castingSand', 'coalLumps'];
  let hottest = 0;
  let where = '';
  for (const n of tiles) {
    const px = getTexturePixels(n);
    for (let i = 0; i < px.data.length; i += 4) {
      // (A glow would be a bright, strongly orange or yellow dot: much more red than blue, and bright.)
      const hot = px.data[i] > 225 && px.data[i] - px.data[i + 2] > 110 ? px.data[i] : 0;
      if (hot > hottest) {
        hottest = hot;
        where = n;
      }
    }
  }
  check('none of the six new pictures has a glow painted into it: fire and hot metal are things in the room', hottest === 0, where);
}

// ---- The things: what is drawn of each is what is solid of it ----
const plain = new THREE.MeshBasicMaterial();
const mats: ForgeMats = { brick: plain, cast: plain, iron: plain, wood: plain, bark: plain, endGrain: plain, leather: plain, sand: plain, coal: plain, coals: plain, char: plain, flame: plain, glow: () => createPs1Material({}) };
/** The box round what is drawn of a thing: its meshes that are showing. */
const boundsOf = (o: THREE.Object3D): THREE.Box3 => {
  o.updateMatrixWorld(true);
  const box = new THREE.Box3();
  o.traverse((c) => {
    let showing = true;
    for (let p: THREE.Object3D | null = c; p; p = p.parent) showing &&= p.visible;
    if (showing && c instanceof THREE.Mesh) box.expandByObject(c);
  });
  return box;
};
const union = (bs: Box[]): { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number } => ({ x0: Math.min(...bs.map((b) => b.x0)), x1: Math.max(...bs.map((b) => b.x1)), y0: Math.min(...bs.map((b) => b.y0)), y1: Math.max(...bs.map((b) => b.y1)), z0: Math.min(...bs.map((b) => b.z0)), z1: Math.max(...bs.map((b) => b.z1)) });
{
  check(
    'there is one of each of the eight things, and each solid one has its solid boxes in the room',
    (['furnace', 'bellows', 'ladle', 'mould', 'ingots', 'cogs', 'bunker', 'anvil'] as const).every((w) => things.filter((t) => t.what === w).length === 1)
      && things.every((t) => forgeSolids(t).every((s) => def.solids.some((b) => b.hidden && b.x0 === s.x0 && b.x1 === s.x1 && b.y1 === s.y1 && b.z0 === s.z0)))
  );
  for (const what of ['mould', 'ingots', 'bunker', 'anvil'] as const) {
    const t = thing(what);
    const drawn = boundsOf(buildForge(t, mats, R.wall).group);
    const solid = union(forgeSolids(t));
    const off = Math.max(Math.abs(drawn.min.x - solid.x0), Math.abs(drawn.max.x - solid.x1), Math.abs(drawn.min.z - solid.z0), Math.abs(drawn.max.z - solid.z1), Math.abs(drawn.max.y - solid.y1), Math.abs(drawn.min.y - solid.y0));
    check(`the ${what}: what is drawn is what is solid, to within a hand on every side`, off <= 0.2, `out by ${off.toFixed(2)}`);
  }
  {
    const t = thing('furnace');
    const m = buildForge(t, mats, R.wall);
    const drawn = boundsOf(m.group);
    const solid = union(forgeSolids(t));
    check(
      'the furnace: its footing, its brick and its stack are solid as drawn, and the stack goes up to the roof',
      Math.abs(drawn.min.x - solid.x0) < 0.1
        && Math.abs(drawn.max.x - solid.x1) < 0.1
        && Math.abs(drawn.min.z - solid.z0) < 0.1
        && Math.abs(drawn.max.z - solid.z1) < 0.1
        && Math.abs(drawn.max.y - R.wall) < 0.05
        && solid.y1 === R.wall,
      `${drawn.min.x.toFixed(2)}..${drawn.max.x.toFixed(2)} / ${drawn.min.z.toFixed(2)}..${drawn.max.z.toFixed(2)} to ${drawn.max.y.toFixed(2)} against ${solid.x0}..${solid.x1} / ${solid.z0}..${solid.z1}`
    );
    check(
      '...it stands with its back to the north wall, its fire is four tongues in its mouth, and it lights the hall',
      Math.abs(solid.z0 - -R.halfZ) < 0.01
        && m.flames.length === 4
        && m.lights.length === 1
        && m.lights[0].power > 1
        && m.lights[0].z > solid.z1
    );
    const f = FORGE.furnace;
    check(
      '...its mouth is taller than he is and narrower than its brick; the fire stays inside the iron round it',
      f.mouth.h > TUNING.rat.height * 1.5
        && f.mouth.w < f.w - 2
        && m.flames.every((fl) => Math.abs(fl.mesh.position.x) + 0.55 < f.mouth.w / 2 + 0.3)
    );
  }
  {
    // The bellows: the deck is fixed and is the top of what is solid; what moves stays under it, inside the frame.
    const t = thing('bellows');
    const m = buildForge(t, mats, R.wall);
    const solid = union(forgeSolids(t));
    const B = FORGE.bellows;
    let low = 99;
    let outside = 0;
    let top = 0;
    for (let k = 0; k < 60; k++) {
      m.update?.((k / 60) * B.period);
      const b = boundsOf(m.group);
      top = Math.max(top, b.max.y);
      low = Math.min(low, ...m.group.children.filter((c) => c instanceof THREE.Group).map((c) => boundsOf(c).min.y));
      outside = Math.max(outside, solid.z0 - b.min.z, b.max.z - solid.z1, solid.x0 - b.min.x);
    }
    const drawn = boundsOf(m.group);
    check(
      'the bellows: nothing of it ever rises above its deck, which is the top of what is solid: he can stand on it while it works',
      Math.abs(top - solid.y1) < 0.01
        && solid.y1 === B.top
    );
    check(
      '...the board that swings stays inside the frame and clear of the floor through its whole round',
      outside < 0.01
        && low > 0.3,
      `lowest ${low.toFixed(2)}`
    );
    check(
      '...only its nozzle stands out of the frame, and that goes into the furnace\'s side, over his head',
      drawn.max.x - solid.x1 > 0.5
        && drawn.max.x <= thing('furnace').x - FORGE.furnace.w / 2 + 0.15
        && B.top - 0.3 > TUNING.rat.height
    );
    const opens = Array.from({ length: 200 }, (_, k) => bellowsAt((k / 200) * B.period));
    const rising = opens.filter((o, k) => opens[(k + 1) % 200] > o).length;
    check(
      '...it fills slowly and is squeezed quickly, between its two bounds, with no jump as the round comes again',
      Math.min(...opens) >= B.open[0] - 1e-9
        && Math.max(...opens) <= B.open[1] + 1e-9
        && rising > 110
        && Math.abs(bellowsAt(B.period - 1e-4) - bellowsAt(0)) < 0.01
    );
  }
}

// ---- The ladle and the cogs: only drawn, so out of his reach ----
{
  const L = FORGE.ladle;
  const ladle = thing('ladle');
  const mould = thing('mould');
  // The highest his head gets from the tallest thing near the ladle, at the best of a jump and a second jump.
  const stands = def.solids.filter((b) => Math.hypot((b.x0 + b.x1) / 2 - ladle.x, (b.z0 + b.z1) / 2 - ladle.z) < 6 && b.y1 < 3);
  let head = 0;
  for (const b of stands) for (let second = 14; second <= 40; second += 2) {
    const p = new PlayerController(new THREE.Vector3((b.x0 + b.x1) / 2, b.y1 + 0.01, (b.z0 + b.z1) / 2));
    for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    for (let i = 0; i < 160; i++) {
      p.update(DT, inp({ jumpPressed: i === second, jumpHeld: true }), cs);
      head = Math.max(head, p.position.y + TUNING.rat.height);
    }
  }
  // (The bucket's lowest point as it turns: its bottom corner, swung under the pins.)
  const lowest = LADLE_HANG - Math.hypot(0.78, 0.68);
  check(
    'the ladle hangs over his head whatever he jumps from near it (the floor, the mould, the ingots), tipped or level',
    head < lowest - 0.15
      && stands.length >= 3,
    `his head gets to ${head.toFixed(2)}; the ladle comes down to ${lowest.toFixed(2)}`
  );
  check(
    'the mould stands under where the lip comes to when the ladle is tipped: the stream falls into it',
    Math.abs(mould.x - ladle.x - (L.lip * Math.cos(L.tip) + 0.4 * Math.sin(L.tip))) < 0.01
      && mould.z === ladle.z
      && Math.abs((ladle.drop ?? 0) - (LADLE_HANG - FORGE.mould.h)) < 1e-9
  );
  const round = Array.from({ length: 900 }, (_, k) => ladleAt((k / 900) * L.period));
  check(
    'its round: level, tipped, poured, level again; the stream is there only while it is well tipped',
    round[0].tip === 0
      && round.some((r) => r.tip === 1)
      && round.every((r) => r.stream === 0 || r.tail >= 0.999 || r.tip > 0.45)
      && round.filter((r) => r.stream > 0 && r.tail < 1).length > 150
      && round.filter((r) => r.stream === 0).length > 400
  );
  const heats = round.map((r) => r.heat);
  const peak = heats.indexOf(Math.max(...heats));
  check(
    'the cast in the mould is hottest as the pour ends, cools from then until the next, and is still dull red when the ladle comes over again',
    Math.max(...heats) > 0.99
      && round[peak].stream > 0
      && heats.slice(peak, 900).every((h, k, a) => k === 0 || h <= a[k - 1] + 1e-9)
      && Math.min(...heats) > 0.1
      && Math.min(...heats) < 0.3,
    `coolest ${Math.min(...heats).toFixed(2)}`
  );
  const c0 = heatColor(0.1);
  const c1 = heatColor(0.5);
  const c2 = heatColor(1);
  check(
    'a cast glows white-yellow when poured, orange as it cools, dull red at the last',
    c2.r > 0.95
      && c2.g > 0.8
      && c1.r > 0.8
      && c1.g < 0.4
      && c0.r < 0.25
      && c0.g < 0.05
  );
  const m = buildForge(ladle, mats, R.wall);
  m.update?.(L.tipAt + L.tipTime + 1);
  const pouring = boundsOf(m.group);
  m.update?.(0.5);
  const resting = boundsOf(m.group);
  check(
    'drawn: at rest nothing of it is below its bucket, and its chain goes up to the roof; pouring, the stream comes down to the mould (its sparks fall round it, none through the floor)',
    resting.min.y > LADLE_HANG - 1.1
      && pouring.min.y >= 0
      && pouring.min.y <= FORGE.mould.h + 0.1
      && Math.abs(resting.max.y - R.wall) < 0.25,
    `rest ${resting.min.y.toFixed(2)}, pouring ${pouring.min.y.toFixed(2)}`
  );

  const C = FORGE.cogs;
  const cogs = thing('cogs');
  const drawn = boundsOf(buildForge(cogs, mats, R.wall).group);
  check(
    'the cogs hang on the east wall, clear of the roof, their lowest tooth over his head from the floor, and nothing near to stand on',
    Math.abs(cogs.x - R.halfX) < 0.01
      && drawn.max.y < R.wall
      && drawn.min.y > 4.59 + TUNING.rat.height + 0.4
      && Math.abs(drawn.min.y - (COGS_AT - C.big.r - 0.45 * C.tooth)) < 0.05
      && !def.solids.some((b) => b.y1 > 0.3 && b.y1 < 9 && b.x1 > cogs.x - 5 && b.z0 < drawn.max.z + 4 && b.z1 > drawn.min.z - 4 && !(b.kind === 'wall')),
    `lowest ${drawn.min.y.toFixed(2)}`
  );
  check(
    '...they stand out from the wall by less than half a step, and are not in it',
    drawn.min.x > R.halfX - 0.5
      && drawn.max.x <= R.halfX + 0.001,
    `${drawn.min.x.toFixed(3)}..${drawn.max.x.toFixed(3)}`
  );
  // In mesh: where they meet, a tooth of the big one is in a gap of the small one, at every moment.
  let worst = 0;
  for (let k = 0; k < 400; k++) {
    const a = cogsAt(k * 0.137);
    const pb = (Math.PI * 2) / C.big.teeth;
    const ps = (Math.PI * 2) / C.small.teeth;
    // How far (along the pitch circle) the big one's nearest tooth is past the meeting point, and the small one's nearest GAP.
    const tooth = ((((C.at - a.big) % pb) + pb + pb / 2) % pb - pb / 2) * C.big.r;
    const gap = ((((C.at + Math.PI - a.small - ps / 2) % ps) + ps + ps / 2) % ps - ps / 2) * C.small.r;
    worst = Math.max(worst, Math.abs(tooth + gap));
  }
  check(
    '...their teeth are the same size, they turn against each other, and they stay in mesh',
    Math.abs(C.big.r / C.big.teeth - C.small.r / C.small.teeth) < 1e-9
      && Math.sign(cogsAt(1).big - cogsAt(0).big) === -Math.sign(cogsAt(1).small - cogsAt(0).small)
      && worst < 1e-6,
    `out by ${worst.toExponential(1)}`
  );
}

// ---- The rest of the room ----
{
  const vents = def.decor.filter((d) => d.kind === 'vent') as Array<{ x: number; z: number; delay?: number }>;
  const open = (x: number, z: number): boolean => !def.solids.some((b) => b.y1 > 0.05 && x + 0.9 > b.x0 && x - 0.9 < b.x1 && z + 0.9 > b.z0 && z - 0.9 < b.z1) && !(x > BAY.x0 - 0.7 && x < BAY.x1 + 0.7 && z > BAY.z0 - 0.7 && z < BAY.z1 + 0.7);
  check(
    'three steam vents in the tread plate, on open floor (not in the sand, not under anything), breathing in turn',
    vents.length === 3
      && vents.every((v) => open(v.x, v.z))
      && new Set(vents.map((v) => v.delay)).size === 3
  );
  check(
    'the staging is a deck on four girders he can walk under, with a step up to it; the coal bunker is the other step',
    def.solids.filter((b) => b.skin === 'girder' && b.y1 === STAGING.top - STAGING.thick).length === 4
      && STAGING.top - STAGING.thick > TUNING.rat.height * 2
      && STEP.top === STAGING.top / 2
      && FORGE.bunker.h < STAGING.top
  );
  check(
    'nothing stands in the doorway or on the spot he comes in at',
    !def.solids.some((b) => b.y1 > 0.05 && b.kind !== 'wall' && Math.abs((b.x0 + b.x1) / 2 - def.spawn.x) < 2.2 && b.z1 > def.spawn.z - 2.5)
  );
}

console.log(failures === 0 ? 'forge: all pass' : `forge: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
