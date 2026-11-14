/**
 * My Levels: the levels made in the builder, kept on this device. Each has an id ("my-1", "my-2"...) that the game uses
 * like any other level id, so they show in the LEVELS menu and can hang on Club doors.
 */
import { CustomLevel, parseCustom } from './custom';

export const LIBRARY_KEY = 'ratquest.mylevels.v1';

export interface MyLevel {
  id: string;
  level: CustomLevel;
}

interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class MyLevels {
  private items: MyLevel[] = [];
  /** Bumped on every change, so the game knows to rebuild what it made from these. */
  version = 0;

  constructor(private readonly storage: Store | null) {
    try {
      const d = JSON.parse(storage?.getItem(LIBRARY_KEY) ?? '[]') as unknown;
      if (Array.isArray(d)) {
        for (const e of d) {
          const level = e && typeof e.id === 'string' ? parseCustom(JSON.stringify(e.level)) : null;
          if (level && /^my-\d+$/.test(e.id)) this.items.push({ id: e.id, level });
        }
      }
    } catch {
      // A broken library is ignored.
    }
  }

  list(): MyLevel[] {
    return this.items;
  }

  get(id: string): MyLevel | undefined {
    return this.items.find((m) => m.id === id);
  }

  /** Saves the level under `id`, or as a new one when id is null or unknown. Returns its id. */
  put(id: string | null, level: CustomLevel): string {
    const copy = parseCustom(JSON.stringify(level)) ?? level;
    const have = id ? this.items.find((m) => m.id === id) : undefined;
    if (have) have.level = copy;
    else {
      const n = this.items.reduce((m, it) => Math.max(m, Number(it.id.slice(3)) || 0), 0) + 1;
      id = `my-${n}`;
      this.items.push({ id, level: copy });
    }
    // Only one level per Club door: the newest claim wins.
    if (copy.hubDoor) for (const m of this.items) if (m.id !== id && m.level.hubDoor === copy.hubDoor) delete m.level.hubDoor;
    this.save();
    return id!;
  }

  remove(id: string): void {
    this.items = this.items.filter((m) => m.id !== id);
    this.save();
  }

  private save(): void {
    this.version++;
    try {
      this.storage?.setItem(LIBRARY_KEY, JSON.stringify(this.items));
    } catch {
      // Saving is best effort.
    }
  }
}
