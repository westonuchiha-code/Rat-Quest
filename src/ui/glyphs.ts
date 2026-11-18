/**
 * Button prompts. Names and little button pictures ("chips") for the pad in his hands (Xbox, PlayStation, Switch, Steam
 * Deck) or the keyboard, whichever he used last, so every hint on screen matches what he is holding.
 *
 * Which pad: the pad's own name, unless the machine knows better (Steam shows every pad as an Xbox pad, but can tell us
 * it is a DualSense or the Deck: see setPadKindOverride in controls.ts), unless the player picked a set in the options.
 */
import { gamepadInfo, PadButton, PadKind } from '../core/controls';
import { input } from '../core/input';
import { bindings, BindAction } from '../core/bindings';

const PS: Record<PadButton, string> = {
  south: '✕', east: '○', west: '□', north: '△', l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', select: 'SHARE', start: 'OPTIONS', l3: 'L3', r3: 'R3', up: 'D-PAD ▲', down: 'D-PAD ▼', left: 'D-PAD ◀', right: 'D-PAD ▶',
};
const XBOX: Record<PadButton, string> = {
  south: 'A', east: 'B', west: 'X', north: 'Y', l1: 'LB', r1: 'RB', l2: 'LT', r2: 'RT', select: 'VIEW', start: 'MENU', l3: 'LS', r3: 'RS', up: 'D-PAD ▲', down: 'D-PAD ▼', left: 'D-PAD ◀', right: 'D-PAD ▶',
};
// Nintendo puts A on the right and B on the bottom, so the labels follow the printed letters.
const NINTENDO: Record<PadButton, string> = {
  south: 'B', east: 'A', west: 'Y', north: 'X', l1: 'L', r1: 'R', l2: 'ZL', r2: 'ZR', select: '−', start: '+', l3: 'L3', r3: 'R3', up: 'D-PAD ▲', down: 'D-PAD ▼', left: 'D-PAD ◀', right: 'D-PAD ▶',
};
// The Steam Deck: Xbox letters in Xbox places, but its shoulders are printed L1/R1 and L2/R2.
const DECK: Record<PadButton, string> = {
  south: 'A', east: 'B', west: 'X', north: 'Y', l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', select: 'VIEW', start: 'MENU', l3: 'L3', r3: 'R3', up: 'D-PAD ▲', down: 'D-PAD ▼', left: 'D-PAD ◀', right: 'D-PAD ▶',
};
const GENERIC: Record<PadButton, string> = {
  south: 'BOTTOM BTN', east: 'RIGHT BTN', west: 'LEFT BTN', north: 'TOP BTN', l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', select: 'SELECT', start: 'START', l3: 'L3', r3: 'R3', up: 'D-PAD ▲', down: 'D-PAD ▼', left: 'D-PAD ◀', right: 'D-PAD ▶',
};
const TABLES: Record<PadKind, Record<PadButton, string>> = { playstation: PS, xbox: XBOX, nintendo: NINTENDO, deck: DECK, generic: GENERIC };

// ---- Which set of names, and which device ----

/** The player's choice in the options: AUTO, or always one set of pictures. */
export type GlyphMode = 'auto' | 'xbox' | 'playstation' | 'nintendo' | 'deck';
export const GLYPH_MODES: GlyphMode[] = ['auto', 'xbox', 'playstation', 'nintendo', 'deck'];
export const GLYPH_MODE_NAMES: Record<GlyphMode, string> = { auto: 'AUTO', xbox: 'XBOX', playstation: 'PLAYSTATION', nintendo: 'SWITCH', deck: 'STEAM DECK' };
const MODE_KEY = 'ratquest.glyphs';

export type Device = 'keyboard' | 'pad' | 'touch';

const settings: { mode: GlyphMode; defaultDevice: Device; storage: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null } = {
  mode: 'auto',
  defaultDevice: 'touch',
  storage: null,
};

/** Reads the saved choice. Call once at start. */
export function loadGlyphMode(storage: { getItem(k: string): string | null; setItem(k: string, v: string): void } | null): void {
  settings.storage = storage;
  try {
    const v = storage?.getItem(MODE_KEY) as GlyphMode | null;
    if (v && GLYPH_MODES.includes(v)) settings.mode = v;
  } catch {
    /* no saved choice */
  }
}
export function glyphMode(): GlyphMode {
  return settings.mode;
}
export function setGlyphMode(m: GlyphMode): void {
  settings.mode = m;
  try {
    settings.storage?.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}
/** What to show before he has touched anything: the phone test shows the touch pad's names, the desktop the keyboard, the Deck its pad. */
export function setDefaultDevice(d: Device): void {
  settings.defaultDevice = d;
}

/** Steam Input's name for a controller (steamworks.js InputType) as one of our kinds; null when it does not say. */
export function kindForSteamType(t: string | null): PadKind | null {
  if (!t) return null;
  if (/SteamDeck|SteamController/.test(t)) return 'deck';
  if (/^PS\d/.test(t)) return 'playstation';
  if (/Switch/.test(t)) return 'nintendo';
  if (/XBox/i.test(t)) return 'xbox';
  return null;
}

/** What the options row says for the current choice ("AUTO (XBOX)"). */
export function glyphModeLabel(): string {
  const names: Record<PadKind, string> = { xbox: 'XBOX', playstation: 'PLAYSTATION', nintendo: 'SWITCH', deck: 'STEAM DECK', generic: 'PLAIN' };
  return settings.mode === 'auto' ? `AUTO (${lastDevice() === 'keyboard' && !gamepadInfo.connected ? 'KEYBOARD' : names[labelKind()]})` : GLYPH_MODE_NAMES[settings.mode];
}

/** The set of button names in use right now. */
export function labelKind(): PadKind {
  if (settings.mode !== 'auto') return settings.mode;
  // No pad yet: the on-screen test pad is PlayStation-shaped; on the Deck the default device is its pad.
  return gamepadInfo.kind ?? (settings.defaultDevice === 'pad' ? 'deck' : 'playstation');
}

/** The name of a pad button on this kind of pad. Unknown pads get position names. */
export function padLabel(b: PadButton, kind: PadKind | null = labelKind()): string {
  return TABLES[kind ?? 'playstation'][b];
}

/** A short name for a keyboard code: KeyJ is J, ShiftLeft is L-SHIFT. */
export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM ' + code.slice(6).toUpperCase();
  const map: Record<string, string> = {
    Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Tab: 'TAB', Backspace: 'BKSP',
    Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'ESC', Enter: 'ENTER', Delete: 'DEL', PageUp: 'PG UP', PageDown: 'PG DN',
  };
  return map[code] ?? code.toUpperCase();
}

/** Which device was used last. Before any key or button, the default for this machine. */
export function lastDevice(): Device {
  const k = input.lastKeyAt();
  const p = gamepadInfo.lastAt;
  if (k === 0 && p === 0) return gamepadInfo.connected ? 'pad' : settings.defaultDevice;
  return p > k && gamepadInfo.connected ? 'pad' : 'keyboard';
}

/** Changes whenever the prompts on screen would change (another device, another pad, another choice in the options). */
export function promptStamp(): string {
  return `${lastDevice()}|${labelKind()}|${settings.mode}`;
}

// ---- Chips: the little button pictures ----

/** Things a prompt can be for: a game action (follows the player's bindings) or a fixed menu button. */
export type PromptAction = BindAction | 'confirm' | 'back' | 'tabPrev' | 'tabNext' | 'menu' | 'respawn' | 'move' | 'look' | 'nav';
// The fixed buttons (controls.ts FIXED_ACTIONS) and their keys.
const FIXED: Record<'confirm' | 'back' | 'tabPrev' | 'tabNext' | 'menu' | 'respawn', { pad: PadButton; key: string }> = {
  confirm: { pad: 'south', key: 'Enter' },
  back: { pad: 'east', key: 'Escape' },
  tabPrev: { pad: 'l1', key: 'KeyQ' },
  tabNext: { pad: 'r1', key: 'KeyE' },
  menu: { pad: 'start', key: 'Escape' },
  respawn: { pad: 'select', key: 'KeyR' },
};

const PS_SHAPES: Partial<Record<PadButton, string>> = {
  south: '<path d="M2.4 2.4L7.6 7.6M7.6 2.4L2.4 7.6"/>',
  east: '<circle cx="5" cy="5" r="2.9"/>',
  west: '<rect x="2.3" y="2.3" width="5.4" height="5.4"/>',
  north: '<path d="M5 1.9L8.2 7.4H1.8Z"/>',
};
const FACE: PadButton[] = ['south', 'east', 'west', 'north'];
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A chip for one pad button on a kind of pad. */
export function padChip(b: PadButton, kind: PadKind = labelKind()): string {
  if (FACE.includes(b)) {
    if (kind === 'playstation') {
      return `<b class="rqg rqg-face rqg-ps-${b}" aria-label="${PS[b]}"><svg viewBox="0 0 10 10">${PS_SHAPES[b]}</svg></b>`;
    }
    const label = TABLES[kind][b];
    return `<b class="rqg rqg-face${kind === 'generic' ? ' rqg-wide' : ''} rqg-${kind}-${b}">${esc(label)}</b>`;
  }
  return `<b class="rqg rqg-bar">${esc(TABLES[kind][b])}</b>`;
}
/** A keycap. */
export function keyChip(code: string): string {
  return `<b class="rqg rqg-key">${esc(code.startsWith('#') ? code.slice(1) : keyLabel(code))}</b>`;
}
const stick = (side: 'L' | 'R'): string => `<b class="rqg rqg-stick">${side}</b>`;

/** The chip for an action on the device in use (touch shows the test pad's PlayStation names). */
export function prompt(a: PromptAction, device: Device = lastDevice()): string {
  const kind: PadKind = device === 'touch' && settings.mode === 'auto' ? 'playstation' : labelKind();
  if (a === 'move' || a === 'look' || a === 'nav') {
    if (device === 'keyboard') return keyChip(a === 'move' ? '#WASD' : a === 'look' ? '#ARROWS' : '#↑↓');
    return stick(a === 'look' ? 'R' : 'L');
  }
  const fixed = (FIXED as Record<string, { pad: PadButton; key: string }>)[a];
  const pad = fixed ? fixed.pad : bindings.pad(a as BindAction);
  const key = fixed ? fixed.key : bindings.key(a as BindAction);
  return device === 'keyboard' ? keyChip(key) : padChip(pad, kind);
}

/** One prompt from ready-made chips and a word. */
export function pair(chips: string, word: string): string {
  return `<span class="rqg-pair">${chips}<span>${esc(word)}</span></span>`;
}

/** A row of prompts: each is one or more chips and a word ("[A] choose  [B] back"). */
export function helpLine(items: Array<[PromptAction | PromptAction[], string]>, device: Device = lastDevice()): string {
  return items
    .map(([a, word]) => `<span class="rqg-pair">${(Array.isArray(a) ? a : [a]).map((x) => prompt(x, device)).join('')}<span>${esc(word)}</span></span>`)
    .join('');
}

const CSS = `
.rqg { display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; height: 1.7em; min-width: 1.7em; padding: 0 0.4em; margin: 0 0.1em;
  border-radius: 0.45em; background: #15171c; color: #eef0f4; border: 0.1em solid #646a76; font: 800 max(13px, 0.8em)/1 var(--rq-font-label); letter-spacing: 0.02em;
  vertical-align: middle; text-shadow: none; white-space: nowrap; box-shadow: 0 0.08em 0 #000a; }
.rqg-face, .rqg-stick { width: 1.7em; padding: 0; border-radius: 50%; }
.rqg-face.rqg-wide { width: auto; padding: 0 0.5em; border-radius: 0.85em; }
.rqg-face svg { width: 1.05em; height: 1.05em; fill: none; stroke: currentColor; stroke-width: 1.35; stroke-linecap: round; stroke-linejoin: round; }
.rqg-stick { background: radial-gradient(circle, #2d323b 0 52%, #15171c 54%); }
.rqg-key { background: #e6e1cf; color: #1e1c15; border: 0.08em solid #8f8873; border-bottom-width: 0.24em; border-radius: 0.32em; }
.rqg-ps-south { color: #8fb8ff; } .rqg-ps-east { color: #ff7d7d; } .rqg-ps-west { color: #f39fe0; } .rqg-ps-north { color: #5fe0b4; }
.rqg-xbox-south { color: #7bd97b; } .rqg-xbox-east { color: #ff6b6b; } .rqg-xbox-west { color: #72b2ff; } .rqg-xbox-north { color: #ffd84f; }
.rqg-pair { display: inline-flex; align-items: center; gap: 0.3em; margin: 0 0.9em; white-space: nowrap; }
`;
let cssIn = false;
/** Puts the chip styles on the page (once). */
export function ensureGlyphCss(): void {
  if (cssIn || typeof document === 'undefined' || !document.head) return;
  cssIn = true;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
}
