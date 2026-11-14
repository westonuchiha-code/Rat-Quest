// The Foundry: each landmark can only be reached the way it is meant to be, and the Slag Run's widest gap can be made
// with a real double jump (with some room for timing).
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { extent } from '../src/world/layout';
import { computeReach, maxClimb } from '../src/levels/reach';
import type { LevelDef } from '../src/levels/types';
import { foundry, foundryShaft, foundryCellars, BEAMS, CRUCIBLE, RUN } from '../src/levels/foundry';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = foundry();
const reaches = (d: LevelDef, x: number, y: number, z: number): boolean => computeReach(d).near(x, y + 0.5, z, 0.9, 1, 1);
const TOP = { x: 0, y: CRUCIBLE, z: -6 };
const LADLE = { x: 26, y: RUN, z: -27.5 };
const STORE = { x: 43, y: 0, z: 12 };

check('the Foundry is in the world, with its two side areas', def.world === 'foundry' && foundryShaft().returnTo === 'foundry' && foundryCellars().returnTo === 'foundry' && LEVELS.some((l) => l.id === 'shaft') && LEVELS.some((l) => l.id === 'coalcellars'));
check('the Club\'s east door leads to the Foundry, for four wedges', HUB_DOORS.some((d) => d.to === 'foundry' && d.need === 4));
check('it has six wedges here (one a secret) and six in its side areas (one a secret)', (def.wedges?.length ?? 0) === 6 && (foundryShaft().wedges?.length ?? 0) + (foundryCellars().wedges?.length ?? 0) === 6);
check('the top of the Crucible, the Ladle and the storehouse can all be reached', reaches(def, TOP.x, TOP.y, TOP.z) && reaches(def, LADLE.x, LADLE.y, LADLE.z) && reaches(def, STORE.x, STORE.y, STORE.z));

// Without the pistons the Crucible cannot be climbed; without the last one, the top shelf is a dead end.
const pistons = (def.movers ?? []).filter((m) => Math.abs(m.x) < 10 && m.z < 3 && m.z > -15);
check('the Crucible has three pistons', pistons.length === 3, `${pistons.length}`);
const last = pistons.reduce((a, b) => (a.to[1] > b.to[1] ? a : b));
check('without the pistons the Crucible cannot be climbed', !reaches({ ...def, movers: (def.movers ?? []).filter((m) => !pistons.includes(m)) }, TOP.x, TOP.y, TOP.z));
check('without the last piston the top is out of reach from the top shelf', !reaches({ ...def, movers: (def.movers ?? []).filter((m) => m !== last) }, TOP.x, TOP.y, TOP.z));

// Without the beams the Ladle cannot be reached: it is too tall to climb from the bank.
const isBeam = (b: { x0: number; x1: number; y1: number }): boolean => BEAMS.some((m) => m.x0 === b.x0 && m.x1 === b.x1) && Math.abs(b.y1 - RUN) < 0.01;
check('without the beams the Ladle is out of reach', !reaches({ ...def, solids: def.solids.filter((b) => !isBeam(b)) }, LADLE.x, LADLE.y, LADLE.z));

// With the gate shut, the storehouse (and the door to the cellars) is out of reach.
const gate = def.gates?.[0];
check('the storehouse gate opens on the pipes', !!gate && (gate.pipes?.length ?? 0) === 3);
// (The jump checker lets jumps pass over walls, so this is checked as heights: the walls and the roof over them are taller
// than his best climb, and the roof itself can't be reached.)
const store = def.solids.filter((b) => b.x0 >= 38 && b.x1 <= 48 && b.z0 >= 4 && b.z1 <= 16 && !b.hidden);
const roof = store.find((b) => b.x1 - b.x0 > 5 && b.z1 - b.z0 > 5);
check('the storehouse has a roof too high to climb onto', !!roof && roof.y0 > maxClimb() && !reaches(def, 43, roof.y1, 6));
check('its walls rise to the roof, leaving only the gate', store.filter((b) => b.kind === 'wall').every((b) => b.y1 >= (roof?.y0 ?? 99) - 0.01));

// The widest gap on the Slag Run, played with the real controller: run off one beam, double jump, land on the next.
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
function hop(from: number, to: number, second: number): boolean {
  const a = BEAMS[from];
  const b = BEAMS[to];
  const p = new PlayerController(new THREE.Vector3(a.x0 + 0.5, RUN, -27.5));
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  const east = new THREE.Vector3(1, 0, 0);
  let jumped = -1;
  for (let t = 0; t < 300; t++) {
    const go = jumped < 0 && p.position.x > a.x1 - 0.35;
    if (go) jumped = t;
    const again = jumped >= 0 && t === jumped + second;
    p.update(DT, inp({ move: east, jumpPressed: go || again, jumpHeld: true }), cs);
    if (jumped >= 0 && t > jumped + 5 && p.grounded) return Math.abs(p.position.y - RUN) < 0.05 && p.position.x > b.x0;
    if (p.position.y < RUN - 3) return false;
  }
  return false;
}
const widest = BEAMS.length - 2;
const ok = [];
for (let k = 4; k <= 40; k++) if (hop(widest, widest + 1, k)) ok.push(k);
check('the widest gap (9) can be crossed with a double jump', ok.length > 0);
check('...with some room in when the second jump is pressed', ok.length >= 6, `works pressing it ${ok[0]}-${ok[ok.length - 1]} frames after the first`);

console.log(failures === 0 ? 'foundry: all pass' : `foundry: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
