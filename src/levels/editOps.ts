/**
 * What the level editor does to a level, kept apart from its screen so it can be tested without one: undo and redo,
 * copy and paste, flipping, stretching a piece by its edges, counting what is in a level, and measuring a jump.
 */
import { TUNING } from '../data/tuning';
import { BOX_TYPES, type CustomLevel, type Piece, type PieceType } from './custom';
import { maxClimb } from './reach';

// ---- Undo and redo ----

/** Past and future versions of a level, as text. A new change clears the future. */
export class History {
  private past: string[] = [];
  private future: string[] = [];
  constructor(private readonly limit = 80) {}

  /** Records the level as it was just before a change. */
  push(before: string): void {
    if (this.past[this.past.length - 1] === before) return;
    this.past.push(before);
    if (this.past.length > this.limit) this.past.shift();
    this.future.length = 0;
  }
  /** Steps back: give it the level as it is now, get the one before (or null when there is none). */
  undo(now: string): string | null {
    const s = this.past.pop();
    if (s === undefined) return null;
    this.future.push(now);
    return s;
  }
  redo(now: string): string | null {
    const s = this.future.pop();
    if (s === undefined) return null;
    this.past.push(now);
    return s;
  }
  get canUndo(): boolean {
    return this.past.length > 0;
  }
  get canRedo(): boolean {
    return this.future.length > 0;
  }
  get depth(): number {
    return this.past.length;
  }
  clear(): void {
    this.past.length = 0;
    this.future.length = 0;
  }
}

// ---- Shapes ----

/** Pieces that are one spot on the map (a crate, an enemy, a lamp), not a rectangle. Given by the editor. */
export type IsSingle = (t: PieceType) => boolean;

export function pieceBounds(p: Piece): { x0: number; x1: number; z0: number; z1: number } {
  return { x0: Math.min(p.x0, p.x1), x1: Math.max(p.x0, p.x1), z0: Math.min(p.z0, p.z1), z1: Math.max(p.z0, p.z1) };
}

/** The box round several pieces. */
export function boundsOf(ps: Piece[]): { x0: number; x1: number; z0: number; z1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const p of ps) {
    const b = pieceBounds(p);
    x0 = Math.min(x0, b.x0);
    x1 = Math.max(x1, b.x1);
    z0 = Math.min(z0, b.z0);
    z1 = Math.max(z1, b.z1);
  }
  return ps.length ? { x0, x1, z0, z1 } : { x0: 0, x1: 0, z0: 0, z1: 0 };
}

const FLIP_X = { e: 'w', w: 'e', n: 'n', s: 's' } as const;
const FLIP_Z = { n: 's', s: 'n', e: 'e', w: 'w' } as const;
/**
 * Mirrors pieces about the middle of the box round them: 'x' swaps left and right, 'z' swaps north and south.
 * Whatever faces along the flipped way is turned round with it.
 */
export function flipPieces(ps: Piece[], axis: 'x' | 'z'): void {
  const b = boundsOf(ps);
  const mid = axis === 'x' ? b.x0 + b.x1 : b.z0 + b.z1;
  for (const p of ps) {
    if (axis === 'x') {
      const a = mid - p.x0;
      const c = mid - p.x1;
      p.x0 = Math.min(a, c);
      p.x1 = Math.max(a, c);
      if (p.dir) p.dir = FLIP_X[p.dir];
      if (p.props?.move === 'e' || p.props?.move === 'w') p.props.move = FLIP_X[p.props.move];
    } else {
      const a = mid - p.z0;
      const c = mid - p.z1;
      p.z0 = Math.min(a, c);
      p.z1 = Math.max(a, c);
      if (p.dir) p.dir = FLIP_Z[p.dir];
      if (p.props?.move === 'n' || p.props?.move === 's') p.props.move = FLIP_Z[p.props.move];
    }
  }
}

/** Copies of pieces, moved so the middle of them all is at (x, z), on whole squares. */
export function pasteAt(clip: Piece[], x: number, z: number): Piece[] {
  const b = boundsOf(clip);
  const dx = Math.round(x - (b.x0 + b.x1) / 2);
  const dz = Math.round(z - (b.z0 + b.z1) / 2);
  return clip.map((p) => {
    const c = JSON.parse(JSON.stringify(p)) as Piece;
    c.x0 += dx;
    c.x1 += dx;
    c.z0 += dz;
    c.z1 += dz;
    return c;
  });
}

/** An edge or a corner of a rectangle piece, to drag. */
export type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Where a handle sits on a piece. */
export function handlePoint(p: Piece, h: Handle): { x: number; z: number } {
  const b = pieceBounds(p);
  return {
    x: h.includes('w') ? b.x0 : h.includes('e') ? b.x1 : (b.x0 + b.x1) / 2,
    z: h.includes('n') ? b.z0 : h.includes('s') ? b.z1 : (b.z0 + b.z1) / 2,
  };
}

/** The handle of `p` within `tol` of (x, z), corners before edges; null if none. */
export function handleAt(p: Piece, x: number, z: number, tol: number): Handle | null {
  let best: Handle | null = null;
  let bestD = tol;
  for (const h of HANDLES) {
    const at = handlePoint(p, h);
    const d = Math.hypot(at.x - x, at.z - z) - (h.length === 2 ? 0.001 : 0);
    if (d <= bestD) {
      bestD = d;
      best = h;
    }
  }
  return best;
}

/** `orig` stretched by dragging handle `h` to (x, z): never thinner than `min` either way. */
export function resizeBy(orig: Piece, h: Handle, x: number, z: number, min = 1): { x0: number; x1: number; z0: number; z1: number } {
  const b = pieceBounds(orig);
  if (h.includes('w')) b.x0 = Math.min(x, b.x1 - min);
  if (h.includes('e')) b.x1 = Math.max(x, b.x0 + min);
  if (h.includes('n')) b.z0 = Math.min(z, b.z1 - min);
  if (h.includes('s')) b.z1 = Math.max(z, b.z0 + min);
  return b;
}

// ---- What is in a level ----

/** Ground he can stand on (not walls or pillars). */
const isGround = (t: PieceType): boolean => (BOX_TYPES.includes(t) && t !== 'wall' && t !== 'pillar') || t === 'bridge' || t === 'stairs' || t === 'lift';

/** How high the ground is at (x, z): the top of the highest floor, slab, bridge or stair there. Null over nothing. */
export function surfaceAt(level: CustomLevel, x: number, z: number): number | null {
  let y: number | null = null;
  for (const p of level.pieces) {
    if (!isGround(p.t)) continue;
    const b = pieceBounds(p);
    if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue;
    if (y === null || p.top > y) y = p.top;
  }
  return y;
}

export interface LevelStats {
  pieces: number;
  crumbs: number;
  caps: number;
  relics: number;
  wedges: number;
  enemies: number;
  breakables: number;
  /** Floor area, in squares. */
  ground: number;
}

/** A count of what the level holds (collectibles hidden in crates included). */
export function levelStats(level: CustomLevel, enemies: PieceType[]): LevelStats {
  const s: LevelStats = { pieces: level.pieces.length, crumbs: 0, caps: 0, relics: 0, wedges: 0, enemies: 0, breakables: 0, ground: 0 };
  for (const p of level.pieces) {
    if (p.t === 'crumb' || p.props?.item === 'crumb') s.crumbs++;
    if (p.t === 'cap' || p.props?.item === 'cap') s.caps++;
    if (p.t === 'relic' || p.props?.item === 'relic') s.relics++;
    if (p.t === 'wedge') s.wedges++;
    if (enemies.includes(p.t)) s.enemies++;
    if (p.t === 'crate' || p.t === 'barrel' || p.t === 'pipe') s.breakables++;
    if (isGround(p.t) && p.t !== 'stairs' && p.t !== 'lift') {
      const b = pieceBounds(p);
      s.ground += (b.x1 - b.x0) * (b.z1 - b.z0);
    }
  }
  return s;
}

// ---- Measuring a jump ----

export interface JumpReach {
  /** How far each kind of jump carries him to ground `rise` higher (negative: lower); 0 when it cannot get that high. */
  jump: number;
  double: number;
  long: number;
}

/** How far a running jump, a double jump and a long jump each carry him across to ground `rise` higher. A fair jump, not a perfect one. */
export function jumpReaches(rise: number): JumpReach {
  const g = TUNING.physics.gravity;
  const gf = g * TUNING.physics.fallGravityMultiplier;
  const v = TUNING.jump.velocity;
  const v2 = TUNING.jump.doubleVelocity;
  const run = TUNING.move.run;
  const fair = 0.92;
  const h1 = (v * v) / (2 * g);
  const h2 = h1 + (v2 * v2) / (2 * g);
  const lv = TUNING.moves.longJumpUp;
  const lh = (lv * lv) / (2 * g);
  const coyote = TUNING.jump.coyoteTime;
  return {
    jump: rise <= h1 ? run * (v / g + Math.sqrt((2 * (h1 - rise)) / gf) + coyote) * fair : 0,
    double: TUNING.jump.airJumps > 0 && rise <= h2 ? run * (v / g + v2 / g + Math.sqrt((2 * (h2 - rise)) / gf) + coyote) * fair : 0,
    long: rise <= lh ? TUNING.moves.longJumpSpeed * (lv / g + Math.sqrt((2 * (lh - rise)) / gf)) * fair : 0,
  };
}

export interface Measure {
  /** Across the floor, and up (negative: down). */
  dist: number;
  rise: number;
  /** Which jumps make it across a gap that wide. */
  jump: boolean;
  double: boolean;
  long: boolean;
  /** Too high for any jump, but he can catch the edge and pull himself up (if the gap itself can be crossed). */
  grab: boolean;
  /** The plain answer. */
  verdict: 'walk' | 'jump' | 'double jump' | 'long jump' | 'double jump and grab' | 'too far' | 'too high';
}

/** From one spot to another: how far, how much higher, and what it takes to get there. */
export function measureJump(from: { x: number; z: number; y: number }, to: { x: number; z: number; y: number }): Measure {
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  const rise = to.y - from.y;
  const r = jumpReaches(rise);
  const jump = r.jump >= dist;
  const double = r.double >= dist;
  const long = r.long >= dist;
  // Catching a ledge adds his reach to the height of a double jump; the jump still has to carry him to the edge.
  const g = TUNING.physics.gravity;
  const top = (TUNING.jump.velocity ** 2 + (TUNING.jump.airJumps > 0 ? TUNING.jump.doubleVelocity ** 2 : 0)) / (2 * g);
  const grab = !jump && !double && rise <= maxClimb() && rise > 0 && jumpReaches(Math.min(rise, top - 0.2)).double >= dist;
  let verdict: Measure['verdict'];
  if (Math.abs(rise) <= 0.35 && dist === 0) verdict = 'walk';
  else if (jump) verdict = 'jump';
  else if (long && r.long >= r.double) verdict = 'long jump';
  else if (double) verdict = 'double jump';
  else if (long) verdict = 'long jump';
  else if (grab) verdict = 'double jump and grab';
  else verdict = rise > maxClimb() ? 'too high' : 'too far';
  return { dist, rise, jump, double, long, grab, verdict };
}
