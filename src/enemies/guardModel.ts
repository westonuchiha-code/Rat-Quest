import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { paint } from '../render/modelKit';
import { RatModel, type RatAnimInput } from '../player/ratModel';
import type { Pose } from '../player/animations';
import { Sparks, glowMaterial, twinkleGeometry, twinkleSize } from '../world/itemModels';
import { GUARD, type GuardState } from './guard';

/**
 * Keep Guard model: one of the king's collectors (the grey rats in royal purple that the story shows carrying off the
 * cheese), armed. He is the knight's own body in other colours, a touch bigger: a dark helmet with a violet spike, a
 * tall purple shield rimmed in iron, and a spear in place of the sword. So he moves like the knight does; what is his
 * own is laid over that: the spear held upright at his post, levelled over his shield as he comes on, drawn back with
 * a glint at its tip before he thrusts, stretched out after, and his shield flung wide when his guard is broken.
 */
const LOOK = { fur: 0x7a7480, furDark: 0x5e5964, cream: 0xbcb6c2, tunic: 0x4a2f6a, tunicDark: 0x35204e, scarf: 0x2a2030, leather: 0x3a2a30 };
const SCALE = 1.1;

export interface GuardAnimInput {
  state: GuardState;
  stateTime: number;
  /** How fast he is walking. */
  walking: number;
  /** Whether the wind-up he is in is the quick one (striking back). */
  counter: boolean;
}

type Part = Partial<Pose>;
// The spear arm in each of these was solved, not guessed: his hand put where the pose wants it and the shaft pointed
// where it should go, with the shaft kept clear of his own head, ears, body, shield and legs (the first try had it
// standing up through his head at his post). tools/posesolve.ts does the solving; tests/models.ts holds every pose to it. A part a pose does not
// name is the body's own underneath (his hips and feet while he walks, say).
/** At his post: bolt upright, the spear standing beside him at arm's length with its butt on the ground; shield at his side. */
const POST: Part = { armS: [-0.48, -1.14, -0.2], elbowS: -0.91, wrist: [-0.14, -0.18, 0], armH: [0.1, 0.1, 0.25], elbowH: -0.5, shield: [0, 0.5, 0], chest: [0, 0, 0], hips: [0, 0, 0], hipPos: [0, 0, 0], head: [0, 0, 0] };
/** Walking back to his post: the spear carried upright at his side, clear of the ground, shield down. */
const MARCH: Part = { armS: [-1.06, -0.7, -0.19], elbowS: -1.35, wrist: [0.79, -0.2, 0], armH: [0.1, 0.1, 0.25], elbowH: -0.5, shield: [0, 0.5, 0], chest: [0.03, 0, 0], head: [0, 0, 0] };
/** Coming on: shield square in front, spear levelled beside it at hip height, its point at whoever he faces. */
const LEVEL: Part = { armS: [-0.24, -0.41, -0.21], elbowS: -1.79, wrist: [1.66, 0.76, 0], armH: [-0.85, 0.35, 0.1], elbowH: -1.0, shield: [0, 0.1, 0], chest: [0.12, 0.25, 0], head: [-0.1, 0.25, 0] };
/** The tell: weight back, body turned side-on, the spear drawn right back past his hip, still pointing at its mark. */
const DRAW: Part = { armS: [0, -0.13, -0.9], elbowS: -1.32, wrist: [0.45, 0.55, 0], armH: [-1.05, 0.5, 0.0], elbowH: -0.9, shield: [0, 0.1, 0], chest: [0.02, -0.45, 0], hips: [0, -0.3, 0], hipPos: [0, -0.05, -0.07], head: [-0.05, 0.7, 0] };
/** The thrust: the whole of him behind the point, front knee bent, the spear driven out level along his right side. */
const THRUST: Part = { armS: [-0.71, 0, -1.46], elbowS: -0.74, wrist: [1.13, 0.05, 0], armH: [-0.5, 0.3, 0.55], elbowH: -1.0, shield: [0, 0.4, 0], chest: [0.4, 0.45, 0], hips: [0.15, 0.2, 0], hipPos: [0, -0.08, 0.13], head: [-0.3, -0.6, 0], footS: [-0.1, 0, 0.2], footH: [0.12, 0, -0.16] };
/** After it: still stretched out, the point dipping towards the floor, the shield hanging. */
const SPENT: Part = { armS: [-0.72, 0.63, -1.57], elbowS: -0.38, wrist: [1.15, 0.16, 0], armH: [0.15, 0.1, 0.5], elbowH: -0.35, shield: [0, 0.6, 0], chest: [0.42, 0.3, 0], hips: [0.12, 0.1, 0], hipPos: [0, -0.1, 0.08], head: [0.15, -0.4, 0], footS: [-0.1, 0, 0.16], footH: [0.12, 0, -0.14], ears: 0.5 };
/** Guard broken: reeling back, the shield arm flung out wide and the spear thrown up and out the other way. */
const BROKEN: Part = { armS: [-1.46, -0.53, -0.7], elbowS: -0.34, wrist: [0.89, 0.32, 0], armH: [-0.4, 0, 1.55], elbowH: -0.4, shield: [0, 1.2, 0], chest: [-0.3, 0, 0], hips: [-0.1, 0, 0], hipPos: [0, -0.04, -0.06], head: [-0.2, 0, 0], footS: [-0.13, 0, -0.06], footH: [0.13, 0, 0.05], ears: 0.5 };

function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** His spear: an ash shaft, an iron butt, a leaf-shaped head on a socket, and a tuft of violet under it. Along +Z from the grip. */
function buildSpear(mat: THREE.Material): { spear: THREE.Group; tip: THREE.Group } {
  const spear = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, color: number | ((nx: number, ny: number, nz: number) => number), z: number): void => {
    geo.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(paint(geo, color), mat);
    m.position.z = z;
    spear.add(m);
  };
  const BACK = 0.48;
  const FRONT = 0.62;
  add(new THREE.CylinderGeometry(0.014, 0.016, BACK + FRONT, 5), 0x8a6a42, (FRONT - BACK) / 2);
  add(new THREE.CylinderGeometry(0.022, 0.012, 0.06, 5), 0x4a4a56, -BACK);
  add(new THREE.CylinderGeometry(0.02, 0.026, 0.08, 5), 0x4a4a56, FRONT);
  add(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 6), 0x8a4ab0, FRONT - 0.06);
  // The head: a flat leaf, two-edged.
  const head = new THREE.ConeGeometry(0.05, 0.26, 4);
  head.scale(1, 1, 0.35);
  add(head, (_nx, ny) => (ny > 0.2 ? 0xe8eef4 : 0xb4bcc8), FRONT + 0.17);
  const tip = new THREE.Group();
  tip.position.z = FRONT + 0.3;
  spear.add(tip);
  return { spear, tip };
}

export class GuardModel {
  readonly root = new THREE.Group();
  private readonly rat = new RatModel(LOOK);
  private readonly spearMat = createPs1Material({ lit: true });
  private readonly glints: THREE.Mesh[] = [];
  private readonly glintMat = glowMaterial(0xfff4d0);
  private readonly shadow: THREE.Mesh;
  private readonly sparks = new Sparks();
  private flashAmount = 0;
  private weight = 1;
  private from: Part = POST;
  private to: Part = POST;
  private blend = 1;
  private last: GuardState = 'idle';
  private scale = 1;
  private time = 0;
  private readonly pose: Part = {};
  private readonly spear: THREE.Group;
  /** Dead, he lets go of it: where it lay when it left his hand, and where it comes to rest on the floor. */
  private dropped = false;
  private readonly dropFrom = { pos: new THREE.Vector3(), rot: new THREE.Quaternion() };
  private readonly dropTo = { pos: new THREE.Vector3(), rot: new THREE.Quaternion() };
  /** How much each part of the laid-over pose holds (0 = let go, the body underneath has it). */
  private readonly hold: Partial<Record<keyof Pose, number>> = {};
  private holdFrom: Partial<Record<keyof Pose, number>> = {};

  constructor() {
    const rat = this.rat;
    rat.setHelmet({ dome: 0x4a4458, rim: 0x2e2a38, spike: 0x9a6ac0 });
    rat.setShield({ face: 0x4a2f6a, trim: 0x8a8a9a });
    rat.setShieldScale(1.3);
    rat.setDress({ scarf: false });
    const { spear, tip } = buildSpear(this.spearMat);
    this.spear = spear;
    rat.setWeapon(spear);
    rat.ownMaterials();
    rat.root.scale.setScalar(SCALE);
    this.root.add(rat.root);
    // The glint on the spear's point: two crossed stars, so it shows from any side.
    const star = twinkleGeometry();
    for (const turn of [0, Math.PI / 2]) {
      const g = new THREE.Mesh(star, this.glintMat);
      g.rotation.y = turn;
      g.visible = false;
      tip.add(g);
      this.glints.push(g);
    }
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
    this.root.add(this.sparks.group);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** The sword rang off his shield (from that direction, world yaw): sparks. */
  glance(fromAngle: number): void {
    const local = fromAngle - this.root.rotation.y;
    this.sparks.burst(Math.sin(local) * 0.5, 0.62, Math.cos(local) * 0.5, 0xffe9a0, 6, 2.4, 0.13);
  }

  /** Flashes him white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  /**
   * Dead, the spear leaves his hand and clatters flat onto the floor beside him (held on, it stood up out of him as he
   * fell, its butt under the ground). Alive again, it is back in his hand.
   */
  private dropSpear(state: GuardState, stateTime: number): void {
    const spear = this.spear;
    if (state === 'dead' && !this.dropped) {
      this.dropped = true;
      this.root.updateMatrixWorld(true);
      this.root.attach(spear);
      this.dropFrom.pos.copy(spear.position);
      this.dropFrom.rot.copy(spear.quaternion);
      // Flat on the floor, lying the way it was pointing, a little out from him on his spear side.
      const along = new THREE.Vector3(0, 0, 1).applyQuaternion(spear.quaternion);
      const yaw = Math.hypot(along.x, along.z) > 0.2 ? Math.atan2(along.x, along.z) : 0.4;
      this.dropTo.rot.setFromEuler(new THREE.Euler(0, yaw, Math.PI / 2, 'YXZ'));
      this.dropTo.pos.set(Math.min(spear.position.x, -0.2) - 0.22, 0.035, spear.position.z + 0.1);
    } else if (state !== 'dead' && this.dropped) {
      this.dropped = false;
      this.rat.setWeapon(spear);
      spear.position.set(0, 0, 0);
      spear.quaternion.identity();
      spear.scale.setScalar(1);
    }
    if (!this.dropped) return;
    // It falls in a third of a second, with one small bounce.
    const t = Math.min(1, stateTime / 0.34);
    const k = t * t * (3 - 2 * t);
    spear.position.lerpVectors(this.dropFrom.pos, this.dropTo.pos, k);
    spear.position.y += 0.07 * Math.sin(Math.min(1, Math.max(0, (stateTime - 0.34) / 0.22)) * Math.PI);
    spear.quaternion.slerpQuaternions(this.dropFrom.rot, this.dropTo.rot, k);
  }

  /** The pose laid over the body for each thing he does. */
  private overlay(state: GuardState): Part {
    switch (state) {
      case 'idle':
        return POST;
      case 'return':
        return MARCH;
      case 'windup':
        return DRAW;
      case 'thrust':
        return THRUST;
      case 'recover':
        return SPENT;
      case 'broken':
      case 'stagger':
        return BROKEN;
      default:
        return LEVEL;
    }
  }

  update(dt: number, ctx: GuardAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    if (state !== this.last) {
      // Blend from where the last pose had got to.
      this.from = { ...this.pose };
      this.holdFrom = { ...this.hold };
      this.to = this.overlay(state);
      this.blend = 0;
      this.last = state;
    }
    // How fast he goes into each: the thrust snaps out, the wind-up is drawn, the rest settle.
    const rate = state === 'thrust' ? 30 : state === 'windup' ? (ctx.counter ? 13 : 9) : state === 'broken' || state === 'stagger' ? 16 : 8;
    this.blend = ease(this.blend, 1, dt, rate);
    for (const key of Object.keys({ ...this.from, ...this.to }) as Array<keyof Pose>) {
      // A part the new pose does not name is let go (its hold fades and the body underneath takes it back: his feet,
      // most of all, or he would stand frozen in his last lunge); one it names that was not held comes in at its value.
      const b = this.to[key];
      const held = this.holdFrom[key] ?? 0;
      this.hold[key] = held + ((b === undefined ? 0 : 1) - held) * this.blend;
      if (b === undefined) continue;
      const a = held > 0.001 ? this.from[key] ?? b : b;
      if (typeof a === 'number') (this.pose as Record<string, unknown>)[key] = a + ((b as number) - a) * this.blend;
      else (this.pose as Record<string, unknown>)[key] = [0, 1, 2].map((i) => a[i] + ((b as number[])[i] - a[i]) * this.blend);
    }
    // Small life in it: he looks about at his post, strains in the tell, pants when spent, shakes when broken.
    const p = { ...this.pose } as Part;
    if (state === 'idle' && p.head) {
      p.head = [p.head[0], p.head[1] + 0.32 * Math.sin(this.time * 0.6) * this.blend, p.head[2]];
    } else if (state === 'windup' && p.armS) {
      const k = Math.min(1, ctx.stateTime / (ctx.counter ? GUARD.counterWindup : GUARD.windup));
      p.armS = [p.armS[0] + 0.04 * Math.sin(this.time * 43) * k, p.armS[1], p.armS[2]];
    } else if (state === 'recover' && p.chest) {
      p.chest = [p.chest[0] + 0.05 * Math.sin(this.time * 9), p.chest[1], p.chest[2]];
    } else if (state === 'broken' && p.chest) {
      p.chest = [p.chest[0] + 0.05 * Math.sin(this.time * 6), p.chest[1], p.chest[2] + 0.08 * Math.sin(this.time * 4.3)];
    }
    // The body underneath is the knight's: standing, walking with his shield up, struck, or fallen.
    const base: RatAnimInput['state'] = state === 'dead' ? 'dead' : state === 'idle' ? 'idle' : state === 'return' ? 'walk' : 'guard';
    this.weight = ease(this.weight, state === 'dead' ? 0 : 1, dt, 12);
    this.rat.update(dt, {
      state: base, planarSpeed: ctx.walking, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0, verticalSpeed: 0, flipProgress: 0,
      armed: true, stowProgress: -1, plungeStage: 0, act: { headYaw: 0, headPitch: 0, gesture: null, weight: this.weight, pose: p, each: this.hold },
    });

    this.dropSpear(state, ctx.stateTime);

    // The glint: it swells on the point through the tell, brightest just before he goes.
    const tell = state === 'windup' ? Math.min(1, ctx.stateTime / (ctx.counter ? GUARD.counterWindup : GUARD.windup)) : 0;
    const size = state === 'windup' ? 0.04 + 0.13 * twinkleSize(0.08 + tell * 0.6) : 0;
    this.glints.forEach((g, i) => {
      g.visible = size > 0.01;
      g.scale.setScalar(size * (i ? 0.8 : 1));
      g.rotation.z = this.time * 5 * (i ? -1 : 1);
    });

    // Dead: he falls like the knight does, then is gone.
    const gone = state === 'dead' ? Math.min(1, Math.max(0, (ctx.stateTime - 1.3) / 0.6)) : 0;
    this.scale = state === 'dead' ? 1 - gone * gone * (3 - 2 * gone) : ease(this.scale, 1, dt, 8);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;

    this.sparks.update(dt);
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    this.rat.setFlash(f, f, f);
    (this.spearMat.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
