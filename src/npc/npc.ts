import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { modelKit, paint } from '../render/modelKit';
import { GRIM_HEIGHT, GrimsqueakModel, type GrimGesture } from './grimsqueakModel';
import { makePatron, patronLook, PATRON_KINDS, type Doing, type PatronBody, type PatronKind } from './patrons';
import { AntModel } from '../enemies/antModel';
import { StagModel } from '../enemies/stagModel';

/** A friendly character standing in a level. Plain data. */
export interface NpcSpec {
  x: number;
  z: number;
  y?: number;
  facing: number;
  name: string;
  /** What kind of creature he is. Mouse by default. */
  kind?: NpcKind;
  /** What he says, one screen of text per entry. */
  lines: string[];
  /** Starts talking by himself when the rat comes within this distance (a cutscene), once. */
  auto?: number;
  /** Not in the room until a story scene brings him in. */
  hidden?: boolean;
  /** Talking to him opens his shop (his first line is his greeting). */
  shop?: boolean;
  /**
   * What he is at when the rat walks in (the Club's regulars: see patrons.ts). One who is doing something does not
   * turn his whole body to the rat: he stays at his table or his wall, and turns his head.
   */
  doing?: Doing;
  /** On a stool (his `y` is still the floor's). */
  seated?: boolean;
  /** Whom he is talking to or playing against, when it is not the rat: where they are (x, z). */
  partner?: [number, number];
  /** Of the two at a table, which one he is (0 or 1): they take turns to talk. */
  turn?: number;
  /**
   * He is only here once this is so (the Club gains regulars as the world is cleared). Nobody the room NEEDS has
   * one of these: it is full without them. `cleared`: a level's id. `beaten`: a kind of creature, and how many of
   * them he must have beaten in all. With both, both must be so.
   */
  when?: { cleared?: string; beaten?: [string, number] };
}

/** Whether one of the Club's later regulars is here yet, by what the save says has been done. */
export function isHere(when: NpcSpec['when'], done: { cleared(id: string): boolean; beaten(kind: string): number }): boolean {
  if (!when) return true;
  if (when.cleared && !done.cleared(when.cleared)) return false;
  if (when.beaten && done.beaten(when.beaten[0]) < when.beaten[1]) return false;
  return true;
}

export type NpcKind = 'mouse' | 'bird' | 'villain' | 'pigeon' | PatronKind | 'ant' | 'stag';

/**
 * Who he is, within his kind: two mice and two birds share a build but not a look. It goes by name, so every level
 * (and every level a player has built) gets the right one: Wren is the brown songbird, Mort the sleepy grey mouse.
 */
export type NpcLook = 'pip' | 'mort' | 'finch' | 'wren' | 'dave' | 'grimsqueak';
export function lookOf(kind: NpcKind | undefined, name: string): NpcLook {
  const n = name.toUpperCase();
  if (kind === 'villain') return 'grimsqueak';
  if (kind === 'pigeon') return 'dave';
  if (kind === 'bird') return n.includes('WREN') ? 'wren' : 'finch';
  return n.includes('MORT') ? 'mort' : 'pip';
}

export const TALK_RANGE = 2.2;
const ANT_NO_TIP = { x: 0, y: 0, z: 0 };

/**
 * Pip the peddler: a small mouse with a pack much too big for him and a lantern on a pole.
 * He bobs on the spot, turns to look at the rat when he comes near, and a little marker hops over his head
 * when he has something to say. Later he can open a shop; for now he gives hints.
 */
/** How high Grimsqueak hangs above the ground when he floats, unless a scene or the fight says otherwise. */
const VILLAIN_FLOAT = 0.6;

/** A story scene's direction for one of the level's characters. Anything left out stays as it was. */
export interface NpcAct {
  /** Somewhere to look instead of at the rat. */
  lookAt: [number, number] | null;
  /** How far into a shrug he is, 0..1. */
  shrug: number;
  /** Where he is (x, floor height, z). */
  pos?: [number, number, number] | null;
  gone?: boolean;
  still?: boolean;
  /** The villain only: 0 floating, 1 down on the ground. */
  low?: number;
  /** The villain only: head down, 0..1. */
  bow?: number;
  /** The villain only: one paw held out, 0..1. */
  reach?: number;
  /** The villain only: what his arms and body are doing (the fight uses these for its tells). */
  gesture?: GrimGesture;
  /** The villain only: how high he hangs above the ground when he is up. */
  float?: number;
}

export class Npc {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly marker: THREE.Mesh;
  private readonly lantern = new THREE.Group();
  private readonly wings: THREE.Object3D[] = [];
  private time = Math.random() * 10;
  private look = 0;
  private talkBob = 0;
  private readonly jaw = new THREE.Group();
  private mouth = 0;
  private readonly feet: THREE.Mesh[] = [];
  /** Parts that move by themselves: eyes that blink, a tail, the mouse's ears, arms, muzzle, cap and pot. */
  private readonly eyes: THREE.Object3D[] = [];
  private readonly tail = new THREE.Group();
  private readonly ears: THREE.Object3D[] = [];
  private readonly arms: THREE.Object3D[] = [];
  private readonly capTip = new THREE.Group();
  private readonly pot = new THREE.Group();
  private muzzle: THREE.Object3D | null = null;
  private lanternGlow: THREE.Mesh | null = null;
  private readonly who: NpcLook;
  /** How open his eyes are when they are open (Mort's are never more than half), and where the bird's tail rests. */
  private eyeOpen = 1;
  private tailRest = -0.35;
  private readonly mug = new THREE.Group();
  private readonly wisps: THREE.Mesh[] = [];
  private blinkIn = 1 + Math.random() * 3;
  private blink = 0;
  /** The bird's head snaps from one tilt to the next, the way small birds look about. */
  private tilt = { in: 1, z: 0, y: 0 };
  /** Dave's medallion: a pivot that swings like a pendulum as he bounces and sways. */
  private readonly pendant = new THREE.Group();
  private pend = { ax: 0, vx: 0, az: 0, vz: 0, prevY: 0, prevX: 0, vy: 0, vxBody: 0 };
  /** True once he has started an auto conversation. */
  autoDone = false;
  /** True while the rat is close enough to talk. */
  near = false;

  constructor(readonly spec: NpcSpec) {
    // The friendly characters built here (the mice, the birds, Dave) wear SOFT PAINT: slow clouds of a little lighter
    // and a little darker over their painted colours, as if brushed on, and nothing else. (The owner, 2026-11-16, shown
    // them plain, soft and deeper side by side after fur strokes and feather flecks were taken off them: "deeper soft
    // paint i like best". See render/textures.ts `softPaint`.)
    const mat = createPs1Material({ lit: true, tex: getTexture('softPaint') });
    /** A box with its corners and edges rounded off by `r`. */
    const rounded = (w: number, h: number, d: number, r: number, color: number | ((nx: number, ny: number, nz: number) => number), x: number, y: number, z: number): THREE.Mesh => {
      const geo = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
      const pos = geo.attributes.position;
      const v = new THREE.Vector3();
      const inner = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        // (Drawn in to a box `r` smaller all round, and pushed back out from there by `r`: its faces stay flat and
        // its edges and corners turn.)
        inner.set(Math.max(-w / 2 + r, Math.min(w / 2 - r, v.x)), Math.max(-h / 2 + r, Math.min(h / 2 - r, v.y)), Math.max(-d / 2 + r, Math.min(d / 2 - r, v.z)));
        v.sub(inner);
        if (v.lengthSq() > 1e-12) v.setLength(r);
        pos.setXYZ(i, inner.x + v.x, inner.y + v.y, inner.z + v.z);
      }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(paint(geo, color, 0.2), mat);
      m.position.set(x, y, z);
      return m;
    };
    const strapMat = createPs1Material({ lit: true, side: THREE.DoubleSide, tex: getTexture('softPaint') });
    const blob = (sx: number, sy: number, sz: number, color: number, x: number, y: number, z: number, w = 7, h = 5): THREE.Mesh => {
      const geo = new THREE.SphereGeometry(1, w, h);
      geo.scale(sx, sy, sz);
      const c = new THREE.Color(color);
      const n = geo.attributes.position.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    };
    const box = (w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const c = new THREE.Color(color);
      const n = geo.attributes.position.count;
      const cols = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) cols.set([c.r, c.g, c.b], i * 3);
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    };
    /** A blob whose colour changes across its surface (so two colours meet cleanly instead of two shapes overlapping). */
    const painted = (sx: number, sy: number, sz: number, colorAt: (nx: number, ny: number, nz: number) => number, x: number, y: number, z: number, w = 9, h = 7): THREE.Mesh => {
      const geo = new THREE.SphereGeometry(1, w, h);
      const pos = geo.attributes.position;
      const cols = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        c.set(colorAt(pos.getX(i), pos.getY(i), pos.getZ(i)));
        cols.set([c.r, c.g, c.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      geo.scale(sx, sy, sz);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      return m;
    };
    const kit = modelKit(mat);
    const look = lookOf(spec.kind, spec.name);
    this.who = look;
    const patronKind = PATRON_KINDS.find((k) => k === spec.kind);
    if (patronKind) {
      // One of the Club's regulars: his body is its own thing (patrons.ts).
      this.patron = makePatron(patronKind, patronLook(patronKind, spec.name));
      this.body.add(this.patron.root);
      this.root.add(this.body);
    } else if (spec.kind === 'stag') {
      // A Stag Knight who has been beaten, and has taken a quieter job: the same creature, standing easy.
      this.stag = new StagModel();
      this.body.add(this.stag.root);
      this.root.add(this.body);
    } else if (spec.kind === 'ant') {
      // An Ant Pikeman, off duty: the same creature he fights elsewhere, with a mug where its pike was.
      this.ant = new AntModel();
      this.ant.offDuty();
      this.body.add(this.ant.root);
      this.root.add(this.body);
    } else if (spec.kind === 'bird') {
      // Finch the goldfinch: a round yellow bird with a black cap, black wings barred with yellow, a forked tail,
      // a red neckerchief knotted at the front and a tuft on his head. His beak opens when he talks.
      // Wren is the same build in other feathers: a small brown songbird, paler below, with barred wings, a pale stripe
      // over each eye, a thin yellow beak, one pink feather on his head, a teal collar with a gold stud, and (the
      // mark of a wren) a short tail cocked straight up.
      const wren = look === 'wren';
      const YEL = wren ? 0xb27a4a : 0xf2c230;
      const INK = wren ? 0x6a4428 : 0x2e2e34;
      const INK_LIGHT = wren ? 0x8a5c36 : 0x4a4a52;
      const BAR = wren ? 0xd8b080 : 0xf2c230;
      const BELLY = wren ? 0xecd8b0 : 0xfff0b0;
      const BEAK = wren ? 0xf0c040 : 0xe88a30;
      const LEG = wren ? 0xc89a6a : 0xe88a30;
      if (wren) {
        this.root.scale.setScalar(0.9);
        this.tailRest = 0.95;
      }
      this.root.add(this.body);
      this.body.add(kit.blob(0.3, 0.3, 0.34, (nx, ny, nz) => (nz > 0.25 && ny < 0.5 && Math.abs(nx) < 0.8 ? BELLY : ny < -0.6 ? (wren ? 0xd8c098 : 0xe8d8a0) : YEL), 0, 0.5, 0, 10, 8, 0.25));
      for (const s of [-1, 1]) {
        // A wing: a flat black blade with a yellow bar across it and three feather tips at the back.
        const wing = new THREE.Group();
        wing.position.set(s * 0.28, 0.64, 0.1);
        const blade = new THREE.Group();
        blade.rotation.x = -0.4; // swept down towards the tail
        blade.add(kit.blob(0.04, 0.13, 0.22, (_nx, _ny, nz) => (wren ? (Math.floor((nz + 1) * 5) % 2 ? BAR : INK) : nz > -0.3 && nz < 0.05 ? BAR : INK), 0, -0.04, -0.12, 10, 6, 0.15));
        for (let k = 0; k < 3; k++) blade.add(kit.blob(0.022, 0.04, 0.11, k === 1 ? INK_LIGHT : INK, 0, -0.1 + k * 0.06, -0.34 + (k === 1 ? -0.03 : 0), 4, 3, 0));
        wing.add(blade);
        wing.userData.side = s;
        this.wings.push(wing);
        this.body.add(wing);
        // A thin leg with a feathered top, and a foot of three toes forward and one back.
        this.body.add(kit.blob(0.055, 0.07, 0.055, YEL, s * 0.09, 0.24, 0.02, 5, 4, 0.2));
        this.body.add(box(0.028, 0.22, 0.028, LEG, s * 0.09, 0.11, 0.02));
        for (let k = -1; k <= 1; k++) {
          const toe = kit.blob(0.016, 0.014, 0.065, LEG, s * 0.09 + k * 0.035, 0.015, 0.075, 4, 3, 0);
          toe.rotation.y = k * 0.45;
          this.body.add(toe);
        }
        this.body.add(kit.blob(0.016, 0.014, 0.04, LEG, s * 0.09, 0.015, -0.02, 4, 3, 0));
      }
      // The tail: two long feathers in a fork. It flicks.
      this.tail.position.set(0, 0.52, -0.3);
      for (const s of [-1, 1]) {
        const feather = kit.blob(0.055, 0.03, wren ? 0.13 : 0.17, (_nx, _ny, nz) => (wren ? (Math.floor((nz + 1) * 4) % 2 ? BAR : INK) : nz < -0.5 ? INK_LIGHT : INK), s * 0.045, 0, wren ? -0.12 : -0.16, 5, 3, 0);
        feather.rotation.y = -s * 0.22;
        this.tail.add(feather);
      }
      this.tail.rotation.x = this.tailRest;
      this.body.add(this.tail);
      if (wren) {
        // A teal collar with a gold stud.
        this.body.add(kit.blob(0.26, 0.055, 0.25, (_nx, ny) => (ny > 0.3 ? 0x3aa8a0 : 0x2a8880), 0, 0.75, 0.06, 10, 4, 0.1));
        this.body.add(kit.blob(0.035, 0.035, 0.03, 0xe8c040, 0, 0.74, 0.31, 5, 4, 0));
      } else {
        // The neckerchief: a red band with a knot and two ends hanging at the front.
        this.body.add(kit.blob(0.27, 0.07, 0.26, (_nx, ny) => (ny > 0.3 ? 0xe04a4a : 0xc83a3a), 0, 0.74, 0.06, 10, 4, 0.1));
        this.body.add(kit.blob(0.045, 0.04, 0.04, 0xa82c2c, 0, 0.71, 0.31, 5, 4, 0));
        for (const s of [-1, 1]) {
          const end = kit.blob(0.035, 0.08, 0.02, 0xc83a3a, s * 0.035, 0.63, 0.31, 4, 3, 0);
          end.rotation.z = s * 0.35;
          this.body.add(end);
        }
      }
      this.head.position.set(0, 1.0, 0.1);
      this.body.add(this.head);
      this.head.add(kit.blob(0.23, 0.22, 0.23, (nx, ny, nz) => (wren ? (ny > 0.55 ? INK_LIGHT : nz > 0 && ny > 0.2 && ny < 0.5 && Math.abs(nx) > 0.25 ? 0xf0dcb8 : nz > 0.5 && ny < -0.2 ? BELLY : 0xc8905a) : ny > 0.4 ? INK : nz > 0.2 && ny < 0 && Math.abs(nx) > 0.35 ? 0xfadc70 : YEL), 0, 0, 0, 10, 8, 0.15));
      // The beak: a cone above, and a smaller one below that drops open.
      const upper = kit.cone(wren ? 0.045 : 0.07, wren ? 0.2 : 0.17, (_nx, ny) => (ny > 0.4 ? (wren ? 0xc89a20 : 0xb86a20) : BEAK), 5);
      upper.position.set(0, -0.015, 0.19);
      upper.rotation.x = Math.PI / 2;
      upper.scale.set(1, 1, 0.75);
      this.head.add(upper);
      this.jaw.position.set(0, -0.05, 0.19);
      const lower = kit.cone(wren ? 0.036 : 0.055, wren ? 0.15 : 0.13, wren ? 0xd8a830 : 0xc87428, 5);
      lower.rotation.x = Math.PI / 2;
      lower.scale.set(1, 1, 0.55);
      this.jaw.add(lower);
      this.head.add(this.jaw);
      // The tuft: three little feathers swept back.
      for (let k = 0; k < (wren ? 1 : 3); k++) {
        const f = kit.blob(wren ? 0.035 : 0.028, (wren ? 0.13 : 0.11) - k * 0.015, 0.04, wren ? 0xe06a8a : INK, wren ? -0.06 : 0, 0.27 - k * 0.02, -0.04 - k * 0.07, 4, 4, 0);
        f.rotation.x = -0.3 - k * 0.35;
        this.head.add(f);
      }
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x101010 });
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const s of [-1, 1]) {
        const eye = new THREE.Group();
        eye.position.set(s * 0.15, 0.035, 0.155);
        eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), eyeMat));
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.016, 4, 3), glintMat);
        glint.position.set(s * 0.02, 0.022, 0.03);
        eye.add(glint);
        this.head.add(eye);
        this.eyes.push(eye);
      }
    } else if (spec.kind === 'pigeon') {
      // Dizzy Dave the pigeon: a plump grey bird in shades and a gold chain, bobbing and shuffling to a beat only he can hear.
      const GREY = 0x8d93a0;
      this.root.add(this.body);
      this.root.scale.setScalar(1.3);
      this.body.add(painted(0.36, 0.34, 0.42, (_nx, ny, nz) => (ny > 0.5 && nz > 0.1 ? 0x2f8f6a : nz > 0.5 && ny > 0 ? 0xb06ac0 : GREY), 0, 0.62, 0, 9, 7));
      this.body.add(blob(0.3, 0.2, 0.22, 0xc9ccd6, 0, 0.5, 0.2, 7, 5)); // pale chest
      for (const s of [-1, 1]) {
        // A folded wing: darker than his body, with the two black bars every street pigeon wears, and dark tips.
        const wing = kit.blob(0.07, 0.24, 0.32, (_nx, _ny, nz) => (nz < -0.75 ? 0x2c303a : (nz > -0.5 && nz < -0.3) || (nz > -0.1 && nz < 0.08) ? 0x2c303a : 0x6a7080), s * 0.35, 0.62, -0.04, 12, 6, 0.2);
        wing.userData.side = s;
        this.wings.push(wing);
        this.body.add(wing);
        const foot = blob(0.05, 0.03, 0.06, 0xe08a9a, s * 0.12, 0.03, 0.05, 5, 4);
        for (let k = -1; k <= 1; k++) {
          const toe = kit.blob(0.02, 0.018, 0.08, 0xe08a9a, k * 0.045, 0, 0.08, 4, 3, 0);
          toe.rotation.y = k * 0.5;
          foot.add(toe);
        }
        foot.add(kit.blob(0.02, 0.018, 0.05, 0xe08a9a, 0, 0, -0.06, 4, 3, 0));
        this.feet.push(foot);
        this.root.add(foot);
        this.root.add(box(0.035, 0.28, 0.035, 0xe08a9a, s * 0.12, 0.2, 0.05));
      }
      const tail = kit.blob(0.15, 0.05, 0.3, (_nx, _ny, nz) => (nz < -0.75 ? 0x9aa0ac : nz < -0.3 ? 0x22252e : 0x4a4f5c), 0, 0.62, -0.5, 8, 5, 0.15);
      tail.rotation.x = -0.3;
      this.body.add(tail);
      // The gold chain goes all the way round his neck, with a medallion hanging at the front on a short chain that swings.
      // The chain is a tube laid right on the surface of his body: a closed loop round the neck that dips to a V at the front.
      // Each point is found from the body's own shape (an ellipsoid 0.36 x 0.34 x 0.42 centred at y 0.62), pushed out a little so it never sinks in.
      const loop: THREE.Vector3[] = [];
      for (let i = 0; i < 16; i++) {
        const th = (i / 16) * Math.PI * 2; // 0 = front (+z), pi = back
        const front = (1 + Math.cos(th)) / 2; // 1 at the front, 0 at the back
        const y = 0.9 - 0.14 * front * front;
        const f = Math.sqrt(Math.max(0.05, 1 - ((y - 0.62) / 0.34) ** 2));
        loop.push(new THREE.Vector3(Math.sin(th) * (0.36 * f + 0.03), y, Math.cos(th) * (0.42 * f + 0.03)));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 48, 0.022, 5, true);
      {
        const n = tube.attributes.position.count;
        const g = new THREE.Color(0xe8c040);
        const cols = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) cols.set([g.r, g.g, g.b], i * 3);
        tube.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      }
      this.body.add(new THREE.Mesh(tube, mat));
      // The medallion hangs from the bottom of the V (the front point of the loop).
      this.pendant.position.copy(loop[0]);
      this.body.add(this.pendant);
      for (let k = 0; k < 3; k++) this.pendant.add(box(0.03, 0.07, 0.03, 0xe8c040, 0, -0.04 - k * 0.06, 0));
      this.pendant.add(blob(0.09, 0.09, 0.025, 0xe8c040, 0, -0.27, 0.02, 7, 5));
      this.pendant.add(blob(0.04, 0.04, 0.03, 0xfff0a0, 0, -0.27, 0.035, 5, 4));
      this.head.position.set(0, 1.07, 0.22);
      this.body.add(this.head);
      this.head.add(painted(0.2, 0.2, 0.2, (_nx, ny) => (ny < -0.2 ? 0x2f8f6a : GREY), 0, 0, 0, 9, 7));
      this.head.add(blob(0.05, 0.04, 0.12, 0xe8e0d0, 0, -0.03, 0.27, 5, 4)); // beak
      this.head.add(blob(0.06, 0.03, 0.05, 0xf0f0f0, 0, 0.02, 0.2, 4, 3)); // cere
      for (const s of [-1, 1]) {
        this.head.add(box(0.13, 0.08, 0.04, 0x101014, s * 0.1, 0.06, 0.18)); // shades
        const gl = box(0.04, 0.025, 0.012, 0xffffff, s * 0.12, 0.08, 0.205);
        this.head.add(gl);
      }
      this.head.add(box(0.1, 0.02, 0.03, 0x101014, 0, 0.07, 0.19)); // bridge
    } else if (spec.kind === 'villain') {
      // Lord Grimsqueak has a model of his own (grimsqueakModel.ts): the gaunt king, hung in the air by the Engine's shard.
      this.grim = new GrimsqueakModel();
      this.root.add(this.grim.root);
    } else {
      // Pip the peddler: a small mouse in a blue cloak and a yellow scarf, under a pack much too big for him, with a
      // lantern on a pole in one paw. His other paw waves about when he talks; his ears, whiskers and tail are never still.
      // Mellow Mort is the same build with nothing to carry: a plump grey-lilac mouse in a baggy olive jumper with a
      // cream stripe, a slouching maroon hat, fluffy slippers, eyes that never get more than half open, and a mug of
      // something hot held in both paws. He nods along to Dave's beat, slowly.
      const mort = look === 'mort';
      const FUR = mort ? 0x9a8aa0 : 0xd8c8a8;
      const FUR_LIGHT = mort ? 0xc8bccc : 0xf0e8d0;
      const PINK = mort ? 0xc8a0b8 : 0xe8a8a0;
      const CLOAK = mort ? 0x6a7a3a : 0x3a5a8a;
      const TRIM = mort ? 0xe0d8b0 : 0x6a8ab8;
      const HAT = mort ? 0x8a3a4a : 0x4a8a3a;
      const HAT_DARK = mort ? 0x6a2a3a : 0x3a7030;
      if (mort) this.eyeOpen = 0.45;
      const LEATHER = 0x8a5a32;
      const STRAP = 0x4a3020;
      const GOLD = 0xe0b040;
      this.root.add(this.body);
      /** His body's shape (the peddler's): how far it reaches each way from its middle, and how high that is. */
      const BODY = { x: 0.3, y: 0.36, z: 0.28, at: 0.42 };
      const strapOn = (s: number): THREE.Mesh => {
        const on = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
        const at: THREE.Vector3[] = [];
        // Over the shoulder: an arc in a plane a little to one side of his middle, from his back to low on his front.
        const sx = s * 0.15;
        const k = Math.sqrt(1 - (sx / BODY.x) ** 2);
        for (const deg of [-78, -50, -20, 10, 40, 70, 96]) {
          const a = (deg * Math.PI) / 180;
          at.push(on(sx, BODY.at + BODY.y * k * Math.cos(a), BODY.z * k * Math.sin(a)));
        }
        // Under the arm: round his side at the height of his waist and back to the pack.
        const y = BODY.at - 0.07;
        const f = Math.sqrt(1 - ((y - BODY.at) / BODY.y) ** 2);
        for (const deg of [48, 78, 108, 136]) {
          const a = (deg * Math.PI) / 180;
          at.push(on(s * BODY.x * f * Math.sin(a), y, BODY.z * f * Math.cos(a)));
        }
        const curve = new THREE.CatmullRomCurve3(at);
        const N = 26;
        const HALF = 0.026;
        const pos: number[] = [];
        const col: number[] = [];
        const uvs: number[] = [];
        const dark = new THREE.Color(STRAP);
        const edge = new THREE.Color(STRAP).multiplyScalar(1.5);
        const ring: Array<[THREE.Vector3, THREE.Vector3]> = [];
        for (let i = 0; i <= N; i++) {
          const p = curve.getPoint(i / N);
          const t = curve.getTangent(i / N);
          // (Which way is out of him, here.)
          const out = new THREE.Vector3(p.x / BODY.x ** 2, (p.y - BODY.at) / BODY.y ** 2, p.z / BODY.z ** 2).normalize();
          const across = new THREE.Vector3().crossVectors(t, out).normalize().multiplyScalar(HALF);
          const mid = p.clone().addScaledVector(out, 0.014);
          ring.push([mid.clone().sub(across), mid.clone().add(across)]);
        }
        for (let i = 0; i < N; i++) {
          const [a0, a1] = ring[i];
          const [b0, b1] = ring[i + 1];
          for (const [v, c, u] of [[a0, edge, 0], [a1, dark, 1], [b0, edge, 0], [a1, dark, 1], [b1, dark, 1], [b0, edge, 0]] as Array<[THREE.Vector3, THREE.Color, number]>) {
            pos.push(v.x, v.y, v.z);
            col.push(c.r, c.g, c.b);
            uvs.push(u, i / N);
          }
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, strapMat);
        m.name = 'strap';
        return m;
      };
      // Body: the cloak, open down the front over a cream belly, with a paler hem.
      this.body.add(mort
        ? kit.blob(0.34, 0.36, 0.31, (_nx, ny) => (ny < -0.72 ? 0x566430 : ny > -0.1 && ny < 0.2 ? TRIM : CLOAK), 0, 0.42, 0, 10, 9, 0.3)
        : kit.blob(0.3, 0.36, 0.28, (nx, ny, nz) => (nz > 0.35 && Math.abs(nx) < 0.55 && ny < 0.6 ? FUR_LIGHT : ny < -0.72 ? TRIM : CLOAK), 0, 0.42, 0, 10, 8, 0.3));
      for (const s of [-1, 1]) {
        // Mort is in slippers. Pip is in SHOES: stout brown ones with a dark sole. (He had bare pink feet with three
        // toes each stuck on in front of them: the owner, 2026-11-16: "mouse toes are kind of weird, need fixed, maybe
        // just shoes?")
        const foot = mort
          ? kit.blob(0.12, 0.075, 0.16, 0x4a9a9a, s * 0.14, 0.05, 0.08, 6, 4, 0.2)
          : kit.blob(0.105, 0.07, 0.17, (_nx, ny, nz) => (ny < -0.45 ? 0x33200f : nz > 0.55 && ny < 0.3 ? 0x5e3a1c : 0x7a4e2a), s * 0.14, 0.062, 0.085, 7, 5, 0.25);
        foot.rotation.y = s * 0.25;
        this.body.add(foot);
        if (mort) {
          // Slippers, with a fluffy cuff.
          this.body.add(kit.blob(0.085, 0.045, 0.07, 0xe8e0d0, s * 0.13, 0.11, 0.02, 6, 4, 0.1));
          continue;
        }
        // The pack's straps. (The owner, 2026-11-16: "backpack straps are pretty messed up on mouse". They were two
        // stiff boxes stood off his front, ending in the air and never meeting the pack.) Each is a band LAID ON HIM:
        // from the top of the pack up over his shoulder, down his front, round under his arm and back to the pack's
        // lower corner. Every point of it is found on his body's own shape and lifted a hair off it.
        this.body.add(strapOn(s));
      }
      if (mort) {
        // The jumper's thick rolled neck.
        this.body.add(kit.blob(0.2, 0.07, 0.19, (_nx, ny) => (ny > 0.2 ? 0x7a8a46 : 0x566430), 0, 0.73, 0.02, 9, 4, 0.1));
      } else {
        // The scarf: a yellow roll round his neck with one end hanging.
        this.body.add(kit.blob(0.22, 0.07, 0.2, (_nx, ny) => (ny > 0.2 ? 0xe8bc48 : 0xc89a30), 0, 0.72, 0.02, 9, 4, 0.1));
        const scarfEnd = kit.blob(0.05, 0.11, 0.025, 0xc89a30, -0.1, 0.6, 0.21, 4, 4, 0);
        scarfEnd.rotation.z = 0.25;
        this.body.add(scarfEnd);
        // The pack: a huge leather box with a flap and buckles, a bedroll on top, a pot and a ladle hanging off it,
        // and a rolled map poking out.
        const pack = new THREE.Group();
        pack.position.set(0, 0.62, -0.36);
        // (Its corners are ROUNDED: a soft leather bag, not a crate. The owner, 2026-11-16: "corners of backpack
        // could be rounded more as well.")
        pack.add(rounded(0.62, 0.6, 0.4, 0.11, (_nx, ny) => (ny < -0.6 ? 0x6e4626 : LEATHER), 0, 0, 0));
        pack.add(rounded(0.66, 0.2, 0.44, 0.07, 0xa06c3c, 0, 0.22, 0)); // the flap
        for (const s of [-1, 1]) {
          // (The flap's two straps and buckles, on the OUTSIDE of the pack: they were on the side against his back.)
          pack.add(box(0.06, 0.34, 0.02, STRAP, s * 0.16, 0.0, -0.215));
          pack.add(box(0.08, 0.06, 0.03, GOLD, s * 0.16, 0.1, -0.225));
          pack.add(rounded(0.2, 0.22, 0.1, 0.04, 0x7a4e2a, s * 0.36, -0.12, 0)); // side pockets
        }
        const roll = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.16, 0.16, 0.76, 8, 10), (_nx, ny) => (Math.abs(ny) > 0.95 ? 0xe8d8b0 : Math.abs(ny) > 0.5 && Math.abs(ny) < 0.7 ? STRAP : 0xb84a3a)), mat);
        roll.rotation.z = Math.PI / 2;
        roll.position.set(0, 0.42, 0);
        pack.add(roll);
        const map = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6, 4), (_nx, ny) => (ny > 0.7 ? 0xb84a3a : 0xe8dcb8)), mat);
        map.position.set(-0.2, 0.36, -0.12);
        map.rotation.z = 0.25;
        pack.add(map);
        this.pot.position.set(0.37, 0.02, -0.02);
        this.pot.add(kit.blob(0.12, 0.1, 0.12, (_nx, ny) => (ny > 0.6 ? 0x2a2a30 : 0x5a5a62), 0, -0.14, 0, 7, 5, 0.3));
        this.pot.add(box(0.02, 0.1, 0.02, 0x3a3a40, 0, -0.03, 0));
        pack.add(this.pot);
        this.body.add(pack);
      }
      // The tail: pink, curling out from under the pack. It sways.
      this.tail.position.set(0, 0.1, -0.15);
      {
        const curve = new THREE.CatmullRomCurve3([[0, 0, 0], [-0.2, -0.05, -0.12], [-0.42, -0.06, -0.1], [-0.58, -0.03, 0.05], [-0.63, 0.06, 0.22], [-0.55, 0.16, 0.3]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
        const SEG = 12;
        const SIDES = 5;
        const tube = new THREE.TubeGeometry(curve, SEG, 0.036, SIDES, false);
        // Taper it to a point: pull each ring in towards the middle of the tail.
        const pos = tube.attributes.position;
        const mid = new THREE.Vector3();
        for (let i = 0; i <= SEG; i++) {
          curve.getPointAt(i / SEG, mid);
          const k = 1 - 0.8 * (i / SEG);
          for (let j = 0; j <= SIDES; j++) {
            const n = i * (SIDES + 1) + j;
            pos.setXYZ(n, mid.x + (pos.getX(n) - mid.x) * k, mid.y + (pos.getY(n) - mid.y) * k, mid.z + (pos.getZ(n) - mid.z) * k);
          }
        }
        this.tail.add(new THREE.Mesh(paint(tube, (nx) => (Math.floor((nx + 1) * 7) % 2 ? (mort ? 0xb890a8 : 0xd89890) : PINK)), mat));
      }
      this.body.add(this.tail);

      // Head: round, paler round the muzzle, big pink-lined ears, bright eyes, whiskers, two front teeth, a floppy green cap.
      this.head.position.set(0, 0.86, 0.04);
      this.body.add(this.head);
      this.head.add(kit.blob(0.24, 0.22, 0.24, (nx, ny, nz) => (nz > 0.45 && ny < 0.1 ? FUR_LIGHT : Math.abs(nx) > 0.5 && ny < -0.1 && nz > 0 ? (mort ? 0xb0a2b6 : 0xe4d6b8) : FUR), 0, 0, 0, 10, 8, 0.2));
      const muzzle = new THREE.Group();
      muzzle.position.set(0, -0.05, 0.2);
      muzzle.add(kit.blob(0.105, 0.085, 0.12, FUR_LIGHT, 0, 0, 0, 7, 5, 0.15));
      muzzle.add(kit.blob(0.042, 0.036, 0.04, mort ? 0x7a5a70 : 0xe87a8a, 0, 0.015, 0.12, 5, 4, 0));
      muzzle.add(box(0.045, 0.04, 0.02, 0xfaf4e4, 0, -0.07, 0.085)); // teeth
      for (const s of [-1, 1]) {
        for (let w = 0; w < 3; w++) {
          const whisk = box(0.2, 0.008, 0.008, 0xf4f0e4, s * 0.15, -0.01 - w * 0.022, 0.06);
          whisk.rotation.y = -s * (0.15 + w * 0.1);
          whisk.rotation.z = s * (0.18 - w * 0.2);
          muzzle.add(whisk);
        }
      }
      this.muzzle = muzzle;
      this.head.add(muzzle);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x101010 });
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const s of [-1, 1]) {
        const ear = new THREE.Group();
        ear.position.set(s * 0.2, 0.12, -0.02);
        ear.add(kit.blob(0.15, 0.15, 0.04, FUR, s * 0.06, 0.08, 0, 8, 5, 0.1));
        ear.add(kit.blob(0.1, 0.1, 0.03, (_nx, ny) => (ny < -0.3 ? (mort ? 0xb088a0 : 0xd08880) : PINK), s * 0.06, 0.08, 0.025, 7, 4, 0));
        ear.userData.side = s;
        this.ears.push(ear);
        this.head.add(ear);
        const eye = new THREE.Group();
        eye.position.set(s * 0.1, 0.045, 0.195);
        eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), eyeMat));
        const glint = new THREE.Mesh(new THREE.SphereGeometry(0.014, 4, 3), glintMat);
        glint.position.set(s * 0.012, 0.018, 0.034);
        eye.add(glint);
        this.head.add(eye);
        this.eyes.push(eye);
        const brow = kit.blob(0.045, 0.012, 0.02, mort ? 0x7a6a80 : 0xb8a888, s * 0.1, mort ? 0.1 : 0.11, 0.2, 4, 3, 0);
        brow.rotation.z = s * (mort ? -0.3 : 0.25); // Mort's slope down and out: sleepy
        this.head.add(brow);
        if (mort) {
          // A heavy lid over the top of each eye, and a shadow under it.
          const lid = kit.blob(0.05, 0.03, 0.035, 0x8a7a90, s * 0.1, 0.07, 0.198, 5, 3, 0);
          lid.rotation.z = -s * 0.2;
          this.head.add(lid);
          this.head.add(kit.blob(0.04, 0.012, 0.02, 0x7a6a80, s * 0.1, 0.012, 0.212, 4, 3, 0));
        }
      }
      // The cap: a green band with a brim, and a floppy tip with a yellow bobble on the end.
      this.head.add(kit.blob(0.21, 0.1, 0.21, (_nx, ny) => (ny < -0.4 ? (mort ? TRIM : HAT_DARK) : HAT), 0, 0.19, -0.02, 9, 4, 0.1));
      this.capTip.position.set(0.06, 0.25, -0.06);
      this.capTip.add(kit.blob(0.09, 0.08, 0.1, HAT, 0.05, 0.02, -0.04, 6, 4, 0.1));
      this.capTip.add(kit.blob(0.06, 0.055, 0.07, HAT_DARK, 0.12, -0.02, -0.11, 5, 4, 0));
      this.capTip.add(kit.blob(0.04, 0.04, 0.04, mort ? TRIM : GOLD, 0.16, -0.07, -0.16, 5, 4, 0));
      this.head.add(this.capTip);

      // Arms: blue sleeves and pink paws. The right one holds the pole; the left one hangs free and does the talking.
      for (const s of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(s * 0.24, 0.62, 0.04);
        arm.add(kit.blob(mort ? 0.085 : 0.075, 0.15, mort ? 0.09 : 0.08, (_nx, ny) => (ny < -0.7 ? TRIM : CLOAK), 0, -0.11, 0, 6, 5, 0.2));
        arm.add(kit.blob(0.055, 0.05, 0.055, PINK, 0, -0.26, 0.01, 5, 4, 0));
        arm.userData.side = s;
        this.arms.push(arm);
        this.body.add(arm);
      }
      if (mort) {
        // The mug, held in both paws in front of his belly: blue enamel, a handle, something dark in it.
        this.mug.position.set(0, 0.53, 0.33);
        const cup = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.075, 0.065, 0.13, 8, 3), (_nx, ny) => (ny > 0.6 ? 0xf0f0f0 : 0x4a7ab0)), mat);
        this.mug.add(cup);
        const tea = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.062, 0.062, 0.01, 8), 0x5a3420), mat);
        tea.position.y = 0.062;
        this.mug.add(tea);
        const handle = new THREE.Mesh(paint(new THREE.TorusGeometry(0.04, 0.014, 4, 6, Math.PI), 0x4a7ab0), mat);
        handle.position.set(0.075, 0, 0);
        handle.rotation.z = -Math.PI / 2;
        this.mug.add(handle);
        // Three wisps of steam that rise and fade, one after the other.
        for (let k = 0; k < 3; k++) {
          const wisp = new THREE.Mesh(new THREE.OctahedronGeometry(0.028, 0), new THREE.MeshBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.5, depthWrite: false }));
          wisp.userData.k = k;
          this.mug.add(wisp);
          this.wisps.push(wisp);
        }
        this.body.add(this.mug);
      } else {
        // Lantern on a pole in his right paw: an iron cage with a glowing pane, swinging from a hook.
        this.body.add(box(0.04, 1.34, 0.04, 0x5a4028, 0.38, 0.67, 0.2));
        this.body.add(kit.blob(0.035, 0.03, 0.035, 0x3a2a1c, 0.38, 1.35, 0.2, 5, 4, 0));
        this.body.add(box(0.03, 0.03, 0.16, 0x5a4028, 0.38, 1.3, 0.27));
        this.lantern.position.set(0.38, 1.3, 0.34);
        this.body.add(this.lantern);
        this.lantern.add(box(0.015, 0.06, 0.015, 0x3a3a40, 0, -0.03, 0));
        const glow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.12), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
        glow.position.set(0, -0.16, 0);
        this.lantern.add(glow);
        this.lanternGlow = glow;
        this.lantern.add(kit.cone(0.11, 0.07, 0x3a3a40, 4).translateY(-0.085));
        this.lantern.add(box(0.16, 0.03, 0.16, 0x3a3a40, 0, -0.245, 0));
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.lantern.add(box(0.018, 0.16, 0.018, 0x3a3a40, x * 0.065, -0.16, z * 0.065));
      }
    }
    // A soft shadow (a floating head casts a wider, fainter one).
    // (Not one who is a creature from elsewhere: an ant or a stag brings its own, and two lay one on the other, twice as dark.)
    if (!this.ant && !this.stag) {
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), lyingOn(new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      this.root.add(shadow);
    }
    // The marker over his head: a small gold diamond, shown when the rat is near.
    this.marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    this.marker.position.set(0, spec.kind === 'villain' ? VILLAIN_FLOAT + GRIM_HEIGHT + 0.35 : this.markerY(), 0);
    this.marker.visible = false;
    this.root.add(this.marker);

    this.root.position.set(spec.x, spec.y ?? 0, spec.z);
    this.gone = !!spec.hidden;
    this.root.visible = !this.gone;
    this.root.rotation.y = spec.facing;
    this.look = spec.facing;
  }

  /** One of the Club's regulars (a turtle or a fox), or an ant off duty. */
  private patron: PatronBody | null = null;
  private ant: AntModel | null = null;
  private stag: StagModel | null = null;
  private headYaw = 0;
  /** How high the marker hangs over him. */
  private markerY(): number {
    if (this.patron) return this.patron.height + 0.4 - (this.spec.seated ? 0.12 : 0);
    return this.stag ? 2.75 : this.ant ? 1.95 : 1.75;
  }

  /** The villain only: a white flash (the sword has landed). */
  flash(): void {
    this.grim?.flash();
  }

  /** A syllable was spoken: his mouth snaps open. */
  pulse(): void {
    this.mouth = 1;
  }

  /** Whether the rat at (px, py, pz) can talk to him. */
  inRange(px: number, py: number, pz: number): boolean {
    if (this.gone || this.spec.lines.length === 0) return false;
    return Math.hypot(px - this.spec.x, pz - this.spec.z) < TALK_RANGE && Math.abs(py - (this.spec.y ?? 0)) < 1.2;
  }

  /** A story scene's direction: somewhere to look instead of at the rat, and how far into a shrug he is (0..1). */
  act: NpcAct | null = null;
  /**
   * A cutscene's strings (cutscene/stage.ts): while this is set he is a marionette. His body faces exactly where
   * it says, his head is turned and nodded as it says, and he "talks" (bobs, moves his paws) when it says. Where he
   * is, what he is doing and whether he sits are his `spec`, which the stage also sets.
   */
  puppet: { facing: number; headYaw: number; nod: number; talking: boolean } | null = null;
  /** Whether his own head takes a nod (a turtle's, a fox's, a mouse's): if not, the stage tips his whole body a little instead. */
  get nods(): boolean {
    return !this.grim && !this.ant && !this.stag;
  }
  /** The villain's own model. */
  private grim: GrimsqueakModel | null = null;
  /** Time that keeps running even when he is standing still (his light does not stop). */
  private clock = 0;
  private shrug = 0;
  /** Out of the room (a story scene has taken him away, or has not brought him in yet). It lasts after the scene. */
  gone = false;
  /** What a scene last left him doing; it lasts after the scene too. */
  private pose: { still: boolean; low: number; bow: number; reach: number; gesture: GrimGesture; float: number } = { still: false, low: 0, bow: 0, reach: 0, gesture: 'rest', float: VILLAIN_FLOAT };
  private poseNow = { low: 0, bow: 0, reach: 0 };

  /** A blink every few seconds. */
  private blinkEyes(dt: number): void {
    if (this.eyes.length === 0) return;
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkIn = 1.5 + Math.random() * 3.5;
      this.blink = this.eyeOpen < 1 ? 0.4 : 0.13; // a sleepy blink is a long one
    }
    this.blink = Math.max(0, this.blink - dt);
    for (const e of this.eyes) e.scale.y = this.blink > 0 ? 0.12 : this.eyeOpen;
  }

  /** Puts him somewhere else in the room. */
  moveTo(x: number, y: number, z: number): void {
    this.spec.x = x;
    this.spec.y = y;
    this.spec.z = z;
    this.root.position.set(x, y, z);
  }

  /** Standing on the ground, quiet: how Grimsqueak is left at the end of the story. */
  rest(): void {
    this.gone = false;
    this.pose = { ...this.pose, still: true, low: 1, bow: 0, reach: 1, gesture: 'rest' };
  }

  update(dt: number, px: number, py: number, pz: number, talking: boolean): void {
    const strings = this.puppet;
    this.step(dt, px, py, pz, talking || !!strings?.talking);
    if (!strings) return;
    this.marker.visible = false;
    // (A patron's head has been nodded inside its own update; a mouse's, a bird's or the pigeon's is nodded here.)
    if (!this.patron && this.nods) this.head.rotation.x += strings.nod;
  }

  private step(dt: number, px: number, py: number, pz: number, talking: boolean): void {
    const a = this.act;
    if (a) {
      if (a.pos) this.moveTo(a.pos[0], a.pos[1], a.pos[2]);
      if (a.gone !== undefined) this.gone = a.gone;
      this.pose = { still: a.still ?? this.pose.still, low: a.low ?? this.pose.low, bow: a.bow ?? this.pose.bow, reach: a.reach ?? this.pose.reach, gesture: a.gesture ?? this.pose.gesture, float: a.float ?? this.pose.float };
    }
    this.root.visible = !this.gone;
    // Standing still, he stops swaying, dancing or bobbing: the clock his motion runs on stops.
    if (!this.pose.still) this.time += dt;
    this.clock += dt;
    const ease = Math.min(1, dt * 5);
    this.poseNow.low += (this.pose.low - this.poseNow.low) * ease;
    this.poseNow.bow += (this.pose.bow - this.poseNow.bow) * ease;
    this.poseNow.reach += (this.pose.reach - this.poseNow.reach) * ease;
    this.shrug += ((this.act?.shrug ?? 0) - this.shrug) * Math.min(1, dt * 10);
    this.near = this.inRange(px, py, pz);
    const close = talking || Math.hypot(px - this.spec.x, pz - this.spec.z) < 6;
    // One who is busy (at a table, against a wall) keeps his body where it is and turns only his head: to the rat
    // when he is near or talking, otherwise to whoever is across the table.
    const busy = !!this.spec.doing && this.spec.doing !== 'stand';
    const toRat = Math.atan2(px - this.spec.x, pz - this.spec.z);
    const want = this.act?.lookAt ? Math.atan2(this.act.lookAt[0] - this.spec.x, this.act.lookAt[1] - this.spec.z) : busy ? this.spec.facing : close ? toRat : this.spec.facing;
    const d = Math.atan2(Math.sin(want - this.look), Math.cos(want - this.look));
    this.look += d * Math.min(1, dt * 5);
    this.root.rotation.y = this.look;
    {
      const nearRat = talking || Math.hypot(px - this.spec.x, pz - this.spec.z) < 3.2;
      const at = nearRat ? toRat : this.spec.partner ? Math.atan2(this.spec.partner[0] - this.spec.x, this.spec.partner[1] - this.spec.z) : this.look;
      const turn = Math.atan2(Math.sin(at - this.look), Math.cos(at - this.look));
      this.headYaw += (Math.max(-1.25, Math.min(1.25, turn)) - this.headYaw) * Math.min(1, dt * 6);
    }
    if (this.puppet) {
      this.look = this.puppet.facing;
      this.root.rotation.y = this.look;
      this.headYaw = this.puppet.headYaw;
    }
    this.talkBob += ((talking ? 1 : 0) - this.talkBob) * Math.min(1, dt * 8);
    this.mouth = Math.max(0, this.mouth - dt * 7);
    if (this.grim) {
      // He floats and sways by himself; a scene (or the fight) says how low he hangs, how far his head is bowed, and
      // what his arms are doing.
      this.grim.update(dt, {
        low: this.poseNow.low, float: this.pose.float, bow: this.poseNow.bow, still: this.pose.still, talking, mouth: this.mouth,
        gesture: this.pose.gesture, reach: this.poseNow.reach,
      });
      this.marker.visible = this.near && !talking;
      this.marker.position.y = this.pose.float * (1 - this.poseNow.low) + GRIM_HEIGHT + 0.35 + 0.08 * Math.sin(this.time * 4);
      this.marker.rotation.y = this.time * 2.5;
      return;
    }
    if (this.patron) {
      this.patron.update(dt, { time: this.time, talking, mouth: this.mouth, headYaw: this.headYaw, doing: this.spec.doing ?? 'stand', seated: !!this.spec.seated, turn: this.spec.turn ?? 0, nod: this.puppet?.nod });
      this.marker.visible = this.near && !talking;
      this.marker.position.y = this.markerY() + 0.08 * Math.sin(this.time * 4);
      this.marker.rotation.y = this.time * 2.5;
      return;
    }
    if (this.ant) {
      // Standing easy, as it stands at its post, feelers going; its head comes round to whoever speaks to it.
      // (And it drinks: the thimble comes up to its jaws every so often, unless it is being spoken to.)
      const u = this.time % 7.5;
      const sip = !talking && this.spec.doing === 'drink' && u < 2.4 ? Math.sin((u / 2.4) * Math.PI) ** 2 : 0;
      this.ant.update(dt, { state: 'idle', stateTime: this.time, walking: 0, tip: ANT_NO_TIP, level: false, windupTime: 1, sip, look: this.headYaw });
      this.marker.visible = this.near && !talking;
      this.marker.position.y = this.markerY() + 0.08 * Math.sin(this.time * 4);
      this.marker.rotation.y = this.time * 2.5;
      return;
    }
    if (this.stag) {
      this.stag.update(dt, { state: 'idle', stateTime: this.time, walking: 0 });
      this.marker.visible = this.near && !talking;
      this.marker.position.y = this.markerY() + 0.08 * Math.sin(this.time * 4);
      this.marker.rotation.y = this.time * 2.5;
      return;
    }
    if (this.spec.kind === 'pigeon') {
      // A steady beat: the head pecks forward on every beat, the body dips and sways, the feet shuffle. Talking makes it wilder.
      const beat = this.time * Math.PI * 2 * 2.1;
      const amp = 1 + 0.6 * this.talkBob;
      const pk = Math.max(0, Math.sin(beat));
      this.head.position.z = 0.22 + 0.16 * pk * amp;
      this.head.position.y = 1.07 - 0.04 * this.mouth + 0.02 * Math.sin(beat * 2);
      this.head.rotation.x = 0.35 * this.mouth;
      this.head.rotation.z = 0.1 * Math.sin(beat / 2);
      this.body.position.y = 0.04 * Math.abs(Math.sin(beat)) * amp;
      this.body.position.x = 0.1 * Math.sin(beat / 2) * amp;
      this.body.rotation.y = 0.18 * Math.sin(beat / 2) * amp;
      this.body.rotation.z = 0.06 * Math.sin(beat / 2);
      this.feet.forEach((f, i) => {
        f.position.x = (i ? 1 : -1) * 0.12 + 0.06 * Math.sin(beat / 2 + i * Math.PI);
        f.position.y = 0.03 + 0.05 * Math.max(0, Math.sin(beat / 2 + i * Math.PI));
      });
      for (const w of this.wings) w.rotation.z = (w.userData.side as number) * (0.1 + 0.2 * Math.max(0, Math.sin(beat)) * amp);
      // The medallion is a damped pendulum shaken by how fast his body is moving up and down and side to side.
      {
        const q = this.pend;
        const step = Math.max(dt, 1e-3);
        if (this.time < 0.05 || q.prevY === 0) {
          q.prevY = this.body.position.y || 1e-6;
          q.prevX = this.body.position.x;
        }
        const ay = ((this.body.position.y - q.prevY) / step - q.vy) / step;
        const ax = ((this.body.position.x - q.prevX) / step - q.vxBody) / step;
        q.vy = (this.body.position.y - q.prevY) / step;
        q.vxBody = (this.body.position.x - q.prevX) / step;
        q.prevY = this.body.position.y;
        q.prevX = this.body.position.x;
        const k = 60;
        const c = 4.5;
        const h = Math.min(dt, 0.02);
        for (let i = 0; i < Math.max(1, Math.round(dt / h)); i++) {
          // Forward/back swing is pushed by bounce, sideways swing by sway.
          q.vx += (-k * q.ax - c * q.vx - Math.max(-40, Math.min(40, ay)) * 1.2) * h;
          q.vz += (-k * q.az - c * q.vz - Math.max(-40, Math.min(40, ax)) * 2.5) * h;
          q.ax = Math.max(-1.1, Math.min(1.1, q.ax + q.vx * h));
          q.az = Math.max(-0.5, Math.min(0.5, q.az + q.vz * h));
        }
        this.pendant.rotation.x = -0.08 + Math.max(-0.45, Math.min(0.1, q.ax)); // rests against his chest
        this.pendant.rotation.z = q.az;
      }
      this.marker.visible = this.near && !talking;
      this.marker.position.y = 1.85 + 0.08 * Math.sin(this.time * 4);
      this.marker.rotation.y = this.time * 2.5;
      return;
    }
    this.body.position.y = 0.025 * Math.sin(this.time * 2.2) + 0.03 * this.talkBob * Math.abs(Math.sin(this.time * 9));
    this.blinkEyes(dt);
    if (this.spec.kind === 'bird') {
      // A bird never holds still: his head snaps to a new tilt every second or so, his tail flicks, his beak opens on each syllable.
      this.tilt.in -= this.pose.still ? 0 : dt;
      if (this.tilt.in <= 0) {
        this.tilt = { in: 0.6 + Math.random() * 1.4, z: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.6 };
      }
      const snap = Math.min(1, dt * 30);
      this.head.rotation.z += (this.tilt.z + 0.32 * this.shrug - this.head.rotation.z) * snap;
      this.head.rotation.y += ((talking ? 0 : this.tilt.y) - this.head.rotation.y) * snap;
      this.head.rotation.x = (talking ? 0.1 * Math.sin(this.time * 9) : 0) - 0.12 * this.mouth + 0.12 * this.shrug;
      this.jaw.rotation.x = 0.6 * this.mouth;
      this.tail.rotation.x = this.tailRest + 0.25 * Math.max(0, Math.sin(this.time * 2.3)) ** 6 + 0.2 * this.talkBob * Math.abs(Math.sin(this.time * 9));
      for (const w of this.wings) w.rotation.z = (w.userData.side as number) * (0.06 + (talking ? 0.35 * Math.abs(Math.sin(this.time * 14)) : 0.04 * Math.sin(this.time * 2)) + 0.75 * this.shrug);
    } else {
      // The mouse: head nodding along, ears twitching one at a time, nose and whiskers working, tail and pot swinging.
      this.head.rotation.z = 0.08 * Math.sin(this.time * 1.3) + 0.32 * this.shrug;
      this.head.rotation.x = (talking ? 0.1 * Math.sin(this.time * 9) : 0) + 0.12 * this.shrug;
      this.ears.forEach((e, i) => {
        const flick = Math.max(0, Math.sin(this.time * 1.9 + i * 2.4)) ** 12;
        e.rotation.z = (e.userData.side as number) * (-0.35 * flick - 0.25 * this.shrug);
      });
      if (this.muzzle) this.muzzle.rotation.x = 0.06 * Math.sin(this.time * 11) * (0.4 + 0.6 * this.talkBob) + 0.12 * this.mouth;
      this.tail.rotation.y = 0.25 * Math.sin(this.time * 1.6);
      this.tail.rotation.z = 0.08 * Math.sin(this.time * 2.3);
      this.pot.rotation.z = 0.12 * Math.sin(this.time * 2.2 + 1) * (1 + this.talkBob);
      this.capTip.rotation.z = 0.1 * Math.sin(this.time * 2.2 + 0.5) + 0.3 * this.talkBob * Math.sin(this.time * 9);
      this.lantern.rotation.z = 0.15 * Math.sin(this.time * 1.7);
      // The lamp flickers a little.
      if (this.lanternGlow) (this.lanternGlow.material as THREE.MeshBasicMaterial).color.setHex(0xffe08a).multiplyScalar(0.9 + 0.1 * Math.sin(this.clock * 13) * Math.sin(this.clock * 7.3));
      if (this.who === 'mort') {
        // Mort: a slow nod on the beat, ears drooping, both paws round his mug (he lifts it a little when he talks).
        const beat = this.time * Math.PI * 2 * 1.05;
        this.head.rotation.x += 0.1 + 0.09 * Math.max(0, Math.sin(beat)) ** 2;
        for (const e of this.ears) e.rotation.z += (e.userData.side as number) * 0.3;
        const lift = 0.06 * this.talkBob + 0.012 * Math.sin(this.time * 2.2);
        this.mug.position.y = 0.53 + lift;
        this.mug.rotation.x = -0.25 * this.talkBob * Math.max(0, Math.sin(this.time * 1.7));
        for (const w of this.wisps) {
          const u = (this.clock * 0.55 + (w.userData.k as number) / 3) % 1;
          w.position.set(0.03 * Math.sin(u * 9 + (w.userData.k as number) * 2), 0.09 + u * 0.3, 0.02 * Math.cos(u * 7));
          w.scale.setScalar(0.6 + u * 1.2);
          (w.material as THREE.MeshBasicMaterial).opacity = 0.5 * Math.sin(u * Math.PI);
        }
      }
      for (const arm of this.arms) {
        const sd = arm.userData.side as number;
        if (this.who === 'mort') {
          arm.rotation.set(-1.15 - 0.2 * this.talkBob - 0.3 * this.shrug, 0, sd * (-1.0 + 1.3 * this.shrug));
        } else if (sd > 0) {
          // The right paw stays on the pole.
          arm.rotation.set(-0.75, 0, 0.5);
        } else {
          // The left one waves as he talks, and goes out wide in a shrug.
          const wave = this.talkBob * (0.5 + 0.35 * Math.sin(this.time * 6));
          arm.rotation.set(-0.9 * wave - 0.3 * this.shrug, 0, -(0.18 + 0.25 * wave + 0.9 * this.shrug) + 0.03 * Math.sin(this.time * 2.2));
        }
      }
    }
    // A shrug: up on his toes (the head and arms do the rest above).
    this.body.position.y += 0.07 * this.shrug;
    this.marker.visible = this.near && !talking;
    this.marker.position.y = 1.75 + 0.08 * Math.sin(this.time * 4);
    this.marker.rotation.y = this.time * 2.5;
  }
}
