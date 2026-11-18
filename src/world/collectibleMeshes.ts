/**
 * The collectibles in a level, drawn: each turns and bobs over its own shadow, glints now and then, and goes in a pop
 * and a burst of sparks when he takes it. The shapes themselves are in itemModels.ts.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CollectibleDef, CollectibleKind, CollectibleTracker, LevelDef } from './collectibles';
import { Sparks, capGeometry, crumbGeometry, glowMaterial, itemMaterial, relicGeometry, relicRingGeometry, shadowGeometry, shadowMaterial, twinkleGeometry, twinkleSize } from './itemModels';

const POP_TIME = 0.25;
const POP_SCALE = 1.6;
const POP_RISE = 0.3;

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** How each kind carries itself: how fast it turns, how wide its shadow is, how often and how big it twinkles, and the colour of its sparks. */
export const ITEM_LOOK: Record<CollectibleKind, { scale: number; turn: number; shadow: number; twinkleEvery: number; twinkle: number; reach: number; sparks: number; sparkCount: number }> = {
  crumb: { scale: 1, turn: 1.8, shadow: 0.42, twinkleEvery: 5.5, twinkle: 0.11, reach: 0.16, sparks: 0xffe680, sparkCount: 5 },
  cap: { scale: 1, turn: 3.2, shadow: 0.36, twinkleEvery: 2.6, twinkle: 0.16, reach: 0.15, sparks: 0xf0f6ff, sparkCount: 7 },
  relic: { scale: 1.15, turn: 1.3, shadow: 0.6, twinkleEvery: 1.7, twinkle: 0.24, reach: 0.3, sparks: 0xfff0a0, sparkCount: 12 },
};

interface Entry {
  def: CollectibleDef;
  root: THREE.Group; // position and scale
  spin: THREE.Mesh; // rotates about Y
  ring: THREE.Mesh | null; // the relic's ring, turning the other way
  shadow: THREE.Mesh | null; // on the floor under it, if there is floor near enough
  twinkle: THREE.Mesh;
  phase: number;
  pop: number; // -1 when idle, otherwise seconds into the pop
}

export interface ItemDressing {
  /** The height of the floor under a point, or null if there is none near below it. Without this there are no shadows. */
  floorAt?: (x: number, y: number, z: number) => number | null;
}

/** A hunk of cheese (a crumb worth more than one): bigger, slower, brighter. */
export const HUNK_LOOK: (typeof ITEM_LOOK)['crumb'] = { scale: 2.1, turn: 1.2, shadow: 0.7, twinkleEvery: 2.2, twinkle: 0.2, reach: 0.3, sparks: 0xffe680, sparkCount: 12 };
/** How a thing carries itself: its kind's way, or a hunk's. */
export const lookOf = (def: CollectibleDef): (typeof ITEM_LOOK)['crumb'] => (def.kind === 'crumb' && (def.worth ?? 1) > 1 ? HUNK_LOOK : ITEM_LOOK[def.kind]);

export class CollectibleVisuals {
  readonly group = new THREE.Group();
  readonly sparks = new Sparks();
  private readonly entries = new Map<string, Entry>();
  private readonly tracker: CollectibleTracker;
  private readonly geometries: Record<CollectibleKind, THREE.BufferGeometry>;
  private readonly material = itemMaterial();
  /**
   * Moves an item to another place (it was in a crate that was carried off and broken somewhere else: world/lifting.ts).
   * Its picture and its shadow go there (`floor`: the ground under it, or null for none); the game moves what is taken.
   */
  moveItem(id: string, x: number, y: number, z: number, floor: number | null): void {
    const e = this.entries.get(id);
    if (!e) return;
    e.root.position.set(x, y, z);
    if (e.shadow) {
      e.shadow.position.set(x, (floor ?? y - 0.5) + 0.025, z);
    }
  }
  /** Items this returns true for are not drawn (still inside a crate). */
  hidden: ((def: CollectibleDef) => boolean) | null = null;

  constructor(level: LevelDef, tracker: CollectibleTracker, dressing: ItemDressing = {}) {
    this.tracker = tracker;
    this.group.name = `collectibles:${level.id}`;
    // One geometry per kind, shared by all items of that kind.
    this.geometries = { crumb: crumbGeometry(), cap: capGeometry(), relic: relicGeometry() };
    const ringGeo = relicRingGeometry();
    const shadowGeo = shadowGeometry();
    const shadowMat = shadowMaterial();
    const twinkleGeo = twinkleGeometry();
    const twinkleMat = glowMaterial(0xffffff);
    this.group.add(this.sparks.group);

    level.items.forEach((def, index) => {
      const look = lookOf(def);
      const root = new THREE.Group();
      root.position.set(def.x, def.y, def.z);
      const spin = new THREE.Mesh(this.geometries[def.kind], this.material);
      spin.scale.setScalar(look.scale);
      root.add(spin);
      let ring: THREE.Mesh | null = null;
      if (def.kind === 'relic') {
        ring = new THREE.Mesh(ringGeo, this.material);
        ring.scale.setScalar(look.scale);
        root.add(ring);
      }
      const twinkle = new THREE.Mesh(twinkleGeo, twinkleMat);
      twinkle.visible = false;
      root.add(twinkle);
      let shadow: THREE.Mesh | null = null;
      const floor = dressing.floorAt?.(def.x, def.y, def.z) ?? null;
      if (floor !== null) {
        shadow = new THREE.Mesh(shadowGeo, shadowMat);
        shadow.position.set(def.x, floor + 0.025, def.z);
        shadow.scale.setScalar(look.shadow);
        this.group.add(shadow);
      }
      root.visible = !tracker.isCollected(def.id);
      if (shadow) shadow.visible = root.visible;
      this.group.add(root);
      this.entries.set(def.id, { def, root, spin, ring, shadow, twinkle, phase: index * 1.7, pop: -1 });
    });
  }

  /** How many of the level's items have a shadow on the floor under them. */
  get shadowCount(): number {
    let n = 0;
    for (const e of this.entries.values()) if (e.shadow) n++;
    return n;
  }

  /** Starts the pickup pop for items the tracker just reported: a swell, and a burst of sparks. */
  collected(defs: CollectibleDef[]): void {
    for (const def of defs) {
      const e = this.entries.get(def.id);
      if (!e || e.pop >= 0) continue;
      e.pop = 0;
      const look = lookOf(def);
      this.sparks.burst(e.root.position.x, e.root.position.y, e.root.position.z, look.sparks, look.sparkCount, def.kind === 'relic' ? 3 : 2.2, def.kind === 'relic' ? 0.22 : 0.15);
    }
  }

  /** `face`: the camera's turn, so twinkles and sparks are seen flat-on. */
  update(dt: number, time: number, face?: THREE.Quaternion): void {
    this.sparks.update(dt, face);
    for (const e of this.entries.values()) {
      const look = lookOf(e.def);
      if (e.pop >= 0) {
        e.pop += dt;
        const k = Math.min(1, e.pop / POP_TIME);
        e.root.scale.setScalar(1 + (POP_SCALE - 1) * k);
        e.root.position.y = e.def.y + POP_RISE * k;
        e.spin.rotation.y += dt * 12;
        e.twinkle.visible = false;
        if (e.shadow) e.shadow.visible = false;
        if (k >= 1) {
          e.pop = -1;
          e.root.visible = false;
        }
        continue;
      }
      // Idle: follow the tracker, so a reset brings items back.
      const show = !this.tracker.isCollected(e.def.id) && !this.hidden?.(e.def);
      e.root.visible = show;
      if (e.shadow) e.shadow.visible = show;
      if (!show) continue;
      const bob = Math.sin(time * 2 + e.phase) * 0.06;
      e.root.scale.setScalar(1);
      e.root.position.y = e.def.y + bob;
      e.spin.rotation.y = time * look.turn + e.phase;
      if (e.ring) e.ring.rotation.set(1.15 + 0.25 * Math.sin(time * 0.9 + e.phase), -time * 1.9 - e.phase, 0);
      // The shadow tightens a little as the thing rises over it.
      if (e.shadow) e.shadow.scale.setScalar(look.shadow * (1 - bob * 1.5));
      // A twinkle: every few seconds a star snaps open on it and shuts, each time somewhere else on it.
      const cycle = (time + e.phase * 0.61) / look.twinkleEvery;
      const n = Math.floor(cycle);
      const t = ((cycle - n) * look.twinkleEvery) / 0.38;
      const size = twinkleSize(t) * look.twinkle;
      e.twinkle.visible = size > 0.005;
      if (e.twinkle.visible) {
        const a = n * 2.4 + e.phase;
        e.twinkle.position.set(Math.cos(a) * look.reach, Math.sin(a * 1.7) * look.reach * 0.8 + 0.03, Math.sin(a) * look.reach);
        e.twinkle.scale.setScalar(size);
        if (face) e.twinkle.quaternion.copy(face);
        e.twinkle.rotateZ(t * 0.9);
      }
    }
  }
}
