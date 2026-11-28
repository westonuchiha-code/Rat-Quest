/**
 * The jump checker: where a player can get to from a starting point, in a level made of solid boxes, using the game's
 * own jump numbers (`JumpParams`). It walks, steps up small rises, drops down, and jumps (with air jumps and the ledge
 * grab) to any surface in reach. It is a careful estimate, not a simulation: nothing in the air blocks a jump, and
 * moving platforms and wall kicks are not followed (feed a mover in as a few boxes along its path if it matters).
 *
 * The level is sampled on a grid (half a unit by default). Each column can hold several surfaces: a floor, a slab
 * above it, and so on, each with headroom over it.
 */
import { jumpReach, maxClimb, type JumpParams } from './jumpMath';

/** A solid box, min and max on each axis (y is up). */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z0: number;
  z1: number;
}

export interface ReachOptions {
  /** Grid spacing. Default 0.5. */
  step?: number;
  /** Space he needs over a surface to stand on it. Default 0.9. */
  headroom?: number;
  /** The highest rise he walks up without jumping. Default 0.35. */
  stepUp?: number;
  /** Bounds of the search (default: the boxes', capped at 80 each way). */
  bounds?: { x0: number; x1: number; z0: number; z1: number };
}

export interface ReachMap {
  /** Can he stand within `r` of (x, z), at a height from `y - below` to `y + above`? */
  near(x: number, y: number, z: number, r?: number, below?: number, above?: number): boolean;
  /** Every reachable surface point, for drawing: x, z, height. */
  points: Array<[number, number, number]>;
  /** Every surface point there is, reached or not. */
  total: number;
  reached: number;
}

export interface Target {
  name: string;
  x: number;
  y: number;
  z: number;
  /** How near he must stand. Default 1. */
  r?: number;
}

export function computeReach(boxes: Box[], start: { x: number; y: number; z: number }, p: JumpParams, opts: ReachOptions = {}): ReachMap {
  const STEP = opts.step ?? 0.5;
  const HEAD = opts.headroom ?? 0.9;
  const RISE = opts.stepUp ?? 0.35;
  let { x0, x1, z0, z1 } = opts.bounds ?? { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  if (!opts.bounds) for (const b of boxes) {
    x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); z0 = Math.min(z0, b.z0); z1 = Math.max(z1, b.z1);
  }
  x0 = Math.max(x0, -80); x1 = Math.min(x1, 80); z0 = Math.max(z0, -80); z1 = Math.min(z1, 80);
  const ni = Math.max(1, Math.ceil((x1 - x0) / STEP));
  const nj = Math.max(1, Math.ceil((z1 - z0) / STEP));
  const px = (i: number): number => x0 + (i + 0.5) * STEP;
  const pz = (j: number): number => z0 + (j + 0.5) * STEP;

  // The surfaces in each column: the top of a box with headroom clear above it.
  const surf: number[][] = Array.from({ length: ni * nj }, () => []);
  const cols: Box[][] = Array.from({ length: ni * nj }, () => []);
  for (const b of boxes) {
    const ia = Math.max(0, Math.floor((b.x0 - x0) / STEP)), ib = Math.min(ni - 1, Math.floor((b.x1 - x0 - 1e-6) / STEP));
    const ja = Math.max(0, Math.floor((b.z0 - z0) / STEP)), jb = Math.min(nj - 1, Math.floor((b.z1 - z0 - 1e-6) / STEP));
    for (let i = ia; i <= ib; i++) for (let j = ja; j <= jb; j++) {
      const cx = px(i), cz = pz(j);
      if (cx >= b.x0 && cx <= b.x1 && cz >= b.z0 && cz <= b.z1) cols[i * nj + j].push(b);
    }
  }
  for (let c = 0; c < cols.length; c++) {
    for (const b of cols[c]) {
      const h = b.y1;
      if (!cols[c].some((o) => o !== b && o.y0 < h + HEAD && o.y1 > h + 1e-6)) surf[c].push(h);
    }
    surf[c] = [...new Set(surf[c])].sort((a, b) => a - b);
  }
  // Nodes: (column, surface index), numbered.
  const base: number[] = [];
  let total = 0;
  for (let c = 0; c < surf.length; c++) {
    base.push(total);
    total += surf[c].length;
  }
  const seen = new Uint8Array(total);
  const queue: Array<[number, number]> = [];
  const visit = (c: number, k: number): void => {
    const id = base[c] + k;
    if (!seen[id]) {
      seen[id] = 1;
      queue.push([c, k]);
    }
  };
  // Start on the highest surface at or just below him, in his column.
  const si = Math.floor((start.x - x0) / STEP), sj = Math.floor((start.z - z0) / STEP);
  if (si >= 0 && si < ni && sj >= 0 && sj < nj) {
    const c = si * nj + sj;
    let best = -1;
    surf[c].forEach((h, k) => {
      if (h <= start.y + 0.5) best = k;
    });
    if (best >= 0) visit(c, best);
  }
  const climb = maxClimb(p);
  const far = Math.max(jumpReach(p, -6), STEP * 2);
  const R = Math.min(60, Math.ceil(far / STEP));
  while (queue.length) {
    const [c, k] = queue.pop()!;
    const h = surf[c][k];
    const i = Math.floor(c / nj), j = c % nj;
    for (let di = -R; di <= R; di++) for (let dj = -R; dj <= R; dj++) {
      const ii = i + di, jj = j + dj;
      if ((di === 0 && dj === 0) || ii < 0 || jj < 0 || ii >= ni || jj >= nj) continue;
      const d = Math.hypot(di, dj) * STEP;
      if (d > far) continue;
      const c2 = ii * nj + jj;
      const near = Math.abs(di) <= 1 && Math.abs(dj) <= 1;
      surf[c2].forEach((h2, k2) => {
        const dh = h2 - h;
        // Walking: a small rise, or off an edge down to anything below.
        if (near && dh <= RISE) return visit(c2, k2);
        // Up a ledge he can jump and catch, right beside it.
        if (near && dh <= climb) return visit(c2, k2);
        if (jumpReach(p, dh) >= d) visit(c2, k2);
      });
    }
  }
  const points: Array<[number, number, number]> = [];
  for (let c = 0; c < surf.length; c++) surf[c].forEach((h, k) => {
    if (seen[base[c] + k]) points.push([px(Math.floor(c / nj)), pz(c % nj), h]);
  });
  return {
    points,
    total,
    reached: points.length,
    near(x, y, z, r = 0.75, below = 0.6, above = 0.6) {
      const ia = Math.max(0, Math.floor((x - r - x0) / STEP)), ib = Math.min(ni - 1, Math.floor((x + r - x0) / STEP));
      const ja = Math.max(0, Math.floor((z - r - z0) / STEP)), jb = Math.min(nj - 1, Math.floor((z + r - z0) / STEP));
      for (let i = ia; i <= ib; i++) for (let j = ja; j <= jb; j++) {
        if (Math.hypot(px(i) - x, pz(j) - z) > r + STEP * 0.71) continue;
        const c = i * nj + j;
        for (let k = 0; k < surf[c].length; k++) {
          const h = surf[c][k];
          if (seen[base[c] + k] && h >= y - below && h <= y + above) return true;
        }
      }
      return false;
    },
  };
}

/** Which of `targets` he cannot get to: not standing by it, nor jumping to it from a surface a little way off. */
export function unreachable(map: ReachMap, targets: Target[], p: JumpParams): Target[] {
  return targets.filter((t) => !map.near(t.x, t.y, t.z, t.r ?? 1, 0.6, 0.6) && !map.near(t.x, t.y, t.z, 3.6, maxClimb(p, false) + 0.6, 0));
}
