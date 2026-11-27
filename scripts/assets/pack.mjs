// PACKS THE DROP-IN FILES (assets/) INTO THE GAME: writes src/assets/dropped.ts.
//   node scripts/assets/pack.mjs          (npm run assets runs this, then writes ASSETS.md)
// See assets/README.md for what goes where. Needs ffmpeg and ffprobe.
// The game is one .html file, so nothing can be loaded when it runs: a dropped picture is stored as its dots, a
// dropped sound as its samples, a dropped song as an MP3, all as text in that one module.
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// (RQ_ASSETS and RQ_DROPPED: another folder to read and another file to write, for the test of this script.)
const assetsDir = process.env.RQ_ASSETS ?? path.join(root, 'assets');
const outFile = process.env.RQ_DROPPED ?? path.join(root, 'src/assets/dropped.ts');
const files = (dir) => (fs.existsSync(path.join(assetsDir, dir)) ? fs.readdirSync(path.join(assetsDir, dir)).filter((f) => !f.startsWith('.') && !f.endsWith('.md')).sort() : []);
const stem = (f) => f.replace(/\.[^.]+$/, '');
const sha = (p) => crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 16);
const ff = (args, opts = {}) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { maxBuffer: 1 << 30, ...opts });
const probe = (p, entries) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', entries.startsWith('stream=width') ? 'v:0' : 'a:0', '-show_entries', entries, '-of', 'csv=p=0', p]).toString().trim();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-pack-'));

// The names a file may have: read from the game's own lists (as text: this script does not run the game).
const src = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const textureNames = [...src('src/render/textures.ts').matchAll(/^  ([A-Za-z0-9]+): \{ size: \d+, seed:/gm)].map((m) => m[1]);
const sfxNames = [...src('src/audio/synth.ts').match(/export const SFX_NAMES = \[([\s\S]*?)\] as const/)[1].matchAll(/'([A-Za-z0-9]+)'/g)].map((m) => m[1]);
const kinds = [...src('src/audio/music.ts').match(/export type TrackName = ([^;]+);/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const jingles = [...src('scripts/chip/songs.mjs').matchAll(/^  \{ id: '([a-z]+)', name:/gm)].map((m) => m[1]);
const levelIds = new Set([...fs.readdirSync(path.join(root, 'src/levels')).flatMap((f) => [...src(`src/levels/${f}`).matchAll(/\bid: '([A-Za-z0-9_]+)'|, '([A-Za-z0-9_]+)'\)|_ID = '([A-Za-z0-9_]+)'/g)].map((m) => m[1] ?? m[2] ?? m[3]))]);

const bad = [];
const textures = [];
for (const f of files('textures')) {
  const name = stem(f);
  const p = path.join(assetsDir, 'textures', f);
  if (!textureNames.includes(name)) { bad.push(`assets/textures/${f}: there is no texture called "${name}" (the names are in ASSETS.md, part 7)`); continue; }
  const [w, h] = probe(p, 'stream=width,height').split(',').map(Number);
  // Square and small enough: as it is, dot for dot. Otherwise squeezed to 128 square.
  const size = w === h && w <= 256 ? w : 128;
  const raw = ff(['-i', p, '-frames:v', '1', '-vf', `scale=${size}:${size}:flags=${w === h && w <= 256 ? 'neighbor' : 'area'},vflip`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
  textures.push({ name, file: f, hash: sha(p), size, b64: raw.toString('base64') });
  console.log(`texture ${name.padEnd(16)} ${w}x${h} -> ${size}x${size}`);
}
const sounds = [];
for (const f of files('sounds')) {
  const name = stem(f);
  const p = path.join(assetsDir, 'sounds', f);
  if (!sfxNames.includes(name)) { bad.push(`assets/sounds/${f}: there is no sound effect called "${name}" (the names are in ASSETS.md, part 8)`); continue; }
  const raw = ff(['-i', p, '-ac', '1', '-ar', '22050', '-f', 's8', '-']);
  sounds.push({ name, file: f, hash: sha(p), seconds: raw.length / 22050, b64: raw.toString('base64') });
  console.log(`sound   ${name.padEnd(16)} ${(raw.length / 22050).toFixed(2)} s`);
}
const music = [];
const ROLL = 0.3;
for (const f of files('music')) {
  const name = stem(f);
  const p = path.join(assetsDir, 'music', f);
  const what = jingles.includes(name) ? 'jingle' : kinds.includes(name) ? 'kind' : levelIds.has(name) ? 'room' : null;
  if (!what) { bad.push(`assets/music/${f}: "${name}" is not a room's id, a kind of music (${kinds.join(', ')}) or a jingle (${jingles.join(', ')})`); continue; }
  // As raw sound, so that a little of its END can be put before it and of its START after it (as embed.mjs does for
  // the game's own tunes): the game plays one round out of the middle, and a round meets itself wherever an MP3
  // decoder chooses to begin. A jingle is played once: it is stored as it is.
  const rate = 32000;
  const pcm = ff(['-i', p, '-ac', '2', '-ar', String(rate), '-f', 's16le', '-']);
  const frame = 4;
  const n = pcm.length / frame;
  const roll = what === 'jingle' ? 0 : Math.min(Math.round(ROLL * rate), Math.floor(n / 2));
  const padded = Buffer.concat([pcm.subarray((n - roll) * frame), pcm, pcm.subarray(0, roll * frame)]);
  const rawFile = path.join(tmp, 'x.raw');
  const mp3 = path.join(tmp, 'x.mp3');
  fs.writeFileSync(rawFile, padded);
  ff(['-f', 's16le', '-ar', String(rate), '-ac', '2', '-i', rawFile, '-codec:a', 'libmp3lame', '-b:a', '96k', '-joint_stereo', '1', mp3]);
  music.push({ name, file: f, hash: sha(p), what, lead: roll / rate, length: n / rate, b64: fs.readFileSync(mp3).toString('base64') });
  console.log(`music   ${name.padEnd(16)} ${what}, ${(n / rate).toFixed(1)} s`);
}
// FONTS: a font file named for the part of the game it letters (src/ui/fonts.ts: game, title, label, logo, tools).
// Packed as it is (a font is small and a browser reads the file whole); it goes first in that line of FONTS.
const fontRoles = [...src('src/ui/fonts.ts').match(/const OWN_FONTS = \{([\s\S]*?)\} as const;/)[1].matchAll(/^  ([a-z]+): /gm)].map((m) => m[1]);
const FONT_TYPES = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' };
const fonts = [];
for (const f of files('fonts')) {
  const name = stem(f);
  const ext = f.slice(f.lastIndexOf('.') + 1).toLowerCase();
  const p = path.join(assetsDir, 'fonts', f);
  if (!fontRoles.includes(name)) { bad.push(`assets/fonts/${f}: there is no font called "${name}" (the names are ${fontRoles.join(', ')}: ASSETS.md, part 6)`); continue; }
  if (!FONT_TYPES[ext]) { bad.push(`assets/fonts/${f}: a font must be a .woff2, .woff, .ttf or .otf file`); continue; }
  const bytes = fs.readFileSync(p);
  fonts.push({ name, file: f, hash: sha(p), format: FONT_TYPES[ext], mime: ext === 'woff2' ? 'font/woff2' : ext === 'woff' ? 'font/woff' : ext === 'otf' ? 'font/otf' : 'font/ttf', b64: bytes.toString('base64') });
  console.log(`font    ${name.padEnd(16)} ${f}, ${(bytes.length / 1024).toFixed(0)} KB`);
}
// VOICES: a character KIND's own voice (src/audio/speech.ts VOICES: mouse, bird, turtle...), as its 27 syllables
// (SYLLABLES there). Either a FOLDER, voices/turtle/, of one file per syllable (ah.wav, ba.wav...), or ONE recording,
// voices/turtle.wav, saying them in that order with a breath between: it is cut where it falls quiet.
const speechSrc = src('src/audio/speech.ts');
const voiceKinds = [...speechSrc.match(/export const VOICES: Record<NpcKind, VoiceDef> = \{([\s\S]*?)\n\};/)[1].matchAll(/^  ([a-z]+): \{ bank:/gm)].map((m) => m[1]);
const syllables = [...speechSrc.match(/export const SYLLABLES = \[([\s\S]*?)\] as const/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const VR = 22050;
const pcmOf = (p) => ff(['-i', p, '-ac', '1', '-ar', String(VR), '-f', 's16le', '-']);
const s8 = (i16) => { const out = Buffer.alloc(i16.length / 2); let peak = 1; for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(i16.readInt16LE(i * 2))); for (let i = 0; i < out.length; i++) out.writeInt8(Math.round((i16.readInt16LE(i * 2) / peak) * 120), i); return out; };
/** Where a recording is loud enough to be a sound: [start, end) in samples, in order. */
function cuts(pcm) {
  const n = pcm.length / 2;
  const win = Math.round(VR * 0.01);
  let peak = 1;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i * 2)));
  const loud = [];
  for (let w = 0; w * win < n; w++) {
    let e = 0;
    for (let i = w * win; i < Math.min(n, (w + 1) * win); i++) e = Math.max(e, Math.abs(pcm.readInt16LE(i * 2)));
    loud.push(e > peak * 0.08);
  }
  const out = [];
  for (let w = 0; w < loud.length; w++) {
    if (!loud[w]) continue;
    let e = w;
    // (A gap shorter than 60 ms is inside one syllable: a stop in "ka" or "ta".)
    while (e + 1 < loud.length && (loud[e + 1] || loud.slice(e + 1, e + 7).some(Boolean))) e++;
    if (e - w >= 2) out.push([Math.max(0, (w - 1) * win), Math.min(n, (e + 2) * win)]);
    w = e;
  }
  return out;
}
const voices = [];
for (const f of files('voices')) {
  const p = path.join(assetsDir, 'voices', f);
  const isDir = fs.statSync(p).isDirectory();
  const kind = isDir ? f : stem(f);
  if (!voiceKinds.includes(kind)) { bad.push(`assets/voices/${f}: there is no kind of character called "${kind}" (the kinds are ${voiceKinds.join(', ')})`); continue; }
  const got = {};
  if (isDir) {
    for (const g of fs.readdirSync(p).filter((x) => !x.startsWith('.')).sort()) {
      if (!syllables.includes(stem(g))) { bad.push(`assets/voices/${f}/${g}: "${stem(g)}" is not one of the syllables (${syllables.join(' ')})`); continue; }
      got[stem(g)] = s8(pcmOf(path.join(p, g))).toString('base64');
    }
  } else {
    const pcm = pcmOf(p);
    const parts = cuts(pcm);
    if (!parts.length) { bad.push(`assets/voices/${f}: nothing loud enough in it to cut into syllables`); continue; }
    // In the order said; if there are fewer sounds than syllables, they go round again.
    syllables.forEach((syl, i) => { const [a, b] = parts[i % parts.length]; got[syl] = s8(pcm.subarray(a * 2, b * 2)).toString('base64'); });
    console.log(`voice   ${kind.padEnd(16)} ${f}: ${parts.length} sounds cut out of it${parts.length < syllables.length ? ` (fewer than the ${syllables.length} syllables: they go round again)` : ''}`);
  }
  if (isDir) console.log(`voice   ${kind.padEnd(16)} ${f}/: ${Object.keys(got).length} syllables`);
  voices.push({ kind, file: isDir ? `${f}/` : f, hash: isDir ? crypto.createHash('sha1').update(fs.readdirSync(p).filter((x) => !x.startsWith('.')).sort().map((x) => x + sha(path.join(p, x))).join()).digest('hex').slice(0, 16) : sha(p), got });
}
fs.rmSync(tmp, { recursive: true, force: true });
if (bad.length) {
  console.error('\nNOT PACKED: these files are not named for anything the game has.\n  ' + bad.join('\n  '));
  process.exit(1);
}

const q = (s) => JSON.stringify(s);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `/**
 * Made by scripts/assets/pack.mjs from the files in assets/ (see assets/README.md). Do not edit by hand: put a file in
 * assets/, or take one out, and run \`npm run assets\`.
 */
export interface DroppedTexture { file: string; hash: string; /** Dots a side. */ size: number; /** RGBA, bottom row first, in base64. */ b64: string }
export interface DroppedSound { file: string; hash: string; seconds: number; /** Mono, 22050 a second, 8 bit signed, in base64. */ b64: string }
export interface DroppedMusic { file: string; hash: string; /** What its name is: a room's id, a kind of music, or a jingle. */ what: 'room' | 'kind' | 'jingle'; lead: number; length: number; /** MP3, in base64. */ b64: string }
export interface DroppedVoice { file: string; hash: string; /** Each syllable it has: mono, 22050 a second, 8 bit signed, in base64. */ syllables: Record<string, string> }
export interface DroppedFont { file: string; hash: string; /** As @font-face's format() names it, and its type. */ format: string; mime: string; /** The file, in base64. */ b64: string }
export const DROPPED: { textures: Record<string, DroppedTexture>; sounds: Record<string, DroppedSound>; music: Record<string, DroppedMusic>; fonts: Record<string, DroppedFont>; voices: Record<string, DroppedVoice> } = {
  textures: {
${textures.map((t) => `    ${t.name}: { file: ${q(t.file)}, hash: '${t.hash}', size: ${t.size}, b64: '${t.b64}' },`).join('\n')}
  },
  sounds: {
${sounds.map((s) => `    ${s.name}: { file: ${q(s.file)}, hash: '${s.hash}', seconds: ${s.seconds.toFixed(3)}, b64: '${s.b64}' },`).join('\n')}
  },
  music: {
${music.map((m) => `    ${m.name}: { file: ${q(m.file)}, hash: '${m.hash}', what: '${m.what}', lead: ${m.lead.toFixed(6)}, length: ${m.length.toFixed(6)}, b64: '${m.b64}' },`).join('\n')}
  },
  fonts: {
${fonts.map((f) => `    ${f.name}: { file: ${q(f.file)}, hash: '${f.hash}', format: '${f.format}', mime: '${f.mime}', b64: '${f.b64}' },`).join('\n')}
  },
  voices: {
${voices.map((v) => `    ${v.kind}: { file: ${q(v.file)}, hash: '${v.hash}', syllables: { ${Object.entries(v.got).map(([k, b]) => `${k}: '${b}'`).join(', ')} } },`).join('\n')}
  },
};
`);
console.log(`${path.relative(root, outFile)}: ${textures.length} textures, ${sounds.length} sounds, ${music.length} songs, ${fonts.length} fonts, ${voices.length} voices`);
