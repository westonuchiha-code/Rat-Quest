/**
 * THINGS TO HIT (2026-11-20; the owner: "different kinds of interactable things, breakable objects ... anything you
 * can put in the game for Fable to work with later"). Three kit parts, each a decor (world/layout.ts) that the room
 * draws and makes solid (world/chamber.ts), and that is struck here:
 *   lever       a handle on a post. The sword flips it (once a swing): over, it is ON; struck again, OFF. A gate can
 *               wait for levers (GateSpec.levers: all of them on at once).
 *   crackwall   a cracked slab of wall. It takes `hits` sword blows (a heavy blade counts two), cracking further at
 *               each, then falls to rubble and is not there. A plunge's blast does not touch it (it runs along the floor).
 *   crackfloor  a cracked slab of floor. Walked on, jumped on, it holds; a PLUNGE landing on it breaks it, and he goes
 *               through. Nothing else breaks it.
 * Plain logic: it takes the parts of the rat it needs (the player controller has them all) and says what happened.
 * main.ts calls `strikeThings` after the fight is resolved, plays what it says, and has the room show it.
 */

export type StrikeKind = 'lever' | 'crackwall' | 'crackfloor';

export interface Strikeable {
  kind: StrikeKind;
  /** Its middle across, its bottom, its middle along; its size. */
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  /** A lever: over (on). */
  on: boolean;
  /** A cracked wall: blows it takes, and blows taken. */
  hits: number;
  taken: number;
  /** Broken, and not there. */
  gone: boolean;
  /** The swing that last struck it, so one swing strikes once. */
  lastSwing: number;
  /** When it was last struck (seconds of world clock, for the shudder), set by whoever shows it. */
  struckAt: number;
}

export type StrikeEvent =
  | { kind: 'flip'; index: number; on: boolean }
  | { kind: 'crack'; index: number; left: number }
  | { kind: 'break'; index: number };

/** The numbers: a cracked wall's blows, what a heavy blade counts for, the size of a lever's post. */
export const STRIKE = { wallHits: 3, heavyBlade: 2, heavyCounts: 2, lever: { w: 0.5, h: 1.3, d: 0.5 } } as const;

/** What of the rat a blow needs (the player controller is one). */
export interface Striker {
  position: { x: number; y: number; z: number };
  facing: number;
  attackActive: boolean;
  swingId: number;
  attackClip: { arc: number; reach: number };
  plungeImpact: boolean;
  grounded: boolean;
  gear: { damage: number };
}

export function newStrikeable(kind: StrikeKind, x: number, y: number, z: number, w: number, h: number, d: number, hits: number = STRIKE.wallHits): Strikeable {
  return { kind, x, y, z, w, h, d, on: false, hits: kind === 'crackwall' ? Math.max(1, hits) : 1, taken: 0, gone: false, lastSwing: -1, struckAt: -1e9 };
}

const angleBetween = (a: number, b: number): number => {
  let d = Math.abs(a - b) % (Math.PI * 2);
  if (d > Math.PI) d = Math.PI * 2 - d;
  return d;
};

/** Does this swing reach the box? (As a crate is struck: in front of him, within reach of its nearest side, at his height.) */
function swordReaches(t: Strikeable, p: Striker): boolean {
  if (!p.attackActive || t.lastSwing === p.swingId) return false;
  const pos = p.position;
  if (pos.y < t.y - 0.5 || pos.y > t.y + t.h + 0.5 - 0.15) return false;
  const nx = Math.max(t.x - t.w / 2, Math.min(t.x + t.w / 2, pos.x));
  const nz = Math.max(t.z - t.d / 2, Math.min(t.z + t.d / 2, pos.z));
  const dist = Math.hypot(nx - pos.x, nz - pos.z);
  if (dist > p.attackClip.reach) return false;
  return dist < 0.25 || angleBetween(Math.atan2(nx - pos.x, nz - pos.z), p.facing) <= p.attackClip.arc;
}

/** One step: what his blows did to the things in the room. */
export function strikeThings(things: Strikeable[], p: Striker): StrikeEvent[] {
  const out: StrikeEvent[] = [];
  things.forEach((t, index) => {
    if (t.gone) return;
    if (t.kind === 'crackfloor') {
      // Only a plunge landing on it, on its top.
      const pos = p.position;
      const on = Math.abs(pos.x - t.x) <= t.w / 2 + 0.1 && Math.abs(pos.z - t.z) <= t.d / 2 + 0.1 && Math.abs(pos.y - (t.y + t.h)) < 0.3;
      if (p.plungeImpact && on) {
        t.gone = true;
        out.push({ kind: 'break', index });
      }
      return;
    }
    if (!swordReaches(t, p)) return;
    t.lastSwing = p.swingId;
    if (t.kind === 'lever') {
      t.on = !t.on;
      out.push({ kind: 'flip', index, on: t.on });
      return;
    }
    t.taken += p.gear.damage >= STRIKE.heavyBlade ? STRIKE.heavyCounts : 1;
    if (t.taken >= t.hits) {
      t.gone = true;
      out.push({ kind: 'break', index });
    } else out.push({ kind: 'crack', index, left: t.hits - t.taken });
  });
  return out;
}

/** Are all these levers (by their order among the room's levers: the first lever is 0) on? */
export function leversOn(things: readonly Strikeable[], which: readonly number[]): boolean {
  const levers = things.filter((t) => t.kind === 'lever');
  return which.length > 0 && which.every((i) => !!levers[i]?.on);
}
