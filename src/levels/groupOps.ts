/**
 * Working on several pieces at once in the builder: find them in a box, turn them a quarter round, move them.
 * Positions stay on the whole-number grid (turning is about a grid point).
 */
import type { Piece } from './custom';

/** Indices of the pieces whose middle is inside the box drawn from (ax, az) to (bx, bz). */
export function piecesInBox(pieces: Piece[], ax: number, az: number, bx: number, bz: number): number[] {
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
  const out: number[] = [];
  pieces.forEach((p, i) => {
    if (p.t === 'spawn' || p.t === 'exit') return;
    const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2;
    if (cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1) out.push(i);
  });
  return out;
}

/** The grid point in the middle of a group. */
export function groupCentre(ps: Piece[]): { x: number; z: number } {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of ps) {
    x0 = Math.min(x0, p.x0, p.x1); x1 = Math.max(x1, p.x0, p.x1);
    z0 = Math.min(z0, p.z0, p.z1); z1 = Math.max(z1, p.z0, p.z1);
  }
  return { x: Math.round((x0 + x1) / 2), z: Math.round((z0 + z1) / 2) };
}

const TURN: Record<'n' | 'e' | 's' | 'w', 'n' | 'e' | 's' | 'w'> = { n: 'e', e: 's', s: 'w', w: 'n' };

/** Turns the pieces a quarter turn clockwise (seen from above, north up) about (cx, cz), in place. */
export function turnQuarter(ps: Piece[], cx: number, cz: number): void {
  for (const p of ps) {
    // Seen from above with north (-z) up, clockwise takes north to east: (dx, dz) -> (-dz, dx).
    const ax = cx - (p.z0 - cz), az = cz + (p.x0 - cx);
    const bx = cx - (p.z1 - cz), bz = cz + (p.x1 - cx);
    p.x0 = Math.min(ax, bx); p.x1 = Math.max(ax, bx);
    p.z0 = Math.min(az, bz); p.z1 = Math.max(az, bz);
    if (p.dir) p.dir = TURN[p.dir];
  }
}
