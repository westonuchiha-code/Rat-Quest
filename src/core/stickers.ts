/** What the player has met and found, for the sticker book. Saved on the device. */
type Store = { getItem(k: string): string | null; setItem(k: string, v: string): void };

const KEY = 'ratquest.stickers.v1';

export class Discoveries {
  private found = new Set<string>();
  constructor(private store: Store | null = null) {
    this.read();
  }
  private read(): void {
    try {
      const raw = this.store?.getItem(KEY);
      if (raw) for (const id of JSON.parse(raw) as unknown[]) if (typeof id === 'string') this.found.add(id);
    } catch {
      this.found.clear();
    }
  }
  /** Reads it all again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.found.clear();
    this.read();
  }
  has(id: string): boolean {
    return this.found.has(id);
  }
  /** Marks something found. Returns true the first time. */
  add(id: string): boolean {
    if (this.found.has(id)) return false;
    this.found.add(id);
    try {
      this.store?.setItem(KEY, JSON.stringify([...this.found]));
    } catch {
      // No storage: the stickers last for this session.
    }
    return true;
  }
  /** How many found things have ids starting with `prefix` (e.g. 'wedge:'). */
  countPrefix(prefix: string): number {
    let n = 0;
    for (const id of this.found) if (id.startsWith(prefix)) n++;
    return n;
  }
  count(): number {
    return this.found.size;
  }
}
