/**
 * The faded portrait in Web Hollow, painted into one small picture instead of a stack of overlapping flat shapes.
 * Layers of flat shapes a few millimetres apart fought each other in the depth buffer (the picture flickered and parts of it
 * vanished into the wall); one flat picture cannot.
 */
import * as THREE from 'three';

const W = 80;
const H = 100;
/** The frame's size in units of the picture's `size`: 1.24 wide, 1.54 tall. */
export const PORTRAIT_ASPECT = { w: 1.24, h: 1.54 };

let cached: THREE.DataTexture | null = null;

export function portraitTexture(): THREE.DataTexture {
  if (cached) return cached;
  const data = new Uint8Array(W * H * 4);
  type Shape = (x: number, y: number) => boolean;
  const rect = (cx: number, cy: number, hw: number, hh: number): Shape => (x, y) => Math.abs(x - cx) <= hw && Math.abs(y - cy) <= hh;
  const disc = (cx: number, cy: number, r: number): Shape => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const lowerDisc = (cx: number, cy: number, r: number): Shape => (x, y) => y <= cy && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  const spike = (cx: number, cy: number, hw: number, top: number, bottom: number): Shape => (x, y) => {
    if (y > cy + top || y < cy + bottom) return false;
    const k = (cy + top - y) / (top - bottom);
    return Math.abs(x - cx) <= hw * k;
  };
  const layers: Array<[number, Shape]> = [
    [0x5a4424, rect(0, 0, 0.62, 0.77)], // the frame
    [0x8a6a34, rect(0, 0, 0.56, 0.71)], // its gilt edge
    [0x1c1626, rect(0, 0, 0.5, 0.65)], // the canvas
    [0x0e0a14, lowerDisc(0, -0.2, 0.46)], // the cowl at his shoulders
    [0x5a4d6a, disc(0, 0.05, 0.27)], // the head
  ];
  for (const sx of [-1, 1]) {
    layers.push([0x5a4d6a, disc(sx * 0.26, 0.3, 0.15)], [0x6e3a52, disc(sx * 0.26, 0.3, 0.09)], [0xb04a30, disc(sx * 0.1, 0.09, 0.04)]); // ears, eyes faded from red
  }
  layers.push([0x2a1020, disc(0, -0.08, 0.035)]); // the nose
  layers.push([0x4a4650, rect(0, 0.31, 0.2, 0.025)]); // the crown's band
  for (const sx of [-1, 0, 1]) layers.push([0x4a4650, spike(sx * 0.14, 0.38, 0.05, sx === 0 ? 0.13 : 0.1, -0.065)]);
  // Row 0 is the bottom of the picture.
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = ((i + 0.5) / W - 0.5) * PORTRAIT_ASPECT.w;
      const y = ((j + 0.5) / H - 0.5) * PORTRAIT_ASPECT.h;
      let col = 0x5a4424;
      for (const [c, inside] of layers) if (inside(x, y)) col = c;
      const o = (j * W + i) * 4;
      data[o] = (col >> 16) & 255;
      data[o + 1] = (col >> 8) & 255;
      data[o + 2] = col & 255;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
