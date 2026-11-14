// Headless combat checks: the real controller, the real enemy logic and the real hit resolver.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Scuttler } from '../src/enemies/scuttler';
import { CombatEvents, pickAim, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';

const chamber = buildChamber();
const DT = 1 / 60;
const S = TUNING.scuttler;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
function input(o: Partial<PlayerInput> = {}): PlayerInput {
  return { move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o };
}
function setup(dz: number): { p: PlayerController; e: Scuttler; ev: CombatEvents } {
  const p = new PlayerController(new THREE.Vector3(S.home.x, 0, S.home.z - dz));
  const e = new Scuttler();
  const ev: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders); // land
  return { p, e, ev };
}
/** One tick of the whole fight. Returns the events. */
function tick(p: PlayerController, e: Scuttler, ev: CombatEvents, inp: PlayerInput, enemyActs = true): void {
  p.attackAim = pickAim(p, [e], inp.move.x, inp.move.z);
  p.update(DT, inp, chamber.colliders);
  if (enemyActs) e.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
  resolveCombat(p, [e], ev);
}

// 1. One swing hits once, staggers the roach, and each swing only counts once.
{
  const { p, e, ev } = setup(1.6);
  let hits = 0;
  tick(p, e, ev, input({ attackPressed: true }), false);
  for (let i = 0; i < 40; i++) {
    tick(p, e, ev, input(), false);
    if (ev.enemyHit) hits++;
  }
  check('one swing lands exactly one hit', hits === 1 && e.hp === S.hp - 1, `hits=${hits} hp=${e.hp}`);
  check('a hit staggers the roach', e.state === 'stagger', `state=${e.state}`);
}

// 2. The swing turns to face a nearby roach that is a little off to one side.
{
  const { p, e, ev } = setup(1.5);
  p.facing = 0.8;
  tick(p, e, ev, input({ attackPressed: true }), false);
  check('swing aims at a nearby enemy', Math.abs(p.facing) < 0.1, `facing=${p.facing.toFixed(2)}`);
}

// 3. The full three-hit combo kills it, and the rat steps forward as he swings.
{
  const { p, e, ev } = setup(1.6);
  const startZ = p.position.z;
  let killed = false;
  for (let i = 0; i < 150 && !killed; i++) {
    tick(p, e, ev, input({ attackPressed: i % 6 === 0 }), false);
    if (ev.enemyKilled) killed = true;
  }
  check('full combo kills the roach', killed && !e.alive, `hp=${e.hp} state=${e.state}`);
  check('swings step the rat forward', p.position.z - startZ > 0.3, `moved=${(p.position.z - startZ).toFixed(2)}`);
}

// 4. Left alone, the roach winds up, lunges and hurts the rat, who is knocked back.
{
  const { p, e, ev } = setup(3);
  const seen = new Set<string>();
  let result: string | null = null;
  for (let i = 0; i < 240 && !result; i++) {
    tick(p, e, ev, input());
    seen.add(e.state);
    if (ev.playerResult) result = ev.playerResult;
  }
  check('roach chases, winds up and lunges', seen.has('chase') && seen.has('windup') && seen.has('lunge'), [...seen].join(','));
  check('an unguarded rat is hit', result === 'hit' && p.hp === TUNING.health.max - 1 && p.state === 'hurt', `result=${result} hp=${p.hp} state=${p.state}`);
  let again = false;
  for (let i = 0; i < 30; i++) {
    tick(p, e, ev, input());
    if (ev.playerResult === 'hit') again = true;
  }
  check('no second hit while he is still flashing', !again);
}

// 5. Guarding toward the roach blocks the lunge and leaves it open for longer.
{
  const { p, e, ev } = setup(3);
  let result: string | null = null;
  for (let i = 0; i < 240 && !result; i++) {
    tick(p, e, ev, input({ guardHeld: true }));
    if (ev.playerResult) result = ev.playerResult;
  }
  check('a guard facing the roach blocks', result === 'blocked' && p.hp === TUNING.health.max, `result=${result} hp=${p.hp}`);
  check('a blocked roach is left recovering', e.state === 'recover', `state=${e.state}`);
}

// 6. A guard facing away does not block.
{
  const { p, e, ev } = setup(3);
  p.facing = Math.PI; // back to the roach
  let result: string | null = null;
  for (let i = 0; i < 240 && !result; i++) {
    tick(p, e, ev, input({ guardHeld: true }));
    if (ev.playerResult) result = ev.playerResult;
  }
  check('a guard facing away does not block', result === 'hit', `result=${result}`);
}

// 7. Rolling as the lunge starts avoids it.
{
  const { p, e, ev } = setup(3);
  let hurt = false;
  let rolled = false;
  const side = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < 300; i++) {
    const roll = !rolled && e.state === 'windup' && e.stateTime > S.windup - 0.1;
    if (roll) rolled = true;
    tick(p, e, ev, input(roll ? { move: side, dodgePressed: true } : rolled && p.state === 'dodge' ? { move: side } : {}));
    if (ev.playerResult === 'hit' || ev.playerResult === 'killed') hurt = true;
    if (rolled && e.state === 'recover') break;
  }
  check('a timed roll avoids the lunge', rolled && !hurt && p.hp === TUNING.health.max, `rolled=${rolled} hp=${p.hp}`);
}

// 8. Five hits kill the rat, and he respawns with full health.
{
  const { p } = setup(3);
  let last = '';
  for (let i = 0; i < 5; i++) {
    for (let k = 0; k < 80; k++) p.update(DT, input(), chamber.colliders); // let the safe time run out
    last = p.takeHit(p.position.x, p.position.z + 1, 1);
  }
  check('the last point of health kills him', last === 'killed' && p.dead && p.state !== 'idle', `last=${last} state=${p.state}`);
  for (let k = 0; k < 200; k++) p.update(DT, input(), chamber.colliders);
  check('he respawns with full health', !p.dead && p.hp === TUNING.health.max, `hp=${p.hp}`);
}

// 9. The roach stays inside its arena and comes back after dying.
{
  const { p, e, ev } = setup(3);
  let outside = false;
  for (let i = 0; i < 600; i++) {
    // Run in a wide circle that leaves the arena.
    const a = i * 0.03;
    tick(p, e, ev, input({ move: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), run: true }));
    const A = S.arena;
    if (e.x < A.x0 || e.x > A.x1 || e.z < A.z0 || e.z > A.z1) outside = true;
  }
  check('roach never leaves its arena', !outside, `at ${e.x.toFixed(1)},${e.z.toFixed(1)}`);
  e.takeHit(99, 0, 0);
  for (let i = 0; i < (S.respawn + 0.5) * 60; i++) e.update(DT, 100, 0, 100, true);
  check('roach respawns at home with full health', e.alive && e.hp === S.hp && Math.abs(e.x - S.home.x) < 0.01, `state=${e.state} hp=${e.hp}`);
}

// Stowing weapons: the toggle swaps at the halfway point, and an unarmed rat cannot swing or guard.
{
  const { p, e, ev } = setup(6);
  tick(p, e, ev, input({ stowPressed: true }), false);
  check('stowing starts a motion', p.stowProgress >= 0 && p.armed);
  for (let i = 0; i < 40; i++) tick(p, e, ev, input(), false);
  check('weapons are away by the end', !p.armed && p.stowProgress < 0, `armed=${p.armed}`);
  tick(p, e, ev, input({ attackPressed: true }), false);
  for (let i = 0; i < 6; i++) tick(p, e, ev, input({ guardHeld: true }), false);
  check('unarmed cannot swing or guard', p.state !== 'attack' && !p.guarding, `state=${p.state}`);
  tick(p, e, ev, input({ stowPressed: true }), false);
  for (let i = 0; i < 40; i++) tick(p, e, ev, input(), false);
  check('toggling again draws them', p.armed);
  tick(p, e, ev, input({ attackPressed: true }), false);
  check('armed can swing again', p.state === 'attack');
}

// Air attack: attacking in the air hangs, dives straight down, and blasts everything near on landing.
{
  const P = TUNING.plunge;
  // Rat high above the ground, one roach off to the side inside the blast radius and one far away.
  const p = new PlayerController(new THREE.Vector3(S.home.x, 2.5, S.home.z));
  const near = new Scuttler();
  const far = new Scuttler();
  const ev: CombatEvents = { enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] };
  near.x = S.home.x + 1.6;
  near.z = S.home.z;
  far.x = S.home.x - 4;
  far.z = S.home.z;
  const noAct = (): void => {
    p.update(DT, input(), chamber.colliders);
    resolveCombat(p, [near, far], ev);
  };
  p.update(DT, input(), chamber.colliders);
  check('rat starts in the air', !p.grounded && p.position.y > 1);
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  check('attacking in the air starts a plunge, not a swing', p.plungeStage === 1 && p.state === 'plunge', `stage=${p.plungeStage} state=${p.state}`);
  const y0 = p.position.y;
  for (let i = 0; i < 6; i++) noAct();
  check('he hangs while winding up', Math.abs(p.position.y - y0) < 0.05, `dy=${(p.position.y - y0).toFixed(2)}`);
  let dove = false;
  let maxDrift = 0;
  let impact = false;
  let hits = 0;
  for (let i = 0; i < 120 && !impact; i++) {
    noAct();
    if (p.plungeStage === 2) dove = true;
    maxDrift = Math.max(maxDrift, Math.hypot(p.position.x - S.home.x, p.position.z - S.home.z));
    if (ev.enemyHit) hits++;
    if (ev.shockwave) impact = true;
  }
  check('he dives straight down', dove && maxDrift < 0.05, `drift=${maxDrift.toFixed(2)}`);
  check('landing makes a shockwave', impact && p.grounded);
  check('the blast hurts a roach in range, once', near.hp === S.hp - P.shockDamage && hits >= 1, `hp=${near.hp}`);
  check('the blast spares a roach out of range', far.hp === S.hp, `hp=${far.hp}`);
  check('he is stuck for a moment after', p.plungeStage === 3);
  for (let i = 0; i < Math.ceil(P.recover * 60) + 4; i++) noAct();
  check('then free again', p.plungeStage === 0);

  // A roach right underneath takes the dive itself.
  const q = new PlayerController(new THREE.Vector3(S.home.x, 2.5, S.home.z));
  const under = new Scuttler();
  under.x = S.home.x;
  under.z = S.home.z;
  q.update(DT, input(), chamber.colliders);
  q.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 120 && under.hp === S.hp; i++) {
    q.update(DT, input(), chamber.colliders);
    resolveCombat(q, [under], ev);
  }
  check('a roach directly below takes the dive hit', under.hp === S.hp - P.diveDamage, `hp=${under.hp}`);
  // And a plunge cannot be cancelled by rolling or jumping.
  const r = new PlayerController(new THREE.Vector3(S.home.x, 2.5, S.home.z));
  r.update(DT, input(), chamber.colliders);
  r.update(DT, input({ attackPressed: true }), chamber.colliders);
  r.update(DT, input({ dodgePressed: true, jumpPressed: true }), chamber.colliders);
  check('no dodge or jump out of a plunge', r.plungeStage !== 0 && r.state === 'plunge');
}

console.log(failures === 0 ? '\nCombat checks passed.' : `\n${failures} combat check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
