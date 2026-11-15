/**
 * 3D editing: fly a free camera through the level and place, copy, move or remove pieces where the crosshair points.
 * The game is paused underneath. A gold outline shows what Place would add (red if it would stick out of the room);
 * a blue one shows the piece he is pointing at: what Copy, Move and Delete act on.
 *
 * It wears the look the other development tools share (`devTheme`), and shows the level editor's own palette.
 *
 * Keyboard: WASD fly, arrows or mouse-drag look, wheel forward and back, Space up, C down, Shift faster,
 *           E or Enter place, X delete, Q copy, G move, Z undo, Y redo, [ ] change piece, B all the pieces,
 *           R / F raise or lower, 1 2 width, 3 4 depth, T turn, J jump check, H the controls, Escape back to the map.
 * Pad: left stick fly, right stick look, jump up, sneak down, attack place, dodge delete, lock-on copy,
 *      L1 / R1 change piece, stow turns, the menu button goes back to the map. The d-pad shapes the piece: left and
 *      right narrower and wider, up and down deeper and shallower, or (Select switches) higher and lower.
 * Touch: drag the picture to look, and the buttons.
 */
import * as THREE from 'three';
import { CustomLevel, Piece, PieceType, compileCustom, parseCustom } from '../levels/custom';
import { unreachable } from '../levels/reach';
import { History } from '../levels/editOps';
import { aimPoint, defaultRaise, faces, isSingle, makePiece, pickPiece, settingsFrom, standsOn, sticksOut } from '../levels/place3d';
import { PIECE_GROUPS, type PieceInfo } from './builder';
import { esc, icon, useDevTheme } from './devTheme';

const CSS = `
.rq-fly { position: absolute; inset: 0; z-index: 58; display: none; }
.rq-fly.on { display: block; }
/* (The game's own hearts, counts and goal are put away while he edits: they would show through the bars.) */
.rq-fly-on > *:not(canvas):not(.rq-fly) { visibility: hidden !important; }
.rq-fly .look { position: absolute; inset: 0; touch-action: none; cursor: grab; }
.rq-fly .look:active { cursor: grabbing; }
.rq-fly .cross { position: absolute; left: 50%; top: 50%; width: 26px; height: 26px; margin: -13px 0 0 -13px; pointer-events: none; border: 2px solid #ffffffd0; border-radius: 50%; box-shadow: 0 0 0 1px #0009, inset 0 0 0 1px #0009; }
.rq-fly .cross::after { content: ''; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px #000a; }
.rq-fly .cross.none { border-color: #ffffff55; }
.rq-fly .cross.bad { border-color: var(--bad); }
.rq-fly .top { position: absolute; left: 0; right: 0; top: 0; display: flex; align-items: center; gap: 0.6em; padding: 0.4em 0.6em; background: #0f1218e8; border-bottom: 1px solid var(--line); }
.rq-fly .ttl { display: flex; align-items: center; gap: 0.4em; font-weight: 800; letter-spacing: 0.14em; color: var(--gold); white-space: nowrap; }
.rq-fly .info { flex: 1; min-width: 0; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rq-fly .info b { color: var(--text); font-weight: 600; }
.rq-fly .info .chip { display: inline-block; margin-right: 0.6em; padding: 0.05em 0.6em; border-radius: 1em; background: #3a3110; border: 1px solid var(--gold); color: #fff3c4; font-weight: 600; }
.rq-fly .info.msg { color: var(--text); }
.rq-fly .dock { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.4em 0.7em; padding: 0.45em 0.6em; background: #0f1218e8; border-top: 1px solid var(--line); }
.rq-fly .choose { display: flex; align-items: center; gap: 0.2em; }
.rq-fly .choose .ghost { font-size: 1.3em; font-weight: 800; padding: 0 0.45em; }
.rq-fly .piece { min-width: 13.5em; justify-content: flex-start; gap: 0.55em; padding: 0.25em 0.6em; background: var(--panel2); }
.rq-fly .piece .pn { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.12; flex: 1; min-width: 0; }
.rq-fly .piece .pn b { font-weight: 700; } .rq-fly .piece .pn em { font-style: normal; font-size: 0.78em; color: var(--dim); }
.rq-fly .piece svg { color: var(--dim); }
.rq-fly .sw { flex: none; width: 1.7em; height: 1.7em; border-radius: 0.3em; border: 1px solid #0008; display: flex; align-items: center; justify-content: center; font: 800 0.72em ui-monospace, Menlo, Consolas, monospace; font-style: normal; color: #000c; }
.rq-fly .sw.dot { border-radius: 50%; }
.rq-fly .step { display: flex; align-items: center; gap: 0.25em; }
.rq-fly .step label { color: var(--dim); font-size: 0.86em; margin-right: 0.15em; }
.rq-fly .step output { min-width: 2.7em; text-align: center; font-weight: 700; color: var(--gold); font-variant-numeric: tabular-nums; }
.rq-fly .step button { min-width: 2.2em; padding: 0.2em; font-weight: 800; }
.rq-fly .turn output { font-weight: 700; color: var(--gold); min-width: 3em; text-align: left; }
.rq-fly .off { opacity: 0.35; pointer-events: none; }
/* With a controller: the measures its d-pad changes just now are marked. */
.rq-fly .step.bypad label { color: var(--gold); }
.rq-fly .step.bypad output { box-shadow: 0 0 0 1px var(--gold); border-radius: 0.3em; }
.rq-fly .acts { position: absolute; right: 0.6em; top: 50%; transform: translateY(-50%); display: grid; grid-template-columns: 1fr 1fr; gap: 0.4em; width: 11.5em; }
.rq-fly .acts button { position: relative; flex-direction: column; gap: 0.15em; padding: 0.45em 0.3em; min-height: 3.5em; background: #171b24ea; font-size: 0.94em; touch-action: none; }
.rq-fly .acts button:hover { background: #303850; }
.rq-fly .acts .place { grid-column: 1 / 3; flex-direction: row; gap: 0.5em; min-height: 3.6em; font-size: 1.12em; background: var(--go2); }
.rq-fly .acts .place:hover { background: #26713f; }
.rq-fly .acts .del { grid-column: 1 / 3; flex-direction: row; gap: 0.5em; min-height: 2.5em; }
.rq-fly .acts .del:hover { background: #4a2020; }
.rq-fly .acts .kbd { position: absolute; right: 0.3em; top: 0.25em; font-size: 0.72em; min-width: 1.4em; }
.rq-fly.touch .kbd { display: none; }
.rq-fly.touch .top button, .rq-fly.touch .dock button { min-height: 2.8em; }
.rq-fly .pad { position: absolute; left: 0.6em; top: 50%; transform: translateY(-50%); display: none; grid-template-columns: repeat(3, 3.1em); grid-template-rows: repeat(3, 3.1em); gap: 0.3em; }
.rq-fly.touch .pad { display: grid; }
.rq-fly .pad button { padding: 0; background: #171b24ea; touch-action: none; }
.rq-fly .pad button.held, .rq-fly .acts button.held { background: #3a3110; border-color: var(--gold); }
.rq-fly .pad .lr svg { transform: rotate(-90deg); } .rq-fly .pad .rr svg { transform: rotate(90deg); }
.rq-fly .pal { position: absolute; left: 0.6em; bottom: 4.4em; width: min(36em, calc(100% - 1.2em)); max-height: min(72%, 36em); display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line2); border-radius: 0.7em; box-shadow: 0 12px 40px #000b; overflow: hidden; }
.rq-fly .pal[hidden], .rq-fly .help[hidden] { display: none; }
.rq-fly .pal .hd { display: flex; gap: 0.5em; align-items: center; padding: 0.5em 0.6em; border-bottom: 1px solid var(--line); }
.rq-fly .pal .hd input { flex: 1; min-width: 0; }
.rq-fly .pal .list { overflow-y: auto; padding: 0 0.6em 0.6em; min-height: 0; }
.rq-fly .pal h4, .rq-fly .help h4 { margin: 0.7em 0 0.35em; font-size: 0.78em; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dim); }
.rq-fly .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5em, 1fr)); gap: 0.3em; }
.rq-fly .tile { justify-content: flex-start; text-align: left; white-space: normal; line-height: 1.1; padding: 0.3em 0.4em; min-height: 2.5em; font-size: 0.9em; background: var(--panel2); border-color: var(--line); }
.rq-fly .tile.on { background: #3a3110; border-color: var(--gold); box-shadow: 0 0 0 1px var(--gold) inset; }
.rq-fly .pal .tip { padding: 0.45em 0.7em; border-top: 1px solid var(--line); color: var(--dim); font-size: 0.9em; min-height: 2.3em; }
.rq-fly .help { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(48em, calc(100% - 1.6em)); max-height: calc(100% - 1.6em); overflow: auto; padding: 0.7em 1em 1em; background: var(--panel); border: 1px solid var(--line2); border-radius: 0.7em; box-shadow: 0 12px 40px #000b; }
.rq-fly .help .hd { display: flex; align-items: center; gap: 0.5em; font-weight: 800; letter-spacing: 0.1em; color: var(--gold); }
.rq-fly .help .hd button { margin-left: auto; }
.rq-fly .help .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(13.5em, 1fr)); gap: 0 1.4em; }
.rq-fly .help p { margin: 0.28em 0; color: var(--dim); display: flex; gap: 0.5em; align-items: baseline; }
.rq-fly .help p > span:first-child { flex: none; min-width: 6.4em; color: var(--text); }
.rq-fly .help .legend { margin-top: 0.7em; padding-top: 0.6em; border-top: 1px solid var(--line); color: var(--dim); }
.rq-fly .help .legend i { display: inline-block; width: 0.9em; height: 0.9em; border: 2px solid; border-radius: 0.15em; vertical-align: -0.1em; margin-right: 0.35em; }
@media (max-height: 430px) { .rq-fly .acts { width: 10em; } .rq-fly .acts button { min-height: 2.9em; } .rq-fly .acts .place { min-height: 3.1em; } .rq-fly .pad { grid-template-columns: repeat(3, 2.7em); grid-template-rows: repeat(3, 2.7em); } }
@media (max-width: 760px) { .rq-fly .top button span, .rq-fly .step label { display: none; } .rq-fly .piece { min-width: 10.5em; } }
`;

/** Every piece that can be placed in 3D, in palette order. */
const ITEMS: PieceInfo[] = PIECE_GROUPS.flatMap((g) => g.items);
const GROUP_OF = new Map<PieceType, string>(PIECE_GROUPS.flatMap((g) => g.items.map((i) => [i.t, g.label] as [PieceType, string])));
const DIRS: Array<'n' | 'e' | 's' | 'w'> = ['n', 'e', 's', 'w'];
const DIR_NAME = { n: 'north', e: 'east', s: 'south', w: 'west' };
const GOLD = 0xffc94a;
const RED = 0xff5a4a;
const BLUE = 0x6ab7ff;

export interface FlyInput {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  up: boolean;
  down: boolean;
  fast: boolean;
  place: boolean;
  del: boolean;
  /** Copy the piece he points at: it becomes what Place puts down. */
  pick: boolean;
  /** Pick the piece he points at up, to put it down somewhere else. */
  move: boolean;
  prev: boolean;
  next: boolean;
  raise: number;
  width: number;
  depth: number;
  turn: boolean;
  undo: boolean;
  redo: boolean;
  /** Open or shut the list of all the pieces. */
  palette: boolean;
  /** Open or shut the card of controls. */
  help: boolean;
  /** Turn the jump checker on or off. */
  check: boolean;
  exit: boolean;
  /** With a controller in use: whether its d-pad's up and down change the height (true) or the depth (false). Null: no controller. */
  padLift?: boolean | null;
}

export interface FlyHost {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** What the crosshair can hit: the level's built geometry. */
  solids(): THREE.Object3D[];
  /** Rebuilds the level in the game after an edit. */
  rebuild(level: CustomLevel): void;
  /** Leaving: the level as it now is. */
  done(level: CustomLevel): void;
}

/** What Place carries besides the piece's shape: the settings of a piece that was copied or picked up. */
interface Carry {
  props?: Piece['props'];
  skin?: Piece['skin'];
  /** Picked up (not copied): it is put down once, and Escape puts it back where it was. */
  moved: boolean;
}

export class FlyEdit {
  open = false;
  private readonly root: HTMLDivElement;
  private readonly info: HTMLElement;
  private readonly palEl: HTMLElement;
  private readonly helpEl: HTMLElement;
  private readonly searchEl: HTMLInputElement;
  private level!: CustomLevel;
  private readonly hist = new History(80);
  private readonly pos = new THREE.Vector3();
  private yaw = 0;
  private pitch = -0.4;
  private tool = ITEMS.findIndex((x) => x.t === 'platform');
  private w = 3;
  private d = 3;
  private dir: 'n' | 'e' | 's' | 'w' = 'n';
  private readonly raiseBy = new Map<PieceType, number>();
  private carry: Carry | null = null;
  private panel: 'palette' | 'help' | null = null;
  private find = '';
  private readonly ray = new THREE.Raycaster();
  private readonly ghost: THREE.LineSegments;
  private readonly target: THREE.LineSegments;
  /** Red markers on what the jump checker says he cannot reach. */
  private readonly marks = new THREE.Group();
  private checking = false;
  private checkTimer = 0;
  private hit: { x: number; y: number; z: number; dist: number } | null = null;
  private targetIdx = -1;
  private bad = false;
  private readonly held = new Set<string>();
  private padLift: boolean | null = null;
  /** Frames for which presses are not listened to (see the search box's keys). */
  private deaf = 0;
  private drag: { id: number; x: number; y: number } | null = null;

  constructor(parent: HTMLElement, private readonly host: FlyHost) {
    useDevTheme();
    if (!document.getElementById('rq-fly-css')) {
      const st = document.createElement('style');
      st.id = 'rq-fly-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const act = (a: string, ic: string, label: string, key: string, tip: string, cls = ''): string => `<button class="${cls}" data-a="${a}" title="${esc(tip)}">${icon(ic)}<b>${label}</b><span class="kbd">${key}</span></button>`;
    const step = (g: string, label: string, tip: string): string => `<div class="step" data-g="${g}" title="${esc(tip)}"><label>${label}</label><button data-a="${g}-">−</button><output data-v="${g}"></output><button data-a="${g}+">+</button></div>`;
    this.root = document.createElement('div');
    this.root.className = 'rq-fly rqd';
    this.root.innerHTML = `
      <div class="look"></div><div class="cross"></div>
      <div class="top">
        <button data-a="exit" title="Back to the map (Esc)">${icon('back')}<span>Map</span></button>
        <div class="ttl">${icon('cube')}3D EDIT</div>
        <div class="info"></div>
        <button class="ghost" data-a="check" title="Jump check: mark everything he cannot reach (J)">${icon('check')}<span>Jump check</span></button>
        <button class="ghost" data-a="help" title="The controls (H)">${icon('help')}<span>Controls</span></button>
      </div>
      <div class="pad">
        <span></span><button data-h="fwd" title="Forward">${icon('up')}</button><span></span>
        <button class="lr" data-h="left" title="Left">${icon('up')}</button><button data-h="up" title="Up">${icon('export')}</button><button class="rr" data-h="right" title="Right">${icon('up')}</button>
        <span></span><button data-h="back" title="Back">${icon('down')}</button><button data-h="down" title="Down">${icon('import')}</button>
      </div>
      <div class="acts">
        ${act('place', 'plus', 'Place', 'E', 'Put the piece down where the gold outline is', 'go place')}
        ${act('pick', 'copy', 'Copy', 'Q', 'Copy the piece you are pointing at (blue outline): Place then puts down another like it, with the same settings')}
        ${act('move', 'pan', 'Move', 'G', 'Pick the piece you are pointing at up, to put it down somewhere else')}
        ${act('undo', 'undo', 'Undo', 'Z', 'Take back the last change')}
        ${act('redo', 'redo', 'Redo', 'Y', 'Do again what was just taken back')}
        ${act('del', 'trash', 'Delete', 'X', 'Remove the piece you are pointing at (blue outline)', 'danger del')}
      </div>
      <div class="dock">
        <div class="choose">
          <button class="ghost" data-a="prev" title="The piece before ([)">‹</button>
          <button class="piece" data-a="palette" title="All the pieces (B)"><i class="sw"></i><span class="pn"><b></b><em></em></span>${icon('list')}</button>
          <button class="ghost" data-a="next" title="The next piece (])">›</button>
        </div>
        ${step('w', 'Wide', 'How wide, in squares (1 and 2)')}
        ${step('d', 'Deep', 'How deep, in squares (3 and 4)')}
        ${step('r', 'Height', 'How far above the surface you point at (R and F)')}
        <button class="turn" data-a="turn" title="Turn it to face another way (T)">${icon('turn')}Faces <output data-v="dir"></output></button>
      </div>
      <div class="pal" hidden>
        <div class="hd">${icon('search')}<input type="search" placeholder="Find a piece" /><button class="ghost" data-a="palette" title="Close (Esc)">${icon('close')}</button></div>
        <div class="list"></div>
        <div class="tip"></div>
      </div>
      <div class="help" hidden></div>`;
    parent.appendChild(this.root);
    this.info = this.root.querySelector('.info') as HTMLElement;
    this.palEl = this.root.querySelector('.pal') as HTMLElement;
    this.helpEl = this.root.querySelector('.help') as HTMLElement;
    this.searchEl = this.palEl.querySelector('input') as HTMLInputElement;
    if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) this.root.classList.add('touch');

    // Buttons act on press (touch-friendly); the fly buttons are held. The palette's tiles act on a click, so that
    // its list can be dragged to scroll.
    this.root.addEventListener('pointerdown', (e) => {
      this.root.classList.toggle('touch', e.pointerType === 'touch' || e.pointerType === 'pen');
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b || b.dataset.pick) return;
      e.preventDefault();
      if (b.dataset.h) {
        this.held.add(b.dataset.h);
        b.classList.add('held');
        b.setPointerCapture(e.pointerId);
      } else if (b.dataset.a) this.act(b.dataset.a);
    });
    const release = (e: PointerEvent): void => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (b?.dataset.h) {
        this.held.delete(b.dataset.h);
        b.classList.remove('held');
      }
    };
    this.root.addEventListener('pointerup', release);
    this.root.addEventListener('pointercancel', release);
    this.palEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-pick]') as HTMLElement | null;
      if (b) this.choose(b.dataset.pick as PieceType);
    });
    this.palEl.addEventListener('pointerover', (e) => {
      const b = (e.target as HTMLElement).closest('[data-pick]') as HTMLElement | null;
      if (b) this.tipFor(b.dataset.pick as PieceType);
    });
    this.searchEl.addEventListener('input', () => {
      this.find = this.searchEl.value;
      this.renderPalette();
    });
    this.searchEl.addEventListener('keydown', (e) => {
      // (The game reads the same key a moment later: it is not to take this Escape as "back to the map", nor this
      // Enter as "place".)
      if (e.key === 'Escape') {
        e.preventDefault();
        this.deaf = 2;
        this.closePanel();
      } else if (e.key === 'Enter') {
        this.deaf = 2;
        const first = this.matches()[0];
        if (first) this.choose(first.t);
      }
    });

    // Dragging the picture looks around; the wheel goes forward and back.
    const look = this.root.querySelector('.look') as HTMLDivElement;
    look.addEventListener('pointerdown', (e) => {
      if (this.panel) return this.closePanel();
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      look.setPointerCapture(e.pointerId);
    });
    look.addEventListener('pointermove', (e) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      this.yaw -= (e.clientX - this.drag.x) * 0.006;
      this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - (e.clientY - this.drag.y) * 0.006));
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    const end = (): void => {
      this.drag = null;
    };
    look.addEventListener('pointerup', end);
    look.addEventListener('pointercancel', end);
    look.addEventListener('wheel', (e) => {
      e.preventDefault();
      const cp = Math.cos(this.pitch);
      const far = Math.max(-3, Math.min(3, -e.deltaY * 0.012));
      this.pos.x += -Math.sin(this.yaw) * cp * far;
      this.pos.y += Math.sin(this.pitch) * far;
      this.pos.z += -Math.cos(this.yaw) * cp * far;
      this.keepInside();
    }, { passive: false });

    const lineMat = (c: number): THREE.LineBasicMaterial => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true });
    this.ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), lineMat(GOLD));
    this.target = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), lineMat(BLUE));
    this.ghost.renderOrder = this.target.renderOrder = 999;
    this.ghost.visible = this.target.visible = false;
  }

  /** Whether he is typing in the piece search: the game must not read those keys as its own. */
  get typing(): boolean {
    return this.open && typeof document !== 'undefined' && document.activeElement === this.searchEl;
  }

  /** Starts editing this level, with the camera above its start, looking in. */
  start(level: CustomLevel, jumpCheck = false): void {
    this.checking = jumpCheck;
    this.level = parseCustom(JSON.stringify(level)) ?? level;
    this.hist.clear();
    this.carry = null;
    this.panel = null;
    const sp = this.level.pieces.find((p) => p.t === 'spawn');
    const sx = sp ? sp.x0 : 0;
    const sz = sp ? sp.z0 : this.level.depth / 2 - 4;
    // Behind the start, looking toward the middle of the room.
    const toMid = Math.atan2(-sx, -sz);
    this.yaw = toMid + Math.PI;
    const hx = this.level.width / 2 - 1;
    const hz = this.level.depth / 2 - 1;
    this.pos.set(Math.max(-hx, Math.min(hx, sx - Math.sin(toMid) * 6)), (sp?.top ?? 0) + 7, Math.max(-hz, Math.min(hz, sz - Math.cos(toMid) * 6)));
    this.pitch = -0.55;
    this.open = true;
    this.root.classList.add('on');
    this.root.parentElement?.classList.add('rq-fly-on');
    this.host.scene.add(this.ghost, this.target, this.marks);
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
    this.say('Point at a surface and press Place. Copy, Move and Delete act on the piece in the blue outline.', 6);
  }

  stop(): void {
    if (!this.open) return;
    // A piece still in hand goes back where it was.
    if (this.carry?.moved) this.putBack();
    this.open = false;
    this.root.classList.remove('on');
    this.root.parentElement?.classList.remove('rq-fly-on');
    this.held.clear();
    this.panel = null;
    this.searchEl.blur();
    window.clearTimeout(this.checkTimer);
    this.clearMarks();
    this.host.scene.remove(this.ghost, this.target, this.marks);
    this.host.done(this.level);
  }

  private get item(): PieceInfo {
    return ITEMS[this.tool];
  }
  private get t(): PieceType {
    return this.item.t;
  }

  private raise(): number {
    return this.raiseBy.get(this.t) ?? defaultRaise(this.t);
  }

  private act(a: string): void {
    if (this.panel && a !== 'palette' && a !== 'help' && a !== 'prev' && a !== 'next') this.closePanel();
    switch (a) {
      case 'exit': return this.stop();
      case 'place': return this.place();
      case 'del': return this.remove();
      case 'pick': return this.pick(false);
      case 'move': return this.pick(true);
      case 'undo': return this.undo();
      case 'redo': return this.redo();
      case 'palette': return this.panel === 'palette' ? this.closePanel() : this.openPalette();
      case 'help': return this.panel === 'help' ? this.closePanel() : this.openHelp();
      case 'check': return this.toggleCheck();
      case 'prev': return this.setTool((this.tool + ITEMS.length - 1) % ITEMS.length);
      case 'next': return this.setTool((this.tool + 1) % ITEMS.length);
      case 'w-': this.w = Math.max(1, this.w - 1); break;
      case 'w+': this.w = Math.min(60, this.w + 1); break;
      case 'd-': this.d = Math.max(1, this.d - 1); break;
      case 'd+': this.d = Math.min(60, this.d + 1); break;
      case 'r-': this.raiseBy.set(this.t, Math.round((this.raise() - 0.5) * 10) / 10); break;
      case 'r+': this.raiseBy.set(this.t, Math.round((this.raise() + 0.5) * 10) / 10); break;
      case 'turn': this.dir = DIRS[(DIRS.indexOf(this.dir) + 1) % 4]; break;
    }
    this.sync();
  }

  /** Makes another piece the one Place puts down. (A piece in hand goes back first; a copy's settings are dropped.) */
  private setTool(i: number): void {
    if (this.carry?.moved) this.putBack();
    this.carry = null;
    this.tool = i;
    if (this.panel === 'palette') this.renderPalette();
    this.sync();
    this.say(`${this.item.label}. ${this.item.tip}`, 4);
  }

  private choose(t: PieceType): void {
    const i = ITEMS.findIndex((x) => x.t === t);
    this.closePanel();
    if (i >= 0) this.setTool(i);
  }

  // ---- The list of all the pieces, and the card of controls ----

  private matches(): PieceInfo[] {
    const find = this.find.trim().toLowerCase();
    return find ? ITEMS.filter((i) => i.label.toLowerCase().includes(find) || i.t.includes(find) || i.tip.toLowerCase().includes(find)) : ITEMS;
  }

  private renderPalette(): void {
    const tile = (i: PieceInfo): string => `<button class="tile${i.t === this.t ? ' on' : ''}" data-pick="${i.t}"><i class="sw${isSingle(i.t) ? ' dot' : ''}" style="background:${i.color}">${esc(i.glyph)}</i><span>${esc(i.label)}</span></button>`;
    const list = this.palEl.querySelector('.list') as HTMLElement;
    if (this.find.trim()) {
      const hits = this.matches();
      list.innerHTML = hits.length ? `<h4>Found ${hits.length}</h4><div class="tiles">${hits.map(tile).join('')}</div>` : '<h4>No piece by that name</h4>';
      this.tipFor(hits[0]?.t ?? this.t);
      return;
    }
    list.innerHTML = PIECE_GROUPS.map((g) => `<h4>${esc(g.label)}</h4><div class="tiles">${g.items.map(tile).join('')}</div>`).join('');
    this.tipFor(this.t);
  }

  private tipFor(t: PieceType): void {
    const i = ITEMS.find((x) => x.t === t);
    if (i) (this.palEl.querySelector('.tip') as HTMLElement).innerHTML = `<b>${esc(i.label)}.</b> ${esc(i.tip)}`;
  }

  private openPalette(): void {
    this.panel = 'palette';
    this.helpEl.hidden = true;
    this.find = '';
    this.searchEl.value = '';
    this.renderPalette();
    // (It sits just above the bar, however many rows that has wrapped to.)
    this.palEl.style.bottom = `${(this.root.querySelector('.dock') as HTMLElement).offsetHeight + 8}px`;
    this.palEl.hidden = false;
    (this.palEl.querySelector('.tile.on') as HTMLElement | null)?.scrollIntoView({ block: 'center' });
    // With a keyboard he can type a name straight away; on a touch screen that would only bring the keys up.
    if (!this.root.classList.contains('touch')) this.searchEl.focus();
    this.sync();
  }

  private openHelp(): void {
    this.panel = 'help';
    this.palEl.hidden = true;
    const k = (keys: string, what: string): string => `<p><span>${keys.split(' ').map((x) => `<span class="kbd">${esc(x)}</span>`).join(' ')}</span><span>${what}</span></p>`;
    const w = (name: string, what: string): string => `<p><span>${name}</span><span>${what}</span></p>`;
    this.helpEl.innerHTML = `
      <div class="hd">${icon('help')}CONTROLS<button class="ghost" data-a="help" title="Close (Esc)">${icon('close')}</button></div>
      <div class="cols">
        <div><h4>Keyboard and mouse</h4>
          ${k('W A S D', 'fly')}${k('Drag', 'the picture, or the arrow keys: look round')}${k('Wheel', 'forward and back')}${k('Space C', 'up and down')}${k('Shift', 'faster')}
          ${k('E', 'place')}${k('X', 'delete')}${k('Q', 'copy the piece pointed at')}${k('G', 'move it')}${k('Z Y', 'undo and redo')}
          ${k('[ ]', 'the piece before, the next')}${k('B', 'all the pieces')}${k('R F', 'higher, lower')}${k('1 2', 'narrower, wider')}${k('3 4', 'shallower, deeper')}${k('T', 'turn it')}
          ${k('J', 'jump check')}${k('H', 'this card')}${k('Esc', 'back to the map')}</div>
        <div><h4>Controller</h4>
          ${w('Left stick', 'fly')}${w('Right stick', 'look round')}${w('Jump', 'up')}${w('Sneak', 'down')}${w('Attack', 'place')}${w('Dodge', 'delete')}
          ${w('Lock-on', 'copy the piece pointed at')}${w('L1 R1', 'the piece before, the next')}${w('D-pad', 'left, right: narrower, wider. Up, down: deeper, shallower')}${w('Select', 'switches the d-pad\'s up and down to higher, lower (and back)')}${w('Stow', 'turn it')}${w('Menu', 'back to the map')}
          <h4>Touch</h4>
          ${w('Drag', 'the picture to look round')}${w('Arrows', 'on the left: fly, and up and down')}${w('Buttons', 'everything else')}</div>
      </div>
      <div class="legend"><i style="border-color:#ffc94a"></i>Gold: what Place would add (red: it would stick out of the room). <i style="border-color:#6ab7ff;margin-left:0.8em"></i>Blue: the piece you are pointing at, which Copy, Move and Delete act on. Copy keeps a piece's settings (what a crate holds, what a character says); placing from the list starts a plain one.</div>`;
    this.helpEl.hidden = false;
    this.sync();
  }

  private closePanel(): void {
    this.panel = null;
    this.palEl.hidden = true;
    this.helpEl.hidden = true;
    this.searchEl.blur();
    this.sync();
  }

  private toggleCheck(): void {
    this.checking = !this.checking;
    if (this.checking) this.recheck();
    else {
      window.clearTimeout(this.checkTimer);
      this.clearMarks();
      this.say('Jump check off.');
    }
    this.sync();
  }

  // ---- Changing the level ----

  /** Makes a change to the level. (`record` false: it is the second half of a change already recorded, a move's putting down.) */
  private edit(change: () => void, record = true): void {
    if (record) this.hist.push(JSON.stringify(this.level));
    change();
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
  }

  private label(t: PieceType): string {
    return ITEMS.find((x) => x.t === t)?.label ?? t;
  }

  private place(): void {
    const h = this.hit;
    if (!h) return this.say('Point at a surface to place.');
    const p = makePiece(this.t, h.x, h.y, h.z, { w: this.w, d: this.d, raise: this.raise(), dir: this.dir });
    if (sticksOut(p, this.level.width, this.level.depth)) return this.say('That would stick out of the room.');
    const c = this.carry;
    if (c?.props) p.props = JSON.parse(JSON.stringify(c.props)) as Piece['props'];
    if (c?.skin) p.skin = c.skin;
    // (A move is one change: picking it up was recorded, so one Undo puts it back where it came from.)
    this.edit(() => {
      if (p.t === 'spawn' || p.t === 'exit') this.level.pieces = this.level.pieces.filter((q) => q.t !== p.t);
      this.level.pieces.push(p);
    }, !c?.moved);
    if (c?.moved) {
      this.carry = null;
      this.sync();
      return this.say(`${this.item.label} moved.`);
    }
    this.say(`${this.item.label} placed.`);
  }

  private remove(): void {
    if (this.targetIdx < 0) return this.say('Point at a piece to delete it.');
    const p = this.level.pieces[this.targetIdx];
    if (p.t === 'spawn') return this.say('The start cannot be deleted. Place or move it instead.');
    const i = this.targetIdx;
    this.edit(() => this.level.pieces.splice(i, 1));
    this.say(`${this.label(p.t)} deleted.`);
  }

  /** Copy (or, with `move`, pick up) the piece he points at: it becomes what Place puts down, settings and all. */
  private pick(move: boolean): void {
    if (this.targetIdx < 0) return this.say(`Point at a piece to ${move ? 'move' : 'copy'} it.`);
    if (this.carry?.moved) this.putBack();
    const i = this.targetIdx;
    const p = this.level.pieces[i];
    const idx = ITEMS.findIndex((x) => x.t === p.t);
    if (idx < 0) return this.say('That piece cannot be placed from here.');
    const s = settingsFrom(p, standsOn(this.level.pieces, p));
    this.tool = idx;
    if (!isSingle(p.t)) {
      this.w = s.w;
      this.d = s.d;
    }
    this.raiseBy.set(p.t, s.raise);
    if (p.dir) this.dir = p.dir;
    // (The start is never taken off the map: putting it down again somewhere else moves it.)
    const lift = move && p.t !== 'spawn' && p.t !== 'exit';
    this.carry = { props: p.props ? (JSON.parse(JSON.stringify(p.props)) as Piece['props']) : undefined, skin: p.skin, moved: lift };
    if (lift) this.edit(() => this.level.pieces.splice(i, 1));
    this.sync();
    this.say(move ? `${this.item.label} picked up. Place puts it down; Esc puts it back.` : `${this.item.label} copied. Place puts down another like it.`, 4);
  }

  /** Puts a piece that was picked up back where it was. */
  private putBack(): void {
    if (!this.carry?.moved) return;
    this.carry = null;
    const s = this.hist.undo(JSON.stringify(this.level));
    this.hist.dropRedo();
    if (!s) return;
    this.level = JSON.parse(s) as CustomLevel;
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
  }

  private undo(): void {
    if (this.carry?.moved) {
      this.putBack();
      return this.say('Put back.');
    }
    const s = this.hist.undo(JSON.stringify(this.level));
    if (!s) return this.say('Nothing to undo.');
    this.level = JSON.parse(s) as CustomLevel;
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
    this.say('Undone.');
  }

  private redo(): void {
    if (this.carry?.moved) return this.say('Put the piece down first.');
    const s = this.hist.redo(JSON.stringify(this.level));
    if (!s) return this.say('Nothing to redo.');
    this.level = JSON.parse(s) as CustomLevel;
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
    this.say('Redone.');
  }

  private clearMarks(): void {
    for (const c of [...this.marks.children]) {
      this.marks.remove(c);
      ((c as THREE.LineSegments).geometry as THREE.BufferGeometry).dispose();
    }
  }

  /** With the jump checker on: red markers over everything out of reach (a moment after each edit). */
  private recheck(): void {
    if (!this.checking) return;
    window.clearTimeout(this.checkTimer);
    this.checkTimer = window.setTimeout(() => {
      this.clearMarks();
      let problems: ReturnType<typeof unreachable> = [];
      try {
        problems = unreachable(compileCustom(this.level));
      } catch {
        return;
      }
      const mat = new THREE.LineBasicMaterial({ color: 0xff3a3a, depthTest: false, transparent: true });
      for (const p of problems) {
        const m = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.55)), mat);
        m.position.set(p.x, p.y + 0.6, p.z);
        m.renderOrder = 998;
        this.marks.add(m);
      }
      if (this.msgT <= 0 || problems.length) this.say(problems.length ? `Jump check: ${problems.length} out of reach (red diamonds).` : 'Jump check: everything can be reached.');
    }, 350);
  }

  private msg = '';
  private msgT = 0;
  private say(m: string, secs = 2.5): void {
    this.msg = m;
    this.msgT = secs;
    this.sync();
  }

  /** What the bar along the top says when there is no message: where the crosshair is, and what it is on. */
  private status(): string {
    const h = this.hit;
    if (!h) return 'Point at the floor or a platform.';
    let on = '';
    const tp = this.targetIdx >= 0 ? this.level.pieces[this.targetIdx] : null;
    if (tp) {
      const size = isSingle(tp.t) ? '' : ` ${Math.abs(tp.x1 - tp.x0)} × ${Math.abs(tp.z1 - tp.z0)}`;
      on = `   on <b>${esc(this.label(tp.t))}</b>${size}, top ${tp.top.toFixed(1)}`;
    }
    return `x ${h.x.toFixed(0)}   z ${h.z.toFixed(0)}   height ${h.y.toFixed(1)}${on}   <span class="faint">${this.level.pieces.length} pieces</span>`;
  }

  private sync(): void {
    const set = (k: string, v: string): void => {
      const el = this.root.querySelector(`[data-v="${k}"]`);
      if (el) el.textContent = v;
    };
    const it = this.item;
    const piece = this.root.querySelector('.piece') as HTMLElement;
    const sw = piece.querySelector('.sw') as HTMLElement;
    sw.style.background = it.color;
    sw.textContent = it.glyph;
    sw.classList.toggle('dot', isSingle(it.t));
    (piece.querySelector('b') as HTMLElement).textContent = it.label;
    (piece.querySelector('em') as HTMLElement).textContent = GROUP_OF.get(it.t) ?? '';
    piece.classList.toggle('on', this.panel === 'palette');
    const single = isSingle(this.t);
    set('w', single ? '–' : String(this.w));
    set('d', single ? '–' : String(this.d));
    set('r', `${this.raise() >= 0 ? '+' : ''}${this.raise().toFixed(1)}`);
    set('dir', DIR_NAME[this.dir]);
    const cls = (sel: string, name: string, on: boolean): void => {
      (this.root.querySelector(sel) as HTMLElement).classList.toggle(name, on);
    };
    cls('[data-g="w"]', 'off', single);
    cls('[data-g="d"]', 'off', single);
    cls('.turn', 'off', !faces(this.t));
    cls('[data-a="check"]', 'on', this.checking);
    cls('.top [data-a="help"]', 'on', this.panel === 'help');
    (this.root.querySelector('[data-a="undo"]') as HTMLButtonElement).disabled = !this.hist.canUndo;
    (this.root.querySelector('[data-a="redo"]') as HTMLButtonElement).disabled = !this.hist.canRedo || !!this.carry?.moved;
    const chip = this.carry ? `<span class="chip">${this.carry.moved ? 'Moving' : 'Copying'}: ${esc(it.label)}</span>` : '';
    this.info.classList.toggle('msg', this.msgT > 0);
    this.info.innerHTML = chip + (this.msgT > 0 ? esc(this.msg) : this.status());
    const cross = this.root.querySelector('.cross') as HTMLElement;
    cross.classList.toggle('none', !this.hit);
    cross.classList.toggle('bad', !!this.hit && this.bad);
  }

  private keepInside(): void {
    // Inside the room: from outside, the walls would be in the way of the crosshair.
    const lim = { x: this.level.width / 2 - 0.4, z: this.level.depth / 2 - 0.4 };
    this.pos.x = Math.max(-lim.x, Math.min(lim.x, this.pos.x));
    this.pos.z = Math.max(-lim.z, Math.min(lim.z, this.pos.z));
    this.pos.y = Math.max(-10, Math.min((this.level.wallHeight ?? 12) + 8, this.pos.y));
  }

  /** Every frame while open: fly, aim, and work the buttons. */
  frame(dt: number, inp: FlyInput): void {
    if (!this.open) return;
    // A controller's d-pad: which measures it changes are marked on the bar, and a switch of them is said.
    const lift = inp.padLift ?? null;
    if (lift !== this.padLift) {
      const was = this.padLift;
      this.padLift = lift;
      for (const g of ['w', 'd', 'r']) (this.root.querySelector(`[data-g="${g}"]`) as HTMLElement).classList.toggle('bypad', lift !== null && (g === 'w' || (g === 'r') === lift));
      if (was !== null && lift !== null) this.say(lift ? 'D-pad up and down now change its HEIGHT. (Select switches back.)' : 'D-pad up and down now change its DEPTH. (Select switches.)', 3);
    }
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.sync();
    if (this.deaf > 0) {
      this.deaf--;
      return;
    }
    if (this.panel) {
      // A list or the card is up: nothing is placed and nothing moves until it is shut.
      if (inp.exit || (this.panel === 'help' && inp.help) || (this.panel === 'palette' && inp.palette)) this.closePanel();
      else if (inp.help) this.openHelp();
      else if (inp.palette) this.openPalette();
      else if (this.panel === 'palette' && inp.prev) this.act('prev');
      else if (this.panel === 'palette' && inp.next) this.act('next');
      return;
    }
    if (inp.exit) {
      // (With a piece in hand, the first press puts it back.)
      if (this.carry?.moved) {
        this.putBack();
        return this.say('Put back.');
      }
      return this.stop();
    }
    if (inp.place) this.place();
    if (inp.del) this.remove();
    if (inp.pick) this.pick(false);
    if (inp.move) this.pick(true);
    if (inp.undo) this.undo();
    if (inp.redo) this.redo();
    if (inp.prev) this.act('prev');
    if (inp.next) this.act('next');
    if (inp.turn) this.act('turn');
    if (inp.width) this.act(inp.width > 0 ? 'w+' : 'w-');
    if (inp.depth) this.act(inp.depth > 0 ? 'd+' : 'd-');
    if (inp.raise) this.act(inp.raise > 0 ? 'r+' : 'r-');
    if (inp.check) this.toggleCheck();
    if (inp.palette) return this.openPalette();
    if (inp.help) return this.openHelp();

    // Look.
    this.yaw -= inp.lookX * 2.2 * dt;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + inp.lookY * 1.6 * dt));
    // Fly, along where the camera faces (flat), plus straight up and down.
    let mx = inp.moveX + (this.held.has('right') ? 1 : 0) - (this.held.has('left') ? 1 : 0);
    let my = inp.moveY + (this.held.has('fwd') ? 1 : 0) - (this.held.has('back') ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const speed = (inp.fast ? 16 : 8) * dt;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    this.pos.x += (fx * my - fz * mx) * speed;
    this.pos.z += (fz * my + fx * mx) * speed;
    const vert = (inp.up || this.held.has('up') ? 1 : 0) - (inp.down || this.held.has('down') ? 1 : 0);
    this.pos.y += vert * speed;
    this.keepInside();
  }

  /** Puts the camera where the editor is, and updates what the crosshair is on. Call just before drawing. */
  applyCamera(): void {
    if (!this.open) return;
    const cam = this.host.camera;
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
    cam.position.copy(this.pos);
    cam.lookAt(this.pos.x + dir.x, this.pos.y + dir.y, this.pos.z + dir.z);

    this.ray.set(this.pos, dir);
    this.ray.far = 80;
    const hits = this.ray.intersectObjects(this.host.solids(), true).filter((h) => h.object.visible && (h.object as THREE.Mesh).isMesh);
    const first = hits[0];
    const before = `${this.hit ? `${this.hit.x.toFixed(1)},${this.hit.z.toFixed(1)},${this.hit.y.toFixed(1)}` : ''}|${this.targetIdx}|${this.bad}`;
    let aim: { x: number; y: number; z: number; dist: number } | null = null;
    if (first) {
      // On a wall, place against it rather than inside it.
      const n = first.face ? first.face.normal.clone().transformDirection(first.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      const p = first.point.clone();
      if (n.y < 0.5) p.addScaledVector(n, 0.5);
      this.hit = { x: p.x, y: n.y >= 0.5 ? p.y : Math.max(0, Math.floor(p.y)), z: p.z, dist: first.distance };
      aim = aimPoint(first.point, n, first.distance);
    } else this.hit = null;

    // The gold ghost: what Place would add (red when it would stick out of the room).
    const h = this.hit;
    this.bad = false;
    if (h) {
      const p = makePiece(this.t, h.x, h.y, h.z, { w: this.w, d: this.d, raise: this.raise(), dir: this.dir });
      this.bad = sticksOut(p, this.level.width, this.level.depth);
      (this.ghost.material as THREE.LineBasicMaterial).color.setHex(this.bad ? RED : GOLD);
      this.fit(this.ghost, p, h.y);
    }
    this.ghost.visible = !!h;
    // The blue box: the piece he is pointing at.
    this.targetIdx = pickPiece(this.level.pieces, this.pos, dir, aim);
    const tp = this.targetIdx >= 0 ? this.level.pieces[this.targetIdx] : null;
    if (tp) this.fit(this.target, tp, tp.bottom ?? (isSingle(tp.t) ? tp.top : Math.min(tp.top, 0)));
    this.target.visible = !!tp;
    const after = `${this.hit ? `${this.hit.x.toFixed(1)},${this.hit.z.toFixed(1)},${this.hit.y.toFixed(1)}` : ''}|${this.targetIdx}|${this.bad}`;
    if (after !== before && this.msgT <= 0) this.sync();
  }

  /** Stretches an outline box over a piece. */
  private fit(box: THREE.LineSegments, p: Piece, base: number): void {
    if (isSingle(p.t)) {
      box.scale.set(0.9, 0.9, 0.9);
      box.position.set(p.x0, p.top + 0.45, p.z0);
      return;
    }
    const lo = Math.min(base, p.top - 0.15);
    const hi = Math.max(p.top, lo + 0.15);
    box.scale.set(Math.abs(p.x1 - p.x0) || 0.2, hi - lo, Math.abs(p.z1 - p.z0) || 0.2);
    box.position.set((p.x0 + p.x1) / 2, (lo + hi) / 2, (p.z0 + p.z1) / 2);
  }
}
