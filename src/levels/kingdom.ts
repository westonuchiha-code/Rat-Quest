/**
 * The first real levels, made with the same pieces the builder uses. Each one is a CustomLevel compiled into a LevelDef,
 * so anything here can be opened and changed in the builder (Copy text).
 * The room is x -w/2..w/2 and z -d/2..d/2; north (the far side) is -z. One jump reaches about 2.5 up and 8 across.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import type { LevelDef } from './types';
import { extent } from '../world/layout';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

/** A toxic pool crossed by a plank bridge, stepping stones and a sliding raft. Beasts wait on the far shore. */
const plankPit: CustomLevel = {
  name: 'Plank Pit',
  blurb: 'Cross the sludge on planks, stones and a sliding raft. Gather the cheese and clear the far shore.',
  width: 48, depth: 48, wallHeight: 12,
  goals: [{ type: 'collect', kind: 'crumb', count: 'all' }, { type: 'defeat' }],
  pieces: [
    // The near shore, the pool, and the far shore.
    box('floor', -24, 10, 24, 24, 0),
    box('water', -24, -12, 24, 10, -0.85),
    box('floor', -24, -24, 24, -12, 0),
    at('spawn', 0, 20),
    // A bridge of planks to the island in the middle.
    box('plank', -1.5, 4, 1.5, 10, 0),
    box('tile', -8, -2, 8, 4, 0),
    // A sliding raft from the island to the far shore.
    box('lift', -1.5, -5, 1.5, -2, 0, { props: { move: 'n', travel: 7, speed: 2.2, pause: 2 } }),
    // A row of stepping stones down the east side, for the brave (and for the crumbs on them).
    box('stone', 8.5, 1, 10.5, 3, 0), box('stone', 8.5, -2.5, 10.5, -0.5, 0), box('stone', 8.5, -6, 10.5, -4, 0), box('stone', 8.5, -9.5, 10.5, -7.5, 0),
    // The far shore: a stair up to the door.
    box('stairs', -3, -20, 3, -14, 3, { dir: 'n', bottom: 0 }),
    box('platform', -8, -24, 8, -20, 3),
    at('exit', 0, -24, 3),
    // Crates and barrels with cheese, near the start.
    at('crate', -8, 16, 0, { props: { item: 'crumb' } }), at('barrel', 8, 16, 0, { props: { item: 'crumb' } }), at('crate', 14, 14, 0, { props: { item: 'cap' } }),
    // Cheese on the bridge, the island, the stones and the far shore.
    at('crumb', 0, 7), at('crumb', 0, 1), at('crumb', 9.5, 2), at('crumb', 9.5, -8.5), at('crumb', -14, -17), at('crumb', 14, -17),
    // Beasts: a roach on the island, toads on the far shore.
    at('roach', -4, 0), at('toad', -12, -18), at('toad', 12, -18),
    at('npc', 6, 20, 0, { props: { name: 'Finch', kind: 'bird', lines: ["Watch those planks! They don't look terribly trustworthy."] } }),
    at('lamp', -12, 22, 3), at('lamp', 12, 22, 3), at('lamp', -12, -22, 3), at('lamp', 12, -22, 3),
    at('slime', -23.5, 14, 7, { dir: 'e' }), at('window', 23.5, 18, 5, { dir: 'w' }),
    at('fall', -24, -2, 0, { dir: 'e' }),
  ],
};

/** A walled cellar: step on both plates to lift the gate, beat what guards them, then clear the north hall. */
const cellars: CustomLevel = {
  name: 'Cellars',
  blurb: 'Two plates open the gate. Barrels, beasts and a high ledge with a prize.',
  theme: 'dungeon',
  width: 44, depth: 44, wallHeight: 12,
  goals: [{ type: 'defeat' }, { type: 'collect', kind: 'cap', count: 'all' }],
  pieces: [
    box('floor', -22, -22, 22, 22, 0),
    at('spawn', 0, 18),
    // The south hall is split into three bays by two walls; the plates sit in the side bays.
    box('wall', -9, 4, -8, 22, 6), box('wall', 8, 4, 9, 22, 6),
    at('plate', -15, 16), at('plate', 15, 16),
    at('roach', -15, 10), at('roach', 15, 10), at('toad', 0, 8),
    // The divider with the gate in the middle.
    box('wall', -22, -5, -4, -4, 6), box('wall', 4, -5, 22, -4, 6),
    box('gate', -4, -5, 4, -4, 0, { props: { opens: 'plates' } }),
    // The north hall: cover, barrels, and the exit.
    box('pillar', -12, -12, -10, -10, 5), box('pillar', 10, -12, 12, -10, 5), box('pillar', -2, -15, 0, -13, 5),
    at('exit', 0, -22),
    at('toad', -15, -17), at('toad', 15, -17), at('roach', 0, -9),
    at('barrel', -18, -8, 0, { props: { item: 'cap' } }), at('barrel', -18, -10), at('crate', 18, -8, 0, { props: { item: 'crumb' } }), at('crate', 18, -10),
    // A high ledge in the north-east, up a stair, with a cap on it.
    box('stairs', 16, -18, 19, -12, 3, { dir: 'n', bottom: 0 }),
    box('platform', 14, -22, 22, -18, 3),
    at('cap', 18, -20, 3),
    // The bays have caps tucked in the corners.
    at('cap', -20, 20), at('cap', 20, 20),
    at('lamp', -6, 20, 3), at('lamp', 6, 20, 3), at('chain', -3, 10, 7), at('chain', 3, 10, 7),
    at('window', -21.5, 0, 5, { dir: 'e' }), at('window', 21.5, 0, 5, { dir: 'w' }),
    at('npc', 6.6, 20.2, 0, { props: { name: 'Pip', kind: 'mouse', lines: ['Squeak! Both plates, then the gate lifts.', 'The roaches guard the left and right bays. The toad is in the middle: watch for spit!', 'Caps hide in the corners and on the high ledge up the stairs.'] } }),
  ],
};

/** A climb through an old shaft: a lift, a sliding platform, pillars to hop and a plank bridge to the door. Falling means starting over. */
const liftShaft: CustomLevel = {
  name: 'Lift Shaft',
  blurb: 'Ride the lifts, hop the pillars and cross the planks to the door. There is nothing under you.',
  theme: 'mine',
  width: 44, depth: 44, wallHeight: 26,
  goals: [{ type: 'collect', kind: 'crumb', count: 'all' }],
  pieces: [
    box('floor', -8, 10, 8, 20, 0),
    at('spawn', 0, 16),
    // Up the first lift to a landing.
    box('lift', -1.5, 7, 1.5, 10, 0, { props: { move: 'up', travel: 5, speed: 2, pause: 2 } }),
    box('platform', -5, 1, 5, 7, 5),
    // A slider east to the second landing.
    box('lift', 5, 2, 8, 5, 5, { props: { move: 'e', travel: 9, speed: 2.5, pause: 2 } }),
    box('platform', 17, -1, 22, 6, 5),
    // Pillars up and north.
    box('pillar', 19, -5, 21, -3, 6.5), box('pillar', 19, -9, 21, -7, 8), box('pillar', 19, -13, 21, -11, 9.5),
    box('platform', 16, -22, 22, -15, 9.5),
    // The second lift to the top, and the bridge to the door.
    box('lift', 13, -22, 16, -19, 9.5, { props: { move: 'up', travel: 6, speed: 2, pause: 2 } }),
    box('platform', 4, -22, 13, -19, 15.5),
    box('plank', -20, -22, 4, -19, 15.5),
    at('exit', -19, -20.5, 15.5),
    at('crumb', 0, 4, 5), at('crumb', 20, 3, 5), at('crumb', 20, -4, 6.5), at('crumb', 20, -12, 9.5), at('crumb', 20, -18, 9.5), at('crumb', 8, -20.5, 15.5), at('crumb', -8, -20.5, 15.5),
    at('roach', 0, 4, 5), at('toad', 8, -20.5, 15.5),
    at('lamp', -6, 18, 3), at('lamp', 6, 18, 3), at('lamp', 0, 2, 8), at('lamp', 20, 4, 8), at('lamp', 8, -21, 18),
    at('chain', -3, 3, 9), at('chain', 12, -4, 14),
    at('npc', 4, 16, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! This shaft is old. The lifts still work, mostly.', 'Step on, ride up, and step off when it stops. Do not fall!', 'The door is at the very top, along the planks.'] } }),
  ],
};

/** A furnace hall: a lake of lava crossed by a rope bridge, a sliding platform and stepping stones. Touching lava hurts and sends you back. */
const furnace: CustomLevel = {
  name: 'Furnace',
  blurb: 'Cross the lava by rope bridge, sliding platform or stepping stones. One touch of the lava and you pay for it.',
  theme: 'dungeon',
  width: 44, depth: 44, wallHeight: 14,
  goals: [{ type: 'collect', kind: 'crumb', count: 'all' }, { type: 'defeat' }],
  pieces: [
    box('floor', -10, 12, 10, 22, 0),
    box('lava', -22, -14, 22, 12, -0.6),
    box('floor', -22, 12, -10, 22, 0), box('floor', 10, 12, 22, 22, 0),
    at('spawn', 0, 18),
    // The rope bridge to the middle island.
    box('bridge', -1.5, 2, 1.5, 12, 0),
    box('tile', -6, -4, 6, 2, 0),
    // The sliding platform east to the far island.
    box('lift', 6, -3, 9, 0, 0, { props: { move: 'e', travel: 7, speed: 2, pause: 2 } }),
    box('tile', 16, -10, 22, 0, 0),
    // Stepping stones: west across the lava, and one more from the east island to the north.
    box('stone', -9, -2, -7, 0, 0), box('stone', -12.5, -6, -10.5, -4, 0), box('stone', -16, -10, -14, -8, 0), box('stone', -19, -13, -17, -11, 0),
    box('stone', 18, -13, 20, -11, 0),
    // The north shore, the stair and the door.
    box('floor', -22, -22, 22, -14, 0),
    box('stairs', -3, -20, 3, -14, 3, { dir: 'n', bottom: 0 }),
    box('platform', -8, -22, 8, -20, 3),
    at('exit', 0, -22, 3),
    at('crumb', 0, 8), at('crumb', 0, -1), at('crumb', -11.5, -5), at('crumb', 19, -5), at('crumb', 19, -12), at('crumb', -14, -18), at('crumb', 14, -18),
    at('roach', 3, -1), at('roach', 19, -3), at('toad', -10, -18), at('toad', 10, -18),
    at('crate', -16, 18, 0, { props: { item: 'cap' } }), at('barrel', 16, 18, 0, { props: { item: 'crumb' } }),
    at('brazier', -8, 13), at('brazier', 8, 13), at('brazier', -18, -20), at('brazier', 18, -20),
    at('chain', -8, 8, 8), at('chain', 8, 8, 8),
    at('window', -21.5, 4, 6, { dir: 'e' }), at('window', 21.5, 4, 6, { dir: 'w' }),
    at('npc', 6, 18, 0, { props: { name: 'Pip', kind: 'mouse', lines: ['Squeak! That is real lava. Touch it and it burns, then tosses you back to where you last stood.', 'Cross by the rope bridge, ride the sliding platform east, or hop the stones to the west.', 'The beasts on the north shore guard the stair to the door.'] } }),
  ],
};

/** A cave strung with cobwebs: rope bridges over a drop, stairs up the side, beasts on the ledges. */
const webHollow: CustomLevel = {
  name: 'Web Hollow',
  blurb: 'Rope bridges over the dark, cobwebs on the walls and beasts on every ledge. A fall sends you back to the start.',
  theme: 'cave',
  width: 44, depth: 44, wallHeight: 16,
  goals: [{ type: 'collect', kind: 'crumb', count: 'all' }],
  pieces: [
    box('floor', -8, 14, 8, 22, 0),
    at('spawn', 0, 18),
    box('bridge', -1.5, 4, 1.5, 14, 0),
    box('floor', -8, -4, 8, 4, 0),
    box('bridge', -16, -1.5, -8, 1.5, 0),
    box('floor', -22, -8, -16, 6, 0),
    box('stairs', -21, -14, -17, -8, 4, { dir: 'n', bottom: 0 }),
    box('platform', -22, -22, -10, -14, 4),
    box('bridge', -10, -19.5, 6, -16.5, 4),
    box('platform', 6, -22, 22, -10, 4),
    at('exit', 14, -22, 4),
    at('crumb', 0, 9), at('crumb', 0, 0), at('crumb', -12, 0), at('crumb', -19, -3), at('crumb', -16, -18, 4), at('crumb', -2, -18, 4), at('crumb', 12, -14, 4), at('crumb', 18, -18, 4),
    at('roach', 0, 0), at('roach', -19, 1), at('toad', -16, -18, 4), at('roach', 14, -14, 4),
    at('web', -21.9, 10, 3, { dir: 'e' }), at('web', 21.9, 6, 4, { dir: 'w' }), at('web', -21.9, -18, 8, { dir: 'e' }), at('web', 0, -21.9, 8, { dir: 's' }), at('web', 10, -21.9, 7, { dir: 's' }),
    at('slime', 21.9, 14, 8, { dir: 'w' }), at('lamp', -6, 20, 3), at('lamp', 6, 20, 3), at('lamp', 0, 2, 3),
    at('brazier', -20, 4), at('brazier', 20, -12, 4),
    at('npc', 5, 18, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! Spiders have been busy down here.', 'Cross the rope bridge, then take the west bridge to the stairs.', 'Mind the drop: there is no floor under the bridges.'] } }),
  ],
};

/** Dizzy Dave's hangout: a stage at the back with a busted speaker blasting a boom-bap beat, a couch, and a few chill creatures. */
const daveSpot: CustomLevel = {
  name: "Dizzy Dave's Spot",
  blurb: 'The hangout. Dave, Mort, Wren, Pip and Finch. Walk up and press JUMP to talk.',
  theme: 'dungeon',
  music: 'groove',
  width: 40, depth: 40, wallHeight: 10,
  goals: [{ type: 'reach' }],
  pieces: [
    box('floor', -20, -20, 20, 20, 0),
    at('spawn', 0, 16),
    // The stage at the back: two steps up, a speaker stack on each side, Dave in front of them.
    box('platform', -9, -20, 9, -12, 0.8),
    box('stairs', -3, -12, 3, -9, 0.8, { dir: 'n', bottom: 0 }),
    at('speaker', -7, -18, 0.8, { dir: 's' }), at('speaker', 7, -18, 0.8, { dir: 's' }),
    at('exit', 0, -20, 0.8),
    at('npc', 0, -14.5, 0.8, { props: { name: 'Dizzy Dave', kind: 'pigeon', auto: 11, lines: [
      'Coo coo, daddy-o! Welcome to the Dave Zone. Pull up a crumb.',
      'Name is Dizzy Dave. Dizzy on account of the dancing, dig?',
      'That busted speaker? Found it in a drain. Only plays one beat, but what a beat, man.',
      'Hang out, meet the crew. Down in these tunnels you gotta keep a rhythm or you lose your head.',
      'Heh, stay groovy, knight. Boom, tss, boom boom tss!',
    ] } }),
    // The hangabouts: a couch with a sleepy mouse on it, a bird by the barrels, and one waiting on the left.
    at('couch', -13, -3, 0, { dir: 'e' }),
    at('npc', -12, -3, 0, { props: { name: 'Mellow Mort', kind: 'mouse', lines: [
      'Squeak... oh. Hey. Did not see you there. I have been on this couch since Tuesday.',
      'The beat is good, right? Better than the drips. Way better than the drips.',
      'If you are headed out, the door is past Dave. Take it slow, knight. Take it slow.',
    ] } }),
    at('npc', 12, 4, 0, { props: { name: 'Wren', kind: 'bird', lines: [
      'Chirp! Dave never stops. I have been trying to sing over that beat for a week.',
      'He says he is dizzy from dancing. I say he is dizzy from the speaker.',
    ] } }),
    // Everyone else, so one room shows every character: Lord Grimsqueak floats in the corner, with Pip and Finch beside him.
    // Not here until the ending brings him in (STORY.davespot).
    at('npc', 14, -9, 0, { props: { name: 'Lord Grimsqueak', kind: 'villain', hidden: true, lines: [] } }),
    at('npc', -14, 8, 0, { props: { name: 'Pip', kind: 'mouse', lines: ['Squeak! Pip the peddler, at your service. Soon I will sell you things.', 'For now I just give hints. Smash the pipes, beat the beasts, find the door!'] } }),
    at('npc', -8, 12, 0, { props: { name: 'Finch', kind: 'bird', lines: ['Chirp! Finch the goldfinch. Watch your step down in the sludge, knight.', 'Stay on the planks, and the beasts will not get you. Probably.'] } }),
    at('barrel', 15, 8, 0, { props: { item: 'crumb' } }), at('barrel', 16, 6, 0, { props: { item: 'crumb' } }), at('crate', 15, 3, 0, { props: { item: 'cap' } }),
    // Strings of braziers and lamps to light the place up like a club.
    at('brazier', -15, -12), at('brazier', 15, -12), at('brazier', -15, 10), at('brazier', 8, 12),
    at('lamp', -10, 14, 4), at('lamp', 10, 14, 4), at('lamp', -14, 0, 4), at('lamp', 14, 0, 4),
    at('crumb', -6, 8), at('crumb', 6, 10), at('crumb', 0, 2), at('crumb', -9, -8),
    at('slime', -19.5, -6, 6, { dir: 'e' }), at('window', 19.5, -8, 5, { dir: 'w' }),
    // Club lights: blue and yellow wash from the stage, and a red warning light flashing on each speaker.
    at('light', -4, -19, 0.8, { props: { color: 'blue' } }), at('light', 4, -19, 0.8, { props: { color: 'yellow' } }),
    at('light', -7, -18, 3.7, { props: { color: 'red', flash: 1.5 } }), at('light', 7, -18, 3.7, { props: { color: 'red', flash: 1.5 } }),
    at('light', -17, 14, 0, { props: { color: 'purple' } }), at('light', 17, 14, 0, { props: { color: 'blue' } }),
  ],
};

/** Story dressing added to a compiled level: things the builder has no piece for, and the places scenes are staged around. */
function dressed(def: LevelDef, extra: Pick<LevelDef, 'storySpots'> & { decor?: LevelDef['decor']; solids?: LevelDef['solids'] }): LevelDef {
  return { ...def, solids: [...def.solids, ...(extra.solids ?? [])], decor: [...def.decor, ...(extra.decor ?? [])], storySpots: extra.storySpots };
}

export function kingdomLevels(): LevelDef[] {
  const pit = dressed(compileCustom(plankPit, 'plankpit'), {
    // A broken lantern lying by the start of the plank bridge.
    storySpots: { keepsake: { x: -2.6, y: 0, z: 12.4 } },
  });
  const cellar = dressed(compileCustom(cellars, 'cellars'), {
    // Bare shelves along the south wall of the middle bay. Pip stands by them.
    decor: [
      { kind: 'shelf', x: 4.4, y: 0, z: 21.97, yaw: Math.PI, width: 3.4, height: 2.5 },
      { kind: 'shelf', x: -4.4, y: 0, z: 21.97, yaw: Math.PI, width: 3.4, height: 2.5 },
    ],
    solids: [-4.4, 4.4].map((x) => ({ ...extent('plank', x - 1.75, x + 1.75, 0, 2.5, 21.5, 22), hidden: true })),
    storySpots: { shelf: { x: 4.4, y: 0, z: 22 }, pip: { x: 6.6, y: 0, z: 20.2 } },
  });
  const shaft = dressed(compileCustom(liftShaft, 'liftshaft'), {
    // Far below the shaft: the Deep Engine and the lamps of the kingdom. Seen from the second landing.
    decor: [{ kind: 'engine', x: 2, y: -46, z: 0, r: 17 }],
    storySpots: { landing: { x: 19.5, y: 5, z: 3 }, edge: { x: 17.9, y: 5, z: 4.6 }, engine: { x: 2, y: -46, z: 0 } },
  });
  const hot = dressed(compileCustom(furnace, 'furnace'), {
    // One of the machines the cheese is fed to, against the east wall of the near shore, with the royal mark over it.
    decor: [
      { kind: 'machine', x: 21.95, y: 0, z: 16.5, yaw: -Math.PI / 2 },
      { kind: 'mark', glyph: 'crown', x: 21.97, y: 5.6, z: 19.6, yaw: -Math.PI / 2, size: 0.7, color: 0x7d6a92 },
    ],
    // The machine's body, and its hopper sticking out the front.
    solids: [{ ...extent('stone', 20.3, 22, 0, 3.4, 14.6, 18.4), hidden: true }, { ...extent('stone', 19.5, 20.3, 1.6, 2.4, 17.6, 18.4), hidden: true }, { ...extent('stone', 20.35, 21.95, 3.4, 5.5, 15.3, 16.9), hidden: true }],
    storySpots: { machine: { x: 21.2, y: 0, z: 16.5 } },
  });
  const hollow = dressed(compileCustom(webHollow, 'webhollow'), {
    // By the door on the top ledge: an old pack caught in a web, and a faded royal portrait.
    decor: [
      { kind: 'web', x: 18, y: 5.3, z: -21.9, yaw: 0, r: 1.5 },
      { kind: 'portrait', x: 6.7, y: 6.3, z: -21.98, yaw: 0, size: 1.5 },
    ],
    storySpots: { keepsake: { x: 18, y: 4.95, z: -21.55 }, portrait: { x: 6.7, y: 6.3, z: -22 } },
  });
  // (The lair is now the throne room of Grimsqueak's Keep: see keep.ts.)
  const spot = dressed(compileCustom(daveSpot, 'davespot'), {
    storySpots: { dave: { x: 0, y: 0.8, z: -14.5 }, mort: { x: -12, y: 0, z: -3 }, wren: { x: 12, y: 0, z: 4 } },
  });
  return [pit, cellar, hot, hollow, shaft, spot];
}
