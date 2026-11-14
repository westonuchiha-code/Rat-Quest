/**
 * The last world: Grimsqueak's Keep. A castle built over the pit where the Deep Engine turns, far below. Everything the
 * other worlds taught comes back here, one after another, on the way up to his throne.
 * A fall into the pit costs a heart and puts him back on the last ground he stood on (fallBack).
 *
 *   SOUTH  The courtyard. Two guards, and a portcullis in the gatehouse wall: stand on both plates and it lifts.
 *          Behind it, the inner ward, a ledge along the wall over the pit.
 *   EAST   The Burning Walk: the ledge along the east wall turns to lava. Stones across it, a double jump apart at the
 *          end, with two toads spitting from the far side.
 *   NORTH  The Broken Stair: steps along the north wall rising west over the pit, some a hop apart, some a double jump.
 *   NW     The landing. A chimney between the north wall and a free-standing wall: wall-kick up it to the Throne Ledge
 *          and the door to his throne room.
 *   WEST   The battlements, off the landing: guards behind the crenels, and a slider out to the Engine Stack, a column in
 *          the middle of the pit with a wedge on top.
 *   Beyond the throne door, the throne room (id 'lair'): Lord Grimsqueak himself. Win, take the wedge, and go home.
 *
 * Room: x -48..48, z -48..48; north is -z.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import type { GoalDef, LevelDef, WedgeDef } from './types';
import { doorOn } from '../world/rooms';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const collect = (kind: 'crumb' | 'cap', label: string): GoalDef => ({ type: 'collect', kind, count: 'all', label });
const goalsOf = (ws: WedgeDef[]): GoalDef[] => ws.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name });

// ---- Heights ----
const WALL = 12;
export const THRONE = 24;
export const STACK = 14;
const DEEP = -30;

/** The Broken Stair, east to west: 3 wide, 8 deep against the north wall, each 1.5 higher; gaps of 3 and 6 by turns. */
export const STAIR = [
  { x0: 23, x1: 26, top: 1.5 },
  { x0: 17, x1: 20, top: 3 },
  { x0: 8, x1: 11, top: 4.5 },
  { x0: 2, x1: 5, top: 6 },
  { x0: -7, x1: -4, top: 7.5 },
  { x0: -13, x1: -10, top: 9 },
  { x0: -22, x1: -19, top: 10.5 },
];
const STAIR_Z = { z0: -48, z1: -40 };
export const LANDING = { x0: -48, x1: -26, z0: -48, z1: -36 };
/** The chimney: between the north wall (z -48) and a free wall whose face is at z -44, over the landing. */
export const CHIMNEY_WALL = { x0: -42, x1: -32, z0: -44, z1: -43 };
export const THRONE_LEDGE = { x0: -32, x1: -22, z0: -48, z1: -42 };
export const STACK_BOX = { x0: -6, x1: 6, z0: -18, z1: -6 };
const BATTLEMENTS = { x0: -48, x1: -38, z0: -36, z1: 14 };
const EAST_FAR = { x0: 38, x1: 48, z0: -38, z1: -20 };
const COURTYARD = { x0: -48, x1: 48, z0: 28, z1: 48 };

const keepArea: CustomLevel = {
  name: "Grimsqueak's Keep",
  blurb: 'His castle, over the pit where the Engine turns. Lava, a broken stair, a chimney to climb, and his throne at the top.',
  theme: 'keep',
  music: 'march',
  width: 96, depth: 96, wallHeight: 44,
  pieces: [
    // ---- South: the courtyard and the gatehouse ----
    box('floor', COURTYARD.x0, COURTYARD.z0, COURTYARD.x1, COURTYARD.z1, 0),
    at('spawn', 0, 42),
    at('exit', 0, 48),
    box('wall', -48, 26, -4, 28, WALL), box('wall', 4, 26, 48, 28, WALL),
    box('platform', -4, 26, 4, 28, WALL, { bottom: 3.5 }),
    box('gate', -4, 26, 4, 28, 0, { props: { opens: 'plates' } }),
    at('plate', -30, 36), at('plate', 30, 36),
    at('roach', -16, 36), at('roach', 16, 36),
    // An ironback guards the west plate. The gatehouse wall is right behind it: let it ram that.
    at('beetle', -30, 31),
    at('crate', -40, 44, 0, { props: { item: 'cap' } }), at('crate', -41, 44), at('crate', -40, 44, 1), at('barrel', 40, 44), at('barrel', 41, 43, 0, { props: { item: 'crumb' } }),

    // ---- The inner ward, along the back of the gatehouse wall ----
    box('floor', -48, 18, 48, 26, 0),

    // ---- East: the Burning Walk ----
    box('floor', 38, 10, 48, 18, 0),
    box('lava', 38, -20, 48, 10, -0.6),
    box('stone', 40, 4, 42, 6, 0.3), box('stone', 44, -3, 46, -1, 0.3), box('stone', 40, -10, 42, -8, 0.3), box('stone', 44, -17, 46, -15, 0.3),
    box('floor', EAST_FAR.x0, EAST_FAR.z0, EAST_FAR.x1, EAST_FAR.z1, 0),
    box('floor', 30, -48, 48, -38, 0),
    at('toad', 43, -30), at('toad', 46, -35),

    // ---- North: the Broken Stair, the landing, the chimney and the Throne Ledge ----
    ...STAIR.map((s) => box('platform', s.x0, STAIR_Z.z0, s.x1, STAIR_Z.z1, s.top, { bottom: DEEP })),
    box('platform', LANDING.x0, LANDING.z0, LANDING.x1, LANDING.z1, WALL, { bottom: DEEP }),
    box('wall', CHIMNEY_WALL.x0, CHIMNEY_WALL.z0, CHIMNEY_WALL.x1, CHIMNEY_WALL.z1, THRONE, { bottom: WALL }),
    box('platform', THRONE_LEDGE.x0, THRONE_LEDGE.z0, THRONE_LEDGE.x1, THRONE_LEDGE.z1, THRONE, { bottom: THRONE - 1 }),

    // ---- West: the battlements, and the slider out to the Engine Stack ----
    box('platform', BATTLEMENTS.x0, BATTLEMENTS.z0, BATTLEMENTS.x1, BATTLEMENTS.z1, WALL, { bottom: DEEP }),
    ...[-32, -24, -18, -6, 2, 10].map((z) => box('wall', -38.8, z, -38, z + 2, WALL + 1.4, { bottom: WALL })),
    at('roach', -43, -26, WALL), at('roach', -43, 4, WALL), at('toad', -44, -10, WALL),
    // Flitters hang from chains over the walk.
    at('bat', -43, -17, WALL, { props: { perch: 'chain' } }), at('bat', -43, 9, WALL, { props: { perch: 'chain' } }),
    box('lift', -38, -13, -35, -10, WALL, { props: { move: 'e', travel: 26, speed: 2.2, pause: 1.5 } }),
    box('pillar', STACK_BOX.x0, STACK_BOX.z0, STACK_BOX.x1, STACK_BOX.z1, STACK, { bottom: DEEP }),

    // ---- Caps: eight ----
    at('cap', -46, 22), at('cap', 41, -9, 0.3), at('cap', 46, -46), at('cap', 9.5, -44, 4.5), at('cap', -11.5, -44, 9),
    at('cap', -46, -46, WALL), at('cap', -46, 12, WALL),

    // ---- Cheese ----
    at('crumb', -20, 40), at('crumb', 20, 40), at('crumb', -20, 22), at('crumb', 20, 22), at('crumb', 43, 14),
    at('crumb', 45, -2, 0.3), at('crumb', 45, -16, 0.3), at('crumb', 41, -34), at('crumb', 36, -44),
    at('crumb', 24.5, -44, 1.5), at('crumb', 18.5, -44, 3), at('crumb', 3.5, -44, 6), at('crumb', -5.5, -44, 7.5), at('crumb', -20.5, -44, 10.5),
    at('crumb', -30, -38, WALL), at('crumb', -43, -20, WALL), at('crumb', -43, 8, WALL),

    // ---- People ----
    at('npc', -6, 42, 0, { props: { name: 'Finch', kind: 'bird', lines: [
      'Chirp... this is it. His keep. They built it right over the pit where the Engine turns.',
      'The portcullis wants both plates down. Then east, along the wall, and do not look at the lava too long.',
      'His throne is at the top, in the north-west. You will have to climb the chimney. Kick off one wall, then the other.',
    ] } }),
    at('npc', -29, -38, WALL, { props: { name: 'Wren', kind: 'bird', lines: [
      'Chirp! The chimney is behind that wall. Jump at one side, kick off it, kick off the other. Up and up.',
      'The battlements are south of here. Guards, and a lift out to the column in the middle. Something shines on it.',
    ] } }),

    // ---- His banners and torches: the gatehouse, the courtyard, the ward, the walk up, the throne door ----
    ...[-38, -24, -10, 10, 24, 38].map((x) => at('banner', x, 28.3, 6, { dir: 'n', props: { color: 'purple' } })),
    ...[-16, 16].map((x) => at('banner', x, 47.7, 6.5, { dir: 's', props: { color: 'purple' } })),
    at('torch', -6, 28.3, 3.5, { dir: 'n' }), at('torch', 6, 28.3, 3.5, { dir: 'n' }),
    at('torch', -8, 47.7, 3, { dir: 's' }), at('torch', 8, 47.7, 3, { dir: 's' }),
    ...[-30, -10, 10, 30].map((x) => at('torch', x, 25.7, 3, { dir: 's' })),
    ...[14, -26, -34].map((z) => at('torch', 47.7, z, 3, { dir: 'e' })),
    at('torch', 18.5, -47.7, 6, { dir: 'n' }), at('torch', 3.5, -47.7, 9, { dir: 'n' }), at('torch', -11.5, -47.7, 12, { dir: 'n' }),
    at('banner', -31.2, -47.7, THRONE + 5, { dir: 'n', props: { color: 'purple' } }), at('banner', -22.8, -47.7, THRONE + 5, { dir: 'n', props: { color: 'purple' } }),
    at('torch', -29.4, -47.7, THRONE + 2.5, { dir: 'n' }), at('torch', -24.6, -47.7, THRONE + 2.5, { dir: 'n' }),
    ...[-28, -12, 8].map((z) => at('banner', -47.7, z, WALL + 6, { dir: 'w', props: { color: 'purple' } })),
    at('torch', -47.7, -20, WALL + 2.5, { dir: 'w' }), at('torch', -47.7, 0, WALL + 2.5, { dir: 'w' }),

    // ---- Light and dressing ----
    at('light', -6, 29, 0, { props: { color: 'purple' } }), at('light', 6, 29, 0, { props: { color: 'purple' } }),
    at('light', -24, -47, THRONE, { props: { color: 'red', flash: 1 } }), at('light', -30, -47, THRONE, { props: { color: 'red', flash: 1 } }),
    at('light', 4, -8, STACK, { props: { color: 'yellow' } }),
    at('light', 47, -37, 0, { props: { color: 'purple' } }), at('light', -47, -35, WALL, { props: { color: 'blue' } }),
    at('brazier', -10, 30), at('brazier', 10, 30), at('brazier', -36, 46), at('brazier', 36, 46),
    at('brazier', 46, 16), at('brazier', 40, -22), at('brazier', -46, -12, WALL),
    at('lamp', -8, 44, 4), at('lamp', 8, 44, 4), at('lamp', 0, 22, 4), at('lamp', -27, -44, THRONE + 3), at('lamp', -37, -40, WALL + 3),
    ...[[-20, -2], [20, -2], [-20, -28], [20, -26], [0, 6]].map(([x, z]) => at('chain', x, z, 6)),
    at('chain', -4, -16, STACK + 6), at('chain', 4, -8, STACK + 6),
    at('window', -47.5, 36, 9, { dir: 'e' }), at('window', 47.5, 36, 9, { dir: 'w' }), at('window', 47.5, -8, 14, { dir: 'w' }), at('window', -47.5, -24, 20, { dir: 'e' }),
  ],
};

export const KEEP_WEDGES: WedgeDef[] = [
  { id: 'walk', name: 'The Burning Walk', hint: 'Through the portcullis, east, and over the lava on the stones.', x: 44, y: 0, z: -24, appears: null },
  { id: 'chimney', name: 'Up the Chimney', hint: 'Up the Broken Stair to the landing, then wall-kick up the chimney to the Throne Ledge.', x: -24, y: THRONE, z: -46, appears: null },
  { id: 'stack', name: 'The Engine Stack', hint: 'From the battlements, ride the slider out over the pit to the column.', x: 0, y: STACK, z: -12, appears: null },
  { id: 'guard', name: "The Keep's Guard", hint: 'Beat every guard: the courtyard, the far end of the Burning Walk, the battlements.', x: 0, y: 0, z: 22, appears: { type: 'defeat', label: 'Beat every guard' } },
  { id: 'caps', name: 'Eight Bottle Caps', hint: 'In a crate, at the end of the ward, on the lava, in the corner, on the stair, on the landing, on the battlements.', x: 8, y: 0, z: 40, appears: collect('cap', 'Find all the caps') },
];

/** Enemies keep to the floor they started on (there is a pit round most of it). */
const FLOORS = [COURTYARD, EAST_FAR, BATTLEMENTS];

export function keep(): LevelDef {
  const def = compileCustom(keepArea, 'keep');
  const enemies = def.enemies.map((e) => {
    const f = FLOORS.find((l) => e.x > l.x0 && e.x < l.x1 && e.z > l.z0 && e.z < l.z1);
    return f ? { ...e, arena: { x0: f.x0 + 1, x1: f.x1 - 1, z0: f.z0 + 1, z1: f.z1 - 1 } } : e;
  });
  return {
    ...def,
    world: 'keep',
    fallBack: true,
    enemies,
    // Far below the pit: the Deep Engine, turning. And the royal mark on the north wall, either side of his door.
    decor: [
      ...def.decor,
      { kind: 'engine', x: 0, y: -50, z: -12, r: 20 },
      { kind: 'mark', glyph: 'crown', x: -34.5, y: THRONE + 4, z: -47.97, yaw: 0, size: 1.1, color: 0x7d6a92 },
      { kind: 'mark', glyph: 'crown', x: -19.5, y: THRONE + 4, z: -47.97, yaw: 0, size: 1.1, color: 0x7d6a92 },
      { kind: 'mark', glyph: 'crown', x: 0, y: 8, z: 47.97, yaw: Math.PI, size: 1.4, color: 0x7d6a92 },
    ],
    courseDoors: [{ to: 'lair', name: "Grimsqueak's Throne", need: 0, door: doorOn('north', 48, -27, 48, THRONE) }],
    fogRange: [35, 140],
    wedges: KEEP_WEDGES,
    goals: goalsOf(KEEP_WEDGES),
  };
}

// ======================================================================================================================
// The throne room. Its id stays 'lair' so his opening speech and what happens after the fight (STORY.lair) still play.
// Not a side area: it is not open from the start (its door opens once he is beaten and the wedge is taken), and the way
// out goes home to the Club, where the ending waits.

const throneRoom: CustomLevel = {
  name: "Grimsqueak's Throne",
  blurb: 'A cold, high hall. He floats over the dais. Dodge the light he throws, and strike when he sinks.',
  theme: 'keep',
  music: 'march',
  width: 40, depth: 52, wallHeight: 16,
  pieces: [
    // The floor in three strips: stone either side, the royal carpet up the middle from the door to the dais.
    box('floor', -20, -26, -2.5, 26, 0), box('tile', -2.5, -11, 2.5, 26, 0), box('floor', 2.5, -26, 20, 26, 0),
    at('spawn', 0, 22),
    box('platform', -8, -26, -2.5, -16, 1.5), box('tile', -2.5, -26, 2.5, -16, 1.5, { bottom: 0 }), box('platform', 2.5, -26, 8, -16, 1.5),
    box('stairs', -3, -16, 3, -11, 1.5, { dir: 'n', bottom: 0 }),
    at('exit', 0, -26, 1.5),
    // He floats over the dais and says nothing until the story's opening scene (STORY.lair) gives him his few lines.
    at('npc', 0, -17, 1.5, { props: { name: 'Lord Grimsqueak', kind: 'villain', lines: [] } }),
    // Columns set into the side walls, so nothing stands in the fight.
    ...[-14, -2, 10, 20].flatMap((z) => [box('pillar', -20, z - 1, -19, z + 1, 16), box('pillar', 19, z - 1, 20, z + 1, 16)]),
    at('brazier', -6, -18, 1.5), at('brazier', 6, -18, 1.5), at('brazier', -10, -12), at('brazier', 10, -12), at('brazier', -12, 14), at('brazier', 12, 14),
    at('lamp', -14, 18, 5), at('lamp', 14, 18, 5), at('lamp', -14, -4, 5), at('lamp', 14, -4, 5),
    at('chain', -6, 0, 9), at('chain', 6, 0, 9), at('chain', -6, 12, 9), at('chain', 6, 12, 9),
    at('light', -7.5, -25.5, 1.5, { props: { color: 'purple' } }), at('light', 7.5, -25.5, 1.5, { props: { color: 'purple' } }),
    at('light', -19, 25, 0, { props: { color: 'red', flash: 1 } }), at('light', 19, 25, 0, { props: { color: 'red', flash: 1 } }),
    at('window', -19.5, -8, 9, { dir: 'e' }), at('window', 19.5, -8, 9, { dir: 'w' }),
    // His banners down both walls and behind the dais, torches under them.
    ...[-8, 4, 16].flatMap((z) => [at('banner', -19.7, z, 7, { dir: 'w', props: { color: 'purple' } }), at('banner', 19.7, z, 7, { dir: 'e', props: { color: 'purple' } })]),
    ...[-8, 4, 16].flatMap((z) => [at('torch', -19.7, z + 4, 3.5, { dir: 'w' }), at('torch', 19.7, z + 4, 3.5, { dir: 'e' })]),
    at('banner', -10, -25.7, 6.8, { dir: 'n', props: { color: 'purple' } }), at('banner', 10, -25.7, 6.8, { dir: 'n', props: { color: 'purple' } }),
    at('crumb', -8, 12), at('crumb', 8, 12), at('crumb', -14, 0), at('crumb', 14, 0),
  ],
};

export const THRONE_WEDGES: WedgeDef[] = [
  { id: 'boss', name: 'Lord Grimsqueak', hint: 'Beat him. Keep moving when he throws, step aside when he dives, jump the ring, and hit the orb back.', x: 0, y: 0, z: -3, appears: { type: 'defeat', label: 'Beat Lord Grimsqueak' } },
];

export function throne(): LevelDef {
  const def = compileCustom(throneRoom, 'lair');
  return {
    ...def,
    world: 'keep',
    // The fight: he sleeps through the opening scene, then comes down into the hall.
    enemies: [...def.enemies, { type: 'grimsqueak', x: 0, y: 0, z: -3 }],
    decor: [
      ...def.decor,
      { kind: 'mark', glyph: 'crown', x: -5, y: 7, z: -25.97, yaw: 0, size: 1.6, color: 0x7d6a92 },
      { kind: 'mark', glyph: 'crown', x: 5, y: 7, z: -25.97, yaw: 0, size: 1.6, color: 0x7d6a92 },
    ],
    storySpots: { throne: { x: 0, y: 1.5, z: -17 }, arena: { x: 0, y: 0, z: -3 } },
    wedges: THRONE_WEDGES,
    goals: goalsOf(THRONE_WEDGES),
  };
}
