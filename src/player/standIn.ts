/**
 * BRAMBLE'S BODY, PLAYED (2026-11-20): how the hedgehog looks while he is played (his moves are his own:
 * player/hedgehogController.ts). The owner: "he's not a knight, he's a hedgehog". No sword, no shield.
 *
 * Every part of him is on a SPRING (`SPRING`: how quick, how bouncy), so he overshoots and settles:
 *   STANDING  he breathes, sniffs the air now and then, looks round.
 *   WALKING   a WADDLE: his round body rocks side to side over the foot he stands on, his head kept level.
 *   RUNNING   a SCURRY: nose down and forward, spines laid flat, a bounce each step, arms tucked back.
 *   TURNING   his head goes into the turn first, his body swings round after; he leans in setting off, back stopping.
 *   HOPPING   a quick crouch, tucked half round going up, uncurling with his feet out coming down; a squash landing.
 *   THE BALL  curled tight, turning over as far as he has rolled; squashed when it bounces.
 *   SPITTING  his head thrown forward, his body rocked back by it.
 *   THE BURST his spines thrown out all round, and back.
 *   SWIMMING  flat, his back at the waterline, paddling.  HIT: spines up, a flinch.  BEATEN: curled up tight.
 * The globs of spit and their splats, and the ring of the burst, are drawn here too (`effects`, in the world).
 */
import * as THREE from 'three';
import { makeSmall, type StandInRig } from '../npc/patrons';
import type { HedgehogController, HogEvents } from './hedgehogController';
import { HOG } from './hedgehogController';

/** His body's numbers (as patrons.ts builds him): how high his hips are, where his middle is. */
const HIP = 0.16;
const MIDDLE = 0.28;
/** Curled into a ball: how high the ball's middle stands. */
const BALL = 0.34;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export class StandIn {
  readonly root = new THREE.Group();
  /** The spit and the burst, out in the world (the game adds this to the scene). */
  readonly effects = new THREE.Group();
  private readonly rig: StandInRig;
  private readonly headAt: THREE.Vector3;
  private readonly globMeshes: THREE.Mesh[] = [];
  private readonly globMat = new THREE.MeshBasicMaterial({ color: 0x9adf5a });
  private readonly splatMat = new THREE.MeshBasicMaterial({ color: 0x9adf5a, transparent: true, depthWrite: false });
  private readonly ring: THREE.Mesh;
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0xf2e2c0, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  private time = 0;
  private stride = 0;
  private beat = 0;
  private lastState = '';
  private lastFacing = 0;
  private turnRate = 0;
  private lastSpeed = 0;
  private accel = 0;
  private readonly springs = Object.fromEntries(CHANNELS.map((c) => [c, { x: 0, v: 0 }])) as Record<Channel, { x: number; v: number }>;

  constructor(readonly look: 'bramble' | 'thistle' = 'bramble') {
    const small = makeSmall('hedgehog', look);
    // (Thistle's are quills, pale and long, not spit.)
    if (look === 'thistle') {
      this.globMat.color.set(0xf2e6cc);
      this.splatMat.color.set(0xf2e6cc);
    }
    this.rig = small.rig;
    this.root.add(this.rig.root);
    this.headAt = this.rig.head.position.clone();
    for (const h of this.rig.hide) h.visible = false;
    // The burst: a ring of spines thrown out round him, flat on the ground.
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 24, 1), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    this.effects.add(this.ring);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  update(dt: number, hog: HedgehogController, ev: HogEvents | null): void {
    this.time += dt;
    const t = this.time;
    const { body, chest, head, arms, legs } = this.rig;
    this.rig.idle(dt, t);
    const st = hog.state;
    const prev = this.lastState;
    this.lastState = st;
    const sp = this.springs;
    const kick = (ch: Channel, v: number): void => {
      sp[ch].v += v;
    };
    const speed = hog.speed;
    // ---- Moments ----
    if (ev?.jumped && st !== 'ball') {
      kick('squash', 3.5);
      kick('bodyY', 0.6);
    }
    if (ev && ev.landed > 2) {
      kick('squash', -Math.min(8, 2 + ev.landed * 0.5));
      kick('bristle', 2);
    }
    if (ev && ev.bounced > 0) kick('squash', -Math.min(9, ev.bounced * 0.9));
    if (ev?.spat) {
      kick('headX', 9);
      kick('pitch', -3);
      kick('squash', 2);
    }
    if (ev?.burst) kick('bristle', 45);
    if (st === 'hurt' && prev !== 'hurt') {
      kick('bristle', 6);
      kick('pitch', -5);
    }

    // ---- How he turns and speeds up ----
    if (dt > 0) {
      const d = Math.atan2(Math.sin(hog.facing - this.lastFacing), Math.cos(hog.facing - this.lastFacing));
      this.turnRate += (Math.max(-12, Math.min(12, d / dt)) - this.turnRate) * Math.min(1, dt * 10);
      this.accel += ((speed - this.lastSpeed) / dt - this.accel) * Math.min(1, dt * 8);
    }
    this.lastFacing = hog.facing;
    this.lastSpeed = speed;

    // ---- What he wants to do with his body ----
    const ball = st === 'ball' || st === 'dead';
    const T: Record<Channel, number> = {
      bodyY: 0, pitch: 0, roll: 0, yaw: 0, headX: 0, headY: 0, bristle: 0, squash: 0,
      curl: ball ? 1 : 0, armRx: -0.15, armRz: 0.3, armRe: -0.35, armLx: -0.15, armLz: 0.3, armLe: -0.35,
    };
    let legL = 0;
    let legR = 0;
    let beatRoll = 0;
    let beatY = 0;
    const run = clamp01((speed - 3.0) / 1.6);
    const moving = speed > 0.25 && (st === 'walk' || st === 'run' || st === 'idle');
    if (moving) this.stride += dt * Math.min(6.5, speed / (2 * (0.24 + 0.14 * run))) * Math.PI * 2;
    else this.stride += (Math.round(this.stride / Math.PI) * Math.PI - this.stride) * Math.min(1, dt * 10);
    const ph = this.stride;
    const sw = Math.sin(ph);
    const gait = moving ? 1 : 0;
    switch (st) {
      case 'idle':
      case 'walk':
      case 'run': {
        const w = gait * (1 - run);
        const r = gait * run;
        legL = sw * (0.55 * w + 0.95 * r);
        legR = -sw * (0.55 * w + 0.95 * r);
        beatRoll = 0.15 * w * sw;
        beatY = 0.012 * w * Math.abs(Math.cos(ph)) + 0.028 * r * Math.abs(Math.sin(ph * 2));
        T.pitch = 0.1 * w + 0.5 * r;
        T.headX = -0.06 * w - 0.38 * r;
        T.armRx = -0.15 + 0.35 * w * -sw + 0.55 * r;
        T.armLx = -0.15 + 0.35 * w * sw + 0.55 * r;
        T.armRe = -0.35 - 0.6 * r;
        T.armLe = -0.35 - 0.6 * r;
        T.bristle = -0.1 * r;
        if (!moving) {
          const sniff = Math.max(0, Math.sin(t * 2.1)) ** 12;
          T.headX = 0.12 * sniff - 0.04;
          T.headY = 0.55 * Math.sin(t * 0.37) * (Math.sin(t * 0.13) > 0.2 ? 1 : 0.15);
          T.bodyY = 0.006 * Math.sin(t * 2.2);
        }
        // Turning: his head goes first, his body swings round after it; he leans into starting, back from stopping.
        T.headY += Math.max(-0.6, Math.min(0.6, this.turnRate * 0.1));
        T.yaw += Math.max(-0.4, Math.min(0.4, -this.turnRate * 0.04));
        T.roll += Math.max(-0.3, Math.min(0.3, -this.turnRate * speed * 0.015));
        T.pitch += Math.max(-0.3, Math.min(0.3, this.accel * 0.02));
        break;
      }
      case 'jump':
      case 'fall': {
        const up = hog.velocity.y > 1;
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
      case 'swim': {
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
      case 'hurt':
        T.curl = 0.45;
        T.bristle = 1.2;
        T.pitch = -0.3;
        T.armRz = 1;
        T.armLz = 1;
        break;
      case 'ball':
        // Rolling fast, his spines flatten into the ball; at rest, they stand.
        T.bristle = 0.1 - 0.4 * clamp01(speed / HOG.ball.top);
        break;
      case 'dead':
        T.bristle = 0.6;
        break;
    }
    // Spitting: the head thrown forward for a moment (the springs carry the rest).
    if (hog.spitT < 0.12) T.headX += 0.45;

    // ---- The springs ----
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (const ch of CHANNELS) {
      const [w, z] = SPRING[ch];
      const q = sp[ch];
      for (let i = 0; i < steps; i++) {
        q.v += (w * w * (T[ch] - q.x) - 2 * z * w * q.v) * h;
        q.x += q.v * h;
      }
    }
    for (const leg of legs) {
      const want = leg.side > 0 ? legR : legL;
      const c = clamp01(sp.curl.x);
      leg.thigh.rotation.x += (want * (1 - c) - 1.2 * c - leg.thigh.rotation.x) * Math.min(1, dt * (moving ? 40 : 18));
      leg.thigh.scale.setScalar(1 - 0.5 * c);
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
    const b = 1 + 0.18 * sp.bristle.x;
    for (const q of this.rig.spines) {
      q.mesh.scale.setScalar(b);
      q.mesh.position.copy(q.at).multiplyScalar(1 - b);
    }
    // The body: a ball turning over as far as it has rolled (about its middle), or on his feet.
    const pitch = c * (hog.rollAngle + 0.9) + (1 - c) * sp.pitch.x;
    this.beat += (gait - this.beat) * Math.min(1, dt * 8);
    const rock = (sp.roll.x + beatRoll * this.beat) * (1 - c);
    const mid = (1 - c) * (HIP + MIDDLE + sp.bodyY.x + beatY * this.beat + Math.abs(Math.sin(rock)) * 0.11) + c * (st === 'dead' ? BALL * 0.85 : BALL);
    body.rotation.set(pitch, 0, rock);
    body.position.set(0, mid - MIDDLE * Math.cos(pitch), -MIDDLE * Math.sin(pitch));
    chest.rotation.y = sp.yaw.x * (1 - c);
    const sq = Math.max(-0.35, Math.min(0.35, sp.squash.x));
    body.scale.set(1 - 0.5 * sq, 1 + sq, 1 - 0.5 * sq);
    head.position.set(this.headAt.x, this.headAt.y - 0.17 * c, this.headAt.z + 0.1 * c);
    head.rotation.set(sp.headX.x * (1 - c) + 0.5 * c, sp.headY.x * (1 - c), -rock * 0.7);

    // ---- The spit, and the burst ----
    while (this.globMeshes.length < hog.globs.length) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(HOG.spit.radius, 8, 6), this.globMat);
      this.effects.add(m);
      this.globMeshes.push(m);
    }
    this.globMeshes.forEach((m, i) => {
      const g = hog.globs[i];
      m.visible = !!g;
      if (!g) return;
      if (g.splat) {
        // A splat: flattened where it hit, fading.
        m.material = this.splatMat;
        m.position.copy(g.splat);
        m.scale.set(2.2, 0.35, 2.2);
        m.rotation.set(0, 0, 0);
        this.splatMat.opacity = clamp01(1 + g.life / 0.4);
      } else {
        m.material = this.globMat;
        m.position.copy(g.pos);
        if (this.look === 'thistle') m.scale.set(0.35, 0.35, 3.2);
        else m.scale.set(1, 1, 1.3);
        m.lookAt(g.pos.clone().add(g.vel));
      }
    });
    const k = hog.burstT / 0.3;
    this.ring.visible = k < 1;
    if (k < 1) {
      this.ring.position.set(hog.position.x, hog.position.y + 0.15, hog.position.z);
      this.ring.scale.setScalar(0.3 + HOG.burst.reach * k);
      this.ringMat.opacity = 0.8 * (1 - k);
    }
  }
}

/** The parts of him that move on springs. */
type Channel = 'bodyY' | 'pitch' | 'roll' | 'yaw' | 'headX' | 'headY' | 'bristle' | 'squash' | 'curl' | 'armRx' | 'armRz' | 'armRe' | 'armLx' | 'armLz' | 'armLe';
/** Each spring: how quick (rad/s) and how damped (1: no overshoot; less: a little bounce). His round body bounces. */
const SPRING: Record<Channel, [number, number]> = {
  bodyY: [18, 0.4], pitch: [12, 0.55], roll: [13, 0.45], yaw: [15, 0.55], headX: [14, 0.45], headY: [9, 0.7],
  bristle: [14, 0.35], squash: [20, 0.3], curl: [26, 0.85],
  armRx: [16, 0.6], armRz: [16, 0.6], armRe: [18, 0.65], armLx: [16, 0.6], armLz: [16, 0.6], armLe: [18, 0.65],
};
const CHANNELS = Object.keys(SPRING) as Channel[];
