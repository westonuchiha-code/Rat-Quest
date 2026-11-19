/**
 * HOUSEHOLD JUNK AT A RAT'S SIZE (2026-11-18; the owner: "making some new objects for the game"). What a big folk's
 * house leaves lying about, as tall to the knight as furniture, in the same spirit as the Club's (a cable drum for a
 * table, a cork for a stool, a thimble for a mug). Sizes, and what is solid of each, are `JUNK` in layout.ts. Each is
 * built standing on y = 0 facing +z, and textured all over (cheese, card, wax, thread, tin, wood).
 */
import * as THREE from 'three';
import { bakeVertexColor } from '../render/ps1Material';
import { JUNK, type JunkKind } from './layout';

export interface JunkMats {
  tin: THREE.Material;
  wood: THREE.Material;
  card: THREE.Material;
  /** (Seen from both sides: the cut faces of the wheel are single planes.) */
  cheese: THREE.Material;
  wax: THREE.Material;
  thread: THREE.Material;
  /** Plain colour: small bits (a wick, match heads, the oil in a tin). */
  plain: THREE.Material;
  /** Unlit: a flame. */
  glow: THREE.Material;
}

const part = (geo: THREE.BufferGeometry, color: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh => {
  bakeVertexColor(geo, color);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
};

/** The model; and, for a candle, its flame (to flicker, and the place its light comes from). */
/**
 * The model; and what of it moves: a candle's flame (to flicker, and the place its light comes from), a spool's loose
 * thread (to sway: hung from where it leaves the reel), and `tick(time)` for what moves by its own clock: a teacup's
 * steam (wisps that rise and fade), a candle's drop of wax running down, a marble's glint. Whatever `tick` moves is
 * tagged (userData.moves), so that the room leaves it out when it gathers its still dressing (world/chamber.ts).
 */
export function buildJunk(what: JunkKind, mats: JunkMats): { group: THREE.Group; flame?: THREE.Mesh; sway?: THREE.Object3D; tick?: (time: number) => void } {
  const g = new THREE.Group();
  const J = JUNK[what];
  if (what === 'candle') {
    // A bottle cap for a dish, a pool of wax in it, the stub, its wick, its flame.
    g.add(part(new THREE.CylinderGeometry(0.25, 0.27, 0.08, 12, 1), 0xd85a4a, mats.tin, 0, 0.04, 0));
    g.add(part(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 10, 1), 0xf4ecd8, mats.wax, 0, 0.085, 0));
    g.add(part(new THREE.CylinderGeometry(0.15, 0.17, 0.82, 9, 1), 0xffffff, mats.wax, 0, 0.5, 0));
    // A drip that ran down one side and set.
    g.add(part(new THREE.CylinderGeometry(0.035, 0.05, 0.4, 5, 1), 0xfaf4e4, mats.wax, 0.15, 0.62, 0.04));
    g.add(part(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 4, 1), 0x1a1612, mats.plain, 0, 0.955, 0));
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), mats.glow);
    flame.position.set(0, 1.08, 0);
    g.add(flame);
    // A drop of melted wax: it gathers at the rim, runs slowly down the side, and sets into the pool at the foot.
    const drop = part(new THREE.SphereGeometry(0.04, 6, 4), 0xfffaf0, mats.wax);
    drop.userData.moves = true;
    g.add(drop);
    const side = -2.1; // (the other side from the drip that has set)
    const tick = (time: number): void => {
      const u = ((time + 2.7) % 9) / 9; // nine seconds a drop
      const run = Math.max(0, (u - 0.35) / 0.65); // it gathers at the rim first
      const r = 0.15 + 0.02 * run;
      drop.position.set(Math.cos(side) * (r + 0.01), 0.9 - run * 0.78, Math.sin(side) * (r + 0.01));
      drop.scale.set(1, 1 + run * 0.6, 1).multiplyScalar(0.6 + Math.min(u / 0.35, 1) * 0.4);
    };
    tick(0);
    return { group: g, flame, tick };
  }
  if (what === 'spool') {
    // Two wooden cheeks and the thread wound between them; a loose end trailing down to the floor.
    for (const y of [0.05, J.h - 0.05]) g.add(part(new THREE.CylinderGeometry(J.w / 2, J.w / 2, 0.1, 14, 1), 0xd8c0a0, mats.wood, 0, y, 0));
    g.add(part(new THREE.CylinderGeometry(J.w / 2 - 0.08, J.w / 2 - 0.08, J.h - 0.2, 14, 1, true), 0x4a7ab0, mats.thread, 0, J.h / 2, 0));
    g.add(part(new THREE.CylinderGeometry(0.08, 0.08, 0.012, 8, 1), 0x6a4a2c, mats.wood, 0, J.h + 0.006, 0));
    // (Hung from where it leaves the reel, so that it sways from there: 2026-11-19.)
    const hang = new THREE.Group();
    hang.position.set(J.w / 2 - 0.06 - Math.sin(0.5) * 0.3, 0.35 + Math.cos(0.5) * 0.3, 0.1);
    const end = new THREE.CylinderGeometry(0.012, 0.012, 0.6, 4, 1);
    end.translate(0, -0.3, 0);
    const tail = part(end, 0x4a7ab0, mats.thread);
    tail.rotation.z = 0.5;
    hang.add(tail);
    g.add(hang);
    return { group: g, sway: hang };
  }
  if (what === 'matchbox') {
    // The sleeve (a label on its top, a striking strip down its side) and the drawer pushed half out of it, matches in it.
    const sleeve = J.w * 0.7;
    g.add(part(new THREE.BoxGeometry(sleeve, J.h, J.d), 0xf0e0c8, mats.card, -(J.w - sleeve) / 2, J.h / 2, 0));
    g.add(part(new THREE.PlaneGeometry(sleeve * 0.7, J.d * 0.62).rotateX(-Math.PI / 2), 0xc8402e, mats.card, -(J.w - sleeve) / 2, J.h + 0.004, 0));
    g.add(part(new THREE.PlaneGeometry(sleeve * 0.9, J.h * 0.6), 0x4a2a1a, mats.card, -(J.w - sleeve) / 2, J.h / 2, J.d / 2 + 0.004));
    // The drawer: a tray, open on top, out of the sleeve's east end.
    const tray = J.w * 0.55;
    const tx = J.w / 2 - tray / 2;
    g.add(part(new THREE.BoxGeometry(tray, 0.04, J.d * 0.92), 0xe8d8bc, mats.card, tx, 0.02, 0));
    for (const z of [-1, 1]) g.add(part(new THREE.BoxGeometry(tray, J.h * 0.8, 0.03), 0xe8d8bc, mats.card, tx, J.h * 0.4, z * J.d * 0.45));
    g.add(part(new THREE.BoxGeometry(0.03, J.h * 0.8, J.d * 0.92), 0xe8d8bc, mats.card, J.w / 2 - 0.015, J.h * 0.4, 0));
    // Matches lying along it, red heads at the open end.
    for (let i = 0; i < 6; i++) {
      const z = -J.d * 0.34 + i * J.d * 0.135;
      const y = 0.07 + (i % 2) * 0.03;
      g.add(part(new THREE.BoxGeometry(J.w * 0.62, 0.04, 0.05), 0xf0dcb0, mats.wood, J.w * 0.12, y, z));
      g.add(part(new THREE.BoxGeometry(0.08, 0.06, 0.07), i === 2 ? 0x2a2420 : 0xb83a2a, mats.plain, J.w * 0.12 + J.w * 0.31 + 0.03, y, z));
    }
    return { group: g };
  }
  if (what === 'cheese') {
    // A wheel with a wedge out of it: the rind round its side, the cut faces paler, the holes showing.
    const R = J.w / 2;
    const gap = 0.9;
    const wheel = new THREE.CylinderGeometry(R, R, J.h, 20, 1, false, gap / 2, Math.PI * 2 - gap);
    g.add(part(wheel, 0xf2c87a, mats.cheese, 0, J.h / 2, 0));
    // The two cut faces of the wedge's gap.
    for (const a of [gap / 2, -gap / 2]) {
      const face = new THREE.PlaneGeometry(R, J.h);
      face.translate(R / 2, 0, 0);
      const m = part(face, 0xffffff, mats.cheese, 0, J.h / 2, 0);
      // (Each turned to lie along one edge of the gap, facing out of it.)
      m.rotation.y = a - Math.PI / 2 + (a > 0 ? 0 : Math.PI);
      m.scale.z = a > 0 ? 1 : -1;
      g.add(m);
    }
    // The wedge itself, cut and lying beside the wheel.
    const wedge = new THREE.CylinderGeometry(R * 0.6, R * 0.6, J.h * 0.5, 4, 1, false, 0, gap);
    const w = part(wedge, 0xfff0c8, mats.cheese, R * 0.2, J.h * 0.25, R + 0.25);
    w.rotation.y = 0.6;
    g.add(w);
    return { group: g };
  }
  if (what === 'button') {
    // A coat button: a thick disc, a raised rim, four holes through the dish in the middle, a thread still in two of them.
    const R = J.w / 2;
    g.add(part(new THREE.CylinderGeometry(R, R * 0.96, J.h * 0.8, 16, 1), 0x8a3a2a, mats.wax, 0, J.h * 0.4, 0));
    g.add(part(new THREE.TorusGeometry(R * 0.86, 0.06, 4, 16).rotateX(Math.PI / 2), 0x9a4a36, mats.wax, 0, J.h * 0.8, 0));
    for (const [hx, hz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.add(part(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 8, 1), 0x1e0e0a, mats.plain, hx * R * 0.24, J.h * 0.8 + 0.006, hz * R * 0.24));
    }
    g.add(part(new THREE.BoxGeometry(0.035, 0.03, R * 0.56), 0xe8e0c8, mats.thread, -R * 0.24, J.h * 0.8 + 0.02, 0));
    return { group: g };
  }
  if (what === 'pencil') {
    // Lying along x: six-sided painted wood, the sharpened end bare wood and its lead, a tin band and a worn pink rubber.
    const r = J.h / 2;
    const body = J.w * 0.66;
    const x0 = -J.w / 2 + 0.3; // where the rubber's band ends and the paint starts
    const hex = new THREE.CylinderGeometry(r, r, body, 6, 1).rotateZ(Math.PI / 2);
    g.add(part(hex, 0xe8b830, mats.card, x0 + body / 2, r, 0));
    const cone = new THREE.CylinderGeometry(0.06, r, J.w - body - 0.3 - 0.12, 6, 1).rotateZ(-Math.PI / 2);
    const coneLen = J.w - body - 0.3 - 0.12;
    g.add(part(cone, 0xe8c89a, mats.wood, x0 + body + coneLen / 2, r, 0));
    g.add(part(new THREE.ConeGeometry(0.06, 0.12, 6).rotateZ(-Math.PI / 2), 0x2a2a30, mats.plain, J.w / 2 - 0.06, r, 0));
    g.add(part(new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.14, 8, 1).rotateZ(Math.PI / 2), 0xc8c4b8, mats.tin, x0 - 0.07, r, 0));
    g.add(part(new THREE.CylinderGeometry(r * 0.96, r * 0.9, 0.16, 8, 1).rotateZ(Math.PI / 2), 0xe08a8a, mats.wax, -J.w / 2 + 0.08, r, 0));
    return { group: g };
  }
  if (what === 'die') {
    // An ivory cube with dark pips: one on top, the rest round its sides as a real one has them (opposite faces add to seven).
    const s = J.w;
    g.add(part(new THREE.BoxGeometry(s, s, s), 0xf0e8d4, mats.wax, 0, s / 2, 0));
    const pip = (x: number, y: number, z: number, nx: number, ny: number, nz: number): void => {
      const p = part(new THREE.CircleGeometry(0.075, 6), 0x1a1612, mats.plain, x + nx * 0.004, y + ny * 0.004, z + nz * 0.004);
      p.lookAt(p.position.x + nx, p.position.y + ny, p.position.z + nz);
      g.add(p);
    };
    const o = s * 0.25;
    const h = s / 2;
    // Each face: the pips in its own plane (u, v), pushed out along its normal.
    const faces: Array<[number, [number, number, number], [number, number, number], [number, number, number]]> = [
      [1, [0, 1, 0], [1, 0, 0], [0, 0, 1]], // top: one
      [6, [0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [2, [0, 0, 1], [1, 0, 0], [0, 1, 0]], // the front: two
      [5, [0, 0, -1], [1, 0, 0], [0, 1, 0]],
      [3, [1, 0, 0], [0, 0, 1], [0, 1, 0]], // the east: three
      [4, [-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    ];
    const LAY: Record<number, Array<[number, number]>> = {
      1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
    };
    for (const [n, nrm, u, v] of faces) for (const [a, b] of LAY[n]) {
      pip(nrm[0] * h + u[0] * a * o + v[0] * b * o, h + nrm[1] * h + u[1] * a * o + v[1] * b * o, nrm[2] * h + u[2] * a * o + v[2] * b * o, nrm[0], nrm[1], nrm[2]);
    }
    return { group: g };
  }
  if (what === 'pawn') {
    // Turned wood, black and polished: a broad foot, a collar, the body narrowing up to a neck, a ball for a head.
    const ink = 0x2a2420;
    g.add(part(new THREE.CylinderGeometry(0.36, 0.4, 0.14, 14, 1), ink, mats.wax, 0, 0.07, 0));
    g.add(part(new THREE.CylinderGeometry(0.3, 0.36, 0.1, 14, 1), ink, mats.wax, 0, 0.19, 0));
    g.add(part(new THREE.CylinderGeometry(0.13, 0.27, 0.62, 12, 1), ink, mats.wax, 0, 0.55, 0));
    g.add(part(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 12, 1), ink, mats.wax, 0, 0.88, 0));
    g.add(part(new THREE.SphereGeometry(0.24, 12, 8), ink, mats.wax, 0, 1.12, 0));
    return { group: g };
  }
  if (what === 'battery') {
    // Lying along x: the black body, its gold end, and the knob on the gold end. (Smooth, as wax is: tin's dents
    // read as cloth at this size.)
    const r = J.h / 2;
    const body = J.w * 0.72;
    const x0 = -J.w / 2 + 0.04;
    g.add(part(new THREE.CylinderGeometry(r, r, body, 12, 1).rotateZ(Math.PI / 2), 0x2a2a30, mats.wax, x0 + body / 2, r, 0));
    const gold = J.w - body - 0.12;
    g.add(part(new THREE.CylinderGeometry(r, r, gold, 12, 1).rotateZ(Math.PI / 2), 0xe0a030, mats.wax, x0 + body + gold / 2, r, 0));
    g.add(part(new THREE.CylinderGeometry(r * 0.32, r * 0.32, 0.12, 8, 1).rotateZ(Math.PI / 2), 0xc8c4b8, mats.tin, J.w / 2 - 0.06, r, 0));
    // A white stripe of writing round the black.
    g.add(part(new THREE.CylinderGeometry(r * 1.01, r * 1.01, 0.12, 12, 1, true).rotateZ(Math.PI / 2), 0xe8e4d8, mats.plain, x0 + body * 0.4, r, 0));
    return { group: g };
  }
  if (what === 'teacup') {
    // The saucer, the cup on it (a blue band round it, tea in it), and its handle.
    const R = J.w / 2;
    g.add(part(new THREE.CylinderGeometry(R, R * 0.7, 0.08, 18, 1), 0xf4f0e8, mats.wax, 0, 0.04, 0));
    const cupR = R * 0.56;
    const cup = new THREE.CylinderGeometry(cupR, cupR * 0.66, J.h - 0.08, 16, 1, true);
    g.add(part(cup, 0xf4f0e8, mats.wax, 0, 0.08 + (J.h - 0.08) / 2, 0));
    // Its inside: the same wall a hair in, its faces turned to look inward (the material is shared: not made two-sided).
    const inside = new THREE.CylinderGeometry(cupR * 0.97, cupR * 0.64, J.h - 0.08, 16, 1, true);
    const ix = inside.index!;
    for (let i = 0; i < ix.count; i += 3) {
      const a0 = ix.getX(i + 1);
      ix.setX(i + 1, ix.getX(i + 2));
      ix.setX(i + 2, a0);
    }
    inside.computeVertexNormals();
    g.add(part(inside, 0xe8e2d4, mats.wax, 0, 0.08 + (J.h - 0.08) / 2, 0));
    g.add(part(new THREE.CylinderGeometry(cupR * 1.005, cupR * 0.95, 0.1, 16, 1, true), 0x4a72b8, mats.plain, 0, J.h - 0.12, 0));
    g.add(part(new THREE.CircleGeometry(cupR * 0.8, 14).rotateX(-Math.PI / 2), 0x7a4a24, mats.plain, 0, J.h * 0.45, 0));
    const handle = new THREE.TorusGeometry(0.17, 0.045, 5, 10, Math.PI * 1.3);
    handle.rotateZ(-Math.PI * 0.65);
    g.add(part(handle, 0xf4f0e8, mats.wax, cupR * 0.95 + 0.1, J.h * 0.55, 0));
    // Steam: three faint wisps rising off the tea, each growing and fading as it goes, one after another.
    const wisps: Array<{ m: THREE.Mesh; mat: THREE.MeshBasicMaterial; k: number }> = [];
    for (let k = 0; k < 3; k++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0, transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), mat);
      g.add(m);
      wisps.push({ m, mat, k });
    }
    const steam = (time: number): void => {
      for (const w of wisps) {
        const u = (time * 0.3 + w.k / 3) % 1;
        w.m.position.set(Math.sin(time * 1.3 + w.k * 2) * 0.08 * u, J.h * 0.5 + u * 1.1, Math.cos(time * 1.1 + w.k) * 0.08 * u);
        w.m.scale.setScalar(0.6 + u * 1.4);
        w.mat.opacity = 0.32 * Math.sin(Math.PI * u);
      }
    };
    for (const w of wisps) w.m.userData.moves = true;
    steam(0);
    return { group: g, tick: steam };
  }
  if (what === 'spoon') {
    // On its back along x: the bowl, the neck, the handle widening to its end.
    const bowl = new THREE.SphereGeometry(0.26, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    bowl.scale(1.3, 0.75, 1);
    g.add(part(bowl, 0xc8ccd4, mats.tin, -J.w / 2 + 0.36, J.h * 0.95, 0));
    const handle = new THREE.BoxGeometry(J.w - 0.72, 0.05, 0.14);
    g.add(part(handle, 0xc8ccd4, mats.tin, 0.36 - 0.02, 0.08, 0));
    const end = new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10, 1);
    g.add(part(end, 0xc8ccd4, mats.tin, J.w / 2 - 0.12, 0.08, 0));
    return { group: g };
  }
  if (what === 'safetypin') {
    // Flat along x: two steel wires, the coil at one end, the clasp at the other with the point tucked in.
    const steel = 0xc8ccd4;
    const r = 0.035;
    const len = J.w - 0.5;
    for (const z of [-0.14, 0.14]) g.add(part(new THREE.CylinderGeometry(r, r, len, 5, 1).rotateZ(Math.PI / 2), steel, mats.tin, 0.05, r, z));
    g.add(part(new THREE.TorusGeometry(0.15, r, 4, 10).rotateX(Math.PI / 2), steel, mats.tin, -J.w / 2 + 0.2, r, 0));
    g.add(part(new THREE.BoxGeometry(0.34, 0.12, 0.44), 0xb0b4bc, mats.tin, J.w / 2 - 0.2, 0.06, 0));
    return { group: g };
  }
  if (what === 'paperclip') {
    // A wire bent in three loops, lying flat: a tube along its path.
    const P = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0.04, z);
    const hw = J.w / 2;
    const pts = [P(hw * 0.55, 0.12), P(-hw + 0.25, 0.12), P(-hw, 0), P(-hw + 0.25, -0.25), P(hw - 0.25, -0.25), P(hw, 0), P(hw - 0.25, 0.25), P(-hw + 0.5, 0.25)];
    const path = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
    g.add(part(new THREE.TubeGeometry(path, 48, 0.035, 4, false), 0xb8bcc8, mats.tin));
    return { group: g };
  }
  if (what === 'crayon') {
    // On its side along x: six-sided red wax, bare at its back end and at its tip, its paper wrapper round the middle.
    // (Laid end to end, nothing over anything: in a room too big to be layered as it loads, wax under paper flickers.)
    const r = J.h / 2;
    const red = 0xd83a5a;
    const tip = 0.36;
    const x0 = -J.w / 2;
    const x1 = J.w / 2 - tip;
    const wrapA = x0 + 0.2;
    const wrapB = x1 - 0.42;
    const seg = (a: number, b: number, rad: number, color: number, mat: THREE.Material): void => {
      g.add(part(new THREE.CylinderGeometry(rad, rad, b - a, 6, 1).rotateZ(Math.PI / 2), color, mat, (a + b) / 2, r, 0));
    };
    seg(x0, wrapA, r, red, mats.wax);
    seg(wrapA, wrapB, r * 1.03, 0xf0e4c8, mats.card);
    seg(wrapB, x1, r, red, mats.wax);
    g.add(part(new THREE.CylinderGeometry(0.06, r, tip, 6, 1).rotateZ(-Math.PI / 2), red, mats.wax, x1 + tip / 2, r, 0));
    return { group: g };
  }
  if (what === 'marble') {
    // A ball of glass, pale, and its twist of colour: two bands at the surface, crossed (the ball is not see-through).
    const R = J.h / 2;
    g.add(part(new THREE.SphereGeometry(R, 14, 10), 0xd8eef4, mats.wax, 0, R, 0));
    for (const [tilt, turn, col] of [[1.1, 0.6, 0x2a9ad8], [-0.5, 2.2, 0xe8a030]] as const) {
      const band = new THREE.TorusGeometry(R * 0.95, R * 0.1, 4, 16);
      band.rotateX(tilt);
      band.rotateY(turn);
      g.add(part(band, col, mats.plain, 0, R, 0));
    }
    // A glint: a bright spot high on the glass that flares now and then, as if the light caught it.
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    // (On the glass near its top, where the camera, from above, nearly always sees it: a radius out, a hair proud.)
    const toward = new THREE.Vector3(0.15, 0.95, 0.2).normalize().multiplyScalar(R * 1.02);
    glint.position.set(toward.x, R + toward.y, toward.z);
    glint.userData.moves = true;
    g.add(glint);
    const tick = (time: number): void => {
      const u = (time * 0.31 + R * 7) % 1;
      const flare = u > 0.9 ? Math.sin(((u - 0.9) / 0.1) * Math.PI) : 0;
      glint.scale.setScalar(0.4 + flare * 1.6);
    };
    tick(0);
    return { group: g, tick };
  }
  // what === 'sardines': an opened tin, oil in it, three fish lying head to tail, its lid rolled back on its key.
  g.add(part(new THREE.BoxGeometry(J.w * 0.8, J.h * 0.8, J.d), 0xe0dccf, mats.tin, -J.w * 0.1, J.h * 0.4, 0));
  g.add(part(new THREE.PlaneGeometry(J.w * 0.76, J.d * 0.92).rotateX(-Math.PI / 2), 0x6a5a2a, mats.plain, -J.w * 0.1, J.h * 0.7, 0));
  for (let i = 0; i < 3; i++) {
    const fish = new THREE.SphereGeometry(0.1, 8, 5);
    fish.scale(J.w * 3.2, 0.9, 1.1);
    const f = part(fish, i % 2 ? 0xc0ccd8 : 0xa8b8c8, mats.tin, -J.w * 0.1 + (i % 2 ? 0.08 : -0.08), J.h * 0.74, (i - 1) * J.d * 0.27);
    g.add(f);
  }
  // The lid: rolled up into a curl at the east end, and the key through it.
  const curl = new THREE.CylinderGeometry(0.12, 0.12, J.d * 0.96, 10, 1);
  curl.rotateX(Math.PI / 2);
  g.add(part(curl, 0xe8e4d8, mats.tin, J.w * 0.33, J.h * 0.55, 0));
  const key = new THREE.TorusGeometry(0.09, 0.022, 4, 8);
  g.add(part(key, 0xc8c4b8, mats.tin, J.w * 0.33, J.h * 0.55, J.d * 0.5 + 0.1));
  return { group: g };
}
