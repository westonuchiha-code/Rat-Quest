/**
 * WHAT HE DID IN ONE AIR ON HIS SHIELD, by name (BACKLOG B4, 2026-11-18: "the trick's name shown as he lands").
 * The controller counts tricks only as speed; this keeps what they were, from what the game already sees each frame:
 * a kickflip begun, a spin begun, the guard held long enough in the air for a grab. Landed, `landed()` gives their
 * names joined ("KICKFLIP + 720 + GRAB"); a bail or a ride ended throws them away. Plain logic: tested in node.
 */
export type TrickKind = 'flip' | 'spin' | 'grab';

/** What each is called. Spins together are one trick, by how far round: 360, 720, 1080... */
export const TRICK_NAMES = { flip: 'KICKFLIP', grab: 'SHIELD GRAB' } as const;

export class TrickLog {
  private done: TrickKind[] = [];
  private grabFor = 0;
  private grabbed = false;

  /** A kickflip or a spin is begun (one counts when it is begun: one not finished by the landing is a bail). */
  begin(kind: 'flip' | 'spin'): void {
    this.done.push(kind);
  }
  /** Each frame in the air: whether the guard is held for a grab, and how long a grab must be held to count. True the frame a grab counts. */
  air(dt: number, holding: boolean, need: number): boolean {
    this.grabFor = holding ? this.grabFor + dt : 0;
    if (!this.grabbed && this.grabFor >= need) {
      this.grabbed = true;
      this.done.push('grab');
      return true;
    }
    return false;
  }
  /** On the ground again: a new air starts fresh. */
  ground(): void {
    this.grabFor = 0;
    this.grabbed = false;
  }
  /** What there is to show for this air, in the order he did it ("" if nothing). Clears it. */
  landed(): string {
    const out: string[] = [];
    let spins = 0;
    const flush = (): void => {
      if (spins) out.push(String(360 * spins));
      spins = 0;
    };
    for (const k of this.done) {
      if (k === 'spin') {
        spins++;
        continue;
      }
      flush();
      out.push(TRICK_NAMES[k]);
    }
    flush();
    this.clear();
    return out.join(' + ');
  }
  /** Bailed, or off the shield: nothing to show. */
  clear(): void {
    this.done = [];
    this.ground();
  }
  /** How many it holds (for tests). */
  get count(): number {
    return this.done.length;
  }
}
