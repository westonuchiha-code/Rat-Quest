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
import type { NpcSpec } from '../npc/npc';
import { extent, junkSolids, stoolSolids, tableSolids, type Decor, type JunkKind } from '../world/layout';
import { BALANCE } from '../data/balance';

const at = (t: Piece['t'], x: number, z: number, top = 0, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

const HX = 24;
const HZ = 22;
/** The fire in the middle: rest here. */
/** (Its top is a step he can walk up: under the controller's step height, 0.35. It was 0.4, and he had to jump onto his own hearth.) */
export const FIRE = { x: 0, y: 0.3, z: 0 };

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
    // Jinx: a girl rat, and a punk. She hangs about Dave's stage for now (the owner, 2026-11-16).
    at('npc', 5.2, -15.4, 0.8, { props: { name: 'Jinx', kind: 'rat', lines: [
      'Hey. Nice scarf. Did someone knit you that, or did you win it off somebody smaller?',
      'I am Jinx. I am with the band. The band is Dave. Dave is the whole band.',
      'The notch in my ear? A mantis did that. It is still down there, and it is still cross. Say hi from me.',
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
    // (The fire's own glow on the hearth and the couches: only light. It was a warning-light post hung in the air
    // over the flames, bulb and all, and solid: the owner, 2026-11-16: "light box above fire looks bad".)
    at('light', 0, 0, 2.5, { props: { color: 'yellow', bare: true } }),
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

/**
 * The Club's tables and the regulars at them. (The owner, 2026-11-15: more props, and characters who are DOING
 * something, "like have maybe two characters drinking at a table"; "I want it to feel pretty alive regardless ...
 * a full world that gains extras over time".) Everyone here is here from the first minute, except those marked
 * `when`, who turn up as the world is cleared: the room is full without them.
 *
 * A table is at (x, z); a seat is a stool beside it, `out` from its middle at an angle (0 is south of it, +z).
 */
const SEAT_OUT = 1.25;
/** How many Ant Pikemen he must have beaten before one of them takes to drinking here. */
export const NIB_AFTER = 8;
interface TableSet {
  x: number;
  z: number;
  top: { mugs?: Array<[number, number]>; candle?: boolean; cards?: boolean };
  /** The stools round it, each an angle round the table; and who (if anyone) is on each. */
  seats: Array<{ at: number; who?: Omit<NpcSpec, 'x' | 'z' | 'facing' | 'partner' | 'seated'> }>;
}
const TABLES: TableSet[] = [
  // South-east, by the way in: two turtles over their thimbles, deep in it. A third stool for anyone.
  {
    x: 11, z: 14, top: { mugs: [[Math.PI / 2, 0.6], [-Math.PI / 2, 0.6]], candle: true },
    seats: [
      { at: Math.PI / 2, who: { name: 'Mossback Mo', kind: 'turtle', doing: 'drink', turn: 0, lines: [
        'Hmm? Oh. A knight. We had one of those once. Before the drips.',
        'I was old when this pipe was new, young fellow. Slow down. The cheese is not going anywhere.',
        'Pebble here thinks the moat in the Cistern is deep. I have seen DEEP. Sit a while and I might tell you.',
      ] } },
      { at: -Math.PI / 2, who: { name: 'Pebble', kind: 'turtle', doing: 'chat', turn: 1, lines: [
        'Do not get him started on the moat. Please. I have heard about the moat since Tuesday.',
        'I would go adventuring myself, you know. I have the shell for it. I just have not finished my drink.',
      ] } },
      { at: 0 },
    ],
  },
  // North-east, near Wren: a card table. Two foxes, and neither trusts the other's deal.
  {
    x: 17, z: -1, top: { cards: true, mugs: [[2.4, 0.7]] },
    seats: [
      { at: Math.PI / 2, who: { name: 'Vix', kind: 'fox', doing: 'cards', turn: 0, lines: [
        'Pull up a cork, knight. Crumbs are stakes, caps are trumps, and Ash deals from the bottom.',
        'You have the look of someone who jumps off walls for a living. I respect a trade.',
      ] } },
      { at: -Math.PI / 2, who: { name: 'Ash', kind: 'fox', doing: 'cards', turn: 1, lines: [
        'I do NOT deal from the bottom. I deal from the middle. There is an art to it.',
        'Lost the eye to a hornet, since you are staring. Kept the hornet\'s lance. It is over the bar. There is no bar. It is somewhere.',
      ] } },
      { at: Math.PI },
    ],
  },
  // South-west, by Finch and the way to the Cistern: a table for whoever comes back from the worlds.
  {
    x: -11, z: 6, top: { mugs: [[0.3, 0.55]], candle: true },
    seats: [
      // An Ant Pikeman, off duty: here once he has beaten enough of them. (The owner: "once you've beaten enough
      // ants like some of them just start hanging around".)
      { at: 0, who: { name: 'Corporal Nib', kind: 'ant', doing: 'drink', when: { beaten: ['ant', NIB_AFTER] }, lines: [
        'Stand easy, knight. I am OFF the line. The pike is in the rack. This is my thimble.',
        'No hard feelings about the Hollows. You came through the wall of us fair and square. Mostly square.',
        'The lads say you fight like a rat who has read the manual. From an ant, that is high praise.',
      ] } },
      { at: Math.PI * 0.75 },
      { at: -Math.PI * 0.75 },
    ],
  },
];

/**
 * The bar, in the south-east corner against the east wall: a plank counter, a step behind it for whoever keeps it,
 * a keg and a row of thimbles on it, three stools in front. And the wall by the Cistern door, to lean on.
 */
export const BAR = { x0: 20, x1: 21, z0: 10.6, z1: 16.6, top: 1.0, step: 0.45, back: 24, stoolX: 19.2 } as const;
const EAST = Math.PI / 2;
const WEST = -Math.PI / 2;
function clubBar(): { decor: Decor[]; solids: LevelDef['solids']; npcs: NpcSpec[] } {
  const midZ = (BAR.z0 + BAR.z1) / 2;
  const keeper: [number, number] = [BAR.x1 + 0.7, midZ];
  const solids: LevelDef['solids'] = [
    extent('plank', BAR.x0, BAR.x1, 0, BAR.top, BAR.z0, BAR.z1),
    extent('platform', BAR.x1, BAR.back, 0, BAR.step, BAR.z0, BAR.z1),
  ];
  const decor: Decor[] = [
    { kind: 'mugs', x: (BAR.x0 + BAR.x1) / 2, y: BAR.top, z: midZ - 1.2, yaw: EAST, count: 5, gap: 0.42 },
    { kind: 'keg', x: (BAR.x0 + BAR.x1) / 2, y: BAR.top, z: BAR.z1 - 0.7, yaw: WEST },
  ];
  const seats = [BAR.z0 + 1.1, midZ, BAR.z1 - 1.1];
  for (const z of seats) {
    decor.push({ kind: 'stool', x: BAR.stoolX, y: 0, z });
    solids.push(...stoolSolids(BAR.stoolX, 0, z));
  }
  // Odds and ends: a candle stub and a matchbox on the bar; a wheel of cheese, a sardine tin and a cotton reel along the walls.
  const junk: Array<[JunkKind, number, number, number, number]> = [
    ['candle', (BAR.x0 + BAR.x1) / 2, BAR.top, BAR.z0 + 0.45, 0],
    ['matchbox', (BAR.x0 + BAR.x1) / 2, BAR.top, BAR.z1 - 2.1, EAST],
    ['cheese', -17.5, 0, HZ - 1.6, 0],
    ['sardines', HX - 1.1, 0, 5.6, EAST],
    ['spool', -HX + 1.4, 0, -14.5, 0],
  ];
  for (const [what, x, y, z, yaw] of junk) {
    decor.push({ kind: 'junk', what, x, y, z, yaw });
    solids.push(...junkSolids(what, x, y, z, yaw));
  }
  const npcs: NpcSpec[] = [
    // She keeps the bar: a mug in one wing and a rag going round it in the other.
    { name: 'Madam Tawny', kind: 'owl', x: keeper[0], z: keeper[1], y: BAR.step, facing: WEST, doing: 'tend', lines: [
      'Whoo is it now? Ah. The knight. Wipe your feet, you are dripping Cistern on my floor.',
      'I have kept this bar since before Dave found his speaker. It was quieter. I will not say it was better.',
      'They all come back here in the end, dear. Even the ones you have had words with. A thimble mends most things.',
    ] },
    // A ferret at the bar, who cannot keep still even sitting down.
    { name: 'Slink', kind: 'ferret', x: BAR.stoolX, z: seats[0], y: 0, facing: EAST, seated: true, doing: 'drink', partner: keeper, lines: [
      'Psst. Knight. You did not see me here. I am in the Foundry, working. Officially.',
      'There is a way through every wall if you are thin enough. You are not thin enough. No offence.',
    ] },
    // An owl of learning, who turns up once the Foundry is cleared and takes the far stool.
    { name: 'Professor Snow', kind: 'owl', x: BAR.stoolX, z: seats[2], y: 0, facing: EAST, seated: true, doing: 'drink', partner: keeper, when: { cleared: 'foundry' }, lines: [
      'Remarkable. You went INTO the Foundry and came out again. I have a paper on why that cannot be done.',
      'I shall have to revise the paper. Madam Tawny, another thimble. For science.',
    ] },
    // And one with his back to the wall by the Cistern door, arms folded: here once the Cistern is cleared.
    { name: 'Biscuit', kind: 'ferret', x: -HX + 0.55, z: 7.5, y: 0, facing: EAST, doing: 'lean', when: { cleared: 'cistern' }, lines: [
      'You drained the moat? YOU drained the moat. I lived in that moat. Well. Next to it.',
      'It is all right. It is warmer in here, and nobody is spitting at me. I am leaning now. This is my wall.',
    ] },
  ];
  return { decor, solids, npcs };
}

/**
 * The rest of the room's dressing, all of it only drawn: a rug under each table and a runner in from the door, a
 * dance floor before Dave's stage, strings of little lights overhead, bottles on the wall behind the bar, a
 * dartboard by the card table. And the doorman.
 */
function clubDressing(): { decor: Decor[]; npcs: NpcSpec[] } {
  const rugs: Array<[number, number, number]> = [[0x7a2a2a, 0x9a4a3a, 0xd8b060], [0x2a4a6a, 0x3a6a8a, 0xd8ccac], [0x3a5a3a, 0x5a7a4a, 0xd8b060]];
  const decor: Decor[] = TABLES.map((t, i): Decor => ({ kind: 'rug', x: t.x, y: 0, z: t.z, yaw: i * 0.4, r: 2.3, colors: rugs[i % rugs.length] }));
  decor.push({ kind: 'rug', x: 0, y: 0, z: 12.6, yaw: 0, w: 2.4, d: 8.4, colors: [0x6a2a3a, 0x8a3a4a, 0xd8b060] });
  decor.push({ kind: 'dancefloor', x: 0, y: 0, z: -8.6, nx: 8, nz: 3, tile: 1.4, colors: [0x7a2a6a, 0x1f6a72] });
  const midBar = (BAR.z0 + BAR.z1) / 2;
  decor.push(
    // (Low enough to be seen: the view looks down on him, and anything much over five up is off the top of it.)
    { kind: 'bulbs', x: -10, y: 5.2, z: -6, x1: 10, z1: -6, sag: 1.2, count: 12 },
    { kind: 'bulbs', x: -10, y: 5.2, z: 8, x1: 10, z1: 8, sag: 1.2, count: 12 },
    { kind: 'bulbs', x: 10, y: 5.2, z: 8, x1: 23.6, z1: midBar, sag: 0.9, count: 8 },
    { kind: 'bulbs', x: -10, y: 5.2, z: 8, x1: -23.6, z1: 0, sag: 0.9, count: 8 },
    { kind: 'bottles', x: HX - 0.02, y: 1.9, z: midBar, yaw: WEST, width: 4.6 },
    { kind: 'bottles', x: HX - 0.02, y: 2.8, z: midBar, yaw: WEST, width: 4.6 },
    { kind: 'dartboard', x: HX - 0.02, y: 2.4, z: 3.2, yaw: WEST },
  );
  const npcs: NpcSpec[] = [
    // A Stag Knight who has been beaten once, and now minds the door. (The owner: "maybe some of the little mini
    // bosses will come hang out there".)
    { name: 'Sir Hobnail', kind: 'stag', x: 4.4, z: 20.2, y: 0, facing: Math.atan2(-0.5, -1), doing: 'stand', when: { beaten: ['stag', 1] }, lines: [
      'HALT. Oh. It is you. In you go. You are on the list. You ARE the list.',
      'You put me on my back in front of my own gate, little knight. I have thought about it a great deal.',
      'I mind the door now. Nobody swings a hammer at a door. It is restful.',
    ] },
  ];
  return { decor, npcs };
}

/** Everything the tables add to the room: what is drawn, what is solid, and who is sitting there. */
export function clubTables(): { decor: Decor[]; solids: LevelDef['solids']; npcs: NpcSpec[] } {
  const decor: Decor[] = [];
  const solids: LevelDef['solids'] = [];
  const npcs: NpcSpec[] = [];
  for (const t of TABLES) {
    decor.push({ kind: 'table', x: t.x, y: 0, z: t.z, yaw: 0, ...t.top });
    solids.push(...tableSolids(t.x, 0, t.z));
    const place = (at: number): [number, number] => [t.x + Math.sin(at) * SEAT_OUT, t.z + Math.cos(at) * SEAT_OUT];
    const taken = t.seats.filter((s) => s.who);
    for (const s of t.seats) {
      const [x, z] = place(s.at);
      // (An ant does not sit: it stands at its place at the table, on its own six feet.)
      const sits = s.who?.kind !== 'ant';
      if (sits) {
        decor.push({ kind: 'stool', x, y: 0, z });
        solids.push(...stoolSolids(x, 0, z));
      }
      if (!s.who) continue;
      // He faces the table; across it is whoever else is at it (if anyone), and that is who he talks to.
      const other = taken.find((o) => o !== s);
      npcs.push({ ...s.who, x, z, y: 0, facing: s.at + Math.PI, seated: sits, partner: other ? place(other.at) : [t.x, t.z] });
    }
  }
  return { decor, solids, npcs };
}
/** The bar and the leaner, the same way. */
export const clubBarThings = clubBar;
export const clubDressingThings = clubDressing;

export function junction(): LevelDef {
  const base = compileCustom(club, 'hub');
  const t = clubTables();
  const bar = clubBar();
  const dress = clubDressing();
  const tables = { decor: [...dress.decor, ...t.decor, ...bar.decor], solids: [...t.solids, ...bar.solids], npcs: [...t.npcs, ...bar.npcs, ...dress.npcs] };
  return {
    ...base,
    decor: [...base.decor, ...tables.decor],
    solids: [...base.solids, ...tables.solids],
    npcs: [...(base.npcs ?? []), ...tables.npcs],
    theme: 'dungeon',
    hub: true,
    courseDoors: HUB_DOORS,
    restSpot: FIRE,
    // Where the ending looks: Dave on his stage, Mort on his couch, Wren.
    storySpots: { dave: { x: 0, y: 0.8, z: -16.5 }, mort: { x: 17, y: 0, z: 8 }, wren: { x: 13, y: 0, z: -6 } },
  };
}
