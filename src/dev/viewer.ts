import * as THREE from 'three';
import { ps1Uniforms } from '../render/ps1Material';
import { RatModel, RatAnimInput } from '../player/ratModel';
import { ScuttlerModel } from '../enemies/scuttlerModel';
import type { ScuttlerState } from '../enemies/scuttler';
import type { PlayerState } from '../player/controller';
import { TUNING } from '../data/tuning';

/**
 * Development pose viewer. Open the page with a hash such as
 *   #view&state=attack&step=0&t=0.2&yaw=0.6
 * to render one frame of one animation from a chosen angle. Used to check poses with screenshots.
 * Parameters: who (rat|bug), state, t (seconds to play), step (combo hit), v (vertical speed), flip (0|1),
 * speed, yaw, pitch, dist, h (camera target height), res (resolution multiplier).
 */
export function runViewer(canvas: HTMLCanvasElement): void {
  const q = new URLSearchParams(location.hash.slice(1).replace(/^view&?/, ''));
  const num = (k: string, d: number): number => (q.has(k) ? Number(q.get(k)) : d);
  const res = num('res', 2);
  const W = 320 * res;
  const H = 240 * res;

  for (const id of ['touch', 'debug']) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }
  document.querySelectorAll<HTMLElement>('body > div:not(#gameWrap)').forEach((el) => (el.style.display = 'none'));

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x2a3440);
  ps1Uniforms.resolution.value.set(W, H);
  ps1Uniforms.fogFar.value = 10000;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ color: 0x3a4452 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const who = q.get('who') ?? 'rat';
  const t = num('t', 0);
  const dt = 1 / 60;
  const origin = new THREE.Vector3();

  if (who === 'bug') {
    const bug = new ScuttlerModel();
    scene.add(bug.root);
    const state = (q.get('state') ?? 'idle') as ScuttlerState;
    for (let time = 0; time <= t + 1e-6; time += dt) {
      bug.setTransform(origin, 0);
      bug.update(dt, { state, stateTime: time, moving: state === 'chase' || state === 'return' });
    }
  } else {
    const rat = new RatModel();
    scene.add(rat.root);
    const state = (q.get('state') ?? 'idle') as PlayerState;
    const base: RatAnimInput = {
      state,
      planarSpeed: num('speed', state === 'run' ? TUNING.move.run : state === 'walk' ? TUNING.move.walk : 0),
      comboStep: num('step', 0),
      attackTime: 0,
      dodgeKind: (q.get('kind') ?? 'roll') as 'roll' | 'back',
      dodgeProgress: 0,
      verticalSpeed: num('v', 0),
      flipProgress: 0,
      armed: q.get('armed') !== '0',
      stowProgress: -1,
      plungeStage: num('stage', 0),
    };
    rat.setTransform(origin, 0);
    // Settle into the stance first, then play the requested state for t seconds.
    for (let i = 0; i < 60; i++) rat.update(dt, { ...base, state: 'idle', planarSpeed: 0 });
    const flip = num('flip', 0) > 0;
    for (let time = 0; time <= t + 1e-6; time += dt) {
      rat.update(dt, {
        ...base,
        attackTime: time,
        dodgeProgress: Math.min(0.999, time / (base.dodgeKind === 'roll' ? TUNING.dodge.roll.duration : TUNING.dodge.back.duration)),
        stowProgress: q.has('stow') ? Math.min(0.999, time / 0.6) : -1,
        armed: q.has('stow') ? (q.get('armed') !== '0') === (time / 0.6 < 0.5) : q.get('armed') !== '0',
        flipProgress: flip ? Math.min(0.999, time / TUNING.jump.flipDuration) : 0,
      });
    }
    const after = q.get('after') as PlayerState | null;
    if (after) for (let time = 0; time <= num('t2', 0) + 1e-6; time += dt) rat.update(dt, { ...base, state: after, planarSpeed: num('speed2', 0) });
  }

  // (`after=<state>&t2=<seconds>`: the state that follows, for looking at the change from one to the other.)
  const yaw = num('yaw', 0.5);
  const pitch = num('pitch', 0.18);
  const dist = num('dist', 2.6);
  const h = num('h', 0.55);
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, h + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(0, h, 0);
  renderer.render(scene, camera);
}
