import * as THREE from 'three';

/**
 * A short glowing ribbon that follows the blade during a swing. It is built from the last few blade positions,
 * so it bends along the real arc of the sword, and it fades out behind it.
 */
export class SwordTrail {
  readonly mesh: THREE.Mesh;
  private readonly max: number;
  private readonly life = 0.14; // seconds a slice of the ribbon stays visible
  private readonly bases: THREE.Vector3[] = [];
  private readonly tips: THREE.Vector3[] = [];
  private readonly ages: number[] = [];
  private count = 0;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry = new THREE.BufferGeometry();

  constructor(max = 14) {
    this.max = max;
    for (let i = 0; i < max; i++) {
      this.bases.push(new THREE.Vector3());
      this.tips.push(new THREE.Vector3());
      this.ages.push(0);
    }
    this.positions = new Float32Array(max * 2 * 3);
    this.colors = new Float32Array(max * 2 * 3);
    const index: number[] = [];
    for (let i = 0; i < max - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.geometry.setIndex(index);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.geometry.setDrawRange(0, 0);
  }

  /** Call every frame. While emitting, the current blade position is added to the front of the ribbon. */
  update(dt: number, emitting: boolean, base: THREE.Vector3, tip: THREE.Vector3): void {
    for (let i = 0; i < this.count; i++) this.ages[i] += dt;
    while (this.count > 0 && this.ages[this.count - 1] > this.life) this.count--;

    if (emitting) {
      // Shift everything back one slot and put the newest slice at the front.
      const n = Math.min(this.count, this.max - 1);
      for (let i = n; i > 0; i--) {
        this.bases[i].copy(this.bases[i - 1]);
        this.tips[i].copy(this.tips[i - 1]);
        this.ages[i] = this.ages[i - 1];
      }
      this.bases[0].copy(base);
      this.tips[0].copy(tip);
      this.ages[0] = 0;
      this.count = n + 1;
    }

    for (let i = 0; i < this.count; i++) {
      const fade = Math.max(0, 1 - this.ages[i] / this.life);
      const k = fade * fade;
      this.positions.set([this.bases[i].x, this.bases[i].y, this.bases[i].z, this.tips[i].x, this.tips[i].y, this.tips[i].z], i * 6);
      // Dim at the hilt, bright at the tip. With additive blending, black is invisible.
      this.colors.set([0.25 * k, 0.3 * k, 0.32 * k, 0.85 * k, 0.95 * k, 1.0 * k], i * 6);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, this.count >= 2 ? (this.count - 1) * 6 : 0);
  }
}
