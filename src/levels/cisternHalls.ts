/**
 * The Great Cistern's other two side halls (beside the Pump Room), made from two of the old flooded levels.
 * Both open off the Cistern and lead back to it; the door back is beside where he comes in.
 *
 *   The Waterworks (off the north-west corner): the old Waterworks hall, huge and flooded. A pump tower in the channel
 *       with steps spiralling up it, galleries along the walls, a high bridge, guards on the plateau at the far end.
 *   The Sludge Pit (off the east wall, by the crate yard): the old Plank Pit. Planks, stones and a raft over the sludge,
 *       toads on the far shore.
 *
 * Their ids are new ('works', 'sludgepit'): the old levels' story scenes stay with the old ids.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import type { GoalDef, LevelDef, WedgeDef } from './types';
import { doorOn } from '../world/rooms';
import { waterworks } from './waterworks';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const collect = (kind: 'crumb' | 'cap', label: string): GoalDef => ({ type: 'collect', kind, count: 'all', label });
const goalsOf = (ws: WedgeDef[]): GoalDef[] => ws.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name });

// ======================================================================================================================
// The Waterworks.

const PLATEAU = 2.4;
export const WORKS_WEDGES: WedgeDef[] = [
  { id: 'tower', name: 'Top of the Pump Tower', hint: 'Out to the island in the channel, then up the steps that spiral round the tower.', x: 0, y: 8, z: 0, appears: null },
  { id: 'guards', name: 'Clear the Waterworks', hint: 'Beat every guard: the landing, both galleries, the island and the plateau.', x: 0, y: PLATEAU, z: -44, appears: { type: 'defeat', label: 'Beat every guard' } },
  { id: 'crumbs', name: 'Sixteen Crumbs', hint: 'On the slabs, the island, the planks, the promenades and the plateau.', x: 8, y: 0, z: 42, appears: collect('crumb', 'Find every crumb') },
];

export function cisternWorks(): LevelDef {
  const base = waterworks();
  // The relic on top of the tower makes way for the wedge. The rest keep their places, under new names so they are not
  // the same pickups as the old hall's.
  const rename = (id: string): string => id.replace(/^works:/, 'cworks:');
  const collectibles = base.collectibles.filter((c) => !(c.kind === 'relic' && Math.abs(c.x) < 0.5 && Math.abs(c.z) < 0.5)).map((c) => ({ ...c, id: rename(c.id) }));
  const HX = 38;
  const HZ = 50;
  return {
    ...base,
    id: 'works',
    name: 'The Waterworks',
    blurb: 'A huge flooded hall off the Cistern: a pump tower in the channel, galleries, a high bridge, and guards on the plateau.',
    world: 'cistern',
    returnTo: 'cistern',
    reward: undefined,
    collectibles,
    crateContents: base.crateContents.map((id) => (id ? rename(id) : id)),
    npcs: [{
      x: 4, z: 42, facing: Math.PI * 0.8, name: 'Finch', kind: 'bird',
      lines: [
        'Chirp! The Waterworks. The whole Cistern drains through here.',
        'You can swim the channel, but the slabs and planks are quicker. Jump while you swim to hop out.',
        'There are steps right up the pump tower in the middle. Guards on the galleries, and more on the plateau.',
      ],
    }],
    storySpots: undefined,
    exit: doorOn('south', HX, 0, HZ, 0),
    wedges: WORKS_WEDGES,
    goals: goalsOf(WORKS_WEDGES),
  };
}

// ======================================================================================================================
// The Sludge Pit.

const pit: CustomLevel = {
  name: 'The Sludge Pit',
  blurb: 'Off the Cistern: planks, stones and a sliding raft over the sludge, and toads on the far shore.',
  width: 48, depth: 48, wallHeight: 12,
  pieces: [
    // The near shore (he comes in here; the door back is behind him), the pool, and the far shore.
    box('floor', -24, 10, 24, 24, 0),
    box('water', -24, -12, 24, 10, -0.85),
    box('floor', -24, -24, 24, -12, 0),
    at('spawn', 0, 20),
    at('exit', 0, 24),
    // A bridge of planks to the island in the middle, and a raft from the island to the far shore.
    box('plank', -1.5, 4, 1.5, 10, 0),
    box('tile', -8, -2, 8, 4, 0),
    box('lift', -1.5, -5, 1.5, -2, 0, { props: { move: 'n', travel: 7, speed: 2.2, pause: 2 } }),
    // Stepping stones down the east side, and a second, harder row down the west (a double jump apart).
    box('stone', 8.5, 1, 10.5, 3, 0), box('stone', 8.5, -2.5, 10.5, -0.5, 0), box('stone', 8.5, -6, 10.5, -4, 0), box('stone', 8.5, -9.5, 10.5, -7.5, 0),
    box('stone', -18, 3, -16, 5, 0), box('stone', -18, -4, -16, -2, 0), box('stone', -18, -10, -16, -8, 0),
    // The far shore: a stair up to a lookout platform.
    box('stairs', -3, -20, 3, -14, 3, { dir: 'n', bottom: 0 }),
    box('platform', -8, -24, 8, -20, 3),
    // Crates and barrels with cheese, near the start.
    at('crate', -8, 16, 0, { props: { item: 'crumb' } }), at('barrel', 8, 16, 0, { props: { item: 'crumb' } }), at('crate', 14, 14, 0, { props: { item: 'cap' } }),
    // Cheese on the bridge, the island, both rows of stones and the far shore.
    at('crumb', 0, 7), at('crumb', 0, 1), at('crumb', 9.5, 2), at('crumb', 9.5, -8.5), at('crumb', -17, 4), at('crumb', -17, -9),
    at('crumb', -14, -17), at('crumb', 14, -17), at('crumb', 4, -22, 3),
    at('cap', -6, -23, 3),
    // Beasts: a roach on the island, toads on the far shore.
    at('roach', -4, 0), at('toad', -12, -18), at('toad', 12, -18),
    at('npc', 6, 20, 0, { props: { name: 'Finch', kind: 'bird', lines: ["Watch those planks! They don't look terribly trustworthy.", 'The stones on the west side are further apart. Double jump, and do not look down. It is only sludge, but still.'] } }),
    at('lamp', -12, 22, 3), at('lamp', 12, 22, 3), at('lamp', -12, -22, 3), at('lamp', 12, -22, 3),
    at('slime', -23.5, 14, 7, { dir: 'e' }), at('window', 23.5, 18, 5, { dir: 'w' }),
    at('fall', -24, -2, 0, { dir: 'e' }),
    at('light', -7, -23, 3, { props: { color: 'green' } }), at('light', 7, -23, 3, { props: { color: 'green' } }),
  ],
};

export const PIT_WEDGES: WedgeDef[] = [
  { id: 'crew', name: 'Clear the Sludge Pit', hint: 'The roach on the island and the two toads on the far shore.', x: 0, y: 3, z: -22, appears: { type: 'defeat', label: 'Beat every beast' } },
  { id: 'crumbs', name: 'Every Crumb in the Sludge', hint: 'On the planks, the island, both rows of stones and the lookout. Two more in the crates.', x: -4, y: 0, z: 18, appears: collect('crumb', 'Find every crumb') },
];

export function sludgePit(): LevelDef {
  const def = compileCustom(pit, 'sludgepit');
  return { ...def, world: 'cistern', returnTo: 'cistern', wedges: PIT_WEDGES, goals: goalsOf(PIT_WEDGES) };
}
