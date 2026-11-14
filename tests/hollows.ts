// The Hollows: each landmark is reached the way it is meant to be, the long jump off the Lip lands on Spider Rock (and
// it is a real leap), and a fall into the chasm costs a heart instead of the walk back from the start.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import { computeReach } from '../src/levels/reach';
import type { LevelDef } from '../src/levels/types';
import { hollows, hollowsWebs, hollowsFaith, CAPS, HIGH, LIP, ROCK, ROCK_BOX, STONES } from '../src/levels/hollows';
import { LEVELS } from '../src/levels/levels';
import { HUB_DOORS } from '../src/levels/junction';
import { TRACK_NAMES } from '../src/audio/music';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = hollows();
const reaches = (d: LevelDef, x: number, y: number, z: number): boolean => computeReach(d).near(x, y + 0.5, z, 0.9, 1, 1);
const sameBox = (b: { x0: number; x1: number; z0: number; z1: number }, s: { x0: number; x1: number; z0: number; z1: number }): boolean => b.x0 === s.x0 && b.x1 === s.x1 && b.z0 === s.z0 && b.z1 === s.z1;

check('the Hollows is in the world, with its two side areas', def.world === 'hollows' && hollowsWebs().returnTo === 'hollows' && hollowsFaith().returnTo === 'hollows' && ['webs', 'faith'].every((id) => LEVELS.some((l) => l.id === id)));
check('the Club\'s north door leads to the Hollows, for ten wedges', HUB_DOORS.some((d) => d.to === 'hollows' && d.need === 10));
check('falls in the Hollows cost a heart and put him back (not back at the start)', def.fallBack === true);
check('the Hollows has its own music', def.music === 'echo' && TRACK_NAMES.includes('echo'));
check('Leap of Faith keeps its rules: no grabbing, no long jump', hollowsFaith().noGrab === true && hollowsFaith().noLongJump === true);

// Spider Rock: by the long jump off the Lip, or the slider and a jump. Neither alone is taken away by the other.
const slider = (def.movers ?? []).filter((m) => m.x > 20);
const noSlider = { ...def, movers: (def.movers ?? []).filter((m) => !slider.includes(m)) };
check('there is one slider out to Spider Rock', slider.length === 1);
check('Spider Rock can be reached', reaches(def, 0, ROCK, 3));
check('...by the long jump alone (no slider)', reaches(noSlider, 0, ROCK, 3));
check('...by the slider alone (no long jump in the checker)', reaches({ ...def, noLongJump: true }, 0, ROCK, 3));
check('without a long leap or the slider it cannot be reached', !reaches({ ...noSlider, noLongJump: true }, 0, ROCK, 3));

// The Faith Stones: the middle one is only reached along the stones (or by dropping off the rock).
const mid = STONES[3];
const stonesOff = { ...def, solids: def.solids.filter((b) => !STONES.some((s) => s !== mid && sameBox(b, s)) && !sameBox(b, ROCK_BOX)) };
check('the middle Faith Stone cannot be reached without the stones either side', !reaches(stonesOff, -10, 0, -5));

// The High Hollow: only up the mushrooms.
const capsOff = { ...def, solids: def.solids.filter((b) => !CAPS.slice(1).some((c) => b.x0 >= c.x - 2 && b.x1 <= c.x + 2 && b.z0 >= c.z - 2 && b.z1 <= c.z + 2)) }; // caps and stalks
check('the High Hollow is only reached up the mushrooms', reaches(def, -1, HIGH, -46) && !reaches(capsOff, -1, HIGH, -46));

// Played with the real controller off the end of the Lip.
const cs = def.solids.map((b) => makeAabb((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2, b.x1 - b.x0, b.y1 - b.y0, b.z1 - b.z0));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const north = new THREE.Vector3(0, 0, -1);
/** Runs north along the Lip and leaves it at `edge` (how far before the end), long or plain (plain: a second jump at `second`). */
function offTheLip(long: boolean, edge: number, second = -1): number | null {
  const p = new PlayerController(new THREE.Vector3(0, 16, 34));
  for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs);
  let t = 0;
  while (p.position.z > LIP.z0 + edge && t++ < 400) p.update(DT, inp({ move: north }), cs);
  if (long) for (let k = 0; k < 3; k++) p.update(DT, inp({ move: north, run: false }), cs);
  p.update(DT, inp({ move: north, run: !long, jumpPressed: true, jumpHeld: true }), cs);
  for (let k = 0; k < 400; k++) {
    p.update(DT, inp({ move: north, run: !long, jumpPressed: k === second, jumpHeld: true }), cs);
    if (p.grounded) return p.position.y;
    if (p.position.y < -3) return null;
  }
  return null;
}
const longs = [0.4, 0.8, 1.2, 1.6, 2.0].filter((e) => {
  const y = offTheLip(true, e);
  return y !== null && Math.abs(y - ROCK) < 0.05;
});
check('a long jump off the end of the Lip lands on Spider Rock', longs.length > 0);
check('...from a little way back from the edge too (not pixel-perfect)', longs.length >= 3, `works leaving ${longs.join(', ')} before the end`);
check('it is a real leap: 13 or more out and 6 down', LIP.z0 - ROCK_BOX.z1 >= 13 && 16 - ROCK === 6);

console.log(failures === 0 ? 'hollows: all pass' : `hollows: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
