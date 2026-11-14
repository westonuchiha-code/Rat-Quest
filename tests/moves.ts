// The open-course moves, played by the real controller: long jump, wall kick, ledge grab and climb.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import type { Aabb } from '../src/world/collision';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Aabb => makeAabb((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
const floor = box(-60, -1, -60, 60, 0, 60);
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const north = new THREE.Vector3(0, 0, -1);

/** Runs north, then jumps (long or plain) and returns how far he went from take-off to landing. */
function jumpDistance(long: boolean): number {
  const p = new PlayerController(new THREE.Vector3(0, 0, 40));
  const cs = [floor];
  for (let t = 0; t < 60; t++) p.update(DT, inp({ move: north }), cs);
  if (long) for (let t = 0; t < 3; t++) p.update(DT, inp({ move: north, run: false }), cs);
  const z0 = p.position.z;
  p.update(DT, inp({ move: north, run: !long, jumpPressed: true, jumpHeld: true }), cs);
  let t = 0;
  while (!p.grounded && t++ < 400) p.update(DT, inp({ move: north, run: !long, jumpHeld: true }), cs);
  return z0 - p.position.z;
}
const plain = jumpDistance(false);
const long = jumpDistance(true);
check('a long jump goes much further than a running jump', long > plain * 1.25, `long ${long.toFixed(2)}, plain ${plain.toFixed(2)}`);

// Long jump state shows while in the air.
{
  const p = new PlayerController(new THREE.Vector3(0, 0, 40));
  for (let t = 0; t < 60; t++) p.update(DT, inp({ move: north }), [floor]);
  p.update(DT, inp({ move: north, run: false }), [floor]);
  p.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), [floor]);
  check('the long jump has its own pose and sound', p.state === 'longjump' && p.moveEvent === 'longjump');
  // Walking slowly (no run first) and jumping with sneak is just a jump.
  const q = new PlayerController(new THREE.Vector3(0, 0, 40));
  for (let t = 0; t < 60; t++) q.update(DT, inp({ move: north, run: false }), [floor]);
  q.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), [floor]);
  check('sneaking slowly and jumping is a plain jump', q.state === 'jump');
}

// Wall kick: jump at a tall wall, press jump on touching it.
{
  const wall = box(-5, 0, -2, 5, 10, 0); // its south face is at z = 0
  const cs = [floor, wall];
  const p = new PlayerController(new THREE.Vector3(0, 0, 4));
  p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), cs);
  let touched = -1;
  for (let t = 0; t < 120 && touched < 0; t++) {
    p.update(DT, inp({ move: north, jumpHeld: true }), cs);
    if (p.position.z < 0.35) touched = t;
  }
  const before = p.velocity.y;
  p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), cs);
  check('jumping on touching a wall kicks off it', p.moveEvent === 'wallkick' && p.velocity.z > 4 && p.velocity.y > before + 3, `vz ${p.velocity.z.toFixed(1)} vy ${p.velocity.y.toFixed(1)}`);
  for (let t = 0; t < 8; t++) p.update(DT, inp({ move: north, jumpHeld: true }), cs);
  check('...and he flies out from it before the stick can pull him back', p.position.z > 0.8, p.position.z.toFixed(2));
}

// Ledge grab: a block 3.2 high; jump at it from close, he catches the edge, then climbs on top.
{
  const block = box(-5, 0, -6, 5, 3.2, 0);
  const cs = [floor, block];
  const p = new PlayerController(new THREE.Vector3(0, 0, 1.2));
  p.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), cs);
  let hung = false;
  for (let t = 0; t < 120 && !hung; t++) {
    p.update(DT, inp({ move: north, run: false, jumpHeld: true }), cs);
    hung = p.state === 'hang';
  }
  check('falling past the top of a wall he faces, he catches the ledge', hung, `y ${p.position.y.toFixed(2)} state ${p.state}`);
  for (let t = 0; t < 20; t++) p.update(DT, inp({}), cs);
  check('he hangs there while nothing is pressed', p.state === 'hang' && Math.abs(p.position.y - (3.2 - 1.05)) < 0.01);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 40; t++) p.update(DT, inp({}), cs);
  check('jump climbs him up onto the top', p.grounded && Math.abs(p.position.y - 3.2) < 0.01 && p.position.z < -0.3, `y ${p.position.y.toFixed(2)} z ${p.position.z.toFixed(2)}`);
  // Letting go.
  const q = new PlayerController(new THREE.Vector3(0, 0, 1.2));
  q.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 120 && q.state !== 'hang'; t++) q.update(DT, inp({ move: north, run: false, jumpHeld: true }), cs);
  check('(he was hanging before letting go)', q.state === 'hang');
  q.update(DT, inp({ move: new THREE.Vector3(0, 0, 1) }), cs);
  for (let t = 0; t < 60; t++) q.update(DT, inp({}), cs);
  check('pulling away lets go and he drops to the floor', q.grounded && q.position.y < 0.01);
  // A ledge with no room on top (a ceiling right above it) cannot be grabbed.
  const lid = box(-5, 3.5, -6, 5, 5, -0.5);
  const r = new PlayerController(new THREE.Vector3(0, 0, 1.2));
  r.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), [floor, block, lid]);
  let any = false;
  for (let t = 0; t < 120; t++) {
    r.update(DT, inp({ move: north, run: false, jumpHeld: true }), [floor, block, lid]);
    if (r.state === 'hang') any = true;
  }
  check('no grab where there is no room to climb up', !any);
}

// On a phone the stick is rarely dead straight: holding it at an angle must still catch the ledge.
{
  const block = box(-10, 0, -6, 10, 3.2, 0);
  const cs = [floor, block];
  const missed: string[] = [];
  for (const [ang, dist] of [[30, 2], [45, 2], [60, 2], [0, 5], [45, 4]]) {
    const a = (ang * Math.PI) / 180;
    const mv = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const p = new PlayerController(new THREE.Vector3(0, 0, dist));
    p.facing = Math.atan2(mv.x, mv.z);
    let hung = false;
    let jumped = false;
    for (let t = 0; t < 200 && !hung; t++) {
      const press = !jumped && p.position.z < 1.6;
      if (press) jumped = true;
      p.update(DT, inp({ move: mv, jumpPressed: press, jumpHeld: jumped }), cs);
      if (p.state === 'hang') hung = true;
    }
    if (!hung) missed.push(`${ang} deg from ${dist}`);
  }
  check('the ledge is caught with the stick held at an angle, or on a run-up', missed.length === 0, missed.join(', '));
  // Jumping up beside a low wall he can clear: he lands on it, he does not hang off it.
  const low = box(-10, 0, -6, 10, 1.5, 0);
  const p = new PlayerController(new THREE.Vector3(0, 0, 2));
  let hung = false;
  let jumped = false;
  for (let t = 0; t < 200; t++) {
    const press = !jumped && p.position.z < 1.6;
    if (press) jumped = true;
    p.update(DT, inp({ move: north, jumpPressed: press, jumpHeld: jumped }), [floor, low]);
    if (p.state === 'hang') hung = true;
    if (jumped && t > 5 && p.grounded) break; // where he first lands
  }
  check('a ledge he can jump onto is landed on, not hung from', !hung && p.grounded && Math.abs(p.position.y - 1.5) < 0.01, `y ${p.position.y.toFixed(2)}`);
}

console.log(failures === 0 ? 'moves: all pass' : `moves: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
