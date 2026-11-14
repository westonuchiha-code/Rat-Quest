import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';

/**
 * A drain in a wall: a dark round mouth, a ring of bricks laid round it, and iron bars across it. It faces +Z.
 *
 * (It was a black disc with a flat brown band round it, which read as a way in: a hole to walk into, or a portal.
 * The bars say it is not; the brickwork says it was built there. `gap`: the tunnel a rat came in by. One bar is
 * broken off short at the bottom, leaving room for a rat and nothing bigger.)
 */
export interface DrainParts {
  group: THREE.Group;
  mouth: THREE.Mesh;
  bricks: THREE.Mesh[];
  bars: THREE.Mesh[];
}

const BRICK = [0x7a4a36, 0x8a5840, 0x6c4030, 0x84604a];
const MORTAR = 0x231b17;
// (Lighter than iron in the dark would be: they have to show against a black mouth.)
const IRON = 0x5c606a;
const RUST = 0x8a5230;

export function buildDrain(r: number, gap: boolean, plain: THREE.Material, dark: THREE.Material): DrainParts {
  const group = new THREE.Group();
  // The mouth, and the mortar the bricks are bedded in (a dark band just behind them).
  const disc = new THREE.CircleGeometry(r, 16);
  bakeVertexColor(disc, 0x050806, false);
  const mouth = new THREE.Mesh(disc, dark);
  group.add(mouth);
  const deep = Math.max(0.3, r * 0.2); // how far the ring reaches out from the mouth
  const bed = new THREE.RingGeometry(r, r + deep + 0.03, 20);
  bakeVertexColor(bed, MORTAR, false);
  const bedMesh = new THREE.Mesh(bed, dark);
  bedMesh.position.z = 0.01;
  group.add(bedMesh);

  // The bricks: laid on end round the mouth like the stones of an arch, a bigger one at the crown.
  const bricks: THREE.Mesh[] = [];
  const mid = r + deep / 2;
  const count = Math.max(8, Math.round((Math.PI * 2 * mid) / 0.46));
  for (let i = 0; i < count; i++) {
    const a = Math.PI / 2 + (i / count) * Math.PI * 2;
    const key = i === 0;
    const wide = ((Math.PI * 2 * r) / count) * (key ? 1.12 : 1) - 0.04; // across the inner edge, less the joint
    const geo = new THREE.BoxGeometry(wide, deep + (key ? 0.1 : 0), key ? 0.16 : 0.11);
    bakeVertexColor(geo, key ? 0x9a7458 : BRICK[(i * 7 + (i >> 1)) % BRICK.length]);
    const b = new THREE.Mesh(geo, plain);
    b.position.set(Math.cos(a) * (mid + (key ? 0.05 : 0)), Math.sin(a) * (mid + (key ? 0.05 : 0)), 0.05);
    b.rotation.z = a - Math.PI / 2;
    group.add(b);
    bricks.push(b);
  }

  // The bars: upright across the mouth, each as long as the mouth is tall where it stands, and one across the middle.
  const bars: THREE.Mesh[] = [];
  const n = Math.max(3, Math.round((r * 2) / 0.5) | 1); // an odd number, so one stands in the middle
  const thick = Math.min(0.11, 0.07 + r * 0.02);
  const inside = r - 0.02;
  for (let i = 0; i < n; i++) {
    const x = ((i + 1) / (n + 1) - 0.5) * 2 * r;
    const half = Math.sqrt(Math.max(0, inside * inside - x * x));
    // The middle one of a rat's tunnel stops short, bent, leaving a gap at the bottom.
    const broken = gap && i === (n - 1) / 2;
    const bottom = broken ? -half + Math.min(1.1, half * 1.2) : -half;
    const geo = new THREE.BoxGeometry(thick, half - bottom, thick);
    bakeVertexColor(geo, i % 2 ? IRON : new THREE.Color(IRON).lerp(new THREE.Color(RUST), 0.35).getHex());
    const bar = new THREE.Mesh(geo, plain);
    bar.position.set(x, (half + bottom) / 2, 0.06);
    if (broken) bar.rotation.z = 0.07;
    group.add(bar);
    bars.push(bar);
  }
  if (!gap) {
    const geo = new THREE.BoxGeometry(inside * 2, thick, thick * 0.9);
    bakeVertexColor(geo, IRON);
    const cross = new THREE.Mesh(geo, plain);
    cross.position.set(0, 0, 0.075);
    group.add(cross);
    bars.push(cross);
  } else {
    // (Its crossbar is high up, over the gap.)
    const y = inside * 0.55;
    const halfW = Math.sqrt(inside * inside - y * y);
    const geo = new THREE.BoxGeometry(halfW * 2, thick, thick * 0.9);
    bakeVertexColor(geo, IRON);
    const cross = new THREE.Mesh(geo, plain);
    cross.position.set(0, y, 0.075);
    group.add(cross);
    bars.push(cross);
  }
  return { group, mouth, bricks, bars };
}
