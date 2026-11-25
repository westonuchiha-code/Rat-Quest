import { ITEMS, STARTING_GEAR, Slot } from '../data/equipment';
import type { StorageLike } from '../world/collectibles';

export const EQUIPMENT_KEY = 'ratquest.equipment.v1';

/** What he owns and what he is wearing. Saved to storage when it changes. */
export class Equipment {
  private readonly owned = new Set<string>(Object.values(STARTING_GEAR));
  private readonly worn: Record<Slot, string> = { ...STARTING_GEAR };
  private strict = false;
  private readonly listeners: Array<() => void> = [];

  constructor(private readonly storage: StorageLike | null = null) {
    this.load();
  }

  owns(id: string): boolean {
    return this.owned.has(id);
  }

  /** The id of the item worn in a slot. */
  equipped(slot: Slot): string {
    return this.worn[slot];
  }

  /** Adds an item to his inventory. It is not put on: that is done from the menu. Returns false if he already had it or it does not exist. */
  give(id: string): boolean {
    const item = ITEMS[id];
    if (!item || this.owned.has(id)) return false;
    this.owned.add(id);
    this.changed();
    return true;
  }

  /** The ids he owns for a slot, in catalogue order. */
  ownedIn(slot: Slot): string[] {
    return Object.values(ITEMS).filter((i) => i.slot === slot && this.owned.has(i.id)).map((i) => i.id);
  }

  /** Puts on something he owns. */
  equip(id: string): boolean {
    const item = ITEMS[id];
    if (!item || !this.owned.has(id) || this.worn[item.slot] === id) return false;
    this.worn[item.slot] = id;
    this.changed();
    return true;
  }

  /** Back to starting gear, for testing. */
  reset(): void {
    this.strict = false;
    this.owned.clear();
    for (const id of Object.values(STARTING_GEAR)) this.owned.add(id);
    Object.assign(this.worn, STARTING_GEAR);
    this.changed();
  }

  /**
   * A NEW GAME: only `start`, worn. (The Hall's file is `reset()`: the Rat Sword and the Rat Shield.) Kept `strict`:
   * read back, he owns what was saved and no more (otherwise every file is given the starting sword and shield).
   */
  resetTo(start: Record<Slot, string>): void {
    this.owned.clear();
    for (const id of Object.values(start)) this.owned.add(id);
    Object.assign(this.worn, start);
    this.strict = true;
    this.changed();
  }

  /** Reads it all again from storage (another save file was chosen). Nothing is written. */
  reload(): void {
    this.strict = false;
    this.owned.clear();
    for (const id of Object.values(STARTING_GEAR)) this.owned.add(id);
    Object.assign(this.worn, STARTING_GEAR);
    this.load();
    for (const fn of this.listeners) fn();
  }

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  private changed(): void {
    this.save();
    for (const fn of this.listeners) fn();
  }

  private save(): void {
    try {
      this.storage?.setItem(EQUIPMENT_KEY, JSON.stringify({ owned: [...this.owned], worn: this.worn, strict: this.strict || undefined }));
    } catch {
      // Saving is best effort.
    }
  }

  private load(): void {
    try {
      const raw = this.storage?.getItem(EQUIPMENT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { owned?: string[]; worn?: Partial<Record<Slot, string>>; strict?: boolean };
      if (data.strict) {
        this.strict = true;
        this.owned.clear();
      }
      for (const id of data.owned ?? []) if (ITEMS[id]) this.owned.add(id);
      for (const slot of Object.keys(STARTING_GEAR) as Slot[]) {
        const id = data.worn?.[slot];
        if (id && ITEMS[id]?.slot === slot && this.owned.has(id)) this.worn[slot] = id;
      }
    } catch {
      // A broken save is ignored.
    }
  }
}
