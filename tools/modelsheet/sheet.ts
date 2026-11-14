// A model sheet for the new beasts: each one in its main poses, side by side, in plain light. For checking how they look.
// Build: npx vite build tools/modelsheet --outDir ../../.sheet --emptyOutDir   (then open .sheet/index.html)
// Hash: #ironback or #bat (default both); &spin=yaw to turn them all.
import '../../src/core/colorSetup';
import * as THREE from 'three';
import { ps1Uniforms } from '../../src/render/ps1Material';
import { IronbackModel } from '../../src/enemies/ironbackModel';
import type { IronbackState } from '../../src/enemies/ironback';
import { BatModel } from '../../src/enemies/batModel';
import type { BatState } from '../../src/enemies/bat';

const W = 1400;
const H = 620;
const canvas = document.getElementById('c') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setSize(W, H);
renderer.setClearColor(0x3a4048);
ps1Uniforms.resolution.value.set(W / 2, H / 2);
ps1Uniforms.fogNear.value = 100;
ps1Uniforms.fogFar.value = 200;
const scene = new THREE.Scene();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 20), new THREE.MeshBasicMaterial({ color: 0x55504a }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
const spin = Number(/spin=([-\d.]+)/.exec(location.hash)?.[1] ?? 0.6);

type Tick = (dt: number) => void;
const ticks: Tick[] = [];
const labels: Array<{ text: string; x: number; y: number }> = [];
const which = location.hash.includes('bat') ? 'bat' : location.hash.includes('ironback') ? 'ironback' : 'both';

if (which !== 'bat') {
  const states: Array<[IronbackState, number]> = [['chase', 0.3], ['windup', 0.8], ['ram', 0.2], ['buck', 0.1], ['flipped', 1.0], ['tossWind', 0.4]];
  states.forEach(([st, t], i) => {
    const m = new IronbackModel();
    const x = (i - (states.length - 1) / 2) * 2.6;
    m.setTransform(new THREE.Vector3(x, 0, which === 'both' ? -1.6 : 0), spin);
    scene.add(m.root);
    let time = 0;
    ticks.push((dt) => {
      time += dt;
      m.update(dt, { state: st, stateTime: Math.min(t, time), moving: st === 'chase' });
    });
    labels.push({ text: st, x, y: which === 'both' ? -1.6 : 0 });
  });
}
if (which !== 'ironback') {
  const states: Array<[BatState, number, number]> = [['roost', 1, 3.4], ['hover', 0.3, 2.2], ['swoopWind', 0.5, 2.6], ['swoop', 0.35, 1.2], ['grounded', 0.5, 0], ['wake', 0.2, 3.0]];
  states.forEach(([st, t, y], i) => {
    const x = (i - (states.length - 1) / 2) * 2.6;
    const z = which === 'both' ? 1.8 : 0;
    const m = new BatModel({ x, y: 3.4, z }, i === 0 ? 'rock' : 'chain');
    m.setTransform(new THREE.Vector3(x, y, z), spin);
    scene.add(m.root);
    let time = 0;
    ticks.push((dt) => {
      time += dt;
      m.update(dt, { state: st, stateTime: Math.min(t, time), swoopU: st === 'swoop' ? 0.3 : 0, floorY: 0, y });
    });
    labels.push({ text: st, x, y: z });
  });
}
camera.position.set(0, which === 'bat' ? 3 : 4.5, which === 'both' ? 22 : 15);
camera.lookAt(0, which === 'bat' ? 1.8 : 0.6, 0);

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  for (const t of ticks) t(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// State names under each model.
const box = document.createElement('div');
box.style.cssText = 'position:fixed;inset:0;pointer-events:none';
document.body.appendChild(box);
for (const l of labels) {
  const v = new THREE.Vector3(l.x, -0.3, l.y).project(camera);
  const d = document.createElement('div');
  d.textContent = l.text;
  d.style.cssText = `position:absolute;left:${((v.x + 1) / 2) * W - 40}px;top:${((1 - v.y) / 2) * H}px;width:80px;text-align:center;font-weight:bold;color:#ffe9a0;text-shadow:0 1px 0 #000`;
  box.appendChild(d);
}
