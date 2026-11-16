import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { getTexture } from '../render/textures';
import { bead, modelKit } from '../render/modelKit';
import type { ScuttlerState } from './scuttler';

/**
 * Scuttler model: a fat armoured sewer roach about the size of the rat: two glossy wing cases over a pale ribbed
 * belly, an amber-rimmed shield behind the head, scowling yellow eyes, hooked jaws and six spined legs. It faces +Z with its feet on y = 0.
 * The animation is what makes the fight readable: it rears up and its eyes turn red before it lunges,
 * and it sags, spent, afterwards.
 */

const C = {
  shell: 0x55303c,
  shellLight: 0x74424a,
  shellDark: 0x2e1a24,
  gloss: 0xa86a66,
  rim: 0xc89a52,
  belly: 0x9a8a5e,
  bellyDark: 0x6e5e44,
  head: 0x33222b,
  headLight: 0x4a3038,
  leg: 0x2a1c22,
  legLight: 0x4a343a,
  jaw: 0xd8c896,
  jawDark: 0x7a6a4a,
};

export interface ScuttlerAnimInput {
  state: ScuttlerState;
  stateTime: number;
  moving: boolean;
}

function ease(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

interface Leg {
  hip: THREE.Group;
  knee: THREE.Group;
  side: number;
  set: number; // 0 or 1: which half of the alternating gait this leg belongs to
  restSweep: number;
}

export class ScuttlerModel {
  readonly root = new THREE.Group();
  // (Each has a picture of its SURFACE, in greys, laid over the colours painted on it: the texture pass, 2026-11-16.)
  private readonly material = createPs1Material({ lit: true, shine: 0.3, tex: getTexture('chitin') });
  private readonly eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffd23a });
  private readonly pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x1a0a08 });
  private readonly wingCases: THREE.Group[] = [];
  private readonly prongs: THREE.Group[] = [];
  private flare = 0;
  private spread = 0;
  private readonly body = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly jaws: THREE.Group[] = [];
  private readonly feelers: THREE.Group[] = [];
  private readonly legs: Leg[] = [];
  private readonly shadow: THREE.Mesh;

  private time = 0;
  private gait = 0;
  private flashAmount = 0;
  private pitch = 0;
  private height = 0.3;
  private roll = 0;
  private jawOpen = 0.25;
  private stretch = 1;
  private scale = 1;
  private legCurl = 0;
  private frontRaise = 0;

  constructor() {
    const mat = this.material;
    const { blob, spar } = modelKit(mat);

    this.root.add(this.body);

    // The soft underside: pale ribbed segments that show under the shell and stick out behind it.
    const ribbed = (_nx: number, ny: number, nz: number): number => {
      if (ny > 0.35) return C.bellyDark;
      return Math.floor((nz + 1) * 4.5) % 2 === 0 ? C.belly : C.bellyDark;
    };
    this.body.add(blob(0.33, 0.2, 0.5, ribbed, 0, -0.05, -0.17, 8, 6));

    // Two wing cases over the back, meeting at a seam down the middle. Each has a gloss line along its top and a dark
    // rim, and they are hinged at the front: they lift in the tell, rattle when it is struck and fall open when it dies.
    const wingCase = (side: number) => (nx: number, ny: number, nz: number): number => {
      if (ny < -0.45) return C.shellDark;
      if (nx * side < -0.5) return C.shellDark; // the seam side
      if (ny > 0.8 && nz > -0.6) return C.gloss;
      return Math.floor((nz + 1) * 3.4) % 2 === 0 ? C.shell : C.shellLight;
    };
    for (const side of [-1, 1]) {
      const hinge = new THREE.Group();
      hinge.position.set(side * 0.02, 0.07, 0.22);
      const wing = blob(0.215, 0.15, 0.42, wingCase(side), side * 0.125, 0.0, -0.4, 10, 7, 0.3);
      wing.rotation.z = -side * 0.3; // sloping down to the side, like a roof
      hinge.add(wing);
      this.body.add(hinge);
      this.wingCases.push(hinge);
    }
    // Two tail prongs.
    for (const side of [-1, 1]) {
      const prong = new THREE.Group();
      prong.position.set(side * 0.1, -0.06, -0.62);
      const p = spar(0.022, 0.004, 0.2, C.leg, 4);
      p.rotation.y = Math.PI / 2; // pointing back
      prong.add(p);
      this.body.add(prong);
      this.prongs.push(prong);
    }

    // The shield behind the head: broad and flat with a pale amber rim, the roach's badge.
    const shield = (_nx: number, ny: number, nz: number): number => {
      if (ny < -0.15) return C.shellDark;
      if (ny < 0.3 && nz > -0.2) return C.rim;
      return ny > 0.75 ? C.shellLight : C.shell;
    };
    this.body.add(blob(0.33, 0.2, 0.22, shield, 0, 0.0, 0.3, 8, 6));

    // Head: low and forward, heavy brows over yellow eyes, two hooked jaws, feelers and a pair of small palps.
    this.headGroup.position.set(0, -0.06, 0.48);
    this.body.add(this.headGroup);
    this.headGroup.add(blob(0.19, 0.15, 0.17, (_nx, ny) => (ny > 0.3 ? C.headLight : C.head), 0, 0, 0.04, 8, 5));
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), this.eyeMaterial);
      eye.position.set(side * 0.11, 0.055, 0.14);
      eye.scale.set(1, 0.85, 1);
      this.headGroup.add(eye);
      this.headGroup.add(bead(0.022, this.pupilMaterial, side * 0.118, 0.05, 0.19, 4, 3));
      // The brow: a dark plate slanting down toward the middle, so it always scowls.
      const brow = blob(0.085, 0.03, 0.06, C.shellDark, side * 0.11, 0.115, 0.13, 5, 3, 0);
      brow.rotation.z = side * 0.5;
      this.headGroup.add(brow);

      const jaw = new THREE.Group();
      jaw.position.set(side * 0.08, -0.07, 0.15);
      const fang = spar(0.045, 0.01, 0.2, (nx) => (nx < -0.3 ? C.jawDark : C.jaw), 4);
      fang.rotation.y = -Math.PI / 2; // point forward
      jaw.add(fang);
      const hook = spar(0.024, 0.004, 0.1, C.jaw, 4);
      hook.position.set(0, 0, 0.19);
      hook.rotation.y = -Math.PI / 2 + side * 1.0; // the tip hooks inward
      jaw.add(hook);
      // A tooth on the inside edge.
      const tooth = spar(0.014, 0.002, 0.05, C.jaw, 3);
      tooth.position.set(0, 0, 0.1);
      tooth.rotation.y = side > 0 ? Math.PI : 0;
      jaw.add(tooth);
      this.headGroup.add(jaw);
      this.jaws.push(jaw);

      const palp = spar(0.016, 0.008, 0.09, C.belly, 4);
      palp.position.set(side * 0.035, -0.11, 0.14);
      palp.rotation.set(0, -Math.PI / 2 + side * 0.2, 0);
      palp.rotation.order = 'YXZ';
      palp.rotation.x = 0.5;
      this.headGroup.add(palp);

      const feeler = new THREE.Group();
      feeler.position.set(side * 0.07, 0.11, 0.1);
      const f1 = spar(0.016, 0.01, 0.3, C.leg, 4);
      f1.rotation.y = -Math.PI / 2;
      const tipPivot = new THREE.Group();
      tipPivot.position.set(0, 0, 0.3);
      const f2 = spar(0.01, 0.003, 0.34, C.leg, 4);
      f2.rotation.y = -Math.PI / 2;
      tipPivot.add(f2);
      feeler.add(f1, tipPivot);
      this.headGroup.add(feeler);
      this.feelers.push(feeler, tipPivot);
    }

    // Six legs. Each has a thick upper part reaching out and up to a knee, a spined lower part stabbing down, and a
    // little foot that lies along the ground.
    const hips: Array<[number, number]> = [[0.3, 0.9], [0.06, 0.1], [-0.2, -0.75]]; // z along the body, resting sweep
    hips.forEach(([z, sweep], row) => {
      for (const side of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(side * 0.24, -0.1, z);
        hip.rotation.order = 'YZX';
        const upper = spar(0.05, 0.032, 0.3, (nx) => (nx > 0.6 ? C.legLight : C.leg), 5);
        const knee = new THREE.Group();
        knee.position.set(0.3, 0, 0);
        knee.add(blob(0.036, 0.036, 0.036, C.legLight, 0, 0, 0, 5, 4, 0));
        const lower = spar(0.032, 0.008, 0.36, C.leg, 5);
        knee.add(lower);
        for (let k = 0; k < 2; k++) {
          const spine = spar(0.011, 0.002, 0.07, C.legLight, 3);
          spine.position.set(0.1 + k * 0.11, 0, 0);
          spine.rotation.z = -0.9;
          knee.add(spine);
        }
        const foot = spar(0.01, 0.003, 0.08, C.leg, 3);
        foot.position.set(0.35, 0, 0);
        foot.rotation.z = 1.15;
        knee.add(foot);
        hip.add(upper, knee);
        this.body.add(hip);
        this.legs.push({ hip, knee, side, set: (row + (side > 0 ? 1 : 0)) % 2, restSweep: sweep });
      }
    });

    // Blob shadow.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 10),
      lyingOn(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.scale.set(1, 1.3, 1);
    this.root.add(this.shadow);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }

  /** Flashes the whole body white, when the sword lands. */
  flash(): void {
    this.flashAmount = 1;
  }

  update(dt: number, ctx: ScuttlerAnimInput): void {
    this.time += dt;
    const t = ctx.stateTime;
    const state = ctx.state;
    if (ctx.moving) this.gait += dt * 17;

    // Targets for the body. Each state changes a few of them.
    let pitch = 0; // negative rears the front up
    let height = 0.3 + Math.sin(this.time * 3) * 0.008;
    let roll = 0;
    let jaw = 0.25 + Math.sin(this.time * 5) * 0.08;
    let stretch = 1;
    let scale = 1;
    let curl = 0;
    let frontRaise = 0;
    let shake = 0;
    let eyeHot = 0;
    let flare = 0; // how far the wing cases lift
    let spread = 0; // how far they fall open sideways (on its back)
    let rate = 12;

    if (state === 'chase' || state === 'return') {
      height += Math.abs(Math.sin(this.gait)) * 0.015;
      roll = Math.sin(this.gait) * 0.05;
    } else if (state === 'windup') {
      // The tell: rear up, jaws wide, eyes red, shaking harder as the lunge gets close.
      const k = smooth(t / 0.25);
      pitch = -0.6 * k;
      height = 0.36;
      jaw = 1.1;
      frontRaise = k;
      shake = 0.012 + 0.025 * Math.min(1, t / 0.6);
      eyeHot = 0.5 + 0.5 * Math.sin(t * 28);
      stretch = 0.92;
      flare = 0.55 + 0.12 * Math.sin(t * 40);
      rate = 16;
    } else if (state === 'lunge') {
      pitch = 0.22;
      height = 0.24;
      jaw = t > 0.12 ? -0.1 : 1.0; // snaps shut at the end
      stretch = 1.22;
      eyeHot = 1;
      rate = 30;
    } else if (state === 'recover') {
      // Spent: sags to the floor and pants.
      height = 0.2 + Math.sin(this.time * 9) * 0.012;
      pitch = 0.1;
      jaw = 0.5;
      stretch = 0.96;
      rate = 9;
    } else if (state === 'stagger') {
      pitch = -0.3;
      height = 0.27;
      roll = Math.sin(t * 30) * 0.12 * Math.max(0, 1 - t / 0.4);
      jaw = 0.9;
      stretch = 0.85;
      flare = 0.5 * Math.abs(Math.sin(t * 30)) * Math.max(0, 1 - t / 0.4);
      rate = 24;
    } else if (state === 'dead') {
      // Flips onto its back, legs curl and twitch, then it shrivels away.
      roll = Math.PI * smooth(t / 0.3);
      height = 0.26 + 0.3 * Math.sin(Math.min(1, t / 0.35) * Math.PI);
      curl = smooth((t - 0.15) / 0.4);
      jaw = 0.7;
      spread = 0.6 * smooth((t - 0.1) / 0.3);
      scale = 1 - smooth((t - 1.3) / 0.6);
      rate = 40;
    }

    this.pitch = ease(this.pitch, pitch, dt, rate);
    this.height = ease(this.height, height, dt, rate);
    this.roll = state === 'dead' ? roll : ease(this.roll > 1 ? 0 : this.roll, roll, dt, rate);
    this.jawOpen = ease(this.jawOpen, jaw, dt, rate * 1.5);
    this.stretch = ease(this.stretch, stretch, dt, rate);
    this.scale = state === 'dead' ? scale : ease(this.scale, scale, dt, 8);
    this.legCurl = ease(this.legCurl, curl, dt, 14);
    this.frontRaise = ease(this.frontRaise, frontRaise, dt, 16);
    this.flare = ease(this.flare, flare, dt, 22);
    this.spread = ease(this.spread, spread, dt, 14);

    this.body.position.set(shake * Math.sin(this.time * 61), this.height, shake * Math.cos(this.time * 53));
    this.body.rotation.set(this.pitch, 0, this.roll);
    this.body.scale.set(2 - this.stretch, 1, this.stretch);
    this.root.scale.setScalar(Math.max(0.001, this.scale));
    this.shadow.visible = this.scale > 0.05;

    this.headGroup.rotation.x = state === 'windup' ? -0.3 : state === 'recover' ? 0.25 : 0;
    this.jaws[0].rotation.y = -this.jawOpen;
    this.jaws[1].rotation.y = this.jawOpen;
    // The wing cases lift at the hinge and spread a little; the tail prongs feel about behind it.
    this.wingCases.forEach((w, i) => {
      const side = i === 0 ? -1 : 1;
      w.rotation.x = -this.flare * 0.55;
      w.rotation.y = side * (this.flare * 0.3 + this.spread);
    });
    this.prongs.forEach((p, i) => {
      const side = i === 0 ? -1 : 1;
      p.rotation.y = side * (0.35 + 0.15 * Math.sin(this.time * 3.1 + i * 2));
      p.rotation.x = 0.15 * Math.sin(this.time * 4.3 + i);
    });
    const droop = state === 'recover' || state === 'dead' ? 0.5 : 0;
    this.feelers.forEach((f, i) => {
      const tip = i % 2 === 1;
      const side = i < 2 ? -1 : 1;
      f.rotation.x = (tip ? 0.5 : -0.75) + droop + Math.sin(this.time * 4 + i) * 0.12;
      f.rotation.y = tip ? 0 : side * (0.35 + Math.sin(this.time * 2.6 + i * 2) * 0.15);
    });

    // Legs: two sets of three step in turn. Rearing lifts the front pair; dying curls them all in.
    for (const leg of this.legs) {
      const phase = this.gait + leg.set * Math.PI;
      const step = ctx.moving ? Math.sin(phase) : 0;
      const liftStep = ctx.moving ? Math.max(0, Math.cos(phase)) : 0;
      const front = leg.restSweep > 0.5 ? this.frontRaise : 0;
      const twitch = state === 'dead' ? Math.sin(this.time * 23 + leg.restSweep * 5) * 0.12 * Math.max(0, 1 - t / 1.2) : 0;
      const sweep = leg.restSweep * 0.5 + step * 0.4 + front * 0.5;
      // Dead on its back, the legs fold in over the belly (which is now on top).
      const raise = 0.45 + liftStep * 0.3 + front * 0.9 - this.legCurl * 1.0 + twitch;
      // The leg is built along +X. The left legs are turned round to point the other way.
      leg.hip.rotation.y = leg.side > 0 ? -sweep : Math.PI + sweep;
      // When the body drops (lunging, spent) the legs splay flatter, so the feet stay on the floor and not under it.
      leg.hip.rotation.z = raise + Math.max(0, 0.3 - this.height) * 4 * (1 - this.legCurl);
      leg.knee.rotation.z = -1.75 - liftStep * 0.2 + front * 0.6 - this.legCurl * 0.6 + this.pitch * 0.3;
    }

    // Eyes go from yellow to red as a warning. The body flashes white when hit.
    this.eyeMaterial.color.setRGB(1, 0.82 - 0.7 * eyeHot, 0.23 - 0.2 * eyeHot);
    this.flashAmount = Math.max(0, this.flashAmount - dt * 6);
    const f = this.flashAmount * 0.75;
    (this.material.uniforms.flash.value as THREE.Color).setRGB(f, f, f);
  }
}
