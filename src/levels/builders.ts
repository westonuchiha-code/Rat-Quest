/** Small helpers for writing levels. */
import { Box, Kind, WALL_HEIGHT, extent } from '../world/layout';
import type { CollectibleDef, CollectibleKind } from '../world/collectibles';

/** A room: one floor slab and four walls, with inner faces at +/-halfX and +/-halfZ (a square room gives one number). */
export function room(halfX: number, floor = true, halfZ = halfX, wallHeight = WALL_HEIGHT): Box[] {
  const X = halfX;
  const Z = halfZ;
  const out: Box[] = [];
  if (floor) out.push(extent('floor', -X, X, -1, 0, -Z, Z));
  out.push(extent('wall', -X, X, 0, wallHeight, -Z - 1, -Z));
  out.push(extent('wall', -X, X, 0, wallHeight, Z, Z + 1));
  out.push(extent('wall', X, X + 1, 0, wallHeight, -Z - 1, Z + 1));
  out.push(extent('wall', -X - 1, -X, 0, wallHeight, -Z - 1, Z + 1));
  return out;
}

/** A solid block given by its extents. */
export function slab(kind: Kind, x0: number, x1: number, z0: number, z1: number, top: number, bottom = 0): Box {
  return extent(kind, x0, x1, bottom, top, z0, z1);
}

/**
 * A flight of steps. It starts at (x0..x1, zStart) and climbs toward `dir` (+1 or -1 along z), `count` steps,
 * each `rise` high and `tread` long. `base` is the height it starts from; steps are solid down to `bottom`.
 */
export function stairs(x0: number, x1: number, zStart: number, dir: 1 | -1, count: number, rise: number, tread: number, base = 0, bottom = base): Box[] {
  const out: Box[] = [];
  for (let k = 0; k < count; k++) {
    const za = zStart + dir * k * tread;
    const zb = zStart + dir * (k + 1) * tread;
    out.push(extent('stone', x0, x1, bottom, base + rise * (k + 1), Math.min(za, zb), Math.max(za, zb)));
  }
  return out;
}

/** A box given by its centre on the floor: x, z, width, depth and the height of its top. */
export function block(kind: Kind, x: number, z: number, w: number, d: number, top: number, bottom = 0): Box {
  return extent(kind, x - w / 2, x + w / 2, bottom, top, z - d / 2, z + d / 2);
}

/** A one-unit wooden crate standing on the floor. */
export function crate(x: number, z: number): Box {
  return extent('rubble', x - 0.5, x + 0.5, 0, 1, z - 0.5, z + 0.5);
}

/** Hands out collectible ids like "caps:cap:03" and collects the definitions. */
export class Items {
  readonly list: CollectibleDef[] = [];
  private readonly counts: Record<CollectibleKind | 'hunk', number> = { crumb: 0, cap: 0, relic: 0, hunk: 0 };

  constructor(private readonly prefix: string) {}

  /**
   * `worth`: a crumb that counts as more than one is a hunk of cheese. Hunks are numbered by themselves (`...:hunk:01`),
   * so a level that trades its crumbs for hunks does not hand an old save the new ones already picked up.
   */
  add(kind: CollectibleKind, x: number, y: number, z: number, inCrate?: number, worth = 1): string {
    const name = kind === 'crumb' && worth > 1 ? 'hunk' : kind;
    this.counts[name]++;
    const id = `${this.prefix}:${name}:${String(this.counts[name]).padStart(2, '0')}`;
    this.list.push({ id, kind, x, y, z, ...(inCrate === undefined ? {} : { crate: inCrate }), ...(worth > 1 ? { worth } : {}) });
    return id;
  }
}

export const ITEM_Y = 0.5; // item centre height over a floor
