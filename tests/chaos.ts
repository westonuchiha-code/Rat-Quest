// THE ROBOT RUN, IN THE SUITE (2026-11-19). The browser's chaos drive (dev/filmDrive.ts `&chaos=`) takes ten minutes
// over every room; this is the part of it that finds bugs, without a browser: in every room the real controller is
// driven by seeded random hands (a direction held for a while, running, jumping, swinging, rolling, guarding, now and
// then all at once) for 40 seconds of game time, the room's moving platforms carrying him as in the game. What is
// looked for: numbers gone bad (NaN), and being INSIDE something solid for more than a moment (a graze mid-jump is
// pushed out next frame; three frames running is being stuck in it). A fall out of the room puts him back at the start.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { buildChamber } from '../src/world/chamber';
import { LEVELS, TEST_ROOMS } from '../src/levels/levels';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { TUNING } from '../src/data/tuning';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

const DT = 1 / 60;
const SECONDS = 40;
const seeded = (seed: number): (() => number) => {
  let a = seed;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
};

const rooms = [...new Map([...TEST_ROOMS, ...LEVELS].map((l) => [l.id, l])).values()];
const stuck: string[] = [];
const broken: string[] = [];
let steps = 0;
let falls = 0;
for (const L of rooms) {
  const rnd = seeded(23 + L.id.length * 7);
  const ch = buildChamber({ solids: L.solids, pit: L.pit, water: L.water ?? [], lava: L.lava, decor: L.decor, movers: L.movers ?? [], pipes: L.pipes, gates: L.gates, fire: L.fire } as never);
  const start = new THREE.Vector3(L.spawn.x, L.spawn.y + 0.1, L.spawn.z);
  const p = new PlayerController(start.clone());
  p.water = ch.water;
  p.well = L.well ?? null;
  const lowest = Math.min(...L.solids.map((b) => b.y0)) - 30;
  const r = TUNING.rat.radius * 0.8;
  const h = TUNING.rat.height;
  let hold = 0;
  const dir = new THREE.Vector3();
  let run = false;
  let inside = 0;
  let worst = '';
  for (let f = 0; f < SECONDS / DT; f++) {
    if (hold <= 0) {
      const a = rnd() * Math.PI * 2;
      dir.set(Math.sin(a), 0, Math.cos(a)).multiplyScalar(rnd() < 0.15 ? 0 : 0.4 + rnd() * 0.6);
      run = rnd() < 0.6;
      hold = 0.3 + rnd() * 1.2;
    }
    hold -= DT;
    const wild = rnd() < 0.02;
    const input: PlayerInput = {
      move: dir.clone(),
      run,
      jumpPressed: wild || rnd() < 0.04,
      jumpHeld: rnd() < 0.7,
      attackPressed: wild || rnd() < 0.03,
      dodgePressed: wild || rnd() < 0.015,
      guardHeld: rnd() < 0.05,
    };
    ch.stepMovers(DT, p.dead ? undefined : p);
    p.update(DT, input, ch.colliders);
    ch.update(f * DT);
    steps++;
    const q = p.position;
    if (![q.x, q.y, q.z, p.velocity.x, p.velocity.y, p.velocity.z].every(Number.isFinite)) {
      broken.push(`${L.id} at ${(f * DT).toFixed(1)}s`);
      break;
    }
    // (The browser drive's own test of being inside: dev/filmDrive.ts `watch`.)
    const box = ch.colliders.find((b) => !b.ramp && q.x + r > b.min.x + 0.05 && q.x - r < b.max.x - 0.05 && q.z + r > b.min.z + 0.05 && q.z - r < b.max.z - 0.05 && q.y + h * 0.8 > b.min.y + 0.05 && q.y + 0.15 < b.max.y - 0.05);
    inside = box ? inside + 1 : 0;
    if (inside === 3 && !worst) worst = `${L.id} at ${(f * DT).toFixed(1)}s, ${q.x.toFixed(2)},${q.y.toFixed(2)},${q.z.toFixed(2)} in a box ${box!.min.x.toFixed(1)}..${box!.max.x.toFixed(1)}, ${box!.min.y.toFixed(1)}..${box!.max.y.toFixed(1)}, ${box!.min.z.toFixed(1)}..${box!.max.z.toFixed(1)}`;
    // (Nothing here can hurt him: there are no creatures. Out of the room, he is put back.)
    if (q.y < lowest) {
      falls++;
      p.position.copy(start);
      p.prevPosition.copy(start);
      p.velocity.set(0, 0, 0);
    }
  }
  if (worst) stuck.push(worst);
}
check(`in all ${rooms.length} rooms, ${SECONDS} s each of random hands: his numbers never go bad`, broken.length === 0, broken.join('; '));
check('...and he is never stuck inside anything solid (three frames running)', stuck.length === 0, stuck.join('; '));
console.log(`(${steps} steps; ${falls} times out of a room and put back)`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
