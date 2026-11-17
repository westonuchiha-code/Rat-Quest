/**
 * THE TOY BOX: the dream's playground. A skate park in space.
 *
 * The owner, 2026-11-17: "I want this whole wacky Pomo area to feel like a big playground and I want there to be a lot of
 * areas where you can just like almost skate around on the shield like ... in one of the test levels you made like a
 * half pipe and if you do it correctly you can kind of like use it almost like an actual half pipe ... if we can get
 * more of that kind of feel like the rat can really use his shield like a skateboard or a snowboard ... things for
 * people to jump off and grind on and curved parts and different kinds of ramps and things that send you up high ...
 * and maybe different things you can do while you're in the air ... really enhance [the] playground feeling."
 *
 * WHAT IT IS: a wide flat floor among the stars with tall sides round it (a box, its lid off), and in it things to ride. It is a SKATE PARK
 * (`skate`): a jump and then ATTACK puts him on his shield over any ground here, and the stick pushed forward pushes
 * him along the flat (TUNING.ride.tuckPush). Nothing to fight, nothing to fall off. Its doors lead to the dream's two
 * rides (the Milky Way, the Big Dipper), and its way out to the Move Garden.
 *   THE HALF PIPE     along the west side: two walls that curve up to decks four up (facets, as the garden's pipe is),
 *                     thirty long. Drop in from a deck; pump from wall to wall; air out over a lip.
 *   THE BIG RAMP      on the east side: a tower twelve up with a steep roll-in, a run, a kicker that throws him, and a
 *                     bank to land on beyond the gap. The way up the tower is a long ramp against the east kerb.
 *   THE FUNBOX        in the middle: a low table with a ramp up either end and a rail down its top.
 *   THE QUARTER PIPE  against the south kerb: a curved wall to ride up and come back down, to turn round at speed.
 *   TWO LIGHT RAILS   (world/rails.ts): one from the tower's top right round and down across the park to the half
 *                     pipe's deck; one from that deck out over the funbox to the floor.
 * Six bottle caps, each where a trick takes him: in the air over each lip of the half pipe, over the big ramp's gap,
 * over the funbox's rail, and on each light rail.
 */
import type { LevelDef } from './types';
import { extent, rampBox, type Box, type Decor } from '../world/layout';
import type { CollectibleDef } from '../world/collectibles';
import { dozerSolids, type DozerSpec } from '../world/dozers';
import { doorOn } from '../world/rooms';
import { railCurve, railAt, type RailCurve } from '../world/rails';

/** (`wall`: its sides are TALL, a box's: a rider thrown up a curved wall at speed goes six out as he goes up, and over any kerb.) */
export const TOY = { half: 36, halfZ: 56, wall: 12, deep: 1.2 } as const;
/** The half pipe: its middle line (it runs along z), half its flat floor, its curve, its decks, and the ramps up to them at its south end. */
/**
 * How much LOWER a deck is than the top of the wall that curves up to it: NOTHING. It is flush, and its edge is the lip.
 * (At first it was 0.4 lower, a "coping": level with the wall's top, the deck's side was a wall to a rider coming up
 * fast, and he came off at the lip every time. The owner, 2026-11-17: "the tops of the half pipes should be more flush
 * and they should also count as an edge that you can grind on". So the fault was mended where it was, in how a rider
 * meets a box at the head of his ramp (player/controller.ts), and the deck came up level. And level, its edge is a
 * LEDGE with the wall falling away beside it: he can grind it, as any ledge.)
 */
export const COPING = 0;
export const HALF = { x: -19, flat: 2, radius: 7, facets: 6, turn: 10, deck: 5, z0: -16, z1: 14, way: 7 } as const;
/** The big ramp (it runs along z, southward): the tower, its roll-in, the kicker, the gap, the bank he lands on. */
/** (Off its lip at speed with a jump he goes thirty-eight along: the bank is where that comes down, and the lane beyond it is clear to the box's side, to stop in.) */
export const BIG = { x0: 20, x1: 28, top: 16, tower: { z0: -56, z1: -48 }, rollIn: 20, kick: { z0: -24, len: 8, rise: 4 }, gap: 24, bank: { len: 16, high: 2.6 }, way: { x0: 32, x1: 36, len: 26 } } as const;
/** The funbox (its rail runs along x): the table, the ramps at its ends, the rail down its middle. */
export const BOX = { x0: 2, x1: 12, z0: 9, z1: 14, high: 1.2, ramp: 3, rail: { wide: 0.24, high: 0.3 } } as const;
/** The quarter pipe against the south kerb. */
export const QUARTER = { x0: -14, x1: 17, radius: 7, facets: 6, turn: 10, deck: 8 } as const;
/** How far over the big ramp's lip its bottle cap hangs (his middle, a jump off the lip at speed). */
export const BIG_AIR = 5.6;
/** ...and how far beyond the lip. */
export const BIG_AIR_ALONG = 7;
export const TOY_PRIZES = ['toy-cap-pipe-east', 'toy-cap-pipe-west', 'toy-cap-big-air', 'toy-cap-funbox', 'toy-cap-ribbon-1', 'toy-cap-ribbon-2'] as const;

/** A curved wall's facets, from its foot outward: how far out each starts and ends, and how high. */
export function facetsOf(radius: number, n: number, turn: number): Array<{ d0: number; d1: number; h0: number; h1: number }> {
  const at = (i: number): [number, number] => {
    const a = (i * turn * Math.PI) / 180;
    return [radius * Math.sin(a), radius * (1 - Math.cos(a))];
  };
  return Array.from({ length: n }, (_, i) => ({ d0: at(i)[0], d1: at(i + 1)[0], h0: at(i)[1], h1: at(i + 1)[1] }));
}
/** The half pipe's decks: how high, and how far out from its middle line a wall ends and a deck begins. */
export function halfDeck(): { y: number; out: number } {
  const f = facetsOf(HALF.radius, HALF.facets, HALF.turn);
  return { y: f[f.length - 1].h1 - COPING, out: HALF.flat + f[f.length - 1].d1 };
}

interface Plan { solids: Box[]; decor: Decor[]; collectibles: CollectibleDef[]; dozers: DozerSpec[]; rails: RailCurve[] }
let plan: Plan | null = null;

function build(): Plan {
  const T = TOY;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const collectibles: CollectibleDef[] = [];
  const dozers: DozerSpec[] = [];
  const rails: RailCurve[] = [];
  const rainbow = (b: Box): Box => ({ ...b, skin: 'rainbowRoad' });
  const tiles = (b: Box): Box => ({ ...b, skin: 'pomoTiles' });
  const fuzz = (b: Box): Box => ({ ...b, skin: 'dreamStatic' });

  // ---- The floor, and the kerb round it (taller along the north side, where the doors are) ----
  solids.push(tiles(extent('stone', -T.half, T.half, -T.deep, 0, -T.halfZ, T.halfZ)));
  for (const [x0, x1, z0, z1] of [[-T.half - 1, T.half + 1, -T.halfZ - 1, -T.halfZ], [-T.half - 1, T.half + 1, T.halfZ, T.halfZ + 1], [-T.half - 1, -T.half, -T.halfZ, T.halfZ], [T.half, T.half + 1, -T.halfZ, T.halfZ]]) {
    solids.push(fuzz(extent('stone', x0, x1, -T.deep, Math.max(T.wall, BIG.top + 4), z0, z1)));
  }

  // ---- The half pipe ----
  const H = HALF;
  const deck = halfDeck();
  for (const side of [-1, 1] as const) {
    const hf = facetsOf(H.radius, H.facets, H.turn);
    hf.forEach((f, i) => {
      const a = H.x + side * (H.flat + f.d0);
      const b = H.x + side * (H.flat + f.d1);
      // (The top two are the LIP: off the wall there, going up it fast, he goes straight up, and comes back down on it.)
      solids.push({ ...rainbow(rampBox('stone', Math.min(a, b), Math.max(a, b), H.z0, H.z1, f.h0, f.h1, side > 0 ? 'e' : 'w', 0)), ...(i >= hf.length - 2 ? { vert: true } : {}) });
    });
    const in0 = H.x + side * deck.out;
    // (The west deck runs right to the box's side: one who comes over that lip at speed has a floor under him all the way.)
    const out0 = side < 0 ? -T.half : H.x + side * (deck.out + H.deck);
    solids.push(tiles(extent('stone', Math.min(in0, out0), Math.max(in0, out0), 0, deck.y, H.z0, H.z1)));
    // (The way up to each deck: a ramp at its south end, climbing north.)
    solids.push(tiles(rampBox('stone', Math.min(in0, out0), Math.max(in0, out0), H.z1, H.z1 + H.way, 0, deck.y, 'n')));
    // A bottle cap in the air over each lip: his middle, a good way up out of the pipe.
    collectibles.push({ id: side > 0 ? TOY_PRIZES[0] : TOY_PRIZES[1], kind: 'cap', x: H.x + side * (deck.out - 0.4), y: deck.y + 2.2, z: side > 0 ? -4 : 4 });
  }

  // ---- The big ramp ----
  const B = BIG;
  solids.push(tiles(extent('stone', B.x0, T.half, 0, B.top, B.tower.z0, B.tower.z1)));
  const roll1 = B.tower.z1 + B.rollIn;
  solids.push(rainbow(rampBox('stone', B.x0, B.x1, B.tower.z1, roll1, 0, B.top, 'n', 0)));
  // (The way up: a long ramp against the east kerb, climbing north to the tower's top.)
  solids.push(tiles(rampBox('stone', B.way.x0, B.way.x1, B.tower.z1, B.tower.z1 + B.way.len, 0, B.top, 'n', 0)));
  const k1 = B.kick.z0 + B.kick.len;
  solids.push(rainbow(rampBox('stone', B.x0, B.x1, B.kick.z0, k1, 0, B.kick.rise, 's', 0)));
  const bank0 = k1 + B.gap;
  solids.push(rainbow(rampBox('stone', B.x0, B.x1, bank0, bank0 + B.bank.len, 0, B.bank.high, 'n', 0)));
  collectibles.push({ id: TOY_PRIZES[2], kind: 'cap', x: (B.x0 + B.x1) / 2, y: B.kick.rise + BIG_AIR, z: k1 + BIG_AIR_ALONG });

  // ---- The funbox ----
  const F = BOX;
  solids.push(tiles(extent('stone', F.x0, F.x1, 0, F.high, F.z0, F.z1)));
  solids.push(rainbow(rampBox('stone', F.x0 - F.ramp, F.x0, F.z0, F.z1, 0, F.high, 'e', 0)));
  solids.push(rainbow(rampBox('stone', F.x1, F.x1 + F.ramp, F.z0, F.z1, 0, F.high, 'w', 0)));
  const railZ = (F.z0 + F.z1) / 2;
  solids.push(fuzz(extent('stone', F.x0, F.x1, F.high, F.high + F.rail.high, railZ - F.rail.wide / 2, railZ + F.rail.wide / 2)));
  collectibles.push({ id: TOY_PRIZES[3], kind: 'cap', x: (F.x0 + F.x1) / 2, y: F.high + F.rail.high + 1, z: railZ });

  // ---- The quarter pipe, against the south kerb ----
  const Q = QUARTER;
  const qf = facetsOf(Q.radius, Q.facets, Q.turn);
  const qOut = qf[qf.length - 1].d1;
  const qFoot = T.halfZ - Q.deck - qOut;
  qf.forEach((f, i) => solids.push({ ...rainbow(rampBox('stone', Q.x0, Q.x1, qFoot + f.d0, qFoot + f.d1, f.h0, f.h1, 's', 0)), ...(i >= qf.length - 2 ? { vert: true } : {}) }));
  // (A deck behind it, level with its lip, for one who goes over the top: the box's side is beyond that.)
  solids.push(tiles(extent('stone', Q.x0, Q.x1, 0, qf[qf.length - 1].h1 - COPING, T.halfZ - Q.deck, T.halfZ)));

  // ---- The light rails ----
  const lines: Array<Array<[number, number, number]>> = [
    // From the tower's top, west off its edge, round and down across the park to over the half pipe's east deck.
    [[B.x0 + 4, B.top + 0.12, B.tower.z1 - 4], [B.x0 - 1, B.top - 0.2, B.tower.z1 - 4], [8, 13, -42], [-2, 10.5, -32], [5, 8, -20], [-3, 6, -9], [H.x + deck.out + 2.5, deck.y + 0.6, 2]],
    // From that deck out over the funbox and down to the floor by the quarter pipe.
    [[H.x + deck.out + 2.5, deck.y + 0.12, 4], [H.x + deck.out + 2.5, deck.y - 0.05, 8], [-2, 2.6, 18], [8, 2.3, 22], [14, 1.4, 30], [16, 0.5, 37]],
  ];
  lines.forEach((pts, i) => {
    decor.push({ kind: 'lightrail', pts });
    const c = railCurve({ pts });
    rails.push(c);
    const q = railAt(c, c.len * 0.5);
    collectibles.push({ id: TOY_PRIZES[4 + i], kind: 'cap', x: q.x, y: q.y + 1, z: q.z });
  });

  // ---- What stands about ----
  decor.push({ kind: 'sign', x: -4.2, y: 1.7, z: -T.halfZ + 0.06, yaw: 0, w: 4.2, h: 2, lines: ['THE TOY BOX', 'JUMP, THEN ATTACK: SKATE', 'STICK FORWARD: PUSH'], post: 0 });
  decor.push({ kind: 'sign', x: 4.2, y: 1.7, z: -T.halfZ + 0.06, yaw: 0, w: 4.2, h: 2, lines: ['IN THE AIR: JUMP FLIPS', 'ROLL SPINS, GUARD GRABS', 'ATTACK: THE SWORD'], post: 0 });
  for (const [x, z, w, d, seed] of [[-30, -46, 8, 10, 3], [-28, 42, 10, 14, 7]] as const) {
    decor.push({ kind: 'flowers', x, y: 0, z, w, d, seed });
    decor.push({ kind: 'butterflies', x, y: 1.4, z, r: 2.4, count: 3 });
  }
  dozers.push({ type: 'stag', x: -30, y: 0, z: -46, facing: 0.9 }, { type: 'mantis', x: -28, y: 0, z: 42, facing: 2.2, awake: true }, { type: 'scorpion', x: 13, y: 0, z: -50, facing: 0.4 });
  for (const dz of dozers) solids.push(...dozerSolids(dz));
  const PLANETS: Array<[number, number, number, number, number, number, boolean]> = [[-70, 18, -40, 14, 0xff5ab4, 0xffe84a, true], [64, 30, 20, 9, 0x3ee8c0, 0x7a5cff, false], [-50, -20, 60, 11, 0x2ad8ff, 0xff5ab4, true], [20, 40, -80, 18, 0x7a5cff, 0x2ad8ff, true], [80, -10, -50, 7, 0xff8a1e, 0xff2a6a, false]];
  for (const [x, y, z, r, color, band, ring] of PLANETS) decor.push({ kind: 'planet', x, y, z, r, color, band, ring: ring ? { out: 1.9, color: 0x3ee8c0 } : undefined, tilt: 0.3 });

  return { solids, decor, collectibles, dozers, rails };
}
export function toyBoxPlan(): Plan {
  return (plan ??= build());
}

export function toyBox(): LevelDef {
  const P = toyBoxPlan();
  return {
    id: 'toybox',
    name: 'The Toy Box',
    blurb: 'The dream\'s playground: a skate park among the stars. A half pipe, a big ramp, rails of light.',
    theme: 'cave',
    motes: 'stars',
    music: 'dream',
    sky: 'space',
    look: 'dream',
    skate: true,
    fog: 0x1a0c3a,
    fogRange: [70, 195],
    fallDepth: 28,
    fallFree: true,
    solids: P.solids.map((b) => ({ ...b })),
    pit: null,
    water: [],
    decor: P.decor.map((d) => ({ ...d })),
    spawn: { x: 0, y: 0, z: -TOY.halfZ + 5, facing: 0 },
    collectibles: P.collectibles.map((c) => ({ ...c })),
    crateContents: [],
    enemies: [],
    dozers: P.dozers.map((d) => ({ ...d })),
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('north', TOY.half, 0, TOY.halfZ, 0),
    returnTo: 'garden',
    courseDoors: [
      { to: 'milkyway', name: 'The Milky Way', need: 0, door: doorOn('north', TOY.half, -9.5, TOY.halfZ, 0) },
      { to: 'bigdipper', name: 'The Big Dipper', need: 0, door: doorOn('north', TOY.half, 9.5, TOY.halfZ, 0) },
    ],
  };
}

/**
 * A rider, for the films (`&autoride`) and a test: from the top of the big ramp's tower he walks to the lip, gets on his
 * shield, goes down the roll-in tucked, jumps off the kicker, and in the air SPINS, GRABS and KICKFLIPS; lands on the
 * bank, and brakes to a stop in the lane beyond it. What it gives each step is what the pad would.
 */
export function makeToyRide(): (p: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number }; grounded: boolean; riding: boolean }) => { x: number; z: number; jumpPressed: boolean; jumpHeld: boolean; attackPressed: boolean; guardHeld: boolean; dodgePressed: boolean } {
  const lip = BIG.kick.z0 + BIG.kick.len;
  let air = -1;
  let tick = 0;
  let flipped = false;
  let landed = false;
  return (p) => {
    const none = { x: 0, z: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, guardHeld: false, dodgePressed: false };
    const z = p.position.z;
    if (!p.riding) {
      if (landed) return none;
      const jump = p.grounded && z > BIG.tower.z1 - 0.6;
      tick = jump ? tick + 1 : 0;
      return { ...none, z: 1, jumpPressed: jump && tick % 20 === 1, jumpHeld: !p.grounded, attackPressed: !p.grounded && z > BIG.tower.z1 + 0.3 };
    }
    if (air < 0 && p.grounded && z > BIG.kick.z0 && lip - z < 0.6) {
      air = 0;
      return { ...none, z: 1, jumpPressed: true, jumpHeld: true };
    }
    if (air >= 0 && !p.grounded && !landed) {
      air += 1 / 60;
      const flip = !flipped && air > 1.12;
      if (flip) flipped = true;
      return { ...none, z: 1, jumpHeld: true, dodgePressed: air > 0.1 && air < 0.14, guardHeld: air > 0.6 && air < 1.05, jumpPressed: flip };
    }
    if (air > 0.3 && p.grounded) landed = true;
    // (After the landing he is going very fast: he brakes, down the clear lane beyond the bank, to a stop.)
    if (landed) return { ...none, z: p.velocity.z > 0.5 ? -1 : 0 };
    return { ...none, z: 1 };
  };
}

/**
 * A rider for the half pipe, for the films (`&autoride=pipe`, started on its east deck): he gets on his shield, rolls
 * in off the lip, and PUMPS (the stick pushed
 * the way he is going while he is down in the flat of it): off each lip into the air, a grab up there, and back down.
 */
export function makePipeRide(): (p: { position: { x: number }; velocity: { x: number; y: number }; grounded: boolean; riding: boolean }) => { x: number; z: number; jumpPressed: boolean; jumpHeld: boolean; attackPressed: boolean; guardHeld: boolean; dodgePressed: boolean } {
  const deck = halfDeck();
  let tick = 0;
  return (p) => {
    const none = { x: 0, z: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, guardHeld: false, dodgePressed: false };
    if (!p.riding) {
      tick++;
      return { ...none, x: -1, jumpPressed: tick === 14, jumpHeld: !p.grounded, attackPressed: tick > 14 && !p.grounded && p.velocity.y < 5 };
    }
    const inFlat = Math.abs(p.position.x - HALF.x) < HALF.flat + 2.5;
    const onDeck = p.position.x > HALF.x + deck.out - 0.1;
    return { ...none, x: onDeck ? -1 : inFlat ? (p.velocity.x < 0 ? -1 : 1) : 0, guardHeld: !p.grounded && p.velocity.y < 6 && p.velocity.y > -4 };
  };
}
