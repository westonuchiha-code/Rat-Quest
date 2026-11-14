import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexColor, createPs1Material } from '../render/ps1Material';
import { getTexture } from '../render/textures';

const GRAVITY = 18;
const LIFE = 5; // seconds a board lies there before it is gone
const SHRINK_FROM = 3; // it starts shrinking away here, and blinks near the end
const CHIP_LIFE = 1.6; // splinters are gone much sooner

interface Piece {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  /** Half its size along its own length, thin side and width: how low its lowest corner hangs depends on how it lies. */
  ext: [number, number, number];
  floorY: number;
  age: number;
  life: number;
  size: number; // its scale before it starts to shrink away
  landed: boolean;
  /** A board knocks when it first hits the floor; a splinter does not. */
  knocks: boolean;
}

/** How one end of a board broke. */
type End = 'square' | 'slant' | 'point' | 'notch';

/** Where the fresh, pale wood of a break is in the crate's picture: the highlight line along a plank. */
const BREAK_UV: [number, number] = [0.5, 9.5 / 64];

/**
 * A board lying flat: long on x, thin on y. It shows one strip of a picture (so a frame board looks like the crate's
 * frame and a plank like its planks, not like a tiny whole crate), and each end is snapped off its own way.
 * `bend` bows it upward in the middle, for a barrel stave.
 */
export function board(len: number, thick: number, wid: number, uv: [number, number, number, number], ends: [End, End], tint = 0xf2e6d2, bend = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(len, thick, wid, bend ? 4 : 1, 1, 2);
  const p = g.attributes.position;
  const n = g.attributes.normal;
  const t = g.attributes.uv;
  const bite = Math.min(wid * 0.8, len * 0.22);
  const onEnd: boolean[] = [];
  for (let i = 0; i < p.count; i++) {
    const x0 = p.getX(i);
    const across = p.getZ(i) / (wid / 2); // -1, 0 or 1
    let x = x0;
    if (Math.abs(Math.abs(x0) - len / 2) < 1e-6) {
      const side = x0 > 0 ? 1 : -1;
      const end = ends[side > 0 ? 1 : 0];
      const pull = end === 'slant' ? ((across * side + 1) / 2) * bite : end === 'point' ? Math.abs(across) * bite : end === 'notch' ? (1 - Math.abs(across)) * bite * 0.7 : 0;
      x = x0 - side * pull;
      p.setX(i, x);
    }
    const u = uv[0] + Math.min(1, Math.max(0, x / len + 0.5)) * (uv[2] - uv[0]);
    onEnd[i] = Math.abs(n.getX(i)) > 0.5;
    if (Math.abs(n.getY(i)) > 0.5) t.setXY(i, u, uv[1] + (across * 0.5 + 0.5) * (uv[3] - uv[1]));
    else if (onEnd[i]) t.setXY(i, BREAK_UV[0] + across * 0.02, BREAK_UV[1]);
    else t.setXY(i, u, uv[1] + (p.getY(i) > 0 ? 0.18 : 0.04) * (uv[3] - uv[1]));
    if (bend) p.setY(i, p.getY(i) + bend * (1 - (2 * x0 / len) ** 2));
  }
  g.computeVertexNormals();
  bakeVertexColor(g, tint);
  // The broken ends are bare wood: brighter than the weathered faces.
  const c = g.attributes.color;
  for (let i = 0; i < p.count; i++) if (onEnd[i]) c.setXYZ(i, 1, 0.94, 0.8);
  return g;
}

/** Where a piece sits on the crate before it flies: a place (in half-widths from the middle) and which way it lies. */
interface Home {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  at: [number, number, number];
  /** The way its length runs, and the way its thin side faces. */
  along: [number, number, number];
  out: [number, number, number];
  /** How hard it is thrown: 1 for most, less for the bottom boards that only drop. */
  toss: number;
}

/**
 * The pieces of smashed crates, barrels and pipe joints. A crate comes apart into what it was made of: frame boards from
 * its edges, planks from its faces, a corner still nailed together, and a spray of pale splinters. Each piece starts
 * where it sat on the crate, flies out, tumbles, knocks on the floor, lies flat, then shrinks away and blinks out, the
 * way smashed things vanished in old games.
 */
export class Debris {
  private readonly pieces: Piece[] = [];
  private readonly crateMat = createPs1Material({ tex: getTexture('crate') });
  private readonly staveMat = createPs1Material({ tex: getTexture('planks') });
  private readonly plainMat = createPs1Material({ lit: true });
  private readonly crate: Home[] = [];
  private readonly barrel: Home[] = [];
  private readonly chips: THREE.BufferGeometry[] = [];
  private readonly shards: THREE.BufferGeometry[] = [];
  /** Boards that hit the floor since this was last read (for their knocking sounds). */
  private knocks = 0;

  constructor(private readonly parent: THREE.Object3D, private readonly groundAt: (x: number, y: number, z: number) => number | null) {
    // ---- A crate (sizes are for a one-unit crate; a bigger one scales them) ----
    const FRAME: [number, number, number, number] = [0, 0, 1, 0.125];
    const frameLong = board(0.94, 0.07, 0.125, FRAME, ['square', 'slant']);
    const frameLong2 = board(0.9, 0.07, 0.125, FRAME, ['notch', 'square']);
    const frameHalf = board(0.52, 0.07, 0.125, [0, 0, 0.55, 0.125], ['square', 'point']);
    const frameStub = board(0.36, 0.07, 0.125, [0.6, 0, 1, 0.125], ['slant', 'square']);
    const plankA = board(0.66, 0.045, 0.25, [0.125, 0.125, 0.8, 0.375], ['slant', 'point']);
    const plankB = board(0.56, 0.045, 0.25, [0.2, 0.375, 0.875, 0.625], ['notch', 'slant']);
    const plankC = board(0.4, 0.045, 0.25, [0.125, 0.625, 0.55, 0.875], ['point', 'slant']);
    const plankD = board(0.3, 0.045, 0.22, [0.5, 0.375, 0.875, 0.625], ['slant', 'notch']);
    // A corner still nailed together: two frame boards at a right angle.
    const corner = mergeGeometries([
      board(0.5, 0.07, 0.125, [0, 0, 0.5, 0.125], ['square', 'slant']),
      board(0.42, 0.07, 0.125, [0, 0, 0.45, 0.125], ['square', 'point']).rotateY(-Math.PI / 2).translate(-0.19, 0, 0.15),
    ])!;
    const c = (geo: THREE.BufferGeometry, at: Home['at'], along: Home['along'], out: Home['out'], toss = 1): void => void this.crate.push({ geo, mat: this.crateMat, at, along, out, toss });
    // The frame: the four boards round the top...
    c(frameLong, [0, 1, 1], [1, 0, 0], [0, 1, 0]);
    c(frameLong2, [0, 1, -1], [1, 0, 0], [0, 1, 0]);
    c(frameHalf, [1, 1, 0.3], [0, 0, 1], [0, 1, 0]);
    c(frameStub, [-1, 1, -0.4], [0, 0, 1], [0, 1, 0]);
    // ...the four uprights at the corners (one still nailed to its neighbour)...
    c(frameLong, [1, 0, 1], [0, 1, 0], [1, 0, 0]);
    c(frameHalf, [-1, 0.3, 1], [0, 1, 0], [0, 0, 1]);
    c(corner, [-1, 0.2, -1], [0, 1, 0], [-1, 0, 0]);
    c(frameStub, [1, -0.4, -1], [0, 1, 0], [0, 0, -1]);
    // ...a plank or two from each face and the lid...
    c(plankA, [0, 0.4, 1], [1, 0, 0], [0, 0, 1]);
    c(plankB, [0, -0.1, -1], [1, 0, 0], [0, 0, -1]);
    c(plankC, [1, 0.1, 0], [0, 0, 1], [1, 0, 0]);
    c(plankA, [-1, 0.3, 0], [0, 0, 1], [-1, 0, 0]);
    c(plankB, [0.1, 1, 0.3], [1, 0, 0], [0, 1, 0]);
    c(plankD, [-0.3, 1, -0.4], [1, 0, 0], [0, 1, 0]);
    // ...and the bottom, which only drops where it stood.
    c(plankC, [0.3, -1, 0.3], [1, 0, 0], [0, 1, 0], 0.25);
    c(frameStub, [-0.4, -1, -0.5], [0, 0, 1], [0, 1, 0], 0.25);

    // ---- A barrel: staves standing round it, both hoops burst in two, the lid split in half ----
    const STAVE: [number, number, number, number] = [0, 0, 1, 0.5];
    const staves = [
      board(0.82, 0.05, 0.2, STAVE, ['square', 'slant'], 0xf4d8b0, 0.07),
      board(0.6, 0.05, 0.2, [0, 0.5, 0.75, 1], ['point', 'square'], 0xf4d8b0, 0.05),
      board(0.44, 0.05, 0.18, [0.3, 0, 0.9, 0.5], ['slant', 'notch'], 0xf4d8b0, 0.03),
    ];
    const b = (geo: THREE.BufferGeometry, mat: THREE.Material, at: Home['at'], along: Home['along'], out: Home['out'], toss = 1): void => void this.barrel.push({ geo, mat, at, along, out, toss });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      b(staves[i % 3], this.staveMat, [Math.cos(a), i % 3 === 2 ? -0.3 : 0, Math.sin(a)], [0, 1, 0], [Math.cos(a), 0, Math.sin(a)]);
    }
    const hoop = new THREE.TorusGeometry(0.5, 0.035, 3, 7, Math.PI * 0.85);
    hoop.rotateX(Math.PI / 2); // lying flat, like the boards
    bakeVertexColor(hoop, 0x3a3a40);
    for (const [y, turn] of [[0.6, 0], [0.6, Math.PI], [-0.6, 1.2], [-0.6, 1.2 + Math.PI]] as const) {
      b(hoop, this.plainMat, [0, y, 0], [Math.cos(turn), 0, Math.sin(turn)], [0, 1, 0]);
    }
    const half = new THREE.CircleGeometry(0.44, 6, 0, Math.PI);
    half.rotateX(-Math.PI / 2);
    const lid = mergeGeometries([half, half.clone().rotateX(Math.PI)])!; // both sides drawn
    bakeVertexColor(lid, 0xb8926a);
    b(lid, this.staveMat, [0, 1, 0.15], [1, 0, 0], [0, 1, 0]);
    b(lid, this.staveMat, [0, 1, -0.15], [-1, 0, 0], [0, 1, 0]);

    // Splinters: thin pale slivers of bare wood.
    for (const [len, r, col] of [[0.3, 0.022, 0xe6c796], [0.2, 0.018, 0xd9b582], [0.13, 0.02, 0xf0d8ae]] as const) {
      const g = new THREE.ConeGeometry(r, len, 3, 1);
      g.rotateZ(Math.PI / 2);
      bakeVertexColor(g, col);
      this.chips.push(g);
    }
    // Pipe shards: rusty curved bits and green flecks.
    for (const [col, sz] of [[0x9a6a3a, 0.22], [0x7a8a7a, 0.18], [0x6aff4a, 0.12]] as const) {
      const g = new THREE.BoxGeometry(sz, 0.05, sz * 0.7);
      bakeVertexColor(g, col);
      this.shards.push(g);
    }
  }

  /** Removes every piece, for a new level. */
  clear(): void {
    for (const p of this.pieces) this.parent.remove(p.mesh);
    this.pieces.length = 0;
    this.knocks = 0;
  }

  /** Boards that have hit the floor since the last call. */
  takeKnocks(): number {
    const n = this.knocks;
    this.knocks = 0;
    return n;
  }

  private add(mesh: THREE.Mesh, vx: number, vy: number, vz: number, spin: number, floorY: number, life: number, knocks: boolean): void {
    this.parent.add(mesh);
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox!;
    const k = mesh.scale.x;
    const half = (lo: number, hi: number): number => Math.max(0.012, Math.max(Math.abs(lo), Math.abs(hi)) * k);
    this.pieces.push({
      mesh, vx, vy, vz,
      spinX: (Math.random() - 0.5) * spin, spinY: (Math.random() - 0.5) * spin * 0.75, spinZ: (Math.random() - 0.5) * spin,
      ext: [half(bb.min.x, bb.max.x), half(bb.min.y, bb.max.y), half(bb.min.z, bb.max.z)],
      floorY, age: 0, life, size: k, landed: false, knocks,
    });
  }

  /** How far below its middle a piece's lowest corner is, the way it lies now. Flat on the floor, that is half its thin side. */
  private static low(p: Piece): number {
    const q = p.mesh.quaternion;
    return Math.abs(2 * (q.x * q.y + q.z * q.w)) * p.ext[0] + Math.abs(1 - 2 * (q.x * q.x + q.z * q.z)) * p.ext[1] + Math.abs(2 * (q.y * q.z - q.x * q.w)) * p.ext[2];
  }

  /** Bursts a crate at (x, y, z) into pieces, thrown out from its middle and away from (fromX, fromZ). */
  burst(x: number, y: number, z: number, half: number, fromX: number, fromZ: number, type: 'crate' | 'barrel' | 'pipe' = 'crate'): void {
    const away = Math.atan2(x - fromX, z - fromZ);
    const ax = Math.sin(away);
    const az = Math.cos(away);
    const floorY = this.groundAt(x, y + 0.6, z) ?? -100;
    if (type === 'pipe') {
      for (let i = 0; i < 8; i++) {
        const mesh = new THREE.Mesh(this.shards[i % this.shards.length], this.plainMat);
        const ox = (Math.random() - 0.5) * half * 1.6;
        const oz = (Math.random() - 0.5) * half * 1.6;
        mesh.position.set(x + ox, y + (Math.random() - 0.3) * half, z + oz);
        mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        const dir = away + (Math.random() - 0.5) * 2.4;
        const sp = 1.2 + Math.random() * 2.6;
        this.add(mesh, Math.sin(dir) * sp + ox * 3, 3 + Math.random() * 4, Math.cos(dir) * sp + oz * 3, 16, floorY, LIFE, false);
      }
      return;
    }
    const scale = half / 0.5;
    const L = new THREE.Vector3();
    const T = new THREE.Vector3();
    const W = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    for (const h of type === 'barrel' ? this.barrel : this.crate) {
      const mesh = new THREE.Mesh(h.geo, h.mat);
      mesh.scale.setScalar(scale);
      mesh.position.set(x + h.at[0] * half, y + h.at[1] * half, z + h.at[2] * half);
      L.set(...h.along);
      T.set(...h.out);
      W.crossVectors(L, T);
      mesh.quaternion.setFromRotationMatrix(basis.makeBasis(L, T, W));
      // Out from the middle of the crate, a push the way the blow went, and up (the top goes highest).
      const flat = Math.hypot(h.at[0], h.at[2]) || 1;
      const out = (1.3 + Math.random() * 1.9) * h.toss;
      const push = (0.9 + Math.random() * 1.6) * h.toss;
      const wob = (Math.random() - 0.5) * 1.2 * h.toss;
      const vx = (h.at[0] / flat) * out + ax * push + az * wob;
      const vz = (h.at[2] / flat) * out + az * push - ax * wob;
      const vy = h.toss < 1 ? 1.2 + Math.random() : 2.6 + Math.random() * 2.6 + Math.max(0, h.at[1]) * 1.6;
      this.add(mesh, vx, vy, vz, 15 * h.toss, floorY, LIFE, true);
    }
    // Splinters spray out of the middle, fast and every way, a little more the way the blow went.
    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(this.chips[i % this.chips.length], this.plainMat);
      mesh.scale.setScalar(scale * (0.8 + Math.random() * 0.6));
      mesh.position.set(x + (Math.random() - 0.5) * half, y + (Math.random() - 0.2) * half, z + (Math.random() - 0.5) * half);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const dir = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 3.5;
      this.add(mesh, Math.sin(dir) * sp + ax * 1.5, 3.5 + Math.random() * 4.5, Math.cos(dir) * sp + az * 1.5, 26, floorY, CHIP_LIFE, false);
    }
  }

  update(dt: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      const m = p.mesh;
      p.age += dt;
      if (!p.landed || p.vy > 0.01 || m.position.y > p.floorY + Debris.low(p) + 0.001) {
        p.vy -= GRAVITY * dt;
        m.position.x += p.vx * dt;
        m.position.y += p.vy * dt;
        m.position.z += p.vz * dt;
        m.rotation.x += p.spinX * dt;
        m.rotation.y += p.spinY * dt;
        m.rotation.z += p.spinZ * dt;
        // It rests on whichever corner is lowest, so a tumbling board bounces on its ends and never dips into the floor.
        const rest = p.floorY + Debris.low(p);
        if (m.position.y <= rest) {
          m.position.y = rest;
          if (p.vy < -1.5) {
            if (p.knocks) {
              this.knocks++;
              p.knocks = false;
            }
            // Bounce, losing most of the energy, and slow the spin.
            p.vy = -p.vy * 0.38;
            p.vx *= 0.6;
            p.vz *= 0.6;
            p.spinX *= 0.5;
            p.spinY *= 0.5;
            p.spinZ *= 0.5;
          } else {
            p.vy = 0;
            p.vx = 0;
            p.vz = 0;
            p.spinX = p.spinY = p.spinZ = 0;
            p.landed = true;
          }
        }
        // Fell into the pit: gone.
        if (m.position.y < -6) p.age = p.life;
      }
      if (p.landed) {
        // Lie flat: ease the tilt out and keep the spin about the vertical.
        const k = Math.min(1, dt * 12);
        m.rotation.x += (Math.round(m.rotation.x / Math.PI) * Math.PI - m.rotation.x) * k;
        m.rotation.z += (Math.round(m.rotation.z / Math.PI) * Math.PI - m.rotation.z) * k;
        m.position.y = Math.max(m.position.y, p.floorY + Debris.low(p));
      }
      // Slowly disappear: shrink, then blink right at the end.
      const shrinkFrom = p.life * (SHRINK_FROM / LIFE);
      if (p.age > shrinkFrom) {
        const t = (p.age - shrinkFrom) / (p.life - shrinkFrom);
        m.scale.setScalar(Math.max(0.01, p.size * (1 - t)));
        m.visible = t < 0.6 || Math.floor(p.age * 20) % 2 === 0;
      }
      if (p.age >= p.life) {
        this.parent.remove(m);
        this.pieces.splice(i, 1);
      }
    }
  }

  get count(): number {
    return this.pieces.length;
  }
}
