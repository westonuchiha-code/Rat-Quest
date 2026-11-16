// The Long Drop: the downhill level (src/levels/longdrop.ts), a first version.
//
// The owner, 2026-11-15: "totally downhill and you're just on the board the whole time", a sewer pipe that breaks
// off into an underground railway with tracks to grind, slimy water in the bottom, weeds growing out of cracks.
// It is ridden here from top to bottom with the real controller, every way it is meant to be ridden.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type MoveEvent } from '../src/player/controller';
import { aabbOf, topAt, slopeXZ } from '../src/world/collision';
import { atDoor } from '../src/world/rooms';
import { buildChamber } from '../src/world/chamber';
import { longDrop, LONGDROP as L, WEED, KICKER_ARC, dropFloor, dropTroughHalf } from '../src/levels/longdrop';
import { SEWER_PIPE, pipeRim } from '../src/levels/pipes';
import { garden } from '../src/levels/garden';
import { ALL_LEVELS, ARCHIVE, LEVELS, TEST_ROOMS, levelById } from '../src/levels/levels';
import { MAX_WALK_SLOPE } from '../src/world/layout';
import { TUNING } from '../src/data/tuning';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const def = longDrop();
const cs = def.solids.map(aabbOf);
const ground = (x: number, z: number): number => Math.max(...cs.filter((b) => x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z && b.max.x - b.min.x > 0.3 && b.max.z - b.min.z > 0.6).map((b) => topAt(b, x, z)));

// ---- What it is ----
{
  check('it is a test room: found by its name, and in none of the game\'s lists', levelById('longdrop')?.id === 'longdrop' && TEST_ROOMS.some((l) => l.id === 'longdrop') && ![...LEVELS, ...ARCHIVE, ...ALL_LEVELS].some((l) => l.id === 'longdrop'));
  const door = garden().courseDoors?.find((d) => d.to === 'longdrop');
  check('a door in the Move Garden leads to it, and its own way out leads back there', !!door && door.need === 0 && def.returnTo === 'garden' && levelById('garden')?.id === 'garden');
  let built = true;
  try {
    buildChamber({ solids: def.solids, pit: def.pit, water: def.water, decor: def.decor, movers: [] } as never);
  } catch (e) {
    built = false;
    console.log(String(e));
  }
  check('it builds: its slime, its sleepers and its weeds too', built && ['runnel', 'sleepers', 'weed', 'torch', 'sign'].every((k) => def.decor.some((d) => d.kind === k)));
  const fallA = (L.pipeA.top - L.pipeA.bottom) / (L.pipeA.z1 - L.pipeA.z0);
  const fallB = (L.pipeB.top - L.pipeB.bottom) / (L.pipeB.z1 - L.pipeB.z0);
  const fallR = (L.rail.top - L.rail.bottom) / (L.rail.z1 - L.rail.z0);
  check('it is all downhill: forty-five down from its head to its station, and nowhere does its floor rise', L.head.y - L.station.y === 45 && Array.from({ length: 160 }, (_, i) => i).every((z) => dropFloor(z + 1) <= dropFloor(z) + 1e-9));
  check('the first pipe is steep enough for the air attack to be the shield, the second is steeper, and both can be walked', fallA >= TUNING.ride.minSlope && fallB > fallA && fallB <= MAX_WALK_SLOPE, `${fallA.toFixed(3)}, ${fallB.toFixed(3)}; the railway ${fallR.toFixed(2)}`);
  // One surface: across every join, at several places across the trough, the ground is the same height either side.
  let step = 0;
  for (const z of [L.pipeA.z1, L.pipeB.z0, L.pipeB.z1]) for (const x of [0, 0.5, 1.1, 1.9, 2.6]) step = Math.max(step, Math.abs(ground(x, z - 0.01) - ground(x, z + 0.01)) - (z === L.pipeB.z1 && x > SEWER_PIPE.flat ? 99 : 0));
  check('the trough is one surface from the head to the railway: no step where one length meets the next', step < 0.03, `greatest step ${step.toFixed(3)}`);
  check('its floor is where the level says it is, all the way down', [3, 20, 40, 60, 80, 100, 125, 140].every((z) => Math.abs(ground(0, z) - dropFloor(z)) < 1e-6));
  check('walls shut the whole of it in, higher than he can ever get', [-1, 1].every((s) => cs.some((b) => (s < 0 ? b.max.x <= -L.half + 1e-9 : b.min.x >= L.half - 1e-9) && b.max.y >= L.head.y + 8 && b.min.z <= L.head.z0 && b.max.z >= L.station.z1)));
  check('there is slime down both pipes and the level length between them', def.decor.filter((d) => d.kind === 'runnel').length === 3);
  check('every weed is a solid to steer round, as tall as it is drawn, standing on the pipe where it grows', L.weeds.every(([x, z]) => cs.some((b) => Math.abs((b.min.x + b.max.x) / 2 - x) < 1e-6 && Math.abs((b.min.z + b.max.z) / 2 - z) < 1e-6 && b.max.x - b.min.x < 0.6 && b.max.y - ground(x, z) > 0.9 && b.max.y - ground(x, z) < WEED.high + 0.2)) && def.decor.filter((d) => d.kind === 'weed').length === L.weeds.length);
}

// ---- Ridden ----
interface Ride { p: PlayerController; events: MoveEvent[]; fastest: number; jolt: number; out: number; seconds: number; ground: number; air: number }
/** He drops in at the head at x = `from`, and from then on does what `at` says, till `until` or `frames` run out. */
function ride(from: number, frames: number, at: (p: PlayerController, i: number) => Partial<PlayerInput>, until?: (p: PlayerController) => boolean, each?: (p: PlayerController) => void): Ride {
  const p = new PlayerController(new THREE.Vector3(from, L.head.y, -3));
  const events: MoveEvent[] = [];
  let rode = false;
  let fastest = 0;
  let jolt = 0;
  let out = 0;
  let seconds = 0;
  let grindFrames = 0;
  let air = 0;
  let landed = false;
  const last = p.position.clone();
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  for (let i = 0; i < frames; i++) {
    rode ||= p.riding;
    const getOn = { move: v(0, 1), run: false, jumpPressed: p.grounded && p.position.z > -0.6, jumpHeld: false, attackPressed: !p.grounded && p.position.z > 0.3 };
    last.copy(p.position);
    p.update(DT, inp(rode ? { run: false, ...at(p, i) } : getOn), cs);
    if (p.moveEvent) events.push(p.moveEvent);
    if (p.moveEvent === 'rideLand') landed = true;
    if (rode) {
      seconds += DT;
      fastest = Math.max(fastest, Math.hypot(p.velocity.x, p.velocity.z));
      if (!p.grinding && p.grounded) jolt = Math.max(jolt, Math.abs(p.position.y - last.y) - Math.abs(p.position.z - last.z) * 0.6);
      out = Math.max(out, Math.abs(p.position.x));
      if (p.grinding) grindFrames++;
      if (landed && !p.grounded && p.riding) air++;
    }
    each?.(p);
    if (until?.(p)) break;
  }
  return { p, events, fastest, jolt, out, seconds, ground: grindFrames, air };
}
/** Steers him to ride down the line x = `lane` (he leans toward it, and straightens as he gets there). */
const hold = (lane: number) => (p: PlayerController): THREE.Vector3 => {
  if (!p.grounded) return v(0, 0);
  const going = Math.atan2(p.velocity.x, p.velocity.z);
  const want = Math.max(-0.4, Math.min(0.4, (lane - p.position.x) / 4));
  return v(Math.max(-0.8, Math.min(0.8, (want - going) * 4)), 0);
};
const brakeAt = (z: number) => (p: PlayerController): THREE.Vector3 | null => (p.grounded && p.position.z > z ? v(0, -1) : null);

{
  // Down the middle with nothing held: the first weed on his line throws him off. They are obstacles.
  const blind = ride(0, 600, () => ({}), (p) => !p.riding && p.position.z > 2);
  const first = L.weeds.filter(([x]) => Math.abs(x) < WEED.half + TUNING.rat.radius).sort((a, b) => a[1] - b[1])[0];
  check('dropped in at the head (a hop, and ATTACK) he is on his shield, in the pipe', blind.events[0] === 'ride' && blind.events.includes('rideLand'));
  check('down the middle with nothing held, the first weed in his way throws him off: they are things to steer round', blind.events.includes('bail') && Math.abs(blind.p.position.z - first[1]) < 4, `off at z ${blind.p.position.z.toFixed(1)}; the weed is at ${first[1]}`);

  // Steered: down a line that misses every weed, braking in the station.
  const lane = -1.0;
  check('there is a line down the trough that misses every weed (and it is not the middle)', L.weeds.every(([x]) => Math.abs(x - lane) > WEED.half + TUNING.rat.radius + 0.05));
  // (On the railway he rides between the rails.)
  const run = ride(lane, 1500, (p) => ({ move: brakeAt(L.rail.z1 + 1)(p) ?? hold(p.position.z > L.rail.z0 ? 0 : lane)(p) }), (p) => !p.riding && p.position.z > L.rail.z1);
  check('steered down it, he rides the whole of it on his shield: both pipes, the level length and the railway, and stops in the station', run.events.filter((e) => e === 'ride').length === 1 && !run.events.includes('bail') && !run.events.includes('slip') && run.events[run.events.length - 1] === 'rideEnd' && run.p.position.z > L.station.z0 && run.p.position.z < L.buffers.z0 - 0.5 && run.p.position.y < 0.01, `${run.events.join()}; ends z ${run.p.position.z.toFixed(1)}`);
  check('...at the shield\'s top speed for most of it, in well under twenty seconds', run.fastest > TUNING.ride.max - 0.5 && run.seconds < 20 && run.seconds > 8, `fastest ${run.fastest.toFixed(1)}; ${run.seconds.toFixed(1)} s`);
  check('...on the ground nearly all the way, and never jolted by a join', run.air < 30 && run.jolt < 0.12, `${run.air} frames in the air; jolt ${run.jolt.toFixed(3)}`);
  check('...and never out of the course', run.out < L.half - TUNING.rat.radius + 1e-6, `furthest out ${run.out.toFixed(2)}`);
  // From where he stops, on his feet: up the ramp onto the platform and to the way out.
  const p = run.p;
  let reached = false;
  for (let i = 0; i < 900 && !reached; i++) {
    const P = L.platform;
    const target = p.position.z < P.rampFrom - 0.5 || p.position.x < P.x0 + 0.6 ? v(P.x0 + 2.2 - p.position.x, P.rampFrom - 1.2 - p.position.z) : v((def.exit.x - p.position.x) * 0.6, 1);
    const m = (p.position.x >= P.x0 + 0.6 ? v((def.exit.x - p.position.x) * 0.8, 1) : target).normalize();
    p.update(DT, inp({ move: m, run: true }), cs);
    reached = p.grounded && atDoor(def.exit, p.position.x, p.position.z) && Math.abs(p.position.y - P.y) < 0.05;
  }
  check('from there he walks up onto the platform and to the way out', reached, `at x ${p.position.x.toFixed(1)} y ${p.position.y.toFixed(2)} z ${p.position.z.toFixed(1)}`);
}

// ---- The shoulders and their kickers ----
{
  const lane = (L.kicker.x0 + L.kicker.x1) / 2;
  let high = 0;
  const rim = pipeRim(SEWER_PIPE);
  // (The head is level with the pipe's floor: its shoulders stand over it. He gets onto one by carving up the
  // trough's wall and out over its rim.)
  let onShoulder = 0;
  const crumbs = def.collectibles.filter((c) => Math.abs(c.x - lane) < 1e-6 && c.z > L.kicker.z1 && c.z < L.pipeB.z0 + 16);
  const nearest = crumbs.map(() => Infinity);
  const run = ride(1, 700, (p) => ({ move: p.position.z < 5 ? v(0, 0) : hold(lane)(p) }), (p) => p.position.z > L.pipeB.z0 + 16, (p) => {
    if (p.position.z > 24 && p.position.z < L.kicker.z0 && p.grounded && Math.abs(p.position.y - (dropFloor(p.position.z) + rim)) < 0.02) onShoulder++;
    if (p.position.z > L.kicker.z1) high = Math.max(high, p.position.y - ground(p.position.x, p.position.z));
    crumbs.forEach((c, i) => (nearest[i] = Math.min(nearest[i], Math.hypot(p.position.x - c.x, p.position.y + 0.5 - c.y, p.position.z - c.z))));
  });
  check('carving up the trough\'s wall takes him out over its rim onto the shoulder, and he rides on there, level with the rim', run.events[0] === 'ride' && !run.events.includes('bail') && onShoulder > 20 && Math.abs(run.p.position.x - lane) < 1, `${onShoulder} frames on it; ${run.events.join()}`);
  check('...its kicker on the level length throws him well up, and he comes down on the second pipe\'s shoulder still riding', high > L.kicker.high + 1.5 && run.events.filter((e) => e === 'rideLand').length >= 2 && run.p.riding && run.p.grounded, `${high.toFixed(2)} over the shoulder; ${run.events.join()}`);
  check('...and the crumbs over it are along the way it throws him', crumbs.length === KICKER_ARC.length && nearest.every((d) => d < 0.9), nearest.map((d) => d.toFixed(2)).join());
}

// ---- The rails ----
{
  const rail = L.rails.x;
  let pressed = false;
  let before = 0;
  let after = 0;
  let onRail = 0;
  let hopped = false;
  const run = ride(-1.0, 1500, (p) => {
    if (p.grinding) {
      // (He hops off it as it levels out in the station: the buffers are across the end of the line.)
      const hop = !hopped && p.position.z > L.station.z0 + 1;
      if (hop) hopped = true;
      return { jumpPressed: hop, jumpHeld: hop };
    }
    if (hopped) return { move: v(0, -1) };
    const onBed = p.position.z > L.rail.z0 + 3;
    const near = onBed && Math.abs(p.position.x + rail) < TUNING.grind.reach - 0.2;
    const press = !pressed && near && p.grounded;
    if (press) {
      pressed = true;
      before = Math.hypot(p.velocity.x, p.velocity.z);
    }
    return { stowPressed: press, move: hold(onBed ? -rail + 0.45 : -1.0)(p) };
  }, (p) => hopped && !p.riding, (p) => {
    if (p.grinding) {
      onRail++;
      after = Math.abs(p.velocity.z);
      if (Math.abs(p.position.x + rail) > 1e-6) onRail = -9999;
    }
  });
  check('THE RAILS: riding beside one on the railway, STOW puts his shield on it and he grinds it, down its middle', run.events.includes('grind') && onRail > 60, `${onRail} frames on it; ${run.events.join()}`);
  check('...it is low enough to ride over, and is a rail to grind all the same', L.rails.high <= TUNING.physics.stepHeight && L.rails.high < TUNING.grind.drop);
  check('...he keeps his speed on it all the way down the slope and into the station', after >= before - 1.5 && after > TUNING.move.run, `${before.toFixed(1)} on, ${after.toFixed(1)} at the end`);
  check('...a hop in the station takes him off it, still riding, and there is room to stop short of the buffers', hopped && run.events.includes('ollie') && !run.events.includes('bail') && run.events[run.events.length - 1] === 'rideEnd' && run.p.position.z < L.buffers.z0 - 2, `${run.events.join()}; ends z ${run.p.position.z.toFixed(1)}`);
  // Left on it, the buffers end his grind the hard way.
  let pressed2 = false;
  const crash = ride(-1.0, 1500, (p) => {
    if (p.grinding) return {};
    const onBed = p.position.z > L.rail.z0 + 3;
    const press = !pressed2 && onBed && p.grounded && Math.abs(p.position.x + rail) < TUNING.grind.reach - 0.2;
    if (press) pressed2 = true;
    return { stowPressed: press, move: hold(onBed ? -rail + 0.45 : -1.0)(p) };
  }, (p) => pressed2 && !p.riding);
  check('...left on it, the buffers at the end of the line throw him off', crash.events.includes('grind') && crash.events.includes('bail') && crash.p.position.z > L.buffers.z0 - 3, `${crash.events.join()}; z ${crash.p.position.z.toFixed(1)}`);
}

// ---- On his feet ----
{
  // He can walk the whole of it, down and up again: nothing in it traps him.
  const p = new PlayerController(new THREE.Vector3(-1, L.head.y, -3));
  const ev: MoveEvent[] = [];
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  for (let i = 0; i < 3200 && p.position.z < L.station.z0 + 2; i++) {
    p.update(DT, inp({ move: v((-1 - p.position.x) * 0.5, 1).normalize(), run: true }), cs);
    if (p.moveEvent) ev.push(p.moveEvent);
  }
  check('on his feet he can walk the whole of it down, never sliding and never on his shield', p.position.z >= L.station.z0 + 2 && !ev.includes('slip') && !ev.includes('ride'), `got to z ${p.position.z.toFixed(1)}; ${ev.join()}`);
  for (let i = 0; i < 5200 && p.position.z > 1; i++) p.update(DT, inp({ move: v((-1 - p.position.x) * 0.5, -1).normalize(), run: true }), cs);
  check('...and back up to the head: he is never stuck at the bottom', p.position.z <= 1 && Math.abs(p.position.y - L.head.y) < 0.6, `got back to z ${p.position.z.toFixed(1)}, y ${p.position.y.toFixed(1)}`);
  // The crumbs: each is over ground, within a jump of it, and inside nothing.
  const bad = def.collectibles.filter((c) => {
    const g = ground(c.x, c.z);
    const inside = cs.some((b) => c.x > b.min.x && c.x < b.max.x && c.z > b.min.z && c.z < b.max.z && c.y < topAt(b, c.x, c.z) - 1e-6 && c.y > b.min.y);
    const thrown = Math.abs(Math.abs(c.x) - (L.kicker.x0 + L.kicker.x1) / 2) < 1e-6;
    return inside || c.y - g < 0.3 || c.y - g > (thrown ? 4.5 : 1.3);
  });
  check('there are crumbs down the lines worth taking, each over the ground and inside nothing', def.collectibles.length >= 30 && bad.length === 0, `${def.collectibles.length} crumbs; ${bad.length} badly placed`);
  check('nothing in it is tipped two ways but the pipes\' own planes, and none of those is tipped the wrong way', cs.filter((b) => b.ramp?.cross).every((b) => slopeXZ(b)[1] < 0 && Math.sign(slopeXZ(b)[0]) === Math.sign((b.min.x + b.max.x) / 2) && Math.abs((b.min.x + b.max.x) / 2) < dropTroughHalf()));
}

console.log(failures === 0 ? 'longdrop: all passed' : `longdrop: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
