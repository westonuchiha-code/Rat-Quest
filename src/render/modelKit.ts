import * as THREE from 'three';

/**
 * Small helpers for building the low-poly creatures: every part is a painted shape (colour per vertex, no textures).
 * A colour can be one number, or a function of where the vertex sits on the shape: (nx, ny, nz), each from -1 to 1
 * across the shape's own bounding box (so ny = 1 is its top and nz = 1 its front).
 */
export type ColorAt = number | ((nx: number, ny: number, nz: number) => number);

const tmp = new THREE.Color();

/**
 * Paints a shape. `shade` darkens it towards its underside (0 = none), which reads as soft shadow and gives a round
 * shape weight without any real lighting.
 */
export function paint(geo: THREE.BufferGeometry, color: ColorAt, shade = 0): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const bb = geo.boundingBox as THREE.Box3;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  const hx = Math.max(1e-6, (bb.max.x - bb.min.x) / 2);
  const hy = Math.max(1e-6, (bb.max.y - bb.min.y) / 2);
  const hz = Math.max(1e-6, (bb.max.z - bb.min.z) / 2);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const nx = (pos.getX(i) - cx) / hx;
    const ny = (pos.getY(i) - cy) / hy;
    const nz = (pos.getZ(i) - cz) / hz;
    tmp.set(typeof color === 'number' ? color : color(nx, ny, nz));
    const k = 1 - shade * (0.5 - 0.5 * ny);
    cols.set([tmp.r * k, tmp.g * k, tmp.b * k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

/** Mixes two colours (k = 0 gives a, 1 gives b). */
export function mix(a: number, b: number, k: number): number {
  return new THREE.Color(a).lerp(new THREE.Color(b), Math.min(1, Math.max(0, k))).getHex();
}

/** A set of builders that all use one material. */
export function modelKit(mat: THREE.Material) {
  /** A stretched ball. */
  const blob = (sx: number, sy: number, sz: number, color: ColorAt, x: number, y: number, z: number, w = 8, h = 6, shade = 0.22): THREE.Mesh => {
    const geo = new THREE.SphereGeometry(1, w, h);
    geo.scale(sx, sy, sz);
    const m = new THREE.Mesh(paint(geo, color, shade), mat);
    m.position.set(x, y, z);
    return m;
  };
  /** A tapered piece running from the origin along +X. */
  const spar = (r0: number, r1: number, length: number, color: ColorAt, sides = 5): THREE.Mesh => {
    const geo = new THREE.CylinderGeometry(r1, r0, length, sides, 1);
    geo.translate(0, length / 2, 0);
    geo.rotateZ(-Math.PI / 2);
    return new THREE.Mesh(paint(geo, color), mat);
  };
  /** A spike standing on the origin, pointing up +Y. */
  const cone = (r: number, height: number, color: ColorAt, sides = 5): THREE.Mesh => {
    const geo = new THREE.ConeGeometry(r, height, sides);
    geo.translate(0, height / 2, 0);
    return new THREE.Mesh(paint(geo, color), mat);
  };
  const box = (w: number, h: number, d: number, color: ColorAt, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(paint(new THREE.BoxGeometry(w, h, d), color), mat);
    m.position.set(x, y, z);
    return m;
  };
  return { blob, spar, cone, box };
}

/** A small unlit ball (eyes, pupils, glints). */
export function bead(r: number, material: THREE.Material, x: number, y: number, z: number, w = 6, h = 5): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), material);
  m.position.set(x, y, z);
  return m;
}
