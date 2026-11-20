/**
 * How the hazards and helpers look (world/hazards.ts): a conveyor belt whose slats run along it, a pendulum blade, a
 * plate of spikes, a fan in the floor with dust rising over it. Each is built in place; `show(time)` moves it as the
 * room's clock says (the same clock that says what hurts him). The room tags each as moving, so its gathering of still
 * dressing leaves them alone.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeVertexColor } from '../render/ps1Material';
import { HAZARD, bladeAngle, fanPower, spikesUp, type HazardSpec } from './hazards';

export interface HazardMats {
  iron: THREE.Material;
  plain: THREE.Material;
}
export interface BuiltHazard {
  group: THREE.Group;
  show(time: number): void;
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

export function buildHazard(h: HazardSpec, mats: HazardMats): BuiltHazard {
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
