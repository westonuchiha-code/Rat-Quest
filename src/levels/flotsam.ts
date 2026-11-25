/**
 * THE GAME, AREA ONE: FLOTSAM (2026-11-25). WORK IN PROGRESS: a first draft to run about in, not a finished level.
 *
 * The owner: "start a second thing that is just going to be the actual game and we're going to build it from front to
 * back ... the first area should be simple but fun it should introduce people to the Aesthetics of the world and some
 * of the characters it should have a few different enemy types and generally teach people how Collectibles work ...
 * similar to the opening of Mario where you have a big area you can run around in ... similar to the beginning of
 * Legend of Zelda Ocarina of Time where you have a little area with different people you can talk to and the game sort
 * of lets you equip Yourself by getting a sword and a shield ... Dark Souls first level is fighting with a broken sword
 * finding your first sword ... and then pretty quickly being thrown into a boss battle before the game really
 * 'starts' ... don't forget that this is a 3D platformer ... floating platforms ... an equilibrium between these".
 *
 * WHAT IT IS. He is washed down the great pipe with a BROKEN SWORD and NO SHIELD (data/equipment.ts, WASHED_UP_GEAR)
 * onto the shore of Flotsam: a few mice and birds living in what the water brings. The only way on is the Old Gate,
 * and the Gatewarden (the Stag Knight) holds it. Nothing is locked: he may walk up to the Warden at once.
 *
 *   THE SHORE (south)   where he lands. One roach, alone: the broken sword takes four blows where a real one takes two.
 *                       A trail of crumbs leads up into the yard.                                       [TEACH: fight, crumbs]
 *   THE YARD (middle)   the big open place (Mario 64's grounds; Kokiri Forest's people). Mort by the fire says what
 *                       is what; Pip sells a SHIELD for crumbs (the Deku Shield: the first thing crumbs are for).
 *   THE WRECK (west)    a climb of ledges, a moving plank and floating boards to the SWORD at the top (the Kokiri
 *                       Sword, by platforming). A bat hangs over the last of it. A hard jump off the top deck: a cap.
 *   THE REEDS (east)    two roaches and a toad on a rock that spits at whoever passes: crumbs under it.  [TEST]
 *   THE GATE (north)    an ant pikeman before it (a real fight for a broken sword), a lantern, and the Warden. [TWIST]
 *
 * Twelve crumbs lie about; the shield costs eight (BALANCE.prices.ratShield).
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor, GateSpec } from '../world/layout';

const HX = 34;
const HZ = 30;
export const FLOTSAM_ID = 'flotsam';
export const FLOTSAM = {
  spawn: { x: 0, z: 21 },
  /** The great pipe's mouth in the south wall: its floor at `y`, this far out of the wall. And where a NEW GAME's knight
   * comes out of it: in the air over the pool, and down he goes. */
  pipe: { half: 1.8, y: 5, high: 3, out: 2.2 },
  arrive: { x: 0, y: 5.6, z: 26.6 },
  /** The pool the great pipe lets out into, along the south wall: the floor stops at `z`, the water lies below it. */
  pool: { z: 23.5, y: -0.3 },
  lanterns: [{ x: 4.5, y: 0, z: 20.5 }, { x: 9, y: 0, z: -8.5 }],
  /** The wall across the north, and the way through it to the Warden. */
  wall: { z: -12, gap: 5, top: 7 },
  /** The gate behind the Warden: it lifts when he is beaten. */
  gate: { z: -27, half: 3, high: 5 },
  warden: { x: 0, z: -21 },
  ant: { x: -2, z: -6 },
  /** The wreck: each step up, in order (x0, z0, x1, z1, top). The third is a plank that glides. */
  steps: [
    [-10, 8, -7, 11, 1.1], [-13.5, 5, -10.5, 8, 2.2],
    [-22.5, 0.5, -19.5, 3.5, 4.3], [-22.5, -5, -19.5, -2, 4.3], [-19.5, -5.5, -16.5, -2.5, 5.4],
  ] as Array<[number, number, number, number, number]>,
  plank: { x0: -16.5, z0: 3, x1: -14, z1: 5.5, top: 3.3, travel: 3.5 },
  deck: { x0: -16.5, z0: -5.5, x1: -9.5, z1: 0, top: 6.5 },
  sword: { x: -12.2, z: -2.8 },
  /** Off the deck's east end, over nothing: a cap for a running jump. */
  capBoard: { x0: -5.5, z0: -3.8, x1: -3.5, z1: -1.8, top: 6.5 },
  toadRock: { x0: 16, z0: 8, x1: 19, z1: 11, top: 1.7 },
  shop: { x: 23, z: -5 },
  fire: { x: 2, z: 7 },
  crumbsNeeded: 8,
} as const;
const F = FLOTSAM;

const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });
const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const mid = (s: readonly [number, number, number, number, number]): [number, number] => [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2];

const room: CustomLevel = {
  name: 'Flotsam',
  blurb: 'Where the great pipe lets out. A broken sword, no shield, and a gate with a warden on it.',
  theme: 'sewer',
  music: 'drift',
  width: HX * 2, depth: HZ * 2, wallHeight: 16,
  pieces: [
    box('floor', -HX, -HZ, HX, F.pool.z, 0),
    // The pool, and the water coming down into it out of the wall (the great pipe). He can swim; the bank is low.
    box('water', -HX, F.pool.z, HX, HZ, F.pool.y),
    // (A fall pours the way it FACES: on the south wall that is north, 's' in this kit's words. Facing 'n' it poured into the wall.)
    at('fall', -6.5, HZ - 0.4, F.pool.y, { dir: 's' }), at('fall', 6.5, HZ - 0.4, F.pool.y, { dir: 's' }),
    // THE GREAT PIPE's mouth: a culvert standing out of the south wall over the pool. He comes out of it (F.arrive).
    box('stone', -F.pipe.half - 0.8, HZ - F.pipe.out, -F.pipe.half, HZ, F.pipe.y + F.pipe.high + 0.8, { bottom: F.pipe.y - 0.8 }),
    box('stone', F.pipe.half, HZ - F.pipe.out, F.pipe.half + 0.8, HZ, F.pipe.y + F.pipe.high + 0.8, { bottom: F.pipe.y - 0.8 }),
    box('stone', -F.pipe.half, HZ - F.pipe.out, F.pipe.half, HZ, F.pipe.y, { bottom: F.pipe.y - 0.8 }),
    box('stone', -F.pipe.half, HZ - F.pipe.out, F.pipe.half, HZ, F.pipe.y + F.pipe.high + 0.8, { bottom: F.pipe.y + F.pipe.high }),
    // (Out of the pool: JUMP at the bank, as out of any water in this game. A scripted swim, 2026-11-25: pushing at
    // the bank alone does not do it, and a ramp under the water is swum straight through. The sign on the bank says so.)
    // What the water has left along the bank: junk at a rat's size, all of it solid, to climb about on.
    at('teacup', -13, 21.2, 0), at('sardines', -16, 20.4, 0, { dir: 'e' }), at('spoon', -11, 19.2, 0, { dir: 'e' }),
    at('matchbox', 12.5, 21.4, 0, { dir: 'w' }), at('battery', 16, 20.6, 0), at('die', 18.6, 21.5, 0), at('button', 21, 19.5, 0),
    at('pencil', -21, 21, 0, { dir: 'e' }), at('marble', 24.5, 21.2, 0), at('safetypin', -25, 19, 0), at('crayon', 27, 18.5, 0, { dir: 'e' }),
    at('spawn', F.spawn.x, F.spawn.z, 0),
    { t: 'exit', x0: 0, z0: -HZ, x1: 0, z1: -HZ, top: 0, dir: 's' },

    // ---- THE SHORE. One roach, alone, in the open; and the trail of crumbs up into the yard.
    at('roach', -9, 16.5, 0),
    at('crumb', 0.3, 17.5, 0), at('crumb', 0.8, 15, 0), at('crumb', 1.3, 12.5, 0),
    at('npc', -3.2, 19.5, 0, { props: { name: 'Finch', kind: 'bird', lines: [
      'You came down the BIG pipe? Nobody comes down the big pipe.',
      'Well. Not in one piece. Is that... half a sword?',
      'Go up and see Mort, by the fire. He keeps count of what the water brings.',
    ] } }),
    at('barrel', 7.5, 21.5, 0), at('crate', 8.8, 21.8, 0), at('crate', -7.5, 21.6, 0, { props: { item: 'crumb' } }),

    // ---- THE YARD. Mort by the fire; Pip and his stall; things lying about.
    at('brazier', F.fire.x, F.fire.z, 0),
    at('spool', F.fire.x + 1.9, F.fire.z + 1.0, 0), at('spool', F.fire.x - 1.6, F.fire.z + 1.6, 0), at('cheese', F.fire.x - 2.6, F.fire.z - 1.4, 0),
    at('npc', F.fire.x + 1.5, F.fire.z - 1.2, 0, { props: { name: 'Mort', kind: 'mouse', lines: [
      'Mm? Another one washed up. Sit. No? Suit yourself.',
      'This is Flotsam. Everything here came down that pipe, same as you.',
      'The only way on is the Old Gate, north. The Warden stands on it, and he lets nobody by.',
      'You will not get past him with THAT. There is a whole sword at the top of the wreck, west of here, if you can climb.',
      'And Pip will part with a shield for eight crumbs. Crumbs are lying all over. Pick up what you find.',
    ] } }),
    at('npc', F.shop.x, F.shop.z, 0, { props: { name: 'Pip', kind: 'mouse', shop: true, lines: [
      'Pip the peddler! Everything the water brings, sorted and priced.',
      'A shield, knight? Eight crumbs and it is on your arm.',
    ] } }),
    at('table', F.shop.x - 1.8, F.shop.z + 0.4, 0, { props: { candle: true } }),
    at('crate', F.shop.x + 1.6, F.shop.z - 1.2, 0), at('barrel', F.shop.x + 2.4, F.shop.z + 0.3, 0),
    at('lamp', F.shop.x - 0.5, F.shop.z - 2, 5),
    at('crate', 9, 13, 0, { props: { item: 'crumb' } }), at('crate', 10.3, 13.4, 0),
    at('pot', -3, 12, 0), at('pot', -3.8, 12.6, 0), at('rock', 12, 1, 0),
    at('matchbox', F.shop.x - 3.6, F.shop.z + 2.2, 0), at('battery', F.shop.x + 0.4, F.shop.z + 2.6, 0, { dir: 'e' }), at('pawn', F.shop.x + 3.4, F.shop.z - 2.4, 0), at('candle', F.shop.x - 3, F.shop.z - 1.6, 0),
    at('roots', -30, 14, 9), at('roots', 30, 16, 9), at('roots', -31, -4, 9), at('roots', 31, 2, 9), at('roots', -8, 28, 10), at('roots', 9, 28.5, 10),
    at('slime', -HX + 0.1, 6, 5, { dir: 'e' }), at('slime', HX - 0.1, -6, 5, { dir: 'w' }), at('slime', -12, HZ - 0.1, 6, { dir: 'n' }), at('slime', 14, HZ - 0.1, 6, { dir: 'n' }),

    // ---- THE WRECK: the climb to the sword. A crumb on each step shows the way.
    ...F.steps.map((s) => (s === F.steps[0] || s === F.steps[1] ? box('stone', s[0], s[1], s[2], s[3], s[4], { bottom: 0 }) : box('plank', s[0], s[1], s[2], s[3], s[4], { bottom: s[4] - 0.4 }))),
    at('die', -6.2, 9.5, 0), at('matchbox', -8, 12.2, 0),
    ...F.steps.map((s) => at('crumb', mid(s)[0], mid(s)[1], s[4])),
    // (A 'lift' is the piece that MOVES: a 'platform' given these props stays where it is. Found 2026-11-25.)
    box('lift', F.plank.x0, F.plank.z0, F.plank.x1, F.plank.z1, F.plank.top, { props: { motion: 'glide', move: 'w', travel: F.plank.travel, speed: 1.6, pause: 1.2 } }),
    box('plank', F.deck.x0, F.deck.z0, F.deck.x1, F.deck.z1, F.deck.top, { bottom: F.deck.top - 0.6 }),
    at('spool', F.deck.x1 - 0.9, F.deck.z0 + 0.9, F.deck.top), at('teacup', F.deck.x0 + 1.4, F.deck.z1 - 1.2, F.deck.top),
    box('pillar', F.deck.x0 + 0.4, F.deck.z0 + 0.4, F.deck.x0 + 1.2, F.deck.z0 + 1.2, F.deck.top - 0.6),
    box('pillar', F.deck.x1 - 1.2, F.deck.z1 - 1.2, F.deck.x1 - 0.4, F.deck.z1 - 0.4, F.deck.top - 0.6),
    at('bat', -20, -1, 8.6, { props: { perch: 'chain' } }),
    box('plank', F.capBoard.x0, F.capBoard.z0, F.capBoard.x1, F.capBoard.z1, F.capBoard.top, { bottom: F.capBoard.top - 0.5 }),
    at('cap', (F.capBoard.x0 + F.capBoard.x1) / 2, (F.capBoard.z0 + F.capBoard.z1) / 2, F.capBoard.top),

    // ---- THE REEDS: two roaches, and a toad on its rock with crumbs under it.
    box('stone', F.toadRock.x0, F.toadRock.z0, F.toadRock.x1, F.toadRock.z1, F.toadRock.top, { bottom: 0 }),
    at('toad', (F.toadRock.x0 + F.toadRock.x1) / 2, (F.toadRock.z0 + F.toadRock.z1) / 2, F.toadRock.top),
    at('crumb', 14.8, 12.2, 0), at('crumb', 20.4, 7, 0),
    at('roach', 14, 2, 0), at('roach', 21, 14, 0),

    // ---- THE GATE: the wall across the north with its way through, the pikeman before it, the Warden beyond.
    box('wall', -HX, F.wall.z - 0.5, -F.wall.gap, F.wall.z + 0.5, F.wall.top),
    box('wall', F.wall.gap, F.wall.z - 0.5, HX, F.wall.z + 0.5, F.wall.top),
    at('torch', -F.wall.gap - 0.8, F.wall.z + 0.56, 3.4, { dir: 's' }), at('torch', F.wall.gap + 0.8, F.wall.z + 0.56, 3.4, { dir: 's' }),
    at('banner', -F.wall.gap - 3, F.wall.z + 0.56, 6, { dir: 's', props: { color: 'red' } }), at('banner', F.wall.gap + 3, F.wall.z + 0.56, 6, { dir: 's', props: { color: 'red' } }),
    at('ant', F.ant.x, F.ant.z, 0, { dir: 's' }),
    at('npc', 12.5, -9.5, 0, { props: { name: 'Wren', kind: 'bird', lines: [
      'That is the Warden in there. He was a knight once, they say. Now he just stands on the gate.',
      'His hammer comes straight through a shield that is only held up. Step out from under it.',
      'When he kneels, that is your moment. Not before.',
    ] } }),
    at('stag', F.warden.x, F.warden.z, 0, { dir: 's' }),
    box('wall', -HX, F.gate.z - 0.4, -F.gate.half, F.gate.z + 0.4, F.wall.top),
    box('wall', F.gate.half, F.gate.z - 0.4, HX, F.gate.z + 0.4, F.wall.top),
    at('brazier', -9, -14.5, 0), at('brazier', 9, -14.5, 0), at('brazier', -9, -25, 0), at('brazier', 9, -25, 0),
    at('lamp', -12, 12, 7), at('lamp', 12, 14, 7), at('lamp', 0, -2, 7), at('lamp', -22, 8, 9), at('lamp', 20, -2, 7),
  ],
};

export function flotsam(): LevelDef {
  const def = compileCustom(room, FLOTSAM_ID);
  const yard = { x0: -HX + 1, x1: HX - 1, z0: F.wall.z + 1.5, z1: HZ - 1 };
  const court = { x0: -HX + 2, x1: HX - 2, z0: F.gate.z + 1.5, z1: F.wall.z - 1.5 };
  const rock = { x0: F.toadRock.x0 + 0.3, x1: F.toadRock.x1 - 0.3, z0: F.toadRock.z0 + 0.3, z1: F.toadRock.z1 - 0.3 };
  // Each keeps to its own ground: the Warden to his court, the toad to its rock, the ant to the ground before the gate.
  const enemies = def.enemies.map((e) => {
    if (e.type === 'stag') return { ...e, arena: court };
    if (e.type === 'toad') return { ...e, arena: rock, uncounted: true };
    if (e.type === 'ant') return { ...e, arena: { x0: -12, x1: 12, z0: F.wall.z + 1.5, z1: 2 }, uncounted: true };
    return { ...e, arena: yard, uncounted: true };
  });
  const warden = enemies.findIndex((e) => e.type === 'stag');
  const gates: GateSpec[] = [{ x: 0, z: F.gate.z, width: F.gate.half * 2, height: F.gate.high, foes: [warden] }];
  const signs: Decor[] = [
    { kind: 'sign', x: -2.6, y: 0, z: F.pool.z - 0.9, yaw: 0, w: 2.4, h: 1.2, lines: ['JUMP', 'to climb out'], post: 1.4 },
    { kind: 'sign', x: 3.2, y: 0, z: 20, yaw: 0, w: 2.6, h: 1.3, lines: ['FLOTSAM', 'mind the pipe'], post: 1.5 },
    { kind: 'sign', x: -6, y: 0, z: 9.5, yaw: 0, w: 2.6, h: 1.3, lines: ['THE WRECK', 'a sword up top'], post: 1.5 },
    { kind: 'sign', x: 6.2, y: 0, z: F.wall.z + 1.2, yaw: 0, w: 2.8, h: 1.3, lines: ['THE OLD GATE', 'the Warden lets', 'nobody by'], post: 1.5 },
  ];
  signs.push({ kind: 'sign', x: 0, y: 5.6, z: -HZ + 0.06, yaw: 0, w: 7, h: 1.8, lines: ['THE KINGDOM BELOW', 'the way on is not built yet'], post: 0 });
  return {
    ...def,
    goals: NO_GOALS,
    enemies,
    gates: [...(def.gates ?? []), ...gates],
    gear: [...def.gear, { itemId: 'ratSword', x: F.sword.x, y: F.deck.top + 0.8, z: F.sword.z }],
    checkpoints: F.lanterns.map((c) => ({ ...c })),
    decor: [...def.decor, ...signs],
    fallBack: true,
  };
}
