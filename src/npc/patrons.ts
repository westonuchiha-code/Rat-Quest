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
import { bead, mix, modelKit, type ColorAt } from '../render/modelKit';

export type PatronKind = 'turtle' | 'fox';
export type PatronLook = 'mo' | 'pebble' | 'vix' | 'ash';
export type Doing = 'stand' | 'drink' | 'chat' | 'lean' | 'cards';

/** Which of the two of his kind he is: by name, like the mice and the birds. */
export function patronLook(kind: PatronKind, name: string): PatronLook {
  const n = name.toUpperCase();
  if (kind === 'turtle') return n.includes('PEBBLE') ? 'pebble' : 'mo';
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
  const g = new THREE.Group();
  const cup = kit.spar(0.058, 0.075, 0.15, 0xa9a79c, 7);
  cup.rotation.z = Math.PI / 2;
  cup.position.y = -0.075;
  g.add(cup);
  g.add(kit.blob(0.064, 0.012, 0.064, 0x5a3418, 0, 0.07, 0, 7, 3, 0));
  return g;
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
    // The shell: a dome on his back, its plates lighter in their middles, a pale rim; and the flat pale shield of his front.
    const dome: ColorAt = (nx, ny) => (ny < -0.7 || Math.abs(nx) > 0.9 ? C.rim : C.shell);
    this.shell.position.set(0, 0.5, -0.06);
    this.shell.add(kit.blob(0.37, 0.4, 0.27, dome, 0, 0, -0.06, 10, 7, 0.3));
    // Its plates: a row of three down the middle and two each side, each a low lighter boss on the dome.
    for (const [x, y, r] of [[0, 0.22, 0.13], [0, 0, 0.14], [0, -0.21, 0.12], [-0.2, 0.12, 0.1], [0.2, 0.12, 0.1], [-0.21, -0.1, 0.1], [0.21, -0.1, 0.1]]) {
      const back = -0.06 - 0.27 * Math.sqrt(Math.max(0, 1 - (x / 0.37) ** 2 - (y / 0.4) ** 2));
      const plate = kit.blob(r, r * 1.05, 0.03, C.scute, x, y, back + 0.012, 6, 4, 0.12);
      plate.rotation.set((y / 0.4) * 0.75, (x / 0.37) * -0.95, 0);
      this.shell.add(plate);
    }
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
// ---------------------------------------------------------------------------------------------------------------

const FOX = {
  vix: { coat: 0xd8702a, coatDark: 0xa84f1c, cream: 0xf3e3c4, sock: 0x33241c, earIn: 0x3a2018, cloth: 0x2f8f8a, clothDark: 0x226b68 },
  ash: { coat: 0x8a94a8, coatDark: 0x646e84, cream: 0xe6e8ee, sock: 0x24262e, earIn: 0x2a2c36, cloth: 0x6a3f8f, clothDark: 0x4f2f6c },
} as const;

class Fox implements PatronBody {
  readonly root = new THREE.Group();
  readonly height = 1.74;
  private readonly body = new THREE.Group();
  private readonly chest = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly ears: THREE.Group[] = [];
  private readonly arms: Array<{ upper: THREE.Group; fore: THREE.Group; side: number }> = [];
  private readonly legs: Array<{ thigh: THREE.Group; shin: THREE.Group; side: number }> = [];
  private readonly tail: THREE.Group[] = [];
  private readonly mugHand = new THREE.Group();
  private readonly cards = new THREE.Group();
  private readonly common: Common;
  private sip = 0;
  private flick = [0, 0];

  constructor(private readonly look: 'vix' | 'ash') {
    const C = FOX[look];
    this.root.add(this.body);
    this.body.position.y = 0.545;
    // Hips, and a narrow chest with a pale front.
    this.body.add(kit.blob(0.175, 0.14, 0.15, C.coat, 0, 0, 0, 7, 5));
    this.chest.position.set(0, 0.1, 0);
    this.body.add(this.chest);
    this.chest.add(kit.blob(0.2, 0.25, 0.165, (nx, ny, nz) => (nz > 0.25 && Math.abs(nx) < 0.62 - 0.25 * ny ? C.cream : C.coat), 0, 0.2, 0, 8, 6));
    // Legs: a thigh and a shin, dark from the knee down like stockings.
    for (const side of [-1, 1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * 0.1, -0.03, 0);
      thigh.add(kit.blob(0.088, 0.15, 0.092, C.coat, 0, -0.11, 0, 6, 5));
      const shin = new THREE.Group();
      shin.position.set(0, -0.23, 0);
      shin.add(kit.blob(0.066, 0.135, 0.068, C.sock, 0, -0.11, 0, 6, 5));
      shin.add(kit.blob(0.075, 0.04, 0.12, C.sock, 0, -0.235, 0.045, 6, 4));
      thigh.add(shin);
      this.body.add(thigh);
      this.legs.push({ thigh, shin, side });
    }
    // Arms: thin, dark gloves.
    for (const side of [-1, 1]) {
      const upper = new THREE.Group();
      upper.position.set(side * 0.22, 0.36, 0);
      upper.add(kit.blob(0.064, 0.135, 0.064, C.coat, 0, -0.11, 0, 6, 5));
      const fore = new THREE.Group();
      fore.position.set(0, -0.22, 0);
      fore.add(kit.blob(0.054, 0.12, 0.054, C.sock, 0, -0.1, 0, 6, 5));
      fore.add(kit.blob(0.064, 0.055, 0.068, C.sock, 0, -0.21, 0.01, 6, 4));
      upper.add(fore);
      if (side > 0) {
        this.mugHand.position.set(0, -0.24, 0.075);
        this.mugHand.add(mug());
        fore.add(this.mugHand);
      } else {
        // A hand of cards, fanned.
        this.cards.position.set(0, -0.22, 0.06);
        for (let i = 0; i < 4; i++) {
          const card = kit.box(0.075, 0.11, 0.006, i % 2 ? 0xe9e2cf : 0xdcd3bb, 0, 0.055, 0);
          const fan = new THREE.Group();
          fan.rotation.z = (i - 1.5) * 0.28;
          fan.position.z = i * 0.004;
          fan.add(card);
          this.cards.add(fan);
        }
        fore.add(this.cards);
      }
      this.chest.add(upper);
      this.arms.push({ upper, fore, side });
    }
    // The tail: three puffs, the last one white, each a group so it can curl and swing.
    let parent: THREE.Object3D = this.body;
    const puffs: Array<[number, number, number, number]> = [[0.1, 0.17, C.coat, 0.22], [0.15, 0.22, C.coat, 0.3], [0.125, 0.19, C.cream, 0.36]];
    puffs.forEach(([r, len, color, at], i) => {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0 : at, i === 0 ? -0.1 : 0);
      seg.add(kit.blob(r, len, r, i === 1 ? (_x: number, ny: number) => (ny > 0.55 ? C.cream : color) : color, 0, len * 0.8, 0, 7, 5));
      parent.add(seg);
      parent = seg;
      this.tail.push(seg);
    });
    // A neckerchief.
    this.chest.add(kit.blob(0.15, 0.055, 0.135, C.cloth, 0, 0.43, 0.01, 8, 4, 0.15));
    const knot = kit.cone(0.055, 0.15, C.clothDark, 4);
    knot.rotation.x = Math.PI - 0.45;
    knot.position.set(-0.04, 0.42, 0.11);
    this.chest.add(knot);
    // The head: a wide skull, a long pointed muzzle pale underneath, cheek tufts, tall ears dark at the back.
    this.head.position.set(0, 0.52, 0.02);
    this.head.scale.setScalar(1.32);
    this.chest.add(this.head);
    this.head.add(kit.blob(0.165, 0.135, 0.15, (_nx, ny, nz) => (ny < -0.25 && nz > 0 ? C.cream : C.coat), 0, 0.08, 0, 8, 6));
    const muzzle = kit.spar(0.085, 0.03, 0.2, (_x, ny) => (ny < 0.05 ? C.cream : C.coat), 6);
    muzzle.rotation.y = -Math.PI / 2;
    muzzle.position.set(0, 0.055, 0.1);
    this.head.add(muzzle);
    this.head.add(bead(0.028, BLACK, 0, 0.062, 0.305));
    this.jaw.position.set(0, 0.02, 0.1);
    const lower = kit.spar(0.05, 0.02, 0.15, C.cream, 5);
    lower.rotation.y = -Math.PI / 2;
    lower.position.y = -0.03;
    this.jaw.add(lower);
    this.head.add(this.jaw);
    for (const side of [-1, 1]) {
      const tuft = kit.cone(0.05, 0.11, C.cream, 4);
      tuft.rotation.z = side * -1.9;
      tuft.position.set(side * 0.13, 0.03, 0.02);
      this.head.add(tuft);
      const ear = new THREE.Group();
      ear.position.set(side * 0.105, 0.18, -0.01);
      ear.userData.side = side;
      // (Ash has lost the tip of one.)
      const tall = look === 'ash' && side < 0 ? 0.15 : 0.24;
      ear.add(kit.cone(0.075, tall, (_x, ny, nz) => (nz < -0.1 || ny > 0.5 ? C.sock : C.coat), 4));
      const inner = kit.cone(0.045, tall * 0.8, C.earIn, 3);
      inner.position.set(0, 0.01, 0.022);
      ear.add(inner);
      ear.rotation.z = side * -0.22;
      this.head.add(ear);
      this.ears.push(ear);
    }
    const eyes: THREE.Object3D[] = [];
    for (const side of [-1, 1]) {
      if (look === 'ash' && side > 0) {
        // An eyepatch, and its strap.
        this.head.add(kit.blob(0.05, 0.045, 0.02, 0x1c1c22, side * 0.075, 0.11, 0.13, 6, 4, 0));
        const strap = kit.box(0.36, 0.014, 0.014, 0x1c1c22, 0, 0.14, 0.03);
        strap.rotation.z = -0.3;
        this.head.add(strap);
        continue;
      }
      const e = eye(0.036, 0.019);
      e.position.set(side * 0.075, 0.11, 0.115);
      e.rotation.y = side * 0.35;
      e.rotation.z = side * 0.32; // narrow and sly
      this.head.add(e);
      eyes.push(e);
    }
    if (look === 'vix') this.head.add(bead(0.022, new THREE.MeshBasicMaterial({ color: 0xe8b83a }), 0.15, 0.2, -0.01));
    this.common = new Common(eyes, 0.72);
  }

  update(dt: number, ctx: PatronCtx): void {
    const t = ctx.time;
    this.common.step(dt, ctx);
    const lean = ctx.doing === 'lean' && !ctx.seated;
    const speaking = ctx.talking || this.common.mouth > 0.05;
    // Standing, sitting (thighs out, shins down), or leaning back on something with one foot crossed over.
    this.body.position.y = ctx.seated ? SEAT + 0.07 : lean ? 0.57 : 0.545;
    this.body.position.z = lean ? -0.06 : 0;
    this.body.rotation.x = lean ? -0.2 : ctx.seated ? 0.06 : 0;
    this.chest.rotation.x = (lean ? 0.14 : ctx.doing === 'cards' ? 0.2 : 0) + 0.02 * Math.sin(t * 1.7);
    for (const leg of this.legs) {
      if (ctx.seated) {
        leg.thigh.rotation.set(-1.45, 0, leg.side * 0.12);
        leg.shin.rotation.set(1.4 + 0.12 * Math.sin(t * 1.8 + leg.side), 0, 0);
      } else if (lean) {
        leg.thigh.rotation.set(leg.side > 0 ? 0.42 : 0.12, 0, leg.side > 0 ? -0.28 : 0);
        leg.shin.rotation.set(leg.side > 0 ? 0.2 : 0.06, 0, 0);
      } else {
        leg.thigh.rotation.set(0, 0, leg.side * 0.03);
        leg.shin.rotation.set(0, 0, 0);
      }
    }
    // The tail: a slow swing, curling up at its tip; quicker when he is pleased with what he is saying.
    const swing = Math.sin(t * (speaking ? 2.6 : 1.3));
    this.tail[0].rotation.set(ctx.seated ? -1.95 : lean ? -1.45 : -1.75, 0.35 * swing, 0);
    this.tail[1].rotation.set(0.72 + 0.1 * Math.sin(t * 1.1), 0.3 * Math.sin(t * 1.3 - 0.7), 0);
    this.tail[2].rotation.set(0.62, 0.3 * Math.sin(t * 1.3 - 1.4), 0);
    // Ears: one flicks, then the other.
    this.ears.forEach((ear, i) => {
      const side = ear.userData.side as number;
      this.flick[i] = now(t, 4.3 + i * 1.7, 0.28, i * 2.2);
      ear.rotation.z = side * (-0.22 - 0.35 * this.flick[i]) + (Common.listening(ctx) ? side * -0.08 : 0);
      ear.rotation.x = -0.1 * this.flick[i];
    });
    // The head: turned to whoever it is, tipped a little; a slow look down at his cards.
    const peek = ctx.doing === 'cards' && !ctx.talking ? now(t, 6.5, 2.2, ctx.turn * 3) : 0;
    this.head.rotation.y = ctx.headYaw * (1 - 0.8 * peek);
    this.head.rotation.x = (lean ? 0.1 : 0) + 0.35 * peek + (Common.listening(ctx) ? 0.08 * Math.max(0, Math.sin(t * 2.9)) ** 3 : 0) + (ctx.talking ? 0.06 * Math.sin(t * 8.5) : 0) - 0.5 * this.sip;
    this.head.rotation.z = 0.1 * Math.sin(t * 0.6) + (lean ? 0.12 : 0);
    this.jaw.rotation.x = 0.45 * this.common.mouth;
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

export function makePatron(kind: PatronKind, look: PatronLook): PatronBody {
  return kind === 'turtle' ? new Turtle(look === 'pebble' ? 'pebble' : 'mo') : new Fox(look === 'ash' ? 'ash' : 'vix');
}
