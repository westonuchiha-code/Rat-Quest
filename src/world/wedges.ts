/**
 * Golden Wedges in the world: a wedge of golden cheese that turns slowly and bobs, with rays turning behind it, a
 * halo, twinkles, and its glow and shadow on the floor under it. Taking one throws out a burst of sparks.
 * One taken on an earlier visit shows as a pale, see-through ghost, so he can tell what is left.
 */
import * as THREE from 'three';
import type { WedgeDef } from '../levels/types';
import { Sparks, glowMaterial, raysGeometry, shadowGeometry, shadowMaterial, twinkleGeometry, twinkleSize, wedgeGeometry } from './itemModels';

const GOLD = 0xffc93a;
const GHOST = 0x8fb4ff;
/** How high its middle hangs over its base. */
const HANG = 0.85;

interface Item {
  def: WedgeDef;
  root: THREE.Group;
  body: THREE.Mesh;
  /** Faces the camera: the halo, the rays, the twinkles. */
  glory: THREE.Group;
  halo: THREE.Mesh;
  rays: THREE.Mesh;
  twinkles: THREE.Mesh[];
  shadow: THREE.Mesh;
  pool: THREE.Mesh;
  ghost: boolean | null;
}

export class WedgeVisuals {
  readonly group = new THREE.Group();
  readonly sparks = new Sparks();
  private readonly items: Item[] = [];
  private readonly gold = new THREE.MeshBasicMaterial({ vertexColors: true });
  private readonly pale = new THREE.MeshBasicMaterial({ color: GHOST, transparent: true, opacity: 0.4, depthWrite: false });

  constructor(defs: WedgeDef[]) {
    const geo = wedgeGeometry();
    const raysGeo = raysGeometry();
    const haloGeo = new THREE.RingGeometry(0.66, 0.92, 18);
    const twinkleGeo = twinkleGeometry();
    const shadowGeo = shadowGeometry();
    const poolGeo = new THREE.RingGeometry(0.25, 1.0, 16).rotateX(-Math.PI / 2);
    const shadowMat = shadowMaterial();
    this.group.add(this.sparks.group);
    defs.forEach((def, n) => {
      const root = new THREE.Group();
      root.position.set(def.x, def.y + HANG, def.z);
      const body = new THREE.Mesh(geo, this.gold);
      body.rotation.y = n * 1.3;
      root.add(body);
      const glory = new THREE.Group();
      const halo = new THREE.Mesh(haloGeo, glowMaterial(GOLD, 0.16));
      const rays = new THREE.Mesh(raysGeo, glowMaterial(GOLD, 0.13));
      rays.position.z = -0.02;
      glory.add(rays, halo);
      const twinkles: THREE.Mesh[] = [];
      for (let k = 0; k < 3; k++) {
        const t = new THREE.Mesh(twinkleGeo, glowMaterial(0xfff8d8));
        t.visible = false;
        glory.add(t);
        twinkles.push(t);
      }
      root.add(glory);
      // On the floor under it: its shadow, and a pool of its light.
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.set(def.x, def.y + 0.025, def.z);
      const pool = new THREE.Mesh(poolGeo, glowMaterial(GOLD, 0.14));
      pool.position.set(def.x, def.y + 0.035, def.z);
      root.visible = shadow.visible = pool.visible = false;
      this.group.add(root, shadow, pool);
      this.items.push({ def, root, body, glory, halo, rays, twinkles, shadow, pool, ghost: null });
    });
  }

  /** Call every frame. `out(i)`: it is in the course; `got(i)`: he has it already. `face`: the camera's turn. */
  update(dt: number, time: number, out: (i: number) => boolean, got: (i: number) => boolean, face?: THREE.Quaternion): void {
    this.sparks.update(dt, face);
    this.items.forEach((it, i) => {
      const show = out(i);
      it.root.visible = show;
      const ghost = got(i);
      it.shadow.visible = show;
      it.pool.visible = show && !ghost;
      if (!show) {
        // (Hidden, it forgets whether it was his: nothing bursts when it comes back.)
        it.ghost = null;
        return;
      }
      if (ghost !== it.ghost) {
        // He has just taken it: a ring of sparks, and it turns to its ghost.
        if (ghost && it.ghost === false) {
          this.sparks.burst(it.root.position.x, it.root.position.y, it.root.position.z, 0xffe9a0, 16, 4.2, 0.34);
          this.sparks.burst(it.root.position.x, it.root.position.y + 0.2, it.root.position.z, 0xffffff, 8, 2.4, 0.22);
        }
        it.ghost = ghost;
        it.body.material = ghost ? this.pale : this.gold;
        it.rays.visible = !ghost;
        (it.halo.material as THREE.MeshBasicMaterial).color.setHex(ghost ? GHOST : GOLD);
        (it.halo.material as THREE.MeshBasicMaterial).opacity = ghost ? 0.08 : 0.16;
        for (const t of it.twinkles) t.visible = false;
      }
      const bob = Math.sin(time * 2.2 + i) * 0.12;
      it.body.rotation.y = time * 1.6 + i * 1.3;
      it.root.position.y = it.def.y + HANG + bob;
      it.shadow.scale.setScalar(0.95 - bob * 0.8);
      if (face) it.glory.quaternion.copy(face);
      if (ghost) return;
      // The rays turn slowly and breathe; the pool of light on the floor breathes with them.
      const breath = 0.5 + 0.5 * Math.sin(time * 2.6 + i);
      it.rays.rotation.z = time * 0.35 + i;
      it.rays.scale.setScalar(0.92 + 0.12 * breath);
      (it.rays.material as THREE.MeshBasicMaterial).opacity = 0.09 + 0.07 * breath;
      (it.pool.material as THREE.MeshBasicMaterial).opacity = 0.09 + 0.08 * breath;
      it.pool.scale.setScalar(1 - bob * 0.6);
      // Three twinkles take turns, each at a new place on it every time.
      it.twinkles.forEach((tw, k) => {
        const cycle = (time + i * 0.7 + k * 0.53) / 1.6;
        const n = Math.floor(cycle);
        const t = ((cycle - n) * 1.6) / 0.42;
        const size = twinkleSize(t) * 0.3;
        tw.visible = size > 0.006;
        if (!tw.visible) return;
        const a = n * 2.39 + k * 2.1 + i;
        tw.position.set(Math.cos(a) * 0.42, Math.sin(a * 1.3) * 0.42, 0.3);
        tw.scale.setScalar(size);
        tw.rotation.z = t * 0.8;
      });
    });
  }

  dispose(): void {
    this.sparks.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
