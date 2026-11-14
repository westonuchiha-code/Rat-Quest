// usage: npm run check:files   (needs puppeteer-core, a dev dependency, and Chrome; CHROME=path to use another)
// Plays through the save files with the keyboard, in a fresh browser profile: START, save, quit to title, a second file,
// copy, erase. Screenshots at each step; checks the storage keys.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.argv[2] ?? 'dist-single/ratquest-nopad.html');
const out = process.argv[3] ?? '/tmp/files';
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync('/tmp/rqprof-');
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: 'new', userDataDir: profile,
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = async (k, wait = 350) => { await page.keyboard.press(k); await sleep(wait); };
const keys = async () => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('ratquest')).sort());
const text = async (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((e) => e.textContent.trim()).join(' | '), sel);
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`); if (!ok) fails++; };
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
// Opens the menu and goes to the SAVE screen (the menu remembers the last screen it showed).
const toSaveScreen = async () => {
  await key('Escape', 600);
  for (let i = 0; i < 7 && !/SAVE/.test(await text('.rq-menu .rq-title')); i++) await key('KeyE', 300);
  // (It remembers the row too: start from the top.)
  for (let i = 0; i < 22; i++) await key('ArrowUp', 60);
};

await page.goto(`file://${file}`);
await sleep(1500);
await key('Enter', 800); // skip the logo
check('a fresh game: the title offers START', /START/.test(await text('.rq-title .opts')), await text('.rq-title .opts'));
await shot('1-title');
await key('Enter', 4500); // START: loading, then the game in File 1
check('playing: no title', !(await page.evaluate(() => document.querySelector('.rq-boot')?.classList.contains('on'))));
await key('F5', 600); // quicksave
check('File 1 is the old keys', (await keys()).includes('ratquest.quicksave.v1'), (await keys()).join(','));
// Menu: SAVE screen, SAVE AND QUIT TO TITLE.
await toSaveScreen();
await shot('2-save-screen');
const rows = await text('.rq-acts .rq-btn');
const idx = rows.split(' | ').indexOf('SAVE AND QUIT TO TITLE');
check('the SAVE screen has SAVE AND QUIT TO TITLE', idx >= 0, rows);
for (let i = 0; i < idx; i++) await key('ArrowDown', 200);
await key('Enter', 1000);
check('back on the title, which now says CONTINUE', /CONTINUE/.test(await text('.rq-title .opts')), await text('.rq-title .opts'));
await key('Enter', 800); // CONTINUE: the files
await shot('3-files');
let cards = await text('.rq-files .card');
check('File 1 has a game; 2 and 3 are new', /FILE 1.*\/.*FILE 2NEW GAME.*FILE 3NEW GAME/.test(cards.replace(/\s+/g, '')) || (/FILE 1/.test(cards) && (cards.match(/NEW GAME/g) ?? []).length === 2), cards);
await key('ArrowRight');
await key('Enter', 4500); // a new game in File 2
await key('F5', 600);
check('File 2 has its own keys', (await keys()).includes('ratquest.f2.quicksave.v1'), (await keys()).join(','));
await toSaveScreen();
for (let i = 0; i < idx; i++) await key('ArrowDown', 200);
await key('Enter', 1000);
await key('Enter', 800);
cards = await text('.rq-files .card');
check('two games now, one empty file', (cards.match(/NEW GAME/g) ?? []).length === 1, cards);
await shot('4-two-files');
// Copy File 1 to File 3.
await key('ArrowLeft'); // to File 1
await key('KeyC');
check('copy asks where to', /to which file/.test(await text('.rq-files .msg')), await text('.rq-files .msg'));
await key('ArrowRight'); // File 3 (it starts on the next file, File 2)
await shot('5-copy');
await key('Enter');
cards = await text('.rq-files .card');
check('copied: no empty file left', !(cards.match(/NEW GAME/g) ?? []).length && (await keys()).includes('ratquest.f3.quicksave.v1'), (await text('.rq-files .msg')) + ' / ' + cards);
// Erase File 2 (asks first).
await key('ArrowLeft');
await key('Delete');
check('erase asks first', /Erase File 2/.test(await text('.rq-files .msg')), await text('.rq-files .msg'));
await shot('6-erase-ask');
await key('Delete');
cards = await text('.rq-files .card');
check('File 2 erased, the others kept', (cards.match(/NEW GAME/g) ?? []).length === 1 && !(await keys()).some((k) => k.startsWith('ratquest.f2.')) && (await keys()).includes('ratquest.quicksave.v1'), cards);
await shot('7-erased');
// Play File 3 (the copy): it loads.
await key('ArrowRight');
await key('Enter', 4500);
check('the copy plays', !(await page.evaluate(() => document.querySelector('.rq-boot')?.classList.contains('on'))) && (await page.evaluate(() => localStorage.getItem('ratquest.file'))) === '3');
await shot('8-playing-copy');
check('no errors on the page', errors.length === 0, errors.join(' | ').slice(0, 300));
await browser.close();
fs.rmSync(profile, { recursive: true, force: true });
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exit(fails ? 1 : 0);
