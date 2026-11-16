/**
 * The Club's tables and seats (decor kinds 'table' and 'stool'). Things out of the sewer, the right size for a rat:
 * a TABLE is a wooden cable drum on its side (two round cheeks of planks and a fat core with a turn of old cable
 * left on it), with thimbles for mugs, a candle stub in a bottle cap, and sometimes a hand of cards; a STOOL is a
 * cork with a bottle cap for a seat.
 *
 * Each stands with its middle on x = 0, z = 0 and its feet on y = 0. What is solid of each is in `TABLE` and `STOOL`
 * (layout.ts), and junction.ts builds the colliders from the same numbers.
 */
import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';
import { STOOL, TABLE } from './layout';

export interface TavernMats {
  /** Lit by the room, textured: planks for the drum's cheeks. */
  wood: THREE.Material;
  /** Plain colour: everything else. */
  plain: THREE.Material;
  /** Unlit: the candle's flame. */
  glow: THREE.Material;
}

/** What is on a table. */
export interface TableTop {
  /** Thimble mugs: where each stands, as an angle round the table (radians) and how far out (0..1 of its radius). */
  mugs?: Array<[number, number]>;
  candle?: boolean;
  /** A game of cards laid out, and a few crumbs for stakes. */
  cards?: boolean;
}

function colored(geo: THREE.BufferGeometry, color: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  bakeVertexColor(geo, color);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

/** Texture coordinates for a round cheek seen from above: the planks run straight across it. */
function plankUvs(geo: THREE.BufferGeometry, tile: number): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / tile;
    uv[i * 2 + 1] = (pos.getZ(i) + pos.getY(i) * 0.5) / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** A thimble: a dented tin cup wider at its mouth, something dark in it. */
export function buildMug(mats: TavernMats, full = true): THREE.Group {
  const g = new THREE.Group();
  g.add(colored(new THREE.CylinderGeometry(0.075, 0.058, 0.15, 7, 1), 0xa9a79c, mats.plain, 0, 0.075, 0));
  g.add(colored(new THREE.CylinderGeometry(0.082, 0.082, 0.022, 7, 1), 0xc9c6b6, mats.plain, 0, 0.145, 0));
  if (full) g.add(colored(new THREE.CylinderGeometry(0.064, 0.064, 0.012, 7, 1), 0x5a3418, mats.plain, 0, 0.152, 0));
  return g;
}

export function buildTable(mats: TavernMats, top: TableTop = {}): THREE.Group {
  const g = new THREE.Group();
  const R = TABLE.r;
  const H = TABLE.h;
  // The two cheeks of the drum: the top one is the table, the bottom one its foot. Planks, with an iron hoop.
  for (const [y, thick] of [[H - 0.05, 0.1], [0.05, 0.1]] as const) {
    const cheek = plankUvs(new THREE.CylinderGeometry(R, R, thick, 12, 1), 1.1);
    bakeVertexColor(cheek, 0xd8c8a8);
    const m = new THREE.Mesh(cheek, mats.wood);
    m.position.y = y;
    g.add(m);
    g.add(colored(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.035, 12, 1, true), 0x3c3a40, mats.plain, 0, y, 0));
  }
  // The core, with bolts through the top cheek and a turn or two of old cable still on it.
  g.add(colored(new THREE.CylinderGeometry(R * 0.42, R * 0.42, H - 0.2, 9, 1), 0x7a5a38, mats.plain, 0, H / 2, 0));
  for (const y of [0.24, 0.31, 0.38]) {
    const turn = new THREE.TorusGeometry(R * 0.46, 0.035, 4, 10);
    turn.rotateX(Math.PI / 2);
    g.add(colored(turn, y === 0.31 ? 0x24262c : 0x2e3038, mats.plain, 0, y, 0));
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    g.add(colored(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 5, 1), 0x4a4a52, mats.plain, Math.cos(a) * R * 0.3, H + 0.012, Math.sin(a) * R * 0.3));
  }
  // What is on it.
  for (const [a, out] of top.mugs ?? []) {
    const mug = buildMug(mats);
    mug.position.set(Math.sin(a) * R * out, H, Math.cos(a) * R * out);
    mug.rotation.y = a * 3;
    g.add(mug);
  }
  if (top.candle) {
    // A candle stub in a bottle cap, a pool of wax round it.
    g.add(colored(new THREE.CylinderGeometry(0.11, 0.095, 0.035, 8, 1), 0xb8a04a, mats.plain, 0, H + 0.018, 0));
    g.add(colored(new THREE.CylinderGeometry(0.045, 0.055, 0.13, 6, 1), 0xe8dcc0, mats.plain, 0, H + 0.1, 0));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 5), mats.glow);
    flame.position.set(0, H + 0.21, 0);
    flame.userData.flame = true;
    g.add(flame);
  }
  if (top.cards) {
    // Cards face up in a fan and one pile face down; three crumbs in the middle.
    for (let i = 0; i < 4; i++) {
      const card = colored(new THREE.BoxGeometry(0.09, 0.006, 0.13), i % 2 ? 0xe9e2cf : 0xdcd3bb, mats.plain, -0.22 + i * 0.075, H + 0.006 + i * 0.002, 0.34);
      card.rotation.y = -0.3 + i * 0.2;
      g.add(card);
      g.add(colored(new THREE.BoxGeometry(0.03, 0.007, 0.03), i % 2 ? 0xa02a22 : 0x24242a, mats.plain, -0.22 + i * 0.075, H + 0.011 + i * 0.002, 0.34));
    }
    g.add(colored(new THREE.BoxGeometry(0.09, 0.03, 0.13), 0x6a2f2a, mats.plain, 0.3, H + 0.015, -0.2));
    for (const [x, z] of [[0.02, 0.05], [-0.07, -0.04], [0.09, -0.06]]) g.add(colored(new THREE.BoxGeometry(0.055, 0.045, 0.05), 0xe2b04a, mats.plain, x, H + 0.023, z + 0.2));
  }
  return g;
}

export function buildStool(mats: TavernMats): THREE.Group {
  const g = new THREE.Group();
  // A cork, a little wider at its foot, and a bottle cap pressed down on it for a seat.
  g.add(colored(new THREE.CylinderGeometry(STOOL.r * 0.78, STOOL.r * 0.9, STOOL.h - 0.05, 8, 1), 0xb98d5a, mats.plain, 0, (STOOL.h - 0.05) / 2, 0));
  g.add(colored(new THREE.CylinderGeometry(STOOL.r * 0.8, STOOL.r * 0.8, 0.02, 8, 1), 0x8f6a40, mats.plain, 0, 0.16, 0));
  g.add(colored(new THREE.CylinderGeometry(STOOL.r, STOOL.r * 1.06, 0.06, 10, 1), 0x9a3a2e, mats.plain, 0, STOOL.h - 0.03, 0));
  g.add(colored(new THREE.CylinderGeometry(STOOL.r * 0.8, STOOL.r * 0.8, 0.012, 10, 1), 0xc8584a, mats.plain, 0, STOOL.h + 0.002, 0));
  return g;
}
