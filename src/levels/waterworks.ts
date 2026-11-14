/**
 * The Waterworks: one huge hall. A wide channel of green sludge runs down the middle with a tower island in it,
 * a high plank bridge crosses over, galleries line the walls, and a raised plateau at the far end holds the exit.
 * It is long (100 units) and wide (76), so there is room to choose a route.
 *
 * Layout, looking north from the start (z runs from +50 at the start to -50 at the exit):
 *   z 24..50   entry landing, crates, one roach
 *   z -30..24  the channel (x -22..22), promenades on both sides (x 22..38), galleries along the walls
 *   z -50..-30 the plateau, 2.4 high, with the exit door and three guards
 */
import { Decor, extent } from '../world/layout';
import { doorOn } from '../world/rooms';
import { ITEM_Y, Items, room, slab, stairs } from './builders';
import type { EnemySpec, LevelDef } from './types';

const HX = 38; // half width
const HZ = 50; // half length
const WALL = 17;
const POOL_Y = -0.85;
const PLATEAU = 2.4;
const GALLERY = 1.8;

export function waterworks(): LevelDef {
  const solids = room(HX, false, HZ, WALL);

  // Ground: the entry landing, a promenade down each side, and the plateau at the far end.
  solids.push(slab('floor', -HX, HX, 24, HZ, 0, -1));
  solids.push(slab('floor', -HX, -22, -22, 24, 0, -1), slab('floor', 22, HX, -22, 24, 0, -1));
  solids.push(slab('floor', -HX, HX, -HZ, -30, PLATEAU, -1));
  // Grand stairs up from each promenade to the plateau, 8 steps each.
  solids.push(...stairs(-HX, -22, -22, -1, 8, 0.3, 1, 0, -1), ...stairs(22, HX, -22, -1, 8, 0.3, 1, 0, -1));
  // ...and a central flight rising out of the sludge, reached by a plank bridge from the island.
  solids.push(...stairs(-4, 4, -22, -1, 8, 0.3, 1, 0, -4));

  // Side galleries against the walls, 1.8 up, with stairs at the south end.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -HX : HX - 8;
    solids.push(slab('stone', x0, x0 + 8, -18, 19.2, GALLERY));
    solids.push(...stairs(x0, x0 + 8, 24, -1, 6, 0.3, 0.8, 0, 0));
  }
  // The high bridge from gallery to gallery, held up by two pillars standing in the channel.
  solids.push(slab('plank', -HX + 8, HX - 8, 12, 14, GALLERY, GALLERY - 0.3));
  solids.push(extent('pillar', -13, -11, -4, GALLERY - 0.3, 12.5, 13.5), extent('pillar', 11, 13, -4, GALLERY - 0.3, 12.5, 13.5));

  // The island in the channel, with the pump tower and steps spiralling up it.
  solids.push(slab('stone', -9, 9, -8, 8, 0, -4));
  solids.push(extent('pillar', -1.5, 1.5, 0, 8, -1.5, 1.5));
  const steps: Array<[number, number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.6;
    const x = Math.cos(a) * 3.6;
    const z = Math.sin(a) * 3.6;
    steps.push([x, z, 1.2 * (i + 1)]);
    solids.push(slab('platform', x - 1.2, x + 1.2, z - 1.2, z + 1.2, 1.2 * (i + 1)));
  }
  // Ways onto the island: a plank from the west promenade, slabs from the east, hops from the south, a plank north.
  solids.push(slab('plank', -22, -9, -1, 1, 0, -0.3));
  const eastSlabs: Array<[number, number]> = [[11, 14], [15.5, 18.5]];
  for (const [a, b] of eastSlabs) solids.push(slab('platform', a, b, -1.5, 1.5, 0, -4));
  const southSlabs: Array<[number, number, number]> = [[0, 21.5, 0], [2.5, 17.5, 0.3], [-1, 13.5, 0], [1.5, 10.5, 0.3]];
  for (const [x, z, top] of southSlabs) solids.push(slab('platform', x - 1.5, x + 1.5, z - 1.5, z + 1.5, top, -4));
  solids.push(slab('plank', -1, 1, -22, -8, 0, -0.3));

  // Crates: four on the landing, four on the plateau. Some hold collectibles.
  const items = new Items('works');
  const landing: Array<[number, number]> = [[-10, 38], [10, 38], [-18, 44], [18, 44]];
  const top: Array<[number, number]> = [[-20, -44], [20, -44], [-26, -38], [26, -38]];
  const crateSpots: Array<[number, number, number]> = [...landing.map(([x, z]) => [x, z, 0] as [number, number, number]), ...top.map(([x, z]) => [x, z, PLATEAU] as [number, number, number])];
  const contents: Array<string | null> = crateSpots.map(() => null);
  crateSpots.forEach(([x, z, y]) => solids.push(extent('rubble', x - 0.5, x + 0.5, y, y + 1, z - 0.5, z + 0.5)));
  const idx = (n: number): number => n; // crate index = its place in crateSpots

  // Sixteen cheese crumbs (the goal asks for twelve), then caps, then relics.
  const crumb = (x: number, y: number, z: number): void => void items.add('crumb', x, y + ITEM_Y, z);
  crumb(-6, 0, 44); crumb(6, 0, 44);
  for (const [x, z, t] of southSlabs) crumb(x, t, z);
  crumb(-6, 0, 4); crumb(6, 0, -4);
  crumb(-15, 0, 0); crumb(-11, 0, 0);
  crumb(12.5, 0, 0); crumb(17, 0, 0);
  crumb(0, 0, -16);
  crumb(-26, 0, 10); crumb(26, 0, -10);
  crumb(0, PLATEAU, -40);
  // Caps: a gallery each, the middle of the high bridge, and two in crates.
  items.add('cap', -34, GALLERY + ITEM_Y, 6);
  items.add('cap', 34, GALLERY + ITEM_Y, -6);
  items.add('cap', 0, GALLERY + ITEM_Y, 13);
  contents[idx(1)] = items.add('cap', crateSpots[1][0], crateSpots[1][2] + ITEM_Y, crateSpots[1][1], idx(1));
  contents[idx(6)] = items.add('cap', crateSpots[6][0], crateSpots[6][2] + ITEM_Y, crateSpots[6][1], idx(6));
  items.add('cap', 36, GALLERY + ITEM_Y, 17);
  // Relics: on top of the tower, at the far end of the east gallery, and in a plateau crate.
  items.add('relic', 0, 8 + 0.7, 0);
  items.add('relic', 36, GALLERY + 0.8, -16);
  contents[idx(5)] = items.add('relic', crateSpots[5][0], crateSpots[5][2] + ITEM_Y, crateSpots[5][1], idx(5));

  // Guards. The ones on the galleries and the plateau stand on raised floors.
  const guard = (x: number, z: number, y: number, x0: number, x1: number, z0: number, z1: number): EnemySpec => ({ x, z, y, arena: { x0, x1, z0, z1 }, respawn: false });
  const enemies: EnemySpec[] = [
    guard(0, 38, 0, -16, 16, 30, 47),
    guard(-34, -4, GALLERY, -37, -31, -16, 17),
    guard(34, 6, GALLERY, 31, 37, -16, 17),
    guard(5, 3, 0, -8, 8, -7, 7),
    guard(-14, -40, PLATEAU, -34, 34, -48, -33),
    guard(14, -40, PLATEAU, -34, 34, -48, -33),
    guard(0, -36, PLATEAU, -34, 34, -48, -33),
  ];

  // Pipes along both walls, drain mouths above the galleries and beside the door, lamps down the hall.
  const decor: Decor[] = [];
  for (const side of [-1, 1]) {
    const x = side * (HX - 0.5);
    decor.push({ kind: 'pipe', a: [x, 10.5, -HZ + 1], b: [x, 10.5, HZ - 1], r: 0.5 });
    decor.push({ kind: 'pipe', a: [x, 13, -HZ + 1], b: [x, 13, HZ - 1], r: 0.35, color: 0x6a6a72 });
    for (const z of [-40, -20, 0, 20, 40]) decor.push({ kind: 'pipe', a: [x, 0, z], b: [x, 10.5, z], r: 0.3, color: 0x6a6a72 });
    for (const z of [-12, 8, 28]) decor.push({ kind: 'hole', x: side * (HX - 0.05), y: 6, z, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, r: 2.2 });
    for (let z = -44; z <= 44; z += 11) decor.push({ kind: 'lamp', x: side * (HX - 0.4), y: 15, z });
  }
  decor.push({ kind: 'hole', x: -14, y: PLATEAU + 3, z: -HZ + 0.05, yaw: 0, r: 2.4 }, { kind: 'hole', x: 14, y: PLATEAU + 3, z: -HZ + 0.05, yaw: 0, r: 2.4 });
  decor.push({ kind: 'hole', x: -10, y: 6, z: HZ - 0.05, yaw: Math.PI, r: 2.6 }, { kind: 'hole', x: 10, y: 6, z: HZ - 0.05, yaw: Math.PI, r: 2.6 });

  // Story: a low tunnel in the east wall where the cheese goes, the royal mark over it and on the big pipes,
  // and an iron grate in the landing floor with something glowing far below.
  const tunnel = { x: HX, y: 0, z: 33 };
  const grate = { x: -5, y: 0, z: 41.5 };
  decor.push({ kind: 'hole', x: HX - 0.04, y: 1.3, z: tunnel.z, yaw: -Math.PI / 2, r: 1.6 });
  decor.push({ kind: 'mark', glyph: 'crown', x: HX - 0.03, y: 4.1, z: tunnel.z, yaw: -Math.PI / 2, size: 0.8, color: 0x7d6a92 });
  decor.push({ kind: 'mark', glyph: 'crown', x: -HX + 0.03, y: 3.4, z: 36, yaw: Math.PI / 2, size: 0.8, color: 0x7d6a92 });
  decor.push({ kind: 'grate', x: grate.x, y: 0, z: grate.z, size: 1.7 });

  return {
    id: 'waterworks',
    name: 'Waterworks',
    blurb: 'A huge flooded hall. Cross the sludge any way you like and find twelve crumbs.',
    solids,
    pit: extent('floor', -22, 22, -4.2, -4, -30, 24),
    water: [{ x0: -22, x1: 22, z0: -30, z1: 24, y: POOL_Y }],
    decor,
    npcs: [
      {
        x: 4, z: 42, facing: Math.PI * 0.8, name: 'FINCH', kind: 'bird',
        lines: [
          "Chirp! A knight in the sewers? Well met! I'm Finch. I fly ahead and keep an eye out for you.",
          'This hall is flooded, but you can swim it. Jump while you swim to hop out onto the ledges.',
          'Find twelve cheese crumbs and the door opens. Smash crates and barrels for more, and for snacks!',
          'Hold SHIFT to sneak quietly. Tap jump twice in the air to flutter a little higher. Good luck!',
        ],
      },
    ],
    storySpots: { tunnel, grate },
    spawn: { x: 0, y: 0, z: 46, facing: Math.PI },
    collectibles: items.list,
    crateContents: contents,
    enemies,
    waves: [],
    gear: [],
    goals: [{ type: 'collect', kind: 'crumb', count: 12, label: 'Collect twelve cheese crumbs' }],
    exit: doorOn('north', HX, 0, HZ, PLATEAU),
    reward: 'sludgeScarf',
  };
}

