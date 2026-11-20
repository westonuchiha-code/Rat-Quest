/**
 * THE COIL'S BEAT (2026-11-20; the owner: "a room with a big Tesla coil in it ... you have to platform your way up
 * through this room on metal platforms but the Tesla coils are zapping everywhere and they will zap the platforms and
 * if you're on the platform it electrocutes you ... The Tesla coil should have a predictable rhythm to it ... some sort
 * of hip hop beat with the Tesla coil so that you understand when the platforms will and won't be electrocuted").
 *
 * A boom-bap bar of sixteen steps at 90 beats a minute. The coil plays it:
 *   KICK   the low hits, the bass line (a note each, four bars round): it throws a bolt down at every KICK plate.
 *   SNARE  the backbeat (steps 5 and 13): a crack, and a bolt at every SNARE plate.
 *   HAT    off-beat sparks crawling round the coil's top: harmless, they keep time.
 * A plate is LIVE for a moment after its hit, and glows brighter through the beat before it (the warning). SAFE plates
 * are never hit. Everything goes by the room's clock: what is drawn, heard and felt agree.
 * world/hazards.ts has the `teslacoil` and `zapplate` parts act on him; hazardModels.ts draws them.
 */

export type Lane = 'kick' | 'snare' | 'safe';

export const COIL = {
  bpm: 90,
  steps: 16,
  /** The bar, by step (0 to 15): which steps each part plays. */
  kick: [0, 7, 10] as readonly number[],
  snare: [4, 12] as readonly number[],
  hat: [2, 6, 9, 14] as readonly number[],
  /** The kicks' notes, a bar to a line, four bars round: semitones from the C an octave under middle C. */
  bass: [[0, 0, 3], [-2, -2, 2], [0, 0, 5], [-5, -3, 2]] as ReadonlyArray<readonly number[]>,
  /** The snare's note (the crack has a pitch too). */
  snareNote: 12,
  /** Seconds a plate stays live after its hit; seconds of warning glow before it. */
  live: 0.22,
  warn: 0.5,
} as const;

/** Seconds a step lasts (a sixteenth note), and a bar. */
export const STEP = 60 / COIL.bpm / 4;
export const BAR = STEP * COIL.steps;

const mod = (a: number, b: number): number => ((a % b) + b) % b;

/** Where the beat is: which bar (counting up), which step in it, and how far into that step (0..1). */
export function beatAt(time: number): { bar: number; step: number; frac: number } {
  const s = time / STEP;
  const whole = Math.floor(s);
  return { bar: Math.floor(whole / COIL.steps), step: mod(whole, COIL.steps), frac: s - whole };
}

/**
 * A lane's state now: `live` (a plate of it shocks whoever stands on it) and `warn` (0..1, how close its next hit is,
 * for the glow: it rises over the warning time to 1 at the hit). A safe lane is never either.
 */
export function laneState(lane: Lane, time: number): { live: boolean; warn: number } {
  if (lane === 'safe') return { live: false, warn: 0 };
  const into = mod(time, BAR);
  let live = false;
  let warn = 0;
  for (const step of COIL[lane]) {
    for (const at of [step * STEP, step * STEP + BAR, step * STEP - BAR]) {
      const since = into - at;
      if (since >= 0 && since < COIL.live) live = true;
      const until = at - into;
      if (until > 0 && until <= COIL.warn) warn = Math.max(warn, 1 - until / COIL.warn);
    }
  }
  return { live, warn: live ? 1 : warn };
}

export type CoilHit = { part: 'kick' | 'snare' | 'hat'; note: number; at: number };

/** The hits between two moments (each step crossed: `before` < its time <= `now`), in order, with their notes. */
export function hitsBetween(before: number, now: number): CoilHit[] {
  const out: CoilHit[] = [];
  // (Nothing over a long gap, as after a pause: the beat is not played back all at once. A bar and a little is allowed.)
  if (!(now > before) || now - before > BAR * 1.5) return out;
  const first = Math.floor(before / STEP) + 1;
  const last = Math.floor(now / STEP);
  for (let n = first; n <= last; n++) {
    const step = mod(n, COIL.steps);
    const bar = Math.floor(n / COIL.steps);
    const at = n * STEP;
    const k = COIL.kick.indexOf(step);
    if (k >= 0) out.push({ part: 'kick', note: COIL.bass[mod(bar, COIL.bass.length)][k], at });
    if (COIL.snare.includes(step)) out.push({ part: 'snare', note: COIL.snareNote, at });
    if (COIL.hat.includes(step)) out.push({ part: 'hat', note: 24, at });
  }
  return out;
}

/** The most recent hit of a part at or before `time`, and how long ago (for drawing the bolt as it fades). */
export function lastHit(part: 'kick' | 'snare' | 'hat', time: number): { ago: number; note: number } {
  const n = Math.floor(time / STEP);
  for (let back = 0; back <= COIL.steps; back++) {
    const k = n - back;
    const step = mod(k, COIL.steps);
    const bar = Math.floor(k / COIL.steps);
    if (part === 'kick') {
      const i = COIL.kick.indexOf(step);
      if (i >= 0) return { ago: time - k * STEP, note: COIL.bass[mod(bar, COIL.bass.length)][i] };
    } else if ((part === 'snare' ? COIL.snare : COIL.hat).includes(step)) return { ago: time - k * STEP, note: part === 'snare' ? COIL.snareNote : 24 };
  }
  return { ago: Infinity, note: 0 };
}
