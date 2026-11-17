// PACKS THE DROP-IN FILES (assets/) INTO THE GAME: writes src/assets/dropped.ts.
//   node scripts/assets/pack.mjs          (npm run assets runs this, then writes ASSETS.md)
// See assets/README.md for what goes where. Needs ffmpeg and ffprobe.
// The game is one .html file, so nothing can be loaded when it runs: a dropped picture is stored as its dots, a
// dropped sound as its samples, a dropped song as an MP3, all as text in that one module.
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
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
export const DROPPED: { textures: Record<string, DroppedTexture>; sounds: Record<string, DroppedSound>; music: Record<string, DroppedMusic> } = {
  textures: {
${textures.map((t) => `    ${t.name}: { file: ${q(t.file)}, hash: '${t.hash}', size: ${t.size}, b64: '${t.b64}' },`).join('\n')}
  },
  sounds: {
${sounds.map((s) => `    ${s.name}: { file: ${q(s.file)}, hash: '${s.hash}', seconds: ${s.seconds.toFixed(3)}, b64: '${s.b64}' },`).join('\n')}
  },
  music: {
${music.map((m) => `    ${m.name}: { file: ${q(m.file)}, hash: '${m.hash}', what: '${m.what}', lead: ${m.lead.toFixed(6)}, length: ${m.length.toFixed(6)}, b64: '${m.b64}' },`).join('\n')}
  },
};
`);
console.log(`${path.relative(root, outFile)}: ${textures.length} textures, ${sounds.length} sounds, ${music.length} songs`);
