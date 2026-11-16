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
  size: 32 | 64;
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

/** Ice: a frozen wall. Deep blue ice with the light caught slantwise in it, white cracks, and bubbles frozen in. */
function paintIceWall(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 3);
  const pal = [0x14263e, 0x234a70, 0x3f7aa6, 0x7fb6d6, 0xbfe4f4, 0xf2fcff];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.18 + f[y * S + x] * 0.5 + 0.14 * Math.sin(((x + y * 0.5) / S) * Math.PI * 6), pal, x, y, 0.2));
  for (let c = 0; c < 4; c++) {
    let x = rand() * S;
    let y = rand() * S;
    for (let k = 0; k < 14; k++) {
      p.set(x, y, 0xf2fcff);
      p.blend(x + 1, y, 0x14263e, 0.35);
      x += rand() < 0.6 ? 1 : 0;
      y += rand() < 0.75 ? 1 : -1;
    }
  }
  for (let b = 0; b < 6; b++) {
    const x = Math.floor(rand() * S);
    const y = Math.floor(rand() * S);
    p.set(x, y, 0xf2fcff);
    p.blend(x + 1, y + 1, 0x14263e, 0.5);
  }
}

/** Ice: the old cobbles under a glaze. Dark stones, ice in the joints, frost on the top of each. */
function paintFrostCobbles(p: Px, rand: Rand): void {
  const S = p.size;
  const stone = [0x1c2430, 0x2a3644, 0x3c4c5c, 0x566a7a];
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / 8);
    for (let x = 0; x < S; x++) {
      const lx = (x + (row % 2) * 4) % 8;
      const ly = y % 8;
      const edge = lx === 0 || ly === 0;
      const dome = 1 - (Math.abs(lx - 4) + Math.abs(ly - 4)) / 9;
      if (edge) p.set(x, y, ramp(0.5 + rand() * 0.4, [0x4a86ac, 0x8cc4e0, 0xd4f0fa], x, y, 0.3));
      else p.set(x, y, ramp(dome * 0.8 + rand() * 0.15, stone, x, y, 0.2));
      if (!edge && ly <= 2 && rand() < 0.75 - ly * 0.22) p.blend(x, y, 0xeaf8ff, 0.8);
    }
  }
  for (let g = 0; g < 8; g++) p.set(rand() * S, rand() * S, 0xffffff);
}

/** Ice: a pipe that has burst. Steel bands, a split in one, frost blooming white round it and icicles hung below. */
function paintFrostPipe(p: Px, rand: Rand): void {
  const S = p.size;
  const steel = [0x1a2026, 0x2e3840, 0x4a5862, 0x6e7e88, 0x98a8b0];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.5 + 0.45 * Math.cos((((y % 16) - 8) / 16) * Math.PI * 2) + (rand() - 0.5) * 0.08, steel, x, y, 0.15));
  for (let x = 0; x < S; x++) {
    p.set(x, 0, 0x101418);
    p.set(x, 16, 0x101418);
    if (x % 8 === 3) p.set(x, 2, 0xb8c4cc);
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = Math.hypot((x - 16) * 0.8, y - 8);
      if (d < 9) p.blend(x, y, 0xf0faff, Math.max(0, 0.95 - d / 9 - rand() * 0.25));
    }
  }
  for (let x = 12; x <= 20; x++) p.set(x, 8 + (x % 3 === 0 ? 1 : 0), 0x05080c);
  for (const x of [6, 11, 15, 19, 24, 28]) {
    const len = 3 + Math.floor(rand() * 6);
    for (let k = 0; k < len; k++) p.set(x, 17 + k, k > len - 3 ? 0xf4fcff : 0xa8d4ea);
  }
}

/** Ice: icicles hanging from a ledge, for the top of a wall. */
function paintIcicles(p: Px, rand: Rand): void {
  const S = p.size;
  const f = fbm(S, rand, 4, 2);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, ramp(0.15 + f[y * S + x] * 0.3, [0x0c1622, 0x16283a, 0x223c54], x, y, 0.2));
  for (let x = 0; x < S; x++) for (let y = 0; y < 4; y++) p.set(x, y, ramp(0.6 + rand() * 0.4, [0x8cc4e0, 0xd4f0fa, 0xffffff], x, y, 0.3));
  for (let c = 0; c < 9; c++) {
    const x0 = Math.floor(rand() * S);
    const len = 8 + Math.floor(rand() * 18);
    const w = 1 + Math.floor(rand() * 2.5);
    for (let k = 0; k < len; k++) {
      const half = Math.round(w * (1 - k / len));
      for (let dx = -half; dx <= half; dx++) p.set(x0 + dx, 4 + k, dx < 0 ? 0xf4fcff : dx === 0 ? 0xb4dcf0 : 0x5a94b8);
    }
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

/** Dream: the road. Bands of every colour running down it, bright edges, and sparks. */
function paintRainbowRoad(p: Px, rand: Rand): void {
  const S = p.size;
  const bands = [0xff2a6a, 0xff8a1e, 0xffe62a, 0x3aff7a, 0x2ad8ff, 0x6a5aff, 0xe03aff];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x + 0.5) / S;
      const i = Math.min(6, Math.floor(u * 7));
      const within = u * 7 - i;
      let c = shade(bands[i], 0.8 + 0.3 * Math.sin(within * Math.PI));
      // (Chevrons pointing down it: the way to go.)
      if ((y + Math.abs(x - S / 2)) % 16 < 2) c = mix(c, 0xffffff, 0.55);
      p.set(x, y, c);
    }
    p.set(0, y, 0xffffff);
    p.set(S - 1, y, 0xffffff);
  }
  for (let k = 0; k < 14; k++) p.set(rand() * S, rand() * S, 0xffffff);
}

/** Dream: a wall of the dream. Loud shapes on loud colours, as on a shirt from another age. */
function paintPomoTiles(p: Px, rand: Rand): void {
  const S = p.size;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p.set(x, y, (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? 0xff5ab4 : 0x3ee8c0);
  for (let k = 0; k < 20; k++) p.set(4 + (k % 5) * 6, 3 + Math.floor(k / 5) * 8 + ((k % 5) % 2), 0x1a1030);
  for (let x = 0; x < 14; x++) {
    p.set(17 + x, 6 + Math.round(Math.sin(x * 1.1) * 2), 0x1a1030);
    p.set(1 + x, 24 + Math.round(Math.sin(x * 1.1) * 2), 0xfff04a);
  }
  for (let r = 0; r < 6; r++) for (let dx = -r; dx <= r; dx++) p.set(24 + dx, 20 + r, 0xfff04a);
  for (let r = 0; r < 5; r++) for (let dx = 0; dx <= r; dx++) p.set(4 + dx, 8 + r, 0x6a5aff);
  for (let k = 0; k < 6; k++) p.set(rand() * S, rand() * S, 0xffffff);
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
  iceWall: { size: 32, seed: 801, paint: paintIceWall },
  frostCobbles: { size: 32, seed: 802, paint: paintFrostCobbles },
  frostPipe: { size: 32, seed: 803, paint: paintFrostPipe },
  icicles: { size: 32, seed: 804, paint: paintIcicles },
  caveRock: { size: 64, seed: 811, paint: paintCaveRock },
  caveFloor: { size: 64, seed: 814, paint: paintCaveFloor },
  glowMoss: { size: 32, seed: 813, paint: paintGlowMoss },
  starfield: { size: 32, seed: 821, paint: paintStarfield },
  rainbowRoad: { size: 32, seed: 822, paint: paintRainbowRoad },
  pomoTiles: { size: 32, seed: 823, paint: paintPomoTiles },
  emberBrick: { size: 32, seed: 831, paint: paintEmberBrick },
  steamVent: { size: 32, seed: 832, paint: paintSteamVent },
  // The Widow (enemies/widowModel.ts): her shell, and the horn of her claws and fangs. Both run ALONG a limb (v).
  widowChitin: { size: 32, seed: 701, paint: paintWidowChitin },
  widowHorn: { size: 32, seed: 702, paint: paintWidowHorn },
  widowBack: { size: 32, seed: 703, paint: paintWidowBack },
  wroughtIron: { size: 32, seed: 601, paint: paintWroughtIron },
  cutStone: { size: 32, seed: 607, paint: paintCutStone },
  charred: { size: 32, seed: 602, paint: paintCharred },
  coals: { size: 32, seed: 603, paint: paintCoals },
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
    const def: Def = DEFS[name];
    const p = new Px(def.size);
    def.paint(p, mulberry32(def.seed));
    px = { size: def.size, data: p.data };
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

/** Large stone blocks for pillars, rubble and platforms. */
export function stoneTexture(): THREE.Texture | null {
  return getTexture('stone');
}

/** Smaller flagstones for the floor. */
export function floorTexture(): THREE.Texture | null {
  return getTexture('floor');
}

/** Brick for the walls. */
export function brickTexture(): THREE.Texture | null {
  return getTexture('brick');
}

/** Murky water with wavy highlight lines. Scrolled every frame for movement. */
export function waterTexture(): THREE.Texture | null {
  return getTexture('water');
}
