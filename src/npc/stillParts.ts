/**
 * STILL PARTS JOINED (2026-11-19, to draw the characters in fewer calls: in the Hall they were 832 meshes, each its
 * own draw call). A character is many small shapes; most never move on their own, only with the joint they hang
 * from (a shoulder, the head). Those are joined, per joint and per material, into one mesh. What moves BY ITSELF
 * (an eye that blinks, a jaw, a mug lifted, anything shown and hidden) stays its own mesh.
 *
 * Which is which is found by trying, not by reading the code: a TWIN of the character is built and put through
 * everything it does (`exercise`), and every mesh whose own place, turn, size, visibility or material ever changed
 * is kept apart. The twin is built the same way, so its meshes match the real one's in the order they are met.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface Seen {
  m: THREE.Mesh;
  matrix: number[];
  visible: boolean;
  material: THREE.Material | THREE.Material[];
  geometry: THREE.BufferGeometry;
}


const objectsOf = (root: THREE.Object3D): THREE.Object3D[] => {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => out.push(o));
  return out;
};

const look = (o: THREE.Object3D): Seen => {
  o.updateMatrix();
  const m = o as THREE.Mesh;
  return { m, matrix: o.matrix.toArray(), visible: o.visible, material: m.material, geometry: m.geometry };
};

const same = (a: Seen, b: Seen): boolean =>
  a.visible === b.visible && a.material === b.material && a.geometry === b.geometry && a.matrix.every((v, i) => Math.abs(v - b.matrix[i]) < 1e-9);

/**
 * The objects of the twin (meshes and the joints they hang from, by their place in a traversal) that ever changed while `exercise` ran. `exercise` is
 * called with a function to call after each step, which looks again.
 */
export function movingMeshes(twin: THREE.Object3D, exercise: (looked: () => void) => void): Set<number> {
  const all = objectsOf(twin);
  const first = all.map(look);
  const moved = new Set<number>();
  exercise(() => {
    all.forEach((o, i) => {
      if (!moved.has(i) && !same(first[i], look(o))) moved.add(i);
    });
  });
  // (Anything added or taken away while it ran: nothing can be trusted. Join nothing.)
  if (objectsOf(twin).length !== all.length) return new Set(all.map((_, i) => i));
  return moved;
}

/** What a joined mesh must agree on to be drawn as one. */
const keyOf = (m: THREE.Mesh): string => {
  const g = m.geometry;
  const attrs = Object.keys(g.attributes).sort().map((k) => `${k}${g.attributes[k].itemSize}`).join(',');
  return [(m.material as THREE.Material).uuid, m.renderOrder, m.frustumCulled, m.castShadow, m.receiveShadow, attrs, g.morphAttributes && Object.keys(g.morphAttributes).length].join('|');
};

/**
 * Joins `root`'s still meshes (every mesh but those in `moving`, by traversal place), per parent and per material.
 * Returns how many meshes there were and are.
 */
export function joinStill(root: THREE.Object3D, moving: Set<number>): { before: number; after: number } {
  const all = objectsOf(root);
  const still = new Set(all.filter((_, i) => !moving.has(i)));
  const meshes = all.filter((o) => (o as THREE.Mesh).isMesh) as THREE.Mesh[];
  // Each still mesh goes up through the joints over it that never move, to the first that does (or the root):
  // that is what it really hangs from. Its place there is every still joint's on the way, one after another.
  const groups = new Map<THREE.Object3D, Map<string, Array<{ m: THREE.Mesh; at: THREE.Matrix4 }>>>();
  for (const m of meshes) {
    if (!still.has(m) || !m.parent || m.children.length || Array.isArray(m.material) || !m.visible) continue;
    // (Anything tagged for the game's own use, or of a special kind, is left as it is.)
    if (Object.keys(m.userData).length || (m as THREE.SkinnedMesh).isSkinnedMesh || (m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh || m.geometry.groups.length > 1) continue;
    m.updateMatrix();
    const at = m.matrix.clone();
    let anchor = m.parent;
    let hidden = false;
    while (anchor !== root && still.has(anchor) && anchor.parent && Object.keys(anchor.userData).length === 0) {
      if (!anchor.visible) hidden = true;
      anchor.updateMatrix();
      at.premultiply(anchor.matrix);
      anchor = anchor.parent;
    }
    if (hidden) continue;
    let byKey = groups.get(anchor);
    if (!byKey) groups.set(anchor, (byKey = new Map()));
    const k = keyOf(m);
    byKey.set(k, [...(byKey.get(k) ?? []), { m, at }]);
  }
  let removed = 0;
  for (const [anchor, byKey] of groups) {
    for (const parts of byKey.values()) {
      if (parts.length < 2) continue;
      const geos = parts.map(({ m, at }) => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(at));
      const joined = mergeGeometries(geos);
      for (const g of geos) g.dispose();
      if (!joined) continue;
      const first = parts[0].m;
      const one = new THREE.Mesh(joined, first.material);
      one.renderOrder = first.renderOrder;
      one.frustumCulled = first.frustumCulled;
      one.castShadow = first.castShadow;
      one.receiveShadow = first.receiveShadow;
      one.name = 'joined';
      anchor.add(one);
      for (const { m } of parts) m.parent?.remove(m);
      removed += parts.length - 1;
    }
  }
  return { before: meshes.length, after: meshes.length - removed };
}
