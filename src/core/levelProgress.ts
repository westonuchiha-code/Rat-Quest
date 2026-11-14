import type { StorageLike } from '../world/collectibles';

export const LEVELS_KEY = 'ratquest.levels.v1';

/** Which levels he has cleared (main goals done), which he has finished completely, and where he was last. Saved as it changes. */
export class LevelProgress {
  private readonly cleared_ = new Set<string>();
  private readonly perfect_ = new Set<string>();
  last: string | null = null;

  constructor(private readonly storage: StorageLike | null = null) {
    this.read();
  }

  /** Reads it all again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.cleared_.clear();
    this.perfect_.clear();
    this.last = null;
    this.read();
  }

  private read(): void {
    try {
      const raw = this.storage?.getItem(LEVELS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as { cleared?: unknown; perfect?: unknown; last?: unknown };
      for (const id of Array.isArray(d.cleared) ? d.cleared : []) if (typeof id === 'string') this.cleared_.add(id);
      for (const id of Array.isArray(d.perfect) ? d.perfect : []) if (typeof id === 'string') this.perfect_.add(id);
      if (typeof d.last === 'string') this.last = d.last;
    } catch {
      // A broken save is ignored.
    }
  }

  cleared(id: string): boolean {
    return this.cleared_.has(id);
  }

  perfect(id: string): boolean {
    return this.perfect_.has(id);
  }

  markCleared(id: string): void {
    this.cleared_.add(id);
    this.save();
  }

  markPerfect(id: string): void {
    this.perfect_.add(id);
    this.save();
  }

  setLast(id: string): void {
    this.last = id;
    this.save();
  }

  /** Forgets one level only (the builder's level is played afresh each time). */
  forget(id: string): void {
    this.cleared_.delete(id);
    this.perfect_.delete(id);
    this.save();
  }

  reset(): void {
    this.cleared_.clear();
    this.perfect_.clear();
    this.last = null;
    this.save();
  }

  private save(): void {
    try {
      this.storage?.setItem(LEVELS_KEY, JSON.stringify({ cleared: [...this.cleared_], perfect: [...this.perfect_], last: this.last }));
    } catch {
      // Saving is best effort.
    }
  }
}
