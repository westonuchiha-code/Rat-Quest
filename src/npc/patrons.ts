/**
 * The Club's regulars: creatures who are not mice or birds, and who are DOING something when he walks in.
 *
 * The owner, 2026-11-15: "I want to have more props and objects and maybe have the characters have sort of idle
 * animations where ... they're kind of doing something maybe it looks like they're talking to each other you know
 * like have maybe two characters drinking at a table ... you can do like you did with the others where you just take
 * an animal make it into a cute character and then you can make two of them by changing some textures and a little
 * bit about the model ... Ideas for animals are turtles, a ferret, maybe an owl, a fox could be cool."
 *
 * So: a BUILD is an animal (turtle, fox), a LOOK is one of two of that animal (colours, and a thing or two about the
 * model: a beard, a cap, an eyepatch), and DOING is what he is at: standing about, drinking, talking to the one
 * across the table, leaning on a wall with his arms folded, or playing cards. Each stands (or sits) with his feet on
 * y = 0 facing +z. `Npc` (npc.ts) owns where he is, his name, his lines and the marker over his head; this is his body.
 */
import * as THREE from 'three';
import { createPs1Material } from '../render/ps1Material';
import { buildMug } from '../world/tavernModels';
import { bead, mix, modelKit, type ColorAt } from '../render/modelKit';

export type PatronKind = 'turtle' | 'fox' | 'ferret' | 'owl';
export const PATRON_KINDS: readonly PatronKind[] = ['turtle', 'fox', 'ferret', 'owl'];
export type PatronLook = 'mo' | 'pebble' | 'vix' | 'ash' | 'slink' | 'biscuit' | 'tawny' | 'snow';
/** `tend`: keeping the bar (a mug in one hand and a rag going round it in the other). */
export type Doing = 'stand' | 'drink' | 'chat' | 'lean' | 'cards' | 'tend';

/** Which of the two of his kind he is: by name, like the mice and the birds. */
export function patronLook(kind: PatronKind, name: string): PatronLook {
  const n = name.toUpperCase();
  if (kind === 'turtle') return n.includes('PEBBLE') ? 'pebble' : 'mo';
  if (kind === 'ferret') return n.includes('BISCUIT') ? 'biscuit' : 'slink';
  if (kind === 'owl') return n.includes('SNOW') ? 'snow' : 'tawny';
  return n.includes('ASH') ? 'ash' : 'vix';
}

export interface PatronCtx {
  /** Seconds, running. */
  time: number;
  /** He is talking to the rat: his mouth is driven by `mouth` (0..1, a syllable just spoken). */
  talking: boolean;
  mouth: number;
  /** Which way his head is turned from the way his body faces (radians, + to his left). */
  headYaw: number;
  doing: Doing;
  /** On a stool. */
  seated: boolean;
  /** Of two talking across a table, which one he is (0 or 1): they take turns. */
  turn: number;
}

export interface PatronBody {
  readonly root: THREE.Group;
  /** How high the top of his head is, standing (for the marker over it). */
  readonly height: number;
  update(dt: number, ctx: PatronCtx): void;
}

/** How high a stool's seat is (layout.ts `STOOL.h`, kept in step by a test). */
export const SEAT = 0.44;

const mat = createPs1Material({ lit: true });
const kit = modelKit(mat);
const WHITE = new THREE.MeshBasicMaterial({ color: 0xf4f0e4 });
const BLACK = new THREE.MeshBasicMaterial({ color: 0x14100c });

const ease = (now: number, to: number, dt: number, rate: number): number => now + (to - now) * Math.min(1, dt * rate);
/** A smooth 0..1..0 hump over `span` seconds, once every `every` seconds, starting `at` seconds in. */
function now(time: number, every: number, span: number, at = 0): number {
  const u = (((time - at) % every) + every) % every;
  return u < span ? Math.sin((u / span) * Math.PI) ** 2 : 0;
}

/** A thimble for a mug, held in a paw: its mouth up, its middle at the origin. */
function mug(): THREE.Group {
  // (The same thimble that stands on the tables and the bar, held by its middle.)
  const g = new THREE.Group();
  const cup = buildMug({ wood: mat, plain: mat, glow: mat });
  cup.position.y = -0.075;
  g.add(cup);
  return g;
}

/**
 * A turtle's shell, in the shell's own frame (its back toward -z): an eight-sided dome in flat plates. Each plate is
 * its face drawn in a little from its edges and stood a hair proud, light (`plate`); the border left round it is the
 * seam, dark (`seam`). The lowest ring is the rim (`rim`), plain.
 */
export function shellGeometry(seam: number, plate: number, rim: number): THREE.BufferGeometry {
  const RX = 0.37;
  const RY = 0.4;
  const RZ = 0.27;
  const SIDES = 8;
  // Rings, from the middle of his back out to the rim and under it: [how far out (of 1), how far back (of 1)].
  // (And on round his sides to his front, so that from the side it is a shell he is IN, not a lid on his back.)
  const rings: Array<[number, number]> = [[0.4, 0.95], [0.8, 0.64], [1, 0.14], [0.97, -0.22], [0.8, -0.7]];
  const at = (j: number, i: number): THREE.Vector3 => {
    // (A flat side uppermost, not a corner.)
    const a = ((i + 0.5) / SIDES) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * rings[j][0] * RX, Math.sin(a) * rings[j][0] * RY, -0.06 - rings[j][1] * RZ);
  };
  const middle = new THREE.Vector3(0, 0, -0.06);
  const pos: number[] = [];
  const col: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color): void => {
    // (Wound so that it faces out of the shell.)
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    const out = a.clone().add(b).add(c).divideScalar(3).sub(middle);
    const [p, q, r] = n.dot(out) >= 0 ? [a, b, c] : [a, c, b];
    for (const v of [p, q, r]) {
      pos.push(v.x, v.y, v.z);
      col.push(color.r, color.g, color.b);
    }
  };
  const SEAM = new THREE.Color(seam);
  /** One plate: its face `verts` (in order round it), the light part of it this shade. */
  const face = (verts: THREE.Vector3[], shade: number, inset: number): void => {
    const c = verts.reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(verts.length);
    const n = verts[1].clone().sub(verts[0]).cross(verts[2].clone().sub(verts[0])).normalize();
    if (n.dot(c.clone().sub(middle)) < 0) n.negate();
    const inner = verts.map((v) => v.clone().lerp(c, inset).addScaledVector(n, 0.012));
    const light = new THREE.Color(plate).multiplyScalar(shade);
    const top = c.clone().addScaledVector(n, 0.012);
    for (let i = 0; i < verts.length; i++) {
      const k = (i + 1) % verts.length;
      tri(top, inner[i], inner[k], light);
      tri(verts[i], verts[k], inner[k], SEAM);
      tri(verts[i], inner[k], inner[i], SEAM);
    }
  };
  // The plate in the middle of his back: an octagon.
  face(Array.from({ length: SIDES }, (_, i) => at(0, i)), 1.08, 0.16);
  // Eight round it, and eight below those: each four-sided, every other one a shade darker.
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < SIDES; i++) face([at(j, i), at(j, i + 1), at(j + 1, i + 1), at(j + 1, i)], (i + j) % 2 ? 0.9 : 1, j === 0 ? 0.2 : 0.24);
  }
  // The rim, turned under.
  const RIM = new THREE.Color(rim);
  for (let i = 0; i < SIDES; i++) {
    tri(at(2, i), at(2, i + 1), at(3, i + 1), RIM);
    tri(at(2, i), at(3, i + 1), at(3, i), RIM);
    // (Under the rim, in to his front: in the seam's dark.)
    tri(at(3, i), at(3, i + 1), at(4, i + 1), SEAM);
    tri(at(3, i), at(4, i + 1), at(4, i), SEAM);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  geo.computeVertexNormals();
  return geo;
}

/** An eye: a white with a pupil on it, looking along +z. Its `lid` is scaled to close it. */
function eye(r: number, pupil: number): THREE.Group {
  const g = new THREE.Group();
  g.add(bead(r, WHITE, 0, 0, 0));
  g.add(bead(pupil, BLACK, 0, 0, r * 0.72));
  return g;
}

/** What every patron shares: his blink, and whose turn it is to talk across a table. */
class Common {
  private blinkIn = 1 + Math.random() * 3;
  private blink = 0;
  mouth = 0;
  constructor(private readonly eyes: THREE.Object3D[], private readonly open: number) {}
  step(dt: number, ctx: PatronCtx): void {
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkIn = 1.6 + Math.random() * 3.6;
      this.blink = this.open < 1 ? 0.34 : 0.13;
    }
    this.blink = Math.max(0, this.blink - dt);
    for (const e of this.eyes) e.scale.y = this.blink > 0 ? 0.12 : this.open;
    // His mouth: the rat's talk drives it; otherwise, across a table, his own chatter in his own turn.
    let want = 0;
    if (ctx.talking) want = ctx.mouth;
    else if (ctx.doing === 'chat' || ctx.doing === 'cards') {
      const mine = Math.sin(ctx.time * 0.42 + ctx.turn * Math.PI) > (ctx.doing === 'cards' ? 0.55 : 0.1);
      want = mine ? Math.max(0, Math.sin(ctx.time * 11 + ctx.turn)) ** 2 * (0.5 + 0.5 * Math.sin(ctx.time * 2.3) ** 2) : 0;
    }
    this.mouth = ease(this.mouth, want, dt, 22);
  }
  /** Whether it is his turn to be the one talking (for a nod from the one listening). */
  static listening(ctx: PatronCtx): boolean {
    return (ctx.doing === 'chat' || ctx.doing === 'cards') && !ctx.talking && Math.sin(ctx.time * 0.42 + ctx.turn * Math.PI) <= 0.1;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The turtle: a big domed shell, a long neck he pushes out when he has something to say and pulls in when he has not.
// ---------------------------------------------------------------------------------------------------------------

const TURTLE = {
  mo: { skin: 0x7c8f4e, skinDark: 0x5c6c3a, shell: 0x4f5a32, scute: 0x6f7a3e, rim: 0x8a8450, belly: 0xd8c98c, beak: 0xc9b56a },
  pebble: { skin: 0x9fbf5a, skinDark: 0x7a9a44, shell: 0x8a5a30, scute: 0xb8813e, rim: 0xd0a85a, belly: 0xf0dfa0, beak: 0xe0c060 },
} as const;

class Turtle implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.02;
  private readonly body = new THREE.Group();
  private readonly shell = new THREE.Group();
  private readonly neck = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly arms: THREE.Group[] = [];
  private readonly legs: THREE.Group[] = [];
  private readonly mugHand = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly common: Common;
  private out = 0.5;
  private sip = 0;

  constructor(private readonly look: 'mo' | 'pebble') {
    const C = TURTLE[look];
    this.root.add(this.body);
    // The shell: eight-sided, in flat plates (the owner, 2026-11-16: "turtle shells should be more octagonal and less
    // like bumps"). One octagonal plate in the middle of his back, eight round it, eight more below those, and a pale
    // rim: each a flat face with a dark seam round it. And the flat pale shield of his front.
    this.shell.position.set(0, 0.5, -0.06);
    this.shell.add(new THREE.Mesh(shellGeometry(C.shell, C.scute, C.rim), mat));
    this.shell.add(kit.blob(0.3, 0.34, 0.13, (nx, ny) => (Math.abs(ny) < 0.06 || Math.abs(nx) < 0.07 ? mix(C.belly, 0x6a5a30, 0.35) : C.belly), 0, -0.01, 0.11, 8, 6, 0.18));
    this.body.add(this.shell);
    if (look === 'mo') {
      // Moss on the old one's shell, where it has been damp longest.
      for (const [x, y, z, r] of [[-0.12, 0.3, -0.19, 0.09], [0.12, 0.33, -0.15, 0.07], [0.27, 0.0, -0.2, 0.06]]) this.shell.add(kit.blob(r, r * 0.6, r * 0.5, 0x8aa84c, x, y, z, 6, 4, 0.1));
    }
    // Legs: short and thick, flat-footed.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.17, 0.2, 0.03);
      leg.add(kit.blob(0.105, 0.13, 0.11, C.skin, 0, -0.08, 0, 7, 5));
      leg.add(kit.blob(0.115, 0.045, 0.15, C.skinDark, 0, -0.17, 0.04, 7, 4));
      this.body.add(leg);
      this.legs.push(leg);
    }
    // Arms: stumpy, three blunt claws.
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.31, 0.66, 0.06);
      arm.userData.side = side;
      arm.add(kit.blob(0.085, 0.16, 0.085, C.skin, 0, -0.13, 0, 7, 5));
      const paw = new THREE.Group();
      paw.position.set(0, -0.28, 0.01);
      paw.add(kit.blob(0.085, 0.065, 0.09, C.skinDark, 0, 0, 0.01, 7, 4));
      for (const k of [-1, 0, 1]) paw.add(kit.blob(0.022, 0.022, 0.035, 0xe8dfc0, k * 0.045, -0.02, 0.085, 5, 4, 0));
      arm.add(paw);
      if (side > 0) {
        this.mugHand.position.set(0, -0.3, 0.1);
        this.mugHand.add(mug());
        arm.add(this.mugHand);
      }
      this.body.add(arm);
      this.arms.push(arm);
    }
    // A stub of a tail.
    this.tail.position.set(0, 0.2, -0.3);
    const tip = kit.cone(0.05, 0.16, C.skin, 5);
    tip.rotation.x = -1.9;
    this.tail.add(tip);
    this.body.add(this.tail);
    // The neck (it slides out of the shell and back) and the head on the end of it.
    this.neck.position.set(0, 0.8, 0.08);
    this.body.add(this.neck);
    this.neck.add(kit.blob(0.085, 0.2, 0.085, (_x, ny) => (ny < -0.2 ? C.skinDark : C.skin), 0, 0, 0, 7, 5));
    this.head.position.set(0, 0.2, 0.02);
    this.neck.add(this.head);
    this.head.add(kit.blob(0.145, 0.12, 0.165, (_x, ny, nz) => (nz > 0.55 && ny < 0.2 ? C.beak : C.skin), 0, 0.04, 0.05, 8, 6));
    // (Wrinkles of the old one's brow; the young one's is smooth.)
    if (look === 'mo') for (const side of [-1, 1]) this.head.add(kit.blob(0.07, 0.022, 0.03, C.skinDark, side * 0.07, 0.115, 0.14, 5, 3, 0));
    this.jaw.position.set(0, -0.01, 0.06);
    this.jaw.add(kit.blob(0.105, 0.035, 0.12, C.beak, 0, -0.02, 0.05, 7, 4, 0.1));
    this.head.add(this.jaw);
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const e = eye(0.042, 0.02);
      e.position.set(side * 0.095, 0.075, 0.13);
      e.rotation.y = side * 0.5;
      this.head.add(e);
      eyes.push(e);
    }
    if (look === 'mo') {
      // A thin white beard, and little round glasses low on his beak.
      const beard = kit.cone(0.065, 0.15, 0xe9e6da, 5);
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.035, 0.07);
      this.jaw.add(beard);
      for (const side of [-1, 1]) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 8), BLACK);
        rim.position.set(side * 0.085, 0.07, 0.175);
        rim.rotation.y = side * 0.35;
        this.head.add(rim);
      }
      this.head.add(kit.box(0.07, 0.01, 0.01, 0x14100c, 0, 0.075, 0.19));
    } else {
      // A flat cloth cap, pulled down a bit, and a red kerchief.
      this.head.add(kit.blob(0.15, 0.045, 0.17, 0x4a6a8a, 0, 0.145, 0.04, 8, 4, 0.2));
      this.head.add(kit.blob(0.12, 0.016, 0.07, 0x3a566f, 0, 0.125, 0.21, 6, 3, 0));
      this.neck.add(kit.blob(0.115, 0.05, 0.115, 0xc0392b, 0, -0.12, 0.01, 8, 4, 0.15));
      const knot = kit.cone(0.05, 0.13, 0xa52f24, 4);
      knot.rotation.x = Math.PI - 0.5;
      knot.position.set(0.05, -0.14, 0.1);
      this.neck.add(knot);
    }
    this.common = new Common(eyes, look === 'mo' ? 0.62 : 1);
  }

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const slow = this.look === 'mo' ? 0.75 : 1;
    // Sitting: his legs stick straight out in front of him, and his shell is on the seat.
    this.body.position.y = ctx.seated ? SEAT - 0.13 : 0;
    this.legs.forEach((leg, i) => leg.rotation.set(ctx.seated ? -1.45 + 0.05 * Math.sin(t * 1.3 + i * 2) : 0, 0, 0));
    // Breathing: the shell swells a little; the tail ticks.
    const breath = Math.sin(t * 1.5 * slow);
    this.shell.scale.set(1 + 0.012 * breath, 1 + 0.02 * breath, 1 + 0.02 * breath);
    this.tail.rotation.y = 0.5 * Math.sin(t * 2.1) * now(t, 5, 1.2);
    // A sip, every so often, for one who is drinking (not while he is being talked to).
    const drinking = ctx.doing === 'drink' && !ctx.talking;
    this.sip = drinking ? now(t, 7.5 / slow, 2.6, this.look === 'mo' ? 0 : 3.1) : ease(this.sip, 0, dt, 8);
    // The neck: out when he talks or listens hard, most of the way in when he is only sitting; right in for a sip.
    const speaking = ctx.talking || this.common.mouth > 0.05;
    const wantOut = speaking ? 1 : Common.listening(ctx) ? 0.75 : ctx.doing === 'stand' ? 0.55 : 0.45;
    this.out = ease(this.out, wantOut - 0.25 * this.sip, dt, 2.2 * slow + (speaking ? 3 : 0));
    this.neck.position.y = 0.66 + 0.16 * this.out;
    this.neck.position.z = 0.08 + 0.05 * this.out;
    this.neck.rotation.x = 0.28 * (1 - this.out) - 0.2 * this.sip;
    this.head.rotation.y = ctx.headYaw * 0.85;
    this.neck.rotation.y = ctx.headYaw * 0.15;
    const nod = Common.listening(ctx) ? 0.1 * Math.max(0, Math.sin(t * 2.6 * slow)) ** 3 : 0;
    this.head.rotation.x = 0.1 + 0.05 * Math.sin(t * 0.9 * slow) + nod - 0.75 * this.sip + (ctx.talking ? 0.07 * Math.sin(t * 8) : 0);
    this.head.rotation.z = 0.06 * Math.sin(t * 0.7 + 1);
    this.jaw.rotation.x = 0.5 * this.common.mouth + 0.2 * this.sip;
    // Arms: the right has the mug (on his knee, or up at his beak); the left rests, or waves his point home.
    this.mugHand.visible = ctx.doing === 'drink' || ctx.doing === 'chat';
    for (const arm of this.arms) {
      const side = arm.userData.side as number;
      if (side > 0 && this.mugHand.visible) {
        arm.rotation.set(-0.95 - 1.25 * this.sip, 0, -0.5 * side - 0.35 * this.sip);
        this.mugHand.rotation.x = 0.95 + 0.35 * this.sip;
      } else {
        const wave = speaking ? 0.5 + 0.4 * Math.sin(t * 5.5 + side) : 0;
        arm.rotation.set(-0.35 - 0.8 * wave + (ctx.seated ? -0.5 : 0), 0, side * (0.22 + 0.3 * wave) + 0.03 * Math.sin(t * 1.5 + side));
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The fox: tall, narrow, all ears and tail, and too pleased with himself.
//
// (Rebuilt 2026-11-16. The first one was balls strung together, three to a leg and three to the tail, and the owner
// said so: "I don't know if it's just too many pieces or something or they're all too round ... he just looks
// weird". This one is a FEW pieces, each a shape of its own and cut in flat faces: one tapered body, one head that is
// a wedge from its cheeks to its nose, one brush of a tail, and thin tapered limbs.)
// ---------------------------------------------------------------------------------------------------------------

const FOX = {
  vix: { coat: 0xd8702a, coatDark: 0xa84f1c, cream: 0xf3e3c4, sock: 0x33241c, earIn: 0x5a2a1c, cloth: 0x2f8f8a, clothDark: 0x226b68 },
  ash: { coat: 0x8a94a8, coatDark: 0x646e84, cream: 0xe6e8ee, sock: 0x24262e, earIn: 0x3a3c4a, cloth: 0x6a3f8f, clothDark: 0x4f2f6c },
} as const;

/**
 * Paints a flat-faced shape one FACE at a time: each face is one colour (asked of where its middle is, as `paint`
 * asks of a corner), darkened a little toward the underside. Colours meet along edges, never smeared across a face.
 */
function paintFaces(geo: THREE.BufferGeometry, color: ColorAt, shade = 0.2): THREE.BufferGeometry {
  geo.computeBoundingBox();
  const bb = geo.boundingBox as THREE.Box3;
  const mid = bb.getCenter(new THREE.Vector3());
  const half = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5).max(new THREE.Vector3(1e-6, 1e-6, 1e-6));
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const nx = ((pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 - mid.x) / half.x;
    const ny = ((pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 - mid.y) / half.y;
    const nz = ((pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 - mid.z) / half.z;
    c.set(typeof color === 'number' ? color : color(nx, ny, nz));
    const k = 1 - shade * (0.5 - 0.5 * ny);
    for (let j = 0; j < 3; j++) cols.set([c.r * k, c.g * k, c.b * k], (i + j) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}
/** Cuts a shape in flat faces, so it reads as carved and not as blown up. */
function faceted(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  flat.computeVertexNormals();
  return flat;
}
/**
 * A turned shape: `profile` is its outline, [how far out, how far up], from its bottom to its top; `sides` flat faces
 * round it; `deep` squeezes it front to back. `lie`: laid over so that its length runs along +z (a head, a muzzle).
 */
function turned(profile: Array<[number, number]>, color: ColorAt, sides = 6, deep = 1, lie = false): THREE.Mesh {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  geo.rotateY(Math.PI / sides);
  geo.scale(1, 1, deep);
  if (lie) geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(paintFaces(faceted(geo), color, 0.2), mat);
}
/** A tapered limb hanging from the origin: `r0` across at the top, `r1` at the bottom, `length` long. */
function limb(r0: number, r1: number, length: number, color: ColorAt, sides = 5): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r0, r1, length, sides, 1);
  geo.translate(0, -length / 2, 0);
  return new THREE.Mesh(paintFaces(faceted(geo), color, 0.15), mat);
}

class Fox implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.72;
  private readonly body = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly ears: THREE.Group[] = [];
  private readonly arms: Array<{ upper: THREE.Group; fore: THREE.Group; side: number }> = [];
  private readonly legs: Array<{ thigh: THREE.Group; shin: THREE.Group; side: number }> = [];
  private readonly tail = new THREE.Group();
  private readonly mugHand = new THREE.Group();
  private readonly cards = new THREE.Group();
  private readonly common: Common;
  private sip = 0;

  constructor(private readonly look: 'vix' | 'ash') {
    const C = FOX[look];
    this.root.add(this.body);
    this.body.position.y = LEG;
    // The body: ONE piece from his hips to the root of his neck, narrow at the waist, a pale bib down the front.
    this.body.add(this.chest);
    this.chest.add(turned(
      [[0, 0], [0.13, 0.02], [0.155, 0.1], [0.115, 0.27], [0.165, 0.47], [0.15, 0.56], [0.07, 0.62], [0, 0.63]],
      (nx, ny, nz) => (nz > 0.2 && ny > -0.25 && ny < 0.75 && Math.abs(nx) < 0.55 ? C.cream : C.coat), 6, 0.78,
    ));
    // Legs: a thigh and a long thin shin, dark from the knee down like stockings, and a wedge of a foot.
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.085, 0.06, 0);
      thigh.add(limb(0.078, 0.052, THIGH + 0.06, C.coat));
      const shin = new THREE.Group();
      shin.position.set(0, -(THIGH + 0.06), 0);
      shin.add(limb(0.05, 0.034, SHIN, C.sock));
      const foot = kit.box(0.085, 0.045, 0.17, C.sock, 0, -SHIN + 0.022, 0.045);
      shin.add(foot);
      thigh.add(shin);
      this.body.add(thigh);
      this.legs.push({ thigh, shin, side });
    }
    // Arms: thin, dark gloves to the elbow.
    for (const side of [-1, 1]) {
      const upper = new THREE.Group();
      upper.position.set(side * 0.165, 0.52, 0);
      upper.add(limb(0.052, 0.042, 0.23, C.coat));
      const fore = new THREE.Group();
      fore.position.set(0, -0.23, 0);
      fore.add(limb(0.042, 0.03, 0.2, C.sock));
      fore.add(kit.box(0.062, 0.07, 0.055, C.sock, 0, -0.225, 0.008));
      upper.add(fore);
      if (side > 0) {
        this.mugHand.position.set(0, -0.25, 0.075);
        this.mugHand.add(mug());
        fore.add(this.mugHand);
      } else {
        // A hand of cards, fanned.
        this.cards.position.set(0, -0.24, 0.05);
        for (let i = 0; i < 4; i++) {
          const fan = new THREE.Group();
          fan.rotation.z = (i - 1.5) * 0.28;
          fan.position.z = i * 0.004;
          fan.add(kit.box(0.075, 0.11, 0.006, i % 2 ? 0xe9e2cf : 0xdcd3bb, 0, 0.055, 0));
          this.cards.add(fan);
        }
        fore.add(this.cards);
      }
      this.chest.add(upper);
      this.arms.push({ upper, fore, side });
    }
    // The tail: ONE brush, thin where it leaves him, fat in the middle, a white point. It hinges at its root.
    this.tail.position.set(0, 0.07, -0.1);
    this.tail.add(turned([[0, 0], [0.05, 0.04], [0.13, 0.26], [0.15, 0.42], [0.1, 0.6], [0, 0.78]], (_x, ny) => (ny > 0.36 ? C.cream : C.coat), 6));
    this.body.add(this.tail);
    // A neckerchief: a collar and one point of it hanging in front.
    this.chest.add(turned([[0.075, 0], [0.135, 0.02], [0.12, 0.075], [0.07, 0.085]], C.cloth, 6, 0.85).translateY(0.57));
    const point = limb(0.06, 0.008, 0.16, C.clothDark, 3);
    point.position.set(-0.03, 0.6, 0.1);
    point.rotation.x = -0.35;
    this.chest.add(point);
    // The head: ONE wedge, widest at the cheeks and running out to the nose, pale underneath; two tall ears.
    this.head.position.set(0, 0.69, 0.01);
    this.head.scale.setScalar(1.15);
    this.chest.add(this.head);
    this.head.add(turned(
      [[0, -0.15], [0.12, -0.12], [0.19, -0.03], [0.165, 0.05], [0.075, 0.2], [0.04, 0.33], [0, 0.345]],
      (_nx, ny, nz) => (ny < -0.2 || (nz > 0.25 && ny < 0.12) ? C.cream : C.coat), 6, 0.8, true,
    ).translateY(0.09));
    this.head.add(kit.box(0.05, 0.04, 0.04, 0x14100c, 0, 0.105, 0.345));
    // (His lower jaw: a thin wedge under the muzzle, hinged at the back, that drops when he talks.)
    this.jaw.position.set(0, 0.03, 0.1);
    this.jaw.add(turned([[0, 0], [0.05, 0.02], [0.022, 0.19], [0, 0.2]], C.cream, 4, 0.5, true));
    this.head.add(this.jaw);
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.11, 0.2, -0.04);
      ear.userData.side = side;
      // (Ash has lost the tip of one.) Each is one flat-sided spike: coat behind, dark inside and at its tip.
      const cut = look === 'ash' && side < 0;
      const geo = new THREE.ConeGeometry(0.085, cut ? 0.17 : 0.28, 4, 1, cut);
      geo.translate(0, (cut ? 0.17 : 0.28) / 2, 0);
      geo.rotateY(Math.PI / 4);
      geo.scale(1, 1, 0.5);
      ear.add(new THREE.Mesh(paintFaces(faceted(geo), (_x, ny, nz) => (ny > 0.3 ? C.sock : nz > 0.1 ? C.earIn : C.coat), 0), mat));
      ear.rotation.z = side * -0.25;
      this.head.add(ear);
      this.ears.push(ear);
    }
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      if (look === 'ash' && side > 0) {
        // An eyepatch, and its strap.
        this.head.add(kit.box(0.085, 0.075, 0.02, 0x1c1c22, side * 0.085, 0.125, 0.115));
        const strap = kit.box(0.36, 0.016, 0.016, 0x1c1c22, 0, 0.165, 0.03);
        strap.rotation.z = -0.28;
        this.head.add(strap);
        continue;
      }
      const e = eye(0.036, 0.019);
      e.position.set(side * 0.082, 0.125, 0.105);
      e.rotation.y = side * 0.45;
      e.rotation.z = side * 0.32; // narrow and sly
      this.head.add(e);
      eyes.push(e);
    }
    if (look === 'vix') this.head.add(bead(0.024, new THREE.MeshBasicMaterial({ color: 0xe8b83a }), 0.165, 0.27, -0.04));
    this.common = new Common(eyes, 0.72);
  }

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const lean = ctx.doing === 'lean' && !ctx.seated;
    const speaking = ctx.talking || this.common.mouth > 0.05;
    // Standing, sitting (thighs out, shins down), or leaning back on something with one foot crossed over.
    this.body.position.y = ctx.seated ? SEAT + 0.03 : lean ? LEG + 0.03 : LEG;
    this.body.position.z = lean ? -0.08 : 0;
    this.body.rotation.x = lean ? -0.2 : ctx.seated ? 0.06 : 0;
    this.chest.rotation.x = (lean ? 0.14 : ctx.doing === 'cards' ? 0.18 : 0) + 0.02 * Math.sin(t * 1.7);
    for (const leg of this.legs) {
      if (ctx.seated) {
        leg.thigh.rotation.set(-1.5, 0, leg.side * 0.1);
        leg.shin.rotation.set(1.45 + 0.1 * Math.sin(t * 1.8 + leg.side), 0, 0);
      } else if (lean) {
        leg.thigh.rotation.set(leg.side > 0 ? 0.5 : 0.2, 0, leg.side > 0 ? -0.3 : 0);
        leg.shin.rotation.set(leg.side > 0 ? 0.1 : 0, 0, 0);
      } else {
        leg.thigh.rotation.set(0, 0, leg.side * 0.03);
        leg.shin.rotation.set(0, 0, 0);
      }
    }
    // The tail: carried up behind him, swinging slowly; quicker when he is pleased with what he is saying. Sitting,
    // it hangs out behind the stool.
    this.tail.rotation.set(ctx.seated ? -1.95 : lean ? -1.25 : -0.85 + 0.06 * Math.sin(t * 1.1), 0, 0.3 * Math.sin(t * (speaking ? 2.6 : 1.3)));
    // Ears: one flicks, then the other.
    this.ears.forEach((ear, i) => {
      const side = ear.userData.side as number;
      const flick = now(t, 4.3 + i * 1.7, 0.28, i * 2.2);
      ear.rotation.z = side * (-0.25 - 0.35 * flick) + (Common.listening(ctx) ? side * -0.08 : 0);
      ear.rotation.x = -0.1 * flick;
    });
    // The head: turned to whoever it is, tipped a little; a slow look down at his cards.
    const peek = ctx.doing === 'cards' && !ctx.talking ? now(t, 6.5, 2.2, ctx.turn * 3) : 0;
    this.head.rotation.y = ctx.headYaw * (1 - 0.8 * peek);
    this.head.rotation.x = (lean ? 0.1 : 0) + 0.35 * peek + (Common.listening(ctx) ? 0.08 * Math.max(0, Math.sin(t * 2.9)) ** 3 : 0) + (ctx.talking ? 0.06 * Math.sin(t * 8.5) : 0) - 0.5 * this.sip;
    this.head.rotation.z = 0.1 * Math.sin(t * 0.6) + (lean ? 0.12 : 0);
    this.jaw.rotation.x = 0.5 * this.common.mouth;
    // Arms: folded when he leans; a mug or a hand of cards when he has one; a wave of the paw when he talks.
    const drinking = ctx.doing === 'drink' && !ctx.talking;
    this.sip = drinking ? now(t, 6.2, 2.2, this.look === 'ash' ? 2.4 : 0) : ease(this.sip, 0, dt, 8);
    this.mugHand.visible = ctx.doing === 'drink';
    this.cards.visible = ctx.doing === 'cards';
    for (const arm of this.arms) {
      const s = arm.side;
      if (lean) {
        // Folded across his chest, one over the other.
        arm.upper.rotation.set(-0.5, 0, s * 0.2);
        arm.fore.rotation.set(-1.25, 0, s * -1.25 + (s > 0 ? 0.1 : 0));
      } else if (s > 0 && this.mugHand.visible) {
        arm.upper.rotation.set(-0.55 - 0.85 * this.sip, 0, s * 0.12);
        arm.fore.rotation.set(-1.0 - 0.75 * this.sip, 0, s * -0.25);
        this.mugHand.rotation.x = 1.5 + 0.5 * this.sip;
      } else if (s < 0 && this.cards.visible) {
        arm.upper.rotation.set(-0.5 - 0.2 * peek, 0, s * 0.1);
        arm.fore.rotation.set(-1.45 - 0.25 * peek, 0, s * -0.5);
        this.cards.rotation.set(1.2, 0, 0);
      } else {
        const wave = speaking ? 0.5 + 0.45 * Math.sin(t * 5 + s * 1.3) : 0;
        const rest = ctx.seated ? -0.75 : 0;
        arm.upper.rotation.set(rest * 0.6 - 0.5 * wave, 0, s * (0.1 + 0.2 * wave));
        arm.fore.rotation.set(rest * 0.9 - 0.9 * wave - 0.1, 0, 0);
      }
    }
  }
}
/** The fox's legs: how long a thigh and a shin are, and so how high his hips stand. */
const THIGH = 0.2;
const SHIN = 0.26;
const LEG = THIGH + SHIN;

// ---------------------------------------------------------------------------------------------------------------
// The ferret: a long thin body on short legs, a small pointed face with a mask across the eyes, never quite still.
// (A few shaped pieces, flat-faced, like the fox: one body, one head, one tail.)
// ---------------------------------------------------------------------------------------------------------------

const FERRET = {
  slink: { coat: 0x7a5236, coatDark: 0x3a281c, cream: 0xe8d8b8, mask: 0x2e2018, nose: 0x2a1a14, cloth: 0xb8862a },
  biscuit: { coat: 0xead9b6, coatDark: 0xb89a6a, cream: 0xfbf3df, mask: 0xc9a878, nose: 0xe08a8a, cloth: 0xa83a32 },
} as const;
const F_THIGH = 0.13;
const F_SHIN = 0.14;
const F_LEG = F_THIGH + F_SHIN;

class Ferret implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.3;
  private readonly body = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly arms: Array<{ upper: THREE.Group; fore: THREE.Group; side: number }> = [];
  private readonly legs: Array<{ thigh: THREE.Group; shin: THREE.Group; side: number }> = [];
  private readonly tail = new THREE.Group();
  private readonly mugHand = new THREE.Group();
  private readonly common: Common;
  private sip = 0;
  private dart = { in: 1, y: 0, x: 0 };

  constructor(private readonly look: 'slink' | 'biscuit') {
    const C = FERRET[look];
    this.root.add(this.body);
    this.body.position.y = F_LEG;
    this.body.add(this.chest);
    // The body: ONE long piece, pale down its front, with a waistcoat's worth of colour round its middle.
    this.chest.add(turned(
      [[0, 0], [0.115, 0.03], [0.128, 0.18], [0.118, 0.3], [0.108, 0.44], [0.115, 0.56], [0.118, 0.64], [0.075, 0.73], [0, 0.75]],
      (nx, ny, nz) => (nz > 0.5 && Math.abs(nx) < 0.4 ? C.cream : ny > -0.2 && ny < 0.5 ? C.cloth : C.coat), 6, 0.82,
    ));
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.07, 0.04, 0);
      thigh.add(limb(0.06, 0.045, F_THIGH + 0.04, C.coatDark));
      const shin = new THREE.Group();
      shin.position.set(0, -(F_THIGH + 0.04), 0);
      shin.add(limb(0.044, 0.032, F_SHIN, C.coatDark));
      shin.add(kit.box(0.07, 0.04, 0.14, C.coatDark, 0, -F_SHIN + 0.02, 0.04));
      thigh.add(shin);
      this.body.add(thigh);
      this.legs.push({ thigh, shin, side });
    }
    for (const side of [-1, 1]) {
      const upper = new THREE.Group();
      upper.position.set(side * 0.12, 0.62, 0);
      upper.add(limb(0.042, 0.034, 0.17, C.coat));
      const fore = new THREE.Group();
      fore.position.set(0, -0.17, 0);
      fore.add(limb(0.034, 0.026, 0.16, C.coatDark));
      fore.add(kit.box(0.05, 0.055, 0.045, C.coatDark, 0, -0.18, 0.006));
      upper.add(fore);
      if (side > 0) {
        this.mugHand.position.set(0, -0.2, 0.07);
        this.mugHand.add(mug());
        fore.add(this.mugHand);
      }
      this.chest.add(upper);
      this.arms.push({ upper, fore, side });
    }
    // The tail: one thin taper, dark at its end.
    this.tail.position.set(0, 0.05, -0.08);
    this.tail.add(turned([[0, 0], [0.045, 0.04], [0.06, 0.26], [0.035, 0.5], [0, 0.6]], (_x, ny) => (ny > 0.2 ? C.coatDark : C.coat), 5));
    this.body.add(this.tail);
    // The head: a short wedge, a mask across the eyes, small round ears set low.
    this.head.position.set(0, 0.79, 0.02);
    this.chest.add(this.head);
    this.head.add(turned(
      [[0, -0.12], [0.1, -0.1], [0.145, -0.01], [0.12, 0.07], [0.06, 0.17], [0.03, 0.215], [0, 0.22]],
      (_nx, ny, nz) => (nz > 0.72 ? C.cream : ny > -0.05 && ny < 0.5 && nz > 0.05 && nz < 0.72 ? C.mask : ny < -0.3 ? C.cream : C.coat), 6, 0.82, true,
    ).translateY(0.06));
    this.head.add(kit.box(0.04, 0.032, 0.03, C.nose, 0, 0.07, 0.225));
    this.jaw.position.set(0, 0.015, 0.07);
    this.jaw.add(turned([[0, 0], [0.04, 0.015], [0.018, 0.13], [0, 0.14]], C.cream, 4, 0.5, true));
    this.head.add(this.jaw);
    for (const side of [-1, 1]) {
      const geo = new THREE.CylinderGeometry(0.05, 0.055, 0.03, 5, 1);
      geo.rotateX(Math.PI / 2);
      const ear = new THREE.Mesh(paintFaces(faceted(geo), (_x, _y, nz) => (nz > 0.5 ? C.cream : C.coat), 0), mat);
      ear.position.set(side * 0.115, 0.14, -0.03);
      ear.rotation.y = side * 0.5;
      this.head.add(ear);
    }
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const e = eye(0.03, 0.018);
      e.position.set(side * 0.065, 0.095, 0.1);
      e.rotation.y = side * 0.45;
      this.head.add(e);
      eyes.push(e);
    }
    this.common = new Common(eyes, 1);
  }

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const lean = ctx.doing === 'lean' && !ctx.seated;
    const speaking = ctx.talking || this.common.mouth > 0.05;
    this.body.position.y = ctx.seated ? SEAT + 0.02 : lean ? F_LEG + 0.02 : F_LEG;
    this.body.position.z = lean ? -0.05 : 0;
    this.body.rotation.x = lean ? -0.22 : ctx.seated ? 0.05 : 0;
    // He sways: a ferret's long back is never straight for long.
    this.chest.rotation.z = (lean ? 0.03 : 0.07) * Math.sin(t * 2.3);
    this.chest.rotation.x = (lean ? 0.16 : 0) + 0.03 * Math.sin(t * 3.1);
    for (const leg of this.legs) {
      if (ctx.seated) {
        leg.thigh.rotation.set(-1.5, 0, leg.side * 0.1);
        leg.shin.rotation.set(1.4 + 0.25 * Math.sin(t * 4.2 + leg.side * 2), 0, 0); // his feet swing
      } else if (lean) {
        leg.thigh.rotation.set(leg.side > 0 ? 0.55 : 0.2, 0, leg.side > 0 ? -0.3 : 0);
        leg.shin.rotation.set(0, 0, 0);
      } else {
        leg.thigh.rotation.set(0, 0, leg.side * 0.04);
        leg.shin.rotation.set(0, 0, 0);
      }
    }
    this.tail.rotation.set(ctx.seated ? -2.0 : lean ? -1.3 : -1.15, 0, 0.5 * Math.sin(t * 3.4) * (0.4 + 0.6 * now(t, 3.1, 1.4)));
    // His head darts from one thing to the next, the way a ferret looks about; steadier when he is being spoken to.
    this.dart.in -= dt;
    if (this.dart.in <= 0) this.dart = { in: 0.5 + Math.random() * 1.6, y: (Math.random() - 0.5) * 0.9, x: (Math.random() - 0.5) * 0.3 };
    const snap = Math.min(1, dt * 18);
    const settled = ctx.talking || Common.listening(ctx);
    this.head.rotation.y += (ctx.headYaw + (settled ? 0 : this.dart.y) - this.head.rotation.y) * snap;
    this.head.rotation.x += ((settled ? 0 : this.dart.x) + (lean ? 0.1 : 0) - 0.5 * this.sip + (ctx.talking ? 0.06 * Math.sin(t * 9) : 0) - this.head.rotation.x) * snap;
    this.head.rotation.z = 0.12 * Math.sin(t * 1.1);
    this.jaw.rotation.x = 0.5 * this.common.mouth;
    const drinking = ctx.doing === 'drink' && !ctx.talking;
    this.sip = drinking ? now(t, 4.6, 1.5, this.look === 'biscuit' ? 1.7 : 0) : ease(this.sip, 0, dt, 8);
    this.mugHand.visible = ctx.doing === 'drink';
    for (const arm of this.arms) {
      const s = arm.side;
      if (lean) {
        arm.upper.rotation.set(-0.5, 0, s * 0.2);
        arm.fore.rotation.set(-1.25, 0, s * -1.2 + (s > 0 ? 0.1 : 0));
      } else if (s > 0 && this.mugHand.visible) {
        arm.upper.rotation.set(-0.6 - 0.9 * this.sip, 0, s * 0.1);
        arm.fore.rotation.set(-1.0 - 0.7 * this.sip, 0, s * -0.2);
        this.mugHand.rotation.x = 1.55 + 0.5 * this.sip;
      } else {
        const wave = speaking ? 0.5 + 0.45 * Math.sin(t * 6.5 + s * 1.3) : 0;
        const rest = ctx.seated ? -0.7 : 0;
        arm.upper.rotation.set(rest * 0.6 - 0.55 * wave, 0, s * (0.1 + 0.25 * wave));
        arm.fore.rotation.set(rest * 0.9 - 0.9 * wave - 0.15, 0, 0);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// The owl: an egg of a body, a wide flat head that turns nearly right round, two great eyes in a pale face.
// (One body, one head, two wings, a beak: the wings are his arms.)
// ---------------------------------------------------------------------------------------------------------------

const OWL = {
  tawny: { coat: 0x7a5a3a, coatDark: 0x4e3824, breast: 0xd9c49a, bar: 0x8a6a44, face: 0xe6d6b4, beak: 0xd9a83a, foot: 0xc9a040, eye: 0xe8a020 },
  snow: { coat: 0xe9edf2, coatDark: 0xb4bcc8, breast: 0xf7f9fb, bar: 0xb8c0cc, face: 0xfdfdfd, beak: 0x3a3a44, foot: 0x9aa2ae, eye: 0xf2d23a },
} as const;

class Owl implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.2;
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly beak = new THREE.Group();
  private readonly wings: THREE.Group[] = [];
  private readonly feet: THREE.Object3D[] = [];
  private readonly mugHand = new THREE.Group();
  private readonly rag = new THREE.Group();
  private readonly common: Common;
  private sip = 0;
  private cock = { in: 2, z: 0 };

  constructor(private readonly look: 'tawny' | 'snow') {
    const C = OWL[look];
    this.root.add(this.body);
    // The body: ONE egg, pale down its breast with darker bars across it.
    this.body.add(turned(
      [[0, 0.06], [0.18, 0.09], [0.265, 0.28], [0.25, 0.52], [0.17, 0.72], [0, 0.8]],
      (nx, ny, nz) => (nz > 0.25 && Math.abs(nx) < 0.7 ? (Math.abs(((ny * 3.2 + 4) % 1) - 0.5) < 0.16 ? C.bar : C.breast) : C.coat), 7, 0.86,
    ));
    // A stub of a tail, and his feet: two wedges with their toes forward.
    const tail = kit.box(0.2, 0.05, 0.2, C.coatDark, 0, 0.16, -0.24);
    tail.rotation.x = 0.7;
    this.body.add(tail);
    for (const side of [-1, 1]) {
      const foot = kit.box(0.1, 0.06, 0.17, C.foot, side * 0.1, 0.03, 0.06);
      this.body.add(foot);
      this.feet.push(foot);
    }
    // Wings: each ONE flat blade hanging from the shoulder. They are his arms.
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.235, 0.6, 0);
      wing.userData.side = side;
      const blade = turned([[0, 0], [0.11, 0.05], [0.12, 0.25], [0.05, 0.46], [0, 0.5]], (_x, ny) => (ny > 0.3 ? C.coatDark : C.coat), 5, 0.35);
      blade.rotation.x = Math.PI; // it hangs down from the shoulder
      wing.add(blade);
      if (side > 0) {
        this.mugHand.position.set(0, -0.43, 0.08);
        this.mugHand.add(mug());
        wing.add(this.mugHand);
      } else {
        // A rag, for the one who keeps the bar.
        this.rag.position.set(0, -0.44, 0.07);
        this.rag.add(kit.box(0.12, 0.09, 0.03, 0xdcd3bb, 0, 0, 0));
        wing.add(this.rag);
      }
      this.body.add(wing);
      this.wings.push(wing);
    }
    // The head: wide and flat-topped, a pale face, two great eyes, a small hooked beak; tufts on the tawny one.
    this.head.position.set(0, 0.74, 0.02);
    this.body.add(this.head);
    this.head.add(turned([[0, 0], [0.19, 0.03], [0.245, 0.16], [0.215, 0.3], [0.1, 0.37], [0, 0.375]], (_x, ny, nz) => (nz > 0.35 && ny < 0.75 ? C.face : C.coat), 7, 0.82));
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(paintFaces(faceted(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 7, 1).rotateX(Math.PI / 2)), C.eye, 0), mat);
      ring.position.set(side * 0.095, 0.2, 0.175);
      ring.rotation.y = side * 0.25;
      this.head.add(ring);
      const pupil = bead(0.046, BLACK, side * 0.099, 0.2, 0.19);
      pupil.scale.z = 0.35;
      pupil.rotation.y = side * 0.25;
      this.head.add(pupil);
      eyes.push(pupil);
    }
    this.beak.position.set(0, 0.15, 0.2);
    const hook = limb(0.035, 0.006, 0.09, C.beak, 4);
    hook.rotation.x = 0.5;
    this.beak.add(hook);
    this.head.add(this.beak);
    if (look === 'tawny') {
      for (const side of [-1, 1]) {
        const tuft = limb(0.045, 0.004, 0.14, C.coatDark, 3);
        tuft.rotation.set(Math.PI, 0, side * 0.5);
        tuft.position.set(side * 0.16, 0.32, 0);
        this.head.add(tuft);
      }
      // An apron, tied at the back: she keeps the bar.
      this.body.add(kit.box(0.3, 0.3, 0.02, 0xe6e0cf, 0, 0.36, 0.215));
    } else {
      // A monocle on a cord, and a bow tie.
      const glass = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.01, 4, 10), new THREE.MeshBasicMaterial({ color: 0xd9b24a }));
      glass.position.set(0.095, 0.2, 0.19);
      glass.rotation.y = 0.25;
      this.head.add(glass);
      this.body.add(kit.box(0.2, 0.07, 0.03, 0x8a2a3a, 0, 0.72, 0.17));
    }
    this.common = new Common(eyes, 1);
  }

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const speaking = ctx.talking || this.common.mouth > 0.05;
    this.body.position.y = ctx.seated ? SEAT - 0.05 : 0;
    this.feet.forEach((f) => (f.position.z = ctx.seated ? 0.2 : 0.06));
    // He breathes; he shifts from foot to foot now and then.
    this.body.rotation.z = 0.04 * Math.sin(t * 0.9) * now(t, 6, 3);
    this.body.scale.y = 1 + 0.012 * Math.sin(t * 1.6);
    // The head: it goes much further round than anyone else's, and tips right over when something interests him.
    this.cock.in -= dt;
    if (this.cock.in <= 0) this.cock = { in: 2 + Math.random() * 3.5, z: Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.5) };
    const settled = ctx.talking;
    this.head.rotation.y += (ctx.headYaw * 1.25 - this.head.rotation.y) * Math.min(1, dt * 9);
    this.head.rotation.z += ((settled ? 0.12 * Math.sin(t * 2) : this.cock.z) - this.head.rotation.z) * Math.min(1, dt * 7);
    this.head.rotation.x = (Common.listening(ctx) ? 0.07 * Math.max(0, Math.sin(t * 2.4)) ** 3 : 0) + (ctx.talking ? 0.05 * Math.sin(t * 8) : 0) - 0.45 * this.sip;
    this.beak.rotation.x = 0.35 * this.common.mouth;
    // Wings: at his sides; a mug in one; or (keeping the bar) a mug in one and a rag going round it in the other.
    const tending = ctx.doing === 'tend' && !ctx.talking;
    const drinking = ctx.doing === 'drink' && !ctx.talking;
    this.sip = drinking ? now(t, 8.5, 2.4, this.look === 'snow' ? 3 : 0) : ease(this.sip, 0, dt, 8);
    this.mugHand.visible = ctx.doing === 'drink' || ctx.doing === 'tend';
    this.rag.visible = ctx.doing === 'tend';
    for (const wing of this.wings) {
      const s = wing.userData.side as number;
      if (s > 0 && this.mugHand.visible) {
        wing.rotation.set(-1.05 - 0.7 * this.sip, 0, s * -0.35 - 0.1 * this.sip);
        this.mugHand.rotation.x = 1.05 + 0.6 * this.sip;
      } else if (s < 0 && ctx.doing === 'tend') {
        const rub = tending ? 1 : 0.3;
        wing.rotation.set(-1.0 + 0.12 * Math.sin(t * 7) * rub, 0, s * -0.55 + 0.14 * Math.cos(t * 7) * rub);
      } else {
        const wave = speaking ? 0.4 + 0.35 * Math.sin(t * 5 + s) : 0;
        wing.rotation.set(-0.5 * wave, 0, s * (0.08 + 0.5 * wave) + 0.02 * Math.sin(t * 1.6 + s));
      }
    }
  }
}

export function makePatron(kind: PatronKind, look: PatronLook): PatronBody {
  if (kind === 'turtle') return new Turtle(look === 'pebble' ? 'pebble' : 'mo');
  if (kind === 'ferret') return new Ferret(look === 'biscuit' ? 'biscuit' : 'slink');
  if (kind === 'owl') return new Owl(look === 'snow' ? 'snow' : 'tawny');
  return new Fox(look === 'ash' ? 'ash' : 'vix');
}
