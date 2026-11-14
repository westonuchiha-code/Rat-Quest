import * as THREE from 'three';
import { ITEMS, PickupDef } from '../data/equipment';
import { buildHelmet, buildScarfPickup } from '../player/ratModel';
import type { Equipment } from '../player/equipment';

const POP_TIME = 0.35;

interface Entry {
  def: PickupDef;
  root: THREE.Group;
  spin: THREE.Group;
  glow: THREE.Mesh;
  phase: number;
  pop: number; // seconds into the pickup pop, or -1
}

/** Gear lying in the room: a slowly turning, bobbing model with a glowing ring under it. */
export class PickupVisuals {
  readonly group = new THREE.Group();
  private readonly entries: Entry[] = [];

  constructor(defs: PickupDef[], private readonly equipment: Equipment) {
    defs.forEach((def, i) => {
      const item = ITEMS[def.itemId];
      const root = new THREE.Group();
      root.position.set(def.x, def.y, def.z);
      const spin = new THREE.Group();
      if (item.slot === 'helmet') {
        const helm = buildHelmet({ dome: item.colors.dome, rim: item.colors.rim, spike: item.colors.spike });
        helm.position.y = -0.14; // centre it on the head's centre
        spin.add(helm);
        spin.scale.setScalar(2.4);
      } else if (item.slot === 'scarf') {
        spin.add(buildScarfPickup({ cloth: item.colors.cloth, trim: item.colors.trim }));
        spin.scale.setScalar(2.4);
      }
      root.add(spin);
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(0.45, 0.62, 16),
        new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = -0.5;
      root.add(glow);
      root.visible = !equipment.owns(def.itemId);
      this.group.add(root);
      this.entries.push({ def, root, spin, glow, phase: i * 1.3, pop: -1 });
    });
  }

  /** The pickups that are still lying there. */
  remaining(): PickupDef[] {
    return this.entries.filter((e) => e.pop < 0 && e.root.visible).map((e) => e.def);
  }

  /** Starts the pickup pop for an item that was just taken. */
  taken(itemId: string): void {
    for (const e of this.entries) if (e.def.itemId === itemId && e.pop < 0 && e.root.visible) e.pop = 0;
  }

  /** Brings back pickups he does not own, after a reset. */
  refresh(): void {
    for (const e of this.entries) {
      e.pop = -1;
      e.root.visible = !this.equipment.owns(e.def.itemId);
      e.spin.scale.setScalar(2.4);
      e.root.position.set(e.def.x, e.def.y, e.def.z);
    }
  }

  update(dt: number, time: number): void {
    for (const e of this.entries) {
      if (!e.root.visible) continue;
      e.spin.rotation.y += dt * 1.6;
      const bob = Math.sin(time * 2 + e.phase) * 0.08;
      if (e.pop >= 0) {
        e.pop += dt;
        const k = Math.min(1, e.pop / POP_TIME);
        e.spin.scale.setScalar(2.4 * (1 + k * 0.8) * (1 - k * k));
        e.root.position.y = e.def.y + k * 0.6;
        if (k >= 1) e.root.visible = false;
      } else {
        e.root.position.y = e.def.y + bob;
      }
      (e.glow.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.3 * Math.sin(time * 3 + e.phase);
      e.glow.scale.setScalar(1 + 0.12 * Math.sin(time * 3 + e.phase));
    }
  }
}
