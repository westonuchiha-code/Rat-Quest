/**
 * THE ASSET INVENTORY (ASSETS.md) IS TRUE, AND THE FONTS ARE IN ONE PLACE.
 * The owner, 2026-11-17: "all of the assets, little cut scenes and videos that we have, all of that kind of stuff, even
 * things like fonts may change in the future so they all need to be well organized, kept track of and easily
 * replaceable."
 */
import './../src/core/colorSetup';
import fs from 'node:fs';
import path from 'node:path';
import { assetsDoc, CREATURES } from '../scripts/assets/inventory';
import { ALL_LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { FONTS, fontCss, fontTable } from '../src/ui/fonts';
import { VOICES, syllableSample, voiceOf } from '../src/audio/speech';
import { SFX_NAMES } from '../src/audio/synth';
import { JINGLES, TUNES } from '../src/audio/tunes';
import { CUTSCENES } from '../src/cutscene/scenes';
import { TEXTURE_NAMES, getTexturePixels } from '../src/render/textures';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { DROPPED } from '../src/assets/dropped';
import { levelById } from '../src/levels/levels';
import { PLAYLISTS, TRACK_NAMES, jingleNamed, playlistFor, tuneNamed } from '../src/audio/music';
import { sfx } from '../src/audio/synth';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const root = process.cwd();
const read = (p: string): string => fs.readFileSync(path.join(root, p), 'utf8');
const list = (d: string): string[] => fs.readdirSync(path.join(root, d)).sort();
const walk = (d: string): string[] => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]));

// ---- The list ----
{
  const now = assetsDoc(read, list);
  const kept = fs.existsSync(path.join(root, 'ASSETS.md')) ? read('ASSETS.md') : '';
  check(
    'ASSETS.md is what the game\'s own lists say now (if not: `npm run assets`)',
    kept === now,
    kept === now ? '' : `the file has ${kept.split('\n').length} lines; it would be written with ${now.split('\n').length}; first line that differs: ${now.split('\n').findIndex((l, i) => l !== kept.split('\n')[i]) + 1}`
  );
  const paths = [...new Set([...now.matchAll(/`((?:src|scripts|recordings)\/[A-Za-z0-9_./-]+\.[a-z0-9]+)`/g)].map((m) => m[1]))];
  const missing = paths.filter((p) => !fs.existsSync(path.join(root, p)));
  check(`every file it names is there (${paths.length} of them)`, paths.length > 60 && missing.length === 0, missing.join(', '));
  check(
    'nothing in it is a question mark: every level has its file, every character a body and a voice, every recorded sound its recording',
    !/`\?`|\| \? \||recordings\/\?| \? at /.test(now)
  );
  // It leaves nothing out.
  const all = [...ALL_LEVELS, ...TEST_ROOMS];
  check(
    'every level is in it by its id',
    all.every((l) => now.includes(`\`${l.id}\``)),
    all.filter((l) => !now.includes(`\`${l.id}\``)).map((l) => l.id).join(' ')
  );
  const types = [...new Set(all.flatMap((l) => [...l.enemies, ...l.waves.flat(), ...(l.plates ?? []).flatMap((p) => (p.spawn ? [p.spawn] : []))]).map((e) => e.type ?? 'scuttler'))];
  check(
    'every kind of creature any level holds has its line (its mind and its body)',
    types.every((t) => CREATURES.some((c) => c.type === t))
      && CREATURES.every((c) => fs.existsSync(path.join(root, c.mind)) && fs.existsSync(path.join(root, c.body))),
    types.filter((t) => !CREATURES.some((c) => c.type === t)).join(' ')
  );
  const people = [...new Set(all.flatMap((l) => (l.npcs ?? []).map((n) => n.name.toUpperCase())))];
  check(
    'every character in any level is in it',
    people.length >= 17
      && people.every((n) => now.includes(`| ${n} |`)),
    people.filter((n) => !now.includes(`| ${n} |`)).join(', ')
  );
  check(
    'every sound effect, every tune and jingle, every cutscene and every texture is in it by name',
    SFX_NAMES.every((n) => now.includes(`\`${n}\``))
      && [...Object.keys(TUNES), ...Object.keys(JINGLES)].every((n) => now.includes(`\`${n}\``))
      && CUTSCENES.every((c) => now.includes(`\`${c.id}\``))
      && TEXTURE_NAMES.every((n) => now.includes(`\`${n}\``))
  );
  check(
    'it says how to make it again, and that the films are not kept in the project',
    /npm run assets/.test(now)
      && /NOT kept in the project/.test(now)
      && ['scripts/film/film.mjs', 'scripts/film/stills.mjs', 'scripts/film/cut.sh'].every((f) => now.includes(f))
  );
}

// ---- The fonts ----
{
  const files = [...walk('src').filter((f) => f.endsWith('.ts') && f !== 'src/ui/fonts.ts'), 'index.html'];
  // (A typeface named in code: one of the families the game uses, or any CSS family word.)
  const named = /ui-monospace|\bmonospace\b|sans-serif|\bserif\b|system-ui|\bImpact\b|\bGeorgia\b|\bMenlo\b|\bConsolas\b|\bArial\b|\bHelvetica\b|\bRoboto\b|\bSegoe\b|\bTrebuchet\b|Times New Roman/;
  const where = files.flatMap((f) => read(f).split('\n').flatMap((l, i) => (named.test(l) ? [`${f}:${i + 1}`] : [])));
  check(
    'NO font is named anywhere in the game but `src/ui/fonts.ts`: to change a font is to change one line',
    where.length === 0,
    where.slice(0, 8).join(', ')
  );
  const used = [...new Set(files.flatMap((f) => [...read(f).matchAll(/var\(--rq-font-([a-z]+)/g)].map((m) => m[1])))];
  const direct = [...new Set(files.flatMap((f) => [...read(f).matchAll(/FONTS\.([a-z]+)/g)].map((m) => m[1])))];
  check(
    'every font the game asks for by name is one that file has (and the main ones are really used)',
    [...used, ...direct].every((k) => k in FONTS)
      && used.includes('game')
      && used.includes('title')
      && direct.includes('game'),
    `asked for: ${[...used, ...direct].join(' ')}`
  );
  check(
    'the page is given a variable for each font',
    (Object.keys(FONTS) as Array<keyof typeof FONTS>).every((k) => fontCss().includes(`--rq-font-${k}: ${FONTS[k]};`))
  );
  check('the game puts them on the page as it starts', /^import '\.\/ui\/fonts';/m.test(read('src/main.ts')));
  // A font FILE dropped in (assets/fonts/title.woff2, packed into DROPPED.fonts): it goes first in its line, with an @font-face for it.
  const dropped = fontTable({ title: { file: 'title.woff2', hash: '0', format: 'woff2', mime: 'font/woff2', b64: 'AAAA' } });
  check(
    'A FONT FILE DROPPED IN FOR A LINE goes FIRST in that line (the line\'s own fonts stay after it), and the page is told where the file is; the other lines are as they were',
    dropped.fonts.title.startsWith("'rq-dropped-title', ")
      && dropped.fonts.title.endsWith(fontTable({}).fonts.title)
      && dropped.faces.length === 1
      && dropped.faces[0].includes("font-family: 'rq-dropped-title'")
      && dropped.faces[0].includes('data:font/woff2;base64,AAAA')
      && dropped.fonts.game === fontTable({}).fonts.game
  );
  check(
    '...and with nothing dropped in, the lines are the game\'s own and there is no font file to load',
    fontTable({}).faces.length === 0
      && (Object.keys(FONTS) as Array<keyof typeof FONTS>).every((k) => fontTable({}).fonts[k] === FONTS[k] || !!DROPPED.fonts[k])
  );
}

// ---- DROP-IN FILES (assets/, assets/README.md): a picture as a texture, a recording as a sound effect or a song,
// with no code edited. ----
{
  // What is packed into the game is what is in the folders now.
  const sha = (p: string): string => crypto.createHash('sha1').update(fs.readFileSync(path.join(root, p))).digest('hex').slice(0, 16);
  const stale: string[] = [];
  for (const [dir, packed] of [['textures', DROPPED.textures], ['sounds', DROPPED.sounds], ['music', DROPPED.music]] as const) {
    const there = list(`assets/${dir}`).filter((f) => !f.startsWith('.') && !f.endsWith('.md'));
    for (const f of there) {
      const d = packed[f.replace(/\.[^.]+$/, '')];
      if (!d || d.file !== f || d.hash !== sha(`assets/${dir}/${f}`)) stale.push(`assets/${dir}/${f} is not packed as it is now`);
    }
    for (const [name, d] of Object.entries(packed)) if (!there.includes(d.file)) stale.push(`${dir} "${name}" is packed but its file is gone`);
  }
  check(
    'what is packed into the game (src/assets/dropped.ts) is exactly what is in assets/ now (if not: `npm run assets`)',
    stale.length === 0,
    stale.join('; ')
  );
  check(
    'every dropped file is named for something the game has: a texture, a sound effect, a room, a kind of music or a jingle',
    Object.keys(DROPPED.textures).every((n) => (TEXTURE_NAMES as readonly string[]).includes(n))
      && Object.keys(DROPPED.sounds).every((n) => (SFX_NAMES as readonly string[]).includes(n))
      && Object.entries(DROPPED.music).every(([n, d]) => (d.what === 'room' ? !!levelById(n) : d.what === 'kind' ? (TRACK_NAMES as string[]).includes(n) : !!JINGLES[n]))
  );

  // The game uses a dropped file in place of its own. (Put in here by hand, as the packer would, and taken out again.)
  const b64 = (bytes: number[]): string => Buffer.from(bytes).toString('base64');
  const own = getTexturePixels('ironBars');
  DROPPED.textures.keepStone = { file: 'keepStone.png', hash: 'x', size: 2, b64: b64([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 9, 8, 7, 255]) };
  const got = getTexturePixels('keepStone');
  delete DROPPED.textures.keepStone;
  check(
    'a picture dropped in for a texture IS that texture: its size, its dots; and a texture nothing was dropped for is the game\'s own',
    got.size === 2
      && got.data.length === 16
      && got.data[0] === 255
      && got.data[12] === 9
      && own.size >= 16
      && own.data.length === own.size * own.size * 4
  );
  // A VOICE dropped in for a kind of character: its syllables, at its own pitch; the other kinds keep theirs.
  DROPPED.voices.turtle = { file: 'turtle/', hash: 'x', syllables: { ah: b64([127, 0, 129, 64]) } };
  const tv = voiceOf('turtle');
  const ah = syllableSample(tv.bank, 'ah', tv.standIn);
  const owl = voiceOf('owl');
  delete DROPPED.voices.turtle;
  check(
    'A VOICE DROPPED IN FOR A KIND OF CHARACTER (a turtle) is the voice that kind speaks with: its own syllables, at their own pitch; another kind (an owl) keeps the voice it borrowed',
    tv.bank === '@turtle'
      && tv.pitch === 1
      && ah.rate === 22050
      && ah.data.length === 4
      && Math.abs(ah.data[0] - 1) < 1e-6
      && Math.abs(ah.data[2] + 1) < 0.01
      && owl.bank === VOICES.owl.bank
      && owl.pitch === VOICES.owl.pitch
      && voiceOf('turtle').bank === VOICES.turtle.bank
  );
  DROPPED.sounds.pebbles = { file: 'pebbles.wav', hash: 'x', seconds: 3 / 22050, b64: b64([127, 0, 129]) };
  DROPPED.sounds.rideScrape = { file: 'rideScrape.wav', hash: 'x', seconds: 4000 / 22050, b64: b64(Array.from({ length: 4000 }, (_, i) => (i * 7) % 250)) };
  const pebbles = sfx('pebbles');
  const scrape = sfx('rideScrape');
  delete DROPPED.sounds.pebbles;
  delete DROPPED.sounds.rideScrape;
  check(
    'a recording dropped in for a sound effect IS that effect, whole (its samples, 22050 a second); one dropped for an effect that goes round and round still goes round',
    pebbles.data.length === 3
      && Math.abs(pebbles.data[0] - 1) < 1e-6
      && Math.abs(pebbles.data[2] + 1) < 1e-6
      && pebbles.rate === 22050
      && !pebbles.loop
      && scrape.loop
      && sfx('jump').data.length > 100,
    `${pebbles.data.length} samples; the loop ${scrape.loop}`
  );
  const song = { file: 'x.mp3', hash: 'x', lead: 0.3, length: 12, b64: 'AAAA' };
  DROPPED.music.hall = { ...song, what: 'room' };
  DROPPED.music.groove = { ...song, what: 'kind', length: 20 };
  DROPPED.music.wedge = { ...song, what: 'jingle', length: 2 };
  const inHall = playlistFor('groove', 'hall');
  const inClub = playlistFor('groove', 'hub');
  const elsewhere = playlistFor('drift', 'cistern');
  const ok = inHall?.tunes.join() === '@hall' && tuneNamed('@hall')?.length === 12 && tuneNamed('@hall')?.lead === 0.3 && inClub?.tunes.join() === '@groove' && tuneNamed('@groove')?.length === 20 && elsewhere === PLAYLISTS.drift && jingleNamed('wedge')?.length === 2 && jingleNamed('defeat') === JINGLES.defeat;
  delete DROPPED.music.hall;
  delete DROPPED.music.groove;
  delete DROPPED.music.wedge;
  check(
    'a song dropped in for a ROOM plays in that room; one dropped for a KIND of music, in every room that asks for that kind and has none of its own; a jingle, in place of that jingle; everywhere else the game\'s own',
    ok
      && playlistFor('groove', 'hall') === PLAYLISTS.groove
      && jingleNamed('wedge') === JINGLES.wedge
      && tuneNamed('bap1') === TUNES.bap1
  );

  // The packer itself, on a folder made here: a picture, a sound, a song for a room; and a file named for nothing.
  let ff = true;
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ff = false; }
  if (!ff) check('the packer (not run: this machine has no ffmpeg)', true);
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rq-drop-'));
    for (const d of ['textures', 'sounds', 'music', 'fonts', 'voices', 'voices/turtle']) fs.mkdirSync(path.join(tmp, d));
    // (A font file is packed as it is: any bytes will do for the packer.)
    fs.writeFileSync(path.join(tmp, 'fonts', 'title.woff2'), Buffer.from('wOF2 not really a font, but packed whole'));
    const make = (args: string[]): void => void execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
    // Voices: a folder of syllables for the turtle; one recording for the fox, five beeps with silence between them.
    make(['-f', 'lavfi', '-i', 'sine=frequency=300:duration=0.15', path.join(tmp, 'voices', 'turtle', 'ah.wav')]);
    make(['-f', 'lavfi', '-i', 'sine=frequency=500:duration=0.12', path.join(tmp, 'voices', 'turtle', 'ba.wav')]);
    make(['-f', 'lavfi', '-i', "aevalsrc='if(lt(mod(t,0.4),0.15),0.8*sin(2*PI*400*t),0)':d=2:s=22050", path.join(tmp, 'voices', 'fox.wav')]);
    make(['-f', 'lavfi', '-i', 'color=c=red:s=16x16', '-frames:v', '1', path.join(tmp, 'textures', 'brick.png')]);
    make(['-f', 'lavfi', '-i', 'color=c=blue:s=300x200', '-frames:v', '1', path.join(tmp, 'textures', 'floor.png')]);
    make(['-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.25', path.join(tmp, 'sounds', 'jump.wav')]);
    make(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', path.join(tmp, 'music', 'hall.wav')]);
    const out = path.join(tmp, 'dropped.ts');
    const run = (): number => {
      try { execFileSync('node', ['scripts/assets/pack.mjs'], { cwd: root, env: { ...process.env, RQ_ASSETS: tmp, RQ_DROPPED: out }, stdio: 'ignore' }); return 0; } catch (e) { return (e as { status?: number }).status ?? 1; }
    };
    const code = run();
    const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    const size = (n: string): number => Number(new RegExp(`${n}: \\{ file: [^,]+, hash: '[0-9a-f]+', size: (\\d+)`).exec(text)?.[1] ?? 0);
    const red = Buffer.from(/brick: \{[^}]*b64: '([^']+)'/.exec(text)?.[1] ?? '', 'base64');
    check('the packer packs a folder: a small square picture as it is, dot for dot (and its colour is its colour); a big oblong one squeezed to 128 square; a sound at its length; a song for a room with a round\'s lead and length', code === 0 && size('brick') === 16 && red.length === 16 * 16 * 4 && red[0] > 200 && red[1] < 60 && red[3] === 255 && size('floor') === 128 && /jump: \{ file: "jump.wav", hash: '[0-9a-f]+', seconds: 0\.25/.test(text) && /hall: \{ file: "hall.wav", hash: '[0-9a-f]+', what: 'room', lead: 0\.3\d*, length: 2\.0/.test(text), `exit ${code}; brick ${size('brick')}, floor ${size('floor')}`);
    const font = /title: \{ file: "title.woff2", hash: '[0-9a-f]+', format: 'woff2', mime: 'font\/woff2', b64: '([^']+)'/.exec(text);
    check(
      '...and a FONT file named for a line of lettering (title.woff2) whole, as it is',
      !!font
        && Buffer.from(font[1], 'base64').toString() === 'wOF2 not really a font, but packed whole'
    );
    const voiceText = (k: string): string => new RegExp(`\\n    ${k}: \\{ file: [^\\n]*`).exec(text)?.[0] ?? '';
    const sylsOf = (k: string): string[] => [...(voiceText(k).split('syllables: {')[1] ?? '').matchAll(/ ([a-z]+): '[A-Za-z0-9+/=]+'/g)].map((m) => m[1]);
    const foxLen = (syl: string): number => Buffer.from(new RegExp(` ${syl}: '([^']+)'`).exec(voiceText('fox').split('syllables: {')[1] ?? '')?.[1] ?? '', 'base64').length;
    check(
      'A VOICE: a folder of syllable files (turtle/ah.wav, ba.wav) is packed syllable by syllable',
      sylsOf('turtle').join(' ') === 'ah ba',
      sylsOf('turtle').join(' ')
    );
    const foxBytes = (syl: string): string => new RegExp(` ${syl}: '([^']+)'`).exec(voiceText('fox').split('syllables: {')[1] ?? '')?.[1] ?? '';
    check(
      '...and ONE recording (fox.wav) is cut where it falls quiet, its sounds given to the syllables in order: five beeps, each a syllable about a beep long, and round again (the 24th syllable is the 4th sound)',
      sylsOf('fox').length === 27
        && foxLen('ah') > 22050 * 0.12
        && foxLen('ah') < 22050 * 0.25
        && foxBytes('za') === foxBytes('oh')
        && foxBytes('ah') !== '',
      `${sylsOf('fox').length} syllables; ah ${foxLen('ah')} samples`
    );
    fs.writeFileSync(path.join(tmp, 'voices', 'dragon.wav'), fs.readFileSync(path.join(tmp, 'voices', 'fox.wav')));
    fs.rmSync(out, { force: true });
    check('...a voice for a kind of character the game has not got is refused', run() === 1 && !fs.existsSync(out));
    fs.rmSync(path.join(tmp, 'voices', 'dragon.wav'));
    fs.writeFileSync(path.join(tmp, 'voices', 'turtle', 'blah.wav'), fs.readFileSync(path.join(tmp, 'voices', 'turtle', 'ah.wav')));
    check('...and so is a syllable file named for no syllable', run() === 1 && !fs.existsSync(out));
    fs.rmSync(path.join(tmp, 'voices', 'turtle', 'blah.wav'));
    fs.writeFileSync(path.join(tmp, 'fonts', 'banner.ttf'), Buffer.from('x'));
    fs.rmSync(out, { force: true });
    check('...a font named for no line of lettering is refused', run() === 1 && !fs.existsSync(out));
    fs.rmSync(path.join(tmp, 'fonts', 'banner.ttf'));
    fs.writeFileSync(path.join(tmp, 'fonts', 'game.png'), Buffer.from('x'));
    check('...and so is a file that is not a font', run() === 1 && !fs.existsSync(out));
    fs.rmSync(path.join(tmp, 'fonts', 'game.png'));
    fs.writeFileSync(path.join(tmp, 'sounds', 'notASound.wav'), fs.readFileSync(path.join(tmp, 'sounds', 'jump.wav')));
    fs.rmSync(out, { force: true });
    check(
      '...and a file named for nothing the game has is REFUSED, and nothing is written: it cannot be dropped in and silently do nothing',
      run() === 1
        && !fs.existsSync(out)
    );
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const readme = read('assets/README.md');
  check(
    'the folders are there with their instructions, and the delivery script packs before it builds',
    ['textures', 'sounds', 'music', 'fonts', 'voices'].every((d) => fs.existsSync(path.join(root, 'assets', d)) && readme.includes(`## ${d}/`))
      && /node scripts\/assets\/pack\.mjs/.test(read('scripts/deliver.sh'))
      && /pack\.mjs/.test(read('package.json'))
  );
}

console.log(failures === 0 ? '\nassets: all passed' : `\nassets: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
