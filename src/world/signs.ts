/**
 * Painted boards with writing on them, and rulers: what a test room is labelled with. A board is wood with pale
 * letters, like the signs over the Club's doors; a ruler is a pale strip with a tick and a number at every unit.
 * Both are only drawn: nothing collides with them.
 *
 * (A board is written in the block letters of render/pixelFont.ts, a dot of a letter a dot of the board. Where there
 * is no page to draw on, as in the tests, the ruler is a plain strip.)
 */
import * as THREE from 'three';
import { GLYPH_H, drawText, textWidth } from '../render/pixelFont';

const PX = 48; // dots to a unit: the writing stays as blocky as the rest of the game

function texture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = Math.max(8, Math.round(w));
  cv.height = Math.max(8, Math.round(h));
  const c = cv.getContext('2d');
  if (!c) return null;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function material(map: THREE.CanvasTexture | null, plain: number, bothSides: boolean): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial(map ? { map, side: bothSides ? THREE.DoubleSide : THREE.FrontSide } : { color: plain, side: bothSides ? THREE.DoubleSide : THREE.FrontSide });
  // (The level's meshes are thrown away material by material: the picture goes with its material.)
  if (map) m.addEventListener('dispose', () => map.dispose());
  return m;
}

/** A board's own colours. */
const B_EDGE = [0x3a, 0x24, 0x12];
const B_WOOD = [0x8a, 0x5e, 0x32];
const B_GRAIN = [0x7c, 0x52, 0x28];
const B_NAIL = [0x2a, 0x1a, 0x0c];
const B_SHADOW = [0x24, 0x14, 0x0a];
const B_FIRST = [0xff, 0xf0, 0xc0];
const B_REST = [0xec, 0xd9, 0xb4];
/** Dots between a board's edge and its writing, and between its lines. */
const B_MARGIN = 5;
const B_GAP = 4;

/**
 * A board's picture, in the block letters of render/pixelFont.ts: up to three lines, the first written twice the
 * size where there is room for that. `w` and `h` are the board's size in the room; the picture has as many dots as
 * its writing needs and the board's own shape, so a dot of a letter is a square dot of the board.
 * (The owner, 2026-11-16, of the door signs: "text on signs in game are unreadable": smooth lettering shrunk to a few
 * dots. Those were moved to block letters then; these boards, the garden's and every test room's, now are too.)
 * Its top row first; four numbers a dot. `big`: how many times its own size the first line is written (1 or 2).
 */
export function boardPixels(lines: string[], w: number, h: number): { w: number; h: number; data: Uint8Array; big: number; lines: string[] } {
  const shown = lines.slice(0, 3).map((l) => l.toUpperCase());
  const rest = shown.slice(1);
  const need = (big: number): { wide: number; high: number } => ({
    wide: Math.max(textWidth(shown[0] ?? '') * big, ...rest.map((l) => textWidth(l)), 1) + B_MARGIN * 2,
    high: GLYPH_H * big + rest.length * (GLYPH_H + B_GAP) + B_MARGIN * 2,
  });
  // The board's shape decides how many dots there are: enough both ways for the writing. The first line is written
  // double if that costs the board less than half as many dots again (a long first line on a narrow board stays single).
  const dots = (big: number): { W: number; H: number } => {
    const n = need(big);
    const W = Math.max(n.wide, Math.ceil((n.high * w) / h));
    return { W, H: Math.max(n.high, Math.round((W * h) / w)) };
  };
  const one = dots(1);
  const two = dots(2);
  const big = two.W <= one.W * 1.5 ? 2 : 1;
  const { W, H } = big === 2 ? two : one;
  const data = new Uint8Array(W * H * 4);
  const put = (x: number, y: number, c: number[]): void => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    data.set([c[0], c[1], c[2], 255], (y * W + x) * 4);
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) put(x, y, x < 1 || y < 1 || x >= W - 1 || y >= H - 1 ? B_EDGE : y % 7 === 4 ? B_GRAIN : B_WOOD);
  for (const [x, y] of [[2, 2], [W - 3, 2], [2, H - 3], [W - 3, H - 3]]) put(x, y, B_NAIL);
  /** A line, centred, `k` times its size, with a dark dot under and to the right of every dot of it. */
  const write = (text: string, y: number, k: number, c: number[]): void => {
    const x0 = Math.round((W - textWidth(text) * k) / 2);
    const block = (px: number, py: number, col: number[], off: number): void => {
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) put(x0 + px * k + dx + off, y + py * k + dy + off, col);
    };
    drawText(text, 0, 0, (px, py) => block(px, py, B_SHADOW, 1));
    drawText(text, 0, 0, (px, py) => block(px, py, c, 0));
  };
  // (Its lines are spread down the board: what the writing leaves over is shared out above, between and below.)
  const used = GLYPH_H * big + rest.length * GLYPH_H;
  const gap = Math.floor((H - used) / (shown.length + 1));
  let y = gap;
  shown.forEach((line, i) => {
    write(line, y, i === 0 ? big : 1, i === 0 ? B_FIRST : B_REST);
    y += (i === 0 ? GLYPH_H * big : GLYPH_H) + gap;
  });
  return { w: W, h: H, data, big, lines: shown };
}

/** A wooden board `w` wide and `h` high with up to three lines on it, in block letters: the first is the big one. It faces +z. */
export function signBoard(lines: string[], w: number, h: number): THREE.Mesh {
  const px = boardPixels(lines, w, h);
  // (A picture's first row is its bottom one, to the card.)
  const flipped = new Uint8Array(px.data.length);
  for (let y = 0; y < px.h; y++) flipped.set(px.data.subarray(y * px.w * 4, (y + 1) * px.w * 4), (px.h - 1 - y) * px.w * 4);
  const map = new THREE.DataTexture(flipped, px.w, px.h, THREE.RGBAFormat);
  map.magFilter = THREE.NearestFilter;
  map.minFilter = THREE.NearestFilter;
  map.generateMipmaps = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const m = new THREE.MeshBasicMaterial({ map });
  m.addEventListener('dispose', () => map.dispose());
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

/**
 * A ruler `length` units long and `width` wide: a tick at every unit and every half, a number at every unit (the
 * number sits just under its own tick, so the tick is the height). Standing, it faces +z with its zero at the bottom
 * (the plane's own bottom edge); `flat` gives the same strip to be laid on a floor, zero at the near end.
 */
export function rulerStrip(length: number, width: number, bothSides = false): THREE.Mesh {
  const n = Math.max(1, Math.round(length));
  const map = texture(width * PX, n * PX, (c) => {
    const W = c.canvas.width;
    const H = c.canvas.height;
    c.fillStyle = '#d9cfa8';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#b8ad84';
    c.fillRect(0, 0, 3, H);
    c.fillRect(W - 3, 0, 3, H);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.font = `bold ${Math.round(Math.min(26, W * 0.5))}px monospace`;
    for (let u = 0; u <= n; u++) {
      const y = H - u * PX; // the canvas runs downward; the ruler upward
      // Every fifth unit is marked in red, the rest in black.
      c.fillStyle = u % 5 === 0 ? '#a01c10' : '#1c1a14';
      c.fillRect(0, Math.max(0, Math.min(H - 3, y - 1)), W, 3);
      if (u > 0) c.fillText(String(u), W / 2, y + 5);
      if (u < n) {
        c.fillStyle = '#5a5440';
        c.fillRect(0, y - PX / 2 - 1, W * 0.3, 2);
        c.fillRect(W * 0.7, y - PX / 2 - 1, W * 0.3, 2);
      }
    }
  });
  const g = new THREE.PlaneGeometry(width, n);
  g.translate(0, n / 2, 0); // its zero is its own bottom edge
  return new THREE.Mesh(g, material(map, 0xd9cfa8, bothSides));
}
