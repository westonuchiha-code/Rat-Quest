/**
 * Pose data and motion for the rat knight. Everything here is plain math, with no three.js.
 *
 * Conventions (the rat faces +Z, his left is +X):
 *  - The sword is in his right hand (the "S" side, at -X). The shield is on his left arm (the "H" side, at +X).
 *  - Angles are radians. Arms: x tilts the arm (negative lifts it forward), y swings it around the body's
 *    vertical axis (positive toward his left), z rolls it sideways (negative is outward for the sword arm,
 *    positive is outward for the shield arm). Elbows fold forward when negative.
 *  - The wrist turns the sword: at [0,0,0] the blade sticks out at a right angle to the forearm;
 *    x of about 1.4 lines the blade up with the forearm.
 *  - The shield stays upright and facing forward by itself whatever the arm does; its pose value only adds
 *    a tilt, a turn (positive toward his left) and a roll on top.
 *  - Feet are not angles. Each foot is a target position (x sideways, y height off the ground, z forward)
 *    and the model bends the hip and knee to reach it, so the feet stay planted when the hips move.
 */

export type V3 = [number, number, number];

export interface Pose {
  hipPos: V3; // pelvis offset from its standing spot: x sideways, y up, z forward
  hips: V3; // pelvis rotation
  chest: V3; // rotation of the upper body relative to the pelvis
  head: V3;
  armS: V3;
  elbowS: number;
  wrist: V3;
  armH: V3;
  elbowH: number;
  shield: V3;
  footS: V3;
  footH: V3;
  toeS: number; // extra foot pitch, positive points the toes down
  toeH: number;
  tail: V3; // x lifts the tail, y curls it sideways, z curls it up along its length
  ears: number; // positive pins the ears back
}

export const POSE_KEYS = [
  'hipPos', 'hips', 'chest', 'head', 'armS', 'elbowS', 'wrist', 'armH', 'elbowH', 'shield',
  'footS', 'footH', 'toeS', 'toeH', 'tail', 'ears',
] as const;

/** Combat-ready stance: shield side leading, knees soft, sword low at the side. */
export const STANCE: Pose = {
  hipPos: [0, -0.04, 0],
  hips: [0.04, -0.3, 0],
  chest: [0.1, 0.12, 0],
  head: [-0.1, 0.18, 0],
  armS: [0.25, 0, -0.3],
  elbowS: -0.75,
  wrist: [0.35, 0, 0],
  armH: [-0.55, 0.25, 0.25],
  elbowH: -1.15,
  shield: [0, 0.25, 0],
  footS: [-0.11, 0, -0.08],
  footH: [0.11, 0, 0.09],
  toeS: 0,
  toeH: 0,
  tail: [0, 0, 0],
  ears: 0,
};

/** Fills in missing fields from the stance and copies arrays, so callers never share them. */
export function fullPose(p: Partial<Pose>): Pose {
  const out = {} as Record<string, V3 | number>;
  for (const k of POSE_KEYS) {
    const v = p[k] ?? STANCE[k];
    out[k] = typeof v === 'number' ? v : ([v[0], v[1], v[2]] as V3);
  }
  return out as unknown as Pose;
}

/** Blends two poses. t = 0 gives a, t = 1 gives b. */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const k = Math.min(1, Math.max(0, t));
  const out = {} as Record<string, V3 | number>;
  for (const key of POSE_KEYS) {
    const va = a[key];
    const vb = b[key];
    if (typeof va === 'number') out[key] = va + ((vb as number) - va) * k;
    else {
      const wb = vb as V3;
      out[key] = [va[0] + (wb[0] - va[0]) * k, va[1] + (wb[1] - va[1]) * k, va[2] + (wb[2] - va[2]) * k];
    }
  }
  return out as unknown as Pose;
}

export function smoothstep(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

/** A smooth on/off window: 0 before a, 1 between, 0 after b, with soft edges. */
function win(t: number, a: number, b: number, fade = 0.25): number {
  return smoothstep((t - a) / fade) * (1 - smoothstep((t - (b - fade)) / fade));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function frac(x: number): number {
  return x - Math.floor(x);
}

// ---------------------------------------------------------------------------------------------
// Combat clips
// ---------------------------------------------------------------------------------------------

export interface Key {
  t: number; // seconds into the clip
  pose: Partial<Pose>;
}

export interface Clip {
  duration: number;
  activeStart: number; // when the sword can hit, seconds into the clip
  activeEnd: number;
  chainAt: number; // from this time a queued press starts the next hit, and a dodge can cancel the recovery
  lunge: { from: number; to: number; speed: number }; // forward step during the swing
  damage: number;
  reach: number; // how far the hit reaches, from the rat's centre to the near edge of the target
  arc: number; // half-angle of the hit, radians
  keys: Key[];
}

/**
 * Three-hit combo: a slash from his right to his left, a backhand coming back, and an overhead chop.
 * Each one winds up with the hips and chest, strikes with the arm following, and holds the follow-through.
 */
export const ATTACK_CLIPS: Clip[] = [
  {
    duration: 0.46,
    activeStart: 0.14,
    activeEnd: 0.26,
    chainAt: 0.3,
    lunge: { from: 0.08, to: 0.22, speed: 3.4 },
    damage: 1,
    reach: 1.05,
    arc: 1.35,
    keys: [
      { t: 0, pose: STANCE },
      {
        // Wind up: turn away, sword arm drawn back at shoulder height.
        t: 0.1,
        pose: {
          hipPos: [0, -0.07, -0.02], hips: [0.04, -0.6, 0], chest: [0.05, -0.55, 0], head: [-0.05, 0.9, 0],
          armS: [-1.25, -1.5, -0.2], elbowS: -1.0, wrist: [1.2, 0, 0],
          armH: [-0.7, 0.3, 0.35], elbowH: -1.3, tail: [0.1, 0.5, 0],
        },
      },
      {
        // Strike: hips lead, the arm whips through in front of the chest.
        t: 0.18,
        pose: {
          hipPos: [0, -0.08, 0.06], hips: [0.06, 0.1, 0], chest: [0.12, 0.3, 0], head: [-0.05, -0.3, 0],
          armS: [-1.45, -0.2, -0.25], elbowS: -0.12, wrist: [1.35, 0, 0],
          armH: [-0.3, 0.2, 0.5], elbowH: -1.2, footH: [0.11, 0, 0.17], tail: [0.1, -0.3, 0],
        },
      },
      {
        t: 0.26,
        pose: {
          hipPos: [0, -0.08, 0.07], hips: [0.06, 0.35, 0], chest: [0.12, 0.7, 0], head: [-0.05, -0.85, 0],
          armS: [-1.4, 0.8, -0.3], elbowS: -0.2, wrist: [1.3, 0, 0],
          armH: [0.1, 0.1, 0.6], elbowH: -1.0, footH: [0.11, 0, 0.17], tail: [0.1, -0.7, 0],
        },
      },
      {
        // Follow-through: held for a beat.
        t: 0.33,
        pose: {
          hipPos: [0, -0.07, 0.06], hips: [0.05, 0.4, 0], chest: [0.1, 0.82, 0], head: [-0.05, -0.95, 0],
          armS: [-1.3, 1.0, -0.3], elbowS: -0.55, wrist: [1.2, 0, 0],
          armH: [0.15, 0.1, 0.6], elbowH: -1.0, footH: [0.11, 0, 0.16], tail: [0.05, -0.5, 0],
        },
      },
      { t: 0.46, pose: STANCE },
    ],
  },
  {
    duration: 0.46,
    activeStart: 0.13,
    activeEnd: 0.25,
    chainAt: 0.3,
    lunge: { from: 0.06, to: 0.2, speed: 3.4 },
    damage: 1,
    reach: 1.05,
    arc: 1.35,
    keys: [
      {
        // Starts from the end of hit 1: coiled to his left.
        t: 0,
        pose: {
          hipPos: [0, -0.07, 0.04], hips: [0.05, 0.4, 0], chest: [0.1, 0.8, 0], head: [-0.05, -0.9, 0],
          armS: [-1.3, 1.0, -0.3], elbowS: -0.9, wrist: [1.2, 0, 0], armH: [0.1, 0.1, 0.6], elbowH: -1.0,
        },
      },
      {
        t: 0.08,
        pose: {
          hipPos: [0, -0.08, 0.02], hips: [0.05, 0.5, 0], chest: [0.1, 0.9, 0], head: [-0.05, -1.0, 0],
          armS: [-1.35, 1.1, -0.3], elbowS: -1.1, wrist: [1.2, 0, 0], armH: [0.1, 0.1, 0.6], elbowH: -1.0,
          tail: [0.1, -0.5, 0],
        },
      },
      {
        t: 0.15,
        pose: {
          hipPos: [0, -0.08, 0.07], hips: [0.06, 0, 0], chest: [0.12, 0.05, 0], head: [-0.05, 0, 0],
          armS: [-1.45, 0.1, -0.3], elbowS: -0.1, wrist: [1.35, 0, 0], armH: [-0.5, 0.3, 0.4], elbowH: -1.3,
          footS: [-0.11, 0, 0.1], footH: [0.11, 0, -0.04], tail: [0.1, 0.3, 0],
        },
      },
      {
        t: 0.23,
        pose: {
          hipPos: [0, -0.08, 0.08], hips: [0.06, -0.45, 0], chest: [0.12, -0.6, 0], head: [-0.05, 0.9, 0],
          armS: [-1.4, -1.0, -0.3], elbowS: -0.15, wrist: [1.3, 0, 0], armH: [-0.8, 0.5, 0.3], elbowH: -1.4,
          footS: [-0.11, 0, 0.12], footH: [0.11, 0, -0.05], tail: [0.1, 0.7, 0],
        },
      },
      {
        t: 0.31,
        pose: {
          hipPos: [0, -0.07, 0.07], hips: [0.05, -0.5, 0], chest: [0.1, -0.75, 0], head: [-0.05, 1.05, 0],
          armS: [-1.3, -1.4, -0.3], elbowS: -0.4, wrist: [1.2, 0, 0], armH: [-0.8, 0.5, 0.3], elbowH: -1.4,
          footS: [-0.11, 0, 0.12], footH: [0.11, 0, -0.05], tail: [0.05, 0.5, 0],
        },
      },
      { t: 0.46, pose: STANCE },
    ],
  },
  {
    duration: 0.78,
    activeStart: 0.28,
    activeEnd: 0.4,
    chainAt: 0.6,
    lunge: { from: 0.16, to: 0.32, speed: 5.2 },
    damage: 2,
    reach: 1.3,
    arc: 0.8,
    keys: [
      { t: 0, pose: STANCE },
      {
        // Wind up: sink, lean back, sword raised behind the head.
        t: 0.14,
        pose: {
          hipPos: [0, -0.11, -0.03], hips: [-0.1, -0.1, 0], chest: [-0.3, 0, 0], head: [0.2, 0, 0],
          armS: [-2.75, 0, -0.25], elbowS: -1.0, wrist: [0.5, 0, 0],
          armH: [-1.3, 0.2, 0.3], elbowH: -0.6, tail: [-0.3, 0, 0], ears: 0.3,
        },
      },
      {
        // Hop: body stretched at the top, sword at full height.
        t: 0.24,
        pose: {
          hipPos: [0, 0.07, 0.04], hips: [-0.05, 0, 0], chest: [-0.25, 0, 0], head: [0.15, 0, 0],
          armS: [-2.9, 0, -0.2], elbowS: -0.5, wrist: [0.9, 0, 0],
          armH: [-1.0, 0.2, 0.4], elbowH: -0.6,
          footS: [-0.11, 0.07, -0.1], footH: [0.11, 0.1, 0.1], toeS: 0.5, toeH: 0.3, tail: [0.5, 0, 0.1], ears: 0.4,
        },
      },
      {
        // Chop: the whole body folds over the blade.
        t: 0.31,
        pose: {
          hipPos: [0, -0.13, 0.1], hips: [0.25, 0, 0], chest: [0.55, 0, 0], head: [-0.45, 0, 0],
          armS: [-0.95, 0.1, -0.15], elbowS: -0.1, wrist: [1.45, 0, 0],
          armH: [0.5, 0, 0.5], elbowH: -0.8,
          footS: [-0.12, 0, -0.14], footH: [0.12, 0, 0.2], tail: [0.7, 0, 0.15],
        },
      },
      {
        t: 0.4,
        pose: {
          hipPos: [0, -0.15, 0.1], hips: [0.28, 0, 0], chest: [0.62, 0, 0], head: [-0.5, 0, 0],
          armS: [-0.55, 0.1, -0.15], elbowS: -0.05, wrist: [1.5, 0, 0],
          armH: [0.6, 0, 0.5], elbowH: -0.8,
          footS: [-0.12, 0, -0.14], footH: [0.12, 0, 0.2], tail: [0.8, 0, 0.15],
        },
      },
      {
        // Recovery: stays low. This is the part an enemy can punish.
        t: 0.58,
        pose: {
          hipPos: [0, -0.12, 0.08], hips: [0.2, 0, 0], chest: [0.45, 0, 0], head: [-0.35, 0, 0],
          armS: [-0.5, 0.1, -0.2], elbowS: -0.2, wrist: [1.4, 0, 0],
          armH: [0.4, 0, 0.45], elbowH: -0.9,
          footS: [-0.12, 0, -0.12], footH: [0.12, 0, 0.18], tail: [0.4, 0, 0.1],
        },
      },
      { t: 0.78, pose: STANCE },
    ],
  },
];

/** Samples a list of keys at time t, with smooth interpolation between them. */
export function samplePose(keys: Key[], t: number): Pose {
  if (t <= keys[0].t) return fullPose(keys[0].pose);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t < b.t) return blendPose(fullPose(a.pose), fullPose(b.pose), smoothstep((t - a.t) / (b.t - a.t)));
  }
  return fullPose(keys[keys.length - 1].pose);
}

// ---------------------------------------------------------------------------------------------
// Static poses
// ---------------------------------------------------------------------------------------------

/** Guard: low and braced, shield out in front of the body, sword cocked back at the hip. */
export const GUARD: Pose = fullPose({
  hipPos: [0, -0.1, 0],
  hips: [0.08, -0.5, 0],
  chest: [0.2, 0.15, 0],
  head: [-0.2, 0.35, 0],
  armS: [0.55, 0, -0.35],
  elbowS: -1.0,
  wrist: [0.5, 0, 0],
  armH: [-1.0, -0.45, 0.1],
  elbowH: -0.75,
  shield: [0, 0.45, 0],
  footS: [-0.13, 0, -0.14],
  footH: [0.12, 0, 0.14],
  tail: [0.15, 0, 0],
  ears: 0.35,
});
/**
 * THE PERFECT GUARD'S FRAMES (2026-11-24). For as long as a blow caught would be a PERFECT guard (the first instants
 * after the shield goes up), the shield is PUNCHED OUT in front of him, arm nearly straight, his weight behind it:
 * the frames that count are the frames that look like something. Then it settles back into the guard.
 */
export const GUARD_SNAP: Pose = fullPose({
  hipPos: [0, -0.12, 0.07],
  hips: [0.1, -0.35, 0],
  chest: [0.34, 0.3, 0],
  head: [-0.28, 0.2, 0],
  armS: [0.75, 0, -0.45],
  elbowS: -1.1,
  wrist: [0.5, 0, 0],
  armH: [-1.5, -0.2, 0.02],
  elbowH: -0.18,
  shield: [0, 0.3, 0],
  footS: [-0.13, 0, -0.22],
  footH: [0.12, 0, 0.24],
  tail: [0.3, 0, 0],
  ears: 0.6,
});
/** HIS GUARD BROKEN: thrown back off his feet's line, the shield flung out wide and low, his chest open, head back. */
export const GUARD_BROKEN: Pose = fullPose({
  hipPos: [0, -0.06, -0.08],
  hips: [-0.12, 0.2, 0],
  chest: [-0.34, 0.45, 0.08],
  head: [-0.4, -0.2, 0],
  armS: [-0.5, 0.3, -0.5],
  elbowS: -0.6,
  wrist: [0.4, 0, 0],
  armH: [-0.7, 1.5, 0.5],
  elbowH: -0.2,
  shield: [0.5, -0.6, 0],
  footS: [-0.13, 0, -0.2],
  footH: [0.12, 0, 0.08],
  tail: [0.4, 0.5, 0],
  ears: -0.3,
});
/** A blow TURNED by a perfect guard: the shield swept out and aside with it, his chest opened after it, sword arm cocked for the answer. */
export const PARRY_SWEEP: Pose = fullPose({
  hipPos: [0, -0.09, 0.03],
  hips: [0.05, 0.25, 0],
  chest: [0.1, 0.75, 0],
  head: [-0.1, -0.5, 0],
  armS: [-0.9, -1.2, -0.2],
  elbowS: -1.0,
  wrist: [1.1, 0, 0],
  armH: [-1.1, 1.15, 0.35],
  elbowH: -0.3,
  shield: [0, -0.4, 0],
  footS: [-0.13, 0, -0.16],
  footH: [0.12, 0, 0.18],
  tail: [0.1, -0.6, 0],
  ears: 0.2,
});


/** Tucked into a ball for the roll. The model turns the whole body over. */
export const ROLL_TUCK: Pose = fullPose({
  hipPos: [0, -0.08, -0.18],
  hips: [0.5, 0, 0],
  chest: [0.9, 0, 0],
  head: [0.6, 0, 0],
  armS: [-0.9, 0.3, -0.1],
  elbowS: -1.9,
  wrist: [0.2, 0, 0],
  armH: [-0.9, 0.2, 0.2],
  elbowH: -1.9,
  shield: [0, 0.25, 0],
  footS: [-0.08, 0.13, 0.0],
  footH: [0.08, 0.13, 0.0],
  tail: [-0.8, 0, -0.25],
  ears: 0.6,
});

/** Backstep: a hop back with the body leaning away and the shield up. */
export const BACKSTEP: Pose = fullPose({
  hipPos: [0, -0.02, -0.05],
  hips: [-0.15, -0.3, 0],
  chest: [-0.2, 0.1, 0],
  head: [0.15, 0.2, 0],
  armS: [-0.3, -0.5, -0.5],
  elbowS: -0.6,
  wrist: [0.8, 0, 0],
  armH: [-1.0, -0.3, 0.2],
  elbowH: -0.9,
  shield: [0, 0.3, 0],
  footS: [-0.11, 0.08, 0.06],
  footH: [0.11, 0.05, 0.16],
  toeS: 0.4,
  toeH: 0.4,
  tail: [0.5, 0, 0.1],
  ears: 0.5,
});

/** Going up: one knee driven high, the other leg trailing, sword arm swung back, eyes up. */
const JUMP_RISE: Pose = fullPose({
  hipPos: [0, 0.02, 0],
  hips: [-0.12, 0, 0],
  chest: [-0.18, 0.15, 0],
  head: [-0.25, -0.1, 0],
  armS: [0.75, 0, -0.5],
  elbowS: -0.5,
  wrist: [0.7, 0, 0],
  armH: [-1.2, 0.3, 0.5],
  elbowH: -0.9,
  shield: [0, 0.25, 0],
  footS: [-0.1, 0.03, -0.12],
  footH: [0.1, 0.2, 0.13],
  toeS: 0.9,
  toeH: 0.3,
  tail: [-0.5, 0, 0.12],
  ears: 0.5,
});

/** Hanging at the top of the arc: knees tucked, arms out. */
const JUMP_APEX: Pose = fullPose({
  hipPos: [0, 0, 0],
  hips: [0.1, 0, 0],
  chest: [0.12, 0, 0],
  head: [-0.05, 0, 0],
  armS: [-0.4, -0.3, -0.9],
  elbowS: -0.5,
  wrist: [0.8, 0, 0],
  armH: [-0.6, 0.3, 0.9],
  elbowH: -0.8,
  footS: [-0.11, 0.14, 0.06],
  footH: [0.11, 0.17, 0.1],
  toeS: 0.3,
  toeH: 0.3,
  tail: [0.1, 0, 0.2],
  ears: 0.1,
});

/** Coming down: arms thrown up, legs reaching for the ground, ears and tail lifted by the air. */
const JUMP_FALL: Pose = fullPose({
  hipPos: [0, 0, 0],
  hips: [0.12, 0, 0],
  chest: [0.2, 0, 0],
  head: [0.1, 0, 0],
  armS: [-1.6, -0.5, -1.0],
  elbowS: -0.6,
  wrist: [0.9, 0, 0],
  armH: [-1.7, 0.4, 1.0],
  elbowH: -0.7,
  footS: [-0.13, 0.03, -0.05],
  footH: [0.13, 0.07, 0.09],
  toeS: 0.6,
  toeH: 0.5,
  tail: [0.9, 0, 0.18],
  ears: -0.5,
});

/** Ball tuck for the double-jump flip. */
const FLIP_TUCK: Pose = fullPose({
  hipPos: [0, 0, -0.14],
  hips: [0.45, 0, 0],
  chest: [0.8, 0, 0],
  head: [0.5, 0, 0],
  armS: [-0.8, -0.2, -0.5],
  elbowS: -1.6,
  wrist: [0.6, 0, 0],
  armH: [-0.9, 0.2, 0.3],
  elbowH: -1.8,
  footS: [-0.08, 0.2, 0.02],
  footH: [0.08, 0.2, 0.02],
  tail: [-0.6, 0, -0.2],
  ears: 0.6,
});

/** Landing: deep knee bend, chest over the knees, arms out for balance. */
/** Air attack, hanging: sword arm raised overhead, ready to drop. */
/** In the air against a wall he is facing: feet planted on it, knees bent, leaning back off it, ready to kick away. */
export const WALL_BRACE: Pose = fullPose({
  hipPos: [0, 0.02, -0.06],
  hips: [-0.35, 0, 0],
  chest: [-0.1, 0, 0],
  head: [-0.3, 0, 0],
  armS: [-0.9, 0, -0.7],
  elbowS: -0.9,
  wrist: [0.5, 0, 0],
  armH: [-1.3, 0.2, 0.3],
  elbowH: -1.2,
  footS: [-0.1, 0.2, 0.2],
  footH: [0.1, 0.27, 0.22],
  toeS: -0.6,
  toeH: -0.6,
  tail: [0.4, 0, -0.2],
  ears: 0.2,
});
/** The push of a wall kick (the wall is behind him now): both legs driven out straight behind and below, body flung long, arms thrown up. */
export const WALL_KICK: Pose = fullPose({
  hipPos: [0, 0.03, 0.03],
  hips: [0.3, 0, 0],
  chest: [-0.25, 0, 0],
  head: [-0.25, 0, 0],
  armS: [-2.3, -0.2, -0.6],
  elbowS: -0.3,
  wrist: [0.6, 0, 0],
  armH: [-2.2, 0.3, 0.6],
  elbowH: -0.5,
  footS: [-0.08, 0.0, -0.2],
  footH: [0.08, 0.03, -0.14],
  toeS: 1.1,
  toeH: 1.1,
  tail: [0.2, 0, -0.3],
  ears: 0.5,
});

export const PLUNGE_WIND: Pose = fullPose({
  // Hanging in the air for a beat: back arched, knees tucked, the sword thrown up as high as his arm goes, blade up over
  // his head and tipped back, ready to be driven down. His shield arm is flung out to the side for balance.
  hipPos: [0, 0.03, 0],
  hips: [-0.2, 0, 0],
  chest: [-0.35, 0, 0],
  head: [0.3, 0, 0],
  armS: [-3.0, 0, 0.12],
  elbowS: -0.12,
  wrist: [1.75, 0, 0],
  armH: [-0.7, 0.3, 1.0],
  elbowH: -0.9,
  shield: [0, 0.25, 0],
  footS: [-0.1, 0.2, -0.12],
  footH: [0.1, 0.24, 0.02],
  toeS: 0.7,
  toeH: 0.7,
  tail: [1.0, 0, 0.3],
  ears: -0.4,
});

/** Air attack, diving: arm straight down at his side with the blade pointing down past his feet, legs together. */
export const PLUNGE_DIVE: Pose = fullPose({
  // Coming down: the sword straight down under him at the end of a straight arm, the other paw on the hilt, his body
  // stretched out long behind it and his legs trailing.
  hipPos: [0, 0.02, 0],
  hips: [0.1, 0, 0],
  chest: [0.2, 0, 0],
  head: [0.45, 0, 0],
  armS: [-1.1, 0, 0.25],
  elbowS: -0.7,
  wrist: [3.3, 0, 0],
  armH: [-0.5, 0.3, 0.7],
  elbowH: -0.9,
  shield: [0, 0.25, 0],
  footS: [-0.06, 0.14, -0.16],
  footH: [0.06, 0.18, -0.1],
  toeS: 1.0,
  toeH: 1.0,
  tail: [1.2, 0, 0.3],
  ears: 0.6,
});

/** Air attack, landed: crouched with the blade driven into the ground. */
export const PLUNGE_LAND: Pose = fullPose({
  // Landed: down on one knee over the sword, which stands point-down in the ground in front of him, both paws on it.
  hipPos: [0, -0.15, -0.02],
  hips: [0.15, 0, 0],
  chest: [0.35, 0, 0],
  head: [-0.2, 0, 0],
  armS: [-1.95, 0, 0.2],
  elbowS: -0.85,
  wrist: [3.55, 0, 0],
  armH: [-0.6, 0.35, 0.8],
  elbowH: -1.0,
  footS: [-0.15, 0, -0.14],
  footH: [0.15, 0, 0.14],
  tail: [0.6, 0, 0],
  ears: 0.5,
});

export const LAND: Pose = fullPose({
  hipPos: [0, -0.15, 0],
  hips: [0.2, -0.15, 0],
  chest: [0.35, 0.05, 0],
  head: [-0.3, 0.1, 0],
  armS: [-0.1, -0.2, -0.8],
  elbowS: -0.7,
  wrist: [0.6, 0, 0],
  armH: [-0.5, 0.3, 0.7],
  elbowH: -1.0,
  footS: [-0.14, 0, -0.07],
  footH: [0.14, 0, 0.09],
  tail: [0.5, 0, 0.1],
  ears: 0.4,
});

/** Knocked back by a hit. */
export const HURT: Pose = fullPose({
  hipPos: [0, -0.06, -0.06],
  hips: [-0.25, 0.3, 0],
  chest: [-0.45, 0.3, 0.15],
  head: [-0.4, -0.3, 0.2],
  armS: [-0.9, -0.9, -0.9],
  elbowS: -0.5,
  wrist: [0.6, 0, 0.5],
  armH: [-0.2, 0.2, 1.1],
  elbowH: -0.6,
  footS: [-0.13, 0, -0.16],
  footH: [0.12, 0.05, 0.1],
  toeH: -0.3,
  tail: [0.9, 0.4, 0.2],
  ears: 0.8,
});

/** Flat out. The model lays the whole body down on its back. */
export const DEAD: Pose = fullPose({
  hipPos: [0, 0, 0],
  hips: [0, 0, 0],
  chest: [-0.1, 0, 0.1],
  head: [-0.3, 0.6, 0],
  armS: [-0.3, 0, -1.3],
  elbowS: -0.3,
  wrist: [0.4, 0, 0],
  armH: [-0.2, 0, 1.2],
  elbowH: -0.4,
  footS: [-0.16, 0.02, 0.03],
  footH: [0.15, 0.02, 0.05],
  toeS: 0.7,
  toeH: 0.7,
  // He lies on his back: the tail is laid along the floor between his feet (left as it was, it hung down through the floor and was gone).
  tail: [-1.07, 0.1, -0.08],
  ears: 0.9,
});

/** In the air: blends rise, apex and fall by vertical speed, then tucks for a flip. */
export function airPose(verticalSpeed: number, jumpSpeed: number, flip: number): Pose {
  const v = Math.max(-1, Math.min(1, verticalSpeed / jumpSpeed));
  const base = v >= 0 ? blendPose(JUMP_APEX, JUMP_RISE, smoothstep(v * 1.4)) : blendPose(JUMP_APEX, JUMP_FALL, smoothstep(-v * 1.6));
  return flip > 0 ? blendPose(base, FLIP_TUCK, flip) : base;
}

// ---------------------------------------------------------------------------------------------
// Walk and run cycle
// ---------------------------------------------------------------------------------------------

/** Path of one foot through a stride. u runs 0..1: planted and sliding back first, then lifted and swung forward. */
function footPath(u: number, side: number, stride: number, lift: number, stanceFrac: number, out: V3): number {
  out[0] = side * 0.1;
  if (u < stanceFrac) {
    const k = u / stanceFrac;
    out[1] = 0;
    out[2] = stride * (1 - 2 * k);
    return k > 0.75 ? (k - 0.75) * 2.4 : 0; // heel peels up just before the foot leaves the ground
  }
  const k = (u - stanceFrac) / (1 - stanceFrac);
  out[1] = lift * Math.sin(Math.PI * k);
  out[2] = -stride + 2 * stride * smoothstep(k);
  return 0.6 * (1 - k) + (k > 0.7 ? -(k - 0.7) * 1.4 : 0); // toes trail early in the swing, lift before landing
}

/**
 * Walk and run.
 * @param phase stride phase in radians
 * @param run 0 for a walk, 1 for a full run
 */
export function locomotionPose(phase: number, run: number): Pose {
  const p = fullPose({});
  const c = Math.cos(phase);
  const u = frac(phase / (Math.PI * 2));
  const stride = lerp(0.12, 0.23, run);
  const liftH = lerp(0.07, 0.17, run);
  const stanceFrac = lerp(0.55, 0.4, run);

  p.toeS = footPath(u, -1, stride, liftH, stanceFrac, p.footS);
  p.toeH = footPath(frac(u + 0.5), 1, stride, liftH, stanceFrac, p.footH);

  // Hips: drop a little, bob twice per stride, sway over the planted foot, and turn with the leading leg.
  const bob = Math.cos(phase * 2 - 0.6);
  p.hipPos = [0.015 * Math.sin(phase), lerp(-0.035, -0.06, run) + bob * lerp(0.01, 0.028, run), 0];
  const lean = lerp(0.05, 0.3, run);
  const twist = lerp(0.12, 0.22, run);
  p.hips = [lean * 0.35, twist * c, 0.05 * Math.sin(phase)];
  // The chest counter-rotates against the hips, and the head stays level and pointed ahead.
  p.chest = [lean * 0.65, -twist * 1.7 * c, -0.04 * Math.sin(phase)];
  p.head = [-lean * 0.75 + 0.03 * bob, twist * 0.7 * c, 0];

  // Arms swing against the legs. In a run the sword trails low behind him and the shield tucks in.
  const swing = lerp(0.35, 0.6, run);
  p.armS = [lerp(0.15, 0.55, run) + swing * c, 0, lerp(-0.25, -0.4, run)];
  p.elbowS = lerp(-0.7, -0.55, run) - 0.25 * Math.max(0, -c);
  p.wrist = [lerp(0.45, 2.4, run), 0, 0];
  p.armH = [lerp(-0.5, -0.35, run) - swing * 0.55 * c, 0.25, 0.25];
  p.elbowH = lerp(-1.15, -1.45, run) - 0.15 * c;
  p.shield = [0, 0.25, 0];

  p.tail = [lerp(0.05, 0.35, run), 0.25 * Math.sin(phase - 0.8), lerp(0, 0.06, run)];
  p.ears = lerp(0, 0.55, run) + 0.08 * bob;
  return p;
}

/**
 * Swimming. `move` is 0 when treading water and 1 when swimming along.
 * Treading: upright, hands sculling in front, feet pedalling under the surface, a gentle bob.
 * Swimming: a crawl, with big alternating arm strokes, a flutter kick, and the head held up out of the water.
 */
export function swimPose(phase: number, move: number): Pose {
  const p = fullPose({});
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const m = Math.min(1, Math.max(0, move));

  // Hips bob with the water; the body is steadier when swimming along.
  p.hipPos = [0, lerp(0.02 * s, 0.015 * Math.sin(phase * 2), m), 0];
  p.hips = [lerp(0.05, 0.05, m), lerp(0.1 * s, 0.08 * s, m), 0.04 * c];
  p.chest = [lerp(0.08, 0.1, m), lerp(-0.1 * s, -0.22 * s, m), 0];
  p.head = [lerp(0.0 + 0.05 * c, -0.55, m), lerp(0.1 * s, 0.1 * s, m), 0];

  // Arms. Treading: small circles out in front. Swimming: long strokes, one arm reaching while the other pulls.
  const tx = -0.95 + 0.4 * s;
  const ty = -0.95 - 0.4 * s;
  const sx = -1.55 + 1.15 * s;
  const sy = -1.55 - 1.15 * s;
  p.armS = [lerp(tx, sx, m), 0, lerp(-0.55, -0.35, m)];
  p.armH = [lerp(ty, sy, m), 0, lerp(0.55, 0.35, m)];
  p.elbowS = lerp(-0.9 - 0.3 * c, -0.45 - 0.55 * Math.max(0, -s), m);
  p.elbowH = lerp(-0.9 + 0.3 * c, -0.45 - 0.55 * Math.max(0, s), m);
  p.wrist = [0, 0, 0];
  p.shield = [0, 0, 0];

  // Legs: pedal while treading, flutter-kick when swimming.
  const kick = lerp(1, 2, m);
  const lift = lerp(0.1, 0.06, m);
  p.footS = [-0.11, lift + lift * Math.sin(phase * kick), lerp(0.12, 0.16, m) * Math.cos(phase * kick)];
  p.footH = [0.11, lift - lift * Math.sin(phase * kick), -lerp(0.12, 0.16, m) * Math.cos(phase * kick)];
  p.toeS = 0.5;
  p.toeH = 0.5;

  p.tail = [lerp(0.2, 0.05, m), 0.35 * Math.sin(phase - 0.8), 0];
  p.ears = lerp(0.1, 0.7, m);
  return p;
}

/** Arms for walking or running with empty hands: loose, swinging against the legs, elbows pumping in a run. */
export function unarmedArms(phase: number, run: number): Pose {
  const p = fullPose({});
  const c = Math.cos(phase);
  const swing = lerp(0.6, 1.0, run);
  const bend = lerp(0.3, 1.25, run);
  p.armS = [0.05 + swing * c, 0, lerp(-0.12, -0.2, run)];
  p.elbowS = -bend - 0.4 * Math.max(0, -c) * (0.6 + run);
  p.armH = [0.05 - swing * c, 0, lerp(0.12, 0.2, run)];
  p.elbowH = -bend - 0.4 * Math.max(0, c) * (0.6 + run);
  p.wrist = [0.2, 0, 0];
  p.shield = [0, 0, 0];
  return p;
}

// ---------------------------------------------------------------------------------------------
// Idle
// ---------------------------------------------------------------------------------------------

const FIDGET_DELAY = 3.2; // seconds of standing still before the first fidget
const FIDGET_GAP = 1.6; // pause between fidgets
const FIDGET_LENGTHS = [3.4, 3.3, 2.4, 3.2];
const FIDGET_LOOP = FIDGET_LENGTHS.reduce((a, b) => a + b + FIDGET_GAP, 0);

function addV(v: V3, x: number, y: number, z: number): void {
  v[0] += x;
  v[1] += y;
  v[2] += z;
}

function mixV(v: V3, target: V3, k: number): void {
  v[0] += (target[0] - v[0]) * k;
  v[1] += (target[1] - v[1]) * k;
  v[2] += (target[2] - v[2]) * k;
}

/** Looks left, sniffs the air, looks right, with an ear flick. */
function fidgetLook(t: number, p: Pose): void {
  const left = win(t, 0.1, 1.5, 0.3);
  const right = win(t, 1.7, 3.2, 0.3);
  const yaw = 0.85 * left - 0.85 * right;
  addV(p.head, 0, yaw, 0);
  addV(p.chest, 0, yaw * 0.3, 0);
  addV(p.hips, 0, yaw * 0.1, 0);
  const sniff = win(t, 0.6, 1.3, 0.12);
  addV(p.head, -0.12 * sniff + 0.05 * Math.sin(t * 30) * sniff, 0, 0);
  p.ears += -0.5 * win(t, 0.5, 0.75, 0.1) - 0.5 * win(t, 2.0, 2.25, 0.1);
  addV(p.tail, 0, 0.5 * Math.sin(t * 2.2) * win(t, 0, 3.4, 0.4), 0);
}

/** Spins the sword in his hand, then rests the blade on his shoulder for a moment. */
function fidgetFlourish(t: number, p: Pose): void {
  const up = win(t, 0.05, 1.5, 0.3);
  mixV(p.armS, [-0.95, -0.35, -0.35], up);
  p.elbowS += (-1.0 - p.elbowS) * up;
  const spin = smoothstep((t - 0.3) / 1.0);
  p.wrist[0] += (0.2 - p.wrist[0]) * up - Math.PI * 4 * spin * (t < 1.45 ? 1 : 0);
  addV(p.head, 0, -0.35 * up, 0);

  const rest = win(t, 1.45, 3.1, 0.3);
  mixV(p.armS, [-0.75, -0.1, -0.15], rest);
  p.elbowS += (-2.25 - p.elbowS) * rest;
  mixV(p.wrist, [-0.35, 0, 0], rest);
  addV(p.hips, 0, 0.15 * rest, 0.04 * rest);
  addV(p.chest, -0.08 * rest, 0, 0);
  addV(p.head, -0.1 * rest, -0.25 * rest, 0);
  addV(p.hipPos, -0.02 * rest, 0.02 * rest, 0);
}

/** Raps the sword pommel on the shield twice: ready for a fight. */
function fidgetShieldTap(t: number, p: Pose): void {
  const on = win(t, 0.05, 2.2, 0.25);
  mixV(p.armH, [-0.95, -0.35, 0.1], on);
  p.elbowH += (-1.0 - p.elbowH) * on;
  mixV(p.shield, [0, 0.5, 0], on);
  const tap = Math.max(0, Math.sin((t - 0.55) * Math.PI * 2 * 1.6)) ** 3 * win(t, 0.5, 1.8, 0.1);
  mixV(p.armS, [-0.85 - 0.15 * tap, 0.55 + 0.35 * tap, -0.2], on);
  p.elbowS += (-1.3 + 0.3 * tap - p.elbowS) * on;
  mixV(p.wrist, [0.2, 0, 0], on);
  addV(p.chest, 0.05 * on, -0.1 * on, 0);
  addV(p.hipPos, 0, -0.03 * on - 0.012 * tap, 0);
  p.ears += 0.3 * on;
}

/** Stretches up on his toes with a yawn, tail curling, then settles and taps a foot. */
function fidgetStretch(t: number, p: Pose): void {
  const s = win(t, 0.1, 1.7, 0.4);
  addV(p.hipPos, 0, 0.04 * s, 0);
  addV(p.chest, -0.32 * s, 0, 0);
  addV(p.head, -0.45 * s, 0, 0);
  mixV(p.armS, [-2.5, -0.3, -0.7], s);
  p.elbowS += (-0.5 - p.elbowS) * s;
  mixV(p.wrist, [0.9, 0, 0], s);
  mixV(p.armH, [-2.3, 0.3, 0.8], s);
  p.elbowH += (-0.7 - p.elbowH) * s;
  p.toeS += 0.5 * s;
  p.toeH += 0.5 * s;
  p.footS[1] += 0.025 * s;
  p.footH[1] += 0.025 * s;
  addV(p.tail, -0.4 * s, 0, 0.25 * s);
  p.ears += 0.7 * s;
  const tapOn = win(t, 2.0, 3.1, 0.15);
  const tap = Math.max(0, Math.sin((t - 2.0) * Math.PI * 2 * 2.5));
  p.footH[1] += 0.035 * tap * tapOn;
  p.toeH += -0.5 * tap * tapOn;
}

const FIDGETS = [fidgetLook, fidgetFlourish, fidgetShieldTap, fidgetStretch];

/**
 * Standing still. He always breathes and shifts his weight. Left alone for a few seconds he starts to fidget:
 * looks around and sniffs, twirls his sword, raps his shield, stretches and taps a foot, then repeats.
 * @param time seconds since the game started, for the breathing
 * @param idleTime seconds since he last did anything
 */
export function idlePose(time: number, idleTime: number): Pose {
  const p = fullPose({});
  const breath = Math.sin(time * 2.1);
  const shift = Math.sin(time * 0.55);
  addV(p.hipPos, 0.012 * shift, 0.006 * breath, 0);
  addV(p.hips, 0, 0, 0.035 * shift);
  addV(p.chest, 0.025 * breath, 0, -0.045 * shift);
  addV(p.head, -0.015 * breath, 0, 0.02 * shift);
  p.armS[2] += -0.03 * breath;
  p.armH[0] += 0.03 * breath;
  p.elbowS += 0.04 * Math.sin(time * 2.1 - 0.8);
  addV(p.tail, 0, 0.3 * Math.sin(time * 1.3), 0.03 * Math.sin(time * 0.9));

  if (idleTime > FIDGET_DELAY) {
    let t = (idleTime - FIDGET_DELAY) % FIDGET_LOOP;
    for (let i = 0; i < FIDGETS.length; i++) {
      if (t < FIDGET_LENGTHS[i]) {
        FIDGETS[i](t, p);
        break;
      }
      t -= FIDGET_LENGTHS[i] + FIDGET_GAP;
      if (t < 0) break; // in the pause between two fidgets
    }
  }
  return p;
}
