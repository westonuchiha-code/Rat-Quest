/**
 * A limit on how many sounds play at once, like the 24 voices of a PlayStation sound chip. When all are busy, the
 * quietest or oldest sound gives way to a new one. Pure bookkeeping, so tests can check it.
 */
export interface VoiceInfo {
  id: number;
  start: number;
  end: number;
  priority: number;
}

export class VoicePool {
  private voices: VoiceInfo[] = [];
  private next = 1;

  constructor(readonly max = 24) {}

  /** Forgets voices that have finished by `now`. */
  prune(now: number): void {
    this.voices = this.voices.filter((v) => v.end > now);
  }

  get count(): number {
    return this.voices.length;
  }

  /**
   * Asks for a voice. Returns the id to use and, if the pool was full, the voice to cut off (or null).
   * A new sound that is less important than everything playing is refused (id 0).
   */
  take(now: number, duration: number, priority: number): { id: number; cut: number | null } {
    this.prune(now);
    let cut: number | null = null;
    if (this.voices.length >= this.max) {
      // Lowest priority goes first; among equals, the one that started earliest.
      let worst = this.voices[0];
      for (const v of this.voices) if (v.priority < worst.priority || (v.priority === worst.priority && v.start < worst.start)) worst = v;
      if (worst.priority > priority) return { id: 0, cut: null };
      cut = worst.id;
      this.voices = this.voices.filter((v) => v.id !== worst.id);
    }
    const id = this.next++;
    this.voices.push({ id, start: now, end: now + duration, priority });
    return { id, cut };
  }

  release(id: number): void {
    this.voices = this.voices.filter((v) => v.id !== id);
  }
}
