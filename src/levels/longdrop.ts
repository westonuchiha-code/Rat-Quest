/**
 * The Long Drop: a level that is all downhill, on the shield the whole way. A FIRST VERSION, to try the idea.
 *
 * The owner, 2026-11-15: "a level that's just like a really long steep decline that's like a sewer pipe going down
 * through some tunnels ... you could even have it break off into like an underground Railway and you can grind along
 * the railroad tracks or just like slide down alongside them ... totally downhill and you're just on the board the
 * whole time"; "there should be like a little bit of liquid in the bottom to give a sense that it's not in use
 * anymore but it still carries some like slimy water and they'll be natural obstacles like maybe little plants
 * growing out of cracks in the pipe".
 *
 * It runs STRAIGHT south (the view may not turn by itself, and a bend would ask it to), 178 long and 45 down:
 *   the HEAD, a platform to drop in from;
 *   the FIRST PIPE, 36 long, falling 15: slime down its middle, weeds to steer round;
 *   the LEVEL LENGTH, 12 long: the same trough run level, a breath, with a kicker on each shoulder;
 *   the SECOND PIPE, 36 long and steeper, falling 18;
 *   the RAILWAY, 48 long, falling 12: an old track bed, two rails to grind, sleepers under them;
 *   the STATION: flat, and long enough to stop in from full speed; buffers at the end of the line, a platform
 *   with the way out.
 * Either side of the pipes is a SHOULDER, level with their rims: one who comes out of the trough lands there and can
 * ride on, or steer back in. Tall walls shut the whole of it in. It is a test room: reached by a door in the Move
 * Garden, and its own door leads back there.
 */
import type { LevelDef } from './types';
import type { CollectibleDef } from '../world/collectibles';
import { extent, rampBox, type Box, type Decor } from '../world/layout';
import { SEWER_PIPE, floorAlong, pipeHalf, pipeRim, pipeRun } from './pipes';

/** How wide the whole course is, from its middle to each wall; and how high the walls stand over the top of it. */
const HALF = 8;
const WALL = 9;
export const LONGDROP = {
  half: HALF,
  /** Where each part starts and ends (z, going south) and how high its floor is at each end. */
  head: { z0: -10, z1: 0, y: 45 },
  pipeA: { z0: 0, z1: 36, top: 45, bottom: 30 },
  level: { z0: 36, z1: 48, y: 30 },
  pipeB: { z0: 48, z1: 84, top: 30, bottom: 12 },
  rail: { z0: 84, z1: 132, top: 12, bottom: 0 },
  station: { z0: 132, z1: 168, y: 0 },
  /** The rails: how far each is from the middle, how wide and how high over the bed. Low enough to ride over. */
  rails: { x: 1.4, wide: 0.24, high: 0.3 },
  /** The kickers on the level length's shoulders: little ramps to jump from. */
  kicker: { x0: 4, x1: 7, z0: 42, z1: 45, high: 1 },
  /** The buffers at the end of the line, and the platform with the way out. */
  buffers: { z0: 164, z1: 165, high: 1.2, half: 2.6 },
  platform: { x0: 3, x1: HALF, z0: 154, z1: 168, y: 1, rampFrom: 150 },
  /** Weeds growing out of cracks: where each is (x, z), each a small solid to steer round. */
  weeds: [[1.7, 9], [-1.9, 16], [2.2, 24], [-0.2, 29], [-2.1, 56], [1.6, 64], [0.3, 71], [-1.8, 78]] as Array<[number, number]>,
} as const;

/** How high the course's own floor is at z, down its middle line. */
export function dropFloor(z: number): number {
  const L = LONGDROP;
  if (z < L.pipeA.z0) return L.head.y;
  if (z < L.pipeA.z1) return floorAlong(z, L.pipeA.z0, L.pipeA.z1, L.pipeA.top, L.pipeA.bottom);
  if (z < L.pipeB.z0) return L.level.y;
  if (z < L.pipeB.z1) return floorAlong(z, L.pipeB.z0, L.pipeB.z1, L.pipeB.top, L.pipeB.bottom);
  if (z < L.rail.z1) return floorAlong(z, L.rail.z0, L.rail.z1, L.rail.top, L.rail.bottom);
  return L.station.y;
}

/** What is solid of a weed: this far out from its stem each way, and this high above where it grows. */
export const WEED = { half: 0.22, high: 1.1 } as const;

/** The crumbs over each kicker: how far past its lip each is, and how high over the shoulder there. */
export const KICKER_ARC: Array<[number, number]> = [[1.5, 1.8], [5, 3.0], [8.5, 3.8], [12, 3.1]];

export function longDrop(): LevelDef {
  const L = LONGDROP;
  const S = SEWER_PIPE;
  const solids: Box[] = [];
  const decor: Decor[] = [];
  const top = L.head.y + 9;
  const north = L.head.z0;
  const south = L.station.z1;

  // The ground under all of it (the station stands on it), the walls that shut it in, and its two ends.
  solids.push(extent('floor', -WALL, WALL, -1, 0, north - 1, south + 1));
  solids.push(extent('wall', -WALL, -HALF, 0, top, north - 1, south + 1), extent('wall', HALF, WALL, 0, top, north - 1, south + 1));
  solids.push(extent('wall', -HALF, HALF, 0, top, north - 1, north), extent('wall', -HALF, HALF, 0, top, south, south + 1));

  // The head: a platform across the whole width, the pipe's mouth in its south edge.
  solids.push(extent('stone', -HALF, HALF, 0, L.head.y, L.head.z0, L.head.z1));
  // The pipes, and the level length between them: one trough from top to bottom, with a shoulder either side.
  solids.push(...pipeRun('stone', S, 0, L.pipeA.z0, L.pipeA.z1, L.pipeA.top, L.pipeA.bottom, HALF));
  solids.push(...pipeRun('stone', S, 0, L.level.z0, L.level.z1, L.level.y, L.level.y, HALF));
  solids.push(...pipeRun('stone', S, 0, L.pipeB.z0, L.pipeB.z1, L.pipeB.top, L.pipeB.bottom, HALF));
  // A kicker on each shoulder of the level length, climbing south.
  const rim = pipeRim(S);
  for (const side of [-1, 1]) {
    const a = side * L.kicker.x0;
    const b = side * L.kicker.x1;
    solids.push(rampBox('stone', Math.min(a, b), Math.max(a, b), L.kicker.z0, L.kicker.z1, L.level.y + rim, L.level.y + rim + L.kicker.high, 's'));
  }
  // The railway: a bed across the whole width, falling; two rails on it, falling with it.
  solids.push(rampBox('stone', -HALF, HALF, L.rail.z0, L.rail.z1, L.rail.bottom, L.rail.top, 'n', 0));
  for (const side of [-1, 1]) {
    const x = side * L.rails.x;
    solids.push({ ...rampBox('stone', x - L.rails.wide / 2, x + L.rails.wide / 2, L.rail.z0 + 2, L.rail.z1, L.rail.bottom + L.rails.high, floorAlong(L.rail.z0 + 2, L.rail.z0, L.rail.z1, L.rail.top, L.rail.bottom) + L.rails.high, 'n', 0), skin: 'rustPlate' });
    // ...and on into the station, level, as far as the buffers.
    solids.push({ ...extent('stone', x - L.rails.wide / 2, x + L.rails.wide / 2, 0, L.rails.high, L.station.z0, L.buffers.z0), skin: 'rustPlate' });
  }
  decor.push({ kind: 'sleepers', x: 0, z0: L.rail.z0 + 2, z1: L.rail.z1, y0: floorAlong(L.rail.z0 + 2, L.rail.z0, L.rail.z1, L.rail.top, L.rail.bottom), y1: L.rail.bottom, w: 4.2, gap: 1.5 });
  decor.push({ kind: 'sleepers', x: 0, z0: L.station.z0, z1: L.buffers.z0, y0: 0, y1: 0, w: 4.2, gap: 1.5 });
  // The station: buffers across the end of the line; a platform down the east side with a ramp up to it.
  solids.push(extent('plank', -L.buffers.half, L.buffers.half, 0, L.buffers.high, L.buffers.z0, L.buffers.z1));
  const P = L.platform;
  solids.push(extent('stone', P.x0, P.x1, 0, P.y, P.z0, P.z1));
  solids.push(rampBox('stone', P.x0, P.x1, P.rampFrom, P.z0, 0, P.y, 's'));

  // Slimy water down the middle of each pipe, and across the level length: it is not in use, but it still runs.
  for (const [z0, z1, y0, y1] of [[L.pipeA.z0, L.pipeA.z1, L.pipeA.top, L.pipeA.bottom], [L.level.z0, L.level.z1, L.level.y, L.level.y], [L.pipeB.z0, L.pipeB.z1, L.pipeB.top, L.pipeB.bottom]]) {
    decor.push({ kind: 'runnel', x: 0, z0, z1, y0, y1, w: S.flat * 1.5 });
  }
  // Weeds out of the cracks: each a clump to steer round (solid: riding into one at speed throws him off).
  for (const [x, z] of L.weeds) {
    // (Its foot is on the pipe's wall there: the floor's height, and what the curve adds that far out.)
    const out = Math.max(0, Math.abs(x) - S.flat);
    const h = S.radius - Math.sqrt(Math.max(0, S.radius * S.radius - out * out));
    const y = dropFloor(z) + h;
    // (Tall enough to be a wall to him wherever he meets it. At half that, with the floor falling away under it,
    // its uphill side was a step he could take: he rode up onto the weed and off its top into the air.)
    solids.push({ ...extent('stone', x - WEED.half, x + WEED.half, y - 0.6, y + WEED.high, z - WEED.half, z + WEED.half), hidden: true });
    decor.push({ kind: 'weed', x, y: y - 0.1, z, size: 0.95 });
  }
  // Light: torches down both walls, a little above the course as it falls; crystals where the tunnels open out.
  for (let z = -6; z < south; z += 12) {
    const y = Math.max(dropFloor(z), dropFloor(z + 4)) + 5.2;
    decor.push({ kind: 'torch', x: -HALF + 0.02, y, z, yaw: Math.PI / 2 }, { kind: 'torch', x: HALF - 0.02, y, z: z + 6, yaw: -Math.PI / 2 });
  }
  decor.push({ kind: 'crystal', x: -6.4, y: L.level.y + rim, z: 39, size: 1.4, color: 0x5fd0c0 }, { kind: 'crystal', x: 6.6, y: L.level.y + rim, z: 46.6, size: 1.1, color: 0x8a7fe0 });
  decor.push({ kind: 'crystal', x: -6.6, y: 0, z: 158, size: 1.5, color: 0x5fd0c0 });
  // Boards: what to do at the top; what the rails are for; where the way out is.
  decor.push({ kind: 'sign', x: -4.6, y: L.head.y + 1.5, z: -2.2, yaw: Math.PI, w: 2.8, h: 1.4, lines: ['THE LONG DROP', 'JUMP, ATTACK'], post: 0 });
  decor.push({ kind: 'sign', x: -HALF + 0.02, y: floorAlong(90, L.rail.z0, L.rail.z1, L.rail.top, L.rail.bottom) + 3, z: 90, yaw: Math.PI / 2, w: 2.8, h: 1.4, lines: ['THE RAILS', 'RIDE NEAR, STOW'] });
  decor.push({ kind: 'sign', x: P.x0 + 0.6, y: P.y + 1.5, z: P.z0 + 0.6, yaw: Math.PI, w: 2.2, h: 1.2, lines: ['WAY OUT'], post: 0 });

  // Crumbs along the lines worth taking: down the slime, over each kicker, and above each rail.
  const collectibles: CollectibleDef[] = [];
  const crumb = (x: number, y: number, z: number): void => void collectibles.push({ id: `drop-crumb-${collectibles.length}`, kind: 'crumb', x, y, z });
  for (let z = 4; z < L.pipeB.z1; z += 4) if (!L.weeds.some(([wx, wz]) => Math.abs(wx) < 1 && Math.abs(wz - z) < 2.5)) crumb(0, dropFloor(z) + 0.6, z);
  for (const side of [-1, 1]) {
    const x = side * (L.kicker.x0 + L.kicker.x1) / 2;
    // (Along the arc the kicker throws him in at full speed: up over the second pipe's shoulder as it falls away.)
    for (const [dz, up] of KICKER_ARC) crumb(x, dropFloor(L.kicker.z1 + dz) + rim + up, L.kicker.z1 + dz);
    for (let z = L.rail.z0 + 6; z < L.rail.z1; z += 5) crumb(side * L.rails.x, floorAlong(z, L.rail.z0, L.rail.z1, L.rail.top, L.rail.bottom) + L.rails.high + 0.7, z);
  }

  return {
    id: 'longdrop',
    name: 'The Long Drop',
    blurb: 'All downhill, on the shield the whole way: two lengths of old pipe and a railway to grind.',
    theme: 'sewer',
    fogRange: [30, 110],
    solids,
    pit: null,
    water: [],
    decor,
    spawn: { x: 0, y: L.head.y, z: -6, facing: 0 },
    collectibles,
    crateContents: [],
    enemies: [],
    waves: [],
    gear: [],
    goals: [],
    // Its way out is on the platform at the bottom, and leads back to the Move Garden.
    exit: { x: (P.x0 + P.x1) / 2, z: south - 0.08, yaw: Math.PI, width: 2.6, height: 3.8, y: P.y },
    returnTo: 'garden',
  };
}
/** How far from the middle the trough's walls end (for the tests). */
export const dropTroughHalf = (): number => pipeHalf(SEWER_PIPE);
