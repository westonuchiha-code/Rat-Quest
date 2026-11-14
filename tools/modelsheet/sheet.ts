// A model sheet for the new beasts: each one in its main poses, side by side, in plain light. For checking how they look.
// Build: npx vite build tools/modelsheet --outDir ../../.sheet --emptyOutDir   (then open .sheet/index.html)
// Hash: #ironback, #bat, #roach, #toad or #npcs (default: ironback and bat); &spin=yaw to turn them all.
import '../../src/core/colorSetup';
import * as THREE from 'three';
import { ps1Uniforms } from '../../src/render/ps1Material';
import { IronbackModel } from '../../src/enemies/ironbackModel';
import type { IronbackState } from '../../src/enemies/ironback';
import { BatModel } from '../../src/enemies/batModel';
import type { BatState } from '../../src/enemies/bat';
import { ScuttlerModel } from '../../src/enemies/scuttlerModel';
import type { ScuttlerState } from '../../src/enemies/scuttler';
import { ToadModel } from '../../src/enemies/toadModel';
import type { ToadState } from '../../src/enemies/toad';
import { Npc } from '../../src/npc/npc';
import { drawPortrait } from '../../src/npc/portrait';
import { stickerIcon } from '../../src/ui/icons';
import { portraitTexture } from '../../src/world/portraitTexture';
import { RatModel } from '../../src/player/ratModel';
import { PlayerController, type PlayerInput } from '../../src/player/controller';
import { makeAabb } from '../../src/world/collision';
import type { NpcAct, NpcKind } from '../../src/npc/npc';

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
const pick = /#(bat|ironback|roach|toad|npcs|hero|moves|grim)/.exec(location.hash)?.[1];
const which = pick === 'bat' || pick === 'ironback' ? pick : pick ? 'other' : 'both';

if (pick === 'grim') {
  // Lord Grimsqueak in each thing his body does: at rest, talking, every tell of the fight, brought low, and the ending.
  // &only=N shows one alone.
  const poses: Array<[string, Partial<NpcAct>, boolean]> = [
    ['rest', {}, false], ['talking', {}, true], ['cast (volley)', { gesture: 'cast', float: 1 }, false], ['conjure (orb)', { gesture: 'conjure', float: 1 }, false],
    ['point (bat)', { gesture: 'point', float: 1 }, false], ['rear (swoop)', { gesture: 'rear', float: 1 }, false], ['sweep (dive)', { gesture: 'sweep', float: 1 }, false], ['raise (slam)', { gesture: 'raise', float: 1 }, false],
    ['smash', { gesture: 'smash', low: 1 }, false], ['slump (spent)', { gesture: 'slump', low: 1, bow: 0.6 }, false], ['rage', { gesture: 'rage', float: 1 }, false],
    ['offer (ending)', { low: 1, reach: 1, still: true }, false],
  ];
  const only = Number(/only=(\d+)/.exec(location.hash)?.[1] ?? -1);
  poses.forEach(([name, act, talking], i) => {
    if (only >= 0 && i !== only) return;
    const x = only >= 0 ? 0 : (i - (poses.length - 1) / 2) * 2.3;
    const n = new Npc({ name: 'Lord Grimsqueak', kind: 'villain', x, z: 0, facing: spin, lines: ['.'] });
    scene.add(n.root);
    let beat = 0;
    ticks.push((dt) => {
      beat += dt;
      if (talking && beat > 0.16) { beat = 0; n.pulse(); }
      n.act = { lookAt: [x + Math.sin(spin) * 3, Math.cos(spin) * 3], shrug: 0, ...act };
      n.update(dt, x + Math.sin(spin) * 3, 0, Math.cos(spin) * 3, talking);
    });
    labels.push({ text: `${i} ${name}`, x, y: 0 });
  });
  // Let every one of them come to rest in his pose before the first picture.
  for (let k = 0; k < 240; k++) for (const t of ticks) t(1 / 60);
}
let soloY = 0; // with &only=N, how high that one figure is (the camera follows it)
if (pick === 'moves') {
  // Every move the hero has, played by the real controller and stopped at its telling moment. Two rows.
  // &only=N shows one alone (for a close look from any side).
  const DT = 1 / 60;
  const fwd = new THREE.Vector3(0, 0, 1);
  type In = Partial<PlayerInput>;
  /** A move: what to press on each tick (given the tick number and him), and when to stop. `wall` puts a wall in front; `water` floods the floor. */
  interface Move { name: string; wall?: boolean; water?: boolean; press: (t: number, p: PlayerController, mem: Record<string, number>) => In; stop: (t: number, p: PlayerController, mem: Record<string, number>) => boolean; before?: (p: PlayerController) => void }
  const after = (key: string, n: number) => (_t: number, _p: PlayerController, m: Record<string, number>): boolean => (m[key] ?? -1) >= 0 && ++m[key] > n;
  const jumpAt0 = (t: number): In => ({ jumpPressed: t === 2, jumpHeld: true });
  const moves: Move[] = [
    { name: 'idle', press: () => ({}), stop: (t) => t > 60 },
    { name: 'walk', press: () => ({ move: fwd.clone().multiplyScalar(0.5) }), stop: (t) => t > 47 },
    { name: 'run', press: () => ({ move: fwd, run: true }), stop: (t) => t > 52 },
    { name: 'jump', press: jumpAt0, stop: (t) => t > 10 },
    { name: 'air jump', press: (t, p, m) => { const go = t > 4 && p.velocity.y < 1 && !m.done; if (go) m.done = 1; return { jumpPressed: t === 2 || go, jumpHeld: true }; }, stop: (_t, _p, m) => !!m.done && ++m.done > 9 },
    { name: 'fall', press: jumpAt0, stop: (_t, p) => p.velocity.y < -7 },
    { name: 'land', press: jumpAt0, stop: (t, p, m) => { if (t > 6 && p.grounded) m.g = (m.g ?? 0) + 1; return (m.g ?? 0) > 3; } },
    { name: 'long jump', press: (t) => ({ move: fwd, run: t < 40, jumpPressed: t === 42, jumpHeld: t >= 42 }), stop: (t) => t > 54 },
    { name: 'wall touch', wall: true, press: (t) => ({ move: fwd, jumpPressed: t === 2, jumpHeld: true }), stop: (t, p) => t > 6 && Math.abs(p.velocity.z) < 0.01 && p.velocity.y < 2 },
    { name: 'wall kick', wall: true, press: (t, p, m) => { const go = t > 6 && Math.abs(p.velocity.z) < 0.01 && !m.k; if (go) m.k = 1; return { move: fwd, jumpPressed: t === 2 || go, jumpHeld: true }; }, stop: (_t, _p, m) => !!m.k && ++m.k > 7 },
    { name: 'plunge: hang', press: (t) => ({ jumpPressed: t === 2, jumpHeld: true, attackPressed: t === 22 }), stop: (t, p) => t > 22 && p.plungeStage === 1 && t > 28 },
    { name: 'plunge: dive', press: (t) => ({ jumpPressed: t === 2, jumpHeld: true, attackPressed: t === 22 }), stop: (_t, p, m) => { if (p.plungeStage === 2) m.d = (m.d ?? 0) + 1; return (m.d ?? 0) > 1; } },
    { name: 'plunge: land', press: (t) => ({ jumpPressed: t === 2, jumpHeld: true, attackPressed: t === 22 }), stop: (_t, p, m) => { if (p.plungeStage === 3) m.d = (m.d ?? 0) + 1; return (m.d ?? 0) > 8; } },
    { name: 'roll', press: (t) => ({ move: fwd, dodgePressed: t === 10 }), stop: (_t, p) => p.dodgeProgress > 0.45 },
    { name: 'backstep', press: (t) => ({ dodgePressed: t === 10 }), stop: (_t, p) => p.dodgeProgress > 0.4 },
    { name: 'guard', press: () => ({ guardHeld: true }), stop: (t) => t > 40 },
    { name: 'guard walk', press: () => ({ guardHeld: true, move: fwd }), stop: (t) => t > 46 },
    { name: 'swing 1', press: (t) => ({ attackPressed: t === 10 }), stop: (t, p) => t > 10 && p.attackTime > 0.12 },
    { name: 'swing 2', press: (t) => ({ attackPressed: t === 10 || t === 26 }), stop: (_t, p) => p.comboStep === 1 && p.attackTime > 0.12 },
    { name: 'swing 3', press: (t) => ({ attackPressed: t === 10 || t === 26 || t === 42 }), stop: (_t, p) => p.comboStep === 2 && p.attackTime > 0.16 },
    { name: 'hurt', press: () => ({}), before: (p) => void p.takeHit(p.position.x, p.position.z + 1, 1), stop: (t) => t > 8 },
    { name: 'dead', press: () => ({}), before: (p) => { for (let k = 0; k < 12; k++) { if (p.takeHit(p.position.x, p.position.z + 1, 1) === 'killed') break; for (let j = 0; j < 150; j++) p.update(DT, { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false }, [makeAabb(0, -0.5, 0, 400, 1, 400)]); } }, stop: (t) => t > 50 },
    { name: 'swim: tread', water: true, press: () => ({}), stop: (t) => t > 80 },
    { name: 'swim', water: true, press: () => ({ move: fwd }), stop: (t) => t > 80 },
    { name: 'stowed run', press: (t) => ({ move: fwd, run: true, stowPressed: t === 4 }), stop: (t) => t > 80 },
  ];
  const only = Number(/only=(\d+)/.exec(location.hash)?.[1] ?? -1);
  const PER = 9;
  moves.forEach((mv, i) => {
    if (only >= 0 && i !== only) return;
    const slotX = only >= 0 ? 0 : ((i % PER) - (PER - 1) / 2) * 2.5;
    const slotZ = only >= 0 ? 0 : -Math.floor(i / PER) * 4.2;
    const floorY = mv.water ? -1.6 : 0;
    const colliders = [makeAabb(0, floorY - 0.5, 0, 400, 1, 400)];
    if (mv.wall) colliders.push(makeAabb(0, 4, 2.6, 6, 8, 1));
    const p = new PlayerController(new THREE.Vector3(0, mv.water ? -0.6 : 0, 0));
    if (mv.water) p.water = [{ x0: -200, x1: 200, z0: -200, z1: 200, y: 0 }];
    const rat = new RatModel();
    scene.add(rat.root);
    const mem: Record<string, number> = {};
    const feed = (): void => {
      rat.setTransform(p.position, p.facing);
      rat.update(DT, {
        state: p.state, planarSpeed: Math.hypot(p.velocity.x, p.velocity.z), comboStep: p.comboStep, attackTime: p.attackTime, dodgeKind: p.currentDodgeKind, dodgeProgress: p.dodgeProgress,
        verticalSpeed: p.velocity.y, flipProgress: p.flipProgress, armed: p.armed, stowProgress: p.stowProgress, plungeStage: p.plungeStage, ledge: p.ledge, hangTime: p.hangTime, climbProgress: p.climbProgress, kickProgress: p.kickProgress, onWall: p.onWall,
      });
    };
    for (let k = 0; k < 20; k++) { p.update(DT, { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false }, colliders); feed(); }
    mv.before?.(p);
    for (let t = 0; t < 400; t++) {
      const o = mv.press(t, p, mem);
      p.update(DT, { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o }, colliders);
      feed();
      if (mv.stop(t, p, mem)) break;
    }
    // &settle: hold the last moment until the springs come to rest (to judge a pose rather than a passing frame).
    if (location.hash.includes('settle')) for (let k = 0; k < 40; k++) feed();
    // Shown in his slot, however far the move carried him; the wall and the water come along.
    const dx = slotX - p.position.x;
    const dz = slotZ - p.position.z;
    rat.setTransform(new THREE.Vector3(slotX, p.position.y - floorY * 0, slotZ), p.facing);
    if (mv.wall) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6, 0.3), new THREE.MeshBasicMaterial({ color: 0x6a6258 }));
      wall.position.set(dx, 3, 2.25 + dz);
      scene.add(wall);
    }
    if (mv.water) {
      const sea = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 2.2), new THREE.MeshBasicMaterial({ color: 0x3a6a8a, transparent: true, opacity: 0.6 }));
      sea.position.set(slotX, 0, slotZ);
      scene.add(sea);
    }
    if (only >= 0) soloY = p.position.y;
    labels.push({ text: `${i} ${mv.name}`, x: slotX, y: slotZ - 0.9 });
  });
}
if (pick === 'hero') {
  // The hero on a ledge, played by the real controller: he jumps at a block, catches the edge, hangs, and pulls himself
  // up. Each figure is stopped at one moment of that. (#hero2: the same from the side.)
  const frames: Array<[string, 'hang' | 'climb', number]> = [['catch', 'hang', 0.05], ['hang', 'hang', 1.2], ['pull', 'climb', 0.22], ['chin up', 'climb', 0.42], ['knee up', 'climb', 0.62], ['over', 'climb', 0.82], ['up', 'climb', 1.4]];
  const DT = 1 / 60;
  const only = Number(/only=(\d+)/.exec(location.hash)?.[1] ?? -1); // &only=N shows just that one (for a side view)
  frames.forEach(([name, phase, at], i) => {
    if (only >= 0 && i !== only) return;
    const x = only >= 0 ? 0 : (i - (frames.length - 1) / 2) * 2.6;
    const block = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 1.6), new THREE.MeshBasicMaterial({ color: 0x6a6258 }));
    block.position.set(x, 1.5, 1.5);
    scene.add(block);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2, 0.06, 1.6), new THREE.MeshBasicMaterial({ color: 0x8a8274 }));
    top.position.set(x, 3, 1.5);
    scene.add(top);
    const colliders = [makeAabb(x, -0.5, 0, 40, 1, 40), makeAabb(x, 1.5, 1.5, 2, 3, 1.6)];
    const p = new PlayerController(new THREE.Vector3(x, 0, -0.6));
    const rat = new RatModel();
    scene.add(rat.root);
    const input = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
    const fwd = new THREE.Vector3(0, 0, 1);
    let jumps = 0;
    let done = false;
    let hung = 0;
    const step = (): void => {
      if (done) return;
      // (Half a push: enough to reach the wall and catch the edge, not enough to climb straight up it.)
      let inp = input({ move: jumps >= 1 ? fwd.clone().multiplyScalar(0.5) : fwd, jumpHeld: true });
      if (p.state === 'hang') {
        hung += DT;
        if (phase === 'hang' ? hung >= at : hung >= 0.4) inp = phase === 'hang' ? ((done = true), input({})) : input({ jumpPressed: true });
        else inp = input({});
      } else if (p.climbProgress >= 0) {
        inp = input({});
        if (at <= 1 && p.climbProgress >= at) done = true;
      } else if (hung > 0 && phase === 'climb') {
        // Up on top: let him settle, then stop.
        inp = input({});
        hung += DT;
        if (hung > 0.4 + at) done = true;
      } else if (p.grounded && jumps === 0) {
        inp = input({ move: fwd, jumpPressed: true, jumpHeld: true });
        jumps = 1;
      }
      if (done) return;
      p.update(DT, inp, colliders);
      rat.setTransform(p.position, p.facing);
      rat.update(DT, {
        state: p.state, planarSpeed: Math.hypot(p.velocity.x, p.velocity.z), comboStep: p.comboStep, attackTime: p.attackTime, dodgeKind: p.currentDodgeKind, dodgeProgress: p.dodgeProgress,
        verticalSpeed: p.velocity.y, flipProgress: p.flipProgress, armed: p.armed, stowProgress: p.stowProgress, plungeStage: p.plungeStage, ledge: p.ledge, hangTime: p.hangTime, climbProgress: p.climbProgress,
      });
    };
    for (let k = 0; k < 400; k++) step();
    labels.push({ text: name, x, y: -0.9 });
  });
}
if (pick === 'roach') {
  const states: Array<[ScuttlerState, number]> = [['idle', 1], ['chase', 0.3], ['windup', 0.5], ['lunge', 0.08], ['recover', 0.5], ['stagger', 0.1], ['dead', 0.6]];
  states.forEach(([st, t], i) => {
    const m = new ScuttlerModel();
    const x = (i - (states.length - 1) / 2) * 1.9;
    m.setTransform(new THREE.Vector3(x, 0, 0), spin);
    scene.add(m.root);
    let time = 0;
    ticks.push((dt) => {
      time += dt;
      m.update(dt, { state: st, stateTime: Math.min(t, time), moving: st === 'chase' });
    });
    labels.push({ text: st, x, y: 0 });
  });
}
if (pick === 'toad') {
  const states: Array<[ToadState, number, number]> = [['idle', 1, 0], ['watch', 1, 0], ['windup', 0.7, 0], ['recover', 0.1, 0], ['hop', 0.1, 0.5], ['crouch', 0.3, 0], ['pounce', 0.2, 0.9], ['dead', 0.6, 0]];
  states.forEach(([st, t, hop], i) => {
    const m = new ToadModel();
    const x = (i - (states.length - 1) / 2) * 1.9;
    m.setTransform(new THREE.Vector3(x, 0, 0), spin);
    scene.add(m.root);
    let time = 0;
    ticks.push((dt) => {
      time += dt;
      m.update(dt, { state: st, stateTime: Math.min(t, time), moving: false, hopY: hop });
    });
    labels.push({ text: st, x, y: 0 });
  });
}
if (pick === 'npcs') {
  const kinds: Array<[NpcKind, string, boolean]> = location.hash.includes('npcs2')
    ? [['mouse', 'Pip', false], ['mouse', 'Mellow Mort', false], ['mouse', 'Mort talking', true], ['bird', 'Finch', false], ['bird', 'Wren', false], ['bird', 'Wren talking', true]]
    : [['mouse', 'Pip', false], ['mouse', 'Pip talking', true], ['bird', 'Finch', false], ['bird', 'Finch talking', true], ['pigeon', 'Dave', false], ['villain', 'Grimsqueak', false], ['villain', 'Grim talking', true]];
  kinds.forEach(([kind, name, talking], i) => {
    const x = (i - (kinds.length - 1) / 2) * 2.3;
    const n = new Npc({ name, kind, x, z: 0, facing: spin, lines: ['.'] });
    scene.add(n.root);
    let beat = 0;
    ticks.push((dt) => {
      beat += dt;
      if (talking && beat > 0.16) { beat = 0; n.pulse(); }
      n.update(dt, x + Math.sin(spin) * 3, 0, Math.cos(spin) * 3, talking);
    });
    labels.push({ text: name, x, y: 0 });
  });
}

if (which === 'both' || which === 'ironback') {
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
if (which === 'both' || which === 'bat') {
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
if (pick === 'grim') {
  camera.position.set(0, 4.2, 26);
  camera.lookAt(0, 1.7, 0);
} else if (pick === 'moves') {
  camera.position.set(9, 7, 17);
  camera.lookAt(0, 0.9, -2.5);
} else if (pick === 'hero') {
  camera.position.set(-7, 4.2, -11);
  camera.lookAt(0, 2.2, 0.6);
} else if (pick === 'npcs') {
  camera.position.set(0, 3.2, 18);
  camera.lookAt(0, 1.3, 0);
} else if (which === 'other') {
  camera.position.set(0, 3, 13.5);
  camera.lookAt(0, 0.4, 0);
} else {
  camera.position.set(0, which === 'bat' ? 3 : 4.5, which === 'both' ? 22 : 15);
  camera.lookAt(0, which === 'bat' ? 1.8 : 0.6, 0);
}
// &cam=x,y,z,tx,ty,tz puts the camera somewhere else (for a close look at one model).
const camAt = /cam=([-\d.,]+)/.exec(location.hash)?.[1].split(',').map(Number);
if (camAt && camAt.length === 6) {
  camera.position.set(camAt[0], camAt[1] + soloY, camAt[2]);
  camera.lookAt(camAt[3], camAt[4] + soloY, camAt[5]);
}

// #faces: the small flat pictures of everybody (the talk box's faces, the sticker book's, and the old painting), big.
if (location.hash.includes('faces')) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;inset:0;background:#2a2f36;display:flex;flex-wrap:wrap;gap:18px;padding:18px;align-content:flex-start;z-index:5';
  document.body.appendChild(wrap);
  const who: Array<[NpcKind, string]> = [['villain', 'Lord Grimsqueak'], ['mouse', 'Pip'], ['mouse', 'Mellow Mort'], ['bird', 'Finch'], ['bird', 'Wren'], ['pigeon', 'Dave']];
  for (const [kind, name] of who) {
    const c = document.createElement('canvas');
    drawPortrait(c, kind, name);
    c.style.cssText = 'width:192px;height:192px;image-rendering:pixelated';
    wrap.appendChild(c);
  }
  for (const name of ['grimsqueak', 'knight', 'pip', 'mort', 'wren', 'finch', 'dave']) {
    const d = document.createElement('div');
    d.innerHTML = stickerIcon(name, 160);
    wrap.appendChild(d);
  }
  const tex = portraitTexture();
  const pc = document.createElement('canvas');
  pc.width = tex.image.width;
  pc.height = tex.image.height;
  const img = new ImageData(new Uint8ClampedArray(tex.image.data as Uint8Array), tex.image.width, tex.image.height);
  const g = pc.getContext('2d');
  g?.putImageData(img, 0, 0);
  pc.style.cssText = 'width:240px;height:300px;image-rendering:pixelated;transform:scaleY(-1)';
  wrap.appendChild(pc);
}

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
  const v = new THREE.Vector3(l.x, -0.3 + soloY, l.y).project(camera);
  const d = document.createElement('div');
  d.textContent = l.text;
  d.style.cssText = `position:absolute;left:${((v.x + 1) / 2) * W - 40}px;top:${((1 - v.y) / 2) * H}px;width:80px;text-align:center;font-weight:bold;color:#ffe9a0;text-shadow:0 1px 0 #000`;
  box.appendChild(d);
}
