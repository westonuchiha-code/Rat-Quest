// THE SMOKE CHECK (2026-11-22): the REAL game, as it is sent, opened in a headless browser and played a little.
//
// Why: for two days (2026-11-20 to 22) every build sent had a knight who could not move. The line that steps him had
// been dropped from main.ts; no test runs main.ts, and every film made since was of another character. This opens the
// very file that is sent, presses the pad (`&autopad`, dev/filmDrive.ts) and reads where he is (`window.__probe`,
// main.ts): the knight must walk, jump and swing; a played character must move; the Hall must open; and no page may
// throw an error. `bash scripts/deliver.sh` runs it on what it has just built, and stops if it fails.
//
//   node scripts/smoke.mjs [path/to/ratquest.html] [--rooms]      (default: ../deliver/ratquest.html, then dist-single/)
//   --rooms: every room as well (a few minutes): each opens with no error and he can move in it.
//   --doors: through every door of the Hall and back out of each room.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const given = process.argv.slice(2).find((a) => !a.startsWith('--'));
const file = [given, '../deliver/ratquest.html', 'deliver/ratquest.html', 'dist-single/ratquest.html'].filter(Boolean).map((p) => path.resolve(p)).find((p) => fs.existsSync(p));
if (!file) {
  console.log('smoke: no built game to open (build it first: bash scripts/deliver.sh)');
  process.exit(2);
}
const chrome = [process.env.CHROME, '/usr/bin/google-chrome', '/opt/pw-browsers/chromium'].filter(Boolean).find((p) => fs.existsSync(p));
if (!chrome) {
  console.log('smoke: SKIPPED, no Chrome here to open the game in');
  process.exit(0);
}
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--allow-file-access-from-files', '--window-size=640,360'] });
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Opens the game at this address and plays until `done` says so of what has been seen (or `most` seconds have gone by
 * since the game first answered: a cold start can take several seconds, and that is not his not moving).
 */
async function play(hash, done = () => false, most = 12) {
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 360, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${file}#${hash}`);
  const seen = [];
  const sum = () => {
    const first = seen[0];
    const far = first ? Math.max(...seen.map((s) => Math.hypot(s.x - first.x, s.z - first.z))) : 0;
    const high = first ? Math.max(...seen.map((s) => s.y - first.y)) : 0;
    return { seen, errors, far, high, states: new Set(seen.map((s) => s.state)), first };
  };
  const giveUp = Date.now() + 40000;
  let until = 0;
  while (Date.now() < giveUp) {
    const s = await page.evaluate(() => (window.__probe ? window.__probe() : null)).catch(() => null);
    if (s) {
      seen.push(s);
      if (!until) until = Date.now() + most * 1000;
      if (done(sum()) || Date.now() > until) break;
    }
    await wait(60);
  }
  await page.close();
  return sum();
}
const quiet = 'nostory&nosound';

{
  const r = await play(`level=standin&${quiet}&autopad=2:N,2:U+`, (q) => q.far > 3);
  check('the game opens and the knight is there', r.seen.length > 3 && r.first?.room === 'standin' && r.first.as === null, `${r.seen.length} looks at him`);
  check('THE KNIGHT WALKS when the stick is pushed', r.far > 3, `went ${r.far.toFixed(1)}`);
  check('...with no error on the page', r.errors.length === 0, r.errors[0] ?? '');
}
{
  const r = await play(`level=standin&${quiet}&autopad=2:J,2:H+`, (q) => q.high > 1.2);
  check('the knight jumps', r.high > 1.2, `rose ${r.high.toFixed(1)}`);
}
{
  const r = await play(`level=standin&${quiet}&autopad=2:A,2.6:A,3.2:A`, (q) => q.states.has('attack'));
  check('the knight swings his sword', r.states.has('attack'), [...r.states].join(' '));
}
{
  const r = await play(`level=hall&${quiet}&autopad=2:N,2:U+`, (q) => q.far > 3);
  check('in the Hall (where the game starts) the knight walks', r.first?.room === 'hall' && r.far > 3 && r.errors.length === 0, `went ${r.far.toFixed(1)}${r.errors[0] ? `, ${r.errors[0]}` : ''}`);
}
for (const who of ['bramble', 'vix', 'jinx']) {
  const r = await play(`level=standin&${quiet}&as=${who}&autopad=2:N,2:U+`, (q) => q.far > 2 && q.seen.some((x) => x.as === who));
  check(`played as ${who}, the character moves`, r.seen.some((s) => s.as === who) && r.far > 2 && r.errors.length === 0, `went ${r.far.toFixed(1)}${r.errors[0] ? `, ${r.errors[0]}` : ''}`);
}
{
  // (As the owner opens it: no address at all. It must come up without an error.)
  const r = await play('', () => false, 5);
  check('opened with no address, as the owner opens it: no error on the page', r.errors.length === 0, r.errors[0] ?? '');
}
if (process.argv.includes('--rooms')) {
  // EVERY ROOM (asked for with --rooms: it takes a few minutes): each opens, with no error, and he can move in it
  // (the stick pushed each way in turn: he starts facing a wall in some).
  const page = await browser.newPage();
  await page.goto(`file://${file}#level=hall&${quiet}`);
  let rooms = [];
  for (let k = 0; k < 200 && !rooms.length; k++) {
    rooms = await page.evaluate(() => (window.__rooms ? window.__rooms() : [])).catch(() => []);
    await wait(100);
  }
  await page.close();
  check('the game says which rooms it has', rooms.length > 30, `${rooms.length} rooms`);
  const bad = [];
  for (const id of rooms) {
    const r = await play(`level=${id}&${quiet}&autopad=2:N,2:U+,3.2:E,4.4:S,5.6:W`, (q) => q.far > 1, 9);
    const why = r.errors[0] ?? (r.first?.room !== id ? `opened ${r.first?.room ?? 'nothing'}` : r.far <= 1 ? `he went only ${r.far.toFixed(1)}` : '');
    if (why) bad.push(`${id}: ${why}`);
  }
  check(`every room opens with no error, and the knight can move in it (${rooms.length} rooms)`, bad.length === 0, bad.join('; '));
}
if (process.argv.includes('--doors')) {
  // THE HALL'S DOORS (asked for with --doors): he is set down in each door of the Hall in turn; he must arrive in the
  // room it leads to, with no error; then, set down in that room's way out (if it is open: a room with goals keeps
  // it shut till they are done), he must be back in the Hall.
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${file}#level=hall&${quiet}`);
  const probe = () => page.evaluate(() => (window.__probe ? window.__probe() : null)).catch(() => null);
  const until = async (ok, secs = 25) => {
    const end = Date.now() + secs * 1000;
    while (Date.now() < end) {
      const s = await probe();
      if (s && ok(s)) return s;
      await wait(100);
    }
    return null;
  };
  await until((s) => s.room === 'hall' && !s.busy, 40);
  const hall = await page.evaluate(() => window.__doors());
  check('the Hall says where its doors are', hall.doors.length > 20, `${hall.doors.length} doors`);
  const bad = [];
  let shut = 0;
  let back = 0;
  for (const d of hall.doors) {
    if (!d.to || !d.open) {
      bad.push(`${d.to ?? 'a door to nowhere'}: not open`);
      continue;
    }
    await until((s) => s.room === 'hall' && !s.busy);
    await page.evaluate((q) => window.__put(q.x, q.y, q.z), d);
    const there = await until((s) => s.room === d.to && !s.busy);
    if (!there) {
      bad.push(`${d.to}: never arrived (${(await probe())?.room}, ${(await probe())?.busy || 'free'})`);
      await page.goto(`file://${file}#level=hall&${quiet}`);
      await page.reload();
      continue;
    }
    const room = await page.evaluate(() => window.__doors());
    if (room.exit.wayOut && room.exit.cleared) {
      await page.evaluate((q) => window.__put(q.x, q.y, q.z), room.exit);
      const home = await until((s) => s.room === 'hall' && !s.busy);
      if (home) back++;
      else bad.push(`${d.to}: its way out did not lead back to the Hall (${(await probe())?.room})`);
    } else {
      shut++;
      await page.goto(`file://${file}#level=hall&${quiet}`);
      await page.reload();
    }
  }
  await page.close();
  check(`every door in the Hall leads to its room (${hall.doors.length}), and each room's open way out leads back (${back}; ${shut} are shut till their goals are done)`, bad.length === 0 && errors.length === 0, [...bad, ...errors.slice(0, 2)].join('; '));
}
await browser.close();
console.log(failures ? `\nsmoke: ${failures} FAILED` : '\nsmoke: all passed');
process.exit(failures ? 1 : 0);
