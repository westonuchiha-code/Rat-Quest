import * as THREE from 'three';

/**
 * A test view (the Workshop's "hit shapes" switch): what is solid, drawn on the floor. A ring for each body, the
 * wedge an attack reaches (yellow while it is being wound up, red while it can hurt), and the sweep of his sword.
 * What is drawn here is exactly what the combat code tests, so a blow that looks wrong can be checked against it.
 */
export interface ShapeFoe {
  x: number;
  y: number;
  z: number;
  facing: number;
  radius: number;
  alive: boolean;
  attackActive: boolean;
  attacking?: boolean;
  bite?: { reach: number; arc: number; ground?: boolean; heavy?: boolean; at?: { x: number; z: number; r: number } };
  biteDir?: number;
  /** The rest of a long body. */
  parts?: ReadonlyArray<{ x: number; z: number; r: number }>;
}
export interface ShapeRat {
  x: number;
  y: number;
  z: number;
  facing: number;
  radius: number;
  /** His swing, while it can hurt. */
  swing: { reach: number; arc: number } | null;
  guarding: boolean;
  blockArc: number;
}

const MAX = 6000;

export class HitShapes {
  readonly object: THREE.LineSegments;
  private readonly pos = new Float32Array(MAX * 3);
  private readonly col = new Float32Array(MAX * 3);
  private n = 0;

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.object = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
    this.object.frustumCulled = false;
    this.object.renderOrder = 999;
    this.object.visible = false;
  }

  private seg(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: readonly [number, number, number]): void {
    if (this.n + 2 > MAX) return;
    this.pos.set([x0, y0, z0, x1, y1, z1], this.n * 3);
    this.col.set([c[0], c[1], c[2], c[0], c[1], c[2]], this.n * 3);
    this.n += 2;
  }
  /** A ring, or part of one: from `from` to `to` radians round `dir`, with spokes to the middle if it is a wedge. */
  private arc(x: number, y: number, z: number, r: number, dir: number, half: number, c: readonly [number, number, number], inner = 0): void {
    const whole = half >= Math.PI - 1e-3;
    const steps = Math.max(6, Math.ceil((half * 2 * 28) / (Math.PI * 2)));
    let px = 0;
    let pz = 0;
    for (let i = 0; i <= steps; i++) {
      const a = dir - half + (half * 2 * i) / steps;
      const qx = x + Math.sin(a) * r;
      const qz = z + Math.cos(a) * r;
      if (i > 0) this.seg(px, y, pz, qx, y, qz, c);
      if (!whole && (i === 0 || i === steps)) this.seg(x + Math.sin(a) * inner, y, z + Math.cos(a) * inner, qx, y, qz, c);
      px = qx;
      pz = qz;
    }
  }

  /** Draws this frame's shapes. `ratRadius` is added to an attack's reach, as the combat code does. */
  update(on: boolean, foes: ShapeFoe[], rat: ShapeRat): void {
    this.object.visible = on;
    if (!on) return;
    this.n = 0;
    const WHITE = [1, 1, 1] as const;
    const RED = [1, 0.2, 0.15] as const;
    const YELLOW = [1, 0.85, 0.2] as const;
    const GREEN = [0.3, 1, 0.45] as const;
    const CYAN = [0.3, 0.9, 1] as const;
    const BLUE = [0.45, 0.6, 1] as const;
    for (const e of foes) {
      if (!e.alive) continue;
      const y = e.y + 0.06;
      this.arc(e.x, y, e.z, e.radius, 0, Math.PI, WHITE);
      // Which way it faces.
      this.seg(e.x, y, e.z, e.x + Math.sin(e.facing) * (e.radius + 0.35), y, e.z + Math.cos(e.facing) * (e.radius + 0.35), WHITE);
      for (const q of e.parts ?? []) this.arc(q.x, y, q.z, q.r, 0, Math.PI, WHITE);
      if ((e.attackActive || e.attacking) && e.bite) {
        // (A blow may come from a place on its body other than its middle: a tail.)
        const from = e.bite.at ?? { x: e.x, z: e.z, r: e.radius };
        const reach = from.r + e.bite.reach + rat.radius;
        this.arc(from.x, y + 0.02, from.z, reach, e.biteDir ?? e.facing, Math.min(Math.PI, e.bite.arc), e.attackActive ? RED : YELLOW, from.r);
        // A blow that runs along the floor (jump it) is marked with a second, lower line.
        if (e.bite.ground) this.arc(from.x, y + 0.02, from.z, reach - 0.12, e.biteDir ?? e.facing, Math.min(Math.PI, e.bite.arc), e.attackActive ? RED : YELLOW, reach - 0.12);
      }
    }
    const y = rat.y + 0.06;
    this.arc(rat.x, y, rat.z, rat.radius, 0, Math.PI, GREEN);
    this.seg(rat.x, y, rat.z, rat.x + Math.sin(rat.facing) * (rat.radius + 0.3), y, rat.z + Math.cos(rat.facing) * (rat.radius + 0.3), GREEN);
    if (rat.swing) this.arc(rat.x, y + 0.02, rat.z, rat.swing.reach, rat.facing, rat.swing.arc, CYAN, rat.radius);
    if (rat.guarding) this.arc(rat.x, y + 0.04, rat.z, rat.radius + 0.45, rat.facing, rat.blockArc, BLUE, rat.radius);
    const geo = this.object.geometry;
    geo.setDrawRange(0, this.n);
    (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  /** How many line ends were drawn last (for tests). */
  get count(): number {
    return this.n;
  }
}
