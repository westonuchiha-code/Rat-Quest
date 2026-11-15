/**
 * The sound maker. Everything here is plain maths on arrays of numbers, so it runs in tests and nothing is recorded:
 * each sound is a recipe that is drawn into a short sample at a LOW sample rate and squashed to 8 bits, the way sounds
 * were stored for a PlayStation or Nintendo 64. Playing them back at a slightly different speed gives the pitch
 * changes of that era, and the grit comes from the low rate and the coarse steps, not from any effect added afterwards.
 */

import { RECORDED, type Recorded } from "./recorded";

/** Sample rates in use. Most sounds use the higher one; muffled or rumbling ones use the lower. */
export const RATE_HI = 22050;
export const RATE_LO = 11025;

export interface Sample {
  data: Float32Array;
  rate: number;
  /** A sample that repeats seamlessly (water, gushing, instruments). */
  loop: boolean;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;
const sq = (ph: number, duty = 0.5): number => ((ph % 1) < duty ? 1 : -1);
const tri = (ph: number): number => 1 - 4 * Math.abs(((ph % 1) + 1) % 1 - 0.5);
const saw = (ph: number): number => 2 * (((ph % 1) + 1) % 1) - 1;
const sine = (ph: number): number => Math.sin(ph * TAU);
/** Semitones to a ratio. */
const semi = (n: number): number => 2 ** (n / 12);
/** MIDI note number to Hz. */
export const midiHz = (m: number): number => 440 * 2 ** ((m - 69) / 12);

type Gen = (t: number, i: number) => number;

/** Everything a recipe can ask for while it draws. */
interface Ctx {
  r: () => number;
  /** A running phase for a frequency that changes over time. Call with the frequency at this moment. */
  osc(id: number, hz: number): number;
  /** One-pole low-pass: smooths `x` by `k` (0..1, 1 = no filtering). */
  lp(id: number, x: number, k: number): number;
}

function ctxFor(seed: number, rate: number): Ctx {
  const r = rng(seed);
  const phases: number[] = [];
  const lows: number[] = [];
  return {
    r,
    osc(id, hz) {
      phases[id] = (phases[id] ?? 0) + hz / rate;
      return phases[id];
    },
    lp(id, x, k) {
      lows[id] = (lows[id] ?? 0) + (x - (lows[id] ?? 0)) * k;
      return lows[id];
    },
  };
}

/** Draws `seconds` of a recipe, then fades the last few samples, scales to a good level and squashes to `bits`. */
function draw(seconds: number, rate: number, seed: number, gen: (c: Ctx) => Gen, opts: { bits?: number; gain?: number; loop?: boolean } = {}): Sample {
  const n = Math.max(8, Math.round(seconds * rate));
  const c = ctxFor(seed, rate);
  const f = gen(c);
  const data = new Float32Array(n);
  let peak = 1e-6;
  for (let i = 0; i < n; i++) {
    const v = f(i / rate, i);
    data[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  const bits = opts.bits ?? 8;
  const levels = 2 ** (bits - 1);
  const gain = (opts.gain ?? 0.9) / peak;
  const fade = opts.loop ? 0 : Math.min(n, Math.round(rate * 0.004));
  for (let i = 0; i < n; i++) {
    let v = data[i] * gain;
    if (fade && i > n - fade) v *= (n - i) / fade;
    data[i] = Math.round(Math.max(-1, Math.min(1, v)) * (levels - 1)) / levels;
  }
  return { data, rate, loop: !!opts.loop };
}

/** How hard the crate and barrel smashes are pushed into soft clipping: enough to sound heavy, not enough to buzz. */
const DRIVE_C = 0.035;
const DRIVE_B = 0.035;

/** An amplitude envelope: quick attack, then an exponential fall. */
const decay = (t: number, len: number, attack = 0.004): number => Math.min(1, t / attack) * Math.exp((-5 * t) / len);
/** The same shape but a smooth rise and fall over the whole length (for swells). */
const bell = (t: number, len: number): number => Math.sin(Math.PI * Math.min(1, Math.max(0, t / len))) ** 1.5;

/** A short burst of noise through a resonator: a knock with a pitch. Used for wood, stone and metal. */
function knock(hz: number, rate: number, ring: number): (x: number) => number {
  // A two-pole resonator. `ring` near 1 rings long.
  const w = (TAU * hz) / rate;
  const a1 = 2 * ring * Math.cos(w);
  const a2 = -ring * ring;
  let y1 = 0;
  let y2 = 0;
  return (x) => {
    const y = x + a1 * y1 + a2 * y2;
    y2 = y1;
    y1 = y;
    return y * (1 - ring);
  };
}

/**
 * Struck metal: a hard tick, then partials that are not in tune with each other, each dying at its own rate (the high
 * ones first). `parts` are [hz, how loud, how fast it dies]; `from` is the first oscillator slot it may use.
 */
function struck(c: Ctx, parts: ReadonlyArray<readonly [number, number, number]>, tick: number, from = 0): (t: number) => number {
  return (t) => {
    if (t < 0) return 0;
    let v = (c.r() * 2 - 1) * Math.exp(-t * 260) * tick;
    for (let i = 0; i < parts.length; i++) v += sine(c.osc(from + i, parts[i][0])) * parts[i][1] * Math.exp(-t * parts[i][2]);
    return v * Math.min(1, t / 0.0008);
  };
}

// ---- The sounds ----

export const SFX_NAMES = [
  'jump', 'doubleJump', 'land', 'step', 'swing', 'dodge', 'hit', 'kill', 'hurt', 'block',
  'crate', 'barrel', 'plank', 'pipe', 'crumb', 'cap', 'relic', 'item', 'heal', 'splash', 'plunge', 'shock',
  'spit', 'splat', 'toadWind', 'croak', 'roachWind', 'lunge',
  'menuMove', 'menuOk', 'menuBack', 'talk', 'rumble', 'sparkle', 'doorOpen', 'clear', 'gate', 'drip',
  'water', 'gush',
  // The worlds' own sound: a bed for each (looped), the things heard near lava and fire, and the odd far-off noise.
  'drain', 'machine', 'wind', 'hall', 'lavaBubble', 'fire',
  'clank', 'hiss', 'pebbles', 'chainClink', 'toll',
  // Voices: the rat's squeaky grunts and the roach's screech.
  'ratJump', 'ratJump2', 'ratDouble', 'ratAttack', 'ratHurt', 'ratDie', 'roachScreech', 'roachDie',
  // The ironback's snort (steam through its nose) and the clang of it going over; the bat's squeak and its wing beat.
  'snort', 'flipClang', 'batSqueak', 'flap',
  'boot', 'villainLaugh',
  // Story: a memory opening and closing, cloth, a small found thing, the pang of knowing it, a soft whoosh.
  'memoryIn', 'memoryOut', 'cloth', 'keepsake', 'recall', 'whoosh', 'softStep',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];

/** One period of a slow wobble that fits a loop of `len` seconds exactly `n` times (so the loop has no seam). */
const wob = (t: number, len: number, n = 1): number => Math.sin((TAU * n * t) / len);

const RECIPES: Record<SfxName, () => Sample> = {
  // ---- World beds (looped, quiet, under everything) ----
  // The Cistern: water moving somewhere far off in the drains, a low rumble that swells and settles.
  drain: () => draw(4, RATE_LO, 71, (c) => (t) => c.lp(0, c.r() * 2 - 1, 0.025) * (0.75 + 0.25 * wob(t, 4)) + sine(c.osc(1, 46)) * 0.12, { bits: 6, loop: true, gain: 0.7 }),
  // The Foundry: the machines' hum and a heavy beat four times a loop, like something big turning over.
  machine: () => draw(2.4, RATE_LO, 72, (c) => (t) => {
    const beat = (t % 0.6) / 0.6;
    return sine(c.osc(0, 55)) * 0.35 + sq(c.osc(1, 110), 0.3) * 0.06 + c.lp(2, c.r() * 2 - 1, 0.05) * 0.5 + (c.lp(3, c.r() * 2 - 1, 0.3) * 0.9 + sine(c.osc(4, 70 * Math.exp(-beat * 6) + 38)) * 0.8) * Math.exp(-beat * 9);
  }, { bits: 6, loop: true, gain: 0.7 }),
  // The Hollows: wind through the cave, a hollow whistle that rises and falls.
  wind: () => draw(4, RATE_LO, 73, (c) => (t) => {
    const k = 0.05 + 0.035 * (0.5 + 0.5 * wob(t, 4, 1)) + 0.015 * wob(t, 4, 3);
    const n = c.r() * 2 - 1;
    return (c.lp(0, n, k) - c.lp(1, n, k * 0.45)) * 3 * (0.55 + 0.45 * (0.5 + 0.5 * wob(t, 4, 2)));
  }, { bits: 6, loop: true, gain: 0.7 }),
  // The Keep: a cold, high hall. A very low drone and the faint breath of the room.
  hall: () => draw(4, RATE_LO, 74, (c) => (t) => sine(c.osc(0, 41)) * 0.4 + sine(c.osc(1, 61.5)) * 0.22 * (0.6 + 0.4 * wob(t, 4, 1)) + c.lp(2, c.r() * 2 - 1, 0.02) * 0.6, { bits: 6, loop: true, gain: 0.6 }),
  // Near lava: a deep roil, and bubbles popping.
  lavaBubble: () => draw(2, RATE_LO, 75, (c) => {
    const pops = Array.from({ length: 11 }, () => ({ at: c.r() * 1.85, hz: 110 + c.r() * 170, amp: 0.5 + c.r() * 0.5 }));
    return (t) => {
      // (The roil is a low rumble and, over it, a slow thick seething that small speakers can carry.)
      const n = c.r() * 2 - 1;
      let v = c.lp(0, n, 0.04) * 1.5 + (c.lp(2, n, 0.2) - c.lp(3, n, 0.07)) * 0.55 * (0.6 + 0.4 * wob(t, 2, 3));
      for (let i = 0; i < pops.length; i++) {
        const d = t - pops[i].at;
        if (d > 0 && d < 0.11) v += sine(c.osc(4 + i, pops[i].hz * (1 + d * 6))) * Math.exp(-d * 34) * pops[i].amp * 0.5 * Math.min(1, d / 0.004);
      }
      return v;
    };
  }, { bits: 6, loop: true, gain: 0.55 }),
  // Near a brazier: crackle and a soft roar.
  fire: () => draw(1.5, RATE_HI, 76, (c) => (t) => c.lp(0, c.r() * 2 - 1, 0.2) * 1.6 * (0.8 + 0.2 * wob(t, 1.5, 2)) + (c.r() < 0.004 ? (c.r() * 2 - 1) * 0.9 : 0), { bits: 7, loop: true, gain: 0.6 }),
  // ---- Far-off noises, heard now and then ----
  // Iron struck on iron: it rings for half a second (two of its partials a hair apart, so it shimmers).
  clank: () => draw(0.9, RATE_HI, 77, (c) => {
    const ring = struck(c, [[640, 1, 7], [652, 0.45, 8], [1210, 0.6, 10], [1873, 0.4, 14], [2890, 0.24, 22]], 0.9);
    return (t) => ring(t) * Math.min(1, (0.9 - t) / 0.08);
  }, { bits: 7 }),
  hiss: () => draw(1.1, RATE_HI, 78, (c) => (t) => ((c.r() * 2 - 1) - c.lp(0, c.r() * 2 - 1, 0.3)) * bell(t, 1.1) * (t < 0.15 ? t / 0.15 : 1), { bits: 7, gain: 0.6 }),
  // A handful of stones coming down: a dozen knocks, big and small, each with a little body to it.
  pebbles: () => draw(0.8, RATE_HI, 79, (c) => {
    const hits = Array.from({ length: 12 }, (_, i) => ({ at: i * 0.052 + c.r() * 0.05, amp: 0.6 + c.r() * 0.4, ring: knock(700 + c.r() * 1100, RATE_HI, 0.994), low: knock(260 + c.r() * 160, RATE_HI, 0.988) }));
    return (t) => {
      let v = 0;
      for (const h of hits) {
        const x = Math.abs(t - h.at) < 0.0025 ? (c.r() * 2 - 1) * h.amp : 0;
        v += h.ring(x) + h.low(x) * 0.8;
      }
      return v;
    };
  }, { bits: 7 }),
  // A chain shifting: five links knocking, one after another, each a small bright ring.
  chainClink: () => draw(0.6, RATE_HI, 80, (c) => {
    const links = ([[0, 1, 1], [0.07, 0.5, 1.12], [0.13, 0.8, 0.94], [0.24, 0.42, 1.2], [0.31, 0.3, 1.05]] as const).map(([at, amp, pitch], i) => ({ at, amp, ring: struck(c, [[2200 * pitch, 1, 26], [2900 * pitch, 0.7, 32], [4150 * pitch, 0.35, 44]], 0.8, i * 3) }));
    return (t) => links.reduce((v, l) => v + l.ring(t - l.at) * l.amp, 0);
  }, { bits: 7 }),
  // A big bell, far away: a low note with the out-of-tune overtones real bells have.
  toll: () => draw(3.5, RATE_LO, 81, (c) => (t) => (sine(c.osc(0, 98)) + sine(c.osc(1, 98 * 2.4)) * 0.5 + sine(c.osc(2, 98 * 3.9)) * 0.25 + sine(c.osc(3, 98 * 0.5)) * 0.4) * Math.exp(-t * 1.3) * Math.min(1, t / 0.01), { bits: 7 }),

  jump: () => draw(0.18, RATE_HI, 1, (c) => (t) => sq(c.osc(0, 280 + 520 * (t / 0.18)), 0.5) * decay(t, 0.16)),
  doubleJump: () => draw(0.22, RATE_HI, 2, (c) => (t) => tri(c.osc(0, 520 + 900 * (t / 0.22))) * decay(t, 0.2)),
  // A landing: a low body thump, the slap of feet, and a little grit after.
  land: () => draw(0.2, RATE_LO, 3, (c) => (t) => (sine(c.osc(1, 110 * Math.exp(-9 * t) + 48)) * Math.exp(-t * 22) * 1.1 + c.lp(0, c.r() * 2 - 1, 0.4) * Math.exp(-t * 55) * 0.8 + c.lp(2, c.r() * 2 - 1, 0.12) * Math.exp(-t * 16) * (t > 0.03 ? 0.35 : 0)) * Math.min(1, t / 0.002), { bits: 6 }),
  step: () => draw(0.06, RATE_LO, 4, (c) => (t) => c.lp(0, c.r() * 2 - 1, 0.35) * decay(t, 0.045, 0.002), { bits: 6 }),
  // A sword swing: air rushing past, brightening as the blade comes round, with a thin metal sing on top.
  swing: () => draw(0.22, RATE_HI, 5, (c) => (t) => {
    const k = t / 0.22;
    const air = c.lp(0, c.r() * 2 - 1, 0.08 + 0.55 * Math.sin(Math.PI * k) ** 2) - c.lp(1, c.r() * 2 - 1, 0.03);
    return air * bell(t, 0.22) * 1.2 + sine(c.osc(0, 1900 - 900 * k)) * 0.07 * bell(t, 0.2) + saw(c.osc(2, 620 - 360 * k)) * 0.12 * bell(t, 0.22);
  }),
  // A roll: cloth and a quick rush of air, low then high then gone.
  dodge: () => draw(0.28, RATE_HI, 6, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.1 + 0.4 * Math.sin(Math.PI * (t / 0.28))) - c.lp(1, c.r() * 2 - 1, 0.04)) * bell(t, 0.28) * 1.3 + sine(c.osc(0, 90 + 60 * (t / 0.28))) * 0.25 * bell(t, 0.2)),
  // A blow landing: a sharp crack, a meaty low punch under it, and a short ring.
  hit: () => draw(0.2, RATE_HI, 7, (c) => (t) => ((c.r() * 2 - 1) * Math.exp(-t * 85) * 0.9 + sine(c.osc(1, 170 * Math.exp(-12 * t) + 55)) * Math.exp(-t * 20) * 1.0 + sq(c.osc(0, 250 - 130 * (t / 0.2)), 0.4) * decay(t, 0.1) * 0.45 + c.lp(0, c.r() * 2 - 1, 0.3) * Math.exp(-t * 30) * 0.4) * 0.8),
  // The finishing blow: the crack and punch of a hit, a falling tone, and a low boom that hangs a moment.
  kill: () => draw(0.6, RATE_HI, 8, (c) => (t) => ((c.r() * 2 - 1) * Math.exp(-t * 45) + saw(c.osc(0, 430 - 350 * Math.min(1, t / 0.42))) * decay(t, 0.3) * 0.7 + sine(c.osc(1, 95 * Math.exp(-4 * t) + 38)) * Math.exp(-t * 7) * 1.1 + c.lp(0, c.r() * 2 - 1, 0.1) * Math.exp(-t * 9) * 0.5) * 0.75 * Math.min(1, (0.6 - t) / 0.08)),
  // Taking a hit: a harsh falling buzz with a thud at the front.
  hurt: () => draw(0.32, RATE_HI, 9, (c) => (t) => (saw(c.osc(0, 540 - 350 * (t / 0.32))) * 0.55 + sq(c.osc(2, 270 - 175 * (t / 0.32)), 0.3) * 0.3 + (c.r() * 2 - 1) * 0.3) * decay(t, 0.25) + sine(c.osc(1, 120 * Math.exp(-10 * t) + 50)) * Math.exp(-t * 18) * 0.8),
  // A blow caught on the shield: a hard clank and a ring of out-of-tune partials, like struck iron.
  block: () => draw(0.42, RATE_HI, 10, (c) => (t) => ((c.r() * 2 - 1) * Math.exp(-t * 110) * 0.9 + sine(c.osc(0, 873)) * 0.62 * Math.exp(-t * 7.5) + sine(c.osc(1, 1397)) * 0.44 * Math.exp(-t * 10) + sine(c.osc(2, 2318)) * 0.3 * Math.exp(-t * 15) + sq(c.osc(3, 3105), 0.5) * 0.09 * Math.exp(-t * 26) + sine(c.osc(4, 140 * Math.exp(-14 * t) + 60)) * 0.7 * Math.exp(-t * 22)) * Math.min(1, t / 0.001) * Math.min(1, (0.42 - t) / 0.05)),
  // A crate smashed: a hard crack and a heavy low thump as it gives, the boards knocking against each other as they
  // come apart (each knock is a burst of noise through a few wooden resonances), and a crackle of splinters after.
  crate: () => draw(0.62, RATE_HI, 11, (c) => {
    const body = [knock(170, RATE_HI, 0.9972), knock(265, RATE_HI, 0.9968), knock(430, RATE_HI, 0.996), knock(720, RATE_HI, 0.9945), knock(1180, RATE_HI, 0.991)];
    // When each board knocks, how hard, and how long its burst of noise lasts.
    const hits: Array<[number, number, number]> = [[0, 1, 0.012], [0.03, 0.8, 0.009], [0.065, 0.95, 0.011], [0.11, 0.8, 0.009], [0.165, 0.85, 0.01], [0.235, 0.7, 0.009], [0.31, 0.6, 0.008], [0.4, 0.42, 0.007]];
    return (t, i) => {
      let x = 0;
      for (const [at, amp, len] of hits) if (t >= at && t < at + len) x += (c.r() * 2 - 1) * amp;
      let wood = 0;
      // The later knocks sit higher: small boards landing after the big ones.
      for (let k = 0; k < body.length; k++) wood += body[k](k < 2 && t > 0.12 ? 0 : x) * [1.3, 1.2, 1, 0.8, 0.55][k];
      const crack = (c.r() * 2 - 1) * Math.exp(-t * 75) * 0.6;
      const thump = sine(c.osc(0, 125 * Math.exp(-9 * t) + 52)) * Math.exp(-t * 11) * 0.9;
      const crunch = c.lp(0, c.r() * 2 - 1, 0.35) * Math.exp(-t * 6) * 0.6 * (0.5 + 0.5 * sq(c.osc(1, 34 + 20 * Math.sin(i * 0.002)), 0.4));
      const splinter = (c.r() < 0.045 ? c.r() * 2 - 1 : 0) * Math.exp(-Math.max(0, t - 0.05) * 7) * 0.8;
      return Math.tanh((wood * 110 + crack + thump + crunch * 1.6 + splinter) * DRIVE_C) * Math.min(1, (0.62 - t) / 0.06);
    };
  }, { bits: 8 }),
  // A barrel stove in: a hollow boom from its belly, the staves knocking apart, and the iron hoops ringing as they drop.
  barrel: () => draw(0.6, RATE_HI, 12, (c) => {
    const body = [knock(118, RATE_HI, 0.9978), knock(205, RATE_HI, 0.9972), knock(350, RATE_HI, 0.996), knock(610, RATE_HI, 0.993)];
    const hits: Array<[number, number, number]> = [[0, 1, 0.014], [0.04, 0.8, 0.01], [0.09, 0.8, 0.009], [0.15, 0.7, 0.009], [0.24, 0.55, 0.008], [0.34, 0.4, 0.007]];
    return (t) => {
      let x = 0;
      for (const [at, amp, len] of hits) if (t >= at && t < at + len) x += (c.r() * 2 - 1) * amp;
      let wood = 0;
      for (let k = 0; k < body.length; k++) wood += body[k](x) * [1.4, 1.2, 0.9, 0.6][k];
      const boom = sine(c.osc(0, 96 * Math.exp(-6 * t) + 44)) * Math.exp(-t * 9) * 1.1;
      const crack = (c.r() * 2 - 1) * Math.exp(-t * 70) * 0.8;
      const wash = c.lp(0, c.r() * 2 - 1, 0.25) * Math.exp(-t * 11) * 0.5;
      const hoop = t > 0.11 ? (sine(c.osc(1, 1730)) * 0.16 + sine(c.osc(2, 2590)) * 0.1) * Math.exp(-(t - 0.11) * 13) : 0;
      return Math.tanh((wood * 110 + boom + crack * 0.7 + wash * 1.4 + hoop) * DRIVE_B) * Math.min(1, (0.6 - t) / 0.06);
    };
  }, { bits: 8 }),
  // One board landing on the floor: a short dry knock.
  plank: () => draw(0.13, RATE_HI, 111, (c) => {
    const body = [knock(390, RATE_HI, 0.982), knock(860, RATE_HI, 0.972)];
    return (t) => {
      const x = t < 0.005 ? c.r() * 2 - 1 : 0;
      return (body[0](x) * 30 + body[1](x) * 18 + (c.r() * 2 - 1) * Math.exp(-t * 160) * 0.4) * Math.min(1, (0.13 - t) / 0.03);
    };
  }),
  pipe: () => draw(0.7, RATE_HI, 13, (c) => (t) => (sq(c.osc(0, 330), 0.5) * 0.4 * Math.exp(-t * 11) + sq(c.osc(1, 713), 0.5) * 0.3 * Math.exp(-t * 14) + (c.r() * 2 - 1) * 0.5 * bell(t, 0.7)) * 0.9),
  // A cheese crumb: two quick bright notes with a glint an octave up.
  crumb: () => draw(0.16, RATE_HI, 14, (c) => (t) => (sq(c.osc(0, t < 0.05 ? 988 : 1319), 0.5) * 0.8 + tri(c.osc(1, t < 0.05 ? 1976 : 2637)) * 0.3) * decay(t < 0.05 ? t : t - 0.05, 0.11, 0.001)),
  // A bottle cap: a tinny double note with a metal tick at the front.
  cap: () => draw(0.2, RATE_HI, 15, (c) => (t) => (sq(c.osc(0, t < 0.07 ? 659 : 988), 0.25) * 0.8 + sine(c.osc(1, t < 0.07 ? 1977 : 2964)) * 0.25) * decay(t < 0.07 ? t : t - 0.07, 0.13, 0.001) + (c.r() * 2 - 1) * Math.exp(-t * 220) * 0.5),
  relic: () => draw(0.5, RATE_HI, 16, (c) => (t) => tri(c.osc(0, [784, 988, 1319, 1568][Math.min(3, Math.floor(t / 0.11))])) * decay(t % 0.11 + 0.01, 0.2, 0.001) * (t > 0.44 ? Math.max(0, 1 - (t - 0.44) / 0.06) : 1)),
  item: () => draw(0.3, RATE_HI, 17, (c) => (t) => tri(c.osc(0, 300 * semi(12 * (t / 0.3)) * (1 + 0.04 * Math.sin(t * 60)))) * decay(t, 0.26)),
  heal: () => draw(0.55, RATE_HI, 18, (c) => (t) => tri(c.osc(0, [523, 659, 784, 1047][Math.min(3, Math.floor(t / 0.12))])) * (0.6 + 0.4 * decay(t % 0.12 + 0.01, 0.12)) * Math.max(0, 1 - Math.max(0, t - 0.4) / 0.15)),
  // Into the water: a slap, a wash of spray, and bubbles coming up after.
  splash: () => draw(0.55, RATE_LO, 19, (c) => (t) => (c.r() * 2 - 1) * Math.exp(-t * 45) * 0.7 + c.lp(0, c.r() * 2 - 1, 0.22) * bell(t, 0.42) * 0.9 + sine(c.osc(1, 420 + 760 * ((t * 9) % 1))) * 0.22 * Math.exp(-Math.max(0, t - 0.08) * 6) * (t > 0.08 ? 1 : 0) + sine(c.osc(2, 85 * Math.exp(-5 * t) + 40)) * Math.exp(-t * 12) * 0.6, { bits: 7 }),
  // The dive: a falling whistle of air that tightens as he drops.
  plunge: () => draw(0.4, RATE_HI, 20, (c) => (t) => saw(c.osc(0, 950 * Math.exp(-3.5 * t))) * 0.45 * bell(t, 0.45) + (c.lp(0, c.r() * 2 - 1, 0.15 + 0.5 * (t / 0.4)) - c.lp(1, c.r() * 2 - 1, 0.05)) * 0.7 * bell(t, 0.4) + sine(c.osc(2, 1900 * Math.exp(-3.5 * t))) * 0.1 * bell(t, 0.4)),
  // The landing blast: a deep boom, a crack on top, and rubble settling.
  shock: () => draw(0.75, RATE_LO, 21, (c) => (t) => (c.r() * 2 - 1) * Math.exp(-t * 50) * 0.8 + c.lp(0, c.r() * 2 - 1, 0.3) * Math.exp(-t * 7) * 0.7 + sine(c.osc(1, 80 * Math.exp(-3 * t) + 30)) * Math.exp(-t * 4.5) * 1.1 + (c.r() < 0.02 ? c.r() * 2 - 1 : 0) * Math.exp(-t * 4) * (t > 0.12 ? 1.2 : 0), { bits: 6 }),
  spit: () => draw(0.3, RATE_HI, 22, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.45) * 0.7 + sine(c.osc(1, 180 + 520 * (t / 0.3))) * 0.5) * bell(t, 0.3)),
  splat: () => draw(0.18, RATE_LO, 23, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.3) * 0.8 + sine(c.osc(1, 260 - 120 * t / 0.18)) * 0.5) * decay(t, 0.14, 0.002), { bits: 6 }),
  toadWind: () => draw(0.8, RATE_LO, 24, (c) => (t) => sq(c.osc(0, 80 + 70 * (t / 0.8)), 0.5) * (0.55 + 0.45 * sq(c.osc(1, 28), 0.5)) * bell(t, 0.85), { bits: 6 }),
  croak: () => draw(0.22, RATE_LO, 25, (c) => (t) => sine(c.osc(0, 150 - 40 * (t / 0.22))) * (0.6 + 0.4 * sq(c.osc(1, 38), 0.5)) * bell(t, 0.22), { bits: 6 }),
  roachWind: () => draw(0.55, RATE_HI, 26, (c) => (t) => (saw(c.osc(0, 1500 + 1000 * (t / 0.55))) * 0.5 + (c.r() * 2 - 1) * 0.5) * (0.3 + 0.7 * (t / 0.55)) * (0.7 + 0.3 * sq(c.osc(1, 45), 0.5)), { bits: 7 }),
  // A squeak is a narrow pulse wave that slides up fast, with a little wobble and a breathy edge; the grunt is a short low "uh" under it.
  ratJump: () => draw(0.14, RATE_LO, 40, (c) => (t) => (sq(c.osc(0, 700 + 500 * Math.sin((t / 0.14) * 2.2) + 60 * sine(c.osc(1, 38))), 0.3) * 0.55 + c.lp(2, c.r() * 2 - 1, 0.3) * 0.15 + sine(c.osc(3, 190)) * 0.3) * bell(t, 0.14), { bits: 6 }),
  ratJump2: () => draw(0.12, RATE_LO, 41, (c) => (t) => (sq(c.osc(0, 900 + 700 * (t / 0.12)), 0.25) * 0.6 + sine(c.osc(3, 230)) * 0.25) * bell(t, 0.12), { bits: 6 }),
  ratDouble: () => draw(0.2, RATE_LO, 42, (c) => (t) => (sq(c.osc(0, 800 + 1100 * (t / 0.2) ** 0.7 + 80 * sine(c.osc(1, 30))), 0.3) * 0.6 + sine(c.osc(3, 210)) * 0.2) * bell(t, 0.2), { bits: 6 }),
  ratAttack: () => draw(0.16, RATE_LO, 43, (c) => (t) => (sq(c.osc(0, 520 - 120 * (t / 0.16)), 0.4) * 0.5 + c.lp(2, c.r() * 2 - 1, 0.4) * 0.35) * decay(t, 0.12, 0.006), { bits: 6 }),
  ratHurt: () => draw(0.32, RATE_LO, 44, (c) => (t) => sq(c.osc(0, 1500 - 900 * (t / 0.32) + 150 * sine(c.osc(1, 22))), 0.3) * (0.7 + 0.3 * sq(c.osc(2, 30), 0.5)) * bell(t, 0.32), { bits: 6 }),
  ratDie: () => draw(0.6, RATE_LO, 45, (c) => (t) => sq(c.osc(0, 1300 * Math.exp(-2.6 * t) + 120 + 60 * sine(c.osc(1, 18))), 0.3) * (0.8 + 0.2 * sq(c.osc(2, 24), 0.5)) * Math.min(1, 1 - t / 0.6) * Math.min(1, t / 0.01), { bits: 6 }),
  // The roach's screech: a harsh saw with fast buzzing and breath, sliding up then down.
  roachScreech: () => draw(0.4, RATE_HI, 46, (c) => (t) => (saw(c.osc(0, 2200 + 900 * Math.sin((t / 0.4) * Math.PI) + 200 * sine(c.osc(1, 55)))) * 0.55 + (c.r() * 2 - 1) * 0.3) * (0.65 + 0.35 * sq(c.osc(2, 70), 0.5)) * bell(t, 0.4), { bits: 7 }),
  snort: () => draw(0.5, RATE_LO, 82, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.35) * 1.2 + sine(c.osc(1, 70 + 30 * Math.sin(t * 20))) * 0.5) * (t < 0.08 ? t / 0.08 : Math.exp(-(t - 0.08) * 5)), { bits: 6 }),
  // A great weight of iron going over onto stone: a thud under a low clang that takes most of a second to die.
  flipClang: () => draw(1.0, RATE_HI, 83, (c) => {
    const ring = struck(c, [[210, 1, 6], [217, 0.5, 6.5], [470, 0.7, 8], [795, 0.42, 11], [1130, 0.26, 15]], 0.5);
    // (Pushed a little into soft clipping, as the crate is: it should sound heavy.)
    return (t) => Math.tanh((ring(t) + sine(c.osc(8, 55 + 130 * Math.exp(-14 * t))) * Math.exp(-t * 16) * 0.9 + c.lp(0, c.r() * 2 - 1, 0.2) * Math.exp(-t * 18) * 0.6) * 0.45) * Math.min(1, (1 - t) / 0.08);
  }, { bits: 7 }),
  batSqueak: () => draw(0.16, RATE_HI, 84, (c) => (t) => (sq(c.osc(0, 3400 + 1800 * Math.sin((t / 0.16) * Math.PI * 3)), 0.25) * 0.5 + tri(c.osc(1, 5200 - 2000 * (t / 0.16))) * 0.3) * bell(t, 0.16), { bits: 7, gain: 0.7 }),
  flap: () => draw(0.12, RATE_LO, 85, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.18) * 1.3 + sine(c.osc(1, 110 - 300 * t)) * 0.3) * bell(t, 0.12), { bits: 6, gain: 0.6 }),
  roachDie: () => draw(0.35, RATE_HI, 47, (c) => (t) => (saw(c.osc(0, 2400 - 1800 * (t / 0.35))) * 0.5 + (c.r() * 2 - 1) * 0.4) * (0.6 + 0.4 * sq(c.osc(2, 60), 0.5)) * Math.min(1, 1 - t / 0.35), { bits: 7 }),
  // The start-up chime: a swelling chord that slides into tune, then fades, with a bright sparkle on top.
  villainLaugh: () => draw(0.9, RATE_LO, 94, (c) => (t) => saw(c.osc(0, 110 + 20 * Math.sin(t * 40))) * 0.6 * bell(t, 0.9), { bits: 6 }),
  boot: () => draw(3.0, RATE_HI, 48, (c) => (t) => {
    const k = Math.min(1, t / 0.9);
    const glide = 0.5 + 0.5 * (1 - (1 - k) * (1 - k));
    const env = Math.min(1, t / 0.7) * (t < 1.7 ? 1 : Math.max(0, 1 - (t - 1.7) / 1.3));
    const chord = tri(c.osc(0, 196 * glide)) * 0.5 + tri(c.osc(1, 294 * glide)) * 0.4 + tri(c.osc(2, 392 * glide)) * 0.35 + sine(c.osc(3, 98 * glide)) * 0.5;
    const top = t > 0.9 ? tri(c.osc(4, 1568)) * Math.exp(-(t - 0.9) * 2.2) * 0.35 : 0;
    return (chord * env + top) * 0.7;
  }, { bits: 7 }),
  lunge: () => draw(0.18, RATE_HI, 27, (c) => (t) => (c.r() * 2 - 1) * bell(t, 0.18) * 0.8 + saw(c.osc(0, 220)) * 0.2 * bell(t, 0.18)),
  menuMove: () => draw(0.05, RATE_HI, 28, (c) => (t) => sq(c.osc(0, 1100), 0.5) * decay(t, 0.045, 0.001), { bits: 6, gain: 0.7 }),
  menuOk: () => draw(0.14, RATE_HI, 29, (c) => (t) => sq(c.osc(0, t < 0.06 ? 880 : 1318), 0.5) * decay(t % 0.07 + 0.005, 0.1, 0.001), { gain: 0.75 }),
  menuBack: () => draw(0.12, RATE_HI, 30, (c) => (t) => sq(c.osc(0, t < 0.05 ? 880 : 587), 0.5) * decay(t % 0.06 + 0.005, 0.1, 0.001), { gain: 0.7 }),
  talk: () => draw(0.05, RATE_HI, 31, (c) => (t) => tri(c.osc(0, 640)) * decay(t, 0.05, 0.002), { bits: 6, gain: 0.7 }),
  rumble: () => draw(2.4, RATE_LO, 32, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.07) * 1.5 + sine(c.osc(1, 38 + 6 * Math.sin(t * 9))) * 0.7) * Math.min(1, t / 0.3) * Math.min(1, (2.4 - t) / 0.6), { bits: 6 }),
  sparkle: () => draw(1.5, RATE_HI, 33, (c) => {
    const scale = [1319, 1568, 1760, 2093, 2349, 2637];
    const notes = Array.from({ length: 14 }, (_, i) => ({ at: i * 0.1 + c.r() * 0.05, hz: scale[Math.floor(c.r() * scale.length)] }));
    return (t) => {
      let v = 0;
      for (let k = 0; k < notes.length; k++) {
        const dt = t - notes[k].at;
        if (dt >= 0 && dt < 0.25) v += tri(notes[k].hz * dt) * Math.exp(-dt * 16) * 0.5;
      }
      return v * Math.min(1, (1.5 - t) / 0.3);
    };
  }, { bits: 7 }),
  doorOpen: () => draw(1.1, RATE_HI, 34, (c) => (t) => (tri(c.osc(0, [523, 659, 784, 1047, 1319][Math.min(4, Math.floor(t / 0.16))])) * 0.7 + sq(c.osc(1, [262, 330, 392, 523, 659][Math.min(4, Math.floor(t / 0.16))]), 0.25) * 0.3) * Math.exp(-(t % 0.16) * 3) * Math.min(1, (1.1 - t) / 0.4)),
  clear: () => draw(1.0, RATE_HI, 35, (c) => (t) => sq(c.osc(0, [523, 659, 784, 1047][Math.min(3, Math.floor(t / 0.16))]), 0.25) * (t < 0.64 ? decay(t % 0.16 + 0.005, 0.3) : Math.max(0, 1 - (t - 0.64) / 0.36)) * 0.9),
  gate: () => draw(1.8, RATE_LO, 36, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.09) * 1.2 + (c.r() < 0.012 ? c.r() * 2 - 1 : 0) * 2 + sine(c.osc(1, 55)) * 0.5) * bell(t, 1.8), { bits: 6 }),
  drip: () => draw(0.12, RATE_HI, 37, (c) => (t) => sine(c.osc(0, 2000 - 900 * Math.min(1, t / 0.05))) * decay(t, 0.08, 0.001), { gain: 0.6 }),
  water: () => draw(2.0, RATE_LO, 38, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.12) + 0.5 * sine(c.osc(1, 150 + 40 * Math.sin(t * Math.PI * 4))) * 0.3) * (0.7 + 0.3 * Math.sin(t * Math.PI * 2)), { bits: 6, loop: true, gain: 0.6 }),
  // A memory opening: soft bell notes climbing out of a rising hum, as if heard from another room.
  memoryIn: () => draw(1.3, RATE_HI, 60, (c) => {
    const notes = [523, 659, 784, 988, 1175].map((hz, i) => ({ at: 0.12 + i * 0.13, hz }));
    return (t) => {
      let v = sine(c.osc(0, 196 + 66 * (t / 1.3))) * 0.22 * bell(t, 1.3) + c.lp(0, c.r() * 2 - 1, 0.03 + 0.1 * (t / 1.3)) * 0.5 * bell(t, 1.1);
      for (const n of notes) {
        const d = t - n.at;
        if (d >= 0) v += (sine(n.hz * d) * 0.5 + sine(n.hz * 3.01 * d) * 0.12) * Math.exp(-d * 5) * Math.min(1, d / 0.004);
      }
      return v * Math.min(1, (1.3 - t) / 0.3);
    };
  }, { bits: 7, gain: 0.8 }),
  // And closing: the same notes falling away.
  memoryOut: () => draw(1.1, RATE_HI, 61, (c) => {
    const notes = [1175, 988, 784, 587].map((hz, i) => ({ at: 0.02 + i * 0.14, hz }));
    return (t) => {
      let v = sine(c.osc(0, 262 - 66 * (t / 1.1))) * 0.2 * bell(t, 1.1);
      for (const n of notes) {
        const d = t - n.at;
        if (d >= 0) v += (sine(n.hz * d) * 0.45 + sine(n.hz * 3.01 * d) * 0.1) * Math.exp(-d * 5.5) * Math.min(1, d / 0.004);
      }
      return v * Math.min(1, (1.1 - t) / 0.35);
    };
  }, { bits: 7, gain: 0.75 }),
  // Cloth: a paw on a scarf, something tucked away. Two soft brushes.
  cloth: () => draw(0.3, RATE_HI, 62, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.28) - c.lp(1, c.r() * 2 - 1, 0.06)) * (bell(t, 0.13) + 0.7 * bell(t - 0.14, 0.16)), { bits: 7, gain: 0.5 }),
  // A small thing picked up off stone: a scrape, a tick, and a tiny ring.
  keepsake: () => draw(0.4, RATE_HI, 63, (c) => (t) => c.lp(0, c.r() * 2 - 1, 0.5) * bell(t, 0.07) * 0.5 + (c.r() * 2 - 1) * Math.exp(-Math.max(0, t - 0.08) * 160) * (t > 0.08 ? 0.7 : 0) + (sine(c.osc(0, 1760)) * 0.46 + sine(c.osc(1, 2640)) * 0.22) * Math.exp(-Math.max(0, t - 0.08) * 8) * (t > 0.08 ? 1 : 0) * Math.min(1, (0.4 - t) / 0.05), { bits: 7, gain: 0.85 }),
  // He knows it: two low, slow bell notes, the second a little sad.
  recall: () => draw(1.4, RATE_HI, 64, (c) => (t) => {
    const a = (sine(c.osc(0, 392)) * 0.5 + sine(c.osc(1, 784)) * 0.2 + sine(c.osc(2, 1180)) * 0.06) * Math.exp(-t * 3) * Math.min(1, t / 0.006);
    const d = t - 0.42;
    const b = d > 0 ? (sine(c.osc(3, 311)) * 0.5 + sine(c.osc(4, 622)) * 0.2 + sine(c.osc(5, 936)) * 0.06) * Math.exp(-d * 2.6) * Math.min(1, d / 0.006) : 0;
    return (a + b) * Math.min(1, (1.4 - t) / 0.3);
  }, { bits: 7, gain: 0.7 }),
  // A soft rush of air: a jump seen from far off.
  whoosh: () => draw(0.3, RATE_HI, 65, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.06 + 0.3 * Math.sin(Math.PI * (t / 0.3))) - c.lp(1, c.r() * 2 - 1, 0.03)) * bell(t, 0.3), { bits: 7, gain: 0.5 }),
  // A footstep for story scenes and memories: a soft pat on stone.
  softStep: () => draw(0.07, RATE_LO, 66, (c) => (t) => (c.lp(0, c.r() * 2 - 1, 0.3) * 0.8 + sine(c.osc(0, 140 - 500 * t)) * 0.5) * decay(t, 0.05, 0.002), { bits: 6, gain: 0.78 }),
  gush: () => draw(1.5, RATE_LO, 39, (c) => (t) => (c.r() * 2 - 1 - c.lp(0, c.r() * 2 - 1, 0.5) * 0.6) * (0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 4)), { bits: 6, loop: true, gain: 0.7 }),
};

/** Decodes a recorded sound (8-bit samples in base64). */
export function decodeRecorded(r: Recorded): Sample {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = r.b64.replace(/=+$/, '');
  const bytes: number[] = [];
  let acc = 0;
  let bitsIn = 0;
  for (let i = 0; i < clean.length; i++) {
    acc = (acc << 6) | chars.indexOf(clean[i]);
    bitsIn += 6;
    if (bitsIn >= 8) {
      bitsIn -= 8;
      bytes.push((acc >> bitsIn) & 0xff);
    }
  }
  const data = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) data[i] = ((bytes[i] << 24) >> 24) / 127;
  return { data, rate: r.rate, loop: r.loop };
}

const cache = new Map<SfxName, Sample>();
/**
 * How loud a sound seems: the level (rms, 0..1) of its loudest fifth of a second, or of all of it if it is shorter.
 * (Its level over its whole length says more about how much silence it ends with: by that a laugh with gaps in it
 * reads as quiet, and a tick followed by nothing reads the same as a ring that fades.)
 */
export function loudness(s: Sample): number {
  const d = s.data;
  const win = Math.min(d.length, Math.round(s.rate * 0.2));
  let run = 0;
  let best = 0;
  for (let i = 0; i < d.length; i++) {
    run += d[i] * d[i];
    if (i >= win) run -= d[i - win] * d[i - win];
    if (i >= win - 1 && run > best) best = run;
  }
  return Math.sqrt(best / win);
}
/** How long a sound can be heard for, in seconds: up to the last moment it is above a whisper. */
export function heardFor(s: Sample): number {
  let last = 0;
  for (let i = 0; i < s.data.length; i++) if (Math.abs(s.data[i]) > 0.03) last = i;
  return last / s.rate;
}
/** Below this (see `loudness`) a sound is lost under the others. Nothing in the game is. */
export const QUIET = 0.1;

/** Draws a sound (once; the result is kept). */
export function sfx(name: SfxName): Sample {
  let s = cache.get(name);
  if (!s) {
    s = RECORDED[name] ? decodeRecorded(RECORDED[name]) : RECIPES[name]();
    if (s.loop) s = { ...s, data: seamless(s.data) };
    cache.set(name, s);
  }
  return s;
}

/**
 * Makes a loop repeat without a click: the last part is blended into the first part and cut off, so the sample that
 * follows the end is exactly the one that really followed it.
 */
function seamless(d: Float32Array): Float32Array {
  const n = Math.min(Math.floor(d.length / 4), 1500);
  const out = d.slice(0, d.length - n);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    out[i] = d[i] * k + d[d.length - n + i] * (1 - k);
  }
  // Blending makes in-between values; squash them back to the loop's own low bit depth.
  for (let i = 0; i < n; i++) out[i] = Math.round(out[i] * 31) / 31;
  return out;
}

// ---- Instruments for the music: one cycle of a waveform, looped and played at any pitch (like the console's sampled voices) ----

export type InstrumentName = 'bass' | 'pad' | 'lead' | 'bell' | 'hat' | 'kick' | 'snare';

/** The pitch an instrument's cycle plays at when played at normal speed. */
export const INSTRUMENT_BASE_HZ = RATE_HI / 64;

export function instrument(name: InstrumentName): Sample {
  const CYCLE = 64;
  const cyc = new Float32Array(CYCLE);
  const bits = 6; // the cycles are coarse on purpose
  const q = (v: number): number => Math.round(Math.max(-1, Math.min(1, v)) * (2 ** (bits - 1) - 1)) / 2 ** (bits - 1);
  switch (name) {
    case 'bass':
      for (let i = 0; i < CYCLE; i++) cyc[i] = q(tri(i / CYCLE) * 0.9 + sine(i / CYCLE) * 0.2);
      return { data: cyc, rate: RATE_HI, loop: true };
    case 'pad':
      for (let i = 0; i < CYCLE; i++) cyc[i] = q(saw(i / CYCLE) * 0.45 + sine(i / CYCLE) * 0.4);
      return { data: cyc, rate: RATE_HI, loop: true };
    case 'lead':
      for (let i = 0; i < CYCLE; i++) cyc[i] = q(sq(i / CYCLE, 0.25) * 0.7);
      return { data: cyc, rate: RATE_HI, loop: true };
    case 'bell':
      for (let i = 0; i < CYCLE; i++) cyc[i] = q(sine(i / CYCLE) * 0.6 + sine((i * 3) / CYCLE) * 0.25 + sine((i * 5) / CYCLE) * 0.12);
      return { data: cyc, rate: RATE_HI, loop: true };
    case 'hat':
      return draw(0.07, RATE_HI, 91, (c) => (t) => (c.r() * 2 - 1) * Math.exp(-t * 70), { bits: 5, gain: 0.5 });
    case 'snare':
      return draw(0.16, RATE_HI, 93, (c) => (t) => ((c.r() * 2 - 1) * 0.8 + sine(c.osc(0, 190)) * 0.5) * Math.exp(-t * 22), { bits: 5, gain: 0.7 });
    case 'kick':
      return draw(0.2, RATE_LO, 92, (c) => (t) => sine(c.osc(0, 120 * Math.exp(-14 * t) + 40)) * Math.exp(-t * 14), { bits: 6, gain: 0.8 });
  }
}
