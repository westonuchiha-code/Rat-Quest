/**
 * The music: short looping tracks written as data, played by a small sequencer using the sampled instruments in synth.ts.
 * Like a console soundtrack, it is a handful of voices playing a pattern, not a recording. Pure data, so tests can check it.
 */
import type { InstrumentName } from './synth';

export type TrackName = 'drift' | 'pump' | 'groove' | 'echo' | 'march';

export interface Note {
  /** Position in 16th-note steps from the start of the loop. */
  step: number;
  /** MIDI note number (ignored by drums). */
  midi: number;
  /** Length in steps. */
  len: number;
  vel: number;
}

export interface Lane {
  inst: InstrumentName;
  gain: number;
  /** How much of the sound goes to the reverb. */
  verb: number;
  /** Slow swell for held notes (pads): attack and release in seconds. */
  attack: number;
  release: number;
  notes: Note[];
  /**
   * Which mood this lane belongs to. 'base' always plays; 'combat' (drums and driving parts) fades in while he is fighting,
   * down to `floor` when calm; 'calm' (bells, soft leads) thins out while he fights.
   */
  layer?: 'base' | 'combat' | 'calm';
  floor?: number;
}

/** What is going on, 0..1 each: how hard the fight is, and how far under or beside water he is. */
export interface Mood {
  combat: number;
  water: number;
}
export const CALM: Mood = { combat: 0, water: 0 };

/** How loud a lane should be (0..1 of its own gain) in a mood. */
export function layerGain(lane: Lane, mood: Mood): number {
  const c = Math.max(0, Math.min(1, mood.combat));
  if (lane.layer === 'combat') {
    const f = lane.floor ?? 0;
    return f + (1 - f) * c;
  }
  if (lane.layer === 'calm') return 1 - 0.7 * c;
  return 1;
}

/** The low-pass cutoff (Hz) for the whole track: wide open on dry land, muffled underwater, between near it. */
export function waterCutoff(mood: Mood): number {
  const w = Math.max(0, Math.min(1, mood.water));
  return 18000 * Math.pow(650 / 18000, w);
}

export interface Track {
  bpm: number;
  steps: number;
  lanes: Lane[];
}

/** Seconds per 16th note. */
export const stepSeconds = (t: Track): number => 60 / t.bpm / 4;

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

const MINOR = [0, 2, 3, 5, 7, 8, 10];

/** A slow, damp, drifting track: long pads, a deep pulse, and a few bell notes falling like drips. */
function drift(): Track {
  const r = rng(7);
  const roots = [50, 46, 43, 45]; // D, Bb, G, A
  const chords = [[0, 3, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]];
  const pad: Note[] = [];
  const bass: Note[] = [];
  const bell: Note[] = [];
  const lead: Note[] = [];
  const driftKick: Note[] = [];
  const driftSnare: Note[] = [];
  const driftHat: Note[] = [];
  for (let b = 0; b < 8; b++) {
    const at = b * 16;
    driftKick.push({ step: at, midi: 0, len: 2, vel: 0.9 }, { step: at + 10, midi: 0, len: 2, vel: 0.6 });
    driftSnare.push({ step: at + 8, midi: 0, len: 2, vel: 0.8 });
    for (let k = 0; k < 8; k++) driftHat.push({ step: at + k * 2, midi: 0, len: 1, vel: k % 2 ? 0.2 : 0.35 });
  }
  roots.forEach((root, i) => {
    const at = i * 32;
    for (const c of chords[i]) pad.push({ step: at, midi: root + 12 + c, len: 31, vel: 0.5 });
    bass.push({ step: at, midi: root - 12, len: 14, vel: 0.9 }, { step: at + 16, midi: root - 12, len: 12, vel: 0.7 });
    // The bell wanders through the scale, a few notes per chord, leaving gaps.
    for (let k = 0; k < 4; k++) {
      if (r() < 0.25) continue;
      bell.push({ step: at + 4 + k * 7 + Math.floor(r() * 3), midi: root + 24 + MINOR[Math.floor(r() * 7)], len: 6, vel: 0.35 + r() * 0.25 });
    }
    // A soft, slow lead line only in the second half of the loop.
    if (i >= 2) for (let k = 0; k < 3; k++) lead.push({ step: at + 2 + k * 10, midi: root + 12 + MINOR[[0, 2, 4, 3][(k + i) % 4]], len: 8, vel: 0.28 });
  });
  return {
    bpm: 72,
    steps: 128,
    lanes: [
      { inst: 'pad', gain: 0.11, verb: 0.6, attack: 0.9, release: 1.4, notes: pad },
      { inst: 'bass', gain: 0.34, verb: 0.15, attack: 0.02, release: 0.25, notes: bass },
      { inst: 'bell', gain: 0.16, verb: 0.85, attack: 0.005, release: 0.9, notes: bell, layer: 'calm' },
      { inst: 'lead', gain: 0.08, verb: 0.7, attack: 0.04, release: 0.5, notes: lead, layer: 'calm' },
      // Only heard in a fight: a heartbeat of drums under the drift.
      { inst: 'kick', gain: 0.42, verb: 0.05, attack: 0, release: 0.05, notes: driftKick, layer: 'combat' },
      { inst: 'snare', gain: 0.22, verb: 0.3, attack: 0, release: 0.05, notes: driftSnare, layer: 'combat' },
      { inst: 'hat', gain: 0.16, verb: 0.15, attack: 0, release: 0.05, notes: driftHat, layer: 'combat' },
    ],
  };
}

/** A steadier track for the busy halls: a pulse, a beat, and a short riff. */
function pump(): Track {
  const r = rng(11);
  const roots = [40, 36, 38, 35]; // E, C, D, B
  const bass: Note[] = [];
  const kick: Note[] = [];
  const hat: Note[] = [];
  const lead: Note[] = [];
  const pad: Note[] = [];
  roots.forEach((root, i) => {
    const at = i * 32;
    for (let k = 0; k < 8; k++) bass.push({ step: at + k * 4, midi: root + (k % 4 === 2 ? 7 : k % 4 === 3 ? 12 : 0), len: 3, vel: k % 2 ? 0.55 : 0.85 });
    for (let k = 0; k < 4; k++) kick.push({ step: at + k * 8, midi: 0, len: 2, vel: k % 2 ? 0.6 : 0.9 });
    for (let k = 0; k < 16; k++) if (k % 2 === 1 || r() < 0.25) hat.push({ step: at + k * 2, midi: 0, len: 1, vel: 0.25 + (k % 4 === 3 ? 0.2 : 0) });
    pad.push({ step: at, midi: root + 24, len: 30, vel: 0.4 }, { step: at, midi: root + 31, len: 30, vel: 0.35 });
    const motif = [0, 3, 7, 5];
    for (let k = 0; k < 4; k++) if (i % 2 === 0 || k % 2 === 0) lead.push({ step: at + 16 + k * 4, midi: root + 24 + motif[(k + i) % 4], len: 3, vel: 0.3 });
  });
  return {
    bpm: 98,
    steps: 128,
    lanes: [
      { inst: 'bass', gain: 0.3, verb: 0.1, attack: 0.01, release: 0.1, notes: bass },
      { inst: 'kick', gain: 0.5, verb: 0.05, attack: 0, release: 0.05, notes: kick, layer: 'combat', floor: 0.35 },
      { inst: 'hat', gain: 0.22, verb: 0.2, attack: 0, release: 0.05, notes: hat, layer: 'combat', floor: 0.2 },
      { inst: 'pad', gain: 0.09, verb: 0.6, attack: 0.5, release: 0.8, notes: pad },
      { inst: 'lead', gain: 0.1, verb: 0.5, attack: 0.01, release: 0.2, notes: lead, layer: 'combat', floor: 0.5 },
    ],
  };
}

/** A dusty boom-bap beat from a busted speaker: swung hats, a lazy bass line, and a minor-seventh keys loop. */
function groove(): Track {
  const r = rng(23);
  const roots = [45, 41, 43, 40]; // A, F, G, E
  const kick: Note[] = [];
  const snare: Note[] = [];
  const hat: Note[] = [];
  const bass: Note[] = [];
  const keys: Note[] = [];
  const lead: Note[] = [];
  roots.forEach((root, i) => {
    for (let b = 0; b < 2; b++) {
      const at = i * 32 + b * 16;
      kick.push({ step: at, midi: 0, len: 2, vel: 0.95 }, { step: at + 10, midi: 0, len: 2, vel: 0.7 });
      if (b === 1 || i % 2) kick.push({ step: at + 7, midi: 0, len: 2, vel: 0.5 });
      snare.push({ step: at + 4, midi: 0, len: 2, vel: 0.85 }, { step: at + 12, midi: 0, len: 2, vel: 0.9 });
      if (i % 2 && b === 1) snare.push({ step: at + 15, midi: 0, len: 1, vel: 0.35 });
      for (let k = 0; k < 8; k++) hat.push({ step: at + k * 2, midi: 0, len: 1, vel: k % 2 ? 0.2 : 0.38 });
      if (r() < 0.5) hat.push({ step: at + 7 + (r() < 0.5 ? 1 : 0), midi: 0, len: 1, vel: 0.15 });
      bass.push({ step: at, midi: root - 12, len: 5, vel: 0.9 }, { step: at + 6, midi: root - 12 + (b ? 7 : 0), len: 3, vel: 0.65 }, { step: at + 10, midi: root - 12 + (b ? 3 : 12), len: 4, vel: 0.7 });
    }
    for (const c of [0, 3, 7, 10]) keys.push({ step: i * 32, midi: root + 24 + c, len: 22, vel: 0.28 });
    // a lazy lead hook that drifts around the chord, laid back behind the beat
    const hook = [7, 10, 7, 5];
    for (let k = 0; k < 4; k++) if (i % 2 === 0 || k !== 3) lead.push({ step: i * 32 + 2 + k * 7 + (k % 2), midi: root + 24 + hook[k], len: 5, vel: 0.26 });
  });
  return {
    bpm: 86,
    steps: 128,
    lanes: [
      { inst: 'kick', gain: 0.55, verb: 0.05, attack: 0, release: 0.05, notes: kick },
      { inst: 'snare', gain: 0.32, verb: 0.35, attack: 0, release: 0.05, notes: snare },
      { inst: 'hat', gain: 0.2, verb: 0.1, attack: 0, release: 0.05, notes: hat },
      { inst: 'bass', gain: 0.32, verb: 0.1, attack: 0.01, release: 0.2, notes: bass },
      { inst: 'pad', gain: 0.07, verb: 0.5, attack: 0.15, release: 0.6, notes: keys },
      { inst: 'bell', gain: 0.1, verb: 0.6, attack: 0.005, release: 0.5, notes: lead },
    ],
  };
}

/**
 * A deep cave: a low drone that leans on the flat second (Phrygian, uneasy), a slow heartbeat in the bass, and a few bell
 * notes that come back fainter and fainter, like an echo off far walls. Drums only while he fights.
 */
function echo(): Track {
  const r = rng(31);
  const roots = [40, 41, 40, 36]; // E, F, E, C
  const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
  const pad: Note[] = [];
  const bass: Note[] = [];
  const bell: Note[] = [];
  const kick: Note[] = [];
  const hat: Note[] = [];
  roots.forEach((root, i) => {
    const at = i * 32;
    pad.push({ step: at, midi: root + 12, len: 31, vel: 0.5 }, { step: at, midi: root + 19, len: 31, vel: 0.4 });
    if (i % 2) pad.push({ step: at + 8, midi: root + 13, len: 20, vel: 0.25 });
    // A heartbeat: two low notes close together, then a long wait.
    for (const b of [0, 16]) bass.push({ step: at + b, midi: root - 12, len: 3, vel: 0.85 }, { step: at + b + 3, midi: root - 12, len: 3, vel: 0.5 });
    // Two bell notes per chord, each echoed twice, quieter each time.
    for (let k = 0; k < 2; k++) {
      if (r() < 0.2) continue;
      const step = at + 2 + k * 14 + Math.floor(r() * 3);
      const midi = root + 24 + PHRYGIAN[Math.floor(r() * 7)];
      const vel = 0.42 + r() * 0.15;
      for (let e = 0; e < 3; e++) bell.push({ step: (step + e * 3) % 128, midi, len: 4, vel: vel * Math.pow(0.45, e) });
    }
    for (let k = 0; k < 4; k++) kick.push({ step: at + k * 8, midi: 0, len: 2, vel: k % 2 ? 0.55 : 0.85 });
    for (let k = 0; k < 8; k++) hat.push({ step: at + k * 4 + 2, midi: 0, len: 1, vel: 0.22 });
  });
  return {
    bpm: 64,
    steps: 128,
    lanes: [
      { inst: 'pad', gain: 0.1, verb: 0.75, attack: 1.2, release: 1.8, notes: pad },
      { inst: 'bass', gain: 0.32, verb: 0.2, attack: 0.02, release: 0.3, notes: bass },
      { inst: 'bell', gain: 0.17, verb: 0.9, attack: 0.005, release: 1.1, notes: bell, layer: 'calm' },
      { inst: 'kick', gain: 0.45, verb: 0.15, attack: 0, release: 0.05, notes: kick, layer: 'combat' },
      { inst: 'hat', gain: 0.14, verb: 0.3, attack: 0, release: 0.05, notes: hat, layer: 'combat' },
    ],
  };
}

/**
 * Grimsqueak's Keep: a slow minor march. Timpani on the strong beats, a snare that rolls (louder when he fights), a bell
 * tolling at the top of each bar, and the villain's tune over it, with the raised seventh that makes it sound royal and wrong.
 */
function march(): Track {
  const roots = [38, 34, 31, 33]; // D, B-flat, G, A
  const chords = [[0, 3, 7], [0, 4, 7], [0, 3, 7], [0, 4, 7]];
  const tune = [
    [0, 3, 2, 0, -2],
    [-2, 0, 2, 3, 5],
    [5, 3, 2, -1, 0],
    [0, -5, -1, 0, 7],
  ];
  const tuneSteps = [0, 6, 8, 12, 14];
  const kick: Note[] = [];
  const snare: Note[] = [];
  const bass: Note[] = [];
  const pad: Note[] = [];
  const lead: Note[] = [];
  const bell: Note[] = [];
  roots.forEach((root, i) => {
    const at = i * 32;
    for (let b = 0; b < 2; b++) {
      const bar = at + b * 16;
      kick.push({ step: bar, midi: 0, len: 3, vel: 0.9 }, { step: bar + 8, midi: 0, len: 3, vel: 0.6 });
      for (const [k, v] of [[0, 0.55], [4, 0.75], [6, 0.35], [7, 0.35], [8, 0.6], [12, 0.8], [14, 0.4]] as const) snare.push({ step: bar + k, midi: 0, len: 1, vel: v });
      bass.push({ step: bar, midi: root, len: 6, vel: 0.9 }, { step: bar + 8, midi: root + 7, len: 6, vel: 0.7 });
      bell.push({ step: bar, midi: root + 24, len: 8, vel: b ? 0.18 : 0.32 });
    }
    for (const c of chords[i]) pad.push({ step: at, midi: root + 24 + c, len: 30, vel: 0.32 });
    tune[i].forEach((n, k) => lead.push({ step: at + 16 + tuneSteps[k], midi: 74 + n, len: k === 4 ? 2 : 3, vel: 0.24 }));
  });
  return {
    bpm: 84,
    steps: 128,
    lanes: [
      { inst: 'kick', gain: 0.5, verb: 0.35, attack: 0, release: 0.12, notes: kick, layer: 'combat', floor: 0.55 },
      { inst: 'snare', gain: 0.26, verb: 0.4, attack: 0, release: 0.05, notes: snare, layer: 'combat', floor: 0.35 },
      { inst: 'bass', gain: 0.3, verb: 0.15, attack: 0.02, release: 0.25, notes: bass },
      { inst: 'pad', gain: 0.08, verb: 0.6, attack: 0.4, release: 0.9, notes: pad },
      { inst: 'lead', gain: 0.11, verb: 0.55, attack: 0.02, release: 0.25, notes: lead },
      { inst: 'bell', gain: 0.12, verb: 0.85, attack: 0.005, release: 1.2, notes: bell },
    ],
  };
}

const TRACKS: Record<TrackName, Track> = { drift: drift(), pump: pump(), groove: groove(), echo: echo(), march: march() };
export const trackNamed = (n: TrackName): Track => TRACKS[n];
export const TRACK_NAMES = Object.keys(TRACKS) as TrackName[];

export interface Scheduled {
  lane: number;
  note: Note;
  /** Which pass through the loop this is, counting from 0, and the absolute step. */
  loop: number;
  absStep: number;
}

/**
 * The notes that start at steps in [from, to) counted from the start of playback, wrapping around the loop.
 * The sequencer asks for a little more music every tenth of a second.
 */
export function notesBetween(track: Track, from: number, to: number): Scheduled[] {
  const out: Scheduled[] = [];
  for (let s = Math.ceil(from); s < to; s++) {
    const inLoop = ((s % track.steps) + track.steps) % track.steps;
    const loop = Math.floor(s / track.steps);
    track.lanes.forEach((lane, li) => {
      for (const n of lane.notes) if (n.step === inLoop) out.push({ lane: li, note: n, loop, absStep: s });
    });
  }
  return out;
}
