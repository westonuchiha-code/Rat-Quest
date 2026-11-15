// The open-course moves, played by the real controller: long jump, wall kick, ledge grab and climb.
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { makeAabb } from '../src/world/collision';
import type { Aabb } from '../src/world/collision';
import { TUNING } from '../src/data/tuning';
import { FollowCamera } from '../src/camera/followCamera';

const DT = 1 / 60;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Aabb => makeAabb((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0);
const floor = box(-60, -1, -60, 60, 0, 60);
const inp = (o: Partial<PlayerInput>): PlayerInput => ({ move: new THREE.Vector3(), run: true, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const north = new THREE.Vector3(0, 0, -1);

/** Runs north, then jumps (long or plain) and returns how far he went from take-off to landing. */
function jumpDistance(long: boolean): number {
  const p = new PlayerController(new THREE.Vector3(0, 0, 40));
  const cs = [floor];
  for (let t = 0; t < 60; t++) p.update(DT, inp({ move: north }), cs);
  if (long) for (let t = 0; t < 3; t++) p.update(DT, inp({ move: north, run: false }), cs);
  const z0 = p.position.z;
  p.update(DT, inp({ move: north, run: !long, jumpPressed: true, jumpHeld: true }), cs);
  let t = 0;
  while (!p.grounded && t++ < 400) p.update(DT, inp({ move: north, run: !long, jumpHeld: true }), cs);
  return z0 - p.position.z;
}
const plain = jumpDistance(false);
const long = jumpDistance(true);
check('a long jump goes much further than a running jump', long > plain * 1.25, `long ${long.toFixed(2)}, plain ${plain.toFixed(2)}`);

// Long jump state shows while in the air.
{
  const p = new PlayerController(new THREE.Vector3(0, 0, 40));
  for (let t = 0; t < 60; t++) p.update(DT, inp({ move: north }), [floor]);
  p.update(DT, inp({ move: north, run: false }), [floor]);
  p.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), [floor]);
  check('the long jump has its own pose and sound', p.state === 'longjump' && p.moveEvent === 'longjump');
  // Walking slowly (no run first) and jumping with sneak is just a jump.
  const q = new PlayerController(new THREE.Vector3(0, 0, 40));
  for (let t = 0; t < 60; t++) q.update(DT, inp({ move: north, run: false }), [floor]);
  q.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), [floor]);
  check('sneaking slowly and jumping is a plain jump', q.state === 'jump');
}

// Wall kick: jump at a tall wall, press jump on touching it.
{
  const wall = box(-5, 0, -2, 5, 10, 0); // its south face is at z = 0
  const cs = [floor, wall];
  const p = new PlayerController(new THREE.Vector3(0, 0, 4));
  p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), cs);
  let touched = -1;
  for (let t = 0; t < 120 && touched < 0; t++) {
    p.update(DT, inp({ move: north, jumpHeld: true }), cs);
    if (p.position.z < 0.35) touched = t;
  }
  const before = p.velocity.y;
  p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), cs);
  check('jumping on touching a wall kicks off it', p.moveEvent === 'wallkick' && p.velocity.z > 4 && p.velocity.y > before + 3, `vz ${p.velocity.z.toFixed(1)} vy ${p.velocity.y.toFixed(1)}`);
  for (let t = 0; t < 8; t++) p.update(DT, inp({ move: north, jumpHeld: true }), cs);
  check('...and he flies out from it before the stick can pull him back', p.position.z > 0.8, p.position.z.toFixed(2));
}

// Wall to wall: a shaft 4.6 wide. After the first kick he is carried straight across with no stick at all, pressed
// against the far wall by it, and can kick again; and so on up. (He used to lose his speed the moment the stick was
// let go, and go wherever the stick pointed, which with the view swinging round behind him was rarely at the wall.)
{
  const northWall = box(-5, 0, -2, 5, 30, 0); // its face at z = 0
  const southWall = box(-5, 0, 4.6, 5, 30, 6.6); // its face at z = 4.6
  const cs = [floor, northWall, southWall];
  const R = TUNING.rat.radius;
  /** Jumps at the north wall and kicks off it. */
  let firstKicked = false;
  const firstKick = (): PlayerController => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 2.3));
    for (let t = 0; t < 5; t++) p.update(DT, inp({}), cs); // (standing first, so that his jump is off the ground and his air jump is kept)
    p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), cs);
    for (let t = 0; t < 120 && p.position.z > R + 0.001; t++) p.update(DT, inp({ move: north, jumpHeld: true }), cs);
    p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), cs);
    firstKicked = p.moveEvent === 'wallkick';
    return p;
  };
  /** Flies on with the stick held `stick` until he touches the wall he is heading for (or `frames` pass). Says whether he got there. */
  const across = (p: PlayerController, stick: THREE.Vector3, toSouth: boolean, frames = 150): boolean => {
    for (let t = 0; t < frames; t++) {
      p.update(DT, inp({ move: stick, jumpHeld: true }), cs);
      if (toSouth ? p.position.z > 4.6 - R - 0.02 : p.position.z < R + 0.02) return true;
      if (p.grounded) return false;
    }
    return false;
  };
  const none = new THREE.Vector3();
  {
    const p = firstKick();
    const kicked = firstKicked;
    const y0 = p.position.y;
    const got = across(p, none, true);
    check('after a wall kick he is carried straight across to the wall opposite, with no stick at all', kicked && got && !p.grounded && Math.abs(p.position.x) < 0.01, `reached z ${p.position.z.toFixed(2)} at height ${p.position.y.toFixed(2)} (kicked from ${y0.toFixed(2)})`);
    // Against it, he can kick again, for as long as the flight lasts: not only in the instant he arrives.
    for (let t = 0; t < 12; t++) p.update(DT, inp({ jumpHeld: true }), cs);
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    check('pressed against it by the kick, he can kick off it a fifth of a second after he arrives', p.moveEvent === 'wallkick' && p.velocity.z < -4, `vz ${p.velocity.z.toFixed(1)}`);
    // And on up the shaft: four more kicks, never touching the stick.
    let kicks = 2;
    let south = false;
    for (let n = 0; n < 4; n++) {
      if (!across(p, none, south)) break;
      p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
      // (Pressed a hair before he touches, the jump is kept and kicks him off as he arrives: a frame or two later.)
      let kicked = p.moveEvent === 'wallkick';
      for (let t = 0; t < 3 && !kicked; t++) {
        p.update(DT, inp({ jumpHeld: true }), cs);
        kicked = p.moveEvent === 'wallkick';
      }
      if (kicked) kicks++;
      south = !south;
    }
    check('and so on up the shaft: six kicks from wall to wall without touching the stick', kicks === 6 && p.position.y > 12, `${kicks} kicks, ${p.position.y.toFixed(1)} up`);
  }
  {
    // The stick held well off line: he still goes across square, trimmed a little sideways.
    const p = firstKick();
    const skew = new THREE.Vector3(1, 0, 1).normalize();
    const got = across(p, skew, true);
    check('with the stick held 45 degrees off, he still crosses to the far wall, drifting only a little', got && Math.abs(p.position.x) < 1.6 && Math.abs(p.position.x) > 0.2, `drifted ${p.position.x.toFixed(2)} (flat out sideways it would be ${(TUNING.move.run * 0.5).toFixed(1)} or more)`);
  }
  {
    // A press made before he gets there is kept for the kick, and does not spend his air jump.
    const p = firstKick();
    let early = -1;
    for (let t = 0; t < 150 && early < 0; t++) {
      p.update(DT, inp({ jumpHeld: true }), cs);
      if (p.position.z > 4.6 - R - 1.2) early = t;
    }
    const vy = p.velocity.y;
    p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
    const notSpent = p.velocity.y <= vy + 0.01 && p.moveEvent !== 'wallkick';
    let kickedOff = false;
    for (let t = 0; t < 30 && !kickedOff; t++) {
      p.update(DT, inp({ jumpHeld: true }), cs);
      kickedOff = p.moveEvent === 'wallkick';
    }
    check('a jump pressed just before he reaches the far wall is kept, and kicks him off it when he touches', early >= 0 && notSpent && kickedOff && p.velocity.z < -4);
    // (His air jump is still his.)
    check('...and has not cost him his air jump', (p as unknown as { airJumpsLeft: number }).airJumpsLeft === TUNING.jump.airJumps && TUNING.jump.airJumps === 1);
  }
  {
    // He can still turn back: the stick hauled towards the wall he left takes him back to it.
    const open = [floor, northWall];
    const p = new PlayerController(new THREE.Vector3(0, 0, 2.3));
    p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), open);
    for (let t = 0; t < 120 && p.position.z > R + 0.02; t++) p.update(DT, inp({ move: north, jumpHeld: true }), open);
    p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), open);
    for (let t = 0; t < 20; t++) p.update(DT, inp({ jumpHeld: true }), open);
    const out = p.position.z;
    const speedOut = p.velocity.z;
    for (let t = 0; t < 45; t++) p.update(DT, inp({ move: north, run: true, jumpHeld: true }), open);
    check('hauling the stick back ends it: he turns and comes back towards the wall he left', out > 1.5 && speedOut > 6 && p.velocity.z < -2 && !p.grounded, `going out at ${speedOut.toFixed(1)}, then back at ${(-p.velocity.z).toFixed(1)}`);
  }
  {
    // Landed, it is over: he does not go sliding on across the floor.
    const wide = [floor, northWall];
    const p = new PlayerController(new THREE.Vector3(0, 0, 2.3));
    p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), wide);
    for (let t = 0; t < 120 && p.position.z > R + 0.02; t++) p.update(DT, inp({ move: north, jumpHeld: true }), wide);
    p.update(DT, inp({ move: north, jumpPressed: true, jumpHeld: true }), wide);
    for (let t = 0; t < 400 && !p.grounded; t++) p.update(DT, inp({ jumpHeld: true }), wide);
    const landedAt = p.position.z;
    for (let t = 0; t < 60; t++) p.update(DT, inp({}), wide);
    check('with no wall opposite he lands, and stops there', p.grounded && p.position.z - landedAt < 1.2 && Math.hypot(p.velocity.x, p.velocity.z) < 0.05, `landed ${landedAt.toFixed(1)} out, slid ${(p.position.z - landedAt).toFixed(2)}`);
  }
  {
    // What it was like before (the carry switched off): let go of the stick and he does not reach the other side.
    const was = TUNING.moves.wallChainTime;
    TUNING.moves.wallChainTime = 0;
    const p = firstKick();
    const got = across(p, none, true);
    TUNING.moves.wallChainTime = was;
    check('(with the carry switched off, as it used to be, he falls short of the far wall)', !got, `got to z ${p.position.z.toFixed(2)} of 4.30`);
  }
}

// The view: it turns only when the right stick turns it. Moving does not swing it round behind him.
{
  const cam = new FollowCamera(new THREE.PerspectiveCamera());
  const focus = new THREE.Vector3();
  cam.yaw = 1;
  // He runs off to one side (facing a quarter turn from the view), for three seconds.
  for (let t = 0; t < 180; t++) {
    focus.x += 6 * DT;
    cam.update(DT, focus, Math.PI / 2, true, 0, 0, [], { x: 6, z: 0 });
  }
  check('running does not turn the view: only the right stick does', Math.abs(cam.yaw - 1) < 1e-9, `yaw ${cam.yaw.toFixed(3)}`);
  for (let t = 0; t < 30; t++) cam.update(DT, focus, Math.PI / 2, true, 1, 0, [], { x: 6, z: 0 });
  check('the right stick turns it', cam.yaw > 1.5);
  const was = TUNING.camera.autoFollowRate;
  TUNING.camera.autoFollowRate = 1.4;
  const y0 = cam.yaw;
  for (let t = 0; t < 60; t++) cam.update(DT, focus, Math.PI / 2, true, 0, 0, [], { x: 6, z: 0 });
  TUNING.camera.autoFollowRate = was;
  check('(the old swing-behind is still there on its slider, off by default)', Math.abs(cam.yaw - y0) > 0.3 && was === 0);
}

// Ledge grab: a block 3.2 high; jump at it from close, he catches the edge, then climbs on top.
{
  const block = box(-5, 0, -6, 5, 3.2, 0);
  const cs = [floor, block];
  const p = new PlayerController(new THREE.Vector3(0, 0, 1.2));
  p.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), cs);
  let hung = false;
  for (let t = 0; t < 120 && !hung; t++) {
    p.update(DT, inp({ move: north, run: false, jumpHeld: true }), cs);
    hung = p.state === 'hang';
  }
  check('falling past the top of a wall he faces, he catches the ledge', hung, `y ${p.position.y.toFixed(2)} state ${p.state}`);
  for (let t = 0; t < 20; t++) p.update(DT, inp({}), cs);
  check('he hangs there while nothing is pressed', p.state === 'hang' && Math.abs(p.position.y - (3.2 - 1.05)) < 0.01);
  p.update(DT, inp({ jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 40; t++) p.update(DT, inp({}), cs);
  check('jump climbs him up onto the top', p.grounded && Math.abs(p.position.y - 3.2) < 0.01 && p.position.z < -0.3, `y ${p.position.y.toFixed(2)} z ${p.position.z.toFixed(2)}`);
  // Letting go.
  const q = new PlayerController(new THREE.Vector3(0, 0, 1.2));
  q.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), cs);
  for (let t = 0; t < 120 && q.state !== 'hang'; t++) q.update(DT, inp({ move: north, run: false, jumpHeld: true }), cs);
  check('(he was hanging before letting go)', q.state === 'hang');
  q.update(DT, inp({ move: new THREE.Vector3(0, 0, 1) }), cs);
  for (let t = 0; t < 60; t++) q.update(DT, inp({}), cs);
  check('pulling away lets go and he drops to the floor', q.grounded && q.position.y < 0.01);
  // A ledge with no room on top (a ceiling right above it) cannot be grabbed.
  const lid = box(-5, 3.5, -6, 5, 5, -0.5);
  const r = new PlayerController(new THREE.Vector3(0, 0, 1.2));
  r.update(DT, inp({ move: north, run: false, jumpPressed: true, jumpHeld: true }), [floor, block, lid]);
  let any = false;
  for (let t = 0; t < 120; t++) {
    r.update(DT, inp({ move: north, run: false, jumpHeld: true }), [floor, block, lid]);
    if (r.state === 'hang') any = true;
  }
  check('no grab where there is no room to climb up', !any);
}

// On a phone the stick is rarely dead straight: holding it at an angle must still catch the ledge.
{
  const block = box(-10, 0, -6, 10, 3.2, 0);
  const cs = [floor, block];
  const missed: string[] = [];
  for (const [ang, dist] of [[30, 2], [45, 2], [60, 2], [0, 5], [45, 4]]) {
    const a = (ang * Math.PI) / 180;
    const mv = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const p = new PlayerController(new THREE.Vector3(0, 0, dist));
    p.facing = Math.atan2(mv.x, mv.z);
    let hung = false;
    let jumped = false;
    for (let t = 0; t < 200 && !hung; t++) {
      const press = !jumped && p.position.z < 1.6;
      if (press) jumped = true;
      p.update(DT, inp({ move: mv, jumpPressed: press, jumpHeld: jumped }), cs);
      if (p.state === 'hang') hung = true;
    }
    if (!hung) missed.push(`${ang} deg from ${dist}`);
  }
  check('the ledge is caught with the stick held at an angle, or on a run-up', missed.length === 0, missed.join(', '));
  // Jumping up beside a low wall he can clear: he lands on it, he does not hang off it.
  const low = box(-10, 0, -6, 10, 1.5, 0);
  const p = new PlayerController(new THREE.Vector3(0, 0, 2));
  let hung = false;
  let jumped = false;
  for (let t = 0; t < 200; t++) {
    const press = !jumped && p.position.z < 1.6;
    if (press) jumped = true;
    p.update(DT, inp({ move: north, jumpPressed: press, jumpHeld: jumped }), [floor, low]);
    if (p.state === 'hang') hung = true;
    if (jumped && t > 5 && p.grounded) break; // where he first lands
  }
  check('a ledge he can jump onto is landed on, not hung from', !hung && p.grounded && Math.abs(p.position.y - 1.5) < 0.01, `y ${p.position.y.toFixed(2)}`);
}

// Rolling: one roll after another, with a beat between them.
// (The wait before the next roll used to be counted from the start of a roll and was no longer than a roll, so there
// was none: rolls ran one into the next, faster than running and safe from hits for two thirds of the time. The owner,
// 2026-11-15: a pause between them, but "don't completely take away the player's ability to roll around".)
{
  const cs = [floor];
  const D = TUNING.dodge;
  /** Six seconds going north with the roll button mashed (every frame) or left alone. */
  const go = (mash: boolean): { far: number; starts: number[]; safe: number; open: number[] } => {
    const p = new PlayerController(new THREE.Vector3(0, 0, 50));
    for (let t = 0; t < 30; t++) p.update(DT, inp({ move: north }), cs);
    const z0 = p.position.z;
    const starts: number[] = [];
    const open: number[] = [];
    let safe = 0;
    let was = false;
    let gap = 0;
    for (let t = 0; t < 360; t++) {
      p.update(DT, inp({ move: north, dodgePressed: mash }), cs);
      const rolling = p.state === 'dodge';
      if (rolling && !was) {
        starts.push(t);
        if (starts.length > 1) open.push(gap);
        gap = 0;
      }
      if (!rolling) gap++;
      if (p.invulnerable) safe++;
      was = rolling;
    }
    return { far: z0 - p.position.z, starts, safe: safe / 360, open };
  };
  const run = go(false);
  const roll = go(true);
  const cycle = roll.starts.slice(1).map((t, i) => (t - roll.starts[i]) * DT);
  check('mashing the roll button, he rolls again and again: he has not lost the roll', roll.starts.length >= 7, `${roll.starts.length} rolls in six seconds`);
  check('...but each roll starts a roll and a pause after the last one did, not on its heels', cycle.every((c) => Math.abs(c - (D.roll.duration + D.cooldown)) < 0.05) && D.cooldown >= 0.2, `${cycle[0].toFixed(2)} s from one roll to the next (a roll is ${D.roll.duration})`);
  check('...so between rolls he is on his feet and can be hit, for about a quarter of a second each time', roll.open.every((g) => g * DT > D.cooldown - 0.05 && g * DT < D.cooldown + 0.07), `${(roll.open[0] * DT).toFixed(2)} s`);
  check('...and hits pass through him for less than half of the time, where it was two thirds', roll.safe < 0.5 && roll.safe > 0.3, `${Math.round(roll.safe * 100)}%`);
  check('rolling everywhere is no longer much faster than running: within a tenth', roll.far < run.far * 1.1 && roll.far > run.far * 0.95, `${roll.far.toFixed(1)} rolling, ${run.far.toFixed(1)} running, in six seconds`);
  // A press a little early is kept: he does not have to hit the exact frame the pause ends.
  {
    const p = new PlayerController(new THREE.Vector3(0, 0, 50));
    for (let t = 0; t < 30; t++) p.update(DT, inp({ move: north }), cs);
    p.update(DT, inp({ move: north, dodgePressed: true }), cs);
    let t = 1;
    while (p.state === 'dodge' && t < 200) {
      p.update(DT, inp({ move: north }), cs);
      t++;
    }
    const ended = t;
    // (Pressed once, six frames after the roll ended: a tenth of a second, well inside the pause.)
    let second = -1;
    for (let k = 0; k < 60 && second < 0; k++) {
      p.update(DT, inp({ move: north, dodgePressed: k === 6 }), cs);
      t++;
      if (p.state === 'dodge') second = t;
    }
    check('a press made during the pause is remembered: the next roll comes out the moment the pause is over', second > 0 && Math.abs((second - ended) * DT - D.cooldown) < 0.05, `${((second - ended) * DT).toFixed(2)} s after the first ended`);
  }
  // The backstep has the same pause after it.
  {
    const p = new PlayerController(new THREE.Vector3(0, 0, 50));
    for (let t = 0; t < 10; t++) p.update(DT, inp({}), cs);
    const starts: number[] = [];
    let was = false;
    for (let t = 0; t < 240; t++) {
      p.update(DT, inp({ dodgePressed: true }), cs);
      const d = p.state === 'dodge';
      if (d && !was) starts.push(t);
      was = d;
    }
    const c = (starts[1] - starts[0]) * DT;
    check('the backstep: the same pause after it', starts.length >= 4 && Math.abs(c - (D.back.duration + D.cooldown)) < 0.05, `${c.toFixed(2)} s from one to the next (a backstep is ${D.back.duration})`);
  }
}

console.log(failures === 0 ? 'moves: all pass' : `moves: ${failures} FAIL`);
process.exit(failures ? 1 : 0);
