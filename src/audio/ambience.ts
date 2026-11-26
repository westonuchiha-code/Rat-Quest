/**
 * The worlds' own sound, apart from the music: a quiet bed under everything (water in the drains, the Foundry's machines,
 * wind in the Hollows, the cold of the Keep) and now and then a far-off noise (a drip, a clank, pebbles, a chain, a bell).
 * Spot sounds that depend on where he stands (lava, braziers) are worked out in main from distances.
 * Plain logic: which bed, how loud, and which noises are due; main plays them.
 */
import type { SfxName } from './synth';

export interface FarNoise {
  name: SfxName;
  /** Seconds between one and the next (picked at random in this range). */
  every: [number, number];
  vol: [number, number];
  rate: [number, number];
  verb: number;
}

export interface WorldSound {
  bed: SfxName | null;
  bedVol: number;
  far: FarNoise[];
}

const drips: FarNoise = { name: 'drip', every: [2.5, 7], vol: [0.15, 0.35], rate: [0.8, 1.3], verb: 0.5 };

/** By the level's look (its theme), and the Club apart. */
export const WORLD_SOUND: Record<string, WorldSound> = {
  sewer: { bed: 'drain', bedVol: 0.16, far: [drips] },
  foundry: {
    bed: 'machine',
    bedVol: 0.2,
    far: [
      { name: 'clank', every: [4, 10], vol: [0.1, 0.26], rate: [0.75, 1.2], verb: 0.85 },
      { name: 'hiss', every: [7, 15], vol: [0.06, 0.15], rate: [0.85, 1.15], verb: 0.6 },
    ],
  },
  cave: {
    bed: 'wind',
    // (Half what it was: 0.2. It is a hiss, and the one bed that is; he found it "super annoying" where it did not belong.)
    bedVol: 0.1,
    far: [
      { name: 'drip', every: [3, 8], vol: [0.18, 0.4], rate: [0.55, 0.95], verb: 0.95 },
      { name: 'pebbles', every: [9, 20], vol: [0.08, 0.2], rate: [0.8, 1.2], verb: 0.85 },
    ],
  },
  keep: {
    bed: 'hall',
    bedVol: 0.22,
    far: [
      { name: 'chainClink', every: [5, 12], vol: [0.08, 0.2], rate: [0.85, 1.15], verb: 0.95 },
      { name: 'toll', every: [22, 45], vol: [0.1, 0.18], rate: [0.95, 1.05], verb: 0.95 },
    ],
  },
  mine: { bed: null, bedVol: 0, far: [drips] },
  dungeon: { bed: null, bedVol: 0, far: [drips] },
  // THE GAME's own areas (2026-11-26; a level asks for one of these by name, `LevelDef.sound`). Both are drains, so
  // both keep the drain's bed and its drips; each has noises of its own over them.
  // FLOTSAM: lived in. A toad somewhere off in the reeds, and the wreck's boards creaking.
  flotsam: {
    bed: 'drain',
    bedVol: 0.13,
    far: [
      drips,
      { name: 'croak', every: [9, 22], vol: [0.06, 0.16], rate: [0.8, 1.1], verb: 0.7 },
      { name: 'plank', every: [12, 26], vol: [0.05, 0.12], rate: [0.6, 0.85], verb: 0.6 },
    ],
  },
  // THE SLUICE: water going down into the dark, louder; the bridge's chains; iron somewhere below.
  sluice: {
    bed: 'drain',
    bedVol: 0.22,
    far: [
      { name: 'drip', every: [2, 6], vol: [0.16, 0.36], rate: [0.6, 1.0], verb: 0.9 },
      { name: 'chainClink', every: [6, 14], vol: [0.08, 0.2], rate: [0.8, 1.1], verb: 0.9 },
      { name: 'clank', every: [18, 40], vol: [0.05, 0.12], rate: [0.55, 0.75], verb: 0.95 },
    ],
  },
  // Home: just the music and the fire.
  hub: { bed: null, bedVol: 0, far: [] },
};

/**
 * `open`: a place under the open sky of the dream (`sky: 'space'`). It has NO bed and no far-off noises: there is no
 * wind among the stars, and nothing drips there.
 * (The owner, 2026-11-17: "I turn the music all the way down and there's just this white noise that permeates in the
 * background everywhere ... it is annoying the s*** out of me." The dream's levels are built with the cave's theme, for
 * its looks, and so had the cave's WIND under them the whole time: a hiss that rises and falls and never stops.)
 */
export function worldSoundFor(theme: string | undefined, hub: boolean, open = false, own?: string): WorldSound {
  if (own && WORLD_SOUND[own]) return WORLD_SOUND[own];
  if (hub || open) return WORLD_SOUND.hub;
  return WORLD_SOUND[theme ?? 'sewer'] ?? WORLD_SOUND.sewer;
}

/** Keeps time for the far-off noises of one world. */
export class Ambience {
  private timers = new Map<string, number>();
  private current: WorldSound | null = null;

  constructor(private readonly rand: () => number = Math.random) {}

  /** Moves the clocks on; returns the noises due now, with the volume, speed and reverb to play each at. */
  step(dt: number, world: WorldSound): Array<{ name: SfxName; vol: number; rate: number; verb: number }> {
    const pick = (r: [number, number]): number => r[0] + (r[1] - r[0]) * this.rand();
    if (world !== this.current) {
      this.current = world;
      this.timers.clear();
      // A new place: each noise first comes somewhere within its range, not all at once.
      for (const f of world.far) this.timers.set(f.name, pick(f.every));
    }
    const due: Array<{ name: SfxName; vol: number; rate: number; verb: number }> = [];
    for (const f of world.far) {
      const t = (this.timers.get(f.name) ?? 0) - dt;
      if (t <= 0) {
        due.push({ name: f.name, vol: pick(f.vol), rate: pick(f.rate), verb: f.verb });
        this.timers.set(f.name, pick(f.every));
      } else this.timers.set(f.name, t);
    }
    return due;
  }
}
