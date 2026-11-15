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

/**
 * A dry rattle: hard little clicks, each a knock on a plate of chitin tuned to `hz`, coming `from` .. `to` times a
 * second over `len` seconds (so it can quicken, or run down). No two clicks are quite as loud as each other.
 */
function rattle(c: Ctx, rate: number, len: number, from: number, to: number, hz: number, ring: number): (t: number) => number {
  const a = knock(hz, rate, ring);
  const b = knock(hz * 1.62, rate, ring * 0.996);
  let turn = 1; // (so that it starts with a click)
  let left = 0;
  let amp = 1;
  return (t) => {
    const k = Math.max(0, Math.min(1, t / len));
    turn += (from + (to - from) * k) / rate;
    if (turn >= 1) {
      turn -= 1;
      left = Math.max(2, Math.round(rate * 0.0013));
      amp = 0.6 + c.r() * 0.4;
    }
    const x = left-- > 0 ? (c.r() * 2 - 1) * amp : 0;
    return (a(x) + b(x) * 0.7) / (1 - ring) / 6;
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
  // The great insects. A hard foot on stone (both of them, and anything else with feet like that).
  'chitinTap',
  // The Broodmother: her scream, the rasp before a spike comes down and the crack of it going in, the rattle before
  // her legs sweep, the thread let go, her cry when she is hurt, and her end.
  'broodScream', 'broodHiss', 'broodRattle', 'spikeHit', 'threadTwang', 'broodHurt', 'broodDie',
  // The Sump Wyrm: its roar, the wet hiss before it bites and the clack of its fangs, its plates rattling faster and
  // faster before it runs, its head meeting a wall, the crack of its tail, the creak of its coil drawing tight and
  // the crunch when it closes, a sword on its plates, its cry when its head is struck, and its end.
  'wyrmRoar', 'wyrmHiss', 'wyrmSnap', 'wyrmRattle', 'wyrmRam', 'wyrmLash', 'wyrmCreak', 'wyrmCrunch', 'plateKnock', 'wyrmCry', 'wyrmDie',
  // The Hornet Lancer: the drone of its wings (looped, while one is near), the whine as it winds up to dive or run,
  // an angry buzz when it is struck, and its wings giving out.
  'hornetBuzz', 'hornetWhine', 'hornetHurt', 'hornetDie',
  // The Stag Knight: its bellow, its footfall, the hammer going up (a creak and a climbing hum) and coming down
  // (iron on stone), its wing cases rattling before a stomp, and its end.
  'stagBellow', 'stagStep', 'hammerHum', 'hammerSlam', 'stagRattle', 'stagDie',
  // The Orchid Mantis: a dry trill when it sees him, the thin ring of a scythe going up and the cut of it, its
  // wings flaring before a leap, two chirps when it is struck, and its end.
  'mantisHiss', 'scytheRing', 'scytheCut', 'mantisWings', 'mantisCry', 'mantisDie',
  // The Keep Guard: a soldier's bark, his spear sliding back over the rim of his shield, a yelp, and his end.
  'guardBark', 'spearReady', 'guardYelp', 'guardDie',
  // The Ant Pikeman: its jaws clacking (how an ant shouts), its pike sliding back through its claw, its jaws
  // shutting on a bite, a scraped chirp when it is struck, and its end.
  'antClick', 'pikeReady', 'antSnap', 'antHurt', 'antDie',
  // The Ironback's own (besides its snort and the clang of it going over): its horn scraping the floor before a
  // ram, its feet drumming in the ram, its head meeting a wall, its horn going down for a toss, its shell rocking as
  // it rights itself, and the steam going out of it at the end.
  'ironScrape', 'ironCharge', 'ironBonk', 'ironToss', 'ironRise', 'ironDie',
  // The Flitter's end, and the Broodmother coming down off her thread.
  'batDie', 'broodDrop',
  // Lord Grimsqueak: the Engine's light gathering, a bolt of it thrown and bursting, his swoop, his slam, the orb
  // sent and struck, his cry, the burst that throws the knight off him, the light going out of him, and his end.
  'grimGather', 'grimBolt', 'boltBurst', 'grimSwoop', 'grimSlam', 'orbHum', 'orbStrike', 'grimCry', 'grimRepel', 'grimSag', 'grimDie',
  // The Firefly Bomber: the soft whirr of its wings (looped, while one is near), its lantern blinking faster and
  // faster before a run, a drop of fire let go, the drop catching on the floor, its light going out, a thin peep
  // when it is struck, and its end.
  'fireflyHum', 'fireflyBlink', 'emberDrop', 'emberBurst', 'fireflyFade', 'fireflyHurt', 'fireflyDie',
  // Riding his shield: the rim grinding along on stone (looped while he rides, louder and higher the faster he
  // goes), the crack of it leaving the ground or coming down again, and the clatter when he comes off it.
  'rideScrape', 'ridePop', 'rideClatter',
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
  // ---- The great insects ----
  // One hard foot coming down on stone.
  chitinTap: () => draw(0.07, RATE_HI, 101, (c) => {
    const hit = struck(c, [[1900, 1, 85], [3300, 0.55, 120], [430, 0.8, 70]], 1.1);
    return (t) => hit(t);
  }, { bits: 7, gain: 0.8 }),
  // The Broodmother's scream: thin and high, climbing fast, hanging, then breaking downward; chopped by a chitter
  // that slows as her breath runs out.
  broodScream: () => draw(1.1, RATE_HI, 102, (c) => (t) => {
    const u = t / 1.1;
    const hz = 1250 + 1500 * Math.min(1, u / 0.18) - 900 * Math.max(0, (u - 0.6) / 0.4) ** 1.5 + 140 * sine(c.osc(3, 31));
    const voice = sq(c.osc(0, hz), 0.22) * 0.5 + sq(c.osc(1, hz * 1.497), 0.3) * 0.3 + saw(c.osc(2, hz * 0.5)) * 0.25;
    const n = c.r() * 2 - 1;
    const breath = (n - c.lp(0, n, 0.25)) * 0.35;
    const chitter = sq(c.osc(4, 46 - 18 * u), 0.55) > 0 ? 1 : 0.3;
    return (voice + breath) * chitter * Math.min(1, t / 0.03) * Math.min(1, (1.1 - t) / 0.25);
  }, { bits: 7 }),
  // A spike going up: the rasp of leg on leg, a hiss chopped fifty to eighty times a second, brighter as it goes.
  broodHiss: () => draw(0.6, RATE_HI, 103, (c) => (t) => {
    const u = t / 0.6;
    const n = c.r() * 2 - 1;
    const air = n - c.lp(0, n, 0.1 + 0.25 * u);
    const rasp = 0.5 + 0.5 * tri(c.osc(0, 52 + 30 * u));
    return air * rasp * Math.min(1, t / 0.05) * (0.35 + 0.65 * u) * Math.min(1, (0.6 - t) / 0.06);
  }, { bits: 7, gain: 0.8 }),
  // Before her legs sweep: a light, quick rattle that quickens.
  broodRattle: () => draw(0.5, RATE_HI, 104, (c) => {
    const g = rattle(c, RATE_HI, 0.5, 22, 62, 2600, 0.98);
    return (t) => Math.tanh(g(t) * 1.5) * (0.5 + 0.5 * (t / 0.5)) * Math.min(1, (0.5 - t) / 0.04);
  }, { bits: 7 }),
  // A spike driven into the stone: the crack of it, a short hard ring, and the thump through the floor.
  spikeHit: () => draw(0.35, RATE_HI, 105, (c) => {
    const ring = struck(c, [[1180, 1, 17], [2070, 0.7, 24], [3350, 0.4, 36]], 1.3);
    return (t) => Math.tanh((ring(t) + sine(c.osc(6, 60 + 150 * Math.exp(-22 * t))) * Math.exp(-t * 14) * 0.9 + c.lp(0, c.r() * 2 - 1, 0.25) * Math.exp(-t * 20) * 0.8) * 0.8) * Math.min(1, (0.35 - t) / 0.05);
  }, { bits: 7 }),
  // The thread she hangs by, let go: a taut string's note that sags as the pull comes off it, shivering, the high
  // part of it dying first.
  threadTwang: () => draw(0.7, RATE_HI, 106, (c) => (t) => {
    const f = 610 * (1 + 0.09 * Math.exp(-t * 7));
    let v = 0;
    for (let k = 1; k <= 6; k++) v += (sine(c.osc(k, f * k * (1 + 0.0009 * k * k))) / k) * Math.exp(-t * (3.5 + 2.2 * k));
    const shiver = 1 + 0.3 * sine(c.osc(0, 23)) * Math.exp(-t * 3);
    const snap = (c.r() * 2 - 1) * Math.exp(-t * 180) * 0.8;
    return (v * shiver + snap) * Math.min(1, t / 0.002) * Math.min(1, (0.7 - t) / 0.08);
  }, { bits: 7 }),
  // Struck: a short yelp, falling.
  broodHurt: () => draw(0.2, RATE_HI, 107, (c) => (t) => {
    const hz = 2500 - 1100 * (t / 0.2) + 120 * sine(c.osc(2, 60));
    return (sq(c.osc(0, hz), 0.25) * 0.5 + sq(c.osc(1, hz * 1.5), 0.3) * 0.25 + (c.r() * 2 - 1) * 0.25) * (sq(c.osc(3, 55), 0.6) > 0 ? 1 : 0.35) * bell(t, 0.2);
  }, { bits: 7 }),
  // Her end: the scream going out of her, falling and slowing; what is left is her legs ticking as they curl.
  broodDie: () => draw(1.5, RATE_HI, 108, (c) => {
    const legs = rattle(c, RATE_HI, 1.5, 30, 3, 2300, 0.975);
    return (t) => {
      const u = t / 1.5;
      const hz = 2100 * Math.exp(-u * 2.2) + 240;
      const voice = sq(c.osc(0, hz), 0.22) * 0.5 + sq(c.osc(1, hz * 1.497), 0.3) * 0.28 + saw(c.osc(2, hz * 0.5)) * 0.3;
      const chitter = sq(c.osc(4, 40 - 30 * u), 0.5) > 0 ? 1 : 0.25;
      return (voice * chitter + (c.r() * 2 - 1) * 0.2) * (1 - u) ** 1.3 * Math.min(1, t / 0.02) + legs(t) * 0.9 * Math.min(1, u * 1.6) * Math.min(1, (1.5 - t) / 0.1);
    };
  }, { bits: 7 }),
  // The Sump Wyrm's roar: a throat the size of a drain. A low growl that swells and sags, shaken by the rattle of
  // its plates, under a rush of air.
  wyrmRoar: () => draw(1.4, RATE_LO, 111, (c) => (t) => {
    const u = t / 1.4;
    const hz = 58 + 34 * Math.sin(Math.PI * Math.min(1, u * 1.25)) + 5 * sine(c.osc(5, 7));
    const growl = saw(c.osc(0, hz)) * 0.6 + sq(c.osc(1, hz * 1.5), 0.35) * 0.3 + sine(c.osc(2, hz * 0.5)) * 0.5;
    const shake = 0.6 + 0.4 * tri(c.osc(3, 21 + 9 * u));
    const n = c.r() * 2 - 1;
    const air = (n - c.lp(0, n, 0.3)) * 0.4 + c.lp(1, n, 0.25) * 0.5;
    return (growl * shake + air * (0.5 + 0.5 * shake)) * Math.min(1, t / 0.12) * Math.min(1, (1.4 - t) / 0.35);
  }, { bits: 6 }),
  // Its head going up over him: a wet hiss, with its fangs ticking.
  wyrmHiss: () => draw(0.55, RATE_HI, 120, (c) => {
    const fangs = rattle(c, RATE_HI, 0.55, 9, 16, 1500, 0.97);
    return (t) => {
      const u = t / 0.55;
      const n = c.r() * 2 - 1;
      const air = (c.lp(0, n, 0.45) - c.lp(1, n, 0.08)) * (0.75 + 0.25 * tri(c.osc(0, 37)));
      return (air * 1.5 * Math.min(1, t / 0.07) * (0.5 + 0.5 * u) + fangs(t) * 0.5) * Math.min(1, (0.55 - t) / 0.06);
    };
  }, { bits: 7, gain: 0.8 }),
  // Its fangs shutting: two hard clacks a moment apart, and the thud of its jaw.
  wyrmSnap: () => draw(0.25, RATE_HI, 113, (c) => {
    const a = struck(c, [[1450, 1, 30], [2380, 0.6, 42], [820, 0.8, 24]], 1.4);
    const b = struck(c, [[1620, 1, 34], [2700, 0.5, 48], [900, 0.7, 27]], 1.2, 3);
    return (t) => Math.tanh((a(t) + b(t - 0.035) * 0.9 + sine(c.osc(8, 70 + 120 * Math.exp(-25 * t))) * Math.exp(-t * 18) * 0.9) * 0.8) * Math.min(1, (0.25 - t) / 0.04);
  }, { bits: 7 }),
  // Before it runs: its plates rattling, slowly and then faster and faster.
  wyrmRattle: () => draw(0.85, RATE_HI, 112, (c) => {
    const g = rattle(c, RATE_HI, 0.85, 9, 36, 640, 0.988);
    return (t) => Math.tanh(g(t) * 1.1) * (0.45 + 0.55 * (t / 0.85)) * Math.min(1, (0.85 - t) / 0.04);
  }, { bits: 7 }),
  // Its head meeting the wall: the blow, the boom of the wall taking it, and grit coming down after.
  wyrmRam: () => draw(0.9, RATE_LO, 114, (c) => {
    const plates = struck(c, [[310, 1, 14], [730, 0.6, 22], [1240, 0.3, 34]], 1.2, 2);
    return (t) => {
      const boom = sine(c.osc(0, 48 + 70 * Math.exp(-9 * t))) * Math.exp(-t * 5) * 1.5;
      const grit = (c.r() < 0.05 ? c.r() * 2 - 1 : 0) * Math.exp(-t * 4.5) * (t > 0.1 ? 0.9 : 0);
      return Math.tanh((boom + plates(t) + c.lp(0, c.r() * 2 - 1, 0.25) * Math.exp(-t * 8) * 0.8 + grit) * 0.75) * Math.min(1, (0.9 - t) / 0.1);
    };
  }, { bits: 6 }),
  // Its tail coming round: air, brighter and louder, and the crack of the end of it.
  wyrmLash: () => draw(0.32, RATE_HI, 115, (c) => (t) => {
    const n = c.r() * 2 - 1;
    const u = Math.min(1, t / 0.2);
    const air = (c.lp(0, n, 0.05 + 0.5 * u * u) - c.lp(1, n, 0.03)) * u * u * (t < 0.2 ? 1 : Math.exp(-(t - 0.2) * 30));
    const d = t - 0.2;
    const crack = d > 0 ? (c.r() * 2 - 1) * Math.exp(-d * 45) * 1.4 + sine(c.osc(0, 2400 * Math.exp(-d * 30) + 500)) * Math.exp(-d * 30) * 0.9 : 0;
    return Math.tanh(air * 1.9 + crack);
  }, { bits: 7 }),
  // Its ring drawing tight: plates grinding over each other, sticking and slipping, faster and faster.
  wyrmCreak: () => draw(0.65, RATE_HI, 116, (c) => {
    const g = rattle(c, RATE_HI, 0.65, 24, 110, 390, 0.99);
    return (t) => Math.tanh(g(t) * 0.45) * (0.4 + 0.6 * (t / 0.65)) * Math.min(1, t / 0.03) * Math.min(1, (0.65 - t) / 0.03);
  }, { bits: 7, gain: 0.7 }),
  // ...and the ring closing.
  wyrmCrunch: () => draw(0.4, RATE_HI, 121, (c) => (t) => Math.tanh(((c.r() * 2 - 1) * Math.exp(-t * 28) * 1.3 + c.lp(0, c.r() * 2 - 1, 0.15) * Math.exp(-t * 12) * 1.4 + sine(c.osc(1, 50 + 90 * Math.exp(-t * 16))) * Math.exp(-t * 9) * 1.2 + (c.r() < 0.06 ? c.r() * 2 - 1 : 0) * Math.exp(-t * 9)) * 0.9) * Math.min(1, (0.4 - t) / 0.05), { bits: 7 }),
  // A sword on its plates: a dull knock. (They are not iron, and do not ring.)
  plateKnock: () => draw(0.16, RATE_HI, 117, (c) => {
    const hit = struck(c, [[460, 1, 38], [1040, 0.55, 55], [1730, 0.25, 80]], 0.9);
    return (t) => hit(t) + sine(c.osc(4, 85 + 80 * Math.exp(-30 * t))) * Math.exp(-t * 30) * 0.7;
  }, { bits: 7 }),
  // Struck on its head: a roar cut short into a cry, falling.
  wyrmCry: () => draw(0.45, RATE_LO, 118, (c) => (t) => {
    const hz = 310 - 170 * (t / 0.45) + 22 * sine(c.osc(3, 27));
    return (saw(c.osc(0, hz)) * 0.55 + sq(c.osc(1, hz * 2.01), 0.3) * 0.3 + (c.r() * 2 - 1) * 0.25) * (0.6 + 0.4 * tri(c.osc(2, 33))) * bell(t, 0.45);
  }, { bits: 6 }),
  // Its end: the roar going out of it, sinking, and its plates rattling slower and slower until they stop.
  wyrmDie: () => draw(2.2, RATE_LO, 119, (c) => {
    const plates = rattle(c, RATE_LO, 2.2, 26, 2.5, 600, 0.985);
    return (t) => {
      const u = t / 2.2;
      const hz = 120 * Math.exp(-u * 1.6) + 34;
      const growl = saw(c.osc(0, hz)) * 0.6 + sq(c.osc(1, hz * 1.5), 0.35) * 0.3 + sine(c.osc(2, hz * 0.5)) * 0.5;
      const n = c.r() * 2 - 1;
      return (growl * (0.6 + 0.4 * tri(c.osc(3, 24 - 18 * u))) + (n - c.lp(0, n, 0.3)) * 0.35) * (1 - u) ** 1.2 * Math.min(1, t / 0.05) + plates(t) * 0.9 * Math.min(1, u * 2) * Math.min(1, (2.2 - t) / 0.15);
    };
  }, { bits: 6 }),
  // The Hornet Lancer's wings: a low drone with an edge on it, wavering a little. (Every pitch in it turns a whole
  // number of times in the loop, so it joins up.)
  hornetBuzz: () => draw(0.8, RATE_HI, 131, (c) => (t) => {
    const waver = 1 + 0.012 * wob(t, 0.8, 3);
    const beat = 0.72 + 0.28 * wob(t, 0.8, 5);
    return (sq(c.osc(0, 135 * waver), 0.3) * 0.5 + saw(c.osc(1, 270 * waver)) * 0.3 + tri(c.osc(2, 67.5)) * 0.35 + (c.r() * 2 - 1) * 0.08) * beat;
  }, { bits: 7, loop: true, gain: 0.6 }),
  // Winding up: the drone climbing to a whine, louder and louder.
  hornetWhine: () => draw(0.8, RATE_HI, 132, (c) => (t) => {
    const u = t / 0.8;
    const hz = 140 + 300 * u * u;
    const flutter = 0.75 + 0.25 * sq(c.osc(3, 38 + 30 * u), 0.5);
    return (sq(c.osc(0, hz), 0.28) * 0.5 + saw(c.osc(1, hz * 2.01)) * 0.35 + (c.r() * 2 - 1) * 0.1) * flutter * (0.3 + 0.7 * u) * Math.min(1, t / 0.04) * Math.min(1, (0.8 - t) / 0.03);
  }, { bits: 7 }),
  // Struck: one short angry buzz, up and down.
  hornetHurt: () => draw(0.22, RATE_HI, 133, (c) => (t) => {
    const hz = 260 + 240 * Math.sin(Math.PI * (t / 0.22));
    return (sq(c.osc(0, hz), 0.3) * 0.55 + saw(c.osc(1, hz * 1.99)) * 0.3 + (c.r() * 2 - 1) * 0.2) * (0.6 + 0.4 * sq(c.osc(2, 64), 0.5)) * bell(t, 0.22);
  }, { bits: 7 }),
  // Its wings giving out: the drone sinking and breaking up into separate bursts, and then nothing.
  hornetDie: () => draw(0.95, RATE_HI, 134, (c) => (t) => {
    const u = t / 0.95;
    const hz = 300 * Math.exp(-u * 1.7) + 55;
    const sputter = sq(c.osc(2, 30 - 24 * u), 0.55 - 0.3 * u) > 0 ? 1 : 0.08;
    return (sq(c.osc(0, hz), 0.3) * 0.55 + saw(c.osc(1, hz * 2)) * 0.3 + (c.r() * 2 - 1) * 0.12) * sputter * (1 - u) ** 0.8 * Math.min(1, t / 0.01);
  }, { bits: 7 }),
  // ---- The Stag Knight (deep, and iron) ----
  // Its bellow: a horn's note from a chest like a barrel, swelling and falling, with breath on it.
  stagBellow: () => draw(0.9, RATE_LO, 141, (c) => (t) => {
    const u = t / 0.9;
    const hz = 74 + 22 * Math.sin(Math.PI * Math.min(1, u * 1.3)) + 2 * sine(c.osc(4, 5.5));
    const horn = saw(c.osc(0, hz)) * 0.5 + sq(c.osc(1, hz * 2), 0.4) * 0.28 + sine(c.osc(2, hz * 3)) * 0.22 + sine(c.osc(3, hz * 0.5)) * 0.4;
    // (Its edge, which a small speaker can carry: the same note two octaves up, unsoftened.)
    const edge = saw(c.osc(5, hz * 4)) * 0.2 + sq(c.osc(6, hz * 6), 0.3) * 0.1;
    return (c.lp(1, horn, 0.45) * 1.6 + edge + c.lp(0, c.r() * 2 - 1, 0.3) * 0.35) * Math.min(1, t / 0.1) * Math.min(1, (0.9 - t) / 0.3);
  }, { bits: 6 }),
  // One of its feet coming down: its weight, and its plates knocking together a moment after.
  stagStep: () => draw(0.26, RATE_HI, 142, (c) => {
    const plates = struck(c, [[620, 0.9, 30], [1090, 0.6, 40], [1710, 0.35, 54]], 0.7);
    return (t) => Math.tanh((sine(c.osc(6, 46 + 80 * Math.exp(-20 * t))) * Math.exp(-t * 15) * 1.4 + c.lp(0, c.r() * 2 - 1, 0.2) * Math.exp(-t * 26) * 0.7 + plates(t - 0.012)) * 0.9) * Math.min(1, (0.26 - t) / 0.04);
  }, { bits: 7 }),
  // The hammer going up: the creak of the shaft in its grip, and the hum of the iron heating, climbing, with sparks.
  hammerHum: () => draw(0.9, RATE_HI, 143, (c) => {
    const creak = rattle(c, RATE_HI, 0.9, 30, 14, 520, 0.985);
    return (t) => {
      const u = t / 0.9;
      const hz = 82 + 96 * u * u;
      const hum = (sine(c.osc(0, hz)) * 0.6 + saw(c.osc(1, hz * 2.01)) * 0.25 + sine(c.osc(2, hz * 3.02)) * 0.2) * (0.25 + 0.75 * u) * (0.85 + 0.15 * sine(c.osc(3, 11)));
      const sparks = (c.r() < 0.012 + 0.03 * u ? c.r() * 2 - 1 : 0) * 0.7 * u;
      return (hum + sparks + creak(t) * 0.35 * (1 - u)) * Math.min(1, t / 0.05) * Math.min(1, (0.9 - t) / 0.04);
    };
  }, { bits: 7 }),
  // The hammer landing: iron on stone. A great low clang (two of its notes a hair apart) over the boom of the floor.
  hammerSlam: () => draw(1.0, RATE_HI, 144, (c) => {
    const iron = struck(c, [[176, 1, 4.5], [183, 0.5, 5], [412, 0.75, 6.5], [705, 0.5, 9], [1120, 0.3, 13], [1890, 0.18, 20]], 1.0);
    return (t) => Math.tanh((iron(t) + sine(c.osc(8, 42 + 90 * Math.exp(-12 * t))) * Math.exp(-t * 7) * 1.3 + c.lp(0, c.r() * 2 - 1, 0.3) * Math.exp(-t * 14) * 0.8) * 0.5) * Math.min(1, (1 - t) / 0.1);
  }, { bits: 7 }),
  // Its wing cases lifting before a stomp: a dry clatter, quickening.
  stagRattle: () => draw(0.55, RATE_HI, 145, (c) => {
    const g = rattle(c, RATE_HI, 0.55, 14, 44, 980, 0.984);
    return (t) => Math.tanh(g(t) * 1.2) * (0.5 + 0.5 * (t / 0.55)) * Math.min(1, (0.55 - t) / 0.04);
  }, { bits: 7 }),
  // Its end: the bellow sinking out of it, and its plates settling.
  stagDie: () => draw(1.4, RATE_LO, 146, (c) => {
    const plates = rattle(c, RATE_LO, 1.4, 16, 2.5, 700, 0.985);
    return (t) => {
      const u = t / 1.4;
      const hz = 92 * Math.exp(-u * 1.1) + 30;
      const horn = saw(c.osc(0, hz)) * 0.5 + sq(c.osc(1, hz * 2), 0.4) * 0.28 + sine(c.osc(2, hz * 3)) * 0.2 + sine(c.osc(3, hz * 0.5)) * 0.4;
      const edge = saw(c.osc(5, hz * 4)) * 0.2 + sq(c.osc(6, hz * 6), 0.3) * 0.1;
      return (c.lp(1, horn, 0.45) * 1.6 + edge) * (1 - u) ** 1.1 * Math.min(1, t / 0.05) + plates(t) * 0.8 * Math.min(1, u * 2) * Math.min(1, (1.4 - t) / 0.12);
    };
  }, { bits: 6 }),
  // ---- The Orchid Mantis (thin, dry and sharp) ----
  // Seeing him: a dry trill, rising (wing on wing case).
  mantisHiss: () => draw(0.45, RATE_HI, 151, (c) => {
    const trill = rattle(c, RATE_HI, 0.45, 38, 76, 3300, 0.955);
    return (t) => {
      const n = c.r() * 2 - 1;
      return (Math.tanh(trill(t) * 1.4) + (n - c.lp(0, n, 0.45)) * 0.25 * (t / 0.45)) * Math.min(1, t / 0.02) * Math.min(1, (0.45 - t) / 0.05);
    };
  }, { bits: 7 }),
  // A scythe going up: the scrape of it coming free and a thin bright ring, like a blade drawn.
  scytheRing: () => draw(0.5, RATE_HI, 152, (c) => {
    const blade = struck(c, [[2640, 1, 7], [2668, 0.5, 8], [3960, 0.55, 10], [5310, 0.3, 14]], 0.25);
    return (t) => {
      const n = c.r() * 2 - 1;
      return (blade(t) + (n - c.lp(0, n, 0.5)) * Math.exp(-t * 30) * 0.5) * Math.min(1, (0.5 - t) / 0.06);
    };
  }, { bits: 7, gain: 0.8 }),
  // The cut: quick and tight, climbing.
  scytheCut: () => draw(0.16, RATE_HI, 153, (c) => (t) => {
    const u = t / 0.16;
    const n = c.r() * 2 - 1;
    return (c.lp(0, n, 0.2 + 0.7 * u) - c.lp(1, n, 0.12)) * bell(t, 0.16) * 1.6 + sine(c.osc(0, 3200 + 1800 * u)) * 0.12 * bell(t, 0.16);
  }, { bits: 7 }),
  // Its wings flaring before a leap: a papery flutter, swelling.
  mantisWings: () => draw(0.6, RATE_HI, 154, (c) => (t) => {
    const u = t / 0.6;
    const n = c.r() * 2 - 1;
    const flutter = 0.5 + 0.5 * sq(c.osc(0, 34 + 22 * u), 0.5);
    return ((c.lp(0, n, 0.35) - c.lp(1, n, 0.08)) * 1.4 + tri(c.osc(1, 168 + 40 * u)) * 0.3) * flutter * (0.3 + 0.7 * u) * Math.min(1, t / 0.04) * Math.min(1, (0.6 - t) / 0.05);
  }, { bits: 7 }),
  // Struck: two thin chirps, the second lower.
  mantisCry: () => draw(0.2, RATE_HI, 155, (c) => (t) => {
    const second = t > 0.09;
    const d = second ? t - 0.09 : t;
    const hz = (second ? 3000 : 3900) - 600 * (d / 0.1);
    return (sq(c.osc(0, hz), 0.2) * 0.5 + sine(c.osc(1, hz * 1.5)) * 0.25) * bell(d, second ? 0.11 : 0.08);
  }, { bits: 7, gain: 0.65 }),
  // Its end: the trill running down, thinner and slower.
  mantisDie: () => draw(0.95, RATE_HI, 156, (c) => {
    const trill = rattle(c, RATE_HI, 0.95, 60, 5, 3000, 0.96);
    return (t) => {
      const u = t / 0.95;
      const hz = 3400 * Math.exp(-u * 1.3) + 500;
      return (sq(c.osc(0, hz), 0.2) * 0.35 * (1 - u) ** 1.5 + Math.tanh(trill(t) * 1.3) * (1 - 0.6 * u)) * Math.min(1, t / 0.01) * Math.min(1, (0.95 - t) / 0.1);
    };
  }, { bits: 7 }),
  // ---- The Keep Guard (a rat, but a soldier) ----
  // His bark: a rat's voice, low and short.
  guardBark: () => draw(0.2, RATE_HI, 161, (c) => (t) => {
    const u = t / 0.2;
    const hz = 300 - 110 * u + 30 * Math.sin(u * Math.PI);
    const voice = saw(c.osc(0, hz)) * 0.5 + sq(c.osc(1, hz * 2.02), 0.35) * 0.25 + (c.r() * 2 - 1) * 0.18;
    return c.lp(0, voice, 0.55) * 1.5 * (0.7 + 0.3 * sq(c.osc(2, 48), 0.5)) * bell(t, 0.2);
  }, { bits: 7 }),
  // His spear drawn back: steel sliding over the rim of his shield. (A scrape is many small catches: noise let through
  // in a patter that quickens, into two ringing notes.)
  spearReady: () => draw(0.5, RATE_HI, 162, (c) => {
    const rim = knock(1900, RATE_HI, 0.995);
    const rim2 = knock(2850, RATE_HI, 0.994);
    return (t) => {
      const u = t / 0.5;
      const x = sq(c.osc(0, 60 + 120 * u), 0.3) > 0 && t < 0.42 ? c.r() * 2 - 1 : 0;
      return (rim(x) + rim2(x) * 0.7) * (0.4 + 0.6 * u) * Math.min(1, (0.5 - t) / 0.05);
    };
  }, { bits: 7 }),
  // Struck: a pained squeak, low for a rat.
  guardYelp: () => draw(0.26, RATE_HI, 163, (c) => (t) => {
    const u = t / 0.26;
    const hz = 620 - 330 * u + 40 * sine(c.osc(2, 22));
    return c.lp(0, saw(c.osc(0, hz)) * 0.55 + sq(c.osc(1, hz * 1.5), 0.3) * 0.25 + (c.r() * 2 - 1) * 0.15, 0.6) * 1.4 * bell(t, 0.26);
  }, { bits: 7 }),
  // His end: a groan going down, and his gear hitting the floor.
  guardDie: () => draw(0.95, RATE_HI, 164, (c) => {
    const gear = struck(c, [[540, 0.8, 9], [556, 0.4, 10], [1230, 0.5, 13], [2010, 0.3, 19]], 0.9, 3);
    return (t) => {
      const u = Math.min(1, t / 0.6);
      const hz = 420 * Math.exp(-u * 1.5) + 90;
      const groan = c.lp(0, saw(c.osc(0, hz)) * 0.55 + sq(c.osc(1, hz * 2.01), 0.35) * 0.22 + (c.r() * 2 - 1) * 0.12, 0.5) * 1.5 * (1 - u) ** 0.8 * Math.min(1, t / 0.02);
      return Math.tanh((groan + gear(t - 0.55) * 0.9) * 0.9) * Math.min(1, (0.95 - t) / 0.08);
    };
  }, { bits: 7 }),
  // The Ant Pikeman. Its jaws clacking together a few times, quickening: how an ant shouts.
  antClick: () => draw(0.34, RATE_HI, 171, (c) => {
    const clack = rattle(c, RATE_HI, 0.34, 11, 26, 1150, 0.972);
    const low = knock(520, RATE_HI, 0.985);
    return (t) => {
      const x = clack(t);
      return Math.tanh((x + low(x) * 3) * 1.6) * Math.min(1, (0.34 - t) / 0.04);
    };
  }, { bits: 7 }),
  // Its pike drawn back: the ash shaft sliding through its claw (a dry wooden rasp, the catches coming quicker), and
  // the creak of the ant setting itself behind it.
  pikeReady: () => draw(0.55, RATE_HI, 172, (c) => {
    const wood = knock(470, RATE_HI, 0.99);
    const wood2 = knock(810, RATE_HI, 0.988);
    return (t) => {
      const u = t / 0.55;
      const x = sq(c.osc(0, 34 + 70 * u), 0.25) > 0 && t < 0.5 ? c.r() * 2 - 1 : 0;
      const creak = sq(c.osc(1, 150 + 90 * u * u), 0.2) * 0.02 * u * (sq(c.osc(2, 23 + 30 * u), 0.5) > 0 ? 1 : 0.2);
      return ((wood(x) + wood2(x) * 0.6) * (0.2 + 0.8 * u) + creak) * Math.min(1, (0.55 - t) / 0.03);
    };
  }, { bits: 7 }),
  // Its jaws shut: two hard clacks a hair apart, horn on horn; lower and drier than the wyrm's fangs.
  antSnap: () => draw(0.2, RATE_HI, 173, (c) => {
    const a = struck(c, [[720, 1, 40], [1150, 0.6, 55], [450, 0.8, 32]], 0.6);
    const b = struck(c, [[810, 1, 44], [1290, 0.5, 60], [500, 0.7, 36]], 0.5, 3);
    return (t) => Math.tanh((a(t) + b(t - 0.022) * 0.9) * 0.9) * Math.min(1, (0.2 - t) / 0.04);
  }, { bits: 7 }),
  // Struck: a scraped chirp (an ant's cry is made by rubbing), falling.
  antHurt: () => draw(0.2, RATE_HI, 174, (c) => (t) => {
    const u = t / 0.2;
    const hz = 1240 - 540 * u;
    const chirp = c.lp(0, sq(c.osc(0, hz), 0.3) * 0.5 + sq(c.osc(1, hz * 1.51), 0.25) * 0.3 + (c.r() * 2 - 1) * 0.12, 0.45);
    const scrape = sq(c.osc(2, 95 - 30 * u), 0.6) > 0 ? 1 : 0.15;
    return chirp * scrape * bell(t, 0.2);
  }, { bits: 7 }),
  // Its end: the chirp running down and slowing, and its pike clattering on the floor: wood, twice.
  antDie: () => draw(0.9, RATE_HI, 175, (c) => {
    const pike = struck(c, [[330, 0.9, 13], [690, 0.5, 19], [1130, 0.3, 27]], 0.8, 3);
    const pike2 = struck(c, [[365, 0.8, 16], [760, 0.45, 22], [1240, 0.25, 30]], 0.6, 6);
    return (t) => {
      const u = Math.min(1, t / 0.55);
      const hz = 1050 * Math.exp(-u * 1.3) + 200;
      const chirp = c.lp(0, sq(c.osc(0, hz), 0.3) * 0.5 + sq(c.osc(1, hz * 1.51), 0.25) * 0.3, 0.45) * 1.6 * (sq(c.osc(2, 80 * (1 - u) + 12), 0.55) > 0 ? 1 : 0.1) * (1 - u) ** 0.7 * Math.min(1, t / 0.01);
      return Math.tanh((chirp * 0.9 + pike(t - 0.42) + pike2(t - 0.6) * 0.8) * 0.9) * Math.min(1, (0.9 - t) / 0.08);
    };
  }, { bits: 7 }),
  // ---- Riding the shield ----
  // The rim of it on stone: a gritty hiss with a hollow ring under it, catching now and then. (A loop: its two
  // wobbles turn whole numbers of times in it.)
  rideScrape: () => draw(0.6, RATE_HI, 221, (c) => (t) => {
    const n = c.r() * 2 - 1;
    const grit = c.lp(0, n, 0.45) - c.lp(1, n, 0.09);
    const hollow = c.lp(2, n, 0.03) * 2.2;
    const catchy = 0.75 + 0.25 * wob(t, 0.6, 7) * wob(t, 0.6, 3);
    return (grit * 0.9 + hollow * 0.5 + sine(c.osc(0, 310)) * 0.05) * catchy;
  }, { bits: 7, loop: true, gain: 0.5 }),
  // It leaves the ground, or meets it again: one hard crack of iron and wood, with the board's own hollow note.
  ridePop: () => draw(0.26, RATE_HI, 222, (c) => {
    const hit = struck(c, [[520, 1, 18], [1250, 0.7, 30], [2700, 0.4, 60]], 1.2);
    return (t) => hit(t) + c.lp(0, c.r() * 2 - 1, 0.5) * Math.exp(-t * 70) * 0.5;
  }, { bits: 7, gain: 0.8 }),
  // He comes off it: the shield skitters away over the stone, three knocks getting quicker and quieter.
  rideClatter: () => draw(0.5, RATE_HI, 223, (c) => {
    const hits = [0, 0.13, 0.23, 0.3, 0.35].map((at, k) => ({ at, hit: struck(c, [[640 + k * 90, 1, 26], [1700 + k * 160, 0.6, 44]], 1, k * 2) }));
    return (t) => {
      let v = 0;
      hits.forEach((h, k) => {
        if (t >= h.at) v += h.hit(t - h.at) * (1 - k * 0.17);
      });
      return v;
    };
  }, { bits: 7, gain: 0.8 }),
  // ---- The Firefly Bomber (soft, and glassy: nothing like the hornet's rasp) ----
  // Its wings: a soft whirr, a round low note with air on it, fluttering. (Every pitch in it turns a whole number of
  // times in the loop, so it joins up.)
  fireflyHum: () => draw(0.8, RATE_HI, 211, (c) => (t) => {
    const flutter = 0.62 + 0.38 * tri(c.osc(3, 45));
    const n = c.r() * 2 - 1;
    return (tri(c.osc(0, 190)) * 0.5 + sine(c.osc(1, 95)) * 0.35 + sine(c.osc(2, 380)) * 0.12 + (c.lp(0, n, 0.12) - c.lp(1, n, 0.05)) * 0.9) * flutter * (0.85 + 0.15 * wob(t, 0.8, 2));
  }, { bits: 7, loop: true, gain: 0.5 }),
  // Before a run: its lantern blinking, each blink a clear glass note, faster and faster and higher and higher.
  fireflyBlink: () => draw(0.7, RATE_HI, 212, (c) => {
    let turn = 1;
    let since = 1;
    let hz = 1150;
    return (t) => {
      const u = t / 0.7;
      turn += (7 + 26 * u * u) / RATE_HI;
      since += 1 / RATE_HI;
      if (turn >= 1) {
        turn -= 1;
        since = 0;
        hz = 1150 + 1350 * u;
      }
      const note = (sine(c.osc(0, hz)) * 0.6 + sine(c.osc(1, hz * 1.5)) * 0.3 + sine(c.osc(2, hz * 2.76)) * 0.14) * Math.exp(-since * (22 + 30 * u)) * Math.min(1, since / 0.002);
      return note * (0.35 + 0.65 * u) * Math.min(1, (0.7 - t) / 0.02);
    };
  }, { bits: 7 }),
  // A drop of fire let go: a round little note falling away, with a spit of sparks on it.
  emberDrop: () => draw(0.24, RATE_HI, 213, (c) => (t) => {
    const u = t / 0.24;
    const hz = 1150 * Math.exp(-u * 1.5) + 180;
    const n = c.r() * 2 - 1;
    return (sine(c.osc(0, hz)) * 0.8 + sine(c.osc(1, hz * 2.02)) * 0.2) * (1 - u) ** 1.3 * Math.min(1, t / 0.004) + (n - c.lp(0, n, 0.35)) * 0.3 * Math.exp(-t * 40);
  }, { bits: 7 }),
  // The drop meets the floor and catches: a soft thump, the whoomph of flame taking, and a few cracks as it settles.
  emberBurst: () => draw(0.7, RATE_HI, 214, (c) => {
    const cracks = Array.from({ length: 6 }, () => ({ at: 0.1 + c.r() * 0.5, amp: 0.4 + c.r() * 0.5 }));
    return (t) => {
      const n = c.r() * 2 - 1;
      // (The whoomph opens up as it takes: dull at first, then air in it.)
      const open = 0.02 + 0.1 * Math.min(1, t / 0.12);
      let v = c.lp(0, n, open) * 1.7 * Math.min(1, t / 0.035) * Math.exp(-t * 5.5) + sine(c.osc(0, 120 * Math.exp(-t * 14) + 48)) * 0.9 * Math.exp(-t * 13);
      for (const k of cracks) {
        const d = t - k.at;
        if (d > 0 && d < 0.02) v += (c.r() * 2 - 1) * k.amp * 0.3 * Math.exp(-d * 260);
      }
      return v * Math.min(1, (0.7 - t) / 0.1);
    };
  }, { bits: 7 }),
  // Its light going out: the glass note sinking, blinking slower and slower, and dimmer.
  fireflyFade: () => draw(0.8, RATE_HI, 215, (c) => {
    let turn = 1;
    let since = 1;
    let hz = 1100;
    return (t) => {
      const u = t / 0.8;
      turn += (15 - 11 * u) / RATE_HI;
      since += 1 / RATE_HI;
      if (turn >= 1) {
        turn -= 1;
        since = 0;
        hz = 1100 * Math.exp(-u * 1.5);
      }
      return (sine(c.osc(0, hz)) * 0.6 + sine(c.osc(1, hz * 1.5)) * 0.25 + sine(c.osc(2, hz * 0.5)) * 0.3) * Math.exp(-since * 14) * Math.min(1, since / 0.003) * (1 - u) ** 0.8;
    };
  }, { bits: 7 }),
  // Struck: a thin glass peep, bent down, with a quick shake in it.
  fireflyHurt: () => draw(0.2, RATE_HI, 216, (c) => (t) => {
    const u = t / 0.2;
    const hz = (2500 - 1000 * u) * (1 + 0.05 * sine(c.osc(3, 55)));
    return (sine(c.osc(0, hz)) * 0.7 + sine(c.osc(1, hz * 1.5)) * 0.2 + tri(c.osc(2, hz * 0.5)) * 0.15) * bell(t, 0.2) + (c.r() * 2 - 1) * 0.25 * Math.exp(-t * 90);
  }, { bits: 7 }),
  // Its end: its wings stuttering out under one last long note of its light, sinking and going dim.
  fireflyDie: () => draw(1.0, RATE_HI, 217, (c) => (t) => {
    const u = t / 1.0;
    const stutter = sq(c.osc(4, 26 - 21 * u), 0.5 - 0.25 * u) > 0 ? 1 : 0.1;
    const wings = (tri(c.osc(0, 190 * Math.exp(-u * 0.9))) * 0.45 + sine(c.osc(1, 95 * Math.exp(-u * 0.9))) * 0.3) * stutter * (1 - u) ** 0.7;
    const hz = 1250 * Math.exp(-u * 1.9) + 150;
    const light = (sine(c.osc(2, hz)) * 0.5 + sine(c.osc(3, hz * 1.5)) * 0.2) * (0.55 + 0.45 * sine(c.osc(5, 9 - 6 * u))) * (1 - u) ** 1.4;
    return (wings + light) * Math.min(1, t / 0.008);
  }, { bits: 7 }),
  // The Ironback. Before it rams: its horn and feet scraping the floor, three long rasps, each harder than the last.
  ironScrape: () => draw(0.9, RATE_HI, 181, (c) => {
    const stone = knock(310, RATE_HI, 0.97);
    const stone2 = knock(730, RATE_HI, 0.96);
    return (t) => {
      const u = t / 0.9;
      const k = (t % 0.3) / 0.22;
      const on = k < 1 ? Math.sin(Math.PI * k) ** 0.7 : 0;
      const grit = sq(c.osc(0, 70 + 50 * u), 0.4) > 0 ? c.r() * 2 - 1 : (c.r() * 2 - 1) * 0.25;
      return (stone(grit) + stone2(grit) * 0.5) * on * (0.45 + 0.55 * u);
    };
  }, { bits: 7 }),
  // The ram: its feet drumming on the floor under all that iron, faster as it comes, and its shell rattling over them.
  ironCharge: () => draw(1.2, RATE_HI, 182, (c) => {
    const feet = rattle(c, RATE_HI, 1.2, 11, 19, 150, 0.985);
    const shell = rattle(c, RATE_HI, 1.2, 23, 31, 640, 0.97);
    return (t) => Math.tanh((feet(t) * 1.6 + shell(t) * 0.35) * 1.3) * Math.min(1, t / 0.05) * Math.min(1, (1.2 - t) / 0.15);
  }, { bits: 7, gain: 0.78 }),
  // Its head meeting a wall: a great dull knock, and the iron of its shell ringing low and short after it.
  ironBonk: () => draw(0.8, RATE_HI, 183, (c) => {
    const shell = struck(c, [[128, 1, 7], [196, 0.7, 9], [333, 0.5, 13], [540, 0.25, 20]], 0.7);
    return (t) => Math.tanh((shell(t) + sine(c.osc(8, 48 + 90 * Math.exp(-18 * t))) * Math.exp(-t * 9) * 1.2 + c.lp(0, c.r() * 2 - 1, 0.15) * Math.exp(-t * 14) * 0.7) * 0.6) * Math.min(1, (0.8 - t) / 0.08);
  }, { bits: 7 }),
  // Its horn going down for a toss: a short hard grunt of steam, and the scrape of the horn's point.
  ironToss: () => draw(0.42, RATE_HI, 184, (c) => {
    const stone = knock(420, RATE_HI, 0.965);
    return (t) => {
      const u = t / 0.42;
      const n = c.r() * 2 - 1;
      const steam = c.lp(0, n, 0.2 + 0.3 * u) * Math.sin(Math.PI * Math.min(1, u * 1.3)) ** 0.6;
      const grunt = sine(c.osc(1, 95 - 25 * u + 8 * sine(c.osc(2, 31)))) * 0.6 * bell(t, 0.42);
      const scrape = stone(sq(c.osc(3, 90 + 80 * u), 0.35) > 0 ? n : 0) * u * 1.2;
      return (steam * 0.8 + grunt + scrape) * Math.min(1, (0.42 - t) / 0.04);
    };
  }, { bits: 7 }),
  // Getting off its back: its shell rocking on the stone, three knocks quickening, and the thump of its feet coming down.
  ironRise: () => draw(0.6, RATE_HI, 185, (c) => {
    const rock = struck(c, [[240, 1, 22], [395, 0.6, 30], [702, 0.3, 40]], 0.9);
    const rock2 = struck(c, [[262, 1, 24], [431, 0.6, 32], [760, 0.3, 42]], 0.9, 3);
    const rock3 = struck(c, [[228, 1, 20], [380, 0.6, 28], [690, 0.3, 38]], 1, 6);
    return (t) => {
      const down = t > 0.45 ? sine(c.osc(9, 50 + 70 * Math.exp(-20 * (t - 0.45)))) * Math.exp(-(t - 0.45) * 14) * 1.3 : 0;
      return Math.tanh((rock(t) * 0.7 + rock2(t - 0.19) * 0.85 + rock3(t - 0.33) + down) * 0.7) * Math.min(1, (0.6 - t) / 0.05);
    };
  }, { bits: 7 }),
  // Its end: the steam going out of it in one long falling hiss, a low groan under it, and its shell settling on the floor.
  ironDie: () => draw(1.2, RATE_HI, 186, (c) => {
    const settle = struck(c, [[196, 1, 6], [203, 0.5, 6.5], [440, 0.6, 9], [760, 0.3, 13]], 0.5, 2);
    return (t) => {
      const u = Math.min(1, t / 0.8);
      const n = c.r() * 2 - 1;
      const steam = (c.lp(0, n, 0.5 - 0.42 * u) - c.lp(1, n, 0.04)) * (1 - u) ** 0.7 * Math.min(1, t / 0.02);
      const groan = sine(c.osc(0, 90 - 45 * u)) * 0.35 * (1 - u);
      return Math.tanh((steam * 1.1 + groan + settle(t - 0.7) * 0.8) * 0.9) * Math.min(1, (1.2 - t) / 0.1);
    };
  }, { bits: 7 }),
  // The Flitter's end: its squeak falling away, and one last flutter of its wings.
  batDie: () => draw(0.45, RATE_HI, 187, (c) => (t) => {
    const u = t / 0.45;
    const hz = 4200 * Math.exp(-u * 1.6) + 600;
    const squeak = (sq(c.osc(0, hz + 300 * sine(c.osc(2, 38))), 0.25) * 0.5 + tri(c.osc(1, hz * 1.5)) * 0.3) * (1 - u) ** 0.6;
    const flutter = c.lp(0, c.r() * 2 - 1, 0.3) * (sq(c.osc(3, 26 - 14 * u), 0.4) > 0 ? 0.5 : 0) * u * (1 - u) * 3;
    return (squeak + flutter) * Math.min(1, t / 0.005) * Math.min(1, (0.45 - t) / 0.06);
  }, { bits: 7, gain: 0.55 }),
  // The Broodmother coming down off her thread: the air she pushes ahead of her, and her hiss in it, growing till she lands.
  broodDrop: () => draw(0.5, RATE_HI, 188, (c) => (t) => {
    const u = t / 0.5;
    const n = c.r() * 2 - 1;
    const air = c.lp(0, n, 0.04 + 0.5 * u * u) - c.lp(1, n, 0.02);
    const hiss = (n - c.lp(2, n, 0.3)) * (sq(c.osc(0, 60 + 70 * u), 0.5) > 0 ? 1 : 0.3) * 0.35 * u;
    return (air + hiss) * u ** 1.5 * Math.min(1, (0.5 - t) / 0.02);
  }, { bits: 7 }),
  // Lord Grimsqueak. The Engine's light gathering in his hands: a thin shimmer climbing, beating faster as it comes.
  grimGather: () => draw(0.9, RATE_HI, 191, (c) => (t) => {
    const u = t / 0.9;
    const hz = 520 * 2 ** (u * 1.6);
    const beat = 0.6 + 0.4 * sine(c.osc(3, 9 + 22 * u));
    const light = sine(c.osc(0, hz)) * 0.5 + sine(c.osc(1, hz * 1.503)) * 0.32 + tri(c.osc(2, hz * 2.01)) * 0.2;
    const n = c.r() * 2 - 1;
    return (light * beat + (n - c.lp(0, n, 0.5)) * 0.1 * u) * u ** 0.8 * Math.min(1, (0.9 - t) / 0.03);
  }, { bits: 7 }),
  // A bolt of it thrown: a hard bright crack falling away.
  grimBolt: () => draw(0.2, RATE_HI, 192, (c) => (t) => {
    const u = t / 0.2;
    const hz = 2600 * Math.exp(-u * 2.2) + 420;
    return (sq(c.osc(0, hz), 0.3) * 0.5 + sine(c.osc(1, hz * 0.5)) * 0.5 + (c.r() * 2 - 1) * 0.5 * Math.exp(-t * 60)) * decay(t, 0.2, 0.002);
  }, { bits: 7 }),
  // A bolt bursting where it lands: a spit of sparks.
  boltBurst: () => draw(0.26, RATE_HI, 193, (c) => {
    const ping = struck(c, [[1870, 0.9, 12], [2790, 0.6, 16], [3940, 0.35, 24]], 1.2);
    return (t) => {
      const n = c.r() * 2 - 1;
      const crackle = (n - c.lp(0, n, 0.4)) * (c.r() < 0.3 ? 1 : 0.2) * Math.exp(-t * 9) * 0.9;
      return Math.tanh((ping(t) + crackle) * 1.5) * Math.min(1, (0.26 - t) / 0.03);
    };
  }, { bits: 7, gain: 0.55 }),
  // His swoop: his cloak tearing through the air, and his snarl in it, rising as he comes.
  grimSwoop: () => draw(0.65, RATE_HI, 194, (c) => (t) => {
    const u = t / 0.65;
    const n = c.r() * 2 - 1;
    const air = c.lp(0, n, 0.05 + 0.4 * Math.sin(Math.PI * u)) - c.lp(1, n, 0.03);
    const hz = 120 + 110 * u;
    const snarl = c.lp(2, saw(c.osc(0, hz + 14 * sine(c.osc(1, 43)))) * 0.6 + sq(c.osc(2, hz * 2.02), 0.3) * 0.2, 0.5);
    return (air * 0.9 + snarl * 0.9) * bell(t, 0.65);
  }, { bits: 7 }),
  // His slam: the boom of him coming down, and the ring of light running out from it (a bright tone falling fast).
  grimSlam: () => draw(1.0, RATE_HI, 195, (c) => (t) => {
    const boom = sine(c.osc(0, 42 + 110 * Math.exp(-16 * t))) * Math.exp(-t * 5) * 1.3 + c.lp(0, c.r() * 2 - 1, 0.12) * Math.exp(-t * 11) * 0.8;
    const hz = 1500 * Math.exp(-t * 3.2) + 240;
    const ring = (sine(c.osc(1, hz)) * 0.4 + sine(c.osc(2, hz * 1.498)) * 0.25) * Math.exp(-t * 3.4) * (0.7 + 0.3 * sine(c.osc(3, 23)));
    return Math.tanh((boom + ring * 0.8) * 0.8) * Math.min(1, t / 0.002) * Math.min(1, (1 - t) / 0.1);
  }, { bits: 7, gain: 0.85 }),
  // The orb sent on its way: a slow round hum with a wobble in it.
  orbHum: () => draw(0.7, RATE_HI, 196, (c) => (t) => {
    const u = t / 0.7;
    const hz = 196 * (1 + 0.25 * u) * (1 + 0.04 * sine(c.osc(2, 7)));
    return (sine(c.osc(0, hz)) * 0.6 + sine(c.osc(1, hz * 2.997)) * 0.25 + tri(c.osc(3, hz * 1.5)) * 0.12) * (0.75 + 0.25 * sine(c.osc(4, 13))) * bell(t, 0.7) ** 0.6;
  }, { bits: 7, gain: 0.7 }),
  // The orb struck (by the knight's sword, or batted back by Grimsqueak): glass rung with iron. It rings on.
  orbStrike: () => draw(0.5, RATE_HI, 197, (c) => {
    const glass = struck(c, [[1245, 1, 9], [1876, 0.6, 12], [2510, 0.45, 15], [3330, 0.25, 22]], 1.2);
    return (t) => (glass(t) + sine(c.osc(6, 311)) * 0.4 * Math.exp(-t * 14)) * Math.min(1, (0.5 - t) / 0.05);
  }, { bits: 7 }),
  // He is hurt: a rat's shriek under all that grandeur, breaking as it falls.
  grimCry: () => draw(0.5, RATE_HI, 198, (c) => (t) => {
    const u = t / 0.5;
    const hz = 980 - 520 * u ** 0.7 + 40 * sine(c.osc(2, 27));
    const voice = saw(c.osc(0, hz)) * 0.55 + sq(c.osc(1, hz * 1.5), 0.3) * 0.25 + (c.r() * 2 - 1) * 0.14;
    const broken = u > 0.55 ? (sq(c.osc(3, 34), 0.6) > 0 ? 1 : 0.25) : 1;
    return c.lp(0, voice, 0.6) * 1.4 * broken * bell(t, 0.5) ** 0.7;
  }, { bits: 7 }),
  // He bursts away: a thump of air pushed out all round him, and the light snapping after it.
  grimRepel: () => draw(0.5, RATE_HI, 199, (c) => (t) => {
    const n = c.r() * 2 - 1;
    const push = sine(c.osc(0, 60 + 140 * Math.exp(-22 * t))) * Math.exp(-t * 8) * 1.2 + c.lp(0, n, 0.25) * Math.exp(-t * 12) * 0.8;
    const hz = 700 * 2 ** (Math.min(1, t / 0.22) * 1.3);
    const snap = (sine(c.osc(1, hz)) * 0.35 + sine(c.osc(2, hz * 1.5)) * 0.2) * Math.exp(-Math.max(0, t - 0.2) * 14) * Math.min(1, t / 0.03);
    return Math.tanh((push + snap) * 0.8) * Math.min(1, (0.5 - t) / 0.05);
  }, { bits: 7 }),
  // He sinks, spent: the light going out of him, a tone sliding down and guttering.
  grimSag: () => draw(0.7, RATE_HI, 200, (c) => (t) => {
    const u = t / 0.7;
    const hz = 620 * 2 ** (-u * 1.4);
    const gutter = 0.55 + 0.45 * sq(c.osc(3, 11 + 16 * u), 0.5 + 0.3 * u);
    return (sine(c.osc(0, hz)) * 0.5 + sine(c.osc(1, hz * 1.503)) * 0.3 + tri(c.osc(2, hz * 0.5)) * 0.25) * gutter * (1 - u) ** 0.6 * Math.min(1, t / 0.02);
  }, { bits: 7 }),
  // His end: the shriek drawn out and falling, the light tearing loose from him in sparks, and a last low boom.
  grimDie: () => draw(1.8, RATE_HI, 201, (c) => {
    const sparks = Array.from({ length: 14 }, (_, i) => ({ at: 0.2 + i * 0.055 + c.r() * 0.03, hz: 1400 + c.r() * 2600 }));
    return (t) => {
      const u = Math.min(1, t / 0.95);
      const hz = 900 * Math.exp(-u * 1.9) + 70 + 30 * sine(c.osc(2, 19 + 20 * u));
      const voice = c.lp(0, saw(c.osc(0, hz)) * 0.55 + sq(c.osc(1, hz * 1.5), 0.3) * 0.25 + (c.r() * 2 - 1) * 0.12, 0.55) * 1.3 * (1 - u) ** 0.5 * Math.min(1, t / 0.02);
      let light = 0;
      for (const sp of sparks) {
        const d = t - sp.at;
        if (d >= 0 && d < 0.2) light += tri(sp.hz * d) * Math.exp(-d * 22) * 0.35;
      }
      const boom = t > 0.9 ? sine(c.osc(3, 40 + 80 * Math.exp(-14 * (t - 0.9)))) * Math.exp(-(t - 0.9) * 5.5) * 1.1 : 0;
      return Math.tanh((voice + light + boom) * 0.85) * Math.min(1, (1.8 - t) / 0.12);
    };
  }, { bits: 7 }),
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
