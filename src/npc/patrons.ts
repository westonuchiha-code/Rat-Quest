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
import { getTexture } from '../render/textures';
import { createPs1Material } from '../render/ps1Material';
import { buildMug } from '../world/tavernModels';
import { bead, mix, modelKit, type ColorAt } from '../render/modelKit';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type PatronKind = 'turtle' | 'fox' | 'ferret' | 'owl' | 'rat' | 'mole' | 'hedgehog';
export const PATRON_KINDS: readonly PatronKind[] = ['turtle', 'fox', 'ferret', 'owl', 'rat', 'mole', 'hedgehog'];
export type PatronLook = 'mo' | 'pebble' | 'vix' | 'ash' | 'slink' | 'biscuit' | 'tawny' | 'snow' | 'jinx' | 'digger' | 'dot' | 'bramble' | 'thistle';
/** `tend`: keeping the bar (a mug in one hand and a rag going round it in the other). */
export type Doing = 'stand' | 'drink' | 'chat' | 'lean' | 'cards' | 'tend';

/** Which of the two of his kind he is: by name, like the mice and the birds. */
export function patronLook(kind: PatronKind, name: string): PatronLook {
  const n = name.toUpperCase();
  if (kind === 'turtle') return n.includes('PEBBLE') ? 'pebble' : 'mo';
  if (kind === 'ferret') return n.includes('BISCUIT') ? 'biscuit' : 'slink';
  if (kind === 'owl') return n.includes('SNOW') ? 'snow' : 'tawny';
  if (kind === 'rat') return 'jinx';
  if (kind === 'mole') return n.includes('DOT') ? 'dot' : 'digger';
  if (kind === 'hedgehog') return n.includes('THISTLE') ? 'thistle' : 'bramble';
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
  /** A cutscene's string on his head: nodded this far down (radians), on top of what he does by himself. */
  nod?: number;
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
// What a turtle is made of. Each has a picture of its SURFACE, in greys (render/textures.ts): his colours are his own,
// painted on him part by part, and the picture is laid over them. (The owner, 2026-11-16: "The turtles are also
// fairly texturless".)
/**
 * A coat of fur: a surface picture in greys over each furred regular's own painted colours.
 * THE OWL WEARS SOFT PAINT (below), not feathers. Feathers were tried twice: round-ended ones laid like tiles
 * (a wall of bricks), then dark flecks scattered on a soft ground. Of the flecks, and of fur strokes on the mice and
 * on Grimsqueak, the owner, 2026-11-16: "the mice and birds look way worse than before. same with the rat king, its
 * like you just threw a bunch of shit all over them". Marks scattered over a smooth cartoon character read as DIRT.
 */
const furMat = createPs1Material({ lit: true, tex: getTexture('shortFur') });
/** What the owl wears: SOFT PAINT, as the mice and the birds do (the owner's pick, 2026-11-16: render/textures.ts). */
const softMat = createPs1Material({ lit: true, tex: getTexture('softPaint') });
const scuteMat = createPs1Material({ lit: true, shine: 0.3, tex: getTexture('turtleScute') }); // a plate of his shell, its ridges
const mossyMat = createPs1Material({ lit: true, shine: 0.15, tex: getTexture('turtleScuteMossy') }); // the old one's: moss in from its edges
const skinKit = modelKit(createPs1Material({ lit: true, tex: getTexture('turtleSkin') })); // scales
const bellyKit = modelKit(createPs1Material({ lit: true, tex: getTexture('turtleBelly') })); // the shield of his front
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
  const uvs: number[] = [];
  /** A corner: where it is, and where on the plate's picture (`turtleScute`: a plate's middle is the picture's). */
  type Corner = [THREE.Vector3, number, number];
  const tri = (a: Corner, b: Corner, c: Corner, color: THREE.Color): void => {
    // (Wound so that it faces out of the shell.)
    const n = b[0].clone().sub(a[0]).cross(c[0].clone().sub(a[0]));
    const out = a[0].clone().add(b[0]).add(c[0]).divideScalar(3).sub(middle);
    const [p, q, r] = n.dot(out) >= 0 ? [a, b, c] : [a, c, b];
    for (const [v, s, t] of [p, q, r]) {
      pos.push(v.x, v.y, v.z);
      col.push(color.r, color.g, color.b);
      uvs.push(s, t);
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
    // On the picture: its corners round the picture's edge, in order; its light face drawn in from them as it is here.
    const on = (i: number, far: number): [number, number] => {
      const a = ((i + 0.5) / verts.length) * Math.PI * 2;
      return [0.5 + Math.cos(a) * far, 0.5 + Math.sin(a) * far];
    };
    const mid: Corner = [top, 0.5, 0.5];
    for (let i = 0; i < verts.length; i++) {
      const k = (i + 1) % verts.length;
      const oi: Corner = [verts[i], ...on(i, 0.5)];
      const ok: Corner = [verts[k], ...on(k, 0.5)];
      const ii: Corner = [inner[i], ...on(i, 0.5 * (1 - inset))];
      const ik: Corner = [inner[k], ...on(k, 0.5 * (1 - inset))];
      tri(mid, ii, ik, light);
      tri(oi, ok, ik, SEAM);
      tri(oi, ik, ii, SEAM);
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
    // (A length of rim is a band across a plate's picture, near its edge: the rings run along it.)
    const band = (j: number, far: number): Corner => [at(j, i + far), 0.2 + 0.6 * far, j === 2 ? 0.88 : j === 3 ? 0.76 : 0.6];
    tri(band(2, 0), band(2, 1), band(3, 1), RIM);
    tri(band(2, 0), band(3, 1), band(3, 0), RIM);
    // (Under the rim, in to his front: in the seam's dark.)
    tri(band(3, 0), band(3, 1), band(4, 1), SEAM);
    tri(band(3, 0), band(4, 1), band(4, 0), SEAM);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
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
    this.shell.add(new THREE.Mesh(shellGeometry(C.shell, C.scute, C.rim), look === 'mo' ? mossyMat : scuteMat));
    // (Its seams are in its picture, `turtleBelly`: one down the middle and those across.)
    this.shell.add(bellyKit.blob(0.3, 0.34, 0.13, C.belly, 0, -0.01, 0.11, 8, 6, 0.18));
    this.body.add(this.shell);
    // (The old one's moss is in his shell's picture, `turtleScuteMossy`. It was three balls stuck on his shell: the
    // owner, 2026-11-16: "one of the turtles seems to still have the remnants of like the bubbles he had".)
    // Legs: short and thick, flat-footed.
    for (const side of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * 0.17, 0.2, 0.03);
      leg.add(skinKit.blob(0.105, 0.13, 0.11, C.skin, 0, -0.08, 0, 7, 5));
      leg.add(skinKit.blob(0.115, 0.045, 0.15, C.skinDark, 0, -0.17, 0.04, 7, 4));
      this.body.add(leg);
      this.legs.push(leg);
    }
    // Arms: stumpy, three blunt claws.
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.31, 0.66, 0.06);
      arm.userData.side = side;
      arm.add(skinKit.blob(0.085, 0.16, 0.085, C.skin, 0, -0.13, 0, 7, 5));
      const paw = new THREE.Group();
      paw.position.set(0, -0.28, 0.01);
      paw.add(skinKit.blob(0.085, 0.065, 0.09, C.skinDark, 0, 0, 0.01, 7, 4));
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
    const tip = skinKit.cone(0.05, 0.16, C.skin, 5);
    tip.rotation.x = -1.9;
    this.tail.add(tip);
    this.body.add(this.tail);
    // The neck (it slides out of the shell and back) and the head on the end of it.
    this.neck.position.set(0, 0.8, 0.08);
    this.body.add(this.neck);
    this.neck.add(skinKit.blob(0.085, 0.2, 0.085, (_x, ny) => (ny < -0.2 ? C.skinDark : C.skin), 0, 0, 0, 7, 5));
    this.head.position.set(0, 0.2, 0.02);
    this.neck.add(this.head);
    this.head.add(skinKit.blob(0.145, 0.12, 0.165, (_x, ny, nz) => (nz > 0.55 && ny < 0.2 ? C.beak : C.skin), 0, 0.04, 0.05, 8, 6));
    // (Wrinkles of the old one's brow; the young one's is smooth.)
    if (look === 'mo') for (const side of [-1, 1]) this.head.add(skinKit.blob(0.07, 0.022, 0.03, C.skinDark, side * 0.07, 0.115, 0.14, 5, 3, 0));
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
    this.head.rotation.x = 0.1 + 0.05 * Math.sin(t * 0.9 * slow) + nod - 0.75 * this.sip + (ctx.talking ? 0.07 * Math.sin(t * 8) : 0) + (ctx.nod ?? 0);
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
/**
 * What `turned` and `limb` make their shapes of when they are not told: plain, or (while a furred or feathered
 * regular is being put together) his coat's picture. (The owner, 2026-11-16, of the stag: "We've got to think about
 * all the models in the game that don't have textures we need to do this with them".)
 */
let ink: THREE.Material = mat;
function turned(profile: Array<[number, number]>, color: ColorAt, sides = 6, deep = 1, lie = false, of: THREE.Material = ink): THREE.Mesh {
  const geo = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), sides);
  geo.rotateY(Math.PI / sides);
  geo.scale(1, 1, deep);
  if (lie) geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(paintFaces(faceted(geo), color, 0.2), of);
}
/** A tapered limb hanging from the origin: `r0` across at the top, `r1` at the bottom, `length` long. */
function limb(r0: number, r1: number, length: number, color: ColorAt, sides = 5, of: THREE.Material = ink): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(r0, r1, length, sides, 1);
  geo.translate(0, -length / 2, 0);
  return new THREE.Mesh(paintFaces(faceted(geo), color, 0.15), of);
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
    ink = furMat;
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
    this.chest.add(turned([[0.075, 0], [0.135, 0.02], [0.12, 0.075], [0.07, 0.085]], C.cloth, 6, 0.85, false, mat).translateY(0.57));
    const point = limb(0.06, 0.008, 0.16, C.clothDark, 3, mat);
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
    ink = mat;
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
    this.head.rotation.x = (lean ? 0.1 : 0) + 0.35 * peek + (Common.listening(ctx) ? 0.08 * Math.max(0, Math.sin(t * 2.9)) ** 3 : 0) + (ctx.talking ? 0.06 * Math.sin(t * 8.5) : 0) - 0.5 * this.sip + (ctx.nod ?? 0);
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
    ink = furMat;
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
    ink = mat;
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
    this.head.rotation.x += ((settled ? 0 : this.dart.x) + (lean ? 0.1 : 0) - 0.5 * this.sip + (ctx.talking ? 0.06 * Math.sin(t * 9) : 0) + (ctx.nod ?? 0) - this.head.rotation.x) * snap;
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

/** What the owl is made of: feathers over his body and head, flight feathers down his wings (render/textures.ts). */
const owlMat = createPs1Material({ lit: true, tex: getTexture('owlFeathers') });
const owlWingMat = createPs1Material({ lit: true, tex: getTexture('owlWing') });
/** His body and his head, as outlines to be turned: [how far out, how far up]. (His face and his apron are laid ON these.) */
const OWL_BODY: Array<[number, number]> = [[0, 0.05], [0.17, 0.07], [0.27, 0.22], [0.292, 0.4], [0.255, 0.58], [0.18, 0.71], [0, 0.76]];
const OWL_HEAD: Array<[number, number]> = [[0, 0], [0.19, 0.015], [0.275, 0.12], [0.292, 0.24], [0.245, 0.36], [0.13, 0.44], [0, 0.455]];
const OWL_DEEP = 0.86;
/** How far out a turned shape is at a height: between its outline's points. */
function outAt(profile: Array<[number, number]>, y: number): number {
  for (let i = 0; i + 1 < profile.length; i++) {
    const [r0, y0] = profile[i];
    const [r1, y1] = profile[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
  }
  return 0;
}
/**
 * A patch laid ON a turned shape's front: `rim` is its outline, [across, up], round its middle `mid`; every point of
 * it is put on the shape's own surface and lifted `lift` off it. So a face or an apron is curved as what it lies on
 * is curved, and stands off it nowhere. (The owner, 2026-11-16, of the owl's apron, a flat square card stood in front
 * of her: "square belly".)
 */
function laidOn(profile: Array<[number, number]>, deep: number, rim: Array<[number, number]>, mid: [number, number], lift: number, color: number, of: THREE.Material): THREE.Mesh {
  const at = (x: number, y: number): THREE.Vector3 => {
    const r = outAt(profile, y);
    const cx = Math.max(-r * 0.98, Math.min(r * 0.98, x));
    return new THREE.Vector3(cx, y, deep * Math.sqrt(Math.max(0, r * r - cx * cx)) + lift);
  };
  const pos: number[] = [];
  const uvs: number[] = [];
  const c = at(mid[0], mid[1]);
  // (Each spoke of it in three steps, so that it bends with the shape between its middle and its rim.)
  const STEPS = 3;
  for (let i = 0; i < rim.length; i++) {
    const a = rim[i];
    const b = rim[(i + 1) % rim.length];
    for (let k = 0; k < STEPS; k++) {
      const t0 = k / STEPS;
      const t1 = (k + 1) / STEPS;
      const q = (p: [number, number], t: number): THREE.Vector3 => at(mid[0] + (p[0] - mid[0]) * t, mid[1] + (p[1] - mid[1]) * t);
      const quad = [q(a, t0), q(b, t0), q(b, t1), q(a, t1)];
      const tris = k === 0 ? [[c, quad[2], quad[3]]] : [[quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]];
      for (const tri of tris) for (const v of tri) {
        pos.push(v.x, v.y, v.z);
        uvs.push(v.x * 1.6 + 0.5, v.y * 1.6);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.computeVertexNormals();
  // (Wound to face forward whichever way its rim was given.)
  if (geo.attributes.normal.getZ(0) < 0) {
    const p2 = geo.attributes.position;
    for (let i = 0; i < p2.count; i += 3) {
      const [x, y, z] = [p2.getX(i + 1), p2.getY(i + 1), p2.getZ(i + 1)];
      p2.setXYZ(i + 1, p2.getX(i + 2), p2.getY(i + 2), p2.getZ(i + 2));
      p2.setXYZ(i + 2, x, y, z);
    }
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(paintFaces(geo, color, 0.12), of);
}
/** Lays a part's picture `ku` times round it and `kv` times up it. */
function finer(m: THREE.Mesh, ku: number, kv: number): THREE.Mesh {
  const uv = m.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ku, uv.getY(i) * kv);
  return m;
}

// THE OWL, SECOND MAKING. (The owner, 2026-11-16: "owl has a lot of problems to fix in the model square belly, bad
// eyes, odd shapes, he could also benefit from a more detailed texture.") What was wrong: a seven-sided egg and a
// seven-sided flat-topped head (lumps); an apron that was a square card stood in front of her; eyes that were flat
// seven-sided coins with a squashed black ball on each; wedges for feet; a box for a tail and a box for a bow tie.
// Now: a plump body and a big round head, twelve-sided so they read as round; a pale heart of a FACE laid on the head,
// a dark rim round it; great round eyes, each a ring, a coloured iris, a big pupil and a glint, under a stern brow;
// a hooked beak; long wings folded at his sides, barred; feet with three toes; a fan of a tail. The barkeeper's apron
// is laid ON her front and curves as she does; the other one's bow tie is a bow. And feathers: `owlFeathers` over
// body and head, `owlWing` down the wings.
class Owl implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.22;
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
    // The body: ONE plump egg, pale down its breast.
    this.body.add(finer(turned(OWL_BODY, (nx, _ny, nz) => (nz > 0.22 && Math.abs(nx) < 0.72 ? C.breast : C.coat), 12, OWL_DEEP, false, owlMat), 4, 2.5));
    // A fan of a tail, and his feet: three toes forward on each.
    const tail = turned([[0, 0], [0.11, 0.03], [0.13, 0.17], [0, 0.26]], C.coatDark, 5, 0.22, false, owlWingMat);
    tail.rotation.x = -2.25;
    tail.position.set(0, 0.2, -0.2);
    this.body.add(tail);
    for (const side of [-1, 1]) {
      const foot = new THREE.Group();
      foot.position.set(side * 0.11, 0.03, 0.06);
      for (const k of [-1, 0, 1]) {
        const toe = limb(0.03, 0.01, 0.13, C.foot, 4, softMat);
        toe.rotation.set(-Math.PI / 2, 0, 0);
        toe.rotation.order = 'YXZ';
        toe.rotation.y = k * 0.42;
        foot.add(toe);
      }
      foot.add(kit.blob(0.045, 0.035, 0.045, C.foot, 0, 0.01, 0, 5, 4, 0.1));
      this.body.add(foot);
      this.feet.push(foot);
    }
    // Wings: each ONE long leaf folded down his side from the shoulder, barred. They are his arms.
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.262, 0.6, -0.01);
      wing.userData.side = side;
      const blade = turned([[0, 0], [0.105, 0.04], [0.14, 0.2], [0.115, 0.38], [0.045, 0.52], [0, 0.56]], (_x, ny) => (ny > 0.45 ? C.coatDark : C.coat), 6, 0.3, false, owlWingMat);
      blade.rotation.x = Math.PI; // it hangs down from the shoulder
      wing.add(blade);
      if (side > 0) {
        this.mugHand.position.set(0, -0.46, 0.08);
        this.mugHand.add(mug());
        wing.add(this.mugHand);
      } else {
        // A rag, for the one who keeps the bar.
        this.rag.position.set(0, -0.47, 0.07);
        this.rag.add(kit.box(0.12, 0.09, 0.03, 0xdcd3bb, 0, 0, 0));
        wing.add(this.rag);
      }
      this.body.add(wing);
      this.wings.push(wing);
    }
    // The head: big and round, no neck to speak of.
    this.head.position.set(0, 0.68, 0.015);
    this.body.add(this.head);
    this.head.add(finer(turned(OWL_HEAD, C.coat, 12, OWL_DEEP, false, owlMat), 4, 1.6));
    // His face: a pale heart laid on the front of his head, a dark rim showing round it.
    const heart: Array<[number, number]> = [[0, 0.075], [0.105, 0.095], [0.195, 0.16], [0.232, 0.255], [0.2, 0.345], [0.11, 0.378], [0.035, 0.345], [0, 0.305], [-0.035, 0.345], [-0.11, 0.378], [-0.2, 0.345], [-0.232, 0.255], [-0.195, 0.16], [-0.105, 0.095]];
    const grow = (k: number): Array<[number, number]> => heart.map(([x, y]) => [x * k, 0.235 + (y - 0.235) * k]);
    this.head.add(laidOn(OWL_HEAD, OWL_DEEP, grow(1.1), [0, 0.235], 0.008, C.coatDark, softMat));
    this.head.add(laidOn(OWL_HEAD, OWL_DEEP, heart, [0, 0.235], 0.016, C.face, softMat));
    const faceZ = (x: number, y: number): number => OWL_DEEP * Math.sqrt(Math.max(0, outAt(OWL_HEAD, y) ** 2 - x * x)) + 0.016;
    // Eyes: great and round. A dark ring, a coloured iris, a big pupil, a glint. (They shut, for a blink, as one.)
    const eyes: THREE.Object3D[] = [];
    const IRIS = new THREE.MeshBasicMaterial({ color: C.eye });
    for (const side of [-1, 1]) {
      const e = new THREE.Group();
      e.position.set(side * 0.1, 0.262, faceZ(0.1, 0.262) + 0.004);
      e.rotation.y = side * 0.3;
      const disc = (r: number, m: THREE.Material, z: number): THREE.Mesh => new THREE.Mesh(new THREE.CircleGeometry(r, 12), m).translateZ(z);
      e.add(disc(0.083, BLACK, 0), disc(0.07, IRIS, 0.004), disc(0.042, BLACK, 0.008), disc(0.014, WHITE, 0.012).translateX(-0.018).translateY(0.02));
      this.head.add(e);
      eyes.push(e);
      // His brow: a dark bar over each eye, down toward his beak. An owl always looks as if it disapproves.
      const brow = kit.box(0.15, 0.03, 0.03, C.coatDark, side * 0.098, 0.358, faceZ(0.098, 0.358) + 0.012);
      brow.rotation.set(0.25, side * 0.3, side * -0.36);
      this.head.add(brow);
    }
    // The beak: small, hooked, between and below his eyes.
    this.beak.position.set(0, 0.2, faceZ(0, 0.2) + 0.004);
    const hook = limb(0.04, 0.006, 0.105, C.beak, 4, softMat);
    hook.rotation.x = 0.42;
    this.beak.add(hook);
    this.head.add(this.beak);
    if (look === 'tawny') {
      // Ear tufts: a feather up and out from the end of each brow.
      for (const side of [-1, 1]) {
        const tuft = turned([[0, 0], [0.05, 0.03], [0.04, 0.12], [0, 0.2]], C.coatDark, 4, 0.4, false, owlWingMat);
        tuft.rotation.set(-0.15, 0, side * -0.55);
        tuft.position.set(side * 0.17, 0.37, 0.05);
        this.head.add(tuft);
      }
      // An apron, laid on her front and tied behind: she keeps the bar. Its bottom corners rounded.
      const apron: Array<[number, number]> = [[-0.17, 0.5], [0.17, 0.5], [0.185, 0.3], [0.15, 0.19], [0.07, 0.15], [-0.07, 0.15], [-0.15, 0.19], [-0.185, 0.3]];
      this.body.add(laidOn(OWL_BODY, OWL_DEEP, apron, [0, 0.34], 0.014, 0xe9e2d0, softMat));
      // (Its strings, round her middle.)
      this.body.add(turned([[0.286, 0], [0.298, 0.014], [0.286, 0.028]], 0xcfc6ae, 12, OWL_DEEP, false, softMat).translateY(0.47));
    } else {
      // A monocle, and a bow tie: two wings of it and a knot.
      const glass = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.009, 4, 12), new THREE.MeshBasicMaterial({ color: 0xd9b24a }));
      glass.position.set(0.1, 0.262, faceZ(0.1, 0.262) + 0.018);
      glass.rotation.y = 0.3;
      this.head.add(glass);
      const z = OWL_DEEP * outAt(OWL_BODY, 0.685) + 0.03;
      for (const side of [-1, 1]) {
        const half = kit.cone(0.055, 0.11, 0x8a2a3a, 4);
        half.rotation.z = side * Math.PI / 2;
        half.scale.z = 0.5;
        half.position.set(side * 0.115, 0.685, z);
        this.body.add(half);
      }
      this.body.add(kit.blob(0.028, 0.03, 0.022, 0x6e2030, 0, 0.685, z + 0.005, 5, 4, 0));
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
    this.head.rotation.x = (Common.listening(ctx) ? 0.07 * Math.max(0, Math.sin(t * 2.4)) ** 3 : 0) + (ctx.talking ? 0.05 * Math.sin(t * 8) : 0) - 0.45 * this.sip + (ctx.nod ?? 0);
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

// ---------------------------------------------------------------------------------------------------------------
// JINX: a girl rat, and a punk. (The owner, 2026-11-16: "I want to make a girl rat character, like a more feminine
// version of the main character but also sort of punk rock type maybe she's got like a notch cut out of one of her
// ears and she's got some like emo hair going on ... she dresses really feminine but she's got like this like Punk
// goth rocker style and her tail is longer and usually up or curling around and she wears a skirt. She also just hangs
// out in Dave's area for now". The pictures he sent with it were for the mood: she is nobody's character but his.)
//
// A rat as the knight is a rat (round ears, a pointed face) but slighter and longer in the leg. Dark fur, pale at the
// muzzle and paws. ONE ear has a notch out of its rim, and two gold rings in it. Her hair is one long fringe swept
// across her face and down over her left eye, dyed from black at its root to hot pink at its ends, and a cap of the same
// black over the back of her head, ragged at the nape. A studded collar, a black knit top, striped warmers on her
// arms; a short pleated tartan skirt; striped stockings and heavy boots. Her tail is half as long again as she is
// tall and never lies down: it stands up behind her and curls over at its end, and the curl comes and goes.
// A few shaped pieces, flat-faced, and every one of them has its picture (render/textures.ts).
// ---------------------------------------------------------------------------------------------------------------

const JINX = {
  fur: 0x5a5262, furDark: 0x3e3846, pale: 0xeadcd6, earIn: 0xe58fb0, nose: 0xf07a9c, tail: 0xd9a6b4,
  hair: 0x2a1c3a, dye: 0xff3e9a, top: 0x34303e, stud: 0xd8d8e4, gold: 0xf2c832, boot: 0x2a2630, sole: 0xcfc8d8, lid: 0x7a3cff,
} as const;
/** How long her thigh and her shin are (she is longer in the leg than the knight), and so how high her hips stand. */
const J_THIGH = 0.2;
const J_SHIN = 0.24;
const J_LEG = J_THIGH + J_SHIN + 0.035;
/** Her tail: how many lengths, and how long each. */
const J_TAIL = { parts: 10, each: 0.13 } as const;

/** What she is made of. */
const jinxFur = createPs1Material({ lit: true, tex: getTexture('shortFur') });
const jinxHair = createPs1Material({ lit: true, shine: 0.35, tex: getTexture('hairStrands'), side: THREE.DoubleSide });
const jinxKnit = createPs1Material({ lit: true, tex: getTexture('knit') });
const jinxTartan = createPs1Material({ lit: true, tex: getTexture('tartan') });
const jinxSock = createPs1Material({ lit: true, tex: getTexture('stripeSock') });
const jinxTail = createPs1Material({ lit: true, tex: getTexture('ratTail') });
const GOLD = new THREE.MeshBasicMaterial({ color: JINX.gold });
const STUD = new THREE.MeshBasicMaterial({ color: JINX.stud });

/**
 * A rat's ear: a round flat leaf standing in the x-y plane, its root at the origin, facing +z. Pink inside (its
 * front), fur behind. `notch`: a bite out of its rim, up and to the outside.
 */
export function ratEar(r: number, notch: boolean, fur: number, inside: number): THREE.BufferGeometry {
  const N = 10;
  const T = 0.012;
  const rim: THREE.Vector2[] = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    // (The bite: one point of its rim drawn most of the way in.)
    const k = notch && i === 4 ? 0.42 : 1;
    rim.push(new THREE.Vector2(Math.cos(a) * r * k, r + Math.sin(a) * r * k));
  }
  const pos: number[] = [];
  const col: number[] = [];
  const uvs: number[] = [];
  const F = new THREE.Color(fur);
  const I = new THREE.Color(inside);
  const put = (x: number, y: number, z: number, c: THREE.Color): void => {
    pos.push(x, y, z);
    col.push(c.r, c.g, c.b);
    uvs.push(x / (2 * r) + 0.5, y / (2 * r));
  };
  for (let i = 0; i < N; i++) {
    const a = rim[i];
    const b = rim[(i + 1) % N];
    // Its front: the inside of the ear, a rim of fur round it.
    put(0, r, T, I); put(a.x * 0.8, r + (a.y - r) * 0.8, T, I); put(b.x * 0.8, r + (b.y - r) * 0.8, T, I);
    put(a.x * 0.8, r + (a.y - r) * 0.8, T, F); put(a.x, a.y, 0, F); put(b.x, b.y, 0, F);
    put(a.x * 0.8, r + (a.y - r) * 0.8, T, F); put(b.x, b.y, 0, F); put(b.x * 0.8, r + (b.y - r) * 0.8, T, F);
    // Its back.
    put(0, r, -T, F); put(b.x, b.y, 0, F); put(a.x, a.y, 0, F);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.computeVertexNormals();
  return geo;
}

/**
 * A lock of hair: a blade along a path, `path` its middle line and `wide` how wide it is at each point (0 at a
 * point: it ends in one). Flat-faced: a ridge down its middle, a face either side. `color(k)`: its colour, root (0)
 * to end (1).
 */
function lock(path: Array<[number, number, number]>, wide: number[], out: [number, number, number], color: (k: number) => number): THREE.Mesh {
  const P = path.map((q) => new THREE.Vector3(...q));
  const O = new THREE.Vector3(...out).normalize();
  const pos: number[] = [];
  const col: number[] = [];
  const uvs: number[] = [];
  const c = new THREE.Color();
  const ring = (i: number): [THREE.Vector3, THREE.Vector3, THREE.Vector3] => {
    const along = P[Math.min(P.length - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize();
    const across = new THREE.Vector3().crossVectors(along, O).normalize().multiplyScalar(wide[i] / 2);
    return [P[i].clone().sub(across), P[i].clone().addScaledVector(O, wide[i] * 0.28), P[i].clone().add(across)];
  };
  const put = (v: THREE.Vector3, k: number, u: number): void => {
    pos.push(v.x, v.y, v.z);
    c.set(color(k));
    col.push(c.r, c.g, c.b);
    uvs.push(u, 1 - k);
  };
  for (let i = 0; i + 1 < P.length; i++) {
    const a = ring(i);
    const b = ring(i + 1);
    const ka = i / (P.length - 1);
    const kb = (i + 1) / (P.length - 1);
    for (const [l, r, ul, ur] of [[0, 1, 0, 0.5], [1, 2, 0.5, 1]] as const) {
      put(a[l], ka, ul); put(b[l], kb, ul); put(a[r], ka, ur);
      put(a[r], ka, ur); put(b[l], kb, ul); put(b[r], kb, ur);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, jinxHair);
  return m;
}

class Jinx implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.42;
  private readonly body = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly fringe = new THREE.Group();
  private readonly ears: THREE.Group[] = [];
  private readonly arms: Array<{ upper: THREE.Group; fore: THREE.Group; side: number }> = [];
  private readonly legs: Array<{ thigh: THREE.Group; shin: THREE.Group; side: number }> = [];
  private readonly tail: THREE.Group[] = [];
  private readonly mugHand = new THREE.Group();
  private readonly common: Common;
  private sip = 0;

  constructor() {
    const C = JINX;
    this.root.add(this.body);
    this.body.position.y = J_LEG;
    // Her skirt: short, flared, pleated (its picture is the tartan, and the pleats are in it). It hangs from her waist.
    this.body.add(turned([[0, -0.1], [0.2, -0.17], [0.235, -0.165], [0.19, -0.07], [0.105, 0.035], [0, 0.04]], 0xffffff, 10, 0.92, false, jinxTartan));
    // Her body: ONE piece from her waist to the root of her neck, narrow at the waist: a black knit top.
    this.body.add(this.chest);
    this.chest.position.y = 0.02;
    this.chest.add(turned([[0, 0], [0.098, 0.01], [0.088, 0.1], [0.118, 0.24], [0.112, 0.31], [0.058, 0.365], [0, 0.37]], C.top, 6, 0.8, false, jinxKnit));
    // A collar with studs round it.
    this.chest.add(turned([[0.05, 0], [0.071, 0.008], [0.071, 0.04], [0.05, 0.048]], 0x1a1620, 8, 0.9).translateY(0.352));
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.55;
      this.chest.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.014), STUD).translateX(Math.sin(a) * 0.072).translateY(0.376).translateZ(Math.cos(a) * 0.066));
    }
    // Legs: striped stockings to the thigh, and heavy boots with pale soles.
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.062, 0.0, 0);
      thigh.add(limb(0.058, 0.046, J_THIGH, 0xffffff, 6, jinxSock));
      const shin = new THREE.Group();
      shin.position.set(0, -J_THIGH, 0);
      shin.add(limb(0.046, 0.038, J_SHIN, 0xffffff, 6, jinxSock));
      shin.add(kit.box(0.1, 0.13, 0.13, C.boot, 0, -J_SHIN + 0.04, 0.005));
      shin.add(kit.box(0.1, 0.075, 0.11, C.boot, 0, -J_SHIN + 0.012, 0.115));
      shin.add(kit.box(0.108, 0.03, 0.245, C.sole, 0, -J_SHIN - 0.02, 0.055));
      thigh.add(shin);
      this.body.add(thigh);
      this.legs.push({ thigh, shin, side });
    }
    // Arms: slight; a striped warmer from elbow to wrist, a pale paw.
    for (const side of [-1, 1]) {
      const upper = new THREE.Group();
      upper.position.set(side * 0.118, 0.3, 0);
      upper.add(limb(0.04, 0.034, 0.19, C.fur, 5, jinxFur));
      const fore = new THREE.Group();
      fore.position.set(0, -0.19, 0);
      fore.add(limb(0.04, 0.03, 0.17, 0xffffff, 5, jinxSock));
      fore.add(kit.box(0.05, 0.058, 0.046, C.pale, 0, -0.195, 0.006));
      upper.add(fore);
      if (side > 0) {
        this.mugHand.position.set(0, -0.21, 0.07);
        this.mugHand.add(mug());
        fore.add(this.mugHand);
      }
      this.chest.add(upper);
      this.arms.push({ upper, fore, side });
    }
    // The head: ONE wedge, wide at the cheeks and running out to a pink nose, pale underneath and round the muzzle.
    this.head.position.set(0, 0.43, 0.0);
    this.chest.add(this.head);
    this.head.add(turned(
      [[0, -0.14], [0.115, -0.11], [0.17, -0.02], [0.152, 0.06], [0.07, 0.18], [0.036, 0.255], [0, 0.265]],
      (_nx, ny, nz) => (ny < -0.35 || nz > 0.42 ? C.pale : C.fur), 7, 0.86, true, jinxFur,
    ).translateY(0.1));
    this.head.add(kit.blob(0.03, 0.026, 0.026, C.nose, 0, 0.102, 0.266, 5, 4, 0));
    this.jaw.position.set(0, 0.045, 0.09);
    this.jaw.add(turned([[0, 0], [0.042, 0.02], [0.02, 0.15], [0, 0.16]], C.pale, 4, 0.5, true, jinxFur));
    this.head.add(this.jaw);
    // Ears: big and round, set wide. Her right one (the one her hair leaves showing) has the notch, and two gold rings.
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.125, 0.19, -0.035);
      ear.userData.side = side;
      const leaf = new THREE.Mesh(ratEar(0.125, side < 0, C.furDark, C.earIn), jinxFur);
      // (The notch is cut up and to the OUTSIDE of the ear that has it: its leaf is turned over.)
      if (side < 0) leaf.scale.x = -1;
      ear.add(leaf);
      if (side < 0) for (const [x, y] of [[-0.118, 0.1], [-0.105, 0.055]]) ear.add(new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 3, 6), GOLD).translateX(x).translateY(y).rotateY(Math.PI / 2));
      ear.rotation.set(-0.12, side * -0.5, side * -0.42);
      this.head.add(ear);
      this.ears.push(ear);
    }
    // Eyes: large, a heavy violet lid over each and a flick of black at its corner.
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const e = eye(0.05, 0.03);
      e.position.set(side * 0.086, 0.128, 0.104);
      e.rotation.y = side * 0.5;
      this.head.add(e);
      eyes.push(e);
      const lid = kit.box(0.1, 0.014, 0.03, C.lid, side * 0.09, 0.181, 0.1);
      lid.rotation.set(0, side * 0.5, side * 0.12);
      this.head.add(lid);
      const flick = kit.box(0.05, 0.012, 0.012, 0x14100c, side * 0.137, 0.152, 0.07);
      flick.rotation.set(0, side * 0.9, side * 0.55);
      this.head.add(flick);
    }
    // Her hair. A cap of it over the back of her head, ragged at the nape; and the fringe, ONE long lock from her
    // crown forward and down across her face, over her left eye, to a point by her cheek. Black to hot pink.
    const dip = (k: number): number => (k < 0.38 ? C.hair : mix(C.hair, C.dye, Math.min(1, (k - 0.38) / 0.3)));
    this.head.add(turned([[0.165, -0.035], [0.178, 0.03], [0.15, 0.1], [0.085, 0.158], [0, 0.175]], C.hair, 7, 0.84, false, jinxHair).translateY(0.1).translateZ(-0.068));
    for (const [x, a] of [[-0.085, 0.3], [0, 0], [0.085, -0.3]] as const) {
      this.head.add(lock([[x, 0.12, -0.19], [x * 1.15, 0.03, -0.215], [x * 1.25, -0.07, -0.19]], [0.12, 0.1, 0], [Math.sin(-a), 0.1, -1], dip));
    }
    this.fringe.position.set(0.0, 0.262, -0.02);
    this.fringe.add(lock(
      [[0, 0, 0], [0.045, 0.012, 0.085], [0.1, -0.05, 0.16], [0.128, -0.15, 0.172], [0.118, -0.25, 0.15]],
      [0.17, 0.2, 0.18, 0.12, 0], [0.25, 0.5, 1], dip,
    ));
    // (And a short lock the other way, off her brow, so the parting shows.)
    this.fringe.add(lock([[-0.01, 0, 0.01], [-0.07, -0.01, 0.075], [-0.125, -0.07, 0.085]], [0.1, 0.1, 0], [-0.3, 0.6, 1], dip));
    this.head.add(this.fringe);
    // Her tail: long, bare, ringed. A chain of short lengths, each hinged on the last, from the back of her skirt.
    let on: THREE.Object3D = this.body;
    for (let i = 0; i < J_TAIL.parts; i++) {
      const part = new THREE.Group();
      part.position.set(0, i === 0 ? -0.02 : J_TAIL.each, i === 0 ? -0.1 : 0);
      const r0 = 0.034 * (1 - i / J_TAIL.parts) + 0.008;
      const r1 = 0.034 * (1 - (i + 1) / J_TAIL.parts) + 0.008;
      // (Open-ended: each length's ends are inside the next and the last.)
      const geo = new THREE.CylinderGeometry(r1, r0, J_TAIL.each * 1.06, 5, 1, i < J_TAIL.parts - 1);
      geo.translate(0, J_TAIL.each / 2, 0);
      part.add(new THREE.Mesh(paintFaces(faceted(geo), C.tail, 0.1), jinxTail));
      on.add(part);
      this.tail.push(part);
      on = part;
    }
    // (A black bow tied near its end.)
    for (const s of [-1, 1]) {
      const wing = kit.cone(0.035, 0.07, 0x1a1620, 4);
      wing.rotation.z = s * Math.PI / 2;
      wing.position.set(s * 0.07, J_TAIL.each * 0.5, 0);
      this.tail[J_TAIL.parts - 3].add(wing);
    }
    this.common = new Common(eyes, 0.78);
  }

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const lean = ctx.doing === 'lean' && !ctx.seated;
    const speaking = ctx.talking || this.common.mouth > 0.05;
    // She keeps time with the room: a nod of her head and a tap of one boot, on the beat. (Not while she talks.)
    const beat = Math.max(0, Math.sin(t * 5.2)) ** 3;
    const groove = speaking ? 0 : 1;
    // Standing with her weight on one hip, sitting, or leaning back on something with one boot up against it.
    this.body.position.y = ctx.seated ? SEAT + 0.07 : J_LEG - (lean ? 0.015 : 0) - 0.008 * beat * groove;
    this.body.position.z = lean ? -0.06 : 0;
    this.body.rotation.set(lean ? -0.16 : ctx.seated ? 0.04 : 0, 0, ctx.seated || lean ? 0 : 0.06);
    this.chest.rotation.set((lean ? 0.1 : 0) + 0.02 * Math.sin(t * 1.6), 0, ctx.seated || lean ? 0 : -0.1);
    for (const leg of this.legs) {
      if (ctx.seated) {
        // (One leg over the other.)
        leg.thigh.rotation.set(-1.5, 0, leg.side > 0 ? -0.22 : 0.06);
        leg.shin.rotation.set(leg.side > 0 ? 1.15 + 0.12 * Math.sin(t * 2.6) : 1.5, 0, 0);
      } else if (lean) {
        leg.thigh.rotation.set(leg.side > 0 ? -0.75 : 0.18, 0, 0);
        leg.shin.rotation.set(leg.side > 0 ? 1.7 : 0, 0, 0);
      } else {
        // Weight on her left leg; the right one out a little, its toe tapping.
        leg.thigh.rotation.set(leg.side > 0 ? -0.16 - 0.1 * beat * groove : 0.02, 0, leg.side > 0 ? 0.14 : -0.06);
        leg.shin.rotation.set(leg.side > 0 ? 0.2 + 0.16 * beat * groove : 0, 0, 0);
      }
    }
    // The tail: up behind her and curled over at its end; the curl winds and unwinds, and the whole of it sways.
    // (Sitting, it comes out behind the stool first and then goes up.)
    const wind = 0.5 + 0.5 * Math.sin(t * 0.7);
    this.tail.forEach((part, i) => {
      const u = i / (J_TAIL.parts - 1);
      // (Out behind her first, clear of her back and her head, and then up.)
      const base = i === 0 ? (ctx.seated ? -1.9 : lean ? -1.5 : -1.45) : i < 4 ? (ctx.seated ? 0.45 : 0.3) : 0;
      const curl = u > 0.4 ? (0.4 + 0.6 * wind) * ((u - 0.4) / 0.6) ** 0.7 : 0;
      part.rotation.x = base + curl + 0.05 * Math.sin(t * 2.1 - i * 0.7);
      part.rotation.z = (0.07 + 0.05 * u) * Math.sin(t * (speaking ? 2.4 : 1.2) - i * 0.5);
    });
    // Ears: the notched one flicks.
    this.ears.forEach((ear, i) => {
      const side = ear.userData.side as number;
      const flick = now(t, 3.7 + i * 2.1, 0.26, i * 1.6);
      ear.rotation.set(-0.12 - 0.12 * flick, side * -0.5, side * (-0.42 - 0.3 * flick) + (Common.listening(ctx) ? side * -0.06 : 0));
    });
    // The head: turned to whoever it is, cocked to one side; nodding to the beat; a toss of the fringe now and then.
    const toss = now(t, 9.5, 0.7, 4);
    this.head.rotation.y = ctx.headYaw + 0.25 * toss;
    this.head.rotation.x = (lean ? 0.12 : 0.02) + 0.07 * beat * groove + (ctx.talking ? 0.05 * Math.sin(t * 8.5) : 0) - 0.5 * this.sip - 0.12 * toss + (ctx.nod ?? 0);
    this.head.rotation.z = -0.1 + 0.05 * Math.sin(t * 0.6) + 0.14 * toss;
    this.fringe.rotation.set(0.05 * beat * groove - 0.2 * toss, 0, 0.03 * Math.sin(t * 2.3) + 0.1 * toss);
    this.jaw.rotation.x = 0.5 * this.common.mouth;
    // Arms: one paw on her hip and the other hanging, standing; folded when she leans; a mug when she has one; a
    // turn of the wrist when she talks.
    const drinking = ctx.doing === 'drink' && !ctx.talking;
    this.sip = drinking ? now(t, 6.8, 2.2, 1.2) : ease(this.sip, 0, dt, 8);
    this.mugHand.visible = ctx.doing === 'drink';
    for (const arm of this.arms) {
      const s = arm.side;
      if (lean) {
        arm.upper.rotation.set(-0.5, 0, s * 0.22);
        arm.fore.rotation.set(-1.2, 0, s * -1.3 + (s > 0 ? 0.12 : 0));
      } else if (s > 0 && this.mugHand.visible) {
        arm.upper.rotation.set(-0.55 - 0.85 * this.sip, 0, s * 0.12);
        arm.fore.rotation.set(-1.0 - 0.75 * this.sip, 0, s * -0.25);
        this.mugHand.rotation.x = 1.5 + 0.5 * this.sip;
      } else if (ctx.seated) {
        arm.upper.rotation.set(-0.5, 0, s * 0.12);
        arm.fore.rotation.set(-0.8, 0, s * -0.5);
      } else if (s < 0) {
        // One paw on her hip, elbow out.
        const wave = speaking ? 0.3 * Math.max(0, Math.sin(t * 4.2)) : 0;
        arm.upper.rotation.set(0.25 - 0.5 * wave, 0, s * (0.75 - 0.3 * wave));
        arm.fore.rotation.set(-0.5 - 0.9 * wave, 0, s * (-1.7 + 0.9 * wave));
      } else {
        const wave = speaking ? 0.5 + 0.45 * Math.sin(t * 5 + 1.3) : 0;
        arm.upper.rotation.set(-0.05 - 0.5 * wave, 0, s * (0.14 + 0.2 * wave));
        arm.fore.rotation.set(-0.12 - 0.9 * wave, 0, 0);
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------
// NEWCOMERS (2026-11-20, for Fable; the owner: "most of the characters were designed by Opus in the first place so we
// could also pump out a bunch of different characters for Fable to work on later"). Two more animals made into cute
// characters, two of each: a MOLE (short, round, velvet, big pink spade hands, a long pink nose, eyes he can hardly
// open) and a HEDGEHOG (round, a coat of spines over his back and head, a pointed snout). They do all the regulars do:
// stand, drink, chat, lean, play cards, keep the bar, sit on a stool. Shown in the Green Room (Test Room 17).
// ---------------------------------------------------------------------------------------------------------------

const MOLE = {
  /** Digger: a miner, a yellow helmet with a lamp on it. */
  digger: { coat: 0x3a3440, light: 0x5e5668, pink: 0xe8a0a0, pinkDark: 0xb87070, claw: 0xf0e4cc, cloth: 0x7a5232 },
  /** Dot: round spectacles and a knitted scarf. */
  dot: { coat: 0x26222c, light: 0x48424f, pink: 0xf4b4bc, pinkDark: 0xc8888f, claw: 0xf4ead8, cloth: 0x3a8a6a },
} as const;
const HEDGEHOG = {
  /** Bramble: brown spines, a green apron. */
  bramble: { face: 0xd8b48a, belly: 0xf2dcbc, spine: 0x5e4028, tip: 0xe8d4b0, nose: 0x1a1210, cloth: 0x4a7a3a, clothDark: 0x355a2a },
  /** Thistle: pale spines, a thistle flower in them, rosy cheeks. */
  thistle: { face: 0xeedcc6, belly: 0xfbf1e2, spine: 0xb8a690, tip: 0xfbf5ea, nose: 0x3a2a2a, cloth: 0x8a4a9a, clothDark: 0x6a3878 },
} as const;
/** How long a newcomer's legs are (short), and so how high his hips stand. */
const N_LEG = 0.16;

/** A small round regular's frame: body, chest, head, arms with a mug and a hand of cards, short legs. What differs is built by each. */
abstract class Small implements PatronBody {
  readonly root = new THREE.Group();
  abstract readonly height: number;
  protected readonly body = new THREE.Group();
  protected readonly chest = new THREE.Group();
  protected readonly head = new THREE.Group();
  protected readonly arms: Array<{ upper: THREE.Group; fore: THREE.Group; side: number }> = [];
  protected readonly legs: Array<{ thigh: THREE.Group; side: number }> = [];
  protected readonly mugHand = new THREE.Group();
  protected readonly cards = new THREE.Group();
  protected common!: Common;
  private sip = 0;

  constructor() {
    this.root.add(this.body);
    this.body.position.y = N_LEG;
    this.body.add(this.chest);
  }
  /** Short legs, a foot each. */
  protected addLegs(r: number, x: number, color: number, foot: number): void {
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * x, 0, 0.02);
      thigh.add(limb(r, r * 0.85, N_LEG, color));
      thigh.add(kit.box(r * 1.7, 0.05, r * 2.6, foot, 0, -N_LEG + 0.025, r * 0.7));
      this.body.add(thigh);
      this.legs.push({ thigh, side });
    }
  }
  /** Arms: upper and fore, and what each hand holds; `hand` makes the hand on the end of each. */
  protected addArms(x: number, y: number, r: number, upper: number, fore: number, color: number, hand: (side: number) => THREE.Object3D): void {
    for (const side of [-1, 1]) {
      const up = new THREE.Group();
      up.position.set(side * x, y, 0.02);
      up.add(limb(r, r * 0.85, upper, color));
      const fo = new THREE.Group();
      fo.position.set(0, -upper, 0);
      fo.add(limb(r * 0.85, r * 0.75, fore, color));
      const h = hand(side);
      h.position.y = -fore;
      fo.add(h);
      up.add(fo);
      if (side > 0) {
        this.mugHand.position.set(0, -fore - 0.03, 0.07);
        this.mugHand.add(mug());
        fo.add(this.mugHand);
      } else {
        this.cards.position.set(0, -fore - 0.02, 0.05);
        for (let i = 0; i < 4; i++) {
          const fan = new THREE.Group();
          fan.rotation.z = (i - 1.5) * 0.28;
          fan.position.z = i * 0.004;
          fan.add(kit.box(0.07, 0.1, 0.006, i % 2 ? 0xe9e2cf : 0xdcd3bb, 0, 0.05, 0));
          this.cards.add(fan);
        }
        fo.add(this.cards);
      }
      this.chest.add(up);
      this.arms.push({ upper: up, fore: fo, side });
    }
  }
  /** What each does with his face as he talks and listens (a snout wiggled, a nose twitched). */
  protected abstract face(t: number, ctx: PatronCtx, mouth: number): void;

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const lean = ctx.doing === 'lean' && !ctx.seated;
    const speaking = ctx.talking || this.common.mouth > 0.05;
    // Standing (a little bob as he breathes), sitting with his legs out in front, or leaning back.
    this.body.position.y = ctx.seated ? SEAT + 0.07 : N_LEG;
    // (He breathes in his chest, not his legs: his feet stay on the floor.)
    this.chest.position.y = 0.008 * Math.sin(t * 1.9);
    this.body.position.z = lean ? -0.06 : 0;
    this.body.rotation.x = lean ? -0.16 : ctx.seated ? 0.05 : 0;
    this.chest.rotation.x = (ctx.doing === 'cards' ? 0.14 : 0) + 0.025 * Math.sin(t * 1.7);
    this.chest.rotation.z = 0.03 * Math.sin(t * 0.8);
    for (const leg of this.legs) leg.thigh.rotation.set(ctx.seated ? -1.45 : lean && leg.side > 0 ? 0.35 : 0, 0, leg.side * (ctx.seated ? 0.15 : 0.04));
    const peek = ctx.doing === 'cards' && !ctx.talking ? now(t, 6.5, 2.2, ctx.turn * 3) : 0;
    this.head.rotation.y = ctx.headYaw * (1 - 0.8 * peek);
    this.head.rotation.x = 0.3 * peek + (Common.listening(ctx) ? 0.08 * Math.max(0, Math.sin(t * 2.9)) ** 3 : 0) + (ctx.talking ? 0.05 * Math.sin(t * 8.5) : 0) - 0.45 * this.sip + (ctx.nod ?? 0);
    this.head.rotation.z = 0.08 * Math.sin(t * 0.6);
    this.face(t, ctx, this.common.mouth);
    const drinking = ctx.doing === 'drink' && !ctx.talking;
    this.sip = drinking ? now(t, 6.4, 2.2) : ease(this.sip, 0, dt, 8);
    this.mugHand.visible = ctx.doing === 'drink' || ctx.doing === 'tend';
    this.cards.visible = ctx.doing === 'cards';
    for (const arm of this.arms) {
      const s = arm.side;
      if (lean) {
        // Arms folded over his round middle.
        arm.upper.rotation.set(-0.55, 0, s * 0.3);
        arm.fore.rotation.set(-1.3, 0, s * -1.2);
      } else if (s > 0 && this.mugHand.visible) {
        const rub = ctx.doing === 'tend' ? 0.15 * Math.sin(t * 5) : 0;
        arm.upper.rotation.set(-0.6 - 0.8 * this.sip + rub, 0, s * 0.15);
        arm.fore.rotation.set(-1.0 - 0.7 * this.sip, 0, s * -0.3);
        this.mugHand.rotation.x = 1.5 + 0.5 * this.sip;
      } else if (s < 0 && this.cards.visible) {
        arm.upper.rotation.set(-0.5 - 0.2 * peek, 0, s * 0.12);
        arm.fore.rotation.set(-1.4 - 0.2 * peek, 0, s * -0.5);
        this.cards.rotation.set(1.2, 0, 0);
      } else if (s < 0 && ctx.doing === 'tend') {
        // The rag going round the mug in the other hand.
        arm.upper.rotation.set(-0.7 + 0.1 * Math.sin(t * 6), 0, s * -0.1 + 0.1 * Math.cos(t * 6));
        arm.fore.rotation.set(-1.1, 0, s * -0.6);
      } else {
        const wave = speaking ? 0.5 + 0.45 * Math.sin(t * 5 + s * 1.3) : 0;
        const rest = ctx.seated ? -0.6 : 0;
        arm.upper.rotation.set(rest - 0.5 * wave, 0, s * (0.25 + 0.2 * wave));
        arm.fore.rotation.set(rest * 0.8 - 0.8 * wave - 0.15, 0, 0);
      }
    }
  }
}

class Mole extends Small {
  readonly height = 1.0;
  private readonly snout = new THREE.Group();

  constructor(private readonly look: 'digger' | 'dot') {
    super();
    const C = MOLE[look];
    ink = furMat;
    // ONE round body, pear-shaped, wider at the bottom; a paler front.
    this.chest.add(turned(
      [[0, 0], [0.2, 0.03], [0.26, 0.17], [0.25, 0.32], [0.19, 0.45], [0.1, 0.52], [0, 0.53]],
      (_nx, ny, nz) => (nz > 0.35 && ny > -0.6 && ny < 0.6 ? C.light : C.coat), 7, 0.9,
    ));
    this.addLegs(0.06, 0.12, C.coat, C.pink);
    // Arms: short, and on the end of each a SPADE of a hand, wide and pink, four pale claws along its edge.
    this.addArms(0.23, 0.36, 0.055, 0.14, 0.11, C.coat, (side) => {
      const g = new THREE.Group();
      g.add(kit.box(0.14, 0.05, 0.11, C.pink, side * 0.01, -0.02, 0.01));
      for (let k = 0; k < 4; k++) g.add(kit.box(0.022, 0.05, 0.03, C.claw, -0.05 + k * 0.033, -0.065, 0.045));
      return g;
    });
    // The head: ONE round piece running into the body, and a long pink snout that goes everywhere first.
    this.head.position.set(0, 0.47, 0.05);
    this.chest.add(this.head);
    this.head.add(turned([[0, -0.08], [0.15, -0.05], [0.18, 0.04], [0.14, 0.13], [0, 0.18]], C.coat, 7, 0.95));
    this.snout.position.set(0, 0.02, 0.13);
    this.snout.add(turned([[0, 0], [0.07, 0.02], [0.06, 0.12], [0.035, 0.19], [0, 0.2]], C.pink, 6, 0.9, true, mat));
    this.snout.add(bead(0.03, new THREE.MeshBasicMaterial({ color: C.pinkDark }), 0, 0, 0.2));
    this.head.add(this.snout);
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const e = eye(0.022, 0.014);
      e.position.set(side * 0.075, 0.07, 0.135);
      e.rotation.y = side * 0.4;
      this.head.add(e);
      eyes.push(e);
    }
    if (look === 'digger') {
      // A miner's helmet: a yellow dome with a brim, and a lamp on its front that is always lit.
      const hat = new THREE.Group();
      hat.position.set(0, 0.1, 0);
      hat.add(turned([[0, 0], [0.17, 0], [0.16, 0.07], [0.1, 0.13], [0, 0.14]], (_x, ny) => (ny < -0.6 ? 0xb8902a : 0xe8c040), 8, 1, false, mat));
      const brim = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10, 1);
      hat.add(new THREE.Mesh(paintFaces(faceted(brim), 0xd8b030, 0), mat));
      hat.add(kit.box(0.06, 0.05, 0.04, 0x3a3a40, 0, 0.06, 0.15));
      hat.add(bead(0.024, new THREE.MeshBasicMaterial({ color: 0xfff2a0 }), 0, 0.06, 0.175));
      hat.rotation.x = -0.12;
      this.head.add(hat);
      // A belt of tools round his middle: a leather strap, a hammer's head.
      this.chest.add(turned([[0.255, 0], [0.26, 0.05], [0.255, 0.06]], C.cloth, 7, 0.9, false, mat).translateY(0.15));
      this.chest.add(kit.box(0.07, 0.04, 0.04, 0x8a8a92, 0.2, 0.17, 0.14));
    } else {
      // Round spectacles, and a knitted scarf with its end hanging down his front.
      for (const side of [-1, 1]) {
        const rim = new THREE.TorusGeometry(0.04, 0.008, 4, 10);
        const m = new THREE.Mesh(paintFaces(faceted(rim), 0x2a2018, 0), mat);
        m.position.set(side * 0.07, 0.07, 0.165);
        m.rotation.y = side * 0.25;
        this.head.add(m);
      }
      this.head.add(kit.box(0.04, 0.008, 0.008, 0x2a2018, 0, 0.075, 0.175));
      this.chest.add(turned([[0.1, 0], [0.18, 0.01], [0.17, 0.07], [0.09, 0.08]], (_x, ny) => (Math.round((ny + 1) * 3) % 2 ? C.cloth : 0xe8e0c8), 7, 1, false, mat).translateY(0.43));
      const end = limb(0.045, 0.04, 0.2, (_x, ny) => (Math.round((ny + 1) * 3) % 2 ? C.cloth : 0xe8e0c8), 4, mat);
      end.position.set(0.07, 0.47, 0.17);
      end.rotation.x = -0.25;
      this.chest.add(end);
    }
    ink = mat;
    this.common = new Common(eyes, 0.45);
  }

  protected face(t: number, ctx: PatronCtx, mouth: number): void {
    // His snout sniffs about all the time; talking, it lifts with each word.
    const sniff = now(t, 2.7, 0.5, this.look === 'dot' ? 1.1 : 0);
    this.snout.rotation.x = -0.35 * mouth + 0.08 * Math.sin(t * 17) * sniff;
    this.snout.rotation.y = 0.12 * Math.sin(t * 0.9 + (ctx.turn ? 1 : 0));
  }
}

class Hedgehog extends Small {
  readonly height = 1.0;
  private readonly nose = new THREE.Group();

  constructor(private readonly look: 'bramble' | 'thistle') {
    super();
    const C = HEDGEHOG[look];
    ink = softMat;
    // ONE round body: a soft pale front; the back is under the spines.
    this.chest.add(turned(
      [[0, 0], [0.2, 0.02], [0.26, 0.15], [0.25, 0.3], [0.2, 0.43], [0.1, 0.5], [0, 0.51]],
      (_nx, _ny, nz) => (nz > 0.25 ? C.belly : C.face), 7, 0.92,
    ));
    // The spines: a coat of cones over his back and the top of him, each pointing out, dark with a pale tip.
    this.chest.add(spines(0, 0.27, -0.02, [0.27, 0.27, 0.24], 90, (d) => d.z < 0.3 && d.y > -0.5, 0.16, C.spine, C.tip, 11));
    this.addLegs(0.055, 0.11, C.face, C.nose);
    this.addArms(0.22, 0.35, 0.05, 0.13, 0.11, C.face, () => {
      const g = new THREE.Group();
      g.add(bead(0.045, mat, 0, -0.02, 0.01));
      return g;
    });
    // The head: round, running out into a POINTED snout with a black button of a nose; spines over the back of it.
    this.head.position.set(0, 0.45, 0.06);
    this.chest.add(this.head);
    this.head.add(turned([[0, -0.08], [0.14, -0.05], [0.16, 0.04], [0.12, 0.13], [0, 0.17]], C.face, 7, 0.95));
    this.nose.position.set(0, 0.01, 0.12);
    this.nose.add(turned([[0, 0], [0.085, 0.02], [0.055, 0.11], [0.025, 0.18], [0, 0.19]], C.face, 6, 0.9, true));
    this.nose.add(bead(0.03, new THREE.MeshBasicMaterial({ color: C.nose }), 0, 0.005, 0.19));
    this.head.add(this.nose);
    this.head.add(spines(0, 0.05, -0.03, [0.15, 0.15, 0.14], 34, (d) => d.z < -0.05 && d.y > -0.2, 0.12, C.spine, C.tip, 23));
    for (const side of [-1, 1]) {
      // Small round ears, half hidden in the spines.
      this.head.add(bead(0.04, mat, side * 0.12, 0.12, 0.02));
      if (look === 'thistle') this.head.add(bead(0.03, new THREE.MeshBasicMaterial({ color: 0xf0a0a8 }), side * 0.1, 0.0, 0.11));
    }
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      const e = eye(0.03, 0.018);
      e.position.set(side * 0.07, 0.07, 0.12);
      e.rotation.y = side * 0.35;
      this.head.add(e);
      eyes.push(e);
    }
    if (look === 'bramble') {
      // A green apron tied round his middle, its bib up his front.
      this.chest.add(kit.box(0.26, 0.26, 0.02, C.cloth, 0, 0.17, 0.235));
      this.chest.add(kit.box(0.16, 0.12, 0.02, C.clothDark, 0, 0.35, 0.215));
      this.chest.add(turned([[0.255, 0], [0.26, 0.03], [0.255, 0.035]], C.clothDark, 7, 0.92, false, mat).translateY(0.24));
    } else {
      // A thistle flower tucked in the spines over one ear, and a bow at her neck.
      const flower = new THREE.Group();
      flower.position.set(0.1, 0.16, -0.04);
      flower.add(bead(0.045, new THREE.MeshBasicMaterial({ color: 0xa860c8 }), 0, 0.04, 0));
      flower.add(turned([[0.05, 0], [0.04, 0.03], [0, 0.04]], 0x5a8a3a, 6, 1, false, mat));
      flower.rotation.z = -0.4;
      this.head.add(flower);
      for (const side of [-1, 1]) {
        const loop = kit.box(0.08, 0.05, 0.02, C.cloth, side * 0.045, 0.45, 0.2);
        loop.rotation.z = side * 0.3;
        this.chest.add(loop);
      }
      this.chest.add(bead(0.022, mat, 0, 0.45, 0.21));
    }
    ink = mat;
    this.common = new Common(eyes, 0.85);
  }

  protected face(t: number, ctx: PatronCtx, mouth: number): void {
    // The nose twitches, quick, now and then; talking, it bobs with each word.
    const twitch = now(t, 3.4, 0.35, this.look === 'thistle' ? 1.6 : 0.4);
    this.nose.rotation.x = -0.25 * mouth + 0.1 * Math.sin(t * 24) * twitch;
    this.nose.rotation.y = (ctx.talking ? 0.04 : 0) * Math.sin(t * 7);
  }
}

/**
 * A coat of spines: `n` cones spread evenly over an ellipsoid (middle x, y, z; radii), each standing out from its
 * surface, where `keep` says (by the way out from the middle). Dark from the root, pale at the tip; one mesh.
 */
function spines(x: number, y: number, z: number, radii: [number, number, number], n: number, keep: (d: THREE.Vector3) => boolean, length: number, root: number, tip: number, seed: number): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const a = new THREE.Color(root);
  const b = new THREE.Color(tip);
  let s = seed;
  const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647);
  const total = n * 3;
  for (let i = 0; i < total && parts.length < n; i++) {
    // (Points spread evenly over a ball: the golden-angle spiral.)
    const v = 1 - (2 * (i + 0.5)) / total;
    const r = Math.sqrt(1 - v * v);
    const th = i * 2.399963;
    const d = new THREE.Vector3(Math.cos(th) * r, v, Math.sin(th) * r);
    if (!keep(d)) continue;
    const len = length * (0.8 + 0.4 * rnd());
    const cone = new THREE.ConeGeometry(0.03, len, 4, 1).toNonIndexed();
    cone.deleteAttribute('uv');
    const pos = cone.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      c.copy(a).lerp(b, pos.getY(k) > len * 0.2 ? 1 : 0);
      cols.set([c.r, c.g, c.b], k * 3);
    }
    cone.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    cone.translate(0, len / 2, 0);
    // A little off the straight out, so they lie back as a hedgehog's do.
    const out = d.clone().add(new THREE.Vector3(0, 0.15, -0.35)).normalize();
    cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, out));
    cone.translate(x + d.x * radii[0] * 0.92, y + d.y * radii[1] * 0.92, z + d.z * radii[2] * 0.92);
    parts.push(cone);
  }
  return new THREE.Mesh(mergeGeometries(parts) ?? new THREE.BufferGeometry(), mat);
}

export function makePatron(kind: PatronKind, look: PatronLook): PatronBody {
  if (kind === 'turtle') return new Turtle(look === 'pebble' ? 'pebble' : 'mo');
  if (kind === 'ferret') return new Ferret(look === 'biscuit' ? 'biscuit' : 'slink');
  if (kind === 'owl') return new Owl(look === 'snow' ? 'snow' : 'tawny');
  if (kind === 'rat') return new Jinx();
  if (kind === 'mole') return new Mole(look === 'dot' ? 'dot' : 'digger');
  if (kind === 'hedgehog') return new Hedgehog(look === 'thistle' ? 'thistle' : 'bramble');
  return new Fox(look === 'ash' ? 'ash' : 'vix');
}
