/**
 * Example levels for the builder. Each one shows off a few pieces; open one, press PLAY, then change it and see what happens.
 * The room is x -w/2..w/2 and z -d/2..d/2, north (the door side) is -z.
 */
import type { CustomLevel, Piece } from './custom';

export interface Sample {
  id: string;
  title: string;
  /** What to look at in it. */
  lesson: string;
  level: CustomLevel;
}

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

export const SAMPLES: Sample[] = [
  {
    id: 'first',
    title: '1. First steps',
    lesson: 'A floor, a start, an exit. Crates hold crumbs (select a crate to see "inside"). Goal: collect every crumb.',
    level: {
      name: 'First Steps',
      blurb: 'Smash crates and gather the cheese.',
      width: 30, depth: 30, wallHeight: 10,
      goals: [{ type: 'collect', kind: 'crumb', count: 'all' }],
      pieces: [
        box('floor', -15, -15, 15, 15, 0),
        at('spawn', 0, 11), at('exit', 0, -15),
        at('crate', -6, 4, 0, { props: { item: 'crumb' } }),
        at('crate', 6, 4, 0, { props: { item: 'crumb' } }),
        at('crate', 0, -2), at('crate', 0, -2, 1, { props: { item: 'crumb' } }),
        at('barrel', -8, -6, 0, { props: { item: 'cap' } }),
        at('barrel', 8, -8), at('barrel', 9, -8), at('barrel', 8, -7),
        at('crumb', -10, 10), at('crumb', 10, 10), at('crumb', 0, -9),
        at('npc', 4, 9, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! This is the builder\'s first sample.', 'Crates can hold treats. Break the bottom of a stack and the top one falls!', 'Collect every crumb and the door opens.'] } }),
      ],
    },
  },
  {
    id: 'climb',
    title: '2. Up and over',
    lesson: 'Stairs, platforms and pillars at different heights. Try the Height buttons (right) before dragging out a new piece. Goal: reach the marker.',
    level: {
      name: 'Up and Over',
      blurb: 'Climb to the high platform.',
      width: 36, depth: 40, wallHeight: 14,
      goals: [{ type: 'reach' }],
      pieces: [
        box('floor', -18, -20, 18, 20, 0),
        at('spawn', 0, 16), at('exit', 0, -20),
        box('stairs', -2, 4, 2, 12, 3, { bottom: 0, dir: 'n' }),
        box('platform', -6, -2, 6, 4, 3),
        box('stone', -8, -10, -5, -7, 4.5), box('stone', -3, -10, 0, -7, 6), box('stone', 2, -10, 5, -7, 7.5),
        box('platform', 6, -16, 14, -10, 7.5),
        at('mark', 10, -13, 7.5),
        at('crumb', -6.5, -8.5, 4.5), at('crumb', -1.5, -8.5, 6), at('cap', 10, -12, 7.5),
        box('pillar', -12, 8, -11, 9, 5), box('pillar', 11, 8, 12, 9, 5),
      ],
    },
  },
  {
    id: 'river',
    title: '3. River crossing',
    lesson: 'A river (it pushes you), a grate waterfall, a plank bridge, stepping stones and an island with a prize.',
    level: {
      name: 'River Crossing',
      blurb: 'Cross the river and claim the island prize.',
      width: 40, depth: 40, wallHeight: 12,
      goals: [{ type: 'collect', kind: 'relic', count: 'all' }],
      pieces: [
        box('floor', -20, 6, 20, 20, 0), box('floor', -20, -20, 20, -8, 0),
        box('river', -20, -8, 20, 6, -0.85, { dir: 'e' }),
        at('spawn', 0, 16), at('exit', 0, -20),
        box('plank', -12, -8, -10, 6, 0),
        box('stone', 2, 4, 4, 6, 0), box('stone', 6, 0, 8, 2, 0), box('stone', 10, -4, 12, -2, 0),
        box('platform', 14, -8, 19, -3, 0.5),
        at('relic', 16, -5, 0.5),
        at('fall', -14, -8, 0, { dir: 's' }),
        at('crate', -4, 14), at('crate', -2, 14), at('barrel', 4, 14),
        at('crumb', -11, 0), at('crumb', 3, 5), at('crumb', 7, 1),
      ],
    },
  },
  {
    id: 'arena',
    title: '4. Roach arena',
    lesson: 'Enemies and a "defeat" goal. Pillars give cover. A toad spits from the back. Raise or lower the number of enemies and test with PLAY HERE.',
    level: {
      name: 'Roach Arena',
      blurb: 'Clear out the arena.',
      width: 36, depth: 36, wallHeight: 12,
      goals: [{ type: 'defeat' }],
      pieces: [
        box('floor', -18, -18, 18, 18, 0),
        box('tile', -8, -8, 8, 8, 0.4, { bottom: 0 }),
        at('spawn', 0, 15), at('exit', 0, -18),
        box('pillar', -9, -9, -8, -8, 5), box('pillar', 8, -9, 9, -8, 5), box('pillar', -9, 8, -8, 9, 5), box('pillar', 8, 8, 9, 9, 5),
        at('roach', -4, -2, 0.4), at('roach', 4, -2, 0.4), at('roach', 0, 3, 0.4, { props: { respawn: false } }),
        at('toad', -6, -13), at('toad', 6, -13),
        at('barrel', -14, 12, 0, { props: { item: 'crumb' } }), at('barrel', 14, 12, 0, { props: { item: 'crumb' } }),
        at('npc', -12, 14, 0, { props: { name: 'Pip', kind: 'mouse', lines: ['Squeak! Roaches lunge after a short wind-up. Roll through, or raise your shield.', 'Toads spit sludge. Watch their throats glow.'] } }),
      ],
    },
  },
  {
    id: 'pipes',
    title: '5. Burst the pipes',
    lesson: 'Wall pipes you can smash (they gush water), and a gate that opens when you have. Goal: burst every pipe. The Gate piece waits for the goals.',
    level: {
      name: 'Burst the Pipes',
      blurb: 'Break the pipes to raise the gate.',
      width: 36, depth: 36, wallHeight: 12,
      goals: [{ type: 'burst' }],
      pieces: [
        box('floor', -18, -18, 18, 18, 0),
        at('spawn', 0, 15), at('exit', 0, -18),
        at('pipe', -17, -4, 0, { dir: 'e' }), at('pipe', 17, 2, 0, { dir: 'w' }), at('pipe', -6, -17, 0, { dir: 's' }),
        box('gate', -3, -12, 3, -11, 0),
        at('roach', -5, 0), at('roach', 5, -4),
        at('crate', -10, 10), at('crate', 10, 10), at('barrel', -12, -10, 0, { props: { item: 'cap' } }),
        at('npc', 5, 12, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! See the pipes on the walls? Smash them with your sword.', 'The gate to the north rises when they are all burst.'] } }),
      ],
    },
  },
  {
    id: 'mine',
    title: '6. Mine shaft (a different look)',
    lesson: 'Open LEVEL and change "Look" to try other themes. Select a piece to give it its own picture. Lamps, chains and windows are in DECOR.',
    level: {
      name: 'Mine Shaft',
      blurb: 'Timber, dirt and lantern light.',
      theme: 'mine',
      width: 36, depth: 36, wallHeight: 10,
      goals: [{ type: 'collect', kind: 'crumb', count: 'all' }],
      pieces: [
        box('floor', -18, -18, 18, 18, 0),
        at('spawn', 0, 15), at('exit', 0, -18),
        box('plank', -2, -12, 2, 6, 0.2, { bottom: 0 }), box('stone', -12, -4, -8, 0, 1), box('stone', 8, -4, 12, 0, 1),
        box('pillar', -6, -8, -5, -7, 6), box('pillar', 5, -8, 6, -7, 6),
        at('lamp', -6, -6.5, 4), at('lamp', 6, -6.5, 4), at('lamp', -14, 12, 3), at('lamp', 14, 12, 3),
        at('chain', 0, -2), at('chain', -10, 6), at('window', -17.5, -10, 5, { dir: 'e' }),
        at('crumb', -10, -2, 1), at('crumb', 10, -2, 1), at('crumb', 0, -14), at('crumb', 0, 4),
        at('barrel', -14, 4), at('crate', 14, 4), at('roach', 0, -9),
      ],
    },
  },
  {
    id: 'cave',
    title: '7. Cave pool',
    lesson: 'The cave look, a pool you can swim in, and a piece with its own picture (select the island: "look").',
    level: {
      name: 'Cave Pool',
      blurb: 'Swim to the island in the cave.',
      theme: 'cave',
      width: 36, depth: 36, wallHeight: 12,
      goals: [{ type: 'collect', kind: 'relic', count: 'all' }],
      pieces: [
        box('floor', -18, 4, 18, 18, 0), box('floor', -18, -18, 18, -6, 0),
        box('water', -18, -6, 18, 4, -0.85),
        at('spawn', 0, 15), at('exit', 0, -18),
        box('platform', -3, -3, 3, 3, 0.4, { skin: 'crystalRock' }),
        at('relic', 0, 0, 0.4),
        at('slime', -17.5, -10, 6, { dir: 'e' }), at('lamp', -10, 14, 3), at('lamp', 10, 14, 3),
        at('crumb', -8, 12), at('crumb', 8, 12), at('toad', 0, -12),
      ],
    },
  },
  {
    id: 'waves',
    title: '8. Plates and waves',
    lesson: 'Step on both floor plates to lift the gate. Enemies set to "wave 1/2" arrive after the room is clear and hunt you from anywhere.',
    level: {
      name: 'Plates and Waves',
      blurb: 'Press the plates, then survive the waves.',
      theme: 'dungeon',
      width: 36, depth: 36, wallHeight: 12,
      goals: [{ type: 'waves' }],
      pieces: [
        box('floor', -18, -18, 18, 18, 0),
        at('spawn', 0, 15), at('exit', 0, -18),
        at('plate', -10, 6), at('plate', 10, 6),
        box('gate', -3, -8, 3, -7, 0, { props: { opens: 'plates' } }),
        at('roach', -8, -14, 0, { props: { wave: 1 } }), at('roach', 8, -14, 0, { props: { wave: 1 } }),
        at('roach', -14, -4, 0, { props: { wave: 2 } }), at('toad', 14, -12, 0, { props: { wave: 2 } }), at('roach', 0, -14, 0, { props: { wave: 2 } }),
        at('barrel', -14, 12, 0, { props: { item: 'crumb' } }), at('barrel', 14, 12, 0, { props: { item: 'crumb' } }),
        box('pillar', -5, 0, -4, 1, 5), box('pillar', 4, 0, 5, 1, 5),
        at('npc', 5, 12, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! Stand on both plates to raise the gate.', 'Then the beasts come in waves. They hunt you from anywhere, so keep moving!'] } }),
      ],
    },
  },
  {
    id: 'lifts',
    title: '9. Lifts and sliders',
    lesson: 'Moving platforms carry you. Select one to set which way it glides, how far, how fast and how long it waits. Ride the slider over the gap, then the lift up to the door.',
    level: {
      name: 'Lifts and Sliders',
      blurb: 'Ride the platforms across and up.',
      theme: 'dungeon',
      width: 36, depth: 36, wallHeight: 14,
      pieces: [
        box('floor', -18, 6, 18, 18, 0),
        box('floor', -18, -18, 18, -6, 0),
        at('spawn', 0, 14),
        box('lift', -1.5, 3, 1.5, 6, 0, { props: { move: 'n', travel: 9, speed: 2.5, pause: 2 } }),
        box('lift', -1.5, -11, 1.5, -8, 0, { props: { move: 'up', travel: 6, speed: 2, pause: 2 } }),
        box('platform', -8, -18, 8, -11, 6, { skin: 'mossStone' }),
        at('exit', 0, -18, 6),
        at('crumb', -6, 12), at('crumb', 6, 12), at('crumb', -10, -10), at('crumb', 10, -10),
        at('lamp', -10, 14, 3), at('lamp', 10, 14, 3), at('lamp', 0, -4, 3),
      ],
    },
  },
];
