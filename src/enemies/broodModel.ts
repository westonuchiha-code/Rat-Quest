import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { bead, mix, modelKit, paint } from '../render/modelKit';
import { Springs, Walker, ease, twoBone, walkerLeg, type WalkerLeg } from '../render/bugRig';
import { BROOD, type BroodState } from './brood';

/**
 * Broodmother model: a spider the size of a cart. A low dark head-and-chest with eight red eyes and two ivory fangs, a
 * great swollen abdomen behind it marked in bone-white and blood, pale eggs stuck along its flanks, six walking legs
 * arched high over her body, and two longer forelegs that end in ivory spikes: those are what she fights with.
 *
 * How she is posed. HER SPIKES COME FIRST: a pose says where the tip of each foreleg is (over the floor, from her
 * middle), and each foreleg is then laid from its shoulder to its tip. So a stab comes down exactly where the pose
 * says, a tip never goes under the floor, and both are kept out of her own body. The stab's landing place is not in
 * the pose at all: it is where the rules say the stab lands (where he stood), so what is drawn is what hits.
 * The six walking legs plant their feet on the floor and step in threes.
 */
const C = {
  hide: 0x2a1d33, hideDark: 0x17101d, sheen: 0x4a3558, band: 0xb89a5a, bone: 0xddd2b4, blood: 0xb02a3a, egg: 0xe9e3d0,
  ivory: 0xe8dcc0, ivoryTip: 0xc03a3a, eye: 0xff3040, silk: 0xf4f0e6, joint: 0x5a4268,
};
const HIP = 0.95;
/** How far a fang's point is below its hinge. */
const FANG = 0.46;
const THIGH = 1.25;
const SHIN = 1.55;
/** A foreleg: from its shoulder to its elbow, and from there to the tip of its spike. */
const UPPER = 1.5;
const SPIKE = 1.85;
/** The middle of her head-and-chest and of her abdomen, in her body's own space, and how far a spike's tip is kept from each. */
const CHEST_AT = new THREE.Vector3(0, 0, 0.3);
const CHEST_KEEP = 0.95;
const BELLY_AT = new THREE.Vector3(0, 0.42, -1.25);
const BELLY_KEEP = 1.2;
/** Her abdomen: where it hinges on her body, its middle from there, and its half-sizes. Her thread leaves from its tip. */
const ABDOMEN_AT = new THREE.Vector3(0, 0.08, -0.5);
const ABDOMEN_MID = new THREE.Vector3(0, 0.34, -0.75);
const ABDOMEN_HALF = new THREE.Vector3(0.86, 0.78, 1.08);
const SPINNERET = new THREE.Vector3(0, 0.42, -1.8);

type V3 = [number, number, number];
interface Pose {
  /** Her body over her feet: [sideways, height, forward]. */
  hip: V3;
  /** The whole body: nose down is positive, turned, tipped sideways. */
  pitch: number;
  yaw: number;
  roll: number;
  /** Her abdomen lifted (positive) or sagging. Fangs: 0 shut .. 1 wide. */
  abdomen: number;
  fangs: number;
  /** The tips of her forelegs, her right then her left: over the floor, from her middle. */
  tipR: V3;
  tipL: V3;
  /** 0: feet on the floor. 1: her walking legs drawn in under her. */
  tuck: number;
  /** How brightly her eyes burn, 0..1. */
  glow: number;
}
const I = { hip: 0, pitch: 3, yaw: 4, roll: 5, abdomen: 6, fangs: 7, tipR: 8, tipL: 11, tuck: 14, glow: 15 };
const SIZE = 16;
function flatten(p: Pose, out: Float32Array): void {
  out.set(p.hip, I.hip);
  out[I.pitch] = p.pitch;
  out[I.yaw] = p.yaw;
  out[I.roll] = p.roll;
  out[I.abdomen] = p.abdomen;
  out[I.fangs] = p.fangs;
  out.set(p.tipR, I.tipR);
  out.set(p.tipL, I.tipL);
  out[I.tuck] = p.tuck;
  out[I.glow] = p.glow;
}
const mirror = (v: V3): V3 => [-v[0], v[1], v[2]];
/** A pose with her two forelegs swapped over (for the stab with her other leg). */
const flip = (p: Pose): Pose => ({ ...p, hip: mirror(p.hip), yaw: -p.yaw, roll: -p.roll, tipR: mirror(p.tipL), tipL: mirror(p.tipR) });

// Every one of these is measured (tests/models.ts): tips above the floor and clear of her own head and abdomen, each
// foreleg long enough to reach its tip, feet on the floor, nothing under it.
/** Lurking: low, forelegs resting on the floor in front of her. */
const REST: Pose = { hip: [0, HIP - 0.18, 0], pitch: 0.04, yaw: 0, roll: 0, abdomen: -0.05, fangs: 0.1, tipR: [-1.0, 0.03, 2.2], tipL: [1.0, 0.03, 2.2], tuck: 0, glow: 0.35 };
/** Awake: up on her legs, forelegs raised and spread, the threat a spider makes. */
const READY: Pose = { hip: [0, HIP, 0], pitch: -0.1, yaw: 0, roll: 0, abdomen: 0.12, fangs: 0.35, tipR: [-1.35, 1.9, 2.0], tipL: [1.35, 1.9, 2.0], tuck: 0, glow: 0.6 };
/** The scream: reared right back, forelegs flung up and wide, fangs open. */
const ROAR: Pose = { hip: [0, HIP + 0.2, -0.25], pitch: -0.5, yaw: 0, roll: 0, abdomen: -0.2, fangs: 1, tipR: [-2.0, 3.3, 1.2], tipL: [2.0, 3.3, 1.2], tuck: 0, glow: 1 };
/** A stab wound up (her right leg): that leg high over her, the other planted, her body turned to throw it. */
const STAB_WIND: Pose = { hip: [0.08, HIP + 0.12, -0.2], pitch: -0.3, yaw: -0.14, roll: -0.08, abdomen: 0.05, fangs: 0.7, tipR: [-1.0, 3.7, 1.0], tipL: [1.3, 0.05, 1.9], tuck: 0, glow: 1 };
/** The stab landed: that spike in the floor (the model moves it to where the blow fell), her weight thrown after it. */
const STAB_END: Pose = { hip: [-0.05, HIP - 0.22, 0.4], pitch: 0.24, yaw: 0.1, roll: 0.06, abdomen: 0.04, fangs: 0.5, tipR: [-0.2, 0.03, 3.3], tipL: [1.3, 0.05, 1.9], tuck: 0, glow: 0.8 };
/** Both spikes in the floor after the last stab: open. */
const STAB_STUCK: Pose = { hip: [0, HIP - 0.3, 0.42], pitch: 0.26, yaw: 0, roll: 0, abdomen: 0.05, fangs: 0.2, tipR: [-0.35, 0.03, 3.2], tipL: [0.45, 0.03, 3.0], tuck: 0, glow: 0.3 };
/** The scissor wound up: both forelegs out wide and low. */
const SWEEP_WIND: Pose = { hip: [0, HIP - 0.3, -0.15], pitch: 0.1, yaw: 0, roll: 0, abdomen: 0.12, fangs: 0.8, tipR: [-3.0, 0.3, 0.9], tipL: [3.0, 0.3, 0.9], tuck: 0, glow: 1 };
/** The scissor shut: crossed in front of her, low. */
const SWEEP_END: Pose = { hip: [0, HIP - 0.3, 0.25], pitch: 0.16, yaw: 0, roll: 0, abdomen: 0.05, fangs: 0.4, tipR: [0.7, 0.2, 2.9], tipL: [-0.7, 0.34, 2.9], tuck: 0, glow: 0.6 };
/** Sinking to spring: belly to the floor, forelegs drawn in, abdomen up. */
const CROUCH: Pose = { hip: [0, HIP - 0.42, -0.3], pitch: 0.06, yaw: 0, roll: 0, abdomen: 0.32, fangs: 0.15, tipR: [-1.1, 0.5, 1.7], tipL: [1.1, 0.5, 1.7], tuck: 0, glow: 1 };
/** In the air: legs drawn in, forelegs reaching forward and up. */
const LEAP: Pose = { hip: [0, HIP, 0], pitch: -0.2, yaw: 0, roll: 0, abdomen: -0.15, fangs: 1, tipR: [-1.5, 1.6, 2.6], tipL: [1.5, 1.6, 2.6], tuck: 1, glow: 1 };
/** Landed in a heap: flat on her belly, forelegs splayed on the floor. Open. */
const HEAP: Pose = { hip: [0, HIP - 0.46, 0.1], pitch: 0.1, yaw: 0, roll: 0.05, abdomen: -0.12, fangs: 0.15, tipR: [-2.3, 0.03, 2.1], tipL: [2.1, 0.03, 2.4], tuck: 0, glow: 0.25 };
/** The whirl wound up: low, forelegs out to both sides. */
const WHIRL_WIND: Pose = { hip: [0, HIP - 0.34, 0], pitch: 0.04, yaw: 0.5, roll: 0.1, abdomen: 0.3, fangs: 0.8, tipR: [-3.0, 0.5, 0.5], tipL: [2.6, 0.9, 1.4], tuck: 0, glow: 1 };
/** The whirl itself: forelegs straight out low, and round she goes. */
const WHIRL: Pose = { hip: [0, HIP - 0.3, 0], pitch: 0.04, yaw: 0, roll: -0.12, abdomen: 0.2, fangs: 0.6, tipR: [-3.15, 0.25, 0.7], tipL: [3.15, 0.25, 0.7], tuck: 0, glow: 1 };
/** On the thread: head down, legs drawn in, forelegs hanging open below her. */
const HANG: Pose = { hip: [0, HIP, 0], pitch: 1.15, yaw: 0, roll: 0, abdomen: 0.1, fangs: 0.9, tipR: [-1.5, -0.9, 1.5], tipL: [1.5, -0.9, 1.5], tuck: 1, glow: 1 };
/** Falling: flat again, everything spread to land on him. */
const DROP: Pose = { hip: [0, HIP, 0], pitch: 0.1, yaw: 0, roll: 0, abdomen: 0, fangs: 1, tipR: [-2.4, 0.8, 2.0], tipL: [2.4, 0.8, 2.0], tuck: 0.35, glow: 1 };
/** Her legs gone from under her: belly down, forelegs limp, head bowed. Open for a long while. */
const KNEEL: Pose = { hip: [0.06, HIP - 0.5, 0], pitch: 0.2, yaw: 0, roll: -0.1, abdomen: -0.2, fangs: 0, tipR: [-1.9, 0.03, 1.5], tipL: [1.5, 0.03, 2.0], tuck: 0, glow: 0.15 };
/** Dead: belly down, every leg curled in, as a dead spider's do. */
const DEAD: Pose = { hip: [0, HIP - 0.52, 0], pitch: 0.06, yaw: 0, roll: 0.12, abdomen: -0.3, fangs: 0, tipR: [-0.55, 0.3, 1.25], tipL: [0.6, 0.22, 1.2], tuck: 1, glow: 0 };

const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const smooth = (u: number): number => u * u * (3 - 2 * u);
/** The scissor as an arc: both tips run round over the floor from wide to crossed, at arm's length the whole way. */
function sweepArc(u: number): Pose {
  const k = smooth(u);
  const side = (from: V3, to: V3): V3 => {
    const a0 = Math.atan2(from[0], from[2]);
    const a1 = Math.atan2(to[0], to[2]);
    const r = Math.hypot(from[0], from[2]) + (Math.hypot(to[0], to[2]) - Math.hypot(from[0], from[2])) * k;
    const a = a0 + (a1 - a0) * k;
    return [Math.sin(a) * r, from[1] + (to[1] - from[1]) * k, Math.cos(a) * r];
  };
  return { ...SWEEP_END, hip: lerp3(SWEEP_WIND.hip, SWEEP_END.hip, k), pitch: SWEEP_WIND.pitch + (SWEEP_END.pitch - SWEEP_WIND.pitch) * k, tipR: side(SWEEP_WIND.tipR, SWEEP_END.tipR), tipL: side(SWEEP_WIND.tipL, SWEEP_END.tipL), glow: 1 };
}

export interface BroodAnimInput {
  state: BroodState;
  stateTime: number;
  walking: number;
  /** Which foreleg stabs: 0 her right, 1 her left. */
  arm: 0 | 1;
  /** How long the wind-up she is in lasts. */
  windTime: number;
  /** How far from her middle the stab lands. */
  stabAt: number;
  /** How far off the floor she is. */
  air: number;
  raging: boolean;
}

interface Foreleg {
  side: -1 | 1;
  shoulder: THREE.Vector3; // in the body's space
  upper: THREE.Group;
  spike: THREE.Group;
}

export class BroodModel {
  readonly root = new THREE.Group();
  private readonly rig = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly abdomen = new THREE.Group();
  private readonly fangs: THREE.Group[] = [];
  private readonly palps: THREE.Group[] = [];
  private readonly forelegs: Foreleg[] = [];
  /** Each walking leg, with where its foot goes off the floor: `spread` in the air (out and down, as a falling spider's), `curled` in tight when she is dead. In her body's space. */
  private readonly legs: Array<WalkerLeg & { curled: THREE.Vector3; spread: THREE.Vector3 }> = [];
  private readonly walker: Walker;
  // (Each has a picture of its SURFACE, in greys, laid over the colours painted on it: the texture pass, 2026-11-16.)
  private readonly mat = createPs1Material({ lit: true, shine: 0.45, tex: getTexture('chitin') });
  private readonly matPlain = createPs1Material({ lit: true, tex: getTexture('shortFur') });
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });
  private readonly thread: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly ringMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), 2);
  private readonly wave: THREE.Mesh;
  private readonly waveMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0xe8dcc0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), 1);
  private readonly shadow: THREE.Mesh;
  private readonly shadowMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
  private readonly chestProbes: THREE.Vector3[] = [];
  private readonly bellyProbes: THREE.Vector3[] = [];
  private readonly springs = new Springs(SIZE);
  private time = 0;
  private flashAmount = 0;
  private scale = 1;
  private waveT = 1;
  private waveSize = 1;
  private last: BroodState = 'idle';
  /** How far short of its tip each foreleg falls (0 when it reaches). For tests. */
  readonly reachShort = [0, 0];

  constructor() {
    const { blob, cone } = modelKit(this.mat);
    const plain = modelKit(this.matPlain);
    /** A tapered limb running from the origin along +X, cut into rings so it can be banded along its length (-1 at the joint .. 1 at the tip). */
    const limb = (r0: number, r1: number, length: number, color: (along: number) => number, sides = 5, rings = 8, mat: THREE.Material = this.mat): THREE.Mesh => {
      const geo = new THREE.CylinderGeometry(r1, r0, length, sides, rings);
      geo.translate(0, length / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      return new THREE.Mesh(paint(geo, (nx) => color(nx)), mat);
    };
    this.root.add(this.rig);
    this.rig.add(this.body);
    this.body.rotation.order = 'YXZ';

    // Head and chest: one low shield, a ridge down the middle of it, darker underneath.
    this.body.add(blob(0.62, 0.4, 0.74, (nx, ny) => (ny < -0.3 ? C.hideDark : Math.abs(nx) < 0.14 && ny > 0.5 ? C.sheen : C.hide), 0, 0, 0.3, 10, 7, 0.28));
    // The waist between chest and abdomen.
    this.body.add(plain.blob(0.3, 0.26, 0.3, C.hideDark, 0, 0.02, -0.42, 6, 5, 0.2));
    // Eight eyes: two big ones in front, two beside them, four small above.
    for (const [x, y, z, r] of [[0.14, 0.2, 0.94, 0.07], [0.34, 0.22, 0.82, 0.05], [0.11, 0.32, 0.8, 0.035], [0.28, 0.33, 0.68, 0.03]] as const) {
      for (const s of [-1, 1]) this.body.add(bead(r, this.eyeMat, s * x, y, z, 6, 5));
    }
    // Fangs: a thick base each, and an ivory hook that swings out when they open.
    for (const s of [-1, 1] as const) {
      const hinge = new THREE.Group();
      hinge.position.set(s * 0.16, -0.1, 0.9);
      hinge.add(plain.blob(0.11, 0.15, 0.13, C.hideDark, 0, -0.05, 0.02, 6, 5, 0.2));
      const hook = cone(0.055, FANG - 0.16, (_x, ny) => (ny > 0.55 ? C.ivoryTip : C.ivory), 5);
      hook.position.set(0, -0.16, 0.04);
      hook.rotation.set(Math.PI, 0, s * 0.25);
      hinge.add(hook);
      this.body.add(hinge);
      this.fangs.push(hinge);
      // A feeler beside each fang.
      const palp = new THREE.Group();
      palp.position.set(s * 0.36, -0.1, 0.84);
      palp.add(limb(0.05, 0.035, 0.34, (a) => (a > 0.3 ? C.band : C.hide), 5, 3, this.matPlain));
      this.body.add(palp);
      this.palps.push(palp);
    }

    // The abdomen: swollen, a bone-white mark like an hourglass down its back with blood in the middle of it, a row
    // of pale spots along each flank, and her eggs stuck along its sides.
    this.abdomen.position.copy(ABDOMEN_AT);
    const mark = (nx: number, ny: number, nz: number): number => {
      if (ny < -0.35) return C.hideDark;
      if (ny > 0.25) {
        const w = 0.1 + 0.3 * Math.abs(nz + 0.05);
        if (Math.abs(nx) < w && Math.abs(nz) < 0.72) return Math.abs(nz + 0.05) < 0.16 ? C.blood : C.bone;
      }
      if (ny > -0.1 && ny < 0.3 && Math.abs(nx) > 0.72 && Math.floor((nz + 1) * 3.5) % 2 === 0) return C.band;
      return mix(C.hide, C.hideDark, Math.max(0, -ny));
    };
    this.abdomen.add(blob(ABDOMEN_HALF.x, ABDOMEN_HALF.y, ABDOMEN_HALF.z, mark, ABDOMEN_MID.x, ABDOMEN_MID.y, ABDOMEN_MID.z, 11, 8, 0.3));
    for (const s of [-1, 1]) {
      for (const [y, z, r] of [[0.0, -0.3, 0.13], [-0.14, -0.75, 0.15], [0.02, -1.2, 0.12], [-0.2, -1.5, 0.11]] as const) {
        this.abdomen.add(plain.blob(r, r, r, C.egg, s * (0.78 - Math.abs(z + 0.75) * 0.28), ABDOMEN_MID.y + y, z, 5, 4, 0.15));
      }
    }
    // Spinnerets at the tip.
    for (const s of [-1, 1]) {
      const sp = cone(0.07, 0.24, C.joint, 4);
      sp.position.set(s * 0.1, ABDOMEN_MID.y - 0.08, -1.78);
      sp.rotation.x = -Math.PI * 0.6;
      this.abdomen.add(sp);
    }
    // A row of bristles down her back, and a horn over each of the big eyes.
    for (let k = 0; k < 5; k++) {
      const z = -0.15 - k * 0.36;
      const br = cone(0.05, 0.2 - Math.abs(k - 2) * 0.03, C.sheen, 4);
      br.position.set(0, ABDOMEN_MID.y + ABDOMEN_HALF.y * Math.sqrt(Math.max(0.05, 1 - ((z - ABDOMEN_MID.z) / ABDOMEN_HALF.z) ** 2)) - 0.04, z);
      br.rotation.x = -0.5;
      this.abdomen.add(br);
    }
    for (const s of [-1, 1]) {
      const horn = cone(0.05, 0.2, (_x, ny) => (ny > 0.4 ? C.band : C.hide), 4);
      horn.position.set(s * 0.2, 0.34, 0.66);
      horn.rotation.set(0.5, 0, -s * 0.35);
      this.body.add(horn);
    }
    this.body.add(this.abdomen);

    // What of her could touch the floor: every point of her head and chest, and of her abdomen (in their own spaces).
    this.body.updateMatrixWorld(true);
    const inBody = this.body.matrixWorld.clone().invert();
    const inAbdomen = this.abdomen.matrixWorld.clone().invert();
    this.body.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      let belly = false;
      for (let q: THREE.Object3D | null = o; q; q = q.parent) {
        if (q === this.abdomen) belly = true;
        if (this.fangs.includes(q as THREE.Group) || this.palps.includes(q as THREE.Group)) return; // (fangs and feelers move: their points are followed as they are)
      }
      const pos = mesh.geometry.attributes.position;
      const m = new THREE.Matrix4().multiplyMatrices(belly ? inAbdomen : inBody, mesh.matrixWorld);
      for (let i = 0; i < pos.count; i++) (belly ? this.bellyProbes : this.chestProbes).push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m));
    });

    // Six walking legs: a thick upper part banded pale, a knee, and a long thin shin down to a claw.
    const places: Array<[number, number, number, number]> = [
      // [where it joins along her, where its foot rests: out, along], and which three it steps with
      [0.42, 1.8, 1.15, 0], [0.16, 2.1, 0.0, 1], [-0.1, 1.7, -1.05, 0],
    ];
    for (const s of [-1, 1] as const) {
      places.forEach(([jz, out, along, group], k) => {
        const thigh = new THREE.Group();
        const shin = new THREE.Group();
        thigh.add(limb(0.1, 0.07, THIGH, (a) => (a > 0.05 && a < 0.5 ? C.band : a > 0.8 ? C.hideDark : C.hide), 5, 8));
        shin.add(plain.blob(0.1, 0.1, 0.1, C.joint, 0, 0, 0, 5, 4, 0.15));
        const spur = cone(0.04, 0.2, C.band, 4);
        spur.position.set(0, 0.07, 0);
        shin.add(spur);
        shin.add(limb(0.065, 0.02, SHIN, (a) => (a > -0.55 && a < -0.2 ? C.band : a > 0.72 ? C.ivory : C.hideDark), 5, 10));
        this.rig.add(thigh, shin);
        const pair = ((s < 0 ? group : 1 - group) as 0 | 1);
        this.legs.push({
          ...walkerLeg(s, new THREE.Vector3(s * 0.5, -0.05, jz + 0.3), new THREE.Vector3(s * out, 0, along), new THREE.Vector3(s * 0.45, 1, (k - 1) * -0.12), pair, thigh, shin),
          curled: new THREE.Vector3(s * 0.62, -0.3, jz + 0.3 + (k - 1) * -0.22),
          spread: new THREE.Vector3(s * out * 0.82, -0.72, along * 0.8 - 0.3),
        });
      });
    }
    this.walker = new Walker(this.root, this.body, this.legs, { thigh: THIGH, shin: SHIN, stride: 0.55, strideStill: 0.32, stepTime: 0.12, lift: 0.36 });

    // The forelegs: thicker, longer, and the last stretch of each is an ivory spike with a red point.
    for (const s of [-1, 1] as const) {
      const upper = new THREE.Group();
      const spike = new THREE.Group();
      upper.add(limb(0.125, 0.09, UPPER, (a) => (a > -0.15 && a < 0.3 ? C.band : a > 0.75 ? C.hideDark : C.hide), 6, 8));
      spike.add(plain.blob(0.125, 0.125, 0.125, C.joint, 0, 0, 0, 6, 5, 0.15));
      const barb = cone(0.05, 0.26, (_x, ny) => (ny > 0.5 ? C.ivoryTip : C.ivory), 4);
      barb.position.set(0, 0.09, 0);
      spike.add(barb);
      spike.add(limb(0.095, 0.012, SPIKE, (a) => (a > 0.8 ? C.ivoryTip : a > -0.25 ? C.ivory : a > -0.45 ? C.band : C.hide), 6, 12));
      this.rig.add(upper, spike);
      this.forelegs.push({ side: s, shoulder: new THREE.Vector3(s * 0.4, 0.06, 0.82), upper, spike });
    }

    // Her thread, seen when she is on it.
    const line = new THREE.CylinderGeometry(0.02, 0.02, 1, 4, 1);
    line.translate(0, 0.5, 0);
    this.thread = new THREE.Mesh(line, new THREE.MeshBasicMaterial({ color: C.silk }));
    this.thread.visible = false;
    this.root.add(this.thread);

    // On the floor: her shadow; the ring that shows where she will come down; the ring that runs out where she lands.
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 16), this.shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 36), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.035;
    this.ring.visible = false;
    this.root.add(this.ring);
    this.wave = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 36), this.waveMat);
    this.wave.rotation.x = -Math.PI / 2;
    this.wave.position.y = 0.05;
    this.wave.visible = false;
    this.root.add(this.wave);

    flatten(REST, this.springs.target);
    this.springs.snap();
    this.apply(0, null);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  /** The pose for what she is doing. */
  private poseFor(ctx: BroodAnimInput): Pose {
    const left = ctx.arm === 1;
    const sided = (p: Pose): Pose => (left ? flip(p) : p);
    switch (ctx.state) {
      case 'idle':
        return REST;
      case 'roar':
        return ROAR;
      case 'chase':
      case 'settle':
      case 'recover':
        return ctx.state === 'recover' ? SWEEP_END : READY;
      case 'stabWind':
        return sided(STAB_WIND);
      case 'stab':
      case 'stabStuck': {
        const p = ctx.state === 'stab' ? sided(STAB_END) : STAB_STUCK;
        // The spike comes down where the blow lands.
        const at = Math.max(1.9, ctx.stabAt);
        if (ctx.state === 'stab') return left ? { ...p, tipL: [p.tipL[0], p.tipL[1], at] } : { ...p, tipR: [p.tipR[0], p.tipR[1], at] };
        return left ? { ...p, tipL: [p.tipL[0], p.tipL[1], at], tipR: [p.tipR[0], p.tipR[1], Math.max(1.9, at - 0.25)] } : { ...p, tipR: [p.tipR[0], p.tipR[1], at], tipL: [p.tipL[0], p.tipL[1], Math.max(1.9, at - 0.25)] };
      }
      case 'sweepWind':
        return SWEEP_WIND;
      case 'sweep':
        return sweepArc(Math.min(1, ctx.stateTime / BROOD.sweepTime));
      case 'crouch':
        return CROUCH;
      case 'leap':
        return LEAP;
      case 'slam':
      case 'stuck':
        return HEAP;
      case 'whirlWind':
        return WHIRL_WIND;
      case 'whirl':
        return WHIRL;
      case 'climb':
      case 'hang':
      case 'dropTell':
        return HANG;
      case 'drop':
        return DROP;
      case 'kneel':
        return KNEEL;
      case 'dead':
        return DEAD;
    }
  }

  update(dt: number, ctx: BroodAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    flatten(this.poseFor(ctx), this.springs.target);
    // A blow follows its path closely and stops dead where it lands; a wind-up gathers; the rest is quick, for her size.
    const striking = state === 'stab' || state === 'sweep' || state === 'slam' || state === 'whirl' || state === 'drop';
    const stiffness = striking ? 70 : state === 'stabWind' ? (ctx.windTime < 0.5 ? 17 : 12) : state === 'sweepWind' || state === 'crouch' || state === 'whirlWind' ? 10 : state === 'stabStuck' || state === 'stuck' ? 30 : state === 'kneel' || state === 'dead' ? 9 : state === 'roar' ? 9 : 12;
    this.springs.step(dt, stiffness, striking ? 1 : 0.85);

    // Where she lands, a pale ring runs out over the floor: the edge of it is the edge of the blow.
    if (state !== this.last) {
      if (state === 'slam') this.startWave(BROOD.radius + BROOD.slamReach);
      else if (state === 'whirl') this.startWave(BROOD.radius + BROOD.whirlReach);
      this.last = state;
    }
    if (this.waveT < 1) {
      this.waveT = Math.min(1, this.waveT + dt / 0.42);
      const k = 1 - (1 - this.waveT) * (1 - this.waveT);
      this.wave.scale.setScalar(0.4 + (this.waveSize - 0.4) * k);
      this.waveMat.opacity = 0.85 * (1 - this.waveT);
    }
    this.wave.visible = this.waveT < 1;

    // Dead: she lies curled a while, then shrivels away.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 2.2) / 0.7)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale));

    this.apply(dt, ctx);

    // Her eyes: embers when she lurks, burning when she strikes, and they pulse once she is angry.
    const glow = Math.min(1, Math.max(0, this.springs.value[I.glow])) * (ctx.raging ? 0.85 + 0.15 * Math.sin(this.time * 11) : 0.8);
    this.eyeMat.color.setRGB(0.25 + 0.75 * glow, 0.03 + (ctx.raging ? 0.3 : 0.16) * glow, 0.05 + 0.12 * glow);

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.mat.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    (this.matPlain.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }

  private startWave(size: number): void {
    this.waveT = 0;
    this.waveSize = size;
  }

  private readonly tmp = { s: new THREE.Vector3(), tip: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), pole: new THREE.Vector3(), q: new THREE.Quaternion() };

  /** Lays her out from the spring values: body, abdomen, fangs, then each foreleg from its shoulder to its tip, then her feet. */
  private apply(dt: number, ctx: BroodAnimInput | null): void {
    const v = this.springs.value;
    const T = this.tmp;
    const state = ctx?.state ?? 'idle';
    const t = this.time;
    const air = ctx?.air ?? 0;

    // Life laid over the pose: she breathes; walking she rocks as her legs go; winding up she trembles; down, she heaves.
    let bob = 0.02 * Math.sin(t * 1.9);
    let roll = v[I.roll];
    let shake = 0;
    if (ctx && ctx.walking > 0.1) {
      bob = 0.035 * Math.sin(t * 15);
      roll += 0.035 * Math.sin(t * 7.5);
    } else if (state === 'stabWind' || state === 'sweepWind' || state === 'crouch' || state === 'whirlWind' || state === 'dropTell') shake = 0.012 * Math.sin(t * 47);
    else if (state === 'kneel' || state === 'stuck' || state === 'stabStuck') bob = 0.03 * Math.sin(t * 6);
    else if (state === 'hang') roll += 0.06 * Math.sin(t * 2.2);

    this.rig.position.y = air;
    this.body.position.set(v[I.hip] + shake, v[I.hip + 1] + bob, v[I.hip + 2]);
    this.body.rotation.set(v[I.pitch], v[I.yaw], roll);
    const open = Math.min(1, Math.max(0, v[I.fangs])) + (state === 'idle' ? 0.06 * Math.sin(t * 3.1) : 0);
    // Shut, her fangs are folded back under her; open, they swing down and out.
    this.fangs.forEach((h, i) => h.rotation.set(1.0 - open * 1.3, 0, (i === 0 ? -1 : 1) * open * 0.5));
    // Her feelers reach forward and down, and never stop moving.
    this.palps.forEach((p, i) => p.rotation.set(0, -Math.PI / 2 + (i === 0 ? 0.3 : -0.3), -0.55 + 0.25 * Math.sin(t * 6.3 + i * 2.1)));
    // The floor holds her up: however low a pose would put her, no point of her head, chest or fangs goes into it.
    if (air < 0.3) {
      let low = 9;
      for (const p of this.chestProbes) low = Math.min(low, T.c.copy(p).applyQuaternion(this.body.quaternion).y);
      for (const h of this.fangs) low = Math.min(low, T.c.set(0, -FANG, 0.04).applyQuaternion(h.quaternion).add(h.position).applyQuaternion(this.body.quaternion).y);
      for (const h of this.palps) low = Math.min(low, T.c.set(0.36, -0.04, 0).applyQuaternion(h.quaternion).add(h.position).applyQuaternion(this.body.quaternion).y);
      if (this.body.position.y + low < 0.03) this.body.position.y = 0.03 - low;
    }
    // Her abdomen lifts and sags as the pose says, but the floor holds it up: it is lifted until it clears it.
    let lift = v[I.abdomen] + 0.03 * Math.sin(t * 1.9 + 1);
    if (air < 0.3) for (let k = 0; k < 40 && this.abdomenLow(lift) < 0.03; k++) lift += 0.03;
    this.abdomen.rotation.x = lift;

    // The forelegs. Each tip is where the pose puts it, but: never under the floor, and never inside her own body
    // (between a leg held high and one in the floor the straight way can cut her head: it is carried round instead).
    const hanging = air > 0.5 || v[I.tuck] > 0.6;
    this.forelegs.forEach((leg, i) => {
      const k = i === 0 ? I.tipR : I.tipL;
      T.tip.set(v[k], v[k + 1], v[k + 2]);
      if (!hanging) T.tip.y = Math.max(0.03, T.tip.y);
      else T.tip.y = Math.max(0.03 - air, T.tip.y);
      for (const [at, keep] of [[CHEST_AT, CHEST_KEEP], [BELLY_AT, BELLY_KEEP]] as const) {
        T.c.copy(at).applyQuaternion(this.body.quaternion).add(this.body.position);
        if (T.tip.distanceTo(T.c) >= keep) continue;
        T.d.copy(T.tip).sub(T.c);
        T.d.z += 0.02;
        T.d.x += leg.side * 0.02;
        T.tip.copy(T.c).addScaledVector(T.d.normalize(), keep);
        if (!hanging) T.tip.y = Math.max(0.03, T.tip.y);
      }
      T.s.copy(leg.shoulder).applyQuaternion(this.body.quaternion).add(this.body.position);
      // Elbows up and out, as a spider's are.
      T.pole.set(leg.side * 0.7, 1, -0.15).applyQuaternion(this.body.quaternion);
      if (hanging) T.pole.set(leg.side * 0.9, 0.2, -0.6).applyQuaternion(this.body.quaternion);
      this.reachShort[i] = twoBone(T.s, T.tip, T.pole, UPPER, SPIKE, leg.upper, leg.spike);
    });

    // Her six feet: planted, stepping in threes; in the air or dead, drawn in under her.
    const tuck = Math.min(1, Math.max(0, v[I.tuck]));
    this.walker.update(dt, air, tuck, (_leg, index, out) => out.copy(state === 'dead' ? this.legs[index].curled : this.legs[index].spread));

    // The thread: from the tip of her abdomen straight up to the roof.
    const aloft = state === 'climb' || state === 'hang' || state === 'dropTell';
    this.thread.visible = aloft && air > 0.2;
    if (this.thread.visible) {
      this.abdomen.updateWorldMatrix(true, false);
      T.c.copy(SPINNERET).applyMatrix4(this.abdomen.matrixWorld);
      this.root.worldToLocal(T.c);
      this.thread.position.copy(T.c);
      this.thread.scale.set(1, Math.max(0.1, 24 - T.c.y), 1);
    }

    // Her shadow: under her; smaller and fainter the higher she is. And while she hangs, the ring where she will land:
    // faint as she follows him, bright and beating once she has stopped and the thread has twanged.
    const high = Math.min(1, air / BROOD.hangHeight);
    this.shadow.scale.setScalar(1 - 0.35 * high);
    this.shadowMat.opacity = this.scale > 0.05 ? 0.42 - 0.12 * high : 0;
    const marked = state === 'hang' || state === 'dropTell' || state === 'drop';
    this.ring.visible = marked;
    if (marked) {
      this.ring.scale.setScalar(BROOD.radius + BROOD.slamReach);
      this.ringMat.opacity = state === 'hang' ? 0.3 : 0.65 + 0.35 * Math.sin(t * 30);
    }
  }

  /** How high the lowest point of her abdomen (eggs, bristles and all) would be over the floor, lifted by `lift`, with her body as it is now. */
  private abdomenLow(lift: number): number {
    const T = this.tmp;
    T.q.setFromAxisAngle(T.d.set(1, 0, 0), lift);
    let low = 9;
    for (const p of this.bellyProbes) low = Math.min(low, T.c.copy(p).applyQuaternion(T.q).add(ABDOMEN_AT).applyQuaternion(this.body.quaternion).y);
    return this.body.position.y + low;
  }

  /** Where the parts of her are, in the world. (For tests and effects.) */
  parts(): { tips: THREE.Vector3[]; elbows: THREE.Vector3[]; shoulders: THREE.Vector3[]; feet: THREE.Vector3[]; knees: THREE.Vector3[]; chest: THREE.Vector3; belly: THREE.Vector3; spinneret: THREE.Vector3 } {
    this.root.updateMatrixWorld(true);
    return {
      tips: this.forelegs.map((l) => l.spike.localToWorld(new THREE.Vector3(SPIKE, 0, 0))),
      elbows: this.forelegs.map((l) => l.spike.getWorldPosition(new THREE.Vector3())),
      shoulders: this.forelegs.map((l) => this.body.localToWorld(l.shoulder.clone())),
      feet: this.walker.feet(),
      knees: this.legs.map((l) => l.shin.getWorldPosition(new THREE.Vector3())),
      chest: this.body.localToWorld(CHEST_AT.clone()),
      belly: this.body.localToWorld(BELLY_AT.clone()),
      spinneret: this.abdomen.localToWorld(SPINNERET.clone()),
    };
  }
}

