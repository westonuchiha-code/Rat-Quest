/**
 * The rules of placing and picking pieces in the 3D editor, kept apart from the screen so they can be tested.
 * Positions follow the 2D builder: whole-number grid; a box piece covers x0..x1 and z0..z1 (x1 = x0 + width).
 */
import type { Piece, PieceType } from './custom';

const SINGLES = new Set<PieceType>(['crate', 'barrel', 'crumb', 'cap', 'relic', 'roach', 'toad', 'beetle', 'bat', 'guard', 'mantis', 'stag', 'hornet', 'brood', 'wyrm', 'npc', 'pipe', 'fall', 'mark', 'plate', 'lamp', 'chain', 'window', 'slime', 'web', 'brazier', 'speaker', 'couch', 'light', 'banner', 'torch', 'gauge', 'crystal', 'roots', 'spawn', 'exit', 'wedge']);
const FACING = new Set<PieceType>(['river', 'fall', 'pipe', 'stairs', 'window', 'slime', 'web', 'banner', 'torch', 'gauge', 'guard', 'mantis', 'stag', 'hornet', 'brood', 'wyrm']);
const POOLS = new Set<PieceType>(['water', 'river', 'lava']);

export function isSingle(t: PieceType): boolean {
  return SINGLES.has(t);
}

/** How high above the surface a new piece starts, before he changes it. */
export function defaultRaise(t: PieceType): number {
  if (t === 'platform' || t === 'plank' || t === 'stone') return 1;
  if (t === 'pillar' || t === 'wall' || t === 'stairs') return 3;
  if (t === 'lamp' || t === 'chain') return 3;
  if (t === 'light') return 2.5;
  return 0;
}

export interface PlaceOpts {
  /** Footprint in grid cells (box pieces only). */
  w: number;
  d: number;
  /** Height above the surface he is looking at. */
  raise: number;
  dir: 'n' | 'e' | 's' | 'w';
}

/** The piece to add when he places tool `t` on the surface point (x, y, z). */
export function makePiece(t: PieceType, x: number, y: number, z: number, o: PlaceOpts): Piece {
  const surf = Math.round(y * 10) / 10;
  const top = Math.round((surf + o.raise) * 10) / 10;
  let p: Piece;
  if (isSingle(t)) {
    const sx = Math.round(x);
    const sz = Math.round(z);
    p = { t, x0: sx, z0: sz, x1: sx, z1: sz, top };
  } else {
    const w = Math.max(1, Math.round(o.w));
    const d = Math.max(1, Math.round(o.d));
    const x0 = Math.round(x - w / 2);
    const z0 = Math.round(z - d / 2);
    p = { t, x0, z0, x1: x0 + w, z1: z0 + d, top };
    // Raised solid pieces stand on what is under them, so they do not reach down through a floor below.
    if (o.raise > 0 && (t === 'platform' || t === 'plank' || t === 'stone' || t === 'pillar' || t === 'wall') && surf !== 0) p.bottom = surf;
  }
  if (FACING.has(t)) p.dir = o.dir;
  if (t === 'stairs') {
    p.bottom = surf;
    p.top = Math.round((surf + (o.raise > 0 ? o.raise : 3)) * 10) / 10;
  }
  if (POOLS.has(t)) p.top = surf - 0.85;
  return p;
}

/** Whether a piece faces a way (so Turn means something for it). */
export function faces(t: PieceType): boolean {
  return FACING.has(t);
}

/** Whether a piece would stick out of a room this wide and deep. (The exit door stands in the wall, so it may.) */
export function sticksOut(p: Piece, width: number, depth: number): boolean {
  if (p.t === 'exit') return false;
  return Math.max(Math.abs(p.x0), Math.abs(p.x1)) > width / 2 + 0.01 || Math.max(Math.abs(p.z0), Math.abs(p.z1)) > depth / 2 + 0.01;
}

/**
 * The height of what a piece stands on: the highest top, among the solid boxes under its middle, that is not above
 * its own base. 0 (the room's floor) if there is nothing.
 */
export function standsOn(pieces: Piece[], p: Piece): number {
  const mx = (p.x0 + p.x1) / 2;
  const mz = (p.z0 + p.z1) / 2;
  const limit = isSingle(p.t) ? p.top + 0.05 : (p.bottom ?? p.top - 0.05) + 0.01;
  let best: number | null = null;
  for (const q of pieces) {
    if (q === p || isSingle(q.t) || POOLS.has(q.t)) continue;
    if (mx < Math.min(q.x0, q.x1) - 0.01 || mx > Math.max(q.x0, q.x1) + 0.01 || mz < Math.min(q.z0, q.z1) - 0.01 || mz > Math.max(q.z0, q.z1) + 0.01) continue;
    if (q.top > limit) continue;
    if (best === null || q.top > best) best = q.top;
  }
  return best ?? 0;
}

/**
 * The settings that would put down another piece like `p` (its size, how far it stands above what is under it, the
 * way it faces): what Pick and Move take from the piece he points at. `under` is the height of what it stands on.
 */
export function settingsFrom(p: Piece, under: number): PlaceOpts {
  const round = (v: number): number => Math.round(v * 10) / 10;
  let raise = round(p.top - under);
  if (POOLS.has(p.t)) raise = 0;
  else if (p.t === 'stairs') raise = round(p.top - (p.bottom ?? under));
  else if (!isSingle(p.t) && p.bottom !== undefined) raise = round(p.top - p.bottom);
  return { w: Math.max(1, Math.round(Math.abs(p.x1 - p.x0))), d: Math.max(1, Math.round(Math.abs(p.z1 - p.z0))), raise, dir: p.dir ?? 'n' };
}

/**
 * A controller's d-pad in the 3D editor: it shapes the piece. Left and right make it narrower and wider, up and down
 * deeper and shallower (its footprint, as on a map); with `lift` on (the Select button switches it), up and down
 * raise and lower it instead. A press acts at once; held, it waits a moment and then repeats, so a floor can be
 * drawn out quickly. (Lift is a switch and not a held button because every button a thumb could hold while the other
 * is on the d-pad already does something here.)
 */
export class PadShaper {
  private dir = '';
  private left = 0;
  /** `x`, `y`: the d-pad as held (-1, 0, 1; up is 1). Returns what to change this frame, each -1, 0 or 1. */
  step(dt: number, x: number, y: number, lift: boolean): { width: number; depth: number; raise: number } {
    const out = { width: 0, depth: 0, raise: 0 };
    // (Left and right win over up and down if a thumb is on a corner.)
    const dir = x < 0 ? 'left' : x > 0 ? 'right' : y > 0 ? (lift ? 'raise' : 'deep') : y < 0 ? (lift ? 'lower' : 'shallow') : '';
    let act = false;
    if (dir !== this.dir) {
      this.dir = dir;
      this.left = PadShaper.WAIT;
      act = dir !== '';
    } else if (dir) {
      this.left -= dt;
      if (this.left <= 0) {
        this.left += PadShaper.EVERY;
        act = true;
      }
    }
    if (!act) return out;
    if (dir === 'left') out.width = -1;
    else if (dir === 'right') out.width = 1;
    else if (dir === 'deep') out.depth = 1;
    else if (dir === 'shallow') out.depth = -1;
    else if (dir === 'raise') out.raise = 1;
    else if (dir === 'lower') out.raise = -1;
    return out;
  }
  /** Held, it starts repeating after this long, and then repeats this often. */
  static readonly WAIT = 0.35;
  static readonly EVERY = 0.08;
}

/**
 * The point that tells which piece the crosshair is on: just inside the surface it meets. (A piece is placed AGAINST
 * a side he points at, half a square out from it; but the piece he is pointing at is the one whose side that is, not
 * the floor in front of it.)
 */
export function aimPoint(point: { x: number; y: number; z: number }, normal: { x: number; y: number; z: number }, dist: number): { x: number; y: number; z: number; dist: number } {
  return { x: point.x - normal.x * 0.05, y: point.y - normal.y * 0.05, z: point.z - normal.z * 0.05, dist };
}

/** Where the ray from the eye meets a level piece: what Copy, Move and Delete would act on. `hit` is the `aimPoint`. */
export function pickPiece(
  pieces: Piece[],
  eye: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  hit: { x: number; y: number; z: number; dist: number } | null,
): number {
  // Singles: the one nearest the line of sight (and nearest the eye), within reach.
  let best = -1;
  let bestT = Infinity;
  pieces.forEach((p, i) => {
    if (!isSingle(p.t)) return;
    const px = p.x0 - eye.x;
    const py = p.top + 0.4 - eye.y;
    const pz = p.z0 - eye.z;
    const t = px * dir.x + py * dir.y + pz * dir.z;
    if (t <= 0 || t > 60 || t >= bestT) return;
    const ex = px - dir.x * t;
    const ey = py - dir.y * t;
    const ez = pz - dir.z * t;
    if (Math.hypot(ex, ey, ez) < 0.75) {
      best = i;
      bestT = t;
    }
  });
  // (The line of sight meets its skin before it comes nearest its middle: that much further on is still it.)
  if (best >= 0 && (!hit || bestT < hit.dist + 0.8)) return best;
  if (!hit) return -1;
  // Boxes: the one whose footprint holds the point, with its top nearest the point's height (the last drawn wins ties).
  let box = -1;
  let gap = Infinity;
  pieces.forEach((p, i) => {
    if (isSingle(p.t)) return;
    const m = 0.02;
    if (hit.x < Math.min(p.x0, p.x1) - m || hit.x > Math.max(p.x0, p.x1) + m || hit.z < Math.min(p.z0, p.z1) - m || hit.z > Math.max(p.z0, p.z1) + m) return;
    const low = POOLS.has(p.t) ? p.top - 1 : p.bottom ?? -50;
    if (hit.y > p.top + 0.15 || hit.y < low - 0.15) return;
    const g = Math.abs(p.top - hit.y);
    if (g <= gap) {
      gap = g;
      box = i;
    }
  });
  return box;
}
