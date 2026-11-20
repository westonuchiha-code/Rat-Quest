/**
 * Room layout as plain data. Nothing here touches three.js, so tests can check it in node.
 * Every box is given by its extents (x0..x1, y0..y1, z0..z1). Solid boxes are both drawn and collided with.
 * The pit is a void: nothing solid may overlap it.
 */

import type { HazardSpec } from './hazards';
import type { TextureName } from '../render/textures';
import type { ForgeSpec } from './forge';

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
  /**
   * A small thing to pick up and throw (world/lifting.ts), in place of a crate: a clay POT (light: it flies further,
   * hurts less, and breaks, as a crate does, to a sword or a throw) or a ROCK (it does not break: it can be thrown
   * again and again). Made with `potBox` and `rockBox`, which give them their sizes. `kind` is 'rubble', as a crate's.
   */
  prop?: 'pot' | 'rock';
  /** Ice: on its top he keeps his momentum. He glides on a couple of seconds with the stick let go, and turns wide (TUNING.ice). */
/** The top of a pipe's curved wall: a rider who goes off its high end fast goes straight UP and comes back down on it (TUNING.ride.vertMin). */
  vert?: boolean;
    slick?: boolean;
  /**
   * A ramp: its top runs up from `low` at one end to y1 at the other, along x or z, climbing toward the + end of that
   * axis (`up` 1) or the - end (-1). (North is -z: a ramp that climbs north has axis 'z', up -1.) See collision.ts.
   */
  ramp?: { axis: 'x' | 'z'; up: 1 | -1; low: number; cross?: number };
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

/** How big a pot and a rock are: across, and high. */
export const POT = { wide: 0.56, high: 0.62 } as const;
export const ROCK = { wide: 0.62, high: 0.44 } as const;
/** A clay pot standing at (x, z) on a floor at y. */
export function potBox(x: number, z: number, y = 0): Box {
  return { kind: 'rubble', prop: 'pot', x0: x - POT.wide / 2, x1: x + POT.wide / 2, y0: y, y1: y + POT.high, z0: z - POT.wide / 2, z1: z + POT.wide / 2 };
}
/** A rock lying at (x, z) on a floor at y. */
export function rockBox(x: number, z: number, y = 0): Box {
  return { kind: 'rubble', prop: 'rock', x0: x - ROCK.wide / 2, x1: x + ROCK.wide / 2, y0: y, y1: y + ROCK.high, z0: z - ROCK.wide / 2, z1: z + ROCK.wide / 2 };
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

/** How steep a ramp may be and still be walked up: one up for one along (45 degrees). */
export const MAX_WALK_SLOPE = 1;
/**
 * A ramp given by its ground plan, the height of its low end and of its high end, and the way it climbs
 * ('n' is -z, 's' +z, 'e' +x, 'w' -x). It is solid down to `bottom` (default: its low end's height).
 */
export function rampBox(kind: Kind, x0: number, x1: number, z0: number, z1: number, low: number, high: number, toward: 'n' | 's' | 'e' | 'w', bottom = low, cross = 0): Box {
  const axis: 'x' | 'z' = toward === 'e' || toward === 'w' ? 'x' : 'z';
  // (`cross`: tilted the other way too, rising that much toward its other axis's + side, or - side if negative. `high`
  // is still the top of its first slope's high end on its LOW side: the box's own top is that and the cross rise.)
  const ramp = { axis, up: (toward === 'e' || toward === 's' ? 1 : -1) as 1 | -1, low, ...(cross ? { cross } : {}) };
  return { kind, x0, x1, y0: Math.min(bottom, low), y1: high + Math.abs(cross), z0, z1, ramp };
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

/**
 * A fire bowl on its stand, as drawn (brazierModel.ts) and as solid (custom.ts): its foot's half-width, its bowl's, how
 * high the bowl begins and how high its rim is, and where the coals lie in it.
 */
export const BRAZIER = { foot: 0.46, bowl: 0.66, bowlFrom: 0.8, rim: 1.16, coals: 1.02 } as const;

/**
 * Whether he is in a fire bowl's fire: his feet over the bowl (within the coals, not just touching the rim) and no
 * higher over its rim than the flames stand. Comes back with the bowl he is in, to be thrown away from. Fire is fire,
 * in the Club as anywhere: he cannot stand in it, or rest there.
 */
export function inBrazierFire(decor: readonly Decor[] | undefined, x: number, y: number, z: number): { x: number; z: number } | null {
  for (const d of decor ?? []) {
    if (d.kind !== 'brazier') continue;
    const up = y - (d.y + BRAZIER.rim);
    if (up > -0.3 && up < 0.95 && Math.hypot(x - d.x, z - d.z) < BRAZIER.bowl - 0.08) return { x: d.x, z: d.z };
  }
  return null;
}

/** A table, as drawn (tavernModels.ts) and as solid: round, `r` across its middle, `h` high. Its collider is a square
 * a little inside the circle (`solid` to a side), so he does not catch on corners that are not drawn. */
export const TABLE = { r: 0.85, h: 0.74, solid: 0.66 } as const;
/** A stool, the same way. */
export const STOOL = { r: 0.24, h: 0.44, solid: 0.2 } as const;
/** The solids of a table at (x, y, z) and of a stool. */
export function tableSolids(x: number, y: number, z: number): Box[] {
  return [{ ...extent('plank', x - TABLE.solid, x + TABLE.solid, y, y + TABLE.h, z - TABLE.solid, z + TABLE.solid), hidden: true }];
}
/**
 * HOUSEHOLD JUNK, AT A RAT'S SIZE (2026-11-18, the owner: "making some new objects for the game"): what a big folk's
 * house leaves lying about, as tall to him as furniture. As drawn (junkModels.ts) and as solid (`junkSolids`): each a
 * box he can stand on, a little inside what is drawn. `w` across, `d` deep (along its yaw), `h` high.
 */
export type JunkKind = 'candle' | 'spool' | 'matchbox' | 'cheese' | 'sardines' | 'button' | 'pencil' | 'die' | 'pawn' | 'battery' | 'teacup' | 'spoon' | 'safetypin' | 'paperclip' | 'crayon' | 'marble';
export const JUNK: Record<JunkKind, { w: number; d: number; h: number }> = {
  /** A candle stub stood in a bottle cap. It lights the room round it. */
  candle: { w: 0.5, d: 0.5, h: 1.05 },
  /** A wooden cotton reel on its end, thread still on it. */
  spool: { w: 0.9, d: 0.9, h: 1.0 },
  /** A matchbox lying flat, its drawer half out and matches in it. */
  matchbox: { w: 1.5, d: 0.95, h: 0.5 },
  /** A wheel of cheese with a wedge cut out of it. */
  cheese: { w: 1.7, d: 1.7, h: 0.62 },
  /** A sardine tin, opened: its lid rolled back on its key. */
  sardines: { w: 1.7, d: 0.95, h: 0.32 },
  /** A coat button lying flat, four holes through it. (2026-11-19) */
  button: { w: 1.3, d: 1.3, h: 0.2 },
  /** A pencil stub lying on its side: sharpened at one end, a rubber in a tin band at the other. */
  pencil: { w: 2.4, d: 0.34, h: 0.34 },
  /** A die, an old ivory one, its corners worn round. */
  die: { w: 0.8, d: 0.8, h: 0.8 },
  /** A chess pawn, black, lost from a big folk's board. (2026-11-19) */
  pawn: { w: 0.8, d: 0.8, h: 1.4 },
  /** A battery lying on its side, its gold end and its little knob. */
  battery: { w: 2.0, d: 0.62, h: 0.62 },
  /** A teacup on its saucer, a blue band round it and tea in the bottom, still warm: it steams. */
  teacup: { w: 1.5, d: 1.5, h: 0.75 },
  /** A teaspoon lying on its back. */
  spoon: { w: 2.6, d: 0.55, h: 0.22 },
  /** A safety pin lying flat, closed. (2026-11-19) */
  safetypin: { w: 2.4, d: 0.5, h: 0.14 },
  /** A paperclip lying flat. */
  paperclip: { w: 2.0, d: 0.6, h: 0.1 },
  /** A wax crayon lying on its side, its paper wrapper torn at the tip. */
  crayon: { w: 2.2, d: 0.36, h: 0.36 },
  /** A glass marble with a twist of colour inside. */
  marble: { w: 0.7, d: 0.7, h: 0.7 },
};
/** The solid of a piece of junk at (x, y, z) turned `yaw` (a quarter turn or none: it is a box). */
export function junkSolids(what: JunkKind, x: number, y: number, z: number, yaw = 0): Box[] {
  const J = JUNK[what];
  const across = Math.abs(Math.round(Math.sin(yaw))) === 1;
  const hw = ((across ? J.d : J.w) / 2) * 0.9;
  const hd = ((across ? J.w : J.d) / 2) * 0.9;
  return [{ ...extent('plank', x - hw, x + hw, y, y + J.h, z - hd, z + hd), hidden: true }];
}
export function stoolSolids(x: number, y: number, z: number): Box[] {
  return [{ ...extent('plank', x - STOOL.solid, x + STOOL.solid, y, y + STOOL.h, z - STOOL.solid, z + STOOL.solid), hidden: true }];
}

/**
 * A glowing mushroom (decor `mushroom`). One as tall as he is or taller is SOLID: its stem stops him, and its cap is a
 * thing to stand on (a level adds `mushroomSolids` for each). Smaller ones he brushes through, like weeds.
 * Its cap is shaped by its own width, not by how tall the mushroom is: `deep` is how far under its crown the solid cap
 * begins and `top` how far under it the solid cap ends, as shares of the cap's radius; `capSolid` is how much of the
 * drawn cap's radius is solid (a square in a round cap); `stemSolid` how much of the drawn stem's.
 */
export const MUSHROOM = { solid: 1, deep: 0.32, top: 0.032, capSolid: 0.7, stemSolid: 0.92 } as const;
/**
 * How wide its cap is: its radius. Given (`cap`), or by its height and where it stands (so that no two in a stand are
 * quite alike).
 */
export function mushroomCap(x: number, z: number, size: number, cap?: number): number {
  return cap ?? size * (0.42 + 0.1 * Math.sin(x * 3.1 + z * 1.7));
}
/** How thick its stem is at the ground: its radius there. Given (`stem`), or by its height. */
export function mushroomStem(size: number, stem?: number): number {
  return stem ?? size * 0.12;
}
/** Where he stands on it: the top of its solid cap. */
export function mushroomTop(x: number, y: number, z: number, size: number, cap?: number): number {
  return y + size - mushroomCap(x, z, size, cap) * MUSHROOM.top;
}
/** An ice spike (decor `iceSpike`): what of it is solid. Its tall middle spike, as a post: half its width is `ICE_SPIKE.solid` of its height. */
export const ICE_SPIKE = { solid: 0.13, tall: 0.86 } as const;
export function iceSpikeSolids(x: number, y: number, z: number, size: number): Box[] {
  const s = size * ICE_SPIKE.solid;
  return [{ ...extent('stone', x - s, x + s, y, y + size * ICE_SPIKE.tall, z - s, z + s), hidden: true }];
}
/** A patch of slime on the ground: where it is, and between what heights its ground lies. */
export interface SlimeZone { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }
/**
 * Where there is slime to tread in: every runnel (the green strip down a pipe's bed). SLIME DOES SOMETHING: on foot it
 * holds him back (TUNING.slime). The shield rides over it.
 */
export function slimeZones(decor: readonly Decor[]): SlimeZone[] {
  const out: SlimeZone[] = [];
  for (const d of decor) if (d.kind === 'runnel') out.push({ x0: d.x - d.w / 2, x1: d.x + d.w / 2, z0: Math.min(d.z0, d.z1), z1: Math.max(d.z0, d.z1), y0: Math.min(d.y0, d.y1), y1: Math.max(d.y0, d.y1) });
  return out;
}
/**
 * A shelf mushroom (decor `bracket`): how thick it is where it joins the wall (of its depth), how much of its outer
 * corners is cut off (of its width and depth: it is drawn eight-cornered, and is solid to the square of that, so the
 * most he can stand on air is a sliver at two corners), and how far under its top its solid goes (of its thickness).
 */
export const BRACKET = { thick: 0.42, cut: 0.18, solid: 0.75 } as const;
export function bracketSolids(x: number, y: number, z: number, yaw: number, wide: number, deep: number): Box[] {
  const ox = Math.round(Math.sin(yaw));
  const oz = Math.round(Math.cos(yaw));
  const under = y - deep * BRACKET.thick * BRACKET.solid;
  const b = ox !== 0 ? extent('stone', Math.min(x, x + ox * deep), Math.max(x, x + ox * deep), under, y, z - wide, z + wide) : extent('stone', x - wide, x + wide, under, y, Math.min(z, z + oz * deep), Math.max(z, z + oz * deep));
  return [{ ...b, hidden: true }];
}
export function mushroomSolids(x: number, y: number, z: number, size: number, cap?: number, stem?: number): Box[] {
  if (size < MUSHROOM.solid) return [];
  const s = mushroomStem(size, stem) * MUSHROOM.stemSolid;
  const full = mushroomCap(x, z, size, cap);
  const r = full * MUSHROOM.capSolid;
  const under = y + size - full * MUSHROOM.deep;
  return [
    { ...extent('stone', x - s, x + s, y, under, z - s, z + s), hidden: true },
    { ...extent('stone', x - r, x + r, under, y + size - full * MUSHROOM.top, z - r, z + r), hidden: true },
  ];
}

/**
 * A couch, as drawn (couchModel.ts) and as solid (custom.ts). It faces +z with its middle on x = 0: `half` its
 * half-width; the back runs from `back` to `seatBack` and stands `backTop` high; the seat, `seat` high, runs from
 * `seatBack` to `front` between the arms; an arm runs from `armIn` to `armOut` either side and is `armTop` high;
 * the pillow lies on the seat.
 */
export const COUCH = {
  half: 1.3, back: -0.575, seatBack: -0.225, front: 0.55, seat: 0.72, backTop: 1.45,
  armIn: 0.975, armOut: 1.325, armTop: 1.0,
  pillow: { x0: 0.15, x1: 0.85, z0: -0.1, z1: 0.3, top: 0.84 },
} as const;

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
  /** `bare`: only its light, from that place: no post, no bulb (the glow of a fire, which has its own flames to be seen). */
  | { kind: 'light'; x: number; y: number; z: number; color: number; flash: number; bare?: boolean }
  /** A busted old speaker stack, facing `yaw` (0 faces south, +z). Its cone thumps to the beat. */
  | { kind: 'speaker'; x: number; y: number; z: number; yaw: number }
  /** A sagging old couch, facing `yaw`. */
  | { kind: 'couch'; x: number; y: number; z: number; yaw: number }
  /** A table (a cable drum on its side) with what is on it: see tavernModels.ts. `mugs`: [angle, how far out] each. */
  | { kind: 'table'; x: number; y: number; z: number; yaw: number; mugs?: Array<[number, number]>; candle?: boolean; cards?: boolean }
  /** A stool: a cork with a bottle cap on it. */
  | { kind: 'stool'; x: number; y: number; z: number }
  /** A row of thimble mugs standing on something at y, `count` of them along the row, which runs toward `yaw` + a quarter turn. */
  | { kind: 'mugs'; x: number; y: number; z: number; yaw: number; count: number; gap: number }
  /** A keg (a tin can on its side, tapped), its tap facing `yaw`. */
  | { kind: 'keg'; x: number; y: number; z: number; yaw: number }
  /** Household junk at a rat's size (junkModels.ts): what, where, which way. */
  | { kind: 'junk'; what: JunkKind; x: number; y: number; z: number; yaw: number }
  /**
   * Things to hit (world/strikeables.ts), solid, the room makes their solids: a LEVER the sword flips (its post at x, z
   * on a floor at y; `yaw` the way it throws over); a CRACKED WALL, a slab w by h by d standing on y, that `hits` sword
   * blows bring down; a CRACKED FLOOR, a slab w by d whose top is y, that only a plunge breaks.
   */
  | { kind: 'lever'; x: number; y: number; z: number; yaw: number }
  | { kind: 'crackwall'; x: number; y: number; z: number; w: number; h: number; d: number; hits?: number }
  | { kind: 'crackfloor'; x: number; y: number; z: number; w: number; d: number }
  /** A bell to strike with the sword (world/strikeables.ts), a music pad (world/musicFloor.ts): its note in semitones
   * from middle C; in an echo puzzle, which (`puzzle`) and its `slot` (-1 its start). y is the floor; yaw turns its frame. */
  | { kind: 'bell'; x: number; y: number; z: number; yaw: number; note: number; color: number; puzzle?: string; slot?: number }
  /** Hazards and helpers (world/hazards.ts): a conveyor belt (solid; y is its top), a pendulum blade (x, y, z its
   * pivot), spikes in the floor (y the floor), a fan in the floor (y the floor). */
  | HazardSpec
  /** A rug on the floor (drawn only): round (`r`), or a runner `w` by `d`. `colors`: its edge, its middle, its marks. */
  | { kind: 'rug'; x: number; y: number; z: number; yaw: number; r?: number; w?: number; d?: number; colors: [number, number, number] }
  /** A dance floor of lit tiles (drawn only), `nx` by `nz` of them, each `tile` across. */
  | { kind: 'dancefloor'; x: number; y: number; z: number; nx: number; nz: number; tile: number; colors: [number, number] }
  /** A string of little lights from (x, y, z) to (x1, y, z1), sagging `sag` in the middle. */
  | { kind: 'bulbs'; x: number; y: number; z: number; x1: number; z1: number; sag: number; count: number }
  /** A shelf of bottles on a wall, facing `yaw`, `width` long, its plank at y. */
  | { kind: 'bottles'; x: number; y: number; z: number; yaw: number; width: number }
  /** A dartboard on a wall, facing `yaw`, its middle at y. */
  | { kind: 'dartboard'; x: number; y: number; z: number; yaw: number }
  /** A runnel of slimy water lying on the ground down the line x, from (z0, y0) to (z1, y1), `w` wide. Only drawn. */
  | { kind: 'runnel'; x: number; z0: number; z1: number; y0: number; y1: number; w: number }
  /** Railway sleepers: planks `w` long laid across the line x every `gap`, from (z0, y0) to (z1, y1). Only drawn. */
  | { kind: 'sleepers'; x: number; z0: number; z1: number; y0: number; y1: number; w: number; gap: number }
  /** A weed growing out of a crack at (x, y, z), `size` tall. (What is solid of it is a box of its own.) */
  | { kind: 'weed'; x: number; y: number; z: number; size: number }
  /** The floor of a round room in the dark: lit in its middle, fading to nothing at its edge (r). Drawn only. */
  | { kind: 'arena'; x: number; y: number; z: number; r: number }
  /** Pairs of white eyes out in the dark round a place, between r0 and r1 from it and up to `high` over it: they blink. */
  | { kind: 'eyes'; x: number; y: number; z: number; r0: number; r1: number; high: number; count: number }
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
  /**
   * A planet hanging in the sky (the dream): a ball `r` across its middle, in bands of its two colours, lit of itself.
   * `ring`: a flat ring round it, this many times its radius out, in this colour; `tilt`: how far it leans.
   */
  /**
   * A bed of flowers: a patch of turf `w` by `d` lying on the floor at (x, y, z), flowers standing in it (their
   * colours loud, no two beds alike: `seed`). Drawn only: he walks through them, as through grass.
   */
  | { kind: 'flowers'; x: number; y: number; z: number; w: number; d: number; seed?: number }
  /** Butterflies about a place: `count` of them, keeping within `r` of (x, y, z), each its own colours. Drawn only. */
  | { kind: 'butterflies'; x: number; y: number; z: number; r: number; count: number }
  | { kind: 'planet'; x: number; y: number; z: number; r: number; color: number; band: number; ring?: { out: number; color: number }; tilt?: number }
  /**
   * A LIGHT RAIL (world/rails.ts): a ribbon of light through the air, through these points, that he can GRIND on his
   * shield. It curves as it likes. Not solid: he passes through it unless he is grinding it. What is drawn is the line
   * that is ridden.
   */
  | { kind: 'lightrail'; pts: Array<[number, number, number]> }
  /** A mushroom that glows in its colour: `size` is how tall it stands. It lights the room round it. Drawn only. */
  /** `cap`: its cap's radius, `stem`: its stem's radius at the ground (each by its height if not given: see MUSHROOM). */
  | { kind: 'mushroom'; x: number; y: number; z: number; size: number; color: number; cap?: number; stem?: number }
  /**
   * A shelf mushroom growing out of a wall, to stand on: (x, z) the middle of where it joins the wall's face, `y` its
   * TOP, `yaw` the way it grows out (a quarter turn each way only: it is solid, a box). `wide` each way along the
   * wall, `deep` out from it. It glows. Its solid is `bracketSolids`.
   */
  | { kind: 'bracket'; x: number; y: number; z: number; yaw: number; wide: number; deep: number; color: number }
  /**
   * A clump of glowing moss: on a wall, facing `yaw` (0 faces +z, a quarter turn faces +x), or lying on the ground
   * (`flat`). `size`: about half its width. `threads`: how many glowing threads hang from it. `light`: it lights the
   * place round it (only the nearest few lights are drawn, so not every clump should).
   */
  | { kind: 'moss'; x: number; y: number; z: number; yaw: number; size: number; color: number; flat?: boolean; threads?: number; light?: boolean }
  /** A stalactite: a spike of rock hanging from whatever is over (x, z), `length` long, `r` thick at its root. Keep its point out of his reach: it is only drawn. */
  | { kind: 'stalactite'; x: number; z: number; length: number; r: number; skin?: Skin }
  /**
   * An icicle: a spike of clear ice hanging from whatever is over (x, z), or from `top` if that is given (a pipe is
   * not a thing the room knows to hang from). Only drawn: keep its point out of his reach.
   */
  | { kind: 'icicle'; x: number; z: number; length: number; r: number; top?: number }
  /**
   * Ice standing up from the ground: one tall spike and two short ones leaning from its foot. `size` is how tall. It
   * is SOLID (a level adds `iceSpikeSolids` for it): its middle spike stops him.
   */
  | { kind: 'iceSpike'; x: number; y: number; z: number; size: number }
  /**
   * A jet of gas or steam: puffs leaving (x, y, z) one after another along `dir` (a direction, any length), growing
   * and thinning as they go, `length` far. `color` (default a cold white). `width`: how wide a puff is where the
   * jet ends (default a bit over half its length). `every` and `on`: it comes in bursts, one every `every` seconds,
   * each `on` seconds long (default: it never stops); `delay`: its first burst begins this long after the clock's
   * nought (so one jet can take up where another ends). `push`: it is a GUST: whoever is in its gas is carried
   * along with it, up to this speed (world/gusts.ts). Without `push` it is only drawn.
   */
  /**
   * A steam vent: an iron grille let into the floor at (x, y, z), `size` across, that blows a column of steam `height`
   * high for `on` seconds in every `every` (always, if `every` is not given). Scenery: it does not hurt or push.
   * (The owner, 2026-11-15, of the furnace: "animations of like steam coming up out of the ground or something we can
   * use in different places".)
   */
  | { kind: 'vent'; x: number; y: number; z: number; size?: number; height?: number; every?: number; on?: number; delay?: number }
  | { kind: 'jet'; x: number; y: number; z: number; dir: [number, number, number]; length: number; color?: number; width?: number; every?: number; on?: number; delay?: number; push?: number }
  /** One of the furnace's things (world/forge.ts): a furnace, bellows, a pouring ladle and its mould, ingots, cogs, a coal bunker, an anvil. What is solid of it is `forgeSolids`. */
  | ({ kind: 'forge' } & ForgeSpec)
  /** Roots hanging from (x, top, z) down towards `bottom`, swaying a little. */
  | { kind: 'roots'; x: number; z: number; top: number; bottom: number }
  /** The curved underside of an archway (the solid parts are boxes): spans x0..x1 along the wall (or z if `alongZ`). */
  | { kind: 'arch'; x0: number; x1: number; z: number; y: number; thick: number; alongZ?: boolean; skin?: Skin }
  /**
   * A painted board with writing on it (a test room's labels): up to three lines, the first the big one. On a wall
   * that faces `yaw`, its middle at x, y, z; `post` stands it on a post from the floor at `post` instead.
   */
  | { kind: 'sign'; x: number; y: number; z: number; yaw: number; w: number; h: number; lines: string[]; post?: number }
  /** A piano key on the floor (world/musicFloor.ts): its middle, its footprint, its note in semitones from middle C. */
  | { kind: 'floorkey'; x: number; y: number; z: number; w: number; d: number; note: number; black?: boolean }
  /** A pad of an echo puzzle (world/musicFloor.ts): `slot` -1 is the puzzle's start pad. */
  | { kind: 'chime'; x: number; y: number; z: number; r: number; note: number; color: number; puzzle: string; slot: number }
  /**
   * A ruler: a tick and a number at every unit. Standing (the default) it is on a wall that faces `yaw`, its zero at
   * x, y, z; `pole` stands it in the open, read from both sides. `flat` lays it on the floor, running from x, y, z
   * the way `yaw` points.
   */
  | { kind: 'ruler'; x: number; y: number; z: number; yaw: number; length: number; width: number; flat?: boolean; pole?: boolean };

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
  /** Opens when all of these creatures (by their order in the level's `enemies`) are beaten. */
  foes?: number[];
  /** Opens when all of these levers (world/strikeables.ts; by their order among the room's levers) are on at once. */
  levers?: number[];
  /** Opens when the echo puzzle of this name (world/musicFloor.ts) is solved. */
  echo?: string;
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
  /** How it moves (world/platforms.ts): glide (the default), circle, ride, sink, crumble or spring. */
  motion?: import('./platforms').PlatformMotion;
  /** sink: at most this deep. crumble: seconds it shakes before it goes (`hold`), seconds it is gone (`back`). */
  depth?: number;
  hold?: number;
  back?: number;
  /** spring: how high it throws him. */
  launch?: number;
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

/**
 * The ceiling of a level: it has one wherever it has walls round it (the Kingdom Below is under the ground; over the
 * walls there used to be nothing but the dark). It covers everything inside the outermost walls. It sits on top of
 * the walls, or higher where something inside stands so tall that he could bang his head: then the walls are carried
 * on up to it (`wallTop` is where the built walls stop and that extra band of wall begins). It is only drawn.
 */
export interface Ceiling {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  wallTop: number;
  /** The picture the outer walls wear (the ceiling and the band of wall under it wear it too). */
  skin?: Skin;
}
/** Clear air over the highest thing he can stand on: a double jump from it and his own height. */
export const CEILING_CLEAR = 5.9;
export function ceilingOf(solids: readonly Box[]): Ceiling | null {
  const walls = solids.filter((b) => b.kind === 'wall' && !b.hidden);
  if (!walls.length) return null;
  const x0 = Math.min(...walls.map((b) => b.x0));
  const x1 = Math.max(...walls.map((b) => b.x1));
  const z0 = Math.min(...walls.map((b) => b.z0));
  const z1 = Math.max(...walls.map((b) => b.z1));
  const outer = walls.filter((b) => b.x0 === x0 || b.x1 === x1 || b.z0 === z0 || b.z1 === z1);
  const outerTop = Math.max(...outer.map((b) => b.y1));
  let inside = -Infinity;
  for (const b of solids) if (!outer.includes(b)) inside = Math.max(inside, b.y1);
  // The picture most of the outer walls wear.
  const count = new Map<Skin | undefined, number>();
  for (const b of outer) count.set(b.skin, (count.get(b.skin) ?? 0) + (b.x1 - b.x0) * (b.z1 - b.z0));
  const skin = [...count.entries()].sort((a, c) => c[1] - a[1])[0][0];
  return { x0, x1, z0, z1, y: Math.max(outerTop, inside + CEILING_CLEAR), wallTop: Math.min(...outer.map((b) => b.y1)), skin };
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
