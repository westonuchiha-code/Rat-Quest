// CREATURES ON SLOPES (the owner's list, 2026-11-16: "enemies walking on ramps").
// Until now a ramp was its whole box to every creature: a block in its way. This plays real creatures on the Move
// Garden's three real ramps (one up in four, in two, in one) and holds: a slope is ground to them; their feet follow
// it up and down; they do not walk into it from the side or step off it into the air; they can still reach him when
// he is further up the same slope; and they go back to the height they were made at when they come back.
import { aabbOf, topAt, type Aabb } from '../src/world/collision';
import { TEST_ROOMS } from '../src/levels/levels';
import { RAMPS, RAMP_LANDING, RAMP_FOES, RAMP_PATCH } from '../src/levels/garden';
import { FOOT_STEP, floorUnder, slopeUnder, standsOn } from '../src/enemies/footing';
import { keepOnFloor, sameGround, type Foe } from '../src/enemies/foe';
import { Scuttler } from '../src/enemies/scuttler';
import { Guard } from '../src/enemies/guard';
import { Ironback } from '../src/enemies/ironback';
import { Stag } from '../src/enemies/stag';
import { Mantis } from '../src/enemies/mantis';
import { Ant } from '../src/enemies/ant';
import { Scorpion } from '../src/enemies/scorpion';
import { Toad } from '../src/enemies/toad';

const DT = 1 / 60;
// (Creatures roll dice: which way to circle, when to lunge. The dice here are fixed, so that this plays the same every
// time. With other dice a roach sometimes circles off the foot of a slope and ends up on the floor BESIDE it, and
// stays there: creatures go straight at him and have no way-finding, as with any wall. That is known and is not
// what this holds.)
let dice = 1;
const reseed = (n: number): void => {
  dice = n * 7919;
};
Math.random = (): number => (dice = (dice * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const garden = TEST_ROOMS.find((l) => l.id === 'garden')!;
const cs: Aabb[] = garden.solids.map((b) => aabbOf(b));
const stand = (x: number, y: number, z: number, r: number): boolean => standsOn(cs, x, y, z, r);
const floor = (x: number, y: number, z: number, r?: number): number | null => floorUnder(cs, x, y, z, r);
const L = RAMP_LANDING;
/** The three ramps: the middle of each, the z of its foot, and how steep it is. */
const ramps = RAMPS.map((r) => ({ x: (r.x0 + r.x1) / 2, x0: r.x0, x1: r.x1, foot: L.z1 + r.length, slope: L.top / r.length }));
/** The height of ramp `i`'s surface at z. */
const on = (i: number, z: number): number => Math.max(0, Math.min(L.top, ((ramps[i].foot - z) / (ramps[i].foot - L.z1)) * L.top));
type Walker = Foe & { update(dt: number, px: number, py: number, pz: number, alive: boolean): void; canStand: unknown; floorUnder: unknown };
const give = <T extends object>(e: T): T => {
  (e as unknown as { canStand: unknown }).canStand = stand;
  (e as unknown as { floorUnder: unknown }).floorUnder = floor;
  return e;
};

// ---------------------------------------------------------------- the ground itself
{
  const [gentle, hill, steep] = ramps;
  check('a slope is GROUND: a creature can stand at its foot, half way up it and at its top, with its feet on the slope', [gentle, hill, steep].every((r, i) => [r.foot - 0.3, (r.foot + L.z1) / 2, L.z1 + 0.3].every((z) => stand(r.x, on(i, z), z, 0.4))));
  check('...on all three, the steepest too: one up for one along, as steep as the knight can walk', Math.abs(steep.slope - 1) < 1e-9 && stand(steep.x, on(2, L.z1 + 1.5), L.z1 + 1.5, 0.45));
  check('...and it is solid UNDER its surface: a creature at floor height cannot be half way along one (it would be inside it)', !stand(hill.x, 0, (hill.foot + L.z1) / 2, 0.4) && !stand(gentle.x, 0, L.z1 + 2, 0.4));
  check('from the SIDE it is a wall where it is higher than a step: a creature on the floor beside the gentle slope, where the slope is a unit and a half up, cannot stand against it', !stand(gentle.x0 - 0.2, 0, (gentle.foot + L.z1) / 2, 0.4) && stand(gentle.x0 - 0.6, 0, (gentle.foot + L.z1) / 2, 0.4));
  check('...and where it is lower than a step (by its foot) it is only a kerb', stand(gentle.x0 - 0.2, 0, gentle.foot - 0.4, 0.4));
  const mid = (hill.foot + L.z1) / 2;
  check('the floor under a creature on a slope is the slope there; at the top it is the landing; on the floor before it, the floor', Math.abs(floor(hill.x, on(1, mid), mid)! - on(1, mid)) < 1e-9 && floor(hill.x, L.top, L.z1 - 1) === L.top && floor(hill.x, 0, hill.foot + 1) === 0);
  check('...and there is none where its feet would be in the air or in the stone: beside the slope at the slope\'s height, or under the landing', floor(gentle.x0 - 1, 1.5, mid) === null && floor(hill.x, 1.2, L.z1 - 1) === null);
  const [sx, sz] = slopeUnder(cs, hill.x, on(1, mid), mid);
  check('how steep the ground is under it: the hill climbs north (toward -z) one up in two, and level ground is level', sx === 0 && Math.abs(sz + 0.5) < 1e-9 && slopeUnder(cs, hill.x, 0, hill.foot + 1).join() === '0,0' && slopeUnder(cs, hill.x, L.top, L.z1 - 1).join() === '0,0');
  check('a creature just short of the top of the steepest slope, its front edge already over the landing, is not stopped by the landing (the landing is that much higher than its feet only because it is on a slope)', stand(steep.x, on(2, L.z1 + 0.3), L.z1 + 0.3, 0.45));
}

// ---------------------------------------------------------------- keepOnFloor carries its feet
{
  const e = give({ x: ramps[1].x, y: 0, z: ramps[1].foot + 0.5, radius: 0.4 });
  let worst = 0;
  let inside = 0;
  for (let i = 0; i < 400; i++) {
    const fz = e.z;
    e.z -= 0.03;
    keepOnFloor(e, e.x, fz);
    worst = Math.max(worst, Math.abs(e.y - on(1, e.z)));
    if (!stand(e.x, e.y, e.z, e.radius)) inside++;
  }
  check('walked straight up the hill, a step at a time, its feet are on the slope at every step and it arrives on the landing three up', worst < 1e-9 && inside === 0 && Math.abs(e.y - L.top) < 1e-9 && e.z < L.z1, `worst ${worst.toFixed(4)}, y ${e.y.toFixed(2)}, z ${e.z.toFixed(2)}`);
  for (let i = 0; i < 400; i++) {
    const fz = e.z;
    e.z += 0.03;
    keepOnFloor(e, e.x, fz);
    worst = Math.max(worst, Math.abs(e.y - on(1, e.z)));
  }
  check('...and walked back down, they follow it down again to the floor', worst < 1e-9 && e.y === 0 && e.z > ramps[1].foot);
  // Off the open side of the gentle slope, half way up: a drop of a unit and a half.
  const s = give({ x: ramps[0].x0 + 0.6, y: on(0, 4), z: 4, radius: 0.4 });
  for (let i = 0; i < 100; i++) {
    const fx = s.x;
    s.x -= 0.03;
    keepOnFloor(s, fx, s.z);
  }
  check('walked at the open side of a slope half way up it, it stops at the edge: creatures do not step off into the air', s.x >= ramps[0].x0 - 1e-9 && Math.abs(s.y - on(0, 4)) < 1e-9, `x ${s.x.toFixed(2)}, y ${s.y.toFixed(2)}`);
  // Into the side of the slope from the floor.
  const w = give({ x: ramps[0].x0 - 2, y: 0, z: 4, radius: 0.4 });
  for (let i = 0; i < 100; i++) {
    const fx = w.x;
    w.x += 0.03;
    keepOnFloor(w, fx, w.z);
  }
  check('walked at the side of a slope from the floor, it is stopped as by a wall, and stays at floor height', w.x <= ramps[0].x0 - 0.4 + 1e-9 && w.y === 0, `x ${w.x.toFixed(2)}`);
  const none = { x: 0, y: 2, z: 0, radius: 0.4, canStand: () => true };
  keepOnFloor(none, 0.1, 0);
  check('a creature the game has given no floor to (an old test, a boss that floats) keeps its height', none.y === 2);
}

// ---------------------------------------------------------------- he is reachable up a slope
{
  const e = give({ x: ramps[2].x, y: 0, z: ramps[2].foot + 0.5, radius: 0.4 });
  check('the rat two and a half units up the steepest slope from a creature at its foot is ON GROUND IT CAN WALK TO (by height alone he was "out of reach" two steps up any slope)', sameGround(e, ramps[2].x, on(2, L.z1 + 0.5), L.z1 + 0.5) && Math.abs(on(2, L.z1 + 0.5)) > 0.9);
  check('...and on the landing, by way of the slope', sameGround(e, ramps[2].x, L.top, L.z1 - 1));
  check('but not on the landing from a creature on the floor BESIDE the slopes: a wall three high is in the way', !sameGround(give({ x: L.x0 - 2, y: 0, z: L.z1 - 1, radius: 0.4 }), L.x0 + 1, L.top, L.z1 - 1));
  check('...nor in the air high over its head', !sameGround(give({ x: 0, y: 0, z: 0, radius: 0.4 }), 1, 3, 0) && sameGround(give({ x: 0, y: 0, z: 0, radius: 0.4 }), 1, 0.5, 0));
  check('a creature with no floor given to it judges by height alone, as before', sameGround({ x: 0, y: 0, z: 0 }, 5, 0.8, 0) && !sameGround({ x: 0, y: 0, z: 0 }, 5, 1, 0));
}

// ---------------------------------------------------------------- real creatures
{
  const arena = { ...RAMP_PATCH };
  let leaps = 0;
  let leapsUp = 0;
  /** Plays a creature with the rat walking up ramp `i` ahead of it and waiting on the landing; then walking back down. */
  const chase = (e: Walker, i: number, seconds: number, lead = 2.2): { top: number; off: number; air: number; back: number } => {
    const r = ramps[i];
    let top = 0;
    let off = 0;
    let air = 0;
    // The rat: a little up the slope from it, then further as it comes, then on the landing.
    for (let f = 0; f < seconds * 60; f++) {
      const pz = Math.max(L.z1 - 2, Math.min(r.foot - 0.5, e.z - lead));
      const py = pz < L.z1 ? L.top : on(i, pz);
      e.update(DT, r.x, py, pz, true);
      top = Math.max(top, e.y);
      // (A mantis in the air over its leap is in the air: it is asked again when it lands.)
      const leaping = e.state === 'leap';
      const g = floor(e.x, e.y, e.z, e.radius);
      if (!leaping && (g === null || Math.abs(g - e.y) > 1e-6)) air++;
      if (!leaping && !stand(e.x, e.y, e.z, Math.min(e.radius, 0.3))) off++;
      if (leaping) leaps++;
      if (leaping && e.y > 0.4) leapsUp++;
    }
    // ...and he goes back down to the floor before the slopes.
    for (let f = 0; f < seconds * 60; f++) {
      const pz = Math.min(r.foot + 3, e.z + lead);
      const py = pz > r.foot ? 0 : on(i, pz);
      e.update(DT, r.x, py, pz, true);
      const g = floor(e.x, e.y, e.z, e.radius);
      if (e.state !== 'leap' && (g === null || Math.abs(g - e.y) > 1e-6)) air++;
    }
    return { top, off, air, back: e.y };
  };
  const spec = (i: number): { x: number; y: number; z: number; arena: typeof arena; respawn: boolean; hunt: boolean; facing: number } => ({ x: ramps[i].x, y: 0, z: ramps[i].foot + 1.5, arena, respawn: true, hunt: true, facing: Math.PI });
  // (How far ahead of each he keeps: a roach comes right at him; a mantis, an ant and a scorpion stand off, and only
  // come on if he is further off than where they like to stand.)
  const made: Array<[string, (i: number) => Walker, number?]> = [
    ['roach', (i) => give(new Scuttler(spec(i))) as unknown as Walker],
    ['guard', (i) => give(new Guard(spec(i) as never)) as unknown as Walker],
    ['ironback', (i) => give(new Ironback(spec(i) as never)) as unknown as Walker],
    ['stag', (i) => give(new Stag(spec(i) as never)) as unknown as Walker],
    ['mantis', (i) => give(new Mantis(spec(i) as never)) as unknown as Walker, 5.5],
    ['ant', (i) => give(new Ant(spec(i) as never)) as unknown as Walker, 4.6],
    ['scorpion', (i) => give(new Scorpion(spec(i) as never)) as unknown as Walker, 4.6],
  ];
  for (const [name, make, lead] of made) {
    const out = [0, 1, 2].map((i) => {
      reseed(i + 1);
      return chase(make(i), i, 16, lead);
    });
    check(`a ${name} follows him up each of the three slopes (one in four, one in two, one in one), its feet on the ground every frame, and never in the stone`, out.every((o) => o.top > 1.2 && o.air === 0 && o.off === 0), out.map((o) => `up to ${o.top.toFixed(2)}${o.air ? `, ${o.air} frames off the ground` : ''}${o.off ? `, ${o.off} in stone` : ''}`).join('; '));
    check(`...and comes back down after him`, out.every((o) => o.back < o.top - 0.5), out.map((o) => o.back.toFixed(2)).join('; '));
  }
  check('the mantis LEAPS on the slopes too: up a slope onto the slope (its leap was planned at one height, and a hill before it was a wall in the air)', leaps > 20 && leapsUp > 10, `${leaps} frames in the air, ${leapsUp} of them up a slope`);
  reseed(1);
  // The toad hops, and a hop is planned at one height: it keeps to the level it is on.
  const toad = give(new Toad({ x: ramps[0].x, y: 0, z: ramps[0].foot + 2, arena, respawn: true } as never)) as unknown as Walker;
  let toadTop = 0;
  for (let f = 0; f < 60 * 12; f++) {
    toad.update(DT, ramps[0].x, on(0, 6), 6, true);
    toadTop = Math.max(toadTop, toad.y);
  }
  check('a toad HOPS, and plans each hop at one height: it does not go up a slope after him (it spits from the level instead). Said plainly, not hidden', toadTop < FOOT_STEP + 0.3, `got as high as ${toadTop.toFixed(2)}`);

  // Back to where it was made.
  reseed(1);
  const r = give(new Scuttler({ x: ramps[1].x, y: 0, z: ramps[1].foot + 1.5, arena, respawn: true, hunt: true })) as unknown as Walker & { takeHit(d: number, x: number, z: number): boolean; alive: boolean };
  chase(r, 1, 6);
  for (let f = 0; f < 60 * 6 && r.y < 1; f++) r.update(DT, ramps[1].x, on(1, r.z - 2), r.z - 2, true);
  const diedAt = r.y;
  for (let n = 0; n < 12 && r.alive; n++) {
    r.takeHit(5, r.x, r.z + 1);
    for (let f = 0; f < 40; f++) r.update(DT, ramps[1].x, 40, 60, true);
  }
  for (let f = 0; f < 60 * 12 && !r.alive; f++) r.update(DT, ramps[1].x, 40, 60, true);
  check('a roach beaten up on the slope comes back where it was made, at the height it was made at (its height follows the floor now, so it has to be put back)', diedAt > 0.8 && r.alive && r.y === 0 && Math.abs(r.z - (ramps[1].foot + 1.5)) < 1e-6, `beaten at height ${diedAt.toFixed(2)}, back at ${r.y.toFixed(2)}`);
}

// ---------------------------------------------------------------- in the garden
{
  check('the Move Garden has two creatures by its ramps to see it with: a roach whose home is the landing three up, and a guard at the foot of the hill', RAMP_FOES.length === 2 && garden.enemies === RAMP_FOES && RAMP_FOES[0].y === L.top && RAMP_FOES[1].y === 0);
  check('...each made on ground it can stand on, and kept to the ramps, the landing and a few steps before them (they count toward nothing)', RAMP_FOES.every((f) => stand(f.x, f.y ?? 0, f.z, 0.45) && f.uncounted && f.arena!.x0 === L.x0 && f.arena!.z1 < garden.spawn.z - 2));
  reseed(1);
  const roach = give(new Scuttler(RAMP_FOES[0] as never)) as unknown as Walker;
  let low: number = L.top;
  for (let f = 0; f < 60 * 30; f++) {
    const pz = Math.min(ramps[0].foot + 1.5, roach.z + 2.2);
    roach.update(DT, ramps[0].x, pz > ramps[0].foot ? 0 : on(0, Math.max(L.z1, pz)), pz, true);
    low = Math.min(low, roach.y);
  }
  check('the roach from the landing comes DOWN the gentle slope after him, to the floor', low < 0.3, `got down to ${low.toFixed(2)}`);
  void topAt;
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
if (failures) process.exit(1);
