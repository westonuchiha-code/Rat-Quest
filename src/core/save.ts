import type { StorageLike } from '../world/collectibles';

export const SAVE_KEY = 'ratquest.save.v1';
export const QUICK_KEY = 'ratquest.quicksave.v1';
export const AUTO_KEY = 'ratquest.autosave.v1';

/** The three places a game can be kept: the SAVE GAME button, the quicksave key, and the game's own autosave. */
export type SaveSlot = 'manual' | 'quick' | 'auto';
const KEYS: Record<SaveSlot, string> = { manual: SAVE_KEY, quick: QUICK_KEY, auto: AUTO_KEY };

/** What a saved game remembers about where he is. Gear and collectibles save themselves as they change. */
export interface SaveData {
  x: number;
  y: number;
  z: number;
  facing: number;
  cameraYaw: number;
  hp: number;
  savedAt: number; // milliseconds since 1970
  /** Which level he was in. Older saves have none, which means the first level. */
  levelId?: string;
}

export function writeSave(storage: StorageLike | null, data: SaveData, slot: SaveSlot = 'manual'): boolean {
  if (!storage) return false;
  try {
    storage.setItem(KEYS[slot], JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Returns the saved game, or null if there is none or it is damaged. */
export function readSave(storage: StorageLike | null, slot: SaveSlot = 'manual'): SaveData | null {
  try {
    const raw = storage?.getItem(KEYS[slot]);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<SaveData>;
    const nums = [d.x, d.y, d.z, d.facing, d.cameraYaw, d.hp, d.savedAt];
    if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
    if (d.levelId !== undefined && typeof d.levelId !== 'string') return null;
    return d as SaveData;
  } catch {
    return null;
  }
}

/** The most recent of the three saves, or null if there are none. */
export function newestSave(storage: StorageLike | null): { slot: SaveSlot; data: SaveData } | null {
  let best: { slot: SaveSlot; data: SaveData } | null = null;
  for (const slot of ['manual', 'quick', 'auto'] as SaveSlot[]) {
    const data = readSave(storage, slot);
    if (data && (!best || data.savedAt > best.data.savedAt)) best = { slot, data };
  }
  return best;
}
