/**
 * WHAT HE DID IN ONE AIR ON HIS SHIELD (BACKLOG B4, 2026-11-18), from what the game already sees each frame: a
 * kickflip begun, a spin begun, the guard held long enough in the air for a grab. The game uses it for the grab's slap
 * (the frame it counts) and the horn stab as he lands (higher for each trick). (It named them on the screen for a day;
 * the owner had the names taken off.) A bail or a ride ended throws them away. Plain logic: tested in node.
 */
export type TrickKind = 'flip' | 'spin' | 'grab';

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
  /** What he has done in this air, in order. */
  get kinds(): readonly TrickKind[] {
    return this.done;
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
