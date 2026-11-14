// Steam Deck screen check: opens each screen of the game at 1280x800 and reports the smallest text on it.
// usage: npm run check:deck   (or node scripts/deck-check.mjs <html file> [outdir])
// Env: W/H screen size (1280x800), MIN smallest allowed text (13px: Valve asks for 9px-tall letters at 1280x800),
// SCREENS name:hash,..., SEED=deck|auto (button pictures, plus two saved games), PAD="<pad id>" (a pretend controller),
// CHROME path to Chrome. Needs puppeteer-core (a dev dependency) and Chrome.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.argv[2] ?? 'dist-single/ratquest-nopad.html');
const out = process.argv[3] ?? '/tmp/deck';
fs.mkdirSync(out, { recursive: true });
const W = Number(process.env.W ?? 1280), H = Number(process.env.H ?? 800);
const SCREENS = (process.env.SCREENS ?? 'hud:level=hub&nostory,menu0:level=hub&nostory&menu0,menu1:level=hub&nostory&menu1,menu2:level=cistern&nostory&menu2,menu3:level=hub&nostory&menu3,menu4:level=hub&nostory&menu4,menu5:level=hub&nostory&menu5,shop:level=hub&nostory&shop,talk:level=hub&nostory&talk,photo:level=hub&nostory&photo,title:boot&title,files:boot&files')
  .split(',').map((s) => { const i = s.indexOf(':'); return { name: s.slice(0, i), hash: s.slice(i + 1) }; });
const MIN = Number(process.env.MIN ?? 13);

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: W, height: H },
});
let worst = Infinity;
let fails = 0;
let errorsSeen = 0;
for (const s of SCREENS) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message ?? e)));
  // PAD: a pretend controller with that name (it taps L3 once at the start, so the game sees a pad in use).
  if (process.env.PAD) await page.evaluateOnNewDocument((id) => {
    const t0 = performance.now();
    const pad = { id, index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], vibrationActuator: null,
      get buttons() { const b = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })); const t = performance.now() - t0; if (t > 2500 && t < 2700) b[10] = { pressed: true, touched: true, value: 1 }; return b; } };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad, null, null, null] });
  }, process.env.PAD);
  // SEED: Deck button pictures, and two saved games, so the file screen has something on it.
  if (process.env.SEED) await page.evaluateOnNewDocument((glyphs) => {
    localStorage.setItem('ratquest.glyphs', glyphs);
    const save = (lv, at) => JSON.stringify({ x: 0, y: 0, z: 0, facing: 0, cameraYaw: 0, hp: 5, savedAt: at, levelId: lv });
    localStorage.setItem('ratquest.autosave.v1', save('hollows', Date.now() - 3600e3));
    localStorage.setItem('ratquest.stickers.v1', JSON.stringify(Array.from({ length: 17 }, (_, i) => `wedge:x:${i}`)));
    localStorage.setItem('ratquest.meta.v1', JSON.stringify({ played: 11520 }));
    localStorage.setItem('ratquest.f3.autosave.v1', save('keep', Date.now() - 86400e3));
    localStorage.setItem('ratquest.f3.stickers.v1', JSON.stringify(Array.from({ length: 38 }, (_, i) => `wedge:x:${i}`)));
    localStorage.setItem('ratquest.f3.meta.v1', JSON.stringify({ played: 34800 }));
  }, process.env.SEED);
  await page.goto(`file://${file}#${s.hash}`);
  await new Promise((r) => setTimeout(r, Number(process.env.WAIT ?? 3500)));
  if (process.env.KEYS) for (const k of process.env.KEYS.split(' ')) { await page.keyboard.press(k); await new Promise((r) => setTimeout(r, 250)); }
  const found = await page.evaluate(() => {
    const res = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = n.textContent.trim();
      if (!t) continue;
      const el = n.parentElement;
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      const r = range.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) continue;
      // Hidden by an ancestor (opacity 0 or display none somewhere up the tree)?
      let a = el, gone = false;
      while (a) { const c = getComputedStyle(a); if (c.display === 'none' || c.opacity === '0' || c.visibility === 'hidden') { gone = true; break; } a = a.parentElement; }
      if (gone) continue;
      // The size it is drawn at: font-size times any CSS scale on the way up.
      let scale = 1;
      for (let p = el; p; p = p.parentElement) { const tr = getComputedStyle(p).transform; if (tr && tr !== 'none') { const m = tr.match(/matrix\(([^,]+),([^,]+)/); if (m) scale *= Math.hypot(Number(m[1]), Number(m[2])); } }
      res.push({ t: t.slice(0, 40), px: parseFloat(cs.fontSize) * scale, cls: (el.className && typeof el.className === 'string' ? el.className : el.tagName).slice(0, 40) });
    }
    return res;
  });
  found.sort((a, b) => a.px - b.px);
  const min = found.length ? found[0].px : Infinity;
  worst = Math.min(worst, min);
  const small = found.filter((f) => f.px < MIN);
  if (small.length) fails++;
  errorsSeen += errors.length;
  console.log(`${small.length ? 'SMALL' : 'ok   '} ${s.name.padEnd(7)} min ${min.toFixed(1)}px, ${found.length} texts${errors.length ? `, ERRORS: ${errors.join(' | ').slice(0, 200)}` : ''}`);
  for (const f of small.slice(0, Number(process.env.SHOW ?? 6))) console.log(`        ${f.px.toFixed(1)}px  "${f.t}"  (${f.cls})`);
  await page.screenshot({ path: `${out}/${s.name}.png` });
  await page.close();
}
await browser.close();
console.log(`smallest anywhere: ${worst.toFixed(1)}px; screens with text under ${MIN}px: ${fails}`);
process.exit(fails || errorsSeen ? 1 : 0);
