import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { bead, mix, modelKit, paint } from '../render/modelKit';
import type { ToadState } from './toad';

/**
 * Gloop toad model: a squat, warty sewer toad, wider than the rat and a bit shorter: blotched green back, pale belly,
 * gold eyes with slit pupils that blink, a wide mouth that opens dark, bent front legs and big webbed back feet.
 * It faces +Z with its feet on y = 0. The tell before a spit is big and clear: the throat sac swells and glows green,
 * the head tips back, then it snaps forward and the sac empties.
 */
const C = {
  back: 0x4a6a2a,
  blotch: 0x33501e,
  stripe: 0x7a9438,
  side: 0x7a8a42,
  wart: 0x7c9a3a,
  belly: 0xcdbd7c,
  lip: 0x8a5a4a,
  mouth: 0x4a1418,
  tongue: 0xd8707a,
  eye: 0xf4d640,
  leg: 0x3c5a22,
  toe: 0x8a9a4a,
  web: 0x5a7030,
};

export interface ToadAnimInput {
  state: ToadState;
  stateTime: number;
  moving: boolean;
  hopY: number;
  /** Thrown down winded by a perfect guard. */
  down?: boolean;
}

function ease(cur: number, target: number, dt: number, rate: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

export class ToadModel {
  readonly root = new THREE.Group();
  // (Each has a picture of its SURFACE, in greys, laid over the colours painted on it: the texture pass, 2026-11-16.)
  private readonly material = createPs1Material({ lit: true, tex: getTexture('wartSkin') });
  private readonly sacMat = new THREE.MeshBasicMaterial({ color: 0x9aff6a, vertexColors: true });
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly sac: THREE.Mesh;
  private readonly eyes: THREE.Group[] = [];
  private blinkIn = 2;
  private blink = 0;
  private readonly legs: Array<{ g: THREE.Group; front: boolean; side: number }> = [];
  private readonly shadow: THREE.Mesh;
  private time = 0;
  private flashAmount = 0;
  private sacSize = 0.4;
  private lean = 0;
  private squash = 1;
  private scale = 1;
  private roll = 0;

  constructor() {
    const mat = this.material;
    const { blob } = modelKit(mat);
    // Skin: a pale belly, a green back with darker blotches, and a lighter stripe down the spine.
    const blotch = (nx: number, ny: number, nz: number): boolean => Math.sin(nx * 7.3 + nz * 4.1) * Math.sin(nz * 6.7 - nx * 2.9 + ny * 3) > 0.42;
    const skin = (nx: number, ny: number, nz: number): number => {
      if (ny < -0.3) return C.belly;
      if (ny < -0.05) return C.side;
      if (ny > 0.5 && Math.abs(nx) < 0.14) return C.stripe;
      return blotch(nx, ny, nz) ? C.blotch : C.back;
    };

    this.root.add(this.body);
    this.body.add(blob(0.55, 0.36, 0.5, skin, 0, 0.36, -0.05, 12, 8, 0.3));
    // Warts: real bumps scattered over the back, and the two big glands behind the eyes that every toad has.
    const warts: Array<[number, number, number]> = [[0.28, 0.5, -0.2], [-0.3, 0.52, -0.12], [0.14, 0.66, -0.3], [-0.12, 0.68, -0.22], [0.4, 0.45, 0.05], [-0.42, 0.42, -0.02], [0.02, 0.6, -0.44], [0.3, 0.42, -0.4], [-0.28, 0.44, -0.42]];
    for (const [x, y, z] of warts) this.body.add(blob(0.055, 0.04, 0.055, C.wart, x, y, z, 5, 4, 0));
    for (const side of [-1, 1]) {
      const gland = blob(0.11, 0.06, 0.16, C.wart, side * 0.27, 0.66, 0.1, 6, 4, 0.1);
      gland.rotation.y = side * 0.3;
      this.body.add(gland);
    }

    // Head: wide and flat. The top jaw is fixed; the lower jaw swings down and shows the dark of its mouth.
    this.head.position.set(0, 0.42, 0.32);
    this.body.add(this.head);
    this.head.add(blob(0.44, 0.2, 0.32, (nx, ny, nz) => (ny < -0.55 ? C.lip : skin(nx, ny * 0.6 + 0.4, nz)), 0, 0.06, 0.08, 12, 6, 0.15));
    for (const side of [-1, 1]) this.head.add(blob(0.022, 0.016, 0.02, C.mouth, side * 0.07, 0.15, 0.36, 4, 3, 0)); // nostrils
    this.jaw.position.set(0, -0.04, -0.12);
    this.head.add(this.jaw);
    this.jaw.add(blob(0.42, 0.1, 0.3, (_nx, ny) => (ny > 0.55 ? C.lip : C.belly), 0, -0.04, 0.2, 12, 5, 0.15));
    // The inside of the mouth: a dark red wedge and a pink tongue, hidden until the jaw drops.
    this.jaw.add(blob(0.36, 0.05, 0.25, C.mouth, 0, 0.03, 0.2, 8, 4, 0));
    this.jaw.add(blob(0.16, 0.035, 0.18, C.tongue, 0, 0.055, 0.22, 6, 4, 0));

    // Eyes: gold, bulging from sockets on top of the head, with a sideways slit for a pupil and a lid that blinks.
    const eyeMat = new THREE.MeshBasicMaterial({ color: C.eye });
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xb07a20 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x101010 });
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (const side of [-1, 1]) {
      this.head.add(blob(0.13, 0.12, 0.13, C.back, side * 0.22, 0.2, 0.1, 7, 5, 0.1));
      const eye = new THREE.Group();
      eye.position.set(side * 0.24, 0.24, 0.16);
      eye.rotation.y = side * 0.35; // looking a little outwards
      eye.add(bead(0.1, rimMat, 0, 0, -0.012, 7, 5));
      eye.add(bead(0.092, eyeMat, 0, 0, 0.005, 7, 5));
      const pupil = bead(0.06, pupilMat, 0, 0, 0.068, 6, 4);
      pupil.scale.set(1.3, 0.55, 0.6);
      eye.add(pupil);
      eye.add(bead(0.018, glintMat, side * 0.035, 0.045, 0.082, 4, 3));
      this.head.add(eye);
      this.eyes.push(eye);
      // The brow over it.
      const brow = blob(0.11, 0.03, 0.09, C.blotch, side * 0.225, 0.345, 0.08, 6, 3, 0);
      brow.rotation.set(-0.35, 0, -side * 0.2);
      this.head.add(brow);
    }
    // The throat sac: glows when it is about to spit.
    // (Painted paler at the front and darker round the edge, so it reads as a round bladder and not a flat disc.)
    this.sac = new THREE.Mesh(paint(new THREE.SphereGeometry(0.22, 8, 6), (_nx, ny, nz) => mix(0x9a9a9a, 0xffffff, 0.5 + 0.5 * nz - 0.25 * Math.max(0, -ny))), this.sacMat);
    this.sac.position.set(0, -0.12, 0.2);
    this.head.add(this.sac);

    // Legs: small bent front ones with splayed fingers; big folded back ones with long webbed feet.
    for (const side of [-1, 1]) {
      const fore = new THREE.Group();
      fore.position.set(side * 0.34, 0.3, 0.26);
      const upper = blob(0.085, 0.14, 0.085, skin, side * 0.03, -0.08, 0.0, 6, 5, 0.2);
      upper.rotation.z = side * 0.35;
      fore.add(upper);
      const lower = blob(0.065, 0.12, 0.065, C.leg, side * 0.05, -0.2, 0.06, 6, 4, 0.2);
      lower.rotation.x = -0.4;
      fore.add(lower);
      for (let k = -1; k <= 1; k++) {
        const toe = blob(0.03, 0.02, 0.085, C.toe, side * 0.05 + k * 0.045, -0.285, 0.14, 4, 3, 0);
        toe.rotation.y = k * 0.5;
        fore.add(toe);
      }
      this.body.add(fore);
      this.legs.push({ g: fore, front: true, side });

      const hind = new THREE.Group();
      hind.position.set(side * 0.42, 0.2, -0.25);
      hind.add(blob(0.17, 0.15, 0.3, skin, 0, 0.02, 0.0, 8, 5, 0.25)); // thigh
      const shin = blob(0.09, 0.07, 0.24, C.leg, side * 0.07, -0.1, 0.08, 6, 4, 0.2);
      shin.rotation.x = 0.25;
      hind.add(shin);
      const foot = new THREE.Group();
      foot.position.set(side * 0.08, -0.17, 0.2);
      foot.rotation.y = side * 0.35;
      for (let k = -1; k <= 1; k++) {
        const toe = blob(0.03, 0.02, 0.13, C.toe, k * 0.06, 0, 0.1, 4, 3, 0);
        toe.rotation.y = k * 0.4;
        foot.add(toe);
      }
      foot.add(blob(0.09, 0.012, 0.1, C.web, 0, -0.005, 0.07, 5, 3, 0)); // the web between them
      hind.add(foot);
      this.body.add(hind);
      this.legs.push({ g: hind, front: false, side });
    }
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 10),
      lyingOn(new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.35, depthWrite: false })),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: ToadAnimInput): void {
    this.time += dt;
    const t = ctx.stateTime;
    let sac = 0.4 + 0.08 * Math.sin(this.time * 3);
    let lean = 0;
    let squash = 1 + 0.03 * Math.sin(this.time * 3);
    let jaw = 0;
    let glow = 0;
    let roll = 0;
    let scale = 1;
    switch (ctx.state) {
      case 'windup':
        // The throat swells and glows, the head tips back.
        sac = 0.5 + 1.3 * Math.min(1, t / 0.8);
        glow = Math.min(1, t / 0.8);
        lean = -0.35 * Math.min(1, t / 0.6);
        squash = 1 - 0.12 * Math.min(1, t / 0.8);
        break;
      case 'recover':
        if (ctx.down) {
          // TURNED BY A PERFECT GUARD: flat on its belly, mouth hanging, heaving. OPEN, and it must look it (it sat as
          // it does after any spit). Audit, 2026-11-24.
          sac = 0;
          lean = 0.3;
          jaw = 0.6;
          squash = 0.6 + 0.05 * Math.sin(t * 9);
          break;
        }
        // Snaps forward, mouth open, then sags.
        sac = 0.25;
        lean = t < 0.15 ? 0.35 : 0.15;
        jaw = t < 0.3 ? 0.5 : 0.15;
        squash = 1.08;
        break;
      case 'hop':
        squash = ctx.hopY > 0.05 ? 1.25 : 0.8;
        lean = -0.2;
        break;
      case 'crouch':
        // The tell for a pounce: it flattens itself to the floor, quivering, mouth shut, eyes on him.
        squash = 0.62 + 0.04 * Math.sin(t * 40);
        lean = 0.28;
        sac = 0.2;
        break;
      case 'pounce':
        // In the air, stretched out, belly first; mouth wide as it comes down.
        squash = 1.3;
        lean = 0.45;
        jaw = 0.6;
        break;
      case 'stagger':
        squash = 0.8 + 0.2 * Math.abs(Math.sin(t * 25));
        jaw = 0.3;
        break;
      case 'dead':
        roll = Math.PI * Math.min(1, t / 0.3);
        jaw = 0.5;
        scale = 1 - Math.min(1, Math.max(0, (t - 1.2) / 0.6));
        break;
    }
    this.sacSize = ease(this.sacSize, sac, dt, 12);
    this.lean = ease(this.lean, lean, dt, 14);
    this.squash = ease(this.squash, squash, dt, 18);
    this.roll = ctx.state === 'dead' ? roll : ease(this.roll, 0, dt, 10);
    this.scale = ctx.state === 'dead' ? scale : ease(this.scale, 1, dt, 8);

    this.sac.scale.setScalar(this.sacSize);
    // At rest the sac is the colour of its belly; filling, it turns a sick bright green.
    this.sacMat.color.setRGB(0.66 + 0.3 * glow, 0.62 + 0.38 * glow, 0.4 - 0.18 * glow);
    // It blinks now and then (never in a tell: its eyes stay on him), and its eyes shut for good when it dies.
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkIn = 1.8 + ((this.time * 7.31) % 1) * 3;
      if (ctx.state === 'idle' || ctx.state === 'watch' || ctx.state === 'return') this.blink = 0.14;
    }
    this.blink = Math.max(0, this.blink - dt);
    const shut = ctx.state === 'dead' || this.blink > 0 ? 0.12 : ctx.state === 'stagger' ? 0.5 : ctx.state === 'crouch' ? 0.7 : 1;
    for (const e of this.eyes) e.scale.y = ease(e.scale.y, shut, dt, 40);
    this.head.rotation.x = this.lean;
    this.jaw.rotation.x = jaw;
    this.body.scale.set(1 / Math.sqrt(this.squash), this.squash, 1 / Math.sqrt(this.squash));
    // Rolling onto its back turns it about its middle, so it ends belly-up on the floor (not under it).
    const mid = 0.36;
    // (Half-way over it is on its side, which is wider than it is tall: it bounces up so its flank clears the floor.)
    this.body.position.set(Math.sin(this.roll) * mid, ctx.hopY + (1 - Math.cos(this.roll)) * mid + Math.sin(this.roll) * 0.4, 0);
    this.body.rotation.z = this.roll;
    for (const l of this.legs) {
      // Back legs kick out behind in a hop and trail in a pounce; front legs reach forward to land. Dead, they all go slack.
      let want = 0;
      if (ctx.state === 'hop') want = l.front ? -0.5 : Math.max(0, 1 - t / 0.25) * 1.1;
      else if (ctx.state === 'pounce') want = l.front ? -0.9 : 0.9;
      else if (ctx.state === 'crouch') want = l.front ? 0.3 : -0.15;
      else if (ctx.state === 'dead') want = (l.front ? -0.6 : 0.5) + 0.1 * Math.sin(this.time * 20 + l.side) * Math.max(0, 1 - t / 0.8);
      l.g.rotation.x = ease(l.g.rotation.x, want, dt, 20);
      l.g.rotation.z = ease(l.g.rotation.z, ctx.state === 'dead' ? l.side * 0.5 : 0, dt, 12);
    }
    this.shadow.scale.setScalar(Math.max(0.4, 1 - ctx.hopY * 0.4));
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.material.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
