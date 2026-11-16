import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { WIDOW, type Widow, type WidowState } from './widow';

/**
 * How the Widow looks. She is drawn in the world's own places, exactly where the rules have her: her head where the
 * sword meets it, a leg along the floor where it strikes. Nothing of her is moved about as one thing.
 *
 * Her legs are a spider's legs, and what she does she does with them, seen: a leg is pulled up and forward and comes
 * down on a marked ring; it is laid out flat and swept along the floor; she steps round the rim on all four.
 *
 * She is a few big flat-faced pieces: a head (one faceted lump, a brow over it), two jaws with a fang each, eight red
 * eyes, a neck of body running back into the dark, and four legs of two long bones each. The light in her room is a
 * pool on the floor, so each piece is only as bright as the place it is in: out past the edge of the floor, or high
 * over it, she is black, and all that shows of her there is her eyes.
 */
export type WidowView = Pick<Widow, 'state' | 'stateTime' | 'windTime' | 'side' | 'angle' | 'spot' | 'x' | 'z' | 'px' | 'pz' | 'facing' | 'floorY' | 'field' | 'raging' | 'home' | 'crawling' | 'tip'> & {
  /** (For trying a pose: the striking outer leg's foot is put here, on the floor, the leg still arched from its hip.) */
  rake?: { x: number; z: number } | null;
  hip(side: 1 | -1, inner?: boolean): { x: number; z: number };
  dirOf(angle: number): [number, number];
};

/** One bone of a leg is this long: two of them, laid straight, reach just as far as a leg does. */
export const BONE = WIDOW.legReach / 2 + 0.02;
const HIP_Y = WIDOW.hipHigh;
/** How many times the size she was first built at she is: her legs, her body and where she holds her head all go by it. */
const SIZE = WIDOW.legReach / 11.5;
/** Her head is built 1.5 across its half-width and drawn this many times that: as wide as the rules have it. */
const HEAD_SCALE = WIDOW.radius / 1.5;
/** How high her head is carried while it waits, and how high its middle is when it lies on the floor. */
/** (Low: a spider carries her body near the ground, under the arch of her legs. Carried high, her face was above the top of the picture in play.) */
const HEAD_UP = WIDOW.radius * 0.62 + 0.9;
/** How long a claw is: the last of a leg, down to the foot. */
const CLAW = 1.1 * SIZE;
const HEAD_DOWN = 0.92 * HEAD_SCALE + 0.1;
/** (Her pictures carry her colour: what is painted under them only shades and warms it.) */
const SHELL = 0xe4dce6;
const SHELL_PALE = 0xffe6dc;

/** Flat faces: each one lit as a whole. */
export function flat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}
/** Colours a shape along its length (z from 0 to 1): `a` at its near end, `b` at its far end, each a brightness of `color`. */
export function shadeAlong(geo: THREE.BufferGeometry, color: number, a: number, b: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const k = a + (b - a) * Math.max(0, Math.min(1, pos.getZ(i)));
    cols.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
export function paintAll(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const cols = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < cols.length; i += 3) cols.set([c.r, c.g, c.b], i);
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/**
 * A limb one long, from the origin along +z, with a shape of its own: `profile` is how thick it is along it
 * ([how far along 0..1, radius]), so it can swell at a joint and taper to a wrist. Its picture runs along it,
 * `repeat` times (the chitin's joint ring comes round once each time: a leg of segments).
 */
export function limb(profile: Array<[number, number]>, sides: number, squash: number, repeat: number): THREE.BufferGeometry {
  return loft(profile.map(([t, r]) => ({ z: t, rx: r, ry: r * squash, y: 0 })), sides, repeat);
}
/**
 * A shape drawn out along z through a row of cross-sections, each as wide (`rx`) and as high (`ry`) as it says and
 * lifted by `y`: a limb is one of these, and so is her head. A corner of each section is uppermost (a ridge down
 * its top); its picture runs along it `repeat` times, the picture's edge on that ridge.
 */
export function loft(rings: Array<{ z: number; rx: number; ry: number; y: number }>, sides: number, repeat: number): THREE.BufferGeometry {
  const z0 = rings[0].z;
  const span = rings[rings.length - 1].z - z0 || 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const at = (i: number, k: number): [number, number, number, number, number] => {
    const g = rings[i];
    const a = (k / sides) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(a) * g.rx, g.y + Math.sin(a) * g.ry, g.z, k / sides, ((g.z - z0) / span) * repeat];
  };
  const tri = (...v: Array<[number, number, number, number, number]>): void => {
    for (const q of v) {
      pos.push(q[0], q[1], q[2]);
      uv.push(q[3], q[4]);
    }
  };
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let k = 0; k < sides; k++) {
      const a = at(i, k);
      const b = at(i, k + 1);
      const c = at(i + 1, k + 1);
      const d = at(i + 1, k);
      // (Wound so that each face looks OUTWARD: wound the other way it was drawn from the inside, and lit as if hollow.)
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  // (Closed at both ends.)
  for (const [i, far] of [[0, false], [rings.length - 1, true]] as Array<[number, boolean]>) {
    const g = rings[i];
    const mid: [number, number, number, number, number] = [0, g.y, g.z, 0.5, ((g.z - z0) / span) * repeat];
    // (An end takes its colour from the shell a little way in, not from the dark crease the picture has at its edge.)
    const inShell = (q: [number, number, number, number, number]): [number, number, number, number, number] => [q[0], q[1], q[2], q[3], q[4] - 0.4];
    for (let k = 0; k < sides; k++) far ? tri(inShell(mid), inShell(at(i, k)), inShell(at(i, k + 1))) : tri(inShell(mid), inShell(at(i, k + 1)), inShell(at(i, k)));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.computeVertexNormals();
  return geo;
}
/**
 * A claw (or a fang): its POINT at the origin, its root `length` up +z, bowed out toward +y on the way and hooked
 * back in to the point: a talon, not a cone. Four-sided, an edge along its back.
 */
export function horn(length: number, thick: number, bow: number): THREE.BufferGeometry {
  const us = [0, 0.1, 0.25, 0.45, 0.7, 1];
  const ring = (u: number, k: number): [number, number, number, number, number] => {
    const r = thick * u ** 0.75;
    const a = (k / 4) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(a) * r * 0.8, bow * (Math.sqrt(u) - u) * 2 + Math.sin(a) * r, length * u, k / 4, u];
  };
  const pos: number[] = [];
  const uv: number[] = [];
  const tri = (...v: Array<[number, number, number, number, number]>): void => {
    for (const q of v) {
      pos.push(q[0], q[1], q[2]);
      uv.push(q[3], q[4]);
    }
  };
  for (let i = 0; i + 1 < us.length; i++) {
    for (let k = 0; k < 4; k++) {
      const a = ring(us[i], k);
      const b = ring(us[i], k + 1);
      const c = ring(us[i + 1], k + 1);
      const d = ring(us[i + 1], k);
      if (i > 0) tri(a, b, c);
      tri(a, c, d);
    }
  }
  for (let k = 0; k < 4; k++) tri([0, 0, length, 0.5, 1], ring(1, k), ring(1, k + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}
/** Lays a bar from a to b. (By its own turning, not by looking at b: so it is right whatever she is drawn inside.) */
const ALONG = new THREE.Vector3(0, 0, 1);
export function lay(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  const d = b.clone().sub(a);
  const len = Math.max(0.01, d.length());
  m.position.copy(a);
  m.quaternion.setFromUnitVectors(ALONG, d.divideScalar(len));
  m.scale.set(1, 1, len);
}
const ease = (t: number): number => {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
};

interface Leg {
  side: 1 | -1;
  inner: boolean;
  upper: THREE.Mesh;
  lower: THREE.Mesh;
  claw: THREE.Mesh;
  knob: THREE.Mesh;
  mats: THREE.ShaderMaterial[];
  hip: THREE.Vector3;
  knee: THREE.Vector3;
  foot: THREE.Vector3;
  hipY: number;
  placed: boolean;
}

export class WidowModel {
  readonly root = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaws: THREE.Group[] = [];
  private readonly neck: THREE.Mesh;
  private readonly headMat = createPs1Material({ lit: true, tex: getTexture('widowChitin') });
  private readonly neckMat = createPs1Material({ lit: true, tex: getTexture('widowBack') });
  private readonly fangMat = createPs1Material({ lit: true, tex: getTexture('widowHorn') });
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  private readonly legs: Leg[] = [];
  private readonly strip: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly markMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }), 1);
  private headY = HEAD_UP;
  private pitch = 0;
  private open = 0.15;
  private shown = 0;
  private flashLeft = 0;
  private age = 0;
  private fallen = 0;

  constructor() {
    // ---- Her head: one faceted lump, wider than it is tall, and a brow plate over her eyes. ----
    // One carapace, shaped: narrow where it joins her body, swelling to a dome behind her eyes, then drawn in and
    // down to a blunt face. (It was a faceted lump with a plate laid on it.)
    const carapace = loft(
      [
        { z: -1.6, rx: 0.95, ry: 0.6, y: 0.05 },
        { z: -1.0, rx: 1.4, ry: 0.9, y: 0.14 },
        { z: -0.2, rx: 1.5, ry: 1.0, y: 0.16 },
        { z: 0.7, rx: 1.32, ry: 0.84, y: 0.06 },
        { z: 1.3, rx: 1.08, ry: 0.68, y: -0.04 },
        { z: 1.6, rx: 0.8, ry: 0.5, y: -0.1 },
      ],
      8,
      2,
    );
    this.head.add(new THREE.Mesh(shadeAlong(carapace, SHELL, 1, 1), this.headMat));
    // Eight eyes: each a lens, dark at its rim and burning at its middle, with a glint. Two great ones in her face,
    // and three smaller stepping back over her brow to each side. They glow whatever the light is.
    const eye = (r: number, x: number, y: number, z: number): void => {
      const lens = flat(new THREE.IcosahedronGeometry(1, 1));
      lens.scale(1, 1, 0.5);
      const q = lens.attributes.position;
      const cols = new Float32Array(q.count * 3);
      const rim = new THREE.Color(0x2a0303);
      const fire = new THREE.Color(0xff2a12);
      const glint = new THREE.Color(0xfff0d8);
      for (let i = 0; i < q.count; i += 3) {
        // (Each face one colour: by how far forward it is; the faces high on its front catch a glint.)
        const fz = (q.getZ(i) + q.getZ(i + 1) + q.getZ(i + 2)) / 3;
        const fy = (q.getY(i) + q.getY(i + 1) + q.getY(i + 2)) / 3;
        const fxm = (q.getX(i) + q.getX(i + 1) + q.getX(i + 2)) / 3;
        const k = Math.max(0, Math.min(1, (fz - 0.05) / 0.42));
        const c = fz > 0.36 && fy > 0.3 && fxm < -0.05 && fxm > -0.4 ? glint : rim.clone().lerp(fire, k * k * k);
        for (let j = 0; j < 3; j++) cols.set([c.r, c.g, c.b], (i + j) * 3);
      }
      lens.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const m = new THREE.Mesh(lens, this.eyeMat);
      m.position.set(x, y, z);
      m.scale.setScalar(r);
      // (Looking out from her head: forward, and outward by where it sits.)
      m.quaternion.setFromUnitVectors(ALONG, new THREE.Vector3(x * 0.9, (y - 0.1) * 0.8, Math.max(0.25, z - 0.5)).normalize());
      this.head.add(m);
    };
    for (const sd of [-1, 1]) {
      eye(0.33, sd * 0.36, 0.12, 1.5);
      eye(0.2, sd * 0.8, 0.4, 1.22);
      eye(0.16, sd * 1.12, 0.36, 0.72);
      eye(0.14, sd * 0.52, 0.74, 0.8);
    }
    // Her jaws: a thick tapered bar each, hung under the front of her head, with a pale fang hooking in at its end.
    for (const s of [-1, 1]) {
      const jaw = new THREE.Group();
      jaw.position.set(s * 0.62, -0.38, 1.05);
      const stem = new THREE.Mesh(shadeAlong(limb([[0, 0.34], [0.2, 0.5], [0.7, 0.42], [1, 0.3]], 5, 0.9, 1), SHELL_PALE, 0.8, 1.1), this.headMat);
      stem.scale.z = 1.25;
      stem.rotation.x = 0.2; // forward, and a little down
      jaw.add(stem);
      // (Its root at the end of the jaw, its point down and a little in: all of it shows.)
      // (A fang: a curved horn, its root in the end of the jaw, arching forward and down to its point, hooking in.)
      const fang = new THREE.Mesh(paintAll(horn(1.35, 0.27, 0.34), 0xffffff), this.fangMat);
      fang.position.set(-s * 0.36, -0.8, 2.4);
      fang.rotation.set(-0.42, Math.PI - s * 0.3, 0, 'YXZ');
      jaw.add(fang);
      this.head.add(jaw);
      this.jaws.push(jaw);
    }
    this.head.scale.setScalar(HEAD_SCALE);
    this.root.add(this.head);

    // ---- The body behind her head, running back into the dark: black at its far end. ----
    // (Broad where it comes out of the dark, narrowing to her head: when she bites, it is her whole front that comes.)
    this.neck = new THREE.Mesh(shadeAlong(limb([[0, 5.2 * SIZE], [0.55, 3.6 * SIZE], [0.85, WIDOW.radius * 1.05], [1, WIDOW.radius * 0.8]], 7, 0.62, 3), SHELL, 0, 1), this.neckMat);
    this.root.add(this.neck);

    // ---- Four legs: two long bones each, and a claw. ----
    for (const [side, inner] of [[1, false], [1, true], [-1, true], [-1, false]] as Array<[1 | -1, boolean]>) {
      const upperMat = createPs1Material({ lit: true, tex: getTexture('widowChitin') });
      const lowerMat = createPs1Material({ lit: true, tex: getTexture('widowChitin') });
      const clawMat = createPs1Material({ lit: true, tex: getTexture('widowHorn') });
      const thick = (inner ? 0.62 : 0.86) * SIZE;
      // Her thigh: stout where it leaves her, narrowing, and flared again into the knee. Three segments of shell.
      const upper = new THREE.Mesh(shadeAlong(limb([[0, 0.72 * thick], [0.08, 1.02 * thick], [0.32, 0.92 * thick], [0.78, 0.68 * thick], [0.93, 0.72 * thick], [1, 0.9 * thick]], 6, 0.85, 3), SHELL, 0.6, 1), upperMat);
      // Her shin: out of the knee thick, then long and fine down to the wrist the claw grows from. Four segments.
      const lower = new THREE.Mesh(shadeAlong(limb([[0, 0.9 * thick], [0.1, 0.78 * thick], [0.45, 0.56 * thick], [0.82, 0.4 * thick], [1, 0.32 * thick]], 6, 0.9, 4), SHELL_PALE, 0.82, 1.1), lowerMat);
      // Her claw: a hooked talon, its point the foot.
      const claw = new THREE.Mesh(paintAll(horn(CLAW, thick * 0.4, CLAW * 0.3), 0xffffff), clawMat);
      // (A knuckle at the knee, so that a leg reads as jointed however it lies.)
      const knob = new THREE.Mesh(paintAll(flat(new THREE.IcosahedronGeometry(thick * 1.08, 0)), SHELL_PALE), upperMat);
      this.root.add(upper, lower, claw, knob);
      this.legs.push({ side, inner, upper, lower, claw, knob, mats: [upperMat, lowerMat, clawMat], hip: new THREE.Vector3(), knee: new THREE.Vector3(), foot: new THREE.Vector3(), hipY: NaN, placed: false });
    }

    // ---- What she marks on the floor before a blow: the line a slam comes down on; the place of a bite or a stab. ----
    const stripGeo = new THREE.PlaneGeometry(1, 1);
    stripGeo.rotateX(-Math.PI / 2);
    stripGeo.translate(0, 0, 0.5);
    this.strip = new THREE.Mesh(stripGeo, this.markMat);
    const ringGeo = new THREE.RingGeometry(0.84, 1, 28);
    ringGeo.rotateX(-Math.PI / 2);
    this.ring = new THREE.Mesh(ringGeo, this.markMat);
    this.strip.visible = this.ring.visible = false;
    this.root.add(this.strip, this.ring);

  }

  /** The sword found her: a flash. */
  flash(): void {
    this.flashLeft = 0.14;
  }

  /** How bright a thing at `p` is: in the pool of light over the floor, or out of it. */
  private lightAt(w: WidowView, p: THREE.Vector3): number {
    const out = Math.hypot(p.x - w.field.x, p.z - w.field.z);
    // (The light reaches a good way past the edge of the floor and up: her front, and where her legs join her, are
    // SEEN, fading back into the dark. Before, all of her past the edge was black, and her legs looked like loose
    // limbs coming out of nothing.)
    const across = Math.max(0, Math.min(1, (w.field.r + 13 - out) / 11));
    const up = Math.max(0, Math.min(1, 1.3 - Math.max(0, p.y - w.floorY - 8) / 24));
    return across * up * this.shown;
  }

  update(dt: number, w: WidowView): void {
    const W = WIDOW;
    this.age += dt;
    const s: WidowState = w.state;
    const t = w.stateTime;
    const floor = w.floorY;
    const [fx, fz] = w.dirOf(0);
    const dead = s === 'dead';
    this.fallen = dead ? Math.min(1, this.fallen + dt / 1.1) : 0;
    // She comes out of the dark as she wakes.
    this.shown = s === 'lurk' ? 0 : s === 'rise' ? Math.max(this.shown, ease(t / (W.rise * 0.7))) : 1;

    // ---- Her head ----
    let wantY = HEAD_UP;
    let wantPitch = 0;
    let wantOpen = 0.12 + 0.06 * Math.sin(this.age * 2.1);
    if (s === 'rise') {
      wantY = HEAD_UP + 1.6 * SIZE * Math.sin(Math.min(1, t / W.rise) * Math.PI);
      wantPitch = -0.35 * Math.sin(Math.min(1, t / W.rise) * Math.PI);
      wantOpen = 0.75;
    } else if (s === 'biteWind') {
      wantY = HEAD_UP + 2.6 * SIZE * ease(t / w.windTime);
      wantPitch = -0.3 * ease(t / w.windTime);
      wantOpen = 0.2 + 0.7 * ease(t / (w.windTime * 0.7));
    } else if (s === 'bite' || s === 'biteStuck') {
      wantY = HEAD_DOWN;
      wantPitch = 0.15;
      wantOpen = 0;
    } else if (s === 'reel') {
      wantY = HEAD_DOWN;
      wantPitch = 0.12;
      wantOpen = 0.4 + 0.1 * Math.sin(this.age * 9);
    } else if (dead) {
      wantY = HEAD_DOWN - 0.1;
      wantPitch = 0.15;
      wantOpen = 0.5;
    } else if (s === 'slamWind' || s === 'stabWind') wantOpen = 0.35;
    // (A bite comes down as fast as the rules say it does; everything else eases.)
    const quick = s === 'bite' ? 1 : 1 - Math.exp(-dt * (s === 'biteStuck' || s === 'reel' || dead ? 16 : 7));
    this.headY += (floor + wantY - this.headY) * quick;
    this.pitch += (wantPitch - this.pitch) * quick;
    this.open += (wantOpen - this.open) * (s === 'bite' ? 1 : 1 - Math.exp(-dt * 12));
    this.head.position.set(w.x, this.headY, w.z);
    this.head.rotation.set(this.pitch, w.facing, 0, 'YXZ');
    this.jaws[0].rotation.y = -this.open;
    this.jaws[1].rotation.y = this.open;
    const headLight = this.lightAt(w, this.head.position);
    this.headMat.uniforms.tint.value.setScalar(headLight);
    // Her eyes burn in the dark whatever the light is; they go out when she dies.
    this.eyeMat.color.setRGB(1, 1, 1).multiplyScalar(dead ? Math.max(0.08, 1 - this.fallen) : w.raging ? 1 : 0.82 + 0.18 * Math.sin(this.age * 3));

    // ---- The body behind it: from deep in the dark to the back of her head ----
    const anchor = new THREE.Vector3(w.px - fx * 12 * SIZE, floor + (5 - 2.6 * this.fallen) * SIZE, w.pz - fz * 12 * SIZE);
    const back = new THREE.Vector3(w.x - fx * 1.2 * HEAD_SCALE, this.headY + 0.15, w.z - fz * 1.2 * HEAD_SCALE);
    lay(this.neck, anchor, back);
    this.neckMat.uniforms.tint.value.setScalar(Math.max(headLight, this.lightAt(w, back)));

    // ---- Her legs ----
    for (const leg of this.legs) {
      const mine = leg.side === w.side;
      const h = w.hip(leg.side, leg.inner);
      // Where its foot stands when it is doing nothing.
      const restA = leg.side * (leg.inner ? 0.42 : 1.0);
      const restD = (leg.inner ? 6 : 7.5) * SIZE;
      const [rx, rz] = w.dirOf(restA);
      const target = new THREE.Vector3(h.x + rx * restD, floor, h.z + rz * restD);
      let hipY = HIP_Y;
      let snap = false;
      if (s === 'lurk') {
        // Folded up beside her, out past the edge of the light.
        target.set(h.x + rx * 1.6 * SIZE - fx * 2.5 * SIZE, floor, h.z + rz * 1.6 * SIZE - fz * 2.5 * SIZE);
        snap = true;
      } else if (s === 'rise') {
        // Out they come, one after another, and are set down on the floor.
        const i = this.legs.indexOf(leg);
        const k = ease((t - i * 0.22) / 0.6);
        const from = new THREE.Vector3(h.x + rx * 1.6 * SIZE - fx * 2.5 * SIZE, floor, h.z + rz * 1.6 * SIZE - fz * 2.5 * SIZE);
        target.lerpVectors(from, target, k);
        target.y = floor + 4 * SIZE * Math.sin(k * Math.PI);
        snap = true;
      } else if (!leg.inner && mine && (s === 'slamWind' || s === 'slam' || s === 'slamStuck' || s === 'sweepWind' || s === 'sweep' || s === 'sweepEnd')) {
        const up = new THREE.Vector3(h.x + (w.spot.x - h.x) * 0.55, floor + 9.5 * SIZE, h.z + (w.spot.z - h.z) * 0.55);
        const down = new THREE.Vector3(w.spot.x, floor, w.spot.z);
        if (s === 'slamWind') {
          // Pulled up and forward, high over the ring it will come down on.
          const k = ease(t / (w.windTime * 0.6));
          target.lerp(up, k);
          snap = k >= 1;
        } else if (s === 'slam') {
          // ...and down into the floor.
          const k = Math.min(1, t / (W.slamTime * 0.5));
          target.copy(up).lerp(down, k * k);
          snap = true;
        } else if (s === 'slamStuck') {
          target.copy(down);
          snap = true;
        } else if (s === 'sweepWind') {
          // Pulled free of the floor, a little, where it stuck: about to rake.
          target.copy(down);
          target.y = floor + 0.9 * SIZE * ease(t / w.windTime);
          snap = true;
        } else {
          // Its foot rakes the floor round its hip, the leg still arched over it and joined to her.
          target.set(w.tip.x, floor + 0.2, w.tip.z);
          snap = true;
        }
      } else if (leg.inner && mine && (s === 'stabWind' || s === 'stab' || s === 'stabStuck')) {
        if (s === 'stabWind') {
          const k = ease(t / (w.windTime * 0.6));
          target.lerp(new THREE.Vector3(w.spot.x, floor + 7.5 * SIZE, w.spot.z), k);
          snap = k >= 1;
        } else if (s === 'stab') {
          const k = Math.min(1, t / (W.stabTime * 0.5));
          target.set(w.spot.x, floor + 7.5 * SIZE * (1 - k * k), w.spot.z);
          snap = true;
        } else {
          target.set(w.spot.x, floor, w.spot.z);
          snap = true;
        }
      } else if (w.crawling !== 0) {
        // Going round the rim: each foot is set down a little ahead of where it would rest, in turn.
        const i = this.legs.indexOf(leg);
        const [ax, az] = w.dirOf(restA - w.crawling * 0.35);
        target.set(h.x + ax * restD, floor, h.z + az * restD);
        const beat = (this.age * 2.6 + i * 0.5) % 2;
        if (beat < 1) target.y = floor + 2.2 * Math.sin(beat * Math.PI);
      }
      if (w.rake && !leg.inner && mine) {
        target.set(w.rake.x, floor + 0.2, w.rake.z);
        hipY = HIP_Y;
        snap = true;
      }
      if (dead) hipY = HIP_Y - 1.7 * SIZE * this.fallen;
      if (!leg.placed || snap) leg.foot.copy(target);
      else {
        // A leg going back to its place is lifted over the floor on the way: it strikes nothing, and looks it.
        const away = Math.hypot(leg.foot.x - target.x, leg.foot.z - target.z);
        const goal = target.clone();
        goal.y += Math.min(5 * SIZE, away * 0.5);
        leg.foot.lerp(goal, 1 - Math.exp(-dt * 5));
        if (away < 0.05) leg.foot.y += (target.y - leg.foot.y) * (1 - Math.exp(-dt * 10));
      }
      leg.placed = true;
      leg.hipY = Number.isNaN(leg.hipY) || snap ? floor + hipY : leg.hipY + (floor + hipY - leg.hipY) * (1 - Math.exp(-dt * 8));
      leg.hip.set(h.x, leg.hipY, h.z);
      // Its knee: over the middle of it, as high as two bones of that length must stand (flat, when she is dead).
      const span = leg.hip.distanceTo(leg.foot);
      const rise = Math.sqrt(Math.max(0, BONE * BONE - (span / 2) ** 2)) * (1 - 0.94 * this.fallen);
      const along = leg.foot.clone().sub(leg.hip).normalize();
      const up = new THREE.Vector3(0, 1, 0).addScaledVector(along, -along.y);
      if (up.lengthSq() < 1e-6) up.set(fx, 0, fz);
      up.normalize();
      // (Dead, her knees fall outward along the floor.)
      const [ox, oz] = w.dirOf(leg.side * 1.5);
      const fall = new THREE.Vector3(ox, 0.06, oz).normalize();
      up.lerp(fall, this.fallen).normalize();
      leg.knee.copy(leg.hip).add(leg.foot).multiplyScalar(0.5).addScaledVector(up, rise);
      lay(leg.upper, leg.hip, leg.knee);
      // (The shin stops where the claw begins: its blunt end would otherwise dip into the floor.)
      const shinEnd = leg.foot.clone().lerp(leg.knee, Math.min(0.5, (CLAW * 0.7) / Math.max(0.01, leg.knee.distanceTo(leg.foot))));
      lay(leg.lower, leg.knee, shinEnd);
      leg.claw.position.copy(leg.foot);
      {
        const up = shinEnd.clone().sub(leg.foot).normalize();
        const outward = new THREE.Vector3(leg.foot.x - leg.hip.x, 0, leg.foot.z - leg.hip.z);
        if (outward.lengthSq() < 1e-6) outward.set(fx, 0, fz);
        const bowTo = outward.normalize().addScaledVector(up, -outward.dot(up));
        if (bowTo.lengthSq() < 1e-6) bowTo.set(0, 1, 0).addScaledVector(up, -up.y);
        bowTo.normalize();
        leg.claw.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(bowTo, up), bowTo, up));
      }
      leg.knob.position.copy(leg.knee);
      leg.knob.rotation.set(this.age * 0.2, leg.side, 0);
      leg.mats[0].uniforms.tint.value.setScalar(this.lightAt(w, leg.hip.clone().lerp(leg.knee, 0.6)));
      leg.mats[1].uniforms.tint.value.setScalar(this.lightAt(w, leg.knee.clone().lerp(leg.foot, 0.7)));
      leg.mats[2].uniforms.tint.value.setScalar(this.lightAt(w, leg.foot));
    }

    // ---- The marks on the floor ----
    const beat = 0.5 + 0.5 * Math.sin(this.age * 22);
    this.strip.visible = false;
    this.ring.visible = s === 'biteWind' || s === 'stabWind' || s === 'slamWind';
    if (this.ring.visible) {
      const r = s === 'biteWind' ? W.biteR : s === 'slamWind' ? W.slamR : W.stabR;
      this.ring.position.set(w.spot.x, floor + 0.05, w.spot.z);
      this.ring.scale.set(r, 1, r);
      const committed = t > w.windTime * (s === 'biteWind' ? W.biteTrack : s === 'slamWind' ? W.slamTrack : W.stabTrack);
      this.markMat.opacity = committed ? 0.5 + 0.35 * beat : 0.28;
    }

    // ---- Struck: a flash over all of her ----
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    const f = this.flashLeft > 0 ? 0.55 : 0;
    this.fangMat.uniforms.tint.value.setScalar(headLight);
    for (const m of [this.headMat, this.neckMat, this.fangMat, ...this.legs.flatMap((l) => l.mats)]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f * 0.8, f * 0.7);
  }

  /** For the tests: where each leg's hip, knee and foot are drawn (outer left, inner left, inner right, outer right). */
  get legPoints(): Array<{ hip: THREE.Vector3; knee: THREE.Vector3; foot: THREE.Vector3; side: 1 | -1; inner: boolean }> {
    return this.legs.map((l) => ({ hip: l.hip, knee: l.knee, foot: l.foot, side: l.side, inner: l.inner }));
  }
  get headPosition(): THREE.Vector3 {
    return this.head.position;
  }
  /** For the tests: whether the ring on the floor is showing, and where. */
  get ringAt(): THREE.Vector3 | null {
    return this.ring.visible ? this.ring.position : null;
  }
}
