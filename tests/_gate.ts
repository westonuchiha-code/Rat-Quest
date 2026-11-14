import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb, type Aabb } from '../src/world/collision';
import { NO_GEAR, gearMods, STARTING_GEAR, ITEMS } from '../src/data/equipment';
import type { WaterVolume } from '../src/world/layout';
const DT = 1 / 60;
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const wear = (id: string) => gearMods([...Object.values(STARTING_GEAR).filter((s) => ITEMS[s].slot !== ITEMS[id].slot), id]);
const north = new THREE.Vector3(0, 0, -1);
// A gap test: runway z 0..10 at y 0, gap G, target from z -G to -G-6. Returns true if he ends up standing on the target.
function cross(G: number, mode: 'plain' | 'long', g = NO_GEAR, second = -1, edge = 0.3): boolean {
  const cs: Aabb[] = [makeAabb(0, -0.5, 5, 6, 1, 10), makeAabb(0, -0.5, -G - 3, 6, 1, 6)];
  const p = new PlayerController(new THREE.Vector3(0, 0, 9.5));
  p.gear = g;
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  let t = 0;
  while (p.position.z > edge && t++ < 400) p.update(DT, inp({ move: north }), cs);
  const long = mode === 'long';
  if (long) for (let k = 0; k < 3; k++) p.update(DT, inp({ move: north, run: false }), cs);
  p.update(DT, inp({ move: north, run: !long, jumpPressed: true, jumpHeld: true }), cs);
  for (let k = 0; k < 400; k++) {
    p.update(DT, inp({ move: north, run: !long, jumpPressed: k === second, jumpHeld: true }), cs);
    if (p.position.y < -5) return false;
    if (p.grounded && k > 5) return p.position.z < -G + 0.01 && Math.abs(p.position.y) < 0.05;
  }
  return false;
}
const best = (f: (G: number) => boolean): number => { let g = 6; while (f(g + 0.1)) g += 0.1; return g; };
const plainBest = best((G) => { for (let k = 4; k < 60; k++) for (const e of [0.1, 0.3]) if (cross(G, 'plain', NO_GEAR, k, e)) return true; return false; });
const longBest = best((G) => [0.1, 0.3, 0.6].some((e) => cross(G, 'long', NO_GEAR, -1, e)));
const royalLong = best((G) => [0.1, 0.3, 0.6].some((e) => cross(G, 'long', wear('royalScarf'), -1, e)));
const royalLongEasy = best((G) => [0.3, 0.6, 0.9, 1.2].filter((e) => cross(G, 'long', wear('royalScarf'), -1, e)).length >= 3);
const royalPlain = best((G) => { for (let k = 4; k < 60; k++) if (cross(G, 'plain', wear('royalScarf'), k, 0.2)) return true; return false; });
console.log('gap (incl. grab+climb): plain double', plainBest.toFixed(1), 'long', longBest.toFixed(1), 'royal long', royalLong.toFixed(1), 'royal long (3 of 4 take-offs)', royalLongEasy.toFixed(1), 'royal plain', royalPlain.toFixed(1));
function drop(G: number, mode: 'plain' | 'long', g = NO_GEAR, second = -1, edge = 0.3, H = 20, T = 6.5): boolean {
  const cs: Aabb[] = [makeAabb(0, H - 0.5, 5, 10, 1, 10), makeAabb(0, T - 0.5, -G - 15, 4, 1, 30)];
  const p = new PlayerController(new THREE.Vector3(0, H, 9.5));
  p.gear = g;
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  let t = 0;
  while (p.position.z > edge && t++ < 400) p.update(DT, inp({ move: north }), cs);
  const long = mode === 'long';
  if (long) for (let k = 0; k < 3; k++) p.update(DT, inp({ move: north, run: false }), cs);
  p.update(DT, inp({ move: north, run: !long, jumpPressed: true, jumpHeld: true }), cs);
  for (let k = 0; k < 600; k++) {
    p.update(DT, inp({ move: north, run: !long, jumpPressed: k === second, jumpHeld: true }), cs);
    if (p.position.y < T - 6) return false;
    if (p.grounded && k > 5) return p.position.z < -G + 0.01 && Math.abs(p.position.y - T) < 0.05;
  }
  return false;
}
const dPlain = best((G) => { for (let k = 4; k < 70; k += 2) for (const e of [0.1, 0.3]) if (drop(G, 'plain', NO_GEAR, k, e)) return true; return false; });
const dLong = best((G) => [0.1, 0.3, 0.6].some((e) => drop(G, 'long', NO_GEAR, -1, e)));
const dRoyal = best((G) => [0.1, 0.3, 0.6].some((e) => drop(G, 'long', wear('royalScarf'), -1, e)));
const dRoyalEasy = best((G) => [0.3, 0.6, 0.9, 1.2].filter((e) => drop(G, 'long', wear('royalScarf'), -1, e)).length >= 3);
console.log('drop 20 -> 6.5: plain double', dPlain.toFixed(1), 'long', dLong.toFixed(1), 'royal long', dRoyal.toFixed(1), 'royal long (3 of 4)', dRoyalEasy.toFixed(1));
// The current: a covered channel along z, water surface -0.85, lid at -0.1, current pushing +z at speed v.
function swimUp(v: number, g = NO_GEAR, spam = false): number {
  const cs: Aabb[] = [makeAabb(0, -2.7, 0, 5, 1, 60), makeAabb(0, 0.4, 0, 5, 1, 60), makeAabb(-3, -1, 0, 1, 6, 60), makeAabb(3, -1, 0, 1, 6, 60)];
  const water: WaterVolume[] = [{ x0: -2.5, x1: 2.5, z0: -30, z1: 30, y: -0.85, flow: [0, v] }];
  const p = new PlayerController(new THREE.Vector3(0, -1.47, 0));
  p.gear = g;
  p.water = water;
  const z0 = p.position.z;
  for (let t = 0; t < 600; t++) p.update(DT, inp({ move: north, jumpPressed: spam && t % 6 === 0, jumpHeld: spam, dodgePressed: spam && t % 9 === 3 }), cs);
  return z0 - p.position.z; // progress upstream in 10 s
}
for (const v of [3.2]) console.log('current', v, 'plain', swimUp(v).toFixed(1), 'spamming', swimUp(v, NO_GEAR, true).toFixed(1), 'sludge', swimUp(v, wear('sludgeScarf')).toFixed(1), 'ember', swimUp(v, wear('emberHelm')).toFixed(1));
