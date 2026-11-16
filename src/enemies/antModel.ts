import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { bead, modelKit, paint } from '../render/modelKit';
import { glowMaterial, twinkleGeometry, twinkleSize } from '../world/itemModels';
import { Probe, Springs, Walker, aim, ease, twoBone, walkerLeg, type WalkerLeg } from '../render/bugRig';
import type { AntState } from './ant';

/**
 * Ant Pikeman model: a soldier ant standing up on four legs, its front pair holding a pike. A big rust-red head with
 * heavy jaws and elbowed feelers under a bronze cap with a blue crest; a humped chest with a bronze collar and a
 * shoulder plate each side; a thin two-knotted waist; a black abdomen carried low behind; and the pike: an ash shaft
 * longer than the ant is tall twice over, a leaf of iron on a socket with a bar behind it, a bronze spike on its butt,
 * and two ribbons under the head.
 *
 * How it is posed. THE PIKE COMES FIRST. While it is levelled its point comes from the rules (it is the point that
 * strikes him): the pike is drawn with its point exactly there, running back along the ant's right side, and its front
 * legs are then laid to the shaft: the right one holds it fast near the butt, the shaft slides through the left. Its
 * body is a row of springs (where its hips are, how it is turned and leant, where its abdomen points) carried from one
 * pose to the next; its four feet are planted on the floor and step. When the pike is not levelled (upright at its
 * post, tipped up out of the way when he is inside its point, knocked down and wide) the pose says where it is.
 */
const C = {
  red: 0x9a3a1e, redDark: 0x5e2012, redLight: 0xb8532a, black: 0x1d1512, blackBand: 0x3a2a22, leg: 0x32170f, legTip: 0x1a100c,
  jaw: 0x2a1811, jawTip: 0x8a8f99, eye: 0x0e0808, bronze: 0xc2923c, bronzeLight: 0xe8c268, bronzeDark: 0x7a5a24,
  crest: 0x2f7fa8, crestDark: 0x1c4d6c, gold: 0xe8c040, wood: 0xb99a66, woodDark: 0x8a6e44, iron: 0x9096a2, ironDark: 0x4c505c,
};
const UPPER = 0.38;
const FORE = 0.42;
const THIGH = 0.36;
const SHIN = 0.5;
/**
 * Along the pike from where its right front leg holds it: the point ahead, the butt behind. (It is held near the butt,
 * as a pike is; and so, with its hand at its shoulder, the butt is above its own knees whichever way the pike is turned.)
 */
const POINT = 2.4;
const BUTT = -0.3;
/** Where its right front leg carries the levelled pike: out to its right, at this height. */
const GRIP_X = -0.42;
const GRIP_Y = 0.74;
/** Whichever way the pike is turned, its butt is held at least this high: over its own knees. */
const CLEAR = 0.66;
/** How high the ends of its legs are held, so that its feet rest on the floor, not in it. */
const FOOT = 0.025;
/** How far up the shaft from there its left front leg may hold. */
const SLIDE: [number, number] = [0.22, 1.4];
const TASSEL = POINT - 0.44;

type V3 = [number, number, number];
interface Pose {
  /** Where its hips are, over its feet: [sideways, height, forward]. */
  hip: V3;
  /** Its body turned (to its left is positive), leant forward, and rolled over (onto its right is positive). */
  yaw: number;
  pitch: number;
  roll: number;
  /** Which way its abdomen runs: [sideways, up, forward], as the ant stands (not as its body is turned). */
  gaster: V3;
  /** The head: [nod down, turn, tilt]. */
  head: V3;
  /** Feelers: 0 forward .. 1 laid back. Jaws: 0 shut .. 1 wide. Legs: 0 planted .. 1 curled up. */
  feelers: number;
  jaws: number;
  tuck: number;
  /** The pike when it is not levelled: where its right front leg has it, and which way it runs (point-wards). */
  hold: V3;
  dir: V3;
  /** Its left front leg: 1 on the shaft .. 0 free, at `free` (a place from its hips, in its body's own space). */
  left: number;
  free: V3;
}

const FREE: V3 = [0.2, -0.04, 0.2];
/** Its left front leg, off the shaft and up before it, to fend him off. */
const FEND: V3 = [0.2, 0.12, 0.42];
/** Pike levelled, coming on or standing off: side-on behind it, its left shoulder forward. */
const LEVEL: Pose = { hip: [0.03, 0.5, 0], yaw: -0.4, pitch: 0.12, roll: 0, gaster: [0, -0.35, -0.94], head: [0.05, 0.4, 0], feelers: 0.15, jaws: 0.25, tuck: 0, hold: [GRIP_X, GRIP_Y, -0.2], dir: [0.15, 0.02, 0.99], left: 1, free: FEND };
/** The tell: weight back and down, turned further side-on, abdomen cocked up, jaws wide, the pike drawn right back. */
const DRAW: Pose = { ...LEVEL, hip: [0.03, 0.45, -0.2], yaw: -0.7, pitch: -0.05, gaster: [0, 0.3, -0.95], head: [0.12, 0.7, 0], feelers: 0.85, jaws: 1 };
/** The thrust: thrown forward behind the point, leaning away from the shaft, stretched out. */
const LUNGE: Pose = { ...LEVEL, hip: [0.05, 0.44, 0.14], yaw: -0.1, pitch: 0.3, roll: -0.08, gaster: [0, -0.05, -1], head: [-0.25, 0.1, 0], feelers: 1, jaws: 0.6 };
/** After it: still stretched out, sagging. Open. */
const SPENT: Pose = { ...LEVEL, hip: [0.05, 0.42, 0.12], yaw: -0.12, pitch: 0.36, roll: -0.08, gaster: [0, -0.45, -0.89], head: [0.25, 0.12, 0], feelers: 0.6, jaws: 0.3 };
/** He is inside its point: the pike tipped up out of the way in one hand at its shoulder; it leans back from him, jaws working. */
const PORT: Pose = { ...LEVEL, hip: [0.03, 0.5, -0.06], yaw: -0.25, pitch: -0.05, head: [0.15, 0.25, 0], feelers: 0.4, jaws: 0.6, hold: [-0.43, 0.95, 0.1], dir: [0.08, 0.45, 0.89], left: 0 };
/** The bite's tell: reared up and back, its head thrown back, jaws as wide as they go. */
const BITE_WIND: Pose = { ...PORT, hip: [0.03, 0.52, -0.16], yaw: -0.15, pitch: -0.3, gaster: [0, -0.6, -0.8], head: [-0.55, 0.15, 0], feelers: 1, jaws: 1, free: [0.3, 0.3, 0.3] };
/** And the bite: its head shot forward and down, jaws shut. */
const BITE: Pose = { ...PORT, hip: [0.03, 0.42, 0.2], yaw: -0.05, pitch: 0.5, gaster: [0, 0.1, -1], head: [0.2, 0.05, 0], feelers: 0.3, jaws: 0, hold: [-0.43, 0.92, 0.3], free: [0.16, 0.08, 0.55] };
/** After it: still stretched out over its front feet. Open. */
const BITE_REST: Pose = { ...BITE, hip: [0.03, 0.44, 0.14], yaw: -0.1, pitch: 0.38, head: [0.3, 0.1, 0], feelers: 0.5, jaws: 0.15 };
/** Its pike knocked wide by a perfect guard: thrown back, the point beaten down to the floor out to its right, its other hand flung off the shaft. */
const REEL: Pose = { ...LEVEL, hip: [0.03, 0.5, -0.15], yaw: 0.3, pitch: -0.25, roll: -0.1, gaster: [0, -0.5, -0.87], head: [-0.5, -0.2, 0.2], feelers: 1, jaws: 0.8, hold: [-0.45, 0.8, -0.1], dir: [-0.45, -0.33, 0.83], left: 0, free: [0.42, 0.3, 0.05] };
/** Struck. */
const FLINCH: Pose = { ...LEVEL, hip: [0.03, 0.48, -0.1], yaw: -0.2, pitch: -0.2, roll: 0.08, head: [-0.4, 0.2, 0.15], feelers: 0.9, jaws: 0.5, hold: [-0.43, 0.8, -0.24], dir: [-0.12, 0.2, 0.97] };
/** At its post: square and upright, the pike standing at its right shoulder. */
const POST: Pose = { ...LEVEL, hip: [0, 0.54, 0], yaw: 0, pitch: 0, gaster: [0, -0.4, -0.92], head: [0, 0, 0], feelers: 0, jaws: 0, hold: [-0.38, 0.98, 0.3], dir: [0, 1, 0], left: 0, free: FREE };
/** Going back to its post: the pike sloped back on its right shoulder. */
const CARRY: Pose = { ...POST, hip: [0, 0.52, 0], pitch: 0.05, hold: [-0.38, 0.98, 0.16], dir: [0, 0.94, -0.34] };
/** Dying: the pike flung out of its hands, away to its right. */
const FLUNG: { hold: V3; dir: V3 } = { hold: [-0.85, 0.85, -0.3], dir: [0.1, 0.1, 0.99] };
/** Dead: over on its left side, legs curled, the pike on the floor out at its right. */
const DEAD: Pose = { ...POST, hip: [0, 0.22, 0], roll: -1.35, gaster: [0, 0, -1], head: [0.5, 0, 0], feelers: 1, jaws: 0.4, tuck: 1, hold: [-0.95, 0.05, -0.3], dir: [0.1, 0, 0.99], free: [0.1, -0.1, 0.25] };

const SIZE = 25;
const I = { hip: 0, yaw: 3, pitch: 4, roll: 5, gaster: 6, head: 9, feelers: 12, jaws: 13, tuck: 14, hold: 15, dir: 18, left: 21, free: 22 };
function flatten(p: Pose, out: Float32Array): void {
  out.set(p.hip, I.hip);
  out[I.yaw] = p.yaw;
  out[I.pitch] = p.pitch;
  out[I.roll] = p.roll;
  out.set(p.gaster, I.gaster);
  out.set(p.head, I.head);
  out[I.feelers] = p.feelers;
  out[I.jaws] = p.jaws;
  out[I.tuck] = p.tuck;
  out.set(p.hold, I.hold);
  out.set(p.dir, I.dir);
  out[I.left] = p.left;
  out.set(p.free, I.free);
}

export interface AntAnimInput {
  /** Off duty only (see `offDuty`): how far its thimble is raised to its jaws, 0..1, and which way its head is turned. */
  sip?: number;
  look?: number;
  state: AntState;
  stateTime: number;
  /** How fast it is walking. */
  walking: number;
  /** The point of its pike, from the rules (world), and whether the pike is levelled (so that is where its point is). */
  tip: { x: number; y: number; z: number };
  level: boolean;
  /** How long the wind-up it is in lasts. */
  windupTime: number;
}

interface Arm {
  upper: THREE.Group;
  fore: THREE.Group;
  /** Where it joins the body, in the body's own space. */
  at: THREE.Vector3;
  side: -1 | 1;
}
/** A leg, and where its foot goes when it lies dead (in the body's space). */
interface Leg extends WalkerLeg {
  curl: THREE.Vector3;
}

export class AntModel {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  /** At its hips; turned, leant and rolled. */
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly gaster = new THREE.Group();
  private readonly feelers: Array<{ first: THREE.Group; second: THREE.Group; side: -1 | 1 }> = [];
  private readonly jaws: Array<{ jaw: THREE.Group; side: -1 | 1 }> = [];
  private readonly arms: Arm[] = [];
  private readonly legs: Leg[] = [];
  private readonly pike = new THREE.Group();
  private readonly tassel = new THREE.Group();
  private readonly glints: THREE.Mesh[] = [];
  private readonly shadow: THREE.Mesh;
  private readonly mat = createPs1Material({ lit: true, shine: 0.35 });
  private readonly matPlain = createPs1Material({ lit: true });
  private readonly metal = createPs1Material({ lit: true, shine: 0.75 });
  private readonly matTwo = createPs1Material({ lit: true, side: THREE.DoubleSide });
  private readonly glintMat = glowMaterial(0xf4fbff);
  private readonly springs = new Springs(SIZE);
  private walker!: Walker;
  private readonly probes: Probe[] = [];
  /** The pike as it is drawn: where its right front leg has it and which way it runs (the root's own space). */
  private readonly pikeHold = new THREE.Vector3(...POST.hold);
  private readonly pikeDir = new THREE.Vector3(...POST.dir);
  /** Levelled, and its point has come to where the rules have it: from then on it is drawn exactly there. */
  private exact = false;
  private slide = 0.6;
  private stream = 0;
  private time = 0;
  private flashAmount = 0;
  private scale = 1;
  /** How far short of the shaft each front leg falls (0: it is on it), right then left. For the tests. */
  readonly reachShort = [0, 0];

  constructor() {
    const K = modelKit(this.mat);
    const P = modelKit(this.matPlain);
    const M = modelKit(this.metal);
    this.root.add(this.rig);
    this.rig.add(this.body);
    this.body.rotation.order = 'YXZ';

    // Where the four legs join: a short barrel. Over it the chest, a hump, darker underneath.
    this.body.add(K.blob(0.14, 0.13, 0.2, (_x, y) => (y < -0.35 ? C.redDark : C.red), 0, 0, -0.01, 8, 6));
    this.body.add(K.blob(0.17, 0.18, 0.165, (_x, y, z) => (y < -0.5 ? C.redDark : y > 0.45 && z < 0.2 ? C.redLight : C.red), 0, 0.2, 0.09, 8, 6));
    // A bronze collar, and a plate over each shoulder.
    const collar = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.1, 0.155, 0.09, 8, 1), (_x, y) => (y > 0.2 ? C.bronzeLight : C.bronze), 0.25), this.metal);
    collar.position.set(0, 0.37, 0.14);
    collar.rotation.x = 0.4;
    this.body.add(collar);
    for (const side of [-1, 1]) {
      const plate = M.blob(0.085, 0.065, 0.095, (_x, y) => (y > 0.3 ? C.bronzeLight : y < -0.5 ? C.bronzeDark : C.bronze), side * 0.2, 0.28, 0.12, 6, 4, 0.15);
      plate.rotation.z = side * -0.5;
      this.body.add(plate);
    }
    // A blue cloth down its front, with a gold stud.
    const cloth = P.blob(0.1, 0.13, 0.03, (_x, y) => (y < -0.6 ? C.crestDark : C.crest), 0, 0.13, 0.245, 5, 4, 0.1);
    cloth.rotation.x = 0.2;
    this.body.add(cloth, M.blob(0.03, 0.03, 0.02, C.gold, 0, 0.2, 0.275, 5, 3, 0));

    // The head: big, wide at the back where its jaw muscles are, a bronze cap with a crest, small dark eyes.
    this.head.position.set(0, 0.49, 0.2);
    this.head.rotation.order = 'YXZ';
    this.body.add(this.head);
    this.head.add(K.blob(0.185, 0.16, 0.18, (_x, y, z) => (z > 0.6 && y < 0.3 ? C.redDark : C.red), 0, 0, 0, 8, 6));
    const cap = new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI * 0.5);
    cap.scale(0.2, 0.14, 0.2);
    const capMesh = new THREE.Mesh(paint(cap, (_x, y) => (y > 0.3 ? C.bronzeLight : y < -0.6 ? C.bronzeDark : C.bronze), 0.1), this.metal);
    capMesh.position.set(0, 0.05, -0.02);
    this.head.add(capMesh);
    this.head.add(M.box(0.04, 0.11, 0.03, C.bronze, 0, 0.02, 0.175)); // the bar down over its face
    // The crest: a fin of stiff blue bristle from its brow to the back of its head.
    {
      const top: Array<[number, number]> = [[0.17, 0.17], [0.13, 0.27], [0.08, 0.25], [0.04, 0.32], [-0.01, 0.29], [-0.06, 0.33], [-0.11, 0.28], [-0.16, 0.29], [-0.2, 0.19]];
      const v: number[] = [];
      for (let i = 0; i + 1 < top.length; i++) {
        const [z0, y0] = top[i];
        const [z1, y1] = top[i + 1];
        v.push(0, 0.14, z0, 0, y0, z0, 0, y1, z1, 0, 0.14, z0, 0, y1, z1, 0, 0.14, z1);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3));
      geo.computeVertexNormals();
      this.head.add(new THREE.Mesh(paint(geo, (_x, y) => (y < -0.3 ? C.crestDark : C.crest)), this.matTwo));
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });
    const glint = new THREE.MeshBasicMaterial({ color: 0xffe6c8 });
    for (const side of [-1, 1] as const) {
      this.head.add(K.blob(0.1, 0.1, 0.1, C.red, side * 0.1, 0.0, -0.1, 6, 5)); // the lobes at the back of its head
      this.head.add(bead(0.036, eyeMat, side * 0.158, -0.01, 0.085), bead(0.011, glint, side * 0.178, 0.008, 0.105, 4, 3));
      // A jaw: a heavy hook, hinged at the corner of its mouth, its iron-grey tip turned in.
      const jaw = new THREE.Group();
      jaw.position.set(side * 0.08, -0.09, 0.13);
      const first = P.spar(0.034, 0.024, 0.14, C.jaw, 4);
      const second = P.spar(0.024, 0.006, 0.11, (x) => (x > 0 ? C.jawTip : C.jaw), 4);
      second.position.x = 0.13;
      second.rotation.y = -side * 0.95;
      jaw.add(first, second);
      this.head.add(jaw);
      this.jaws.push({ jaw, side });
      // A feeler: a long first piece up from its brow, then an elbow, and the rest forward.
      const scape = new THREE.Group();
      scape.add(P.spar(0.015, 0.012, 0.22, C.leg, 4));
      const whip = new THREE.Group();
      whip.add(P.spar(0.012, 0.006, 0.27, (x) => (x > 0.3 ? C.redLight : C.leg), 4));
      this.head.add(scape, whip);
      this.feelers.push({ first: scape, second: whip, side });
    }

    // Its waist (two small knots) and its abdomen, built along the pivot's own +X: black, with a paler edge to each band.
    this.gaster.position.set(0, -0.03, -0.2);
    this.body.add(this.gaster);
    this.gaster.add(K.blob(0.055, 0.065, 0.05, C.redDark, 0.05, 0.01, 0, 5, 4), K.blob(0.05, 0.055, 0.05, C.redDark, 0.14, 0, 0, 5, 4));
    const rings: Array<[number, number]> = [[0.17, 0.05], [0.26, 0.175], [0.38, 0.225], [0.52, 0.22], [0.64, 0.16], [0.72, 0.07]];
    for (let i = 0; i + 1 < rings.length; i++) {
      const [x0, r0] = rings[i];
      const [x1, r1] = rings[i + 1];
      const geo = new THREE.CylinderGeometry(r1, r0, x1 - x0, 8, 1);
      geo.translate(0, (x1 - x0) / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      const seg = new THREE.Mesh(paint(geo, (nx, ny) => (nx > 0.6 && i < 4 ? C.blackBand : ny < -0.6 ? C.blackBand : C.black), 0.3), this.mat);
      seg.position.x = x0;
      this.gaster.add(seg);
    }
    const sting = P.cone(0.07, 0.09, C.black, 5);
    sting.position.x = 0.72;
    sting.rotation.z = -Math.PI / 2;
    this.gaster.add(sting);

    // Its front legs (they hold the pike): thin, with a bronze band at the wrist and a two-clawed hand.
    for (const side of [-1, 1] as const) {
      const upper = new THREE.Group();
      upper.add(P.spar(0.036, 0.028, UPPER, C.leg, 5), P.blob(0.034, 0.034, 0.034, C.redDark, UPPER, 0, 0, 5, 4));
      const fore = new THREE.Group();
      fore.add(P.spar(0.028, 0.02, FORE, (x) => (x > 0.5 ? C.legTip : C.leg), 5));
      const band = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.03, 0.033, 0.09, 6, 1).rotateZ(Math.PI / 2), (x) => (x > 0 ? C.bronze : C.bronzeLight)), this.metal);
      band.position.x = FORE - 0.11;
      fore.add(band, P.blob(0.034, 0.026, 0.034, C.legTip, FORE, 0, 0, 5, 4));
      this.rig.add(upper, fore);
      this.arms.push({ upper, fore, at: new THREE.Vector3(side * 0.17, 0.23, 0.13), side });
    }

    // Its four walking legs: a stout thigh, a knee, a long thin shin, a hooked foot.
    const spots: Array<[-1 | 1, number, number, number, 0 | 1]> = [
      // side, where it joins (forward), where the foot rests: out, forward; which pair it steps with
      [-1, 0.06, 0.5, 0.28, 0], [1, 0.06, 0.5, 0.28, 1], [-1, -0.1, 0.46, -0.44, 1], [1, -0.1, 0.46, -0.44, 0],
    ];
    for (const [side, join, out, fwd, pair] of spots) {
      const thigh = new THREE.Group();
      thigh.add(P.spar(0.042, 0.03, THIGH, (x) => (x < -0.4 ? C.redDark : C.leg), 5), P.blob(0.036, 0.036, 0.036, C.redDark, THIGH, 0, 0, 5, 4));
      const shin = new THREE.Group();
      shin.add(P.spar(0.027, 0.012, SHIN, (x) => (x > 0.2 ? C.legTip : C.leg), 4));
      shin.add(P.blob(0.03, 0.02, 0.024, C.legTip, SHIN, 0, 0, 5, 3, 0)); // its foot
      this.rig.add(thigh, shin);
      this.legs.push({
        ...walkerLeg(side, new THREE.Vector3(side * 0.1, -0.03, join), new THREE.Vector3(side * out, 0, fwd), new THREE.Vector3(side, 0.45, 0), pair, thigh, shin),
        curl: new THREE.Vector3(side * 0.12, -0.3, join > 0 ? 0.26 : -0.16),
      });
    }

    // The pike, along its own +X from where its right front leg holds it.
    this.rig.add(this.pike);
    const shaft = P.spar(0.028, 0.024, POINT - 0.4 - BUTT, (x) => (x < -0.9 ? C.woodDark : C.wood), 6);
    shaft.position.x = BUTT;
    this.pike.add(shaft);
    const ferrule = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.034, 0.034, 0.1, 6, 1).rotateZ(Math.PI / 2), C.bronze), this.metal);
    ferrule.position.x = BUTT + 0.07;
    const spike = M.cone(0.034, 0.13, (_x, y) => (y > 0.3 ? C.bronzeLight : C.bronze), 5);
    spike.position.x = BUTT + 0.02;
    spike.rotation.z = Math.PI / 2;
    // (The spike's own length is beyond BUTT: BUTT is where the shaft ends. Its tip is counted as the butt's end.)
    this.pike.add(ferrule, spike);
    const socket = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6, 1).rotateZ(-Math.PI / 2), (x) => (x > 0.3 ? C.iron : C.ironDark)), this.metal);
    socket.position.x = POINT - 0.4;
    this.pike.add(socket);
    for (const s of [-1, 1]) {
      const lug = M.cone(0.022, 0.1, C.ironDark, 4);
      lug.position.set(POINT - 0.38, 0, 0);
      lug.rotation.x = (s * Math.PI) / 2;
      this.pike.add(lug);
    }
    // The head: a long leaf, lying flat, a ridge down the middle of it, coming to its point exactly at POINT.
    {
      const L = 0.34;
      const x0 = POINT - L;
      const pts: Array<[number, number]> = [[0, 0.03], [0.3, 0.075], [0.55, 0.06], [1, 0]];
      const v: number[] = [];
      const col: number[] = [];
      const tint = new THREE.Color();
      const push = (x: number, y: number, z: number, c: number): void => {
        v.push(x0 + x * L, y, z);
        tint.set(c);
        col.push(tint.r, tint.g, tint.b);
      };
      for (let i = 0; i + 1 < pts.length; i++) {
        const [a, wa] = pts[i];
        const [b, wb] = pts[i + 1];
        for (const edge of [-1, 1]) {
          for (const face of [-1, 1]) {
            // From the ridge (thick, in the middle) out to one edge (sharp).
            const ra = 0.016 * (1 - a);
            const rb = 0.016 * (1 - b);
            const quad: Array<[number, number, number, number]> = [[a, face * ra, 0, C.ironDark], [b, face * rb, 0, C.ironDark], [b, 0, edge * wb, 0xdfe4ee], [a, 0, edge * wa, 0xdfe4ee]];
            const order = edge * face < 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
            for (const k of order) push(quad[k][0], quad[k][1], quad[k][2], quad[k][3] === C.ironDark ? C.iron : quad[k][3]);
          }
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeVertexNormals();
      this.pike.add(new THREE.Mesh(geo, this.metal));
    }
    // Two ribbons under the head: they hang, and stream back in a thrust.
    this.tassel.position.x = TASSEL;
    this.pike.add(this.tassel);
    {
      const ribbon = (len: number, wide: number, color: number, dark: number, flat: boolean): THREE.Mesh => {
        const w = (k: number): V3 => (flat ? [0, 0, k] : [0, k, 0]);
        const a = w(wide);
        const b = w(-wide);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, a[1], a[2], len, a[1] * 0.4, a[2] * 0.4, len * 0.82, b[1], b[2], 0, a[1], a[2], len * 0.82, b[1], b[2], 0, b[1], b[2]]), 3));
        geo.computeVertexNormals();
        return new THREE.Mesh(paint(geo, (x) => (x > 0.3 ? dark : color)), this.matTwo);
      };
      this.tassel.add(ribbon(0.24, 0.03, C.crest, C.crestDark, false), ribbon(0.19, 0.026, C.gold, C.bronze, true));
    }
    // The glint on its point, before a thrust.
    const tipAt = new THREE.Group();
    tipAt.position.x = POINT - 0.03;
    this.pike.add(tipAt);
    const twinkle = twinkleGeometry();
    for (const turn of [0, Math.PI / 2]) {
      const g = new THREE.Mesh(twinkle, this.glintMat);
      g.rotation.x = turn;
      g.rotation.y = Math.PI / 2;
      g.visible = false;
      tipAt.add(g);
      this.glints.push(g);
    }

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.52, 10), lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);

    this.walker = new Walker(this.root, this.body, this.legs, { thigh: THIGH, shin: SHIN, stride: 0.24, strideStill: 0.14, stepTime: 0.13, lift: 0.07 });
    this.root.updateMatrixWorld(true);
    this.probes.push(new Probe(this.body, [this.head, this.gaster]), new Probe(this.head), new Probe(this.gaster));
    flatten(POST, this.springs.target);
    this.springs.snap();
    this.lay(0, null);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes it white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  private poseFor(ctx: AntAnimInput): Pose {
    switch (ctx.state) {
      case 'idle': return POST;
      case 'return': return CARRY;
      case 'windup': return DRAW;
      case 'thrust': return LUNGE;
      case 'recover': return SPENT;
      case 'biteWind': return BITE_WIND;
      case 'bite': return BITE;
      case 'biteRest': return BITE_REST;
      case 'reel': return REEL;
      case 'stagger': return FLINCH;
      case 'dead': return DEAD;
      default: return ctx.level ? LEVEL : PORT;
    }
  }

  /**
   * Off duty: a regular at the Club. (The owner, 2026-11-15: "maybe one of the ants that's an enemy can also just kind
   * of be a chill dude drinking at dizzy Dave's Bar".) No pike: a thimble of something in the claw that held it.
   */
  offDuty(): void {
    this.off = true;
    for (const c of this.pike.children) c.visible = false;
    const cup = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.085, 0.066, 0.17, 7, 1).rotateZ(-Math.PI / 2), 0xa9a79c), this.metal);
    cup.position.x = 0.02;
    const drink = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.072, 0.072, 0.012, 7, 1).rotateZ(-Math.PI / 2), 0x5a3418), this.metal);
    drink.position.x = 0.1;
    this.pike.add(cup, drink);
  }

  private off = false;

  update(dt: number, ctx: AntAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    flatten(this.poseFor(ctx), this.springs.target);
    // Off duty: its thimble comes up to its jaws and tips, its head goes back for it; else its head turns to whoever.
    if (this.off) {
      const s = Math.min(1, Math.max(0, ctx.sip ?? 0));
      const t = this.springs.target;
      t.set([-0.38 + 0.2 * s, 0.98 + 0.07 * s, 0.3 + 0.16 * s], I.hold);
      t.set([0.85 * s, 1 - 0.3 * s, -0.15 * s], I.dir);
      t.set([-0.32 * s, (ctx.look ?? 0) * (1 - s) - 0.3 * s, 0], I.head);
      t[I.jaws] = 0.55 * s;
    }
    // (Dying, its pike goes out sideways before it falls, clear of its legs.)
    if (state === 'dead' && ctx.stateTime < 0.16) {
      this.springs.target.set(FLUNG.hold, I.hold);
      this.springs.target.set(FLUNG.dir, I.dir);
    }
    // (While the rules have the pike, the springs that would carry it wait where it is, so it leaves from there.)
    if (ctx.level) {
      for (const s of [this.springs.target, this.springs.value]) {
        s.set([this.pikeHold.x, this.pikeHold.y, this.pikeHold.z], I.hold);
        s.set([this.pikeDir.x, this.pikeDir.y, this.pikeDir.z], I.dir);
      }
    }
    // How hard the springs pull: a thrust snaps, the wind-up is drawn, a blow jolts, the rest settle.
    const stiffness = state === 'thrust' || state === 'bite' ? 40 : state === 'stagger' || state === 'reel' ? 24 : state === 'windup' ? 17 : state === 'biteWind' ? 22 : state === 'dead' ? 11 : 15;
    const damping = state === 'reel' || state === 'stagger' ? 0.5 : state === 'thrust' || state === 'bite' ? 1 : 0.85;
    this.springs.step(dt, stiffness, damping);

    // Dead: it lies a while, then shrivels away.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 1.4) / 0.6)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;

    this.lay(dt, ctx);

    // The glint on its point: it swells through the tell.
    const tell = state === 'windup' ? Math.min(1, ctx.stateTime / Math.max(0.1, ctx.windupTime)) : -1;
    const size = tell >= 0 ? 0.05 + 0.16 * twinkleSize(0.08 + tell * 0.6) : 0;
    this.glints.forEach((g, i) => {
      g.visible = size > 0.01;
      g.scale.setScalar(size * (i ? 0.8 : 1));
      g.rotation.z = this.time * 5 * (i ? -1 : 1);
    });

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    for (const m of [this.mat, this.matPlain, this.metal, this.matTwo]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    this.root.updateMatrixWorld(true);
  }

  private readonly T = {
    v: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), pole: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
    tip: new THREE.Vector3(), dir: new THREE.Vector3(), hold: new THREE.Vector3(), q: new THREE.Quaternion(), inv: new THREE.Matrix4(), m: new THREE.Matrix4(),
  };

  /** Lays it out from the spring values: body, pike, front legs, feet. */
  private lay(dt: number, ctx: AntAnimInput | null): void {
    const v = this.springs.value;
    const T = this.T;
    const t = this.time;
    const state: AntState = ctx?.state ?? 'idle';
    const dead = state === 'dead';

    // ---- Life laid over the pose ----
    let sway = 0;
    let bob = 0;
    let shake = 0;
    let turn = 0;
    if (state === 'idle') {
      bob = 0.008 * Math.sin(t * 1.7);
      // Now and then it looks to one side.
      const beat = (t * 0.19) % 1;
      turn = 0.5 * Math.sin(Math.min(1, Math.max(0, (beat - 0.55) / 0.45)) * Math.PI) * (Math.floor(t * 0.19) % 2 ? 1 : -1);
    } else if (state === 'hold') {
      sway = 0.02 * Math.sin(t * 2.6);
      bob = 0.01 * Math.sin(t * 5.2);
    } else if (state === 'windup') shake = 0.01 * Math.min(1, ctx!.stateTime / Math.max(0.1, ctx!.windupTime)) * Math.sin(t * 47);
    else if (state === 'reel') {
      sway = 0.06 * Math.sin(t * 5.3);
      bob = 0.02 * Math.sin(t * 7.1);
      turn = 0.3 * Math.sin(t * 3.9);
    } else if (state === 'recover') shake = 0.006 * Math.sin(t * 11);

    // ---- Its body ----
    this.body.position.set(v[I.hip] + sway, v[I.hip + 1] + bob + shake, v[I.hip + 2] - shake * 0.5);
    this.body.rotation.set(v[I.pitch], v[I.yaw], v[I.roll] + (state === 'reel' ? 0.08 * Math.sin(t * 5.3 + 0.7) : 0));
    this.head.rotation.set(v[I.head], v[I.head + 1] + turn, v[I.head + 2]);
    // (Its abdomen is told where to point as the ant stands: its body's own turn and lean are taken out.)
    T.q.copy(this.body.quaternion).invert();
    T.dir.set(v[I.gaster], v[I.gaster + 1] + (dead ? 0 : 0.03 * Math.sin(t * 2.3)), v[I.gaster + 2]).normalize().applyQuaternion(T.q);
    aim(this.gaster, T.dir, T.up);
    const back = Math.min(1, Math.max(0, v[I.feelers]));
    for (const f of this.feelers) {
      const twitch = dead ? 0 : 0.08 * Math.sin(t * 6.3 + f.side * 1.3);
      T.a.set(f.side * 0.5, 0.75 - back * 0.15, 0.45 - back * 1.05 + twitch).normalize();
      T.b.set(f.side * (0.25 + back * 0.1), 0.1 + back * 0.25 + twitch, 1 - back * 1.9).normalize();
      f.first.position.set(f.side * 0.075, 0.035, 0.165);
      aim(f.first, T.a, T.up);
      f.second.position.copy(f.first.position).addScaledVector(T.a, 0.22);
      aim(f.second, T.b, T.up);
    }
    const open = Math.min(1, Math.max(0, v[I.jaws])) + (state === 'hold' ? 0.12 * Math.max(0, Math.sin(t * 9)) : 0);
    for (const j of this.jaws) aim(j.jaw, T.a.set(j.side * (-0.12 + 0.6 * open), -0.3, 1), T.up);

    // ---- Nothing under the floor: its body is lifted until its lowest point is on it ----
    this.root.updateMatrixWorld(true);
    T.inv.copy(this.root.matrixWorld).invert();
    let low = Infinity;
    for (const p of this.probes) low = Math.min(low, p.low(T.inv, T.m));
    if (low < 0.012) this.body.position.y += 0.012 - low;
    this.body.updateMatrix();

    // ---- The pike ----
    if (ctx?.level) {
      // Its point where the rules have it; the pike runs back from there along its right side to its grip.
      const cf = Math.cos(this.root.rotation.y);
      const sf = Math.sin(this.root.rotation.y);
      const wx = ctx.tip.x - this.root.position.x;
      const wz = ctx.tip.z - this.root.position.z;
      T.tip.set(wx * cf - wz * sf, ctx.tip.y - this.root.position.y, wx * sf + wz * cf);
      T.dir.set(T.tip.x - GRIP_X, T.tip.y - GRIP_Y, POINT).normalize();
      T.hold.copy(T.tip).addScaledVector(T.dir, -POINT);
      if (!this.exact && state !== 'thrust') {
        const k = 1 - Math.exp(-dt * 18);
        this.pikeDir.lerp(T.dir, k).normalize();
        this.pikeHold.lerp(T.hold, k);
        if (this.pikeHold.distanceTo(T.hold) < 0.012 && this.pikeDir.distanceTo(T.dir) < 0.012) this.exact = true;
        // (Coming down to the level its butt swings up behind: it is kept over its knees on the way.)
        const butt = this.pikeHold.y + this.pikeDir.y * (BUTT - 0.11);
        if (butt < CLEAR) this.pikeHold.y += CLEAR - butt;
      }
      if (this.exact || state === 'thrust') {
        this.exact = true;
        this.pikeDir.copy(T.dir);
        this.pikeHold.copy(T.hold);
      }
    } else {
      this.exact = false;
      this.pikeHold.set(v[I.hold], v[I.hold + 1], v[I.hold + 2]);
      this.pikeDir.set(v[I.dir], v[I.dir + 1], v[I.dir + 2]).normalize();
      // Neither end of it under the floor; and, while the ant lives, its butt over its own knees.
      const butt = this.pikeHold.y + this.pikeDir.y * (BUTT - 0.11);
      const lowAt = Math.min(this.pikeHold.y + this.pikeDir.y * POINT, butt) - 0.04;
      if (lowAt < 0.012) this.pikeHold.y += 0.012 - lowAt;
      if (!dead && butt < CLEAR) this.pikeHold.y += CLEAR - butt;
    }
    this.pike.position.copy(this.pikeHold);
    aim(this.pike, this.pikeDir, T.up);
    // The ribbons hang (in the pike's own space: straight down, or back along the shaft when it thrusts); near the
    // floor they lie over, never through it.
    this.stream = ease(this.stream, state === 'thrust' ? 1 : 0, dt, state === 'thrust' ? 40 : 5);
    {
      const high = this.pikeHold.y + this.pikeDir.y * TASSEL;
      const room = Math.min(1, Math.max(0, (high - 0.03) / 0.25));
      T.b.set(-this.pikeDir.x, 0, -this.pikeDir.z);
      if (T.b.lengthSq() < 1e-4) T.b.set(0, 0, -1);
      T.b.normalize();
      const flutter = dead ? 0 : 0.12 * Math.sin(t * 7.3) * (0.4 + this.stream);
      T.a.set(0, -room, 0).addScaledVector(T.b, Math.sqrt(1 - room * room) + this.stream * 2.2 + flutter).normalize();
      T.q.copy(this.pike.quaternion).invert();
      T.a.applyQuaternion(T.q);
      aim(this.tassel, T.a, T.c.set(1, 0, 0));
    }

    // ---- Its front legs, laid to the shaft ----
    const leftOn = Math.min(1, Math.max(0, v[I.left]));
    this.arms.forEach((arm, i) => {
      const from = T.v.copy(arm.at).applyMatrix4(this.body.matrix);
      const to = T.b;
      if (dead) {
        // Let go: curled in to its chest.
        to.set(arm.side * 0.1, 0.05, 0.3).applyQuaternion(this.body.quaternion).add(from);
        T.pole.set(arm.side * 0.5, -0.3, 0.6).applyQuaternion(this.body.quaternion);
      } else if (arm.side < 0) {
        // Its right holds the pike fast, where the pike is held from.
        to.copy(this.pikeHold);
        T.pole.set(-0.7, -0.35, -0.6);
      } else {
        // Its left holds wherever on the shaft comes nearest a place before its chest: the shaft slides through it.
        T.a.set(-0.22, -0.1, 0.32).applyQuaternion(this.body.quaternion).add(from);
        const s = Math.max(SLIDE[0], Math.min(SLIDE[1], T.a.sub(this.pikeHold).dot(this.pikeDir)));
        this.slide = dt > 0 ? ease(this.slide, s, dt, 20) : s;
        to.copy(this.pikeHold).addScaledVector(this.pikeDir, this.slide);
        if (leftOn < 1) {
          // Coming off the shaft, or going to it, its hand goes round the front of its chest, not through it.
          const free = T.a.set(v[I.free], v[I.free + 1], v[I.free + 2]).applyMatrix4(this.body.matrix);
          const front = T.c.set(0.02, 0.12, 0.5).applyMatrix4(this.body.matrix);
          const k = 1 - leftOn;
          to.multiplyScalar((1 - k) * (1 - k)).addScaledVector(front, 2 * k * (1 - k)).addScaledVector(free, k * k);
        }
        T.pole.set(0.45, -0.75, 0.35);
      }
      this.reachShort[i] = twoBone(from, to, T.pole, UPPER, FORE, arm.upper, arm.fore);
      if (arm.side > 0 && leftOn < 0.5) this.reachShort[i] = 0;
      this.liftJoint(arm.upper, arm.fore, UPPER, FORE);
    });

    // ---- Its four feet: planted, stepping in pairs; curled to its belly when it lies dead ----
    this.walker.update(dt, -FOOT, Math.min(1, Math.max(0, v[I.tuck])), (_leg, index, out) => out.copy(this.legs[index].curl));
    for (const leg of this.legs) this.liftJoint(leg.thigh, leg.shin, THIGH, SHIN);
  }

  /**
   * A knee or elbow that would be under the floor is held on it (moved out, level, to where the first piece still
   * reaches it), and the second piece laid from it towards where it ended.
   */
  private liftJoint(first: THREE.Object3D, second: THREE.Object3D, l1: number, l2: number): void {
    const joint = second.position;
    const from = first.position;
    const T = this.T;
    const end = T.a.set(l2, 0, 0).applyQuaternion(second.quaternion).add(joint);
    if (joint.y >= 0.04 && end.y >= FOOT - 0.001) return;
    if (joint.y < 0.04) {
      const dy = 0.04 - from.y;
      const flat = Math.sqrt(Math.max(0, l1 * l1 - dy * dy));
      T.c.set(joint.x - from.x, 0, joint.z - from.z);
      if (T.c.lengthSq() < 1e-6) T.c.set(1, 0, 0);
      T.c.normalize();
      joint.set(from.x + T.c.x * flat, 0.04, from.z + T.c.z * flat);
      aim(first, T.c.copy(joint).sub(from), T.up);
    }
    if (end.y < FOOT) end.y = FOOT;
    aim(second, T.c.copy(end).sub(joint), T.up);
  }

  /** Where things are in the world, for the tests and the pictures. */
  parts(): {
    tip: THREE.Vector3; butt: THREE.Vector3; hands: THREE.Vector3[]; holds: THREE.Vector3[]; feet: THREE.Vector3[];
    chest: THREE.Vector3; head: THREE.Vector3; gaster: THREE.Vector3[];
    /** Each front leg and each walking leg as three points: where it joins, its elbow or knee, its end. */
    arms: THREE.Vector3[][]; legs: THREE.Vector3[][];
  } {
    this.root.updateMatrixWorld(true);
    const at = (o: THREE.Object3D, x: number, y = 0, z = 0): THREE.Vector3 => o.localToWorld(new THREE.Vector3(x, y, z));
    return {
      tip: at(this.pike, POINT),
      butt: at(this.pike, BUTT - 0.11),
      hands: this.arms.map((a) => at(a.fore, FORE)),
      holds: [at(this.pike, 0), at(this.pike, this.slide)],
      feet: this.legs.map((l) => at(l.shin, SHIN)),
      chest: at(this.body, 0, 0.2, 0.09),
      head: at(this.head, 0),
      gaster: [at(this.gaster, 0.3), at(this.gaster, 0.45), at(this.gaster, 0.6)],
      arms: this.arms.map((a) => [at(a.upper, 0), at(a.fore, 0), at(a.fore, FORE)]),
      legs: this.legs.map((l) => [at(l.thigh, 0), at(l.shin, 0), at(l.shin, SHIN)]),
    };
  }
}
