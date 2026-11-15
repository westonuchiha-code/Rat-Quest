import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { bead, modelKit, paint } from '../render/modelKit';
import { Probe, Springs, aim, ease, twoBone } from '../render/bugRig';
import type { FireflyState } from './firefly';

/**
 * Firefly Bomber model: a great lightning bug. A soft dark body; a broad flat hood over its small head, orange-red with
 * a black spot; two big black eyes under it and two thin feelers; two long dark wing cases edged in pale yellow that
 * stand up and out of the way when it flies; two clear wings under them that beat; six thin legs that hang; and its
 * LANTERN, the last three rings of a long abdomen that hangs down behind it, lit from inside.
 *
 * How it is posed. Its body is a few springs (nose down, rolled, lifted, wing cases up or folded, legs hanging or
 * drawn up). THE TIP OF ITS LANTERN COMES FROM THE RULES while it flies (`vent`: a drop of fire leaves it from there,
 * so the abdomen is pointed at that spot from wherever the body is, and on a bombing run the body is moved the last
 * hair so that the tip is exactly there). How bright the lantern is comes from the rules too (`light`): dark when it
 * is spent, bright when full, white-hot when it flares before a run. The rules' y is the bottom of its body; nothing
 * of it is ever drawn under the floor it is given.
 */
const C = {
  body: 0x2a2320, bodyLight: 0x4a3c34, hood: 0xe8642a, hoodRim: 0xf6d9a0, spot: 0x1a1412, eye: 0x0c0a0a, glint: 0xfff0c0,
  case: 0x2c2622, caseEdge: 0xf0d77a, wing: 0xd8e4dc, vein: 0x8fa69a, leg: 0x241c18, legTip: 0x6a5a48, feeler: 0x3a2e28,
  // (Its lantern is not shaded by the room, and unshaded colours come out brighter on the screen than their numbers:
  // these are chosen for how they look there. Dark: a dull unlit amber. Lit: a firefly's yellow-green.)
  dark: 0x100e03, lit: 0xc6ff1e, hot: 0xfffff0,
};
/** The middle of its chest above the bottom of its body. */
const CHEST = 0.32;
/** Its abdomen, from where it joins the chest to the tip of its lantern. */
const TAIL = 0.64;
/** Where its lantern starts along that. */
const LANTERN = 0.3;
/** How far its glow reaches from the middle of its lantern, at full light. */
const HALO = 0.3;
const THIGH = 0.21;
const SHIN = 0.27;

type V3 = [number, number, number];
interface Pose {
  /** Nose down (radians; up if less than 0), rolled over to its right, and lifted or dropped. */
  pitch: number;
  roll: number;
  lift: number;
  /** Which way its abdomen runs when the rules do not say (its body's own space): [sideways, up, forward]. */
  abdomen: V3;
  /** Its head nodded down. Feelers: 0 forward .. 1 laid back. */
  head: number;
  feelers: number;
  /** Wing cases: 0 folded down along its back .. 1 stood up and out. Wings: how far out (0..1) and how hard they beat (0..1). */
  cases: number;
  spread: number;
  beat: number;
  /** Legs: 0 hanging .. 1 drawn up to its belly. Splay: 0 under it .. 1 out to its sides (lying down). */
  tuck: number;
  splay: number;
}

const HOVER: Pose = { pitch: 0.05, roll: 0, lift: 0, abdomen: [0, -0.42, -0.91], head: 0.15, feelers: 0, cases: 1, spread: 1, beat: 0.85, tuck: 0.2, splay: 0 };
const ALERT: Pose = { ...HOVER, pitch: -0.25, head: -0.2, feelers: 0.2, beat: 1 };
/** The tell: nose down along its line, feelers back, legs drawn up, wings hard at it. */
const RUN_WIND: Pose = { ...HOVER, pitch: 0.3, head: -0.1, feelers: 0.6, beat: 1, tuck: 0.7 };
/** The run: level and fast, everything drawn in. */
const RUN: Pose = { ...HOVER, pitch: 0.16, head: -0.05, feelers: 1, beat: 1, tuck: 1 };
/** Spent: sagging, its abdomen hanging straight down, cases half fallen, wings labouring, legs dangling. */
const SPENT: Pose = { ...HOVER, pitch: -0.3, lift: -0.03, abdomen: [0, -0.96, -0.28], head: 0.55, feelers: 0.5, cases: 0.55, spread: 1, beat: 0.5, tuck: 0, splay: 0.1 };
/** Knocked out of the air: tumbling. */
const FALL: Pose = { ...HOVER, pitch: 0.5, roll: 2.2, abdomen: [0, 0.2, -0.98], head: 0.4, feelers: 1, cases: 0.7, spread: 0.5, beat: 0.1, tuck: 0.6 };
/** On the floor: on its belly, cases askew, wings down, legs out. */
const GROUNDED: Pose = { ...HOVER, pitch: 0.08, lift: -0.1, abdomen: [0, -0.1, -0.99], head: 0.5, feelers: 0.8, cases: 0.3, spread: 0.8, beat: 0.1, tuck: 0, splay: 1 };
/** Dead: over on its back, legs curled, cases shut, its lantern out. */
const DEAD: Pose = { ...HOVER, pitch: -0.1, roll: Math.PI, lift: 0, abdomen: [0, 0.2, -0.98], head: 0.6, feelers: 1, cases: 0.12, spread: 0.6, beat: 0, tuck: 1, splay: 0 };

const SIZE = 13;
function flatten(p: Pose, out: Float32Array): void {
  out[0] = p.pitch;
  out[1] = p.roll;
  out[2] = p.lift;
  out.set(p.abdomen, 3);
  out[6] = p.head;
  out[7] = p.feelers;
  out[8] = p.cases;
  out[9] = p.spread;
  out[10] = p.beat;
  out[11] = p.tuck;
  out[12] = p.splay;
}

export interface FireflyAnimInput {
  state: FireflyState;
  stateTime: number;
  /** Where the rules have it: the bottom of its body, and the way it faces. */
  x: number;
  y: number;
  z: number;
  facing: number;
  /** The tip of its lantern, from the rules (world): a drop of fire leaves it from there. */
  vent: { x: number; y: number; z: number };
  /** How full of light its lantern is: 0 dark .. 1 full; more while it flares. */
  light: number;
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
  /** 0 front, 1 middle, 2 hind. */
  row: number;
}

export class FireflyModel {
  readonly root = new THREE.Group();
  /** Its body: turned (nose down, rolled) about the middle of its chest. */
  private readonly frame = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly abdomen = new THREE.Group();
  private readonly feelers: THREE.Group[] = [];
  private readonly cases: Array<{ hinge: THREE.Group; side: -1 | 1 }> = [];
  private readonly wings: Array<{ pivot: THREE.Group; flap: THREE.Group; side: -1 | 1 }> = [];
  private readonly legs: Limb[] = [];
  private readonly halo: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly mat = createPs1Material({ lit: true, shine: 0.25 });
  private readonly matPlain = createPs1Material({ lit: true });
  private readonly wingMat = createPs1Material({ lit: true, side: THREE.DoubleSide });
  /** Its lantern: lit from inside, so it is not shaded by the room. Its colour is its light. */
  private readonly glow = new THREE.MeshBasicMaterial({ color: C.lit });
  private readonly haloMat = new THREE.MeshBasicMaterial({ color: C.lit, transparent: true, opacity: 0.13, depthWrite: false, blending: THREE.AdditiveBlending });
  private readonly springs = new Springs(SIZE);
  private readonly probes: Probe[] = [];
  private readonly wingProbes: Probe[] = [];
  private readonly caseProbes: Probe[] = [];
  private flashAmount = 0;
  private haloSize = 1;
  private time = 0;
  private scale = 1;
  /** How bright its lantern is drawn, 0..1.8 (it follows the rules' light, quickly). For the tests. */
  shining = 1;

  constructor() {
    const K = modelKit(this.mat);
    const P = modelKit(this.matPlain);
    this.root.add(this.frame);
    this.frame.position.set(0, CHEST, 0);

    // Chest: soft and dark, a little paler underneath.
    this.frame.add(K.blob(0.2, 0.165, 0.25, (_x, y) => (y < -0.4 ? C.bodyLight : C.body), 0, 0, 0, 8, 6));
    // The hood: a broad flat shield out over its head. Orange-red, a black spot in the middle of it, a pale rim.
    const hood = K.blob(0.25, 0.06, 0.2, (x, _y, z) => (Math.hypot(x, z * 0.9 + 0.1) < 0.36 ? C.spot : Math.hypot(x, z) > 0.86 ? C.hoodRim : C.hood), 0, 0.11, 0.3, 9, 4, 0.1);
    hood.rotation.x = 0.22;
    this.frame.add(hood);

    // Head: small, tucked under the hood; two big black eyes; two thin feelers of many joints.
    this.head.position.set(0, -0.01, 0.34);
    this.frame.add(this.head);
    this.head.add(K.blob(0.11, 0.1, 0.1, C.body, 0, 0, 0, 7, 5));
    const eyeMat = createPs1Material({ lit: true, shine: 0.9, color: 0xffffff });
    const E = modelKit(eyeMat);
    const glint = new THREE.MeshBasicMaterial({ color: C.glint });
    for (const side of [-1, 1]) {
      this.head.add(E.blob(0.065, 0.075, 0.07, C.eye, side * 0.09, 0.0, 0.05, 7, 5, 0.1));
      this.head.add(bead(0.016, glint, side * 0.115, 0.03, 0.1));
      const base = new THREE.Group();
      base.position.set(side * 0.04, 0.03, 0.09);
      const first = P.spar(0.014, 0.011, 0.2, C.feeler, 4);
      const second = P.spar(0.011, 0.006, 0.26, (x) => (x > 0.2 ? C.legTip : C.feeler), 4);
      second.position.x = 0.2;
      second.rotation.z = -0.35;
      base.add(first, second);
      this.head.add(base);
      this.feelers.push(base);
    }

    // Abdomen: built along its own +X from where it joins the chest to the tip. Dark rings, then the lantern: three
    // pale rings lit from inside, and a blunt tip.
    this.abdomen.position.set(0, -0.03, -0.22);
    this.frame.add(this.abdomen);
    const rings: Array<[number, number]> = [[0, 0.1], [0.1, 0.17], [0.2, 0.185], [LANTERN, 0.18], [0.41, 0.165], [0.51, 0.135], [0.59, 0.085], [TAIL, 0.03]];
    for (let i = 0; i + 1 < rings.length; i++) {
      const [x0, r0] = rings[i];
      const [x1, r1] = rings[i + 1];
      const geo = new THREE.CylinderGeometry(r1, r0, x1 - x0, 8, 1);
      geo.translate(0, (x1 - x0) / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      const lit = x0 >= LANTERN - 1e-6;
      const seg = lit
        ? new THREE.Mesh(geo, this.glow)
        : new THREE.Mesh(paint(geo, (nx, ny) => (nx > 0.7 ? C.bodyLight : ny < -0.5 ? C.bodyLight : C.body), 0.3), this.mat);
      seg.position.x = x0;
      this.abdomen.add(seg);
    }
    // (Dark bands between the lantern's rings, so it reads as rings and not a bulb.)
    for (const x of [0.41, 0.51]) {
      const band = new THREE.Mesh(paint(new THREE.TorusGeometry(x === 0.41 ? 0.166 : 0.136, 0.012, 4, 10).rotateY(Math.PI / 2), C.body), this.matPlain);
      band.position.x = x;
      this.abdomen.add(band);
    }
    // (Its glow: two thin shells of light round the lantern, the inner one brighter.)
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(HALO, 8, 6), this.haloMat);
    this.halo.add(new THREE.Mesh(new THREE.SphereGeometry(HALO * 0.72, 8, 6), this.haloMat));
    this.halo.position.x = 0.47;
    this.abdomen.add(this.halo);

    // Wing cases: two long dark shells edged in pale yellow, hinged at its shoulders. Folded they lie back along
    // its abdomen; flying they stand up and out of the way of its wings.
    for (const side of [-1, 1] as const) {
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.08, 0.13, 0.0);
      const shell = K.blob(0.125, 0.032, 0.335, C.case, side * 0.09, 0, -0.33, 7, 5, 0.15);
      // (Its pale edge: a thinner, slightly wider leaf of the same shape under it, so only its rim shows.)
      const rim = P.blob(0.142, 0.014, 0.352, C.caseEdge, side * 0.09, -0.004, -0.335, 7, 3, 0);
      hinge.add(shell, rim);
      this.frame.add(hinge);
      this.cases.push({ hinge, side });
    }

    // Wings: two clear blades under the cases, each on a hinge at its root.
    const blade = (len: number, chord: number, side: -1 | 1): THREE.Mesh => {
      const pts: Array<[number, number]> = [[0, 0.03], [0.24, 0.36], [0.6, 0.5], [0.92, 0.3], [1, 0], [0.88, -0.32], [0.5, -0.46], [0.2, -0.28], [0, -0.03]];
      const v: number[] = [];
      const mid: [number, number] = [0.45, 0];
      for (let i = 0; i + 1 < pts.length; i++) {
        for (const q of [mid, pts[i], pts[i + 1]]) v.push(q[0] * len * side, 0, q[1] * chord);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
      geo.computeVertexNormals();
      return new THREE.Mesh(paint(geo, (_x, _y, z) => (z > 0.5 ? C.vein : C.wing)), this.wingMat);
    };
    for (const side of [-1, 1] as const) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.1, 0.12, -0.04);
      const flap = new THREE.Group();
      flap.add(blade(0.86, 0.28, side));
      pivot.add(flap);
      this.frame.add(pivot);
      this.wings.push({ pivot, flap, side });
    }

    // Six thin legs that hang under it.
    for (let row = 0; row < 3; row++) {
      for (const side of [-1, 1] as const) {
        const upper = new THREE.Group();
        upper.add(P.spar(0.024, 0.019, THIGH, C.leg, 4));
        const fore = new THREE.Group();
        fore.add(P.spar(0.019, 0.01, SHIN, (x) => (x > 0.3 ? C.legTip : C.leg), 4));
        this.root.add(upper, fore);
        this.legs.push({ upper, fore, at: new THREE.Vector3(side * 0.13, -0.11, 0.14 - row * 0.14), side, row });
      }
    }

    // Its shadow on the floor (so he can see what it is over).
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.root.add(this.shadow);

    this.root.updateMatrixWorld(true);
    this.probes.push(new Probe(this.frame, [this.head, this.abdomen, ...this.cases.map((c) => c.hinge), ...this.wings.map((w) => w.pivot)]), new Probe(this.head, this.feelers), new Probe(this.abdomen, [this.halo]));
    for (const f of this.feelers) this.probes.push(new Probe(f));
    for (const w of this.wings) this.wingProbes.push(new Probe(w.flap));
    for (const c of this.cases) this.caseProbes.push(new Probe(c.hinge));
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

  private poseFor(state: FireflyState): Pose {
    switch (state) {
      case 'alert': return ALERT;
      case 'runWind': return RUN_WIND;
      case 'run': return RUN;
      case 'sink': return SPENT;
      case 'spent': return SPENT;
      case 'fall': return FALL;
      case 'grounded': return GROUNDED;
      case 'dead': return DEAD;
      default: return HOVER;
    }
  }

  private readonly T = {
    v: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), pole: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dir: new THREE.Vector3(),
    tip: new THREE.Vector3(), q: new THREE.Quaternion(), inv: new THREE.Matrix4(), m: new THREE.Matrix4(), c: new THREE.Color(),
  };

  update(dt: number, ctx: FireflyAnimInput): void {
    const T = this.T;
    const state = ctx.state;
    this.time += dt;
    this.root.position.set(ctx.x, ctx.y, ctx.z);
    this.root.rotation.y = ctx.facing;
    const lying = state === 'fall' || state === 'grounded' || state === 'dead';
    const flying = !lying && state !== 'sink' && state !== 'spent';
    /** The floor, in the root's own space (it has no tilt, only a turn, so heights carry straight over). */
    const floor = ctx.floor - ctx.y;

    // ---- Its body ----
    flatten(this.poseFor(state), this.springs.target);
    const S = this.springs.target;
    // Falling, it turns over and over.
    if (state === 'fall') S[1] = 2.2 + ctx.stateTime * 9;
    // Rising again, its wing cases and wings come up before it does.
    this.springs.step(dt, state === 'run' ? 24 : lying ? 13 : 14, state === 'run' ? 1 : 0.8);
    const v = this.springs.value;
    // Spent, it labours: a slow heavy bob. Flying, a quick light one (none on a run: its lantern is where the fire leaves it).
    const bob = lying || state === 'run' ? 0 : state === 'spent' || state === 'sink' ? Math.sin(this.time * 6.5) * 0.03 : Math.sin(this.time * 5.1) * 0.018;
    // (Flying somewhere, it leans into it.)
    const lean = flying && state !== 'run' && state !== 'runWind' ? Math.min(0.22, ctx.moving * 0.04) : 0;
    this.frame.rotation.set(v[0] + lean, 0, v[1], 'YXZ');
    this.frame.position.set(0, CHEST + v[2] + bob, 0);
    this.head.rotation.x = v[6];
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;
      // Forward and a little out and up; laid back along its hood when it is going fast or lying.
      const twitch = lying ? 0 : 0.06 * Math.sin(this.time * 5.3 + i * 2);
      aim(this.feelers[i], T.a.set(side * (0.35 + v[7] * 0.25), 0.35 - v[7] * 0.2 + twitch, 1 - v[7] * 1.6), T.up);
    }

    // Wing cases: folded along its back, or stood up and out. Wings: out from under them, beating.
    const up = Math.min(1.1, Math.max(0, v[8]));
    for (const c of this.cases) c.hinge.rotation.set(up * 0.95, -c.side * up * 0.62, c.side * up * 0.35, 'YXZ');
    const beat = v[10];
    // (Spent, the beat is slower and deeper.)
    const rate = state === 'spent' || state === 'sink' ? 38 : 67;
    const wing = Math.sin(this.time * rate) * (0.55 + (state === 'spent' || state === 'sink' ? 0.25 : 0)) * beat;
    for (const w of this.wings) {
      const spread = v[9];
      w.pivot.rotation.y = w.side * ((1 - spread) * 1.25 + spread * 0.18);
      w.flap.rotation.z = w.side * (0.2 * spread + wing + (lying ? -0.08 : 0));
    }

    // ---- Its abdomen: flying, its tip is where the rules have the vent; otherwise it hangs as the pose says ----
    this.frame.updateMatrix();
    const cf = Math.cos(ctx.facing);
    const sf = Math.sin(ctx.facing);
    const ventLocal = T.tip.set((ctx.vent.x - ctx.x) * cf - (ctx.vent.z - ctx.z) * sf, ctx.vent.y - ctx.y, (ctx.vent.x - ctx.x) * sf + (ctx.vent.z - ctx.z) * cf);
    T.q.copy(this.frame.quaternion).invert();
    if (flying) {
      const pivot = T.v.copy(this.abdomen.position).applyMatrix4(this.frame.matrix);
      // On a run (and lining up for one) the tip is put exactly there: the body is moved by what is over.
      if (state === 'run' || state === 'runWind') {
        const off = ventLocal.distanceTo(pivot) - TAIL;
        T.dir.copy(ventLocal).sub(pivot).normalize();
        this.frame.position.addScaledVector(T.dir, off);
        this.frame.updateMatrix();
        pivot.copy(this.abdomen.position).applyMatrix4(this.frame.matrix);
      }
      T.dir.copy(ventLocal).sub(pivot).normalize().applyQuaternion(T.q);
      // (A body's own direction: the frame turns it back.)
      aim(this.abdomen, T.dir, T.a.set(0, 1, 0));
    } else {
      aim(this.abdomen, T.dir.set(v[3], v[4], v[5]).normalize(), T.a.set(0, 1, 0));
    }

    // ---- Its lantern: as bright as the rules say ----
    this.shining = ease(this.shining, Math.max(0, ctx.light), dt, 14);
    const L = this.shining;
    // (A slow breath in it when it is full and idle.)
    const breath = state === 'idle' || state === 'circle' || state === 'return' ? 0.12 * Math.sin(this.time * 2.4) : 0;
    const k = Math.max(0, Math.min(1, L + breath));
    // (Squared: so that half full looks half as bright, not nearly full.)
    this.glow.color.set(C.dark).lerp(T.c.set(C.lit), k * k);
    if (L > 1) this.glow.color.lerp(T.c.set(C.hot), Math.min(1, (L - 1) / 0.8));
    this.haloMat.color.copy(this.glow.color);
    this.haloMat.opacity = Math.min(0.3, 0.13 * k + (L > 1 ? 0.16 * (L - 1) : 0));
    this.haloSize = 0.7 + 0.3 * k + (L > 1 ? 0.5 * (L - 1) : 0);
    this.halo.visible = k > 0.08;
    this.halo.scale.setScalar(this.haloSize);

    // ---- Nothing under the floor: its body is lifted until its lowest point is on it ----
    this.root.updateMatrixWorld(true);
    T.inv.copy(this.root.matrixWorld).invert();
    let low = Infinity;
    for (const p of this.probes) low = Math.min(low, p.low(T.inv, T.m));
    for (const p of this.caseProbes) low = Math.min(low, p.low(T.inv, T.m));
    // (Lying on it, it is settled onto it: its lowest point is on the floor, not over it.)
    if (low < floor + 0.01 || state === 'grounded' || (state === 'dead' && floor > -0.05)) {
      this.frame.position.y += floor + 0.01 - low;
      this.root.updateMatrixWorld(true);
    }
    // (Its glow does not go through the floor either: near it, it is drawn smaller; on it, not at all.)
    const room = (T.v.set(0.47, 0, 0).applyMatrix4(this.abdomen.matrixWorld).applyMatrix4(T.inv).y - floor - 0.02) / HALO;
    if (room < this.haloSize) {
      this.halo.visible = this.halo.visible && room > 0.45;
      this.halo.scale.setScalar(Math.max(0.01, room));
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

    // ---- Its six legs: hanging, drawn up, or sprawled ----
    this.frame.updateMatrix();
    const tuck = v[11];
    const splay = v[12];
    this.legs.forEach((leg, i) => {
      const from = T.v.copy(leg.at).applyMatrix4(this.frame.matrix);
      const sway = lying ? 0 : Math.sin(this.time * 3.1 + i * 1.3) * 0.025 * (1 - tuck);
      const fwd = 0.1 - leg.row * 0.12;
      // Hanging: down and a little out. Drawn up: folded close under its chest. Sprawled: out to the side on the floor.
      const hang = T.a.set(leg.side * 0.12, -0.33, fwd - 0.08);
      const drawn = T.b.set(leg.side * 0.13, -0.1, fwd + 0.05);
      const out = T.dir.set(leg.side * 0.36, -0.2, fwd * 1.6);
      const to = T.tip.copy(hang).lerp(drawn, tuck).lerp(out, splay);
      to.x += sway;
      // (These are offsets in its body's own space: they turn with it.)
      to.applyQuaternion(this.frame.quaternion).add(from);
      if (state === 'dead') {
        // On its back: its legs curl up over its belly, which is uppermost.
        to.copy(from).add(T.a.set(leg.side * 0.07, 0.3, fwd * 0.4));
      } else if (state === 'grounded') to.y = Math.min(to.y, floor + 0.02);
      if (to.y < floor + 0.02) to.y = floor + 0.02;
      T.pole.set(leg.side * 0.8, 0.5, fwd);
      twoBone(from, to, T.pole, THIGH, SHIN, leg.upper, leg.fore);
      // (A knee is held off the floor too.)
      if (leg.fore.position.y < floor + 0.03) {
        T.pole.set(leg.side, 0.05, 0);
        twoBone(from, to, T.pole, THIGH, SHIN, leg.upper, leg.fore);
        const joint = leg.fore.position;
        if (joint.y < floor + 0.03) {
          joint.y = floor + 0.03;
          aim(leg.upper, T.a.copy(joint).sub(from), T.up);
          aim(leg.fore, T.a.copy(to).sub(joint), T.up);
        }
      }
    });

    // Its shadow lies on the floor, smaller the higher it is.
    const high = Math.max(0, -floor);
    this.shadow.position.set(0, floor + 0.02, 0);
    this.shadow.scale.setScalar(Math.max(0.45, 1.25 - high * 0.16));
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.34 - high * 0.04) * this.scale;

    // Dead, after a moment it shrivels away.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 1.6) / 0.6)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale));

    this.flashAmount = Math.max(0, this.flashAmount - Math.max(0, dt) * 6);
    const f = this.flashAmount * 0.75;
    for (const m of [this.mat, this.matPlain, this.wingMat]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    this.root.updateMatrixWorld(true);
  }

  /** Where things are in the world, for the tests: the tip of its lantern, its chest and head, down its abdomen, its feet, its wing cases' ends. */
  parts(): { tip: THREE.Vector3; chest: THREE.Vector3; head: THREE.Vector3; abdomen: THREE.Vector3[]; feet: THREE.Vector3[]; cases: THREE.Vector3[]; wings: THREE.Vector3[]; lantern: THREE.Color; halo: number; glow: { at: THREE.Vector3; r: number } | null } {
    this.root.updateMatrixWorld(true);
    const at = (o: THREE.Object3D, x: number, y = 0, z = 0): THREE.Vector3 => o.localToWorld(new THREE.Vector3(x, y, z));
    return {
      tip: at(this.abdomen, TAIL),
      chest: at(this.frame, 0),
      head: at(this.head, 0),
      abdomen: [at(this.abdomen, 0.15), at(this.abdomen, 0.32), at(this.abdomen, 0.5)],
      feet: this.legs.map((l) => at(l.fore, SHIN)),
      cases: this.cases.map((c) => at(c.hinge, c.side * 0.09, 0, -0.66)),
      wings: this.wings.map((w) => at(w.flap, w.side * 0.86)),
      lantern: this.glow.color.clone(),
      halo: this.halo.visible ? this.halo.scale.x * this.haloMat.opacity : 0,
      glow: this.halo.visible ? { at: this.halo.getWorldPosition(new THREE.Vector3()), r: HALO * this.halo.scale.x * this.root.scale.x } : null,
    };
  }
}
