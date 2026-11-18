/**
 * THE FONTS: every typeface the game uses is named HERE and nowhere else.
 *
 * The owner, 2026-11-17: "even things like fonts may change in the future so they all need to be well organized, kept
 * track of and easily replaceable."
 *
 * TO CHANGE A FONT: change its line below. Everything written in CSS reads it as a variable (`var(--rq-font-game)`),
 * and everything drawn on a canvas reads `FONTS.game` directly. To use a font FILE (a .woff2, .woff, .ttf or .otf),
 * drop it into assets/fonts/ named for the line (`title.woff2`) and run `npm run assets`: it goes first in that line.
 *
 * NOT HERE: the block letters on door signs and boards in the world. Those are drawn dot by dot from the game's own
 * 5 by 7 letter shapes (render/pixelFont.ts): to change them, change the shapes there.
 * A test (tests/assets.ts) fails if a font is named anywhere else in the game's code.
 */
import { DROPPED } from '../assets/dropped';

const OWN_FONTS = {
  /** The game's own lettering: the HUD, the menus, the talk box, the shop, the photo mode. */
  game: 'ui-monospace, Menlo, Consolas, monospace',
  /** Big headings: the title screen, the save-file screen. */
  title: "Impact, 'Arial Black', 'Trebuchet MS', sans-serif",
  /** Small print on the title and save-file screens, and the letters on the button pictures (A, B, L1...). */
  label: "'Trebuchet MS', Arial, sans-serif",
  /** The name under the studio's mark as the game starts. */
  logo: "Georgia, 'Times New Roman', serif",
  /** The workshop's tools (the level builder, Tweaks): plain text for reading. */
  tools: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;
export type FontName = keyof typeof OWN_FONTS;

/**
 * A FONT FILE DROPPED IN (assets/fonts/, named for its line: `title.woff2`; assets/README.md) is packed into the game
 * by `npm run assets`, given a family of its own, and put FIRST in its line: the others stay after it, for any
 * letter the file has not got.
 */
const droppedFamily = (k: FontName): string => `rq-dropped-${k}`;
/** The font lines, and the @font-face rules for the files, with these dropped in (DROPPED.fonts: tests give their own). */
export function fontTable(drop: typeof DROPPED.fonts = DROPPED.fonts): { fonts: Record<FontName, string>; faces: string[] } {
  const keys = Object.keys(OWN_FONTS) as FontName[];
  return {
    fonts: Object.fromEntries(keys.map((k) => [k, drop[k] ? `'${droppedFamily(k)}', ${OWN_FONTS[k]}` : OWN_FONTS[k]])) as Record<FontName, string>,
    faces: keys.flatMap((k) => {
      const f = drop[k];
      return f ? [`@font-face { font-family: '${droppedFamily(k)}'; src: url(data:${f.mime};base64,${f.b64}) format('${f.format}'); font-display: block; }`] : [];
    }),
  };
}
const TABLE = fontTable();
export const FONTS: Record<FontName, string> = TABLE.fonts;
/** Font files to load: an `@font-face` rule for each dropped in, written out in full (the file inside it). */
export const FONT_FACES: string[] = TABLE.faces;

/** The CSS that gives every font its variable. */
export function fontCss(): string {
  const vars = (Object.keys(FONTS) as FontName[]).map((k) => `--rq-font-${k}: ${FONTS[k]};`).join(' ');
  return `${FONT_FACES.join('\n')}\n:root { ${vars} }`;
}

/** Puts the fonts' variables on the page (once). Called as the game and the builder start; safe where there is no page. */
export function installFonts(): void {
  if (typeof document === 'undefined' || document.getElementById('rq-fonts')) return;
  const style = document.createElement('style');
  style.id = 'rq-fonts';
  style.textContent = fontCss();
  document.head.appendChild(style);
}
installFonts();
