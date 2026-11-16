/**
 * The jump checker: works out where the rat can get to from the start, using the real jump numbers (TUNING, so the
 * Tweaks panel is included). It walks, steps up small rises, drops down, swims, rides moving platforms, and jumps
 * (with the double jump) to any surface in reach. It is a careful estimate, not a full simulation:
 * gates are taken as open, and nothing in the air blocks a jump. (The trap search, `{ traps: true }`, is stricter about
 * jumps: there a wall too tall to clear stops one.)
 *
 * The level is sampled on a half-unit grid. Each point can have several surfaces (floor, a slab above it...).
 */
import { TUNING } from '../data/tuning';
import type { LevelDef } from './types';
import { MAX_WALK_SLOPE, type Box } from '../world/layout';
import { aabbOf, topAt } from '../world/collision';

const STEP = 0.5;
const HEADROOM = 0.9;
const SWIM_HEADROOM = 0.6;

interface Node {
  i: number;
  j: number;
  h: number;
  /** Swimming here rather than standing. */
  swim: boolean;
  /** On a ramp's slope. */
  ramp?: boolean;
}

/** Horizontal reach of a running jump that lands `dh` higher (negative: lower). 0 when it cannot be reached. */
export function jumpReach(dh: number, long = true): number {
  const g = TUNING.physics.gravity;
  const gf = g * TUNING.physics.fallGravityMultiplier;
  const v = TUNING.jump.velocity;
  const v2 = TUNING.jump.doubleVelocity;
  const run = TUNING.move.run;
  const h1 = (v * v) / (2 * g);
  let t = -1;
  if (dh <= h1) t = v / g + Math.sqrt((2 * (h1 - dh)) / gf);
  if (TUNING.jump.airJumps > 0) {
    const h2 = h1 + (v2 * v2) / (2 * g);
    if (dh <= h2) t = Math.max(t, v / g + v2 / g + Math.sqrt((2 * (h2 - dh)) / gf));
  }
  // The long jump: lower but much faster across.
  const lv = TUNING.moves.longJumpUp;
  const lh = (lv * lv) / (2 * g);
  const longReach = long && dh <= lh ? TUNING.moves.longJumpSpeed * (lv / g + Math.sqrt((2 * (lh - dh)) / gf)) : 0;
  if (t < 0 && longReach <= 0) return 0;
  const best = Math.max(t < 0 ? 0 : run * (t + TUNING.jump.coyoteTime), longReach);
  // A little short of the best possible, so "reachable" means a fair jump, not a perfect one.
  return best * 0.92;
}

/** The highest ledge he can get onto from flat ground: the top of his jump, plus his reach when he grabs the edge. */
export function maxClimb(grab = true): number {
  const g = TUNING.physics.gravity;
  const v = TUNING.jump.velocity;
  const v2 = TUNING.jump.doubleVelocity;
  return (v * v) / (2 * g) + (TUNING.jump.airJumps > 0 ? (v2 * v2) / (2 * g) : 0) + (grab ? 1.05 : -0.15);
}

/**
 * How far apart two facing walls can be and still be kicked up between. A kick throws him up and across; he gains
 * height on every kick for as long as he reaches the far wall higher than he left the near one. Worked out from the
 * kick's numbers, and a little short of the limit (it asks for half a unit gained each kick), so that "climbable"
 * means a climb a player could make, not one frame-perfect kick after another.
 *
 * It is wide: about eight units. (Until 2026-11-15 this was a fixed 4.5, taken from the chimneys the levels had; the
 * knight himself was always able to climb between walls far wider apart than that, as the Move Garden's six-wide
 * chimney showed, so the checker could not see every way up.)
 *
 * `gain` is how much each kick must gain him. The default (half a unit) is for finding ways up that should not be
 * there: anything a determined player could do counts. The trap search asks for two units a kick (about six and a
 * half wide): a way OUT of somewhere has to be one an ordinary player can take, or the place is a trap.
 */
export function maxChimney(gain = 0.5): number {
  const g = TUNING.physics.gravity;
  const up = TUNING.moves.wallKickUp;
  const peak = (up * up) / (2 * g);
  const spare = Math.max(0, peak - gain);
  const time = up / g + Math.sqrt((2 * spare) / (g * TUNING.physics.fallGravityMultiplier));
  return TUNING.moves.wallKickPush * time + TUNING.rat.radius * 2;
}

export interface ReachMap {
  /** Can he stand (or swim) within `r` of (x, z), at a height from `y - below` to `y + above`? */
  near(x: number, y: number, z: number, r?: number, below?: number, above?: number): boolean;
  /** Every reachable surface point, for drawing: x, z, height. */
  points: Array<[number, number, number]>;
  /** How many surface points there are in all, and how many he can reach. */
  total: number;
  reached: number;
  /**
   * Only with `{ traps: true }`: places he can get to but never get back out of (to the level's door), as x, z, height.
   * A fall into the void counts as a way out where it sends him back to the start; in a fall-back level (and in lava) it
   * puts him back where he was, so it does not.
   */
  traps?: Array<[number, number, number]>;
}

export function computeReach(def: LevelDef, opts: { traps?: boolean; gatesShut?: boolean; /** The widest gap taken as a chimney (default: what the kick allows). */ chimney?: number } = {}): ReachMap {
  const solids: Box[] = [...def.solids];
  // Gates are taken as open, unless asked: then each is a wall (a little thicker than its bars, so the grid sees it).
  if (opts.gatesShut) for (const g of def.gates ?? []) {
    const y = g.y ?? 0;
    const w = g.alongZ ? 0.6 : g.width, d = g.alongZ ? g.width : 0.6;
    solids.push({ kind: 'wall', hidden: true, x0: g.x - w / 2, x1: g.x + w / 2, y0: y, y1: y + g.height, z0: g.z - d / 2, z1: g.z + d / 2 });
  }
  /** Which moving platform a sampled box belongs to: its own other positions never get in its way. */
  const moverOf = new Map<Box, number>();
  // A moving platform is a row of surfaces along its path (a ride is like a series of short hops).
  (def.movers ?? []).forEach((m, mi) => {
    const th = m.thick ?? 0.4;
    for (let k = 0; k <= 4; k++) {
      const f = k / 4;
      const cx = m.x + m.to[0] * f;
      const cy = m.y + m.to[1] * f;
      const cz = m.z + m.to[2] * f;
      const b: Box = { kind: 'platform', hidden: true, x0: cx - m.w / 2, x1: cx + m.w / 2, y0: cy - th, y1: cy, z0: cz - m.d / 2, z1: cz + m.d / 2 };
      moverOf.set(b, mi);
      solids.push(b);
    }
  });
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const b of solids) {
    x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); z0 = Math.min(z0, b.z0); z1 = Math.max(z1, b.z1);
  }
  x0 = Math.max(x0, -80); x1 = Math.min(x1, 80); z0 = Math.max(z0, -80); z1 = Math.min(z1, 80);
  const ni = Math.max(1, Math.ceil((x1 - x0) / STEP));
  const nj = Math.max(1, Math.ceil((z1 - z0) / STEP));
  const px = (i: number): number => x0 + (i + 0.5) * STEP;
  const pz = (j: number): number => z0 + (j + 0.5) * STEP;

  /** The column-wide pieces ramps are cut into (below), and whether a ramp is too steep to walk. */
  const rampSlices = new Set<Box>();
  // Solids by column, so each point only looks at the boxes over it.
  const cols: Box[][] = Array.from({ length: ni * nj }, () => []);
  for (const b of solids) {
    const ia = Math.max(0, Math.floor((b.x0 - x0) / STEP)), ib = Math.min(ni - 1, Math.floor((b.x1 - x0 - 1e-6) / STEP));
    const ja = Math.max(0, Math.floor((b.z0 - z0) / STEP)), jb = Math.min(nj - 1, Math.floor((b.z1 - z0 - 1e-6) / STEP));
    for (let i = ia; i <= ib; i++) for (let j = ja; j <= jb; j++) {
      const x = px(i), z = pz(j);
      if (!(x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1)) continue;
      if (!b.ramp) {
        cols[i * nj + j].push(b);
        continue;
      }
      // A ramp is taken a column at a time: over each point, a box as high as its slope is there. (He walks from
      // one to the next whatever the rise between them, as long as the ramp is one he can walk: see the walking step.)
      const slice: Box = { ...b, ramp: undefined, y1: topAt(aabbOf(b), x, z) };
      rampSlices.add(slice);
      cols[i * nj + j].push(slice);
    }
  }
  const surfAt: Node[][] = Array.from({ length: ni * nj }, () => []);
  const blocked = (c: Box[], lo: number, hi: number, self?: Box): boolean => {
    const own = self ? moverOf.get(self) : undefined;
    return c.some((b) => b.y1 > lo + 1e-3 && b.y0 < hi - 1e-3 && (own === undefined || moverOf.get(b) !== own));
  };
  for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) {
    const c = cols[i * nj + j];
    const x = px(i), z = pz(j);
    const lava = (def.lava ?? []).find((l) => x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1);
    const water = def.water.find((w) => x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1);
    const list = surfAt[i * nj + j];
    for (const b of c) {
      const h = b.y1;
      if (blocked(c, h, h + HEADROOM, b)) continue;
      if (lava && h < lava.y + 0.05) continue;
      if (water && h < water.y) continue; // under water he swims at the top instead
      list.push(rampSlices.has(b) ? { i, j, h, swim: false, ramp: true } : { i, j, h, swim: false });
    }
    // Swimming, he keeps low: he fits under a lid a jump would hit (the Cistern's old drain).
    if (water && !blocked(c, water.y, water.y + SWIM_HEADROOM)) list.push({ i, j, h: water.y, swim: true });
  }

  const key = (n: Node): string => `${n.i},${n.j},${n.h.toFixed(2)}`;
  const seen = new Set<string>();
  const queue: Node[] = [];
  // With `traps`, every step is written down (as point numbers) so the search can be run backwards afterwards.
  const ids = new Map<string, number>();
  const nodes: Node[] = [];
  let from = 0;
  let edgeFrom = new Int32Array(opts.traps ? 1 << 16 : 0);
  let edgeTo = new Int32Array(opts.traps ? 1 << 16 : 0);
  let edgeCount = 0;
  const idOf = (n: Node): number => {
    const k = key(n);
    let id = ids.get(k);
    if (id === undefined) {
      id = nodes.length;
      ids.set(k, id);
      nodes.push(n);
    }
    return id;
  };
  const add = (n: Node): void => {
    if (opts.traps) {
      if (edgeCount === edgeFrom.length) {
        const a = new Int32Array(edgeFrom.length * 2);
        a.set(edgeFrom);
        edgeFrom = a;
        const b = new Int32Array(edgeTo.length * 2);
        b.set(edgeTo);
        edgeTo = b;
      }
      edgeFrom[edgeCount] = from;
      edgeTo[edgeCount] = idOf(n);
      edgeCount++;
    }
    const k = key(n);
    if (seen.has(k)) return;
    seen.add(k);
    queue.push(n);
  };
  // Start: the highest surface under the spawn point.
  const si = Math.floor((def.spawn.x - x0) / STEP), sj = Math.floor((def.spawn.z - z0) / STEP);
  if (si >= 0 && si < ni && sj >= 0 && sj < nj) {
    const under = surfAt[si * nj + sj].filter((n) => n.h <= def.spawn.y + 0.6).sort((a, b) => b.h - a.h)[0];
    if (under) add(under);
  }
  const climb = maxClimb(!def.noGrab);
  const canLong = !def.noLongJump;
  const grabOk = !def.noGrab;
  const far = Math.ceil(jumpReach(-20, canLong) / STEP) + 1;
  // Edge points: where a jump can start or land. That is a ledge's rim, or anywhere with something above it to jump up to
  // (a floating slab, a lift). The middle of a bare floor never needs a jump.
  const isEdge = (n: Node): boolean => {
    for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const i = n.i + di, j = n.j + dj;
      if (i < 0 || j < 0 || i >= ni || j >= nj) return true;
      const l = surfAt[i * nj + j];
      if ((di || dj) && !l.some((m) => Math.abs(m.h - n.h) <= 0.4)) return true;
      if (l.some((m) => m.h > n.h + 0.4 && m.h <= n.h + climb)) return true;
    }
    return false;
  };
  const edges: Node[] = [];
  for (const l of surfAt) for (const n of l) if (isEdge(n)) edges.push(n);
  // Edge points by cell, for quick lookups round a point.
  const edgeAt = new Map<number, Node[]>();
  for (const n of edges) {
    const k = n.i * nj + n.j;
    const a = edgeAt.get(k);
    if (a) a.push(n);
    else edgeAt.set(k, [n]);
  }

  // Wall kicks: in a chimney (two walls facing each other, near enough to kick between) he can kick his way up to the lower wall's top.
  // For each standing point, the height such a chimney lets him reach, or 0 when there is none.
  const wallTopAt = (i: number, j: number, h: number): number => {
    if (i < 0 || j < 0 || i >= ni || j >= nj) return 0;
    // A solid column here covering his body height: how high does it go (stacked boxes count as one wall)?
    const c = cols[i * nj + j];
    let top = 0;
    let lo = h + 0.3;
    let found = true;
    while (found) {
      found = false;
      for (const b of c) {
        if (b.y0 <= lo + 0.05 && b.y1 > lo + 0.05 && b.y1 > top) {
          top = b.y1;
          lo = b.y1;
          found = true;
        }
      }
    }
    return top > h + 1.5 ? top : 0;
  };
  const chimney = opts.chimney ?? maxChimney(opts.traps ? 2 : 0.5);
  const chimneyCells = Math.ceil(chimney / STEP);
  const kickTop = (n: Node): number => {
    let best = 0;
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      // Look both ways along this axis for a wall within the chimney width.
      let a = 0;
      let b = 0;
      let ka = 0;
      let kb = 0;
      for (let k = 1; k <= chimneyCells && !a; k++) if ((a = wallTopAt(n.i + di * k, n.j + dj * k, n.h))) ka = k;
      for (let k = 1; k <= chimneyCells && !b; k++) if ((b = wallTopAt(n.i - di * k, n.j - dj * k, n.h))) kb = k;
      // Kicks gain height only while he reaches the other wall higher than he left this one (see maxChimney).
      if (a && b && (ka + kb - 1) * STEP <= chimney + 1e-6) best = Math.max(best, Math.min(a, b));
    }
    // He needs room overhead to kick up: a ceiling over him below the walls' tops (a doorway's lintel, say) stops it.
    if (best) for (const b of cols[n.i * nj + n.j]) if (b.y0 >= n.h + 1 && b.y0 < best - 0.05) return 0;
    return best;
  };

  // For the trap search the jumps are stricter: a wall taller than the top of his jump, between him and where he lands,
  // stops it (the ordinary search lets jumps through walls, so it never calls something unreachable that is not).
  const apex = maxClimb(false) + 0.15;
  const clearFlight = (n: Node, m: Node, kick: number): boolean => {
    const ax = px(n.i), az = pz(n.j), bx = px(m.i), bz = pz(m.j);
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (STEP * 0.5));
    const top = Math.max(n.h + apex, m.h, kick);
    const low = Math.max(n.h, m.h) + HEADROOM;
    for (let s = 1; s < steps; s++) {
      const f = s / steps;
      const i = Math.floor((ax + (bx - ax) * f - x0) / STEP), j = Math.floor((az + (bz - az) * f - z0) / STEP);
      if ((i === n.i && j === n.j) || (i === m.i && j === m.j) || i < 0 || j < 0 || i >= ni || j >= nj) continue;
      for (const b of cols[i * nj + j]) if (b.y1 > top + 0.05 && b.y0 < low && !moverOf.has(b)) return false;
    }
    return true;
  };

  while (queue.length) {
    const n = queue.pop()!;
    if (opts.traps) from = idOf(n);
    // Walk, step up a little, or drop down to the next point.
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const i = n.i + di, j = n.j + dj;
      if (i < 0 || j < 0 || i >= ni || j >= nj) continue;
      const c = cols[i * nj + j];
      for (const m of surfAt[i * nj + j]) {
        // (Up a ramp the next point is higher by as much as the ramp is steep: he walks that, where he could not step it.)
        if (m.h > n.h + (n.swim ? 0.5 : m.ramp && (n.ramp || m.h - n.h <= 0.4) ? MAX_WALK_SLOPE * STEP + 0.06 : 0.4)) continue;
        // A step, or a drop with nothing in the way between where he is and where he lands.
        if (m.h >= n.h - 0.4 || !blocked(c, m.h, n.h + HEADROOM)) add(m);
      }
    }
    // Jump: from an edge, to any edge point in reach (from inside a chimney, as high as the kicks go).
    const kick = kickTop(n);
    if (!isEdge(n) && !kick) continue;
    const reachUp = kick ? Math.max(climb, kick - n.h + climb) : climb;
    for (let i = n.i - far; i <= n.i + far; i++) {
      if (i < 0 || i >= ni) continue;
      for (let j = n.j - far; j <= n.j + far; j++) {
        if (j < 0 || j >= nj) continue;
        const list = edgeAt.get(i * nj + j);
        if (!list) continue;
        const dist = Math.hypot((i - n.i) * STEP, (j - n.j) * STEP);
        for (const m of list) {
          const dh = m.h - n.h;
          if (dh > reachUp) continue;
          // Up a chimney he arrives at the top with a fresh jump; with a grab he only needs his paws to reach the edge.
          const lift = kick && dh > climb ? kick - n.h : 0;
          const need = grabOk ? Math.max(-20, dh - lift - 1.05) : dh - lift;
          if (dist <= Math.max(jumpReach(need, canLong), jumpReach(dh - lift, canLong)) + STEP && (!opts.traps || clearFlight(n, m, kick))) add(m);
        }
      }
    }
  }

  const points: Array<[number, number, number]> = [];
  let total = 0;
  for (const l of surfAt) for (const n of l) {
    total++;
    if (seen.has(key(n))) points.push([px(n.i), pz(n.j), n.h]);
  }
  // Reached points by cell, for near().
  const byCell = new Map<number, number[]>();
  for (const [x, z, h] of points) {
    const k = Math.floor((x - x0) / STEP) * nj + Math.floor((z - z0) / STEP);
    const a = byCell.get(k);
    if (a) a.push(h);
    else byCell.set(k, [h]);
  }
  // ---- Traps: run the steps backwards from the door; whatever he reached but cannot get back from is a trap ----
  let traps: Array<[number, number, number]> | undefined;
  if (opts.traps) {
    const n = nodes.length;
    const count = new Int32Array(n + 1);
    for (let e = 0; e < edgeCount; e++) count[edgeTo[e] + 1]++;
    for (let v = 0; v < n; v++) count[v + 1] += count[v];
    const into = new Int32Array(edgeCount);
    const fill = count.slice();
    for (let e = 0; e < edgeCount; e++) into[fill[edgeTo[e]]++] = edgeFrom[e];
    const out = new Uint8Array(n);
    const stack: number[] = [];
    const mark = (v: number): void => {
      if (out[v]) return;
      out[v] = 1;
      stack.push(v);
    };
    // The way out: the floor in front of the door (or, in the hub, the start).
    const e = def.exit;
    const fx = def.hub ? def.spawn.x : e.x + Math.sin(e.yaw) * 1.2;
    const fz = def.hub ? def.spawn.z : e.z + Math.cos(e.yaw) * 1.2;
    const fy = def.hub ? def.spawn.y : e.y ?? 0;
    // A fall into the void sends him back to the start, unless this is a fall-back level.
    const voidEscapes = !def.fallBack;
    const inLava = (i: number, j: number): boolean => (def.lava ?? []).some((l) => px(i) > l.x0 && px(i) < l.x1 && pz(j) > l.z0 && pz(j) < l.z1);
    const fallsOut = (v: Node): boolean => {
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const i = v.i + di, j = v.j + dj;
        if (i < 0 || j < 0 || i >= ni || j >= nj) return true;
        if (inLava(i, j)) continue;
        // Nothing there at his height or below (no floor to land on, no wall in the way): a drop into the dark.
        if (!surfAt[i * nj + j].some((m) => m.h <= v.h + 0.4) && !cols[i * nj + j].some((b) => b.y0 < v.h + 0.4)) return true;
      }
      return false;
    };
    for (let v = 0; v < n; v++) {
      const nd = nodes[v];
      if (!seen.has(key(nd))) continue;
      const atDoor = Math.hypot(px(nd.i) - fx, pz(nd.j) - fz) <= 1.3 && Math.abs(nd.h - fy) <= 0.7;
      if (atDoor || (voidEscapes && fallsOut(nd))) mark(v);
    }
    while (stack.length) {
      const v = stack.pop()!;
      for (let k = count[v]; k < count[v + 1]; k++) mark(into[k]);
    }
    traps = [];
    for (let v = 0; v < n; v++) {
      const nd = nodes[v];
      if (seen.has(key(nd)) && !out[v]) traps.push([px(nd.i), pz(nd.j), nd.h]);
    }
  }

  return {
    traps,
    points,
    total,
    reached: points.length,
    near(x, y, z, r = 0.9, below = 2.4, above = 0.6) {
      const ia = Math.floor((x - r - x0) / STEP), ib = Math.floor((x + r - x0) / STEP);
      const ja = Math.floor((z - r - z0) / STEP), jb = Math.floor((z + r - z0) / STEP);
      for (let i = ia; i <= ib; i++) for (let j = ja; j <= jb; j++) {
        const hs = byCell.get(i * nj + j);
        if (hs && hs.some((h) => h >= y - below && h <= y + above)) return true;
      }
      return false;
    },
  };
}

/** What in the level he cannot get to: items, wedges, the exit, characters. */
export interface ReachProblem {
  what: string;
  x: number;
  y: number;
  z: number;
}

/** Standing by it, or jumping to it from a surface a little way off (crumbs hung over gaps are taken mid-jump). */
function grabbable(map: ReachMap, x: number, y: number, z: number): boolean {
  return map.near(x, y, z) || map.near(x, y, z, 3.6, maxClimb(false) + 0.6, 0);
}

export function unreachable(def: LevelDef, map = computeReach(def)): ReachProblem[] {
  const out: ReachProblem[] = [];
  const crates = def.solids.filter((b) => b.kind === 'rubble' || b.kind === 'barrel');
  for (const c of def.collectibles) {
    if (c.crate !== undefined) {
      const b = crates[c.crate];
      if (b && !map.near((b.x0 + b.x1) / 2, b.y0, (b.z0 + b.z1) / 2, 1.4, 0.6, 0.6)) out.push({ what: `${c.kind} in a crate`, x: c.x, y: c.y, z: c.z });
    } else if (!grabbable(map, c.x, c.y, c.z)) out.push({ what: c.kind, x: c.x, y: c.y, z: c.z });
  }
  // (A wedge that needs gear is left out: the checker knows only the plain moves. tests/secrets.ts checks those.)
  const geared = (def.wedges ?? []).filter((w) => w.gear);
  for (const w of def.wedges ?? []) if (!w.gear && !grabbable(map, w.x, w.y + 0.5, w.z)) out.push({ what: w.name, x: w.x, y: w.y, z: w.z });
  const e = def.exit;
  // The door is in a wall: he must reach the floor just in front of it.
  const fx = e.x + Math.sin(e.yaw) * 1.2, fz = e.z + Math.cos(e.yaw) * 1.2;
  if (!map.near(fx, (e.y ?? 0) + 0.1, fz, 1.2, 0.6, 0.6)) out.push({ what: 'exit door', x: e.x, y: e.y ?? 0, z: e.z });
  for (const g of def.goals) if (g.type === 'reach' && !geared.some((w) => Math.hypot(w.x - g.x, w.z - g.z) < 0.5) && !map.near(g.x, g.y, g.z, g.radius, 1.2, 1.2)) out.push({ what: 'goal marker', x: g.x, y: g.y, z: g.z });
  for (const n of def.npcs ?? []) if (!n.hidden && !map.near(n.x, n.y ?? 0, n.z, 2.4, 1, 1)) out.push({ what: n.name, x: n.x, y: n.y ?? 0, z: n.z });
  return out;
}
