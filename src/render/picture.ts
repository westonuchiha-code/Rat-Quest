/**
 * How big the game's own picture is, and how it is stretched to the screen. Logic only, so it runs in tests.
 *
 * The game draws a small picture and stretches it: that is its look. But stretched by a number that is not whole
 * (240 rows onto a 1080 screen is four and a half times), some of its dots come out four screen dots wide and some
 * five, and everything fine in it (a brick wall far off, lettering) crawls and garbles. (The owner, 2026-11-16: "i
 * know we are going for a retro ps1, n64 look but a lot of the quality seems kind of bad and a little garbled on a pc
 * screen".) So: EVERY DOT OF THE PICTURE IS A WHOLE NUMBER OF SCREEN DOTS, the same number each way. The picture has
 * at least `rows` rows (its sharpness: his choice, in the settings), and as few more as that takes.
 */
export type Sharp = 'chunky' | 'crisp' | 'sharp' | 'hd';
export const SHARPS: readonly Sharp[] = ['chunky', 'crisp', 'sharp', 'hd'];
/**
 * WHAT THE GAME STARTS AT: HD, the screen's own dots, nothing stretched. The owner, 2026-11-16, shown the others:
 * "honestly lets just go for the hd one, even stretched a little bit makes it look bad. we can get the retro look
 * from overlay options and the like". (The overlays are the FILTER setting: scanlines, old TV, VHS. The chunkier
 * pictures are still there to be chosen.)
 */
export const SHARP_DEFAULT: Sharp = 'hd';
/** The least rows the picture has, at each sharpness. Chunky is the size it always was: a PlayStation's. */
/** (HD asks for 1080: on a screen of up to twice that it is the screen's own dots; on a 4K one, two to a dot.) */
export const SHARP_ROWS: Record<Sharp, number> = { chunky: 240, crisp: 360, sharp: 480, hd: 1080 };
export const SHARP_LABEL: Record<Sharp, string> = { chunky: 'CHUNKY (PS1)', crisp: 'CRISP', sharp: 'SHARP', hd: 'HD' };
/** What the game is set to just now (ui/display.ts sets it; main.ts reads it when it sizes the picture). */
export const PICTURE = { rows: SHARP_ROWS[SHARP_DEFAULT] };

export interface PictureSize {
  /** The picture: how many dots across and down. */
  iw: number;
  ih: number;
  /** How many screen dots each of its dots is, each way: a whole number. */
  n: number;
  /** How big it is drawn, in the page's own units: never smaller than the box (it may run a hair over, and is cropped). */
  cssW: number;
  cssH: number;
}

/**
 * The picture for a box `w` by `h` (the page's units) on a screen with `dpr` screen dots to a unit, with at least
 * `rows` dots along its shorter side.
 */
export function pictureSize(w: number, h: number, rows: number, dpr = 1): PictureSize {
  const W = Math.max(1, Math.round(w * dpr));
  const H = Math.max(1, Math.round(h * dpr));
  const n = Math.max(1, Math.floor(Math.min(W, H) / rows));
  const iw = Math.ceil(W / n);
  const ih = Math.ceil(H / n);
  return { iw, ih, n, cssW: (iw * n) / dpr, cssH: (ih * n) / dpr };
}
