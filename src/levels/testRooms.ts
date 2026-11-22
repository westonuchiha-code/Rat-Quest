/**
 * THE TEST ROOMS: the one list of what there is to play in, and what is written on each door in the Hall.
 *
 * The owner, 2026-11-17 (in full in START-HERE.md, "THE VISION CHANGED"): "I want all the levels in the game to be
 * labeled as test rooms and we're basically going to use them all as playgrounds ... each current level we have right
 * now is going to be a representation of I guess a level genre in the game ... Each test room instead of being labeled
 * how they are now after whatever name we came up with they will just be labeled test room 1, Test Room 2 ... and we
 * can come up with nicknames for them in the future. The doors will be labeled after their sort of like biome type, as
 * placeholder names ... Anything that doesn't have a good nickname title yet we can just keep it the number for now."
 *
 * TO ADD A ROOM: build its level, put it in levels.ts, and add a line here. It gets its number's name and a door in
 * the Hall (levels/hall.ts lays the doors out from these lists; nothing else needs touching).
 * TO RENAME A BIOME: change `door` here. TO GIVE A ROOM A NICKNAME LATER: that is `door` too.
 *
 * Plain data: no level is built here, so anything may read it.
 */

/** A playground for one kind of play. */
export interface RoomEntry {
  /** "Test Room N". Never reused: a room that goes leaves a gap. */
  n: number;
  /** Its level (its main area: the areas its own doors lead to are N-B, N-C...). */
  id: string;
  /** What its door says: its BIOME, a placeholder. Null: no good name yet, the door shows only the number. */
  door: string | null;
  /** What it is for: the kind of game it is to feel like (his words where he has said). */
  like: string;
  /** How it plays, it and its areas (data/feel.ts), if not the waking world's way (the dream's rooms say so by their look). */
  feel?: 'sewers' | 'platform' | 'frost';
}

export const ROOMS: RoomEntry[] = [
  { n: 1, id: 'toybox', door: 'WACKY POMO DREAM', like: "Tony Hawk's Pro Skater mixed with everything else: a skate park in the dream. Floaty, fast, hyperactive; a superhero." },
  { n: 2, id: 'glowcave', door: 'MUSHROOM CAVE', like: 'A dark cave lit by what glows in it.' },
  { n: 3, id: 'cistern', door: 'THE SEWERS', feel: 'sewers', like: 'Dark Souls: blocking, parrying, harder fights, moving slower through the level.' },
  { n: 4, id: 'coldmain', door: 'ICE WORLD', feel: 'frost', like: 'Ice underfoot: sliding, and things that roll.' },
  { n: 5, id: 'longdrop', door: 'DOWNHILL PIPES', like: 'Sonic Adventure: grinding down a railway on his shield, smacking bats out of the air.' },
  { n: 6, id: 'foundry', door: 'FOUNDRY', like: 'Fire and iron: heat to cross, heavy beasts.' },
  { n: 7, id: 'forge', door: 'FORGE', like: "The Foundry's new look, tried out: furnaces, a ladle that pours." },
  { n: 8, id: 'hollows', door: 'DEEP CAVES', feel: 'platform', like: 'A 3D Mario: wall jumps and double jumps over a long fall, weaker beasts.' },
  { n: 9, id: 'keep', door: 'CASTLE', like: 'Ocarina of Time: a keep with guards behind shields.' },
  { n: 10, id: 'garden', door: 'MOVE GYM', like: 'Rulers, ledges and chimneys: for feeling the jump numbers.' },
  { n: 11, id: 'hub', door: 'THE CLUB', like: "Dizzy Dave's hangout, as it was: the first hub." },
  { n: 12, id: 'workshop', door: 'WORKSHOP', like: 'Not a level: the parts for building levels, a bay each, doing what they are for.' },
  { n: 13, id: 'musicroom', door: 'MUSIC ROOM', like: 'A piano on the floor, and an echo puzzle: listen, then play it back.' },
  { n: 14, id: 'breakyard', door: 'THE YARD', like: 'Things to hit: levers that open gates, a cracked wall, a cracked floor.' },
  { n: 15, id: 'gauntlet', door: 'GAUNTLET', like: 'Hazards and helpers: conveyor belts, swinging blades, spikes, fans.' },
  { n: 16, id: 'press', door: 'THE PRESS', like: 'More hazards: crushers (one to ride), flame jets in walls and floor.' },
  { n: 17, id: 'greenroom', door: 'GREEN ROOM', like: 'New characters for Fable: two moles and two hedgehogs, to talk to.' },
  { n: 18, id: 'coilroom', door: 'COIL ROOM', like: 'A Tesla coil plays a beat and zaps the plates: climb in time. A keyboard to play the coil.' },
  { n: 19, id: 'standin', door: 'STAND-IN', like: 'Every character, played, each its own way: talk to one to be them. A course with a place for each.' },
];

/** A fight to work on by itself, and its place with it ("we can tune the atmosphere while we tune the fight"). */
export interface BossEntry {
  id: string;
  door: string;
}
export const BOSS_ROOMS: BossEntry[] = [
  { id: 'widowpit', door: 'SPIDER BOSS' },
  { id: 'lair', door: 'GRIMSQUEAK' },
  { id: 'sump', door: 'SUMP WYRM' },
  { id: 'brood', door: 'BROOD MOTHER' },
];

/**
 * A room for each kind of enemy: one of it at a time, and a button on the floor that puts another in.
 * `piece`: what it is called in the level kit (levels/custom.ts), which knows how each kind is stood in a room.
 */
export interface PracticeEntry {
  /** (Letters, digits and _ only: it is opened by `#level=<id>`.) */
  id: string;
  piece: 'roach' | 'toad' | 'beetle' | 'bat' | 'guard' | 'mantis' | 'stag' | 'hornet' | 'ant' | 'firefly' | 'scorpion';
  door: string;
  /** Its full name, for the room's own name. */
  name: string;
}
export const PRACTICE_ROOMS: PracticeEntry[] = [
  { id: 'practice_roach', piece: 'roach', door: 'COCKROACH', name: 'Giant Cockroach' },
  { id: 'practice_toad', piece: 'toad', door: 'TOAD', name: 'Toad' },
  { id: 'practice_bat', piece: 'bat', door: 'BAT', name: 'Flitter' },
  { id: 'practice_mantis', piece: 'mantis', door: 'MANTIS', name: 'Orchid Mantis' },
  { id: 'practice_ant', piece: 'ant', door: 'ANT PIKEMAN', name: 'Ant Pikeman' },
  { id: 'practice_guard', piece: 'guard', door: 'KEEP GUARD', name: 'Keep Guard' },
  { id: 'practice_hornet', piece: 'hornet', door: 'HORNET', name: 'Hornet Lancer' },
  { id: 'practice_firefly', piece: 'firefly', door: 'FIREFLY', name: 'Firefly Bomber' },
  { id: 'practice_scorpion', piece: 'scorpion', door: 'SCORPION', name: 'Lamp Scorpion' },
  { id: 'practice_beetle', piece: 'beetle', door: 'IRONBACK', name: 'Ironback' },
  { id: 'practice_stag', piece: 'stag', door: 'STAG KNIGHT', name: 'Stag Knight' },
];

/** The Hall's own id: where the game starts, and where every door leads back to. */
export const HALL_ID = 'hall';

/** "Test Room 3", "Test Room 3B": a room's name, and the names of the areas its own doors lead to (B, C, ... in the order they are found). */
export function roomName(n: number, area = 0): string {
  return `Test Room ${n}${area > 0 ? String.fromCharCode(65 + area) : ''}`;
}

/**
 * WHAT A ROOM'S OWN TITLE BOARD SAYS (BACKLOG B6, 2026-11-18). Four rooms have a board with their name on it as you
 * come in, written before the rooms were numbered: THE TOY BOX (1), THE MILKY WAY (1B), THE BIG DIPPER (1C), THE LONG
 * DROP (5). 'old' leaves them so; 'number' makes each say its room's number ("TEST ROOM 5"). The rest of each board
 * (what to press) is not changed, nor boards that name a thing in a room (THE PIPE, THE RAILS). THE OWNER'S CALL:
 * he chose 'both'. (`&boards=old` or `&boards=number` on the address shows the others, for a look.)
 */
export const BOARDS_SAY: BoardsSay = 'both';
/** 'both' (the owner, 2026-11-18: "Toy Box, Long Drop is fine, but let it keep its room number"): the old name, and
 * under it, on a line of its own, the room's number; the board is made a line taller for it. */
export type BoardsSay = 'old' | 'number' | 'both';
