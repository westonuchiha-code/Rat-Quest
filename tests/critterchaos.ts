// EVERY PLAYED CHARACTER UNDER RANDOM HANDS (Fable's review of player/critters, 2026-11-22). Each of the thirteen is
// given two minutes of random buttons in the Stand-in room (Test Room 19), three times over with different hands,
// among roaches. What must never happen: a part of where he is going to NaN; out through the room's walls; down
// through its floor; left standing INSIDE something solid (but for the moments a move says so: Dot reeled along her
// yarn, Digger under the floor); or stuck for good in one spot while the stick is pushed.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { makePlayable, PLAYABLE_LOOKS, type Playable } from '../src/player/critters';
import type { CritterInput } from '../src/player/critters/base';
import { Scuttler } from '../src/enemies/scuttler';
import { levelById } from '../src/levels/levels';
import { buildChamber } from '../src/world/chamber';
import { topAt } from '../src/world/collision';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const DT = 1 / 60;
const room = buildChamber(levelById('standin') as never);
const HX = 20;
const HZ = 16;
/** A small seeded dice. */
function dice(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

for (const look of PLAYABLE_LOOKS) {
  const bad: string[] = [];
  const note = (what: string, c: Playable, k: number): void => {
    if (bad.length < 3) bad.push(`${what} at ${c.position.x.toFixed(1)},${c.position.y.toFixed(1)},${c.position.z.toFixed(1)} (${c.state}, step ${k})`);
  };
  for (const seed of [1, 2, 3]) {
    const r = dice(seed * 7919 + look.length);
    const { ctl: c } = makePlayable(look, new THREE.Vector3(0, 0, 5));
    const foes = [new Scuttler({ x: 0, z: -3, arena: { x0: -19, x1: 19, z0: -15, z1: 15 } }), new Scuttler({ x: 7, z: 3, arena: { x0: -19, x1: 19, z0: -15, z1: 15 } })];
    const pad: CritterInput = { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, rollPressed: false, guardHeld: false };
    let inside = 0;
    let still = 0;
    const last = new THREE.Vector3();
    for (let k = 0; k < 60 * 120; k++) {
      // (New hands every third of a second or so.)
      if (k % 20 === 0) {
        const a = r() * Math.PI * 2;
        const push = r() < 0.15 ? 0 : 1;
        pad.move.set(Math.sin(a) * push, 0, Math.cos(a) * push);
        pad.run = r() < 0.6;
        pad.jumpHeld = r() < 0.4;
        pad.guardHeld = r() < 0.1;
      }
      pad.jumpPressed = r() < 0.03;
      pad.attackPressed = r() < 0.03;
      pad.rollPressed = r() < 0.015;
      if (pad.jumpPressed) pad.jumpHeld = true;
      c.update(DT, pad, { colliders: room.colliders, water: room.water, foes }, null);
      for (const f of foes) f.update(DT, c.position.x, c.position.y, c.position.z, false);
      const p = c.position;
      if (![p.x, p.y, p.z, c.velocity.x, c.velocity.y, c.velocity.z, c.facing].every(Number.isFinite)) {
        note('NaN', c, k);
        break;
      }
      if (Math.abs(p.x) > HX + 0.01 || Math.abs(p.z) > HZ + 0.01) note('out of the room', c, k);
      if (p.y < -0.05) note('under the floor', c, k);
      // Standing inside something solid: his middle within a box (not its top skin), for more than a moment.
      const moving = c.state === 'reel' || c.state === 'dug';
      const mid = p.y + 0.3;
      const stuckIn = !moving && room.colliders.some((b) => p.x > b.min.x + 0.05 && p.x < b.max.x - 0.05 && p.z > b.min.z + 0.05 && p.z < b.max.z - 0.05 && mid > b.min.y + 0.05 && mid < topAt(b, p.x, p.z) - 0.05);
      inside = stuckIn ? inside + 1 : 0;
      if (inside === 30) note('inside a solid for half a second', c, k);
      // Stuck: pushed for five seconds on end, on his feet, and not a hand's breadth moved.
      if (k % 300 === 0) {
        if (k > 0 && pad.move.lengthSq() > 0 && p.distanceTo(last) < 0.05 && c.state !== 'shell' && c.state !== 'dug') still++;
        last.copy(p);
      }
    }
    if (still > 6) bad.push(`stood stuck ${still} times (seed ${seed})`);
  }
  check(`${look}: two minutes of random hands, three times: never out, under, inside, or lost`, bad.length === 0, bad.join('; '));
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
