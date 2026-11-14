// Headless swimming checks: fall into the sludge, float, swim, jump out, get the weapons back.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { buildChamber } from '../src/world/chamber';
import { POOL_Y, PIT_HALF } from '../src/world/layout';
import { TUNING } from '../src/data/tuning';

const chamber = buildChamber();
const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}
function run(p: PlayerController, ticks: number, o: Partial<PlayerInput> = {}): void {
  for (let i = 0; i < ticks; i++) p.update(DT, input(o), chamber.colliders);
}

const p = new PlayerController(new THREE.Vector3(0, 3, 0));
p.water = chamber.water;
check('water exists', chamber.water.length === 1);
let splashed = false;
for (let i = 0; i < 200; i++) {
  p.update(DT, input(), chamber.colliders);
  if (p.splash) splashed = true;
}
const floatY = POOL_Y - TUNING.swim.sink;
check('landing in the water splashes and swims', splashed && p.state === 'swim', `state=${p.state}`);
check('he floats at the surface, not sinking', Math.abs(p.position.y - floatY) < 0.05, `y=${p.position.y.toFixed(2)} want ${floatY.toFixed(2)}`);
check('weapons go on his back by themselves', !p.armed);
check('no respawn happened', p.position.y > -3);

// Swimming around.
const x0 = p.position.x;
run(p, 60, { move: new THREE.Vector3(1, 0, 0) });
const dx = p.position.x - x0;
check('he swims forward at swimming speed', dx > 1.5 && dx < TUNING.swim.speed * 1.05, `moved ${dx.toFixed(2)}`);
check('still floating while moving', Math.abs(p.position.y - floatY) < 0.1 && p.state === 'swim');

// Can't fight or dodge in the water.
run(p, 3, { attackPressed: true, dodgePressed: true, guardHeld: true });
check('no attacking, dodging or guarding in water', p.state === 'swim' && !p.guarding);

// Swim to the east rim and jump out.
let left = false;
for (let i = 0; i < 600; i++) {
  const nearRim = p.position.x > PIT_HALF - 0.8;
  p.update(DT, input({ move: new THREE.Vector3(1, 0, 0), jumpPressed: nearRim && p.swimming, jumpHeld: nearRim }), chamber.colliders);
  if (p.grounded && p.position.x > PIT_HALF - 0.4 && p.position.y > -0.01) {
    left = true;
    break;
  }
}
check('he can jump out onto the rim', left, `at x=${p.position.x.toFixed(2)} y=${p.position.y.toFixed(2)}`);
run(p, 90, { move: new THREE.Vector3(1, 0, 0) });
check('weapons are drawn again on dry ground', p.armed && p.state !== 'swim', `armed=${p.armed} state=${p.state}`);

// A plunge into water does not get stuck diving.
const q = new PlayerController(new THREE.Vector3(0, 6, 0));
q.water = chamber.water;
for (let i = 0; i < 4; i++) q.update(DT, input(), chamber.colliders);
q.update(DT, input({ attackPressed: true }), chamber.colliders);
run(q, 240);
check('a plunge into water ends in swimming', q.plungeStage === 0 && q.state === 'swim', `stage=${q.plungeStage} state=${q.state}`);

// Manually stowed weapons stay stowed after swimming.
const r = new PlayerController(new THREE.Vector3(10, 0.5, 10));
r.water = chamber.water;
run(r, 20);
r.update(DT, input({ stowPressed: true }), chamber.colliders);
run(r, 50);
check('manual stow works', !r.armed);
r.position.set(0, 1, 0);
run(r, 120);
r.position.set(PIT_HALF + 1.5, 0.5, 0);
r.velocity.set(0, 0, 0);
run(r, 120);
check('manually stowed weapons stay stowed', !r.armed && r.state !== 'swim', `armed=${r.armed} state=${r.state}`);

console.log(failures === 0 ? '\nSwim checks passed.' : `\n${failures} swim check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
