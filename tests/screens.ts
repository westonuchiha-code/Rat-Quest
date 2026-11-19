// The old-screen filters (scanlines, old TV, VHS, green handheld) are measured from the screen, now that the picture
// under them is a sharp one: a television's 240 lines and a handheld's 144 dots down it, each a whole number of the
// screen's own dots, and none too fine to see.
import { screenMeasures, HANDHELD_GREENS, FILTERS } from '../src/ui/display';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const whole = (v: number, dpr: number): boolean => Math.abs(v * dpr - Math.round(v * dpr)) < 1e-6;
const screens: Array<[string, number, number]> = [['a desk screen, 1080 high', 1080, 1], ['a phone on its side', 412, 2.625], ['a small window', 620, 1], ['a 4K screen', 1080, 2], ['a tablet', 768, 2], ['a very small window', 300, 1]];
{
  const bad = screens.filter(([, h, d]) => {
    const m = screenMeasures(h, d);
    return ![m.line, m.mask, m.cell, m.gap].every((v) => whole(v, d));
  });
  check('every line, stripe and dot is a whole number of the screen\'s own dots, on every screen', bad.length === 0, bad.map((b) => b[0]).join(', '));
  const fine = screens.filter(([, h, d]) => {
    const m = screenMeasures(h, d);
    return m.line * d < 3 || m.mask * d < 3 || m.cell * d < 3 || m.gap * d < 1;
  });
  check(
    'none is too fine to see: a line three screen dots or more, a handheld\'s dot three or more with a gap of one or more',
    fine.length === 0,
    fine.map((b) => b[0]).join(', ')
  );
  const desk = screenMeasures(1080, 1);
  const phone = screenMeasures(412, 2.625);
  check(
    'a desk screen 1080 high has about 240 lines and 144 handheld dots down it',
    Math.abs(1080 / desk.line - 240) <= 30
      && Math.abs(1080 / desk.cell - 144) <= 10,
    `${(1080 / desk.line).toFixed(0)} lines, ${(1080 / desk.cell).toFixed(0)} dots`
  );
  check(
    'and so has a phone on its side, though its own dots are far smaller',
    Math.abs(412 / phone.line - 240) <= 36
      && Math.abs(412 / phone.cell - 144) <= 12,
    `${(412 / phone.line).toFixed(0)} lines of ${(phone.line * 2.625).toFixed(0)} screen dots each; ${(412 / phone.cell).toFixed(0)} handheld dots`
  );
  check('the gap between a handheld\'s dots is thinner than the dot', screens.every(([, h, d]) => screenMeasures(h, d).gap < screenMeasures(h, d).cell / 2));
}
{
  const lum = HANDHELD_GREENS.map((c) => 0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255));
  const steps = lum.slice(1).map((l, i) => l - lum[i]);
  check(
    'a handheld has four greens, dark to light, each plainly lighter than the last',
    HANDHELD_GREENS.length === 4
      && steps.every((s) => s > 35),
    steps.map((s) => s.toFixed(0)).join(', ')
  );
  check('the filters to choose from are as they were: off, scanlines, old TV, VHS, green handheld', FILTERS.join() === 'off,scanlines,crt,vhs,green');
}
console.log(failures === 0 ? '\nOld-screen checks passed.' : `\n${failures} old-screen check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
