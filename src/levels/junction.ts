/**
 * The Club: home. The safe haven he comes back to after every world, Dizzy Dave's hangout grown into a hub.
 * A fire in the middle to rest at (heals, saves), friends hanging out, Pip's counter, and the doors to the worlds.
 * Each world door opens once he has enough Golden Wedges; a sign over it says what it is and what it wants.
 * Leaving a world brings him back here, in front of its door. The south door leads to the old tunnels (the first levels).
 *
 * Room: 48 x 44 (x -24..24, z -22..22); north is -z.
 *   North: Dave's stage and speakers.   Middle: the fire, with couches round it.
 *   West: Pip's counter, and the door to the Great Cistern.   East: Mort's couch and Wren, and the World Two door.
 *   North wall, east of the stage: the Hollows. West of the stage: Grimsqueak's Keep (the last world).
 *   After the Keep, the ending plays here (STORY.hub), and Grimsqueak stays, by the fire.
 */
import { compileCustom, CustomLevel, Piece } from './custom';
import { doorOn } from '../world/rooms';
import type { CourseDoorDef, LevelDef } from './types';
import { BALANCE } from '../data/balance';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

const HX = 24;
const HZ = 22;
/** The fire in the middle: rest here. */
export const FIRE = { x: 0, y: 0.4, z: 0 };

const club: CustomLevel = {
  name: 'The Club',
  blurb: 'Home. Rest by the fire, see your friends, and take a door out into the worlds. Golden Wedges open more doors.',
  theme: 'dungeon',
  music: 'groove',
  width: HX * 2, depth: HZ * 2, wallHeight: 12,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    at('spawn', 0, 16),
    at('exit', 0, HZ),

    // ---- The fire: a stone hearth with a brazier, and couches round it ----
    box('tile', -2, -2, 2, 2, FIRE.y, { bottom: 0 }),
    at('brazier', 0, 0, FIRE.y),
    at('couch', -5, 0, 0, { dir: 'e' }), at('couch', 5, 0, 0, { dir: 'w' }), at('couch', 0, -5, 0, { dir: 's' }),

    // ---- North: Dave's stage ----
    box('platform', -9, -HZ, 9, -14, 0.8, { bottom: 0 }),
    box('stairs', -3, -14, 3, -11, 0.8, { dir: 'n', bottom: 0 }),
    at('speaker', -7, -20, 0.8, { dir: 's' }), at('speaker', 7, -20, 0.8, { dir: 's' }),
    at('npc', 0, -16.5, 0.8, { props: { name: 'Dizzy Dave', kind: 'pigeon', lines: [
      'Coo coo, daddy-o! Welcome home. The Club never closes.',
      'Out there it is all drips and beasts. In here it is one beat, forever. Boom, tss, boom boom tss!',
      'Sit by the fire a while, man. You look like you have been wall-kicking.',
    ] } }),

    // ---- West: Pip's counter ----
    // A low counter, and a step behind it so Pip can see over.
    box('platform', -17.5, -6, -16.5, 6, 0.9, { bottom: 0 }),
    box('platform', -22, -6, -17.5, 6, 0.5, { bottom: 0 }),
    at('npc', -18.2, 0, 0.5, { props: { name: 'Pip', kind: 'mouse', shop: true, lines: [
      'Squeak! Welcome to Pip\'s, finest counter in the Kingdom Below. Only counter, really. Crumbs and caps, I take both!',
    ] } }),
    at('barrel', -21.5, -4, 0.5), at('barrel', -21.5, -2.5, 0.5), at('barrel', -21.5, 4, 0.5),
    at('lamp', -17, -5, 3.5), at('lamp', -17, 5, 3.5),

    // ---- East: Mort's couch and Wren ----
    at('couch', 18, 8, 0, { dir: 'w' }),
    at('npc', 17, 8, 0, { props: { name: 'Mellow Mort', kind: 'mouse', lines: [
      'Squeak... oh. Hey. You came back. Most do not, you know. Back to the couch, I mean.',
      'The fire is warm. The beat is good. The drips are far away. This is the life, knight.',
    ] } }),
    at('npc', 13, -6, 0, { props: { name: 'Wren', kind: 'bird', lines: [
      'Chirp! I have almost got a tune that fits Dave\'s beat. Almost.',
      'Every time you bring back a Golden Wedge, Dave says he turns the beat up. I cannot hear a difference. Can you?',
      'The north door goes down to the Hollows. It is so quiet down there you can hear your own whiskers.',
      'The other north door, by the stage... that one goes to his keep. It wants the most wedges of all. Dave stops dancing when he looks at it.',
    ] } }),
    at('npc', -13, 14, 0, { props: { name: 'Finch', kind: 'bird', lines: [
      'Chirp! The Cistern is through the west door. Big place. Mind the moat.',
      'If you cannot reach a ledge, jump at it and grab the edge as you fall. Works for me. Well, I fly. But still.',
      'The east door goes to the Foundry. Bring a few Golden Wedges, and something for the heat.',
    ] } }),

    // Not here until the ending brings him in (STORY.hub); after it he stays.
    at('npc', 14, -12, 0, { props: { name: 'Lord Grimsqueak', kind: 'villain', hidden: true, lines: [] } }),

    // ---- A torch either side of each world door ----
    at('torch', -23.7, 9, 3.2, { dir: 'w' }), at('torch', -23.7, 15, 3.2, { dir: 'w' }),
    at('torch', 23.7, -13, 3.2, { dir: 'e' }), at('torch', 23.7, -7, 3.2, { dir: 'e' }),
    at('torch', 13, -21.7, 3.2, { dir: 'n' }), at('torch', 19, -21.7, 3.2, { dir: 'n' }),
    at('torch', -19, -21.7, 3.2, { dir: 'n' }), at('torch', -13, -21.7, 3.2, { dir: 'n' }),

    // ---- Light and dressing: warm round the fire, club lights on the stage ----
    at('light', 0, 0, 2.5, { props: { color: 'yellow' } }),
    at('light', -4, -21, 0.8, { props: { color: 'blue' } }), at('light', 4, -21, 0.8, { props: { color: 'purple' } }),
    at('light', -7, -20, 3.7, { props: { color: 'red', flash: 1.5 } }), at('light', 7, -20, 3.7, { props: { color: 'red', flash: 1.5 } }),
    at('brazier', -21, -18), at('brazier', 21, -18), at('brazier', -21, 18), at('brazier', 21, 18),
    at('lamp', -8, 18, 4), at('lamp', 8, 18, 4), at('lamp', 22, 0, 4),
    at('chain', -10, -6, 9), at('chain', 10, -6, 9), at('chain', -10, 8, 9), at('chain', 10, 8, 9),
    at('window', -23.5, -14, 5, { dir: 'e' }), at('window', 23.5, 16, 5, { dir: 'w' }),
    at('slime', -23.5, 18, 6, { dir: 'e' }),
  ],
};

/**
 * Whether a door lets him through: he has the wedges it asks for, or he has been through it before. (A door's price
 * can go up between one build and the next, as wedges are added to the game: that must not shut a world on someone
 * who had already got into it.)
 */
export function doorLetsIn(need: number, wedges: number, beenThrough: boolean): boolean {
  return wedges >= need || beenThrough;
}

/** What one of the Club's doors asks, and how near he is to it: for the WORLDS page of the pause menu. */
export interface DoorState {
  name: string;
  /** Golden Wedges it asks for. */
  need: number;
  /** Golden Wedges he holds (all of them count towards every door). */
  have: number;
  open: boolean;
  /** He has been through it before (so it is open whatever it asks now). */
  been: boolean;
}
/** `openAll`: every door is open (a development switch). */
export function doorState(door: { name: string; need: number }, wedges: number, beenThrough: boolean, openAll = false): DoorState {
  return { name: door.name, need: door.need, have: wedges, open: openAll || doorLetsIn(door.need, wedges, beenThrough), been: beenThrough };
}
/** In plain words: what a door wants and where he stands with it. */
export function doorWords(d: DoorState): string {
  const wedges = (n: number): string => `${n} Golden Wedge${n === 1 ? '' : 's'}`;
  if (d.need <= 0) return 'No lock on this door: it is always open.';
  if (d.have >= d.need) return `Open. It wanted ${wedges(d.need)}; you have ${d.have}.`;
  if (d.open) return d.been ? `Open: you have been through it. (It asks ${wedges(d.need)} now; you have ${d.have}.)` : `Open. (It asks ${wedges(d.need)}; you have ${d.have}.)`;
  return `It wants ${wedges(d.need)}. You have ${d.have}: ${d.need - d.have} more to go.`;
}

export const HUB_DOORS: CourseDoorDef[] = [
  { to: 'cistern', name: 'The Great Cistern', need: 0, door: doorOn('west', HX, 12, HZ, 0) },
  // How many wedges each wants is read from the balance table (tunable in Tweaks).
  { to: 'foundry', name: 'The Foundry', get need() { return BALANCE.doors.foundry; }, door: doorOn('east', HX, -10, HZ, 0) },
  { to: 'hollows', name: 'The Hollows', get need() { return BALANCE.doors.hollows; }, door: doorOn('north', HX, 16, HZ, 0) },
  { to: 'keep', name: "Grimsqueak's Keep", get need() { return BALANCE.doors.keep; }, door: doorOn('north', HX, -16, HZ, 0) },
];

/**
 * Guest doors on the south wall, either side of where he came in: one of his own levels from the builder can hang on each.
 * They only show when a level hangs there, so the built worlds are never pushed aside. ('west' and 'east' are the saved
 * names from before; they now mean the left and right guest door.)
 */
export const HUB_GUEST_DOORS: Record<'west' | 'east', CourseDoorDef> = {
  west: { to: null, name: '', need: 0, door: doorOn('south', HX, -12, HZ, 0) },
  east: { to: null, name: '', need: 0, door: doorOn('south', HX, 12, HZ, 0) },
};

export function junction(): LevelDef {
  return {
    ...compileCustom(club, 'hub'),
    theme: 'dungeon',
    hub: true,
    courseDoors: HUB_DOORS,
    restSpot: FIRE,
    // Where the ending looks: Dave on his stage, Mort on his couch, Wren.
    storySpots: { dave: { x: 0, y: 0.8, z: -16.5 }, mort: { x: 17, y: 0, z: 8 }, wren: { x: 13, y: 0, z: -6 } },
  };
}
