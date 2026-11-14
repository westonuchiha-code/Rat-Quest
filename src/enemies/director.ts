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
};

export class Director {
  private cool = 0;
  private wasAttacking = 0;

  update(dt: number, foes: Foe[], px: number, pz: number): void {
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
    if (slots <= 0 || this.cool > 0) return;
    // The one who has waited and is nearest goes first.
    const waiting = takers.filter((e) => e.ready).sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
    if (waiting[0]) waiting[0].mayAttack = true;
  }
}
