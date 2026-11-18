import { droppedTexture } from '../assets/drop';
import * as THREE from 'three';

/**
 * Procedural texture library for sewer, tunnel and cave environments.
 * Every texture is painted into a plain RGBA pixel buffer (so it also works under node),
 * is deterministic (seeded PRNG) and tiles seamlessly (all coordinates wrap).
 * Sampled with nearest-neighbor filtering so they read as chunky PS1 texels.
 */

export interface TexturePixels {
  size: number;
  /** RGBA, row-major. */
  data: Uint8Array;
}

type Rand = () => number;
type Painter = (p: Px, rand: Rand) => void;

function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Colour helpers (colours are packed 0xRRGGBB numbers)
// ---------------------------------------------------------------------------

const c255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
const rgb = (r: number, g: number, b: number): number => (c255(r) << 16) | (c255(g) << 8) | c255(b);
const chR = (c: number): number => (c >> 16) & 255;
const chG = (c: number): number => (c >> 8) & 255;
const chB = (c: number): number => c & 255;
/** Multiply brightness. */
const shade = (c: number, f: number): number => rgb(chR(c) * f, chG(c) * f, chB(c) * f);
const mix = (a: number, b: number, t: number): number =>
  rgb(chR(a) + (chR(b) - chR(a)) * t, chG(a) + (chG(b) - chG(a)) * t, chB(a) + (chB(b) - chB(a)) * t);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Ordered-dither threshold in (0,1). */
const bayer = (x: number, y: number): number => (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;

/** Map a 0..1 value onto a palette with ordered dithering. */
function ramp(v: number, pal: readonly number[], x: number, y: number, dith = 0.15): number {
  const n = pal.length;
  const i = Math.floor((v + (bayer(x, y) - 0.5) * dith) * n);
  return pal[i < 0 ? 0 : i >= n ? n - 1 : i];
}

const pick = <T>(rand: Rand, arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

// ---------------------------------------------------------------------------
// Pixel buffer with wrap-aware drawing helpers
// ---------------------------------------------------------------------------

class Px {
  readonly data: Uint8Array;
  constructor(readonly size: number) {
    this.data = new Uint8Array(size * size * 4);
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255;
  }

  private idx(x: number, y: number): number {
    const s = this.size;
    const xx = ((Math.floor(x) % s) + s) % s;
    const yy = ((Math.floor(y) % s) + s) % s;
    return (yy * s + xx) * 4;
  }

  set(x: number, y: number, c: number): void {
    const i = this.idx(x, y);
    this.data[i] = (c >> 16) & 255;
    this.data[i + 1] = (c >> 8) & 255;
    this.data[i + 2] = c & 255;
  }

  get(x: number, y: number): number {
    const i = this.idx(x, y);
    return (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
  }

  /** Multiply the brightness of an existing pixel. */
  tint(x: number, y: number, f: number): void {
    this.set(x, y, shade(this.get(x, y), f));
  }

  /** Blend an existing pixel toward a colour. */
  blend(x: number, y: number, c: number, t: number): void {
    this.set(x, y, mix(this.get(x, y), c, t));
  }

  fill(c: number): void {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) this.set(x, y, c);
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, c);
  }

  hline(x: number, y: number, w: number, c: number): void {
    this.rect(x, y, w, 1, c);
  }

  vline(x: number, y: number, h: number, c: number): void {
    this.rect(x, y, 1, h, c);
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: number): void {
    const R = Math.ceil(r);
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) if (x * x + y * y <= r * r) this.set(cx + x, cy + y, c);
  }

  /** Per-pixel fill from a function. */
  each(fn: (x: number, y: number) => number): void {
    for (let y = 0; y < this.size; y++) for (let x = 0; x < this.size; x++) this.set(x, y, fn(x, y));
  }

  speckle(rand: Rand, n: number, c: number | readonly number[]): void {
    for (let i = 0; i < n; i++) {
      const col = typeof c === 'number' ? c : pick(rand, c);
      this.set(Math.floor(rand() * this.size), Math.floor(rand() * this.size), col);
    }
  }

  /** Wandering crack. */
  crack(rand: Rand, x: number, y: number, len: number, angle: number, c: number, wobble = 0.8): void {
    let a = angle;
    let fx = x;
    let fy = y;
    for (let i = 0; i < len; i++) {
      this.set(fx, fy, c);
      a += (rand() - 0.5) * wobble;
      fx += Math.cos(a);
      fy += Math.sin(a);
    }
  }
}

// ---------------------------------------------------------------------------
// Tileable noise fields and cellular patterns
// ---------------------------------------------------------------------------

type Field = Float32Array;

function noiseField(size: number, cx: number, cy: number, rand: Rand): Field {
  const g = new Float32Array(cx * cy);
  for (let i = 0; i < g.length; i++) g[i] = rand();
  const out = new Float32Array(size * size);
  const sx = cx / size;
  const sy = cy / size;
  for (let y = 0; y < size; y++) {
    const fy = y * sy;
    const y0 = Math.floor(fy);
    let ty = fy - y0;
    ty = ty * ty * (3 - 2 * ty);
    const y1 = (y0 + 1) % cy;
    for (let x = 0; x < size; x++) {
      const fx = x * sx;
      const x0 = Math.floor(fx);
      let tx = fx - x0;
      tx = tx * tx * (3 - 2 * tx);
      const x1 = (x0 + 1) % cx;
      const a = g[y0 * cx + x0] + (g[y0 * cx + x1] - g[y0 * cx + x0]) * tx;
      const b = g[y1 * cx + x0] + (g[y1 * cx + x1] - g[y1 * cx + x0]) * tx;
      out[y * size + x] = a + (b - a) * ty;
    }
  }
  return out;
}

/** Fractal noise, normalised to 0..1 (min-max), tileable. */
function fbm(size: number, rand: Rand, base = 4, octaves = 3, gain = 0.5): Field {
  const out = new Float32Array(size * size);
  let amp = 1;
  for (let o = 0; o < octaves; o++) {
    const cells = Math.min(size, base * 2 ** o);
    const f = noiseField(size, cells, cells, rand);
    for (let i = 0; i < out.length; i++) out[i] += f[i] * amp;
    amp *= gain;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < out.length; i++) {
    if (out[i] < lo) lo = out[i];
    if (out[i] > hi) hi = out[i];
  }
  const k = 1 / (hi - lo || 1);
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) * k;
  return out;
}

const fAt = (f: Field, size: number, x: number, y: number): number => {
  const xx = ((x % size) + size) % size;
  const yy = ((y % size) + size) % size;
  return f[yy * size + xx];
};

interface Cell {
  id: number;
  d1: number;
  d2: number;
  /** Vector from the pixel to the nearest feature point. */
  dx: number;
  dy: number;
}

/** Tileable voronoi on an n x n jittered grid. */
function voronoi(size: number, n: number, rand: Rand, jitter = 0.85): Cell[] {
  const cs = size / n;
  const pts: { x: number; y: number }[] = [];
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) pts.push({ x: (i + 0.5 + (rand() - 0.5) * jitter) * cs, y: (j + 0.5 + (rand() - 0.5) * jitter) * cs });
  const out: Cell[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / cs);
      const gy = Math.floor(y / cs);
      let d1 = 1e9;
      let d2 = 1e9;
      let id = 0;
      let bdx = 0;
      let bdy = 0;
      for (let j = gy - 1; j <= gy + 1; j++) {
        for (let i = gx - 1; i <= gx + 1; i++) {
          const wi = ((i % n) + n) % n;
          const wj = ((j % n) + n) % n;
          const pt = pts[wj * n + wi];
          const dx = pt.x + (i - wi) * cs - (x + 0.5);
          const dy = pt.y + (j - wj) * cs - (y + 0.5);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            id = wj * n + wi;
            bdx = dx;
            bdy = dy;
          } else if (d < d2) d2 = d;
        }
      }
      out.push({ id, d1, d2, dx: bdx, dy: bdy });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared painting building blocks
// ---------------------------------------------------------------------------

interface BrickOpts {
  rows: number;
  cols: number;
  stagger?: boolean;
  mortar: number;
  pal: readonly number[];
  /** Per-pixel brightness noise (0..1). */
  grain?: number;
}

/** Courses of bricks with a lit top edge and a shaded bottom edge. */
function bricks(p: Px, rand: Rand, o: BrickOpts): void {
  const bw = p.size / o.cols;
  const rh = p.size / o.rows;
  p.fill(o.mortar);
  for (let r = 0; r < o.rows; r++) {
    const off = o.stagger && r % 2 ? bw / 2 : 0;
    for (let c = 0; c < o.cols; c++) {
      const x0 = c * bw + off;
      const y0 = r * rh;
      const col = pick(rand, o.pal);
      for (let yy = 1; yy < rh; yy++) {
        for (let xx = 1; xx < bw; xx++) {
          let f = 1;
          if (yy === 1) f = 1.22;
          else if (yy === rh - 1 && rh >= 4) f = 0.78;
          if (xx === bw - 1 && bw >= 6) f *= 0.9;
          if (o.grain && rand() < o.grain) f *= rand() < 0.5 ? 0.84 : 1.14;
          p.set(x0 + xx, y0 + yy, shade(col, f));
        }
      }
    }
  }
}

/** Replace pixels where the field exceeds a threshold with a dithered ramp. */
function overlay(p: Px, f: Field, thr: number, pal: readonly number[], dith = 0.3, mask?: (x: number, y: number) => boolean): void {
  const s = p.size;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const v = f[y * s + x];
      if (v <= thr) continue;
      if (mask && !mask(x, y)) continue;
      p.set(x, y, ramp((v - thr) / (1 - thr), pal, x, y, dith));
    }
}

/** Streaky wood grain along one axis. */
function wood(p: Px, rand: Rand, x: number, y: number, w: number, h: number, vertical: boolean, pal: readonly number[]): void {
  const lines = vertical ? w : h;
  const len = vertical ? h : w;
  let k = Math.floor(rand() * pal.length);
  for (let j = 0; j < lines; j++) {
    if (rand() < 0.45) k = Math.floor(rand() * pal.length);
    for (let i = 0; i < len; i++) {
      const c = rand() < 0.04 ? pal[0] : pal[k];
      if (vertical) p.set(x + j, y + i, c);
      else p.set(x + i, y + j, c);
    }
  }
}

/** Dark drip stains running down from the top of a region. */
function drips(p: Px, rand: Rand, x0: number, y0: number, w: number, count: number, maxLen: number, pal: readonly number[]): void {
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.floor(rand() * w);
    const len = 3 + Math.floor(rand() * maxLen);
    for (let j = 0; j < len; j++) {
      const c = pal[Math.min(pal.length - 1, Math.floor((j / len) * pal.length))];
      p.set(x, y0 + j, c);
      if (j < len / 2 && rand() < 0.35) p.set(x + 1, y0 + j, pal[0]);
    }
  }
}

function rivet(p: Px, x: number, y: number, lit: number, dark: number): void {
  p.set(x + 1, y + 1, dark);
  p.set(x, y + 1, dark);
  p.set(x + 1, y, dark);
  p.set(x, y, lit);
}

/** Rocky height-field shading: emboss + dithered ramp. */
function rock(p: Px, rand: Rand, pal: readonly number[], crackCol: number, base = 4, crackW = 0.022): Field {
  const s = p.size;
  const h = fbm(s, rand, base, 4, 0.55);
  const h2 = fbm(s, rand, 3, 3, 0.5);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const e = h[y * s + x] - fAt(h, s, x + 1, y + 1);
      const v = h[y * s + x] * 0.75 + 0.12 + e * 4;
      p.set(x, y, ramp(v, pal, x, y, 0.14));
      if (Math.abs(h2[y * s + x] - 0.5) < crackW) p.set(x, y, crackCol);
    }
  }
  return h2;
}

// ---------------------------------------------------------------------------
// Texture definitions
// ---------------------------------------------------------------------------

/** Legacy mid-grey blocks (tinted by vertex colour in chamber.ts). */
function legacyBlocks(courses: number, perCourse: number, base: number, mortar: number): Painter {
  return (p, rand) => {
    const size = p.size;
    p.fill(rgb(mortar, mortar, mortar - 6));
    const rowH = size / courses;
    const bw = size / perCourse;
    for (let r = 0; r < courses; r++) {
      const offset = r % 2 === 0 ? 0 : bw / 2;
      for (let c = -1; c <= perCourse; c++) {
        const x = c * bw + offset;
        const v = base + Math.floor((rand() - 0.5) * 36);
        p.rect(x + 1, r * rowH + 1, bw - 2, rowH - 2, rgb(v, v, v - 4));
      }
    }
    for (let i = 0; i < 60; i++) {
      const v = rand() < 0.5 ? 60 : 210;
      p.blend(Math.floor(rand() * size), Math.floor(rand() * size), rgb(v, v, v), 0.5);
    }
  };
}

const paintWater: Painter = (p, rand) => {
  const s = p.size;
  p.fill(rgb(34, 70, 46));
  for (let y = 0; y < s; y += 4) {
    const a = 0.25 + rand() * 0.25;
    const phase = rand() * s;
    for (let x = 0; x < s; x++) {
      const py = Math.round(y + Math.sin(((x + phase) * Math.PI * 2 * 4) / s) * 1.2);
      p.blend(x, py, rgb(140, 210, 150), a);
    }
  }
  for (let i = 0; i < 40; i++) {
    const v = rand() < 0.5 ? 20 : 170;
    p.blend(Math.floor(rand() * s), Math.floor(rand() * s), rgb(v, v + 20, v), 0.4);
  }
};

// ---- sewer ----------------------------------------------------------------

const paintSewerBrick: Painter = (p, rand) => {
  const s = p.size;
  bricks(p, rand, { rows: 8, cols: 4, stagger: true, mortar: 0x262c22, pal: [0x5c463a, 0x4c3b32, 0x68503f, 0x42352e], grain: 0.12 });
  const f = fbm(s, rand, 8, 2);
  // Slime creeps over the brickwork, mostly in thin stains along the mortar.
  overlay(p, f, 0.64, [0x2a4a20, 0x34622a, 0x4c8a34], 0.35, (x, y) => (y & 3) < 2 || bayer(x, y) < 0.3);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rand() * s);
    const y0 = Math.floor(rand() * s);
    const len = 5 + Math.floor(rand() * 9);
    for (let j = 0; j < len; j++) p.set(x, y0 + j, j > len - 3 ? 0x86c848 : 0x3f7a2a);
  }
  p.speckle(rand, 8, 0x8ac04a);
};

const paintConcreteSlab: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 3);
  const pal = [0x5e5f5a, 0x696a64, 0x75766e, 0x808178];
  p.each((x, y) => ramp(f[y * s + x], pal, x, y, 0.25));
  p.speckle(rand, 160, [0x4a4b46, 0x8c8d84]);
  // Slab seams: a 2x2 grid of slabs with a lit inner edge.
  for (const o of [0, 32]) {
    for (let i = 0; i < s; i++) {
      p.set(i, o, 0x242622);
      p.set(i, o + 1, 0x3a3c37);
      p.set(o, i, 0x242622);
      p.set(o + 1, i, 0x3a3c37);
    }
  }
  for (const o of [0, 32]) for (let i = 0; i < s; i++) p.set(i, o, 0x242622);
  for (const o of [0, 32]) for (let i = 0; i < s; i++) p.set(o, i, 0x242622);
  // Cracks and drip stains.
  p.crack(rand, 10, 4, 22, 1.2, 0x2a2b27);
  p.crack(rand, 14, 20, 12, 0.4, 0x2a2b27);
  p.crack(rand, 44, 38, 20, 1.9, 0x2a2b27);
  p.crack(rand, 48, 40, 10, 0.9, 0x2a2b27);
  drips(p, rand, 4, 2, 26, 4, 14, [0x4a4a3a, 0x3e4030, 0x34382c]);
  drips(p, rand, 36, 34, 26, 4, 12, [0x4c3e30, 0x40362c, 0x363028]);
  const stain = fbm(s, rand, 8, 2);
  overlay(p, stain, 0.74, [0x585a4c, 0x4c5044], 0.5);
};

const paintRustPlate: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 3);
  const rust = [0x4a2a18, 0x6a3a1c, 0x8a4c22, 0xa86030];
  const steel = [0x3c3e40, 0x4a4d50];
  p.each((x, y) => (f[y * s + x] > 0.58 ? ramp((f[y * s + x] - 0.58) * 2.4, rust, x, y, 0.3) : ramp(f[y * s + x] * 2, steel, x, y, 0.3)));
  for (let q = 0; q < 2; q++) {
    const y0 = q * 32;
    p.hline(0, y0, s, 0x16110e);
    p.hline(0, y0 + 1, s, 0x5c5e60);
    p.hline(0, y0 + 31, s, 0x1a1512);
    p.vline(0, y0, 32, 0x16110e);
    p.vline(1, y0 + 1, 30, 0x5c5e60);
    for (let k = 0; k < 8; k++) {
      for (const [rx, ry] of [
        [k * 8 + 3, y0 + 3],
        [k * 8 + 3, y0 + 27],
      ]) {
        rivet(p, rx, ry, 0xb8a890, 0x1c1410);
        for (let j = 2; j < 2 + Math.floor(rand() * 7); j++) p.blend(rx, ry + j * (ry > y0 + 10 ? -1 : 1), 0x3a1e10, 0.7);
      }
    }
    for (let k = 1; k < 3; k++) {
      rivet(p, 3, y0 + 3 + k * 8, 0xb8a890, 0x1c1410);
      rivet(p, 59, y0 + 3 + k * 8, 0xb8a890, 0x1c1410);
    }
  }
  p.speckle(rand, 40, 0x2a1a10);
  p.speckle(rand, 20, 0xc07838);
};

const paintDrainGrate: Painter = (p, rand) => {
  p.fill(0x4d4d46);
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 4; i++) {
      const x = 2 + i * 8;
      const y = 2 + j * 8;
      p.rect(x, y, 6, 6, 0x07100a);
      p.hline(x, y + 5, 6, j === 3 ? 0x1c3a20 : 0x102414);
      // Lit top and left edge of the surrounding bars.
      p.hline(x - 1, y - 1, 8, 0x6e6e64);
      p.vline(x - 1, y - 1, 8, 0x6e6e64);
      p.hline(x - 1, y + 6, 8, 0x2a2a26);
    }
  }
  p.speckle(rand, 16, 0x6a4a30);
  p.speckle(rand, 10, 0x2e2e2a);
};

const paintPipeBands: Painter = (p, rand) => {
  const s = p.size;
  // Cylinder shading, top to bottom.
  const rows = [0x1c2220, 0x2c3834, 0x3e4e48, 0x566a60, 0x6a8074, 0x566a60, 0x44564e, 0x34423c, 0x26302c, 0x181e1c];
  for (let y = 0; y < s; y++) {
    const t = y / s;
    const c = rows[Math.min(rows.length - 1, Math.floor(Math.sin(t * Math.PI) ** 0.9 * 0 + t * rows.length))];
    for (let x = 0; x < s; x++) p.set(x, y, c);
  }
  p.each((x, y) => {
    const c = p.get(x, y);
    return bayer(x, y) < 0.18 && rand() < 0.5 ? shade(c, 0.85) : c;
  });
  // Two flange bands with bolts.
  for (const bx of [4, 20]) {
    p.rect(bx, 0, 8, s, 0x2c3834);
    p.vline(bx, 0, s, 0x121816);
    p.vline(bx + 7, 0, s, 0x121816);
    p.vline(bx + 1, 0, s, 0x5c7468);
    p.vline(bx + 2, 0, s, 0x4a6055);
    p.vline(bx + 6, 0, s, 0x1e2824);
    for (let y = 2; y < s; y += 6) rivet(p, bx + 3, y, 0x9ab0a2, 0x101614);
  }
  // Rust and green drip streaks.
  p.speckle(rand, 20, 0x6a4026);
  drips(p, rand, 12, 0, 8, 2, 8, [0x2a4c28, 0x1e3a20]);
};

const paintMossStone: Painter = (p, rand) => {
  const s = p.size;
  bricks(p, rand, { rows: 4, cols: 2, stagger: true, mortar: 0x1e211c, pal: [0x6a6c64, 0x5c5e58, 0x777970, 0x505249], grain: 0.18 });
  const f = fbm(s, rand, 4, 3);
  overlay(p, f, 0.54, [0x22401a, 0x2e5a22, 0x417a2a, 0x5a9a36], 0.4);
  p.speckle(rand, 24, [0x8ac04c, 0x2a4a1e]);
};

const paintWetCobbles: Painter = (p, rand) => {
  const s = p.size;
  const v = voronoi(s, 4, rand, 0.6);
  const cols = [0x4c5258, 0x565a56, 0x4a4e4c, 0x5c5e5a, 0x464c50, 0x525650];
  p.each((x, y) => {
    const c = v[y * s + x];
    if (c.d2 - c.d1 < 1.5) return 0x121612;
    const base = cols[c.id % cols.length];
    const t = c.d1 / 6;
    // Lit from the top-left: shade by the direction toward the stone centre.
    const lit = (-c.dx - c.dy) * 0.045;
    let f = 1.12 - t * 0.5 + lit * 0.6;
    if (c.d2 - c.d1 < 2.6) f *= 0.72;
    return shade(base, Math.max(0.4, f));
  });
  // Wet glints.
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rand() * s);
    const y = Math.floor(rand() * s);
    const c = v[y * s + x];
    if (c.d2 - c.d1 > 3) p.set(x, y, 0x9ab4b8);
  }
  p.speckle(rand, 18, 0x2c4a34);
};

const paintSludge: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 3, 0.55);
  const pal = [0x1a3a10, 0x2a5a14, 0x3f8a1c, 0x6ac42a, 0xa8f048];
  p.each((x, y) => ramp(f[y * s + x], pal, x, y, 0.2));
  // Bubbles.
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rand() * s);
    const y = Math.floor(rand() * s);
    p.set(x + 1, y, 0xc4ff70);
    p.set(x, y + 1, 0xc4ff70);
    p.set(x + 2, y + 1, 0x1a3a10);
    p.set(x + 1, y + 2, 0x1a3a10);
    p.set(x + 1, y + 1, 0x5aa420);
  }
};

const paintSewerWater: Painter = (p, rand) => {
  const s = p.size;
  p.fill(0x14231f);
  const f = fbm(s, rand, 4, 2);
  p.each((x, y) => (f[y * s + x] > 0.55 ? ramp(0.1, [0x1a2f29, 0x1e362f], x, y, 0.9) : 0x14231f));
  for (let y = 1; y < s; y += 5) {
    const phase = rand() * s;
    const k = 2 + Math.floor(rand() * 2);
    for (let x = 0; x < s; x++) {
      const py = Math.round(y + Math.sin(((x + phase) * Math.PI * 2 * k) / s) * 1.4);
      p.set(x, py, 0x2c4a40);
      if (rand() < 0.3) p.set(x, py - 1, 0x3e6a58);
      if (rand() < 0.12) p.set(x, py, 0x6a9a7c);
    }
  }
  p.speckle(rand, 6, 0x4a3a22);
};

const paintCeramicTiles: Painter = (p, rand) => {
  const s = p.size;
  p.fill(0x2e312a);
  const pal = [0xa8b09c, 0x9ca692, 0xb2baa6, 0x929c88];
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const x0 = tx * 8;
      const y0 = ty * 8;
      const c = pick(rand, pal);
      p.rect(x0 + 1, y0 + 1, 7, 7, c);
      p.hline(x0 + 1, y0 + 1, 7, shade(c, 1.15));
      p.vline(x0 + 1, y0 + 1, 7, shade(c, 1.1));
      p.hline(x0 + 1, y0 + 7, 7, shade(c, 0.78));
      p.vline(x0 + 7, y0 + 2, 6, shade(c, 0.85));
      if (rand() < 0.35) p.crack(rand, x0 + 1 + rand() * 6, y0 + 1, 8, 1.2 + (rand() - 0.5), 0x3a3e34, 0.9);
      if (rand() < 0.12) {
        p.rect(x0 + 5, y0 + 5, 2, 2, 0x4a4e3e);
        p.set(x0 + 4, y0 + 5, shade(c, 1.2));
      }
    }
  }
  // Grime accumulates at the bottom of each tile row and under cracks.
  const f = fbm(s, rand, 4, 3);
  overlay(p, f, 0.62, [0x7a8268, 0x626a52], 0.4, (x, y) => (y & 7) > 4 && p.get(x, y) !== 0x2e312a);
  p.speckle(rand, 20, 0x5a6048);
};

const paintArchTrim: Painter = (p, rand) => {
  const stone = [0x74746a, 0x686860, 0x80807a, 0x5e5e56];
  p.fill(0x1e201c);
  // Upper course: two big dressed blocks with a bevel.
  for (let b = 0; b < 2; b++) {
    const x0 = b * 16;
    const c = pick(rand, stone);
    p.rect(x0 + 1, 1, 15, 12, c);
    p.hline(x0 + 1, 1, 15, shade(c, 1.25));
    p.vline(x0 + 1, 1, 12, shade(c, 1.15));
    p.hline(x0 + 1, 12, 15, shade(c, 0.7));
    p.vline(x0 + 15, 2, 11, shade(c, 0.82));
    p.rect(x0 + 4, 4, 9, 6, shade(c, 0.93));
  }
  // Moulding.
  p.hline(0, 13, 32, 0x9c9c90);
  p.hline(0, 14, 32, 0x84847a);
  p.hline(0, 15, 32, 0x5a5a52);
  p.hline(0, 16, 32, 0x24261f);
  p.hline(0, 17, 32, 0x14160f);
  // Voussoirs: upright wedge stones.
  for (let b = 0; b < 4; b++) {
    const x0 = b * 8;
    const c = pick(rand, stone);
    const top = 18 + (b % 2);
    p.rect(x0 + 1, top, 7, 32 - top, c);
    p.hline(x0 + 1, top, 7, shade(c, 1.22));
    p.vline(x0 + 1, top, 32 - top, shade(c, 1.12));
    p.vline(x0 + 7, top + 1, 31 - top, shade(c, 0.78));
  }
  p.speckle(rand, 30, [0x4a4a42, 0x8c8c82]);
  drips(p, rand, 0, 17, 32, 3, 8, [0x3a4430, 0x2c3624]);
};

// ---- tunnel ---------------------------------------------------------------

const paintDirt: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 4, 0.55);
  const pal = [0x2e2014, 0x3e2c1c, 0x523a24, 0x68492c];
  p.each((x, y) => ramp(f[y * s + x], pal, x, y, 0.3));
  p.speckle(rand, 30, 0x1c130c);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(rand() * s);
    const y = Math.floor(rand() * s);
    p.set(x, y, 0x8a7458);
    p.set(x + 1, y, 0x6a563e);
    p.set(x, y + 1, 0x3a2a1a);
  }
};

const paintDirtRoots: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 3);
  const pal = [0x2a1c12, 0x3a281a, 0x4c3622];
  p.each((x, y) => ramp(f[y * s + x], pal, x, y, 0.3));
  p.speckle(rand, 20, 0x1a110a);
  const root = (x: number, y: number, len: number, ang: number, depth: number): void => {
    let a = ang;
    let fx = x;
    let fy = y;
    for (let i = 0; i < len; i++) {
      p.set(fx, fy + 1, 0x1c120a);
      p.set(fx, fy, 0x7a5c38);
      p.set(fx, fy - 1, i % 3 === 0 ? 0xa8845a : 0x8a6a42);
      a += (rand() - 0.5) * 0.7;
      fx += Math.cos(a);
      fy += Math.sin(a);
      if (depth > 0 && i > 6 && i % 9 === 0 && rand() < 0.7) root(fx, fy, 8 + Math.floor(rand() * 8), a + (rand() < 0.5 ? 0.9 : -0.9), depth - 1);
    }
  };
  root(0, 8, 34, 0.35, 1);
  root(6, 28, 30, -0.4, 1);
  root(20, 0, 22, 1.5, 1);
};

const paintPlanks: Painter = (p, rand) => {
  const grain = [0x2c1c10, 0x5a3c22, 0x654328, 0x71502f];
  for (let i = 0; i < 4; i++) {
    const x0 = i * 8;
    wood(p, rand, x0, 0, 8, 32, true, grain);
    p.vline(x0, 0, 32, 0x180e08);
    p.vline(x0 + 1, 0, 32, 0x84603a);
    p.vline(x0 + 7, 0, 32, 0x3a2614);
    // Butt joint where the board ends.
    const j = 4 + Math.floor(rand() * 24);
    p.hline(x0, j, 8, 0x180e08);
    p.hline(x0, j + 1, 8, 0x7a5834);
    // Knot.
    if (rand() < 0.5) {
      const ky = 4 + Math.floor(rand() * 24);
      p.rect(x0 + 3, ky, 3, 3, 0x2c1a0e);
      p.set(x0 + 4, ky + 1, 0x4c3018);
    }
    // Nails.
    for (const ny of [3, 29]) {
      p.set(x0 + 3, ny, 0x8a8a84);
      p.set(x0 + 4, ny, 0x30302c);
    }
  }
};

const paintBeamEnd: Painter = (p, rand) => {
  p.fill(0x1c1208);
  const rings = [0x70502c, 0x5a3e22, 0x7e5c34, 0x4a3018];
  p.rect(1, 1, 30, 30, 0x4a3018);
  const cx = 15.5 + (rand() - 0.5) * 3;
  const cy = 15.5 + (rand() - 0.5) * 3;
  for (let y = 1; y < 31; y++) {
    for (let x = 1; x < 31; x++) {
      const d = Math.max(Math.abs(x - cx), Math.abs(y - cy) * 0.9) + Math.sin(x * 0.5 + y * 0.3) * 0.5;
      p.set(x, y, rings[Math.floor(d / 1.6) % rings.length]);
    }
  }
  // Checks (radial splits).
  p.crack(rand, cx, cy, 13, 0.5, 0x1c1208, 0.3);
  p.crack(rand, cx, cy, 11, 3.8, 0x1c1208, 0.3);
  p.rect(1, 1, 30, 1, 0x8a6a40);
  p.rect(1, 1, 1, 30, 0x7a5c36);
  p.rect(1, 30, 30, 1, 0x2a1a0c);
  p.rect(30, 1, 1, 30, 0x2a1a0c);
  p.speckle(rand, 14, 0x2a1a0c);
};

const paintBeamSide: Painter = (p, rand) => {
  wood(p, rand, 0, 0, 32, 32, false, [0x2c1c10, 0x5a3c22, 0x654328, 0x71502f]);
  p.hline(0, 0, 32, 0x1c1208);
  p.hline(0, 1, 32, 0x84603a);
  p.hline(0, 31, 32, 0x1c1208);
  p.hline(0, 30, 32, 0x2e1c0e);
  // Iron straps with bolts.
  for (const x0 of [4, 22]) {
    p.rect(x0, 0, 6, 32, 0x30322f);
    p.vline(x0, 0, 32, 0x58605c);
    p.vline(x0 + 5, 0, 32, 0x141614);
    for (const y of [4, 16, 26]) rivet(p, x0 + 2, y, 0x9a8c78, 0x121210);
    for (let j = 0; j < 2; j++) drips(p, rand, x0, 0, 6, 1, 6, [0x6a3a1c, 0x4c2a14]);
  }
  p.speckle(rand, 14, 0x1c1208);
};

const paintRubbleWall: Painter = (p, rand) => {
  const s = p.size;
  const v = voronoi(s, 5, rand, 0.9);
  const cols = [0x64625a, 0x56544e, 0x726e62, 0x5c5a52, 0x6a6458, 0x4e4c48, 0x7a7668];
  const mortar = [0x3c382e, 0x44402f];
  const fine = fbm(s, rand, 8, 2);
  p.each((x, y) => {
    const c = v[y * s + x];
    if (c.d2 - c.d1 < 2.6) return ramp(fine[y * s + x], mortar, x, y, 0.5);
    const lit = (-c.dx - c.dy) * 0.03;
    let f = 1 + lit - (c.d2 - c.d1 < 4 ? 0.2 : 0) + (fine[y * s + x] - 0.5) * 0.3;
    if (c.d2 - c.d1 < 3.6 && -c.dx - c.dy < 0) f += 0.0;
    return shade(cols[c.id % cols.length], Math.max(0.45, f));
  });
  p.speckle(rand, 70, [0x2e2c26, 0x8c8878]);
};

const paintGravelRail: Painter = (p, rand) => {
  const s = p.size;
  const gravel = [0x3e3c38, 0x4e4a44, 0x5c574e, 0x2e2c28, 0x6a645a, 0x48443c];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) p.set(x, y, pick(rand, gravel));
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rand() * s);
    const y = Math.floor(rand() * s);
    const c = pick(rand, gravel);
    p.set(x, y, shade(c, 1.2));
    p.set(x + 1, y, c);
    p.set(x, y + 1, shade(c, 0.7));
  }
  // Sleeper.
  wood(p, rand, 0, 9, 32, 14, false, [0x1c1208, 0x3e2a18, 0x4a3320, 0x56391f]);
  p.hline(0, 9, 32, 0x1a1008);
  p.hline(0, 10, 32, 0x6a4a2c);
  p.hline(0, 22, 32, 0x140c06);
  // Rails running down the tile.
  for (const rx of [4, 23]) {
    p.rect(rx, 0, 5, 32, 0x44464a);
    p.vline(rx, 0, 32, 0x8a8e92);
    p.vline(rx + 1, 0, 32, 0x6a6e72);
    p.vline(rx + 4, 0, 32, 0x1c1e20);
    for (const sy of [11, 19]) {
      p.set(rx + 2, sy, 0x1a1210);
      p.set(rx + 3, sy, 0x6a3a1c);
    }
    drips(p, rand, rx + 1, 0, 3, 1, 5, [0x6a3a1c, 0x4c2a14]);
  }
};

const paintMineBrick: Painter = (p, rand) => {
  const s = p.size;
  bricks(p, rand, { rows: 8, cols: 4, stagger: true, mortar: 0x2a2620, pal: [0x5a3a2c, 0x4a3226, 0x664434, 0x3c2a22, 0x543c30], grain: 0.2 });
  const f = fbm(s, rand, 4, 3);
  overlay(p, f, 0.55, [0x2a2220, 0x1c1614], 0.5);
  // Missing / crumbled bricks.
  for (let i = 0; i < 2; i++) {
    const x = Math.floor(rand() * 4) * 8 + 2;
    const y = Math.floor(rand() * 8) * 4 + 1;
    p.rect(x, y, 5, 2, 0x140f0c);
  }
  p.speckle(rand, 16, 0x80604a);
};

const paintClay: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 3, 3, 0.45);
  const pal = [0x7a4430, 0x8c5236, 0x9c5e3c, 0xae6c44];
  const v = voronoi(s, 3, rand, 0.9);
  p.each((x, y) => {
    const c = v[y * s + x];
    if (c.d2 - c.d1 < 1.2) return 0x3c1e14;
    const r = ramp(f[y * s + x], pal, x, y, 0.2);
    return c.d2 - c.d1 < 2.4 ? shade(r, 0.82) : r;
  });
  p.speckle(rand, 14, 0xc88a5c);
  p.speckle(rand, 10, 0x5a2c1c);
};

// ---- cave -----------------------------------------------------------------

const paintRoughRock: Painter = (p, rand) => {
  rock(p, rand, [0x1c1e22, 0x2a2d32, 0x3a3e44, 0x4c5058, 0x626870], 0x0c0d10);
  p.speckle(rand, 20, 0x7a8088);
};

const paintWetRock: Painter = (p, rand) => {
  const s = p.size;
  rock(p, rand, [0x0e1418, 0x16212a, 0x203040, 0x2e4558], 0x05080a, 4, 0.02);
  // Vertical wet sheen streaks and glints.
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(rand() * s);
    const y0 = Math.floor(rand() * s);
    const len = 4 + Math.floor(rand() * 8);
    for (let j = 0; j < len; j++) p.blend(x, y0 + j, 0x6a98b0, 0.55 - (j / len) * 0.3);
  }
  p.speckle(rand, 12, 0x9ac8d8);
};

const paintSandstone: Painter = (p, rand) => {
  const s = p.size;
  const d = noiseField(s, 4, 4, rand);
  const d2 = noiseField(s, 8, 8, rand);
  const pal = [0x6a4a2c, 0x8a6238, 0xa87c46, 0xc49858, 0xd8b474];
  const tau = Math.PI * 2;
  p.each((x, y) => {
    const yy = y + (d[y * s + x] - 0.5) * 7 + (d2[y * s + x] - 0.5) * 2;
    const v = 0.5 + 0.5 * (Math.sin((tau * 3 * yy) / s) * 0.6 + Math.sin((tau * 7 * yy) / s + 1.3) * 0.4);
    if (Math.sin((tau * 5 * yy) / s + 0.7) > 0.93) return 0x4a3220;
    return ramp(v, pal, x, y, 0.25);
  });
  p.speckle(rand, 40, [0x5a3c22, 0xe0c488]);
};

const paintCrystalRock: Painter = (p, rand) => {
  const s = p.size;
  const h2 = rock(p, rand, [0x14121e, 0x201c2e, 0x2e283f, 0x40385a], 0x08060e, 4, 0.0);
  const h3 = fbm(s, rand, 3, 3);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const a = Math.abs(h3[y * s + x] - 0.5);
      if (a < 0.014) p.set(x, y, 0xd8fcff);
      else if (a < 0.032) p.set(x, y, 0x3ac4e0);
      else if (a < 0.045) p.set(x, y, 0x1c6a88);
    }
  }
  void h2;
  // Glints: small plus shaped sparkles.
  for (let i = 0; i < 3; i++) {
    const x = 4 + Math.floor(rand() * 24);
    const y = 4 + Math.floor(rand() * 24);
    p.set(x, y, 0xffffff);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      p.set(x + dx, y + dy, 0x9a6af0);
  }
};

const paintMudFloor: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 4, 0.5);
  const pal = [0x1e1610, 0x2c2016, 0x3a2c1e, 0x4a3826];
  p.each((x, y) => ramp(f[y * s + x], pal, x, y, 0.3));
  // Puddles with a wet highlight.
  const g = fbm(s, rand, 3, 2);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      if (g[y * s + x] > 0.74) {
        p.set(x, y, bayer(x, y) < 0.5 ? 0x2c2a26 : 0x34322c);
        if (g[(((y - 1) % s) + s) % s * s + x] <= 0.74) p.set(x, y, 0x7a766a);
        if (g[((y + 1) % s) * s + x] <= 0.74) p.set(x, y, 0x1a1610);
      }
    }
  p.speckle(rand, 14, 0x6a5a42);
  p.speckle(rand, 18, 0x120c08);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rand() * s);
    const y = Math.floor(rand() * s);
    p.rect(x, y, 2, 2, 0x5a5348);
    p.set(x, y, 0x827a6a);
  }
};

const paintMossRock: Painter = (p, rand) => {
  const s = p.size;
  rock(p, rand, [0x1e2220, 0x2c3230, 0x3c4440, 0x4e5850], 0x0a0c0a);
  const f = fbm(s, rand, 4, 3, 0.55);
  overlay(p, f, 0.5, [0x1c3a18, 0x2c5a22, 0x468a30, 0x6aa840], 0.4);
  const l = fbm(s, rand, 8, 2);
  overlay(p, l, 0.78, [0xb4b86a, 0xd8d890], 0.2);
  p.speckle(rand, 10, 0xe0e4a0);
};

const paintMushroomPatch: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 3);
  const pal = [0x12161a, 0x1a2020, 0x22302a, 0x2a4030];
  p.each((x, y) => ramp(f[y * s + x], pal, x, y, 0.35));
  const mush = (cx: number, cy: number, r: number): void => {
    // Glow on the ground.
    for (let y = -r - 3; y <= r + 4; y++)
      for (let x = -r - 3; x <= r + 3; x++) {
        const d = Math.sqrt(x * x + (y - 1) * (y - 1));
        if (d < r + 3 && bayer(cx + x, cy + y) > d / (r + 3)) p.blend(cx + x, cy + y, 0x2c7a78, 0.5);
      }
    // Stem.
    p.rect(cx - 1, cy + 1, 2, r, 0xb8d8c8);
    p.vline(cx + 1, cy + 1, r, 0x6a8a80);
    // Cap.
    for (let y = -r; y <= 1; y++)
      for (let x = -r; x <= r; x++) {
        if ((x * x) / (r * r) + (y * y) / (r * r) > 1.05) continue;
        const rim = y >= 0 || (x * x) / (r * r) + (y * y) / (r * r) > 0.78;
        p.set(cx + x, cy + y, rim ? 0x1e7a82 : y < -r * 0.4 && x < 0 ? 0x78f0e0 : 0x38c8c0);
      }
    p.set(cx - 1, cy - r + 1, 0xe0fff8);
    if (r >= 4) p.set(cx + 2, cy - 2, 0xd0fff0);
  };
  mush(9, 12, 5);
  mush(24, 9, 4);
  mush(21, 26, 5);
  mush(5, 28, 3);
  mush(29, 19, 2);
};

const paintStalagmite: Painter = (p, rand) => {
  const s = p.size;
  const n = noiseField(s, 8, 2, rand);
  const n2 = noiseField(s, 16, 4, rand);
  const pal = [0x2e2a28, 0x453f38, 0x5e564a, 0x786e5c, 0x948a74];
  const wob = noiseField(s, 2, 2, rand);
  p.each((x, y) => {
    const xx = x + (wob[y * s + x] - 0.5) * 3;
    const col = 0.5 + 0.5 * Math.sin((Math.PI * 2 * xx) / 16 - 1.2);
    const v = col * 0.55 + n[y * s + x] * 0.3 + n2[y * s + x] * 0.15;
    return ramp(v, pal, x, y, 0.2);
  });
  // Dark crevices between the columns and long drip lines.
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rand() * s);
    const y0 = Math.floor(rand() * s);
    const len = 8 + Math.floor(rand() * 18);
    for (let j = 0; j < len; j++) p.set(x + (j > 10 && j % 7 === 0 ? 1 : 0), y0 + j, 0x1c1a18);
  }
  for (let i = 0; i < 4; i++) {
    const x = Math.floor(rand() * s);
    const y0 = Math.floor(rand() * s);
    for (let j = 0; j < 6 + Math.floor(rand() * 8); j++) p.set(x, y0 + j, 0xa49a82);
  }
};

const paintPoolWater: Painter = (p, rand) => {
  const s = p.size;
  const v = voronoi(s, 4, rand, 0.9);
  const f = fbm(s, rand, 3, 2);
  const deep = [0x0c1c34, 0x102640, 0x16304c];
  p.each((x, y) => {
    const c = v[y * s + x];
    const e = c.d2 - c.d1;
    if (e < 0.9) return 0x6ac8e0;
    if (e < 1.8) return 0x2c709c;
    return ramp(f[y * s + x], deep, x, y, 0.3);
  });
  p.speckle(rand, 8, 0x4a98c0);
};

const paintMagmaRock: Painter = (p, rand) => {
  const s = p.size;
  rock(p, rand, [0x0c0a0c, 0x16121a, 0x221c22, 0x30282c], 0x080608, 4, 0.0);
  const h = fbm(s, rand, 3, 3);
  const h2 = fbm(s, rand, 5, 2);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const a = Math.abs(h[y * s + x] - 0.5) + (h2[y * s + x] - 0.5) * 0.02;
      if (a < 0.012) p.set(x, y, 0xffe060);
      else if (a < 0.03) p.set(x, y, 0xff7a1c);
      else if (a < 0.048) p.set(x, y, 0xa82a12);
      else if (a < 0.065 && bayer(x, y) < 0.5) p.set(x, y, 0x4a1410);
    }
  }
};

// ---- shared ---------------------------------------------------------------

// ---- props: what things are made of (a fire bowl's iron, its burnt inside, its coals) ----

/**
 * Dark cast iron: smooth and quiet, a little lighter where it has been rubbed, with one band and its studs. (Its
 * first painting was busy with hammer marks and rust; on something as small as a fire bowl that was all noise.)
 */
const paintWroughtIron: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 2, 2);
  const iron = [0x2a2c31, 0x33363c, 0x3d4047, 0x484c54];
  p.each((x, y) => ramp(0.25 + f[y * s + x] * 0.55, iron, x, y, 0.2));
  // A band round it, with a lit top edge, a dark under-edge and a row of studs.
  const by = Math.floor(s * 0.6);
  p.rect(0, by, s, 5, 0x30333a);
  p.hline(0, by, s, 0x6a6e78);
  p.hline(0, by + 5, s, 0x15161a);
  for (let x = 3; x < s; x += 8) rivet(p, x, by + 2, 0x8a8e98, 0x15161a);
  // A soft line of light along the top, as on a cast edge, and a shadow at the foot.
  p.hline(0, 1, s, 0x565a63);
  p.hline(0, s - 1, s, 0x1c1d22);
};

/**
 * One block of dressed stone, with no joints in it: what a thing stands on (a fire bowl's foot). The room's own stone
 * is a wall of blocks with mortar between them, and on a single foot that looked like a piece of the floor.
 */
const paintCutStone: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 3, 3);
  const stone = [0x6c6860, 0x79756b, 0x878378, 0x959186];
  p.each((x, y) => ramp(0.2 + f[y * s + x] * 0.62, stone, x, y, 0.3));
  // The marks of the chisel: short faint strokes, all leaning the same way.
  for (let k = 0; k < 16; k++) {
    const x = Math.floor(rand() * s), y = Math.floor(rand() * s);
    for (let j = 0; j < 3; j++) p.blend(x + j, y - j, 0x55524b, 0.35);
  }
  p.speckle(rand, 10, [0x4e4b45, 0xa6a296]);
  // A worked edge: light along the top of the block, shadow along its foot.
  p.hline(0, 0, s, 0xa9a598);
  p.hline(0, 1, s, 0x9a968a);
  p.hline(0, s - 1, s, 0x47443f);
  p.hline(0, s - 2, s, 0x5a5750);
};

/** The inside of a fire bowl: burnt black, flaked with grey ash, cracked, an ember or two still alive in it. */
const paintCharred: Painter = (p, rand) => {
  const s = p.size;
  const f = fbm(s, rand, 4, 3);
  const soot = [0x050505, 0x0b0a09, 0x14110f, 0x1e1a17, 0x2a2521];
  p.each((x, y) => ramp(f[y * s + x] * 0.9, soot, x, y, 0.4));
  for (let k = 0; k < 5; k++) p.crack(rand, Math.floor(rand() * s), Math.floor(rand() * s), 6 + rand() * 8, rand() * Math.PI * 2, 0x000000);
  p.speckle(rand, 34, [0x4a4844, 0x5e5a54, 0x38342f]); // ash
  p.speckle(rand, 5, [0x8a2a0c, 0xc84a12]); // embers
};

/**
 * An old couch's cloth: a warm rust-red weave, faded where it has been sat on, with the damp stains and the loose
 * threads of something that has lived in a sewer a long while and is still the best seat in the house.
 */
const paintCouchFabric: Painter = (p, rand) => {
  const s = p.size;
  const wear = fbm(s, rand, 3, 3);
  const cloth = [0x6a3226, 0x7e3e2e, 0x944c36, 0xa85a40, 0xba6c4c];
  p.each((x, y) => {
    // The weave: over and under, two dots to a thread; the ribs of the cloth run up it every four dots.
    const over = ((x >> 1) + (y >> 1)) & 1 ? 0.06 : -0.04;
    const rib = x % 4 === 0 ? -0.12 : 0;
    return ramp(0.34 + wear[y * s + x] * 0.42 + over + rib, cloth, x, y, 0.25);
  });
  // Faded where it is worn thin: paler, and a little yellowed.
  p.each((x, y) => (wear[y * s + x] > 0.7 ? mix(p.get(x, y), 0xc08a62, (wear[y * s + x] - 0.7) * 1.6) : p.get(x, y)));
  // Damp stains: dark blotches of no particular shape, each with a darker tide-mark round its edge.
  const damp = fbm(s, rand, 2, 3);
  p.each((x, y) => {
    const d = damp[y * s + x] + (bayer(x, y) - 0.5) * 0.03;
    if (d > 0.66) return mix(p.get(x, y), 0x4a3024, 0.34);
    if (d > 0.635) return mix(p.get(x, y), 0x2a1a12, 0.5);
    return p.get(x, y);
  });
  // A pale water mark or two, loose threads, and crumbs.
  for (let k = 0; k < 2; k++) {
    const cx = rand() * s, cy = rand() * s, r = 3 + rand() * 3;
    for (let a = 0; a < 40; a++) p.blend(cx + Math.cos(a * 0.157) * r, cy + Math.sin(a * 0.157) * r * 0.7, 0xc8a888, 0.35);
  }
  for (let k = 0; k < 7; k++) {
    const x = rand() * s, y = rand() * s, a = rand() * Math.PI;
    p.line(x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 0xd0a078);
  }
  p.speckle(rand, 16, [0x2a1810, 0xd8c080]);
};

/**
 * CORK (2026-11-18: the Club's stools were plain colour): pale tan, packed with small dark pores of every size and the
 * odd lighter fleck, the way the end of a wine cork looks close up.
 */
const paintCork: Painter = (p, rand) => {
  const s = p.size;
  const grain = fbm(s, rand, 6, 3);
  const cork = [0x9a6e42, 0xb08050, 0xc4945e, 0xd2a46c, 0xdcb27a];
  p.each((x, y) => ramp(0.3 + grain[y * s + x] * 0.55, cork, x, y, 0.3));
  // Pores: little dark holes, a few bigger ones, each with a darker heart.
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(rand() * s), y = Math.floor(rand() * s);
    const big = rand() < 0.2;
    p.blend(x, y, 0x5a3a1e, 0.75);
    if (big) {
      p.blend(x + 1, y, 0x6a4626, 0.6);
      p.blend(x, y + 1, 0x6a4626, 0.6);
      p.blend(x + 1, y + 1, 0x7a5430, 0.4);
    }
  }
  p.speckle(rand, 30, [0xe8c690, 0x7a5434]);
};

/**
 * TIN (2026-11-18: the thimble mugs and the keg were plain colour): a dull grey metal, pressed all over with the little
 * round dimples a thimble has, each lit on one side and shaded on the other, and a few fine scratches.
 */
const paintTin: Painter = (p, rand) => {
  const s = p.size;
  const wear = fbm(s, rand, 3, 2);
  const tin = [0x8a8a86, 0x9c9c96, 0xaeaea6, 0xc0c0b6, 0xd0d0c6];
  p.each((x, y) => ramp(0.35 + wear[y * s + x] * 0.4, tin, x, y, 0.2));
  // Dimples in rows, every other row shifted: a light dot up and left, a shadow down and right.
  const step = 4;
  for (let y = 1; y < s; y += step) {
    for (let x = (y / step) % 2 ? 3 : 1; x < s; x += step) {
      p.blend(x, y, 0xe6e6dc, 0.45);
      p.blend(x + 1, y + 1, 0x5e5e5a, 0.5);
    }
  }
  for (let k = 0; k < 6; k++) {
    const x = rand() * s, y = rand() * s, a = rand() * Math.PI;
    p.line(x, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5, 0xdedcd0);
  }
};

/** A patch sewn onto it: a square of somebody's old plaid, the stitches showing all round its edge. */
const paintCouchPatch: Painter = (p, rand) => {
  const s = p.size;
  const plaid = [0x4a5a2a, 0x5c6c34, 0x70803e];
  p.each((x, y) => ramp(0.4 + (((x >> 1) + (y >> 1)) & 1 ? 0.12 : 0) + rand() * 0.2, plaid, x, y, 0.3));
  for (let k = 5; k < s; k += 10) {
    p.rect(k, 0, 2, s, 0x8a3a2a);
    p.rect(0, k, s, 2, 0x8a3a2a);
    p.rect(k + 4, 0, 1, s, 0xd8c078);
    p.rect(0, k + 4, s, 1, 0xd8c078);
  }
  // Its edge is frayed and turned under; the stitches are big, pale and not very straight.
  for (let i = 0; i < s; i++) {
    for (const [x, y] of [[i, 0], [i, s - 1], [0, i], [s - 1, i]]) p.set(x, y, rand() < 0.7 ? 0x2a2a16 : 0x70803e);
    if (i % 4 < 2) for (const [x, y] of [[i, 2 + (i % 8 === 0 ? 1 : 0)], [i, s - 3], [2, i], [s - 3 - (i % 8 === 4 ? 1 : 0), i]]) p.set(x, y, 0xe8dcb0);
  }
};

/** A knitted blanket: rows of little V stitches in broad stripes of teal and cream, a stitch dropped here and there. */
const paintKnitBlanket: Painter = (p, rand) => {
  const s = p.size;
  const teal = [0x1f5450, 0x2a6a64, 0x3a8078];
  const cream = [0xb8ac88, 0xd0c49c, 0xe4dab4];
  p.each((x, y) => {
    const stripe = Math.floor(y / 8) % 2 === 0 ? teal : cream;
    // A V to each stitch: four dots wide, its arms dark at the bottom and light at the top.
    const vx = x % 4, vy = y % 4;
    const arm = vx === vy || vx === 3 - vy;
    return stripe[arm ? 2 : vy === 3 ? 0 : 1];
  });
  // A thin line of the other colour through each stripe, as blankets have.
  for (let y = 3; y < s; y += 8) p.hline(0, y, s, Math.floor(y / 8) % 2 === 0 ? 0xd0c49c : 0x2a6a64);
  for (let k = 0; k < 3; k++) {
    const x = Math.floor(rand() * s), y = Math.floor(rand() * s);
    p.set(x, y, 0x10201e);
    p.set(x + 1, y, 0x10201e);
  }
};

/** A bed of coals: black lumps, the fire showing between them. It is drawn unlit, so the cracks glow in the dark. */
const paintCoals: Painter = (p, rand) => {
  const s = p.size;
  const n = 5;
  const cells = voronoi(s, n, rand);
  const lump = [0x0a0706, 0x140c09, 0x21110b, 0x33170c];
  const f = fbm(s, rand, 6, 2);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const c = cells[y * s + x];
      // Near the edge of a lump the fire shows; in its middle it is black, with a dull red where it is hot through.
      const e = (c.d2 - c.d1) / (s / n);
      if (e < 0.1) p.set(x, y, 0xffd24a);
      else if (e < 0.24) p.set(x, y, 0xff7a14);
      else if (e < 0.4) p.set(x, y, bayer(x, y) < 0.6 ? 0xb8300c : 0x5a1608);
      else p.set(x, y, ramp(f[y * s + x] * 0.8 + (c.id % 3) * 0.08, lump, x, y, 0.3));
    }
  }
  p.speckle(rand, 8, 0x6a6660); // ash on the lumps
};

const paintCrate: Painter = (p, rand) => {
  const s = p.size;
  const grain = [0x3a2412, 0x6a4628, 0x784f2e, 0x86593a];
  p.fill(0x1a0f08);
  // Inner planks.
  for (let i = 0; i < 3; i++) {
    const y0 = 8 + i * 16;
    wood(p, rand, 8, y0, 48, 16, false, grain);
    p.hline(8, y0, 48, 0x1a0f08);
    p.hline(8, y0 + 1, 48, 0x946440);
  }
  // Frame boards.
  wood(p, rand, 0, 0, 64, 8, false, grain);
  wood(p, rand, 0, 56, 64, 8, false, grain);
  wood(p, rand, 0, 8, 8, 48, true, grain);
  wood(p, rand, 56, 8, 8, 48, true, grain);
  for (const y of [0, 56]) {
    p.hline(0, y, 64, 0x1a0f08);
    p.hline(0, y + 1, 64, 0x9a6c46);
    p.hline(0, y + 7, 64, 0x2a1a0e);
  }
  for (const x of [0, 56]) {
    p.vline(x, 8, 48, 0x1a0f08);
    p.vline(x + 1, 8, 48, 0x9a6c46);
    p.vline(x + 7, 8, 48, 0x2a1a0e);
  }
  // Diagonal brace.
  for (let i = 0; i < 6; i++) {
    for (let t = 8; t < 56; t++) {
      const c = i === 0 ? 0x1a0f08 : i === 1 ? 0x9a6c46 : i === 5 ? 0x2a1a0e : grain[1 + ((t + i) % 3)];
      p.set(t, t + i - 3, c);
    }
  }
  // Nails.
  for (const [x, y] of [
    [3, 3],
    [60, 3],
    [3, 60],
    [60, 60],
    [11, 11],
    [52, 52],
    [11, 52],
    [52, 11],
  ]) {
    p.set(x, y, 0x9a9a92);
    p.set(x + 1, y + 1, 0x1a1410);
  }
  p.speckle(rand, 40, 0x1a0f08);
  void s;
};

const paintIronDoor: Painter = (p, rand) => {
  const s = p.size;
  const steel = [0x2e3238, 0x363a42, 0x3e434a];
  for (let i = 0; i < 4; i++) {
    const x0 = i * 16;
    p.rect(x0, 0, 16, s, steel[i % 3]);
    p.vline(x0, 0, s, 0x101214);
    p.vline(x0 + 1, 0, s, 0x5c626c);
    p.vline(x0 + 15, 0, s, 0x1c1e22);
  }
  p.speckle(rand, 80, [0x24282c, 0x4a4e56]);
  // Horizontal straps with rivets.
  for (const y0 of [6, 46]) {
    p.rect(0, y0, s, 10, 0x1e2024);
    p.hline(0, y0, s, 0x70767e);
    p.hline(0, y0 + 1, s, 0x4c525a);
    p.hline(0, y0 + 9, s, 0x08090a);
    for (let x = 3; x < s; x += 8) {
      rivet(p, x, y0 + 4, 0xa0a4aa, 0x0c0d0e);
      for (let j = 0; j < 3 + Math.floor(rand() * 5); j++) p.blend(x, y0 + 7 + j, 0x6a3a20, 0.65);
    }
  }
  // Lock plate with keyhole.
  p.rect(38, 26, 12, 14, 0x24272c);
  p.hline(38, 26, 12, 0x6a7078);
  p.vline(38, 26, 14, 0x5a6068);
  p.hline(38, 39, 12, 0x0a0b0c);
  p.disc(44, 31, 1.5, 0x050607);
  p.rect(44, 32, 1, 4, 0x050607);
  rivet(p, 40, 28, 0xa0a4aa, 0x0c0d0e);
  rivet(p, 47, 28, 0xa0a4aa, 0x0c0d0e);
  rivet(p, 40, 36, 0xa0a4aa, 0x0c0d0e);
  rivet(p, 47, 36, 0xa0a4aa, 0x0c0d0e);
  drips(p, rand, 0, 16, 64, 6, 14, [0x5a3420, 0x3e2418, 0x2e1c14]);
};

const paintIronBars: Painter = (p, rand) => {
  const s = p.size;
  p.fill(0x08090a);
  const f = fbm(s, rand, 4, 2);
  p.each((x, y) => (f[y * s + x] > 0.7 ? 0x101418 : 0x08090a));
  for (let b = 0; b < 4; b++) {
    const x0 = b * 8 + 2;
    p.rect(x0, 0, 4, s, 0x3c4046);
    p.vline(x0, 0, s, 0x7a8088);
    p.vline(x0 + 1, 0, s, 0x5a6068);
    p.vline(x0 + 3, 0, s, 0x16181a);
  }
  // Cross bars.
  for (const y0 of [6, 22]) {
    p.rect(0, y0, s, 4, 0x34383e);
    p.hline(0, y0, s, 0x80868e);
    p.hline(0, y0 + 1, s, 0x585e66);
    p.hline(0, y0 + 3, s, 0x101214);
  }
  p.speckle(rand, 24, 0x6a3a20);
  drips(p, rand, 0, 10, 32, 3, 8, [0x5a3420, 0x3e2418]);
};

const paintHazardTrim: Painter = (p, rand) => {
  const s = p.size;
  p.each((x, y) => (((x + y) & 15) < 8 ? 0xd8b020 : 0x16150f));
  // Bevelled edges top and bottom.
  p.hline(0, 0, s, 0x0a0a08);
  p.hline(0, 31, s, 0x0a0a08);
  p.hline(0, 1, s, 0x5a5030);
  p.hline(0, 30, s, 0x0c0c0a);
  // Wear and grime.
  const f = fbm(s, rand, 4, 3);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const v = f[y * s + x];
      if (v > 0.62) p.set(x, y, p.get(x, y) === 0xd8b020 ? ramp(0.1, [0x8a6e18, 0x6a5414], x, y, 0.9) : 0x0c0b08);
      else if (v < 0.12 && bayer(x, y) < 0.5) p.set(x, y, 0x6e6a58);
    }
  p.speckle(rand, 24, [0x3a3418, 0xf0d048]);
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface Def {
  size: 32 | 64 | 128;
  seed: number;
  paint: Painter;
}

// keep (Grimsqueak's castle)

/** Big dressed blocks of dark slate with a purple cast: two courses per tile, offset, bevelled light on top and left. */
function paintKeepStone(p: Px, rand: Rand): void {
  const S = p.size;
  const mortar = 0x1d1822;
  p.fill(mortar);
  const rows = 2;
  const h = S / rows;
  for (let r = 0; r < rows; r++) {
    const off = r % 2 ? S / 4 : 0;
    for (let c = 0; c < 2; c++) {
      const x0 = off + c * (S / 2);
      const y0 = r * h;
      const base = mix(0x4a4456, 0x3c3848, rand());
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < S / 2 - 1; x++) {
          const n = 0.9 + rand() * 0.18;
          let col = shade(base, n);
          if (y === 1 || x === 1) col = shade(col, 1.25);
          if (y === h - 2 || x === S / 2 - 2) col = shade(col, 0.7);
          p.set(x0 + x, y0 + y, col);
        }
      }
      // A few chips and a faint purple vein.
      for (let k = 0; k < 3; k++) p.tint(x0 + 3 + rand() * (S / 2 - 6), y0 + 3 + rand() * (h - 6), 0.65);
      if (rand() < 0.5) {
        let vx = x0 + 4 + rand() * (S / 2 - 8);
        for (let y = 3; y < h - 3; y++) {
          vx += rand() < 0.5 ? -0.6 : 0.6;
          p.blend(vx, y0 + y, 0x6d4f86, 0.35);
        }
      }
    }
  }
}

/** A royal carpet: deep crimson, a gold band near each edge, and a small gold diamond in the middle. */
function paintRoyalCarpet(p: Px, rand: Rand): void {
  const S = p.size;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, shade(0x6e1622, 0.88 + rand() * 0.2));
  const gold = 0xc9a23a;
  for (let i = 0; i < S; i++) {
    for (const e of [2, S - 3]) {
      p.set(i, e, shade(gold, 0.85 + rand() * 0.25));
      p.set(e, i, shade(gold, 0.85 + rand() * 0.25));
    }
    for (const e of [4, S - 5]) {
      if (i % 4 < 2) {
        p.blend(i, e, gold, 0.5);
        p.blend(e, i, gold, 0.5);
      }
    }
  }
  const c = S / 2;
  for (let d = 0; d <= 4; d++) {
    for (const [dx, dy] of [[d, 4 - d], [-d, 4 - d], [d, d - 4], [-d, d - 4]]) p.set(c + dx, c + dy, shade(gold, 1.05));
  }
  p.set(c, c, shade(gold, 1.2));
}

/**
 * The Widow's shell: dark plum chitin with a dull sheen down its ridge, bristles lying along it, and once in its
 * length a joint: a pale band, a dark crease, a blood-red ring. (Laid along a leg several times over, the joints
 * make it a thing of segments, as a spider's leg is.)
 */
function paintWidowChitin(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x1e1524, 0x33243a, 0x4c3450, 0x6c4458, 0x8e5866, 0xb07a7c];
  const streak = Array.from({ length: S }, () => rand());
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // (Round the limb: a ridge that catches the light, falling away to either side. The ridge is at the picture's
      // edge, x = 0, which is the TOP of a limb as widowModel lays it.)
      const round = 0.5 + 0.5 * Math.cos((x / S) * Math.PI * 2);
      let v = 0.22 + 0.4 * round ** 2 + (streak[x] - 0.5) * 0.16 + (rand() - 0.5) * 0.08;
      // (Along it: plates overlapping, each a little darker toward its trailing edge.)
      v -= 0.1 * ((y % 8) / 8);
      p.set(x, y, ramp(v, pal, x, y, 0.18));
    }
  }
  // Bristles: short dark strokes lying along the limb, a pale one here and there.
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    const len = 2 + Math.floor(rand() * 4);
    const pale = rand() < 0.2;
    for (let k = 0; k < len; k++) p.blend(x, y + k, pale ? 0xc09a94 : 0x120c16, pale ? 0.5 : 0.6);
  }
  // The joint: a crease, a blood-red ring, and the pale lip of the next plate.
  for (let x = 0; x < S; x++) {
    p.set(x, 0, 0x0e0a12);
    p.blend(x, 1, 0x8a1e28, 0.85);
    p.blend(x, 2, 0xa02a30, 0.7);
    p.blend(x, 3, 0xc8a096, 0.45);
    p.blend(x, S - 1, 0x0e0a12, 0.5);
  }
}

/**
 * Her back: the same shell, with her mark down its ridge in blood red edged with bone: an hourglass, as a widow has.
 * (It is laid along her body more than once, so there is a row of them going back into the dark.)
 */
function paintWidowBack(p: Px, rand: Rand): void {
  paintWidowChitin(p, rand);
  for (let y = 7; y <= 26; y++) {
    // (Two triangles, point to point: wide at each end of the mark, pinched in its middle.)
    const half = 1 + Math.round(Math.abs(y - 16.5) * 0.36);
    for (let dx = -half - 1; dx <= half + 1; dx++) {
      const edge = Math.abs(dx) > half;
      p.blend(dx, y, edge ? 0xd8c0a8 : (dx + y) % 5 === 0 ? 0x8a141c : 0xc02228, edge ? 0.55 : 0.95);
    }
  }
}

/** The horn of her claws and fangs: from a dark root (v = 1) through ivory to a blackened point (v = 0), with its grain running along it. */
function paintWidowHorn(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x1a120e, 0x4a3828, 0x8a7458, 0xc4b494, 0xe6dcc2, 0xf6f0de];
  const grain = Array.from({ length: S }, () => rand());
  for (let y = 0; y < S; y++) {
    const t = y / (S - 1);
    // (Blackened at the point, palest a third of the way up, darkening to the root.)
    const along = t < 0.16 ? 0.1 + (t / 0.16) * 0.7 : 0.95 - Math.max(0, t - 0.4) * 0.9;
    for (let x = 0; x < S; x++) {
      const round = 0.5 + 0.5 * Math.cos(((x - S / 2) / S) * Math.PI * 2);
      p.set(x, y, ramp(along * (0.72 + 0.28 * round) + (grain[x] - 0.5) * 0.12, pal, x, y, 0.2));
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rand() * S);
    const y = 6 + Math.floor(rand() * (S - 8));
    for (let k = 0; k < 5; k++) p.blend(x, y + k, 0x3a2a1e, 0.35);
  }
}

// ---------------------------------------------------------------------------
// MOCK-UPS (2026-11-16, asked for by the owner: "give me a few mock-ups ... don't override anything yet").
// None of these is used by any level. They are here to be looked at (tests/textureSheet.ts, TEX_FOCUS=...).
// ---------------------------------------------------------------------------

/**
 * Ice: the sewer's own brick wall, frozen. The same courses of brick (it is painted over the sewer's picture), gone
 * a cold slate blue, its vines dead and white with rime; frost packed into every joint, and creeping down the face of
 * each brick from the course above; a sparkle here and there. (No icicles or burst pipes in it: those are things put
 * ON a wall, each in its own place.)
 */
function paintIceBrick(p: Px, rand: Rand): void {
  const S = p.size;
  // (The sewer's wall underneath, at its own size, laid out twice each way.)
  const under = new Px(32);
  paintSewerBrick(under, rand);
  const cold = [0x101a26, 0x1c2a3a, 0x2c3e52, 0x40566c, 0x587288, 0x7a94a8, 0xa6bccb];
  const f = fbm(S, rand, 4, 3);
  const lum = (c: number): number => (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.5 + (c & 255) * 0.2) / 255;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = under.get(x, y);
      const l = lum(c);
      // (What was green on it, its vines, is the palest: dead and furred with frost.)
      const green = ((c >> 8) & 255) > ((c >> 16) & 255) * 1.15;
      p.set(x, y, ramp(l * 1.5 + (green ? 0.3 : 0) + (f[y * S + x] - 0.5) * 0.14, cold, x, y, 0.16));
    }
  }
  // Frost: its joints (the dark lines of the picture underneath) are packed with it, grey-blue, not white: white
  // lines that fine only glitter at a distance. And a line of rime lies along the top of every course of brick.
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const joint = lum(under.get(x, y)) <= 0.16;
      const patch = f[y * S + x];
      // (Faintly: a patch strong enough to see as a shape comes round again every few bricks, like wallpaper.)
      if (joint) p.set(x, y, rand() < 0.5 ? 0x6a869a : 0x4c667c);
      else p.blend(x, y, 0xcfe2ee, Math.max(0, Math.min(0.22, (patch - 0.4) * 0.8)) + (y % 8 === 1 || y % 8 === 2 ? 0.22 : 0));
    }
  }
  for (let i = 0; i < S * 0.25; i++) p.set(Math.floor(rand() * S), Math.floor(rand() * S), 0xffffff);
}

/**
 * Ice: the sewer's cobbles under frost. The same stones, cold grey-blue; rime white in the joints between them and
 * dusted over the crown of each stone, thicker on some than others. He can stand on it: it is rough.
 */
function paintFrostCobbles(p: Px, rand: Rand): void {
  // (THE OWNER CHOSE THIS ONE, 2026-11-16. A later try had bigger stones with frost in soft drifts, to be calmer; he
  // was shown both in the game and said of this, the first: "your early rendering of the [frost] texture I think
  // looked better than your current one". Small stones, a lace of rime in every joint. Leave it.)
  const S = p.size;
  const cells = voronoi(S, S === 64 ? 7 : 5, rand);
  const f = fbm(S, rand, 5, 3);
  const tones = Array.from({ length: 64 }, () => 0.25 + rand() * 0.3);
  const dusted = Array.from({ length: 64 }, () => rand());
  const stone = [0x131c26, 0x1f2c3a, 0x2f4052, 0x435a6e, 0x5c788c, 0x7e9aac];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const edge = cells[i].d2 - cells[i].d1;
      const id = cells[i].id % 64;
      if (edge < 1.3) {
        p.set(x, y, rand() < 0.25 ? 0xdcecf6 : rand() < 0.6 ? 0x9ab6c8 : 0x6f8ea2);
        continue;
      }
      p.set(x, y, ramp(tones[id] + (f[i] - 0.5) * 0.3 + Math.min(0.14, (edge - 1.3) * 0.03), stone, x, y, 0.2));
      // (Rime on its crown: where the stone is highest, if this one has caught any.)
      if (edge > 4.2 && dusted[id] > 0.45 && f[i] > 0.42) p.blend(x, y, 0xe8f4fb, 0.35 + 0.4 * (dusted[id] - 0.45));
      else if (edge < 2.3) p.blend(x, y, 0xcfe2ee, 0.3);
    }
  }
}

/**
 * Ice: a sheet of it over still water. Black-blue and glassy; paler where it is clouded; a few long cracks running
 * across it, each white with a dark line beside it; bubbles frozen in, as rings; and glints. He cannot grip it.
 */
function paintIceSheet(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 4);
  const g = fbm(S, rand, 7, 2);
  const ice = [0x0a1622, 0x10202e, 0x182c3e, 0x243c52, 0x34526a, 0x4c6e88, 0x74a0b8];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(f[y * S + x] * 0.7 + g[y * S + x] * 0.22 - 0.06, ice, x, y, 0.14));
  // Cracks: a few, long, wandering; each forks once.
  const crack = (x0: number, y0: number, a0: number, len: number, fork: boolean): void => {
    let x = x0;
    let y = y0;
    let a = a0;
    for (let k = 0; k < len; k++) {
      p.blend(x, y, 0xe8f6ff, 0.9);
      p.blend(x + 1, y + 1, 0x060c14, 0.5);
      a += (rand() - 0.5) * 0.5;
      x += Math.cos(a);
      y += Math.sin(a);
      if (fork && k === Math.floor(len * 0.45)) crack(x, y, a + (rand() < 0.5 ? 0.8 : -0.8), Math.floor(len * 0.4), false);
    }
  };
  for (let c = 0; c < 3; c++) crack(rand() * S, rand() * S, rand() * Math.PI * 2, Math.floor(S * (0.5 + rand() * 0.4)), true);
  // Bubbles, frozen in: small rings, in a drift of three or four.
  for (let b = 0; b < 5; b++) {
    const bx = rand() * S;
    const by = rand() * S;
    for (let k = 0; k < 3 + Math.floor(rand() * 2); k++) {
      const x = Math.floor(bx + (rand() - 0.5) * 9);
      const y = Math.floor(by + (rand() - 0.5) * 9);
      for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) p.blend(x + dx, y + dy, 0xb8dcf0, 0.75);
      p.blend(x, y, 0x0a1622, 0.5);
      p.set(x - 1, y - 1, 0xffffff);
    }
  }
  for (let i = 0; i < S * 0.5; i++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    if (f[y * S + x] > 0.55) p.set(x, y, 0xcfeaf8);
  }
}

/**
 * Ice: a BLOCK of it, cut or frozen solid: not the dark sheet over water (he, shown a block wearing the sheet's
 * picture: "the platform block and the floor that the platform block is on are using the same texture and it looks
 * wrong"). Pale and milky, blue in its depths; flat white planes where it has cracked inside, running slantwise; a
 * string of bubbles. (Nothing at the picture's edges: a block's faces do not begin where the picture does, and a
 * border drawn there fell as a cross in the middle of each face.)
 */
function paintIceBlock(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 3);
  const g = fbm(S, rand, 8, 2);
  const ice = [0x4a7896, 0x6494b0, 0x82b0c8, 0xa2c8dc, 0xc2deec, 0xe0f1f8];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.18 + f[y * S + x] * 0.62 + g[y * S + x] * 0.16, ice, x, y, 0.14));
  // Planes where it has cracked inside: straight, slantwise, each white along one edge and fading back from it.
  for (let c = 0; c < 4; c++) {
    const x0 = rand() * S;
    const y0 = rand() * S;
    const a = (rand() < 0.5 ? 0.5 : -0.5) + (rand() - 0.5) * 0.5;
    const len = S * (0.3 + rand() * 0.3);
    for (let k = 0; k < len; k++) {
      const x = x0 + Math.cos(a) * k;
      const y = y0 + Math.sin(a) * k;
      p.blend(x, y, 0xffffff, 0.85);
      for (let d = 1; d < 5; d++) p.blend(x, y + d, 0xe0f1f8, 0.4 - d * 0.08);
    }
  }
  // Bubbles, risen in a string and caught.
  for (let b = 0; b < 3; b++) {
    const x = Math.floor(rand() * S);
    let y = Math.floor(rand() * S);
    for (let k = 0; k < 6; k++) {
      p.set(x + (k % 2), y, 0xffffff);
      p.blend(x + (k % 2), y + 1, 0x4a7896, 0.6);
      y -= 2 + Math.floor(rand() * 3);
    }
  }
}

/**
 * Ice: a steel pipe in the cold. Across is round it, its top at the picture's edge; down is along it. Dull steel,
 * a seam, rivets at its bands; white rime lying thick along its top and thinning down its sides. (Whole: a pipe that
 * has burst is a thing of its own, a jet of gas and frost round it.)
 */
function paintFrostPipe(p: Px, rand: Rand): void {
  const S = p.size;
  const steel = [0x1a222a, 0x2a343e, 0x3e4a56, 0x56646f, 0x72828c, 0x94a4ad];
  const f = fbm(S, rand, 4, 3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const round = 0.5 + 0.5 * Math.cos(u * Math.PI * 2);
      p.set(x, y, ramp(0.2 + 0.5 * round ** 1.5 + (f[y * S + x] - 0.5) * 0.16, steel, x, y, 0.16));
      // (Rime: on its top, in a ragged edge.)
      const top = Math.min(u, 1 - u);
      if (top < 0.1 + f[y * S + x] * 0.12) p.blend(x, y, rand() < 0.8 ? 0xe8f4fb : 0xbcd4e2, 0.9 - top * 3);
    }
  }
  // A band, with rivets, and the seam along the pipe's side.
  for (let x = 0; x < S; x++) {
    p.blend(x, 2, 0x10161c, 0.7);
    p.blend(x, 3, 0x94a4ad, 0.5);
    p.blend(x, 6, 0x10161c, 0.6);
    if (x % 5 === 2) {
      p.set(x, 4, 0xb4c2ca);
      p.blend(x, 5, 0x10161c, 0.6);
    }
  }
  for (let y = 0; y < S; y++) p.blend(Math.round(S * 0.3), y, 0x10161c, 0.45);
}

/**
 * Clear ice, for icicles and for the spikes of it that stand up from the floor. Across is round it; down is along
 * it, from its root to its point. Pale blue, a white core running its length where the light goes through, a bright
 * edge, milky at the root and clearest at the point; faint rings where it grew.
 */
function paintIceClear(p: Px, rand: Rand): void {
  const S = p.size;
  const ice = [0x3e6e8e, 0x5a90ae, 0x7eb2cc, 0xa6d2e6, 0xcfeaf6, 0xf2fbff];
  const streak = Array.from({ length: S }, () => rand());
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      // (Two bright lines round it: the edge that catches the light, and the core seen through it.)
      const edge = Math.max(0, 1 - Math.min(u, 1 - u) * 9);
      const core = Math.max(0, 1 - Math.abs(u - 0.5) * 7);
      let v = 0.34 + 0.45 * edge + 0.4 * core + (streak[x] - 0.5) * 0.2 - 0.14 * (y / S);
      if (y % 7 === 0) v += 0.1;
      if (y < 4) v += 0.25;
      p.set(x, y, ramp(v, ice, x, y, 0.14));
    }
  }
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.set(x, y, 0xffffff);
    p.blend(x, y + 1, 0xffffff, 0.5);
  }
}

/**
 * The Lamp Scorpion's shell. Across the picture is round its body, the ridge of its back at the picture's edge
 * (x = 0), its belly in the middle; down the picture is along it, from the root of its tail to its front.
 * Seven plates across its back, each with a pale lip at its hind edge and a row of grains before it, then the one
 * broad shield of its head, with a furrow down its middle and a knob for its eyes. A keel down its back and one along
 * each flank. Underneath, paler, in soft bands.
 */
function paintScorpShell(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x140e1a, 0x21172a, 0x30223c, 0x44324f, 0x5c4766, 0x7a6284, 0x9c86a2];
  const belly = [0x2a2230, 0x3c3142, 0x524556, 0x6a5c6c, 0x84768a];
  const f = fbm(S, rand, 6, 3);
  const HEAD = Math.floor(S * 0.64);
  const PLATE = HEAD / 7;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const round = 0.5 + 0.5 * Math.cos(u * Math.PI * 2);
      const n = (f[y * S + x] - 0.5) * 0.22;
      if (u > 0.34 && u < 0.66) {
        // Its belly: soft bands, a crease between.
        const band = (y % 9) / 9;
        p.set(x, y, band < 0.12 ? 0x1a141e : ramp(0.35 + 0.3 * Math.sin(band * Math.PI) + n, belly, x, y, 0.2));
        continue;
      }
      let v = 0.14 + 0.38 * round ** 1.6 + n;
      if (y < HEAD) {
        // A plate: dark where it comes out from under the one before, paling to its hind lip.
        const t = (y % PLATE) / PLATE;
        v += -0.16 + 0.26 * t;
        if (t > 0.86) v += 0.2;
        if (t < 0.1) v -= 0.3;
      } else {
        // The head shield: one piece, paler in its middle, a furrow down it.
        const t = (y - HEAD) / (S - HEAD);
        v += 0.06 + 0.1 * Math.sin(t * Math.PI);
        if (Math.min(u, 1 - u) < 0.02) v -= 0.22;
      }
      p.set(x, y, ramp(v, pal, x, y, 0.16));
    }
  }
  // Grains: a row before each plate's lip, and a scatter over the head shield.
  for (let k = 0; k < 7; k++) {
    const y = Math.floor((k + 0.72) * PLATE);
    for (let x = 0; x < S; x += 3) {
      const u = x / S;
      if (u > 0.3 && u < 0.7) continue;
      p.blend(x + (k % 2), y, 0xb4a0b8, 0.75);
      p.blend(x + (k % 2), y + 1, 0x140e1a, 0.5);
    }
  }
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rand() * S);
    const y = HEAD + 2 + Math.floor(rand() * (S - HEAD - 4));
    const u = x / S;
    if (u > 0.3 && u < 0.7) continue;
    p.blend(x, y, 0xb4a0b8, 0.6);
    p.blend(x, y + 1, 0x140e1a, 0.45);
  }
  // Keels: down its back (on the plates only: the head has its furrow there) and along each flank.
  for (let y = 0; y < S; y++) {
    if (y < HEAD) {
      p.blend(0, y, 0xa890ac, 0.6);
      p.blend(S - 1, y, 0x5c4766, 0.5);
    }
    for (const kx of [Math.round(S * 0.14), Math.round(S * 0.86)]) {
      p.blend(kx, y, 0x9c86a2, y % 3 === 0 ? 0.7 : 0.4);
      p.blend(kx + 1, y, 0x140e1a, 0.35);
    }
  }
  // The knob its eyes sit on, at the front of the head shield.
  for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx * 0.5 + dy * dy <= 5) p.blend(dx, S - 9 + dy, dy < 0 ? 0x9c86a2 : 0x21172a, 0.7);
}

/**
 * A joint of its tail (and a length of a leg). Across is round it, the top at the picture's edge; down is along it.
 * Keeled: five ridges run its length, grained like a file, the shell between them dark and smooth; a crease at each
 * end, and before the far one a pale collar where the next joint begins.
 */
function paintScorpTail(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x140e1a, 0x21172a, 0x30223c, 0x44324f, 0x5c4766, 0x7a6284];
  const streak = Array.from({ length: S }, () => rand());
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const round = 0.5 + 0.5 * Math.cos(u * Math.PI * 2);
      // (How near a keel: there are five, one at every fifth of the way round.)
      const k = Math.abs(((u * 5 + 0.5) % 1) - 0.5) * 2;
      let v = 0.2 + 0.3 * round ** 2 + (streak[x] - 0.5) * 0.12 + (rand() - 0.5) * 0.06 - 0.12 * k;
      v += 0.1 * Math.sin((y / S) * Math.PI);
      p.set(x, y, ramp(v, pal, x, y, 0.16));
    }
  }
  for (let k = 0; k < 5; k++) {
    const x = Math.round((k / 5) * S);
    for (let y = 2; y < S - 2; y++) {
      p.blend(x, y, y % 3 === 0 ? 0xc0aac4 : 0x8c7694, y % 3 === 0 ? 0.85 : 0.55);
      p.blend(x + 1, y, 0x140e1a, 0.4);
    }
  }
  for (let x = 0; x < S; x++) {
    p.set(x, 0, 0x0c0810);
    p.blend(x, 1, 0x140e1a, 0.7);
    p.blend(x, S - 5, 0xa890ac, 0.55);
    p.blend(x, S - 4, 0xc0aac4, 0.7);
    p.blend(x, S - 3, 0x5c4766, 0.6);
    p.set(x, S - 1, 0x0c0810);
    p.blend(x, S - 2, 0x140e1a, 0.7);
  }
}

/**
 * Its hand. Across is round it; down is along it, from its wrist to the point of its fixed finger. The swell of the
 * palm is grained all over, coarse on its top; the finger darkens to a horn-brown point, and along its inner edge
 * runs the row of teeth it grips with.
 */
function paintScorpClaw(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x1a1220, 0x2a1e32, 0x3e2e48, 0x57425e, 0x735a78, 0x937a94];
  const horn = [0x100a0e, 0x22141a, 0x3a2024, 0x5a3430, 0x80503c];
  const f = fbm(S, rand, 5, 3);
  const FINGER = Math.floor(S * 0.58);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const round = 0.5 + 0.5 * Math.cos(u * Math.PI * 2);
      const n = (f[y * S + x] - 0.5) * 0.24;
      if (y >= FINGER) {
        const t = (y - FINGER) / (S - FINGER);
        p.set(x, y, ramp(0.62 - 0.5 * t + 0.25 * round + n, horn, x, y, 0.2));
      } else p.set(x, y, ramp(0.22 + 0.4 * round ** 1.5 + 0.12 * Math.sin((y / FINGER) * Math.PI) + n, pal, x, y, 0.16));
    }
  }
  // Grains over the palm: in rows, bigger on its top.
  for (let y = 3; y < FINGER - 1; y += 3) {
    for (let x = (y % 2) * 2; x < S; x += 4) {
      const top = Math.cos((x / S) * Math.PI * 2) > 0.2;
      p.blend(x, y, 0xc0aac4, top ? 0.8 : 0.4);
      if (top) p.blend(x + 1, y, 0xa890ac, 0.5);
      p.blend(x, y + 1, 0x100a0e, 0.45);
    }
  }
  // Teeth along the finger's inner edge (the middle of the picture), and the crease at the wrist.
  for (let y = FINGER - 2; y < S - 1; y += 2) {
    p.set(S / 2, y, 0xe8d8c8);
    p.blend(S / 2, y + 1, 0x100a0e, 0.6);
  }
  for (let x = 0; x < S; x++) {
    p.set(x, 0, 0x0c0810);
    p.blend(x, 1, 0x937a94, 0.5);
    p.blend(x, FINGER - 1, 0x100a0e, 0.45);
  }
}

/**
 * Its lamp, in greys and white (the model gives it its colour and its brightness): a bulb of clear stuff with the
 * light in its middle, veined, a glint on its top.
 */
function paintScorpLamp(p: Px, rand: Rand): void {
  const S = p.size;
  const grey = [0x6a6a6a, 0x8e8e8e, 0xb2b2b2, 0xd6d6d6, 0xffffff];
  const f = fbm(S, rand, 4, 3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const mid = Math.sin((y / S) * Math.PI);
      p.set(x, y, ramp(0.25 + 0.6 * mid + (f[y * S + x] - 0.5) * 0.3, grey, x, y, 0.25));
    }
  }
  // Veins, branching round it.
  for (let v = 0; v < 5; v++) {
    let x = Math.floor(rand() * S);
    for (let y = 1; y < S - 1; y++) {
      p.blend(x, y, 0x3c3c3c, 0.6);
      if (rand() < 0.45) x += rand() < 0.5 ? 1 : -1;
      if (rand() < 0.1) p.blend(x + 2, y, 0x505050, 0.5);
    }
  }
  for (let y = 4; y < 9; y++) p.set(1, y, 0xffffff);
  p.set(2, 5, 0xffffff);
}

/**
 * A glowing mushroom's cap, in greys and white (the mushroom gives it its colour). Across is round it; down is from
 * its crown, over its top to its rim (three fifths of the way down the picture), then under it to its stem.
 * On top: fibres running from crown to rim, pale warts thick about the crown and thinning outward, and the rim
 * darker and finely grooved. Underneath: its gills, pale blades with dark between, deepening toward the stem.
 */
function paintMushroomCap(p: Px, rand: Rand): void {
  const S = p.size;
  const RIM = Math.floor(S * 0.6);
  const grey = [0x5a5a5a, 0x808080, 0xa6a6a6, 0xcacaca, 0xececec];
  const f = fbm(S, rand, 5, 3);
  const fibre = Array.from({ length: S }, () => rand());
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (y < RIM) {
        const t = y / RIM;
        let v = 0.84 - 0.26 * t + (fibre[x] - 0.5) * (0.06 + 0.22 * t) + (f[y * S + x] - 0.5) * 0.1;
        // (The rim: darker, and grooved where the gills show through.)
        if (t > 0.8) v -= 0.14 + (x % 3 === 0 ? 0.16 : 0);
        p.set(x, y, ramp(v, grey, x, y, 0.1));
      } else {
        const t = (y - RIM) / (S - RIM);
        const blade = x % 3 === 0;
        p.set(x, y, blade ? ramp(0.7 - 0.4 * t, grey, x, y, 0.1) : ramp(0.16 - 0.1 * t, [0x1e1e1e, 0x343434, 0x4c4c4c], x, y, 0.1));
      }
    }
  }
  // Warts: pale, each with a shadow under it; thick about the crown.
  for (let i = 0; i < 44; i++) {
    const y = Math.floor(rand() ** 1.7 * RIM * 0.8);
    const x = Math.floor(rand() * S);
    const big = rand() < 0.6 && y < RIM * 0.6;
    p.set(x, y, 0xffffff);
    if (big) {
      p.set(x + 1, y, 0xffffff);
      p.blend(x, y + 1, 0xececec, 0.8);
      p.blend(x + 1, y + 1, 0x808080, 0.6);
    } else p.blend(x, y + 1, 0x808080, 0.5);
  }
}

/**
 * A mushroom's stem. Across is round it; down is from its top to the ground. Pale fibres running its length, a
 * ragged skirt hanging a little under the cap, scuffs lower down, and earth-dark at its foot.
 */
function paintMushroomStem(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x6a6258, 0x8a8074, 0xa89e90, 0xc6bcac, 0xe2dacc, 0xf6f0e6];
  const fibre = Array.from({ length: S }, () => rand());
  const f = fbm(S, rand, 4, 3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const down = y / S;
      let v = 0.62 + (fibre[x] - 0.5) * 0.3 + (f[y * S + x] - 0.5) * 0.18 - 0.1 * down;
      if (down > 0.82) v -= (down - 0.82) * 2.4;
      p.set(x, y, ramp(v, pal, x, y, 0.16));
    }
  }
  // The skirt: a pale ragged band, a shadow under it.
  for (let x = 0; x < S; x++) {
    const drop = 5 + Math.floor(fibre[x] * 3);
    for (let y = 4; y < 4 + drop - 3; y++) p.blend(x, y, 0xf6f0e6, 0.75);
    p.blend(x, 4 + drop - 3, 0x4a443c, 0.6);
    p.blend(x, 4 + drop - 2, 0x6a6258, 0.35);
  }
  // Scuffs and flecks.
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * S);
    const y = 10 + Math.floor(rand() * (S - 12));
    const len = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < len; k++) p.blend(x, y + k, 0x4a443c, 0.5);
  }
}

/**
 * Cave: bare rock, lying in beds. Blue-grey; the beds run across it and dip a little, a dark seam between one and the
 * next with a lip of light under it; a few cracks; damp. (Nothing in it glows. What glows in a cave is PUT ON the
 * rock, in clumps, each in its own place: painted into a tile it came round again every few steps, like wallpaper.)
 */
function paintCaveRock(p: Px, rand: Rand): void {
  const S = p.size;
  const a = fbm(S, rand, 3, 4);
  const b = fbm(S, rand, 8, 2);
  const rock = [0x141922, 0x1f2733, 0x2c3745, 0x3b4a59, 0x4e6171, 0x667b8b];
  const band = (x: number, y: number): number => {
    const xx = ((x % S) + S) % S;
    const yy = ((y % S) + S) % S;
    return Math.sin(((yy + a[yy * S + xx] * 20) / S) * Math.PI * 6);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      p.set(x, y, ramp(a[i] * 0.42 + b[i] * 0.22 + band(x, y) * 0.09 + 0.14, rock, x, y, 0.22));
      // (The seam between two beds: where the wave turns over.)
      if (band(x, y) > 0 && band(x, y + 1) <= 0) {
        p.set(x, y, b[i] > 0.62 ? 0x1f2733 : 0x0b0e14);
        p.blend(x, (y + 1) % S, 0x7f95a4, 0.3);
      }
    }
  }
  // Cracks, running down across the beds.
  for (let c = 0; c < 4; c++) {
    let x = Math.floor(rand() * S);
    let y = Math.floor(rand() * S);
    for (let k = 0; k < 16; k++) {
      p.set(((x % S) + S) % S, y % S, 0x0b0e14);
      p.blend((((x + 1) % S) + S) % S, y % S, 0x7f95a4, 0.22);
      y += 1;
      x += rand() < 0.3 ? 1 : rand() < 0.4 ? -1 : 0;
    }
  }
  // Damp: a glint here and there on the high places.
  for (let k = 0; k < 26; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    if (a[y * S + x] > 0.6) p.blend(x, y, 0xa8c0cc, 0.4);
  }
}

/**
 * Cave: its floor. Flat stones of different greys, fitted together, each worn paler toward its middle; dark in the
 * cracks between them; damp. (Nothing in it glows, for the same reason as the rock of the walls.)
 */
function paintCaveFloor(p: Px, rand: Rand): void {
  const S = p.size;
  const cells = voronoi(S, 4, rand);
  const f = fbm(S, rand, 4, 3);
  const tones = Array.from({ length: 64 }, () => 0.3 + rand() * 0.34);
  const stone = [0x12161d, 0x1c232d, 0x28323e, 0x364350, 0x475866, 0x5c7080];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const edge = cells[i].d2 - cells[i].d1;
      if (edge < 1.5) p.set(x, y, ramp(rand() * 0.5, [0x07090d, 0x0c1016, 0x12161d], x, y, 0.3));
      else p.set(x, y, ramp(tones[cells[i].id % 64] + (f[i] - 0.5) * 0.4 + Math.min(0.12, (edge - 1.5) * 0.02) - (edge < 3 ? 0.1 : 0), stone, x, y, 0.2));
    }
  }
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    if (f[y * S + x] > 0.6) p.blend(x, y, 0xa8c0cc, 0.4);
  }
}

/**
 * Glowing moss, for the clumps of it (decor `moss`). In greys and white: the clump gives it its colour. Tufts, each
 * pale at its top and deep under, dark gaps between; here and there a bright bead.
 */
function paintGlowMoss(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 3);
  const g = fbm(S, rand, 8, 2);
  const grey = [0x262626, 0x4c4c4c, 0x7c7c7c, 0xb4b4b4, 0xf2f2f2];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(f[y * S + x] * 0.5 + g[y * S + x] * 0.6 - 0.08, grey, x, y, 0.3));
  for (let k = 0; k < 46; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.set(x, y, 0xffffff);
    p.blend(x + 1, y, 0xf2f2f2, 0.6);
    p.blend(x, (y + 1) % S, 0x4a4a4a, 0.7);
    p.blend(x + 1, (y + 1) % S, 0x4a4a4a, 0.5);
  }
  for (let k = 0; k < 30; k++) p.set(Math.floor(rand() * S), Math.floor(rand() * S), 0x2c2c2c);
}

/**
 * The Frost Roller's shell (enemies/rollerModel.ts): ONE plate of it. Across a plate (u) it is an arch, pale along its
 * crest and darker down its flanks; along it (v) it is dark where it comes out from under the plate before, paling
 * to a hind lip rimed white. Old ice: blue-grey chitin under a skin of frost, scratched where it has rolled.
 */
function paintRollerShell(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x1c2a3a, 0x2a4058, 0x3c5a78, 0x567c9c, 0x7aa2be, 0xa4c8dc, 0xd2e8f2, 0xf4fbff];
  const f = fbm(S, rand, 5, 3);
  const g = fbm(S, rand, 9, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const t = y / S;
      const crest = Math.sin(u * Math.PI);
      let v = 0.22 + 0.34 * crest ** 1.4 + (f[y * S + x] - 0.5) * 0.2;
      // Out from under the plate before: dark. Its hind lip: thick, and rimed.
      if (t < 0.12) v -= 0.26 * (1 - t / 0.12);
      v += 0.14 * t;
      if (t > 0.84) v += 0.16 + 0.3 * ((t - 0.84) / 0.16);
      // Growth lines across it, faint; and frost caught in them.
      if (y % 7 === 3 && t < 0.84) v -= 0.07;
      if (g[y * S + x] > 0.62 && t > 0.3) v += (g[y * S + x] - 0.62) * 1.3;
      p.set(x, y, ramp(v, pal, x, y, 0.2));
    }
  }
  // Scratches: where it has bowled over grit. Long, thin, along the way it rolls.
  for (let k = 0; k < 9; k++) {
    const x = 6 + Math.floor(rand() * (S - 12));
    const y0 = Math.floor(rand() * S * 0.7);
    const len = 6 + Math.floor(rand() * 14);
    for (let i = 0; i < len; i++) p.blend(x + (i % 5 === 4 ? 1 : 0), y0 + i, 0xeaf6ff, 0.5);
  }
}

/** The Frost Roller's underside, its legs and its feelers: dark horn the blue of deep ice, pale at the joints. */
function paintRollerUnder(p: Px, rand: Rand): void {
  const S = p.size;
  const pal = [0x0e1620, 0x16222e, 0x20303e, 0x2e4254, 0x44607a];
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0.3 + (f[y * S + x] - 0.5) * 0.3 + 0.25 * Math.sin((x / S) * Math.PI);
      // (Bands across a leg: its joints, paler.)
      if (y % 8 === 0) v += 0.35;
      else if (y % 8 === 1) v -= 0.15;
      p.set(x, y, ramp(v, pal, x, y, 0.2));
    }
  }
}

// ---------------------------------------------------------------------------
// THE STAG KNIGHT AND THE TURTLES. (The owner, 2026-11-16, of the stag at the Club: "I like this Beetle that he needs a
// texture"; and: "The turtles are also fairly texturless".) These are pictures of a SURFACE, in greys near white: each
// model keeps its own colours, painted on it part by part, and its picture is laid over them (a material multiplies
// the two). So one picture of beaten steel does for his blued shell and for its copper rim.
// ---------------------------------------------------------------------------

/** Greys for a surface picture: dark in its grooves, white on its ridges. */
const SURFACE = [0x4e5258, 0x6c7076, 0x8a8e92, 0xa8abae, 0xc6c8ca, 0xe2e3e4, 0xffffff];

/**
 * The Stag Knight's shell: a beetle's wing case in beaten steel. Grooves run the length of it (down the picture), a
 * row of pits between each two, the ridges rubbed bright; hammer marks under it all, and a few long scratches.
 */
function paintStagShell(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 6, 3);
  const g = fbm(S, rand, 10, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = x % 8;
      let v = 0.66 + (f[y * S + x] - 0.5) * 0.34;
      // A groove, the bright shoulder beside it, and the fall away to the next.
      if (c === 0) v -= 0.36;
      else if (c === 1) v += 0.2;
      else if (c === 7) v -= 0.1;
      // Pits, down the middle of each strip, every other strip half a step on.
      if (c === 4 && (y + ((x >> 3) % 2) * 3) % 6 === 2) v -= 0.3;
      if (c === 4 && (y + ((x >> 3) % 2) * 3) % 6 === 3) v += 0.12;
      // Rubbed bright in patches.
      if (g[y * S + x] > 0.66) v += (g[y * S + x] - 0.66) * 0.9;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.16));
    }
  }
  for (let k = 0; k < 7; k++) {
    const x = Math.floor(rand() * S);
    const y0 = Math.floor(rand() * S);
    const len = 8 + Math.floor(rand() * 16);
    const lean = rand() < 0.5 ? 3 : 4;
    for (let i = 0; i < len; i++) p.blend(x + Math.floor(i / lean), y0 + i, 0xffffff, 0.55);
  }
}

/** The Stag Knight's belly: plates one over the next down him, each with a dark seam and a pale lip, ribbed fine. */
function paintStagBelly(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 6, 2);
  const BAND = 8;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // (Down the picture is down him: a plate's lip is its lower edge, over the top of the plate below.)
      const t = y % BAND;
      const odd = Math.floor(y / BAND) % 2;
      let v = (odd ? 0.5 : 0.78) + (f[y * S + x] - 0.5) * 0.2 + 0.03 * t;
      if (t === 0) v = 0.08;
      else if (t === BAND - 1) v += 0.2;
      else if (t === 1) v -= 0.14;
      if (x % 4 === 0 && t > 1) v -= 0.07;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.14));
    }
  }
}

/** Horn: his limbs, his antlers, his claws. Grain along it (up the picture), a ring at each joint, pores. */
function paintStagHorn(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 3);
  const grain = Array.from({ length: S }, () => (rand() - 0.5) * 0.22);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0.7 + grain[x] + (f[y * S + x] - 0.5) * 0.26;
      if (y % 8 === 0) v -= 0.3;
      else if (y % 8 === 1) v += 0.16;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.16));
    }
  }
  for (let k = 0; k < 26; k++) p.tint(Math.floor(rand() * S), Math.floor(rand() * S), 0.62);
}

/** One iron plate of his hammer's head: forged, dented, its edge worn bright, a rivet at each corner. */
function paintStagIron(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 5, 3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const edge = Math.min(x, y, S - 1 - x, S - 1 - y);
      let v = 0.56 + (f[y * S + x] - 0.5) * 0.5;
      if (edge === 0) v = 0.2;
      else if (edge === 1) v += 0.34;
      else if (edge === 2) v += 0.14;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.18));
    }
  }
  // Dents: a dark dot with a bright lip under it.
  for (let k = 0; k < 7; k++) {
    const x = 5 + Math.floor(rand() * (S - 10));
    const y = 5 + Math.floor(rand() * (S - 10));
    p.rect(x, y, 2, 1, 0x4e5258);
    p.rect(x, y + 1, 2, 1, 0xe2e3e4);
  }
  for (const [x, y] of [[4, 4], [S - 6, 4], [4, S - 6], [S - 6, S - 6]]) {
    p.rect(x, y, 2, 2, 0xffffff);
    p.rect(x, y + 2, 2, 1, 0x4e5258);
    p.set(x + 2, y + 1, 0x4e5258);
  }
}

/** An ash shaft: long grain up it, darker streaks, a knot. */
function paintAshWood(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 2);
  const grain = Array.from({ length: S }, () => rand());
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // (The grain wanders a little from side to side as it goes up.)
      const gx = (x + Math.round(Math.sin(y / 5 + x / 9) * 1.2) + S) % S;
      let v = 0.7 + (grain[gx] - 0.5) * 0.5 + (f[y * S + x] - 0.5) * 0.16;
      if (grain[gx] < 0.16) v -= 0.2;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.12));
    }
  }
  const kx = 9;
  const ky = 20;
  for (let y = -3; y <= 3; y++) for (let x = -2; x <= 2; x++) if ((x * x) / 4 + (y * y) / 9 <= 1) p.set(kx + x, ky + y, (x * x) / 4 + (y * y) / 9 < 0.3 ? 0x4e5258 : 0x8a8e92);
}

/**
 * One plate of a turtle's shell (npc/patrons.ts `shellGeometry`): its middle in the middle of the picture. SECOND
 * PAINTING (the owner, 2026-11-16, of the first, flat rings on a grey plate: "the turtle shell looks okay but not as
 * good as the other things you've done"). A plate is a low hill of horn: its oldest part a pale pitted boss in the
 * middle, and round that the ridges it has grown by, each one a STEP with a lit side and a shaded side (the light
 * from the upper left, so the whole plate reads as raised), eight-sided as the plates are cut. Dark horn runs out
 * from the middle in rays, as on a tortoise's shell; and it falls dark to a groove at its edge, a pale line inside it.
 * `mossy`: the old one's. Moss has crept in from its edges, in patches. (He had balls of moss stuck on his shell
 * before: "the remnants of like the bubbles he had".)
 */
function paintTurtleScuteAs(mossy: boolean): Painter {
  return (p, rand) => {
    const S = p.size;
    const f = fbm(S, rand, 5, 3);
    const g = fbm(S, rand, 4, 3);
    const rays = Array.from({ length: 24 }, () => rand());
    const horn = [0x3c3a36, 0x5c5a54, 0x7c7a72, 0x9c9a92, 0xbcbab2, 0xdcdad2, 0xfffdf4];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = (x + 0.5) / S - 0.5;
        const dy = (y + 0.5) / S - 0.5;
        // (Eight-sided "how far out": the larger of the square's and the diamond's.)
        const r = Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) * 0.7071) * 2;
        const a = Math.atan2(dy, dx);
        const n = f[y * S + x] - 0.5;
        // How much this side of the plate faces the light (upper left): -1 to 1.
        const len = Math.hypot(dx, dy) || 1;
        const lit = (-dx - dy) / len / 1.4142;
        let v = 0.84 - 0.2 * r + n * 0.16;
        if (r < 0.2) {
          // The boss: pale, pitted.
          v += 0.14 + lit * 0.05;
          if ((x * 7 + y * 13) % 11 === 0) v -= 0.2;
        } else {
          // The ridges: seven of them, closer together toward the edge. Each a step: up its inner face, flat, down.
          const k = (Math.pow((r - 0.2) / 0.8, 0.8) * 7) % 1;
          if (k < 0.2) v += lit * 0.3 - 0.06;
          else if (k < 0.34) v += 0.1 + lit * 0.1;
          else if (k > 0.9) v -= 0.1;
        }
        // The groove at its edge, and the pale line just inside it.
        if (r > 0.95) v = 0.12;
        else if (r > 0.9) v += 0.16;
        let c = ramp(v, horn, x, y, 0.14);
        // Rays of dark horn out from the boss, wider toward the edge, their sides ragged.
        const ray = rays[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 24 + g[y * S + x] * 1.6) % 24];
        if (r > 0.16 && r < 0.92 && ray < 0.38) c = mix(c, 0x5a3c22, 0.3 + 0.25 * r);
        else if (r > 0.2 && r < 0.92 && ray > 0.8) c = mix(c, 0xffe9b0, 0.22);
        p.set(x, y, c);
        if (mossy) {
          const m = g[y * S + x] * 0.7 + r * 0.6 + n * 0.3;
          if (m > 0.86 && r < 0.95) p.blend(x, y, (x + y) % 3 === 0 ? 0xd8f08a : 0x9ac850, Math.min(0.85, (m - 0.86) * 5));
        }
      }
    }
  };
}

/**
 * A turtle's skin. SECOND PAINTING (the owner, 2026-11-16, of the first, rows of oblong pads: "you use like a brick
 * texture for his skin ... the skin shouldn't look like bricks"). Leather: small pebbled scales of no two sizes and in
 * no rows, a soft crease between them, each a little rounded; and a few folds wandering across, as skin has where it
 * bends. (The picture wraps: a scale at one edge goes on at the other.)
 */
function paintTurtleSkin(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 3);
  const w = fbm(S, rand, 3, 2);
  const N = 150;
  const seeds = Array.from({ length: N }, () => ({ x: rand() * S, y: rand() * S, tone: (rand() - 0.5) * 0.14 }));
  const leather = [0x5e5c58, 0x7a7872, 0x96948c, 0xb2b0a8, 0xcecdc6, 0xe8e7e2, 0xffffff];
  const away = (a: number, b: number): number => {
    const d = Math.abs(a - b);
    return Math.min(d, S - d);
  };
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let d1 = 1e9;
      let d2 = 1e9;
      let near = seeds[0];
      for (const sd of seeds) {
        const d = Math.hypot(away(x + 0.5, sd.x), away(y + 0.5, sd.y));
        if (d < d1) {
          d2 = d1;
          d1 = d;
          near = sd;
        } else if (d < d2) d2 = d;
      }
      const edge = d2 - d1;
      // A scale: rounded (paler toward its upper left, where the light is), a soft crease round it.
      const sx = away(x + 0.5, near.x) * (x + 0.5 - near.x > S / 2 || (x + 0.5 - near.x < 0 && x + 0.5 - near.x > -S / 2) ? -1 : 1);
      const sy = away(y + 0.5, near.y) * (y + 0.5 - near.y > S / 2 || (y + 0.5 - near.y < 0 && y + 0.5 - near.y > -S / 2) ? -1 : 1);
      let v = 0.84 + near.tone + (f[y * S + x] - 0.5) * 0.1 - (sx + sy) * 0.02;
      if (edge < 0.7) v -= 0.2;
      else if (edge < 1.5) v -= 0.07;
      // A fold of skin: where a slow wave of the picture turns over.
      const fold = Math.sin(((y + w[y * S + x] * 26) / S) * Math.PI * 6);
      if (Math.abs(fold) < 0.1) v -= 0.1;
      p.set(x, y, ramp(v, leather, x, y, 0.1));
    }
  }
}

/**
 * The shield of a turtle's front. It is wrapped once round a flattened ball, so his front is the picture's left half
 * and its middle line is a quarter of the way across (the right half, the same again, is against his shell and is
 * never seen). A seam down the middle, five across, each plate ringed with the lines it grew by.
 */
function paintTurtleBelly(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 5, 2);
  const HALF = S / 2;
  const ROW = S / 8;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const hx = x % HALF;
      const fromMid = Math.abs(hx + 0.5 - HALF / 2);
      const ty = (y % ROW) + 0.5;
      const fromSeam = Math.min(ty, ROW - ty);
      let v = 0.9 + (f[y * S + x] - 0.5) * 0.16;
      // Growth lines: each plate ringed inside its edges.
      const inFrom = Math.min(fromMid, fromSeam);
      if (inFrom > 2 && inFrom < 3) v -= 0.12;
      // The seams.
      if (fromMid < 0.8 || fromSeam < 0.6) v = 0.4;
      else if (fromMid < 1.6 || fromSeam < 1.6) v += 0.08;
      // Scuffed darker toward his sides, where it rubs.
      v -= 0.012 * Math.max(0, fromMid - 6);
      p.set(x, y, ramp(v, SURFACE, x, y, 0.12));
    }
  }
}

// ---------------------------------------------------------------------------
// JINX, the girl rat at the Club (npc/patrons.ts). Fur, hair, knit and tail are SURFACE pictures in greys, laid over
// her painted colours; her skirt's tartan and her stockings' stripes are pictures in their own colours.
// ---------------------------------------------------------------------------

/** Short fur: fine strokes lying down the picture, no two the same length, darker between. */
function paintShortFur(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.74 + (f[y * S + x] - 0.5) * 0.24, SURFACE, x, y, 0.1));
  for (let k = 0; k < S * 5; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    const len = 2 + Math.floor(rand() * 4);
    const light = rand() < 0.55;
    for (let i = 0; i < len; i++) p.blend(x + (i > 2 && rand() < 0.4 ? 1 : 0), y + i, light ? 0xffffff : 0x4e5258, light ? 0.5 - i * 0.06 : 0.3);
  }
}

/** Hair: long strands down the picture, a band of shine across them a third of the way down. */
function paintHairStrands(p: Px, rand: Rand): void {
  const S = p.size;
  const strand = Array.from({ length: S }, () => rand());
  const f = fbm(S, rand, 3, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const sx = (x + Math.round(Math.sin(y / 9 + x / 6) * 0.8) + S) % S;
      let v = 0.56 + (strand[sx] - 0.5) * 0.5 + (f[y * S + x] - 0.5) * 0.12;
      if (strand[sx] < 0.14) v -= 0.22;
      const shine = Math.abs(y - S * 0.32 - (strand[sx] - 0.5) * 5);
      if (shine < 2.2) v += 0.34 - shine * 0.1;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.1));
    }
  }
}

/** Knit: rows of small V stitches, a rib every few. */
function paintKnit(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const cx = x % 4;
      const cy = y % 4;
      let v = 0.72 + (f[y * S + x] - 0.5) * 0.14;
      // A stitch: two strokes meeting at the bottom of its cell.
      if ((cx === 0 && cy < 2) || (cx === 1 && cy >= 2) || (cx === 2 && cy >= 2) || (cx === 3 && cy < 2)) v += 0.14;
      else v -= 0.08;
      if (x % 8 === 0) v -= 0.16;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.08));
    }
  }
}

/** A rat's bare tail: rings close together down it, a little scurf. */
function paintRatTail(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0.82 + (f[y * S + x] - 0.5) * 0.14;
      if (y % 4 === 0) v -= 0.26;
      else if (y % 4 === 1) v += 0.1;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.1));
    }
  }
}

/** Tartan, for a short pleated skirt: red on black, crossed with thin white and yellow lines; a pleat's shadow every so often. */
function paintTartan(p: Px, _rand: Rand): void {
  const S = p.size;
  const P = 16;
  const band = (t: number): number => (t < 6 ? 1 : 0); // six of red, ten of black
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const a = band(x % P);
      const b = band(y % P);
      // (Woven: where red crosses red it is full red, where it crosses black it is the two in a twill.)
      let c = a && b ? 0xd81e3a : a || b ? ((x + y) % 2 ? 0xa0182c : 0x3a0c14) : 0x16121a;
      if (x % P === 10 || y % P === 10) c = (x + y) % 2 ? 0xf4f0e4 : c;
      if (x % P === 13 || y % P === 13) c = (x + y) % 2 ? 0xf2c832 : c;
      p.set(x, y, c);
      // A pleat: a dark fold down it, the next face a little lighter.
      if (x % P === 15) p.tint(x, y, 0.5);
      else if (x % P === 0) p.tint(x, y, 1.18);
    }
  }
}

/** Striped stockings: bands round the leg, black and violet, a thread of the knit showing. */
function paintStripeSock(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const violet = Math.floor(y / 4) % 2 === 0;
      const c = violet ? 0x8a4ae0 : 0x1a1620;
      p.set(x, y, shade(c, 0.9 + (f[y * S + x] - 0.5) * 0.3 + (x % 2 ? 0.06 : 0)));
      if (y % 4 === 0) p.tint(x, y, violet ? 1.2 : 0.8);
    }
  }
}

// ---------------------------------------------------------------------------
// THE TEXTURE PASS (the owner, 2026-11-16: "We've got to think about all the models in the game that don't have
// textures we need to do this with them!"). Surface pictures in greys, as the stag's are: a creature keeps the colours
// painted on it and the picture is laid over them. RULE (his, of the turtle's first skin): NOTHING ORGANIC IN ROWS OF
// OBLONGS. So none of these is a tiling of shapes: each is marks scattered on a ground.
// AND A SECOND RULE (his, of fur strokes and feather flecks tried on the mice, the birds and Grimsqueak): "its like
// you just threw a bunch of shit all over them". Marks scattered over a smooth cartoon character read as DIRT. These
// pictures are for hard-shelled creatures, whose shells really are streaked and pitted. Nothing soft and friendly
// wears them.
// ---------------------------------------------------------------------------

/** An insect's shell: smooth, faintly streaked the long way, pitted here and there, a soft cloud of dark and light under it. */
function paintChitin(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 3);
  const g = fbm(S, rand, 7, 2);
  const streak = Array.from({ length: S }, () => (rand() - 0.5) * 0.1);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0.72 + (f[y * S + x] - 0.5) * 0.44 + streak[x] * 1.6 + (g[y * S + x] - 0.5) * 0.14;
      // (A long soft glint down it, off to one side, as on anything polished.)
      const glint = Math.abs(x - S * 0.3 - (f[y * S + x] - 0.5) * 10);
      if (glint < 3) v += 0.16 - glint * 0.045;
      // Lines it has grown by, across it: wavering, not evenly apart, a pale lip under each.
      const band = Math.sin(((y + f[y * S + x] * 14) / S) * Math.PI * 9 + Math.sin(y / 7) * 0.8);
      const next = Math.sin(((y + 1 + f[((y + 1) % S) * S + x] * 14) / S) * Math.PI * 9 + Math.sin((y + 1) / 7) * 0.8);
      if (band > 0 && next <= 0) v -= 0.3;
      else if (band <= 0 && next < band && band > -0.25) v += 0.1;
      p.set(x, y, ramp(v, SURFACE, x, y, 0.1));
    }
  }
  // Pits: a dark dot with a pale one under it, some of them in pairs.
  for (let k = 0; k < 90; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.tint(x, y, 0.5);
    if (rand() < 0.4) p.tint(x + 1, y, 0.6);
    p.blend(x, y + 1, 0xffffff, 0.5);
  }
}

/** A toad's skin: warts of every size, crowded in some places and sparse in others, each a little dome; blotches under them. */
function paintWartSkin(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 3);
  const g = fbm(S, rand, 6, 2);
  // (It goes once round a ball and only half way over it, so everything in it is painted HALF AS WIDE as it is to
  // look: a wart is a tall oval here and a round one on the toad.)
  const wide = (x: number, y: number, of: Field): number => of[y * S + ((x * 2) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.7 + (wide(x, y, f) - 0.5) * 0.56 + (wide(x, y, g) - 0.5) * 0.16, SURFACE, x, y, 0.12));
  for (let k = 0; k < 110; k++) {
    const cx = rand() * S;
    const cy = rand() * S;
    // (More of them where the blotches are dark: they come in patches.)
    if (f[(Math.floor(cy) % S) * S + (Math.floor(cx) % S)] > 0.56 && rand() < 0.6) continue;
    const r = 0.9 + rand() * rand() * 3.4;
    for (let dy = -Math.ceil(r) - 1; dy <= Math.ceil(r) + 1; dy++) {
      for (let dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
        const d = Math.hypot(dx * 2, dy) / r;
        const x = Math.floor(cx + dx);
        const y = Math.floor(cy + dy);
        if (d <= 1) p.blend(x, y, dx + dy < -r * 0.3 ? 0xffffff : dx + dy > r * 0.6 ? 0x4e5258 : 0xe2e3e4, dx + dy < -r * 0.3 ? 0.7 : 0.5);
        else if (d <= 1 + 1.1 / r && dx + dy > 0) p.tint(x, y, 0.55);
      }
    }
  }
}

/** A mantis's shell, thin as a leaf: fine veins the long way, a cross-vein now and then, nothing else. */
function paintLeafChitin(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 2);
  const vein = Array.from({ length: S }, (_, x) => (x % 5 === 0 ? -0.34 : x % 5 === 1 ? 0.12 : 0) + (rand() - 0.5) * 0.08);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const vx = (x + Math.round(Math.sin(y / 11) * 0.9) + S) % S;
      p.set(x, y, ramp(0.84 + vein[vx] + (f[y * S + x] - 0.5) * 0.14, SURFACE, x, y, 0.08));
    }
  }
  for (let k = 0; k < 14; k++) {
    const x0 = Math.floor(rand() * (S / 5)) * 5 + 1;
    const y = Math.floor(rand() * S);
    for (let i = 0; i < 4; i++) p.tint(x0 + i, y + (i > 1 ? 1 : 0), 0.62);
  }
}

/** A wing's skin, a bat's or an insect's: veins running out across it from one edge and forking, pale between them. */
function paintMembrane(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.86 + (f[y * S + x] - 0.5) * 0.16, SURFACE, x, y, 0.08));
  const run = (x: number, y: number, dx: number, dy: number, len: number, depth: number): void => {
    for (let i = 0; i < len; i++) {
      p.tint(x, y, 0.62);
      p.blend(x, y + 1, 0xffffff, 0.25);
      x += dx;
      y += dy + (rand() - 0.5) * 0.5;
      if (depth > 0 && i > 3 && rand() < 0.12) run(x, y, dx, dy + (rand() < 0.5 ? 0.6 : -0.6), len - i, depth - 1);
    }
  };
  for (let k = 0; k < 5; k++) run(0, (k + 0.5) * (S / 5), 1, (k - 2) * 0.12, S, 2);
}

/**
 * THE OWL'S FEATHERS (the owner, 2026-11-16, of the owl in soft paint only: "he could also benefit from a more
 * detailed texture"). Third try at feathers, and what the first two taught: small round-ended ones with a dark line
 * round each were a wall of bricks; dark flecks were dirt. So these are LARGE and SOFT: each feather a quarter of the
 * picture wide, shaded like a shallow dish (pale toward its tip, a breath darker where it goes under the one above),
 * only a thin soft shadow under its tip, a faint shaft. Rows lie over rows, half a feather along. Painted, not inked.
 */
function paintOwlFeathers(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 2);
  const W = 16;
  const H = 8;
  const R = 10.5;
  const soft = [0x8f949a, 0xa6aaaf, 0xbcc0c4, 0xd2d5d8, 0xe6e8ea, 0xf4f5f6, 0xffffff];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let v = 0.5;
      // (The feather of the highest row that reaches down this far is the one on top here.)
      for (let up = 2; up >= 0; up--) {
        const row = Math.floor(y / H) - up;
        const dy = y - row * H;
        let dx = (((x - (((row % 2) + 2) % 2) * (W / 2)) % W) + W) % W;
        if (dx > W / 2) dx -= W;
        // (Longer than it is wide: a feather, not a coin.)
        const d = Math.hypot(dx * 1.25, dy * 0.62);
        if (d > R) continue;
        const k = d / R;
        v = 0.62 + 0.36 * k * k + (f[y * S + x] - 0.5) * 0.08;
        if (k > 0.9) v -= 0.3 * ((k - 0.9) / 0.1);
        else if (Math.abs(dx) < 0.6 && dy > 2) v -= 0.05;
        break;
      }
      p.set(x, y, ramp(v, soft, x, y, 0.07));
    }
  }
}

/**
 * The owl's wing: long flight feathers side by side down the picture, each with its own rounded end (no two ending
 * level), a soft shaft, and broad pale-edged bars across it, as an owl's are barred.
 */
function paintOwlWing(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 3, 2);
  const W = 8;
  const soft = [0x7e848a, 0x969ba0, 0xaeb2b6, 0xc6c9cc, 0xdddfe1, 0xf0f1f2, 0xffffff];
  const ends = Array.from({ length: S / W }, (_, i) => S * 0.68 + ((i * 7) % 5) * 3.2 + rand() * 2);
  const shift = Array.from({ length: S / W }, () => Math.floor(rand() * 6));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = Math.floor(x / W);
      const dx = (x % W) - (W - 1) / 2;
      // Past this feather's end the next one down shows: darker, as if under it.
      const end = ends[i] - (dx * dx) * 0.28;
      let v = 0.8 - Math.abs(dx) * 0.035 + (f[y * S + x] - 0.5) * 0.08;
      if (y > end) v = 0.52 + (f[y * S + x] - 0.5) * 0.06;
      else {
        // Bars across it, every so often, soft-edged.
        const bar = (y + shift[i]) % 14;
        if (bar < 4) v -= 0.2 - Math.abs(bar - 1.5) * 0.05;
        if (Math.abs(dx) < 0.6) v -= 0.07;
        if (Math.abs(dx) > W / 2 - 0.9) v -= 0.14;
        if (y > end - 1.5) v -= 0.12;
      }
      p.set(x, y, ramp(v, soft, x, y, 0.07));
    }
  }
}

/**
 * SOFT PAINT: what the friendly characters wear (the mice, the birds, Dave, the owl, Lord Grimsqueak). The owner,
 * 2026-11-16, after fur strokes and feather flecks on them were taken off ("like you just threw a bunch of shit all
 * over them"), with pictures of old games' characters: "Their texture doesn't have to be intense remember we're going
 * for an old school game". What those characters have is not marks but PAINTED SHADING: big soft clouds of a little
 * lighter and a little darker, as if brushed on, and nothing else. Shown him plain, soft, and deeper side by side:
 * "deeper soft paint i like best". This is the deeper. Slow clouds, five greys, no dots.
 * (The model viewer puts it on anything with `&soft=1`, to try it on someone before he wears it.)
 */
function paintSoftPaint(p: Px, rand: Rand): void {
  const S = p.size;
  const a = fbm(S, rand, 2, 2);
  const b = fbm(S, rand, 4, 2);
  const soft = [0xa8adb2, 0xbfc3c7, 0xd5d8da, 0xebecee, 0xffffff];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.2 + a[y * S + x] * 0.6 + (b[y * S + x] - 0.5) * 0.3, soft, x, y, 0.1));
}

/** The colours the dream's static is made of: dark blues, greens, violets; and the few bright ones that wink. */
const STATIC_DARK = [0x0a0a24, 0x14205e, 0x1a3a8a, 0x143c50, 0x1a7a6a, 0x2a2a7a, 0x4a2a9a, 0x1f5a3a];
const STATIC_BRIGHT = [0x3ad8ff, 0x5aff8a, 0xff5ab4, 0xffe84a, 0xbfa0ff, 0xffffff];
/**
 * Dream: STATIC. The owner, 2026-11-16, with a picture of a hall whose every surface is one fine busy many-coloured
 * noise, like a broken television: "some of the digital textures look kind of cool and also the little bit of
 * blinking". Short dashes of dark blue, green and violet, row on row, no two rows alike, a bright dot here and there.
 * AND IT BLINKS: `blinkTextures` (below) winks a few of its dots on and off, many times a second. (A picture that
 * changes is not a glow painted into a tile: nothing here is a light.)
 */
function paintDreamStatic(p: Px, rand: Rand): void {
  const S = p.size;
  for (let y = 0; y < S; y++) {
    let x = 0;
    while (x < S) {
      const len = 1 + Math.floor(rand() * rand() * 5);
      const c = rand() < 0.08 ? pick(rand, STATIC_BRIGHT) : pick(rand, STATIC_DARK);
      for (let i = 0; i < len && x < S; i++, x++) p.set(x, y, c);
    }
  }
}

/** Dream: the sky he rides through. Deep space, a drift of coloured cloud, and stars. */
function paintStarfield(p: Px, rand: Rand): void {
  const S = p.size;
  const a = fbm(S, rand, 3, 3);
  const b = fbm(S, rand, 3, 3);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const base = ramp(a[y * S + x] * 0.6, [0x05030f, 0x0c0822, 0x1a1040, 0x2c1860], x, y, 0.25);
      p.set(x, y, base);
      if (a[y * S + x] > 0.55) p.blend(x, y, b[y * S + x] > 0.5 ? 0xff3ac0 : 0x20d8e8, (a[y * S + x] - 0.55) * 1.6);
    }
  }
  for (let k = 0; k < 40; k++) p.set(rand() * S, rand() * S, pick(rand, [0xffffff, 0xfff4b0, 0xa8f0ff, 0xffb0e8]));
  for (let k = 0; k < 4; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) p.set(x + dx, y + dy, dx || dy ? 0xfff4b0 : 0xffffff);
  }
}

/**
 * Dream: the road. ONE rainbow across its whole width, the same either side of its middle line (a tile is as wide as
 * the road, and the road's middle is the tile's seam: so the picture is laid out from the seam outward). Red at its
 * edges inside a white kerb, through to violet down the middle; arrowheads down it every tile, the way to go; and a
 * glitter in each band.
 */
function paintRainbowRoad(p: Px, rand: Rand): void {
  const S = p.size;
  // From the middle out: violet, blue, cyan, green, yellow, orange, red.
  const bands = [0x9a4aff, 0x4a6aff, 0x2ad8ff, 0x3aff7a, 0xffe62a, 0xff8a1e, 0xff2a6a];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // How far from the middle line, 0 at the seam to 1 at the road's edge.
      const u = (x + 0.5) / S;
      const out = Math.min(u, 1 - u) * 2;
      const kerb = out > 0.94;
      const f = Math.min(6.999, (out / 0.94) * 7);
      const i = Math.floor(f);
      const within = f - i;
      // Each band is rounded: bright down its middle, darker at its seams.
      let c = shade(bands[i], 0.78 + 0.3 * Math.sin(within * Math.PI));
      if (within < 0.08 && i > 0) c = shade(c, 0.7);
      // Arrowheads pointing down the road, once a tile: a V whose point is on the middle line.
      const v = (y + out * S * 0.5) % S;
      if (v < 3) c = mix(c, 0xffffff, v < 1.5 ? 0.75 : 0.4);
      if (kerb) c = (Math.floor(y / 8) % 2 ? 0xffffff : 0xffd8f0);
      p.set(x, y, c);
    }
  }
  for (let k = 0; k < 46; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.blend(x, y, 0xffffff, 0.85);
    if (k % 4 === 0) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) p.blend(x + dx, y + dy, 0xffffff, 0.4);
  }
}

/**
 * Dream: the floor of a landing. Loud shapes on loud colours, as on a shirt from another age: squiggles, triangles,
 * dots and a grid, each in its own quarter, none lined up with the next.
 */
function paintPomoTiles(p: Px, rand: Rand): void {
  const S = p.size;
  const H = S / 2;
  const ground = [0xff5ab4, 0x3ee8c0, 0xffe84a, 0x7a5cff];
  const ink = 0x1a1030;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ground[(x < H ? 0 : 1) + (y < H ? 0 : 2)]);
  // Top left (pink): a field of dots, every other row set over.
  for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const x = 4 + c * 6 + (r % 2) * 3;
    const y = 4 + r * 6;
    if (x < H - 1) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) p.set(x + dx, y + dy, ink);
  }
  // Top right (mint): squiggles.
  for (let k = 0; k < 3; k++) for (let x = 0; x < 22; x++) {
    const y = 6 + k * 9 + Math.round(Math.sin(x * 0.9 + k) * 2.4);
    p.set(H + 5 + x, y, ink);
    p.set(H + 5 + x, y + 1, 0xff5ab4);
  }
  // Bottom left (yellow): triangles, pointing every which way.
  for (const [cx, cy, up, c] of [[8, H + 9, 1, 0x7a5cff], [21, H + 7, -1, 0xff5ab4], [13, H + 22, -1, 0x3ee8c0], [25, H + 23, 1, ink]] as Array<[number, number, number, number]>) {
    for (let r = 0; r < 6; r++) for (let dx = -r; dx <= r; dx++) p.set(cx + dx, cy + up * (r - 3), c);
  }
  // Bottom right (violet): a grid, with one square of it filled.
  for (let k = 0; k < H; k += 8) for (let t = 0; t < H; t++) {
    p.set(H + k, H + t, 0xffe84a);
    p.set(H + t, H + k, 0xffe84a);
  }
  for (let y = 1; y < 8; y++) for (let x = 1; x < 8; x++) p.set(H + 8 + x, H + 16 + y, 0x3ee8c0);
  for (let k = 0; k < 10; k++) p.blend(rand() * S, rand() * S, 0xffffff, 0.8);
}

/** Furnace, refreshed: soot-black brick with the heat showing in its joints. */
function paintEmberBrick(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / 8);
    for (let x = 0; x < S; x++) {
      const lx = (x + (row % 2) * 8) % 16;
      const ly = y % 8;
      const joint = lx === 0 || ly === 0;
      const heat = f[y * S + x];
      if (joint) p.set(x, y, ramp(heat * 1.2 - 0.1, [0x180806, 0x5a1408, 0xc23a0c, 0xff8a1e, 0xffe08a], x, y, 0.3));
      else p.set(x, y, ramp(0.2 + (ly === 1 || lx === 1 ? 0.25 : 0) + (rand() - 0.5) * 0.2 + (heat > 0.6 ? 0.2 : 0), [0x0c0a0a, 0x1a1514, 0x2a2220, 0x40302a, 0x5a3a2a], x, y, 0.2));
    }
  }
  for (let k = 0; k < 6; k++) p.set(rand() * S, rand() * S, 0xffc04a);
}

/** Furnace, refreshed: an iron vent in the floor, the glow below showing through its slots. */
function paintSteamVent(p: Px, rand: Rand): void {
  const S = p.size;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.45 + (rand() - 0.5) * 0.25 + (x < 2 || y < 2 ? 0.25 : x > S - 3 || y > S - 3 ? -0.25 : 0), [0x14161a, 0x24282e, 0x363c44, 0x4c545e, 0x6a747e], x, y, 0.2));
  for (let sx = 5; sx < S - 4; sx += 6) {
    for (let y = 5; y < S - 5; y++) {
      for (let dx = 0; dx < 3; dx++) p.set(sx + dx, y, ramp(1 - Math.abs(y - S / 2) / (S / 2) + rand() * 0.2, [0x1a0806, 0x7a1c08, 0xe0520e, 0xffb040], sx + dx, y, 0.3));
      p.set(sx - 1, y, 0x0a0c0e);
      p.set(sx + 3, y, 0x7a848e);
    }
  }
  for (const [x, y] of [[2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]]) p.set(x, y, 0xa8b2ba);
}

// ---------------------------------------------------------------------------
// The furnace's own set (2026-11-17), for the Forge try-out room (levels/forge.ts): every part of the place has a
// picture of its own, so that the floor, what stands on it, what he climbs and what he climbs past are four different
// things to the eye. (The Foundry wore one rusty plate on all four.) NOTHING IN ANY OF THEM GLOWS: fire and hot metal
// are things in the room, never paint in a tile that comes round every three steps.
// ---------------------------------------------------------------------------

/**
 * Firebrick, for a furnace hall's walls: long bricks in running bond, baked every colour from buff to plum, some burnt
 * black; proud of their mortar (lit along the top, shaded underneath); pitted, chipped, and sooted in runs from above.
 */
function paintFireBrick(p: Px, rand: Rand): void {
  const S = p.size;
  // (A brick is sixteen by eight, whatever the picture's size: at 128 there are 128 of them before one comes round
  // again. At 64 the same few burnt bricks came round every three steps and made stripes across a big wall.)
  const BW = 16;
  const BH = 8;
  const cols = S / BW;
  const f = fbm(S, rand, 16, 3);
  const soot = fbm(S, rand, 3, 2);
  const clay = [0x4a2616, 0x5e2f1b, 0x743a21, 0x8a4828, 0x9f5a32, 0xb26e40];
  const burnt = [0x2a1a16, 0x35211b, 0x432a22, 0x52342a];
  const buff = [0x80583a, 0x916844, 0xa37a50, 0xb58c5e];
  const mortar = [0x120d0b, 0x1a130f, 0x231a14];
  const tone: number[] = [];
  const kind: number[] = [];
  for (let i = 0; i < cols * (S / BH); i++) {
    tone.push(0.34 + rand() * 0.38);
    const r = rand();
    kind.push(r < 0.09 ? 1 : r < 0.16 ? 2 : 0);
  }
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / BH);
    const off = (row % 2) * (BW / 2) + (row % 4 === 3 ? 3 : 0);
    const ly = y % BH;
    for (let x = 0; x < S; x++) {
      const bx = (x + off) % S;
      const lx = bx % BW;
      const id = row * cols + Math.floor(bx / BW);
      if (ly === BH - 1 || lx === BW - 1) {
        p.set(x, y, ramp(rand() * 0.7, mortar, x, y, 0.3));
        continue;
      }
      const i = y * S + x;
      let v = tone[id] + (f[i] - 0.5) * 0.4 - soot[i] * 0.22;
      if (ly === 0) v += 0.16;
      else if (ly === BH - 2) v -= 0.16;
      if (lx === 0) v += 0.07;
      else if (lx === BW - 2) v -= 0.1;
      p.set(x, y, ramp(v, kind[id] === 1 ? burnt : kind[id] === 2 ? buff : clay, x, y, 0.22));
    }
  }
  // Pits and chips; a crack through a brick here and there; soot run down from above.
  const many = (S * S) / 4096;
  const inBrick = (x: number, y: number): boolean => y % BH < BH - 1 && ((x + (Math.floor(y / BH) % 2) * (BW / 2)) % BW) < BW - 1;
  for (let k = 0; k < 90 * many; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    if (inBrick(x, y)) p.tint(x, y, rand() < 0.7 ? 0.55 : 1.15);
  }
  for (let k = 0; k < 5 * many; k++) {
    const row = Math.floor(rand() * (S / BH));
    p.crack(rand, Math.floor(rand() * S), row * BH + 1, 5, Math.PI / 2 + (rand() - 0.5), 0x140e0c, 0.5);
  }
  for (let k = 0; k < 7 * many; k++) {
    const x = Math.floor(rand() * S);
    const y0 = Math.floor(rand() * S);
    const len = 10 + Math.floor(rand() * 20);
    for (let j = 0; j < len; j++) {
      const t = 1 - j / len;
      p.tint(x, y0 + j, 1 - 0.34 * t);
      if (t > 0.5) p.tint(x + 1, y0 + j, 1 - 0.18 * t);
    }
  }
}

/**
 * Tread plate, for a foundry's floor: dark steel covered in raised lozenges, each a short stroke lying the other way
 * from its neighbours, worn bright where feet go and black with oil where they do not; in sheets, bolted at the corners.
 */
function paintDeckPlate(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 8, 3);
  const wear = fbm(S, rand, 3, 2);
  const steel = [0x101317, 0x181c22, 0x232930, 0x313840, 0x434c55, 0x5b656e, 0x7f8a92];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.34 + (f[y * S + x] - 0.5) * 0.3 + (wear[y * S + x] - 0.5) * 0.2, steel, x, y, 0.2));
  // The lozenges: one to every eight, slanting the other way from the last.
  for (let cy = 0; cy < S / 8; cy++) {
    for (let cx = 0; cx < S / 8; cx++) {
      const slant = (cx + cy) % 2 === 0 ? 1 : -1;
      const mx = cx * 8 + 4;
      const my = cy * 8 + 4;
      const w = wear[my * S + mx];
      for (let t = -2; t <= 2; t++) {
        const x = mx + t;
        const y = my + slant * Math.round(t / 2);
        p.set(x, y, ramp(0.62 + w * 0.4, steel, x, y, 0.12));
        p.set(x, y + 1, steel[0]);
      }
    }
  }
  // The sheets: a seam every half tile, and a bolt in from each corner.
  const half = S / 2;
  for (let i = 0; i < S; i++) {
    for (const s of [0, half]) {
      p.set(i, s, 0x07080a);
      p.set(i, s + 1, ramp(0.5 + f[i] * 0.2, steel, i, s, 0.2));
      p.set(s, i, 0x07080a);
      p.set(s + 1, i, ramp(0.5 + f[i] * 0.2, steel, s, i, 0.2));
    }
  }
  for (const sx of [0, half]) for (const sy of [0, half]) for (const [dx, dy] of [[3, 3], [half - 4, 3], [3, half - 4], [half - 4, half - 4]]) {
    const x = sx + dx;
    const y = sy + dy;
    p.rect(x, y, 2, 2, steel[5]);
    p.set(x, y, steel[6]);
    p.hline(x, y + 2, 2, 0x07080a);
  }
  // Oil where nobody walks; a bloom of rust along a seam here and there (small: never the same blot on every sheet).
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x;
    if (wear[i] < 0.3) p.tint(x, y, 0.78);
    const seam = Math.min(x % half, half - (x % half), y % half, half - (y % half));
    if (seam > 0 && seam < 4 && f[i] > 0.66) p.blend(x, y, 0x6a3418, 0.45);
  }
}

/**
 * Cast iron, for the blocks and stagings he stands on and climbs: square castings, each with a raised frame round a
 * sunk field, a lozenge boss cast in the middle of the field, a bolt in each corner of the frame. Graphite black,
 * pitted, with a brown heat-scale in patches.
 */
function paintCastIron(p: Px, rand: Rand): void {
  const S = p.size;
  const P = S / 2;
  const f = fbm(S, rand, 16, 2);
  const g = fbm(S, rand, 3, 2);
  const iron = [0x141314, 0x201d1f, 0x2e2a2d, 0x3f3a3e, 0x524b50, 0x696166, 0x878085];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const lx = x % P;
      const ly = y % P;
      const d = Math.min(lx, ly, P - 1 - lx, P - 1 - ly);
      let v: number;
      if (d === 0) v = 0.02;
      else if (d <= 4) {
        // The frame: lit on its top and left runs, shaded on its bottom and right.
        const top = ly === d;
        const left = lx === d;
        const bottom = P - 1 - ly === d;
        v = 0.5 + (top ? 0.2 : bottom ? -0.2 : left ? 0.08 : -0.1) + (f[i] - 0.5) * 0.2;
        if (d === 1) v -= 0.12;
      } else if (d === 5) v = ly === 5 || lx === 5 ? 0.1 : 0.46;
      else {
        v = 0.3 + (f[i] - 0.5) * 0.36 + (g[i] - 0.5) * 0.14;
        const m = Math.abs(lx - (P - 1) / 2) + Math.abs(ly - (P - 1) / 2);
        if (m < 6.6) v += 0.12;
        else if (m < 7.6) v += lx + ly < P ? 0.26 : -0.2;
      }
      p.set(x, y, ramp(v, iron, x, y, 0.18));
      if (d > 0 && g[i] > 0.62) p.blend(x, y, 0x5a2e1a, (g[i] - 0.62) * 0.9);
    }
  }
  for (const sx of [0, P]) for (const sy of [0, P]) for (const [dx, dy] of [[2, 2], [P - 4, 2], [2, P - 4], [P - 4, P - 4]]) {
    p.rect(sx + dx, sy + dy, 2, 2, iron[5]);
    p.set(sx + dx, sy + dy, iron[6]);
    p.hline(sx + dx, sy + dy + 2, 2, 0x050505);
  }
  p.speckle(rand, 70, [0x0a090a, 0x141213]);
}

/**
 * A riveted girder, for columns and for the walls he kicks up: a post down each edge of the picture (two pictures
 * side by side make one post between them), riveted; between the posts, flat bars laced corner to corner over the
 * dark, a plate where they cross and a strap where each pair ends. In red oxide paint, chipped to the steel.
 */
function paintGirder(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 8, 3);
  const paint = [0x26100c, 0x3a170e, 0x532112, 0x6d2d18, 0x863a20, 0x9d4a2a, 0xb35f38];
  const dark = [0x050404, 0x0a0808, 0x110e0e];
  const steel = [0x2a2e33, 0x444a50, 0x666e75];
  const post = Math.round(S * 0.19);
  const web = S - post * 2;
  const bay = S / 2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const n = (f[i] - 0.5) * 0.3;
      if (x < post || x >= S - post) {
        const edge = x === post - 1 ? -0.2 : x === S - post ? 0.18 : 0;
        p.set(x, y, ramp(0.5 + n + edge, paint, x, y, 0.2));
        continue;
      }
      const wx = x - post;
      const wy = y % bay;
      const a = (wy * web) / bay;
      const d1 = Math.abs(wx - a);
      const d2 = Math.abs(wx - (web - a));
      const strap = wy < 4;
      const boss = Math.hypot(wx - web / 2, wy - bay / 2) < 5;
      if (strap) p.set(x, y, ramp(0.52 + n + (wy === 0 ? 0.18 : wy === 3 ? -0.2 : 0), paint, x, y, 0.2));
      else if (boss) p.set(x, y, ramp(0.56 + n + (wy < bay / 2 - 3 ? 0.14 : wy > bay / 2 + 3 ? -0.16 : 0), paint, x, y, 0.2));
      else if (d1 < 2.6 || d2 < 2.6) {
        const d = Math.min(d1, d2);
        p.set(x, y, ramp(0.44 + n + (d > 1.7 ? (((d1 < d2 ? wx - a : wx - (web - a)) < 0) === d1 < d2 ? 0.16 : -0.18) : 0), paint, x, y, 0.2));
      } else p.set(x, y, ramp(rand() * 0.6, dark, x, y, 0.3));
    }
  }
  // Rivets: down each post, along each strap, and one in the middle of each crossing plate.
  const rivet = (x: number, y: number): void => {
    p.rect(x, y, 2, 2, paint[5]);
    p.set(x, y, paint[6]);
    p.hline(x, y + 2, 2, 0x140806);
    p.tint(x, y + 3, 0.8);
    p.tint(x, y + 4, 0.88);
  };
  for (let y = 3; y < S; y += 8) {
    rivet(Math.floor(post / 2) - 1, y);
    rivet(S - Math.floor(post / 2) - 1, y);
  }
  for (const y0 of [0, bay]) {
    for (let x = post + 4; x < S - post - 3; x += 8) rivet(x, y0 + 1);
    rivet(S / 2 - 1, y0 + bay / 2 - 1);
  }
  // Chips through the paint to the steel, mostly on the edges of things.
  for (let k = 0; k < 60; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    const c = p.get(x, y);
    if (chR(c) > 60) p.set(x, y, pick(rand, steel));
  }
}

/**
 * Casting sand, for the floor of a moulding bay: black sand, damp and trodden, raked in long wavering furrows, with
 * bits of slag and flecks of ash in it.
 */
function paintCastingSand(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 4);
  const g = fbm(S, rand, 16, 2);
  const sand = [0x1a1611, 0x26201a, 0x342c22, 0x443a2c, 0x574a38, 0x6c5c46];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const furrow = (((y + Math.round(2.5 * Math.sin((x / S) * Math.PI * 4) + 1.5 * Math.sin((x / S) * Math.PI * 10))) % 8) + 8) % 8;
      const v = 0.36 + (f[i] - 0.5) * 0.5 + (g[i] - 0.5) * 0.24 + (furrow === 0 ? 0.2 : furrow === 1 ? -0.18 : 0);
      p.set(x, y, ramp(v, sand, x, y, 0.3));
    }
  }
  for (let k = 0; k < 22; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.rect(x, y, 2, 2, 0x09090b);
    p.set(x, y, 0x5c5e66);
    p.set(x + 1, y + 2, 0x0c0a08);
  }
  p.speckle(rand, 46, [0x7c766a, 0x655f54, 0x8e887a]);
}

/** Coal, heaped: black lumps, each with a face or two that catches the light, and the dark between them. */
function paintCoalLumps(p: Px, rand: Rand): void {
  const S = p.size;
  const cells = voronoi(S, 5, rand);
  const f = fbm(S, rand, 8, 2);
  const coal = [0x040405, 0x09090b, 0x101014, 0x191a20, 0x25272f, 0x353843];
  const tones = Array.from({ length: 64 }, () => 0.2 + rand() * 0.45);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const edge = cells[i].d2 - cells[i].d1;
      if (edge < 1.3) p.set(x, y, 0x020203);
      else p.set(x, y, ramp(tones[cells[i].id % 64] + (f[i] - 0.5) * 0.4 + (edge > 3.5 ? 0.14 : 0), coal, x, y, 0.25));
    }
  }
  for (let k = 0; k < 12; k++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.set(x, y, 0x8a90a0);
    p.blend(x + 1, y, 0x4a4e5a, 0.8);
  }
}

const DEFS = {
  // legacy (mid-grey / murky green, tinted by vertex colour)
  stone: { size: 32, seed: 11, paint: legacyBlocks(4, 2, 150, 70) },
  floor: { size: 32, seed: 23, paint: legacyBlocks(4, 4, 130, 58) },
  brick: { size: 32, seed: 37, paint: legacyBlocks(4, 4, 112, 52) },
  water: { size: 32, seed: 53, paint: paintWater },
  // sewer
  sewerBrick: { size: 32, seed: 101, paint: paintSewerBrick },
  concreteSlab: { size: 64, seed: 102, paint: paintConcreteSlab },
  rustPlate: { size: 64, seed: 103, paint: paintRustPlate },
  drainGrate: { size: 32, seed: 104, paint: paintDrainGrate },
  pipeBands: { size: 32, seed: 105, paint: paintPipeBands },
  mossStone: { size: 32, seed: 106, paint: paintMossStone },
  wetCobbles: { size: 32, seed: 107, paint: paintWetCobbles },
  sludge: { size: 32, seed: 108, paint: paintSludge },
  sewerWater: { size: 32, seed: 109, paint: paintSewerWater },
  ceramicTiles: { size: 32, seed: 110, paint: paintCeramicTiles },
  archTrim: { size: 32, seed: 111, paint: paintArchTrim },
  // tunnel
  dirt: { size: 32, seed: 201, paint: paintDirt },
  dirtRoots: { size: 32, seed: 202, paint: paintDirtRoots },
  planks: { size: 32, seed: 203, paint: paintPlanks },
  beamEnd: { size: 32, seed: 204, paint: paintBeamEnd },
  beamSide: { size: 32, seed: 205, paint: paintBeamSide },
  rubbleWall: { size: 64, seed: 206, paint: paintRubbleWall },
  gravelRail: { size: 32, seed: 207, paint: paintGravelRail },
  mineBrick: { size: 32, seed: 208, paint: paintMineBrick },
  clay: { size: 32, seed: 209, paint: paintClay },
  // cave
  roughRock: { size: 32, seed: 301, paint: paintRoughRock },
  wetRock: { size: 32, seed: 302, paint: paintWetRock },
  sandstone: { size: 32, seed: 303, paint: paintSandstone },
  crystalRock: { size: 32, seed: 304, paint: paintCrystalRock },
  mudFloor: { size: 32, seed: 305, paint: paintMudFloor },
  mossRock: { size: 32, seed: 306, paint: paintMossRock },
  mushroomPatch: { size: 32, seed: 307, paint: paintMushroomPatch },
  stalagmite: { size: 32, seed: 308, paint: paintStalagmite },
  poolWater: { size: 32, seed: 309, paint: paintPoolWater },
  magmaRock: { size: 32, seed: 310, paint: paintMagmaRock },
  // shared
  crate: { size: 64, seed: 401, paint: paintCrate },
  ironDoor: { size: 64, seed: 402, paint: paintIronDoor },
  ironBars: { size: 32, seed: 403, paint: paintIronBars },
  hazardTrim: { size: 32, seed: 404, paint: paintHazardTrim },
  // props (not offered in the level builder: they are what things are made of, not what rooms are built from)
  // MOCK-UPS (2026-11-16): looked at, used by nothing yet. Ice; glow cave; dream; the furnace and the sewer refreshed.
  scorpShell: { size: 64, seed: 821, paint: paintScorpShell },
  scorpTail: { size: 32, seed: 822, paint: paintScorpTail },
  scorpClaw: { size: 32, seed: 823, paint: paintScorpClaw },
  scorpLamp: { size: 32, seed: 824, paint: paintScorpLamp },
  mushroomCap: { size: 64, seed: 825, paint: paintMushroomCap },
  mushroomStem: { size: 32, seed: 826, paint: paintMushroomStem },
  // Ice (the Cold Main): the sewer frozen. Plain tiles; icicles, spikes and burst pipes are things put on them.
  iceBrick: { size: 32, seed: 801, paint: paintIceBrick },
  frostCobbles: { size: 64, seed: 802, paint: paintFrostCobbles },
  iceSheet: { size: 64, seed: 805, paint: paintIceSheet },
  iceBlock: { size: 64, seed: 807, paint: paintIceBlock },
  frostPipe: { size: 32, seed: 803, paint: paintFrostPipe },
  iceClear: { size: 32, seed: 806, paint: paintIceClear },
  caveRock: { size: 64, seed: 811, paint: paintCaveRock },
  caveFloor: { size: 64, seed: 814, paint: paintCaveFloor },
  glowMoss: { size: 32, seed: 813, paint: paintGlowMoss },
  // The Frost Roller (enemies/rollerModel.ts): one plate of its shell, and its dark underside.
  rollerShell: { size: 64, seed: 811, paint: paintRollerShell },
  rollerUnder: { size: 32, seed: 812, paint: paintRollerUnder },
  // Surface pictures for creatures that keep their own painted colours: the Stag Knight, and the Club's turtles.
  stagShell: { size: 64, seed: 841, paint: paintStagShell },
  stagBelly: { size: 64, seed: 842, paint: paintStagBelly },
  stagHorn: { size: 32, seed: 843, paint: paintStagHorn },
  stagIron: { size: 32, seed: 844, paint: paintStagIron },
  ashWood: { size: 32, seed: 845, paint: paintAshWood },
  turtleScute: { size: 64, seed: 846, paint: paintTurtleScuteAs(false) },
  turtleScuteMossy: { size: 64, seed: 849, paint: paintTurtleScuteAs(true) },
  turtleSkin: { size: 64, seed: 847, paint: paintTurtleSkin },
  turtleBelly: { size: 64, seed: 848, paint: paintTurtleBelly },
  // Jinx, the girl rat at the Club.
  shortFur: { size: 32, seed: 851, paint: paintShortFur },
  hairStrands: { size: 32, seed: 852, paint: paintHairStrands },
  knit: { size: 64, seed: 853, paint: paintKnit },
  ratTail: { size: 32, seed: 854, paint: paintRatTail },
  tartan: { size: 64, seed: 855, paint: paintTartan },
  stripeSock: { size: 32, seed: 856, paint: paintStripeSock },
  // The texture pass: surface pictures for the creatures and characters that were plain.
  chitin: { size: 64, seed: 861, paint: paintChitin },
  wartSkin: { size: 64, seed: 862, paint: paintWartSkin },
  leafChitin: { size: 32, seed: 863, paint: paintLeafChitin },
  membrane: { size: 32, seed: 864, paint: paintMembrane },
  owlFeathers: { size: 64, seed: 872, paint: paintOwlFeathers },
  owlWing: { size: 64, seed: 873, paint: paintOwlWing },
  // Soft painted shading: what the friendly characters wear.
  softPaint: { size: 64, seed: 871, paint: paintSoftPaint },
  dreamStatic: { size: 64, seed: 881, paint: paintDreamStatic },
  starfield: { size: 32, seed: 821, paint: paintStarfield },
  rainbowRoad: { size: 64, seed: 822, paint: paintRainbowRoad },
  pomoTiles: { size: 64, seed: 823, paint: paintPomoTiles },
  emberBrick: { size: 32, seed: 831, paint: paintEmberBrick },
  steamVent: { size: 32, seed: 832, paint: paintSteamVent },
  // The Widow (enemies/widowModel.ts): her shell, and the horn of her claws and fangs. Both run ALONG a limb (v).
  widowChitin: { size: 32, seed: 701, paint: paintWidowChitin },
  widowHorn: { size: 32, seed: 702, paint: paintWidowHorn },
  widowBack: { size: 32, seed: 703, paint: paintWidowBack },
  // the furnace's own set (the Forge try-out room)
  fireBrick: { size: 128, seed: 911, paint: paintFireBrick },
  deckPlate: { size: 64, seed: 912, paint: paintDeckPlate },
  castIron: { size: 64, seed: 913, paint: paintCastIron },
  girder: { size: 64, seed: 914, paint: paintGirder },
  castingSand: { size: 64, seed: 915, paint: paintCastingSand },
  coalLumps: { size: 32, seed: 916, paint: paintCoalLumps },
  wroughtIron: { size: 32, seed: 601, paint: paintWroughtIron },
  cutStone: { size: 32, seed: 607, paint: paintCutStone },
  charred: { size: 32, seed: 602, paint: paintCharred },
  coals: { size: 32, seed: 603, paint: paintCoals },
  // The Club's furniture (2026-11-18): it was plain colour.
  cork: { size: 32, seed: 607, paint: paintCork },
  tin: { size: 32, seed: 608, paint: paintTin },
  couchFabric: { size: 64, seed: 604, paint: paintCouchFabric },
  couchPatch: { size: 32, seed: 605, paint: paintCouchPatch },
  knitBlanket: { size: 32, seed: 606, paint: paintKnitBlanket },
  // keep
  keepStone: { size: 32, seed: 501, paint: paintKeepStone },
  royalCarpet: { size: 32, seed: 502, paint: paintRoyalCarpet },
} satisfies Record<string, Def>;

export type TextureName = keyof typeof DEFS;

export const TEXTURE_NAMES: readonly TextureName[] = Object.keys(DEFS) as TextureName[];

export const TEXTURE_SETS: { sewer: TextureName[]; tunnel: TextureName[]; cave: TextureName[]; shared: TextureName[] } = {
  sewer: ['sewerBrick', 'concreteSlab', 'rustPlate', 'drainGrate', 'pipeBands', 'mossStone', 'wetCobbles', 'sludge', 'sewerWater', 'ceramicTiles', 'archTrim'],
  tunnel: ['dirt', 'dirtRoots', 'planks', 'beamEnd', 'beamSide', 'rubbleWall', 'gravelRail', 'mineBrick', 'clay'],
  cave: ['roughRock', 'wetRock', 'sandstone', 'crystalRock', 'mudFloor', 'mossRock', 'mushroomPatch', 'stalagmite', 'poolWater', 'magmaRock'],
  shared: ['stone', 'floor', 'brick', 'water', 'crate', 'ironDoor', 'ironBars', 'hazardTrim', 'keepStone', 'royalCarpet'],
};

const pixelCache = new Map<TextureName, TexturePixels>();
const textureCache = new Map<TextureName, THREE.DataTexture>();

export function getTexturePixels(name: TextureName): TexturePixels {
  let px = pixelCache.get(name);
  if (!px) {
    // (A picture dropped into assets/textures under this name takes the place of the painted one: assets/drop.ts.)
    const dropped = droppedTexture(name);
    if (dropped) px = dropped;
    else {
      const def: Def = DEFS[name];
      const p = new Px(def.size);
      def.paint(p, mulberry32(def.seed));
      px = { size: def.size, data: p.data };
    }
    pixelCache.set(name, px);
  }
  return px;
}

export function getTexture(name: TextureName): THREE.DataTexture {
  let tex = textureCache.get(name);
  if (!tex) {
    const { size, data } = getTexturePixels(name);
    tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    textureCache.set(name, tex);
  }
  return tex;
}

/** Which dots of the static are winking just now: where, and what was there. */
const winks: Array<{ at: number; was: [number, number, number] }> = [];
let winkedAt = -1;
/**
 * Winks the dream's static: a few times a second a handful of its dots turn bright and the last handful turn back.
 * Called with the room's clock; costs nothing when nobody has asked for the picture.
 */
export function blinkTextures(time: number): void {
  const tex = textureCache.get('dreamStatic');
  if (!tex || Math.abs(time - winkedAt) < 0.11) return;
  winkedAt = time;
  const data = tex.image.data as Uint8Array;
  // (Put back in the reverse of the order they were taken: a dot picked twice in one lot remembered itself bright
  // the second time, and put back in order it stayed bright for good.)
  for (const w of winks.splice(0).reverse()) data.set(w.was, w.at);
  const n = data.length / 4;
  for (let i = 0; i < 46; i++) {
    const at = Math.floor(Math.random() * n) * 4;
    winks.push({ at, was: [data[at], data[at + 1], data[at + 2]] });
    const c = STATIC_BRIGHT[Math.floor(Math.random() * STATIC_BRIGHT.length)];
    data.set([(c >> 16) & 255, (c >> 8) & 255, c & 255], at);
  }
  tex.needsUpdate = true;
}

