// The sword must never go below the ground during an air attack, on the dive or in the landing crouch.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { RatModel } from '../src/player/ratModel';

const rat = new RatModel();
rat.setTransform(new THREE.Vector3(0, 0, 0), 0);
const DT = 1 / 60;
const base = {
  planarSpeed: 0, comboStep: 0, attackTime: 0, dodgeKind: 'roll' as const, dodgeProgress: 0,
  verticalSpeed: 0, flipProgress: 0, armed: true, stowProgress: -1,
};
const b = new THREE.Vector3();
const t = new THREE.Vector3();
let lowest = Infinity;
let where = '';
const perPhase: Record<string, number> = {};
function step(state: 'idle' | 'plunge', stage: number, label: string): void {
  rat.update(DT, { ...base, state, plungeStage: stage });
  rat.getBlade(b, t);
  perPhase[label] = Math.min(perPhase[label] ?? Infinity, b.y, t.y);
  for (const [name, v] of [['base', b], ['tip', t]] as const) {
    if (v.y < lowest) {
      lowest = v.y;
      where = `${label} ${name}`;
    }
  }
}
for (let i = 0; i < 60; i++) step('idle', 0, 'idle');
for (let i = 0; i < 10; i++) step('plunge', 1, 'wind');
for (let i = 0; i < 12; i++) step('plunge', 2, 'dive');
for (let i = 0; i < 40; i++) step('plunge', 3, 'land');
for (let i = 0; i < 30; i++) step('idle', 0, 'recover');
// A plunge from just above the ground: hardly any dive before the landing.
for (let i = 0; i < 10; i++) step('plunge', 1, 'wind2');
for (let i = 0; i < 2; i++) step('plunge', 2, 'dive2');
for (let i = 0; i < 40; i++) step('plunge', 3, 'land2');
for (let i = 0; i < 30; i++) step('idle', 0, 'recover2');
console.log(Object.entries(perPhase).map(([k, v]) => `${k}=${v.toFixed(2)}`).join('  '));
console.log(`lowest blade point: y=${lowest.toFixed(3)} at ${where}`);
const ok = lowest >= -0.005;
console.log(ok ? 'PASS  the sword never goes below the ground' : 'FAIL  the sword goes below the ground');
process.exit(ok ? 0 : 1);
