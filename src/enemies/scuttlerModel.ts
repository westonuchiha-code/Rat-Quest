import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import type { ScuttlerState } from './scuttler';

/**
 * Scuttler model: a fat armoured sewer roach about the size of the rat, built from stretched low-poly spheres
 * and tapered legs. It faces +Z with its feet on y = 0.
 * The animation is what makes the fight readable: it rears up and its eyes turn red before it lunges,
 * and it sags, spent, afterwards.
 */

const C = {
  shell: 0x4b2f3c,
  shellLight: 0x7a4a52,
  belly: 0x8a7a55,
  head: 0x33222b,
  leg: 0x2a1c22,
  jaw: 0xc9b98a,
};

export interface ScuttlerAnimInput {
  state: ScuttlerState;
  stateTime: number;
  moving: boolean;
}

function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

interface Leg {
  hip: THREE.Group;
  knee: THREE.Group;
  side: number;
  set: number; // 0 or 1: which half of the alternating gait this leg belongs to
  restSweep: number;
}

export class ScuttlerModel {
  readonly root = new THREE.Group();
  private readonly material = createPs1Material({ lit: true });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23a });
  private readonly body = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly jaws: THREE.Group[] = [];
  private readonly feelers: THREE.Group[] = [];
  private readonly legs: Leg[] = [];
  private readonly shadow: THREE.Mesh;

  private time = 0;
  private gait = 0;
  private flashAmount = 0;
  private pitch = 0;
  private height = 0.3;
  private roll = 0;
  private jawOpen = 0.25;
  private stretch = 1;
  private scale = 1;
  private legCurl = 0;
  private frontRaise = 0;

  constructor() {
    const mat = this.material;
    const paint = (geo: THREE.BufferGeometry, color: number | ((x: number, y: number, z: number) => number)): THREE.BufferGeometry => {
      const pos = geo.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        c.set(typeof color === 'number' ? color : color(pos.getX(i), pos.getY(i), pos.getZ(i)));
        colors.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geo;
    };
    const blob = (sx: number, sy: number, sz: number, color: number | ((x: number, y: number, z: number) => number), x: number, y: number, z: number, w = 8, h = 6): THREE.Mesh => {
      const geo = new THREE.SphereGeometry(1, w, h);
      geo.scale(sx, sy, sz);
      const m = new THREE.Mesh(paint(geo, color), mat);
      m.position.set(x, y, z);
      return m;
    };
    /** A tapered piece running from the origin along +X. */
    const spar = (r0: number, r1: number, length: number, color: number, sides = 5): THREE.Mesh => {
      const geo = new THREE.CylinderGeometry(r1, r0, length, sides, 1);
      geo.translate(0, length / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      return new THREE.Mesh(paint(geo, color), mat);
    };

    this.root.add(this.body);

    // Abdomen: a domed shell with paler bands across it and a soft underside.
    const banded = (_x: number, y: number, z: number): number => {
      if (y < -0.1) return C.belly;
      return Math.floor((z + 2) * 7) % 2 === 0 ? C.shell : C.shellLight;
    };
    this.body.add(
      blob(0.37, 0.27, 0.5, banded, 0, 0.02, -0.14, 9, 7),
      blob(0.3, 0.22, 0.24, (_x, y) => (y < -0.09 ? C.belly : C.shell), 0, -0.01, 0.3, 8, 5),
    );

    // Head: low and forward, with yellow eyes, two hooked jaws and long feelers.
    this.headGroup.position.set(0, -0.06, 0.48);
    this.body.add(this.headGroup);
    this.headGroup.add(blob(0.19, 0.15, 0.17, C.head, 0, 0, 0.04, 7, 5));
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), this.eyeMaterial);
      eye.position.set(side * 0.11, 0.06, 0.14);
      this.headGroup.add(eye);

      const jaw = new THREE.Group();
      jaw.position.set(side * 0.08, -0.07, 0.15);
      const fang = spar(0.04, 0.008, 0.2, C.jaw, 4);
      fang.rotation.y = -Math.PI / 2; // point forward
      jaw.add(fang);
      const hook = spar(0.022, 0.004, 0.09, C.jaw, 4);
      hook.position.set(0, 0, 0.19);
      hook.rotation.y = -Math.PI / 2 + side * 1.0; // the tip hooks inward
      jaw.add(hook);
      this.headGroup.add(jaw);
      this.jaws.push(jaw);

      const feeler = new THREE.Group();
      feeler.position.set(side * 0.07, 0.11, 0.1);
      const f1 = spar(0.014, 0.009, 0.3, C.leg, 4);
      f1.rotation.y = -Math.PI / 2;
      const tipPivot = new THREE.Group();
      tipPivot.position.set(0, 0, 0.3);
      const f2 = spar(0.009, 0.003, 0.3, C.leg, 4);
      f2.rotation.y = -Math.PI / 2;
      tipPivot.add(f2);
      feeler.add(f1, tipPivot);
      this.headGroup.add(feeler);
      this.feelers.push(feeler, tipPivot);
    }

    // Six legs. Each has an upper part reaching out and up to a knee, and a lower part stabbing down to the ground.
    const hips: Array<[number, number]> = [[0.3, 0.9], [0.06, 0.1], [-0.2, -0.75]]; // z along the body, resting sweep
    hips.forEach(([z, sweep], row) => {
      for (const side of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(side * 0.24, -0.1, z);
        hip.rotation.order = 'YZX';
        const upper = spar(0.045, 0.03, 0.3, C.leg, 5);
        const knee = new THREE.Group();
        knee.position.set(0.3, 0, 0);
        const lower = spar(0.03, 0.006, 0.36, C.leg, 5);
        knee.add(lower);
        hip.add(upper, knee);
        this.body.add(hip);
        this.legs.push({ hip, knee, side, set: (row + (side > 0 ? 1 : 0)) % 2, restSweep: sweep });
      }
    });

    // Blob shadow.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 10),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.scale.set(1, 1.3, 1);
    this.root.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes the whole body white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: ScuttlerAnimInput): void {
    this.time += dt;
    const t = ctx.stateTime;
    const state = ctx.state;
    if (ctx.moving) this.gait += dt * 17;

    // Targets for the body. Each state changes a few of them.
    let pitch = 0; // negative rears the front up
    let height = 0.3 + Math.sin(this.time * 3) * 0.008;
    let roll = 0;
    let jaw = 0.25 + Math.sin(this.time * 5) * 0.08;
    let stretch = 1;
    let scale = 1;
    let curl = 0;
    let frontRaise = 0;
    let shake = 0;
    let eyeHot = 0;
    let rate = 12;

    if (state === 'chase' || state === 'return') {
      height += Math.abs(Math.sin(this.gait)) * 0.015;
      roll = Math.sin(this.gait) * 0.05;
    } else if (state === 'windup') {
      // The tell: rear up, jaws wide, eyes red, shaking harder as the lunge gets close.
      const k = smooth(t / 0.25);
      pitch = -0.6 * k;
      height = 0.36;
      jaw = 1.1;
      frontRaise = k;
      shake = 0.012 + 0.025 * Math.min(1, t / 0.6);
      eyeHot = 0.5 + 0.5 * Math.sin(t * 28);
      stretch = 0.92;
      rate = 16;
    } else if (state === 'lunge') {
      pitch = 0.22;
      height = 0.24;
      jaw = t > 0.12 ? -0.1 : 1.0; // snaps shut at the end
      stretch = 1.22;
      eyeHot = 1;
      rate = 30;
    } else if (state === 'recover') {
      // Spent: sags to the floor and pants.
      height = 0.2 + Math.sin(this.time * 9) * 0.012;
      pitch = 0.1;
      jaw = 0.5;
      stretch = 0.96;
      rate = 9;
    } else if (state === 'stagger') {
      pitch = -0.3;
      height = 0.27;
      roll = Math.sin(t * 30) * 0.12 * Math.max(0, 1 - t / 0.4);
      jaw = 0.9;
      stretch = 0.85;
      rate = 24;
    } else if (state === 'dead') {
      // Flips onto its back, legs curl and twitch, then it shrivels away.
      roll = Math.PI * smooth(t / 0.3);
      height = 0.26 + 0.3 * Math.sin(Math.min(1, t / 0.35) * Math.PI);
      curl = smooth((t - 0.15) / 0.4);
      jaw = 0.7;
      scale = 1 - smooth((t - 1.3) / 0.6);
      rate = 40;
    }

    this.pitch = ease(this.pitch, pitch, dt, rate);
    this.height = ease(this.height, height, dt, rate);
    this.roll = state === 'dead' ? roll : ease(this.roll > 1 ? 0 : this.roll, roll, dt, rate);
    this.jawOpen = ease(this.jawOpen, jaw, dt, rate * 1.5);
    this.stretch = ease(this.stretch, stretch, dt, rate);
    this.scale = state === 'dead' ? scale : ease(this.scale, scale, dt, 8);
    this.legCurl = ease(this.legCurl, curl, dt, 14);
    this.frontRaise = ease(this.frontRaise, frontRaise, dt, 16);

    this.body.position.set(shake * Math.sin(this.time * 61), this.height, shake * Math.cos(this.time * 53));
    this.body.rotation.set(this.pitch, 0, this.roll);
    this.body.scale.set(2 - this.stretch, 1, this.stretch);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;

    this.headGroup.rotation.x = state === 'windup' ? -0.3 : state === 'recover' ? 0.25 : 0;
    this.jaws[0].rotation.y = -this.jawOpen;
    this.jaws[1].rotation.y = this.jawOpen;
    const droop = state === 'recover' || state === 'dead' ? 0.5 : 0;
    this.feelers.forEach((f, i) => {
      const tip = i % 2 === 1;
      const side = i < 2 ? -1 : 1;
      f.rotation.x = (tip ? 0.5 : -0.75) + droop + Math.sin(this.time * 4 + i) * 0.12;
      f.rotation.y = tip ? 0 : side * (0.35 + Math.sin(this.time * 2.6 + i * 2) * 0.15);
    });

    // Legs: two sets of three step in turn. Rearing lifts the front pair; dying curls them all in.
    for (const leg of this.legs) {
      const phase = this.gait + leg.set * Math.PI;
      const step = ctx.moving ? Math.sin(phase) : 0;
      const liftStep = ctx.moving ? Math.max(0, Math.cos(phase)) : 0;
      const front = leg.restSweep > 0.5 ? this.frontRaise : 0;
      const twitch = state === 'dead' ? Math.sin(this.time * 23 + leg.restSweep * 5) * 0.12 * Math.max(0, 1 - t / 1.2) : 0;
      const sweep = leg.restSweep * 0.5 + step * 0.4 + front * 0.5;
      const raise = 0.45 + liftStep * 0.3 + front * 0.9 + this.legCurl * 0.7 + twitch;
      // The leg is built along +X. The left legs are turned round to point the other way.
      leg.hip.rotation.y = leg.side > 0 ? -sweep : Math.PI + sweep;
      leg.hip.rotation.z = raise;
      leg.knee.rotation.z = -1.75 - liftStep * 0.2 + front * 0.6 - this.legCurl * 1.0 + this.pitch * 0.3;
    }

    // Eyes go from yellow to red as a warning. The body flashes white when hit.
    this.eyeMaterial.color.setRGB(1, 0.82 - 0.7 * eyeHot, 0.23 - 0.2 * eyeHot);
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.material.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
