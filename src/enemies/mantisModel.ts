import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { bead, mix, modelKit, paint } from '../render/modelKit';
import { glowMaterial, twinkleGeometry, twinkleSize } from '../world/itemModels';
import { Springs, Walker, aim, ease, walkerLeg, type WalkerLeg } from '../render/bugRig';
import { MANTIS, type MantisState } from './mantis';

/**
 * Orchid Mantis model. Nothing of the knight's is in it: a long neck rising from a narrow body, a wedge of a head with
 * two great eyes, two scythe arms of three joints each, four thin legs with a petal on every thigh, an upturned
 * abdomen under two wing cases, and bright hind wings that only show when it flares them.
 *
 * How it is posed. A pose says where things POINT, in plain directions (outward, up, forward), not joint angles:
 * the neck, the abdomen, and the three pieces of each arm. Each piece is then laid end to end along its direction.
 * So a pose can be read ("thigh up, blade down along it") and a scythe goes where the pose says it goes. Springs carry
 * the directions from one pose to the next. The four feet are planted on the floor and step when the body has moved
 * off them; in the air they tuck up.
 */
const C = {
  ivory: 0xf2e8dc, blush: 0xf2bccb, rose: 0xdc6a9a, deep: 0xa83268, edge: 0xfff8f2, crimson: 0xc22a4e,
  eye: 0x7a44b8, eyeDark: 0x24102e, joint: 0x8e3c5e, under: 0xe0408e, spot: 0xffd24a, spotDark: 0x34102e, leaf: 0xc4d89a,
};
const NECK = 0.5;
const ARM = [0.3, 0.36, 0.42]; // hip-piece, thigh, blade
const THIGH = 0.46;
const SHIN = 0.72;
const SCALE = 1;

type V3 = [number, number, number];
/** The three pieces of an arm, each a direction: [outward, up, forward]. */
type ArmPose = [V3, V3, V3];
interface Pose {
  /** Where its hips are, over its feet: [sideways, height, forward]. */
  hip: V3;
  /** The whole upper body turned (to its left is positive) and leant over sideways. */
  yaw: number;
  roll: number;
  /** Which way the neck runs and which way the abdomen runs: [sideways, up, forward]. */
  neck: V3;
  abdomen: V3;
  /** The head: [nod down, turn, tilt]. */
  head: V3;
  armR: ArmPose;
  armL: ArmPose;
  /** Wings: 0 folded, 1 flared. Legs: 0 planted, 1 tucked up. Feelers: 0 up, 1 laid back. */
  wings: number;
  tuck: number;
  feelers: number;
}

const FOLDED: ArmPose = [[0.18, -0.3, 0.94], [0.05, 0.93, 0.36], [-0.02, -0.97, 0.25]];
const COCKED: ArmPose = [[0.3, -0.15, 0.94], [0.12, 0.88, 0.46], [0.05, -0.55, 0.83]];
const RAISED: ArmPose = [[0.55, 0.78, -0.3], [0.35, 0.9, -0.25], [0.3, 0.9, -0.3]];
const SWEPT: ArmPose = [[-0.05, -0.5, 0.85], [-0.08, -0.4, 0.9], [-0.12, -0.3, 0.94]];

/** At rest: reared up, arms folded before its face. */
const PRAY: Pose = { hip: [0, 0.64, 0], yaw: 0, roll: 0, neck: [0, 0.84, 0.54], abdomen: [0, -0.18, -0.98], head: [0.15, 0, 0], armR: FOLDED, armL: FOLDED, wings: 0, tuck: 0, feelers: 0 };
/** Sizing him up: arms cocked, blades half open. */
const SWAY: Pose = { ...PRAY, hip: [0, 0.6, 0], neck: [0, 0.8, 0.6], head: [0.1, 0, 0], armR: COCKED, armL: COCKED };
/** Coming in: lower and longer. */
const STALK: Pose = { ...SWAY, hip: [0, 0.56, 0.05], neck: [0, 0.62, 0.78], abdomen: [0, -0.05, -1], armR: [COCKED[0], COCKED[1], [0.05, -0.8, 0.6]], armL: [COCKED[0], COCKED[1], [0.05, -0.8, 0.6]] };
/** After its cuts: sagging, arms down, blades trailing. Open. */
const SPENT: Pose = { ...PRAY, hip: [0, 0.5, 0.08], neck: [0, 0.5, 0.87], abdomen: [0, -0.3, -0.95], head: [0.5, 0, 0], armR: [[0.25, -0.75, 0.6], [0.12, -0.55, 0.83], [0.02, -0.25, 0.97]], armL: [[0.25, -0.75, 0.6], [0.12, -0.55, 0.83], [0.02, -0.25, 0.97]], feelers: 0.7 };
/** The leap's tell: down on its legs, abdomen up, wings flared, both scythes high. */
const CROUCH: Pose = { ...PRAY, hip: [0, 0.4, -0.1], neck: [0, 0.45, 0.89], abdomen: [0, 0.5, -0.87], head: [-0.35, 0, 0], armR: [[0.5, 0.7, -0.25], [0.3, 0.85, -0.4], [0.2, 0.75, -0.63]], armL: [[0.5, 0.7, -0.25], [0.3, 0.85, -0.4], [0.2, 0.75, -0.63]], wings: 1 };
/** In the air: stretched out, legs tucked, scythes over its head. */
const LEAP: Pose = { ...PRAY, hip: [0, 0.6, 0], neck: [0, 0.35, 0.94], abdomen: [0, 0.1, -1], head: [-0.2, 0, 0], armR: [[0.62, 0.6, 0.5], [0.3, 0.75, 0.6], [0.05, 0.45, 0.9]], armL: [[0.62, 0.6, 0.5], [0.3, 0.75, 0.6], [0.05, 0.45, 0.9]], wings: 1, tuck: 1 };
/** Come down: both scythes driven into the floor in front of it. Open while they are stuck. */
const STRIKE: Pose = { ...PRAY, hip: [0, 0.52, 0.05], neck: [0, 0.38, 0.92], abdomen: [0, 0.25, -0.97], head: [0.3, 0, 0], armR: [[0.1, -0.4, 0.91], [0.05, -0.72, 0.69], [0, -0.97, 0.24]], armL: [[0.1, -0.4, 0.91], [0.05, -0.72, 0.69], [0, -0.97, 0.24]], wings: 0.12 };
/** Springing back out of reach. */
const HOP: Pose = { ...PRAY, hip: [0, 0.72, 0], neck: [0, 0.9, 0.43], abdomen: [0, -0.5, -0.87], wings: 0.6, tuck: 0.7 };
/** Hit. */
const FLINCH: Pose = { ...PRAY, hip: [0, 0.6, -0.08], roll: 0.15, neck: [0, 0.97, 0.22], head: [-0.5, 0, 0.2], armR: [[0.7, 0.2, 0.68], [0.55, 0.7, 0.45], [0.4, -0.1, 0.9]], armL: [[0.7, 0.2, 0.68], [0.55, 0.7, 0.45], [0.4, -0.1, 0.9]], feelers: 0.8 };
/** Its cut turned by a perfect guard: arms thrown wide, head back. Open, and for a long time. */
const REEL: Pose = { ...PRAY, hip: [0, 0.56, -0.1], neck: [0, 0.97, -0.08], head: [-0.6, 0, 0], armR: [[0.92, 0.25, -0.2], [0.75, 0.55, -0.35], [0.6, -0.7, -0.2]], armL: [[0.92, 0.25, -0.2], [0.75, 0.55, -0.35], [0.6, -0.7, -0.2]], wings: 0.3, feelers: 1 };
/** Dead: over on its side, legs curled. */
const DEAD: Pose = { ...PRAY, hip: [0, 0.25, 0], roll: 1.25, neck: [0, 0.2, 0.98], abdomen: [0, -0.1, -1], head: [0.5, 0, 0], armR: [[0.05, -0.5, 0.85], [0.02, -0.2, 0.98], [0, -0.7, 0.7]], armL: [[0.05, -0.5, 0.85], [0.02, -0.2, 0.98], [0, -0.7, 0.7]], wings: 0.05, tuck: 1, feelers: 1 };

/** A scythe going up (`arm`: -1 its right, 1 its left): that shoulder drawn back, the other arm kept before its face. */
function wind(arm: -1 | 1): Pose {
  return { ...PRAY, hip: [0, 0.66, -0.05], yaw: 0.4 * arm, neck: [0, 0.92, 0.4], head: [0.05, -0.4 * arm, 0], armR: arm === -1 ? RAISED : FOLDED, armL: arm === 1 ? RAISED : FOLDED };
}
/** And coming down across its front, the body thrown after it. */
function slash(arm: -1 | 1): Pose {
  return { ...PRAY, hip: [0, 0.56, 0.3], yaw: -0.2 * arm, neck: [0, 0.6, 0.8], head: [0.2, 0.2 * arm, 0], armR: arm === -1 ? SWEPT : COCKED, armL: arm === 1 ? SWEPT : COCKED };
}

const SIZE = 35;
const I = { hip: 0, yaw: 3, roll: 4, neck: 5, abdomen: 8, head: 11, armR: 14, armL: 23, wings: 32, tuck: 33, feelers: 34 };
function flatten(p: Pose, out: Float32Array): void {
  out.set(p.hip, I.hip);
  out[I.yaw] = p.yaw;
  out[I.roll] = p.roll;
  out.set(p.neck, I.neck);
  out.set(p.abdomen, I.abdomen);
  out.set(p.head, I.head);
  for (let k = 0; k < 3; k++) {
    out.set(p.armR[k], I.armR + k * 3);
    out.set(p.armL[k], I.armL + k * 3);
  }
  out[I.wings] = p.wings;
  out[I.tuck] = p.tuck;
  out[I.feelers] = p.feelers;
}

export interface MantisAnimInput {
  state: MantisState;
  stateTime: number;
  /** How fast it is walking. */
  walking: number;
  /** Which scythe is cutting (-1 its right, 1 its left), whether this wind-up is the held one, and how long it lasts. */
  arm: -1 | 1;
  held: boolean;
  windupTime: number;
  /** How far through a leap or a hop it is, 0..1. */
  air: number;
}

/** A scythe: along +X from the wrist, hooked, its cutting edge towards +Y, a ridge down its back. */
function bladeGeometry(length: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const rings = 7;
  const at = (u: number): { back: THREE.Vector3; edge: THREE.Vector3; thick: number } => {
    const x = u * length;
    const hook = 0.1 * u * u * u + 0.02 * Math.sin(u * Math.PI);
    const w = 0.012 + 0.075 * Math.pow(1 - u, 0.8) * (0.55 + 0.45 * Math.sin(Math.min(1, u * 2.2) * Math.PI * 0.5));
    return { back: new THREE.Vector3(x, hook - w * 0.45, 0), edge: new THREE.Vector3(x, hook + w * 0.55, 0), thick: 0.02 * (1 - u * 0.8) };
  };
  const tint = new THREE.Color();
  const push = (v: THREE.Vector3, z: number, color: number): void => {
    pos.push(v.x, v.y, z);
    tint.set(color);
    col.push(tint.r, tint.g, tint.b);
  };
  for (let i = 0; i < rings; i++) {
    const a = at(i / rings);
    const b = at((i + 1) / rings);
    const ca = mix(C.blush, C.crimson, Math.pow(i / rings, 1.4));
    const cb = mix(C.blush, C.crimson, Math.pow((i + 1) / rings, 1.4));
    for (const s of [1, -1]) {
      // One flat side: from the ridge on the back down to the edge.
      const quad: Array<[THREE.Vector3, number, number]> = [[a.back, a.thick * s, ca], [b.back, b.thick * s, cb], [b.edge, 0, C.edge], [a.edge, 0, C.edge]];
      const order = s === 1 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
      for (const k of order) push(quad[k][0], quad[k][1], quad[k][2]);
    }
    // The back, between the two ridges.
    const strip: Array<[THREE.Vector3, number, number]> = [[a.back, a.thick, ca], [a.back, -a.thick, ca], [b.back, -b.thick, cb], [b.back, b.thick, cb]];
    for (const k of [0, 1, 2, 0, 2, 3]) push(strip[k][0], strip[k][1], mix(strip[k][2], C.deep, 0.35));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A hind wing: a fan, bright, with an eye painted on it. Along +X from the hinge, spread in +Z, flat. */
function fanGeometry(length: number, spread: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const ribs = 10;
  const tint = new THREE.Color();
  const colorAt = (r: number, _a: number): number => {
    // Rings, like the eye on a moth's wing seen edge on: dark, gold, dark, then the bright rim.
    if (r < 0.3) return C.under;
    if (r < 0.44) return C.spotDark;
    if (r < 0.66) return C.spot;
    if (r < 0.8) return C.spotDark;
    return mix(C.under, C.blush, 0.35);
  };
  const point = (r: number, a: number): [number, number, number] => {
    const ang = (a - 0.15) * spread;
    const len = length * r * (0.82 + 0.18 * Math.sin(a * Math.PI));
    return [Math.cos(ang) * len, 0, Math.sin(ang) * len];
  };
  const steps = 8;
  for (let i = 0; i < ribs; i++) {
    for (let j = 0; j < steps; j++) {
      const a0 = i / ribs;
      const a1 = (i + 1) / ribs;
      const r0 = j / steps;
      const r1 = (j + 1) / steps;
      const quad: Array<[number, number]> = [[r0, a0], [r1, a0], [r1, a1], [r0, a1]];
      const flat = colorAt((r0 + r1) / 2, (a0 + a1) / 2);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        pos.push(...point(quad[k][0], quad[k][1]));
        tint.set(flat);
        col.push(tint.r, tint.g, tint.b);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A leg, and where its foot goes off the ground (in the body's space): drawn up under it, streaming behind in a leap, or curled to its belly when it lies dead. */
interface Leg extends WalkerLeg {
  tucked: THREE.Vector3;
  trail: THREE.Vector3;
  curl: THREE.Vector3;
}

export class MantisModel {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group(); // lifted in a leap
  private readonly body = new THREE.Group(); // at the hips; turned and leant
  private readonly neckPivot = new THREE.Group();
  private readonly abdomenPivot = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly feelers: THREE.Group[] = [];
  private readonly cases: THREE.Group[] = [];
  private readonly fans: THREE.Mesh[] = [];
  /** Each arm's three pieces, right then left. */
  private readonly arms: THREE.Group[][] = [[], []];
  private readonly tips: THREE.Group[] = [];
  private readonly legs: Leg[] = [];
  private readonly mat = createPs1Material({ lit: true });
  private readonly matTwo = createPs1Material({ lit: true, side: THREE.DoubleSide });
  private readonly glintMat = glowMaterial(0xfff0f4);
  private readonly glints: THREE.Mesh[][] = [[], []];
  private readonly shadow: THREE.Mesh;

  private readonly springs = new Springs(SIZE);
  private walker!: Walker;
  private time = 0;
  private flashAmount = 0;
  private scale = 1;
  private lift = 0;
  /** How far its legs are streaming behind it (in a leap) instead of drawn up. */
  private trailing = 0;

  constructor() {
    const kit = modelKit(this.mat);
    const { blob, spar, cone } = kit;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x120816 });
    const glintWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.root.add(this.rig);
    this.rig.add(this.body);
    this.body.rotation.order = 'YZX';

    // The middle of it, where the four legs join: a short ivory barrel, blushing underneath.
    this.body.add(blob(0.115, 0.11, 0.2, (_x, y, z) => (y < -0.3 ? C.blush : z < -0.5 ? C.blush : C.ivory), 0, 0, -0.02, 7, 5));

    // The neck (its long first segment): narrow, widening to a frilled collar under the head.
    this.neckPivot.position.set(0, 0.05, 0.13);
    this.body.add(this.neckPivot);
    const neck = spar(0.07, 0.048, NECK, (nx) => mix(C.ivory, C.blush, Math.max(0, nx) * 0.6), 6);
    neck.scale.set(1, 1, 0.8);
    const collar = blob(0.09, 0.03, 0.105, (_x, _y, z) => (Math.abs(z) > 0.55 ? C.rose : C.ivory), NECK * 0.78, 0, 0, 7, 4, 0.1);
    this.neckPivot.add(neck, collar);

    // The head: a wedge, wide at the top where the eyes bulge, narrowing to the jaws. Its face is +Z.
    this.head.rotation.order = 'YXZ';
    this.body.add(this.head);
    const skull = new THREE.ConeGeometry(0.175, 0.28, 3, 1);
    skull.rotateX(Math.PI); // point down, which also turns a flat face to the front
    skull.scale(1.05, 1, 0.62);
    this.head.add(new THREE.Mesh(paint(skull, (_x, y) => (y < -0.3 ? C.blush : C.ivory), 0.15), this.mat));
    this.head.position.set(0, 0, 0);
    this.head.add(blob(0.15, 0.045, 0.085, C.ivory, 0, 0.145, 0, 6, 4, 0.1)); // the flat crown between the eyes
    // A rose stripe down its face to the jaws.
    this.head.add(blob(0.022, 0.1, 0.02, C.rose, 0, 0.0, 0.062, 4, 4, 0));
    for (const s of [-1, 1]) {
      // The eyes: big, set at the corners, violet with a dark spot that seems to look at you.
      this.head.add(blob(0.074, 0.098, 0.078, (_x, y) => mix(C.eye, C.eyeDark, Math.max(0, -y) * 0.7), s * 0.158, 0.1, 0.02, 7, 6, 0.05));
      this.head.add(bead(0.024, eyeMat, s * 0.172, 0.1, 0.088), bead(0.01, glintWhite, s * 0.185, 0.128, 0.09, 4, 3));
      // Jaws: two small hooks under the chin.
      const jaw = cone(0.018, 0.07, C.deep, 4);
      jaw.position.set(s * 0.03, -0.15, 0.04);
      jaw.rotation.set(Math.PI - 0.5, 0, s * 0.35);
      this.head.add(jaw);
      // Feelers: thin, two pieces each, on pivots so they twitch.
      const f = new THREE.Group();
      f.position.set(s * 0.05, 0.175, 0.03);
      const lower = spar(0.011, 0.007, 0.2, C.joint, 4);
      const upper = spar(0.007, 0.003, 0.2, C.deep, 4);
      lower.rotation.z = Math.PI / 2; // spars run along +X: stand them up
      upper.rotation.z = Math.PI / 2 + 0.25 * -s;
      upper.position.set(0, 0.2, 0);
      f.add(lower, upper);
      this.head.add(f);
      this.feelers.push(f);
    }

    // The abdomen: broad, banded, turned up at the tip, with a row of small petals down each side. Runs along +X of its pivot.
    this.abdomenPivot.position.set(0, 0.01, -0.16);
    this.body.add(this.abdomenPivot);
    const bands = (nx: number, ny: number): number => {
      if (ny < -0.45) return C.blush;
      return Math.floor((nx + 1) * 3.5) % 2 === 0 ? C.ivory : mix(C.ivory, C.rose, 0.55);
    };
    const belly = blob(0.36, 0.125, 0.17, bands, 0.33, -0.01, 0, 9, 6, 0.25);
    const tip = cone(0.06, 0.16, C.rose, 5);
    tip.position.set(0.64, -0.01, 0);
    tip.rotation.z = -Math.PI / 2 + 0.5; // pointing on along the abdomen and a little up
    this.abdomenPivot.add(belly, tip);
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const petal = blob(0.06, 0.012, 0.05, (nx2) => mix(C.ivory, C.rose, Math.max(0, nx2 * 0.5 + 0.5)), 0.2 + k * 0.15, -0.02, s * (0.16 - k * 0.02), 5, 3, 0);
        petal.rotation.y = s * -0.5;
        this.abdomenPivot.add(petal);
      }
      // Wing cases: long leaves lying over the abdomen, hinged at the front.
      const hinge = new THREE.Group();
      hinge.position.set(0.02, 0.105, s * 0.035);
      const wing = blob(0.33, 0.016, 0.085, (nx2, _y, nz2) => (nx2 < -0.6 ? C.leaf : Math.abs(nz2) > 0.7 ? C.rose : mix(C.ivory, C.blush, nx2 * 0.5 + 0.5)), 0.33, 0, s * 0.05, 8, 3, 0.05);
      hinge.add(wing);
      // The hind wing under it: only seen when the cases lift.
      const fan = new THREE.Mesh(fanGeometry(0.62, 1.25), this.matTwo);
      fan.scale.set(1, 1, s);
      fan.position.set(0.04, -0.012, s * 0.02);
      hinge.add(fan);
      this.fans.push(fan);
      this.abdomenPivot.add(hinge);
      this.cases.push(hinge);
    }

    // The arms. Each piece runs along +X of its own group, its inner (cutting) side towards +Y.
    const twinkle = twinkleGeometry();
    for (let a = 0; a < 2; a++) {
      const hipPiece = new THREE.Group();
      hipPiece.add(spar(0.04, 0.034, ARM[0], (nx) => mix(C.ivory, C.blush, nx * 0.5 + 0.5), 5), blob(0.045, 0.045, 0.045, C.joint, ARM[0], 0, 0, 5, 4));
      const thigh = new THREE.Group();
      const meat = spar(0.058, 0.04, ARM[1], (nx, ny) => (ny > 0.5 ? C.rose : mix(C.ivory, C.blush, nx * 0.5 + 0.5)), 6);
      meat.scale.set(1, 1.25, 0.7);
      thigh.add(meat, blob(0.04, 0.04, 0.04, C.joint, ARM[1], 0, 0, 5, 4));
      for (let k = 0; k < 4; k++) {
        const spine = cone(0.013, 0.055, C.deep, 4);
        spine.position.set(0.08 + k * 0.075, 0.055, 0);
        spine.rotation.z = -0.35;
        thigh.add(spine);
      }
      const blade = new THREE.Group();
      blade.add(new THREE.Mesh(bladeGeometry(ARM[2]), this.matTwo));
      const tipAt = new THREE.Group();
      tipAt.position.set(ARM[2], 0.1, 0);
      blade.add(tipAt);
      this.tips.push(tipAt);
      for (const turn of [0, Math.PI / 2]) {
        const g = new THREE.Mesh(twinkle, this.glintMat);
        g.rotation.y = turn;
        g.visible = false;
        tipAt.add(g);
        this.glints[a].push(g);
      }
      this.arms[a].push(hipPiece, thigh, blade);
      this.body.add(hipPiece, thigh, blade);
    }

    // The legs: a thigh with a petal on it, a long thin shin, a hooked foot.
    const spots: Array<[-1 | 1, number, number, number, number, 0 | 1]> = [
      // side, where it joins (forward), where the foot rests: out, forward; which pair it steps with
      [-1, 0.07, 0.64, 0.34, 0, 0], [1, 0.07, 0.64, 0.34, 0, 1], [-1, -0.1, 0.56, -0.62, 0, 1], [1, -0.1, 0.56, -0.62, 0, 0],
    ];
    for (const [side, join, out, fwd, , pair] of spots) {
      const thigh = new THREE.Group();
      thigh.add(spar(0.034, 0.024, THIGH, (nx) => mix(C.ivory, C.blush, nx * 0.5 + 0.5), 5));
      const petal = blob(0.1, 0.075, 0.012, (nx, ny) => mix(C.ivory, C.rose, Math.min(1, Math.hypot(nx, ny) * 0.95)), THIGH * 0.52, -0.045, 0, 6, 4, 0);
      thigh.add(petal, blob(0.03, 0.03, 0.03, C.joint, THIGH, 0, 0, 5, 4));
      const shin = new THREE.Group();
      shin.add(spar(0.022, 0.011, SHIN, (nx) => mix(C.blush, C.deep, Math.max(0, nx)), 4));
      const claw = cone(0.014, 0.05, C.deep, 4);
      claw.position.set(SHIN - 0.01, 0, 0);
      claw.rotation.z = -Math.PI / 2 - 0.6;
      shin.add(claw);
      this.rig.add(thigh, shin);
      this.legs.push({
        ...walkerLeg(side, new THREE.Vector3(side * 0.09, -0.03, join), new THREE.Vector3(side * out, 0, fwd), new THREE.Vector3(side * 0.2, 1, 0), pair, thigh, shin),
        tucked: new THREE.Vector3(side * 0.26, -0.3, join > 0 ? 0.2 : -0.28),
        trail: new THREE.Vector3(side * (join > 0 ? 0.5 : 0.36), join > 0 ? -0.2 : -0.12, join > 0 ? -0.5 : -1.0),
        curl: new THREE.Vector3(side * 0.09, -0.34, join > 0 ? 0.24 : -0.2),
      });
    }

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
    this.root.scale.setScalar(SCALE);
    // The knees stand up and a little out, as an insect's do. A step takes a seventh of a second.
    this.walker = new Walker(this.root, this.body, this.legs, { thigh: THIGH, shin: SHIN, stride: 0.26, strideStill: 0.16, stepTime: 0.15, lift: 0.13 });
    flatten(PRAY, this.springs.target);
    this.springs.snap();
    this.apply(0, 0);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes it white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  /** The pose for what it is doing. */
  private poseFor(ctx: MantisAnimInput): Pose {
    switch (ctx.state) {
      case 'idle':
        return PRAY;
      case 'stalk':
      case 'return':
        return STALK;
      case 'sway':
        return SWAY;
      case 'windup':
        return wind(ctx.arm);
      case 'slash':
        return slash(ctx.arm);
      case 'recover':
        return SPENT;
      case 'crouch':
        return CROUCH;
      case 'leap':
        // The scythes start down while it is still in the air, so they arrive as it does.
        return ctx.air > 0.6 ? STRIKE : LEAP;
      case 'stuck':
        return STRIKE;
      case 'hop':
        return HOP;
      case 'stagger':
        return FLINCH;
      case 'reel':
        return REEL;
      case 'dead':
        return DEAD;
    }
  }

  update(dt: number, ctx: MantisAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    const t = this.time;
    flatten(this.poseFor(ctx), this.springs.target);

    // How hard the springs pull: a cut snaps, a wind-up is drawn (the held one more slowly), the rest settle.
    const stiffness = state === 'slash' ? 38 : state === 'leap' ? 26 : state === 'stagger' || state === 'reel' || state === 'hop' ? 24 : state === 'windup' ? (ctx.held ? 15 : 20) : state === 'dead' ? 11 : 15;
    const damping = state === 'reel' || state === 'stagger' ? 0.45 : 0.8;
    this.springs.step(dt, stiffness, damping);

    // In the air: a leap's arc, a hop's.
    const arc = 4 * ctx.air * (1 - ctx.air);
    this.lift = state === 'leap' ? MANTIS.leapHeight * arc : state === 'hop' ? 0.3 * arc : ease(this.lift, 0, dt, 30);

    // Dead: it lies a while, then shrivels away.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 1.2) / 0.6)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale) * SCALE);
    this.shadow.visible = this.scale > 0.05;
    this.shadow.scale.setScalar(1 / (1 + this.lift * 0.5));

    // Life laid over the pose.
    let swayX = 0;
    let swayRoll = 0;
    let headTilt = 0;
    let shake = 0;
    if (state === 'sway') {
      // The mantis's own rocking, side to side like a leaf, its head staying level.
      swayX = 0.085 * Math.sin(t * 3.4);
      swayRoll = -0.11 * Math.sin(t * 3.4);
      headTilt = 0.11 * Math.sin(t * 3.4);
    } else if (state === 'idle') {
      swayX = 0.03 * Math.sin(t * 1.3);
      // Now and then it cocks its head.
      const beat = (t * 0.23) % 1;
      headTilt = 0.32 * Math.sin(Math.min(1, Math.max(0, (beat - 0.6) / 0.4)) * Math.PI) * (Math.floor(t * 0.23) % 2 ? 1 : -1);
    } else if (state === 'windup') {
      // Straining at the top of it; the held one trembles more the longer it is held.
      shake = 0.012 * Math.min(1, ctx.stateTime / Math.max(0.1, ctx.windupTime)) * (ctx.held ? 2 : 1) * Math.sin(t * 47);
    } else if (state === 'stuck') {
      // Tugging at its scythes.
      shake = 0.022 * Math.sin(t * 19) * Math.min(1, ctx.stateTime * 3);
    } else if (state === 'reel') {
      swayX = 0.07 * Math.sin(t * 5.1);
      swayRoll = 0.14 * Math.sin(t * 5.1 + 0.6);
      headTilt = 0.3 * Math.sin(t * 3.7);
    } else if (state === 'recover') {
      shake = 0.01 * Math.sin(t * 9);
    }
    this.apply(swayX, swayRoll, headTilt, shake, dt, ctx);

    // The glint on a scythe that is about to come down: it swells through the tell. Both glint before a leap.
    const tell = state === 'windup' ? Math.min(1, ctx.stateTime / Math.max(0.1, ctx.windupTime)) : state === 'crouch' ? Math.min(1, ctx.stateTime / MANTIS.leapWindup) : -1;
    for (let a = 0; a < 2; a++) {
      const lit = tell >= 0 && (state === 'crouch' || (a === 0 ? ctx.arm === -1 : ctx.arm === 1));
      const size = lit ? 0.05 + 0.15 * twinkleSize(0.08 + tell * 0.6) : 0;
      this.glints[a].forEach((g, i) => {
        g.visible = size > 0.01;
        g.scale.setScalar(size * (i ? 0.8 : 1));
        g.rotation.z = t * 5 * (i ? -1 : 1);
      });
    }

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.mat.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    (this.matTwo.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }

  private readonly tmp = {
    hip: new THREE.Vector3(), n: new THREE.Vector3(), top: new THREE.Vector3(), s: new THREE.Vector3(), d: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()],
    e: new THREE.Vector3(), p: new THREE.Vector3(), q: new THREE.Quaternion(), a: new THREE.Vector3(), f: new THREE.Vector3(), k: new THREE.Vector3(), pole: new THREE.Vector3(),
    home: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(0, 0, 1), side: new THREE.Vector3(1, 0, 0),
  };

  /** Lays the body out from the spring values (plus whatever life is laid over them), and steps the feet. */
  private apply(swayX: number, swayRoll: number, headTilt = 0, shake = 0, dt = 0, ctx: MantisAnimInput | null = null): void {
    const v = this.springs.value;
    const T = this.tmp;
    this.rig.position.y = this.lift;
    this.body.position.set(v[I.hip] + swayX, v[I.hip + 1] + shake, v[I.hip + 2] - shake * 0.6);
    this.body.rotation.set(0, v[I.yaw], v[I.roll] + swayRoll);

    // Neck and head.
    T.n.set(v[I.neck], v[I.neck + 1], v[I.neck + 2]).normalize();
    aim(this.neckPivot, T.n, T.fwd);
    T.top.copy(this.neckPivot.position).addScaledVector(T.n, NECK);
    this.head.position.copy(T.top).addScaledVector(T.n, 0.09);
    this.head.rotation.set(v[I.head], v[I.head + 1], v[I.head + 2] + headTilt);

    // Abdomen, wing cases and the wings under them.
    T.e.set(v[I.abdomen], v[I.abdomen + 1], v[I.abdomen + 2]).normalize();
    aim(this.abdomenPivot, T.e, T.up);
    const flare = Math.min(1.1, Math.max(0, v[I.wings]));
    const buzz = ctx && (ctx.state === 'leap' || ctx.state === 'hop') ? 0.22 * Math.sin(this.time * 70) : 0;
    this.cases.forEach((hinge, i) => {
      // aim() gives the abdomen +X back along it and +Y up; whichever way its +Z came out, side `s` is this wing's.
      const s = i === 0 ? -1 : 1;
      hinge.rotation.set(0, -s * flare * 0.75, flare * (0.85 + buzz * 0.3));
      this.fans[i].visible = flare > 0.04;
      this.fans[i].scale.set(Math.max(0.01, flare), 1, s * Math.max(0.01, flare));
      this.fans[i].rotation.set(s * buzz, s * flare * 0.25, -flare * 0.35);
    });

    // Feelers: up and twitching, or laid back.
    const back = Math.min(1, Math.max(0, v[I.feelers]));
    this.feelers.forEach((f, i) => {
      const s = i === 0 ? -1 : 1;
      f.rotation.set(0.35 - back * 1.9 + 0.07 * Math.sin(this.time * 6.1 + i * 2), 0, -s * (0.3 + 0.06 * Math.sin(this.time * 4.3 + i)));
    });

    // The arms: each piece laid along its direction, from the shoulder out.
    for (let a = 0; a < 2; a++) {
      const sign = a === 0 ? -1 : 1;
      const at = a === 0 ? I.armR : I.armL;
      for (let k = 0; k < 3; k++) T.d[k].set(v[at + k * 3] * sign, v[at + k * 3 + 1], v[at + k * 3 + 2]).normalize();
      // The shoulder: four fifths of the way up the neck, out to its side.
      T.s.copy(this.neckPivot.position).addScaledVector(T.n, NECK * 0.8).addScaledVector(T.side, sign * 0.085);
      const [hipPiece, thigh, blade] = this.arms[a];
      // Each piece's inner side faces its neighbour: the thigh's spines towards the blade, the blade's edge towards the thigh.
      hipPiece.position.copy(T.s);
      aim(hipPiece, T.d[0], T.d[1]);
      T.p.copy(T.s).addScaledVector(T.d[0], ARM[0]);
      thigh.position.copy(T.p);
      aim(thigh, T.d[1], T.d[2]);
      T.p.addScaledVector(T.d[1], ARM[1]);
      blade.position.copy(T.p);
      aim(blade, T.d[2], T.e.copy(T.d[1]).negate());
    }

    // The four feet: planted on the floor, stepping in pairs; off the ground they are drawn up (a hop), stream out
    // behind (a leap), or curl to its belly (dead). In the air they paddle a little.
    this.trailing = ease(this.trailing, ctx?.state === 'leap' ? 1 : 0, dt, 18);
    const dead = ctx?.state === 'dead';
    this.walker.update(dt, this.lift, Math.min(1, Math.max(0, v[I.tuck])), (leg, index, out) => {
      const l = this.legs[index];
      if (dead) out.copy(l.curl);
      else out.copy(l.tucked).lerp(l.trail, this.trailing).setY(out.y + 0.03 * Math.sin(this.time * 14 + leg.pair * 2));
    });
  }

  /** Where each scythe is, in the world: its wrist and its point, right arm then left. (For tests and for effects.) */
  blades(): Array<{ elbow: THREE.Vector3; wrist: THREE.Vector3; tip: THREE.Vector3 }> {
    this.root.updateMatrixWorld(true);
    return [0, 1].map((a) => ({
      elbow: this.arms[a][1].getWorldPosition(new THREE.Vector3()),
      wrist: this.arms[a][2].getWorldPosition(new THREE.Vector3()),
      tip: this.tips[a].getWorldPosition(new THREE.Vector3()),
    }));
  }
}
