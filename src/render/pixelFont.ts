/**
 * A small block-letter alphabet, five dots wide and seven high: for writing that is part of the world (a sign over a
 * door) and so is seen through the game's own coarse picture. Each dot of a letter is one dot of the thing it is
 * painted on; the thing is then made big enough that a dot of it is a dot of the screen from where he will read it.
 * (Smooth lettering shrunk to a few dots high cannot be read: the owner, 2026-11-16, of the Club's door signs: "text
 * on signs in game are unreadable".) Capitals, figures and a few marks. Logic only, so it runs in tests.
 */
const GLYPHS: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '/': ['00001', '00001', '00010', '00100', '01000', '10000', '10000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00100', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  // (A small cross, for "times": x 12.)
  x: ['00000', '00000', '10001', '01010', '00100', '01010', '10001'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};
/** A letter's height, and how far one letter starts from the last (its five dots and a gap). */
export const GLYPH_H = 7;
export const GLYPH_ADVANCE = 6;

const glyphOf = (ch: string): string[] => GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS['?'];

/** How many dots wide a line of writing is. */
export function textWidth(text: string): number {
  return text.length ? text.length * GLYPH_ADVANCE - 1 : 0;
}
/** Whether a character has a letter of its own here (others are drawn as a question mark). */
export function hasGlyph(ch: string): boolean {
  return !!(GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()]);
}

/** Writes a line with its top left dot at (x, y): `dot` is called for every dot that is ink. */
export function drawText(text: string, x: number, y: number, dot: (x: number, y: number) => void): void {
  [...text].forEach((ch, i) => {
    const g = glyphOf(ch);
    for (let r = 0; r < GLYPH_H; r++) for (let c = 0; c < 5; c++) if (g[r][c] === '1') dot(x + i * GLYPH_ADVANCE + c, y + r);
  });
}

/**
 * Breaks a name into lines no longer than `max` letters, at its spaces, as few lines as will do (and as even as
 * they can be made: "THE GREAT / CISTERN", not "THE GREAT CISTERN" run off the board).
 */
export function wrapText(text: string, max: number): string[] {
  const words = text.trim().split(/\s+/);
  if (text.length <= max) return [text.trim()];
  let best: string[] | null = null;
  // (Two lines: try every place to break, and keep the most even that fits. Three, the same way, if two will not.)
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    if (a.length > max || b.length > max) continue;
    if (!best || Math.abs(a.length - b.length) < Math.abs(best[0].length - best[1].length)) best = [a, b];
  }
  if (best) return best;
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > max) {
      lines.push(line);
      line = w;
    } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines.map((l) => l.slice(0, max));
}
