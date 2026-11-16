import { Widow, WIDOW } from '../enemies/widow';
import { WidowModel } from '../enemies/widowModel';
import * as THREE from 'three';
import { ps1Uniforms } from '../render/ps1Material';
import { RatModel, RatAnimInput } from '../player/ratModel';
import { ScuttlerModel } from '../enemies/scuttlerModel';
import { Firefly } from '../enemies/firefly';
import { FireflyModel } from '../enemies/fireflyModel';
import type { ScuttlerState } from '../enemies/scuttler';
import type { PlayerState } from '../player/controller';
import { TUNING } from '../data/tuning';
import { makePatron, patronLook, type Doing, type PatronKind } from '../npc/patrons';

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

  if (who === 'patron') {
    // One of the Club's regulars: #view&who=patron&kind=turtle&name=Pebble&doing=drink&seated=1&t=3&head=0.4
    const kind = (q.get('kind') ?? 'turtle') as PatronKind;
    const body = makePatron(kind, patronLook(kind, q.get('name') ?? ''));
    scene.add(body.root);
    if (q.get('seated') === '1') {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.44, 8), new THREE.MeshBasicMaterial({ color: 0x8a6a4a }));
      stool.position.set(0, 0.22, kind === 'fox' ? -0.02 : -0.1);
      scene.add(stool);
    }
    for (let time = 0; time <= t + 1e-6; time += dt) {
      body.update(dt, { time, talking: q.get('talking') === '1', mouth: q.get('talking') === '1' ? Math.max(0, Math.sin(time * 14)) : 0, headYaw: num('head', 0), doing: (q.get('doing') ?? 'stand') as Doing, seated: q.get('seated') === '1', turn: num('turn', 0) });
    }
  } else if (who === 'widow') {
    // The Widow, `t` seconds into her fight with a rat who stands still at (px, pz): #view&who=widow&t=4.5&yaw=0&dist=40&pitch=0.5&lz=8
    // She is at the origin facing +z; her floor's middle is 13.8 in front of her. `rage=1`: angry from the start. `die=<seconds>`: killed then.
    const w = new Widow({ x: 0, z: 0, facing: 0, arena: { x0: -13, x1: 13, z0: 0.8, z1: 26.8 } });
    w.rng = () => 0.5;
    const m = new WidowModel();
    scene.add(m.root);
    floor.visible = false;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(13, 40), new THREE.MeshBasicMaterial({ color: 0x4a5462 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, -0.001, 13.8);
    scene.add(disc);
    const rat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0xd8b070 }));
    rat.position.set(num('px', 3), 0.55, num('pz', 12));
    scene.add(rat);
    if (q.get('rage') === '1') w.takeHit(WIDOW.hp, 0, 0, 'sword', 0);
    const die = num('die', -1);
    for (let time = 0; time <= t + 1e-6; time += dt) {
      if (die >= 0 && time >= die && w.alive) w.takeHit(9999, 0, 0, 'sword', -1);
      w.update(dt, rat.position.x, 0, rat.position.z, true);
      w.events.length = 0;
      m.update(dt, w);
    }
    camera.far = 400;
    camera.updateProjectionMatrix();
  } else if (who === 'widowmock') {
    // A TRY-OUT, not the game: the Widow's model drawn `big` times its size beside the same floor, held in one pose,
    // to see whether a much bigger spider striking with the legs she stands on reads right.
    // #view&who=widowmock&pose=rest|raise|slam|rake|bite&big=1.9&yaw=0&dist=60&pitch=0.4&h=4&lz=12
    const big = num('big', 1.9);
    const R = 13 / big;
    const pose = q.get('pose') ?? 'rest';
    const m = new WidowModel();
    const holder = new THREE.Group();
    holder.scale.setScalar(big);
    holder.add(m.root);
    scene.add(holder);
    floor.visible = false;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(13, 40), new THREE.MeshBasicMaterial({ color: 0x4a5462 }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, -0.001, 13 + 0.8 * big);
    scene.add(disc);
    const rat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 8), new THREE.MeshBasicMaterial({ color: 0xd8b070 }));
    rat.position.set(num('px', -3), 0.55, num('pz', 17));
    scene.add(rat);
    const spot = { x: rat.position.x / big, z: rat.position.z / big };
    const side: 1 | -1 = spot.x >= 0 ? 1 : -1;
    const hip = (sd: 1 | -1, inner = false): { x: number; z: number } => ({ x: sd * 3 * (inner ? 0.5 : 1), z: 0 });
    const state = pose === 'raise' ? 'slamWind' : pose === 'slam' ? 'slamStuck' : pose === 'bite' ? 'biteStuck' : 'idle';
    const sweep = num('sweep', -0.5);
    const view = {
      state, stateTime: 5, windTime: 1, side, angle: 0, spot, floorY: 0, raging: false, crawling: 0,
      x: pose === 'bite' ? spot.x * 0.45 : 0, z: pose === 'bite' ? spot.z * 0.45 : 1.2, px: 0, pz: 0, facing: 0,
      field: { x: 0, z: R + 0.8, r: R }, home: { x: 0, z: 1.2 }, tip: { x: 0, z: 9 },
      rake: pose === 'rake' ? { x: hip(side).x + Math.sin(sweep) * 9.6, z: Math.cos(sweep) * 9.6 } : null,
      hip, dirOf: (a: number): [number, number] => [Math.sin(a), Math.cos(a)],
    };
    for (let i = 0; i < 240; i++) m.update(dt, view as never);
    camera.far = 500;
    camera.updateProjectionMatrix();
  } else if (who === 'firefly') {
    // The Firefly Bomber, hanging low so it is in the picture: `&color=ff4aa8` gives it a colour of its own,
    // `&light=0` puts its lantern out (default full).
    const f = new Firefly({ x: 0, z: 0, color: q.has('color') ? parseInt(q.get('color')!, 16) : undefined });
    const fm = new FireflyModel(f.color);
    scene.add(fm.root);
    for (let time = 0; time <= t + 1e-6; time += dt) fm.update(dt, { state: 'spent', stateTime: time, x: 0, y: 0.7, z: 0, facing: 0, vent: { x: 0, y: 0.72, z: -0.8 }, light: num('light', 1), floor: 0, moving: 0 });
  } else if (who === 'bug') {
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
      slide: state === 'slide' ? { back: q.get('back') === '1', air: false, along: num('along', 0), across: 0 } : null,
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
  // (`lx`, `lz`: what it looks at, if not the origin.)
  const lx = num('lx', 0);
  const lz = num('lz', 0);
  camera.position.x += lx;
  camera.position.z += lz;
  camera.lookAt(lx, h, lz);
  renderer.render(scene, camera);
}
