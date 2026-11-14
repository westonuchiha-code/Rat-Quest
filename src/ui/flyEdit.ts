/**
 * 3D editing: fly a free camera through the level and place or remove pieces where the crosshair points.
 * The game is paused underneath. A gold outline shows what will be placed; a red one shows what Delete would remove.
 *
 * Keyboard: WASD fly, arrows or mouse-drag look, Space up, C down, E or Enter place, X delete, [ ] change piece,
 *           R / F raise or lower, 1 2 width, 3 4 depth, T turn, Z undo, Escape back to the map.
 * Pad: left stick fly, right stick look, jump up, sneak down, attack place, dodge delete, L1 / R1 change piece,
 *      stow turns, the menu button goes back to the map.
 * Touch: drag the picture to look, and the buttons.
 */
import * as THREE from 'three';
import { CustomLevel, Piece, PieceType, compileCustom, parseCustom } from '../levels/custom';
import { unreachable } from '../levels/reach';
import { defaultRaise, isSingle, makePiece, pickPiece } from '../levels/place3d';
import { TOOLS } from './builder';

const CSS = `
.rq-fly{position:absolute;inset:0;z-index:58;display:none;color:#efe9d2;font:clamp(11px,2.2vh,15px)/1.2 ui-monospace,Menlo,Consolas,monospace;user-select:none;-webkit-user-select:none}
.rq-fly.on{display:block}
.rq-fly .look{position:absolute;inset:0;touch-action:none;cursor:grab}
.rq-fly .cross{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;pointer-events:none}
.rq-fly .cross:before,.rq-fly .cross:after{content:'';position:absolute;background:#fff;box-shadow:0 0 2px #000}
.rq-fly .cross:before{left:10px;top:0;width:2px;height:22px}.rq-fly .cross:after{top:10px;left:0;height:2px;width:22px}
.rq-fly .top{position:absolute;left:0;right:0;top:0;padding:.35em .6em;background:rgba(10,16,12,.75);display:flex;gap:.6em;align-items:center}
.rq-fly .top b{color:#ffe27a}.rq-fly .top span{flex:1;color:#c9d2b8}
.rq-fly .bar{position:absolute;left:0;right:0;bottom:0;padding:.35em;background:rgba(10,16,12,.8);display:flex;flex-wrap:wrap;gap:.35em;align-items:center;justify-content:center}
.rq-fly button{font:inherit;color:#efe9d2;background:#26362a;border:1px solid #55705a;border-radius:.4em;padding:.4em .6em;touch-action:none}
.rq-fly button:active,.rq-fly button.held{background:#5a7a3a}
.rq-fly button.go{background:#2f6a3a;border-color:#8aff8a;font-weight:800}
.rq-fly button.bad{background:#6a2a2a;border-color:#ff8a8a}
.rq-fly .grp{display:flex;align-items:center;gap:.2em;padding:0 .3em;border-left:1px solid #3a5040}
.rq-fly .grp i{font-style:normal;min-width:2.6em;text-align:center;color:#ffe27a}
.rq-fly .tool{min-width:8em;text-align:center;color:#ffe27a}
.rq-fly .side{position:absolute;right:.5em;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:.4em}
.rq-fly .side button{width:3.2em;height:3.2em;font-size:1.1em}
.rq-fly .pad{position:absolute;left:.5em;top:50%;transform:translateY(-50%);display:grid;grid-template-columns:repeat(3,2.8em);grid-template-rows:repeat(3,2.8em);gap:.25em}
.rq-fly .pad button{padding:0}
`;

/** Every piece that can be placed in 3D, in builder order. */
const PLACEABLE: Array<{ t: PieceType; label: string }> = TOOLS.filter((g) => g.group !== 'EDIT' && g.group !== 'SHAPES').flatMap((g) => g.items as Array<{ t: PieceType; label: string }>);
const DIRS: Array<'n' | 'e' | 's' | 'w'> = ['n', 'e', 's', 'w'];

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
  prev: boolean;
  next: boolean;
  raise: number;
  width: number;
  depth: number;
  turn: boolean;
  undo: boolean;
  exit: boolean;
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

export class FlyEdit {
  open = false;
  private readonly root: HTMLDivElement;
  private readonly info: HTMLSpanElement;
  private level!: CustomLevel;
  private readonly undoStack: string[] = [];
  private readonly pos = new THREE.Vector3();
  private yaw = 0;
  private pitch = -0.4;
  private tool = PLACEABLE.findIndex((x) => x.t === 'platform');
  private w = 3;
  private d = 3;
  private dir: 'n' | 'e' | 's' | 'w' = 'n';
  private readonly raiseBy = new Map<PieceType, number>();
  private readonly ray = new THREE.Raycaster();
  private readonly ghost: THREE.LineSegments;
  private readonly target: THREE.LineSegments;
  /** Red markers on what the jump checker says he cannot reach. */
  private readonly marks = new THREE.Group();
  private checking = false;
  private checkTimer = 0;
  private hit: { x: number; y: number; z: number; dist: number } | null = null;
  private targetIdx = -1;
  private readonly held = new Set<string>();
  private drag: { id: number; x: number; y: number } | null = null;

  constructor(parent: HTMLElement, private readonly host: FlyHost) {
    if (!document.getElementById('rq-fly-css')) {
      const st = document.createElement('style');
      st.id = 'rq-fly-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    this.root = document.createElement('div');
    this.root.className = 'rq-fly';
    this.root.innerHTML = `
      <div class="look"></div><div class="cross"></div>
      <div class="top"><b>3D EDIT</b><span></span><button class="go" data-a="exit">MAP</button></div>
      <div class="pad">
        <span></span><button data-h="fwd">▲</button><span></span>
        <button data-h="left">◀</button><button data-h="up" title="Up">⤒</button><button data-h="right">▶</button>
        <span></span><button data-h="back">▼</button><button data-h="down" title="Down">⤓</button>
      </div>
      <div class="side"><button class="go" data-a="place">PLACE</button><button class="bad" data-a="del">DEL</button><button data-a="undo">UNDO</button></div>
      <div class="bar">
        <button data-a="prev">◀</button><span class="tool"></span><button data-a="next">▶</button>
        <span class="grp">W<button data-a="w-">−</button><i data-v="w"></i><button data-a="w+">+</button></span>
        <span class="grp">D<button data-a="d-">−</button><i data-v="d"></i><button data-a="d+">+</button></span>
        <span class="grp">Height<button data-a="r-">−</button><i data-v="r"></i><button data-a="r+">+</button></span>
        <span class="grp"><button data-a="turn">Turn <i data-v="dir"></i></button></span>
      </div>`;
    parent.appendChild(this.root);
    this.info = this.root.querySelector('.top span') as HTMLSpanElement;

    // Buttons act on press (touch-friendly); the fly buttons are held.
    this.root.addEventListener('pointerdown', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
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

    // Dragging the picture looks around.
    const look = this.root.querySelector('.look') as HTMLDivElement;
    look.addEventListener('pointerdown', (e) => {
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

    const lineMat = (c: number): THREE.LineBasicMaterial => new THREE.LineBasicMaterial({ color: c, depthTest: false, transparent: true });
    this.ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), lineMat(0xffd23a));
    this.target = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), lineMat(0xff4a4a));
    this.ghost.renderOrder = this.target.renderOrder = 999;
    this.ghost.visible = this.target.visible = false;
  }

  /** Starts editing this level, with the camera above its start, looking in. */
  start(level: CustomLevel, jumpCheck = false): void {
    this.checking = jumpCheck;
    this.level = parseCustom(JSON.stringify(level)) ?? level;
    this.undoStack.length = 0;
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
    this.host.scene.add(this.ghost, this.target, this.marks);
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
  }

  stop(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    this.held.clear();
    this.host.scene.remove(this.ghost, this.target, this.marks);
    this.host.done(this.level);
  }

  private get t(): PieceType {
    return PLACEABLE[this.tool].t;
  }

  private raise(): number {
    return this.raiseBy.get(this.t) ?? defaultRaise(this.t);
  }

  private act(a: string): void {
    switch (a) {
      case 'exit': return this.stop();
      case 'place': return this.place();
      case 'del': return this.remove();
      case 'undo': return this.undo();
      case 'prev': this.tool = (this.tool + PLACEABLE.length - 1) % PLACEABLE.length; break;
      case 'next': this.tool = (this.tool + 1) % PLACEABLE.length; break;
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

  private edit(change: () => void): void {
    this.undoStack.push(JSON.stringify(this.level));
    if (this.undoStack.length > 80) this.undoStack.shift();
    change();
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
  }

  private place(): void {
    const h = this.hit;
    if (!h) return this.say('Point at a surface to place.');
    const p = makePiece(this.t, h.x, h.y, h.z, { w: this.w, d: this.d, raise: this.raise(), dir: this.dir });
    const half = { x: this.level.width / 2, z: this.level.depth / 2 };
    if (Math.max(Math.abs(p.x0), Math.abs(p.x1)) > half.x + 0.01 || Math.max(Math.abs(p.z0), Math.abs(p.z1)) > half.z + 0.01) {
      if (p.t !== 'exit') return this.say('That would stick out of the room.');
    }
    this.edit(() => {
      if (p.t === 'spawn' || p.t === 'exit') this.level.pieces = this.level.pieces.filter((q) => q.t !== p.t);
      this.level.pieces.push(p);
    });
    this.say(`${PLACEABLE[this.tool].label} placed.`);
  }

  private remove(): void {
    if (this.targetIdx < 0) return this.say('Point at a piece to delete it.');
    const p = this.level.pieces[this.targetIdx];
    if (p.t === 'spawn') return this.say('The start cannot be deleted; place a new one instead.');
    const i = this.targetIdx;
    this.edit(() => this.level.pieces.splice(i, 1));
    this.say(`${PLACEABLE.find((x) => x.t === p.t)?.label ?? p.t} deleted.`);
  }

  private undo(): void {
    const s = this.undoStack.pop();
    if (!s) return this.say('Nothing to undo.');
    this.level = JSON.parse(s) as CustomLevel;
    this.host.rebuild(this.level);
    this.recheck();
    this.sync();
    this.say('Undone.');
  }

  /** With the jump checker on: red markers over everything out of reach (a moment after each edit). */
  private recheck(): void {
    if (!this.checking) return;
    window.clearTimeout(this.checkTimer);
    this.checkTimer = window.setTimeout(() => {
      for (const c of [...this.marks.children]) {
        this.marks.remove(c);
        ((c as THREE.LineSegments).geometry as THREE.BufferGeometry).dispose();
      }
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
  private say(m: string): void {
    this.msg = m;
    this.msgT = 2.5;
    this.sync();
  }

  private sync(): void {
    const set = (k: string, v: string): void => {
      const el = this.root.querySelector(`[data-v="${k}"]`);
      if (el) el.textContent = v;
    };
    (this.root.querySelector('.tool') as HTMLElement).textContent = PLACEABLE[this.tool].label;
    const single = isSingle(this.t);
    set('w', single ? '–' : String(this.w));
    set('d', single ? '–' : String(this.d));
    set('r', `${this.raise() >= 0 ? '+' : ''}${this.raise().toFixed(1)}`);
    set('dir', this.dir.toUpperCase());
    const h = this.hit;
    this.info.textContent = this.msgT > 0 ? this.msg : h ? `x ${h.x.toFixed(1)}  z ${h.z.toFixed(1)}  height ${h.y.toFixed(1)}   ${this.level.pieces.length} pieces` : 'Point at the floor or a platform.';
  }

  /** Every frame while open: fly, aim, and work the buttons. */
  frame(dt: number, inp: FlyInput): void {
    if (!this.open) return;
    if (inp.exit) return this.stop();
    if (inp.place) this.place();
    if (inp.del) this.remove();
    if (inp.undo) this.undo();
    if (inp.prev) this.act('prev');
    if (inp.next) this.act('next');
    if (inp.turn) this.act('turn');
    if (inp.width) this.act(inp.width > 0 ? 'w+' : 'w-');
    if (inp.depth) this.act(inp.depth > 0 ? 'd+' : 'd-');
    if (inp.raise) this.act(inp.raise > 0 ? 'r+' : 'r-');

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
    // Inside the room: from outside, the walls would be in the way of the crosshair.
    const lim = { x: this.level.width / 2 - 0.4, z: this.level.depth / 2 - 0.4 };
    this.pos.x = Math.max(-lim.x, Math.min(lim.x, this.pos.x));
    this.pos.z = Math.max(-lim.z, Math.min(lim.z, this.pos.z));
    this.pos.y = Math.max(-10, Math.min((this.level.wallHeight ?? 12) + 8, this.pos.y));
    if (this.msgT > 0 && (this.msgT -= dt) <= 0) this.sync();
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
    const before = this.hit ? `${this.hit.x.toFixed(1)},${this.hit.z.toFixed(1)},${this.hit.y.toFixed(1)}` : '';
    if (first) {
      // On a wall, place against it rather than inside it.
      const n = first.face ? first.face.normal.clone().transformDirection(first.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
      const p = first.point.clone();
      if (n.y < 0.5) p.addScaledVector(n, 0.5);
      this.hit = { x: p.x, y: n.y >= 0.5 ? p.y : Math.max(0, Math.floor(p.y)), z: p.z, dist: first.distance };
    } else this.hit = null;
    const after = this.hit ? `${this.hit.x.toFixed(1)},${this.hit.z.toFixed(1)},${this.hit.y.toFixed(1)}` : '';
    if (after !== before && this.msgT <= 0) this.sync();

    // The gold ghost: what PLACE would add.
    const h = this.hit;
    if (h) {
      const p = makePiece(this.t, h.x, h.y, h.z, { w: this.w, d: this.d, raise: this.raise(), dir: this.dir });
      this.fit(this.ghost, p, h.y);
    }
    this.ghost.visible = !!h;
    // The red box: what DEL would remove.
    this.targetIdx = pickPiece(this.level.pieces, this.pos, dir, h);
    const tp = this.targetIdx >= 0 ? this.level.pieces[this.targetIdx] : null;
    if (tp) this.fit(this.target, tp, tp.bottom ?? (isSingle(tp.t) ? tp.top : Math.min(tp.top, 0)));
    this.target.visible = !!tp;
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
