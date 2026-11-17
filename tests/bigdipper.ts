// THE BIG DIPPER: the dream's long ride (src/levels/bigdipper.ts), and LIGHT RAILS, rails that curve (src/world/rails.ts).
// The owner, 2026-11-17: "a huge sort of like rainbow road-esque ramp level ... I want to be sliding down for like a
// straight 2 minutes ... lots of like jumps and you can add some rails too but obviously wacky Pomo style so you'll
// have to make a new version of a rail. You can make it curved ... areas where you have to like stop sliding and fight
// some monsters and then there'll be another area where you jump off and have to slide down some more."
// Holds: that all four rides can be RIDDEN, with the real controller, by a rider who does what a player would (and how
// long that is: two minutes and more); that every rail crossing is crossed by GRINDING a light rail, which curves and
// is not solid; that a kicker's gap wants the kicker or the jump; that each pad's gate waits for that pad's creatures;
// that the bottle caps are where a good line takes him; and how he gets to it.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../src/player/controller';
import { aabbOf, topAt, type Aabb } from '../src/world/collision';
import { bigDipper, dipperPlan, makeDipRide, COURSE, DIP, DIP_FALL, PAD } from '../src/levels/bigdipper';
import { railAt, railCurve, findRail, RAIL_REACH } from '../src/world/rails';
import { garden } from '../src/levels/garden';
import { TEST_ROOMS, levelById } from '../src/levels/levels';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const def = bigDipper();
const P = dipperPlan();
const cs: Aabb[] = def.solids.map((b) => aabbOf(b));
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const ground = (x: number, z: number): number => Math.max(-Infinity, ...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));

check('it is a room to try, with a door in the Move Garden, and its way out leads back there', TEST_ROOMS.some((l) => l.id === 'bigdipper') && levelById('bigdipper') !== undefined && !!garden().courseDoors?.some((d) => d.to === 'bigdipper') && def.returnTo === 'garden');
check('it is the dream: its look, its sky, its stars, and the long fall he is put back from', def.look === 'dream' && def.sky === 'space' && def.motes === 'stars' && def.fallDepth === DIP_FALL);

// ---- The rides, ridden ----
const starts = [def.spawn, ...P.pads.map((q) => q.start)];
const capsHad = new Set<string>();
const railsRidden = new Set<number>();
let riding = 0;
const told: string[] = [];
let allArrived = true;
starts.forEach((st, ride) => {
  const p = new PlayerController(new THREE.Vector3(st.x, st.y + 0.01, st.z));
  p.rails = P.rails;
  const auto = makeDipRide();
  const endZ = ride < P.pads.length ? P.pads[ride].z0 : P.bowl.z0;
  let f = 0;
  let rode = 0;
  let ground0 = 0;
  let arrived = false;
  for (; f < 60 * 90; f++) {
    const a = auto(p);
    p.update(DT, inp({ move: new THREE.Vector3(a.x, 0, a.z), jumpPressed: a.jumpPressed, jumpHeld: a.jumpHeld, attackPressed: a.attackPressed, stowPressed: a.stowPressed, dodgePressed: a.dodgePressed }), cs);
    if (p.riding) rode++;
    if (p.grinding) {
      // (Which rail: the one he is on is the one nearest him.)
      const at = findRail(P.rails, p.position.x, p.position.y, p.position.z, p.velocity.x, p.velocity.z, { up: 0.5, down: 0.5, minSpeed: 0 });
      if (at) railsRidden.add(P.rails.indexOf(at.rail));
    }
    for (const c of def.collectibles) if (Math.hypot(c.x - p.position.x, c.y - (p.position.y + TUNING.rat.height / 2), c.z - p.position.z) < 1.2) capsHad.add(c.id);
    if (p.grounded && !p.grinding) ground0 = p.position.y;
    // (Fallen: well below where he last had ground under him, and not on a rail.)
    if (!p.grinding && p.position.y < ground0 - 45) break;
    if (p.position.z > endZ && p.grounded && !p.riding) { arrived = true; break; }
  }
  allArrived &&= arrived;
  riding += rode;
  told.push(`${ride + 1}: ${(rode / 60).toFixed(1)}s${arrived ? '' : ' FELL at z ' + p.position.z.toFixed(0)}`);
});
check('all four rides can be ridden end to end: off each lip onto the shield, over every gap, along a rail at every crossing, to a stop on the floor beyond', allArrived, told.join(', '));
check('"sliding down for like a straight 2 minutes": on his shield for two minutes and more in all, and each ride half a minute or so', riding / 60 >= 120 && told.length === 4, `${(riding / 60).toFixed(1)}s`);

// ---- The rails ----
const crossings = COURSE.filter((p) => p.t === 'rail');
check('there are six rail crossings, of all three kinds (one that snakes, three that plait, one that goes right round)', crossings.length === 6 && ['ess', 'braid', 'twist'].every((s) => crossings.some((c) => c.t === 'rail' && c.shape === s)), `${P.rails.length} rails`);
check('the rider crossed every one of them by GRINDING a light rail', railsRidden.size >= crossings.length, `${railsRidden.size} rails ridden`);
{
  const curved = P.rails.map((c) => {
    // How far it turns in all, across the ground.
    let turned = 0;
    let last = Math.atan2(railAt(c, 0).tx, railAt(c, 0).tz);
    for (let s = 1; s <= c.len; s += 1) {
      const q = railAt(c, s);
      const a = Math.atan2(q.tx, q.tz);
      turned += Math.abs(Math.atan2(Math.sin(a - last), Math.cos(a - last)));
      last = a;
    }
    return turned;
  });
  check('every light rail CURVES (it turns a sixth of a turn at the least, in all), and a twist goes right round and more', curved.every((t) => t > Math.PI / 3) && curved.some((t) => t > Math.PI * 2), curved.map((t) => (t / Math.PI).toFixed(1)).join(' ') + ' half turns');
  const downhill = P.rails.every((c) => railAt(c, c.len).y < railAt(c, 0).y - 5);
  check('each runs downhill from the road he leaves to over the next', downhill);
  const starts2 = P.rails.every((c) => Math.abs(ground(c.x[0], c.z[0]) - c.y[0]) < 0.4);
  const ends = P.rails.every((c) => { const g = ground(c.x[c.x.length - 1], c.z[c.z.length - 1]); return c.y[c.y.length - 1] - g > 0.1 && c.y[c.y.length - 1] - g < 1.5; });
  check('each begins on the road, where a rider can take it without a jump, and ends just over the next road', starts2 && ends);
  const solidAt = P.rails.some((c) => { const q = railAt(c, c.len / 2); return ground(q.x, q.z) > q.y - 3; });
  check('a light rail is NOT SOLID: nothing is under the middle of any of them (he passes through it unless he grinds it)', !solidAt);
  const two = P.rails.every((c, i) => P.rails.every((d, j) => j <= i || [0.3, 0.5, 0.7].every((t) => { const a = railAt(c, c.len * t); const b = railAt(d, d.len * t); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) > 0.6; })));
  check('no two rails are in the same place where they cross (a plait\'s three pass over and under each other)', two);
}
{
  // The grind button near a rail, by a rider going along it, puts him on it; and it carries him round a curve.
  const c = railCurve({ pts: [[0, 10, 0], [0, 9, 6], [6, 7, 12], [6, 5, 20]] });
  const p = new PlayerController(new THREE.Vector3(1, 10.2, 0.5));
  p.rails = [c];
  p.velocity.set(0, 0, 9);
  p.update(DT, inp({ attackPressed: false, stowPressed: true }), []);
  const on = p.grinding;
  let maxOff = 0;
  let f = 0;
  for (; f < 400 && p.grinding; f++) {
    p.update(DT, inp({}), []);
    const at = findRail([c], p.position.x, p.position.y, p.position.z, p.velocity.x, p.velocity.z, { up: 9, down: 9, minSpeed: 0 });
    if (at && p.grinding) maxOff = Math.max(maxOff, Math.hypot(p.position.x - railAt(c, at.s).x, p.position.z - railAt(c, at.s).z), Math.abs(p.position.y - railAt(c, at.s).y));
  }
  check('in the air beside a light rail and going along it, the grind button puts him on it (from further off than a solid rail: it is light)', on && RAIL_REACH > TUNING.grind.reach);
  check('...and it carries him along its curve to its end, never off the line, and he flies off the end going the way it went', maxOff < 0.05 && !p.grinding && p.position.x > 5 && p.velocity.z > 5 && Math.abs(p.velocity.x) < 2, `off by ${maxOff.toFixed(3)}, left at x ${p.position.x.toFixed(1)}`);
  const q = new PlayerController(new THREE.Vector3(1, 10.2, 0.5));
  q.rails = [c];
  q.velocity.set(9, 0, 0);
  q.update(DT, inp({ stowPressed: true }), []);
  check('...but not one who is going ACROSS it', !q.grinding);
}

// ---- Jumps ----
const gaps = COURSE.filter((p) => p.t === 'gap');
check('there are a dozen gaps to jump and more, and the wide ones each follow a kicker', gaps.length >= 12 && COURSE.every((p, i) => !(p.t === 'gap' && p.wide >= 10) || (COURSE[i - 1].t === 'road' && !!(COURSE[i - 1] as { kick?: boolean }).kick)), `${gaps.length} gaps`);
check('no jump drops him further than the fall he is put back from', gaps.every((g) => g.t === 'gap' && g.wide * DIP.slope + g.under < DIP_FALL - 8));

// ---- The pads ----
check('three places to stop and fight, each between two rides', P.pads.length === 3 && def.enemies.length >= 8);
check('each pad\'s creatures stand on its floor and keep to it (none is sent to hunt: a hunter may go no further than five hundred from the level\'s middle)', P.pads.every((q) => q.foes.every((i) => { const e = def.enemies[i]; return !e.hunt && e.y === q.y && e.z > q.z0 && e.z < q.z1 && !!e.arena && e.arena.z0 >= q.z0 && e.arena.z1 <= q.z1 && Math.abs(ground(e.x, e.z) - q.y) < 0.01; })));
check('a creature beaten on a pad stays beaten (a roach comes back after five seconds unless it is told not to, and its gate would never open)', def.enemies.every((e) => e.respawn === false));
check('each pad has a gate in its far side that waits for THAT pad\'s creatures, and for no others', P.pads.every((q) => { const g = def.gates![q.gate]; return !!g.foes && g.foes.join() === q.foes.join() && Math.abs(g.z - (q.z1 + 0.5)) < 0.01 && g.width === PAD.gate; }) && new Set(P.pads.flatMap((q) => q.foes)).size === def.enemies.length);
check('a kerb stands round each pad but for where he comes in and the gate: off the floor on any other side is a wall, not a fall', P.pads.every((q) => [[q.x - PAD.half - 0.5, (q.z0 + q.z1) / 2], [q.x + PAD.half + 0.5, (q.z0 + q.z1) / 2], [q.x - 8, q.z1 + 0.5], [q.x + 8, q.z1 + 0.5]].every(([x, z]) => ground(x, z) >= q.y + PAD.kerb - 0.01)));
check('beyond each gate is a level lip, and the next ride falls away from it', P.pads.every((q) => Math.abs(ground(q.start.x, q.start.z) - q.y) < 0.01 && ground(q.start.x, q.z1 + 1 + PAD.lip + 4) < q.y - 1));

// ---- Bottle caps ----
check('a dozen bottle caps, and the rider\'s line (the kickers, the jumps, the rails) takes him through most of them', def.collectibles.length === 12 && capsHad.size >= 8, `${capsHad.size} of ${def.collectibles.length}: missed ${def.collectibles.filter((c) => !capsHad.has(c.id)).map((c) => c.id).join(' ')}`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
