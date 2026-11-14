/**
 * Test switches: things a developer turns on to try the game (the Workshop sets them). They are never saved and are all
 * off in a real game. Anything that reads one must do nothing different while it is off.
 */
export const DEV = {
  /** Nothing hurts him. */
  god: false,
  /** How fast the game runs: 1, a half or a quarter (to watch an attack come out). */
  slow: 1,
  /** Every door is open, whatever it asks for. */
  openDoors: false,
  /** Bodies and blows are drawn on the floor: how big each creature is, and where each attack reaches. */
  shapes: false,
  /** Creatures stand still (they can still be hit). */
  still: false,
  /** Frames a second and where he is, in the corner. */
  readout: false,
};
export type DevKey = keyof typeof DEV;

/** A few words on what is switched on (for the corner of the screen), or '' when nothing is. */
export function devSummary(): string {
  const on: string[] = [];
  if (DEV.god) on.push('no damage');
  if (DEV.slow !== 1) on.push(`speed x${DEV.slow}`);
  if (DEV.openDoors) on.push('doors open');
  if (DEV.shapes) on.push('hit shapes');
  if (DEV.still) on.push('creatures still');
  return on.join(' · ');
}
