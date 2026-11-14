/**
 * The Pumpworks: a big hall with a real river. Sludge pours from grates in the walls, runs along channels, and joins a
 * central river that flows toward the entrance. Three wall pipes feed the pumps; burst them and the portcullis to the
 * far plateau rises. Toads guard the plateau. Pip the peddler waits by the entrance with hints.
 *
 *   z +40..+22  entry landing (spawn, Pip, barrels)
 *   z +22..-22  the river (x -6..6) with banks both sides, two side channels, a bridge, stepping stones and an island
 *   z -22..-30  grand stairs and the weir
 *   z -30..-40  the plateau behind the portcullis: toads, the exit door
 */
import { Decor, GateSpec, PipeSpec, WaterVolume, extent } from '../world/layout';
import type { Box } from '../world/layout';
import { doorOn } from '../world/rooms';
import { ITEM_Y, Items, room, stairs } from './builders';
import * as kit from './kit';
import type { EnemySpec, LevelDef, WedgeDef } from './types';

const HX = 30;
const HZ = 40;
const WALL = 16;
const PLATEAU = 2.4;
const BED = -2.2; // the floor under every channel
const SURFACE = -0.85;
const RIVER_FLOW: [number, number] = [0, 1.6];
const INLET_FLOW = 1.8;

export function pumpworks(): LevelDef {
  // The two inlets run right up to the outer walls, so the walls go down past the channel bed: no gap along the water to swim out through.
  const solids: Box[] = room(HX, false, HZ, WALL).map((b) => ({ ...b, y0: BED - 1 }));
  const contents: Array<string | null> = [];
  const items = new Items('pump');
  /** Adds a breakable and returns its place in the crate list. */
  const breakable = (b: Box): number => {
    solids.push(b);
    contents.push(null);
    return contents.length - 1;
  };
  const withItem = (b: Box, kind: 'crumb' | 'cap' | 'relic'): void => {
    const i = breakable(b);
    contents[i] = items.add(kind, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, i);
  };

  // ---- Ground ----
  solids.push(kit.floor(-HX, HX, 22, HZ, 0)); // the landing
  solids.push(kit.floor(-HX, -6, -22, -5, 0), kit.floor(-HX, -6, -1, 22, 0)); // west bank, split by the west channel
  solids.push(kit.floor(6, HX, -22, 8, 0), kit.floor(6, HX, 12, 22, 0)); // east bank, split by the east channel
  solids.push(kit.floor(-HX, HX, -HZ, -30, PLATEAU)); // the plateau
  solids.push(extent('wall', -18, 18, BED, PLATEAU, -30, -22)); // the weir, with the plateau's front face
  solids.push(...stairs(-HX, -18, -22, -1, 8, 0.3, 1, 0, -1), ...stairs(18, HX, -22, -1, 8, 0.3, 1, 0, -1));

  // ---- Water: the river and two inlets, each over its own bed ----
  solids.push(extent('floor', -6, 6, BED - 1, BED, -22, 22));
  solids.push(extent('floor', -HX, -6, BED - 1, BED, -5, -1));
  solids.push(extent('floor', 6, HX, BED - 1, BED, 8, 12));
  const water: WaterVolume[] = [
    { x0: -6, x1: 6, z0: -22, z1: 22, y: SURFACE, flow: RIVER_FLOW },
    { x0: -HX, x1: -6, z0: -5, z1: -1, y: SURFACE, flow: [INLET_FLOW, 0] },
    { x0: 6, x1: HX, z0: 8, z1: 12, y: SURFACE, flow: [-INLET_FLOW, 0] },
  ];

  // ---- Crossings ----
  solids.push(kit.bridge(-6, 15, 6, 15, 3, 0)); // the plank bridge near the landing
  solids.push(...kit.steppingStones(-4.4, -13, 4.4, -13, 3, 2.4, 0, BED)); // three stones, for the daring
  solids.push(kit.plinth(-3, 3, -9, -3, 0, BED, 'mossStone')); // an island with a prize
  solids.push(kit.bridge(-HX + 6, -3, -6, -3, 2.2, 0)); // across the west channel
  solids.push(kit.bridge(6, 10, HX - 6, 10, 2.2, 0)); // across the east channel

  // ---- Breakables: barrels and crates, some with prizes ----
  for (const [x, z] of [[-24, 36], [24, 36], [-12, 28]] as Array<[number, number]>) for (const b of kit.barrelCluster(x, z)) breakable(b);
  withItem(kit.barrel(-27, 25), 'cap');
  withItem(kit.barrel(27, 25), 'crumb');
  for (const b of kit.crateStack(-27, 8, 0, 2)) breakable(b);
  withItem(extent('rubble', -26.5, -25.5, 0, 1, -18.5, -17.5), 'cap');
  withItem(kit.barrel(20, -18), 'crumb');
  withItem(kit.barrel(26, 2), 'crumb');
  withItem(kit.barrel(0, -6, 0), 'relic'); // on the island
  for (const b of kit.crateStack(-14, -36, PLATEAU, 1)) breakable(b);
  withItem(extent('rubble', 13.5, 14.5, PLATEAU, PLATEAU + 1, -37.5, -36.5), 'relic');
  withItem(kit.barrel(25, -36, PLATEAU), 'cap');

  // ---- Collectibles in the open ----
  const crumb = (x: number, y: number, z: number): void => void items.add('crumb', x, y + ITEM_Y, z);
  crumb(-6, 0, 33); crumb(6, 0, 33);
  crumb(0, 0, 15); // mid-bridge
  crumb(-4.4, 0, -13); crumb(4.4, 0, -13);
  crumb(-18, 0, -3); crumb(18, 0, 10);
  crumb(-20, 0, 18); crumb(20, 0, -10);
  crumb(0, PLATEAU, -34); crumb(-8, PLATEAU, -36);
  items.add('cap', 2, ITEM_Y, -4.5); // island, near the barrel

  // ---- Pipes to burst, and the gate they open ----
  const yawIn = (side: number): number => (side < 0 ? Math.PI / 2 : -Math.PI / 2); // away from the wall
  const pipes: PipeSpec[] = [
    kit.wallPipe(-HX + 0.9, -12, 10, yawIn(-1)),
    kit.wallPipe(HX - 0.9, 18, 10, yawIn(1)),
    kit.wallPipe(-HX + 0.9, 14, 10, yawIn(-1)),
  ];
  const gates: GateSpec[] = [kit.portcullis(0, -30.15, 2 * HX, 4, { y: PLATEAU, pipes: [0, 1, 2] })];

  // ---- Enemies ----
  const guard = (type: 'scuttler' | 'toad', x: number, z: number, y: number, x0: number, x1: number, z0: number, z1: number): EnemySpec => ({ type, x, z, y, arena: { x0, x1, z0, z1 }, respawn: false });
  const enemies: EnemySpec[] = [
    guard('scuttler', -20, 26, 0, -29, -8, 22, 39),
    guard('scuttler', 20, 2, 0, 8, 29, -6, 6),
    guard('scuttler', -20, -12, 0, -29, -8, -21, -7),
    guard('toad', -14, -35, PLATEAU, -28, 28, -39, -31),
    guard('toad', 14, -35, PLATEAU, -28, 28, -39, -31),
    guard('toad', 0, -37, PLATEAU, -28, 28, -39, -31),
  ];

  // ---- Looks ----
  const decor: Decor[] = [];
  decor.push(kit.outflow(0, 1.7, -22, 0, 4, SURFACE)); // the weir's grate: the river's source
  decor.push(kit.outflow(-HX, 3.4, -3, Math.PI / 2, 3, SURFACE), kit.outflow(HX, 3.4, 10, -Math.PI / 2, 3, SURFACE));
  for (const side of [-1, 1]) {
    const x = side * (HX - 0.5);
    decor.push(kit.pipeRun([x, 12, -HZ + 1], [x, 12, HZ - 1], 0.55), kit.pipeRun([x, 14.5, -HZ + 1], [x, 14.5, HZ - 1], 0.35, 0x6a6a72));
    for (const z of [-36, -24, 24, 36]) {
      decor.push(kit.pipeRun([x, 0, z], [x, 12, z], 0.3, 0x6a6a72));
      // Solid, so he cannot walk through it: from whatever it stands on up to the ceiling pipe.
      const under = solids.filter((b) => b.x0 < x + 0.3 && b.x1 > x - 0.3 && b.z0 < z + 0.3 && b.z1 > z - 0.3 && b.y1 <= 12);
      const foot = Math.max(0, ...under.map((b) => b.y1));
      solids.push({ ...extent('stone', x - 0.3, x + 0.3, foot, 12, z - 0.3, z + 0.3), hidden: true });
    }
    for (const z of [-28, 28]) decor.push({ kind: 'hole', x: side * (HX - 0.05), y: 6, z, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, r: 2 });
    decor.push(...kit.lamps(side * (HX - 0.4), -34, side * (HX - 0.4), 34, 9.5, 7));
    decor.push({ kind: 'slime', x: side * (HX - 0.1), y: 14, z: side * 8, yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, length: 4 });
  }
  decor.push({ kind: 'hole', x: -9, y: 7, z: HZ - 0.05, yaw: Math.PI, r: 2.6 }, { kind: 'hole', x: 9, y: 7, z: HZ - 0.05, yaw: Math.PI, r: 2.6 });
  decor.push({ kind: 'window', x: -12, y: PLATEAU + 5, z: -HZ + 0.12, yaw: 0 }, { kind: 'window', x: 12, y: PLATEAU + 5, z: -HZ + 0.12, yaw: 0 });
  decor.push(...kit.chains([[-10, -10], [10, -10], [-10, 20], [10, 20], [0, 0]], WALL, 8));

  // Golden Wedges: this is the Pump Room inside the Great Cistern's pump house, part of that world.
  const wedges: WedgeDef[] = [
    { id: 'pipes', name: 'Burst the Pumps', hint: 'Burst the three green wall pipes and the gate to the plateau rises.', x: -6, y: PLATEAU, z: -35, appears: { type: 'burst', count: 'all', label: 'Burst the three pipes' } },
    { id: 'toads', name: 'Toads on the Plateau', hint: 'Beat every beast in the pump room.', x: 6, y: PLATEAU, z: -35, appears: { type: 'defeat', label: 'Beat the beasts' } },
    { id: 'island', name: 'The River Island', hint: 'Cross the river to the island. The current pushes back.', x: -2, y: 0, z: -4.5, appears: null },
  ];
  return {
    id: 'pumpworks',
    world: 'cistern',
    returnTo: 'cistern',
    wedges,
    music: 'pump',
    name: 'The Pump Room',
    blurb: 'Inside the Great Cistern\'s pump house: a river hall fed by wall grates. Three Golden Wedges.',
    solids,
    pit: null,
    water,
    decor,
    pipes,
    gates,
    npcs: [
      {
        x: 7, z: 31, facing: Math.PI, name: 'PIP',
        lines: [
          'Squeak! You got the pump house open! I only came for the view. And the barrels. Mostly the barrels.',
          'See those fat green pipes on the walls? Give them a good whack with your sword. The gate up north opens when all three are burst.',
          'The toads up there spit sludge. Their throats glow green first. Roll through it, or hold up your shield.',
          'The river runs against you. Take the bridge, or hop the stones if you are feeling brave. There is a prize on the island!',
        ],
      },
    ],
    spawn: { x: 0, y: 0, z: 33, facing: Math.PI },
    collectibles: items.list,
    crateContents: contents,
    enemies,
    waves: [],
    gear: [],
    // The wedges' jobs are the goals, so the level checks can see each one can be met.
    goals: wedges.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name }),
    // The way back out to the Cistern, behind where he comes in.
    exit: doorOn('south', HX, 0, HZ, 0),
    reward: 'sludgeScarf',
  };
}
