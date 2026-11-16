import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { WIDOW, type Widow, type WidowState } from './widow';

/**
 * How the Widow looks. She is drawn in the world's own places, exactly where the rules have her: her head where the
 * sword meets it, a leg along the floor where it strikes. Nothing of her is moved about as one thing.
 *
 * Her legs are a spider's legs and stay near her; what crosses the room is the poison they fling, drawn where it
 * strikes: a slash along the line of a slam, a crescent wave running out over the floor, a gob lobbed onto a ring.
 *
 * She is a few big flat-faced pieces: a head (one faceted lump, a brow over it), two jaws with a fang each, eight red
 * eyes, a neck of body running back into the dark, and four legs of two long bones each. The light in her room is a
 * pool on the floor, so each piece is only as bright as the place it is in: out past the edge of the floor, or high
 * over it, she is black, and all that shows of her there is her eyes.
 */
export type WidowView = Pick<Widow, 'state' | 'stateTime' | 'windTime' | 'side' | 'angle' | 'spot' | 'x' | 'z' | 'px' | 'pz' | 'facing' | 'floorY' | 'field' | 'raging' | 'home' | 'wave' | 'far' | 'foot'> & {
  hip(side: 1 | -1, inner?: boolean): { x: number; z: number };
  dirOf(angle: number): [number, number];
};

/** One bone of a leg is this long: two of them reach a little further than a leg is ever asked to. */
export const BONE = WIDOW.legReach / 2 + 0.3;
const HIP_Y = 3.4;
/** Her poison: unlit, so it shows in the dark. */
const POISON = 0x9cff3c;
/** Her head is built 1.5 across its half-width and drawn this many times that: as wide as the rules have it. */
const HEAD_SCALE = WIDOW.radius / 1.5;
/** How high her head is carried while it waits, and how high its middle is when it lies on the floor. */
const HEAD_UP = 4.6;
const HEAD_DOWN = 0.92 * HEAD_SCALE + 0.1;
const CHITIN = 0x3a2c40;
const CHITIN_PALE = 0x7a4a58;
const BONE_WHITE = 0xe0d6bc;

/** Flat faces: each one lit as a whole. */
function flat(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeVertexNormals();
  return g;
}
/** Colours a shape along its length (z from 0 to 1): `a` at its near end, `b` at its far end, each a brightness of `color`. */
function shadeAlong(geo: THREE.BufferGeometry, color: number, a: number, b: number): THREE.BufferGeometry {
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
function paintAll(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const cols = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < cols.length; i += 3) cols.set([c.r, c.g, c.b], i);
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/** A tapered bar one long, from the origin along +z: `r0` thick at its near end and `r1` at its far end. */
function bar(r0: number, r1: number, sides: number, squash = 1): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, 1, sides, 1);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, 0.5);
  g.scale(1, squash, 1);
  return flat(g);
}
/** Lays a bar from a to b. */
function lay(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  m.position.copy(a);
  m.lookAt(b);
  m.scale.set(1, 1, Math.max(0.01, a.distanceTo(b)));
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
  private readonly headMat = createPs1Material({ lit: true });
  private readonly neckMat = createPs1Material({ lit: true });
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a22 });
  private readonly legs: Leg[] = [];
  private readonly strip: THREE.Mesh;
  private readonly ring: THREE.Mesh;
  private readonly markMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false });
  private readonly slash: THREE.Mesh;
  private readonly slashMat = new THREE.MeshBasicMaterial({ color: POISON, transparent: true, opacity: 1, side: THREE.DoubleSide, depthWrite: false });
  private readonly waveArc = new THREE.Group();
  private readonly waveMat = new THREE.MeshBasicMaterial({ color: POISON, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  private readonly gob: THREE.Mesh;
  private readonly splash: THREE.Mesh;
  private readonly splashMat = new THREE.MeshBasicMaterial({ color: POISON, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false });
  private headY = HEAD_UP;
  private pitch = 0;
  private open = 0.15;
  private shown = 0;
  private flashLeft = 0;
  private age = 0;
  private fallen = 0;

  constructor() {
    // ---- Her head: one faceted lump, wider than it is tall, and a brow plate over her eyes. ----
    const skull = flat(new THREE.DodecahedronGeometry(1, 0));
    skull.scale(1.5, 0.92, 1.6);
    this.head.add(new THREE.Mesh(paintAll(skull, CHITIN), this.headMat));
    const brow = flat(new THREE.CylinderGeometry(0.75, 1.25, 0.34, 5, 1));
    brow.rotateY(Math.PI / 5);
    brow.scale(1, 1, 1.15);
    const browMesh = new THREE.Mesh(paintAll(brow, CHITIN_PALE), this.headMat);
    browMesh.position.set(0, 0.86, -0.15);
    this.head.add(browMesh);
    // Eight eyes across her face: two great ones, and three small ones stepping away to each side.
    const eye = (r: number, x: number, y: number, z: number): void => {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(r, 0), this.eyeMat);
      m.position.set(x, y, z);
      this.head.add(m);
    };
    for (const s of [-1, 1]) {
      eye(0.3, s * 0.42, 0.42, 1.42);
      eye(0.17, s * 0.95, 0.52, 1.12);
      eye(0.14, s * 1.24, 0.34, 0.7);
      eye(0.12, s * 0.62, 0.84, 0.95);
    }
    // Her jaws: a thick tapered bar each, hung under the front of her head, with a pale fang hooking in at its end.
    for (const s of [-1, 1]) {
      const jaw = new THREE.Group();
      jaw.position.set(s * 0.62, -0.38, 1.05);
      const stem = new THREE.Mesh(shadeAlong(bar(0.46, 0.3, 5), CHITIN_PALE, 0.8, 1.15), this.headMat);
      stem.scale.z = 1.25;
      stem.rotation.x = 0.2; // forward, and a little down
      jaw.add(stem);
      // (Its root at the end of the jaw, its point down and a little in: all of it shows.)
      const fangGeo = new THREE.ConeGeometry(0.24, 1.15, 4);
      fangGeo.translate(0, 0.575, 0);
      const fang = new THREE.Mesh(paintAll(flat(fangGeo), BONE_WHITE), this.headMat);
      fang.position.set(0, -0.25, 1.2);
      fang.rotation.set(Math.PI / 2 - 0.05, -s * 0.35, 0, 'YXZ'); // forward, hooking in (so they lie on the floor when her head does, and are not sunk in it)
      jaw.add(fang);
      this.head.add(jaw);
      this.jaws.push(jaw);
    }
    this.head.scale.setScalar(HEAD_SCALE);
    this.root.add(this.head);

    // ---- The body behind her head, running back into the dark: black at its far end. ----
    // (Broad where it comes out of the dark, narrowing to her head: when she bites, it is her whole front that comes.)
    this.neck = new THREE.Mesh(shadeAlong(bar(5.2, WIDOW.radius * 0.86, 6, 0.62), CHITIN, 0, 1), this.neckMat);
    this.root.add(this.neck);

    // ---- Four legs: two long bones each, and a claw. ----
    for (const [side, inner] of [[1, false], [1, true], [-1, true], [-1, false]] as Array<[1 | -1, boolean]>) {
      const upperMat = createPs1Material({ lit: true });
      const lowerMat = createPs1Material({ lit: true });
      const thick = inner ? 0.62 : 0.86;
      const upper = new THREE.Mesh(shadeAlong(bar(thick, thick * 0.8, 5), CHITIN, 0.55, 1), upperMat);
      const lower = new THREE.Mesh(shadeAlong(bar(thick * 0.86, thick * 0.34, 5), CHITIN_PALE, 0.75, 1.1), lowerMat);
      const claw = new THREE.Mesh(paintAll(flat(new THREE.ConeGeometry(thick * 0.42, 1.1, 4)), BONE_WHITE), lowerMat);
      this.root.add(upper, lower, claw);
      this.legs.push({ side, inner, upper, lower, claw, mats: [upperMat, lowerMat], hip: new THREE.Vector3(), knee: new THREE.Vector3(), foot: new THREE.Vector3(), hipY: NaN, placed: false });
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

    // ---- Her poison ----
    // The slash along a slam's line: the same strip, in poison.
    this.slash = new THREE.Mesh(stripGeo, this.slashMat);
    // The wave a swipe flings: a crescent one unit out from her (it is scaled out as it runs), a band on the floor
    // and a low wall of spray standing on it.
    const N = 36;
    const SPAN = 1.5;
    const pts: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[]): void => void pts.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < N; i++) {
      const a0 = -SPAN + (2 * SPAN * i) / N;
      const a1 = -SPAN + (2 * SPAN * (i + 1)) / N;
      const at = (a: number, r: number, y: number): number[] => [Math.sin(a) * r, y, Math.cos(a) * r];
      quad(at(a0, 0.955, 0.06), at(a1, 0.955, 0.06), at(a1, 1, 0.06), at(a0, 1, 0.06));
      quad(at(a0, 1, 0.06), at(a1, 1, 0.06), at(a1, 1, 0.85), at(a0, 1, 0.85));
    }
    const waveGeo = new THREE.BufferGeometry();
    waveGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
    this.waveArc.add(new THREE.Mesh(waveGeo, this.waveMat));
    // A gob of it in the air, and the splash where one lands.
    this.gob = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), this.slashMat);
    const splashGeo = new THREE.CircleGeometry(1, 20);
    splashGeo.rotateX(-Math.PI / 2);
    this.splash = new THREE.Mesh(splashGeo, this.splashMat);
    this.slash.visible = this.waveArc.visible = this.gob.visible = this.splash.visible = false;
    this.root.add(this.slash, this.waveArc, this.gob, this.splash);
  }

  /** The sword found her: a flash. */
  flash(): void {
    this.flashLeft = 0.14;
  }

  /** How bright a thing at `p` is: in the pool of light over the floor, or out of it. */
  private lightAt(w: WidowView, p: THREE.Vector3): number {
    const out = Math.hypot(p.x - w.field.x, p.z - w.field.z);
    const across = Math.max(0, Math.min(1, (w.field.r + 1.4 - out) / 2.6));
    const up = Math.max(0, Math.min(1, 1.2 - Math.max(0, p.y - w.floorY - 2.5) / 8));
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
      wantY = HEAD_UP + 1.6 * Math.sin(Math.min(1, t / W.rise) * Math.PI);
      wantPitch = -0.35 * Math.sin(Math.min(1, t / W.rise) * Math.PI);
      wantOpen = 0.75;
    } else if (s === 'biteWind') {
      wantY = HEAD_UP + 2.6 * ease(t / w.windTime);
      wantPitch = -0.3 * ease(t / w.windTime);
      wantOpen = 0.2 + 0.7 * ease(t / (w.windTime * 0.7));
    } else if ((s === 'bite' || s === 'biteStuck') && w.far) {
      // (Spitting from afar: her head stays up, and snaps forward a little.)
      wantY = HEAD_UP + 1.2;
      wantPitch = 0.25;
      wantOpen = 0.8;
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
    this.eyeMat.color.setRGB(1, 0.23, 0.13).multiplyScalar(dead ? Math.max(0.08, 1 - this.fallen) : w.raging ? 1 : 0.82 + 0.18 * Math.sin(this.age * 3));

    // ---- The body behind it: from deep in the dark to the back of her head ----
    const anchor = new THREE.Vector3(w.px - fx * 12, floor + 5 - 2.6 * this.fallen, w.pz - fz * 12);
    const back = new THREE.Vector3(w.x - fx * 1.2 * HEAD_SCALE, this.headY + 0.15, w.z - fz * 1.2 * HEAD_SCALE);
    lay(this.neck, anchor, back);
    this.neckMat.uniforms.tint.value.setScalar(Math.max(headLight, this.lightAt(w, back)));

    // ---- Her legs ----
    for (const leg of this.legs) {
      const mine = leg.side === w.side;
      const h = w.hip(leg.side, leg.inner);
      // Where its foot stands when it is doing nothing.
      const restA = leg.side * (leg.inner ? 0.42 : 1.0);
      const restD = leg.inner ? 6 : 7.5;
      const [rx, rz] = w.dirOf(restA);
      const target = new THREE.Vector3(h.x + rx * restD, floor, h.z + rz * restD);
      let hipY = HIP_Y;
      let snap = false;
      if (s === 'lurk') {
        // Folded up beside her, out past the edge of the light.
        target.set(h.x + rx * 1.6 - fx * 2.5, floor, h.z + rz * 1.6 - fz * 2.5);
        snap = true;
      } else if (s === 'rise') {
        // Out they come, one after another, and are set down on the floor.
        const i = this.legs.indexOf(leg);
        const k = ease((t - i * 0.22) / 0.6);
        const from = new THREE.Vector3(h.x + rx * 1.6 - fx * 2.5, floor, h.z + rz * 1.6 - fz * 2.5);
        target.lerpVectors(from, target, k);
        target.y = floor + 4 * Math.sin(k * Math.PI);
        snap = true;
      } else if (!leg.inner && mine && (s === 'slamWind' || s === 'slam' || s === 'slamStuck' || s === 'sweepWind' || s === 'sweep')) {
        const [dx, dz] = w.dirOf(w.angle);
        const up = new THREE.Vector3(h.x + dx * 5.5, floor + 9, h.z + dz * 5.5);
        const down = new THREE.Vector3(w.foot.x, floor, w.foot.z);
        const [ox, oz] = w.dirOf(leg.side * 1.25);
        const drawn = new THREE.Vector3(h.x + ox * 7.5, floor + 0.7, h.z + oz * 7.5);
        if (s === 'slamWind') {
          // Up it goes, high over the line its poison will run along.
          const k = ease(t / (w.windTime * 0.55));
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
          // Pulled free, and drawn back out to its own side, low.
          target.copy(leg.foot).lerp(drawn, 1 - Math.exp(-dt * 14));
          snap = true;
        } else if (t < 0.3) {
          // The swipe: across her front, fast, flinging the wave off its end.
          const a = leg.side * (1.25 - 2.1 * ease(t / 0.3));
          const [sx, sz] = w.dirOf(a);
          target.set(h.x + sx * 8.2, floor + 0.7, h.z + sz * 8.2);
          snap = true;
        }
      } else if (leg.inner && mine && w.far && (s === 'stabWind' || s === 'stab')) {
        // Too far to stab: it rears back, and flicks its poison at the place.
        const toX = w.spot.x - h.x;
        const toZ = w.spot.z - h.z;
        const d = Math.hypot(toX, toZ) || 1;
        const reared = new THREE.Vector3(h.x + (toX / d) * 3, floor + 8, h.z + (toZ / d) * 3);
        const flung = new THREE.Vector3(h.x + (toX / d) * 8, floor + 2.5, h.z + (toZ / d) * 8);
        const k = s === 'stab' ? 1 : t / w.windTime;
        if (k < 0.5) target.lerp(reared, ease(k / 0.4));
        else target.copy(reared).lerp(flung, ease((k - 0.5) / 0.2));
        snap = k > 0.4;
      } else if (leg.inner && mine && !w.far && (s === 'stabWind' || s === 'stab' || s === 'stabStuck')) {
        if (s === 'stabWind') {
          const k = ease(t / (w.windTime * 0.6));
          target.lerp(new THREE.Vector3(w.spot.x, floor + 7.5, w.spot.z), k);
          snap = k >= 1;
        } else if (s === 'stab') {
          const k = Math.min(1, t / (W.stabTime * 0.5));
          target.set(w.spot.x, floor + 7.5 * (1 - k * k), w.spot.z);
          snap = true;
        } else {
          target.set(w.spot.x, floor, w.spot.z);
          snap = true;
        }
      }
      if (dead) hipY = HIP_Y - 1.7 * this.fallen;
      if (!leg.placed || snap) leg.foot.copy(target);
      else {
        // A leg going back to its place is lifted over the floor on the way: it strikes nothing, and looks it.
        const away = Math.hypot(leg.foot.x - target.x, leg.foot.z - target.z);
        const goal = target.clone();
        goal.y += Math.min(5, away * 0.5);
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
      lay(leg.lower, leg.knee, leg.foot);
      leg.claw.position.copy(leg.foot);
      leg.claw.quaternion.copy(leg.lower.quaternion);
      leg.claw.rotateX(Math.PI / 2); // the cone's point along the bone
      leg.mats[0].uniforms.tint.value.setScalar(this.lightAt(w, leg.hip.clone().lerp(leg.knee, 0.6)));
      leg.mats[1].uniforms.tint.value.setScalar(this.lightAt(w, leg.knee.clone().lerp(leg.foot, 0.7)));
    }

    // ---- The marks on the floor ----
    const beat = 0.5 + 0.5 * Math.sin(this.age * 22);
    this.strip.visible = s === 'slamWind' || s === 'slam';
    if (this.strip.visible || s === 'slamStuck') {
      const h = w.hip(w.side);
      const [dx, dz] = w.dirOf(w.angle);
      // (Only as far as the floor goes: from where the line comes into the light to where it leaves it.)
      const ox = h.x - w.field.x;
      const oz = h.z - w.field.z;
      const b = ox * dx + oz * dz;
      const disc = b * b - (ox * ox + oz * oz - w.field.r * w.field.r);
      const far = disc > 0 ? Math.min(W.legLen, -b + Math.sqrt(disc)) : 0;
      const near = disc > 0 ? Math.max(0, -b - Math.sqrt(disc)) : 0;
      this.strip.position.set(h.x + dx * near, floor + 0.05, h.z + dz * near);
      this.strip.rotation.y = Math.atan2(dx, dz);
      this.strip.scale.set(W.legHalf * 2, 1, Math.max(0.01, far - near));
      const committed = s === 'slam' || t > w.windTime * W.slamTrack;
      this.markMat.opacity = committed ? 0.45 + 0.3 * beat : 0.22;
    }
    this.ring.visible = s === 'biteWind' || s === 'stabWind';
    if (this.ring.visible) {
      const r = s === 'biteWind' ? W.biteR : W.stabR;
      this.ring.position.set(w.spot.x, floor + 0.05, w.spot.z);
      this.ring.scale.set(r, 1, r);
      const committed = t > w.windTime * (s === 'biteWind' ? W.biteTrack : W.stabTrack);
      this.markMat.opacity = committed ? 0.5 + 0.35 * beat : 0.28;
    }

    // ---- Her poison, where it strikes ----
    // The slash along a slam's line: there the instant the foot comes down, and gone a moment after.
    const slashFor = s === 'slam' ? 1 : s === 'slamStuck' ? 1 - t / 0.3 : 0;
    this.slash.visible = slashFor > 0;
    if (this.slash.visible) {
      this.slash.position.copy(this.strip.position);
      this.slash.rotation.y = this.strip.rotation.y;
      this.slash.scale.copy(this.strip.scale);
      this.slash.position.y = floor + 0.07;
    }
    // The wave: a crescent as far out from her as the rules have it.
    this.waveArc.visible = s === 'sweep';
    if (this.waveArc.visible) {
      this.waveArc.position.set(w.px, floor, w.pz);
      this.waveArc.rotation.y = w.facing;
      this.waveArc.scale.set(w.wave, 1, w.wave);
      this.waveMat.opacity = 0.85 * Math.min(1, (W.legLen + 1 - w.wave) / 4);
    }
    // A gob flung at a far place: off the leg's end (or out of her mouth), over, and down onto the ring as the blow lands.
    const stabFar = w.far && (s === 'stabWind' || s === 'stab');
    const spitFar = w.far && (s === 'biteWind' || s === 'bite');
    const lands = s === 'stab' || s === 'bite' ? 1 : (t / w.windTime - 0.55) / 0.45;
    this.gob.visible = (stabFar || spitFar) && lands > 0 && lands < 1;
    if (this.gob.visible) {
      const from = spitFar ? this.head.position : this.legs.find((l) => l.inner && l.side === w.side)!.foot;
      this.gob.position.set(from.x + (w.spot.x - from.x) * lands, from.y + (floor + 0.4 - from.y) * lands + 7 * lands * (1 - lands), from.z + (w.spot.z - from.z) * lands);
      this.gob.scale.setScalar(spitFar ? 1.3 : 0.8);
      this.gob.rotation.set(this.age * 9, this.age * 7, 0);
    }
    // ...and the splash where it lands, the size of the blow, fading.
    const splashed = w.far && (s === 'stab' || s === 'bite' || ((s === 'stabStuck' || s === 'biteStuck') && t < 0.3));
    this.splash.visible = splashed;
    if (splashed) {
      const r = s === 'bite' || s === 'biteStuck' ? W.biteR : W.stabR;
      this.splash.position.set(w.spot.x, floor + 0.06, w.spot.z);
      this.splash.scale.set(r, 1, r);
      this.splashMat.opacity = s === 'stab' || s === 'bite' ? 0.9 : 0.9 * (1 - t / 0.3);
    }
    this.slashMat.opacity = this.slash.visible ? slashFor : 1;

    // ---- Struck: a flash over all of her ----
    this.flashLeft = Math.max(0, this.flashLeft - dt);
    const f = this.flashLeft > 0 ? 0.55 : 0;
    for (const m of [this.headMat, this.neckMat, ...this.legs.flatMap((l) => l.mats)]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f * 0.8, f * 0.7);
  }

  /** For the tests: where each leg's hip, knee and foot are drawn (outer left, inner left, inner right, outer right). */
  get legPoints(): Array<{ hip: THREE.Vector3; knee: THREE.Vector3; foot: THREE.Vector3; side: 1 | -1; inner: boolean }> {
    return this.legs.map((l) => ({ hip: l.hip, knee: l.knee, foot: l.foot, side: l.side, inner: l.inner }));
  }
  get headPosition(): THREE.Vector3 {
    return this.head.position;
  }
  /** For the tests: how far out the wave is drawn (0 when there is none), and whether the slash of poison is showing. */
  get waveRadius(): number {
    return this.waveArc.visible ? this.waveArc.scale.x : 0;
  }
  get slashShown(): boolean {
    return this.slash.visible;
  }
}
