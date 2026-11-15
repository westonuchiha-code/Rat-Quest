import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { bead, modelKit, paint } from '../render/modelKit';
import { Probe, Springs, aim, ease, twoBone } from '../render/bugRig';
import { HORNET, type HornetState } from './hornet';

/**
 * Hornet Lancer model: a great hornet in the air. A dark furred chest with an amber collar, a yellow face with two
 * big wine-dark eyes, feelers and jaws; a wasp's waist; a long striped abdomen with a sting; four pale wings that
 * beat too fast to follow; four thin legs that hang under it; and a lance twice as long as its chest, held in its
 * two front legs: a pale shaft, an iron guard before its hands, an iron point, a red pennant behind the point.
 *
 * How it is posed. THE LANCE COMES FIRST, and its point comes from the rules: they say where the point is and which
 * way the lance runs (it is the point that strikes him), so the lance is drawn with its point exactly there and its
 * front legs are then laid to the shaft. Its body is a few springs: how far its nose is down, how it is rolled, which
 * way its abdomen hangs. The rules' y is the bottom of its body; nothing of it is ever drawn under the floor it is
 * given (its body is lifted, its feet and wing tips held up), so it can lie on the ground, or hang by its lance.
 */
const C = {
  black: 0x1c1410, brown: 0x3a2416, amber: 0xf2a81e, yellow: 0xffd23a, face: 0xf6c12a, eye: 0x4a0f12, glint: 0xffc0a0,
  wing: 0xeadfbe, vein: 0x9a7a4a, leg: 0x2a1c12, legTip: 0xd08a1e, wood: 0xd2c092, iron: 0x5a5f69, ironDark: 0x30333a, red: 0xc22a2a, redDark: 0x7a1616,
};
/** The middle of its chest above the bottom of its body. */
const CHEST = 0.3;
const UPPER = 0.3;
const FORE = 0.32;
const THIGH = 0.34;
const SHIN = 0.44;
/** Along the lance from where its right front leg holds it: the butt behind, the left leg's hold, and the point. */
const BUTT = -0.32;
const LEFT_HOLD = 0.3;
const POINT = HORNET.lance;

type V3 = [number, number, number];
interface Pose {
  /** Nose down (radians; up if less than 0), rolled over to its right, and lifted or dropped. */
  pitch: number;
  roll: number;
  lift: number;
  /** Which way its abdomen runs, in its body's own space: [sideways, up, forward]. */
  abdomen: V3;
  /** Its head nodded down. Feelers: 0 forward .. 1 laid back. */
  head: number;
  feelers: number;
  /** Wings: how far out from its back (0 folded .. 1 full), and how hard they beat (0 still .. 1). */
  spread: number;
  beat: number;
  /** Legs: 0 hanging .. 1 drawn up to its belly. Splay: 0 under it .. 1 out to its sides (lying down). */
  tuck: number;
  splay: number;
}

const HOVER: Pose = { pitch: -0.3, roll: 0, lift: 0, abdomen: [0, -0.62, -0.78], head: 0.25, feelers: 0, spread: 1, beat: 0.8, tuck: 0, splay: 0 };
const ALERT: Pose = { ...HOVER, pitch: -0.5, abdomen: [0, -0.3, -0.95], head: -0.1, beat: 1 };
/** The dive's tell: nose down the line of the lance, sting cocked up, wings whining. */
const DIVE_WIND: Pose = { ...HOVER, pitch: 0.2, abdomen: [0, 0.42, -0.91], head: 0, feelers: 0.6, beat: 1, tuck: 0.5 };
/** Coming down: stretched out along the lance, everything drawn in. */
const DIVE: Pose = { ...HOVER, pitch: 0.3, abdomen: [0, 0.05, -1], head: -0.1, feelers: 1, spread: 0.75, beat: 1, tuck: 1 };
/** Its lance in the floor: hanging on it, legs down to push, abdomen low. */
const STUCK: Pose = { ...HOVER, pitch: 0.3, lift: -0.14, abdomen: [0, -0.3, -0.95], head: 0.3, feelers: 0.3, beat: 1, tuck: 0, splay: 0.35 };
/** The joust's tell and the run: level, lance couched, legs up. */
const JOUST_WIND: Pose = { ...HOVER, pitch: 0.02, abdomen: [0, 0.12, -0.99], head: -0.05, feelers: 0.5, beat: 1, tuck: 0.7 };
const JOUST: Pose = { ...HOVER, pitch: 0.12, abdomen: [0, 0.02, -1], head: -0.15, feelers: 1, spread: 0.8, beat: 1, tuck: 1 };
const CLIMB: Pose = { ...HOVER, pitch: -0.6, abdomen: [0, -0.2, -0.98], head: -0.2, beat: 1 };
/** Knocked out of the air: tumbling, wings useless. */
const FALL: Pose = { ...HOVER, pitch: 0.4, roll: 2.4, abdomen: [0, 0.3, -0.95], head: 0.4, feelers: 1, spread: 0.5, beat: 0.1, tuck: 0.6 };
/** On the floor: on its belly, wings down, legs out. */
const GROUNDED: Pose = { ...HOVER, pitch: 0.1, lift: -0.12, abdomen: [0, -0.06, -1], head: 0.5, feelers: 0.8, spread: 0.85, beat: 0.12, tuck: 0, splay: 1 };
/** Dead: over on its back, legs curled, wings still. */
const DEAD: Pose = { ...HOVER, pitch: -0.1, roll: Math.PI, lift: 0, abdomen: [0, 0.25, -0.97], head: 0.6, feelers: 1, spread: 0.9, beat: 0, tuck: 1, splay: 0 };

const SIZE = 12;
function flatten(p: Pose, out: Float32Array): void {
  out[0] = p.pitch;
  out[1] = p.roll;
  out[2] = p.lift;
  out.set(p.abdomen, 3);
  out[6] = p.head;
  out[7] = p.feelers;
  out[8] = p.spread;
  out[9] = p.beat;
  out[10] = p.tuck;
  out[11] = p.splay;
}

export interface HornetAnimInput {
  state: HornetState;
  stateTime: number;
  /** Where the rules have it: the bottom of its body, and the way it faces. */
  x: number;
  y: number;
  z: number;
  facing: number;
  /** The point of its lance and the way the lance runs, from the rules (world). */
  tip: { x: number; y: number; z: number };
  aim: { x: number; y: number; z: number };
  /** The floor under it (world height): nothing of it is drawn below that, and its shadow lies on it. */
  floor: number;
  /** How fast it is going over the floor. */
  moving: number;
}

interface Limb {
  upper: THREE.Group;
  fore: THREE.Group;
  /** Where it joins the body, in the body's own space. */
  at: THREE.Vector3;
  side: -1 | 1;
}

export class HornetModel {
  readonly root = new THREE.Group();
  /** Its body: turned (nose down, rolled) about the middle of its chest. */
  private readonly frame = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly abdomen = new THREE.Group();
  private readonly feelers: THREE.Group[] = [];
  private readonly wings: Array<{ pivot: THREE.Group; flap: THREE.Group; side: -1 | 1; hind: boolean }> = [];
  private readonly arms: Limb[] = [];
  private readonly legs: Array<Limb & { hind: boolean }> = [];
  private readonly lance = new THREE.Group();
  private readonly pennant: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly mat = createPs1Material({ lit: true, shine: 0.3 });
  private readonly matPlain = createPs1Material({ lit: true });
  private readonly wingMat = createPs1Material({ lit: true, side: THREE.DoubleSide });
  private readonly springs = new Springs(SIZE);
  private readonly lanceDir = new THREE.Vector3(0, -0.34, 0.94);
  /** Where its right front leg has the shaft (the root's own space). */
  private readonly holdAt = new THREE.Vector3(-0.2, 0.05, 0.14);
  private readonly probes: Probe[] = [];
  private readonly wingProbes: Probe[] = [];
  private flashAmount = 0;
  private time = 0;
  private scale = 1;
  /** How far short of the lance each front leg falls (0: its foot is on the shaft). For the tests. */
  readonly reachShort = [0, 0];

  constructor() {
    const K = modelKit(this.mat);
    const P = modelKit(this.matPlain);
    this.root.add(this.frame);
    this.frame.position.set(0, CHEST, 0);

    // Chest: dark and furred, an amber collar behind its head, an amber spot at the back.
    this.frame.add(K.blob(0.25, 0.23, 0.3, (_x, y, z) => (z > 0.5 ? C.amber : y > 0.55 ? C.brown : C.black), 0, 0, 0, 8, 6));
    this.frame.add(K.blob(0.1, 0.05, 0.08, C.amber, 0, 0.19, -0.19, 6, 4));
    // Its waist.
    this.frame.add(P.blob(0.07, 0.07, 0.1, C.black, 0, -0.03, -0.32, 6, 4));

    // Head: a yellow face, two great eyes wrapped round its sides, jaws, and feelers that bend forward.
    this.head.position.set(0, 0.03, 0.36);
    this.frame.add(this.head);
    this.head.add(K.blob(0.19, 0.17, 0.15, (_x, y, z) => (y > 0.5 && z < 0.4 ? C.brown : z > -0.2 ? C.face : C.black), 0, 0, 0, 8, 6));
    const eyeMat = createPs1Material({ lit: true, shine: 0.9, color: 0xffffff });
    const E = modelKit(eyeMat);
    const glint = new THREE.MeshBasicMaterial({ color: C.glint });
    for (const side of [-1, 1]) {
      const eye = E.blob(0.085, 0.13, 0.1, C.eye, side * 0.145, 0.03, 0.03, 7, 5, 0.1);
      eye.rotation.z = side * -0.25;
      this.head.add(eye);
      this.head.add(bead(0.022, glint, side * 0.19, 0.09, 0.09));
      // Jaws: two dark hooks under its face.
      const jaw = P.cone(0.035, 0.13, C.ironDark, 4);
      jaw.position.set(side * 0.06, -0.1, 0.1);
      jaw.rotation.set(Math.PI * 0.72, 0, side * 0.25);
      this.head.add(jaw);
      // A feeler: up from its brow, then forward and down.
      const base = new THREE.Group();
      base.position.set(side * 0.07, 0.13, 0.08);
      const first = P.spar(0.02, 0.016, 0.16, C.black, 4);
      const second = P.spar(0.016, 0.008, 0.3, (x) => (x > 0.4 ? C.amber : C.black), 4);
      second.position.x = 0.16;
      second.rotation.z = -1.25;
      base.add(first, second);
      this.head.add(base);
      this.feelers.push(base);
    }

    // Abdomen: a long drop in bands of amber and black, built along its own +X, with a sting at the end.
    this.abdomen.position.set(0, -0.03, -0.38);
    this.frame.add(this.abdomen);
    const rings: Array<[number, number]> = [[0, 0.07], [0.1, 0.2], [0.24, 0.265], [0.4, 0.26], [0.54, 0.21], [0.66, 0.14], [0.76, 0.07]];
    for (let i = 0; i + 1 < rings.length; i++) {
      const [x0, r0] = rings[i];
      const [x1, r1] = rings[i + 1];
      const geo = new THREE.CylinderGeometry(r1, r0, x1 - x0, 8, 1);
      geo.translate(0, (x1 - x0) / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      const band = i % 2 === 0 ? C.black : C.amber;
      const seg = new THREE.Mesh(paint(geo, (_nx, ny) => (band === C.amber && ny < -0.55 ? C.yellow : band), 0.3), this.mat);
      seg.position.x = x0;
      this.abdomen.add(seg);
    }
    const sting = P.cone(0.035, 0.17, C.ironDark, 4);
    sting.position.x = 0.75;
    sting.rotation.z = -Math.PI / 2;
    this.abdomen.add(sting);

    // Wings: two long ones and two short behind them, each a flat blade on a hinge at its root.
    const blade = (len: number, chord: number, side: -1 | 1): THREE.Mesh => {
      const pts: Array<[number, number]> = [[0, 0.03], [0.26, 0.38], [0.62, 0.52], [0.92, 0.3], [1, 0], [0.88, -0.3], [0.52, -0.46], [0.2, -0.3], [0, -0.03]];
      const v: number[] = [];
      const mid: [number, number] = [0.45, 0];
      for (let i = 0; i + 1 < pts.length; i++) {
        for (const q of [mid, pts[i], pts[i + 1]]) v.push(q[0] * len * side, 0, q[1] * chord);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
      geo.computeVertexNormals();
      return new THREE.Mesh(paint(geo, (_x, _y, z) => (z > 0.55 ? C.vein : C.wing)), this.wingMat);
    };
    for (const hind of [false, true]) {
      for (const side of [-1, 1] as const) {
        const pivot = new THREE.Group();
        pivot.position.set(side * 0.1, 0.19, hind ? -0.1 : 0.05);
        const flap = new THREE.Group();
        flap.add(blade(hind ? 0.62 : 0.98, hind ? 0.2 : 0.26, side));
        pivot.add(flap);
        this.frame.add(pivot);
        this.wings.push({ pivot, flap, side, hind });
      }
    }

    // Legs. The front pair hold the lance; the other four hang under it.
    const limb = (l1: number, l2: number, thin: number): { upper: THREE.Group; fore: THREE.Group } => {
      const upper = new THREE.Group();
      upper.add(P.spar(thin, thin * 0.8, l1, C.leg, 4));
      const fore = new THREE.Group();
      fore.add(P.spar(thin * 0.8, thin * 0.45, l2, (x) => (x > 0.3 ? C.legTip : C.leg), 4));
      this.root.add(upper, fore);
      return { upper, fore };
    };
    for (const side of [-1, 1] as const) this.arms.push({ ...limb(UPPER, FORE, 0.03), at: new THREE.Vector3(side * 0.15, -0.13, 0.2), side });
    for (const hind of [false, true]) {
      for (const side of [-1, 1] as const) this.legs.push({ ...limb(THIGH, SHIN, 0.028), at: new THREE.Vector3(side * 0.16, -0.14, hind ? -0.17 : 0.0), side, hind });
    }

    // The lance, along its own +X from where its right front leg holds it.
    this.root.add(this.lance);
    const shaft = P.spar(0.032, 0.024, POINT - 0.28 - BUTT, C.wood, 6);
    shaft.position.x = BUTT;
    this.lance.add(shaft);
    const guard = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.035, 0.12, 0.11, 7, 1).rotateZ(Math.PI / 2), (x) => (x > 0 ? C.ironDark : C.iron)), this.mat);
    guard.position.x = LEFT_HOLD + 0.16;
    this.lance.add(guard);
    const point = K.cone(0.055, 0.3, (_x, y) => (y > 0.2 ? C.iron : C.ironDark), 5);
    point.position.x = POINT - 0.3;
    point.rotation.z = -Math.PI / 2;
    this.lance.add(point);
    const flag = new THREE.BufferGeometry();
    flag.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, -0.2, 0, 0, -0.17, -0.24, 0]), 3));
    flag.computeVertexNormals();
    this.pennant = new THREE.Mesh(paint(flag, (_x, y) => (y < 0 ? C.redDark : C.red)), this.wingMat);
    this.pennant.position.x = POINT - 0.32;
    this.lance.add(this.pennant);

    // Its shadow on the floor (so he can see where it is over).
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.root.add(this.shadow);

    this.root.updateMatrixWorld(true);
    this.probes.push(new Probe(this.frame.children[0]), new Probe(this.head, this.feelers), new Probe(this.abdomen), ...this.feelers.map((f) => new Probe(f)));
    for (const w of this.wings) this.wingProbes.push(new Probe(w.flap));
    flatten(HOVER, this.springs.target);
    this.springs.snap();
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes it white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  private poseFor(state: HornetState): Pose {
    switch (state) {
      case 'alert': return ALERT;
      case 'diveWind': return DIVE_WIND;
      case 'dive': return DIVE;
      case 'stuck': return STUCK;
      case 'free': return STUCK;
      case 'joustWind': return JOUST_WIND;
      case 'joust': return JOUST;
      case 'climb': return CLIMB;
      case 'fall': return FALL;
      case 'grounded': return GROUNDED;
      case 'dead': return DEAD;
      default: return HOVER;
    }
  }

  private readonly T = {
    v: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), pole: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dir: new THREE.Vector3(),
    tip: new THREE.Vector3(), hold: new THREE.Vector3(), inv: new THREE.Matrix4(), m: new THREE.Matrix4(),
  };

  update(dt: number, ctx: HornetAnimInput): void {
    const T = this.T;
    const state = ctx.state;
    this.time += dt;
    this.root.position.set(ctx.x, ctx.y, ctx.z);
    this.root.rotation.y = ctx.facing;
    const lying = state === 'fall' || state === 'grounded' || state === 'dead';
    /** The floor, in the root's own space (it has no tilt, only a turn, so heights carry straight over). */
    const floor = ctx.floor - ctx.y;

    // ---- Its body ----
    const pose = this.poseFor(state);
    flatten(pose, this.springs.target);
    const S = this.springs.target;
    // Diving, and hanging on its lance, its nose is down the line of the lance (whatever the slope of it).
    const slope = Math.asin(Math.max(-1, Math.min(1, -ctx.aim.y)));
    if (state === 'diveWind') S[0] = slope * 0.75;
    if (state === 'dive' || state === 'stuck' || state === 'free') S[0] = slope;
    // Stuck, it heaves at its lance: a shake of its whole body, twice a second.
    const heave = state === 'stuck' ? Math.max(0, Math.sin(ctx.stateTime * Math.PI * 4)) : 0;
    if (state === 'stuck') {
      S[0] += 0.14 * heave;
      S[4] -= 0.25 * heave;
    }
    // Falling, it turns over and over.
    if (state === 'fall') S[1] = 2.4 + ctx.stateTime * 9;
    const snap = state === 'dive' || state === 'joust';
    this.springs.step(dt, snap ? 26 : lying ? 13 : 15, snap ? 1 : 0.8);
    const v = this.springs.value;
    const bob = lying || state === 'stuck' ? 0 : Math.sin(this.time * 5.3) * 0.02;
    this.frame.rotation.set(v[0], 0, v[1], 'YXZ');
    this.frame.position.set(0, CHEST + v[2] + bob, 0);
    this.head.rotation.x = v[6];
    aim(this.abdomen, T.dir.set(v[3], v[4], v[5]), T.up);
    for (let i = 0; i < 2; i++) this.feelers[i].rotation.set(-0.5 + v[7] * 1.6, 0, Math.PI / 2 + (i === 0 ? 0.35 : -0.35));

    // Wings: out from its back, beating. (Two beats are drawn a second apart in phase, so they shimmer.)
    const beat = v[9];
    const wing = Math.sin(this.time * 71) * 0.62 * beat;
    for (const w of this.wings) {
      const spread = v[8];
      // Folded they lie back along its abdomen; spread they stand out to its sides.
      w.pivot.rotation.y = w.side * ((1 - spread) * (w.hind ? 1.15 : 1.3) + spread * (w.hind ? 0.45 : 0.12));
      w.flap.rotation.z = w.side * (0.22 * spread + (w.hind ? -wing * 0.8 : wing) + (lying ? -0.1 : 0));
    }

    // ---- Nothing under the floor: its body is lifted until its lowest point is on it ----
    this.root.updateMatrixWorld(true);
    T.inv.copy(this.root.matrixWorld).invert();
    let low = Infinity;
    for (const p of this.probes) low = Math.min(low, p.low(T.inv, T.m));
    if (low < floor + 0.01) {
      this.frame.position.y += floor + 0.01 - low;
      this.root.updateMatrixWorld(true);
    }
    // (A wing that would dip into the floor is turned on its hinge, whichever way lifts it, until it does not.)
    this.wings.forEach((w, i) => {
      for (let n = 0; n < 10; n++) {
        const was = this.wingProbes[i].low(T.inv, T.m);
        if (was >= floor + 0.006) break;
        const step = Math.min(0.35, (floor + 0.014 - was) * 1.4 + 0.02);
        const z0 = w.flap.rotation.z;
        let best = was;
        let bestZ = z0;
        for (const way of [1, -1]) {
          w.flap.rotation.z = z0 + way * step;
          w.flap.updateMatrixWorld(true);
          const l = this.wingProbes[i].low(T.inv, T.m);
          if (l > best) {
            best = l;
            bestZ = w.flap.rotation.z;
          }
        }
        w.flap.rotation.z = bestZ;
        w.flap.updateMatrixWorld(true);
        if (bestZ === z0) break;
      }
    });

    // ---- The lance: its point where the rules have it ----
    // (The rules' point and direction are in the world; the root is only moved and turned.)
    const cf = Math.cos(ctx.facing);
    const sf = Math.sin(ctx.facing);
    const toLocal = (wx: number, wy: number, wz: number, out: THREE.Vector3): THREE.Vector3 => out.set(wx * cf - wz * sf, wy, wx * sf + wz * cf);
    // Where its right front leg carries the shaft: under its chest, to its right, so the lance runs past its body
    // and under its head, not through them. (A place on its body: it turns as its body does.)
    this.frame.updateMatrix();
    const grip = T.b.set(-0.2, -0.27, 0.14).applyMatrix4(this.frame.matrix);
    const exactNow = state === 'dive' || state === 'stuck' || state === 'free' || state === 'joust';
    const soft = 1 - Math.exp(-dt * 14);
    if (lying && state !== 'fall') {
      // Dropped: it lies on the floor along its right side, resting on its guard and its point.
      T.a.set(0.12, -0.113, 0.99).normalize();
      this.lanceDir.lerp(T.a, soft).normalize();
      T.hold.set(-0.4, floor + 0.18, 0.02);
      this.holdAt.lerp(T.hold, soft);
    } else if (state === 'fall') {
      // (Still in its grip as it falls, and turning over with it.)
      this.lanceDir.set(0, -0.1, 1).applyQuaternion(this.frame.quaternion).normalize();
      this.holdAt.copy(grip);
    } else {
      toLocal(ctx.tip.x - ctx.x, ctx.tip.y - ctx.y, ctx.tip.z - ctx.z, T.tip);
      // Its point is never under the floor (the rules put it ON the floor when it sticks).
      if (T.tip.y < floor) T.tip.y = floor;
      if (exactNow) {
        // Its point exactly where the rules have it: the lance is laid from there back past its grip, and its
        // front legs go to it.
        this.lanceDir.copy(T.tip).sub(grip).normalize();
        this.holdAt.copy(T.tip).addScaledVector(this.lanceDir, -POINT);
      } else {
        // Carried: its front leg keeps its place under its chest, and the lance swings round to where it is wanted.
        T.a.copy(T.tip).sub(grip).normalize();
        this.lanceDir.lerp(T.a, soft).normalize();
        this.holdAt.lerp(grip, 1 - Math.exp(-dt * 20));
      }
    }
    // Neither its point, its butt nor its guard under the floor: it is lifted, whole, by what is missing.
    {
      const d = this.lanceDir;
      const lowAt = Math.min(this.holdAt.y + d.y * POINT, this.holdAt.y + d.y * BUTT - 0.035, this.holdAt.y + d.y * (LEFT_HOLD + 0.16) - 0.125 * Math.hypot(d.x, d.z));
      if (!exactNow && lowAt < floor + 0.012) this.holdAt.y += floor + 0.012 - lowAt;
    }
    T.hold.copy(this.holdAt);
    this.lance.position.copy(T.hold);
    aim(this.lance, this.lanceDir, T.up);
    // The pennant streams back when it moves, and hangs when it does not.
    // (Near the floor it lies over on its side: it is never let hang through it.)
    const room = T.hold.y + this.lanceDir.y * (POINT - 0.5) - floor - 0.02;
    const fold = Math.acos(Math.max(0, Math.min(1, room / 0.27)));
    this.pennant.rotation.x = Math.max(fold, Math.abs(Math.sin(this.time * 9) * 0.25 * Math.min(1, 0.3 + ctx.moving / 8)));
    // (Moving, it streams: drawn out along the shaft and flattened to it. It stays fast to the shaft by its edge.)
    const stream = fold > 0.05 ? 0 : Math.min(1, ctx.moving / 12);
    this.pennant.scale.set(1 + 0.6 * stream, 1 - 0.55 * stream, 1);

    // ---- Its front legs, laid to the shaft ----
    this.arms.forEach((arm, i) => {
      const from = T.v.copy(arm.at).applyMatrix4(this.frame.matrix);
      // Its right leg holds the lance where the rules have it held, its left a little further up the shaft.
      const to = T.b.copy(T.hold).addScaledVector(this.lanceDir, arm.side < 0 ? 0 : LEFT_HOLD);
      T.pole.set(arm.side * 0.8, -0.5, 0.3);
      if (state === 'dead') {
        // Let go: curled up over its belly (which is uppermost).
        to.copy(from).add(T.a.set(arm.side * 0.1, 0.32, 0.08));
      }
      this.reachShort[i] = twoBone(from, to, T.pole, UPPER, FORE, arm.upper, arm.fore);
    });

    // ---- Its other four legs: hanging, drawn up, braced, or sprawled ----
    const tuck = v[10];
    const splay = v[11];
    this.legs.forEach((leg, i) => {
      const from = T.v.copy(leg.at).applyMatrix4(this.frame.matrix);
      const sway = Math.sin(this.time * 3.4 + i * 1.7) * 0.03 * (1 - tuck);
      // Hanging: down and a little back. Drawn up: folded close under its chest. Sprawled: out to the side on the floor.
      const hang = T.a.set(leg.side * 0.2, -0.5, leg.hind ? -0.28 : -0.06);
      const up = T.b.set(leg.side * 0.2, -0.16, leg.hind ? -0.22 : 0.08);
      const out = T.dir.set(leg.side * 0.52, -0.3, leg.hind ? -0.3 : 0.12);
      const to = T.tip.copy(hang).lerp(up, tuck).lerp(out, splay);
      to.x += sway;
      // (These are offsets in its body's own space: they turn with it.)
      to.applyQuaternion(this.frame.quaternion).add(from);
      if (state === 'dead') {
        // On its back: its legs curl up over its belly, which is uppermost.
        to.copy(from).add(T.a.set(leg.side * 0.1, 0.34, leg.hind ? -0.05 : 0.06));
      } else if (state === 'stuck' || state === 'free' || state === 'grounded') {
        // Feet down on the floor, where they can push. (Hanging on its lance its hips are high, and highest at the
        // back: each foot goes down nearly straight under its hip, where the leg can reach.)
        if (state !== 'grounded') to.set(from.x + leg.side * 0.18, floor + 0.02, from.z + (leg.hind ? -0.02 : 0.1) + 0.05 * heave);
        to.y = Math.min(to.y, floor + 0.02);
      }
      if (to.y < floor + 0.02) to.y = floor + 0.02;
      T.pole.set(leg.side * 0.7, 0.6, leg.hind ? -0.3 : 0.2);
      twoBone(from, to, T.pole, THIGH, SHIN, leg.upper, leg.fore);
      // (A knee is held off the floor too: with its foot down and its hip low, the leg lies out flat.)
      if (leg.fore.position.y < floor + 0.03) {
        T.pole.set(leg.side, 0.05, 0);
        twoBone(from, to, T.pole, THIGH, SHIN, leg.upper, leg.fore);
        this.liftJoint(leg, from, to, floor);
      }
    });
    // (And its elbows.)
    this.arms.forEach((arm, i) => {
      if (arm.fore.position.y >= floor + 0.03) return;
      const from = T.v.copy(arm.at).applyMatrix4(this.frame.matrix);
      const to = T.b.copy(T.hold).addScaledVector(this.lanceDir, i === 0 ? 0 : LEFT_HOLD);
      this.liftJoint(arm, from, to, floor);
    });

    // Its shadow lies on the floor, smaller the higher it is.
    const high = Math.max(0, -floor);
    this.shadow.position.set(0, floor + 0.02, 0);
    this.shadow.scale.setScalar(Math.max(0.45, 1.25 - high * 0.2));
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.34 - high * 0.05) * this.scale;

    // Dead, after a moment it shrivels away.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 1.6) / 0.6)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale));

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    for (const m of [this.mat, this.matPlain, this.wingMat]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    this.root.updateMatrixWorld(true);
  }

  /** A knee or elbow that would be under the floor is held on it, and the two pieces laid to it again. */
  private liftJoint(limb: Limb, from: THREE.Vector3, to: THREE.Vector3, floor: number): void {
    const joint = limb.fore.position;
    if (joint.y >= floor + 0.03) return;
    joint.y = floor + 0.03;
    const T = this.T;
    aim(limb.upper, T.a.copy(joint).sub(from), T.up);
    aim(limb.fore, T.a.copy(to).sub(joint), T.up);
  }

  /** Where things are in the world, for the tests: the lance's point and butt, where its front legs meet it, its feet. */
  parts(): { tip: THREE.Vector3; butt: THREE.Vector3; hands: THREE.Vector3[]; holds: THREE.Vector3[]; feet: THREE.Vector3[]; chest: THREE.Vector3; head: THREE.Vector3; abdomen: THREE.Vector3[] } {
    this.root.updateMatrixWorld(true);
    const at = (o: THREE.Object3D, x: number, y = 0, z = 0): THREE.Vector3 => o.localToWorld(new THREE.Vector3(x, y, z));
    return {
      tip: at(this.lance, POINT),
      butt: at(this.lance, BUTT),
      hands: this.arms.map((a) => at(a.fore, FORE)),
      holds: [at(this.lance, 0), at(this.lance, LEFT_HOLD)],
      feet: this.legs.map((l) => at(l.fore, SHIN)),
      chest: at(this.frame, 0),
      head: at(this.head, 0),
      abdomen: [at(this.abdomen, 0.12), at(this.abdomen, 0.32), at(this.abdomen, 0.52), at(this.abdomen, 0.7)],
    };
  }
}
