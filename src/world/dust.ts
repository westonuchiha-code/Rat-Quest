/**
 * DUST (2026-11-25): soft puffs that are thrown out, swell, slow and fade. For a heavy thing coming down (a bridge let
 * down). The owner, of the first try, which used the sparkle effect: "the dust ... just looks like stars and it also
 * only comes out of the middle ... it would come out of everywhere within the cracks and mostly at the sides".
 * So: a puff is a lumpy little ball, dull and matt, not a twinkle; and `along` lays a row of them down a line, each
 * pushed out across it.
 */
import * as THREE from 'three';

interface Puff { mesh: THREE.Mesh; vx: number; vy: number; vz: number; age: number; life: number; size: number }

export class Dust {
  readonly group = new THREE.Group();
  private readonly geo = new THREE.IcosahedronGeometry(1, 0);
  private readonly live: Puff[] = [];
  private seed = 7;
  private dice(): number {
    this.seed = (this.seed * 1103515245 + 12345) % 2147483648;
    return this.seed / 2147483648;
  }
  get count(): number {
    return this.live.length;
  }

  /** One puff at a place, thrown (vx, vy, vz). */
  puff(x: number, y: number, z: number, vx: number, vy: number, vz: number, size: number, color: number): void {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, depthWrite: false });
    const mesh = new THREE.Mesh(this.geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(this.dice() * 6, this.dice() * 6, this.dice() * 6);
    mesh.scale.setScalar(size * 0.4);
    this.group.add(mesh);
    this.live.push({ mesh, vx, vy, vz, age: 0, life: 0.7 + this.dice() * 0.5, size });
  }

  /**
   * A row of puffs along the line from (x0, z0) to (x1, z1) at height y, each thrown OUT across the line (to the side
   * (ox, oz), a unit way) and a little up: dust squeezed out of a seam. `every`: how far apart; `speed`: how hard.
   */
  along(x0: number, z0: number, x1: number, z1: number, y: number, ox: number, oz: number, every: number, speed: number, size: number, color: number): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / every));
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0.5;
      const k = 0.55 + this.dice() * 0.9;
      // (A little way along the seam as well as out of it, so that the row does not read as a row.)
      const slide = (this.dice() - 0.5) * 0.8;
      this.puff(
        x0 + (x1 - x0) * t + (this.dice() - 0.5) * every * 0.9 + ox * this.dice() * 0.25, y + this.dice() * 0.22, z0 + (z1 - z0) * t + (this.dice() - 0.5) * every * 0.9 + oz * this.dice() * 0.25,
        ox * speed * k + ((x1 - x0) / (len || 1)) * slide, 0.5 + this.dice() * 1.1, oz * speed * k + ((z1 - z0) / (len || 1)) * slide,
        size * (0.45 + this.dice() * this.dice() * 1.6), color,
      );
    }
  }

  update(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        this.live.splice(i, 1);
        continue;
      }
      // Thrown out fast, then hanging: it loses its speed quickly, drifts up a little, swells and thins.
      const drag = Math.exp(-3.2 * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * Math.exp(-2.2 * dt) + 0.25 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.scale.setScalar(p.size * (0.4 + 1.5 * (1 - (1 - u) * (1 - u))));
      p.mesh.rotation.y += dt * 0.8;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - u) * (1 - u);
    }
  }

  clear(): void {
    for (const p of this.live) {
      this.group.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
    }
    this.live.length = 0;
  }
}
