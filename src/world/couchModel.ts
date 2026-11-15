/**
 * The Club's couch (the level piece 'couch'): an old one, out of the sewer, and the best seat in the house.
 *
 * Two fat seat cushions on a low frame, two back cushions, rolled arms, a pillow, and a knitted blanket thrown over
 * one arm: that is the cosy of it. The cloth is faded and stained; there is a patch sewn on one seat, a rip in the
 * back with the stuffing coming out of it and another on an arm; one foot is a brick.
 *
 * It faces +z, its middle on x = 0, its feet on y = 0. What is solid of it is in `COUCH` (layout.ts), and custom.ts
 * builds its colliders from the same numbers: the seat between the arms, the back, the arms, and the pillow.
 */
import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';
import { COUCH } from './layout';

export interface CouchMats {
  /** Lit by the room, textured: its cloth, the patch, the blanket. */
  cloth: THREE.Material;
  patch: THREE.Material;
  blanket: THREE.Material;
  /** Plain colour (the stuffing, the feet, the dark of a rip). */
  plain: THREE.Material;
}

/** Texture coordinates from where each corner is, so the cloth's weave is the same size on every face. */
function clothUvs(geo: THREE.BufferGeometry, tile: number, ox = 0, oy = 0): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i)), ny = Math.abs(nrm.getY(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    uv[i * 2] = ((ny > 0.5 ? x : nx > 0.5 ? z : x) + ox) / tile;
    uv[i * 2 + 1] = ((ny > 0.5 ? z : y) + oy) / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** A cushion: a box whose top is drawn in a little all round, so it looks stuffed and not sawn. */
function cushion(w: number, h: number, d: number, pinch: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, 2, 1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) <= 0) continue;
    // The corners of the top are pulled in and down; its middle stays where it is (that is the height of the seat).
    const ex = Math.abs(p.getX(i)) > w / 2 - 1e-6, ez = Math.abs(p.getZ(i)) > d / 2 - 1e-6;
    if (ex) p.setX(i, p.getX(i) * (1 - pinch / w));
    if (ez) p.setZ(i, p.getZ(i) * (1 - pinch / d));
    if (ex || ez) p.setY(i, p.getY(i) - pinch * 0.45);
  }
  g.computeVertexNormals();
  return g;
}

export function buildCouch(mats: CouchMats): THREE.Group {
  const C = COUCH;
  const group = new THREE.Group();
  const TILE = 1.3; // the cloth's picture covers this much of the couch
  const add = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };
  const cloth = (name: string, geo: THREE.BufferGeometry, x: number, y: number, z: number, tint: number, ox = 0, oy = 0): THREE.Mesh =>
    add(name, bakeVertexColor(clothUvs(geo, TILE, x + ox, y + oy), tint), mats.cloth, x, y, z);

  const seatZ = (C.seatBack + C.front) / 2;
  const seatD = C.front - C.seatBack;
  const inner = C.armIn; // half the width between the arms

  // ---- The frame under the cushions: a dark skirt of the same cloth, on four feet (one of them a brick) ----
  cloth('frame', new THREE.BoxGeometry(C.half * 2, 0.27, C.front - C.back), 0, 0.31, (C.back + C.front) / 2, 0x8a7a70);
  for (const [fx, fz, brick] of [[-1.1, 0.42, 0], [1.1, 0.42, 1], [-1.1, -0.45, 0], [1.1, -0.45, 0]] as Array<[number, number, number]>) {
    const foot = brick ? new THREE.BoxGeometry(0.3, 0.175, 0.2) : new THREE.CylinderGeometry(0.07, 0.09, 0.175, 6, 1);
    add('foot', bakeVertexColor(foot, brick ? 0x8a4030 : 0x3a2a20), mats.plain, fx, 0.0875, fz);
  }

  // ---- Two seat cushions, side by side; their tops are the seat ----
  for (const sx of [-1, 1]) {
    const w = inner - 0.012;
    cloth('seat', cushion(w, C.seat - 0.44, seatD - 0.01, 0.07), sx * (inner / 2), (C.seat + 0.44) / 2, seatZ, sx < 0 ? 0xffffff : 0xf2ece6, sx * 0.4, 0.3);
  }

  // ---- The back: its frame, and two cushions leaning on it ----
  cloth('back', new THREE.BoxGeometry(C.half * 2, C.backTop - 0.44, C.seatBack - C.back), 0, (C.backTop + 0.44) / 2, (C.back + C.seatBack) / 2, 0xd8d0c8, 0.7, 0);
  for (const sx of [-1, 1]) {
    const m = cloth('backCushion', cushion(inner - 0.03, 0.62, 0.07, 0.04), sx * (inner / 2), C.seat + 0.34, C.seatBack + 0.02, sx < 0 ? 0xf6f0ea : 0xffffff, sx * 0.9, 0.55);
    m.rotation.x = -0.1;
  }

  // ---- The arms: an upright with a roll along its top, and the round end of the roll facing the room ----
  for (const sx of [-1, 1]) {
    const w = C.armOut - C.armIn;
    const x = sx * (C.armIn + C.armOut) / 2;
    const r = w / 2;
    cloth('arm', new THREE.BoxGeometry(w, C.armTop - r - 0.2, seatD + 0.3), x, (C.armTop - r + 0.2) / 2, seatZ - 0.15, 0xe6dfd8, 0.2, 0);
    const roll = new THREE.CylinderGeometry(r, r, seatD + 0.34, 8, 1);
    roll.rotateX(Math.PI / 2);
    cloth('arm', roll, x, C.armTop - r, seatZ - 0.15, 0xf4eee8, 0.5, 0.2);
  }

  // ---- Piping: a paler cord along the front of each seat cushion, along the top of the back, and round its back ----
  const cord = (w: number, d: number, x: number, y: number, z: number): THREE.Mesh => add('piping', bakeVertexColor(new THREE.BoxGeometry(w, 0.03, d), 0xc08a62), mats.plain, x, y, z);
  for (const sx of [-1, 1]) cord(inner - 0.1, 0.03, sx * (inner / 2), C.seat - 0.05, C.front - 0.012);
  cord(C.half * 2 - 0.04, 0.03, 0, C.backTop - 0.03, C.seatBack - 0.012);
  cord(C.half * 2 - 0.04, 0.03, 0, C.backTop - 0.03, C.back + 0.012);
  cord(C.half * 2 - 0.04, 0.03, 0, 0.5, C.back - 0.004);
  // The back of it (what is seen from across the room): a second patch, and a long rip sewn up with big stitches.
  const backPatch = add('patch', bakeVertexColor(new THREE.PlaneGeometry(0.42, 0.3), 0xf0f0f0, false), mats.patch, 0.62, 0.98, C.back - 0.004);
  backPatch.rotation.set(0, Math.PI, -0.12);
  const scar = add('rip', bakeVertexColor(new THREE.PlaneGeometry(0.5, 0.03), 0x1a0e0a, false), mats.plain, -0.5, 0.9, C.back - 0.004);
  scar.rotation.set(0, Math.PI, 0.2);
  for (let k = 0; k < 5; k++) {
    const st = add('stitch', bakeVertexColor(new THREE.PlaneGeometry(0.02, 0.1), 0xe8dcb0, false), mats.plain, -0.5 + (k - 2) * 0.1, 0.9 - (k - 2) * 0.02, C.back - 0.006);
    st.rotation.set(0, Math.PI, 0.2 + (k % 2 ? 0.5 : -0.4));
  }

  // ---- A patch sewn on the right-hand seat cushion's front, a little crooked ----
  const patch = new THREE.PlaneGeometry(0.34, 0.2);
  const pm = add('patch', bakeVertexColor(patch, 0xffffff, false), mats.patch, 0.52, 0.57, C.front + 0.004);
  pm.rotation.z = 0.09;

  // ---- Rips: a dark slit with the stuffing coming out of it. One in the left back cushion, one on the right arm. ----
  const rip = (x: number, y: number, z: number, len: number, lean: number, faceX: boolean): void => {
    const slit = new THREE.PlaneGeometry(0.045, len);
    const sm = add('rip', bakeVertexColor(slit, 0x160c0a, false), mats.plain, x, y, z);
    if (faceX) sm.rotation.y = Math.PI / 2 * Math.sign(x);
    sm.rotation.z = lean;
    for (let k = 0; k < 3; k++) {
      const puff = new THREE.SphereGeometry(0.028 + (k % 2) * 0.008, 5, 4);
      const off = (k - 1) * len * 0.26;
      const out = 0.012 + (k % 2) * 0.008;
      add('stuffing', bakeVertexColor(puff, 0xe8e0cc), mats.plain, x + (faceX ? Math.sign(x) * out : -Math.sin(lean) * off), y + Math.cos(lean) * off, z + (faceX ? Math.sin(lean) * off : out));
    }
  };
  rip(-0.58, C.seat + 0.42, C.seatBack + 0.062, 0.24, 0.5, false);
  rip(C.armOut + 0.004, 0.52, 0.22, 0.17, -0.3, true);

  // ---- The pillow on the right-hand seat (it is solid: he stands on it) ----
  const P = C.pillow;
  const pillow = cushion(P.x1 - P.x0, P.top - C.seat, P.z1 - P.z0, 0.05);
  // (In somebody's old plaid, like the patch: nothing on this couch matches.)
  add('pillow', bakeVertexColor(clothUvs(pillow, 0.42), 0xfff2d8), mats.patch, (P.x0 + P.x1) / 2, (C.seat + P.top) / 2, (P.z0 + P.z1) / 2);

  // ---- A knitted blanket thrown over the left arm: across its top, down its outside, and a fold onto the seat ----
  const ax = -(C.armIn + C.armOut) / 2;
  const aw = C.armOut - C.armIn;
  const knit = (geo: THREE.BufferGeometry, x: number, y: number, z: number, tint: number): THREE.Mesh => add('blanket', bakeVertexColor(clothUvs(geo, 0.55, x, y), tint), mats.blanket, x, y, z);
  const over = new THREE.CylinderGeometry(aw / 2 + 0.02, aw / 2 + 0.02, 0.62, 8, 1, true, 0, Math.PI);
  over.rotateX(Math.PI / 2);
  over.rotateZ(Math.PI / 2);
  knit(over, ax, C.armTop - aw / 2, 0.18, 0xffffff);
  knit(new THREE.BoxGeometry(0.025, 0.5, 0.62), -C.armOut - 0.016, C.armTop - aw / 2 - 0.25, 0.18, 0xe8e8e8);
  const fold = knit(new THREE.BoxGeometry(0.34, 0.025, 0.58), -C.armIn + 0.15, C.seat + 0.016, 0.2, 0xf4f4f4);
  fold.rotation.y = 0.12;
  knit(new THREE.BoxGeometry(0.025, C.armTop - aw / 2 - C.seat, 0.6), -C.armIn + 0.016, (C.armTop - aw / 2 + C.seat) / 2, 0.19, 0xdcdcdc);
  // Its fringe, hanging at the bottom of the outside.
  for (let k = 0; k < 6; k++) add('blanket', bakeVertexColor(new THREE.BoxGeometry(0.02, 0.07, 0.03), k % 2 ? 0xd0c49c : 0x2a6a64), mats.plain, -C.armOut - 0.02, C.armTop - aw / 2 - 0.53, -0.09 + k * 0.108);
  return group;
}
