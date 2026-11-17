// A FILM of the running game, as numbered pictures (join them with cut.sh).
//   node scripts/film/film.mjs <out-dir> <pictures> "<hash>" [skip]
// It uses the game's film mode (`&film=4` is added): the game waits for each picture to be taken, so the film is even
// and true to the game's own time whatever the machine. A picture every 4 frames of sixty: 15 a second.
// The first `skip` pictures (default 20: the level coming in) are thrown away.
// Aids for the address (see main.ts): &autoride (the dream's rides), &autoride=pipe, &autofight, &autowalk=x,z,
// &autojump, &god, &at=x,y,z,cameraYaw, &eye=x,y,z&look=x,y,z, &chase=dx,dy,dz.
// The game must be being served: build it (`npx vite build --outDir <dir>`) and serve that folder on port 5198,
// or BASE=http://... CHROME=<path> if Chrome is not at /usr/bin/google-chrome.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [out, frames, hash, skipArg] = process.argv.slice(2);
const skip = Number(skipArg ?? 20);
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=960,540'] });
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 540, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${process.env.BASE ?? 'http://localhost:5198/'}#${hash}&film=4&nostory&nosound`);
const t0 = Date.now();
for (let i = -skip; i < Number(frames); i++) {
  await page.waitForFunction(() => window.__filmReady === true, { timeout: 120000, polling: 30 });
  if (i >= 0) await page.screenshot({ path: `${out}/f-${String(i).padStart(4, '0')}.png` });
  await page.evaluate(() => window.__filmGo());
}
console.log(out, 'done:', frames, 'pictures in', Math.round((Date.now() - t0) / 1000), 's');
await browser.close();
