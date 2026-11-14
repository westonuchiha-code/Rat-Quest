import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';

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
}

export type NpcKind = 'mouse' | 'bird' | 'villain' | 'pigeon';

export const TALK_RANGE = 2.2;

/**
 * Pip the peddler: a small mouse with a pack much too big for him and a lantern on a pole.
 * He bobs on the spot, turns to look at the rat when he comes near, and a little marker hops over his head
 * when he has something to say. Later he can open a shop; for now he gives hints.
 */
/** How high the villain's head rides when he floats, and how far he comes down to stand with his hem on the ground. */
const VILLAIN_FLOAT = 2.0;
const VILLAIN_DROP = 0.6;
/** Where his paws ride, below his head. */
const HAND_Y = -0.78;

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
  /** Dave's medallion: a pivot that swings like a pendulum as he bounces and sways. */
  private readonly pendant = new THREE.Group();
  private pend = { ax: 0, vx: 0, az: 0, vz: 0, prevY: 0, prevX: 0, vy: 0, vxBody: 0 };
  /** True once he has started an auto conversation. */
  autoDone = false;
  /** True while the rat is close enough to talk. */
  near = false;

  constructor(readonly spec: NpcSpec) {
    const mat = createPs1Material({ lit: true });
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
    if (spec.kind === 'bird') {
      // Finch the goldfinch: a round yellow bird with black wings, a red neckerchief and a tuft on his head.
      const YEL = 0xf2c230;
      this.root.add(this.body);
      this.body.add(painted(0.3, 0.3, 0.34, (nx, ny, nz) => (nz > 0.3 && ny < 0.45 && Math.abs(nx) < 0.75 ? 0xfff0b0 : YEL), 0, 0.5, 0));
      for (const s of [-1, 1]) {
        const wing = blob(0.06, 0.2, 0.26, 0x2e2e34, s * 0.3, 0.52, -0.02);
        wing.userData.side = s;
        this.wings.push(wing);
        this.body.add(wing);
        this.body.add(box(0.03, 0.26, 0.03, 0xe88a30, s * 0.09, 0.13, 0.02));
        this.body.add(blob(0.07, 0.03, 0.11, 0xe88a30, s * 0.09, 0.02, 0.07, 5, 4));
      }
      const tail = blob(0.09, 0.05, 0.26, 0x2e2e34, 0, 0.5, -0.42);
      tail.rotation.x = -0.35;
      this.body.add(tail);
      this.body.add(blob(0.27, 0.07, 0.26, 0xc83a3a, 0, 0.74, 0.06, 8, 4));
      this.head.position.set(0, 1.0, 0.1);
      this.body.add(this.head);
      this.head.add(painted(0.23, 0.22, 0.23, (_nx, ny) => (ny > 0.4 ? 0x2e2e34 : YEL), 0, 0, 0, 10, 8));
      this.head.add(blob(0.07, 0.06, 0.12, 0xe88a30, 0, -0.03, 0.3, 5, 4));
      this.head.add(blob(0.03, 0.13, 0.04, 0x2e2e34, 0, 0.3, -0.08, 4, 4));
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), new THREE.MeshBasicMaterial({ color: 0x101010 }));
        eye.position.set(s * 0.11, 0.03, 0.225);
        this.head.add(eye);
      }
    } else if (spec.kind === 'pigeon') {
      // Dizzy Dave the pigeon: a plump grey bird in shades and a gold chain, bobbing and shuffling to a beat only he can hear.
      const GREY = 0x8d93a0;
      this.root.add(this.body);
      this.root.scale.setScalar(1.3);
      this.body.add(painted(0.36, 0.34, 0.42, (_nx, ny, nz) => (ny > 0.5 && nz > 0.1 ? 0x2f8f6a : nz > 0.5 && ny > 0 ? 0xb06ac0 : GREY), 0, 0.62, 0, 9, 7));
      this.body.add(blob(0.3, 0.2, 0.22, 0xc9ccd6, 0, 0.5, 0.2, 7, 5)); // pale chest
      for (const s of [-1, 1]) {
        const wing = blob(0.07, 0.24, 0.32, 0x5f6572, s * 0.35, 0.62, -0.04);
        wing.userData.side = s;
        this.wings.push(wing);
        this.body.add(wing);
        const foot = blob(0.07, 0.03, 0.12, 0xe08a9a, s * 0.12, 0.03, 0.05, 5, 4);
        this.feet.push(foot);
        this.root.add(foot);
        this.root.add(box(0.035, 0.28, 0.035, 0xe08a9a, s * 0.12, 0.2, 0.05));
      }
      const tail = blob(0.14, 0.05, 0.3, 0x3a3f4c, 0, 0.62, -0.5);
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
      // Lord Grimsqueak: a floating king. Spiked iron crown, burning eyes, a high crimson-lined collar, ermine and iron on
      // his shoulders, a purple robe and a tattered black cloak, clawed paws in wide sleeves, and a shard of the Engine on his chest.
      const FUR = 0x6e5e80;
      const DARK = 0x16101c;
      this.root.add(this.body);
      this.body.position.y = VILLAIN_FLOAT;
      // --- The king's body. Everything hangs from the head; he has no feet, the robe just ends. ---
      const both = createPs1Material({ lit: true, side: THREE.DoubleSide });
      /** Colours a shape by height: `at(y)` gives the colour of each vertex. */
      const shade = (geo: THREE.BufferGeometry, at: (y: number, i: number) => number): THREE.BufferGeometry => {
        const pos = geo.attributes.position;
        const cols = new Float32Array(pos.count * 3);
        const c = new THREE.Color();
        for (let i = 0; i < pos.count; i++) {
          c.set(at(pos.getY(i), i));
          cols.set([c.r, c.g, c.b], i * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        return geo;
      };
      const mix = (lo: number, hi: number, k: number): number => new THREE.Color(lo).lerp(new THREE.Color(hi), Math.min(1, Math.max(0, k))).getHex();
      /** Cuts the bottom edge of a turned shape into points, like cloth worn to rags. */
      const ragged = (geo: THREE.BufferGeometry, bottom: number, depth: number): void => {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          if (Math.abs(pos.getY(i) - bottom) > 0.001) continue;
          const ang = Math.atan2(pos.getX(i), pos.getZ(i));
          const tooth = Math.round((ang / (Math.PI * 2)) * 24);
          if (tooth % 2 === 0) pos.setY(i, bottom - depth * (0.6 + 0.4 * Math.abs(Math.sin(tooth * 1.7))));
        }
      };

      // The robe: broad at the shoulder, drawn in at a belted waist, flaring to a ragged hem. Royal purple going to black.
      const HEM = -1.2;
      const robeGeo = new THREE.LatheGeometry(
        [[0.15, -0.3], [0.44, -0.4], [0.5, -0.52], [0.42, -0.72], [0.31, -0.9], [0.4, -1.04], [0.6, HEM]].map(([r, y]) => new THREE.Vector2(r, y)),
        24,
      );
      ragged(robeGeo, HEM, 0.2);
      this.body.add(new THREE.Mesh(shade(robeGeo, (y) => mix(0x0e0818, 0x3a2058, (y - HEM) / 0.85)), both));
      // A gold stripe down the front, and a belt with a buckle.
      this.body.add(box(0.07, 0.36, 0.02, 0xb08a3a, 0, -0.6, 0.445));
      const stripeLow = box(0.07, 0.3, 0.02, 0xb08a3a, 0, -1.05, 0.44);
      stripeLow.rotation.x = -0.42;
      this.body.add(stripeLow);
      const belt = new THREE.Mesh(shade(new THREE.CylinderGeometry(0.325, 0.33, 0.07, 12, 1, true), () => 0xb08a3a), both);
      belt.position.y = -0.9;
      this.body.add(belt);
      this.body.add(box(0.11, 0.11, 0.03, 0xe0c060, 0, -0.9, 0.33));

      // The mantle: a heavy black cloak hung from the shoulders, longer than the robe, its edge in tatters. It sways.
      const cloakGeo = new THREE.LatheGeometry(
        [[0.5, -0.36], [0.6, -0.55], [0.6, -0.9], [0.72, -1.2], [0.86, -1.42]].map(([r, y]) => new THREE.Vector2(r, y)),
        18, Math.PI * 0.24, Math.PI * 1.52, // open at the front
      );
      ragged(cloakGeo, -1.42, 0.3);
      const cloak = new THREE.Mesh(shade(cloakGeo, (y) => mix(0x050308, 0x1a1024, (y + 1.42) / 1.0)), both);
      this.cloak = cloak;
      this.body.add(cloak);
      // Its crimson lining shows at the edges: the one colour he has kept.
      const liningGeo = new THREE.LatheGeometry(
        [[0.48, -0.38], [0.57, -0.56], [0.57, -0.9], [0.68, -1.18], [0.8, -1.36]].map(([r, y]) => new THREE.Vector2(r, y)),
        18, Math.PI * 0.24, Math.PI * 1.52,
      );
      const lining = new THREE.Mesh(shade(liningGeo, (y) => mix(0x3a0c18, 0x8a1c2c, (y + 1.36) / 1.0)), both);
      cloak.add(lining);

      // A high collar standing up behind his head, black outside and crimson within, cut to points along the top.
      const collarShape = (r0: number, r1: number, color: (y: number) => number): THREE.Mesh => {
        const g = new THREE.CylinderGeometry(r1, r0, 0.62, 12, 1, true, Math.PI * 0.5, Math.PI);
        const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          if (pos.getY(i) < 0.3) continue;
          const ang = Math.atan2(pos.getX(i), pos.getZ(i));
          const tooth = Math.round((ang / Math.PI) * 12);
          // Tallest at the back, dipping towards the front corners.
          pos.setY(i, 0.3 + (tooth % 2 === 0 ? 0.14 : 0) - 0.26 * Math.abs(Math.sin(ang)));
        }
        const m = new THREE.Mesh(shade(g, color), both);
        m.position.set(0, -0.12, -0.04);
        return m;
      };
      this.body.add(collarShape(0.46, 0.7, (y) => mix(0x0a0610, 0x1e142c, y + 0.4)));
      this.body.add(collarShape(0.44, 0.66, (y) => mix(0x4a1020, 0x9a2434, y + 0.4)));

      // Ermine over the shoulders: pale fur with dark flecks.
      this.body.add(blob(0.56, 0.13, 0.52, 0xd8d2e2, 0, -0.42, -0.01, 12, 5));
      for (let k = 0; k < 9; k++) {
        const ang = (k / 9) * Math.PI * 2 + 0.35;
        this.body.add(blob(0.035, 0.05, 0.035, 0x16101c, Math.sin(ang) * 0.52, -0.42 + 0.03 * Math.sin(k * 2.3), Math.cos(ang) * 0.48, 4, 3));
      }
      // Iron on each shoulder, with a spike.
      for (const s2 of [-1, 1]) {
        this.body.add(blob(0.2, 0.15, 0.22, 0x3a3a48, s2 * 0.5, -0.36, -0.02, 7, 5));
        const spike = new THREE.Mesh(shade(new THREE.ConeGeometry(0.06, 0.3, 4), (y) => mix(0x4a4a5a, 0xb0b0c4, y + 0.15)), mat);
        spike.position.set(s2 * 0.6, -0.2, -0.02);
        spike.rotation.z = -s2 * 0.7;
        this.body.add(spike);
      }

      // On his chest, on a gold chain: a shard of the Deep Engine. It is what holds him up, and it never stops pulsing.
      const chain = new THREE.Mesh(shade(new THREE.TorusGeometry(0.3, 0.018, 4, 12, Math.PI), () => 0xb08a3a), mat);
      chain.position.set(0, -0.36, 0.3);
      chain.rotation.set(-0.5, 0, Math.PI);
      this.body.add(chain);
      this.body.add(blob(0.1, 0.1, 0.05, 0xb08a3a, 0, -0.66, 0.44, 6, 4));
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.085), new THREE.MeshBasicMaterial({ color: 0x7fe8f4 }));
      shard.position.set(0, -0.66, 0.49);
      shard.scale.set(0.8, 1.25, 0.6);
      this.shard = shard;
      this.body.add(shard);

      // Under the hem, where feet would be: a turning ring of the same cold light, and a few sparks caught in it.
      const under = new THREE.Group();
      under.position.y = HEM - 0.22;
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x4fc4d4, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.44, 10), ringMat);
      ring.rotation.x = -Math.PI / 2;
      under.add(ring);
      const inner = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 6), ringMat);
      inner.rotation.x = -Math.PI / 2;
      inner.position.y = -0.08;
      under.add(inner);
      for (let k = 0; k < 4; k++) {
        const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), new THREE.MeshBasicMaterial({ color: 0x9ff0f8 }));
        spark.userData.k = k;
        under.add(spark);
      }
      this.under = under;
      this.body.add(under);

      // A long tail curling out from under the cloak.
      for (let k = 0; k < 6; k++) {
        const seg = blob(0.045 - k * 0.005, 0.045 - k * 0.005, 0.1, 0x8a6a80, 0.12 + k * 0.1, HEM - 0.02 + 0.02 * k * k * 0.3, -0.62 - Math.sin(k * 0.5) * 0.12, 5, 4);
        seg.rotation.y = 0.9 + k * 0.25;
        this.body.add(seg);
      }
      this.head.position.set(0, 0, 0);
      this.body.add(this.head);
      this.head.add(blob(0.42, 0.38, 0.4, FUR, 0, 0.05, 0, 11, 8)); // the head
      this.head.add(blob(0.2, 0.17, 0.34, FUR, 0, -0.06, 0.36, 8, 6)); // the snout
      this.head.add(blob(0.07, 0.06, 0.07, 0x2a1020, 0, -0.02, 0.68, 5, 4)); // the nose
      for (const s2 of [-1, 1]) {
        this.head.add(blob(0.26, 0.26, 0.06, FUR, s2 * 0.4, 0.38, -0.08, 8, 6)); // ears
        this.head.add(blob(0.17, 0.17, 0.05, 0x8a3a5a, s2 * 0.4, 0.38, -0.04, 7, 5));
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff3a1a }));
        eye.position.set(s2 * 0.17, 0.1, 0.34);
        this.head.add(eye);
        const brow = blob(0.16, 0.04, 0.08, DARK, s2 * 0.17, 0.22, 0.33, 6, 4);
        brow.rotation.z = -s2 * 0.45;
        this.head.add(brow);
        for (let w = 0; w < 3; w++) {
          const whisk = box(0.5, 0.012, 0.012, 0xd8d0e0, s2 * 0.38, -0.08 - w * 0.05, 0.5);
          whisk.rotation.y = s2 * (0.25 + w * 0.12);
          whisk.rotation.z = -s2 * (0.12 - w * 0.12);
          this.head.add(whisk);
        }
      }
      // The jaw hangs from the chin and swings open as he talks; two long front teeth stick out.
      this.jaw.position.set(0, -0.2, 0.2);
      this.head.add(this.jaw);
      this.jaw.add(blob(0.17, 0.07, 0.3, 0x3a1830, 0, -0.02, 0.1, 7, 4));
      this.jaw.add(blob(0.12, 0.05, 0.22, 0xe8e0d0, 0, 0.01, 0.12, 6, 4));
      for (const s2 of [-1, 1]) this.head.add(box(0.05, 0.13, 0.03, 0xf0ead8, s2 * 0.035, -0.17, 0.62));
      // The crown: a band of black iron with a ring of spikes.
      this.head.add(blob(0.36, 0.07, 0.34, 0x2a2a34, 0, 0.36, 0, 9, 4));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), mat);
        const sc = new THREE.Color(0x8a8a9a);
        const sn = spike.geometry.attributes.position.count;
        const scols = new Float32Array(sn * 3);
        for (let i = 0; i < sn; i++) scols.set([sc.r, sc.g, sc.b], i * 3);
        spike.geometry.setAttribute('color', new THREE.BufferAttribute(scols, 3));
        spike.position.set(Math.sin(a) * 0.3, 0.5, Math.cos(a) * 0.28);
        this.head.add(spike);
      }
      // His paws ride at his sides in wide, gold-edged sleeves, each ending in three pale claws.
      for (const s2 of [-1, 1]) {
        const hand = new THREE.Group();
        const sleeve = new THREE.Mesh(shade(new THREE.CylinderGeometry(0.1, 0.2, 0.34, 8, 1, true), (y) => mix(0x3a2058, 0x1a1028, y + 0.17)), both);
        sleeve.position.y = 0.2;
        hand.add(sleeve);
        const cuff = new THREE.Mesh(shade(new THREE.CylinderGeometry(0.2, 0.21, 0.05, 8, 1, true), () => 0xb08a3a), both);
        cuff.position.y = 0.04;
        hand.add(cuff);
        hand.add(blob(0.11, 0.12, 0.11, FUR, 0, -0.06, 0.02, 6, 5));
        for (let k = -1; k <= 1; k++) {
          const claw = new THREE.Mesh(shade(new THREE.ConeGeometry(0.028, 0.14, 4), () => 0xe8e0d0), mat);
          claw.position.set(k * 0.07, -0.19, 0.06);
          claw.rotation.x = Math.PI + 0.35;
          claw.rotation.z = -k * 0.25;
          hand.add(claw);
        }
        hand.position.set(s2 * 0.78, HAND_Y, 0.12);
        hand.rotation.z = s2 * 0.25;
        hand.userData.side = s2;
        this.wings.push(hand);
        this.body.add(hand);
      }
      // A blood-red stone at the front of the crown.
      const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xd8203a }));
      jewel.position.set(0, 0.38, 0.35);
      this.head.add(jewel);
    } else {
    const FUR = 0xd8c8a8;
    const CLOAK = 0x3a5a8a;
    this.root.add(this.body);
    // Body in a blue cloak, cream belly, little feet.
    this.body.add(blob(0.3, 0.36, 0.28, CLOAK, 0, 0.42, 0));
    this.body.add(blob(0.2, 0.24, 0.12, 0xf0e8d0, 0, 0.4, 0.18));
    for (const s of [-1, 1]) this.body.add(blob(0.1, 0.06, 0.15, 0xe8a8a0, s * 0.14, 0.05, 0.06, 5, 4));
    // The pack: a huge bedroll and bundle, with a pot hanging off it.
    this.body.add(box(0.62, 0.6, 0.4, 0x8a5a32, 0, 0.62, -0.36));
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.76, 7), mat);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 1.0, -0.36);
    const rc = new THREE.Color(0xb84a3a);
    const rn = roll.geometry.attributes.position.count;
    const rcols = new Float32Array(rn * 3);
    for (let i = 0; i < rn; i++) rcols.set([rc.r, rc.g, rc.b], i * 3);
    roll.geometry.setAttribute('color', new THREE.BufferAttribute(rcols, 3));
    this.body.add(roll);
    this.body.add(blob(0.12, 0.1, 0.12, 0x5a5a62, 0.36, 0.5, -0.38, 6, 4));
    this.body.add(box(0.5, 0.06, 0.06, 0x4a3020, 0, 0.72, -0.14));
    // Head: round, big ears, pink nose, a floppy green cap.
    this.head.position.set(0, 0.86, 0.04);
    this.body.add(this.head);
    this.head.add(blob(0.24, 0.22, 0.24, FUR, 0, 0, 0));
    this.head.add(blob(0.1, 0.08, 0.12, FUR, 0, -0.05, 0.2, 6, 4));
    this.head.add(blob(0.04, 0.035, 0.04, 0xe87a8a, 0, -0.04, 0.32, 5, 4));
    for (const s of [-1, 1]) {
      this.head.add(blob(0.15, 0.15, 0.04, FUR, s * 0.24, 0.18, -0.02, 7, 5));
      this.head.add(blob(0.1, 0.1, 0.03, 0xe8a8a0, s * 0.24, 0.18, 0.01, 6, 4));
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshBasicMaterial({ color: 0x101010 }));
      eye.position.set(s * 0.1, 0.04, 0.2);
      this.head.add(eye);
    }
    this.head.add(blob(0.2, 0.1, 0.2, 0x4a8a3a, 0, 0.2, -0.02, 7, 4));
    this.head.add(blob(0.07, 0.07, 0.07, 0x4a8a3a, 0.12, 0.27, -0.14, 5, 4));
    // Lantern on a pole in his right hand.
    this.body.add(box(0.04, 1.3, 0.04, 0x5a4028, 0.36, 0.65, 0.12));
    this.lantern.position.set(0.36, 1.3, 0.2);
    this.body.add(this.lantern);
    this.lantern.add(box(0.03, 0.03, 0.2, 0x5a4028, 0, 0.0, -0.04));
    const glow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.14), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
    glow.position.set(0, -0.14, 0.06);
    this.lantern.add(glow);
    this.lantern.add(box(0.18, 0.04, 0.18, 0x3a3a40, 0, -0.03, 0.06));
    }
    // A soft shadow (a floating head casts a wider, fainter one).
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.root.add(shadow);
    // The marker over his head: a small gold diamond, shown when the rat is near.
    this.marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    this.marker.position.set(0, spec.kind === 'villain' ? 3.3 : 1.75, 0);
    this.marker.visible = false;
    this.root.add(this.marker);

    this.root.position.set(spec.x, spec.y ?? 0, spec.z);
    this.gone = !!spec.hidden;
    this.root.visible = !this.gone;
    this.root.rotation.y = spec.facing;
    this.look = spec.facing;
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
  /** Parts of the villain that move by themselves. */
  private cloak: THREE.Object3D | null = null;
  private shard: THREE.Mesh | null = null;
  private under: THREE.Object3D | null = null;
  /** Time that keeps running even when he is standing still (his light does not stop). */
  private clock = 0;
  private shrug = 0;
  /** Out of the room (a story scene has taken him away, or has not brought him in yet). It lasts after the scene. */
  gone = false;
  /** What a scene last left him doing; it lasts after the scene too. */
  private pose = { still: false, low: 0, bow: 0, reach: 0 };
  private poseNow = { low: 0, bow: 0, reach: 0 };

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
    this.pose = { still: true, low: 1, bow: 0, reach: 1 };
  }

  update(dt: number, px: number, py: number, pz: number, talking: boolean): void {
    const a = this.act;
    if (a) {
      if (a.pos) this.moveTo(a.pos[0], a.pos[1], a.pos[2]);
      if (a.gone !== undefined) this.gone = a.gone;
      this.pose = { still: a.still ?? this.pose.still, low: a.low ?? this.pose.low, bow: a.bow ?? this.pose.bow, reach: a.reach ?? this.pose.reach };
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
    const want = this.act?.lookAt ? Math.atan2(this.act.lookAt[0] - this.spec.x, this.act.lookAt[1] - this.spec.z) : close ? Math.atan2(px - this.spec.x, pz - this.spec.z) : this.spec.facing;
    const d = Math.atan2(Math.sin(want - this.look), Math.cos(want - this.look));
    this.look += d * Math.min(1, dt * 5);
    this.root.rotation.y = this.look;
    this.talkBob += ((talking ? 1 : 0) - this.talkBob) * Math.min(1, dt * 8);
    this.mouth = Math.max(0, this.mouth - dt * 7);
    if (this.spec.kind === 'villain') {
      // He floats, sways, and his jaw snaps open on each syllable.
      // `low` brings him down from his float until the hem of the cowl is on the ground; `bow` drops his head.
      const still = this.pose.still ? 0.25 : 1;
      this.body.position.y = VILLAIN_FLOAT - VILLAIN_DROP * this.poseNow.low + still * (1 - this.poseNow.low) * (0.14 * Math.sin(this.time * 1.4) + 0.05 * Math.sin(this.time * 2.9));
      // The cloak sways behind him, the shard pulses, and the light under the hem turns. On the ground that light is out.
      if (this.cloak) this.cloak.rotation.x = 0.08 + still * 0.06 * Math.sin(this.time * 1.3);
      if (this.shard) {
        const beat = 0.75 + 0.25 * Math.sin(this.clock * 3.2);
        (this.shard.material as THREE.MeshBasicMaterial).color.setHex(0x7fe8f4).multiplyScalar(beat);
        this.shard.rotation.y = this.clock * 1.4;
      }
      if (this.under) {
        const up = 1 - this.poseNow.low;
        this.under.visible = up > 0.05;
        this.under.scale.setScalar(Math.max(0.01, up));
        this.under.rotation.y = this.clock * 1.8;
        for (const o of this.under.children) {
          const k = o.userData.k as number | undefined;
          if (k === undefined) continue;
          const ang = this.clock * 2.6 + k * 1.57;
          o.position.set(Math.cos(ang) * 0.5, 0.12 * Math.sin(this.clock * 3 + k), Math.sin(ang) * 0.5);
        }
      }
      this.jaw.rotation.x = 0.55 * this.mouth + (talking ? 0.05 : 0);
      this.head.rotation.x = -0.06 * this.mouth + 0.5 * this.poseNow.bow;
      this.head.rotation.z = 0.05 * Math.sin(this.time * 0.9);
      for (const w of this.wings) {
        const sd = w.userData.side as number;
        // `reach` brings one paw up and forward, to take the paw held out to him.
        const r = sd > 0 ? this.poseNow.reach : 0;
        w.position.y = HAND_Y + 0.1 * still * Math.sin(this.time * 1.8 + sd) + 0.3 * r;
        w.position.x = sd * (0.78 + 0.05 * Math.sin(this.time * 1.3)) * (1 - 0.6 * r);
        w.position.z = 0.12 + 0.6 * r;
        // Reaching, the paw turns palm-up.
        w.rotation.x = -1.1 * r;
      }
      this.marker.visible = this.near && !talking;
      this.marker.position.y = 3.3 + 0.08 * Math.sin(this.time * 4);
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
    this.head.rotation.z = 0.08 * Math.sin(this.time * 1.3);
    this.head.rotation.x = talking ? 0.1 * Math.sin(this.time * 9) : 0;
    this.lantern.rotation.z = 0.15 * Math.sin(this.time * 1.7);
    for (const w of this.wings) w.rotation.z = (w.userData.side as number) * (0.12 + (talking ? 0.35 * Math.abs(Math.sin(this.time * 14)) : 0.04 * Math.sin(this.time * 2)) + 0.75 * this.shrug);
    // A shrug: up on his toes, arms out, head to one side.
    this.body.position.y += 0.07 * this.shrug;
    this.head.rotation.z += 0.32 * this.shrug;
    this.head.rotation.x += 0.12 * this.shrug;
    this.marker.visible = this.near && !talking;
    this.marker.position.y = 1.75 + 0.08 * Math.sin(this.time * 4);
    this.marker.rotation.y = this.time * 2.5;
  }
}
