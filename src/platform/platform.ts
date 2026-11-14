/**
 * Everything the game needs from the machine it runs on, behind one door.
 * In a browser these do the closest thing (or nothing). In the Steam build, a preload script puts `window.ratquestHost`
 * in place and the same calls reach Steam: achievements, quitting, fullscreen.
 */

export type AchievementId = 'FIRST_CLEAR' | 'PERFECT_LEVEL';

interface Host {
  steam?: boolean;
  /** Running on a Steam Deck (Steam says so, or SteamOS set SteamDeck=1). */
  steamDeck?: boolean;
  /** What Steam Input says the first controller really is: 'PS5Controller', 'SteamDeckController', ... or null. */
  padType?(): Promise<string | null>;
  activateAchievement?(id: string): void;
  setFullscreen?(on: boolean): void;
  isFullscreen?(): boolean;
  quit?(): void;
}

function host(): Host | undefined {
  return (globalThis as { ratquestHost?: Host }).ratquestHost;
}

const given = new Set<string>();

export const platform = {
  /** True when running inside the Steam/desktop wrapper. */
  get desktop(): boolean {
    return !!host();
  },
  /** True on a Steam Deck. */
  get steamDeck(): boolean {
    return !!host()?.steamDeck;
  },
  /** Asks Steam what the controller in his hands really is (Steam shows every pad to the game as an Xbox pad). */
  async padType(): Promise<string | null> {
    try {
      return (await host()?.padType?.()) ?? null;
    } catch {
      return null;
    }
  },
  /** Gives an achievement. Safe to call again and again: each is sent once per run. */
  achieve(id: AchievementId): void {
    if (given.has(id)) return;
    given.add(id);
    try {
      host()?.activateAchievement?.(id);
    } catch {
      // Steam being unavailable must never stop the game.
    }
  },
  isFullscreen(): boolean {
    return host()?.isFullscreen?.() ?? !!document.fullscreenElement;
  },
  toggleFullscreen(): void {
    const h = host();
    if (h?.setFullscreen && h.isFullscreen) {
      h.setFullscreen(!h.isFullscreen());
      return;
    }
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      // Some embedded viewers forbid fullscreen.
    }
  },
  /** Closes the game (desktop only; a browser tab is left alone). */
  quit(): void {
    host()?.quit?.();
  },
};
