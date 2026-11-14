import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import type { ToadState } from './toad';

/**
 * Gloop toad model: a squat, warty sewer toad, wider than the rat and a bit shorter, built from squashed spheres.
 * It faces +Z with its feet on y = 0. The tell before a spit is big and clear: the throat sac swells and glows green,
 * the head tips back, then it snaps forward and the sac empties.
 */
const C = {
  back: 0x4a6a2a,
  wart: 0x6a8a32,
  belly: 0xc8b878,
  mouth: 0x3a1a1a,
  eye: 0xf0d040,
  leg: 0x3c5a22,
};

export interface ToadAnimInput {
  state: ToadState;
  stateTime: number;
  moving: boolean;
  hopY: number;
}

function ease(cur: number, target: number, dt: number, rate: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

export class ToadModel {
  readonly root = new THREE.Group();
  private readonly material = createPs1Material({ lit: true });
  private readonly sacMat = new THREE.MeshBasicMaterial({ color: 0x9aff6a });
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly sac: THREE.Mesh;
  private readonly legs: Array<{ g: THREE.Group; front: boolean; side: number }> = [];
  private readonly shadow: THREE.Mesh;
  private time = 0;
  private flashAmount = 0;
  private sacSize = 0.4;
  private lean = 0;
  private squash = 1;
  private scale = 1;
  private roll = 0;

  constructor() {
    const mat = this.material;
    const blob = (sx: number, sy: number, sz: number, color: number | ((x: number, y: number, z: number) => number), x: number, y: number, z: number, w = 8, h = 6): THREE.Mesh => {
      const geo = new THREE.SphereGeometry(1, w, h);
      geo.scale(sx, sy, sz);
      const pos = geo.attributes.position;
      const cols = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        c.set(typeof color === 'number' ? color : color(pos.getX(i), pos.getY(i), pos.getZ(i)));
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    };
    // Warts: every few vertices on the back is a lighter green bump.
    const skin = (x: number, y: number, z: number): number => (y < -0.05 ? C.belly : (Math.round(x * 31 + z * 17 + y * 13) % 5 === 0 ? C.wart : C.back));

    this.root.add(this.body);
    this.body.add(blob(0.55, 0.36, 0.5, skin, 0, 0.36, -0.05, 9, 7));
    // Head: wide and flat, with a big mouth line and two eyes on top.
    this.head.position.set(0, 0.42, 0.32);
    this.body.add(this.head);
    this.head.add(blob(0.44, 0.22, 0.32, skin, 0, 0.04, 0.08, 9, 6));
    this.jaw.position.set(0, -0.04, 0.02);
    this.head.add(this.jaw);
    this.jaw.add(blob(0.42, 0.1, 0.3, C.belly, 0, -0.04, 0.08, 9, 5));
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.05), new THREE.MeshBasicMaterial({ color: C.mouth }));
    lip.position.set(0, 0.0, 0.36);
    this.head.add(lip);
    const eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x101010 });
    for (const side of [-1, 1]) {
      this.head.add(blob(0.12, 0.12, 0.12, C.back, side * 0.22, 0.2, 0.12, 6, 5));
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeMat);
      eye.position.set(side * 0.24, 0.24, 0.17);
      this.head.add(eye);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.02), pupilMat);
      pupil.position.set(side * 0.25, 0.24, 0.26);
      this.head.add(pupil);
    }
    // The throat sac: glows when it is about to spit.
    this.sac = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), this.sacMat);
    this.sac.position.set(0, -0.12, 0.2);
    this.head.add(this.sac);
    // Legs: big folded back legs, small front ones.
    for (const side of [-1, 1]) {
      for (const front of [true, false]) {
        const g = new THREE.Group();
        g.position.set(side * (front ? 0.3 : 0.42), front ? 0.18 : 0.2, front ? 0.3 : -0.25);
        if (front) g.add(blob(0.07, 0.2, 0.07, C.leg, 0, -0.08, 0.03, 5, 4));
        else {
          g.add(blob(0.16, 0.14, 0.3, skin, 0, 0, 0.0, 6, 5));
          g.add(blob(0.12, 0.05, 0.22, C.leg, side * 0.04, -0.15, 0.18, 6, 4));
        }
        this.body.add(g);
        this.legs.push({ g, front, side });
      }
    }
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 10),
      new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: ToadAnimInput): void {
    this.time += dt;
    const t = ctx.stateTime;
    let sac = 0.4 + 0.08 * Math.sin(this.time * 3);
    let lean = 0;
    let squash = 1 + 0.03 * Math.sin(this.time * 3);
    let jaw = 0;
    let glow = 0;
    let roll = 0;
    let scale = 1;
    switch (ctx.state) {
      case 'windup':
        // The throat swells and glows, the head tips back.
        sac = 0.5 + 1.3 * Math.min(1, t / 0.8);
        glow = Math.min(1, t / 0.8);
        lean = -0.35 * Math.min(1, t / 0.6);
        squash = 1 - 0.12 * Math.min(1, t / 0.8);
        break;
      case 'recover':
        // Snaps forward, mouth open, then sags.
        sac = 0.25;
        lean = t < 0.15 ? 0.35 : 0.15;
        jaw = t < 0.3 ? 0.5 : 0.15;
        squash = 1.08;
        break;
      case 'hop':
        squash = ctx.hopY > 0.05 ? 1.25 : 0.8;
        lean = -0.2;
        break;
      case 'crouch':
        // The tell for a pounce: it flattens itself to the floor, quivering, mouth shut, eyes on him.
        squash = 0.62 + 0.04 * Math.sin(t * 40);
        lean = 0.28;
        sac = 0.2;
        break;
      case 'pounce':
        // In the air, stretched out, belly first; mouth wide as it comes down.
        squash = 1.3;
        lean = 0.45;
        jaw = 0.6;
        break;
      case 'stagger':
        squash = 0.8 + 0.2 * Math.abs(Math.sin(t * 25));
        jaw = 0.3;
        break;
      case 'dead':
        roll = Math.PI * Math.min(1, t / 0.3);
        jaw = 0.5;
        scale = 1 - Math.min(1, Math.max(0, (t - 1.2) / 0.6));
        break;
    }
    this.sacSize = ease(this.sacSize, sac, dt, 12);
    this.lean = ease(this.lean, lean, dt, 14);
    this.squash = ease(this.squash, squash, dt, 18);
    this.roll = ctx.state === 'dead' ? roll : ease(this.roll, 0, dt, 10);
    this.scale = ctx.state === 'dead' ? scale : ease(this.scale, 1, dt, 8);

    this.sac.scale.setScalar(this.sacSize);
    this.sacMat.color.setRGB(0.45 + 0.45 * glow, 0.75 + 0.25 * glow, 0.4 * (1 - glow) + 0.2);
    this.head.rotation.x = this.lean;
    this.jaw.rotation.x = jaw;
    this.body.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));
    this.body.position.y = ctx.hopY;
    this.body.rotation.z = this.roll;
    for (const l of this.legs) {
      const stretch = ctx.state === 'hop' && !l.front ? Math.max(0, 1 - t / 0.25) : 0;
      l.g.rotation.x = stretch * -1.1;
    }
    this.shadow.scale.setScalar(Math.max(0.4, 1 - ctx.hopY * 0.4));
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.material.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
