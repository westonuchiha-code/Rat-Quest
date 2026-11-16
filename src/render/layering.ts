/**
 * LAYERING: flat things that lie on other flat things, and how they are kept from flickering.
 *
 * Two faces that are parallel, face the same way and lie within a hair of each other flicker through one another at
 * a distance: the depth buffer cannot tell them apart, least of all with this game's snapped corners. (The owner,
 * 2026-11-16: a barrel's lid, a couch's patches, the drink in the mugs, the rugs, a dartboard; then "do the clipping
 * sweep".) A gap is not a cure.
 *
 * THE CURE: WHAT LIES ON SOMETHING IS PAINTED ON AFTERWARDS. It is drawn after the room, writes nothing to the depth
 * buffer, and is pulled a hair toward the eye so that it passes over what it lies on. What lies on THAT is drawn
 * after it again (`renderOrder`: its layer). So nothing has to win a contest of depth: the order decides.
 *   - A FLAT thing (a rug, a patch, a mark on a wall) is drawn that way itself: `asDecal`.
 *   - A SOLID thing with one face flush against another's (a cap on a post, a block let into a wall) keeps its own
 *     honest depth, and is given a SKIN: itself again, painted on afterwards. The skin settles the flush face.
 * WHY NOT simply give each layer a bigger pull and let it write depth (the first way this was done): because then the
 * depth buffer lies about where the floor is. A rug three layers up stood nearer the eye than the knight's shadow,
 * and his shadow vanished on rugs and on the dance floor. With this way the buffer holds the true floor, and a
 * shadow, a warning ring, water, a glow all meet it as they always did.
 *
 * `sweep` finds every such pair in a built thing. `autoLayer` cures each one, so a level-maker never has to think of
 * it and a prop added next year is covered too. The game runs it on every room as the room loads (main.ts);
 * `tests/clipsweep.ts` runs the sweep over every level and holds the count of what is left at nothing.
 */
import * as THREE from 'three';
import { lyingOn } from './ps1Material';

/** Faces nearer than this, front to back, are "almost on top of one another". */
const GAP = 0.03;
/** ...and overlap by at least this much (square units) to count. */
const AREA = 0.0015;

/** What is known of a mesh, once, for all its faces. */
interface Thing {
  id: number;
  mesh: THREE.Mesh;
  /** The material it LOOKS like: for a copy made here, the one it was copied from. */
  material: THREE.Material;
  /** How many layers up it is drawn (0: an ordinary thing). */
  level: number;
  /** It is the skin of this mesh (itself again, painted on afterwards), or null. */
  skinOf: THREE.Object3D | null;
  /** Whether it writes depth (a shadow or a glow does not, but is still hidden by what is in front of it). */
  soft: boolean;
  /** How big it is: the diagonal of the box round it (worked out when first asked). */
  size: number;
}
interface Tri {
  of: Thing;
  /** Its corners, in the world. */
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
  cx: number; cy: number; cz: number;
  /** Which way it faces, and how far along that its plane is. */
  nx: number; ny: number; nz: number;
  d: number;
  /** The colour painted on it (its first corner's), if it has one: 0xRRGGBB to the nearest sixteenth. */
  tint: number;
  /** It is the BACK of a face of a thing drawn on both sides. */
  flipped: boolean;
}
const pullOf = (m: THREE.Material): number => (m.polygonOffset ? Math.round(-m.polygonOffsetFactor / 2) : 0);
/** The layer a mesh is on: what it was put on here (`userData.layer`), or what its material was made for by hand. */
const layerOf = (m: THREE.Mesh, mat: THREE.Material): number => (m.userData.layer as number | undefined) ?? pullOf(mat);

/** Clips polygon `p` to the inside of triangle `t` (both in the plane): what is left of it. */
function clip(p: Array<[number, number]>, t: Array<[number, number]>): Array<[number, number]> {
  let out = p;
  const sign = (t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[1][1] - t[0][1]) * (t[2][0] - t[0][0]) >= 0 ? 1 : -1;
  for (let e = 0; e < 3 && out.length; e++) {
    const a = t[e];
    const b = t[(e + 1) % 3];
    const side = (q: [number, number]): number => sign * ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]));
    const next: Array<[number, number]> = [];
    for (let i = 0; i < out.length; i++) {
      const c = out[i];
      const dd = out[(i + 1) % out.length];
      const sc = side(c);
      const sd = side(dd);
      if (sc >= 0) next.push(c);
      if (sc >= 0 !== sd >= 0) {
        const k = sc / (sc - sd);
        next.push([c[0] + (dd[0] - c[0]) * k, c[1] + (dd[1] - c[1]) * k]);
      }
    }
    out = next;
  }
  return out;
}
const area = (p: Array<[number, number]>): number => {
  let a = 0;
  for (let i = 0; i < p.length; i++) a += p[i][0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * p[i][1];
  return Math.abs(a) / 2;
};

export interface Finding {
  where: string;
  at: THREE.Vector3;
  n: THREE.Vector3;
  gap: number;
  area: number;
  front: THREE.Mesh;
  back: THREE.Mesh;
  soft: boolean;
}

/**
 * Every pair of faces of `root` that would flicker.
 * `buried`: says whether a place is inside something solid. A face that looks straight into a solid thing (the
 * underside of a pillar standing on the floor, the side of a floor that runs in under a wall) is never seen, and
 * nothing that lies on it can flicker.
 * `every`: also the pairs that are already on different layers, and none within one mesh (what `autoLayer` works
 * from: it can do nothing for two faces of one mesh).
 *
 * (It is run on every room as the room loads, on a phone too: so it is written to make no litter. Corners are plain
 * numbers, a face is looked at in the frame of its heap through one scratch table, and the dear questions, is it
 * buried, how much do the two overlap, are asked last and of few.)
 */
export function sweep(root: THREE.Object3D, where: string, buried?: (p: THREE.Vector3) => boolean, every = false): Finding[] {
  root.updateMatrixWorld(true);
  const sizeOf = (t: Thing): number => (t.size >= 0 ? t.size : (t.size = new THREE.Box3().setFromObject(t.mesh).getSize(new THREE.Vector3()).length()));
  // Faces, sorted into heaps by which way they face (to a sixteenth).
  const heaps = new Map<number, Tri[]>();
  let things = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry?.attributes?.position) return;
    if ((o as THREE.Object3D & { isSprite?: boolean }).isSprite) return;
    for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return;
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
    if (!mat || mat.visible === false) return;
    const of: Thing = { id: things++, mesh: m, material: (mat.userData?.layerOf as THREE.Material | undefined) ?? mat, level: layerOf(m, mat), soft: mat.depthWrite === false, size: -1, skinOf: m.userData.skin ? m.parent : null };
    const pos = m.geometry.attributes.position;
    const idx = m.geometry.index;
    const col = m.geometry.attributes.color;
    // (Every corner into the world, once.)
    const e = m.matrixWorld.elements;
    const w = new Float64Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      w[i * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
      w[i * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
      w[i * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
    }
    const count = idx ? idx.count : pos.count;
    const both = mat.side === THREE.DoubleSide;
    const first = mat.side === THREE.BackSide ? -1 : 1;
    for (let i = 0; i + 2 < count; i += 3) {
      const ia = idx ? idx.getX(i) : i;
      const a = ia * 3;
      const b = (idx ? idx.getX(i + 1) : i + 1) * 3;
      const c = (idx ? idx.getX(i + 2) : i + 2) * 3;
      const e1x = w[b] - w[a];
      const e1y = w[b + 1] - w[a + 1];
      const e1z = w[b + 2] - w[a + 2];
      const e2x = w[c] - w[a];
      const e2y = w[c + 1] - w[a + 1];
      const e2z = w[c + 2] - w[a + 2];
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const twice = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (twice < 2e-4) continue;
      nx /= twice;
      ny /= twice;
      nz /= twice;
      const tint = col ? (Math.round(col.getX(ia) * 16) << 16) | (Math.round(col.getY(ia) * 16) << 8) | Math.round(col.getZ(ia) * 16) : -1;
      for (let side = 0; side < (both ? 2 : 1); side++) {
        const dir = side ? -first : first;
        const t: Tri = { of, ax: w[a], ay: w[a + 1], az: w[a + 2], bx: w[b], by: w[b + 1], bz: w[b + 2], cx: w[c], cy: w[c + 1], cz: w[c + 2], nx: nx * dir, ny: ny * dir, nz: nz * dir, d: 0, tint, flipped: dir < 0 };
        t.d = t.ax * t.nx + t.ay * t.ny + t.az * t.nz;
        // (Two keys, half a step apart, so that two faces a hair either side of a rounding edge still meet in one heap.)
        for (let shift = 0; shift < 2; shift++) {
          const h = shift * 0.5;
          const key = ((Math.floor(t.nx * 16 + h) + 20) * 64 + (Math.floor(t.ny * 16 + h) + 20)) * 64 + (Math.floor(t.nz * 16 + h) + 20) + shift * 1e6;
          const heap = heaps.get(key);
          if (heap) heap.push(t);
          else heaps.set(key, [t]);
        }
      }
    }
  });
  const found = new Map<number, Finding>();
  const probe = new THREE.Vector3();
  // (A face in its heap's frame: three corners, then the box round them. Ten numbers a face, one table for all heaps.)
  let P = new Float64Array(1024);
  const poly = (k: number): Array<[number, number]> => [[P[k], P[k + 3]], [P[k + 1], P[k + 4]], [P[k + 2], P[k + 5]]];
  for (const heap of heaps.values()) {
    const count = heap.length;
    if (count < 2) continue;
    if (P.length < count * 10) P = new Float64Array(count * 10);
    // A frame for the heap: its first face's normal, and two directions in its plane.
    const N = heap[0];
    let ux: number;
    let uy: number;
    let uz: number;
    if (Math.abs(N.ny) < 0.9) {
      // (0,1,0) x N
      ux = N.nz;
      uy = 0;
      uz = -N.nx;
    } else {
      // (1,0,0) x N
      ux = 0;
      uy = -N.nz;
      uz = N.ny;
    }
    const ul = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = N.ny * uz - N.nz * uy;
    const vy = N.nz * ux - N.nx * uz;
    const vz = N.nx * uy - N.ny * ux;
    const cells = new Map<number, number[]>();
    for (let i = 0; i < count; i++) {
      const t = heap[i];
      const k = i * 10;
      const u0 = (P[k] = t.ax * ux + t.ay * uy + t.az * uz);
      const u1 = (P[k + 1] = t.bx * ux + t.by * uy + t.bz * uz);
      const u2 = (P[k + 2] = t.cx * ux + t.cy * uy + t.cz * uz);
      const v0 = (P[k + 3] = t.ax * vx + t.ay * vy + t.az * vz);
      const v1 = (P[k + 4] = t.bx * vx + t.by * vy + t.bz * vz);
      const v2 = (P[k + 5] = t.cx * vx + t.cy * vy + t.cz * vz);
      const ua = (P[k + 6] = Math.min(u0, u1, u2));
      const ub = (P[k + 7] = Math.max(u0, u1, u2));
      const va = (P[k + 8] = Math.min(v0, v1, v2));
      const vb = (P[k + 9] = Math.max(v0, v1, v2));
      const cu0 = Math.floor(ua);
      const cu1 = Math.floor(ub);
      const cv0 = Math.floor(va);
      const cv1 = Math.floor(vb);
      // (A very big face is in many cells: it is put in each. A floor's faces are cut small, so this stays cheap.)
      if ((cu1 - cu0 + 1) * (cv1 - cv0 + 1) > 400) continue;
      for (let cu = cu0; cu <= cu1; cu++) for (let cv = cv0; cv <= cv1; cv++) {
        const key = (cu + 131072) * 262144 + (cv + 131072);
        const cell = cells.get(key);
        if (cell) cell.push(i);
        else cells.set(key, [i]);
      }
    }
    for (const cell of cells.values()) {
      const len = cell.length;
      for (let i = 0; i < len; i++) {
        const ai = cell[i];
        const A = heap[ai];
        const ka = ai * 10;
        for (let j = i + 1; j < len; j++) {
          const bi = cell[j];
          const B = heap[bi];
          const gap = Math.abs(A.d - B.d);
          if (gap > GAP) continue;
          // (Two faces of one thing in one plane are its own surface: tiles side by side. And the back of a face of
          // a thing drawn on both sides is the inside of it: a mushroom's cap from within.
          // And the faces of one thing that writes no depth go down in the order they were made, every frame alike.)
          if (A.of === B.of && (every || gap < 1e-5 || A.flipped || B.flipped || A.of.soft)) continue;
          // (A thing and its own skin are one thing.)
          if (A.of.skinOf === B.of.mesh || B.of.skinOf === A.of.mesh) continue;
          const kb = bi * 10;
          if (P[ka + 7] < P[kb + 6] || P[kb + 7] < P[ka + 6] || P[ka + 9] < P[kb + 8] || P[kb + 9] < P[ka + 8]) continue;
          if (A.nx * B.nx + A.ny * B.ny + A.nz * B.nz < 0.9995) continue;
          // (THE SMALLER THING LIES ON THE BIGGER: a patch on a cushion, a cap on a post, a rug on a floor. That is the
          // one called `front` here, whichever of the two faces is the nearer by its hair. Two things on different
          // layers cannot flicker: one of them always wins.)
          const sa = sizeOf(A.of);
          const sb = sizeOf(B.of);
          // (Of two the same size, the one made later is the one on top: the same answer every time it is asked.)
          const aFront = sa < sb || (sa === sb && A.of.id > B.of.id);
          const front = aFront ? A : B;
          const back = aFront ? B : A;
          // (`every`: all such pairs are wanted, cured or not: for working out the layers.)
          if (front.of.level !== back.of.level && !every) continue;
          // (Of one material and one colour, facing one way: whichever of the two is drawn, it looks the same. The
          // bars of a grating where they cross; two blocks of one stone side by side.)
          if (front.of.material === back.of.material && front.tint === back.tint) continue;
          const key = front.of.id * 1048576 + back.of.id;
          const was = found.get(key);
          // (For the layering it is enough to know the pair once: its every further face is passed by here.)
          if (was && every) continue;
          const over = area(clip(poly(ka), poly(kb)));
          if (over < AREA) continue;
          // (Looking straight into something solid, either of them: never seen.)
          if (buried) {
            if (buried(probe.set((front.ax + front.bx + front.cx) / 3 + front.nx * 0.08, (front.ay + front.by + front.cy) / 3 + front.ny * 0.08, (front.az + front.bz + front.cz) / 3 + front.nz * 0.08))) continue;
            if (buried(probe.set((back.ax + back.bx + back.cx) / 3 + back.nx * 0.08, (back.ay + back.by + back.cy) / 3 + back.ny * 0.08, (back.az + back.bz + back.cz) / 3 + back.nz * 0.08))) continue;
          }
          if (was) was.area += over / 2; // (each pair is met once in each of the two sets of heaps)
          else found.set(key, { where, at: new THREE.Vector3((front.ax + front.bx + front.cx) / 3, (front.ay + front.by + front.cy) / 3, (front.az + front.bz + front.cz) / 3), n: new THREE.Vector3(front.nx, front.ny, front.nz), gap, area: over / 2, front: front.of.mesh, back: back.of.mesh, soft: front.of.soft });
        }
      }
    }
  }
  return [...found.values()];
}


/**
 * A copy of a material for painting on afterwards: it writes no depth, and is pulled `pull` hairs toward the eye. A
 * shader material's copy SHARES its settings with the first (the room's fog, its lights, its picture, its flash):
 * only how it meets the depth buffer is its own. One copy a material a pull.
 */
const copies = new Map<string, THREE.Material>();
export function decalOf<T extends THREE.Material>(material: T, pull = 1): T {
  const first = ((material.userData?.layerOf as T | undefined) ?? material) as T;
  const key = `${first.uuid}|${pull}`;
  let c = copies.get(key) as T | undefined;
  if (!c) {
    c = first.clone() as T;
    const sm = first as unknown as THREE.ShaderMaterial;
    if (sm.isShaderMaterial) (c as unknown as THREE.ShaderMaterial).uniforms = sm.uniforms;
    lyingOn(c, pull);
    c.depthWrite = false;
    c.userData = { ...first.userData, layerOf: first, decal: true };
    copies.set(key, c);
    first.addEventListener('dispose', () => {
      copies.delete(key);
      c!.dispose();
    });
  }
  return c;
}

/** Whether a material is one that is painted on afterwards (made here, or made so by hand: the moss, a shadow). */
const isDecal = (m: THREE.Material): boolean => m.depthWrite === false;

/**
 * Makes a FLAT mesh a thing painted on afterwards, on layer `level` (1: on the room; 2: on something that is on the
 * room...). `pull`: how many hairs toward the eye: one more than whatever WROTE the depth it lies on was pulled (so
 * 1 on an ordinary floor, however many flat things lie between it and that floor).
 */
export function asDecal(mesh: THREE.Mesh, level = 1, pull = 1): void {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
  if (!isDecal(mat)) mesh.material = decalOf(mat, pull);
  mesh.renderOrder = Math.max(mesh.renderOrder, level);
  mesh.userData.layer = level;
}

/** Whether every face of a mesh lies in one plane: a rug, a patch, a mark. */
function planar(mesh: THREE.Mesh): boolean {
  const cached = mesh.geometry.userData.planar as boolean | undefined;
  if (cached !== undefined) return cached;
  const pos = mesh.geometry.attributes.position;
  const idx = mesh.geometry.index;
  const count = idx ? idx.count : pos.count;
  let nx = 0;
  let ny = 0;
  let nz = 0;
  let d = 0;
  let have = false;
  let flat = count >= 3;
  for (let i = 0; i + 2 < count && flat; i += 3) {
    const a = idx ? idx.getX(i) : i;
    const b = idx ? idx.getX(i + 1) : i + 1;
    const c = idx ? idx.getX(i + 2) : i + 2;
    const ax = pos.getX(a);
    const ay = pos.getY(a);
    const az = pos.getZ(a);
    const e1x = pos.getX(b) - ax;
    const e1y = pos.getY(b) - ay;
    const e1z = pos.getZ(b) - az;
    const e2x = pos.getX(c) - ax;
    const e2y = pos.getY(c) - ay;
    const e2z = pos.getZ(c) - az;
    let x = e1y * e2z - e1z * e2y;
    let y = e1z * e2x - e1x * e2z;
    let z = e1x * e2y - e1y * e2x;
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len < 1e-9) continue;
    x /= len;
    y /= len;
    z /= len;
    if (!have) {
      nx = x;
      ny = y;
      nz = z;
      d = ax * x + ay * y + az * z;
      have = true;
    } else if (x * nx + y * ny + z * nz < 0.999 || Math.abs(ax * nx + ay * ny + az * nz - d) > 2e-3) flat = false;
  }
  return (mesh.geometry.userData.planar = flat && have);
}

/** The most layers up anything is put. */
export const LAYER_MOST = 12;

/** How many faces a built thing may have and still be swept as it is built (the sweep of a very big one takes time). */
export const LAYER_BUDGET = 90000;

/**
 * Cures every thing of `root` that lies on another: it is put a layer up from what it lies on (and what lies on THAT
 * a layer further, and so on), and painted on afterwards in that order: a flat thing itself, a solid one by a skin.
 * It can do nothing for two faces of ONE mesh: `sweep` still finds those, and the test holds them at none.
 */
export function autoLayer(root: THREE.Object3D, buried?: (p: THREE.Vector3) => boolean): { layeredMeshes: number; skins: number; skipped: boolean } {
  let faces = 0;
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry?.attributes?.position) return;
    meshes.push(m);
    faces += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  });
  const matOf = (m: THREE.Mesh): THREE.Material => (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
  // (What was made by hand to lie FLAT on something, in a material with a pull that writes depth, is painted on
  // afterwards like the rest: a rug's layers, the dance floor's tiles. This is cheap, and is done for the biggest
  // room too.)
  for (const m of meshes) {
    const mat = matOf(m);
    if (mat && !Array.isArray(m.material) && m.userData.layer === undefined && pullOf(mat) >= 1 && !isDecal(mat) && planar(m)) asDecal(m, pullOf(mat), pullOf(mat));
  }
  if (faces > LAYER_BUDGET) return { layeredMeshes: 0, skins: 0, skipped: true };
  const pairs = sweep(root, '', buried, true);
  const level = new Map<THREE.Mesh, number>();
  const base = (m: THREE.Mesh): number => layerOf(m, matOf(m));
  const of = (m: THREE.Mesh): number => level.get(m) ?? base(m);
  // (Each smaller thing a layer over the bigger it lies on; and again, until nothing changes: so that what lies on
  // a thing that itself lies on something is two up. Since it always goes from small to big, it ends.)
  for (let pass = 0; pass < LAYER_MOST + 2; pass++) {
    let changed = false;
    for (const f of pairs) {
      const want = Math.min(LAYER_MOST, of(f.back) + 1);
      if (of(f.front) < want) {
        level.set(f.front, want);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // (How far each must be pulled to pass over what it lies on: one hair more than whatever wrote the depth there.
  // A flat thing under it wrote none, so lying on a flat thing costs nothing more: a rug's four layers are all one
  // hair over the floor, and it is the order they are drawn in that stacks them.)
  const backs = new Map<THREE.Mesh, THREE.Mesh[]>();
  for (const f of pairs) backs.set(f.front, [...(backs.get(f.front) ?? []), f.back]);
  const over = (b: THREE.Mesh): number => {
    const mat = matOf(b);
    return isDecal(mat) ? Math.max(1, pullOf(mat)) : pullOf(mat) + 1;
  };
  let raised = 0;
  let skins = 0;
  for (const [m, lv] of [...level].sort((a, b) => a[1] - b[1])) {
    if (lv === base(m) || m.userData.skin) continue;
    raised++;
    const mat = matOf(m);
    if (Array.isArray(m.material)) continue;
    const pull = Math.max(1, ...(backs.get(m) ?? []).map(over));
    if (isDecal(mat) || planar(m)) {
      // A flat thing, or one that already writes no depth (a glow, a pane): painted on afterwards, itself.
      asDecal(m, lv, pull);
    } else {
      // A solid thing: it keeps its own depth, and wears a skin: itself again, painted on afterwards. (The skin is
      // pulled a hair more than the thing's own material is, so that it passes over the thing itself.)
      m.userData.layer = lv;
      const skin = new THREE.Mesh(m.geometry, decalOf(mat, Math.max(pull, pullOf(mat) + 1)));
      skin.renderOrder = lv;
      skin.userData = { layer: lv, skin: true };
      skin.frustumCulled = m.frustumCulled;
      m.add(skin);
      skins++;
    }
  }
  return { layeredMeshes: raised, skins, skipped: false };
}
