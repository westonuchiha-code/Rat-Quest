import * as THREE from 'three';
import type { Gesture } from '../story/scene';
import { createPs1Material } from '../render/ps1Material';
import type { PlayerState, DodgeKind } from './controller';
import {
  ATTACK_CLIPS, BACKSTEP, DEAD, GUARD, HURT, LAND, PLUNGE_DIVE, PLUNGE_LAND, PLUNGE_WIND, POSE_KEYS, ROLL_TUCK, STANCE,
  Pose, airPose, blendPose, fullPose, idlePose, locomotionPose, unarmedArms, samplePose, smoothstep, swimPose,
} from './animations';
import { TUNING } from '../data/tuning';

/**
 * The rat knight: a rounded low-poly model in the PS1 / Dreamcast spirit, built from lathed and tapered
 * shapes with smooth vertex shading, so nothing reads as a box.
 * Local space: he faces +Z, stands about 1.1 units tall (plus ears), feet on y = 0.
 * Sword in the right hand (-X side, "S"), shield on the left arm (+X side, "H").
 *
 * Motion: every frame the current state gives a target pose, and each joint follows its target on a spring,
 * so movements overlap and settle instead of snapping. Legs are solved from foot positions.
 */

export interface ScarfColors {
  cloth: number;
  trim: number;
}

export interface HelmetColors {
  dome: number;
  rim: number;
  spike: number;
}
const HELMET_DEFAULT: HelmetColors = { dome: 0xa9b3bc, rim: 0x77818b, spike: 0xd4aa3c };

const C = {
  fur: 0x9a8166,
  furDark: 0x7b6650,
  cream: 0xdccaa6,
  pink: 0xd8908a,
  pinkDark: 0xb86f6c,
  tunic: 0x3f7d3c,
  tunicDark: 0x2c5a2d,
  leather: 0x6e4b2c,
  scarf: 0xb8352c,
  metal: 0xa9b3bc,
  metalDark: 0x77818b,
  blade: 0xe2e9ee,
  gold: 0xd4aa3c,
  wood: 0x6f4d2f,
  shieldRed: 0xa5302a,
  eye: 0x101010,
  white: 0xffffff,
};

const material = createPs1Material({ lit: true });
const materialTwoSided = createPs1Material({ lit: true, side: THREE.DoubleSide });

type ColorFn = (x: number, y: number, z: number) => number;

/** Gives every vertex a flat color, or one picked by position. Lighting is done in the shader. */
function paint(geo: THREE.BufferGeometry, color: number | ColorFn): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.set(typeof color === 'number' ? color : color(pos.getX(i), pos.getY(i), pos.getZ(i)));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * Repaints a part in new colours: every vertex that was `from` (in the model's own first colours, kept on the geometry
 * the first time) becomes `to`. Geometry shared with a clone (the sword and shield stowed on his back) changes too.
 */
function remap(root: THREE.Object3D, pairs: Array<[number, number]>): void {
  const seen = new Set<THREE.BufferGeometry>();
  const map = pairs.map(([f, t]) => [new THREE.Color(f), new THREE.Color(t)] as const);
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    const g = o.geometry as THREE.BufferGeometry;
    const col = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    if (!col || seen.has(g)) return;
    seen.add(g);
    const base = (g.userData.firstColors as Float32Array | undefined) ?? Float32Array.from(col.array as ArrayLike<number>);
    g.userData.firstColors = base;
    for (let i = 0; i < col.count; i++) {
      const r = base[i * 3];
      const gr = base[i * 3 + 1];
      const b = base[i * 3 + 2];
      const hit = map.find(([f]) => Math.abs(f.r - r) < 0.004 && Math.abs(f.g - gr) < 0.004 && Math.abs(f.b - b) < 0.004);
      if (hit) col.setXYZ(i, hit[1].r, hit[1].g, hit[1].b);
      else col.setXYZ(i, r, gr, b);
    }
    col.needsUpdate = true;
  });
}

function mesh(geo: THREE.BufferGeometry, color: number | ColorFn, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(paint(geo, color), material);
  m.position.set(x, y, z);
  return m;
}

/** A scarf lying as a floating pickup: a rolled loop with a hanging tail. Centred on the origin. */
export function buildScarfPickup(colors: ScarfColors): THREE.Group {
  const g = new THREE.Group();
  const ring = new THREE.TorusGeometry(0.1, 0.04, 5, 10);
  ring.rotateX(Math.PI / 2);
  g.add(mesh(ring, colors.cloth, 0, 0.03, 0));
  const tail = new THREE.BoxGeometry(0.07, 0.17, 0.03);
  tail.translate(0, -0.085, 0);
  g.add(mesh(tail, (_x, y) => (y < -0.12 ? colors.trim : colors.cloth), 0.06, -0.03, 0.09));
  return g;
}

/**
 * The helmet: a domed cap with a rolled rim, a nose guard and a small spike.
 * Positions are relative to the head's origin. It is used on the rat and for the helmet pickup.
 */
export function buildHelmet(colors: HelmetColors, headR = 0.185, headY = 0.14): THREE.Group {
  const g = new THREE.Group();
  const capGeo = new THREE.SphereGeometry(headR + 0.018, 8, 4, 0, Math.PI * 2, 0, 1.2);
  capGeo.scale(1, 0.98, 1.04);
  const rimR = (headR + 0.018) * Math.sin(1.2);
  const rimY = headY + (headR + 0.018) * Math.cos(1.2) * 0.98;
  const rimGeo = new THREE.TorusGeometry(rimR, 0.02, 4, 10);
  rimGeo.rotateX(Math.PI / 2);
  rimGeo.scale(1, 1, 1.04);
  const guardGeo = new THREE.CylinderGeometry(0.02, 0.012, 0.1, 4);
  const spikeGeo = new THREE.ConeGeometry(0.03, 0.08, 5);
  g.add(
    mesh(capGeo, colors.dome, 0, headY, 0.02),
    mesh(rimGeo, colors.rim, 0, rimY, 0.02),
    mesh(guardGeo, colors.rim, 0, rimY - 0.045, 0.02 + rimR * 1.04 + 0.012),
    mesh(spikeGeo, colors.spike, 0, headY + headR + 0.05, 0.02),
  );
  return g;
}

/** A tapered limb hanging down from the origin. */
function limb(rTop: number, rBottom: number, length: number, color: number | ColorFn, sides = 6): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, length, sides, 1);
  geo.translate(0, -length / 2, 0);
  return mesh(geo, color);
}

/** A tapered segment running from the origin along an axis: +Z when forward (blades), otherwise -Z (tails). */
function segment(rStart: number, rEnd: number, length: number, color: number, sides: number, forward: boolean): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rEnd, rStart, length, sides, 1);
  geo.translate(0, length / 2, 0);
  geo.rotateX(forward ? Math.PI / 2 : -Math.PI / 2);
  return mesh(geo, color);
}

function ball(r: number, color: number | ColorFn, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, w = 7, h = 5): THREE.Mesh {
  const geo = new THREE.SphereGeometry(r, w, h);
  geo.scale(sx, sy, sz);
  return mesh(geo, color, x, y, z);
}

/** A lathed shape from a side profile of [radius, height] points. */
function lathe(profile: Array<[number, number]>, color: number | ColorFn, sides = 8, depthScale = 1): THREE.Mesh {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  geo.scale(1, 1, depthScale);
  geo.computeVertexNormals();
  return mesh(geo, color);
}

/** Flat-shaded copy of a geometry, for hard metal facets. */
function faceted(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geo.toNonIndexed();
  flat.computeVertexNormals();
  return flat;
}

/** Kite shield, facing +Z: a gold boss, a cream centre, a red field and a metal rim. */
function shieldGeometry(): THREE.BufferGeometry {
  const outline: Array<[number, number]> = [
    [0.17, 0.2], [0, 0.235], [-0.17, 0.2], [-0.19, 0.02], [0, -0.3], [0.19, 0.02],
  ]; // counter-clockwise seen from the front
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const tri = (a: number[], b: number[], d: number[], ca: number, cb: number, cd: number): void => {
    pos.push(...a, ...b, ...d);
    for (const hex of [ca, cb, cd]) {
      c.set(hex);
      col.push(c.r, c.g, c.b);
    }
  };
  const n = outline.length;
  const centre = [0, 0.02, 0.055];
  const inner = outline.map(([x, y]) => [x * 0.5, 0.02 + (y - 0.02) * 0.5, 0.04]);
  const outer = outline.map(([x, y]) => [x * 0.9, 0.02 + (y - 0.02) * 0.9, 0.012]);
  const edge = outline.map(([x, y]) => [x, y, 0]);
  const back = outline.map(([x, y]) => [x, y, -0.02]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(centre, inner[i], inner[j], C.gold, C.cream, C.cream);
    tri(inner[i], outer[i], outer[j], C.cream, C.shieldRed, C.shieldRed);
    tri(inner[i], outer[j], inner[j], C.cream, C.shieldRed, C.cream);
    tri(outer[i], edge[i], edge[j], C.metal, C.metal, C.metal);
    tri(outer[i], edge[j], outer[j], C.metal, C.metal, C.metal);
    tri(edge[i], back[i], back[j], C.metalDark, C.metalDark, C.metalDark);
    tri(edge[i], back[j], edge[j], C.metalDark, C.metalDark, C.metalDark);
    tri([0, 0, -0.02], back[j], back[i], C.wood, C.wood, C.wood);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Animation inputs taken from the controller each frame. */
export interface RatAnimInput {
  state: PlayerState;
  planarSpeed: number;
  comboStep: number;
  attackTime: number;
  dodgeKind: DodgeKind;
  dodgeProgress: number;
  verticalSpeed: number; // world y velocity, used to blend between rising and falling poses
  flipProgress: number; // 0..1 through the flip on an air jump, 0 when not flipping
  armed: boolean; // false while the sword and shield are on his back
  stowProgress: number; // 0..1 through a stow or draw motion, -1 when not doing one
  plungeStage: number; // 0 none, 1 hanging, 2 diving, 3 landed
  /** A story scene's direction: where his head is turned, and a small gesture laid over the pose. */
  act?: { headYaw: number; headPitch: number; gesture: Gesture | null; weight: number };
}

/** Story gestures: only the listed parts move, the rest of the pose carries on underneath. */
const GESTURES: Record<Gesture, Partial<Pose>> = {
  // The shield-side paw comes up to the knot of the scarf at his throat; he bows his chest a little over it.
  touchScarf: { armH: [-0.75, 0, -0.55], elbowH: -2.15, chest: [0.2, 0.05, 0], ears: 0.25 },
  // A paw held out, open, towards whoever stands in front of him.
  reachPaw: { armH: [-1.25, 0, 0.05], elbowH: -0.3, chest: [0.12, -0.15, 0] },
  // He checks himself: weight back, ears pinned.
  hesitate: { hipPos: [0, -0.035, -0.03], chest: [-0.07, 0, 0], ears: 0.5 },
  // He stoops and reaches down for something on the ground.
  pickUp: { hipPos: [0, -0.15, 0.04], hips: [0.3, 0, 0], chest: [0.7, 0, 0], armH: [-0.95, 0, -0.1], elbowH: -0.3, armS: [0.3, 0, -0.25] },
  // He holds a small thing up in front of his chest, the other paw close by it.
  inspect: { armH: [-0.85, 0, -0.35], elbowH: -1.5, armS: [-0.55, 0, 0.3], elbowS: -1.35, chest: [0.14, 0, 0] },
  // He tucks it away behind his shoulder.
  stowItem: { armH: [-2.2, 0.1, 0.45], elbowH: -0.9, chest: [0.02, 0.2, 0] },
  // Both paws forward at chest height, fussing with something on whoever stands in front of him.
  adjust: { armS: [-1.2, 0, 0.25], elbowS: -0.55, armH: [-1.2, 0, -0.25], elbowH: -0.55, chest: [0.12, 0, 0] },
  // Both paws in front of his chest, holding something he has been sent to fetch.
  carry: { armH: [-0.9, 0, -0.3], elbowH: -1.25, armS: [-0.75, 0, 0.3], elbowS: -1.3, chest: [0.06, 0, 0] },
  // Sitting on the ground, knees up, paws on them.
  sit: { hipPos: [0, -0.25, -0.06], hips: [-0.2, 0, 0], chest: [0.32, 0, 0], footS: [-0.1, 0, 0.2], footH: [0.1, 0, 0.22], armS: [-0.55, 0, 0.1], elbowS: -0.9, armH: [-0.55, 0, -0.1], elbowH: -0.9, tail: [0, 0.5, 0] },
  // Sitting, turned a little, one paw reaching across to whoever sits on his sword side.
  sitReach: { hipPos: [0, -0.25, -0.06], hips: [-0.2, -0.25, 0], chest: [0.3, -0.4, 0], footS: [-0.1, 0, 0.2], footH: [0.1, 0, 0.22], armS: [-1.0, 0, -0.75], elbowS: -0.75, armH: [-0.9, -0.5, -0.5], elbowH: -1.2, tail: [0, 0.5, 0] },
  // Sitting, leaning towards whoever sits on his shield side.
  sitLean: { hipPos: [0.05, -0.25, -0.06], hips: [-0.2, 0.1, -0.12], chest: [0.3, 0.15, -0.2], footS: [-0.1, 0, 0.2], footH: [0.1, 0, 0.22], armS: [-0.55, 0, 0.1], elbowS: -0.9, armH: [-0.55, 0, -0.1], elbowH: -0.9, tail: [0, -0.5, 0] },
  // Both arms thrown up.
  cheer: { armS: [-2.7, 0, -0.5], elbowS: -0.2, armH: [-2.7, 0, 0.5], elbowH: -0.2, hipPos: [0, 0.03, 0], chest: [-0.12, 0, 0], ears: -0.2 },
};

function mixGesture(p: Pose, g: Partial<Pose>, w: number): void {
  const k = Math.min(1, Math.max(0, w));
  for (const key of POSE_KEYS) {
    const to = g[key];
    if (to === undefined) continue;
    const cur = p[key];
    if (typeof to === 'number') (p[key] as number) = (cur as number) + (to - (cur as number)) * k;
    else for (let i = 0; i < 3; i++) (cur as number[])[i] += (to[i] - (cur as number[])[i]) * k;
  }
}

// Skeleton measurements.
const HIP_Y = 0.36; // pelvis height when standing straight
const HIP_X = 0.085; // hip joints sit this far either side of the centre
const HIP_DROP = 0.02; // and this far below the pelvis origin
const THIGH = 0.18;
const SHIN = 0.15;
const ANKLE = 0.03; // ankle height when the foot is flat on the ground

type Key = (typeof POSE_KEYS)[number];

// Spring layout: every pose channel gets a position and a velocity.
const CHANNELS: Array<{ key: Key; index: number; size: number; legs: boolean }> = [];
const INDEX = {} as Record<Key, number>;
let CHANNEL_COUNT = 0;
for (const key of POSE_KEYS) {
  const size = typeof STANCE[key] === 'number' ? 1 : 3;
  const legs = key === 'footS' || key === 'footH' || key === 'toeS' || key === 'toeH' || key === 'hipPos';
  CHANNELS.push({ key, index: CHANNEL_COUNT, size, legs });
  INDEX[key] = CHANNEL_COUNT;
  CHANNEL_COUNT += size;
}

function flatten(p: Pose, out: Float32Array): void {
  for (const ch of CHANNELS) {
    const v = p[ch.key];
    if (typeof v === 'number') out[ch.index] = v;
    else {
      out[ch.index] = v[0];
      out[ch.index + 1] = v[1];
      out[ch.index + 2] = v[2];
    }
  }
}

function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** Arms hanging loosely, for when the weapons are on his back. */
const RELAXED_ARMS = fullPose({
  armS: [0.12, 0, -0.14], elbowS: -0.25, wrist: [0, 0, 0],
  armH: [0.12, 0, 0.14], elbowH: -0.25, shield: [0, 0, 0],
});
/** Both hands up behind the shoulders, reaching for the straps. */
const REACH_ARMS = fullPose({
  armS: [-2.5, -0.1, -0.35], elbowS: -0.6, wrist: [0, 0, 0],
  armH: [-2.2, 0.1, 0.45], elbowH: -0.9, shield: [0, 0, 0],
  chest: [0.02, 0, 0], head: [-0.15, 0, 0],
});

function mixArms(p: Pose, to: Pose, w: number): void {
  if (w <= 0) return;
  const k = Math.min(1, w);
  for (const key of ['armS', 'wrist', 'armH', 'shield'] as const) {
    for (let i = 0; i < 3; i++) p[key][i] += (to[key][i] - p[key][i]) * k;
  }
  p.elbowS += (to.elbowS - p.elbowS) * k;
  p.elbowH += (to.elbowH - p.elbowH) * k;
}

export class RatModel {
  readonly root = new THREE.Group();
  private readonly lean = new THREE.Group(); // banks into turns and leans with acceleration, pivoting at the feet
  private readonly tumble = new THREE.Group(); // turns the whole body over for rolls and flips, pivoting at the hips
  private readonly pelvis = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly earS = new THREE.Group();
  private readonly earH = new THREE.Group();
  private readonly armS = new THREE.Group();
  private readonly armH = new THREE.Group();
  private readonly elbowS = new THREE.Group();
  private readonly elbowH = new THREE.Group();
  private readonly sword = new THREE.Group();
  private readonly shieldPivot = new THREE.Group();
  private readonly legS = new THREE.Group();
  private readonly legH = new THREE.Group();
  private readonly kneeS = new THREE.Group();
  private readonly kneeH = new THREE.Group();
  private readonly footS = new THREE.Group();
  private readonly footH = new THREE.Group();
  private readonly tailSegments: THREE.Group[] = [];
  private readonly scarfSegments: THREE.Group[] = [];
  private readonly scarfParts: Array<{ mesh: THREE.Mesh; hem: boolean }> = [];
  private readonly backSword = new THREE.Group();
  private readonly backShield = new THREE.Group();
  private helmet: THREE.Group;
  private headR = 0.185;
  private headY = 0.14;
  private relaxed = 0;
  private swimPhase = 0;
  private swimMove = 0;
  private swimLean = 0;
  private readonly bladeBase = new THREE.Object3D();
  private readonly bladeTip = new THREE.Object3D();

  private readonly value = new Float32Array(CHANNEL_COUNT);
  private readonly velocity = new Float32Array(CHANNEL_COUNT);
  private readonly target = new Float32Array(CHANNEL_COUNT);

  private phase = 0;
  private time = 0;
  private idleTime = 0;
  private run = 0; // 0 walking, 1 running, eased
  private deadAmount = 0;
  private lastFacing = 0;
  private lastSpeed = 0;
  private bank = 0;
  private pitch = 0;
  private turnRate = 0;
  private tumbleLift = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly tmpQ = new THREE.Quaternion();

  /** `look` swaps colours of the standard rat (fur, tunic and so on), for the other rats of the story. */
  constructor(look: Partial<typeof C> = {}) {
    const standard = { ...C };
    Object.assign(C, look);
    this.root.add(this.lean);
    this.lean.add(this.tumble);
    this.tumble.position.set(0, HIP_Y, 0);
    this.tumble.add(this.pelvis);
    this.pelvis.rotation.order = 'YXZ';

    // Pelvis: the skirt of the tunic, with a belt and a gold buckle.
    this.pelvis.add(
      lathe([[0, -0.1], [0.11, -0.095], [0.165, -0.03], [0.16, 0.05], [0.13, 0.1], [0, 0.11]], (_x, y) => (y > 0.035 ? C.leather : C.tunicDark), 8, 0.88),
      ball(0.028, C.gold, 0, 0.065, 0.135, 1, 1, 0.6, 5, 4),
    );

    // Chest: a pear-shaped torso narrowing to the neck, with a red scarf wound round the collar.
    this.chest.position.set(0, 0.07, 0);
    this.pelvis.add(this.chest);
    this.chest.add(
      lathe([[0, -0.03], [0.14, -0.02], [0.165, 0.06], [0.155, 0.17], [0.12, 0.27], [0.085, 0.31], [0, 0.33]], C.tunic, 8, 0.86),
    );
    // The collar is its own piece, so a different scarf can be worn.
    const collar = lathe([[0.133, 0.222], [0.145, 0.255], [0.122, 0.288], [0.094, 0.322]], C.scarf, 8, 0.86);
    this.chest.add(collar);
    this.scarfParts.push({ mesh: collar, hem: false });

    // Head: big for the body, with a long snout, large ears, and an open-faced helmet.
    this.head.position.set(0, 0.33, 0.01);
    this.head.rotation.order = 'YXZ';
    this.chest.add(this.head);
    const headY = 0.14;
    const headR = 0.185;
    this.head.add(ball(headR, (_x, y, z) => (y < -0.04 && z > 0.02 ? C.cream : C.fur), 0, headY, 0.02, 1, 0.96, 1.04, 8, 6));
    const snoutGeo = new THREE.ConeGeometry(0.105, 0.23, 7, 1);
    snoutGeo.rotateX(Math.PI / 2);
    snoutGeo.scale(1, 0.85, 1);
    const snout = mesh(snoutGeo, (_x, y) => (y < -0.01 ? C.cream : C.fur), 0, headY - 0.05, 0.245);
    snout.rotation.x = 0.12;
    this.head.add(
      snout,
      ball(0.03, C.pinkDark, 0, headY - 0.062, 0.355, 1, 0.9, 1, 5, 4),
      ball(0.018, C.white, -0.014, headY - 0.118, 0.31, 1, 1.4, 0.7, 4, 3), // front teeth
      ball(0.018, C.white, 0.014, headY - 0.118, 0.31, 1, 1.4, 0.7, 4, 3),
      ball(0.033, C.eye, -0.087, headY + 0.035, 0.172, 1, 1.15, 0.7, 6, 5),
      ball(0.033, C.eye, 0.087, headY + 0.035, 0.172, 1, 1.15, 0.7, 6, 5),
      ball(0.011, C.white, -0.078, headY + 0.05, 0.197, 1, 1, 1, 4, 3),
      ball(0.011, C.white, 0.096, headY + 0.05, 0.197, 1, 1, 1, 4, 3),
    );
    // Helmet: a domed cap with a rolled rim, a nose guard and a small spike.
    this.helmet = buildHelmet(HELMET_DEFAULT, headR, headY);
    this.head.add(this.helmet);
    this.headR = headR;
    this.headY = headY;
    // Ears: big round discs that stand out from the sides of the helmet, each on its own pivot so it can flick.
    for (const [ear, side] of [[this.earS, -1], [this.earH, 1]] as const) {
      ear.position.set(side * 0.13, headY + 0.115, -0.01);
      ear.rotation.z = -side * 0.5;
      ear.add(ball(0.115, C.fur, 0, 0.1, 0, 1, 1.05, 0.22, 7, 5), ball(0.082, C.pink, 0, 0.1, 0.014, 1, 1.05, 0.2, 6, 4));
      this.head.add(ear);
    }

    // Scarf tails, streaming from the back of the neck.
    let scarfParent: THREE.Object3D = this.chest;
    for (let i = 0; i < 2; i++) {
      const seg = new THREE.Group();
      seg.position.set(i === 0 ? 0.03 : 0, i === 0 ? 0.27 : -0.13, i === 0 ? -0.1 : 0);
      const geo = new THREE.CylinderGeometry(i === 0 ? 0.04 : 0.05, i === 0 ? 0.05 : 0.02, 0.13, 4, 1);
      geo.translate(0, -0.065, 0);
      geo.scale(1, 1, 0.3);
      const tail = mesh(geo, C.scarf);
      seg.add(tail);
      this.scarfParts.push({ mesh: tail, hem: i === 1 });
      scarfParent.add(seg);
      this.scarfSegments.push(seg);
      scarfParent = seg;
    }

    // Arms: upper arm from the shoulder, forearm from the elbow.
    for (const [arm, elbow, side] of [[this.armS, this.elbowS, -1], [this.armH, this.elbowH, 1]] as const) {
      arm.position.set(side * 0.165, 0.245, 0);
      arm.rotation.order = 'YXZ';
      elbow.position.set(0, -0.15, 0);
      arm.add(ball(0.055, C.tunic, 0, 0, 0, 1, 1, 1, 6, 4), limb(0.048, 0.04, 0.15, C.fur), elbow);
      elbow.add(
        ball(0.042, C.fur, 0, 0, 0, 1, 1, 1, 5, 4),
        limb(0.044, 0.036, 0.13, (_x, y) => (y < -0.03 ? C.leather : C.fur)), // leather bracer
        ball(0.044, C.pink, 0, -0.15, 0, 1, 1, 1, 6, 4), // hand
      );
      this.chest.add(arm);
    }
    this.armH.add(ball(0.07, C.metal, 0.01, 0.015, 0, 1, 0.85, 1, 6, 4)); // pauldron on the shield shoulder

    // Sword: held at the hand. With the wrist at rest the blade points forward, square to the forearm.
    this.sword.position.set(0, -0.15, 0);
    this.elbowS.add(this.sword);
    const bladeGeo = new THREE.CylinderGeometry(0.03, 0.036, 0.4, 4, 1);
    bladeGeo.translate(0, 0.2, 0);
    bladeGeo.rotateX(Math.PI / 2);
    bladeGeo.scale(1, 0.3, 1);
    const tipGeo = new THREE.ConeGeometry(0.03, 0.11, 4, 1);
    tipGeo.translate(0, 0.055, 0);
    tipGeo.rotateX(Math.PI / 2);
    tipGeo.scale(1, 0.3, 1);
    const guardBar = new THREE.CylinderGeometry(0.016, 0.016, 0.15, 5);
    guardBar.rotateZ(Math.PI / 2);
    const grip = segment(0.016, 0.016, 0.11, C.leather, 5, true);
    grip.position.z = -0.045;
    this.sword.add(
      grip,
      ball(0.024, C.gold, 0, 0, -0.06, 1, 1, 1, 5, 4),
      mesh(guardBar, C.gold, 0, 0, 0.068),
      mesh(faceted(bladeGeo), C.blade, 0, 0, 0.075),
      mesh(faceted(tipGeo), C.blade, 0, 0, 0.475),
    );
    this.bladeBase.position.set(0, 0, 0.09);
    this.bladeTip.position.set(0, 0, 0.585);
    this.sword.add(this.bladeBase, this.bladeTip);

    // Shield: gripped in the fist, in front of the hand.
    this.shieldPivot.position.set(0, -0.17, 0);
    const shieldMesh = new THREE.Mesh(shieldGeometry(), materialTwoSided);
    shieldMesh.scale.setScalar(0.88);
    shieldMesh.position.set(0, -0.02, 0.035);
    this.shieldPivot.add(shieldMesh);
    this.elbowH.add(this.shieldPivot);

    // Stowed weapons: the shield rides on his back with the sword strapped diagonally beneath it, hilt over the shoulder.
    const stowedSword = this.sword.clone();
    stowedSword.position.set(0, 0, 0);
    stowedSword.rotation.set(-Math.PI / 2, 0, 0); // blade points up
    this.backSword.add(stowedSword);
    this.backSword.rotation.z = -0.55; // leans so the hilt sits over the right shoulder
    this.backSword.position.set(-0.03, 0.01, -0.175);
    this.backShield.position.set(0, 0.14, -0.215);
    this.backShield.rotation.y = Math.PI;
    const stowedShield = shieldMesh.clone();
    stowedShield.scale.setScalar(0.8);
    stowedShield.position.set(0, 0, 0);
    this.backShield.add(stowedShield);
    this.chest.add(this.backSword, this.backShield);
    this.backSword.visible = false;
    this.backShield.visible = false;

    // Legs: thigh, shin and a long rat foot. The angles are solved from foot targets.
    for (const [leg, knee, foot, side] of [[this.legS, this.kneeS, this.footS, -1], [this.legH, this.kneeH, this.footH, 1]] as const) {
      leg.position.set(side * HIP_X, -HIP_DROP, 0);
      leg.rotation.order = 'ZXY';
      knee.position.set(0, -THIGH, 0);
      foot.position.set(0, -SHIN, 0);
      leg.add(limb(0.075, 0.055, THIGH, (_x, y) => (y > -0.09 ? C.tunicDark : C.furDark)), knee);
      knee.add(ball(0.052, C.furDark, 0, 0, 0, 1, 1, 1, 5, 4), limb(0.052, 0.034, SHIN, C.furDark), foot);
      foot.add(ball(1, C.pink, 0, 0, 0.05, 0.052, ANKLE, 0.11, 6, 4));
      this.pelvis.add(leg);
    }

    // Tail: seven tapering segments, each inheriting the motion of the one before.
    let tailParent: THREE.Object3D = this.pelvis;
    for (let i = 0; i < 7; i++) {
      const seg = new THREE.Group();
      if (i === 0) seg.position.set(0, 0, -0.12);
      else seg.position.z = -0.105;
      const r0 = 0.034 - i * 0.0038;
      seg.add(segment(r0, r0 - 0.0038, 0.11, C.pink, 5, false));
      tailParent.add(seg);
      this.tailSegments.push(seg);
      tailParent = seg;
    }

    flatten(STANCE, this.value);
    flatten(STANCE, this.target);
    this.apply(0);
    Object.assign(C, standard);
  }

  private readonly dress = { scarf: true, helmet: true, gear: true };
  private held: THREE.Object3D | null = null;

  /** What he has on: the scarf, the helmet, and his sword and shield (drawn or on his back). */
  setDress(d: { scarf?: boolean; helmet?: boolean; gear?: boolean }): void {
    Object.assign(this.dress, d);
    for (const { mesh: m } of this.scarfParts) m.visible = this.dress.scarf;
    this.helmet.visible = this.dress.helmet;
  }

  /** Puts a small thing in his shield-side paw, or takes it away. */
  setHeld(obj: THREE.Object3D | null): void {
    if (this.held === obj) return;
    if (this.held) this.elbowH.remove(this.held);
    this.held = obj;
    if (obj) {
      obj.position.set(0, -0.18, 0.04);
      this.elbowH.add(obj);
    }
  }

  /** Swaps the helmet for one with different colours. The helmet is its own set of meshes on the head. */
  setHelmet(colors: HelmetColors): void {
    this.head.remove(this.helmet);
    this.helmet.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.helmet = buildHelmet(colors, this.headR, this.headY);
    this.helmet.visible = this.dress.helmet;
    this.head.add(this.helmet);
  }

  /** Recolours the sword (in his hand and on his back): the blade, and the gold of the guard and pommel. */
  setSword(colors: { blade: number; hilt: number }): void {
    remap(this.sword, [[C.blade, colors.blade], [C.gold, colors.hilt]]);
  }

  /** Recolours the shield (in his hand and on his back): the red of its face, and the metal of its rim. */
  setShield(colors: { face: number; trim: number }): void {
    remap(this.shieldPivot, [[C.shieldRed, colors.face], [C.metal, colors.trim]]);
  }

  /** Recolours the scarf: the collar and tails take the cloth colour, and the end of the tail the trim. */
  setScarf(colors: ScarfColors): void {
    for (const { mesh: m, hem } of this.scarfParts) paint(m.geometry, hem ? (_x, y) => (y < -0.085 ? colors.trim : colors.cloth) : colors.cloth);
  }

  /** Places the rat in the world. */
  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** World positions of the two ends of the blade, for the sword trail. */
  getBlade(base: THREE.Vector3, tip: THREE.Vector3): void {
    this.root.updateWorldMatrix(true, true);
    this.bladeBase.getWorldPosition(base);
    this.bladeTip.getWorldPosition(tip);
  }

  /** Adds a color on top of the whole model, for hit flashes. */
  setFlash(r: number, g: number, b: number): void {
    (material.uniforms.flash.value as THREE.Color).setRGB(r, g, b);
    (materialTwoSided.uniforms.flash.value as THREE.Color).setRGB(r, g, b);
  }

  update(dt: number, ctx: RatAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    const grounded = state !== 'jump' && state !== 'fall' && state !== 'longjump' && state !== 'hang' && state !== 'climb';
    const moving = (state === 'walk' || state === 'run' || state === 'guard') && ctx.planarSpeed > 0.3;
    this.idleTime = state === 'idle' ? this.idleTime + dt : 0;
    this.run = ease(this.run, state === 'run' ? 1 : 0, dt, 9);
    if (moving) this.phase += dt * Math.PI * 2 * (1.5 + ctx.planarSpeed * 0.32);

    // Target pose, spring stiffness (how fast joints chase it) and damping (below 1 lets them overshoot a little).
    let pose: Pose;
    let stiffness = 17;
    let damping = 0.8;
    let tumbleX = 0;
    let lift = 0;

    if (state === 'dead') {
      pose = DEAD;
      stiffness = 12;
    } else if (state === 'hurt') {
      pose = HURT;
      stiffness = 30;
      damping = 0.6;
    } else if (state === 'swim') {
      const stroking = ctx.planarSpeed > 0.4;
      this.swimMove = ease(this.swimMove, stroking ? 1 : 0, dt, 5);
      this.swimPhase += dt * Math.PI * 2 * (stroking ? 0.9 + ctx.planarSpeed * 0.28 : 0.55);
      pose = swimPose(this.swimPhase, this.swimMove);
      stiffness = 14;
      damping = 0.75;
    } else if (state === 'plunge') {
      pose = ctx.plungeStage === 1 ? PLUNGE_WIND : ctx.plungeStage === 2 ? PLUNGE_DIVE : PLUNGE_LAND;
      stiffness = ctx.plungeStage === 3 ? 44 : 36;
      damping = ctx.plungeStage === 3 ? 0.6 : 0.85;
    } else if (state === 'attack') {
      const clip = ATTACK_CLIPS[Math.min(ctx.comboStep, ATTACK_CLIPS.length - 1)];
      pose = samplePose(clip.keys, ctx.attackTime);
      stiffness = 38;
      damping = 0.85;
    } else if (state === 'guard') {
      pose = GUARD;
      if (moving) {
        // Shuffle: the legs walk under a braced upper body.
        const walk = locomotionPose(this.phase, 0);
        pose = fullPose(GUARD);
        pose.footS = [walk.footS[0] - 0.02, walk.footS[1] * 0.6, walk.footS[2] * 0.7 - 0.06];
        pose.footH = [walk.footH[0] + 0.01, walk.footH[1] * 0.6, walk.footH[2] * 0.7 + 0.08];
        pose.hipPos[1] += walk.hipPos[1] * 0.4;
      }
      stiffness = 26;
    } else if (state === 'dodge') {
      if (ctx.dodgeKind === 'roll') {
        const p = ctx.dodgeProgress;
        // Dive in, stay tucked through the turn, and open up into the stance at the end.
        const tuck = smoothstep(p / 0.1) * (1 - smoothstep((p - 0.84) / 0.16));
        pose = blendPose(STANCE, ROLL_TUCK, tuck);
        const turn = Math.min(1, p / 0.88);
        tumbleX = (turn * 0.7 + smoothstep(turn) * 0.3) * Math.PI * 2;
        lift = -0.13 * Math.sin(Math.min(1, p / 0.9) * Math.PI);
        stiffness = 34;
      } else {
        pose = blendPose(BACKSTEP, STANCE, smoothstep((ctx.dodgeProgress - 0.6) / 0.4));
        stiffness = 30;
      }
      damping = 0.9;
    } else if (state === 'hang') {
      // Hanging by his paws from a ledge, legs dangling.
      pose = fullPose(airPose(-6, TUNING.jump.velocity, 0));
      mixArms(pose, REACH_ARMS, 1);
      stiffness = 22;
    } else if (state === 'climb') {
      pose = LAND;
      tumbleX = 0.35;
      stiffness = 30;
    } else if (state === 'longjump') {
      // Stretched out flat, like a dive.
      pose = airPose(ctx.verticalSpeed, TUNING.jump.velocity, 0);
      tumbleX = 0.85;
      stiffness = 22;
    } else if (!grounded) {
      const flip = ctx.flipProgress > 0 ? Math.sin(Math.min(1, ctx.flipProgress) * Math.PI) ** 0.6 : 0;
      pose = airPose(ctx.verticalSpeed, TUNING.jump.velocity, flip);
      tumbleX = -smoothstep(ctx.flipProgress) * Math.PI * 2;
      stiffness = 20;
    } else if (state === 'land') {
      pose = LAND;
      stiffness = 34;
      damping = 0.75;
    } else if (moving) {
      pose = locomotionPose(this.phase, this.run);
      stiffness = 30;
      damping = 0.9;
    } else {
      pose = idlePose(this.time, this.idleTime);
      stiffness = 15;
      damping = 0.8;
    }

    // Weapons on his back: arms hang relaxed, and a stow/draw motion reaches over the shoulder.
    const armed = ctx.armed;
    this.sword.visible = armed && this.dress.gear;
    this.shieldPivot.visible = armed && this.dress.gear;
    this.backSword.visible = !armed && this.dress.gear;
    this.backShield.visible = !armed && this.dress.gear;
    const free = state === 'idle' || state === 'walk' || state === 'run' || state === 'land';
    this.relaxed = ease(this.relaxed, !armed && free ? 1 : 0, dt, 10);
    const reach = ctx.stowProgress >= 0 && free ? Math.sin(Math.min(1, ctx.stowProgress) * Math.PI) : 0;
    if ((this.relaxed > 0.01 || reach > 0.01) && state !== 'attack') {
      pose = fullPose(pose);
      const walkingFree = state === 'walk' || state === 'run';
      mixArms(pose, walkingFree ? unarmedArms(this.phase, this.run) : RELAXED_ARMS, this.relaxed);
      mixArms(pose, REACH_ARMS, reach);
    }

    if (ctx.act) {
      pose = fullPose(pose);
      // The head does most of a look; the chest follows a little, as it would.
      pose.head[1] += ctx.act.headYaw * 0.78;
      pose.head[0] += ctx.act.headPitch;
      pose.chest[1] += ctx.act.headYaw * 0.28;
      if (ctx.act.gesture && ctx.act.weight > 0) mixGesture(pose, GESTURES[ctx.act.gesture], ctx.act.weight);
    }

    // Springs. Legs are stiffer and never overshoot, so the feet stay where they are put.
    flatten(pose, this.target);
    if (dt > 0.5) {
      this.value.set(this.target);
      this.velocity.fill(0);
    } else {
      const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / steps;
      for (let s = 0; s < steps; s++) {
        for (const ch of CHANNELS) {
          const w = ch.legs ? Math.max(stiffness, 30) : stiffness;
          const z = ch.legs ? 1 : damping;
          for (let i = ch.index; i < ch.index + ch.size; i++) {
            const a = w * w * (this.target[i] - this.value[i]) - 2 * z * w * this.velocity[i];
            this.velocity[i] += a * h;
            this.value[i] += this.velocity[i] * h;
          }
        }
      }
    }

    // Whole-body turning for rolls, flips and lying dead.
    this.deadAmount = ease(this.deadAmount, state === 'dead' ? 1 : 0, dt, state === 'dead' ? 7 : 30);
    // Swimming along, he leans forward until he is nearly flat on the water.
    this.swimLean = ease(this.swimLean, state === 'swim' ? this.swimMove * 1.15 : 0, dt, state === 'swim' ? 6 : 12);
    this.tumble.rotation.x = tumbleX + this.swimLean - this.deadAmount * (Math.PI / 2);
    this.tumbleLift = ease(this.tumbleLift, lift - this.deadAmount * 0.2, dt, 30);
    this.tumble.position.y = HIP_Y + this.tumbleLift;

    // Lean into acceleration and bank into turns, the way a running animal does.
    if (dt > 0 && dt < 0.5) {
      const facing = this.root.rotation.y;
      const dFacing = Math.atan2(Math.sin(facing - this.lastFacing), Math.cos(facing - this.lastFacing));
      this.turnRate = ease(this.turnRate, dFacing / dt, dt, 10);
      const accel = (ctx.planarSpeed - this.lastSpeed) / dt;
      const canLean = grounded && (state === 'walk' || state === 'run' || state === 'idle');
      this.bank = ease(this.bank, canLean ? Math.max(-0.3, Math.min(0.3, -this.turnRate * ctx.planarSpeed * 0.012)) : 0, dt, 8);
      this.pitch = ease(this.pitch, canLean ? Math.max(-0.22, Math.min(0.22, accel * 0.012)) : 0, dt, 7);
      this.lastFacing = facing;
      this.lastSpeed = ctx.planarSpeed;
    }
    this.lean.rotation.set(this.pitch, 0, this.bank);

    this.apply(ctx.planarSpeed);
  }

  /** Writes the current spring values to the joints and solves the legs. */
  private apply(planarSpeed: number): void {
    const v = this.value;
    const set = (g: THREE.Object3D, key: Key): void => {
      const i = INDEX[key];
      g.rotation.x = v[i];
      g.rotation.y = v[i + 1];
      g.rotation.z = v[i + 2];
    };

    const hp = INDEX.hipPos;
    this.pelvis.position.set(v[hp], v[hp + 1], v[hp + 2]);
    set(this.pelvis, 'hips');
    set(this.chest, 'chest');
    set(this.head, 'head');
    set(this.armS, 'armS');
    set(this.armH, 'armH');
    this.elbowS.rotation.x = v[INDEX.elbowS];
    this.elbowH.rotation.x = v[INDEX.elbowH];
    set(this.sword, 'wrist');
    set(this.shieldPivot, 'shield');
    // Cancel the arm's tilt so the shield face stays upright and forward however the arm is held.
    this.shieldPivot.rotation.x -= v[INDEX.armH] + v[INDEX.elbowH] + v[INDEX.chest] + v[INDEX.hips];

    this.solveLeg(this.legS, this.kneeS, this.footS, -1, INDEX.footS, v[INDEX.toeS]);
    this.solveLeg(this.legH, this.kneeH, this.footH, 1, INDEX.footH, v[INDEX.toeH]);

    // Tail: the pose bends it, a slow wave runs down it, and turning drags the tip behind.
    const t = INDEX.tail;
    const drag = Math.max(-0.35, Math.min(0.35, -this.turnRate * 0.06));
    this.tailSegments.forEach((seg, i) => {
      const along = i / 6;
      seg.rotation.x = (i === 0 ? -0.5 + v[t] : 0.14 * (1 - along * 0.5)) + v[t + 2] * (0.6 + along);
      seg.rotation.y = v[t + 1] * (0.25 + along * 0.5) + Math.sin(this.time * 3.2 - i * 0.8) * (0.05 + along * 0.1) + drag * (0.3 + along);
    });

    // Ears: pinned back by the pose, with a tiny constant flutter so they never look frozen.
    const e = v[INDEX.ears];
    this.earS.rotation.x = -e * 0.7 + Math.sin(this.time * 2.7) * 0.03;
    this.earH.rotation.x = -e * 0.7 + Math.sin(this.time * 2.3 + 1) * 0.03;

    // Scarf: hangs at rest and streams out behind him at speed.
    const stream = Math.min(1, planarSpeed / 6);
    const rate = 5 + stream * 9;
    this.scarfSegments[0].rotation.x = 0.35 + stream * 0.9 + Math.sin(this.time * rate) * (0.08 + stream * 0.12);
    this.scarfSegments[1].rotation.x = 0.1 + stream * 0.25 + Math.sin(this.time * rate - 1.2) * (0.12 + stream * 0.15);
  }

  /**
   * Two-bone leg solve. The foot target is given in body space (x sideways, y height off the ground, z forward).
   * The hip spreads and swings to aim the leg, and the knee bends forward to make up the distance.
   */
  private solveLeg(leg: THREE.Group, knee: THREE.Group, foot: THREE.Group, side: number, index: number, toe: number): void {
    const v = this.value;
    // Ankle target relative to the hip joint, in the pelvis's own frame.
    const t = this.tmp.set(v[index], v[index + 1] + ANKLE - HIP_Y, v[index + 2]);
    t.sub(this.pelvis.position);
    t.applyQuaternion(this.tmpQ.copy(this.pelvis.quaternion).invert());
    t.x -= side * HIP_X;
    t.y += HIP_DROP;

    const reach = THIGH + SHIN - 0.002;
    const dist = Math.min(reach, Math.max(0.08, t.length()));
    const spread = Math.atan2(t.x, -t.y);
    const down = Math.hypot(t.x, t.y);
    const aim = Math.atan2(-t.z, down); // positive when the foot is behind the hip
    const kneeInside = Math.acos(Math.max(-1, Math.min(1, (THIGH * THIGH + SHIN * SHIN - dist * dist) / (2 * THIGH * SHIN))));
    const hipInside = Math.acos(Math.max(-1, Math.min(1, (THIGH * THIGH + dist * dist - SHIN * SHIN) / (2 * THIGH * dist))));
    const thigh = aim - hipInside;
    const bend = Math.PI - kneeInside;

    leg.rotation.set(thigh, 0, spread);
    knee.rotation.x = bend;
    // Keep the sole level with the ground whatever the leg and pelvis are doing, then add the toe pitch.
    foot.rotation.x = -(thigh + bend) - this.pelvis.rotation.x + toe;
  }
}
