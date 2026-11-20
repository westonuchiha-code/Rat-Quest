/**
 * A STAND-IN (2026-11-20). The owner: "pick one of the other characters that's a little different from the main
 * character and try to get it to move as if you were able to use it as a second player ... this isn't a plan for the
 * actual game I just want to see how close you can get to having one of these other characters control like the main
 * character."
 *
 * So: BRAMBLE, the hedgehog from the Green Room (npc/patrons.ts), worked by the rat's own controls. Nothing about how
 * he plays is changed: the rat's controller (player/controller.ts) still moves him, collides him, swings and jumps; this
 * only draws a hedgehog in the rat's place, reading the same things the rat's model reads (`RatAnimInput`) and putting
 * the hedgehog's short body into a pose for each. Where a hedgehog does a thing his own way, he does:
 *   ROLLS, FLIPS, the LONG JUMP, SLIDES and the PLUNGE: he curls into a ball of spines and turns over.
 *   His SWORD is a sewing needle; his SHIELD a bottle cap on his arm, and the board he rides when the rat would surf.
 * How to see it: `#as=hedgehog` on any level, or the Stand-in room (Test Room 19), where it is on by itself.
 * What is not done: his hit flash (the rat's model glows red; the hedgehog only blinks, as the rat also does), the
 * story gestures (sitting, waving), and the wall kick has no pose of its own (he is in the air).
 */
import * as THREE from 'three';
import type { RatAnimInput } from './ratModel';
import { ATTACK_CLIPS } from './animations';
import { makeSmall, type StandInRig } from '../npc/patrons';
import { createPs1Material, bakeVertexColor } from '../render/ps1Material';

const mat = createPs1Material({ lit: true });
/** His body's numbers (as patrons.ts builds him): how high his hips are, where his middle is, his arm's reach. */
const HIP = 0.16;
const MIDDLE = 0.28;
const REACH_UP = 0.75;
/** Curled into a ball: how high the ball's middle stands. */
const BALL = 0.34;

const ease = (cur: number, want: number, dt: number, rate: number): number => cur + (want - cur) * (1 - Math.exp(-rate * dt));
const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (v: number): number => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};

/** A pose for his limbs: each arm's raise forward (x), out to his side (z), and elbow; each leg's swing forward. */
interface Limbs {
  arm: [{ x: number; z: number; elbow: number }, { x: number; z: number; elbow: number }];
  leg: [number, number];
}

export class StandIn {
  readonly root = new THREE.Group();
  private readonly rig: StandInRig;
  private readonly needle = new THREE.Group();
  private readonly cap = new THREE.Group();
  private readonly board = new THREE.Group();
  private readonly bladeBase = new THREE.Object3D();
  private readonly bladeTip = new THREE.Object3D();
  private time = 0;
  private stride = 0;
  private roll = 0;
  private curl = 0;
  private squash = 0;
  private lastState = '';
  private readonly headAt: THREE.Vector3;

  constructor() {
    const small = makeSmall('hedgehog', 'bramble');
    this.rig = small.rig;
    this.root.add(this.rig.root);
    this.headAt = this.rig.head.position.clone();
    for (const h of this.rig.hide) h.visible = false;
    // The needle, in his right paw: a long thin steel blade, its eye at the hilt, wound with red thread for a grip.
    const blade = new THREE.CylinderGeometry(0.006, 0.014, 0.5, 5, 1).translate(0, 0.29, 0);
    bakeVertexColor(blade, 0xd8dde6);
    const eye = new THREE.TorusGeometry(0.016, 0.006, 4, 8);
    bakeVertexColor(eye, 0xb8bec8);
    const grip = new THREE.CylinderGeometry(0.018, 0.018, 0.08, 6, 1).translate(0, 0.0, 0);
    bakeVertexColor(grip, 0xb02a2a);
    // (Built point up, then turned over in his paw: the point goes on out the way his arm does.)
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI;
    inner.add(new THREE.Mesh(blade, mat), new THREE.Mesh(grip, mat));
    const eyeMesh = new THREE.Mesh(eye, mat);
    eyeMesh.position.y = -0.06;
    inner.add(eyeMesh);
    this.bladeBase.position.y = 0.06;
    this.bladeTip.position.y = 0.54;
    inner.add(this.bladeBase, this.bladeTip);
    this.needle.add(inner);
    const right = this.rig.arms.find((a) => a.side > 0)!;
    right.fore.add(this.needle);
    this.needle.position.set(0, -0.13, 0.02);
    // The bottle cap, on his left forearm: a red cap with a crimped rim, its open side to him.
    const left = this.rig.arms.find((a) => a.side < 0)!;
    this.cap.add(capMesh(0.12));
    this.cap.position.set(-0.05, -0.07, 0.03);
    left.fore.add(this.cap);
    // A bigger cap for a board, under his feet when he rides.
    this.board.add(capMesh(0.3));
    this.board.rotation.x = -Math.PI / 2;
    this.board.visible = false;
    this.root.add(this.board);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }
  /** World positions of the two ends of the needle, for the sword trail. */
  getBlade(base: THREE.Vector3, tip: THREE.Vector3): void {
    this.root.updateWorldMatrix(true, true);
    this.bladeBase.getWorldPosition(base);
    this.bladeTip.getWorldPosition(tip);
  }

  update(dt: number, a: RatAnimInput): void {
    this.time += dt;
    const t = this.time;
    const { body, chest, head, arms, legs } = this.rig;
    this.rig.idle(dt, t);
    const st = a.state;
    if (st !== this.lastState && (st === 'land' || (this.lastState === 'fall' && (st === 'idle' || st === 'walk' || st === 'run')))) this.squash = 1;
    this.lastState = st;
    this.squash = Math.max(0, this.squash - dt * 6);

    // ---- Which way is he going: curled, riding, or on his feet ----
    const ride = st === 'ride' && a.ride ? a.ride : null;
    let ballWant = 0;
    let rollTo: number | null = null;
    if (st === 'dodge') {
      ballWant = 1;
      rollTo = (a.dodgeKind === 'back' ? -1 : 1) * Math.PI * 2 * smooth(a.dodgeProgress);
    } else if (a.flipProgress > 0 && a.flipProgress < 1) {
      ballWant = 1;
      rollTo = Math.PI * 2 * smooth(a.flipProgress);
    } else if (st === 'longjump' || st === 'slide' || (st === 'plunge' && a.plungeStage <= 2)) {
      ballWant = 1;
      // (Rolling over at the pace he goes: faster diving.)
      this.roll += dt * (st === 'plunge' ? (a.plungeStage === 2 ? 22 : 10) : Math.max(8, a.planarSpeed / BALL));
    }
    if (rollTo !== null) this.roll = rollTo;
    if (ballWant === 0) this.roll = ease(this.roll, Math.round(this.roll / (Math.PI * 2)) * Math.PI * 2, dt, 14);
    this.curl = ballWant ? ease(this.curl, 1, dt, 30) : ease(this.curl, 0, dt, 12);
    const c = this.curl;

    // ---- The pose of his limbs ----
    const rest: Limbs = { arm: [{ x: -0.35, z: 0.25, elbow: -0.6 }, { x: -0.1, z: 0.3, elbow: -0.25 }], leg: [0, 0] };
    let L: Limbs = rest;
    let lean = 0;
    let lift = 0;
    let swingYaw = 0;
    let wrist = -1.3;
    const armed = a.armed;
    const stride = a.planarSpeed > 0.2 && (st === 'walk' || st === 'run' || st === 'idle' || st === 'guard');
    if (stride) {
      // His legs are short: a quick patter, not long strides (capped at a pace a picture can show).
      const hz = Math.min(7, 1.6 + a.planarSpeed * 1.0);
      this.stride += dt * hz * Math.PI * 2;
    }
    const s = Math.sin(this.stride);
    const run = clamp01((a.planarSpeed - 2) / 4);
    switch (st) {
      case 'walk':
      case 'run':
      case 'idle':
      case 'land': {
        const k = stride ? 0.5 + 0.5 * run : 0;
        L = {
          arm: [{ x: -0.35 + 0.6 * k * s, z: 0.25, elbow: -0.6 - 0.4 * run }, { x: -0.1 - 0.6 * k * s, z: 0.3, elbow: -0.25 - 0.5 * run }],
          leg: [0.8 * k * s, -0.8 * k * s],
        };
        lean = 0.3 * run;
        lift = stride ? 0.025 * Math.abs(Math.cos(this.stride)) * (0.5 + run) : 0;
        break;
      }
      case 'jump':
      case 'fall': {
        // Up: his arms out and up, one leg tucked. Down: his arms high, his feet reaching for the floor.
        const up = a.verticalSpeed > 0;
        L = up
          ? { arm: [{ x: -1.6, z: 0.9, elbow: -0.5 }, { x: -1.8, z: 0.9, elbow: -0.3 }], leg: [-0.9, 0.3] }
          : { arm: [{ x: -2.4 + 0.15 * Math.sin(t * 14), z: 1.1, elbow: -0.2 }, { x: -2.4 + 0.15 * Math.sin(t * 14 + 2), z: 1.1, elbow: -0.2 }], leg: [-0.35, -0.2] };
        lean = up ? 0.15 : -0.05;
        break;
      }
      case 'attack': {
        const clip = ATTACK_CLIPS[a.comboStep] ?? ATTACK_CLIPS[0];
        const at = a.attackTime;
        // Wound up by the time it can hit, through it while it can, then held, then back.
        const wind = smooth(at / clip.activeStart);
        const go = smooth((at - clip.activeStart) / (clip.activeEnd - clip.activeStart));
        const back = smooth((at - clip.chainAt) / Math.max(0.05, clip.duration - clip.chainAt));
        let sx = -1.45;
        let sz = 0;
        if (a.comboStep === 2) {
          // The overhead: up over his head, and down in front of him.
          sx = -0.5 - 2.4 * wind + 2.2 * go;
          wrist = 0;
          lean = -0.15 * wind + 0.35 * go;
        } else {
          // A slash across (from his right to his left, then back), the arm out level, his whole round body turning with it.
          const from = a.comboStep === 0 ? 1.4 : -0.9;
          const to = a.comboStep === 0 ? -0.9 : 1.4;
          sz = from * wind + (to - from) * go;
          wrist = -0.15;
          swingYaw = -0.5 * sz;
          lean = 0.15;
        }
        const k = 1 - back;
        L = {
          arm: [{ x: -0.6 * k + -0.35 * (1 - k), z: 0.3, elbow: -1.0 }, { x: sx * k + -0.1 * (1 - k), z: sz * k + 0.3 * (1 - k), elbow: -0.1 * k - 0.25 * (1 - k) }],
          leg: [0.35 * k, -0.25 * k],
        };
        wrist = wrist * k + -1.3 * (1 - k);
        swingYaw *= k;
        break;
      }
      case 'guard':
        // Crouched behind the cap, the needle drawn back ready.
        L = { arm: [{ x: -1.25, z: -0.15, elbow: -0.9 }, { x: -0.6, z: 0.45, elbow: -1.2 }], leg: [0.3 + 0.3 * s * (stride ? 1 : 0), -0.3 - 0.3 * s * (stride ? 1 : 0)] };
        lean = 0.2;
        lift = -0.03;
        wrist = -0.4;
        break;
      case 'hurt':
        L = { arm: [{ x: -0.9, z: 1.0, elbow: -0.2 }, { x: -0.9, z: 1.0, elbow: -0.2 }], leg: [0.5, 0.2] };
        lean = -0.45;
        break;
      case 'dead':
        L = { arm: [{ x: -0.3, z: 1.3, elbow: -0.1 }, { x: -0.3, z: 1.3, elbow: -0.1 }], leg: [0.6, 0.4] };
        break;
      case 'swim': {
        // Flat on the water, paddling with all four.
        const p = Math.sin(t * 7);
        L = { arm: [{ x: -2.2 + 0.7 * p, z: 0.5, elbow: -0.4 }, { x: -2.2 - 0.7 * p, z: 0.5, elbow: -0.4 }], leg: [0.7 * p - 0.4, -0.7 * p - 0.4] };
        lean = 1.25;
        // (His feet hang 0.62 under the surface, TUNING.swim.sink: lying flat, his back is at the waterline.)
        lift = 0.1;
        break;
      }
      case 'hang':
      case 'climb': {
        L = { arm: [{ x: -3.0, z: 0.25, elbow: 0 }, { x: -3.0, z: 0.25, elbow: 0 }], leg: [0.2 * Math.sin(t * 2), -0.2 * Math.sin(t * 2)] };
        break;
      }
      case 'ride': {
        const tuck = ride?.tuck ?? 0;
        L = { arm: [{ x: -0.8, z: 1.0, elbow: -0.4 }, { x: -0.6, z: 1.1, elbow: -0.4 }], leg: [0.5, -0.4] };
        lean = 0.25 + 0.3 * tuck;
        lift = 0.06 - 0.08 * tuck;
        break;
      }
      default:
        break;
    }
    // Carrying something over his head, and throwing it.
    const carry = a.carry ?? 0;
    if (carry > 0 && st !== 'ride') {
      const th = a.throwT ?? -1;
      const x = th >= 0 ? -2.9 + 2.0 * smooth(th) : -2.9;
      L = { arm: [{ x: L.arm[0].x + (x - L.arm[0].x) * carry, z: 0.2, elbow: -0.2 }, { x: L.arm[1].x + (x - L.arm[1].x) * carry, z: 0.2, elbow: -0.2 }], leg: L.leg };
    }

    // ---- Put it on him ----
    const rate = st === 'attack' || stride ? 60 : 18;
    for (const arm of arms) {
      const p = L.arm[arm.side > 0 ? 1 : 0];
      // (Curled, his limbs are tucked in.)
      arm.upper.rotation.set(ease(arm.upper.rotation.x, p.x * (1 - c) - 1.4 * c, dt, rate), 0, ease(arm.upper.rotation.z, arm.side * (p.z * (1 - c) - 0.4 * c), dt, rate));
      arm.fore.rotation.x = ease(arm.fore.rotation.x, p.elbow * (1 - c) - 1.6 * c, dt, rate);
      const sc = 1 - 0.6 * c;
      arm.upper.scale.setScalar(sc);
    }
    for (const leg of legs) {
      const want = L.leg[leg.side > 0 ? 1 : 0];
      leg.thigh.rotation.x = ease(leg.thigh.rotation.x, want * (1 - c) - 1.2 * c, dt, stride || st === 'attack' ? 60 : 20);
      leg.thigh.scale.setScalar(1 - 0.5 * c);
    }
    this.needle.rotation.x = ease(this.needle.rotation.x, wrist, dt, rate);
    this.needle.visible = armed && c < 0.5;
    // His cap faces the way he does, whatever his arm is doing; in a ride it is under his feet.
    const left = arms.find((q) => q.side < 0)!;
    this.cap.rotation.x = -(left.upper.rotation.x + left.fore.rotation.x);
    this.cap.visible = armed && !ride && c < 0.5;
    this.board.visible = !!ride;

    // His body: on his feet (leaning, bobbing), lying down, or a ball rolling round its middle.
    const dead = st === 'dead';
    const pitch = c * (this.roll + 0.9) + (1 - c) * (dead ? -1.45 : lean);
    // (A ball on a slope sits higher over his feet than on the flat, or it would sink into the slope: by how steep.)
    const ground = a.slide && !a.slide.air ? a.slide : null;
    const steep = ground ? Math.hypot(ground.along ?? 0, ground.across ?? 0) : 0;
    const mid = (1 - c) * (dead ? 0.22 : HIP + MIDDLE) + c * BALL * Math.sqrt(1 + steep * steep);
    // (The body turns about its middle: where its middle would be, it is put back.)
    body.rotation.set(pitch, 0, ride ? -(ride.steer ?? 0) * 0.3 : 0);
    body.position.set(0, mid - MIDDLE * Math.cos(pitch) + lift * (1 - c), -MIDDLE * Math.sin(pitch));
    chest.rotation.y = ease(chest.rotation.y, swingYaw, dt, 40);
    const sq = this.squash * (1 - c);
    body.scale.set(1 + 0.12 * sq, 1 - 0.18 * sq, 1 + 0.12 * sq);
    // (Curled, his head is tucked down into his front, so the ball is round.)
    head.position.set(this.headAt.x, this.headAt.y - 0.17 * c, this.headAt.z + 0.1 * c);
    head.rotation.x = ease(head.rotation.x, 0.5 * c + (st === 'hurt' ? -0.3 : 0) + (st === 'swim' ? -1.0 : 0), dt, 16);
    head.rotation.y = ease(head.rotation.y, a.act?.headYaw ?? 0, dt, 8);

    // Hanging from a ledge: his paws on its edge (his arms are short: he hangs low). Pulling up: up and over.
    if ((st === 'hang' || st === 'climb') && a.ledge) {
      const p = st === 'climb' ? smooth(a.climbProgress ?? 0) : 0;
      const hang = a.ledge.y - REACH_UP;
      body.position.y += hang * (1 - p) + a.ledge.y * p;
      body.position.z += (a.ledge.z - 0.12) * (1 - p) + (a.ledge.z + 0.2) * p;
    }
    // Riding the big cap: a spin turns him and the board round, a kickflip turns the board over under him.
    this.rig.root.rotation.y = ride && (ride.spin ?? -1) >= 0 ? Math.PI * 2 * (ride.spin ?? 0) : 0;
    if (ride) {
      this.board.position.set(0, 0.03 + Math.max(0, lift), 0);
      this.board.rotation.set(-Math.PI / 2, ride.flip >= 0 ? Math.PI * 2 * ride.flip : 0, this.rig.root.rotation.y);
    }
  }
}

/** A bottle cap of this radius: a red disc, a crimped rim round it, a pale lining inside. Its face looks along +z. */
function capMesh(r: number): THREE.Object3D {
  const g = new THREE.Group();
  const disc = new THREE.CylinderGeometry(r, r, r * 0.12, 16, 1).rotateX(Math.PI / 2);
  bakeVertexColor(disc, 0xc8242a);
  g.add(new THREE.Mesh(disc, mat));
  const crimp = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tooth = new THREE.BoxGeometry(r * 0.22, r * 0.2, r * 0.35);
    bakeVertexColor(tooth, i % 2 ? 0xa01a20 : 0xd8343a);
    const m = new THREE.Mesh(tooth, mat);
    m.position.set(Math.cos(a) * r, Math.sin(a) * r, -r * 0.14);
    m.rotation.z = a;
    crimp.add(m);
  }
  g.add(crimp);
  const lining = new THREE.CylinderGeometry(r * 0.8, r * 0.8, 0.004, 14, 1).rotateX(Math.PI / 2).translate(0, 0, -r * 0.07);
  bakeVertexColor(lining, 0xe8e0c8);
  g.add(new THREE.Mesh(lining, mat));
  return g;
}
