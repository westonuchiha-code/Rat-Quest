/**
 * Doors as plain data. A door is a flat panel on a wall; stepping up to it (once it is open) takes him to the next level.
 */

export interface DoorSpec {
  x: number;
  z: number;
  /** Yaw of the door panel. Its face points into the room. */
  yaw: number;
  width: number;
  height: number;
  /** Height of the floor the door stands on. Default 0. */
  y?: number;
}

export type Side = 'north' | 'south' | 'east' | 'west';

/** A door on the inside face of a wall of a square room. `along` slides it along the wall. */
export function doorOn(side: Side, half: number, along = 0, halfZ = half, y = 0): DoorSpec {
  const size = { width: 2.6, height: 3.8, y };
  switch (side) {
    case 'east': return { x: half - 0.08, z: along, yaw: -Math.PI / 2, ...size };
    case 'west': return { x: -half + 0.08, z: along, yaw: Math.PI / 2, ...size };
    case 'north': return { x: along, z: -halfZ + 0.08, yaw: 0, ...size };
    case 'south': return { x: along, z: halfZ - 0.08, yaw: Math.PI, ...size };
  }
}

export const DOOR_REACH = 1.3; // how close to the door's middle he must be to step through

/** True when a point is at the foot of a door, close enough to go through. */
export function atDoor(door: DoorSpec, px: number, pz: number): boolean {
  // The door faces into the room along its yaw, so "forward" is the direction a standing rat would face.
  const fx = Math.sin(door.yaw);
  const fz = Math.cos(door.yaw);
  const dx = px - door.x;
  const dz = pz - door.z;
  const ahead = dx * fx + dz * fz; // how far in front of the wall
  const across = Math.abs(dx * fz - dz * fx);
  return ahead < DOOR_REACH + 0.6 && across < DOOR_REACH;
}

/** Where the camera stands to watch a door appear: in front of it, a little above, looking at its middle. */
export function doorCamera(door: DoorSpec, distance = 8): { pos: [number, number, number]; look: [number, number, number] } {
  const fx = Math.sin(door.yaw);
  const fz = Math.cos(door.yaw);
  return {
    pos: [door.x + fx * distance, (door.y ?? 0) + 3.2, door.z + fz * distance],
    look: [door.x, (door.y ?? 0) + door.height / 2, door.z],
  };
}
