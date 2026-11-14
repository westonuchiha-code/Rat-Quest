import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { TEXTURE_NAMES as ALL_NAMES, getTexturePixels } from '../src/render/textures';

const CRC = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}
function encodePng(w: number, h: number, rgba: Uint8Array): Buffer {
  const raw = new Uint8Array((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))];
  return Buffer.concat(parts);
}

// Optional debugging: TEX_FOCUS=name1,name2 renders only those, larger, to /tmp/texture-focus.png.
const focus = process.env.TEX_FOCUS ? process.env.TEX_FOCUS.split(',') : null;
const TEXTURE_NAMES = focus ? ALL_NAMES.filter((n) => focus.includes(n)) : ALL_NAMES;
const CELL = focus ? 384 : 192;
const COLS = focus ? 3 : 6;
const rows = Math.ceil(TEXTURE_NAMES.length / COLS);
const W = COLS * CELL;
const H = rows * CELL;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < img.length; i += 4) {
  img[i] = 255;
  img[i + 1] = 0;
  img[i + 2] = 255;
  img[i + 3] = 255;
}

const seamReports: string[] = [];
TEXTURE_NAMES.forEach((name, idx) => {
  const { size, data } = getTexturePixels(name);
  const ox = (idx % COLS) * CELL;
  const oy = Math.floor(idx / COLS) * CELL;
  const scale = CELL / (size * 2);
  for (let y = 0; y < CELL; y++)
    for (let x = 0; x < CELL; x++) {
      const sx = Math.floor(x / scale) % size;
      const sy = Math.floor(y / scale) % size;
      const si = (sy * size + sx) * 4;
      const di = ((oy + y) * W + ox + x) * 4;
      img[di] = data[si];
      img[di + 1] = data[si + 1];
      img[di + 2] = data[si + 2];
    }
  // Seam check.
  const px = (x: number, y: number): number[] => {
    const i = (y * size + x) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const diff = (a: number[], b: number[]): number => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  // Mean difference across every neighbouring column pair / row pair, and across the wrap seam.
  const colPair: number[] = new Array(size).fill(0); // [size-1] is the seam
  const rowPair: number[] = new Array(size).fill(0);
  for (let a = 0; a < size; a++) {
    for (let b = 0; b < size; b++) {
      colPair[b] += diff(px(b, a), px((b + 1) % size, a)) / size;
      rowPair[b] += diff(px(a, b), px(a, (b + 1) % size)) / size;
    }
  }
  const mean = (arr: number[]): number => arr.slice(0, size - 1).reduce((s, v) => s + v, 0) / (size - 1);
  const inH = mean(colPair);
  const inV = mean(rowPair);
  const seamH = colPair[size - 1];
  const seamV = rowPair[size - 1];
  // Flag only if the seam is harsher than the harshest interior line (mortar, cracks) as well as the average.
  const rH = seamH / (inH || 1);
  const rV = seamV / (inV || 1);
  const maxH = Math.max(...colPair.slice(0, size - 1));
  const maxV = Math.max(...rowPair.slice(0, size - 1));
  if ((rH > 1.6 && seamH > maxH * 1.6) || (rV > 1.6 && seamV > maxV * 1.6)) seamReports.push(`${name}: horizontal seam ${seamH.toFixed(1)} vs interior ${inH.toFixed(1)} (x${rH.toFixed(2)}), vertical seam ${seamV.toFixed(1)} vs interior ${inV.toFixed(1)} (x${rV.toFixed(2)})`);
});

writeFileSync(focus ? '/tmp/texture-focus.png' : '/home/claude/ratquest/texture-sheet.png', encodePng(W, H, img));
console.log(`texture-sheet.png ${W}x${H}, ${COLS} columns`);
for (let r = 0; r < rows; r++) console.log(`row ${r + 1}: ` + TEXTURE_NAMES.slice(r * COLS, r * COLS + COLS).join(', '));
console.log(seamReports.length ? 'SEAM WARNINGS:\n' + seamReports.join('\n') : 'seam check: all textures OK');
