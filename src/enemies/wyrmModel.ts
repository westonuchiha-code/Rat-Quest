import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { bead, mix, modelKit, paint } from '../render/modelKit';
import { Springs, aim, ease, twoBone } from '../render/bugRig';
import { WYRM, wyrmTaper, type WyrmState } from './wyrm';

/**
 * Sump Wyrm model: a centipede as long as a barge. A blunt red head with two hooked black fangs, long feelers and a
 * cluster of small eyes each side; behind it thirteen segments, each a rust-red plate over a pale belly with a pair of
 * yellow legs, getting smaller to a tail that ends in two long spurs.
 *
 * How it is posed. ITS BODY IS NOT POSED AT ALL: each segment is drawn exactly where the rules say that segment is (and
 * as thick as the rules say it is), so what can be hit and what is in the way is what is seen. What the model adds is on
 * top of that: how high its head and neck are reared, which way its head is tipped, its fangs, its tail's spurs, and its
 * legs, which walk in a wave down its length while it crawls and curl up when a segment is off the floor.
 */
const C = {
  plate: 0x7a2418, plateHi: 0xa8351f, rim: 0x230b08, belly: 0xc9a45a, bellyDark: 0x8a6a34, leg: 0xe6b84a, legTip: 0x3a2410,
  head: 0xb53a1e, headDark: 0x5e170e, fang: 0x16100e, fangBase: 0xd9a03a, feeler: 0x8a2a18, spur: 0xe6b84a,
};
/** A segment's middle is this high when it lies on the floor (times its taper), and its legs are this long. */
const SEG_Y = 0.42;
const HEAD_Y = 0.5;
const THIGH = 0.56;
const SHIN = 0.66;
/** How high the head goes when it is fully reared, and how much of that each of the first segments takes. */
const REAR = 1.35;
const NECK = [0.72, 0.4, 0.16, 0.04];

interface Pose {
  /** How far its head and neck are reared: 0 on the floor .. 1 right up. */
  rise: number;
  /** Its head: nose down is positive; rolled onto its side; fangs 0 shut .. 1 wide. */
  pitch: number;
  roll: number;
  fangs: number;
  /** Its tail's spurs: 0 trailing .. 1 raised and spread. */
  tail: number;
  /** 0: lying as it crawls. 1: every segment rolled over, legs curled (dead). */
  over: number;
  /** Its feelers drooped, 0..1. Its eyes: how bright, 0..1. */
  droop: number;
  glow: number;
}
const I = { rise: 0, pitch: 1, roll: 2, fangs: 3, tail: 4, over: 5, droop: 6, glow: 7 };
const pose = (rise: number, pitch: number, roll: number, fangs: number, tail: number, glow: number, droop = 0, over = 0): Pose => ({ rise, pitch, roll, fangs, tail, over, droop, glow });
const POSES: Record<WyrmState, Pose> = {
  idle: pose(0, 0.05, 0, 0.1, 0, 0.25, 0.4),
  roar: pose(1, -0.6, 0, 1, 0.5, 1),
  prowl: pose(0.14, 0, 0, 0.3, 0, 0.6),
  biteWind: pose(0.8, 0.45, 0, 1, 0, 1),
  bite: pose(0.1, 0.12, 0, 0, 0, 1),
  recover: pose(0.08, 0.05, 0, 0.25, 0, 0.5),
  reel: pose(0.85, -0.95, 0.45, 0.6, 0, 0.15, 0.8),
  chargeWind: pose(0.5, 0.2, 0, 1, 0.3, 1),
  charge: pose(0.04, 0.04, 0, 1, 0, 1),
  stunned: pose(0, 0.1, 0.85, 0.45, 0, 0.1, 1),
  skid: pose(0.1, 0, 0, 0.5, 0, 0.6),
  whipWind: pose(0.1, 0, 0, 0.4, 1, 0.9),
  whip: pose(0.1, 0, 0, 0.4, 0.35, 0.9),
  settle: pose(0.1, 0, 0, 0.3, 0, 0.6),
  coil: pose(0.2, 0, 0, 0.6, 0, 1),
  coilWind: pose(1.1, 0.6, 0, 1, 0, 1),
  squeeze: pose(0.3, 0.3, 0, 0, 0, 1),
  spent: pose(0, 0.08, 0.55, 0.3, 0, 0.12, 1),
  dead: pose(0, 0.05, 0.7, 0.2, 0, 0, 1, 1),
};

export interface WyrmAnimInput {
  state: WyrmState;
  stateTime: number;
  windTime: number;
  /** Its head, and which way it faces. */
  x: number;
  z: number;
  facing: number;
  /** Its segments, head end first, as the rules have them. */
  body: ReadonlyArray<{ x: number; z: number; dir: number }>;
  /** How far it has crawled in all, and how fast it is going. */
  crawled: number;
  moving: number;
  raging: boolean;
  /** The middle of its coil (while it winds, rears and tightens). */
  coilAt: { x: number; z: number };
}

interface Leg {
  side: -1 | 1;
  thigh: THREE.Group;
  shin: THREE.Group;
}
interface Segment {
  group: THREE.Group;
  legs: Leg[];
  taper: number;
  shadow: THREE.Mesh;
}

/** The lowest any of a part's points gets, for a way of turning it: so the floor can hold it up. */
class Probe {
  private readonly pts: THREE.Vector3[] = [];
  private readonly v = new THREE.Vector3();
  add(root: THREE.Object3D, skip: THREE.Object3D[] = []): void {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (let q: THREE.Object3D | null = o; q; q = q.parent) if (skip.includes(q)) return;
      const pos = mesh.geometry.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(inv, mesh.matrixWorld);
      for (let i = 0; i < pos.count; i++) this.pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
    });
  }
  low(q: THREE.Quaternion): number {
    let low = 0;
    for (const p of this.pts) low = Math.min(low, this.v.copy(p).applyQuaternion(q).y);
    return low;
  }
}

export class WyrmModel {
  readonly root = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly fangs: THREE.Group[] = [];
  private readonly hooks: THREE.Object3D[] = [];
  private readonly feelers: THREE.Group[] = [];
  private readonly spurs: THREE.Group[] = [];
  private readonly segs: Segment[] = [];
  private readonly mat = createPs1Material({ lit: true, shine: 0.5 });
  private readonly matPlain = createPs1Material({ lit: true });
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0x9aff5a });
  private readonly headShadow: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  private readonly wave: THREE.Mesh;
  private readonly waveMat = new THREE.MeshBasicMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  private readonly springs = new Springs(8);
  private readonly headProbe = new Probe();
  private readonly segProbe = new Probe();
  private time = 0;
  private flashAmount = 0;
  private scale = 1;
  private waveT = 1;
  private waveSize = 1;
  private last: WyrmState = 'idle';
  private spin = 0;
  /** How far short of its foot the worst leg falls (0 when they all reach). For tests. */
  reachShort = 0;

  constructor() {
    const { blob, cone } = modelKit(this.mat);
    const plain = modelKit(this.matPlain);
    const limb = (r0: number, r1: number, length: number, color: (along: number) => number, sides = 5, rings = 5, mat: THREE.Material = this.matPlain): THREE.Mesh => {
      const geo = new THREE.CylinderGeometry(r1, r0, length, sides, rings);
      geo.translate(0, length / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      return new THREE.Mesh(paint(geo, (nx) => color(nx)), mat);
    };
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.36, depthWrite: false });
    const shadow = (r: number): THREE.Mesh => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(r, 10), shadowMat);
      m.rotation.x = -Math.PI / 2;
      this.root.add(m);
      return m;
    };

    // ---- Its head: a blunt skull under a dark plate, eyes in a cluster each side, feelers, and the two fangs. ----
    this.head.rotation.order = 'YXZ';
    this.head.add(blob(0.6, 0.4, 0.66, (_x, ny, nz) => (ny < -0.35 ? C.bellyDark : nz > 0.75 ? C.headDark : C.head), 0, 0, 0.05, 10, 7, 0.28));
    this.head.add(blob(0.5, 0.16, 0.5, (nx, _y, nz) => (Math.abs(nx) > 0.78 || nz < -0.8 ? C.rim : C.headDark), 0, 0.3, -0.06, 9, 5, 0.3));
    for (const s of [-1, 1]) {
      for (const [x, y, z, r] of [[0.44, 0.14, 0.42, 0.06], [0.5, 0.1, 0.3, 0.05], [0.4, 0.22, 0.34, 0.045], [0.33, 0.2, 0.5, 0.04]] as const) this.head.add(bead(r, this.eyeMat, s * x, y, z, 5, 4));
    }
    for (const s of [-1, 1] as const) {
      // A feeler: long, jointed, always feeling about.
      const feeler = new THREE.Group();
      feeler.position.set(s * 0.26, 0.22, 0.6);
      feeler.add(limb(0.045, 0.012, 1.7, (a) => (Math.floor((a + 1) * 5) % 2 ? C.feeler : C.rim), 4, 8));
      this.head.add(feeler);
      this.feelers.push(feeler);
      // A fang: a thick yellow root at the side of its mouth, and a black hook curving in to a point.
      const hinge = new THREE.Group();
      hinge.position.set(s * 0.4, -0.16, 0.36);
      const base = limb(0.13, 0.09, 0.42, () => C.fangBase, 5, 2);
      base.rotation.y = -Math.PI / 2; // along +z: forward
      hinge.add(base);
      const hook = cone(0.085, 0.5, () => C.fang, 5);
      hook.position.set(0, 0, 0.4);
      hook.rotation.set(Math.PI / 2, 0, s * 0.95); // forward, curving in across its mouth
      hinge.add(hook);
      this.head.add(hinge);
      this.fangs.push(hinge);
      this.hooks.push(hook);
    }
    this.root.add(this.head);
    // What of its head could touch the floor: every point of it, with its fangs both shut and wide (its feelers are kept clear by themselves).
    for (const open of [0, 1]) {
      this.fangs.forEach((h, i) => h.rotation.set(0.12, (i === 0 ? -1 : 1) * (open * 0.85 - 0.12), 0));
      this.headProbe.add(this.head, [...this.feelers]);
    }
    this.headShadow = shadow(0.7);

    // ---- Its segments. ----
    for (let i = 0; i < WYRM.segments; i++) {
      const t = wyrmTaper(i);
      const group = new THREE.Group();
      group.rotation.order = 'YXZ';
      const shell = new THREE.Group();
      shell.scale.setScalar(t);
      // Belly, then the plate over it: rust red with a bright ridge, dark round its rim, lapping the plate behind.
      shell.add(plain.blob(0.48, 0.34, 0.5, (_x, ny) => (ny < -0.2 ? C.belly : ny < 0.2 ? C.bellyDark : C.plate), 0, 0, 0, 8, 6, 0.25));
      shell.add(blob(0.56, 0.2, 0.54, (nx, _y, nz) => (Math.abs(nx) > 0.8 || nz < -0.72 ? C.rim : Math.abs(nx) < 0.16 ? C.plateHi : mix(C.plate, C.rim, i % 2 ? 0.18 : 0)), 0, 0.2, -0.02, 9, 5, 0.3));
      group.add(shell);
      const legs: Leg[] = [];
      for (const s of [-1, 1] as const) {
        const thigh = new THREE.Group();
        const shin = new THREE.Group();
        thigh.add(limb(0.07 * t, 0.05 * t, THIGH * t, () => C.leg, 4, 1));
        shin.add(limb(0.05 * t, 0.012, SHIN * t, (a) => (a > 0.45 ? C.legTip : C.leg), 4, 3));
        group.add(thigh, shin);
        legs.push({ side: s, thigh, shin });
      }
      if (i === WYRM.segments - 1) {
        // The tail: two long spurs, hinged so they can rise and spread.
        for (const s of [-1, 1]) {
          const spur = new THREE.Group();
          spur.position.set(s * 0.16, 0.06, -0.3);
          spur.add(limb(0.07, 0.012, 1.5, (a) => (a > 0.6 ? C.rim : C.spur), 5, 4));
          group.add(spur);
          this.spurs.push(spur);
        }
      }
      this.root.add(group);
      this.segs.push({ group, legs, taper: t, shadow: shadow(0.58 * t) });
      if (i === 0) this.segProbe.add(shell);
    }

    // On the floor: the ring that shows where its coil will close, and the ring that runs out from a lash.
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.ring.visible = false;
    this.root.add(this.ring);
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 32), this.waveMat);
    this.wave.rotation.x = -Math.PI / 2;
    this.wave.position.y = 0.05;
    this.wave.visible = false;
    this.root.add(this.wave);

    this.flatten(POSES.idle);
    this.springs.snap();
  }

  private flatten(p: Pose): void {
    const t = this.springs.target;
    t[I.rise] = p.rise;
    t[I.pitch] = p.pitch;
    t[I.roll] = p.roll;
    t[I.fangs] = p.fangs;
    t[I.tail] = p.tail;
    t[I.over] = p.over;
    t[I.droop] = p.droop;
    t[I.glow] = p.glow;
  }

  /** The model is drawn in the world's own places (its segments are wherever the rules put them): only the floor's height is set. */
  setFloor(y: number): void {
    this.root.position.set(0, y, 0);
  }

  flash(): void {
    this.flashAmount = 1;
  }

  private readonly tmp = { a: new THREE.Vector3(), f: new THREE.Vector3(), pole: new THREE.Vector3(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ') };

  update(dt: number, ctx: WyrmAnimInput): void {
    this.time += dt;
    const t = this.time;
    const state = ctx.state;
    this.flatten(POSES[state]);
    // A blow goes out fast and stops dead; winding up it gathers; struck helpless it drops; the rest is quick and sinuous.
    const striking = state === 'bite' || state === 'charge' || state === 'whip' || state === 'squeeze';
    const stiffness = striking ? 60 : state === 'stunned' || state === 'reel' ? 16 : state === 'biteWind' ? (ctx.windTime < 0.5 ? 20 : 13) : state === 'chargeWind' ? (ctx.windTime < 0.8 ? 16 : 10) : state === 'dead' ? 6 : 10;
    this.springs.step(dt, stiffness, striking ? 1 : 0.8);
    const v = this.springs.value;
    const T = this.tmp;

    if (state !== this.last) {
      if (state === 'whip') {
        this.waveT = 0;
        this.waveSize = WYRM.whipReach + WYRM.segRadius * wyrmTaper(WYRM.segments - 1);
        const tail = ctx.body[ctx.body.length - 1];
        this.wave.position.set(tail.x, 0.05, tail.z);
        this.spin = 0;
      }
      this.last = state;
    }
    if (this.waveT < 1) {
      this.waveT = Math.min(1, this.waveT + dt / 0.36);
      const k = 1 - (1 - this.waveT) * (1 - this.waveT);
      this.wave.scale.setScalar(0.4 + (this.waveSize - 0.4) * k);
      this.waveMat.opacity = 0.85 * (1 - this.waveT);
    }
    this.wave.visible = this.waveT < 1;

    // Dead: it lies on its side a while, then shrivels away (each piece where it lies).
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 2.4) / 0.8)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    const sc = Math.max(0.001, this.scale);

    const rise = Math.max(0, v[I.rise]);
    const over = Math.min(1, Math.max(0, v[I.over]));
    const tremble = state === 'biteWind' || state === 'chargeWind' || state === 'coilWind' || state === 'whipWind' ? 0.014 * Math.sin(t * 46) : 0;

    // ---- Head ----
    // Reared over its coil it looks down into the middle of it; otherwise it looks where it is going.
    let yaw = ctx.facing;
    if (state === 'coilWind' || state === 'squeeze') {
      const want = Math.atan2(ctx.coilAt.x - ctx.x, ctx.coilAt.z - ctx.z);
      yaw += Math.atan2(Math.sin(want - yaw), Math.cos(want - yaw)) * Math.min(1, rise);
    }
    const sway = state === 'prowl' || state === 'coil' ? 0.1 * Math.sin(ctx.crawled * 1.4) : state === 'reel' || state === 'stunned' ? 0.12 * Math.sin(t * 5) : 0;
    this.head.rotation.set(v[I.pitch] - rise * 0.25 + tremble, yaw + sway, v[I.roll] + (state === 'reel' ? 0.2 * Math.sin(t * 7) : 0));
    // The floor holds it up, however it is tipped.
    const headLow = this.headProbe.low(this.head.quaternion);
    const open = Math.min(1, Math.max(0, v[I.fangs]));
    // Shut, the hooks cross in front of its mouth; open, they swing out wide.
    this.fangs.forEach((h, i) => h.rotation.set(0.12, (i === 0 ? -1 : 1) * (open * 0.85 - 0.12), 0));
    const headY = Math.max(HEAD_Y + rise * REAR + 0.02 * Math.sin(t * 2.1), 0.03 - headLow);
    this.head.position.set(ctx.x, headY, ctx.z);
    this.head.scale.setScalar(sc);
    const droop = Math.min(1, Math.max(0, v[I.droop]));
    this.feelers.forEach((f, i) => {
      const s = i === 0 ? -1 : 1;
      // Up and out and forward, sweeping; drooped, they trail low. The way it points is worked out in the world, so
      // that however its head is tipped a feeler's end is never in the floor.
      const up = (0.55 - droop * 0.7) + 0.16 * Math.sin(t * 3.1 + i * 1.7) * (1 - droop);
      const out = s * (0.5 + 0.2 * Math.sin(t * 2.3 + i * 2.6));
      T.f.set(Math.sin(out) * Math.cos(up), Math.sin(up), Math.cos(out) * Math.cos(up)).applyQuaternion(this.head.quaternion);
      const rootY = headY + T.a.copy(f.position).applyQuaternion(this.head.quaternion).y * sc;
      const least = (0.06 - rootY) / (1.7 * sc);
      if (T.f.y < least) {
        const flat = Math.hypot(T.f.x, T.f.z) || 1;
        const k = Math.sqrt(Math.max(0, 1 - Math.min(1, least) ** 2)) / flat;
        T.f.set(T.f.x * k, Math.min(1, least), T.f.z * k);
      }
      T.q.copy(this.head.quaternion).invert();
      aim(f, T.f.applyQuaternion(T.q), T.pole.set(0, 1, 0));
    });
    this.headShadow.position.set(ctx.x, 0.02, ctx.z);
    this.headShadow.scale.setScalar(sc * (1 - 0.3 * Math.min(1, rise)));

    // ---- Segments: each where the rules have it, and as high as its place in the neck says. ----
    let worst = 0;
    const n = this.segs.length;
    const height = (i: number): number => (i < 0 ? headY : SEG_Y * this.segs[Math.min(i, n - 1)].taper + (i < NECK.length ? NECK[i] * rise * REAR : 0));
    const tailUp = Math.min(1.2, Math.max(0, v[I.tail]));
    this.segs.forEach((sg, i) => {
      const b = ctx.body[i];
      if (!b) return;
      // It lifts with the neck in front and the tail behind; and a wave of breath runs down it.
      const fromTail = n - 1 - i;
      const lift = (i < NECK.length ? NECK[i] * rise * REAR : 0) + (fromTail < 3 ? tailUp * [0.5, 0.26, 0.08][fromTail] : 0) + 0.012 * Math.sin(t * 2.4 - i * 0.7);
      const before = i === 0 ? headY - (HEAD_Y - SEG_Y) : height(i - 1);
      const afterIt = height(i + 1) + (fromTail - 1 < 3 && fromTail - 1 >= 0 ? tailUp * [0.5, 0.26, 0.08][fromTail - 1] : 0);
      const pitch = -Math.atan2(before - afterIt, WYRM.spacing * 2);
      const roll = over * (1.25 + 0.2 * Math.sin(i * 1.9)) + (state === 'stunned' && i < 2 ? v[I.roll] * (i === 0 ? 0.5 : 0.2) : 0);
      sg.group.rotation.set(pitch, b.dir, roll);
      const low = this.segProbe.low(sg.group.quaternion) * sg.taper;
      const y = Math.max(SEG_Y * sg.taper + lift, 0.03 - low);
      sg.group.position.set(b.x, y, b.z);
      sg.group.scale.setScalar(sc);
      sg.shadow.position.set(b.x, 0.02, b.z);
      sg.shadow.scale.setScalar(sc * (1 - 0.4 * Math.min(1, lift)));

      // Its legs: on the floor they walk in a wave that runs down its length; off the floor (or dead) they curl in.
      const curl = Math.max(over, Math.min(1, Math.max(0, (y - SEG_Y * sg.taper - 0.12) / 0.3)), Math.min(1, Math.abs(roll) * 2));
      for (const leg of sg.legs) {
        const s = leg.side;
        const phase = ctx.crawled * 2.6 - i * 0.85 + (s > 0 ? Math.PI : 0);
        const stride = Math.min(1, ctx.moving / 3);
        T.a.set(s * 0.4 * sg.taper, -0.04 * sg.taper, 0);
        // The foot on the floor (this segment is level when its legs are down, so the floor is straight below).
        T.f.set(s * 0.98 * sg.taper, -y + 0.02 + 0.2 * stride * Math.max(0, Math.cos(phase)), 0.3 * stride * Math.sin(phase));
        if (curl > 0) {
          T.f.lerp(T.pole.set(s * (0.5 + 0.06 * Math.sin(t * 8 + i + s)) * sg.taper, -0.2 * sg.taper, 0.1), curl);
          // (However the segment is tipped, a curled foot is not put into the floor.)
          const footY = y + T.pole.copy(T.f).applyQuaternion(sg.group.quaternion).y * sc;
          if (footY < 0.05) T.f.add(T.pole.set(0, (0.05 - footY) / sc, 0).applyQuaternion(T.q.copy(sg.group.quaternion).invert()));
        }
        // Knees up and out; on a segment that is tipped over, up is the world's up, so no knee points into the floor.
        T.pole.set(s * 0.5, 1, 0);
        if (curl > 0.3) T.pole.set(0, 1, 0).applyQuaternion(T.q.copy(sg.group.quaternion).invert()).addScaledVector(T.a.set(s, 0, 0), 0.25);
        T.a.set(s * 0.4 * sg.taper, -0.04 * sg.taper, 0);
        worst = Math.max(worst, twoBone(T.a, T.f, T.pole, THIGH * sg.taper, SHIN * sg.taper, leg.thigh, leg.shin));
      }
    });
    this.reachShort = worst;

    // The tail's spurs: trailing, raised and spread before a lash, whipped round in it.
    if (state === 'whip') this.spin = Math.min(1, ctx.stateTime / WYRM.whipTime) * Math.PI * 2;
    else this.spin = ease(this.spin, 0, dt, 12);
    const tailSeg = this.segs[this.segs.length - 1].group;
    this.spurs.forEach((sp, i) => {
      const s = i === 0 ? -1 : 1;
      // Back and out, lifted by so much; whipped right round in a lash. Worked out in the world, like its feelers, so
      // that however its tail lies a spur's end is never in the floor.
      const out = s * (0.22 + tailUp * 0.5) + this.spin;
      const up = tailUp * 0.75 + 0.05 + 0.04 * Math.sin(t * 5 + i);
      T.f.set(Math.sin(out) * Math.cos(up), Math.sin(up), -Math.cos(out) * Math.cos(up)).applyQuaternion(tailSeg.quaternion);
      const rootY = tailSeg.position.y + T.a.copy(sp.position).applyQuaternion(tailSeg.quaternion).y * sc;
      const least = Math.min(1, (0.06 - rootY) / (1.5 * sc));
      if (T.f.y < least) {
        const flat = Math.hypot(T.f.x, T.f.z) || 1;
        const k = Math.sqrt(Math.max(0, 1 - least * least)) / flat;
        T.f.set(T.f.x * k, least, T.f.z * k);
      }
      aim(sp, T.f.applyQuaternion(T.q.copy(tailSeg.quaternion).invert()), T.pole.set(0, 1, 0));
    });

    // The ring on the floor where its coil will close: faint while it winds, bright and beating once it has reared.
    const coiling = state === 'coil' || state === 'coilWind' || state === 'squeeze';
    this.ring.visible = coiling;
    if (coiling) {
      this.ring.position.set(ctx.coilAt.x, 0.04, ctx.coilAt.z);
      this.ring.scale.setScalar(WYRM.coilRadius - WYRM.segRadius);
      this.ringMat.opacity = state === 'coil' ? 0.3 : 0.65 + 0.35 * Math.sin(t * 30);
    }

    // Its eyes: green embers; red and burning before a blow no shield will stop (the charge, the coil).
    const glow = Math.min(1, Math.max(0, v[I.glow])) * (ctx.raging ? 0.85 + 0.15 * Math.sin(t * 11) : 0.85);
    const red = state === 'chargeWind' || state === 'charge' || state === 'coilWind' || state === 'squeeze' ? 1 : 0;
    this.eyeMat.color.setRGB((0.25 + 0.75 * glow) * (red ? 1 : 0.6), (0.1 + 0.9 * glow) * (red ? 0.18 : 1), 0.05 + 0.3 * glow * (red ? 0.2 : 1));

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.mat.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    (this.matPlain.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }

  /** Where the parts of it are, in the world. (For tests and effects.) */
  parts(): { head: THREE.Vector3; segments: THREE.Vector3[]; feet: THREE.Vector3[]; fangTips: THREE.Vector3[]; spurTips: THREE.Vector3[]; feelerTips: THREE.Vector3[] } {
    this.root.updateMatrixWorld(true);
    return {
      head: this.head.getWorldPosition(new THREE.Vector3()),
      segments: this.segs.map((s) => s.group.getWorldPosition(new THREE.Vector3())),
      feet: this.segs.flatMap((s) => s.legs.map((l) => l.shin.localToWorld(new THREE.Vector3(SHIN * s.taper, 0, 0)))),
      fangTips: this.hooks.map((h) => h.localToWorld(new THREE.Vector3(0, 0.5, 0))),
      spurTips: this.spurs.map((s) => s.localToWorld(new THREE.Vector3(1.5, 0, 0))),
      feelerTips: this.feelers.map((f) => f.localToWorld(new THREE.Vector3(1.7, 0, 0))),
    };
  }
}
