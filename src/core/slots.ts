/**
 * Save files: three games side by side on one machine. Each game's things (where he is, gear, wedges, collectibles,
 * money, story, sticker book, time played) live under that file's own storage keys; settings, controls and the player's
 * own levels are shared by all three.
 *
 * File 1 uses the keys the game always used, so a game saved before there were files simply is File 1.
 * Files 2 and 3 put the file's number in the key: 'ratquest.save.v1' becomes 'ratquest.f2.save.v1'.
 */
import type { StorageLike } from '../world/collectibles';

/** The device's storage (localStorage in a browser). Erasing needs removeItem. */
type Base = StorageLike & { removeItem?(key: string): void };

export const FILE_COUNT = 3;
/** THE HALL's own file (the test area): not one of the three games, never listed with them. */
export const HALL_FILE = 9;
/** Which file was played last (shared). */
export const FILE_KEY = 'ratquest.file';
/** Time played and the like, per file. */
export const META_KEY = 'ratquest.meta.v1';

/** The storage keys that belong to one game. Anything else is shared by every file. */
export const GAME_KEYS = [
  'ratquest.save.v1', 'ratquest.quicksave.v1', 'ratquest.autosave.v1',
  'ratquest.collectibles.v1', 'ratquest.equipment.v1', 'ratquest.inventory.v1', 'ratquest.levels.v1',
  'ratquest.story.v1', 'ratquest.wallet.v1', 'ratquest.stickers.v1', META_KEY,
] as const;
const GAME = new Set<string>(GAME_KEYS);

/** Where one of a game's keys lives for a file. Shared keys are left as they are. */
export function fileKey(file: number, key: string): string {
  if (file <= 1 || !GAME.has(key)) return key;
  return `ratquest.f${file}.${key.slice('ratquest.'.length)}`;
}

/**
 * Storage for the file being played: the game's own things go to that file's keys, everything else straight through.
 * The game's stores (gear, collectibles...) are given this, then reload() when the file changes.
 */
export class FileStore implements StorageLike {
  constructor(private readonly base: Base | null, public file = 1) {}
  getItem(key: string): string | null {
    try {
      return this.base?.getItem(fileKey(this.file, key)) ?? null;
    } catch {
      return null;
    }
  }
  setItem(key: string, value: string): void {
    this.base?.setItem(fileKey(this.file, key), value);
  }
  removeItem(key: string): void {
    this.base?.removeItem?.(fileKey(this.file, key));
  }
}

/** The file played last (1 when there is none or it is not a file). */
export function lastFile(base: StorageLike | null): number {
  try {
    const n = Number(base?.getItem(FILE_KEY));
    return Number.isInteger(n) && n >= 1 && n <= FILE_COUNT ? n : 1;
  } catch {
    return 1;
  }
}
export function setLastFile(base: StorageLike | null, file: number): void {
  try {
    base?.setItem(FILE_KEY, String(file));
  } catch {
    /* best effort */
  }
}

export interface FileMeta {
  /** Seconds of play. */
  played: number;
}
export function readMeta(store: StorageLike | null): FileMeta {
  try {
    const d = JSON.parse(store?.getItem(META_KEY) ?? '{}') as Partial<FileMeta>;
    return { played: Math.max(0, Number(d.played) || 0) };
  } catch {
    return { played: 0 };
  }
}
export function writeMeta(store: StorageLike | null, m: FileMeta): void {
  try {
    store?.setItem(META_KEY, JSON.stringify({ played: Math.round(m.played) }));
  } catch {
    /* best effort */
  }
}

/** What the file screen shows for one file. */
export interface FileSummary {
  file: number;
  /** No game in it: never saved, never played. */
  empty: boolean;
  /** Where he was at the last save (a level id), if it was saved. */
  levelId: string | null;
  savedAt: number | null;
  wedges: number;
  /** Seconds. */
  played: number;
}

export function fileSummary(base: StorageLike | null, file: number): FileSummary {
  const get = (k: string): string | null => {
    try {
      return base?.getItem(fileKey(file, k)) ?? null;
    } catch {
      return null;
    }
  };
  // The newest of its three saves (the save button, quicksave, autosave).
  let levelId: string | null = null;
  let savedAt: number | null = null;
  for (const k of ['ratquest.save.v1', 'ratquest.quicksave.v1', 'ratquest.autosave.v1']) {
    try {
      const d = JSON.parse(get(k) ?? 'null') as { savedAt?: number; levelId?: string } | null;
      if (d && typeof d.savedAt === 'number' && (savedAt === null || d.savedAt > savedAt)) {
        savedAt = d.savedAt;
        levelId = typeof d.levelId === 'string' ? d.levelId : null;
      }
    } catch {
      /* a broken save counts as none */
    }
  }
  let wedges = 0;
  try {
    const found = JSON.parse(get('ratquest.stickers.v1') ?? '[]') as unknown[];
    wedges = found.filter((id) => typeof id === 'string' && id.startsWith('wedge:')).length;
  } catch {
    wedges = 0;
  }
  let played = 0;
  try {
    played = Math.max(0, Number((JSON.parse(get(META_KEY) ?? '{}') as Partial<FileMeta>).played) || 0);
  } catch {
    played = 0;
  }
  // A file counts as a game once it has been saved or played. (Before a file is chosen the game writes a few odds and
  // ends at start-up, like the sticker book's first page; those alone do not make it a game.)
  const empty = savedAt === null && played < 1;
  return { file, empty, levelId, savedAt, wedges, played };
}

/** Copies one file over another (the other's game is lost). */
export function copyFile(base: Base | null, from: number, to: number): void {
  if (!base || from === to) return;
  for (const k of GAME_KEYS) {
    const v = base.getItem(fileKey(from, k));
    if (v === null) base.removeItem?.(fileKey(to, k));
    else base.setItem(fileKey(to, k), v);
  }
}

/** Erases a file. */
export function eraseFile(base: Base | null, file: number): void {
  if (!base) return;
  for (const k of GAME_KEYS) base.removeItem?.(fileKey(file, k));
}

/** Time played, short: "under a minute", "42m", "3h 05m". */
export function formatPlayed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}
