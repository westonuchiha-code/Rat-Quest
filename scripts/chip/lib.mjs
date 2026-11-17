// Drives the owner's two sound tools (recordings/tools/: Chip Drum Pad, Chiptune Pad Studio) in a headless browser, to
// make music and sound effects for the game. Both tools keep their state and their render functions as plain globals,
// so a page of each is opened and asked for sound directly; nothing is clicked.
//   studio.song(songObject)            -> { L, R, sr }   a whole song, through the tool's own offline render
//   studio.note(con, voice, midi, x)   -> { data, rate, loop }   one note of one voice (mono, no room on it)
//   drums.beat({con, bpm, swing, pats, reps, real}) -> { L, R, sr, len }   a drum loop, the tool's own offline render
//   drums.hit(con, pad, vel)           -> { data, rate }   one hit of one pad
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOOL = (name) => 'file://' + path.join(ROOT, 'recordings', 'tools', name);

/** Float32 samples out of a page as base64 of 16-bit numbers (a plain array of floats is far too slow to bring out). */
const PACK = `(a) => { const b = new Int16Array(a.length); for (let i = 0; i < a.length; i++) b[i] = Math.max(-32767, Math.min(32767, Math.round(a[i] * 32767))); const u = new Uint8Array(b.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }`;
const unpack = (b64) => {
  const buf = Buffer.from(b64, 'base64');
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 32767;
  return out;
};

export async function openTools() {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const open = async (file) => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    // (Nothing off this machine: the fonts are only looks, and the MP3 coder the Studio fetches is not used here.)
    page.on('request', (r) => (r.url().startsWith('file:') || r.url().startsWith('blob:') || r.url().startsWith('data:') ? r.continue() : r.abort()));
    page.on('pageerror', (e) => console.log('PAGE ERROR', file, e.message));
    await page.goto(TOOL(file), { waitUntil: 'domcontentloaded' });
    await new Promise((r) => setTimeout(r, 1500));
    return page;
  };
  const sp = await open('chiptune-pad-studio.html');
  const dp = await open('chip-drum-pad.html');
  const studio = {
    async song(sg) {
      const r = await sp.evaluate(`(async (sg) => { const pack = ${PACK}; if (typeof setOutRate === 'function') setOutRate(44100); switchTo(sg, true); song.beat.on = false; const { L, R, sr } = await renderSong(() => {}); return { L: pack(L), R: pack(R), sr }; })(${JSON.stringify(sg)})`);
      return { L: unpack(r.L), R: unpack(r.R), sr: r.sr };
    },
    async note(con, voice, midi, x = null, rate = 44100) {
      const r = await sp.evaluate(`(() => { const pack = ${PACK}; const n = renderNote(${JSON.stringify(con)}, ${JSON.stringify(voice)}, ${midi}, ${JSON.stringify(x)}, null, ${rate}); return { data: pack(n.data), rate: n.rate, loop: n.loop || null }; })()`);
      return { data: unpack(r.data), rate: r.rate, loop: r.loop };
    },
    voices: () => sp.evaluate(`Object.fromEntries(Object.entries(VOICES).map(([c, vs]) => [c, vs.map((v) => v.id + (v.sus ? '~' : '') + (v.chord ? '+' : ''))]))`),
    drums: () => sp.evaluate(`Object.fromEntries(Object.entries(DRUMS).map(([c, ds]) => [c, ds.map((d) => d.id)]))`),
  };
  const drums = {
    /** pats: up to four bars, each { kick: 'x...', snare: ..., chh, ohh, tlo, tmid, thi, clap, rim, bell, crash, ride, zap, blip, sweep, boom } ('x' full, 'o' soft). Played in order, `reps` times. */
    async beat({ con, bpm, swing = 0, pats, reps = 1, real = true }) {
      const r = await dp.evaluate(`(async (o) => { const pack = ${PACK}; if (typeof setOutRate === 'function') setOutRate(44100); setConsole(o.con); beat = blankBeat('loop'); o.pats.forEach((p, i) => { beat.pats[i] = parsePat(p); }); S.bpm = o.bpm; S.swing = o.swing; S.pat = 0; S.chain = o.pats.length > 1; S.reps = o.reps; S.real = o.real; const plan = songPlan(); const { L, R, sr } = await renderBeat(() => {}); return { L: pack(L), R: pack(R), sr, len: plan.len }; })(${JSON.stringify({ con, bpm, swing, pats, reps, real })})`);
      return { L: unpack(r.L), R: unpack(r.R), sr: r.sr, len: r.len };
    },
    async hit(con, pad, vel = 4, rate = 44100) {
      const r = await dp.evaluate(`(() => { const pack = ${PACK}; const n = renderDrum(${JSON.stringify(con)}, ${pad}, ${vel}, ${rate}); return { data: pack(n.data), rate: n.rate }; })()`);
      return { data: unpack(r.data), rate: r.rate };
    },
    pads: () => dp.evaluate(`ROLES.map((r) => r.id || r[0] || String(r))`),
  };
  return { studio, drums, close: () => browser.close() };
}

/** Writes 16-bit PCM. `chans`: one Float32Array (mono) or two (stereo). */
export function writeWav(file, chans, rate) {
  const n = chans[0].length;
  const c = chans.length;
  const buf = Buffer.alloc(44 + n * c * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * c * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(c, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * c * 2, 28);
  buf.writeUInt16LE(c * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * c * 2, 40);
  for (let i = 0; i < n; i++) for (let k = 0; k < c; k++) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(chans[k][i] * 32767))), 44 + (i * c + k) * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

export const rms = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / Math.max(1, a.length));
export const peak = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
export { ROOT };
