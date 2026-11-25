/**
 * THREE PARTS FOR BUILDING LEVELS (2026-11-25): weight plates, keys and locked gates, checkpoints. Plain rules here
 * (tests/locks.ts plays them); main.ts gives them the room, draws them and sounds them. All three are shown in the
 * Lockworks (levels/lockworks.ts, a test room).
 *
 * A WEIGHT PLATE is a floor plate that is down only WHILE something is on it: him, or a crate, a barrel, a pot, a rock
 * or a key set down on it. (The plain plate is pressed once and stays.) A gate that waits for weight plates and is
 * marked `shut` drops again when one comes up: so a crate carried to the plate holds the gate while he goes through.
 *
 * A KEY is carried over his head and thrown as a rock is (world/lifting.ts): his hands are full, so he cannot fight
 * or guard while he has it. It never breaks. Lost out of the world, it is put back where it began. Brought within
 * `LOCK.reach` of a LOCKED gate (in his hands, thrown, or set down), it opens the gate and is used up.
 *
 * A CHECKPOINT is a lantern. Touching it lights it, and it is then where he comes back to if he is beaten in that
 * room (and the one lit before it goes out). It does not heal him: it saves the walk, not the fight.
 */
import * as THREE from 'three';
import type { Crate } from './crates';

export const WEIGHT = {
  /** How near the plate's middle a thing's middle must be to be on it (a plate's pad is 1.5 across). */
  reach: 0.85,
  /** ...and how near its top the thing's foot (or his feet). */
  rise: 0.35,
} as const;
export const LOCK = { reach: 1.7 } as const;
export const CHECKPOINT = { reach: 1.1, rise: 1.6 } as const;

export interface Spot { x: number; y: number; z: number }

/** Whether a weight plate at `pl` is held down: by him (`feet`, on the ground; null if he is not), or by something set on it. */
export function weightOn(pl: Spot, feet: Spot | null, things: readonly Crate[]): boolean {
  if (feet && Math.hypot(feet.x - pl.x, feet.z - pl.z) < WEIGHT.reach && Math.abs(feet.y - pl.y) < WEIGHT.rise + 0.25) return true;
  return things.some((c) => c.alive && !c.lifted && c.type !== 'pipe' && Math.hypot(c.x - pl.x, c.z - pl.z) < WEIGHT.reach && Math.abs(c.aabb.min.y - pl.y) < WEIGHT.rise);
}

/** The key that would open a locked gate standing at `gate` now (one near enough it, wherever it is: carried, flying or lying), or null. */
export function keyAt(gate: Spot, things: readonly Crate[]): Crate | null {
  return things.find((c) => c.alive && c.type === 'key' && Math.hypot(c.x - gate.x, c.z - gate.z) < LOCK.reach && Math.abs(c.y - gate.y) < 3.5) ?? null;
}

/** Which checkpoint he is touching (its place in the list), or -1. */
export function checkpointAt(points: readonly Spot[], at: Spot): number {
  return points.findIndex((c) => Math.hypot(c.x - at.x, c.z - at.z) < CHECKPOINT.reach && at.y > c.y - 0.5 && at.y < c.y + CHECKPOINT.rise);
}

/** A checkpoint's lantern: a post, a cage, and the flame in it (dark till he touches it). `light(on)` lights it or puts it out. */
export function buildCheckpoint(at: Spot): { root: THREE.Group; light: (on: boolean) => void; tick: (time: number) => void } {
  const root = new THREE.Group();
  root.position.set(at.x, at.y, at.z);
  const iron = new THREE.MeshBasicMaterial({ color: 0x2a2620 });
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.0, 6).translate(0, 0.5, 0), iron);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.08, 8).translate(0, 0.04, 0), iron);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 6).translate(0, 1.5, 0), iron);
  const bars = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.4, 6, 1, true).translate(0, 1.22, 0), new THREE.MeshBasicMaterial({ color: 0x2a2620, wireframe: true }));
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x39424c });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.22, 0), flameMat);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8).translate(0, 1.22, 0), haloMat);
  root.add(post, foot, cap, bars, flame, halo);
  let lit = false;
  return {
    root,
    light: (on) => {
      lit = on;
      flameMat.color.set(on ? 0xffe9a8 : 0x39424c);
    },
    tick: (time) => {
      haloMat.opacity = lit ? 0.32 + 0.08 * Math.sin(time * 5 + at.x) : 0;
      flame.scale.setScalar(lit ? 1 + 0.12 * Math.sin(time * 9 + at.z) : 0.8);
    },
  };
}
