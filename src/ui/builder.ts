/**
 * The level builder: a top-down grid editor drawn over the game. Pick a piece on the left, drag out a shape on the grid,
 * set its height, press PLAY to try it. Works with a mouse or a finger. Levels save to the device and can be copied out
 * as text, so they can be shared or kept in the game's files.
 */
import { BOX_TYPES, ENEMY_PIECES, CustomGoal, CustomLevel, Piece, PieceType, WEDGE_APPEARS, WedgeAppears, checkCustom, emptyCustom, parseCustom } from '../levels/custom';
import type { MyLevels } from '../levels/library';
import { compileCustom } from '../levels/custom';
import { computeReach, unreachable, ReachProblem } from '../levels/reach';
import { STAMPS, stampById } from '../levels/stamps';
import { groupCentre, piecesInBox, turnQuarter } from '../levels/groupOps';
import { SAMPLES } from '../levels/samples';
import { THEMES } from '../levels/themes';
import { TEXTURE_SETS } from '../render/textures';

export type ToolId = PieceType | 'select' | 'erase' | 'pan' | `stamp:${string}`;

const CSS = `
.rq-bld { position: absolute; inset: 0; z-index: 60; display: none; background: #0b100c; color: #efe9d2; font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: clamp(10px, 2.1vh, 15px); user-select: none; touch-action: none; }
.rq-bld.open { display: grid; grid-template-columns: 11.5em 1fr 12.5em; grid-template-rows: auto 1fr auto; }
.rq-bld .bar { grid-column: 1 / 4; display: flex; gap: 0.4em; padding: 0.4em; background: #162019; border-bottom: 1px solid #3a5040; align-items: center; flex-wrap: wrap; }
.rq-bld .side { background: #121a14; padding: 0.4em; overflow-y: auto; overflow-x: hidden; min-height: 0; }
.rq-bld .left { border-right: 1px solid #3a5040; } .rq-bld .right { border-left: 1px solid #3a5040; }
.rq-bld button, .rq-bld input, .rq-bld select { font: inherit; color: #efe9d2; background: #26362a; border: 1px solid #55705a; border-radius: 0.4em; padding: 0.3em 0.55em; }
.rq-bld button.on { background: #5a7a3a; border-color: #ffe27a; color: #fff6c8; }
.rq-bld button.go { background: #2f6a3a; border-color: #8aff8a; font-weight: 800; }
.rq-bld h4 { margin: 0.6em 0 0.25em; font-size: 0.85em; color: #ffe27a; letter-spacing: 0.1em; }
.rq-bld .pal { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25em; }
.rq-bld .pal button { text-align: left; padding: 0.3em 0.4em; }
.rq-bld canvas { width: 100%; height: 100%; display: block; background: #0f1611; }
.rq-bld .stat { grid-column: 1 / 4; padding: 0.3em 0.6em; background: #162019; border-top: 1px solid #3a5040; min-height: 1.6em; color: #c9d2b8; }
.rq-bld textarea { width: 100%; height: 7em; font: inherit; background: #0b100c; color: #cfe8c0; border: 1px solid #55705a; }
.rq-bld .row { display: flex; align-items: center; gap: 0.3em; margin: 0.25em 0; }
.rq-bld .props { margin-top: 0.3em; }
.rq-bld .props label { display: flex; align-items: center; justify-content: space-between; gap: 0.3em; margin: 0.2em 0; font-size: 0.9em; }
.rq-bld .props input[type=number] { width: 4.2em; } .rq-bld .props input[type=text], .rq-bld .props select { width: 6.5em; }
.rq-bld .props textarea { height: 8em; }
.rq-bld .dlg { position: absolute; inset: 8% 12%; z-index: 5; display: none; background: #121a14f8; border: 2px solid #8a9a6a; border-radius: 0.8em; padding: 0.8em 1em; overflow-y: auto; }
.rq-bld .dlg.on { display: block; }
.rq-bld .dlg label { display: inline-flex; align-items: center; gap: 0.3em; margin: 0.25em 0.8em 0.25em 0; }
.rq-bld .dlg .goal { display: flex; align-items: center; gap: 0.4em; margin: 0.3em 0; padding: 0.25em 0.4em; background: #1b2a1f; border-radius: 0.4em; }
.rq-bld .livepane { display: none; }
.rq-bld.live.open { grid-template-columns: 9.5em 1fr 24em; }
.rq-bld.live .livepane { display: block; position: relative; width: 100%; aspect-ratio: 4 / 3; background: #000; margin-bottom: 0.4em; border: 1px solid #55705a; overflow: hidden; }
.rq-bld.live .livepane canvas { position: absolute; inset: 0; }
.rq-bld.solo [data-a=close], .rq-bld.solo [data-a=play] { display: none; }
.rq-bld .info { color: #ffe9a0; margin-left: 0.4em; }
.rq-bld .row b { min-width: 3.2em; text-align: center; }
`;

export const TOOLS: Array<{ group: string; items: Array<{ t: ToolId; label: string }> }> = [
  { group: 'EDIT', items: [{ t: 'select', label: 'Select' }, { t: 'erase', label: 'Erase' }, { t: 'pan', label: 'Pan' }] },
  { group: 'GROUND', items: [{ t: 'floor', label: 'Floor' }, { t: 'tile', label: 'Tiles' }, { t: 'grate', label: 'Grating' }, { t: 'platform', label: 'Moss slab' }, { t: 'plank', label: 'Planks' }, { t: 'stone', label: 'Stone' }, { t: 'wall', label: 'Wall' }, { t: 'pillar', label: 'Pillar' }, { t: 'stairs', label: 'Stairs' }, { t: 'lift', label: 'Moving platform' }, { t: 'bridge', label: 'Rope bridge' }] },
  { group: 'WATER', items: [{ t: 'water', label: 'Pool' }, { t: 'river', label: 'River' }, { t: 'lava', label: 'Lava' }, { t: 'fall', label: 'Grate fall' }] },
  { group: 'BREAKABLE', items: [{ t: 'crate', label: 'Crate' }, { t: 'barrel', label: 'Barrel' }, { t: 'pipe', label: 'Wall pipe' }] },
  { group: 'COLLECT', items: [{ t: 'crumb', label: 'Crumb' }, { t: 'cap', label: 'Cap' }, { t: 'relic', label: 'Relic' }, { t: 'wedge', label: 'Gold Wedge' }] },
  { group: 'PEOPLE', items: [{ t: 'roach', label: 'Roach' }, { t: 'toad', label: 'Toad' }, { t: 'beetle', label: 'Ironback' }, { t: 'bat', label: 'Flitter' }, { t: 'guard', label: 'Keep Guard' }, { t: 'mantis', label: 'Orchid Mantis' }, { t: 'stag', label: 'Stag Knight' }, { t: 'npc', label: 'Pip' }] },
  { group: 'LEVEL', items: [{ t: 'gate', label: 'Gate' }, { t: 'plate', label: 'Floor plate' }, { t: 'mark', label: 'Goal marker' }, { t: 'spawn', label: 'Start' }, { t: 'exit', label: 'Exit' }] },
  { group: 'DECOR', items: [{ t: 'lamp', label: 'Lamp' }, { t: 'chain', label: 'Chain' }, { t: 'window', label: 'Window' }, { t: 'slime', label: 'Slime' }, { t: 'web', label: 'Cobweb' }, { t: 'brazier', label: 'Brazier' }, { t: 'speaker', label: 'Speaker' }, { t: 'couch', label: 'Couch' }, { t: 'light', label: 'Light' }, { t: 'banner', label: 'Banner' }, { t: 'torch', label: 'Wall torch' }, { t: 'gauge', label: 'Gauge' }, { t: 'crystal', label: 'Crystals' }, { t: 'roots', label: 'Roots' }] },
  { group: 'SHAPES', items: STAMPS.map((st) => ({ t: `stamp:${st.id}` as ToolId, label: st.label })) },
];
const COLOR: Record<PieceType, string> = {
  floor: '#4a5a4a', tile: '#6a7a7a', grate: '#5a6a5a', platform: '#5a7a4a', plank: '#8a5a32', stone: '#7a7a6a', wall: '#3a3a44', pillar: '#9a9a88',
  water: '#2a9a4a', river: '#3ac05a', crate: '#c08a4a', barrel: '#a06a3a', crumb: '#ffd23a', cap: '#d85a5a', relic: '#ffe27a',
  roach: '#a04a6a', toad: '#6aa03a', beetle: '#6d7580', bat: '#8a5a8a', guard: '#7a4ab0', mantis: '#e88ab0', stag: '#3a6a78', npc: '#4a7aca', pipe: '#9a6a3a', fall: '#8aff8a', gate: '#caa84a', spawn: '#ffffff', exit: '#8ad8ff', plate: '#d8a83a', stairs: '#8a8a9a', lift: '#e0a040', lava: '#ff6a1a', bridge: '#b08850', web: '#d8d8cc', brazier: '#ff9a3a', speaker: '#7a5ac8', couch: '#a8584a', light: '#ff4a4a', mark: '#ff9ad8', lamp: '#ffd27a', chain: '#9a9aaa', window: '#8ab8d8', slime: '#6adc6a', wedge: '#ffc93a',
  banner: '#7a3aa8', torch: '#ffb040', gauge: '#c0a050', crystal: '#5ac8ff', roots: '#6a4a2a'
};
export const SINGLE = new Set<PieceType>(['crate', 'barrel', 'crumb', 'cap', 'relic', 'roach', 'toad', 'beetle', 'bat', 'guard', 'mantis', 'stag', 'npc', 'pipe', 'fall', 'mark', 'plate', 'lamp', 'chain', 'window', 'slime', 'web', 'brazier', 'speaker', 'couch', 'light', 'banner', 'torch', 'gauge', 'crystal', 'roots', 'spawn', 'exit', 'wedge']);
const DIRS: Array<'n' | 'e' | 's' | 'w'> = ['n', 'e', 's', 'w'];
/** Ready-made characters: picking one sets the name and the creature. */
const CHARACTERS: Array<[string, string, 'mouse' | 'bird' | 'pigeon' | 'villain']> = [
  ['pip', 'PIP', 'mouse'], ['finch', 'FINCH', 'bird'], ['dave', 'DIZZY DAVE', 'pigeon'], ['mort', 'MELLOW MORT', 'mouse'],
  ['wren', 'WREN', 'bird'], ['grim', 'LORD GRIMSQUEAK', 'villain'], ['mouse', '', 'mouse'], ['bird', '', 'bird'],
];

export interface BuilderHost {
  storage: { getItem(k: string): string | null; setItem(k: string, v: string): void };
  /** The player's saved levels (My Levels), shared with the game. */
  library?: MyLevels;
  /** Tries the level in the game. */
  play(level: CustomLevel): void;
  /** Called when the builder closes. */
  onClose(): void;
  /** 3D editing: flies through the level in the game; `done` gets the level back when he returns to the map. */
  fly?(level: CustomLevel, done: (level: CustomLevel) => void, jumpCheck: boolean): void;
  /** Live mode: shows the game inside the builder. `restart` puts him back at the start; otherwise he stays where he is. */
  live?: {
    update(level: CustomLevel, restart: boolean): void;
    /** Moves the game picture into the given box (or back out with null). */
    attachView(box: HTMLElement | null): void;
  };
}

export class Builder {
  private readonly root: HTMLDivElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stat: HTMLDivElement;
  private readonly text: HTMLTextAreaElement;
  private readonly heightEl: HTMLElement;
  private readonly dirBtn: HTMLButtonElement;
  private level: CustomLevel;
  private tool: ToolId = 'floor';
  private cursor: { x: number; z: number } | null = null;
  private dlg!: HTMLDivElement;
  private propsEl!: HTMLDivElement;
  private dlgOpen = false;
  private dlgMode: 'level' | 'samples' | 'mine' = 'level';
  /** Which of My Levels this is (null: not saved there yet). */
  private slotId: string | null = null;
  /** The jump checker: on or off, and what it found for the level as it was last checked. */
  private reachOn = false;
  private reachJson = '';
  private reachTimer = 0;
  private reach: { points: Array<[number, number, number]>; problems: ReachProblem[]; traps: Array<[number, number, number]> } | null = null;
  /** A Delete in My Levels waiting for its second tap. */
  private armedDelete = '';
  private live_ = false;
  private liveTimer = 0;
  private liveJson = '';
  private hover = false;
  private playerAt: { x: number; z: number; f: number } | null = null;
  private infoEl!: HTMLSpanElement;
  private paneEl!: HTMLDivElement;
  private firstTime = false;
  private top = 0;
  private dir: 'n' | 'e' | 's' | 'w' = 'n';
  private selected = -1;
  private view = { x: 0, z: 0, scale: 14 };
  private drag: { mode: 'draw' | 'pan' | 'move' | 'box'; sx: number; sz: number; cx: number; cz: number; px?: number; py?: number; orig?: Piece; origs?: Piece[]; moved?: boolean } | null = null;
  /** Several pieces chosen at once (box-select, Add, or a shape just placed). Empty: just `selected`, if any. */
  private group: number[] = [];
  /** Tapping with Select adds to (or takes from) the group instead of choosing one piece. */
  private adding = false;
  private open_ = false;
  private undoStack: string[] = [];

  constructor(parent: HTMLElement, private readonly host: BuilderHost) {
    if (!document.getElementById('rq-bld-css')) {
      const st = document.createElement('style');
      st.id = 'rq-bld-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const saved = this.restore();
    this.slotId = host.storage.getItem('ratquest.custom.slot') || null;
    this.reachOn = host.storage.getItem('ratquest.builder.reach') === '1';
    if (this.slotId && !host.library?.get(this.slotId)) this.slotId = null;
    this.firstTime = saved === null;
    this.level = saved ?? emptyCustom();
    this.root = document.createElement('div');
    this.root.className = 'rq-bld';
    this.root.innerHTML = `
      <div class="bar">
        <b>BUILDER</b>
        <input data-f="name" size="14" />
        W<input data-f="width" type="number" style="width:3.6em" /> D<input data-f="depth" type="number" style="width:3.6em" />
        <button data-a="live" class="go">WATCH + PLAY</button><button data-a="fly" class="go">3D EDIT</button><button data-a="reach">JUMP CHECK</button><span class="info"></span>
        <button data-a="samples">SAMPLES</button><button data-a="level">LEVEL</button>
        <button data-a="undo">Undo</button><button data-a="dup">Duplicate</button><button data-a="clear">Clear</button>
        <button data-a="mine">MY LEVELS</button><button data-a="save">Save</button><button data-a="export">Copy text</button><button data-a="import">Load text</button>
        <button class="go" data-a="playhere">PLAY HERE</button><button class="go" data-a="play">PLAY</button><button data-a="close">Close</button>
      </div>
      <div class="side left"></div>
      <canvas></canvas>
      <div class="side right">
        <div class="livepane"></div>
        <h4>HEIGHT</h4>
        <div class="row"><button data-a="h-">-</button><b data-h></b><button data-a="h+">+</button></div>
        <div class="row"><button data-a="hs-">-.3</button><button data-a="hs+">+.3</button></div>
        <h4>FACING</h4><div class="row"><button data-a="dir"></button></div>
        <h4>ZOOM</h4><div class="row"><button data-a="z-">-</button><button data-a="z+">+</button><button data-a="fit">Fit</button></div>
        <h4>PIECE</h4><div class="row"><button data-a="del">Delete</button><button data-a="rot">Turn 90°</button></div><div class="row"><button data-a="adding">Add to group</button></div>
        <div class="row"><button data-a="up">Raise</button><button data-a="down">Lower</button></div>
        <div class="props"></div>
        <h4>TEXT</h4><textarea spellcheck="false"></textarea>
      </div>
      <div class="dlg"></div>
      <div class="stat"></div>`;
    parent.appendChild(this.root);
    this.canvas = this.root.querySelector('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.stat = this.root.querySelector('.stat') as HTMLDivElement;
    this.dlg = this.root.querySelector('.dlg') as HTMLDivElement;
    this.infoEl = this.root.querySelector('.info') as HTMLSpanElement;
    this.paneEl = this.root.querySelector('.livepane') as HTMLDivElement;
    this.canvas.addEventListener('pointerenter', () => (this.hover = true));
    this.canvas.addEventListener('pointerleave', () => (this.hover = false));
    this.propsEl = this.root.querySelector('.props') as HTMLDivElement;
    this.text = this.root.querySelector('textarea') as HTMLTextAreaElement;
    this.heightEl = this.root.querySelector('[data-h]') as HTMLElement;
    this.dirBtn = this.root.querySelector('[data-a="dir"]') as HTMLButtonElement;
    const left = this.root.querySelector('.left') as HTMLDivElement;
    left.innerHTML = TOOLS.map((g) => `<h4>${g.group}</h4><div class="pal">${g.items.map((i) => `<button data-tool="${i.t}">${i.label}</button>`).join('')}</div>`).join('');
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('change', (e) => this.onField(e));
    this.canvas.addEventListener('pointerdown', (e) => this.down(e));
    this.canvas.addEventListener('pointermove', (e) => this.move(e));
    this.canvas.addEventListener('pointerup', (e) => this.up(e));
    this.canvas.addEventListener('pointercancel', () => (this.drag = null));
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (!this.open_ || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'SELECT') return;
      // In live mode the keys belong to the game, except while the pointer is over the map.
      if (this.live_ && !this.hover) return;
      if (e.code === 'Delete' || e.code === 'Backspace') this.deleteSelected();
      else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) this.undo();
      else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.duplicate();
      } else if (e.code.startsWith('Arrow') && (this.selected >= 0 || this.group.length)) {
        e.preventDefault();
        const dx = e.code === 'ArrowRight' ? 1 : e.code === 'ArrowLeft' ? -1 : 0;
        const dz = e.code === 'ArrowDown' ? 1 : e.code === 'ArrowUp' ? -1 : 0;
        this.applyToSelected((p) => this.shift(p, dx, dz));
        this.sync();
      }
      e.stopPropagation();
    });
    new ResizeObserver(() => this.draw()).observe(this.canvas);
    this.sync();
  }

  get open(): boolean {
    return this.open_;
  }

  /** True while the game is shown inside the builder and keeps running. */
  get live(): boolean {
    return this.live_ && this.open_;
  }

  /** The editor as its own program: no way out, and it starts straight in the live view. */
  standalone(): void {
    this.root.classList.add('solo');
    document.title = 'RATQUEST Level Editor';
    this.show();
    this.setLive(true);
  }

  /** Development aid: opens a sample and starts watching it. */
  demo(sampleId: string): void {
    const sm = SAMPLES.find((x) => x.id === sampleId);
    const copy = sm ? parseCustom(JSON.stringify(sm.level)) : null;
    if (!copy) return;
    this.level = copy;
    this.dlgOpen = false;
    this.fit();
    this.setLive(true);
  }

  /** Where the rat is in the game, drawn on the map while watching. */
  setPlayer(x: number, z: number, facing: number): void {
    const p = this.playerAt;
    if (p && Math.abs(p.x - x) < 0.15 && Math.abs(p.z - z) < 0.15 && Math.abs(p.f - facing) < 0.2) return;
    this.playerAt = { x, z, f: facing };
    this.draw();
  }

  /** A line of game status (goal, health) shown in the top bar while watching. */
  info(text: string): void {
    if (this.infoEl.textContent !== text) this.infoEl.textContent = text;
  }

  private setLive(on: boolean): void {
    if (on === this.live_ || !this.host.live) return;
    if (on) {
      const problems = checkCustom(this.level);
      if (problems.length) return this.say(problems.join(' '));
      this.live_ = true;
      this.root.classList.add('live');
      this.host.live.attachView(this.paneEl);
      this.liveJson = JSON.stringify(this.level);
      this.host.live.update(this.level, true);
      this.say('Watching live. Edit the map and the game updates; play with your keyboard or pad. Pointer over the map: keys edit instead.');
    } else {
      this.live_ = false;
      window.clearTimeout(this.liveTimer);
      this.root.classList.remove('live');
      this.host.live.attachView(null);
      this.infoEl.textContent = '';
    }
    this.fit();
    this.sync();
  }

  /** After an edit while watching: reload the game with the change, a moment after the last edit. */
  private liveRefresh(restart = false): void {
    if (!this.live_ || !this.host.live) return;
    const json = JSON.stringify(this.level);
    if (json === this.liveJson && !restart) return;
    window.clearTimeout(this.liveTimer);
    this.liveTimer = window.setTimeout(() => {
      if (!this.live_ || !this.host.live) return;
      if (checkCustom(this.level).length) return;
      this.liveJson = JSON.stringify(this.level);
      this.host.live.update(this.level, restart);
    }, restart ? 0 : 300);
  }

  show(level?: CustomLevel): void {
    if (level) this.level = level;
    this.open_ = true;
    this.root.classList.add('open');
    if (this.firstTime) {
      // The first time, show the example levels so there is something to learn from.
      this.firstTime = false;
      this.dlgOpen = true;
      this.dlgMode = 'samples';
    }
    this.fit();
    this.sync();
    this.say('Pick a piece, then drag on the grid. PLAY tries it.');
    requestAnimationFrame(() => this.draw());
  }

  hide(): void {
    if (this.live_) this.setLive(false);
    this.open_ = false;
    this.root.classList.remove('open');
    this.host.onClose();
  }

  /** The level as it is now. */
  current(): CustomLevel {
    return this.level;
  }

  private restore(): CustomLevel | null {
    try {
      const raw = this.host.storage.getItem('ratquest.custom.v1');
      return raw ? parseCustom(raw) : null;
    } catch {
      return null;
    }
  }

  private say(s: string): void {
    this.stat.textContent = s;
  }

  private push(): void {
    this.undoStack.push(JSON.stringify(this.level));
    if (this.undoStack.length > 60) this.undoStack.shift();
  }
  private undo(): void {
    const s = this.undoStack.pop();
    if (!s) return this.say('Nothing to undo.');
    const l = parseCustom(s);
    if (l) this.level = l;
    this.selected = -1; this.group = [];
    this.sync();
  }

  private sync(): void {
    (this.root.querySelector('[data-f="name"]') as HTMLInputElement).value = this.level.name;
    (this.root.querySelector('[data-f="width"]') as HTMLInputElement).value = String(this.level.width);
    (this.root.querySelector('[data-f="depth"]') as HTMLInputElement).value = String(this.level.depth);
    this.heightEl.textContent = this.top.toFixed(1);
    this.dirBtn.textContent = { n: 'North', e: 'East', s: 'South', w: 'West' }[this.dir];
    this.root.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach((b) => b.classList.toggle('on', b.dataset.tool === this.tool));
    this.renderProps();
    this.renderDialog();
    (this.root.querySelector('[data-a="reach"]') as HTMLButtonElement).classList.toggle('on', this.reachOn);
    this.draw();
    this.liveRefresh();
    this.reachRefresh();
  }

  /** Whether the jump checker is on (3D editing shows its findings too). */
  get jumpCheck(): boolean {
    return this.reachOn;
  }

  /** Runs the jump checker a moment after the last edit (it takes a little while on a big level). */
  private reachRefresh(now = false): void {
    if (!this.reachOn) return;
    const json = JSON.stringify(this.level.pieces) + this.level.width + this.level.depth;
    if (json === this.reachJson && this.reach) return;
    window.clearTimeout(this.reachTimer);
    this.reachTimer = window.setTimeout(() => {
      this.reachJson = json;
      try {
        const def = compileCustom(this.level);
        const map = computeReach(def);
        const problems = unreachable(def, map);
        const reach = { points: map.points, problems, traps: [] as Array<[number, number, number]> };
        this.reach = reach;
        const list = problems.slice(0, 4).map((p) => `${p.what} (${Math.round(p.x)}, ${Math.round(p.z)})`).join(', ');
        const said = problems.length ? `Jump check: ${problems.length} out of reach (red on the map): ${list}${problems.length > 4 ? '...' : ''}` : 'Jump check: everything can be reached. Green shows where he can get to.';
        this.say(said);
        // Then the other way (it takes a moment longer, so the map shows first): places he can get into but never back
        // out of to the door, in orange.
        this.reachTimer = window.setTimeout(() => {
          if (this.reach !== reach || this.reachJson !== json) return;
          try {
            reach.traps = computeReach(def, { traps: true }).traps ?? [];
          } catch {
            return;
          }
          if (reach.traps.length) this.say(`${said} Orange: he could get stuck there, with no way back to the door (near ${Math.round(reach.traps[0][0])}, ${Math.round(reach.traps[0][1])}).`);
          this.draw();
        }, 60);
      } catch {
        this.reach = null;
      }
      this.draw();
    }, now ? 0 : 400);
  }

  private shift(p: Piece, dx: number, dz: number): void {
    p.x0 += dx;
    p.x1 += dx;
    p.z0 += dz;
    p.z1 += dz;
  }

  private duplicate(): void {
    if (this.group.length) {
      this.push();
      const copies = this.group.map((k) => JSON.parse(JSON.stringify(this.level.pieces[k])) as Piece);
      for (const c of copies) this.shift(c, 2, 2);
      const n = this.level.pieces.length;
      this.level.pieces.push(...copies);
      this.group = copies.map((_, k) => n + k);
      this.say(`${copies.length} pieces copied (the copy is selected).`);
      this.sync();
      return;
    }
    const p = this.level.pieces[this.selected];
    if (!p || p.t === 'spawn' || p.t === 'exit') return this.say('Select something to duplicate (not the start or exit).');
    this.push();
    const c: Piece = JSON.parse(JSON.stringify(p)) as Piece;
    this.shift(c, 1, 1);
    this.level.pieces.push(c);
    this.selected = this.level.pieces.length - 1;
    this.say('Duplicated. Drag it, or use the arrow keys.');
    this.sync();
  }

  private onField(e: Event): void {
    const t = e.target as HTMLInputElement;
    const ds = t.dataset;
    if (ds.f) {
      this.push();
      if (ds.f === 'name') this.level.name = t.value;
      else this.level[ds.f as 'width' | 'depth'] = Math.min(120, Math.max(10, Number(t.value) || 40));
      return this.sync();
    }
    // Level settings in the dialog.
    if (ds.l) {
      this.push();
      const v = t.value;
      if (ds.l === 'name') this.level.name = v;
      else if (ds.l === 'blurb') this.level.blurb = v;
      else if (ds.l === 'theme') this.level.theme = THEMES.find((th) => th.id === v)?.id;
      else if (ds.l === 'music') this.level.music = v === 'pump' || v === 'drift' || v === 'groove' || v === 'echo' || v === 'march' ? v : undefined;
      else if (ds.l === 'width' || ds.l === 'depth') this.level[ds.l] = Math.min(120, Math.max(10, Number(v) || 40));
      else if (ds.l === 'hubDoor') {
        if (v === 'west' || v === 'east') this.level.hubDoor = v;
        else delete this.level.hubDoor;
      } else if (ds.l === 'noGrab' || ds.l === 'noLongJump') {
        if (t.checked) this.level[ds.l] = true;
        else delete this.level[ds.l];
      } else if (ds.l === 'hubNeed') this.level.hubNeed = Math.max(0, Math.round(Number(v) || 0));
      else if (ds.l === 'wallHeight') this.level.wallHeight = Math.min(40, Math.max(4, Number(v) || 12));
      return this.sync();
    }
    if (ds.g) {
      const [i, field] = ds.g.split(':');
      const g = this.level.goals?.[Number(i)];
      if (!g || g.type !== 'collect') return;
      this.push();
      if (field === 'kind') g.kind = t.value as 'crumb' | 'cap' | 'relic';
      else g.count = /^all$/i.test(t.value.trim()) ? 'all' : Math.max(1, Math.round(Number(t.value) || 1));
      return this.sync();
    }
    const p = this.level.pieces[this.selected];
    if (!p) return;
    if (ds.p === 'skin') {
      this.push();
      if (t.value) p.skin = t.value as typeof p.skin;
      else delete p.skin;
      return this.sync();
    }
    if (ds.p) {
      this.push();
      const k = ds.p as 'x0' | 'z0' | 'x1' | 'z1' | 'top' | 'bottom';
      const n = Number(t.value);
      if (!Number.isFinite(n)) return this.sync();
      if (k === 'bottom' && t.value.trim() === '') delete p.bottom;
      else p[k] = Math.round(n * 10) / 10;
      if (SINGLE.has(p.t)) {
        p.x1 = p.x0;
        p.z1 = p.z0;
      }
      return this.sync();
    }
    if (ds.pp) {
      this.push();
      const props = (p.props ??= {});
      if (ds.pp === 'who') {
        const c = CHARACTERS.find((x) => x[0] === t.value);
        if (c) {
          props.kind = c[2];
          if (c[1]) props.name = c[1];
        }
      } else if (ds.pp === 'auto') props.auto = t.checked ? 3 : undefined;
      else if (ds.pp === 'hint') props.hint = t.value;
      else if (ds.pp === 'appears') props.appears = (WEDGE_APPEARS.find((a) => a[0] === t.value)?.[0] ?? 'start') as WedgeAppears;
      else if (ds.pp === 'name') props.name = t.value;
      else if (ds.pp === 'kind') props.kind = t.value === 'bird' ? 'bird' : t.value === 'villain' ? 'villain' : t.value === 'pigeon' ? 'pigeon' : 'mouse';
      else if (ds.pp === 'lines') props.lines = t.value.split('\n');
      else if (ds.pp === 'item') {
        if (t.value === 'crumb' || t.value === 'cap' || t.value === 'relic') props.item = t.value;
        else delete props.item;
      } else if (ds.pp === 'respawn') props.respawn = t.checked;
      else if (ds.pp === 'wave') props.wave = Math.max(0, Math.round(Number(t.value) || 0));
      else if (ds.pp === 'move') props.move = (['up', 'n', 'e', 's', 'w'] as const).find((m) => m === t.value) ?? 'up';
      else if (ds.pp === 'travel') props.travel = Math.max(0.5, Number(t.value) || 4);
      else if (ds.pp === 'speed') props.speed = Math.max(0.5, Number(t.value) || 2);
      else if (ds.pp === 'pause') props.pause = Math.max(0, Number(t.value) || 0);
      else if (ds.pp === 'color') props.color = t.value;
      else if (ds.pp === 'flash') props.flash = Math.max(0, Math.min(8, Number(t.value) || 0));
      else if (ds.pp === 'opens') props.opens = t.value === 'pipes' ? 'pipes' : t.value === 'plates' ? 'plates' : 'goals';
      this.sync();
    }
  }

  /** The settings of the selected piece: exact numbers, and whatever else that kind of piece has. */
  private renderProps(): void {
    (this.root.querySelector('[data-a="adding"]') as HTMLButtonElement | null)?.classList.toggle('on', this.adding);
    if (this.group.length > 1) {
      this.propsEl.innerHTML = `<h4>GROUP: ${this.group.length} PIECES</h4><div style="color:#c9d2b8">Drag any of them to move them all. Arrow keys nudge. Turn 90°, Duplicate, Delete, Raise and Lower work on all of them.</div>`;
      return;
    }
    const p = this.level.pieces[this.selected];
    if (!p) {
      this.propsEl.innerHTML = '';
      return;
    }
    const single = SINGLE.has(p.t);
    const num = (k: string, label: string, v: number | undefined): string => `<label>${label}<input type="number" step="0.5" data-p="${k}" value="${v ?? ''}" /></label>`;
    let h = `<h4>${p.t.toUpperCase()}</h4>` + num('x0', single ? 'x' : 'x from', p.x0) + num('z0', single ? 'z' : 'z from', p.z0);
    if (!single) h += num('x1', 'x to', p.x1) + num('z1', 'z to', p.z1);
    h += num('top', p.t === 'stairs' ? 'top' : 'height', p.top);
    if (!single && p.t !== 'water' && p.t !== 'river' && p.t !== 'lava' && p.t !== 'bridge') h += num('bottom', p.t === 'stairs' ? 'start' : 'bottom', p.bottom);
    if (BOX_TYPES.includes(p.t)) {
      const groups: Array<[string, readonly string[]]> = [['sewer', TEXTURE_SETS.sewer], ['mine', TEXTURE_SETS.tunnel], ['cave', TEXTURE_SETS.cave], ['plain', TEXTURE_SETS.shared]];
      h += `<label>look<select data-p="skin"><option value="">level's look</option>${groups.map(([g, names]) => `<optgroup label="${g}">${names.map((n) => `<option value="${n}"${p.skin === n ? ' selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
    }
    if (p.t === 'npc') {
      const pr = p.props ?? {};
      h += `<label>name<input type="text" data-pp="name" value="${(pr.name ?? '').replace(/"/g, '&quot;')}" placeholder="${pr.kind === 'bird' ? 'FINCH' : 'PIP'}" /></label>`;
      const nm = (pr.name ?? '').toUpperCase();
      const preset = CHARACTERS.find((c) => c[1] && c[1] === nm && c[2] === (pr.kind ?? 'mouse'))?.[0] ?? ((pr.kind ?? 'mouse') === 'bird' ? 'bird' : 'mouse');
      h += `<label>character<select data-pp="who">${CHARACTERS.map(([id, n, k]) => `<option value="${id}"${id === preset ? ' selected' : ''}>${n ? n.toLowerCase() : `another ${k}`}</option>`).join('')}</select></label>`;
      h += `<label>talks when near<input type="checkbox" data-pp="auto"${pr.auto ? ' checked' : ''} /></label>`;
      h += `<label>looks like<select data-pp="kind"><option value="mouse"${pr.kind !== 'bird' && pr.kind !== 'villain' && pr.kind !== 'pigeon' ? ' selected' : ''}>mouse</option><option value="bird"${pr.kind === 'bird' ? ' selected' : ''}>bird</option><option value="villain"${pr.kind === 'villain' ? ' selected' : ''}>villain</option><option value="pigeon"${pr.kind === 'pigeon' ? ' selected' : ''}>pigeon</option></select></label>`;
      h += `<div>says (one box per line):</div><textarea data-pp="lines" spellcheck="false">${(pr.lines ?? []).join('\n').replace(/</g, '&lt;')}</textarea>`;
    }
    if (p.t === 'wedge') {
      const pr = p.props ?? {};
      const i = this.level.pieces.filter((q) => q.t === 'wedge').indexOf(p);
      h += `<label>name<input type="text" data-pp="name" value="${(pr.name ?? '').replace(/"/g, '&quot;')}" placeholder="Golden Wedge ${i + 1}" /></label>`;
      h += `<label>clue<input type="text" data-pp="hint" value="${(pr.hint ?? '').replace(/"/g, '&quot;')}" placeholder="for the quest screen" /></label>`;
      h += `<label>appears<select data-pp="appears">${WEDGE_APPEARS.map(([v, l]) => `<option value="${v}"${(pr.appears ?? 'start') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
      if ((pr.appears ?? 'start') === 'reach' && !this.level.pieces.some((q) => q.t === 'mark')) h += '<div style="color:#ff9a6a">Place a goal marker for this.</div>';
      h += '<div style="color:#c9d2b8">Golden Wedges make this an open course: the first one taken opens the door.</div>';
    }
    if (p.t === 'crate' || p.t === 'barrel') {
      const it = p.props?.item ?? '';
      h += `<label>inside<select data-pp="item">${['', 'crumb', 'cap', 'relic'].map((o) => `<option value="${o}"${o === it ? ' selected' : ''}>${o || 'nothing'}</option>`).join('')}</select></label>`;
    }
    if (p.t === 'light') {
      const lc = p.props?.color ?? 'red';
      h += `<label>colour<select data-pp="color">${['red', 'yellow', 'blue', 'green', 'purple', 'white'].map((c) => `<option value="${c}"${lc === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label>`;
      h += `<label>flashes a second<input type="number" step="0.5" min="0" max="8" data-pp="flash" value="${p.props?.flash ?? 0}" /> (0 = steady)</label>`;
    }
    if (p.t === 'banner' || p.t === 'crystal') {
      const opts = p.t === 'banner' ? ['purple', 'red', 'green', 'blue', 'black', 'gold'] : ['blue', 'purple', 'green', 'yellow', 'red', 'white'];
      const cur = p.props?.color ?? opts[0];
      h += `<label>colour<select data-pp="color">${opts.map((c) => `<option value="${c}"${cur === c ? ' selected' : ''}>${c}</option>`).join('')}</select></label>`;
    }
    if (ENEMY_PIECES.includes(p.t)) h += `<label>wave (0 = at start)<input type="number" min="0" step="1" data-pp="wave" value="${p.props?.wave ?? 0}" /></label>`;
    if (p.t === 'gate') {
      const o = p.props?.opens ?? 'goals';
      h += `<label>opens when<select data-pp="opens">${([['goals', 'goals are done'], ['pipes', 'pipes burst'], ['plates', 'plates pressed']] as const).map(([v, l]) => `<option value="${v}"${o === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
    }
    if (p.t === 'lift') {
      const pr = p.props ?? {};
      const mv = pr.move ?? 'up';
      h += `<label>glides<select data-pp="move">${([['up', 'up and down'], ['n', 'north'], ['e', 'east'], ['s', 'south'], ['w', 'west']] as const).map(([v, l]) => `<option value="${v}"${mv === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
      h += `<label>distance<input type="number" step="0.5" min="0.5" data-pp="travel" value="${pr.travel ?? 4}" /></label>`;
      h += `<label>speed<input type="number" step="0.5" min="0.5" data-pp="speed" value="${pr.speed ?? 2}" /></label>`;
      h += `<label>waits (s)<input type="number" step="0.5" min="0" data-pp="pause" value="${pr.pause ?? 1.5}" /></label>`;
    }
    if (ENEMY_PIECES.includes(p.t)) h += `<label>comes back<input type="checkbox" data-pp="respawn"${p.props?.respawn ? ' checked' : ''} /></label>`;
    this.propsEl.innerHTML = h;
  }

  /** The level settings box: name, size, music and goals. */
  private renderDialog(): void {
    this.dlg.classList.toggle('on', this.dlgOpen);
    if (!this.dlgOpen) return;
    if (this.dlgMode === 'samples') {
      this.dlg.innerHTML = `
        <div class="row"><b style="min-width:0">SAMPLE LEVELS</b><button data-a="level">Close</button></div>
        <div style="margin:0.3em 0 0.6em;color:#c9d2b8">Open one, look around (select pieces to see their settings), play it in the game window, then change things. Your own saved level is not touched until you press Save.</div>
        ${SAMPLES.map((x) => `<div class="goal"><div style="flex:1"><b style="color:#ffe27a;min-width:0">${x.title}</b><div style="color:#c9d2b8">${x.lesson}</div></div><button class="go" data-a="sample:${x.id}">Open</button></div>`).join('')}`;
      return;
    }
    const esc = (v: string): string => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    if (this.dlgMode === 'mine') {
      const list = this.host.library?.list() ?? [];
      const row = (m: { id: string; level: CustomLevel }): string => {
        const w = m.level.pieces.filter((p) => p.t === 'wedge').length;
        const tags = [w ? `${w} wedge${w === 1 ? '' : 's'}` : '', m.level.hubDoor ? `Club ${m.level.hubDoor === "west" ? "left" : "right"} guest door, needs ${m.level.hubNeed ?? 0}` : '', m.id === this.slotId ? 'open now' : ''].filter(Boolean).join(' · ');
        return `<div class="goal"><div style="flex:1"><b style="color:#ffe27a;min-width:0">${esc(m.level.name)}</b><div style="color:#c9d2b8">${tags || 'a level'}</div></div><button class="go" data-a="mopen:${m.id}">Open</button><button data-a="mdel:${m.id}">${this.armedDelete === m.id ? 'Sure? Tap again' : 'Delete'}</button></div>`;
      };
      this.dlg.innerHTML = `
        <div class="row"><b style="min-width:0">MY LEVELS</b><button data-a="mine">Close</button></div>
        <div style="margin:0.3em 0 0.6em;color:#c9d2b8">Saved levels show in the game's LEVELS menu. Give one Golden Wedges and hang it on a Club door in LEVEL settings. To make one part of the game for good, press Copy text and send it to Claude.</div>
        <div class="row"><button class="go" data-a="mnew">+ New level</button><button data-a="mcopy">Save this as a copy</button></div>
        ${list.map(row).join('') || '<div style="color:#c9d2b8">Nothing saved yet. Press Save to keep the level you are building.</div>'}`;
      return;
    }
    const L = this.level;
    const goals = L.goals ?? [];
    const goalRow = (g: CustomGoal, i: number): string => {
      if (g.type === 'collect') {
        return `<div class="goal">Collect <input type="text" data-g="${i}:count" size="3" value="${g.count}" /> <select data-g="${i}:kind">${(['crumb', 'cap', 'relic'] as const).map((k) => `<option value="${k}"${k === g.kind ? ' selected' : ''}>${k}s</option>`).join('')}</select> (type "all" for every one) <button data-a="gdel:${i}">Remove</button></div>`;
      }
      const text = { defeat: 'Defeat every enemy', waves: 'Beat every wave of enemies', burst: 'Burst every wall pipe', reach: 'Reach the goal marker' }[g.type];
      return `<div class="goal">${text} <button data-a="gdel:${i}">Remove</button></div>`;
    };
    this.dlg.innerHTML = `
      <div class="row"><b style="min-width:0">LEVEL SETTINGS</b><button data-a="level">Done</button></div>
      <label>Name <input type="text" data-l="name" size="16" value="${esc(L.name)}" /></label>
      <label>Description <input type="text" data-l="blurb" size="30" value="${esc(L.blurb ?? '')}" /></label><br />
      <label>Width <input type="number" data-l="width" style="width:4em" value="${L.width}" /></label>
      <label>Depth <input type="number" data-l="depth" style="width:4em" value="${L.depth}" /></label>
      <label>Wall height <input type="number" data-l="wallHeight" style="width:4em" value="${L.wallHeight}" /></label>
      <label>Look <select data-l="theme">${THEMES.map((th) => `<option value="${th.id}"${(L.theme ?? 'sewer') === th.id ? ' selected' : ''}>${th.label}</option>`).join('')}</select></label>
      <label>Music <select data-l="music"><option value="">calm drift (default)</option><option value="pump"${L.music === 'pump' ? ' selected' : ''}>pumping beat</option><option value="groove"${L.music === 'groove' ? ' selected' : ''}>Dave's groove</option><option value="echo"${L.music === 'echo' ? ' selected' : ''}>cave echo</option><option value="march"${L.music === 'march' ? ' selected' : ''}>villain's march</option></select></label>
      <h4>MOVES</h4>
      <label>No ledge grab here <input type="checkbox" data-l="noGrab"${L.noGrab ? ' checked' : ''} /></label>
      <label>No long jump here <input type="checkbox" data-l="noLongJump"${L.noLongJump ? ' checked' : ''} /></label>
      <h4>THE CLUB</h4>
      <label>Door <select data-l="hubDoor"><option value="">not in the Club</option><option value="west"${L.hubDoor === 'west' ? ' selected' : ''}>Left guest door (south wall)</option><option value="east"${L.hubDoor === 'east' ? ' selected' : ''}>Right guest door (south wall)</option></select></label>
      <label>Wedges needed to open it <input type="number" min="0" data-l="hubNeed" style="width:4em" value="${L.hubNeed ?? 0}" /></label>
      <h4>GOALS (none = chosen automatically from what is in the level${L.pieces.some((p) => p.t === 'wedge') ? '; this level has Golden Wedges, so they are its goals and these are ignored' : ''})</h4>
      ${goals.map(goalRow).join('')}
      <div class="row"><button data-a="gadd:collect">+ Collect</button><button data-a="gadd:defeat">+ Defeat</button><button data-a="gadd:waves">+ Waves</button><button data-a="gadd:burst">+ Burst pipes</button><button data-a="gadd:reach">+ Reach marker</button></div>`;
  }

  private onClick(e: MouseEvent): void {
    const b = (e.target as HTMLElement).closest('button');
    if (!b) return;
    // A focused button would eat the space bar, which is the jump key.
    b.blur();
    const tool = b.dataset.tool as ToolId | undefined;
    if (tool) {
      this.tool = tool;
      this.selected = -1; this.group = [];
      return this.sync();
    }
    const act = b.dataset.a ?? '';
    if (act.startsWith('sample:')) {
      const sm = SAMPLES.find((x) => x.id === act.slice(7));
      const copy = sm ? parseCustom(JSON.stringify(sm.level)) : null;
      if (!sm || !copy) return;
      this.push();
      this.level = copy;
      this.selected = -1; this.group = [];
      this.dlgOpen = false;
      this.fit();
      this.say(`${sm.title}: ${sm.lesson}`);
      return this.sync();
    }
    if (act.startsWith('mopen:')) {
      const m = this.host.library?.get(act.slice(6));
      const copy = m ? parseCustom(JSON.stringify(m.level)) : null;
      if (!m || !copy) return;
      this.push();
      this.level = copy;
      this.slotId = m.id;
      this.host.storage.setItem('ratquest.custom.slot', m.id);
      this.selected = -1; this.group = [];
      this.dlgOpen = false;
      this.fit();
      this.say(`Opened "${copy.name}".`);
      return this.sync();
    }
    if (act.startsWith('mdel:')) {
      const id = act.slice(5);
      if (this.armedDelete !== id) {
        this.armedDelete = id;
        return this.sync();
      }
      this.armedDelete = '';
      this.host.library?.remove(id);
      if (this.slotId === id) this.slotId = null;
      this.say('Deleted.');
      return this.sync();
    }
    if (act === 'mnew' || act === 'mcopy') {
      this.push();
      if (act === 'mnew') this.level = emptyCustom();
      else this.level.name = `${this.level.name} copy`;
      this.slotId = null;
      this.save();
      this.dlgOpen = false;
      this.fit();
      return this.sync();
    }
    if (act.startsWith('gadd:')) {
      this.push();
      const t = act.slice(5);
      (this.level.goals ??= []).push(t === 'collect' ? { type: 'collect', kind: 'crumb', count: 'all' } : { type: t as 'defeat' | 'waves' | 'burst' | 'reach' });
      return this.sync();
    }
    if (act.startsWith('gdel:')) {
      this.push();
      this.level.goals?.splice(Number(act.slice(5)), 1);
      return this.sync();
    }
    switch (b.dataset.a) {
      case 'live': this.setLive(!this.live_); return;
      case 'level': this.dlgMode = 'level'; this.dlgOpen = !this.dlgOpen; break;
      case 'samples': this.dlgMode = 'samples'; this.dlgOpen = true; break;
      case 'reach':
        this.reachOn = !this.reachOn;
        this.host.storage.setItem('ratquest.builder.reach', this.reachOn ? '1' : '0');
        this.reach = null;
        if (this.reachOn) this.reachRefresh(true);
        else this.say('Jump check off.');
        break;
      case 'mine': this.dlgOpen = !(this.dlgOpen && this.dlgMode === 'mine'); this.dlgMode = 'mine'; this.armedDelete = ''; break;
      case 'dup': this.duplicate(); return;
      case 'playhere': {
        const problems = checkCustom(this.level);
        if (problems.length) return this.say(problems.join(' '));
        if (!this.cursor) return this.say('Tap the map where you want to start, then press PLAY HERE.');
        const copy = parseCustom(JSON.stringify(this.level));
        if (!copy) return;
        const at = this.cursor;
        let y = 0;
        for (const q of copy.pieces) {
          const ground = BOX_TYPES.includes(q.t) && q.t !== 'wall' && q.t !== 'pillar';
          if (ground && at.x >= Math.min(q.x0, q.x1) && at.x <= Math.max(q.x0, q.x1) && at.z >= Math.min(q.z0, q.z1) && at.z <= Math.max(q.z0, q.z1) && q.top > y) y = q.top;
        }
        const sp = copy.pieces.find((q) => q.t === 'spawn');
        if (sp) Object.assign(sp, { x0: at.x, x1: at.x, z0: at.z, z1: at.z, top: y });
        if (this.live_ && this.host.live) {
          this.host.live.update(copy, true);
          this.say('Moved him to that spot.');
          return;
        }
        this.hide();
        this.host.play(copy);
        return;
      }
      case 'h+': this.top += 0.5; break;
      case 'h-': this.top -= 0.5; break;
      case 'hs+': this.top += 0.3; break;
      case 'hs-': this.top -= 0.3; break;
      case 'dir': this.dir = DIRS[(DIRS.indexOf(this.dir) + 1) % 4]; this.applyToSelected((p) => (p.dir = this.dir)); break;
      case 'fit': this.fit(); break;
      case 'z+': this.zoom(1.3); break;
      case 'z-': this.zoom(1 / 1.3); break;
      case 'del': this.deleteSelected(); break;
      case 'adding': this.adding = !this.adding; this.say(this.adding ? 'Tap pieces to add them to the group (tap again to take one out).' : 'Tapping picks one piece again.'); break;
      case 'rot': {
        const ks = this.group.length ? this.group : this.selected >= 0 ? [this.selected] : [];
        if (!ks.length) return this.say('Select something to turn.');
        this.push();
        const ps = ks.map((k) => this.level.pieces[k]);
        const c = groupCentre(ps);
        turnQuarter(ps, c.x, c.z);
        break;
      }
      case 'up': this.applyToSelected((p) => (p.top += 0.5)); break;
      case 'down': this.applyToSelected((p) => (p.top -= 0.5)); break;
      case 'undo': this.undo(); break;
      case 'clear': this.push(); this.level = emptyCustom(); this.selected = -1; this.group = []; this.say('Cleared.'); break;
      case 'save': this.save(); break;
      case 'export': this.text.value = JSON.stringify(this.level); this.text.select(); try { void navigator.clipboard?.writeText(this.text.value); } catch { /* the text box still has it */ } this.say('The level is in the text box (copied if allowed).'); break;
      case 'import': {
        const l = parseCustom(this.text.value);
        if (!l) return this.say('That text is not a level.');
        this.push();
        this.level = l;
        this.selected = -1; this.group = [];
        this.say('Level loaded from the text box.');
        break;
      }
      case 'fly': {
        if (!this.host.fly) return;
        this.save(true);
        const before = JSON.stringify(this.level);
        const copy = JSON.parse(before) as CustomLevel;
        this.hide();
        this.host.fly(copy, (lvl) => {
          this.show();
          this.dlgOpen = false;
          if (JSON.stringify(lvl) !== before) {
            this.undoStack.push(before);
            this.level = lvl;
            this.save(true);
            this.sync();
            this.say('Back from 3D. Undo here takes back everything done there.');
          }
        }, this.reachOn);
        return;
      }
      case 'play': {
        const problems = checkCustom(this.level);
        if (problems.length) return this.say(problems.join(' '));
        this.save(true);
        this.hide();
        this.host.play(this.level);
        return;
      }
      case 'close': this.save(true); this.dlgOpen = false; this.hide(); return;
    }
    this.top = Math.round(this.top * 10) / 10;
    this.sync();
  }

  private save(quiet = false): void {
    try {
      this.host.storage.setItem('ratquest.custom.v1', JSON.stringify(this.level));
      if (this.host.library && (!quiet || this.slotId)) {
        this.slotId = this.host.library.put(this.slotId, this.level);
        this.host.storage.setItem('ratquest.custom.slot', this.slotId);
      }
      if (!quiet) this.say(this.host.library ? `Saved to My Levels as "${this.level.name}". It is in the game's LEVELS menu.` : 'Saved on this device.');
    } catch {
      if (!quiet) this.say('Could not save here. Use Copy text to keep it.');
    }
  }

  private applyToSelected(f: (p: Piece) => void): void {
    if (this.group.length) {
      this.push();
      for (const k of this.group) f(this.level.pieces[k]);
      return;
    }
    const p = this.level.pieces[this.selected];
    if (!p) return;
    this.push();
    f(p);
  }

  private deleteSelected(): void {
    if (this.group.length) {
      this.push();
      const gone = new Set(this.group);
      this.level.pieces = this.level.pieces.filter((_, k) => !gone.has(k));
      this.say(`${gone.size} pieces deleted.`);
      this.selected = -1; this.group = [];
      this.sync();
      return;
    }
    if (this.selected < 0) return;
    this.push();
    this.level.pieces.splice(this.selected, 1);
    this.selected = -1; this.group = [];
    this.sync();
  }

  /** Zooms so the whole room fits on the screen. */
  private fit(): void {
    const r = this.canvas.getBoundingClientRect();
    const w = r.width || 600;
    const h = r.height || 400;
    this.view.x = 0;
    this.view.z = 0;
    this.view.scale = Math.min(60, Math.max(4, Math.min(w / (this.level.width + 4), h / (this.level.depth + 4))));
  }

  private zoom(k: number): void {
    this.view.scale = Math.min(60, Math.max(4, this.view.scale * k));
    this.draw();
  }

  // ---- Grid <-> screen ----
  private toWorld(e: PointerEvent): { x: number; z: number } {
    const r = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * this.canvas.width;
    const sy = ((e.clientY - r.top) / r.height) * this.canvas.height;
    return { x: (sx - this.canvas.width / 2) / this.view.scale + this.view.x, z: (sy - this.canvas.height / 2) / this.view.scale + this.view.z };
  }
  private snap(v: number): number {
    return Math.round(v);
  }

  private down(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    const w = this.toWorld(e);
    const x = this.snap(w.x);
    const z = this.snap(w.z);
    this.cursor = { x, z };
    if (this.tool.startsWith('stamp:')) {
      const st = stampById(this.tool.slice(6));
      if (st) {
        this.push();
        const made = st.make(x, z, this.top);
        this.level.pieces.push(...made);
        const n = this.level.pieces.length;
        this.group = made.length > 1 ? made.map((_, k) => n - made.length + k) : [];
        this.selected = this.group.length ? -1 : n - 1;
        this.say(made.length > 1 ? `${st.label} placed. It is selected: drag it to move it, or Turn 90°.` : `${st.label} placed.`);
        this.sync();
      }
      return;
    }
    if (this.tool === 'pan' || e.button === 1 || e.button === 2) {
      this.drag = { mode: 'pan', sx: x, sz: z, cx: x, cz: z, px: e.clientX, py: e.clientY };
      return;
    }
    if (this.tool === 'select' || this.tool === 'erase') {
      const i = this.pick(w.x, w.z);
      if (this.tool === 'erase') {
        if (i >= 0) {
          this.push();
          this.level.pieces.splice(i, 1);
          this.selected = -1; this.group = [];
        }
      } else if (this.adding || e.shiftKey) {
        // Add to the group, or take out of it.
        if (i >= 0) {
          if (!this.group.length && this.selected >= 0 && this.selected !== i) this.group = [this.selected];
          this.group = this.group.includes(i) ? this.group.filter((k) => k !== i) : [...this.group, i];
          this.selected = this.group.length === 1 ? this.group[0] : -1;
          this.say(`${this.group.length} in the group.`);
        }
      } else if (i >= 0 && this.group.includes(i)) {
        // Drag the whole group.
        this.drag = { mode: 'move', sx: x, sz: z, cx: x, cz: z, origs: this.group.map((k) => JSON.parse(JSON.stringify(this.level.pieces[k])) as Piece), moved: false };
      } else if (i < 0) {
        // Empty ground: drag a box round several pieces.
        this.selected = -1;
        this.group = [];
        this.drag = { mode: 'box', sx: w.x, sz: w.z, cx: w.x, cz: w.z };
      } else {
        this.group = [];
        this.selected = i;
        if (i >= 0) {
          this.top = this.level.pieces[i].top;
          this.say(`${this.level.pieces[i].t}: drag to move, arrow keys nudge, numbers on the right.`);
          this.drag = { mode: 'move', sx: x, sz: z, cx: x, cz: z, orig: JSON.parse(JSON.stringify(this.level.pieces[i])) as Piece, moved: false };
        }
      }
      this.sync();
      return;
    }
    this.drag = { mode: 'draw', sx: x, sz: z, cx: x, cz: z };
    this.draw();
  }
  private move(e: PointerEvent): void {
    if (!this.drag) return;
    if (this.drag.mode === 'pan') {
      const r = this.canvas.getBoundingClientRect();
      const k = this.canvas.width / r.width / this.view.scale;
      this.view.x -= (e.clientX - (this.drag.px ?? e.clientX)) * k;
      this.view.z -= (e.clientY - (this.drag.py ?? e.clientY)) * k;
      this.drag.px = e.clientX;
      this.drag.py = e.clientY;
    } else {
      const w = this.toWorld(e);
      if (this.drag.mode === 'box') {
        this.drag.cx = w.x;
        this.drag.cz = w.z;
        this.draw();
        return;
      }
      this.drag.cx = this.snap(w.x);
      this.drag.cz = this.snap(w.z);
      if (this.drag.mode === 'move' && this.drag.origs) {
        const dx = this.drag.cx - this.drag.sx;
        const dz = this.drag.cz - this.drag.sz;
        if (dx !== 0 || dz !== 0 || this.drag.moved) {
          if (!this.drag.moved) {
            const origs = this.drag.origs;
            const keep = this.group.map((k) => this.level.pieces[k]);
            this.undoStack.push(JSON.stringify({ ...this.level, pieces: this.level.pieces.map((q) => (keep.includes(q) ? origs[keep.indexOf(q)] : q)) }));
            this.drag.moved = true;
          }
          this.group.forEach((k, n) => {
            const o = this.drag!.origs![n];
            Object.assign(this.level.pieces[k], { x0: o.x0 + dx, x1: o.x1 + dx, z0: o.z0 + dz, z1: o.z1 + dz });
          });
        }
        this.draw();
        return;
      }
      this.cursor = { x: this.drag.cx, z: this.drag.cz };
      if (this.drag.mode === 'move' && this.drag.orig) {
        const p = this.level.pieces[this.selected];
        const dx = this.drag.cx - this.drag.sx;
        const dz = this.drag.cz - this.drag.sz;
        if (p && (dx !== 0 || dz !== 0 || this.drag.moved)) {
          if (!this.drag.moved) {
            const keep = this.level.pieces[this.selected];
            this.undoStack.push(JSON.stringify({ ...this.level, pieces: this.level.pieces.map((q) => (q === keep ? this.drag!.orig : q)) }));
            this.drag.moved = true;
          }
          const o = this.drag.orig;
          Object.assign(p, { x0: o.x0 + dx, x1: o.x1 + dx, z0: o.z0 + dz, z1: o.z1 + dz });
        }
      }
    }
    this.draw();
  }
  private up(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (d?.mode === 'move') {
      this.sync();
      return;
    }
    if (d?.mode === 'box') {
      this.group = piecesInBox(this.level.pieces, d.sx, d.sz, d.cx, d.cz);
      this.selected = this.group.length === 1 ? this.group[0] : -1;
      if (this.group.length === 1) this.group = [];
      this.say(this.group.length > 1 ? `${this.group.length} pieces selected: drag one to move them all, Turn 90°, Duplicate, Delete, Raise or Lower.` : this.selected >= 0 ? 'One piece selected.' : 'Nothing in that box.');
      this.sync();
      return;
    }
    if (!d || d.mode !== 'draw') return;
    const t = this.tool as PieceType;
    this.canvas.releasePointerCapture(e.pointerId);
    this.push();
    const single = SINGLE.has(t);
    const p: Piece = single
      ? { t, x0: d.sx, z0: d.sz, x1: d.sx, z1: d.sz, top: this.top }
      : { t, x0: Math.min(d.sx, d.cx), z0: Math.min(d.sz, d.cz), x1: Math.max(d.sx, d.cx) + (BOX_TYPES.includes(t) || t === 'water' || t === 'river' || t === 'lava' || t === 'bridge' || t === 'stairs' || t === 'lift' ? 1 : 0), z1: Math.max(d.sz, d.cz) + (BOX_TYPES.includes(t) || t === 'water' || t === 'river' || t === 'lava' || t === 'bridge' || t === 'stairs' || t === 'lift' ? 1 : 0), top: this.top };
    if (t === 'gate') {
      p.x1 = Math.max(d.sx, d.cx) + 1;
      p.z1 = Math.max(d.sz, d.cz) + 1;
    }
    if (t === 'river' || t === 'fall' || t === 'pipe' || t === 'stairs' || t === 'window' || t === 'slime' || t === 'web' || t === 'banner' || t === 'torch' || t === 'gauge') p.dir = this.dir;
    if (t === 'stairs') {
      p.top = this.top > 0 ? this.top : 3;
      p.bottom = p.top > 3 ? p.top - 3 : 0;
    }
    if (t === 'spawn' || t === 'exit') this.level.pieces = this.level.pieces.filter((q) => q.t !== t);
    if (t === 'water' || t === 'river' || t === 'lava') p.top = Math.min(p.top, 0) - 0.85 + (this.top === 0 ? 0 : this.top);
    this.level.pieces.push(p);
    this.selected = this.level.pieces.length - 1;
    this.say(`${t} placed.`);
    this.sync();
  }

  /** The piece under a world point: singles first, then the one drawn last. */
  private pick(x: number, z: number): number {
    const ps = this.level.pieces;
    for (let i = ps.length - 1; i >= 0; i--) if (SINGLE.has(ps[i].t) && Math.abs(ps[i].x0 - x) < 0.8 && Math.abs(ps[i].z0 - z) < 0.8) return i;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      if (!SINGLE.has(p.t) && x >= Math.min(p.x0, p.x1) && x <= Math.max(p.x0, p.x1) && z >= Math.min(p.z0, p.z1) && z <= Math.max(p.z0, p.z1)) return i;
    }
    return -1;
  }

  // ---- Drawing ----
  private draw(): void {
    if (!this.open_) return;
    const c = this.canvas;
    const r = c.getBoundingClientRect();
    if (c.width !== Math.round(r.width) || c.height !== Math.round(r.height)) {
      c.width = Math.max(10, Math.round(r.width));
      c.height = Math.max(10, Math.round(r.height));
    }
    const g = this.ctx;
    const { x: vx, z: vz, scale: s } = this.view;
    const sx = (x: number): number => (x - vx) * s + c.width / 2;
    const sz = (z: number): number => (z - vz) * s + c.height / 2;
    g.fillStyle = '#0f1611';
    g.fillRect(0, 0, c.width, c.height);
    // Grid.
    g.strokeStyle = '#1c281f';
    g.lineWidth = 1;
    const x0 = Math.floor(vx - c.width / 2 / s) - 1;
    const x1 = Math.ceil(vx + c.width / 2 / s) + 1;
    const z0 = Math.floor(vz - c.height / 2 / s) - 1;
    const z1 = Math.ceil(vz + c.height / 2 / s) + 1;
    g.beginPath();
    for (let x = x0; x <= x1; x++) {
      g.moveTo(sx(x), 0);
      g.lineTo(sx(x), c.height);
    }
    for (let z = z0; z <= z1; z++) {
      g.moveTo(0, sz(z));
      g.lineTo(c.width, sz(z));
    }
    g.stroke();
    // The room.
    const W = this.level.width / 2;
    const D = this.level.depth / 2;
    g.strokeStyle = '#8a6a4a';
    g.lineWidth = 3;
    g.strokeRect(sx(-W), sz(-D), W * 2 * s, D * 2 * s);
    // Pieces, low to high so taller things show on top.
    // Pools are cut into the ground, so they show over the floor they sit in.
    const rank = (p: Piece): number => (SINGLE.has(p.t) ? 3 : p.t === 'bridge' ? 2 : p.t === 'water' || p.t === 'river' || p.t === 'lava' ? 1 : 0);
    const order = this.level.pieces.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.p.top - b.p.top);
    for (const { p, i } of order) this.drawPiece(p, i === this.selected || this.group.includes(i), sx, sz, s);
    if (this.drag?.mode === 'box') {
      const d = this.drag;
      g.strokeStyle = '#ffe27a';
      g.setLineDash([6, 4]);
      g.lineWidth = 1.5;
      g.strokeRect(sx(Math.min(d.sx, d.cx)), sz(Math.min(d.sz, d.cz)), Math.abs(d.cx - d.sx) * s, Math.abs(d.cz - d.sz) * s);
      g.setLineDash([]);
    }
    // The jump checker: green where he can get to, red rings on what he cannot, orange where he would be stuck.
    if (this.reachOn && this.reach) {
      g.fillStyle = 'rgba(90,255,120,0.28)';
      const d = Math.max(1, s * 0.5 - 1);
      for (const [x, z] of this.reach.points) g.fillRect(sx(x) - d / 2, sz(z) - d / 2, d, d);
      g.fillStyle = 'rgba(255,150,40,0.75)';
      for (const [x, z] of this.reach.traps) g.fillRect(sx(x) - d / 2, sz(z) - d / 2, d, d);
      g.strokeStyle = '#ff3a3a';
      g.lineWidth = 3;
      for (const p of this.reach.problems) {
        const cx = sx(p.x), cz = sz(p.z), r = Math.max(8, s * 0.8);
        g.beginPath();
        g.arc(cx, cz, r, 0, 7);
        g.moveTo(cx - r * 0.6, cz - r * 0.6);
        g.lineTo(cx + r * 0.6, cz + r * 0.6);
        g.moveTo(cx + r * 0.6, cz - r * 0.6);
        g.lineTo(cx - r * 0.6, cz + r * 0.6);
        g.stroke();
      }
    }
    // The shape being dragged.
    if (this.drag?.mode === 'draw') {
      const t = this.tool as PieceType;
      const a = { x: Math.min(this.drag.sx, this.drag.cx), z: Math.min(this.drag.sz, this.drag.cz) };
      const b = { x: Math.max(this.drag.sx, this.drag.cx) + 1, z: Math.max(this.drag.sz, this.drag.cz) + 1 };
      g.fillStyle = COLOR[t] + '99';
      g.strokeStyle = '#ffe27a';
      g.lineWidth = 2;
      if (SINGLE.has(t)) {
        g.beginPath();
        g.arc(sx(this.drag.sx), sz(this.drag.sz), s * 0.45, 0, 7);
        g.fill();
        g.stroke();
      } else {
        g.fillRect(sx(a.x), sz(a.z), (b.x - a.x) * s, (b.z - a.z) * s);
        g.strokeRect(sx(a.x), sz(a.z), (b.x - a.x) * s, (b.z - a.z) * s);
        g.fillStyle = '#fff';
        g.font = `${Math.max(10, s * 0.7)}px monospace`;
        g.fillText(`${b.x - a.x} x ${b.z - a.z}`, sx(a.x) + 4, sz(a.z) + Math.max(12, s * 0.8));
      }
    }
    // The rat, while watching live.
    if (this.live_ && this.playerAt) {
      const px = sx(this.playerAt.x);
      const pz = sz(this.playerAt.z);
      g.fillStyle = '#ff6a3a';
      g.strokeStyle = '#fff';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(px, pz, Math.max(4, s * 0.45), 0, 7);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(px, pz);
      g.lineTo(px + Math.sin(this.playerAt.f) * s * 1.1, pz + Math.cos(this.playerAt.f) * s * 1.1);
      g.stroke();
    }
    // Axes hint.
    g.fillStyle = '#6a7a6a';
    g.font = '12px monospace';
    g.fillText('north (-z) is up', 8, 16);
  }

  private drawPiece(p: Piece, sel: boolean, sx: (x: number) => number, sz: (z: number) => number, s: number): void {
    const g = this.ctx;
    g.fillStyle = COLOR[p.t];
    g.strokeStyle = sel ? '#ffe27a' : '#00000066';
    g.lineWidth = sel ? 3 : 1;
    if (SINGLE.has(p.t)) {
      const x = sx(p.x0);
      const z = sz(p.z0);
      g.beginPath();
      if (p.t === 'spawn' || p.t === 'exit' || p.t === 'npc') g.rect(x - s * 0.5, z - s * 0.5, s, s);
      else g.arc(x, z, s * 0.42, 0, 7);
      g.fill();
      g.stroke();
      g.fillStyle = '#000';
      g.font = `bold ${Math.max(9, s * 0.6)}px monospace`;
      g.textAlign = 'center';
      g.fillText({ spawn: 'S', exit: 'E', plate: 'K', mark: 'G', lamp: 'L', chain: 'H', window: 'W', slime: 'M', web: 'V', brazier: 'Y', speaker: 'Q', couch: 'U', light: 'Z', wedge: 'W', npc: 'P', roach: 'R', toad: 'T', beetle: 'X', bat: 'A', guard: 'D', mantis: 'N', stag: 'J', pipe: 'I', fall: 'F', crate: 'C', barrel: 'B', crumb: '·', cap: 'o', relic: '*' }[p.t as string] ?? '?', x, z + s * 0.22);
      g.textAlign = 'left';
      if (p.dir) {
        g.strokeStyle = '#fff';
        g.beginPath();
        g.moveTo(x, z);
        g.lineTo(x + { n: 0, s: 0, e: 1, w: -1 }[p.dir] * s * 0.7, z + { n: -1, s: 1, e: 0, w: 0 }[p.dir] * s * 0.7);
        g.stroke();
      }
    } else {
      const x0 = sx(Math.min(p.x0, p.x1));
      const z0 = sz(Math.min(p.z0, p.z1));
      const w = Math.abs(p.x1 - p.x0) * s;
      const h = Math.abs(p.z1 - p.z0) * s;
      g.fillRect(x0, z0, w, h);
      g.strokeRect(x0, z0, w, h);
      if (p.dir) {
        g.strokeStyle = '#fff';
        g.beginPath();
        const cx = x0 + w / 2;
        const cz = z0 + h / 2;
        g.moveTo(cx, cz);
        g.lineTo(cx + { n: 0, s: 0, e: 1, w: -1 }[p.dir] * Math.min(w, 40) * 0.5, cz + { n: -1, s: 1, e: 0, w: 0 }[p.dir] * Math.min(h, 40) * 0.5);
        g.stroke();
      }
      if (s >= 8) {
        g.fillStyle = '#fff';
        g.font = `${Math.max(9, Math.min(14, s * 0.6))}px monospace`;
        g.fillText(p.top.toFixed(1), x0 + 3, z0 + Math.min(14, s));
      }
    }
  }
}
