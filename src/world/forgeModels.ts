/**
 * The furnace's scenery, drawn (world/forge.ts has their sizes, what is solid of each and the clocks they go by).
 * Each is a few plain shapes with a picture on them: the pictures do the work (the owner, of the first fire bowl:
 * "almost too much ... a little less detailed with a nice texture like everything else in the game").
 * Fire and hot metal are drawn unlit, so they glow in a dark hall; each lights the room round it with a light of its own.
 */
import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';
import { FORGE, bellowsAt, cogsAt, ladleAt, type ForgeSpec } from './forge';

export interface ForgeMats {
  /** Lit, pictured: firebrick, cast iron, wrought iron, planks, bark and end grain (greys: the corners give the colour), leather (greys), casting sand, coal. */
  brick: THREE.Material;
  cast: THREE.Material;
  iron: THREE.Material;
  wood: THREE.Material;
  bark: THREE.Material;
  endGrain: THREE.Material;
  leather: THREE.Material;
  sand: THREE.Material;
  coal: THREE.Material;
  /** Unlit, pictured: live coals. And the burnt inside of a thing, on both its faces. */
  coals: THREE.Material;
  char: THREE.Material;
  /** Unlit, plain: flames and molten metal (their colour is in their corners). */
  flame: THREE.Material;
  /** A plain unlit material of its own, for a thing whose glow changes as time goes (its `flash` is the glow). */
  glow: () => THREE.ShaderMaterial;
}

export interface ForgeLight { x: number; y: number; z: number; r: number; color: THREE.Color; power: number; flash: number; flicker: number; phase: number }
export interface ForgeModel {
  group: THREE.Group;
  /** Its moving parts, put where they are at a time. */
  update?: (time: number) => void;
  /** Tongues of fire, for the room to flicker with its others. */
  flames: Array<{ mesh: THREE.Mesh; base: number; phase: number }>;
  /** What it lights the room with (in the room's own places). The model may turn one up and down as it goes. */
  lights: ForgeLight[];
}

/** A picture laid over a shape by where its faces are (as the room's own boxes are): one picture to `tile` of length. */
function worldUv(geo: THREE.BufferGeometry, tile: number): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const [u, v] = ny > 0.5 ? [pos.getX(i), pos.getZ(i)] : nx > 0.5 ? [pos.getZ(i), pos.getY(i)] : [pos.getX(i), pos.getY(i)];
    uv[i * 2] = u / tile;
    uv[i * 2 + 1] = v / tile;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** A box with its middle at (x, y, z), pictured by its faces' places. */
function box(w: number, h: number, d: number, tile: number, tint: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return bakeVertexColor(worldUv(g, tile), tint);
}

/** A shape turned on the lathe from (radius, height) points, its picture wrapped `around` times. */
function lathe(points: Array<[number, number]>, sides: number, around: number, tint: number, shade = true): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * around);
  return bakeVertexColor(g, tint, shade);
}

/** One tongue of flame (as the fire bowl's): red-orange at its root, pale yellow at its tip. `flat`: pressed thin, front to back. */
function tongue(radius: number, height: number, hot: number, flat = 1): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(radius, height, 6, 2);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getY(i) / height + 0.5;
    col.set([1, 0.34 + 0.6 * u + hot * 0.1, 0.05 + (0.38 + hot * 0.3) * u * u], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.scale(1, 1, flat);
  return g;
}

/** A doorway with a round head, `w` wide and `h` high to the crown, its sill on y = 0. */
function archPath<T extends THREE.Path>(path: T, w: number, h: number): T {
  path.moveTo(-w / 2, 0);
  path.lineTo(w / 2, 0);
  path.lineTo(w / 2, h - w / 2);
  path.absarc(0, h - w / 2, w / 2, 0, Math.PI, false);
  path.lineTo(-w / 2, 0);
  return path;
}

/** A length of chain hanging from `top` down to `bottom` (as the room's own chains are made). */
function chain(top: number, bottom: number): THREE.BufferGeometry | null {
  const pos: number[] = [];
  const nrm: number[] = [];
  for (let y = top, i = 0; y > bottom; y -= 0.2, i++) {
    const link = new THREE.TorusGeometry(0.09, 0.03, 4, 6).toNonIndexed();
    link.rotateY(i % 2 ? Math.PI / 2 : 0);
    link.rotateZ(Math.PI / 2);
    link.translate(0, y, 0);
    pos.push(...(link.attributes.position.array as Float32Array));
    nrm.push(...(link.attributes.normal.array as Float32Array));
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return bakeVertexColor(g, 0x5a5a62);
}

/** How a cast glows as it cools: white-yellow, orange, dull red, and then the dark of the iron. */
export function heatColor(heat: number, out = new THREE.Color()): THREE.Color {
  const stops: Array<[number, number, number, number]> = [[0, 0.02, 0.012, 0.012], [0.12, 0.2, 0.03, 0.015], [0.4, 0.78, 0.2, 0.03], [0.75, 0.98, 0.55, 0.1], [1, 1, 0.86, 0.42]];
  const h = Math.max(0, Math.min(1, heat));
  for (let i = 1; i < stops.length; i++) {
    if (h <= stops[i][0]) {
      const t = (h - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return out.setRGB(stops[i - 1][1] + (stops[i][1] - stops[i - 1][1]) * t, stops[i - 1][2] + (stops[i][2] - stops[i - 1][2]) * t, stops[i - 1][3] + (stops[i][3] - stops[i - 1][3]) * t);
    }
  }
  return out.setRGB(1, 0.86, 0.42);
}

/** A cog wheel's outline: `teeth` blunt teeth about the pitch circle `r` (one of them along +x), four windows between hub and rim. */
export function cogShape(teeth: number, r: number, tooth: number): THREE.Shape {
  const s = new THREE.Shape();
  const pitch = (Math.PI * 2) / teeth;
  const root = r - tooth * 0.55;
  const tip = r + tooth * 0.45;
  for (let i = 0; i < teeth; i++) {
    const a = i * pitch;
    const pts: Array<[number, number]> = [[root, a - 0.27 * pitch], [tip, a - 0.15 * pitch], [tip, a + 0.15 * pitch], [root, a + 0.27 * pitch]];
    for (const [rad, ang] of pts) {
      if (i === 0 && rad === root && ang < 0) s.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      else s.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    }
  }
  s.closePath();
  const inner = r * 0.3;
  const outer = r * 0.72;
  for (let k = 0; k < 4; k++) {
    const a0 = (k * Math.PI) / 2 + 0.26;
    const a1 = ((k + 1) * Math.PI) / 2 - 0.26;
    const hole = new THREE.Path();
    hole.absarc(0, 0, outer, a0, a1, false);
    hole.absarc(0, 0, inner, a1 - 0.2, a0 + 0.2, true);
    hole.closePath();
    s.holes.push(hole);
  }
  return s;
}

export function buildForge(s: ForgeSpec, mats: ForgeMats, roof: number): ForgeModel {
  const group = new THREE.Group();
  const yaw = s.yaw ?? 0;
  group.position.set(s.x, s.y, s.z);
  group.rotation.y = yaw;
  const flames: ForgeModel['flames'] = [];
  const lights: ForgeLight[] = [];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = group): THREE.Mesh => {
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  };
  /** A light at a place of its own (given in the thing's own frame). */
  const light = (lx: number, ly: number, lz: number, r: number, color: number, power: number, flicker: number): ForgeLight => {
    const L = { x: s.x + lx * Math.cos(yaw) + lz * Math.sin(yaw), y: s.y + ly, z: s.z - lx * Math.sin(yaw) + lz * Math.cos(yaw), r, color: new THREE.Color(color), power, flash: 0, flicker, phase: s.x * 3.1 + s.z * 1.7 };
    lights.push(L);
    return L;
  };
  const phase = s.phase ?? 0;
  const F = FORGE;

  if (s.what === 'furnace') {
    const f = F.furnace;
    const front = f.d / 2;
    add(box(f.foot.w, f.foot.h, f.foot.d, 3, 0xffffff, 0, f.foot.h / 2, 0), mats.cast);
    add(box(f.w, f.h - f.foot.h, f.d, 6, 0xffffff, 0, (f.h + f.foot.h) / 2, 0), mats.brick);
    // An iron coping, and one iron hoop round the brick (a hair proud of it, to be seen).
    add(box(f.w, f.cap, f.d, 3, 0xffffff, 0, f.h + f.cap / 2, 0), mats.cast);
    add(box(f.w + 0.07, 0.3, f.d + 0.07, 1, 0xffffff, 0, f.h * 0.74, 0), mats.iron);
    // The stack, up into the roof.
    const from = f.h + f.cap;
    const tall = Math.max(0.2, (s.top ?? roof) - s.y - from);
    const stack = new THREE.CylinderGeometry(f.stack, f.stack, tall, 10, 1, true);
    const suv = stack.attributes.uv;
    for (let i = 0; i < suv.count; i++) suv.setXY(i, suv.getX(i) * 4, (suv.getY(i) * tall) / 1.2);
    stack.translate(0, from + tall / 2, 0);
    add(bakeVertexColor(stack, 0xb8b4b0), mats.iron);
    add(lathe([[f.stack + 0.09, from], [f.stack + 0.09, from + 0.24], [f.stack, from + 0.3]], 10, 4, 0xffffff), mats.iron);
    // The mouth: an iron surround standing out from the brick, the burnt dark inside it, coals, and the fire.
    const m = f.mouth;
    const inside = new THREE.ShapeGeometry(archPath(new THREE.Shape(), m.w, m.h), 6);
    inside.translate(0, f.foot.h, front + 0.012);
    add(bakeVertexColor(inside, 0xffffff, false), mats.char);
    const ring = archPath(new THREE.Shape(), m.w + 0.48, m.h + 0.24);
    ring.holes.push(archPath(new THREE.Path(), m.w, m.h));
    const surround = new THREE.ExtrudeGeometry(ring, { depth: 0.2, bevelEnabled: false, curveSegments: 6 });
    surround.translate(0, f.foot.h, front);
    add(bakeVertexColor(surround, 0xffffff), mats.iron);
    const heap = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    heap.scale(m.w * 0.46, 0.32, 0.17);
    const huv = heap.attributes.uv;
    for (let i = 0; i < huv.count; i++) huv.setXY(i, huv.getX(i) * 3, huv.getY(i) * 1.5);
    heap.translate(0, f.foot.h, front + 0.03);
    add(bakeVertexColor(heap, 0xffffff, false), mats.coals);
    const fire = (radius: number, height: number, hot: number, x: number, ph: number): void => {
      const base = f.foot.h + 0.14 + height / 2;
      const mesh = add(tongue(radius, height, hot, 0.3), mats.flame);
      mesh.position.set(x, base, front + 0.1);
      flames.push({ mesh, base, phase: ph });
    };
    fire(0.52, 1.6, 0, 0.05, 0);
    fire(0.3, 1.1, 1, 0.02, 1.9);
    fire(0.32, 1.0, 0.3, -0.52, 3.3);
    fire(0.28, 0.8, 0.5, 0.56, 4.6);
    light(0, f.foot.h + 1, front + 1.1, 13, 0xff7a28, 1.25, 0.22);
  } else if (s.what === 'bellows') {
    const B = F.bellows;
    // The frame: four posts and a deck of planks. The deck is the fixed board; what swings is under it.
    add(box(B.long, 0.1, B.wide, 1.5, 0xffffff, -B.long / 2, B.top - 0.05, 0), mats.wood);
    for (const px of [-0.12, -B.long + 0.12]) for (const pz of [-1, 1]) add(box(0.2, B.top - 0.1, 0.2, 1.5, 0xd8d0c4, px, (B.top - 0.1) / 2, pz * (B.wide / 2 - 0.12)), mats.wood);
    // The lower board, hung from the nozzle end: a pear shape, broad at the far end.
    const side: Array<[number, number]> = [[0.04, 0.1], [0.5, 0.3], [1.0, 0.5], [1.5, 0.64], [1.9, 0.63], [2.15, 0.46], [2.3, 0.02]];
    const loop: Array<[number, number]> = [...side, ...side.slice(0, -1).reverse().map(([u, w]) => [u, -w] as [number, number])];
    const pear = new THREE.Shape();
    loop.forEach(([u, w], i) => (i === 0 ? pear.moveTo(-u, w) : pear.lineTo(-u, w)));
    pear.closePath();
    const board = new THREE.ExtrudeGeometry(pear, { depth: 0.08, bevelEnabled: false });
    board.rotateX(Math.PI / 2);
    const hingeY = B.top - 0.14;
    const pivot = new THREE.Group();
    pivot.position.set(0, hingeY, 0);
    group.add(pivot);
    add(bakeVertexColor(board, 0xc8b89c), mats.wood, pivot);
    // The leather: folds between the deck and the board, every other one drawn in.
    const ROWS = 6;
    const K = loop.length;
    const leather = new THREE.BufferGeometry();
    const lp = new Float32Array(ROWS * K * 6 * 3);
    const lu = new Float32Array(ROWS * K * 6 * 2);
    let q = 0;
    for (let j = 0; j < ROWS; j++) for (let k = 0; k < K; k++) for (const [dj, dk] of [[0, 0], [1, 1], [0, 1], [0, 0], [1, 0], [1, 1]]) lu.set([((k + dk) / K) * 6, ((j + dj) / ROWS) * 2], q++ * 2);
    leather.setAttribute('position', new THREE.BufferAttribute(lp, 3));
    leather.setAttribute('uv', new THREE.BufferAttribute(lu, 2));
    leather.setAttribute('color', new THREE.BufferAttribute(new Float32Array(ROWS * K * 6 * 3).fill(0).map((_, i) => [0.62, 0.36, 0.2][i % 3] * ((Math.floor(i / 18 / K) % 2) ? 0.82 : 1)), 3));
    const at = (j: number, k: number, open: number, out: Float32Array, o: number): void => {
      const [u, w] = loop[((k % K) + K) % K];
      const a = (open * j) / ROWS;
      const inset = j % 2 ? 0.84 : 1;
      out[o] = -u * Math.cos(a);
      out[o + 1] = hingeY - u * Math.sin(a);
      out[o + 2] = w * inset;
    };
    const fold = (open: number): void => {
      let o = 0;
      for (let j = 0; j < ROWS; j++) for (let k = 0; k < K; k++) for (const [dj, dk] of [[0, 0], [1, 1], [0, 1], [0, 0], [1, 0], [1, 1]]) {
        at(j + dj, k + dk, open, lp, o);
        o += 3;
      }
      leather.attributes.position.needsUpdate = true;
      leather.computeVertexNormals();
    };
    fold(B.open[0]);
    add(leather, mats.leather).frustumCulled = false;
    // The nozzle, out of the frame's end.
    const nozzle = new THREE.CylinderGeometry(0.06, 0.15, B.nozzle, 7, 1);
    nozzle.rotateZ(-Math.PI / 2);
    nozzle.translate(B.nozzle / 2 - 0.05, hingeY - 0.03, 0);
    add(bakeVertexColor(nozzle, 0xffffff), mats.iron);
    const update = (time: number): void => {
      const open = bellowsAt(time, phase);
      pivot.rotation.z = open;
      fold(open);
    };
    return { group, update, flames, lights };
  } else if (s.what === 'ladle') {
    const L = F.ladle;
    const hang = s.top ?? 7;
    group.position.y = s.y + hang;
    const bucket = new THREE.Group();
    group.add(bucket);
    add(lathe([[0, -0.78], [0.6, -0.78], [0.68, -0.66], [0.82, 0.3], [L.r + 0.02, 0.36], [L.r, 0.42], [0.8, 0.42]], 12, 4, 0xffffff), mats.iron, bucket);
    add(lathe([[0.8, 0.42], [0.76, 0.32], [0.74, 0.24]], 12, 3, 0xffffff, false), mats.char, bucket);
    const melt = new THREE.CircleGeometry(0.75, 12);
    melt.rotateX(-Math.PI / 2);
    melt.translate(0, 0.25, 0);
    const mc = new Float32Array(melt.attributes.position.count * 3);
    for (let i = 0; i < melt.attributes.position.count; i++) {
      const rr = Math.hypot(melt.attributes.position.getX(i), melt.attributes.position.getZ(i)) / 0.75;
      mc.set([1, 0.9 - 0.42 * rr, 0.5 - 0.42 * rr], i * 3);
    }
    melt.setAttribute('color', new THREE.BufferAttribute(mc, 3));
    add(melt, mats.flame, bucket);
    // The lip it pours from, and the pins it turns on.
    add(box(0.26, 0.1, 0.3, 1, 0xffffff, L.lip - 0.1, 0.39, 0), mats.iron, bucket);
    const pin = new THREE.CylinderGeometry(0.07, 0.07, 2.0, 6);
    pin.rotateX(Math.PI / 2);
    add(bakeVertexColor(pin, 0xffffff), mats.iron);
    // The bail over it, and the chain up into the roof.
    const bail = new THREE.TorusGeometry(0.96, 0.05, 5, 10, Math.PI);
    bail.rotateY(Math.PI / 2);
    add(bakeVertexColor(bail, 0xffffff), mats.iron);
    const links = chain(roof - s.y - hang, 0.96);
    if (links) add(links, mats.iron);
    // The stream: a thin fall of metal from the lip to the mould, there only while it pours.
    const full = s.drop ?? hang - F.mould.h;
    const sg = new THREE.CylinderGeometry(0.09, 0.05, 1, 6, 4);
    sg.translate(0, -0.5, 0);
    const sc = new Float32Array(sg.attributes.position.count * 3);
    for (let i = 0; i < sg.attributes.position.count; i++) {
      const u = -sg.attributes.position.getY(i);
      sc.set([1, 0.95 - 0.4 * u, 0.62 - 0.5 * u], i * 3);
    }
    sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    const stream = add(sg, mats.flame);
    const splash = add(tongue(0.2, 0.5, 1), mats.flame);
    const sparks = Array.from({ length: 6 }, () => {
      const g = new THREE.TetrahedronGeometry(0.05);
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).map((_, i) => [1, 0.85, 0.4][i % 3]), 3));
      return add(g, mats.flame);
    });
    const glow = light(0, hang + 0.4, 0, 5, 0xff8a30, 0.5, 0.08);
    const update = (time: number): void => {
      const a = ladleAt(time, phase);
      const ang = a.tip * L.tip;
      bucket.rotation.z = -ang;
      // Where the lip is now, and where the stream runs from and to under it.
      const lx = L.lip * Math.cos(ang) + 0.4 * Math.sin(ang);
      const ly = -L.lip * Math.sin(ang) + 0.4 * Math.cos(ang);
      const reach = full + ly;
      const topY = ly - reach * a.tail;
      const len = reach * a.stream - reach * a.tail;
      stream.visible = a.stream > 0 && len > 0.02;
      stream.position.set(lx, topY, 0);
      stream.scale.set(1 + 0.12 * Math.sin(time * 17), Math.max(0.02, len), 1 + 0.12 * Math.cos(time * 13));
      const landing = a.stream >= 1 && a.tail < 1;
      splash.visible = landing;
      const k = 0.8 + 0.3 * Math.sin(time * 23) * Math.cos(time * 13);
      splash.position.set(lx, -full + 0.2 * k, 0);
      splash.scale.set(k, k, k);
      sparks.forEach((sp, i) => {
        sp.visible = landing;
        const u = (time * 2.2 + i * 0.37) % 1;
        const dir = i * 2.4 + Math.floor(time * 2.2 + i * 0.37) * 1.3;
        sp.position.set(lx + Math.cos(dir) * 0.9 * u, -full + 2.4 * u - 3.2 * u * u, Math.sin(dir) * 0.9 * u);
      });
      glow.power = 0.5 + 0.5 * a.tip;
    };
    update(0);
    return { group, update, flames, lights };
  } else if (s.what === 'mould') {
    const M = F.mould;
    add(box(M.w, M.h, M.d, 1.5, 0xffffff, 0, M.h / 2, 0), mats.cast);
    // Packed with sand, and the shape of a bar pressed into it.
    add(box(M.w - 0.24, 0.03, M.d - 0.24, 1.5, 0xffffff, 0, M.h + 0.015, 0), mats.sand);
    const cast = new THREE.PlaneGeometry(M.w - 0.62, 0.3);
    cast.rotateX(-Math.PI / 2);
    cast.translate(0, M.h + 0.036, 0);
    const hot = mats.glow();
    add(bakeVertexColor(cast, 0xffffff, false), hot);
    const glow = light(0, M.h + 0.5, 0, 7, 0xff7a20, 0, 0.06);
    const update = (time: number): void => {
      const heat = ladleAt(time, phase).heat;
      heatColor(heat, hot.uniforms.tint.value as THREE.Color);
      glow.power = 1.1 * heat;
    };
    update(0);
    return { group, update, flames, lights };
  } else if (s.what === 'ingots') {
    const I = F.ingots;
    const b = I.bar;
    const end = new THREE.Shape();
    end.moveTo(-b.wide / 2, 0);
    end.lineTo(b.wide / 2, 0);
    end.lineTo(b.top / 2, b.high);
    end.lineTo(-b.top / 2, b.high);
    end.closePath();
    const bar = (alongX: boolean, x: number, y: number, z: number, mat: THREE.Material, tint: number): void => {
      const g = new THREE.ExtrudeGeometry(end, { depth: b.long, bevelEnabled: false });
      g.translate(0, 0, -b.long / 2);
      if (alongX) g.rotateY(Math.PI / 2);
      g.translate(x, y, z);
      add(bakeVertexColor(g, tint), mat);
    };
    for (const bx of [-0.46, 0.46]) add(box(0.16, 0.1, I.d, 1.5, 0xd8d0c4, bx, 0.05, 0), mats.wood);
    for (const z of [-0.5, 0, 0.5]) bar(true, 0, 0.1, z, mats.iron, 0xd0d4d8);
    for (const x of [-0.5, 0, 0.5]) bar(false, x, 0.1 + b.high, 0, mats.iron, 0xd0d4d8);
    // The top two, not long out of the mould: each cooling at its own pace.
    const hot = [mats.glow(), mats.glow()];
    bar(true, 0, 0.1 + b.high * 2, -0.26, hot[0], 0xffffff);
    bar(true, 0, 0.1 + b.high * 2, 0.26, hot[1], 0xffffff);
    const glow = light(0, I.h + 0.5, 0, 5.5, 0xff6a20, 0.55, 0.05);
    const update = (time: number): void => {
      hot.forEach((m, i) => heatColor(0.46 + 0.1 * Math.sin(time * (0.5 + i * 0.17) + i * 2 + phase), m.uniforms.tint.value as THREE.Color).multiplyScalar(1.5));
      glow.power = 0.5 + 0.08 * Math.sin(time * 0.6 + phase);
    };
    update(0);
    return { group, update, flames, lights };
  } else if (s.what === 'cogs') {
    const C = F.cogs;
    const wheel = (c: { r: number; teeth: number }, tint: number, x: number, y: number): THREE.Group => {
      const w = new THREE.Group();
      w.position.set(x, y, 0.12);
      group.add(w);
      const g = new THREE.ExtrudeGeometry(cogShape(c.teeth, c.r, C.tooth), { depth: C.thick, bevelEnabled: false, curveSegments: 5 });
      add(bakeVertexColor(g, tint), mats.iron, w);
      const hub = new THREE.CylinderGeometry(c.r * 0.16, c.r * 0.16, C.thick + 0.16, 8);
      hub.rotateX(Math.PI / 2);
      hub.translate(0, 0, C.thick / 2);
      add(bakeVertexColor(hub, 0x8a8a90), mats.iron, w);
      // (Its axle, back into the wall: this does not turn to the eye, being round.)
      const axle = new THREE.CylinderGeometry(c.r * 0.1, c.r * 0.1, 0.14, 6);
      axle.rotateX(Math.PI / 2);
      axle.translate(x, y, 0.075);
      add(bakeVertexColor(axle, 0x6a6a70), mats.iron);
      return w;
    };
    const big = wheel(C.big, 0xd8dade, 0, 0);
    const reach = C.big.r + C.small.r;
    const small = wheel(C.small, 0xffc860, Math.cos(C.at) * reach, Math.sin(C.at) * reach);
    // (A lamp's worth of light on them: they hang high on a dim wall.)
    light(reach * 0.4, 0.6, 1.6, 6, 0xffd9a0, 0.7, 0);
    const update = (time: number): void => {
      const a = cogsAt(time, phase);
      big.rotation.z = a.big;
      small.rotation.z = a.small;
    };
    update(0);
    return { group, update, flames, lights };
  } else if (s.what === 'bunker') {
    const K = F.bunker;
    const wall = K.h - 0.04;
    for (const z of [-1, 1]) add(box(K.w, wall, 0.1, 1.5, 0xffffff, 0, wall / 2, z * (K.d / 2 - 0.05)), mats.wood);
    for (const x of [-1, 1]) add(box(0.1, wall, K.d - 0.2, 1.5, 0xe6e0d6, x * (K.w / 2 - 0.05), wall / 2, 0), mats.wood);
    // An iron strap up each corner.
    for (const x of [-1, 1]) for (const z of [-1, 1]) add(box(0.16, wall + 0.02, 0.16, 1, 0xffffff, x * (K.w / 2 - 0.07), (wall + 0.02) / 2, z * (K.d / 2 - 0.07)), mats.iron);
    // Coal to the brim: all but level, and a few lumps standing out of it.
    const heap = new THREE.SphereGeometry(1, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    heap.scale(K.w / 2 - 0.1, 0.16, K.d / 2 - 0.1);
    const huv = heap.attributes.uv;
    for (let i = 0; i < huv.count; i++) huv.setXY(i, huv.getX(i) * 4, huv.getY(i) * 2);
    heap.translate(0, K.h - 0.12, 0);
    add(bakeVertexColor(heap, 0xffffff), mats.coal);
    for (const [x, z, t] of [[-0.6, 0.2, 0.4], [0.5, -0.3, 1.3], [0.15, 0.35, 2.2]] as Array<[number, number, number]>) {
      const lump = box(0.26, 0.2, 0.22, 0.6, 0xffffff, 0, 0, 0);
      const m = add(lump, mats.coal);
      m.position.set(x, K.h + 0.02, z);
      m.rotation.set(0.3, t, 0.2);
    }
  } else if (s.what === 'anvil') {
    const A = F.anvil;
    const stump = new THREE.CylinderGeometry(A.stump.w / 2 - 0.02, A.stump.w / 2 + 0.03, A.stump.h, 9, 1, true);
    const suv = stump.attributes.uv;
    for (let i = 0; i < suv.count; i++) suv.setX(i, suv.getX(i) * 3);
    stump.translate(0, A.stump.h / 2, 0);
    add(bakeVertexColor(stump, 0x8a6a48), mats.bark);
    const cut = new THREE.CircleGeometry(A.stump.w / 2 - 0.02, 9);
    cut.rotateX(-Math.PI / 2);
    cut.translate(0, A.stump.h, 0);
    add(bakeVertexColor(cut, 0xd8b88a, false), mats.endGrain);
    // The anvil: one outline, feet, waist, face, horn and heel, cut through the thickness of it.
    const o = new THREE.Shape();
    const pts: Array<[number, number]> = [[-0.34, 0], [0.34, 0], [0.34, 0.07], [0.17, 0.13], [0.17, 0.27], [0.34, 0.33], [0.6, 0.47], [0.24, A.h], [-0.6, A.h], [-0.6, 0.41], [-0.34, 0.33], [-0.17, 0.27], [-0.17, 0.13], [-0.34, 0.07]];
    pts.forEach(([x, y], i) => (i === 0 ? o.moveTo(x, y) : o.lineTo(x, y)));
    o.closePath();
    const body = new THREE.ExtrudeGeometry(o, { depth: A.d, bevelEnabled: false });
    body.translate(0, A.stump.h, -A.d / 2);
    add(bakeVertexColor(body, 0xffffff), mats.iron);
  }
  return { group, flames, lights };
}
