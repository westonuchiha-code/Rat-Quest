import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { ROLLER, type RollerState } from './roller';
import { flat } from './widowModel';

/**
 * The Frost Roller, as it is drawn. It faces +z with its feet on y = 0.
 *
 * Built of a few shaped, flat-faced pieces: SIX PLATES, each one arch of four flat faces, lying one over the next
 * down its back like roof tiles (small at each end, wide in the middle); under them a pair of short legs to a plate;
 * at its front a small head shield with two feelers. Nothing else.
 *
 * What is drawn is what is so. The plates are set along a STRIP that is bent as far as the rules say it is rolled up
 * (`curl`): nearly straight when it walks, a full ring when it is a ball, and then the ball is as big as the rules'
 * own round body. Rolling, the whole ring turns as far as it has gone over the floor (`spin`). Spilled, it is on its
 * back, rocking, its legs going.
 */
const PLATES = 6;
/** How far apart along the strip one plate's middle is from the next. */
const PITCH = 0.24;
/** Each plate: half its width, and how high its arch stands. A little smaller at the ends, so that rolled up it is a ball (and nearly as high, so that the ball is round as it turns). */
const PLATE: Array<[number, number]> = [[0.3, 0.27], [0.38, 0.31], [0.43, 0.33], [0.43, 0.33], [0.38, 0.31], [0.3, 0.27]];
/** How much one plate is turned from the next, walking (a little: it is always arched) and rolled into a ring. */
const BEND_WALK = 0.12;
const BEND_BALL = ((Math.PI * 2) / PLATES) * 0.97;
/** How high the middle of its back's underside is, walking. */
const BELLY = 0.16;
/** How big the ball is: the strip's own ring, and the arch of its widest plates outside that. */
export const BALL_R = PITCH / BEND_BALL + PLATE[2][1];

/** One plate: an arch of four flat faces across (x), `long` along the strip (z), its crest up (+y). Its hind edge a little bigger than its front, to lie over the next. */
function plate(half: number, high: number, long: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const ARCH = 4;
  const at = (j: number, k: number): [number, number, number] => {
    const a = Math.PI * (j / ARCH);
    return [-Math.cos(a) * half * k, Math.sin(a) * high * k, 0];
  };
  for (let j = 0; j < ARCH; j++) {
    // (Front edge at -long/2, a shade smaller; hind edge at +long/2, a shade bigger.)
    const f0 = at(j, 0.94);
    const f1 = at(j + 1, 0.94);
    const h0 = at(j, 1.06);
    const h1 = at(j + 1, 1.06);
    const quad: Array<[[number, number, number], number, number]> = [
      [[f0[0], f0[1], -long / 2], j / ARCH, 0], [[h0[0], h0[1], long / 2], j / ARCH, 1], [[f1[0], f1[1], -long / 2], (j + 1) / ARCH, 0],
      [[f1[0], f1[1], -long / 2], (j + 1) / ARCH, 0], [[h0[0], h0[1], long / 2], j / ARCH, 1], [[h1[0], h1[1], long / 2], (j + 1) / ARCH, 1],
    ];
    for (const [p, u, v] of quad) {
      pos.push(...p);
      uv.push(u, v);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  // (Shaded a little by height: its flanks darker than its crest. Its picture carries its colour.)
  const col = new Float32Array((pos.length / 3) * 3);
  for (let i = 0; i < pos.length / 3; i++) {
    const k = 0.72 + 0.28 * (pos[i * 3 + 1] / high);
    col.set([k, k, k], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
function tinted(geo: THREE.BufferGeometry, k: number): THREE.BufferGeometry {
  const col = new Float32Array(geo.attributes.position.count * 3).fill(k);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export interface RollerAnimInput {
  state: RollerState;
  stateTime: number;
  /** How far it is rolled up, 0..1; how far it has rolled, in turns; how fast it is going. */
  curl: number;
  spin: number;
  moving: number;
}

export class RollerModel {
  readonly root = new THREE.Group();
  /** Everything but its shadow: turned over when it is spilled. */
  private readonly body = new THREE.Group();
  /** The ring its plates are set round: at the ring's middle, turned as it rolls. */
  private readonly ring = new THREE.Group();
  private readonly plates: THREE.Group[] = [];
  private readonly legs: Array<{ leg: THREE.Mesh; side: number; i: number }> = [];
  private readonly feelers: THREE.Mesh[] = [];
  /** What is seen through its sides when it is rolled up: its own dark underside, drawn in, as one six-sided piece. */
  private readonly hub: THREE.Mesh;
  private readonly shell = createPs1Material({ lit: true, shine: 0.55, tex: getTexture('rollerShell') });
  private readonly under = createPs1Material({ lit: true, shine: 0.2, tex: getTexture('rollerUnder') });
  private readonly shadow: THREE.Mesh;
  private time = 0;
  private flashAmount = 0;
  /** How far over on its back it is, 0..1. */
  private over = 0;

  constructor() {
    this.shell.side = THREE.DoubleSide;
    this.root.add(this.body);
    this.body.add(this.ring);
    for (let i = 0; i < PLATES; i++) {
      const [half, high] = PLATE[i];
      const g = new THREE.Group();
      g.add(new THREE.Mesh(plate(half, high, PITCH * 1.28), this.shell));
      // A pair of short legs under it (not under the end plates): each one tapered piece, out and down.
      if (i > 0 && i < PLATES - 1) {
        for (const side of [-1, 1]) {
          const geo = flat(new THREE.CylinderGeometry(0.012, 0.03, 0.2, 4, 1));
          geo.translate(0, -0.1, 0);
          tinted(geo, 1);
          const leg = new THREE.Mesh(geo, this.under);
          leg.position.set(side * half * 0.62, 0.02, 0);
          leg.rotation.z = side * 0.5;
          g.add(leg);
          this.legs.push({ leg, side, i });
        }
      }
      // Its underside there: one flat dark piece across between its flanks.
      const belly = tinted(new THREE.PlaneGeometry(half * 1.7, PITCH * 1.1).rotateX(Math.PI / 2), 0.9);
      const b = new THREE.Mesh(belly, this.under);
      b.position.y = 0.03;
      g.add(b);
      this.plates.push(g);
      this.ring.add(g);
    }
    {
      const geo = flat(new THREE.CylinderGeometry(1, 1, 0.5, PLATES, 1));
      geo.rotateZ(Math.PI / 2);
      this.hub = new THREE.Mesh(tinted(geo, 0.85), this.under);
      this.ring.add(this.hub);
    }
    // The head shield, on the front of the first plate: a small wedge, and two feelers.
    {
      const head = flat(new THREE.ConeGeometry(0.2, 0.22, 4, 1));
      head.rotateX(Math.PI / 2);
      head.scale(1, 0.5, 1);
      head.translate(0, 0.07, 0);
      tinted(head, 0.95);
      const h = new THREE.Mesh(head, this.shell);
      h.position.set(0, 0, -PITCH * 0.72);
      h.rotation.y = Math.PI;
      this.plates[0].add(h);
      for (const side of [-1, 1]) {
        const geo = flat(new THREE.CylinderGeometry(0.006, 0.016, 0.3, 3, 1));
        geo.translate(0, 0.15, 0);
        tinted(geo, 1.1);
        const f = new THREE.Mesh(geo, this.under);
        f.position.set(side * 0.08, 0.06, -PITCH * 0.86);
        f.rotation.set(-1.15, 0, -side * 0.5);
        this.plates[0].add(f);
        this.feelers.push(f);
      }
    }
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
    this.update(0, { state: 'idle', stateTime: 0, curl: 0, spin: 0, moving: 0 });
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: RollerAnimInput): void {
    this.time += dt;
    const t = this.time;
    const curl = Math.max(0, Math.min(1, ctx.curl));
    // The strip, bent as far as it is rolled up: each plate turned `bend` from the next, on a ring of that curve.
    // (Its head is at the FRONT of the strip: plate 0 is furthest toward +z walking, so the ring is laid out from
    // +z round over its back to -z.)
    const bend = BEND_WALK + (BEND_BALL - BEND_WALK) * curl;
    const R = PITCH / bend;
    // The top of the ring (the middle of its back's underside): low when it walks, the top of the ball's own ring rolled up.
    const top = BELLY + (BALL_R + PITCH / BEND_BALL - BELLY) * curl;
    this.ring.position.set(0, top - R, 0);
    // Rolling, the ring turns forward as far as it has gone (only as far as it is rolled up: walking it does not turn).
    this.ring.rotation.x = ctx.spin * Math.PI * 2 * curl * curl;
    this.plates.forEach((g, i) => {
      const a = -(i - (PLATES - 1) / 2) * bend;
      g.position.set(0, Math.cos(a) * R, -Math.sin(a) * R);
      g.rotation.x = -a;
    });
    // (Rolled up, its sides are shut by its own underside: one dark six-sided piece that fills the ring.)
    this.hub.visible = curl > 0.35;
    const hubR = R * 1.12;
    this.hub.scale.set(1, hubR, hubR);
    this.hub.rotation.x = Math.PI / PLATES;
    // Its legs: tucked in flat as it rolls up; walking, each pair steps in turn; on its back, all of them going.
    const going = ctx.state === 'spilled' ? 1 : Math.min(1, ctx.moving / ROLLER.walk);
    for (const { leg, side, i } of this.legs) {
      const step = Math.sin(t * (ctx.state === 'spilled' ? 17 : 11) + i * 1.9 + (side > 0 ? 0 : Math.PI)) * 0.45 * going;
      leg.rotation.set(step, 0, side * (0.5 + 0.9 * curl));
      leg.scale.setScalar(1 - 0.5 * curl);
    }
    this.feelers.forEach((f, k) => {
      f.rotation.x = -1.15 + 0.6 * curl + 0.12 * Math.sin(t * 3.1 + k * 2);
      f.scale.setScalar(1 - 0.6 * curl);
    });
    // On its back: turned over (it comes over quickly, and rights itself over the time the rules give it), rocking.
    const wantOver = ctx.state === 'spilled' ? 1 : 0;
    const rate = ctx.state === 'right' ? 1 / ROLLER.right : 7;
    this.over += Math.max(-rate * dt, Math.min(rate * dt, wantOver - this.over));
    if (dt === 0) this.over = wantOver;
    const rock = ctx.state === 'spilled' ? 0.16 * Math.sin(t * 4.2) * Math.exp(-ctx.stateTime * 0.6) : 0;
    const crest = top + PLATE[2][1];
    this.body.rotation.z = Math.PI * this.over + rock;
    // (Turned over about the floor it would lie its back on: lifted so that its back, not its belly, is at the floor.)
    this.body.position.y = crest * Math.sin((Math.PI * this.over) / 2) ** 2 * 1.0 + 0.25 * Math.sin(Math.PI * this.over) * (ctx.state === 'right' ? 1 : 0.6);
    // Tucking, it rocks back before it goes (the tell); walking, it sways a little.
    const tuck = ctx.state === 'tuck' ? Math.sin(Math.min(1, ctx.stateTime / ROLLER.tuck) * Math.PI) : 0;
    this.body.rotation.x = -0.22 * tuck;
    this.body.position.z = -0.12 * tuck;
    this.shadow.scale.setScalar(0.82 + 0.18 * (1 - curl));
    this.root.visible = ctx.state !== 'dead' || ctx.stateTime < 0.9;
    if (ctx.state === 'dead') {
      // Beaten, it falls open and flat, and is gone.
      const k = Math.min(1, ctx.stateTime / 0.35);
      this.body.scale.set(1 + 0.15 * k, 1 - 0.75 * k, 1 + 0.15 * k);
    } else this.body.scale.setScalar(1);
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    for (const m of [this.shell, this.under]) (m.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
