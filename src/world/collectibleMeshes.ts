/**
 * Three.js visuals for collectibles: low-poly faceted models, spin, bob and a pickup pop.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPs1Material, bakeVertexColor } from '../render/ps1Material';
import type { CollectibleDef, CollectibleKind, CollectibleTracker, LevelDef } from './collectibles';

const POP_TIME = 0.25;
const POP_SCALE = 1.6;
const POP_RISE = 0.3;

type V3 = [number, number, number];

/** Flat-shaded, colour-baked, non-indexed geometry with only position, normal and color. */
export function prep(geo: THREE.BufferGeometry, color: number, shade = true): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  g.computeVertexNormals(); // non-indexed, so every face is flat
  g = bakeVertexColor(g, color, shade);
  return g;
}

/** Triangles with an outward reference point; winding is fixed so each face points away from it. */
function triGeometry(tris: V3[][], inside: V3): THREE.BufferGeometry {
  const pos: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const mid = new THREE.Vector3();
  for (const t of tris) {
    a.set(...t[0]);
    b.set(...t[1]);
    c.set(...t[2]);
    n.subVectors(b, a).cross(c.clone().sub(a));
    mid.copy(a).add(b).add(c).divideScalar(3).sub(new THREE.Vector3(...inside));
    const flip = n.dot(mid) < 0;
    const order = flip ? [a, c, b] : [a, b, c];
    for (const v of order) pos.push(v.x, v.y, v.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** Cheese wedge: sloped top, with a few darker hole facets pressed onto the faces. */
function crumbGeometry(): THREE.BufferGeometry {
  const P0: V3 = [-0.15, 0, -0.17];
  const P1: V3 = [-0.15, 0, 0.17];
  const P2: V3 = [0.2, 0, 0];
  const Q0: V3 = [-0.15, 0.2, -0.17];
  const Q1: V3 = [-0.15, 0.2, 0.17];
  const Q2: V3 = [0.2, 0.04, 0];
  const centre: V3 = [-0.03, 0.08, 0];
  const body = triGeometry(
    [
      [P0, P1, P2], // bottom
      [Q0, Q1, Q2], // sloped top
      [P0, P1, Q1], [P0, Q1, Q0], // back
      [P0, P2, Q2], [P0, Q2, Q0], // one side
      [P1, P2, Q2], [P1, Q2, Q1], // other side
    ],
    centre,
  );
  const holes = triGeometry(
    [
      [[-0.153, 0.05, -0.08], [-0.153, 0.11, -0.04], [-0.153, 0.04, 0.0]], // back face
      [[-0.153, 0.12, 0.06], [-0.153, 0.17, 0.1], [-0.153, 0.1, 0.12]],
      [[0.02, 0.114, -0.06], [0.07, 0.108, -0.02], [0.03, 0.1, 0.0]], // top face
      [[-0.07, 0.18, 0.05], [-0.02, 0.17, 0.09], [-0.05, 0.162, 0.01]],
    ],
    [0, -1, 0],
  );
  return merge([prep(body, 0xf2c230), prep(holes, 0xa87812, false)]).translate(0, -0.08, 0);
}

/** Fluted metal bottle cap (10 sides) with a coloured top, tilted so it reads from the camera. */
function capGeometry(): THREE.BufferGeometry {
  const body = new THREE.CylinderGeometry(0.15, 0.175, 0.07, 10);
  const top = new THREE.CylinderGeometry(0.1, 0.1, 0.01, 10).translate(0, 0.038, 0);
  const rim = new THREE.CylinderGeometry(0.14, 0.14, 0.012, 10).translate(0, 0.034, 0);
  return merge([prep(body, 0x9aa0a6), prep(rim, 0xc8ced4), prep(top, 0xc0392b)]).rotateX(0.5);
}

/** Faceted golden gem: a six-sided crown over a pavilion. About 0.5 across. */
function relicGeometry(): THREE.BufferGeometry {
  const lower = new THREE.LatheGeometry(
    [new THREE.Vector2(0.001, -0.26), new THREE.Vector2(0.26, 0.0)],
    6,
  );
  const upper = new THREE.LatheGeometry(
    [new THREE.Vector2(0.26, 0.0), new THREE.Vector2(0.17, 0.12), new THREE.Vector2(0.001, 0.14)],
    6,
  );
  return merge([prep(lower, 0xe6a50c), prep(upper, 0xfff08a)]);
}

function buildGeometry(kind: CollectibleKind): THREE.BufferGeometry {
  if (kind === 'crumb') return crumbGeometry();
  if (kind === 'cap') return capGeometry();
  return relicGeometry();
}

interface Entry {
  def: CollectibleDef;
  root: THREE.Group; // position and scale
  spin: THREE.Mesh; // rotates about Y
  phase: number;
  pop: number; // -1 when idle, otherwise seconds into the pop
}

export class CollectibleVisuals {
  readonly group = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly tracker: CollectibleTracker;
  private readonly geometries: Record<CollectibleKind, THREE.BufferGeometry>;
  private readonly material = createPs1Material();
  /** Items this returns true for are not drawn (still inside a crate). */
  hidden: ((def: CollectibleDef) => boolean) | null = null;

  constructor(level: LevelDef, tracker: CollectibleTracker) {
    this.tracker = tracker;
    this.group.name = `collectibles:${level.id}`;
    // One geometry per kind, shared by all items of that kind.
    this.geometries = { crumb: buildGeometry('crumb'), cap: buildGeometry('cap'), relic: buildGeometry('relic') };

    level.items.forEach((def, index) => {
      const root = new THREE.Group();
      root.position.set(def.x, def.y, def.z);
      const spin = new THREE.Mesh(this.geometries[def.kind], this.material);
      if (def.kind === 'relic') spin.scale.setScalar(1.15);
      root.add(spin);
      root.visible = !tracker.isCollected(def.id);
      this.group.add(root);
      this.entries.set(def.id, { def, root, spin, phase: index * 1.7, pop: -1 });
    });
  }

  /** Starts the pickup pop for items the tracker just reported. */
  collected(defs: CollectibleDef[]): void {
    for (const def of defs) {
      const e = this.entries.get(def.id);
      if (e && e.pop < 0) e.pop = 0;
    }
  }

  update(dt: number, time: number): void {
    for (const e of this.entries.values()) {
      if (e.pop >= 0) {
        e.pop += dt;
        const k = Math.min(1, e.pop / POP_TIME);
        e.root.scale.setScalar(1 + (POP_SCALE - 1) * k);
        e.root.position.y = e.def.y + POP_RISE * k;
        e.spin.rotation.y += dt * 12;
        if (k >= 1) {
          e.pop = -1;
          e.root.visible = false;
        }
        continue;
      }
      // Idle: follow the tracker, so a reset brings items back.
      const show = !this.tracker.isCollected(e.def.id) && !this.hidden?.(e.def);
      e.root.visible = show;
      if (!show) continue;
      e.root.scale.setScalar(1);
      e.root.position.y = e.def.y + Math.sin(time * 2 + e.phase) * 0.06;
      e.spin.rotation.y = time * (e.def.kind === 'relic' ? 1.4 : 1.8) + e.phase;
    }
  }
}
