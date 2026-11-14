import type { Aabb } from './collision';
import type { Box, Decor, MoverSpec } from './layout';

/**
 * Things that go on walls (slime, cobwebs, banners, torches, gauges, windows, portraits) are put into a level by
 * hand, somewhere near a wall: half a unit off it, often. Drawn where they were put, they floated in front of the
 * wall; and the long ones (slime most of all) ran down through whatever floor or ledge was under them.
 *
 * `mount` puts one on its wall: it finds the face of the wall behind it and stands it flat against that, and it finds
 * the floor in front of the wall under it and keeps the hanging's lower end above that (a shorter drip, a shorter
 * banner, a smaller web; a torch or a window is moved up), and it turns it to face out from that wall. Hangings that
 * are not square to the walls are left alone.
 */
type Hanging = Extract<Decor, { kind: 'slime' | 'web' | 'banner' | 'torch' | 'gauge' | 'window' | 'portrait' }>;
const HANGINGS = new Set<Decor['kind']>(['slime', 'web', 'banner', 'torch', 'gauge', 'window', 'portrait']);

/** How far out from the wall's face each kind's own drawing starts (what it adds itself is not counted here). */
const OUT: Record<Hanging['kind'], number> = { slime: 0.05, web: 0.03, banner: 0, torch: 0, gauge: 0, window: 0.03, portrait: 0 };
/** How much clear air each keeps over the floor. */
const CLEAR = 0.15;

/**
 * The wall a hanging at (x, y, z) is on, and the floor in front of that wall under it. `yaw` only says which way the
 * wall runs (the hanging faces along it, one way or the other); which side of the wall it is on is taken from where
 * it was put, since levels do not agree about which way a hanging's arrow points. Comes back with the place on the
 * wall's face, the way out from the wall (`yaw`), and the floor's height (-Infinity if there is none).
 */
export function wallBehind(colliders: Aabb[], x: number, y: number, z: number, yaw: number, halfWidth: number): { x: number; z: number; yaw: number; found: boolean; floor: number } {
  const alongX = Math.abs(Math.sin(yaw)) > 0.99; // the wall faces along x
  if (!alongX && Math.abs(Math.cos(yaw)) < 0.99) return { x, z, yaw, found: false, floor: -Infinity }; // not square to the walls: left alone
  // The nearest face of anything solid at its height: a little behind where it was put (it was put in front of the
  // wall), or just in front (it was put inside it).
  let best = Infinity;
  let px = x;
  let pz = z;
  let out = alongX ? Math.sign(Math.sin(yaw)) : Math.sign(Math.cos(yaw));
  for (const b of colliders) {
    if (y < b.min.y - 0.01 || y > b.max.y + 0.01) continue;
    if (alongX ? z < b.min.z - 0.05 || z > b.max.z + 0.05 : x < b.min.x - 0.05 || x > b.max.x + 0.05) continue;
    for (const side of [-1, 1]) {
      const face = alongX ? (side > 0 ? b.max.x : b.min.x) : side > 0 ? b.max.z : b.min.z;
      const off = ((alongX ? x : z) - face) * side; // how far in front of that face it was put
      if (off < -0.6 || off > 1.2 || Math.abs(off) >= best) continue;
      best = Math.abs(off);
      out = side;
      if (alongX) px = face;
      else pz = face;
    }
  }
  const nx = alongX ? out : 0;
  const nz = alongX ? 0 : out;
  // The floor under it, in front of the wall: the highest top below it that its width stands over.
  let floor = -Infinity;
  const x0 = alongX ? Math.min(px + nx * 0.05, px + nx * 0.5) : px - halfWidth * 0.9;
  const x1 = alongX ? Math.max(px + nx * 0.05, px + nx * 0.5) : px + halfWidth * 0.9;
  const z0 = alongX ? pz - halfWidth * 0.9 : Math.min(pz + nz * 0.05, pz + nz * 0.5);
  const z1 = alongX ? pz + halfWidth * 0.9 : Math.max(pz + nz * 0.05, pz + nz * 0.5);
  for (const b of colliders) {
    if (b.max.y > y - 0.3 || x1 <= b.min.x || x0 >= b.max.x || z1 <= b.min.z || z0 >= b.max.z) continue;
    floor = Math.max(floor, b.max.y);
  }
  return { x: px, z: pz, yaw: Math.atan2(nx, nz), found: best < Infinity, floor };
}

/** The same piece of dressing, on its wall and clear of the floor (anything that is not a wall hanging comes back as it was). */
export function mount(d: Decor, colliders: Aabb[]): Decor {
  if (!HANGINGS.has(d.kind)) return d;
  const h = d as Hanging;
  const top = h.kind === 'banner' ? h.top : h.y;
  const half = h.kind === 'slime' ? 0.9 : h.kind === 'banner' ? h.w / 2 : h.kind === 'web' ? h.r * 0.6 : h.kind === 'window' ? 0.75 : h.kind === 'gauge' ? h.r / 2 : h.kind === 'portrait' ? h.size * 0.4 : 0.15;
  // The wall is looked for at the height of its fixing (a banner's rod, a slime's top, the middle of the rest).
  const w = wallBehind(colliders, h.x, top - (h.kind === 'banner' || h.kind === 'slime' ? 0.15 : 0), h.z, h.yaw, half);
  // It faces out from the wall it was found on (a window drawn the other way round shows its blank back).
  const yaw = w.found ? w.yaw : h.yaw;
  const x = w.found ? w.x + Math.sin(yaw) * OUT[h.kind] : h.x;
  const z = w.found ? w.z + Math.cos(yaw) * OUT[h.kind] : h.z;
  const room = top - w.floor - CLEAR; // how far down it may reach
  switch (h.kind) {
    case 'slime':
      // Its longest drip is its length, and ends in a drop.
      return { ...h, x, z, yaw, length: Math.max(0.3, Math.min(h.length, room - 0.12)) };
    case 'banner':
      return { ...h, x, z, yaw, h: Math.max(0.8, Math.min(h.h, room)) };
    case 'web':
      return { ...h, x, z, yaw, r: Math.max(0.4, Math.min(h.r, room)) };
    case 'window':
      return { ...h, x, z, yaw, y: Math.max(h.y, w.floor + 0.75 + CLEAR) };
    case 'torch':
      return { ...h, x, z, yaw, y: Math.max(h.y, w.floor + 0.3 + CLEAR) };
    case 'gauge':
      return { ...h, x, z, yaw, y: Math.max(h.y, w.floor + h.r * 0.75 + CLEAR) };
    case 'portrait':
      return { ...h, x, z, yaw, y: Math.max(h.y, w.floor + h.size * 0.75 + CLEAR) };
  }
}

/** How low a mounted hanging reaches. */
export function lowestPoint(d: Decor): number | null {
  switch (d.kind) {
    case 'slime':
      return d.y - d.length - 0.12;
    case 'banner':
      return d.top - d.h;
    case 'web':
      return d.y - d.r;
    case 'window':
      return d.y - 0.75;
    case 'torch':
      return d.y - 0.3;
    case 'gauge':
      return d.y - d.r * 0.75;
    case 'portrait':
      return d.y - d.size * 0.75;
    default:
      return null;
  }
}

/**
 * Seats moving platforms on what is under them. A platform's place is the height of its TOP, and its body hangs below
 * that; one put "at floor level" had its whole body inside the floor at the bottom of its run, with only its top face
 * showing. Here, wherever along its run a platform's body would be inside the top of something solid under its
 * middle, it is raised to sit on it. A lift (one that only goes up and down) still stops at the same height at the
 * top: it just starts higher and travels less. A slider rides that much higher all the way.
 */
export function seatMovers(movers: MoverSpec[], solids: Box[]): MoverSpec[] {
  return movers.map((m) => {
    const thick = m.thick ?? 0.5;
    let raise = 0;
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      const x = m.x + m.to[0] * t;
      const y = m.y + m.to[1] * t;
      const z = m.z + m.to[2] * t;
      for (const b of solids) {
        if (b.hidden || x <= b.x0 || x >= b.x1 || z <= b.z0 || z >= b.z1) continue;
        // Its top is inside the platform's body (or flush with the platform's own top).
        if (b.y1 > y - thick + 0.02 && b.y1 <= y + 0.02) raise = Math.max(raise, b.y1 - (y - thick));
      }
    }
    if (raise <= 0.02) return m;
    const lift = m.to[0] === 0 && m.to[2] === 0 && m.to[1] > 0;
    return lift ? { ...m, y: m.y + raise, to: [0, Math.max(0.2, m.to[1] - raise), 0] } : { ...m, y: m.y + raise };
  });
}
