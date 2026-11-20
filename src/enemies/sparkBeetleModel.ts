/**
 * How the Spark Beetle looks (enemies/sparkBeetle.ts): a rounded shell of dark blue-black iron, a squat copper coil grown
 * up out of its back with a little steel cap, a small head with two glowing eyes, two antennae tipped with balls of
 * light, six thin legs that scuttle as it goes. Charging, the antenna tips, the coil and a halo round it glow up; on
 * the discharge it flares white-blue. It stands on y = 0 facing +z.
 */
import * as THREE from 'three';
import { createPs1Material, bakeVertexColor } from '../render/ps1Material';
import { getTexture } from '../render/textures';

const mat = createPs1Material({ lit: true });
const copper = createPs1Material({ lit: true, tex: getTexture('copperCoil') });

export interface SparkAnim {
  state: string;
  moving: boolean;
  charge: number;
  discharging: boolean;
}

export class SparkBeetleModel {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legs: Array<{ leg: THREE.Group; side: number; k: number }> = [];
  private readonly glow: THREE.MeshBasicMaterial[] = [];
  private readonly halo: THREE.Mesh;
  private readonly haloMat: THREE.MeshBasicMaterial;
  private walk = 0;
  private flashT = 0;

  constructor() {
    this.root.add(this.body);
    this.body.position.y = 0.32;
    // The shell: a rounded dome, a dark seam down its middle, a paler rim.
    const shell = new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    shell.scale(0.9, 0.7, 1.15);
    bakeVertexColor(shell, 0x1e2838);
    const under = new THREE.SphereGeometry(0.4, 12, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    under.scale(0.88, 0.35, 1.1);
    bakeVertexColor(under, 0x121820);
    this.body.add(new THREE.Mesh(shell, mat), new THREE.Mesh(under, mat));
    const seam = new THREE.Mesh(bakeVertexColor(new THREE.BoxGeometry(0.03, 0.02, 0.9), 0x0a0e14), mat);
    seam.position.set(0, 0.29, -0.02);
    seam.rotation.x = 0.05;
    this.body.add(seam);
    // The coil on its back: copper wound, a steel cap, a bead of light on top.
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 10, 1), copper);
    coil.position.set(0, 0.42, -0.08);
    this.body.add(coil);
    const cap = new THREE.Mesh(bakeVertexColor(new THREE.TorusGeometry(0.11, 0.035, 5, 10).rotateX(Math.PI / 2), 0xc8ccd4), mat);
    cap.position.set(0, 0.58, -0.08);
    this.body.add(cap);
    const bead = (r: number, x: number, y: number, z: number): THREE.Mesh => {
      const m = new THREE.MeshBasicMaterial({ color: 0x4a7aff });
      this.glow.push(m);
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), m);
      b.position.set(x, y, z);
      return b;
    };
    this.body.add(bead(0.05, 0, 0.6, -0.08));
    // The head: small and dark, two eyes of light.
    const head = new THREE.Mesh(bakeVertexColor(new THREE.SphereGeometry(0.17, 8, 6).scale(1.1, 0.8, 1), 0x161c26), mat);
    head.position.set(0, 0.02, 0.48);
    this.body.add(head);
    for (const side of [-1, 1]) {
      this.body.add(bead(0.035, side * 0.08, 0.06, 0.6));
      // An antenna: a thin stalk swept back and out, a ball of light on its end.
      const stalk = new THREE.Mesh(bakeVertexColor(new THREE.CylinderGeometry(0.012, 0.018, 0.42, 4, 1).translate(0, 0.21, 0), 0x2a3240), mat);
      stalk.position.set(side * 0.07, 0.12, 0.55);
      stalk.rotation.set(0.5, 0, side * -0.5);
      this.body.add(stalk);
      const tip = bead(0.045, 0, 0.42, 0);
      stalk.add(tip);
    }
    // Six legs: thin, jointed once, black.
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.3, -0.05, 0.22 - k * 0.24);
        const thigh = new THREE.Mesh(bakeVertexColor(new THREE.CylinderGeometry(0.025, 0.02, 0.26, 4, 1).translate(0, -0.13, 0), 0x0e1218), mat);
        thigh.rotation.z = side * 1.0;
        leg.add(thigh);
        const shin = new THREE.Mesh(bakeVertexColor(new THREE.CylinderGeometry(0.02, 0.012, 0.3, 4, 1).translate(0, -0.15, 0), 0x0e1218), mat);
        shin.position.set(side * 0.22, -0.14, 0);
        shin.rotation.z = side * 0.25;
        leg.add(shin);
        this.body.add(leg);
        this.legs.push({ leg, side, k });
      }
    }
    this.haloMat = new THREE.MeshBasicMaterial({ color: 0x6a8aff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.halo = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), this.haloMat);
    this.halo.position.y = 0.35;
    this.root.add(this.halo);
  }

  setTransform(position: THREE.Vector3, facing: number): void {
    this.root.position.copy(position);
    this.root.rotation.y = facing;
  }
  flash(): void {
    this.flashT = 0.14;
  }
  update(dt: number, a: SparkAnim): void {
    this.flashT = Math.max(0, this.flashT - dt);
    const dead = a.state === 'dead';
    this.root.visible = !dead || this.flashT > 0;
    if (a.moving) this.walk += dt * 18;
    for (const l of this.legs) l.leg.rotation.y = a.moving ? 0.35 * Math.sin(this.walk + l.k * 2.1 + (l.side > 0 ? Math.PI : 0)) : 0;
    this.body.position.y = 0.32 + (a.moving ? 0.015 * Math.sin(this.walk * 2) : 0);
    // Its light: dim blue at rest, brighter as it charges, white-blue as it lets go.
    const c = a.discharging ? 1 : a.charge;
    const col = new THREE.Color(0x3a5aff).lerp(new THREE.Color(0xe0eaff), c * c);
    for (const m of this.glow) m.color.copy(col).multiplyScalar(0.45 + 0.55 * c);
    this.haloMat.opacity = a.discharging ? 0.55 : 0.25 * c * c;
    this.halo.scale.setScalar(a.discharging ? 1.25 + 0.15 * Math.sin(this.walk * 7) : 1);
    this.body.scale.setScalar(this.flashT > 0 ? 1.12 : 1);
  }
}
