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
    bedVol: 0.2,
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
  // Home: just the music and the fire.
  hub: { bed: null, bedVol: 0, far: [] },
};

export function worldSoundFor(theme: string | undefined, hub: boolean): WorldSound {
  if (hub) return WORLD_SOUND.hub;
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
