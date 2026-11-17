/**
 * THINGS TO THROW, lying about in every test room (BACKLOG B1, 2026-11-17). Until now pots and rocks stood only in the
 * practice rooms. Here, by each room's way in, two little heaps: on his right two clay pots and a rock, on his left a
 * pot and a rock. (Pots are light and break; rocks do not, and can be thrown again: world/lifting.ts.)
 *
 * The places were found by a probe of each room's floor (clear of walls, water, creatures, characters, pickups and
 * doors for 2.2 m round), and tests/throwables.ts checks they stay so. To move a heap, change its numbers here; to
 * add a room, add a line. Each heap stands on the floor at the height of the room's start.
 */
import type { LevelDef } from './types';
import { potBox, rockBox } from '../world/layout';

/** Per room: [x, z] of the heap on his right (two pots, a rock) and of the heap on his left (a pot, a rock). */
export const LYING: Record<string, { right: [number, number]; left: [number, number] }> = {
  toybox: { right: [2.8, -52.1], left: [-2.9, -50.4] },
  glowcave: { right: [2.9, 7.4], left: [-2.8, 9.1] },
  cistern: { right: [2.9, 39.6], left: [-2.5, 40.7] },
  coldmain: { right: [2.8, 7.3], left: [-3.5, 8.4] },
  longdrop: { right: [2.8, -7.1], left: [-2.9, -5.4] },
  foundry: { right: [2.8, 42.9], left: [-2.9, 44.6] },
  forge: { right: [3, 8.5], left: [-2.9, 7.9] },
  hollows: { right: [2.8, 41.9], left: [-2.8, 44.1] },
  keep: { right: [2.8, 40.9], left: [-2.9, 42.6] },
  garden: { right: [2.8, 14.9], left: [-2.9, 16.6] },
  hub: { right: [2.8, 14.9], left: [-2.9, 16.6] },
};

/** What lies in a heap, as [kind, dx, dz] from its middle. */
export const HEAPS = {
  right: [['pot', -0.35, -0.3], ['pot', 0.35, -0.3], ['rock', 0, 0.4]],
  left: [['pot', 0, -0.35], ['rock', 0, 0.4]],
} as const;

/** The pots and rocks of one room, where they stand: [kind, x, z, y]. Empty for a room not in the list. */
export function lyingIn(def: LevelDef): Array<['pot' | 'rock', number, number, number]> {
  const at = LYING[def.id];
  if (!at) return [];
  const y = def.spawn.y;
  return (['right', 'left'] as const).flatMap((side) => HEAPS[side].map(([k, dx, dz]) => [k, at[side][0] + dx, at[side][1] + dz, y] as ['pot' | 'rock', number, number, number]));
}

/** Puts them in: each a solid (rubble, so it can be lifted) with nothing inside. Once per level. */
export function layThrowables(all: LevelDef[]): void {
  for (const def of new Set(all)) {
    if ((def as { laid?: boolean }).laid) continue;
    const things = lyingIn(def);
    if (!things.length) continue;
    (def as { laid?: boolean }).laid = true;
    for (const [k, x, z, y] of things) {
      def.solids.push(k === 'pot' ? potBox(x, z, y) : rockBox(x, z, y));
      def.crateContents.push(null);
    }
  }
}
