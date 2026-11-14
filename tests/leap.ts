// The parkour level, played by the real controller: a running jump can cross every gap, but only with good timing.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { ALL_LEVELS as LEVELS } from '../src/levels/levels';
import { makeAabb } from '../src/world/collision';

const DT = 1 / 60;
const leap = LEVELS.find((l) => l.id === 'leap')!;
const colliders = leap.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const plats = leap.solids.filter((b) => b.kind === 'platform').sort((a, b) => b.z0 - a.z0); // start pad first, goal pad last

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

/** Runs along -z from the back of platform `from`, jumping when his feet reach `jumpZ` of the edge. Returns true if he lands on the next one. */
function tryJump(from: number, early: number): boolean {
  const a = plats[from];
  const b = plats[from + 1];
  const bx = (b.x0 + b.x1) / 2;
  const p = new PlayerController(new THREE.Vector3((a.x0 + a.x1) / 2, 0, a.z1 - 0.4));
  p.allowGrab = !leap.noGrab;
  p.allowLongJump = !leap.noLongJump;
  let jumped = false;
  let t = 0;
  for (; t < 240; t++) {
    const dx = bx - p.position.x;
    const move = new THREE.Vector3(Math.max(-1, Math.min(1, dx)) * 0.4, 0, -1).normalize();
    const atEdge = p.position.z <= a.z0 + early;
    const press = !jumped && atEdge;
    if (press) jumped = true;
    const input: PlayerInput = { move, run: true, jumpPressed: press, jumpHeld: jumped && t < 200 && !p.grounded ? true : press, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false };
    p.update(DT, input, colliders);
    if (jumped && p.grounded && p.position.y > -0.1) {
      const onB = p.position.x > b.x0 && p.position.x < b.x1 && p.position.z > b.z0 && p.position.z < b.z1;
      const onA = p.position.x > a.x0 && p.position.x < a.x1 && p.position.z > a.z0 && p.position.z < a.z1;
      if (onB) return true;
      if (!onA) return false;
    }
    if (p.position.y < -3) return false;
  }
  return false;
}

for (const from of [0, 1, 3]) {
  const wins: number[] = [];
  for (let early = -0.3; early <= 0.8; early += 0.05) if (tryJump(from, early)) wins.push(Math.round(early * 100) / 100);
  check(`gap ${from + 1}: some jump timing crosses it`, wins.length > 0, `works with the jump this far past the edge: ${wins.join(', ')}`);
  check(`gap ${from + 1}: it is not forgiving (a good chunk of timings fail)`, wins.length <= 10, `${wins.length} of 23 timings work`);
}

console.log(failures === 0 ? '\nLeap checks passed.' : `\n${failures} leap check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
