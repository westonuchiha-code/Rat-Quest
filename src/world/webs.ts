/**
 * WEB CURTAINS (2026-11-24, the speed room's own hazard; a placeholder to try the idea).
 *
 * A web strung across his way, over a rail or a pipe's bed. On his shield and going FAST ENOUGH (a rush: a creature
 * struck down just before it) he TEARS THROUGH it and loses nothing. Slower, it CATCHES him: nearly all his speed is
 * gone (no hurt: what it costs is the speed, and the run of bats that speed was for). On foot it is only brushed
 * aside. A torn web is spun again after a while.
 *
 * Plain rules here (tests/longdrop.ts plays them); main.ts draws them (`webMesh`) and gives the knight the result.
 */
import * as THREE from 'three';

export interface WebSpec { x: number; y: number; z: number; r: number }
export const WEB = {
  /** Going at least this fast he tears through. (Over his standing top speed: only a rush does it.) */
  tear: 19,
  /** Caught, this is the speed he is left with. */
  left: 4,
  /** A torn web is spun again after this long. */
  regrow: 25,
} as const;

export interface WebState { spec: WebSpec; torn: number }
export const websOf = (specs: readonly WebSpec[] | undefined): WebState[] => (specs ?? []).map((spec) => ({ spec, torn: 0 }));

export type WebMeeting = { web: WebState; how: 'tear' | 'catch' | 'brush' } | null;

/**
 * He has moved from `from` to `to` this step at `speed` along the ground, on his shield or not: the web he went
 * through, if any, and what came of it. A torn web is not met. (Tearing and brushing tear it; catching leaves it.)
 */
export function meetWeb(webs: WebState[], from: THREE.Vector3, to: THREE.Vector3, speed: number, onShield: boolean): WebMeeting {
  for (const web of webs) {
    if (web.torn > 0) continue;
    const s = web.spec;
    if ((from.z - s.z) * (to.z - s.z) > 0 || from.z === to.z) continue;
    const k = (s.z - from.z) / (to.z - from.z);
    const x = from.x + (to.x - from.x) * k;
    const y = from.y + (to.y - from.y) * k + 0.5;
    if (Math.hypot(x - s.x, y - s.y) > s.r) continue;
    const how = !onShield ? 'brush' : speed >= WEB.tear ? 'tear' : 'catch';
    if (how !== 'catch') web.torn = WEB.regrow;
    return { web, how };
  }
  return null;
}

export function tickWebs(webs: WebState[], dt: number): void {
  for (const w of webs) w.torn = Math.max(0, w.torn - dt);
}

/** A web's threads: spokes and sagging rings, facing along z. */
export function webMesh(spec: WebSpec): THREE.LineSegments {
  const pts: number[] = [];
  const spokes = 10;
  for (let k = 0; k < spokes; k++) {
    const a = (k / spokes) * Math.PI * 2;
    pts.push(0, 0, 0, Math.cos(a) * spec.r, Math.sin(a) * spec.r, 0);
  }
  for (const rr of [0.25, 0.5, 0.75, 1]) {
    for (let k = 0; k < spokes; k++) {
      const a0 = (k / spokes) * Math.PI * 2;
      const a1 = ((k + 1) / spokes) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const sag = 0.84;
      pts.push(Math.cos(a0) * spec.r * rr, Math.sin(a0) * spec.r * rr, 0, Math.cos(am) * spec.r * rr * sag, Math.sin(am) * spec.r * rr * sag, 0);
      pts.push(Math.cos(am) * spec.r * rr * sag, Math.sin(am) * spec.r * rr * sag, 0, Math.cos(a1) * spec.r * rr, Math.sin(a1) * spec.r * rr, 0);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xe8eef2, transparent: true, opacity: 0.85 }));
  mesh.position.set(spec.x, spec.y, spec.z);
  return mesh;
}
