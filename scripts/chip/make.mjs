// node scripts/chip/make.mjs <out-dir> [song ids...]   Renders the tunes (songs.mjs) through the owner's two tools and
// mixes each: the Studio's render of the notes, the Drum Pad's render of the beat, laid together as one loop that
// meets itself (what rings on past the end is folded back onto the start). Writes <id>.wav (the loop, once) and
// <id>-listen.mp3 (the loop twice and a fade, for hearing where it joins).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { openTools, writeWav, rms, peak, ROOT } from './lib.mjs';
import { SONGS, JINGLES, toStudio, midi, chord } from './songs.mjs';

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
/**
 * A voice recording cut into its sounds: where it is louder than a whisper for a thirtieth of a second or more. Each
 * sound with how bright it is (by how often it crosses nought), how long, and the NOTE it is said on (found by laying
 * the middle of it against itself: `f0`, and `sure`, how well it matched: a hiss has no note).
 */
function voiceSounds(file, sr) {
  const tmp = path.join(out, '_voice.raw');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(ROOT, 'recordings', file), '-ac', '1', '-ar', String(sr), '-f', 'f32le', tmp]);
  const b = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  const a = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
  const hop = Math.round(sr * 0.005);
  const loud = [];
  for (let i = 0; i + hop * 2 < a.length; i += hop) loud.push(rms(a.subarray(i, i + hop * 2)) > 0.03);
  const sounds = [];
  for (let i = 0; i < loud.length; i++) {
    if (!loud[i]) continue;
    let j = i;
    while (j < loud.length && (loud[j] || loud.slice(j, j + 6).some(Boolean))) j++;
    if ((j - i) * 0.005 >= 0.03) {
      const from = Math.max(0, i * hop - Math.round(sr * 0.008));
      const to = Math.min(a.length, j * hop + Math.round(sr * 0.03));
      const d = Float32Array.from(a.subarray(from, to));
      const pk = peak(d);
      let cross = 0;
      for (let k = 1; k < d.length; k++) if (d[k] >= 0 !== d[k - 1] >= 0) cross++;
      // Its note: the lag at which its middle best matches itself, between a hundred and a thousand to the second.
      const m = d.subarray(Math.floor(d.length * 0.3), Math.min(d.length, Math.floor(d.length * 0.3) + 4096));
      let best = 0;
      let lag = 0;
      let zero = 1e-9;
      for (let k = 0; k < m.length; k++) zero += m[k] * m[k];
      for (let L = Math.floor(sr / 1000); L < Math.min(Math.floor(sr / 100), m.length - 64); L++) {
        let c = 0;
        for (let k = 0; k + L < m.length; k++) c += m[k] * m[k + L];
        c /= zero * ((m.length - L) / m.length);
        if (c > best) {
          best = c;
          lag = L;
        }
      }
      const fin = Math.round(sr * 0.003);
      const fout = Math.round(sr * 0.025);
      for (let k = 0; k < d.length; k++) d[k] *= (0.9 / pk) * Math.min(1, k / fin, (d.length - k) / fout);
      if (pk > 0.08) sounds.push({ d, bright: (cross / 2 / d.length) * sr, at: from / sr, dur: d.length / sr, f0: lag ? sr / lag : 0, sure: best, pk });
    }
    i = j;
  }
  return sounds;
}

/** Dizzy Dave's recording, its sounds sorted into his low THUMPS, his SNAPS and his bright TICKS. */
function daveSounds(sr) {
  const sounds = voiceSounds('pigeon.m4a', sr).filter((q) => q.pk > 0.2);
  const by = [...sounds].sort((p, q) => p.bright - q.bright);
  const third = Math.floor(by.length / 3);
  return { all: sounds, k: by.slice(0, third), s: by.slice(third, by.length - third), h: by.slice(by.length - third) };
}

/**
 * A spoken sound SUNG: played at the speed that puts it on the note `hz`, and HELD for `len` samples by going round
 * and round a few whole waves out of its middle (as a sampler holds a voice), with a little waver once it is going.
 */
function sing(snd, hz, len, sr) {
  const ratio = hz / snd.f0;
  const src = snd.d;
  const period = sr / snd.f0;
  const a = Math.floor(src.length * 0.35);
  const loopLen = Math.round(Math.max(2, Math.round((src.length * 0.35) / period)) * period);
  const xf = Math.min(a, Math.round(period * 1.5));
  const o = new Float32Array(len);
  let p = 0;
  for (let i = 0; i < len; i++) {
    let q = p;
    if (q >= a + loopLen) q = a + ((q - a) % loopLen);
    const k = Math.floor(q);
    let v = src[k] + ((src[k + 1] ?? 0) - src[k]) * (q - k);
    const toEnd = a + loopLen - q;
    if (p >= a + loopLen - xf && toEnd < xf) {
      // (Coming up to the end of the round: blended into the wave before the round began, which is in step with it.)
      const t = 1 - toEnd / xf;
      const k2 = Math.floor(q - loopLen);
      if (k2 >= 0) v = v * (1 - t) + (src[k2] + ((src[k2 + 1] ?? 0) - src[k2]) * (q - loopLen - k2)) * t;
    }
    o[i] = v * Math.min(1, i / (sr * 0.012), (len - i) / (sr * 0.07));
    const t = i / sr;
    p += ratio * (1 + (t > 0.18 ? 0.006 * Math.sin(t * Math.PI * 2 * 5.5) : 0));
  }
  return o;
}
/** A spoken sound played once at the speed that puts it on a note (a short one: said, not held). */
function say(snd, hz) {
  const ratio = hz / snd.f0;
  const o = new Float32Array(Math.floor(snd.d.length / ratio));
  for (let i = 0; i < o.length; i++) {
    const q = i * ratio;
    const k = Math.floor(q);
    o[i] = snd.d[k] + ((snd.d[k + 1] ?? 0) - snd.d[k]) * (q - k);
  }
  return o;
}
const voxCut = new Map();
let daveCut = null;

/**
 * A finished round, BROKEN (the dream gone wrong): at places chosen by `seed`, a sixteenth sticks and repeats over
 * what should have followed; a half bar is crushed to a few bits and a low rate; a beat runs backwards; and the last
 * half bar runs down like a tape and stops just short of the round's end.
 */
function breakIt(mix, sr, six, bars, seed) {
  let a = seed >>> 0;
  const rand = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  const step = Math.round(six * sr);
  const n = mix[0].length;
  const at = (bar, sixteenth) => Math.round((bar * 16 + sixteenth) * six * sr);
  for (const ch of mix) {
    a = seed >>> 0;
    // Stuck: a sixteenth (or a half of one) said four to eight times over.
    for (let k = 0; k < bars; k++) {
      if (rand() < 0.3) continue;
      const from = at(k, 4 * Math.floor(rand() * 4) + 2);
      const len = rand() < 0.5 ? step : step >> 1;
      const times = 4 + Math.floor(rand() * 5);
      for (let r = 1; r < times; r++) for (let i = 0; i < len && from + r * len + i < n; i++) ch[from + r * len + i] = ch[from + i] * (1 - 0.06 * r);
    }
    // Crushed: half a bar held at a low rate and a few bits.
    for (const bar of [2, 5]) {
      const from = at(bar, 8);
      const hold = 5 + Math.floor(rand() * 6);
      for (let i = 0; i < step * 8 && from + i < n; i++) ch[from + i] = Math.round(ch[from + i - (i % hold)] * 6) / 6;
    }
    // Backwards: one beat.
    for (const bar of [3, 6]) {
      const from = at(bar, 12);
      const len = step * 4;
      const copy = ch.slice(from, from + len);
      for (let i = 0; i < len; i++) ch[from + i] = copy[len - 1 - i];
    }
    // The tape runs down over the last half bar, and there is a sixteenth of nothing before the round comes again.
    const from = at(bars - 1, 8);
    const len = n - from;
    const copy = ch.slice(from);
    let p = 0;
    for (let i = 0; i < len; i++) {
      const u = i / len;
      const k = Math.floor(p);
      ch[from + i] = u > 0.875 ? 0 : (copy[k] ?? 0) * (1 - u * 0.5);
      p += Math.max(0.05, 1 - u * 1.1);
    }
  }
}

const mp3 = (wav, file) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '160k', file]);

for (const s of SONGS.filter((q) => !only.length || only.includes(q.id))) {
  const six = 60 / s.bpm / 4;
  const bars = s.chords.length;
  const st = await tools.studio.song(toStudio(s));
  const sr = st.sr;
  const n = Math.round(bars * 16 * six * sr);
  const bar = Math.round(16 * six * sr);
  const music = [fold(st.L, sr, n), fold(st.R, sr, n)];
  // The beat: the Drum Pad holds four bars at a time, so a length of beat is rendered four bars by four; each render is
  // made as loud as it will go by the tool, so every one after a length's first is brought to it by a bar they have in
  // common. A tune may have several lengths of beat, each on its own machine, each starting at its own bar (`at`).
  const drums = [new Float32Array(n), new Float32Array(n)];
  const D0 = Array.isArray(s.drums) ? s.drums[0] : s.drums;
  for (const D of Array.isArray(s.drums) ? s.drums : [s.drums]) {
    const groups = (D.order.match(/.{1,4}/g) ?? []);
    let first = null;
    for (let h = 0; h < groups.length; h++) {
      // (Bars marked '-' at the start of a group have no drums: the rest of the group is rendered and laid in after them.)
      const skip = [...groups[h]].findIndex((k) => k !== '-');
      if (skip < 0) continue;
      const r = await tools.drums.beat({ con: D.con, bpm: s.bpm, swing: D.swing ?? 0, pats: [...groups[h]].slice(skip).map((k) => D.pats[k]), reps: 1 });
      if (r.sr !== sr) throw new Error(`the two tools gave different rates: ${r.sr} and ${sr}`);
      let gain = 1;
      const o = Math.round(LEAD * sr);
      if (!first) first = { r, skip, group: groups[h] };
      else {
        const mine = [...groups[h]].slice(skip);
        const theirs = [...first.group].slice(first.skip);
        const i2 = mine.findIndex((k) => theirs.includes(k));
        const i1 = i2 >= 0 ? theirs.indexOf(mine[i2]) : -1;
        if (i1 >= 0) {
          const a = rms(first.r.L.subarray(o + i1 * bar, o + (i1 + 1) * bar));
          const b = rms(r.L.subarray(o + i2 * bar, o + (i2 + 1) * bar));
          if (b > 1e-4) gain = a / b;
        }
      }
      gain *= D.gain ?? 1;
      const base = ((D.at ?? 0) + h * 4 + skip) * bar;
      for (const [c, src] of [[0, r.L], [1, r.R]]) for (let j = 0; o + j < src.length; j++) drums[c][(base + j) % n] += src[o + j] * gain;
    }
  }
  const DG = s.drumGain ?? 0.62;
  // Dave: his sounds on the grid, swung as the drums are (an odd sixteenth comes late by a third of the swing).
  const voice = new Float32Array(n);
  if (s.dave) {
    daveCut ??= daveSounds(sr);
    const turn = { k: 0, s: 0, h: 0 };
    s.dave.bars.forEach((pat, b) => {
      [...pat].forEach((c, i) => {
        if (!daveCut[c]) return;
        const snd = daveCut[c][turn[c]++ % daveCut[c].length].d;
        // (Each sound was cut with eight thousandths of a second before it begins: it is laid that much early, so that it BEGINS on the beat.)
        const at = Math.round((b * 16 + i + (i % 2 ? ((D0.swing ?? 0) / 3) : 0)) * six * sr) - Math.round(sr * 0.008);
        for (let j = 0; j < snd.length; j++) voice[(((at + j) % n) + n) % n] += snd[j] * s.dave.vol * (c === 'h' ? 0.7 : 1);
      });
    });
  }
  // A SINGER: another of the recorded voices, sung. Its darkest long sound is held on each note of a LINE (the tune),
  // and its short sounds are said on the notes of a chord here and there (SCAT), one a sixteenth; an echo behind both.
  if (s.vox) {
    const V = s.vox;
    if (!voxCut.has(V.file)) voxCut.set(V.file, voiceSounds(V.file, sr).filter((q) => q.sure > 0.6 && q.f0 > 90 && q.f0 < 400));
    const cut = voxCut.get(V.file);
    const held = [...cut].filter((q) => q.dur >= 0.22).sort((p, q) => p.bright - q.bright)[V.sound ?? 0];
    const shorts = [...cut].filter((q) => q.dur < 0.22).sort((p, q) => p.at - q.at);
    const hzOf = (m) => 440 * 2 ** ((m - 69) / 12);
    const vx = new Float32Array(n);
    const sw = (D0.swing ?? 0) / 3;
    const lay = (snd, step, gain) => {
      const at = Math.round((step + (Math.round(step) % 2 ? sw : 0)) * six * sr);
      for (let j = 0; j < snd.length; j++) vx[(at + j) % n] += snd[j] * gain;
    };
    V.line.bars.forEach((barLine, b) => {
      let step = 0;
      for (const tok of barLine.split(/\s+/)) {
        const [name, l] = tok.split(':');
        if (name !== '-') lay(sing(held, hzOf(midi(name)), Math.round(Number(l) * six * sr * 0.95), sr), b * 16 + step, V.line.vol ?? 0.8);
        step += Number(l);
      }
      if (step !== 16) throw new Error(`${s.id}: bar ${b + 1} of the singer's line is ${step} long`);
    });
    let turn = 0;
    (V.scat?.bars ?? []).forEach((pat, b) => {
      const ch = chord(s.chords[b]);
      [...pat].forEach((c, i) => {
        if (c === '.') return;
        const k = Number(c);
        const m = 12 * ((V.scat.oct ?? 4) + 1) + ch.root + ch.tones[k % ch.tones.length] + 12 * Math.floor(k / ch.tones.length);
        lay(say(shorts[turn++ % shorts.length], hzOf(m)), b * 16 + i, V.scat.vol ?? 0.7);
      });
    });
    // The echo: three sixteenths behind, and six, each fainter.
    for (const [steps, g] of [[3, 0.28], [6, 0.12]]) {
      const dly = Math.round(steps * six * sr);
      for (let i = 0; i < n; i++) voice[(i + dly) % n] += vx[i] * g;
    }
    for (let i = 0; i < n; i++) voice[i] += vx[i];
    s.voxNote = `singer: "${V.file}", held sound said at ${held.f0.toFixed(0)} Hz (${held.dur.toFixed(2)}s), ${shorts.length} short sounds for the scat`;
  }
  const mix = [0, 1].map((c) => music[c].map((v, i) => v + drums[c][i] * DG + voice[i]));
  if (s.glitch) breakIt(mix, sr, six, bars, s.glitch);
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
  console.log(`${s.id.padEnd(8)} "${s.name}" ${s.bpm} bpm, ${bars} bars, ${(n / sr).toFixed(1)}s a round; music ${rms(music[0]).toFixed(3)} drums ${(rms(drums[0]) * DG).toFixed(3)}${s.dave ? ` dave ${rms(voice).toFixed(3)} (${[...s.dave.bars.join('')].filter((c) => c !== '.').length} of his sounds: ${daveCut.k.length} thumps, ${daveCut.s.length} snaps, ${daveCut.h.length} ticks to draw on)` : ''} (rms), peak before ${pk.toFixed(2)}${s.voxNote ? `; ${s.voxNote}` : ''}`);
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
