// node scripts/chip/robot.mjs [reel-dir]   THE DREAM'S CREATURES' VOICES, said by the owner's Robot Voice Box (five old speech
// chips), written to src/audio/robotVoices.ts for the game to play.
// The owner, 2026-11-17: "let's give the creatures for the glitch world robotic voices. And everything right like their
// attacks they can say a word, when they die they can say a word, you can even approximate like grunts and stuff like
// that with the speech synthesizer for them."
// (His rule, the same day: the robot voice SPEAKS only in the dream world. The game plays these only in a level whose
// `look` is 'dream': src/audio/dreamVoices.ts, tests/dreamvoices.ts.)
// FOUR VOICES, by the size of the creature: `small` (a roach: the Intellivoice, clocked up, tiny and quick), `thin` (a
// mantis: a Speak & Spell, high and lively), `big` (a Stag Knight: the TI-99's chip, low and flat), `plain` (anything
// else: the Votrax). Each has words for an ATTACK, grunts for being HURT, and words for its END.
// Each is stored as the game's other recorded sounds are (8-bit, base64), at 8000 a second: the chips themselves gave
// no more than that.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openTools, peak, ROOT, writeWav } from './lib.mjs';

export const VOICES = {
  small: { chip: 'sp0', opts: { clock: 1.45 } },
  thin: { chip: 'sns', opts: { pitch: 185, tone: 'lively', speed: 1.1 } },
  big: { chip: 'ti', opts: { pitch: 72, tone: 'flat', speed: 0.9 } },
  plain: { chip: 'vtx', opts: { clock: 1.1 } },
};
export const WORDS = {
  attack: ['tag', 'got you', 'my turn'],
  hurt: ['ow', 'oof', 'hey'],
  die: ['bye bye', 'night night'],
};
const RATE = 8000;
const tools = await openTools();
const out = {};
let bytes = 0;
for (const [name, v] of Object.entries(VOICES)) {
  out[name] = {};
  for (const [cry, words] of Object.entries(WORDS)) {
    out[name][cry] = [];
    for (const text of words) {
      const r = await tools.voice.say(text, v.chip, v.opts);
      const a = r.data;
      const pk = peak(a) || 1;
      // (What is silent before it and after it is taken off.)
      let from = 0;
      let to = a.length;
      while (from < to && Math.abs(a[from]) < pk * 0.03) from++;
      while (to > from && Math.abs(a[to - 1]) < pk * 0.03) to--;
      from = Math.max(0, from - 60);
      to = Math.min(a.length, to + 400);
      const step = r.rate / RATE;
      const n = Math.floor((to - from) / step);
      const i8 = Buffer.alloc(n);
      for (let i = 0; i < n; i++) {
        // (Each sample the mean of what it stands for: nothing above half the new rate is left to fold down.)
        let s = 0;
        const a0 = Math.floor(from + i * step);
        const a1 = Math.max(a0 + 1, Math.floor(from + (i + 1) * step));
        for (let j = a0; j < a1; j++) s += a[j];
        const fade = Math.min(1, i / 16, (n - i) / 60);
        i8.writeInt8(Math.max(-127, Math.min(127, Math.round(((s / (a1 - a0)) / pk) * 0.9 * fade * 127))), i);
      }
      bytes += n;
      out[name][cry].push({ text, secs: n / RATE, b64: i8.toString('base64') });
      console.log(`${name.padEnd(6)} ${cry.padEnd(7)} "${text}"  ${(n / RATE).toFixed(2)}s`);
    }
  }
}
await tools.close();
// (With a folder given: a reel to listen to, creature-voices.mp3: each voice in turn, its attack words, its grunts, its last words.)
if (process.argv[2]) {
  const parts = [];
  for (const cries of Object.values(out)) {
    for (const list of Object.values(cries)) {
      for (const c of list) {
        const b = Buffer.from(c.b64, 'base64');
        parts.push(Float32Array.from(b, (v) => ((v << 24) >> 24) / 127), new Float32Array(Math.round(RATE * 0.35)));
      }
      parts.push(new Float32Array(Math.round(RATE * 0.5)));
    }
    parts.push(new Float32Array(RATE));
  }
  const reel = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { reel.set(p, o); o += p.length; }
  const wav = path.join(process.argv[2], 'creature-voices.wav');
  fs.mkdirSync(process.argv[2], { recursive: true });
  writeWav(wav, [reel], RATE);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-ar', '32000', '-codec:a', 'libmp3lame', '-b:a', '96k', path.join(process.argv[2], 'creature-voices.mp3')]);
  fs.unlinkSync(wav);
  console.log(`creature-voices.mp3: ${(reel.length / RATE).toFixed(1)}s`);
}
const body = Object.entries(out).map(([name, cries]) => `  ${name}: {\n${Object.entries(cries).map(([cry, list]) => `    ${cry}: [\n${list.map((c) => `      { rate: ${RATE}, loop: false, b64: '${c.b64}' }, // "${c.text}", ${c.secs.toFixed(2)}s`).join('\n')}\n    ],`).join('\n')}\n  },`).join('\n');
fs.writeFileSync(path.join(ROOT, 'src', 'audio', 'robotVoices.ts'), `/** Made by scripts/chip/robot.mjs from the owner's Robot Voice Box (old speech chips). Do not edit by hand. */
import type { Recorded } from './recorded';
export type RobotCry = 'attack' | 'hurt' | 'die';
export type RobotVoice = ${Object.keys(VOICES).map((k) => `'${k}'`).join(' | ')};
/** What each says: ${JSON.stringify(WORDS)}. */
export const ROBOT_VOICES: Record<RobotVoice, Record<RobotCry, Recorded[]>> = {
${body}
};
`);
console.log(`src/audio/robotVoices.ts: ${(bytes / 1024).toFixed(0)} KB of sound, ${(bytes * 4 / 3 / 1024).toFixed(0)} KB in the game`);
