/**
 * MUSIC UNDERFOOT (2026-11-20; the owner: "a room ... has those buttons ... but each one of those buttons represents a
 * different sound ... tonal music puzzles ... it'll play some certain sounds and then you have to hit the buttons in
 * the order" and "a keyboard on the floor ... each key ... a real key so that you could play the piano ... through one
 * of those sound chips").
 *
 * Two parts, both decor (world/layout.ts), drawn by world/chamber.ts, and played here:
 *   floorkey  a piano key on the floor: stepped on, it plays its note (semitones from middle C). A black one stands a
 *             little higher, and over a white one it is the black that sounds.
 *   chime     a coloured pad with a note, in an ECHO PUZZLE (`puzzle` names it): one pad of it (slot -1) is its START.
 *             Stepped on, the puzzle plays a tune on its pads, lighting each as it sounds; he answers by stepping on
 *             them in the same order. Right: the next round's tune is one note longer. `rounds` right, it is SOLVED and
 *             every pad of it flashes. Wrong: a buzz, and it waits for the start pad again. Between tunes the pads play
 *             their notes when stepped on, to try them.
 *   bell      (2026-11-20) a bell hung in a frame, struck with the sword (world/strikeables.ts): it sounds its note,
 *             and in a puzzle it is a pad like a chime (one is its start). `strike(pad)`; it counts at the next step.
 * main.ts calls `update` each step with where his feet are, plays what it says (the chip note: audio/synth.ts
 * `chipNote`, faster for higher notes), and has the room show what is lit and pressed (`Chamber.music.show`).
 */

export interface MusicPad {
  /** A bell (2026-11-20) is struck with the sword (world/strikeables.ts), not stepped on: `strike` it. */
  kind: 'key' | 'chime' | 'bell';
  x: number;
  y: number;
  z: number;
  /** Its footprint, across x and along z. */
  w: number;
  d: number;
  /** Semitones from middle C. */
  note: number;
  black?: boolean;
  puzzle?: string;
  /** In a puzzle: which of its pads (0, 1, ...); -1 is its start pad. */
  slot?: number;
}

export type MusicEvent =
  | { kind: 'note'; note: number; pad: number }
  | { kind: 'wrong'; puzzle: string }
  | { kind: 'round'; puzzle: string; round: number }
  | { kind: 'solved'; puzzle: string };

/** How an echo puzzle plays: how many rounds, the first tune's length, the gap between its notes. */
export const ECHO = { rounds: 3, firstLength: 3, gap: 0.55, before: 0.8 } as const;

interface Puzzle {
  id: string;
  /** Its pads by slot, and its start pad (indices into the floor's pads). */
  slots: number[];
  start: number;
  state: 'idle' | 'playing' | 'listening' | 'solved';
  tune: number[];
  step: number;
  timer: number;
  round: number;
  seed: number;
}

/** A pad's note as the chip plays it: how much faster than middle C. */
export const noteRate = (note: number): number => Math.pow(2, note / 12);

export class MusicFloor {
  /** How lit each pad is (0..1), and whether his feet are on it now. */
  readonly lit: number[];
  readonly down: boolean[];
  /** A puzzle solved: its pads flash for a while. */
  readonly flash: number[];
  private readonly puzzles: Puzzle[] = [];

  constructor(readonly pads: readonly MusicPad[], seed = 7) {
    this.lit = pads.map(() => 0);
    this.down = pads.map(() => false);
    this.flash = pads.map(() => 0);
    const ids = [...new Set(pads.filter((p) => p.kind !== 'key' && p.puzzle).map((p) => p.puzzle as string))];
    for (const id of ids) {
      const mine = pads.map((p, i) => [p, i] as const).filter(([p]) => p.kind !== 'key' && p.puzzle === id);
      const start = mine.find(([p]) => p.slot === -1)?.[1] ?? -1;
      const slots = mine.filter(([p]) => (p.slot ?? -1) >= 0).sort((a, b) => (a[0].slot ?? 0) - (b[0].slot ?? 0)).map(([, i]) => i);
      if (start >= 0 && slots.length >= 2) this.puzzles.push({ id, slots, start, state: 'idle', tune: [], step: 0, timer: 0, round: 0, seed: seed + this.puzzles.length * 101 });
    }
  }

  /** What a puzzle is doing (for tests, and for whatever a level hangs on it being solved). */
  stateOf(id: string): Puzzle['state'] | undefined {
    return this.puzzles.find((p) => p.id === id)?.state;
  }
  solved(id: string): boolean {
    return this.stateOf(id) === 'solved';
  }
  /** The tune a puzzle is playing or waiting for, as slots (for tests). */
  tuneOf(id: string): number[] {
    const p = this.puzzles.find((q) => q.id === id);
    return p ? p.tune.map((i) => p.slots.indexOf(i)) : [];
  }

  /** A bell struck: it counts as pressed at the next step. */
  private readonly struck: number[] = [];
  strike(pad: number): void {
    if (this.pads[pad]?.kind === 'bell') this.struck.push(pad);
  }

  /** Which pad his feet are on, if any (a black key over a white one wins). Not a bell: bells are struck. */
  private padUnder(x: number, y: number, z: number): number {
    let best = -1;
    this.pads.forEach((p, i) => {
      if (p.kind === 'bell') return;
      if (Math.abs(x - p.x) > p.w / 2 || Math.abs(z - p.z) > p.d / 2 || Math.abs(y - p.y) > 0.35) return;
      if (best < 0 || (p.black && !this.pads[best].black)) best = i;
    });
    return best;
  }

  private nextTune(p: Puzzle): void {
    const len = ECHO.firstLength + p.round - 1;
    p.tune = [];
    for (let k = 0; k < len; k++) {
      p.seed = (p.seed * 16807) % 2147483647;
      let pick = p.seed % p.slots.length;
      // (Not the same pad three times running: it makes a dull tune.)
      if (k >= 2 && p.tune[k - 1] === p.slots[pick] && p.tune[k - 2] === p.slots[pick]) pick = (pick + 1) % p.slots.length;
      p.tune.push(p.slots[pick]);
    }
    p.state = 'playing';
    p.step = 0;
    p.timer = ECHO.before;
  }

  /** One step: where his feet are, and whether they are on the ground. What happened, to be heard. */
  update(dt: number, feet: { x: number; y: number; z: number }, grounded: boolean): MusicEvent[] {
    const out: MusicEvent[] = [];
    for (let i = 0; i < this.pads.length; i++) {
      this.lit[i] = Math.max(0, this.lit[i] - dt * 2.5);
      this.flash[i] = Math.max(0, this.flash[i] - dt);
    }
    // His feet: on which pad, and was it just now.
    const under = grounded ? this.padUnder(feet.x, feet.y, feet.z) : -1;
    // (A bell struck since the last step is pressed now, before whatever his feet are on.)
    const rung = this.struck.shift();
    const pressed = rung !== undefined ? rung : under >= 0 && !this.down[under] ? under : -1;
    for (let i = 0; i < this.down.length; i++) this.down[i] = i === under;
    const sound = (i: number): void => {
      this.lit[i] = 1;
      out.push({ kind: 'note', note: this.pads[i].note, pad: i });
    };
    // A key, or a chime with no puzzle playing a tune just now: it sounds.
    // (A pad or a bell in no puzzle just sounds: the editor makes those.)
    if (pressed >= 0 && (this.pads[pressed].kind === 'key' || !this.pads[pressed].puzzle)) sound(pressed);
    for (const p of this.puzzles) {
      if (pressed === p.start && p.state !== 'playing') {
        p.round = 1;
        this.nextTune(p);
        this.lit[pressed] = 1;
        continue;
      }
      if (p.state === 'playing') {
        p.timer -= dt;
        if (p.timer <= 0) {
          if (p.step < p.tune.length) {
            sound(p.tune[p.step]);
            p.step++;
            p.timer = ECHO.gap;
          } else {
            p.state = 'listening';
            p.step = 0;
          }
        }
        continue;
      }
      const slot = pressed >= 0 ? p.slots.indexOf(pressed) : -1;
      if (slot < 0) continue;
      sound(pressed);
      if (p.state !== 'listening') continue;
      if (pressed !== p.tune[p.step]) {
        p.state = 'idle';
        out.push({ kind: 'wrong', puzzle: p.id });
        continue;
      }
      p.step++;
      if (p.step < p.tune.length) continue;
      if (p.round >= ECHO.rounds) {
        p.state = 'solved';
        for (const i of [...p.slots, p.start]) this.flash[i] = 2.5;
        out.push({ kind: 'solved', puzzle: p.id });
      } else {
        p.round++;
        out.push({ kind: 'round', puzzle: p.id, round: p.round });
        this.nextTune(p);
        p.timer = ECHO.before + 0.4;
      }
    }
    return out;
  }
}
