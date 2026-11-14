/**
 * The rules of placing and picking pieces in the 3D editor, kept apart from the screen so they can be tested.
 * Positions follow the 2D builder: whole-number grid; a box piece covers x0..x1 and z0..z1 (x1 = x0 + width).
 */
import type { Piece, PieceType } from './custom';

const SINGLES = new Set<PieceType>(['crate', 'barrel', 'crumb', 'cap', 'relic', 'roach', 'toad', 'beetle', 'bat', 'guard', 'mantis', 'npc', 'pipe', 'fall', 'mark', 'plate', 'lamp', 'chain', 'window', 'slime', 'web', 'brazier', 'speaker', 'couch', 'light', 'banner', 'torch', 'gauge', 'crystal', 'roots', 'spawn', 'exit', 'wedge']);
const FACING = new Set<PieceType>(['river', 'fall', 'pipe', 'stairs', 'window', 'slime', 'web', 'banner', 'torch', 'gauge', 'guard', 'mantis']);
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

/** Where the ray from the eye meets a level piece: what the Delete button would remove. */
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
  if (best >= 0 && (!hit || bestT < hit.dist + 0.5)) return best;
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
