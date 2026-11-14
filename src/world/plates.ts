import * as THREE from 'three';

/**
 * A floor button: a pad in a dark frame. Stood on, the pad drops down inside the frame and stays there.
 *
 * The frame is a ring round the pad, not a slab under it. (It was a slab, and a pressed pad dropped to exactly the
 * slab's height: two faces in one plane, flickering through each other in a triangle.) So the pad can sit at any
 * height and never shares a plane with anything: up, it stands proud of the frame; down, it is sunk below the
 * frame's top and still above the floor.
 */
export const PLATE = {
  pad: 1.5,
  frame: 1.8,
  /** Heights above the floor: the frame's top, and the pad's top up and down. */
  frameTop: 0.08,
  padUp: 0.13,
  padDown: 0.04,
  padThick: 0.12,
};

const padMat = new THREE.MeshBasicMaterial({ color: 0xd8a83a });
const padDownMat = new THREE.MeshBasicMaterial({ color: 0x6a5a2a });
const frameMat = new THREE.MeshBasicMaterial({ color: 0x2a2418 });

/** The two meshes of a button on the floor at (x, y, z): its pad, then its frame. */
export function buildPlate(x: number, y: number, z: number): [THREE.Mesh, THREE.Mesh] {
  const P = PLATE;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(P.pad, P.padThick, P.pad), padMat);
  pad.position.set(x, y + P.padUp - P.padThick / 2, z);
  // The frame: four bars round the pad.
  const w = (P.frame - P.pad) / 2;
  const off = (P.frame - w) / 2;
  const bars: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    bars.push(new THREE.BoxGeometry(P.frame, P.frameTop, w).translate(0, 0, s * off));
    bars.push(new THREE.BoxGeometry(w, P.frameTop, P.pad).translate(s * off, 0, 0));
  }
  const pos: number[] = [];
  const idx: number[] = [];
  for (const b of bars) {
    const base = pos.length / 3;
    pos.push(...(b.attributes.position.array as Float32Array));
    for (const i of b.index!.array as Uint16Array) idx.push(i + base);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const frame = new THREE.Mesh(geo, frameMat);
  frame.position.set(x, y + P.frameTop / 2, z);
  return [pad, frame];
}

/** Presses a button's pad down (the floor is at `y`). */
export function pressPlate(pad: THREE.Mesh, y: number): void {
  pad.material = padDownMat;
  pad.position.y = y + PLATE.padDown - PLATE.padThick / 2;
}
