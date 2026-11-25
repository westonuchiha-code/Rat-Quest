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
  /**
   * Locked on to one, the others that are waiting go to these places round him, measured from the locked one: his
   * right and left hands first, then behind each shoulder, then dead behind. ("Enemies moving to your sides when
   * you're locked on to one", 2026-11-17.) They wait there as before; nobody attacks sooner or more often for it.
   */
  flanks: [Math.PI / 2, -Math.PI / 2, 2.5, -2.5, Math.PI],
};

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Which way round him a creature should step to reach the place the director gave it (`Foe.flank`), and how hard:
 * from -most to most, 0 when it is there or has no place. `toPlayer` is its bearing to him (atan2(dx, dz)). The sign
 * is a circle's `circleDir`: the step is (cos(toPlayer), -sin(toPlayer)) times this.
 */
export function flankWay(flank: number | null | undefined, toPlayer: number, most = 1): number {
  if (flank === null || flank === undefined) return 0;
  const off = wrap(flank - toPlayer - Math.PI);
  return -Math.max(-most, Math.min(most, off / 0.3));
}

export class Director {
  private cool = 0;
  private wasAttacking = 0;

  /** `locked`: the one the rat is locked on to, if any. It has first claim on the next attack, and waits a shorter breath for it. */
  /** `duel` (the sewers): while he is locked on to one, never two at him at once, however big the crowd. */
  update(dt: number, foes: Foe[], px: number, pz: number, locked: Foe | null = null, duel = false): void {
    this.cool = Math.max(0, this.cool - dt);
    const takers = foes.filter((e) => e.alive && e.ready !== undefined && Math.hypot(e.x - px, e.z - pz) < DIRECTOR.range);
    const attacking = takers.filter((e) => e.attacking).length;
    // Each new attack starts the breath before the next.
    if (attacking > this.wasAttacking) this.cool = DIRECTOR.gap;
    this.wasAttacking = attacking;
    for (const e of foes) if (e.mayAttack !== undefined) e.mayAttack = false;
    this.flank(takers, px, pz, locked);
    // Far from the rat nobody is taking turns: an enemy on its own patch does as it likes.
    for (const e of foes) if (e.alive && e.ready !== undefined && !takers.includes(e)) e.mayAttack = true;
    const lockedIn = !!locked && takers.includes(locked);
    const slots = (takers.length >= DIRECTOR.crowd && !(duel && lockedIn) ? 2 : 1) - attacking;
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

  /** Hands the waiting ones their places at his sides while he is locked on to another in the fight; takes them away when he is not. */
  private flank(takers: Foe[], px: number, pz: number, locked: Foe | null): void {
    const others = takers.filter((e) => e.flank !== undefined && e !== locked);
    for (const e of others) e.flank = null;
    if (!locked || !locked.alive || Math.hypot(locked.x - px, locked.z - pz) >= DIRECTOR.range) return;
    const front = Math.atan2(locked.x - px, locked.z - pz);
    const free = others.slice();
    // Each place in turn goes to whoever is nearest it already, so nobody crosses in front of him to get there.
    for (let i = 0; free.length > 0; i++) {
      const place = wrap(front + DIRECTOR.flanks[i % DIRECTOR.flanks.length]);
      let best = 0;
      let bestOff = Infinity;
      for (let j = 0; j < free.length; j++) {
        const off = Math.abs(wrap(Math.atan2(free[j].x - px, free[j].z - pz) - place));
        if (off < bestOff) { bestOff = off; best = j; }
      }
      free.splice(best, 1)[0].flank = place;
    }
  }
}
