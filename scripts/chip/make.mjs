// node scripts/chip/make.mjs <out-dir> [song ids...]   Renders the tunes (songs.mjs) through the owner's two tools and
// mixes each: the Studio's render of the notes, the Drum Pad's render of the beat, laid together as one loop that
// meets itself (what rings on past the end is folded back onto the start). Writes <id>.wav (the loop, once) and
// <id>-listen.mp3 (the loop twice and a fade, for hearing where it joins).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openTools, writeWav, rms, peak } from './lib.mjs';
import { SONGS, JINGLES, toStudio } from './songs.mjs';

const [out, ...only] = process.argv.slice(2);
if (!out) throw new Error('give a folder to write to');
fs.mkdirSync(out, { recursive: true });
const LEAD = 0.05; // both tools start their render this long before the first note
const tools = await openTools();

/** A render laid into a loop of `n` samples: from the first note on, and what rings past the end folded onto the start. */
const fold = (src, sr, n) => {
  const o = Math.round(LEAD * sr);
  const dst = new Float32Array(n);
  for (let j = 0; o + j < src.length; j++) dst[j % n] += src[o + j];
  return dst;
};
const mp3 = (wav, file) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', file]);

for (const s of SONGS.filter((q) => !only.length || only.includes(q.id))) {
  const six = 60 / s.bpm / 4;
  const bars = s.chords.length;
  const st = await tools.studio.song(toStudio(s));
  const sr = st.sr;
  const n = Math.round(bars * 16 * six * sr);
  const bar = Math.round(16 * six * sr);
  const music = [fold(st.L, sr, n), fold(st.R, sr, n)];
  // The beat: the Drum Pad holds four bars at a time, so eight are two renders; each render is made as loud as it
  // will go by the tool, so the second is brought to the first by a bar they have in common.
  const D = s.drums;
  const halves = [D.order.slice(0, 4), D.order.slice(4, 8)].filter(Boolean);
  const drums = [new Float32Array(n), new Float32Array(n)];
  let first = null;
  for (let h = 0; h < halves.length; h++) {
    const r = await tools.drums.beat({ con: D.con, bpm: s.bpm, swing: D.swing ?? 0, pats: [...halves[h]].map((k) => D.pats[k]), reps: 1 });
    if (r.sr !== sr) throw new Error(`the two tools gave different rates: ${r.sr} and ${sr}`);
    let gain = 1;
    const o = Math.round(LEAD * sr);
    if (h === 0) first = r;
    else {
      const same = [...halves[h]].findIndex((k, i) => k === halves[0][i]);
      if (same >= 0) {
        const a = rms(first.L.subarray(o + same * bar, o + (same + 1) * bar));
        const b = rms(r.L.subarray(o + same * bar, o + (same + 1) * bar));
        if (b > 1e-4) gain = a / b;
      }
    }
    for (const [c, src] of [[0, r.L], [1, r.R]]) for (let j = 0; o + j < src.length; j++) drums[c][(h * 4 * bar + j) % n] += src[o + j] * gain;
  }
  const DG = s.drumGain ?? 0.62;
  const mix = [0, 1].map((c) => music[c].map((v, i) => v + drums[c][i] * DG));
  const pk = Math.max(peak(mix[0]), peak(mix[1]));
  const k = 0.89 / pk;
  for (const ch of mix) for (let i = 0; i < n; i++) ch[i] *= k;
  writeWav(path.join(out, `${s.id}.wav`), mix, sr);
  // To listen to: twice round, and the start of a third fading away.
  const tail = Math.round(2.5 * sr);
  const listen = [0, 1].map((c) => {
    const a = new Float32Array(n * 2 + tail);
    a.set(mix[c], 0);
    a.set(mix[c], n);
    for (let i = 0; i < tail; i++) a[n * 2 + i] = mix[c][i] * (1 - i / tail);
    return a;
  });
  writeWav(path.join(out, `${s.id}-listen.wav`), listen, sr);
  mp3(path.join(out, `${s.id}-listen.wav`), path.join(out, `music-${s.id}.mp3`));
  fs.unlinkSync(path.join(out, `${s.id}-listen.wav`));
  console.log(`${s.id.padEnd(8)} "${s.name}" ${s.bpm} bpm, ${bars} bars, ${(n / sr).toFixed(1)}s a round; music ${rms(music[0]).toFixed(3)} drums ${(rms(drums[0]) * DG).toFixed(3)} (rms), peak before ${pk.toFixed(2)}`);
}
for (const s of JINGLES.filter((q) => !only.length || only.includes(q.id))) {
  const st = await tools.studio.song(toStudio(s));
  const o = Math.round(LEAD * st.sr);
  const pk = Math.max(peak(st.L), peak(st.R));
  const ch = [st.L.subarray(o).map((v) => (v * 0.89) / pk), st.R.subarray(o).map((v) => (v * 0.89) / pk)];
  writeWav(path.join(out, `${s.id}.wav`), ch, st.sr);
  mp3(path.join(out, `${s.id}.wav`), path.join(out, `jingle-${s.id}.mp3`));
  console.log(`${s.id.padEnd(8)} "${s.name}" ${(ch[0].length / st.sr).toFixed(1)}s`);
}
await tools.close();
