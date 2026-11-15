/**
 * A fire bowl on its stand (the level piece 'brazier'): a stone foot, an iron stem with a knuckle in it, a wide iron
 * bowl with a rolled rim, a band and two ring handles, burnt black inside, a bed of coals, and the fire.
 *
 * It stands with its foot on y = 0. What is solid of it is in `BRAZIER` (layout.ts), and custom.ts builds its colliders
 * from the same numbers: the foot and stem as one box, the bowl as another.
 */
import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';
import { BRAZIER } from './layout';

export interface BrazierMats {
  /** Lit, textured: the stone of the foot, the iron, the burnt inside. */
  stone: THREE.Material;
  iron: THREE.Material;
  char: THREE.Material;
  /** Unlit, textured: the coals glow by themselves. */
  coals: THREE.Material;
  /** Unlit, plain: the flames (their colour is in their corners). */
  flame: THREE.Material;
}

/** A shape turned on the lathe from (radius, height) points, with its picture wrapped `around` times. */
function lathe(points: Array<[number, number]>, sides: number, around: number, tint: number, inside = false): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * around);
  if (inside) {
    // Seen from within: the faces are turned to look inward.
    const idx = g.index!;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i);
      idx.setX(i, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    g.computeVertexNormals();
  }
  return bakeVertexColor(g, tint);
}

/** One tongue of flame: a cone, red-orange at its root and pale yellow at its tip. */
function tongue(radius: number, height: number, hot: number): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(radius, height, 6, 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getY(i) / height + 0.5;
    col.set([1, 0.34 + 0.6 * u + hot * 0.1, 0.05 + (0.38 + hot * 0.3) * u * u], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function buildBrazier(mats: BrazierMats): { group: THREE.Group; flames: Array<{ mesh: THREE.Mesh; base: number; phase: number }> } {
  const B = BRAZIER;
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  // ---- The foot: two courses of stone, eight-sided, the lower one wide. This is what gives it its weight. ----
  const foot = new THREE.CylinderGeometry(B.foot * 0.94, B.foot, 0.14, 8, 1);
  add(bakeVertexColor(foot, 0xe6e0d4), mats.stone, 0, 0.07, 0).rotation.y = Math.PI / 8;
  const foot2 = new THREE.CylinderGeometry(0.3, 0.36, 0.1, 8, 1);
  add(bakeVertexColor(foot2, 0xd2ccc0), mats.stone, 0, 0.19, 0).rotation.y = Math.PI / 8;

  // ---- The stem: iron, swelling to a knuckle halfway and opening into a cup under the bowl. ----
  add(lathe([[0.26, 0.24], [0.2, 0.3], [0.1, 0.4], [0.09, 0.46], [0.15, 0.5], [0.15, 0.55], [0.09, 0.6], [0.1, 0.68], [0.2, B.bowlFrom]], 8, 2, 0xffffff), mats.iron);
  // Three scrolled feet from the stem down onto the stone, like a tripod's.
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const leg = new THREE.BoxGeometry(0.07, 0.3, 0.07);
    const m = add(bakeVertexColor(leg, 0xd8d8e0), mats.iron, Math.sin(a) * 0.24, 0.36, Math.cos(a) * 0.24);
    m.rotation.set(Math.cos(a) * 0.75, 0, -Math.sin(a) * 0.75);
    const toe = new THREE.BoxGeometry(0.11, 0.06, 0.11);
    add(bakeVertexColor(toe, 0xc8c8d0), mats.iron, Math.sin(a) * 0.34, 0.26, Math.cos(a) * 0.34).rotation.y = a;
  }

  // ---- The bowl: wide and shallow, with a rolled rim. ----
  add(lathe([[0.2, B.bowlFrom], [0.4, 0.86], [0.56, 0.98], [0.62, 1.09], [B.bowl, 1.11], [B.bowl, B.rim], [0.6, B.rim]], 10, 3, 0xffffff), mats.iron);
  // Burnt black inside, down to the coals.
  add(lathe([[0.6, B.rim], [0.55, 1.08], [0.44, B.coals - 0.02], [0, B.coals - 0.04]], 10, 2, 0xffffff, true), mats.char);
  // A band round its belly, and a ring hanging from a lug at either side.
  const band = new THREE.CylinderGeometry(0.585, 0.545, 0.07, 10, 1, true);
  add(bakeVertexColor(band, 0x9a9aa6), mats.iron, 0, 1.0, 0);
  for (const sx of [-1, 1]) {
    const lug = new THREE.BoxGeometry(0.1, 0.09, 0.09);
    add(bakeVertexColor(lug, 0xb0b0bc), mats.iron, sx * 0.63, 1.04, 0);
    const ring = new THREE.TorusGeometry(0.1, 0.022, 4, 8);
    ring.rotateY(Math.PI / 2);
    add(bakeVertexColor(ring, 0xc8c8d4), mats.iron, sx * 0.69, 0.94, 0).rotation.x = sx * 0.2;
  }

  // ---- The coals: a low heap, and a few lumps standing proud of it. ----
  const heap = new THREE.SphereGeometry(0.46, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  heap.scale(1, 0.2, 1);
  const huv = heap.attributes.uv;
  for (let i = 0; i < huv.count; i++) huv.setXY(i, huv.getX(i) * 2, huv.getY(i) * 2);
  add(bakeVertexColor(heap, 0xffffff, false), mats.coals, 0, B.coals - 0.03, 0);
  for (let k = 0; k < 5; k++) {
    const a = k * 2.4 + 0.5;
    const r = 0.12 + (k % 3) * 0.1;
    const lump = new THREE.BoxGeometry(0.13 + (k % 2) * 0.05, 0.09, 0.11);
    const m = add(bakeVertexColor(lump, 0xffffff, false), mats.coals, Math.sin(a) * r, B.coals + 0.045, Math.cos(a) * r);
    m.rotation.set(0.3 * Math.sin(k * 1.7), a, 0.25 * Math.cos(k * 2.3));
  }

  // ---- The fire: a tall tongue, a paler one inside it, and two smaller ones licking up beside. ----
  const flames: Array<{ mesh: THREE.Mesh; base: number; phase: number }> = [];
  const fire = (radius: number, height: number, hot: number, x: number, z: number, phase: number): void => {
    const base = B.coals + height / 2 - 0.02;
    flames.push({ mesh: add(tongue(radius, height, hot), mats.flame, x, base, z), base, phase });
  };
  fire(0.34, 1.0, 0, 0, 0, 0);
  fire(0.18, 0.66, 1, 0.02, 0.03, 1.9);
  fire(0.17, 0.52, 0.3, -0.2, 0.12, 3.3);
  fire(0.15, 0.44, 0.3, 0.19, -0.14, 5.1);
  return { group, flames };
}
