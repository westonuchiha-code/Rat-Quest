/**
 * World Three: the Hollows. A vast cave under the roots, split by a chasm with no bottom. Where the Cistern climbs and the
 * Foundry burns, the Hollows drops: most of it is about getting down, and across, without falling into the dark.
 * A fall costs a heart and puts him back on the last ground he stood on (fallBack). The old Web Hollow and Leap of Faith
 * are its side areas.
 *
 *   SOUTH  The Mouth: he comes in high up. The Lip, a stone tongue, juts out over the chasm. Stairs go down the east side
 *          to the Undershelf, the ground below.
 *   MIDDLE Spider Rock, standing up out of the chasm, 13.5 out from the end of the Lip and 6 below it: a long jump lands
 *          it easily, a double jump only if timed just right. Or ride the slider out from the Root Shelf and jump the last gap. Off the rock you drop to the Faith Stones.
 *   ACROSS The Faith Stones: a line of narrow pillars over the chasm, a double jump apart, from the Undershelf to the north.
 *   WEST   The Webbed Gallery: three ledges over the drop joined by rope bridges, crawling with beasts. The door to Web
 *          Hollow is on the middle ledge.
 *   NORTH  The Mushroom Climb: giant caps, each a double jump higher than the last, up to the High Hollow in the wall.
 *          The ways there are held: a hornet lancer over the east bank, two ant pikemen where the west path comes out.
 *          And over the west end of the Undershelf a firefly bomber flies, dropping fire.
 *   NE     The Crystal Grotto, lit by crystals; the door to Leap of Faith is inside. Its roof is worth a look.
 *   Three golden relics are hidden round the cave; find all three and a wedge appears in the grotto.
 *
 * Room: x -48..48, z -48..48; north is -z. A flat double jump carries about 10; down 6, a long jump carries about 13.6.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import type { GoalDef, LevelDef, WedgeDef } from './types';
import { doorOn } from '../world/rooms';
import { extent, type Box } from '../world/layout';
import { Items, block, room } from './builders';
import { maxRunJumpDistance } from './jumpMath';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const collect = (kind: 'crumb' | 'cap' | 'relic', label: string): GoalDef => ({ type: 'collect', kind, count: 'all', label });
const goalsOf = (ws: WedgeDef[]): GoalDef[] => ws.map((w) => w.appears ?? { type: 'reach', x: w.x, y: w.y, z: w.z, radius: 1.5, label: w.name });
/** The room's own walls in cave rock (the older themes show sewer brick there). */
const rockWalls = (def: LevelDef): Box[] => def.solids.map((b, i) => (i < 4 ? { ...b, skin: 'roughRock' as const } : b));

// ---- Heights ----
const MOUTH = 16;
export const ROCK = 10;
const SHELF = 10;
const GALLERY = 4;
export const HIGH = 20;
const DEEP = -24; // how far down the columns go into the dark

/** Spider Rock. The Lip ends at z 22, 13.5 short of it: a long jump lands it easily, a double jump only if timed just right. */
export const ROCK_BOX = { x0: -6, x1: 6, z0: -4, z1: 8.5 };
export const LIP = { x0: -3, x1: 3, z0: 22, z1: 38 };
/** The Faith Stones (2 x 2 tops), south to north. */
export const STONES = [23.5, 14, 4.5, -5, -14.5, -24].map((z) => ({ x0: -11, x1: -9, z0: z - 1, z1: z + 1 }));
/** The mushroom caps, each 3.5 higher than the last, then the High Hollow. */
export const CAPS = [
  { x: 16, z: -34, top: 3 },
  { x: 21, z: -40, top: 6.5 },
  { x: 16, z: -45, top: 10 },
  { x: 9, z: -41, top: 13 },
  { x: 3, z: -36, top: 16.5 },
];
const GALLERY_LEDGES = [
  { x0: -48, x1: -34, z0: 14, z1: 32 },
  { x0: -48, x1: -34, z0: -8, z1: 8 },
  { x0: -48, x1: -34, z0: -28, z1: -14 },
];

/** The east bank's hornet, and the north floor's two pikemen with the floor they keep to (its west end). */
export const BANK_HORNET = { x: 32, z: -16 };
/** (Well back from the mouth of the west path, so that he is out on the open floor before they see him, clear of the brazier there.) */
export const NORTH_ANTS = [{ x: -28, z: -45 }, { x: -24, z: -45 }];
export const NORTH_WEST_FLOOR = { x0: -48, x1: -4, z0: -48, z1: -30 };
/**
 * The Undershelf's firefly: over its west end, where the ways to the gallery, the west path and the Faith Stones part.
 * Its air: that end of the shelf and out over the chasm beside it (clear of Spider Rock and the pillars under the Mouth).
 */
export const SHELF_FIREFLY = { x: -30, z: 40 };
export const FIREFLY_AIR = { x0: -47, x1: -13, z0: 22, z1: 47 };

const cave: CustomLevel = {
  name: 'The Hollows',
  blurb: 'A cave split by a chasm with no bottom. Spider Rock, the Faith Stones, a gallery of webs and a climb up giant mushrooms.',
  theme: 'cave',
  music: 'echo',
  width: 96, depth: 96, wallHeight: 40,
  pieces: [
    // ---- Ground: the Undershelf (south), the north floor, the west path, the east bank. The rest is the chasm. ----
    box('floor', -48, 32, 48, 48, 0),
    box('floor', -48, -48, 48, -30, 0),
    box('floor', -30, -30, -22, 32, 0),
    box('floor', 22, -30, 48, 32, 0),

    // ---- South: the Mouth, the Lip and the stair down ----
    box('platform', -12, 38, 12, 48, MOUTH, { bottom: MOUTH - 1, skin: 'wetRock' }),
    box('pillar', -12, 38, -10, 40, MOUTH - 1), box('pillar', 10, 38, 12, 40, MOUTH - 1),
    box('pillar', -12, 46, -10, 48, MOUTH - 1), box('pillar', 10, 46, 12, 48, MOUTH - 1),
    box('platform', LIP.x0, LIP.z0, LIP.x1, LIP.z1, MOUTH, { bottom: MOUTH - 1, skin: 'wetRock' }),
    box('stairs', 12, 41, 32, 47, MOUTH, { dir: 'w', bottom: 0 }),
    at('spawn', 0, 43, MOUTH),
    at('exit', 0, 48, MOUTH),

    // ---- Spider Rock, its larder ledge, and the slider from the Root Shelf ----
    box('pillar', ROCK_BOX.x0, ROCK_BOX.z0, ROCK_BOX.x1, ROCK_BOX.z1, ROCK, { bottom: DEEP }),
    box('platform', -2, ROCK_BOX.z1, 2, 11, 3, { bottom: 2.5, skin: 'wetRock' }),
    box('platform', 36, -4, 48, 8, SHELF, { bottom: 0 }),
    box('stairs', 38, 8, 46, 20, SHELF, { dir: 'n', bottom: 0 }),
    box('lift', 33, 0, 36, 3, SHELF, { props: { move: 'w', travel: 20, speed: 2.4, pause: 1.5 } }),

    // ---- The Faith Stones ----
    ...STONES.map((s) => box('pillar', s.x0, s.z0, s.x1, s.z1, 0, { bottom: DEEP, skin: 'wetRock' })),

    // ---- West: the Webbed Gallery ----
    ...GALLERY_LEDGES.map((g) => box('platform', g.x0, g.z0, g.x1, g.z1, GALLERY, { bottom: DEEP, skin: 'wetRock' })),
    box('stairs', -46, 32, -38, 37, GALLERY, { dir: 'n', bottom: 0 }),
    box('bridge', -43, 8, -40, 14, GALLERY), box('bridge', -43, -14, -40, -8, GALLERY),
    at('roach', -40, 26, GALLERY), at('roach', -44, -18, GALLERY),
    // An orchid mantis holds the middle ledge, facing the bridge he comes over. (It keeps to the ledge: it will not hop or leap off it.)
    at('mantis', -40, -1, GALLERY, { dir: 's' }),
    at('toad', -44, 2, GALLERY), at('toad', -39, -24, GALLERY),
    // Two flitters roost over the first ledge: sneak past under them, or wake them and fight on the ledge.
    at('bat', -44, 19, GALLERY), at('bat', -39, 23, GALLERY),

    // ---- The ways north are held. Over the east bank, a hornet lancer, the chasm at his elbow; and where the west
    // path comes out on the north floor, two ant pikemen. (None of them is on the gallery: its wedge does not ask for them.) ----
    at('hornet', BANK_HORNET.x, BANK_HORNET.z, 0, { dir: 's' }),
    at('ant', NORTH_ANTS[0].x, NORTH_ANTS[0].z, 0, { dir: 's' }), at('ant', NORTH_ANTS[1].x, NORTH_ANTS[1].z, 0, { dir: 's' }),
    // And over the west end of the Undershelf, a firefly bomber: its lantern is the first light he sees down there.
    at('firefly', SHELF_FIREFLY.x, SHELF_FIREFLY.z, 0, { dir: 'e' }),

    // ---- North: the Mushroom Climb and the High Hollow ----
    ...CAPS.flatMap((c) => [
      box('platform', c.x - 2, c.z - 2, c.x + 2, c.z + 2, c.top, { bottom: c.top - 0.6, skin: 'mushroomPatch' }),
      box('pillar', c.x - 0.6, c.z - 0.6, c.x + 0.6, c.z + 0.6, c.top - 0.6, { skin: 'stalagmite' }),
    ]),
    box('platform', -4, -48, 2, -44, HIGH, { bottom: HIGH - 1, skin: 'wetRock' }),

    // ---- North-east: the Crystal Grotto (a low room, open on its west side) ----
    box('wall', 30, -48, 31, -43, 6, { skin: 'crystalRock' }), box('wall', 30, -39, 31, -34, 6, { skin: 'crystalRock' }),
    box('wall', 30, -34, 48, -33, 6, { skin: 'crystalRock' }),
    box('platform', 30, -48, 48, -33, 6.5, { bottom: 6 }),

    // ---- Relics, caps and cheese ----
    at('relic', 35, -45, 6.5), at('relic', -46, -26, GALLERY), at('relic', 0, 9.8, 3),
    at('cap', -10, 46, MOUTH), at('cap', 46, 6, SHELF), at('cap', 16, -45, 10), at('cap', -26, -20), at('cap', 44, 44),
    at('crumb', 0, 42), at('crumb', 20, 36), at('crumb', -20, 36), at('crumb', 0, 26, MOUTH),
    at('crumb', -26, 10), at('crumb', -26, -10), at('crumb', -40, 20, GALLERY), at('crumb', -41, -4, GALLERY), at('crumb', -41, -22, GALLERY),
    at('crumb', -10, -36), at('crumb', 16, -34, 3), at('crumb', 9, -41, 13), at('crumb', 28, 0), at('crumb', 28, 20), at('crumb', 40, 2, SHELF),
    at('crumb', -10, 14), at('crumb', -10, -24),

    // ---- People ----
    at('npc', -5, 43, MOUTH, { props: { name: 'Finch', kind: 'bird', lines: [
      'Chirp! The Hollows. Listen... hear that? Nothing. That is how deep the chasm goes.',
      'Spider Rock, down there in the middle. Run off the end of the Lip, let go of RUN and jump: a long jump. You might just land on it.',
      'Fall in and you lose a heart, but you climb back out where you were. Do not make a habit of it.',
      'There is a door under the Mouth that goes somewhere very dark. You would want a lamp. I am not going in there.',
    ] } }),
    at('npc', 26, -38, 0, { props: { name: 'Wren', kind: 'bird', lines: [
      'Chirp! The crystals in that grotto sing if you listen. Well, hum.',
      'There are three golden relics hidden in the Hollows. Find them all and the grotto gives something back.',
      'Someone left a door in there too. It goes to a place with a lot of very small floors.',
    ] } }),

    // ---- Light and dressing ----
    at('light', 4, -2, ROCK, { props: { color: 'purple' } }),
    at('light', 0, -45, HIGH, { props: { color: 'yellow' } }),
    at('light', 35, -36, 0, { props: { color: 'blue' } }), at('light', 46, -46, 0, { props: { color: 'purple' } }), at('light', 33, -47, 0, { props: { color: 'blue' } }),
    at('light', 46, 0, SHELF, { props: { color: 'green' } }),
    at('light', 12, -37, 0, { props: { color: 'green' } }), at('light', 25, -35, 0, { props: { color: 'blue' } }),
    at('brazier', -16, 34), at('brazier', 16, 34), at('brazier', -26, -28), at('brazier', 26, -28),
    at('lamp', -9, 42, MOUTH + 2.5), at('lamp', 9, 42, MOUTH + 2.5), at('lamp', 0, 30, MOUTH + 2.5),
    at('lamp', -41, 30, GALLERY + 2.5), at('lamp', -41, -12, GALLERY + 2.5),
    ...[[-16, -10], [14, 18], [18, -16], [-14, 20], [0, -20]].map(([x, z]) => box('pillar', x - 1, z - 1, x + 1, z + 1, 40, { bottom: 31, skin: 'stalagmite' })),
    box('pillar', 26, 24, 28, 26, 3, { skin: 'stalagmite' }), box('pillar', 30, -22, 32, -20, 2.5, { skin: 'stalagmite' }),
    at('web', -47.5, 24, 7, { dir: 'e' }), at('web', -47.5, -4, 8, { dir: 'e' }), at('web', -47.5, -22, 7, { dir: 'e' }),
    at('web', 6.1, 2, 6, { dir: 'e' }), at('web', -6.1, 6, 5, { dir: 'w' }), at('web', -6, -47.5, 18, { dir: 's' }),
    at('slime', 47.5, 26, 9, { dir: 'w' }), at('slime', -20, 47.5, 10, { dir: 'n' }),
    // Crystals: thick in the grotto, and here and there round the cave.
    at('crystal', 34, -46, 0, { props: { color: 'blue' } }), at('crystal', 40, -46.5, 0, { props: { color: 'purple' } }), at('crystal', 46.5, -40, 0, { props: { color: 'blue' } }),
    at('crystal', 43.5, -47, 0, { props: { color: 'purple' } }), at('crystal', 33, -36, 0, { props: { color: 'blue' } }),
    at('crystal', -2.5, -47, HIGH, { props: { color: 'purple' } }), at('crystal', -46.5, 30, GALLERY, { props: { color: 'blue' } }),
    at('crystal', -45, 46, 0, { props: { color: 'blue' } }), at('crystal', 46, 30, 0, { props: { color: 'purple' } }), at('crystal', 46.5, -6, SHELF, { props: { color: 'blue' } }),
    // Roots hanging from the roof: over the chasm, the Mouth and the gallery.
    ...[[-18, 0, 26], [14, -10, 24], [8, 16, 27], [-14, -22, 25], [20, 6, 28], [0, 36, 22], [-41, 18, 10], [-41, -18, 10], [-40, -2, 11], [30, -18, 9], [16, -30, 21]].map(([x, z, b]) => at('roots', x, z, b)),
    // Two torches either side of the way out: someone came this way before.
    at('torch', -3, 47.7, MOUTH + 2.5, { dir: 's' }), at('torch', 3, 47.7, MOUTH + 2.5, { dir: 's' }),
  ],
};

export const HOLLOWS_WEDGES: WedgeDef[] = [
  { id: 'rock', name: 'Spider Rock', hint: 'A running leap off the end of the Lip (a long jump, or a double jump timed just right), or the slider from the Root Shelf.', x: 0, y: ROCK, z: 3, appears: null },
  { id: 'faith', name: 'The Faith Stones', hint: 'Out along the stones over the chasm. Each one is a double jump.', x: -10, y: 0, z: -5, appears: null },
  { id: 'gallery', name: 'The Webbed Gallery', hint: 'Beat every beast on the gallery ledges.', x: -41, y: GALLERY, z: 0, appears: { type: 'defeat', label: 'Clear the gallery' } },
  { id: 'high', name: 'The High Hollow', hint: 'Up the giant mushrooms, each a double jump higher, to the nook in the north wall.', x: -1, y: HIGH, z: -46, appears: null },
  { id: 'relics', name: 'Three Relics', hint: 'One on a roof, one in the gallery, one in the spider\'s larder.', x: 40, y: 0, z: -40, appears: collect('relic', 'Find the three relics') },
];

export function hollows(): LevelDef {
  const def = compileCustom(cave, 'hollows');
  // The gallery's beasts keep to their own ledge (it is a long way down).
  // (And the gallery's wedge asks for the beasts on the gallery, as it says: nothing off it counts towards it.)
  const enemies = def.enemies.map((e) => {
    const g = GALLERY_LEDGES.find((l) => e.x > l.x0 && e.x < l.x1 && e.z > l.z0 && e.z < l.z1);
    if (g) return { ...e, arena: { x0: g.x0 + 1.5, x1: g.x1 - 1, z0: g.z0 + 1, z1: g.z1 - 1 } };
    const F = NORTH_WEST_FLOOR;
    if (e.type === 'firefly') return { ...e, uncounted: true, arena: FIREFLY_AIR };
    return e.type === 'ant' ? { ...e, uncounted: true, arena: { x0: F.x0 + 1, x1: F.x1 - 1, z0: F.z0 + 1, z1: F.z1 - 1 } } : { ...e, uncounted: true };
  });
  return {
    ...def,
    world: 'hollows',
    fallBack: true,
    solids: rockWalls(def),
    enemies,
    courseDoors: [
      { to: 'webs', name: 'Web Hollow', need: 0, door: doorOn('west', 48, 0, 48, GALLERY) },
      // On the gallery's north ledge: the way down to what has been spinning all these webs.
      { to: 'brood', name: 'The Brood Pit', need: 0, door: doorOn('west', 48, -21, 48, GALLERY) },
      { to: 'faith', name: 'Leap of Faith', need: 0, door: doorOn('east', 48, -41, 48, 0) },
      // Under the Mouth, in the south wall: the way into the dark.
      { to: 'dark', name: 'The Lightless Way', need: 0, door: doorOn('south', 48, -24, 48, 0) },
    ],
    fogRange: [30, 125],
    wedges: HOLLOWS_WEDGES,
    goals: goalsOf(HOLLOWS_WEDGES),
  };
}

// ======================================================================================================================
// Side area: Web Hollow (the old level, now off the Webbed Gallery). In by the bottom; the far ledge is the prize.

const websArea: CustomLevel = {
  name: 'Web Hollow',
  blurb: 'Rope bridges over the dark, cobwebs on the walls and beasts on every ledge. A fall sends you back to the start.',
  theme: 'cave',
  music: 'echo',
  width: 44, depth: 44, wallHeight: 16,
  pieces: [
    box('floor', -8, 14, 8, 22, 0),
    at('spawn', 0, 18),
    at('exit', 0, 22),
    box('bridge', -1.5, 4, 1.5, 14, 0),
    box('floor', -8, -4, 8, 4, 0),
    box('bridge', -16, -1.5, -8, 1.5, 0),
    box('floor', -22, -8, -16, 6, 0),
    box('stairs', -21, -14, -17, -8, 4, { dir: 'n', bottom: 0 }),
    box('platform', -22, -22, -10, -14, 4),
    box('bridge', -10, -19.5, 6, -16.5, 4),
    box('platform', 6, -22, 22, -10, 4),
    at('crumb', 0, 9), at('crumb', 0, 0), at('crumb', -12, 0), at('crumb', -19, -3), at('crumb', -16, -18, 4), at('crumb', -2, -18, 4), at('crumb', 12, -14, 4), at('crumb', 18, -18, 4),
    at('mantis', 0, -1, 0, { dir: 's' }), at('roach', -19, 1), at('toad', -16, -18, 4), at('roach', 14, -14, 4),
    // A flitter roosts over the landing before the stairs.
    at('bat', -19, -4),
    at('web', -21.9, 10, 3, { dir: 'e' }), at('web', 21.9, 6, 4, { dir: 'w' }), at('web', -21.9, -18, 8, { dir: 'e' }), at('web', 0, -21.9, 8, { dir: 's' }), at('web', 10, -21.9, 7, { dir: 's' }),
    at('slime', 21.9, 14, 8, { dir: 'w' }), at('lamp', -6, 20, 3), at('lamp', 6, 20, 3), at('lamp', 0, 2, 3),
    at('brazier', -20, 4), at('brazier', 20, -12, 4), at('light', 21, -21, 4, { props: { color: 'purple' } }),
    at('npc', 5, 18, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! Spiders have been busy down here.', 'Cross the rope bridge, then take the west bridge to the stairs.', 'Mind the drop: there is no floor under the bridges. Fall and you start again from here.'] } }),
  ],
};

export const WEBS_WEDGES: WedgeDef[] = [
  { id: 'far', name: 'The Far Ledge', hint: 'Over both bridges, up the stairs and across the last bridge.', x: 18, y: 4, z: -14, appears: null },
  { id: 'crumbs', name: 'Every Crumb in the Webs', hint: 'Eight crumbs, on the bridges and the ledges.', x: -4, y: 0, z: 18, appears: collect('crumb', 'Find every crumb') },
  // A gear secret (the Moss Scarf): it stands inside the range the west shelf's roach notices him from, and it is only
  // there while that roach sleeps on. In the scarf he is noticed from half as far, and the wedge is outside that.
  { id: 'hush', name: 'The Sleeper\'s Wedge', hint: 'On the west shelf, by the roach. It is gone the moment the roach stirs, and gone for good if the roach dies. You would have to be as quiet as moss.', x: -19.5, y: 0, z: -4.2, appears: { type: 'unseen', radius: 7, label: 'Let the roach sleep' }, gear: 'mossScarf' },
];

export function hollowsWebs(): LevelDef {
  const def = compileCustom(websArea, 'webs');
  return { ...def, world: 'hollows', returnTo: 'hollows', solids: rockWalls(def), wedges: WEBS_WEDGES, goals: goalsOf(WEBS_WEDGES) };
}

// ======================================================================================================================
// Side area: the Brood Pit (off the gallery's north ledge). One round floor, webs on every wall, and the Broodmother
// in the middle of it. Nothing stands on the floor: the fight is all about where he is standing when a blow comes down.
// Beat her and her wedge is where she fell.

/** The floor she fights on (she and her pounces stay inside it; it is a little inside the walls). */
export const PIT_ARENA = { x0: -17, x1: 17, z0: -19, z1: 17 };
const pitArea: CustomLevel = {
  name: 'The Brood Pit',
  blurb: 'A round pit hung with webs, and the Broodmother in the middle of it. Watch which leg goes up.',
  theme: 'cave',
  music: 'march',
  width: 40, depth: 46, wallHeight: 18,
  pieces: [
    box('floor', -20, -23, 20, 23, 0),
    at('spawn', 0, 20),
    at('exit', 0, 23),
    // Rock piers in the four corners, so the floor reads as round and the walls are not bare.
    box('pillar', -20, -23, -16.5, -19.5, 18), box('pillar', 16.5, -23, 20, -19.5, 18), box('pillar', -20, 19.5, -16.5, 23, 18), box('pillar', 16.5, 19.5, 20, 23, 18),
    // Her webs, all the way round, and her larder's crystals glowing through them.
    ...[-12, 0, 12].flatMap((z) => [at('web', -19.9, z, 5, { dir: 'e' }), at('web', 19.9, z, 6, { dir: 'w' })]),
    ...[-10, 0, 10].map((x) => at('web', x, -22.9, 6, { dir: 's' })),
    at('web', -9, 22.9, 7, { dir: 'n' }), at('web', 9, 22.9, 7, { dir: 'n' }),
    at('slime', -19.9, 6, 9, { dir: 'e' }), at('slime', 19.9, -6, 9, { dir: 'w' }),
    at('crystal', -14, -21.3, 0, { props: { color: 'purple' } }), at('crystal', 14, -21.3, 0, { props: { color: 'purple' } }), at('crystal', -18.9, 2, 0, { props: { color: 'blue' } }), at('crystal', 18.9, -3, 0, { props: { color: 'blue' } }),
    // (Everything that stands on the floor stands outside the part of it she fights on.)
    at('lamp', -8, 21, 4), at('lamp', 8, 21, 4), at('brazier', -18.9, 12), at('brazier', 18.9, 12), at('brazier', -18.9, -12), at('brazier', 18.9, -12),
    at('light', 0, -22, 0, { props: { color: 'red' } }), at('light', -15.3, 22, 0, { props: { color: 'purple' } }), at('light', 15.3, 22, 0, { props: { color: 'purple' } }),
    at('roots', -6, -22.5, 10), at('roots', 7, -22.5, 11),
  ],
};

export const PIT_WEDGES: WedgeDef[] = [
  { id: 'brood', name: 'The Broodmother', hint: 'Beat her. Step out from under the leg that goes up, jump the scissor, run from the pounce, and get out of her shadow when the thread twangs. Hit her while her spikes are stuck.', x: 0, y: 0, z: -4, appears: { type: 'defeat', label: 'Beat the Broodmother' } },
];

export function hollowsPit(): LevelDef {
  const def = compileCustom(pitArea, 'brood');
  return {
    ...def,
    world: 'hollows',
    returnTo: 'hollows',
    solids: rockWalls(def),
    // She lurks in the middle, facing the way he comes in.
    enemies: [...def.enemies, { type: 'brood', x: 0, y: 0, z: -4, facing: 0, arena: PIT_ARENA, respawn: false }],
    fogRange: [26, 90],
    wedges: PIT_WEDGES,
    goals: goalsOf(PIT_WEDGES),
  };
}

// ======================================================================================================================
// Side area: Leap of Faith (the old level, now off the Crystal Grotto). Gaps at the limit of one running jump; no grabbing
// and no long jump here. The door back is behind where he comes in.

export function hollowsFaith(): LevelDef {
  const H = 36;
  const gap = Math.round(maxRunJumpDistance() * 0.9 * 100) / 100;
  const solids: Box[] = room(H, false).map((b) => ({ ...b, skin: 'roughRock' }));
  const items = new Items('faith');
  // The start pad runs back to the south wall (where the door is), then platforms with a gap between each, then the far pad.
  const startZ = 28;
  solids.push({ ...extent('platform', -2, 2, -1, 0, startZ - 2, H), skin: 'wetRock' });
  let front = startZ - 2;
  const lengths = 2.4;
  const centres: Array<[number, number]> = [];
  const fronts: number[] = [];
  for (let i = 0; i < 6; i++) {
    fronts.push(front);
    const zc = front - gap - lengths / 2;
    const xc = i % 2 === 0 ? 0.8 : -0.8;
    solids.push({ ...block('platform', xc, zc, 2.6, lengths, 0, -1), skin: 'wetRock' });
    centres.push([xc, zc]);
    front = zc - lengths / 2;
  }
  const farZ = front - gap - 2.5;
  solids.push({ ...block('platform', 0, farZ, 5, 5, 0, -1), skin: 'wetRock' });
  for (const i of [1, 3, 5]) items.add('relic', centres[i][0], 0.9, centres[i][1]);
  for (const i of [0, 2, 4]) items.add('crumb', ((i === 0 ? 0 : centres[i - 1][0]) + centres[i][0]) / 2, 2.3, fronts[i] - gap / 2);
  const wedges: WedgeDef[] = [
    { id: 'far', name: 'The Far Side', hint: 'Six leaps, each at the very edge of a running jump.', x: 0, y: 0, z: farZ, appears: null },
    { id: 'relics', name: 'Relics Over the Dark', hint: 'Take the three relics on the way across.', x: -1.4, y: 0, z: startZ + 2, appears: collect('relic', 'Take the three relics') },
  ];
  return {
    id: 'faith',
    name: 'Leap of Faith',
    blurb: 'Gaps at the limit of a running jump, over nothing. No grabbing, no long jump. Time every leap.',
    theme: 'cave',
    music: 'echo',
    fog: 0x0e1420,
    world: 'hollows',
    returnTo: 'hollows',
    noGrab: true,
    noLongJump: true,
    solids,
    pit: extent('floor', -H, H, -8.2, -8, -H, H),
    water: [],
    waves: [],
    gear: [],
    enemies: [],
    crateContents: [],
    decor: [{ kind: 'web', x: -H + 0.1, y: 4, z: 0, yaw: Math.PI / 2, r: 2 }, { kind: 'web', x: H - 0.1, y: 5, z: -12, yaw: -Math.PI / 2, r: 1.8 }],
    spawn: { x: 0, y: 0, z: startZ, facing: Math.PI },
    collectibles: items.list,
    wedges,
    goals: goalsOf(wedges),
    exit: doorOn('south', H),
  };
}

// ======================================================================================================================
// Side area: the Lightless Way (a secret, off the Undershelf). Stones winding over a drop in near-total dark: without a
// light he sees about five steps, and the next stone is just past that. A miner's lamp shows the way.

/** How far he can see in here (the fog). A lamp on his helmet pushes it back. */
export const DARK_FOG: [number, number] = [1, 5];
/** The stones, south to north: [x, top, z]. Evenly spaced (7.2 apart) but turning, so he must see where the next one is. */
export const DARK_STONES: Array<[number, number, number]> = [
  [0, 0, 33.8], [4.1, 0.5, 27.9], [1.1, 1, 21.4], [-3.5, 1, 15.9], [-9, 1.5, 11.3], [-6.5, 2, 4.5], [-1.4, 2, -0.6], [2.2, 2.5, -6.8], [-1.9, 3, -12.7], [-5.5, 3, -18.9],
];
/** Where he comes in, and the far side. */
export const DARK_START = { x0: -4, x1: 4, z0: 40, z1: 48, top: 0 };
export const DARK_END = { x0: -11.5, x1: 0.5, z0: -29.1, z1: -23.1, top: 3.5 };

const darkArea: CustomLevel = {
  name: 'The Lightless Way',
  blurb: 'A path of stones over a drop, in the dark. You can hardly see the next one. A lamp would help.',
  theme: 'cave',
  music: 'echo',
  width: 40, depth: 96, wallHeight: 16,
  pieces: [
    box('platform', DARK_START.x0, DARK_START.z0, DARK_START.x1, DARK_START.z1, DARK_START.top, { bottom: DEEP, skin: 'wetRock' }),
    at('spawn', 0, 44),
    at('exit', 0, 48),
    ...DARK_STONES.map(([x, top, z]) => box('pillar', x - 1.1, z - 1.1, x + 1.1, z + 1.1, top, { bottom: DEEP, skin: 'wetRock' })),
    box('platform', DARK_END.x0, DARK_END.z0, DARK_END.x1, DARK_END.z1, DARK_END.top, { bottom: DEEP, skin: 'wetRock' }),
    ...[1, 3, 5, 7, 9].map((i) => at('crumb', DARK_STONES[i][0], DARK_STONES[i][2], DARK_STONES[i][1])),
    at('crumb', -2, -24.5, DARK_END.top),
    at('crystal', DARK_END.x0 + 1, DARK_END.z0 + 1, DARK_END.top, { props: { color: 'purple' } }), at('crystal', DARK_END.x1 - 1, DARK_END.z0 + 1, DARK_END.top, { props: { color: 'blue' } }),
    at('torch', -2.5, 47.7, 2.5, { dir: 's' }), at('torch', 2.5, 47.7, 2.5, { dir: 's' }),
  ],
};

export const DARK_WEDGES: WedgeDef[] = [
  { id: 'dark', name: 'The Lightless Way', hint: 'Over the stones in the dark to the far side. Wear a lamp, or jump where you think the next one is.', x: -5.5, y: DARK_END.top, z: -26.1, appears: null },
];

export function hollowsDark(): LevelDef {
  const def = compileCustom(darkArea, 'dark');
  return { ...def, world: 'hollows', returnTo: 'hollows', fallBack: true, fogRange: DARK_FOG, solids: rockWalls(def), wedges: DARK_WEDGES, goals: goalsOf(DARK_WEDGES) };
}
