import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { bead, mix, modelKit } from '../render/modelKit';
import { glowMaterial, twinkleGeometry, twinkleSize } from '../world/itemModels';
import { Springs, Walker, aim, ease, twoBone, walkerLeg, type WalkerLeg } from '../render/bugRig';
import { STAG, type StagState } from './stag';

/**
 * Stag Knight model: a great beetle up on its hind legs. A broad shell in dark blued steel with copper edges, wing
 * cases down its back that lift to show the heat under them, a small head set low between its shoulders with two
 * long antlers, two thick arms, two small ones folded on its belly, and a forge hammer as tall as it is: an ash
 * shaft and a block of iron with a core that glows.
 *
 * How it is posed. THE HAMMER COMES FIRST: a pose says where the hammer's grip is and which way its shaft points
 * (in plain directions over the floor), and both arms are then laid from its shoulders to the shaft. So the hammer
 * goes exactly where a pose says, and its hands are on it. (The Keep Guard's spear was posed the other way about,
 * from the arm outwards, and went through his head.) The two big swings are not poses at all but arcs: the hammer's
 * angle is worked out from how far through the swing it is, so it comes over the top and lands when the blow does.
 */
const C = {
  shell: 0x24404a, shellDark: 0x16282e, copper: 0xb0683a, belly: 0xc08a48, bellyDark: 0x7a5230, limb: 0x2a3438, joint: 0x9a5a30,
  horn: 0x1a2226, hornTip: 0xe0763a, eye: 0xffa040, wood: 0x4a3424, iron: 0x43474f, ironDark: 0x2c2f36, under: 0xff7a28,
};
const HIP = 0.72;
const THIGH = 0.4;
const SHIN = 0.42;
const UPPER = 0.54;
const FORE = 0.52;
/** Along the shaft from its right-hand grip: the butt behind it, its left hand's grip, and the middle of the head. */
const BUTT = -0.1;
const LEFT_GRIP = 0.32;
const HEAD = 1.3;
const HEAD_HALF = 0.21;
/** The middle of its chest, in the body's own space. */
const CHEST_AT = new THREE.Vector3(0, 0.5, 0.04);

type V3 = [number, number, number];
interface Pose {
  /** Its hips over its feet: [sideways, height, forward]. */
  hip: V3;
  /** The whole body: leant forward, turned (to its left is positive), tipped sideways. */
  pitch: number;
  yaw: number;
  roll: number;
  /** Its head: [nod down, turn]. Antlers: 0 closed .. 1 wide. Wing cases: 0 shut .. 1 lifted. */
  head: [number, number];
  jaws: number;
  shell: number;
  /** The hammer: where its right-hand grip is (over the floor, from its middle) and which way the shaft points, towards the head. */
  grip: V3;
  dir: V3;
  /** 0: hands on the hammer, feet on the floor. 1: limbs curled to its belly (dead). */
  curl: number;
  /** How hot the hammer's core glows, 0..1. */
  heat: number;
}

// Its head is on top of its shell and its antlers rise from it, so the front of its chest is clear: that is where the
// hammer is held. Every one of these was measured (tests/models.ts): hands on the shaft, the shaft and the head of the
// hammer clear of its own head, antlers, body, wing cases and legs, and nothing under the floor.
/** At its post: both hands on the end of the shaft, the hammer's head on the floor in front, like a knight on his sword. */
const REST: Pose = { hip: [0, HIP, 0], pitch: 0.1, yaw: 0, roll: 0, head: [0.12, 0], jaws: 0.15, shell: 0, grip: [0, 1.4, 0.7], dir: [0, -0.915, 0.403], curl: 0, heat: 0.12 };
/** Coming on: the hammer carried upright before it, tipped forward. */
const READY: Pose = { hip: [0, HIP - 0.02, 0.02], pitch: 0.14, yaw: 0, roll: 0, head: [0.05, 0], jaws: 0.3, shell: 0, grip: [-0.05, 1.0, 0.68], dir: [-0.1, 0.85, 0.52], curl: 0, heat: 0.18 };
/** The slam's tell: reared back, the hammer right up over its head and behind, glowing. */
const SLAM_WIND: Pose = { hip: [0, HIP + 0.08, -0.08], pitch: -0.25, yaw: 0, roll: 0, head: [-0.25, 0], jaws: 1, shell: 0.25, grip: [0, 1.92, -0.2], dir: [0, 0.6, -0.8], curl: 0, heat: 1 };
/** Landed: bent right over, the hammer's head on the floor well out in front. Stuck there a while. */
const SLAM_END: Pose = { hip: [0, 0.56, 0.22], pitch: 0.5, yaw: 0, roll: 0, head: [0.3, 0], jaws: 0.5, shell: 0.1, grip: [0, 0.62, 0.98], dir: [0, -0.315, 0.949], curl: 0, heat: 0.5 };
/** The sweep's tell: turned to its right, the hammer drawn back level on that side. */
const SWEEP_WIND: Pose = { hip: [0, HIP - 0.06, -0.02], pitch: 0.12, yaw: -0.9, roll: -0.08, head: [0.05, 0.7], jaws: 0.7, shell: 0, grip: [-0.1, 0.84, 0.5], dir: [-0.92, -0.2, -0.33], curl: 0, heat: 0.45 };
/** Swung through: turned to its left, the hammer out on that side. */
const SWEEP_END: Pose = { hip: [0, HIP - 0.08, 0.06], pitch: 0.2, yaw: 0.7, roll: 0.08, head: [0.1, -0.5], jaws: 0.4, shell: 0, grip: [0.1, 0.82, 0.55], dir: [0.92, -0.2, 0.33], curl: 0, heat: 0.3 };
/** The stomp's tell: up on its toes, wing cases lifted and the heat showing, the hammer held high. */
const STOMP_WIND: Pose = { hip: [0, HIP + 0.1, 0], pitch: -0.1, yaw: 0, roll: 0, head: [-0.2, 0], jaws: 1, shell: 1, grip: [0, 1.25, 0.62], dir: [0.03, 0.97, 0.24], curl: 0, heat: 0.4 };
/** And down: all its weight dropped onto its feet. */
const STOMP: Pose = { hip: [0, 0.48, 0], pitch: 0.28, yaw: 0, roll: 0, head: [0.3, 0], jaws: 0.6, shell: 0.7, grip: [0, 0.82, 0.72], dir: [0.05, 0.86, 0.5], curl: 0, heat: 0.3 };
/** Poise broken: down low, hunched over the hammer with its head hanging. Open. */
const KNEEL: Pose = { hip: [0, 0.42, 0.05], pitch: 0.3, yaw: 0, roll: 0.06, head: [0.6, 0], jaws: 0, shell: 0.15, grip: [-0.15, 0.8, 0.78], dir: [-0.08, -0.45, 0.89], curl: 0, heat: 0.08 };
/** Dead: over on its back like any beetle, legs in the air, the hammer on the floor beside it. */
const DEAD: Pose = { hip: [0, 0.66, -0.2], pitch: -1.5, yaw: 0, roll: 0, head: [0.4, 0], jaws: 0.5, shell: 0.2, grip: [-1.3, 0.21, -0.3], dir: [0.1, 0, 0.995], curl: 1, heat: 0 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function between(a: Pose, b: Pose, t: number): Pose {
  const v = (x: V3, y: V3): V3 => [lerp(x[0], y[0], t), lerp(x[1], y[1], t), lerp(x[2], y[2], t)];
  return {
    hip: v(a.hip, b.hip), pitch: lerp(a.pitch, b.pitch, t), yaw: lerp(a.yaw, b.yaw, t), roll: lerp(a.roll, b.roll, t), head: [lerp(a.head[0], b.head[0], t), lerp(a.head[1], b.head[1], t)],
    jaws: lerp(a.jaws, b.jaws, t), shell: lerp(a.shell, b.shell, t), grip: v(a.grip, b.grip), dir: v(a.dir, b.dir), curl: lerp(a.curl, b.curl, t), heat: lerp(a.heat, b.heat, t),
  };
}
/** The slam, `u` of the way through (0..1): the hammer comes over the top in an arc and gathers speed all the way down. */
function slamArc(u: number): Pose {
  const e = u * u;
  const p = between(SLAM_WIND, SLAM_END, e);
  const a0 = Math.atan2(SLAM_WIND.dir[1], SLAM_WIND.dir[2]);
  const a1 = Math.atan2(SLAM_END.dir[1], SLAM_END.dir[2]);
  const a = lerp(a0, a1, e);
  p.dir = [0, Math.sin(a), Math.cos(a)];
  // Its hands come up and over in front of its own head, not straight down through it.
  const over: V3 = [0, 1.9, 0.8];
  const k = [(1 - e) * (1 - e), 2 * e * (1 - e), e * e];
  p.grip = [0, 1, 2].map((i) => k[0] * SLAM_WIND.grip[i] + k[1] * over[i] + k[2] * SLAM_END.grip[i]) as V3;
  p.heat = 1;
  return p;
}
/** The sweep, `u` of the way through: the hammer goes round its front level, from behind its right to out on its left. */
function sweepArc(u: number): Pose {
  const e = u * u * (3 - 2 * u);
  const p = between(SWEEP_WIND, SWEEP_END, e);
  const a0 = Math.atan2(SWEEP_WIND.dir[0], SWEEP_WIND.dir[2]);
  const a1 = Math.atan2(SWEEP_END.dir[0], SWEEP_END.dir[2]);
  const a = lerp(a0, a1, e);
  const flat = Math.sqrt(1 - 0.2 * 0.2);
  p.dir = [Math.sin(a) * flat, -0.2, Math.cos(a) * flat];
  p.grip = [p.grip[0], p.grip[1], p.grip[2] + 0.15 * Math.sin(e * Math.PI)];
  return p;
}

const SIZE = 18;
const I = { hip: 0, pitch: 3, yaw: 4, roll: 5, head: 6, jaws: 8, shell: 9, grip: 10, dir: 13, curl: 16, heat: 17 };
function flatten(p: Pose, out: Float32Array): void {
  out.set(p.hip, I.hip);
  out[I.pitch] = p.pitch;
  out[I.yaw] = p.yaw;
  out[I.roll] = p.roll;
  out.set(p.head, I.head);
  out[I.jaws] = p.jaws;
  out[I.shell] = p.shell;
  out.set(p.grip, I.grip);
  out.set(p.dir, I.dir);
  out[I.curl] = p.curl;
  out[I.heat] = p.heat;
}

export interface StagAnimInput {
  state: StagState;
  stateTime: number;
  /** How fast it is walking. */
  walking: number;
}

interface Arm {
  side: -1 | 1;
  shoulder: THREE.Vector3; // in the body's space
  curled: THREE.Vector3; // where its hand goes when it has let go (body space)
  upper: THREE.Group;
  fore: THREE.Group;
}

export class StagModel {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly body = new THREE.Group(); // at the hips; leant, turned and tipped
  private readonly head = new THREE.Group();
  private readonly antlers: THREE.Group[] = [];
  private readonly feelers: THREE.Group[] = [];
  private readonly cases: THREE.Group[] = [];
  private readonly underGlow: THREE.Mesh[] = [];
  private readonly hammer = new THREE.Group();
  private readonly headAt = new THREE.Group();
  private readonly arms: Arm[] = [];
  private readonly legs: Array<WalkerLeg & { curled: THREE.Vector3 }> = [];
  private walker!: Walker;
  private readonly mat = createPs1Material({ lit: true, shine: 0.55 });
  private readonly matPlain = createPs1Material({ lit: true });
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: 0x5a1a08 });
  private readonly underMat = new THREE.MeshBasicMaterial({ color: C.under });
  private readonly glints: THREE.Mesh[] = [];
  private readonly glintMat = glowMaterial(0xff5a30);
  private readonly ring: THREE.Mesh;
  private readonly ringMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), 1);
  private readonly shadow: THREE.Mesh;
  private readonly springs = new Springs(SIZE);
  private time = 0;
  private flashAmount = 0;
  private scale = 1;
  private last: StagState = 'idle';
  /** The ring that runs out over the floor from a blow: how far through it is (1 = gone), where, and how big it gets. */
  private wave = 1;
  private waveSize = 1;
  /** How far each hand fell short of the shaft last frame (for tests). */
  readonly reachShort = [0, 0];

  constructor() {
    const { blob, spar, box } = modelKit(this.mat);
    const plain = modelKit(this.matPlain);
    const eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });
    this.root.add(this.rig);
    this.rig.add(this.body);
    this.body.rotation.order = 'YXZ';

    // Its lower body: a barrel plated in bands, pale and warm in front, shell-dark behind.
    const bands = (_x: number, ny: number, nz: number): number => (nz < -0.1 ? C.shellDark : Math.floor((ny + 1) * 3) % 2 ? C.belly : C.bellyDark);
    this.body.add(plain.blob(0.42, 0.36, 0.38, bands, 0, 0.02, -0.04, 9, 7, 0.2));
    // Its chest: a broad plate from shoulder to shoulder, a copper rim along its top edge, and a boss on each shoulder.
    this.body.add(blob(0.56, 0.32, 0.4, (_x, ny, nz) => (ny > 0.55 ? C.copper : nz > 0.35 && ny < 0 ? C.bellyDark : C.shell), 0, 0.52, 0.06, 9, 6, 0.25));
    for (const s of [-1, 1]) this.body.add(blob(0.17, 0.15, 0.17, (_x, ny) => (ny > 0.3 ? C.copper : C.shell), s * 0.5, 0.63, 0.08, 6, 5, 0.2));

    // Wing cases: two long domed plates down its back, hinged at the top, copper along the seam between them.
    for (const s of [-1, 1] as const) {
      const hinge = new THREE.Group();
      hinge.position.set(s * 0.06, 0.86, -0.16);
      const plate = blob(0.31, 0.6, 0.3, (nx, ny, nz) => (nx * s < -0.72 || ny < -0.9 ? C.copper : nz > 0.2 ? C.shellDark : mix(C.shell, C.shellDark, Math.max(0, -ny) * 0.5)), s * 0.24, -0.5, -0.14, 8, 7, 0.3);
      hinge.add(plate);
      // A few rivets down it.
      for (let k = 0; k < 3; k++) hinge.add(plain.blob(0.035, 0.035, 0.035, C.copper, s * 0.3, -0.22 - k * 0.26, -0.42 + k * 0.01, 4, 3, 0));
      this.body.add(hinge);
      this.cases.push(hinge);
      // What is under them: the heat of it, seen when they lift.
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 5), this.underMat);
      glow.scale.set(0.2, 0.42, 0.14);
      glow.position.set(s * 0.17, 0.36, -0.28);
      glow.visible = false;
      this.body.add(glow);
      this.underGlow.push(glow);
    }

    // The head: a small helm of a head on top of its shell, ember eyes, and two great antlers rising from it and
    // swept back over its shoulders like the horns of a helm, a short brow tine pointing forward on each. (Swept
    // back, so that the front of its chest and the air over its head are clear for the hammer.) They open and shut.
    this.head.position.set(0, 0.76, 0.28);
    this.head.rotation.order = 'YXZ';
    this.body.add(this.head);
    this.head.add(blob(0.2, 0.17, 0.2, (_x, ny) => (ny > 0.35 ? C.copper : C.shellDark), 0, 0, 0, 7, 5, 0.2));
    for (const s of [-1, 1] as const) {
      this.head.add(bead(0.045, eyeMat, s * 0.11, 0.0, 0.17));
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.14, 0.08, 0.05);
      // Each antler: a thick beam up and out, a second length curving in and forward, a tine on the inside, a hot tip.
      const beam = new THREE.Group();
      beam.add(plain.spar(0.08, 0.058, 0.42, C.horn, 5));
      aim(beam, new THREE.Vector3(s * 0.55, 0.62, -0.3), new THREE.Vector3(0, 0, 1));
      const end = new THREE.Group();
      end.position.copy(new THREE.Vector3(s * 0.55, 0.62, -0.3).normalize().multiplyScalar(0.42));
      const tine = new THREE.Group();
      tine.add(plain.spar(0.058, 0.014, 0.36, (nx) => (nx > 0.4 ? C.hornTip : C.horn), 5));
      aim(tine, new THREE.Vector3(s * 0.2, 0.45, -0.85), new THREE.Vector3(0, 1, 0));
      const prong = new THREE.Group();
      prong.add(plain.spar(0.035, 0.008, 0.2, (nx) => (nx > 0.3 ? C.hornTip : C.horn), 4));
      prong.position.copy(new THREE.Vector3(s * 0.55, 0.62, -0.3).normalize().multiplyScalar(0.2));
      aim(prong, new THREE.Vector3(s * 0.25, 0.55, 0.8), new THREE.Vector3(0, 1, 0));
      end.add(tine);
      pivot.add(beam, end, prong);
      this.head.add(pivot);
      this.antlers.push(pivot);
      // Feelers: short, clubbed.
      const f = new THREE.Group();
      f.position.set(s * 0.06, 0.1, 0.16);
      const stalk = plain.spar(0.014, 0.01, 0.2, C.limb, 4);
      stalk.rotation.z = Math.PI / 2;
      f.add(stalk, plain.blob(0.03, 0.03, 0.03, C.copper, 0, 0.2, 0, 4, 3, 0));
      this.head.add(f);
      this.feelers.push(f);
      // Its small middle arms, folded on its belly.
      const small = new THREE.Group();
      small.position.set(s * 0.3, 0.22, 0.26);
      const upper = plain.spar(0.045, 0.035, 0.2, C.limb, 4);
      upper.rotation.set(0, -Math.PI / 2 + s * 0.3, -0.7);
      const claw = plain.cone(0.03, 0.12, C.joint, 4);
      claw.position.set(-s * 0.03, -0.16, 0.15);
      claw.rotation.x = Math.PI - 0.6;
      small.add(upper, claw);
      this.body.add(small);
    }

    // Arms: thick, plated on the outside, a pincer for a hand.
    for (const s of [-1, 1] as const) {
      const upper = new THREE.Group();
      upper.add(spar(0.13, 0.1, UPPER, (_nx, ny) => (ny > 0.3 ? C.shell : C.limb), 6), plain.blob(0.105, 0.105, 0.105, C.joint, UPPER, 0, 0, 5, 4));
      const fore = new THREE.Group();
      fore.add(spar(0.105, 0.085, FORE, (_nx, ny) => (ny > 0.3 ? C.shell : C.limb), 6), plain.blob(0.1, 0.09, 0.1, C.limb, FORE, 0, 0, 5, 4));
      for (let k = 0; k < 2; k++) {
        const spike = plain.cone(0.022, 0.07, C.copper, 4);
        spike.position.set(0.14 + k * 0.14, 0.09, 0);
        fore.add(spike);
      }
      this.rig.add(upper, fore);
      this.arms.push({ side: s, shoulder: new THREE.Vector3(s * 0.5, 0.6, 0.1), curled: new THREE.Vector3(s * 0.3, 0.3, 0.52), upper, fore });
    }

    // The hammer. Its own +X runs up the shaft from the right hand's grip to the head.
    const shaft = plain.spar(0.05, 0.045, HEAD - BUTT, C.wood, 6);
    shaft.position.x = BUTT;
    this.hammer.add(shaft, plain.blob(0.07, 0.07, 0.07, C.ironDark, BUTT, 0, 0, 5, 4));
    for (const x of [-0.04, 0.6, HEAD - HEAD_HALF - 0.06]) this.hammer.add(plain.blob(0.035, 0.062, 0.062, C.iron, x, 0, 0, 6, 3, 0));
    // The head: a core that glows, clad in six iron plates that leave it showing along every edge.
    this.headAt.position.x = HEAD;
    this.hammer.add(this.headAt);
    const side = HEAD_HALF * 2;
    const core = new THREE.Mesh(new THREE.BoxGeometry(side * 0.84 - 0.04, side - 0.04, side - 0.04), this.coreMat);
    this.headAt.add(core);
    const plateSize = side - 0.09;
    for (const [ax, sg] of [[0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1]] as const) {
      const dims: V3 = [plateSize * 0.84, plateSize, plateSize];
      dims[ax] = 0.035;
      const plate = box(dims[0], dims[1], dims[2], ax === 0 ? C.ironDark : C.iron, 0, 0, 0);
      plate.position.setComponent(ax, sg * (ax === 0 ? side * 0.42 : HEAD_HALF) - sg * 0.01);
      this.headAt.add(plate);
    }
    const star = twinkleGeometry();
    for (const turn of [0, Math.PI / 2]) {
      const g = new THREE.Mesh(star, this.glintMat);
      g.rotation.y = turn;
      g.visible = false;
      this.headAt.add(g);
      this.glints.push(g);
    }
    this.rig.add(this.hammer);

    // Legs: thick, the knee forward and out, spurs down the shin, two claws for a foot.
    for (const s of [-1, 1] as const) {
      const thigh = new THREE.Group();
      thigh.add(spar(0.15, 0.11, THIGH, (_nx, ny) => (ny > 0.2 ? C.shell : C.limb), 6), plain.blob(0.115, 0.115, 0.115, C.joint, THIGH, 0, 0, 5, 4));
      const shin = new THREE.Group();
      shin.add(spar(0.105, 0.075, SHIN, C.limb, 6));
      for (let k = 0; k < 2; k++) {
        const spur = plain.cone(0.022, 0.08, C.copper, 4);
        spur.position.set(0.12 + k * 0.13, -0.085, 0);
        spur.rotation.z = Math.PI;
        shin.add(spur);
      }
      for (const t of [-1, 1]) {
        const claw = plain.cone(0.04, 0.16, C.horn, 4);
        claw.position.set(SHIN - 0.03, 0, t * 0.05);
        claw.rotation.set(t * 0.35, 0, -Math.PI / 2 + 1.25);
        shin.add(claw);
      }
      this.rig.add(thigh, shin);
      this.legs.push({ ...walkerLeg(s, new THREE.Vector3(s * 0.26, -0.08, 0), new THREE.Vector3(s * 0.4, 0, 0.04), new THREE.Vector3(s * 0.6, 0.1, 1), s < 0 ? 0 : 1, thigh, shin), curled: new THREE.Vector3(s * 0.26, -0.22, 0.42) });
    }
    // Heavy steps: it has to lean a good way off a foot before it lifts it, and takes its time putting it down.
    this.walker = new Walker(this.root, this.body, this.legs, { thigh: THIGH, shin: SHIN, stride: 0.42, strideStill: 0.22, stepTime: 0.26, lift: 0.16 });

    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.86, 1, 28), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.04;
    this.ring.visible = false;
    this.root.add(this.ring);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.78, 12), lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false })));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
    flatten(REST, this.springs.target);
    this.springs.snap();
    this.apply(0, null);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes it white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  /** The pose for what it is doing (the two swings are worked out from how far through them it is). */
  private poseFor(ctx: StagAnimInput): Pose {
    switch (ctx.state) {
      case 'idle':
        return REST;
      case 'chase':
      case 'return':
      case 'settle':
        return READY;
      case 'windup':
        return SLAM_WIND;
      case 'slam':
        return slamArc(Math.min(1, ctx.stateTime / STAG.slamTime));
      case 'stuck':
        return SLAM_END;
      case 'sweepWind':
        return SWEEP_WIND;
      case 'sweep':
        return sweepArc(Math.min(1, ctx.stateTime / STAG.sweepTime));
      case 'recover':
        return SWEEP_END;
      case 'stompWind':
        return STOMP_WIND;
      case 'stomp':
        return STOMP;
      case 'kneel':
        return KNEEL;
      case 'dead':
        return DEAD;
    }
  }

  update(dt: number, ctx: StagAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    flatten(this.poseFor(ctx), this.springs.target);
    // A swing follows its arc closely; a blow landing stops dead; the rest of it is heavy and slow to move.
    const swinging = state === 'slam' || state === 'sweep';
    const stiffness = swinging ? 90 : state === 'stuck' || state === 'stomp' ? 34 : state === 'windup' || state === 'sweepWind' || state === 'stompWind' ? 11 : state === 'kneel' ? 14 : 9;
    this.springs.step(dt, stiffness, swinging ? 1 : 0.9);

    // A ring runs out over the floor where a blow lands: from the hammer's head after a slam, from under it after a stomp.
    if (state !== this.last) {
      if (state === 'stuck' && this.last === 'slam') this.startWave(1.3, true);
      else if (state === 'stomp') this.startWave(STAG.radius + STAG.stompReach, false);
      this.last = state;
    }
    if (this.wave < 1) {
      this.wave = Math.min(1, this.wave + dt / 0.4);
      const k = 1 - (1 - this.wave) * (1 - this.wave);
      this.ring.scale.setScalar(0.25 + (this.waveSize - 0.25) * k);
      this.ringMat.opacity = 0.9 * (1 - this.wave);
      this.ring.visible = this.wave < 1;
    }

    // Dead: it lies a while on its back, then shrivels away.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 1.5) / 0.6)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;

    this.apply(dt, ctx);

    // The hammer's core: an ember at rest, white-hot before the slam; and a red glint on it then. Red means a shield will not do.
    const heat = Math.min(1, Math.max(0, this.springs.value[I.heat])) * (0.9 + 0.1 * Math.sin(this.time * 17));
    this.coreMat.color.setRGB(0.3 + 0.7 * heat, 0.08 + 0.62 * heat * heat, 0.03 + 0.4 * heat * heat * heat);
    const tell = state === 'windup' ? Math.min(1, ctx.stateTime / STAG.windup) : -1;
    const size = tell >= 0 ? 0.08 + 0.26 * twinkleSize(0.08 + tell * 0.6) : 0;
    this.glints.forEach((g, i) => {
      g.visible = size > 0.01;
      g.scale.setScalar(size * (i ? 0.8 : 1));
      g.rotation.z = this.time * 5 * (i ? -1 : 1);
    });

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.mat.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    (this.matPlain.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }

  private startWave(size: number, atHammer: boolean): void {
    this.wave = 0;
    this.waveSize = size;
    if (atHammer) {
      this.root.updateMatrixWorld(true);
      const at = this.root.worldToLocal(this.headAt.getWorldPosition(new THREE.Vector3()));
      this.ring.position.set(at.x, 0.04, at.z);
    } else this.ring.position.set(0, 0.04, 0);
  }

  private readonly tmp = {
    grip: new THREE.Vector3(), dir: new THREE.Vector3(), s: new THREE.Vector3(), h: new THREE.Vector3(), c: new THREE.Vector3(), pole: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fwd: new THREE.Vector3(0, 0, 1),
  };

  /** Lays the body out from the spring values: body, head, wing cases, then the hammer, then the arms to it, then the feet. */
  private apply(dt: number, ctx: StagAnimInput | null): void {
    const v = this.springs.value;
    const T = this.tmp;
    const state = ctx?.state ?? 'idle';
    const t = this.time;

    // Life laid over the pose: it breathes; walking it rolls from foot to foot; stuck it heaves at the hammer; kneeling it sags and pants.
    let roll = v[I.roll];
    let bob = 0.012 * Math.sin(t * 1.7);
    let tug = 0;
    if (ctx && ctx.walking > 0.1) {
      const down = (i: number): number => (this.legs[i].step < 1 ? Math.sin(this.legs[i].step * Math.PI) : 0);
      roll += 0.07 * (down(0) - down(1));
      bob -= 0.03 * (down(0) + down(1));
    } else if (state === 'stuck') tug = 0.02 * Math.sin(t * 13) * Math.min(1, (ctx?.stateTime ?? 0) * 2);
    else if (state === 'kneel') bob = 0.03 * Math.sin(t * 5.5);
    else if (state === 'windup') tug = 0.008 * Math.sin(t * 41) * Math.min(1, (ctx?.stateTime ?? 0) / STAG.windup);

    this.body.position.set(v[I.hip], v[I.hip + 1] + bob, v[I.hip + 2] - tug);
    this.body.rotation.set(v[I.pitch], v[I.yaw], roll);
    this.head.rotation.set(v[I.head], v[I.head + 1], 0);
    const jaws = Math.min(1, Math.max(0, v[I.jaws])) + (state === 'idle' ? 0.08 * Math.sin(t * 2.3) : 0);
    this.antlers.forEach((a, i) => (a.rotation.z = (i === 0 ? 1 : -1) * (jaws * 0.2 - 0.04)));
    this.feelers.forEach((f, i) => f.rotation.set(1.2 + 0.12 * Math.sin(t * 5.3 + i * 2), 0, (i === 0 ? 1 : -1) * (0.5 + 0.1 * Math.sin(t * 3.9 + i))));
    const open = Math.min(1, Math.max(0, v[I.shell]));
    const buzz = state === 'stompWind' ? 0.05 * Math.sin(t * 60) : 0;
    this.cases.forEach((hinge, i) => {
      const s = i === 0 ? -1 : 1;
      hinge.rotation.set(-open * 0.55, 0, s * (open * 0.75 + buzz));
    });
    this.underGlow.forEach((g) => (g.visible = open > 0.05));
    this.underMat.color.setRGB(1, 0.35 + 0.3 * open, 0.1 + 0.15 * open);

    // The hammer: where the pose puts it.
    T.grip.set(v[I.grip], v[I.grip + 1], v[I.grip + 2] + tug * 2);
    T.dir.set(v[I.dir], v[I.dir + 1], v[I.dir + 2]).normalize();
    // Between a pose over its head and one in front of it, the straight way for its hands is through its own chest
    // and head: they are kept this far from the middle of each, which carries them round (over the top, down the front).
    if (v[I.curl] < 0.5) {
      for (const [at, keep] of [[CHEST_AT, 0.6], [this.head.position, 0.38]] as const) {
        T.c.copy(at).applyQuaternion(this.body.quaternion).add(this.body.position);
        if (T.grip.distanceTo(T.c) >= keep) continue;
        T.h.copy(T.grip).sub(T.c);
        T.h.z += 0.02; // (dead centre: forward)
        T.grip.copy(T.c).addScaledVector(T.h.normalize(), keep);
      }
    }
    // And the floor holds the hammer's head up: it rests on it, it does not sink into it.
    const headY = T.grip.y + T.dir.y * HEAD;
    if (headY < HEAD_HALF) T.grip.y += HEAD_HALF - headY;
    this.hammer.position.copy(T.grip);
    aim(this.hammer, T.dir, Math.abs(T.dir.y) > 0.92 ? T.fwd : T.up);

    // The arms: from each shoulder to its grip on the shaft (or, let go, curled to its chest).
    const curl = Math.min(1, Math.max(0, v[I.curl]));
    this.arms.forEach((arm, i) => {
      T.s.copy(arm.shoulder).applyQuaternion(this.body.quaternion).add(this.body.position);
      T.h.copy(T.grip).addScaledVector(T.dir, i === 0 ? 0 : LEFT_GRIP);
      if (curl > 0) T.h.lerp(T.c.copy(arm.curled).applyQuaternion(this.body.quaternion).add(this.body.position), curl);
      // Elbows out and down.
      T.pole.set(arm.side * 0.9, -0.7, -0.25).applyQuaternion(this.body.quaternion);
      this.reachShort[i] = twoBone(T.s, T.h, T.pole, UPPER, FORE, arm.upper, arm.fore);
    });

    // Its two feet: planted, stepping in turn; dead, drawn up to its belly.
    this.walker.update(dt, 0, curl, (_leg, index, out) => out.copy(this.legs[index].curled));
  }

  /** Where the hammer is, in the world: its butt, its two grips, the middle of its head. And where each hand is. (For tests and effects.) */
  hammerParts(): { butt: THREE.Vector3; grips: THREE.Vector3[]; head: THREE.Vector3; hands: THREE.Vector3[]; dir: THREE.Vector3 } {
    this.root.updateMatrixWorld(true);
    const at = (x: number): THREE.Vector3 => this.hammer.localToWorld(new THREE.Vector3(x, 0, 0));
    const butt = at(BUTT);
    const head = at(HEAD);
    return { butt, grips: [at(0), at(LEFT_GRIP)], head, hands: this.arms.map((a) => a.fore.localToWorld(new THREE.Vector3(FORE, 0, 0))), dir: head.clone().sub(butt).normalize() };
  }
}

/** For tests: sizes of the hammer. */
export const STAG_HAMMER = { butt: BUTT, head: HEAD, headHalf: HEAD_HALF };
