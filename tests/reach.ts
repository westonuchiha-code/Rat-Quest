// The jump checker: every built-in level can be done, so it must find nothing out of reach in any of them;
// and it must catch things that really are out of reach.
import { LEVELS } from '../src/levels/levels';
import * as THREE from 'three';
import { computeReach, unreachable, jumpReach, maxClimb, maxChimney } from '../src/levels/reach';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { makeAabb, type Aabb } from '../src/world/collision';
import { TUNING } from '../src/data/tuning';
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

// Two walls near enough to kick between make a chimney he can wall-kick up; far apart they do not. "Near enough" is
// wide: about eight units (it was taken to be 4.5 until 2026-11-15, and the knight could always climb far wider).
for (const [gap, expect] of [[2.2, true], [4, true], [6, true], [7.5, true], [9, false], [12, false]] as Array<[number, boolean]>) {
  const k = emptyCustom();
  k.pieces.push(
    { t: 'pillar', x0: -6, z0: -2, x1: -4, z1: 2, top: 10 },
    { t: 'pillar', x0: -4 + gap, z0: -2, x1: -2 + gap, z1: 2, top: 10 },
    { t: 'crumb', x0: -5, z0: 0, x1: -5, z1: 0, top: 10 },
  );
  const caught = unreachable(compileCustom(k)).some((b) => b.what === 'crumb' && b.x === -5);
  check(`walls ${gap} apart ${expect ? 'can' : 'cannot'} be wall-kicked up`, caught !== expect);
}

// What the checker takes for a chimney is what the knight can climb: played with the real controller, kicking from
// wall to wall as well as a player could (the press on the best frame after each wall is touched).
{
  const DT = 1 / 60;
  const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Aabb => makeAabb((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
  const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
  /** How high he gets between two walls `gap` apart and forty high, kicking for as long as he keeps gaining. */
  const kicked = (gap: number): number => {
    const cs = [box(-60, -1, -60, 60, 0, 60), box(-4, 0, -3, 0, 40, 3), box(gap, 0, -3, gap + 4, 40, 3)];
    let best = 0;
    for (const delay of [0, 1, 2, 3, 5, 8]) {
      const p = new PlayerController(new THREE.Vector3(Math.min(1.5, gap / 2), 0, 0));
      for (let i = 0; i < 10; i++) p.update(DT, inp({}), cs);
      let dir = -1;
      let wait = -1;
      const mv = (d: number): THREE.Vector3 => new THREE.Vector3(d, 0, 0);
      p.update(DT, inp({ move: mv(dir), jumpPressed: true, jumpHeld: true }), cs);
      for (let i = 0; i < 1500; i++) {
        const before = p.velocity.x;
        const press = wait === 0;
        if (press) dir = -dir;
        p.update(DT, inp({ move: mv(dir), jumpPressed: press, jumpHeld: true }), cs);
        best = Math.max(best, p.position.y);
        if (wait > 0) wait--;
        else if (wait === 0) wait = -1;
        if (wait < 0 && !p.grounded && Math.sign(before) === dir && Math.abs(before) > 0.5 && p.velocity.x === 0) wait = delay;
        if (p.grounded && i > 40) break;
      }
    }
    return best;
  };
  const limit = maxChimney();
  check('the widest chimney the checker allows is about eight units', limit > 7.6 && limit < 8.6, limit.toFixed(2));
  const inside = kicked(limit - 1);
  const outside = kicked(limit + 0.6);
  check('a unit inside that, the real knight kicks his way up as high as the walls go', inside > 30, `${inside.toFixed(1)} up between walls ${(limit - 1).toFixed(1)} apart`);
  check('just outside it, he gets no higher than a jump, a kick and a double jump take him: there is no climb', outside < maxClimb() + 2, `${outside.toFixed(1)} up between walls ${(limit + 0.6).toFixed(1)} apart`);
  // It follows the kick's numbers: a harder push across carries him further, so a wider gap is a chimney.
  const push = TUNING.moves.wallKickPush;
  (TUNING.moves as { wallKickPush: number }).wallKickPush = push + 2;
  const wider = maxChimney();
  (TUNING.moves as { wallKickPush: number }).wallKickPush = push;
  check('for a way OUT of somewhere (the trap search) it asks more of each kick, so only a narrower gap counts: about six and a half', maxChimney(2) > 6 && maxChimney(2) < 7.2 && kicked(maxChimney(2)) > 30, `${maxChimney(2).toFixed(2)}`);
  check('...and it follows the sliders: with a harder push across, a wider gap counts as a chimney', wider > limit + 1.5 && maxChimney() === limit, `${wider.toFixed(2)} with the push at ${push + 2}`);
}

console.log(failures === 0 ? 'reach: all pass' : `reach: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
