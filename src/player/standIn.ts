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
 * HIS OWN MOVEMENT (the owner: "they're totally different character body types ... they wouldn't move the same"):
 * nothing is taken from the knight's animation. A waddle walking, a scurry running, a crouch and a half-tuck jumping,
 * a squash and bounce landing, stabs and a spin for the combo, spines that lie flat or bristle; every part on a spring.
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

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (v: number): number => {
  const x = clamp01(v);
  return x * x * (3 - 2 * x);
};


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
  private lastState = '';
  private lastVy = 0;
  /** How much his steps show (eased in as he sets off, out as he stops). */
  private beat = 0;
  private facing = 0;
  private lastFacing = 0;
  private turnRate = 0;
  private lastSpeed = 0;
  private accel = 0;
  private readonly springs = Object.fromEntries(CHANNELS.map((c) => [c, { x: 0, v: 0 }])) as Record<Channel, { x: number; v: number }>;
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
    this.facing = facing;
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
    const prev = this.lastState;
    this.lastState = st;
    const sp = this.springs;
    const kick = (ch: Channel, v: number): void => {
      sp[ch].v += v;
    };
    // ---- Moments: a leap (a quick crouch first), a landing (a bounce: he is round), a hit (spines up) ----
    const airborne = (s: string): boolean => s === 'jump' || s === 'fall' || s === 'longjump';
    if (st === 'jump' && !airborne(prev)) {
      kick('squash', 3.5);
      kick('bodyY', 0.6);
    }
    if (airborne(prev) && !airborne(st) && st !== 'hang' && st !== 'swim') {
      kick('squash', -5.5 * Math.min(1.5, 0.5 + Math.abs(this.lastVy) / 10));
      kick('bodyY', -0.8);
      kick('bristle', 2);
    }
    if (st === 'hurt' && prev !== 'hurt') {
      kick('bristle', 6);
      kick('pitch', -5);
    }
    this.lastVy = a.verticalSpeed;

    // ---- How he turns and speeds up (from where he faces and how fast he goes) ----
    let turn = 0;
    if (dt > 0) {
      const d = Math.atan2(Math.sin(this.facing - this.lastFacing), Math.cos(this.facing - this.lastFacing));
      turn = Math.max(-12, Math.min(12, d / dt));
      this.turnRate += (turn - this.turnRate) * Math.min(1, dt * 10);
      this.accel += (((a.planarSpeed - this.lastSpeed) / dt) - this.accel) * Math.min(1, dt * 8);
    }
    this.lastFacing = this.facing;
    this.lastSpeed = a.planarSpeed;

    // ---- Curled: a ball of spines (rolls, the flip, the long jump, slides, the plunge; and dead, as a hedgehog does) ----
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
      this.roll += dt * (st === 'plunge' ? (a.plungeStage === 2 ? 22 : 10) : Math.max(8, a.planarSpeed / BALL));
    } else if (st === 'dead') ballWant = 1;
    if (rollTo !== null) this.roll = rollTo;
    if (ballWant === 0 || st === 'dead') this.roll += (Math.round(this.roll / (Math.PI * 2)) * Math.PI * 2 - this.roll) * Math.min(1, dt * 14);

    // ---- What he wants to do with his body: each a target the springs pull toward ----
    const T: Record<Channel, number> = {
      bodyY: 0, pitch: 0, roll: 0, yaw: 0, headX: 0, headY: 0, bristle: 0, squash: 0,
      curl: ballWant, armRx: -0.15, armRz: 0.3, armRe: -0.35, armLx: -0.3, armLz: 0.28, armLe: -0.7,
    };
    let legL = 0;
    let legR = 0;
    let wrist = -1.25;
    let spin = 0;
    let stiff = 1;
    let beatRoll = 0;
    let beatY = 0;
    const run = clamp01((a.planarSpeed - 3.4) / 2.6);
    const moving = a.planarSpeed > 0.25 && (st === 'walk' || st === 'run' || st === 'idle' || st === 'guard' || st === 'land');
    if (moving) {
      // Short legs: a step is short, so they go fast; at a run he bounds, both ends of him working (capped at what
      // a picture can show).
      const step = 0.3 + 0.2 * run;
      this.stride += dt * Math.min(6.5, a.planarSpeed / (2 * step)) * Math.PI * 2;
    } else this.stride += (Math.round(this.stride / Math.PI) * Math.PI - this.stride) * Math.min(1, dt * 10);
    const ph = this.stride;
    const sw = Math.sin(ph);
    const gait = moving ? 1 : 0;

    switch (st) {
      case 'idle':
      case 'walk':
      case 'run':
      case 'land': {
        // WALK: a waddle. His round body rocks over the foot he stands on; his head stays level; little steps.
        // RUN: a scurry. Nose down and forward, spines laid flat, a bounce each step, his arms back out of the way.
        const w = gait * (1 - run);
        const r = gait * run;
        legL = sw * (0.55 * w + 0.95 * r);
        legR = -sw * (0.55 * w + 0.95 * r);
        // (The rock and the bounce go with each step, as quick as his feet: they are not left to the springs.)
        beatRoll = 0.15 * w * sw;
        beatY = 0.012 * w * Math.abs(Math.cos(ph)) + 0.028 * r * Math.abs(Math.sin(ph * 2));
        T.pitch = 0.1 * w + 0.5 * r;
        T.headX = -0.06 * w - 0.38 * r;
        T.armRx = -0.15 + 0.35 * w * -sw + 0.55 * r;
        T.armLx = -0.3 + 0.35 * w * sw + 0.55 * r;
        T.armRe = -0.35 - 0.6 * r;
        T.armLe = -0.7 - 0.4 * r;
        T.bristle = -0.1 * r;
        // Standing about: he breathes, sniffs the air now and then, looks round.
        if (!moving) {
          const sniff = Math.max(0, Math.sin(t * 2.1)) ** 12;
          T.headX = 0.12 * sniff - 0.04;
          T.headY = 0.55 * Math.sin(t * 0.37) * (Math.sin(t * 0.13) > 0.2 ? 1 : 0.15);
          T.bodyY = 0.006 * Math.sin(t * 2.2);
        }
        break;
      }
      case 'guard':
        // Hunched behind his cap, spines up, head drawn down into them; he shuffles, he does not step out.
        legL = 0.25 * gait * sw;
        legR = -0.25 * gait * sw;
        T.pitch = 0.32;
        T.bodyY = -0.035;
        T.headX = 0.25;
        T.bristle = 0.9;
        T.armLx = -1.3;
        T.armLz = -0.1;
        T.armLe = -0.6;
        T.armRx = -0.5;
        T.armRz = 0.5;
        T.armRe = -1.3;
        wrist = -0.5;
        break;
      case 'attack': {
        // Short arms: he does not sweep, he STABS, putting his weight behind it; the third is a spin, spines out.
        const clip = ATTACK_CLIPS[a.comboStep] ?? ATTACK_CLIPS[0];
        const at = a.attackTime;
        const wind = smooth(at / clip.activeStart);
        const go = smooth((at - clip.activeStart) / (clip.activeEnd - clip.activeStart));
        const back = smooth((at - clip.chainAt) / Math.max(0.05, clip.duration - clip.chainAt));
        const k = 1 - back;
        stiff = 3;
        if (a.comboStep === 2) {
          spin = Math.PI * 2 * smooth((at - clip.activeStart * 0.6) / (clip.activeEnd - clip.activeStart * 0.6));
          T.bristle = 1.1 * k;
          T.curl = 0.25 * k * (1 - go);
          T.armRx = -1.2 * k - 0.15 * back;
          T.armRz = 1.25 * k + 0.3 * back;
          T.armRe = -0.1 * k - 0.35 * back;
          T.armLz = 1.1 * k + 0.28 * back;
          wrist = -0.3 * k - 1.25 * back;
          T.bodyY = 0.05 * Math.sin(Math.PI * clamp01(at / clip.activeEnd)) * k;
          legL = -0.4 * k;
          legR = 0.4 * k;
        } else {
          const side = a.comboStep === 0 ? 1 : -1;
          // Drawn back, elbow bent, body turned away; then all of him goes forward behind the point.
          T.armRx = (0.35 * wind - 1.85 * go) * k - 0.15 * back;
          T.armRe = (-1.7 * wind + 1.7 * go) * k - 0.35 * back;
          T.armRz = (0.3 + 0.15 * side * go) * k + 0.3 * back;
          T.yaw = (0.45 * wind - 0.6 * go) * side * k;
          T.pitch = (-0.12 * wind + 0.42 * go) * k;
          T.bodyY = -0.03 * wind * k;
          T.armLx = -0.9 * k - 0.3 * back;
          wrist = (-0.9 * (1 - go) - 0.0 * go) * k - 1.25 * back;
          legL = 0.45 * go * k;
          legR = -0.35 * go * k;
          T.bristle = 0.3 * go * k;
        }
        break;
      }
      case 'jump':
      case 'fall': {
        // Up: tucked half round (short legs drawn up, arms in). Coming down: uncurling, feet out for the floor.
        const up = a.verticalSpeed > 1;
        T.curl = up ? 0.3 : 0.08;
        legL = up ? -0.9 : 0.25;
        legR = up ? -0.7 : -0.15;
        T.armRx = up ? -0.9 : -1.9 + 0.2 * Math.sin(t * 12);
        T.armLx = up ? -0.9 : -1.9 + 0.2 * Math.sin(t * 12 + 1.6);
        T.armRz = up ? 0.5 : 1.0;
        T.armLz = up ? 0.5 : 1.0;
        T.pitch = up ? 0.2 : -0.12;
        T.headX = up ? 0.15 : -0.2;
        T.bristle = up ? 0.2 : 0.4;
        break;
      }
      case 'hurt':
        T.curl = 0.45;
        T.bristle = 1.2;
        T.pitch = -0.3;
        T.armRz = 1;
        T.armLz = 1;
        break;
      case 'dead':
        T.bristle = 0.6;
        break;
      case 'swim': {
        // Flat on the water, nose up, paddling with all four (his feet hang 0.62 under: his back is at the waterline).
        const p = Math.sin(t * 7);
        T.pitch = 1.25;
        T.bodyY = 0.1;
        T.headX = -1.0;
        T.armRx = -2.2 + 0.7 * p;
        T.armLx = -2.2 - 0.7 * p;
        T.armRz = 0.5;
        T.armLz = 0.5;
        legL = 0.7 * p - 0.4;
        legR = -0.7 * p - 0.4;
        break;
      }
      case 'hang':
      case 'climb':
        T.armRx = -3.0;
        T.armLx = -3.0;
        T.armRz = 0.25;
        T.armLz = 0.25;
        T.armRe = 0;
        T.armLe = 0;
        legL = 0.25 * Math.sin(t * 2.5);
        legR = -0.25 * Math.sin(t * 2.5);
        stiff = 2;
        break;
      case 'ride': {
        // On the big cap: low, arms out for balance, waving the way he steers.
        const tuck = ride?.tuck ?? 0;
        const steer = ride?.steer ?? 0;
        T.pitch = 0.25 + 0.3 * tuck;
        T.bodyY = 0.06 - 0.08 * tuck;
        T.roll = -steer * 0.35;
        T.armRx = -0.7;
        T.armLx = -0.7;
        T.armRz = 1.1 + 0.4 * steer;
        T.armLz = 1.1 - 0.4 * steer;
        legL = 0.5;
        legR = -0.4;
        break;
      }
      default:
        break;
    }
    // Turning: his head goes first, his round body swings round after it and leans out of the turn.
    if (st === 'walk' || st === 'run' || st === 'idle' || st === 'guard' || st === 'land') {
      T.headY += Math.max(-0.6, Math.min(0.6, this.turnRate * 0.1));
      T.yaw += Math.max(-0.4, Math.min(0.4, -this.turnRate * 0.04));
      T.roll += Math.max(-0.3, Math.min(0.3, -this.turnRate * a.planarSpeed * 0.015));
      // Speeding up he leans in; stopping he rocks back on his heels.
      T.pitch += Math.max(-0.3, Math.min(0.3, this.accel * 0.02));
    }
    // Carrying something over his head, and throwing it.
    const carry = a.carry ?? 0;
    if (carry > 0 && st !== 'ride') {
      const th = a.throwT ?? -1;
      const x = th >= 0 ? -2.9 + 2.0 * smooth(th) : -2.9;
      T.armRx += (x - T.armRx) * carry;
      T.armLx += (x - T.armLx) * carry;
      T.armRz += (0.2 - T.armRz) * carry;
      T.armLz += (0.2 - T.armLz) * carry;
    }

    // ---- The springs: each part pulled to where it wants to be, overshooting a little and settling ----
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (const ch of CHANNELS) {
      const [w0, z] = SPRING[ch];
      const w = ch.startsWith('arm') ? w0 * stiff : w0;
      const q = sp[ch];
      for (let i = 0; i < steps; i++) {
        q.v += (w * w * (T[ch] - q.x) - 2 * z * w * q.v) * h;
        q.x += q.v * h;
      }
    }
    // (Catching an edge is at once: all of him is hanging the moment he holds it, not springing into it.)
    if (st === 'hang' || st === 'climb') {
      for (const ch of CHANNELS) {
        sp[ch].x = T[ch];
        sp[ch].v = 0;
      }
    }
    // (Feet go where the step puts them: a spring would drag them through the floor.)
    for (const leg of legs) {
      const want = leg.side > 0 ? legR : legL;
      const c = sp.curl.x;
      leg.thigh.rotation.x += (want * (1 - c) - 1.2 * c - leg.thigh.rotation.x) * Math.min(1, dt * (moving ? 40 : 18));
      leg.thigh.scale.setScalar(1 - 0.5 * clamp01(c));
    }

    // ---- Put it on him ----
    const c = clamp01(sp.curl.x);
    for (const arm of arms) {
      const R = arm.side > 0;
      const x = R ? sp.armRx.x : sp.armLx.x;
      const z = R ? sp.armRz.x : sp.armLz.x;
      const e = R ? sp.armRe.x : sp.armLe.x;
      arm.upper.rotation.set(x * (1 - c) - 1.4 * c, 0, arm.side * (z * (1 - c) - 0.4 * c));
      arm.fore.rotation.x = e * (1 - c) - 1.6 * c;
      arm.upper.scale.setScalar(1 - 0.6 * c);
    }
    this.needle.rotation.x += (wrist - this.needle.rotation.x) * Math.min(1, dt * 30 * stiff);
    this.needle.visible = a.armed && c < 0.5;
    const left = arms.find((q) => q.side < 0)!;
    this.cap.rotation.x = -(left.upper.rotation.x + left.fore.rotation.x);
    this.cap.visible = a.armed && !ride && c < 0.5;
    this.board.visible = !!ride;
    // His spines: flat as he runs, bristling up when he guards, is hit, lands hard or spins.
    const b = 1 + 0.18 * sp.bristle.x;
    for (const q of this.rig.spines) {
      q.mesh.scale.setScalar(b);
      q.mesh.position.copy(q.at).multiplyScalar(1 - b);
    }

    // His body: a ball rolling round its middle, or on his feet, leaning, rocking, bobbing; squashed and stretched.
    const pitch = c * (this.roll + 0.9) + (1 - c) * sp.pitch.x;
    const ground = a.slide && !a.slide.air ? a.slide : null;
    const steep = ground ? Math.hypot(ground.along ?? 0, ground.across ?? 0) : 0;
    // (Rocking side to side, a foot would go through the floor: he rises by as much.)
    this.beat += (gait - this.beat) * Math.min(1, dt * 8);
    const rock = (sp.roll.x + beatRoll * this.beat) * (1 - c);
    const mid = (1 - c) * (HIP + MIDDLE + sp.bodyY.x + beatY * this.beat + Math.abs(Math.sin(rock)) * 0.11) + c * (st === 'dead' ? BALL * 0.85 : BALL * Math.sqrt(1 + steep * steep));
    body.rotation.set(pitch, 0, rock);
    body.position.set(0, mid - MIDDLE * Math.cos(pitch), -MIDDLE * Math.sin(pitch));
    chest.rotation.y = sp.yaw.x * (1 - c);
    const sq = Math.max(-0.35, Math.min(0.35, sp.squash.x)) * (1 - c);
    body.scale.set(1 - 0.5 * sq, 1 + sq, 1 - 0.5 * sq);
    head.position.set(this.headAt.x, this.headAt.y - 0.17 * c, this.headAt.z + 0.1 * c);
    head.rotation.set(sp.headX.x * (1 - c) + 0.5 * c, (sp.headY.x + (a.act?.headYaw ?? 0)) * (1 - c), -rock * 0.7);

    // Hanging from a ledge: his paws on its edge (his arms are short: he hangs low). Pulling up: up and over.
    if ((st === 'hang' || st === 'climb') && a.ledge) {
      const p = st === 'climb' ? smooth(a.climbProgress ?? 0) : 0;
      body.position.y += (a.ledge.y - REACH_UP) * (1 - p) + a.ledge.y * p;
      body.position.z += (a.ledge.z - 0.12) * (1 - p) + (a.ledge.z + 0.2) * p;
    }
    // The spin attack, and a spin on the board, turn all of him round; a kickflip turns the board over under him.
    const rideSpin = ride && (ride.spin ?? -1) >= 0 ? Math.PI * 2 * (ride.spin ?? 0) : 0;
    this.rig.root.rotation.y = spin + rideSpin;
    if (ride) {
      this.board.position.set(0, 0.03 + Math.max(0, sp.bodyY.x), 0);
      this.board.rotation.set(-Math.PI / 2, ride.flip >= 0 ? Math.PI * 2 * ride.flip : 0, this.rig.root.rotation.y);
    }
  }
}

/** The parts of him that move on springs. */
type Channel = 'bodyY' | 'pitch' | 'roll' | 'yaw' | 'headX' | 'headY' | 'bristle' | 'squash' | 'curl' | 'armRx' | 'armRz' | 'armRe' | 'armLx' | 'armLz' | 'armLe';
/** Each spring: how quick (rad/s) and how damped (1: no overshoot; less: a little bounce). His round body bounces. */
const SPRING: Record<Channel, [number, number]> = {
  bodyY: [18, 0.4], pitch: [12, 0.55], roll: [13, 0.45], yaw: [15, 0.55], headX: [14, 0.6], headY: [9, 0.7],
  bristle: [14, 0.35], squash: [20, 0.3], curl: [26, 0.85],
  armRx: [16, 0.6], armRz: [16, 0.6], armRe: [18, 0.65], armLx: [16, 0.6], armLz: [16, 0.6], armLe: [18, 0.65],
};
const CHANNELS = Object.keys(SPRING) as Channel[];

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
