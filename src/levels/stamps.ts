/**
 * Ready-made groups of pieces for the builder: press one, tap the map, and the whole group appears there.
 * Positions are relative to the tapped cell; `top` is the height of the ground it stands on.
 */
import type { Piece } from './custom';

export interface Stamp {
  id: string;
  label: string;
  make(x: number, z: number, top: number): Piece[];
}

const one = (t: Piece['t'], x: number, z: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0: x, z0: z, x1: x, z1: z, top, ...extra });
const box = (t: Piece['t'], x0: number, z0: number, x1: number, z1: number, top: number, extra: Partial<Piece> = {}): Piece => ({ t, x0, z0, x1, z1, top, ...extra });

/** Slabs winding up round a point: `n` of them, `r` out, each `rise` higher; a crumb on every other one if `crumbs`. */
function spiral(x: number, z: number, top: number, n: number, r: number, rise: number, crumbs: boolean): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + i * 0.6;
    const cx = Math.round(x + r * Math.cos(a)), cz = Math.round(z + r * Math.sin(a));
    const h = top + rise * (i + 1);
    out.push(box('platform', cx - 1, cz - 1, cx + 1, cz + 1, h, { bottom: h - 0.5 }));
    if (crumbs && i % 2) out.push(one('crumb', cx, cz, h));
  }
  return out;
}

export const STAMPS: Stamp[] = [
  { id: 'stack2', label: 'Crates x2', make: (x, z, top) => [one('crate', x, z, top), one('crate', x, z, top + 1)] },
  { id: 'stack3', label: 'Crates x3', make: (x, z, top) => [one('crate', x, z, top), one('crate', x, z, top + 1), one('crate', x, z, top + 2)] },
  { id: 'barrels', label: 'Barrel group', make: (x, z, top) => [one('barrel', x, z, top), one('barrel', x + 1, z, top), one('barrel', x, z + 1, top)] },
  { id: 'wall3', label: 'Crate wall', make: (x, z, top) => [0, 1, 2].flatMap((i) => [one('crate', x + i, z, top), one('crate', x + i, z, top + 1)]) },
  { id: 'stones', label: 'Stepping stones', make: (x, z, top) => [0, 1, 2, 3].map((i) => box('stone', x, z - i * 3 - 2, x + 2, z - i * 3, top)) },
  { id: 'stairs', label: 'Staircase up', make: (x, z, top) => [box('stairs', x, z - 6, x + 4, z, top + 3, { bottom: top, dir: 'n' })] },
  { id: 'ramp', label: 'Ramp up', make: (x, z, top) => [box('ramp', x, z - 6, x + 4, z, top + 3, { bottom: top, dir: 'n' })] },
  { id: 'bridge', label: 'Plank bridge', make: (x, z, top) => [box('plank', x, z - 10, x + 2, z, top)] },
  { id: 'island', label: 'Island + prize', make: (x, z, top) => [box('platform', x, z, x + 5, z + 5, top + 0.5), one('cap', x + 2, z + 2, top + 0.5)] },
  { id: 'pillars', label: 'Pillar ring', make: (x, z, top) => [[0, 0], [4, 0], [0, 4], [4, 4]].map(([dx, dz]) => box('pillar', x + dx, z + dz, x + dx + 1, z + dz + 1, top + 4)) },
  { id: 'arena', label: 'Roach arena', make: (x, z, top) => [box('tile', x - 5, z - 5, x + 5, z + 5, top), one('roach', x - 2, z, top), one('roach', x + 2, z, top), one('roach', x, z - 2, top)] },
  { id: 'toads', label: 'Toad pair', make: (x, z, top) => [one('toad', x - 3, z, top), one('toad', x + 3, z, top)] },
  { id: 'spiral', label: 'Spiral climb', make: (x, z, top) => spiral(x, z, top, 12, 5, 1, false) },
  { id: 'tower', label: 'Tower + spiral', make: (x, z, top) => [box('pillar', x - 1, z - 1, x + 1, z + 1, top + 13), ...spiral(x, z, top, 12, 5, 1, false), one('relic', x, z, top + 13)] },
  { id: 'ring', label: 'Slab ring', make: (x, z, top) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * Math.PI * 2;
    const cx = Math.round(x + Math.cos(a) * 6), cz = Math.round(z + Math.sin(a) * 6);
    return box('platform', cx - 1, cz - 1, cx + 1, cz + 1, top + 2, { bottom: top + 1.5 });
  }) },
  { id: 'pillarsteps', label: 'Pillar steps', make: (x, z, top) => [0, 1, 2, 3, 4].map((i) => box('pillar', x, z - i * 4 - 2, x + 2, z - i * 4, top + 1.5 * (i + 1))) },
  { id: 'zigzag', label: 'Zigzag planks', make: (x, z, top) => [0, 1, 2, 3].map((i) => (i % 2 === 0 ? box('plank', x, z - i * 4 - 4, x + 6, z - i * 4 - 2, top + 2, { bottom: top + 1.5 }) : box('plank', x + 4, z - i * 4 - 4, x + 6, z - i * 4, top + 2, { bottom: top + 1.5 }))) },
  { id: 'moat', label: 'Moat island', make: (x, z, top) => [
    box('water', x - 7, z - 7, x + 7, z - 4, top), box('water', x - 7, z + 4, x + 7, z + 7, top),
    box('water', x - 7, z - 4, x - 4, z + 4, top), box('water', x + 4, z - 4, x + 7, z + 4, top),
    box('tile', x - 4, z - 4, x + 4, z + 4, top + 0.5, { bottom: top - 1 }), box('bridge', x - 1, z + 4, x + 1, z + 7, top),
    one('cap', x, z, top + 0.5),
  ].map((p) => (p.t === 'water' ? { ...p, top: top - 0.85 } : p)) },
  { id: 'trail', label: 'Crumb trail', make: (x, z, top) => [0, 1, 2, 3, 4].map((i) => one('crumb', x, z - i * 2, top)) },
];

export const stampById = (id: string): Stamp | undefined => STAMPS.find((s) => s.id === id);
