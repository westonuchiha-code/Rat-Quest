/**
 * Room layout as plain data. Nothing here touches three.js, so tests can check it in node.
 * Every box is given by its extents (x0..x1, y0..y1, z0..z1). Solid boxes are both drawn and collided with.
 * The pit is a void: nothing solid may overlap it.
 */

import type { TextureName } from '../render/textures';

/** What a box is. 'rubble' is a breakable crate and 'barrel' a breakable barrel; the rest are solid scenery. */
export type Kind = 'floor' | 'wall' | 'pillar' | 'platform' | 'rubble' | 'plank' | 'stone' | 'barrel';

/** Which picture a box wears. Each kind has a default; the kit pieces pick others (tiles, grating, rock...). */
export type Skin = TextureName;

/** True for the things a sword can smash. */
export const isBreakable = (k: Kind): boolean => k === 'rubble' || k === 'barrel';

export interface Box {
  kind: Kind;
  skin?: Skin;
  /** Collides but is not drawn (for example the space under an arch's curve). */
  hidden?: boolean;
  /** A crate bound in iron: only a heavy blade (the Cleaver) breaks it. */
  tough?: boolean;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export const ROOM_HALF = 20; // inner faces of the walls sit at +/-20
export const PIT_HALF = 7; // the pit is a 14x14 square in the middle
export const PIT_DEPTH = 4; // how far the pit drops below floor level
export const POOL_Y = -0.85; // resting height of the toxic surface inside the pit
export const WALL_HEIGHT = 12;

/** Ring of rising platforms. Each one is one step higher than the last, so every jump is reachable. */
export const RING = {
  count: 12,
  radius: 12.2, // far enough out that no platform footprint reaches over the pit
  size: 3, // square footprint
  step: 0.6, // height gain per platform
};

export function extent(kind: Kind, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Box {
  return { kind, x0, x1, y0, y1, z0, z1 };
}

/** A pool the rat can swim in. y is the surface height. */
export interface WaterVolume {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  /** A current, in units per second along x and z. He is carried along while he swims in it, and the surface flows. */
  flow?: [number, number];
}

/** A pool of lava. Touching it hurts and throws the rat back to the last safe ground. y is the surface height. */
export interface LavaVolume {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}

/**
 * A standing fire: a pyre that fills its square from the floor (y) up. Walking into it burns (a heart, and back to the
 * last safe ground) unless he is fireproof (the Ember Helm), who walks through it.
 */
export interface FireVolume {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
}

/** Whether a point (his feet) is in one of the fires. */
export function fireAt(fires: readonly FireVolume[] | undefined, x: number, y: number, z: number): FireVolume | null {
  for (const f of fires ?? []) if (x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1 && y > f.y - 0.5) return f;
  return null;
}

/** Things that are only drawn: pipes along the walls, dark drain mouths, lamps. They are never collided with. */
export type Decor =
  | { kind: 'pipe'; a: [number, number, number]; b: [number, number, number]; r: number; color?: number }
  | { kind: 'hole'; x: number; y: number; z: number; /** direction the opening faces, in radians about Y */ yaw: number; r: number; /** a rat's tunnel: one of its bars is broken off short */ gap?: boolean }
  /** An old adventurers' mark scratched on a wall that faces `yaw`: a little sword, point down, inside a diamond. */
  | { kind: 'mark'; x: number; y: number; z: number; yaw: number; size: number; color?: number; /** 'crown' is the royal mark: three spikes on a band. Default: the adventurers' sword. */ glyph?: 'sword' | 'crown' }
  /** Bare wooden shelves standing against a wall that faces `yaw`. Nothing on them. */
  | { kind: 'shelf'; x: number; y: number; z: number; yaw: number; width: number; height: number }
  /** An iron grating in the floor with a faint cold glow coming up through it from far below. */
  | { kind: 'grate'; x: number; y: number; z: number; size: number }
  /** The Deep Engine, seen from far above: great rings and spokes of dim light round a glowing heart, with the kingdom's lamps scattered about it. */
  | { kind: 'engine'; x: number; y: number; z: number; r: number }
  /** One of the machines the cheese is fed to: a boiler against a wall that faces `yaw`, with a hopper, a turning wheel and a lit window. */
  | { kind: 'machine'; x: number; y: number; z: number; yaw: number }
  /** A faded royal portrait in a frame, on a wall that faces `yaw`. */
  | { kind: 'portrait'; x: number; y: number; z: number; yaw: number; size: number }
  | { kind: 'lamp'; x: number; y: number; z: number }
  /** A cobweb on a wall facing `yaw`, `r` across. */
  | { kind: 'web'; x: number; y: number; z: number; yaw: number; r: number }
  /** A stone bowl of fire standing on the floor at y. */
  | { kind: 'brazier'; x: number; y: number; z: number }
  /** A coloured beacon on a short post. `flash` is flashes per second (0 = steady). It lights up the walls and floor around it. */
  | { kind: 'light'; x: number; y: number; z: number; color: number; flash: number }
  /** A busted old speaker stack, facing `yaw` (0 faces south, +z). Its cone thumps to the beat. */
  | { kind: 'speaker'; x: number; y: number; z: number; yaw: number }
  /** A sagging old couch, facing `yaw`. */
  | { kind: 'couch'; x: number; y: number; z: number; yaw: number }
  /** A wall grate pouring sludge: the opening is at (x, y, z) facing `yaw`, `width` wide, falling down to `bottom`. */
  | { kind: 'fall'; x: number; y: number; z: number; yaw: number; width: number; bottom: number }
  /** A chain hanging from (x, top, z) down to `bottom`. */
  | { kind: 'chain'; x: number; z: number; top: number; bottom: number }
  /** A wooden post from the floor to `top`, against a wall, with a cross beam toward `yaw`. */
  | { kind: 'post'; x: number; z: number; y: number; top: number }
  /** A small barred window on a wall facing `yaw`. */
  | { kind: 'window'; x: number; y: number; z: number; yaw: number }
  /** Green slime dripping down a wall facing `yaw`, from `y` downward `length`. */
  | { kind: 'slime'; x: number; y: number; z: number; yaw: number; length: number }
  /** A cloth banner hanging from a rod on a wall that faces `yaw`: `top` is the rod's height; swallow-tailed, gold trim and a gold diamond. It sways a little. */
  | { kind: 'banner'; x: number; z: number; top: number; yaw: number; w: number; h: number; color: number }
  /** A torch in an iron bracket on a wall that faces `yaw`, at height y. It burns and lights the wall. */
  | { kind: 'torch'; x: number; y: number; z: number; yaw: number }
  /** A round pressure gauge on a wall that faces `yaw`, `r` across, its needle trembling. */
  | { kind: 'gauge'; x: number; y: number; z: number; yaw: number; r: number }
  /** A cluster of glowing crystals growing from the floor at y, `size` tall, in a colour; it lights what is near. */
  | { kind: 'crystal'; x: number; y: number; z: number; size: number; color: number }
  /** Roots hanging from (x, top, z) down towards `bottom`, swaying a little. */
  | { kind: 'roots'; x: number; z: number; top: number; bottom: number }
  /** The curved underside of an archway (the solid parts are boxes): spans x0..x1 along the wall (or z if `alongZ`). */
  | { kind: 'arch'; x0: number; x1: number; z: number; y: number; thick: number; alongZ?: boolean; skin?: Skin };

/**
 * A pipe running up a wall that can be smashed. It stands at (x, z) on a floor at `y`, rises to `top`,
 * and its joint (the green-banded part at sword height) is what breaks. Broken, it gushes sludge toward `yaw`.
 */
export interface PipeSpec {
  x: number;
  z: number;
  y?: number;
  top: number;
  yaw: number;
}

/**
 * A portcullis: iron bars across an opening, `width` wide and `height` tall, centred at (x, z) on a floor at `y`.
 * It runs along x (or along z when `alongZ`). It rises when every pipe in `pipes` is broken (or when the level's goals
 * are done, with `onGoals`).
 */
export interface GateSpec {
  x: number;
  z: number;
  y?: number;
  width: number;
  height: number;
  alongZ?: boolean;
  pipes?: number[];
  /** Opens when all of these floor plates (by their order in the level) have been stepped on. */
  plates?: number[];
  onGoals?: boolean;
}

/**
 * A platform that moves back and forth and carries whoever stands on it. It starts with its top at `y`, centred at (x, z),
 * waits, glides by `to` (x, y, z), waits, and glides back. A lift is just a platform whose `to` goes straight up.
 */
export interface MoverSpec {
  x: number;
  z: number;
  y: number;
  w: number;
  d: number;
  thick?: number;
  to: [number, number, number];
  /** Units per second while gliding (default 2). */
  speed?: number;
  /** Seconds it waits at each end (default 1.5). */
  pause?: number;
  /** Where in its cycle it starts, 0..1 (default 0). */
  phase?: number;
  skin?: Skin;
}

const smooth = (f: number): number => f * f * (3 - 2 * f);

/** How far a moving platform has travelled from its start at a given time, as an x, y, z offset. */
export function moverOffset(m: MoverSpec, time: number): [number, number, number] {
  const len = Math.hypot(m.to[0], m.to[1], m.to[2]);
  if (len < 1e-6) return [0, 0, 0];
  const glide = len / Math.max(0.1, m.speed ?? 2);
  const wait = Math.max(0, m.pause ?? 1.5);
  const cycle = 2 * (glide + wait);
  const s = (((time + (m.phase ?? 0) * cycle) % cycle) + cycle) % cycle;
  let f = 0;
  if (s < wait) f = 0;
  else if (s < wait + glide) f = smooth((s - wait) / glide);
  else if (s < 2 * wait + glide) f = 1;
  else f = 1 - smooth((s - 2 * wait - glide) / glide);
  return [m.to[0] * f, m.to[1] * f, m.to[2] * f];
}

export interface Layout {
  movers?: MoverSpec[];
  lava?: LavaVolume[];
  fire?: FireVolume[];
  solids: Box[];
  decor?: Decor[];
  /** The void under the room (kept clear of solids), or null when there is none. */
  pit: Box | null;
  water: WaterVolume[];
  pipes?: PipeSpec[];
  gates?: GateSpec[];
}

export function buildLayout(): Layout {
  const R = ROOM_HALF;
  const P = PIT_HALF;
  const solids: Box[] = [];

  // Floor: four strips around the pit. They run to the walls, so the corners are covered.
  solids.push(extent('floor', -R, R, -1, 0, -R, -P)); // north
  solids.push(extent('floor', -R, R, -1, 0, P, R)); // south
  solids.push(extent('floor', -R, -P, -1, 0, -P, P)); // west
  solids.push(extent('floor', P, R, -1, 0, -P, P)); // east

  // Walls. North and south are 40 wide; east and west are 42 long, so the corners fit with no overlap.
  solids.push(extent('wall', -R, R, 0, WALL_HEIGHT, -R - 1, -R));
  solids.push(extent('wall', -R, R, 0, WALL_HEIGHT, R, R + 1));
  solids.push(extent('wall', R, R + 1, 0, WALL_HEIGHT, -R - 1, R + 1));
  solids.push(extent('wall', -R - 1, -R, 0, WALL_HEIGHT, -R - 1, R + 1));

  // Corner pillars, 2x2 and 8 tall, a few units clear of the ring.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = sx * 17.5;
      const cz = sz * 17.5;
      solids.push(extent('pillar', cx - 1, cx + 1, 0, 8, cz - 1, cz + 1));
    }
  }

  // Ring of platforms.
  const h = RING.size / 2;
  for (let i = 0; i < RING.count; i++) {
    const a = (i / RING.count) * Math.PI * 2;
    const cx = Math.cos(a) * RING.radius;
    const cz = Math.sin(a) * RING.radius;
    const top = RING.step * (i + 1);
    solids.push(extent('platform', cx - h, cx + h, 0, top, cz - h, cz + h));
  }

  // Crates on the floor. They're low enough to jump onto, and they sit clear of the ring.
  const rubble: Array<[number, number]> = [
    [-15.5, 4],
    [15.5, -4],
    [0, 17],
    [-4, -16.5],
  ];
  for (const [x, z] of rubble) {
    solids.push(extent('rubble', x - 0.5, x + 0.5, 0, 1, z - 0.5, z + 0.5));
  }

  const pit = extent('floor', -P, P, -PIT_DEPTH, 0, -P, P); // void: the kind is unused here
  const water: WaterVolume[] = [{ x0: -P, x1: P, z0: -P, z1: P, y: POOL_Y }];
  return { solids, pit, water };
}

/** Tests whether two boxes overlap by a positive volume. Boxes that only touch do not count. */
export function overlaps(a: Box, b: Box, eps = 1e-4): boolean {
  return (
    a.x0 < b.x1 - eps &&
    b.x0 < a.x1 - eps &&
    a.y0 < b.y1 - eps &&
    b.y0 < a.y1 - eps &&
    a.z0 < b.z1 - eps &&
    b.z0 < a.z1 - eps
  );
}

/** Returns every clipping problem in the layout. An empty list means nothing overlaps. */
export function findProblems(layout: Layout): string[] {
  const problems: string[] = [];
  const { solids, pit } = layout;
  const label = (b: Box, i: number): string => `${b.kind}#${i} [x ${b.x0}..${b.x1}, y ${b.y0}..${b.y1}, z ${b.z0}..${b.z1}]`;

  for (let i = 0; i < solids.length; i++) {
    if (pit && overlaps(solids[i], pit)) problems.push(`${label(solids[i], i)} overlaps the pit`);
    for (let j = i + 1; j < solids.length; j++) {
      if (overlaps(solids[i], solids[j])) problems.push(`${label(solids[i], i)} overlaps ${label(solids[j], j)}`);
    }
  }
  return problems;
}
