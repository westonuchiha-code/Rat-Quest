// Still pictures of the running game, one for each address given.
//   node scripts/film/stills.mjs <out-prefix> "<hash>" ["<hash>" ...]
// A hash is what follows # in the address: "level=hall", "level=toybox&at=0,0,-20,3.14", "level=hall&eye=-50,5,5&look=-44,2.5,-7".
// The game must be being served: `npx vite --port 5199` (or BASE=http://... for a built copy).
// CHROME=<path> if Chrome is not at /usr/bin/google-chrome.
import puppeteer from 'puppeteer-core';
const [prefix, ...hashes] = process.argv.slice(2);
const base = process.env.BASE ?? 'http://localhost:5199/';
const wait = (t) => new Promise((r) => setTimeout(r, t));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1100,620'] });
for (let i = 0; i < hashes.length; i++) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 620, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${base}#${hashes[i]}&nostory&nosound`);
  await wait(Number(process.env.WAIT ?? 5200));
  await page.screenshot({ path: `${prefix}-${i}.png` });
  await page.close();
}
await browser.close();
