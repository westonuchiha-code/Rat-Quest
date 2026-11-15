/**
 * Painted boards with writing on them, and rulers: what a test room is labelled with. A board is wood with pale
 * letters, like the signs over the Club's doors; a ruler is a pale strip with a tick and a number at every unit.
 * Both are only drawn: nothing collides with them.
 *
 * (Where there is no page to draw on, as in the tests, the board is plain wood and the ruler a plain strip.)
 */
import * as THREE from 'three';

const PX = 48; // dots to a unit: the writing stays as blocky as the rest of the game
const SIGN_PX = 64; // (boards have small writing on them: a few more)

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

/** A wooden board `w` wide and `h` high with up to three lines on it: the first is the big one. It faces +z. */
export function signBoard(lines: string[], w: number, h: number): THREE.Mesh {
  const map = texture(w * SIGN_PX, h * SIGN_PX, (c) => {
    const W = c.canvas.width;
    const H = c.canvas.height;
    c.fillStyle = '#3a2412';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#8a5e32';
    c.fillRect(3, 3, W - 6, H - 6);
    c.fillStyle = '#7c5228';
    for (let y = 14; y < H - 4; y += 14) c.fillRect(3, y, W - 6, 2);
    c.fillStyle = '#2a1a0c';
    for (const [x, y] of [[7, 7], [W - 11, 7], [7, H - 11], [W - 11, H - 11]]) c.fillRect(x, y, 4, 4);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeStyle = '#24140a';
    c.lineWidth = 4;
    c.lineJoin = 'round';
    const shown = lines.slice(0, 3);
    // The first line takes about half the board; the rest share what is left.
    const big = Math.min(H * (shown.length > 2 ? 0.36 : shown.length > 1 ? 0.44 : 0.66), 64);
    const small = shown.length > 1 ? Math.min((H - big - 16) / (shown.length - 1) - 3, 34) : 0;
    let y = shown.length > 1 ? 8 + big / 2 : H / 2;
    shown.forEach((line, i) => {
      let size = i === 0 ? big : small;
      c.font = `bold ${Math.round(size)}px monospace`;
      // A line too long for the board is written smaller, never cut off.
      const wide = c.measureText(line).width;
      if (wide > W - 16) {
        size *= (W - 16) / wide;
        c.font = `bold ${Math.round(size)}px monospace`;
      }
      c.fillStyle = i === 0 ? '#fff0c0' : '#ecd9b4';
      c.strokeText(line, W / 2, y);
      c.fillText(line, W / 2, y);
      y += i === 0 ? big / 2 + small / 2 + 5 : small + 3;
    });
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), material(map, 0x8a5e32, false));
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
