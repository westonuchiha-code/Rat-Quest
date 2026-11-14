// The Keep Guard: a rat behind a shield, with a spear. He keeps his shield on the knight (running round him does not
// work), a sword rings off it, and hammering on it makes him strike back at once. His thrust has a tell and is long,
// straight and narrow: step aside and he is open; block it and he is open longer; parry it, or plunge on him, and his
// guard is knocked wide. Unawares, he has no guard at all. All of it with the real controller and the real combat.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Guard, GUARD } from '../src/enemies/guard';
import { Director } from '../src/enemies/director';
import { SENSES } from '../src/enemies/foe';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import { NO_GEAR, STARTING_GEAR, ITEMS, gearMods } from '../src/data/equipment';

const chamber = buildChamber();
const DT = 1 / 60;
const G = GUARD;
// Open floor in the test chamber: he stands at O and his front is +x (the room runs out a few units past his post the other ways).
const O = { x: -12, z: 16.5 };
const FRONT = Math.PI / 2;
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
const fixed = (seed = 7): (() => number) => {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
};
const wear = (id: string) => gearMods([...Object.values(STARTING_GEAR).filter((s) => ITEMS[s].slot !== ITEMS[id].slot), id]);
/** A guard on the open floor, facing +x (towards where the rat is put), who will come for the rat wherever he is. */
function guard(seed = 7): Guard {
  const g = new Guard({ x: O.x, z: O.z, hunt: true, facing: FRONT });
  g.rng = fixed(seed);
  return g;
}
function ratAt(x: number, z: number, face?: Guard): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  if (face) p.facing = Math.atan2(face.x - x, face.z - z);
  return p;
}
const off = (g: Guard, p: PlayerController): number => Math.abs(Math.atan2(Math.sin(Math.atan2(p.position.x - g.x, p.position.z - g.z) - g.facing), Math.cos(Math.atan2(p.position.x - g.x, p.position.z - g.z) - g.facing)));
/** Lets him see the rat and come to his holding distance. */
function engage(g: Guard, p: PlayerController, frames = 240): void {
  for (let i = 0; i < frames && g.state !== 'hold'; i++) g.update(DT, p.position.x, p.position.y, p.position.z, true);
}
/** Puts the rat `d` from him, on the side `around` (radians from his front), facing him: within the sword's reach. */
function closeIn(p: PlayerController, g: Guard, d = 1.3, around = 0): void {
  const a = g.facing + around;
  p.position.set(g.x + Math.sin(a) * d, 0, g.z + Math.cos(a) * d);
  p.prevPosition.copy(p.position);
  p.velocity.set(0, 0, 0);
  p.facing = Math.atan2(g.x - p.position.x, g.z - p.position.z);
}
/** One swing at him (he keeps doing what he does). Returns what the swing did. */
function swingAt(p: PlayerController, g: Guard, act = true): CombatEvents {
  const ev = events();
  let seen = events();
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 30; i++) {
    p.facing = Math.atan2(g.x - p.position.x, g.z - p.position.z);
    if (act) g.update(DT, p.position.x, p.position.y, p.position.z, true);
    resolveCombat(p, [g], ev);
    if (ev.glanced || ev.enemyHit || ev.playerResult) seen = { ...seen, glanced: ev.glanced ?? seen.glanced, enemyHit: ev.enemyHit ?? seen.enemyHit, playerResult: ev.playerResult ?? seen.playerResult, enemyKilled: seen.enemyKilled || ev.enemyKilled };
    p.update(DT, input(), chamber.colliders);
  }
  return seen;
}

// ---- At his post ----
{
  const g = new Guard({ x: O.x, z: O.z, facing: 1.2 });
  g.rng = fixed();
  SENSES.notice = 1;
  for (let i = 0; i < 60; i++) g.update(DT, O.x + 30, 0, O.z, true);
  check('at his post he stands still, facing the way he was set, and has no guard up', g.state === 'idle' && Math.abs(g.facing - 1.2) < 1e-6 && !g.guarding && Math.hypot(g.x - O.x, g.z - O.z) < 1e-6);
  const far = new Guard({ x: O.x, z: O.z, arena: { x0: -100, x1: 100, z0: -100, z1: 100 } });
  for (let i = 0; i < 30; i++) far.update(DT, O.x + G.noticeRange + 1, 0, O.z, true);
  const unseen = far.state === 'idle';
  far.update(DT, O.x + G.noticeRange - 0.5, 0, O.z, true);
  check('he notices the rat from nine units, with a shout, and his shield comes up', unseen && far.state === 'chase' && far.guarding && far.events.includes('alert'));
  const soft = new Guard({ x: O.x, z: O.z, arena: { x0: -100, x1: 100, z0: -100, z1: 100 } });
  SENSES.notice = wear('mossScarf').notice;
  for (let i = 0; i < 30; i++) soft.update(DT, O.x + G.noticeRange * 0.6, 0, O.z, true);
  check('in the Moss Scarf the rat gets much nearer before he does', soft.state === 'idle');
  SENSES.notice = 1;
  // Unawares: a sword in his back lands. (Senses turned right down, so he does not look round as the rat walks up.)
  SENSES.notice = 0;
  const napping = new Guard({ x: O.x, z: O.z, facing: FRONT });
  const p = ratAt(O.x - 1.3, O.z, napping);
  const ev = swingAt(p, napping);
  SENSES.notice = 1;
  check('struck unawares he has no guard: the sword lands', ev.enemyHit === napping && !ev.glanced && napping.hp === G.hp - 1);
}

// ---- He comes on, stops at spear's length, and keeps his shield on the rat ----
{
  const g = guard();
  const p = ratAt(O.x + 6, O.z, g);
  engage(g, p);
  const d = Math.hypot(p.position.x - g.x, p.position.z - g.z);
  check('he walks up and stops at spear\'s length: inside his reach, outside the sword\'s', g.state === 'hold' && d <= G.holdRange + 0.05 && d > 1.05 + G.radius + 0.3 && d < G.radius + G.reach + TUNING.rat.radius + G.thrustSpeed * G.thrustTime, `${d.toFixed(2)} away`);
  // The rat runs right round him, twice: he turns with him.
  let worst = 0;
  let closest = 9;
  g.mayAttack = false; // (so he only turns)
  for (let i = 0; i < 60 * 6; i++) {
    const a = Math.atan2(p.position.x - g.x, p.position.z - g.z) + Math.PI / 2;
    p.update(DT, input({ move: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), run: true }), chamber.colliders);
    g.update(DT, p.position.x, p.position.y, p.position.z, true);
    resolveCombat(p, [g], events());
    worst = Math.max(worst, off(g, p));
    closest = Math.min(closest, Math.hypot(p.position.x - g.x, p.position.z - g.z));
  }
  check('running round him does not get behind his shield', worst < G.blockArc * 0.6, `never more than ${worst.toFixed(2)} rad off his front (the shield covers ${G.blockArc})`);
  // Crowded, he gives ground.
  const h = guard();
  const q = ratAt(O.x + 4, O.z, h);
  engage(h, q);
  h.mayAttack = false;
  const z0 = h.x;
  for (let i = 0; i < 90; i++) {
    q.update(DT, input({ move: new THREE.Vector3(-1, 0, 0) }), chamber.colliders);
    h.update(DT, q.position.x, q.position.y, q.position.z, true);
    resolveCombat(q, [h], events());
  }
  check('walked into, he backs off and keeps facing', h.x < z0 - 0.3 && off(h, q) < 0.2 && h.guarding, `gave ${(z0 - h.x).toFixed(2)}`);
}

// ---- A sword on his shield ----
{
  const g = guard();
  const p = ratAt(O.x + 1.9, O.z, g);
  engage(g, p);
  g.mayAttack = false;
  closeIn(p, g);
  const x0 = p.position.x;
  const first = swingAt(p, g);
  check('a sword from in front rings off his shield: no wound', first.glanced === g && !first.enemyHit && g.hp === G.hp && g.events.includes('block'));
  check('...and the rat\'s arm is jarred back', p.position.x > x0 + 0.1, `${(p.position.x - x0).toFixed(2)} back`);
  check('one blow does not make him strike', g.state === 'hold' || g.state === 'chase');
  for (let i = 0; i < 25; i++) {
    p.update(DT, input(), chamber.colliders);
    g.update(DT, p.position.x, p.position.y, p.position.z, true);
  }
  closeIn(p, g);
  swingAt(p, g, false);
  g.update(DT, p.position.x, p.position.y, p.position.z, true);
  check('a second, soon after, and he strikes back at once (even out of turn), with a shorter tell', g.state === 'windup' && g.counter && g.windupTime < G.windup && !g.mayAttack);
  // Left alone for a while he forgets the first.
  const h = guard();
  const q = ratAt(O.x + 1.9, O.z, h);
  engage(h, q);
  h.mayAttack = false;
  closeIn(q, h);
  const one = swingAt(q, h);
  for (let i = 0; i < 60 * (G.counterForget + 0.5); i++) h.update(DT, q.position.x, q.position.y, q.position.z, true);
  closeIn(q, h);
  const two = swingAt(q, h, false);
  h.update(DT, q.position.x, q.position.y, q.position.z, true);
  check('two blows far apart do not', one.glanced === h && two.glanced === h && h.state !== 'windup');
  // Where his shield does not reach.
  const s = guard();
  s.update(DT, O.x + 3, 0, O.z, true);
  check('his shield covers his front and not his back or his flank', s.deflects(s.x + 2, s.z) && s.deflects(s.x + 1.5, s.z + 1.5) && !s.deflects(s.x - 2, s.z) && !s.deflects(s.x - 0.3, s.z + 2));
  check('a plunge is never turned by it (see below for what it does)', !s.deflects(s.x + 1, s.z, 'plunge'));
}

// ---- The thrust ----
/** Lets him hold until he thrusts at the rat. `during` gets each tick of it. Returns what happened to the rat. */
function takeThrust(g: Guard, p: PlayerController, during: (state: string, t: number) => Partial<PlayerInput>): { result: string | null; tell: number; hp: number } {
  let result: string | null = null;
  let tell = 0;
  const ev = events();
  for (let i = 0; i < 60 * 8; i++) {
    const before = g.state;
    g.update(DT, p.position.x, p.position.y, p.position.z, true);
    if (g.state === 'windup') tell += DT;
    p.update(DT, input(during(g.state, g.stateTime)), chamber.colliders);
    resolveCombat(p, [g], ev);
    if (ev.playerResult) result = ev.playerResult;
    if (before === 'thrust' && g.state !== 'thrust') break;
    if (g.state === 'broken') break;
  }
  return { result, tell, hp: p.hp };
}
{
  const g = guard();
  const p = ratAt(O.x + 5, O.z, g);
  engage(g, p);
  const stood = takeThrust(g, p, () => ({}));
  check('he holds a moment, draws back (the tell), and thrusts: a rat who just stands there is run through', stood.result === 'hit' && stood.hp === TUNING.health.max - G.damage && Math.abs(stood.tell - G.windup) < 0.05, `tell ${stood.tell.toFixed(2)} s`);
  check('the tell is long enough to act on, and shorter than the ironback\'s', G.windup >= 0.5 && G.windup < 0.95 && G.counterWindup >= 0.4);
  check('having met his mark, he is still stretched out and open', g.state === 'recover' && g.open && !g.guarding);
}
{
  // Stepping aside once he is committed.
  const g = guard(11);
  const p = ratAt(O.x + 5, O.z, g);
  engage(g, p);
  const side = takeThrust(g, p, (state, t) => (state === 'windup' && t > G.windup * G.track ? { move: new THREE.Vector3(0, 0, 1), run: true } : state === 'thrust' ? { move: new THREE.Vector3(0, 0, 1), run: true } : {}));
  check('a step to the side once he has committed, and the spear goes past', side.result === null && side.hp === TUNING.health.max, `rat ended ${(p.position.z - O.z).toFixed(2)} to the side`);
  check('...and he is left stretched out with his shield down', g.state === 'recover' && g.open);
  // Now the sword lands, from the front.
  closeIn(p, g);
  const ev = swingAt(p, g, false);
  check('...so the sword lands', ev.enemyHit === g && !ev.glanced && g.hp === G.hp - 1 && g.state === 'stagger');
  for (let i = 0; i < 60 * G.stagger + 2; i++) g.update(DT, p.position.x, p.position.y, p.position.z, true);
  check('struck, he reels a moment, then his shield is up again', g.guarding);
}
{
  // Blocked.
  const g = guard(3);
  const p = ratAt(O.x + 5, O.z, g);
  engage(g, p);
  const held = takeThrust(g, p, () => ({ guardHeld: true }));
  check('a raised shield stops the thrust, and he is open for longer', held.result === 'blocked' && held.hp === TUNING.health.max && g.state === 'recover' && g.open);
  let open = 0;
  while (g.state === 'recover' && open < 600) { g.update(DT, p.position.x, p.position.y, p.position.z, true); open++; }
  check('...about a second and a half', Math.abs(open * DT - G.blockedRecover) < 0.1 && G.blockedRecover > G.recover, `${(open * DT).toFixed(2)} s`);
}
{
  // Parried: the shield goes up just before the point arrives.
  let got: { result: string | null; hp: number } | null = null;
  let g = guard(5);
  let p = ratAt(O.x + 5, O.z, g);
  for (const lead of [0.02, 0.05, 0.08, 0.11]) {
    g = guard(5);
    p = ratAt(O.x + 5, O.z, g);
    engage(g, p);
    const r = takeThrust(g, p, (state, t) => ({ guardHeld: (state === 'windup' && t > G.windup - lead) || state === 'thrust' }));
    if (r.result === 'parried') { got = r; break; }
  }
  check('a perfect guard turns the thrust and knocks his shield wide', got !== null && got.hp === TUNING.health.max && g.state === 'broken' && g.open && g.events.includes('broken'));
  let open = 0;
  const gg = g;
  const start = gg.stateTime;
  while (gg.state === 'broken' && open < 900) { gg.update(DT, p.position.x, p.position.y, p.position.z, true); open++; }
  check('...for a long time (longer than any other opening)', (open * DT + start) > G.brokenParry - 0.1 && G.brokenParry > G.blockedRecover && G.brokenParry > G.brokenPlunge, `${(open * DT + start).toFixed(2)} s`);
  // The Buckler's doubled window makes that parry easier, the same as against anything else.
  check('(the Buckler doubles the time there is to do it)', wear('buckler').parry === 2 && NO_GEAR.parry === 1);
}

// ---- The plunge ----
{
  const g = guard();
  const p = ratAt(O.x + 5, O.z, g);
  engage(g, p);
  g.mayAttack = false;
  // Dropped onto him from above with the sword down.
  const q = new PlayerController(new THREE.Vector3(g.x + 0.3, 3.2, g.z));
  const ev = events();
  let hit = false;
  q.update(DT, input(), chamber.colliders);
  q.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 120 && !hit; i++) {
    q.update(DT, input(), chamber.colliders);
    g.update(DT, q.position.x, 0, q.position.z, true);
    resolveCombat(q, [g], ev);
    if (ev.enemyHit === g || ev.glanced === g) hit = true;
  }
  check('a plunge comes down over his shield: it does not wound him, but his guard is smashed open', hit && ev.enemyHit === g && !ev.glanced && g.hp === G.hp && g.state === 'broken' && g.open);
  // While he is open, every blow lands; a second plunge then does its full work.
  const before = g.hp;
  g.takeHit(TUNING.plunge.diveDamage, g.x + 1, g.z, 'plunge');
  check('...and a plunge on him while he is open wounds him as it would anything', g.hp === before - TUNING.plunge.diveDamage);
  const front = ratAt(g.x + 1.5, g.z, g);
  closeIn(front, g);
  g.lastSwing = -1; // (a new test rat counts its swings from one again)
  const landed = swingAt(front, g, false);
  check('...as does the sword, from the front', (landed.enemyHit === g || landed.enemyKilled) && !landed.glanced);
}

// ---- Dying, and taking turns ----
{
  const g = guard();
  g.update(DT, O.x + 3, 0, O.z, true);
  let killed = false;
  let blows = 0;
  while (!killed && blows < 20) {
    killed = g.takeHit(1, g.x - 1, g.z); // from behind: past his shield
    blows++;
  }
  check(`${G.hp} blows that land kill him`, killed && blows === G.hp && !g.alive && g.state === 'dead');
  for (let i = 0; i < 60 * (G.respawn + 2); i++) g.update(DT, O.x + 3, 0, O.z, true);
  check('he does not come back (unless a level says so)', !g.alive && new Guard({ x: 0, z: 0, respawn: true }).respawns);
  // The director: among others he waits his turn; hammered on, he does not.
  const a = guard(1);
  const b = guard(2);
  b.z += 2;
  const p = ratAt(O.x + 4, O.z + 1, a);
  const dir = new Director();
  let both = 0;
  let thrusts = 0;
  let was = 0;
  for (let i = 0; i < 60 * 14; i++) {
    dir.update(DT, [a, b], p.position.x, p.position.z);
    a.update(DT, p.position.x, p.position.y, p.position.z, true);
    b.update(DT, p.position.x, p.position.y, p.position.z, true);
    const now = (a.attacking ? 1 : 0) + (b.attacking ? 1 : 0);
    if (now === 2) both++;
    if (now > was) thrusts++;
    was = now;
  }
  check('two guards take turns: never both thrusting at once, and both get their thrusts in', both === 0 && thrusts >= 4, `${thrusts} thrusts in 14 s`);
  // The same dice, the same fight.
  const run = (seed: number): string => {
    const g2 = guard(seed);
    const p2 = ratAt(O.x + 5, O.z, g2);
    let log = '';
    for (let i = 0; i < 600; i++) {
      const s0 = g2.state;
      g2.update(DT, p2.position.x, p2.position.y, p2.position.z, true);
      if (g2.state !== s0) log += `${i}:${g2.state} `;
    }
    return log;
  };
  check('with the same dice he fights the same fight', run(4) === run(4) && run(4) !== run(9) && run(4).includes('thrust'));
}

console.log(failures === 0 ? '\nall passed' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
