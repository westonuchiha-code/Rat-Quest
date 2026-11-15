/**
 * A fire bowl on its stand (the level piece 'brazier'): a wide stone foot, a plain iron stem with one knuckle in it, a
 * wide iron bowl with a rolled rim, burnt black inside, a bed of coals, and the fire.
 *
 * (It was first made with a great deal more on it: a tripod of scrolled feet, a band, ring handles. The owner:
 * "almost too much ... something in between, a little less detailed with a nice texture like everything else in the
 * game". So it is a few plain shapes, and the pictures on them do the work.)
 *
 * It stands with its foot on y = 0. What is solid of it is in `BRAZIER` (layout.ts), and custom.ts builds its colliders
 * from the same numbers: the foot and stem as one box, the bowl as another.
 */
import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';
import { BRAZIER } from './layout';

export interface BrazierMats {
  /** Lit, textured: the stone of the foot, the iron, the burnt inside (drawn on both its faces). */
  stone: THREE.Material;
  iron: THREE.Material;
  char: THREE.Material;
  /** Unlit, textured: the coals glow by themselves. */
  coals: THREE.Material;
  /** Unlit, plain: the flames (their colour is in their corners). */
  flame: THREE.Material;
}

/** A shape turned on the lathe from (radius, height) points, with its picture wrapped `around` times. */
function lathe(points: Array<[number, number]>, sides: number, around: number, tint: number): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * around);
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

  // ---- The foot: one course of stone, eight-sided and wide. This is what gives it its weight. ----
  // (One block of dressed stone, its picture wrapped once round its eight sides: no joints. The room's own stone, a
  // wall of blocks and mortar, made it look like a piece of the floor.)
  const foot = new THREE.CylinderGeometry(B.foot * 0.92, B.foot, 0.14, 8, 1);
  const fuv = foot.attributes.uv;
  const fn = foot.attributes.normal;
  for (let i = 0; i < fuv.count; i++) {
    // Its top and its underside take the plain middle of the picture, clear of the worked edges.
    if (Math.abs(fn.getY(i)) > 0.5) fuv.setXY(i, 0.2 + fuv.getX(i) * 0.6, 0.25 + fuv.getY(i) * 0.5);
    else fuv.setX(i, fuv.getX(i) * 4);
  }
  add(bakeVertexColor(foot, 0xf2ece0), mats.stone, 0, 0.07, 0).rotation.y = Math.PI / 8;

  // ---- The stem: plain iron, with one knuckle in it, opening into a cup under the bowl. ----
  add(lathe([[0.24, 0.14], [0.13, 0.24], [0.1, 0.48], [0.15, 0.54], [0.1, 0.6], [0.2, B.bowlFrom]], 8, 2, 0xffffff), mats.iron);

  // ---- The bowl: wide and shallow, with a rolled rim. ----
  add(lathe([[0.2, B.bowlFrom], [0.46, 0.9], [0.62, 1.08], [B.bowl, 1.12], [B.bowl, B.rim], [0.6, B.rim]], 10, 3, 0xffffff), mats.iron);
  // Burnt black inside, down to the coals. (Its picture is on both faces: it is a bowl, and must not be seen through.)
  add(lathe([[0.6, B.rim], [0.53, 1.07], [0.42, B.coals - 0.02], [0, B.coals - 0.05]], 10, 2, 0xffffff), mats.char);

  // ---- The coals: a low heap, and three lumps standing proud of it. ----
  const heap = new THREE.SphereGeometry(0.46, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  heap.scale(1, 0.2, 1);
  const huv = heap.attributes.uv;
  for (let i = 0; i < huv.count; i++) huv.setXY(i, huv.getX(i) * 2, huv.getY(i) * 2);
  add(bakeVertexColor(heap, 0xffffff, false), mats.coals, 0, B.coals - 0.03, 0);
  for (let k = 0; k < 3; k++) {
    const a = k * 2.2 + 0.5;
    const lump = new THREE.BoxGeometry(0.15, 0.09, 0.12);
    const m = add(bakeVertexColor(lump, 0xffffff, false), mats.coals, Math.sin(a) * 0.24, B.coals + 0.04, Math.cos(a) * 0.24);
    m.rotation.set(0.3 * Math.sin(k * 1.7), a, 0.25 * Math.cos(k * 2.3));
  }

  // ---- The fire: a tall tongue, a paler one inside it, and a smaller one licking up beside. ----
  const flames: Array<{ mesh: THREE.Mesh; base: number; phase: number }> = [];
  const fire = (radius: number, height: number, hot: number, x: number, z: number, phase: number): void => {
    const base = B.coals + height / 2 - 0.02;
    flames.push({ mesh: add(tongue(radius, height, hot), mats.flame, x, base, z), base, phase });
  };
  fire(0.34, 1.0, 0, 0, 0, 0);
  fire(0.18, 0.66, 1, 0.02, 0.03, 1.9);
  fire(0.16, 0.5, 0.3, -0.18, 0.12, 3.3);
  return { group, flames };
}
