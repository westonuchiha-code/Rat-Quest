// node scripts/chip/voices.mjs <out-dir>   A REEL OF VOICES for the dream world (the Milky Way), said by the owner's third
// tool, the Robot Voice Box (recordings/tools/robot-voice-box.html: five old speech chips). The owner, 2026-11-17:
// "the main use for this is I want it to be used for all the voices in the glitched out wacky Pomo world".
// Three parts, a gap between each line: (1) the five chips saying the same thing, to tell them apart; (2) the dream's
// TOYS, bright and lively; (3) the same toys GONE WRONG: low, flat, slowed, crushed to a few bits, stuck and repeating,
// with a modem calling out. Writes voices-reel.mp3 and each line as <n>-<chip>.wav; prints where each line is.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openTools, writeWav, peak, crunch } from './lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('give a folder to write to');
fs.mkdirSync(out, { recursive: true });
const SR = 44100;
const tools = await openTools();
const names = await tools.voice.chips();
/** Stuck: the first `ms` of it said `times` over, then the whole of it. */
const stuck = (a, ms, times) => {
  const n = Math.round((ms / 1000) * SR);
  const o = new Float32Array(n * times + a.length);
  for (let k = 0; k < times; k++) for (let i = 0; i < n; i++) o[k * n + i] = a[i] * Math.min(1, (n - i) / 200);
  o.set(a, n * times);
  return o;
};
export const LINES = [
  // ---- 1: the five chips ----
  ...['sns', 'snm', 'ti', 'vtx', 'sp0'].map((chip) => ({ part: 1, chip, text: 'Hello. I am a toy. Do you want to play?', opts: {} })),
  // ---- 2: the toys of the dream ----
  { part: 2, chip: 'sns', text: 'Good morning! Time to play!', opts: { pitch: 180, tone: 'lively' } },
  { part: 2, chip: 'snm', text: 'One. Two. Three. Nap time.', opts: { pitch: 140, tone: 'lively' } },
  { part: 2, chip: 'sp0', text: 'You are my best friend.', opts: { clock: 1.3 } },
  { part: 2, chip: 'vtx', text: 'Welcome to the Milky Way.', opts: { clock: 1.25 } },
  { part: 2, chip: 'ti', text: 'Sweet dreams, little knight.', opts: { pitch: 125, tone: 'talk' } },
  // ---- 3: the toys gone wrong ----
  { part: 3, chip: 'ti', text: 'Error. Error. You are not supposed to be here.', opts: { pitch: 62, tone: 'flat', speed: 0.85 }, crush: [6, 4] },
  { part: 3, chip: 'vtx', text: 'I can see you.', opts: { clock: 0.65 }, crush: [6, 3] },
  { part: 3, chip: 'sns', text: 'Play with me.', opts: { pitch: 55, tone: 'flat', speed: 0.8 }, crush: [5, 5], stuck: [90, 5] },
  { part: 3, chip: 'sp0', text: 'Wake up.', opts: { clock: 0.6 }, crush: [6, 4], stuck: [70, 3] },
  { part: 3, chip: 'snm', text: 'Does not compute.', opts: { pitch: 70, tone: 'flat' }, crush: [5, 6] },
];
const gap = new Float32Array(Math.round(SR * 0.7));
const partGap = new Float32Array(Math.round(SR * 1.6));
const parts = [];
let at = 0;
let part = 0;
const rows = [];
for (const [i, L] of LINES.entries()) {
  let a = Float32Array.from((await tools.voice.say(L.text, L.chip, L.opts)).data);
  if (L.stuck) a = stuck(a, ...L.stuck);
  if (L.crush) crunch(a, ...L.crush);
  const pk = peak(a) || 1;
  a = a.map((v) => (v * 0.8) / pk);
  writeWav(path.join(out, `${String(i + 1).padStart(2, '0')}-${L.chip}.wav`), [a], SR);
  if (L.part !== part && part) { parts.push(partGap); at += partGap.length / SR; }
  part = L.part;
  rows.push(`${at.toFixed(1).padStart(5)}s  part ${L.part}  ${names[L.chip].padEnd(28)} "${L.text}"${L.crush ? '  (crushed' + (L.stuck ? ', stuck' : '') + ')' : ''}  ${(a.length / SR).toFixed(1)}s`);
  parts.push(a, gap);
  at += (a.length + gap.length) / SR;
}
const reel = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
let o = 0;
for (const p of parts) { reel.set(p, o); o += p.length; }
writeWav(path.join(out, 'voices-reel.wav'), [reel], SR);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(out, 'voices-reel.wav'), '-codec:a', 'libmp3lame', '-b:a', '128k', path.join(out, 'voices-reel.mp3')]);
fs.unlinkSync(path.join(out, 'voices-reel.wav'));
console.log(rows.join('\n'));
console.log(`reel ${at.toFixed(1)}s`);
await tools.close();
