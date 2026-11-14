// The jump checker: every built-in level can be done, so it must find nothing out of reach in any of them;
// and it must catch things that really are out of reach.
import { LEVELS } from '../src/levels/levels';
import { computeReach, unreachable, jumpReach, maxClimb } from '../src/levels/reach';
import { compileCustom, emptyCustom } from '../src/levels/custom';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

check('a flat jump with the double jump carries about 9 to 10 units', jumpReach(0) > 8 && jumpReach(0) < 11, jumpReach(0).toFixed(2));
check('higher landings are shorter jumps', jumpReach(2) < jumpReach(0) && jumpReach(0) < jumpReach(-3));
check('he can get up about 5.8 with the double jump and a ledge grab', maxClimb() > 5.2 && maxClimb() < 6.4, maxClimb().toFixed(2));

for (const L of LEVELS) {
  const t0 = Date.now();
  const map = computeReach(L);
  const bad = unreachable(L, map);
  check(`${L.id}: everything can be reached`, bad.length === 0, bad.slice(0, 4).map((b) => `${b.what} at ${b.x.toFixed(1)},${b.y.toFixed(1)},${b.z.toFixed(1)}`).join('; ') + `  ${Date.now() - t0}ms`);
}

// A crumb on a pillar far too tall, a cap across a gap too wide, and a wedge up high: all caught.
const c = emptyCustom();
c.pieces.push(
  { t: 'pillar', x0: 8, z0: -10, x1: 10, z1: -8, top: 8 },
  { t: 'crumb', x0: 9, z0: -9, x1: 9, z1: -9, top: 8 },
  { t: 'stone', x0: -3, z0: -3, x1: -1, z1: -1, top: 4 },
  { t: 'crumb', x0: -2, z0: -2, x1: -2, z1: -2, top: 4 },
  { t: 'crumb', x0: 2, z0: 8, x1: 2, z1: 8, top: 0 },
);
const bad = unreachable(compileCustom(c));
check('a crumb on a pillar too tall is caught', bad.some((b) => b.what === 'crumb' && b.x === 9));
check('a crumb on a stone he can climb is fine', !bad.some((b) => b.x === -2));
check('a crumb on the floor is fine', !bad.some((b) => b.x === 2));

// Two walls close together make a chimney he can wall-kick up; far apart they do not.
for (const [gap, expect] of [[2.2, true], [8, false]] as Array<[number, boolean]>) {
  const k = emptyCustom();
  k.pieces.push(
    { t: 'pillar', x0: -6, z0: -2, x1: -4, z1: 2, top: 10 },
    { t: 'pillar', x0: -4 + gap, z0: -2, x1: -2 + gap, z1: 2, top: 10 },
    { t: 'crumb', x0: -5, z0: 0, x1: -5, z1: 0, top: 10 },
  );
  const caught = unreachable(compileCustom(k)).some((b) => b.what === 'crumb' && b.x === -5);
  check(`walls ${gap} apart ${expect ? 'can' : 'cannot'} be wall-kicked up`, caught !== expect);
}

console.log(failures === 0 ? 'reach: all pass' : `reach: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
