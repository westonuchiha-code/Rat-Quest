import type { PickupDef } from '../data/equipment';
import { RING } from './layout';

/** Gear lying around the chamber. */
export function chamberPickups(): PickupDef[] {
  // The highest ring platform is the last one in the ring.
  const at = (i: number, itemId: string): PickupDef => {
    const a = (i / RING.count) * Math.PI * 2;
    return { itemId, x: Math.cos(a) * RING.radius, y: RING.step * (i + 1) + 0.6, z: Math.sin(a) * RING.radius };
  };
  // A scarf waits a few steps lower, on the way up to the helm. The royal scarf is not placed yet.
  return [at(RING.count - 1, 'emberHelm'), at(Math.max(0, RING.count - 4), 'mossScarf')];
}
