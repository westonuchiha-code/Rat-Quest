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
import { FONTS, fontCss } from '../src/ui/fonts';
import { SFX_NAMES } from '../src/audio/synth';
import { JINGLES, TUNES } from '../src/audio/tunes';
import { CUTSCENES } from '../src/cutscene/scenes';
import { TEXTURE_NAMES } from '../src/render/textures';

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
  check('ASSETS.md is what the game\'s own lists say now (if not: `npm run assets`)', kept === now, kept === now ? '' : `the file has ${kept.split('\n').length} lines; it would be written with ${now.split('\n').length}; first line that differs: ${now.split('\n').findIndex((l, i) => l !== kept.split('\n')[i]) + 1}`);
  const paths = [...new Set([...now.matchAll(/`((?:src|scripts|recordings)\/[A-Za-z0-9_./-]+\.[a-z0-9]+)`/g)].map((m) => m[1]))];
  const missing = paths.filter((p) => !fs.existsSync(path.join(root, p)));
  check(`every file it names is there (${paths.length} of them)`, paths.length > 60 && missing.length === 0, missing.join(', '));
  check('nothing in it is a question mark: every level has its file, every character a body and a voice, every recorded sound its recording', !/`\?`|\| \? \||recordings\/\?| \? at /.test(now));
  // It leaves nothing out.
  const all = [...ALL_LEVELS, ...TEST_ROOMS];
  check('every level is in it by its id', all.every((l) => now.includes(`\`${l.id}\``)), all.filter((l) => !now.includes(`\`${l.id}\``)).map((l) => l.id).join(' '));
  const types = [...new Set(all.flatMap((l) => [...l.enemies, ...l.waves.flat(), ...(l.plates ?? []).flatMap((p) => (p.spawn ? [p.spawn] : []))]).map((e) => e.type ?? 'scuttler'))];
  check('every kind of creature any level holds has its line (its mind and its body)', types.every((t) => CREATURES.some((c) => c.type === t)) && CREATURES.every((c) => fs.existsSync(path.join(root, c.mind)) && fs.existsSync(path.join(root, c.body))), types.filter((t) => !CREATURES.some((c) => c.type === t)).join(' '));
  const people = [...new Set(all.flatMap((l) => (l.npcs ?? []).map((n) => n.name.toUpperCase())))];
  check('every character in any level is in it', people.length >= 17 && people.every((n) => now.includes(`| ${n} |`)), people.filter((n) => !now.includes(`| ${n} |`)).join(', '));
  check('every sound effect, every tune and jingle, every cutscene and every texture is in it by name', SFX_NAMES.every((n) => now.includes(`\`${n}\``)) && [...Object.keys(TUNES), ...Object.keys(JINGLES)].every((n) => now.includes(`\`${n}\``)) && CUTSCENES.every((c) => now.includes(`\`${c.id}\``)) && TEXTURE_NAMES.every((n) => now.includes(`\`${n}\``)));
  check('it says how to make it again, and that the films are not kept in the project', /npm run assets/.test(now) && /NOT kept in the project/.test(now) && ['scripts/film/film.mjs', 'scripts/film/stills.mjs', 'scripts/film/cut.sh'].every((f) => now.includes(f)));
}

// ---- The fonts ----
{
  const files = [...walk('src').filter((f) => f.endsWith('.ts') && f !== 'src/ui/fonts.ts'), 'index.html'];
  // (A typeface named in code: one of the families the game uses, or any CSS family word.)
  const named = /ui-monospace|\bmonospace\b|sans-serif|\bserif\b|system-ui|\bImpact\b|\bGeorgia\b|\bMenlo\b|\bConsolas\b|\bArial\b|\bHelvetica\b|\bRoboto\b|\bSegoe\b|\bTrebuchet\b|Times New Roman/;
  const where = files.flatMap((f) => read(f).split('\n').flatMap((l, i) => (named.test(l) ? [`${f}:${i + 1}`] : [])));
  check('NO font is named anywhere in the game but `src/ui/fonts.ts`: to change a font is to change one line', where.length === 0, where.slice(0, 8).join(', '));
  const used = [...new Set(files.flatMap((f) => [...read(f).matchAll(/var\(--rq-font-([a-z]+)/g)].map((m) => m[1])))];
  const direct = [...new Set(files.flatMap((f) => [...read(f).matchAll(/FONTS\.([a-z]+)/g)].map((m) => m[1])))];
  check('every font the game asks for by name is one that file has (and the main ones are really used)', [...used, ...direct].every((k) => k in FONTS) && used.includes('game') && used.includes('title') && direct.includes('game'), `asked for: ${[...used, ...direct].join(' ')}`);
  check('the page is given a variable for each font', (Object.keys(FONTS) as Array<keyof typeof FONTS>).every((k) => fontCss().includes(`--rq-font-${k}: ${FONTS[k]};`)));
  check('the game puts them on the page as it starts', /^import '\.\/ui\/fonts';/m.test(read('src/main.ts')));
}

console.log(failures === 0 ? '\nassets: all passed' : `\nassets: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
