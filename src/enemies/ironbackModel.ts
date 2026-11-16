import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import type { IronbackState } from './ironback';
import { IRONBACK } from './ironback';

/**
 * Ironback model: a squat rhinoceros beetle twice the rat's width, its back two domes of dark riveted iron, a great
 * curved horn, and a soft ribbed tail end showing pale under the back of the shell (the place to hit it).
 * It faces +Z with its feet on y = 0.
 * The animation carries the fight: before a ram it lowers its horn (the tip glowing hotter), paws the ground and snorts
 * steam; before a buck its back end lifts; on its back its legs wave in the air. A glance throws sparks.
 */

const C = {
  iron: 0x4a5058,
  ironDark: 0x2c3036,
  ironLight: 0x6d7580,
  rivet: 0xc0823e,
  belly: 0x3a2b22,
  soft: 0xd8987a,
  softDark: 0xa86a52,
  head: 0x26282d,
  horn: 0x5a6068,
  leg: 0x1f2024,
};

export interface IronbackAnimInput {
  state: IronbackState;
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
  set: number;
  row: number;
}

export class IronbackModel {
  readonly root = new THREE.Group();
  // (Each has a picture of its SURFACE, in greys, laid over the colours painted on it: the texture pass, 2026-11-16.)
  private readonly material = createPs1Material({ lit: true, shine: 0.45, tex: getTexture('stagShell') });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff9a2a });
  private readonly hornTipMaterial = new THREE.MeshBasicMaterial({ color: 0x5a6068 });
  private readonly body = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly legs: Leg[] = [];
  private readonly shadow: THREE.Mesh;
  private readonly puffs: Array<{ mesh: THREE.Mesh; age: number; vx: number; vy: number; vz: number }> = [];
  private readonly sparks: Array<{ mesh: THREE.Mesh; age: number; vx: number; vy: number; vz: number }> = [];
  private readonly puffGeo = new THREE.OctahedronGeometry(0.05, 0);
  private readonly sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });

  private time = 0;
  private gait = 0;
  private flashAmount = 0;
  private pitch = 0;
  private height = 0.36;
  private roll = 0;
  private headDip = 0;
  private tailLift = 0;
  private scale = 1;
  private paw = 0;
  private puffTimer = 0;

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
    const blob = (sx: number, sy: number, sz: number, color: number | ((x: number, y: number, z: number) => number), x: number, y: number, z: number, w = 9, h = 6): THREE.Mesh => {
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
    const rivet = (x: number, y: number, z: number): THREE.Mesh => {
      const m = new THREE.Mesh(paint(new THREE.SphereGeometry(0.045, 5, 4), C.rivet), mat);
      m.position.set(x, y, z);
      return m;
    };

    this.root.add(this.body);

    // Underside and the soft tail end: pale ribbed segments under the back edge of the shell.
    this.body.add(blob(0.62, 0.22, 0.72, C.belly, 0, -0.08, -0.02, 9, 5));
    this.tail.position.set(0, -0.06, -0.62);
    this.body.add(this.tail);
    for (let i = 0; i < 3; i++) {
      const seg = blob(0.42 - i * 0.09, 0.2 - i * 0.03, 0.14, i % 2 ? C.softDark : C.soft, 0, -i * 0.02, -i * 0.13, 8, 5);
      this.tail.add(seg);
    }

    // The shell: one broad iron carapace (its two wing cases meet at a dark seam down the middle), banded plates, and
    // rivets along the seam and round the rim.
    const plate = (x: number, y: number, z: number): number => {
      if (y < 0.02) return C.ironDark;
      if (Math.abs(x) < 0.07) return C.ironDark;
      if (y < 0.12) return C.ironLight; // a worn bright edge all round the rim
      return Math.floor((z + 2) * 3.2) % 2 === 0 ? C.iron : C.ironLight;
    };
    this.body.add(blob(0.66, 0.4, 0.74, plate, 0, 0.1, -0.05, 12, 8));
    for (let k = 0; k < 5; k++) {
      const z = 0.45 - k * 0.24;
      const h = 0.1 + 0.4 * Math.sqrt(Math.max(0, 1 - ((z + 0.05) / 0.74) ** 2));
      this.body.add(rivet(-0.1, h, z), rivet(0.1, h, z));
    }
    for (let k = 0; k < 7; k++) {
      const a = (k / 6) * Math.PI;
      for (const side of [-1, 1]) this.body.add(rivet(side * Math.sin(a) * 0.64, 0.13, -0.05 + Math.cos(a) * 0.72));
    }
    // The collar plate behind the head.
    this.body.add(blob(0.5, 0.26, 0.24, (_x, y) => (y < 0 ? C.ironDark : C.ironLight), 0, 0.08, 0.6, 9, 5));
    this.body.add(rivet(-0.28, 0.24, 0.66), rivet(0, 0.33, 0.7), rivet(0.28, 0.24, 0.66));

    // Head: low and blunt, two glowing eyes, and the horn sweeping up and forward.
    this.headGroup.position.set(0, 0.02, 0.8);
    this.body.add(this.headGroup);
    this.headGroup.add(blob(0.3, 0.2, 0.24, C.head, 0, 0, 0.06, 8, 5));
    for (const side of [-1, 1]) {
      // A furnace eye deep under an iron brow, with a dark slit in it.
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), this.eyeMaterial);
      eye.position.set(side * 0.2, 0.06, 0.2);
      this.headGroup.add(eye);
      const slit = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 3), new THREE.MeshBasicMaterial({ color: 0x1a0c06 }));
      slit.position.set(side * 0.215, 0.06, 0.25);
      slit.scale.set(1.2, 0.4, 0.4);
      this.headGroup.add(slit);
      const brow = blob(0.11, 0.04, 0.09, C.iron, side * 0.19, 0.13, 0.17, 5, 3);
      brow.rotation.z = side * 0.4;
      this.headGroup.add(brow);
      // A short feeler, clubbed at the end like a beetle's.
      const feeler = spar(0.02, 0.014, 0.16, C.leg, 4);
      feeler.position.set(side * 0.24, 0.02, 0.22);
      feeler.rotation.y = side > 0 ? -0.7 : Math.PI + 0.7;
      feeler.add(blob(0.035, 0.028, 0.028, C.horn, 0.17, 0, 0, 4, 3));
      this.headGroup.add(feeler);
      // Two small mandibles.
      const jaw = spar(0.05, 0.01, 0.16, C.horn, 4);
      jaw.position.set(side * 0.1, -0.1, 0.24);
      jaw.rotation.y = -Math.PI / 2 + side * 0.4;
      this.headGroup.add(jaw);
    }
    // The horn: a thick base jutting forward, bending up into a long hooked point (the tip glows before a ram).
    const horn = new THREE.Group();
    horn.position.set(0, 0.1, 0.24);
    const h1 = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.075, 0.13, 0.36, 6).translate(0, 0.18, 0), C.horn), mat);
    h1.rotation.x = 1.05; // forward, rising a little
    // Two heavy rings round the root of the horn, where it is bolted on.
    for (const [at, r] of [[0.03, 0.15], [0.13, 0.125]]) {
      const ring = new THREE.Mesh(paint(new THREE.CylinderGeometry(r * 0.94, r, 0.045, 6).translate(0, at, 0), C.ironDark), mat);
      h1.add(ring);
    }
    horn.add(h1);
    const bend = new THREE.Group();
    bend.position.set(0, 0.18, 0.31);
    const h2 = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.05, 0.078, 0.3, 6).translate(0, 0.15, 0), C.horn), mat);
    h2.rotation.x = 0.35; // then up
    bend.add(h2);
    const tip = new THREE.Group();
    tip.position.set(0, 0.28, 0.1);
    tip.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.26, 6).translate(0, 0.13, 0), this.hornTipMaterial));
    tip.rotation.x = -0.35; // hooking back at the end
    bend.add(tip);
    horn.add(bend);
    this.headGroup.add(horn);

    // Six short, thick legs.
    const rows: Array<[number, number]> = [[0.45, 0.7], [0.05, 0], [-0.38, -0.7]];
    rows.forEach(([z, sweep], row) => {
      for (const side of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(side * 0.5, -0.12, z);
        hip.rotation.order = 'YZX';
        const upper = spar(0.075, 0.055, 0.3, C.leg, 5);
        const knee = new THREE.Group();
        knee.position.set(0.3, 0, 0);
        const lower = spar(0.055, 0.02, 0.36, C.leg, 5);
        knee.add(lower, blob(0.065, 0.065, 0.065, C.ironDark, 0, 0, 0, 5, 4));
        // A plate of iron on the shin, and two claws on the foot.
        const greave = blob(0.09, 0.05, 0.045, C.iron, 0.14, 0.02, 0, 5, 3);
        knee.add(greave);
        for (const k of [-1, 1]) {
          const claw = spar(0.016, 0.003, 0.09, C.horn, 3);
          claw.position.set(0.34, 0, k * 0.025);
          claw.rotation.set(0, -k * 0.5, 0.9);
          knee.add(claw);
        }
        hip.add(upper, knee);
        hip.userData.sweep = sweep;
        this.body.add(hip);
        this.legs.push({ hip, knee, side, set: (row + (side > 0 ? 1 : 0)) % 2, row });
      }
    });

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.85, 12), lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false })));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.scale.set(1, 1.25, 1);
    this.root.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  /** The sword glanced off: a spray of sparks from the shell, toward where the blow came from (an angle in world space). */
  glance(fromAngle: number): void {
    const local = fromAngle - this.root.rotation.y;
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), this.sparkMat);
      const a = local + (Math.random() - 0.5) * 1.6;
      m.position.set(Math.sin(local) * 0.6, 0.55, Math.cos(local) * 0.6);
      this.root.add(m);
      this.sparks.push({ mesh: m, age: 0, vx: Math.sin(a) * (2 + Math.random() * 2), vy: 1.5 + Math.random() * 2.5, vz: Math.cos(a) * (2 + Math.random() * 2) });
    }
  }

  update(dt: number, ctx: IronbackAnimInput): void {
    this.time += dt;
    const t = ctx.stateTime;
    const state = ctx.state;
    const I = IRONBACK;
    const fast = state === 'ram';
    if (ctx.moving || fast) this.gait += dt * (fast ? 26 : 9);

    let pitch = 0;
    let height = 0.36 + Math.sin(this.time * 2) * 0.006;
    let roll = Math.sin(this.gait * 0.5) * (ctx.moving ? 0.035 : 0);
    let headDip = 0;
    let tailLift = 0;
    let scale = 1;
    let paw = 0;
    let shake = 0;
    let hot = 0;
    let rate = 10;
    let legsUp = 0;
    let steam = false;

    switch (state) {
      case 'windup': {
        // The tell: horn down, rocking back, pawing the ground, steam from the nostrils, the horn heating.
        const k = Math.min(1, t / I.windup);
        headDip = 0.45 * smooth(t / 0.3);
        pitch = 0.12;
        height = 0.32;
        paw = Math.max(0, Math.sin(t * 16));
        shake = 0.01 + 0.02 * k;
        hot = k;
        steam = true;
        rate = 14;
        break;
      }
      case 'ram':
        headDip = 0.5;
        pitch = 0.2;
        height = 0.34 + Math.abs(Math.sin(this.gait)) * 0.03;
        hot = 1;
        rate = 20;
        break;
      case 'tossWind':
        headDip = 0.6 * smooth(t / I.tossWind);
        pitch = 0.1;
        hot = 0.4;
        rate = 18;
        break;
      case 'toss':
        headDip = -0.8;
        pitch = -0.25;
        hot = 0.6;
        rate = 30;
        break;
      case 'buckWind':
        tailLift = 0.5 * smooth(t / I.buckWind);
        pitch = 0.22 * smooth(t / I.buckWind);
        shake = 0.015;
        rate = 16;
        break;
      case 'buck':
        tailLift = 0.9;
        pitch = 0.4;
        height = 0.42;
        rate = 30;
        break;
      case 'recover':
        height = 0.3 + Math.sin(this.time * 7) * 0.01;
        pitch = 0.08;
        headDip = 0.2;
        steam = t < 0.4;
        rate = 8;
        break;
      case 'stagger':
        pitch = -0.15;
        roll = Math.sin(t * 34) * 0.1 * Math.max(0, 1 - t / 0.35);
        rate = 24;
        break;
      case 'flipped':
        // On its back: rocking, legs waving at the roof.
        roll = Math.PI + Math.sin(this.time * 6) * 0.18;
        height = 0.42 + (t < 0.25 ? Math.sin((t / 0.25) * Math.PI) * 0.35 : 0);
        legsUp = 1;
        rate = 18;
        break;
      case 'rise':
        roll = Math.PI * (1 - smooth(t / I.riseTime));
        height = 0.42 + Math.sin(Math.min(1, t / I.riseTime) * Math.PI) * 0.4;
        legsUp = 1 - smooth(t / I.riseTime);
        rate = 30;
        break;
      case 'dead':
        roll = this.roll > 1 ? Math.PI : Math.PI * smooth(t / 0.35);
        height = 0.4;
        legsUp = 1;
        scale = 1 - smooth((t - 1.4) / 0.6);
        rate = 30;
        break;
    }

    this.pitch = ease(this.pitch, pitch, dt, rate);
    this.height = ease(this.height, height, dt, rate);
    // Rolling onto its back and off again: driven straight, so it does not unwind the long way round.
    this.roll = state === 'flipped' || state === 'rise' || state === 'dead' ? roll : ease(this.roll > 1 ? 0 : this.roll, roll, dt, rate);
    this.headDip = ease(this.headDip, headDip, dt, rate);
    this.tailLift = ease(this.tailLift, tailLift, dt, rate);
    this.paw = ease(this.paw, paw, dt, 30);
    this.scale = state === 'dead' ? scale : ease(this.scale, scale, dt, 8);

    this.body.position.set(shake * Math.sin(this.time * 57), this.height, shake * Math.cos(this.time * 49));
    this.body.rotation.set(this.pitch, 0, this.roll);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;
    this.headGroup.rotation.x = this.headDip;
    this.tail.rotation.x = -this.tailLift * 0.6;
    this.tail.position.y = -0.06 + this.tailLift * 0.12;

    for (const leg of this.legs) {
      const phase = this.gait + leg.set * Math.PI;
      const moving = ctx.moving || fast;
      const step = moving ? Math.sin(phase) : 0;
      const lift = moving ? Math.max(0, Math.cos(phase)) : 0;
      const sweep = (leg.hip.userData.sweep as number) * 0.4 + step * 0.35;
      // The front right leg paws the ground in the tell; the hind legs kick out in the buck; on its back they all wave.
      const pawing = leg.row === 0 && leg.side > 0 ? this.paw * 0.8 : 0;
      const kick = leg.row === 2 ? this.tailLift * 0.9 : 0;
      const wave = legsUp * (0.6 + Math.sin(this.time * 14 + leg.row * 1.7 + leg.side) * 0.5);
      leg.hip.rotation.y = leg.side > 0 ? -sweep : Math.PI + sweep;
      leg.hip.rotation.z = 0.35 + lift * 0.25 + pawing + kick * 0.3 + wave;
      leg.knee.rotation.z = -1.5 - lift * 0.2 + pawing * 0.6 - kick * 0.8 - legsUp * 0.6;
    }

    // Steam from its nostrils in the tell (and as it pants after a ram).
    this.puffTimer -= dt;
    if (steam && this.puffTimer <= 0 && this.scale > 0.5) {
      this.puffTimer = 0.09;
      for (const side of [-1, 1]) {
        // Each wisp has its own material, so it can fade out on its own.
        const m = new THREE.Mesh(this.puffGeo, new THREE.MeshBasicMaterial({ color: 0xe8ecef, transparent: true, opacity: 0.5, depthWrite: false }));
        m.position.set(side * 0.12, this.height + 0.02, 1.05);
        this.root.add(m);
        this.puffs.push({ mesh: m, age: 0, vx: side * 0.4, vy: 0.5, vz: 0.9 });
      }
    }
    for (const list of [this.puffs, this.sparks]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += dt;
        const life = list === this.puffs ? 0.6 : 0.35;
        if (p.age >= life) {
          this.root.remove(p.mesh);
          if (list === this.puffs) (p.mesh.material as THREE.Material).dispose();
          else p.mesh.geometry.dispose();
          list.splice(i, 1);
          continue;
        }
        if (list === this.puffs) (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - p.age / life);
        if (list === this.sparks) p.vy -= 12 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.mesh.scale.setScalar(list === this.puffs ? 1 + p.age * 2.5 : 1 - p.age / life);
      }
    }

    // The horn tip heats from iron grey to a hot orange as a ram comes; the eyes burn brighter too.
    this.hornTipMaterial.color.setRGB(0.35 + 0.65 * hot, 0.38 + 0.2 * hot, 0.41 - 0.3 * hot);
    this.eyeMaterial.color.setRGB(1, 0.6 - 0.35 * hot, 0.16);
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.material.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
