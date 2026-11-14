import * as THREE from 'three';
import { bakeVertexColor, createPs1Material } from '../render/ps1Material';
import { getTexture } from '../render/textures';

const GRAVITY = 18;
const LIFE = 5; // seconds a piece lies there before it is gone
const SHRINK_FROM = 3; // it starts shrinking away here, and blinks near the end

interface Piece {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  thick: number; // half of the thin side, for resting on the floor
  floorY: number;
  age: number;
  landed: boolean;
}

/**
 * Splinters of broken crates. Pieces fly out, tumble, bounce, settle flat on the ground,
 * then shrink away and blink out, the way smashed objects vanished in old games.
 */
export class Debris {
  private readonly pieces: Piece[] = [];
  private readonly material = createPs1Material({ tex: getTexture('crate') });
  private readonly staveMat = createPs1Material({ tex: getTexture('planks') });
  private readonly metalMat = createPs1Material({ lit: true });
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly heights: number[] = [];
  private readonly staves: THREE.BufferGeometry[] = [];
  private readonly shards: THREE.BufferGeometry[] = [];

  constructor(private readonly parent: THREE.Object3D, private readonly groundAt: (x: number, y: number, z: number) => number | null) {
    // A few plank shapes, thin on y so they lie flat.
    const shapes: [number, number, number][] = [
      [0.55, 0.08, 0.14], [0.42, 0.07, 0.12], [0.3, 0.09, 0.16], [0.22, 0.12, 0.22], [0.5, 0.06, 0.1], [0.16, 0.16, 0.16],
    ];
    for (const [w, h, d] of shapes) {
      const g = new THREE.BoxGeometry(w, h, d);
      bakeVertexColor(g, 0xf2e6d2);
      this.geos.push(g);
      this.heights.push(h);
    }
    // Barrel staves: long, thin, slightly bent; plus a hoop piece.
    for (const [w, h, d] of [[0.16, 0.06, 0.8], [0.14, 0.06, 0.65], [0.16, 0.06, 0.5]] as const) {
      const g = new THREE.BoxGeometry(w, h, d, 1, 1, 3);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + 0.08 * (1 - (2 * p.getZ(i) / d) ** 2));
      g.computeVertexNormals();
      bakeVertexColor(g, 0xf4d8b0);
      this.staves.push(g);
    }
    const hoop = new THREE.TorusGeometry(0.3, 0.03, 3, 8, Math.PI * 0.8);
    hoop.rotateX(Math.PI / 2);
    bakeVertexColor(hoop, 0x3a3a40);
    this.staves.push(hoop);
    // Pipe shards: rusty curved bits and green flecks.
    for (const [c, sz] of [[0x9a6a3a, 0.22], [0x7a8a7a, 0.18], [0x6aff4a, 0.12]] as const) {
      const g = new THREE.BoxGeometry(sz, 0.05, sz * 0.7);
      bakeVertexColor(g, c);
      this.shards.push(g);
    }
  }

  /** Removes every piece, for a new level. */
  clear(): void {
    for (const p of this.pieces) this.parent.remove(p.mesh);
    this.pieces.length = 0;
  }

  /** Bursts a crate at (x, y, z) into pieces, thrown away from (fromX, fromZ). */
  burst(x: number, y: number, z: number, half: number, fromX: number, fromZ: number, type: 'crate' | 'barrel' | 'pipe' = 'crate'): void {
    const away = Math.atan2(x - fromX, z - fromZ);
    const floorY = this.groundAt(x, y + 0.6, z);
    const geos = type === 'barrel' ? this.staves : type === 'pipe' ? this.shards : this.geos;
    const material = type === 'barrel' ? this.staveMat : type === 'pipe' ? this.metalMat : this.material;
    const count = type === 'barrel' ? 12 : type === 'pipe' ? 8 : 11;
    for (let i = 0; i < count; i++) {
      const gi = i % geos.length;
      const mesh = new THREE.Mesh(geos[gi], i === count - 1 && type === 'barrel' ? this.metalMat : material);
      const ox = (Math.random() - 0.5) * half * 1.6;
      const oz = (Math.random() - 0.5) * half * 1.6;
      mesh.position.set(x + ox, y + (Math.random() - 0.3) * half, z + oz);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.parent.add(mesh);
      // Mostly outward and a bit with the blow, always upward.
      const dir = away + (Math.random() - 0.5) * 2.4;
      const sp = 1.2 + Math.random() * 2.6;
      this.pieces.push({
        mesh,
        vx: Math.sin(dir) * sp + ox * 3,
        vy: 3 + Math.random() * 4,
        vz: Math.cos(dir) * sp + oz * 3,
        spinX: (Math.random() - 0.5) * 16,
        spinY: (Math.random() - 0.5) * 12,
        spinZ: (Math.random() - 0.5) * 16,
        thick: type === 'crate' ? this.heights[gi] / 2 : 0.04,
        floorY: floorY ?? -100,
        age: 0,
        landed: false,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      const m = p.mesh;
      p.age += dt;
      if (!p.landed || p.vy > 0.01 || m.position.y > p.floorY + p.thick + 0.001) {
        p.vy -= GRAVITY * dt;
        m.position.x += p.vx * dt;
        m.position.y += p.vy * dt;
        m.position.z += p.vz * dt;
        m.rotation.x += p.spinX * dt;
        m.rotation.y += p.spinY * dt;
        m.rotation.z += p.spinZ * dt;
        const rest = p.floorY + p.thick;
        if (m.position.y <= rest) {
          m.position.y = rest;
          if (p.vy < -1.5) {
            // Bounce, losing most of the energy, and slow the spin.
            p.vy = -p.vy * 0.38;
            p.vx *= 0.6;
            p.vz *= 0.6;
            p.spinX *= 0.5;
            p.spinY *= 0.5;
            p.spinZ *= 0.5;
          } else {
            p.vy = 0;
            p.vx = 0;
            p.vz = 0;
            p.spinX = p.spinY = p.spinZ = 0;
            p.landed = true;
          }
        }
        // Fell into the pit: gone.
        if (m.position.y < -6) p.age = LIFE;
      }
      if (p.landed) {
        // Lie flat: ease the tilt out and keep the spin about the vertical.
        const k = Math.min(1, dt * 12);
        m.rotation.x += (Math.round(m.rotation.x / Math.PI) * Math.PI - m.rotation.x) * k;
        m.rotation.z += (Math.round(m.rotation.z / Math.PI) * Math.PI - m.rotation.z) * k;
      }
      // Slowly disappear: shrink, then blink right at the end.
      if (p.age > SHRINK_FROM) {
        const t = (p.age - SHRINK_FROM) / (LIFE - SHRINK_FROM);
        m.scale.setScalar(Math.max(0.01, 1 - t));
        m.visible = t < 0.6 || Math.floor(p.age * 20) % 2 === 0;
      }
      if (p.age >= LIFE) {
        this.parent.remove(m);
        this.pieces.splice(i, 1);
      }
    }
  }

  get count(): number {
    return this.pieces.length;
  }
}
