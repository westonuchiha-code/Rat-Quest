/**
 * Golden Wedges in the world: a glowing wedge of golden cheese that turns slowly and bobs.
 * One taken on an earlier visit shows as a pale, see-through ghost, so he can tell what is left.
 */
import * as THREE from 'three';
import type { WedgeDef } from '../levels/types';

const GOLD = 0xffc93a;
const RIND = 0xd8861c;
const HOLE = 0x9a5a10;
const GHOST = 0x8fb4ff;

function wedgeGeometry(): THREE.ExtrudeGeometry {
  // Seen side-on: a wedge point-down, with a rounded rind across the top.
  const s = new THREE.Shape();
  s.moveTo(0, -0.55);
  s.lineTo(0.5, 0.3);
  s.quadraticCurveTo(0, 0.52, -0.5, 0.3);
  s.lineTo(0, -0.55);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.34, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -0.17);
  return g;
}

export class WedgeVisuals {
  readonly group = new THREE.Group();
  private readonly items: Array<{ def: WedgeDef; root: THREE.Group; mats: THREE.MeshBasicMaterial[]; ghost: boolean | null }> = [];

  constructor(defs: WedgeDef[]) {
    const geo = wedgeGeometry();
    const rindGeo = new THREE.BoxGeometry(0.9, 0.08, 0.36);
    const holeGeo = new THREE.CircleGeometry(0.075, 7);
    defs.forEach((def, n) => {
      const root = new THREE.Group();
      root.position.set(def.x, def.y + 0.85, def.z);
      root.rotation.y = n * 1.3;
      const body = new THREE.MeshBasicMaterial({ color: GOLD });
      const rind = new THREE.MeshBasicMaterial({ color: RIND });
      const hole = new THREE.MeshBasicMaterial({ color: HOLE });
      root.add(new THREE.Mesh(geo, body));
      const top = new THREE.Mesh(rindGeo, rind);
      top.position.y = 0.36;
      root.add(top);
      for (const [x, y, side] of [[-0.12, 0.05, 1], [0.15, -0.15, 1], [0.05, 0.18, -1], [-0.1, -0.22, -1]] as const) {
        const h = new THREE.Mesh(holeGeo, hole);
        h.position.set(x, y, 0.172 * side);
        if (side < 0) h.rotation.y = Math.PI;
        root.add(h);
      }
      // A soft halo behind it, so it can be spotted from across the course.
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.9, 16), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      root.add(halo);
      root.visible = false;
      this.group.add(root);
      this.items.push({ def, root, mats: [body, rind, hole, halo.material as THREE.MeshBasicMaterial], ghost: null });
    });
  }

  /** Call every frame. `out(i)`: it is in the course; `got(i)`: he has it already. */
  update(time: number, out: (i: number) => boolean, got: (i: number) => boolean, camYaw: number): void {
    this.items.forEach((it, i) => {
      it.root.visible = out(i);
      if (!it.root.visible) return;
      const ghost = got(i);
      if (ghost !== it.ghost) {
        it.ghost = ghost;
        it.mats.forEach((m, k) => {
          m.color.setHex(ghost ? GHOST : [GOLD, RIND, HOLE, GOLD][k]);
          m.transparent = true;
          m.opacity = ghost ? (k === 3 ? 0.08 : 0.4) : k === 3 ? 0.16 : 1;
          m.depthWrite = !ghost && k !== 3;
        });
      }
      it.root.rotation.y = time * 1.6 + i * 1.3;
      it.root.position.y = it.def.y + 0.85 + Math.sin(time * 2.2 + i) * 0.12;
      // The halo always faces the camera.
      const halo = it.root.children[it.root.children.length - 1];
      halo.rotation.y = camYaw - it.root.rotation.y;
    });
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
