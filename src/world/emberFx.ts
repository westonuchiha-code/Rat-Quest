import * as THREE from 'three';
import { createPs1Material, lyingOn } from '../render/ps1Material';
import { glowMaterial } from './itemModels';
import { flameHeat, type Ember, type Flame } from './embers';

/**
 * How drops of fire and the flames they leave are drawn. What is drawn is what is so: a falling drop is drawn where
 * the rules have it; the ring on the floor is drawn where the rules say it will land, as wide as the flames it will
 * leave (it fills as the drop comes down, and is full when it lands); and a patch of flame is as wide as the patch
 * that burns, as high as it is hot.
 */
const TONGUES = 7;
/** One light a patch of flame or a falling drop throws on the room: what the world's lights are made of. */
export interface FxLight {
  x: number;
  y: number;
  z: number;
  r: number;
  color: THREE.Color;
  power: number;
  flash: number;
  flicker: number;
  phase: number;
}

/** What a fire of one colour is drawn with. */
interface Look {
  core: THREE.Material;
  halo: THREE.Material;
  ringMat: THREE.Material;
  fillMat: THREE.Material;
  glowMat: THREE.Material;
  tongueGeo: THREE.BufferGeometry;
  flameMat: THREE.Material;
  dropLight: number;
  flameLight: number;
  /** How far a patch's light reaches, and how strong it is at its hottest. */
  flameReach: number;
  flamePower: number;
}
interface DropView {
  root: THREE.Group;
  mark: THREE.Group;
  fill: THREE.Mesh;
}
interface FireView {
  root: THREE.Group;
  tongues: THREE.Mesh[];
  glow: THREE.Mesh;
  phase: number;
  power: number;
  light: FxLight;
}

export class EmberFx {
  readonly group = new THREE.Group();
  private readonly dropGeo = new THREE.SphereGeometry(0.12, 6, 5).scale(1, 1.5, 1);
  private readonly sparkGeo = new THREE.SphereGeometry(0.06, 5, 4);
  private readonly haloGeo = new THREE.SphereGeometry(0.22, 8, 6);
  private readonly ringGeo = new THREE.RingGeometry(0.88, 1, 20).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private readonly tongueGeo: THREE.BufferGeometry;
  // (Unshaded colours come out brighter on the screen than their numbers: these are chosen for how they look there.
  // The marks on the floor are plain paint, not light, so they are orange on a pale floor as well as a dark one.)
  private readonly core = new THREE.MeshBasicMaterial({ color: 0xff930b });
  private readonly halo = glowMaterial(0xff8a18, 0.4);
  private readonly ringMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0xff4303, transparent: true, opacity: 0.95, depthWrite: false }), 2);
  private readonly fillMat = lyingOn(new THREE.MeshBasicMaterial({ color: 0xff4303, transparent: true, opacity: 0.4, depthWrite: false }), 1);
  private readonly glowMat = new THREE.MeshBasicMaterial({ color: 0xff5a06, transparent: true, opacity: 0.45, depthWrite: false });
  private readonly flameMat = createPs1Material({});
  /** The same things in another colour, for the fire of a firefly that has a colour of its own: made once a colour. */
  private readonly tinted = new Map<number, Look>();
  private readonly drops = new Map<Ember, DropView>();
  private readonly fires = new Map<Flame, FireView>();
  private readonly dropLights = new Map<Ember, FxLight>();

  constructor() {
    // A tongue of flame: a cone standing on the floor, one high; red-orange at its root, yellow at its tip.
    const cone = new THREE.ConeGeometry(0.27, 1, 5, 2).translate(0, 0.5, 0);
    const pos = cone.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getY(i);
      col.set([1, 0.3 + 0.65 * u, 0.04 + 0.4 * u * u], i * 3);
    }
    cone.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.tongueGeo = cone;
  }

  /** What a fire of this colour is drawn with: a fire's own orange, or (given a colour) the same shapes in that colour. */
  private look(color?: number): Look {
    if (color === undefined) return { core: this.core, halo: this.halo, ringMat: this.ringMat, fillMat: this.fillMat, glowMat: this.glowMat, tongueGeo: this.tongueGeo, flameMat: this.flameMat, dropLight: 0xffc060, flameLight: 0xff7a20, flameReach: 7, flamePower: 1.1 };
    let L = this.tinted.get(color);
    if (!L) {
      const c = new THREE.Color(color);
      const pale = c.clone().lerp(new THREE.Color(0xffffff), 0.5);
      const deep = c.clone().multiplyScalar(0.8);
      const paint = c.clone().multiplyScalar(0.85);
      // (A tongue of it: deep in its colour at the root, pale at the tip, as a flame is yellow there. It is drawn as
      // it is, lit by nothing: a cold fire of this kind is its own light, and the room's lights on top of it only
      // turned it white. And it lights less of the room than a real fire: it is for dark places.)
      const geo = this.tongueGeo.clone();
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getY(i);
        col.set([deep.r + (pale.r - deep.r) * u * u, deep.g + (pale.g - deep.g) * u * u, deep.b + (pale.b - deep.b) * u * u], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      L = {
        core: new THREE.MeshBasicMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), 0.3) }),
        halo: glowMaterial(color, 0.4),
        ringMat: lyingOn(new THREE.MeshBasicMaterial({ color: paint, transparent: true, opacity: 0.95, depthWrite: false }), 2),
        fillMat: lyingOn(new THREE.MeshBasicMaterial({ color: paint, transparent: true, opacity: 0.4, depthWrite: false }), 1),
        glowMat: new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, depthWrite: false }),
        tongueGeo: geo,
        flameMat: new THREE.MeshBasicMaterial({ vertexColors: true }),
        dropLight: color,
        flameLight: color,
        flameReach: 5,
        flamePower: 0.75,
      };
      this.tinted.set(color, L);
    }
    return L;
  }

  /** Everything gone (a new level). */
  clear(): void {
    for (const v of this.drops.values()) this.group.remove(v.root, v.mark);
    for (const v of this.fires.values()) this.group.remove(v.root);
    this.drops.clear();
    this.fires.clear();
    this.dropLights.clear();
  }

  /** Draws the drops in the air and the flames on the floor as they are now. `lights` is given the light they throw. */
  update(time: number, embers: readonly Ember[], flames: readonly Flame[], lights?: FxLight[]): void {
    // ---- Falling drops, and the mark where each will land ----
    for (const [e, v] of this.drops) {
      if (!e.done && embers.includes(e)) continue;
      this.group.remove(v.root, v.mark);
      this.drops.delete(e);
      this.dropLights.delete(e);
    }
    for (const e of embers) {
      if (e.done) continue;
      let v = this.drops.get(e);
      if (!v) {
        const K = this.look(e.color);
        const root = new THREE.Group();
        root.add(new THREE.Mesh(this.dropGeo, K.core), new THREE.Mesh(this.haloGeo, K.halo));
        // (A tail of sparks behind it.)
        for (let k = 1; k <= 3; k++) {
          const s = new THREE.Mesh(this.sparkGeo, K.core);
          s.scale.setScalar(1 - k * 0.22);
          root.add(s);
        }
        const mark = new THREE.Group();
        const fill = new THREE.Mesh(this.discGeo, K.fillMat);
        mark.add(new THREE.Mesh(this.ringGeo, K.ringMat), fill);
        v = { root, mark, fill };
        this.drops.set(e, v);
        this.group.add(root, mark);
        this.dropLights.set(e, { x: 0, y: 0, z: 0, r: 4.5, color: new THREE.Color(K.dropLight), power: 0.7, flash: 0, flicker: 0, phase: 0 });
      }
      v.root.position.set(e.x, e.y, e.z);
      for (let k = 1; k <= 3; k++) v.root.children[1 + k].position.set(-e.vx * 0.045 * k, -e.vy * 0.045 * k, -e.vz * 0.045 * k);
      v.root.children[1].scale.setScalar(0.85 + 0.15 * Math.sin(time * 31 + e.x));
      v.mark.visible = !!e.land;
      if (e.land) {
        // The ring is as wide as the flames will be, from the moment the drop is let go; it fills as the drop falls.
        const k = Math.min(1, e.age / Math.max(0.05, e.land.t));
        v.mark.position.set(e.land.x, e.land.y + 0.05, e.land.z);
        v.mark.scale.setScalar(e.radius);
        v.fill.scale.setScalar(Math.max(0.05, k));
      }
      const L = this.dropLights.get(e);
      if (L && lights) {
        L.x = e.x;
        L.y = e.y;
        L.z = e.z;
        lights.push(L);
      }
    }

    // ---- Flames ----
    for (const [f, v] of this.fires) {
      if (flames.includes(f)) continue;
      this.group.remove(v.root);
      this.fires.delete(f);
    }
    for (const f of flames) {
      let v = this.fires.get(f);
      if (!v) {
        const K = this.look(f.color);
        const root = new THREE.Group();
        root.position.set(f.x, f.y, f.z);
        const tongues: THREE.Mesh[] = [];
        for (let i = 0; i < TONGUES; i++) {
          const t = new THREE.Mesh(K.tongueGeo, K.flameMat);
          root.add(t);
          tongues.push(t);
        }
        const glow = new THREE.Mesh(this.discGeo, K.glowMat);
        glow.position.y = 0.04;
        root.add(glow);
        v = { root, tongues, glow, phase: f.x * 2.3 + f.z * 4.1, power: K.flamePower, light: { x: f.x, y: f.y + 0.9, z: f.z, r: K.flameReach, color: new THREE.Color(K.flameLight), power: K.flamePower, flash: 0, flicker: 0.3, phase: f.x * 1.3 + f.z * 0.7 } };
        this.fires.set(f, v);
        this.group.add(v.root);
      }
      const heat = flameHeat(f);
      // The floor glows as far as it burns.
      v.glow.scale.setScalar(Math.max(0.01, f.r * (0.55 + 0.45 * heat)));
      v.glow.visible = heat > 0.02;
      v.tongues.forEach((t, i) => {
        // One in the middle, the tallest; the rest in a ring round it, inside the patch. Each licks on its own beat.
        const ph = v!.phase + i * 2.3;
        const a = (i / (TONGUES - 1)) * Math.PI * 2 + v!.phase;
        const out = i === 0 ? 0 : f.r * 0.56;
        const tall = (i === 0 ? 1.5 : 0.95 + ((i * 5) % 3) * 0.14) * heat;
        const k = 0.78 + 0.22 * Math.sin(time * 7.3 + ph) + 0.1 * Math.sin(time * 13.1 + ph * 2);
        const wide = (f.r / 0.95) * (0.9 + 0.12 * Math.sin(time * 5 + ph)) * Math.min(1, heat * 1.5);
        t.visible = heat > 0.02;
        t.scale.set(wide, Math.max(0.01, tall * k), wide);
        t.position.set(Math.sin(a) * out + 0.05 * Math.sin(time * 4.1 + ph), 0, Math.cos(a) * out + 0.05 * Math.cos(time * 3.3 + ph));
        t.rotation.y = time * 1.7 + ph;
      });
      if (lights && heat > 0.02) {
        v.light.power = v.power * heat;
        lights.push(v.light);
      }
    }
  }

  /** For the tests: how many drops and patches are drawn, and where the marks are. */
  /** (And, for the tests, the colours of what is drawn: each drop's core, each mark's ring, each patch's light.) */
  colours(): { drops: number[]; marks: number[]; fires: number[] } {
    const hex = (m: THREE.Object3D): number => ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHex();
    return { drops: [...this.drops.values()].map((v) => hex(v.root.children[0])), marks: [...this.drops.values()].map((v) => hex(v.mark.children[0])), fires: [...this.fires.values()].map((v) => v.light.color.getHex()) };
  }

  shown(): { drops: number; fires: number; marks: Array<{ x: number; y: number; z: number; r: number; fill: number }>; tongues: Array<{ x: number; z: number; h: number }> } {
    this.group.updateMatrixWorld(true);
    const marks = [...this.drops.values()].filter((v) => v.mark.visible).map((v) => ({ x: v.mark.position.x, y: v.mark.position.y, z: v.mark.position.z, r: v.mark.scale.x, fill: v.fill.scale.x }));
    const tongues: Array<{ x: number; z: number; h: number }> = [];
    const p = new THREE.Vector3();
    for (const v of this.fires.values()) for (const t of v.tongues) if (t.visible) tongues.push({ x: t.getWorldPosition(p).x, z: p.z, h: t.scale.y });
    return { drops: this.drops.size, fires: this.fires.size, marks, tongues };
  }
}
