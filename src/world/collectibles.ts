/**
 * Collectible tracking: definitions, pickup tests and saving. Pure logic, no three.js, so it runs in node.
 */

export type CollectibleKind = 'crumb' | 'cap' | 'relic'; // cheese crumb (common), bottle cap (uncommon), golden relic (rare)

export interface CollectibleDef {
  id: string;
  kind: CollectibleKind;
  x: number; // x, y, z = centre of the item
  y: number;
  z: number;
  /** If set, the item sits inside that crate (by its order in the level) and cannot be taken until it breaks. */
  crate?: number;
  /**
   * How many it counts as in his purse (1 if not set). A crumb worth more is a HUNK of cheese: one thing, at the end
   * of a route, in place of a trail of crumbs along it.
   */
  worth?: number;
}

export interface LevelDef {
  id: string;
  name: string;
  items: CollectibleDef[];
}

export interface Count {
  have: number;
  total: number;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const STORAGE_KEY = 'ratquest.collectibles.v1';
export const DEFAULT_REACH = 0.45;

/** Returns window.localStorage if it works, otherwise null. Never throws, including under node. */
export function browserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const s = window.localStorage;
    const probe = 'ratquest.probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export class CollectibleTracker {
  private readonly levels: LevelDef[];
  private readonly byId = new Map<string, CollectibleDef>();
  private readonly levelOf = new Map<string, string>();
  private readonly collected = new Set<string>();
  private readonly listeners: Array<() => void> = [];
  private readonly storage: StorageLike | null;

  constructor(levels: LevelDef[], storage: StorageLike | null = null) {
    this.levels = levels;
    this.storage = storage;
    for (const level of levels) {
      for (const item of level.items) {
        if (this.byId.has(item.id)) throw new Error(`Duplicate collectible id: ${item.id}`);
        this.byId.set(item.id, item);
        this.levelOf.set(item.id, level.id);
      }
    }
    this.load();
  }

  /** Reads it all again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.collected.clear();
    this.load();
    for (const cb of this.listeners) cb();
  }

  /** Adds a level, or replaces the one with the same id (used for levels made in the builder). */
  setLevel(level: LevelDef): void {
    const old = this.levels.findIndex((l) => l.id === level.id);
    if (old >= 0) {
      for (const item of this.levels[old].items) {
        this.byId.delete(item.id);
        this.levelOf.delete(item.id);
        this.collected.delete(item.id);
      }
      this.levels.splice(old, 1);
    }
    this.levels.push(level);
    for (const item of level.items) {
      this.byId.set(item.id, item);
      this.levelOf.set(item.id, level.id);
    }
  }

  isCollected(id: string): boolean {
    return this.collected.has(id);
  }

  /** True only if the item was newly collected. Unknown ids return false. */
  collect(id: string): boolean {
    if (!this.byId.has(id) || this.collected.has(id)) return false;
    this.collected.add(id);
    this.changed();
    return true;
  }

  /**
   * Collects every uncollected item of the level that the player touches.
   * The player is a vertical cylinder from feet.y to feet.y + height; each item is a sphere of radius `reach`.
   */
  tryCollect(
    levelId: string,
    feet: { x: number; y: number; z: number },
    radius: number,
    height: number,
    reach: number = DEFAULT_REACH,
    skip?: (item: CollectibleDef) => boolean,
  ): CollectibleDef[] {
    const level = this.levels.find((l) => l.id === levelId);
    if (!level) return [];
    const got: CollectibleDef[] = [];
    const top = feet.y + height;
    for (const item of level.items) {
      if (this.collected.has(item.id) || skip?.(item)) continue;
      const horizontal = Math.max(0, Math.hypot(item.x - feet.x, item.z - feet.z) - radius);
      const vertical = Math.max(0, feet.y - item.y, item.y - top);
      if (horizontal * horizontal + vertical * vertical <= reach * reach) {
        this.collected.add(item.id);
        got.push(item);
      }
    }
    if (got.length) this.changed();
    return got;
  }

  count(levelId: string, kind?: CollectibleKind): Count {
    const level = this.levels.find((l) => l.id === levelId);
    return level ? this.tally(level.items, kind) : { have: 0, total: 0 };
  }

  /** What he has picked up in a level is worth, and what all of it there is worth: each item counted at its `worth`. */
  worth(levelId: string, kind: CollectibleKind): Count {
    const level = this.levels.find((l) => l.id === levelId);
    let have = 0;
    let total = 0;
    for (const item of level?.items ?? []) {
      if (item.kind !== kind) continue;
      total += item.worth ?? 1;
      if (this.collected.has(item.id)) have += item.worth ?? 1;
    }
    return { have, total };
  }

  /** Counts across all levels. */
  totals(kind?: CollectibleKind): Count {
    const all: CollectibleDef[] = [];
    for (const level of this.levels) all.push(...level.items);
    return this.tally(all, kind);
  }

  /** Clears one level or everything, and saves. */
  reset(levelId?: string): void {
    if (levelId === undefined) {
      this.collected.clear();
    } else {
      for (const id of [...this.collected]) {
        if (this.levelOf.get(id) === levelId) this.collected.delete(id);
      }
    }
    this.changed();
  }

  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }

  private tally(items: CollectibleDef[], kind?: CollectibleKind): Count {
    let have = 0;
    let total = 0;
    for (const item of items) {
      if (kind && item.kind !== kind) continue;
      total++;
      if (this.collected.has(item.id)) have++;
    }
    return { have, total };
  }

  private changed(): void {
    this.save();
    for (const cb of this.listeners) cb();
  }

  private load(): void {
    if (!this.storage) return;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: unknown = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      const list = (data as { collected?: unknown }).collected;
      if (!Array.isArray(list)) return;
      for (const id of list) {
        if (typeof id === 'string' && this.byId.has(id)) this.collected.add(id); // unknown ids are dropped
      }
    } catch {
      // corrupt or unreadable save: start fresh
    }
  }

  private save(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, collected: [...this.collected] }));
    } catch {
      // storage full or blocked: ignore
    }
  }
}
