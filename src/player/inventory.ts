import { CONSUMABLES } from '../data/consumables';
import type { StorageLike } from '../world/collectibles';

export const INVENTORY_KEY = 'ratquest.inventory.v1';

/** The usable things he is carrying, and how many of each. Saved to storage when it changes. */
export class Inventory {
  private counts = new Map<string, number>();
  private readonly listeners: Array<() => void> = [];

  constructor(private readonly storage: StorageLike | null = null) {
    this.load();
  }

  count(id: string): number {
    return this.counts.get(id) ?? 0;
  }

  /** What he carries, in catalogue order. */
  list(): Array<{ id: string; count: number }> {
    return Object.keys(CONSUMABLES).filter((id) => this.count(id) > 0).map((id) => ({ id, count: this.count(id) }));
  }

  /** Adds one. Returns false when the stack is full or the item is unknown. */
  add(id: string, n = 1): boolean {
    const def = CONSUMABLES[id];
    if (!def || this.count(id) + n > def.maxStack) return false;
    this.counts.set(id, this.count(id) + n);
    this.changed();
    return true;
  }

  /** Takes one away. Returns false when there is none. */
  remove(id: string): boolean {
    if (this.count(id) <= 0) return false;
    const left = this.count(id) - 1;
    if (left === 0) this.counts.delete(id);
    else this.counts.set(id, left);
    this.changed();
    return true;
  }

  reset(): void {
    this.counts = new Map();
    this.changed();
  }

  /** Reads it all again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.counts = new Map();
    this.load();
    for (const fn of this.listeners) fn();
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private changed(): void {
    try {
      this.storage?.setItem(INVENTORY_KEY, JSON.stringify(Object.fromEntries(this.counts)));
    } catch {
      // Saving is best effort.
    }
    for (const fn of this.listeners) fn();
  }

  private load(): void {
    try {
      const raw = this.storage?.getItem(INVENTORY_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Record<string, unknown>;
      for (const [id, n] of Object.entries(data)) {
        const def = CONSUMABLES[id];
        if (def && typeof n === 'number' && n > 0) this.counts.set(id, Math.min(def.maxStack, Math.floor(n)));
      }
    } catch {
      // A broken save is ignored.
    }
  }
}
