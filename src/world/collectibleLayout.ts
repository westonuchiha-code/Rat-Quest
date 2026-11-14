/**
 * Where the collectibles sit in the test chamber. Positions come from the ring data where possible.
 * Item coordinates are the item centre.
 */
import { RING } from './layout';
import type { CollectibleDef, CollectibleKind, LevelDef } from './collectibles';

const FLOOR_Y = 0.5; // item centre height over the floor
const pad = (n: number): string => String(n).padStart(2, '0');

export function chamberCollectibles(): LevelDef {
  const items: CollectibleDef[] = [];
  const counters: Record<CollectibleKind, number> = { crumb: 0, cap: 0, relic: 0 };
  const add = (kind: CollectibleKind, x: number, y: number, z: number): void => {
    counters[kind]++;
    items.push({ id: `chamber:${kind}:${pad(counters[kind])}`, kind, x, y, z });
  };

  const ringCentre = (i: number): { x: number; z: number; top: number } => {
    const a = (i / RING.count) * Math.PI * 2;
    return { x: Math.cos(a) * RING.radius, z: Math.sin(a) * RING.radius, top: RING.step * (i + 1) };
  };

  // One crumb floating over the top centre of each ring platform.
  for (let i = 0; i < RING.count; i++) {
    const p = ringCentre(i);
    add('crumb', p.x, p.top + 0.7, p.z);
  }

  // Trail on the floor from the spawn (0, 0, 8) round the pit's south-east corner to the lowest platform.
  const trail: Array<[number, number]> = [
    [1.6, 8],
    [3.2, 8],
    [4.8, 8],
    [6.4, 8],
    [7.8, 7.2],
    [8.6, 5.4],
    [9.0, 3.6],
    [9.4, 2.0],
  ];
  for (const [x, z] of trail) add('crumb', x, FLOOR_Y, z);

  // Bottle caps: corners behind pillars, beside rubble, and one in the enemy arena.
  add('cap', 19.1, FLOOR_Y, 19.1);
  add('cap', -19.1, FLOOR_Y, -19.1);
  add('cap', -19.1, FLOOR_Y, 19.1);
  add('cap', -15.5, FLOOR_Y, 5.4); // beside the rubble at (-15.5, 4)
  add('cap', -4, FLOOR_Y, -18.1); // behind the rubble at (-4, -16.5)
  add('cap', -8.5, FLOOR_Y, 16.5); // enemy arena

  // Relics.
  const top = ringCentre(RING.count - 1);
  add('relic', top.x, top.top + 2.0, top.z); // above the highest platform
  const lo = ringCentre(5);
  const hi = ringCentre(6);
  add('relic', (lo.x + hi.x) / 2, hi.top + 2.8, (lo.z + hi.z) / 2); // in the air between two mid platforms: double jump
  add('relic', 19.1, 0.7, -19.1); // tucked in the far corner between pillar and wall

  return { id: 'chamber', name: 'Test Chamber', items };
}
