/**
 * Turn-taking. A crowd that all bites at once is not a fight, it is a coin toss; so enemies that fight up close
 * ask before they attack. One may go at a time (two when four or more are on him), with a breath between attacks.
 * The rest keep circling and wait. Plain data in, flags out, so it runs in tests.
 */
import type { Foe } from './foe';

export const DIRECTOR = {
  /** How near the rat an enemy must be to count as in the fight. */
  range: 9,
  /** With this many in the fight, two may attack at once. */
  crowd: 4,
  /** Seconds after one attack starts before another may. */
  gap: 0.7,
  /**
   * ...before the one he is LOCKED ON to may: it is a duel, and that one presses him harder. (The Ocarina research:
   * its Stalfos "fights harder when it is the one locked on to; ours ignore the lock". 2026-11-16.)
   */
  lockedGap: 0.3,
};

export class Director {
  private cool = 0;
  private wasAttacking = 0;

  /** `locked`: the one the rat is locked on to, if any. It has first claim on the next attack, and waits a shorter breath for it. */
  update(dt: number, foes: Foe[], px: number, pz: number, locked: Foe | null = null): void {
    this.cool = Math.max(0, this.cool - dt);
    const takers = foes.filter((e) => e.alive && e.ready !== undefined && Math.hypot(e.x - px, e.z - pz) < DIRECTOR.range);
    const attacking = takers.filter((e) => e.attacking).length;
    // Each new attack starts the breath before the next.
    if (attacking > this.wasAttacking) this.cool = DIRECTOR.gap;
    this.wasAttacking = attacking;
    for (const e of foes) if (e.mayAttack !== undefined) e.mayAttack = false;
    // Far from the rat nobody is taking turns: an enemy on its own patch does as it likes.
    for (const e of foes) if (e.alive && e.ready !== undefined && !takers.includes(e)) e.mayAttack = true;
    const slots = (takers.length >= DIRECTOR.crowd ? 2 : 1) - attacking;
    if (slots <= 0) return;
    // The one he is locked on to goes first if it is ready, however near the others are, and after a shorter breath.
    if (locked && locked.ready && takers.includes(locked)) {
      if (this.cool <= DIRECTOR.gap - DIRECTOR.lockedGap) locked.mayAttack = true;
      return;
    }
    if (this.cool > 0) return;
    // Otherwise the one who has waited and is nearest.
    const waiting = takers.filter((e) => e.ready).sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
    if (waiting[0]) waiting[0].mayAttack = true;
  }
}
