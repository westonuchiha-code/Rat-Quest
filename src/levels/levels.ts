/**
 * The levels. Each one is a LevelDef built from small pieces. The first is the original sewer chamber;
 * the rest are test levels, one for each kind of goal.
 */
import { buildLayout, extent } from '../world/layout';
import { chamberCollectibles } from '../world/collectibleLayout';
import { chamberPickups } from '../world/equipmentLayout';
import { doorOn } from '../world/rooms';
import { TUNING } from '../data/tuning';
import { ITEM_Y, Items, block, crate, room } from './builders';
import { maxRunJumpDistance } from './jumpMath';
import { waterworks } from './waterworks';
import { pumpworks } from './pumpworks';
import { kingdomLevels } from './kingdom';
import { foundry, foundryShaft, foundryCellars } from './foundry';
import { hollows, hollowsWebs, hollowsFaith, hollowsDark, hollowsPit } from './hollows';
import { keep, throne } from './keep';
import { cisternWorks, sludgePit } from './cisternHalls';
import { cistern } from './cistern';
import { junction } from './junction';
import { CAMPAIGN } from './campaign';
import { SEWER } from '../story/scenes';
import type { EnemySpec, LevelDef } from './types';

/** Fresh empty parts for a level, so no two levels share an array. */
const empty = (): Pick<LevelDef, 'waves' | 'gear' | 'enemies' | 'crateContents' | 'water' | 'pit' | 'decor'> => ({ waves: [], gear: [], enemies: [], crateContents: [], water: [], pit: null, decor: [] });

/** A guard that roams the whole room and does not come back. */
function hunter(x: number, z: number, half: number): EnemySpec {
  const a = half - 1;
  return { x, z, arena: { x0: -a, x1: a, z0: -a, z1: a }, respawn: false };
}

function sewer(): LevelDef {
  const layout = buildLayout();
  const chamber = chamberCollectibles();
  return {
    ...empty(),
    id: 'sewer',
    name: 'Sewer Chamber',
    blurb: 'Gather every cheese crumb. Caps and relics are bonus.',
    solids: layout.solids,
    pit: layout.pit,
    water: layout.water,
    // Story dressing: the tunnel mouth he arrives by, and an old adventurers' mark beside where the door will appear.
    decor: [
      { kind: 'hole', x: SEWER.tunnel.x, y: 1.25, z: SEWER.tunnel.z - 0.03, yaw: Math.PI, r: 1.35, gap: true },
      { kind: 'mark', x: SEWER.mark.x, y: SEWER.mark.y, z: SEWER.mark.z, yaw: -Math.PI / 2, size: 0.42 },
    ],
    spawn: { x: TUNING.spawn.x, y: TUNING.spawn.y, z: TUNING.spawn.z, facing: 0 },
    collectibles: chamber.items,
    crateContents: layout.solids.filter((b) => b.kind === 'rubble').map(() => null),
    enemies: [{ x: TUNING.scuttler.home.x, z: TUNING.scuttler.home.z }],
    gear: chamberPickups(),
    goals: [{ type: 'collect', kind: 'crumb', count: 'all', label: 'Collect the cheese crumbs' }],
    exit: doorOn('east', 20),
    reward: 'royalScarf',
  };
}

function caps(): LevelDef {
  const H = 14;
  const items = new Items('caps');
  // Eight bottle caps: behind the pillars, along the walls, up on the steps and on top of a pillar.
  for (const [x, z] of [[10.6, 10.6], [-10.6, 10.6], [10.6, -10.6], [-10.6, -10.6], [-3, -12.8]]) items.add('cap', x, ITEM_Y, z);
  // Story: the cap by the east wall is inside a crate now, and so is an old compass (see STORY.caps). Two more crates keep it company.
  const keepsake = { x: 12.3, y: 0, z: 0 };
  const capInCrate = items.add('cap', keepsake.x, ITEM_Y, keepsake.z, 0);
  items.add('cap', -10, 1.2 + ITEM_Y, 3.2); // top of the second step
  items.add('cap', 8, 3 + ITEM_Y, -8); // on top of a pillar: needs the double jump
  for (const [x, z] of [[0, 8], [0, 5.5], [0, 3], [0, 0.5], [0, -2]]) items.add('crumb', x, ITEM_Y, z);
  return {
    ...empty(),
    id: 'caps',
    name: 'Cap Collector',
    blurb: 'Find all eight bottle caps. One is on top of a pillar, one is in a crate.',
    solids: [
      ...room(H),
      block('pillar', 8, 8, 2, 2, 3), block('pillar', -8, 8, 2, 2, 3), block('pillar', 8, -8, 2, 2, 3), block('pillar', -8, -8, 2, 2, 3),
      block('platform', -10, 0, 3, 3, 0.6), block('platform', -10, 3.2, 3, 3, 1.2),
      crate(keepsake.x, keepsake.z), crate(12.4, 1.3), crate(11.1, 1.0),
    ],
    crateContents: [capInCrate, null, null],
    storySpots: { keepsake },
    spawn: { x: 0, y: 0, z: 10, facing: Math.PI },
    collectibles: items.list,
    goals: [{ type: 'collect', kind: 'cap', count: 'all', label: 'Collect the bottle caps' }],
    exit: doorOn('north', H),
  };
}

function hunt(): LevelDef {
  const H = 14;
  const items = new Items('hunt');
  for (const [x, z] of [[12.5, 12.5], [-12.5, 12.5], [-12.5, -12.5]]) items.add('cap', x, ITEM_Y, z);
  const crates = [[-5, 2], [5, -2], [-2, -6], [3, 6]] as const;
  return {
    ...empty(),
    id: 'hunt',
    name: 'Roach Hunt',
    blurb: 'Five sewer roaches. Beat every one.',
    solids: [...room(H), ...crates.map(([x, z]) => crate(x, z))],
    crateContents: crates.map(() => null),
    spawn: { x: 0, y: 0, z: 11, facing: Math.PI },
    collectibles: items.list,
    enemies: [hunter(-8, -8, H), hunter(8, -8, H), hunter(-9, 2, H), hunter(9, 3, H), hunter(0, -11, H)],
    goals: [{ type: 'defeat', label: 'Defeat the roaches' }],
    exit: doorOn('west', H),
  };
}

function waves(): LevelDef {
  const H = 12;
  const items = new Items('waves');
  for (const [x, z] of [[10.4, 10.4], [-10.4, 10.4], [10.4, -10.4], [-10.4, -10.4]]) items.add('cap', x, ITEM_Y, z);
  items.add('relic', 0, 0.6 + 1.1, 0); // over the middle step
  const crates = [[-5, 5], [5, 5], [-5, -5], [5, -5]] as const;
  return {
    ...empty(),
    id: 'waves',
    name: 'Endurance',
    blurb: 'Three waves of roaches. Heal from the crates.',
    solids: [...room(H), block('platform', 0, 0, 3, 3, 0.6), ...crates.map(([x, z]) => crate(x, z))],
    crateContents: crates.map(() => null),
    // Story: the royal mark, high on the far wall of the old training hall.
    decor: [{ kind: 'mark', glyph: 'crown', x: 0, y: 3.2, z: -H + 0.03, yaw: 0, size: 1.0, color: 0x7d6a92 }],
    storySpots: { royal: { x: 0, y: 3.2, z: -H } },
    spawn: { x: 0, y: 0, z: 8, facing: Math.PI },
    collectibles: items.list,
    waves: [
      [hunter(-8, -9, H), hunter(8, -9, H)],
      [hunter(-9, 0, H), hunter(9, 0, H), hunter(0, -9, H)],
      [hunter(-8, -9, H), hunter(8, -9, H), hunter(-9, 3, H), hunter(9, 3, H)],
    ],
    goals: [{ type: 'waves', label: 'Survive the waves' }],
    exit: doorOn('east', H),
  };
}

function leap(): LevelDef {
  const H = 36;
  const max = maxRunJumpDistance();
  const gap = Math.round(max * 0.9 * 100) / 100; // edge to edge: close to the most a running jump can cover
  const solids = room(H, false);
  const items = new Items('leap');
  // A long start pad, then platforms with a gap between each, then the goal pad.
  const startZ = 28;
  solids.push(block('platform', 0, startZ, 4, 4, 0, -1));
  let front = startZ - 2; // the near edge of whatever comes next
  const lengths = 2.4;
  const centres: Array<[number, number]> = [];
  const fronts: number[] = []; // the near edge each platform is measured from
  for (let i = 0; i < 6; i++) {
    fronts.push(front);
    const zc = front - gap - lengths / 2;
    const xc = i % 2 === 0 ? 0.8 : -0.8;
    solids.push(block('platform', xc, zc, 2.6, lengths, 0, -1));
    centres.push([xc, zc]);
    front = zc - lengths / 2;
  }
  const goalZ = front - gap - 2.5;
  solids.push(block('platform', 0, goalZ, 5, 5, 0, -1));
  // Story: a carved stone at the far corner of the goal platform, with the adventurers' mark on the side he comes from.
  const stone = { x: -1.95, y: 0, z: Math.max(goalZ - 1.95, -H + 0.45) }; // the platform runs under the north wall, so keep it clear of that
  solids.push(block('pillar', stone.x, stone.z, 0.8, 0.8, 1.7));
  // Bonus: relics over three of the platforms, crumbs hanging at the top of three jumps.
  for (const i of [1, 3, 5]) items.add('relic', centres[i][0], 0.9, centres[i][1]);
  for (const i of [0, 2, 4]) items.add('crumb', ((i === 0 ? 0 : centres[i - 1][0]) + centres[i][0]) / 2, 2.3, fronts[i] - gap / 2);
  return {
    ...empty(),
    id: 'leap',
    noGrab: true,
    noLongJump: true,
    name: 'Leap of Faith',
    blurb: 'Gaps at the limit of a running jump. Time every leap.',
    solids,
    pit: extent('floor', -H, H, -8.2, -8, -H, H),
    decor: [{ kind: 'mark', x: stone.x, y: 1.15, z: stone.z + 0.4, yaw: 0, size: 0.27 }],
    storySpots: { stone },
    spawn: { x: 0, y: 0, z: startZ, facing: Math.PI },
    collectibles: items.list,
    goals: [{ type: 'reach', x: 0, y: 0, z: goalZ, radius: 2.2, label: 'Reach the far platform' }],
    exit: doorOn('north', H),
  };
}

function crates(): LevelDef {
  const H = 14;
  const items = new Items('crates');
  const spots: Array<[number, number]> = [];
  for (const z of [-9, -3, 3, 9]) for (const x of [-9, -3, 3, 9]) spots.push([x, z]);
  const contents: Array<string | null> = spots.map(() => null);
  // Six crates hold cheese crumbs, three hold bottle caps, and the rest are empty.
  [1, 4, 6, 9, 11, 14].forEach((i) => (contents[i] = items.add('crumb', spots[i][0], ITEM_Y, spots[i][1], i)));
  [0, 7, 15].forEach((i) => (contents[i] = items.add('cap', spots[i][0], ITEM_Y, spots[i][1], i)));
  return {
    ...empty(),
    id: 'crates',
    name: 'Crate Search',
    blurb: 'Sixteen crates. Smash them to find six crumbs.',
    solids: [...room(H), ...spots.map(([x, z]) => crate(x, z))],
    crateContents: contents,
    // Story: one of the crumb crates also holds a little wooden whistle (see STORY.crates).
    storySpots: { keepsake: { x: spots[9][0], y: 0, z: spots[9][1] } },
    spawn: { x: 0, y: 0, z: 12, facing: Math.PI },
    collectibles: items.list,
    goals: [{ type: 'collect', kind: 'crumb', count: 'all', label: 'Find the hidden crumbs' }],
    exit: doorOn('north', H),
  };
}

const built: LevelDef[] = [sewer(), caps(), hunt(), waves(), leap(), crates(), waterworks(), ...kingdomLevels(), pumpworks(), junction(), cistern(), foundry(), foundryShaft(), foundryCellars(), hollows(), hollowsWebs(), hollowsFaith(), hollowsDark(), hollowsPit(), keep(), throne(), cisternWorks(), sludgePit()];
const rank = (l: LevelDef): number => {
  const i = (CAMPAIGN as readonly string[]).indexOf(l.id);
  return i < 0 ? CAMPAIGN.length : i;
};
/** Every level, in the order he plays them: the fourteen campaign rooms, then any bonus rooms. */
/** Every level there is, in the old campaign order, the archive included. */
export const ALL_LEVELS: LevelDef[] = built.map((l, i) => ({ l, i })).sort((a, b) => rank(a.l) - rank(b.l) || a.i - b.i).map((e) => e.l);

/** The game: the Club and the worlds' areas. */
export const LEVELS: LevelDef[] = ALL_LEVELS.filter((l) => l.hub || !!l.world);

/**
 * Retired: the first levels, from before the worlds. Most now live on inside a world in a better form (the Waterworks,
 * the Lift Shaft, Web Hollow, Leap of Faith...), and the plain ones (Crate Search, Cap Collector, Roach Hunt, Endurance)
 * were not carried over. They are not in the menus, the counts or the Club, but they are kept: the parked story is
 * staged in them, and #level=<id> still opens one (for working on that story, or bringing one back).
 */
export const ARCHIVE: LevelDef[] = ALL_LEVELS.filter((l) => !l.hub && !l.world);

let extra: () => LevelDef[] = () => [];
/** Levels from outside the built-in list (the player's own, from the builder). */
export function setExtraLevels(f: () => LevelDef[]): void {
  extra = f;
}

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id) ?? extra().find((l) => l.id === id) ?? ARCHIVE.find((l) => l.id === id);
}
