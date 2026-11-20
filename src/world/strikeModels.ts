/**
 * How the things to hit look (world/strikeables.ts): a lever on a post, a cracked slab of wall, a cracked slab of floor.
 * Each is built round its own middle; `show` puts it as its state says (the lever over or back, the cracks so far, the
 * shudder of a blow). The room (world/chamber.ts) places them, makes them solid, and tags them as moving so the
 * gathering of the room's still dressing leaves them alone.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexColor } from '../render/ps1Material';
import { STRIKE, type Strikeable } from './strikeables';

/** One geometry from many (as the room's own helper does). */
function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  return mergeGeometries(flat) ?? new THREE.BufferGeometry();
}

export interface StrikeMats {
  stone: THREE.Material;
  iron: THREE.Material;
  plain: THREE.Material;
}

export interface BuiltStrike {
  group: THREE.Group;
  show(t: Strikeable, time: number): void;
}

/** A lever's throw: how far over it leans each way, and how fast it swings there. */
const THROW = 0.65;

/** A few dark cracks across a face: thin boxes, laid by a fixed hand (so every slab cracks the same way). */
function cracks(len: number, across: number, n: number, seed: number, face: (g: THREE.BufferGeometry) => void): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  let s = seed;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Each crack: a run of three short strokes, wandering.
  for (let k = 0; k < n; k++) {
    let x = (rnd() - 0.5) * len * 0.5;
    let y = (rnd() - 0.5) * across * 0.5;
    let a = rnd() * Math.PI * 2;
    for (let j = 0; j < 3; j++) {
      const l = 0.25 + rnd() * 0.35;
      const g = new THREE.BoxGeometry(l, 0.04, 0.02);
      g.rotateZ(a);
      g.translate(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2, 0);
      x += Math.cos(a) * l;
      y += Math.sin(a) * l;
      a += (rnd() - 0.5) * 1.4;
      parts.push(g);
    }
  }
  const out = mergeAll(parts);
  face(out);
  return bakeVertexColor(out, 0x16120e);
}

export function buildStrike(d: { kind: 'lever'; yaw: number } | { kind: 'crackwall'; w: number; h: number; d: number } | { kind: 'crackfloor'; w: number; d: number }, mats: StrikeMats): BuiltStrike {
  const group = new THREE.Group();
  group.userData.moves = true;
  if (d.kind === 'lever') {
    const L = STRIKE.lever;
    // The base: an iron block, a slot in its top.
    const base = new THREE.Mesh(bakeVertexColor(new THREE.BoxGeometry(L.w, 0.35, L.d), 0x8a8a90), mats.iron);
    base.position.y = 0.175;
    group.add(base);
    // The handle turns about its foot, across the way it throws.
    const pivot = new THREE.Group();
    pivot.position.y = 0.35;
    const rod = new THREE.CylinderGeometry(0.05, 0.06, L.h - 0.35, 6, 1);
    rod.translate(0, (L.h - 0.35) / 2, 0);
    bakeVertexColor(rod, 0x5a4a3a);
    const knob = new THREE.SphereGeometry(0.13, 8, 6);
    knob.translate(0, L.h - 0.35, 0);
    bakeVertexColor(knob, 0xc8302a);
    pivot.add(new THREE.Mesh(mergeAll([rod, knob]), mats.plain));
    pivot.rotation.x = -THROW;
    group.add(pivot);
    // A lamp on the base's front: dark while off, green while on.
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x1e2a1e });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.02), lampMat);
    lamp.position.set(0, 0.2, L.d / 2 + 0.011);
    group.add(lamp);
    group.rotation.y = d.yaw;
    let shown = -THROW;
    let last = -1;
    return {
      group,
      show(t, time) {
        const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
        last = time;
        const want = t.on ? THROW : -THROW;
        shown += Math.sign(want - shown) * Math.min(Math.abs(want - shown), dt * 9);
        pivot.rotation.x = shown;
        lampMat.color.setHex(t.on ? 0x6aff6a : 0x1e2a1e);
      },
    };
  }
  if (d.kind === 'crackwall') {
    const slab = new THREE.Mesh(bakeVertexColor(new THREE.BoxGeometry(d.w, d.h, d.d), 0xb8aa98), mats.stone);
    slab.position.y = d.h / 2;
    group.add(slab);
    // Three sets of cracks on each face, shown one more at each blow taken.
    const stages: THREE.Mesh[] = [];
    for (let k = 0; k < 3; k++) {
      const faces = [1, -1].map((side) => cracks(Math.min(d.w, 3), d.h, 2 + k, 11 + k * 7 + (side > 0 ? 0 : 3), (g) => {
        if (side < 0) g.rotateY(Math.PI);
        g.translate(0, d.h / 2, side * (d.d / 2 + 0.012));
      }));
      const m = new THREE.Mesh(mergeAll(faces), mats.plain);
      m.visible = k === 0;
      stages.push(m);
      slab.add(m);
      m.position.y = -d.h / 2;
    }
    return {
      group,
      show(t, time) {
        group.visible = !t.gone;
        stages.forEach((m, k) => (m.visible = k <= t.taken));
        const since = time - t.struckAt;
        slab.position.x = since < 0.25 ? Math.sin(since * 70) * 0.05 * (1 - since / 0.25) : 0;
      },
    };
  }
  const T = 0.4;
  const slab = new THREE.Mesh(bakeVertexColor(new THREE.BoxGeometry(d.w, T, d.d), 0xb0a490), mats.stone);
  slab.position.y = -T / 2;
  group.add(slab);
  const top = cracks(Math.min(d.w, d.d) * 1.2, Math.min(d.w, d.d), 4, 29, (g) => {
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0.012, 0);
  });
  group.add(new THREE.Mesh(top, mats.plain));
  return {
    group,
    show(t) {
      group.visible = !t.gone;
    },
  };
}
