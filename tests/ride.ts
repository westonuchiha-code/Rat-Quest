// Riding the shield (step two of the slopes the owner asked for, 2026-11-15): "he rides it like a skateboard, we
// could even give him a kick flip ... he uses his tail to balance and make hard curves."
//
// Played with the real controller: when a ride starts and when it does not, what the slope, the stick and the flat
// do to it, the ollie and the kickflip, and every way of coming off.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, type PlayerInput, type MoveEvent } from '../src/player/controller';
import { aabbOf, type Aabb } from '../src/world/collision';
import { extent, rampBox } from '../src/world/layout';
import { TUNING } from '../src/data/tuning';
import { RatModel, RIDE_MOUNT, RIDE_DISMOUNT, type RatAnimInput } from '../src/player/ratModel';

const DT = 1 / 60;
const R = TUNING.ride;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgeHeld: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o } as PlayerInput);
const v = (x: number, z: number): THREE.Vector3 => new THREE.Vector3(x, 0, z);
const speedOf = (p: PlayerController): number => Math.hypot(p.velocity.x, p.velocity.z);

/**
 * A big floor; a hill whose top is a landing at x 0..6, `rise` up, with a slope running down from x = 0 toward -x for
 * `len` (so the way down is -x), eight wide. Beyond its foot the floor runs on a long way.
 */
function hill(len: number, rise: number): Aabb[] {
  return [aabbOf(extent('floor', -120, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -len, 0, -4, 4, 0, rise, 'e')), aabbOf(extent('stone', 0, 6, 0, rise, -4, 4))];
}
interface Run { p: PlayerController; events: MoveEvent[] }
/** He starts on the landing and runs down the slope; `at` gives his input each frame. */
function play(cs: Aabb[], rise: number, frames: number, at: (i: number, p: PlayerController) => Partial<PlayerInput>, from = new THREE.Vector3(3, rise, 0)): Run {
  const p = new PlayerController(from.clone());
  const events: MoveEvent[] = [];
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  for (let i = 0; i < frames; i++) {
    p.update(DT, inp(at(i, p)), cs);
    if (p.moveEvent) events.push(p.moveEvent);
  }
  return { p, events };
}
const WEST = v(-1, 0);
/** Runs down, and sneaks from the moment he is on the slope: the ordinary way onto the shield. */
const sneakOnSlope = (extra: (i: number, p: PlayerController) => Partial<PlayerInput> = () => ({})) => (i: number, p: PlayerController): Partial<PlayerInput> =>
  p.riding ? { move: v(0, 0), run: false, ...extra(i, p) } : { move: WEST, run: p.position.x > -1 };

// ---- Getting on ----
{
  const cs = hill(16, 8);
  const a = play(cs, 8, 70, sneakOnSlope());
  check('running down a slope, SNEAK puts him on his shield', a.p.riding && a.p.state === 'ride' && a.events.includes('ride'), a.events.join());
  const b = play(cs, 8, 200, () => ({ move: WEST, run: true }));
  check('running down it without sneaking, he just runs', !b.events.includes('ride') && !b.p.riding);
  const c = play(cs, 8, 200, () => ({ move: WEST, run: false }));
  check('walking down it at a sneak (never having run), he just walks', !c.events.includes('ride'));
  const flat = play(cs, 8, 120, (i) => ({ move: WEST, run: i < 60 }), new THREE.Vector3(-40, 0, 0));
  check('on the flat, running and then sneaking does nothing of the kind', !flat.events.includes('ride'));
  const up = play(cs, 8, 160, (i, p) => ({ move: v(1, 0), run: p.position.x < -12 }), new THREE.Vector3(-22, 0, 0));
  check('nor running UP a slope: it is for going down', !up.events.includes('ride'));
  const stowed = play(cs, 8, 200, (i, p) => (i < 50 ? { stowPressed: i === 0 } : { move: WEST, run: p.position.x > -1 }));
  check('with his weapons on his back he cannot: the shield has to be in his hand', !stowed.p.armed && !stowed.events.includes('ride'));
  const gentle = play([cs[0], aabbOf(rampBox('stone', -30, 0, -4, 4, 0, 3, 'e')), aabbOf(extent('stone', 0, 6, 0, 3, -4, 4))], 3, 120, sneakOnSlope());
  check('a slope too gentle to bother with (one up in ten) does not start one', R.minSlope > 0.1 && !gentle.events.includes('ride'));
}

// ---- What the slope, the flat and the stick do ----
{
  const cs = hill(16, 8);
  const a = play(cs, 8, 150, sneakOnSlope());
  check('the slope pulls him down it: well before its foot he is going faster than he can run', a.p.riding && speedOf(a.p) > TUNING.move.run + 3 && a.p.grounded, `${speedOf(a.p).toFixed(1)} at x ${a.p.position.x.toFixed(1)}`);
  const top = play(cs, 8, 600, sneakOnSlope());
  let fastest = 0;
  const b = play(cs, 8, 900, (i, p) => {
    fastest = Math.max(fastest, speedOf(p));
    return sneakOnSlope()(i, p);
  });
  check('he never goes faster than the ride\'s top speed', fastest <= R.max + 1e-6 && fastest > 11, `${fastest.toFixed(1)} of ${R.max}`);
  check('on the flat he rolls on a long way, slowing, and then steps off by himself', !b.p.riding && b.events.includes('rideEnd') && b.p.position.x < -50 && b.p.state !== 'hurt', `stepped off at x ${b.p.position.x.toFixed(0)}`);
  void top;
  // Steering: the stick held across his way turns him.
  const steer = (move: THREE.Vector3, frames: number): Run => play(cs, 8, 260, (i, p) => (p.riding && p.position.x < -17 && i < 150 + frames ? { move, run: false } : sneakOnSlope()(i, p)));
  const straight = steer(v(0, 0), 0);
  const soft = steer(v(-0.8, -0.6).normalize().multiplyScalar(1), 60);
  check('with the stick alone he goes straight', Math.abs(straight.p.position.z) < 0.01);
  check('the stick held to one side turns him that way', soft.p.position.z < -3, `ended ${soft.p.position.z.toFixed(1)} to that side`);
  // A carve: hard over turns faster and costs speed.
  const turned = (side: number): { heading: number; speed: number } => {
    const p = new PlayerController(new THREE.Vector3(-40, 0, 0));
    const flatFloor = [cs[0]];
    // (Put straight onto the shield at speed, on the flat, by way of a short slope.)
    const r = play([...flatFloor, aabbOf(rampBox('stone', -16, 0, -4, 4, 0, 8, 'e')), cs[2]], 8, 190, sneakOnSlope());
    void p;
    const q = r.p;
    const h0 = Math.atan2(q.velocity.x, q.velocity.z);
    for (let i = 0; i < 30; i++) {
      // Across his way: his heading is -x, so +z is "left" of it or right, no matter; the size is what counts.
      const hx = Math.sin(Math.atan2(q.velocity.x, q.velocity.z)), hz = Math.cos(Math.atan2(q.velocity.x, q.velocity.z));
      const fwd = Math.sqrt(Math.max(0, 1 - side * side));
      q.update(DT, inp({ move: new THREE.Vector3(hz * side + hx * fwd, 0, -hx * side + hz * fwd), run: false }), flatFloor);
    }
    const h1 = Math.atan2(q.velocity.x, q.velocity.z);
    return { heading: Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))), speed: speedOf(q) };
  };
  const gentleTurn = turned(0.7);
  const carve = turned(1);
  check('hard over is a carve: he turns much faster than with the stick part way', carve.heading > gentleTurn.heading * 2 && Math.abs(carve.heading - R.turn * R.carve * 0.5) < 0.1, `${carve.heading.toFixed(2)} radians in half a second against ${gentleTurn.heading.toFixed(2)}`);
  check('...and it scrubs speed off', carve.speed < gentleTurn.speed - 1, `${carve.speed.toFixed(1)} against ${gentleTurn.speed.toFixed(1)}`);
  // The brake: the stick pulled back against his way.
  const braked = play(cs, 8, 260, (i, p) => (p.riding && p.position.x < -20 ? { move: v(1, 0), run: false } : sneakOnSlope()(i, p)));
  check('the stick pulled back brakes him: he is off the shield long before he would have rolled to a stop', !braked.p.riding && braked.p.position.x > -40, `stopped at x ${braked.p.position.x.toFixed(0)}`);
  // Up a slope he loses speed.
  const twin = [cs[0], cs[1], cs[2], aabbOf(rampBox('stone', -60, -44, -4, 4, 0, 8, 'w')), aabbOf(extent('stone', -66, -60, 0, 8, -4, 4))];
  let highest = 0;
  let riding = false;
  const upAgain = play(twin, 8, 700, (i, p) => {
    // (Only while he is on the shield: once it has stopped he steps off and would walk on.)
    if (p.position.x < -44 && p.riding) {
      highest = Math.max(highest, p.position.y);
      riding = true;
    }
    return sneakOnSlope()(i, p);
  });
  check('a slope the other side takes him up it on what speed he has, but not as high as he started', riding && highest > 1.5 && highest < 7, `${highest.toFixed(1)} up of 8`);
  void upAgain;
}

// ---- How he and his shield lie ----
{
  // One up in two, going straight down it: the ground falls half a unit for each one forward, and is level across him.
  const a = play(hill(16, 8), 8, 70, sneakOnSlope());
  const g = a.p.rideGround;
  check('his shield lies on the slope: nose down going down it, level across', a.p.riding && Math.abs(g.along + 0.5) < 0.05 && Math.abs(g.across) < 0.05, `along ${g.along.toFixed(2)} across ${g.across.toFixed(2)}`);
  const b = play(hill(16, 8), 8, 400, sneakOnSlope());
  const flat = b.p.rideGround;
  check('...and level again on the flat at its foot', b.p.position.y < 0.01 && flat.along === 0 && flat.across === 0);
}

// ---- Too steep to stand on ----
{
  // Two up for one along: he cannot walk it. From the landing at its top he steps onto it and is away.
  const cs = hill(4, 8);
  const a = play(cs, 8, 60, () => ({ move: WEST, run: true }));
  check('on a slope too steep to stand on he slides whether he chose to or not', a.events.includes('ride') && a.p.riding, a.events.join());
  // (He is put on it as he runs off the landing: he does not sail out over it and come down at its foot.)
  let offIt = 0;
  let high = 0;
  play(cs, 8, 60, (i, p) => {
    if (p.position.x < -0.4 && p.position.x > -3.6) {
      if (!p.grounded) offIt++;
      if (p.riding) high = Math.max(high, p.position.y);
    }
    return { move: WEST, run: true };
  });
  check('...run off the landing onto it and he is sliding from its top, never in the air over it', offIt === 0 && high > 6.5, `frames in the air ${offIt}, riding from ${high.toFixed(2)}`);
  const b = play(cs, 8, 200, (i, p) => (p.riding ? { move: v(1, 0), run: true } : { move: WEST, run: true }));
  check('...he cannot stop on it, brake as he may: he is at its foot before he can step off', b.p.position.y < 0.01 && b.p.position.x < -4);
  // Sliding down it he can still lean across it: the slope is not a wall to one going down or across.
  const across = play(cs, 8, 45, (i, p) => (p.riding ? { move: v(0, 1), run: true } : { move: WEST, run: true }));
  check('...sliding down it he can still steer across it', across.p.position.z > 0.15, `z ${across.p.position.z.toFixed(2)}`);
  // From its foot it is a wall: he cannot run up it, and jumping at it he is never thrown about, only slid back down.
  let jerk = 0;
  let last = -6;
  let top = 0;
  const up = play(cs, 8, 240, (i, p) => {
    jerk = Math.max(jerk, Math.abs(p.position.x - last));
    last = p.position.x;
    top = Math.max(top, p.position.y);
    return i < 150 ? { move: v(1, 0), run: true, jumpPressed: i % 40 === 20, jumpHeld: i % 40 >= 20 } : {};
  }, new THREE.Vector3(-6, 0, 0));
  check('...from its foot he cannot climb it, run or jump at it as he may', top < 5 && up.p.position.y < 0.01 && up.p.position.x < -3.5, `reached ${top.toFixed(2)}, ended at x ${up.p.position.x.toFixed(2)} y ${up.p.position.y.toFixed(2)}`);
  check('...and it never throws him: no step moves him further than a rider goes', jerk < R.max * DT + 0.05, `furthest in a step ${jerk.toFixed(2)}`);
  const c = play(cs, 8, 900, (i) => (i < 30 ? { move: WEST, run: true } : {}));
  check('...and at its foot, with nothing held, he rolls out and steps off', !c.p.riding && c.p.grounded && c.p.position.y < 0.01);
}

// ---- The ollie and the kickflip ----
{
  const cs = hill(16, 8);
  // On the flat past the foot, he jumps.
  const jumpAt = (frame: number, second: number | null): Run & { peak: number; air: number; speedIn: number; speedOut: number } => {
    let started = -1;
    let peak = 0;
    let air = 0;
    let speedIn = 0;
    let speedOut = 0;
    let wasAir = false;
    const r = play(cs, 8, 420, (i, p) => {
      if (p.riding && p.position.x < -20 && started < 0) started = i;
      const k = started < 0 ? -1 : i - started;
      if (k === 0) speedIn = speedOf(p);
      if (k > 0 && !p.grounded) {
        peak = Math.max(peak, p.position.y);
        air++;
        wasAir = true;
      } else if (wasAir && speedOut === 0 && p.grounded) speedOut = speedOf(p);
      if (k >= 0 && k < 200) return { run: false, jumpPressed: k === 0 || (second !== null && k === second), jumpHeld: true };
      return sneakOnSlope()(i, p);
    });
    void frame;
    return { ...r, peak, air, speedIn, speedOut };
  };
  const ollie = jumpAt(0, null);
  check('jump is an ollie: he and the shield leave the ground together, and he lands still riding', ollie.events.includes('ollie') && ollie.events.includes('rideLand') && Math.abs(ollie.peak - (R.ollie * R.ollie) / (2 * TUNING.physics.gravity)) < 0.15, `${ollie.peak.toFixed(2)} up, ${ollie.air} frames in the air`);
  check('...he keeps his speed through it', Math.abs(ollie.speedOut - ollie.speedIn) < 0.2, `${ollie.speedIn.toFixed(1)} in, ${ollie.speedOut.toFixed(1)} out`);
  const flip = jumpAt(0, 8);
  check('a second jump in the air is a kickflip, and landing one gives him a little speed', flip.events.includes('kickflip') && flip.events.includes('trick') && !flip.events.includes('bail') && flip.speedOut >= Math.min(R.max, flip.speedIn + R.trickBoost) - 0.3, `${flip.speedIn.toFixed(1)} in, ${flip.speedOut.toFixed(1)} out`);
  check('...it takes the place of his double jump (he has no other in the air)', flip.events.filter((e) => e === 'kickflip').length === 1);
  // Down before the shield has come round: he comes off. (A kickflip lifts him enough to finish one in open air, so
  // this is for landing early, on something higher; here the shield is simply made to turn too slowly to finish.)
  const flipTime = R.flipTime;
  (R as { flipTime: number }).flipTime = 1.5;
  const late = jumpAt(0, 8);
  (R as { flipTime: number }).flipTime = flipTime;
  check('a kickflip not finished when he lands throws him off: no harm but to his pride', late.events.includes('bail') && late.p.hp === TUNING.health.max && !late.p.riding, late.events.join());
}

// ---- A ramp throws him ----
{
  // The hill, and on the floor past its foot a kicker three long and 1.2 high, its high end to the west.
  const cs = [...hill(16, 8), aabbOf(rampBox('stone', -26, -23, -4, 4, 0, 1.2, 'w'))];
  const launch = (jump: boolean): { top: number; events: MoveEvent[] } => {
    let top = 0;
    let done = false;
    const r = play(cs, 8, 260, (i, p) => {
      if (p.position.x < -23) top = Math.max(top, p.position.y);
      if (!p.riding) return { move: p.position.x < -20 ? v(0, 0) : WEST, run: p.position.x > -1 };
      const pop = jump && !done && p.grounded && p.position.x < -25.4;
      if (pop) done = true;
      // (Down past it he brakes, so that the room's end is no part of this.)
      return { move: p.grounded && p.position.x < -30 ? v(1, 0) : v(0, 0), run: false, jumpPressed: pop, jumpHeld: pop || (done && !p.grounded) };
    });
    return { top, events: r.events };
  };
  const plain = launch(false);
  check('riding off the top of a kicker he is thrown up, well above its top, with no button pressed', plain.top > 1.2 + 0.6 && plain.events.includes('rideLand'), `top ${plain.top.toFixed(2)}; ${plain.events.join()}`);
  const popped = launch(true);
  check('...and a jump at its lip goes higher than the same jump on the flat', popped.top > plain.top + 1.5 && popped.events.includes('ollie'), `top ${popped.top.toFixed(2)}; ${popped.events.join()}`);
}

// ---- Getting on is a hop, not a snap (the owner, 2026-11-15) ----
{
  const rat = new RatModel();
  const base: RatAnimInput = { state: 'run', planarSpeed: 6, comboStep: 0, attackTime: 0, dodgeKind: 'roll', dodgeProgress: 0, verticalSpeed: 0, flipProgress: 0, armed: true, stowProgress: -1, plungeStage: 0 };
  const step = (state: RatAnimInput['state'], n: number, each?: () => void): void => {
    for (let i = 0; i < n; i++) {
      rat.update(DT, { ...base, state });
      each?.();
    }
  };
  step('run', 40);
  check('running, his shield is on his arm and there is none under his feet', rat.shieldOnArm && !rat.boardShown && rat.mountProgress < 0);
  // The first frame of the ride.
  step('ride', 1);
  const startHeight = rat.boardHeight();
  check('the moment he gets on, the shield is still where it was on his arm: it has not jumped to his feet', rat.mountProgress >= 0 && rat.boardShown && !rat.shieldOnArm && startHeight > 0.3, `${startHeight.toFixed(2)} up`);
  let hop = 0;
  let smears = 0;
  let lastHeight = startHeight;
  let rose = 0;
  let frames = 1;
  step('ride', Math.ceil(RIDE_MOUNT / DT) + 2, () => {
    hop = Math.max(hop, rat.hopHeight);
    smears = Math.max(smears, rat.smearsShown);
    rose = Math.max(rose, rat.boardHeight() - lastHeight);
    lastHeight = rat.boardHeight();
    if (rat.mountProgress >= 0) frames++;
  });
  check('it takes a third of a second or so: a score of frames to be seen in', frames >= 18 && frames <= 26, `${frames} frames`);
  check('he hops: off the ground and down again', hop > 0.2 && rat.hopHeight === 0, `${hop.toFixed(2)} up at the top`);
  check('the shield goes DOWN to the ground all the way (never back up), trailing smears as it goes', rose < 0.02 && smears === 2, `rose ${rose.toFixed(3)} at most; ${smears} smears`);
  check('...and ends lying under his feet, the smears gone', rat.mountProgress < 0 && rat.smearsShown === 0 && rat.boardShown && Math.abs(rat.boardHeight() - 0.03) < 0.01, `${rat.boardHeight().toFixed(3)} up`);
  // Stepping off: it comes back up onto his arm.
  let up = 0;
  let offFrames = 0;
  step('run', 1);
  check('stepping off, the shield is still on the ground the first moment, and comes up', rat.dismountProgress >= 0 && rat.boardShown && !rat.shieldOnArm && rat.boardHeight() < 0.1, `${rat.boardHeight().toFixed(2)} up`);
  step('run', Math.ceil(RIDE_DISMOUNT / DT) + 2, () => {
    if (rat.dismountProgress >= 0) {
      offFrames++;
      up = Math.max(up, rat.boardHeight());
    }
  });
  check('...and is on his arm again a fifth of a second later', rat.dismountProgress < 0 && rat.shieldOnArm && !rat.boardShown && up > 0.3 && offFrames >= 8, `${offFrames} frames, ${up.toFixed(2)} up`);
  // Thrown off, there is no show: it is on his arm as he tumbles.
  step('ride', 30);
  step('hurt', 1);
  check('thrown off it, nothing is played: no shield left turning in the air', rat.dismountProgress < 0 && !rat.boardShown && rat.smearsShown === 0);
}

// ---- Coming off ----
{
  const cs = hill(16, 8);
  const wall = [...cs, aabbOf(extent('wall', -30, -29, 0, 6, -8, 8))];
  const hit = play(wall, 8, 400, sneakOnSlope());
  check('riding into a wall at speed throws him off it: he is knocked back and takes a moment to get up, unhurt', hit.events.includes('bail') && !hit.p.riding && hit.p.hp === TUNING.health.max && hit.p.position.x > -29);
  const off = play(cs, 8, 200, (i, p) => (p.riding && p.position.x < -20 ? { dodgePressed: true, run: false } : sneakOnSlope()(i, p)));
  check('the dodge button steps him off it', off.events.includes('rideEnd') && !off.p.riding && off.p.hp === TUNING.health.max);
  let guarded = false;
  let swung = false;
  const busy = play(cs, 8, 200, (i, p) => {
    if (p.riding && p.position.x < -18) {
      guarded = guarded || p.guarding;
      swung = swung || p.state === 'attack' || p.state === 'plunge';
      return { guardHeld: true, attackPressed: i % 7 === 0, run: false };
    }
    return sneakOnSlope()(i, p);
  });
  check('he cannot guard or swing from it: the shield is under his feet', busy.events.includes('ride') && !guarded && !swung);
  const struck = play(cs, 8, 140, sneakOnSlope());
  const before = struck.p.hp;
  struck.p.takeHit(struck.p.position.x - 1, struck.p.position.z, 1);
  struck.p.update(DT, inp({}), cs);
  check('a blow knocks him off it like any other blow', struck.p.hp === before - 1 && !struck.p.riding && struck.p.state === 'hurt');
  // Stepping off with SNEAK still held on the slope: he is not straight back on it.
  const at: Array<[MoveEvent, number]> = [];
  const p = new PlayerController(new THREE.Vector3(3, 8, 0));
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  let stepped = false;
  for (let i = 0; i < 200; i++) {
    const off2 = p.riding && p.position.x < -4 && !stepped;
    if (off2) stepped = true;
    // (Off it, he keeps SNEAK held for half a second, then runs on down for a third of one, then sneaks again.)
    const since = at.find(([e]) => e === 'rideEnd') ? i - at.find(([e]) => e === 'rideEnd')![1] : -1;
    p.update(DT, inp(p.riding ? { run: false, dodgePressed: off2 } : { move: WEST, run: stepped ? since >= 30 && since < 50 : p.position.x > -1 }), cs);
    if (p.moveEvent) at.push([p.moveEvent, i]);
  }
  const ends = at.find(([e]) => e === 'rideEnd');
  const next = at.find(([e, i]) => e === 'ride' && !!ends && i > ends[1]);
  check('stepping off with SNEAK still held, he is not put straight back on; a fresh run and a sneak gets him on again', !!ends && !!next && next[1] - ends[1] >= 50, at.map(([e, i]) => `${e} ${i}`).join(', '));
}

console.log(failures === 0 ? 'ride: all passed' : `ride: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
