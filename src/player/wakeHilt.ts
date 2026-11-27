/**
 * Where his half sword lies when he comes to (the game's first moment): off his sword paw's side and a little ahead,
 * FLAT on the floor (the flat of its blade down), set down by its own lowest point so that nothing of it is under the
 * floor (2026-11-27: laid on its edge at first, it stood taller than a hilt and dipped under; `tests/wakeclip.ts`).
 */
import * as THREE from 'three';
import { WAKE_HILT } from './animations';

export function placeHilt(h: THREE.Object3D, at: THREE.Vector3, facing: number): void {
  const rx = -Math.cos(facing);
  const rz = Math.sin(facing);
  h.rotation.set(0, facing + WAKE_HILT.turn, 0);
  h.position.set(at.x + rx * WAKE_HILT.right + Math.sin(facing) * WAKE_HILT.ahead, at.y, at.z + rz * WAKE_HILT.right + Math.cos(facing) * WAKE_HILT.ahead);
  h.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(h);
  h.position.y += at.y - box.min.y + 0.004;
}
