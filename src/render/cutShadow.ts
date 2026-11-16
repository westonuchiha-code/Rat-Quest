/**
 * EVERY ROUND SHADOW IS CUT WHERE ITS GROUND ENDS. The knight's has been since the owner found it standing out in the
 * air past a post (world/shadow.ts); this does the same for the dark disc under each creature, each talking character
 * and each of a scene's cast. What is DRAWN matches what is SOLID.
 *
 * A model's shadow is found by what it is: a flat disc (a `CircleGeometry`) in a black see-through material that does
 * not write depth. Nothing has to be said in the model. Its outline is turned, stretched and tilted with the model,
 * so the cut is worked out from where its rim really is in the room, point by point.
 *
 * It is only worked out again when the shadow has moved (or once in a while, for a floor that moves under it).
 */
import * as THREE from 'three';
import type { Aabb } from '../world/collision';
import { cutOutline } from '../world/shadow';

/** How high the models lay their shadows over the floor. */
const LIFT = 0.02;
/** A still shadow is looked at again after this many frames, in case its ground has moved. */
const AGAIN = 20;

interface Kept {
  base: Float32Array;
  last: Float32Array;
  wait: number;
  cut: boolean;
}

const v = new THREE.Vector3();
const rim: number[] = [];
const lens: number[] = [];

export function isBlobShadow(o: THREE.Object3D): o is THREE.Mesh {
  const m = o as THREE.Mesh;
  if (!m.isMesh || m.geometry.type !== 'CircleGeometry') return false;
  const mat = m.material as THREE.MeshBasicMaterial;
  return !Array.isArray(mat) && mat.transparent === true && mat.depthWrite === false && !!mat.color && mat.color.getHex() === 0;
}

export class ShadowCuts {
  private readonly found = new WeakMap<THREE.Object3D, THREE.Mesh[]>();
  private readonly kept = new WeakMap<THREE.Mesh, Kept>();
  /** How many shadows were worked out again in the last frame (for tests and the frame-time count). */
  worked = 0;

  /** The round shadows under a model. (Looked for once: a model does not grow another.) */
  shadowsOf(root: THREE.Object3D): THREE.Mesh[] {
    let list = this.found.get(root);
    if (!list) {
      list = [];
      root.traverse((o) => {
        if (isBlobShadow(o)) list!.push(o);
      });
      this.found.set(root, list);
    }
    return list;
  }

  /** Cuts each round shadow under `root` to the ground it lies on. Call it once the model is where it will be drawn. */
  cut(root: THREE.Object3D, colliders: readonly Aabb[]): void {
    for (const mesh of this.shadowsOf(root)) {
      if (!mesh.visible || !root.visible) continue;
      mesh.updateWorldMatrix(true, false);
      const e = mesh.matrixWorld.elements;
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
      let k = this.kept.get(mesh);
      if (!k) {
        k = { base: Float32Array.from(pos.array as Float32Array), last: new Float32Array(16).fill(NaN), wait: 0, cut: false };
        this.kept.set(mesh, k);
      }
      let moved = false;
      for (let i = 0; i < 16; i++) {
        if (Math.abs(k.last[i] - e[i]) > 1e-4 || k.last[i] !== k.last[i]) moved = true;
      }
      if (!moved && --k.wait > 0) continue;
      k.last.set(e);
      k.wait = AGAIN;
      this.worked++;
      // Its rim, in the room. (The first point of a disc is its middle; the rest go round it.)
      const n = pos.count - 1;
      rim.length = n * 2;
      for (let i = 0; i < n; i++) {
        v.set(k.base[(i + 1) * 3], k.base[(i + 1) * 3 + 1], k.base[(i + 1) * 3 + 2]).applyMatrix4(mesh.matrixWorld);
        rim[i * 2] = v.x;
        rim[i * 2 + 1] = v.z;
      }
      v.set(0, 0, 0).applyMatrix4(mesh.matrixWorld);
      const whole = !cutOutline(colliders, v.x, v.y - LIFT, v.z, rim, lens) || lens.every((l) => l === 1);
      if (whole && !k.cut) continue;
      for (let i = 0; i < n; i++) {
        const l = whole ? 1 : lens[i];
        pos.setXYZ(i + 1, k.base[(i + 1) * 3] * l, k.base[(i + 1) * 3 + 1] * l, k.base[(i + 1) * 3 + 2] * l);
      }
      pos.needsUpdate = true;
      k.cut = !whole;
    }
  }
}
