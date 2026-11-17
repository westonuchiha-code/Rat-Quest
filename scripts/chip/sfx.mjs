// node scripts/chip/sfx.mjs <out-dir>   Sound effects for the game, made from the owner's two tools: single notes of
// the Studio's voices (cut short, run up and down in steps the way a chip does a slide) and single hits of the Drum
// Pad's kits (cut, tuned, laid over one another). Each is named for the sound of the game's it could stand in for
// (SFX_NAMES in src/audio/synth.ts). Writes <name>.wav (mono) and sfx-reel.mp3: all of them in a row, a gap between.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openTools, writeWav, peak } from './lib.mjs';
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

const SFX = {
  // ---- menus ----
  menuMove: async () => cut(await note('nes', 'p25', 'E6'), 34, 14),
  menuOk: async () => run('nes', 'p25', ['C6', 'G6'], 55, 130, 90),
  menuBack: async () => run('nes', 'p25', ['G5', 'C5'], 55, 130, 90),
  boot: async () => over([await run('nes', 'p25', ['G5', 'B5', 'D6', 'G6'], 95, 520, 380)], [await run('nes', 'p50', ['D5', 'G5', 'B5', 'D6'], 95, 520, 380), 0, 0.45]),
  // ---- things picked up ----
  crumb: async () => run('nes', 'p50', ['B5', 'E6'], 48, 210, 170),
  cap: async () => over([cut(await note('gbc', 'bell', 'E7'), 300, 220)], [tune(cut(await hit('nes', PAD.bell), 120, 90), 2), 0, 0.35]),
  relic: async () => run('nes', 'p25', ['C6', 'E6', 'G6', 'C7', 'E7', 'G7'], 44, 330, 260),
  item: async () => run('gbc', 'echo', ['E6', 'G6', 'B6'], 62, 300, 220),
  heal: async () => run('nes', 'trisoft', ['C5', 'E5', 'G5', 'C6', 'E6'], 68, 320, 240),
  sparkle: async () => run('gbc', 'bell', ['G6', 'C7', 'E7', 'G7'], 40, 260, 200),
  clear: async () => over([await run('nes', 'p25', ['G5', 'G5', 'G5', 'D6'], 90, 520, 380)], [await run('nes', 'p50', ['B4', 'B4', 'B4', 'G5'], 90, 520, 380), 0, 0.45], [await run('nes', 'tri', ['G3', 'G3', 'G3', 'G3'], 90, 520, 380), 0, 0.8]),
  // ---- him ----
  jump: async () => slide('nes', 'p50', 'A4', 'A5', 9, 11, 40, 30),
  doubleJump: async () => slide('nes', 'p12', 'E5', 'E6', 8, 9, 46, 36),
  land: async () => cut(tune(await hit('nes', PAD.boom), 1.3), 130, 90),
  swing: async () => cut(await hit('nes', PAD.sweep), 170, 120),
  dodge: async () => cut(tune(await hit('gbc', PAD.sweep), 1.5), 140, 100),
  hurt: async () => over([await slide('nes', 'p50', 'E5', 'E4', 8, 22, 60, 50)], [cut(await hit('nes', PAD.snare), 120, 90), 0, 0.5]),
  block: async () => over([cut(await hit('gen', PAD.rim), 90, 60)], [tune(cut(await hit('gen', PAD.bell), 220, 170), 1.4), 0, 0.7]),
  // ---- blows ----
  hit: async () => over([cut(await hit('gen', PAD.snare), 130, 100)], [cut(await hit('nes', PAD.zap), 110, 80), 0, 0.6]),
  kill: async () => over([cut(await hit('c64', PAD.zap), 160, 120)], [await slide('nes', 'p25', 'A5', 'A3', 13, 13, 50, 40), 20, 0.7]),
  shock: async () => cut(await hit('c64', PAD.zap), 260, 200),
  spit: async () => cut(await hit('vcs', PAD.blip), 160, 110),
  crate: async () => over([cut(tune(await hit('ps1', PAD.tlo), 1.2), 160, 120)], [cut(await hit('ps1', PAD.snare), 150, 120), 10, 0.7], [cut(await hit('nes', PAD.chh), 90, 70), 40, 0.5]),
  // ---- the place ----
  doorOpen: async () => over([await slide('nes', 'tri', 'C3', 'C4', 12, 30, 160, 120)], [cut(await hit('ps1', PAD.ohh), 380, 300), 60, 0.4]),
  gate: async () => over([cut(await hit('x68', PAD.boom), 520, 380)], [cut(await hit('ps1', PAD.tlo), 200, 150), 120, 0.7], [cut(await hit('ps1', PAD.tlo), 200, 150), 260, 0.55]),
  splash: async () => fadeOut(cut(tune(await hit('gbc', PAD.crash), 0.7), 420, 300), 0.2),
  whoosh: async () => cut(tune(await hit('x68', PAD.sweep), 0.75), 320, 240),
};

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
