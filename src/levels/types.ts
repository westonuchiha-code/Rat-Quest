/**
 * A level is plain data: the room, what is in it, and what he has to do to open the exit.
 * Nothing here touches three.js, so tests can check every level in node.
 */
import type { DozerSpec } from '../world/dozers';
import type { Box, Decor, FireVolume, GateSpec, LavaVolume, MoverSpec, PipeSpec, WaterVolume } from '../world/layout';
import type { NpcSpec } from '../npc/npc';
import type { CollectibleDef, CollectibleKind } from '../world/collectibles';
import type { PickupDef } from '../data/equipment';
import type { DoorSpec } from '../world/rooms';
import type { Well } from '../world/collision';
import type { FeelId } from '../data/feel';

/** One thing he must do. A level opens its exit when every main goal is done. */
export type GoalDef =
  | { type: 'collect'; kind: CollectibleKind; /** how many, or 'all' of that kind in the level */ count: number | 'all'; label: string }
  | { type: 'defeat'; /** every enemy that stands in the room at the start */ label: string }
  | { type: 'waves'; label: string }
  /** Smash this many of the level's wall pipes (or all of them). */
  | { type: 'burst'; count: number | 'all'; label: string }
  | { type: 'reach'; x: number; y: number; z: number; radius: number; label: string }
  /** Turn aside this many attacks with a perfectly timed shield, in one visit. */
  | { type: 'parry'; count: number; label: string }
  /**
   * A shy wedge: it is only there while its keepers (the ground beasts that start within `radius` of it) are all alive,
   * all at rest, and he is outside the range they notice him from. So it cannot be fought for, only crept up on.
   */
  | { type: 'unseen'; radius: number; label: string };

export interface EnemySpec {
  /** Which enemy. Default: the roach. */
  type?: 'scuttler' | 'toad' | 'grimsqueak' | 'ironback' | 'bat' | 'guard' | 'mantis' | 'stag' | 'brood' | 'wyrm' | 'hornet' | 'ant' | 'firefly' | 'widow' | 'scorpion' | 'roller' | 'sparkbeetle';
  /** A Stag Knight who is a BOSS (the Warden of Flotsam): his name on the bar, and his own health and poise. */
  boss?: { name: string; hp: number; poise: number };
  /** A guard: which way he faces at his post (radians). Default 0. */
  facing?: number;
  x: number;
  z: number;
  /** Height of the floor it stands on. Default 0. */
  y?: number;
  /** The floor patch it guards. Default: a 5 unit radius. */
  arena?: { x0: number; x1: number; z0: number; z1: number };
  respawn?: boolean;
  /** Hunts the rat from anywhere in the room instead of keeping to its patch. Used for enemies that arrive in waves. */
  hunt?: boolean;
  /**
   * A scorpion: the colour of its lamp (and of the ring it marks on the floor). Only looks, as a firefly's is.
   * A firefly: the colour of its light, and of the fire it lets fall (its drops, the marks they make on the floor, the
   * flames and their light). Default: a firefly's yellow-green lantern and orange fire. The colour is only looks: a
   * coloured one flies, bombs and burns as any other does.
   */
  color?: number;
  /** A roach in all it does, but drawn as one of the Widow's young: a small spider. Only looks. */
  look?: 'hatchling';
  /** A bat that hangs in the air at `y` to be hit in passing (enemies/bat.ts: a flutterer). One blow; it does nothing. */
  flutter?: boolean;
  /** A bat: what it hangs from (drawn above its roost). Default rock. */
  perch?: 'rock' | 'chain';
  /**
   * Not one of those a 'defeat' goal asks for: it is somewhere else in the level than the beasts the goal names (the
   * hornet over the Foundry's dock is no part of the Slag Crew on the island). Beating it is its own reward.
   */
  uncounted?: boolean;
}

/**
 * A Golden Wedge: one of several separate prizes in an open course (the "pick a goal" kind of level).
 * It sits at x, y, z (its base). With `appears` set it only shows up once that is done; with null it is there from the start.
 * He earns it by touching it. The first wedge he takes opens the exit; the course stays open for the rest.
 */
export interface WedgeDef {
  id: string;
  name: string;
  /** A short clue for the quest screen. */
  hint: string;
  x: number;
  y: number;
  z: number;
  appears: GoalDef | null;
  /** A secret only some gear can reach (an item id). The jump checker leaves it out; tests check it with that gear on. */
  gear?: string;
}

/** A door in a hub that leads into a course. It opens once he has `need` Golden Wedges in all. `to` null: not built yet. */
export interface CourseDoorDef {
  to: string | null;
  name: string;
  need: number;
  door: DoorSpec;
  /** What its sign says UNDER the name, instead of the wedges taken there (the Hall's doors: "TEST ROOM 3"). */
  under?: string;
}

export interface LevelDef {
  id: string;
  name: string;
  /** One line telling what the level is about, for the level list. */
  blurb: string;
  /** Drawn as someone else in this level: the hedgehog, worked by his controls (player/standIn.ts; the Stand-in room). */
  playAs?: 'hedgehog';
  /** Which music plays here. Default 'drift'. */
  music?: 'drift' | 'pump' | 'groove' | 'echo' | 'march' | 'dream';
  /** Colour of the fog and the far dark. Default: the sewer's. */
  fog?: number;
  /** Where the fog starts and where it is total (default 18 and 90). Big open levels push it back so their landmarks show. */
  fogRange?: [number, number];
  /** What drifts in its air, if not its theme's own: 'ice' is fine snow sifting down. (See world/motes.ts.) */
  motes?: 'ice' | 'foundry' | 'cave' | 'keep' | 'sewer' | 'stars';
  /** Open sky instead of a roof: 'space' is a dome of stars all round, however far he looks. (The dream.) */
  sky?: 'space';
  /** The dream's creatures: frightening ones from elsewhere, in loud colours, asleep or standing about (world/dozers.ts). Each is solid: its box is in `solids`. */
  dozers?: DozerSpec[];
  /**
   * A place with no floor under it (a road in the sky): fallen this far below the last ground he stood on, he is put
   * back on that ground, a heart the poorer. (As `fallBack` does for a level whose floor is at zero.)
   */
  fallDepth?: number;
  /** He wears another look here: 'dream' is the knight in loud colours with a scarf three times as long. Only looks. */
  look?: 'dream';
  /**
   * A FALL COSTS NOTHING HERE: he is put back where he last stood, and that is all. (The owner, 2026-11-17, of the dream
   * and of riding downhill: "the most of the fun comes from going fast and jumping high and doing tricks and stuff so
   * adding fall damage to this area really just takes away from the fun there's no upside to it, so maybe we could
   * just make it a flag for the wacky Pomo levels in general and any downhill levels that we make in any world.")
   * FOR EVERY DREAM LEVEL, AND EVERY LEVEL THAT IS A RIDE DOWNHILL, IN ANY WORLD.
   */
  fallFree?: boolean;
  /** How the place PLAYS (data/feel.ts). Default: the waking world's way; the dream's, if it wears the dream's look. */
  feel?: FeelId;
  /** A skate park: the air attack puts him on his shield over ANY ground here, not only over a steep slope (and so there is no dive). */
  skate?: boolean;
  /**
   * How much plain light there is in the place, 0 to 1 (default 1). A dark place (the Glow Cave: 0.4) is lit by its
   * coloured lights and by what glows in it.
   */
  ambient?: number;
  /** Which look the level has (stone, wood and iron of the exit door follow it). Default: the sewer. */
  theme?: 'sewer' | 'mine' | 'cave' | 'dungeon' | 'foundry' | 'keep' | 'power';
  solids: Box[];
  /** The void under the room, for the dark bottom. Null when there is none. */
  pit: Box | null;
  water: WaterVolume[];
  /** Pipes, drains and lamps, drawn only. */
  decor: Decor[];
  /** Wall pipes that can be smashed. */
  pipes?: PipeSpec[];
  /** Standing fires: only the fireproof walk through. */
  fire?: FireVolume[];
  /** Portcullises that open when their pipes are burst, or when the goals are done. */
  gates?: GateSpec[];
  /** Pools of lava: touching one hurts. */
  lava?: LavaVolume[];
  /** Falling into the dark costs a heart and puts him back on the last ground he stood on (instead of back at the start). */
  fallBack?: boolean;
  /**
   * A round room in the dark that he cannot leave: below `top`, he is kept within `r` of (x, z) at its floor (`y`),
   * and high above it `flare` further out for each unit up (a funnel: one who falls in from anywhere above comes
   * down inside). Nothing is drawn of it: it is the edge of the light.
   */
  well?: Well;
  /** Platforms that glide back and forth and carry the rat. */
  movers?: MoverSpec[];
  /** Web curtains across his way (world/webs.ts): torn through at a rush's speed, or they catch him. */
  webs?: import('../world/webs').WebSpec[];
  /**
   * Floor plates: stepping on one presses it for good; gates can wait for them.
   * With `spawn` it is a BUTTON THAT COMES BACK UP when he steps off: each time it is pressed, one more of that
   * creature is put in the room, unless `most` (default 6) are alive already. (The practice rooms: levels/practice.ts.)
   */
  /** (`weight`: a WEIGHT PLATE, world/locks.ts. Down only while he or something set down is on it.) */
  plates?: Array<{ x: number; z: number; y: number; spawn?: EnemySpec; most?: number; weight?: boolean }>;
  /** CHECKPOINTS (world/locks.ts): lanterns. The one he last touched is where he comes back to if he is beaten here. */
  checkpoints?: Array<{ x: number; y: number; z: number }>;
  /** Friendly characters to talk to. */
  npcs?: NpcSpec[];
  spawn: { x: number; y: number; z: number; facing: number };
  collectibles: CollectibleDef[];
  /** What is inside each crate, in the order the crates appear in `solids`: a collectible id, or null. */
  crateContents: Array<string | null>;
  enemies: EnemySpec[];
  /** Enemies that arrive one group at a time. Used by the 'waves' goal. */
  waves: EnemySpec[][];
  gear: PickupDef[];
  goals: GoalDef[];
  exit: DoorSpec;
  /** Named places that story scenes are staged around (see src/story/scenes.ts). */
  storySpots?: Record<string, { x: number; y: number; z: number }>;
  /** An open course: separate Golden Wedges to earn in any order instead of one set of goals. */
  wedges?: WedgeDef[];
  /** No ledge grabbing here (a level about jump timing, where catching an edge would make it easy). */
  noGrab?: boolean;
  /** No long jump here (gaps meant to be crossed with a plain running jump). */
  noLongJump?: boolean;
  /** What it was called before every level became a numbered test room (levels/testRooms.ts): kept as a note. */
  was?: string;
  /** A hub: doors into courses; its own door is open from the start. */
  hub?: boolean;
  courseDoors?: CourseDoorDef[];
  /** Which world this area belongs to (its wedges count together on the Club's door sign). Default: its own id. */
  world?: string;
  /** A sub-area: its door is open from the start and leads back to this area (in front of the door that led here). */
  returnTo?: string;
  /** A fire to rest at: heals him and saves. */
  restSpot?: { x: number; y: number; z: number };
  /** Gear given when everything in the level has been collected. */
  reward?: string;
}
