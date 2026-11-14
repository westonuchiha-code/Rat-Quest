/**
 * Items that pop out of broken crates and lie on the floor, spinning, until he walks into them.
 * They use the same flat-shaded look as the other collectibles.
 */
import * as THREE from 'three';
import { merge } from './collectibleMeshes';
import { facet, itemMaterial, shadowGeometry, shadowMaterial } from './itemModels';

const GRAVITY = 16;
const HOP_SPEED = 4.6;
const REST_HEIGHT = 0.3; // centre of the can above the floor
const SCALE = 0.95;
const TILT = 0.75; // radians: the can leans over so it spins on its corner
const ARM_TIME = 0.45; // seconds before it can be picked up, so it is seen coming out
const POP_TIME = 0.25;

/** A dented can of nacho cheese: silver tin, an orange label with a red band, and a cheese drip on the lid. About 0.45 tall. */
export function nachoCanGeometry(): THREE.BufferGeometry {
  const tin = new THREE.CylinderGeometry(0.14, 0.14, 0.34, 10);
  const label = new THREE.CylinderGeometry(0.1475, 0.1475, 0.2, 10).translate(0, -0.01, 0);
  const band = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 10).translate(0, 0.03, 0);
  const lidRim = new THREE.CylinderGeometry(0.155, 0.155, 0.025, 10).translate(0, 0.18, 0);
  const baseRim = new THREE.CylinderGeometry(0.155, 0.155, 0.025, 10).translate(0, -0.18, 0);
  const cheese = new THREE.IcosahedronGeometry(0.085, 0).scale(1, 0.55, 1).translate(0, 0.205, 0);
  const drip = new THREE.BoxGeometry(0.05, 0.12, 0.04).translate(0.1, 0.14, 0.06);
  const tab = new THREE.TorusGeometry(0.04, 0.012, 4, 8).rotateX(Math.PI / 2).translate(-0.07, 0.2, -0.02);
  // The maker's mark on the label: a little wedge of cheese, front and back.
  const mark = (side: number): THREE.BufferGeometry => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(side > 0 ? [-0.055, -0.07, 0, 0.055, -0.07, 0, -0.055, 0.0, 0] : [0.055, -0.07, 0, -0.055, -0.07, 0, 0.055, 0.0, 0], 3));
    return facet(g.translate(0, -0.03, side * 0.151), 0xffe680);
  };
  return merge([
    facet(tin, 0xb4bcc4), facet(label, 0xf2a21e), facet(band, 0xc0392b), facet(lidRim, 0xe0e6ec), facet(baseRim, 0xd0d6dc),
    facet(cheese, 0xffd23a), facet(drip, 0xffd23a), facet(tab, 0xe8edf2), mark(1), mark(-1),
  ]);
}

function geometryFor(itemId: string): THREE.BufferGeometry {
  void itemId; // only one kind of drop so far
  return nachoCanGeometry();
}

interface Drop {
  itemId: string;
  x: number;
  z: number;
  floorY: number; // the floor under it
  y: number; // centre height
  vy: number;
  age: number;
  phase: number;
  pop: number; // -1, or seconds into the pickup pop
  root: THREE.Group;
  spin: THREE.Group; // turns about the vertical axis
  shadow: THREE.Mesh; // lies on the floor under it
}

export class DropField {
  readonly group = new THREE.Group();
  private drops: Drop[] = [];
  private readonly material = itemMaterial(0.6);
  private readonly shadowGeo = shadowGeometry();
  private readonly shadowMat = shadowMaterial();
  private readonly geometries = new Map<string, THREE.BufferGeometry>();
  private count = 0;

  /** Puts an item out of a crate at (x, z), hopping up and landing on the floor at floorY. */
  spawn(itemId: string, x: number, z: number, floorY: number, fromY: number): void {
    let geo = this.geometries.get(itemId);
    if (!geo) {
      geo = geometryFor(itemId);
      this.geometries.set(itemId, geo);
    }
    const root = new THREE.Group();
    const spin = new THREE.Group();
    const can = new THREE.Mesh(geo, this.material);
    can.rotation.z = TILT;
    can.scale.setScalar(SCALE);
    spin.add(can);
    root.add(spin);
    root.position.set(x, fromY, z);
    // Its shadow rides in the same group, held down on the floor while the can hops and bobs above it.
    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    shadow.scale.setScalar(0.5);
    root.add(shadow);
    this.group.add(root);
    this.drops.push({ itemId, x, z, floorY, y: fromY, vy: HOP_SPEED, age: 0, phase: this.count++ * 1.9, pop: -1, root, spin, shadow });
  }

  /** Drops he is close enough to take. They start the pickup pop, and the caller is told what they were. */
  collect(px: number, py: number, pz: number, reach: number, height: number): string[] {
    const got: string[] = [];
    for (const d of this.drops) {
      if (d.pop >= 0 || d.age < ARM_TIME) continue;
      if (Math.hypot(d.x - px, d.z - pz) < reach && d.y > py - 0.3 && d.y < py + height + 0.3) {
        d.pop = 0;
        got.push(d.itemId);
      }
    }
    return got;
  }

  /** Removes every drop, for a restart. */
  clear(): void {
    for (const d of this.drops) this.group.remove(d.root);
    this.drops = [];
  }

  /** How many are lying there (not counting ones being picked up). */
  get remaining(): number {
    return this.drops.filter((d) => d.pop < 0).length;
  }

  update(dt: number, time: number): void {
    for (const d of this.drops) {
      d.age += dt;
      d.spin.rotation.y = time * 2.6 + d.phase;
      d.shadow.visible = d.pop < 0;
      if (d.pop >= 0) {
        d.pop += dt;
        const k = Math.min(1, d.pop / POP_TIME);
        d.root.scale.setScalar(1 + 0.6 * k);
        d.root.position.y = d.y + 0.3 * k;
        d.spin.rotation.y += d.pop * 12;
        if (k >= 1) d.root.visible = false;
        continue;
      }
      const rest = d.floorY + REST_HEIGHT;
      if (d.vy !== 0 || d.y > rest) {
        d.vy -= GRAVITY * dt;
        d.y += d.vy * dt;
        if (d.y <= rest) {
          d.y = rest;
          d.vy = 0;
        }
        d.root.position.y = d.y;
      } else {
        // Resting: a gentle bob like the other collectibles.
        d.root.position.y = rest + Math.sin(time * 2 + d.phase) * 0.05;
      }
      // (The shadow is the can's child: put it back down on the floor, and shrink it as the can flies up.)
      const up = d.root.position.y - d.floorY;
      d.shadow.position.y = 0.025 - up;
      d.shadow.scale.setScalar(0.5 * Math.max(0.35, 1 - (up - REST_HEIGHT) * 0.35));
    }
    this.drops = this.drops.filter((d) => {
      if (d.pop >= 0 && d.root.visible === false) {
        this.group.remove(d.root);
        return false;
      }
      return true;
    });
  }
}
