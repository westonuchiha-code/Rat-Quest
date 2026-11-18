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
import { lyingOn } from '../render/ps1Material';
import { bakeVertexColor } from '../render/ps1Material';
import { STOOL, TABLE } from './layout';

export interface TavernMats {
  /** Lit by the room, textured: planks for the drum's cheeks. */
  wood: THREE.Material;
  /** Plain colour: everything else. */
  plain: THREE.Material;
  /** Textured (2026-11-18; without them, plain as before): cork for the stools and the dartboard, tin for the thimbles and the keg. */
  cork?: THREE.Material;
  tin?: THREE.Material;
  /** Unlit: the candle's flame. */
  glow: THREE.Material;
  /**
   * Plain colour for a thing that LIES ON another, `level` layers up (ps1Material's `lyingOn`): a rug's rings, a
   * dartboard's. Without it they are laid in `plain`, and can only be told apart by the gap between them.
   */
  layer?: (level: number) => THREE.Material;
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

/**
 * A thimble: a dented tin cup wider at its mouth, something dark in it. It stands on y = 0.
 * It is a CUP: open at its top, a rolled rim round its mouth, and what is in it lying below the rim, inside. (It was
 * three solid pucks, the drink's top two thousandths over the rim's: the two flickered through each other.)
 */
export function buildMug(mats: TavernMats, full = true): THREE.Group {
  const g = new THREE.Group();
  const TIN = 0xa9a79c;
  const RIM = 0xc9c6b6;
  const TOP = 0.156;
  // (Its seven sides: every ring and disc of it is turned to the same seven.)
  const START = -Math.PI / 2;
  const up = (geo: THREE.BufferGeometry, y: number, color: number): THREE.Mesh => {
    geo.rotateX(-Math.PI / 2);
    return colored(geo, color, mats.plain, 0, y, 0);
  };
  // Its wall, open at the top, and its foot.
  const tin = mats.tin ?? mats.plain;
  // (On the tin texture the colour is a tint over its own grey: a little lighter, so the two together come out as before.)
  const T = mats.tin ? 0xe4e2d8 : TIN;
  const R = mats.tin ? 0xf2f0e6 : RIM;
  g.add(colored(new THREE.CylinderGeometry(0.075, 0.058, 0.15, 7, 1, true), T, tin, 0, 0.075, 0));
  const foot = new THREE.CircleGeometry(0.058, 7, START);
  foot.rotateX(Math.PI / 2);
  g.add(colored(foot, T, tin, 0, 0, 0));
  // Its rim: a band round the mouth, and the flat of it on top, a ring with the mouth open in its middle.
  g.add(colored(new THREE.CylinderGeometry(0.082, 0.082, 0.022, 7, 1, true), R, tin, 0, TOP - 0.011, 0));
  g.add(up(new THREE.RingGeometry(0.064, 0.082, 7, 1, START), TOP, RIM));
  const lip = new THREE.RingGeometry(0.075, 0.082, 7, 1, START);
  lip.rotateX(Math.PI / 2);
  g.add(colored(lip, RIM, mats.plain, 0, TOP - 0.022, 0));
  // Inside: what is in it, a finger under the rim; or, empty, its dark bottom. And the inside of its wall down to that.
  const level = full ? TOP - 0.03 : 0.03;
  g.add(up(new THREE.CircleGeometry(0.064, 7, START), level, full ? 0x5a3418 : 0x3c3a36));
  const inside = new THREE.CylinderGeometry(0.064, 0.064, TOP - level, 7, 1, true);
  // (Turned inside out, so that it is its inner face that is seen.)
  inside.scale(-1, 1, 1);
  g.add(colored(inside, 0x6e6c64, mats.plain, 0, (TOP + level) / 2, 0));
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
  g.add(colored(new THREE.CylinderGeometry(R * 0.42, R * 0.42, H - 0.2, 9, 1), mats.cork ? 0xb89a78 : 0x7a5a38, mats.cork ? mats.wood : mats.plain, 0, H / 2, 0));
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
      // (Each a card's thickness and more above the one it overlaps: two thousandths between them flickered.)
      const card = colored(new THREE.BoxGeometry(0.09, 0.006, 0.13), i % 2 ? 0xe9e2cf : 0xdcd3bb, mats.plain, -0.22 + i * 0.075, H + 0.006 + i * 0.008, 0.34);
      card.rotation.y = -0.3 + i * 0.2;
      g.add(card);
      g.add(colored(new THREE.BoxGeometry(0.03, 0.007, 0.03), i % 2 ? 0xa02a22 : 0x24242a, mats.plain, -0.22 + i * 0.075, H + 0.014 + i * 0.008, 0.34));
    }
    g.add(colored(new THREE.BoxGeometry(0.09, 0.03, 0.13), 0x6a2f2a, mats.plain, 0.3, H + 0.015, -0.2));
    for (const [x, z] of [[0.02, 0.05], [-0.07, -0.04], [0.09, -0.06]]) g.add(colored(new THREE.BoxGeometry(0.055, 0.045, 0.05), 0xe2b04a, mats.plain, x, H + 0.023, z + 0.2));
  }
  return g;
}

export function buildStool(mats: TavernMats): THREE.Group {
  const g = new THREE.Group();
  // A cork, a little wider at its foot, and a bottle cap pressed down on it for a seat.
  g.add(colored(new THREE.CylinderGeometry(STOOL.r * 0.78, STOOL.r * 0.9, STOOL.h - 0.05, 8, 1), mats.cork ? 0xf4ece0 : 0xb98d5a, mats.cork ?? mats.plain, 0, (STOOL.h - 0.05) / 2, 0));
  g.add(colored(new THREE.CylinderGeometry(STOOL.r * 0.8, STOOL.r * 0.8, 0.02, 8, 1), 0x8f6a40, mats.plain, 0, 0.16, 0));
  // (The cap: red paint on tin, its dimples showing through.)
  g.add(colored(new THREE.CylinderGeometry(STOOL.r, STOOL.r * 1.06, 0.06, 10, 1), mats.tin ? 0xc85a4a : 0x9a3a2e, mats.tin ?? mats.plain, 0, STOOL.h - 0.03, 0));
  // (The cap's liner, standing well proud of it: a hair proud, the two tops flickered.)
  g.add(colored(new THREE.CylinderGeometry(STOOL.r * 0.74, STOOL.r * 0.8, 0.03, 10, 1), 0xc8584a, mats.plain, 0, STOOL.h + 0.012, 0));
  return g;
}

/** A row of thimbles along x, `count` of them `gap` apart, one or two lying on their sides. */
export function buildMugRow(mats: TavernMats, count: number, gap: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const mug = buildMug(mats, i % 3 !== 1);
    mug.position.set((i - (count - 1) / 2) * gap, 0, (i % 2 ? 0.05 : -0.04));
    if (i % 4 === 3) {
      mug.rotation.z = Math.PI / 2;
      mug.position.y = 0.08;
    }
    g.add(mug);
  }
  return g;
}

/** A keg: a tin can on its side in a cradle of two chocks, a tap in its end and a drip under it. Its tap faces +z. */
export function buildKeg(mats: TavernMats): THREE.Group {
  const g = new THREE.Group();
  const can = new THREE.CylinderGeometry(0.3, 0.3, 0.62, 10, 1);
  can.rotateX(Math.PI / 2);
  g.add(colored(can, mats.tin ? 0xd6d0bc : 0x8f8a78, mats.tin ?? mats.plain, 0, 0.36, 0));
  for (const z of [-0.26, 0, 0.26]) {
    const hoop = new THREE.CylinderGeometry(0.325, 0.325, 0.03, 10, 1, true);
    hoop.rotateX(Math.PI / 2);
    g.add(colored(hoop, 0x5a5648, mats.plain, 0, 0.36, z));
  }
  const label = new THREE.CylinderGeometry(0.314, 0.314, 0.26, 10, 1, true, -0.9, 1.8);
  label.rotateX(Math.PI / 2);
  g.add(colored(label, 0xb8452e, mats.plain, 0, 0.36, 0));
  for (const z of [-0.2, 0.2]) g.add(colored(new THREE.BoxGeometry(0.5, 0.1, 0.1), 0x7a5a38, mats.plain, 0, 0.05, z));
  g.add(colored(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 5, 1).rotateX(Math.PI / 2), 0xc9a040, mats.plain, 0, 0.2, 0.36));
  g.add(colored(new THREE.BoxGeometry(0.03, 0.07, 0.03), 0xc9a040, mats.plain, 0, 0.17, 0.42));
  return g;
}

/** A flat shape lying just over the floor, one colour. */
function flat(geo: THREE.BufferGeometry, color: number, mat: THREE.Material, y: number): THREE.Mesh {
  geo.rotateX(-Math.PI / 2);
  bakeVertexColor(geo, color, false);
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y;
  return m;
}

/**
 * A rug, lying on the floor (only drawn: nothing trips on it). Round, `r` across its middle: rings of colour and a
 * pale fringe. Or, with `w` and `d`, a runner: a border, a middle, and a row of diamonds down it.
 */
/** How far over the floor a rug's first layer lies, and each layer over the one under it. */
const RUG_Y = 0.016;
const RUG_STEP = 0.006;

export function buildRug(mats: TavernMats, look: { r?: number; w?: number; d?: number; colors: [number, number, number] }): THREE.Group {
  const g = new THREE.Group();
  const [edge, field, mark] = look.colors;
  const on = (level: number): THREE.Material => mats.layer?.(level) ?? mats.plain;
  if (look.r) {
    const R = look.r;
    // (Its rings do not overlap one another: they lie side by side, all one layer on the floor. Only the ring in its
    // middle lies on the field, and is a layer up.)
    g.add(flat(new THREE.RingGeometry(R * 0.94, R, 18), 0xd8ccac, on(1), RUG_Y));
    g.add(flat(new THREE.RingGeometry(R * 0.7, R * 0.94, 18), edge, on(1), RUG_Y));
    g.add(flat(new THREE.RingGeometry(R * 0.62, R * 0.7, 18), mark, on(1), RUG_Y));
    g.add(flat(new THREE.CircleGeometry(R * 0.62, 18), field, on(1), RUG_Y));
    g.add(flat(new THREE.RingGeometry(R * 0.2, R * 0.27, 12), mark, on(2), RUG_Y + RUG_STEP));
  } else {
    const w = look.w ?? 2;
    const d = look.d ?? 4;
    // (A runner is layers one on another: its fringe, its border, its field, its diamonds. Each is a layer up from the
    // last, in a material of its own layer, and a little over it besides.)
    g.add(flat(new THREE.PlaneGeometry(w, d + 0.3), 0xd8ccac, on(1), RUG_Y));
    g.add(flat(new THREE.PlaneGeometry(w, d), edge, on(2), RUG_Y + RUG_STEP));
    g.add(flat(new THREE.PlaneGeometry(w - 0.5, d - 0.5), field, on(3), RUG_Y + RUG_STEP * 2));
    const n = Math.max(1, Math.floor((d - 1) / 1.6));
    for (let i = 0; i < n; i++) {
      const dia = flat(new THREE.CircleGeometry(Math.min(0.42, w * 0.2), 4), mark, on(4), RUG_Y + RUG_STEP * 3);
      dia.position.z = (i - (n - 1) / 2) * 1.6;
      g.add(dia);
    }
  }
  return g;
}

/** A dance floor: `nx` by `nz` square tiles, each `tile` across, lit from under in two colours turn about. */
export function buildDanceFloor(nx: number, nz: number, tile: number, colors: [number, number]): THREE.Group {
  const g = new THREE.Group();
  // (Its dark bed lies on the floor, and its tiles on the bed: a layer each.)
  const mats = colors.map((c) => lyingOn(new THREE.MeshBasicMaterial({ color: c }), 2));
  const dark = lyingOn(new THREE.MeshBasicMaterial({ color: 0x15131c }), 1);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(nx * tile + 0.2, nz * tile + 0.2).rotateX(-Math.PI / 2), dark);
  base.position.y = 0.014;
  g.add(base);
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(tile * 0.9, tile * 0.9).rotateX(-Math.PI / 2), mats[(i + k) % 2]);
      t.position.set((i - (nx - 1) / 2) * tile, 0.02, (k - (nz - 1) / 2) * tile);
      t.userData.tile = (i + k) % 2;
      g.add(t);
    }
  }
  return g;
}

/**
 * A string of little lights from the origin to (dx, 0, dz), sagging `sag` in the middle: a wire and `count` bulbs,
 * each one of a few colours, unlit so that they glow.
 */
/**
 * (`hang`: how far up each of its two ends is hung from, by a wire of its own, where that end is not at a wall: 0 for
 * an end that is made fast to one. An end left in the air with nothing holding it is what the owner saw, 2026-11-16:
 * "string light decorations ending in mid air".)
 */
export function buildBulbs(dx: number, dz: number, sag: number, count: number, hang: [number, number] = [0, 0]): THREE.Group {
  const g = new THREE.Group();
  const colors = [0xffd36a, 0xff6a5a, 0x6ad0ff, 0x8aff8a, 0xff8af0];
  const mats = colors.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const wire = new THREE.MeshBasicMaterial({ color: 0x1c1a20 });
  const at = (u: number): THREE.Vector3 => new THREE.Vector3(dx * u, -sag * 4 * u * (1 - u), dz * u);
  // (A wire thick enough to be a line on the screen, not a row of dots.)
  const WIRE = 0.022;
  // Each end: made fast with a knot; and, hung, a wire from it straight up to what it hangs from, with a hook there.
  hang.forEach((up, e) => {
    const end = at(e);
    const knot = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), wire);
    knot.position.copy(end);
    g.add(knot);
    if (up <= 0) return;
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(WIRE, WIRE, up, 3, 1), wire);
    drop.position.set(end.x, end.y + up / 2, end.z);
    g.add(drop);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), wire);
    hook.position.set(end.x, end.y + up - 0.025, end.z);
    g.add(hook);
  });
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const a = at(i / steps);
    const b = at((i + 1) / steps);
    const len = a.distanceTo(b);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(WIRE, WIRE, len, 3, 1), wire);
    seg.position.copy(a).add(b).multiplyScalar(0.5);
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    g.add(seg);
  }
  for (let i = 0; i < count; i++) {
    const p = at((i + 0.5) / count);
    const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), mats[i % mats.length]);
    bulb.position.set(p.x, p.y - 0.09, p.z);
    g.add(bulb);
  }
  return g;
}

/**
 * A shelf on a wall, facing +z, `width` long: a plank on two brackets and a row of bottles and jars on it, each a
 * different shape and colour (some with a cork, one fallen over).
 */
export function buildBottles(mats: TavernMats, width: number): THREE.Group {
  const g = new THREE.Group();
  g.add(colored(new THREE.BoxGeometry(width, 0.06, 0.34), 0x7a5a38, mats.plain, 0, -0.03, 0.17));
  for (const x of [-width / 2 + 0.25, width / 2 - 0.25]) g.add(colored(new THREE.BoxGeometry(0.06, 0.26, 0.26), 0x5a4028, mats.plain, x, -0.18, 0.13));
  const glass = [0x3f7f5a, 0x7a4a2a, 0x3a5f8f, 0x8f3a3a, 0xb8a04a, 0x5a3a7a];
  const n = Math.max(2, Math.floor(width / 0.36));
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (width - 0.4) / Math.max(1, n - 1);
    const tall = 0.28 + ((i * 7) % 5) * 0.05;
    const fat = 0.075 + ((i * 3) % 4) * 0.012;
    const c = glass[(i * 5) % glass.length];
    if (i % 7 === 4) {
      // (One lying on its side.)
      const lying = colored(new THREE.CylinderGeometry(fat, fat, tall, 6, 1).rotateZ(Math.PI / 2), c, mats.plain, x, fat, 0.19);
      g.add(lying);
      continue;
    }
    g.add(colored(new THREE.CylinderGeometry(fat, fat * 1.05, tall * 0.62, 6, 1), c, mats.plain, x, tall * 0.31, 0.17));
    g.add(colored(new THREE.CylinderGeometry(fat * 0.38, fat, tall * 0.2, 6, 1), c, mats.plain, x, tall * 0.72, 0.17));
    g.add(colored(new THREE.CylinderGeometry(fat * 0.36, fat * 0.38, tall * 0.18, 6, 1), c, mats.plain, x, tall * 0.91, 0.17));
    if (i % 2 === 0) g.add(colored(new THREE.CylinderGeometry(fat * 0.3, fat * 0.34, 0.05, 5, 1), 0xb98d5a, mats.plain, x, tall + 0.02, 0.17));
    g.add(colored(new THREE.BoxGeometry(fat * 1.5, tall * 0.2, 0.01), 0xe9e2cf, mats.plain, x, tall * 0.3, 0.17 + fat * 0.98));
  }
  return g;
}

/** A dartboard on a wall, facing +z: a slice of cork ringed in colours, and three pins stuck in it for darts. */
export function buildDartboard(mats: TavernMats): THREE.Group {
  const g = new THREE.Group();
  // (The cork, and its rings painted on it one over another: each ring a layer up from the one it lies on.)
  const disc = (r: number, color: number, z: number, level: number): THREE.Mesh => colored(new THREE.CylinderGeometry(r, r, 0.03, 12, 1).rotateX(Math.PI / 2), color, level ? mats.layer?.(level) ?? mats.plain : mats.plain, 0, 0, z);
  g.add(disc(0.5, 0x8f6a40, 0.03, 0));
  g.add(disc(0.44, 0x2a2a30, 0.04, 1));
  g.add(disc(0.34, 0xe2d8bc, 0.046, 2));
  g.add(disc(0.22, 0x8f2a2a, 0.052, 3));
  g.add(disc(0.1, 0xe2d8bc, 0.058, 4));
  g.add(disc(0.04, 0x8f2a2a, 0.064, 5));
  for (const [x, y, lean] of [[0.07, 0.03, 0.2], [-0.2, 0.17, -0.3], [0.26, -0.31, 0.45]]) {
    const pin = new THREE.Group();
    pin.add(colored(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 4, 1).rotateX(Math.PI / 2), 0xc9c6b6, mats.plain, 0, 0, 0.14));
    pin.add(colored(new THREE.BoxGeometry(0.09, 0.09, 0.012), 0x3a8f6a, mats.plain, 0, 0, 0.27));
    pin.add(colored(new THREE.BoxGeometry(0.012, 0.09, 0.09), 0x3a8f6a, mats.plain, 0, 0, 0.24));
    pin.position.set(x, y, 0.06);
    pin.rotation.set(-lean * 0.5, lean, 0);
    g.add(pin);
  }
  return g;
}

