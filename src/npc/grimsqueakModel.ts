import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { bead, mix, modelKit, paint } from '../render/modelKit';

/**
 * Lord Grimsqueak as he is now.
 *
 * He was the knight's partner once: a lilac-grey rat the knight's own size, with the same long snout and big ears
 * (story/memory.ts draws him then, from the hero's own model). The Deep Engine has stretched him. He is twice as tall
 * and half as wide: a gaunt king with hollow cheeks and sunken, burning eyes, torn ears pinned back under an iron crown
 * too big for him, a high crimson-lined collar, long bony arms out of ragged sleeves, a robe that hangs off him like off
 * a peg, and a cloak in tatters. A shard of the Engine sits in his chest with its cold light creeping out across him in
 * veins; it is what holds him off the ground. Two long whiskers a side sweep out from his snout and hang down past his
 * chin like a moustache, and trail after him when he moves.
 *
 * The same face, so the knight (and the player) can know him; everything else gone wrong.
 *
 * Origin: the ground under him. Fully `low` his hem's tatters touch it; floating, he hangs `float` above it.
 */
export type GrimGesture =
  /** One paw curled over the shard in his chest, the other hanging. */
  | 'rest'
  /** Both claws out in front, spread, gathering light (the volley, the orb). */
  | 'cast'
  /** One arm thrust straight out (throwing, batting the orb back). */
  | 'point'
  /** One claw held high with a ball of light growing in it, the other on his chest (making the orb). */
  | 'conjure'
  /** Reared up with his arms spread wide like wings and his claws open, staring down at the rat (about to swoop). */
  | 'rear'
  /** Arms flung straight back along his body, head forward (diving). */
  | 'sweep'
  /** Both arms high over his head (rising for the slam). */
  | 'raise'
  /** Arms driven down in front (the slam landing). */
  | 'smash'
  /** Arms hanging, head down (spent, stunned). */
  | 'slump'
  /** Arms wide, claws to the roof, head thrown back, howling. */
  | 'rage'
  /** A paw held out, palm up (the ending). */
  | 'offer';

export interface GrimInput {
  /** 0 floating .. 1 down on the ground. */
  low: number;
  /** How high he hangs above the ground when he floats. */
  float: number;
  /** Head down, 0..1. */
  bow: number;
  /** Standing quite still: the swaying nearly stops (his light does not). */
  still: boolean;
  talking: boolean;
  /** 0..1: his jaw, snapped open by each syllable. */
  mouth: number;
  gesture: GrimGesture;
  /** 0..1: the 'offer' gesture laid over whatever else he is doing. */
  reach: number;
}

const C = {
  fur: 0x6e5e80, // the fur he always had
  furDark: 0x4a3e5a,
  furPale: 0x8a7c9a,
  cream: 0xc4b8cc,
  ear: 0x7a4a68,
  nose: 0x2a1020,
  tooth: 0xe8dcc0,
  claw: 0xe0d8c4,
  whisker: 0xe4dcec,
  whiskerRoot: 0x9a8ea8,
  robe: 0x4a2a6e,
  robeDark: 0x1a1028,
  cloak: 0x120a1a,
  cloakDark: 0x050308,
  lining: 0x8a1c2c,
  liningDark: 0x3a0c18,
  gold: 0xb08a3a,
  goldDark: 0x7a5c22,
  iron: 0x34343e,
  ironLight: 0x8a8a9a,
  ermine: 0xd0c8da,
  light: 0x7fe8f4,
};

/** One arm's pose: the shoulder's turn (x swings it forward when negative, z out to the side when positive), the elbow's bend, the wrist, and how far the fingers are spread (0 curled .. 1 wide). */
interface ArmPose {
  arm: [number, number, number];
  elbow: number;
  wrist: [number, number, number];
  spread: number;
}
/** A whole gesture: the paw at his chest side (left), the free one (right), how he holds his back and head, and extras. */
interface Stance {
  left: ArmPose;
  right: ArmPose;
  /** Spine: forward lean (x). Head: pitch (x, positive is down). */
  spine: number;
  head: number;
  /** How far his jaw hangs open by itself. */
  jaw: number;
  /** How hot his eyes burn, 0..1. */
  heat: number;
  /** A tremble in his arms. */
  shake: number;
  /** Ears: 0 as usual, 1 pinned flat back. */
  ears: number;
}
const A = (ax: number, ay: number, az: number, elbow: number, spread: number, wrist: [number, number, number] = [0, 0, 0]): ArmPose => ({ arm: [ax, ay, az], elbow, wrist, spread });
const ON_SHARD = A(-0.2, 0.95, 0.05, -2.0, 0.3, [0.2, 0, 0]);
const STANCES: Record<GrimGesture, Stance> = {
  rest: { left: ON_SHARD, right: A(-0.12, 0, 0.14, -0.4, 0.35), spine: 0.14, head: 0.05, jaw: 0, heat: 0.35, shake: 0, ears: 0 },
  cast: { left: A(-1.75, 0, 0.55, -0.55, 1), right: A(-1.75, 0, 0.55, -0.55, 1), spine: -0.06, head: -0.1, jaw: 0.25, heat: 1, shake: 1, ears: 0.6 },
  conjure: { left: ON_SHARD, right: A(-2.55, 0, 0.3, -0.4, 1, [-0.5, 0, 0]), spine: -0.08, head: -0.28, jaw: 0.2, heat: 1, shake: 0.5, ears: 0.6 },
  point: { left: ON_SHARD, right: A(-1.55, 0, 0.05, -0.08, 0.9), spine: 0.12, head: 0.02, jaw: 0.15, heat: 0.8, shake: 0.2, ears: 0.4 },
  rear: { left: A(-0.25, 0, 1.75, -0.7, 1), right: A(-0.25, 0, 1.75, -0.7, 1), spine: -0.22, head: 0.3, jaw: 0.55, heat: 1, shake: 0.7, ears: 1 },
  sweep: { left: A(1.25, 0, 0.22, -0.1, 1), right: A(1.25, 0, 0.22, -0.1, 1), spine: 0.3, head: -0.3, jaw: 0.6, heat: 1, shake: 0.2, ears: 1 },
  raise: { left: A(-2.85, 0, 0.3, -0.35, 1), right: A(-2.85, 0, 0.3, -0.35, 1), spine: -0.2, head: -0.3, jaw: 0.35, heat: 1, shake: 0.6, ears: 0.8 },
  smash: { left: A(-0.8, 0, 0.45, -0.45, 1), right: A(-0.8, 0, 0.45, -0.45, 1), spine: 0.45, head: 0.2, jaw: 0.4, heat: 0.9, shake: 0, ears: 1 },
  slump: { left: A(0.08, 0, 0.1, -0.12, 0.15), right: A(0.12, 0, 0.1, -0.1, 0.15), spine: 0.42, head: 0.35, jaw: 0.12, heat: 0.08, shake: 0, ears: 0.2 },
  rage: { left: A(-0.5, 0, 1.45, -1.15, 1), right: A(-0.5, 0, 1.45, -1.15, 1), spine: -0.28, head: -0.55, jaw: 1, heat: 1, shake: 1, ears: 1 },
  offer: { left: A(-0.05, 0, 0.1, -0.25, 0.3), right: A(-1.05, 0, 0.12, -0.5, 0.85, [-1.5, 0, 0]), spine: 0.2, head: 0.12, jaw: 0, heat: 0.15, shake: 0, ears: -0.3 },
};

/** How each joint of his tail after the first bends when it lies on the ground. */
const TAIL_LAID = [0.3, 0.25, 0.2, 0.06, 0.03, 0.03, 0.1, 0.2];
const UPPER = 0.4; // shoulder to elbow
const FORE = 0.4; // elbow to wrist
const WAIST = 0.82; // where his spine starts, above the ground when he stands on it
/** How high he hangs in the fight when he is up: his lowest rag, at the bottom of his bobbing, is still above the sword's reach (0.9). */
export const GRIM_FIGHT_FLOAT = 1.15;
/** How tall he is from the ground to the top of his crown, standing. */
export const GRIM_HEIGHT = 2.4;
/** The whole figure is built a little larger than that and brought down to it (so he stays in the fight's camera). */
const SCALE = 0.94;

function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

interface Arm {
  side: number;
  shoulder: THREE.Group;
  elbow: THREE.Group;
  hand: THREE.Group;
  fingers: THREE.Group[];
  now: ArmPose;
}

export class GrimsqueakModel {
  readonly root = new THREE.Group();
  // (A surface picture in greys over his painted colours: fur for him, a weave for his robes. The texture pass, 2026-11-16.)
  private readonly mat = createPs1Material({ lit: true, tex: getTexture('shortFur') });
  private readonly both = createPs1Material({ lit: true, side: THREE.DoubleSide, tex: getTexture('knit') });
  private readonly eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3a1a });
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
  private readonly lightMat = new THREE.MeshBasicMaterial({ color: C.light });
  private readonly veinMat = new THREE.MeshBasicMaterial({ color: C.light });
  private readonly jewelMat = new THREE.MeshBasicMaterial({ color: 0xd8203a });
  private readonly ringMat = new THREE.MeshBasicMaterial({ color: 0x4fc4d4, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });

  private readonly body = new THREE.Group();
  private readonly spine = new THREE.Group();
  private readonly neck = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly crown = new THREE.Group();
  private readonly ears: THREE.Group[] = [];
  private readonly whiskers: Array<{ pivot: THREE.Group; side: number; row: number }> = [];
  private readonly arms: Arm[] = [];
  private readonly cloak = new THREE.Group();
  private readonly tatters: Array<{ pivot: THREE.Group; phase: number }> = [];
  private readonly tail: THREE.Group[] = [];
  private readonly under = new THREE.Group();
  private readonly sparks: THREE.Mesh[] = [];
  private readonly shard: THREE.Mesh;
  private readonly chest: THREE.Object3D;

  /** Time his swaying runs on (it nearly stops when he is `still`), and time that never stops (his light). */
  private time = Math.random() * 10;
  private clock = 0;
  private stance: Stance = structuredClone(STANCES.rest);
  private flashAmount = 0;
  /** The ball of light in his raised claw, 0 none .. 1 full. */
  private orbAmount = 0;
  private orb: THREE.Mesh | null = null;
  /** What drags his whiskers, cloak and tail behind him: how fast he is turning and moving. */
  private lastYaw = 0;
  private readonly lastPos = new THREE.Vector3();
  private turn = 0;
  private drift = 0;
  private rise = 0;
  private started = false;

  constructor() {
    const mat = this.mat;
    const both = this.both;
    const { blob, cone, box } = modelKit(mat);
    /** A shape turned on a lathe from (radius, height) pairs, painted by height (0 at its bottom, 1 at its top). */
    const lathe = (pts: Array<[number, number]>, color: (k: number, ny: number) => number, segs = 10, material: THREE.Material = mat, arc: [number, number] = [0, Math.PI * 2]): THREE.Mesh => {
      const geo = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs, arc[0], arc[1]);
      return new THREE.Mesh(paint(geo, (_nx, ny) => color((ny + 1) / 2, ny)), material);
    };
    /** Cuts the bottom edge of a turned shape into rags. */
    const ragged = (m: THREE.Mesh, bottom: number, depth: number, teeth: number): THREE.Mesh => {
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getY(i) - bottom) > 0.001) continue;
        const tooth = Math.round((Math.atan2(pos.getX(i), pos.getZ(i)) / (Math.PI * 2)) * teeth);
        if (tooth % 2 === 0) pos.setY(i, bottom - depth * (0.55 + 0.45 * Math.abs(Math.sin(tooth * 1.7))));
      }
      return m;
    };

    this.root.add(this.body);
    this.body.scale.setScalar(SCALE);

    // ---- The cold light under him, where feet would be: two broken rings turning against each other, and sparks. ----
    this.under.position.y = -0.12;
    for (const [r0, r1, n, y] of [[0.3, 0.38, 9, 0], [0.13, 0.18, 6, -0.08]] as const) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, n, 1, 0, Math.PI * 1.6), this.ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = y;
      ring.userData.inner = y !== 0;
      this.under.add(ring);
    }
    for (let k = 0; k < 5; k++) {
      const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshBasicMaterial({ color: 0x9ff0f8 }));
      this.sparks.push(spark);
      this.under.add(spark);
    }
    this.body.add(this.under);

    // ---- The robe below the waist: narrow, flaring to a hem worn to rags. Royal purple going to black. ----
    const HEM = 0.16;
    const skirt = ragged(lathe([[0.19, WAIST + 0.02], [0.2, WAIST - 0.12], [0.26, 0.5], [0.34, 0.3], [0.43, HEM]], (k) => mix(C.robeDark, C.robe, k * 1.15), 16, both), HEM, 0.16, 16);
    skirt.scale.z = 0.86;
    this.body.add(skirt);
    // A tarnished gold stripe down the front, and a belt hanging loose on his hips with its end dangling.
    const stripe = box(0.055, 0.5, 0.012, C.goldDark, 0, 0.52, 0.262);
    stripe.rotation.x = -0.27;
    this.body.add(stripe);
    const belt = lathe([[0.215, -0.035], [0.225, 0.035]], () => C.gold, 12, both);
    belt.position.y = WAIST - 0.06;
    belt.rotation.z = 0.12;
    belt.scale.z = 0.86;
    this.body.add(belt);
    this.body.add(box(0.09, 0.09, 0.03, 0xe0c060, 0.02, WAIST - 0.06, 0.195));
    const beltEnd = box(0.045, 0.22, 0.014, C.gold, 0.08, WAIST - 0.19, 0.215);
    beltEnd.rotation.z = 0.2;
    this.body.add(beltEnd);

    // ---- His tail, hanging out below the hem: long, thin and bony, curling at the end. ----
    let tailParent: THREE.Object3D = this.body;
    for (let i = 0; i < 9; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0.3 : -0.115, i === 0 ? -0.2 : 0);
      const r = 0.036 - i * 0.0034;
      const bone = new THREE.Mesh(paint(new THREE.CylinderGeometry(r, r * 0.86, 0.12, 5).translate(0, -0.06, 0), i % 2 ? 0x7a5a70 : 0x8a6a80), mat);
      seg.add(bone);
      tailParent.add(seg);
      this.tail.push(seg);
      tailParent = seg;
    }

    // ---- The spine: everything above the waist leans and sways on it. ----
    this.spine.position.set(0, WAIST, 0);
    this.body.add(this.spine);

    // The chest: sunken and narrow under the robe, widest at the shoulders.
    const torso = lathe([[0.19, -0.02], [0.165, 0.14], [0.19, 0.34], [0.235, 0.54], [0.2, 0.66], [0.09, 0.73], [0.065, 0.86]], (k, ny) => (ny > 0.74 ? C.fur : mix(C.robeDark, C.robe, 0.35 + k * 0.8)), 12);
    torso.scale.z = 0.78;
    this.spine.add(torso);
    this.chest = torso;
    // The shard of the Deep Engine, sunk into his chest in an iron setting, and its cold light spreading out from it in veins.
    const setting = new THREE.Mesh(paint(new THREE.TorusGeometry(0.095, 0.022, 4, 8), C.iron), mat);
    setting.position.set(0, 0.42, 0.172);
    setting.rotation.x = -0.08;
    this.spine.add(setting);
    this.shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.085), this.lightMat);
    this.shard.position.set(0, 0.42, 0.185);
    this.shard.scale.set(0.8, 1.3, 0.55);
    this.spine.add(this.shard);
    for (const [ang, len, bend] of [[0.5, 0.2, 0.3], [1.25, 0.16, -0.2], [2.2, 0.19, 0.25], [-0.6, 0.18, -0.3], [-1.4, 0.15, 0.2], [-2.3, 0.2, -0.2], [3.0, 0.14, 0.1]] as const) {
      // Each vein: two short strokes, the second kinked, lying on the robe.
      const vein = new THREE.Group();
      vein.position.set(0, 0.42, 0.176);
      vein.rotation.z = ang;
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.014, len * 0.55, 0.006).translate(0, 0.1 + len * 0.275, 0), this.veinMat);
      const kink = new THREE.Group();
      kink.position.set(0, 0.1 + len * 0.55, 0);
      kink.rotation.z = bend * 2.4;
      kink.add(new THREE.Mesh(new THREE.BoxGeometry(0.01, len * 0.5, 0.006).translate(0, len * 0.25, 0), this.veinMat));
      vein.add(a, kink);
      // Wrap them back round the curve of his chest.
      vein.rotation.x = -0.1;
      vein.position.z -= Math.abs(Math.sin(ang)) * 0.035;
      this.spine.add(vein);
    }

    // The mantle: thin ermine across the shoulders, and a spiked plate of iron on each.
    this.spine.add(blob(0.33, 0.075, 0.23, (nx, _ny, nz) => (Math.sin(nx * 9) * Math.sin(nz * 7 + 1) > 0.55 ? C.cloak : C.ermine), 0, 0.63, -0.01, 12, 5, 0.25));
    for (const s of [-1, 1]) {
      const plate = blob(0.14, 0.09, 0.15, (_nx, ny) => (ny > 0.3 ? C.ironLight : C.iron), s * 0.31, 0.68, -0.01, 7, 5, 0.3);
      plate.rotation.z = -s * 0.35;
      this.spine.add(plate);
      const spike = cone(0.045, 0.26, (_nx, ny) => mix(C.iron, 0xc0c0d0, (ny + 1) / 2), 4);
      spike.position.set(s * 0.37, 0.72, -0.02);
      spike.rotation.z = -s * 0.85;
      this.spine.add(spike);
    }

    // The collar: standing high behind his head and cut to points, black outside and crimson within.
    const collar = (r0: number, r1: number, lo: number, hi: number): THREE.Mesh => {
      const geo = new THREE.CylinderGeometry(r1, r0, 0.6, 12, 1, true, Math.PI * 0.56, Math.PI * 0.88);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        if (pos.getY(i) < 0.29) continue;
        const ang = Math.atan2(pos.getX(i), pos.getZ(i));
        const tooth = Math.round((ang / Math.PI) * 12);
        // Tallest at the back, falling away to the front corners.
        pos.setY(i, 0.3 + (tooth % 2 === 0 ? 0.13 : 0) - 0.34 * Math.abs(Math.sin(ang)) ** 1.5);
      }
      const m = new THREE.Mesh(paint(geo, (_nx, ny) => mix(lo, hi, (ny + 1) / 2)), both);
      m.position.set(0, 0.95, -0.03);
      return m;
    };
    this.spine.add(collar(0.23, 0.4, C.cloakDark, 0x1e142c), collar(0.215, 0.375, C.liningDark, 0xa02638));

    // The cloak: hung from his shoulders down his back, its lining showing at the edges, ending in separate rags that
    // each swing on their own.
    this.cloak.position.set(0, 0.64, -0.05);
    const CLOAK_END = -0.93;
    const arc: [number, number] = [Math.PI * 0.5, Math.PI];
    this.cloak.add(lathe([[0.27, 0], [0.33, -0.2], [0.35, -0.6], [0.43, CLOAK_END]], (k) => mix(C.cloakDark, C.cloak, k), 10, both, arc));
    this.cloak.add(lathe([[0.25, -0.02], [0.31, -0.2], [0.33, -0.6], [0.405, CLOAK_END + 0.03]], (k) => mix(C.liningDark, C.lining, k), 10, both, arc));
    for (let k = 0; k < 7; k++) {
      const ang = Math.PI * (0.5 + (k + 0.5) / 7);
      const pivot = new THREE.Group();
      pivot.position.set(Math.sin(ang) * 0.42, CLOAK_END + 0.02, Math.cos(ang) * 0.42);
      pivot.rotation.y = ang;
      const len = 0.24 + 0.24 * Math.abs(Math.sin(k * 2.3 + 1));
      // A rag: a long thin triangle, two-sided.
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.085, 0, 0, 0.085, 0, 0, 0.02 * Math.sin(k * 3), -len, 0], 3));
      geo.computeVertexNormals();
      pivot.add(new THREE.Mesh(paint(geo, (_nx, ny) => (ny > 0 ? C.cloak : C.cloakDark)), both));
      this.cloak.add(pivot);
      this.tatters.push({ pivot, phase: k * 1.9 });
    }
    // On its back, the royal mark he took for his own: a crown stitched in gold thread, most of it worn away.
    const crest = new THREE.Group();
    crest.position.set(0, -0.4, -0.35);
    const thread = (w: number, h: number, x: number, y: number, tilt = 0, color = C.goldDark): void => {
      const m = box(w, h, 0.008, color, x, y, 0);
      m.rotation.z = tilt;
      crest.add(m);
    };
    thread(0.3, 0.03, 0, -0.08);
    thread(0.03, 0.2, -0.14, 0.02, 0.18);
    thread(0.03, 0.26, 0, 0.05, 0, C.gold);
    thread(0.03, 0.12, 0.14, -0.02, -0.18);
    thread(0.03, 0.14, -0.07, 0, -0.5);
    thread(0.03, 0.1, 0.07, -0.02, 0.5);
    this.cloak.add(crest);
    // A long rip in it, with the lining showing through.
    const rip = new THREE.Mesh(paint(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0.16, -0.45, 0, 0.21, -0.47, 0, 0.2, -0.9, 0], 3)), C.lining), both);
    rip.position.z = -0.36;
    this.cloak.add(rip);
    this.spine.add(this.cloak);

    // ---- Arms: long and bony, out of wide sleeves worn to rags at the cuff. Three clawed fingers and a thumb. ----
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.27, 0.6, 0);
      shoulder.rotation.order = 'YXZ';
      const sleeve = ragged(lathe([[0.075, 0], [0.1, -0.16], [0.155, -UPPER - 0.1]], (k) => mix(C.robeDark, C.robe, k * 0.9 + 0.1), 8, both), -UPPER - 0.1, 0.1, 8);
      shoulder.add(sleeve);
      shoulder.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.04, 0.034, UPPER, 5).translate(0, -UPPER / 2, 0), C.furDark), mat));
      const elbow = new THREE.Group();
      elbow.position.set(0, -UPPER, 0);
      elbow.add(blob(0.042, 0.042, 0.042, C.fur, 0, 0, 0, 5, 4, 0.2));
      elbow.add(new THREE.Mesh(paint(new THREE.CylinderGeometry(0.036, 0.027, FORE, 5).translate(0, -FORE / 2, 0), (_nx, ny) => (ny < -0.55 ? C.gold : C.fur)), mat));
      const hand = new THREE.Group();
      hand.position.set(0, -FORE, 0);
      hand.rotation.order = 'YXZ';
      hand.add(blob(0.05, 0.06, 0.03, C.fur, 0, -0.045, 0, 6, 4, 0.2));
      const fingers: THREE.Group[] = [];
      for (let k = -1; k <= 2; k++) {
        // k = 2 is the thumb, set on the side of the palm.
        const thumb = k === 2;
        const finger = new THREE.Group();
        finger.position.set(thumb ? -side * 0.045 : k * 0.032, thumb ? -0.04 : -0.095, 0);
        const bone = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.014, 0.011, thumb ? 0.07 : 0.1, 4).translate(0, thumb ? -0.035 : -0.05, 0), C.furPale), mat);
        const claw = cone(0.012, 0.085, C.claw, 4);
        claw.rotation.x = Math.PI;
        claw.position.y = thumb ? -0.065 : -0.095;
        finger.add(bone, claw);
        finger.userData.k = k;
        hand.add(finger);
        fingers.push(finger);
      }
      if (side > 0) {
        // The ball of light he makes in this claw (shown only while he conjures).
        this.orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xbff6ff }));
        this.orb.position.set(0, -0.3, 0.02);
        this.orb.visible = false;
        hand.add(this.orb);
      }
      elbow.add(hand);
      shoulder.add(elbow);
      this.spine.add(shoulder);
      this.arms.push({ side, shoulder, elbow, hand, fingers, now: structuredClone(side < 0 ? STANCES.rest.left : STANCES.rest.right) });
    }

    // ---- Head: the same long-snouted face he always had, gone gaunt. ----
    this.neck.position.set(0, 0.84, 0.02);
    this.spine.add(this.neck);
    this.head.position.set(0, 0.17, 0.05);
    this.head.rotation.order = 'YXZ';
    this.neck.add(this.head);
    const R = 0.29;
    // The skull: cream under the chin, dark in the hollows of the cheeks and round the eyes.
    this.head.add(blob(R, R * 0.96, R * 1.04, (nx, ny, nz) => {
      if (ny < -0.35 && nz > 0.1) return C.cream;
      if (nz > 0.2 && ny < 0.05 && Math.abs(nx) > 0.45) return C.furDark; // hollow cheeks
      if (nz > 0.45 && ny > -0.05 && ny < 0.5 && Math.abs(nx) > 0.2 && Math.abs(nx) < 0.75) return C.furDark; // sunken eyes
      return ny > 0.6 ? C.furPale : C.fur;
    }, 0, 0, 0, 12, 9, 0.25));
    // The snout: long, thin, and hooked down a little at the end.
    const snoutGeo = new THREE.ConeGeometry(0.155, 0.46, 8, 3);
    snoutGeo.rotateX(Math.PI / 2);
    snoutGeo.scale(1, 0.78, 1);
    const snout = new THREE.Mesh(paint(snoutGeo, (_nx, ny, nz) => (ny < -0.15 ? C.cream : nz > 0.7 ? C.furPale : C.fur), 0.2), mat);
    snout.position.set(0, -0.085, 0.37);
    snout.rotation.x = 0.16;
    this.head.add(snout);
    this.head.add(blob(0.042, 0.036, 0.04, C.nose, 0, -0.125, 0.6, 5, 4, 0));
    // Two long yellowed front teeth.
    for (const s of [-1, 1]) this.head.add(box(0.032, 0.075, 0.02, (_nx, ny) => (ny > 0.3 ? 0xc8b890 : C.tooth), s * 0.02, -0.205, 0.49));
    // The jaw: thin, hinged far back, with a pale tuft of beard under the chin. It drops when he speaks.
    this.jaw.position.set(0, -0.15, 0.08);
    this.head.add(this.jaw);
    const jawGeo = new THREE.ConeGeometry(0.105, 0.38, 6, 1);
    jawGeo.rotateX(Math.PI / 2);
    jawGeo.scale(1, 0.4, 1);
    const jawMesh = new THREE.Mesh(paint(jawGeo, (_nx, ny) => (ny > 0.2 ? 0x3a1830 : C.cream)), mat);
    jawMesh.position.set(0, -0.045, 0.22);
    this.jaw.add(jawMesh);
    const beard = cone(0.04, 0.2, (_nx, ny) => mix(C.whiskerRoot, C.whisker, (ny + 1) / 2), 4);
    beard.rotation.x = Math.PI - 0.35;
    beard.position.set(0, -0.07, 0.2);
    this.jaw.add(beard);

    // Eyes: small and burning, deep under heavy slanted brows.
    for (const s of [-1, 1]) {
      this.head.add(blob(0.075, 0.062, 0.04, 0x1a0e1e, s * 0.125, 0.055, 0.243, 6, 4, 0));
      const eye = bead(0.05, this.eyeMat, s * 0.125, 0.055, 0.258, 7, 5);
      eye.scale.set(1, 0.72, 0.6);
      this.head.add(eye);
      const core = bead(0.028, this.coreMat, s * 0.125, 0.052, 0.283, 6, 4);
      core.scale.set(1, 0.75, 0.5);
      this.head.add(core);
      const slit = bead(0.02, new THREE.MeshBasicMaterial({ color: 0x1a0408 }), s * 0.125, 0.052, 0.293, 4, 4);
      slit.scale.set(0.35, 1.25, 0.4);
      this.head.add(slit);
      const brow = blob(0.105, 0.032, 0.065, C.furDark, s * 0.13, 0.122, 0.25, 6, 3, 0);
      brow.rotation.z = s * 0.45; // low over the nose, high at the temples: a scowl
      brow.rotation.y = s * 0.25;
      this.head.add(brow);

      // Ears: big, as they always were, but torn at the edge and lying back.
      const ear = new THREE.Group();
      ear.position.set(s * 0.2, 0.17, -0.06);
      const outline = (r: number, torn: boolean): THREE.Shape => {
        const shape = new THREE.Shape();
        const N = 16;
        for (let i = 0; i <= N; i++) {
          const a = (i / N) * Math.PI * 2;
          // A bite out of the top edge, and a smaller one lower down the outside.
          const nick = torn && i === 2 ? 0.55 : torn && i === 3 ? 0.78 : torn && i === 5 ? 0.6 : torn && (i === 13 || i === 12) ? 0.85 : 1;
          const x = Math.sin(a) * r * 0.82 * nick;
          const y = r * 1.1 + Math.cos(a) * r * 1.15 * nick;
          if (i === 0) shape.moveTo(x, y);
          else shape.lineTo(x, y);
        }
        return shape;
      };
      const flap = new THREE.Mesh(paint(new THREE.ExtrudeGeometry(outline(0.2, true), { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015), C.fur, 0.2), both);
      const inner = new THREE.Mesh(paint(new THREE.ShapeGeometry(outline(0.13, false)).translate(0, 0.055, 0.019), (_nx, ny) => (ny < -0.3 ? 0x5a3450 : C.ear)), both);
      if (s < 0) flap.scale.x = inner.scale.x = -1; // the tears are on the outside edge of each
      ear.add(flap, inner);
      this.head.add(ear);
      this.ears.push(ear);

      // Whiskers: two a side. Each sweeps out from his snout, curves over and hangs down, long and tapering, like a
      // drooping moustache; the upper one shorter. They swing on their roots.
      const rows: Array<Array<[number, number, number]>> = [
        [[0, 0, 0], [0.1, 0.02, 0.01], [0.2, -0.01, 0.0], [0.27, -0.1, -0.02], [0.295, -0.24, -0.04], [0.28, -0.38, -0.05], [0.24, -0.5, -0.05]],
        [[0, 0, 0], [0.11, 0.05, -0.01], [0.23, 0.07, -0.04], [0.33, 0.03, -0.08], [0.39, -0.07, -0.11], [0.4, -0.19, -0.13]],
      ];
      rows.forEach((pts, row) => {
        const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(s * x, y, z)));
        const SEG = 14;
        const SIDES = 4;
        const r0 = row === 0 ? 0.014 : 0.011;
        const tube = new THREE.TubeGeometry(curve, SEG, r0, SIDES, false);
        const pos = tube.attributes.position;
        const mid = new THREE.Vector3();
        for (let i = 0; i <= SEG; i++) {
          curve.getPointAt(i / SEG, mid);
          const k = 1 - 0.88 * (i / SEG) ** 1.3;
          for (let j = 0; j <= SIDES; j++) {
            const n = i * (SIDES + 1) + j;
            pos.setXYZ(n, mid.x + (pos.getX(n) - mid.x) * k, mid.y + (pos.getY(n) - mid.y) * k, mid.z + (pos.getZ(n) - mid.z) * k);
          }
        }
        // Painted along its length (the tube's own first axis is not its length, so by distance from the root).
        const cols = new Float32Array(pos.count * 3);
        const c = new THREE.Color();
        for (let i = 0; i <= SEG; i++) {
          c.set(mix(C.whiskerRoot, C.whisker, Math.min(1, (i / SEG) * 3)));
          for (let j = 0; j <= SIDES; j++) cols.set([c.r, c.g, c.b], (i * (SIDES + 1) + j) * 3);
        }
        tube.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        const pivot = new THREE.Group();
        pivot.position.set(s * 0.085, -0.1 + row * 0.035, 0.47 - row * 0.05);
        pivot.add(new THREE.Mesh(tube, mat));
        this.head.add(pivot);
        this.whiskers.push({ pivot, side: s, row });
      });
    }

    // The crown: black iron, too big for him, sitting low on his brow and a little crooked. Tall uneven spikes (one
    // snapped off short), and a blood-red stone at the front.
    this.crown.position.set(0, 0.2, -0.015);
    this.crown.rotation.set(-0.1, 0, 0.09);
    const band = lathe([[0.255, -0.05], [0.275, 0.06]], (k) => mix(C.iron, 0x4a4a58, k), 12, both);
    this.crown.add(band);
    const heights = [0.5, 0.3, 0.42, 0.12, 0.36, 0.28, 0.44];
    heights.forEach((h, k) => {
      const a = (k / heights.length) * Math.PI * 2;
      const broken = h < 0.2;
      const spikeGeo = broken ? new THREE.CylinderGeometry(0.034, 0.055, h, 4).translate(0, h / 2, 0) : new THREE.ConeGeometry(0.055, h, 4).translate(0, h / 2, 0);
      const spike = new THREE.Mesh(paint(spikeGeo, (_nx, ny) => mix(C.iron, C.ironLight, Math.max(0, ny) ** 1.5)), mat);
      spike.position.set(Math.sin(a) * 0.262, 0.05, Math.cos(a) * 0.262);
      spike.rotation.z = -Math.sin(a) * 0.12;
      spike.rotation.x = Math.cos(a) * 0.12;
      this.crown.add(spike);
    });
    const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), this.jewelMat);
    jewel.position.set(0, 0.01, 0.275);
    jewel.scale.set(0.8, 1.2, 0.5);
    this.crown.add(jewel);
    this.head.add(this.crown);
    // (His fur's picture is laid several times round each part of him, so its grain is fine: see npc/npc.ts.)
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      const uv = m.isMesh && m.material === this.mat ? (m.geometry.attributes.uv as THREE.BufferAttribute | undefined) : undefined;
      if (uv) for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 3);
    });
  }

  /** Flashes him white for a moment (the sword has landed). */
  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, inp: GrimInput): void {
    const still = inp.still ? 0.2 : 1;
    this.time += dt * still;
    this.clock += dt;
    const t = this.time;

    // ---- How he is moving through the room: it drags his whiskers, cloak and tail behind him. ----
    this.root.updateWorldMatrix(true, false);
    const pos = new THREE.Vector3().setFromMatrixPosition(this.root.matrixWorld);
    const yaw = Math.atan2(this.root.matrixWorld.elements[8], this.root.matrixWorld.elements[10]);
    if (this.started && dt > 0 && dt < 0.25) {
      const dYaw = Math.atan2(Math.sin(yaw - this.lastYaw), Math.cos(yaw - this.lastYaw));
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      const vx = (pos.x - this.lastPos.x) / dt;
      const vz = (pos.z - this.lastPos.z) / dt;
      this.turn = ease(this.turn, Math.max(-6, Math.min(6, dYaw / dt)), dt, 6);
      this.drift = ease(this.drift, Math.max(-12, Math.min(12, vx * fx + vz * fz)), dt, 5);
    }
    this.started = true;
    this.lastYaw = yaw;
    this.lastPos.copy(pos);

    // ---- The stance he is easing into. ----
    const want = STANCES[inp.gesture];
    const offer = STANCES.offer;
    const r = inp.reach;
    const rate = inp.gesture === 'slump' ? 5 : 11;
    const s = this.stance;
    const mixN = (a: number, b: number): number => a + (b - a) * r;
    for (const key of ['spine', 'head', 'jaw', 'heat', 'shake', 'ears'] as const) s[key] = ease(s[key], mixN(want[key], offer[key]), dt, rate);
    for (const arm of this.arms) {
      const to = arm.side < 0 ? want.left : want.right;
      const off = arm.side < 0 ? offer.left : offer.right;
      for (let i = 0; i < 3; i++) {
        arm.now.arm[i] = ease(arm.now.arm[i], mixN(to.arm[i], off.arm[i]), dt, rate);
        arm.now.wrist[i] = ease(arm.now.wrist[i], mixN(to.wrist[i], off.wrist[i]), dt, rate);
      }
      arm.now.elbow = ease(arm.now.elbow, mixN(to.elbow, off.elbow), dt, rate);
      arm.now.spread = ease(arm.now.spread, mixN(to.spread, off.spread), dt, rate);
    }

    // ---- Height: he hangs in the air and bobs slowly; `low` brings him down until his rags are on the ground. ----
    const up = 1 - inp.low;
    const bob = still * up * (0.1 * Math.sin(t * 1.4) + 0.035 * Math.sin(t * 2.9));
    const y = inp.float * up + bob;
    this.rise = ease(this.rise, dt > 0 ? (y - this.body.position.y) / dt : 0, dt, 6);
    this.body.position.y = y;

    // ---- Spine, neck and head. ----
    const breath = Math.sin(this.clock * 1.6);
    this.spine.rotation.x = s.spine + still * 0.025 * Math.sin(t * 1.1) + 0.012 * breath;
    this.spine.rotation.z = still * 0.03 * Math.sin(t * 0.8);
    this.chest.scale.set(1 + 0.012 * breath, 1, 0.78 * (1 + 0.03 * breath));
    this.neck.rotation.x = -s.spine * 0.55; // his neck carries his head up out of the stoop
    this.head.rotation.x = s.head + 0.55 * inp.bow - 0.07 * inp.mouth + (inp.talking ? 0.03 * Math.sin(this.clock * 8) : 0);
    this.head.rotation.z = still * 0.045 * Math.sin(t * 0.9);
    this.head.rotation.y = still * 0.05 * Math.sin(t * 0.55);
    this.jaw.rotation.x = Math.max(0.5 * inp.mouth + (inp.talking ? 0.04 : 0), 0.42 * s.jaw);

    // Ears: lying back; flatter still when he is roused; one flicks now and then.
    this.ears.forEach((ear, i) => {
      const side = i === 0 ? -1 : 1;
      const flick = Math.max(0, Math.sin(t * 1.3 + i * 2.6)) ** 16;
      ear.rotation.set(-0.45 - 0.45 * s.ears, side * (0.35 + 0.2 * s.ears), -side * (0.95 + 0.3 * s.ears - 0.25 * flick));
    });

    // Whiskers: a slow wave, and they lag behind his head when he turns, lifts or surges forward.
    for (const w of this.whiskers) {
      const wave = Math.sin(t * 1.9 + w.row * 1.3 + (w.side > 0 ? 0.6 : 0));
      w.pivot.rotation.z = w.side * (0.05 * wave - 0.05 * this.rise) + this.turn * 0.03;
      w.pivot.rotation.y = -w.side * (0.06 * wave + Math.max(-0.5, Math.min(0.5, this.drift * 0.045))) + this.turn * -0.05;
      w.pivot.rotation.x = 0.04 * Math.sin(t * 1.4 + w.row) + Math.max(-0.35, Math.min(0.35, this.rise * 0.1)) - 0.25 * s.jaw * (w.row === 0 ? 1 : 0.5);
    }

    // ---- Arms and claws. ----
    for (const arm of this.arms) {
      const n = arm.now;
      const quake = s.shake * 0.05;
      const sway = still * 0.03 * Math.sin(t * 1.5 + arm.side);
      arm.shoulder.rotation.set(n.arm[0] + sway + quake * Math.sin(this.clock * 41 + arm.side), n.arm[1] * -arm.side, n.arm[2] * arm.side + quake * Math.sin(this.clock * 37));
      arm.elbow.rotation.x = n.elbow + quake * Math.sin(this.clock * 33 + arm.side * 2);
      arm.hand.rotation.set(n.wrist[0], n.wrist[1] * arm.side, n.wrist[2] * arm.side);
      for (const f of arm.fingers) {
        const k = f.userData.k as number;
        const curl = (1 - n.spread) * 1.15 + 0.08 * Math.sin(t * 2.3 + k + arm.side);
        if (k === 2) f.rotation.set(-curl * 0.7, 0, arm.side * (-0.5 - 0.5 * n.spread));
        else f.rotation.set(-curl, 0, k * (0.1 + 0.3 * n.spread));
      }
    }

    // ---- Cloak, rags and tail: they hang, sway, and stream out behind when he moves. ----
    const back = Math.max(-0.2, Math.min(0.9, this.drift * 0.06));
    this.cloak.rotation.x = 0.06 - s.spine * 0.7 + back + still * 0.045 * Math.sin(t * 1.3) + Math.max(-0.2, Math.min(0.4, this.rise * 0.08));
    for (const rag of this.tatters) {
      rag.pivot.rotation.x = 0.2 * Math.sin(t * 2.1 + rag.phase) * still + back * 0.8 + 0.1;
      rag.pivot.rotation.z = 0.12 * Math.sin(t * 1.6 + rag.phase * 1.7) * still;
    }
    this.tail.forEach((seg, i) => {
      const along = i / (this.tail.length - 1);
      // Floating, it comes out under the back of his hem and curls up like a hook (it never hangs lower than his rags).
      // On the ground it runs down to the floor and lies out behind him, the tip lifting.
      const hooked = i === 0 ? 0.9 : 0.28;
      const laid = i === 0 ? 0.75 : TAIL_LAID[i - 1];
      seg.rotation.x = hooked + (laid - hooked) * inp.low + (i === 0 ? back * 0.25 : 0) + 0.04 * Math.sin(t * 1.7 - i * 0.7) * still * (0.3 + along);
      seg.rotation.z = (0.06 + along * 0.1) * Math.sin(t * 1.3 - i * 0.6) * still + this.turn * 0.02 * (1 + i);
    });

    // ---- His light: it never stops. The shard beats, the veins beat after it, his eyes burn with how roused he is. ----
    const beat = 0.72 + 0.28 * Math.sin(this.clock * 3.2);
    this.lightMat.color.setHex(C.light).multiplyScalar(beat);
    this.shard.rotation.y = this.clock * 1.4;
    this.veinMat.color.setHex(C.light).multiplyScalar(0.3 + 0.4 * Math.max(0, Math.sin(this.clock * 3.2 - 0.9)) + 0.3 * s.heat);
    const flick = 0.9 + 0.1 * Math.sin(this.clock * 17) * Math.sin(this.clock * 7.3);
    this.eyeMat.color.setRGB((0.55 + 0.45 * s.heat) * flick, (0.1 + 0.16 * s.heat) * flick, 0.06 + 0.04 * s.heat);
    this.coreMat.color.setRGB((0.6 + 0.4 * s.heat) * flick, (0.3 + 0.5 * s.heat) * flick, 0.1 + 0.25 * s.heat);
    this.jewelMat.color.setHex(0xd8203a).multiplyScalar(0.75 + 0.25 * Math.sin(this.clock * 2.1));
    // On the ground the light under him is out.
    this.under.visible = up > 0.05;
    this.under.scale.setScalar(Math.max(0.01, up));
    for (const o of this.under.children) if (o.userData.inner !== undefined) o.rotation.z = this.clock * (o.userData.inner ? -2.6 : 1.8);
    this.sparks.forEach((spark, k) => {
      const ang = this.clock * 2.6 + k * 1.257;
      spark.position.set(Math.cos(ang) * 0.46, 0.14 * Math.sin(this.clock * 3 + k * 1.7), Math.sin(ang) * 0.46);
      spark.rotation.y = this.clock * 4;
    });

    this.orbAmount = ease(this.orbAmount, inp.gesture === 'conjure' ? 1 : 0, dt, inp.gesture === 'conjure' ? 2.2 : 14);
    if (this.orb) {
      this.orb.visible = this.orbAmount > 0.03;
      this.orb.scale.setScalar(this.orbAmount * (0.9 + 0.1 * Math.sin(this.clock * 23)));
      this.orb.rotation.set(this.clock * 3, this.clock * 4.3, 0);
    }
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.7;
    (this.mat.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
    (this.both.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
