// The Great Cistern, played by the real controller where it matters: the chimney can be wall-kicked up, and the top reached.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { cistern, CHIMNEY_FLOOR, PERCH, SUMMIT } from '../src/levels/cistern';


const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = cistern();
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);

/** Kicks back and forth up the chimney, pressing jump a few frames after each wall is touched. Returns the highest he gets
 * while still inside the chimney (steering out onto the perch or the tower is up to the player). */
function climb(delayFrames: number): number {
  const p = new PlayerController(new THREE.Vector3(0, CHIMNEY_FLOOR, -4.1));
  for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
  let dir = -1; // north first
  let wait = -1;
  let top = 0;
  p.update(DT, inp({ move: new THREE.Vector3(0, 0, dir), jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 400; t++) {
    const before = p.velocity.z;
    const press = wait === 0;
    if (press) dir = -dir;
    p.update(DT, inp({ move: new THREE.Vector3(0, 0, dir), jumpPressed: press, jumpHeld: true }), cs);
    if (wait > 0) wait--;
    else if (wait === 0) wait = -1;
    if (wait < 0 && !p.grounded && Math.sign(before) === dir && p.velocity.z === 0) wait = delayFrames;
    if (p.position.z > -5.2 && p.position.z < -3) top = Math.max(top, p.position.y);
  }
  return top;
}
const quick = climb(2);
check('kicking up the chimney lifts him above the perch', quick > PERCH + 1, `highest ${quick.toFixed(2)}`);
const late = climb(8);
check('pressing a little late still works (forgiving enough for a phone)', late > PERCH + 1, `highest ${late.toFixed(2)}`);
// Without kicks: a jump and a double jump from the chimney floor do not get him out of it.
{
  const p = new PlayerController(new THREE.Vector3(0, CHIMNEY_FLOOR, -4.1));
  for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  let top = 0;
  for (let t = 0; t < 200; t++) {
    p.update(DT, inp({ jumpPressed: t === 28, jumpHeld: true }), cs);
    top = Math.max(top, p.position.y);
  }
  check('without wall kicks the chimney cannot be climbed', top < PERCH - 1, `top ${top.toFixed(2)}`);
}

// From the perch, the tower top is a jump and a grab or a double jump away.
{
  const p = new PlayerController(new THREE.Vector3(0, PERCH, -6.2));
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  const south = new THREE.Vector3(0, 0, 1);
  p.update(DT, inp({ move: south, jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 200; t++) {
    const second = t === 20;
    p.update(DT, inp({ move: south, jumpPressed: second, jumpHeld: true }), cs);
    if (p.state === 'hang') p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    if (p.grounded && p.position.y > PERCH + 0.5) break;
  }
  for (let t = 0; t < 40; t++) p.update(DT, inp({}), cs);
  check('from the perch he gets onto the top of the tower', p.grounded && Math.abs(p.position.y - SUMMIT) < 0.05, `y ${p.position.y.toFixed(2)}`);
}

console.log(failures === 0 ? 'cistern: all pass' : `cistern: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
