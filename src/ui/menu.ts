/**
 * The pause menu: a row of screens you flip through with L1 / R1 (ITEMS, EQUIP, QUEST, SAVE), each laid out
 * as a stone-and-brass panel over a dimmed picture of the game. Gear lives in grids, so it can hold a lot
 * more than a few slots. It works with a pad (directions, confirm, back, L1 / R1) and by tapping.
 */
import { ITEMS, ItemDef, Slot } from '../data/equipment';
import { CONSUMABLES } from '../data/consumables';
import type { Equipment } from '../player/equipment';
import type { Inventory } from '../player/inventory';
import { capIcon, crumbIcon, doorIcon, heartIcon, itemIcon, lockIcon, nachoIcon, relicIcon, tabIcon, wedgeIcon } from './icons';
import { doorWords, type DoorState } from '../levels/junction';
import { ensureGlyphCss, helpLine, prompt } from './glyphs';
import type { RumbleLevel } from '../core/rumble';

export interface QuestInfo {
  name: string;
  goals: Array<{ label: string; text: string; done: boolean }>;
  collectibles: Array<{ label: string; icon: 'crumb' | 'cap' | 'relic'; have: number; total: number }>;
}

export interface LevelRow {
  id: string;
  name: string;
  blurb: string;
  cleared: boolean;
  perfect: boolean;
  current: boolean;
  /** Not open yet: the level before it has not been cleared. */
  locked?: boolean;
  /** On the world map: home, a world (its main area), or an area inside a world (shown indented). */
  kind?: 'home' | 'world' | 'area';
  /** Why it is locked, e.g. "Needs 4 Golden Wedges". */
  lockText?: string;
  /** Golden Wedges here (a world counts every area in it). */
  wedges?: { got: number; of: number };
  /** Each wedge in this area, for the details. */
  wedgeList?: Array<{ name: string; got: boolean }>;
  /** A world: the door in the Club that leads to it, what it asks and how near he is. */
  door?: DoorState;
  /** Home: every door in the Club, in the order they hang there. */
  doors?: DoorState[];
}

/** One sticker in the book. Not found yet means a dark shape and question marks. */
export interface StickerRow {
  id: string;
  group: string;
  name: string;
  blurb: string;
  found: boolean;
  /** A ready-made little picture (SVG text). */
  icon: string;
}

export type MenuKey = 'left' | 'right' | 'up' | 'down' | 'tabPrev' | 'tabNext' | 'confirm' | 'back';

export interface MenuHost {
  equipment: Equipment;
  /** The usable things he carries (ITEMS screen). */
  inventory: Inventory;
  /** Uses one carried item. Returns a message for the screen, or null if it could not be used. */
  useItem(id: string): string | null;
  /** What this level asks for, and its bonus collectibles, for the quest screen. */
  quest(): QuestInfo;
  /** The sticker book: everything there is to find, found or not. */
  book?(): StickerRow[];
  /** Every level, for the level list. */
  levels(): LevelRow[];
  /** Goes to a level (starting it fresh). */
  goLevel(id: string): void;
  health(): { hp: number; max: number };
  save(): boolean;
  load(): boolean;
  /** When the game was last saved (milliseconds since 1970), or null. */
  savedAt(): number | null;
  /** Starts everything over (for testing). */
  restart(): void;
  /** Optional: window controls for the desktop build. */
  fullscreen?(): boolean;
  toggleFullscreen?(): void;
  /** Opens the level builder. */
  openBuilder?(): void;
  openTweaks?(): void;
  /** The Workshop: every development tool in one place. */
  openWorkshop?(): void;
  /** Opens photo mode. */
  openPhoto?(): void;
  /** Sound and music volumes, 0..1. When given, the SAVE screen shows two volume rows. */
  audio?: { sfx(): number; music(): number; setSfx(v: number): void; setMusic(v: number): void };
  /** Controller rumble: off, low or full. When given, the SAVE screen shows a RUMBLE row. */
  rumble?: { level(): RumbleLevel; set(l: RumbleLevel): void };
  /** The save file being played, for the SAVE screen's card. */
  fileInfo?(): { file: number; where: string; wedges: number; total: number; played: string };
  /** Saves and goes back to the title screen (to change save files). */
  toTitle?(): void;
  /** False while the menu is open over the title screen (OPTIONS): no game is chosen yet, so nothing to save or load. */
  inGame?(): boolean;
  /** More options shown as rows on the SAVE screen. Selecting (or left/right) calls change. */
  extras?: Array<{ id: string; label(): string; change(dir: 1 | -1): void }>;
  /** Key and button rebinding. When given, CONTROLS on the SAVE screen opens the rebind list. */
  rebind?: {
    rows(): Array<{ id: string; name: string; key: string; pad: string }>;
    reset(): void;
    /** Text describing what the main controls do right now, for the info card. */
    summary(): string;
  };
  /** A short sound for a menu action, if the game has sound. */
  sound?(name: 'move' | 'ok' | 'back'): void;
  /** Closes the game. Only given in the desktop build. */
  quit?(): void;
  /** Called when the menu opens or closes. */
  onToggle(open: boolean): void;
  /** A live picture of the rat for the equipment screen. Optional. */
  preview?: { canvas: HTMLElement; tick(dt: number): void };
  /** Shows an item on the preview before it is worn, or null to show what he is wearing. */
  previewItem?(item: ItemDef | null): void;
}

const SCREENS = ['ITEMS', 'EQUIP', 'QUEST', 'SAVE', 'WORLDS', 'BOOK'] as const;
const TAB_ICONS = ['items', 'equip', 'quest', 'save', 'levels', 'book'] as const;
const BOOK_COLS = 6;
const SLOTS: Slot[] = ['helmet', 'scarf', 'sword', 'shield'];
const SLOT_NAMES: Record<Slot, string> = { helmet: 'Helmet', scarf: 'Scarf', sword: 'Sword', shield: 'Shield' };
const EQUIP_COLS = 5;
const ITEM_COLS = 6;
const ITEM_SLOTS = 18; // the grid always shows this many squares, filled from the left

const CSS = `
/* Designed wide first, like the game. Sizes scale with the height of the game picture (cqh), so the same layout
   works at 1280x720 and on a small landscape screen. A tall, narrow picture falls back to one column. */
.rq-menu { position: absolute; inset: 0; z-index: 40; display: none; container-type: size;
  background: radial-gradient(ellipse at 50% -20%, #2a3b2eee 0%, #090d0af6 72%); backdrop-filter: blur(3px);
  color: #efe9d2; font-family: ui-monospace, Menlo, Consolas, monospace; line-height: 1.35; user-select: none;
  -webkit-user-select: none; touch-action: manipulation; box-sizing: border-box; }
.rq-menu * { box-sizing: border-box; }
.rq-menu.open { display: block; }
.rq-frame { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(100cqw, 177.78cqh); height: min(100cqh, 56.25cqw); font-size: calc(min(100cqw, 177.78cqh) / 58); overflow: hidden; display: grid; grid-template-rows: auto auto 1fr auto; gap: 0.6em; padding: 0.8em 1.2em; }
.rq-nav { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.8em; }
.rq-left { display: flex; align-items: center; gap: 1.2em; }
.rq-hearts { display: flex; gap: 0.15em; }
.rq-hearts svg { width: 1.3em; height: 1.3em; }
.rq-center { display: flex; align-items: center; gap: 0.6em; }
.rq-side { display: flex; align-items: center; gap: 0.5em; padding: 0.45em 0.8em; border-radius: 0.7em; background: #141b14;
  border: 2px solid #34402f; color: #8e9c80; font-size: 0.85em; font-weight: 700; letter-spacing: 1px; cursor: pointer; white-space: nowrap; }
.rq-side.r { justify-self: end; }
.rq-key { padding: 0.05em 0.45em; border-radius: 0.4em; background: #34402f; color: #cfe0b8; font-size: 0.85em; }
.rq-title { display: flex; align-items: center; gap: 0.6em; padding: 0.4em 1.6em; border-radius: 0.8em; font-weight: 800; letter-spacing: 0.25em;
  color: #ffe9a0; font-size: 1.25em; background: linear-gradient(#3b4a33, #232d1f); border: 2px solid #c9a24a;
  box-shadow: 0 0 1em #c9a24a44, inset 0 1px 0 #ffffff22; }
.rq-title svg, .rq-dot svg { width: 1.2em; height: 1.2em; }
.rq-dots { display: flex; gap: 0.35em; }
.rq-dot { width: 2.1em; height: 1.7em; display: flex; align-items: center; justify-content: center; border-radius: 0.5em; color: #6f7c62;
  background: #131913; border: 2px solid #2b3527; cursor: pointer; }
.rq-dot.on { color: #ffe9a0; border-color: #c9a24a; background: #2a3624; }
.rq-panel { min-height: 0; overflow: hidden; padding: 1em 1.2em; border-radius: 1em; position: relative;
  background: linear-gradient(#242d21, #161c14); border: 3px solid #566649;
  box-shadow: 0 0 0 2px #0b0e0a, inset 0 0 0 2px #0009, inset 0 0 2em #000a; }
.rq-panel.slide-l { animation: rq-slide-l 0.22s ease-out; }
.rq-panel.slide-r { animation: rq-slide-r 0.22s ease-out; }
@keyframes rq-slide-l { from { transform: translateX(-3em); opacity: 0.2; } }
@keyframes rq-slide-r { from { transform: translateX(3em); opacity: 0.2; } }
.rq-cols { display: grid; gap: 1.2em; height: 100%; min-height: 0; }
.rq-cols.items { grid-template-columns: 1.55fr 1fr; }
.rq-cols.equip { grid-template-columns: 0.95fr 0.8fr 1.5fr; }
.rq-cols.two { grid-template-columns: 1.2fr 1fr; }
.rq-col { display: flex; flex-direction: column; min-height: 0; min-width: 0; }
.rq-scroll { overflow-y: auto; min-height: 0; padding: 0.4em; margin: -0.4em; }
.rq-h { color: #ffe9a0; font-weight: 800; letter-spacing: 0.15em; font-size: 0.85em; margin: 0 0 0.6em; display: flex; justify-content: space-between; }
.rq-h span { color: #9aa68a; font-weight: 400; letter-spacing: 0; }
.rq-grid { display: grid; grid-template-columns: repeat(var(--cols, 6), 1fr); gap: 0.55em; align-content: start; }
.rq-tile { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 0.7em;
  background: radial-gradient(#202a1e, #0f140e); border: 2px solid #3a4636; cursor: pointer; transition: transform 0.1s; }
.rq-tile svg { width: 64%; height: auto; }
.rq-tile.sel { border-color: #ffe27a; transform: scale(1.08); box-shadow: 0 0 0 2px #0009, 0 0 1em #ffe27a77; z-index: 1; }
.rq-tile.sel::before, .rq-tile.sel::after { content: ''; position: absolute; width: 0.8em; height: 0.8em; border: 3px solid #ffe27a; }
.rq-tile.sel::before { top: -0.4em; left: -0.4em; border-right: none; border-bottom: none; border-radius: 0.3em 0 0 0; }
.rq-tile.sel::after { bottom: -0.4em; right: -0.4em; border-left: none; border-top: none; border-radius: 0 0 0.3em 0; }
.rq-tile.locked { opacity: 0.5; }
.rq-tile.empty { opacity: 0.45; cursor: default; }
.rq-badge { position: absolute; right: 0.25em; top: 0.25em; min-width: 1.2em; height: 1.2em; padding: 0 0.2em; border-radius: 0.6em; background: #3f9a52;
  color: #fff; font-size: 0.8em; font-weight: 800; line-height: 1.2em; text-align: center; border: 1px solid #0007; }
.rq-detail { display: flex; flex-direction: column; gap: 0.6em; padding: 0.9em; border-radius: 0.9em; background: #0d120c; border: 2px solid #2f3a2b; flex: 1; min-height: 0; overflow: auto; }
.rq-detail .ic { align-self: center; width: 28%; min-width: 3.6em; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 0.8em; background: #1a2218; }
.rq-detail .ic svg { width: 70%; height: auto; }
.rq-detail b { color: #ffe9a0; font-size: 1.15em; }
.rq-detail .fx { display: flex; flex-direction: column; gap: 0.25em; margin: 0; }
.rq-detail .fx .up { color: #9fe08a; }
.rq-detail .fx .down { color: #f08a7a; }
.rq-detail .tag { display: inline-block; margin-left: 0.5em; padding: 0 0.5em; border-radius: 0.5em; font-size: 0.75em; background: #3f9a52; color: #fff; }
.rq-detail .tag.try { background: #b98a14; }
.rq-detail p { margin: 0; color: #c9d2b8; }
.rq-detail small { color: #8e9c80; }
.rq-prev { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; border-radius: 0.9em; padding: 0.5em;
  background: radial-gradient(ellipse at 50% 75%, #34442f, #0b100a); border: 2px solid #3a4636; }
.rq-prev canvas { height: 100%; width: auto; max-width: 100%; aspect-ratio: 176 / 224; }
.rq-cats { display: flex; flex-direction: column; gap: 0.5em; justify-content: center; height: 100%; }
.rq-cat { display: flex; align-items: center; gap: 0.7em; padding: 0.55em 0.7em; border-radius: 0.8em; background: #121811; border: 2px solid #2f3a2b; cursor: pointer; }
.rq-cat.on { background: #243020; border-color: #7f9a5e; }
.rq-cat.sel { border-color: #ffe27a; box-shadow: 0 0 0.9em #ffe27a66; }
.rq-cat .ic { width: 2.2em; height: 2.2em; flex: none; display: flex; align-items: center; justify-content: center; }
.rq-cat .ic svg { width: 100%; height: auto; }
.rq-cat .n { font-weight: 700; }
.rq-cat .w { display: block; font-size: 0.75em; color: #8e9c80; font-weight: 400; }
.rq-q { display: flex; align-items: center; gap: 0.9em; padding: 0.7em 0.3em; border-bottom: 1px solid #2f3a2b; }
.rq-q .ic { flex: none; width: 2em; }
.rq-q .ic svg { width: 100%; height: auto; }
.rq-q .body { flex: 1; }
.rq-q .cnt { color: #ffe9a0; font-weight: 700; }
.rq-bar { height: 0.55em; border-radius: 0.3em; background: #0b0f0a; border: 1px solid #2f3a2b; overflow: hidden; margin-top: 0.4em; }
.rq-bar i { display: block; height: 100%; background: linear-gradient(#ffe27a, #c9a24a); }
.rq-btn { display: flex; align-items: center; justify-content: center; padding: 0.9em 1em; margin-bottom: 0.7em; border-radius: 0.8em; font-weight: 800;
  letter-spacing: 0.1em; background: linear-gradient(#34442d, #232d1f); border: 2px solid #566649; cursor: pointer; }
.rq-btn.sel { border-color: #ffe27a; box-shadow: 0 0 1em #ffe27a77; color: #ffe9a0; }
.rq-rb { display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.45em; }
.rq-rbn { flex: 1; font-weight: 800; color: #d8e0c8; }
.rq-key { min-width: 5.5em; text-align: center; padding: 0.55em 0.6em; border-radius: 0.7em; background: #0d120c; border: 2px solid #2f3a2b; font-weight: 800; }
.rq-key.sel { border-color: #ffe27a; box-shadow: 0 0 1em #ffe27a77; color: #ffe9a0; }
.rq-book { display: flex; flex-wrap: wrap; gap: 0.7em; align-content: flex-start; }
.rq-sg { flex: 0 0 100%; font-weight: 800; letter-spacing: 0.08em; color: #cdbb88; display: flex; justify-content: space-between; margin-top: 0.3em; border-bottom: 2px solid #3a3326; }
.rq-sg span { font-weight: 600; opacity: 0.7; }
.rq-sticker { width: 4.6em; height: 4.6em; display: flex; align-items: center; justify-content: center; background: #efe6c8; border-radius: 0.9em;
  border: 3px solid #fffbe8; box-shadow: 0 2px 0 #0007, 0 0 0 2px #0005; transform: rotate(var(--tilt, 0deg)); cursor: pointer; }
.rq-sticker svg { width: 78%; height: auto; }
.rq-sticker.unknown { background: #2c2a26; border-color: #4a463c; }
.rq-sticker.unknown b { font-size: 1.8em; color: #6a655a; }
.rq-sticker.sel { transform: rotate(var(--tilt, 0deg)) scale(1.14); box-shadow: 0 0 0 2px #0009, 0 0 1em #ffe27a99; border-color: #ffe27a; z-index: 1; }
.rq-unk { font-size: 2.4em; font-weight: 800; color: #6a655a; }
.rq-btn.dim { opacity: 0.4; }
.rq-acts.tighter .rq-btn { padding: 0.4em 1em; margin-bottom: 0.3em; }
.rq-acts.tight .rq-btn { padding: 0.6em 1em; margin-bottom: 0.45em; }
.rq-btn.warn { border-color: #8a4a3a; }
.rq-card { padding: 1em; border-radius: 0.9em; background: #0d120c; border: 2px solid #2f3a2b; margin-bottom: 0.8em; }
.rq-card .big { color: #ffe9a0; font-weight: 800; font-size: 1.15em; margin-bottom: 0.3em; }
.rq-check { width: 1.3em; height: 1.3em; border-radius: 0.3em; border: 2px solid #566649; text-align: center; line-height: 1.1em; color: #fff; }
.rq-check.done { background: #3f9a52; border-color: #3f9a52; }
.rq-lv { display: flex; align-items: center; gap: 0.8em; padding: 0.55em 0.8em; margin-bottom: 0.4em; border-radius: 0.8em; background: #121811; border: 2px solid #2f3a2b; cursor: pointer; }
.rq-lv .no { width: 1.8em; color: #8e9c80; font-weight: 700; }
.rq-lv .nm { flex: 1; font-weight: 700; }
.rq-lv.locked .nm, .rq-lv.locked .no { opacity: 0.45; }
.rq-lv.here { background: #243020; border-color: #7f9a5e; }
.rq-lv.sel { border-color: #ffe27a; box-shadow: 0 0 0.9em #ffe27a66; }
.rq-lv.area { margin-left: 1.6em; padding: 0.4em 0.8em; }
.rq-lv.home { background: #2a2216; border-color: #6a5430; }
.rq-lv .wg { display: flex; align-items: center; gap: 0.25em; color: #ffe27a; font-weight: 700; }
.rq-lv .need { display: flex; align-items: center; gap: 0.3em; color: #a9b496; font-weight: 700; }
.rq-lv .need svg { opacity: 0.8; }
/* A door of the Club: its name, what it asks, a bar for how near he is. */
.rq-doors { display: flex; flex-direction: column; gap: 0.4em; }
.rq-door { display: flex; flex-direction: column; gap: 0.15em; padding: 0.4em 0.65em 0.5em; border-radius: 0.7em; background: #141b12; border: 1px solid #2f3a2b; }
.rq-door .top { display: flex; align-items: center; gap: 0.5em; font-weight: 700; }
.rq-door .top .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rq-door .top .cost { display: flex; align-items: center; gap: 0.25em; color: #ffe27a; white-space: nowrap; }
.rq-door.shut .top .nm { color: #c9d2b8; }
.rq-door.open .top .cost { color: #9fe08a; }
.rq-door .rq-bar { margin-top: 0.15em; }
.rq-door.open .rq-bar i { background: linear-gradient(#b6ec9c, #5fa64a); }
.rq-door p { font-size: 0.9em; }
/* In the list of all the Club's doors each is two thin lines with no box round it: its name and what it asks, and the
   bar under them. (Four of them, and the rest of the card, must fit a small screen.) */
.rq-doors { gap: 0.3em; font-size: 0.92em; }
.rq-door.row { background: none; border: none; border-radius: 0; padding: 0; gap: 0.05em; }
.rq-door.row .rq-bar { height: 0.42em; margin-top: 0; }
.rq-doorlist { display: flex; flex-direction: column; gap: 0.35em; }
.rq-detail .tag.door { background: #2c4a26; color: #c8f0b4; display: inline-flex; align-items: center; gap: 0.25em; vertical-align: middle; }
.rq-detail .rq-h { margin: 0.2em 0 0; }
.rq-wl { margin: 0.5em 0 0; padding: 0; list-style: none; }
.rq-wl li { display: flex; align-items: center; gap: 0.45em; padding: 0.15em 0; }
.rq-wl li.no { color: #9a9a88; }
.rq-star { color: #ffd23a; } .rq-ok { color: #6fd08a; }
.rq-msg { min-height: 1.4em; margin-top: 0.4em; color: #9fe3a8; }
.rq-help { text-align: center; color: #7f8c72; font-size: 0.75em; }
`;

function consumableIcon(id: string, size: number): string {
  return id === 'nachoCheese' ? nachoIcon(size) : lockIcon(size);
}

function slotItems(slot: Slot): ItemDef[] {
  return Object.values(ITEMS).filter((i) => i.slot === slot);
}

export class Menu {
  private readonly root: HTMLDivElement;
  private open_ = false;
  private screen = 0;
  private bookIdx = 0;
  private slide: 'l' | 'r' | '' = '';
  /** Items screen cursor. */
  private itemIdx = 0;
  /** Equip screen: which slot, which tile, and whether the cursor is on the slot list or the grid. */
  private cat = 0;
  private tile = 0;
  private zone: 'cats' | 'grid' = 'cats';
  private saveRow = 0;
  /** Rebind list: open or not, which row and column (0 key, 1 pad), and a pending capture. */
  private rebinding = false;
  private rbRow = 0;
  private rbCol = 0;
  private capture: { id: string; col: 0 | 1 } | null = null;
  /** Level list cursor. */
  private levelIdx = 0;
  private message = '';
  private confirmRestart = false;
  private confirmQuit = false;

  constructor(parent: HTMLElement, private readonly host: MenuHost) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'rq-menu';
    parent.appendChild(this.root);
    this.root.addEventListener('pointerdown', (e) => this.onPointer(e));
    ensureGlyphCss();
  }

  /** Draws it again if it is open (the button prompts changed: another pad, or the keyboard). */
  refresh(): void {
    if (this.open_) this.render();
  }

  get open(): boolean {
    return this.open_;
  }

  toggle(): void {
    if (this.open_) this.close();
    else this.show();
  }

  show(): void {
    this.open_ = true;
    this.message = '';
    this.confirmRestart = false;
    this.confirmQuit = false;
    this.slide = '';
    this.zone = 'cats';
    const here = this.host.levels().findIndex((l) => l.current);
    if (here >= 0) this.levelIdx = here;
    this.root.classList.add('open');
    this.render();
    this.host.onToggle(true);
  }

  /** Loads the saved game (used by the title screen's CONTINUE). */
  loadGame(): boolean {
    return this.host.load();
  }

  /** Opens straight onto one of the screens (OPTIONS from the title opens SAVE). */
  showAt(screen: number): void {
    this.show();
    this.setScreen(screen);
  }

  close(): void {
    this.rebinding = false;
    this.capture = null;
    this.open_ = false;
    this.root.classList.remove('open');
    this.host.previewItem?.(null);
    this.host.onToggle(false);
  }

  /** Call every frame. Keeps the live preview of the rat moving. */
  update(dt: number): void {
    if (this.open_ && this.screen === 1) this.host.preview?.tick(dt);
  }

  /** A pad, keyboard or screen-tap command. */
  press(key: MenuKey): void {
    if (!this.open_) return;
    if (this.rebinding) return this.pressRebind(key);
    if (key === 'confirm') this.host.sound?.('ok');
    else if (key === 'back') this.host.sound?.('back');
    else this.host.sound?.('move');
    if (key === 'tabPrev') return this.setScreen(this.screen - 1);
    if (key === 'tabNext') return this.setScreen(this.screen + 1);
    if (key === 'back') return this.close();
    if (key === 'confirm') return this.activate();
    this.move(key);
  }

  // ---- Rebinding ----

  /** Development aid: opens the rebind list directly (#...&menu3&rebind). */
  debugRebind(): void {
    this.rebinding = true;
    this.render();
  }

  /** The action and column waiting for a new key or button, or null. The game reads the next press and calls finishCapture. */
  capturing(): { id: string; col: 0 | 1 } | null {
    return this.capture;
  }

  /** Ends a capture. `message` shows under the list (empty clears it). */
  finishCapture(message = ''): void {
    this.capture = null;
    this.message = message;
    this.host.sound?.(message ? 'back' : 'ok');
    this.render();
  }

  private pressRebind(key: MenuKey): void {
    if (this.capture) return; // the game is waiting for a key; menu presses are ignored
    const rows = this.host.rebind?.rows() ?? [];
    const n = rows.length + 2; // + RESET and BACK
    if (key === 'back') {
      this.rebinding = false;
      this.message = '';
      this.host.sound?.('back');
      return this.render();
    }
    this.host.sound?.(key === 'confirm' ? 'ok' : 'move');
    if (key === 'up') this.rbRow = Math.max(0, this.rbRow - 1);
    else if (key === 'down') this.rbRow = Math.min(n - 1, this.rbRow + 1);
    else if (key === 'left') this.rbCol = 0;
    else if (key === 'right') this.rbCol = 1;
    else if (key === 'confirm') return this.activateRebind();
    this.render();
  }

  private activateRebind(): void {
    const rows = this.host.rebind?.rows() ?? [];
    if (this.rbRow < rows.length) {
      this.capture = { id: rows[this.rbRow].id, col: this.rbCol as 0 | 1 };
      this.message = this.rbCol === 0 ? 'PRESS A KEY... (ESC TO CANCEL)' : 'PRESS A BUTTON ON YOUR CONTROLLER...';
    } else if (this.rbRow === rows.length) {
      this.host.rebind?.reset();
      this.message = 'Back to the default controls.';
    } else {
      this.rebinding = false;
      this.message = '';
    }
    this.render();
  }

  private rebindScreen(): string {
    const rows = this.host.rebind?.rows() ?? [];
    const cell = (r: number, c: number, text: string): string => {
      const on = r === this.rbRow && c === this.rbCol;
      const wait = on && this.capture;
      return `<span class="rq-key${on ? ' sel' : ''}" data-rb="${r}:${c}">${wait ? '...' : text}</span>`;
    };
    const list = rows
      .map((x, i) => `<div class="rq-rb"><span class="rq-rbn">${x.name}</span>${cell(i, 0, x.key)}${cell(i, 1, x.pad)}</div>`)
      .join('');
    const tail = (i: number, label: string): string => `<div class="rq-btn${this.rbRow === rows.length + i ? ' sel' : ''}" data-rb="${rows.length + i}:0">${label}</div>`;
    return `<div class="rq-cols two">
      <div class="rq-col"><div class="rq-h">REBIND<span>KEYBOARD · CONTROLLER</span></div><div class="rq-scroll">${list}${tail(0, 'RESET TO DEFAULTS')}${tail(1, 'DONE')}</div></div>
      <div class="rq-col"><div class="rq-h">CURRENT</div><div class="rq-card" style="line-height:1.7">${this.host.rebind?.summary() ?? ''}</div><div class="rq-msg">${this.message}</div></div></div>`;
  }

  // ---- Cursor movement ----

  private move(key: 'left' | 'right' | 'up' | 'down'): void {
    this.confirmRestart = false;
    this.confirmQuit = false;
    if (this.screen === 0) {
      const d = key === 'left' ? -1 : key === 'right' ? 1 : key === 'up' ? -ITEM_COLS : ITEM_COLS;
      this.itemIdx = Math.min(ITEM_SLOTS - 1, Math.max(0, this.itemIdx + d));
    } else if (this.screen === 1) {
      this.moveEquip(key);
    } else if (this.screen === 3) {
      const id = this.saveItems()[this.saveRow]?.id;
      if (key === 'up') this.saveRow = Math.max(0, this.saveRow - 1);
      else if (key === 'down') this.saveRow = Math.min(this.saveRows() - 1, this.saveRow + 1);
      else if ((id === 'sfx' || id === 'music') && this.host.audio) this.nudgeVolume(id, key === 'left' ? -1 : 1);
      else if (id === 'rumble' && this.host.rumble) this.toggleRumble(key === 'left' ? -1 : 1);
      else if (id?.startsWith('x:')) this.changeExtra(id, key === 'left' ? -1 : 1);
      else return this.setScreen(this.screen + (key === 'left' ? -1 : 1));
    } else if (this.screen === 5) {
      const n = this.host.book?.().length ?? 0;
      const d = key === 'left' ? -1 : key === 'right' ? 1 : key === 'up' ? -BOOK_COLS : BOOK_COLS;
      this.bookIdx = Math.min(Math.max(0, n - 1), Math.max(0, this.bookIdx + d));
    } else if (this.screen === 4) {
      const n = this.host.levels().length;
      if (key === 'up') this.levelIdx = Math.max(0, this.levelIdx - 1);
      else if (key === 'down') this.levelIdx = Math.min(n - 1, this.levelIdx + 1);
      else return this.setScreen(this.screen + (key === 'left' ? -1 : 1));
    } else {
      return this.setScreen(this.screen + (key === 'left' ? -1 : 1));
    }
    this.render();
  }

  private moveEquip(key: 'left' | 'right' | 'up' | 'down'): void {
    const n = slotItems(SLOTS[this.cat]).length;
    if (this.zone === 'cats') {
      if (key === 'up') this.cat = Math.max(0, this.cat - 1);
      else if (key === 'down') this.cat = Math.min(SLOTS.length - 1, this.cat + 1);
      else if (key === 'right') {
        this.zone = 'grid';
        this.tile = 0;
      }
      if (key === 'up' || key === 'down') this.tile = 0;
    } else {
      const col = this.tile % EQUIP_COLS;
      if (key === 'left') {
        if (col === 0) this.zone = 'cats';
        else this.tile--;
      } else if (key === 'right') this.tile = Math.min(n - 1, this.tile + 1);
      else if (key === 'up') {
        if (this.tile < EQUIP_COLS) this.zone = 'cats';
        else this.tile -= EQUIP_COLS;
      } else this.tile = Math.min(n - 1, this.tile + EQUIP_COLS);
    }
    this.updatePreview();
  }

  private updatePreview(): void {
    if (this.screen !== 1 || this.zone !== 'grid') return this.host.previewItem?.(null);
    const it = slotItems(SLOTS[this.cat])[this.tile];
    this.host.previewItem?.(it && this.host.equipment.owns(it.id) ? it : null);
  }

  private setScreen(i: number): void {
    const next = (i + SCREENS.length) % SCREENS.length;
    this.slide = next > this.screen || (this.screen === SCREENS.length - 1 && next === 0) ? 'r' : 'l';
    if (this.screen === 0 && next === SCREENS.length - 1) this.slide = 'l';
    this.screen = next;
    this.rebinding = false;
    this.capture = null;
    this.message = '';
    this.confirmRestart = false;
    this.confirmQuit = false;
    if (this.screen === 1) this.updatePreview();
    else this.host.previewItem?.(null);
    this.render();
  }

  // ---- Selecting ----

  private activate(): void {
    const eq = this.host.equipment;
    if (this.screen === 0) {
      const held = this.host.inventory.list()[this.itemIdx];
      if (held) this.message = this.host.useItem(held.id) ?? '';
      this.render();
    } else if (this.screen === 1) {
      if (this.zone === 'cats') {
        this.zone = 'grid';
        this.tile = 0;
        this.updatePreview();
        this.render();
        return;
      }
      const it = slotItems(SLOTS[this.cat])[this.tile];
      if (!it || !eq.owns(it.id)) this.message = 'You have not found that yet.';
      else if (eq.equip(it.id)) this.message = `${it.name} equipped.`;
      else this.message = 'Already wearing that.';
      this.render();
    } else if (this.screen === 4) {
      const lv = this.host.levels()[this.levelIdx];
      if (lv?.locked) {
        this.message = lv.lockText ?? 'Locked. Clear the level before it first.';
        this.render();
      } else if (lv) {
        this.host.goLevel(lv.id);
        return this.close();
      }
    } else if (this.screen === 3) {
      const id = this.saveItems()[this.saveRow]?.id;
      if (id === 'save') this.message = this.host.save() ? 'Game saved.' : 'Could not save on this device.';
      else if (id === 'load') {
        if (this.host.load()) return this.close();
        this.message = 'No saved game yet.';
      } else if (id === 'title') {
        this.close();
        this.host.toTitle?.();
        return;
      } else if (id === 'fullscreen') {
        this.host.toggleFullscreen?.();
        this.message = '';
      } else if (id === 'sfx' || id === 'music') {
        this.nudgeVolume(id, 1, true);
        return;
      } else if (id === 'rumble') {
        this.toggleRumble();
        return;
      } else if (id.startsWith('x:')) {
        this.changeExtra(id, 1);
        return;
      } else if (id === 'controls') {
        this.message = '';
        if (this.host.rebind) {
          this.rebinding = true;
          this.rbRow = 0;
          this.rbCol = 0;
        }
      } else if (id === 'builder') {
        this.host.openBuilder?.();
        return this.close();
      } else if (id === 'tweaks') {
        this.host.openTweaks?.();
        return this.close();
      } else if (id === 'workshop') {
        this.host.openWorkshop?.();
        return this.close();
      } else if (id === 'photo') {
        this.close();
        this.host.openPhoto?.();
        return;
      } else if (id === 'quit') {
        if (!this.confirmQuit) {
          this.confirmQuit = true;
          this.message = 'Unsaved progress is lost. Select again to quit.';
        } else this.host.quit?.();
      } else if (id === 'restart') {
        if (!this.confirmRestart) {
          this.confirmRestart = true;
          this.message = 'This resets gear and collectibles. Select again to confirm.';
        } else {
          this.confirmRestart = false;
          this.host.restart();
          return this.close();
        }
      }
      this.render();
    }
  }

  // ---- Drawing ----

  private render(): void {
    const h = this.host.health();
    const hearts = Array.from({ length: h.max }, (_, i) => heartIcon(i < h.hp, 20)).join('');
    const name = (i: number): string => SCREENS[(i + SCREENS.length) % SCREENS.length];
    const dots = SCREENS.map((_, i) => `<div class="rq-dot${i === this.screen ? ' on' : ''}" data-tab="${i}">${tabIcon(TAB_ICONS[i], 24)}</div>`).join('');

    let body = '';
    let help = helpLine([[['tabPrev', 'tabNext'], 'change screen'], ['nav', 'choose'], ['confirm', 'select'], ['back', 'close']]);
    if (this.screen === 0) body = this.itemsScreen();
    else if (this.screen === 1) {
      body = this.equipScreen();
      help = helpLine([['nav', 'pick a slot, then an item'], ['confirm', 'put it on'], [['tabPrev', 'tabNext'], 'change screen'], ['back', 'close']]);
    } else if (this.screen === 2) body = this.questScreen();
    else if (this.screen === 4) body = this.levelsScreen();
    else if (this.screen === 5) body = this.bookScreen();
    else body = this.saveScreen();

    const slide = this.slide ? ` slide-${this.slide}` : '';
    this.slide = '';
    this.root.innerHTML = `<div class="rq-frame">
      <div class="rq-nav">
        <div class="rq-left"><div class="rq-hearts">${hearts}</div></div>
        <div class="rq-center">
          <div class="rq-side" data-tab="${this.screen - 1 + SCREENS.length}">${prompt('tabPrev')}${name(this.screen - 1)}</div>
          <div class="rq-title">${tabIcon(TAB_ICONS[this.screen], 24)}${SCREENS[this.screen]}</div>
          <div class="rq-side" data-tab="${this.screen + 1}">${name(this.screen + 1)}${prompt('tabNext')}</div>
        </div>
        <div class="rq-dots" style="justify-self:end">${dots}</div>
      </div>
      <div></div>
      <div class="rq-panel${slide}">${body}</div>
      <div class="rq-help">${help}</div></div>`;
    // The live preview is one persistent canvas that gets moved into the freshly drawn page.
    const spot = this.root.querySelector?.('[data-preview]');
    if (spot && this.host.preview) spot.appendChild(this.host.preview.canvas);
    this.root.querySelector?.('.rq-lv.sel')?.scrollIntoView?.({ block: 'nearest' });
    this.root.querySelector?.('.rq-acts .rq-btn.sel')?.scrollIntoView?.({ block: 'nearest' });
  }

  private tile_(it: ItemDef, selected: boolean, attrs: string): string {
    const eq = this.host.equipment;
    const have = eq.owns(it.id);
    const worn = eq.equipped(it.slot) === it.id;
    return `<div class="rq-tile${selected ? ' sel' : ''}${have ? '' : ' locked'}" ${attrs}>${have ? itemIcon(it, 48) : lockIcon(44)}${worn ? '<div class="rq-badge">&#10003;</div>' : ''}</div>`;
  }

  private infoBox(it: ItemDef | undefined, previewing: boolean): string {
    const eq = this.host.equipment;
    if (!it) return '<div class="rq-detail"><small>Nothing here.</small></div>';
    if (!eq.owns(it.id)) return `<div class="rq-detail"><div class="ic">${lockIcon(48)}</div><b>? ? ?</b><p>You have not found this yet.</p></div>`;
    const worn = eq.equipped(it.slot) === it.id;
    const fx = it.perk || it.cost ? `<p class="fx"><span class="up">+ ${it.perk ?? ''}</span><span class="down">&minus; ${it.cost ?? ''}</span></p>` : '';
    const tag = worn ? '<span class="tag">worn</span>' : previewing ? `<span class="tag try">${prompt('confirm')} to wear</span>` : '';
    return `<div class="rq-detail"><div class="ic">${itemIcon(it, 64)}</div><div><b>${it.name}</b>${tag}</div><p>${it.description}</p>${fx}<small>${SLOT_NAMES[it.slot]}${fx ? '' : ' &middot; nothing special'}</small></div>`;
  }

  private itemsScreen(): string {
    const held = this.host.inventory.list();
    const tiles = Array.from({ length: ITEM_SLOTS }, (_, i) => {
      const h = held[i];
      const sel = i === this.itemIdx ? ' sel' : '';
      if (!h) return `<div class="rq-tile empty${sel}" data-item="${i}"></div>`;
      return `<div class="rq-tile${sel}" data-item="${i}">${consumableIcon(h.id, 48)}<div class="rq-badge">x${h.count}</div></div>`;
    }).join('');
    const cur = held[this.itemIdx];
    const def = cur ? CONSUMABLES[cur.id] : undefined;
    const detail = def
      ? `<div class="rq-detail"><div class="ic">${consumableIcon(def.id, 64)}</div><div><b>${def.name}</b><span class="tag">x${cur.count}</span></div><p>${def.description}</p><small>X  use it</small></div>`
      : `<div class="rq-detail"><small>${held.length ? 'Nothing here.' : 'You are not carrying anything yet. Try smashing a crate.'}</small></div>`;
    return `<div class="rq-cols items">
      <div class="rq-col"><div class="rq-h">ITEMS<span>${held.reduce((n, h) => n + h.count, 0)} carried</span></div><div class="rq-scroll"><div class="rq-grid" style="--cols:${ITEM_COLS}">${tiles}</div></div></div>
      <div class="rq-col"><div class="rq-h">DETAILS</div>${detail}<div class="rq-msg">${this.message}</div></div></div>`;
  }

  private equipScreen(): string {
    const eq = this.host.equipment;
    const cats = SLOTS.map((slot, i) => {
      const worn = ITEMS[eq.equipped(slot)];
      return `<div class="rq-cat${i === this.cat ? ' on' : ''}${i === this.cat && this.zone === 'cats' ? ' sel' : ''}" data-cat="${i}">
        <div class="ic">${itemIcon(worn, 40)}</div><div class="n">${SLOT_NAMES[slot]}<span class="w">${worn.name}</span></div></div>`;
    }).join('');
    const list = slotItems(SLOTS[this.cat]);
    const tiles = list.map((it, i) => this.tile_(it, this.zone === 'grid' && i === this.tile, `data-tile="${i}"`)).join('');
    const focus = this.zone === 'grid' ? list[this.tile] : ITEMS[eq.equipped(SLOTS[this.cat])];
    return `<div class="rq-cols equip">
      <div class="rq-col"><div class="rq-h">ADVENTURER</div><div class="rq-prev" data-preview></div></div>
      <div class="rq-col"><div class="rq-h">SLOTS</div><div class="rq-cats">${cats}</div></div>
      <div class="rq-col"><div class="rq-h">${SLOT_NAMES[SLOTS[this.cat]].toUpperCase()}S<span>${list.filter((i) => eq.owns(i.id)).length} / ${list.length}</span></div>
        <div class="rq-scroll" style="flex:none;max-height:45%"><div class="rq-grid" style="--cols:5">${tiles}</div></div>
        <div style="height:0.6em"></div>${this.infoBox(focus, this.zone === 'grid')}<div class="rq-msg">${this.message}</div></div></div>`;
  }

  private questScreen(): string {
    const q = this.host.quest();
    const icons = { crumb: crumbIcon(30), cap: capIcon(30), relic: relicIcon(30) };
    const goals = q.goals
      .map((g) => `<div class="rq-q"><div class="ic"><div class="rq-check${g.done ? ' done' : ''}">${g.done ? '&#10003;' : ''}</div></div><div class="body">${g.label}</div><div class="cnt">${g.text}</div></div>`)
      .join('');
    const rows = q.collectibles
      .filter((c) => c.total > 0)
      .map((c) => `<div class="rq-q"><div class="ic">${icons[c.icon]}</div><div class="body">${c.label}<div class="rq-bar"><i style="width:${c.total ? (100 * c.have) / c.total : 0}%"></i></div></div><div class="cnt">${c.have} / ${c.total}</div></div>`)
      .join('');
    const all = Object.values(ITEMS);
    const have = all.filter((i) => this.host.equipment.owns(i.id)).length;
    return `<div class="rq-cols two">
      <div class="rq-col"><div class="rq-h">MAIN GOALS<span>${q.name}</span></div><div class="rq-scroll">${goals}</div></div>
      <div class="rq-col"><div class="rq-h">BONUS<span>collect everything for a reward</span></div><div class="rq-scroll">${rows || '<small>Nothing extra here.</small>'}</div>
        <div class="rq-card" style="margin-top:0.8em"><div class="big">${have} / ${all.length}</div>Pieces of gear found
          <div class="rq-bar"><i style="width:${(100 * have) / all.length}%"></i></div></div></div></div>`;
  }

  private bookScreen(): string {
    const rows = this.host.book?.() ?? [];
    const cur = rows[this.bookIdx];
    let tiles = '';
    let lastGroup = '';
    rows.forEach((r, i) => {
      if (r.group !== lastGroup) {
        lastGroup = r.group;
        const inGroup = rows.filter((x) => x.group === r.group);
        tiles += `<div class="rq-sg">${r.group.toUpperCase()}<span>${inGroup.filter((x) => x.found).length} / ${inGroup.length}</span></div>`;
      }
      const tilt = ((i * 37) % 7) - 3;
      tiles += `<div class="rq-sticker${i === this.bookIdx ? ' sel' : ''}${r.found ? '' : ' unknown'}" style="--tilt:${tilt}deg" data-st="${i}">${r.found ? r.icon : '<b>?</b>'}</div>`;
    });
    const detail = !cur
      ? ''
      : cur.found
      ? `<div class="rq-detail"><div class="ic">${cur.icon}</div><div><b>${cur.name}</b><span class="tag">${cur.group}</span></div><p>${cur.blurb}</p></div>`
      : `<div class="rq-detail"><div class="ic"><span class="rq-unk">?</span></div><b>? ? ?</b><p>You have not found this yet.</p></div>`;
    const found = rows.filter((r) => r.found).length;
    return `<div class="rq-cols items">
      <div class="rq-col"><div class="rq-h">STICKER BOOK<span>${found} / ${rows.length} stuck in</span></div><div class="rq-scroll rq-book">${tiles}</div></div>
      <div class="rq-col"><div class="rq-h">DETAILS</div>${detail}</div></div>`;
  }

  private levelsScreen(): string {
    const lv = this.host.levels();
    const rows = lv
      .map((l, i) => {
        const wg = l.wedges && l.wedges.of ? `<span class="wg">${wedgeIcon(16, l.wedges.got > 0)}${l.wedges.got}/${l.wedges.of}</span>` : '';
        // A world behind a shut door shows how near he is to it; home shows how many of its doors are open.
        const shut = l.locked && l.door && !l.door.open ? `<span class="need">${lockIcon(18)}${wedgeIcon(14, l.door.have > 0)}${l.door.have}/${l.door.need}</span>` : '';
        const doors = l.doors?.length ? `<span class="wg">${doorIcon(18, true)}${l.doors.filter((d) => d.open).length}/${l.doors.length}</span>` : '';
        const mark = shut || doors || (l.locked ? lockIcon(18) : wg || (l.perfect ? '<span class="rq-star">&#9733;</span>' : l.cleared ? '<span class="rq-ok">&#10003;</span>' : ''));
        const hidden = l.locked && l.kind === 'area';
        const lead = l.kind === 'home' ? '&#8962;' : l.kind === 'area' ? '&#8627;' : l.kind === 'world' ? '&#9673;' : String(i + 1);
        return `<div class="rq-lv${i === this.levelIdx ? ' sel' : ''}${l.current ? ' here' : ''}${l.locked ? ' locked' : ''}${l.kind ? ` ${l.kind}` : ''}" data-lv="${i}"><div class="no">${lead}</div><div class="nm">${hidden ? '? ? ?' : l.name}</div>${mark}</div>`;
      })
      .join('');
    const cur = lv[this.levelIdx];
    const list = cur?.wedgeList?.length
      ? `<ul class="rq-wl">${cur.wedgeList.map((w) => `<li class="${w.got ? '' : 'no'}">${wedgeIcon(16, w.got)}${w.name}</li>`).join('')}</ul>`
      : '';
    const go = cur?.kind === 'home' ? 'X  go home' : 'X  go there';
    // A world behind a shut door: the door, what it asks, a bar, and the same in words. A world whose door is open: a
    // small tag by its name (its list of wedges is what matters then, and must not be pushed off the card). At home:
    // every door of the Club at a glance, before anything else, so that on a small screen it is never the doors that
    // are cut off.
    const door = cur?.door && !cur.door.open ? Menu.doorCard(cur.door, 'Its door', true) : '';
    const doorTag = cur?.door?.open ? `<span class="tag door">${doorIcon(14, true)}door open${cur.door.need > 0 ? ` &middot; ${wedgeIcon(12)}${cur.door.need}` : ''}</span>` : '';
    const doors = cur?.doors?.length
      ? `<div class="rq-doorlist"><div class="rq-h">THE DOORS<span>${wedgeIcon(14)} ${cur.doors[0].have} in your purse</span></div><div class="rq-doors">${cur.doors.map((d) => Menu.doorCard(d, d.name, false)).join('')}</div></div>`
      : '';
    const detail = cur?.locked
      ? `<div class="rq-detail"><div class="ic">${lockIcon(48)}</div><b>${cur.kind === 'area' ? '? ? ?' : cur.name}</b>${door || `<p>${cur.lockText ?? 'Clear the level before this one to open it.'}</p>`}</div>`
      : cur
      ? `<div class="rq-detail"><div><b>${cur.name}</b>${cur.current ? '<span class="tag">you are here</span>' : ''}${doorTag}</div>${doors}<p>${cur.blurb}</p>${list}<small>${go}</small></div>`
      : '';
    const total = lv.filter((l) => l.kind === 'world').reduce((n, l) => n + (l.wedges?.got ?? 0), 0);
    return `<div class="rq-cols items">
      <div class="rq-col"><div class="rq-h">WORLDS<span>${wedgeIcon(14)} ${total}</span></div><div class="rq-scroll">${rows}</div></div>
      <div class="rq-col"><div class="rq-h">DETAILS</div>${detail}</div></div>`;
  }

  /**
   * One door of the Club: its name (or a title), what it asks, and a bar for how near he is to it. Open, the bar is
   * full and green. With `words`, a line under it says the same in plain words.
   */
  static doorCard(d: DoorState, title: string, words: boolean): string {
    const share = d.open || d.need <= 0 ? 100 : Math.max(0, Math.min(100, (100 * d.have) / d.need));
    // (What it asks: shut, how many he has of how many; open, a tick and what it asked, or just "open" if it asked nothing.)
    const cost = `<span class="cost">${d.open ? (d.need > 0 ? `&#10003; ${wedgeIcon(14)}${d.need}` : 'open') : `${wedgeIcon(14, d.have > 0)}${d.have} / ${d.need}`}</span>`;
    const bar = `<div class="rq-bar"><i style="width:${share.toFixed(0)}%"></i></div>`;
    const name = `${doorIcon(20, d.open)}<span class="nm">${title}</span>`;
    // On its own, with the words: name and cost, the bar under them, then the words. In the list: all on one line.
    return words
      ? `<div class="rq-door ${d.open ? 'open' : 'shut'}"><div class="top">${name}${cost}</div>${bar}<p>The door is in the Club. ${doorWords(d)}</p></div>`
      : `<div class="rq-door row ${d.open ? 'open' : 'shut'}"><div class="top">${name}${cost}</div>${bar}</div>`;
  }

  /** The buttons on the save screen, in order. */
  private saveItems(): Array<{ id: string; label: string; warn?: boolean; dim?: boolean }> {
    const at = this.host.savedAt();
    const a = this.host.audio;
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    const game = this.host.inGame?.() !== false;
    const items: Array<{ id: string; label: string; warn?: boolean; dim?: boolean }> = [
      ...(game && this.host.openPhoto ? [{ id: 'photo', label: 'PHOTO MODE' }] : []),
      ...(game ? [{ id: 'save', label: 'SAVE GAME' }, { id: 'load', label: 'LOAD SAVED GAME', dim: !at }] : []),
      ...(game && this.host.toTitle ? [{ id: 'title', label: 'SAVE AND QUIT TO TITLE' }] : []),
      ...(game ? [{ id: 'restart', label: this.confirmRestart ? 'SELECT AGAIN TO RESTART' : 'RESTART (TESTING)', warn: true }] : []),
      { id: 'fullscreen', label: this.host.toggleFullscreen ? `FULLSCREEN: ${this.host.fullscreen?.() ? 'ON' : 'OFF'}` : 'FULLSCREEN: F11' },
    ];
    if (a) items.push({ id: 'sfx', label: `SOUND: ${pct(a.sfx())}` }, { id: 'music', label: `MUSIC: ${pct(a.music())}` });
    if (this.host.rumble) items.push({ id: 'rumble', label: `RUMBLE: ${this.host.rumble.level().toUpperCase()}` });
    for (const x of this.host.extras ?? []) items.push({ id: `x:${x.id}`, label: x.label() });
    items.push({ id: 'controls', label: 'CONTROLS' });
    if (this.host.openBuilder) items.push({ id: 'builder', label: 'LEVEL EDITOR' });
    if (this.host.openTweaks) items.push({ id: 'tweaks', label: 'TWEAKS (GAME FEEL)' });
    if (this.host.openWorkshop) items.push({ id: 'workshop', label: 'WORKSHOP (ALL TOOLS)' });
    if (this.host.quit) items.push({ id: 'quit', label: this.confirmQuit ? 'SELECT AGAIN TO QUIT' : 'QUIT GAME', warn: true });
    return items;
  }

  private saveRows(): number {
    return this.saveItems().length;
  }

  private changeExtra(id: string, dir: 1 | -1): void {
    this.host.extras?.find((x) => `x:${x.id}` === id)?.change(dir);
    this.host.sound?.('move');
    this.render();
  }

  /** Off, low, full (and round again). */
  private toggleRumble(dir: 1 | -1 = 1): void {
    const r = this.host.rumble;
    if (!r) return;
    const order: RumbleLevel[] = ['off', 'low', 'full'];
    r.set(order[(order.indexOf(r.level()) + dir + order.length) % order.length]);
    this.host.sound?.('move');
    this.render();
  }

  /** Steps a volume up or down by a quarter. `wrap` goes back to silent after full (for the select button). */
  private nudgeVolume(id: 'sfx' | 'music', dir: 1 | -1, wrap = false): void {
    const a = this.host.audio;
    if (!a) return;
    const cur = id === 'sfx' ? a.sfx() : a.music();
    let next = Math.round((cur + dir * 0.25) * 4) / 4;
    if (next > 1) next = wrap ? 0 : 1;
    next = Math.max(0, next);
    if (id === 'sfx') a.setSfx(next);
    else a.setMusic(next);
    this.host.sound?.('move');
    this.render();
  }

  private saveScreen(): string {
    const at = this.host.savedAt();
    const when = at ? new Date(at).toLocaleString() : 'No save yet';
    const items = this.saveItems();
    const btns = items
      .map((it, i) => `<div class="rq-btn${i === this.saveRow ? ' sel' : ''}${it.dim ? ' dim' : ''}${it.warn ? ' warn' : ''}" data-row="${i}">${it.label}</div>`)
      .join('');
    if (this.rebinding) return this.rebindScreen();
    const onControls = items[this.saveRow]?.id === 'controls';
    const controls = `<div class="rq-card"><div class="big">Controls</div>
          <p style="margin:0.5em 0 0;line-height:1.7">${this.host.rebind?.summary() ?? ''}<br><small>Select to change keys and buttons.</small></p>
          <p style="margin:0.6em 0 0;line-height:1.5;color:#c9d2b8"><b>Long jump:</b> while running, hold SNEAK and press JUMP.<br><b>Wall kick:</b> press JUMP as you hit a wall in the air.<br><b>Ledge grab:</b> fall past an edge you face to catch it; JUMP climbs, pull back to let go.</p></div>`;
    const f = this.host.fileInfo?.();
    const file = `<div class="rq-card"><div class="big">${f ? `File ${f.file} &middot; ${f.where}` : 'Save file'}</div>${f ? `<p style="margin:0.5em 0 0">${wedgeIcon(16)} ${f.wedges}/${f.total} Golden Wedges &middot; ${f.played} played</p>` : ''}<small>Last saved: ${when}</small>
          <p style="margin:0.6em 0 0;color:#c9d2b8">Saving remembers where you stand and your health. Gear, wedges and collectibles are kept automatically. To change files, save and quit to the title.</p></div>`;
    return `<div class="rq-cols two">
      <div class="rq-col"><div class="rq-h">${onControls ? 'CONTROLS' : 'SAVE FILE'}</div>${onControls ? controls : file}</div>
      <div class="rq-col rq-acts${items.length > 9 ? ' tighter' : items.length > 5 ? ' tight' : ''}"><div class="rq-h">ACTIONS</div><div class="rq-scroll">${btns}</div><div class="rq-msg">${this.message}</div></div></div>`;
  }

  // ---- Taps ----

  private onPointer(e: PointerEvent): void {
    e.preventDefault();
    const t = e.target as HTMLElement;
    const hit = (sel: string): HTMLElement | null => t.closest<HTMLElement>(sel);
    const tab = hit('[data-tab]');
    if (tab) return this.setScreen(Number(tab.dataset.tab));
    const item = hit('[data-item]');
    if (item) {
      const i = Number(item.dataset.item);
      const same = i === this.itemIdx;
      this.itemIdx = i;
      return same ? this.activate() : this.render();
    }
    const cat = hit('[data-cat]');
    if (cat) {
      this.cat = Number(cat.dataset.cat);
      this.tile = 0;
      this.zone = 'cats';
      this.updatePreview();
      return this.render();
    }
    const tile = hit('[data-tile]');
    if (tile) {
      const i = Number(tile.dataset.tile);
      const same = this.zone === 'grid' && i === this.tile;
      this.zone = 'grid';
      this.tile = i;
      this.updatePreview();
      return same ? this.activate() : this.render();
    }
    const lvTap = hit('[data-lv]');
    if (lvTap) {
      const i = Number(lvTap.dataset.lv);
      const same = i === this.levelIdx;
      this.levelIdx = i;
      return same ? this.activate() : this.render();
    }
    const st = hit('[data-st]');
    if (st && this.screen === 5) {
      this.bookIdx = Number(st.dataset.st ?? 0);
      return this.render();
    }
    const rb = hit('[data-rb]');
    if (rb && this.rebinding && !this.capture) {
      const [r, c] = (rb.dataset.rb ?? '0:0').split(':').map(Number);
      const same = r === this.rbRow && c === this.rbCol;
      this.rbRow = r;
      this.rbCol = c === 1 ? 1 : 0;
      return same ? this.activateRebind() : this.render();
    }
    const row = hit('[data-row]');
    if (row) {
      const r = Number(row.dataset.row);
      const same = r === this.saveRow;
      this.saveRow = r;
      this.confirmRestart = this.confirmRestart && same;
      this.confirmQuit = this.confirmQuit && same;
      return same ? this.activate() : this.render();
    }
  }
}
