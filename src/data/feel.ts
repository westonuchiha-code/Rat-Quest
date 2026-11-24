/**
 * HOW EACH BIOME PLAYS: the one table of what is DIFFERENT about how he moves from one kind of place to another.
 *
 * The owner, 2026-11-17: "certain physics should be kept separate ... you'll still be able to surf on your shield
 * outside the wacky Pomo world but you shouldn't be able to like lean forward and give yourself momentum and that kind
 * of stuff, like the dream world is supposed to be fantastical, it's supposed to feel floatier and more high velocity
 * and hyperactive and different than the normal world, so when you're playing the game in the normal levels you want
 * to have different physics. So along with separating the test room biomes, we also want to keep track of how the
 * physics act in each biome."
 *
 * SO: anything that changes how he moves in ONE kind of place is a line in this table, and is read from it. It is
 * never a change to the numbers every place shares (TUNING). A level says which it is with `feel` (levels/types.ts);
 * one that does not say is `waking`, unless it wears the dream's look, which is `dream`.
 *
 * THE DREAM ON FOOT (2026-11-17, the same day: "continue and forget the triple jump for now"): he runs faster, jumps
 * higher and falls slower there (`foot`). ON HIS SHIELD THE AIR IS AS IT WAS: the dream's rides are measured to it.
 * WHAT IS NOT HERE YET, and is his for the dream ("maybe we'll give him a triple jump ... you're kind of way floatier
 * and stronger in this world so you almost feel like a superhero"): a third jump (he said to leave it for now), and
 * harder blows.
 */
import { TUNING } from './tuning';
export type FeelId = 'waking' | 'dream' | 'sewers' | 'platform' | 'frost' | 'speed';

export interface Feel {
  id: FeelId;
  /** What it is called in the notes and on the Tweaks panel. */
  name: string;
  /** What playing there is to be LIKE (his words, shortened). */
  like: string;
  /**
   * ON FOOT: what his running speed and his jumps (the first and the one in the air) are multiplied by, and how much
   * of gravity pulls on him while he is not on his shield. 1, 1, 1 is the waking world.
   */
  /** (`grip`: how quickly he gets going and stops on ORDINARY ground there, as a share of his usual; 1 if not said.) */
  foot: { run: number; jump: number; gravity: number; grip?: number };
  /**
   * FIGHTING: what his blows (and what he throws) do to a creature is multiplied by `dealt`; what a blow costs HIM is
   * multiplied by `taken` (and rounded to whole hearts, never less than one). 1 and 1 is the waking world.
   */
  /** (`plunge`: what his GROUND POUND does, the dive and its blast, is multiplied by this as well.) */
  /** (`bounce`: THE STOMP. His dive landed on a creature throws him back up at this speed, his air jump given back. None if not said.) */
  fight: { dealt: number; taken: number; plunge: number; bounce?: number; /** THE RIPOSTE: after a perfect guard, his next sword blow on that creature within `riposteFor` seconds does `riposte` times the harm. None if not said. */ riposte?: number; riposteFor?: number };
  /** On his shield. */
  ride: {
    /** THE TUCK: the stick pushed the way he is going crouches him, pushes him along on the flat, and builds speed past his standing top speed downhill. */
    tuck: boolean;
    /** Tricks landed pay speed PAST his standing top speed. (Anywhere, a kickflip landed brings him up TOWARDS that speed, as it always did.) */
    trickSpeed: boolean;
    /** The SPIN (roll, in the air) and the GRAB (guard held, in the air). */
    airTricks: boolean;
    /** THE RUSH: a creature struck down while he rides or grinds is a burst of speed (TUNING.ride.rush). */
    rush?: boolean;
  };
}

export const FEELS: Record<FeelId, Feel> = {
  waking: {
    id: 'waking',
    name: 'The waking world',
    like: 'Heavier and more dangerous: blocking, parrying, harder fights. He can ride his shield down a slope and grind a rail, and kickflip; no more than that.',
    foot: { run: 1, jump: 1, gravity: 1 },
    fight: { dealt: 1, taken: 1, plunge: 1 },
    ride: { tuck: false, trickSpeed: false, airTricks: false },
  },
  dream: {
    id: 'dream',
    name: 'The wacky Pomo dream',
    like: 'Fantastical, floatier, faster, hyperactive: a skate park. He runs faster, jumps higher and falls slower; lean forward for speed, tricks pay speed, spins and grabs in the air.',
    // (The numbers are TUNING.dream, so that they can be tried from the Tweaks panel: "The dream".)
    foot: TUNING.dream,
    fight: TUNING.dream,
    ride: { tuck: true, trickSpeed: true, airTricks: true },
  },
  sewers: {
    id: 'sewers',
    name: 'The sewers',
    like: 'Dark Souls: blocking, parrying, harder fights, moving slower through the level. He runs slower, his blows do less, and what hits him costs double; but a perfect guard opens the creature to a riposte, one blow worth four.',
    // (The numbers are TUNING.sewers: Tweaks, "The sewers".)
    foot: TUNING.sewers,
    fight: TUNING.sewers,
    ride: { tuck: false, trickSpeed: false, airTricks: false },
  },
  platform: {
    id: 'platform',
    name: 'The platform room',
    like: 'A 3D Mario: wall jumps and double jumps, and weaker enemies he can ground pound his way out of. His blows do a third more, his ground pound double, and a pound landed on a creature bounces him back up: they are stepping stones.',
    // (The numbers are TUNING.platform: Tweaks, "The platform room".)
    foot: TUNING.platform,
    fight: TUNING.platform,
    ride: { tuck: false, trickSpeed: false, airTricks: false },
  },
  frost: {
    id: 'frost',
    name: 'The frost',
    like: 'Slipping and sliding: nothing has much grip, and on the ice itself he scrabbles to get going, skids wide, slides on his belly to travel and digs his shield in to stop.',
    // (The numbers are TUNING.frost and TUNING.ice.)
    foot: TUNING.frost,
    fight: TUNING.frost,
    ride: { tuck: false, trickSpeed: false, airTricks: false },
  },
  speed: {
    id: 'speed',
    name: 'The speed room',
    like: 'Sonic Adventure: grinding down a railway on his shield, smacking bats out of the air. Every creature struck down from the shield is a burst of speed, so a run of them is faster and faster.',
    foot: TUNING.speed,
    fight: TUNING.speed,
    ride: { tuck: false, trickSpeed: false, airTricks: false, rush: true },
  },
};

/** How a level plays: what it says, or the dream's way if it wears the dream's look, or the waking world's. */
export function feelOf(level: { feel?: FeelId; look?: 'dream' }): Feel {
  return FEELS[level.feel ?? (level.look === 'dream' ? 'dream' : 'waking')];
}
