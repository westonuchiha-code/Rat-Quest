// node scripts/chip/embed.mjs <folder of rendered loops> <id>...   Packs rendered tunes (make.mjs: <id>.wav, one
// round each) into src/audio/tunes.ts for the game to play. Each is stored as MP3 with a little of its own END put
// before it and a little of its START after it: the game plays exactly one round's length out of the middle, again
// and again, so wherever an MP3 decoder chooses to begin (they pad differently) the round still meets itself.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, writeWav } from './lib.mjs';
import { SONGS, JINGLES } from './songs.mjs';

// (An id written `jingle:<id>` is a short piece played ONCE: it is stored as it is, with nothing put before or after it.)
const [dir, ...all] = process.argv.slice(2);
const ids = all.filter((q) => !q.startsWith('jingle:'));
const jingleIds = all.filter((q) => q.startsWith('jingle:')).map((q) => q.slice(7));
const ROLL = 0.3;
const readWav = (file) => {
  const b = fs.readFileSync(file);
  const chans = b.readUInt16LE(22);
  const rate = b.readUInt32LE(24);
  const n = (b.length - 44) / 2 / chans;
  const out = Array.from({ length: chans }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) for (let c = 0; c < chans; c++) out[c][i] = b.readInt16LE(44 + (i * chans + c) * 2) / 32767;
  return { chans: out, rate };
};
const lines = [];
let total = 0;
for (const id of ids) {
  const s = SONGS.find((q) => q.id === id);
  if (!s) throw new Error(`no such tune: ${id}`);
  const w = readWav(path.join(dir, `${id}.wav`));
  const n = w.chans[0].length;
  const roll = Math.round(ROLL * w.rate);
  const padded = w.chans.map((c) => {
    const o = new Float32Array(n + roll * 2);
    o.set(c.subarray(n - roll), 0);
    o.set(c, roll);
    o.set(c.subarray(0, roll), roll + n);
    return o;
  });
  const tmp = path.join(dir, `_${id}.wav`);
  const mp3 = path.join(dir, `_${id}.mp3`);
  writeWav(tmp, padded, w.rate);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-ar', '32000', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '80k', '-joint_stereo', '1', mp3]);
  const b64 = fs.readFileSync(mp3).toString('base64');
  fs.unlinkSync(tmp);
  fs.unlinkSync(mp3);
  total += b64.length;
  lines.push(`  ${id}: { name: ${JSON.stringify(s.name)}, lead: ${ROLL}, length: ${(n / w.rate).toFixed(6)}, bpm: ${s.bpm}, b64: '${b64}' },`);
  console.log(`${id.padEnd(8)} ${(n / w.rate).toFixed(2)}s  ${(b64.length / 1024).toFixed(0)} KB`);
}
const jingles = [];
for (const id of jingleIds) {
  const s = JINGLES.find((q) => q.id === id);
  if (!s) throw new Error(`no such jingle: ${id}`);
  const w = readWav(path.join(dir, `${id}.wav`));
  const mp3 = path.join(dir, `_${id}.mp3`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, `${id}.wav`), '-ar', '32000', '-ac', '2', '-codec:a', 'libmp3lame', '-b:a', '64k', '-joint_stereo', '1', mp3]);
  const b64 = fs.readFileSync(mp3).toString('base64');
  fs.unlinkSync(mp3);
  total += b64.length;
  jingles.push(`  ${id}: { name: ${JSON.stringify(s.name)}, lead: 0, length: ${(w.chans[0].length / w.rate).toFixed(6)}, bpm: ${s.bpm}, b64: '${b64}' },`);
  console.log(`${('jingle ' + id).padEnd(14)} ${(w.chans[0].length / w.rate).toFixed(2)}s  ${(b64.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(ROOT, 'src', 'audio', 'tunes.ts'), `/** Made by scripts/chip/embed.mjs from tunes rendered through the owner's two sound tools (scripts/chip/songs.mjs). Do not edit by hand. */
export interface Tune {
  name: string;
  /** Seconds into the sound at which a round begins (what is before it is the round's own end: see embed.mjs), and how long a round is. */
  lead: number;
  length: number;
  bpm: number;
  /** MP3, in base64. */
  b64: string;
}
export const TUNES: Record<string, Tune> = {
${lines.join('\n')}
};
/** Short pieces played once, over the music (AudioEngine.jingle). */
export const JINGLES: Record<string, Tune> = {
${jingles.join('\n')}
};
`);
console.log(`src/audio/tunes.ts: ${(total / 1024 / 1024).toFixed(2)} MB of base64`);
