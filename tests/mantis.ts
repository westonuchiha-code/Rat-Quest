// The Orchid Mantis: a duellist with two scythes and no armour. It will not stand and be hit: a sword swung at it while
// it sways meets air (it springs back), but not twice running, and not while it is busy. Its cuts have a tell and the
// second one may come late; its leap has a bigger tell, hits harder, and leaves its scythes stuck in the floor if it
// misses. All of it with the real controller, the real combat and the real turn-taking.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Mantis, MANTIS, type MantisState } from '../src/enemies/mantis';
import { Director } from '../src/enemies/director';
import { SENSES } from '../src/enemies/foe';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import { STARTING_GEAR, ITEMS, gearMods } from '../src/data/equipment';

const chamber = buildChamber();
const DT = 1 / 60;
const M = MANTIS;
// Open floor in the test chamber: it stands at O and its front is +x.
const O = { x: -13, z: 16.5 };
const FRONT = Math.PI / 2;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const wear = (id: string) => gearMods([...Object.values(STARTING_GEAR).filter((s) => ITEMS[s].slot !== ITEMS[id].slot), id]);
/** A mantis on the open floor, facing +x, that will come for the rat wherever he is. Its dice all roll `roll`. */
function mantis(roll = 0.6): Mantis {
  const m = new Mantis({ x: O.x, z: O.z, hunt: true, facing: FRONT });
  m.rng = () => roll;
  return m;
}
function ratAt(x: number, z: number, face?: Mantis): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
  return p;
}
const gap = (m: Mantis, p: PlayerController): number => Math.hypot(p.position.x - m.x, p.position.z - m.z);
const tick = (m: Mantis, p: PlayerController): void => m.update(DT, p.position.x, p.position.y, p.position.z, !p.dead, p.state === 'attack');
/** Runs it until it is in `state` (or the frames run out). */
function until(m: Mantis, p: PlayerController, state: MantisState, frames = 600): boolean {
  for (let i = 0; i < frames && m.state !== state; i++) tick(m, p);
  return m.state === state;
}
/** Puts the rat `d` from it, `around` radians from its front, facing it. */
function closeIn(p: PlayerController, m: Mantis, d = 1.35, around = 0): void {
  const a = m.facing + around;
  p.position.set(m.x + Math.sin(a) * d, 0, m.z + Math.cos(a) * d);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  p.facing = Math.atan2(m.x - p.position.x, m.z - p.position.z);
}
/** One swing at it, while it goes on doing what it does. Returns what the swing did. */
function swingAt(p: PlayerController, m: Mantis): CombatEvents {
  const ev = events();
  let seen = events();
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 28; i++) {
    tick(m, p);
    resolveCombat(p, [m], ev);
    if (ev.enemyHit || ev.playerResult) seen = { ...seen, enemyHit: ev.enemyHit ?? seen.enemyHit, playerResult: ev.playerResult ?? seen.playerResult, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}
/** Plays the fight on with the rat doing `act` each frame, until `stop`. Returns what reached the rat. */
function play(m: Mantis, p: PlayerController, act: (m: Mantis, frame: number) => Partial<PlayerInput>, stop: (m: Mantis, frame: number) => boolean, frames = 900): { results: string[]; hp: number; frames: number } {
  const results: string[] = [];
  const ev = events();
  let i = 0;
  for (; i < frames && !stop(m, i); i++) {
    p.update(DT, input(act(m, i)), chamber.colliders);
    tick(m, p);
    resolveCombat(p, [m], ev);
    if (ev.playerResult) results.push(ev.playerResult);
  }
  return { results, hp: p.hp, frames: i };
}
const still = (): Partial<PlayerInput> => ({});

// ---- At rest ----
{
  SENSES.notice = 1;
  const m = new Mantis({ x: O.x, z: O.z, facing: 1.2 });
  for (let i = 0; i < 60; i++) m.update(DT, O.x + 30, 0, O.z, true);
  check('at rest it stays where it is, facing the way it was set', m.state === 'idle' && Math.abs(m.facing - 1.2) < 1e-6 && Math.hypot(m.x - O.x, m.z - O.z) < 1e-6);
  const far = new Mantis({ x: O.x, z: O.z, arena: { x0: -100, x1: 100, z0: -100, z1: 100 } });
  for (let i = 0; i < 30; i++) far.update(DT, O.x + M.noticeRange + 1, 0, O.z, true);
  const unseen = far.state === 'idle';
  far.update(DT, O.x + M.noticeRange - 0.5, 0, O.z, true);
  check('it notices the rat from ten units and comes for him', unseen && far.state === 'stalk' && far.events.includes('alert'));
  const soft = new Mantis({ x: O.x, z: O.z, arena: { x0: -100, x1: 100, z0: -100, z1: 100 } });
  SENSES.notice = wear('mossScarf').notice;
  for (let i = 0; i < 30; i++) soft.update(DT, O.x + M.noticeRange * 0.6, 0, O.z, true);
  check('in the Moss Scarf the rat gets much nearer first', soft.state === 'idle');
  // Unawares: it does not spring away from a sword it has not seen.
  SENSES.notice = 0;
  const napping = new Mantis({ x: O.x, z: O.z, facing: FRONT });
  const p = ratAt(O.x - 1.3, O.z, napping);
  const ev = swingAt(p, napping);
  SENSES.notice = 1;
  check('struck unawares it does not get out of the way: the sword lands', ev.enemyHit === napping && napping.hp === M.hp - 1 && !napping.events.includes('hop'));
}

// ---- It comes in, and sways round him at arm's length ----
{
  const m = mantis();
  const p = ratAt(O.x + 7, O.z, m);
  m.mayAttack = false;
  check('it walks up and stops to sway, outside the sword\'s reach', until(m, p, 'sway') && gap(m, p) <= M.swayRange + 0.05 && gap(m, p) > 1.05 + M.radius + 0.5, `${gap(m, p).toFixed(2)} away`);
  let near = 9;
  let far = 0;
  let turned = 0;
  let worst = 0;
  const a0 = Math.atan2(m.x - p.position.x, m.z - p.position.z);
  for (let i = 0; i < 60 * 4; i++) {
    tick(m, p);
    near = Math.min(near, gap(m, p));
    far = Math.max(far, gap(m, p));
    turned = Math.max(turned, Math.abs(Math.atan2(Math.sin(Math.atan2(m.x - p.position.x, m.z - p.position.z) - a0), Math.cos(Math.atan2(m.x - p.position.x, m.z - p.position.z) - a0))));
    worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(Math.atan2(p.position.x - m.x, p.position.z - m.z) - m.facing), Math.cos(Math.atan2(p.position.x - m.x, p.position.z - m.z) - m.facing))));
  }
  check('swaying, it steps round him, keeps its distance and keeps facing him', m.state === 'sway' && turned > 0.4 && near > M.swayRange - 0.5 && far < M.swayRange + 0.6 && worst < 0.3, `went ${turned.toFixed(2)} rad round him, ${near.toFixed(2)} to ${far.toFixed(2)} away, never more than ${worst.toFixed(2)} rad off him`);
}

// ---- A sword swung at it while it sways meets air; but not twice running ----
{
  const m = mantis();
  const p = ratAt(O.x + 4, O.z, m);
  m.mayAttack = false;
  until(m, p, 'sway');
  closeIn(p, m);
  const before = { x: m.x, z: m.z };
  const ev = swingAt(p, m);
  const back = Math.hypot(m.x - before.x, m.z - before.z);
  check('swing at it while it sways and it springs back out of reach: the sword meets air', !ev.enemyHit && m.hp === M.hp && m.events.includes('hop') && back > 1.6, `it went ${back.toFixed(2)} back`);
  check('it has to see the swing coming: it must be poised, and the rat in front of it', !m.poised);
  // He runs it down and swings again before it has its feet under it.
  m.events.length = 0;
  m.mayAttack = false;
  until(m, p, 'sway', 30);
  closeIn(p, m);
  m.lastSwing = -1;
  const again = swingAt(p, m);
  check('swing again before it is set and it cannot do that twice: the sword lands', again.enemyHit === m && m.hp === M.hp - 1 && !m.events.includes('hop'));
  // From behind it sees nothing.
  const n = mantis();
  const q = ratAt(O.x + 4, O.z, n);
  n.mayAttack = false;
  until(n, q, 'sway');
  closeIn(q, n, 1.35, Math.PI);
  const blind = swingAt(q, n);
  check('from behind, it does not see the sword at all', blind.enemyHit === n && n.hp === M.hp - 1);
}

// ---- Hit twice running, it springs away ----
{
  const m = mantis();
  const p = ratAt(O.x + 4, O.z, m);
  m.mayAttack = false;
  until(m, p, 'sway');
  (m as unknown as { evadeCool: number }).evadeCool = 99; // it has just hopped: it cannot again of its own accord
  closeIn(p, m);
  const first = swingAt(p, m);
  closeIn(p, m);
  m.lastSwing = -1;
  m.events.length = 0;
  const second = swingAt(p, m);
  for (let i = 0; i < 20; i++) tick(m, p);
  check('two blows in a row land, and then it springs away whether it is ready to or not', first.enemyHit === m && second.enemyHit === m && m.hp === M.hp - 2 && m.events.includes('hop'), `hp ${m.hp}`);
}

// ---- The cuts ----
{
  // Dice at 0.6: its left scythe first, a second cut follows, and it comes at once.
  const m = mantis(0.6);
  const p = ratAt(O.x + 3.4, O.z, m);
  until(m, p, 'windup');
  const firstArm = m.arm;
  const told = m.events.includes('windup');
  let tell = 0;
  while (m.state === 'windup' && tell < 200) { tick(m, p); tell++; }
  check('a scythe goes up before it comes down: half a second of warning', told && m.state === 'slash' && Math.abs(tell * DT - M.windup) < 0.04, `${(tell * DT).toFixed(2)} s`);
  const r = play(m, p, still, (mm) => mm.state === 'recover');
  check('the rat who stands there is cut twice, a heart each', r.results.filter((x) => x === 'hit').length >= 1 && r.hp <= TUNING.health.max - M.damage, `${r.results.join(', ')}; hearts ${r.hp}`);
  check('the second cut is the other scythe', m.cut === 1 && m.arm === -firstArm);
  let open = 0;
  while (m.state === 'recover' && open < 300) { tick(m, p); open++; }
  check('after its cuts its arms are down for most of a second: open', Math.abs(open * DT - M.recover) < 0.06 && M.recover > 0.8, `${(open * DT).toFixed(2)} s`);

  // The second cut: at once, or held.
  const time2 = (roll: number): { quick: boolean; secs: number } => {
    const mm = mantis(roll);
    const pp = ratAt(O.x + 3.4, O.z, mm);
    until(mm, pp, 'slash');
    until(mm, pp, 'windup');
    let n = 0;
    while (mm.state === 'windup' && n < 200) { tick(mm, pp); n++; }
    return { quick: !mm.held, secs: n * DT };
  };
  const quick = time2(0.6);
  const held = time2(0.1);
  check('the second cut comes at once...', quick.quick && Math.abs(quick.secs - M.quick) < 0.04, `${quick.secs.toFixed(2)} s`);
  check('...or is held, to catch a roll made on the beat of the first', !held.quick && Math.abs(held.secs - M.delayed) < 0.04 && M.delayed > M.quick + TUNING.dodge.roll.duration * 0.6, `${held.secs.toFixed(2)} s`);
  // Sometimes there is no second cut.
  const lone = mantis(0.9);
  const pl = ratAt(O.x + 3.4, O.z, lone);
  until(lone, pl, 'slash');
  while (lone.state === 'slash') tick(lone, pl);
  check('and sometimes there is only the one', lone.state === 'recover');
}

// ---- Open after its cuts: the sword lands and it stays open ----
{
  const m = mantis(0.9);
  const p = ratAt(O.x + 6, O.z, m);
  // He keeps out of the cut (it steps in with it), then steps in himself.
  until(m, p, 'recover', 1200);
  closeIn(p, m);
  const ev = swingAt(p, m);
  check('spent after its cuts, it does not get out of the way: the sword lands', m.hp === M.hp - 1 && ev.enemyHit === m && !m.events.includes('hop') && !m.poised);
}

// ---- Blocked, and turned ----
{
  const m = mantis(0.6);
  const p = ratAt(O.x + 3.4, O.z, m);
  const r = play(m, p, () => ({ guardHeld: true }), (mm) => mm.state === 'recover');
  check('a shield held up stops both cuts, and the second comes all the same', r.results.filter((x) => x === 'blocked').length === 2 && r.hp === TUNING.health.max && m.cut === 1, r.results.join(', '));
  // The shield brought up just as the cut arrives.
  let turned: Mantis | null = null;
  for (let lead = 0.02; lead < TUNING.guard.parryWindow && !turned; lead += 0.02) {
    const mm = mantis(0.6);
    const pp = ratAt(O.x + 3.4, O.z, mm);
    const rr = play(mm, pp, (x) => ({ guardHeld: (x.state === 'windup' && x.stateTime > x.windupTime - lead) || x.state === 'slash' }), (x) => x.state === 'reel' || x.state === 'recover');
    if (rr.results.includes('parried') && mm.state === 'reel') turned = mm;
  }
  check('a perfect guard turns a cut and throws its arms wide', turned !== null && turned.open && turned.events.includes('reel'));
  if (turned) {
    const p2 = ratAt(turned.x + 1.35, turned.z, turned);
    closeIn(p2, turned);
    const a = swingAt(p2, turned);
    check('reeling, it is hit and goes on reeling', a.enemyHit === turned && turned.state === 'reel' && turned.hp === M.hp - 1);
    let n = turned.stateTime / DT;
    while (turned.state === 'reel' && n < 900) { tick(turned, p2); n++; }
    check('...for longer than any other opening', n * DT > M.reel - 0.1 && M.reel > M.stuck && M.stuck > M.recover, `${(n * DT).toFixed(2)} s`);
  }
}

// ---- The leap ----
{
  const m = mantis(0.6);
  const p = ratAt(O.x + 8, O.z, m);
  SENSES.notice = 1;
  const crouched = until(m, p, 'crouch');
  const from = { x: m.x, z: m.z };
  const d0 = gap(m, p);
  let tell = 0;
  while (m.state === 'crouch' && tell < 200) { tick(m, p); tell++; }
  check('from further off it crouches first: more than half a second of warning', crouched && m.events.includes('crouch') && m.state === 'leap' && Math.abs(tell * DT - M.leapWindup) < 0.04 && d0 > M.leapRange[0], `${(tell * DT).toFixed(2)} s, from ${d0.toFixed(2)} away`);
  const r = play(m, p, still, (mm) => mm.state === 'stuck');
  const went = Math.hypot(m.x - from.x, m.z - from.z);
  check('it comes down just short of where he stood, and a rat still standing there is cut for two hearts', r.results.includes('hit') && r.hp === TUNING.health.max - M.leapDamage && Math.abs(gap(m, p) - M.leapShort) < 0.9 && went > 3, `leapt ${went.toFixed(2)}, landed ${gap(m, p).toFixed(2)} from him; hearts ${r.hp}`);

  // He steps aside.
  const n = mantis(0.6);
  const q = ratAt(O.x + 8, O.z, n);
  until(n, q, 'crouch');
  const r2 = play(n, q, (x) => (x.state === 'crouch' && x.stateTime < M.leapWindup * 0.5 ? {} : { move: new THREE.Vector3(0, 0, 1), run: true }), (x) => x.state === 'stuck');
  check('step aside once it has committed and it comes down on nothing, its scythes in the floor', r2.results.length === 0 && r2.hp === TUNING.health.max && n.state === 'stuck' && n.open && n.events.includes('land'), `it landed ${gap(n, q).toFixed(2)} from him`);
  let stuck = 0;
  const before = n.hp;
  n.events.length = 0;
  closeIn(q, n, 1.35, Math.PI / 2);
  const hits: boolean[] = [];
  for (let k = 0; k < 3 && n.state === 'stuck'; k++) {
    n.lastSwing = -1;
    hits.push(swingAt(q, n).enemyHit === n);
    closeIn(q, n, 1.35, Math.PI / 2);
  }
  stuck = n.stateTime;
  check('stuck, it is open for well over a second: time for two good blows', hits.filter(Boolean).length >= 2 && n.hp <= before - 2 && M.stuck >= 1.2, `${hits.filter(Boolean).length} blows landed, ${stuck.toFixed(2)} s in`);
  for (let i = 0; i < 200 && n.state === 'stuck'; i++) tick(n, q);
  check('and when it pulls free after that, it springs away', n.events.includes('hop') && n.state !== 'stuck');

  // A shield stops the leap too; a perfect guard throws it back.
  const b = mantis(0.6);
  const pb = ratAt(O.x + 8, O.z, b);
  until(b, pb, 'crouch');
  const rb = play(b, pb, () => ({ guardHeld: true }), (x) => x.state === 'stuck' || x.state === 'reel');
  check('a shield held up stops the leap, and it is stuck all the same', rb.results.includes('blocked') && rb.hp === TUNING.health.max && b.state === 'stuck');

  // Too near, it cuts instead; it does not leap twice in a breath.
  const c = mantis(0.6);
  const pc = ratAt(O.x + 2.6, O.z, c);
  until(c, pc, 'windup');
  check('close up it cuts; it only leaps from further off', c.state === 'windup' && M.leapRange[0] > M.swayRange + 0.7);
}

// ---- It keeps to the floor ----
{
  // Floor only for x up to O.x + 3: it will not leap past the edge, however far off the rat is.
  const m = mantis(0.6);
  m.canStand = (x) => x <= O.x + 5;
  const p = ratAt(O.x + 8.5, O.z, m);
  const went = until(m, p, 'crouch', 1200);
  const x1 = m.x;
  until(m, p, 'stuck', 300);
  check('it does not leap off the floor: it comes down at the edge', went && m.state === 'stuck' && m.x <= O.x + 5 + 1e-6 && m.x > x1 + 1, `leapt from ${(x1 - O.x).toFixed(2)}, landed at ${(m.x - O.x).toFixed(2)} (floor ends at 5)`);
  // Something solid in the way: it comes down before it.
  const w = mantis(0.6);
  const pw = ratAt(O.x + 8.5, O.z, w);
  until(w, pw, 'crouch', 1200);
  const x0 = w.x;
  w.wallAt = (x) => x > x0 + 2 && x < x0 + 2.6;
  until(w, pw, 'stuck', 300);
  check('nor through a wall: it comes down short of it', w.state === 'stuck' && w.x < x0 + 2 && w.x >= x0, `leapt from ${(x0 - O.x).toFixed(2)}, landed ${(w.x - x0).toFixed(2)} on (wall 2 on)`);
  // No floor behind it: it springs aside instead.
  const h = mantis(0.6);
  const ph = ratAt(O.x + 4, O.z, h);
  h.mayAttack = false;
  until(h, ph, 'sway');
  const edge = h.x - 0.4;
  h.canStand = (x) => x >= edge;
  closeIn(ph, h);
  let ok = true;
  const z0 = h.z;
  swingAt(ph, h);
  for (let i = 0; i < 30; i++) {
    tick(h, ph);
    if (h.x < edge - 1e-6) ok = false;
  }
  check('with no floor behind it, it springs aside and stays on the floor', ok && h.events.includes('hop') && Math.abs(h.z - z0) > 0.8, `went ${Math.abs(h.z - z0).toFixed(2)} sideways`);
}

// ---- A plunge, and dying ----
{
  const m = mantis();
  const p = ratAt(O.x + 4, O.z, m);
  m.mayAttack = false;
  until(m, p, 'sway');
  const poised = m.poised;
  const killed = m.takeHit(TUNING.plunge.diveDamage, m.x + 0.2, m.z, 'plunge');
  check('a plunge from above lands on it even when it is poised', poised && !killed && m.hp === M.hp - TUNING.plunge.diveDamage && m.state === 'stagger');
  const d = mantis();
  let dead = false;
  for (let i = 0; i < M.hp; i++) dead = d.takeHit(1, d.x + 1, d.z);
  for (let i = 0; i < 60 * 12; i++) d.update(DT, d.x + 3, 0, d.z, true);
  check('it has six hits in it, and does not come back', dead && !d.alive && d.state === 'dead' && M.hp === 6);
  const again = new Mantis({ x: O.x, z: O.z, respawn: true });
  for (let i = 0; i < M.hp; i++) again.takeHit(1, O.x + 1, O.z);
  for (let i = 0; i < 60 * (M.respawn + 1); i++) again.update(DT, O.x + 40, 0, O.z, true);
  check('(unless the level says so)', again.alive && again.hp === M.hp && again.state === 'idle');
}

// ---- Two of them take turns; and the same dice make the same fight ----
{
  const a = mantis(0.6);
  const b = new Mantis({ x: O.x, z: O.z + 2, hunt: true, facing: FRONT });
  b.rng = () => 0.3;
  const p = ratAt(O.x + 3.4, O.z + 1, a);
  const director = new Director();
  let both = 0;
  let either = 0;
  for (let i = 0; i < 60 * 12; i++) {
    director.update(DT, [a, b], p.position.x, p.position.z);
    tick(a, p);
    tick(b, p);
    if (a.attacking && b.attacking) both++;
    if (a.attacking || b.attacking) either++;
  }
  check('two of them take turns: never both attacking at once', both === 0 && either > 60, `${either} frames of attacks`);
  const run = (): string => {
    let s = 9;
    const dice = (): number => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
    const m = new Mantis({ x: O.x, z: O.z, hunt: true, facing: FRONT });
    m.rng = dice;
    const q = ratAt(O.x + 8.5, O.z, m);
    const log: string[] = [];
    for (let i = 0; i < 60 * 10; i++) {
      tick(m, q);
      if (log[log.length - 1] !== m.state) log.push(m.state);
    }
    return `${log.join('>')} at ${m.x.toFixed(3)},${m.z.toFixed(3)}`;
  };
  const one = run();
  check('the same dice make the same fight', one === run() && one.includes('slash') && one.includes('leap'), one.slice(0, 150));
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
