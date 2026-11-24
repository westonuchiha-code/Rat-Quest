// The Long Drop (src/levels/longdrop.ts): a minute and a half downhill on the shield, a giant ramp, and a fall into
// a round room in the dark.
//
// The owner, 2026-11-15: "totally downhill and you're just on the board the whole time". And 2026-11-16: "a minute
// and a half of like flying down through the sewer surfing on your Shield jumping on ramps collecting collectibles
// in the air ... this giant ramp that you fly off of and you catch this huge amount of air but then you fall like
// into the darkness and you land in a room ... you can't actually go beyond the lit up part of the floor".
// It is ridden here with the real controller, every way it is meant to be ridden.
import { Bat } from '../src/enemies/bat';
import { resolveCombat, type CombatEvents } from '../src/combat/combat';
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type MoveEvent } from '../src/player/controller';
import { aabbOf, topAt, slopeOf, keepInWell } from '../src/world/collision';
import { atDoor } from '../src/world/rooms';
import { buildChamber } from '../src/world/chamber';
import { CollectibleTracker } from '../src/world/collectibles';
import { longDrop, longDropPlan, LONGDROP as L, WEED, RAIL, BAT_OFF, ARENA, dropFloor, dropLine, sectionAt } from '../src/levels/longdrop';
import { garden } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { MAX_WALK_SLOPE, slimeZones } from '../src/world/layout';
import { TUNING } from '../src/data/tuning';
import { FEELS, feelOf } from '../src/data/feel';
import { WEB, meetWeb, websOf } from '../src/world/webs';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const def = longDrop();
const B = longDropPlan();
const cs = def.solids.map(aabbOf);
const R = TUNING.rat.radius;
// (The ground: everything but the weeds and the rails.)
const big = cs.filter((b) => b.max.x - b.min.x > 0.3 && b.max.z - b.min.z > 0.6);
const ground = (x: number, z: number): number => Math.max(-Infinity, ...big.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z).map((b) => topAt(b, x, z)));
const purse = (): CollectibleTracker => new CollectibleTracker([{ id: def.id, name: def.name, items: def.collectibles }], null);
const falling = B.placed.filter((p) => p.kind === 'pipe' || p.kind === 'bed');

// ---- What it is ----
{
  check(
    'it is a test room: found by its name, and in none of the game\'s lists',
    levelById('longdrop')?.id === 'longdrop'
      && TEST_ROOMS.some((l) => l.id === 'longdrop')
      && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'longdrop')
  );
  const door = garden().courseDoors?.find((d) => d.to === 'longdrop');
  check('a door in the Move Garden leads to it, and its own way out leads back there', !!door && door.need === 0 && def.returnTo === 'garden');
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check(
    'it builds: its slime, sleepers and weeds, and the arena\'s floor and the eyes round it',
    built
      && ['runnel', 'sleepers', 'weed', 'torch', 'sign', 'arena', 'eyes'].every((k) => def.decor.some((d) => d.kind === k))
  );
  const long = B.lip.z - B.head.z1;
  check(
    'it is well over a kilometre long, and falls more than six hundred from its head to its giant ramp',
    long > 1200
      && B.head.y - B.lip.y > 600,
    `${long} long; ${(B.head.y - B.lip.y).toFixed(0)} down`
  );
  check(
    'it is all downhill to the foot of the giant ramp: nowhere does its floor rise',
    Array.from({ length: B.lip.z - 12 }, (_, i) => i).every((z) => dropFloor(z + 1) <= dropFloor(z) + 1e-9)
  );
  const slopes = falling.map((p) => (p.y0 - p.y1) / (p.z1 - p.z0));
  check(
    'every falling length is steep enough for the air attack to be the shield (one thrown off can get back on anywhere), and none is too steep to walk',
    slopes.every((s) => s >= TUNING.ride.minSlope && s <= MAX_WALK_SLOPE),
    `${Math.min(...slopes).toFixed(3)} to ${Math.max(...slopes).toFixed(3)}`
  );
  // Nothing stands across his way: at every join, wherever he is across the course, the ground ahead is no higher.
  let step = -Infinity;
  let where = '';
  for (const p of B.placed.slice(1)) {
    if (p.kind === 'lip') continue;
    for (let x = -L.half + 0.4; x <= L.half - 0.4; x += 0.4) {
      const up = ground(x, p.z0 + 0.01) - ground(x, p.z0 - 0.01);
      if (up > step) {
        step = up;
        where = `${p.kind} at ${p.z0}, x ${x.toFixed(1)}`;
      }
    }
  }
  check(
    'nothing stands across his way at any join: wherever he is across the course, the ground ahead is level with him or lower',
    step < 0.03,
    `greatest step up ${step.toFixed(3)} (${where})`
  );
  check(
    'its floor is where the level says it is, all the way down',
    falling.every((p) => [0.1, 0.5, 0.9].every((t) => Math.abs(ground(0, p.z0 + t * (p.z1 - p.z0)) - dropFloor(p.z0 + t * (p.z1 - p.z0))) < 1e-6))
  );
  check(
    'walls shut the whole of it in, to the end of the ramp, well over his head everywhere',
    B.placed.every((p) => [-1, 1].every((s) => cs.some((b) => (s < 0 ? b.max.x <= -L.half + 1e-9 : b.min.x >= L.half - 1e-9) && b.min.z <= p.z0 + 1e-9 && b.max.z >= p.z1 - 1e-9 && b.max.y >= Math.max(p.y0, p.y1) + 8)))
  );
  check('there is slime down every trough', def.decor.filter((d) => d.kind === 'runnel').length === B.placed.filter((p) => p.trough).length);
  check(
    'every weed is a solid to steer round, as tall as it is drawn',
    B.weeds.length > 60
      && B.weeds.every(([x, y, z]) => cs.some((b) => Math.abs((b.min.x + b.max.x) / 2 - x) < 1e-6 && Math.abs((b.min.z + b.max.z) / 2 - z) < 1e-6 && Math.abs(b.max.y - y - WEED.high) < 1e-6 && Math.abs(y - ground(x, z)) < 0.12))
      && def.decor.filter((d) => d.kind === 'weed').length === B.weeds.length,
    `${B.weeds.length} weeds`
  );
  check('the line worth riding misses every weed', B.weeds.every(([x, , z]) => Math.abs(dropLine(z) - x) > WEED.half + R + 0.05));
  check(
    'nothing of the course is as low as the dark it ends over, and nothing of it is under the world',
    cs.every((b) => b.min.y >= -1 - 1e-9)
      && cs.filter((b) => b.max.z <= B.lip.z + 1e-9).every((b) => b.min.y > B.well.top)
  );
}

// ---- Ridden ----
interface Ride { p: PlayerController; events: MoveEvent[]; fastest: number; slowest: number; seconds: number; air: number; got: Set<string>; out: number }
interface From { x: number; z: number; speed?: number }
/**
 * A ride. From the head (a hop, and ATTACK), or from anywhere down the course already on his shield at `speed`.
 * From then on he does what `at` says, till `until` or the frames run out.
 */
function ride(from: From | null, frames: number, at: (p: PlayerController, i: number) => Partial<PlayerInput>, until?: (p: PlayerController) => boolean, each?: (p: PlayerController) => void): Ride {
  const start = from ?? { x: -1, z: -3 };
  const p = new PlayerController(new THREE.Vector3(start.x, ground(start.x, start.z), start.z));
  p.well = def.well ?? null;
  // (As the game sets it: the slime down the pipes' beds is the fast line.)
  p.slime = slimeZones(def.decor);
  const bag = purse();
  const events: MoveEvent[] = [];
  const got = new Set<string>();
  let rode = false;
  let fastest = 0;
  let slowest = Infinity;
  let seconds = 0;
  let air = 0;
  let out = 0;
  for (let i = 0; i < 12; i++) p.update(DT, inp({}), cs);
  if (from) {
    p.velocity.set(0, 0, from.speed ?? TUNING.ride.max);
    p.devRide();
  }
  for (let i = 0; i < frames; i++) {
    rode ||= p.riding;
    const getOn = { move: v(0, 1), run: false, jumpPressed: p.grounded && p.position.z > -0.6, jumpHeld: false, attackPressed: !p.grounded && p.position.z > 0.3 };
    p.update(DT, inp(rode ? { run: false, ...at(p, i) } : getOn), cs);
    if (p.moveEvent) events.push(p.moveEvent);
    for (const c of bag.tryCollect(def.id, p.position, R, TUNING.rat.height)) got.add(c.id);
    if (rode) {
      seconds += DT;
      const speed = Math.hypot(p.velocity.x, p.velocity.z);
      fastest = Math.max(fastest, speed);
      if (seconds > 4 && p.position.z < B.lip.z - 20) slowest = Math.min(slowest, speed);
      if (!p.grounded) air++;
      if (p.position.z < B.lip.z) out = Math.max(out, Math.abs(p.position.x));
    }
    each?.(p);
    if (until?.(p)) break;
  }
  return { p, events, fastest, slowest, seconds, air, got, out };
}
/** Steers him down the line x = `lane(z)`: he leans toward where it will be, and straightens as he gets there. */
const steer = (lane: (z: number) => number) => (p: PlayerController): THREE.Vector3 => {
  if (!p.grounded) return v(0, 0);
  const going = Math.atan2(p.velocity.x, p.velocity.z);
  const want = Math.max(-0.4, Math.min(0.4, (lane(p.position.z + 5) - p.position.x) / 4));
  return v(Math.max(-0.8, Math.min(0.8, (want - going) * 4)), 0);
};
const inArena = (p: PlayerController): boolean => p.grounded && p.position.y < 0.01;
const fromMiddle = (p: PlayerController): number => Math.hypot(p.position.x - B.arena.x, p.position.z - B.arena.z);

{
  // Down the middle with nothing held: the first weed on his line throws him off. They are obstacles.
  const blind = ride({ x: 0, z: 2 }, 900, () => ({}), (p) => !p.riding);
  const first = B.weeds.filter(([x]) => Math.abs(x) < WEED.half + R).sort((a, b) => a[2] - b[2])[0];
  check(
    'down the middle with nothing held, the first weed in his way throws him off: they are things to steer round',
    blind.events.includes('bail')
      && Math.abs(blind.p.position.z - first[2]) < 4,
    `off at z ${blind.p.position.z.toFixed(1)}; the weed is at ${first[2]}`
  );

  // The line worth riding, from the head to the arena.
  const hp = new PlayerController(new THREE.Vector3()).hp;
  const run = ride(null, 9000, (p) => ({ move: steer(dropLine)(p) }), inArena);
  check(
    'dropped in at the head (a hop, and ATTACK) and steered down the line worth riding, he is on his shield all the way: thrown off by nothing, never off it once',
    run.events[0] === 'ride'
      && run.events.filter((e) => e === 'ride').length === 1
      && !run.events.some((e) => e === 'bail' || e === 'slip' || e === 'rideEnd'),
    run.events.filter((e) => e !== 'rideLand').join()
  );
  check('...it is a minute and a half of it', run.seconds > 80 && run.seconds < 100, `${run.seconds.toFixed(1)} s`);
  check(
    '...at the shield\'s top speed, and never slowed to a run after the first seconds',
    run.fastest > TUNING.ride.max - 0.01
      && run.slowest > TUNING.ride.max - 3,
    `fastest ${run.fastest.toFixed(1)}, slowest ${run.slowest.toFixed(1)}`
  );
  check(
    '...in the air for a good part of it: off every ledge and the giant ramp',
    run.air / 60 > 8
      && run.events.filter((e) => e === 'rideLand').length >= 10,
    `${(run.air / 60).toFixed(1)} s in the air; ${run.events.filter((e) => e === 'rideLand').length} landings`
  );
  check('...never out of the course', run.out < L.half - R + 1e-6, `furthest out ${run.out.toFixed(2)}`);
  check(
    '...taking every crumb along that line',
    B.lineCrumbs.length > 80
      && B.lineCrumbs.every((id) => run.got.has(id)),
    `${B.lineCrumbs.filter((id) => run.got.has(id)).length} of ${B.lineCrumbs.length}; missed at z ${def.collectibles.filter((c) => B.lineCrumbs.includes(c.id) && !run.got.has(c.id)).map((c) => c.z).join()}`
  );
  check(
    '...and he comes down in the arena, in its light, still on his shield and unhurt',
    inArena(run.p)
      && fromMiddle(run.p) < B.arena.r - 1
      && run.p.riding
      && run.p.hp === hp,
    `${fromMiddle(run.p).toFixed(1)} from its middle`
  );
}

// ---- Getting back on ----
{
  // One thrown off stands on a slope. Wherever that is, a hop and ATTACK puts the shield back under him.
  const failed: string[] = [];
  for (const sec of falling) {
    const z = (sec.z0 + sec.z1) / 2;
    const x = dropLine(z);
    const p = new PlayerController(new THREE.Vector3(x, ground(x, z), z));
    for (let i = 0; i < 12; i++) p.update(DT, inp({}), cs);
    let on = false;
    for (let i = 0; i < 40 && !on; i++) {
      p.update(DT, inp({ move: v(0, 1), run: false, jumpPressed: i === 0, jumpHeld: i < 10, attackPressed: i === 8 }), cs);
      on ||= p.moveEvent === 'ride';
    }
    if (!on) failed.push(`${sec.kind} at ${sec.z0}`);
  }
  check('one thrown off can get back on wherever he stands: on every falling length, a hop and ATTACK is the shield', failed.length === 0, failed.join('; '));
}

// ---- The shoulders ----
{
  // (He gets onto one by carving up the trough's wall and out over its rim.)
  let onShoulder = 0;
  const run = ride({ x: 1, z: 4 }, 400, (p) => ({ move: steer(() => 5.5)(p) }), (p) => p.position.z > 90, (p) => {
    if (p.position.z > 40 && p.grounded && Math.abs(p.position.y - (dropFloor(p.position.z) + L.rim)) < 0.02) onShoulder++;
  });
  check(
    'carving up a trough\'s wall takes him out over its rim onto the shoulder, and he rides on there, level with the rim',
    !run.events.includes('bail')
      && run.p.riding
      && onShoulder > 60
      && Math.abs(run.p.position.x - 5.5) < 1,
    `${onShoulder} frames on it`
  );
}

// ---- Everything that throws him ----
{
  const bad: string[] = [];
  let lowest = Infinity;
  for (const K of B.launches) {
    if (K.kind === 'giant') continue;
    let high = 0;
    const run = ride({ x: K.x, z: K.z0 - 9 }, 240, () => ({}), (p) => p.position.z > K.z + 4 && p.grounded, (p) => {
      if (p.position.z > K.z) high = Math.max(high, p.position.y - ground(p.position.x, p.position.z));
    });
    lowest = Math.min(lowest, high);
    const missed = K.crumbs.filter((id) => !run.got.has(id)).length;
    if (run.events.includes('bail') || !run.p.riding || high < 1.5 || missed) bad.push(`${K.kind} at ${K.z0}: ${high.toFixed(1)} up, missed ${missed}, ${run.events.join()}`);
  }
  const kickers = B.launches.filter((k) => k.kind !== 'giant');
  check(
    'every kicker throws him well up, he lands riding, and the crumbs hung over it are along the way it throws him',
    kickers.length >= 16
      && bad.length === 0,
    bad.length ? bad.join('; ') : `${kickers.length} kickers; the least air ${lowest.toFixed(1)} over the ground`
  );
  check(
    'there are kickers on the shoulders of every flat, and kickers on the beds: in his way down the steps, to the side elsewhere',
    B.placed.filter((p) => p.kind === 'flat').length * 2 === B.launches.filter((k) => k.kind === 'shoulder').length
      && B.launches.some((k) => k.kind === 'bed' && Math.abs(k.x) < 0.01)
      && B.launches.some((k) => k.kind === 'bed' && Math.abs(k.x) > 3)
  );
}

// ---- The rails ----
{
  const bad: string[] = [];
  let least = Infinity;
  for (const rail of B.rails) {
    const side = rail.x > 0 ? -1 : 1; // (he comes at it from the middle of the track)
    let pressed = false;
    let onIt = 0;
    let off = 0;
    const run = ride({ x: rail.x + side * 0.5, z: rail.z0 - 7 }, 400, (p) => {
      if (p.grinding) return {};
      const press = !pressed && p.grounded && p.position.z > rail.z0 + 1.5;
      if (press) pressed = true;
      return { stowPressed: press };
    }, (p) => p.position.z > rail.z1 + 6, (p) => {
      if (p.grinding) {
        onIt++;
        off = Math.max(off, Math.abs(p.position.x - rail.x));
      }
    });
    least = Math.min(least, onIt);
    const missed = rail.crumbs.filter((id) => !run.got.has(id)).length;
    if (!run.events.includes('grind') || run.events.includes('bail') || !run.p.riding || off > 1e-6 || onIt < 40 || missed) bad.push(`rail at ${rail.z0} x ${rail.x}: ${onIt} frames, missed ${missed}, ${run.events.join()}`);
  }
  check(
    'THE RAILS: riding beside any of them, STOW puts his shield on it; he grinds it down its middle to its end, takes every crumb over it, and rides on',
    B.rails.length >= 8
      && bad.length === 0,
    bad.length ? bad.join('; ') : `${B.rails.length} rails; the shortest grind ${least} frames`
  );
  // ---- BATS OVER THE RAILS (the owner, 2026-11-17: "you're grinding down the railway on your shield and you're
  // smacking bats out of the air with your sword while you're grinding down the rail"). ----
  {
    const flutterers = def.enemies.filter((e) => e.type === 'bat' && e.flutter);
    check(
      'beside every rail hang bats to be hit in passing: one for every twelve of rail or so, at the height of his sword arm over the rail, on the side the middle of the track is on; none of them is a thing the level asks him to beat, and each comes back',
      flutterers.length === B.bats.length
        && B.bats.length >= B.rails.length * 2
        && flutterers.every((e) => e.uncounted && e.respawn)
        && B.bats.every((b) => B.rails.some((r) => Math.abs(Math.abs(b.x - r.x) - BAT_OFF.side) < 1e-6 && Math.abs(b.x) < Math.abs(r.x) && b.z > r.z0 && b.z < r.z1 && Math.abs(b.y - (dropFloor(b.z) + RAIL.high + BAT_OFF.up)) < 0.3)),
      `${B.bats.length} bats on ${B.rails.length} rails`
    );
    // Grinding a rail and swinging as he comes to each, he hits them; and it does not slow or stop him.
    const told: string[] = [];
    let hitAll = 0;
    let ofAll = 0;
    for (const rail of B.rails) {
      const mine = B.bats.filter((b) => Math.abs(Math.abs(b.x - rail.x) - BAT_OFF.side) < 1e-6 && b.z > rail.z0 && b.z < rail.z1);
      const bats = mine.map((b) => new Bat({ x: b.x, y: b.y, z: b.z, flutter: true }));
      const events: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
      const side = rail.x > 0 ? -1 : 1;
      let pressed = false;
      let hp = 0;
      const run = ride({ x: rail.x + side * 0.5, z: rail.z0 - 7 }, 400, (p) => {
        hp ||= p.hp;
        if (!p.grinding) {
          const press = !pressed && p.grounded && p.position.z > rail.z0 + 1.5;
          if (press) pressed = true;
          return { stowPressed: press };
        }
        // (A swing as each bat comes within two and a half ahead.)
        const next = bats.find((b) => b.alive && b.z > p.position.z - 0.5);
        return { attackPressed: !!next && next.z - p.position.z < 3 && p.state !== 'attack' && p.attackTime <= 0 };
      }, (p) => p.position.z > rail.z1 + 6, (p) => {
        for (const b of bats) b.update(DT, p.position.x, p.position.y, p.position.z, true);
        resolveCombat(p, bats, events);
      });
      const hit = bats.filter((b) => !b.alive).length;
      hitAll += hit;
      ofAll += bats.length;
      if (hit < bats.length || !run.p.riding || run.events.includes('bail') || run.p.hp < hp) told.push(`rail at ${rail.z0}: ${hit} of ${bats.length}${run.p.riding ? '' : ', off his shield'}${run.p.hp < hp ? ', HURT' : ''}`);
    }
    check(
      'grinding each rail and swinging as he comes to them, he hits every bat beside it, one blow each; he is not hurt, and he grinds on to the rail\'s end',
      told.length === 0
        && ofAll >= 16,
      told.length ? told.join('; ') : `${hitAll} of ${ofAll}`
    );
    const idle = new Bat({ x: 0, y: 1, z: 0, flutter: true });
    for (let i = 0; i < 300; i++) idle.update(DT, 0.3, 0.7, 0.2, true);
    check(
      'a bat that hangs there does nothing else: it does not swoop, cannot hurt, stays where it hangs, and one blow ends it',
      idle.state === 'flutter'
        && !idle.attackActive
        && Math.abs(idle.x) < 1e-9
        && Math.abs(idle.z) < 1e-9
        && Math.abs(idle.y - 1) < 0.1
        && idle.takeHit(1, 0, 0)
        && !idle.alive
    );
  }
  check('...a rail is low enough to ride over, and is a rail to grind all the same', RAIL.high <= TUNING.physics.stepHeight && RAIL.high < TUNING.grind.drop);
}

// ---- The giant ramp, and the fall ----
{
  const K = B.launches.find((k) => k.kind === 'giant')!;
  const hp = new PlayerController(new THREE.Vector3()).hp;
  let peak = -Infinity;
  let airFrames = 0;
  let left = false;
  const inrun = B.placed[B.placed.length - 3];
  const run = ride({ x: 0, z: inrun.z0 + 4 }, 900, () => ({}), inArena, (p) => {
    left ||= p.position.z > K.z && !p.grounded;
    if (left && !p.grounded) {
      airFrames++;
      peak = Math.max(peak, p.position.y - K.y);
    }
  });
  let launchSpeed = 0;
  let launchUp = 0;
  {
    const q = ride({ x: 0, z: inrun.z0 + 4 }, 900, () => ({}), (p) => p.position.z > K.z && !p.grounded);
    launchSpeed = Math.hypot(q.p.velocity.x, q.p.velocity.z);
    launchUp = q.p.velocity.y;
  }
  check(
    'THE GIANT RAMP: down the in-run and off its lip he is thrown well up, over nothing',
    left
      && peak > 2
      && !run.events.includes('bail'),
    `${peak.toFixed(2)} over the lip; he leaves it at ${launchSpeed.toFixed(2)}, going up at ${launchUp.toFixed(2)}`
  );
  check(
    '...the level knows how fast he leaves it (its crumbs are hung by that)',
    Math.abs(launchSpeed - K.speed) < 0.4
      && Math.abs(launchUp - K.up) < 0.5,
    `it says ${K.speed} and ${K.up.toFixed(2)}`
  );
  check(
    '...he is in the air more than two seconds, and falls further than forty',
    airFrames / 60 > 2
      && K.y > 40,
    `${(airFrames / 60).toFixed(2)} s; ${K.y.toFixed(1)} down`
  );
  check(
    '...the crumbs hung past the lip are along his way',
    K.crumbs.every((id) => run.got.has(id)),
    `${K.crumbs.filter((id) => run.got.has(id)).length} of ${K.crumbs.length}`
  );
  check(
    '...and he comes down in the light of the arena, unhurt, and still on his shield',
    inArena(run.p)
      && fromMiddle(run.p) < B.arena.r - 2
      && run.p.hp === hp
      && run.p.riding,
    `${fromMiddle(run.p).toFixed(1)} from its middle`
  );
  // However he leaves the lip, he comes down inside the light: slowly off its edge; and as far as he can be thrown.
  const walker = new PlayerController(new THREE.Vector3(3, K.y, K.z - 2));
  walker.well = def.well ?? null;
  let jolt = 0;
  for (let i = 0; i < 600 && !inArena(walker); i++) {
    const was = walker.position.clone();
    walker.update(DT, inp({ move: v(0, 1), run: false }), cs);
    if (walker.position.z > K.z) jolt = Math.max(jolt, Math.hypot(walker.position.x - was.x, walker.position.z - was.z));
  }
  check(
    '...one who only walks off the lip is brought down inside it too, carried in as he falls through the dark and never snapped there',
    inArena(walker)
      && fromMiddle(walker) <= B.arena.r - R + 1e-6
      && walker.hp === hp
      && jolt < 0.5,
    `${fromMiddle(walker).toFixed(1)} from its middle; most moved in one step ${jolt.toFixed(2)}`
  );
  let flipped = false;
  const far = ride({ x: 0, z: inrun.z0 + 4 }, 900, (p) => {
    // (An ollie off the lip, and a kickflip at the top of it: as far as he can be thrown.)
    const pop = p.grounded && p.position.z > K.z - 0.4;
    const flip = !p.grounded && !flipped && p.position.z > K.z + 6;
    if (flip) flipped = true;
    return { jumpPressed: pop || flip, jumpHeld: true };
  }, inArena);
  check(
    '...and one who pops off the lip and kickflips over the dark as well',
    far.events.includes('ollie')
      && far.events.includes('kickflip')
      && inArena(far.p)
      && fromMiddle(far.p) <= B.arena.r - R + 1e-6
      && far.p.hp === hp,
    `${fromMiddle(far.p).toFixed(1)} from its middle; ${far.events.join()}`
  );
}

// ---- The arena ----
{
  const A = B.arena;
  check(
    'the arena is a round floor far below the lip, and its light and the eyes in the dark are drawn round the same place',
    A.r === ARENA.r
      && def.decor.some((d) => d.kind === 'arena' && d.x === A.x && d.z === A.z && d.r === A.r && d.y === 0)
      && def.decor.some((d) => d.kind === 'eyes' && d.x === A.x && d.z === A.z && d.r0 > A.r + 2 && d.count >= 40)
  );
  // He cannot leave the light: whichever way he runs, and jumps, and rolls, he gets no further than its edge.
  let furthest = 0;
  let fell = false;
  let atEdge = 0;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const p = new PlayerController(new THREE.Vector3(A.x, 0, A.z));
    p.well = def.well ?? null;
    for (let i = 0; i < 420; i++) {
      p.update(DT, inp({ move: v(Math.sin(a), Math.cos(a)), run: true, jumpPressed: i % 50 === 20, jumpHeld: i % 50 >= 20 && i % 50 < 34, dodgePressed: i % 90 === 60 }), cs);
      furthest = Math.max(furthest, fromMiddle(p));
      fell ||= p.position.y < -0.01;
    }
    if (fromMiddle(p) > A.r - R - 0.01) atEdge++;
  }
  check(
    'he cannot leave its light: whichever way he runs, jumps and rolls, he gets to its edge and no further, and the floor is under him all the way',
    atEdge === 16
      && furthest <= A.r - R + 1e-6
      && !fell,
    `furthest ${furthest.toFixed(3)} of ${A.r}; at the edge in ${atEdge} of 16 ways`
  );
  // Along the edge he slides: it does not hold him.
  const p = new PlayerController(new THREE.Vector3(A.x, 0, A.z + A.r - 1));
  p.well = def.well ?? null;
  const a0 = Math.atan2(p.position.x - A.x, p.position.z - A.z);
  for (let i = 0; i < 180; i++) p.update(DT, inp({ move: v(1, 1).normalize(), run: true }), cs);
  const turned = Math.abs(Math.atan2(p.position.x - A.x, p.position.z - A.z) - a0);
  check('...and run at its edge on a slant he slides along it', turned > 0.3 && fromMiddle(p) > A.r - R - 0.01, `${turned.toFixed(2)} of a turn round it`);
  check(
    '...the rule is only of the dark below: up on the course it moves nobody',
    !keepInWell(B.well, { x: 7.5, y: B.lip.y, z: B.lip.z - 1 }, { x: 0, z: 0 }, R)
      && B.well.top < B.lip.y - 5
  );
  // The way out stands at the far edge of the light, and he can get to it.
  const w = new PlayerController(new THREE.Vector3(A.x, 0, A.z));
  w.well = def.well ?? null;
  let reached = false;
  for (let i = 0; i < 400 && !reached; i++) {
    w.update(DT, inp({ move: v(def.exit.x - w.position.x, def.exit.z - w.position.z).normalize(), run: true }), cs);
    reached = atDoor(def.exit, w.position.x, w.position.z);
  }
  check(
    'the way out stands at the edge of its light, and he can walk to it',
    reached
      && Math.hypot(def.exit.x - A.x, def.exit.z - A.z) < A.r
      && def.exit.y === 0
  );
}

// ---- The crumbs ----
{
  const known = new Set([...B.lineCrumbs, ...B.launches.flatMap((k) => k.crumbs), ...B.rails.flatMap((r) => r.crumbs)]);
  const inside = def.collectibles.filter((c) => cs.some((b) => c.x > b.min.x && c.x < b.max.x && c.z > b.min.z && c.z < b.max.z && c.y < topAt(b, c.x, c.z) - 1e-6 && c.y > b.min.y));
  check(
    'every crumb is earned by riding: along the line through the weeds, in the air off a kicker or the giant ramp, or over a rail (each kind ridden above)',
    def.collectibles.length === known.size
      && def.collectibles.every((c) => known.has(c.id))
      && inside.length === 0,
    `${B.lineCrumbs.length} on the line, ${B.launches.flatMap((k) => k.crumbs).length} in the air, ${B.rails.flatMap((r) => r.crumbs).length} over rails; ${inside.length} inside something`
  );
  check(
    'the ground under each section is one of the level\'s own pieces (a trough, or a bed)',
    B.placed.every((p) => (p.kind === 'pipe' || p.kind === 'flat') === p.trough)
      && sectionAt(-5).kind === 'head'
      && slopeOf(big.find((b) => !!b.ramp && b.min.z === falling[0].z0)!) > 0.4
  );
}

// ---- THE SPEED ROOM'S FEEL (2026-11-24): THE RUSH. A creature struck down from his shield is a burst of speed ----
{
  const K = TUNING.ride.rush;
  const sp = (p: PlayerController): number => Math.hypot(p.velocity.x, p.velocity.z);
  check('the Long Drop plays as the speed room', feelOf(levelById('longdrop')!).id === 'speed' && !!FEELS.speed.ride.rush && !FEELS.waking.ride.rush && !FEELS.dream.ride.rush);
  // On his shield down the pipe.
  for (const feel of ['speed', 'waking'] as const) {
    let before = 0;
    let after = 0;
    let given = false;
    let later = 0;
    let n = 0;
    ride({ x: 0, z: 2 }, 150, (p) => {
      p.feel = FEELS[feel];
      n++;
      if (n === 60) {
        before = sp(p);
        given = p.rush();
        after = sp(p);
      }
      if (n === 90) later = sp(p);
      return {};
    });
    if (feel === 'speed') check('THE RUSH: riding, it is a burst of speed past what he had, and he has most of it still half a second on', given && Math.abs(after - before - K.boost) < 0.01 && later > before + K.boost * 0.4, `${before.toFixed(1)} to ${after.toFixed(1)}, then ${later.toFixed(1)}`);
    else check('...and only in the speed room: in the waking world nothing is given', !given && after === before);
  }
  // On a rail: given, kept while he grinds, and never past its top however many he strikes down.
  {
    const rail = B.rails[0];
    const side = rail.x > 0 ? -1 : 1;
    let pressed = false;
    let frames = 0;
    let before = 0;
    let after = 0;
    let kept = 0;
    let most = 0;
    ride({ x: rail.x + side * 0.5, z: rail.z0 - 7 }, 400, (p) => {
      p.feel = FEELS.speed;
      if (p.grinding) {
        frames++;
        if (frames === 10) {
          before = sp(p);
          p.rush();
        }
        // (A rail gives him his speed as it next moves him.)
        if (frames === 11) after = sp(p);
        if (frames === 30) {
          kept = sp(p);
          for (let k = 0; k < 12; k++) p.rush();
        }
        if (frames === 31) most = sp(p);
        return {};
      }
      const press = !pressed && p.grounded && p.position.z > rail.z0 + 1.5;
      if (press) pressed = true;
      return { stowPressed: press };
    }, () => frames > 32);
    check('THE RUSH on a rail: a burst of speed, kept as he grinds on; and a dozen more take him to its top and no further', after - before > K.boost - 0.5 && kept > before + K.boost * 0.7 && Math.abs(most - K.top) < 0.6, `${before.toFixed(1)} to ${after.toFixed(1)}, kept ${kept.toFixed(1)}, most ${most.toFixed(1)}`);
  }
}

// ---- THE COURSE AT A RUSH'S SPEED: it was measured for his standing top speed. Thrown to the rush's top again and
// again all the way down (more than any run of bats would do), the line worth riding still takes him to the arena. ----
{
  let n = 0;
  let bailAt = '';
  const run = ride(null, 9000, (p) => {
    p.feel = FEELS.speed;
    if (!bailAt && p.moveEvent === 'bail') bailAt = `bail z ${p.position.z.toFixed(0)} x ${p.position.x.toFixed(1)} v ${Math.hypot(p.velocity.x, p.velocity.z).toFixed(0)}`;
    if (p.riding && p.grounded && ++n % 120 === 0) for (let k = 0; k < 4; k++) p.rush();
    return { move: steer(dropLine)(p) };
  }, inArena);
  check(
    'THE COURSE AT A RUSH: thrown to the rush\'s top every two seconds all the way down, he is still on his shield to the arena, thrown off by nothing, and never out of the course',
    inArena(run.p) && run.fastest > TUNING.ride.rush.top - 1 && !run.events.some((e) => e === 'bail' || e === 'slip' || e === 'rideEnd') && run.out < 12,
    `${run.seconds.toFixed(0)} s, fastest ${run.fastest.toFixed(1)}, out ${run.out.toFixed(1)}, ${[...new Set(run.events.filter((e) => e !== 'rideLand'))].join()}, ended at z ${run.p.position.z.toFixed(0)} y ${run.p.position.y.toFixed(0)}; ${bailAt}`
  );
}

// ---- WEB CURTAINS (2026-11-24): across the low end of each rail. A rush tears through; without one he is caught ----
{
  check(
    'a web hangs across the low end of every rail, past its last bat, over the rail and wide enough that a grinder cannot miss it',
    B.webs.length === B.rails.length
      && B.rails.every((r) => B.webs.some((w) => w.x === r.x && w.z < r.z1 && w.z > r.z1 - 3 && B.bats.filter((b) => b.z > r.z0 && b.z < r.z1).every((b) => b.z < w.z)))
      && WEB.tear > TUNING.ride.max + 1 && WEB.tear <= TUNING.ride.max + TUNING.ride.rush.boost
      && def.webs!.length === B.webs.length
  );
  /** Down the first rail; `rushes`: bats struck down on the way (a rush each). What the web made of him. */
  const grind = (rushes: number): { how: string; after: number; rode: boolean; before: number } => {
    const rail = B.rails[0];
    const side = rail.x > 0 ? -1 : 1;
    const webs = websOf(B.webs);
    let pressed = false;
    let frames = 0;
    let how = 'none';
    let before = 0;
    let after = -1;
    let since = -1;
    const prev = new THREE.Vector3();
    const run = ride({ x: rail.x + side * 0.5, z: rail.z0 - 7 }, 600, (p) => {
      p.feel = FEELS.speed;
      // (What main.ts does each step, after he has moved.)
      const sp = Math.hypot(p.velocity.x, p.velocity.z);
      const met = frames > 0 ? meetWeb(webs, prev, p.position, sp, p.riding || p.grinding) : null;
      if (met) {
        how = met.how;
        before = sp;
        if (met.how === 'catch') p.snag(WEB.left);
        since = 0;
      }
      if (since >= 0 && since++ === 2) after = Math.hypot(p.velocity.x, p.velocity.z);
      prev.copy(p.position);
      if (p.grinding) {
        frames++;
        if (frames === 20) for (let k = 0; k < rushes; k++) p.rush();
        return {};
      }
      const press = !pressed && p.grounded && p.position.z > rail.z0 + 1.5;
      if (press) pressed = true;
      return { stowPressed: press };
    }, (p) => p.position.z > rail.z1 + 8);
    return { how, after, rode: run.p.riding, before };
  };
  const slow = grind(0);
  check('grinding down a rail with no bat struck, its web CATCHES him: he is left with hardly any speed (and is not hurt or thrown off his shield)', slow.how === 'catch' && slow.after < WEB.left + 2.5 && slow.rode, `${slow.how}: ${slow.before.toFixed(1)} to ${slow.after.toFixed(1)}`);
  const fast = grind(1);
  check('...with ONE bat struck down on the way (a rush), he TEARS THROUGH it and keeps his speed', fast.how === 'tear' && fast.after > WEB.tear - 1 && fast.rode, `${fast.how}: ${fast.before.toFixed(1)} to ${fast.after.toFixed(1)}`);
  // On foot it is brushed aside; and a torn web is not met again until it is spun again.
  {
    const webs = websOf([{ x: 0, y: 1, z: 5, r: 1.2 }]);
    const a = meetWeb(webs, new THREE.Vector3(0, 0, 4.9), new THREE.Vector3(0, 0, 5.1), 3, false);
    const b = meetWeb(webs, new THREE.Vector3(0, 0, 4.9), new THREE.Vector3(0, 0, 5.1), 30, true);
    const wide = meetWeb(websOf([{ x: 0, y: 1, z: 5, r: 1.2 }]), new THREE.Vector3(3, 0, 4.9), new THREE.Vector3(3, 0, 5.1), 10, true);
    check('on foot a web is only brushed aside; torn, it is not met again; and passing wide of one is not meeting it', a?.how === 'brush' && b === null && wide === null);
  }
}

console.log(failures === 0 ? 'longdrop: all passed' : `longdrop: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
