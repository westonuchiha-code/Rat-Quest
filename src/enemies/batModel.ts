import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import type { BatState } from './bat';
import { BAT } from './bat';

/**
 * Flitter model: a cave bat with a furry body the size of the rat's head, tall ears, glowing eyes, little fangs and
 * leathery wings on finger bones. It faces +Z; its root sits at the bottom of its body (the logic's y).
 * Its roost is a knob of rock (a short stalactite) that stays where it is when the bat flies.
 * Roosting it hangs upside down wrapped in its wings; flying it flaps fast; in the tell it spreads its wings wide and
 * screams, eyes flaring; in the swoop it sweeps them back; struck down it flops on the floor.
 */

const C = {
  fur: 0x5c4a52,
  furLight: 0x8a7078,
  wing: 0x3b2a33,
  wingEdge: 0x7a4450,
  nose: 0xd8909a,
  socket: 0x22161c,
  bone: 0x6e5560,
  ear: 0x7a5f68,
  earInner: 0xc98a94,
  fang: 0xf2ead8,
};

export interface BatAnimInput {
  state: BatState;
  stateTime: number;
  /** How far along its swoop (0..1). */
  swoopU: number;
  /** Its floor, for the shadow (world height). */
  floorY: number;
  /** Its own height (world), the bottom of its body. */
  y: number;
}

function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

export class BatModel {
  /** Holds the bat and its perch. It stays at the origin: the bat moves inside it, the perch stays at the roost. */
  readonly root = new THREE.Group();
  private readonly flier = new THREE.Group();
  private readonly perch = new THREE.Group();
  private readonly material = createPs1Material({ lit: true });
  private readonly wingMaterial = createPs1Material({ lit: true, side: THREE.DoubleSide });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff6a8a });
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly wings: Array<{ arm: THREE.Group; hand: THREE.Group; side: number }> = [];
  private readonly shadow: THREE.Mesh;
  private readonly jaw: THREE.Group;

  private time = 0;
  private flap = 0;
  private flashAmount = 0;
  private upside = 0;
  private spread = 0.5;
  private fold = 0;
  private sweep = 0;
  private tilt = 0;
  private lie = 0;
  private scale = 1;
  private mouth = 0;

  /** `roost`: where it hangs (world), its feet's height. `perch`: a knob of rock (caves) or a chain from the dark (halls). */
  constructor(roost: { x: number; y: number; z: number }, perch: 'rock' | 'chain' = 'rock') {
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
    /** A flat skin of triangles between points (x, z) in the wing's plane, with the bones drawn darker. */
    const membrane = (pts: Array<[number, number]>): THREE.Mesh => {
      const pos: number[] = [];
      for (let i = 1; i < pts.length - 1; i++) pos.push(pts[0][0], 0, pts[0][1], pts[i][0], 0, pts[i][1], pts[i + 1][0], 0, pts[i + 1][1]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      // The skin is thin: darkest by the arm, paling to a warm red-brown at the trailing edge where the light comes through.
      return new THREE.Mesh(paint(geo, (x, _y, z) => (z < -0.28 ? C.wingEdge : Math.abs(x) < 0.03 ? C.bone : C.wing)), this.wingMaterial);
    };
    const bone = (len: number): THREE.Mesh => {
      const geo = new THREE.CylinderGeometry(0.018, 0.026, len, 4, 1);
      geo.translate(0, len / 2, 0);
      geo.rotateZ(-Math.PI / 2);
      return new THREE.Mesh(paint(geo, C.bone), mat);
    };

    this.root.add(this.flier, this.perch);
    this.flier.add(this.body);
    this.body.position.y = 0.22;
    if (perch === 'rock') {
      // A dripping knob of rock with a few stalactites, above where its feet grip.
      const rock = (_x: number, y: number): number => (y > 0.2 ? 0x4a4440 : 0x6a625a);
      this.perch.add(new THREE.Mesh(paint(new THREE.ConeGeometry(0.32, 0.9, 6).rotateX(Math.PI).translate(0, 0.45, 0), rock), mat));
      for (const [x, z, h] of [[0.22, 0.1, 0.45], [-0.2, -0.12, 0.35], [0.05, -0.24, 0.3]]) {
        this.perch.add(new THREE.Mesh(paint(new THREE.ConeGeometry(0.07, h, 5).rotateX(Math.PI).translate(x, 0.55 - h / 2 + 0.1, z), rock), mat));
      }
    } else {
      // An iron chain hanging out of the dark, with a ring at the bottom for its feet.
      for (let i = 0; i < 14; i++) {
        const link = new THREE.Mesh(paint(new THREE.TorusGeometry(0.08, 0.025, 4, 8), 0x55575c), mat);
        link.position.y = 0.12 + i * 0.2;
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        this.perch.add(link);
      }
      const ring = new THREE.Mesh(paint(new THREE.TorusGeometry(0.16, 0.03, 4, 10).rotateX(Math.PI / 2), 0x6a6c72), mat);
      this.perch.add(ring);
    }
    this.perch.position.set(roost.x, roost.y + 0.44 + 0.02, roost.z);
    // Body: a furry egg, paler in front.
    this.body.add(blob(0.2, 0.22, 0.24, (_x, y, z) => (z > 0.08 ? C.furLight : y < -0.1 ? 0x46363e : C.fur), 0, 0, 0, 8, 6));
    // A ruff of pale fur round its neck.
    for (let k = 0; k < 5; k++) {
      const a = (k - 2) * 0.55;
      const tuft = new THREE.Mesh(paint(new THREE.ConeGeometry(0.05, 0.15, 3).rotateX(Math.PI).translate(0, -0.075, 0), (_x, y) => (y < -0.08 ? 0xa88a90 : C.furLight)), mat);
      tuft.position.set(Math.sin(a) * 0.15, 0.1, 0.1 + Math.cos(a) * 0.1);
      tuft.rotation.set(-0.5 * Math.cos(a), 0, 0.5 * Math.sin(a));
      this.body.add(tuft);
    }
    // Head with tall ears, a snout, glowing eyes and two little fangs.
    this.head.position.set(0, 0.16, 0.16);
    this.body.add(this.head);
    this.head.add(blob(0.15, 0.13, 0.14, C.fur, 0, 0, 0, 7, 5));
    this.head.add(blob(0.07, 0.06, 0.08, C.furLight, 0, -0.03, 0.12, 6, 4));
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(paint(new THREE.ConeGeometry(0.07, 0.22, 4).translate(0, 0.11, 0), (_x, y) => (y < 0.08 ? C.earInner : C.ear)), mat);
      ear.position.set(side * 0.08, 0.08, -0.02);
      ear.rotation.z = -side * 0.35;
      this.head.add(ear);
      // The inside of the ear, pink, and a notch of dark fur at its root.
      const inner = new THREE.Mesh(paint(new THREE.ConeGeometry(0.04, 0.15, 3).translate(0, 0.075, 0), C.earInner), mat);
      inner.position.set(side * 0.082, 0.085, 0.012);
      inner.rotation.z = -side * 0.35;
      this.head.add(inner);
      // Eyes: a dark socket, the glowing eye, and a slanted brow so it glares.
      this.head.add(blob(0.045, 0.04, 0.03, C.socket, side * 0.065, 0.03, 0.1, 5, 4));
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 6, 4), this.eyeMaterial);
      eye.position.set(side * 0.065, 0.03, 0.115);
      this.head.add(eye);
      const brow = blob(0.05, 0.014, 0.03, C.socket, side * 0.065, 0.068, 0.115, 4, 3);
      brow.rotation.z = side * 0.45;
      this.head.add(brow);
    }
    // A pink leaf of a nose, turned up.
    const nose = blob(0.035, 0.04, 0.02, C.nose, 0, 0.0, 0.195, 5, 4);
    nose.rotation.x = -0.4;
    this.head.add(nose);
    this.jaw = new THREE.Group();
    this.jaw.position.set(0, -0.07, 0.12);
    this.head.add(this.jaw);
    for (const side of [-1, 1]) {
      const fang = new THREE.Mesh(paint(new THREE.ConeGeometry(0.016, 0.075, 3).translate(0, -0.0375, 0), C.fang), mat);
      fang.position.set(side * 0.03, 0, 0.02);
      this.jaw.add(fang);
    }
    // Wings: an arm from the shoulder and a hand from the wrist, each with its own skin.
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.16, 0.05, 0);
      const hand = new THREE.Group();
      hand.position.set(side * 0.46, 0, 0);
      const a = bone(0.46);
      if (side < 0) a.rotation.y = Math.PI;
      arm.add(a, membrane([[0, -0.06], [side * 0.46, 0.03], [side * 0.46, -0.42], [side * 0.05, -0.3]]));
      const fingers = membrane([[0, 0.03], [side * 0.6, 0.16], [side * 0.72, -0.24], [side * 0.46, -0.56], [0, -0.42]]);
      const f1 = bone(0.62);
      f1.rotation.y = side < 0 ? Math.PI + 0.25 : -0.25;
      const f2 = bone(0.72);
      f2.rotation.y = side < 0 ? Math.PI - 0.32 : 0.32;
      // A hooked thumb claw at the wrist.
      const thumb = new THREE.Mesh(paint(new THREE.ConeGeometry(0.018, 0.1, 3).translate(0, 0.05, 0), C.fang), mat);
      thumb.rotation.x = Math.PI / 2 - 0.3;
      hand.add(fingers, f1, f2, thumb);
      arm.add(hand);
      this.body.add(arm);
      this.wings.push({ arm, hand, side });
    }
    // Two little feet with claws (it hangs by these).
    for (const side of [-1, 1]) {
      const foot = blob(0.03, 0.05, 0.03, C.bone, side * 0.07, -0.22, -0.06, 5, 4);
      this.body.add(foot);
      for (const k of [-1, 0, 1]) {
        const claw = new THREE.Mesh(paint(new THREE.ConeGeometry(0.01, 0.06, 3).translate(0, -0.03, 0), C.fang), mat);
        claw.position.set(side * 0.07 + k * 0.022, -0.26, -0.06);
        claw.rotation.z = k * 0.3;
        this.body.add(claw);
      }
    }

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.35, 10), lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(1.8, 0.8, 1);
    this.flier.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.flier.position.copy(position);
    this.flier.rotation.y = facing;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: BatAnimInput): void {
    this.time += dt;
    const t = ctx.stateTime;
    const s = ctx.state;
    let upside = 0;
    let spread = 0.6;
    let fold = 0;
    let sweep = 0;
    let tilt = 0;
    let lie = 0;
    let scale = 1;
    let mouth = 0;
    let beat = 9; // wing beats a second
    let flapSize = 1;
    let eyes = 0.3;
    let rate = 10;

    switch (s) {
      case 'roost':
        // Upside down, wrapped in its wings, swaying a little.
        upside = 1;
        spread = 0.05;
        fold = 1;
        flapSize = 0;
        tilt = Math.sin(this.time * 1.3) * 0.08;
        eyes = 0;
        break;
      case 'wake':
        upside = 1 - smooth(t / BAT.wakeTime);
        spread = 0.9;
        beat = 12;
        mouth = 0.6;
        eyes = 1;
        rate = 14;
        break;
      case 'swoopWind':
        // The tell: wings spread wide and held, shaking; the mouth open in a scream; eyes flaring.
        spread = 1.25;
        flapSize = 0.25;
        beat = 14;
        tilt = -0.3;
        mouth = 1;
        eyes = 0.6 + 0.4 * Math.sin(t * 30);
        rate = 16;
        break;
      case 'swoop': {
        // Wings swept back on the way down, a hard beat at the bottom, then climbing away.
        const u = ctx.swoopU;
        const down = u < 0.45;
        spread = down ? 0.75 : 0.9;
        sweep = down ? 1 : 0;
        flapSize = down ? 0.08 : 1;
        beat = 13;
        tilt = down ? 0.55 : -0.25;
        mouth = u > 0.35 && u < 0.6 ? 1 : 0.3;
        eyes = 1;
        rate = 20;
        break;
      }
      case 'fall':
        lie = smooth(t / BAT.fallTime);
        spread = 1;
        flapSize = 0.6;
        beat = 16;
        rate = 20;
        break;
      case 'grounded':
        // On its back on the floor, wings flopping.
        lie = 1;
        spread = 1.1;
        flapSize = 0.35;
        beat = 5;
        mouth = 0.5;
        eyes = 0.15;
        rate = 12;
        break;
      case 'rise':
        lie = 1 - smooth(t / 0.25);
        spread = 1;
        beat = 14;
        rate = 16;
        break;
      case 'dead':
        lie = 1;
        spread = 1.1;
        flapSize = Math.max(0, 0.3 - t * 0.3);
        scale = 1 - smooth((t - 1.2) / 0.6);
        eyes = 0;
        rate = 16;
        break;
      default:
        // Hovering and flying home: steady fast flapping.
        tilt = s === 'hover' ? 0.1 : 0.25;
        break;
    }

    this.flap += dt * beat * Math.PI * 2;
    this.upside = ease(this.upside, upside, dt, rate);
    this.spread = ease(this.spread, spread, dt, rate);
    this.fold = ease(this.fold, fold, dt, rate);
    this.sweep = ease(this.sweep, sweep, dt, rate);
    this.tilt = ease(this.tilt, tilt, dt, rate);
    this.lie = ease(this.lie, lie, dt, rate);
    this.mouth = ease(this.mouth, mouth, dt, 20);
    this.scale = s === 'dead' ? scale : ease(this.scale, scale, dt, 8);

    const flapNow = Math.sin(this.flap) * flapSize;
    // Hanging upside down turns it over its middle; lying on the floor tips it onto its back.
    this.body.rotation.set(this.tilt + this.upside * Math.PI + this.lie * -Math.PI * 0.5, 0, Math.sin(this.time * 2.2) * 0.06 * (1 - this.lie));
    this.body.position.y = 0.22 + Math.sin(this.flap) * 0.04 * flapSize * (1 - this.lie) - this.lie * 0.1;
    this.flier.scale.setScalar(Math.max(0.001, this.scale));
    for (const w of this.wings) {
      // Spread: the arm swings out from folded against the body; the flap raises and lowers it; the hand bends at the wrist.
      // Sweep: diving, the wings lie swept back along its body like an arrowhead.
      w.arm.rotation.y = w.side * ((1 - this.spread) * 1.2 + this.sweep * 0.9);
      w.arm.rotation.z = w.side * (flapNow * 0.9 + this.fold * 0.9 + this.sweep * 0.25);
      w.hand.rotation.z = w.side * (flapNow * 0.5 + this.fold * 1.6);
      w.hand.rotation.y = w.side * ((1 - this.spread) * 1.4 + this.sweep * 0.5);
    }
    this.jaw.rotation.x = this.mouth * 0.5;
    this.head.rotation.x = this.mouth * -0.25;
    // The shadow stays on its floor, fainter the higher it flies.
    const up = Math.max(0, ctx.y - ctx.floorY);
    this.shadow.position.y = -up + 0.02;
    this.shadow.visible = this.scale > 0.05 && this.upside < 0.5;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * Math.max(0.25, 1 - up / 5);

    this.eyeMaterial.color.setRGB(0.55 + 0.45 * eyes, 0.25 + 0.2 * (1 - eyes), 0.35 + 0.1 * (1 - eyes));
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    for (const m of [this.material, this.wingMaterial]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
