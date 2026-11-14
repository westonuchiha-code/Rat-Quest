import * as THREE from 'three';

/**
 * What the insect models share (the mantis was the first): springs that carry a pose's numbers from one pose to the
 * next, a way to point a part along a direction, and legs whose feet are planted on the floor and step.
 */
export function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

const aimTmp = { x: new THREE.Vector3(), y: new THREE.Vector3(), z: new THREE.Vector3(), m: new THREE.Matrix4() };
/** Turns `obj` so its own +X runs along `dir` and its +Y leans towards `edge` as nearly as it can. */
export function aim(obj: THREE.Object3D, dir: THREE.Vector3, edge: THREE.Vector3): void {
  const { x, y, z, m } = aimTmp;
  x.copy(dir).normalize();
  y.copy(edge).addScaledVector(x, -edge.dot(x));
  if (y.lengthSq() < 1e-5) y.set(0, 1, 0).addScaledVector(x, -x.y);
  if (y.lengthSq() < 1e-5) y.set(0, 0, 1);
  y.normalize();
  z.crossVectors(x, y);
  obj.quaternion.setFromRotationMatrix(m.makeBasis(x, y, z));
}

const boneTmp = { d: new THREE.Vector3(), p: new THREE.Vector3(), k: new THREE.Vector3(), v: new THREE.Vector3() };
/**
 * Lays two bones (groups whose own +X runs along the bone) from `from` to `to`, bending towards `pole`. If `to` is
 * further off than the two bones reach, they point at it at full stretch. Returns how far short of it they fall.
 */
export function twoBone(from: THREE.Vector3, to: THREE.Vector3, pole: THREE.Vector3, l1: number, l2: number, first: THREE.Object3D, second: THREE.Object3D): number {
  const { d, p, k, v } = boneTmp;
  d.copy(to).sub(from);
  const far = d.length();
  const reach = l1 + l2 - 0.005;
  const len = Math.max(0.02, Math.min(far, reach));
  d.normalize();
  const along = (l1 * l1 - l2 * l2 + len * len) / (2 * len);
  const high = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  p.copy(pole).addScaledVector(d, -pole.dot(d));
  if (p.lengthSq() < 1e-6) p.set(0, 1, 0).addScaledVector(d, -d.y);
  p.normalize();
  k.copy(from).addScaledVector(d, along).addScaledVector(p, high);
  first.position.copy(from);
  aim(first, v.copy(k).sub(from), p);
  second.position.copy(k);
  aim(second, v.copy(from).addScaledVector(d, len).sub(k), p);
  return Math.max(0, far - reach);
}

/** A row of numbers, each on a spring towards its target. */
export class Springs {
  readonly target: Float32Array;
  readonly value: Float32Array;
  private readonly velocity: Float32Array;
  private started = false;

  constructor(size: number) {
    this.target = new Float32Array(size);
    this.value = new Float32Array(size);
    this.velocity = new Float32Array(size);
  }

  /** Puts every number at its target, at rest. */
  snap(): void {
    this.value.set(this.target);
    this.velocity.fill(0);
    this.started = true;
  }

  /** `stiffness`: how hard they pull. `damping`: 1 comes to rest without overshooting, less and it wobbles. */
  step(dt: number, stiffness: number, damping: number): void {
    if (!this.started || dt > 0.5) {
      this.snap();
      return;
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < this.value.length; i++) {
        const a = stiffness * stiffness * (this.target[i] - this.value[i]) - 2 * damping * stiffness * this.velocity[i];
        this.velocity[i] += a * h;
        this.value[i] += this.velocity[i] * h;
      }
    }
  }
}

/** A leg of two bones (each a group whose own +X runs along the bone) with its foot planted on the floor. */
export interface WalkerLeg {
  side: -1 | 1;
  /** Where it joins the body, in the body's own space. */
  root: THREE.Vector3;
  /** Where its foot rests on the floor, from the model's middle. */
  rest: THREE.Vector3;
  /** Which way its knee points, in the body's space (before it is squared to the leg). */
  pole: THREE.Vector3;
  thigh: THREE.Object3D;
  shin: THREE.Object3D;
  /** Legs of one pair step together; the two pairs take turns. */
  pair: 0 | 1;
  /** The foot's place on the floor, in the world. */
  planted: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** How far through a step it is (1 = standing). */
  step: number;
}

export function walkerLeg(side: -1 | 1, root: THREE.Vector3, rest: THREE.Vector3, pole: THREE.Vector3, pair: 0 | 1, thigh: THREE.Object3D, shin: THREE.Object3D): WalkerLeg {
  return { side, root, rest, pole, pair, thigh, shin, planted: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), step: 1 };
}

export interface WalkerOptions {
  /** Bone lengths. */
  thigh: number;
  shin: number;
  /** How far the body may move off a foot before it steps: walking, and standing. */
  stride: number;
  strideStill: number;
  /** How long a step takes and how high the foot is lifted. */
  stepTime: number;
  lift: number;
}

/**
 * Plants a creature's feet. Each foot stays where it was put down, in the world, while the body moves over it; when
 * the body has gone too far off it, it steps to where it would rest now. The pairs take turns, so it is never off
 * both at once. `root` is the model's root (on the floor, moved and turned by the game); `body` is the part the legs
 * hang from, inside a rig that may be lifted off the floor (a jump).
 */
export class Walker {
  /** How fast the model is moving, in the world. */
  readonly speed = new THREE.Vector3();
  private readonly lastPos = new THREE.Vector3();
  private turn: 0 | 1 = 0;
  private first = true;
  private readonly t = { here: new THREE.Vector3(), home: new THREE.Vector3(), a: new THREE.Vector3(), f: new THREE.Vector3(), k: new THREE.Vector3(), pole: new THREE.Vector3(), knee: new THREE.Vector3() };

  constructor(private readonly root: THREE.Object3D, private readonly body: THREE.Object3D, readonly legs: WalkerLeg[], private readonly o: WalkerOptions) {}

  /**
   * `lift`: how far the rig is off the floor. `tuck`: 0 feet planted .. 1 feet off the floor, drawn to wherever
   * `fold` says (a place in the body's space; it fills `out`).
   */
  update(dt: number, lift: number, tuck: number, fold: ((leg: WalkerLeg, index: number, out: THREE.Vector3) => void) | null): void {
    const T = this.t;
    const o = this.o;
    this.root.updateMatrixWorld(true);
    const here = this.root.getWorldPosition(T.here);
    if (dt > 0) this.speed.copy(here).sub(this.lastPos).divideScalar(dt);
    const jumped = this.first || this.lastPos.distanceTo(here) > 1.2 || dt === 0;
    this.first = false;
    this.lastPos.copy(here);
    const moving = this.speed.length();
    const stepping = [false, false];
    for (const leg of this.legs) if (leg.step < 1) stepping[leg.pair] = true;

    this.legs.forEach((leg, index) => {
      // Where this foot would like to be: its resting place under the body as it is now, a little ahead if it is moving.
      T.home.copy(leg.rest);
      this.root.localToWorld(T.home);
      T.home.addScaledVector(this.speed, 0.1);
      T.home.y = here.y;
      if (jumped || tuck > 0.5) {
        leg.planted.copy(T.home);
        leg.step = 1;
      } else if (leg.step >= 1) {
        const off = leg.planted.distanceTo(T.home);
        const limit = moving > 0.3 ? o.stride : o.strideStill;
        if (off > limit && !stepping[leg.pair === 0 ? 1 : 0] && (stepping[leg.pair] || this.turn === leg.pair || off > limit * 2.2)) {
          leg.from.copy(leg.planted);
          leg.to.copy(T.home).addScaledVector(this.speed, o.stepTime * 0.6);
          leg.step = 0;
          stepping[leg.pair] = true;
          this.turn = leg.pair === 0 ? 1 : 0;
        }
      }
      let lifted = 0;
      if (leg.step < 1) {
        leg.step = Math.min(1, leg.step + dt / o.stepTime);
        const u = leg.step * leg.step * (3 - 2 * leg.step);
        leg.planted.lerpVectors(leg.from, leg.to, u);
        lifted = o.lift * Math.sin(leg.step * Math.PI);
      }
      // The foot, in the rig's space (the rig is the model lifted by its jump).
      T.f.copy(leg.planted);
      this.root.worldToLocal(T.f);
      T.f.y = lifted - lift;
      T.a.copy(leg.root).applyQuaternion(this.body.quaternion).add(this.body.position);
      if (tuck > 0 && fold) {
        fold(leg, index, T.k);
        T.k.applyQuaternion(this.body.quaternion).add(this.body.position);
        T.f.lerp(T.k, tuck);
        // Wherever it is drawn to, a foot is never under the floor.
        if (T.f.y < -lift) T.f.y = -lift;
      }
      // Two bones from the joint to the foot, the knee pointing where the leg says.
      const d = T.k.copy(T.f).sub(T.a);
      let len = d.length();
      const reach = o.thigh + o.shin - 0.02;
      if (len > reach) {
        d.multiplyScalar(reach / len);
        len = reach;
      }
      const along = (o.thigh * o.thigh - o.shin * o.shin + len * len) / (2 * Math.max(0.05, len));
      const high = Math.sqrt(Math.max(0, o.thigh * o.thigh - along * along));
      d.normalize();
      T.pole.copy(leg.pole).applyQuaternion(this.body.quaternion);
      T.pole.addScaledVector(d, -T.pole.dot(d)).normalize();
      T.knee.copy(T.a).addScaledVector(d, along).addScaledVector(T.pole, high);
      leg.thigh.position.copy(T.a);
      aim(leg.thigh, T.home.copy(T.knee).sub(T.a), T.pole);
      leg.shin.position.copy(T.knee);
      aim(leg.shin, T.home.copy(T.a).addScaledVector(d, len).sub(T.knee), T.pole);
    });
  }

  /** Where each foot is, in the world. */
  feet(): THREE.Vector3[] {
    this.root.updateMatrixWorld(true);
    return this.legs.map((leg) => leg.shin.localToWorld(new THREE.Vector3(this.o.shin, 0, 0)));
  }
}
