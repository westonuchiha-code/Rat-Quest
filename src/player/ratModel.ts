import * as THREE from 'three';
import { climbRise, HANG_DROP } from './controller';
import type { Gesture } from '../story/scene';
import { createPs1Material } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import type { PlayerState, DodgeKind } from './controller';
import {
  wakePose, ATTACK_CLIPS, BACKSTEP, DEAD, GUARD, GUARD_BROKEN, GUARD_SNAP, PARRY_SWEEP, HURT, LAND, PLUNGE_DIVE, PLUNGE_LAND, PLUNGE_WIND, POSE_KEYS, ROLL_TUCK, STANCE,
  Pose, airPose, blendPose, fullPose, idlePose, locomotionPose, unarmedArms, samplePose, smoothstep, swimPose, WALL_BRACE, WALL_KICK,
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

// (He wears SOFT PAINT, as the friendly characters do: soft painted shading over his own colours and nothing else.
// The owner, shown him and the Keep Guard plain and painted side by side, 2026-11-17: "all looks great".)
const material = createPs1Material({ lit: true, tex: getTexture('softPaint') });
const materialTwoSided = createPs1Material({ lit: true, side: THREE.DoubleSide, tex: getTexture('softPaint') });
const S_A = new THREE.Vector3();
const S_B = new THREE.Vector3();
const S_C = new THREE.Vector3();
const S_D = new THREE.Vector3();
const S_E = new THREE.Vector3();
const S_F = new THREE.Vector3();
const S_G = new THREE.Vector3();
const S_M = new THREE.Matrix4();
const UP_Y = new THREE.Vector3(0, 1, 0);

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

/**
 * The knight as he is in the dream (the owner, 2026-11-16: "he could be like neon pink and green ... a wacky Pomo
 * palette kind of version of himself"): the same rat in loud colours. Worn with `wearColours`.
 */
export const DREAM_LOOK: Partial<typeof C> = {
  fur: 0xff4fb0, furDark: 0xd62a8c, cream: 0xfff06a, pink: 0x39e6ff, pinkDark: 0x1fb6d6,
  tunic: 0x4dff6a, tunicDark: 0x1fcf52, leather: 0x7a3cff, scarf: 0xffe53a,
  metal: 0xff8a2a, metalDark: 0xe0601a, blade: 0xbffcff, gold: 0xffffff, wood: 0x7a3cff, shieldRed: 0xff3a6a,
};

/**
 * THE STREAMER: his scarf in the dream. (The owner, 2026-11-16, of the first long scarf, the short one stretched and
 * held out stiff: "it just sort of looks like he's got a second tail coming out of his neck ... maybe we could do some
 * sort of like fake wind that makes it constantly flowing behind him in this world".) A flat ribbon, not a tube: a
 * hand wide, forked at its end, banded in its trim colour so that its turning shows. It is a chain of points out from
 * the back of his neck, kept IN THE ROOM, not on him: a wind of its own blows each one out behind him and a little
 * up (and a little to one side, so that it is seen past him), each follows the one before a moment late, and a wave runs down it that is wider the further out it goes. So it
 * streams when he stands, swings wide when he turns, and trails when he runs or falls.
 */
export const STREAMER = { points: 14, length: 1.5, wide: 0.12, lift: 0.62, drift: 0.34 } as const;

/** Every mesh under a root, by its path from the root (which child of which child): the same in two models built the same way. */
function meshPaths(root: THREE.Object3D): Map<string, THREE.Mesh> {
  const out = new Map<string, THREE.Mesh>();
  const walk = (o: THREE.Object3D, path: string): void => {
    if ((o as THREE.Mesh).isMesh) out.set(path, o as THREE.Mesh);
    o.children.forEach((c, i) => walk(c, `${path}/${i}`));
  };
  walk(root, '');
  return out;
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
  /** A sidehop's side, +1 or -1. */
  dodgeSide?: number;
  dodgeProgress: number;
  verticalSpeed: number; // world y velocity, used to blend between rising and falling poses
  flipProgress: number; // 0..1 through the flip on an air jump, 0 when not flipping
  armed: boolean; // false while the sword and shield are on his back
  stowProgress: number; // 0..1 through a stow or draw motion, -1 when not doing one
  plungeStage: number; // 0 none, 1 hanging, 2 diving, 3 landed
  /** The edge he is holding, from his feet in the way he faces (y up, z forward), while hanging or climbing. */
  ledge?: { y: number; z: number } | null;
  /** Seconds he has hung from it (-1 when not hanging), and how far through the pull-up he is (0..1, -1 when not). */
  hangTime?: number;
  climbProgress?: number;
  /** How far through the push of a wall kick he is (0..1, -1 when not), and whether he is in the air against a wall. */
  kickProgress?: number;
  onWall?: boolean;
  /** Riding his shield: how hard he is steering (-1..1), how far through a kickflip (0..1, -1 when not), and whether he is in the air. */
  /**
   * Sliding down ground too steep to stand on, on his own hide. `back`: backwards on his belly, facing up the slope
   * he was trying to climb; otherwise feet first on his seat. `along`, `across`: how the ground lies (see `ride`).
   */
  slide?: { back: boolean; air: boolean; along?: number; across?: number } | null;
  /** Gliding on ice with the stick let go: braced, his feet still (see PlayerController.gliding). */
  glide?: boolean;
  /**
   * ON ICE (PlayerController `bellySliding`, `scrabble`, `skid`, `iceBraking`): on his belly; how much his feet are
   * going without biting (0..1); how hard he is sliding sideways to the way he pushes (-1..1); his shield dug in.
   */
  ice?: { belly: boolean; scrabble: number; skid: number; brake: boolean };
  /** His guard: `snap`, a blow caught NOW would be a perfect guard (the shield is punched out for exactly those frames); `turned`, how far through the sweep after one he made, 0..1 (-1: none). */
  /** GETTING UP (the game's first moment): how far through it he is, 0..1; left out or below 0, not getting up. */
  waking?: number;
  guardNow?: { snap: boolean; turned: number; /** His guard is broken: 0..1, how much of it is left to run (0: not). */ broken?: number };
  /**
   * Riding his shield. `grind`: it is across a ledge or a rail (`grindSide`: which side of him the drop is on, +1 his
   * +x side, -1 the other, 0 on a rail).
   */
  ride?: { steer: number; flip: number; air: boolean; along?: number; across?: number; grind?: boolean; grindSide?: number; /** 0 to 1: tucked, crouched low for speed. */ tuck?: number; /** A spin in the air: how far round, 0..1 (-1: none). A grab: 0..1. */ spin?: number; grab?: number } | null;
  /** Carrying something over his head: how far up his arms are (0..1). `throwT`: how far through a throw (0..1), or -1. */
  carry?: number;
  /** ...and it is a SMALL thing (hugged to his chest, not rested on his head). */
  carryLight?: boolean;
  /** ...and how far apart his paws are for it, 0 (together) to 1 (wide). */
  carrySpread?: number;
  throwT?: number;
  /** A story scene's direction: where his head is turned, and a small gesture laid over the pose. */
  act?: { headYaw: number; headPitch: number; gesture: Gesture | null; weight: number; /** Parts of a pose of the caller's own, laid over the same way; `each` weighs its parts one by one (1 where not given). */ pose?: Partial<Pose>; each?: Partial<Record<keyof Pose, number>> };
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

function mixGesture(p: Pose, g: Partial<Pose>, w: number, each?: Partial<Record<keyof Pose, number>>): void {
  for (const key of POSE_KEYS) {
    const to = g[key];
    if (to === undefined) continue;
    const k = Math.min(1, Math.max(0, w * (each?.[key] ?? 1)));
    if (k <= 0) continue;
    const cur = p[key];
    if (typeof to === 'number') (p[key] as number) = (cur as number) + (to - (cur as number)) * k;
    else for (let i = 0; i < 3; i++) (cur as number[])[i] += (to[i] - (cur as number[])[i]) * k;
  }
}

// Skeleton measurements.
const HIP_Y = 0.36; // pelvis height when standing straight
const ARM_BONE = 0.15; // upper arm and forearm are each this long
/** Hanging, he is drawn this much higher than his feet say, stretched out, so that his paws reach the edge. */
const HANG_LIFT = 0.17;
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
/** Hanging from a ledge: long and loose, head back, legs straight down, toes pointed, tail hanging. */
const HANG: Pose = fullPose({
  hipPos: [0, 0, 0.13], hips: [-0.04, 0, 0], chest: [-0.05, 0, 0], head: [-0.6, 0, 0],
  armS: [-2.9, 0, -0.2], elbowS: -0.1, wrist: [0, 0, 0], armH: [-2.9, 0, 0.2], elbowH: -0.1, shield: [0, 0, 0],
  footS: [-0.07, 0.02, -0.03], footH: [0.07, 0.04, 0.02], toeS: 0.9, toeH: 0.8, tail: [0.5, 0, -0.1], ears: 0.2,
});
/** Half-way up: arms bent hard, chin over the edge, knees drawn up against the wall. */
const CLIMB_PULL: Pose = fullPose({
  hipPos: [0, 0, 0.12], hips: [0.2, 0, 0], chest: [0.25, 0, 0], head: [-0.35, 0, 0],
  armS: [-1.6, 0, -0.5], elbowS: -1.6, wrist: [0, 0, 0], armH: [-1.6, 0, 0.5], elbowH: -1.6, shield: [0, 0, 0],
  footS: [-0.1, 0.16, 0.06], footH: [0.1, 0.2, 0.1], toeS: 0.5, toeH: 0.4, tail: [0.9, 0, 0.2], ears: 0.4,
});
/** Over the edge: chest low on the ledge, weight on his arms, one foot swung up beside his paw. */
const CLIMB_MANTLE: Pose = fullPose({
  hipPos: [0, -0.16, 0.02], hips: [0.4, 0.15, 0], chest: [0.55, 0, 0], head: [-0.5, 0, 0],
  armS: [-0.6, 0, -0.5], elbowS: -1.2, wrist: [0, 0, 0], armH: [-0.6, 0, 0.5], elbowH: -1.2, shield: [0, 0, 0],
  footS: [-0.13, 0.0, -0.12], footH: [0.15, 0.1, 0.16], toeS: 0.4, toeH: 0, tail: [1.1, 0, 0.3], ears: 0.3,
});

/**
 * Riding his shield like a board: side-on to the way he is going, one foot before the other on it, knees bent, arms
 * out wide for balance, head turned to look where he is going, tail up behind him.
 */
const RIDE: Pose = fullPose({
  hipPos: [0, -0.11, -0.01], hips: [0.1, 1.0, 0], chest: [0.28, -0.2, 0], head: [-0.22, -0.72, 0],
  armS: [-0.25, 0, -1.2], elbowS: -0.35, wrist: [0, 0, 0], armH: [-0.25, 0, 1.2], elbowH: -0.35, shield: [0, 0, 0],
  footS: [-0.015, 0.05, -0.15], footH: [0.015, 0.05, 0.17], toeS: 0, toeH: 0, tail: [0.75, 0, 0.15], ears: 0.4,
});
/** In the air on it: tucked up over the shield, arms higher. */
/**
 * Sliding on his seat down a slope too steep for him: sat back, knees up and feet out in front to brake, arms flung
 * out and back, ears flat. He did not mean to. (His whole body is tipped back, and to the slope, by the code.)
 */
const SLIDE_SIT: Pose = fullPose({
  hipPos: [0, 0, 0], hips: [-0.25, 0, 0], chest: [0.55, 0, 0], head: [0.25, 0, 0],
  armS: [0.9, 0, -1.0], elbowS: -0.5, wrist: [0, 0, 0], armH: [0.9, 0, 1.0], elbowH: -0.5, shield: [0, 0, 0],
  footS: [-0.09, 0.1, 0.12], footH: [0.09, 0.13, 0.16], toeS: -0.5, toeH: -0.5, tail: [0.2, 0, 0], ears: 0.9,
});
/** ...and on his belly, backwards, having lost his footing going up: flat to it, paws clawing above his head, legs trailing. */
const SLIDE_BELLY: Pose = fullPose({
  hipPos: [0, 0, 0], hips: [0, 0, 0], chest: [-0.2, 0, 0], head: [-0.75, 0, 0],
  armS: [-2.75, 0, -0.3], elbowS: -0.35, wrist: [0, 0, 0], armH: [-2.75, 0, 0.3], elbowH: -0.35, shield: [0, 0, 0],
  footS: [-0.08, 0.02, 0], footH: [0.08, 0.05, 0.02], toeS: 1.0, toeH: 1.0, tail: [0.9, 0, 0], ears: 0.9,
});
/**
 * ON ICE (2026-11-22, the ice feel).
 * THE BELLY SLIDE: flat on his front, head up to see where he is going, his shield arm thrown out ahead of him like the
 * nose of a sledge, his sword arm swept back along his side, legs out behind, tail streaming. (Tipped flat by the code.)
 */
const ICE_BELLY: Pose = fullPose({
  hipPos: [0, 0, 0], hips: [0, 0, 0], chest: [-0.25, 0, 0], head: [-1.05, 0, 0],
  armS: [0.55, 0, -0.45], elbowS: -0.2, wrist: [0.3, 0, 0], armH: [-2.85, 0, 0.25], elbowH: -0.15, shield: [0, 0, 0],
  footS: [-0.09, 0.03, -0.02], footH: [0.09, 0.06, 0.0], toeS: 1.1, toeH: 1.1, tail: [1.0, 0, 0.1], ears: 1,
});
/** DUG IN: thrown back against his own slide, heels out in front of him, his shield's edge jammed down into the ice beside him, sword arm out for balance. */
const ICE_BRAKE: Pose = fullPose({
  hipPos: [0, -0.13, -0.05], hips: [-0.5, -0.35, 0], chest: [0.3, 0.2, 0], head: [0.15, 0.25, 0],
  armS: [0.5, 0, -1.2], elbowS: -0.4, wrist: [0.4, 0, 0], armH: [-0.35, 0.2, 0.75], elbowH: -0.55, shield: [0.5, 0.3, 0],
  footS: [-0.07, 0, 0.2], footH: [0.1, 0, 0.26], toeS: -0.5, toeH: -0.5, tail: [0.5, 0, 0.3], ears: 0.8,
});
/** SKIDDING: both feet together and turned across the way he slides, knees bent, arms flung wide for balance. (Leaned into it by the code.) */
const ICE_SKID: Pose = fullPose({
  hipPos: [0, -0.1, 0], hips: [0.1, 0, 0], chest: [0.2, 0, 0], head: [-0.05, 0, 0],
  armS: [0.2, 0, -1.25], elbowS: -0.35, wrist: [0.3, 0, 0], armH: [0.2, 0, 1.25], elbowH: -0.5, shield: [0, 0.2, 0],
  footS: [-0.06, 0, 0.03], footH: [0.06, 0, -0.03], toeS: 0, toeH: 0, tail: [0.3, 0, 0], ears: 0.6,
});

/**
 * Getting on: he hops, throws the shield down off his arm so that it tips forward onto its face and slides in under
 * his feet, and comes down on it. (The owner, 2026-11-15: "it just seems like it's like an instant snap".) All of it is drawn
 * only: by the rules he is riding from the first moment.
 */
export const RIDE_MOUNT = 0.36; // seconds, start to settled
/** ...of which the shield is under his feet by this much, and he lands on it at RIDE_MOUNT_LAND. */
const RIDE_MOUNT_UNDER = 0.66;
export const RIDE_MOUNT_LAND = 0.8;
const RIDE_HOP = 0.3; // how high the hop lifts him
/**
 * How the shield lies under his feet: its painted, curved FACE down on the ground, where it slides, and its flat
 * wooden back up, where he stands; its TOP forward and its point behind. (The owner, 2026-11-15: "the wood should be
 * the part that he's standing on and the curved part of The Shield is where he should be sliding on ... he's on it
 * upside down"; and then: "the top of the shield should be the part facing forward ... if you threw it down in front
 * of you you probably wouldn't throw it and spin it upside down".) That is the shield as he holds it, tipped
 * straight forward onto its face: one quarter turn.
 */
const BOARD_LIES = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
/** ...and how far above the ground its middle is, lying so: its boss, the lowest of it, just clear of the stone. */
const BOARD_Y = 0.056;
/** Stepping off: the shield is kicked up from the ground onto his arm. */
export const RIDE_DISMOUNT = 0.22;
/** The hop: knees up, the shield arm thrown down and forward at the ground, the sword arm high for balance. */
const RIDE_HOP_POSE: Pose = fullPose({
  hipPos: [0, 0, 0], hips: [0.3, 0.55, 0], chest: [0.5, -0.45, 0.12], head: [-0.2, -0.4, 0],
  armS: [-0.5, 0, -1.75], elbowS: -0.2, wrist: [0, 0, 0], armH: [-0.75, 0, 0.3], elbowH: -0.1, shield: [0, 0, 0],
  footS: [-0.02, 0.2, -0.06], footH: [0.02, 0.23, 0.1], toeS: 0.3, toeH: 0.3, tail: [1.25, 0, 0.2], ears: 0.75,
});
const smooth = (x: number): number => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
/** How much of a slope's tilt his body takes while he rides it (his shield takes all of it). */
const RIDE_BODY_TILT = 0.6;
const RIDE_AIR: Pose = fullPose({
  hipPos: [0, -0.07, 0], hips: [0.2, 1.0, 0], chest: [0.38, -0.2, 0], head: [-0.32, -0.72, 0],
  armS: [-0.5, 0, -1.45], elbowS: -0.25, wrist: [0, 0, 0], armH: [-0.5, 0, 1.45], elbowH: -0.25, shield: [0, 0, 0],
  footS: [-0.015, 0.15, -0.13], footH: [0.015, 0.16, 0.15], toeS: 0.15, toeH: 0.15, tail: [1.0, 0, 0.3], ears: 0.55,
});

/**
 * TRICKS ON THE SHIELD (BACKLOG B4, 2026-11-18: proper poses). A GRAB: his shield-side paw straight down to the rim
 * of the shield under him, the sword arm flung up and back for balance (with the deeper crouch the ride already
 * has). A SPIN: both arms pulled in tight to his chest, as anyone spinning does, to go round faster.
 */
const GRAB_ARMS = fullPose({
  armS: [-2.3, 0, -0.75], elbowS: -0.3, wrist: [0, 0, 0],
  armH: [0.15, 0, 0.18], elbowH: -0.05, shield: [0, 0, 0],
});
const SPIN_ARMS = fullPose({
  armS: [-0.55, 0, -0.3], elbowS: -1.9, wrist: [0, 0, 0],
  armH: [-0.55, 0, 0.3], elbowH: -1.9, shield: [0, 0, 0],
});
/**
 * A BIG thing carried: it rests on his head (world/lifting.ts `heldAt`). His paws are straight up beside his ears,
 * flat against its underside; and (laid on by the carry itself) his head is ducked under it and his knees bent.
 */
const BRACE_ARMS = fullPose({
  armS: [-3.0, 0, -0.36], elbowS: -0.05, wrist: [0, 0, 0],
  armH: [-3.0, 0, 0.36], elbowH: -0.05, shield: [0, 0, 0],
});
/** A SMALL thing carried: hugged in both paws in front of his chest. */
const HUG_ARMS = fullPose({
  armS: [-1.2, 0, 0.42], elbowS: -1.0, wrist: [0, 0, 0],
  armH: [-1.2, 0, -0.42], elbowH: -1.0, shield: [0, 0, 0],
});
/** ...the same with his paws apart, round the sides of a wide thing (a pot, a rock). Mixed with the above by how wide it is. */
const HUG_WIDE_ARMS = fullPose({
  armS: [-1.25, 0, -0.12], elbowS: -0.7, wrist: [0, 0, 0],
  armH: [-1.25, 0, 0.12], elbowH: -0.7, shield: [0, 0, 0],
});
/** A SMALL thing thrown: shoved straight out from his chest in both paws, his weight going after it. */
const SHOVE_ARMS = fullPose({
  armS: [-1.55, 0, 0.05], elbowS: -0.05, wrist: [0, 0, 0],
  armH: [-1.55, 0, -0.05], elbowH: -0.05, shield: [0, 0, 0],
});
const THROW_ARMS = fullPose({
  armS: [-1.25, 0, -0.2], elbowS: -0.1, wrist: [0, 0, 0],
  armH: [-1.25, 0, 0.2], elbowH: -0.1, shield: [0, 0, 0],
  chest: [0.3, 0, 0], head: [-0.1, 0, 0],
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

const named = <T extends THREE.Object3D>(o: T, name: string): T => {
  o.name = name;
  return o;
};

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
  /** The shield under his feet while he rides it: the outer turns it for a kickflip, the inner lays it flat. */
  private readonly board = new THREE.Group();
  private readonly boardFlat = new THREE.Group();
  /** Smears of it as it swings under him (or back up): pale copies trailing where it was a moment before. */
  private readonly boardGhosts: Array<{ root: THREE.Group; mat: THREE.MeshBasicMaterial }> = [];
  private armShield: THREE.Object3D | null = null;
  private stowShield: THREE.Object3D | null = null;
  private wasRiding = false;
  /** Seconds into getting on (or stepping off): -1 when he is doing neither. */
  private mountT = -1;
  private mountInAir = false;
  private dismountT = -1;
  private readonly mountFromP = new THREE.Vector3();
  private readonly mountFromQ = new THREE.Quaternion();
  private hopY = 0;
  private hopStretch = 1;
  private boardScale = 1;
  private rideAir = 0;
  private rideLean = 0;
  private rideGrind = 0;
  private rideTiltX = 0;
  private rideTiltZ = 0;
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
    // His two front teeth. (The owner, 2026-11-16: "we need to fix the knights teeth like we did with grimsqueak".
    // They were two white balls hung a hair UNDER his snout, touching nothing.) Each is a small rat's incisor now,
    // tapering to a chisel end, ROOTED in the underside of his snout near its tip: they are parts of the snout.
    for (const s of [-1, 1]) {
      const geo = new THREE.CylinderGeometry(0.0135, 0.009, 0.052, 4, 1);
      geo.rotateY(Math.PI / 4);
      geo.scale(1, 1, 0.62);
      geo.translate(0, -0.026, 0);
      const tooth = mesh(geo, C.white, s * 0.0135, -0.008, 0.058);
      tooth.rotation.set(0.16, 0, s * -0.06);
      snout.add(tooth);
    }
    this.head.add(
      snout,
      ball(0.03, C.pinkDark, 0, headY - 0.062, 0.355, 1, 0.9, 1, 5, 4),
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
      named(mesh(faceted(bladeGeo), C.blade, 0, 0, 0.075), 'blade'),
      named(mesh(faceted(tipGeo), C.blade, 0, 0, 0.475), 'bladeTip'),
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
    // Under his feet, for the ride: lying face down, its top forward. It leans with him.
    const boardMesh = shieldMesh.clone();
    boardMesh.scale.setScalar(0.92);
    boardMesh.position.set(0, 0, 0);
    this.boardFlat.quaternion.copy(BOARD_LIES);
    this.boardFlat.add(boardMesh);
    this.board.add(this.boardFlat);
    this.board.visible = false;
    this.lean.add(this.board);
    this.armShield = shieldMesh;
    this.stowShield = stowedShield;
    for (const opacity of [0.5, 0.26]) {
      const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
      const root = new THREE.Group();
      const flat = new THREE.Group();
      flat.quaternion.copy(BOARD_LIES);
      const mesh = new THREE.Mesh(shieldMesh.geometry, mat);
      mesh.scale.setScalar(0.92);
      flat.add(mesh);
      root.add(flat);
      root.visible = false;
      this.lean.add(root);
      this.boardGhosts.push({ root, mat });
    }
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
    this.scarfColors = { cloth: C.scarf, trim: C.scarf };
    this.buildStreamer();
    Object.assign(C, standard);
  }

  private readonly dress = { scarf: true, helmet: true, gear: true };
  private streamer!: THREE.Mesh;
  /** The streamer's points, in the room, from his neck outward; and whether they have been laid out yet. */
  private readonly chain: THREE.Vector3[] = Array.from({ length: STREAMER.points }, () => new THREE.Vector3());
  private chainLaid = false;
  private scarfColors: ScarfColors = { cloth: C.scarf, trim: C.scarf };

  private buildStreamer(): void {
    const N = STREAMER.points;
    const geo = new THREE.BufferGeometry();
    // (Two points to each place along it, left and right, and one more in the notch of its forked end.)
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N * 2 + 1) * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array((N * 2 + 1) * 3), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((N * 2 + 1) * 3), 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((N * 2 + 1) * 2), 2));
    const idx: number[] = [];
    for (let i = 0; i < N - 2; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    const a = (N - 2) * 2;
    idx.push(a, N * 2, a + 2, N * 2, a + 1, a + 3);
    geo.setIndex(idx);
    this.streamer = new THREE.Mesh(geo, this.matTwo);
    this.streamer.frustumCulled = false;
    this.streamer.visible = false;
    this.root.add(this.streamer);
    this.paintStreamer();
  }

  /** The streamer's colours: the scarf's cloth, a band of its trim every so often, and its forked end all trim. */
  private paintStreamer(): void {
    const N = STREAMER.points;
    const col = this.streamer.geometry.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      c.set(i >= N - 3 || i % 4 === 2 ? this.scarfColors.trim : this.scarfColors.cloth);
      col.setXYZ(i * 2, c.r, c.g, c.b);
      col.setXYZ(i * 2 + 1, c.r, c.g, c.b);
    }
    c.set(this.scarfColors.trim);
    col.setXYZ(N * 2, c.r, c.g, c.b);
    col.needsUpdate = true;
  }

  /** Blows the streamer out behind him. `dt` 0 (a held frame): it stays as it is. */
  private flowStreamer(dt: number): void {
    if (!this.streamer) return; // (he is still being put together)
    const on = this.scarfLong > 1 && this.dress.scarf;
    this.streamer.visible = on;
    // (The short tail is put away while the streamer flies; the collar stays.)
    for (const { mesh: m } of this.scarfParts) if (this.scarfSegments.includes(m.parent as THREE.Group)) m.visible = this.dress.scarf && !on;
    if (!on) {
      this.chainLaid = false;
      return;
    }
    const N = STREAMER.points;
    const L = STREAMER.length / (N - 1);
    const neck = this.scarfSegments[0];
    neck.updateWorldMatrix(true, false);
    this.root.updateWorldMatrix(true, false);
    const anchor = neck.getWorldPosition(S_A);
    // Behind him, and to his side, in the room.
    const back = S_B.set(0, 0, -1).transformDirection(this.root.matrixWorld);
    const side = S_C.set(1, 0, 0).transformDirection(this.root.matrixWorld);
    this.chain[0].copy(anchor);
    const t = this.time;
    for (let i = 1; i < N; i++) {
      const u = i / (N - 1);
      // Where the wind would hold this point: out from the one before, with the wave that runs down it.
      // (Up as well as back, and a little to one side: the game looks at him from behind and above, and a ribbon
      // flying level and straight back would be hidden by his own body and seem to hang.)
      const rise = STREAMER.lift * (1 - u * 0.55) + Math.cos(t * 9.5 - i * 0.8) * (0.1 + 0.5 * u);
      const sway = STREAMER.drift + Math.cos(t * 6.1 - i * 0.62 + 1.3) * (0.1 + 0.5 * u);
      S_D.copy(back).addScaledVector(UP_Y, rise).addScaledVector(side, sway).normalize();
      const ideal = S_E.copy(this.chain[i - 1]).addScaledVector(S_D, L);
      const p = this.chain[i];
      if (!this.chainLaid) p.copy(ideal);
      else if (dt > 0) p.lerp(ideal, 1 - Math.exp(-dt * (30 - 18 * u)));
      // (Cloth does not stretch: each point its own length from the one before.)
      S_D.copy(p).sub(this.chain[i - 1]);
      if (S_D.lengthSq() < 1e-8) S_D.copy(back);
      p.copy(this.chain[i - 1]).addScaledVector(S_D.normalize(), L);
    }
    this.chainLaid = true;
    // The ribbon round the chain, in his own space (it is a part of him, drawn where the room has it).
    const inv = S_M.copy(this.root.matrixWorld).invert();
    const pos = this.streamer.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const along = S_D.copy(this.chain[Math.min(N - 1, i + 1)]).sub(this.chain[Math.max(0, i - 1)]).normalize();
      const across = S_E.crossVectors(along, UP_Y);
      if (across.lengthSq() < 1e-6) across.copy(side);
      across.normalize();
      // (It turns over as it flies: more toward its end.)
      const twist = Math.sin(t * 5.3 - i * 0.55) * 0.9 * u;
      const up = S_F.crossVectors(across, along);
      across.multiplyScalar(Math.cos(twist)).addScaledVector(up, Math.sin(twist));
      const half = (STREAMER.wide / 2) * (0.5 + 0.5 * Math.min(1, u * 5)) * (i === N - 1 ? 1.5 : 1);
      S_G.copy(this.chain[i]).addScaledVector(across, -half).applyMatrix4(inv);
      pos.setXYZ(i * 2, S_G.x, S_G.y, S_G.z);
      S_G.copy(this.chain[i]).addScaledVector(across, half).applyMatrix4(inv);
      pos.setXYZ(i * 2 + 1, S_G.x, S_G.y, S_G.z);
    }
    // The notch of the fork: the middle of it, one place short of the end.
    S_G.copy(this.chain[N - 2]).applyMatrix4(inv);
    pos.setXYZ(N * 2, S_G.x, S_G.y, S_G.z);
    pos.needsUpdate = true;
    this.streamer.geometry.computeVertexNormals();
  }

  /** The streamer's points in the room, from his neck outward (for tests). */
  streamerPoints(): readonly THREE.Vector3[] {
    return this.chain;
  }

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

  /** A BROKEN sword (in his hand and on his back): snapped off short, no point. And `bare`: no shield at all. */
  setKit(o: { broken: boolean; bare: boolean }): void {
    for (const root of [this.sword, this.backSword]) {
      root.traverse((m) => {
        if (m.name === 'blade') m.scale.z = o.broken ? 0.42 : 1;
        if (m.name === 'bladeTip') m.visible = !o.broken;
      });
    }
    this.bladeTip.position.z = o.broken ? 0.26 : 0.585;
    this.bare = o.bare;
  }
  private bare = false;

  /** Recolours the shield (in his hand and on his back): the red of its face, and the metal of its rim. */
  setShield(colors: { face: number; trim: number }): void {
    remap(this.shieldPivot, [[C.shieldRed, colors.face], [C.metal, colors.trim]]);
  }

  /** His own paint, kept while he wears another's: by geometry (two of his parts can be one shape). */
  private ownPaint: Map<THREE.BufferGeometry, THREE.BufferAttribute | THREE.InterleavedBufferAttribute> | null = null;
  private scarfLong = 1;
  /**
   * Wears another rat's colours: every part of him takes the paint of the same part of `other` (a rat built the same
   * way in another palette). `null` puts his own back. Only looks: nothing else about him changes.
   */
  wearColours(other: RatModel | null): void {
    if (this.ownPaint) {
      for (const [geo, paintWas] of this.ownPaint) geo.setAttribute('color', paintWas);
      this.ownPaint = null;
    }
    if (!other) return;
    this.ownPaint = new Map();
    const theirs = meshPaths(other.root);
    for (const [path, m] of meshPaths(this.root)) {
      const t = theirs.get(path);
      const mine = m.geometry.attributes.color;
      const their = t?.geometry.attributes.color;
      if (!mine || !their || their.count !== mine.count || this.ownPaint.has(m.geometry)) continue;
      this.ownPaint.set(m.geometry, mine);
      m.geometry.setAttribute('color', their.clone());
    }
  }

  /** How many times its own length his scarf's tail is (1: as it is). In the dream it streams out behind him three times as long. */
  setScarfLong(k: number): void {
    this.scarfLong = k;
    // (Longer than its own length it is the STREAMER, a ribbon that flies; the short tail is put away.)
  }

  /** Recolours the scarf: the collar and tails take the cloth colour, and the end of the tail the trim. */
  setScarf(colors: ScarfColors): void {
    for (const { mesh: m, hem } of this.scarfParts) paint(m.geometry, hem ? (_x, y) => (y < -0.085 ? colors.trim : colors.cloth) : colors.cloth);
    this.scarfColors = { ...colors };
    this.paintStreamer();
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
    (this.mat.uniforms.flash.value as THREE.Color).setRGB(r, g, b);
    (this.matTwo.uniforms.flash.value as THREE.Color).setRGB(r, g, b);
  }

  private mat: THREE.ShaderMaterial = material;
  private matTwo: THREE.ShaderMaterial = materialTwoSided;

  /**
   * Gives this rat materials of his own, so that flashing him does not flash every other rat built from this model
   * (they all share one pair otherwise). For enemies made from it. Call it again after changing his helmet.
   */
  ownMaterials(): void {
    if (this.mat === material) {
      this.mat = createPs1Material({ lit: true, tex: getTexture('softPaint') });
      this.matTwo = createPs1Material({ lit: true, side: THREE.DoubleSide, tex: getTexture('softPaint') });
    }
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (m.material === material) m.material = this.mat;
      else if (m.material === materialTwoSided) m.material = this.matTwo;
    });
  }

  /**
   * Puts something else in his sword hand in place of the sword (a spear, say), or gives the sword back with null.
   * It is built pointing along +Z from the grip, as the blade is.
   */
  setWeapon(obj: THREE.Object3D | null): void {
    if (this.weapon) this.sword.remove(this.weapon);
    this.weapon = obj;
    for (const c of this.sword.children) if (c !== this.bladeBase && c !== this.bladeTip) c.visible = !obj;
    if (obj) this.sword.add(obj);
  }

  private weapon: THREE.Object3D | null = null;

  /** Makes his shield bigger or smaller (1 is the knight's). */
  setShieldScale(k: number): void {
    this.shieldPivot.scale.setScalar(k);
    this.board.scale.setScalar(k);
    this.boardScale = k;
  }

  private lastDt = 0;

  update(dt: number, ctx: RatAnimInput): void {
    this.time += dt;
    this.lastDt = dt;
    const state = ctx.state;
    const grounded = state !== 'jump' && state !== 'fall' && state !== 'longjump' && state !== 'hang' && state !== 'climb';
    // (belly: on the ice, see ICE_BELLY.)
    const moving = (state === 'walk' || state === 'run' || state === 'guard') && ctx.planarSpeed > 0.3;
    this.idleTime = state === 'idle' ? this.idleTime + dt : 0;
    this.run = ease(this.run, state === 'run' ? 1 : 0, dt, 9);
    if (moving) this.phase += dt * Math.PI * 2 * (1.5 + ctx.planarSpeed * 0.32);

    // Getting on his shield and stepping off it: the clocks for the two little pieces of show.
    {
      const riding = state === 'ride';
      const stopped = state === 'hurt' || state === 'dead';
      if (riding && !this.wasRiding) {
        this.mountT = 0;
        this.dismountT = -1;
        // (In the air already, as he is when he gets on over a slope or a rail, there is no hop to draw: he is up.)
        this.mountInAir = !!ctx.ride?.air;
        // (Where the shield was the moment before: on his arm, or on his back.)
        this.placeOf(ctx.armed ? this.armShield : this.stowShield, this.mountFromP, this.mountFromQ);
      } else if (!riding && this.wasRiding) {
        this.mountT = -1;
        this.dismountT = stopped || !ctx.armed ? -1 : 0;
      }
      this.wasRiding = riding;
      if (this.mountT >= 0 && (this.mountT += dt) >= RIDE_MOUNT) this.mountT = -1;
      if (this.dismountT >= 0 && ((this.dismountT += dt) >= RIDE_DISMOUNT || stopped || !ctx.armed)) this.dismountT = -1;
      // The hop: up and down again by the time he lands; long as he leaves the ground, flat as he lands on it.
      const m = this.mountT >= 0 && !this.mountInAir ? this.mountT / RIDE_MOUNT : -1;
      this.hopY = m >= 0 ? RIDE_HOP * Math.sin(Math.PI * Math.min(1, m / RIDE_MOUNT_LAND)) : 0;
      this.hopStretch = m < 0 ? 1 : m < 0.25 ? 1 + 0.18 * Math.sin((Math.PI * m) / 0.25) : m > RIDE_MOUNT_LAND ? 1 - 0.22 * Math.sin((Math.PI * (m - RIDE_MOUNT_LAND)) / (1 - RIDE_MOUNT_LAND)) : 1;
    }

    // Target pose, spring stiffness (how fast joints chase it) and damping (below 1 lets them overshoot a little).
    let pose: Pose;
    let stiffness = 17;
    let damping = 0.8;
    let tumbleX = 0;
    let lift = 0;

    const waking = (ctx.waking ?? -1) >= 0 ? wakePose(ctx.waking!) : null;
    if (waking) {
      pose = waking.pose;
      stiffness = 9;
      damping = 0.9;
    } else if (state === 'dead') {
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
    } else if (state === 'belly') {
      // On his belly on the ice: flat, a little bob as he goes, his tail whipping behind him; he rolls into his turns.
      pose = fullPose(ICE_BELLY);
      pose.tail[1] = Math.sin(this.time * 11) * 0.35;
      pose.footS[1] += 0.02 * Math.sin(this.time * 9);
      pose.footH[1] += 0.02 * Math.sin(this.time * 9 + 2);
      tumbleX = 1.38;
      lift = -0.3 + 0.012 * Math.sin(this.time * 17);
      stiffness = 30;
      damping = 0.85;
    } else if (state === 'plunge') {
      pose = ctx.plungeStage === 1 ? PLUNGE_WIND : ctx.plungeStage === 2 ? PLUNGE_DIVE : PLUNGE_LAND;
      stiffness = ctx.plungeStage === 3 ? 44 : 36;
      damping = ctx.plungeStage === 3 ? 0.6 : 0.85;
    } else if (state === 'attack') {
      const clip = ATTACK_CLIPS[Math.min(ctx.comboStep, ATTACK_CLIPS.length - 1)];
      pose = samplePose(clip.keys, ctx.attackTime);
      stiffness = 38;
      damping = 0.85;
    } else if ((ctx.guardNow?.broken ?? 0) > 0.35 && (state === 'idle' || state === 'walk' || state === 'run' || state === 'guard')) {
      // HIS GUARD IS BROKEN: thrown open. (For the first two thirds of it; then he gathers himself.)
      pose = GUARD_BROKEN;
      stiffness = 60;
      damping = 0.7;
    } else if ((ctx.guardNow?.turned ?? -1) >= 0 && (state === 'guard' || state === 'idle' || state === 'walk' || state === 'run')) {
      // A blow just turned by a perfect guard: the shield swept aside with it, the sword cocked. (Fast: it is a blow's worth of time.)
      pose = PARRY_SWEEP;
      stiffness = 70;
      damping = 0.8;
    } else if (state === 'guard' && ctx.guardNow?.snap && !moving) {
      // THE PERFECT GUARD'S FRAMES: the shield punched out, for exactly as long as a blow caught would be one.
      pose = GUARD_SNAP;
      stiffness = 95;
      damping = 0.8;
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
      } else if (ctx.dodgeKind === 'side') {
        // THE SIDEHOP: off both feet to one side, low, his body leant into it and his tail thrown out the other
        // way; shield and sword still toward what he faces. He is back in his stance as it ends.
        const p = ctx.dodgeProgress;
        const up = Math.sin(Math.min(1, p / 0.85) * Math.PI);
        const side = ctx.dodgeSide ?? 1;
        pose = fullPose(blendPose(STANCE, BACKSTEP, 0.5 * up));
        pose.chest = [pose.chest[0] + 0.1 * up, pose.chest[1], pose.chest[2] - 0.32 * side * up];
        pose.hips = [pose.hips[0], pose.hips[1], pose.hips[2] - 0.2 * side * up];
        pose.tail = [pose.tail[0] + 0.2 * up, pose.tail[1] - 0.9 * side * up, pose.tail[2]];
        pose.hipPos = [pose.hipPos[0], pose.hipPos[1] - 0.05 * up, pose.hipPos[2]];
        lift = 0.2 * up;
        stiffness = 44;
      } else {
        pose = blendPose(BACKSTEP, STANCE, smoothstep((ctx.dodgeProgress - 0.6) / 0.4));
        stiffness = 30;
      }
      damping = 0.9;
    } else if (state === 'ride') {
      // On his shield: crouched side-on over it, tucked up in the air; his tail swings out against a turn to balance
      // him, hard out in a carve.
      const r = ctx.ride ?? { steer: 0, flip: -1, air: false };
      this.rideAir = ease(this.rideAir, r.air ? 1 : 0, dt, r.air ? 14 : 20);
      pose = blendPose(RIDE, RIDE_AIR, this.rideAir);
      pose.tail[1] = r.steer * 1.1;
      pose.tail[0] += Math.abs(r.steer) * 0.25;
      pose.chest[2] = -r.steer * 0.18;
      pose.hipPos[1] -= Math.abs(r.steer) * 0.035;
      // A SWING on the shield: his sword arm does what it does in a swing on his feet, and his chest turns with it a
      // little; the rest of him rides.
      if (ctx.attackTime > 0) {
        const cut = samplePose(ATTACK_CLIPS[Math.min(ctx.comboStep, ATTACK_CLIPS.length - 1)].keys, ctx.attackTime);
        pose.armS = cut.armS;
        pose.elbowS = cut.elbowS;
        pose.wrist = cut.wrist;
        pose.chest = [pose.chest[0], pose.chest[1] + (cut.chest[1] - pose.chest[1]) * 0.5, pose.chest[2]];
      }
      // Tucked: down low over the shield, his chest forward over his front knee, his tail straight out behind.
      // (A grab, in the air, is the same crouch and deeper: down over the shield with a paw to it.)
      const tk = r.air ? (r.grab ?? 0) * 1.3 : r.tuck ?? 0;
      if (tk > 0.01) {
        pose.hipPos[1] -= 0.09 * tk;
        pose.chest[0] += 0.5 * tk;
        pose.tail[0] += 0.35 * tk;
      }
      // A GRAB in the air: a paw down to the shield's rim, the sword arm up; his knees come up to meet it.
      const gr = r.air ? r.grab ?? 0 : 0;
      if (gr > 0.01) {
        mixArms(pose, GRAB_ARMS, gr);
        pose.footS[1] += 0.06 * gr;
        pose.footH[1] += 0.06 * gr;
      }
      // A SPIN: arms in tight for the middle of it, out again to land; his tail whips out behind as he goes round.
      const sp = r.spin ?? -1;
      if (sp >= 0) {
        const tight = Math.min(1, sp * 6, (1 - sp) * 5);
        mixArms(pose, SPIN_ARMS, tight);
        pose.tail[1] = -1.1 * tight;
        pose.tail[0] -= 0.25 * tight;
        pose.head[1] -= 0.35 * tight;
      }
      // Grinding: the shield is across the edge under him, and he is down low over it, arms wide, tail straight out
      // behind and shivering with the rattle of it; on a ledge he leans a little in from the drop.
      this.rideGrind = ease(this.rideGrind, r.grind ? 1 : 0, dt, 16);
      if (this.rideGrind > 0.01) {
        const k = this.rideGrind;
        pose.hipPos[1] -= 0.05 * k;
        pose.chest[0] += 0.14 * k;
        pose.armS[2] -= 0.22 * k;
        pose.armH[2] += 0.22 * k;
        pose.tail[0] += 0.2 * k;
        pose.tail[1] = Math.sin(this.time * 38) * 0.16 * k;
        pose.chest[2] += (r.grindSide ?? 0) * 0.1 * k;
      }
      // A kickflip: his feet come up off it while it turns.
      if (r.flip >= 0) {
        const up = Math.sin(Math.min(1, r.flip) * Math.PI);
        pose.footS[1] += 0.09 * up;
        pose.footH[1] += 0.09 * up;
        pose.hipPos[1] += 0.03 * up;
      }
      stiffness = 30;
      damping = 0.85;
      // Getting on: the hop first, then tucked over the shield as it comes under him, then down onto it.
      if (this.mountT >= 0) {
        const m = this.mountT / RIDE_MOUNT;
        pose = m < 0.42 ? RIDE_HOP_POSE : m < RIDE_MOUNT_LAND ? RIDE_AIR : pose;
        stiffness = 52;
        damping = 0.9;
      }
    } else if (state === 'slide') {
      // Off his feet on a slope too steep for him: on his seat, or (if he was going up it) on his belly, clawing at
      // it. In the air off a hop he keeps the shape he was sliding in.
      const sl = ctx.slide ?? { back: false, air: false };
      if (sl.back) {
        pose = fullPose(SLIDE_BELLY);
        // (His paws scrabble at the slope, one and then the other.)
        const claw = Math.sin(this.time * 22);
        pose.armS[0] += claw * 0.3;
        pose.armH[0] -= claw * 0.3;
        pose.elbowS -= Math.max(0, claw) * 0.4;
        pose.elbowH -= Math.max(0, -claw) * 0.4;
        pose.tail[1] = Math.sin(this.time * 9) * 0.5;
        tumbleX = 1.36;
        lift = -0.3;
      } else {
        pose = fullPose(SLIDE_SIT);
        // (He rattles down it: arms and tail shaking.)
        const jolt = Math.sin(this.time * 26);
        pose.armS[2] -= jolt * 0.08;
        pose.armH[2] += jolt * 0.08;
        pose.tail[1] = Math.sin(this.time * 14) * 0.35;
        tumbleX = -0.85;
        lift = -0.22;
      }
      stiffness = 34;
      damping = 0.8;
    } else if (state === 'hang') {
      // Hanging by his paws from a ledge: stretched out long against the wall, head tipped back to look up at the edge,
      // legs dangling. He swings a little as he catches it, then settles. (His paws are planted on the edge below.)
      const t = Math.max(0, ctx.hangTime ?? 1);
      const swing = Math.exp(-3.5 * t) * Math.cos(t * 10);
      pose = fullPose(HANG);
      pose.footS[2] += 0.1 * swing + 0.012 * Math.sin(this.time * 2.1);
      pose.footH[2] += 0.13 * swing + 0.012 * Math.sin(this.time * 2.1 + 1);
      pose.hips[0] += 0.22 * swing;
      pose.tail[1] = 0.3 * Math.sin(this.time * 1.7);
      tumbleX = -0.1 * swing;
      lift = HANG_LIFT;
      stiffness = 26;
    } else if (state === 'climb') {
      // Pulling himself up: first his arms bend and haul his chest to the edge with his knees tucking; then he leans
      // out over it and gets a foot up; then he stands.
      const f = Math.max(0, ctx.climbProgress ?? 1);
      pose = f < 0.45 ? blendPose(HANG, CLIMB_PULL, smoothstep(f / 0.3)) : f < 0.8 ? blendPose(CLIMB_PULL, CLIMB_MANTLE, smoothstep((f - 0.45) / 0.25)) : blendPose(CLIMB_MANTLE, LAND, smoothstep((f - 0.8) / 0.2));
      tumbleX = 0.5 * Math.sin(Math.min(1, f / 0.8) * Math.PI) ** 1.5;
      // The game lifts his feet to the top in the first part of the move; drawn that way he would shoot up like a cork.
      // He is drawn rising more evenly, so there is time to see the haul, then the press, then the knee coming up.
      lift = HANG_LIFT * (1 - smoothstep(f / 0.4)) + (smoothstep(f / 0.72) - climbRise(f)) * HANG_DROP;
      stiffness = 34;
      damping = 0.95;
    } else if (state === 'longjump') {
      // Stretched out flat, like a dive.
      pose = airPose(ctx.verticalSpeed, TUNING.jump.velocity, 0);
      tumbleX = 0.85;
      stiffness = 22;
    } else if (!grounded && (ctx.kickProgress ?? -1) >= 0 && (ctx.kickProgress as number) < 0.75) {
      // Kicking off a wall: the push first (legs driven out behind), then into the ordinary rise.
      const k = ctx.kickProgress as number;
      pose = blendPose(WALL_KICK, airPose(ctx.verticalSpeed, TUNING.jump.velocity, 0), smoothstep((k - 0.35) / 0.4));
      stiffness = 40;
      damping = 0.9;
    } else if (!grounded && ctx.onWall) {
      // Against a wall in the air: feet on it, ready to kick.
      pose = WALL_BRACE;
      stiffness = 34;
      damping = 0.9;
    } else if (!grounded) {
      const flip = ctx.flipProgress > 0 ? Math.sin(Math.min(1, ctx.flipProgress) * Math.PI) ** 0.6 : 0;
      pose = airPose(ctx.verticalSpeed, TUNING.jump.velocity, flip);
      tumbleX = -smoothstep(ctx.flipProgress) * Math.PI * 2;
      stiffness = 20;
    } else if (state === 'land') {
      pose = LAND;
      stiffness = 34;
      damping = 0.75;
    } else if (ctx.ice?.brake) {
      // (Dug in on the ice: the shudder of the shield's edge biting comes up through him.)
      pose = fullPose(ICE_BRAKE);
      pose.hipPos[1] += 0.008 * Math.sin(this.time * 55);
      pose.armH[0] += 0.04 * Math.sin(this.time * 61);
      tumbleX = -0.22;
      stiffness = 36;
      damping = 0.8;
    } else if (ctx.glide) {
      // (Gliding on ice: knees bent and arms out, as after a landing, held for as long as he glides.)
      pose = LAND;
      stiffness = 14;
      damping = 0.85;
    } else if (moving || (ctx.ice?.scrabble ?? 0) > 0.05) {
      const scr = ctx.ice?.scrabble ?? 0;
      const skid = ctx.ice?.skid ?? 0;
      // SCRABBLING: his feet go under him far faster than he does, not biting; he is bent forward over them and his
      // arms wheel. (The stride's own clock is hurried: see below.)
      if (scr > 0.05) this.phase += dt * Math.PI * 2 * 3.4 * scr;
      pose = locomotionPose(this.phase, Math.max(this.run, scr));
      if (scr > 0.05) {
        const wheel = this.time * 19;
        pose.chest[0] += 0.38 * scr;
        pose.hipPos[1] -= 0.05 * scr;
        pose.hipPos[2] -= 0.04 * scr;
        pose.head[0] -= 0.2 * scr;
        pose.armS[0] += 1.1 * scr * Math.sin(wheel);
        pose.armS[2] -= 0.5 * scr;
        pose.armH[0] += 1.1 * scr * Math.sin(wheel + 2.4);
        pose.armH[2] += 0.5 * scr;
        pose.tail[0] += 0.5 * scr;
        pose.tail[1] = 0.5 * scr * Math.sin(wheel * 0.6);
        pose.ears += 0.5 * scr;
      }
      // SKIDDING: sliding one way while he pushes another: feet together across the slide, leaned hard into the turn.
      if (Math.abs(skid) > 0.05 && scr < 0.6) {
        const k = Math.min(1, Math.abs(skid) * 1.3) * (1 - scr);
        pose = blendPose(pose, ICE_SKID, k);
        pose.hips[2] -= 0.4 * skid * k;
        pose.chest[2] -= 0.25 * skid * k;
        pose.hips[1] += 0.5 * skid * k;
        pose.head[1] -= 0.4 * skid * k;
      }
      stiffness = 30;
      damping = 0.9;
    } else {
      pose = idlePose(this.time, this.idleTime);
      stiffness = 15;
      damping = 0.8;
    }

    // Weapons on his back: arms hang relaxed, and a stow/draw motion reaches over the shoulder.
    // (Hanging and climbing need both paws: sword and shield go on his back for as long as it takes.)
    // (And carrying something, or throwing it: his paws are busy.)
    const armed = ctx.armed && state !== 'hang' && state !== 'climb' && !((ctx.carry ?? 0) > 0.2 || (ctx.throwT ?? -1) >= 0);
    this.sword.visible = armed && this.dress.gear;
    // (Riding, the shield is under his feet: not on his arm, nor on his back.)
    const riding = state === 'ride';
    const kicking = this.dismountT >= 0 && !riding;
    this.shieldPivot.visible = armed && this.dress.gear && !riding && !kicking && !this.bare;
    this.backSword.visible = !armed && this.dress.gear;
    this.backShield.visible = !armed && this.dress.gear && !riding && !this.bare;
    this.board.visible = (riding || kicking) && this.dress.gear;
    for (const g of this.boardGhosts) g.root.visible = false;
    this.board.scale.setScalar(this.boardScale);
    if (kicking) {
      // Stepping off: it comes up off the ground, tipping back upright, onto his arm.
      this.board.position.set(0, BOARD_Y, 0.01);
      this.board.rotation.set(0, 0, 0);
      this.boardRest.p.copy(this.board.position);
      this.boardRest.q.copy(this.board.quaternion);
      this.placeOf(this.armShield, this.boardAim.p, this.boardAim.q);
      this.swingBoard(this.dismountT / RIDE_DISMOUNT, this.boardRest, this.boardAim, 0, 0.1);
    }
    if (riding) {
      const r = ctx.ride ?? { steer: 0, flip: -1, air: false };
      const flip = r.flip >= 0 ? Math.min(1, r.flip) : 0;
      // It sits under his feet (which tuck up in the air), and in a kickflip turns once round its length, popping up.
      this.board.position.set(0, BOARD_Y + this.rideAir * 0.095 + Math.sin(flip * Math.PI) * 0.05, 0.01);
      // (He leans most of the way with the slope; the shield lies the whole way on it.)
      // (Grinding, it is turned across the way he is going: its middle is on the edge.)
      this.board.rotation.y = this.rideGrind * (Math.PI / 2);
      this.board.rotation.x = this.rideTiltX * (1 - RIDE_BODY_TILT);
      this.board.rotation.z = flip * Math.PI * 2 + this.rideTiltZ * (1 - RIDE_BODY_TILT);
      // Getting on: from where it was on him, thrown down in front of him and tipped forward onto its face, to
      // where it lies. It is not spun over on the way: he would not throw it so. (He is in the air over it: it is
      // on the ground, not hopping with him.)
      if (this.mountT >= 0) {
        this.boardRest.p.copy(this.board.position);
        this.boardRest.q.copy(this.board.quaternion);
        this.boardAim.p.copy(this.mountFromP);
        this.boardAim.q.copy(this.mountFromQ);
        this.swingBoard(this.mountT / (RIDE_MOUNT * RIDE_MOUNT_UNDER), this.boardAim, this.boardRest, 0, 0.24);
      }
    }
    const free = state === 'idle' || state === 'walk' || state === 'run' || state === 'land';
    this.relaxed = ease(this.relaxed, !armed && free ? 1 : 0, dt, 10);
    const reach = ctx.stowProgress >= 0 && free ? Math.sin(Math.min(1, ctx.stowProgress) * Math.PI) : 0;
    if ((this.relaxed > 0.01 || reach > 0.01) && state !== 'attack') {
      pose = fullPose(pose);
      const walkingFree = state === 'walk' || state === 'run';
      mixArms(pose, walkingFree ? unarmedArms(this.phase, this.run) : RELAXED_ARMS, this.relaxed);
      mixArms(pose, REACH_ARMS, reach);
    }
    // Carrying a crate over his head, and throwing it (world/lifting.ts): laid over whatever his legs are doing.
    {
      const carry = Math.max(0, Math.min(1, ctx.carry ?? 0));
      const thrown = ctx.throwT ?? -1;
      // (A pose of his own to change: what he was given may be one that is shared.)
      if (thrown >= 0 || carry > 0) pose = fullPose(pose);
      const spread = Math.max(0, Math.min(1, ctx.carrySpread ?? 0.5));
      if (thrown >= 0 && ctx.carryLight) {
        // A small thing: from the hug, both paws SHOVED straight out by a quarter of the way through, his chest going
        // after them; and let fall.
        const out = Math.sin(Math.min(1, thrown * 1.3) * Math.PI);
        mixArms(pose, HUG_ARMS, 1 - Math.min(1, thrown * 4));
        mixArms(pose, SHOVE_ARMS, out);
        pose.chest = [pose.chest[0] + 0.32 * out, pose.chest[1], pose.chest[2]];
        pose.hipPos = [pose.hipPos[0], pose.hipPos[1] - 0.02 * out, pose.hipPos[2] + 0.04 * out];
      } else if (thrown >= 0) {
        // (Up, snapped forward by a third of the way through, and let fall.)
        mixArms(pose, BRACE_ARMS, 1 - Math.min(1, thrown * 3));
        mixArms(pose, THROW_ARMS, Math.sin(Math.min(1, thrown * 1.2) * Math.PI));
      } else if (carry > 0) {
        const k = carry * carry * (3 - 2 * carry);
        if (ctx.carryLight) {
          // Hugged to his chest: he leans back a little against it, his chin over it.
          mixArms(pose, HUG_ARMS, k);
          mixArms(pose, HUG_WIDE_ARMS, k * spread);
          pose.chest = [pose.chest[0] - 0.14 * k, pose.chest[1], pose.chest[2]];
          pose.head = [pose.head[0] + 0.12 * k, pose.head[1], pose.head[2]];
        } else {
          // On his head: ducked under it, knees bent, and it rocks him a little as he walks.
          mixArms(pose, BRACE_ARMS, k);
          pose.hipPos = [pose.hipPos[0], pose.hipPos[1] - 0.035 * k, pose.hipPos[2]];
          pose.head = [pose.head[0] + 0.3 * k, pose.head[1] * (1 - k), pose.head[2]];
          pose.chest = [pose.chest[0] + 0.08 * k, pose.chest[1] * (1 - 0.6 * k), pose.chest[2]];
          pose.ears = (pose.ears ?? 0) + 0.5 * k;
        }
      }
    }

    if (ctx.act) {
      pose = fullPose(pose);
      // The head does most of a look; the chest follows a little, as it would.
      pose.head[1] += ctx.act.headYaw * 0.78;
      pose.head[0] += ctx.act.headPitch;
      pose.chest[1] += ctx.act.headYaw * 0.28;
      if (ctx.act.gesture && ctx.act.weight > 0) mixGesture(pose, GESTURES[ctx.act.gesture], ctx.act.weight);
      if (ctx.act.pose && ctx.act.weight > 0) mixGesture(pose, ctx.act.pose, ctx.act.weight, ctx.act.each);
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
    this.deadAmount = waking ? ease(this.deadAmount, waking.tip, dt, 9) : ease(this.deadAmount, state === 'dead' ? 1 : 0, dt, state === 'dead' ? 7 : 30);
    // Swimming along, he leans forward until he is nearly flat on the water.
    this.swimLean = ease(this.swimLean, state === 'swim' ? this.swimMove * 1.15 : 0, dt, state === 'swim' ? 6 : 12);
    this.tumble.rotation.x = tumbleX + this.swimLean - this.deadAmount * (Math.PI / 2);
    this.tumbleLift = ease(this.tumbleLift, lift - Math.abs(this.deadAmount) * 0.2, dt, 30);
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
    // On the shield he leans into his turns, a long way over in a carve.
    this.rideLean = ease(this.rideLean, state === 'ride' ? -(ctx.ride?.steer ?? 0) * 0.42 : 0, dt, 9);
    // ...and he and his shield lie to the slope under them: nose down going down it, tipped across it going across.
    const onSlope = state === 'ride' ? ctx.ride : state === 'slide' ? ctx.slide : null;
    this.rideTiltX = ease(this.rideTiltX, onSlope ? Math.atan(-(onSlope.along ?? 0)) : 0, dt, 14);
    this.rideTiltZ = ease(this.rideTiltZ, onSlope ? Math.atan(onSlope.across ?? 0) : 0, dt, 14);
    // (Sliding on his hide he lies all the way to the slope; standing on his shield, most of the way.)
    const bodyTilt = state === 'slide' ? 1 : RIDE_BODY_TILT;
    // (A spin on the shield: he and it go right round, about his own middle.)
    const spin = state === 'ride' && (ctx.ride?.spin ?? -1) >= 0 ? Math.min(1, ctx.ride!.spin!) * Math.PI * 2 : 0;
    this.lean.rotation.set(this.pitch + this.rideTiltX * bodyTilt, spin, this.bank + this.rideLean + this.rideTiltZ * bodyTilt);
    // (The hop onto his shield: lifted, stretched as he goes up and squashed as he comes down on it.)
    this.lean.position.y = this.hopY;
    this.lean.scale.set(1 / Math.sqrt(this.hopStretch), this.hopStretch, 1 / Math.sqrt(this.hopStretch));

    this.apply(ctx.planarSpeed);

    // His paws hold the edge: while he hangs, and through the pull-up until he lets go to stand.
    const f = ctx.climbProgress ?? -1;
    // (Past half-way his shoulders are above the edge by more than an arm: he lets go and brings his paws to his knees.)
    const holding = !!ctx.ledge && (state === 'hang' || (state === 'climb' && f < 0.5));
    this.gripAmount = ease(this.gripAmount, holding ? 1 : 0, dt, holding ? 40 : 16);
    if (ctx.ledge) this.gripAt.set(0, ctx.ledge.y, ctx.ledge.z);
    if (this.gripAmount > 0.01) this.plantPaws();
  }

  private gripAmount = 0;
  private readonly gripAt = new THREE.Vector3();

  /**
   * Puts both paws on the edge he is holding (gripAt, in the root's frame: y up from his feet, z the way he faces),
   * a little apart, by turning each arm at the shoulder and bending it at the elbow. Laid over whatever the pose asked
   * of the arms, by `gripAmount`.
   */
  private plantPaws(): void {
    this.root.updateMatrixWorld(true);
    const L = ARM_BONE;
    const tmp = this.gripTmp;
    for (const [arm, elbow, side] of [[this.armS, this.elbowS, -1], [this.armH, this.elbowH, 1]] as const) {
      // The paw's place on the edge, in the chest's own frame (where the shoulder lives).
      const target = tmp.t.set(side * 0.13, this.gripAt.y - 0.02, this.gripAt.z);
      this.root.localToWorld(target);
      this.chest.worldToLocal(target);
      const dir = target.sub(arm.position);
      const d = Math.min(L * 2 * 0.999, Math.max(0.05, dir.length()));
      dir.normalize();
      // Elbows point out to the side and down, a little back: the way arms bend when they haul a body up.
      const pole = tmp.pole.set(side * 0.9, -0.6, -0.5);
      const e = pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      const alpha = Math.acos(d / (2 * L)); // angle between the upper arm and the line to the paw
      const u = tmp.u.copy(dir).multiplyScalar(Math.cos(alpha)).addScaledVector(e, Math.sin(alpha)); // the upper arm
      const fore = tmp.f.copy(dir).multiplyScalar(Math.cos(alpha)).addScaledVector(e, -Math.sin(alpha)); // the forearm
      const bend = 2 * alpha;
      // The arm's own axes: -Y runs down the upper arm, and the forearm bends towards +Z.
      const z = bend > 0.02 ? tmp.z.copy(fore).addScaledVector(u, -Math.cos(bend)).normalize() : tmp.z.copy(e).negate();
      const y = tmp.y.copy(u).negate();
      const x = tmp.x.crossVectors(y, z).normalize();
      z.crossVectors(x, y);
      tmp.q.setFromRotationMatrix(tmp.m.makeBasis(x, y, z));
      arm.quaternion.slerp(tmp.q, this.gripAmount);
      elbow.rotation.x += (-bend - elbow.rotation.x) * this.gripAmount;
    }
  }

  private readonly gripTmp = {
    t: new THREE.Vector3(), pole: new THREE.Vector3(), u: new THREE.Vector3(), f: new THREE.Vector3(),
    x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(),
  };

  private readonly boardRest = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  private readonly boardAim = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  private readonly swingTmp = { p: new THREE.Vector3(), q: new THREE.Quaternion(), spin: new THREE.Quaternion(), m: new THREE.Matrix4(), s: new THREE.Vector3(), flat: BOARD_LIES.clone().invert() };
  private static readonly LONG = new THREE.Vector3(0, 0, 1);

  /**
   * Where one of his shields is, as the shield under his feet would have to be placed (in the `lean` group's own
   * space) to lie exactly on it. Worked out from the joints as they stand, with nothing drawn in between.
   */
  private placeOf(shield: THREE.Object3D | null, p: THREE.Vector3, q: THREE.Quaternion): void {
    const t = this.swingTmp;
    t.m.identity();
    for (let o: THREE.Object3D | null = shield; o && o !== this.lean; o = o.parent) {
      o.updateMatrix();
      t.m.premultiply(o.matrix);
    }
    t.m.decompose(p, q, t.s);
    // (The one under his feet is laid down and turned over by a turn of its own: take that out.)
    q.multiply(t.flat);
    // (`lean` is lifted and stretched by the hop; the shield is not.)
    p.y = p.y * this.hopStretch + this.hopY;
  }

  /** One place on the swing between two placings, `s` of the way (eased); `turn`: whole turns about its length on the way. */
  private swingAt(s: number, from: { p: THREE.Vector3; q: THREE.Quaternion }, to: { p: THREE.Vector3; q: THREE.Quaternion }, turn: number, out: number, p: THREE.Vector3, q: THREE.Quaternion): void {
    const e = smooth(s);
    p.lerpVectors(from.p, to.p, e);
    // (Out in front of him and round, not straight through his legs.)
    p.z += out * Math.sin(Math.PI * e);
    q.slerpQuaternions(from.q, to.q, e);
    q.multiply(this.swingTmp.spin.setFromAxisAngle(RatModel.LONG, turn * Math.PI * 2 * e));
  }

  /**
   * Draws the shield part of the way through a swing, with its smears behind it. It moves a long way in a few frames:
   * it is stretched along its length in the middle of the swing, and two pale copies trail where it has just been.
   */
  private swingBoard(s: number, from: { p: THREE.Vector3; q: THREE.Quaternion }, to: { p: THREE.Vector3; q: THREE.Quaternion }, turn: number, out: number): void {
    const t = this.swingTmp;
    const k = this.boardScale;
    // (Into `lean`'s own space, which the hop has lifted and stretched.)
    const place = (o: THREE.Object3D, at: number, stretch: number): void => {
      this.swingAt(at, from, to, turn, out, t.p, t.q);
      o.position.set(t.p.x, (t.p.y - this.hopY) / this.hopStretch, t.p.z);
      o.quaternion.copy(t.q);
      o.scale.set(k, k, k * stretch);
    };
    const c = Math.min(1, Math.max(0, s));
    const fast = Math.sin(Math.PI * c);
    place(this.board, c, 1 + 0.22 * fast);
    this.boardGhosts.forEach((g, i) => {
      const behind = c - 0.14 * (i + 1);
      g.root.visible = this.board.visible && c < 0.98 && behind > 0;
      if (g.root.visible) place(g.root, behind, 1 + 0.34 * fast);
    });
  }

  /** How far through getting on his shield he is (0..1), or -1; and through stepping off it. For the tests. */
  get mountProgress(): number {
    return this.mountT >= 0 ? this.mountT / RIDE_MOUNT : -1;
  }
  get dismountProgress(): number {
    return this.dismountT >= 0 ? this.dismountT / RIDE_DISMOUNT : -1;
  }
  /** Where the shield under his feet is drawn, in the model's own space above the ground (for the tests). */
  boardHeight(): number {
    return this.board.position.y * this.hopStretch + this.hopY;
  }
  get boardShown(): boolean {
    return this.board.visible;
  }
  get shieldOnArm(): boolean {
    return this.shieldPivot.visible;
  }
  get smearsShown(): number {
    return this.boardGhosts.filter((g) => g.root.visible).length;
  }
  get hopHeight(): number {
    return this.hopY;
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
    // (A long one never hangs: it is held out behind him as by a wind of its own, and waves wider. Hanging, it went
    // down through the floor.)
    const long = this.scarfLong - 1;
    this.scarfSegments[0].rotation.x = 0.35 + long * 0.32 + stream * (0.9 - long * 0.18) + Math.sin(this.time * rate) * (0.08 + stream * 0.12) * (1 + long * 0.3);
    this.scarfSegments[1].rotation.x = 0.1 + stream * 0.25 + Math.sin(this.time * rate - 1.2) * (0.12 + stream * 0.15) * (1 + long * 0.5);
    this.flowStreamer(this.lastDt);
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
