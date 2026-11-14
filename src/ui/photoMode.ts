/**
 * Photo mode: the game holds still, the hearts and counters go, and a camera circles the rat freely. Pick a look
 * (colour), a frame, a pose for him, then take the picture: it is saved as a PNG with the look and frame baked in.
 *
 * Keyboard: arrows or mouse-drag circle round him, W / S closer and further, A / D turn him, Q / E look lower or higher,
 *           Z / X zoom (field of view), 1 look, 2 pose, 3 frame, 4 hide him, Enter or Space take the picture,
 *           Escape or O leave.
 * Pad: right stick circles, left stick closer / further and turns him, L1 / R1 look, stow pose, dodge frame,
 *      attack takes the picture, the menu button leaves.
 * Touch: drag the picture to circle round him, and the buttons.
 *
 * The camera maths and the colour filters are plain functions, so tests can run them without a browser.
 */
import * as THREE from 'three';
import type { Gesture } from '../story/scene';

// ---- Looks: chains of CSS filter functions. The same chain is shown live (CSS) and baked into the saved picture (JS). ----

export type FilterStep = { fn: 'sepia' | 'grayscale' | 'saturate' | 'hueRotate' | 'contrast' | 'brightness'; v: number };
export interface Look {
  name: string;
  steps: FilterStep[];
}
export const LOOKS: Look[] = [
  { name: 'Natural', steps: [] },
  { name: 'Vivid', steps: [{ fn: 'saturate', v: 1.6 }, { fn: 'contrast', v: 1.1 }] },
  { name: 'Warm', steps: [{ fn: 'sepia', v: 0.3 }, { fn: 'saturate', v: 1.35 }, { fn: 'brightness', v: 1.05 }] },
  { name: 'Cold', steps: [{ fn: 'sepia', v: 0.35 }, { fn: 'hueRotate', v: 175 }, { fn: 'saturate', v: 1.2 }] },
  { name: 'Sepia', steps: [{ fn: 'sepia', v: 0.9 }, { fn: 'contrast', v: 1.05 }] },
  { name: 'Noir', steps: [{ fn: 'grayscale', v: 1 }, { fn: 'contrast', v: 1.2 }, { fn: 'brightness', v: 0.92 }] },
];

/** The CSS `filter` for a look. */
export function lookCss(look: Look): string {
  if (!look.steps.length) return 'none';
  return look.steps.map((s) => (s.fn === 'hueRotate' ? `hue-rotate(${s.v}deg)` : `${s.fn}(${s.v})`)).join(' ');
}

type M3 = [number, number, number, number, number, number, number, number, number];
/** The colour matrix of one filter step, as the Filter Effects spec defines it (contrast and brightness are handled apart). */
function matrixOf(s: FilterStep): M3 | null {
  const v = s.v;
  switch (s.fn) {
    case 'sepia': {
      const a = 1 - Math.min(1, v);
      return [0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a, 0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a, 0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a];
    }
    case 'grayscale': {
      const a = 1 - Math.min(1, v);
      return [0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a, 0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a, 0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a];
    }
    case 'saturate':
      return [0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v];
    case 'hueRotate': {
      const r = (v * Math.PI) / 180;
      const c = Math.cos(r);
      const n = Math.sin(r);
      return [
        0.213 + c * 0.787 - n * 0.213, 0.715 - c * 0.715 - n * 0.715, 0.072 - c * 0.072 + n * 0.928,
        0.213 - c * 0.213 + n * 0.143, 0.715 + c * 0.285 + n * 0.14, 0.072 - c * 0.072 - n * 0.283,
        0.213 - c * 0.213 - n * 0.787, 0.715 - c * 0.715 + n * 0.715, 0.072 + c * 0.928 + n * 0.072,
      ];
    }
    default:
      return null;
  }
}

/** Runs a look over RGBA pixels in place (the saved picture). */
export function applyLook(data: Uint8ClampedArray | number[], look: Look): void {
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    for (const s of look.steps) {
      const m = matrixOf(s);
      if (m) {
        const nr = m[0] * r + m[1] * g + m[2] * b;
        const ng = m[3] * r + m[4] * g + m[5] * b;
        const nb = m[6] * r + m[7] * g + m[8] * b;
        r = nr;
        g = ng;
        b = nb;
      } else if (s.fn === 'contrast') {
        const k = (0.5 - 0.5 * s.v) * 255;
        r = r * s.v + k;
        g = g * s.v + k;
        b = b * s.v + k;
      } else if (s.fn === 'brightness') {
        r *= s.v;
        g *= s.v;
        b *= s.v;
      }
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));
    }
    data[i] = Math.round(r);
    data[i + 1] = Math.round(g);
    data[i + 2] = Math.round(b);
  }
}

// ---- Frames and poses ----

export const FRAMES = ['None', 'Cinema', 'Vignette', 'Cinema + vignette'] as const;
/** Cinema bars crop the picture to this shape (width over height). */
export const CINEMA = 2.35;

export const POSES: Array<{ name: string; gesture: Gesture | null }> = [
  { name: 'As he was', gesture: null },
  { name: 'Cheer', gesture: 'cheer' },
  { name: 'Sit', gesture: 'sit' },
  { name: 'Touch scarf', gesture: 'touchScarf' },
  { name: 'Reach out', gesture: 'reachPaw' },
  { name: 'Unsure', gesture: 'hesitate' },
  { name: 'Fix gear', gesture: 'adjust' },
];

// ---- The camera ----

export const PHOTO_CAM = { minDist: 1.2, maxDist: 16, minPitch: -0.35, maxPitch: 1.45, minFov: 20, maxFov: 95, minRise: 0, maxRise: 3.2 };

/** Where the photo camera is: circling a point above the rat. */
export interface Orbit {
  yaw: number;
  pitch: number;
  dist: number;
  /** How high above his feet it looks. */
  rise: number;
  fov: number;
}

/** The orbit that puts the camera where it already is (so photo mode starts on the shot the game had). */
export function orbitFrom(cam: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }, rise: number, fov: number): Orbit {
  const dx = cam.x - target.x;
  const dy = cam.y - (target.y + rise);
  const dz = cam.z - target.z;
  const flat = Math.hypot(dx, dz);
  const dist = Math.min(PHOTO_CAM.maxDist, Math.max(PHOTO_CAM.minDist, Math.hypot(flat, dy)));
  return { yaw: Math.atan2(dx, dz), pitch: Math.min(PHOTO_CAM.maxPitch, Math.max(PHOTO_CAM.minPitch, Math.atan2(dy, flat))), dist, rise, fov };
}

/** Where the camera sits for an orbit round `target`. */
export function orbitPosition(o: Orbit, target: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const flat = Math.cos(o.pitch) * o.dist;
  return { x: target.x + Math.sin(o.yaw) * flat, y: target.y + o.rise + Math.sin(o.pitch) * o.dist, z: target.z + Math.cos(o.yaw) * flat };
}

export interface PhotoInput {
  /** Circle round him (right stick, arrows, drag). */
  orbitX: number;
  orbitY: number;
  /** Closer (+) or further (-). */
  zoom: number;
  /** Turn him. */
  turn: number;
  /** Look higher (+) or lower (-). */
  rise: number;
  /** Narrower (+) or wider (-) field of view. */
  fov: number;
  look: number;
  pose: number;
  frame: boolean;
  hide: boolean;
  snap: boolean;
  exit: boolean;
}

/** Moves an orbit for one frame of input. */
export function stepOrbit(o: Orbit, inp: Pick<PhotoInput, 'orbitX' | 'orbitY' | 'zoom' | 'rise' | 'fov'>, dt: number): Orbit {
  const C = PHOTO_CAM;
  return {
    yaw: o.yaw - inp.orbitX * 2.2 * dt,
    pitch: Math.min(C.maxPitch, Math.max(C.minPitch, o.pitch + inp.orbitY * 1.6 * dt)),
    dist: Math.min(C.maxDist, Math.max(C.minDist, o.dist * Math.exp(-inp.zoom * 1.4 * dt))),
    rise: Math.min(C.maxRise, Math.max(C.minRise, o.rise + inp.rise * 1.5 * dt)),
    fov: Math.min(C.maxFov, Math.max(C.minFov, o.fov - inp.fov * 30 * dt)),
  };
}

/** How many times bigger the saved picture is than the game's own pixels: whole steps, the long side at least 1600. */
export function photoScale(w: number, h: number): number {
  return Math.max(1, Math.ceil(1600 / Math.max(1, Math.max(w, h))));
}

// ---- The overlay ----

const CSS = `
.rq-photo-on>*:not(canvas):not(.rq-photo){visibility:hidden!important}
.rq-photo{position:absolute;inset:0;z-index:60;display:none;color:#efe9d2;font:clamp(11px,2.2vh,15px)/1.2 ui-monospace,Menlo,Consolas,monospace;user-select:none;-webkit-user-select:none}
.rq-photo.on{display:block}
.rq-photo .drag{position:absolute;inset:0;touch-action:none;cursor:grab}
.rq-photo .vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 45%,rgba(0,0,0,.72) 100%);display:none}
.rq-photo .bar-top,.rq-photo .bar-bot{position:absolute;left:0;right:0;background:#000;pointer-events:none;display:none}
.rq-photo .bar-top{top:0}.rq-photo .bar-bot{bottom:0}
.rq-photo .ui{position:absolute;left:0;right:0;bottom:0;padding:.35em;background:rgba(10,12,16,.72);display:flex;flex-wrap:wrap;gap:.35em;align-items:center;justify-content:center;transition:opacity .2s}
.rq-photo .ui.gone{opacity:0;pointer-events:none}
.rq-photo .help{flex:0 0 100%;display:flex;flex-wrap:wrap;justify-content:center;gap:.3em 0;padding:.15em 0 .3em}
.rq-photo .help:empty{display:none}
.rq-photo .title{position:absolute;left:.6em;top:.5em;color:#ffe27a;font-weight:800;letter-spacing:.1em;text-shadow:0 1px 0 #000;transition:opacity .2s}
.rq-photo .title.gone{opacity:0}
.rq-photo button{font:inherit;color:#efe9d2;background:#26302e;border:1px solid #55706a;border-radius:.4em;padding:.4em .6em;touch-action:none}
.rq-photo button:active,.rq-photo button.held{background:#3a5a6a}
.rq-photo button.go{background:#2f6a3a;border-color:#8aff8a;font-weight:800}
.rq-photo .grp{display:flex;align-items:center;gap:.25em;padding:0 .3em;border-left:1px solid #3a4a50}
.rq-photo .grp i{font-style:normal;min-width:5.5em;text-align:center;color:#ffe27a}
.rq-photo .flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .35s}
.rq-photo .flash.on{opacity:.85;transition:none}
.rq-photo .saved{position:absolute;left:50%;top:1em;transform:translateX(-50%);background:rgba(10,16,12,.85);padding:.4em .8em;border-radius:.5em;opacity:0;transition:opacity .4s;pointer-events:none}
.rq-photo .saved.on{opacity:1}
`;

export interface PhotoHost {
  canvas: HTMLCanvasElement;
  camera: THREE.PerspectiveCamera;
  /** Where his feet are now (the camera circles a point above them). */
  ratAt(): THREE.Vector3;
  /** Called when photo mode closes. */
  done(): void;
  /** Saves (or offers) the finished picture. */
  save?(blob: Blob, name: string): void;
  /** The pad or keyboard controls, as button chips; empty on a touch screen (the buttons are the controls). */
  help?(): string;
}

export class PhotoMode {
  open = false;
  /** How far he is turned from where he faced (radians). */
  turn = 0;
  hideRat = false;
  look = 0;
  pose = 0;
  frame = 0;
  orbit: Orbit = { yaw: 0, pitch: 0.3, dist: 5, rise: 1, fov: 60 };
  /** Set when a picture is wanted: main takes it straight after the next render. */
  wantShot = false;
  private fovWas = 60;
  private readonly root: HTMLDivElement;
  private readonly ui: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly vig: HTMLDivElement;
  private readonly barTop: HTMLDivElement;
  private readonly barBot: HTMLDivElement;
  private readonly flash: HTMLDivElement;
  private readonly saved: HTMLDivElement;
  private readonly held = new Set<string>();
  private drag: { x: number; y: number; id: number } | null = null;
  private dragDelta = { x: 0, y: 0 };
  private idle = 0;

  constructor(parent: HTMLElement, private readonly host: PhotoHost) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    this.root = document.createElement('div');
    this.root.className = 'rq-photo';
    this.root.innerHTML = `
      <div class="drag"></div><div class="vig"></div><div class="bar-top"></div><div class="bar-bot"></div>
      <div class="title">PHOTO</div>
      <div class="ui">
        <div class="help"></div>
        <div class="grp"><button data-h="zoomIn">+</button><button data-h="zoomOut">&minus;</button></div>
        <div class="grp"><button data-h="turnL">&#8630;</button><button data-h="turnR">&#8631;</button></div>
        <div class="grp"><button data-h="riseDown">&darr;</button><button data-h="riseUp">&uarr;</button></div>
        <div class="grp"><button data-h="fovWide">wide</button><button data-h="fovNarrow">tele</button></div>
        <div class="grp"><button data-a="look:-1">&lsaquo;</button><i data-v="look"></i><button data-a="look:1">&rsaquo;</button></div>
        <div class="grp"><button data-a="pose:-1">&lsaquo;</button><i data-v="pose"></i><button data-a="pose:1">&rsaquo;</button></div>
        <div class="grp"><button data-a="frame">frame</button><button data-a="hide">rat</button></div>
        <div class="grp"><button class="go" data-a="snap">&#9673; Take</button><button data-a="exit">Done</button></div>
      </div>
      <div class="flash"></div><div class="saved">Saved!</div>`;
    parent.appendChild(this.root);
    const q = <T extends HTMLElement>(s: string): T => this.root.querySelector(s) as T;
    this.ui = q('.ui');
    this.title = q('.title');
    this.vig = q('.vig');
    this.barTop = q('.bar-top');
    this.barBot = q('.bar-bot');
    this.flash = q('.flash');
    this.saved = q('.saved');
    // Held buttons (zoom, turn...) and tapped ones (look, pose...).
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-h]')) {
      const k = b.dataset.h!;
      const on = (e: Event): void => {
        e.preventDefault();
        this.held.add(k);
        b.classList.add('held');
      };
      const off = (): void => {
        this.held.delete(k);
        b.classList.remove('held');
      };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('pointercancel', off);
    }
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-a]')) {
      b.addEventListener('click', () => {
        const [a, n] = b.dataset.a!.split(':');
        this.tap(a, Number(n ?? 0));
      });
    }
    const drag = q<HTMLDivElement>('.drag');
    drag.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      drag.setPointerCapture(e.pointerId);
    });
    drag.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.dragDelta.x += e.clientX - this.drag.x;
      this.dragDelta.y += e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    const up = (): void => void (this.drag = null);
    drag.addEventListener('pointerup', up);
    drag.addEventListener('pointercancel', up);
    drag.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.orbit = { ...this.orbit, dist: Math.min(PHOTO_CAM.maxDist, Math.max(PHOTO_CAM.minDist, this.orbit.dist * Math.exp(e.deltaY * 0.0015))) };
    }, { passive: false });
  }

  start(): void {
    const cam = this.host.camera;
    this.fovWas = cam.fov;
    this.orbit = orbitFrom(cam.position, this.host.ratAt(), 1.0, cam.fov);
    this.turn = 0;
    this.hideRat = false;
    this.pose = 0;
    this.open = true;
    this.root.classList.add('on');
    this.root.parentElement?.classList.add('rq-photo-on');
    this.idle = 0;
    this.render();
  }

  /** Draws the controls again (the button prompts changed). */
  refresh(): void {
    if (this.open) this.render();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.classList.remove('on');
    this.root.parentElement?.classList.remove('rq-photo-on');
    this.host.canvas.style.filter = '';
    this.host.camera.fov = this.fovWas;
    this.host.camera.updateProjectionMatrix();
    this.held.clear();
    this.host.done();
  }

  get gesture(): Gesture | null {
    return POSES[this.pose].gesture;
  }

  private tap(a: string, n: number): void {
    const wrap = (i: number, len: number): number => ((i % len) + len) % len;
    if (a === 'look') this.look = wrap(this.look + n, LOOKS.length);
    else if (a === 'pose') this.pose = wrap(this.pose + n, POSES.length);
    else if (a === 'frame') this.frame = wrap(this.frame + 1, FRAMES.length);
    else if (a === 'hide') this.hideRat = !this.hideRat;
    else if (a === 'snap') this.wantShot = true;
    else if (a === 'exit') return this.close();
    this.idle = 0;
    this.render();
  }

  /** One frame: input moves the camera; then the camera is placed. */
  step(dt: number, inp: PhotoInput): void {
    if (!this.open) return;
    if (inp.exit) return this.close();
    const h = (k: string): number => (this.held.has(k) ? 1 : 0);
    const drag = { x: this.dragDelta.x, y: this.dragDelta.y };
    this.dragDelta = { x: 0, y: 0 };
    const orbitX = inp.orbitX + drag.x * 0.35;
    const orbitY = inp.orbitY + drag.y * 0.25;
    const step = {
      orbitX,
      orbitY,
      zoom: inp.zoom + h('zoomIn') - h('zoomOut'),
      rise: inp.rise + h('riseUp') - h('riseDown'),
      fov: inp.fov + h('fovNarrow') - h('fovWide'),
    };
    this.orbit = stepOrbit(this.orbit, step, dt);
    this.turn += (inp.turn + h('turnR') - h('turnL')) * 2.4 * dt;
    if (inp.look) this.tap('look', inp.look);
    if (inp.pose) this.tap('pose', inp.pose);
    if (inp.frame) this.tap('frame', 0);
    if (inp.hide) this.tap('hide', 0);
    if (inp.snap) this.tap('snap', 0);
    // The buttons fade out after a few still seconds, so the screen itself is the picture; any input brings them back.
    const busy = Math.abs(orbitX) + Math.abs(orbitY) + Math.abs(step.zoom) + Math.abs(step.rise) + Math.abs(step.fov) + Math.abs(inp.turn) > 0.01 || this.held.size > 0;
    this.idle = busy ? 0 : this.idle + dt;
    const gone = this.idle > 4;
    this.ui.classList.toggle('gone', gone);
    this.title.classList.toggle('gone', gone);
  }

  /** Puts the camera where the orbit says (called just before the render). */
  applyCamera(): void {
    if (!this.open) return;
    const cam = this.host.camera;
    const at = this.host.ratAt();
    const p = orbitPosition(this.orbit, at);
    cam.position.set(p.x, p.y, p.z);
    cam.lookAt(at.x, at.y + this.orbit.rise, at.z);
    if (cam.fov !== this.orbit.fov) {
      cam.fov = this.orbit.fov;
      cam.updateProjectionMatrix();
    }
    this.host.canvas.style.filter = lookCss(LOOKS[this.look]);
    this.layoutFrame();
  }

  private layoutFrame(): void {
    const f = FRAMES[this.frame];
    const cinema = f.includes('Cinema');
    this.vig.style.display = f.includes('ignette') ? 'block' : 'none';
    this.barTop.style.display = this.barBot.style.display = cinema ? 'block' : 'none';
    if (cinema) {
      const r = this.root.getBoundingClientRect();
      const bar = Math.max(0, (r.height - r.width / CINEMA) / 2);
      this.barTop.style.height = this.barBot.style.height = `${bar}px`;
    }
  }

  /** Takes the picture from the canvas just rendered: the look and the frame baked in, and a small mark in the corner. */
  capture(): void {
    this.wantShot = false;
    const src = this.host.canvas;
    // The game draws at a low resolution on purpose (the old look). The picture keeps those pixels, made bigger and
    // sharp (no smoothing), so the long side is at least 1600.
    const lw = src.width;
    const lh = src.height;
    const low = document.createElement('canvas');
    low.width = lw;
    low.height = lh;
    const lctx = low.getContext('2d');
    if (!lctx) return;
    lctx.drawImage(src, 0, 0, lw, lh);
    const look = LOOKS[this.look];
    if (look.steps.length) {
      const img = lctx.getImageData(0, 0, lw, lh);
      applyLook(img.data, look);
      lctx.putImageData(img, 0, 0);
    }
    const k = photoScale(lw, lh);
    const w = lw * k;
    const h = lh * k;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, w, h);
    const f = FRAMES[this.frame];
    if (f.includes('ignette')) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (f.includes('Cinema')) {
      const bar = Math.max(0, Math.round((h - w / CINEMA) / 2));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, bar);
      ctx.fillRect(0, h - bar, w, bar);
    }
    const s = Math.max(10, Math.round(h / 42));
    ctx.font = `bold ${s}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('RATQUEST', w - s * 0.6 + 1, h - s * 0.6 + 1);
    ctx.fillStyle = 'rgba(255,226,122,0.85)';
    ctx.fillText('RATQUEST', w - s * 0.6, h - s * 0.6);
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    const name = `ratquest-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
    out.toBlob((blob) => {
      if (!blob) return;
      if (this.host.save) this.host.save(blob, name);
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    }, 'image/png');
    this.flash.classList.add('on');
    requestAnimationFrame(() => this.flash.classList.remove('on'));
    this.saved.classList.add('on');
    setTimeout(() => this.saved.classList.remove('on'), 1600);
  }

  render(): void {
    (this.root.querySelector('[data-v="look"]') as HTMLElement).textContent = LOOKS[this.look].name;
    (this.root.querySelector('[data-v="pose"]') as HTMLElement).textContent = POSES[this.pose].name;
    const help = this.host.help?.() ?? '';
    const el = this.root.querySelector('.help') as HTMLElement | null;
    if (el && el.innerHTML !== help) el.innerHTML = help;
    this.ui.classList.remove('gone');
    this.title.classList.remove('gone');
  }
}
