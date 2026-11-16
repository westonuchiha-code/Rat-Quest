import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { SCORPION, type ScorpionState } from './scorpion';
import { flat, horn, loft } from './widowModel';

/**
 * The Lamp Scorpion, as it is drawn. It faces +z with its feet on y = 0.
 *
 * Built of a few shaped, flat-faced pieces: one low wide shell; a tail of five joints and the sting, which is its
 * lamp (a bulb and a hooked barb, lit from inside); two arms, each with a hand and one finger that opens; eight
 * legs, each one bent piece. Its body is dark: in a dark place what is seen of it is its lamp and what the lamp
 * lights of it.
 *
 * What is drawn is what is so. The barb's POINT is where the rules have it (`tail`, in its own frame): the tail is
 * bent to reach there, its joints all the same angle one to the next (`tailJoints`), and the lamp's light in the room
 * is put at that point by the game. The ring on the floor is where the rules say the sting will land, and as wide.
 */
/** (Its pictures carry its colour: `scorpShell`, `scorpTail`, `scorpClaw`. What is painted under them only shades it.) */
const C = {
  shell: 0xffffff, under: 0xc8c0cc, leg: 0xd0c8d6, legTip: 0xfff4ff, claw: 0xffffff, finger: 0xe8dcd4, tail: 0xffffff, tailUnder: 0xb8b0be,
  // (Its lamp is not shaded by the room: dark, a dull unlit ember of its colour; lit, its colour; hot, nearly white.)
  lit: 0x4dffc8,
};
/** The tail's links, from its root: five joints and the sting. They add up to SCORPION.tailLength. */
export const TAIL_LINKS = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
/** How thick each joint is. */
const TAIL_THICK = [0.17, 0.155, 0.14, 0.125, 0.11];
const HIP = 0.36;
/** Where the legs join the shell, along it, and how far each is turned toward its front. */
const LEGS: Array<[number, number]> = [[-0.34, -0.75], [-0.1, -0.3], [0.14, 0.15], [0.36, 0.6]];
const KNEE = new THREE.Vector3(0.36, 0.2, 0);
const FOOT = new THREE.Vector3(0.72, -HIP, 0);

export interface ScorpionAnimInput {
  state: ScorpionState;
  stateTime: number;
  /** Where its barb is, in its own frame, and how bright its lamp. */
  tail: { ahead: number; up: number };
  light: number;
  /** -1 shut .. 0 held ready .. 1 wide. */
  claw: number;
  moving: number;
  /** The ring on the floor, in its own frame: how far ahead, how wide, how full. Null when there is none. */
  mark: { ahead: number; r: number; fill: number } | null;
}

/**
 * The joints of a tail from `root` to its point at `tip` ([ahead, up], in its own frame): every link is turned the
 * same angle from the one before, curling up and over forward, as much as brings the point to `tip`. One more point
 * than there are links; the last is `tip` (or as near as the tail can reach: it cannot stretch).
 */
export function tailJoints(root: readonly [number, number], tip: readonly [number, number], links: readonly number[]): Array<[number, number]> {
  const total = links.reduce((a, b) => a + b, 0);
  const cx = tip[0] - root[0];
  const cy = tip[1] - root[1];
  const chord = Math.max(0.2, Math.min(total * 0.9995, Math.hypot(cx, cy)));
  const end = (bend: number): [number, number] => {
    let x = 0;
    let y = 0;
    links.forEach((l, i) => {
      x += l * Math.cos(-i * bend);
      y += l * Math.sin(-i * bend);
    });
    return [x, y];
  };
  // (The more it curls, the nearer its point is to its root: so the curl that gives this chord is found by halving.)
  let lo = 0;
  let hi = (Math.PI * 1.7) / (links.length - 1);
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const e = end(mid);
    if (Math.hypot(e[0], e[1]) > chord) lo = mid;
    else hi = mid;
  }
  const bend = (lo + hi) / 2;
  const e = end(bend);
  const first = Math.atan2(cy, cx) - Math.atan2(e[1], e[0]);
  const out: Array<[number, number]> = [[root[0], root[1]]];
  links.forEach((l, i) => {
    const p = out[out.length - 1];
    out.push([p[0] + l * Math.cos(first - i * bend), p[1] + l * Math.sin(first - i * bend)]);
  });
  return out;
}

/** Colours every corner of a shape by where it is. */
function paintBy(geo: THREE.BufferGeometry, at: (x: number, y: number, z: number) => number): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    // (A whole face one colour, by its middle.)
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    c.set(at(x, y, z));
    for (let j = 0; j < 3; j++) cols.set([c.r, c.g, c.b], (i + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/** A tapered bar from a to b, flat-faced, where it lies. */
function bar(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, sides: number): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const len = d.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 1).toNonIndexed();
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(len)));
  g.translate(a.x, a.y, a.z);
  return g;
}
/** Several shapes as one (their pictures' places with them). */
function join(...parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    pos.push(...(g.attributes.position.array as ArrayLike<number> as number[]));
    uv.push(...(g.attributes.uv.array as ArrayLike<number> as number[]));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.computeVertexNormals();
  return geo;
}
function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

interface Leg {
  swing: THREE.Group;
  lift: THREE.Group;
  side: number;
  splay: number;
  set: number;
}
interface Arm {
  arm: THREE.Group;
  finger: THREE.Group;
  side: number;
}

export class ScorpionModel {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  /** Its shell, its tail and legs, its hands: each lit by the room, each with its picture. */
  private readonly mat = createPs1Material({ lit: true, shine: 0.3, tex: getTexture('scorpShell') });
  private readonly tailMat = createPs1Material({ lit: true, shine: 0.3, tex: getTexture('scorpTail') });
  private readonly clawMat = createPs1Material({ lit: true, shine: 0.35, tex: getTexture('scorpClaw') });
  /** Its lamp: lit from inside, so it is not shaded by the room. Its colour is its light. */
  private readonly lamp = new THREE.MeshBasicMaterial({ color: C.lit });
  /** (Its bulb: the same light, through its veined glass.) */
  private readonly bulbMat = new THREE.MeshBasicMaterial({ color: C.lit, map: getTexture('scorpLamp') });
  private readonly haloMat: THREE.SpriteMaterial;
  private readonly markMat: THREE.MeshBasicMaterial;
  private readonly fillMat: THREE.MeshBasicMaterial;
  private readonly lit: THREE.Color;
  private readonly dark: THREE.Color;
  private readonly joints: THREE.Mesh[] = [];
  private readonly bulb: THREE.Mesh;
  private readonly barb: THREE.Mesh;
  private readonly halo: THREE.Sprite;
  private readonly mark = new THREE.Group();
  private readonly fill: THREE.Mesh;
  private readonly legs: Leg[] = [];
  private readonly arms: Arm[] = [];
  private readonly shadow: THREE.Mesh;
  private flashAmount = 0;
  private time = 0;
  private gait = 0;
  private pitch = 0;
  private sink = 0;
  private scale = 1;
  /** Where the tail's joints are, in its own frame ([ahead, up]): the last is the barb's point. For the tests. */
  chain: Array<[number, number]> = [];
  /** How bright its lamp is drawn. For the tests. */
  shining = 0;

  constructor(color?: number) {
    this.lit = new THREE.Color(color ?? C.lit);
    this.dark = this.lit.clone().multiplyScalar(0.07);
    this.root.add(this.body);

    // ---- Its shell: low and wide, a ridge down its back, in plates ----
    const shell = flat(loft([
      { z: -0.7, rx: 0.17, ry: 0.12, y: 0.41 },
      { z: -0.42, rx: 0.36, ry: 0.17, y: 0.39 },
      { z: 0.02, rx: 0.47, ry: 0.2, y: 0.37 },
      { z: 0.4, rx: 0.43, ry: 0.18, y: 0.35 },
      { z: 0.64, rx: 0.27, ry: 0.12, y: 0.33 },
    ], 6, 1));
    // (Its plates, keels and grains are in its picture; under it, it is in shadow.)
    paintBy(shell, (_x, y) => (y < 0.33 ? C.under : C.shell));
    this.body.add(new THREE.Mesh(shell, this.mat));
    // (Two small eyes on its front, and the lamp's colour caught in them.)
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), this.lamp);
      eye.position.set(s * 0.1, 0.465, 0.5);
      this.body.add(eye);
    }

    // ---- Its legs: four a side, each one bent piece ----
    const legGeo = paintBy(join(bar(new THREE.Vector3(), KNEE, 0.06, 0.045, 4), bar(KNEE, FOOT, 0.045, 0.014, 4)), (x) => (x > 0.62 ? C.legTip : C.leg));
    // (A leg's picture is the tail's, a joint of it to each of its two lengths.)
    for (const side of [-1, 1]) {
      LEGS.forEach(([z, splay], i) => {
        const swing = new THREE.Group();
        swing.position.set(side * 0.3, HIP, z);
        const lift = new THREE.Group();
        swing.add(lift);
        lift.add(new THREE.Mesh(legGeo, this.tailMat));
        this.body.add(swing);
        this.legs.push({ swing, lift, side, splay, set: (i + (side > 0 ? 0 : 1)) % 2 });
      });
    }

    // ---- Its arms: an upper arm, a hand that narrows to a fixed finger, and the finger that opens ----
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.2, 0.34, 0.5);
      const elbow = new THREE.Vector3(side * 0.4, 0.03, 0.32);
      arm.add(new THREE.Mesh(paintBy(bar(new THREE.Vector3(), elbow, 0.075, 0.06, 5), () => C.claw), this.tailMat));
      const hand = new THREE.Group();
      hand.position.copy(elbow);
      hand.rotation.y = -side * 0.4;
      const palm = flat(loft([
        { z: -0.04, rx: 0.06, ry: 0.05, y: 0 },
        { z: 0.08, rx: 0.17, ry: 0.11, y: 0 },
        { z: 0.27, rx: 0.21, ry: 0.13, y: 0 },
        { z: 0.4, rx: 0.13, ry: 0.085, y: 0 },
        { z: 0.5, rx: 0.06, ry: 0.05, y: -0.005 },
        { z: 0.72, rx: 0.014, ry: 0.014, y: -0.01 },
      ], 5, 1));
      paintBy(palm, () => C.claw);
      hand.add(new THREE.Mesh(palm, this.clawMat));
      // (The finger: hinged on the outer side of the palm, its point forward, bowed outward.)
      const finger = new THREE.Group();
      finger.position.set(side * 0.12, 0.01, 0.38);
      const fg = horn(0.34, 0.055, 0.1);
      fg.rotateZ((side * Math.PI) / 2);
      fg.rotateY(Math.PI);
      fg.translate(0, 0, 0.34);
      // (Its picture: the finger's end of the hand's, the point of the horn at the picture's dark point.)
      const fuv = fg.attributes.uv;
      for (let i = 0; i < fuv.count; i++) fuv.setY(i, 1 - fuv.getY(i) * 0.42);
      finger.add(new THREE.Mesh(paintBy(flat(fg), () => C.finger), this.clawMat));
      hand.add(finger);
      arm.add(hand);
      this.body.add(arm);
      this.arms.push({ arm, finger, side });
    }

    // ---- Its tail: five joints, each a faceted bead, thinner toward the sting ----
    for (const thick of TAIL_THICK) {
      const g = flat(loft([
        { z: 0, rx: thick * 0.55, ry: thick * 0.5, y: 0 },
        { z: 0.16, rx: thick, ry: thick * 0.92, y: 0 },
        { z: 0.84, rx: thick * 0.92, ry: thick * 0.85, y: 0 },
        { z: 1, rx: thick * 0.5, ry: thick * 0.46, y: 0 },
      ], 5, 1));
      paintBy(g, (_x, y) => (y < -thick * 0.3 ? C.tailUnder : C.tail));
      const m = new THREE.Mesh(g, this.tailMat);
      this.joints.push(m);
      this.root.add(m);
    }
    // ---- Its sting, which is its lamp: a bulb, and the hooked barb ----
    this.bulb = new THREE.Mesh(flat(loft([
      { z: 0, rx: 0.06, ry: 0.06, y: 0 },
      { z: 0.07, rx: 0.15, ry: 0.15, y: 0 },
      { z: 0.19, rx: 0.14, ry: 0.14, y: 0 },
      { z: 0.27, rx: 0.05, ry: 0.05, y: 0 },
    ], 6, 1)), this.bulbMat);
    this.barb = new THREE.Mesh(flat(horn(0.3, 0.06, 0.09)), this.lamp);
    this.root.add(this.bulb, this.barb);
    // (Its glow in the air round it.)
    const S = 32;
    const data = new Uint8Array(S * S * 4);
    for (let j = 0; j < S; j++) {
      for (let i = 0; i < S; i++) {
        const k = Math.max(0, 1 - Math.hypot(i - S / 2 + 0.5, j - S / 2 + 0.5) / (S / 2)) ** 2.6;
        data.set([255 * k, 255 * k, 255 * k, 255], (j * S + i) * 4);
      }
    }
    const haloTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    haloTex.needsUpdate = true;
    this.haloMat = new THREE.SpriteMaterial({ map: haloTex, color: this.lit, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.halo = new THREE.Sprite(this.haloMat);
    this.root.add(this.halo);

    // ---- The ring on the floor where the sting will land ----
    const paint = this.lit.clone().multiplyScalar(0.85);
    this.markMat = new THREE.MeshBasicMaterial({ color: paint, transparent: true, opacity: 0.95, depthWrite: false });
    this.fillMat = new THREE.MeshBasicMaterial({ color: paint, transparent: true, opacity: 0.4, depthWrite: false });
    this.fill = new THREE.Mesh(new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2), this.fillMat);
    this.mark.add(new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 20).rotateX(-Math.PI / 2), this.markMat), this.fill);
    this.mark.visible = false;
    this.root.add(this.mark);

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 10), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes it white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: ScorpionAnimInput): void {
    this.time += dt;
    const state = ctx.state;
    const t = ctx.stateTime;
    const down = state === 'sprawl' || state === 'dead';

    // ---- Its body: it dips its front as the tail rears, lunges as it strikes, lies flat when it is down ----
    const pitchTo = state === 'stingWind' ? 0.14 : state === 'sting' || state === 'stuck' ? 0.2 : state === 'snapWind' ? -0.1 : 0;
    this.pitch = ease(this.pitch, pitchTo, dt, 16);
    this.sink = ease(this.sink, down ? 0.17 : state === 'douse' || state === 'dark' ? 0.06 : 0, dt, 12);
    const breath = down ? 0 : 0.012 * Math.sin(this.time * 3.1);
    this.body.position.y = -this.sink + breath;
    this.body.rotation.x = this.pitch;
    this.scale = state === 'dead' ? Math.max(0, 1 - Math.max(0, t - 0.7) / 0.5) : ease(this.scale, 1, dt, 10);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;

    // ---- Its legs: two sets, stepping in turn; splayed flat when it is down ----
    if (ctx.moving > 0.2) this.gait += dt * (6 + ctx.moving * 2.2);
    for (const leg of this.legs) {
      const step = ctx.moving > 0.2 && !down ? Math.sin(this.gait + leg.set * Math.PI) : 0;
      const sw = leg.splay + step * 0.3 + (down ? leg.splay * 0.25 : 0);
      leg.swing.rotation.y = leg.side > 0 ? -sw : Math.PI + sw;
      // (A foot lifts on the forward half of its step; down, its legs lie out nearly flat.)
      leg.lift.rotation.z = (down ? 0.06 : 0) + Math.max(0, Math.cos(this.gait + leg.set * Math.PI)) * (ctx.moving > 0.2 && !down ? 0.22 : 0) + this.sink * 1.35;
    }

    // ---- Its claws: held ready, wide before the snap, shut across its front ----
    const open = Math.max(-1, Math.min(1, ctx.claw));
    for (const a of this.arms) {
      a.arm.rotation.y = a.side * (0.05 + 0.5 * open);
      a.arm.rotation.x = open > 0 ? -0.18 * open : 0;
      a.finger.rotation.y = a.side * (0.3 + 0.6 * Math.max(0, open) - 0.3 * Math.max(0, -open));
    }

    // ---- Its tail: bent to put the barb's point where the rules have it ----
    // (Its root goes with its body as that tips.)
    const R = SCORPION.tailRoot;
    const ry = R.up - HIP;
    const rootAt: [number, number] = [ry * Math.sin(this.pitch) + R.ahead * Math.cos(this.pitch), HIP + ry * Math.cos(this.pitch) - R.ahead * Math.sin(this.pitch) - this.sink];
    this.chain = tailJoints(rootAt, [ctx.tail.ahead, Math.max(0.03, ctx.tail.up)], TAIL_LINKS);
    const P = this.chain;
    for (let i = 0; i < this.joints.length; i++) {
      const m = this.joints[i];
      const a = Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]);
      m.position.set(0, P[i][1], P[i][0]);
      m.rotation.x = -a;
      m.scale.z = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]);
    }
    const last = P.length - 1;
    const sa = Math.atan2(P[last][1] - P[last - 1][1], P[last][0] - P[last - 1][0]);
    this.bulb.position.set(0, P[last - 1][1], P[last - 1][0]);
    this.bulb.rotation.x = -sa;
    // (The barb's point is the tail's point; its root is back in the bulb.)
    this.barb.position.set(0, P[last][1], P[last][0]);
    this.barb.rotation.x = -(sa + Math.PI);

    // ---- Its lamp: as bright as the rules say ----
    this.shining = ease(this.shining, Math.max(0, ctx.light), dt, 30);
    const L = this.shining;
    const k = Math.max(0, Math.min(1, L));
    this.lamp.color.copy(this.dark).lerp(this.lit, k);
    if (L > 1) this.lamp.color.lerp(new THREE.Color(0xffffff), Math.min(0.85, (L - 1) / 0.7));
    // (The bulb's picture is darker than plain light: it is drawn half as bright again, so that it glows as the barb does.)
    this.bulbMat.color.copy(this.lamp.color).multiplyScalar(1.5);
    this.haloMat.color.copy(this.lit).multiplyScalar(Math.min(0.6, 0.3 * L));
    this.halo.visible = L > 0.05;
    this.halo.position.set(0, P[last - 1][1], P[last - 1][0]);
    this.halo.scale.setScalar(0.9 + 0.9 * Math.min(1.6, L));

    // ---- The ring on the floor ----
    this.mark.visible = !!ctx.mark;
    if (ctx.mark) {
      this.mark.position.set(0, 0.05, ctx.mark.ahead);
      this.mark.scale.setScalar(ctx.mark.r);
      this.fill.scale.setScalar(Math.max(0.05, ctx.mark.fill));
    }

    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    for (const m of [this.mat, this.tailMat, this.clawMat]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    this.root.updateMatrixWorld(true);
  }

  /** Where things are in the world, for the tests: the barb's point, its tail's joints, its feet, its claws' points, the ring. */
  parts(): { tip: THREE.Vector3; tail: THREE.Vector3[]; feet: THREE.Vector3[]; claws: THREE.Vector3[]; lamp: THREE.Color; mark: { at: THREE.Vector3; r: number; fill: number } | null } {
    this.root.updateMatrixWorld(true);
    const w = (v: THREE.Vector3, o: THREE.Object3D): THREE.Vector3 => o.localToWorld(v);
    const tail = this.chain.map(([ahead, up]) => w(new THREE.Vector3(0, up, ahead), this.root));
    return {
      tip: tail[tail.length - 1].clone(),
      tail,
      feet: this.legs.map((l) => w(FOOT.clone(), l.lift)),
      claws: this.arms.map((a) => w(new THREE.Vector3(0, 0, 0.34), a.finger)),
      lamp: this.lamp.color.clone(),
      mark: this.mark.visible ? { at: this.mark.getWorldPosition(new THREE.Vector3()), r: this.mark.scale.x * this.root.scale.x, fill: this.fill.scale.x } : null,
    };
  }
}
