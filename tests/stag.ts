// The Stag Knight: a great beetle with a forge hammer. Slow, and it does not flinch: a sword does not stop what it is
// doing, so the fight is about where the rat stands and how greedy he is. Its slam cannot be blocked (only dodged,
// or turned by a perfect guard) and leaves it stuck; its sweep covers its whole front; stand behind it and it stomps.
// Five quick blows break its poise. All of it with the real controller, the real combat and the real turn-taking.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Stag, STAG, type StagState } from '../src/enemies/stag';
import { Director } from '../src/enemies/director';
import { SENSES } from '../src/enemies/foe';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import { STARTING_GEAR, ITEMS, gearMods } from '../src/data/equipment';

const chamber = buildChamber();
const DT = 1 / 60;
const S = STAG;
// Open floor in the test chamber: it stands at O and its front is +x.
const O = { x: -12, z: 16.5 };
const FRONT = Math.PI / 2;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const wear = (id: string) => gearMods([...Object.values(STARTING_GEAR).filter((s) => ITEMS[s].slot !== ITEMS[id].slot), id]);
/** A stag on the open floor, facing +x, that will come for the rat wherever he is. Its dice all roll `roll`. */
function stag(roll = 0.9): Stag {
  const s = new Stag({ x: O.x, z: O.z, hunt: true, facing: FRONT });
  s.rng = () => roll;
  return s;
}
function ratAt(x: number, z: number, face?: Stag): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
  return p;
}
const gap = (s: Stag, p: PlayerController): number => Math.hypot(p.position.x - s.x, p.position.z - s.z);
const off = (s: Stag, p: PlayerController): number => Math.abs(Math.atan2(Math.sin(Math.atan2(p.position.x - s.x, p.position.z - s.z) - s.facing), Math.cos(Math.atan2(p.position.x - s.x, p.position.z - s.z) - s.facing)));
const tick = (s: Stag, p: PlayerController): void => s.update(DT, p.position.x, p.position.y, p.position.z, !p.dead);
function until(s: Stag, p: PlayerController, state: StagState, frames = 900): boolean {
  for (let i = 0; i < frames && s.state !== state; i++) tick(s, p);
  return s.state === state;
}
/** Puts the rat `d` from it, `around` radians from its front, facing it. */
function place(p: PlayerController, s: Stag, d: number, around = 0): void {
  const a = s.facing + around;
  p.position.set(s.x + Math.sin(a) * d, 0, s.z + Math.cos(a) * d);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  p.facing = Math.atan2(s.x - p.position.x, s.z - p.position.z);
}
/** One swing at it from where the rat stands (it goes on doing what it does). */
function swingAt(p: PlayerController, s: Stag, act = true): CombatEvents {
  const ev = events();
  let seen = events();
  s.lastSwing = -1;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    if (act) tick(s, p);
    resolveCombat(p, [s], ev);
    if (ev.enemyHit || ev.playerResult) seen = { ...seen, enemyHit: ev.enemyHit ?? seen.enemyHit, playerResult: ev.playerResult ?? seen.playerResult, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
/** Plays on with the rat doing `act` each frame, until `stop`. Returns what reached the rat. */
function play(s: Stag, p: PlayerController, act: (s: Stag, frame: number) => Partial<PlayerInput>, stop: (s: Stag, frame: number) => boolean, frames = 900): { results: string[]; hp: number } {
  const results: string[] = [];
  const ev = events();
  for (let i = 0; i < frames && !stop(s, i); i++) {
    p.update(DT, input(act(s, i)), chamber.colliders);
    tick(s, p);
    resolveCombat(p, [s], ev);
    if (ev.playerResult) results.push(ev.playerResult);
  }
  return { results, hp: p.hp };
}
const still = (): Partial<PlayerInput> => ({});
const MAX = TUNING.health.max;

// ---- At its post ----
{
  SENSES.notice = 1;
  const s = new Stag({ x: O.x, z: O.z, facing: 1.2 });
  for (let i = 0; i < 60; i++) s.update(DT, O.x + 30, 0, O.z, true);
  check(
    'at its post it stands still, facing the way it was set',
    s.state === 'idle'
      && Math.abs(s.facing - 1.2) < 1e-6
      && Math.hypot(s.x - O.x, s.z - O.z) < 1e-6
  );
  const far = new Stag({ x: O.x, z: O.z, arena: { x0: -100, x1: 100, z0: -100, z1: 100 } });
  for (let i = 0; i < 30; i++) far.update(DT, O.x + S.noticeRange + 1, 0, O.z, true);
  const unseen = far.state === 'idle';
  far.update(DT, O.x + S.noticeRange - 0.5, 0, O.z, true);
  check('it notices the rat from nine units and comes for him', unseen && far.state === 'chase' && far.events.includes('alert'));
  const soft = new Stag({ x: O.x, z: O.z, arena: { x0: -100, x1: 100, z0: -100, z1: 100 } });
  SENSES.notice = wear('mossScarf').notice;
  for (let i = 0; i < 30; i++) soft.update(DT, O.x + S.noticeRange * 0.6, 0, O.z, true);
  check('in the Moss Scarf the rat gets much nearer first', soft.state === 'idle');
  SENSES.notice = 0;
  const napping = new Stag({ x: O.x, z: O.z, facing: FRONT });
  const p = ratAt(O.x - 1.5, O.z, napping);
  const ev = swingAt(p, napping, false);
  SENSES.notice = 1;
  check(
    'struck unawares it is hurt, and it knows he is there',
    ev.enemyHit === napping
      && napping.hp === S.hp - 1
      && napping.state === 'chase'
      && napping.events.includes('alert')
  );
}

// ---- Slow, and it cannot be shouldered aside ----
{
  const s = stag();
  const p = ratAt(O.x + 7, O.z, s);
  s.mayAttack = false;
  const x0 = s.x;
  for (let i = 0; i < 120; i++) tick(s, p);
  check(
    'it comes on slowly: about half his walking pace',
    Math.abs((s.x - x0) / 2 - S.speed) < 0.1
      && S.speed < TUNING.move.walk * 0.6,
    `${((s.x - x0) / 2).toFixed(2)} a second (he walks at ${TUNING.move.walk})`
  );
  // He runs round behind it: it turns too slowly to keep him in front.
  place(p, s, 1.6, 0);
  let behind = 0;
  for (let i = 0; i < 60 * 3; i++) {
    const a = Math.atan2(p.position.x - s.x, p.position.z - s.z) + Math.PI / 2;
    p.update(DT, input({ move: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), run: true }), chamber.colliders);
    tick(s, p);
    resolveCombat(p, [s], events());
    behind = Math.max(behind, off(s, p));
  }
  check('it turns slowly: a rat running round it gets behind it', behind > S.behindArc, `as far round as ${behind.toFixed(2)} rad from its front`);
  // He walks straight into it: it does not budge, and he is kept out of it.
  const t = stag();
  const q = ratAt(O.x + 3, O.z, t);
  t.mayAttack = false;
  SENSES.notice = 0;
  const at = { x: t.x, z: t.z };
  let nearest = 9;
  for (let i = 0; i < 120; i++) {
    q.update(DT, input({ move: new THREE.Vector3(-1, 0, 0), run: true }), chamber.colliders);
    resolveCombat(q, [t], events());
    nearest = Math.min(nearest, gap(t, q));
  }
  SENSES.notice = 1;
  check(
    'the rat cannot shove it: it stays where it stands and he is held off it',
    t.x === at.x
      && t.z === at.z
      && nearest > S.radius + TUNING.rat.radius - 0.02,
    `he got to ${nearest.toFixed(2)} from its middle (its body and his: ${(S.radius + TUNING.rat.radius).toFixed(2)})`
  );
}

// ---- The slam ----
{
  // Square in front of it and a little way off: the slam.
  const s = stag(0.9);
  const p = ratAt(O.x + 2.3, O.z, s);
  const raised = until(s, p, 'windup');
  let tell = 0;
  while (s.state === 'windup' && tell < 200) { tick(s, p); tell++; }
  check(
    'the hammer goes up for nearly a second before it comes down',
    raised
      && s.events.includes('windup')
      && s.state === 'slam'
      && Math.abs(tell * DT - S.windup) < 0.04,
    `${(tell * DT).toFixed(2)} s`
  );
  const r = play(s, p, still, (x) => x.state === 'stuck');
  check(
    'a rat still standing there is hit for two hearts',
    r.results.includes('hit')
      && r.hp === MAX - S.slamDamage
      && s.events.includes('slam'),
    `hearts ${r.hp}`
  );
  // A shield does not stop it.
  const b = stag(0.9);
  const pb = ratAt(O.x + 2.3, O.z, b);
  const rb = play(b, pb, () => ({ guardHeld: true }), (x) => x.state === 'stuck');
  check(
    'a shield held up does not stop it: two hearts all the same',
    rb.results.includes('hit')
      && !rb.results.includes('blocked')
      && rb.hp === MAX - S.slamDamage,
    rb.results.join(', ')
  );
  // A perfect guard does, and throws it down on one knee.
  let turned: Stag | null = null;
  for (let lead = 0.02; lead < TUNING.guard.parryWindow && !turned; lead += 0.02) {
    const t = stag(0.9);
    const pt = ratAt(O.x + 2.3, O.z, t);
    const rt = play(t, pt, (x) => ({ guardHeld: x.state === 'slam' && x.stateTime > S.slamTime - 0.08 - lead }), (x) => x.state === 'kneel' || x.state === 'stuck');
    if (rt.results.includes('parried') && t.state === 'kneel' && rt.hp === MAX) turned = t;
  }
  check('a perfect guard turns it and throws the beetle down on one knee', turned !== null && turned.open && turned.events.includes('kneel'));
  // Step aside once it has committed: the hammer comes down on nothing, and it is stuck.
  const m = stag(0.9);
  const pm = ratAt(O.x + 2.3, O.z, m);
  until(m, pm, 'windup');
  const rm = play(m, pm, (x) => (x.state === 'windup' && x.stateTime < S.windup * S.track + 0.05 ? {} : { move: new THREE.Vector3(0, 0, 1), run: true }), (x) => x.state === 'stuck');
  check('step aside once it has committed and the hammer comes down on nothing', rm.results.length === 0 && rm.hp === MAX && m.state === 'stuck' && m.open);
  let stuck = 0;
  while (m.state === 'stuck' && stuck < 300) { tick(m, pm); stuck++; }
  check(
    'with the hammer in the floor it is open for well over a second',
    Math.abs((stuck + 1) * DT - S.stuck) < 0.08
      && S.stuck >= 1.3,
    `${(stuck * DT).toFixed(2)} s`
  );
}

// ---- It does not flinch; but it has only so much poise ----
{
  const s = stag(0.9);
  const p = ratAt(O.x + 2.3, O.z, s);
  until(s, p, 'windup');
  place(p, s, 1.6, Math.PI / 2); // at its side, out of the hammer's way
  const hit = swingAt(p, s);
  check(
    'a sword in it does not stop the hammer coming down',
    hit.enemyHit === s
      && s.hp === S.hp - 1
      && (s.state === 'windup' || s.state === 'slam' || s.state === 'stuck')
      && s.events.includes('hurt'),
    `it is in ${s.state}`
  );
  // Five in quick succession and it goes down.
  const t = stag(0.9);
  const q = ratAt(O.x + 4, O.z, t);
  t.mayAttack = false;
  until(t, q, 'chase', 10);
  let blows = 0;
  for (let k = 0; k < 8 && t.state !== 'kneel'; k++) {
    place(q, t, 1.6, Math.PI / 2);
    if (swingAt(q, t, false).enemyHit === t) blows++;
  }
  check(
    'five blows one after another break its poise: it goes down on one knee',
    blows === S.poise
      && t.state === 'kneel'
      && t.hp === S.hp - S.poise
      && t.open,
    `${blows} blows`
  );
  let down = 0;
  place(q, t, 1.6, 0);
  const more = swingAt(q, t);
  while (t.state === 'kneel' && down < 400) { tick(t, q); down++; }
  check(
    'down, it is hit and stays down, for a couple of seconds; then it is up with its poise back',
    more.enemyHit === t
      && Math.abs((down + 29) * DT - S.kneel) < 0.15
      && t.poise === S.poise
      && t.events.includes('rise'),
    `${((down + 29) * DT).toFixed(2)} s`
  );
  // Blows spaced out never do it.
  const u = stag(0.9);
  const pu = ratAt(O.x + 4, O.z, u);
  u.mayAttack = false;
  until(u, pu, 'chase', 10);
  let knelt = false;
  for (let k = 0; k < 6; k++) {
    place(pu, u, 1.6, Math.PI / 2);
    swingAt(pu, u, false);
    for (let i = 0; i < 60 * (S.poiseBack + 0.3); i++) u.update(DT, u.x + 30, 0, u.z, true); // (he goes off a while)
    if (u.state === 'kneel') knelt = true;
  }
  check('blows with long gaps between them never do: it gets its poise back', !knelt && u.hp === S.hp - 6 && u.poise === S.poise);
  // A plunge counts for three.
  const v = stag(0.9);
  v.takeHit(TUNING.plunge.diveDamage, v.x, v.z, 'plunge');
  check('a plunge onto it takes three blows\' worth of its poise', v.poise === S.poise - S.plungePoise && v.state !== 'kneel');
}

// ---- The sweep ----
{
  // Close in front, and the dice say sweep.
  const s = stag(0.1);
  const p = ratAt(O.x + 3, O.z, s);
  const drew = until(s, p, 'sweepWind');
  let tell = 0;
  while (s.state === 'sweepWind' && tell < 200) { tick(s, p); tell++; }
  check(
    'close in front of it, it draws the hammer back to one side first',
    drew
      && s.events.includes('sweepWind')
      && s.state === 'sweep'
      && Math.abs(tell * DT - S.sweepWindup) < 0.04,
    `${(tell * DT).toFixed(2)} s`
  );
  const r = play(s, p, still, (x) => x.state === 'recover');
  check('the sweep catches a rat in front of it for one heart', r.results.includes('hit') && r.hp === MAX - S.sweepDamage);
  // It covers its sides too.
  const a = stag(0.1);
  const pa = ratAt(O.x + 1.8, O.z, a);
  until(a, pa, 'sweepWind');
  place(pa, a, 1.6, 1.5);
  const ra = play(a, pa, still, (x) => x.state === 'recover');
  check('and one at its side', ra.results.includes('hit'));
  // A shield stops this one.
  const b = stag(0.1);
  const pb = ratAt(O.x + 1.8, O.z, b);
  const rb = play(b, pb, () => ({ guardHeld: true }), (x) => x.state === 'recover');
  check('a shield stops the sweep', rb.results.includes('blocked') && rb.hp === MAX);
  // Behind it, it misses.
  const c = stag(0.1);
  const pc = ratAt(O.x + 1.8, O.z, c);
  until(c, pc, 'sweepWind');
  for (let i = 0; i < 60 * S.sweepWindup * 0.55; i++) tick(c, pc); // (it has stopped turning)
  place(pc, c, 1.6, Math.PI);
  const rc = play(c, pc, still, (x) => x.state === 'recover');
  check('right behind it, the sweep does not reach', rc.results.length === 0 && rc.hp === MAX);
  let open = 0;
  while (c.state === 'recover' && open < 200) { tick(c, pc); open++; }
  check('after it, it is open for most of a second', Math.abs(open * DT - S.recover) < 0.06);
}

// ---- The stomp ----
{
  const s = stag(0.9);
  const p = ratAt(O.x + 4, O.z, s);
  s.mayAttack = false;
  until(s, p, 'chase', 10);
  // He gets behind it and stays there.
  let wound = -1;
  for (let i = 0; i < 60 * 4 && wound < 0; i++) {
    place(p, s, 1.6, Math.PI);
    tick(s, p);
    if (s.state === 'stompWind') wound = i;
  }
  check(
    'a rat who stays behind it for about a second makes it stomp, whoever\'s turn it is',
    wound >= 0
      && Math.abs(wound * DT - S.behindTime) < 0.15
      && s.events.includes('stompWind'),
    `after ${(wound * DT).toFixed(2)} s`
  );
  const r = play(s, p, still, (x) => x.state === 'settle');
  check(
    'the stomp runs out along the floor all round it: he is hit for a heart, behind it or not',
    r.results.includes('hit')
      && r.hp === MAX - S.stompDamage
      && s.events.includes('stomp')
  );
  // In the air, it goes under him.
  const t = stag(0.9);
  const q = ratAt(O.x + 4, O.z, t);
  t.mayAttack = false;
  until(t, q, 'chase', 10);
  for (let i = 0; i < 60 * 4 && t.state !== 'stompWind'; i++) {
    place(q, t, 1.6, Math.PI);
    tick(t, q);
  }
  const rq = play(t, q, (x, i) => (x.state === 'stompWind' && x.stateTime > S.stompWindup - 0.25 ? { jumpPressed: x.stateTime < S.stompWindup - 0.22, jumpHeld: true } : x.state === 'stomp' ? { jumpHeld: true } : i < 0 ? {} : {}), (x) => x.state === 'settle');
  check('a rat who jumps is missed by it', rq.results.length === 0 && rq.hp === MAX, rq.results.join(', '));
  // Far enough off, too.
  const u = stag(0.9);
  const pu = ratAt(O.x + 4, O.z, u);
  u.mayAttack = false;
  until(u, pu, 'chase', 10);
  for (let i = 0; i < 60 * 4 && u.state !== 'stompWind'; i++) {
    place(pu, u, 1.6, Math.PI);
    tick(u, pu);
  }
  place(pu, u, S.radius + S.stompReach + TUNING.rat.radius + 0.3, Math.PI);
  const ru = play(u, pu, still, (x) => x.state === 'settle');
  check('and so is one who has got clear of it', ru.results.length === 0);
}

// ---- Dying; turn-taking; the same dice ----
{
  const d = stag();
  let dead = false;
  for (let i = 0; i < S.hp; i++) dead = d.takeHit(1, d.x + 1, d.z);
  for (let i = 0; i < 60 * 14; i++) d.update(DT, d.x + 3, 0, d.z, true);
  check('it has fourteen hits in it (ten till 2026-11-25: it was dead in five seconds), and does not come back', dead && !d.alive && S.hp === 14);
  const again = new Stag({ x: O.x, z: O.z, respawn: true });
  for (let i = 0; i < S.hp; i++) again.takeHit(1, O.x + 1, O.z);
  for (let i = 0; i < 60 * (S.respawn + 1); i++) again.update(DT, O.x + 40, 0, O.z, true);
  check('(unless the level says so)', again.alive && again.hp === S.hp && again.poise === S.poise && again.state === 'idle');
  const a = stag(0.9);
  const b = new Stag({ x: O.x, z: O.z + 2.5, hunt: true, facing: FRONT });
  b.rng = () => 0.3;
  const p = ratAt(O.x + 2.3, O.z + 1.2, a);
  const director = new Director();
  let both = 0;
  let either = 0;
  for (let i = 0; i < 60 * 14; i++) {
    director.update(DT, [a, b], p.position.x, p.position.z);
    tick(a, p);
    tick(b, p);
    if (a.attacking && b.attacking) both++;
    if (a.attacking || b.attacking) either++;
  }
  check('two of them take turns: never both attacking at once', both === 0 && either > 60, `${either} frames of attacks`);
  const run = (): string => {
    let s0 = 9;
    const dice = (): number => ((s0 = (s0 * 1103515245 + 12345) % 2147483648) / 2147483648);
    const s = new Stag({ x: O.x, z: O.z, hunt: true, facing: FRONT });
    s.rng = dice;
    const q = ratAt(O.x + 2.2, O.z, s);
    const log: string[] = [];
    for (let i = 0; i < 60 * 14; i++) {
      tick(s, q);
      if (log[log.length - 1] !== s.state) log.push(s.state);
    }
    return `${log.join('>')} at ${s.x.toFixed(3)},${s.z.toFixed(3)}`;
  };
  const one = run();
  check('the same dice make the same fight', one === run() && one.includes('slam') && one.includes('sweep'), one.slice(0, 160));
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
