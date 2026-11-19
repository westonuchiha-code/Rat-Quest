// The ironback: its shell turns the sword from the front and sides, its tail is soft, it turns slowly, it bucks after two
// hits from behind, it rams (and flips over against a wall, a perfect guard or a plunge), and it tosses its horn up close.
import './../src/core/colorSetup';
import * as THREE from 'three';
import { PlayerController, PlayerInput } from '../src/player/controller';
import { Ironback, IRONBACK } from '../src/enemies/ironback';
import { CombatEvents, resolveCombat } from '../src/combat/combat';
import { buildChamber } from '../src/world/chamber';
import { TUNING } from '../src/data/tuning';
import type { CanStand } from '../src/enemies/foe';

const chamber = buildChamber();
const DT = 1 / 60;
const I = IRONBACK;
const HOME = TUNING.scuttler.home; // open floor in the test chamber
let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}
const input = (o: Partial<PlayerInput> = {}): PlayerInput => ({ move: new THREE.Vector3(), run: false, jumpPressed: false, jumpHeld: false, attackPressed: false, dodgePressed: false, guardHeld: false, stowPressed: false, ...o });
const events = (): CombatEvents => ({ enemyHit: null, enemyKilled: false, playerResult: null, shockwave: false, cratesBroken: [] });
/** A rat standing at (x, z), landed, facing the beetle. */
function ratAt(x: number, z: number, e: Ironback): PlayerController {
  const p = new PlayerController(new THREE.Vector3(x, 0, z));
  for (let i = 0; i < 20; i++) p.update(DT, input(), chamber.colliders);
  p.facing = Math.atan2(e.x - p.position.x, e.z - p.position.z);
  return p;
}
function beetle(facing = 0): Ironback {
  const e = new Ironback({ x: HOME.x, z: HOME.z, hunt: true });
  e.facing = facing;
  return e;
}
/** Swings once at the beetle (it does not act); returns what happened. */
let closest = 0;
function swingAt(p: PlayerController, e: Ironback): CombatEvents {
  const ev = events();
  let seen: CombatEvents = events();
  closest = Infinity;
  p.update(DT, input({ attackPressed: true }), chamber.colliders);
  for (let i = 0; i < 30; i++) {
    p.facing = Math.atan2(e.x - p.position.x, e.z - p.position.z);
    resolveCombat(p, [e], ev);
    if (ev.glanced || ev.enemyHit) seen = { ...ev };
    p.update(DT, input(), chamber.colliders);
    closest = Math.min(closest, Math.hypot(p.position.x - e.x, p.position.z - e.z));
  }
  return seen;
}

// ---- The shell ----
{
  const e = beetle(0); // facing +z
  check('a hit from in front glances off', e.deflects(e.x, e.z + 2));
  check('so does one from the side', e.deflects(e.x + 2, e.z) && e.deflects(e.x - 2, e.z));
  check('one from behind does not', !e.deflects(e.x, e.z - 2) && !e.deflects(e.x + 0.8, e.z - 2));
  check('a plunge onto it is never turned', !e.deflects(e.x, e.z + 2, 'plunge'));

  const front = ratAt(e.x, e.z + 1.6, e);
  const ev = swingAt(front, e);
  check('the sword glances off the front: a clank, no harm', ev.glanced === e && !ev.enemyHit && e.hp === I.hp);
  const pushed = Math.hypot(front.position.x - e.x, front.position.z - e.z) - closest;
  check('his arm bounces back and he is pushed off a step', pushed > 0.25, pushed.toFixed(2));
  // Right after a glance he cannot swing again (a moment later he can).
  const e2 = beetle(0); // (a fresh one: it remembers the last swing number that touched it)
  const again = ratAt(e2.x, e2.z + 1.6, e2);
  again.update(DT, input({ attackPressed: true }), chamber.colliders);
  const ev3 = events();
  for (let i = 0; i < 30 && !ev3.glanced; i++) {
    again.update(DT, input(), chamber.colliders);
    resolveCombat(again, [e2], ev3);
  }
  again.update(DT, input({ attackPressed: true }), chamber.colliders);
  const stopped = again.state !== 'attack';
  for (let i = 0; i < Math.ceil(TUNING.health.recoilStun * 60) + 30; i++) again.update(DT, input(), chamber.colliders);
  again.update(DT, input({ attackPressed: true }), chamber.colliders);
  check('right after a glance he cannot swing again; a moment later he can', ev3.glanced === e2 && stopped && again.state === 'attack', `glanced=${ev3.glanced === e2} stopped=${stopped} ${again.state}`);

  const b = beetle(0);
  const back = ratAt(b.x, b.z - 1.6, b);
  const ev2 = swingAt(back, b);
  check('the sword lands from behind', ev2.enemyHit === b && b.hp === I.hp - 1 && b.state === 'stagger', `hp=${b.hp} state=${b.state}`);
}

// ---- Slow to turn: he can get round it ----
{
  const e = beetle(0);
  e.state = 'chase';
  for (let i = 0; i < 30; i++) e.update(DT, e.x, 0, e.z - 3, true); // he is right behind it
  const turned = Math.abs(e.facing);
  check('it turns slowly (half a second: no more than its turn rate)', turned <= I.turnRate * 0.5 + 0.01 && turned > 0.3, turned.toFixed(2));
}

// ---- Two hits from behind, and it bucks ----
{
  const e = beetle(0);
  e.state = 'chase';
  e.takeHit(1, e.x, e.z - 1.5);
  for (let i = 0; i < 40; i++) e.update(DT, e.x, 0, e.z - 1.5, true);
  e.takeHit(1, e.x, e.z - 1.5);
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    e.update(DT, e.x, 0, e.z - 1.5, true);
    seen.add(e.state);
  }
  check('after two hits from behind it winds up a buck', seen.has('buckWind') && seen.has('buck'), [...seen].join(','));

  // The buck kicks backwards: it hurts a rat standing behind it.
  const f = beetle(0);
  f.state = 'buck';
  f.stateTime = 0;
  (f as unknown as { spent: boolean }).spent = false;
  const behind = ratAt(f.x, f.z - 1.4, f);
  const ev = events();
  resolveCombat(behind, [f], ev);
  check('the buck kicks backwards and hurts a rat behind it', ev.playerResult === 'hit' && behind.hp === TUNING.health.max - 1, `${ev.playerResult}`);
  const g = beetle(0);
  g.state = 'buck';
  (g as unknown as { spent: boolean }).spent = false;
  const infront = ratAt(g.x, g.z + 1.4, g);
  const ev2 = events();
  resolveCombat(infront, [g], ev2);
  check('and not one in front', ev2.playerResult === null);

  // Standing close behind it for too long: it bucks anyway.
  const h = beetle(0);
  h.state = 'chase';
  let bucked = false;
  for (let i = 0; i < 120; i++) {
    h.facing = 0; // (he keeps behind it)
    h.update(DT, h.x, 0, h.z - 1.5, true);
    if ((h.state as string) === 'buckWind') bucked = true;
  }
  check('lingering close behind it, he gets kicked', bucked);
}

// ---- The ram ----
{
  const e = beetle(0);
  e.state = 'chase';
  const ratZ = e.z + 6;
  let windup = 0;
  let rammed = false;
  for (let i = 0; i < 200 && !rammed; i++) {
    e.update(DT, e.x, 0, ratZ, true);
    if ((e.state as string) === 'windup') windup += DT;
    if ((e.state as string) === 'ram') rammed = true;
  }
  check('lined up and a few steps away, it rams after a long tell', rammed && windup >= I.windup - 0.02, windup.toFixed(2));
  check('it snorted as the tell began', e.events.includes('snort') && e.events.includes('ram'));
  // He steps aside after it has committed: it goes straight on.
  const x0 = e.x;
  for (let i = 0; i < 20; i++) e.update(DT, e.x + 3, 0, ratZ, true);
  check('once it charges it does not turn', Math.abs(e.x - x0) < 0.01 && (e.state as string) === 'ram');

  // Into a wall: bonk, and over on its back.
  const w = beetle(0);
  w.state = 'ram';
  (w as unknown as { spent: boolean }).spent = false;
  const wallZ = w.z + 4;
  w.wallAt = (_x, _y, z) => z > wallZ;
  for (let i = 0; i < 60 && w.state === 'ram'; i++) w.update(DT, w.x, 0, w.z - 6, true);
  check('a ram into a wall ends on its back', (w.state as string) === 'flipped' && w.events.includes('bonk'), w.state);
  check('on its back, the front is soft', !w.deflects(w.x, w.z + 2) && w.takeHit(1, w.x, w.z + 2) === false && w.hp === I.hp - 1);
  for (let i = 0; i < Math.ceil((I.flipTime + 0.4) * 60); i++) w.update(DT, w.x, 0, w.z - 6, true);
  check('then it rights itself', !w.flipped || (w.state as string) === 'rise', w.state);
  for (let i = 0; i < 60; i++) w.update(DT, w.x, 0, w.z - 6, true);
  check('and its shell is hard again', w.deflects(w.x + Math.sin(w.facing) * 2, w.z + Math.cos(w.facing) * 2));

  // Rams that reach him.
  const hitRam = (guard: number): { result: string | null; e: Ironback; p: PlayerController } => {
    const r = beetle(0);
    const p = ratAt(r.x, r.z + 2.5, r);
    if (guard > 0) for (let i = 0; i < guard; i++) p.update(DT, input({ guardHeld: true }), chamber.colliders);
    r.state = 'ram';
    (r as unknown as { spent: boolean }).spent = false;
    let result: string | null = null;
    for (let i = 0; i < 40 && !result; i++) {
      r.update(DT, p.position.x, p.position.y, p.position.z, true);
      const ev = events();
      resolveCombat(p, [r], ev);
      result = ev.playerResult;
      if (guard > 0) p.update(DT, input({ guardHeld: true }), chamber.colliders);
    }
    return { result, e: r, p };
  };
  const plain = hitRam(0);
  check('a ram that hits him costs two hearts', plain.result === 'hit' && plain.p.hp === TUNING.health.max - I.ramDamage, `${plain.result} hp=${plain.p.hp}`);
  const blocked = hitRam(40);
  check('a ram on a held shield is only blocked, and it stops', blocked.result === 'blocked' && blocked.e.state === 'recover');
  const parried = hitRam(1);
  check('a ram caught by a perfect guard flips it', parried.result === 'parried' && parried.e.state === 'flipped', `${parried.result} ${parried.e.state}`);
}

// ---- A plunge onto it ----
{
  const e = beetle(0);
  e.takeHit(TUNING.plunge.diveDamage, e.x, e.z, 'plunge');
  check('a plunge onto its back flips it, and hurts', e.state === 'flipped' && e.hp === I.hp - TUNING.plunge.diveDamage);
  const s = beetle(0);
  check('the blast of a plunge landing in front of it glances off', s.deflects(s.x, s.z + 2, 'shock'));
}

// ---- The horn toss, close in front ----
{
  const e = beetle(0);
  e.state = 'chase';
  const p = ratAt(e.x, e.z + I.radius + 0.9, e);
  let tossed = false;
  let result: string | null = null;
  for (let i = 0; i < 60 && !result; i++) {
    e.update(DT, p.position.x, p.position.y, p.position.z, true);
    if ((e.state as string) === 'tossWind') tossed = true;
    const ev = events();
    resolveCombat(p, [e], ev);
    result = ev.playerResult;
  }
  check('close in front it tosses its horn (one heart)', tossed && result === 'hit' && p.hp === TUNING.health.max - 1, `${result}`);
}

// ---- It never ends up in a wall, chasing and ramming round a room with a block in it ----
{
  const block = { x0: 4, x1: 8, z0: -2, z1: 2 };
  const room: CanStand = (x, _y, z, r) => Math.abs(x) + r <= 10 && Math.abs(z) + r <= 10 && !(x + r > block.x0 && x - r < block.x1 && z + r > block.z0 && z - r < block.z1);
  const wallAt = (x: number, y: number, z: number, r: number): boolean => !room(x, y, z, r);
  let worst = '';
  for (let run = 0; run < 20 && !worst; run++) {
    const e = new Ironback({ x: -3, z: 0, arena: { x0: -30, x1: 30, z0: -30, z1: 30 } });
    e.canStand = room;
    e.wallAt = wallAt;
    let px = 0;
    let pz = 6;
    let a = run;
    for (let i = 0; i < 60 * 60 && !worst; i++) {
      a += 0.6 * DT;
      px = Math.sin(a) * 7;
      pz = Math.cos(a * 1.3) * 7;
      e.update(DT, px, 0, pz, true);
      if (i % 300 === 150 && e.flipped) e.takeHit(1, px, pz); // (hits on its back, so it does not die too soon)
      if (e.hp <= 1) e.hp = I.hp;
      if (!room(e.x, 0, e.z, e.radius - 0.01)) worst = `run ${run} at ${e.x.toFixed(2)},${e.z.toFixed(2)} in ${e.state}`;
    }
  }
  check('a beetle chased round a room never ends up in a wall or the block', !worst, worst);
}

// ---- Turn-taking ----
{
  const e = beetle(0);
  e.state = 'chase';
  e.mayAttack = false;
  for (let i = 0; i < 120; i++) e.update(DT, e.x, 0, e.z + 6, true);
  check('lined up, it says it is ready, but waits its turn', e.ready && e.state === 'chase');
  e.mayAttack = true;
  e.update(DT, e.x, 0, e.z + 6, true);
  check('and goes when allowed', (e.state as string) === 'windup');
}

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
