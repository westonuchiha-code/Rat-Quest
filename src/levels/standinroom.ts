/**
 * THE STAND-IN (Test Room 19, 2026-11-20). Every character of the Club and the Green Room, played, each in a way of
 * its own (player/critters: the owner, "try to make each one of them have its own sort of unique little play style
 * ... their own unique way of getting around the levels ... just prototypes"). You walk in as the knight; they stand
 * in a LINE-UP by the way in. Talk to one to the end and you are them (npc.ts `swap`): the knight stands where they
 * stood. Talk to another and you are straight away that one instead; talk to the knight to be yourself again.
 *
 * Not a level: a course with a place for each way of getting about (and most places can be got to more ways than one):
 *   STEPS up to a high SHELF in the west, and off it a STEEP SLOPE and a GENTLE one (roll down, slide);
 *   the BURROW at the back: its way in too low to walk (the hedgehog's ball; the ferret slinking; the mole under it);
 *   the PILLAR: tall and sheer, a crumb on top (climb it, fly up it, reel up to it on yarn, blink to it, pogo);
 *   the GAP: two high blocks, a ramp up the first, a crumb on the second (pounce, dash, glide, hover, blink, yarn);
 *   the PEN: walled and roofed all round, a crumb shut in it (only the mole gets in: under);
 *   the DEEP POOL: a crumb on the bottom (only a turtle gets down to it: one dives, one walks the bottom);
 *   three ROACHES that come back, to try everything on; pots by the way in.
 */
import { NO_GOALS, compileCustom, type CustomLevel, type Piece } from './custom';
import type { LevelDef } from './types';
import type { Decor } from '../world/layout';
import type { NpcSpec } from '../npc/npc';
import type { PatronLook } from '../npc/patrons';
import { PLAYABLE, PLAYABLE_LOOKS } from '../player/critters';

const HX = 20;
const HZ = 16;
/** The steps (west), each a block from the wall out, and the shelf they reach. */
export const STEPS = { x0: -HX, x1: -16, tops: [1, 2, 3], shelf: 4, shelfZ: -4 } as const;
/** The two slopes down off the shelf, east: steep (slide down it), gentle (roll down it). */
export const SLOPES = { steep: { z0: -HZ, z1: -12, x1: -13.5 }, gentle: { z0: -10, z1: -6, x1: -6 } } as const;
/**
 * The BURROW: a walled nook against the back wall, its only way in a gap this low and this wide in its front wall:
 * too low to walk through. A crumb inside.
 */
export const BURROW = { x0: -4, x1: 0, z0: -HZ, front: -12.5, thick: 0.6, gap: { w: 0.9, h: 0.7 }, top: 2.5 } as const;
/** The PILLAR: tall, sheer, a crumb on top. */
export const PILLAR = { x0: 3, x1: 5, z0: -9, z1: -7, top: 5 } as const;
/** The GAP: a block with a ramp up to it, open air, and a second block with the crumb. */
export const GAP = { a: { x0: 8, x1: 11 }, b: { x0: 16, x1: HX }, z0: -HZ, z1: -12, top: 3, ramp: { z1: -6 } } as const;
/** The PEN: walls and a roof all round, a crumb inside. */
export const PEN = { x0: 12, x1: 17, z0: -2, z1: 3, top: 2.5, roof: 2.8 } as const;
/** The DEEP POOL: its walls, the water, a crumb on the bottom. */
export const POOL = { x0: -13, x1: -6, z0: 1, z1: 7, wall: 2, water: 1.9, bed: 0.55 } as const;
/** The line-up by the way in: where the first stands, how far apart, how far in. */
export const LINEUP = { x0: -15, gap: 2.5, z: 9.5 } as const;

const crumb = (x: number, z: number, top: number): Piece => ({ t: 'crumb', x0: x, z0: z, x1: x, z1: z, top });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, bottom?: number): Piece => ({ t, x0, z0, x1, z1, top, ...(bottom !== undefined ? { bottom } : {}) });

const room: CustomLevel = {
  name: 'The Stand-in',
  blurb: 'Every character, played, each its own way: talk to one to be them. A course with a place for each.',
  theme: 'dungeon',
  width: HX * 2, depth: HZ * 2, wallHeight: 10,
  pieces: [
    box('floor', -HX, -HZ, HX, HZ, 0),
    { t: 'spawn', x0: 0, z0: HZ - 2.5, x1: 0, z1: HZ - 2.5, top: 0 },
    { t: 'exit', x0: 0, z0: HZ, x1: 0, z1: HZ, top: 0, dir: 'n' },
    // The steps, and the shelf.
    box('platform', STEPS.x0, 2, STEPS.x1, 5, STEPS.tops[0], 0),
    box('platform', STEPS.x0, -1, STEPS.x1, 2, STEPS.tops[1], 0),
    box('platform', STEPS.x0, STEPS.shelfZ, STEPS.x1, -1, STEPS.tops[2], 0),
    box('platform', STEPS.x0, -HZ, STEPS.x1, STEPS.shelfZ, STEPS.shelf, 0),
    // Down off the shelf: the steep slope and the gentle one (each climbing west, to the shelf).
    { t: 'ramp', x0: STEPS.x1, z0: SLOPES.steep.z0, x1: SLOPES.steep.x1, z1: SLOPES.steep.z1, top: STEPS.shelf, dir: 'w' },
    { t: 'ramp', x0: STEPS.x1, z0: SLOPES.gentle.z0, x1: SLOPES.gentle.x1, z1: SLOPES.gentle.z1, top: STEPS.shelf, dir: 'w' },
    // The burrow.
    ...((): Piece[] => {
      const B = BURROW;
      const mx = (B.x0 + B.x1) / 2;
      const fz = B.front - B.thick;
      return [
        box('wall', B.x0, B.z0, B.x0 + 0.5, B.front, B.top),
        box('wall', B.x1 - 0.5, B.z0, B.x1, B.front, B.top),
        box('wall', B.x0 + 0.5, fz, mx - B.gap.w / 2, B.front, B.top),
        box('wall', mx + B.gap.w / 2, fz, B.x1 - 0.5, B.front, B.top),
        box('platform', mx - B.gap.w / 2, fz, mx + B.gap.w / 2, B.front, B.top, B.gap.h),
        crumb(mx, (B.z0 + fz) / 2, 0),
      ];
    })(),
    // The pillar.
    box('platform', PILLAR.x0, PILLAR.z0, PILLAR.x1, PILLAR.z1, PILLAR.top, 0),
    crumb((PILLAR.x0 + PILLAR.x1) / 2, (PILLAR.z0 + PILLAR.z1) / 2, PILLAR.top),
    // The gap: the first block, a ramp up to it from the front, and the second block with the crumb.
    box('platform', GAP.a.x0, GAP.z0, GAP.a.x1, GAP.z1, GAP.top, 0),
    { t: 'ramp', x0: GAP.a.x0, z0: GAP.z1, x1: GAP.a.x1, z1: GAP.ramp.z1, top: GAP.top, dir: 'n' },
    box('platform', GAP.b.x0, GAP.z0, GAP.b.x1, GAP.z1, GAP.top, 0),
    crumb((GAP.b.x0 + GAP.b.x1) / 2, (GAP.z0 + GAP.z1) / 2, GAP.top),
    // The pen: four walls, a roof on them, a crumb shut in.
    box('wall', PEN.x0, PEN.z0, PEN.x0 + 0.5, PEN.z1, PEN.top),
    box('wall', PEN.x1 - 0.5, PEN.z0, PEN.x1, PEN.z1, PEN.top),
    box('wall', PEN.x0 + 0.5, PEN.z0, PEN.x1 - 0.5, PEN.z0 + 0.5, PEN.top),
    box('wall', PEN.x0 + 0.5, PEN.z1 - 0.5, PEN.x1 - 0.5, PEN.z1, PEN.top),
    box('platform', PEN.x0, PEN.z0, PEN.x1, PEN.z1, PEN.roof, PEN.top),
    crumb((PEN.x0 + PEN.x1) / 2, (PEN.z0 + PEN.z1) / 2, 0),
    // The deep pool: four walls, the water, a crumb on the bottom.
    box('wall', POOL.x0, POOL.z0, POOL.x0 + 0.5, POOL.z1, POOL.wall),
    box('wall', POOL.x1 - 0.5, POOL.z0, POOL.x1, POOL.z1, POOL.wall),
    box('wall', POOL.x0 + 0.5, POOL.z0, POOL.x1 - 0.5, POOL.z0 + 0.5, POOL.wall),
    box('wall', POOL.x0 + 0.5, POOL.z1 - 0.5, POOL.x1 - 0.5, POOL.z1, POOL.wall),
    { t: 'water', x0: POOL.x0 + 0.5, z0: POOL.z0 + 0.5, x1: POOL.x1 - 0.5, z1: POOL.z1 - 0.5, top: POOL.water },
    // (On the pool's bed: the water piece lays one, this far under its surface.)
    crumb((POOL.x0 + POOL.x1) / 2, (POOL.z0 + POOL.z1) / 2, POOL.bed),
    // Three roaches that come back.
    { t: 'roach', x0: 0, z0: -3, x1: 0, z1: -3, top: 0, props: { respawn: true } },
    { t: 'roach', x0: 7, z0: 3, x1: 7, z1: 3, top: 0, props: { respawn: true } },
    { t: 'roach', x0: -3, z0: -7, x1: -3, z1: -7, top: 0, props: { respawn: true } },
  ],
};

/** What each says, in the line-up: who they are and their way of getting about (and the swap). */
const LINES: Record<PatronLook, string[]> = {
  bramble: ['Bramble. Hedgehog. Press ROLL and I am a ball: I roll, I bounce, I go through the burrow.', 'ATTACK and I spit. Curled up, ATTACK and my spines go out all round. Want a go?'],
  thistle: ['Thistle! Curled up, hold JUMP and I bounce, higher every time. Like a pogo stick, but spikier.', 'And ATTACK throws three of my quills at once. Go on, be me.'],
  digger: ['Digger. I dig. ROLL and I am under the floor: nothing can get me, and walls are nothing to me.', 'ATTACK down there and I come up under whatever is on top. That pen? I can get in that pen.'],
  dot: ['I am Dot. I cannot see much, but I can knit, and wool is very strong.', 'ATTACK and I throw my yarn up ahead. If it catches a ledge, up I go. If it catches a roach, in it comes.'],
  pebble: ['Pebble! ROLL while I am going and I tuck into my shell and SLIDE. I bounce off walls. Roaches go flying.', 'In the water I am fast, and ROLL there and I dive right down to the bottom. JUMP held to come up.'],
  mo: ['Mo. I am old and I am slow and nothing in this world can knock me over.', 'ATTACK and I stomp: the ground shakes all round. GUARD and I go in my shell. Water? I walk along the bottom.'],
  vix: ['Vix. I am the fastest thing on four legs down here.', 'Hold JUMP and I crouch. Let go and I pounce, a long way, and I land ON whatever is there.'],
  ash: ['Ash. Press ROLL and I am a shadow: a dash, straight through anything, and nothing touches me.', 'Twice in the air, before I have to land. Across the gap, easy.'],
  slink: ['Slink. Run at a wall and JUMP and I climb it, while my grip lasts. That pillar is nothing.', 'ROLL and I slink, flat and quick, under things too low for anyone else.'],
  biscuit: ['Biscuit! ATTACK and I do the dance! Hopping and bouncing and nothing can touch me!', 'And I jump twice. And ROLL is a little hop back. Shall we dance?'],
  tawny: ['Tawny. I fly, after a fashion. JUMP in the air flaps, four times. Hold JUMP falling and I glide.', 'ATTACK in the air and I dive, talons first. On the ground I am... less good.'],
  snow: ['Snow. Hold JUMP in the air and I hover, while my breath lasts. I can wait up there all day. Nearly.', 'ATTACK throws three feather darts. They sting.'],
  jinx: ['Jinx. I do magic. Not the fire and ice kind. Bad luck. ATTACK throws a hex: whatever it hits, something heavy falls on it out of nowhere.', 'ROLL throws my mark, up high. ROLL again and I blink to it. GUARD and I swap places with whoever I jinxed.'],
};

export function standInRoom(): LevelDef {
  const def = compileCustom(room, 'standin');
  const signs: Decor[] = [
    { kind: 'sign', x: 0, y: 4.5, z: HZ - 0.06, yaw: Math.PI, w: 8, h: 2.4, lines: ['THE STAND-IN', 'talk to anyone: be them', 'talk to yourself: be you'], post: 0 },
  ];
  // The line-up, facing the way in: read one's talk to the end and you are them.
  const npcs: NpcSpec[] = PLAYABLE_LOOKS.map((look, i) => ({
    name: PLAYABLE[look].name,
    kind: PLAYABLE[look].kind,
    x: LINEUP.x0 + LINEUP.gap * i,
    z: LINEUP.z,
    y: 0,
    facing: 0,
    doing: 'stand',
    lines: [...LINES[look], 'I will stand here and be you. Come and talk to yourself when you want to swap back.'],
    swap: { as: look, back: ['So this is what it is like, being the hero. Mostly standing about in a helmet.', 'Had enough? Right. Swap back. Here we go.'] },
  }));
  return { ...def, goals: NO_GOALS, decor: [...def.decor, ...signs], npcs: [...(def.npcs ?? []), ...npcs] };
}
