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
/**
 * Runs onto the slope, jumps, and in the air over it presses ATTACK: the way onto the shield. (The owner, 2026-11-15:
 * "he should go into his shield surfing if he presses the downward attack when the slope below him is beyond a
 * certain incline".) Once he is on it, what `extra` says.
 */
const surfOnSlope = (extra: (i: number, p: PlayerController) => Partial<PlayerInput> = () => ({})) => (i: number, p: PlayerController): Partial<PlayerInput> =>
  p.riding
    ? { move: v(0, 0), run: false, ...extra(i, p) }
    : { move: WEST, run: true, jumpPressed: p.grounded && p.position.x < -0.5, jumpHeld: !p.grounded, attackPressed: !p.grounded && p.position.x < -0.5 && p.velocity.y < 4 };

// ---- Getting on ----
{
  const cs = hill(16, 8);
  let inTheAir = false;
  const a = play(cs, 8, 120, (i, p) => {
    const r = surfOnSlope()(i, p);
    if (r.attackPressed) inTheAir = !p.grounded;
    return r;
  });
  check('in the air over a slope, ATTACK puts his shield under his feet: he comes down on the slope riding it', a.p.riding && a.p.state === 'ride' && inTheAir && a.events.includes('ride') && a.events.includes('rideLand') && a.p.plungeStage === 0, a.events.join());
  const b = play(cs, 8, 200, () => ({ move: WEST, run: true }));
  check('running down it he just runs: nothing but the air attack starts a ride', !b.events.includes('ride') && !b.p.riding);
  // (SNEAK was the way on at first: it is not any more.)
  const c = play(cs, 8, 200, (i, p) => ({ move: WEST, run: p.position.x > -1 }));
  check('...not running down it and then sneaking, which was the first way', !c.events.includes('ride') && !c.p.riding);
  const ground = play(cs, 8, 120, (i, p) => ({ move: WEST, run: true, attackPressed: p.grounded && p.position.x < -3 && i % 30 === 0 }));
  check('ATTACK on the ground on a slope is his sword, as anywhere', !ground.events.includes('ride') && !ground.p.riding);
  const flat = play(cs, 8, 120, (i, p) => ({ move: WEST, run: true, jumpPressed: i === 20, jumpHeld: i >= 20, attackPressed: !p.grounded && p.velocity.y < 4 }), new THREE.Vector3(-40, 0, 0));
  check('in the air over the flat it is the dive it always was', !flat.events.includes('ride') && !flat.p.riding);
  // Over a slope gentler than the mark, too: the dive is still his there.
  const gentleHill = [cs[0], aabbOf(rampBox('stone', -30, 0, -4, 4, 0, 30 * (R.minSlope - 0.1), 'e')), aabbOf(extent('stone', 0, 6, 0, 30 * (R.minSlope - 0.1), -4, 4))];
  const gentle = play(gentleHill, 30 * (R.minSlope - 0.1), 120, surfOnSlope());
  check('over a slope gentler than the mark it is the dive too', R.minSlope > 0.15 && !gentle.events.includes('ride') && !gentle.p.riding);
  const marked = [cs[0], aabbOf(rampBox('stone', -30, 0, -4, 4, 0, 30 * R.minSlope, 'e')), aabbOf(extent('stone', 0, 6, 0, 30 * R.minSlope, -4, 4))];
  check('...and over one just at the mark, the shield', play(marked, 30 * R.minSlope, 120, surfOnSlope()).p.riding);
  // With his weapons on his back it works as well: the shield comes off his back.
  const stowed = play(cs, 8, 220, (i, p) => (i < 50 ? { stowPressed: i === 0 } : surfOnSlope()(i, p)));
  check('with his weapons on his back it works the same', !stowed.p.armed && stowed.events.includes('ride') && stowed.p.riding, stowed.events.join());
  // Straight up and down over the slope, with no run at all: he comes down on it and the slope takes him.
  let still = 0;
  const standing = play(cs, 8, 200, (i, p) => (p.riding ? { run: false } : { jumpPressed: i === 0, jumpHeld: true, attackPressed: !p.grounded && p.velocity.y < 2 }), new THREE.Vector3(-4, 6, 0));
  still = speedOf(standing.p);
  check('from a standing jump on the slope it works too, and the slope takes him: he is not stepped off for being slow', standing.events.includes('ride') && !standing.events.includes('rideEnd') && (standing.p.riding || standing.p.position.x < -16) && still >= 0, standing.events.join());
  // Too far above it, it is the dive.
  const highUp = [aabbOf(extent('floor', -120, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -16, 0, -4, 4, 0, 8, 'e')), aabbOf(extent('stone', -8.4, -7.6, 0, 4 + R.surfDrop + 3, 6, 7))];
  const far = new PlayerController(new THREE.Vector3(-8, 4 + R.surfDrop + 3, 6.5));
  for (let i = 0; i < 10; i++) far.update(DT, inp({}), highUp);
  let farRide = false;
  for (let i = 0; i < 40; i++) {
    far.update(DT, inp({ move: v(0, -1), run: true, attackPressed: !far.grounded && far.position.z < 3.9 && far.plungeStage === 0 }), highUp);
    farRide ||= far.riding;
  }
  check('too far above the slope it is the dive', !farRide && far.plungeStage !== 0, `plunge stage ${far.plungeStage}`);
}

// ---- What the slope, the flat and the stick do ----
{
  const cs = hill(16, 8);
  const a = play(cs, 8, 150, surfOnSlope());
  check('the slope pulls him down it: well before its foot he is going faster than he can run', a.p.riding && speedOf(a.p) > TUNING.move.run + 3 && a.p.grounded, `${speedOf(a.p).toFixed(1)} at x ${a.p.position.x.toFixed(1)}`);
  const top = play(cs, 8, 600, surfOnSlope());
  let fastest = 0;
  const b = play(cs, 8, 900, (i, p) => {
    fastest = Math.max(fastest, speedOf(p));
    return surfOnSlope()(i, p);
  });
  check('he never goes faster than the ride\'s top speed', fastest <= R.max + 1e-6 && fastest > 11, `${fastest.toFixed(1)} of ${R.max}`);
  check('on the flat he rolls on a long way, slowing, and then steps off by himself', !b.p.riding && b.events.includes('rideEnd') && b.p.position.x < -50 && b.p.state !== 'hurt', `stepped off at x ${b.p.position.x.toFixed(0)}`);
  void top;
  // Steering: the stick held across his way turns him.
  const steer = (move: THREE.Vector3, frames: number): Run => play(cs, 8, 260, (i, p) => (p.riding && p.position.x < -17 && i < 150 + frames ? { move, run: false } : surfOnSlope()(i, p)));
  const straight = steer(v(0, 0), 0);
  const soft = steer(v(-0.8, -0.6).normalize().multiplyScalar(1), 60);
  check('with the stick alone he goes straight', Math.abs(straight.p.position.z) < 0.01);
  check('the stick held to one side turns him that way', soft.p.position.z < -3, `ended ${soft.p.position.z.toFixed(1)} to that side`);
  // A carve: hard over turns faster and costs speed.
  const turned = (side: number): { heading: number; speed: number } => {
    const p = new PlayerController(new THREE.Vector3(-40, 0, 0));
    const flatFloor = [cs[0]];
    // (Put straight onto the shield at speed, on the flat, by way of a short slope.)
    const r = play([...flatFloor, aabbOf(rampBox('stone', -16, 0, -4, 4, 0, 8, 'e')), cs[2]], 8, 190, surfOnSlope());
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
  const braked = play(cs, 8, 260, (i, p) => (p.riding && p.position.x < -20 ? { move: v(1, 0), run: false } : surfOnSlope()(i, p)));
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
    return surfOnSlope()(i, p);
  });
  check('a slope the other side takes him up it on what speed he has, but not as high as he started', riding && highest > 1.5 && highest < 7, `${highest.toFixed(1)} up of 8`);
  void upAgain;
}

// ---- How he and his shield lie ----
{
  // One up in two, going straight down it: the ground falls half a unit for each one forward, and is level across him.
  const a = play(hill(16, 8), 8, 125, surfOnSlope());
  const g = a.p.rideGround;
  check('his shield lies on the slope: nose down going down it, level across', a.p.riding && Math.abs(g.along + 0.5) < 0.05 && Math.abs(g.across) < 0.05, `along ${g.along.toFixed(2)} across ${g.across.toFixed(2)}`);
  const b = play(hill(16, 8), 8, 400, surfOnSlope());
  const flat = b.p.rideGround;
  check('...and level again on the flat at its foot', b.p.position.y < 0.01 && flat.along === 0 && flat.across === 0);
}

// ---- Too steep to stand on: he slides on his hide, not on his shield ----
{
  const S = TUNING.slide;
  // Two up for one along: he cannot stand on it. From the landing at its top he runs onto it and is off his feet.
  const cs = hill(4, 8);
  const a = play(cs, 8, 60, () => ({ move: WEST, run: true }));
  check('on ground too steep to stand on he loses his footing and slides: on his hide, not his shield', a.events.includes('slip') && a.p.sliding && a.p.state === 'slide' && !a.p.riding && !a.events.includes('ride'), a.events.join());
  check('...going down it he is on his seat, feet first', !a.p.slideBack);
  // (He is put on it as he runs off the landing: he does not sail out over it and come down at its foot.)
  let offIt = 0;
  let high = 0;
  play(cs, 8, 60, (i, p) => {
    if (p.position.x < -0.4 && p.position.x > -3.6) {
      if (!p.grounded) offIt++;
      if (p.sliding) high = Math.max(high, p.position.y);
    }
    return { move: WEST, run: true };
  });
  check('...run off the landing onto it and he is sliding from its top, never in the air over it', offIt === 0 && high > 6.5, `frames in the air ${offIt}, sliding from ${high.toFixed(2)}`);
  const b = play(cs, 8, 200, (i, p) => (p.sliding ? { move: v(1, 0), run: true } : { move: WEST, run: true }));
  check('...he cannot stop on it, push back as he may: he is at its foot', b.p.position.y < 0.01 && b.p.position.x < -4);
  const c = play(cs, 8, 600, (i) => (i < 30 ? { move: WEST, run: true } : {}));
  check('...and on the flat at its foot he scrapes to a stop and gets up', c.events.includes('slideEnd') && !c.p.sliding && c.p.grounded && c.p.position.y < 0.01 && c.p.state === 'idle', `${c.events.join()}; ${c.p.state}`);
  // While he slides: no sword, no guard, no roll.
  const busy = play(cs, 8, 50, (i, p) => (p.sliding ? { attackPressed: i % 3 === 0, dodgePressed: i % 3 === 1, guardHeld: true } : { move: WEST, run: true }));
  check('...sliding, he cannot swing, guard or roll', busy.p.sliding && busy.p.state === 'slide' && !busy.p.guarding);

  // A long steep slope, to compare the two ways down it: on his hide, and on his shield.
  const long = [aabbOf(extent('floor', -200, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -20, 0, -20, 20, 0, 30, 'e')), aabbOf(extent('stone', 0, 6, 0, 30, -20, 20))];
  // (How far off straight down the slope he has turned: the angle of his going from due west.)
  const off = (p: PlayerController): number => Math.abs(Math.atan2(p.velocity.z, -p.velocity.x));
  let slideTop = 0;
  let slideTurn = 0;
  let slideFrames = 0;
  const hide = play(long, 30, 150, (i, p) => {
    if (p.sliding && p.grounded) {
      slideTop = Math.max(slideTop, speedOf(p));
      if (++slideFrames === 30) slideTurn = off(p);
    }
    return p.sliding ? { move: v(0, 0.7) } : { move: WEST, run: true };
  });
  // (Onto the shield over ground too steep to stand on: he jumps from the landing, before he is on it.)
  let rideTop = 0;
  let rideTurn = 0;
  let rideFrames = 0;
  const board = play(long, 30, 150, (i, p) => {
    if (p.riding && p.grounded) {
      rideTop = Math.max(rideTop, speedOf(p));
      if (++rideFrames === 30) rideTurn = off(p);
    }
    if (p.riding) return { move: p.grounded ? v(0, 0.7) : v(0, 0), run: false };
    return { move: WEST, run: true, jumpPressed: p.grounded && p.position.x < 0.9, jumpHeld: !p.grounded, attackPressed: !p.grounded && p.position.x < -0.3 };
  });
  check('on his hide he is slower than on his shield down the same slope', hide.events.includes('slip') && board.events.includes('ride') && slideTop <= S.max + 1e-6 && rideTop > slideTop + 3, `${slideTop.toFixed(1)} against ${rideTop.toFixed(1)}`);
  check('...and steers a good deal less: half a second of the stick turns him less than half as far', slideTurn > 0.02 && rideTurn > slideTurn * 2, `turned ${slideTurn.toFixed(2)} against ${rideTurn.toFixed(2)}`);
  check('one who is on his shield stays on it down ground too steep to stand on: he does not fall off it onto his hide', !board.events.includes('slip') && !board.p.sliding);

  // Going UP it: he gets a little way, scrabbling, then loses his footing and slides back down on his belly.
  let top = 0;
  let jerk = 0;
  let last = -8;
  let back = false;
  const up = play(cs, 8, 150, (i, p) => {
    jerk = Math.max(jerk, Math.abs(p.position.x - last));
    last = p.position.x;
    top = Math.max(top, p.position.y);
    if (p.sliding) back = p.slideBack;
    return { move: v(1, 0), run: true };
  }, new THREE.Vector3(-8, 0, 0));
  check('going UP it he gets a little way before he slips: more than a step, less than a jump', up.events.includes('slip') && top > 0.6 && top < 2.2, `${top.toFixed(2)} up; ${up.events.join()}`);
  check('...and slides back down it backwards, on his belly, facing the slope he was climbing', back);
  check('...it never throws him: no step moves him further than a slide goes', jerk < S.max * DT + 0.05, `furthest in a step ${jerk.toFixed(2)}`);
  // Nor by jumping: from such ground a jump is the little hop of a slide, and there is no second jump after it.
  let best = 0;
  const hopper = play(cs, 8, 400, (i, p) => {
    best = Math.max(best, p.position.y);
    return { move: v(1, 0), run: true, jumpPressed: i % 7 === 0, jumpHeld: true };
  }, new THREE.Vector3(-8, 0, 0));
  const oneJump = (TUNING.jump.velocity * TUNING.jump.velocity) / (2 * TUNING.physics.gravity);
  check('...nor does jumping get him up it: every jump there is a slide\'s little hop, with no second jump after', hopper.events.includes('slideHop') && best < oneJump + 1.2 && hopper.p.position.y < 4, `best ${best.toFixed(2)} (a jump is ${oneJump.toFixed(2)}); ${hopper.events.slice(0, 6).join()}`);
  // The hop ends the slide: he is in a jump, and looks it; carried as he was going, with no steering; and where he
  // comes down decides what he is next. (The owner, 2026-11-16: "if you jump it should go back into a jump pose and he
  // can slip again if he lands on an [incline] too steep".)
  {
    let hopAt = -1;
    let inAir: string[] = [];
    let slidInAir = 0;
    let turned = 0;
    let slipsAfter = 0;
    let went = 0;
    const again = play(long, 30, 200, (i, p) => {
      // (He hops early, while he is still slow: at a slide's full speed down ground this steep a hop is a long flight.)
      if (hopAt < 0 && p.sliding && p.grounded && p.position.x < -1) hopAt = i;
      if (hopAt >= 0 && i > hopAt) {
        if (!p.grounded && slipsAfter === 0) {
          inAir.push(p.state);
          if (p.sliding) slidInAir++;
          // (East is back up the slope: the stick is held that way all the while he is in the air.)
          turned = Math.max(turned, p.velocity.x - went);
        }
        // (Jump is pressed again and again early in the hop, and let go well before he comes down.)
        if (p.moveEvent === 'slip') slipsAfter++;
      }
      if (i === hopAt + 1) went = p.velocity.x;
      return hopAt < 0 ? { move: WEST, run: true } : i === hopAt ? { jumpPressed: true, jumpHeld: true } : { move: v(1, 0), run: true, jumpPressed: !p.grounded && i < hopAt + 16 && i % 4 === 0, jumpHeld: true };
    });
    check('the hop out of a slide ENDS the slide: in the air he is jumping, then falling, and never in the slide\'s pose', hopAt >= 0 && inAir.length > 10 && slidInAir === 0 && inAir.every((st) => st === 'jump' || st === 'fall') && inAir.includes('jump'), `${inAir.length} frames in the air: ${[...new Set(inAir)].join()}`);
    check('...it is still only a hop: carried as he was going, the stick does not turn him back up the slope, and there is no second jump', turned < 1e-6 && !again.events.includes('wallkick') && !again.events.includes('grab'), `turned ${turned.toFixed(3)}; ${again.events.join()}`);
    check('...coming down on the same too-steep ground, he slips again', slipsAfter >= 1 && again.events.filter((e) => e === 'slip').length >= 2, again.events.join());
    // Hopping off the foot of the slope onto the flat: he lands on his feet.
    let hop2 = false;
    const flat = play(cs, 8, 140, (i, p) => {
      const h = !hop2 && p.sliding && p.grounded && p.position.y < 1.2;
      if (h) hop2 = true;
      return hop2 ? { jumpPressed: h, jumpHeld: true } : { move: WEST, run: true };
    });
    check('...coming down on ground he can stand on, he lands on his feet: no slide, nothing to get up from', hop2 && flat.events.includes('slideHop') && !flat.p.sliding && flat.p.grounded && flat.p.state === 'idle' && flat.events.filter((e) => e === 'slip').length === 1 && !flat.events.includes('slideEnd'), `${flat.events.join()}; ${flat.p.state}`);
  }
  // Out of a slide, onto the shield: hop, and the air attack.
  let hopped = false;
  const out = play(long, 30, 120, (i, p) => {
    if (p.riding) return { run: false };
    if (!p.sliding && !hopped) return { move: WEST, run: true };
    const h = !hopped && p.grounded && p.position.x < -4;
    if (h) hopped = true;
    return { jumpPressed: h, jumpHeld: hopped, attackPressed: hopped && !p.grounded };
  });
  check('out of a slide he can hop and get his shield under him with the air attack', hopped && out.events.includes('slideHop') && out.events.includes('ride') && out.p.riding && !out.p.sliding, out.events.join());
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
      return surfOnSlope()(i, p);
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
      if (!p.riding) return surfOnSlope()(i, p);
      const pop = jump && !done && p.grounded && p.position.x < -25.4;
      if (pop) done = true;
      // (Down past it he brakes, so that the room's end is no part of this.)
      return { move: p.grounded && p.position.x < -30 ? v(1, 0) : v(0, 0), run: false, jumpPressed: pop, jumpHeld: pop || (done && !p.grounded) };
    });
    return { top, events: r.events };
  };
  const plain = launch(false);
  check('riding off the top of a kicker he is thrown up, well above its top, with no button pressed', plain.top > 1.2 + 0.35 && plain.events.includes('rideLand'), `top ${plain.top.toFixed(2)}; ${plain.events.join()}`);
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
  let faceUp = -1;
  const boardParts = rat as unknown as { boardFlat: THREE.Object3D; root: THREE.Object3D };
  let lastHeight = startHeight;
  let rose = 0;
  let frames = 1;
  step('ride', Math.ceil(RIDE_MOUNT / DT) + 2, () => {
    hop = Math.max(hop, rat.hopHeight);
    smears = Math.max(smears, rat.smearsShown);
    boardParts.root.updateMatrixWorld(true);
    faceUp = Math.max(faceUp, new THREE.Vector3(0, 0, 1).applyQuaternion(boardParts.boardFlat.children[0].getWorldQuaternion(new THREE.Quaternion())).y);
    rose = Math.max(rose, rat.boardHeight() - lastHeight);
    lastHeight = rat.boardHeight();
    if (rat.mountProgress >= 0) frames++;
  });
  check('it takes a third of a second or so: a score of frames to be seen in', frames >= 18 && frames <= 26, `${frames} frames`);
  check('he hops: off the ground and down again', hop > 0.2 && rat.hopHeight === 0, `${hop.toFixed(2)} up at the top`);
  check('the shield goes DOWN to the ground all the way (never back up), trailing smears as it goes', rose < 0.02 && smears === 2, `rose ${rose.toFixed(3)} at most; ${smears} smears`);
  check('...it is thrown down and tipped onto its face, never spun over: its painted face never looks up on the way', faceUp < 0.3, `face ${faceUp.toFixed(2)} up at most`);
  check('...and ends lying under his feet, the smears gone', rat.mountProgress < 0 && rat.smearsShown === 0 && rat.boardShown && Math.abs(rat.boardHeight() - 0.056) < 0.01, `${rat.boardHeight().toFixed(3)} up`);
  // Which way up it lies: the wood of its back to his feet, its painted face to the ground.
  {
    const parts = rat as unknown as { boardFlat: THREE.Object3D; root: THREE.Object3D };
    parts.root.updateMatrixWorld(true);
    const mesh = parts.boardFlat.children[0];
    const q = mesh.getWorldQuaternion(new THREE.Quaternion());
    const face = new THREE.Vector3(0, 0, 1).applyQuaternion(q); // (the shield's painted face looks along its own +z)
    const top = new THREE.Vector3(0, 1, 0).applyQuaternion(q); // (...and its top is at its own +y, its point at -y)
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(parts.root.getWorldQuaternion(new THREE.Quaternion()));
    check('he stands on the wood of its back: its painted, curved face is down on the ground, its top forward and its point behind', face.y < -0.99 && top.dot(fwd) > 0.99, `face ${face.y.toFixed(2)} up, top ${top.dot(fwd).toFixed(2)} forward`);
    const box = new THREE.Box3().setFromObject(mesh);
    const ground = parts.root.getWorldPosition(new THREE.Vector3()).y;
    check('...and it is on the ground, not in it: its boss just clear of the stone', box.min.y - ground > 0 && box.min.y - ground < 0.02, `${(box.min.y - ground).toFixed(3)} clear`);
  }
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

// ---- Coming down on a slope, and the top of a climb (what the pipe showed, 2026-11-15) ----
{
  // A slope one up for one along, sixteen long and wide; he is set riding in the air over it, still, at two heights.
  const cs = [aabbOf(extent('floor', -160, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -16, 0, -8, 8, 0, 16, 'e'))];
  const land = (above: number): number => {
    const p = new PlayerController(new THREE.Vector3(-4, 12 + above, 0));
    let got = 0;
    for (let i = 0; i < 120; i++) {
      p.update(DT, inp({ attackPressed: !p.riding && !p.grounded }), cs);
      if (p.moveEvent === 'rideLand') got = speedOf(p);
    }
    return got;
  };
  const low = land(0.5);
  const high = land(4);
  check('a rider coming down on a slope keeps what of his fall the slope turns along itself: the higher the drop, the faster he is off down it', low > 0.5 && high > low + 2, `${low.toFixed(1)} from half a unit, ${high.toFixed(1)} from four`);
  const flat = new PlayerController(new THREE.Vector3(-40, 5, 0));
  let onFlat = -1;
  for (let i = 0; i < 120; i++) {
    flat.update(DT, inp({}), [...cs, aabbOf(rampBox('stone', -44, -36, -8, 8, -4, 0, 'e'))]);
    if (flat.grounded && onFlat < 0) onFlat = speedOf(flat);
  }
  check('...on the flat a fall is only a fall', onFlat === 0);
  // Up a slope from the flat, with what speed he has: he slows, stops, and comes back down. He is not stepped off.
  const hillUp = [aabbOf(extent('floor', -160, 60, -1, 0, -60, 60)), aabbOf(rampBox('stone', -16, 0, -8, 8, 0, 8, 'e')), aabbOf(extent('stone', 0, 6, 0, 8, -8, 8)), aabbOf(rampBox('stone', -60, -44, -8, 8, 0, 8, 'w'))];
  let highest = 0;
  let turnedBack = false;
  let stuck = 0;
  const r = play(hillUp, 8, 700, (i, p) => {
    if (p.riding && p.position.x < -44) {
      highest = Math.max(highest, p.position.y);
      if (p.velocity.x > 0.5) turnedBack = true;
      if (p.grounded && speedOf(p) < 0.2) stuck++;
    }
    return surfOnSlope()(i, p);
  });
  check('riding up a slope he slows, stops and comes back down it: he does not hang at the top of his climb, and is not stepped off there', highest > 1 && turnedBack && stuck < 6 && r.events.filter((e) => e === 'ride').length === 1, `${highest.toFixed(2)} up; ${stuck} frames still; ${r.events.join()}`);
}

// ---- Coming off ----
{
  const cs = hill(16, 8);
  const wall = [...cs, aabbOf(extent('wall', -30, -29, 0, 6, -8, 8))];
  const hit = play(wall, 8, 400, surfOnSlope());
  check('riding into a wall at speed throws him off it: he is knocked back and takes a moment to get up, unhurt', hit.events.includes('bail') && !hit.p.riding && hit.p.hp === TUNING.health.max && hit.p.position.x > -29);
  const off = play(cs, 8, 200, (i, p) => (p.riding && p.position.x < -20 ? { dodgePressed: true, run: false } : surfOnSlope()(i, p)));
  check('the dodge button steps him off it', off.events.includes('rideEnd') && !off.p.riding && off.p.hp === TUNING.health.max);
  let guarded = false;
  let swung = false;
  const busy = play(cs, 8, 200, (i, p) => {
    if (p.riding && p.position.x < -18) {
      guarded = guarded || p.guarding;
      swung = swung || p.state === 'attack' || p.state === 'plunge';
      return { guardHeld: true, attackPressed: i % 7 === 0, run: false };
    }
    return surfOnSlope()(i, p);
  });
  check('he cannot guard or swing from it: the shield is under his feet', busy.events.includes('ride') && !guarded && !swung);
  const struck = play(cs, 8, 140, surfOnSlope());
  const before = struck.p.hp;
  struck.p.takeHit(struck.p.position.x - 1, struck.p.position.z, 1);
  struck.p.update(DT, inp({}), cs);
  check('a blow knocks him off it like any other blow', struck.p.hp === before - 1 && !struck.p.riding && struck.p.state === 'hurt');
  // Stepped off on a slope he can stand on, he is on his feet: nothing puts him back on it but the air attack.
  const p = new PlayerController(new THREE.Vector3(3, 8, 0));
  const at: MoveEvent[] = [];
  for (let i = 0; i < 20; i++) p.update(DT, inp({}), cs);
  let stepped = false;
  for (let i = 0; i < 200; i++) {
    const off2 = p.riding && p.grounded && p.position.x < -8 && !stepped;
    if (off2) stepped = true;
    p.update(DT, inp(stepped ? { move: WEST, run: i % 40 < 20, dodgePressed: off2 } : surfOnSlope()(i, p)), cs);
    if (p.moveEvent) at.push(p.moveEvent);
  }
  check('stepped off on a slope he can stand on, he walks and runs on down it on his feet', stepped && at.filter((e) => e === 'ride').length === 1 && at.includes('rideEnd') && !p.riding && !p.sliding, at.join());
}

// ---- THE TUCK (the owner, 2026-11-17, of the Big Dipper: "the sliding seems a little slow ... make it gain momentum as you
// go down, with a maximum speed obviously ... like a snowboarding game ... push forward on the left analog stick in
// order to sort of crouch down and go a little faster") ----
{
  // A long hill, as steep as the dream's roads: 300 long, falling 126.
  const cs = hill(300, 126);
  const speeds = (extra: (i: number, p: PlayerController) => Partial<PlayerInput>, frames: number): { p: PlayerController; at: number[] } => {
    const at: number[] = [];
    const r = play(cs, 126, frames, surfOnSlope((i, p) => { at.push(speedOf(p)); return extra(i, p); }));
    return { p: r.p, at };
  };
  const stand = speeds(() => ({}), 60 * 8);
  check('standing on his shield he tops out where he always did', Math.abs(Math.max(...stand.at) - R.max) < 0.2, `${Math.max(...stand.at).toFixed(1)}`);
  const tuck = speeds(() => ({ move: WEST }), 60 * 9);
  const top = Math.max(...tuck.at);
  check('the stick pushed the way he is going is a TUCK: he goes on gaining speed past his standing top, to a higher one, and no further', Math.abs(top - R.tuckMax) < 0.2 && R.tuckMax > R.max + 4, `${top.toFixed(1)}`);
  const toMax = tuck.at.findIndex((q) => q >= R.max - 0.1);
  const toTop = tuck.at.findIndex((q) => q >= R.tuckMax - 0.2);
  check('...and he BUILDS it: past his standing top speed it comes more slowly (two seconds and more from one top to the other)', toMax > 0 && toTop - toMax > 120, `${((toTop - toMax) / 60).toFixed(1)}s`);
  check('tucked, he is crouched (`rideTuck`); standing, he is not', tuck.p.rideTuck > 0.9 && stand.p.rideTuck < 0.01);
  // Tucked up to speed, then the stick let go.
  const let2 = speeds((i) => (i < 60 * 6 ? { move: WEST } : {}), 60 * 9);
  const after = let2.at.slice(-175);
  check('letting the stick go, he keeps his speed for a moment and then loses what he had over his standing top, a little at a time: not at a stroke', after[20] > R.max + 2 && Math.abs(after[after.length - 1] - R.max) < 0.3 && after.every((q, i) => i === 0 || q <= after[i - 1] + 0.2), `${after[20].toFixed(1)} then ${after[after.length - 1].toFixed(1)}`);
  // Hard over is a carve, not a tuck.
  const carve = speeds((i, p) => { const h = Math.atan2(p.velocity.x, p.velocity.z); return { move: v(Math.cos(h) * (i % 120 < 60 ? 1 : -1) + Math.sin(h) * 0.3, -Math.sin(h) * (i % 120 < 60 ? 1 : -1) + Math.cos(h) * 0.3) }; }, 60 * 5);
  check('the stick hard to one side is a carve and not a tuck: it gains nothing', Math.max(...carve.at) <= R.max + 0.1, `${Math.max(...carve.at).toFixed(1)}`);
}

console.log(failures === 0 ? 'ride: all passed' : `ride: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
