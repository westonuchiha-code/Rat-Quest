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

/**
 * The stone frame round a door, as drawn (doorway.ts builds it from these same numbers): a jamb either side of the
 * opening, this thick and standing this far out from the door's own plane, and a step across the foot.
 */
export const DOOR_FRAME = {
  /** How wide each jamb is (alternate stones overhang by `stagger`). */
  jamb: 0.55,
  stagger: 0.07,
  /** The stones are this deep, their middle this far in front of the door's plane. */
  depth: 0.7,
  out: 0.15,
  step: { extra: 0.3, height: 0.1, depth: 1.1, out: 0.35 },
} as const;

/**
 * What of a door's frame is solid: its two jambs, up to where the arch springs, and its step. Boxes in the world
 * (x0, x1, y0, y1, z0, z1), for a door square to the walls. The opening between the jambs is left clear, so he can
 * still walk up to the door.
 */
export function doorFrameBoxes(d: DoorSpec): Array<{ x0: number; x1: number; y0: number; y1: number; z0: number; z1: number }> {
  const F = DOOR_FRAME;
  const y = d.y ?? 0;
  const r = d.width / 2;
  const fx = Math.round(Math.sin(d.yaw)); // the way the door faces
  const fz = Math.round(Math.cos(d.yaw));
  // A box given across the door (a0..a1) and out from it (o0..o1), turned to the way the door faces.
  const box = (a0: number, a1: number, o0: number, o1: number, y0: number, y1: number) => {
    // Across is the door's own x: (cos yaw, -sin yaw) in the world.
    const xs = [d.x + a0 * fz + o0 * fx, d.x + a1 * fz + o1 * fx];
    const zs = [d.z - a0 * fx + o0 * fz, d.z - a1 * fx + o1 * fz];
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0, y1, z0: Math.min(...zs), z1: Math.max(...zs) };
  };
  const front = F.out + F.depth / 2;
  const back = F.out - F.depth / 2;
  const wide = F.jamb + F.stagger;
  const s = F.step;
  return [
    box(-r - wide, -r, back, front, y, y + d.height - r),
    box(r, r + wide, back, front, y, y + d.height - r),
    box(-(d.width + 2 * F.jamb + s.extra) / 2, (d.width + 2 * F.jamb + s.extra) / 2, s.out - s.depth / 2, s.out + s.depth / 2, y, y + s.height),
  ];
}
