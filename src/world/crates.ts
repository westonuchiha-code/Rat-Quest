import type { Aabb } from './collision';

/** What a breakable is: a wooden crate, a barrel, or the joint of a wall pipe. */
export type BreakableType = 'crate' | 'barrel' | 'pipe';

/** A thing that breaks when it is hit. Plain data; the room owns the mesh and the collider. */
export interface Crate {
  type: BreakableType;
  /** Its place in its own list: crates and barrels share one list (in level order), pipes have their own. */
  index: number;
  x: number;
  y: number; // centre height
  z: number;
  /** Half the crate's width: 0.5 for a one-unit crate. */
  half: number;
  alive: boolean;
  /** The solid box that is removed when the crate breaks (pipes keep theirs). */
  aabb: Aabb;
  /** The drawn crate, hidden when it breaks. */
  mesh: { visible: boolean } | null;
  /** Id of the swing or plunge that broke it, to stop one blow breaking it twice. */
  lastSwing: number;
}
