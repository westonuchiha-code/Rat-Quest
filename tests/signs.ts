// The wooden sign boards of the Move Garden and the test rooms are written in the block letters of render/pixelFont.ts,
// as the door signs are: a dot of a letter is a square dot of the board, the first line twice the size where there is
// room, and no line shrunk to fit. (The owner, of the door signs: "text on signs in game are unreadable".)
import { LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { boardPixels } from '../src/world/signs';
import { GLYPH_H, hasGlyph, textWidth } from '../src/render/pixelFont';
import type { Decor } from '../src/world/layout';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
type Sign = Extract<Decor, { kind: 'sign' }>;
const everyone = [...LEVELS, ...TEST_ROOMS];
const boards = everyone.flatMap((l) => (l.decor ?? []).filter((d): d is Sign => d.kind === 'sign').map((d) => ({ l: l.id, d })));
const says = (b: { l: string; d: Sign }): string => `${b.l}: ${b.d.lines.join(' / ')}`;

check('there are boards to check, and the garden has most of them', boards.length >= 15 && boards.filter((b) => b.l === 'garden').length >= 10, `${boards.length} boards in ${new Set(boards.map((b) => b.l)).size} places`);

const noGlyph = boards.filter((b) => !b.d.lines.every((l) => [...l.toUpperCase()].every(hasGlyph)));
check('every letter and mark on every board is one the block letters have (a comma and a colon were added for them)', noGlyph.length === 0 && hasGlyph(',') && hasGlyph(':'), noGlyph.map(says).join('; '));

const tooMany = boards.filter((b) => b.d.lines.length > 4 || b.d.lines.length === 0);
check('a board has one to four lines (four since a room\'s title board says its number too, 2026-11-18), and every one of them is drawn', tooMany.length === 0 && boards.every((b) => boardPixels(b.d.lines, b.d.w, b.d.h).lines.length === b.d.lines.length), tooMany.map(says).join('; '));

// The picture: its shape, its dots, its ink.
const INK_FIRST = [0xff, 0xf0, 0xc0];
const INK_REST = [0xec, 0xd9, 0xb4];
const inkBox = (p: ReturnType<typeof boardPixels>): { x0: number; x1: number; y0: number; y1: number; n: number } => {
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = (y * p.w + x) * 4;
    const is = (c: number[]): boolean => p.data[i] === c[0] && p.data[i + 1] === c[1] && p.data[i + 2] === c[2];
    if (!is(INK_FIRST) && !is(INK_REST)) continue;
    n++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, x1, y0, y1, n };
};
const made = boards.map((b) => ({ ...b, p: boardPixels(b.d.lines, b.d.w, b.d.h) }));
const badShape = made.filter(({ d, p }) => Math.abs(p.w / d.w / (p.h / d.h) - 1) > 0.06);
check('a dot of a letter is a square dot of the board: the picture has the board\'s own shape', badShape.length === 0, badShape.map((b) => `${says(b)} ${b.p.w}x${b.p.h} on ${b.d.w}x${b.d.h}`).join('; '));

const cut = made.filter(({ p }) => {
  const k = inkBox(p);
  return k.n === 0 || k.x0 < 3 || k.y0 < 3 || k.x1 > p.w - 4 || k.y1 > p.h - 4;
});
check('all of a board\'s writing is on the board, clear of its edge', cut.length === 0, cut.map(says).join('; '));

const wide = made.filter(({ p }) => Math.max(textWidth(p.lines[0]) * p.big, ...p.lines.slice(1).map((l) => textWidth(l))) > p.w - 8);
check('no line is wider than its board', wide.length === 0, wide.map(says).join('; '));

// How big the writing is in the room: a small letter's height, in units (the knight is about 1.2 tall).
const small = (b: (typeof made)[number]): number => (b.d.h / b.p.h) * GLYPH_H;
const tiny = made.filter((b) => small(b) < 0.12);
const least = made.reduce((a, b) => (small(b) < small(a) ? b : a));
check('the smallest writing on any board is a tenth of the knight\'s height or more', tiny.length === 0, `smallest: ${small(least).toFixed(2)} high, "${least.d.lines[least.d.lines.length - 1]}" in ${least.l}`);
const doubled = made.filter((b) => b.p.big === 2).length;
check('most boards have room for a first line at twice the size', doubled >= made.length * 0.6, `${doubled} of ${made.length}`);

// One board, dot for dot.
{
  const p = boardPixels(['GRIND', 'JUMP, THEN STOW'], 3.2, 1.5);
  const k = inkBox(p);
  check('GRIND / JUMP, THEN STOW: the first line double, the second single and the wider of the two', p.big === 2 && textWidth('JUMP, THEN STOW') > textWidth('GRIND') * 2 && k.x1 - k.x0 + 1 === textWidth('JUMP, THEN STOW'), `${p.w}x${p.h} dots, writing ${k.x1 - k.x0 + 1} wide`);
  const lower = boardPixels(['grind', 'jump, then stow'], 3.2, 1.5);
  check('a board is written in capitals whatever it was given', lower.data.every((v, i) => v === p.data[i]));
  const again = boardPixels(['GRIND', 'JUMP, THEN STOW'], 3.2, 1.5);
  check('the same board is the same picture every time', again.data.every((v, i) => v === p.data[i]));
  const one = boardPixels(['8'], 1, 0.8);
  check('a one-figure marker is a big figure in the middle of its board', one.big === 2 && Math.abs((inkBox(one).x0 + inkBox(one).x1 + 1) / 2 - one.w / 2) <= 1 && Math.abs((inkBox(one).y0 + inkBox(one).y1 + 1) / 2 - one.h / 2) <= 1.5, `${one.w}x${one.h}`);
}

console.log(failures === 0 ? '\nSign board checks passed.' : `\n${failures} sign board check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
