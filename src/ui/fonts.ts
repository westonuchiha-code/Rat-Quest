/**
 * THE FONTS: every typeface the game uses is named HERE and nowhere else.
 *
 * The owner, 2026-11-17: "even things like fonts may change in the future so they all need to be well organized, kept
 * track of and easily replaceable."
 *
 * TO CHANGE A FONT: change its line below. Everything written in CSS reads it as a variable (`var(--rq-font-game)`),
 * and everything drawn on a canvas reads `FONTS.game` directly. To use a font FILE (a .woff2), add it to the project,
 * declare it in `FONT_FACES` below, and put its family name first in the line it replaces.
 *
 * NOT HERE: the block letters on door signs and boards in the world. Those are drawn dot by dot from the game's own
 * 5 by 7 letter shapes (render/pixelFont.ts): to change them, change the shapes there.
 * A test (tests/assets.ts) fails if a font is named anywhere else in the game's code.
 */
export const FONTS = {
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
export type FontName = keyof typeof FONTS;

/** Font files to load, if any: `@font-face` rules, written out in full. (None yet: every font above is one the device has.) */
export const FONT_FACES: string[] = [];

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
