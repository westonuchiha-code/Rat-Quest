/**
 * The Long Drop: a minute and a half downhill on the shield, a giant ramp at the end of it, and a fall into the dark.
 *
 * The owner, 2026-11-15: "a level that's just like a really long steep decline that's like a sewer pipe going down
 * through some tunnels ... break off into like an underground Railway and you can grind along the railroad tracks
 * ... totally downhill and you're just on the board the whole time"; slime in the bottom, weeds out of cracks.
 * And 2026-11-16, after riding the first version: "a minute and a half of like flying down through the sewer surfing
 * on your Shield jumping on ramps collecting collectibles in the air ... then at the end of the tunnel there's this
 * giant ramp that you fly off of and you catch this huge amount of air but then you fall like into the darkness and
 * you land in a room ... the floor is lit for a certain amount of radius but then it's like total darkness beyond
 * that and the Darkness is filled with like little twinkling white eyes but you can't actually go beyond the lit up
 * part of the floor". The boss in that room is the Widow (enemies/widow.ts).
 *
 * It runs STRAIGHT south (the view may not turn by itself, and a bend would ask it to). It is a list of SECTIONS,
 * `COURSE` below, laid end to end, each lower than the last:
 *   a PIPE: a trough with slime down its middle and a shoulder either side, falling;
 *   a FLAT: the same trough run level, a breath, with a kicker on each shoulder;
 *   a BED: the whole width one slope, with rails to grind, kickers to jump from, or weeds;
 *   a LEDGE: the floor steps down, and he flies off it.
 * Where a bed meets a trough the trough is cut DOWN into it (its shoulders carry on level with the bed): nothing ever
 * stands across his way but a weed. Every falling section is steep enough for the air attack to be the shield, so
 * one thrown off can get back on wherever he is. The last bed is the in-run of the GIANT RAMP; past its lip there is
 * nothing, and far below it the ARENA: a round floor in the dark that he cannot leave (`LevelDef.well`).
 * It is a test room: reached by a door in the Move Garden, and its way out (in the arena, once the Widow is beaten)
 * leads back there.
 */
import type { LevelDef } from './types';
import type { CollectibleDef } from '../world/collectibles';
import type { Well } from '../world/collision';
import { extent, rampBox, type Box, type Decor } from '../world/layout';
import { TUNING } from '../data/tuning';
import { SEWER_PIPE, pipeHalf, pipeRim, pipeRun, wallAt } from './pipes';

const S = SEWER_PIPE;
const RIM = pipeRim(S);
/** How wide the course is, from its middle to each wall; how high the walls stand over it; how deep it is built. */
const HALF = 8;
const WALL_UP = 9;
const DEEP = 8;

/** The line worth riding through a section: one x, or points [how far in, x] joined by straight lines. */
export type Lane = number | Array<[number, number]>;
type Weeds = Array<[number, number]>; // [x, how far in]
type Section =
  | { kind: 'pipe'; len: number; fall: number; weeds?: Weeds; lane?: Lane; crumbs?: [number, number] }
  | { kind: 'flat'; len: number }
  | {
      kind: 'bed';
      len: number;
      fall: number;
      /** Rails: [x, from, to] (how far in). */
      rails?: Array<[number, number, number]>;
      /** Kickers: [x0, x1, how far in its foot is]. */
      kickers?: Array<[number, number, number]>;
      weeds?: Weeds;
      lane?: Lane;
      crumbs?: [number, number];
    }
  | { kind: 'ledge'; drop: number };

/** What is solid of a weed: this far out from its stem each way, and this high above where it grows. */
export const WEED = { half: 0.22, high: 1.1 } as const;
/** A kicker on a shoulder (on a flat) and one on a bed: how long, and how much higher its lip is than its foot. */
export const SHOULDER_KICKER = { x0: 4, x1: 7, len: 3, rise: 1, back: 7 } as const;
export const BED_KICKER = { len: 3, rise: 0.5 } as const;
export const RAIL = { x: 1.4, wide: 0.24, high: 0.3 } as const;
/** Where a rail's bats hang: how far to the side of the rail (toward the middle of the bed), and how far over its top (the bottom of the bat). */
export const BAT_OFF = { side: 0.9, up: 0.35 } as const;
/**
 * The giant ramp is a ski jump: a long steep in-run, a short level table at its foot, and a lip that turns up in two
 * pieces, the second steeper. (Climbing costs him speed, and his speed has a top: a lip that climbed far would
 * throw him less. What is giant is the in-run, and the fall.) `over`: how far the table is above the arena's floor.
 */
export const LIP = { table: 3, len1: 3, rise1: 1.05, len2: 2.4, rise2: 1.8, over: 46, speed: 12.6 } as const;
/** The arena: how wide its light is, how far past the lip its middle is, and how high he would have to be to be over its edge. */
export const ARENA = { r: 13, ahead: 36, clear: 6 } as const;
/** How far past the edge of the light the Widow's place is. */
export const WIDOW_OUT = 0.8;

// Weeds to steer round. A and B leave the line x = -1 clear; the slalom has gates to weave through.
const WEEDS_A: Weeds = [[1.7, 9], [-1.9, 16], [2.2, 24], [-0.2, 29], [1.2, 37]];
const WEEDS_B: Weeds = [[-2.1, 8], [1.6, 16], [0.3, 23], [-1.8, 30], [0.9, 38]];
const gate = (at: number, side: 1 | -1): Weeds => (side > 0 ? [[-1.6, at], [-0.8, at], [0, at]] : [[0.2, at], [1, at], [1.8, at]]);
// (Its first gate is well in: he may come into the pipe through the air, off a ledge, and cannot steer till he lands.)
const SLALOM: Weeds = [...gate(26, 1), ...gate(40, -1), ...gate(54, 1), ...gate(68, -1)];
const SLALOM_LANE: Lane = [[0, -1], [14, -1], [23, 1], [28, 1], [38, -0.9], [42, -0.9], [52, 1], [56, 1], [66, -0.9], [74, -1]];
const FIELD: Weeds = [[-1.2, 26], [-0.4, 26], [0.4, 26], [1.2, 26], [1.8, 40], [2.6, 40], [3.4, 40], [4.2, 40]];
const FIELD_LANE: Lane = [[0, 0], [14, 0], [23, 2.4], [28, 2.4], [36, 0.4], [42, 0.4], [50, 0]];
const BOTH_RAILS = (from: number, to: number): Array<[number, number, number]> => [[-RAIL.x, from, to], [RAIL.x, from, to]];
/** A bed that ends in a kicker down its middle, over a ledge: the steps. */
const STEP: Section = { kind: 'bed', len: 36, fall: 15, kickers: [[-1.5, 1.5, 33]] };
const SIDE_KICKERS: Array<[number, number, number]> = [[-6, -3, 26], [3, 6, 26]];

/** The course, top to bottom. */
const COURSE: Section[] = [
  // The mains: learning it.
  { kind: 'pipe', len: 48, fall: 20, crumbs: [8, 8] },
  { kind: 'pipe', len: 48, fall: 24, weeds: WEEDS_A, crumbs: [4, 6] },
  { kind: 'flat', len: 14 },
  { kind: 'pipe', len: 44, fall: 20, weeds: WEEDS_B, crumbs: [6, 6] },
  // The first railway: rails to grind, then a ledge and kickers.
  { kind: 'bed', len: 64, fall: 27, rails: BOTH_RAILS(4, 64) },
  { kind: 'ledge', drop: 4 },
  { kind: 'bed', len: 48, fall: 20, kickers: SIDE_KICKERS, crumbs: [16, 4] },
  { kind: 'ledge', drop: 5 },
  // Down the old main: a slalom.
  { kind: 'pipe', len: 78, fall: 38, weeds: SLALOM, lane: SLALOM_LANE, crumbs: [20, 13] },
  { kind: 'flat', len: 14 },
  { kind: 'pipe', len: 48, fall: 22, weeds: WEEDS_A, crumbs: [4, 6] },
  { kind: 'pipe', len: 48, fall: 24, weeds: WEEDS_B, crumbs: [6, 6] },
  // The steps: three flights.
  STEP,
  { kind: 'ledge', drop: 6 },
  STEP,
  { kind: 'ledge', drop: 6 },
  STEP,
  { kind: 'ledge', drop: 6 },
  // A long track, its rail first on one side and then on the other.
  // (He comes onto it through the air, off the last step: its rails start where he has landed.)
  { kind: 'bed', len: 84, fall: 36, rails: [[-RAIL.x, 26, 52], [RAIL.x, 56, 82]] },
  { kind: 'pipe', len: 64, fall: 32, weeds: [...WEEDS_A, [-2, 46], [1.5, 52], [0.2, 58]], crumbs: [42, 5] },
  { kind: 'flat', len: 14 },
  { kind: 'pipe', len: 48, fall: 24, weeds: WEEDS_B, crumbs: [6, 6] },
  { kind: 'bed', len: 60, fall: 25, rails: BOTH_RAILS(4, 60), kickers: [[-6, -3, 30], [3, 6, 30]] },
  { kind: 'ledge', drop: 5 },
  { kind: 'bed', len: 54, fall: 23, weeds: FIELD, lane: FIELD_LANE, crumbs: [14, 9] },
  // The deep main: the longest slalom.
  { kind: 'pipe', len: 78, fall: 39, weeds: SLALOM, lane: SLALOM_LANE, crumbs: [20, 13] },
  { kind: 'flat', len: 14 },
  { kind: 'pipe', len: 48, fall: 22, weeds: WEEDS_A, crumbs: [4, 6] },
  STEP,
  { kind: 'ledge', drop: 6 },
  STEP,
  { kind: 'ledge', drop: 6 },
  { kind: 'bed', len: 96, fall: 41, rails: [[RAIL.x, 26, 46], [-RAIL.x, 50, 70], [RAIL.x, 74, 94]] },
  { kind: 'pipe', len: 64, fall: 32, weeds: [...WEEDS_B, [-0.3, 46], [1.9, 52], [-1.9, 58]], crumbs: [42, 5] },
  { kind: 'pipe', len: 56, fall: 26, weeds: WEEDS_A, crumbs: [42, 3] },
  // The in-run of the giant ramp: nothing in the way, long, and the steepest of all.
  { kind: 'bed', len: 64, fall: 36, crumbs: [10, 12] },
];

/** A section as it lies: where it starts and ends, how high its floor is at each end, and whether it is a trough. */
export interface Placed {
  kind: 'head' | 'pipe' | 'flat' | 'bed' | 'table' | 'lip';
  z0: number;
  z1: number;
  y0: number;
  y1: number;
  trough: boolean;
  lane: Lane;
  spec: Section | null;
}
/** Somewhere he is thrown from: where (the lip's middle), how fast he is going there, and how fast up it throws him. */
export interface Launch {
  kind: 'shoulder' | 'bed' | 'giant';
  x: number;
  x0: number;
  x1: number;
  /** Its foot and its lip, along the course; and the height of its lip. */
  z0: number;
  z: number;
  y: number;
  speed: number;
  up: number;
  crumbs: string[];
}
export interface RailRun {
  x: number;
  z0: number;
  z1: number;
  crumbs: string[];
}

/** How far up (or down) of where he left the ground he is after `seconds` in the air, thrown up at `up`. */
export function flight(up: number, seconds: number): number {
  const P = TUNING.physics;
  let vy = up;
  let y = 0;
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    vy = Math.max(-P.maxFall, vy - (vy < 0 ? P.gravity * P.fallGravityMultiplier : P.gravity) / 60);
    y += vy / 60;
  }
  return y;
}
const laneAt = (lane: Lane, d: number): number => {
  if (typeof lane === 'number') return lane;
  if (d <= lane[0][0]) return lane[0][1];
  for (let i = 0; i + 1 < lane.length; i++) if (d <= lane[i + 1][0]) return lane[i][1] + ((lane[i + 1][1] - lane[i][1]) * (d - lane[i][0])) / (lane[i + 1][0] - lane[i][0]);
  return lane[lane.length - 1][1];
};

interface Built {
  placed: Placed[];
  solids: Box[];
  decor: Decor[];
  collectibles: CollectibleDef[];
  launches: Launch[];
  rails: RailRun[];
  /** Bats hanging in the air beside the rails, to be hit in passing. */
  bats: Array<{ x: number; y: number; z: number }>;
  /** The crumbs along the line worth riding. */
  lineCrumbs: string[];
  /** Every weed: where its stem is. */
  weeds: Array<[number, number, number]>;
  head: { z0: number; z1: number; y: number };
  lip: { z: number; y: number };
  arena: { x: number; z: number; r: number };
  well: Well;
}
let built: Built | null = null;

function build(): Built {
  // First where everything is, measured down from the head; then all of it lifted so the arena's floor is at 0.
  let fallen = RIM; // (the first pipe is cut down into the head)
  for (const s of COURSE) fallen += s.kind === 'ledge' ? s.drop : s.kind === 'flat' ? 0 : s.fall;
  COURSE.forEach((s, i) => {
    // (A trough after a bed, or after a ledge that followed one, is cut down into it.)
    const before = COURSE.slice(0, i).reverse().find((p) => p.kind !== 'ledge');
    if (i > 0 && (s.kind === 'pipe' || s.kind === 'flat') && before?.kind === 'bed') fallen += RIM;
  });
  const headY = LIP.over + fallen;

  const placed: Placed[] = [];
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const collectibles: CollectibleDef[] = [];
  const launches: Launch[] = [];
  const rails: RailRun[] = [];
  const bats: Array<{ x: number; y: number; z: number }> = [];
  const lineCrumbs: string[] = [];
  const weeds: Array<[number, number, number]> = [];
  const crumb = (x: number, y: number, z: number): string => {
    const id = `drop-crumb-${collectibles.length}`;
    collectibles.push({ id, kind: 'crumb', x, y, z });
    return id;
  };
  /** Crumbs along the way a throw sends him: at his middle, at these times after he leaves the lip. */
  const arc = (x: number, z: number, y: number, speed: number, up: number, times: number[]): string[] => times.map((t) => crumb(x, y + flight(up, t) + 0.55, z + speed * t));
  const walls = (z0: number, z1: number, base: number, top: number): void => {
    solids.push(extent('wall', -HALF - 1, -HALF, base, top, z0, z1), extent('wall', HALF, HALF + 1, base, top, z0, z1));
  };
  const weed = (x: number, y: number, z: number): void => {
    // (Tall enough to be a wall to him wherever he meets it. At half that, with the floor falling away under it,
    // its uphill side was a step he could take: he rode up onto the weed and off its top into the air.)
    solids.push({ ...extent('stone', x - WEED.half, x + WEED.half, y - 0.6, y + WEED.high, z - WEED.half, z + WEED.half), hidden: true });
    decor.push({ kind: 'weed', x, y: y - 0.1, z, size: 0.95 });
    weeds.push([x, y, z]);
  };
  const torches = (z0: number, z1: number, at: (z: number) => number): void => {
    for (let z = Math.ceil(z0 / 16) * 16; z < z1; z += 16) {
      const side = (z / 16) % 2 === 0 ? -1 : 1;
      decor.push({ kind: 'torch', x: side * (HALF - 0.02), y: at(z) + 5.4, z, yaw: (-side * Math.PI) / 2 });
    }
  };

  // The head: a platform across the whole width, to drop in from.
  const head = { z0: -10, z1: 0, y: headY };
  solids.push(extent('stone', -HALF, HALF, headY - DEEP, headY, head.z0, head.z1));
  solids.push(extent('wall', -HALF, HALF, headY - DEEP, headY + WALL_UP + 2, head.z0 - 1, head.z0));
  walls(head.z0 - 1, head.z1, headY - DEEP, headY + WALL_UP + 2);
  placed.push({ kind: 'head', z0: head.z0, z1: head.z1, y0: headY, y1: headY, trough: false, lane: 0, spec: null });

  let z = 0;
  let y = headY;
  let trough = false;
  for (const s of COURSE) {
    if (s.kind === 'ledge') {
      y -= s.drop;
      continue;
    }
    const z0 = z;
    const z1 = z + s.len;
    const isTrough = s.kind !== 'bed';
    if (isTrough && !trough) y -= RIM;
    const y0 = y;
    const y1 = s.kind === 'flat' ? y : y - s.fall;
    const base = y1 - DEEP;
    const floor = (zz: number): number => y0 + ((y1 - y0) * (zz - z0)) / (z1 - z0);
    const lane: Lane = s.kind === 'flat' ? -1 : (s.lane ?? (s.kind === 'pipe' ? -1 : 0));
    placed.push({ kind: s.kind, z0, z1, y0, y1, trough: isTrough, lane, spec: s });
    walls(z0, z1, base, y0 + (isTrough ? RIM : 0) + WALL_UP);
    torches(z0, z1, (zz) => floor(zz) + (isTrough ? RIM : 0));

    if (s.kind === 'pipe' || s.kind === 'flat') {
      solids.push(...pipeRun('stone', S, 0, z0, z1, y0, y1, HALF, base));
      // Slimy water down its middle: it is not in use, but it still runs.
      decor.push({ kind: 'runnel', x: 0, z0, z1, y0, y1, w: S.flat * 1.5 });
    } else {
      solids.push(rampBox('stone', -HALF, HALF, z0, z1, y1, y0, 'n', base));
    }
    if (s.kind === 'flat') {
      // A kicker on each shoulder, climbing south; crumbs along the way it throws him.
      const K = SHOULDER_KICKER;
      const zk = z1 - K.back;
      for (const side of [-1, 1]) {
        const a = Math.min(side * K.x0, side * K.x1);
        const speed = TUNING.ride.max - 0.7; // (the flat has slowed him a little by here)
        const up = (speed * K.rise) / K.len;
        solids.push(rampBox('stone', a, a + (K.x1 - K.x0), zk, zk + K.len, y + RIM, y + RIM + K.rise, 's'));
        const x = a + (K.x1 - K.x0) / 2;
        launches.push({ kind: 'shoulder', x, x0: a, x1: a + (K.x1 - K.x0), z0: zk, z: zk + K.len, y: y + RIM + K.rise, speed, up, crumbs: arc(x, zk + K.len, y + RIM + K.rise, speed, up, [0.15, 0.4, 0.65, 0.9]) });
      }
    }
    if (s.kind === 'bed') {
      for (const [x, from, to] of s.rails ?? []) {
        const top = (zz: number): number => floor(zz) + RAIL.high;
        solids.push({ ...rampBox('stone', x - RAIL.wide / 2, x + RAIL.wide / 2, z0 + from, z0 + to, top(z0 + to), top(z0 + from), 'n', floor(z0 + to)), skin: 'rustPlate' }); // (its foot ON the bed at its low end, not sunk in it: sunk, its end lay in the plane of the bed's own end and flickered there)
        const ids: string[] = [];
        for (let d = from + 5; d < to - 1; d += 6) ids.push(crumb(x, top(z0 + d) + 0.55, z0 + d));
        rails.push({ x, z0: z0 + from, z1: z0 + to, crumbs: ids });
        // BATS OVER THE RAILS, to hit with the sword as he grinds by (see enemies/bat.ts, a flutterer): one between
        // each two of the rail's crumbs, off to the side of it that the middle of the bed is on, at the height of
        // his sword arm.
        for (let d = from + 8; d < to - 3; d += 12) bats.push({ x: x - Math.sign(x) * BAT_OFF.side, y: top(z0 + d) + BAT_OFF.up, z: z0 + d });
      }
      if (s.rails?.length) {
        const from = Math.min(...s.rails.map((r) => r[1]));
        const to = Math.max(...s.rails.map((r) => r[2]));
        decor.push({ kind: 'sleepers', x: 0, z0: z0 + from, z1: z0 + to, y0: floor(z0 + from), y1: floor(z0 + to), w: 4.2, gap: 1.5 });
      }
      for (const [x0, x1, at] of s.kickers ?? []) {
        const K = BED_KICKER;
        const zk = z0 + at;
        const foot = floor(zk);
        const speed = TUNING.ride.max;
        const up = (speed * K.rise) / K.len;
        solids.push(rampBox('stone', x0, x1, zk, zk + K.len, foot, foot + K.rise, 's', floor(Math.min(z1, zk + K.len)) - 0.3));
        const x = (x0 + x1) / 2;
        launches.push({ kind: 'bed', x, x0, x1, z0: zk, z: zk + K.len, y: foot + K.rise, speed, up, crumbs: arc(x, zk + K.len, foot + K.rise, speed, up, [0.2, 0.45, 0.7, 0.95]) });
      }
    }
    if (s.kind !== 'flat') {
      // Weeds out of the cracks (in a pipe, each stands on its wall where it grows).
      for (const [x, d] of s.weeds ?? []) weed(x, floor(z0 + d) + (isTrough ? wallAt(S, x) : 0), z0 + d);
      // Crumbs along the line worth riding.
      const [from, count] = s.crumbs ?? [0, 0];
      for (let i = 0; i < count; i++) {
        const d = from + i * 4;
        const x = laneAt(lane, d);
        lineCrumbs.push(crumb(x, floor(z0 + d) + (isTrough ? wallAt(S, x) : 0) + 0.55, z0 + d));
      }
    }
    z = z1;
    y = y1;
    trough = isTrough;
  }

  // The giant ramp: a level table at the foot of the in-run, then the lip. Past it there is nothing.
  const tableY = y;
  const base = tableY - DEEP;
  solids.push(extent('stone', -HALF, HALF, base, tableY, z, z + LIP.table));
  placed.push({ kind: 'table', z0: z, z1: z + LIP.table, y0: tableY, y1: tableY, trough: false, lane: 0, spec: null });
  const lz0 = z + LIP.table;
  const lzm = lz0 + LIP.len1;
  const lz1 = lzm + LIP.len2;
  const lipY = tableY + LIP.rise1 + LIP.rise2;
  solids.push(rampBox('stone', -HALF, HALF, lz0, lzm, tableY, tableY + LIP.rise1, 's', base));
  solids.push(rampBox('stone', -HALF, HALF, lzm, lz1, tableY + LIP.rise1, lipY, 's', base));
  placed.push({ kind: 'lip', z0: lz0, z1: lz1, y0: tableY, y1: lipY, trough: false, lane: 0, spec: null });
  walls(z, lz1, base, lipY + WALL_UP);
  decor.push({ kind: 'torch', x: -HALF + 0.02, y: lipY + 3, z: lz1 - 0.6, yaw: Math.PI / 2 }, { kind: 'torch', x: HALF - 0.02, y: lipY + 3, z: lz1 - 0.6, yaw: -Math.PI / 2 });
  const lip = { z: lz1, y: lipY };
  {
    const speed = LIP.speed; // (the table and the climb have slowed him to this)
    const up = (speed * LIP.rise2) / LIP.len2;
    launches.push({ kind: 'giant', x: 0, x0: -HALF, x1: HALF, z0: lz0, z: lz1, y: lip.y, speed, up, crumbs: arc(0, lz1, lip.y, speed, up, [0.2, 0.45, 0.7, 0.95, 1.2, 1.45]) });
  }

  // The arena, far below: a round floor in the dark. Its floor is solid well past its edge, but he cannot go there.
  const arena = { x: 0, z: lip.z + ARENA.ahead, r: ARENA.r };
  solids.push({ ...extent('floor', arena.x - arena.r - 4, arena.x + arena.r + 4, -1, 0, arena.z - arena.r - 4, arena.z + arena.r + 4), hidden: true });
  // (The stone of the way out, at the south edge: solid, so that the view does not go into it. Just past where he
  // can stand: it is not in his way.)
  solids.push({ ...extent('wall', arena.x - 2.2, arena.x + 2.2, 0, 4.6, arena.z + arena.r + 0.15, arena.z + arena.r + 0.85), hidden: true });
  decor.push({ kind: 'arena', x: arena.x, y: 0, z: arena.z, r: arena.r });
  decor.push({ kind: 'eyes', x: arena.x, y: 0, z: arena.z, r0: arena.r + 4, r1: arena.r + 17, high: 8, count: 52 });
  // (A funnel: at the height of the ramp's underside it is wide enough to take one who only walks off the lip.)
  const top = base - 1;
  const well: Well = { x: arena.x, z: arena.z, y: 0, r: arena.r, clear: ARENA.clear, top, flare: (ARENA.ahead + 1.5 - arena.r) / (top - ARENA.clear) };

  // Boards: what to do at the top, and what the rails are for.
  decor.push({ kind: 'sign', x: -4.6, y: headY + 1.5, z: -2.2, yaw: Math.PI, w: 2.8, h: 1.4, lines: ['THE LONG DROP', 'JUMP, ATTACK'], post: 0 });
  const firstRails = placed.find((p) => p.spec?.kind === 'bed' && p.spec.rails?.length);
  if (firstRails) decor.push({ kind: 'sign', x: -HALF + 0.02, y: firstRails.y0 + 2.2, z: firstRails.z0 + 4, yaw: Math.PI / 2, w: 2.8, h: 1.4, lines: ['THE RAILS', 'RIDE NEAR, STOW'] });

  return { placed, solids, decor, collectibles, launches, rails, bats, lineCrumbs, weeds, head, lip, arena, well };
}

/** Everything about how the course lies (built once). */
export function longDropPlan(): Built {
  return (built ??= build());
}
/** The section at z (the last one, past the lip). */
export function sectionAt(z: number): Placed {
  const P = longDropPlan().placed;
  return P.find((p) => z < p.z1) ?? P[P.length - 1];
}
/** How high the course's own floor is at z, down its middle line. */
export function dropFloor(z: number): number {
  const p = sectionAt(z);
  const t = Math.max(0, Math.min(1, (z - p.z0) / (p.z1 - p.z0)));
  return p.y0 + (p.y1 - p.y0) * t;
}
/** The line worth riding at z: it misses every weed, and every kicker and rail too. */
export function dropLine(z: number): number {
  const p = sectionAt(z);
  return laneAt(p.lane, z - p.z0);
}
export const LONGDROP = { half: HALF, rim: RIM, troughHalf: pipeHalf(S) } as const;

export function longDrop(): LevelDef {
  const B = longDropPlan();
  return {
    id: 'longdrop',
    name: 'The Long Drop',
    blurb: 'A minute and a half downhill on the shield: pipes, rails and ramps, and a long fall into the dark at the end.',
    theme: 'sewer',
    music: 'pump',
    fogRange: [30, 110],
    solids: B.solids.map((b) => ({ ...b })),
    pit: null,
    water: [],
    decor: B.decor.map((d) => ({ ...d })),
    spawn: { x: 0, y: B.head.y, z: -6, facing: 0 },
    collectibles: B.collectibles.map((c) => ({ ...c })),
    crateContents: [],
    waves: [],
    gear: [],
    // The Widows: two of them, one out past the east edge of the light and one past the west, each facing the middle
    // (see enemies/widow.ts). Between them their legs reach the whole floor.
    enemies: [...B.bats.map((b) => ({ type: 'bat' as const, flutter: true, x: b.x, y: b.y, z: b.z, respawn: true, uncounted: true })), ...[1, -1].map((side) => ({ type: 'widow' as const, x: B.arena.x + side * (B.arena.r + WIDOW_OUT), y: 0, z: B.arena.z, respawn: false, arena: { x0: B.arena.x - B.arena.r, x1: B.arena.x + B.arena.r, z0: B.arena.z - B.arena.r, z1: B.arena.z + B.arena.r } }))],
    goals: [{ type: 'defeat', label: 'Beat the Widows' }],
    well: { ...B.well },
    // Its way out stands at the south edge of the arena's light (ahead of him as he lands, between the two of them),
    // appears when they are beaten, and leads back to the Move Garden.
    exit: { x: B.arena.x, z: B.arena.z + B.arena.r - 0.35, yaw: Math.PI, width: 2.6, height: 3.8, y: 0 },
    returnTo: 'garden',
  };
}
