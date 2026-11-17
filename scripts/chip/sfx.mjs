// node scripts/chip/sfx.mjs <out-dir>   Sound effects for the game, made from the owner's two tools: single notes of
// the Studio's voices (cut short, run up and down in steps the way a chip does a slide) and single hits of the Drum
// Pad's kits (cut, tuned, laid over one another). Each is named for the sound of the game's it could stand in for
// (SFX_NAMES in src/audio/synth.ts). Writes <name>.wav (mono) and sfx-reel.mp3: all of them in a row, a gap between.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openTools, writeWav, peak, tuned, scratchSound } from './lib.mjs';
import { midi } from './songs.mjs';

const out = process.argv[2];
if (!out) throw new Error('give a folder to write to');
fs.mkdirSync(out, { recursive: true });
const SR = 44100;
const tools = await openTools();
const ms = (t) => Math.round((t / 1000) * SR);
const notes = new Map();
const note = async (con, v, m) => {
  const k = `${con}:${v}:${m}`;
  if (!notes.has(k)) notes.set(k, await tools.studio.note(con, v, typeof m === 'string' ? midi(m) : m, null, SR));
  return notes.get(k);
};
const hits = new Map();
const hit = async (con, pad, vel = 4) => {
  const k = `${con}:${pad}:${vel}`;
  if (!hits.has(k)) hits.set(k, (await tools.drums.hit(con, pad, vel, SR)).data);
  return hits.get(k);
};
const PAD = { kick: 0, snare: 1, chh: 2, ohh: 3, tlo: 4, tmid: 5, thi: 6, clap: 7, rim: 8, bell: 9, crash: 10, ride: 11, zap: 12, blip: 13, sweep: 14, boom: 15 };

/** The first `len` ms of a sound (a held voice goes round its loop if it is shorter), faded in a hair and out over `fade` ms. */
const cut = (src, len, fade = 12, gain = 1) => {
  const data = src.data ?? src;
  const loop = src.loop ?? null;
  const n = ms(len);
  const o = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let j = i;
    if (j >= data.length) {
      if (!loop) break;
      j = loop[0] + ((j - loop[0]) % (loop[1] - loop[0]));
    }
    const e = Math.min(1, i / ms(1.5), (n - i) / Math.max(1, ms(fade)));
    o[i] = data[j] * e * gain;
  }
  return o;
};
/** Played faster or slower (2 is an octave up). */
const tune = (a, ratio) => {
  const o = new Float32Array(Math.floor(a.length / ratio));
  for (let i = 0; i < o.length; i++) {
    const p = i * ratio;
    const k = Math.floor(p);
    o[i] = a[k] + ((a[k + 1] ?? 0) - a[k]) * (p - k);
  }
  return o;
};
/** Sounds one after another. */
const row = (...parts) => {
  const o = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of parts) {
    o.set(p, at);
    at += p.length;
  }
  return o;
};
/** Sounds laid over one another: [sound, starting at ms, gain]. */
const over = (...layers) => {
  const o = new Float32Array(Math.max(...layers.map(([a, at = 0]) => ms(at) + a.length)));
  for (const [a, at = 0, g = 1] of layers) for (let i = 0; i < a.length; i++) o[ms(at) + i] += a[i] * g;
  return o;
};
/** A slide the way a chip does one: a run of short notes from one pitch to another, each `step` ms. */
const slide = async (con, v, from, to, steps, step, lastLen = step, fade = 8) => {
  const a = midi(from);
  const b = midi(to);
  const parts = [];
  for (let i = 0; i < steps; i++) parts.push(cut(await note(con, v, Math.round(a + ((b - a) * i) / (steps - 1))), i === steps - 1 ? lastLen : step, i === steps - 1 ? fade : 2));
  return row(...parts);
};
/** A run of notes, each `len` ms, the last held for `last`. */
const run = async (con, v, names, len, last, fade = 60) => row(...(await Promise.all(names.map(async (n, i) => cut(await note(con, v, n), i === names.length - 1 ? last : len, i === names.length - 1 ? fade : 4)))));
const fadeOut = (a, from = 0.3) => a.map((v, i) => v * Math.min(1, (a.length - i) / (a.length * (1 - from))));

/** A chord: several notes struck together, `len` ms, each at its own gain. */
const struck = async (con, v, names, len, fade, gain = 1) => over(...(await Promise.all(names.map(async (n) => [cut(await note(con, v, n), len, fade), 0, gain / Math.sqrt(names.length)]))));

// THE OWNER, 2026-11-17, of the first set (NES pulses and Game Boy bells): "we're aiming for like Nintendo 64
// PlayStation 1 era stuff ... otherwise it's going to feel like we're playing a Nintendo 64 game while listening to it
// through an NES." So these are made of the N64's, the PS1's and the SNES's voices (mallets, piano, flute, choir,
// brass, strings, the orchestra hit) and their drum kits: sampled sounds, as that era's were.
const SFX = {
  // ---- menus ----
  menuMove: async () => cut(await note('n64', 'marimba', 'E6'), 60, 40),
  menuOk: async () => run('n64', 'marimba', ['E5', 'B5'], 70, 200, 150),
  menuBack: async () => run('n64', 'marimba', ['B4', 'E4'], 70, 200, 150),
  boot: async () => over([await struck('ps1', 'strings', ['G3', 'D4', 'B4'], 1100, 600, 0.6)], [await run('ps1', 'piano', ['G4', 'B4', 'D5', 'G5'], 110, 700, 500), 60, 0.9]),
  // ---- things picked up ----
  crumb: async () => over([await run('n64', 'marimba', ['B5', 'E6'], 55, 240, 190)], [tune(cut(await hit('n64', PAD.rim), 60, 40), 1.5), 0, 0.3]),
  cap: async () => over([tune(cut(await hit('ps1', PAD.bell), 260, 200), 1.9)], [cut(await hit('n64', PAD.rim), 70, 50), 0, 0.6]),
  relic: async () => over([await struck('snes', 'choir', ['C5', 'E5', 'G5'], 900, 500, 0.55)], [await run('ps1', 'piano', ['C6', 'E6', 'G6', 'C7'], 80, 520, 400), 40, 0.9]),
  item: async () => run('n64', 'piano', ['E5', 'G5', 'B5', 'E6'], 70, 420, 320),
  heal: async () => over([await run('snes', 'flute', ['C5', 'E5', 'G5', 'C6'], 95, 420, 300)], [await struck('snes', 'strings', ['C4', 'G4'], 760, 400, 0.4)]),
  sparkle: async () => run('n64', 'marimba', ['G6', 'C7', 'E7', 'G7'], 45, 260, 200),
  clear: async () => over([await run('ps1', 'brass', ['G4', 'G4', 'G4', 'D5'], 120, 760, 500)], [await struck('ps1', 'strings', ['G3', 'B3', 'D4'], 1100, 500, 0.5)], [cut(await note('ps1', 'hit', 'G4'), 700, 500), 360, 0.7]),
  // ---- him ----
  jump: async () => slide('n64', 'ocarina', 'A4', 'E5', 6, 14, 60, 45),
  doubleJump: async () => slide('n64', 'ocarina', 'E5', 'B5', 6, 12, 60, 45),
  land: async () => cut(tune(await hit('ps1', PAD.kick), 0.9), 140, 100),
  swing: async () => cut(tune(await hit('ps1', PAD.sweep), 1.2), 180, 130),
  dodge: async () => cut(tune(await hit('n64', PAD.sweep), 1.5), 150, 110),
  hurt: async () => over([cut(tune(await hit('ps1', PAD.tlo), 1.3), 160, 120)], [cut(await hit('ps1', PAD.snare), 140, 110), 0, 0.6]),
  // (A blow caught must be at least as loud as one that lands, tests/audio.ts: the first of these was a tick and a thin ring,
  // and was not. A knock under it, and the ring longer and as loud as the tick.)
  block: async () => over([cut(await hit('n64', PAD.rim), 90, 60)], [tune(cut(await hit('ps1', PAD.bell), 380, 300), 1.3), 0, 1], [cut(tune(await hit('ps1', PAD.tlo), 1.6), 110, 80), 0, 0.6]),
  // ---- blows ----
  hit: async () => over([cut(await hit('ps1', PAD.snare), 140, 110)], [cut(tune(await hit('ps1', PAD.kick), 1.4), 90, 70), 0, 0.7]),
  kill: async () => over([cut(await hit('ps1', PAD.crash), 260, 200), 0, 0.5], [cut(tune(await hit('ps1', PAD.tlo), 0.8), 220, 170), 0, 1], [cut(await note('ps1', 'hit', 'C4'), 300, 220), 0, 0.5]),
  shock: async () => cut(await hit('ps1', PAD.zap), 280, 220),
  spit: async () => cut(tune(await hit('n64', PAD.blip), 0.8), 170, 120),
  crate: async () => over([cut(tune(await hit('ps1', PAD.tlo), 1.25), 170, 130)], [cut(await hit('n64', PAD.clap), 150, 120), 8, 0.7], [cut(await hit('n64', PAD.rim), 80, 60), 45, 0.5]),
  // ---- the place ----
  doorOpen: async () => over([await slide('ps1', 'strings', 'C2', 'G2', 6, 70, 260, 200), 0, 0.8], [cut(tune(await hit('ps1', PAD.tlo), 0.7), 260, 200), 0, 0.7], [cut(await hit('ps1', PAD.ohh), 380, 300), 120, 0.3]),
  gate: async () => over([cut(tune(await hit('ps1', PAD.boom), 0.8), 620, 460)], [cut(tune(await hit('ps1', PAD.tlo), 0.75), 240, 180), 140, 0.7], [cut(tune(await hit('ps1', PAD.tlo), 0.7), 240, 180), 300, 0.55]),
  splash: async () => fadeOut(cut(tune(await hit('snes', PAD.crash), 0.7), 460, 340), 0.2),
  whoosh: async () => cut(tune(await hit('ps1', PAD.sweep), 0.75), 340, 260),
};

// ---- A HAND ON A RECORD (the owner, 2026-11-17: "see if we can do some like record scratching sounds here and there not
// just in the music but even for certain sound effects I think would be really cool"). The record is a Speak & Spell
// saying "fresh" (his third tool, the Robot Voice Box); the scratch is lib.mjs's. Backing out of a menu is a baby
// scratch; being put back after a fall is the record pulled back, and let go. ----
let record = null;
const fresh = async () => (record ??= tuned((await tools.voice.say('fresh', 'sns', { pitch: 150 })).data, 1.2));
SFX.menuBack = async () => scratchSound(await fresh(), 'b', ms(180));
SFX.rewind = async () => row(scratchSound(await fresh(), 'r', ms(380)), new Float32Array(ms(30)), scratchSound(await fresh(), 'c', ms(110)));

const order = Object.keys(SFX);
const made = {};
for (const name of order) {
  const a = await SFX[name]();
  const pk = peak(a);
  made[name] = a.map((v) => (v * 0.8) / (pk || 1));
  writeWav(path.join(out, `${name}.wav`), [made[name]], SR);
}
// The reel: every one in the order above, twice each, with a gap.
const gap = new Float32Array(ms(550));
const short = new Float32Array(ms(280));
const reel = row(...order.flatMap((n) => [made[n], short, made[n], gap]));
writeWav(path.join(out, 'sfx-reel.wav'), [reel], SR);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'sfx-reel.wav'), '-codec:a', 'libmp3lame', '-b:a', '128k', path.join(out, 'sfx-reel.mp3')]);
fs.unlinkSync(path.join(out, 'sfx-reel.wav'));
let at = 0;
console.log(order.map((n, i) => {
  const line = `${String(i + 1).padStart(2)}. ${n.padEnd(11)} ${(made[n].length / SR * 1000).toFixed(0).padStart(4)} ms   at ${(at).toFixed(1)}s`;
  at += (made[n].length * 2 + short.length + gap.length) / SR;
  return line;
}).join('\n'));
console.log(`reel ${at.toFixed(1)}s`);
await tools.close();
