/**
 * The Move Garden: a test room for feeling the jump numbers, not part of the game.
 *
 * Mario 64's makers got the hero's movement right in a bare room of blocks before they built a course
 * (reports/Super Mario 64 design research.md). This is that room for the knight: ledges at the heights that matter,
 * chimneys of four widths, three ramps, a run to ride the shield down, a pole and a strip to measure against, and a board on everything saying what it is (two
 * lines at most, in big letters: the game is drawn coarsely, and small writing cannot be read from where he stands). The
 * numbers on the boards are the heights and widths of the things themselves (tests/garden.ts holds them to that);
 * what he can DO with them depends on the jump numbers, which are on the Tweaks sliders, with a few sets to try at
 * the top of "Jumping".
 *
 * Nothing here can be climbed by a wall kick that is not meant to be: whatever he could kick between is either
 * joined on (no gap) or nine or more apart (a kick carries him a little over eight across before he is back down
 * to where he kicked from).
 */
import { extent, rampBox, type Box, type Decor } from '../world/layout';
import { doorOn } from '../world/rooms';
import { room } from './builders';
import type { EnemySpec, LevelDef } from './types';

/** Half the room, east to west and north to south; and how high its walls are. North is -z. */
export const GARDEN = { halfX: 36, halfZ: 24, wall: 16 } as const;

/** A ledge on the west wall: how high, where along the wall (its middle), and what its board says gets him onto it (from the floor, as the game is). */
export interface Step { top: number; z: number; move: string }
/** Each is 2.6 square and joined to the wall; five clear between one and the next. */
export const STEP_SIZE = 2.6;
export const STEPS: readonly Step[] = [
  { top: 2.3, z: 12, move: 'ONE JUMP' },
  { top: 3.4, z: 4.4, move: 'JUMP, GRAB' },
  { top: 4.5, z: -3.2, move: 'DOUBLE JUMP' },
  { top: 5.6, z: -10.8, move: 'DOUBLE, GRAB' },
];

/**
 * A chimney on the north wall: two walls standing out from it, `gap` apart, with the room's own wall behind (a ruler
 * on it) and the open end to the south. `x` is the west face of its west wall. `westTop` and `eastTop` are how high
 * each wall stands: where they differ, the lower is the one to land on.
 */
export interface Chimney { id: string; x: number; gap: number; westTop: number; eastTop: number; lines: string[] }
/** How thick a chimney's walls are (the least he can land on from a kick), and how far they stand out from the wall. */
export const CHIMNEY_WALL = 2.4;
export const CHIMNEY_DEPTH = 5;
/** Clear floor between one chimney and the next, and between the last and the room's east wall: too far to kick across. */
export const CHIMNEY_CLEAR = 9;
export const CHIMNEYS: readonly Chimney[] = (() => {
  const list: Array<Omit<Chimney, 'x'>> = [
    { id: 'narrow', gap: 2.2, westTop: 10, eastTop: 10, lines: ['2.2 WIDE', '10 UP'] },
    { id: 'wide', gap: 4, westTop: 10, eastTop: 10, lines: ['4 WIDE', '10 UP'] },
    { id: 'widest', gap: 6, westTop: 8, eastTop: 8, lines: ['6 WIDE', '8 UP'] },
    { id: 'one', gap: 3.5, westTop: 12, eastTop: 6, lines: ['6 UP', 'ONE KICK'] },
  ];
  // West to east from the corner (the first is joined to the west wall), each the clear distance past the last.
  let x: number = -GARDEN.halfX;
  return list.map((c) => {
    const at = x;
    x += CHIMNEY_WALL * 2 + c.gap + CHIMNEY_CLEAR;
    return { ...c, x: at };
  });
})();
/** The inner faces of a chimney, west and east, and the middle of its mouth. */
export function chimneyFaces(c: Chimney): { west: number; east: number; mid: number; z0: number; z1: number } {
  const west = c.x + CHIMNEY_WALL;
  return { west, east: west + c.gap, mid: west + c.gap / 2, z0: -GARDEN.halfZ, z1: -GARDEN.halfZ + CHIMNEY_DEPTH };
}

/** The pole to jump beside (only drawn: he passes through it), and the strip on the floor to jump along. */
export const POLE = { x: -12, z: 8, height: 9 } as const;
/** The strip runs north from its line; he runs up from the south and jumps at the line. */
export const STRIP = { x: 10, z: 12, length: 16, width: 1.6 } as const;

/**
 * The ramps, in the south-east: three slopes side by side, each climbing north three units to one landing against
 * the east wall. The first is gentle, the last as steep as he can walk (one up for one along).
 */
export interface GardenRamp { x0: number; x1: number; length: number; lines: string[] }
export const RAMP_LANDING = { x0: 27, x1: GARDEN.halfX, z0: -6, z1: -2, top: 3 } as const;
export const RAMPS: readonly GardenRamp[] = [
  { x0: 27, x1: 30, length: 12, lines: ['1 UP IN 4', 'GENTLE'] },
  { x0: 30, x1: 33, length: 6, lines: ['1 UP IN 2', 'A HILL'] },
  { x0: 33, x1: GARDEN.halfX, length: 3, lines: ['1 UP IN 1', 'STEEPEST'] },
];
/** The creatures by the ramps, and the patch they keep to: the ramps, the landing, and a few steps of floor before them. */
export const RAMP_PATCH = { x0: RAMP_LANDING.x0, x1: GARDEN.halfX, z0: RAMP_LANDING.z0, z1: RAMP_LANDING.z1 + 15 } as const;
export const RAMP_FOES: EnemySpec[] = [
  { type: 'scuttler', x: 28.5, y: RAMP_LANDING.top, z: -4, arena: { ...RAMP_PATCH }, respawn: true, uncounted: true },
  { type: 'guard', x: 31.5, y: 0, z: 11.5, facing: 0, arena: { ...RAMP_PATCH }, respawn: true, uncounted: true },
];

/**
 * The run, for riding the shield: along the south wall. A platform in the south-east corner, eight up; a walkable
 * ramp up to it from the north, against the east wall; the RUN itself, a long slope west from it down to the floor
 * (one up in two), with the whole length of the room to roll out along, a kicker on the way to jump from, and past
 * that a rail and a kerb to grind; and the
 * CHUTE, north off the platform, too steep to stand on (two up for one along): on that he slides whether he will or no.
 */
export const RUN = {
  top: { x0: 30, x1: GARDEN.halfX, z0: 19, z1: GARDEN.halfZ, y: 8 },
  /** The way up: it climbs south to the platform. */
  up: { x0: 33, x1: GARDEN.halfX, z0: 11, z1: 19 },
  /** The run: it is high at its east end. */
  slope: { x0: 14, x1: 30, z0: 19, z1: GARDEN.halfZ },
  /** The chute: it is high at its south end. */
  chute: { x0: 30, x1: 33, z0: 15, z1: 19 },
  /** The kicker: a little ramp across the roll-out, high at its west end. It stands before the door, so a rider is in the air past it. */
  kicker: { x0: 4, x1: 7, z0: 19.5, z1: 23.5, y: 1.2 },
  /**
   * Things to grind, further along the roll-out, one to each side of the way: a RAIL (an iron bar a quarter wide,
   * half a unit high) and a KERB against the south wall, whose edge is a ledge. Riding straight down the middle he
   * is in reach of neither: he has to go to one. (They stop ten short of the west wall: room to brake in.)
   */
  rail: { x0: -26, x1: -12, z: 20.5, wide: 0.24, y: 0.5 },
  kerb: { x0: -26, x1: -12, z0: 22.4, z1: GARDEN.halfZ, y: 0.7 },
} as const;

/**
 * The pipe: a half-pipe down the middle of the room, running north and south, to see how the shield takes a floor
 * that CURVES across his way (the owner, 2026-11-15, of the level to come: "a circular level design with an
 * interesting curved slope ... it'll be interesting to see how the board slide mechanics deal with that").
 * Its floor is the room's own, three wide; either side of that a wall curves up, a quarter of a circle four in
 * radius, to a deck three up. The curve is FACETS: ramps side by side, each steeper than the last (the ground here
 * is boxes and ramps along x or z, and a curve is made of those). The top facet is far too steep to stand on.
 * A ramp at the south end of each deck is the way up. He drops in from a deck: a jump out over the wall, and ATTACK.
 */
export const PIPE = {
  /** Its middle line, and half the width of its flat floor. */
  x: -1.5,
  flat: 1.5,
  radius: 4,
  /** How many facets a wall is cut into, and how much of the quarter circle each takes (degrees). */
  facets: 5,
  turn: 15,
  deck: 2,
  z0: -14,
  z1: 8,
  /** The ramps up to the decks: this long, south from the pipe's south end. */
  way: 4,
} as const;
/** One wall's facets, from the floor outward: how far out each starts and ends, and how high. */
export function pipeFacets(): Array<{ d0: number; d1: number; h0: number; h1: number }> {
  const at = (i: number): [number, number] => {
    const a = (i * PIPE.turn * Math.PI) / 180;
    return [PIPE.radius * Math.sin(a), PIPE.radius * (1 - Math.cos(a))];
  };
  return Array.from({ length: PIPE.facets }, (_, i) => {
    const [d0, h0] = at(i);
    const [d1, h1] = at(i + 1);
    return { d0, d1, h0, h1 };
  });
}
/** How high its decks are, and how far out from its middle line a wall ends and a deck begins. */
export const pipeDeck = (): { y: number; out: number } => {
  const f = pipeFacets();
  const last = f[f.length - 1];
  return { y: last.h1, out: PIPE.flat + last.d1 };
};

/**
 * The downhill pipe: a short length of pipe that RUNS DOWNHILL, by the north wall east of the strip, to try ramps
 * tipped two ways. (The owner's level to come is a pipe like this the whole way: "a really long steep decline that's
 * like a sewer pipe going down".) It falls five in twelve, from a platform at its north end to the floor at its
 * south end; its floor is a narrow flat, and either side of that a wall curves up, cut into facets as the level
 * pipe's are. Every piece of it is ONE plane tipped two ways: down the pipe, and (the facets) up across it.
 * A ramp west of the platform is the way up. He drops in from the platform: a hop out over it, and ATTACK.
 */
export const DROP = {
  /** Its middle line, and half the width of its flat floor. */
  x: 16.8,
  flat: 0.6,
  radius: 2.5,
  facets: 4,
  turn: 18.75,
  /** Its high end (north) and its low end (south), and how far it falls between them. */
  z0: -16,
  z1: -4,
  rise: 5,
  /** The platform at its top runs back to here; the way up to that starts here (and climbs east). */
  back: -19,
  wayFrom: 8.6,
} as const;
/** One wall's facets, from its floor outward: how far out each starts and ends, and how high (above the pipe's floor there). */
export function dropFacets(): Array<{ d0: number; d1: number; h0: number; h1: number }> {
  const at = (i: number): [number, number] => {
    const a = (i * DROP.turn * Math.PI) / 180;
    return [DROP.radius * Math.sin(a), DROP.radius * (1 - Math.cos(a))];
  };
  return Array.from({ length: DROP.facets }, (_, i) => {
    const [d0, h0] = at(i);
    const [d1, h1] = at(i + 1);
    return { d0, d1, h0, h1 };
  });
}
/** How far out from its middle line its walls end. */
export const dropHalf = (): number => DROP.flat + dropFacets()[DROP.facets - 1].d1;

export function garden(): LevelDef {
  const W = -GARDEN.halfX;
  const N = -GARDEN.halfZ;
  const solids: Box[] = [...room(GARDEN.halfX, true, GARDEN.halfZ, GARDEN.wall)];
  const decor: Decor[] = [];
  const east = Math.PI / 2; // a board on a face that looks east
  const south = 0; // ...and one that looks south (doors and boards face along +z at yaw 0)

  // ---- The Steps, on the west wall ----
  for (const s of STEPS) {
    solids.push(extent('stone', W, W + STEP_SIZE, 0, s.top, s.z - STEP_SIZE / 2, s.z + STEP_SIZE / 2));
    // Its board is on its front, as high as will fit under its top edge.
    const h = Math.min(1.5, s.top - 0.5);
    decor.push({ kind: 'sign', x: W + STEP_SIZE, y: s.top - 0.2 - h / 2, z: s.z, yaw: east, w: 2.5, h, lines: [`${s.top} UP`, s.move] });
  }
  // A ruler up the wall between each two, to see how high a jump gets beside them.
  for (let i = 0; i + 1 < STEPS.length; i++) decor.push({ kind: 'ruler', x: W, y: 0, z: (STEPS[i].z + STEPS[i + 1].z) / 2, yaw: east, length: 8, width: 1 });

  // ---- The chimneys, on the north wall ----
  for (const c of CHIMNEYS) {
    const f = chimneyFaces(c);
    // (Grey stone, like the steps: what is the garden's is grey, what is the room's is brick.)
    solids.push(extent('stone', c.x, f.west, 0, c.westTop, f.z0, f.z1));
    solids.push(extent('stone', f.east, f.east + CHIMNEY_WALL, 0, c.eastTop, f.z0, f.z1));
    // The ruler is on the room's wall at the back of it, as wide as the chimney will take.
    decor.push({ kind: 'ruler', x: f.mid, y: 0, z: N, yaw: south, length: Math.max(c.westTop, c.eastTop) + 1, width: Math.min(1.6, c.gap - 0.4) });
    // The board is on the end of the wall he lands on (the lower one), facing the room.
    const onEast = c.eastTop <= c.westTop;
    decor.push({ kind: 'sign', x: onEast ? f.east + CHIMNEY_WALL / 2 : c.x + CHIMNEY_WALL / 2, y: 1.9, z: f.z1, yaw: south, w: 2.3, h: 1.6, lines: c.lines });
  }

  // ---- The ramps, in the south-east ----
  const L = RAMP_LANDING;
  solids.push(extent('stone', L.x0, L.x1, 0, L.top, L.z0, L.z1));
  for (const r of RAMPS) {
    solids.push(rampBox('stone', r.x0, r.x1, L.z1, L.z1 + r.length, 0, L.top, 'n'));
    // Its board stands at its foot, to one side of the way up.
    decor.push({ kind: 'sign', x: r.x0 + 0.75, y: 1.5, z: L.z1 + r.length + 0.6, yaw: south, w: 1.4, h: 0.9, lines: r.lines, post: 0 });
  }

  // ---- The run, for riding the shield ----
  const T = RUN.top;
  solids.push(extent('stone', T.x0, T.x1, 0, T.y, T.z0, T.z1));
  solids.push(rampBox('stone', RUN.up.x0, RUN.up.x1, RUN.up.z0, RUN.up.z1, 0, T.y, 's'));
  solids.push(rampBox('stone', RUN.slope.x0, RUN.slope.x1, RUN.slope.z0, RUN.slope.z1, 0, T.y, 'e'));
  solids.push(rampBox('stone', RUN.chute.x0, RUN.chute.x1, RUN.chute.z0, RUN.chute.z1, 0, T.y, 's'));
  solids.push(rampBox('stone', RUN.kicker.x0, RUN.kicker.x1, RUN.kicker.z0, RUN.kicker.z1, 0, RUN.kicker.y, 'w'));
  solids.push({ ...extent('stone', RUN.rail.x0, RUN.rail.x1, 0, RUN.rail.y, RUN.rail.z - RUN.rail.wide / 2, RUN.rail.z + RUN.rail.wide / 2), skin: 'rustPlate' });
  solids.push(extent('stone', RUN.kerb.x0, RUN.kerb.x1, 0, RUN.kerb.y, RUN.kerb.z0, RUN.kerb.z1));
  // (Its board is on the wall over the kerb: one standing in the way hid the rail from a rider coming at it.)
  decor.push({ kind: 'sign', x: (RUN.kerb.x0 + RUN.kerb.x1) / 2, y: 2.6, z: GARDEN.halfZ, yaw: Math.PI, w: 3.2, h: 1.5, lines: ['GRIND', 'JUMP, THEN STOW'] });
  // Boards: on the platform's wall for the run and the chute, and standing before the kicker.
  decor.push({ kind: 'sign', x: T.x1, y: T.y + 1.6, z: (T.z0 + T.z1) / 2, yaw: -Math.PI / 2, w: 2.6, h: 1.4, lines: ['THE RUN', 'JUMP, ATTACK'] });
  decor.push({ kind: 'sign', x: (RUN.chute.x0 + RUN.chute.x1) / 2, y: T.y + 1.6, z: T.z1, yaw: Math.PI, w: 2.6, h: 1.4, lines: ['TOO STEEP', 'HE SLIDES'] });
  decor.push({ kind: 'sign', x: RUN.kicker.x1 + 1.6, y: 1.5, z: RUN.kicker.z0 - 0.8, yaw: Math.PI / 2, w: 2.4, h: 1.3, lines: ['JUMP', 'THEN JUMP AGAIN'], post: 0 });
  decor.push({ kind: 'lamp', x: 22, y: 11, z: 21.5 }, { kind: 'lamp', x: 8, y: 7, z: 21.5 }, { kind: 'lamp', x: -18, y: 7, z: 21.5 });

  // ---- The pipe ----
  {
    const deck = pipeDeck();
    for (const side of [-1, 1] as const) {
      for (const f of pipeFacets()) {
        const a = PIPE.x + side * (PIPE.flat + f.d0);
        const b = PIPE.x + side * (PIPE.flat + f.d1);
        solids.push(rampBox('stone', Math.min(a, b), Math.max(a, b), PIPE.z0, PIPE.z1, f.h0, f.h1, side > 0 ? 'e' : 'w', 0));
      }
      const in0 = PIPE.x + side * deck.out;
      const out0 = PIPE.x + side * (deck.out + PIPE.deck);
      solids.push(extent('stone', Math.min(in0, out0), Math.max(in0, out0), 0, deck.y, PIPE.z0, PIPE.z1));
      // The way up to it: a ramp at its south end, climbing north.
      solids.push(rampBox('stone', Math.min(in0, out0), Math.max(in0, out0), PIPE.z1, PIPE.z1 + PIPE.way, 0, deck.y, 'n'));
    }
    // (Its board stands at its south end, beside the way in along its floor, not in it.)
    decor.push({ kind: 'sign', x: PIPE.x + PIPE.flat + 1.7, y: 1.5, z: PIPE.z1 + 0.8, yaw: south, w: 2.8, h: 1.4, lines: ['THE PIPE', 'DROP IN FROM TOP'], post: 0 });
  }

  // ---- The downhill pipe ----
  {
    const half = dropHalf();
    // Its floor: flat across, falling south.
    solids.push(rampBox('stone', DROP.x - DROP.flat, DROP.x + DROP.flat, DROP.z0, DROP.z1, 0, DROP.rise, 'n', 0));
    for (const side of [-1, 1] as const) {
      for (const f of dropFacets()) {
        const a = DROP.x + side * (DROP.flat + f.d0);
        const b = DROP.x + side * (DROP.flat + f.d1);
        // (Falling south like the floor, and rising outward by as much as the curve does across it.)
        solids.push(rampBox('stone', Math.min(a, b), Math.max(a, b), DROP.z0, DROP.z1, f.h0, f.h0 + DROP.rise, 'n', 0, side * (f.h1 - f.h0)));
      }
    }
    // The platform at its top, and the way up to that from the west.
    solids.push(extent('stone', DROP.x - half, DROP.x + half, 0, DROP.rise, DROP.back, DROP.z0));
    solids.push(rampBox('stone', DROP.wayFrom, DROP.x - half, DROP.back, DROP.z0, 0, DROP.rise, 'e'));
    decor.push({ kind: 'sign', x: DROP.x + half + 1.2, y: 1.5, z: DROP.z1 + 0.6, yaw: south, w: 2.8, h: 1.4, lines: ['DOWNHILL PIPE', 'BRAKE AT ITS END'], post: 0 });
  }

  // ---- The pole and the strip ----
  decor.push({ kind: 'ruler', x: POLE.x, y: 0, z: POLE.z, yaw: south, length: POLE.height, width: 1, pole: true });
  decor.push({ kind: 'sign', x: POLE.x + 2.2, y: 1.6, z: POLE.z, yaw: south, w: 2.8, h: 1.4, lines: ['HOW HIGH', 'JUMP BESIDE IT'], post: 0 });
  decor.push({ kind: 'ruler', x: STRIP.x, y: 0, z: STRIP.z, yaw: Math.PI, length: STRIP.length, width: STRIP.width, flat: true });
  decor.push({ kind: 'sign', x: STRIP.x - 3.4, y: 1.6, z: STRIP.z + 1, yaw: south, w: 2.8, h: 1.4, lines: ['HOW FAR', 'JUMP AT THE LINE'], post: 0 });

  // Lying flat, the strip's numbers are hard to read from where he stands: a little board stands beside it every two,
  // on one side and then the other, each a little further out than the last so that none hides the next.
  for (let u = 2; u <= STRIP.length; u += 2) {
    const side = (u / 2) % 2 === 1 ? 1 : -1;
    decor.push({ kind: 'sign', x: STRIP.x + side * (STRIP.width / 2 + 0.6 + u * 0.06), y: 0.8, z: STRIP.z - u, yaw: south, w: 1, h: 0.8, lines: [String(u)], post: 0 });
  }

  // Lamps down the middle and in the corners, so every board can be read.
  for (const [x, z] of [[-24, 14], [-24, -6], [0, -10], [0, 10], [24, -10], [24, 10], [-10, -16], [12, -16]]) decor.push({ kind: 'lamp', x, y: 9, z });

  return {
    id: 'garden',
    name: 'The Move Garden',
    blurb: 'A test room: ledges, chimneys and rulers for feeling the jump numbers.',
    theme: 'dungeon',
    fogRange: [40, 150],
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: 0, z: 16, facing: Math.PI },
    collectibles: [],
    crateContents: [],
    // (By the three ramps, 2026-11-16: creatures walk slopes now. A roach whose home is the landing, and a guard at
    // the foot of the hill; their patch is the ramps and the landing, and no more of the garden than a few steps
    // before them. See enemies/footing.ts.)
    enemies: RAMP_FOES,
    waves: [],
    gear: [],
    goals: [],
    exit: doorOn('south', GARDEN.halfX, 0, GARDEN.halfZ),
    // Its door is open from the start and leads back to the Club.
    returnTo: 'hub',
    // A second door, in the west wall north of the steps (clear of the roll-out from the run, which ends at that
    // wall further south): the downhill level, a test room of its own.
    // A third, in the south wall west of the way out (clear floor there, between the way out and the rails): the Glow
    // Cave, a try-out of a theme.
    courseDoors: [
      { to: 'longdrop', name: 'The Long Drop', need: 0, door: doorOn('west', GARDEN.halfX, -15.6, GARDEN.halfZ, 0) },
      { to: 'glowcave', name: 'The Glow Cave', need: 0, door: doorOn('south', GARDEN.halfX, -6, GARDEN.halfZ, 0) },
      // (And a fourth, east of the way out, between the low stone and the foot of the slope: the Cold Main.)
      { to: 'coldmain', name: 'The Cold Main', need: 0, door: doorOn('south', GARDEN.halfX, 10.5, GARDEN.halfZ, 0) },
      // (And a fifth, in the NORTH wall, on clear floor west of the middle: the Milky Way, the dream's try-out.)
      { to: 'milkyway', name: 'The Milky Way', need: 0, door: doorOn('north', GARDEN.halfX, -7, GARDEN.halfZ, 0) },
      // (And a sixth, in the north wall's east end, on clear floor: the Forge, the furnace's try-out.)
      { to: 'forge', name: 'The Forge', need: 0, door: doorOn('north', GARDEN.halfX, 30, GARDEN.halfZ, 0) },
      // (And a seventh, in the north wall between those two: the Toy Box, the dream's skate park, whose own doors lead
      // to the dream's rides. The Big Dipper's door was here for a day; it is reached through the Toy Box now.)
      { to: 'toybox', name: 'The Toy Box', need: 0, door: doorOn('north', GARDEN.halfX, 12, GARDEN.halfZ, 0) },
    ],
  };
}
