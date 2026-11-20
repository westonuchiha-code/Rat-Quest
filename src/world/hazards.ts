/**
 * HAZARDS AND HELPERS (2026-11-20; the owner: "making objects, different types of moving platforms, different kinds
 * of interactable things ... anything you can put in the game for Fable to work with later"). Four kit parts, each a
 * decor (world/layout.ts) that the room draws (world/chamber.ts), and that acts on him here:
 *   belt     a conveyor: a raised strip whose top carries whatever stands on it along `yaw` at `speed`. Solid.
 *   blade    a pendulum blade on an arm from a pivot overhead (x, y, z), swinging side to side across `yaw` (the way
 *            past it). It hurts on touch (a shield does
 *            not turn it; a roll goes through it, as through any blow). Not solid.
 *   spikes   a plate of spikes in the floor that come up for `up` seconds of every `period` (a moment's warning
 *            first, poking up a little), and hurt whoever stands in them. A roll does not help. Not solid.
 *   fan      a fan in the floor blowing up: in its column he is lifted, to hover near its top. It can run all the
 *            time, or be on for `on` seconds and off for `off`.
 *   flamejet a FLAME JET: a nozzle in a wall (or the floor, pointing up) that shoots flame for `on` seconds of every
 *            `period`, a pilot flame showing first. It burns as fire does (the Ember Helm keeps it off; a roll does not).
 * Everything here goes by the room's clock (world time), so each frame is the same however it is reached: what the
 * room draws and what hurts him agree.
 * main.ts: `carry` and `lift` before his update (as a gust is), `hurt` after the fight is resolved (as fire is).
 */

export interface BeltSpec { kind: 'belt'; x: number; y: number; z: number; w: number; d: number; yaw: number; speed: number }
export interface BladeSpec { kind: 'blade'; x: number; y: number; z: number; length: number; yaw: number; swing: number; period: number; phase: number }
export interface SpikeSpec { kind: 'spikes'; x: number; y: number; z: number; w: number; d: number; period: number; up: number; phase: number }
export interface FanSpec { kind: 'fan'; x: number; y: number; z: number; r: number; height: number; on?: number; off?: number; phase?: number }
/** A flame jet: a nozzle at x, y, z that shoots flame `length` along `yaw` (out of a wall), or straight up if `up`,
 * for `on` seconds of every `period`, after a moment's pilot flame. */
export interface JetSpec { kind: 'flamejet'; x: number; y: number; z: number; yaw: number; up?: boolean; length: number; period: number; on: number; phase: number }
export type HazardSpec = BeltSpec | BladeSpec | SpikeSpec | FanSpec | JetSpec;

/** The numbers: a blade's reach round its edge, the spikes' warning and height, a fan's lift. */
export const HAZARD = {
  blade: { radius: 0.35, half: 0.6, damage: 1 },
  spikes: { warn: 0.5, height: 0.55, damage: 1 },
  fan: { rise: 5.5, accel: 40, top: 0.85, spinUp: 0.6 },
  belt: { speed: 3 },
  jet: { warn: 0.6, radius: 0.45, grow: 0.15, damage: 1 },
} as const;

/** How far out a jet's flame reaches now, 0..1 of its length (it grows out fast, and dies back as fast); and whether
 * its pilot is showing (the warning). */
export function jetFlame(j: JetSpec, time: number): { reach: number; pilot: boolean } {
  const t = (((time / j.period + j.phase) % 1) + 1) % 1 * j.period;
  const start = j.period - j.on;
  if (t >= start) {
    const g = HAZARD.jet.grow;
    return { reach: Math.min(1, (t - start) / g, (j.period - t) / g), pilot: false };
  }
  return { reach: 0, pilot: t >= start - HAZARD.jet.warn };
}
/** Which way a jet points: a unit vector. */
export const jetDir = (j: JetSpec): [number, number, number] => (j.up ? [0, 1, 0] : [Math.sin(j.yaw), 0, Math.cos(j.yaw)]);

/** What of him a hazard needs (the player controller has it all). */
export interface Body {
  position: { x: number; y: number; z: number };
  prevPosition: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  grounded: boolean;
  dead: boolean;
}

const TAU = Math.PI * 2;
const frac = (v: number): number => v - Math.floor(v);

/** A blade's swing now, in radians from straight down (side to side across its `yaw`). */
export function bladeAngle(b: BladeSpec, time: number): number {
  return b.swing * Math.sin(TAU * (time / b.period + b.phase));
}
/** Where a blade's edge is now (the middle of the blade, at the arm's end). */
export function bladeAt(b: BladeSpec, time: number): { x: number; y: number; z: number } {
  const a = bladeAngle(b, time);
  // It swings in the plane across `yaw`: sideways is (cos yaw, -sin yaw) on the ground.
  const s = Math.sin(a) * b.length;
  return { x: b.x + Math.cos(b.yaw) * s, y: b.y - Math.cos(a) * b.length, z: b.z - Math.sin(b.yaw) * s };
}
/** How far up the spikes are now (0 down .. 1 up; a warning pokes them a quarter up first). */
export function spikesUp(s: SpikeSpec, time: number): number {
  const t = frac(time / s.period + s.phase) * s.period;
  const start = s.period - s.up;
  if (t >= start) return 1;
  if (t >= start - HAZARD.spikes.warn) return 0.25;
  return 0;
}
/** How hard a fan is blowing now (0..1: it spins up and down over a moment). */
export function fanPower(f: FanSpec, time: number): number {
  if (!f.on || !f.off) return 1;
  const cycle = f.on + f.off;
  const t = frac(time / cycle + (f.phase ?? 0)) * cycle;
  const up = HAZARD.fan.spinUp;
  if (t < f.on) return Math.min(1, t / up);
  return Math.max(0, 1 - (t - f.on) / up);
}

/** How far past a belt's edge it still carries him: more than his radius, so he goes off its end. */
const BELT_EDGE = 0.5;
const onTop = (x: number, z: number, y: number, top: number, cx: number, cz: number, w: number, d: number): boolean =>
  Math.abs(y - top) < 0.12 && Math.abs(x - cx) <= w / 2 && Math.abs(z - cz) <= d / 2;

/** A belt under his feet carries him along (moves him, as a moving platform does). What it carried him by, or null. */
export function carry(hazards: readonly HazardSpec[], body: Body, dt: number): { x: number; z: number } | null {
  if (body.dead) return null;
  const p = body.position;
  for (const h of hazards) {
    // (Counted a little past its edges, so that it carries him right off its end rather than leaving him teetering
    // on the edge of its last slat.)
    if (h.kind !== 'belt' || !onTop(p.x, p.z, p.y, h.y, h.x, h.z, h.w + BELT_EDGE * 2, h.d + BELT_EDGE * 2)) continue;
    const dx = Math.sin(h.yaw) * h.speed * dt;
    const dz = Math.cos(h.yaw) * h.speed * dt;
    p.x += dx; p.z += dz;
    body.prevPosition.x += dx; body.prevPosition.z += dz;
    return { x: dx, z: dz };
  }
  return null;
}

/** A fan's column lifts him: up to `rise`, less near its top, so he hovers there. Which fan, or null. */
export function lift(hazards: readonly HazardSpec[], body: Body, dt: number, time: number): FanSpec | null {
  if (body.dead) return null;
  const p = body.position;
  for (const h of hazards) {
    if (h.kind !== 'fan' || Math.hypot(p.x - h.x, p.z - h.z) > h.r || p.y < h.y - 0.1 || p.y > h.y + h.height) continue;
    const power = fanPower(h, time);
    if (power <= 0) continue;
    // Full lift low down, fading to nothing at the column's top.
    const k = (p.y - h.y) / h.height;
    const fade = k < HAZARD.fan.top ? 1 : Math.max(0, (1 - k) / (1 - HAZARD.fan.top));
    const want = HAZARD.fan.rise * power * (fade * 2 - 1);
    if (body.velocity.y < want) body.velocity.y = Math.min(want, body.velocity.y + HAZARD.fan.accel * power * dt);
    // (Off the ground: the floor no longer holds him once the air has him.)
    if (body.grounded && body.velocity.y > 0) {
      p.y += 0.02;
      body.prevPosition.y += 0.02;
    }
    return h;
  }
  return null;
}

/** Does a hazard touch a column (feet at x, y, z; round, `radius`; `height` tall) now? Where from, if it does. */
function touching(h: HazardSpec, x: number, y: number, z: number, radius: number, height: number, time: number): { x: number; z: number } | null {
  if (h.kind === 'blade') {
    const e = bladeAt(h, time);
    // The blade is a crescent in the plane it swings in: a short bar, `half` each way along the swing, thin across
    // it (along `yaw`, the way past it).
    const sx = Math.cos(h.yaw);
    const sz = -Math.sin(h.yaw);
    const along = (x - e.x) * sx + (z - e.z) * sz;
    const t = Math.max(-HAZARD.blade.half, Math.min(HAZARD.blade.half, along));
    const nx = e.x + sx * t;
    const nz = e.z + sz * t;
    const flat = Math.hypot(x - nx, z - nz);
    const vy = e.y < y ? y - e.y : e.y > y + height ? e.y - y - height : 0;
    return Math.hypot(flat, vy) < radius + HAZARD.blade.radius ? { x: nx, z: nz } : null;
  }
  if (h.kind === 'flamejet') {
    const reach = jetFlame(h, time).reach * h.length;
    if (reach <= 0.05) return null;
    // The flame is a rod from the nozzle, `reach` long, HAZARD.jet.radius round; he is a column (its nearest point).
    const [ux, uy, uz] = jetDir(h);
    let best = Infinity;
    let at = { x: h.x, z: h.z };
    for (let k = 0; k <= 8; k++) {
      const f = (k / 8) * reach;
      const px = h.x + ux * f;
      const py = h.y + uy * f;
      const pz = h.z + uz * f;
      const vy = py < y ? y - py : py > y + height ? py - y - height : 0;
      const dd = Math.hypot(Math.hypot(x - px, z - pz), vy);
      if (dd < best) {
        best = dd;
        at = { x: px, z: pz };
      }
    }
    return best < radius + HAZARD.jet.radius ? at : null;
  }
  if (h.kind === 'spikes') {
    if (spikesUp(h, time) < 1) return null;
    return Math.abs(x - h.x) <= h.w / 2 && Math.abs(z - h.z) <= h.d / 2 && y >= h.y - 0.1 && y < h.y + HAZARD.spikes.height ? { x, z } : null;
  }
  return null;
}

/** What touches him now and would hurt him: a blade (from where it is) or spikes (from under him). */
export function hurt(hazards: readonly HazardSpec[], body: Body, time: number, radius: number, height: number): { kind: 'blade' | 'spikes' | 'flamejet'; x: number; z: number } | null {
  if (body.dead) return null;
  const p = body.position;
  for (const h of hazards) {
    if (h.kind !== 'blade' && h.kind !== 'spikes' && h.kind !== 'flamejet') continue;
    const at = touching(h, p.x, p.y, p.z, radius, height, time);
    if (at) return { kind: h.kind, ...at };
  }
  return null;
}

/**
 * CREATURES (2026-11-20). What a creature needs to meet the hazards: where it is, how big, whether it flies, and the
 * two things the game already does to one (a shove that keeps it out of walls, a blow).
 */
export interface Creature {
  x: number;
  y: number;
  z: number;
  readonly radius: number;
  readonly alive: boolean;
  readonly kind: string;
  /** Set for the creatures that fly (the game's own test of open air). */
  canFly?: unknown;
  nudge(dx: number, dz: number): void;
  takeHit(damage: number, fromX: number, fromZ: number, how?: 'thrown'): boolean;
}
/** For creatures: a blow at most once in `cooldown` seconds from any hazard; how hard; how fast a fan blows one off it. */
export const FOE_HAZARD = { cooldown: 0.8, damage: 1, fanPush: 4 } as const;
const flies = (c: Creature): boolean => !!c.canFly || c.kind === 'bat' || c.kind === 'hornet' || c.kind === 'firefly';

/**
 * The hazards acting on creatures, as on him: a belt carries one that stands on it; a blade or spikes strike one
 * (as a thrown thing does: a shell or a shield does not turn it, as his does not); a fan does not lift one (a
 * creature keeps to its floor) but blows one that walks onto it off again. A flier only meets the blades.
 * It remembers when each creature was last struck, so a blade that stays touching strikes once.
 */
export class HazardFoes {
  private readonly struck = new WeakMap<object, number>();
  act(hazards: readonly HazardSpec[], foes: readonly Creature[], dt: number, time: number): Array<{ foe: Creature; kind: 'blade' | 'spikes' | 'flamejet'; killed: boolean }> {
    const out: Array<{ foe: Creature; kind: 'blade' | 'spikes' | 'flamejet'; killed: boolean }> = [];
    for (const c of foes) {
      if (!c.alive) continue;
      const flier = flies(c);
      for (const h of hazards) {
        if (h.kind === 'belt') {
          if (flier || Math.abs(c.x - h.x) > h.w / 2 || Math.abs(c.z - h.z) > h.d / 2 || c.y < h.y - 0.5 || c.y > h.y + 0.15) continue;
          c.nudge(Math.sin(h.yaw) * h.speed * dt, Math.cos(h.yaw) * h.speed * dt);
        } else if (h.kind === 'fan') {
          const away = Math.hypot(c.x - h.x, c.z - h.z);
          if (flier || away > h.r + c.radius || c.y > h.y + 1) continue;
          const power = fanPower(h, time);
          if (power <= 0) continue;
          const ux = away > 1e-6 ? (c.x - h.x) / away : 1;
          const uz = away > 1e-6 ? (c.z - h.z) / away : 0;
          c.nudge(ux * FOE_HAZARD.fanPush * power * dt, uz * FOE_HAZARD.fanPush * power * dt);
        } else {
          if (h.kind === 'spikes' && flier) continue;
          // (A firefly is a creature of fire: a flame jet does not burn it.)
          if (h.kind === 'flamejet' && c.kind === 'firefly') continue;
          if (time - (this.struck.get(c) ?? -1e9) < FOE_HAZARD.cooldown) continue;
          const at = touching(h, c.x, c.y, c.z, c.radius, Math.max(0.6, c.radius * 1.6), time);
          if (!at) continue;
          this.struck.set(c, time);
          // (From where the blade or flame is; spikes come from under it: from just beside its middle.)
          const fx = h.kind === 'spikes' ? c.x + 0.01 : at.x;
          const fz = h.kind === 'spikes' ? c.z : at.z;
          const killed = c.takeHit(FOE_HAZARD.damage, fx, fz, 'thrown');
          out.push({ foe: c, kind: h.kind, killed: killed || !c.alive });
          if (!c.alive) break;
        }
      }
    }
    return out;
  }
}

/**
 * What is heard between two moments, from where he is: a blade swishing through the bottom of its swing, spikes
 * shooting up. Each with how loud (fading with distance, nothing past `HEARD`).
 */
export const HEARD = 12;
export function sounds(hazards: readonly HazardSpec[], before: number, now: number, at: { x: number; z: number }): Array<{ kind: 'swish' | 'spikes' | 'jet'; vol: number }> {
  const out: Array<{ kind: 'swish' | 'spikes' | 'jet'; vol: number }> = [];
  if (now <= before) return out;
  for (const h of hazards) {
    const far = Math.hypot(h.x - at.x, h.z - at.z);
    if (far > HEARD) continue;
    const vol = 1 - far / HEARD;
    if (h.kind === 'blade' && Math.sign(bladeAngle(h, before)) !== Math.sign(bladeAngle(h, now)) && bladeAngle(h, now) !== 0) out.push({ kind: 'swish', vol });
    else if (h.kind === 'spikes' && spikesUp(h, before) < 1 && spikesUp(h, now) >= 1) out.push({ kind: 'spikes', vol });
    else if (h.kind === 'flamejet' && jetFlame(h, before).reach <= 0 && jetFlame(h, now).reach > 0) out.push({ kind: 'jet', vol });
  }
  return out;
}
