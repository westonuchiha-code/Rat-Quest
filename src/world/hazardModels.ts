/**
 * How the hazards and helpers look (world/hazards.ts): a conveyor belt whose slats run along it, a pendulum blade, a
 * plate of spikes, a fan in the floor with dust rising over it. Each is built in place; `show(time)` moves it as the
 * room's clock says (the same clock that says what hurts him). The room tags each as moving, so its gathering of still
 * dressing leaves them alone.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexColor } from '../render/ps1Material';
import { lastHit, laneState, COIL } from './teslaCoil';
import { Zones, HAZARD, bladeAngle, fanPower, jetDir, jetFlame, spikesUp, type HazardSpec, type TeslaCoilSpec, type ZapPlateSpec, type FloatSpec, type MudSpec, type LauncherSpec } from './hazards';

export interface HazardMats {
  iron: THREE.Material;
  plain: THREE.Material;
  /** The electrical set's pictures (render/textures.ts): copper wire for a coil, tread plate for a zap plate. */
  copper?: THREE.Material;
  tread?: THREE.Material;
}
export interface BuiltHazard {
  group: THREE.Group;
  show(time: number): void;
  /** A keyboard's coil: throw a bolt to there now (a coil key has just been played). */
  arcTo?(x: number, y: number, z: number, time: number): void;
}

function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((p) => {
    const g = p.index ? p.toNonIndexed() : p;
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
  return mergeGeometries(flat) ?? new THREE.BufferGeometry();
}
const boxAt = (w: number, h: number, d: number, x: number, y: number, z: number, color: number): THREE.BufferGeometry => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return bakeVertexColor(g, color);
};

/** How deep a belt's frame is, under its top. */
export const BELT_DEPTH = 0.35;

export function buildHazard(h: HazardSpec, mats: HazardMats, all: readonly HazardSpec[] = []): BuiltHazard {
  const group = new THREE.Group();
  group.userData.moves = true;
  if (h.kind === 'belt') {
    // Built along its own +z (the way it carries), then turned to its yaw.
    const alongX = Math.abs(Math.sin(h.yaw)) > 0.5;
    const len = alongX ? h.w : h.d;
    const wide = alongX ? h.d : h.w;
    group.position.set(h.x, h.y, h.z);
    group.rotation.y = h.yaw;
    const frame = [
      boxAt(0.12, BELT_DEPTH + 0.06, len, -wide / 2 + 0.06, -BELT_DEPTH / 2 + 0.03, 0, 0x6a6a72),
      boxAt(0.12, BELT_DEPTH + 0.06, len, wide / 2 - 0.06, -BELT_DEPTH / 2 + 0.03, 0, 0x6a6a72),
      boxAt(wide - 0.24, 0.06, len, 0, -0.08, 0, 0x26221e),
    ];
    // A roller at each end, and a yellow-and-black stripe on each side so it reads as a machine.
    for (const end of [-1, 1]) {
      const r = new THREE.CylinderGeometry(BELT_DEPTH / 2, BELT_DEPTH / 2, wide - 0.2, 10, 1);
      r.rotateZ(Math.PI / 2);
      r.translate(0, -BELT_DEPTH / 2 - 0.09, end * (len / 2 - BELT_DEPTH / 2));
      frame.push(bakeVertexColor(r, 0x8a8a90));
    }
    for (let k = 0; k * 0.6 < len - 0.3; k++) {
      for (const side of [-1, 1]) frame.push(boxAt(0.02, 0.1, 0.3, side * (wide / 2 + 0.035), -0.12, -len / 2 + 0.3 + k * 0.6, k % 2 ? 0x1a1a1a : 0xe8c040));
    }
    group.add(new THREE.Mesh(mergeAll(frame), mats.iron));
    // The slats: one run of them, slid along and wrapped round, so they seem to go on for ever.
    const gap = 0.5;
    const n = Math.max(1, Math.floor(len / gap));
    const slats = new THREE.Mesh(mergeAll(Array.from({ length: n }, (_, i) => boxAt(wide - 0.3, 0.03, 0.12, 0, 0, -len / 2 + (i + 0.5) * (len / n), 0x8a7a5a))), mats.plain);
    group.add(slats);
    const step = len / n;
    return {
      group,
      show(time) {
        slats.position.z = ((time * h.speed) % step + step) % step - step / 2;
      },
    };
  }
  if (h.kind === 'blade') {
    group.position.set(h.x, h.y, h.z);
    group.rotation.y = h.yaw;
    // The bracket overhead, and the arm and blade that swing from it.
    group.add(new THREE.Mesh(mergeAll([boxAt(0.5, 0.3, 0.5, 0, 0.15, 0, 0x4a4a52), boxAt(0.1, 0.1, 0.7, 0, 0, 0, 0x6a6a72)]), mats.iron));
    const arm = new THREE.Group();
    const rod = new THREE.CylinderGeometry(0.05, 0.05, h.length, 6, 1);
    rod.translate(0, -h.length / 2, 0);
    bakeVertexColor(rod, 0x5a5a62);
    const blade = new THREE.CylinderGeometry(HAZARD.blade.half, HAZARD.blade.half, 0.06, 14, 1, false, -Math.PI / 2, Math.PI);
    blade.rotateX(Math.PI / 2);
    blade.translate(0, -h.length + 0.45, 0);
    bakeVertexColor(blade, 0xc8ccd4);
    const edge = new THREE.TorusGeometry(HAZARD.blade.half, 0.04, 4, 14, Math.PI);
    edge.rotateZ(Math.PI);
    edge.translate(0, -h.length + 0.45, 0);
    bakeVertexColor(edge, 0xf4f4f8);
    arm.add(new THREE.Mesh(mergeAll([rod, blade, edge]), mats.plain));
    group.add(arm);
    return {
      group,
      show(time) {
        arm.rotation.z = bladeAngle(h, time);
      },
    };
  }
  if (h.kind === 'spikes') {
    group.position.set(h.x, h.y, h.z);
    const H = HAZARD.spikes.height;
    const nx = Math.max(2, Math.round(h.w / 0.4));
    const nz = Math.max(2, Math.round(h.d / 0.4));
    // The plate, and a warning stripe round it (the spikes come up through it).
    const plate = [boxAt(h.w, 0.04, h.d, 0, 0.02, 0, 0x5a5a62)];
    const spikes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < nx; i++) {
      for (let k = 0; k < nz; k++) {
        const x = -h.w / 2 + (i + 0.5) * (h.w / nx);
        const z = -h.d / 2 + (k + 0.5) * (h.d / nz);
        const c = new THREE.ConeGeometry(0.08, H, 5, 1);
        c.translate(x, H / 2, z);
        spikes.push(bakeVertexColor(c, 0xb8bcc4));
      }
    }
    for (const side of [-1, 1]) {
      plate.push(boxAt(h.w + 0.12, 0.05, 0.06, 0, 0.025, side * (h.d / 2 + 0.03), 0xe8c040));
      plate.push(boxAt(0.06, 0.05, h.d, side * (h.w / 2 + 0.03), 0.025, 0, 0xe8c040));
    }
    group.add(new THREE.Mesh(mergeAll(plate), mats.iron));
    const bed = new THREE.Mesh(mergeAll(spikes), mats.plain);
    group.add(bed);
    let shown = 0;
    let last = -1;
    return {
      group,
      show(time) {
        // Up fast, down slower (so they are seen to go), and hidden under the plate when down.
        const want = spikesUp(h, time);
        const dt = last < 0 ? 1 : Math.min(0.1, Math.max(0, time - last));
        last = time;
        shown = want > shown ? Math.min(want, shown + dt * 14) : Math.max(want, shown - dt * 3);
        bed.position.y = -H + 0.02 + shown * H;
        bed.visible = shown > 0.01;
      },
    };
  }
  if (h.kind === 'flamejet') {
    // A flame jet: an iron nozzle, a pilot flame (blue) at its mouth, and the flame itself: two cones, orange round
    // yellow, stretched out as far as it reaches now and flickering. Built pointing up its own +y, then turned.
    group.position.set(h.x, h.y, h.z);
    const aim = new THREE.Group();
    const [ux, uy, uz] = jetDir(h);
    aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(ux, uy, uz));
    group.add(aim);
    const nozzle = new THREE.CylinderGeometry(0.22, 0.32, 0.4, 8, 1);
    nozzle.translate(0, -0.12, 0);
    bakeVertexColor(nozzle, 0x3a3a40);
    const lip = new THREE.TorusGeometry(0.24, 0.05, 4, 10);
    lip.rotateX(Math.PI / 2);
    lip.translate(0, 0.08, 0);
    bakeVertexColor(lip, 0xe8c040);
    aim.add(new THREE.Mesh(mergeAll([nozzle, lip]), mats.iron));
    const fire = (color: number, opacity: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
    const coneAt = (r: number, m: THREE.Material): THREE.Mesh => {
      const g = new THREE.ConeGeometry(r, 1, 8, 1, true);
      g.rotateX(Math.PI);
      g.translate(0, 0.5, 0);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.y = 0.08;
      aim.add(mesh);
      return mesh;
    };
    // (Each cone turned point-down at the nozzle, widening to its end: a jet's flame.)
    const outer = coneAt(HAZARD.jet.radius * 1.1, fire(0xff6a20, 0.75));
    const inner = coneAt(HAZARD.jet.radius * 0.6, fire(0xffe070, 0.9));
    const pilot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6, 1), fire(0x5a9aff, 0.9));
    pilot.position.y = 0.22;
    aim.add(pilot);
    return {
      group,
      show(time) {
        const f = jetFlame(h, time);
        const len = Math.max(0.001, f.reach * h.length);
        const flick = 1 + 0.12 * Math.sin(time * 37) + 0.06 * Math.sin(time * 61);
        outer.visible = inner.visible = f.reach > 0.01;
        outer.scale.set(flick, len, flick);
        inner.scale.set(1 / flick, len * 0.85, 1 / flick);
        pilot.visible = f.pilot;
        pilot.scale.y = 0.8 + 0.3 * Math.sin(time * 23);
      },
    };
  }
  if (h.kind === 'teslacoil') return buildCoil(h, mats, all);
  if (h.kind === 'floatzone') return buildFloat(h);
  if (h.kind === 'mud') return buildMud(h);
  if (h.kind === 'launcher') return buildLauncher(h, mats);
  if (h.kind === 'zapplate') return buildZapPlate(h, mats);
  // A fan: a ring set in the floor, a grille over it, blades turning under, and dust carried up the column.
  group.position.set(h.x, h.y, h.z);
  const ring = new THREE.CylinderGeometry(h.r, h.r, 0.08, 20, 1, true);
  ring.translate(0, 0.04, 0);
  bakeVertexColor(ring, 0x6a6a72);
  const rim = new THREE.TorusGeometry(h.r, 0.06, 4, 20);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, 0.08, 0);
  bakeVertexColor(rim, 0xe8c040);
  const grille: THREE.BufferGeometry[] = [ring, rim];
  for (let i = -2; i <= 2; i++) grille.push(boxAt(0.04, 0.03, Math.sqrt(Math.max(0, h.r * h.r - (i * h.r * 0.38) ** 2)) * 2, i * h.r * 0.38, 0.09, 0, 0x8a8a90));
  const pit = new THREE.CircleGeometry(h.r - 0.02, 20);
  pit.rotateX(-Math.PI / 2);
  pit.translate(0, 0.005, 0);
  grille.push(bakeVertexColor(pit, 0x0c0c10));
  group.add(new THREE.Mesh(mergeAll(grille), mats.iron));
  const blades = new THREE.Mesh(mergeAll([0, 1, 2, 3].map((k) => {
    const b = new THREE.BoxGeometry(0.22, 0.02, h.r * 0.9);
    b.translate(0, 0, h.r * 0.45);
    b.rotateY((k * Math.PI) / 2);
    b.translate(0, 0.04, 0);
    return bakeVertexColor(b, 0xa8acb4);
  })), mats.plain);
  group.add(blades);
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xd8d4c8, transparent: true, opacity: 0.5, depthWrite: false });
  const motes = Array.from({ length: 10 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), dustMat);
    m.userData.at = [Math.cos(i * 2.4) * h.r * 0.7 * ((i % 3) + 1) / 3, Math.sin(i * 2.4) * h.r * 0.7 * ((i % 3) + 1) / 3, i / 10];
    group.add(m);
    return m;
  });
  let turn = 0;
  let last = -1;
  return {
    group,
    show(time) {
      const power = fanPower(h, time);
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, time - last));
      last = time;
      turn += dt * power * 22;
      blades.rotation.y = turn;
      dustMat.opacity = 0.5 * power;
      for (const m of motes) {
        const [mx, mz, ph] = m.userData.at as number[];
        const k = (time * 0.45 + ph) % 1;
        m.position.set(mx, 0.2 + k * h.height * 0.9, mz);
        m.visible = power > 0.05;
      }
    },
  };
}

/**
 * A LIGHTNING BOLT: a jagged line from one point to another, as two crossed ribbons (so it reads from any side), a
 * bright core and a wide faint glow. `set` lays it again (a new zigzag each time it is called with a new seed).
 */
class Bolt {
  readonly group = new THREE.Group();
  private readonly core: THREE.BufferGeometry;
  private readonly glow: THREE.BufferGeometry;
  private readonly coreMat = new THREE.MeshBasicMaterial({ color: 0xe8f0ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  private readonly glowMat: THREE.MeshBasicMaterial;
  constructor(private readonly segs: number, color: number) {
    this.glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const make = (): THREE.BufferGeometry => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((segs + 1) * 4 * 3), 3));
      const idx: number[] = [];
      for (let ribbon = 0; ribbon < 2; ribbon++) {
        const o = ribbon * (segs + 1) * 2;
        for (let i = 0; i < segs; i++) {
          const a = o + i * 2;
          idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
      }
      g.setIndex(idx);
      return g;
    };
    this.core = make();
    this.glow = make();
    const c = new THREE.Mesh(this.core, this.coreMat);
    const w = new THREE.Mesh(this.glow, this.glowMat);
    c.frustumCulled = w.frustumCulled = false;
    this.group.add(w, c);
    this.group.visible = false;
  }
  /** Lays it from a to b, jagged by `amp` (most in its middle), bright as `bright` (0..1). */
  set(a: THREE.Vector3, b: THREE.Vector3, seed: number, amp: number, bright: number): void {
    let s = (Math.floor(seed) % 2147483646) + 1;
    const rnd = (): number => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
    const dir = b.clone().sub(a);
    const len = dir.length();
    const side1 = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    if (side1.lengthSq() < 1e-6) side1.set(1, 0, 0);
    const side2 = dir.clone().cross(side1).normalize();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= this.segs; i++) {
      const k = i / this.segs;
      const bend = Math.sin(Math.PI * k) * amp * len * 0.12;
      pts.push(a.clone().lerp(b, k).addScaledVector(side1, rnd() * bend).addScaledVector(side2, rnd() * bend));
    }
    const lay = (g: THREE.BufferGeometry, wide: number): void => {
      const p = g.attributes.position as THREE.BufferAttribute;
      pts.forEach((q, i) => {
        p.setXYZ(i * 2, q.x - side1.x * wide, q.y - side1.y * wide, q.z - side1.z * wide);
        p.setXYZ(i * 2 + 1, q.x + side1.x * wide, q.y + side1.y * wide, q.z + side1.z * wide);
        const o = (this.segs + 1) * 2;
        p.setXYZ(o + i * 2, q.x - side2.x * wide, q.y - side2.y * wide, q.z - side2.z * wide);
        p.setXYZ(o + i * 2 + 1, q.x + side2.x * wide, q.y + side2.y * wide, q.z + side2.z * wide);
      });
      p.needsUpdate = true;
    };
    lay(this.core, 0.035);
    lay(this.glow, 0.16);
    this.coreMat.opacity = bright;
    this.glowMat.opacity = 0.45 * bright;
    this.group.visible = bright > 0.02;
  }
  hide(): void {
    this.group.visible = false;
  }
}

/**
 * A TESLA COIL: an iron base, a column wound in copper, a fat steel ring on top. A big one plays the beat
 * (world/teslaCoil.ts): at each kick a bolt from its ring to every kick plate, at each snare to every snare plate, and at
 * each hat a few short sparks off the ring; between, a faint crawl of small arcs round the ring. A small one (`keys`)
 * throws a bolt only where it is told (`arcTo`: a coil key played).
 */
function buildCoil(h: TeslaCoilSpec, mats: HazardMats, all: readonly HazardSpec[]): BuiltHazard {
  const group = new THREE.Group();
  group.userData.moves = true;
  group.position.set(h.x, h.y, h.z);
  const r = h.r;
  const iron = [boxAt(r * 3.2, 0.3, r * 3.2, 0, 0.15, 0, 0x2a2e34)];
  const foot = new THREE.CylinderGeometry(r * 1.5, r * 1.8, 0.5, 12, 1);
  foot.translate(0, 0.55, 0);
  iron.push(bakeVertexColor(foot, 0x3a4048));
  // Insulator rings up the foot of the column, white ceramic.
  for (let k = 0; k < 3; k++) {
    const ring = new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.12, 12, 1);
    ring.translate(0, 0.9 + k * 0.22, 0);
    iron.push(bakeVertexColor(ring, 0xe8e4d8));
  }
  group.add(new THREE.Mesh(mergeAll(iron), mats.iron));
  const colH = h.height - 1.6;
  const col = new THREE.CylinderGeometry(r, r, colH, 14, 1, true);
  col.translate(0, 1.55 + colH / 2, 0);
  group.add(new THREE.Mesh(bakeVertexColor(col, 0xffffff), mats.copper ?? mats.plain));
  const cap = new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.15, 14, 1);
  cap.translate(0, 1.55 + colH, 0);
  const stem = new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.5, 8, 1);
  stem.translate(0, 1.55 + colH + 0.3, 0);
  const torusR = r * (h.keys ? 1.6 : 2.2);
  const tube = r * (h.keys ? 0.5 : 0.7);
  const torus = new THREE.TorusGeometry(torusR, tube, 8, 20);
  torus.rotateX(Math.PI / 2);
  torus.translate(0, h.height, 0);
  group.add(new THREE.Mesh(mergeAll([bakeVertexColor(cap, 0x8a9098), bakeVertexColor(stem, 0x8a9098), bakeVertexColor(torus, 0xc8ccd4)]), mats.iron));
  // A glow round the ring that swells at each hit.
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x7a9aff, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(torusR + tube * 2, 12, 8), haloMat);
  halo.position.y = h.height;
  halo.scale.y = 0.45;
  group.add(halo);
  const top = new THREE.Vector3(h.x, h.y + h.height, h.z);
  const ringPoint = (seed: number, toward?: THREE.Vector3): THREE.Vector3 => {
    const a = toward ? Math.atan2(toward.z - h.z, toward.x - h.x) + Math.sin(seed) * 0.3 : seed;
    return new THREE.Vector3(h.x + Math.cos(a) * (torusR + tube * 0.5), h.y + h.height, h.z + Math.sin(a) * (torusR + tube * 0.5));
  };
  // The plates it throws at, by lane, and a bolt for each; sparks off the ring.
  const plates = all.filter((p): p is ZapPlateSpec => p.kind === 'zapplate' && p.lane !== 'safe' && Math.hypot(p.x - h.x, p.z - h.z) < 30);
  const toPlates = h.keys ? [] : plates.map((p) => ({ p, bolt: new Bolt(10, p.lane === 'kick' ? 0x5a8aff : 0xb060ff) }));
  for (const t of toPlates) group.add(t.bolt.group);
  const sparks = Array.from({ length: 4 }, () => new Bolt(5, 0x8aa8ff));
  for (const b of sparks) group.add(b.group);
  const keyBolt = new Bolt(9, 0x6af0ff);
  group.add(keyBolt.group);
  let keyAt = -1e9;
  const keyTo = new THREE.Vector3();
  // (Bolts are laid in the world; the group itself is moved to the coil, so they are put back by its place.)
  const local = (v: THREE.Vector3): THREE.Vector3 => v.clone().sub(group.position);
  return {
    group,
    arcTo(x, y, z, time) {
      keyTo.set(x, y, z);
      keyAt = time;
    },
    show(time) {
      const flick = Math.floor(time * 24);
      let swell = 0;
      if (!h.keys) {
        for (const lane of ['kick', 'snare'] as const) {
          const hit = lastHit(lane, time);
          const on = hit.ago < COIL.live ? 1 - hit.ago / COIL.live : 0;
          swell = Math.max(swell, on, laneState(lane, time).warn * 0.4);
          for (const t of toPlates) {
            if (t.p.lane !== lane) continue;
            if (on <= 0) {
              t.bolt.hide();
              continue;
            }
            const to = new THREE.Vector3(t.p.x, t.p.y + 0.05, t.p.z);
            t.bolt.set(local(ringPoint(flick + t.p.x * 7, to)), local(to), flick * 31 + t.p.z * 13, 1, 0.35 + 0.65 * on);
          }
        }
        const hat = lastHit('hat', time);
        sparks.forEach((b, i) => {
          if (hat.ago > 0.12 && Math.sin(time * 9 + i * 2.1) < 0.97) return b.hide();
          const a = flick * 0.7 + i * 1.7;
          const from = ringPoint(a);
          const out = from.clone().add(new THREE.Vector3(Math.cos(a) * 0.9, 0.4 + 0.5 * Math.sin(i + flick), Math.sin(a) * 0.9));
          b.set(local(from), local(out), flick * 17 + i, 1.2, hat.ago <= 0.12 ? 0.9 : 0.35);
        });
      }
      const since = time - keyAt;
      if (since >= 0 && since < 0.3) {
        swell = Math.max(swell, 1 - since / 0.3);
        keyBolt.set(local(ringPoint(flick, keyTo)), local(keyTo), flick * 13, 1, 1 - since / 0.3);
      } else keyBolt.hide();
      haloMat.opacity = 0.05 + 0.35 * swell;
      halo.scale.setScalar(1 + 0.25 * swell);
      halo.scale.y = 0.45 * (1 + 0.25 * swell);
      void top;
    },
  };
}

/**
 * A ZAP PLATE: a slab of tread plate with glowing strips along its edges, the colour of its lane (blue for the kick,
 * violet for the snare; dull grey for a safe one). The strips brighten through the warning before its hit, and flash
 * white while it is live, with sparks crawling over its top.
 */
function buildZapPlate(h: ZapPlateSpec, mats: HazardMats): BuiltHazard {
  const group = new THREE.Group();
  group.userData.moves = true;
  group.position.set(h.x, h.y, h.z);
  const T = 0.3;
  const slab = new THREE.BoxGeometry(h.w, T, h.d);
  slab.translate(0, -T / 2, 0);
  group.add(new THREE.Mesh(bakeVertexColor(slab, 0xffffff), mats.tread ?? mats.iron));
  const color = h.lane === 'kick' ? 0x4a8aff : h.lane === 'snare' ? 0xb050ff : 0x3a4048;
  const stripMat = new THREE.MeshBasicMaterial({ color });
  const strips = [
    boxAt(h.w + 0.04, 0.06, 0.08, 0, -0.02, h.d / 2, 0xffffff), boxAt(h.w + 0.04, 0.06, 0.08, 0, -0.02, -h.d / 2, 0xffffff),
    boxAt(0.08, 0.06, h.d, h.w / 2, -0.02, 0, 0xffffff), boxAt(0.08, 0.06, h.d, -h.w / 2, -0.02, 0, 0xffffff),
  ];
  group.add(new THREE.Mesh(mergeAll(strips), stripMat));
  // Sparks over its top while live: a few short bolts, laid afresh each moment.
  const sparks = h.lane === 'safe' ? [] : Array.from({ length: 3 }, () => new Bolt(4, color));
  for (const b of sparks) group.add(b.group);
  const base = new THREE.Color(color);
  const white = new THREE.Color(0xffffff);
  const dark = base.clone().multiplyScalar(0.35);
  return {
    group,
    show(time) {
      if (h.lane === 'safe') return;
      const st = laneState(h.lane, time);
      if (st.live) stripMat.color.copy(white);
      else stripMat.color.copy(dark).lerp(base, st.warn).lerp(white, st.warn * st.warn * 0.4);
      const flick = Math.floor(time * 30);
      sparks.forEach((b, i) => {
        if (!st.live) return b.hide();
        const a = flick * 1.3 + i * 2.2;
        const from = new THREE.Vector3(Math.cos(a) * h.w * 0.4, 0.04, Math.sin(a * 1.7) * h.d * 0.4);
        const to = new THREE.Vector3(Math.cos(a + 2) * h.w * 0.4, 0.04, Math.sin(a * 1.7 + 2) * h.d * 0.4);
        b.set(from, to, flick * 7 + i, 1.5, 0.9);
      });
    },
  };
}

/** A FLOAT ZONE: a faint column of violet light, its edges a little brighter, and motes drifting slowly up it. */
function buildFloat(h: FloatSpec): BuiltHazard {
  const group = new THREE.Group();
  group.userData.moves = true;
  group.position.set(h.x, h.y, h.z);
  const veil = new THREE.Mesh(new THREE.BoxGeometry(h.w, h.h, h.d), new THREE.MeshBasicMaterial({ color: 0x9a7aff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
  veil.position.y = h.h / 2;
  group.add(veil);
  const ring = new THREE.Mesh(mergeAll([
    boxAt(h.w, 0.04, 0.08, 0, 0.02, h.d / 2, 0xffffff), boxAt(h.w, 0.04, 0.08, 0, 0.02, -h.d / 2, 0xffffff),
    boxAt(0.08, 0.04, h.d, h.w / 2, 0.02, 0, 0xffffff), boxAt(0.08, 0.04, h.d, -h.w / 2, 0.02, 0, 0xffffff),
  ]), new THREE.MeshBasicMaterial({ color: 0xb89aff }));
  group.add(ring);
  const moteMat = new THREE.MeshBasicMaterial({ color: 0xe0d0ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const motes = Array.from({ length: 24 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), moteMat);
    m.userData.at = [((i * 0.618) % 1 - 0.5) * h.w * 0.9, ((i * 0.377) % 1 - 0.5) * h.d * 0.9, i / 24];
    group.add(m);
    return m;
  });
  return {
    group,
    show(time) {
      for (const m of motes) {
        const [mx, mz, ph] = m.userData.at as number[];
        const k = (time * 0.12 + ph) % 1;
        m.position.set(mx + 0.15 * Math.sin(time + ph * 9), k * h.h, mz + 0.15 * Math.cos(time * 0.8 + ph * 7));
        m.rotation.y = time + ph;
      }
    },
  };
}

/** MUD: a flat brown patch, wetter in the middle, with bubbles that swell and burst here and there. */
function buildMud(h: MudSpec): BuiltHazard {
  const group = new THREE.Group();
  group.userData.moves = true;
  group.position.set(h.x, h.y, h.z);
  const top = new THREE.PlaneGeometry(h.w, h.d, 8, 8);
  top.rotateX(-Math.PI / 2);
  top.translate(0, 0.015, 0);
  const pos = top.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = Math.hypot(pos.getX(i) / (h.w / 2), pos.getZ(i) / (h.d / 2));
    c.set(0x4a3220).lerp(new THREE.Color(0x2a1a10), Math.max(0, 1 - k));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  top.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  group.add(new THREE.Mesh(top, new THREE.MeshBasicMaterial({ vertexColors: true })));
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x5a4028 });
  const bubbles = Array.from({ length: 7 }, (_, i) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), bubbleMat);
    b.userData.at = [((i * 0.618) % 1 - 0.5) * h.w * 0.8, ((i * 0.377) % 1 - 0.5) * h.d * 0.8, i * 0.9];
    group.add(b);
    return b;
  });
  return {
    group,
    show(time) {
      for (const b of bubbles) {
        const [bx, bz, ph] = b.userData.at as number[];
        const k = ((time + ph) % 2.4) / 2.4;
        b.position.set(bx, 0.015, bz);
        const sc = k < 0.85 ? k / 0.85 : 0;
        b.scale.setScalar(Math.max(0.01, sc));
        b.visible = sc > 0.02;
      }
    },
  };
}

/** A LAUNCHER: a squat striped base and a fat barrel tilted toward where it throws; its muzzle flashes when it fires. */
function buildLauncher(h: LauncherSpec, mats: HazardMats): BuiltHazard {
  const group = new THREE.Group();
  group.userData.moves = true;
  group.position.set(h.x, h.y, h.z);
  group.rotation.y = h.yaw;
  const base = new THREE.CylinderGeometry(h.r, h.r * 1.1, 0.16, 16, 1);
  base.translate(0, 0.08, 0);
  bakeVertexColor(base, 0x3a3e46);
  const stripes: THREE.BufferGeometry[] = [base];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    stripes.push(boxAt(0.18, 0.02, h.r * 0.5, Math.sin(a) * h.r * 0.7, 0.2, Math.cos(a) * h.r * 0.7, k % 2 ? 0x1a1a1a : 0xe8c040));
    stripes[stripes.length - 1].rotateY(0);
  }
  group.add(new THREE.Mesh(mergeAll(stripes), mats.iron));
  // The barrel: at the back of the pad, tilted up toward its aim (as steep as its throw), the mouth toward +z.
  const tilt = Math.atan2(h.speed, h.up);
  const barrel = new THREE.Group();
  barrel.position.set(0, 0.2, -h.r * 0.75);
  barrel.rotation.x = tilt;
  const tube = new THREE.CylinderGeometry(0.28, 0.34, 1.1, 10, 1, true);
  tube.translate(0, 0.55, 0);
  const lip = new THREE.TorusGeometry(0.29, 0.06, 4, 10);
  lip.rotateX(Math.PI / 2);
  lip.translate(0, 1.1, 0);
  barrel.add(new THREE.Mesh(mergeAll([bakeVertexColor(tube, 0x4a5058), bakeVertexColor(lip, 0xb87333)]), mats.iron));
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), flashMat);
  flash.position.y = 1.25;
  barrel.add(flash);
  group.add(barrel);
  return {
    group,
    show(time) {
      const since = time - (Zones.fired.get(h) ?? -1e9);
      flashMat.opacity = since >= 0 && since < 0.3 ? 1 - since / 0.3 : 0;
      flash.scale.setScalar(1 + 2 * Math.max(0, Math.min(1, since / 0.3)));
      // (It kicks back a little when it fires.)
      barrel.position.y = 0.2 - (since >= 0 && since < 0.2 ? 0.08 * (1 - since / 0.2) : 0);
    },
  };
}
